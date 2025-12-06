import { createEffect, createSignal } from "solid-js";
import { createStore } from "solid-js/store";
import { BOARD_SIZE } from "../../logic/constants.ts";
import { type State, StateContext, defaults } from "../../logic/state.ts";
import Board from "../board/Board";
import Coords from "../coords/Coords";

import "./container.css";

export default function Container() {
  const [wrapEl, setWrapEl] = createSignal<HTMLElement>();
  const [containerEl, setContainerEl] = createSignal<HTMLElement>();
  const [state, setState] = createStore<State>(defaults());

  createEffect(() => {
    if (!wrapEl() || !containerEl()) {
      return;
    }

    const bounds = wrapEl()!.getBoundingClientRect();
    let width =
      (Math.floor((bounds.width * window.devicePixelRatio) / BOARD_SIZE) *
        BOARD_SIZE) /
      window.devicePixelRatio;
    width = Math.min(width, 1000);
    const height = width;
    containerEl()!.style.width = `${width}px`;
    containerEl()!.style.height = `${height}px`;
    console.log("Updating bounds", width, height);
  });

  return (
    <StateContext.Provider value={{ state, setState }}>
      <div class="wrap" ref={setWrapEl}>
        <div class="container" ref={setContainerEl}>
          <Board />
          <Coords />
        </div>
      </div>
    </StateContext.Provider>
  );
}
