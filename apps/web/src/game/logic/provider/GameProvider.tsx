import { type ParentComponent } from "solid-js";
import { type SetStoreFunction, createStore } from "solid-js/store";
import { type State, defaults } from "../state.ts";
import * as types from "../types.ts";
import { createLocalGameSession } from "../../session/createLocalGameSession.ts";
import type { LocalGameSession } from "../../session/types.ts";
import { GameContext } from "./context.ts";

export type GameProviderType = {
  session: LocalGameSession;
  state: State;
} & ReturnType<typeof createDomActions>;

type StateSetter = SetStoreFunction<State>;

export const GameProvider: ParentComponent = (props) => {
  const [state, setState] = createStore(defaults());

  const session = createLocalGameSession(state, setState);
  const domActions = createDomActions(setState);

  const value = {
    session,
    state,
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
