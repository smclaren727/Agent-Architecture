# Agent-Vault — repo definition

> The edit plane of the system. Net-new repository. For the system-wide picture see
> [README.md](README.md); for the library it builds on see [agent-overlay.md](agent-overlay.md).

## Concept

Agent-Vault is a **local-first markdown editor/wiki in which humans and LLM agents are co-equal,
first-class editors** of the overlay corpus — and of any vault it opens. It takes its cues from two
priors:

- **[`clearly`](https://github.com/Shpigford/clearly)** — a native, no-Electron-ceremony markdown
  editor: open a `.md`, write with syntax highlighting, toggle preview. Plain local files, no cloud,
  no telemetry.
- **[`wikiwise`](https://github.com/TristanH/wikiwise)** — turns a folder of markdown into a
  browsable, interlinked wiki *maintained collaboratively by humans and AI agents*: humans curate,
  the agent summarizes, cross-references, and keeps the knowledge base consistent as it grows. It
  watches files live (FSEvents), embeds a terminal for the coding agent, and keeps everything in
  plain markdown — no database, no RAG index as the source of truth.

Vault is what you get when you point that editing experience at **plain folders of files** instead of
a proprietary notes store. Every edit — by a human typing, or by an agent acting — lands as plain
markdown/YAML on disk; there is **no separate Vault data store**, and closing Vault loses nothing.

Vault opens **one or more vaults** (a *vault* is just a folder), and each is a **typed area** that
carries its own write-contract:

- **The overlay corpus** (`~/overlay/`) — the primary, special area: schema-validated canonical types,
  memory via the proposal queue, served by Overlay as **doctrine**. For this area, *the corpus is the
  document.* (The Runner's trigger declarations live here too — editing them is editing the corpus.)
- **Knowledge vaults** — looser folders of convention-following markdown (the Obsidian-style use
  case): served by Overlay as **world-knowledge**, never as doctrine.
- **An arbitrary folder or a single `.md`** — opened with no conventions, plain editing.

The no-second-source-of-truth rule holds **per area**: each vault's files *are* the truth for that
vault, edited in place — Vault never owns a copy or a sync pipeline. The overlay corpus is the first
vault Vault targets; multi-vault and the doctrine-vs-world-knowledge split are how that editing
experience generalizes (see [agent-overlay.md](agent-overlay.md) → "The single agent lens").

Vault **stands alone** at the product and runtime level: it works with no Overlay, which is an
*optional* connected source (doctrine + world-knowledge) the way Runner plugs into Overlay. It does,
however, keep a build-time dependency on the Rust **`overlay-core`** crate (a Cargo path dep of Vault's
`vault-server` crate) for that integration — standalone at the product level, not dependency-free.

## Tech stack & delivery

Vault ships in two stages:

1. **Web-first (start here).** A **React** front-end — **Vite + TypeScript + Tailwind + shadcn**, behind
   a view-module seam — is the build target. (An earlier framework-free HTML/CSS/JS UI was the first cut;
   it was retired for the React seam in Phase 5.0.) It is the fastest path to a working editor and keeps
   the UI honest about its one job — editing the corpus. The front-end talks over HTTP to the local
   Vault server — the Rust **`vault-server`** crate, which links **`overlay-core`** — and reaches Overlay
   through a local `overlay serve`, so no UI-specific data model is introduced.
2. **Tauri V2 (shipped 2026-06-30; Rust sidecar since the R3 cutover).** The web app is the product seam;
   the Tauri v2 shell (`src-tauri/`) wraps it **model-B**: the window loads the loopback origin of a
   bundled sidecar that serves both the UI and the API — no frontend rewrite (see
   [`Docs/tauri-wrap-build-plan.md`](../Agent-Vault/Docs/tauri-wrap-build-plan.md)). That sidecar is now
   the cargo-built **`agent-vault-server`** binary (the Tauri `externalBin`), swapped in at the R3 Rust
   cutover under the same env/`/api/health` contract — the original Node SEA sidecar and its toolchain
   are **retired**. In release, the shell binds the sidecar to `127.0.0.1:4173`, passes a per-launch
   `AGENT_VAULT_INSTANCE_TOKEN`, and accepts `/api/health` only when the response echoes that token, so
   a stale fixed-port process cannot satisfy a fresh launch gate. In dev, the Tauri window uses
   `http://localhost:5173` and does not spawn the bundled sidecar. **Agent-Overlay's operator console
   shipped the same model-B Tauri v2 wrap** (its
   sidecars likewise now the cargo binaries), so both repos converge on one desktop delivery story.
   Signed packaging + auto-updater (F1) and cross-webview QA (F2) are done **once, in Rust**, in the R4
   tail. The trusted origin holds privileged IPC, so the app document carries a script-restricting CSP,
   and — since 2026-07-07 — user-controlled vault assets are served from a **separate unprivileged
   origin** so they never touch that IPC-bearing origin at all (see "Current hardening status" below).

The references above (`clearly`, `wikiwise`) are native Swift apps; Vault borrows their *form factor*
(local-first, file-based, agent-collaborative) while taking a web→Tauri path so the same UI runs in a
browser during development and as a local app in production.

## What Vault adds over a plain markdown editor

A generic editor would let you type into the files. Vault is *corpus-aware*:

- **Raw canonical editing with schema-aware validation.** Today's overlay Workspace path is a
  markdown/YAML editor backed by `overlay-core` schemas and file APIs for canonical saves. Profiles,
  policies, tools, skills, workflows, and standards also have typed panels that rewrite the underlying
  YAML or Markdown frontmatter before the same canonical save path runs. Memory facts are displayed
  in structured read-only cards because canonical memory writes still flow through Proposals.
- **Live file watching.** Files changed outside Vault (by an agent, by Runner, by `git pull`) reflect
  immediately, the way wikiwise watches with FSEvents.
- **Wiki navigation and backlinks** across the corpus: the Workspace detail pane now derives
  read-only Corpus Links from canonical file content, so a workflow can jump to its skills and
  standards, profiles and policies can jump to tools, eval suites can jump to profiles/workflows,
  and memory facts/proposals can jump through supersession or non-global memory-scope links.
- **Semantic similarity search over chunks.** Vault's disposable SQLite index now stores rebuildable
  chunk embeddings for the same deterministic markdown chunks exposed by `/api/context`.
  The default backend is local/provider-free feature hashes; the opt-in OpenAI-compatible backend
  uses the configured `/embeddings` model. `/api/search/semantic` and the Search view's Semantic
  mode return chunk-level hits with note ids, paths, line ranges, scores, and the embedding model
  id; the existing full-text `/api/search` contract remains unchanged. Chat can explicitly attach
  bounded related chunks from this same configured embedding index.
- **The memory proposal review queue as a first-class UI.** Proposals in `memory/proposals/` are
  surfaced for accept / reject / supersede, *showing the conflict-similarity warnings Overlay already
  computes* (`overlay-core`'s `memory/similarity.rs`). This is the human-approval step that keeps
  canonical memory disciplined — given a real interface instead of a CLI. (See
  [`docs/memory-cli.md`](../Agent-Overlay/docs/memory-cli.md).)
- **Overlay-gated agent-facing views, including the embedded chat (shipped 2026-07-03).** The
  agent-facing surface is file-backed via `overlay-core`: **Capture, Proposals, Agent Runs
  (trajectories), Workspace — and the right-dock Chat**, gated client-side (`requiresOverlay` in
  `web/src/views/registry.ts`; the Chat tab renders only when connected) and server-side (the overlay
  routes, including `/api/agent/*`, return 503 with no `overlay.yaml` workspace connected). Chat
  turns are **governed agent turns**: `vault-server` calls `overlay-core`'s
  `adapters::turn::execute_agent_turn`, which resolves profile/policy, renders the canonical
  `vault-chat` workflow's charter as the system prompt, executes the selected profile's adapter, and
  records an ordinary trajectory — so every turn is auditable in Agent Runs, and replies can be
  captured into the triage inbox. Since 2026-07-04 the adapter may be **`direct`** (a provider
  chat-completions call) or **tool-bearing `claude-code`/`codex`**. Direct profiles and supported
  tool-bearing profiles stream reply deltas through `/api/agent/turn/stream`; suggestions and
  proposals remain final-completion artifacts. The agent binary re-enters Overlay over MCP via the
  same generated re-entry config `overlay run` uses, so in-app turns reach doctrine tools like
  `search-overlay` and
  `propose-memory` (proposal-queue writes only, never
  canonical memory). The status contract is a **passthrough of Overlay's own introspection**
  (`overlay-core`'s `describe_agent_profiles`): per-profile readiness — turn-capable direct,
  turn-capable tool-bearing, or a closed `unavailableReason` — plus `toolAccess` with provenance
  (`adapter` = the claude-code client allowlist, `policy` = the policy-gated `overlay serve` tool
  surface a codex profile actually gets, `unknown` = honest fallback). The Chat dock displays that
  answer read-only; Vault never derives or owns tool policy. The same status now includes Overlay's
  passive local-agent catalog, so the Chat dock can show Direct/API plus detected Claude Code,
  Codex CLI, and Gemini CLI as runtime choices without probing the host or storing automation
  behavior in Vault. Unsupported or incomplete runtimes are disabled until an Overlay profile can
  execute them. Tool-bearing
  replies link back the memory proposals their run filed, closing the review round-trip: chat reply
  → run-filtered proposal queue → Agent Runs. Graph-edge proposals need no separate contract —
  they ride `propose-memory` with `type: relationship` through the same queue. Permission is a
  per-turn selection: read-only, suggest, or allow-edits. Suggest requires explicit confirmation;
  allow-edits auto-applies exactly one current-note suggestion through the validated note-save API
  (frontmatter preserved) and leaves multiple candidates for explicit review. Context is also a
  per-turn selector, including a bounded, server-resolved Overlay workspace summary and an optional
  related-chunks block from Vault's configured embedding index. The Info dock exposes a Summary
  widget over ordinary note `summary` frontmatter and an Entities widget that deterministically
  matches saved note text against known people, organizations, projects, and areas, then adds missing
  `entities` ids only through explicit metadata PATCH. Its prompt-assisted "Summarize with agent"
  action and "Propose graph edges" action open this same Chat path with current-note context. Chat's
  "Plan workflow" action preloads a multi-agent planning brief without changing the selected context,
  permission, or profile; it is a starter over the existing governed turn path, not a new scheduler.
  Summaries do not create a separate store, and graph edges ride Overlay-owned `type: relationship`
  proposals. Design + slice record:
  [`Docs/embedded-agent-chat.md`](../Agent-Vault/Docs/embedded-agent-chat.md).
- **Open-file sessions for arbitrary markdown files.** `POST /api/open-file` mints an opaque in-memory
  token for one absolute `.md` / `.markdown` file; later reads and saves go by token, not by joining
  caller-provided paths. Saves are atomic temp-create + rename writes, and "add to vault" copies only
  into open-mode vaults, rejecting collisions instead of overwriting.
- **The convention checker and write-time backstop (shipped 2026-07-04).** `GET
  /api/conventions/check` is a standalone, overlay-independent, **read-only** quality pass:
  deterministic checks (duplicate ids, invalid frontmatter, dangling references/wikilinks, empty
  notes, orphans, task-less active projects) over the corpus and the disposable index, surfaced in a
  first-class **Conventions** view with severity/category filters and open-the-note navigation. It
  persists nothing and applies nothing - suggested fixes are text, and humans fix notes through the
  existing editing paths. Managed note API writes prepare candidate markdown and reject invalid
  frontmatter or duplicate ids before disk write; direct filesystem edits are still reported after
  the fact. Open vaults degrade to the schema-free checks and keep schema-free raw writes. Design +
  slice record:
  [`Docs/convention-checker.md`](../Agent-Vault/Docs/convention-checker.md).

## Conventions — the agent-collaboration spec

What makes an agent a *safe co-editor* (not merely a writer) is a small set of conventions the corpus
follows. These are a **portable spec, not an editor feature** — a file is conforming whether it was
authored in Vault, by an agent over MCP, or in vim. Vault makes them easy to honor; it does not own
or gate them. This is what lets the embedded agent be a *first-class citizen like the human* — the
goal that motivates the whole editor.

- **Provenance.** Frontmatter records who authored or changed a file/section (human vs. which agent),
  so the human-and-agent-as-peers relationship is visible and auditable.
- **Stable IDs / slugs.** Every addressable thing has an ID independent of its title, so links and
  agent references survive renames.
- **Machine-parseable links.** Wikilinks resolve to stable IDs, so an agent can traverse the graph
  deterministically.
- **Section-addressable, conflict-tolerant writes.** Edits target a named section, so a human and an
  agent can touch the same file without clobbering each other.
- **Write-time validation.** Every write is checked against the area's write-contract before it
  commits — the corpus via `overlay-core` schemas; knowledge vaults via a convention checker — so a
  malformed app/API write never lands. The convention checker now covers both read-only findings
  and the managed-note API write-time backstop. Direct filesystem edits can still bypass Vault and
  are caught by the checker/index rebuild afterward; open vaults remain intentionally schema-free.

Validation lives with the **owner** of each area; Vault *calls* it (links `overlay-core` for the
corpus; the knowledge-vault convention checker reuses the same in-crate schema validation rather
than a second ruleset) and **never reimplements** it, so the schema is single-sourced.

## How Vault talks to Overlay (three channels)

1. **Library.** Links the Rust `overlay-core` crate for schemas, workspace loading, validation, the
   search index, memory operations, the file read/write APIs — and, since 2026-07-03, the **agent
   turn API** (`adapters::turn`) that executes the embedded chat's governed, trajectory-recorded
   turns. Since 2026-07-04 the direct-provider path can stream reply deltas while preserving the same
   trajectory record (see the contract table in [agent-overlay.md](agent-overlay.md)).
2. **Protocol (shipped 2026-07-04, via the spawned agent).** The embedded agent's *agentic* tail
   speaks **MCP** to a local `overlay serve` — but the MCP client is the **spawned agent binary**
   (claude-code/codex), wired by the same generated re-entry config `overlay run` uses, not a client
   embedded in Vault's process. Vault only supplies the overlay CLI path
   (`AGENT_VAULT_OVERLAY_CLI`); Overlay owns the config generation, tool allowlist, and recording.
   The chat surface itself still executes over the library channel (MCP has no sampling, so it
   cannot execute a completion); an in-Vault MCP client remains unnecessary while this holds.
3. **Corpus / vaults.** Direct, **atomic** file read/write on each open vault, honoring that area's
   write-contract — for the overlay corpus: the canonical layout, the schemas, and the
   **propose-don't-write** rule for memory; for a knowledge vault: its convention checker. Agents read
   any vault's content back through Overlay's retrieval (the single agent-read path), never a
   Vault-specific API.

## Current hardening status

These Vault-specific review items are now part of the implementation contract:

- **User-controlled vault assets live on a separate unprivileged origin (privileged-origin split,
  shipped 2026-07-07).** The Tauri shell grants IPC (including `terminal_open` → `$SHELL`) to the app
  origin, so user bytes must never execute there. `/assets/*` is now served **only** from a second,
  unprivileged loopback listener (`AGENT_VAULT_ASSET_PORT`, default main port + 10 = `4183` in
  release) whose router exposes no `/api`, no app document, no `/docs`, and no SPA fallback, and which
  is **never granted a Tauri capability** (`remote.urls` names only the app origin). The app/API origin
  now returns `404` for `/assets/*`. The asset origin keeps the existing defenses — `nosniff`, the
  inert `sandbox`/`script-src 'none'` CSP, and `Content-Disposition: attachment` on active types (HTML/
  JS downgraded to `text/plain`; SVG keeps `image/svg+xml` so `<img>` previews render) — but now on a
  capability-less, Same-Origin-Policy-isolated origin, so even a scripted asset loaded as a document
  reaches no privileged API. The app-document CSP is composed at bind time to permit only the asset
  origin in `img-src` (nothing else relaxes); the renderer rewrites `/assets/…` image URLs to the asset
  origin discovered via `/api/health`. A dedicated Host-allowlist guard closes DNS-rebinding on the
  asset port (GET/HEAD only, no Origin/CORS). Reverse-proxy/Tailscale deployments must front the asset
  origin too and set `AGENT_VAULT_ASSET_ORIGIN`.
- **Managed-note writes use Overlay-grade write discipline.** Managed notes validate before commit and
  use unique temp files, file sync, atomic rename, and cleanup on failure, matching the corpus write
  contract.
- **The HTTP boundary is loopback-first.** The standalone server defaults to `127.0.0.1:4173` and the
  request guard checks Host, Origin, JSON content type, and extra dev/Tauri origins. Node-hosted or
  phone-facing deployments should keep the process loopback-bound and publish it through Tailscale
  Serve or an authenticated proxy, rather than binding the API directly to the LAN.
- **Quick capture is optional desktop polish.** The Tauri shell registers `CmdOrCtrl+Shift+Space` for a
  capture window when the OS allows it, but plugin or shortcut registration failure is non-fatal and
  never blocks app startup.

## Non-goals (Vault)

- **Not the doctrine store.** The corpus is the source of truth; Vault is a *view and editor* of it.
  Closing Vault loses nothing — the files are the state.
- **Not a scheduler.** Vault never watches-and-acts on a timer or event to *run* work. Deciding *when*
  work runs is Runner's job. Vault watches files only to *display* them.
- **No silent canonical memory writes.** Neither the human's edits nor the embedded agent's bypass the
  proposal queue for memory facts.

## Relationship to `apps/desktop` (Overlay's operator console)

This repo also ships Overlay's own desktop UI under `apps/desktop`, which overlaps Vault's surface
heavily: workspace open/create, a canonical file browser/editor with validation rollback, the memory
proposal queue, a trajectory viewer, search, and adapter diagnostics — all built on the `overlay-*`
crates. It
began as an **Electron** app and has since been **re-platformed off Electron to a local web app, in
place** — a Rust axum server (`crates/overlay-console`, bin `agent-overlay-server`) over `/api/*` + SSE
plus a Vite + React + TS + Tailwind + shadcn view-seam (the same pattern Vault uses; see
[overlay-ui-replatform.md](overlay-ui-replatform.md)).
Electron was removed without retiring the directory: `apps/desktop` **lives on as Overlay's operator
console**.

Vault is still a **separate front-end codebase**, not a continuation of that console. The relationship
is therefore:

- **Reuse the logic, not the shell.** The valuable parts of `apps/desktop` are framework-agnostic and
  already sit in `overlay-core` — schema validation, the validation-rollback file APIs
  (`workspace_files`), the proposal queue and conflict-similarity (`memory/`), search, trajectory
  reads. Vault links those directly. The old Electron-specific main/preload/IPC layer is **not**
  carried forward — and is now gone from Overlay itself.
- **`apps/desktop` continues as the operator console.** It was not retired in favor of Vault; the
  Electron shell was swapped for a local web app **in place**, and both repos have since shipped
  their **Tauri v2 wraps (2026-06-30)** — model-B shells over the cargo-built sidecar binaries, with
  signing/updater (F1) and cross-webview QA (F2) handled once in Rust in the R4 tail. A
  packaging step, not a retirement.

- **Authoring leaves Overlay; operations stay.** As file authoring/editing moves to Vault, Overlay's
  own console **narrows to an operational surface** — server status, validation reports, trajectories,
  eval reports, run launch, diagnostics, and the **Automations surface** (trigger lifecycle over the
  canonical write path, plus whitelisted `agent-runner` sync/status, service controls, and cron
  projection — the console invokes the runner as a configured subprocess; the dependency arrow does
  not move). Observability and operations, not authoring. The two apps then divide cleanly:
  **Vault authors the files; the Overlay console operates the system.**

This document records the direction; the sequencing lives in [build-plan.md](build-plan.md)
(Phases 1–2 and 5).
