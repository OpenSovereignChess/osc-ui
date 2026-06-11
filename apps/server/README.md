# Server

Go realtime server for Open Sovereign Chess.

## First gameplay milestone

Start with invite-only casual play:

- create an in-memory room
- share a room code or link
- allow two browsers to join
- broadcast room state, moves, joins, and leaves over websockets
- keep live match state in process memory

The web client will use the existing TypeScript rules engine for the first
playable version. The server should validate message shape, room membership,
turn ownership, and move sequence numbers, but it will not initially perform
full Sovereign Chess move validation. Treat this mode as casual/untrusted until
a Go rules implementation validates moves against the shared fixtures.

## Later responsibilities

- SQLite persistence for rooms, move logs, completed matches, and reconnects
- authoritative Go move validation using `packages/rules-fixtures`
- clocks
- basic matchmaking, if invite-only rooms are not enough
- accounts only when they unlock a concrete product need

## Suggested internal layout

```text
cmd/server/          process entrypoint, flags, and config
internal/httpapi/    HTTP routes, health checks, websocket upgrade handlers
internal/rooms/      in-memory room lifecycle and broadcasting
internal/protocol/   JSON message envelopes and payloads
internal/storage/    SQLite persistence once needed
internal/rules/      future Go rule validation
```

Keep the server small and authoritative over room state. Avoid distributed
presence, queues, Redis, ratings, and account systems until the simple room flow
needs them.
