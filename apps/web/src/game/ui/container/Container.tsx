import { For, Show, createEffect, createMemo, createSignal } from "solid-js";
import { key2pos, posToTranslate } from "@osc/board-solid";
import { useGameSession } from "../../session/useGameSession.ts";
import { BOARD_SIZE } from "../../rules/constants.ts";
import * as types from "../../rules/types.ts";
import * as util from "../../rules/util.ts";
import Board from "../board/Board.tsx";
import Coords from "../coords/Coords.tsx";
import BoardPlayControls from "../play-controls/BoardPlayControls.tsx";

import "./container.css";

function updateBounds(
  bounds: DOMRectReadOnly,
  containerEl: HTMLElement,
): DOMRectReadOnly {
  const edgeSize = Math.min(bounds.width, bounds.height);
  console.log("Updating container bounds size:", edgeSize);
  const width =
    (Math.floor((edgeSize * window.devicePixelRatio) / BOARD_SIZE) *
      BOARD_SIZE) /
    window.devicePixelRatio;
  const height = width;
  containerEl.style.width = `${width}px`;
  containerEl.style.height = `${height}px`;
  return containerEl.getBoundingClientRect();
}

export default function Container() {
  const [wrapEl, setWrapEl] = createSignal<HTMLElement>();
  const [containerEl, setContainerEl] = createSignal<HTMLElement>();
  const [boardEl, setBoardEl] = createSignal<HTMLElement>();
  const [bounds, setBounds] = createSignal<DOMRectReadOnly>();
  const [domRegistered, setDomRegistered] = createSignal<boolean>(false);
  const session = useGameSession();
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
    if (!wrapEl() || !containerEl()) {
      return;
    }

    // Set board element size
    const bounds = wrapEl()!.getBoundingClientRect();
    console.log(
      "Initial container bounds:",
      containerEl()!.getBoundingClientRect(),
    );
    updateBounds(bounds, containerEl()!);

    console.log(
      "Resulting container bounds:",
      containerEl()!.getBoundingClientRect(),
    );
    // Set bounds for Board and children components
    setBounds(containerEl()!.getBoundingClientRect());

    // Bind resize event handler
    if ("ResizeObserver" in window) {
      new ResizeObserver((entries) => {
        if (entries.length > 0) {
          const newBounds = entries[0].contentRect;
          console.log("ResizeObserver detected size change: ", newBounds);
          const updatedContainerBounds = updateBounds(
            newBounds,
            containerEl()!,
          );
          setBounds(updatedContainerBounds);
        }
      }).observe(wrapEl()!);
    }
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

  createEffect(() => {
    const gameState = session.getState();
    console.log(
      "Dom updated:",
      gameState.layout.dom,
      gameState.layout.dom?.elements.board,
    );
  });

  return (
    <>
      <div class="game-board-shell">
        <div class="wrap w-full h-full" ref={setWrapEl}>
          <div class="sc-container" ref={setContainerEl}>
            <Board ref={setBoardEl} bounds={bounds()} />
            <Show
              when={session.getPendingPromotion() && promotionPickerStyle()}
            >
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
        <aside class="game-board-controls">
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
          <section class="play-history" aria-label="Move history">
            <div class="play-history-header">
              <h2>Move history</h2>
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
        </aside>
      </div>
    </>
  );
}
