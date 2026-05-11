import { Show, createMemo } from "solid-js";
import { key2pos, posToTranslate } from "./render.ts";
import type { BoardKey, BoardOrientation, NumberPair } from "./types.ts";

import "./styles/square.css";

type HighlightSquareProps = {
  bounds?: DOMRectReadOnly;
  colorClass: string;
  key?: BoardKey;
  orientation: BoardOrientation;
};

export default function HighlightSquare(props: HighlightSquareProps) {
  const offset = createMemo<NumberPair | null>(() => {
    if (!props.key || !props.bounds) {
      return null;
    }

    const pos = key2pos(props.key);
    const translate = posToTranslate(props.bounds);
    return translate(pos, props.orientation);
  });

  return (
    <Show when={props.key}>
      <div
        class={`square ${props.colorClass}`}
        style={{
          transform: offset()
            ? `translate(${offset()![0]}px, ${offset()![1]}px)`
            : undefined,
        }}
      />
    </Show>
  );
}
