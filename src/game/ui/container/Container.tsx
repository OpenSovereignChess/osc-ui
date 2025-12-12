import { createEffect, createSignal } from "solid-js";
import { createStore } from "solid-js/store";
import { BOARD_SIZE } from "../../logic/constants.ts";
import { type State, StateContext, defaults } from "../../logic/state.ts";
import Board from "../board/Board";
import Coords from "../coords/Coords";

import "./container.css";

function updateBounds(
  bounds: DOMRectReadOnly,
  containerEl: HTMLElement,
): DOMRectReadOnly {
  let width =
    (Math.floor((bounds.width * window.devicePixelRatio) / BOARD_SIZE) *
      BOARD_SIZE) /
    window.devicePixelRatio;
  width = Math.min(width, 1000);
  const height = width;
  containerEl.style.width = `${width}px`;
  containerEl.style.height = `${height}px`;
  return containerEl.getBoundingClientRect();
}

export default function Container() {
  const [wrapEl, setWrapEl] = createSignal<HTMLElement>();
  const [containerEl, setContainerEl] = createSignal<HTMLElement>();
  const [bounds, setBounds] = createSignal<DOMRectReadOnly>();
  const [state, setState] = createStore<State>(defaults());

  createEffect(() => {
    if (!wrapEl() || !containerEl()) {
      return;
    }

    // Set bounds for Board and children components
    setBounds(containerEl()!.getBoundingClientRect());

    // Set board element size
    const bounds = wrapEl()!.getBoundingClientRect();
    updateBounds(bounds, containerEl()!);

    // Bind resize event handler
    if ("ResizeObserver" in window) {
      new ResizeObserver((entries) => {
        if (entries.length > 0) {
          const newBounds = entries[0].contentRect;
          const updatedContainerBounds = updateBounds(
            newBounds,
            containerEl()!,
          );
          setBounds(updatedContainerBounds);
        }
      }).observe(wrapEl()!);
    }
  });

  return (
    <StateContext.Provider value={{ state, setState }}>
      <div class="wrap" ref={setWrapEl}>
        <div class="container" ref={setContainerEl}>
          <Board bounds={bounds()} />
          <Coords />
        </div>
      </div>
    </StateContext.Provider>
  );
}
