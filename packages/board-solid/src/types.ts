export type BoardOrientation = "white" | "black";

export type BoardColor =
  | "white"
  | "ash"
  | "slate"
  | "black"
  | "pink"
  | "red"
  | "orange"
  | "yellow"
  | "green"
  | "cyan"
  | "navy"
  | "violet";

export type BoardRole =
  | "pawn"
  | "knight"
  | "bishop"
  | "rook"
  | "queen"
  | "king";

export type BoardKey = string;

export interface BoardPiece {
  role: BoardRole;
  color: BoardColor;
  promoted?: boolean;
}

export type NumberPair = [number, number];

export interface DraggingPiece {
  key: BoardKey;
  pos: NumberPair;
}
