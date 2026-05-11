import { expect, test } from "vitest";
import { initial, read, write } from "./fen.ts";

test("write/read initial", () => {
  expect(write(read(initial))).toEqual(initial);
});

test("read initial", () => {
  const pieces = read(initial);
  expect(pieces.get("a16")?.role).toEqual("queen");
  expect(pieces.get("b16")?.role).toEqual("bishop");
});
