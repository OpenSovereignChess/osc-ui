import { Setup, SovereignChess } from "@osc/rules";
import { expect, test } from "vitest";
import { promotionRolesForMove } from "./promotion.ts";

test("returns legal promotion roles for a pawn moving into the promotion zone", () => {
  const position = SovereignChess.fromSetup(
    Setup.parseFen(
      "16/16/16/16/16/16/16/16/16/16/7wp8/16/16/16/16/8wk7 1 w b -",
    ),
  );

  expect(promotionRolesForMove(position, "h6", "h7")).toEqual([
    "queen",
    "rook",
    "bishop",
    "knight",
    "king",
  ]);
});

test("does not return promotion roles for a pawn move outside the promotion zone", () => {
  const position = SovereignChess.fromSetup(
    Setup.parseFen(
      "16/16/16/16/16/16/16/16/16/16/16/11wp4/16/16/16/8wk7 1 w b -",
    ),
  );

  expect(promotionRolesForMove(position, "l4", "l5")).toEqual([]);
});

test("does not return promotion roles for non-pawns", () => {
  const position = SovereignChess.fromSetup(
    Setup.parseFen(
      "16/16/16/16/16/16/16/16/16/16/7wq8/16/16/16/16/8wk7 1 w b -",
    ),
  );

  expect(promotionRolesForMove(position, "h6", "h7")).toEqual([]);
});

test("only returns king promotion while in check", () => {
  const position = SovereignChess.fromSetup(
    Setup.parseFen(
      "aqabvrvnbrbnbb1bkbbbnbrynyrsbsq/aranvpvpbpbpbpbpbpbpbpbpypypsnsr/nbnp12opob/nqnp12opoq/crcp12rprr/cncp12rprn/gbgp12pppb/gqgp12pppq/yqyp12vpvq/ybyp12vpvb/onop5wp6npnn/orop10bq1npnr/rqrp12cpcq/rbrp7wp4cpcb/srsnppppwpwpwp1wp1wpwpgpgpanar/sqsbprpnwrwnwbwqwkwbwnwrgngrabaq 1 w b CELNceln 0",
    ),
  );

  expect(promotionRolesForMove(position, "h6", "h7")).toEqual(["king"]);
});
