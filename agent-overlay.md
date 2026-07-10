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

Phase 8.1 sharpens the Vault boundary: Overlay owns **Engaged/governed** agent behavior — doctrine,
workflows, policies, tools, approvals, proposal queues, trajectories, shared memory, MCP surfaces,
and Runner automation. Basic "ask my vault" chat is Vault-native by design and does not route
through Overlay; the contract lives in
[`Docs/native-intelligence.md`](../Agent-Vault/Docs/native-intelligence.md).

## The two surfaces Overlay already exposes

Overlay exposes the corpus through two surfaces, both already built in this repo. The siblings
consume them as follows.

### Live surface — `overlay serve` (MCP)
A stateless MCP server that reads the canonical files on each request. Stdio is the default transport;
StreamableHTTP is also available at `/mcp` for HTTP MCP clients, with DNS-rebinding protection, a 5 MiB
JSON-RPC body cap, and a bounded live-session pool. Both transports expose:
- **Resources:** `overlay://profile/active`, `overlay://memory/{section}`, `overlay://policy/active`,
  `overlay://skills` + `overlay://skills/{id}`, `overlay://workflows` + `overlay://workflows/{id}`,
  `overlay://standards/{id}`, `overlay://prompts/{id}`, `overlay://triggers` + `overlay://triggers/{id}`.
- **Tools:** `search-overlay`, `search-memory`, `get-skill`, `get-workflow`, `list-skills`,
  `propose-memory`, `record-decision`, `validate-output`, `refresh-overlay`, plus user-defined
  shell/HTTP tools. Built-in and custom tools pass the **same active-policy tool allowlist and
  approval gates** (list filtering + fail-closed denials; tool-level gates and rendered
  shell/network gates can proceed only with scoped console-issued approval tokens, with audit events
  recorded on the trajectory).
- **Workflow-prompts:** one rendered prompt per workflow.

*Who consumes it:* the **executor sessions that Runner launches** (Claude Code / Codex connect their
own `overlay serve` child) and any interactive MCP client. **Vault's embedded chat** (shipped
2026-07-03) executes its turns over the *library* channel — MCP has no sampling, so it cannot
produce a completion (see `adapters/turn.rs` in the contract table below); since 2026-07-04 a
tool-bearing turn's *spawned agent* (claude-code/codex) is itself an MCP client of `overlay serve`,
which is how in-app turns reach doctrine tools without an MCP client inside Vault. See
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
| Governed chat turns — direct or tool-bearing claude-code/codex execution (MCP re-entry) under the `vault-chat` workflow, trajectory-recorded, suggest-format parsing | `adapters/turn.rs` | Vault (embedded chat) |
| Agent/profile introspection — per-profile readiness + `toolAccess` with provenance (`adapter` \| `policy` \| `unknown`) + passive local-agent CLI discovery; the same answer the console serves at `GET /api/agents/status` | `adapters/introspection.rs` (policy gate in `policy_gate.rs`) | Vault (chat profile/runtime status display) |
| Local agent lifecycle hook doctrine — canonical `hooks/*.yaml` definitions plus console install snippets and bounded ingest events | `schemas/hook.rs`, console `GET /api/agents/hooks`, `POST /api/agents/hooks/ingest` | Overlay console (Codex/Claude hook setup and audit display) |
| Node-compatible filesystem/path helpers | `fs_util.rs` | Vault and Runner (shared Rust helper seam) |

**Treat `overlay-core`'s exported surface as a public contract.** Once Vault and Runner depend on
it, breaking changes ripple across repos — version it accordingly (see [build-plan.md](build-plan.md)
Phase 1).

**Frozen TS core — window closed (2026-07-02).** Through the migration window, not-yet-ported siblings
consumed the TS `@overlay/core` **`packages/core/dist`** via `file:` deps, frozen at Agent-Overlay's
annotated tag **`ts-core-final`**. With Vault and Runner both ported to the Rust `overlay-core` crate
(Cargo path deps), `packages/core` had **zero consumers and was deleted at the R3 Vault cutover** — the
window is closed. The code stays recoverable at `ts-core-final`; the history of the window and its
emergency-patch procedure is in [rust-migration.md](rust-migration.md) → "Frozen-TS-core policy".

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

- **MCP tool policy fails closed for built-ins and custom tools alike.** One shared gate
  (`overlay-core` `policy_gate`) enforces the active policy's allow/deny and `tool:` approval gates on
  both tool classes, on both transports: disallowed tools are omitted from `tools/list`, calls fail
  closed, and denials are recorded as `tool_call_denied` trajectory events. `requires_approval`,
  `tool:*`, `bash:*`, and network approval gates can proceed only with an Overlay-minted, scoped,
  one-use approval token created by an out-of-band console decision; combined tool/effect gates mint
  one composite request. The decision route requires the packaged desktop's per-launch operator
  token, delivered to the webview outside the loopback API.
  Tool-level approvals bind to the exact run, tool, policy, requirement, and argument hash; rendered
  shell/network approvals also bind to an effect kind/hash. Network `default: deny` still
  hard-denies non-allowlisted targets instead of creating an approval request. Approval
  request/approved events are recorded without arguments, rendered effects, hashes, or tokens. HTTP
  custom tools do not follow redirects; shell custom tools drain stdout/stderr before returning
  bounded tails, so child output cannot deadlock the server.
- **Enforcement truth lives in Overlay; consumers only display it.** The introspection surface
  (`describe_agent_profiles`, console `GET /api/agents/status`) reports each profile's tool access
  with provenance and each known local agent CLI's passive readiness instead of letting siblings
  re-derive policy from config files or probe the host themselves. Discovery checks configured
  binaries, curated install paths, and sanitized absolute `PATH` entries; it does not execute
  candidate binaries or return executable paths. Vault renders that answer and never becomes a
  policy authority. The dependency arrow is unchanged: Vault depends on `overlay-core`; Overlay
  depends on neither sibling.
- **Runtime setup writes doctrine, not hidden app state.** The console's Agent Runtimes view can call
  `POST /api/agents/setup` for supported local CLIs (currently Claude Code and Codex). That route
  writes canonical `profiles/*.yaml` and `adapters/*.yaml` through Overlay's validated file writer,
  then returns refreshed profile/local-agent status. It is deliberately narrower than a generic
  profile editor.
- **Agent lifecycle hooks are YAML doctrine plus local-agent-owned execution.** Overlay loads canonical
  `hooks/*.yaml` files, exposes them through the Agent Runtimes view, and generates copyable Claude
  Code/Codex hook snippets. Installed hooks call `POST /api/agents/hooks/ingest`, which validates the
  supplied hook id, agent, and phase against active hook doctrine, appends bounded audit events under
  `.cache/agent-hooks/events.jsonl`, and never executes request-provided values. Hook trust, process
  permissions, and secrets stay in the local agent's own environment.
- **Sandbox enforcement remains caller-selected.** `overlay run --enforce` exists for local adapters,
  and Runner now has a matching `--enforce` pass-through. Claude Code and Codex remain documented
  pass-through adapters under that flag.
- **Atomic writes use unique temp files.** The shared writer uses same-directory UUID temp paths,
  exclusive create, file sync, rename, and cleanup on failure.
- **Read-modify-write paths are serialized.** Memory proposal review uses one workspace-level
  `.cache/memory-review.lock` for accept and reject decisions, and the trajectory daily index locks per
  index file to avoid duplicate accepts and lost index updates.
- **Canonical reads and writes enforce containment.** Canonical file reads realpath-check the selected
  layer root; canonical writes lock per target, realpath-check the parent directory, and refuse to
  follow or replace a symlinked final target.

## Non-goals (Overlay)

- **Not an editor.** Overlay provides schemas, validation, and file APIs; the *editing experience*
  lives in Vault.
- **Not Vault's baseline chat provider.** Overlay is in the path when Vault is Engaged/governed;
  basic "ask my vault" chat belongs to Vault's native Phase 8.1 path.
- **Not a loop.** No `overlay watch` subcommand, ever — a long-lived watcher daemon inside Overlay
  would reverse the dependency arrow and turn the library into a framework
  ([`agent-overlay-trigger-system-decisions.md`](../Agent-Overlay/agent-overlay-trigger-system-decisions.md),
  Decision 1).
- **No sibling product dependency.** Overlay libraries and the console/server must not depend on
  Vault or on a running Runner daemon. The `agent-runner` crate now ships from this repo, but it
  remains a separate binary/process; it must not become an in-process requirement of `overlay-core`,
  `overlay serve`, or the console server.

See the 13 design principles in [`docs/agent-overlay-prd.md`](../Agent-Overlay/docs/agent-overlay-prd.md) §16 — they all
apply unchanged here.
