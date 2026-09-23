// @ts-check
import { defineConfig } from "astro/config";
import { fileURLToPath } from "node:url";
import AstroPWA from "@vite-pwa/astro";
import UnoCSS from "unocss/astro";

import solidJs from "@astrojs/solid-js";

// https://astro.build/config
export default defineConfig({
  site: "https://beta.playsovereignchess.com",
  trailingSlash: "never",
  vite: {
    resolve: {
      alias: {
        "@osc/board-core": fileURLToPath(
          new URL("../../packages/board-core/src/index.ts", import.meta.url),
        ),
        "@osc/board-solid": fileURLToPath(
          new URL("../../packages/board-solid/src/index.ts", import.meta.url),
        ),
        "@osc/rules": fileURLToPath(
          new URL("../../packages/rules/src/index.ts", import.meta.url),
        ),
      },
    },
  },
  integrations: [
    AstroPWA({
      registerType: "autoUpdate",
      manifest: {
        name: "Open Sovereign Chess",
        short_name: "OSC",
        description:
          "Offline-capable Sovereign Chess board, analysis, and editor tools.",
        theme_color: "#F4F0EA",
        background_color: "#F4F0EA",
        display: "standalone",
        start_url: "/",
        scope: "/",
        icons: [
          {
            src: "/favicon.svg",
            sizes: "any",
            type: "image/svg+xml",
            purpose: "any maskable",
          },
        ],
      },
      workbox: {
        navigateFallback: "/",
        globPatterns: ["**/*.{js,css,html,svg,webmanifest,woff2}"],
      },
    }),
    UnoCSS({
      injectReset: true,
    }),
    solidJs(),
  ],
});
