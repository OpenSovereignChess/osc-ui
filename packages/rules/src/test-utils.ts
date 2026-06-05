import { expect } from "vitest";
import { squareFromName, squareName, type Square } from "./models.ts";
import { SquareSet } from "./square-set.ts";

export const sq = squareFromName;

export function set(...squares: string[]): SquareSet {
  return SquareSet.fromSquares(squares.map(sq));
}

export function names(squareSet: SquareSet): string[] {
  return squareSet.squares().map(squareName);
}

export function expectSquareSet(actual: SquareSet, expected: SquareSet): void {
  expect(actual.equals(expected)).toBe(true);
}

export function expectNames(actual: SquareSet, expected: string[]): void {
  expect(names(actual)).toEqual(expected);
}

export function moveNames(moves: ReadonlySet<Square> | undefined): string[] {
  return [...(moves ?? [])].map(squareName);
}
