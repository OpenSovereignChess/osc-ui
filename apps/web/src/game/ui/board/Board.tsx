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
  const moveHintKeys = createMemo(() => {
    const selected = snapshot().selected;
    if (!selected) {
      return [];
    }
    return session.getState().position.movable.dests?.get(selected) ?? [];
  });

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
      moveHintKeys={moveHintKeys()}
      onCancelDrag={() => {
        session.board.cancelDrag();
      }}
      onMovePiece={(orig, dest) => {
        session.submitMove(orig as types.Key, dest as types.Key);
      }}
      onSelectSquare={(key) => {
        if (interaction().dropmodeActive) {
          session.editor.applyDrop(key as types.Key);
          return;
        }
        const selected = session.getState().interaction.selected;
        if (
          selected &&
          selected !== key &&
          session.board.canMove(session.getState(), selected, key as types.Key)
        ) {
          session.submitMove(selected, key as types.Key);
          return;
        }
        session.board.selectSquare(session.getState(), key as types.Key);
      }}
      orientation={snapshot().orientation}
      pieces={snapshot().pieces}
      selectedKey={snapshot().selected}
      viewOnly={session.getInteraction().viewOnly}
    />
  );
}
