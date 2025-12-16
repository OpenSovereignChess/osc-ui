export type Color = (typeof colors)[number];
export type Role = (typeof roles)[number];
export type File = (typeof files)[number];
export type Rank = (typeof ranks)[number];
export type Key = "a0" | `${File}${Rank}`;
export type FEN = string;
export type Pos = [number, number];

export interface Piece {
  role: Role;
  color: Color;
  promoted?: boolean;
}

export type Pieces = Map<Key, Piece>;

export type NumberPair = [number, number];

export interface Elements {
  board: HTMLElement;
  wrap: HTMLElement;
  container: HTMLElement;
}

export interface Dom {
  elements: Elements;
  bounds: DOMRectReadOnly;
}

export const colors = [
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
export const roles = [
  "pawn",
  "knight",
  "bishop",
  "rook",
  "queen",
  "king",
] as const;
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

export type MouchEvent = Event & Partial<MouseEvent & TouchEvent>;

export type SquareClasses = Map<Key, string>;
