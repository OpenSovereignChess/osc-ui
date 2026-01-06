import { type SetStoreFunction } from "solid-js/store";
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

function isMovable(state: State, orig: types.Key): boolean {
  const piece = state.pieces.get(orig);
  return (
    !!piece &&
    (state.movable.color === "both" ||
      (state.movable.color === piece.color && state.turnColor === piece.color))
  );
}

function tryAutoCastle(): boolean {
  // TODO: Implement
  return false;
}

export function createBoardActions(setState: SetStoreFunction<State>) {
  function setSelected(state: State, key: types.Key): void {
    console.log("board.setSelected", { key, state });
    setState({ selected: key });
  }

  function unselect(): void {
    console.log("board.unselect");
    setState({ selected: undefined });
  }

  const canMove = (state: State, orig: types.Key, dest: types.Key): boolean =>
    orig !== dest &&
    isMovable(state, orig) &&
    (state.movable.free || !!state.movable.dests?.get(orig)?.includes(dest));

  function baseMove(
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
      unselect();
    }
    if (!tryAutoCastle()) {
      setState("pieces", (pieces) => {
        const newPieces = new Map(pieces);
        newPieces.set(dest, origPiece);
        newPieces.delete(orig);
        return newPieces;
      });
    }
    setState({
      lastMove: [orig, dest],
      check: undefined,
    });
    return captured || true;
  }

  function baseUserMove(
    state: State,
    orig: types.Key,
    dest: types.Key,
  ): types.Piece | boolean {
    const result = baseMove(state, orig, dest);
    if (result) {
      setState("movable", { dests: undefined });
      setState("turnColor", util.opposite(state.turnColor));
      setState("animation", { current: undefined });
    }
    return result;
  }

  function userMove(state: State, orig: types.Key, dest: types.Key): boolean {
    if (canMove(state, orig, dest)) {
      const result = baseUserMove(state, orig, dest);
      if (result) {
        unselect();
        return true;
      }
    }
    unselect();
    return false;
  }

  function selectSquare(state: State, key: types.Key, force?: boolean): void {
    console.log("board.selectSquare", { key, state });
    if (state.selected) {
      console.log("state selected");
      if (state.selected === key && !state.draggable.enabled) {
        console.log("state.selected === key");
        unselect();
        return;
      } else if (
        (state.selectable.enabled || force) &&
        state.selected !== key
      ) {
        console.log("state.selected !== key");
        if (userMove(state, state.selected, key)) {
          console.log("userMove true");
          setState("stats", { dragged: false });
          return;
        }
      }
    }
    console.log(
      "isMovable",
      state.selectable.enabled,
      state.draggable.enabled,
      isMovable(state, key),
    );
    if (
      (state.selectable.enabled || state.draggable.enabled) &&
      isMovable(state, key)
    ) {
      console.log("set selected to key", key);
      setSelected(state, key);
      state.hold.start();
    }
  }

  return {
    canMove,
    selectSquare,
  };
}
