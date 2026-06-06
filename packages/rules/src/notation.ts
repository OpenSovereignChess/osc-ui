import {
  colorLetters,
  roleLetters,
  squareName,
  type Move,
  type PieceColor,
  type Role,
  type Square,
} from "./models.ts";
import type { Position } from "./position.ts";

export function moveSan(position: Position, move: Move): string {
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
    disambiguation(position, move, piece.color, piece.role),
    capture ? "x" : "",
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

function disambiguation(
  position: Position,
  move: Move,
  color: PieceColor,
  role: Role,
): string {
  const candidates: Square[] = [];
  for (const [from, moves] of position.legalMoves) {
    if (from === move.from || !moves.has(move.to)) continue;
    const candidate = position.board.pieceAt(from);
    if (candidate?.color === color && candidate.role === role) {
      candidates.push(from);
    }
  }

  if (candidates.length === 0) return "";

  const from = squareName(move.from);
  const file = from.match(/^[a-p]/)?.[0] ?? "";
  const rank = from.slice(file.length);
  const needsFile = candidates.some((square) => squareName(square).startsWith(file));
  const needsRank = candidates.some((square) => squareName(square).slice(1) === rank);

  if (!needsFile) return file;
  if (!needsRank) return rank;
  return from;
}
