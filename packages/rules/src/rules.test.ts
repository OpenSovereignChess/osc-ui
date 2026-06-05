import { describe, expect, test } from "vitest";
import {
  ArmyManager,
  Board,
  Castles,
  PlayException,
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
const expectSet = (actual: SquareSet, expected: SquareSet) => expect(actual.equals(expected)).toBe(true);

function set(...squares: string[]): SquareSet {
  return SquareSet.fromSquares(squares.map(sq));
}

describe("SquareSet", () => {
  test("constructs from squares and exposes raw words", () => {
    expectSet(SquareSet.fromSquare(sq("a1")), new SquareSet(0, 0, 0, 0, 0, 0, 0, 1));
    expectSet(SquareSet.fromSquares([sq("a1"), sq("b1")]), new SquareSet(0, 0, 0, 0, 0, 0, 0, 3));
    expect(new SquareSet(0, 0, 0, 0, 0, 0, 0x1, 0).has(sq("a3"))).toBe(true);
    expect(new SquareSet(0, 0, 0, 0, 0, 0x80, 0, 0).has(sq("h5"))).toBe(true);
  });

  test("stores and iterates squares in order", () => {
    const result = set("a1", "a3", "a6", "p9", "h13", "p16");
    expect(names(result)).toEqual(["a1", "a3", "a6", "p9", "h13", "p16"]);
    expect(result.has(sq("a6"))).toBe(true);
    expect(result.withSquare(sq("h8")).withoutSquare(sq("h8")).has(sq("h8"))).toBe(false);
  });

  test("shift, flip, and mirror preserve Dart-style board order", () => {
    expect(names(SquareSet.fromSquare(sq("a1")).shl(16))).toEqual(["a2"]);
    expect(names(SquareSet.fromSquare(sq("a2")).shr(16))).toEqual(["a1"]);
    expect(names(SquareSet.fromSquare(sq("a1")).flipVertical())).toEqual(["a16"]);
    expect(names(SquareSet.fromSquare(sq("a1")).mirrorHorizontal())).toEqual(["p1"]);
  });

  test("bit operations and first square", () => {
    expectSet(set("a1", "m4").xor(set("c14", "p1")), set("a1", "p1", "m4", "c14"));
    expectSet(set("a1", "b1", "c1").intersect(set("b1", "c1", "d1")), set("b1", "c1"));
    expectSet(set("a1", "b1", "c1").diff(set("b1", "c1", "d1")), set("a1"));
    expect(squareName(set("h1", "d1").lsb()!)).toBe("d1");
    expect(set("h1", "d1").moreThanOne).toBe(true);
    expect(set("h1").singleSquare).toBe(sq("h1"));
  });

  test("ray constants match expected directions", () => {
    expect(names(SquareSet.northRay)).toEqual(["a2", "a3", "a4", "a5", "a6", "a7", "a8", "a9"]);
    expect(names(SquareSet.eastRay)).toEqual(["b1", "c1", "d1", "e1", "f1", "g1", "h1", "i1"]);
    expect(names(SquareSet.southRay)).toEqual(["p8", "p9", "p10", "p11", "p12", "p13", "p14", "p15"]);
    expect(names(SquareSet.westRay)).toEqual(["h16", "i16", "j16", "k16", "l16", "m16", "n16", "o16"]);
    expect(names(SquareSet.northeastRay)).toEqual(["b2", "c3", "d4", "e5", "f6", "g7", "h8", "i9"]);
    expect(names(SquareSet.northwestRay)).toEqual(["h2", "g3", "f4", "e5", "d6", "c7", "b8", "a9"]);
    expect(names(SquareSet.southeastRay)).toEqual(["p8", "o9", "n10", "m11", "l12", "k13", "j14", "i15"]);
    expect(names(SquareSet.southwestRay)).toEqual(["h8", "i9", "j10", "k11", "l12", "m13", "n14", "o15"]);
  });
});

describe("attacks", () => {
  test("king, knight, pawn attacks", () => {
    expect(names(kingAttacks(sq("f3")))).toEqual(["e2", "f2", "g2", "e3", "g3", "e4", "f4", "g4"]);
    expect(names(knightAttacks(sq("d4")))).toEqual(["c2", "e2", "b3", "f3", "b5", "f5", "c6", "e6"]);
    expect(names(pawnAttacks(sq("d4")))).toEqual(["e3", "c5", "e5"]);
    expect(names(pawnAttacks(sq("l4")))).toEqual(["k3", "k5", "m5"]);
  });

  test("pawn attacks match first-ring and quadrant-edge cases", () => {
    expect(names(pawnAttacks(sq("d13")))).toEqual(["c12", "e12", "e14"]);
    expect(names(pawnAttacks(sq("l13")))).toEqual(["k12", "m12", "k14"]);
    expect(names(pawnAttacks(sq("d1")))).toEqual(["c2", "e2"]);
    expect(names(pawnAttacks(sq("d16")))).toEqual(["c15", "e15"]);
    expect(names(pawnAttacks(sq("a4")))).toEqual(["b3", "b5"]);
    expect(names(pawnAttacks(sq("p13")))).toEqual(["o12", "o14"]);
    expect(names(pawnAttacks(sq("l16")))).toEqual(["k15", "m15"]);
    expect(names(pawnAttacks(sq("h2")))).toEqual(["g3", "i3"]);
    expect(names(pawnAttacks(sq("i4")))).toEqual(["h5", "j5"]);
    expect(names(pawnAttacks(sq("d9")))).toEqual(["e8", "e10"]);
    expect(names(pawnAttacks(sq("i15")))).toEqual(["h14", "j14"]);
    expect(names(pawnAttacks(sq("l9")))).toEqual(["k8", "k10"]);
    expect(names(pawnAttacks(sq("l8")))).toEqual(["k7", "k9"]);
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

  test("round-trips castling rights and rejects invalid castling fields", () => {
    let setup = Setup.parseFen("16/16/16/16/16/16/16/16/16/16/16/16/16/16/16/wk15 1 w b - 0");
    expect(setup.castlingRights.equals(SquareSet.empty)).toBe(true);
    expect(setup.fen).toBe("16/16/16/16/16/16/16/16/16/16/16/16/16/16/16/wk15 1 w b - 0");

    setup = Setup.parseFen("bk15/16/16/16/16/16/16/16/16/16/16/16/16/16/16/wk15 1 w b CELNceln 0");
    expect(setup.fen).toBe("bk15/16/16/16/16/16/16/16/16/16/16/16/16/16/16/wk15 1 w b CELNceln 0");

    setup = Setup.parseFen("bk15/16/16/16/16/16/16/16/16/16/16/16/16/16/16/wk15 1 w b CLen 0");
    expect(setup.fen).toBe("bk15/16/16/16/16/16/16/16/16/16/16/16/16/16/16/wk15 1 w b CLen 0");
    expect(() => Setup.parseFen("16/16/16/16/16/16/16/16/16/16/16/16/16/16/16/wk15 1 w b XYZ 0")).toThrow();
  });
});

describe("ArmyManager and Board", () => {
  test("tracks owned and controlled armies", () => {
    let manager = new ArmyManager({
      p1Owned: "white",
      p2Owned: "black",
      controlledBy: new Map([
        ["red", "white"],
        ["navy", "white"],
        ["green", "black"],
        ["yellow", "black"],
      ]),
    });

    expect(manager.colorOf("player1")).toBe("white");
    expect(manager.colorOf("player2")).toBe("black");
    expect([...manager.controlledColorsOf("player1")].sort()).toEqual(["navy", "red"]);
    expect([...manager.controlledColorsOf("player2")].sort()).toEqual(["green", "yellow"]);

    manager = manager.setOwnedColor("player1", "green");
    expect(manager.colorOf("player1")).toBe("white");
    manager = manager.setOwnedColor("player1", "red");
    expect(manager.colorOf("player1")).toBe("red");
  });

  test("sets pieces and computes attackers", () => {
    let board = Board.empty.setPieceAt(sq("a1"), { color: "white", role: "king" });
    expect(board.pieceAt(sq("a1"))).toEqual({ color: "white", role: "king" });
    board = board.setPieceAt(sq("a1"), { color: "white", role: "queen" });
    expect(board.pieceAt(sq("a1"))).toEqual({ color: "white", role: "queen" });

    const pos = SovereignChess.fromSetup(
      Setup.parseFen(
        "aqabvrvnbrbn1bq3yp1yrsbsq/aranvpvpbpbpbp1bnbk3yp1sr/1np10sn1opob/nq2np12/crcp9bb2rprr/cncp3wq1bp6rprn/gbgp12pppb/gqgp12pppq/yqyp8wb3vpvq/ybyp12vpvb/onop10np1npnn/orop5nr8/rqrp6wp5cpcq/rbrp12cpcb/srsnppppwpwpwpwp1wpwpwpgpgpanar/sqsbprpnwrwnwb1wk1wnwrgngrabaq 2 w b CELN",
      ),
    );
    expect(names(pos.board.attacksTo(sq("i14"), "player1"))).toEqual(["f11"]);
    expect(names(pos.board.attacksTo(sq("k15"), "player1"))).toEqual(["l16"]);
  });
});

describe("castles", () => {
  test("builds standard castling state from setup", () => {
    const castles = Castles.fromSetup(Setup.standard);
    expect(castles.castlingRights.equals(SquareSet.castlingRooks)).toBe(true);
    expect(squareName(castles.rookOf("player1", "queen")!)).toBe("e1");
    expect(squareName(castles.rookOf("player1", "king")!)).toBe("l1");
    expect(squareName(castles.rookOf("player2", "queen")!)).toBe("e16");
    expect(squareName(castles.rookOf("player2", "king")!)).toBe("l16");
    expect(names(castles.path("player1", "queen"))).toEqual(["f1", "g1", "h1"]);
    expect(names(castles.path("player1", "king"))).toEqual(["j1", "k1"]);
    expect(names(castles.path("player2", "queen"))).toEqual(["f16", "g16", "h16"]);
    expect(names(castles.path("player2", "king"))).toEqual(["j16", "k16"]);
  });

  test("falls back to outer rooks after discarding inner rooks", () => {
    let castles = Castles.standard.discardRookAt(sq("l1"));
    expect(squareName(castles.rookOf("player1", "king")!)).toBe("n1");
    expect(names(castles.path("player1", "king"))).toEqual(["j1", "k1", "l1", "m1"]);

    castles = Castles.standard.discardRookAt(sq("e16"));
    expect(squareName(castles.rookOf("player2", "queen")!)).toBe("c16");
    expect(names(castles.path("player2", "queen"))).toEqual(["d16", "e16", "f16", "g16", "h16"]);
  });

  test("discarding a side clears only that side", () => {
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
});

describe("pawn moves", () => {
  test("moves toward the board center and handles two-step rings", () => {
    expect(names(pawnMoves(sq("d4"), SquareSet.empty))).toEqual(["e4", "d5"]);
    expect(names(pawnMoves(sq("n3"), SquareSet.empty))).toEqual(["m3", "n4"]);
    expect(names(pawnMoves(sq("d1"), SquareSet.empty))).toEqual(["e1", "d2", "d3"]);
    expect(names(pawnMoves(sq("a6"), SquareSet.empty))).toEqual(["b6", "c6", "a7"]);
  });

  test("handles occupied, first-ring, and second-ring pawn moves", () => {
    expect(pawnMoves(sq("d4"), set("d5", "e4")).isEmpty).toBe(true);
    expect(names(pawnMoves(sq("c1"), SquareSet.empty))).toEqual(["d1", "c2", "c3"]);
    expect(names(pawnMoves(sq("n16"), SquareSet.empty))).toEqual(["n14", "n15", "m16"]);
    expect(names(pawnMoves(sq("a14"), SquareSet.empty))).toEqual(["a13", "b14", "c14"]);
    expect(names(pawnMoves(sq("o3"), SquareSet.empty))).toEqual(["m3", "n3", "o4"]);
    expect(pawnMoves(sq("c1"), set("d1", "c2")).isEmpty).toBe(true);
    expect(names(pawnMoves(sq("c2"), SquareSet.empty))).toEqual(["d2", "c3", "c4"]);
  });
});

describe("position", () => {
  test("generates legal king moves", () => {
    const pos = SovereignChess.fromSetup(Setup.parseFen("16/16/16/16/16/16/16/16/16/16/16/16/16/16/1wk14/16 1 w b -"));
    expect(names(pos.legalMoves.get(sq("b2"))!)).toEqual(["a1", "b1", "c1", "a2", "c2", "a3", "b3", "c3"]);
  });

  test("prevents neutral capture and own-color square move", () => {
    let pos = SovereignChess.fromSetup(Setup.parseFen("16/16/16/16/16/16/16/16/16/16/16/16/16/16/8bpwp6/8wk7 1 w b -"));
    expect(pos.legalMoves.get(sq("i1"))!.has(sq("i2"))).toBe(true);
    expect(pos.legalMoves.get(sq("i1"))!.has(sq("j2"))).toBe(false);

    pos = SovereignChess.fromSetup(Setup.parseFen("bk15/16/16/16/16/16/16/16/16/16/16/16/16/16/8pp7/8wk7 1 w b -"));
    expect(pos.board.colorBelongsTo("player1", "pink")).toBe(false);
    expect(pos.legalMoves.get(sq("i1"))!.has(sq("i2"))).toBe(false);

    pos = SovereignChess.fromSetup(Setup.parseFen("8bq7/16/16/16/16/16/16/16/16/16/16/16/16/16/16/8bk7 2 w b -"));
    expect(pos.legalMoves.get(sq("i16"))!.has(sq("i9"))).toBe(false);
  });

  test("handles colored-square occupancy rules", () => {
    let pos = SovereignChess.fromSetup(
      Setup.parseFen("16/16/16/16/4bp11/16/16/16/16/16/16/16/11wp4/16/16/8wk7 1 w b -"),
    );
    expect(pos.legalMoves.get(sq("l4"))!.has(sq("l5"))).toBe(false);

    pos = SovereignChess.fromSetup(Setup.parseFen("16/16/16/16/16/16/9bq6/16/16/9wq6/16/16/16/16/16/8wk7 1 w b -"));
    expect(pos.legalMoves.get(sq("j7"))!.has(sq("j10"))).toBe(true);

    pos = SovereignChess.fromSetup(Setup.parseFen("8bk7/16/16/16/16/16/16/16/7wk8/16/16/16/16/16/16/16 1 w b -"));
    expect(pos.legalMoves.get(sq("h8"))!.has(sq("i9"))).toBe(true);
  });

  test("handles check restrictions and king escape squares", () => {
    let pos = SovereignChess.fromSetup(Setup.parseFen("16/16/16/16/16/16/16/16/16/16/16/16/16/16/br15/8wk7 1 w b -"));
    expect(pos.legalMoves.get(sq("i1"))!.has(sq("i2"))).toBe(false);

    pos = SovereignChess.fromSetup(
      Setup.parseFen(
        "aqabvrvnbrbn1bq3yp1yrsbsq/aranvpvpbpbpbp1bnbk3yp1sr/1np10sn1opob/nq2np12/crcp9bb2rprr/cncp3wq1bp6rprn/gbgp12pppb/gqgp12pppq/yqyp8wb3vpvq/ybyp12vpvb/onop10np1npnn/orop5nr8/rqrp6wp5cpcq/rbrp12cpcb/srsnppppwpwpwpwp1wpwpwpgpgpanar/sqsbprpnwrwnwb1wk1wnwrgngrabaq 2 w b CELN",
      ),
    );
    expect(pos.legalMoves.get(sq("j15"))!.has(sq("k15"))).toBe(false);

    pos = SovereignChess.fromSetup(Setup.parseFen("8bk7/16/16/16/16/16/7bq8/16/16/7wk8/16/16/16/16/16/16 1 w b -"));
    expect(pos.legalMoves.get(sq("h7"))!.has(sq("h8"))).toBe(true);
  });

  test("only check responses can move while king is checked", () => {
    const pos = SovereignChess.fromSetup(Setup.parseFen("8bk7/wq15/16/16/16/16/16/16/16/16/16/16/16/16/16/br7wk7 1 w b -"));
    expect(pos.legalMoves.get(sq("a15"))!.isEmpty).toBe(true);
    expect(pos.legalMoves.get(sq("i1"))!.isNotEmpty).toBe(true);
  });

  test("can escape check by controlling checking piece", () => {
    let pos = SovereignChess.fromSetup(Setup.parseFen("8bk7/16/6rq9/16/16/16/16/16/16/12bn3/16/11wp4/16/16/16/8wk7 2 w b -"));
    let legalMoves = pos.legalMoves;
    expect(pos.isCheck).toBe(true);
    expect(pos.board.colorControlledBy("player1", "red")).toBe(true);
    expect(legalMoves.get(sq("i16"))!.isNotEmpty).toBe(true);
    expect(legalMoves.get(sq("m7"))!.isNotEmpty).toBe(true);

    pos = pos.play(normalMove("m7", "l5"));
    expect(pos.isCheck).toBe(false);
    expect(pos.board.colorControlledBy("player1", "red")).toBe(false);
    expect(pos.board.colorControlledBy("player2", "red")).toBe(true);
  });

  test("can escape check by controlling checking piece through control chains", () => {
    let pos = SovereignChess.fromSetup(
      Setup.parseFen("8bk7/16/5wq10/16/11bp4/5np4yp5/16/16/16/16/7gp8/16/16/16/16/8wk1vq5 1 w b -"),
    );
    let legalMoves = pos.legalMoves;
    expect(pos.isCheck).toBe(true);
    expect(pos.board.colorControlledBy("player2", "violet")).toBe(true);
    expect(legalMoves.get(sq("i1"))!.isNotEmpty).toBe(true);
    expect(legalMoves.get(sq("f14"))!.isNotEmpty).toBe(true);
    pos = pos.play(normalMove("f14", "f11"));
    expect(pos.isCheck).toBe(false);
    expect(pos.board.colorControlledBy("player1", "violet")).toBe(true);
    expect(pos.board.colorControlledBy("player2", "violet")).toBe(false);

    pos = SovereignChess.fromSetup(
      Setup.parseFen("8bk7/16/5rq10/16/11bp4/5np4yp5/16/16/16/16/7gp8/11wp4/16/16/16/8wk1vq5 1 w b -"),
    );
    legalMoves = pos.legalMoves;
    expect(pos.isCheck).toBe(true);
    expect(pos.board.colorControlledBy("player2", "violet")).toBe(true);
    expect(legalMoves.get(sq("i1"))!.isNotEmpty).toBe(true);
    expect(legalMoves.get(sq("f14"))!.isNotEmpty).toBe(true);
    pos = pos.play(normalMove("f14", "f11"));
    expect(pos.isCheck).toBe(false);
    expect(pos.board.colorControlledBy("player1", "violet")).toBe(true);
    expect(pos.board.colorControlledBy("player2", "violet")).toBe(false);

    pos = SovereignChess.fromSetup(
      Setup.parseFen(
        "aqabvrvnbrbnbb1bk1bnbrynyrsbsq/aranvpvpbpbpbpbp1bpbp1ypyp1sr/nbnp10sn1opob/nqnp6bp5opoq/crcp9bp2rprr/cncp8bq3rprn/1gp12pppb/gq2gp3gbwb5pppq/yqyp12vpvq/ybyp4bb7vpvb/onop6wq5npnn/orop12npnr/rqrp4wpwpwp5cpcq/rbrp10an1cpcb/srsnppppwpwp3wp1wp1gp1ar/sqsbprpnwrwn1aq1wkwn1gr1ab1 1 w b celn 32",
      ),
    );
    legalMoves = pos.legalMoves;
    expect(pos.isCheck).toBe(true);
    expect(names(legalMoves.get(sq("i9"))!)).toEqual(["g7"]);
  });

  test("can escape check by promoting pawn to king and keeps blockers pinned", () => {
    let pos = SovereignChess.fromSetup(
      Setup.parseFen(
        "aqabvrvnbrbnbb1bkbbbnbrynyrsbsq/aranvpvpbpbpbpbpbpbpbpbpypypsnsr/nbnp12opob/nqnp12opoq/crcp12rprr/cncp12rprn/gbgp12pppb/gqgp12pppq/yqyp12vpvq/ybyp12vpvb/onop5wp6npnn/orop10bq1npnr/rqrp12cpcq/rbrp7wp4cpcb/srsnppppwpwpwp1wp1wpwpgpgpanar/sqsbprpnwrwnwbwqwkwbwnwrgngrabaq 1 w b CELNceln 0",
      ),
    );
    expect(pos.isCheck).toBe(true);
    expect(names(pos.legalMoves.get(sq("h6"))!)).toEqual(["h7"]);

    pos = SovereignChess.fromSetup(Setup.parseFen("8bk7/16/16/16/16/16/16/16/16/16/16/16/16/16/16/br3wq3wk7 1 w b -"));
    expect(pos.legalMoves.get(sq("e1"))!.has(sq("e2"))).toBe(false);
    expect(pos.legalMoves.get(sq("e1"))!.has(sq("f1"))).toBe(true);
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

  test("moving off colored squares removes control and controlled pawns can promote to king", () => {
    let pos = SovereignChess.fromSetup(Setup.parseFen("16/16/16/16/3bp12/16/16/16/16/16/16/11wp4/16/16/16/8wk7 1 w b -"));
    expect(pos.board.armyManager.controls("player1", "red")).toBe(true);
    let result = pos.play(normalMove("l5", "l6"));
    expect(result.board.white.has(sq("l6"))).toBe(true);
    expect(result.board.armyManager.controls("player1", "red")).toBe(false);

    pos = SovereignChess.fromSetup(Setup.parseFen("16/16/16/16/16/16/16/16/16/5rp10/16/11wp4/16/16/16/8wk7 1 w b -"));
    expect(pos.board.kings.has(sq("i1"))).toBe(true);
    expect(pos.board.armyManager.colorOf("player1")).toBe("white");
    result = pos.play(normalMove("f7", "g7", "king"));
    expect(result.board.kings.has(sq("g7"))).toBe(true);
    expect(result.board.kings.has(sq("i1"))).toBe(false);
    expect(result.board.armyManager.colorOf("player1")).toBe("red");
  });

  test("enforces check promotion and defect rules", () => {
    let pos = SovereignChess.fromSetup(
      Setup.parseFen(
        "aqabvrvnbrbnbb1bkbbbnbrynyrsbsq/aranvpvpbpbpbpbpbpbpbpbpypypsnsr/nbnp12opob/nqnp12opoq/crcp12rprr/cncp12rprn/gbgp12pppb/gqgp12pppq/yqyp12vpvq/ybyp12vpvb/onop5wp6npnn/orop10bq1npnr/rqrp12cpcq/rbrp7wp4cpcb/srsnppppwpwpwp1wp1wpwpgpgpanar/sqsbprpnwrwnwbwqwkwbwnwrgngrabaq 1 w b CELNceln 0",
      ),
    );
    expect(pos.isCheck).toBe(true);
    expect(() => pos.play(normalMove("h6", "h7", "queen"))).toThrow(PlayException);

    pos = SovereignChess.fromSetup(Setup.parseFen("bk15/16/16/16/16/16/16/16/16/16/16/4wp11/16/16/16/8wk7 1 w b -"));
    const defected = pos.defect("navy");
    expect(defected.board.ownedColorOf("player1")).toBe("navy");
    expect(squareName(defected.board.kingOf("player1")!)).toBe("i1");
    expect(defected.board.pieceAt(sq("i1"))).toEqual({ color: "navy", role: "king" });
    expect(defected.board.controlledColorsOf("player1").size).toBe(0);
  });

  test("generates and plays castling moves", () => {
    let pos = SovereignChess.fromSetup(Setup.standard);
    expect(pos.legalCastlingMoves.get(sq("i1"))!.isEmpty).toBe(true);
    expect(pos.legalCastlingMoves.get(sq("i16"))).toBeUndefined();
    expect(pos.canCastle).toBe(false);

    pos = SovereignChess.fromSetup(
      Setup.parseFen("2vr1br3bk2br1yr2/16/16/16/16/16/16/16/16/16/16/16/16/16/16/2pr1wr3wk2wr1gr2 1 w b CELNceln"),
    );
    expect(names(pos.legalCastlingMoves.get(sq("i1"))!)).toEqual(["f1", "g1", "h1", "j1", "k1"]);
    expect(pos.canCastle).toBe(true);

    const castled = pos.playCastle(normalMove("i1", "j1"));
    expect(castled.board.pieceAt(sq("j1"))).toEqual({ color: "white", role: "king" });
    expect(castled.board.pieceAt(sq("i1"))).toEqual({ color: "white", role: "rook" });
    expect(castled.castles.rookOf("player1", "king")).toBeUndefined();
    expect(castled.castles.rookOf("player1", "queen")).toBeUndefined();
  });

  test("castling is blocked by pieces and check", () => {
    let pos = SovereignChess.fromSetup(
      Setup.parseFen("2vr1brbn2bk2br1yr2/16/16/16/16/16/16/16/16/16/16/16/16/16/16/2pr1wr3wkwb1wr1gr2 1 w b CELNceln"),
    );
    expect(names(pos.legalCastlingMoves.get(sq("i1"))!)).toEqual(["f1", "g1", "h1"]);

    pos = SovereignChess.fromSetup(
      Setup.parseFen("2vr1br3bk2br1yr2/16/16/16/16/16/16/16/16/8bq7/16/16/16/16/16/2pr1wr3wk2wr1gr2 1 w b CELNceln"),
    );
    expect(pos.isCheck).toBe(true);
    expect(pos.legalCastlingMoves.get(sq("i1"))).toBeUndefined();

    pos = SovereignChess.fromSetup(
      Setup.parseFen("2vr1br3bk2br1yr2/16/16/16/16/16/16/16/16/6bq9/16/16/16/16/16/2pr1wr3wk2wr1gr2 1 w b CELNceln"),
    );
    expect(names(pos.legalCastlingMoves.get(sq("i1"))!)).toEqual(["h1", "j1", "k1"]);
  });

  test("supports player 2 and outer-rook castling cases", () => {
    let pos = SovereignChess.fromSetup(
      Setup.parseFen("2vr1br3bk2br1yr2/16/16/16/16/16/16/16/16/16/16/16/16/16/16/2pr1wr3wk2wr1gr2 2 w b CELNceln"),
    );
    expect(pos.legalCastlingMoves.get(sq("i1"))).toBeUndefined();
    expect(names(pos.legalCastlingMoves.get(sq("i16"))!)).toEqual(["f16", "g16", "h16", "j16", "k16"]);

    pos = SovereignChess.fromSetup(
      Setup.parseFen("2vr1brbn2bk2br1yr2/16/16/16/16/16/16/16/16/16/16/16/16/16/16/2pr1wr3wkwb1wr1gr2 2 w b CELNceln"),
    );
    expect(pos.legalCastlingMoves.get(sq("i1"))).toBeUndefined();
    expect(names(pos.legalCastlingMoves.get(sq("i16"))!)).toEqual(["j16", "k16"]);

    pos = SovereignChess.fromSetup(
      Setup.parseFen("2vr5bk7/16/16/16/16/8bp7/16/16/16/16/16/16/16/16/16/2pr1wr3wkwb1wr1gr2 2 w b celn"),
    );
    expect(pos.legalCastlingMoves.get(sq("i1"))).toBeUndefined();
    expect(names(pos.legalCastlingMoves.get(sq("i16"))!)).toEqual(["d16", "e16", "f16", "g16", "h16"]);
  });

  test("moving king, rook, or king-promotion updates castling rights", () => {
    let pos = SovereignChess.fromSetup(
      Setup.parseFen("2vr1br3bk2br1yr2/16/16/16/16/16/16/16/16/16/16/16/16/16/16/2pr1wr3wk2wr1gr2 1 w b CELNceln"),
    ).play(normalMove("i1", "i2"));
    expect(pos.castles.rookOf("player1", "king")).toBeUndefined();
    expect(pos.castles.rookOf("player1", "queen")).toBeUndefined();

    pos = SovereignChess.fromSetup(
      Setup.parseFen("2vr1br3bk2br1yr2/16/16/16/16/16/16/16/16/16/16/16/16/16/16/2pr1wr3wk2wr1gr2 1 w b CELNceln"),
    ).play(normalMove("e1", "e2"));
    expect(squareName(pos.castles.rookOf("player1", "king")!)).toBe("l1");
    expect(squareName(pos.castles.rookOf("player1", "queen")!)).toBe("c1");

    pos = SovereignChess.fromSetup(
      Setup.parseFen("2vr1br3bk2br1yr2/16/16/16/16/16/16/16/16/16/7wp8/16/16/16/16/2pr1wr3wk2wr1gr2 1 w b CELNceln"),
    ).play(normalMove("h6", "h7", "king"));
    expect(pos.castles.rookOf("player1", "king")).toBeUndefined();
    expect(pos.castles.rookOf("player1", "queen")).toBeUndefined();
  });

  test("makeLegalMoves omits empty entries", () => {
    const pos = SovereignChess.fromSetup(Setup.parseFen("16/16/16/16/16/16/16/16/16/16/16/16/16/16/1wk14/16 1 w b -"));
    expect([...makeLegalMoves(pos).keys()].map(squareName)).toEqual(["b2"]);
  });
});
