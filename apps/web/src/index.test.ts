import solidRenderer from "@astrojs/solid-js/server.js";
import { experimental_AstroContainer as AstroContainer } from "astro/container";
import { expect, test } from "vitest";

import AnalysisPage from "./pages/analysis.astro";
import EditorPage from "./pages/editor.astro";
import IndexPage from "./pages/index.astro";
import PlayPage from "./pages/play.astro";

async function createContainer(): Promise<AstroContainer> {
  const container = await AstroContainer.create();
  container.addServerRenderer({ renderer: solidRenderer });
  container.addClientRenderer({
    name: "@astrojs/solid",
    entrypoint: "@astrojs/solid-js/client.js",
  });
  return container;
}

test("home page renders", async () => {
  const container = await createContainer();

  const html = await container.renderToString(IndexPage, {
    partial: false,
    request: new Request("https://playsovereignchess.com/"),
  });

  expect(html).toContain("<title>Play Sovereign Chess</title>");
  expect(html).toContain('<html lang="en">');
  expect(html).toContain("Play Sovereign Chess");
  expect(html).toContain("Play Sovereign Chess on a board built for it.");
  expect(html).toContain('href="/play"');
  expect(html).toContain('href="/analysis"');
  expect(html).toContain('href="/editor"');
  expect(html).toContain("Visit official game site");
  expect(html).toContain("https://www.infinitepigames.com/sovereign-chess");
  expect(html).toContain('class="home-board-preview board"');
  expect(html).toContain("home-hero-piece piece");
  expect(html).not.toContain("stub-board");
  expect(html).toContain("Questions or feedback?");
  expect(html).toContain("support@playsovereignchess.com");
  expect(html).toContain('href="mailto:support@playsovereignchess.com"');
  expect(html).toContain("Homepage tactical dock preview");
  expect(html).toContain("What works today");
  const removedCopy = [
    ["Open", "Sovereign", "Chess"].join(" "),
    ["open", "source"].join("-"),
    ["open", "digital", "companion"].join(" "),
    ["community", "project"].join(" "),
    `Zone ${"B"}`,
    `Zone ${"C"}`,
    ["Braun", "Swiss tools"].join("-"),
  ];
  for (const copy of removedCopy) {
    expect(html).not.toContain(copy);
  }
});

test("global pages render the global header mode", async () => {
  const container = await createContainer();

  const homeHtml = await container.renderToString(IndexPage, {
    partial: false,
    request: new Request("https://playsovereignchess.com/"),
  });
  expect(homeHtml).toContain('data-header-mode="global"');
  expect(homeHtml).toContain('aria-label="Play Sovereign Chess home"');
  expect(homeHtml).toContain("Play Sovereign Chess</span>");
});

test("board pages render the expected compact header modes", async () => {
  const container = await createContainer();

  const playHtml = await container.renderToString(PlayPage, {
    partial: false,
    request: new Request("https://playsovereignchess.com/play"),
  });
  const analysisHtml = await container.renderToString(AnalysisPage, {
    partial: false,
    request: new Request("https://playsovereignchess.com/analysis"),
  });
  const editorHtml = await container.renderToString(EditorPage, {
    partial: false,
    request: new Request("https://playsovereignchess.com/editor"),
  });

  expect(playHtml).toContain("<title>Play | Play Sovereign Chess</title>");
  expect(analysisHtml).toContain(
    "<title>Analysis | Play Sovereign Chess</title>",
  );
  expect(editorHtml).toContain(
    "<title>Board editor | Play Sovereign Chess</title>",
  );
  expect(playHtml).toContain('data-header-mode="board"');
  expect(analysisHtml).toContain('data-header-mode="board"');
  expect(editorHtml).toContain('data-header-mode="board"');
});
