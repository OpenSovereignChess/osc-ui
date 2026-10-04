import { createMemo, createSignal } from "solid-js";
import type { SetStoreFunction } from "solid-js/store";
import {
  squareFromName,
  type Piece,
  type Position,
  type Role,
  type Side,
} from "@osc/rules";
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
import { buildBoardTelemetry } from "./boardTelemetry.ts";

export function createLocalGameSession(
  state: State,
  setState: SetStoreFunction<State>,
  options: {
    initialRulesPosition?: () => Position;
    now?: () => number;
    onLocalMove?: (move: SessionAction) => void;
  } = {},
): LocalGameSession {
  const board = createBoardActions(setState);
  const editor = createEditorActions(state, setState);
  const createInitialRulesPosition =
    options.initialRulesPosition ?? initialRulesPosition;
  let rulesPosition = createInitialRulesPosition();
  let capturedPieces: Record<Side, Piece[]> = { player1: [], player2: [] };
  const now = options.now ?? Date.now;
  let currentTurnStartedAt = now();
  const [history, setHistory] = createSignal<SessionHistoryMove[]>([]);
  const [rulesVersion, setRulesVersion] = createSignal(0);
  const [turnStartedAtVersion, setTurnStartedAtVersion] = createSignal(0);
  let onlineSeat: OnlineSeat | undefined;
  const [pendingPromotion, setPendingPromotion] =
    createSignal<PromotionRequest>();

  function markRulesChanged(): void {
    setRulesVersion((version) => version + 1);
  }

  function resetTurnStartedAt(): void {
    currentTurnStartedAt = now();
    setTurnStartedAtVersion((version) => version + 1);
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
    let lastMove: types.Key[] | undefined;
    try {
      lastMove = applyAcceptedRulesAction(move);
      resetTurnStartedAt();
    } catch {
      return false;
    }
    syncRulesState(lastMove);
    return true;
  }

  function applyAcceptedRulesAction(
    move: SessionAction,
  ): types.Key[] | undefined {
    const movingSide = rulesPosition.turn;
    const capturedPiece = capturedPieceForAction(rulesPosition, move);
    const result = applyRulesAction(rulesPosition, move);
    rulesPosition = result.position;
    setHistory((current) => [...current, { san: result.san }]);
    if (capturedPiece) {
      capturedPieces = {
        ...capturedPieces,
        [movingSide]: [...capturedPieces[movingSide], capturedPiece],
      };
    }
    markRulesChanged();
    return "orig" in move ? [move.orig, move.dest] : undefined;
  }

  function capturedPieceForAction(
    position: Position,
    action: SessionAction,
  ): Piece | undefined {
    if (action.kind === "castle" || action.kind === "defect") {
      return undefined;
    }
    return position.board.pieceAt(squareFromName(action.dest));
  }

  function submitAction(action: SessionAction): boolean {
    if (!canAct(rulesPosition, onlineSeat)) {
      clearPendingInteraction();
      return false;
    }

    clearPendingInteraction();
    options.onLocalMove?.(action);
    return true;
  }

  function clearPendingInteraction(): void {
    setPendingPromotion(undefined);
    setState("interaction", { selected: undefined });
  }

  function submitMove(orig: types.Key, dest: types.Key): boolean {
    if (!canAct(rulesPosition, onlineSeat)) {
      clearPendingInteraction();
      return false;
    }
    if (
      !rulesPosition
        .legalMovesOf(squareFromName(orig))
        .has(squareFromName(dest))
    ) {
      clearPendingInteraction();
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
      rulesPosition = createInitialRulesPosition();
      capturedPieces = { player1: [], player2: [] };
      setHistory([]);
      markRulesChanged();
      let lastMove: types.Key[] | undefined;
      for (const move of moves) {
        try {
          lastMove = applyAcceptedRulesAction(move);
        } catch {
          break;
        }
      }
      resetTurnStartedAt();
      markRulesChanged();
      syncRulesState(lastMove);
    },
    board,
    editor,
    flipOrientation: () => {
      setPendingPromotion(undefined);
      setState("interaction", { selected: undefined });
      setState("position", "orientation", (orientation) =>
        orientation === "white" ? "black" : "white",
      );
    },
    getCastleActions: createMemo(
      () => (rulesVersion(), castleActionsForSeat(rulesPosition, onlineSeat)),
    ),
    getDefectActions: createMemo(
      () => (rulesVersion(), defectActionsForSeat(rulesPosition, onlineSeat)),
    ),
    getHistoryTurns: createMemo(() => historyTurns(history())),
    getBoardTelemetry: () =>
      buildBoardTelemetry(
        (rulesVersion(), rulesPosition),
        onlineSeat,
        (turnStartedAtVersion(), currentTurnStartedAt),
        capturedPieces,
      ),
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
