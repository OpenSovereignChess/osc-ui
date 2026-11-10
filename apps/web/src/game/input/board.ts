import { type SetStoreFunction } from "solid-js/store";
import { type State } from "../state/state.ts";
import * as types from "../rules/types.ts";

function isMovable(state: State, orig: types.Key): boolean {
  const piece = state.position.pieces.get(orig);
  const legalDests = state.position.movable.dests?.get(orig);
  return (
    !!piece &&
    (state.position.movable.free ||
      (legalDests !== undefined && legalDests.length > 0)) &&
    (state.position.movable.color === "both" ||
      (state.position.movable.color === piece.color &&
        state.position.turnColor === piece.color))
  );
}

// Interaction checks and selection only. Gameplay moves belong to the session;
// free board edits belong to the editor actions.
export function createBoardActions(setState: SetStoreFunction<State>) {
  function unselect(): void {
    setState("interaction", { selected: undefined });
  }

  const canMove = (state: State, orig: types.Key, dest: types.Key): boolean =>
    orig !== dest &&
    isMovable(state, orig) &&
    (state.position.movable.free ||
      !!state.position.movable.dests?.get(orig)?.includes(dest));

  function selectSquare(state: State, key: types.Key): void {
    if (state.interaction.selected) {
      if (
        state.interaction.selected === key &&
        !state.interaction.draggable.enabled
      ) {
        unselect();
        return;
      }
      if (
        state.interaction.selectable.enabled &&
        state.interaction.selected !== key
      ) {
        unselect();
      }
    }
    if (
      (state.interaction.selectable.enabled ||
        state.interaction.draggable.enabled) &&
      isMovable(state, key)
    ) {
      setState("interaction", { selected: key });
    }
  }

  return {
    cancelDrag: unselect,
    canMove,
    canSelect: isMovable,
    selectSquare,
  };
}

export type BoardActions = ReturnType<typeof createBoardActions>;
