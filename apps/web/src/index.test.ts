import solidRenderer from "@astrojs/solid-js/server.js";
import { experimental_AstroContainer as AstroContainer } from "astro/container";
import { expect, test } from "vitest";

import AnalysisPage from "./pages/analysis.astro";
import EditorPage from "./pages/editor.astro";
import IndexPage from "./pages/index.astro";
import PlayPage from "./pages/play.astro";
import RulesPage from "./pages/rules.astro";

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

  expect(html).toContain("<title>Open Sovereign Chess</title>");
  expect(html).toContain('<html lang="en">');
  expect(html).toContain("Open Sovereign Chess");
  expect(html).toContain(
    "Play, study, and build positions for Sovereign Chess.",
  );
  expect(html).toContain('href="/play"');
  expect(html).toContain('href="/analysis"');
  expect(html).toContain('href="/editor"');
  expect(html).toContain('href="/rules"');
  expect(html).toContain("Official game site");
  expect(html).toContain("https://www.infinitepigames.com/sovereign-chess");
});

test("global pages render the global header mode", async () => {
  const container = await createContainer();

  const homeHtml = await container.renderToString(IndexPage, {
    partial: false,
    request: new Request("https://playsovereignchess.com/"),
  });
  const rulesHtml = await container.renderToString(RulesPage, {
    partial: false,
    request: new Request("https://playsovereignchess.com/rules"),
  });

  expect(homeHtml).toContain('data-header-mode="global"');
  expect(rulesHtml).toContain('data-header-mode="global"');
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

  expect(playHtml).toContain('data-header-mode="gameplay"');
  expect(analysisHtml).toContain('data-header-mode="workspace"');
  expect(editorHtml).toContain('data-header-mode="workspace"');
});
