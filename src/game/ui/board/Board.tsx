import { For, type Setter, createMemo } from "solid-js";
import { useGameContext } from "../../logic/provider/useGameContext.ts";
import * as types from "../../logic/types.ts";
import Piece from "../piece/Piece";
import { SelectedSquare } from "../square/Square";

import "./board.css";

type BoardProps = {
  bounds?: DOMRectReadOnly;
  ref: Setter<HTMLElement | undefined>;
};

export default function Board(props: BoardProps) {
  const { state } = useGameContext();
  const pieces = createMemo<types.Pieces>(() => state.pieces);

  return (
    <div class="board" ref={props.ref}>
      <For each={[...pieces()]} fallback={<div>Loading...</div>}>
        {([key, piece]) => (
          <Piece key={key} piece={piece} bounds={props.bounds} />
        )}
      </For>
      <SelectedSquare />
    </div>
  );
}
