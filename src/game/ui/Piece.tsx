import { createMemo } from "solid-js";
import { BOARD_SIZE } from "../logic/constants.ts";
import { key2pos } from "../logic/util.ts";
import * as types from "../logic/types.ts";

type PieceProps = {
  key: types.Key;
  piece: types.Piece;
  size: number;
};

export default function Piece(props: PieceProps) {
  const pos = createMemo<types.Pos>(() => {
    const pos = key2pos(props.key);
    console.log("===Piece", props.key, pos);
    return pos;
  });

  return (
    <div
      class="square absolute top-0 left-0 text-xs"
      style={{
        height: `${props.size}px`,
        width: `${props.size}px`,
        translate: `${(pos()[0] % BOARD_SIZE) * props.size}px ${(BOARD_SIZE - 1 - pos()[1]) * props.size}px`,
      }}
    >
      {props.key} {props.piece.color.charAt(0)}
      {props.piece.role.charAt(0)}
    </div>
  );
}
