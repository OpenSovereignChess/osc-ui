import { renderToString } from "solid-js/web";
import { expect, test } from "vitest";
import AnalysisBoard from "./AnalysisBoard.tsx";

test("analysis exposes one real history and the three game tool tabs", () => {
  const html = renderToString(() => <AnalysisBoard />);

  expect(html.match(/role="tablist"/g)).toHaveLength(1);
  expect(html.match(/role="tab"/g)).toHaveLength(3);
  expect(html.match(/role="tabpanel"/g)).toHaveLength(3);
  expect(html.match(/class="analysis-history-list"/g)).toHaveLength(1);
  expect(html).toContain("No moves yet.");
  expect(html).toContain("Moves");
  expect(html).toContain("Actions");
  expect(html).toContain("Position");
  expect(html).not.toContain("12-regime matrix");
  expect(html).not.toContain("pending");
});

test("analysis retains navigation, special actions, and FEN tools in its panels", () => {
  const html = renderToString(() => <AnalysisBoard />);

  for (const label of [
    "Go to first move",
    "Go to previous move",
    "Go to next move",
    "Go to last move",
  ]) {
    expect(html).toContain(`aria-label="${label}"`);
  }
  expect(html).toContain('aria-label="Castle"');
  expect(html).toContain('aria-label="Defect"');
  expect(html).toContain('id="analysis-current-fen"');
  expect(html).toContain('id="analysis-load-fen"');
  expect(html).toContain("Copy FEN");
  expect(html).toContain("Edit position");
  expect(html).toContain("Load FEN");
});
