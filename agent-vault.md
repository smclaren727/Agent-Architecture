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
   are **retired**. **Agent-Overlay's operator console shipped the same model-B Tauri v2 wrap** (its
   sidecars likewise now the cargo binaries), so both repos converge on one desktop delivery story.
   Signed packaging + auto-updater (F1) and cross-webview QA (F2) are done **once, in Rust**, in the R4
   tail. The trusted origin still holds privileged IPC, so the app document carries a script-restricting
   CSP; the full privileged-origin split is a Rust packaging-phase item (see "Current hardening status"
   below).

The references above (`clearly`, `wikiwise`) are native Swift apps; Vault borrows their *form factor*
(local-first, file-based, agent-collaborative) while taking a web→Tauri path so the same UI runs in a
browser during development and as a local app in production.

## What Vault adds over a plain markdown editor

A generic editor would let you type into the files. Vault is *corpus-aware*:

- **Schema-aware editing of canonical types.** When you edit a skill, workflow, standard, policy,
  profile, or memory fact, Vault knows its shape (via `overlay-core` schemas), offers structured
  editing, and validates before saving — so you never commit a file `overlay validate` would reject.
- **Live file watching.** Files changed outside Vault (by an agent, by Runner, by `git pull`) reflect
  immediately, the way wikiwise watches with FSEvents.
- **Wiki navigation and backlinks** across the corpus: jump from a workflow to the skills and
  standards it references, from a memory fact to the entities it mentions, and back.
- **The memory proposal review queue as a first-class UI.** Proposals in `memory/proposals/` are
  surfaced for accept / reject / supersede, *showing the conflict-similarity warnings Overlay already
  computes* (`overlay-core`'s `memory/similarity.rs`). This is the human-approval step that keeps
  canonical memory disciplined — given a real interface instead of a CLI. (See
  [`docs/memory-cli.md`](../Agent-Overlay/docs/memory-cli.md).)
- **Overlay-gated agent-facing views (current), an embedded agent surface (roadmap).** Today's
  agent-facing surface is file-backed via `overlay-core`: **Capture, Proposals, Agent Runs
  (trajectories), and Workspace**, gated client-side (`requiresOverlay` in
  `web/src/views/registry.ts`) and server-side (the overlay routes return 503 with no `overlay.yaml`
  workspace connected). There is **no in-app chat**. The embedded agent surface — in-app chat plus an
  MCP client to a local `overlay serve`, in the spirit of wikiwise's embedded terminal — was never
  built in the Node stack and is a **post-migration Rust roadmap item (decided 2026-07-01)**. When it
  lands, the in-app AI sees *exactly* the same doctrine as Claude Code or any other client, and its
  memory changes go through the same proposal queue a human's do.

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
  commits — the corpus via `overlay-core` schemas; knowledge vaults via a convention checker, which
  is **not yet built** (it ships with the embedded agent surface on the post-migration Rust roadmap)
  — so a malformed write never lands.

Validation lives with the **owner** of each area; Vault *calls* it (links `overlay-core` for the
corpus; will run the knowledge-vault convention checker once it exists) and **never reimplements**
it, so the schema is single-sourced.

## How Vault talks to Overlay (three channels)

1. **Library.** Links the Rust `overlay-core` crate for schemas, workspace loading, validation, the
   search index, memory operations, and the file read/write APIs (see the contract table in
   [agent-overlay.md](agent-overlay.md)).
2. **Protocol (roadmap).** The embedded agent surface will speak **MCP** to a local `overlay serve`
   — just another MCP client, reimplementing no doctrine access. This channel is a post-migration
   Rust roadmap item (decided 2026-07-01); today Vault reaches overlay state through `overlay-core`
   and its own server routes, not an in-app MCP client.
3. **Corpus / vaults.** Direct, **atomic** file read/write on each open vault, honoring that area's
   write-contract — for the overlay corpus: the canonical layout, the schemas, and the
   **propose-don't-write** rule for memory; for a knowledge vault: its convention checker. Agents read
   any vault's content back through Overlay's retrieval (the single agent-read path), never a
   Vault-specific API.

## Current hardening status

These Vault-specific review items are now part of the implementation contract:

- **Vault assets are inert on the trusted origin.** The Tauri shell still grants IPC to the local app
  origin, so `/assets/*` must never execute user-controlled code there. Active asset types are served
  with `nosniff`, script-denying CSP/sandbox headers, and attachment treatment — plain-text for HTML
  and JavaScript, and `Content-Disposition: attachment` for SVG (which keeps `image/svg+xml` so
  note-preview `<img>` embeds still render). The app document itself carries a script-restricting
  CSP. The full privileged-origin split is **re-scoped to the Rust/Tauri packaging phase** —
  consciously deferred, not dropped.
- **Managed-note writes use Overlay-grade write discipline.** Managed notes validate before commit and
  use unique temp files, file sync, atomic rename, and cleanup on failure, matching the corpus write
  contract.

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
  eval reports, run launch, diagnostics. Observability and operations, not editing. The two apps then
  divide cleanly: **Vault authors the files; the Overlay console watches the system.**

This document records the direction; the sequencing lives in [build-plan.md](build-plan.md)
(Phases 1–2 and 5).
