import type { Accessor } from "solid-js";
import type { BoardActions } from "../input/board.ts";
import type { EditorActions } from "../input/editor.ts";
import type { State } from "../state/state.ts";
import type * as types from "../rules/types.ts";

type Orientation = Extract<types.Color, "white" | "black">;

export interface GameSnapshot {
  coordinates: boolean;
  orientation: Orientation;
  pieces: types.Pieces;
  selected?: types.Key;
}

export interface InteractionSnapshot {
  drawableCurrent?: State["interaction"]["drawable"]["current"];
  drawableEnabled: boolean;
  dropmodeActive: boolean;
  dropmodePiece?: types.Piece;
  viewOnly: boolean;
}

export interface SessionMove {
  orig: types.Key;
  dest: types.Key;
}

export type OnlineSeat = "player1" | "player2" | "observer";

export interface LocalGameSession {
  board: BoardActions;
  editor: EditorActions;
  applyServerMove: (move: SessionMove) => boolean;
  applyServerMoves: (moves: readonly SessionMove[]) => void;
  getInteraction: Accessor<InteractionSnapshot>;
  getSnapshot: Accessor<GameSnapshot>;
  getState: Accessor<State>;
  onLocalMove?: (move: SessionMove) => void;
  setOnlineSeat: (seat?: OnlineSeat) => void;
  setDom: (dom: types.Dom) => void;
}
