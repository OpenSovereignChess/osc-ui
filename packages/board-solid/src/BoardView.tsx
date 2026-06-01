import {
  For,
  createEffect,
  createMemo,
  createSignal,
  onCleanup,
  type JSX,
  type Setter,
} from "solid-js";
import PieceSprite from "./PieceSprite.tsx";
import HighlightSquare from "./HighlightSquare.tsx";
import {
  DRAG_INTENT_DISTANCE_SQUARED,
  changedTouchPosition,
  eventPosition,
  getKeyAtDomPos,
  hasDragIntent as detectDragIntent,
  isRightButton,
  shouldCancelSameSquareDrop,
} from "@osc/board-core";
import type {
  BoardKey,
  BoardOrientation,
  BoardPointerEvent,
  BoardPiece,
  DraggingPiece,
  NumberPair,
} from "@osc/board-core";

import "./styles/board.css";

type BoardViewProps = {
  boardRef?: Setter<HTMLElement | undefined>;
  bounds?: DOMRectReadOnly;
  canDragPiece?: (key: BoardKey, piece: BoardPiece) => boolean;
  canMove?: (orig: BoardKey, dest: BoardKey) => boolean;
  fallback?: JSX.Element;
  onCancelDrag?: (key: BoardKey) => void;
  onMovePiece?: (orig: BoardKey, dest: BoardKey) => void;
  onSelectSquare?: (key: BoardKey) => void;
  orientation: BoardOrientation;
  pieces: Iterable<[BoardKey, BoardPiece]>;
  selectedKey?: BoardKey;
  viewOnly?: boolean;
};

export default function BoardView(props: BoardViewProps) {
  let boardEl: HTMLElement | undefined;
  const [draggingPiece, setDraggingPiece] = createSignal<DraggingPiece>();
  const [dragStartPosition, setDragStartPosition] = createSignal<NumberPair>();
  const [hasDragIntent, setHasDragIntent] = createSignal(false);
  const [dropTargetKey, setDropTargetKey] = createSignal<BoardKey>();
  const pieces = createMemo(() => new Map([...props.pieces]));

  const setBoardRef = (el: HTMLElement) => {
    boardEl = el;
    props.boardRef?.(el);
  };

  const canDrag = (key: BoardKey, piece: BoardPiece): boolean =>
    props.canDragPiece?.(key, piece) ?? true;

  const beginDrag = (
    key: BoardKey,
    piece: BoardPiece,
    pos: NumberPair,
  ) => {
    if (!canDrag(key, piece)) {
      return;
    }
    setDraggingPiece({ key, pos });
    setDragStartPosition(pos);
    setHasDragIntent(false);
    setDropTargetFromPosition(pos);
    bindDocument();
  };

  const setDropTargetFromPosition = (pos: NumberPair) => {
    if (!props.bounds) {
      setDropTargetKey(undefined);
      return;
    }

    setDropTargetKey(getKeyAtDomPos(pos, props.orientation, props.bounds));
  };

  const clearDragState = () => {
    setDropTargetKey(undefined);
    setDraggingPiece(undefined);
    setDragStartPosition(undefined);
    setHasDragIntent(false);
  };

  const onStart = (e: BoardPointerEvent) => {
    if (props.viewOnly || !props.bounds) {
      return;
    }
    if (!e.isTrusted || isRightButton(e) || e.shiftKey) {
      return;
    }
    if (e.buttons !== undefined && e.buttons > 1) {
      return;
    }
    if (e.touches && e.touches.length > 1) {
      return;
    }

    const pos = eventPosition(e);
    if (!pos) {
      return;
    }

    const key = getKeyAtDomPos(pos, props.orientation, props.bounds);
    if (!key) {
      return;
    }

    const piece = pieces().get(key);
    if (e.cancelable !== false && (!e.touches || piece || props.selectedKey)) {
      e.preventDefault();
    } else if (e.touches) {
      return;
    }

    if (
      props.selectedKey &&
      props.selectedKey !== key &&
      props.canMove?.(props.selectedKey, key)
    ) {
      props.onMovePiece?.(props.selectedKey, key);
      return;
    }

    props.onSelectSquare?.(key);
    if (piece) {
      beginDrag(key, piece, pos);
    }
  };

  const bindDocument = () => {
    const onMove = (e: BoardPointerEvent) => {
      const pos = eventPosition(e);
      if (!pos) {
        return;
      }
      if (e.cancelable !== false) {
        e.preventDefault();
      }
      const startPosition = dragStartPosition();
      if (startPosition) {
        if (detectDragIntent(startPosition, pos, DRAG_INTENT_DISTANCE_SQUARED)) {
          setHasDragIntent(true);
        }
      }
      setDropTargetFromPosition(pos);
      setDraggingPiece((current) => (current ? { ...current, pos } : current));
    };

    const onEnd = (e: BoardPointerEvent) => {
      cleanup();
      const current = draggingPiece();
      const pos = eventPosition(e) ?? changedTouchPosition(e) ?? current?.pos;
      if (!current || !pos || !props.bounds) {
        clearDragState();
        return;
      }

      const dest = getKeyAtDomPos(pos, props.orientation, props.bounds);
      if (dest && dest !== current.key) {
        props.onMovePiece?.(current.key, dest);
      } else if (
        shouldCancelSameSquareDrop(current.key, dest, hasDragIntent())
      ) {
        props.onCancelDrag?.(current.key);
      }
      clearDragState();
    };

    const onCancel = () => {
      cleanup();
      clearDragState();
    };

    const cleanup = () => {
      document.removeEventListener("mousemove", onMove as EventListener);
      document.removeEventListener("mouseup", onEnd as EventListener);
      document.removeEventListener("touchmove", onMove as EventListener);
      document.removeEventListener("touchend", onEnd as EventListener);
      document.removeEventListener("touchcancel", onCancel);
    };

    document.addEventListener("mousemove", onMove as EventListener, {
      passive: false,
    });
    document.addEventListener("mouseup", onEnd as EventListener);
    document.addEventListener("touchmove", onMove as EventListener, {
      passive: false,
    });
    document.addEventListener("touchend", onEnd as EventListener);
    document.addEventListener("touchcancel", onCancel);
  };

  createEffect(() => {
    if (!boardEl || props.viewOnly) {
      return;
    }
    boardEl.addEventListener("touchstart", onStart as EventListener, {
      passive: false,
    });
    boardEl.addEventListener("mousedown", onStart as EventListener, {
      passive: false,
    });

    onCleanup(() => {
      boardEl?.removeEventListener("touchstart", onStart as EventListener);
      boardEl?.removeEventListener("mousedown", onStart as EventListener);
    });
  });

  return (
    <div class="board" ref={setBoardRef}>
      <For each={[...props.pieces]} fallback={props.fallback}>
        {([key, piece]) => (
          <PieceSprite
            bounds={props.bounds}
            dragPosition={
              draggingPiece()?.key === key ? draggingPiece()?.pos : undefined
            }
            dragging={draggingPiece()?.key === key}
            key={key}
            orientation={props.orientation}
            piece={piece}
          />
        )}
      </For>
      <HighlightSquare
        bounds={props.bounds}
        colorClass="selected"
        key={props.selectedKey}
        orientation={props.orientation}
      />
      <HighlightSquare
        bounds={props.bounds}
        colorClass={`drop-target${
          dropTargetKey() && pieces().has(dropTargetKey()!) ? " occupied" : ""
        }`}
        key={dropTargetKey()}
        orientation={props.orientation}
      />
    </div>
  );
}
