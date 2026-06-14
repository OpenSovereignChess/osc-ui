import { createMemo } from "solid-js";
import type { SetStoreFunction } from "solid-js/store";
import { createBoardActions } from "../input/board.ts";
import { createEditorActions } from "../input/editor.ts";
import { defaultPositionState, type State } from "../state/state.ts";
import type * as types from "../rules/types.ts";
import type {
  GameSnapshot,
  InteractionSnapshot,
  LocalGameSession,
  SessionMove,
} from "./types.ts";

export function createLocalGameSession(
  state: State,
  setState: SetStoreFunction<State>,
  options: { onLocalMove?: (move: SessionMove) => void } = {},
): LocalGameSession {
  const board = createBoardActions(setState);
  const editor = createEditorActions(state, setState);

  const getSnapshot = createMemo<GameSnapshot>(() => ({
    coordinates: state.interaction.coordinates,
    orientation: state.position.orientation,
    pieces: state.position.pieces,
    selected: state.interaction.selected,
  }));

  const getInteraction = createMemo<InteractionSnapshot>(() => ({
    drawableCurrent: state.interaction.drawable.current,
    drawableEnabled: state.interaction.drawable.enabled,
    dropmodeActive: state.interaction.dropmode.active,
    dropmodePiece: state.interaction.dropmode.piece,
    viewOnly: state.interaction.viewOnly,
  }));

  return {
    applyServerMove: (move: SessionMove) =>
      board.applyMove(state, move.orig, move.dest),
    applyServerMoves: (moves: readonly SessionMove[]) => {
      setState("position", defaultPositionState());
      for (const move of moves) {
        board.applyMove(state, move.orig, move.dest);
      }
    },
    board,
    editor,
    getInteraction,
    getSnapshot,
    getState: () => state,
    onLocalMove: options.onLocalMove,
    setOnlineSeat: (seat) => {
      setState("interaction", {
        viewOnly: seat === "observer",
      });
      setState("position", {
        orientation: seat === "player2" ? "black" : "white",
        movable: {
          ...state.position.movable,
          color:
            seat === "player1"
              ? "white"
              : seat === "player2"
                ? "black"
                : undefined,
        },
      });
    },
    setDom: (dom: types.Dom) => {
      setState("layout", { dom });
    },
  };
}
