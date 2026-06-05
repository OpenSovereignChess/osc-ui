import { Board, initialBoardFEN, squareFromName, squareName } from "@osc/rules";
import * as types from "./types.ts";

export const initial: types.FEN = initialBoardFEN;

export function read(fen: types.FEN = initial): types.Pieces {
  const board = Board.parseFen(fen.split(/\s+/, 1)[0]);
  const pieces: types.Pieces = new Map();
  for (const square of board.occupied.squares()) {
    const piece = board.pieceAt(square);
    if (piece) pieces.set(squareName(square) as types.Key, piece);
  }
  return pieces;
}

export function write(pieces: types.Pieces): types.FEN {
  let board = Board.empty;
  for (const [key, piece] of pieces) {
    board = board.setPieceAt(squareFromName(key), piece);
  }
  return board.fen;
}
