# Monorepo Notes

## Current state

The original single Astro app now lives in `apps/web`. The repo has started
extracting reusable game and board code into packages while keeping the Go
server in the same workspace.

## Why this shape

- one repo keeps solo-dev overhead low
- Go keeps the realtime server small, compiled, resource-friendly, and easy to
  colocate with SQLite on one instance
- transport definitions live alongside the web client and Go server
- browser-specific board rendering can move independently from pure rules

## Package boundaries

### `apps/web`

Astro + Solid application shell and browser runtime.

Owns:

- pages, layout, navigation, styles, and app composition
- local game/editor/analysis sessions
- websocket client behavior when online play is added
- translating user input into session actions
- composing `@osc/rules`, `@osc/board-core`, and `@osc/board-solid`

Does not own reusable rule algorithms or framework-neutral board primitives.
When browser/game state becomes reusable outside the app, move it behind a
package boundary instead of importing app files from packages.

### `apps/server`

Go realtime server.

Owns:

- invite-only rooms, transient WebSocket clients/presence, and broadcasting
- SQLite-only persistence for anonymous users/sessions, rooms, durable seats,
  and ordered action history, including restart/reconnect recovery
- membership, turn, sequence, and action-shape validation (full Go rules are future work)
- transport endpoints compatible with the web client's message types

`cmd/server/main.go` owns database opening/closing and explicitly wires
`httpapi.NewHandler(rooms.NewStore(db), db)`. Constructors never open a database
or fall back to an in-memory repository. `rooms.Store` keeps only live clients
and channels in memory and delegates durable operations through its small
repository interface. Disconnects do not release seats. Tests use temporary
SQLite files and real anonymous identities; test-local wrappers cover failures.
Keep `apps/server/internal` for Go's compiler-enforced import boundary.
Completed matches/results and authoritative Go rule validation remain planned;
see [the phased server rules plan](server-rules-plan.md).

The first online milestone is casual/untrusted play: the TypeScript client uses
`@osc/rules`, while the Go server validates room membership, turn/sequence
shape, and broadcasts accepted events. Transport definitions live in
`apps/web/src/game/online/protocol.ts` and
`apps/server/internal/protocol/protocol.go` and must be kept aligned. The server
should not depend on TypeScript browser packages.

### `packages/rules`

TypeScript Sovereign Chess rules engine.

Owns:

- rule models: sides, colors, pieces, roles, squares, and moves
- board state, setup/FEN, square sets, attacks, legal moves, move application
- variant-specific behavior such as colored-square control, promotion, castling,
  defection, check, checkmate, and notation helpers

Does not own:

- UI state, DOM geometry, pointer/drag events, Solid/Astro components
- websocket envelopes, matchmaking, rooms, clocks, persistence, or server IO

This package should stay deterministic and side-effect light. Prefer plain data
inputs/outputs so both `apps/web` and future tooling can call it directly.

### `packages/board-core`

Framework-neutral board interaction primitives.

Owns:

- 16x16 board geometry constants
- square key and coordinate conversion helpers
- DOM-position to square-key calculations
- pointer event normalization and drag-intent/drop helper functions
- board-view types shared by renderers

Does not own:

- Solid/Astro/React components or CSS
- Sovereign Chess rules, legal move decisions, turns, clocks, or sessions
- app providers, websocket state, or persistence

This package may use generic DOM geometry/event types because its job is board
input math, but it should not bind listeners, render UI, or decide whether a move
is legal.

### `packages/board-solid`

Reusable Solid board renderer built on `@osc/board-core`.

Owns:

- board, piece, highlight, and coordinate rendering
- board CSS and piece sprite styling
- drag/select UI behavior that reports intent through props
- Solid component props and renderer-facing convenience exports

Does not own:

- game sessions, providers, websocket state, matchmaking, or clocks
- rule validation beyond calling prop callbacks such as `canMove`
- Sovereign Chess engine internals

The web app passes board snapshots and callbacks into this package. The package
should remain usable for editor, analysis, local play, and future online play.

## Dependency direction

Allowed package dependencies:

- `packages/board-solid` -> `packages/board-core`
- `apps/web` -> `packages/rules`, `packages/board-core`, `packages/board-solid`

Avoid:

- imports from `apps/*` inside `packages/*`
- `packages/rules` importing UI or transport code
- `packages/board-core` importing rules or renderer code
- `packages/board-solid` importing app session/provider code

## Next refactor targets

1. Continue replacing duplicated app-local rule helpers in `apps/web/src/game/rules`
   with `@osc/rules` APIs where the package behavior is ready.
2. Keep the web session boundary explicit:
   - local session
   - editor/analysis session
   - future online session
3. Keep the web and Go transport definitions aligned as online play evolves.
4. Add direct workspace dependencies for board packages in `apps/web` once the
   aliases are no longer only source-level development wiring.
