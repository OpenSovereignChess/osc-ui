import { createMemo } from "solid-js";
import { key2pos, posToTranslate } from "../../logic/util.ts";
import * as types from "../../logic/types.ts";

import "./piece.generated.css";
import "./piece.css";

type PieceProps = {
  key: types.Key;
  piece: types.Piece;
  bounds?: DOMRectReadOnly;
};

export default function Piece(props: PieceProps) {
  const offset = createMemo<types.NumberPair | null>(() => {
    if (!props.key || !props.bounds) {
      return null;
    }
    const pos = key2pos(props.key);
    const translate = posToTranslate(props.bounds);
    const offset = translate(pos);
    console.log("piece", props.key, offset);
    return offset;
  });

  return (
    <div
      class={`piece text-xs ${props.piece.role} ${props.piece.color}`}
      style={{
        transform: offset()
          ? `translate(${offset()![0]}px, ${offset()![1]}px)`
          : undefined,
      }}
    >
      {props.key} {props.piece.color.charAt(0)}
      {props.piece.role.charAt(0)}
    </div>
  );
}
