# Uncommitted Code Review Follow-ups

Checklist from the review of the SQLite/session/room persistence changes.

## Correctness / bugs

- [ ] Ensure the room creator gets the first player seat deterministically.
  - Current risk: `POST /api/rooms` records `created_by_user_id`, but the creator does not claim `player1` until the later websocket join.
  - Race: another browser can join first and claim `player1`.
  - Possible fix: claim `player1` for `createdByUserID` inside `CreateGame`, in the same transaction as game creation.

- [ ] Decide whether `player_left` is still part of the protocol.
  - Current code path exists, but `rooms.Store.Leave` always returns `shouldBroadcast=false`, so `player_left` is never emitted.
  - If seats are durable and disconnects do not free seats, consider removing `player_left` entirely or replacing it with explicit live-presence events.
  - If live presence matters, fix `Leave` so it broadcasts meaningful presence changes.

- [ ] Reconcile UI naming around `players`.
  - Current `players` count appears to mean claimed player seats, not currently connected users.
  - Rename or document this if durable seat ownership is intentional.

## Request lifecycle / contexts

- [ ] Propagate request contexts through `rooms.Store` into the repository.
  - Current methods use `context.Background()` internally.
  - Prefer APIs such as:
    - `Create(ctx context.Context, userID string)`
    - `Join(ctx context.Context, code string, userID string)`
    - `Snapshot(ctx context.Context, code string, userID string)`
    - `ApplyMove(ctx context.Context, code string, userID string, move protocol.ClientMove)`
  - Pass `r.Context()` from HTTP/websocket handlers so SQLite waits and queries can be cancelled.

## Security / HTTP concerns

- [ ] Replace credentialed wildcard-style CORS with an explicit origin allowlist.
  - Current middleware reflects any `Origin` and sets `Access-Control-Allow-Credentials: true`.
  - This is risky now that cookies identify anonymous users.

- [ ] Validate websocket `Origin` headers.
  - Browser websocket requests are not protected by CORS.
  - If cookies authenticate users, websocket upgrades should reject unexpected origins.

- [ ] Simplify websocket response header handling.
  - Current websocket upgrade manually copies all `w.Header()` values into a raw HTTP response string.
  - Prefer passing only explicit upgrade headers, especially `Set-Cookie` if needed.
  - Avoid bypassing net/http header serialization/sanitization.

## Persistence / SQLite idioms

- [ ] Keep SQL isolated to `internal/storage`.
  - Embedded SQL strings are acceptable and idiomatic for a small Go `database/sql` service.
  - Avoid letting SQL leak into HTTP, websocket, or room-presence layers.

- [ ] Consider versioned migrations once schema changes become frequent.
  - `CREATE TABLE IF NOT EXISTS` in startup code is fine for the first small schema.
  - Later, use migration files/tooling to handle schema evolution safely.

- [ ] Use named query constants for longer or reused SQL statements.
  - This can improve readability without adding a heavy abstraction.

- [ ] Avoid parsing SQLite error strings for constraint handling.
  - Current `mapConstraintToBadSequence` checks whether the error text contains `"constraint"`.
  - Prefer inspecting driver-specific SQLite error codes and mapping only expected unique/primary-key conflicts.

- [ ] Handle random ID generation errors.
  - Current `prefixedID` ignores `rand.Read` errors.
  - Return `(string, error)` or use a UUID helper that surfaces failures.

- [ ] Decide on server-side session expiry semantics.
  - `sessions.expires_at` exists, and cookies have `MaxAge`, but inserted sessions have no expiry.
  - Either set `expires_at` or remove/ignore that column intentionally.

## Separation of concerns / simplification

- [ ] Reduce duplicated game-rule logic between memory and SQLite repositories.
  - `MemoryRepository.ApplyMove` and `SQLite.ApplyMove` both enforce seat, turn, sequence, and move-shape validation.
  - As validation grows, centralize domain rules in one service layer and keep repositories focused on atomic persistence.

- [ ] Clarify the responsibility of `rooms.Store`.
  - It currently mixes live websocket client management with repository-mediated game state.
  - Keep it focused on live presence/broadcasting, and let storage own persistence.

- [ ] Review protocol naming after durable seats are finalized.
  - `player_joined` currently means a seat was newly claimed, not necessarily that a websocket connected.
  - Consider names like `seat_claimed` / `presence_joined` if both concepts exist.
