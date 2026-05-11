import { createMemo } from "solid-js";
import type { SetStoreFunction } from "solid-js/store";
import { createBoardActions } from "../logic/board.ts";
import type { State } from "../logic/state.ts";
import type * as types from "../logic/types.ts";
import type {
  GameSnapshot,
  InteractionSnapshot,
  LocalGameSession,
} from "./types.ts";

export function createLocalGameSession(
  state: State,
  setState: SetStoreFunction<State>,
): LocalGameSession {
  const board = createBoardActions(setState);

  const getSnapshot = createMemo<GameSnapshot>(() => ({
    coordinates: state.coordinates,
    orientation: state.orientation,
    pieces: state.pieces,
    selected: state.selected,
  }));

  const getInteraction = createMemo<InteractionSnapshot>(() => ({
    drawableCurrent: state.drawable.current,
    drawableEnabled: state.drawable.enabled,
    draggableCurrent: state.draggable.current,
    dropmodeActive: state.dropmode.active,
    viewOnly: state.viewOnly,
  }));

  return {
    board,
    getInteraction,
    getSnapshot,
    getState: () => state,
    setDom: (dom: types.Dom) => {
      setState({ dom });
    },
  };
}
