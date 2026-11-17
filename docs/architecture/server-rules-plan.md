# SQLite-only persistence and server-authoritative rules

## Goal and order

Maintain one authoritative Sovereign Chess rules implementation in Go. The browser
renders server-provided positions and legal actions instead of executing game rules.
Optimize for a solo developer: one server, SQLite, readable code, and a responsive UI.

**First milestone: remove the alternate Go in-memory persistence implementations.**
Do not begin the rules port or change gameplay behavior as part of that cleanup.

## Tracking progress

- `[ ]` = not complete; `[x]` = implemented and verified.
- Work through phases in order. Check a phase off only when its exit criteria pass.
- Check individual tasks as they land; add a completion date and commit/reference
  to the completion log below. Record scope changes under Decisions.
- This document is a plan, not a claim that the future architecture already exists.

| Phase | Scope | Complete |
| --- | --- | --- |
| 1 | SQLite-only persistence and tests | [x] |
| 2 | Pure Go rules engine and correctness tests | [ ] |
| 3 | Authoritative move acceptance and durable position state | [ ] |
| 4 | Online frontend consumes authoritative snapshots | [ ] |
| 5 | Server-backed analysis and removal of TypeScript rules | [ ] |
| 6 | Remaining game rules and completion features | [ ] |

## Decisions

- SQLite is the only implementation of durable game and anonymous-session storage.
- Live WebSocket connections, send channels, and presence remain in memory. These
  are transient resources, not a second game database; restart/reconnect restores
  durable seats and games from SQLite.
- Keep `apps/server/internal`: this is conventional Go naming with compiler-enforced
  import restrictions. Packages below it can be imported only from within the
  `apps/server` directory tree. Renaming it to `src` or `lib` would remove that
  boundary without simplifying the application.
- Keep small consumer-owned interfaces where useful for dependency direction and
  focused failure tests. One production backend does not require deleting every
  interface or introducing a replacement abstraction framework.
- Keep the TypeScript engine temporarily as a migration reference and for existing
  consumers, not as a permanently maintained second rules engine.
- Full current-position updates precede board diffs; server-confirmed moves precede
  optimistic moves; server-backed analysis precedes WebAssembly.
- No Redis, additional service, ORM, generic repository framework, or authoritative
  in-memory position cache is needed for this plan.

## Starting point before Phase 1

- `apps/server/cmd/server/main.go` already opens SQLite and explicitly supplies it
  for both rooms and anonymous sessions. This is primarily cleanup of alternate
  constructors and tests, not a production storage migration.
- `apps/server/internal/rooms/memory.go` duplicates durable game behavior.
- `apps/server/internal/storage/memory_sessions.go` duplicates session storage.
- `rooms.NewStore()`, `httpapi.NewHandler()`, and `NewHandlerWithRooms(...)` currently
  allow implicit in-memory dependencies. Many tests use these paths.
- SQLite move acceptance checks membership, turn, sequence, and basic action shape;
  it does not yet validate Sovereign Chess legality.
- The browser executes accepted actions and replays history through `@osc/rules`.

## Phase 1 — Remove alternate Go persistence implementations

### Tasks

- [x] Make dependencies explicit: use `rooms.NewStore(repo)` and
  `httpapi.NewHandler(roomStore, sessions)` (or equally clear required-dependency
  constructors). Remove zero-argument/default-memory alternatives and update callers.
- [x] Keep database opening/closing in `cmd/server/main.go` and test setup, not in
  constructors. A database failure must not silently fall back to memory.
- [x] Add small SQLite test fixtures using `t.TempDir()` database files and
  `t.Cleanup`. Seed real anonymous users/sessions before referencing their IDs;
  the old tests' arbitrary user strings do not satisfy SQLite foreign keys.
- [x] Move room integration tests to external `package rooms_test` where they need
  to import `storage`, because `storage` already imports `rooms`. Avoid an import
  cycle or moving production interfaces just to support test setup.
- [x] Migrate room, HTTP, room-entry, and profile-list tests to SQLite fixtures.
  Preserve behavioral coverage rather than merely removing tests with memory usage.
- [x] Keep tiny test-local failure stubs/wrappers for explicit error-path tests;
  do not replace the deleted backend with a new full fake repository.
- [x] Relocate the still-used `ValidateMoveShape` helper out of `rooms/memory.go`
  before deleting that file. Keep its behavior unchanged in this phase.
- [x] Delete `MemoryRepository`, `MemorySessions`, their constructors, and helpers
  that become unused. Remove the `rooms` turn-toggle helper if only memory used it.
- [x] Retain `rooms.Store` live-client bookkeeping, channel synchronization, and
  durable-seat semantics. Do not persist sockets or clear seats on disconnect.
- [x] Verify restart persistence, cookie-based identity recovery, seat restoration,
  observers, move order, wrong-turn/sequence rejection, and rejected-action no-op behavior.
- [x] Update `apps/server/README.md` and architecture notes to describe SQLite-only
  persistence and explicit constructors. Reconcile the duplicated-memory follow-up
  in `docs/uncommitted-review-followups.md` without marking future rules work done.
- [x] Run `go test ./apps/server/...` and `go test -race ./apps/server/...` from the
  repository root. Check production startup with a temporary database path.

### Exit criteria

- [x] No production in-memory game/session repository or implicit fallback remains.
- [x] Tests exercise SQLite for durable behavior; only transient presence and
  focused error stubs remain in memory.
- [x] Public HTTP/WebSocket behavior and the existing SQLite schema are unchanged.
- [x] Existing persistence and server tests pass, including the race detector.

Keep this a bounded cleanup: no Go rules port, protocol redesign, large service
refactor, or frontend changes. Phase 1 removes the duplicate acceptance pipeline;
a new rules/service boundary is introduced only when Phase 3 needs it.

## Phase 2 — Implement the pure Go rules engine

- [ ] Create `apps/server/internal/rules`, independent of transport, users, and SQL.
- [ ] Define position, pieces, ownership/control, and typed actions. Allow the model
  to accommodate compound defection-and-king-move actions without implementing a
  general multi-step workflow system.
- [ ] Implement setup, complete state serialization, movement/attacks, army control,
  legal actions, application, castling, promotion, defection, notation, and status.
- [ ] Prefer readable board representation and resulting-position king-safety
  checks. Start with a 256-square array/bounded loops unless benchmarks justify
  bitboards or specialized pin/check optimizations.
- [ ] Port useful TypeScript test scenarios; add specification-based tests from
  `docs/game-rules.md` and the expanded official rules linked by the site.
- [ ] Add validation-critical regression tests: mandatory promotion, new-king safety,
  control changes exposing check, defection legality, castling with controlled rooks,
  captured-rook rights, and malformed actions.
- [ ] Use differential tests against TypeScript where behavior should agree. Document
  intentional differences: existing TypeScript behavior is not the specification.
- [ ] Benchmark initial and representative midgame legal-action generation.

**Exit:** a deterministic, tested engine suitable for authoritative validation.
Do not call the port complete while it knowingly accepts illegal king exposure or
incomplete promotion. Broader rule/product features can remain for Phase 6.

## Phase 3 — Make server move acceptance authoritative

- [ ] Introduce the smallest game-operation boundary needed to connect rules and
  SQLite. Keep rule logic in `rules`; do not put it in handlers or duplicate it
  between validation and persistence paths.
- [ ] Persist complete current engine state alongside accepted action history.
  Include all legality-relevant state; a board-only FEN is not sufficient.
- [ ] Add a versioned schema migration before altering existing databases; preserve
  current users, sessions, seats, and history.
- [ ] In one transaction, check identity/seat, turn, and expected revision; load the
  position; validate/apply the action; save state, revision, and history.
- [ ] Return structured rejection reasons. Rejections change no durable game state.
- [ ] Broadcast accepted state only after commit. Test competing submissions against
  the same revision, transaction failure, restart, and reconnect.
- [ ] Inspect existing histories before rollout. Decide whether incompatible legacy
  games are migrated, made read-only, or restarted with a notice; do not silently
  replay illegal histories or delete production data.
- [ ] Until Phase 4 removes browser execution, verify that supported accepted actions
  can still be consumed by the deployed client. Coordinate incompatible rule/action
  changes with the frontend rollout rather than leaving mismatched engines live.

**Exit:** illegal client actions cannot change games; accepted games survive restart
without replaying the entire history on every action. SQLite remains authoritative;
no position cache is required initially.

## Phase 4 — Switch online play to server snapshots

- [ ] Extend protocol messages with position revision, pieces, turn, ownership/control,
  check/status, last action, notation, and legal actions with promotion choices.
- [ ] Send legal options with position updates, not on every selection. Explicit
  compound actions must not require browser-side rule interpretation.
- [ ] Add an online session that consumes snapshots instead of executing actions
  through `apps/web/src/game/session/createLocalGameSession.ts` and `@osc/rules`.
- [ ] Keep selection, drag, highlighting, orientation, and promotion presentation local.
- [ ] Allow one pending submission, display pending feedback, and disable submissions
  while disconnected. Commit board state only on server acceptance.
- [ ] Ignore stale revisions; refresh on revision mismatch and reconnect. Fetch
  history on initial load/reconnect and append entries, rather than resending all
  history with every full current-position update.
- [ ] Test two players and observers, rejection recovery, reconnect, promotion,
  castling, defection, and out-of-order/stale updates.
- [ ] Measure payload size, engine time, and end-to-end move latency before optimizing.

**Exit:** online play needs no browser rules execution and remains responsive.
Retain the existing framework-neutral board packages.

## Phase 5 — Migrate analysis and delete TypeScript rules

- [ ] Add a bounded, stateless analysis endpoint using the same Go engine. Validate
  supplied positions, cap request sizes, and rate-limit work; do not create durable
  rooms for analysis.
- [ ] Cache visited analysis snapshots in the browser for instant history navigation.
  Keep free-form editor placement local; use Go for rule validation/evaluation.
- [ ] Migrate FEN/setup validation, notation, promotion options, and rule-derived
  telemetry consumers. Inventory all `@osc/rules` imports before removal.
- [ ] Keep small TypeScript rendering/protocol models and board-coordinate helpers;
  these are not a second rules engine.
- [ ] Delete `packages/rules`, its workspace dependency/configuration, and obsolete
  browser replay code once no production consumers remain.
- [ ] Verify online play, analysis, editor workflows, frontend checks, tests, and build.

**Exit:** one maintained rules implementation in Go. Server-backed analysis explicitly
requires connectivity. Revisit a browser Go/WebAssembly build only if offline use
or measured analysis latency justifies the additional tooling.

## Phase 6 — Complete remaining rules and game lifecycle

- [ ] Implement opening color choice, keeping player identity separate from army color.
- [ ] Complete the special defection-and-immediate-king-move interaction end to end.
- [ ] Audit checkmate and stalemate against all legal actions, including regime changes.
- [ ] Persist completed results and prevent further actions after game completion.
- [ ] Add agreed draws and resignation.
- [ ] Define and implement the applicable traditional draw rules (repetition,
  move-count draws, dead positions) rather than blindly copying orthodox thresholds.
- [ ] Add specification-based end-to-end regression tests for each completed rule.

Validation-critical portions of these rules must be implemented earlier when needed
by Phase 2. This phase finishes the remaining interactions and lifecycle behavior,
not permission to ship knowingly illegal acceptance.

## Completion log

| Date | Task/phase | Commit or verification reference |
| --- | --- | --- |
| 2026-11-16 | Phase 1: SQLite-only persistence, explicit constructors, migrated tests and docs | `go test ./apps/server/...`; `go test -race ./apps/server/...`; regression tests in `httpapi/persistence_test.go` and `rooms/presence_test.go` |
| 2026-11-16 | Phase 1 production smoke verification | Built `./apps/server/cmd/server`; temporary-file SQLite startup/shutdown, HTTP create/list with cookie recovery after process restart, invalid database path fails fast; real WebSocket two-player/observer joins, rejected moves, ordered broadcasts, and cookie/seat/history recovery after process restart all passed. |
