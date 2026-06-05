import { describe, expect, test } from "vitest";
import {
  Board,
  Setup,
  SovereignChess,
  SquareSet,
  bishopAttacks,
  initialBoardFEN,
  initialFEN,
  kingAttacks,
  knightAttacks,
  makeLegalMoves,
  normalMove,
  pawnAttacks,
  pawnMoves,
  queenAttacks,
  rookAttacks,
  squareFromName,
  squareName,
} from "./index.ts";

const sq = squareFromName;
const names = (set: SquareSet) => set.squares().map(squareName);

function set(...squares: string[]): SquareSet {
  return SquareSet.fromSquares(squares.map(sq));
}

describe("SquareSet", () => {
  test("stores and iterates squares in order", () => {
    const result = set("a1", "p16", "h8", "i9");
    expect(names(result)).toEqual(["a1", "h8", "i9", "p16"]);
    expect(result.has(sq("h8"))).toBe(true);
    expect(result.withoutSquare(sq("h8")).has(sq("h8"))).toBe(false);
  });

  test("shift, flip, and mirror preserve Dart-style board order", () => {
    expect(names(SquareSet.fromSquare(sq("a1")).shl(16))).toEqual(["a2"]);
    expect(names(SquareSet.fromSquare(sq("a2")).shr(16))).toEqual(["a1"]);
    expect(names(SquareSet.fromSquare(sq("a1")).flipVertical())).toEqual(["a16"]);
    expect(names(SquareSet.fromSquare(sq("a1")).mirrorHorizontal())).toEqual(["p1"]);
  });
});

describe("attacks", () => {
  test("king, knight, pawn attacks", () => {
    expect(names(kingAttacks(sq("f3")))).toEqual(["e2", "f2", "g2", "e3", "g3", "e4", "f4", "g4"]);
    expect(names(knightAttacks(sq("d4")))).toEqual(["c2", "e2", "b3", "f3", "b5", "f5", "c6", "e6"]);
    expect(names(pawnAttacks(sq("d4")))).toEqual(["e3", "c5", "e5"]);
    expect(names(pawnAttacks(sq("l4")))).toEqual(["k3", "k5", "m5"]);
  });

  test("sliding attacks stop at blockers", () => {
    const bishopOccupied = set("d1", "g2", "b7", "k8");
    expect(names(bishopAttacks(sq("f3"), bishopOccupied))).toEqual([
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

    const rookOccupied = set("g9", "h2", "h12", "o9");
    expect(names(rookAttacks(sq("h9"), rookOccupied))).toEqual([
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
    expect(queenAttacks(sq("d4"), SquareSet.empty).has(sq("d12"))).toBe(true);
    expect(queenAttacks(sq("d4"), SquareSet.empty).has(sq("d13"))).toBe(false);
  });
});

describe("FEN and setup", () => {
  test("round-trips initial board and full setup", () => {
    expect(Board.parseFen(initialBoardFEN).fen).toBe(initialBoardFEN);
    expect(Setup.parseFen(initialFEN).fen).toBe(initialFEN);
  });

  test("derives controlled armies and castling rights", () => {
    const setup = Setup.parseFen(
      "16/16/16/16/16/7bp8/16/16/5wq1wb8/16/16/4wp11/16/16/16/wk15 1 w b CELNceln 0",
    );
    expect(setup.turn).toBe("player1");
    expect([...setup.board.controlledColorsOf("player1")].sort()).toEqual(["cyan", "navy"]);
    expect([...setup.board.controlledColorsOf("player2")]).toEqual(["pink"]);
    expect(names(setup.castlingRights)).toEqual(["c1", "e1", "l1", "n1", "c16", "e16", "l16", "n16"]);
  });
});

describe("pawn moves", () => {
  test("moves toward the board center and handles two-step rings", () => {
    expect(names(pawnMoves(sq("d4"), SquareSet.empty))).toEqual(["e4", "d5"]);
    expect(names(pawnMoves(sq("n3"), SquareSet.empty))).toEqual(["m3", "n4"]);
    expect(names(pawnMoves(sq("d1"), SquareSet.empty))).toEqual(["e1", "d2", "d3"]);
    expect(names(pawnMoves(sq("a6"), SquareSet.empty))).toEqual(["b6", "c6", "a7"]);
  });
});

describe("position", () => {
  test("generates legal king moves", () => {
    const pos = SovereignChess.fromSetup(Setup.parseFen("16/16/16/16/16/16/16/16/16/16/16/16/16/16/1wk14/16 1 w b -"));
    expect(names(pos.legalMoves.get(sq("b2"))!)).toEqual(["a1", "b1", "c1", "a2", "c2", "a3", "b3", "c3"]);
  });

  test("prevents neutral capture and own-color square move", () => {
    let pos = SovereignChess.fromSetup(Setup.parseFen("bk15/16/16/16/16/16/16/16/16/16/16/16/16/16/8pp7/8wk7 1 w b -"));
    expect(pos.board.colorBelongsTo("player1", "pink")).toBe(false);
    expect(pos.legalMoves.get(sq("i1"))!.has(sq("i2"))).toBe(false);

    pos = SovereignChess.fromSetup(Setup.parseFen("8bq7/16/16/16/16/16/16/16/16/16/16/16/16/16/16/8bk7 2 w b -"));
    expect(pos.legalMoves.get(sq("i16"))!.has(sq("i9"))).toBe(false);
  });

  test("play updates controlled colors and promotions", () => {
    const pos = SovereignChess.fromSetup(Setup.parseFen("16/16/16/16/3bp12/16/16/16/16/16/16/16/11wp4/16/16/8wk7 1 w b -"));
    const result = pos.play(normalMove("l4", "l5"));
    expect(result.board.white.has(sq("l5"))).toBe(true);
    expect(result.board.armyManager.controls("player1", "red")).toBe(true);

    const promote = SovereignChess.fromSetup(Setup.parseFen("16/16/16/16/16/16/16/16/16/16/7wp8/16/16/16/16/8wk7 1 w b -"));
    const promoted = promote.play(normalMove("h6", "h7", "king"));
    expect(promoted.board.kings.has(sq("h7"))).toBe(true);
    expect(promoted.board.kings.has(sq("i1"))).toBe(false);
  });

  test("makeLegalMoves omits empty entries", () => {
    const pos = SovereignChess.fromSetup(Setup.parseFen("16/16/16/16/16/16/16/16/16/16/16/16/16/16/1wk14/16 1 w b -"));
    expect([...makeLegalMoves(pos).keys()].map(squareName)).toEqual(["b2"]);
  });
});
