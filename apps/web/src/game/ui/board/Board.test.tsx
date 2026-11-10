import { createRoot, type ComponentProps } from "solid-js";
import { createStore, unwrap } from "solid-js/store";
import { BoardView } from "@osc/board-solid";
import { Setup, SovereignChess } from "@osc/rules";
import { expect, test, vi } from "vitest";
import { createLocalGameSession } from "../../session/createLocalGameSession.ts";
import { defaults } from "../../state/state.ts";
import type { Key, Piece } from "../../rules/types.ts";
import type { LocalGameSession, SessionMove } from "../../session/types.ts";
import { handleServerMessage } from "../../play/PlayMain.tsx";
import Board from "./Board.tsx";

// Exercise the real board/session wiring at the BoardView interaction boundary.
// Pointer hit testing and drag thresholds are covered by drag.test.ts.
// Use the browser reactive runtime so interaction snapshots update between intents.
vi.mock("solid-js", () =>
  vi.importActual<typeof import("solid-js")>("solid-js/dist/solid.js"),
);
vi.mock("solid-js/store", () =>
  vi.importActual<typeof import("solid-js/store")>(
    "solid-js/store/dist/store.js",
  ),
);
let activeSession: LocalGameSession;
vi.mock("../../session/useGameSession.ts", () => ({
  useGameSession: () => activeSession,
}));
let view: ComponentProps<typeof BoardView>;
vi.mock("@osc/board-solid", () => ({
  BoardView: (props: ComponentProps<typeof BoardView>) => {
    view = props;
    return null;
  },
}));

function withBoard(
  run: (session: LocalGameSession, sent: ReturnType<typeof vi.fn>) => void,
  options: Parameters<typeof createLocalGameSession>[2] = {},
) {
  createRoot((dispose) => {
    const [state, setState] = createStore(defaults());
    const sent = vi.fn();
    const session = createLocalGameSession(state, setState, {
      ...options,
      onLocalMove: sent,
    });
    session.setOnlineSeat("player1");
    activeSession = session;
    try {
      Board({ ref: () => undefined });
      run(session, sent);
    } finally {
      dispose();
    }
  });
}

function firstMove(session: LocalGameSession): SessionMove {
  for (const [orig, dests] of session.getState().position.movable.dests ?? []) {
    if (dests[0]) return { kind: "move", orig, dest: dests[0] };
  }
  throw new Error("Expected a legal move");
}

for (const intent of ["click", "drag"] as const) {
  test(`${intent} submits an intent without mutating the board; only acceptance applies it`, () => {
    withBoard((session, sent) => {
      const state = session.getState();
      const move = firstMove(session);
      const before = structuredClone(unwrap(state.position));
      const movingPiece = state.position.pieces.get(move.orig);
      view.onSelectSquare!(move.orig);
      expect(state.interaction.selected).toBe(move.orig);
      expect(view.canMove!(move.orig, move.dest)).toBe(true);

      if (intent === "click") view.onSelectSquare!(move.dest);
      else view.onMovePiece!(move.orig, move.dest);

      expect(sent).toHaveBeenCalledExactlyOnceWith(move);
      expect(state.interaction.selected).toBeUndefined();
      expect(state.position).toEqual(before);
      expect(session.getHistoryTurns()).toEqual([]);

      const setError = vi.fn();
      const handlers = {
        applyMove: session.applyServerMove,
        applyMoves: session.applyServerMoves,
        setError,
        setInfo: vi.fn(),
        setSeat: session.setOnlineSeat,
      };
      handleServerMessage(
        { type: "move_rejected", payload: { reason: "not your turn", seq: 0 } },
        handlers,
      );
      expect(setError).toHaveBeenCalledWith("Move rejected: not your turn");
      expect(state.position).toEqual(before);
      expect(session.getHistoryTurns()).toEqual([]);

      handleServerMessage(
        {
          type: "move_applied",
          payload: { ...move, seq: 1, seat: "player1" },
        },
        handlers,
      );
      expect(state.position.pieces.has(move.orig)).toBe(false);
      expect(state.position.pieces.get(move.dest)).toEqual(movingPiece);
      expect(state.position.lastMove).toEqual([move.orig, move.dest]);
      expect(session.getBoardTelemetry().turn).toBe("player2");
      expect(session.getHistoryTurns()).toHaveLength(1);
    });
  });

  test(`${intent} promotion waits for a role and server acceptance`, () => {
    withBoard(
      (session, sent) => {
        const state = session.getState();
        const before = structuredClone(unwrap(state.position));
        view.onSelectSquare!("h6");
        if (intent === "click") view.onSelectSquare!("h7");
        else view.onMovePiece!("h6", "h7");

        expect(sent).not.toHaveBeenCalled();
        expect(session.getPendingPromotion()).toMatchObject({
          orig: "h6",
          dest: "h7",
        });
        expect(state.position).toEqual(before);
        session.promote("queen");
        const promoted = {
          kind: "move",
          orig: "h6",
          dest: "h7",
          promotion: "queen",
        } as const;
        expect(sent).toHaveBeenCalledExactlyOnceWith(promoted);
        expect(session.getPendingPromotion()).toBeUndefined();
        expect(state.position).toEqual(before);
        expect(session.applyServerMove(promoted)).toBe(true);
        expect(state.position.pieces.get("h7")).toEqual({
          color: "white",
          role: "queen",
        });
      },
      {
        initialRulesPosition: () =>
          SovereignChess.fromSetup(
            Setup.parseFen(
              "16/16/16/16/16/16/16/16/16/16/7wp8/16/16/16/16/8wk7 1 w b -",
            ),
          ),
      },
    );
  });

  test(`editor ${intent} freely relocates existing pieces without gameplay submission`, () => {
    withBoard(
      (session, sent) => {
        const state = session.getState();
        const piece = { color: "navy", role: "knight" } as const;
        session.editor.replacePieces(
          new Map<Key, Piece>([
            ["e4", piece],
            ["p16", { color: "white", role: "rook" }],
          ]),
        );
        const turn = state.position.turnColor;
        expect(view.canDragPiece!("e4", piece)).toBe(true);
        expect(view.canMove!("e4", "p16")).toBe(true);
        view.onSelectSquare!("e4");
        if (intent === "click") view.onSelectSquare!("p16");
        else view.onMovePiece!("e4", "p16");

        expect([...state.position.pieces]).toEqual([["p16", piece]]);
        expect(state.interaction.selected).toBeUndefined();
        expect(state.position.turnColor).toBe(turn);
        expect(state.position.lastMove).toBeUndefined();
        expect(session.getHistoryTurns()).toEqual([]);
        expect(sent).not.toHaveBeenCalled();
      },
      { mode: "editor" },
    );
  });
}

for (const kind of ["castle", "defect"] as const) {
  test(`${kind} stays on the session/rules acceptance path`, () => {
    withBoard(
      (session, sent) => {
        const state = session.getState();
        const action =
          kind === "castle"
            ? session
                .getCastleActions()
                .find(({ action }) => "dest" in action && action.dest === "j1")
                ?.action
            : session
                .getDefectActions()
                .find(
                  ({ action }) =>
                    action.kind === "defect" && action.color === "navy",
                )?.action;
        expect(action).toBeDefined();
        const before = structuredClone(unwrap(state.position));
        expect(session.submitAction(action!)).toBe(true);
        expect(sent).toHaveBeenCalledExactlyOnceWith(action);
        expect(state.position).toEqual(before);
        expect(session.applyServerMove(action!)).toBe(true);
        if (kind === "castle") {
          expect(state.position.pieces.get("j1")).toEqual({
            color: "white",
            role: "king",
          });
          expect(state.position.pieces.get("i1")).toEqual({
            color: "white",
            role: "rook",
          });
          expect(state.position.pieces.has("l1")).toBe(false);
        } else {
          expect(state.position.pieces.get("i1")).toEqual({
            color: "navy",
            role: "king",
          });
        }
        expect(session.getBoardTelemetry().turn).toBe("player2");
        expect(session.getHistoryTurns()).toHaveLength(1);
      },
      {
        initialRulesPosition: () =>
          SovereignChess.fromSetup(
            Setup.parseFen(
              kind === "castle"
                ? "2vr1br3bk2br1yr2/16/16/16/16/16/16/16/16/16/16/16/16/16/16/2pr1wr3wk2wr1gr2 1 w b CELNceln"
                : "bk15/16/16/16/16/16/16/16/16/16/16/4wp11/16/16/16/8wk7 1 w b -",
            ),
          ),
      },
    );
  });
}

test("illegal moves and cancelled drags leave gameplay position unchanged", () => {
  withBoard((session, sent) => {
    const state = session.getState();
    const { orig } = firstMove(session);
    const before = structuredClone(unwrap(state.position));
    view.onSelectSquare!(orig);
    expect(view.canMove!(orig, orig)).toBe(false);
    // Even a stale/bypassed interaction check must be rejected by the session.
    view.onMovePiece!(orig, orig);
    expect(state.interaction.selected).toBeUndefined();
    view.onSelectSquare!(orig);
    view.onCancelDrag!(orig);
    expect(state.interaction.selected).toBeUndefined();
    expect(state.position).toEqual(before);
    expect(sent).not.toHaveBeenCalled();
  });
});

test("observers cannot select, drag, or submit gameplay moves", () => {
  withBoard((session, sent) => {
    const move = firstMove(session);
    session.setOnlineSeat("observer");
    const state = session.getState();
    const before = structuredClone(unwrap(state.position));
    expect(
      view.canDragPiece!(move.orig, state.position.pieces.get(move.orig)!),
    ).toBe(false);
    expect(view.canMove!(move.orig, move.dest)).toBe(false);
    expect(view.viewOnly).toBe(true);
    view.onSelectSquare!(move.orig);
    expect(state.interaction.selected).toBeUndefined();
    view.onMovePiece!(move.orig, move.dest);
    expect(sent).not.toHaveBeenCalled();
    expect(state.position).toEqual(before);
  });
});

test("editor placement and erasure bypass movement and gameplay submission", () => {
  withBoard(
    (session, sent) => {
      session.editor.clearBoard();
      const state = session.getState();
      const piece = { color: "pink", role: "queen" } as const;
      session.editor.setDropPiece(piece);
      view.onSelectSquare!("e4");
      view.onSelectSquare!("f5");
      session.editor.applyDrop("g6"); // Palette dragging uses the same drop action.
      expect(state.position.pieces.get("g6")).toEqual(piece);
      expect(state.position.pieces.get("e4")).toEqual(piece);
      expect(state.position.pieces.get("f5")).toEqual(piece);
      expect(view.canDragPiece!("e4", piece)).toBe(false);
      expect(view.canMove!("e4", "f5")).toBe(false);
      expect(session.editor.movePiece("e4", "f5")).toBe(false);
      session.editor.toggleEraseMode();
      view.onSelectSquare!("e4");
      expect(state.position.pieces.has("e4")).toBe(false);
      expect(state.position.pieces.get("f5")).toEqual(piece);
      session.editor.stopDropMode();
      expect(session.editor.movePiece("f5", "f5")).toBe(false);
      expect(session.editor.movePiece("e4", "f5")).toBe(false);
      expect(state.interaction.selected).toBeUndefined();
      expect(session.getHistoryTurns()).toEqual([]);
      expect(sent).not.toHaveBeenCalled();
    },
    { mode: "editor" },
  );
});
