import { BOARD_SIZE, BOARD_SIZE_ZERO_INDEX } from "./constants.ts";
import { type State } from "./state.ts";
import * as types from "./types.ts";
import * as util from "./util.ts";

export function getKeyAtDomPos(
  pos: types.NumberPair,
  asWhite: boolean,
  bounds: DOMRectReadOnly,
): types.Key | undefined {
  let file = Math.floor((BOARD_SIZE * (pos[0] - bounds.left)) / bounds.width);
  if (!asWhite) {
    file = BOARD_SIZE_ZERO_INDEX - file;
  }
  let rank =
    BOARD_SIZE_ZERO_INDEX -
    Math.floor((BOARD_SIZE * (pos[1] - bounds.top)) / bounds.height);
  if (!asWhite) {
    rank = BOARD_SIZE_ZERO_INDEX - rank;
  }
  return file >= 0 && file < BOARD_SIZE && rank >= 0 && rank < BOARD_SIZE
    ? util.pos2key([file, rank])
    : undefined;
}

export function whitePov(s: State): boolean {
  return s.orientation === "white";
}
