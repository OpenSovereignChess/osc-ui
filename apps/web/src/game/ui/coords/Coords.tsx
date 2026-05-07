import { For } from "solid-js";
import * as types from "../../logic/types.ts";
import { useGameContext } from "../../logic/provider/useGameContext.ts";

import "./coords.css";

export default function Coords() {
  const { state } = useGameContext();

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
