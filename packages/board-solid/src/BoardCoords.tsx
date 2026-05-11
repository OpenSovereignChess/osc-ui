import { For, Show } from "solid-js";
import { files, ranks } from "./render.ts";
import type { BoardOrientation } from "./types.ts";

import "./styles/coords.css";

type BoardCoordsProps = {
  orientation: BoardOrientation;
  show?: boolean;
};

export default function BoardCoords(props: BoardCoordsProps) {
  return (
    <Show when={props.show}>
      <div
        classList={{
          coords: true,
          ranks: true,
          black: props.orientation === "black",
        }}
      >
        <For each={ranks}>{(rank) => <div class="coord">{rank}</div>}</For>
      </div>
      <div
        classList={{
          coords: true,
          files: true,
          black: props.orientation === "black",
        }}
      >
        <For each={files}>{(file) => <div class="coord">{file}</div>}</For>
      </div>
    </Show>
  );
}
