import { For, createEffect, createSignal } from "solid-js";
import Square from "./Square.tsx";

export default function Board() {
  const [el, setEl] = createSignal<HTMLElement>();
  const [size, setSize] = createSignal<number>(0);
  const [height, setHeight] = createSignal<number>(0);

  createEffect(() => {
    console.log("board", el()?.clientWidth, el()?.clientHeight);
    if (el()) {
      setSize((el()?.clientWidth || 0) / 16);
      setHeight(el()?.clientWidth || 0);
    }
  });

  return (
    <div
      ref={setEl}
      class="board relative w-full"
      style={{
        "background-color": "cyan",
        "height": height() + "px",
      }}
    >
      <For each={Array(256)}>
        {(_, index) => <Square index={index()} size={size()} />}
      </For>
    </div>
  );
}
