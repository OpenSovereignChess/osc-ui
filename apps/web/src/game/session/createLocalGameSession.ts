import { createMemo } from "solid-js";
import type { SetStoreFunction } from "solid-js/store";
import { createBoardActions } from "../input/board.ts";
import { createEditorActions } from "../input/editor.ts";
import type { State } from "../state/state.ts";
import type * as types from "../rules/types.ts";
import type {
  GameSnapshot,
  InteractionSnapshot,
  LocalGameSession,
  OnlineSeat,
  SessionMove,
} from "./types.ts";
import {
  initialRulesPosition,
  legalDestsForSeat,
  piecesFromRulesPosition,
  playRulesMove,
} from "./rulesPosition.ts";

export function createLocalGameSession(
  state: State,
  setState: SetStoreFunction<State>,
  options: { onLocalMove?: (move: SessionMove) => void } = {},
): LocalGameSession {
  const board = createBoardActions(setState);
  const editor = createEditorActions(state, setState);
  let rulesPosition = initialRulesPosition();
  let onlineSeat: OnlineSeat | undefined;

  function syncRulesState(lastMove?: types.Key[]): void {
    setState("position", {
      pieces: piecesFromRulesPosition(rulesPosition),
      turnColor: rulesPosition.ownedColor,
      check: undefined,
      lastMove,
      movable: {
        free: false,
        color: "both",
        dests: legalDestsForSeat(rulesPosition, onlineSeat),
      },
    });
  }

  function applyRulesMove(move: SessionMove): boolean {
    const next = playRulesMove(rulesPosition, move);
    if (!next) {
      return false;
    }
    rulesPosition = next;
    syncRulesState([move.orig, move.dest]);
    return true;
  }

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

  syncRulesState();

  return {
    applyServerMove: applyRulesMove,
    applyServerMoves: (moves: readonly SessionMove[]) => {
      rulesPosition = initialRulesPosition();
      for (const move of moves) {
        const next = playRulesMove(rulesPosition, move);
        if (!next) {
          break;
        }
        rulesPosition = next;
      }
      const lastMove = moves.at(-1);
      syncRulesState(lastMove ? [lastMove.orig, lastMove.dest] : undefined);
    },
    board,
    editor,
    getInteraction,
    getSnapshot,
    getState: () => state,
    onLocalMove: options.onLocalMove,
    setOnlineSeat: (seat) => {
      onlineSeat = seat;
      setState("interaction", {
        viewOnly: seat === "observer",
      });
      setState("position", {
        orientation: seat === "player2" ? "black" : "white",
      });
      syncRulesState(state.position.lastMove);
    },
    setDom: (dom: types.Dom) => {
      setState("layout", { dom });
    },
  };
}
