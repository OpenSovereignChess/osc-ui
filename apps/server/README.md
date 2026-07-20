# Server

Go realtime server for Open Sovereign Chess.

## First gameplay milestone

Start with invite-only casual play:

- create a SQLite-backed room
- issue a long-lived anonymous user cookie when someone creates or joins
- share a room code or link
- allow two browsers to join
- persist player seat claims and move history for reconnects/server restarts
- keep only live websocket presence and broadcast channels in process memory

The web client will use the existing TypeScript rules engine for the first
playable version. The server should validate message shape, room membership,
turn ownership, and move sequence numbers, but it will not initially perform
full Sovereign Chess move validation. Treat this mode as casual/untrusted until
a Go rules implementation validates moves against the shared fixtures.

## Later responsibilities

- completed match views and retention/cleanup policies
- authoritative Go move validation using `packages/rules-fixtures`
- clocks
- basic matchmaking, if invite-only rooms are not enough
- accounts only when they unlock a concrete product need

## Suggested internal layout

```text
cmd/server/          process entrypoint, flags, and config
internal/httpapi/    HTTP routes, health checks, websocket upgrade handlers
internal/rooms/      live websocket presence and broadcasting
internal/protocol/   JSON message envelopes and payloads
internal/storage/    SQLite persistence for users, sessions, games, seats, moves
internal/rules/      future Go rule validation
```

Keep the server small and authoritative over room state. Avoid distributed
presence, queues, Redis, ratings, and account systems until the simple room flow
needs them.

## Persistence

The server uses SQLite by default. Configure the database location with either
`-db` or `OSC_DB_PATH`:

```sh
OSC_DB_PATH=/var/lib/osc/osc.db /srv/osc-server/server
```

Anonymous users are durable browser/device users. The server stores users and
session token hashes in SQLite, then sends an `HttpOnly` `osc_session` cookie.
Seat ownership is stored in `game_seats`; disconnecting does not free a player
seat, so reloading or reconnecting from the same browser restores the same seat.
