import { renderToString } from "solid-js/web";
import { expect, test } from "vitest";

import Header from "./Header.tsx";

test("global mode renders brand, nav, profile, and active route", () => {
  const html = renderToString(() => <Header mode="global" currentPath="/" />);

  expect(html).toContain("PLAY SOVEREIGN CHESS");
  expect(html).toContain('aria-label="Play Sovereign Chess home"');
  expect(html).toContain('href="/play"');
  expect(html).toContain('href="/analysis"');
  expect(html).toContain('href="/editor"');
  expect(html).toContain('href="/profile"');
  expect(html).toContain("Profile");
  expect(html).toContain('aria-current="page"');
  expect(html).toContain("osc-header__link--active");
});

test("board mode renders compact nav, blank center, and profile only", () => {
  const html = renderToString(() => (
    <Header mode="board" currentPath="/play" />
  ));

  expect(html).toContain('data-header-mode="board"');
  expect(html).toContain("[PSC ▾]");
  expect(html).toContain('class="osc-header__board-spacer"');
  expect(html).toContain('href="/profile"');
  expect(html).toContain("Profile");
});

test("ARIA popup state is exposed only for global mobile menu and compact nav", () => {
  const globalHtml = renderToString(() => (
    <Header mode="global" currentPath="/" />
  ));
  const boardHtml = renderToString(() => (
    <Header mode="board" currentPath="/play" />
  ));

  expect(globalHtml).toContain('aria-controls="osc-global-menu"');
  expect(globalHtml).toContain('aria-haspopup="true"');
  expect(globalHtml).toContain('aria-expanded="false"');
  expect(boardHtml).toContain('aria-controls="osc-compact-nav"');
  expect(boardHtml).toContain('aria-haspopup="true"');
  expect(boardHtml).toContain('aria-expanded="false"');
});
