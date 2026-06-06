import { BoardView } from "@osc/board-solid";
import {
  Setup,
  SovereignChess,
  initialFEN,
  normalMove,
  squareFromName,
  squareName,
  type Piece,
  type Position,
} from "@osc/rules";
import { createEffect, createMemo, createSignal, onCleanup } from "solid-js";
import { BOARD_SIZE } from "../rules/constants.ts";
import type * as types from "../rules/types.ts";

import "../ui/container/container.css";
import "./analysis-board.css";

function initialPosition(): Position {
  return SovereignChess.fromSetup(Setup.parseFen(initialFEN));
}

function piecesFromPosition(position: Position): types.Pieces {
  const pieces: types.Pieces = new Map();
  for (const square of position.board.occupied.squares()) {
    const piece = position.board.pieceAt(square);
    if (piece) {
      pieces.set(squareName(square) as types.Key, piece);
    }
  }
  return pieces;
}

function updateBounds(
  bounds: DOMRectReadOnly,
  containerEl: HTMLElement,
): DOMRectReadOnly {
  const edgeSize = Math.min(bounds.width, bounds.height);
  const width =
    (Math.floor((edgeSize * window.devicePixelRatio) / BOARD_SIZE) *
      BOARD_SIZE) /
    window.devicePixelRatio;

  containerEl.style.width = `${width}px`;
  containerEl.style.height = `${width}px`;
  return containerEl.getBoundingClientRect();
}

export default function AnalysisBoard() {
  const [wrapEl, setWrapEl] = createSignal<HTMLElement>();
  const [containerEl, setContainerEl] = createSignal<HTMLElement>();
  const [bounds, setBounds] = createSignal<DOMRectReadOnly>();
  const [position, setPosition] = createSignal<Position>(initialPosition());
  const [selectedKey, setSelectedKey] = createSignal<types.Key>();

  const pieces = createMemo(() => piecesFromPosition(position()));

  const legalDestinations = createMemo<types.Key[]>(() => {
    const selected = selectedKey();
    if (!selected) {
      return [];
    }

    return [...position().legalMovesOf(squareFromName(selected)).squares()].map(
      (square) => squareName(square) as types.Key,
    );
  });

  const canSelect = (key: types.Key, piece: Piece): boolean =>
    position().board.colorBelongsTo(position().turn, piece.color) &&
    position().legalMovesOf(squareFromName(key)).isNotEmpty;

  const canMove = (orig: types.Key, dest: types.Key): boolean =>
    legalDestinations().includes(dest) && selectedKey() === orig;

  const movePiece = (orig: types.Key, dest: types.Key): void => {
    if (!canMove(orig, dest)) {
      setSelectedKey(undefined);
      return;
    }

    setPosition((current) => current.play(normalMove(orig, dest)));
    setSelectedKey(undefined);
  };

  const selectSquare = (key: types.Key): void => {
    const selected = selectedKey();
    if (selected && selected !== key && canMove(selected, key)) {
      movePiece(selected, key);
      return;
    }

    const piece = pieces().get(key);
    setSelectedKey(piece && canSelect(key, piece) ? key : undefined);
  };

  createEffect(() => {
    const wrap = wrapEl();
    const container = containerEl();
    if (!wrap || !container) {
      return;
    }

    const resize = (bounds: DOMRectReadOnly) => {
      setBounds(updateBounds(bounds, container));
    };

    resize(wrap.getBoundingClientRect());

    if (!("ResizeObserver" in window)) {
      return;
    }

    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (entry) {
        resize(entry.contentRect);
      }
    });
    observer.observe(wrap);
    onCleanup(() => observer.disconnect());
  });

  return (
    <div class="analysis-board-shell wrap" ref={setWrapEl}>
      <div class="analysis-board-wrap">
        <div class="sc-container" ref={setContainerEl}>
          <BoardView
            bounds={bounds()}
            canDragPiece={(key, piece) =>
              canSelect(key as types.Key, piece as Piece)
            }
            canMove={(orig, dest) =>
              canMove(orig as types.Key, dest as types.Key)
            }
            moveHintKeys={legalDestinations()}
            onCancelDrag={() => setSelectedKey(undefined)}
            onMovePiece={(orig, dest) =>
              movePiece(orig as types.Key, dest as types.Key)
            }
            onSelectSquare={(key) => selectSquare(key as types.Key)}
            orientation="white"
            pieces={pieces()}
            selectedKey={selectedKey()}
          />
        </div>
      </div>
    </div>
  );
}
