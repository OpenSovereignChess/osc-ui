import { type Setter, createMemo } from "solid-js";
import { BoardView } from "@osc/board-solid";
import { useGameSession } from "../../session/useGameSession.ts";
import type * as types from "../../rules/types.ts";

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
      canDragPiece={(key) =>
        session.getState().interaction.draggable.enabled &&
        session.board.canSelect(session.getState(), key as types.Key)
      }
      canMove={(orig, dest) =>
        session.board.canMove(
          session.getState(),
          orig as types.Key,
          dest as types.Key,
        )
      }
      fallback={<div>Loading...</div>}
      onMovePiece={(orig, dest) => {
        session.board.movePiece(
          session.getState(),
          orig as types.Key,
          dest as types.Key,
        );
      }}
      onSelectSquare={(key) => {
        session.board.selectSquare(session.getState(), key as types.Key);
      }}
      orientation={snapshot().orientation}
      pieces={snapshot().pieces}
      selectedKey={snapshot().selected}
      viewOnly={session.getInteraction().viewOnly}
    />
  );
}
