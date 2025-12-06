import { For } from "solid-js";
import useStateContext from "../hooks/useStateContext.ts";
import * as types from "../../logic/types.ts";

import "./coords.css";

export default function Coords() {
  const { state } = useStateContext();

  if (!state.coordinates) {
    return null;
  }

  return (
    <>
      <div
        classList={{
          coords: true,
          ranks: true,
          black: state.orientation === "black",
        }}
      >
        <For each={types.ranks}>
          {(rank) => <div class="coord">{rank}</div>}
        </For>
      </div>
      <div
        classList={{
          coords: true,
          files: true,
          black: state.orientation === "black",
        }}
      >
        <For each={types.files}>
          {(file) => <div class="coord">{file}</div>}
        </For>
      </div>
    </>
  );
}
