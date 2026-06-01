import { expect, test } from "vitest";
import { hasDragIntent, shouldCancelSameSquareDrop } from "@osc/board-core";

test("click-selecting a piece on its origin square does not cancel selection", () => {
  const hasIntent = hasDragIntent([100, 100], [102, 101]);

  expect(hasIntent).toBe(false);
  expect(shouldCancelSameSquareDrop("e4", "e4", hasIntent)).toBe(false);
});

test("dragging a piece and dropping it back on its origin square cancels the drag", () => {
  const hasIntent = hasDragIntent([100, 100], [116, 100]);

  expect(hasIntent).toBe(true);
  expect(shouldCancelSameSquareDrop("e4", "e4", hasIntent)).toBe(true);
});
