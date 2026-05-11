import { useContext } from "solid-js";
import { GameContext } from "../provider/context.ts";
import type { LocalGameSession } from "./types.ts";

export function useGameSession(): LocalGameSession {
  const session = useContext(GameContext);
  if (!session) {
    throw new Error("Can't find GameContext");
  }
  return session;
}
