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
5. **Embedded agent surface** for human+agent co-editing. *(Shipped 2026-07-03; see
   [agent-vault.md](agent-vault.md#what-vault-adds-over-a-plain-markdown-editor).)*

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

**Goal:** production-grade enforcement, transport, and distribution across the shipped products:
Vault and Overlay, with Runner distributed as an Overlay-shipped daemon binary.

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
  under Overlay (`Agent-Overlay/units/runner/com.overlay.runner.plist`); a literal second node is
  deferred.
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
  (Vault `src-tauri/` bundles `agent-vault-server`; Overlay's `apps/desktop/src-tauri` bundle carries
  the runnable `overlay` CLI and, since Phase 8.2, `agent-runner`; the console/server router is served
  in-process; `agent-overlay-server` remains a standalone binary for the dev loop, contract tests,
  and headless runs, and is no longer staged into the `.app`/DMG (per Overlay commit `150146e`)). The old Node
  SEA sidecar/toolchain was retired
  during the Rust migration. Plans:
  [`Docs/tauri-wrap-build-plan.md`](../Agent-Vault/Docs/tauri-wrap-build-plan.md) (Vault),
  [`docs/desktop-app-build-plan.md`](../Agent-Overlay/docs/desktop-app-build-plan.md) (Overlay).
  Signed packaging + auto-updater (F1) and cross-webview QA (F2) are **consciously parked** pending
  distribution work; the Rust backend migration has already removed the SEA sidecar toolchain they
  originally would have hardened.
- **Distribution/packaging** for the shipped products: Overlay (Tauri desktop app, `overlay` CLI, and
  bundled/standalone `agent-runner` daemon artifact) and Vault (Tauri desktop app), with install/update
  detection. **Unblocked by the completed Rust backend migration, but still parked behind F1/F2
  distribution work** — the Tauri wraps run locally today; signing, updating, and cross-machine
  distribution only matter for other machines.

  The remaining consumer-grade Mac app gap is the path from "developer/operator starts binaries with
  env vars" to "download a DMG, drag to Applications, open the app, and complete setup in UI". Keep
  that work split in two so the install/setup product work can proceed before Apple Developer Program
  credentials exist, while the trust/distribution work stays clearly scoped to Developer ID signing.

  **Pre-Developer-account distribution groundwork** — can be built and tested with unsigned/ad-hoc
  local artifacts:

  1. **Done — First-run Overlay workspace setup** (Slice 1, 2026-07-10, Overlay `ef9e858`). The
     Workspace view is the first-run setup surface: create the default workspace from the embedded
     template, open an existing folder, or repair a persisted workspace path that failed to restore.
     Create returns structured conflicts (an existing workspace offers open; a non-empty directory
     proposes an `overlay/` child requiring explicit confirmation) — no silent redirect, no
     force/overwrite path, no terminal `overlay init` on the happy path.
  2. **Mostly done — Persisted app settings instead of env-only wiring** (Slice 1, 2026-07-10).
     Overlay persists the workspace path in the desktop JSON store and reports provenance plus
     packaged CLI/runner binary status via a read-only `GET /api/settings`; Vault persists the
     connected Overlay workspace and CLI path in its app settings file (pinned to app-data by the
     packaged shell). Env vars are documented override/debug escape hatches that win when set and
     are surfaced as active overrides. The item-3 remainder landed with Slice 2: the installed
     launchd service pins the runner command and state dir as derived machine state (platform
     defaults + env overrides; no new doctrine or app-settings surface was needed).
  3. **Done — Runner service installation and control** (Slice 2, 2026-07-10, Overlay `6ec8e85`).
     Overlay's Automations surface installs/updates the macOS launchd agent from a server-derived,
     preview-first plan pinning the selected workspace, state dir, bundled/resolved Runner binary,
     and Overlay CLI; lifecycle actions cover start/stop/restart plus run-at-login enable/disable,
     all through fixed-argv `launchctl` (no shell strings, bounded output/timeouts). Install status
     distinguishes not-installed/current/drifted — drift gets an explicit update, never a silent
     overwrite — and uninstall removes only marker-carrying generated plists. Service-manager env
     vars became advanced overrides over platform defaults. Daemon heartbeat liveness remains
     authoritative over service state. systemd stays preview + operator-run install (templates
     preserved); proven by an isolated packaged-app launchd smoke (real bootstrap/bootout under a
     test label). Runner still owns the loop and writes only machine-local derived state.
  4. **Done — Vault-to-Overlay connection setup** (Slice 1, 2026-07-10, Vault `a13f4f2`). The
     Overlay connection is live runtime state managed from Settings → Overlay connection:
     `GET/PUT /api/overlay/settings` validates the workspace, swaps the connection, and starts/stops
     the workspace watcher without a restart; `workspaceDir: null` is explicit standalone. The
     Overlay CLI resolves env > settings > `PATH` > the CLI installer's well-known location, with
     unavailable as a first-class status. Vault remains fully usable standalone; settings hold only
     path pointers, never doctrine or secrets.
  5. **Done — Secrets and local-agent runtime onboarding** (Slice 3, 2026-07-10, Overlay `253a421`).
     `GET /api/agents/readiness` plus a reworked Agent Runtimes view make governed-runtime and
     secret setup guided in UI: bounded version probes of discovered Claude Code/Codex/Gemini CLIs,
     a per-runtime governance verdict (installed-but-unconfigured is never shown usable), per-runtime
     availability under the Runner service's pinned `PATH`, required API-key env **names** with
     set/missing flags, policy-declared secret readiness by name across sources, hook-snippet
     install detection, and a read-only launchd gui-domain diagnostic that flags stale/conflicting
     Overlay/Runner env entries with copyable cleanup commands. Existing `/api/agents/setup` remains
     the validated-YAML writer for runtime doctrine. Deliberately guided **status, not storage**:
     secret values stay in the shell env, user-owned `secrets/.env`, OS keyring, or secret-manager
     CLIs (Vault's native-chat Keychain entry stays Vault-owned) and never appear in responses,
     snippets, logs, or fixtures — the contract suite scans for sentinel leakage.
  6. **Done — Unsigned/ad-hoc package rehearsal** (Slice 4, 2026-07-10). Both apps build local
     `.app` + `.dmg` artifacts whose bundled Rust sidecars and packaged web dists are hash-verified
     against the release build outputs: `package:verify` scripts in both repos check the built
     bundle (sidecar sha256 + web-dist tree digest + `.dmg` hash report), and the staged-sidecar
     `--check` guards the stale nested `src-tauri/target/release/bundle` in both repos. The known
     warnings are cleaned up: Vault's bundle identifier is `com.agentvault.desktop` (was
     `com.agentvault.app`), with a one-time packaged-launch migration that renames the old app-data
     dir and rewrites old-prefix paths in `vaults.json`/`settings.json` (unit-tested; proven live
     with seeded legacy data); the Vault entry chunk was code-split (lazy RightDock + Open File,
     Notes, Graph, Workspace routes: 1,613 kB → 414 kB minified, warning gone, build
     byte-deterministic) rather than raising the threshold. A clean-ish install smoke drove the
     packaged apps from a non-repo install location under isolated `HOME`s with no exported product
     env vars: Overlay first-run → create-from-template → relaunch persistence → readiness →
     launchd service preview (preview-only, bundled binaries pinned), Vault migration →
     standalone editing → native-chat status → connect/disconnect/reconnect to the
     packaged-Overlay-created workspace, and quit reaps every sidecar and releases 4173/4180/4183.
     Evidence: `qa/2026-07-10-package-rehearsal/`. Explicitly not covered (Developer ID track):
     signing (bundles are ad-hoc/linker-signed, resources unsealed), notarization, stapling,
     updater/release manifest, clean-machine proof. Overlay's own >500 kB entry chunk was cleared
     in the follow-up cleanup (item 7).
  7. **Done — Pre-Developer-ID cleanup** (2026-07-10). Overlay's web entry chunk was code-split at
     the view registry (React.lazy views behind one Suspense fallback plus a pathname-keyed route
     error boundary that shows a reload card instead of a blank renderer): 500.57 kB → 350.20 kB
     minified (138.54 → 109.68 kB gzip), warning gone, Dashboard/Workspace kept eager as the two
     landing views; every view — including the failed-chunk path — is covered by the browser
     smoke. The two environment-induced Vault contract-test failures from the rehearsal are fixed
     in the test layer only: missing-overlay-CLI expectations now spawn with an opt-in isolation
     that redirects `HOME`/`USERPROFILE`/`LOCALAPPDATA` and strips overlay-bearing PATH entries,
     and the live-connection test (added the night before, born broken) is repaired against the
     documented contract (mandatory `approval`/`business_risk` policy-fixture sections;
     `relativePath`, not the absolute `path`, names a listing entry) — product CLI discovery is
     untouched. The `native_runtime` Claude-probe flake was a 1 s wall-clock budget on the
     non-timeout probes under load; those budgets are now 30 s caps with assertions unchanged
     (30 idle reruns green before, 35 after).
  8. **Done — React/Vite frontend performance pass** (2026-07-10). A Vercel
     react-best-practices-guided pass over both web frontends. Vault: all 14 registry views are
     now `React.lazy` (was 4) and InfoDock's LocalGraph (xyflow + dagre) loads on demand, behind
     a new route error boundary that stays mounted across navigations and resets on route change
     (so React Router transitions hold the old view while a chunk loads — no blank flash);
     workspace SSE state moved off the shared context value onto a `useSyncExternalStore`
     snapshot so events re-render only subscribers; chat transcript rows and the markdown
     preview are memoized so settled rows skip per-token reconciliation and unchanged previews
     skip react-markdown's re-parse. Entry chunk 414.07 → 295.85 kB (121.44 → 93.19 kB gzip).
     Overlay: the event bus's unused `lastEvent` state was dropped (SSE messages no longer churn
     the context value identity) and DashboardView joined the lazy views; entry 350.20 →
     341.69 kB (109.68 → 107.95 kB gzip). Full validation green in both repos (cargo
     fmt/build/clippy/test, contract suites, OpenAPI lint + gen-check, web unit tests, Playwright
     smokes). Follow-up resolved locally after the pass: Overlay's route error boundary now
     matches Vault's reset-on-navigation shape instead of keying the whole boundary on the
     pathname, so lazy route transitions can keep the old view while the next chunk loads.

  **Current near-term lane before Developer ID.** The two user-facing products are built and usable,
  and Developer ID distribution is intentionally gated until Apple Developer Program credentials are
  available. Until then, future sessions should prefer:

  - real-world dogfooding fixes in Vault and Overlay, especially UI/UX polish discovered while using
    the packaged apps;
  - feature slices that preserve the current product split: Vault owns baseline markdown/knowledge
    editing and native intelligence, Overlay owns doctrine/governance/automation, and Runner remains
    an Overlay-shipped daemon;
  - dependency additions only when they reduce real complexity or unlock a specific requested product
    capability, with the source-of-truth rule unchanged (Markdown/YAML first, app state only for
    paths/preferences/secrets metadata where already established);
  - adopt [shadcn/typeset](https://ui.shadcn.com/docs/typeset) as the preferred starting point when a
    Vault or Overlay slice introduces or revisits genuine rendered-prose surfaces — Markdown readers,
    streaming assistant output, reports, documentation, or artifact previews. Keep the rollout
    incremental and surface-led: each repo owns its local `typeset.css` and theme-aligned presets
    (for example reading, chat, and compact report rhythms), while existing renderer safety,
    interactive element overrides, syntax highlighting, and layout-owned measure remain authoritative.
    Typeset is not a blanket style for navigation, forms, labels, metadata rows, cards, or ordinary
    data tables, and it must not become a shared cross-repo package or second design-token source.
    **Pilot shipped 2026-07-11** (Vault `0aa8278`) on exactly one surface: the note reader's
    `MarkdownPreview` (its only consumer). Vault now owns `web/src/typeset.css` — a `.typeset` base
    plus a `.typeset-reading` preset whose fonts and colors map solely to the existing theme tokens
    (dark mode follows automatically), honoring `.not-typeset` opt-outs and imposing no measure.
    Renderer safety, URL allowlists, wikilink buttons, task lists, and rehype-highlight behavior
    were unchanged, and the reader-scoped hljs token mapping moved into the typeset file. Verified
    light/dark and desktop/390 px across headings, long prose, lists, blockquotes, inline/fenced
    code, links, images, tables, and task lists. This records the convention only — no repo-wide
    migration is claimed or planned; each future prose surface opts in with its own preset;
  - small hardening/test follow-ups when they are evidence-backed and bounded, such as bundle-size
    guards or shared test fixtures.

  **Done — terminal ownership correction (completed 2026-07-11).** The packaged app's raw local
  terminal moved from Vault to the Agent Overlay desktop app — a product-boundary migration, not a
  terminal-engine rewrite. Overlay (`5b6e66b`) owns the terminal under the canonical
  [terminal-ownership contract](agent-overlay.md#current-hardening-status). Proven natively:
  workspace cwd, PTY resize, kill-on-close/fresh reopen, live light/dark palette sync, and an
  unchanged browser bundle. Vault (`dcddbe7`) then removed its toggle/panel, keyboard shortcut,
  xterm dependencies, PTY module, terminal IPC commands, and capability grants, shrinking the app
  origin's IPC surface to dialog/shortcut/dragging while Native and Engaged Chat, `export-context`,
  `rebuild-index`, and the asset-origin split stayed untouched (full suites green).

  **Done — one canonical Overlay product name (2026-07-12, Overlay `3a6fca1`).** **Agent Overlay**
  is now the only human-facing name for the product and packaged application; **Agent-Overlay**,
  **Agent Overlay Console**, **Overlay Console**, and **operator console** were removed as alternate
  product names from in-app branding, the Tauri `productName`/window titles across all three platform
  configs, the OpenAPI contract (`info.title` is now **Agent Overlay API**), package-verification
  expectations (`CFBundleName=Agent Overlay`), QA fixtures, and current documentation in all three
  repos. The hyphenated form survives only where it literally identifies the `Agent-Overlay`
  repository or a path containing its name; the `overlay-console` crate and `agent-overlay-server`
  binary remain as component identifiers only. The approval header moved with the sweep to
  `X-Overlay-Approval-Token` (server, web client, OpenAPI, generated types, and tests together; no
  cross-repo consumer existed). The pre-distribution bundle identifier is now
  `com.agentoverlay.desktop`; no app-data migration was needed — the desktop JSON store lives at the
  identifier-independent `~/.config/agent-overlay/desktop.json` (verified against `store.rs` and the
  live host) and the Overlay workspace is HOME-based, so only Tauri-owned WebView caches/logs re-key.
  The single-instance socket renamed to match. Verified: `pnpm package:verify` against the rebuilt
  `Agent Overlay.app` (bundle name + identifier + sidecar/web-dist hashes), vitest contract 167/167,
  Playwright ui-smoke 4/4, `overlay-console` lib tests 123/123.

  **Done — distinct Agent Overlay application and tray icons (2026-07-12, Overlay `3a6fca1`).** The
  layered teal-and-gold header mark (`apps/desktop/web/public/icon.svg`, the single source of truth)
  now generates the complete Tauri icon set via `tauri icon` — macOS `.icns`, Windows `.ico`, all
  PNG/Square/mobile sizes — with `package:verify` pinning the bundled `.icns` hash against the
  source; the packaged app's Dock/Finder artwork was visually confirmed as the teal rounded-square
  layered mark, clearly distinct from Vault's compass.

  The tray is a dedicated, well-padded monochrome asset (`icons/tray/tray-template.svg` rendered to
  `trayTemplate.png`/`@2x` plus a decoder-free 44×44 `@2x.rgba`), not an app-icon reuse: macOS embeds
  the RGBA via `include_bytes!` (compile-time length assertion) and registers it with
  `icon_as_template(true)`, while Windows/Linux deliberately keep the full-color product icon since
  those trays do not recolor artwork. `package:verify` checks the bundled tray PNG hashes and that
  the template RGBA payload is embedded in the packaged executable, catching a missing resource or a
  fallback to the app icon. Live menu-bar QA on the packaged app confirmed the pure-black template
  source renders system-recolored white/gray beside neighboring template items in both light and
  dark appearances (inactive-display dimming applies identically to neighbors), and quit leaves no
  orphaned sidecar.

  **Done — Agent Overlay tray-icon optical size (2026-07-12, Overlay `2793806`).** The standard 22×22
  and 44×44 macOS template canvases remain unchanged, while the layered glyph now occupies a 36×36
  meaningful-alpha box at 2× and reads at the same optical scale as neighboring menu-bar items. The
  dedicated monochrome source, 1×/2× PNGs, and compiled RGBA payload move together through an
  explicit generation command and a checked provenance manifest. Package verification is
  host-independent and checks the recorded hashes, dimensions, geometry, bundled resources, and
  compiled payload without pretending to rerender the SVG. A packaged-app launch confirmed the
  system-recolored icon at native menu-bar scale and a clean app/sidecar quit.

  **Done — Overlay long-value containment (2026-07-12, Overlay `52398f0`).** Machine-generated
  values now stay inside their owning cards and rows at every supported width. The Dashboard log
  path escaped its card because nothing in the Card grid chain could shrink below the value's
  min-content width; the shared card primitives (Card, the header grid track via `minmax(0,1fr)`,
  title/description/content/footer) and `StateCard` now carry `min-w-0`, and the audited
  fact/definition-list patterns across Dashboard, Diagnostics, Agent Runtimes, Workspace, and
  Memory either ellipsize with the full value in `title` or wrap visibly via
  `overflow-wrap: anywhere` — no page-level horizontal scrolling anywhere. ui-smoke gained a 390 px
  regression pinning a realistically long log path inside the Server-status card bounds with
  `document.scrollingElement.scrollWidth <= clientWidth`; verified by the full Playwright suite
  (4/4) plus fresh 1440 px and 390 px screenshots of the live Dashboard.

  **Done — Vault note-tree hierarchy and concise rows (2026-07-12, Vault `fc275b7`, follow-up
  `3b30637`).** Note-tree rows follow the macOS Finder pattern: the button remains full-width
  for hover, selection, and click behavior while only its content insets — 8 px base plus one 12 px
  increment per real nested folder level, capped at six increments. Folder and leaf rows now share
  an 18 px disclosure column, with a spacer for leaves, so every child title begins visibly to the
  right of its parent label. Folder and vault-group headings retain the restrained
  `text-base font-semibold` distinction from `text-sm font-medium` note titles. Redundant monospace
  type subtitles are gone from tree rows; canonical type remains available through Properties,
  search/filter surfaces, and source frontmatter. Expand/collapse, keyboard semantics, truncation,
  selection, and the full-width hit target remain intact. Focused component tests cover structure
  and accessible names, while the real browser regression measures parent/child label coordinates
  and proves every row spans the tree content box at desktop and 390 px across managed, open,
  selected, collapsed, deep, and multi-vault cases.

  **Done — concise Vault chat route label (2026-07-12, Vault `fc275b7`, one review round).** The
  route is named **Engaged** across every user-facing surface — the selector option, the dock's
  route-availability line, the per-turn route badge, Settings copy, and `Docs/native-intelligence.md`
  — after review caught the first pass renaming only the selector option. Overlay remains as prose
  context ("the Engaged path via Overlay"), never the parenthesized route name. Behavior,
  availability gating, and permissions are unchanged; a repo-wide grep pins zero remaining
  "Engaged (Overlay)" occurrences.

  **Done — hanging indents for wrapped Markdown list items (2026-07-12, Vault `2fe61f0`, two
  review rounds).** In Vault's CodeMirror source editor, soft-wrapped continuation lines of
  unordered, ordered, task-list, and nested items now begin beneath the first line's content. A
  dedicated extension measures each visible list line's actual rendered prefix (indent + marker +
  whitespace + task checkbox) via `coordsAtPos` and applies matching `padding-left`/negative
  `text-indent` line decorations, so multi-digit ordered markers, proportional fonts, zoom, and
  compact widths stay aligned from real DOM geometry; the syntax tree excludes list-shaped lines
  inside code, and the Markdown source is never modified. Cursor, selection, undo/redo, and
  list-continuation semantics remain CodeMirror-owned (decoration-only change). Review round 1
  caught the feature entirely inert in a real browser — the decoration effect was dispatched
  synchronously inside the measure cycle and CodeMirror rejected it ("update in progress"), which
  the coordinate-mocked unit tests could not see; the dispatch is now scheduled after the cycle
  with a keyed no-op guard and destroy cancellation. Round 2 fixed the smoke assertion's anchor
  (the text node's leading space, one mono-space left of the visible glyph). Verified natively:
  unit 313/313 including a mounted live-decoration regression, Playwright 15/15 including
  wrapped-fragment alignment at 320 px, and visual checks across marker types and nesting at
  420 px.

  **Done — project selection populates the Vault Properties dock (2026-07-12, Vault `36d7277`).**
  Selecting a project card (pointer or keyboard; persistent `aria-pressed` state) now publishes the
  project's note through the same ActiveDocument seam the note editor uses, so the Properties dock
  shows its YAML frontmatter immediately — existing schema, edit permissions, validated metadata
  PATCH flow, and truthful loading/error/empty states — without changing views or touching the
  file. Selection rides `?project=<id>` for refresh and deep links; reselection swaps context with
  stale responses aborted; non-project notes are rejected rather than conflated with linked tasks;
  a list refresh reloads the note so external deletion or type changes cannot leave stale
  properties; **Open note** remains the explicit navigation action; and the responsive dock is
  never forced open at compact widths. Verified natively: unit 321/321 (including a mounted
  ProjectsView + PropertiesDock integration for loading/missing states), Playwright 15/15 (select →
  dock frontmatter → Open note), and 1440/390 px screenshots of select, reselect, and the compact
  drawer.

  **Done — canonical task-to-project references (2026-07-12, Vault `7f02b51`).** The task
  Properties dock's free-text `project` field is now a same-vault relationship picker: it displays
  project titles with their paths (duplicate titles disambiguated by path — a title is never
  identity), writes the selected project's stable note `id` to YAML, and represents "Unassigned"
  explicitly. Project joins are exact-id and same-vault on both list counts and detail linked
  tasks (cross-vault source values stay untouched in YAML but never join); the `/api/projects`
  picker source dropped its 100-row cap and `ProjectDetail` gained `vault`, with OpenAPI and
  generated TypeScript synchronized. Unresolved references — legacy title values or dangling ids —
  render honestly as unresolved (source value preserved): exactly one indexed title match offers a
  confirm-gated "Repair as …" that rewrites the id through the validated metadata path; zero or
  multiple matches never guess. Project detail adds a keyboard-accessible **Add task** action
  reusing the canonical managed-note creation form with the project id and owning vault
  preassigned; success refreshes open/total counts and the linked-task list immediately and opens
  the created task, while cancel or validation failure creates no partial file. Verified natively:
  cargo 365/365 (exact-id joins, title/dangling non-joins, same-vault scoping, >100 picker rows),
  node contract 124/124, web unit 330/330, Playwright 15/15 (picker assignment via selectOption
  plus Add-task-from-project), and live screenshots of assigned/title-valued/dangling picker
  states, the unique-match repair offer, and the failure-safe create form. The earlier "0 linked
  tasks" QA observation is explained: the join requires only a valid indexed same-vault task with
  a supported status and exact id — the QA fixture's project had no valid task seeded.

  **Planned — Vault search experience and scale proof.** Redesign Search around retrieval rather than
  exposing the indexed frontmatter schema as a form. Keep one search box as the primary surface;
  present the most useful refinements (initially vault, type, tag, and date) as compact controls;
  show active refinements as removable chips; and move the remaining properties into a searchable
  **More filters** drawer where a user adds only the fields needed for the current search. Refinement
  choices should come from actual indexed values where practical, and the results surface should add
  a result count, useful sort options, clear match context, and stable empty/loading/error states.
  Do not preserve the current Text/Semantic switch merely for parity: keyword search remains the
  dependable default, while related or semantic retrieval should be named honestly for the active
  embedding backend and may be blended into one result experience only after relevance and latency
  are measured. Improve the existing SQLite FTS5 path first, without changing the plain-file
  source-of-truth rule. **Last-token prefix matching shipped 2026-07-11** (Vault `c0d5d37`): while
  the query ends mid-token the final term is the quoted FTS5 prefix form, trailing whitespace or
  punctuation completes it exactly, a duplicate in-progress token never widens the match set, and
  `/api/search` forwards the raw decoded query so a trailing space actually reaches the builder
  (whitespace-only queries still 400). Ranking goldens pin prefix/exact/duplicate/Unicode cases in
  both the Rust and Node suites; ordering and the 50-row limit are unchanged. Typo assistance
  remains deferred — the 40k benchmark produced no typo evidence. **Refinement metadata shipped
  2026-07-11** (Vault `91595eb`): an additive `GET /api/search/refinements` endpoint returns
  truthful full-match totals, vault/type/tag facet counts (tags bounded to the top 50 with an
  unbounded `distinctTagCount`), and created/updated date bounds — conjunctive over the fully
  filtered match set, sharing the FTS pipeline (optional `q`; blank facets the filtered corpus);
  `/api/search` gained a fixed sort vocabulary (`relevance`/`updated`/`created`/`title`, id
  tiebreak) and the shared filter vocabulary gained inclusive `createdFrom`/`createdTo`/
  `updatedFrom`/`updatedTo` ranges. OpenAPI, generated TS, docs, and conformance moved together;
  existing responses are byte-compatible and semantic search's allowlist is unchanged. **The Search
  UI redesign shipped the same day** (Vault `9c906da`): one dominant search box; counted
  vault/type/tag/updated quick refinements populated from the refinements endpoint; removable
  chips with clear-all; a searchable explicit-add More-filters drawer replacing the 30-field
  form; truthful counts per mode (keyword shows the full-match total including "first 50 of N";
  Related shows only the returned-match count); honest mode labels — Keyword (default, sortable)
  and Related (generic label, no provider claim, no blended ranking, range filters visibly not
  applied); deep-link note opening preserved; keyboard-only flow and 390 px layout verified with
  screenshots.

  Treat scale as a measured gate, not an assumed engine migration. **The 40,000-document benchmark
  shipped and ran 2026-07-11** (Vault `1c1d724`: a deterministic release-mode `search_benchmark`
  binary over the production `rebuild_index`/query APIs; methodology and canonical results in
  Vault's `Docs/search-benchmark.md`). Measured on an Apple M3 Pro at 40,000 documents / 558,050
  chunks: FTS5 keyword search stays at tens of milliseconds (warm p50 13–35 ms; worst filtered p95
  under 100 ms), filtered list queries ~1 ms, full rebuild 26.7 s cold with a ~12 s full-reload
  floor for any watcher-triggered change, index file ~2.5 GB (dominated by 256-dim per-chunk
  embedding blobs), peak rebuild RSS 2.39 GB. The exhaustive per-chunk LocalHash similarity scan is
  **confirmed** as the first semantic bottleneck: ~10 s per unfiltered related query, 1–3.5 s
  filtered. **The profiled follow-up (2026-07-11, Vault `1c8ffc7`) attributes all three numbers**
  via an additive `rebuild_index_instrumented` seam and schema-v2 benchmark diagnostics: the no-op/
  touched floor is ~6 s of file discovery/read/hash/parse over 40k documents plus 2.5–5.5 s
  regenerating all ~558k chunk descriptors for the embedding-reuse check — embedding itself is 0 ms
  on unchanged corpora and the reconcile transaction ~14 ms, so SQLite writes are not the floor;
  the 2.50 GB index is **live data, not rebuild growth** (freelist ~0.8 MB, a fresh build over the
  same corpus is the same size, five no-op rebuilds add zero pages, diagnostic `VACUUM INTO`
  recovers 0.4%), correcting the earlier free-page-growth reading; and peak RSS 2.4–2.5 GB comes
  from holding the loaded corpus plus all ~1.07 M prepared replacement rows (embedding blobs
  included) in memory ahead of the single reconcile transaction. Cold builds are embedding
  (~7 s) plus initial-insert (~10–12 s) dominated. No production behavior changed; obvious future
  optimization directions (persisting file hashes to skip unchanged loads, streaming row
  preparation) remain unimplemented pending a decision.

  **Embedded vector index: evaluated 2026-07-12, verdict Hold** (Vault `102e562`: a feature-gated
  `vector-eval` harness — zero new dependencies in default builds — measuring usearch 2.26.0
  (Apache-2.0) and hannoy 0.1.3 (MIT) against a disk-first exhaustive-cosine oracle with
  tie-tolerant recall on the production 40k/557,950-chunk corpus; methodology, screening table,
  and canonical results in Vault's `Docs/vector-index-evaluation.md`). Both engines beat the
  ≤250 ms latency target by orders of magnitude (0.5–1.5 ms warm p95) with defensible storage
  (654–837 MB) and no selective-filter recall collapse, but **both fail the tolerant recall@20
  ≥ 0.95 viability target at full scale** (hannoy 0.670, usearch 0.439; a search-effort sweep to
  ef 512 recovers little), attributed to the shipping LocalHash backend's tie-plateau cosine
  geometry degrading HNSW navigation — the reduced-scale pass did not survive scaling. The same
  harness measured the in-memory exhaustive scan at 68–70 ms p50 over all 558k chunks,
  implicating the production semantic path's storage/decode layout rather than the similarity
  arithmetic. Revisit as a Trial only when a real embedding backend becomes the default (recall
  re-measured via the committed harness) and an in-memory/decoded-cache exhaustive scan misses
  the latency target at real corpus scale; until then the nearer optimization candidate is the
  production exhaustive path itself. No production vector integration landed; Meilisearch stays
  deferred.

  **Done — semantic exhaustive-path optimization (2026-07-12, Vault `9a38fd0`).** The production
  related/semantic path no longer re-reads and re-decodes per-chunk embedding blobs from SQLite on
  every query: each embedding model lazily decodes once into contiguous `f32` matrices grouped by
  vector dimension, with compact interned note/chunk metadata for filtering and deterministic tie
  ordering; filters still resolve eligibility through the existing parameterized SQL and only the
  ordered top 50 hydrate from SQLite. Canonical 40k/558k benchmark (M3 Pro, release, committed as
  `2026-07-12-40k-semantic-cache.json`): warm p50 10.1 s → **91.1 ms** unfiltered (~111×) and
  1.40 s → **33.2 ms** filtered (~42×), first cold query ~4.2 s including the one-time cache build,
  cache 576 MiB owned allocations (+591 MiB RSS; process peak still set by the rebuild), index size
  byte-identical. The orchestrator independently reproduced the warm numbers (93.7/34.2 ms under
  concurrent test load). Correctness: a retained dual-path test pins exact result/score/tie-rank
  equality against the uncached decode path across filters, provider/model separation, no-op
  invalidation, and reconciliation; the cache generation advances while the SQLite connection lock
  is held so a query can never pair a stale cache with fresh hydration. Full native suite 366/366.
  No API drift, no ANN, no new dependencies. Known trade-off: every successful rebuild — including
  no-op watcher rebuilds — retires the cache, so the next semantic query repays the ~4 s build;
  the no-op-rebuild slice below is the natural place to revisit that conservatism.

  **Done — no-op rebuild floor removed (2026-07-12, Vault `060e953`).** Rebuilds no longer reread,
  rehash, and reparse every file: a disposable `file_state` table (vault+path → content hash, size,
  ns-mtime, ctime, device, inode, versioned parsed facts, chunk count) lets the rebuild skip
  reading a file only when the full identity tuple matches exactly AND the filesystem is trusted
  for stable identity (APFS; ext/XFS/Btrfs/tmpfs on Linux — network/overlay/unknown filesystems
  always hash); any tuple mismatch or untrusted filesystem falls back to a stable stat-read-stat
  SHA-256 pass where an equal hash reuses parsed facts. Same-size external edits, mtime-preserving
  writes, atomic replacement, deletion, rename, and added/removed multi-vault roots are covered by
  ctime/inode or the hash fallback and pinned by a correctness test matrix; watcher events remain
  vault-scoping hints only, so full rebuilds never trust watcher completeness. Skipped files still
  reconcile as present, and a proven zero-row-change reconcile now preserves the slice-7 semantic
  cache generation (closing that slice's noted no-op trade-off) while any real row change still
  invalidates it. Canonical 40k benchmark (committed `2026-07-12-40k-no-op-floor.json`): steady
  no-op rebuilds 8.4–11.5 s → **1.16–2.62 s (median 1.42 s)** with zero reads/parses/embeddings/
  row writes; first unchanged rebuild after a cold build 10.9 s → 5.5 s; a 100-file touch now
  costs 100 reads and 1,380 embedded chunks (556,670 reused) instead of a full reload. The
  orchestrator independently reproduced steady-state no-ops at 1.3–1.8 s under concurrent test
  load, with cargo 373/373 and node contract 124/124 native. Chunk/row-preparation streaming
  stays a separate measured option for peak RSS.

  **Remaining planned search follow-up.** Rerun the
  committed vector-index evaluation only when a real embedding backend becomes the default and the
  optimized in-memory/decoded-cache exhaustive scan misses its interactive latency target at real
  corpus scale. Until both gates fire, the vector verdict remains **Hold** and ANN/Meilisearch remain
  out of scope.

  Consequences: the FTS5 keyword path needs no engine change at this scale, and related/semantic work
  should improve the exact exhaustive path before reopening the engine decision. Support for PDFs,
  office documents, mail, images/OCR,
  or other raw file types is a separate future ingestion slice: discover files, extract normalized
  searchable text and metadata with provenance, and keep every extraction/index disposable and
  rebuildable from the original files. It does not require replacing the text engine up front, and
  Overlay's generalized agent-retrieval index remains a separate consumer-facing boundary from
  Vault's human search experience.

  [Meilisearch](https://github.com/meilisearch/meilisearch) is a researched but deferred option, not
  an adopted dependency. Its typo tolerance, prefix search, facets, synonyms, and hybrid keyword/vector
  ranking could become valuable, but today it would add a separately supervised REST server, desktop
  packaging and security lifecycle, asynchronous index synchronization, version migration work, and
  another derived database; it also accepts normalized documents rather than extracting arbitrary raw
  file formats for Vault. Reconsider it only if representative benchmarks show the embedded approach
  missing agreed latency/relevance targets, the product needs its combined search/facet/hybrid feature
  set, or search becomes a shared network service or materially larger corpus. Until one of those
  triggers occurs, further Meilisearch investigation is intentionally not near-term work.

  Keep the preferred workflow lightweight but rigorous: read repo-local `AGENTS.md`, scope the slice
  narrowly, use Fable/Codex or subagents when the work benefits from adversarial review, validate the
  touched surfaces, then commit/push only when explicitly requested.

  **Developer ID distribution work** — requires Apple Developer Program credentials and release
  secrets:

  1. **Signed/notarized DMG releases.** Produce Developer ID signed, notarized `.dmg` artifacts for
     Overlay and Vault, with the bundled Rust sidecars hash-verified before packaging and notarization
     stapled before publishing.
  2. **Updater and release CI.** A release workflow builds, signs, notarizes, publishes, and smoke-tests
     the app artifacts; the apps check a signed update manifest from the chosen release host. Treat
     shutdown and relaunch synchronization as part of the updater contract, not an implementation
     detail: installation must not relaunch the new app until the old app and its bundled sidecars
     have exited and released their loopback listeners.
  3. **Overlay shutdown/relaunch and port-collision proof.** Preserve the intentional tray behavior
     (closing the window hides it; explicit Quit exits), but make actual quit wait for and reap this
     launch's in-process console listener (or an identity-verified own orphan) and release the
     single-instance socket and port `4180` before an updater relaunch proceeds. Retain the
     parent-death watchdog for abnormal termination and add a
     bounded retry for the narrow case where the prior owned listener is still closing. If an
     unrelated or standalone process owns `4180`, never kill or attach to it: fail with a visible,
     actionable native startup error instead of leaving the main window hidden behind the health
     timeout. Release validation must cover window-close-to-tray, explicit Quit, parent crash,
     immediate updater-style relaunch, a deliberately occupied `4180`, and cleanup of QA-spawned
     standalone servers. A dynamically selected loopback port remains a fallback design only if the
     fixed-port lifecycle cannot be made deterministic without weakening the origin/token boundary.

     The ordinary-Quit and collision baseline is implemented in Overlay `5bf8407`: release startup
     waits a bounded two seconds for a prior listener to release `4180`, refuses to adopt or kill an
     unrelated owner, shows a native actionable error, and explicit Quit kills and reaps only the
     owned sidecar before waiting for the listener to close. Packaged-app QA proved the occupied-port
     and normal-Quit paths. Immediate updater-driven restart, parent-crash recovery, and signed-update
     installation remain pre-release acceptance work rather than claims of the current unsigned app.
     Phase 9 revisits this baseline: its near-term adopt-own-sidecar slice relaxes the refuse-to-adopt
     rule for an identity-verified *own* orphan — the common cause of that startup modal — and the
     transport split then removes the port from the desktop startup path entirely.
  4. **Clean-machine install proof.** Verify the published artifacts on a fresh account/VM with no repo
     checkout, no developer env, no prebuilt binaries on PATH, and no manual env setup. This is the
     proof that the DMG experience is truly consumer-grade rather than merely clean-ish local.
  5. **Optional package channels.** Homebrew/Scoop/native package channels are follow-ons after the
     signed DMG and updater path are stable.
  6. **Distribution-doc cleanup.** During the release pass, sweep product docs, CI comments, and
     release checklists for old "three repo/product" language. The release shape is two user-facing
     apps, Vault and Overlay; Runner is documented, packaged, and optionally installed from Overlay,
     not released as a third standalone product.
- **Done — Agent lifecycle hook integration for Codex/Claude.** Overlay now owns canonical
  `hooks/*.yaml` doctrine, exposes it in the Agent Runtimes view, and serves `GET /api/agents/hooks`
  plus `POST /api/agents/hooks/ingest` from the console API. Codex and Claude Code still own whether
  and how local hook configs are installed; Overlay only generates copyable snippets and records
  bounded ingest events after validating the hook id, agent, and phase against active YAML doctrine.
  Hook config remains a derived artifact over plain YAML doctrine, never app-private state; hook trust,
  local-process permissions, and secret material stay in the Codex/Claude/daemon environment rather
  than the corpus.
- **Done — Overlay native titlebar integration (2026-07-09).** The Vault-proven macOS titlebar overlay
  shipped in the Agent-Overlay desktop console: `titleBarStyle: Overlay` + `hiddenTitle` +
  `trafficLightPosition x16/y26` (keys verified against the locked Tauri 2.11.5 / tauri-utils 2.9.3
  source; Windows/Linux overrides stay complete opaque window entries without the overlay keys). The
  4rem app header doubles as the titlebar behind the same packaged-mac gate as vibrancy
  (`data-mac-titlebar` beside `data-native-vibrancy`): an 80px traffic-light safe area on the inner
  header bar and a `data-tauri-drag-region="deep"` header whose interactive children stay clickable;
  the main-window capability gained only `core:window:allow-start-dragging`. Browser/dev and non-mac
  renders get no attributes or offsets — Playwright covers both directions with a simulated
  `__TAURI_INTERNALS__` context. Real packaged-`.app` QA ran with full automation this time
  (Screen Recording + Accessibility TCC available): current-bundle proof, dark/light blend, theme
  toggle + hamburger/drawer clicks through the drag region, header drag (+120/+120), double-click
  zoom, 760/1024/1440/1920 widths with zero overlap, fullscreen enter/exit, and clean sidecar reap
  on quit — evidence in `qa/2026-07-09-overlay-titlebar/`. Same accepted limitation as Vault: the
  safe-area reservation persists in native fullscreen while the traffic lights auto-hide;
  system-level Reduce Transparency was not toggled (the titlebar rule extends the proven
  `prefers-reduced-transparency` fallback block).

**Current implementation-risk status:** the following review findings were captured during Phase 5
hardening and should stay visible as the system moves toward production packaging.

- **Done — Runner trigger reliability.** `debounce_ms` / `max_concurrency` are trigger doctrine, and
  Runner enforces them through the in-process dispatch gate plus state-dir process slots for generated
  cron dispatch. Absent `max_concurrency` means one in-flight run per trigger.
- **Done — Overlay trusted approval protocol.** The shipped approval contract is documented in [agent-overlay.md](agent-overlay.md#current-hardening-status).
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
- **Done — Vault privileged-origin split (2026-07-07).** See
  [agent-vault.md](agent-vault.md#current-hardening-status).
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
- **Done — Vault dogfood follow-ups closed (2026-07-09).** All four items recorded by the 2026-07-08
  slice-1 adversarial reviews shipped: (a) vaults registered at runtime are live-watched — registry
  mutation routes sync the running notify watcher through a shared handle (idempotent root-diff;
  removal unwatches; notify calls never run under the event-callback's lock; sync is best-effort so a
  stale root can't wedge registry mutations); (b) the cross-vault daily-note conflict returns a
  structured 409 (`error` + `conflict: {vault, noteId, date}`, dedicated `DailyNoteConflict` schema)
  and the daily bar offers "Open existing daily", switching to the owning vault instead of
  dead-ending; (c) toolbar list buttons convert already-listed lines between unordered/ordered/task
  (indentation preserved, checkboxes dropped on conversion away from task, same-kind click stays a
  no-op); (d) a failed `/api/vaults` fetch no longer dead-ends creation — the create form and daily
  bar surface Retry affordances, typed input survives, and unresolved managed targets still never
  guess a vault. The web error client gained `ApiError` (status + parsed body) with unchanged
  messages. Known cosmetic edge: converting a mixed selection to an ordered list keeps an
  already-ordered line's number, so source numbering can be non-sequential (renderers renumber).

**Guardrail:** enforcement and transport are added at the edges (executors, server transport) without
moving doctrine out of plain files or giving the Runner/Vault privileged built-ins.

**Done when:** policies are enforced (not merely advised) on `overlay run`; an MCP client can connect
over HTTP/SSE; Vault and Overlay have local packaged-app rehearsal coverage; Overlay's distribution
includes the Runner daemon binary. Signed/notarized, self-updating consumer distribution is now
tracked separately in the final Developer ID lane because it is credential-gated.

---

## Phase 6 — Rust re-platform

**Goal:** every Node/TS backend becomes a Rust binary behind unchanged seams — the corpus formats,
MCP wire, argv + exit codes, env vars, and HTTP/SSE shapes stay byte-identical while the
implementations swap. React frontends and the Tauri v2 wraps are untouched. Campaign master (crate
architecture, pinned stack, frozen-TS-core policy, cutover gates, risk register):
[rust-migration.md](rust-migration.md).

**Prerequisite:** Phase 5's runtime and contract work. The original parked packaging tail is no
longer a Rust-migration prerequisite; unsigned/ad-hoc package rehearsal is complete, while
Developer ID signing/notarization/updater work is final distribution work.

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
   boot from the bundled, hash-verified Rust sidecars (local smoke 2026-07-07; package rehearsal
   refreshed 2026-07-10). The parked signing/updater/cross-webview packaging remains the **final
   Developer ID distribution work**, gated on Apple Developer Program credentials. Of the unblocked
   post-migration roadmap, the Vault
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

## Phase 8 — Product boundary realignment (safe native arc shipped; parked decisions recorded)

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

Open and Managed are per-vault registry modes. Engaged is the app-level Overlay connection state,
orthogonal to both.

**Progress (2026-07-09) — Slice 0 shipped.** The doc/design preflight is done. The canonical
contract lives in [`Docs/native-intelligence.md`](../Agent-Vault/Docs/native-intelligence.md) and
owns the Open / Managed / Engaged feature matrix, the native-vs-Engaged chat routing table,
provider/local-runtime setup shape, and the **Read Only** / **Allow Edits** / **Full Access**
permission vocabulary. The pinned first implementation target is Vault-native read-only
current-note Q&A plus whole-vault Q&A over existing Vault search/indexing, working with Overlay
disconnected — no proposal queue, no trajectory dependency, no write/apply path, no Runner.

**Progress (2026-07-09) — Slice 1 shipped.** Vault-native read-only Q&A is live. Vault owns
`GET /api/native-chat/status` and `POST /api/native-chat/turn` (OpenAI-compatible provider via
`AGENT_VAULT_NATIVE_CHAT_*` env config; key values only in the named env var): current-note context
through the existing note-context builder, whole-vault context through bounded deterministic
semantic retrieval over the existing index, and cited sources in the response. The routes are not
Overlay-gated, call no `overlay-core` code, record no trajectories, file no proposals, and write no
files — proven by contract tests that run the real binary with Overlay disconnected and assert
byte-identical vault trees plus an artifact scan. The Chat dock now has a route selector: **Native ·
Read Only** (fixed Read Only chip, note/vault context only, source links, no run/capture/proposal/
apply affordances) beside the unchanged **Engaged (Overlay)** surface, with value-free unavailable
reasons. Write/apply paths, native streaming, persisted app-settings provider UI, and local-runtime
discovery remain future 8.1 work.

Follow-ups from the Slice 1 close-out:

- Disconnected native-chat smokes must set an explicit empty `AGENT_VAULT_WORKSPACE`; running the
  binary from the repo can otherwise resolve the default Overlay template relative to CWD and
  silently connect Overlay, invalidating the independence proof.
- ✅ Cleared (2026-07-09): the two pre-existing browser-smoke reds were stale tests, not product
  bugs — the vault switcher became a Radix dropdown and the managed-note editor dropped its manual
  Save button for autosave in the 2026-07-08 polish; the smoke now drives the menu and polls the
  autosaved note. 15/15 green.
- ✅ Done (Slice 2): persisted provider setup UI.

**Progress (2026-07-09) — Slice 2 shipped.** Native chat setup is end-user-shaped. Vault persists
non-secret provider settings (backend/model/base URL/API-key **env-var name**/timeout) in app
settings — `data/settings.json`, `AGENT_VAULT_SETTINGS` override — via `GET|PUT
/api/native-chat/settings`, applied live without restart; `POST /api/native-chat/test` is an
operator-initiated connection test with the same no-leak error mapping, and the status route now
reports the config source (`env` wins wholesale over `settings` as the override/debug path). A new
left-nav Settings view owns the Native Chat panel (status + source badge, env-override notice,
per-field validation errors, confirm-gated clear, connection test) and states the boundary: it
configures Vault-native Read Only chat only, never Engaged/Overlay profiles; secret values are
never accepted or stored — the key value lives in the server environment under the configured
name (Keychain remains future work). The Chat dock's native-unavailable states link into Settings.
Native turns remain read-only with no proposals/trajectories/writes (re-proven by contract tests
and a disconnected live smoke through the settings path). Remaining 8.1 work: native write/apply
paths, streaming, local-runtime discovery, Keychain-backed secrets.

**Progress (2026-07-09) — Slice 3 shipped.** Native **Allow Edits** is live as a Vault-owned
product guardrail, per the pinned permission vocabulary. The native turn takes `permission:
read-only` (default, contract-unchanged) or `allow-edits` (Current-note context only); allow-edits
turns may return at most **one** bounded body-only **suggestion** parsed from a Vault-owned
`vault-edit` fenced contract (`{noteId, summary, replacement}` + a server-computed
`baseContentHash`; malformed/multiple/wrong-target/too-large degrade to a closed `suggestionError`
without failing the turn). **The turn never writes.** The explicit write is
`POST /api/native-chat/apply`: a sha256 body-hash staleness gate (409 when the note changed),
frontmatter preserved verbatim, and the same validated save core as `PUT /api/notes/{id}` (shared
helper — schema validation, id-match, write backstop, atomic write, reindex). The Chat dock's
Native route gains a Read Only / Allow Edits permission select; suggestion cards are visually
distinct from Engaged proposals with confirm-armed explicit Apply, stale handling, and no
run/capture/proposal affordances. **No auto-apply exists on the native path** — a deliberate,
documented difference from Engaged allow-edits. Suggestions are never Overlay proposals; no
trajectories, no `overlay-core` involvement — proven by contract tests and a disconnected live
smoke (suggestion without write → explicit apply → frontmatter-preserved change → stale re-apply
409 → zero Overlay artifacts). Remaining 8.1 work: draft-note/placeholder creation, whole-vault or
multi-note edits (undecided — may stay Engaged-only), native streaming, local-runtime discovery,
Keychain-backed secrets.

Follow-up from the Slice 3 close-out: current-note context for notes in a non-default registered
vault may resolve through the default vault directory. *(✅ Resolved in Slice 4 — see below.)*

**Progress (2026-07-09) — Slice 4 shipped.** Native draft-note creation, on top of a multi-vault
correctness fix. The Slice 3 context follow-up is **resolved first**: note/vault context now
resolves each note's **owning managed-vault root** through the registry (context routes, Engaged
note context, native chat, CLI call sites — default-vault behavior unchanged), so note context and
the native `baseContentHash` are correct for registered non-default vaults. Native allow-edits
turns may now return either the Slice 3 edit suggestion or **one creation suggestion** parsed from
a `vault-create` fenced block (`{title, type?, body}` — type defaults to `note`, must be a
supported schema type with `daily` excluded; bounded; the target vault is **always
server-resolved** from the context note's owning vault, never model-chosen; degradations extend
the closed `suggestionError` enum with `invalid-type`). The turn still never writes: the Chat
dock's distinct "Create draft note" card (title/type/target-vault/body preview) posts the
suggestion verbatim to the existing validated `POST /api/notes` after a confirm-armed click —
single-note, vault-scoped, schema-validated, 409 duplicate conflicts surfaced with an Open-existing
action and no retry-create; success offers Open note. Editor-side placeholder creation from
unresolved `[[wikilinks]]` had already shipped 2026-07-08 and was verified against this slice's
requirements (a missing duplicate-conflict test was added). Proven by contract tests and a
disconnected live smoke on a **second registered managed vault**: suggestion carries
`vault: second`, no write before confirmation, explicit create lands in the second vault's root,
zero Overlay artifacts. Remaining 8.1 work: whole-vault/multi-note edits (undecided — may stay
Engaged-only), native streaming, local-runtime discovery, Keychain-backed secrets.

**Progress (2026-07-09) — Slice 5 shipped.** Native chat streams. `POST
/api/native-chat/turn/stream` mirrors the Engaged SSE seam (same request; validation/config errors
as plain JSON before the stream; frames `turn-started {model, backend, mode, permission}` /
`reply-delta` / `turn-completed` = **exactly the non-streaming response** from the single canonical
finalizer / `turn-error` with the bounded no-leak 502/504 mapping; client disconnect aborts the
task and closes the provider connection). The provider call streams OpenAI-compatible SSE with a
non-SSE JSON fallback for compat providers and a total-raw-read cap. On allow-edits turns a
line-based hold-back gate guarantees fenced `vault-edit`/`vault-create` payloads never flash into
visible deltas — proven live with a fence split across 7-char provider frames — while suggestion
parsing stays the one non-streaming parser over the full raw reply. The Chat dock streams native
turns when available (badges stay permission-accurate; the completed entry is indistinguishable
from a non-streaming one, confirm-armed apply/create cards included) and falls back to the
unchanged non-streaming route. Nothing in the streaming path writes files; abort leaves no
artifacts and the server healthy. Remaining 8.1 work: whole-vault/multi-note edits (undecided —
may stay Engaged-only), local-runtime discovery, Keychain-backed secrets.

**Progress (2026-07-09) — Slice 6 shipped.** Native local-runtime discovery and the first local
backend. `GET /api/native-chat/runtimes` is passive fixed-table discovery (claude/codex/gemini on
sanitized absolute PATH entries; only Claude Code runs a bounded `--version` probe; closed
statuses; no executable paths or env values in responses). **Honest classification:** Claude Code
is the one selectable native runtime — a verified tools-off pure-completion shape (`claude -p
--output-format json --tools "" --setting-sources "" --strict-mcp-config
--no-session-persistence`, prompt on stdin, fixed argv/no shell, env-cleared allowlist
HOME/PATH/USER/LOGNAME/TERM — USER required by its Keychain auth — fresh empty temp cwd, timeout
kill, closed 502/504, stderr never echoed) using the user's existing Claude Code login with no API
key and no Overlay; **Codex CLI and Gemini CLI are discovery-only** (`unsupported-interface`) —
their agentic interfaces belong to the Engaged path and are not faked as native-chat-capable.
`nativeChat.backend` gains `claude-code` (settings + env-override parity; baseUrl/apiKeyEnv
rejected for it); Read Only / Allow Edits ride the same prompt assembly, finalizer, and suggestion
parser as the provider path; streaming degrades honestly to one delta + completed for this backend
(CLI stream-json = backlog). The Settings panel gained the backend selector and a Local runtimes
list with statuses/reasons/Refresh; no custom command/path input exists anywhere. Proven by
contract tests over a fake claude binary (argv, env allowlist, stdin prompt, failure/timeout
mapping) and a disconnected live smoke where the **real** Claude Code answered from note context
(tools-off) with zero writes and zero Overlay artifacts; the OpenAI-compatible path re-verified.
Remaining 8.1 work: whole-vault/multi-note edits (undecided — may stay Engaged-only),
Keychain-backed secrets, claude-code stream-json.

**Progress (2026-07-09) — Slice 7 shipped.** Keychain-backed native provider secrets. The
OpenAI-compatible native chat key can now live in the OS secure store instead of only a process
env var: `nativeChat.apiKeySource: env | keychain` (absent = `env`, old settings files unchanged;
`keychain` persists no `apiKeyEnv`), a new Vault `secret_store` module (`keyring` 3 with
`apple-native` + `windows-native` only; one slot `agent-vault` / `native-chat-provider-api-key`),
and `PUT|DELETE /api/native-chat/secret` (store without echo, 4096-char cap, idempotent clear;
closed errors `unsupported` 501 / `permission-denied` / `storage-failed` 500 — Keychain failures
never collapse into vague provider errors). Settings responses report `secret { backend, hasKey }`
and status reports `apiKeySource` without ever returning a value. **Honest platform support:**
macOS Keychain shipped and live-smoked; Windows Credential Manager compiled but untested; Linux
reports `unsupported` with the env-var reference as the safe fallback;
`AGENT_VAULT_SECRET_STORE=memory` is the tests/debug backend so no suite touches a real Keychain.
The env override (`AGENT_VAULT_NATIVE_CHAT_*`) still wins wholesale, stays env-var-only, and never
consults the store; the claude-code backend rejects `apiKeySource` and keeps auth in the user's
own CLI login. The Settings panel gained the key-source selector, a never-prefilled password
field, Store/Update, confirm-gated Clear, and stored/missing/unsupported status copy. Proven by
contract tests (sentinel key never in `data/settings.json`, responses, server output, or the temp
tree; mock provider receives it as the bearer token; env-override-wins with the store forced
unsupported; zero Overlay artifacts) and a disconnected live smoke against the **real** macOS
Keychain (store → status → test → read-only turn → clear, Keychain slot verified empty after).
Review catch: the origin guard requires the JSON content-type on *all* state-changing `/api`
methods, bodyless DELETE included — test/smoke HTTP helpers must send it like the real web client
does. Remaining 8.1 work: whole-vault/multi-note edits (undecided — may stay Engaged-only),
claude-code stream-json.

**Progress (2026-07-09) — Slice 8 shipped.** Real Claude Code `stream-json` streaming replaces the
single-delta degradation. Probed first against the real CLI: `stream-json` in print mode requires
`--verbose`, and genuine incremental deltas require `--include-partial-messages`; the streaming
argv adds exactly those flags to the Slice 6 tools-off safety shape (fixed argv pinned by test —
no shell, prompt on stdin, env-cleared allowlist, empty temp cwd, bounded timeout, kill-on-drop,
capped output, stderr never surfaced; the non-streaming route keeps `json` mode). **Closed-allowlist
event parsing:** only `stream_event → content_block_delta → text_delta` surfaces, fed through the
same anti-flash gate as the OpenAI streaming path (allow-edits fences cannot flash); thinking and
system/rate-limit/lifecycle events are silently ignored; **tool blocks are closed 502 failures**
(tools are off — one appearing means the contract broke); malformed NDJSON, `is_error`, a missing
`result` event, or reply/stdout-cap overruns fail closed and kill the child; timeout → 504 and
receiver-drop kills the child (both pid-proven). The final `result` event is authoritative and
feeds the unchanged finalizer/suggestion parser, so Read Only / Allow Edits semantics are
byte-identical to non-streaming. No SSE-frame, OpenAPI, or UI changes. No version sniffing: older
CLIs without `stream-json` support fail streaming closed while the non-streaming route still works
(documented version floor). Matrix green (one cold-run flake, 4 subsequent full-suite greens); live
disconnected smoke with the **real** CLI: Read Only streamed 5 incremental deltas, Allow Edits
flashed nothing and wrote nothing before explicit Apply (then applied through the validated path),
OpenAI-compatible streaming unchanged, zero Overlay artifacts.

**Close-out (2026-07-09) — safe native arc shipped.** The bounded Vault-native intelligence arc is
complete for the current product boundary: read-only current-note/vault Q&A, persisted native provider
setup, current-note Allow Edits, explicit draft/placeholder note creation, streaming replies, Claude
Code local-runtime support, and Keychain-backed OpenAI-compatible provider secrets all work without
Overlay. The remaining ideas — whole-vault/multi-note edits and **Full Access** — are **parked
decision work**, not queued implementation slices. They should be revisited only at a later build-plan
point with an explicit Engaged/Overlay boundary decision covering review bundles, diff UI, rollback,
path/tool containment, approvals, and audit trail. Until then, they should not be slipped into the
Vault-native path.

**Work:**

- **Doc/design preflight — ✅ done (Slice 0, 2026-07-09; see Progress above).** The contract lives
  in the Vault doc linked there rather than restated here. Sequencing rule unchanged: the first
  implementation slice is read-only current-note/vault Q&A; write/apply behavior follows only after
  the native permission model is pinned.
- Split Vault's current Overlay-gated chat into a Vault-native path and an Overlay-engaged path.
  The UI may stay one Chat surface, but status, permissions, and run labels must make the active
  mode obvious.
- Add or reuse provider/local-runtime setup in Vault for native chat. Secrets belong in Keychain or
  user-owned secret files; provider/runtime choices belong in persisted app settings, not in
  Overlay doctrine unless the user chooses the Engaged path.
- Preserve the Cogito-style permission simplicity for the native path: **Read Only** and **Allow
  Edits** are shipped product guardrails; **Full Access** is explicitly parked until a future
  Engaged/Overlay decision pins containment, scope, confirmation, approvals, and audit rules.
  Engaged mode can map the shipped labels onto Overlay profiles/policies.
- Keep write discipline boring: the model may propose or request a note change, but Vault performs
  the write through the same validated note APIs the UI uses.
- Keep Vault docs explicit about which features work in Open, Managed, and Engaged modes so
  "standalone" does not accidentally mean "no agent help."

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
  Agent-Architecture. The old Agent-Runner repo is a pointer/archive rather than a second source of
  truth.
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
are identical modulo the runner binary's own embedded path.

**Progress (2026-07-09) — second slice shipped.** The Overlay desktop app now bundles `agent-runner`
as a third Tauri sidecar (staged and sha256/size-preflighted by the same script as `overlay` and
`agent-overlay-server`), and the console Automations surface prefers it by default: the resolution
precedence is `AGENT_RUNNER_COMMAND` operator override (never silently replaced, no fallback when it
doesn't resolve) → bundled sibling next to the console executable → PATH default, with the active
source (`env` | `bundled` | `default`) reported by `GET /api/automations/runner`. The standalone
`cargo build --release -p agent-runner` artifact remains the remote/headless deployment path
(operator-managed; the console controls only the local runner), documented in Overlay's
`docs/runner.md`. Packaged-app smoke verified bundled resolution and override behavior. At this point,
the old Agent-Runner repo still needed its pointer/archive conversion; the next slice completed it.
Signed/notarized distribution and auto-updater remain tracked separately.

**Progress (2026-07-09) — third slice shipped.** The old Agent-Runner repo was turned into an
archived historical pointer: its README and AGENTS.md now state the archived status and
redirect to `Agent-Overlay/crates/agent-runner`, `docs/runner.md`, and this plan. No code was
deleted; the source tree is retained read-only for history (last pre-archive implementation commit
`920e4e1`). Architecture and Overlay docs now match
the new repo home, and the acceptance harness default runner binary now comes from the Agent-Overlay
build. The 8.2 runner-side done-when is satisfied. Still no signed/notarized distribution or
auto-updater; those are tracked separately.

**Done when:** Vault can answer and work over a vault without Overlay for basic knowledge-agent tasks;
Engaged mode clearly adds Overlay doctrine/governance rather than being the baseline; and the Runner
binary is built, tested, packaged, documented, and optionally installed from Agent-Overlay with no
separate Agent-Runner repo required for normal use.

---

## Phase 9 — Local integration API (complete, 2026-07-14)

**Goal:** let other programs integrate with a running Agent Overlay over its local HTTP API — read
state, subscribe to events, and request governed work — without giving any caller the operator's
control-plane privileges, and without the shared listener's fixed port blocking desktop startup. The
design decisions are recorded in
[`agent-overlay-local-api-decisions.md`](../Agent-Overlay/agent-overlay-local-api-decisions.md).

**Prerequisite:** Phase 8. Overlay owns the console `/api/*` + SSE server and the policy/approval
machinery, so this is an access-and-transport change on a stable surface, not a runtime rewrite.

**Dependency arrows:** an integration is just another *caller* of Overlay's existing seam — the same
shape as Claude Code, Emacs, the CLI, and the Runner. `integration ──HTTP──▶ overlay console API`;
authorization derives from a console-local integration-scope vocabulary enforced by the central
route table in the auth layer. Overlay still depends on neither sibling, and no
caller gains the ability to make Overlay *act* outside doctrine and approval.

**Work (smallest useful first):**
1. **Adopt an orphaned own sidecar (near-term, standalone).** The immediate friction — the "sidecar
   port `4180` is already in use" startup modal — is usually an *own* sidecar orphaned by a crash or
   force-quit: the single-instance lock misses it (the app is gone) and the current bind-probe fails
   rather than adopts. Evolve the Phase 5 fixed-port baseline (Overlay `5bf8407`, which deliberately
   refuses to adopt or kill any owner): when `4180` is held, identity-probe the owner over
   `/api/health` and, only if it is our own orphaned server, adopt it (navigate) or reap and rebind —
   an *unrelated* process still triggers the same fail-closed native error. Lands ahead of the
   transport split, needs no auth or capability work, and is superseded by it once the GUI no longer
   binds the port.

   Implemented in Overlay `919f0a8`: `/api/health` now reports the server `pid`; startup classifies
   the port owner as an own orphan only when health shows `ok:true` plus a non-empty instance token,
   and the reported pid's executable basename is re-verified as `agent-overlay-server` immediately
   before each signal (TERM, then a single KILL escalation). Dev servers (no instance token) and
   unrelated owners keep the exact fail-closed native error.
2. **Transport split + auth spine.** Serve the desktop UI over an in-process transport (a Tauri custom
   scheme dispatching into the same Axum `tower::Service` router) so it no longer binds the loopback
   port; keep the TCP listener for the CLI, daemon, and integrations on the fixed, env-overridable
   port. Add an auth layer after the existing origin guard that classifies each request as **operator**
   (today's token, now in-process), **integration** (`Authorization: Bearer`), or **anonymous**;
   control-plane routes reject non-operator identities and anonymous gets liveness only. This removes
   the port-collision startup modal structurally — the desktop no longer binds the port at all — and
   closes the current unauthenticated-local-caller gap.

   Implemented in Overlay `96a2abe` (transport) + `db778d0` (auth spine). The packaged app embeds
   the console router: an `overlay://` custom scheme dispatches UI/API requests in-process (named
   SSE events cross a Tauri event bridge — custom-scheme responses cannot stream), and the loopback
   listener binds in a background task that reaps identity-verified own orphans and otherwise
   retries without blocking launch. Requests are classified operator / integration / anonymous in
   one tower layer after the origin guard; the packaged listener runs restricted (anonymous gets
   liveness only, Bearer refused until tokens exist), while the standalone binary stays open for
   the dev loop with `OVERLAY_WIRE_ACCESS=restricted` as the tested opt-in.
3. **Read-only integration tokens.** User-created, labeled, scoped, hashed-at-rest, revocable tokens
   over the existing secret store, minted/revoked from a Settings surface, with `localApi.enabled` off
   by default. First scopes are read + subscribe (`*:read`, `events:subscribe`); every mint and denial
   is audited. Low blast radius — external dashboards, notifiers, status bars.

   Implemented in Overlay `ea58168` (backend) + `2197719` (Settings UI + OpenAPI). Tokens are
   SHA-256-hashed in a 0600 `integrations.json` beside the desktop store (the `overlay-core`
   secrets module is a read-only resolver, so the hashed-at-rest property lives there), shown raw
   exactly once, revocable, resolved in constant time, and optionally workspace-bound. First
   scopes: `dashboard:read`, `trajectories:read`, `memory:read`, `events:subscribe`, enforced from
   one central route table in the auth layer; unmapped routes stay operator-only. The plane is off
   by default; enable/mint/revoke and every denial class append to `integrations-audit.jsonl`.
   Admin routes are operator-token-gated and documented in `openapi/console.yaml`; Settings gains
   the mint/revoke card.
4. **Scoped write + approvals.** Add write scopes (`runs:launch`, `chat:ask`, …), every sensitive
   action still funneling through the policy `approval.required_for` gates to the operator. No caller
   self-authorizes.

   Implemented in Overlay `e261c70`: scopes `runs:launch` (run targets/workflow/eval) and
   `capture:write` (capture inbox) join the central route table. Console launch routes consult no
   approval gate for any caller — integration and operator launches are governed identically, and
   sensitive actions gate where tools are invoked (the MCP handler queues `approval.required_for`
   requests, decided only via the operator-token route). Tests pin that the scope table never maps
   a control-plane route and that a token holding every scope cannot decide approvals. `chat:ask`
   has no console route yet and is deliberately absent.

   Revisited post-GA-review in Overlay `140e7ea` + `d1a3879` (decided deliberately, not by
   omission): integration launches now queue as informed operator approvals by default — the
   validated request is hash-bound into a `console:run-launch` approval, its params persist beside
   the desktop store, and the operator's approve consumes the one-use approval and executes the
   existing launch path, with the Approvals view showing kind, params, and the requesting token. A
   mint-time `allowUnattendedRuns` flag (default false) is the explicit per-token opt-out. The
   decisions doc carries a dated addendum; the contract is `1.0.0-beta.2`.
5. **Publish + version the contract.** Promote `openapi/console.yaml` to the public integration
   contract with a stability/versioning commitment; document discovery (the fixed port) and the
   token/auth scheme.

   Implemented in Overlay `140e7ea` + `d1a3879`: the contract is versioned `1.0.0-beta.2` with declared
   security schemes (integration bearer + operator header), per-route security, anonymous
   `/api/health` discovery, restricted-mode denial semantics, and a semver stability commitment
   over the integration-reachable paths and scope vocabulary. `docs/local-integration-api.md` is
   the integrator's guide.

**Guardrail:** an integration token must never reach the control plane, and authorization must be
expressed as declared integration scopes enforced in one central auth-layer route table. If a caller
can approve its own work, switch
workspaces, read secrets, or drive the ungoverned shell, the two planes have merged back into
"on this machine = authorized" and the design has drifted. The integration plane stays off until
explicitly enabled.

**Done when:** the desktop app starts and renders without binding the shared TCP port (a busy port no
longer blocks launch); a read-only token can read state and subscribe to events but cannot launch work
or reach any control-plane route; a write-scoped token's sensitive action lands as an operator approval
rather than executing unattended; and the integration plane is off by default with tokens minted,
scoped, revoked, and audited from the UI.

All four conditions hold as of Overlay `140e7ea` + `d1a3879` (packaged-app QA 2026-07-14; contract
`1.0.0-beta.2`): the window renders
over the in-process `overlay://` scheme with the port busy; read-only tokens read/subscribe and are
403-denied everywhere else; integration-token launches queue as informed operator approvals by
default (with an `allowUnattendedRuns` opt-out), while operator launches execute directly; sensitive
tool actions queue `approval.required_for` approvals that only the operator token can decide (an
all-scope integration token is test-pinned to 403 on decisions); and the plane is off by default with
mint/revoke/audit exercised from the Settings card in the packaged app.

---

## Dependency map (at a glance)

```
Phase 0 (done) ─▶ Phase 1 ─┬─▶ Phase 2 (Vault) ─┐
                           └─▶ Phase 3 (Runner) ─┴─▶ Phase 4 ─▶ Phase 5 ─▶ Phase 6 (Rust re-platform) ─▶ Phase 7 (API contracts) ─▶ Phase 8 (boundary realignment) ─▶ Phase 9 (local integration API)

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
a separate product repo. Phase 9 opens Overlay's console API to third-party callers behind a
scoped-token auth plane — integrations join the CLI, daemon, and desktop as callers of the same seam,
none able to reach the operator's control plane.
