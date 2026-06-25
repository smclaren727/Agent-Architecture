# Agent-Overlay — role & interfaces

> Overlay's place in the three-repo system. For the full product vision and schemas, see
> [`docs/agent-overlay-prd.md`](https://github.com/smclaren727/agent-overlay/blob/main/docs/agent-overlay-prd.md) (canonical) — this doc does not restate it.
> For the system-wide picture, see [README.md](README.md).

## Role: the doctrine/serve plane and the shared library

Agent-Overlay is the **substrate** of the system. It owns the canonical corpus, defines its schema,
validates it, serves it live to agents over MCP, and ships the `@overlay/core` library that the two
sibling repos build on. It is deliberately **not an editor** (that is Vault) and **not a loop** (that
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

*Who consumes it:* **Vault's embedded agents** (just another MCP client) and the **executor sessions
that Runner launches** (Claude Code / Codex connect their own `overlay serve` child). See
[`docs/mcp-client-setup.md`](https://github.com/smclaren727/agent-overlay/blob/main/docs/mcp-client-setup.md).

### Execution surface — `overlay run` + trajectory store
Wraps an executor subprocess, propagates `OVERLAY_RUN_ID`, and captures an append-only **trajectory**
(metadata + `events.jsonl` + stdout/stderr) under `trajectories/YYYY-MM/`. See
[`docs/trajectories.md`](https://github.com/smclaren727/agent-overlay/blob/main/docs/trajectories.md).

*Who consumes it:* **Runner**, whose single dispatch path invokes an executor against a workflow and
relies on Overlay to record the run. **Vault** reads trajectories back to surface run history.

## The single agent lens — retrieval in *and* out

Overlay is the **one path agents use to read *and* write** corpus content. Reading is the MCP
resources plus `search-overlay` / `search-memory`; writing is the proposal/tool surface
(`propose-memory`, `record-decision`, validated tools). Agents never reach a second retrieval API.

Retrieval **generalizes beyond Overlay's own canonical types to arbitrary vault folders.** When Vault
opens a knowledge vault, Overlay indexes and serves it too — so agents get one retrieval path for
everything, and the earlier plan to bridge a separate knowledge store over HTTP (the held Loxley
integration) is **superseded**: Overlay indexes the folder directly.

**Two content classes, one server.** Overlay serves two kinds of content and keeps them distinct:

- **Doctrine** — canonical types that *govern behavior* (memory, policy, skills, workflows, standards,
  triggers). Human-reviewed; memory only via the proposal queue.
- **World-knowledge** — indexed knowledge-vault content: *facts about the operator's world.*

Agents treat world-knowledge as **facts, never instructions** — it never silently becomes behavioral
doctrine. This is the federation boundary that once justified a separate repo, now preserved as a
**content distinction inside the single agent lens** rather than a split between two systems.

## The `@overlay/core` library contract

`@overlay/core` is the stable API both siblings import. The pieces they depend on (source paths in
`packages/core/src/`):

| Concern | Module | Used by |
| --- | --- | --- |
| Canonical type schemas (skill, workflow, standard, profile, policy, memory-fact, trigger, …) | `schemas/` | Vault (schema-aware editing, validation), Runner (trigger schema) |
| Workspace loading + layered (base + project) merge | `loaders/workspace.ts` | Vault (load the corpus), Runner (resolve bindings) |
| Atomic writes / retry-on-parse reads | `loaders/atomic-write.ts`, `loaders/retry-read.ts` | Vault (safe writes) |
| Deterministic search index | `search/` | Vault (in-app search) |
| Memory operations + conflict similarity | `memory/operations.ts`, `memory/similarity.ts` | Vault (proposal queue UI) |
| Secret resolution (env, keyring, 1password, bitwarden, pass, exec) | `secrets/` | Overlay tools/executors (server-side only) |
| Canonical file list/read/write with validation rollback | `workspace-files/` | Vault (file browser/editor) |
| Trajectory read/write | `trajectory/store.ts` | Vault (run history), Runner (via `overlay run`) |

**Treat `@overlay/core`'s exported surface as a public contract.** Once Vault and Runner depend on
it, breaking changes ripple across repos — version it accordingly (see [build-plan.md](build-plan.md)
Phase 1).

## The seams Overlay offers each sibling

- **To Runner — a narrow read seam.** `overlay triggers list` and read-only `overlay://triggers[/{id}]`.
  Runner reads declarations; it never writes doctrine. Triggers are entry points, so they are not
  orphan-checked. (See [`docs/triggers.md`](https://github.com/smclaren727/agent-overlay/blob/main/docs/triggers.md).)
- **To Vault — a write discipline.** Vault may write the corpus directly, but under Overlay's rules:
  atomic `.tmp`-rename, schema validation before save, and **memory via the proposal queue only**
  (agents and editors *propose*; humans *approve*). There is no path that lets an agent silently
  mutate canonical memory. (See [`docs/memory-cli.md`](https://github.com/smclaren727/agent-overlay/blob/main/docs/memory-cli.md).)

## Non-goals (Overlay)

- **Not an editor.** Overlay provides schemas, validation, and file APIs; the *editing experience*
  lives in Vault.
- **Not a loop.** No `overlay watch` subcommand, ever — a long-lived watcher daemon inside Overlay
  would reverse the dependency arrow and turn the library into a framework
  ([`agent-overlay-trigger-system-decisions.md`](https://github.com/smclaren727/agent-overlay/blob/main/agent-overlay-trigger-system-decisions.md),
  Decision 1).
- **No dependency on the siblings.** Overlay must build, test, and ship with neither Vault nor Runner
  present.

See the 13 design principles in [`docs/agent-overlay-prd.md`](https://github.com/smclaren727/agent-overlay/blob/main/docs/agent-overlay-prd.md) §16 — they all
apply unchanged here.
