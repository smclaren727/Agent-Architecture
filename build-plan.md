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
4. **Wiki navigation / backlinks** across the corpus. *(Shipped as Vault's read-only Workspace
   Corpus Links panel: workflows ↔ skills/standards, profiles/policies ↔ tools, eval suites ↔
   profiles/workflows, and memory facts/proposals ↔ supersession or non-global memory-scope links.
   It derives from canonical file content and does not introduce a stored graph.)*
5. **Embedded agent surface** for human+agent co-editing. *(Not built in the Node stack. The chat
   shipped 2026-07-03: a right-dock Chat executing governed, trajectory-recorded turns through
   `overlay-core`'s `adapters::turn` API under the canonical `vault-chat` workflow, with read-only,
   suggest-with-explicit-apply, and governed allow-edits permissions. The knowledge-vault convention
   checker, managed-note write-time backstop, and browser-session transcript persistence shipped
   2026-07-04. Direct-provider and supported tool-bearing claude-code/codex chat replies stream
   over Vault's SSE route; final turn completion owns suggestions and proposals. The
   in-app MCP client/tool channel to `overlay serve` is not built because spawned-agent MCP re-entry
   is the shipped tool path; Vault now has local-default/provider-opt-in chunk embeddings and
   similarity search, Chat can explicitly attach bounded related chunks from that configured
   embedding index, the Info dock exposes a Summary widget over ordinary note `summary`
   frontmatter with optional Chat handoff, and deterministic entity candidates over known people,
   organizations, projects, and areas; Chat also ships a prompt-only "Plan workflow" starter for
   multi-agent planning over the existing governed turn path. The Chat dock also renders Overlay's
   passive local-agent catalog as an Agent runtime selector — Direct/API, Claude Code, Codex CLI,
   and currently unsupported Gemini CLI — without making Vault a host-probing or policy authority.
   Overlay's console now owns the complementary setup surface for supported local CLIs, writing
   `profiles/*.yaml` and `adapters/*.yaml` through the canonical file writer rather than storing
   runtime config in app-private state; see [agent-vault.md](agent-vault.md) and
   [agent-overlay.md](agent-overlay.md).)*

The MVP is a **web build**; the Tauri V2 wrap for local-first polish is Phase 5, not a blocker here.

**Guardrail:** Vault never schedules or acts on a timer/event to *run* work (that's Runner). It
watches files only to *display* them. No silent canonical memory writes — human or agent.

**Done when:** a human can author/edit any canonical type in the Vault web app and have `overlay serve`
reflect it live; the proposal queue is usable end-to-end; an agent can read doctrine and file a
memory proposal that appears in the queue. *(The embedded Chat now covers read-only/suggest/allow-edits
co-editing. Durable memory proposals can be filed from tool-bearing chat turns via spawned-agent MCP
re-entry; older external MCP clients and the Phase 4 harness remain compatible.)*

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
  local-web-app + view-seam pattern Vault uses (Vite/React/TS/Tailwind/shadcn + a local API/SSE server over
  `/api/*`) and **remove Electron entirely** — the prerequisite for Overlay's Tauri wrap. The backend
  is already feature-modular; this is a transport swap (IPC → HTTP/SSE) + a renderer decomposition. Plan:
  [overlay-ui-replatform.md](overlay-ui-replatform.md). **✅ done (2026-06-27)** — Electron fully removed;
  all 14 features migrated to the web app; suite + Playwright smoke + acceptance green; Tauri-ready.
- **Tauri V2 wrap.** Package the Vault web app as a local-first Tauri V2 app, and migrate Overlay's
  own desktop surface to Tauri V2 as well. **✅ done (2026-06-30)** — both apps shipped **model-B
  Tauri v2 wraps**: the window loads the loopback origin of bundled cargo-built Rust sidecars
  (Vault `src-tauri/` bundles `agent-vault-server`; Overlay `apps/desktop/src-tauri` bundles
  `agent-overlay-server` plus the runnable `overlay` CLI). The old Node SEA sidecar/toolchain was retired
  during the Rust migration. Plans:
  [`Docs/tauri-wrap-build-plan.md`](../Agent-Vault/Docs/tauri-wrap-build-plan.md) (Vault),
  [`docs/desktop-app-build-plan.md`](../Agent-Overlay/docs/desktop-app-build-plan.md) (Overlay).
  Signed packaging + auto-updater (F1) and cross-webview QA (F2) are **consciously parked** pending
  distribution work; the Rust backend migration has already removed the SEA sidecar toolchain they
  originally would have hardened.
- **Distribution/packaging** for all three: Overlay (single binary + Tauri desktop), Vault (Tauri
  desktop app), Runner (service units), with install/update detection. **Unblocked by the completed Rust
  backend migration, but still parked behind F1/F2 distribution work** — the Tauri wraps run locally today;
  signing, updating, and cross-machine distribution only matter for other machines.

  The remaining consumer-grade Mac app gap is the path from "developer/operator starts binaries with
  env vars" to "download a DMG, drag to Applications, open the app, and complete setup in UI". Keep
  that work split in two so the install/setup product work can proceed before Apple Developer Program
  credentials exist, while the trust/distribution work stays clearly scoped to Developer ID signing.

  **Pre-Developer-account distribution groundwork** — can be built and tested with unsigned/ad-hoc
  local artifacts:

  1. **First-run Overlay workspace setup.** If no workspace is configured, the app offers create from
     the shipped template, choose existing, validate, and persist the selected path. No terminal
     `overlay init` should be required for the happy path.
  2. **Persisted app settings instead of env-only wiring.** Workspace paths, Runner command/state dir,
     Vault's connected Overlay workspace, and Vault's Overlay CLI path are discovered or stored in
     app configuration; environment variables remain an override/debug escape hatch, not the primary
     setup flow.
  3. **Runner service installation and control.** Overlay's Automations surface can install/update the
     macOS launchd agent (and systemd user unit on Linux), start/stop/restart it, enable run-at-login,
     and keep the daemon command pinned to the selected workspace, state dir, Runner binary, and Overlay
     CLI. Runner still owns the loop and writes only machine-local derived state.
  4. **Vault-to-Overlay connection setup.** Vault can connect to an existing Overlay workspace and
     resolve a usable Overlay CLI/bundled binary path automatically, while remaining fully usable as a
     standalone markdown/vault editor when no Overlay workspace is connected.
  5. **Secrets and local-agent runtime onboarding.** API keys, local Claude Code/Codex availability,
     and supported agent runtime setup are guided in UI. Runtime setup writes canonical YAML doctrine
     through Overlay's validated writer where appropriate; secret values live in Keychain or
     user-owned secret/env files, never in the corpus or app-private doctrine.
  6. **Unsigned/ad-hoc package rehearsal.** Build local `.app`/`.dmg` artifacts, hash-check bundled
     Rust sidecars, and run clean-ish install smokes that prove the first-run flows work without a repo
     checkout or manually exported env vars. Gate out any step that would require real signing,
     notarization, or hosted update secrets. Known warning cleanup before this is called polished:
     rename Vault's bundle identifier away from the `.app` suffix (`com.agentvault.app` currently
     triggers a macOS bundle-extension warning), and either code-split the larger Vault web chunks or
     consciously raise the Vite/Rolldown warning threshold with evidence that startup size is acceptable.

  **Developer ID distribution work** — requires Apple Developer Program credentials and release
  secrets:

  1. **Signed/notarized DMG releases.** Produce Developer ID signed, notarized `.dmg` artifacts for
     Overlay and Vault, with the bundled Rust sidecars hash-verified before packaging and notarization
     stapled before publishing.
  2. **Updater and release CI.** A release workflow builds, signs, notarizes, publishes, and smoke-tests
     the app artifacts; the apps check a signed update manifest from the chosen release host.
  3. **Clean-machine install proof.** Verify the published artifacts on a fresh account/VM with no repo
     checkout, no developer env, no prebuilt binaries on PATH, and no manual env setup. This is the
     proof that the DMG experience is truly consumer-grade rather than merely clean-ish local.
  4. **Optional package channels.** Homebrew/Scoop/native package channels are follow-ons after the
     signed DMG and updater path are stable.
- **Done — Agent lifecycle hook integration for Codex/Claude.** Overlay now owns canonical
  `hooks/*.yaml` doctrine, exposes it in the Agent Runtimes view, and serves `GET /api/agents/hooks`
  plus `POST /api/agents/hooks/ingest` from the console API. Codex and Claude Code still own whether
  and how local hook configs are installed; Overlay only generates copyable snippets and records
  bounded ingest events after validating the hook id, agent, and phase against active YAML doctrine.
  Hook config remains a derived artifact over plain YAML doctrine, never app-private state; hook trust,
  local-process permissions, and secret material stay in the Codex/Claude/daemon environment rather
  than the corpus.
- **Remaining Overlay native titlebar integration.** Bring the same macOS-only titlebar-overlay polish
  now proven in Vault to the Agent-Overlay desktop console. The slice should blend the packaged `.app`
  window chrome into the Overlay header/sidebar shell, place a sidebar or navigation control in the
  titlebar-safe area near the traffic-light controls where the design supports it, and preserve the
  existing `data-native-vibrancy` opaque/browser/non-macOS fallback. Verify the locked Tauri schema
  support for `titleBarStyle`, `trafficLightPosition`, and `hiddenTitle`; grant only the window IPC
  capabilities required for drag behavior; define draggable and non-draggable regions so command
  buttons, menus, and status controls remain clickable; and keep Windows/Linux untouched unless a later
  platform-specific pass intentionally designs those variants. Validation must include a real packaged
  Overlay `.app` smoke for light/dark, reduce-transparency, startup flash, traffic-light alignment,
  header drag, double-click zoom, and fullscreen behavior.

**Current implementation-risk status:** the following review findings were captured during Phase 5
hardening and should stay visible as the system moves toward production packaging.

- **Done — Runner trigger reliability.** `debounce_ms` / `max_concurrency` are trigger doctrine, and
  Runner enforces them through the in-process dispatch gate plus state-dir process slots for generated
  cron dispatch. Absent `max_concurrency` means one in-flight run per trigger.
- **Done — Overlay trusted approval protocol.** Custom shell/HTTP tools that require approval,
  built-in/custom calls that match `tool:<id>` / `tool:*`, and Overlay-owned rendered
  shell/network gates (`bash:*`, `bash:<command>`, `network:*`, `network:non-allowlisted`) create a
  trusted approval request and can run only after the token-bearing desktop console returns a scoped
  one-use token. Shell/network approvals are additionally bound to the rendered-effect kind/hash;
  network `default: deny` remains a hard deny for non-allowlisted targets. HTTP tools do not follow
  redirects, and shell tools drain stdout/stderr before returning bounded tails.
- **Done — Runner-to-Overlay enforcement.** Runner has `--enforce` pass-through for `overlay run`,
  including generated cron dispatch commands.
- **Done — write atomicity and serialization.** Overlay, Vault, and Runner use unique temp files and
  locks/serialization on the write paths that previously raced.
- **Done — Overlay read-modify-write races.** Memory proposal accept/reject decisions share the
  workspace-level memory-review lock, and trajectory daily indexes are serialized.
- **Done — Overlay symlink containment.** Canonical reads realpath-check the selected layer root before
  returning content; canonical writes realpath-check parents and refuse symlinked final targets.
- **Done — Runner direct dispatch scoring.** The direct path evaluates Overlay predicates before
  recording run completion.
- **Done — Vault privileged-origin split (2026-07-07).** Active vault assets are served inertly
  (attachment treatment covers SVG) from a **separate unprivileged loopback origin**; the
  IPC-bearing app origin 404s `/assets` and carries a script-restricting CSP, and the asset origin
  serves no API. See [agent-vault.md](agent-vault.md).
- **Done — Runner webhook authentication.** HTTP triggers match route before body drain and cap/time
  out request bodies, and the header/HMAC authentication contract is now doctrine (an `on.auth` block
  in Overlay's trigger schema — [`docs/triggers.md`](../Agent-Overlay/docs/triggers.md)) enforced
  fail-closed by Runner: constant-time compares, `401` on mismatch, `503` when the secret env var is
  unset or empty.
- **Done — Vault sidecar launch proof.** The packaged Tauri shell passes a per-launch instance token to
  `agent-vault-server` and accepts `/api/health` only when the token is echoed, so stale fixed-port
  sidecars cannot masquerade as the fresh app.
- **Done — Runner reliability polish.** `agent-runner openapi` emits only active HTTP trigger routes,
  and non-direct dispatch drains `overlay run` stdout/stderr while retaining only a bounded diagnostic
  tail.
- **Docs/status corrections.** systemd is proven as a Runner user unit; per-trigger
  systemd/launchd unit generation and the explicit live-crontab install flow shipped 2026-07-07
  (all three `--unit-target` projections golden-pinned; launchd daemon template plist-lint-proven,
  live bootstrap still operator-run); the Tauri v2 wraps shipped 2026-06-30, with signing/updater
  and webview QA parked as distribution follow-up work after the completed Rust backend migration.
- **Done — Vault structured canonical editors.** Vault exposes typed panels over profiles, policies,
  tools, skills, workflows, and standards. The panels rewrite the underlying YAML (or a standard's
  Markdown frontmatter) and persist only through the canonical file writer; they do not create
  app-private state. Memory facts are inspectable in a structured read-only panel, but canonical
  memory writes still flow through Proposals.
- **Done — Vault packaged-app dogfood ergonomics.** The first-use Vault pass made the note editor
  markdown-first and moved typed frontmatter into the right dock as a `Properties` tab beside Info/Chat.
  Property edits autosave, the manual "Update properties" button is gone, and metadata refreshes preserve
  body edits typed while a property save is in flight. Project/task quick creation now uses schema-backed
  status selects and omits blank optional metadata so quick entry does not require status, Project, Area,
  People, or dependency fields. Closed enums render as selects; relationship fields render with typed
  suggestions and an explicit create-related-note action that saves the new markdown note in the background
  and keeps the user in the current workflow. The markdown toolbar List button inserts a `-` marker at an
  empty cursor, visible `[[wikilink]]` chips navigate to the linked note, and packaged Tauri builds expose
  a native Open File picker while keeping manual absolute-path entry as the fallback.
- **Remaining Vault property-control polish.** The relationship picker is intentionally a first-pass
  typeahead plus explicit create action. If real vaults make those lists feel heavy, upgrade it to a
  richer keyboard-first combobox/popover without changing the source-of-truth rule: every edit still
  rewrites the underlying Markdown/YAML file, not app-private state. (2026-07-08: create-related-note
  now threads the note's owning vault instead of silently creating into the default vault; the
  typeahead-first shape is deliberately unchanged.)
- **Done — Vault switcher polish (2026-07-08).** The header selector is the shared themed Radix
  dropdown: radio items with mode subtitles, keyboard/screen-reader semantics preserved, and
  `+ Add vault…` plus `Manage vaults…` folded in as a divider-separated bottom action row (the
  separate pill button is gone). The menu refetches the registry on open so management changes
  appear without a reload.
- **Shipped, operator QA pending — Vault native titlebar integration (2026-07-08).** The packaged
  macOS window uses `titleBarStyle: Overlay` + `hiddenTitle` + `trafficLightPosition x16/y20` (keys
  verified against the locked Tauri 2.11 schema; non-mac config overlays replace the windows array so
  Windows/Linux are untouched). The app header doubles as the titlebar behind the same packaged-mac
  gate as vibrancy (`data-mac-titlebar`): 52px bar height, 80px traffic-light safe area, and a
  `data-tauri-drag-region="deep"` header whose interactive children stay clickable. Adversarial
  review caught that `start_dragging` is ACL-gated outside `core:default` — the main-window
  capability now grants `core:window:allow-start-dragging` (the window was otherwise immovable).
  Browser/vibrancy fallbacks preserved and proven. **Pending:** the visual/interactive `.app` pass
  (light/dark blend, traffic-light alignment, drag/double-click, reduce-transparency, startup flash,
  and the Slice-2 picker-first dialogs) needs operator eyes — the automation context lacked Screen
  Recording/Accessibility TCC grants. Known limitation: the reservation persists in native
  fullscreen while the traffic lights auto-hide (backlog: toggle on the fullscreen event).
- **Done — Vault management view (2026-07-08).** A dedicated left-nav Vaults view lists registry
  entries (label, path, mode explained, note counts, index status) with picker-first Add, registry-only
  Remove (index rows pruned, files untouched, default vault protected), and governed mode changes.
  `open` -> `managed` is proposal-shaped: a read-only preflight reports per-file status with
  current -> proposed frontmatter, dropped keys, and warnings; apply is fingerprint-gated on content
  hashes (409 on any change), refuses blockers (broken YAML, CRLF frontmatter, non-UTF-8), merges
  existing frontmatter so user metadata survives, preserves bodies byte-exact, and flips the registry
  mode last. `managed` -> `open` is an explained confirmation with no file changes. See
  Agent-Vault `Docs/vault-management.md`. **Limitation:** the adoption decision is not filed through
  the Overlay Proposals/audit surface — the existing overlay-core surfaces have no generic
  accept/reject audit event and adding one needs Agent-Overlay changes; accept/reject stays local to
  Vault (backlog if a cross-plane review trail becomes necessary).
- **Done — Vault picker-first file/folder flows (2026-07-08).** Under Tauri, Add Vault leads with
  "Choose folder…" and Open File with "Choose markdown file…"; the picked path renders as read-only
  confirmation and manual path entry is a collapsed secondary disclosure. Browser/dev mode keeps
  manual entry primary. Unit-tested behind `isTauri`; the packaged-`.app` proof rides with the
  titlebar slice's real-app smoke.
- **Done — Vault daily-note template polish (2026-07-08).** New daily notes seed only the top-level
  `# YYYY-MM-DD` heading; the `## Log` scaffold is gone from the handler, starter template, and fixtures.
- **Done — Vault editor action chrome polish (2026-07-08).** The managed-note editor dropped its manual
  Save button; autosave gained a visible Retry affordance on failure, window-refocus self-healing, a
  dirty-draft flush on note switch/unmount, and a beforeunload guard, so autosave is genuinely
  authoritative. Delete moved into the note header as a secondary danger action (confirmation dialog
  unchanged) and the autosave status sits beside the Body/Source controls; the bottom action row is gone.
  Loose/open-file editors keep their explicit Save because they do not autosave.
- **Done — Vault indexing/sidebar consistency (2026-07-08).** Managed-note create/daily/update/patch/
  delete (and task PATCH) are vault-aware: an optional API-only `vault` field targets a registered
  managed vault, handlers resolve a note's actual vault from the index, write there, and additively
  reindex just that vault. The watcher covers every boot-registered vault root; scoped rebuilds mark
  cross-vault duplicate ids invalid instead of wedging on the `notes.id` primary key. The web create
  flows target the active managed vault and switch scope so the new note is immediately visible in the
  Notes panel. Known gaps recorded below (runtime-added vault live-watch; cross-vault daily 409 UX).
- **Done — Vault backlink creation and type conversion (2026-07-08).** Unresolved `[[wikilinks]]`
  render distinctly and offer explicit placeholder-note creation (chip dialog + autocomplete entry)
  into the note's own vault — ordinary markdown with valid frontmatter, collecting backlinks
  immediately. `POST /api/notes/{id}/convert` provides governed type conversion: schema-validated
  frontmatter rewrite with per-type field mapping (dropped fields reported), schema-derived required
  defaults, and a self-healing rename-first move into the target type's folder; ids never change so
  wikilinks survive; `daily` is not a valid target. The note header's Convert dialog previews type,
  file move, dropped fields, and added defaults before any write.
- **Done — Vault markdown-list indent behavior (2026-07-08).** Tab/Shift-Tab on a collapsed cursor in a
  list line indents/outdents while preserving the marker and keeping the cursor collapsed, so typing
  continues the nested item instead of deleting the marker.
- **Done — Vault markdown-toolbar completeness (2026-07-08).** The toolbar now shows, always visible and
  grouped with separators: Bold/Italic/Strikethrough · H1–H3 dropdown (active level indicated) · inline
  Code/Code block/Link · Unordered/Ordered/Task list · Quote/Horizontal rule/Table. Standalone blocks
  insert with blank-line boundaries (an HR after a paragraph no longer parses as a setext heading).
  Image/attachment was deliberately deferred — Vault has no attachment story yet.
- **Remaining Vault dogfood follow-ups (2026-07-08 slice).** Recorded during the slice-1 adversarial
  reviews: (a) live-watching vaults registered at runtime (today they index on add and on every API
  write; external file edits there need a restart); (b) the cross-vault daily-note 409 is an error-only
  dead-end — offer "open the existing daily (switches vault)" instead; (c) list-kind conversion in the
  toolbar (UL ↔ OL ↔ task on already-listed lines currently no-ops); (d) NotesView blocks vault-targeted
  creates with an error when `/api/vaults` cannot be fetched rather than retrying automatically.

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
5. **6.4 Demolition + packaging-once (R4)** — **demolition ✅ done; packaging open.** Residual TS
   infra is removed (no Node runtime outside the two `web/` build chains) and the packaged apps
   boot from the bundled, hash-verified Rust sidecars (local smoke 2026-07-07). The parked
   signing/updater/cross-webview packaging (Phase 5's F1/F2) remains the **open distribution
   work**, to be done **once**, in Rust. Of the unblocked post-migration roadmap, the Vault
   embedded agent (2026-07-03/04) and the privileged-origin split (2026-07-07) have since
   shipped; Runner notify-based watching remains an open decision.

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
3. **Runner** `:8787` — [`runner-webhooks.yaml`](../Agent-Overlay/openapi/runner-webhooks.yaml)
   (Overlay-owned since the Phase 8.2 slice-1 import)
   template + an `agent-runner openapi` subcommand that emits a concrete spec from the configured
   active `http` triggers.
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

## Phase 8 — Product boundary realignment (in progress)

**Goal:** make the product split match the way the system is now being used: Vault should stand alone
as a knowledge app with native intelligence; Overlay should remain the doctrine/governance layer; and
Runner should stay a separate daemon binary but move under the Overlay product/repo boundary.

**Prerequisite:** Phase 7. The Rust implementations and OpenAPI surfaces are stable enough that this
is a product-boundary and packaging migration, not a runtime rewrite.

**Dependency arrows:** Vault may depend on Overlay only for **Engaged** behavior. Overlay still
depends on neither Vault nor Vault-owned schemas. Runner's code may move into the Overlay repo, but
the daemon remains a separate binary/process whose doctrine still comes from Overlay triggers.

### 8.1 Vault-native intelligence

Vault should own the basic knowledge-agent experience. A fresh Vault install should be useful before
Overlay is configured:

- connect to an API provider or supported local model/runtime;
- chat about the current note or the whole vault;
- search/traverse notes, backlinks, related notes, and structured properties;
- summarize, explain, and find relationships;
- propose simple current-note edits, draft notes, or placeholder notes;
- keep all writes going through Vault's own markdown/frontmatter validation and confirmation paths.

This is **not** Overlay governance. Vault validates whether a note write is structurally safe for the
target vault; Overlay decides whether a governed agent is allowed to do broader work. Basic "ask my
vault" chat should therefore not require Overlay. It should also not create a second source of truth:
messages, suggestions, created notes, and property edits still resolve to ordinary markdown/YAML or
ephemeral UI state unless the user explicitly saves something.

The user-facing mode ladder becomes:

1. **Open Vault** — arbitrary markdown folder; edit, search, backlinks, graph.
2. **Managed Vault** — Vault conventions/structured views active; tasks, projects, properties,
   conventions, type conversion, and richer graph/search. This has value with or without any LLM.
3. **Engaged Vault** — Overlay connected; agent actions can use workflows, policies, tools,
   approvals, proposals, trajectories, shared memory, and Runner automation.

**Work:**

- Split Vault's current Overlay-gated chat into a Vault-native path and an Overlay-engaged path.
  The UI may stay one Chat surface, but status, permissions, and run labels must make the active
  mode obvious.
- Add or reuse provider/local-runtime setup in Vault for native chat. Secrets belong in Keychain or
  user-owned secret files; provider/runtime choices belong in persisted app settings, not in
  Overlay doctrine unless the user chooses the Engaged path.
- Preserve the Cogito-style permission simplicity for the native path: **Read Only**, **Allow
  Edits**, and possibly **Full Access** as a future local-tools mode. These are product guardrails,
  not Overlay policy. Engaged mode can map the same labels onto Overlay profiles/policies.
- Keep write discipline boring: the model may propose or request a note change, but Vault performs
  the write through the same validated note APIs the UI uses.
- Record in Vault docs which features work in Open, Managed, and Engaged modes so "standalone" does
  not accidentally mean "no agent help."

**Guardrail:** Vault-native intelligence must not reimplement Overlay's workflow/policy/proposal
engine. If the user asks for a named workflow, tool policy, approval gate, trajectory, shared memory,
or automation, the turn is Engaged and belongs on the Overlay path.

### 8.2 Runner into Overlay

Agent-Runner is a standalone **daemon**, but it is not a standalone **product**. It has no useful
doctrine without Overlay, reads Overlay trigger declarations, dispatches Overlay workflows, and cannot
integrate directly with Vault without Overlay in the path. Move the Runner code into the Agent-Overlay
repo as a first-class binary while preserving the daemon/process boundary.

Target shape:

```text
Agent-Overlay/
  crates/
    overlay-core/
    overlay-cli/
    overlay-mcp/
    overlay-console/
    agent-runner/        # same daemon, now shipped with Overlay
  apps/
    desktop/
  units/
    runner/
  docs/
    triggers.md
    runner.md
```

**Work:**

- Move `Agent-Runner/crates/agent-runner` into `Agent-Overlay/crates/agent-runner` without changing
  the binary name (`agent-runner`) or the public CLI contract.
- Preserve state-dir formats, `runtime.json`, liveness JSON, `sync --json`, generated cron/systemd/
  launchd bytes, process-slot locks, OpenAPI generation, and all existing golden fixtures.
- Move unit templates and runner docs under Overlay while leaving compatibility links from
  Agent-Architecture. If the old Agent-Runner repo remains, turn it into a pointer/archive rather than
  a second source of truth.
- Update Overlay CI/release packaging so the Overlay product ships both `overlay` and `agent-runner`.
  The daemon remains deployable on a remote/headless machine; it simply comes from the Overlay release.
- Update the Overlay console Automations setup to prefer the bundled Runner binary once available,
  while still allowing an operator override for advanced deployments.
- Update API-contract docs so Runner's generated webhook OpenAPI is described as an Overlay-owned
  artifact emitted by the `agent-runner` binary.

**Guardrail:** do not merge Runner into the Overlay server/console process. Runner remains the
always-on loop with machine-local state; Overlay remains the doctrine/runtime surface. The repo moves,
not the responsibility boundary.

**Progress (2026-07-08) — first slice shipped.** The crate import is done: `agent-runner` builds,
tests, and lints from `Agent-Overlay/crates/agent-runner` (same binary name, hand-rolled CLI, and
lib+bin shape), consuming `overlay-core` as an in-workspace sibling instead of a cross-repo path
dependency. Golden fixtures moved to `crates/agent-runner/tests/fixtures/`, unit templates to
`units/runner/`, and the webhook OpenAPI template to `openapi/runner-webhooks.yaml` — all
byte-identical to the old repo. Overlay CI (`cargo build/test/clippy --workspace`, redocly lint)
now covers the crate; Overlay's `docs/runner.md` is the runner manual's new home. Parity was pinned
against the old repo's binary: `--help`, error exits, `status --json`, `sync --json` across all
unit targets, generated cron/systemd/launchd bytes, `openapi` JSON/YAML, and full state-dir trees
are identical modulo the runner binary's own embedded path. Still open in 8.2: release/desktop
packaging of `agent-runner`, console Automations preferring the bundled binary, and turning the old
Agent-Runner repo (untouched so far, kept as a read-only reference) into a pointer/archive.

**Done when:** Vault can answer and work over a vault without Overlay for basic knowledge-agent tasks;
Engaged mode clearly adds Overlay doctrine/governance rather than being the baseline; and the Runner
binary is built, tested, packaged, documented, and optionally installed from Agent-Overlay with no
separate Agent-Runner repo required for normal use.

---

## Dependency map (at a glance)

```
Phase 0 (done) ─▶ Phase 1 ─┬─▶ Phase 2 (Vault) ─┐
                           └─▶ Phase 3 (Runner) ─┴─▶ Phase 4 ─▶ Phase 5 ─▶ Phase 6 (Rust re-platform) ─▶ Phase 7 (API contracts) ─▶ Phase 8 (boundary realignment)

Phase 6:  6.0 contract capture ─▶ 6.1 Overlay ─▶ 6.2 Runner ─▶ 6.3 Vault ─▶ 6.4 demolition + packaging
```

Phase 1 is the gate: it freezes the shared Overlay core contract (the Rust `overlay-core` crate today;
the TS `@overlay/core` package during the historical migration window) and decides Vault's shape, after which
Vault (Phase 2) and Runner (Phase 3) proceed in parallel and converge at Phase 4. Phase 6's internal
order is forced by the same arrow — Overlay ported first because both siblings depend on it, and the
frozen TS core bridged the window until Vault, its last consumer, ported (R3, 2026-07-02) — at which
point the frozen core was deleted and the window closed.
Phase 8 is a product-boundary correction on top of the stable Rust/OpenAPI base: Vault gets a
standalone native-intelligence path, while Runner becomes an Overlay-shipped daemon binary instead of
a separate product repo.
