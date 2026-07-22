# System Architecture — Overlay · Vault · Runner

> **Audience:** anyone working on any of the three planes.
> **Status:** authoritative architecture overview. Per-plane detail lives in the sibling docs linked
> at the bottom; product detail for Overlay lives in [`docs/agent-overlay-prd.md`](../Agent-Overlay/docs/agent-overlay-prd.md).

## Thesis

We are building one system out of three planes. The durable value of an agent setup is not the model
or the runtime — those churn — it is **the memory, policies, skills, workflows, and standards you
accumulate**, plus a pleasant way to *edit* them and a reliable way to *act* on them. Stated as roles:
**Overlay is a control plane between any LLM runtime and any markdown surface** — Vault is the editor
built for it, the corpus is what they share, and the Runner is the optional loop that decides *when*
work happens. Historically
those planes lived in three product repos; since Phase 8.2 the Runner remains a separate daemon
process but ships from Agent-Overlay, and the old Agent-Runner repo is an archived historical pointer.
The planes still do one job each over a single shared corpus of plain markdown/YAML files.

**Three planes over one corpus:**

| Plane | Repository | One-line role |
| --- | --- | --- |
| **Edit** | **Agent-Vault** | A markdown editor/wiki where humans *and* LLMs are first-class editors of the corpus. |
| **Doctrine / serve** | **Agent-Overlay** | Holds the canonical corpus, validates it, and serves it live to agents over MCP. The library the others call. |
| **Trigger / execution** | **Agent-Runner** (daemon; ships from Agent-Overlay — old repo archived) | The standalone loop that decides *when* work runs and dispatches a trigger binding to an executor. Since Phase 8.2 the daemon ships from Agent-Overlay (`crates/agent-runner`), bundled with the desktop app and released standalone for remote/headless nodes; the process boundary is unchanged. |

The corpus — a workspace conventionally at `~/overlay/` — is the single source of truth. Everything
else (indexes, served MCP resources, compiled views, trajectories) is *derived from* it and never
authoritative. This mirrors Overlay's design principle: **plain text wins; databases and indexes are
derived, never authoritative** (see [`docs/agent-overlay-prd.md`](../Agent-Overlay/docs/agent-overlay-prd.md) §16).

## The planes and repo homes

| Repo | Owns | Must never |
| --- | --- | --- |
| **Agent-Overlay** | The corpus schema + loaders, the `overlay-core` library, the MCP server (`overlay serve`), the execution wrapper + trajectory store (`overlay run`), validation, search, secrets resolution, evals, and distribution of the `agent-runner` daemon binary. | Be an editor; merge the Runner loop into the Overlay server/console process; make Overlay libraries depend on Vault or the Runner daemon. |
| **Agent-Vault** | The human+LLM editing experience: raw markdown/canonical editing with schema-aware validation, wiki navigation/backlinks, local feature-hash chunk search, bounded related-chunk chat context, the Phase 8.1-shipped Vault-native basic-intelligence path, the memory proposal review queue UI, the overlay-gated agent-run/capture views, and the right-dock embedded Chat surface for governed read-only/suggest/allow-edits turns. | Be the doctrine store (the corpus is); be a scheduler (Runner is); write canonical memory silently. |
| **Agent-Runner** (daemon shipped from Agent-Overlay; old repo archived) | The event loop: cron, file-watch, HTTP, manual. A single dispatch path: resolve a trigger binding → invoke a named executor against a named workflow. | Hold doctrine; accumulate built-in actions; reverse the dependency arrow. |

## The load-bearing rule: the dependency arrow never reverses

`overlay-core` is a **library**. Vault and the `agent-runner` daemon depend on it; Overlay's
doctrine/server libraries depend on neither. This is the same rule the trigger system was designed around
([`agent-overlay-trigger-system-decisions.md`](../Agent-Overlay/agent-overlay-trigger-system-decisions.md),
Decision 1), generalized to all three planes. Keep the arrow straight and the system stays a set of
composable tools; reverse it — put an editor or a watcher daemon *inside* Overlay — and you have
reinvented a framework that runs you instead of a library you call.

```
        Agent-Vault                          Agent-Runner
   (edit plane, own repo)              (trigger plane, own daemon;
                                        built from Agent-Overlay since 8.2)
        │   │   │                              │        │
 imports│   │   │direct                 imports│        │watches
overlay-    │   │file r/w          overlay-core│        │corpus events
  core │    │   ▼                    (library) │        ▼
        │   │  ┌────────────────────────────────────────────┐
        │   └─▶│   ~/overlay/  — the canonical corpus          │
        │      └────────────────────────────────────────────┘
        │                     ▲                ▲
        │ embedded agents     │ serves         │ read seam + executors
        └──── MCP ───────▶ Agent-Overlay ──────┘
                       (doctrine/serve plane — depends on NEITHER sibling)
```

## The four seams

Everything the three planes do to each other happens across exactly four contracts. Keep them narrow.

### 1. Corpus seam — Vault ⇄ Overlay (shared files)
Both operate on the same files. Overlay **reads and serves**; Vault **reads and writes**. The overlay
corpus (`~/overlay/`) is the *primary* vault, but Vault can open additional **knowledge vaults** and
arbitrary folders — each a typed area with its own write-contract. For the canonical corpus, Vault
honors the same write discipline Overlay's own writers do:
- **Atomic writes:** write-to-`.tmp`-then-rename for every file (matches `crates/overlay-core/src/loaders/atomic_write.rs`).
- **Schema validation:** validate canonical types against `overlay-core` schemas before saving.
- **Propose, don't write (memory):** memory changes go through the proposal queue
  (`memory/proposals/`), never as silent canonical writes. Humans approve. (See
  [`docs/memory-cli.md`](../Agent-Overlay/docs/memory-cli.md).)

### 2. MCP seam — agents ⇄ Overlay (`overlay serve`)
The live surface. Overlay exposes the corpus as MCP **resources** (`overlay://memory/...`,
`overlay://skills/{id}`, `overlay://policy/active`, `overlay://workflows/{id}`, `overlay://standards/{id}`,
`overlay://triggers`, …), **tools** (`search-overlay`, `search-memory`, `get-skill`, `propose-memory`,
`validate-output`, …), and **workflow-prompts**. External MCP clients — Claude Code, Codex, and the
spawned agent behind Vault's tool-bearing chat turns — consume the identical surface. Vault's
right-dock Chat executes over the library turn API because MCP has no sampling in this system, but it
still executes under Overlay policy/workflow doctrine and records ordinary trajectories. This is the
**single agent lens**, in *and* out: retrieval generalizes to any open vault, and Overlay serves two
distinct content classes — **doctrine** (governs behavior) and **world-knowledge** (facts about the
operator's world, never instructions). (See [agent-overlay.md](agent-overlay.md) → "The single agent
lens"; [`docs/mcp-client-setup.md`](../Agent-Overlay/docs/mcp-client-setup.md).)

Phase 8.1 splits that user experience: basic "ask my vault" intelligence is Vault-native by design,
while Overlay remains the Engaged/governed path for workflows, policies, tools, approvals,
trajectories, shared memory, and automation. The Vault-owned contract lives in
[`Docs/native-intelligence.md`](../Agent-Vault/Docs/native-intelligence.md).

### 3. Trigger read seam — Runner ⇄ Overlay (read-only)
Runner asks Overlay "what triggers are declared?" exactly the way a session asks "what skills exist?"
— through `overlay triggers list` or the read-only `overlay://triggers` / `overlay://triggers/{id}`
resources. **Runner never writes doctrine.** It turns those validated declarations into live watchers
and timers by a deterministic **parse → validate → reconcile** step — **no LLM in the provisioning
path** (see [agent-runner.md](agent-runner.md) → "From declaration to live state"). (See
[`docs/triggers.md`](../Agent-Overlay/docs/triggers.md).)

### 4. Execution seam — Runner ⇄ executors ⇄ Overlay
Runner's one capability is to resolve a binding and invoke a named **executor**
(`claude-code` / `codex` / `direct` / `harness`) against a named **workflow**. The executor's session
pulls doctrine back through the MCP seam and records a **trajectory** via the shared `OVERLAY_RUN_ID`
(see [`docs/trajectories.md`](../Agent-Overlay/docs/trajectories.md)). The cheap, no-LLM path is just `executor: direct` —
an executor *choice*, never a Runner built-in.

## Current hardening ledger

These are implementation risks discovered in cross-repo review. They do not change the architecture;
they mark the hardening work that keeps the implementation honest against the system invariants.

- **Trusted-local is still an exposure boundary.** Local browser/Tauri origins, HTTP trigger ports, MCP
  HTTP/SSE, and any private-network deployment are privileged surfaces. They must default to loopback
  or private-network access, authenticate inbound webhooks before reading unbounded bodies, and keep
  app-control origins separate from user-controlled assets. **Landed:** Runner webhooks authenticate
  via header/HMAC and fail closed — see [agent-runner.md](agent-runner.md#current-hardening-status).
  Vault serves user-controlled assets inertly from a separate
  unprivileged loopback origin — see [agent-vault.md](agent-vault.md#current-hardening-status).
  Overlay's Streamable HTTP MCP transport is also bounded for trusted-local use: 5 MiB JSON-RPC
  bodies, 64 live sessions per process, explicit `DELETE /mcp` teardown, and 30-minute idle reaping.
- **Write safety has to be end-to-end.** The corpus is plain files, but all writers still need unique
  temp paths, atomic rename, validation before commit, and serialization where a read-modify-write
  operation can race. Overlay's canonical writer, memory acceptance **and rejection** (both serialize
  on the same workspace-level memory-review lock), and trajectory index; Vault's managed notes/open-file
  writes; Runner's state directory; and Overlay desktop capture now follow that discipline. Canonical
  **writes** use per-file locks, compare-before-rollback validation failure handling, and realpath
  symlink containment (a canonical write never follows or replaces a symlink), and both `overlay-core`'s
  file locks and Runner's state-dir slot/sync locks reclaim stale owners deterministically — dead-pid
  probe plus mtime grace windows (Runner's verbatim on-disk rules live in its README,
  "State-directory lock protocol").
- **Policy declarations are not enforcement by themselves.** Trigger reliability knobs, custom-tool
  approval metadata, and sandbox policies must be enforced on the path that actually dispatches or
  executes work. Runner now enforces trigger concurrency in-process and for generated cron dispatch;
  it also passes `overlay run --enforce`. Honestly scoped, `--enforce` OS-sandboxes **harness
  adapters only** (bwrap on Linux, sandbox-exec on macOS); the `claude-code`/`codex` agent adapters
  are **loud pass-throughs** — they keep their own sandboxes and Overlay warns on stderr that
  enforcement is delegated — and every run records its effective `sandbox_mode` on the trajectory.
  Overlay enforces a scoped-token, argument/effect-hash-bound approval protocol with network hard-deny and no-redirect/drained-output HTTP + shell tools — see [agent-overlay.md](agent-overlay.md#current-hardening-status).
- **The Rust migration window is closed (2026-07-02).** All three planes are Rust end-to-end behind
  the unchanged seams; Vault and the Runner daemon now depend on the `overlay-core` crate as a Cargo path dependency.
  Through the window they consumed the frozen TS `@overlay/core` dist (Agent-Overlay tag
  `ts-core-final`) under the frozen-core skew rule — now historical; the record and its emergency-patch
  procedure live in [rust-migration.md](rust-migration.md) → "Frozen-TS-core policy".

## End-to-end examples

**1. Author a skill (Vault → Overlay → agent).**
A human edits `skills/code-review/skill.md` in Vault. Vault validates the change against the skill
schema and writes it atomically. `overlay serve` is stateless, so the next time any Claude Code
session calls `get-skill code-review`, it gets the new body live — **no build step, no sync ritual.**

**2. Capture → triage (all three planes).**
A note lands in the corpus's `capture/` folder (dropped by a human in Vault, or by any tool).
Runner's `file-created` trigger fires and dispatches the `capture-triage` workflow via the
`claude-code` executor. That session reads doctrine over MCP, decides the note implies a durable
fact, and calls `propose-memory` — writing a *proposal*, not canonical memory. The human later opens
Vault's proposal queue, sees the conflict-similarity warnings Overlay computed, and accepts it.

**3. Nightly review (Runner → Overlay).**
A `schedule` trigger (`0 9 * * 1-5`) fires in Runner, which invokes the `pr-review` workflow. Overlay
captures the full run as a trajectory (metadata + append-only events + stdout/stderr). Vault surfaces
the run and its predicate-scored outcome for the human to skim over coffee.

**4. LLM-as-editor (Vault review, governed suggestions).**
A human opens a note in Vault's Chat dock. A governed `vault-chat` turn runs through `overlay-core`,
records a trajectory, and returns suggestions or proposals for human review and apply. See
[agent-vault.md](agent-vault.md#what-vault-adds-over-a-plain-markdown-editor) for the feature detail.

## Where to read next

- **[agent-overlay.md](agent-overlay.md)** — Overlay's role, the two surfaces, and the core library contract.
- **[agent-vault.md](agent-vault.md)** — the Vault repo definition (net-new).
- **[agent-runner.md](agent-runner.md)** — the Runner daemon role definition.
- **[build-plan.md](build-plan.md)** — the phased, full-horizon multi-repo build plan.
- **[non-goals.md](non-goals.md)** — the standing do-not-build list guarding the invariants above.
- **[openapi-contracts.md](openapi-contracts.md)** — the API-contract seam: the OpenAPI 3.1 specs for the Vault, console, and Runner HTTP surfaces, and how to generate a typed client in any language.

Background and canonical detail:
[`docs/agent-overlay-prd.md`](../Agent-Overlay/docs/agent-overlay-prd.md) ·
[`docs/trigger-system-build-plan.md`](../Agent-Overlay/docs/trigger-system-build-plan.md) ·
[`agent-overlay-trigger-system-decisions.md`](../Agent-Overlay/agent-overlay-trigger-system-decisions.md)
