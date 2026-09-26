import { renderToString } from "solid-js/web";
import { expect, test } from "vitest";

import Header from "./Header.tsx";

test("global mode renders brand, nav, account, and active route", () => {
  const html = renderToString(() => (
    <Header mode="global" currentPath="/rules" />
  ));

  expect(html).toContain("SOVEREIGN CHESS");
  expect(html).toContain('href="/play"');
  expect(html).toContain('href="/analysis"');
  expect(html).toContain('href="/editor"');
  expect(html).toContain('href="/rules"');
  expect(html).toContain('href="/profile"');
  expect(html).toContain('aria-current="page"');
  expect(html).toContain("osc-header__link--active");
});

test("gameplay mode renders compact nav, telemetry, flip, and game menu trigger", () => {
  const html = renderToString(() => (
    <Header mode="gameplay" currentPath="/play" />
  ));

  expect(html).toContain("[SC ▾]");
  expect(html).toContain("03:42");
  expect(html).toContain("04:15");
  expect(html).toContain("WHITE REGIME");
  expect(html).toContain('aria-label="Flip board"');
  expect(html).toContain("Game Menu ▾");
  expect(html).toContain("MENU ▾");
});

test("workspace mode renders compact nav, route status, flip, and workspace menu trigger", () => {
  const html = renderToString(() => (
    <Header mode="workspace" currentPath="/analysis" />
  ));

  expect(html).toContain("[SC ▾]");
  expect(html).toContain("ANALYSIS BOARD");
  expect(html).toContain('aria-label="Flip board"');
  expect(html).toContain("Workspace Menu ▾");
  expect(html).toContain("MENU ▾");
  expect(html).not.toContain("03:42");
  expect(html).not.toContain("04:15");
  expect(html).not.toContain("WHITE REGIME");
});

test("menu triggers expose ARIA popup state", () => {
  const globalHtml = renderToString(() => (
    <Header mode="global" currentPath="/" />
  ));
  const gameplayHtml = renderToString(() => (
    <Header mode="gameplay" currentPath="/play" />
  ));
  const workspaceHtml = renderToString(() => (
    <Header mode="workspace" currentPath="/editor" />
  ));

  expect(globalHtml).toContain('aria-controls="osc-global-menu"');
  expect(globalHtml).toContain('aria-haspopup="true"');
  expect(globalHtml).toContain('aria-expanded="false"');
  expect(gameplayHtml).toContain('aria-controls="osc-compact-nav"');
  expect(gameplayHtml).toContain('aria-controls="osc-game-menu"');
  expect(gameplayHtml).toContain('aria-haspopup="true"');
  expect(workspaceHtml).toContain('aria-controls="osc-compact-nav"');
  expect(workspaceHtml).toContain('aria-controls="osc-workspace-menu"');
  expect(workspaceHtml).toContain('aria-haspopup="true"');
});
