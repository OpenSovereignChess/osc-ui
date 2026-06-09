# Board Core

Framework-agnostic board primitives for Open Sovereign Chess.

This package is the landing zone for adapted Chessground-style imperative board
logic. It should not import Solid, Astro, React, or any UI framework.

Owns:

- board orientation and 16x16 coordinate helpers
- square key to board position conversion
- DOM-position to square-key conversion
- pointer event normalization
- drag intent and drop decision helpers
- board-renderer-facing TypeScript types

Does not own:

- components, CSS, or renderer lifecycle
- game rules, legal move generation, turns, sessions, or clocks
- websocket state, matchmaking, persistence, or app providers

Renderer packages such as `@osc/board-solid` may depend on this package. This
package should stay independent of `@osc/rules` so it can be reused by editors,
analysis views, and any future renderer.
