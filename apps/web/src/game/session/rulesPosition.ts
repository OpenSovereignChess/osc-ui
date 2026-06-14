import {
  Setup,
  SovereignChess,
  initialFEN,
  normalMove,
  squareFromName,
  squareName,
  type Position,
  type Side,
} from "@osc/rules";
import type * as types from "../rules/types.ts";
import type { OnlineSeat, SessionMove } from "./types.ts";

export function initialRulesPosition(): Position {
  return SovereignChess.fromSetup(Setup.parseFen(initialFEN));
}

export function piecesFromRulesPosition(position: Position): types.Pieces {
  const pieces: types.Pieces = new Map();
  for (const square of position.board.occupied.squares()) {
    const piece = position.board.pieceAt(square);
    if (piece) {
      pieces.set(squareName(square) as types.Key, piece);
    }
  }
  return pieces;
}

export function legalDestsForSeat(
  position: Position,
  seat?: OnlineSeat,
): types.Dests {
  const side = sideForSeat(seat);
  if (!side || side !== position.turn) {
    return new Map();
  }

  const dests: types.Dests = new Map();
  for (const [from, squares] of position.legalMoves) {
    const keys = [...squares.squares()].map(
      (square) => squareName(square) as types.Key,
    );
    if (keys.length > 0) {
      dests.set(squareName(from) as types.Key, keys);
    }
  }
  return dests;
}

export function playRulesMove(
  position: Position,
  move: SessionMove,
): Position | undefined {
  try {
    return position.play(normalMove(move.orig, move.dest));
  } catch {
    return undefined;
  }
}

export function isRulesMoveLegal(
  position: Position,
  move: SessionMove,
): boolean {
  return position
    .legalMovesOf(squareFromName(move.orig))
    .has(squareFromName(move.dest));
}

function sideForSeat(seat?: OnlineSeat): Side | undefined {
  switch (seat) {
    case "player1":
      return "player1";
    case "player2":
      return "player2";
    default:
      return undefined;
  }
}
