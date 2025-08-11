# Contributing (Draft)

- Use issues and pull requests for all changes.
- Write focused unit tests for patch/ingest logic.
- Keep dependencies minimal (Node.js 18+, no heavy libs).
- Favor dry-run first for any actionful command.
- Avoid platform-specific assumptions; Linux/macOS first.

## Tests

- `npm test` runs lightweight Node-based tests (no external runner).
- Add fixtures under `agent-cli/tests/fixtures` when needed.

