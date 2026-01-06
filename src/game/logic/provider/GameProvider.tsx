import { type ParentComponent } from "solid-js";
import { type SetStoreFunction, createStore } from "solid-js/store";
import { type State, defaults } from "../state.ts";
import * as types from "../types.ts";
import { GameContext } from "./context.ts";
import { createBoardActions } from "../board.ts";

export type BoardActions = ReturnType<typeof createBoardActions>;

export type GameProviderType = {
  state: State;
  board: BoardActions;
} & ReturnType<typeof createDomActions>;

type StateSetter = SetStoreFunction<State>;

export const GameProvider: ParentComponent = (props) => {
  const [state, setState] = createStore(defaults());

  const domActions = createDomActions(setState);
  const boardActions = createBoardActions(setState);

  const value = {
    state,
    board: boardActions,
    ...domActions,
  };

  return (
    <GameContext.Provider value={value}>{props.children}</GameContext.Provider>
  );
};

function createDomActions(setState: StateSetter) {
  return {
    setDom: (dom: types.Dom) => {
      setState({ dom });
    },
  };
}
