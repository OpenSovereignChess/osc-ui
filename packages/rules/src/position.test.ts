import { describe, expect, test } from "vitest";
import { PlayException, normalMove } from "./models.ts";
import { Setup } from "./setup.ts";
import { SovereignChess } from "./position.ts";
import { expectNames, sq } from "./test-utils.ts";

describe("Position", () => {
  test("legalMoves", () => {
    const pos = SovereignChess.fromSetup(Setup.parseFen("16/16/16/16/16/16/16/16/16/16/16/16/16/16/1wk14/16 1 w b -"));
    expectNames(pos.legalMoves.get(sq("b2"))!, ["a1", "b1", "c1", "a2", "c2", "a3", "b3", "c3"]);
  });

  test("legalMoves, cannot capture own piece", () => {
    const pos = SovereignChess.fromSetup(Setup.parseFen("16/16/16/16/16/16/16/16/16/16/16/16/16/16/8bpwp6/8wk7 1 w b -"));
    expect(pos.legalMoves.get(sq("i1"))!.has(sq("i2"))).toBe(true);
    expect(pos.legalMoves.get(sq("i1"))!.has(sq("j2"))).toBe(false);
  });

  test("legalMoves, cannot capture a neutral piece", () => {
    const pos = SovereignChess.fromSetup(Setup.parseFen("bk15/16/16/16/16/16/16/16/16/16/16/16/16/16/8pp7/8wk7 1 w b -"));
    expect(pos.board.colorBelongsTo("player1", "pink")).toBe(false);
    expect(pos.board.colorBelongsTo("player2", "pink")).toBe(false);
    expect(pos.legalMoves.get(sq("i1"))!.has(sq("i2"))).toBe(false);
  });

  test("legalMoves, occupied color square", () => {
    const pos = SovereignChess.fromSetup(Setup.parseFen("16/16/16/16/4bp11/16/16/16/16/16/16/16/11wp4/16/16/8wk7 1 w b -"));
    expect(pos.legalMoves.get(sq("l4"))!.has(sq("l5"))).toBe(false);
  });

  test("legalMoves, can capture a piece on colored square", () => {
    const pos = SovereignChess.fromSetup(Setup.parseFen("16/16/16/16/16/16/9bq6/16/16/9wq6/16/16/16/16/16/8wk7 1 w b -"));
    expect(pos.legalMoves.get(sq("j7"))!.has(sq("j10"))).toBe(true);
  });

  test("legalMoves, cannot move onto a square of its own color", () => {
    const pos = SovereignChess.fromSetup(Setup.parseFen("8bq7/16/16/16/16/16/16/16/16/16/16/16/16/16/16/8bk7 2 w b -"));
    expect(pos.legalMoves.get(sq("i16"))!.has(sq("i9"))).toBe(false);
  });

  test("legalMoves, piece on colored square can move to other square of same color", () => {
    const pos = SovereignChess.fromSetup(Setup.parseFen("8bk7/16/16/16/16/16/16/16/7wk8/16/16/16/16/16/16/16 1 w b -"));
    expect(pos.legalMoves.get(sq("h8"))!.has(sq("i9"))).toBe(true);
  });

  test("legalMoves, king cannot move into check", () => {
    let pos = SovereignChess.fromSetup(Setup.parseFen("16/16/16/16/16/16/16/16/16/16/16/16/16/16/br15/8wk7 1 w b -"));
    expect(pos.legalMoves.get(sq("i1"))!.has(sq("i2"))).toBe(false);

    pos = SovereignChess.fromSetup(
      Setup.parseFen(
        "aqabvrvnbrbn1bq3yp1yrsbsq/aranvpvpbpbpbp1bnbk3yp1sr/1np10sn1opob/nq2np12/crcp9bb2rprr/cncp3wq1bp6rprn/gbgp12pppb/gqgp12pppq/yqyp8wb3vpvq/ybyp12vpvb/onop10np1npnn/orop5nr8/rqrp6wp5cpcq/rbrp12cpcb/srsnppppwpwpwpwp1wpwpwpgpgpanar/sqsbprpnwrwnwb1wk1wnwrgngrabaq 2 w b CELN",
      ),
    );
    expect(pos.legalMoves.get(sq("j15"))!.has(sq("k15"))).toBe(false);
  });

  test("legalMoves, checked king can move to a square of the same color as the checker", () => {
    const pos = SovereignChess.fromSetup(Setup.parseFen("8bk7/16/16/16/16/16/7bq8/16/16/7wk8/16/16/16/16/16/16 1 w b -"));
    expect(pos.legalMoves.get(sq("h7"))!.has(sq("h8"))).toBe(true);
  });

  test("legalMoves, piece cannot move if king in check", () => {
    const pos = SovereignChess.fromSetup(Setup.parseFen("8bk7/wq15/16/16/16/16/16/16/16/16/16/16/16/16/16/br7wk7 1 w b -"));
    expect(pos.legalMoves.get(sq("a15"))!.isEmpty).toBe(true);
    expect(pos.legalMoves.get(sq("i1"))!.isNotEmpty).toBe(true);
  });

  test("legalMoves, can escape check by controlling checking piece", () => {
    let pos = SovereignChess.fromSetup(Setup.parseFen("8bk7/16/6rq9/16/16/16/16/16/16/12bn3/16/11wp4/16/16/16/8wk7 2 w b -"));
    expect(pos.isCheck).toBe(true);
    expect(pos.board.colorControlledBy("player1", "red")).toBe(true);
    expect(pos.legalMoves.get(sq("i16"))!.isNotEmpty).toBe(true);
    expect(pos.legalMoves.get(sq("m7"))!.isNotEmpty).toBe(true);

    pos = pos.play(normalMove("m7", "l5"));
    expect(pos.isCheck).toBe(false);
    expect(pos.board.colorControlledBy("player1", "red")).toBe(false);
    expect(pos.board.colorControlledBy("player2", "red")).toBe(true);
  });

  test("legalMoves, can escape check by controlling checking piece - chain of control", () => {
    let pos = SovereignChess.fromSetup(
      Setup.parseFen("8bk7/16/5wq10/16/11bp4/5np4yp5/16/16/16/16/7gp8/16/16/16/16/8wk1vq5 1 w b -"),
    );
    expect(pos.isCheck).toBe(true);
    expect(pos.board.colorControlledBy("player2", "violet")).toBe(true);
    expect(pos.legalMoves.get(sq("i1"))!.isNotEmpty).toBe(true);
    expect(pos.legalMoves.get(sq("f14"))!.isNotEmpty).toBe(true);
    pos = pos.play(normalMove("f14", "f11"));
    expect(pos.isCheck).toBe(false);
    expect(pos.board.colorControlledBy("player1", "violet")).toBe(true);
    expect(pos.board.colorControlledBy("player2", "violet")).toBe(false);

    pos = SovereignChess.fromSetup(
      Setup.parseFen("8bk7/16/5rq10/16/11bp4/5np4yp5/16/16/16/16/7gp8/11wp4/16/16/16/8wk1vq5 1 w b -"),
    );
    expect(pos.isCheck).toBe(true);
    expect(pos.board.colorControlledBy("player2", "violet")).toBe(true);
    expect(pos.legalMoves.get(sq("i1"))!.isNotEmpty).toBe(true);
    expect(pos.legalMoves.get(sq("f14"))!.isNotEmpty).toBe(true);
    pos = pos.play(normalMove("f14", "f11"));
    expect(pos.isCheck).toBe(false);
    expect(pos.board.colorControlledBy("player1", "violet")).toBe(true);
    expect(pos.board.colorControlledBy("player2", "violet")).toBe(false);

    pos = SovereignChess.fromSetup(
      Setup.parseFen(
        "aqabvrvnbrbnbb1bk1bnbrynyrsbsq/aranvpvpbpbpbpbp1bpbp1ypyp1sr/nbnp10sn1opob/nqnp6bp5opoq/crcp9bp2rprr/cncp8bq3rprn/1gp12pppb/gq2gp3gbwb5pppq/yqyp12vpvq/ybyp4bb7vpvb/onop6wq5npnn/orop12npnr/rqrp4wpwpwp5cpcq/rbrp10an1cpcb/srsnppppwpwp3wp1wp1gp1ar/sqsbprpnwrwn1aq1wkwn1gr1ab1 1 w b celn 32",
      ),
    );
    expect(pos.isCheck).toBe(true);
    expectNames(pos.legalMoves.get(sq("i9"))!, ["g7"]);
  });

  test("legalMoves, can escape check by promoting pawn to king", () => {
    const pos = SovereignChess.fromSetup(
      Setup.parseFen(
        "aqabvrvnbrbnbb1bkbbbnbrynyrsbsq/aranvpvpbpbpbpbpbpbpbpbpypypsnsr/nbnp12opob/nqnp12opoq/crcp12rprr/cncp12rprn/gbgp12pppb/gqgp12pppq/yqyp12vpvq/ybyp12vpvb/onop5wp6npnn/orop10bq1npnr/rqrp12cpcq/rbrp7wp4cpcb/srsnppppwpwpwp1wp1wpwpgpgpanar/sqsbprpnwrwnwbwqwkwbwnwrgngrabaq 1 w b CELNceln 0",
      ),
    );
    expect(pos.isCheck).toBe(true);
    expectNames(pos.legalMoves.get(sq("h6"))!, ["h7"]);
  });

  test("legalMoves, blocker should remain pinned to king", () => {
    const pos = SovereignChess.fromSetup(Setup.parseFen("8bk7/16/16/16/16/16/16/16/16/16/16/16/16/16/16/br3wq3wk7 1 w b -"));
    expect(pos.legalMoves.get(sq("e1"))!.has(sq("e2"))).toBe(false);
    expect(pos.legalMoves.get(sq("e1"))!.has(sq("f1"))).toBe(true);
  });

  test("play, move onto colored squares", () => {
    const pos = SovereignChess.fromSetup(Setup.parseFen("16/16/16/16/3bp12/16/16/16/16/16/16/16/11wp4/16/16/8wk7 1 w b -"));
    expect(pos.board.armyManager.controls("player1", "red")).toBe(false);
    const result = pos.play(normalMove("l4", "l5"));
    expect(result.board.white.has(sq("l5"))).toBe(true);
    expect(result.board.armyManager.controls("player1", "red")).toBe(true);
  });

  test("play, move off of colored squares", () => {
    const pos = SovereignChess.fromSetup(Setup.parseFen("16/16/16/16/3bp12/16/16/16/16/16/16/11wp4/16/16/16/8wk7 1 w b -"));
    expect(pos.board.armyManager.controls("player1", "red")).toBe(true);
    const result = pos.play(normalMove("l5", "l6"));
    expect(result.board.white.has(sq("l6"))).toBe(true);
    expect(result.board.armyManager.controls("player1", "red")).toBe(false);
  });

  test("play, promoting to king", () => {
    const pos = SovereignChess.fromSetup(Setup.parseFen("16/16/16/16/16/16/16/16/16/16/7wp8/16/16/16/16/8wk7 1 w b -"));
    expect(pos.board.kings.has(sq("i1"))).toBe(true);
    const result = pos.play(normalMove("h6", "h7", "king"));
    expect(result.board.pawns.has(sq("h6"))).toBe(false);
    expect(result.board.kings.has(sq("h7"))).toBe(true);
    expect(result.board.kings.has(sq("i1"))).toBe(false);
  });

  test("play, controlled pawn promotes to king", () => {
    const pos = SovereignChess.fromSetup(Setup.parseFen("16/16/16/16/16/16/16/16/16/5rp10/16/11wp4/16/16/16/8wk7 1 w b -"));
    expect(pos.board.kings.has(sq("i1"))).toBe(true);
    expect(pos.board.armyManager.colorOf("player1")).toBe("white");
    const result = pos.play(normalMove("f7", "g7", "king"));
    expect(result.board.kings.has(sq("g7"))).toBe(true);
    expect(result.board.kings.has(sq("i1"))).toBe(false);
    expect(result.board.armyManager.colorOf("player1")).toBe("red");
  });

  test("play, cannot promote to anything other than a king when in check", () => {
    const pos = SovereignChess.fromSetup(
      Setup.parseFen(
        "aqabvrvnbrbnbb1bkbbbnbrynyrsbsq/aranvpvpbpbpbpbpbpbpbpbpypypsnsr/nbnp12opob/nqnp12opoq/crcp12rprr/cncp12rprn/gbgp12pppb/gqgp12pppq/yqyp12vpvq/ybyp12vpvb/onop5wp6npnn/orop10bq1npnr/rqrp12cpcq/rbrp7wp4cpcb/srsnppppwpwpwp1wp1wpwpgpgpanar/sqsbprpnwrwnwbwqwkwbwnwrgngrabaq 1 w b CELNceln 0",
      ),
    );
    expect(pos.isCheck).toBe(true);
    expect(() => pos.play(normalMove("h6", "h7", "queen"))).toThrow(PlayException);
  });

  test("defect", () => {
    const pos = SovereignChess.fromSetup(Setup.parseFen("bk15/16/16/16/16/16/16/16/16/16/16/4wp11/16/16/16/8wk7 1 w b -"));
    expect(pos.board.kingOf("player1")).toBe(sq("i1"));
    expect(pos.board.ownedColorOf("player1")).toBe("white");
    const result = pos.defect("navy");
    expect(result.board.ownedColorOf("player1")).toBe("navy");
    expect(result.board.kingOf("player1")).toBe(sq("i1"));
    expect(result.board.pieceAt(sq("i1"))).toEqual({ color: "navy", role: "king" });
    expect(result.board.controlledColorsOf("player1").size).toBe(0);
  });

  test("legalCastlingMoves from initial position", () => {
    const pos = SovereignChess.fromSetup(Setup.standard);
    expect(pos.legalCastlingMoves.get(sq("i1"))!.isEmpty).toBe(true);
    expect(pos.legalCastlingMoves.get(sq("i16"))).toBeUndefined();
    expect(pos.canCastle).toBe(false);
  });

  test("legalCastlingMoves", () => {
    let pos = SovereignChess.fromSetup(
      Setup.parseFen("2vr1br3bk2br1yr2/16/16/16/16/16/16/16/16/16/16/16/16/16/16/2pr1wr3wk2wr1gr2 1 w b CELNceln"),
    );
    expectNames(pos.legalCastlingMoves.get(sq("i1"))!, ["f1", "g1", "h1", "j1", "k1"]);
    expect(pos.legalCastlingMoves.get(sq("i16"))).toBeUndefined();
    expect(pos.canCastle).toBe(true);

    pos = SovereignChess.fromSetup(
      Setup.parseFen("2vr1br3bk2br1yr2/16/16/16/16/16/16/16/16/16/16/16/16/16/16/2pr1wr3wk2wr1gr2 2 w b CELNceln"),
    );
    expect(pos.legalCastlingMoves.get(sq("i1"))).toBeUndefined();
    expectNames(pos.legalCastlingMoves.get(sq("i16"))!, ["f16", "g16", "h16", "j16", "k16"]);

    pos = SovereignChess.fromSetup(
      Setup.parseFen("2vr1brbn2bk2br1yr2/16/16/16/16/16/16/16/16/16/16/16/16/16/16/2pr1wr3wkwb1wr1gr2 1 w b CELNceln"),
    );
    expectNames(pos.legalCastlingMoves.get(sq("i1"))!, ["f1", "g1", "h1"]);

    pos = SovereignChess.fromSetup(
      Setup.parseFen("2vr1brbn2bk2br1yr2/16/16/16/16/16/16/16/16/16/16/16/16/16/16/2pr1wr3wkwb1wr1gr2 2 w b CELNceln"),
    );
    expectNames(pos.legalCastlingMoves.get(sq("i16"))!, ["j16", "k16"]);

    pos = SovereignChess.fromSetup(
      Setup.parseFen("2vr5bk7/16/16/16/16/8bp7/16/16/16/16/16/16/16/16/16/2pr1wr3wkwb1wr1gr2 2 w b celn"),
    );
    expectNames(pos.legalCastlingMoves.get(sq("i16"))!, ["d16", "e16", "f16", "g16", "h16"]);
  });

  test("legalCastlingMoves detects check", () => {
    let pos = SovereignChess.fromSetup(
      Setup.parseFen("2vr1br3bk2br1yr2/16/16/16/16/16/16/16/16/8bq7/16/16/16/16/16/2pr1wr3wk2wr1gr2 1 w b CELNceln"),
    );
    expect(pos.isCheck).toBe(true);
    expect(pos.legalCastlingMoves.get(sq("i1"))).toBeUndefined();

    pos = SovereignChess.fromSetup(
      Setup.parseFen("2vr1br3bk2br1yr2/16/16/16/16/16/16/16/16/6bq9/16/16/16/16/16/2pr1wr3wk2wr1gr2 1 w b CELNceln"),
    );
    expectNames(pos.legalCastlingMoves.get(sq("i1"))!, ["h1", "j1", "k1"]);
  });

  test("playCastle", () => {
    const pos = SovereignChess.fromSetup(
      Setup.parseFen("2vr1br3bk2br1yr2/16/16/16/16/16/16/16/16/16/16/16/16/16/16/2pr1wr3wk2wr1gr2 1 w b CELNceln"),
    ).playCastle(normalMove("i1", "j1"));
    expect(pos.board.pieceAt(sq("j1"))).toEqual({ color: "white", role: "king" });
    expect(pos.board.pieceAt(sq("i1"))).toEqual({ color: "white", role: "rook" });
    expect(pos.castles.rookOf("player1", "king")).toBeUndefined();
    expect(pos.castles.rookOf("player1", "queen")).toBeUndefined();
  });

  test("moving a king or rook updates castle", () => {
    let pos = SovereignChess.fromSetup(
      Setup.parseFen("2vr1br3bk2br1yr2/16/16/16/16/16/16/16/16/16/16/16/16/16/16/2pr1wr3wk2wr1gr2 1 w b CELNceln"),
    ).play(normalMove("i1", "i2"));
    expect(pos.castles.rookOf("player1", "king")).toBeUndefined();
    expect(pos.castles.rookOf("player1", "queen")).toBeUndefined();

    pos = SovereignChess.fromSetup(
      Setup.parseFen("2vr1br3bk2br1yr2/16/16/16/16/16/16/16/16/16/16/16/16/16/16/2pr1wr3wk2wr1gr2 1 w b CELNceln"),
    ).play(normalMove("e1", "e2"));
    expect(pos.castles.rookOf("player1", "king")).toBe(sq("l1"));
    expect(pos.castles.rookOf("player1", "queen")).toBe(sq("c1"));

    pos = SovereignChess.fromSetup(
      Setup.parseFen("2vr1br3bk2br1yr2/16/16/16/16/16/16/16/16/16/7wp8/16/16/16/16/2pr1wr3wk2wr1gr2 1 w b CELNceln"),
    ).play(normalMove("h6", "h7", "king"));
    expect(pos.castles.rookOf("player1", "king")).toBeUndefined();
    expect(pos.castles.rookOf("player1", "queen")).toBeUndefined();
  });
});
