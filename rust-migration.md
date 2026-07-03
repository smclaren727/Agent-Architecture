# Rust re-platform — the Node/TS backends move to Rust, the seams do not

> **STATUS (2026-07-02): R0 ✅ · R1 ✅ · R2 ✅ · R3 ✅ COMPLETE — the migration window is CLOSED;
> all three product repos are Rust.**
> **Agent-Overlay** is Rust end-to-end (crates `overlay-core`/`overlay-mcp`/`overlay-cli`/
> `overlay-console`, Tauri shipping the cargo binaries); the TS backends are deleted and the frozen
> TS `packages/core` has been **deleted at the R3 Vault cutover** (its last consumer ported), closing
> the window — the code stays recoverable at the annotated tag **`ts-core-final`**.
> **Agent-Vault** is Rust end-to-end (crate `vault-server`, default = serve; `server/` + `tools/*.js`
> + the Node SEA sidecar deleted; Tauri externalBin = the cargo-built `agent-vault-server`; both it
> and Runner take `overlay-core` as a Cargo path dep — the `file:` `@overlay/core` deps are gone).
> **Agent-Runner** is Rust end-to-end (crate `agent-runner`; the TS implementation is deleted —
> the repo is the crate + golden fixtures + units + docs; ledger and deviations in its
> `docs/rust-migration-notes.md`). Operator-visible R2 cutover facts: cron fragments record the
> **native binary** as the runner command (the R1 agent-re-entry analog), so cron-projected state
> dirs need **one `agent-runner sync`** after upgrading while `none`-target dirs are zero-churn;
> the unit templates invoke the binary directly and **OVERLAY_CLI_PATH is gone** (its consumer
> resolves `overlay` on PATH). Both acceptance harnesses now *default* to matrix step **R→R→T**
> (see [acceptance/README.md](acceptance/README.md) → "Selecting implementations").
> Deliberate R1 wire deviations, recorded in Agent-Overlay's `docs/rust-migration-notes.md`:
> **rmcp 2.0.0** serves the MCP surface (stdio rmcp end-to-end; StreamableHTTP hand-shaped at the
> boundary to the snapshotted bytes); **GET `/mcp` returns 405** (the spec-sanctioned reply — the
> TS SDK's optional standalone SSE stream could never carry data here); and the
> **protocol-version fallback** differs on one edge (a `2024-10-07` client negotiates the
> `2025-11-25` fallback where TS echoed `2024-10-07`; header validation still accepts the full TS
> SUPPORTED list). Linux/bwrap live sandbox smoke on the NixOS node remains outstanding (macOS
> sandbox-exec smoke done).

This is the campaign master for migrating all backend/non-UI code in the three product repos
(**Agent-Overlay** · **Agent-Runner** · **Agent-Vault**) from Node/TypeScript to Rust. It owns the
crate architecture, the pinned stack, the frozen-TS-core policy, the phase sequence with cutover
gates, and the risk register. The system architecture it re-platforms is [README.md](README.md);
the per-repo roles it must not change are [agent-overlay.md](agent-overlay.md),
[agent-runner.md](agent-runner.md), and [agent-vault.md](agent-vault.md); its slot in the phased
plan is [build-plan.md](build-plan.md) → Phase 6.

## Goals and locked decisions (2026-07-01)

- **Backends to Rust; UI stack stays.** Every Node/TS server, CLI, and daemon becomes a Rust
  binary. The React web apps (Vite/TS/Tailwind/shadcn) and the Tauri v2 wraps are unchanged — the
  Rust server replaces the Node SEA sidecar behind the same env-var + `/api/health` contract, which
  also dissolves the SEA toolchain risk (single-target builds, no bundled Node, no
  native-module-in-SEA limitation).
- **Big-bang per repo**, in the order **Overlay → Runner → Vault**. Overlay first is forced (both
  siblings depend on it); Runner second because it exercises all three Overlay seams with the
  smallest codebase (sharpest early verification); Vault last because its library coupling is the
  narrowest, so it tolerates the longest frozen-TS window. The only cross-repo softening is the
  **frozen TS `@overlay/core` dist**, which stays consumable by not-yet-ported siblings.
- **Cargo path dependencies across sibling repos** (`path = "../Agent-Overlay/crates/overlay-core"`)
  mirror today's `file:` deps. No publishing.
- **Vault's embedded agent surface is post-migration.** The documented-but-never-built in-app
  chat / MCP-client surface is built once, in Rust (an rmcp *client* against `overlay serve`),
  after the migration — never in the Node stack.
- **The seams are the contract, not the TS API.** What must survive byte-for-byte is the corpus
  file formats, the MCP wire, argv + exit codes, env vars, and the HTTP/SSE shapes — the four
  language-agnostic seams in [README.md](README.md). Rust and TS implementations operate over the
  same corpus simultaneously during the window, so file-format parity is the hardest invariant.
- **Invariants intact throughout:** the dependency arrow never reverses; three planes, one corpus;
  library, not framework; no second source of truth.

## Crate architecture

### Agent-Overlay (Cargo workspace at repo root)

```
Agent-Overlay/
├── Cargo.toml                 workspace = ["crates/*", "apps/desktop/src-tauri"]
├── crates/
│   ├── overlay-core/          [lib] THE shared crate (path-dep target for siblings);
│   │                          modules mirror the TS subpath exports 1:1: schemas, loaders
│   │                          (frontmatter, atomic_write, retry_read, layering,
│   │                          knowledge_vaults), adapters (execution, sandbox), secrets,
│   │                          trajectory, memory, search, eval, render, exporters,
│   │                          workspace_files, internal (file_lock).
│   │                          feature "ts" → ts-rs type generation (off by default)
│   ├── overlay-mcp/           [lib] rmcp server: all resources/templates/tools/prompts,
│   │                          stdio + StreamableHTTP /mcp :3000 — with a tower layer
│   │                          reproducing today's DNS-rebinding protection
│   │                          (allowedHosts/Origins)
│   ├── overlay-cli/           [lib + bin `overlay`] clap (global -W/--project); commands
│   │                          as library fns over a CommandIo trait so the console calls
│   │                          them in-process (preserves console == CLI run-path identity).
│   │                          Templates embedded via include_dir! with OVERLAY_TEMPLATE_PATH
│   │                          override; full 24-command parity table maintained
│   └── overlay-console/       [bin `agent-overlay-server`] axum :4180, /api/* + SSE (same
│                              event names), origin-guard tower layer, notify watcher with
│                              sha256 fingerprint suppression + 125ms debounce, JSON settings
│                              store, cli-installer (installs the native binary — no
│                              launcher script)
├── packages/core/             FROZEN TS dist (tagged ts-core-final; deleted at Vault cutover)
├── apps/desktop/web/          React SPA — unchanged; ts-rs generated types replace contract-sync
└── apps/desktop/src-tauri/    externalBin → cargo-built console binary + the Rust `overlay`
                               bin bundled as a second externalBin/resource; lib.rs env
                               re-pointed (OVERLAY_CLI_PATH → native binary)
```

One `overlay-core` crate, no feature-flag splitting: the TS package is one package with subpath
exports, and Rust dead-code elimination makes unused modules free for consumers. `overlay-cli` is
lib+bin and `overlay-console` depends on its lib, preserving today's property that the desktop app
runs the *identical* run/eval code path as the terminal. Origin guards stay per-repo (console and
vault each own theirs), not in `overlay-core` — web middleware in the library crate would widen
the library-not-framework boundary for no reuse win.

### Agent-Vault

```
Agent-Vault/
├── Cargo.toml                 workspace = ["crates/vault-server", "src-tauri"]
├── crates/vault-server/       [lib + bin `agent-vault-server`] default (no subcommand) =
│                              serve — the Tauri externalBin spawns it bare, unchanged;
│                              subcommands rebuild-index, export-context replace tools/*.js.
│                              modules: server (axum :4173, full route table), http
│                              (static/SPA/inert-CSP assets), origin_guard, open_file
│                              (token LRU 64), handlers, queries, filters, context,
│                              recurrence (hand-port), vault (schema/files/registry/fields/
│                              templates), index (rusqlite bundled FTS5, schema.sql via
│                              include_str!, sha256 incremental reconcile, one transaction),
│                              watch (notify + 250ms debounce), overlay integration via the
│                              overlay-core path dep
├── web/                       React SPA — unchanged; hand-mirrored types → ts-rs generated
└── src-tauri/                 unchanged (Rust PTY terminal stays); externalBin → cargo binary
```

One binary keeps the Tauri `externalBin` name/contract byte-identical and keeps the
export-context/API parity guarantee structurally enforced (both call the same `context` module).

### Agent-Runner

```
Agent-Runner/
├── Cargo.toml                 workspace = ["crates/agent-runner"]
└── crates/agent-runner/       [bin `agent-runner`] clap: triggers list / dispatch <id> /
                               run / sync + today's exact flag set.
                               modules: workspace (discovery chain), triggers (rmcp CLIENT
                               spawning `overlay … serve`, replacing the hand-rolled
                               JSON-RPC client), dispatch (per-trigger tokio task:
                               restartable debounce, coalesce-to-one, max_concurrency,
                               onBusy; mkdir file-slots + owner.json with the landed
                               staleness rules preserved; `overlay run` shell-out with
                               child-kill semantics preserved), watchers (schedule 15s poll
                               + hand-ported cron parser + chrono-tz; file 1s poll
                               bug-for-bug; http axum :8787 + the landed auth contract),
                               reconcile (manifest v1 + cron fragment text byte-compatible,
                               so `sync` is a zero-churn diff on default-configured state dirs)
```

### Dependency arrows (the Cargo mirror of today's `file:` layout)

```
 Agent-Vault/crates/vault-server ──path──┐      Agent-Runner/crates/agent-runner ──path──┐
                                          ▼                                               ▼
                             Agent-Overlay/crates/overlay-core ◀── overlay-mcp ◀── overlay-cli ◀── overlay-console
                             (depends on NO sibling; the arrow never reverses)
```

## Pinned stack

| Concern | Pick | Why (one sentence) |
| --- | --- | --- |
| Async runtime | **tokio 1.x** | Everything spawns processes/servers; the ecosystem default. |
| HTTP | **axum 0.8 + tower(-http)** | Both loopback servers and rmcp's StreamableHTTP mount as tower services; origin guards become per-repo tower layers. |
| Serialization | **serde + serde_json** | Non-decision. |
| Schemas/validation | **serde structs**: `deny_unknown_fields` exactly where zod is `.strict()`, extra-field-**preserving** where zod is `.passthrough()`; hand validators in `deserialize_with`/`TryFrom` | No crate reproduces zod; parity is proven by the R0 accept/reject corpora and governed by the per-schema strictness audit table. |
| YAML | **serde_yaml_ng** + insertion-ordered maps | Parity IS normalization — the TS `yaml` package already normalizes on rewrite; key order preserved; stringify output golden-matched to TS; comment preservation is required nowhere. |
| Frontmatter | **hand-rolled ~40-line splitter** golden-matched to gray-matter | The `gray_matter` crate doesn't match gray-matter's edge cases (CRLF, empty FM, `---` variants). |
| CLI | **clap 4 derive** (global `-W`/`--project`) | The argv contract with Runner is load-bearing. |
| FS watching | **notify 7** where event-driven is kept; **explicit polling loops** where polling IS the contract (Runner) | Watch semantics are user-visible trigger contracts. |
| SQLite | **rusqlite, `bundled`** (FTS5 asserted at startup); one long-lived connection; rebuild in one transaction | The index is disposable/rebuildable — schema portability, not data migration, is the concern. |
| Keychain | **keyring 3**, first-class | Kills the optional-native-addon + can't-load-in-SEA limitation. |
| MCP | **rmcp** (official SDK) — server in overlay-mcp, client in agent-runner | Official SDK on both sides collapses the wire-compat risk to one library. |
| Time | **chrono + chrono-tz** | The cron/RRULE hand-ports need zoned civil-time math. |
| TS type generation | **ts-rs** (`ts` feature) with an explicit per-consumer export/copy step (Overlay web at R1 — atomic swap with contract-sync deletion in the same change; Vault web at R3) | Types generated from the very structs the servers serialize — drift impossible. |
| Errors | **thiserror** in core, **anyhow** at bins; HTTP error bodies match today's JSON exactly | Error body shapes are part of the HTTP contract tests. |
| Logging | **tracing** → stderr or the configured log dir, **never stdout** | `overlay serve`'s stdio transport must carry only JSON-RPC. |

## Frozen-TS-core policy

> **CLOSED (2026-07-02).** The window closed at the R3 Vault cutover: with both siblings ported to the
> Rust `overlay-core` crate, `packages/core` had **zero consumers** and was deleted (along with its
> `test:core` partition, `vitest.core.config.ts`, the `pnpm-workspace.yaml` / root-`tsconfig` /
> `package.json` wiring, and the frozen-core vitest suites). The code is recoverable at the annotated
> tag **`ts-core-final`**. The rules below are retained as the historical record of the window that
> governed R1–R3.

At Overlay cutover (R1), `packages/core` is tagged **`ts-core-final`** and stops evolving; its
built `dist/` remains the `file:`-dep target for the still-TS Vault and Runner until each ports.
`packages/cli`, `packages/mcp-server`, and `apps/desktop/server` are deleted *at Overlay cutover*
(no sibling imports them — Runner spawns the `overlay` binary, which is now Rust). `packages/core`
itself is deleted at **Vault cutover** (last consumer gone) — the migration window closes there.

- **Window rule — "no new keys in strict-read artifacts."** Several artifact classes are read with
  `.strict()` zod schemas (trajectory metadata, memory facts/proposals), which hard-fail on any
  unknown key, while others are `.passthrough()` (trajectory events). A blanket "corpus format
  frozen" rule is therefore wrong in both directions. The **per-schema strictness audit table**
  (an R0 artifact, strict / passthrough / strip per schema) governs the window: no new keys may be
  written into any strict-read artifact class while a frozen TS reader exists, and the serde derive
  choices must map strict → `deny_unknown_fields` and passthrough → extra-field-preserving. A CI
  job strict-parses every artifact class with the frozen TS loaders over Rust-written fixtures for
  the duration of the window.
- **Frozen partition.** The core-only test subset (schemas, loaders, memory-operations,
  trajectory-store, workspace-files, search, trigger-schema, secrets) is pinned as an explicit
  vitest include list runnable at the `ts-core-final` tag, so the frozen core stays testable after
  the CLI/MCP/desktop suites are deleted with their packages.
- **Emergency-patch procedure** (instead of a blanket ban, for a corpus-safety bug discovered in
  the frozen core while Vault still *writes* through it): patch on the tag branch → rebuild
  `dist/` → reinstall in the consuming sibling(s) → a corpus-format-compatibility review against
  the strictness audit table before anything ships.

## Phases

Phased as R0–R4 here; the same five steps appear as 6.0–6.4 in
[build-plan.md](build-plan.md) → Phase 6.

### R0 — Contract capture (against the TS system, before any porting)

Freeze the observable contracts as **executable, implementation-agnostic artifacts** — data files
loaded by tests, never expectations inlined in test code — so each big bang has an objective gate.

1. **Parameterize both acceptance harnesses** — ✅ done (this repo, `bda41ed`): env-selected argv
   arrays per plane (`ACCEPTANCE_OVERLAY_CMD` / `ACCEPTANCE_RUNNER_CMD` / `ACCEPTANCE_VAULT_CMD`),
   defaulting to today's TS entry points; proven green in both configurations. See
   [acceptance/README.md](acceptance/README.md).
2. **MCP surface snapshotter**: spawn `overlay serve`, initialize (protocol 2025-06-18), list and
   read every resource/template/tool/prompt over the default workspace template → canonical-JSON
   snapshots — **including the generated agent MCP configs** (`claude-mcp.json`, codex `-c`
   overrides), so the R1 agent re-entry change is deliberate and tested.
3. **argv/exit-code matrix** for the full 24-command CLI surface (success / adapter-unavailable /
   predicate-fail / `--dry-run` / `--enforce` for `run`, plus init/migrate/doctor/update/export/
   eval/status parity rows) over a fixture workspace with a stub harness binary.
4. **HTTP+SSE transcript recorders** for :4180 and :4173 (routes, status codes, error bodies,
   named SSE events, heartbeat framing) + the `/mcp` DNS-rebinding reject cases.
5. **Golden fixture corpora**: sandbox argv/profiles, cron match table (datetime × tz × expr),
   RRULE corpus, search-ranking corpora for both engines, schema accept/reject corpora (every
   `.strict()` schema gets unknown-key reject cases), YAML stringify byte goldens, and the
   **per-schema strictness audit table**.
6. **Vault suite split**: the HTTP-contract `node --test` suites converted to spawn a server
   binary chosen by `AGENT_VAULT_SERVER_BIN` (default `node server/main.js`), so the *same suite*
   later proves the Rust server; pure-unit suites tracked per-file for Rust ports.
7. **Frozen-core partition + emergency-patch procedure** pinned (policy above).

**Gate:** all snapshots/goldens committed and green against the TS implementations; both
acceptance harnesses pass in default and explicitly-parameterized configurations.

### R1 — Agent-Overlay big bang

Build order: overlay-core (schemas → loaders → trajectory, preserving the lock semantics and the
≤4096-byte lock-free append fast path → memory+similarity → search → secrets → eval →
adapters+sandbox → workspace-files/render/exporters, porting tests + goldens module-by-module) →
overlay-mcp (the wire is the contract, not the SDK shape — hand-match URIs if rmcp ergonomics fall
short) → overlay-cli → overlay-console.

**Agent re-entry decision (first-class, not a footnote).** Today's zod default
`mcp_agent.server_command: "node"` plus `cliPath = process.argv[1]` generates agent MCP configs of
the form `command: node, args: [<cli.js>, …]`. Post-port, cliPath is `current_exe()` — a native
binary — and `node <native binary>` breaks every desktop- or Runner-dispatched claude-code/codex
run at R1. Therefore: the Rust schema default becomes *invoke cliPath directly* (honor
`server_command` only when it isn't the legacy `node` default); `overlay doctor` / `overlay
migrate` flag and rewrite corpus-pinned `server_command: node`; the default workspace template is
updated; and the R0 config snapshots make the divergence deliberate and tested.

**Cutover (one switch):** `~/.local/bin/overlay` → the Rust binary; Tauri externalBin → the
cargo-built console binary, with the Rust `overlay` bundled as a second externalBin/resource and
lib.rs env re-pointed (`OVERLAY_CLI_PATH` → native binary); delete `packages/cli`,
`packages/mcp-server`, `apps/desktop/server`, and the SEA/Bun toolchains; freeze `packages/core`
(tag `ts-core-final`); ts-rs replaces contract-sync atomically. **Runner state-dir re-sync step:**
persisted cron fragments and unit files embed `--overlay-command`/`--overlay-arg` argv and
`OVERLAY_CLI_PATH` verbatim — any deployment that pinned node paths keeps cron-dispatching the
deleted TS CLI after R1 unless re-synced. The cutover checklist therefore audits every Runner
state dir's `manifest.json`/fragments for pinned node argv, re-runs `agent-runner sync` with the
corrected overlay command, and updates unit env.

**Gate:** R0 snapshots/transcripts green against Rust; mixed-mode proof — the **unmodified TS
Runner** (including its hand-rolled JSON-RPC client) drives the Rust binary via
`AGENT_RUNNER_OVERLAY_COMMAND` with its full suite green; the frozen-TS-reads-Rust-writes CI job
strict-parses every artifact class over Rust-written fixtures; a **mixed-implementation
lock-contention test** (Rust vs TS racing accept/reject on one proposal; temp-file naming parity
pinned); acceptance matrix step **R→T→T**; Playwright console smoke; manual bwrap/sandbox-exec
smoke on both OSes against the sandbox goldens.

### R2 — Agent-Runner big bang

**✅ done (2026-07-02)** — all slices R2.1–R2.9 landed (ledger: Agent-Runner
`docs/rust-migration-notes.md`). Gate held: 116 Rust tests green including the cron/glob/reconcile
goldens consumed in place and a zero-churn `sync` pin over a committed TS-written state dir;
acceptance matrix step **R→R→T** is now the harness default; the `ts-core-final` back-compat check
is the R2.2 fake-serve negotiating `2025-06-18` (the TS serve is not runnable — `packages/cli` was
deleted at R1); the soak day is ongoing operation rather than a cutover-day artifact.

Port: workspace discovery → watchers (bug-for-bug polling semantics) → dispatch gate + file-slots
(landed staleness rules preserved) → `overlay run` shell-out → reconcile (byte-compatible
fragments). **Cutover:** bin path → cargo binary; `sync` asserts zero fragment churn on
default-configured state dirs; delete `src/`, `dist/`, node_modules, the `file:` dep.
**Gate:** ported tests + binary-spawning contract tests; cron/glob goldens; rmcp client ↔ Rust
serve, plus one back-compat check against the frozen TS serve from the tag; acceptance matrix step
**R→R→T**; a soak day on the real workspace with trajectories indistinguishable from TS-era ones.

**R2 slice map (2026-07-02; each slice lands committed + doc-noted + pushed so any session can
resume from repo state alone — progress ledger lives in `Agent-Runner/docs/rust-migration-notes.md`):**

- **R2.1** — Cargo scaffold (`crates/agent-runner`, overlay-core path dep) + workspace discovery +
  trigger type re-exports + the Runner's `docs/rust-migration-notes.md` progress ledger. ✅/⬜ per ledger.
- **R2.2** — trigger loading: rmcp *client* spawning `overlay … serve` (replaces the hand-rolled
  newline-framed JSON-RPC; 2025-06-18 init; `overlay://triggers[/{id}]`; exactly-one-text-content;
  10s/request), validated by TriggerSchema from overlay-core.
- **R2.3** — schedule watcher: 15s poll, hand-ported 5-field cron parser + chrono-tz zoned-minute
  matching + minute dedupe; gated on the full cron golden table (`test/fixtures/cron/`).
- **R2.4** — file watcher: 1s recursive readdir+stat poll, baseline-first, mtime+size deltas,
  glob→regex; gated on the glob goldens (`test/fixtures/glob/`).
- **R2.5** — http watcher: axum :8787, route-before-body, 1 MiB/10 s caps, webhook header/HMAC auth
  (timing-safe, 401/503 fail-closed wire parity with the R4 gap-fix fixtures), fail-fast listen.
- **R2.6** — dispatch: in-memory gate (restartable debounce, coalesce-to-one, max_concurrency,
  onBusy) + state-dir slot locks (owner.json + landed staleness rules — same on-disk protocol) +
  `overlay run` shell-out (exit-code contract) + the in-process `direct` executor over overlay-core
  (trajectory, predicates, network fail-closed). Non-direct shell-out drains stdout/stderr
  concurrently and retains only a bounded diagnostic tail; full logs remain Overlay trajectories.
- **R2.7** — reconcile + sync: manifest v1 + cron fragments gated byte-exact on
  `test/fixtures/reconcile/`; `.sync.lock` bounded/stale-reclaimed; cron→none orphan sweep.
- **R2.8** — main/CLI wiring (`triggers list` / `dispatch <id>` / `run` / `sync`, exact flags) +
  run-vs-cron warning + bin.
- **R2.9** — CUTOVER: node --test suites retargeted/ported (golden tables consumed by Rust tests in
  place), delete `src/`+`dist/`+node_modules+`file:` dep, unit templates re-pointed at the binary,
  acceptance R→R→T, zero-churn `sync` diff, back-compat check vs the `ts-core-final` TS serve,
  docs + Architecture ledger updated.

### R3 — Agent-Vault big bang

Port vault-server per the crate plan (recurrence against the RRULE corpus; `connected` stays
startup-static — parity first; notify watchers are a deliberate, safe upgrade since the consumer
is a debounced full reindex). **Cutover:** Tauri externalBin → the cargo binary (same env contract
`HOST`/`PORT`/`AGENT_VAULT_*` + the `/api/health` `"ok":true` gate — verified drop-in); dev loop =
`cargo run` + the unchanged Vite :5173 proxy; the NixOS unit swaps to the same binary (derived
SQLite still excluded from Syncthing); delete `server/`, `tools/*.js`, the SEA toolchain, and the
committed sidecar/Node runtimes; ts-rs types land in web; **then delete Agent-Overlay
`packages/core` — the migration window closes.** **Gate:** the R0-refactored `node --test` suite
green with `AGENT_VAULT_SERVER_BIN=<rust binary>`; FTS5 ranking goldens; inert-CSP `/assets`
transcripts (the XSS boundary); Playwright ui-smoke unchanged; acceptance matrix step **R→R→R**;
the packaged Tauri app boots on a clean machine; a multi-day Syncthing dogfood.

**R3 slice map (2026-07-02; same small-resumable-slice discipline as R2 — progress ledger lives in
`Agent-Vault/Docs/rust-migration-notes.md` — capitalized `Docs/`, that repo's convention;
created by R3.1):**

- **R3.1** — Cargo scaffold (`crates/vault-server`, overlay-core path dep) + config.js port (env
  surface, `js_number` grammar) + origin-guard + http helpers (static/SPA, inert-CSP `/assets`
  headers, app-document CSP, JSON body caps) + the progress ledger.
- **R3.2** — vault data layer: schema.js (13 typed notes, frontmatter validation, wikilink checks) +
  files.js (atomic schema-validated + loose writes, TYPE_FOLDERS, traversal guards) + registry.js
  (managed/open modes, vaults.json) + fields.js + templates.js.
- **R3.3** — SQLite index: rebuild.js (walk + sha256 incremental reconcile, one transaction,
  schema.sql via include_str!, per-vault pruning, loose-doc reduced fidelity) + sqlite-cli wrapper
  semantics (rusqlite bundled FTS5, asserted at startup) + watch.js (notify + 250ms — the
  sanctioned upgrade) + startup-index behavior.
- **R3.4** — queries.js (all parameterized reads incl. FTS5 `search_index MATCH` + bm25 rank) +
  filters.js; gated on the FTS5 ranking goldens (`tests/fixtures/search-ranking/`).
- **R3.5** — handlers.js (notes CRUD, metadata allowlist, task updates w/ recurrence advance,
  daily notes) + recurrence.js hand-port gated on the 63-case RRULE corpus + dates.js.
- **R3.6** — context.js (LLM context builder; byte-parity with GET /api/context) + export-context
  + rebuild-index as bin subcommands + open-file.js (token LRU sessions).
- **R3.7** — overlay integration (connection/files/memory/trajectories/capture via the
  overlay-core path dep; 503 gating; workspace display watcher) + SSE hub.
- **R3.8** — server.js route table + main.js boot (rebuild/watch before listen, preserving the Node
  boot order) — the full axum dispatch; gated on the spawn-mode suites
  (`AGENT_VAULT_SERVER_BIN=<rust binary>` → the 8 converted suites green) + remaining node-suite parity.
- **R3.9** — CUTOVER: Tauri externalBin swap (same env + health contract, now including the optional
  packaged-app instance token echoed by `/api/health`), NixOS unit note, delete
  `server/` + `tools/*.js` + SEA toolchain + committed sidecar binaries + Node cache, ts-rs types
  for `web/`, retire superseded node suites (fixtures stay), **delete Agent-Overlay
  `packages/core` (window closes)**, acceptance **R→R→R** default flip, docs + ledgers.

### R4 — Demolition + the unblocked tail

Delete residual TS infra (pnpm shrinks to the web apps); final doc close-out. Immediately-unblocked
post-migration roadmap (explicitly **not** migration scope): signing/notarize/updater + cross-webview
QA done **once** in Rust (cargo cross-targets replace the mac-arm64-only SEA); the full Vault
privileged-origin split; Windows/Linux single-instance; the **Vault embedded agent surface** as an
rmcp-client crate against `overlay serve`; Runner notify-based watching as its own decision;
dynamic overlay-connected.

## Mixed-mode acceptance matrix

Both harnesses run **unmodified** at every gate — only the `ACCEPTANCE_*_CMD` knobs change (usage:
[acceptance/README.md](acceptance/README.md)):

| Gate | Overlay | Runner | Vault | Matrix step |
| --- | --- | --- | --- | --- |
| R0 | TS | TS | TS | T→T→T (the defaults at R0; also proven with knobs set explicitly) |
| R1 | **Rust** | TS | TS | R→T→T |
| R2 | Rust | **Rust** | TS | R→R→T (the defaults since the R2 cutover) |
| R3 | Rust | Rust | **Rust** | R→R→R |

## Risk register

| # | Risk | Mitigation |
| --- | --- | --- |
| 1 | **MCP wire incompat** (rmcp vs TS SDK vs Runner's hand-rolled client; protocol 2025-06-18) | Official SDK both sides; R0 snapshot diffing; the mixed-mode window proves TS client ↔ Rust server before the client ports; hand-match template URIs if rmcp ergonomics lag. |
| 2 | **Sandbox generation divergence = security regression** (bwrap argv, `.sb` profiles, agent-adapter exemption) | Byte-exact sandbox goldens; exemption semantics preserved exactly; manual macOS+Linux enforcement smoke at R1. |
| 3 | **Agent re-entry breakage** (`server_command: node` default wrapping a native binary) | The first-class R1 decision above + doctor/migrate rewrite + R0 config snapshots. |
| 4 | **Frozen-window skew** (Rust writes an artifact the frozen TS readers reject) | The strictness audit table governs "no new keys in strict-read artifacts"; frozen-TS-strict-parse CI over Rust-written fixtures; the emergency-patch path. |
| 5 | **YAML normalization churn** on user files | Insertion-ordered maps + stringify byte goldens vs TS output; accepted diffs reviewed and committed only deliberately. |
| 6 | **Search/FTS5 determinism drift** (hand-ported scorer; Node-bundled SQLite vs rusqlite) | Ranking goldens for both engines; pinned unicode61 tokenizer + bundled SQLite; the index is disposable, so worst case is re-pin + rebuild. |
| 7 | **Watch semantics deltas** | Runner stays polling bug-for-bug (trigger-visible contract); only display-refresh watchers (console, Vault) upgrade to notify, deliberately. |
| 8 | **zod↔serde strictness parity** (`.strict()` vs `.passthrough()` vs strip) | Accept/reject corpora per schema + the audit table; passthrough ≠ `deny_unknown_fields`. |
| 9 | **SSE framing/event-name drift** | Transcript goldens pin names/ordering/heartbeats; existing Playwright EventSource assertions run unchanged. |
| 10 | **Cross-implementation lock/temp-file interop during the window** | Stale-reclaimable core locks (landed pre-migration) + the mixed-implementation contention test at R1; temp-file naming (`.<name>.<pid>.<uuid>.tmp`) pinned as preserved bug-for-bug. |

## Done when

`cargo build` produces `overlay`, `agent-overlay-server`, `agent-vault-server`, and `agent-runner`;
the Tauri apps boot from Rust sidecars on a clean machine; the NixOS node runs the Rust runner and
vault server; the acceptance matrix passes all-Rust (R→R→R); and no Node runtime remains in the
three product repos outside the two `web/` build chains.
