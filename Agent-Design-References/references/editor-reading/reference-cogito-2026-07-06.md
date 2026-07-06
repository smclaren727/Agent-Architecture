# Reference — Cogito (shipped markdown+AI editor; closest analog to Vault)

Image: reference-cogito-editor-chat / -inspector / -permission-menu / -runtime-menu (this folder)
Source: Cogito.app (native macOS app, bundle `com.cogito.app`) — owner uses it daily; the very
  plan for THIS project was drafted in it.
Date added: 2026-07-06
Category: editor-reading (also strongly informs chat-composer + menus-popovers)
Primary app target: **Vault** (near 1:1 architecture) — patterns also cross to Overlay chrome

## Why This Reference Matters

Cogito is effectively a **shipped, more-polished sibling of Agent-Vault**: a markdown-first,
plain-file knowledge editor with a left file tree, a center editor, and a right dock that toggles
between an **AI chat** and an **Inspector** — the same architecture Vault has. It even exposes the
same concepts (multiple agent runtimes, a graduated permission model, an AI note summary/stats/
outline panel). It is the single most directly transferable reference we have: not aspirational
cross-domain inspiration, but "here is our exact layout, done well." This makes it the anchor for
Vault's Phase-1/Phase-2 editor + chat work.

## What was observed (placement / density / toggles)

- **Three-pane shell:** left sidebar (vault tree: folders + notes with right-aligned relative
  dates e.g. "Apr 30", "3h"), center editor, right dock. Clean View-menu toggles:
  **Hide Sidebar · Hide AI Sidebar · Show Inspector · Show Preview** — exactly Vault's panels,
  named as first-class commands.
- **AI chat dock:** runtime selector **"Claude Code ⌄"** in the *panel header* (not stacked above
  the composer); a context/session selector **"Agent UI UX ⌄"** + **＋** (new chat) top-right;
  empty transcript; composer is a single rounded container with the input
  ("Ask about this note, or ask for edits…") and, inline in its footer, **"Default ⌄"** (profile,
  left) + **"Read Only ⌄"** (permission, right) + a circular send arrow.
- **Runtime menu:** ✓ Claude Code · Codex · Gemini (checkmark on active).
- **Permission menu (graduated, with icons):** ✕ Read Only · ⊘ Allow Edits · 🛡 Full Access.
- **Inspector panel:** SUMMARY (AI-written) · STATS ("332 words · 2,355 chars · ~2 min read") ·
  OUTLINE (collapsible, "No headings yet") · RELATED (on-device embeddings via an optional
  "Install qmd" component). Small-caps section labels, hairline dividers, generous but calm.
- **Focus mode:** closing the right dock gives a full-width editor with a compact top-right icon
  toolbar (preview / outline / link / AI / panel-toggle). Density is comfortable, not airy.
- **Theme:** light (appears to follow system appearance; no in-app theme toggle in the View menu).

## Borrow

- **Composer-first chat with inline controls** → the fix for Vault's cramped Chat dock: runtime
  in the panel header; profile + permission inline in the composer footer; one rounded composer
  container. (Directly validates our `chat-composer/reference-claude-cursor-composer` note.)
- **Graduated permission ladder** (Read Only → Allow Edits → Full Access) with icons — richer and
  clearer than Vault's two-state Read-only/Suggest-edits, and it maps onto our governance model.
- **Runtime menu** (Claude Code/Codex/Gemini + checkmark) — the compact pattern for Vault's
  runtime selector (Direct/API, claude-code, codex).
- **Inspector = polished Info dock:** small-caps section labels, Summary/Stats/Outline/Related,
  hairline dividers. Tighter and quieter than Vault's current airy Info tab.
- **First-class panel toggles** (Hide Sidebar / Hide AI Sidebar / Show Inspector) — supports the
  region-collapse discipline Vault needs (and its broken narrow-viewport behavior).
- **Right-aligned relative dates** in the file list — a clean list-row metadata pattern.

## Avoid

- It's a single-vault personal editor: **no operator/console surfaces** — nothing here informs
  Overlay's dense automations/status needs (use Linear/Vercel for that).
- Light-only / system-appearance; we still need a deliberate dark treatment.
- Keep our "Archive" identity (paper/teal/brass + Newsreader) — Cogito is a cooler, plainer
  system-neutral look; borrow the *structure/ergonomics*, not the palette.
- No glass/translucency to borrow here (that's Liquid Glass's job).

## Details To Translate Into Tokens

- Layout: panel-header slot for runtime; composer footer slot for profile+permission; one rounded
  `--composer` container; first-class panel-collapse states.
- Density: adopt Cogito's comfortable-not-airy rhythm for Vault's reading-room density tier.
- Menus: icon+label rows + checkmark for selected (feeds the shared menu recipe).
- Info dock: small-caps section labels + hairline dividers as the Info/Inspector recipe.

## Relevant App Surfaces

- **Vault:** the whole editor shell, right-dock **Chat** (composer + runtime/profile/permission),
  **Info** dock, panel toggles, file-list rows. This is Vault's closest role model.
- **Cross-app:** the menu/permission/runtime recipes are shared; the composer recipe is Vault's.

## Images (filed 2026-07-06)

Captured live via computer-use to set state, then `screencapture -l<windowid>` (window-id capture
renders just Cogito's window, clean, regardless of overlap). Filed in this folder:
- `reference-cogito-editor-chat-2026-07-06.png` — editor + AI chat dock (composer + inline
  Default/Read-Only controls, Claude Code runtime in the panel header)
- `reference-cogito-permission-menu-2026-07-06.png` — Read Only / Allow Edits / Full Access ladder
- `reference-cogito-runtime-menu-2026-07-06.png` — Claude Code ✓ / Codex / Gemini
- `reference-cogito-inspector-2026-07-06.png` — Summary / Stats / Outline / Related

## Implementation Notes

Treat Cogito as the **primary role model for Vault's editor + Chat** in Phase 2, paired with
Obsidian (reading-room/panels) and the Claude/Cursor composer note. It de-risks the Chat redesign:
the target ergonomics already exist in an app the owner uses. Nothing here changes the governance
rules (no auto-send, no draft clobber, explicit apply) — Cogito's permission ladder is a UI model
for them, not a license to relax them.
