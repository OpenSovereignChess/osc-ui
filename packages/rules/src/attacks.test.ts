import { describe, expect, test } from "vitest";
import { bishopAttacks, kingAttacks, knightAttacks, pawnAttacks, queenAttacks, rookAttacks } from "./attacks.ts";
import { SquareSet } from "./square-set.ts";
import { expectNames, sq, set } from "./test-utils.ts";

describe("attacks", () => {
  test("King attacks", () => {
    expectNames(kingAttacks(sq("f3")), ["e2", "f2", "g2", "e3", "g3", "e4", "f4", "g4"]);
  });

  test("Knight attacks", () => {
    expectNames(knightAttacks(sq("d4")), ["c2", "e2", "b3", "f3", "b5", "f5", "c6", "e6"]);
  });

  test("Bishop attacks, empty board", () => {
    expectNames(bishopAttacks(sq("f3"), SquareSet.empty), [
      "d1",
      "h1",
      "e2",
      "g2",
      "e4",
      "g4",
      "d5",
      "h5",
      "c6",
      "i6",
      "b7",
      "j7",
      "a8",
      "k8",
      "l9",
      "m10",
      "n11",
    ]);
  });

  test("Bishop attacks, occupied board", () => {
    expectNames(bishopAttacks(sq("f3"), set("d1", "g2", "b7", "k8")), [
      "d1",
      "e2",
      "g2",
      "e4",
      "g4",
      "d5",
      "h5",
      "c6",
      "i6",
      "b7",
      "j7",
      "k8",
    ]);
  });

  test("Rook attacks, empty board", () => {
    expectNames(rookAttacks(sq("h9"), SquareSet.empty), [
      "h1",
      "h2",
      "h3",
      "h4",
      "h5",
      "h6",
      "h7",
      "h8",
      "a9",
      "b9",
      "c9",
      "d9",
      "e9",
      "f9",
      "g9",
      "i9",
      "j9",
      "k9",
      "l9",
      "m9",
      "n9",
      "o9",
      "p9",
      "h10",
      "h11",
      "h12",
      "h13",
      "h14",
      "h15",
      "h16",
    ]);
  });

  test("Rook attacks, occupied board", () => {
    expectNames(rookAttacks(sq("h9"), set("g9", "h2", "h12", "o9")), [
      "h2",
      "h3",
      "h4",
      "h5",
      "h6",
      "h7",
      "h8",
      "g9",
      "i9",
      "j9",
      "k9",
      "l9",
      "m9",
      "n9",
      "o9",
      "h10",
      "h11",
      "h12",
    ]);
  });

  test("Queen attacks", () => {
    const attacks = queenAttacks(sq("d4"), SquareSet.empty);
    expect(attacks.has(sq("d12"))).toBe(true);
    expect(attacks.has(sq("d13"))).toBe(false);
    expect(attacks.has(sq("a1"))).toBe(true);
    expect(attacks.has(sq("l4"))).toBe(true);
  });

  test("Pawn attacks", () => {
    expectNames(pawnAttacks(sq("d4")), ["e3", "c5", "e5"]);
    expectNames(pawnAttacks(sq("l4")), ["k3", "k5", "m5"]);
    expectNames(pawnAttacks(sq("d13")), ["c12", "e12", "e14"]);
    expectNames(pawnAttacks(sq("l13")), ["k12", "m12", "k14"]);
    expectNames(pawnAttacks(sq("d1")), ["c2", "e2"]);
    expectNames(pawnAttacks(sq("d16")), ["c15", "e15"]);
    expectNames(pawnAttacks(sq("a4")), ["b3", "b5"]);
    expectNames(pawnAttacks(sq("p13")), ["o12", "o14"]);
    expectNames(pawnAttacks(sq("l16")), ["k15", "m15"]);
    expectNames(pawnAttacks(sq("h2")), ["g3", "i3"]);
    expectNames(pawnAttacks(sq("i4")), ["h5", "j5"]);
    expectNames(pawnAttacks(sq("d9")), ["e8", "e10"]);
    expectNames(pawnAttacks(sq("i15")), ["h14", "j14"]);
    expectNames(pawnAttacks(sq("l9")), ["k8", "k10"]);
    expectNames(pawnAttacks(sq("l8")), ["k7", "k9"]);
  });
});
