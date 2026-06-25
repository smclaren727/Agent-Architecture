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

## Tech stack & delivery

Vault ships in two stages:

1. **Web-first (start here).** A plain **HTML/CSS/JS** front-end is the initial build target. It is
   the fastest path to a working editor and keeps the UI honest about its one job — editing the
   corpus. The browser/app talks to the corpus and to Overlay through `@overlay/core` and a local
   `overlay serve`, so no UI-specific data model is introduced.
2. **Tauri V2 (polish).** Once the web app works, it is wrapped with **Tauri V2** to make it feel
   genuinely **local-first** — native file access to `~/overlay/`, system integration, and a small
   signed desktop binary — without rewriting the UI. **Agent-Overlay's own desktop surface moves to
   Tauri V2 as well**, so both repos converge on one desktop delivery story instead of two.

The references above (`clearly`, `wikiwise`) are native Swift apps; Vault borrows their *form factor*
(local-first, file-based, agent-collaborative) while taking a web→Tauri path so the same UI runs in a
browser during development and as a local app in production.

## What Vault adds over a plain markdown editor

A generic editor would let you type into the files. Vault is *corpus-aware*:

- **Schema-aware editing of canonical types.** When you edit a skill, workflow, standard, policy,
  profile, or memory fact, Vault knows its shape (via `@overlay/core` schemas), offers structured
  editing, and validates before saving — so you never commit a file `overlay validate` would reject.
- **Live file watching.** Files changed outside Vault (by an agent, by Runner, by `git pull`) reflect
  immediately, the way wikiwise watches with FSEvents.
- **Wiki navigation and backlinks** across the corpus: jump from a workflow to the skills and
  standards it references, from a memory fact to the entities it mentions, and back.
- **The memory proposal review queue as a first-class UI.** Proposals in `memory/proposals/` are
  surfaced for accept / reject / supersede, *showing the conflict-similarity warnings Overlay already
  computes* (`@overlay/core` `memory/similarity.ts`). This is the human-approval step that keeps
  canonical memory disciplined — given a real interface instead of a CLI. (See
  [`docs/memory-cli.md`](../Agent-Overlay/docs/memory-cli.md).)
- **An embedded agent surface** — in the spirit of wikiwise's embedded terminal — whose agents
  connect to Overlay's MCP server. The in-app AI therefore sees *exactly* the same doctrine as Claude
  Code or any other client: same skills, same policy, same memory. It edits the corpus as a
  first-class citizen, and its memory changes go through the same proposal queue a human's do.

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
  commits — the corpus via `@overlay/core` schemas, knowledge vaults via the convention checker — so a
  malformed write never lands.

Validation lives with the **owner** of each area; Vault *calls* it (imports `@overlay/core` for the
corpus; runs the convention checker for knowledge vaults) and **never reimplements** it, so the schema
is single-sourced.

## How Vault talks to Overlay (three channels)

1. **Library.** Imports `@overlay/core` for schemas, workspace loading, validation, the search index,
   memory operations, and the file read/write APIs (see the contract table in
   [agent-overlay.md](agent-overlay.md)).
2. **Protocol.** Vault's embedded agents speak **MCP** to a local `overlay serve`. Vault does not
   reimplement doctrine access; it is just another MCP client.
3. **Corpus / vaults.** Direct, **atomic** file read/write on each open vault, honoring that area's
   write-contract — for the overlay corpus: the canonical layout, the schemas, and the
   **propose-don't-write** rule for memory; for a knowledge vault: its convention checker. Agents read
   any vault's content back through Overlay's retrieval (the single agent-read path), never a
   Vault-specific API.

## Non-goals (Vault)

- **Not the doctrine store.** The corpus is the source of truth; Vault is a *view and editor* of it.
  Closing Vault loses nothing — the files are the state.
- **Not a scheduler.** Vault never watches-and-acts on a timer or event to *run* work. Deciding *when*
  work runs is Runner's job. Vault watches files only to *display* them.
- **No silent canonical memory writes.** Neither the human's edits nor the embedded agent's bypass the
  proposal queue for memory facts.

## Relationship to the existing `apps/desktop`

This repo already ships an **Electron** desktop app under `apps/desktop` that overlaps Vault's
surface heavily: workspace open/create, a canonical file browser/editor with validation rollback, the
memory proposal queue, a trajectory viewer, search, and adapter diagnostics — all built on
`@overlay/*`.

The chosen direction is **web-first → Tauri V2** (see "Tech stack & delivery" above), so Vault is a
**new front-end codebase**, not a continuation of the Electron shell. The relationship is therefore:

- **Reuse the logic, not the shell.** The valuable parts of `apps/desktop` are framework-agnostic and
  already sit in `@overlay/core` — schema validation, the validation-rollback file APIs
  (`workspace-files/`), the proposal queue and conflict-similarity (`memory/`), search, trajectory
  reads. Vault imports those directly. The Electron-specific main/preload/IPC layer is **not** carried
  forward.
- **`apps/desktop` becomes legacy, then retires.** Because Overlay's own desktop surface is also
  moving to Tauri V2, the Electron app is superseded rather than maintained in parallel. Keep it
  working until Vault's web build reaches parity, then retire it — avoiding two desktop shells.

- **Authoring leaves Overlay; operations stay.** As file authoring/editing moves to Vault, Overlay's
  own (Tauri) desktop surface **narrows to an operational console** — server status, validation
  reports, trajectories, eval reports, run launch, diagnostics. Observability and operations, not
  editing. The two apps then divide cleanly: **Vault authors the files; the Overlay console watches
  the system.**

This document records the direction; the precise retirement timing is sequenced in
[build-plan.md](build-plan.md) (Phases 1–2 and 5).
