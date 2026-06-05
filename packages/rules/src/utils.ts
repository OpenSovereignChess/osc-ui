import type { Position } from "./position.ts";
import type { Square } from "./models.ts";

export function makeLegalMoves(pos: Position): ReadonlyMap<Square, ReadonlySet<Square>> {
  const result = new Map<Square, ReadonlySet<Square>>();
  for (const [from, dests] of pos.legalMoves.entries()) {
    const squares = dests.squares();
    if (squares.length > 0) result.set(from, new Set(squares));
  }
  return result;
}

export function makeLegalCastlingMoves(pos: Position): ReadonlyMap<Square, ReadonlySet<Square>> {
  const result = new Map<Square, ReadonlySet<Square>>();
  for (const [from, dests] of pos.legalCastlingMoves.entries()) {
    const squares = dests.squares();
    if (squares.length > 0) result.set(from, new Set(squares));
  }
  return result;
}
