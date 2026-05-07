import { createEffect } from "solid-js";
import { useGameContext } from "../../logic/provider/useGameContext.ts";
import { isRightButton } from "../../logic/util.ts";
import * as drag from "../../logic/drag.ts";
import * as types from "../../logic/types.ts";

type EventsProps = {
  boardEl?: HTMLElement;
};

export default function Events(props: EventsProps) {
  const { state, board } = useGameContext();

  const onStart = (e: types.MouchEvent) => {
    console.log("startDragOrDraw", e);
    if (state.draggable.current) {
      console.log("draggable.current exists; cancel drag");
      //drag.cancel(state);
    } else if (state.drawable.current) {
      console.log("drawable.current exists; cancel draw");
      //draw.cancel(state);
    } else if (e.shiftKey || isRightButton(e)) {
      console.log("right click or shiftKey");
      if (state.drawable.enabled) {
        console.log("start drawing");
        //draw.start(state, e);
      }
    } else if (!state.viewOnly) {
      if (state.dropmode.active) {
        console.log("in dropmode; drop piece");
        //drop(state, e);
      } else {
        console.log("start dragging");
        drag.start(state, e, { board });
      }
    }
  };

  createEffect(() => {
    if (state.viewOnly || !props.boardEl) {
      return;
    }
    props.boardEl.addEventListener("touchstart", onStart as EventListener, {
      passive: false,
    });
    props.boardEl.addEventListener("mousedown", onStart as EventListener, {
      passive: false,
    });
  });

  return null;
}
