# Agent-Overlay — role & interfaces

> Overlay's place in the three-repo system. For the full product vision and schemas, see
> [`docs/agent-overlay-prd.md`](../Agent-Overlay/docs/agent-overlay-prd.md) (canonical) — this doc does not restate it.
> For the system-wide picture, see [README.md](README.md).

## Role: the doctrine/serve plane and the shared library

Agent-Overlay is the **substrate** of the system. It owns the canonical corpus, defines its schema,
validates it, serves it live to agents over MCP, and ships the shared core library that the two
sibling repos build on (`crates/overlay-core` — see "The core library contract" below). It is deliberately **not an editor** (that is Vault) and **not a loop** (that
is Runner). It is a library you call, not a framework that runs you.

Overlay depends on **neither** Vault nor Runner. The dependency arrow points *into* Overlay from both
siblings and never back out — this is the load-bearing rule of the whole system
([README.md](README.md) → "the dependency arrow never reverses").

## The two surfaces Overlay already exposes

Overlay exposes the corpus through two surfaces, both already built in this repo. The siblings
consume them as follows.

### Live surface — `overlay serve` (MCP)
A stateless stdio MCP server that reads the canonical files on each request and exposes them as:
- **Resources:** `overlay://profile/active`, `overlay://memory/{section}`, `overlay://policy/active`,
  `overlay://skills` + `overlay://skills/{id}`, `overlay://workflows` + `overlay://workflows/{id}`,
  `overlay://standards/{id}`, `overlay://prompts/{id}`, `overlay://triggers` + `overlay://triggers/{id}`.
- **Tools:** `search-overlay`, `search-memory`, `get-skill`, `get-workflow`, `list-skills`,
  `propose-memory`, `record-decision`, `validate-output`, `refresh-overlay`, plus user-defined
  shell/HTTP tools.
- **Workflow-prompts:** one rendered prompt per workflow.

*Who consumes it:* the **executor sessions that Runner launches** (Claude Code / Codex connect their
own `overlay serve` child) and any interactive MCP client. **Vault's embedded agent surface** — the
planned in-app MCP client — is a post-migration Rust roadmap item (decided 2026-07-01; see
[agent-vault.md](agent-vault.md)), so it is a *future* consumer, not a current one. See
[`docs/mcp-client-setup.md`](../Agent-Overlay/docs/mcp-client-setup.md).

### Execution surface — `overlay run` + trajectory store
Wraps an executor subprocess, propagates `OVERLAY_RUN_ID`, and captures an append-only **trajectory**
(metadata + `events.jsonl` + stdout/stderr) under `trajectories/YYYY-MM-DD/` (per-day directories). See
[`docs/trajectories.md`](../Agent-Overlay/docs/trajectories.md).

*Who consumes it:* **Runner**, whose single dispatch path invokes an executor against a workflow and
relies on Overlay to record the run. **Vault** reads trajectories back to surface run history.

## The single agent lens — retrieval in *and* out

Overlay is the **one path agents use to read *and* write** corpus content. Reading is the MCP
resources plus `search-overlay` / `search-memory`; writing is the proposal/tool surface
(`propose-memory`, `record-decision`, validated tools). Agents never reach a second retrieval API.

Retrieval **generalizes beyond Overlay's own canonical types to arbitrary vault folders.** When Vault
opens a knowledge vault, Overlay indexes and serves it too — so agents get one retrieval path for
everything, and the earlier plan to bridge a separate knowledge store over HTTP (the held Agent-Vault
integration) is **superseded**: Overlay indexes the folder directly.

**Two content classes, one server.** Overlay serves two kinds of content and keeps them distinct:

- **Doctrine** — canonical types that *govern behavior* (memory, policy, skills, workflows, standards,
  triggers). Human-reviewed; memory only via the proposal queue.
- **World-knowledge** — indexed knowledge-vault content: *facts about the operator's world.*

Agents treat world-knowledge as **facts, never instructions** — it never silently becomes behavioral
doctrine. This is the federation boundary that once justified a separate repo, now preserved as a
**content distinction inside the single agent lens** rather than a split between two systems.

## The core library contract

The shared library both siblings build on is the Rust crate **`crates/overlay-core`** (since the R1
cutover of the [Rust re-platform](rust-migration.md)); at R2/R3 the siblings take it as a Cargo path
dependency. The pieces they depend on (module paths in `crates/overlay-core/src/`):

| Concern | Module | Used by |
| --- | --- | --- |
| Canonical type schemas (skill, workflow, standard, profile, policy, memory-fact, trigger, …) | `schemas/` | Vault (schema-aware editing, validation), Runner (trigger schema) |
| Workspace loading + layered (base + project) merge | `loaders/workspace.rs` | Vault (load the corpus), Runner (resolve bindings) |
| Atomic writes / retry-on-parse reads | `loaders/atomic_write.rs`, `loaders/retry_read.rs` | Vault (safe writes) |
| Deterministic search index | `search.rs` | Vault (in-app search) |
| Memory operations + conflict similarity | `memory/operations.rs`, `memory/similarity.rs` | Vault (proposal queue UI) |
| Secret resolution (env, keyring, 1password, bitwarden, pass, exec) | `secrets/` | Overlay tools/executors (server-side only) |
| Canonical file list/read/write with validation rollback | `workspace_files.rs` | Vault (file browser/editor) |
| Trajectory read/write | `trajectory/store.rs` | Vault (run history), Runner (via `overlay run`) |

**Treat `overlay-core`'s exported surface as a public contract.** Once Vault and Runner depend on
it, breaking changes ripple across repos — version it accordingly (see [build-plan.md](build-plan.md)
Phase 1).

**Frozen TS core (the migration window).** Until Vault and Runner port (R2/R3), they still consume
the TS `@overlay/core` **`packages/core/dist`** via `file:` deps — frozen at Agent-Overlay's
annotated tag **`ts-core-final`**, which accepts no changes outside the emergency-patch procedure in
[rust-migration.md](rust-migration.md) → "Frozen-TS-core policy". The frozen dist is deleted at the
Vault cutover (R3), closing the window.

## The seams Overlay offers each sibling

- **To Runner — a narrow read seam.** `overlay triggers list` and read-only `overlay://triggers[/{id}]`.
  Runner reads declarations; it never writes doctrine. Triggers are entry points, so they are not
  orphan-checked. (See [`docs/triggers.md`](../Agent-Overlay/docs/triggers.md).)
- **To Vault — a write discipline.** Vault may write the corpus directly, but under Overlay's rules:
  atomic `.tmp`-rename, schema validation before save, and **memory via the proposal queue only**
  (agents and editors *propose*; humans *approve*). There is no path that lets an agent silently
  mutate canonical memory. (See [`docs/memory-cli.md`](../Agent-Overlay/docs/memory-cli.md).)

## Current hardening status

These Overlay-specific review items are now part of the implementation contract:

- **Custom MCP tool approval fails closed.** `requires_approval` and supported policy approval gates
  (`tool:*`, `bash:*`, and network approval gates) block custom shell/HTTP tool execution until a
  trusted approval token/protocol exists.
- **Sandbox enforcement remains caller-selected.** `overlay run --enforce` exists for local adapters,
  and Runner now has a matching `--enforce` pass-through. Claude Code and Codex remain documented
  pass-through adapters under that flag.
- **Atomic writes use unique temp files.** The shared writer uses same-directory UUID temp paths,
  exclusive create, file sync, rename, and cleanup on failure.
- **Read-modify-write paths are serialized.** Memory proposal acceptance locks per proposal, and the
  trajectory daily index locks per index file to avoid duplicate accepts and lost index updates.
- **Canonical reads enforce containment.** Canonical file reads realpath-check the selected layer root
  before reading so a symlink cannot escape the workspace.

## Non-goals (Overlay)

- **Not an editor.** Overlay provides schemas, validation, and file APIs; the *editing experience*
  lives in Vault.
- **Not a loop.** No `overlay watch` subcommand, ever — a long-lived watcher daemon inside Overlay
  would reverse the dependency arrow and turn the library into a framework
  ([`agent-overlay-trigger-system-decisions.md`](../Agent-Overlay/agent-overlay-trigger-system-decisions.md),
  Decision 1).
- **No dependency on the siblings.** Overlay must build, test, and ship with neither Vault nor Runner
  present.

See the 13 design principles in [`docs/agent-overlay-prd.md`](../Agent-Overlay/docs/agent-overlay-prd.md) §16 — they all
apply unchanged here.
