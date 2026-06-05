import { describe, expect, test } from "vitest";
import { FenException } from "./models.ts";
import { Setup } from "./setup.ts";
import { SquareSet } from "./square-set.ts";
import { expectNames } from "./test-utils.ts";

describe("Setup", () => {
  test("parseFen", () => {
    const setup = Setup.parseFen(
      "16/16/16/16/16/7bp8/16/16/5wq1wb8/16/16/4wp11/16/16/16/wk15 1 w b CELNceln 0",
    );
    expect(setup.turn).toBe("player1");
    expect(setup.board.armyManager.colorOf("player1")).toBe("white");
    expect(setup.board.armyManager.colorOf("player2")).toBe("black");
    expect([...setup.board.controlledColorsOf("player1")].sort()).toEqual(["cyan", "navy"]);
    expect([...setup.board.controlledColorsOf("player2")]).toEqual(["pink"]);
    expectNames(setup.castlingRights, ["c1", "e1", "l1", "n1", "c16", "e16", "l16", "n16"]);
  });

  test("fen", () => {
    const fen = "16/16/16/16/16/16/16/16/16/16/16/16/16/16/16/wk15 1 w b - 0";
    expect(Setup.parseFen(fen).fen).toBe(fen);
  });

  test("castling rights in FEN", () => {
    let setup = Setup.parseFen("16/16/16/16/16/16/16/16/16/16/16/16/16/16/16/wk15 1 w b - 0");
    expect(setup.castlingRights.equals(SquareSet.empty)).toBe(true);

    setup = Setup.parseFen("16/16/16/16/16/16/16/16/16/16/16/16/16/16/16/wk15 1 w b CELNceln 0");
    expectNames(setup.castlingRights, ["c1", "e1", "l1", "n1", "c16", "e16", "l16", "n16"]);

    setup = Setup.parseFen("16/16/16/16/16/16/16/16/16/16/16/16/16/16/16/wk15 1 w b CLen 0");
    expectNames(setup.castlingRights, ["c1", "l1", "e16", "n16"]);
    expect(() =>
      Setup.parseFen("16/16/16/16/16/16/16/16/16/16/16/16/16/16/16/wk15 1 w b XYZ 0"),
    ).toThrow(FenException);
  });

  test("writing castling rights to FEN", () => {
    expect(Setup.parseFen("16/16/16/16/16/16/16/16/16/16/16/16/16/16/16/wk15 1 w b - 0").fen).toBe(
      "16/16/16/16/16/16/16/16/16/16/16/16/16/16/16/wk15 1 w b - 0",
    );
    expect(Setup.parseFen("bk15/16/16/16/16/16/16/16/16/16/16/16/16/16/16/wk15 1 w b CELNceln 0").fen).toBe(
      "bk15/16/16/16/16/16/16/16/16/16/16/16/16/16/16/wk15 1 w b CELNceln 0",
    );
    expect(Setup.parseFen("bk15/16/16/16/16/16/16/16/16/16/16/16/16/16/16/wk15 1 w b CLen 0").fen).toBe(
      "bk15/16/16/16/16/16/16/16/16/16/16/16/16/16/16/wk15 1 w b CLen 0",
    );
  });
});
