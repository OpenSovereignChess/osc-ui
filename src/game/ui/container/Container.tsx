import { createEffect, createSignal } from "solid-js";
import { BOARD_SIZE } from "../../logic/constants.ts";
import Board from "../board/Board";

import "./container.css";

export default function Container() {
  const [wrapEl, setWrapEl] = createSignal<HTMLElement>();
  const [containerEl, setContainerEl] = createSignal<HTMLElement>();

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
    <div class="wrap" ref={setWrapEl}>
      <div class="container" ref={setContainerEl}>
        <Board />
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
  );
}
