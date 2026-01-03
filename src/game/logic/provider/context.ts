import { createContext } from "solid-js";
import { type GameProviderType } from "./GameProvider.tsx";

export const GameContext = createContext<GameProviderType>();
