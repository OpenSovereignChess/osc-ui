import { useGameContext } from "../logic/provider/useGameContext.ts";
import type { LocalGameSession } from "./types.ts";

export function useGameSession(): LocalGameSession {
  return useGameContext().session;
}
