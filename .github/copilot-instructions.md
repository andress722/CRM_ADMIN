# Copilot SDK (repo-specific) agent instructions

## Big picture
- This repo hosts multi-language SDKs (Node.js, Python, Go, .NET) that wrap the Copilot CLI server via JSON-RPC over stdio or TCP. The SDKs manage process lifecycle; the CLI handles planning, tool calls, and file ops.
- Public APIs are intentionally aligned across languages (`CopilotClient`, `CopilotSession`, tool registration, session events). See client/session/types in: `nodejs/src/`, `python/copilot/`, `go/`, `dotnet/src/`.
- The CLI can be spawned by the SDK (default `copilot` in PATH) or connected externally via `cliUrl` (see docs/getting-started.md).

## Critical workflows
- Install all deps: `just install` (root justfile).
- All tests: `just test`. Per SDK: `nodejs/npm test`, `python/uv run pytest`, `go/go test ./...`, `dotnet/dotnet test test/GitHub.Copilot.SDK.Test.csproj`.
- Lint/format: `just lint`, `just format`.
- E2E tests require the Copilot CLI in PATH (`copilot --version`) and use `test/harness/` (run `npm ci` there before .NET or cross-SDK e2e).

## Project-specific conventions
- JSON-RPC 2.0 requests use `{ jsonrpc: "2.0", id, method, params }`; session events are notifications without `id`.
- Tool schemas: Node.js uses Zod (e.g., `defineTool`), other SDKs use JSON Schema; validate arguments server-side.
- Session events are streamed; subscribe with `session.on(...)` before `session.send(...)` to avoid missing events.

## Generated types / protocol sync
- Protocol source of truth: `sdk-protocol-version.json`.
- Node.js: `npm run generate:session-types` regenerates `nodejs/src/generated/session-events.ts`.
- Protocol bumps across SDKs: `cd nodejs && npm run update:protocol-version`.

## Integration points
- Copilot CLI is an external dependency; SDKs manage `start()`/`stop()` lifecycle (use `forceStop()` only if stop hangs).
- Admin frontend is a separate Next.js app in `admin-frontend/` (not part of SDK runtime).

## Key references
- Root README and docs/getting-started.md for setup + external CLI server mode.
- SDK API references: `nodejs/README.md`, `python/README.md`, `go/README.md`, `dotnet/README.md`.
