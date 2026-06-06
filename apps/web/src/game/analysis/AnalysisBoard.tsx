import { BoardView } from "@osc/board-solid";
import {
  moveSan,
  Setup,
  SovereignChess,
  initialFEN,
  normalMove,
  squareFromName,
  squareName,
  type Piece,
  type Position,
} from "@osc/rules";
import { For, createEffect, createMemo, createSignal, onCleanup } from "solid-js";
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

interface HistoryMove {
  readonly san: string;
  readonly from: types.Key;
  readonly to: types.Key;
}

export default function AnalysisBoard() {
  const [stageEl, setStageEl] = createSignal<HTMLElement>();
  const [containerEl, setContainerEl] = createSignal<HTMLElement>();
  const [bounds, setBounds] = createSignal<DOMRectReadOnly>();
  const [positions, setPositions] = createSignal<Position[]>([initialPosition()]);
  const [moves, setMoves] = createSignal<HistoryMove[]>([]);
  const [currentIndex, setCurrentIndex] = createSignal(0);
  const [selectedKey, setSelectedKey] = createSignal<types.Key>();

  const position = createMemo(() => positions()[currentIndex()] ?? positions()[0]);
  const pieces = createMemo(() => piecesFromPosition(position()));
  const isLatest = createMemo(() => currentIndex() === positions().length - 1);

  const legalDestinations = createMemo<types.Key[]>(() => {
    const selected = selectedKey();
    if (!selected || !isLatest()) {
      return [];
    }

    return [...position().legalMovesOf(squareFromName(selected)).squares()].map(
      (square) => squareName(square) as types.Key,
    );
  });

  const canSelect = (key: types.Key, piece: Piece): boolean =>
    isLatest() &&
    position().board.colorBelongsTo(position().turn, piece.color) &&
    position().legalMovesOf(squareFromName(key)).isNotEmpty;

  const canMove = (orig: types.Key, dest: types.Key): boolean =>
    isLatest() &&
    legalDestinations().includes(dest) && selectedKey() === orig;

  const movePiece = (orig: types.Key, dest: types.Key): void => {
    if (!canMove(orig, dest)) {
      setSelectedKey(undefined);
      return;
    }

    const move = normalMove(orig, dest);
    const current = position();
    const next = current.play(move);
    setPositions((history) => [...history, next]);
    setMoves((history) => [
      ...history,
      { san: moveSan(current, move), from: orig, to: dest },
    ]);
    setCurrentIndex((index) => index + 1);
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
    currentIndex();
    setSelectedKey(undefined);
  });

  createEffect(() => {
    const stage = stageEl();
    const container = containerEl();
    if (!stage || !container) {
      return;
    }

    const resize = (bounds: DOMRectReadOnly) => {
      setBounds(updateBounds(bounds, container));
    };

    resize(stage.getBoundingClientRect());

    if (!("ResizeObserver" in window)) {
      return;
    }

    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (entry) {
        resize(entry.contentRect);
      }
    });
    observer.observe(stage);
    onCleanup(() => observer.disconnect());
  });

  const goToFirst = () => setCurrentIndex(0);
  const goToPrevious = () => setCurrentIndex((index) => Math.max(0, index - 1));
  const goToNext = () =>
    setCurrentIndex((index) => Math.min(positions().length - 1, index + 1));
  const goToLast = () => setCurrentIndex(positions().length - 1);

  return (
    <div class="analysis-board-shell wrap">
      <div class="analysis-board-wrap">
        <div class="analysis-board-stage" ref={setStageEl}>
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

        <aside class="analysis-history" aria-label="Move history">
          <div class="analysis-history-header">
            <h2>Move history</h2>
            <span>{moves().length} moves</span>
          </div>

          <div class="analysis-history-controls">
            <button
              aria-label="Go to first move"
              disabled={currentIndex() === 0}
              onClick={goToFirst}
              type="button"
            >
              &lt;&lt;
            </button>
            <button
              aria-label="Go to previous move"
              disabled={currentIndex() === 0}
              onClick={goToPrevious}
              type="button"
            >
              &lt;
            </button>
            <button
              aria-label="Go to next move"
              disabled={isLatest()}
              onClick={goToNext}
              type="button"
            >
              &gt;
            </button>
            <button
              aria-label="Go to last move"
              disabled={isLatest()}
              onClick={goToLast}
              type="button"
            >
              &gt;&gt;
            </button>
          </div>

          <ol class="analysis-history-list">
            <For each={moves()}>
              {(move, index) => (
                <li
                  classList={{
                    active: currentIndex() === index() + 1,
                    future: currentIndex() < index() + 1,
                  }}
                >
                  <button
                    onClick={() => setCurrentIndex(index() + 1)}
                    type="button"
                  >
                    <span class="analysis-history-ply">{index() + 1}.</span>
                    <span class="analysis-history-san">{move.san}</span>
                    <span class="analysis-history-coords">
                      {move.from}-{move.to}
                    </span>
                  </button>
                </li>
              )}
            </For>
          </ol>

          {moves().length === 0 && (
            <p class="analysis-history-empty">No moves yet.</p>
          )}
        </aside>
      </div>
    </div>
  );
}
