import { getContainerRenderer } from "@astrojs/solid-js";
import { experimental_AstroContainer as AstroContainer } from "astro/container";
import { loadRenderers } from "astro:container";
import { expect, test } from "vitest";

import IndexPage from "./pages/index.astro";

test("home page renders", async () => {
  const renderers = await loadRenderers([getContainerRenderer()]);
  const container = await AstroContainer.create({ renderers });

  container.addClientRenderer({
    name: "@astrojs/solid-js",
    entrypoint: "@astrojs/solid-js/client.js",
  });

  const html = await container.renderToString(IndexPage, {
    partial: false,
    request: new Request("https://playsovereignchess.com/"),
  });

  expect(html).toContain("<title>playsovereignchess.com</title>");
  expect(html).toContain("<html lang=\"en\">");
  expect(html).toContain("client=\"only\"");
  expect(html).toContain("component-export=\"default\"");
});
