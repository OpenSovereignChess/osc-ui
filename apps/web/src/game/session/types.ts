import type { Accessor } from "solid-js";
import type { BoardActions } from "../input/board.ts";
import type { EditorActions } from "../input/editor.ts";
import type { State } from "../state/state.ts";
import type * as types from "../rules/types.ts";
import type { PieceColor, Role } from "@osc/rules";
import type { PromotionRequest } from "../analysis/promotion.ts";

type Orientation = Extract<types.Color, "white" | "black">;

export interface GameSnapshot {
  coordinates: boolean;
  orientation: Orientation;
  pieces: types.Pieces;
  selected?: types.Key;
}

export interface InteractionSnapshot {
  drawableCurrent?: State["interaction"]["drawable"]["current"];
  drawableEnabled: boolean;
  dropmodeActive: boolean;
  dropmodePiece?: types.Piece;
  viewOnly: boolean;
}

export interface SessionMove {
  kind?: "move";
  orig: types.Key;
  dest: types.Key;
  promotion?: Role;
}

export interface SessionCastle {
  kind: "castle";
  orig: types.Key;
  dest: types.Key;
}

export interface SessionDefection {
  kind: "defect";
  color: PieceColor;
}

export type SessionAction = SessionMove | SessionCastle | SessionDefection;

export interface SessionActionOption {
  label: string;
  action: SessionAction;
}

export interface SessionHistoryMove {
  san: string;
}

export interface SessionHistoryTurn {
  number: number;
  first?: SessionHistoryMove;
  second?: SessionHistoryMove;
}

export type OnlineSeat = "player1" | "player2" | "observer";

export interface LocalGameSession {
  board: BoardActions;
  editor: EditorActions;
  applyServerMove: (move: SessionAction) => boolean;
  applyServerMoves: (moves: readonly SessionAction[]) => void;
  getCastleActions: Accessor<readonly SessionActionOption[]>;
  getDefectActions: Accessor<readonly SessionActionOption[]>;
  getHistoryTurns: Accessor<readonly SessionHistoryTurn[]>;
  getInteraction: Accessor<InteractionSnapshot>;
  getSnapshot: Accessor<GameSnapshot>;
  getState: Accessor<State>;
  getPendingPromotion: Accessor<PromotionRequest | undefined>;
  onLocalMove?: (move: SessionAction) => void;
  promote: (role: Role) => void;
  setOnlineSeat: (seat?: OnlineSeat) => void;
  setDom: (dom: types.Dom) => void;
  submitAction: (action: SessionAction) => boolean;
  submitMove: (orig: types.Key, dest: types.Key) => boolean;
}
