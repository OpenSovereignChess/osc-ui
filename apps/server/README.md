# Server

Planned Dart realtime server for Open Sovereign Chess.

## Intended responsibilities

- websocket connections
- matchmaking and room lifecycle
- authoritative move validation
- clocks and reconnect support
- persistence boundaries for users and matches

## Suggested internal layout

```text
lib/
  game_core/
  matchmaking/
  matches/
  protocol/
  websocket/
```

Keep the server authoritative. The web client should send intents, and the server should validate and broadcast state.
