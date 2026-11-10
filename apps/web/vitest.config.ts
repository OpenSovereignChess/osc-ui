/// <reference types="vitest/config" />
import { getViteConfig } from "astro/config";
import type { ViteUserConfig } from "vitest/config";

export default getViteConfig({
  test: {
    // Let reactive board tests use the same mocked browser runtime in stores.
    server: { deps: { inline: ["solid-js"] } },
  },
} as Parameters<typeof getViteConfig>[0] & ViteUserConfig);
