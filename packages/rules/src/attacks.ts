import { fileMasks, rankMasks, SquareSet } from "./square-set.ts";
import { fileOf, quadrantOf, rankOf, squareFromCoords, squares, type Square } from "./models.ts";

export function kingAttacks(square: Square): SquareSet {
  return kingAttackTable[square];
}

export function knightAttacks(square: Square): SquareSet {
  return knightAttackTable[square];
}

export function pawnAttacks(square: Square): SquareSet {
  return pawnAttackTable[square];
}

export function bishopAttacks(square: Square, occupied: SquareSet): SquareSet {
  const nwRay = computeRayAttack(northwestRange[square], occupied, northwestRange);
  const neRay = computeRayAttack(northeastRange[square], occupied, northeastRange);
  const seRay = computeRayAttack(southeastRange[square], occupied, northeastRange, true);
  const swRay = computeRayAttack(southwestRange[square], occupied, northwestRange, true);
  return nwRay.union(neRay).union(seRay).union(swRay);
}

export function rookAttacks(square: Square, occupied: SquareSet): SquareSet {
  const northRay = computeRayAttack(northRange[square], occupied, northRange);
  const eastRay = computeRayAttack(eastRange[square], occupied, eastRange);
  const southRay = computeRayAttack(southRange[square], occupied, northRange, true);
  const westRay = computeWestRayAttack(westRange[square], occupied);
  return northRay.union(eastRay).union(southRay).union(westRay);
}

export function queenAttacks(square: Square, occupied: SquareSet): SquareSet {
  return bishopAttacks(square, occupied).xor(rookAttacks(square, occupied));
}

export function ray(a: Square, b: Square): SquareSet {
  const other = SquareSet.fromSquare(b);
  if (northRange[a].isIntersected(other)) return northRange[a].withSquare(a);
  if (northeastRange[a].isIntersected(other)) return northeastRange[a].withSquare(a);
  if (eastRange[a].isIntersected(other)) return eastRange[a].withSquare(a);
  if (southeastRange[a].isIntersected(other)) return southeastRange[a].withSquare(a);
  if (southRange[a].isIntersected(other)) return southRange[a].withSquare(a);
  if (southwestRange[a].isIntersected(other)) return southwestRange[a].withSquare(a);
  if (westRange[a].isIntersected(other)) return westRange[a].withSquare(a);
  if (northwestRange[a].isIntersected(other)) return northwestRange[a].withSquare(a);
  return SquareSet.empty;
}

export function between(a: Square, b: Square): SquareSet {
  return ray(a, b)
    .intersect(SquareSet.full.shl(a).xor(SquareSet.full.shl(b)))
    .withoutFirst();
}

function computeRange(square: Square, deltas: readonly number[]): SquareSet {
  let range = SquareSet.empty;
  for (const delta of deltas) {
    const sq = square + delta;
    if (0 <= sq && sq < 256 && Math.abs(fileOf(square) - fileOf(sq)) <= 2) {
      range = range.withSquare(sq);
    }
  }
  return range;
}

function tabulate<T>(f: (square: Square) => T): T[] {
  return squares.map(f);
}

function clamp(i: number): number {
  if (i < 0) return 0;
  if (i >= 16) return 15;
  return i;
}

const kingAttackTable = tabulate((sq) => computeRange(sq, [-17, -16, -15, -1, 1, 15, 16, 17]));
const knightAttackTable = tabulate((sq) => computeRange(sq, [-33, -31, -18, -14, 14, 18, 31, 33]));

const pawnAttackTable = tabulate((sq) => {
  let attacks = (() => {
    switch (quadrantOf(sq)) {
      case "q1":
        return computeRange(sq, [15, 17, -15]);
      case "q2":
        return computeRange(sq, [15, 17, -17]);
      case "q3":
        return computeRange(sq, [17, -15, -17]);
      case "q4":
        return computeRange(sq, [15, -15, -17]);
    }
  })();
  if (fileOf(sq) === 7 || fileOf(sq) === 8) {
    const mod = rankOf(sq) > 7 ? 1 : -1;
    attacks = attacks.diff(SquareSet.fromRank(clamp(rankOf(sq) + mod)));
  }
  if (rankOf(sq) === 7 || rankOf(sq) === 8) {
    const mod = fileOf(sq) > 7 ? 1 : -1;
    attacks = attacks.diff(SquareSet.fromFile(clamp(fileOf(sq) + mod)));
  }
  return attacks;
});

export const northRange = tabulate((sq) => SquareSet.northRay.shl(sq));
export const eastRange = tabulate((sq) => SquareSet.eastRay.shl(sq).intersect(rankMasks[rankOf(sq)]));
export const southRange = tabulate((sq) => SquareSet.southRay.shr(255 - sq));
export const westRange = tabulate((sq) => SquareSet.westRay.shr(255 - sq).intersect(rankMasks[rankOf(sq)]));

export const northwestRange = tabulate((sq) => {
  let mask = SquareSet.empty;
  for (const [file, fileMask] of fileMasks.entries()) {
    if (file < fileOf(sq)) mask = mask.union(fileMask);
  }
  const i1 = squareFromCoords(8, 0);
  return sq <= i1
    ? SquareSet.northwestRay.shr(i1 - sq).intersect(mask)
    : SquareSet.northwestRay.shl(sq - i1).intersect(mask);
});

export const northeastRange = tabulate((sq) => {
  let mask = SquareSet.empty;
  for (const [file, fileMask] of fileMasks.entries()) {
    if (file > fileOf(sq)) mask = mask.union(fileMask);
  }
  return SquareSet.northeastRay.shl(sq).intersect(mask);
});

export const southeastRange = tabulate((sq) => {
  let mask = SquareSet.empty;
  for (const [file, fileMask] of fileMasks.entries()) {
    if (file > fileOf(sq)) mask = mask.union(fileMask);
  }
  const h16 = squareFromCoords(7, 15);
  return sq <= h16
    ? SquareSet.southeastRay.shr(h16 - sq).intersect(mask)
    : SquareSet.southeastRay.shl(sq - h16).intersect(mask);
});

export const southwestRange = tabulate((sq) => {
  let mask = SquareSet.empty;
  for (const [file, fileMask] of fileMasks.entries()) {
    if (file < fileOf(sq)) mask = mask.union(fileMask);
  }
  return SquareSet.southwestRay.shr(255 - sq).intersect(mask);
});

function computeRayAttack(ray: SquareSet, occupied: SquareSet, ranges: readonly SquareSet[], reverse = false): SquareSet {
  const raySet = reverse ? ray.flipVertical() : ray;
  const occupiedSet = reverse ? occupied.flipVertical() : occupied;
  const lsb = occupiedSet.intersect(raySet).lsb();
  const blocked = (lsb != null ? ranges[lsb] : SquareSet.empty).intersect(raySet);
  const result = raySet.xor(blocked);
  return reverse ? result.flipVertical() : result;
}

function computeWestRayAttack(ray: SquareSet, occupied: SquareSet): SquareSet {
  const raySet = ray.mirrorHorizontal();
  const occupiedSet = occupied.mirrorHorizontal();
  const lsb = occupiedSet.intersect(raySet).lsb();
  const blocked = (lsb != null ? eastRange[lsb] : SquareSet.empty).intersect(raySet);
  return raySet.xor(blocked).mirrorHorizontal();
}
