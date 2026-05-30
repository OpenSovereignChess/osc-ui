import type { BoardKey, BoardOrientation, NumberPair } from "./types.ts";

export const BOARD_SIZE = 16;
export const BOARD_SIZE_ZERO_INDEX = BOARD_SIZE - 1;

export const files = [
  "a",
  "b",
  "c",
  "d",
  "e",
  "f",
  "g",
  "h",
  "i",
  "j",
  "k",
  "l",
  "m",
  "n",
  "o",
  "p",
] as const;

export const ranks = [
  "1",
  "2",
  "3",
  "4",
  "5",
  "6",
  "7",
  "8",
  "9",
  "10",
  "11",
  "12",
  "13",
  "14",
  "15",
  "16",
] as const;

export function whitePov(orientation: BoardOrientation): boolean {
  return orientation === "white";
}

export function key2pos(key: BoardKey): [number, number] {
  return [key.charCodeAt(0) - 97, parseInt(key.slice(1), 10) - 1];
}

export function posToTranslate(bounds: DOMRectReadOnly) {
  return (pos: [number, number], orientation: BoardOrientation): NumberPair => [
    ((whitePov(orientation) ? pos[0] : BOARD_SIZE_ZERO_INDEX - pos[0]) *
      bounds.width) /
      BOARD_SIZE,
    ((whitePov(orientation) ? BOARD_SIZE_ZERO_INDEX - pos[1] : pos[1]) *
      bounds.height) /
      BOARD_SIZE,
  ];
}

export function getKeyAtDomPos(
  pos: NumberPair,
  orientation: BoardOrientation,
  bounds: DOMRectReadOnly,
): BoardKey | undefined {
  let file = Math.floor((BOARD_SIZE * (pos[0] - bounds.left)) / bounds.width);
  if (!whitePov(orientation)) {
    file = BOARD_SIZE_ZERO_INDEX - file;
  }

  let rank =
    BOARD_SIZE_ZERO_INDEX -
    Math.floor((BOARD_SIZE * (pos[1] - bounds.top)) / bounds.height);
  if (!whitePov(orientation)) {
    rank = BOARD_SIZE_ZERO_INDEX - rank;
  }

  return file >= 0 && file < BOARD_SIZE && rank >= 0 && rank < BOARD_SIZE
    ? `${files[file]}${ranks[rank]}`
    : undefined;
}
