import type { NumberPair } from "./types.ts";

export const DRAG_INTENT_DISTANCE_SQUARED = 16;

export function hasDragIntent(
  start: NumberPair,
  current: NumberPair,
  distanceSquared = DRAG_INTENT_DISTANCE_SQUARED,
): boolean {
  const distanceX = current[0] - start[0];
  const distanceY = current[1] - start[1];

  return distanceX * distanceX + distanceY * distanceY >= distanceSquared;
}

export function shouldCancelSameSquareDrop(
  orig: string,
  dest: string | undefined,
  hasIntent: boolean,
): boolean {
  return dest === orig && hasIntent;
}

export function shouldApplyDragDrop(
  orig: string,
  dest: string | undefined,
  canMove: boolean,
): boolean {
  return dest !== undefined && dest !== orig && canMove;
}
