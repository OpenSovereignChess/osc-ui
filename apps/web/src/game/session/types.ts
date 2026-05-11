import type { Accessor } from "solid-js";
import type { BoardActions } from "../input/board.ts";
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
  draggableCurrent?: State["interaction"]["draggable"]["current"];
  dropmodeActive: boolean;
  viewOnly: boolean;
}

export interface LocalGameSession {
  board: BoardActions;
  getInteraction: Accessor<InteractionSnapshot>;
  getSnapshot: Accessor<GameSnapshot>;
  getState: Accessor<State>;
  setDom: (dom: types.Dom) => void;
}
