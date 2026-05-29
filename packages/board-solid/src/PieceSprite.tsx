import { createMemo } from "solid-js";
import { key2pos, posToTranslate } from "./render.ts";
import type {
  BoardKey,
  BoardOrientation,
  BoardPiece,
  NumberPair,
} from "./types.ts";

import "./styles/piece.generated.css";
import "./styles/piece.css";

type PieceSpriteProps = {
  bounds?: DOMRectReadOnly;
  dragPosition?: NumberPair;
  dragging?: boolean;
  key: BoardKey;
  orientation: BoardOrientation;
  piece: BoardPiece;
};

export default function PieceSprite(props: PieceSpriteProps) {
  const offset = createMemo<NumberPair | null>(() => {
    if (!props.bounds) {
      return null;
    }

    if (props.dragPosition) {
      const squareSize = props.bounds.width / 16;
      return [
        props.dragPosition[0] - props.bounds.left - squareSize / 2,
        props.dragPosition[1] - props.bounds.top - squareSize / 2,
      ];
    }

    const pos = key2pos(props.key);
    const translate = posToTranslate(props.bounds);
    return translate(pos, props.orientation);
  });

  return (
    <div
      class={`piece text-xs ${props.piece.role} ${props.piece.color}${
        props.dragging ? " dragging" : ""
      }`}
      style={{
        transform: offset()
          ? `translate(${offset()![0]}px, ${offset()![1]}px)`
          : undefined,
      }}
    />
  );
}
