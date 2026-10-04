import {
  For,
  Show,
  createEffect,
  createMemo,
  createSignal,
  onCleanup,
  onMount,
} from "solid-js";
import { key2pos, posToTranslate } from "@osc/board-solid";
import { useGameSession } from "../../session/useGameSession.ts";
import { BOARD_SIZE } from "../../rules/constants.ts";
import * as types from "../../rules/types.ts";
import * as util from "../../rules/util.ts";
import Board from "../board/Board.tsx";
import Coords from "../coords/Coords.tsx";
import BoardPlayControls from "../play-controls/BoardPlayControls.tsx";
import ColorControlMatrix from "../tactical-dock/ColorControlMatrix.tsx";
import GameTelemetryStrip from "../telemetry/GameTelemetryStrip.tsx";
import { clockTextForPlayer } from "../../session/boardTelemetry.ts";

import "../tactical-dock/tactical-dock.css";
import "./container.css";

function updateBounds(
  bounds: DOMRectReadOnly,
  containerEl: HTMLElement,
): DOMRectReadOnly {
  const edgeSize = Math.min(bounds.width, bounds.height);
  const width =
    (Math.floor((edgeSize * window.devicePixelRatio) / BOARD_SIZE) *
      BOARD_SIZE) /
    window.devicePixelRatio;
  const height = width;
  containerEl.style.width = `${width}px`;
  containerEl.style.height = `${height}px`;
  return containerEl.getBoundingClientRect();
}

type ContainerProps = {
  showBoardTelemetry?: boolean;
  showControls?: boolean;
};

export default function Container(props: ContainerProps) {
  const [wrapEl, setWrapEl] = createSignal<HTMLElement>();
  const [containerEl, setContainerEl] = createSignal<HTMLElement>();
  const [boardEl, setBoardEl] = createSignal<HTMLElement>();
  const [bounds, setBounds] = createSignal<DOMRectReadOnly>();
  const [domRegistered, setDomRegistered] = createSignal<boolean>(false);
  const [clockNow, setClockNow] = createSignal(Date.now());
  const session = useGameSession();
  const showControls = () => props.showControls ?? true;
  const showBoardTelemetry = () => props.showBoardTelemetry ?? false;
  const boardTelemetry = createMemo(() => session.getBoardTelemetry());
  const telemetryStripStyle = createMemo(() => {
    const boardBounds = bounds();
    return boardBounds ? { width: `${boardBounds.width}px` } : undefined;
  });
  const promotionPickerStyle = createMemo(() => {
    const pending = session.getPendingPromotion();
    const boardBounds = bounds();
    if (!pending || !boardBounds) {
      return undefined;
    }

    const squareSize = boardBounds.width / BOARD_SIZE;
    const [x, y] = posToTranslate(boardBounds)(
      key2pos(pending.dest),
      session.getSnapshot().orientation,
    );
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

  // TODO: We need to update bounds on state.dom.bounds when we call updateBounds
  createEffect(() => {
    const wrap = wrapEl();
    const container = containerEl();
    if (!wrap || !container) {
      return;
    }

    const refreshBounds = (sourceBounds = wrap.getBoundingClientRect()) => {
      setBounds(updateBounds(sourceBounds, container));
    };

    refreshBounds();
    const animationFrame = window.requestAnimationFrame(() => refreshBounds());

    let resizeObserver: ResizeObserver | undefined;
    if ("ResizeObserver" in window) {
      resizeObserver = new ResizeObserver((entries) => {
        refreshBounds(entries[0]?.contentRect);
      });
      resizeObserver.observe(wrap);
    }

    onCleanup(() => {
      window.cancelAnimationFrame(animationFrame);
      resizeObserver?.disconnect();
    });
  });

  createEffect(() => {
    if (domRegistered() || !wrapEl() || !containerEl() || !boardEl()) {
      return;
    }

    const dom: types.Dom = {
      elements: {
        board: boardEl()!,
        container: containerEl()!,
        wrap: wrapEl()!,
      },
      bounds: util.memo(() => bounds()!),
    };

    session.setDom(dom);
    setDomRegistered(true);
  });

  onMount(() => {
    const onFlipBoard = (): void => session.flipOrientation();
    window.addEventListener("osc:flip-board", onFlipBoard);
    const clockInterval = showBoardTelemetry()
      ? window.setInterval(() => setClockNow(Date.now()), 1000)
      : undefined;
    onCleanup(() => {
      if (clockInterval !== undefined) {
        window.clearInterval(clockInterval);
      }
      window.removeEventListener("osc:flip-board", onFlipBoard);
    });
  });

  const clockFor = (side: "player1" | "player2") =>
    clockTextForPlayer(boardTelemetry(), side, clockNow());

  const BoardSurface = () => (
    <div class="wrap" ref={setWrapEl}>
      <div class="sc-container" ref={setContainerEl}>
        <Board ref={setBoardEl} bounds={bounds()} />
        <Show when={session.getPendingPromotion() && promotionPickerStyle()}>
          {(style) => (
            <div
              aria-label="Choose promotion piece"
              class="play-promotion-picker"
              role="dialog"
              style={style()}
            >
              <For each={session.getPendingPromotion()!.roles}>
                {(role) => (
                  <button
                    aria-label={`Promote to ${role}`}
                    onPointerDown={(event) => {
                      event.preventDefault();
                      event.stopPropagation();
                      session.promote(role);
                    }}
                    type="button"
                  >
                    <span
                      aria-hidden="true"
                      class={`play-promotion-piece piece ${role} ${
                        session.getPendingPromotion()!.piece.color
                      }`}
                    />
                  </button>
                )}
              </For>
            </div>
          )}
        </Show>
        <Coords />
      </div>
    </div>
  );

  return (
    <>
      <div
        class={`game-board-shell${showControls() ? "" : " game-board-shell--board-only"}`}
      >
        {showBoardTelemetry() ? (
          <div class="game-board-stack">
            <div class="game-board-telemetry-row" style={telemetryStripStyle()}>
              <GameTelemetryStrip
                active={boardTelemetry().top.side === boardTelemetry().turn}
                ariaLabel="Opponent board telemetry"
                clock={clockFor(boardTelemetry().top.side)}
                player={boardTelemetry().top}
              />
            </div>
            <BoardSurface />
            <div class="game-board-telemetry-row" style={telemetryStripStyle()}>
              <GameTelemetryStrip
                active={boardTelemetry().bottom.side === boardTelemetry().turn}
                ariaLabel="Current player board telemetry"
                clock={clockFor(boardTelemetry().bottom.side)}
                player={boardTelemetry().bottom}
              />
            </div>
          </div>
        ) : (
          <BoardSurface />
        )}
        <Show when={showControls()}>
          <aside
            class="game-board-controls game-tactical-dock"
            aria-label="Dock and telemetry"
          >
            <section
              class="game-tactical-dock__panel"
              aria-label="Color control matrix"
            >
              <div class="game-tactical-dock__heading">
                <div>
                  <p class="eyebrow">Color control</p>
                  <h2>12-regime matrix</h2>
                </div>
              </div>
              <ColorControlMatrix />
            </section>
            <section
              class="game-tactical-dock__panel"
              aria-label="Move actions"
            >
              <div class="game-tactical-dock__heading">
                <div>
                  <p class="eyebrow">Move controls</p>
                  <h2>Special actions</h2>
                </div>
              </div>
              <BoardPlayControls
                castleActions={session.getCastleActions().map((option) => ({
                  label: option.label,
                  onClick: () => session.submitAction(option.action),
                }))}
                defectActions={session.getDefectActions().map((option) => ({
                  label: option.label,
                  onClick: () => session.submitAction(option.action),
                }))}
              />
            </section>
            <section
              class="game-tactical-dock__panel play-history"
              aria-label="Move history"
            >
              <div class="game-tactical-dock__heading play-history-header">
                <div>
                  <p class="eyebrow">Notation</p>
                  <h2>Move log</h2>
                </div>
              </div>
              <ol class="play-history-list">
                <For each={session.getHistoryTurns()}>
                  {(turn) => (
                    <li>
                      <span class="play-history-turn">{turn.number}.</span>
                      <span>{turn.first?.san}</span>
                      <span>{turn.second?.san}</span>
                    </li>
                  )}
                </For>
              </ol>
              <Show when={session.getHistoryTurns().length === 0}>
                <p class="play-history-empty">No moves yet.</p>
              </Show>
            </section>
            {/*
          <section
            class="game-tactical-dock__panel"
            aria-label="Contextual inspector"
          >
            <div class="game-tactical-dock__heading">
              <div>
                <p class="eyebrow">Inspector</p>
                <h2>Rule helper</h2>
              </div>
            </div>
            <p class="game-inspector-card">
              Select a square or control to inspect legal mechanics. Regimes use
              color, pattern, and two-letter codes.
            </p>
          </section>
          */}
          </aside>
        </Show>
      </div>
    </>
  );
}
