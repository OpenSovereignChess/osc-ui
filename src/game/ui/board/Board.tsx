import { For, type Setter, createSignal } from "solid-js";
import * as fen from "../../logic/fen.ts";
import * as types from "../../logic/types.ts";
import Piece from "../piece/Piece";
import { SelectedSquare } from "../square/Square";

import "./board.css";

type BoardProps = {
  bounds?: DOMRectReadOnly;
  ref: Setter<HTMLElement | undefined>;
};

export default function Board(props: BoardProps) {
  const [pieces] = createSignal<types.Pieces>(fen.read(fen.initial));

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
