import { describe, expect, test } from "vitest";
import { SquareSet } from "./square-set.ts";
import { expectNames, expectSquareSet, sq, set } from "./test-utils.ts";
import { squareName } from "./models.ts";

describe("SquareSet", () => {
  test("fromSquare", () => {
    expectSquareSet(SquareSet.fromSquare(sq("a1")), new SquareSet(0, 0, 0, 0, 0, 0, 0, 1));
  });

  test("fromSquares", () => {
    expectSquareSet(SquareSet.fromSquares([sq("a1"), sq("b1")]), new SquareSet(0, 0, 0, 0, 0, 0, 0, 3));
  });

  test("has", () => {
    expect(new SquareSet(0, 0, 0, 0, 0, 0, 0, 1).has(sq("a1"))).toBe(true);
    expect(new SquareSet(0, 0, 0, 0, 0, 0x80, 0, 0).has(sq("h5"))).toBe(true);
  });

  test("withSquare", () => {
    expect(SquareSet.empty.withSquare(sq("a1")).has(sq("a1"))).toBe(true);
  });

  test("squares", () => {
    expectNames(set("a1", "a3", "a6", "p9", "h13", "p16"), ["a1", "a3", "a6", "p9", "h13", "p16"]);
  });

  test("shr", () => {
    expectNames(SquareSet.fromSquare(sq("a2")).shr(16), ["a1"]);
    expectNames(SquareSet.southRay.shr(32), ["p6", "p7", "p8", "p9", "p10", "p11", "p12", "p13"]);
  });

  test("shl", () => {
    expectNames(SquareSet.fromSquare(sq("a1")).shl(16), ["a2"]);
    expectNames(SquareSet.northRay.shl(48), ["a5", "a6", "a7", "a8", "a9", "a10", "a11", "a12"]);
  });

  test("xor", () => {
    expectSquareSet(set("a1", "m4").xor(set("c14", "p1")), set("a1", "p1", "m4", "c14"));
  });

  test("flipVertical", () => {
    expectNames(set("a1", "b2", "p16").flipVertical(), ["p1", "b15", "a16"]);
  });

  test("mirrorHorizontal", () => {
    expectNames(set("a1", "b2", "p16").mirrorHorizontal(), ["p1", "o2", "a16"]);
  });

  test("northRay", () => {
    expectNames(SquareSet.northRay, ["a2", "a3", "a4", "a5", "a6", "a7", "a8", "a9"]);
  });

  test("eastRay", () => {
    expectNames(SquareSet.eastRay, ["b1", "c1", "d1", "e1", "f1", "g1", "h1", "i1"]);
  });

  test("southRay", () => {
    expectNames(SquareSet.southRay, ["p8", "p9", "p10", "p11", "p12", "p13", "p14", "p15"]);
  });

  test("westRay", () => {
    expectNames(SquareSet.westRay, ["h16", "i16", "j16", "k16", "l16", "m16", "n16", "o16"]);
  });

  test("northeastRay", () => {
    expectNames(SquareSet.northeastRay, ["b2", "c3", "d4", "e5", "f6", "g7", "h8", "i9"]);
  });

  test("northwestRay", () => {
    expectNames(SquareSet.northwestRay, ["h2", "g3", "f4", "e5", "d6", "c7", "b8", "a9"]);
  });

  test("southeastRay", () => {
    expectNames(SquareSet.southeastRay, ["p8", "o9", "n10", "m11", "l12", "k13", "j14", "i15"]);
  });

  test("southwestRay", () => {
    expectNames(SquareSet.southwestRay, ["h8", "i9", "j10", "k11", "l12", "m13", "n14", "o15"]);
  });

  test("lsb", () => {
    expect(squareName(SquareSet.fromSquare(sq("h1")).withSquare(sq("d1")).lsb()!)).toBe("d1");
  });
});
