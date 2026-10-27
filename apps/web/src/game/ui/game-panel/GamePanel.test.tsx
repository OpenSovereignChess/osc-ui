import { renderToString } from "solid-js/web";
import { expect, test } from "vitest";
import GamePanel, { type GamePanelTab } from "./GamePanel.tsx";

function tabs(): GamePanelTab[] {
  return [
    { id: "moves", label: "Moves", content: () => <p>No moves yet.</p> },
    { id: "actions", label: "Actions", content: () => <button>Castle</button> },
    {
      id: "position",
      label: "Position",
      content: () => <textarea aria-label="Load FEN">saved input</textarea>,
    },
  ];
}

test("renders linked, accessible tabs with Moves selected initially", () => {
  const html = renderToString(() => (
    <GamePanel label="Analysis tools" tabs={tabs()} initialTabId="moves" />
  ));

  expect(html).toContain('role="tablist" aria-label="Analysis tools"');
  const buttons = html.match(/<button[^>]*role="tab"[^>]*>/g)!;
  const panels = html.match(/<div[^>]*role="tabpanel"[^>]*>/g)!;
  expect(buttons).toHaveLength(3);
  expect(panels).toHaveLength(3);
  for (let index = 0; index < buttons.length; index += 1) {
    const button = buttons[index];
    const panel = panels[index];
    const buttonId = button.match(/ id="([^"]+)"/)![1];
    const panelId = panel.match(/ id="([^"]+)"/)![1];
    expect(button).toContain(`aria-controls="${panelId}"`);
    expect(panel).toContain(`aria-labelledby="${buttonId}"`);
    expect(button).toContain(`aria-selected="${index === 0}"`);
    expect(button).toContain(`tabindex="${index === 0 ? 0 : -1}"`);
    expect(/\shidden(?:[\s=>])/.test(panel)).toBe(index !== 0);
  }
  expect(html).toContain("Moves");
  expect(html).toContain("Actions");
  expect(html).toContain("Position");
});

test("keeps all content rendered even when its panel is inactive", () => {
  let contentMounts = 0;
  const definitions = tabs().map((tab) => ({
    ...tab,
    content: () => {
      contentMounts += 1;
      return tab.content();
    },
  }));
  const html = renderToString(() => (
    <GamePanel label="Tools" tabs={definitions} initialTabId="position" />
  ));

  expect(contentMounts).toBe(3);
  expect(html).toContain("No moves yet.");
  expect(html).toContain("Castle");
  expect(html).toContain("saved input");
  const buttons = html.match(/<button[^>]*role="tab"[^>]*>/g)!;
  expect(buttons[0]).toContain('aria-selected="false"');
  expect(buttons[2]).toContain('aria-selected="true"');
});

test("uses unique tab and panel IDs for multiple instances", () => {
  const html = renderToString(() => (
    <>
      <GamePanel label="First game" tabs={tabs()} initialTabId="moves" />
      <GamePanel label="Second game" tabs={tabs()} initialTabId="moves" />
    </>
  ));
  const ids = [...html.matchAll(/ id="([^"]+)"/g)].map((match) => match[1]);
  expect(ids).toHaveLength(12);
  expect(new Set(ids).size).toBe(ids.length);
});
