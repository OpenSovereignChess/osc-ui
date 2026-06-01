// @ts-check
import { defineConfig } from "astro/config";
import { fileURLToPath } from "node:url";
import AstroPWA from "@vite-pwa/astro";
import UnoCSS from "unocss/astro";

import solidJs from "@astrojs/solid-js";

// https://astro.build/config
export default defineConfig({
  vite: {
    resolve: {
      alias: {
        "@osc/board-core": fileURLToPath(
          new URL("../../packages/board-core/src/index.ts", import.meta.url),
        ),
        "@osc/board-solid": fileURLToPath(
          new URL("../../packages/board-solid/src/index.ts", import.meta.url),
        ),
      },
    },
  },
  integrations: [
    AstroPWA(),
    UnoCSS({
      injectReset: true,
    }),
    solidJs(),
  ],
});
