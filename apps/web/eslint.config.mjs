import eslint from "@eslint/js";
import { defineConfig } from "eslint/config";
import tseslint from "typescript-eslint";
import astroEslint from "eslint-plugin-astro";

export default defineConfig(
  eslint.configs.recommended,
  tseslint.configs.recommended,
  ...astroEslint.configs.recommended,
  {
    languageOptions: {
      globals: { document: true },
    },
  },
);
