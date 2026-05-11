import { createEffect } from "solid-js";
import { useGameSession } from "../../session/useGameSession.ts";
import { isRightButton } from "../../rules/util.ts";
import * as drag from "../../input/drag.ts";
import * as types from "../../rules/types.ts";

type EventsProps = {
  boardEl?: HTMLElement;
};

export default function Events(props: EventsProps) {
  const session = useGameSession();

  const onStart = (e: types.MouchEvent) => {
    const interaction = session.getInteraction();
    const state = session.getState();

    console.log("startDragOrDraw", e);
    if (interaction.draggableCurrent) {
      console.log("draggable.current exists; cancel drag");
      //drag.cancel(state);
    } else if (interaction.drawableCurrent) {
      console.log("drawable.current exists; cancel draw");
      //draw.cancel(state);
    } else if (e.shiftKey || isRightButton(e)) {
      console.log("right click or shiftKey");
      if (interaction.drawableEnabled) {
        console.log("start drawing");
        //draw.start(state, e);
      }
    } else if (!interaction.viewOnly) {
      if (interaction.dropmodeActive) {
        console.log("in dropmode; drop piece");
        //drop(state, e);
      } else {
        console.log("start dragging");
        drag.start(state, e, { board: session.board });
      }
    }
  };

  createEffect(() => {
    if (session.getInteraction().viewOnly || !props.boardEl) {
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
