import { type AnimCurrent } from "./anim.ts";
import { type DragCurrent } from "./drag.ts";
import { type Drawable } from "./draw.ts";
import * as fen from "./fen.ts";
import * as types from "./types.ts";
import { timer } from "./util.ts";

type Orientation = Extract<types.Color, "white" | "black">;

export interface State {
  dom?: types.Dom;
  pieces: types.Pieces;
  orientation: Orientation; // Board orientation
  turnColor: types.Color; // Turn to play.  white | black
  check?: types.Key; // Square currently in check "a2"
  lastMove?: types.Key[]; // Last move orig and dest squares ["c3", "c4"]
  selected?: types.Key; // Currently selected square
  coordinates: boolean; // Show coorindates on the board
  viewOnly: boolean; // Don't bind events - the user won't be able to move pieces
  animation: {
    enabled: boolean;
    duration: number;
    current?: AnimCurrent;
  };
  movable: {
    free: boolean; // All moves are valid - board editor
    color?: types.Color | "both"; // Color that can move. white | black | both
    dests?: types.Dests; // valid moves. {"a2" ["a3 "a4"] "b1" ["a3" "c3"]}
  };
  draggable: {
    enabled: boolean; // Allow drag'n drop to move pieces
    current?: DragCurrent;
  };
  dropmode: {
    active: boolean; // In drop mode (pieces are dropped from a side panel)
    piece?: types.Piece; // Piece to drop
  };
  selectable: {
    // Disable to enforce dragging over click-click move
    enabled: boolean;
  };
  stats: {
    // Was last piece dragged or clicked?
    // Needs default to false for touch
    dragged: boolean;
    ctrlKey?: boolean;
  };
  drawable: Drawable;
  hold: types.Timer;
}

export function defaults(): State {
  return {
    pieces: fen.read(fen.initial),
    orientation: "white",
    turnColor: "white",
    coordinates: true,
    viewOnly: false,
    animation: {
      enabled: true,
      duration: 200,
    },
    movable: {
      free: true,
      color: "both",
    },
    draggable: {
      enabled: true,
    },
    dropmode: {
      active: false,
    },
    drawable: {
      enabled: true, // can draw
    },
    selectable: {
      enabled: true,
    },
    stats: {
      // On touchscreen, default to "tap-tap" moves instead of drag
      dragged: !("ontouchstart" in window),
    },
    hold: timer(),
  };
}
