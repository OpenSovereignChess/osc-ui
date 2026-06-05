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
