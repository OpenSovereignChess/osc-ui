import { createMemo } from "solid-js";
import { BOARD_SIZE } from "../../logic/constants.ts";
import { key2pos } from "../../logic/util.ts";
import * as types from "../../logic/types.ts";

type SquareProps = {
  key: types.Key;
  size: number;
};

export default function Square(props: SquareProps) {
  const pos = createMemo<types.Pos>(() => {
    const pos = key2pos(props.key);
    return pos;
  });

  console.log("Rendering square", props.key, pos());
  return (
    <div
      class="square absolute top-0 left-0 text-xs bg-green-50"
      style={{
        height: `${props.size}px`,
        width: `${props.size}px`,
        translate: `${(pos()[0] % BOARD_SIZE) * props.size}px ${(BOARD_SIZE - 1 - pos()[1]) * props.size}px`,
      }}
    />
  );
}
