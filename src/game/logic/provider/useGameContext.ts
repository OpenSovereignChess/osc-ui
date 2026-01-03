import { useContext } from "solid-js";
import { type GameProviderType } from "./GameProvider.tsx";
import { GameContext } from "./context.ts";

export function useGameContext(): GameProviderType {
  const context = useContext(GameContext);
  if (!context) {
    throw new Error("Can't find GameContext");
  }
  return context;
}
