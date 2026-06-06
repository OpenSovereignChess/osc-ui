import {
  normalMove,
  squareFromName,
  type Piece,
  type Position,
  type Role,
} from "@osc/rules";
import type * as types from "../rules/types.ts";

export const promotionRoles = [
  "queen",
  "rook",
  "bishop",
  "knight",
  "king",
] as const satisfies readonly Role[];

export interface PromotionRequest {
  readonly orig: types.Key;
  readonly dest: types.Key;
  readonly piece: Piece;
  readonly roles: readonly Role[];
}

export function promotionRolesForMove(
  position: Position,
  orig: types.Key,
  dest: types.Key,
): readonly Role[] {
  const piece = position.board.pieceAt(squareFromName(orig));
  if (!piece || piece.role !== "pawn") {
    return [];
  }

  return promotionRoles.filter((role) =>
    position.isLegal(normalMove(orig, dest, role)),
  );
}
