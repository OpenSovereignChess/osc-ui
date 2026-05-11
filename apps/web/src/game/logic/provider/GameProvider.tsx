import { type ParentComponent } from "solid-js";
import { createStore } from "solid-js/store";
import { defaults } from "../state.ts";
import { createLocalGameSession } from "../../session/createLocalGameSession.ts";
import { GameContext } from "./context.ts";

export const GameProvider: ParentComponent = (props) => {
  const [state, setState] = createStore(defaults());

  const session = createLocalGameSession(state, setState);

  return (
    <GameContext.Provider value={session}>
      {props.children}
    </GameContext.Provider>
  );
};
