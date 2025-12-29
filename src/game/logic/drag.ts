import * as board from "./board.ts";
import { type State } from "./state.ts";
import * as util from "./util.ts";
import * as types from "./types.ts";

export interface DragCurrent {
  orig: types.Key; // Origin key of dragging piece
}

export function start(s: State, e: types.MouchEvent): void {
  // Check for human input
  if (!e.isTrusted) {
    return;
  }
  // Only touch or left click
  if (e.buttons !== undefined && e.buttons > 1) {
    return;
  }
  // Support one finger touch only
  if (e.touches && e.touches.length > 1) {
    return;
  }
  if (!s.dom) {
    return;
  }
  const bounds = s.dom.bounds();
  const position = util.eventPosition(e)!;
  const orig = board.getKeyAtDomPos(position, board.whitePov(s), bounds);

  console.log("drag.start", { position, orig });
}
