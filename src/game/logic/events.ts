import * as drag from "./drag.ts";
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
      console.log("draggable.current exists; cancel drag");
      //drag.cancel(s);
    } else if (s.drawable.current) {
      console.log("drawable.current exists; cancel draw");
      //draw.cancel(s);
    } else if (e.shiftKey || isRightButton(e)) {
      console.log("right click or shiftKey");
      if (s.drawable.enabled) {
        console.log("start drawing");
        //draw.start(s, e);
      }
    } else if (!s.viewOnly) {
      if (s.dropmode.active) {
        console.log("in dropmode; drop piece");
        //drop(s, e);
      } else {
        console.log("start dragging");
        drag.start(s, e);
      }
    }
  };
