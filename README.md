# System Architecture — Overlay · Vault · Runner

> **Audience:** anyone working on any of the three repositories.
> **Status:** authoritative architecture overview. Per-repo detail lives in the sibling docs linked
> at the bottom; product detail for Overlay lives in [`docs/agent-overlay-prd.md`](https://github.com/smclaren727/agent-overlay/blob/main/docs/agent-overlay-prd.md).

## Thesis

We are building one system out of three repositories. The durable value of an agent setup is not the
model or the runtime — those churn — it is **the memory, policies, skills, workflows, and standards
you accumulate**, plus a pleasant way to *edit* them and a reliable way to *act* on them. We split
that into three repositories, each doing one job well, over a single shared corpus of plain
markdown/YAML files.

**Three planes over one corpus:**

| Plane | Repository | One-line role |
| --- | --- | --- |
| **Edit** | **Agent-Vault** | A markdown editor/wiki where humans *and* LLMs are first-class editors of the corpus. |
| **Doctrine / serve** | **Agent-Overlay** | Holds the canonical corpus, validates it, and serves it live to agents over MCP. The library the others call. |
| **Trigger / execution** | **Agent-Runner** | The standalone loop that decides *when* work runs and dispatches a trigger binding to an executor. |

The corpus — a workspace conventionally at `~/overlay/` — is the single source of truth. Everything
else (indexes, served MCP resources, compiled views, trajectories) is *derived from* it and never
authoritative. This mirrors Overlay's design principle: **plain text wins; databases and indexes are
derived, never authoritative** (see [`docs/agent-overlay-prd.md`](https://github.com/smclaren727/agent-overlay/blob/main/docs/agent-overlay-prd.md) §16).

## The three repositories

| Repo | Owns | Must never |
| --- | --- | --- |
| **Agent-Overlay** | The corpus schema + loaders, the `@overlay/core` library, the MCP server (`overlay serve`), the execution wrapper + trajectory store (`overlay run`), validation, search, secrets resolution, evals. | Be an editor; be a loop; depend on Vault or Runner. |
| **Agent-Vault** | The human+LLM editing experience: schema-aware editors, wiki navigation/backlinks, the memory proposal review queue UI, an embedded agent surface. | Be the doctrine store (the corpus is); be a scheduler (Runner is); write canonical memory silently. |
| **Agent-Runner** | The event loop: cron, file-watch, HTTP, manual. A single dispatch path: resolve a trigger binding → invoke a named executor against a named workflow. | Hold doctrine; accumulate built-in actions; reverse the dependency arrow. |

## The load-bearing rule: the dependency arrow never reverses

`@overlay/*` is a **library**. Both siblings depend on it; **Overlay depends on neither.** This is
the same rule the trigger system was designed around
([`agent-overlay-trigger-system-decisions.md`](https://github.com/smclaren727/agent-overlay/blob/main/agent-overlay-trigger-system-decisions.md),
Decision 1), generalized to all three repos. Keep the arrow straight and the system stays a set of
composable tools; reverse it — put an editor or a watcher daemon *inside* Overlay — and you have
reinvented a framework that runs you instead of a library you call.

```
        Agent-Vault                          Agent-Runner
   (edit plane, own repo)              (trigger plane, own repo)
        │   │   │                              │        │
 imports│   │   │direct                 imports│        │watches
@overlay/   │   │file r/w          @overlay/*  │        │corpus events
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

Everything the three repos do to each other happens across exactly four contracts. Keep them narrow.

### 1. Corpus seam — Vault ⇄ Overlay (shared files)
Both operate on the same files. Overlay **reads and serves**; Vault **reads and writes**. The overlay
corpus (`~/overlay/`) is the *primary* vault, but Vault can open additional **knowledge vaults** and
arbitrary folders — each a typed area with its own write-contract. For the canonical corpus, Vault
honors the same write discipline Overlay's own writers do:
- **Atomic writes:** write-to-`.tmp`-then-rename for every file (matches `packages/core/src/loaders/atomic-write.ts`).
- **Schema validation:** validate canonical types against `@overlay/core` schemas before saving.
- **Propose, don't write (memory):** memory changes go through the proposal queue
  (`memory/proposals/`), never as silent canonical writes. Humans approve. (See
  [`docs/memory-cli.md`](https://github.com/smclaren727/agent-overlay/blob/main/docs/memory-cli.md).)

### 2. MCP seam — agents ⇄ Overlay (`overlay serve`)
The live surface. Overlay exposes the corpus as MCP **resources** (`overlay://memory/...`,
`overlay://skills/{id}`, `overlay://policy/active`, `overlay://workflows/{id}`, `overlay://standards/{id}`,
`overlay://triggers`, …), **tools** (`search-overlay`, `search-memory`, `get-skill`, `propose-memory`,
`validate-output`, …), and **workflow-prompts**. Any MCP client — Claude Code, Codex, or Vault's
embedded agent — consumes the identical surface. This is the **single agent lens**, in *and* out:
retrieval generalizes to any open vault, and Overlay serves two distinct content classes — **doctrine**
(governs behavior) and **world-knowledge** (facts about the operator's world, never instructions). (See
[agent-overlay.md](agent-overlay.md) → "The single agent lens"; [`docs/mcp-client-setup.md`](https://github.com/smclaren727/agent-overlay/blob/main/docs/mcp-client-setup.md).)

### 3. Trigger read seam — Runner ⇄ Overlay (read-only)
Runner asks Overlay "what triggers are declared?" exactly the way a session asks "what skills exist?"
— through `overlay triggers list` or the read-only `overlay://triggers` / `overlay://triggers/{id}`
resources. **Runner never writes doctrine.** It turns those validated declarations into live watchers
and timers by a deterministic **parse → validate → reconcile** step — **no LLM in the provisioning
path** (see [agent-runner.md](agent-runner.md) → "From declaration to live state"). (See
[`docs/triggers.md`](https://github.com/smclaren727/agent-overlay/blob/main/docs/triggers.md).)

### 4. Execution seam — Runner ⇄ executors ⇄ Overlay
Runner's one capability is to resolve a binding and invoke a named **executor**
(`claude-code` / `codex` / `direct` / `harness`) against a named **workflow**. The executor's session
pulls doctrine back through the MCP seam and records a **trajectory** via the shared `OVERLAY_RUN_ID`
(see [`docs/trajectories.md`](https://github.com/smclaren727/agent-overlay/blob/main/docs/trajectories.md)). The cheap, no-LLM path is just `executor: direct` —
an executor *choice*, never a Runner built-in.

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

**4. LLM-as-editor (Vault).**
Vault's embedded agent — itself just another MCP client of `overlay serve` — maintains wiki notes,
adds backlinks across the corpus, and proposes a `decision` fact. The human approves it in-app; it
becomes canonical memory served identically to every other client.

## Where to read next

- **[agent-overlay.md](agent-overlay.md)** — Overlay's role, the two surfaces, and the `@overlay/core` library contract.
- **[agent-vault.md](agent-vault.md)** — the Vault repo definition (net-new).
- **[agent-runner.md](agent-runner.md)** — the Runner repo definition.
- **[build-plan.md](build-plan.md)** — the phased, full-horizon multi-repo build plan.

Background and canonical detail:
[`docs/agent-overlay-prd.md`](https://github.com/smclaren727/agent-overlay/blob/main/docs/agent-overlay-prd.md) ·
[`docs/trigger-system-build-plan.md`](https://github.com/smclaren727/agent-overlay/blob/main/docs/trigger-system-build-plan.md) ·
[`agent-overlay-trigger-system-decisions.md`](https://github.com/smclaren727/agent-overlay/blob/main/agent-overlay-trigger-system-decisions.md)
