import { For, createEffect, createSignal } from "solid-js";
import "./styles/board.css";
import { BOARD_SIZE } from "../logic/constants.ts";
import * as fen from "../logic/fen.ts";
import * as types from "../logic/types.ts";
import Piece from "./Piece";

export default function Board() {
  const [el, setEl] = createSignal<HTMLElement>();
  const [size, setSize] = createSignal<number>(0);
  const [height, setHeight] = createSignal<number>(0);
  const [pieces, _] = createSignal<types.Pieces>(fen.read(fen.initial));

  createEffect(() => {
    console.log("board", el()?.clientWidth, el()?.clientHeight);
    if (el()) {
      setSize((el()?.clientWidth || 0) / BOARD_SIZE);
      setHeight(el()?.clientWidth || 0);
    }
  });

  return (
    <div
      ref={setEl}
      class="board relative w-full"
      style={{
        height: height() + "px",
      }}
    >
      <For each={[...pieces()]} fallback={<div>Loading...</div>}>
        {([key, piece]) => <Piece key={key} piece={piece} size={size()} />}
      </For>
    </div>
  );
}
