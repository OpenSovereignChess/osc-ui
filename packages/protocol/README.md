# Protocol

Shared transport contract between the Astro/Solid client and the Dart server.

Keep this package language-neutral. It should contain JSON-oriented schemas, examples, and notes rather than TypeScript-only runtime code.

Owns:

- websocket message envelopes
- request/event/error payload schemas
- examples that client and server tests can share
- protocol notes that are not tied to a single runtime

Does not own:

- client session state or Solid/Astro components
- server room, clock, matchmaking, or persistence behavior
- TypeScript-only generated code as the source of truth
- rule engine behavior, which belongs in `packages/rules` and
  `packages/rules-fixtures`

## First messages to define

- `join_match`
- `match_state`
- `make_move`
- `move_rejected`
- `player_joined`
- `player_left`
- `clock_update`
- `game_over`
