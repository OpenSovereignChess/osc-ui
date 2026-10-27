import { expect, test } from "vitest";
import { tabIndexForKey } from "./tabNavigation.ts";

test.each([
  ["ArrowRight", 0, 3, 1],
  ["ArrowRight", 2, 3, 0],
  ["ArrowLeft", 2, 3, 1],
  ["ArrowLeft", 0, 3, 2],
  ["Home", 2, 3, 0],
  ["End", 0, 3, 2],
  ["ArrowRight", 0, 2, 1],
  ["ArrowLeft", 0, 2, 1],
  ["ArrowRight", 0, 1, 0],
  ["ArrowLeft", 0, 1, 0],
  ["ArrowRight", 0, 0, undefined],
  ["Tab", 1, 3, undefined],
  ["Enter", 1, 3, undefined],
  [" ", 1, 3, undefined],
  ["ArrowDown", 1, 3, undefined],
])("%s at index %i with %i tabs yields %s", (key, index, count, expected) => {
  expect(tabIndexForKey(key, index, count)).toBe(expected);
});
