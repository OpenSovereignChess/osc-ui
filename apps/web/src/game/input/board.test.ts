import { createStore, unwrap } from "solid-js/store";
import { expect, test } from "vitest";
import { createBoardActions } from "./board.ts";
import { defaults } from "../state/state.ts";

function setup() {
  const initial = defaults();
  initial.position.pieces = new Map([
    ["e4", { color: "white", role: "rook" }],
    ["f4", { color: "white", role: "knight" }],
  ]);
  initial.position.movable = {
    free: false,
    color: "both",
    dests: new Map([
      ["e4", ["e5"]],
      ["f4", ["g6"]],
    ]),
  };
  const [state, setState] = createStore(initial);
  return { state, setState, board: createBoardActions(setState) };
}

test("selection never applies a legal move or changes position state", () => {
  const { state, board } = setup();
  const before = structuredClone(unwrap(state.position));

  board.selectSquare(state, "e4");
  expect(state.interaction.selected).toBe("e4");
  expect(board.canMove(state, "e4", "e5")).toBe(true);
  expect(board.selectSquare(state, "e5")).toBeUndefined();
  expect(state.interaction.selected).toBeUndefined();
  expect(state.position).toEqual(before);
});

test("invalid clicks clear selection, while another movable piece is selected", () => {
  const { state, board } = setup();
  board.selectSquare(state, "e4");
  board.selectSquare(state, "e6");
  expect(state.interaction.selected).toBeUndefined();

  board.selectSquare(state, "e4");
  board.selectSquare(state, "f4");
  expect(state.interaction.selected).toBe("f4");
  expect(board.canMove(state, "f4", "f4")).toBe(false);
  expect(board.canMove(state, "f4", "e6")).toBe(false);
});

test("same-square clicks retain drag selection but toggle click-only selection", () => {
  const { state, setState, board } = setup();
  board.selectSquare(state, "e4");
  board.selectSquare(state, "e4");
  expect(state.interaction.selected).toBe("e4");

  setState("interaction", "draggable", "enabled", false);
  board.selectSquare(state, "e4");
  expect(state.interaction.selected).toBeUndefined();

  setState("interaction", "selectable", "enabled", false);
  board.selectSquare(state, "e4");
  expect(state.interaction.selected).toBeUndefined();
});

test("free-edit selection and drag cancellation do not mutate pieces or turns", () => {
  const { state, setState, board } = setup();
  setState("position", "movable", { free: true, dests: undefined });
  const before = structuredClone(unwrap(state.position));

  board.selectSquare(state, "e4");
  expect(board.canMove(state, "e4", "p16")).toBe(true);
  board.selectSquare(state, "p16");
  board.selectSquare(state, "f4");
  board.cancelDrag();
  expect(state.interaction.selected).toBeUndefined();
  expect(state.position).toEqual(before);
});
