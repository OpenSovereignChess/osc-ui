# Monorepo Notes

## Current state

The original single Astro app now lives in `apps/web`. The repo has started
extracting reusable game and board code into packages while keeping the Dart
server scaffold and shared contract directories in the same workspace.

## Why this shape

- one repo keeps solo-dev overhead low
- Dart server support makes shared runtime code less realistic
- shared protocol and shared fixtures are the stable cross-language contracts
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

Dart realtime server scaffold.

Expected to own:

- matchmaking, rooms, player presence, clocks, and authoritative game sessions
- server-side validation once the Dart rule implementation exists
- transport endpoints that speak the schemas in `packages/protocol`

The server should consume protocol schemas/examples and rule fixtures, but it
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
- fixture file formats intended to be shared with Dart

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

### `packages/protocol`

Language-neutral transport contract directory.

Owns:

- JSON-oriented websocket schemas
- message examples
- notes that can be consumed by the Astro/Solid client and Dart server

Does not own TypeScript-only runtime code, client session state, or server
business logic. Generated bindings can be added later, but the source of truth
should remain language-neutral.

### `packages/rules-fixtures`

Cross-language rule test fixture directory.

Owns:

- serialized positions
- legal move expectations
- move application outcomes
- special variant edge cases
- full game scenarios

Does not own executable engine code. Fixtures should be stable, explicit, and
usable by both TypeScript and Dart tests.

## Dependency direction

Allowed package dependencies:

- `packages/board-solid` -> `packages/board-core`
- `apps/web` -> `packages/rules`, `packages/board-core`, `packages/board-solid`
- `apps/web` and `apps/server` -> `packages/protocol` and `packages/rules-fixtures`
  once schemas/fixtures are consumed directly

Avoid:

- imports from `apps/*` inside `packages/*`
- `packages/rules` importing UI or transport code
- `packages/board-core` importing rules or renderer code
- `packages/board-solid` importing app session/provider code
- TypeScript-only assumptions in `packages/protocol` or `packages/rules-fixtures`

## Next refactor targets

1. Continue replacing duplicated app-local rule helpers in `apps/web/src/game/rules`
   with `@osc/rules` APIs where the package behavior is ready.
2. Keep the web session boundary explicit:
   - local session
   - editor/analysis session
   - future online session
3. Define the websocket message envelope in `packages/protocol`.
4. Add fixture-driven tests that both TypeScript and Dart implementations can
   consume.
5. Add direct workspace dependencies for board packages in `apps/web` once the
   aliases are no longer only source-level development wiring.
