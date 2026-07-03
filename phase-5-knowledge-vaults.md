# Phase 5 (#5) — Knowledge vaults + generalized retrieval

> **History (2026-07-02).** Completed pre-Rust-migration phase record. The feature (world-knowledge +
> multi-vault retrieval) still holds — proven by `acceptance/world-knowledge-loop.mjs` — but the code
> paths and build/test commands below predate the [Rust migration](rust-migration.md)
> (`packages/core` → the `overlay-core` crate; `pnpm`/`node --test` → `cargo`). Read the below as history.

**✅ STATUS (2026-06-27): COMPLETE.** 5.1 (Overlay world-knowledge index/retrieval), 5.2 (Vault
multi-vault editor — data layer, optional-overlay, switcher UI), and 5.3 (integration + acceptance) all
landed and verified; see the per-slice ✅ markers below. Overlay serves arbitrary markdown folders as
world-knowledge through the single lens distinct from doctrine; Vault is a standalone multi-vault editor
that opens loose knowledge vaults; the doctrine/world-knowledge boundary is enforced and proven by
`acceptance/world-knowledge-loop.mjs`.

The last big stream. Vault opens *multiple* knowledge vaults / arbitrary `.md` folders beyond the
overlay corpus, and Overlay generalizes its index to serve that content as **world-knowledge** through
the **single agent lens** — kept distinct from doctrine. The Phase 5.0 view-seam (Agent-Vault) is the
prerequisite and is done.

## Grounding (current state)

- Overlay's search index is **doctrine-scoped**: `WorkspaceSearchKind` =
  `memory-section | memory-fact | workflow | skill | prompt | standard`
  (`Agent-Overlay/packages/core/src/search/index.ts`); the MCP `search-overlay` tool searches "overlay
  doctrine".
- There is **no world-knowledge content class yet** — only the boundary in
  `Agent-Overlay/docs/agent-collaboration-conventions.md` ("Corpus Boundary": doctrine governs,
  world-knowledge informs; world-knowledge may be indexed + cited but must not silently become doctrine).
- Agent-Vault is single-corpus today, now with a React view-module seam (new views are cheap).

## Core concept

A **knowledge vault** = an arbitrary folder of markdown that (a) Vault opens/edits **loosely** (no
doctrine schema), and (b) Overlay **indexes + serves as world-knowledge** via MCP, distinct from
doctrine. Overlay indexes the folder **directly** (this supersedes the held Agent-Vault HTTP-bridge plan).

## Decisions (locked from the architecture)

- **World-knowledge is a distinct content class** — indexed, searchable, citable, but **never
  auto-promoted to doctrine** (policy/workflow/skill/standard/trigger/memory) without human review;
  promotion goes through the existing propose-don't-write path.
- **Overlay indexes knowledge-vault folders directly** (config declares the paths). No HTTP bridge.
- **Knowledge vaults are loose** (any `.md`, no schema); the **doctrine corpus stays schema-validated**.
- **Single agent lens** — agents retrieve doctrine + world-knowledge through one MCP search surface, with
  world-knowledge **labeled distinctly**.

## Fixed boundary / guardrail

World-knowledge **informs**, doesn't **govern**. It is served labeled-distinct from doctrine and **never
silently becomes** policy/workflow/skill/standard/trigger/memory — promotion is a human-reviewed propose
step. Indexing is deterministic (no LLM). No runtime "act on world-knowledge" behavior (retrieval only).

## Decomposition (sequential; small commits; verify each)

### 5.1 — Overlay: world-knowledge index + retrieval (the foundation; lands first) — ✅ DONE (Agent-Overlay `a8be490`)
- **Config:** overlay config declares knowledge-vault folder paths (e.g. `knowledge_vaults: [path,...]`) —
  schema + loader + validation.
- **Index (deterministic, no LLM):** ingest those folders as a new `world-knowledge`
  `WorkspaceSearchKind` — plain markdown, chunked, no doctrine schema (loose). Doctrine kinds unchanged;
  reuse the existing chunking/search machinery.
- **Serve via MCP:** extend `search-overlay` (and/or add `search-knowledge`) so agents retrieve
  world-knowledge, results **labeled `world-knowledge`**, distinct from doctrine kinds; kind-filtering
  works. (A world-knowledge MCP resource class is optional.)
- **Enforce the boundary:** world-knowledge is retrieval-only; no path writes it into doctrine; document
  that promotion goes through the propose flow.
- It's the contract Vault (5.2) + agents consume.

### 5.2 — Vault: multi-vault editor (after 5.1's contract is set) — ✅ DONE (Agent-Vault `76ed58c` data layer, `f4e24ad` overlay-optional, `20a7841` switcher UI)
- Open *multiple* knowledge vaults / arbitrary `.md` folders beyond the single overlay corpus — a vault
  switcher / multi-root model — as new views in the React seam, alongside the doctrine corpus.
- **Loose handling** for non-conforming markdown (world-knowledge vaults aren't schema-validated like the
  doctrine corpus). The doctrine corpus keeps its validation path.

**Decisions (resolved with human, 2026-06-26):**
- **Vault stands alone.** Agent-Vault is the base and must work with no Overlay; Overlay is an *optional
  plug-in* to Vault (doctrine + world-knowledge), the way Runner plugs into Overlay. Dependency arrows:
  Vault alone → Overlay adds to Vault → Runner adds to Overlay.
- **Vault owns the vault list (Vault-managed registry).** Vault does **not** read Overlay's
  `knowledge_vaults` as its source of truth (that would make Vault depend on Overlay). Overlay's
  `knowledge_vaults` stays Overlay's own config; 5.3 coordinates the two at the **folder level** (point
  Overlay at a folder Vault manages → edit in Vault → Overlay re-indexes), not by one reading the other.
- **UX model: switcher + "All vaults"** — a shell picker scopes views to one vault or spans all, each row
  tagged by vault.
- **Loose vs. validated is per-vault and Vault-core:** a vault can follow Vault's PKM schema (rich
  task/project views) or be loose arbitrary `.md` (Notes/Search/Graph still work). Both live in the switcher.
- **The overlay corpus becomes an optional connected source in 5.2** (not a required root). The
  Proposals/Trajectories/Capture surfaces are the Overlay-integration views — present only when an overlay
  workspace is connected; absent in standalone Vault. Default config still connects it (acceptance stays green).
- **Registry persistence:** a Vault-owned config-file list with add-by-path for the first pass; a nicer
  in-app folder-picker is later polish.

Slicing: **5.2.1** server data layer (Vault-owned registry + multi-root loose indexing + vault dimension +
scoping API; backward-compatible defaults) → **5.2.2** overlay corpus optional (graceful absence) →
**5.2.3** switcher + "All vaults" UI on the React seam.

### 5.3 — Integration + acceptance — ✅ DONE (Agent-Vault `377bb61` vault-scoped write API; Agent-Overlay `8eb304d` CLI --kind fix; Agent-Architecture `acceptance/world-knowledge-loop.mjs`)
- An agent retrieves world-knowledge through the single lens (distinct from doctrine); Vault edits a
  knowledge vault; Overlay re-indexes it; the boundary holds (world-knowledge can't silently become
  doctrine). Extend the cross-repo acceptance harness.
- Realized by: a vault-scoped raw markdown read/write API in Vault (`GET/PUT /api/vaults/:id/files/...`,
  loose-only writes) and a black-box `acceptance/world-knowledge-loop.mjs` proving all five points
  (served / distinct-from-doctrine / Vault-edit / Overlay-re-read / boundary-holds). Surfaced + fixed a
  dead `--kind` flag in Overlay's search CLI (the world-knowledge lens was unreachable via the CLI).
- **Follow-up — ✅ done (Agent-Vault `1185587`):** the in-browser editor now edits loose-vault notes
  (a `LooseNoteEditor` over the `/api/vaults/:id/files` API; NotesView routes loose ids to it), with
  Playwright coverage of the open → edit → save → persisted round-trip.

## Verification per slice

- Overlay: `pnpm build`, `pnpm typecheck`, targeted + full tests (isolated HOME), `overlay validate
  --strict` on the template, `pnpm docs:check`, core public-API snapshot updated if exports change,
  CHANGELOG entry.
- Vault: `web` build, `node --test`, the React Playwright smoke.
- Always: the cross-repo acceptance harness
  (`Agent-Architecture/acceptance/capture-triage-loop.mjs`) stays green.

## Pause for a human decision when

- A slice would weaken the doctrine/world-knowledge boundary (e.g. any path that lets world-knowledge
  become doctrine without human review) — flag it.
- A subjective design fork arises (e.g. the multi-vault UX model, or the world-knowledge ranking/merge
  with doctrine in one result set).

## Done when

Overlay serves an arbitrary markdown folder as world-knowledge through the single MCP lens (distinct from
doctrine); Vault opens + edits multiple knowledge vaults loosely; an agent retrieves world-knowledge and
the doctrine/world-knowledge boundary is enforced and explainable.
