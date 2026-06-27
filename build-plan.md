# Build Plan — Overlay · Vault · Runner

> The phased, full-horizon plan to take the system from today's state through all three
> repositories reaching v1. For the architecture this plan builds toward, see [README.md](README.md).

## How to read this plan

Each phase states its **goal**, the **dependency arrows that must hold** while it is built (the
load-bearing rule — `@overlay/*` is the library; Overlay depends on neither sibling), its concrete
**work**, the **guardrail** whose violation signals drift back toward a framework, and **done when**.
Phases are sequenced by dependency, not calendar. Phase _N_ names its prerequisite.

The trigger-specific phases here are the multi-repo framing of the roadmap already captured in
[`docs/trigger-system-build-plan.md`](../Agent-Overlay/docs/trigger-system-build-plan.md); that doc remains the detailed
reference for Runner internals.

---

## Phase 0 — Foundation (done)

**Goal:** a working doctrine/serve plane and a corpus schema worth building on.

Already shipped in this repo:
- `@overlay/core` — schemas, layered workspace loaders, atomic writes / retry-on-parse reads, search
  index, memory operations + conflict similarity, secrets resolution, trajectory store, eval
  predicates, canonical file APIs.
- `overlay serve` — stateless MCP server (resources, tools, workflow-prompts).
- `overlay run` + trajectory store — execution wrapper with `OVERLAY_RUN_ID` propagation.
- Memory layer with the **proposal queue** (propose → human review → accept/supersede).
- Evals, secrets hardening, project (layered) overlays, search.
- **Trigger seam, Phase 1** — `triggers/` canonical directory, `TriggerSchema`, `validateTriggerRefs`,
  `overlay triggers list`, read-only `overlay://triggers[/{id}]`.
- **Electron desktop foundation** (`apps/desktop`) — workspace browser/editor with validation
  rollback, proposal queue, trajectory viewer, search, diagnostics.

**Done when:** ✅ already true. `tsc -b` and the Vitest suite are green; `overlay validate --strict`
passes on the default workspace.

---

## Phase 1 — Solidify the shared contract

**Goal:** make `@overlay/core` a stable contract that two external repos can depend on, and resolve
the one decision that gates Vault's shape.

**Dependency arrows:** establish `@overlay/*` as the published library boundary. Nothing depends on
Vault or Runner yet.

**Work:**
- Treat `@overlay/core`'s exported surface (the contract table in [agent-overlay.md](agent-overlay.md))
  as public API: confirm every export the siblings need is actually exported, documented, and covered
  by tests. Adopt a versioning policy so breaking changes are visible across repos.
- Harden the trigger seam only as far as a real consumer will need it (the "Phase 2 candidate scope"
  in [`docs/trigger-system-build-plan.md`](../Agent-Overlay/docs/trigger-system-build-plan.md): richer event matching,
  optional static per-trigger `inputs`, schedule timezone validation). Pull each item in **only** when
  Runner actually exercises it — not speculatively.
- **Define the agent-collaboration conventions spec** — provenance (human vs. agent authorship), stable
  IDs/slugs, machine-parseable links, section-addressable + conflict-tolerant writes. These are
  *portable corpus conventions*, a spec rather than an editor feature, so an agent or any tool can
  produce conforming files. Phase 2 implements honoring them. (See [agent-vault.md](agent-vault.md) →
  "Conventions — the agent-collaboration spec".)
- **Vault delivery direction (decided): web-first → Tauri V2.** Vault is a new HTML/CSS/JS front-end,
  not a continuation of the Electron `apps/desktop` shell. Reuse the framework-agnostic logic that
  already lives in `@overlay/core` (validation, `workspace-files/`, `memory/`, search, trajectory
  reads); do not carry forward the Electron main/preload/IPC layer. Overlay's own desktop surface also
  moves to Tauri V2, so both repos converge on one desktop story. (See
  [agent-vault.md](agent-vault.md) → "Tech stack & delivery".)

**Guardrail:** every seam addition must remain *declarative doctrine* or *read-only*. If a proposed
change would make Overlay *act* when something happens, it belongs in Runner, not here.

**Done when:** the `@overlay/core` public surface is documented and version-pinned; the web→Tauri
delivery direction is recorded; no seam change has added runtime behavior to Overlay.

---

## Phase 2 — Agent-Vault MVP

**Goal:** a markdown editor over the corpus where humans and an embedded agent both edit as
first-class citizens — built **web-first (HTML/CSS/JS)**.

**Scope:** the MVP targets the **overlay corpus** (the primary vault). Opening *multiple* knowledge
vaults / arbitrary folders is a deliberate later generalization (Phase 5), built on the same
typed-area write-contract model — not a separate code path.

**Prerequisite:** Phase 1 (stable `@overlay/core`; web→Tauri direction recorded).

**Dependency arrows:** `Agent-Vault ──imports──▶ @overlay/core`; `Agent-Vault ──MCP──▶ overlay serve`;
`Agent-Vault ──atomic file r/w──▶ corpus`. Overlay still depends on neither sibling.

**Work (smallest useful first):**
1. **Editor over the corpus.** Open/browse/edit the workspace as markdown/YAML, with live file
   watching so external changes reflect immediately.
2. **Schema-aware editing.** Validate canonical types against `@overlay/core` schemas before saving;
   atomic `.tmp`-rename writes. Reuse the validation-rollback file APIs in `workspace-files/` (the
   logic, not the Electron shell). Honor the Phase 1 conventions spec — record provenance, keep stable
   IDs, write section-addressably — and call `@overlay/core`'s validator rather than reimplementing it.
3. **Proposal review queue UI.** Surface `memory/proposals/` for accept/reject/supersede, showing the
   conflict-similarity warnings from `memory/similarity.ts`.
4. **Wiki navigation / backlinks** across the corpus (workflow ↔ skills/standards, fact ↔ entities).
5. **Embedded agent surface** wired to a local `overlay serve` over MCP — the in-app AI sees the same
   doctrine as any other client, and its memory changes route through the proposal queue.

The MVP is a **web build**; the Tauri V2 wrap for local-first polish is Phase 5, not a blocker here.

**Guardrail:** Vault never schedules or acts on a timer/event to *run* work (that's Runner). It
watches files only to *display* them. No silent canonical memory writes — human or agent.

**Done when:** a human can author/edit any canonical type in the Vault web app and have `overlay serve`
reflect it live; the proposal queue is usable end-to-end; the embedded agent can read doctrine and
file a memory proposal that appears in the queue.

---

## Phase 3 — Agent-Runner

**Goal:** the standalone loop that consumes the Phase 1 trigger seam and dispatches to executors.

**Prerequisite:** Phase 1 (trigger seam stable). Independent of Phase 2 — Runner and Vault can be
built in parallel once the contract is stable.

**Dependency arrows:** `Agent-Runner ──imports──▶ @overlay/*`; `Agent-Runner ──read seam──▶ overlay://triggers`;
`Agent-Runner ──invokes──▶ executors ──MCP──▶ overlay serve`. Never the reverse.

**Work (internally phased, from [`docs/trigger-system-build-plan.md`](../Agent-Overlay/docs/trigger-system-build-plan.md)):**
1. **Consume the seam.** Read trigger declarations through `overlay triggers list` / `overlay://triggers`.
   No watching yet — prove the Runner can see doctrine.
2. **Single dispatch path.** Implement exactly one capability: resolve a binding → invoke the named
   executor against the named workflow (reusing the `direct` adapter for the cheap path and
   `overlay run`/adapters for judgment paths).
3. **Watchers.** Add `schedule`, then `file-created`/`file-changed`, then `http` as separate modules
   that all funnel into the single dispatch path.
4. **Reconcile.** Materialize declarations into live state deterministically — **parse → validate →
   reconcile, no LLM**. In-process watchers by default (`file`/`http` are always in-process); only
   `schedule` may project to native systemd/cron/launchd units (derived artifacts, never hand-edited).
   `agent-runner sync` is idempotent and owns *add and remove*, so deleting a declaration tears its
   watcher/unit down cleanly. (See [agent-runner.md](agent-runner.md) → "From declaration to live state".)
5. **Packaging.** The Runner's own systemd + launchd units. The same trigger declarations drive runners
   on multiple machines.

**Guardrail:** the Runner holds **no** doctrine and accumulates **no** built-in actions; the cheap
path is an `executor: direct` choice, never a daemon feature; never add an `overlay watch` subcommand.

**Done when:** a `schedule` and a `file-created` trigger each fire and drive a workflow to a captured
trajectory, with the Runner owning no behavior beyond resolve-and-dispatch; `agent-runner sync`
reconciles declarations idempotently and deleting one tears its watcher/unit down with no orphan;
units run the daemon on Linux and macOS.

---

## Phase 4 — Integration

**Goal:** close the capture → triage → review loop across all three planes.

**Prerequisite:** Phases 2 and 3.

**Work:**
- Point a Runner `file-created` trigger at a corpus `capture/` (inbox) folder that Vault writes to.
- A note landing there fires a triage workflow via an executor; the agent reads doctrine over MCP and
  files a **memory proposal** (not a canonical write).
- Vault surfaces that proposal in its review queue **and** surfaces the Runner-driven run's trajectory
  and predicate-scored outcome.
- The originally-planned Agent-Vault integration
  ([`docs/trigger-system-build-plan.md`](../Agent-Overlay/docs/trigger-system-build-plan.md) Phase 4) is realized as one
  instance of this general "Runner watches a data-plane folder" pattern.

**Guardrail:** the loop must be explainable entirely from the corpus — the trigger binding, the
workflow, and the executor choice are all doctrine. No step hides behavior inside Runner or Vault.

**Done when:** dropping a file in Vault's capture folder results, with no further human action, in a
fired workflow, a captured trajectory, and a memory proposal awaiting review in Vault.

**Status:** proven live by the black-box acceptance harness
([`acceptance/capture-triage-loop.mjs`](acceptance/capture-triage-loop.mjs)) on the deterministic
`triage-capture-harness` executor. Two scope decisions were recorded while closing this phase, both
carried into Phase 5:

1. **Real-agent MCP wiring is deferred.** `overlay run` does not yet inject MCP server config into
   binary adapters (`claude-code`/`codex`), so only the self-launching harness reaches the
   `propose-memory` tool. The `capture-triage` fixture therefore binds the harness executor; a real
   agent executor is a Phase 5 item.
2. **Outcome scoring is exit-code-based.** `overlay run` scores a run on the adapter exit code, not the
   workflow's `expected_artifacts` predicates. Runtime predicate evaluation (via the exported
   `evaluatePredicates` / `scorePredicateEvaluations`) is a tracked Phase 5 enhancement.

---

## Phase 5 — Hardening

**Goal:** production-grade enforcement, transport, and distribution across all three repos.

**Prerequisite:** Phase 4.

**Work:**
- **Real-agent executor MCP access** — ✅ done for both executors. `overlay run` writes a transient,
  host-specific MCP config pointing at the same `overlay serve` and invokes the agent headlessly:
  `claude-code` (Agent-Overlay `1fa7a9d`) via `claude -p … --mcp-config … --allowedTools mcp__overlay__…
  --permission-mode dontAsk`; `codex` (Agent-Overlay `ca4c882`) via `codex exec --json
  -c mcp_servers.overlay.* -a never -s workspace-write`. The live agent proofs are manual (they egress
  workspace content to the external CLIs); the deterministic harness covers the wiring.
- **Runtime predicate scoring** — ✅ done (Agent-Overlay `498a62c`): `overlay run` evaluates a workflow's
  `expected_artifacts` and populates real `predicate_results`/`score` (workspace-relative, so
  Runner-dispatched triage scores correctly).
- **Wrapper-mode policy enforcement** for `overlay run` — ✅ done (Agent-Overlay `dcb19e0`+`8d1840b`):
  opt-in `--enforce` wraps local process adapters in a policy-derived OS sandbox (bwrap on Linux,
  sandbox-exec on macOS) with a minimal runtime base; claude-code/codex are pass-through. Proven on the
  NixOS node both ways — an allowed enforced run executes (reads `/proc`, writes the workspace) and a
  denied path (`/etc/passwd`) is blocked (ENOENT) inside the sandbox.
- **HTTP/SSE MCP transport** — ✅ done (Agent-Overlay `0899843`): `overlay serve --transport http`
  (StreamableHTTP at `/mcp`, `--host`/`--port`, DNS-rebinding protection, localhost default); stdio
  remains the default. Verified live with a real SDK HTTP client reading resources + tools.
- **Multi-runner** in practice — ✅ runner deployed and proven on a NixOS node (systemd user unit; full
  capture→triage→proposal loop with a predicate-scored trajectory; SIGKILL→restart verified). Scoped by
  design to a **single server runner fed by Syncthing-synced vaults** — edits replicate to the server and
  one runner acts on them, which avoids second-node double-fire. The launchd path stays templated
  (`Agent-Runner/units/com.overlay.runner.plist`); a literal second node is deferred.
- **Knowledge vaults & generalized retrieval.** Let Vault open *multiple* knowledge vaults / arbitrary
  folders beyond the overlay corpus, and **generalize Overlay's index** so agents retrieve that content
  through the single agent lens — served as **world-knowledge**, kept distinct from doctrine. This
  supersedes the held Agent-Vault HTTP-bridge plan: Overlay indexes the folder directly. (See
  [agent-overlay.md](agent-overlay.md) → "The single agent lens".)
  - **Prerequisite — Phase 5.0 (Vault UI rebuild):** ✅ done — Agent-Vault's UI is rebuilt in React
    behind a view-module seam (registry + router + shared context) so new views are cheap. Plan:
    `Agent-Vault/Docs/phase-5.0-view-seam.md`.
  - **Detailed #5 plan (execution-ready):** [phase-5-knowledge-vaults.md](phase-5-knowledge-vaults.md)
    — 5.1 Overlay world-knowledge index/retrieval → 5.2 Vault multi-vault editor → 5.3 integration.
    **✅ done (2026-06-27)** — all three slices landed and verified; the doctrine/world-knowledge boundary
    is proven by `acceptance/world-knowledge-loop.mjs`. Vault now stands alone as a multi-vault editor
    with Overlay as an optional plug-in.
- **Tauri V2 wrap.** Package the Vault web app as a local-first Tauri V2 app, and migrate Overlay's
  own desktop surface to Tauri V2 as well; retire the Electron `apps/desktop` once parity is reached.
- **Distribution/packaging** for all three: Overlay (single binary + Tauri desktop), Vault (Tauri
  desktop app), Runner (service units), with install/update detection.

**Guardrail:** enforcement and transport are added at the edges (executors, server transport) without
moving doctrine out of plain files or giving the Runner/Vault privileged built-ins.

**Done when:** policies are enforced (not merely advised) on `overlay run`; an MCP client can connect
over HTTP/SSE; all three repos have signed/packaged, self-updating distributions.

---

## Dependency map (at a glance)

```
Phase 0 (done) ─▶ Phase 1 ─┬─▶ Phase 2 (Vault) ─┐
                           └─▶ Phase 3 (Runner) ─┴─▶ Phase 4 ─▶ Phase 5
```

Phase 1 is the gate: it freezes the `@overlay/core` contract and decides Vault's shape, after which
Vault (Phase 2) and Runner (Phase 3) proceed in parallel and converge at Phase 4.
