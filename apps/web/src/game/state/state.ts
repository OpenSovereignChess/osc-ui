import { type AnimCurrent } from "../input/anim.ts";
import { type Drawable } from "../input/draw.ts";
import * as fen from "../rules/fen.ts";
import * as types from "../rules/types.ts";
import { timer } from "../rules/util.ts";

type Orientation = Extract<types.Color, "white" | "black">;

export interface PositionState {
  pieces: types.Pieces;
  orientation: Orientation; // Board orientation
  turnColor: types.Color; // Turn to play.  white | black
  check?: types.Key; // Square currently in check "a2"
  lastMove?: types.Key[]; // Last move orig and dest squares ["c3", "c4"]
  movable: {
    free: boolean; // All moves are valid - board editor
    color?: types.Color | "both"; // Color that can move. white | black | both
    dests?: types.Dests; // valid moves. {"a2" ["a3 "a4"] "b1" ["a3" "c3"]}
  };
}

export interface InteractionState {
  selected?: types.Key; // Currently selected square
  coordinates: boolean; // Show coorindates on the board
  viewOnly: boolean; // Don't bind events - the user won't be able to move pieces
  animation: {
    enabled: boolean;
    duration: number;
    current?: AnimCurrent;
  };
  draggable: {
    enabled: boolean; // Allow drag'n drop to move pieces
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

export interface LayoutState {
  dom?: types.Dom;
}

export interface State {
  interaction: InteractionState;
  layout: LayoutState;
  position: PositionState;
}

export function defaultPositionState(): PositionState {
  return {
    pieces: fen.read(fen.initial),
    orientation: "white",
    turnColor: "white",
    check: undefined,
    lastMove: undefined,
    movable: {
      free: true,
      color: "both",
    },
  };
}

export function defaultInteractionState(): InteractionState {
  return {
    selected: undefined,
    coordinates: true,
    viewOnly: false,
    animation: {
      enabled: true,
      duration: 200,
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

export function defaultLayoutState(): LayoutState {
  return {
    dom: undefined,
  };
}

export function defaults(): State {
  return {
    interaction: defaultInteractionState(),
    layout: defaultLayoutState(),
    position: defaultPositionState(),
  };
}
