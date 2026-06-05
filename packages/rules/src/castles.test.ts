import { describe, expect, test } from "vitest";
import { initialFEN } from "./constants.ts";
import { Castles } from "./castles.ts";
import { Setup } from "./setup.ts";
import { SquareSet } from "./square-set.ts";
import { expectNames, sq } from "./test-utils.ts";
import { squareName } from "./models.ts";

describe("Castles", () => {
  test("fromSetup", () => {
    const castles = Castles.fromSetup(Setup.standard);
    expect(castles.castlingRights.equals(SquareSet.castlingRooks)).toBe(true);
    expect(squareName(castles.rookOf("player1", "queen")!)).toBe("e1");
    expect(squareName(castles.rookOf("player1", "king")!)).toBe("l1");
    expect(squareName(castles.rookOf("player2", "queen")!)).toBe("e16");
    expect(squareName(castles.rookOf("player2", "king")!)).toBe("l16");
    expectNames(castles.path("player1", "queen"), ["f1", "g1", "h1"]);
    expectNames(castles.path("player1", "king"), ["j1", "k1"]);
    expectNames(castles.path("player2", "queen"), ["f16", "g16", "h16"]);
    expectNames(castles.path("player2", "king"), ["j16", "k16"]);
  });

  test("fromSetup with kInitialFEN", () => {
    const castles = Castles.fromSetup(Setup.parseFen(initialFEN));
    expect(castles.castlingRights.equals(SquareSet.castlingRooks)).toBe(true);
    expectNames(castles.path("player1", "queen"), ["f1", "g1", "h1"]);
    expectNames(castles.path("player2", "king"), ["j16", "k16"]);
  });

  test("fromSetup with outer rooks", () => {
    const castles = Castles.fromSetup(
      Setup.parseFen("2vr5bk2br1yr2/16/16/16/16/8bp7/16/16/16/16/16/16/16/16/16/2pr1wr3wk2wr1gr2 1 w b CELNceln"),
    );
    expectNames(castles.path("player2", "queen"), ["d16", "e16", "f16", "g16", "h16"]);
  });

  test("discard rook", () => {
    expect(Castles.standard.discardRookAt(sq("a4")).rookOf("player1", "king")).toBe(Castles.standard.rookOf("player1", "king"));
    const castles = Castles.standard.discardRookAt(sq("l1"));
    expect(squareName(castles.rookOf("player1", "queen")!)).toBe("e1");
    expect(squareName(castles.rookOf("player1", "king")!)).toBe("n1");
  });

  test("discard side", () => {
    let castles = Castles.standard.discardSide("player1");
    expect(castles.rookOf("player1", "queen")).toBeUndefined();
    expect(castles.rookOf("player1", "king")).toBeUndefined();
    expect(squareName(castles.rookOf("player2", "queen")!)).toBe("e16");
    expect(squareName(castles.rookOf("player2", "king")!)).toBe("l16");

    castles = Castles.standard.discardSide("player2");
    expect(squareName(castles.rookOf("player1", "queen")!)).toBe("e1");
    expect(squareName(castles.rookOf("player1", "king")!)).toBe("l1");
    expect(castles.rookOf("player2", "queen")).toBeUndefined();
    expect(castles.rookOf("player2", "king")).toBeUndefined();
  });

  test("discardRookAt", () => {
    expectNames(Castles.standard.discardRookAt(sq("e1")).path("player1", "queen"), ["d1", "e1", "f1", "g1", "h1"]);
    expectNames(Castles.standard.discardRookAt(sq("l1")).path("player1", "king"), ["j1", "k1", "l1", "m1"]);
    expectNames(Castles.standard.discardRookAt(sq("e16")).path("player2", "queen"), ["d16", "e16", "f16", "g16", "h16"]);
    expectNames(Castles.standard.discardRookAt(sq("l16")).path("player2", "king"), ["j16", "k16", "l16", "m16"]);
  });
});
