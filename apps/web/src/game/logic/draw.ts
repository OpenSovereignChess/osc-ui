import * as types from "./types.ts";

export interface Drawable {
  enabled: boolean; // can draw
  current?: DrawCurrent;
}

export interface DrawCurrent {
  orig: types.Key; // Origin key of drawing
}
