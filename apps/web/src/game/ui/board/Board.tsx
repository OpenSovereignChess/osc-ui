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
  const draggingPiece = createMemo(() => {
    const current = snapshot().draggableCurrent;
    return current
      ? {
          key: current.orig,
          pos: current.pos,
        }
      : undefined;
  });

  return (
    <BoardView
      boardRef={props.ref}
      bounds={props.bounds}
      draggingPiece={draggingPiece()}
      fallback={<div>Loading...</div>}
      orientation={snapshot().orientation}
      pieces={snapshot().pieces}
      selectedKey={snapshot().selected}
    />
  );
}
