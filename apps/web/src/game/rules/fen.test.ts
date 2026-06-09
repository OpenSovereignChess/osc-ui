import { expect, test } from "vitest";
import { emptyBoardFEN, initialFEN } from "@osc/rules";
import { initial, read, readSetup, write, writeSetup } from "./fen.ts";

test("write/read initial", () => {
  expect(write(read(initial))).toEqual(initial);
});

test("read initial", () => {
  const pieces = read(initial);
  expect(pieces.get("a16")?.role).toEqual("queen");
  expect(pieces.get("b16")?.role).toEqual("bishop");
});

test("readSetup accepts full setup FEN", () => {
  expect(readSetup(initialFEN).fen).toEqual(initialFEN);
});

test("readSetup accepts board-only FEN with defaults", () => {
  expect(readSetup(initial).fen).toEqual(`${initial} 1 w b - 0`);
});

test("readSetup rejects invalid FEN", () => {
  expect(() => readSetup("not-a-fen")).toThrow();
});

test("writeSetup serializes editor pieces as full setup FEN", () => {
  expect(writeSetup(read(emptyBoardFEN))).toEqual(`${emptyBoardFEN} 1 w b - 0`);
});
