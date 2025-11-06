import { createSignal } from "solid-js";

export default function Board() {
  const [count, setCount] = createSignal(0);

  return <div onClick={() => setCount(count() + 1)}>board {count()}</div>;
}
