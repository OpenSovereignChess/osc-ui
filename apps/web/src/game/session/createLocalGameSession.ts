import { createMemo, createSignal } from "solid-js";
import type { SetStoreFunction } from "solid-js/store";
import { squareFromName, type Role } from "@osc/rules";
import { createBoardActions } from "../input/board.ts";
import { createEditorActions } from "../input/editor.ts";
import type { State } from "../state/state.ts";
import type * as types from "../rules/types.ts";
import {
  promotionRolesForMove,
  type PromotionRequest,
} from "../analysis/promotion.ts";
import type {
  GameSnapshot,
  InteractionSnapshot,
  LocalGameSession,
  OnlineSeat,
  SessionAction,
  SessionHistoryMove,
} from "./types.ts";
import {
  applyRulesAction,
  canAct,
  castleActionsForSeat,
  defectActionsForSeat,
  historyTurns,
  initialRulesPosition,
  legalDestsForSeat,
  piecesFromRulesPosition,
} from "./rulesPosition.ts";

export function createLocalGameSession(
  state: State,
  setState: SetStoreFunction<State>,
  options: { onLocalMove?: (move: SessionAction) => void } = {},
): LocalGameSession {
  const board = createBoardActions(setState);
  const editor = createEditorActions(state, setState);
  let rulesPosition = initialRulesPosition();
  const [history, setHistory] = createSignal<SessionHistoryMove[]>([]);
  const [rulesVersion, setRulesVersion] = createSignal(0);
  let onlineSeat: OnlineSeat | undefined;
  const [pendingPromotion, setPendingPromotion] =
    createSignal<PromotionRequest>();

  function markRulesChanged(): void {
    setRulesVersion((version) => version + 1);
  }

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

  function applyRulesMove(move: SessionAction): boolean {
    try {
      const result = applyRulesAction(rulesPosition, move);
      rulesPosition = result.position;
      setHistory((current) => [...current, { san: result.san }]);
      markRulesChanged();
    } catch {
      return false;
    }
    syncRulesState("orig" in move ? [move.orig, move.dest] : undefined);
    return true;
  }

  function submitAction(action: SessionAction): boolean {
    if (!canAct(rulesPosition, onlineSeat)) {
      setPendingPromotion(undefined);
      setState("interaction", { selected: undefined });
      return false;
    }

    setPendingPromotion(undefined);
    setState("interaction", { selected: undefined });
    options.onLocalMove?.(action);
    return true;
  }

  function submitMove(orig: types.Key, dest: types.Key): boolean {
    if (!canAct(rulesPosition, onlineSeat)) {
      setPendingPromotion(undefined);
      setState("interaction", { selected: undefined });
      return false;
    }
    if (
      !rulesPosition
        .legalMovesOf(squareFromName(orig))
        .has(squareFromName(dest))
    ) {
      setPendingPromotion(undefined);
      setState("interaction", { selected: undefined });
      return false;
    }

    const roles = promotionRolesForMove(rulesPosition, orig, dest);
    if (roles.length > 0) {
      const piece = rulesPosition.board.pieceAt(squareFromName(orig));
      if (piece) {
        setPendingPromotion({ orig, dest, piece, roles });
        setState("interaction", { selected: undefined });
        return false;
      }
    }

    return submitAction({ kind: "move", orig, dest });
  }

  function promote(role: Role): void {
    const pending = pendingPromotion();
    if (!pending || !pending.roles.includes(role)) {
      setPendingPromotion(undefined);
      return;
    }
    submitAction({
      kind: "move",
      orig: pending.orig,
      dest: pending.dest,
      promotion: role,
    });
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
    applyServerMoves: (moves: readonly SessionAction[]) => {
      rulesPosition = initialRulesPosition();
      setHistory([]);
      markRulesChanged();
      for (const move of moves) {
        try {
          const result = applyRulesAction(rulesPosition, move);
          rulesPosition = result.position;
          setHistory((current) => [...current, { san: result.san }]);
          markRulesChanged();
        } catch {
          break;
        }
      }
      const lastMove = moves.at(-1);
      syncRulesState(
        lastMove && "orig" in lastMove
          ? [lastMove.orig, lastMove.dest]
          : undefined,
      );
    },
    board,
    editor,
    getCastleActions: createMemo(
      () => (rulesVersion(), castleActionsForSeat(rulesPosition, onlineSeat)),
    ),
    getDefectActions: createMemo(
      () => (rulesVersion(), defectActionsForSeat(rulesPosition, onlineSeat)),
    ),
    getHistoryTurns: createMemo(() => historyTurns(history())),
    getInteraction,
    getPendingPromotion: pendingPromotion,
    getSnapshot,
    getState: () => state,
    onLocalMove: options.onLocalMove,
    promote,
    setOnlineSeat: (seat) => {
      onlineSeat = seat;
      setState("interaction", {
        viewOnly: seat === "observer",
      });
      setState("position", {
        orientation: seat === "player2" ? "black" : "white",
      });
      syncRulesState(state.position.lastMove);
      markRulesChanged();
    },
    setDom: (dom: types.Dom) => {
      setState("layout", { dom });
    },
    submitAction,
    submitMove,
  };
}
