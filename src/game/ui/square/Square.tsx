import { Show, createMemo } from "solid-js";
import { useGameContext } from "../../logic/provider/useGameContext.ts";
import { key2pos, posToTranslate } from "../../logic/util.ts";
import { whitePov } from "../../logic/board.ts";
import * as types from "../../logic/types.ts";

import "./square.css";

type SquareProps = {
  key: types.Key;
  bounds?: DOMRectReadOnly;
};

export default function Square(props: SquareProps) {
  const { state } = useGameContext();
  const offset = createMemo<types.NumberPair | null>(() => {
    if (!props.key || !props.bounds) {
      return null;
    }
    const pos = key2pos(props.key);
    const translate = posToTranslate(props.bounds);
    const offset = translate(pos, whitePov(state));
    console.log("piece", props.key, offset);
    return offset;
  });

  return (
    <div
      class="square bg-green-50"
      style={{
        transform: offset()
          ? `translate(${offset()![0]}px, ${offset()![1]}px)`
          : undefined,
      }}
    />
  );
}

export function SelectedSquare() {
  const { state } = useGameContext();

  const offset = createMemo<types.NumberPair | null>(() => {
    const key = state.selected;
    const bounds = state.dom?.bounds();
    if (!key || !bounds) {
      return null;
    }
    const pos = key2pos(key);
    const translate = posToTranslate(bounds);
    const offset = translate(pos, whitePov(state));
    return offset;
  });

  return (
    <Show when={state.selected}>
      <div
        class="square bg-red"
        style={{
          transform: offset()
            ? `translate(${offset()![0]}px, ${offset()![1]}px)`
            : undefined,
        }}
      />
    </Show>
  );
}
