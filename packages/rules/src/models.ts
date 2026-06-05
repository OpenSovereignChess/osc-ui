export const sides = ["player1", "player2"] as const;
export type Side = (typeof sides)[number];

export const pieceColors = [
  "white",
  "ash",
  "slate",
  "black",
  "pink",
  "red",
  "orange",
  "yellow",
  "green",
  "cyan",
  "navy",
  "violet",
] as const;
export type PieceColor = (typeof pieceColors)[number];

export const castlingSides = ["queen", "king"] as const;
export type CastlingSide = (typeof castlingSides)[number];

export const roles = ["bishop", "king", "knight", "pawn", "queen", "rook"] as const;
export type Role = (typeof roles)[number];

export const rules = ["sovereignChess"] as const;
export type Rule = (typeof rules)[number];

export type File = number;
export type Rank = number;
export type Square = number;
export type Quadrant = "q1" | "q2" | "q3" | "q4";

export interface Piece {
  readonly color: PieceColor;
  readonly role: Role;
  readonly promoted?: boolean;
}

export interface NormalMove {
  readonly kind: "normal";
  readonly from: Square;
  readonly to: Square;
  readonly promotion?: Role;
}

export type Move = NormalMove;

export const files = [
  "a",
  "b",
  "c",
  "d",
  "e",
  "f",
  "g",
  "h",
  "i",
  "j",
  "k",
  "l",
  "m",
  "n",
  "o",
  "p",
] as const;

export const ranks = [
  "1",
  "2",
  "3",
  "4",
  "5",
  "6",
  "7",
  "8",
  "9",
  "10",
  "11",
  "12",
  "13",
  "14",
  "15",
  "16",
] as const;

export const squares: readonly Square[] = Array.from({ length: 256 }, (_, i) => i);

export const colorLetters: Record<PieceColor, string> = {
  white: "w",
  ash: "a",
  slate: "s",
  black: "b",
  pink: "p",
  red: "r",
  orange: "o",
  yellow: "y",
  green: "g",
  cyan: "c",
  navy: "n",
  violet: "v",
};

const colorsByLetter = new Map(
  Object.entries(colorLetters).map(([color, letter]) => [letter, color as PieceColor]),
);

export const roleLetters: Record<Role, string> = {
  bishop: "b",
  king: "k",
  knight: "n",
  pawn: "p",
  queen: "q",
  rook: "r",
};

const rolesByLetter = new Map(
  Object.entries(roleLetters).map(([role, letter]) => [letter, role as Role]),
);

export function oppositeSide(side: Side): Side {
  return side === "player1" ? "player2" : "player1";
}

export function pieceColorFromChar(ch: string): PieceColor | undefined {
  return colorsByLetter.get(ch.toLowerCase());
}

export function roleFromChar(ch: string): Role | undefined {
  return rolesByLetter.get(ch.toLowerCase());
}

export function fileFromName(name: string): File {
  const file = name.charCodeAt(0) - 97;
  if (file < 0 || file > 15) throw new Error(`Invalid algebraic notation: ${name}`);
  return file;
}

export function rankFromName(name: string): Rank {
  const rank = Number.parseInt(name, 10) - 1;
  if (!Number.isInteger(rank) || rank < 0 || rank > 15) {
    throw new Error(`Invalid algebraic notation: ${name}`);
  }
  return rank;
}

export function squareFromCoords(file: File, rank: Rank): Square {
  if (file < 0 || file > 15 || rank < 0 || rank > 15) {
    throw new Error(`Invalid square coords: ${file},${rank}`);
  }
  return file | (rank << 4);
}

export function squareFromName(name: string): Square {
  const match = /^([a-p])(1[0-6]|[1-9])$/.exec(name);
  if (!match) throw new Error(`Invalid algebraic notation: ${name}`);
  return squareFromCoords(fileFromName(match[1]), rankFromName(match[2]));
}

export function fileOf(square: Square): File {
  return square & 0xf;
}

export function rankOf(square: Square): Rank {
  return square >> 4;
}

export function fileName(file: File): string {
  return files[file] ?? "";
}

export function rankName(rank: Rank): string {
  return ranks[rank] ?? "";
}

export function squareName(square: Square): string {
  return `${fileName(fileOf(square))}${rankName(rankOf(square))}`;
}

export function quadrantOf(square: Square): Quadrant {
  const file = fileOf(square);
  const rank = rankOf(square);
  return file < 8 ? (rank < 8 ? "q1" : "q3") : rank < 8 ? "q2" : "q4";
}

export const coloredSquares = new Map<Square, PieceColor>(
  [
    ["e5", "navy"],
    ["l5", "red"],
    ["f6", "green"],
    ["h6", "violet"],
    ["i6", "pink"],
    ["k6", "yellow"],
    ["g7", "ash"],
    ["j7", "slate"],
    ["f8", "cyan"],
    ["h8", "black"],
    ["i8", "white"],
    ["k8", "orange"],
    ["f9", "orange"],
    ["h9", "white"],
    ["i9", "black"],
    ["k9", "cyan"],
    ["g10", "slate"],
    ["j10", "ash"],
    ["f11", "yellow"],
    ["h11", "pink"],
    ["i11", "violet"],
    ["k11", "green"],
    ["e12", "red"],
    ["l12", "navy"],
  ].map(([square, color]) => [squareFromName(square), color as PieceColor]),
);

export const promotionSquares = new Set<Square>(
  ["g7", "h7", "i7", "j7", "g8", "j8", "g9", "j9", "g10", "h10", "i10", "j10"].map(
    squareFromName,
  ),
);

export function squareColor(square: Square): PieceColor | undefined {
  return coloredSquares.get(square);
}

export function normalMove(from: Square | string, to: Square | string, promotion?: Role): NormalMove {
  return {
    kind: "normal",
    from: typeof from === "string" ? squareFromName(from) : from,
    to: typeof to === "string" ? squareFromName(to) : to,
    promotion,
  };
}

export const illegalFenCauses = [
  "board",
  "format",
  "turn",
  "p1Owned",
  "p2Owned",
  "castling",
  "ply",
] as const;
export type IllegalFenCause = (typeof illegalFenCauses)[number];

export class FenException extends Error {
  constructor(readonly cause: IllegalFenCause) {
    super(`FenException: ${cause}`);
    this.name = "FenException";
  }
}

export class PlayException extends Error {
  constructor(readonly message: string) {
    super(`PlayException: ${message}`);
    this.name = "PlayException";
  }
}
