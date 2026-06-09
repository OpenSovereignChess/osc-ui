import type { State } from "../state/state.ts";
import { type SetStoreFunction } from "solid-js/store";
import type * as types from "../rules/types.ts";

function samePiece(a?: types.Piece, b?: types.Piece): boolean {
  return !!a && !!b && a.color === b.color && a.role === b.role;
}

export function createEditorActions(
  state: State,
  setState: SetStoreFunction<State>,
) {
  function stopDropMode(): void {
    setState("interaction", {
      dropmode: {
        active: false,
        piece: undefined,
      },
      selected: undefined,
    });
  }

  function setDropPiece(piece: types.Piece): void {
    setState("interaction", {
      dropmode: {
        active: true,
        piece,
      },
      selected: undefined,
    });
  }

  function toggleDropPiece(piece: types.Piece): void {
    setState("interaction", (interaction) => {
      if (
        interaction.dropmode.active &&
        samePiece(interaction.dropmode.piece, piece)
      ) {
        return {
          ...interaction,
          dropmode: {
            active: false,
            piece: undefined,
          },
          selected: undefined,
        };
      }

      return {
        ...interaction,
        dropmode: {
          active: true,
          piece,
        },
        selected: undefined,
      };
    });
  }

  function toggleEraseMode(): void {
    setState("interaction", (interaction) => ({
      ...interaction,
      dropmode: {
        active: !interaction.dropmode.active || !!interaction.dropmode.piece,
        piece: undefined,
      },
      selected: undefined,
    }));
  }

  function placePiece(key: types.Key, piece: types.Piece): void {
    setState("position", "pieces", (pieces) => {
      const next = new Map(pieces);
      next.set(key, piece);
      return next;
    });
    setState("position", {
      check: undefined,
      lastMove: undefined,
    });
  }

  function clearSquare(key: types.Key): void {
    setState("position", "pieces", (pieces) => {
      const next = new Map(pieces);
      next.delete(key);
      return next;
    });
    setState("position", {
      check: undefined,
      lastMove: undefined,
    });
  }

  function applyDrop(key: types.Key): void {
    if (!state.interaction.dropmode.active) {
      return;
    }

    if (state.interaction.dropmode.piece) {
      placePiece(key, state.interaction.dropmode.piece);
    } else {
      clearSquare(key);
    }

    setState("interaction", {
      selected: undefined,
      stats: {
        dragged: false,
      },
    });
  }

  function replacePieces(pieces: types.Pieces): void {
    setState("position", {
      pieces,
      check: undefined,
      lastMove: undefined,
    });
    setState("interaction", {
      dropmode: {
        active: false,
        piece: undefined,
      },
      selected: undefined,
    });
  }

  return {
    applyDrop,
    clearSquare,
    placePiece,
    replacePieces,
    setDropPiece,
    stopDropMode,
    toggleDropPiece,
    toggleEraseMode,
  };
}

export type EditorActions = ReturnType<typeof createEditorActions>;
