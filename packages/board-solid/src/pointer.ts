import type { BoardPointerEvent, NumberPair } from "./types.ts";

export function eventPosition(e: BoardPointerEvent): NumberPair | undefined {
  if (e.clientX || e.clientX === 0) {
    return [e.clientX, e.clientY!];
  }
  if (e.targetTouches?.[0]) {
    return [e.targetTouches[0].clientX, e.targetTouches[0].clientY];
  }
  return undefined;
}

export function changedTouchPosition(
  e: BoardPointerEvent,
): NumberPair | undefined {
  const touch = e.changedTouches?.[0];
  return touch ? [touch.clientX, touch.clientY] : undefined;
}

const isFirefoxMac = () =>
  !("ontouchstart" in window) &&
  ["macintosh", "firefox"].every((x) =>
    navigator.userAgent.toLowerCase().includes(x),
  );

export function isRightButton(e: BoardPointerEvent): boolean {
  return e.button === 2 && !(e.ctrlKey && isFirefoxMac());
}
