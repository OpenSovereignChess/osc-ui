import { describe, expect, test } from "vitest";
import { initialBoardFEN } from "./constants.ts";
import { Board } from "./board.ts";
import { Setup } from "./setup.ts";
import { SovereignChess } from "./position.ts";
import { expectNames, sq } from "./test-utils.ts";

describe("Board", () => {
  test("setPieceAt", () => {
    let board = Board.empty.setPieceAt(sq("a1"), { color: "white", role: "king" });
    expect(board.pieceAt(sq("a1"))).toEqual({ color: "white", role: "king" });

    board = board.setPieceAt(sq("a1"), { color: "white", role: "queen" });
    expect(board.pieceAt(sq("a1"))).toEqual({ color: "white", role: "queen" });
  });

  test("parseFen", () => {
    const board = Board.parseFen("16/16/16/16/16/16/16/16/16/16/16/16/16/16/16/bk15");
    expect(board.pieceAt(sq("a1"))).toEqual({ color: "black", role: "king" });

    const board2 = Board.parseFen(initialBoardFEN);
    expect(board2.pieceAt(sq("a1"))).toEqual({ color: "slate", role: "queen" });
    expect(board2.pieceAt(sq("p16"))).toEqual({ color: "slate", role: "queen" });
  });

  test("attacksTo", () => {
    const pos = SovereignChess.fromSetup(
      Setup.parseFen(
        "aqabvrvnbrbn1bq3yp1yrsbsq/aranvpvpbpbpbp1bnbk3yp1sr/1np10sn1opob/nq2np12/crcp9bb2rprr/cncp3wq1bp6rprn/gbgp12pppb/gqgp12pppq/yqyp8wb3vpvq/ybyp12vpvb/onop10np1npnn/orop5nr8/rqrp6wp5cpcq/rbrp12cpcb/srsnppppwpwpwpwp1wpwpwpgpgpanar/sqsbprpnwrwnwb1wk1wnwrgngrabaq 2 w b CELN",
      ),
    );
    expectNames(pos.board.attacksTo(sq("i14"), "player1"), ["f11"]);
    expectNames(pos.board.attacksTo(sq("k15"), "player1"), ["l16"]);
  });
});
