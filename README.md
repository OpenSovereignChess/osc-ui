# Open Sovereign Chess

Monorepo for the web client, the Go realtime server, and the shared contracts that keep them aligned.

## Layout

```text
apps/
  web/                  Astro + Solid frontend
  server/               Go realtime server
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
| `go run ./apps/server/cmd/server` | Start the Go server |
| `go test ./apps/server/...` | Run the Go server tests |
| `gofmt -s -w .` | Format the Go code |

## Direction

The intended architecture is:

- `apps/web` handles UI, local interaction state, and websocket client behavior.
- `apps/server` is the Go backend for invite-only realtime rooms, websocket transport, and later persistence.
- `packages/rules` owns pure TypeScript Sovereign Chess rules: board state, setup/FEN, attacks, legal moves, castling, promotion, defection, and notation helpers.
- `packages/board-core` owns board-view math and input primitives that do not depend on Solid, Astro, DOM layout components, sessions, or game rules.
- `packages/board-solid` owns the reusable Solid board view. It renders snapshots and reports user intent, but the web app owns session state and rule decisions.
- `packages/protocol` defines language-neutral JSON message shapes and examples used by the client and server.
- `packages/rules-fixtures` holds shared test fixtures so the TypeScript and future Go rule implementations can be checked against the same scenarios.

The first online milestone is invite-only casual play: one user creates a room,
shares a link, and both browsers see the same board and move history. The web
client uses the existing TypeScript rules engine at first; the server validates
room membership, turn/sequence shape, and broadcasts accepted room events. Full
server-side Sovereign Chess rule validation should be added before claiming
competitive or cheat-resistant play.

The web app can compose those packages, but package dependencies should stay one-way:

- `@osc/board-solid` may depend on `@osc/board-core`.
- `apps/web` may depend on `@osc/rules`, `@osc/board-core`, and `@osc/board-solid`.
- Shared packages should not import from `apps/*`.
- `packages/rules`, `packages/board-core`, `packages/protocol`, and `packages/rules-fixtures` should stay independent of UI frameworks.

See [docs/architecture/monorepo.md](docs/architecture/monorepo.md) for package boundaries and placement guidance.
