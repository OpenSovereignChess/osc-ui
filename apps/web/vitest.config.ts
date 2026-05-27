/// <reference types="vitest/config" />
import { getViteConfig } from "astro/config";
import type { ViteUserConfig } from "vitest/config";

export default getViteConfig({
  test: {},
} as Parameters<typeof getViteConfig>[0] & ViteUserConfig);
