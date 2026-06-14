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
  const interaction = createMemo(() => session.getInteraction());

  return (
    <BoardView
      boardRef={props.ref}
      bounds={props.bounds}
      canDragPiece={(key) =>
        !interaction().dropmodeActive &&
        session.getState().interaction.draggable.enabled &&
        session.board.canSelect(session.getState(), key as types.Key)
      }
      canMove={(orig, dest) =>
        !interaction().dropmodeActive &&
        session.board.canMove(
          session.getState(),
          orig as types.Key,
          dest as types.Key,
        )
      }
      fallback={<div>Loading...</div>}
      onCancelDrag={() => {
        session.board.cancelDrag();
      }}
      onMovePiece={(orig, dest) => {
        const moved = session.board.movePiece(
          session.getState(),
          orig as types.Key,
          dest as types.Key,
        );
        if (moved) {
          session.onLocalMove?.({
            orig: orig as types.Key,
            dest: dest as types.Key,
          });
        }
      }}
      onSelectSquare={(key) => {
        if (interaction().dropmodeActive) {
          session.editor.applyDrop(key as types.Key);
          return;
        }
        const moved = session.board.selectSquare(
          session.getState(),
          key as types.Key,
        );
        if (moved) {
          session.onLocalMove?.(moved);
        }
      }}
      orientation={snapshot().orientation}
      pieces={snapshot().pieces}
      selectedKey={snapshot().selected}
      viewOnly={session.getInteraction().viewOnly}
    />
  );
}
