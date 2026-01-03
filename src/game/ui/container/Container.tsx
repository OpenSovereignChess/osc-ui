import { createEffect, createSignal } from "solid-js";
import { useGameContext } from "../../logic/provider/useGameContext.ts";
import { BOARD_SIZE } from "../../logic/constants.ts";
import * as types from "../../logic/types.ts";
import * as util from "../../logic/util.ts";
import Board from "../board/Board.tsx";
import Coords from "../coords/Coords.tsx";
import Events from "../events/Events.tsx";

import "./container.css";

function updateBounds(
  bounds: DOMRectReadOnly,
  containerEl: HTMLElement,
): DOMRectReadOnly {
  const edgeSize = Math.min(bounds.width, bounds.height);
  console.log("Updating container bounds size:", edgeSize);
  const width =
    (Math.floor((edgeSize * window.devicePixelRatio) / BOARD_SIZE) *
      BOARD_SIZE) /
    window.devicePixelRatio;
  const height = width;
  containerEl.style.width = `${width}px`;
  containerEl.style.height = `${height}px`;
  return containerEl.getBoundingClientRect();
}

export default function Container() {
  const [wrapEl, setWrapEl] = createSignal<HTMLElement>();
  const [containerEl, setContainerEl] = createSignal<HTMLElement>();
  const [boardEl, setBoardEl] = createSignal<HTMLElement>();
  const [bounds, setBounds] = createSignal<DOMRectReadOnly>();
  const [eventsBound, setEventsBound] = createSignal<boolean>(false);
  const { state: gameState, setDom } = useGameContext();

  // TODO: We need to update bounds on state.dom.bounds when we call updateBounds
  createEffect(() => {
    if (!wrapEl() || !containerEl()) {
      return;
    }

    // Set board element size
    const bounds = wrapEl()!.getBoundingClientRect();
    console.log(
      "Initial container bounds:",
      containerEl()!.getBoundingClientRect(),
    );
    updateBounds(bounds, containerEl()!);

    console.log(
      "Resulting container bounds:",
      containerEl()!.getBoundingClientRect(),
    );
    // Set bounds for Board and children components
    setBounds(containerEl()!.getBoundingClientRect());

    // Bind resize event handler
    if ("ResizeObserver" in window) {
      new ResizeObserver((entries) => {
        if (entries.length > 0) {
          const newBounds = entries[0].contentRect;
          console.log("ResizeObserver detected size change: ", newBounds);
          const updatedContainerBounds = updateBounds(
            newBounds,
            containerEl()!,
          );
          setBounds(updatedContainerBounds);
        }
      }).observe(wrapEl()!);
    }
  });

  createEffect(() => {
    if (eventsBound() || !wrapEl() || !containerEl() || !boardEl()) {
      return;
    }

    const dom: types.Dom = {
      elements: {
        board: boardEl()!,
        container: containerEl()!,
        wrap: wrapEl()!,
      },
      bounds: util.memo(() => bounds()!),
    };

    setDom(dom);
    setEventsBound(true);
  });

  createEffect(() => {
    console.log("Dom updated:", gameState.dom, gameState.dom?.elements.board);
  });

  return (
    <>
      <Events boardEl={boardEl()} />
      <div class="wrap w-full h-full" ref={setWrapEl}>
        <div class="sc-container" ref={setContainerEl}>
          <Board ref={setBoardEl} bounds={bounds()} />
          <Coords />
        </div>
      </div>
    </>
  );
}
