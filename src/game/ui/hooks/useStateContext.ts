import { useContext } from "solid-js";
import { StateContext } from "../../logic/state.ts";

export default function useStateContext() {
  const context = useContext(StateContext);
  if (!context) {
    throw new Error("Can't find StateContext");
  }
  return context;
}
