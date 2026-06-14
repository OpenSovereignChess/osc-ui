import {
  castleSan,
  defectionSan,
  moveNotation,
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
import type {
  OnlineSeat,
  SessionAction,
  SessionActionOption,
  SessionHistoryMove,
  SessionHistoryTurn,
  SessionMove,
} from "./types.ts";

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
  move: SessionAction,
): Position | undefined {
  try {
    return applyRulesAction(position, move).position;
  } catch {
    return undefined;
  }
}

export function applyRulesAction(
  position: Position,
  action: SessionAction,
): { position: Position; san: string } {
  switch (action.kind) {
    case "castle": {
      const move = normalMove(action.orig, action.dest);
      return {
        position: position.playCastle(move),
        san: castleSan(position, move),
      };
    }
    case "defect":
      return {
        position: position.defect(action.color),
        san: defectionSan(position, action.color),
      };
    default: {
      const move = normalMove(action.orig, action.dest, action.promotion);
      return {
        position: position.play(move),
        san: moveNotation(position, move),
      };
    }
  }
}

export function castleActionsForSeat(
  position: Position,
  seat?: OnlineSeat,
): SessionActionOption[] {
  if (!canAct(position, seat)) {
    return [];
  }

  const actions: SessionActionOption[] = [];
  for (const [from, destinations] of position.legalCastlingMoves) {
    for (const to of destinations.squares()) {
      const move = normalMove(squareName(from), squareName(to));
      actions.push({
        label: castleSan(position, move),
        action: {
          kind: "castle",
          orig: squareName(from) as types.Key,
          dest: squareName(to) as types.Key,
        },
      });
    }
  }
  return actions;
}

export function defectActionsForSeat(
  position: Position,
  seat?: OnlineSeat,
): SessionActionOption[] {
  if (!canAct(position, seat)) {
    return [];
  }

  return [...position.controlledColors].map((color) => ({
    label: color,
    action: { kind: "defect", color },
  }));
}

export function historyTurns(
  entries: readonly SessionHistoryMove[],
): SessionHistoryTurn[] {
  const turns: SessionHistoryTurn[] = [];
  for (let index = 0; index < entries.length; index += 2) {
    turns.push({
      number: index / 2 + 1,
      first: entries[index],
      second: entries[index + 1],
    });
  }
  return turns;
}

export function isRulesMoveLegal(
  position: Position,
  move: SessionMove,
): boolean {
  return position
    .legalMovesOf(squareFromName(move.orig))
    .has(squareFromName(move.dest));
}

export function canAct(position: Position, seat?: OnlineSeat): boolean {
  const side = sideForSeat(seat);
  return !!side && side === position.turn;
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
