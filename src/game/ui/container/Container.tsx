import { createContext, createEffect, createSignal } from "solid-js";
import { type SetStoreFunction, createStore } from "solid-js/store";
import { BOARD_SIZE } from "../../logic/constants.ts";
import { type State, defaults } from "../../logic/state.ts";
import Board from "../board/Board";

import "./container.css";

const StateContext = createContext<{
  state: State;
  setState: SetStoreFunction<State>;
}>();

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
          <Board state={state} />
          <svg
            class="shapes"
            viewBox="-4 -4 8 8"
            preserveAspectRatio="xMidYMid slice"
          >
            <defs>
              <filter id="filter-blur">
                <feGaussianBlur stdDeviation="0.013"></feGaussianBlur>
              </filter>
            </defs>
            <g></g>
          </svg>
        </div>
      </div>
    </StateContext.Provider>
  );
}
