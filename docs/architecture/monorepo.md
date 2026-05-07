# Monorepo Notes

## Current state

The original single Astro app has been moved to `apps/web` with minimal internal change.

## Why this shape

- one repo keeps solo-dev overhead low
- Dart server support makes shared runtime code less realistic
- shared protocol and shared fixtures are the stable cross-language contracts

## Next refactor targets

1. Extract pure client-side rules from mixed browser state in `apps/web/src/game/logic`.
2. Introduce a session boundary in the web app:
   - local session
   - online session
3. Define the websocket message envelope in `packages/protocol`.
4. Add fixture-driven tests that both TS and Dart implementations can consume.
