# API contracts — the OpenAPI seam

> **Audience:** anyone building an integration against one of the system's HTTP APIs — a
> browser extension, a phone quick-capture shortcut, a task CLI/TUI, a Raycast/Alfred
> plugin, a sync bridge, a "chat with my vault" tool.
> **Status:** the system-level **index** of the OpenAPI contracts. Each surface's detail
> (regen/lint/serve commands, lint config, conventions) lives in that repo's
> `openapi/README.md`, linked below; this doc indexes them and shows how to consume any of
> them from any language.

## Why this exists

The three product repos are Rust end-to-end (see [rust-migration.md](rust-migration.md)),
and the next body of work is **integrations against their HTTP APIs** — many independent,
cross-device, likely polyglot clients. That is exactly the condition where a
machine-readable API contract stops being over-engineering and starts preventing real
integration bugs. So each REST surface has a canonical **OpenAPI 3.1** spec, co-located
with the server it describes, from which any client — in any language, on any device —
generates a typed client. The phased build is [build-plan.md](build-plan.md) → Phase 7.

## The contracts

| Surface | Spec | Port | Served on the running server | Per-repo guide · ledger |
| --- | --- | --- | --- | --- |
| **Vault** (the PKM API — the primary integration target) | [`vault.yaml`](../Agent-Vault/openapi/vault.yaml) | `:4173` | `/openapi.yaml` · `/openapi.json` · `/docs` | [README](../Agent-Vault/openapi/README.md) · [ledger](../Agent-Vault/Docs/openapi-notes.md) |
| **Overlay console** (the operator API) | [`console.yaml`](../Agent-Overlay/openapi/console.yaml) | `:4180` | `/openapi.yaml` · `/openapi.json` · `/docs` | [README](../Agent-Overlay/openapi/README.md) · [ledger](../Agent-Overlay/docs/openapi-notes.md) |
| **Runner** (inbound webhooks) | [`runner-webhooks.yaml`](../Agent-Runner/openapi/runner-webhooks.yaml) | `:8787` | not served — Runner *receives* webhooks; `agent-runner openapi` emits a concrete spec from active configured HTTP triggers | [README](../Agent-Runner/openapi/README.md) · [ledger](../Agent-Runner/docs/openapi-notes.md) |

Vault and the console **serve their own spec**: `GET /openapi.yaml` and `/openapi.json`
return the embedded contract, and `GET /docs` is a self-contained Redoc explorer — build
against a running server without leaving it. The Overlay console contract includes operator-only
surfaces such as Agent Runtimes, Automations, and local-agent lifecycle hooks (`GET /api/agents/hooks`,
`POST /api/agents/hooks/ingest`); those routes are still loopback-console APIs, not a public remote
control plane. Runner is different in kind: its routes are per-deployment (one path per active
configured `http` trigger), so `runner-webhooks.yaml` is a **template** of the contract *shape* and
`agent-runner openapi` generates the concrete live spec for the active HTTP trigger set, intentionally
omitting inactive HTTP triggers and non-HTTP triggers.

## MCP (`:3000`) is not here — and why

The MCP server is **JSON-RPC / MCP (rmcp)**, not REST; OpenAPI does not model it. It keeps
its own machine-readable contract — the R0 `mcp-surface` snapshot and its guard test
([`tests/contract/mcp-surface.test.ts`](../Agent-Overlay/tests/contract/mcp-surface.test.ts)
over [`fixtures/mcp-surface/`](../Agent-Overlay/tests/contract/fixtures/mcp-surface)) — so it
is deliberately out of scope for the OpenAPI seam.

## Consume this in any language

The point of the contracts is polyglot, cross-device integration. Pick your generator and
point it at the served spec (or the `.yaml` file directly):

1. **Get the spec.** From a running server: `curl http://127.0.0.1:4173/openapi.yaml`
   (Vault) or `:4180` (console). Or read the committed file in the repo.
2. **TypeScript** — [`openapi-typescript`](https://github.com/openapi-ts/openapi-typescript)
   (+ `openapi-fetch`). This is already how both web apps get their types; each repo's
   `openapi/README.md` has the exact `openapi:gen` command.
3. **Python** — [`openapi-python-client`](https://github.com/openapi-generators/openapi-python-client).
   A **runnable, reproducible** example lives at
   [`Agent-Vault/examples/python-portability/`](../Agent-Vault/examples/python-portability/):
   it generates a Python client from `vault.yaml`, boots the real server, and makes typed
   `GET /api/health` + `GET /api/tasks` calls — with the captured output in
   [`proof.txt`](../Agent-Vault/examples/python-portability/proof.txt).
4. **Swift / Go / other** — `swift-openapi-generator`, `oapi-codegen`, `openapi-generator`,
   etc. all consume the same 3.1 spec; nothing above is special to TS or Python.

## The guarantee: these specs are tested, not hopeful

A generated client is only as trustworthy as the spec. Each spec is **conformance-tested
against the server's actual responses**, so the contract cannot silently drift from the
code:

- **Vault** — [`tests/openapi-conformance.test.mjs`](../Agent-Vault/tests/openapi-conformance.test.mjs)
  (with the spawn-mode HTTP suites) ajv-validates the **real running binary's** responses
  against `vault.yaml`.
- **Console** — [`tests/contract/console-openapi-conformance.test.ts`](../Agent-Overlay/tests/contract/console-openapi-conformance.test.ts)
  validates the recorded response transcript (`console-http/routes.json`) against
  `console.yaml`.
- **Runner** — [`crates/agent-runner/tests/openapi_cli.rs`](../Agent-Runner/crates/agent-runner/tests/openapi_cli.rs)
  asserts `agent-runner openapi` emits a valid, correct spec from a fixture trigger set;
  the webhook wire it documents is pinned by `tests/http_watcher.rs`.

Every spec also passes `redocly lint` (each repo's `openapi/README.md` has the command).

## Where the detail lives

This doc indexes and shows cross-surface consumption; it does not restate per-surface
detail. For the schemas, conventions, lint config, and the regen/lint/serve commands of a
given surface, read that repo's `openapi/README.md` (linked in the table above). For the
phased plan and its status, see [build-plan.md](build-plan.md) → Phase 7.
