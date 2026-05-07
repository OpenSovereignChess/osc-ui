# Web App

Astro + Solid frontend for Open Sovereign Chess.

## Commands

Run these from the repo root:

| Command        | Action |
| :------------- | :----- |
| `pnpm dev`     | Start the web app at `localhost:4321` |
| `pnpm build`   | Build the web app |
| `pnpm preview` | Preview the production build |
| `pnpm check`   | Run `astro check` |
| `pnpm lint`    | Run ESLint |
| `pnpm test`    | Run Vitest once |
| `pnpm format`  | Format the app with Prettier |

## Current Focus

This app still contains the existing board UI and client-side rules code. The next refactor should separate:

- pure game rules from browser concerns
- board interaction state from authoritative match state
- local-only play flow from future online session flow
