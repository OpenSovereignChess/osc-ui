import { For, type JSX, type Setter } from "solid-js";
import PieceSprite from "./PieceSprite.tsx";
import HighlightSquare from "./HighlightSquare.tsx";
import type { BoardKey, BoardOrientation, BoardPiece } from "./types.ts";

import "./styles/board.css";

type BoardViewProps = {
  boardRef?: Setter<HTMLElement | undefined>;
  bounds?: DOMRectReadOnly;
  fallback?: JSX.Element;
  orientation: BoardOrientation;
  pieces: Iterable<[BoardKey, BoardPiece]>;
  selectedKey?: BoardKey;
};

export default function BoardView(props: BoardViewProps) {
  return (
    <div class="board" ref={props.boardRef}>
      <For each={[...props.pieces]} fallback={props.fallback}>
        {([key, piece]) => (
          <PieceSprite
            bounds={props.bounds}
            key={key}
            orientation={props.orientation}
            piece={piece}
          />
        )}
      </For>
      <HighlightSquare
        bounds={props.bounds}
        colorClass="bg-red"
        key={props.selectedKey}
        orientation={props.orientation}
      />
    </div>
  );
}
