import type { BoardActions } from "./board.ts";
import * as board from "./board.ts";
import { type State } from "../state/state.ts";
import * as util from "../rules/util.ts";
import * as types from "../rules/types.ts";

export interface DragCurrent {
  orig: types.Key; // Origin key of dragging piece
  piece: types.Piece;
  origPos: types.NumberPair;
  pos: types.NumberPair;
  started: boolean;
  previouslySelected?: types.Key;
  originTarget: EventTarget | null;
  keyHasChanged: boolean;
}

export function start(
  s: State,
  e: types.MouchEvent,
  actions: { board: BoardActions },
): void {
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
  if (!s.layout.dom) {
    return;
  }
  const bounds = s.layout.dom.bounds();
  const position = util.eventPosition(e)!;
  const orig = board.getKeyAtDomPos(position, board.whitePov(s), bounds);
  console.log("drag.start", { position, orig });
  if (!orig) {
    return;
  }

  const piece = s.position.pieces.get(orig);
  const previouslySelected = s.interaction.selected;
  //if (!previouslySelected && s.drawable.enabled && (!piece || piece.color !== s.turnColor)) {
  //  drawClear(s);
  //}
  // Prevent touch scroll and create no corresponding mouse event, if there
  // is an intent to interact with the board.
  if (e.cancelable !== false && (!e.touches || piece || previouslySelected)) {
    e.preventDefault();
  } else if (e.touches) {
    return; // Handle only corresponding mouse event
  }

  if (
    previouslySelected &&
    actions.board.canMove(s, previouslySelected, orig)
  ) {
    // Move piece if a piece is already selected and can move to the origin square
    actions.board.selectSquare(s, orig);
    return;
  }

  actions.board.selectSquare(s, orig);

  if (
    piece &&
    s.interaction.draggable.enabled &&
    actions.board.canSelect(s, orig)
  ) {
    actions.board.startDrag(s, {
      orig,
      piece,
      origPos: position,
      pos: position,
      started: true,
      previouslySelected,
      originTarget: e.target,
      keyHasChanged: false,
    });
    bindDocument(s, actions);
  }
}

function bindDocument(s: State, actions: { board: BoardActions }): void {
  const onMove = (e: types.MouchEvent) => {
    const position = util.eventPosition(e);
    const bounds = s.layout.dom?.bounds();
    if (!position || !bounds) {
      return;
    }
    if (e.cancelable !== false) {
      e.preventDefault();
    }
    actions.board.updateDrag(s, position);
  };

  const onEnd = (e: types.MouchEvent) => {
    cleanup();
    const current = s.interaction.draggable.current;
    const position =
      util.eventPosition(e) ?? changedTouchPosition(e) ?? current?.pos;
    const bounds = s.layout.dom?.bounds();
    if (!current || !position || !bounds) {
      actions.board.cancelDrag();
      return;
    }

    const dest = board.getKeyAtDomPos(position, board.whitePov(s), bounds);
    if (dest && dest !== current.orig) {
      actions.board.dragMove(s, current.orig, dest);
    } else {
      actions.board.cancelDrag();
    }
  };

  const onCancel = () => {
    cleanup();
    actions.board.cancelDrag();
  };

  const cleanup = () => {
    document.removeEventListener("mousemove", onMove as EventListener);
    document.removeEventListener("mouseup", onEnd as EventListener);
    document.removeEventListener("touchmove", onMove as EventListener);
    document.removeEventListener("touchend", onEnd as EventListener);
    document.removeEventListener("touchcancel", onCancel);
  };

  document.addEventListener("mousemove", onMove as EventListener, {
    passive: false,
  });
  document.addEventListener("mouseup", onEnd as EventListener);
  document.addEventListener("touchmove", onMove as EventListener, {
    passive: false,
  });
  document.addEventListener("touchend", onEnd as EventListener);
  document.addEventListener("touchcancel", onCancel);
}

function changedTouchPosition(
  e: types.MouchEvent,
): types.NumberPair | undefined {
  const touch = e.changedTouches?.[0];
  return touch ? [touch.clientX, touch.clientY] : undefined;
}
