import { createContext } from "solid-js";
import type { LocalGameSession } from "../session/types.ts";

export const GameContext = createContext<LocalGameSession>();
