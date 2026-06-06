import {
  colorLetters,
  roleLetters,
  squareName,
  type Move,
  type PieceColor,
  type Role,
} from "./models.ts";
import type { Position } from "./position.ts";

export function moveNotation(position: Position, move: Move): string {
  if (position.isLegalCastle(move)) {
    return castleSan(position, move);
  }

  const piece = position.board.pieceAt(move.from);
  if (!piece) return squareName(move.to);

  const result = position.play(move);
  const capture = position.board.occupied.has(move.to);
  const body = [
    colorLetters[piece.color],
    roleLetter(piece.role),
    squareName(move.from),
    capture ? "x" : "-",
    squareName(move.to),
    move.promotion ? `=${roleLetter(move.promotion)}` : "",
  ].join("");

  return `${body}${stateSuffix(result)}`;
}

export function castleSan(position: Position, move: Move): string {
  const side = move.to - move.from > 0 ? "king" : "queen";
  const result = position.playCastle(move);
  return `${side === "king" ? "O-O" : "O-O-O"}@${squareName(move.to)}${stateSuffix(result)}`;
}

export function defectionSan(position: Position, color: PieceColor): string {
  const oldColor = position.ownedColor;
  const result = position.defect(color);
  return `${colorLetters[oldColor]}K=${color}${stateSuffix(result)}`;
}

function roleLetter(role: Role): string {
  return roleLetters[role].toUpperCase();
}

function stateSuffix(position: Position): string {
  if (position.isCheckmate) return "#";
  if (position.isCheck) return "+";
  return "";
}
