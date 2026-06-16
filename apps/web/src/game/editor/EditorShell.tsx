import {
  For,
  Show,
  createEffect,
  createMemo,
  createSignal,
  onCleanup,
  onMount,
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
import { read, readSetup, writeSetup } from "../rules/fen.ts";
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

function fenFromUrl(): string | undefined {
  if (typeof window === "undefined") {
    return undefined;
  }
  return new URL(window.location.href).searchParams.get("fen") ?? undefined;
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

export default function EditorShell() {
  const session = useGameSession();
  const interaction = session.getInteraction;
  const snapshot = session.getSnapshot;
  let fenOutputEl: HTMLTextAreaElement | undefined;
  const [paletteColor, setPaletteColor] = createSignal<Color>("white");
  const [paletteDrag, setPaletteDrag] = createSignal<PaletteDrag>();
  const [fenInput, setFenInput] = createSignal("");
  const [fenError, setFenError] = createSignal<string>();
  const [fenStatus, setFenStatus] = createSignal<string>();
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
  const currentFen = createMemo(() => writeSetup(snapshot().pieces));
  const analysisPositionHref = createMemo(() =>
    positionUrl("/analysis", currentFen()),
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

  onMount(() => {
    const fen = fenFromUrl();
    if (!fen) {
      setFenInput(currentFen());
      return;
    }

    try {
      const setup = readSetup(fen);
      const pieces = read(setup.board.fen);
      session.editor.replacePieces(pieces);
      setFenInput(writeSetup(pieces));
      setFenError(undefined);
    } catch {
      setFenInput(currentFen());
      setFenError("The URL FEN is invalid.");
    }
  });

  const loadFen = (): void => {
    try {
      const setup = readSetup(fenInput());
      const pieces = read(setup.board.fen);
      const normalizedFen = writeSetup(pieces);
      session.editor.replacePieces(pieces);
      setFenInput(normalizedFen);
      setFenError(undefined);
      setFenStatus("Position loaded.");
      replaceFenUrl(normalizedFen);
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

  const clearBoard = (): void => {
    session.editor.clearBoard();
    const emptyFen = writeSetup(new Map());
    setFenInput(emptyFen);
    setFenError(undefined);
    setFenStatus("Board cleared.");
    replaceFenUrl(emptyFen);
  };

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
          <button class="editor-tool" type="button" onClick={clearBoard}>
            Clear board
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
        <div class="editor-fen-panel" aria-label="Position FEN">
          <label for="editor-current-fen">Current FEN</label>
          <textarea
            id="editor-current-fen"
            readOnly
            ref={fenOutputEl}
            rows="3"
            value={currentFen()}
          />
          <div class="editor-fen-actions">
            <button onClick={copyFen} type="button">
              Copy FEN
            </button>
            <a href={analysisPositionHref()}>Analyze position</a>
          </div>
          <label for="editor-load-fen">Load FEN</label>
          <textarea
            id="editor-load-fen"
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
            {(message) => <p class="editor-fen-message error">{message()}</p>}
          </Show>
          <Show when={fenStatus()}>
            {(message) => <p class="editor-fen-message">{message()}</p>}
          </Show>
        </div>
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
