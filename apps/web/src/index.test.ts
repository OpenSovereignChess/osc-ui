import { experimental_AstroContainer as AstroContainer } from "astro/container";
import { expect, test } from "vitest";

import IndexPage from "./pages/index.astro";

test("home page renders", async () => {
  const container = await AstroContainer.create();

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
