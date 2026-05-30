import { createMemo } from "solid-js";
import type { SetStoreFunction } from "solid-js/store";
import { createBoardActions } from "../input/board.ts";
import type { State } from "../state/state.ts";
import type * as types from "../rules/types.ts";
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
    coordinates: state.interaction.coordinates,
    orientation: state.position.orientation,
    pieces: state.position.pieces,
    selected: state.interaction.selected,
  }));

  const getInteraction = createMemo<InteractionSnapshot>(() => ({
    drawableCurrent: state.interaction.drawable.current,
    drawableEnabled: state.interaction.drawable.enabled,
    dropmodeActive: state.interaction.dropmode.active,
    viewOnly: state.interaction.viewOnly,
  }));

  return {
    board,
    getInteraction,
    getSnapshot,
    getState: () => state,
    setDom: (dom: types.Dom) => {
      setState("layout", { dom });
    },
  };
}
