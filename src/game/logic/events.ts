import { isRightButton } from "./util.ts";
import { type State } from "./state.ts";
import * as types from "./types.ts";

type MouchBind = (e: types.MouchEvent) => void;

export function bindBoard(s: State): void {
  const boardEl = s.dom?.elements.board;

  if (s.viewOnly || !boardEl) {
    return;
  }

  const onStart = startDragOrDraw(s);
  boardEl.addEventListener("touchstart", onStart as EventListener, {
    passive: false,
  });
  boardEl.addEventListener("mousedown", onStart as EventListener, {
    passive: false,
  });
}

const startDragOrDraw =
  (s: State): MouchBind =>
  (e) => {
    console.log("startDragOrDraw", e);
    if (s.draggable.current) {
      //drag.cancel(s);
    } else if (s.drawable.current) {
      //draw.cancel(s);
    } else if (e.shiftKey || isRightButton(e)) {
      if (s.drawable.enabled) {
        //draw.start(s, e);
      }
    } else if (!s.viewOnly) {
      if (s.dropmode.active) {
        //drop(s, e);
      } else {
        //drag.start(s, e);
      }
    }
  };
