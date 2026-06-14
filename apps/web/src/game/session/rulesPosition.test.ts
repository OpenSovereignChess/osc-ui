import { expect, test } from "vitest";
import {
  initialRulesPosition,
  isRulesMoveLegal,
  legalDestsForSeat,
  playRulesMove,
} from "./rulesPosition.ts";

test("initial legal destinations are exposed only for the side to move", () => {
  const position = initialRulesPosition();
  const player1Dests = legalDestsForSeat(position, "player1");
  const player2Dests = legalDestsForSeat(position, "player2");
  const observerDests = legalDestsForSeat(position, "observer");

  expect(player1Dests.size).toBeGreaterThan(0);
  expect(player2Dests.size).toBe(0);
  expect(observerDests.size).toBe(0);
});

test("playRulesMove applies legal moves and rejects illegal moves", () => {
  const position = initialRulesPosition();
  const legalDests = legalDestsForSeat(position, "player1");
  const [orig, dests] = [...legalDests][0];
  const dest = dests[0];

  expect(isRulesMoveLegal(position, { orig, dest })).toBe(true);
  expect(playRulesMove(position, { orig, dest })?.turn).toBe("player2");
  expect(playRulesMove(position, { orig, dest: orig })).toBeUndefined();
});
