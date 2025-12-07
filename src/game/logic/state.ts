import { createContext } from "solid-js";
import { type SetStoreFunction } from "solid-js/store";
import * as fen from "./fen.ts";
import * as types from "./types.ts";

type Orientation = Extract<types.Color, "white" | "black">;

export interface State {
  pieces: types.Pieces;
  orientation: Orientation; // Board orientation
  coordinates: boolean; // Show coorindates on the board
}

export function defaults(): State {
  return {
    pieces: fen.read(fen.initial),
    orientation: "white",
    coordinates: true,
  };
}
export const StateContext = createContext<{
  state: State;
  setState: SetStoreFunction<State>;
}>();

export const whitePov = (s: State): boolean => s.orientation === "white";
