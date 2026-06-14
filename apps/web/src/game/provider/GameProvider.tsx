import { type ParentComponent } from "solid-js";
import { createStore } from "solid-js/store";
import { defaults } from "../state/state.ts";
import { createLocalGameSession } from "../session/createLocalGameSession.ts";
import type { SessionAction } from "../session/types.ts";
import { GameContext } from "./context.ts";

interface GameProviderProps {
  onLocalMove?: (move: SessionAction) => void;
}

export const GameProvider: ParentComponent<GameProviderProps> = (props) => {
  const [state, setState] = createStore(defaults());

  const session = createLocalGameSession(state, setState, {
    onLocalMove: props.onLocalMove,
  });

  return (
    <GameContext.Provider value={session}>
      {props.children}
    </GameContext.Provider>
  );
};
