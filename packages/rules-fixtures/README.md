# Rules Fixtures

Shared fixtures for validating both rule implementations against the same expectations.

Use this package for:

- serialized positions
- legal move expectations
- move application results
- special variant edge cases
- full game scenarios

Owns stable, language-neutral data only. It should not contain executable engine
code or TypeScript-specific helper APIs as the source of truth.

Fixtures are the contract between `packages/rules` and the future Go rule
implementation in `apps/server`. Add package-local tests in `packages/rules`
when the behavior is implementation-specific; add fixtures here when the same
scenario must pass in both runtimes.
