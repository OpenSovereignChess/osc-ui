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

export function unselect(state: State): void {
  state.selected = undefined;
}

function isMovable(state: State, orig: types.Key): boolean {
  const piece = state.pieces.get(orig);
  return (
    !!piece &&
    (state.movable.color === "both" ||
      (state.movable.color === piece.color && state.turnColor === piece.color))
  );
}

export const canMove = (
  state: State,
  orig: types.Key,
  dest: types.Key,
): boolean =>
  orig !== dest &&
  isMovable(state, orig) &&
  (state.movable.free || !!state.movable.dests?.get(orig)?.includes(dest));

export function baseMove(
  state: State,
  orig: types.Key,
  dest: types.Key,
): types.Piece | boolean {
  const origPiece = state.pieces.get(orig);
  const destPiece = state.pieces.get(dest);
  if (orig === dest || !origPiece) {
    return false;
  }
  // TODO: Convet to SC rules
  const captured =
    destPiece && destPiece.color !== origPiece.color ? destPiece : undefined;
  if (dest === state.selected) {
    unselect(state);
  }
  state.lastMove = [orig, dest];
  state.check = undefined;
  return captured || true;
}

export function baseUserMove(
  state: State,
  orig: types.Key,
  dest: types.Key,
): types.Piece | boolean {
  const result = baseMove(state, orig, dest);
  if (result) {
    state.movable.dests = undefined;
    state.turnColor = util.opposite(state.turnColor);
    state.animation.current = undefined;
  }
  return result;
}

export function userMove(
  state: State,
  orig: types.Key,
  dest: types.Key,
): boolean {
  if (canMove(state, orig, dest)) {
    const result = baseUserMove(state, orig, dest);
    if (result) {
      const holdTime = state.hold.stop();
      unselect(state);
      const metadata: types.MoveMetadata = {
        ctrlKey: state.stats.ctrlKey,
        holdTime,
      };
      if (result !== true) {
        metadata.captured = result;
        return true;
      }
    }
  }
  unselect(state);
  return false;
}

export function setSelected(state: State, key: types.Key): void {
  state.selected = key;
}

export function selectSquare(
  state: State,
  key: types.Key,
  force?: boolean,
): void {
  if (state.selected) {
    if (state.selected === key && !state.draggable.enabled) {
      unselect(state);
      return;
    } else if ((state.selectable.enabled || force) && state.selected !== key) {
      if (userMove(state, state.selected, key)) {
        state.stats.dragged = false;
        return;
      }
    }
  }
  if (
    (state.selectable.enabled || state.draggable.enabled) &&
    isMovable(state, key)
  ) {
    setSelected(state, key);
    state.hold.start();
  }
}
