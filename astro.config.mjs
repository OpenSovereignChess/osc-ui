// @ts-check
import { defineConfig } from 'astro/config';
import AstroPWA from '@vite-pwa/astro';
import UnoCSS from 'unocss/astro';

import solidJs from '@astrojs/solid-js';

// https://astro.build/config
export default defineConfig({
  integrations: [AstroPWA(), UnoCSS({
    injectReset: true,
  }), solidJs()],
});