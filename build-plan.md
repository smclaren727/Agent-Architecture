# Build Plan — Overlay · Vault · Runner

> The phased, full-horizon plan to take the system from today's state through all three
> repositories reaching v1. For the architecture this plan builds toward, see [README.md](README.md).

## How to read this plan

Each phase states its **goal**, the **dependency arrows that must hold** while it is built (the
load-bearing rule — `overlay-core` is the library seam; Overlay depends on neither sibling), its concrete
**work**, the **guardrail** whose violation signals drift back toward a framework, and **done when**.
Phases are sequenced by dependency, not calendar. Phase _N_ names its prerequisite.

The trigger-specific phases here are the multi-repo framing of the roadmap already captured in
[`docs/trigger-system-build-plan.md`](../Agent-Overlay/docs/trigger-system-build-plan.md); that doc remains the detailed
reference for Runner internals.

---

## Phase 0 — Foundation (done)

**Goal:** a working doctrine/serve plane and a corpus schema worth building on.

Already shipped in this repo:
- `overlay-core` — the shared library seam (originally the TS `@overlay/core` package; now the
  Rust crate) for schemas, layered workspace loaders, atomic writes / retry-on-parse reads, search
  index, memory operations + conflict similarity, secrets resolution, trajectory store, eval
  predicates, and canonical file APIs.
- `overlay serve` — stateless MCP server (resources, tools, workflow-prompts).
- `overlay run` + trajectory store — execution wrapper with `OVERLAY_RUN_ID` propagation.
- Memory layer with the **proposal queue** (propose → human review → accept/supersede).
- Evals, secrets hardening, project (layered) overlays, search.
- **Trigger seam, Phase 1** — `triggers/` canonical directory, trigger schema, `validate_trigger_refs`,
  `overlay triggers list`, read-only `overlay://triggers[/{id}]`.
- **Electron desktop foundation** (`apps/desktop`) — workspace browser/editor with validation
  rollback, proposal queue, trajectory viewer, search, diagnostics. *(Since re-platformed off Electron
  to a local web app — see the [Overlay UI re-platform](overlay-ui-replatform.md).)*

**Original done condition (historical TS baseline):** ✅ `tsc -b` and the Vitest suite were green;
`overlay validate --strict` passed on the default workspace.

---

## Phase 1 — Solidify the shared contract (done)

**Goal:** make the shared Overlay core contract stable enough for two external repos to depend on,
and resolve the one decision that gates Vault's shape.

**Dependency arrows:** establish `overlay-core` as the published library boundary. Nothing depends on
Vault or Runner yet.

**Work:**
- Treat `overlay-core`'s exported surface (the contract table in [agent-overlay.md](agent-overlay.md))
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
  already lives in `overlay-core` (validation, `workspace-files/`, `memory/`, search, trajectory
  reads); do not carry forward the Electron main/preload/IPC layer. Overlay's own desktop surface also
  moves to Tauri V2, so both repos converge on one desktop story. (See
  [agent-vault.md](agent-vault.md) → "Tech stack & delivery".) *(The web-first direction held; the
  original framework-free HTML/CSS/JS UI was later rebuilt in React + Vite + Tailwind + shadcn in Phase
  5.0. Overlay's desktop surface was re-platformed off Electron to a local web app, and both apps then
  shipped model-B Tauri v2 wraps on 2026-06-30 — see Phase 5.)*

**Guardrail:** every seam addition must remain *declarative doctrine* or *read-only*. If a proposed
change would make Overlay *act* when something happens, it belongs in Runner, not here.

**Done when:** the shared core public surface is documented and version-pinned; the web→Tauri
delivery direction is recorded; no seam change has added runtime behavior to Overlay.

---

## Phase 2 — Agent-Vault MVP (done)

**Goal:** a markdown editor over the corpus where humans and an embedded agent both edit as
first-class citizens — built **web-first** (originally framework-free HTML/CSS/JS; the UI was later
rebuilt in React behind a view-module seam in Phase 5.0).

**Scope:** the MVP targets the **overlay corpus** (the primary vault). Opening *multiple* knowledge
vaults / arbitrary folders is a deliberate later generalization (Phase 5), built on the same
typed-area write-contract model — not a separate code path.

**Prerequisite:** Phase 1 (stable Overlay core library seam; web→Tauri direction recorded).

**Dependency arrows:** `Agent-Vault ──imports──▶ overlay-core`; `Agent-Vault ──MCP──▶ overlay serve`;
`Agent-Vault ──atomic file r/w──▶ corpus`. Overlay still depends on neither sibling.

**Work (smallest useful first):**
1. **Editor over the corpus.** Open/browse/edit the workspace as markdown/YAML, with live file
   watching so external changes reflect immediately.
2. **Schema-aware editing.** Validate canonical types against `overlay-core` schemas before saving;
   atomic `.tmp`-rename writes. Reuse the validation-rollback file APIs in `workspace-files/` (the
   logic, not the Electron shell). Honor the Phase 1 conventions spec — record provenance, keep stable
   IDs, write section-addressably — and call `overlay-core`'s validator rather than reimplementing it.
3. **Proposal review queue UI.** Surface `memory/proposals/` for accept/reject/supersede, showing the
   conflict-similarity warnings from `memory/similarity.ts`.
4. **Wiki navigation / backlinks** across the corpus (workflow ↔ skills/standards, fact ↔ entities).
5. **Embedded agent surface** wired to a local `overlay serve` over MCP — the in-app AI sees the same
   doctrine as any other client, and its memory changes route through the proposal queue. *(Not built
   in the Node stack: the shipped agent-facing surface is the overlay-gated file-backed views —
   Capture / Proposals / Agent Runs / Workspace — and the in-app chat + MCP-client surface moved to
   the post-migration Rust roadmap, decided 2026-07-01; see [agent-vault.md](agent-vault.md).)*

The MVP is a **web build**; the Tauri V2 wrap for local-first polish is Phase 5, not a blocker here.

**Guardrail:** Vault never schedules or acts on a timer/event to *run* work (that's Runner). It
watches files only to *display* them. No silent canonical memory writes — human or agent.

**Done when:** a human can author/edit any canonical type in the Vault web app and have `overlay serve`
reflect it live; the proposal queue is usable end-to-end; an agent can read doctrine and file a
memory proposal that appears in the queue. *(The agent clause was satisfied by external MCP clients
and the Phase 4 harness executor, not an in-app agent — see work item 5.)*

---

## Phase 3 — Agent-Runner (done)

**Goal:** the standalone loop that consumes the Phase 1 trigger seam and dispatches to executors.

**Prerequisite:** Phase 1 (trigger seam stable). Independent of Phase 2 — Runner and Vault can be
built in parallel once the contract is stable.

**Dependency arrows:** `Agent-Runner ──imports──▶ overlay-core`; `Agent-Runner ──read seam──▶ overlay://triggers`;
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
   agent executor is a Phase 5 item. *(Since resolved in Phase 5: `overlay run` now injects MCP config
   into the binary adapters — see Phase 5's "Real-agent executor MCP access".)*
2. **Outcome scoring is exit-code-based.** `overlay run` scores a run on the adapter exit code, not the
   workflow's `expected_artifacts` predicates. Runtime predicate evaluation (via the exported
   `evaluatePredicates` / `scorePredicateEvaluations`) is a tracked Phase 5 enhancement. *(Since
   resolved in Phase 5: `overlay run` now scores `expected_artifacts` predicates at runtime — see
   Phase 5's "Runtime predicate scoring".)*

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
- **Overlay UI re-platform (Electron → local web app).** Rebuild Overlay's `apps/desktop` UI on the same
  local-web-app + view-seam pattern Vault uses (Vite/React/TS/Tailwind/shadcn + a `node:http` server over
  `/api/*` + SSE) and **remove Electron entirely** — the prerequisite for Overlay's Tauri wrap. The backend
  is already feature-modular; this is a transport swap (IPC → HTTP/SSE) + a renderer decomposition. Plan:
  [overlay-ui-replatform.md](overlay-ui-replatform.md). **✅ done (2026-06-27)** — Electron fully removed;
  all 14 features migrated to the web app; suite + Playwright smoke + acceptance green; Tauri-ready.
- **Tauri V2 wrap.** Package the Vault web app as a local-first Tauri V2 app, and migrate Overlay's
  own desktop surface to Tauri V2 as well. **✅ done (2026-06-30)** — both apps shipped **model-B
  Tauri v2 wraps**: the window loads the loopback origin of a bundled **Node SEA sidecar** that
  serves the UI and the API (Vault `src-tauri/`; Overlay `apps/desktop/src-tauri`, which also bundles
  the workspace templates and a runnable CLI). Plans:
  [`Docs/tauri-wrap-build-plan.md`](../Agent-Vault/Docs/tauri-wrap-build-plan.md) (Vault),
  [`docs/desktop-app-build-plan.md`](../Agent-Overlay/docs/desktop-app-build-plan.md) (Overlay).
  Signed packaging + auto-updater (F1) and cross-webview QA (F2) are **consciously parked** pending
  the planned Rust backend migration, which would obsolete the SEA sidecar toolchain they would
  harden.
- **Distribution/packaging** for all three: Overlay (single binary + Tauri desktop), Vault (Tauri
  desktop app), Runner (service units), with install/update detection. **Parked pending the Rust
  backend migration** — the Tauri wraps run locally today; signing, updating, and cross-machine
  distribution only matter for other machines and sit behind the same parked F1/F2 work.

**Current implementation-risk status:** the following review findings were captured during Phase 5
hardening and should stay visible as the system moves toward production packaging.

- **Done — Runner trigger reliability.** `debounce_ms` / `max_concurrency` are trigger doctrine, and
  Runner enforces them through the in-process dispatch gate plus state-dir process slots for generated
  cron dispatch. Absent `max_concurrency` means one in-flight run per trigger.
- **Done — Overlay custom-tool approvals.** Custom shell/HTTP tools that require approval, or match
  supported policy approval gates, fail closed until a trusted approval protocol exists.
- **Done — Runner-to-Overlay enforcement.** Runner has `--enforce` pass-through for `overlay run`,
  including generated cron dispatch commands.
- **Done — write atomicity and serialization.** Overlay, Vault, and Runner use unique temp files and
  locks/serialization on the write paths that previously raced.
- **Done — Overlay read-modify-write races.** Memory proposal acceptance and trajectory daily indexes
  are serialized.
- **Done — Overlay symlink containment.** Canonical reads realpath-check the selected layer root before
  returning content.
- **Done — Runner direct dispatch scoring.** The direct path evaluates Overlay predicates before
  recording run completion.
- **Re-scoped — Vault privileged-origin split.** Active vault assets are served inertly on the
  trusted app origin (attachment treatment now covers SVG) and the app document carries a
  script-restricting CSP; the full privileged-origin split moves to the **Rust/Tauri packaging
  phase** — consciously deferred, not dropped.
- **Done — Runner webhook authentication.** HTTP triggers match route before body drain and cap/time
  out request bodies, and the header/HMAC authentication contract is now doctrine (an `on.auth` block
  in Overlay's trigger schema — [`docs/triggers.md`](../Agent-Overlay/docs/triggers.md)) enforced
  fail-closed by Runner: constant-time compares, `401` on mismatch, `503` when the secret env var is
  unset or empty.
- **Docs/status corrections.** systemd is proven as a Runner user unit, while the launchd template
  and per-trigger systemd/launchd unit generation remain backlog (cron fragment projection is
  implemented); the Tauri v2 wraps shipped 2026-06-30, with signing/updater and webview QA parked
  pending the Rust backend migration.

**Guardrail:** enforcement and transport are added at the edges (executors, server transport) without
moving doctrine out of plain files or giving the Runner/Vault privileged built-ins.

**Done when:** policies are enforced (not merely advised) on `overlay run`; an MCP client can connect
over HTTP/SSE; all three repos have signed/packaged, self-updating distributions.

---

## Phase 6 — Rust re-platform

**Goal:** every Node/TS backend becomes a Rust binary behind unchanged seams — the corpus formats,
MCP wire, argv + exit codes, env vars, and HTTP/SSE shapes stay byte-identical while the
implementations swap. React frontends and the Tauri v2 wraps are untouched. Campaign master (crate
architecture, pinned stack, frozen-TS-core policy, cutover gates, risk register):
[rust-migration.md](rust-migration.md).

**Prerequisite:** Phase 5 (the parked packaging work is *finished by* this phase, not before it).

**Dependency arrows:** Cargo path deps replaced the former TS `file:` deps —
`vault-server ──path──▶ overlay-core ◀──path── agent-runner`; Overlay's own crates point only
inward (`overlay-console → overlay-cli → {overlay-core, overlay-mcp}`). Through the migration window
(now **closed** at R3) the frozen TS `@overlay/core` dist was a second consumable of the *same* arrow
for not-yet-ported siblings; with both ported it was deleted. The arrow never reversed in either
implementation.

**Work** (detail per phase in [rust-migration.md](rust-migration.md) → "Phases"):
1. **6.0 Contract capture (R0)** — ✅ **done (2026-07-01).** Freeze the observable contracts
   as executable, implementation-agnostic artifacts before any porting: parameterized acceptance
   harnesses (the `ACCEPTANCE_*_CMD` knobs in
   [acceptance/README.md](acceptance/README.md)), MCP surface snapshots (including the generated
   agent MCP configs), the 24-command argv/exit-code matrix, HTTP+SSE transcripts, golden fixture
   corpora (sandbox, cron, RRULE, search ranking, schema accept/reject, YAML stringify), the
   per-schema strictness audit table, the Vault suite spawn-mode split
   (`AGENT_VAULT_SERVER_BIN`), and the frozen-core partition + emergency-patch procedure.
2. **6.1 Overlay big bang (R1)** — ✅ **done (2026-07-02).** All four crates ported and cut over
   behind the R0 contracts (MCP snapshot byte-exact, cli-contract 37/37, console transcripts,
   acceptance matrix R→T→T); the TS backends are deleted, `packages/core` is frozen at
   `ts-core-final`, and the Tauri shell ships the cargo-built binaries. Detail: overlay-core →
   overlay-mcp → overlay-cli → overlay-console; the agent re-entry decision (no `node`-wrapping of
   a native binary; doctor/migrate rewrite); one-switch cutover incl. the Runner state-dir re-sync.
3. **6.2 Runner big bang (R2)** — ✅ **done (2026-07-02).** Watchers bug-for-bug, dispatch gate +
   file-slots, reconcile with byte-compatible fragments — all gated on the golden tables consumed
   in place; the cutover deleted the TS implementation, re-pointed the unit templates at the
   native binary, and pinned `sync` zero-churn over a committed TS-written state dir. Acceptance
   matrix R→R→T is now the harness default. Ledger: Agent-Runner `docs/rust-migration-notes.md`.
4. **6.3 Vault big bang (R3)** — ✅ **done (2026-07-02).** The `vault-server` crate serves behind the
   same Tauri sidecar env/health contract (externalBin swapped to the cargo-built `agent-vault-server`);
   the R0-refactored `node --test` suite is green against `AGENT_VAULT_SERVER_BIN=<rust binary>`, and
   the acceptance matrix reached **R→R→R**. `server/` + `tools/*.js` + the Node SEA toolchain are
   deleted, and the frozen TS `packages/core` — its last consumer now Rust — was **deleted here,
   closing the migration window** (recoverable at `ts-core-final`). Ledger: Agent-Vault
   `Docs/rust-migration-notes.md`.
5. **6.4 Demolition + packaging-once (R4).** Residual TS infra removed; the parked
   signing/updater/cross-webview packaging (Phase 5's F1/F2) is done **once**, in Rust; the
   post-migration roadmap (Vault embedded agent, origin split, notify watchers) unblocks.

**Guardrail:** contracts are frozen as **executable artifacts** — every cutover gate is the R0
snapshot/golden/transcript suites plus the mixed-mode acceptance matrix (R→T→T → R→R→T → R→R→R)
going green against the new implementation, never a judgment call. The four seams are
language-agnostic and must not change shape; the dependency arrow stays intact in both
implementations for the whole window.

**Done when:** per phase, the cutover gates in [rust-migration.md](rust-migration.md) (6.0: all
contract artifacts committed and green against TS; 6.1–6.3: each repo's gate incl. its acceptance
matrix step; 6.4: no Node runtime outside the two `web/` build chains, packaged apps boot from Rust
sidecars on a clean machine, and the acceptance harnesses pass all-Rust).

---

## Phase 7 — API contracts (done)

**Goal:** give each REST surface a canonical, machine-readable **OpenAPI 3.1** contract so any
future integration — in any language, on any device — starts from a generated client. Additive
(spec + codegen + docs); the only removal is ts-rs, replaced by the generated console client in the
same slice. Campaign master + the consume-in-any-language quickstart:
[openapi-contracts.md](openapi-contracts.md).

**Prerequisite:** Phase 6 (the servers are Rust; the specs are authored from their real responses).

**Work** (sequence O0 → O4; per-repo detail in each repo's `openapi/README.md` + `openapi-notes.md`
ledger):
1. **Vault** `:4173` — [`vault.yaml`](../Agent-Vault/openapi/vault.yaml), conformance-tested against
   the live binary; generated TS client replaces the hand-mirrored `types.ts`; serves
   `/openapi.yaml` · `/openapi.json` · `/docs`.
2. **Overlay console** `:4180` — [`console.yaml`](../Agent-Overlay/openapi/console.yaml),
   conformance-tested against the recorded transcript; **ts-rs removed** in favor of the generated
   client; serves `/openapi.yaml` · `/openapi.json` · `/docs`.
3. **Runner** `:8787` — [`runner-webhooks.yaml`](../Agent-Runner/openapi/runner-webhooks.yaml)
   template + an `agent-runner openapi` subcommand that emits a concrete spec from the configured
   `http` triggers.
4. **System docs** — this repo's [openapi-contracts.md](openapi-contracts.md) indexes the three
   specs and the quickstart, with a runnable second-language (Python) portability proof under
   [`Agent-Vault/examples/python-portability/`](../Agent-Vault/examples/python-portability/).

MCP (`:3000`) stays out of scope: it is JSON-RPC/MCP (rmcp), not REST, and keeps its own R0
`mcp-surface` snapshot.

**Done when:** each REST surface has a linted, conformance-tested `openapi.yaml`; both web frontends
consume generated types (no hand-mirroring, no ts-rs); Vault + console serve `/openapi.yaml` +
`/docs`; and the portability proof generates a working second-language client against a running
server.

---

## Dependency map (at a glance)

```
Phase 0 (done) ─▶ Phase 1 ─┬─▶ Phase 2 (Vault) ─┐
                           └─▶ Phase 3 (Runner) ─┴─▶ Phase 4 ─▶ Phase 5 ─▶ Phase 6 (Rust re-platform) ─▶ Phase 7 (API contracts)

Phase 6:  6.0 contract capture ─▶ 6.1 Overlay ─▶ 6.2 Runner ─▶ 6.3 Vault ─▶ 6.4 demolition + packaging
```

Phase 1 is the gate: it freezes the shared Overlay core contract (the Rust `overlay-core` crate today;
the TS `@overlay/core` package during the historical migration window) and decides Vault's shape, after which
Vault (Phase 2) and Runner (Phase 3) proceed in parallel and converge at Phase 4. Phase 6's internal
order is forced by the same arrow — Overlay ported first because both siblings depend on it, and the
frozen TS core bridged the window until Vault, its last consumer, ported (R3, 2026-07-02) — at which
point the frozen core was deleted and the window closed.
