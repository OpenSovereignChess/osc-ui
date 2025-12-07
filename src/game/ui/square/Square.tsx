import { createMemo } from "solid-js";
import { key2pos, posToTranslate } from "../../logic/util.ts";
import { whitePov } from "../../logic/state.ts";
import * as types from "../../logic/types.ts";
import useStateContext from "../hooks/useStateContext.ts";

import "./square.css";

type SquareProps = {
  key: types.Key;
  bounds?: DOMRectReadOnly;
};

export default function Square(props: SquareProps) {
  const { state } = useStateContext();
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
