import { createMemo } from "solid-js";
import { key2pos, posToTranslate } from "./render.ts";
import type { BoardKey, BoardOrientation, BoardPiece, NumberPair } from "./types.ts";

import "./styles/piece.generated.css";
import "./styles/piece.css";

type PieceSpriteProps = {
  bounds?: DOMRectReadOnly;
  key: BoardKey;
  orientation: BoardOrientation;
  piece: BoardPiece;
};

export default function PieceSprite(props: PieceSpriteProps) {
  const offset = createMemo<NumberPair | null>(() => {
    if (!props.bounds) {
      return null;
    }

    const pos = key2pos(props.key);
    const translate = posToTranslate(props.bounds);
    return translate(pos, props.orientation);
  });

  return (
    <div
      class={`piece text-xs ${props.piece.role} ${props.piece.color}`}
      style={{
        transform: offset()
          ? `translate(${offset()![0]}px, ${offset()![1]}px)`
          : undefined,
      }}
    />
  );
}
