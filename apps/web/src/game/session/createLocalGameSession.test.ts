import { createRoot } from "solid-js";
import { createStore } from "solid-js/store";
import { afterEach, expect, test, vi } from "vitest";
import { Setup, SovereignChess, squareName, type Position } from "@osc/rules";
import { defaults } from "../state/state.ts";
import { createLocalGameSession } from "./createLocalGameSession.ts";
import { initialRulesPosition } from "./rulesPosition.ts";
import type { LocalGameSession, SessionAction, SessionMove } from "./types.ts";

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
