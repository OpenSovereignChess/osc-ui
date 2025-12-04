import { For, createEffect, createSignal } from "solid-js";
import { BOARD_SIZE } from "../../logic/constants.ts";
import * as fen from "../../logic/fen.ts";
import * as types from "../../logic/types.ts";
import { event2Key } from "../../logic/util.ts";
import Piece from "../piece/Piece";
import Square from "../square/Square";

import "./board.css";

export default function Board() {
  const [el, setEl] = createSignal<HTMLElement>();
  const [bounds, setBounds] = createSignal<DOMRectReadOnly>();
  const [size, setSize] = createSignal<number>(0);
  const [height, setHeight] = createSignal<number>(0);
  const [pieces] = createSignal<types.Pieces>(fen.read(fen.initial));
  const [selectedSquare, setSelectedSquare] = createSignal<types.Key>();

  createEffect(() => {
    //console.log("board", el()?.clientWidth, el()?.clientHeight);
    if (el()) {
      const bounds = el()!.getBoundingClientRect();
      setBounds(bounds);
      setSize(bounds.width / BOARD_SIZE);
      setHeight(bounds.width);
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
    <div
      ref={setEl}
      class="board relative w-full"
      style={{
        height: height() + "px",
      }}
      onClick={handleClick}
    >
      {selectedSquare() && <Square key={selectedSquare()!} size={size()} />}
      <For each={[...pieces()]} fallback={<div>Loading...</div>}>
        {([key, piece]) => <Piece key={key} piece={piece} size={size()} />}
      </For>
    </div>
  );
}
