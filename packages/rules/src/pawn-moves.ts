import { fileOf, rankOf, squares, type Square } from "./models.ts";
import { SquareSet } from "./square-set.ts";

export function pawnMoves(square: Square, occupied: SquareSet): SquareSet {
  const outerRingFiles = new Set([0, 1, 14, 15]);
  const outerRingRanks = new Set([0, 1, 14, 15]);
  const file = fileOf(square);
  const rank = rankOf(square);
  if (outerRingRanks.has(rank) && !outerRingFiles.has(file)) {
    return computeTwoSteps(square, pawnMovesVertical, occupied);
  }
  if (outerRingFiles.has(file)) {
    return computeTwoSteps(square, pawnMovesHorizontal, occupied);
  }
  return pawnMoveTable[square].diff(occupied);
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

const pawnMovesVertical = tabulate((sq) => {
  const rank = rankOf(sq);
  if (rank < 7) return computeRange(sq, [16]);
  if (rank > 8) return computeRange(sq, [-16]);
  return SquareSet.empty;
});

const pawnMovesHorizontal = tabulate((sq) => {
  const file = fileOf(sq);
  if (file < 7) return computeRange(sq, [1]);
  if (file > 8) return computeRange(sq, [-1]);
  return SquareSet.empty;
});

const pawnMoveTable = tabulate((sq) => pawnMovesVertical[sq].union(pawnMovesHorizontal[sq]));

function computeTwoSteps(square: Square, oneStepMoves: readonly SquareSet[], occupied: SquareSet): SquareSet {
  const oneStep = oneStepMoves[square].diff(occupied);
  const oneStepSquare = oneStep.lsb();
  const twoSteps = oneStepSquare != null ? oneStepMoves[oneStepSquare] : SquareSet.empty;
  return oneStep.union(twoSteps).union(pawnMoveTable[square]).diff(occupied);
}
