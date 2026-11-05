import {
  For,
  Show,
  createEffect,
  createMemo,
  createSignal,
  onCleanup,
  onMount,
} from "solid-js";
import { createBoardBounds } from "../board/createBoardBounds.ts";
import PromotionPicker from "../promotion/PromotionPicker.tsx";
import { useGameSession } from "../../session/useGameSession.ts";
import * as types from "../../rules/types.ts";
import * as util from "../../rules/util.ts";
import Board from "../board/Board.tsx";
import Coords from "../coords/Coords.tsx";
import BoardPlayControls from "../play-controls/BoardPlayControls.tsx";
import GamePanel from "../game-panel/GamePanel.tsx";
import GameTelemetryStrip from "../telemetry/GameTelemetryStrip.tsx";
import { clockTextForPlayer } from "../../session/boardTelemetry.ts";

import "./container.css";

type ContainerProps = {
  showBoardTelemetry?: boolean;
  showControls?: boolean;
};

export default function Container(props: ContainerProps) {
  const [wrapEl, setWrapEl] = createSignal<HTMLElement>();
  const [containerEl, setContainerEl] = createSignal<HTMLElement>();
  const [boardEl, setBoardEl] = createSignal<HTMLElement>();
  const bounds = createBoardBounds(wrapEl, containerEl);
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
      // TODO: Invalidate cached DOM bounds when the board resizes.
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
        <PromotionPicker
          bounds={bounds()}
          orientation={session.getSnapshot().orientation}
          request={session.getPendingPromotion()}
          onPromote={session.promote}
        />
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
          <GamePanel
            label="Game moves and actions"
            initialTabId="moves"
            tabs={[
              {
                id: "moves",
                label: "Moves",
                content: () => (
                  <section class="play-history" aria-label="Move history">
                    <ol class="play-history-list">
                      <For each={session.getHistoryTurns()}>
                        {(turn) => (
                          <li>
                            <span class="play-history-turn">
                              {turn.number}.
                            </span>
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
                ),
              },
              {
                id: "actions",
                label: "Actions",
                content: () => (
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
                ),
              },
            ]}
          />
        </Show>
      </div>
    </>
  );
}
