import { BoardView, key2pos, posToTranslate } from "@osc/board-solid";
import {
  castleSan,
  defectionSan,
  moveNotation,
  SovereignChess,
  initialFEN,
  normalMove,
  squareFromName,
  squareName,
  type Piece,
  type PieceColor,
  type Position,
  type Role,
  type Square,
} from "@osc/rules";
import {
  For,
  Show,
  createEffect,
  createMemo,
  createSignal,
  onCleanup,
} from "solid-js";
import { BOARD_SIZE } from "../rules/constants.ts";
import { readSetup } from "../rules/fen.ts";
import type * as types from "../rules/types.ts";
import BoardPlayControls, {
  type PlayControlAction,
} from "../ui/play-controls/BoardPlayControls.tsx";
import { promotionRolesForMove, type PromotionRequest } from "./promotion.ts";

import "../ui/container/container.css";
import "./analysis-board.css";

function initialPosition(): Position {
  return positionFromFen(initialFEN);
}

function positionFromFen(fen: string): Position {
  return SovereignChess.fromSetup(readSetup(fen));
}

function fenFromUrl(): string | undefined {
  if (typeof window === "undefined") {
    return undefined;
  }
  return new URL(window.location.href).searchParams.get("fen") ?? undefined;
}

function initialPositionFromUrl(): Position {
  const fen = fenFromUrl();
  if (!fen) {
    return initialPosition();
  }

  try {
    return positionFromFen(fen);
  } catch {
    return initialPosition();
  }
}

function positionUrl(pathname: string, fen: string): string {
  const params = new URLSearchParams({ fen });
  return `${pathname}?${params.toString()}`;
}

function replaceFenUrl(fen: string): void {
  if (typeof window === "undefined") {
    return;
  }
  window.history.replaceState(
    null,
    "",
    positionUrl(window.location.pathname, fen),
  );
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
}

interface HistoryTurn {
  readonly number: number;
  readonly first?: HistoryMove;
  readonly second?: HistoryMove;
}

export default function AnalysisBoard() {
  let promotionPickerEl: HTMLDivElement | undefined;
  let fenOutputEl: HTMLTextAreaElement | undefined;
  let historyListEl: HTMLOListElement | undefined;
  const [stageEl, setStageEl] = createSignal<HTMLElement>();
  const [containerEl, setContainerEl] = createSignal<HTMLElement>();
  const [bounds, setBounds] = createSignal<DOMRectReadOnly>();
  const rootPosition = initialPositionFromUrl();
  const [positions, setPositions] = createSignal<Position[]>([rootPosition]);
  const [moves, setMoves] = createSignal<HistoryMove[]>([]);
  const [currentIndex, setCurrentIndex] = createSignal(0);
  const [selectedKey, setSelectedKey] = createSignal<types.Key>();
  const [fenInput, setFenInput] = createSignal(rootPosition.fen);
  const [fenError, setFenError] = createSignal<string>();
  const [fenStatus, setFenStatus] = createSignal<string>();
  const [pendingPromotion, setPendingPromotion] =
    createSignal<PromotionRequest>();

  const position = createMemo(
    () => positions()[currentIndex()] ?? positions()[0],
  );
  const pieces = createMemo(() => piecesFromPosition(position()));
  const currentFen = createMemo(() => position().fen);
  const editPositionHref = createMemo(() =>
    positionUrl("/editor/", currentFen()),
  );
  const isLatest = createMemo(() => currentIndex() === positions().length - 1);
  const historyTurns = createMemo<HistoryTurn[]>(() => {
    const entries = moves();
    const turns: HistoryTurn[] = [];
    for (let index = 0; index < entries.length; index += 2) {
      turns.push({
        number: index / 2 + 1,
        first: entries[index],
        second: entries[index + 1],
      });
    }
    return turns;
  });
  const castleActions = createMemo<PlayControlAction[]>(() => {
    if (!isLatest()) {
      return [];
    }

    const current = position();
    const actions: PlayControlAction[] = [];
    for (const [from, destinations] of current.legalCastlingMoves) {
      for (const to of destinations.squares()) {
        const move = normalMove(squareName(from), squareName(to));
        actions.push({
          label: castleSan(current, move),
          onClick: () => playCastle(from, to),
        });
      }
    }
    return actions;
  });
  const defectActions = createMemo<PlayControlAction[]>(() => {
    if (!isLatest()) {
      return [];
    }

    const current = position();
    return [...current.controlledColors].map((color) => ({
      label: color,
      onClick: () => playDefection(color),
    }));
  });

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
    isLatest() && legalDestinations().includes(dest) && selectedKey() === orig;

  const playMove = (
    orig: types.Key,
    dest: types.Key,
    promotion?: Role,
  ): void => {
    const move = normalMove(orig, dest, promotion);
    const current = position();
    const next = current.play(move);
    setPositions((history) => [...history, next]);
    setMoves((history) => [...history, { san: moveNotation(current, move) }]);
    setCurrentIndex((index) => index + 1);
    setSelectedKey(undefined);
    setPendingPromotion(undefined);
  };

  const appendPosition = (next: Position, san: string): void => {
    setPositions((history) => [...history, next]);
    setMoves((history) => [...history, { san }]);
    setCurrentIndex((index) => index + 1);
    setSelectedKey(undefined);
    setPendingPromotion(undefined);
  };

  const playCastle = (from: Square, to: Square): void => {
    const current = position();
    const move = normalMove(squareName(from), squareName(to));
    appendPosition(current.playCastle(move), castleSan(current, move));
  };

  const playDefection = (color: PieceColor): void => {
    const current = position();
    appendPosition(current.defect(color), defectionSan(current, color));
  };

  const movePiece = (orig: types.Key, dest: types.Key): void => {
    if (!canMove(orig, dest)) {
      setSelectedKey(undefined);
      setPendingPromotion(undefined);
      return;
    }

    const roles = promotionRolesForMove(position(), orig, dest);
    if (roles.length > 0) {
      const piece = pieces().get(orig);
      if (piece) {
        setPendingPromotion({ orig, dest, piece, roles });
        setSelectedKey(undefined);
        return;
      }
    }

    playMove(orig, dest);
  };

  const promote = (role: Role): void => {
    const pending = pendingPromotion();
    if (!pending || !pending.roles.includes(role)) {
      setPendingPromotion(undefined);
      return;
    }

    playMove(pending.orig, pending.dest, role);
  };

  const cancelPromotion = (): void => {
    setPendingPromotion(undefined);
    setSelectedKey(undefined);
  };

  const selectSquare = (key: types.Key): void => {
    const selected = selectedKey();
    if (pendingPromotion()) {
      setPendingPromotion(undefined);
    }
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
    setPendingPromotion(undefined);
  });

  createEffect(() => {
    const index = currentIndex();
    const moveCount = moves().length;

    if (!historyListEl || index === 0 || index > moveCount) {
      return;
    }

    const activeMove = historyListEl.querySelector<HTMLElement>(
      `[data-history-index="${index}"]`,
    );
    if (!activeMove) {
      return;
    }

    const listRect = historyListEl.getBoundingClientRect();
    const activeRect = activeMove.getBoundingClientRect();
    if (activeRect.top < listRect.top) {
      historyListEl.scrollTop -= listRect.top - activeRect.top;
    } else if (activeRect.bottom > listRect.bottom) {
      historyListEl.scrollTop += activeRect.bottom - listRect.bottom;
    }
  });

  createEffect(() => {
    if (!pendingPromotion()) {
      return;
    }

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        cancelPromotion();
      }
    };

    const onPointerDown = (event: PointerEvent) => {
      if (
        promotionPickerEl &&
        event.target instanceof Node &&
        promotionPickerEl.contains(event.target)
      ) {
        return;
      }
      cancelPromotion();
    };

    document.addEventListener("keydown", onKeyDown);
    document.addEventListener("pointerdown", onPointerDown);
    onCleanup(() => {
      document.removeEventListener("keydown", onKeyDown);
      document.removeEventListener("pointerdown", onPointerDown);
    });
  });

  const promotionPickerStyle = createMemo(() => {
    const pending = pendingPromotion();
    const boardBounds = bounds();
    if (!pending || !boardBounds) {
      return undefined;
    }

    const squareSize = boardBounds.width / BOARD_SIZE;
    const [x, y] = posToTranslate(boardBounds)(key2pos(pending.dest), "white");
    const width = pending.roles.length * squareSize;
    const left = Math.min(
      Math.max(0, x - (width - squareSize) / 2),
      boardBounds.width - width,
    );
    const top = Math.min(Math.max(0, y), boardBounds.height - squareSize);

    return {
      "--promotion-square-size": `${squareSize}px`,
      left: `${left}px`,
      top: `${top}px`,
    };
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

  const loadFen = (): void => {
    try {
      const next = positionFromFen(fenInput());
      setPositions([next]);
      setMoves([]);
      setCurrentIndex(0);
      setSelectedKey(undefined);
      setPendingPromotion(undefined);
      setFenInput(next.fen);
      setFenError(undefined);
      setFenStatus("Position loaded.");
      replaceFenUrl(next.fen);
    } catch {
      setFenStatus(undefined);
      setFenError("Enter a valid Sovereign Chess FEN.");
    }
  };

  const copyFen = async (): Promise<void> => {
    const fen = currentFen();
    try {
      if (navigator.clipboard) {
        await navigator.clipboard.writeText(fen);
        setFenStatus("FEN copied.");
      } else {
        fenOutputEl?.select();
        setFenStatus("FEN selected for manual copy.");
      }
      setFenError(undefined);
    } catch {
      fenOutputEl?.select();
      setFenStatus(undefined);
      setFenError("Copy failed. The FEN is selected for manual copy.");
    }
  };

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
            >
              <Show when={pendingPromotion() && promotionPickerStyle()}>
                {(style) => (
                  <div
                    aria-label="Choose promotion piece"
                    class="analysis-promotion-picker"
                    onClick={(event) => event.stopPropagation()}
                    onMouseDown={(event) => event.stopPropagation()}
                    onPointerDown={(event) => event.stopPropagation()}
                    onTouchStart={(event) => event.stopPropagation()}
                    ref={promotionPickerEl}
                    role="dialog"
                    style={style()}
                  >
                    <For each={pendingPromotion()!.roles}>
                      {(role) => (
                        <button
                          aria-label={`Promote to ${role}`}
                          onClick={(event) => event.stopPropagation()}
                          onPointerDown={(event) => {
                            event.preventDefault();
                            event.stopPropagation();
                            promote(role);
                          }}
                          type="button"
                        >
                          <span
                            aria-hidden="true"
                            class={`analysis-promotion-piece piece ${role} ${
                              pendingPromotion()!.piece.color
                            }`}
                          />
                        </button>
                      )}
                    </For>
                  </div>
                )}
              </Show>
            </BoardView>
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

          <ol class="analysis-history-list" ref={historyListEl}>
            <For each={historyTurns()}>
              {(turn) => (
                <li>
                  <span class="analysis-history-turn">{turn.number}.</span>
                  {turn.first && (
                    <button
                      classList={{
                        active: currentIndex() === turn.number * 2 - 1,
                        future: currentIndex() < turn.number * 2 - 1,
                      }}
                      onClick={() => setCurrentIndex(turn.number * 2 - 1)}
                      data-history-index={turn.number * 2 - 1}
                      type="button"
                    >
                      {turn.first.san}
                    </button>
                  )}
                  {turn.second && (
                    <button
                      classList={{
                        active: currentIndex() === turn.number * 2,
                        future: currentIndex() < turn.number * 2,
                      }}
                      onClick={() => setCurrentIndex(turn.number * 2)}
                      data-history-index={turn.number * 2}
                      type="button"
                    >
                      {turn.second.san}
                    </button>
                  )}
                </li>
              )}
            </For>
          </ol>

          {moves().length === 0 && (
            <p class="analysis-history-empty">No moves yet.</p>
          )}

          <div class="analysis-play-controls-panel">
            <BoardPlayControls
              castleActions={castleActions()}
              defectActions={defectActions()}
            />
          </div>

          <div class="analysis-fen-panel" aria-label="Position FEN">
            <label for="analysis-current-fen">Current FEN</label>
            <textarea
              id="analysis-current-fen"
              readOnly
              ref={fenOutputEl}
              rows="3"
              value={currentFen()}
            />
            <div class="analysis-fen-actions">
              <button onClick={copyFen} type="button">
                Copy FEN
              </button>
              <a href={editPositionHref()}>Edit position</a>
            </div>
            <label for="analysis-load-fen">Load FEN</label>
            <textarea
              id="analysis-load-fen"
              onInput={(event) => {
                setFenInput(event.currentTarget.value);
                setFenError(undefined);
                setFenStatus(undefined);
              }}
              rows="3"
              value={fenInput()}
            />
            <button onClick={loadFen} type="button">
              Load FEN
            </button>
            <Show when={fenError()}>
              {(message) => (
                <p class="analysis-fen-message error">{message()}</p>
              )}
            </Show>
            <Show when={fenStatus()}>
              {(message) => <p class="analysis-fen-message">{message()}</p>}
            </Show>
          </div>
        </aside>
      </div>
    </div>
  );
}
