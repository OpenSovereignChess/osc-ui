import { type Setter, createMemo } from "solid-js";
import { BoardView } from "@osc/board-solid";
import { useGameSession } from "../../session/useGameSession.ts";

type BoardProps = {
  bounds?: DOMRectReadOnly;
  ref: Setter<HTMLElement | undefined>;
};

export default function Board(props: BoardProps) {
  const session = useGameSession();
  const snapshot = createMemo(() => session.getSnapshot());

  return (
    <BoardView
      boardRef={props.ref}
      bounds={props.bounds}
      fallback={<div>Loading...</div>}
      orientation={snapshot().orientation}
      pieces={snapshot().pieces}
      selectedKey={snapshot().selected}
    />
  );
}
