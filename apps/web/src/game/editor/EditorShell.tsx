import {
  For,
  Show,
  createEffect,
  createMemo,
  createSignal,
  onCleanup,
} from "solid-js";
import { getKeyAtDomPos } from "@osc/board-core";
import {
  colors,
  roles,
  type Color,
  type Key,
  type Piece,
  type Role,
} from "../rules/types.ts";
import { useGameSession } from "../session/useGameSession.ts";
import Container from "../ui/container/Container.tsx";

import "../../../../../packages/board-solid/src/styles/piece.generated.css";
import "./editor.css";

type PaletteDrag = {
  piece: Piece;
  pos: [number, number];
};

const roleLabels: Record<Role, string> = {
  bishop: "Bishop",
  king: "King",
  knight: "Knight",
  pawn: "Pawn",
  queen: "Queen",
  rook: "Rook",
};

const colorLabels: Record<Color, string> = {
  ash: "Ash",
  black: "Black",
  cyan: "Cyan",
  green: "Green",
  navy: "Navy",
  orange: "Orange",
  pink: "Pink",
  red: "Red",
  slate: "Slate",
  violet: "Violet",
  white: "White",
  yellow: "Yellow",
};

function samePiece(a?: Piece, b?: Piece): boolean {
  return !!a && !!b && a.color === b.color && a.role === b.role;
}

export default function EditorShell() {
  const session = useGameSession();
  const interaction = session.getInteraction;
  const snapshot = session.getSnapshot;
  const [paletteColor, setPaletteColor] = createSignal<Color>("white");
  const [paletteDrag, setPaletteDrag] = createSignal<PaletteDrag>();
  let cleanupPaletteDrag: (() => void) | undefined;

  onCleanup(() => {
    cleanupPaletteDrag?.();
  });

  createEffect(() => {
    const activePiece = interaction().dropmodePiece;
    if (activePiece) {
      setPaletteColor(activePiece.color);
    }
  });

  const activePiece = createMemo(() =>
    interaction().dropmodeActive ? interaction().dropmodePiece : undefined,
  );

  const eraseModeActive = createMemo(
    () => interaction().dropmodeActive && !interaction().dropmodePiece,
  );

  const activeToolLabel = createMemo(() => {
    if (eraseModeActive()) {
      return "Erase squares";
    }

    const piece = activePiece();
    if (piece) {
      return `${colorLabels[piece.color]} ${roleLabels[piece.role]}`;
    }

    return "Move existing pieces";
  });

  const applyDropAtClientPosition = (clientX: number, clientY: number) => {
    const dom = session.getState().layout.dom;
    if (!dom) {
      return false;
    }

    const key = getKeyAtDomPos(
      [clientX, clientY],
      snapshot().orientation,
      dom.bounds(),
    ) as Key | undefined;

    if (!key) {
      return false;
    }

    session.editor.applyDrop(key);
    return true;
  };

  const startPieceInteraction = (piece: Piece, event: PointerEvent) => {
    if (event.button !== 0) {
      return;
    }

    const startX = event.clientX;
    const startY = event.clientY;
    let dragged = false;

    const onMove = (moveEvent: PointerEvent) => {
      const distanceSquared =
        (moveEvent.clientX - startX) ** 2 + (moveEvent.clientY - startY) ** 2;
      if (!dragged && distanceSquared < 64) {
        return;
      }

      if (!dragged) {
        dragged = true;
        session.editor.setDropPiece(piece);
      }

      setPaletteDrag({
        piece,
        pos: [moveEvent.clientX, moveEvent.clientY],
      });
    };

    const onEnd = (endEvent: PointerEvent) => {
      cleanup();
      if (dragged) {
        applyDropAtClientPosition(endEvent.clientX, endEvent.clientY);
        setPaletteDrag(undefined);
        return;
      }

      session.editor.toggleDropPiece(piece);
    };

    const cleanup = () => {
      document.removeEventListener("pointermove", onMove);
      document.removeEventListener("pointerup", onEnd);
      document.removeEventListener("pointercancel", onEnd);
      cleanupPaletteDrag = undefined;
    };

    cleanupPaletteDrag?.();
    cleanupPaletteDrag = cleanup;

    document.addEventListener("pointermove", onMove);
    document.addEventListener("pointerup", onEnd);
    document.addEventListener("pointercancel", onEnd);
  };

  return (
    <section class="editor-shell">
      <aside class="editor-panel">
        <p class="editor-eyebrow">Position setup</p>
        <h1>Board editor</h1>
        <p class="editor-copy">
          Use the piece dock to stamp pieces onto any square. Tap a piece, then
          tap squares to place multiples, or drag directly from the dock onto
          the board.
        </p>
        <div class="editor-toolbar">
          <button
            class={`editor-tool${eraseModeActive() ? " active" : ""}`}
            type="button"
            onClick={() => session.editor.toggleEraseMode()}
          >
            Erase
          </button>
          <button
            class="editor-tool"
            type="button"
            onClick={() => session.editor.stopDropMode()}
          >
            Stop placing
          </button>
        </div>
        <div
          class="editor-color-strip"
          aria-label="Choose piece color"
          role="tablist"
        >
          <For each={colors}>
            {(color) => (
              <button
                aria-label={colorLabels[color]}
                class={`editor-color-swatch${paletteColor() === color ? " active" : ""}`}
                data-color={color}
                role="tab"
                type="button"
                onClick={() => setPaletteColor(color)}
              />
            )}
          </For>
        </div>
        <div class="editor-piece-grid">
          <For each={roles}>
            {(role) => {
              const piece = createMemo<Piece>(() => ({
                color: paletteColor(),
                role,
              }));

              return (
                <button
                  aria-pressed={samePiece(activePiece(), piece())}
                  class={`editor-piece-card${
                    samePiece(activePiece(), piece()) ? " active" : ""
                  }`}
                  type="button"
                  onPointerDown={(event) =>
                    startPieceInteraction(piece(), event)
                  }
                >
                  <span
                    class={`editor-piece-preview piece ${role} ${paletteColor()}`}
                  />
                  <span class="editor-piece-label">{roleLabels[role]}</span>
                </button>
              );
            }}
          </For>
        </div>
        <p class="editor-hint">Active tool: {activeToolLabel()}</p>
      </aside>
      <div class="editor-stage">
        <div class="editor-board-frame">
          <Container />
        </div>
      </div>
      <Show when={paletteDrag()}>
        {(drag) => (
          <div
            aria-hidden="true"
            class={`editor-piece-ghost piece ${drag().piece.role} ${drag().piece.color}`}
            style={{
              transform: `translate(${drag().pos[0] - 28}px, ${drag().pos[1] - 28}px)`,
            }}
          />
        )}
      </Show>
    </section>
  );
}
