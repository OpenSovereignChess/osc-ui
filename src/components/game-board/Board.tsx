import { For, createEffect, createSignal } from "solid-js";
import Square from "./Square.tsx";

export default function Board() {
  const [el, setEl] = createSignal<HTMLElement>();

  createEffect(() => console.log("board", el()?.clientWidth, el()?.clientHeight));

  return (
    <div
      ref={setEl}
      style="background-color: cyan"
    >
      <For each={Array(256)}>
        {(item) => <Square index={item}  />}
      </For>
    </div>
  );
}
