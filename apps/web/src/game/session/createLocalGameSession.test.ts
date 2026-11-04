import { createRoot } from "solid-js";
import { createStore } from "solid-js/store";
import { afterEach, expect, test, vi } from "vitest";
import { Setup, SovereignChess, squareName, type Position } from "@osc/rules";
import { defaults } from "../state/state.ts";
import { createLocalGameSession } from "./createLocalGameSession.ts";
import { initialRulesPosition } from "./rulesPosition.ts";
import type { LocalGameSession, SessionAction, SessionMove } from "./types.ts";
import { handleServerMessage, type RoomInfo } from "../play/PlayMain.tsx";
import type { RoomMove, Seat } from "../online/protocol.ts";

afterEach(() => {
  vi.unstubAllGlobals();
});

test("session telemetry records captures and rebuilds them during replay", () => {
  const captureMove: SessionAction = {
    kind: "move",
    orig: "j7",
    dest: "j10",
  };
  const capturedPiece = { color: "black", role: "queen" };

  withSession(
    (session) => {
      expect(session.applyServerMove(captureMove)).toBe(true);
      expect(
        session.getBoardTelemetry().players.player1.capturedPieces,
      ).toEqual([capturedPiece]);

      session.applyServerMoves([]);
      expect(
        session.getBoardTelemetry().players.player1.capturedPieces,
      ).toEqual([]);
      expect(
        session.getBoardTelemetry().players.player2.capturedPieces,
      ).toEqual([]);

      session.applyServerMoves([captureMove]);
      expect(
        session.getBoardTelemetry().players.player1.capturedPieces,
      ).toEqual([capturedPiece]);
    },
    () => 0,
    immediateCapturePosition,
  );
});

test("session telemetry resets turn-start timestamps after replay and accepted moves", () => {
  let now = 100;

  withSession(
    (session) => {
      expect(session.getBoardTelemetry().turnStartedAt).toBe(100);

      now = 500;
      session.applyServerMoves([]);
      expect(session.getBoardTelemetry().turnStartedAt).toBe(500);

      const legalMove = firstLegalMove(initialRulesPosition());
      now = 900;
      expect(session.applyServerMove(legalMove)).toBe(true);
      expect(session.getBoardTelemetry().turnStartedAt).toBe(900);
    },
    () => now,
  );
});

test("invalid server moves are rejected without throwing", () => {
  const invalidMove = {
    kind: "move",
    orig: "not-a-square",
    dest: "also-bad",
  } as unknown as SessionAction;

  withSession((session) => {
    expect(() => session.applyServerMove(invalidMove)).not.toThrow();
    expect(session.applyServerMove(invalidMove)).toBe(false);
    expect(() => session.applyServerMoves([invalidMove])).not.toThrow();
  });
});

test("player 2 can submit a legal move after player 1 moves", () => {
  const sentMoves: SessionAction[] = [];

  withSession(
    (session) => {
      session.setOnlineSeat("player2");
      const player1Move = {
        ...firstLegalMove(initialRulesPosition()),
        seat: "player1",
        seq: 1,
      } as unknown as SessionAction;
      expect(session.applyServerMove(player1Move)).toBe(true);

      const player2Move = firstLegalMoveForSession(session);
      expect(session.submitMove(player2Move.orig, player2Move.dest)).toBe(true);
      expect(sentMoves).toEqual([player2Move]);
    },
    undefined,
    undefined,
    (move) => sentMoves.push(move),
  );
});

for (const seat of ["player1", "player2", "observer"] as const) {
  test(`restored room state configures ${seat} orientation and move permissions`, () => {
    const sentMoves: SessionAction[] = [];
    withSession(
      (session) => {
        const move = {
          ...firstLegalMove(initialRulesPosition()),
          seq: 1,
          seat: "player1",
        } as RoomMove;
        let info: RoomInfo = { code: "", seq: 0, turn: "player1", players: 0 };
        handleServerMessage(
          {
            type: "room_state",
            payload: {
              roomCode: "ABCD1234",
              you: { id: "viewer", seat },
              players: [
                { id: "first", seat: "player1" },
                { id: "second", seat: "player2" },
              ],
              turn: "player2",
              seq: 1,
              moves: [move],
            },
          },
          {
            applyMove: session.applyServerMove,
            applyMoves: session.applyServerMoves,
            setError: () => undefined,
            setInfo: (next) => {
              info = typeof next === "function" ? next(info) : next;
            },
            setSeat: (next: Seat) => session.setOnlineSeat(next),
          },
        );
        expect(info.role).toBe(seat);
        expect(info.seq).toBe(1);
        expect(session.getState().position.orientation).toBe(
          seat === "player2" ? "black" : "white",
        );
        expect(session.getState().interaction.viewOnly).toBe(
          seat === "observer",
        );
        if (seat === "player2") {
          const next = firstLegalMoveForSession(session);
          expect(session.submitMove(next.orig, next.dest)).toBe(true);
          expect(sentMoves).toEqual([next]);
        } else {
          expect(session.submitMove("a2", "a3")).toBe(false);
          expect(sentMoves).toEqual([]);
        }
      },
      undefined,
      undefined,
      (move) => sentMoves.push(move),
    );
  });
}

function withSession<T>(
  run: (session: LocalGameSession) => T,
  now: () => number = () => 0,
  initialRulesPosition?: () => Position,
  onLocalMove?: (move: SessionAction) => void,
): T {
  vi.stubGlobal("window", {});

  return createRoot((dispose) => {
    const [state, setState] = createStore(defaults());
    const session = createLocalGameSession(state, setState, {
      initialRulesPosition,
      now,
      onLocalMove,
    });
    try {
      return run(session);
    } finally {
      dispose();
    }
  });
}

function firstLegalMove(position: Position): SessionMove {
  for (const [from, destinations] of position.legalMoves) {
    const to = destinations.lsb();
    if (to !== undefined) {
      return {
        kind: "move",
        orig: squareName(from) as SessionMove["orig"],
        dest: squareName(to) as SessionMove["dest"],
      };
    }
  }
  throw new Error("Expected at least one legal move.");
}

function firstLegalMoveForSession(session: LocalGameSession): SessionMove {
  for (const [orig, destinations] of session.getState().position.movable
    .dests ?? []) {
    const dest = destinations[0];
    if (dest) {
      return { kind: "move", orig, dest };
    }
  }
  throw new Error("Expected at least one legal session move.");
}

function immediateCapturePosition(): Position {
  return SovereignChess.fromSetup(
    Setup.parseFen(
      "16/16/16/16/16/16/9bq6/16/16/9wq6/16/16/16/16/16/8wk7 1 w b -",
    ),
  );
}
