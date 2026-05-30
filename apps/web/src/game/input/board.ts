import { type SetStoreFunction } from "solid-js/store";
import { type State } from "../state/state.ts";
import * as types from "../rules/types.ts";
import * as util from "../rules/util.ts";

function isMovable(state: State, orig: types.Key): boolean {
  const piece = state.position.pieces.get(orig);
  return (
    !!piece &&
    (state.position.movable.color === "both" ||
      (state.position.movable.color === piece.color &&
        state.position.turnColor === piece.color))
  );
}

function tryAutoCastle(): boolean {
  // TODO: Implement
  return false;
}

export function createBoardActions(setState: SetStoreFunction<State>) {
  function setSelected(state: State, key: types.Key): void {
    console.log("board.setSelected", { key, state });
    setState("interaction", { selected: key });
  }

  function unselect(): void {
    console.log("board.unselect");
    setState("interaction", { selected: undefined });
  }

  const canMove = (state: State, orig: types.Key, dest: types.Key): boolean =>
    orig !== dest &&
    isMovable(state, orig) &&
    (state.position.movable.free ||
      !!state.position.movable.dests?.get(orig)?.includes(dest));

  function baseMove(
    state: State,
    orig: types.Key,
    dest: types.Key,
  ): types.Piece | boolean {
    const origPiece = state.position.pieces.get(orig);
    const destPiece = state.position.pieces.get(dest);
    if (orig === dest || !origPiece) {
      return false;
    }
    // TODO: Convet to SC rules
    const captured =
      destPiece && destPiece.color !== origPiece.color ? destPiece : undefined;
    if (dest === state.interaction.selected) {
      unselect();
    }
    if (!tryAutoCastle()) {
      setState("position", "pieces", (pieces) => {
        const newPieces = new Map(pieces);
        newPieces.set(dest, origPiece);
        newPieces.delete(orig);
        return newPieces;
      });
    }
    setState("position", {
      check: undefined,
      lastMove: [orig, dest],
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
      setState("position", "movable", { dests: undefined });
      setState(
        "position",
        "turnColor",
        util.opposite(state.position.turnColor),
      );
      setState("interaction", "animation", { current: undefined });
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

  function movePiece(state: State, orig: types.Key, dest: types.Key): boolean {
    const moved = userMove(state, orig, dest);
    setState("interaction", "stats", { dragged: moved });
    return moved;
  }

  function selectSquare(state: State, key: types.Key, force?: boolean): void {
    console.log("board.selectSquare", { key, state });
    if (state.interaction.selected) {
      console.log("state selected");
      if (
        state.interaction.selected === key &&
        !state.interaction.draggable.enabled
      ) {
        console.log("state.selected === key");
        unselect();
        return;
      } else if (
        (state.interaction.selectable.enabled || force) &&
        state.interaction.selected !== key
      ) {
        console.log("state.selected !== key");
        if (userMove(state, state.interaction.selected, key)) {
          console.log("userMove true");
          setState("interaction", "stats", { dragged: false });
          return;
        }
      }
    }
    console.log(
      "isMovable",
      state.interaction.selectable.enabled,
      state.interaction.draggable.enabled,
      isMovable(state, key),
    );
    if (
      (state.interaction.selectable.enabled ||
        state.interaction.draggable.enabled) &&
      isMovable(state, key)
    ) {
      console.log("set selected to key", key);
      setSelected(state, key);
      state.interaction.hold.start();
    }
  }

  return {
    canMove,
    canSelect: isMovable,
    movePiece,
    selectSquare,
  };
}

export type BoardActions = ReturnType<typeof createBoardActions>;
