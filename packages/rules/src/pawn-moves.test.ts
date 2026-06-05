import { describe, expect, test } from "vitest";
import { pawnMoves } from "./pawn-moves.ts";
import { SquareSet } from "./square-set.ts";
import { expectNames, sq, set } from "./test-utils.ts";

describe("pawnMoves", () => {
  test("pawnMoves, empty board", () => {
    expectNames(pawnMoves(sq("d4"), SquareSet.empty), ["e4", "d5"]);
    expectNames(pawnMoves(sq("n3"), SquareSet.empty), ["m3", "n4"]);
    expectNames(pawnMoves(sq("f11"), SquareSet.empty), ["f10", "g11"]);
    expectNames(pawnMoves(sq("l13"), SquareSet.empty), ["l12", "k13"]);
  });

  test("pawnMoves, edge of quadrant", () => {
    expectNames(pawnMoves(sq("h4"), SquareSet.empty), ["h5"]);
    expectNames(pawnMoves(sq("d8"), SquareSet.empty), ["e8"]);
    expectNames(pawnMoves(sq("i13"), SquareSet.empty), ["i12"]);
    expectNames(pawnMoves(sq("m9"), SquareSet.empty), ["l9"]);
  });

  test("pawnMoves, occupied board", () => {
    expect(pawnMoves(sq("d4"), set("d5", "e4")).isEmpty).toBe(true);
  });

  test("pawnMoves, first rings, empty board", () => {
    expectNames(pawnMoves(sq("c1"), SquareSet.empty), ["d1", "c2", "c3"]);
    expectNames(pawnMoves(sq("n16"), SquareSet.empty), ["n14", "n15", "m16"]);
    expectNames(pawnMoves(sq("a14"), SquareSet.empty), ["a13", "b14", "c14"]);
    expectNames(pawnMoves(sq("o3"), SquareSet.empty), ["m3", "n3", "o4"]);
  });

  test("pawnMoves, first rings, occupied board", () => {
    expect(pawnMoves(sq("c1"), set("d1", "c2")).isEmpty).toBe(true);
  });

  test("pawnMoves, second rings, empty board", () => {
    expectNames(pawnMoves(sq("c2"), SquareSet.empty), ["d2", "c3", "c4"]);
  });
});
