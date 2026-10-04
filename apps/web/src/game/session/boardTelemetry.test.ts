import { expect, test } from "vitest";
import { initialRulesPosition } from "./rulesPosition.ts";
import {
  boardTelemetryOrder,
  buildBoardTelemetry,
  clockTextForPlayer,
  formatClock,
} from "./boardTelemetry.ts";

const emptyCaptured = { player1: [], player2: [] } as const;

test("orders board telemetry by viewer seat", () => {
  expect(boardTelemetryOrder("player1")).toEqual({
    top: "player2",
    bottom: "player1",
  });
  expect(boardTelemetryOrder("player2")).toEqual({
    top: "player1",
    bottom: "player2",
  });
  expect(boardTelemetryOrder("observer")).toEqual({
    top: "player2",
    bottom: "player1",
  });
  expect(boardTelemetryOrder()).toEqual({ top: "player2", bottom: "player1" });
});

test("formats count-up clocks and leaves inactive rows at zero", () => {
  const telemetry = buildBoardTelemetry(
    initialRulesPosition(),
    "player1",
    1_000,
    emptyCaptured,
  );

  expect(formatClock(65_400)).toBe("1:05");
  expect(clockTextForPlayer(telemetry, "player1", 66_400)).toBe("1:05");
  expect(clockTextForPlayer(telemetry, "player2", 66_400)).toBe("0:00");
});

test("initial telemetry exposes owned and controlled regimes from rules state", () => {
  const position = initialRulesPosition();
  const telemetry = buildBoardTelemetry(position, undefined, 0, emptyCaptured);

  expect(telemetry.players.player1.label).toBe("Player 1");
  expect(telemetry.players.player2.label).toBe("Player 2");
  expect(telemetry.players.player1.currentRegime).toBe("white");
  expect(telemetry.players.player2.currentRegime).toBe("black");
  expect([...telemetry.players.player1.controlledRegimes].sort()).toEqual(
    [...position.board.controlledColorsOf("player1")].sort(),
  );
  expect([...telemetry.players.player2.controlledRegimes].sort()).toEqual(
    [...position.board.controlledColorsOf("player2")].sort(),
  );
});

test("labels the viewer's player row as You", () => {
  const position = initialRulesPosition();

  expect(
    buildBoardTelemetry(position, "player1", 0, emptyCaptured).players.player1
      .label,
  ).toBe("You");
  expect(
    buildBoardTelemetry(position, "player1", 0, emptyCaptured).players.player2
      .label,
  ).toBe("Player 2");
  expect(
    buildBoardTelemetry(position, "observer", 0, emptyCaptured).players.player1
      .label,
  ).toBe("Player 1");
});
