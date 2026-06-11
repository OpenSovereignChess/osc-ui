# Rules

Pure TypeScript Sovereign Chess rules engine.

This package owns the game model and deterministic rule behavior:

- board representation, square helpers, piece/color/side models
- setup and FEN parsing/serialization
- attack generation, legal move generation, and move application
- castling, promotion, defection, check, and checkmate logic
- notation and small rule utility helpers

Keep this package independent of UI, DOM events, Solid/Astro components, websocket
sessions, matchmaking, clocks, persistence, and server transport. Callers should
pass plain rule inputs in and receive plain rule outputs back.

Tests that describe behavior shared with the future Go implementation should be
mirrored in `packages/rules-fixtures` when they become stable cross-language
cases. Package-local tests can cover TypeScript implementation details.
