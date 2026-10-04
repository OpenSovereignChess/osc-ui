import type { Piece, PieceColor, Position, Side } from "@osc/rules";
import type { OnlineSeat } from "./types.ts";

export interface BoardPlayerTelemetry {
  readonly side: Side;
  readonly label: string;
  readonly currentRegime: PieceColor;
  readonly controlledRegimes: readonly PieceColor[];
  readonly capturedPieces: readonly Piece[];
}

export interface BoardTelemetry {
  readonly viewerSeat?: OnlineSeat;
  readonly turn: Side;
  readonly turnStartedAt: number;
  readonly players: Readonly<Record<Side, BoardPlayerTelemetry>>;
  readonly top: BoardPlayerTelemetry;
  readonly bottom: BoardPlayerTelemetry;
}

export function boardTelemetryOrder(viewerSeat?: OnlineSeat): {
  top: Side;
  bottom: Side;
} {
  if (viewerSeat === "player2") {
    return { top: "player1", bottom: "player2" };
  }
  return { top: "player2", bottom: "player1" };
}

export function buildBoardTelemetry(
  position: Position,
  viewerSeat: OnlineSeat | undefined,
  turnStartedAt: number,
  capturedPieces: Readonly<Record<Side, readonly Piece[]>>,
): BoardTelemetry {
  const players: Record<Side, BoardPlayerTelemetry> = {
    player1: playerTelemetry(
      position,
      "player1",
      capturedPieces.player1,
      viewerSeat,
    ),
    player2: playerTelemetry(
      position,
      "player2",
      capturedPieces.player2,
      viewerSeat,
    ),
  };
  const order = boardTelemetryOrder(viewerSeat);

  return {
    viewerSeat,
    turn: position.turn,
    turnStartedAt,
    players,
    top: players[order.top],
    bottom: players[order.bottom],
  };
}

export function formatClock(elapsedMs: number): string {
  const safeMs = Math.max(0, elapsedMs);
  const totalSeconds = Math.floor(safeMs / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

export function clockTextForPlayer(
  telemetry: BoardTelemetry,
  side: Side,
  now: number,
): string {
  if (telemetry.turn !== side) {
    return "0:00";
  }
  return formatClock(now - telemetry.turnStartedAt);
}

function playerTelemetry(
  position: Position,
  side: Side,
  capturedPieces: readonly Piece[],
  viewerSeat: OnlineSeat | undefined,
): BoardPlayerTelemetry {
  return {
    side,
    label:
      side === viewerSeat
        ? "You"
        : side === "player1"
          ? "Player 1"
          : "Player 2",
    currentRegime: position.board.ownedColorOf(side),
    controlledRegimes: [...position.board.controlledColorsOf(side)],
    capturedPieces: [...capturedPieces],
  };
}
