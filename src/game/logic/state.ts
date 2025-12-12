import { createContext } from "solid-js";
import { type SetStoreFunction } from "solid-js/store";
import { type Drawable } from "./draw.ts";
import * as fen from "./fen.ts";
import * as types from "./types.ts";

type Orientation = Extract<types.Color, "white" | "black">;

export interface State {
  pieces: types.Pieces;
  orientation: Orientation; // Board orientation
  coordinates: boolean; // Show coorindates on the board
  drawable: Drawable;
}

export function defaults(): State {
  return {
    pieces: fen.read(fen.initial),
    orientation: "white",
    coordinates: true,
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
