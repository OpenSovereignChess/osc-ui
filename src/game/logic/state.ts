import { createContext } from "solid-js";
import { type SetStoreFunction } from "solid-js/store";
import { type DragCurrent } from "./drag.ts";
import { type Drawable } from "./draw.ts";
import * as fen from "./fen.ts";
import * as types from "./types.ts";

type Orientation = Extract<types.Color, "white" | "black">;

export interface State {
  dom?: types.Dom;
  pieces: types.Pieces;
  orientation: Orientation; // Board orientation
  coordinates: boolean; // Show coorindates on the board
  viewOnly: boolean; // Don't bind events - the user won't be able to move pieces
  draggable: {
    enabled: boolean; // Allow drag'n drop to move pieces
    current?: DragCurrent;
  };
  dropmode: {
    active: boolean; // In drop mode (pieces are dropped from a side panel)
    piece?: types.Piece; // Piece to drop
  };
  drawable: Drawable;
}

export function defaults(): State {
  return {
    pieces: fen.read(fen.initial),
    orientation: "white",
    coordinates: true,
    viewOnly: false,
    draggable: {
      enabled: true,
    },
    dropmode: {
      active: false,
    },
    drawable: {
      enabled: true, // can draw
    },
  };
}
export const StateContext = createContext<{
  state: State;
  setState: SetStoreFunction<State>;
}>();

export const whitePov = (s: State): boolean => s.orientation === "white";
