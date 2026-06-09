# Open Sovereign Chess

Monorepo for the web client, the future Dart server, and the shared contracts that keep them aligned.

## Layout

```text
apps/
  web/                  Astro + Solid frontend
  server/               Dart realtime server scaffold
packages/
  board-core/           Framework-neutral board geometry, pointer, and drag helpers
  board-solid/          Solid board renderer built on board-core
  protocol/             Language-neutral websocket schemas and examples
  rules/                TypeScript Sovereign Chess rules engine
  rules-fixtures/       Cross-language rule engine test fixtures
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
- `packages/rules` owns pure TypeScript Sovereign Chess rules: board state, setup/FEN, attacks, legal moves, castling, promotion, defection, and notation helpers.
- `packages/board-core` owns board-view math and input primitives that do not depend on Solid, Astro, DOM layout components, sessions, or game rules.
- `packages/board-solid` owns the reusable Solid board view. It renders snapshots and reports user intent, but the web app owns session state and rule decisions.
- `packages/protocol` defines language-neutral JSON message shapes and examples used by the client and future server.
- `packages/rules-fixtures` holds shared test fixtures so the TypeScript and Dart rule implementations can be checked against the same scenarios.

The web app can compose those packages, but package dependencies should stay one-way:

- `@osc/board-solid` may depend on `@osc/board-core`.
- `apps/web` may depend on `@osc/rules`, `@osc/board-core`, and `@osc/board-solid`.
- Shared packages should not import from `apps/*`.
- `packages/rules`, `packages/board-core`, `packages/protocol`, and `packages/rules-fixtures` should stay independent of UI frameworks.

See [docs/architecture/monorepo.md](docs/architecture/monorepo.md) for package boundaries and placement guidance.
