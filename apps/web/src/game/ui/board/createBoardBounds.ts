import { BOARD_SIZE } from "@osc/board-core";
import { createEffect, createSignal, onCleanup, type Accessor } from "solid-js";

/** Size a square board to its stage, keeping each square device-pixel aligned. */
export function createBoardBounds(
  stage: Accessor<HTMLElement | undefined>,
  container: Accessor<HTMLElement | undefined>,
): Accessor<DOMRectReadOnly | undefined> {
  const [bounds, setBounds] = createSignal<DOMRectReadOnly>();

  createEffect(() => {
    const stageEl = stage();
    const containerEl = container();
    if (!stageEl || !containerEl) return;

    const refresh = (source = stageEl.getBoundingClientRect()) => {
      const edgeSize = Math.min(source.width, source.height);
      const size =
        (Math.floor((edgeSize * window.devicePixelRatio) / BOARD_SIZE) *
          BOARD_SIZE) /
        window.devicePixelRatio;
      containerEl.style.width = `${size}px`;
      containerEl.style.height = `${size}px`;
      setBounds(containerEl.getBoundingClientRect());
    };

    refresh();
    // Measure again after layout settles, even without ResizeObserver support.
    const frame = window.requestAnimationFrame(() => refresh());
    let observer: ResizeObserver | undefined;
    if ("ResizeObserver" in window) {
      observer = new ResizeObserver((entries) => {
        refresh(entries[0]?.contentRect);
      });
      observer.observe(stageEl);
    }

    onCleanup(() => {
      window.cancelAnimationFrame(frame);
      observer?.disconnect();
    });
  });

  return bounds;
}
