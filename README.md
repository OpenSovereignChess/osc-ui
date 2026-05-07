# Open Sovereign Chess

Monorepo for the web client, the future Dart server, and the shared contracts that keep them aligned.

## Layout

```text
apps/
  web/                  Astro + Solid frontend
  server/               Dart realtime server scaffold
packages/
  protocol/             Shared message contracts and examples
  rules-fixtures/       Shared test cases for TS and Dart rule engines
docs/
  architecture/         Notes on boundaries and migration plans
```

## Commands

Run these from the repo root:

| Command        | Action |
| :------------- | :----- |
| `pnpm install` | Install workspace dependencies |
| `pnpm dev`     | Start the Astro web app in `apps/web` |
| `pnpm build`   | Build the Astro web app |
| `pnpm preview` | Preview the Astro build |
| `pnpm check`   | Run `astro check` for the web app |
| `pnpm lint`    | Run ESLint for the web app |
| `pnpm test`    | Run the web test suite once |
| `pnpm format`  | Format the web app |

## Direction

The intended architecture is:

- `apps/web` handles UI, local interaction state, and websocket client behavior.
- `apps/server` will become the authoritative Dart backend for matchmaking, rooms, clocks, and move validation.
- `packages/protocol` defines JSON message shapes and examples used by both sides.
- `packages/rules-fixtures` holds shared test fixtures so the TypeScript and Dart rule implementations can be checked against the same scenarios.

The next structural step after this repo move is to separate the current mixed browser/game state in the web app into:

- pure game rules
- board interaction state
- DOM/layout state
