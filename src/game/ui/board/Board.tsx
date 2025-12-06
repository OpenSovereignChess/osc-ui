import { For, createEffect, createSignal } from "solid-js";
import * as fen from "../../logic/fen.ts";
import { type State } from "../../logic/state.ts";
import * as types from "../../logic/types.ts";
import { event2Key } from "../../logic/util.ts";
import Piece from "../piece/Piece";
import Square from "../square/Square";

import "./board.css";

type BoardProps = {
  state: State;
};

export default function Board(props: BoardProps) {
  const [el, setEl] = createSignal<HTMLElement>();
  const [bounds, setBounds] = createSignal<DOMRectReadOnly>();
  const [pieces] = createSignal<types.Pieces>(fen.read(fen.initial));
  const [selectedSquare, setSelectedSquare] = createSignal<types.Key>();

  createEffect(() => {
    //console.log("board", el()?.clientWidth, el()?.clientHeight);
    if (el()) {
      const bounds = el()!.getBoundingClientRect();
      setBounds(bounds);
    }
  });

  const handleClick = (e: MouseEvent) => {
    if (!el()) {
      return;
    }
    const key = event2Key(e, bounds()!);
    //console.log("Clicked key", key);
    setSelectedSquare(key);
  };

  return (
    <div ref={setEl} class="board" onClick={handleClick}>
      {selectedSquare() && <Square key={selectedSquare()!} bounds={bounds()} />}
      <For each={[...pieces()]} fallback={<div>Loading...</div>}>
        {([key, piece]) => <Piece key={key} piece={piece} bounds={bounds()} />}
      </For>
    </div>
  );
}
