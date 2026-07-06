# Vault — Current UI Observations

App: Agent-Vault
Captured: 2026-07-06
Viewport: 1440×900 (desktop normal), Chrome
Build: served by prebuilt `agent-vault-server` on `127.0.0.1:4173`, real `vault/` data
Theme in captures: light (primary) + one dark parity shot

Captures in this folder:
- `vault-notes-light-*` — Notes lens, empty editor (note picker)
- `vault-note-editor-light-*` — daily note open, structured Properties form
- `vault-editor-infopanel-light-*` — full 4-region layout with right Info dock
- `vault-chat-empty-light-*` — right dock Chat tab, empty state
- `vault-conventions-light-*` — Conventions findings (healthy/empty)
- `vault-editor-chat-dark-*` — dark parity, editor + Chat dock

## Important reframing of the premise

The apps are **not** the default zinc/Inter shadcn look. There is a deliberate, documented
theme — "Archive" (`web/THEME.md`): warm paper, deep pine-teal ink, brass accent, three
self-hosted variable typefaces (Hanken Grotesk / Newsreader / JetBrains Mono), oklch tokens,
custom soft shadows. So "bland" is not "no theme applied." The real problems are **layout
architecture, density, and consistency**, not the absence of a palette.

## What feels good

- The color identity itself is tasteful and distinctive; brass badges + teal active state read
  as a real product, not a template.
- Newsreader serif on view titles ("Notes", "Conventions") gives an editorial, archival feel
  that suits a markdown-first tool.
- The structured Properties (frontmatter) editor is genuinely strong: clear labeled 3-column
  grid, typed controls (selects, date/time pickers, checkboxes), and a PROPERTIES / SOURCE
  toggle so raw YAML stays inspectable. This is the most "designed" surface in the app.
- The right Info dock is well-organized (Summary, Entities, Outline, Stats, Graph mini-map,
  Backlinks, Links) and its `/api`-backed actions are clearly labeled.
- Dark mode is clean and more premium-feeling than light.

## What feels rough

- **Header layout bug (highest priority).** The `VAULT` selector + "Add vault…" + panel/theme
  toggles float in a detached block pinned top-right, disconnected from the "Agent Vault"
  wordmark, with a stray horizontal rule beneath. It reads as absolutely-positioned / not part
  of a real top-bar grid. Visible in every capture; glaring in dark mode. → **architecture**
- **Four vertical regions at once** (icon rail · notes list · editor · info dock) crowd the
  actual editor into a narrow middle column. No obvious way to collapse regions for a focused
  writing width. → **density / spacing**
- **Cards inside cards.** Content panes stack a note-header card + a Properties card + form
  cards on a paper background; the Notes lens stacks a date-picker card above an empty-state
  card. Exactly the anti-pattern the references warn against. → **density**
- **Enormous vertical whitespace.** Big top band, large gaps between label and control; the
  page reads like a landing page, not a working editor. Real notes will require a lot of
  scrolling. → **spacing / density**
- **Redundant titling.** The notes list header says "Notes" and the page H1 also says "Notes";
  the daily-note date picker bar stays pinned above an already-open note, wasting height.
- **Icon-only left rail with no labels.** 12 destinations as bare icons; discoverability and
  recall suffer (which is which?). Tooltips exist but there's no persistent labeling option.
  → **menus / navigation**
- **Composer is cramped.** The Chat composer is a short field at the very bottom; the four
  stacked full-width selectors (runtime / profile / context / permission) eat most of the dock
  height before any message area. Long prompts (a stated use case) have little room.
  → **chat-composer**
- **Status color applied unevenly.** Conventions differentiates error(red)/warning(brass)/
  info(gray) well — but "error 0" shouts red at a zero count. Elsewhere counts use flat brass
  pills regardless of meaning. Semantics need to key off value, not just category. → **color**
- **Empty states are bare text.** "Select a note to view and edit it.", "No findings. Vault
  conventions look healthy." — no intentional empty-state treatment. → **empty/error state**

## Likely polish targets (ranked)

1. Rebuild the top-bar as one real grid (fix the detached VAULT cluster). **architecture**
2. Tighten density: reduce paper→card→card nesting to flat panels; cut vertical padding.
3. Region management: let the info dock and/or notes list collapse to give the editor width.
4. Composer: taller message area, compact/inline the runtime+permission selectors.
5. Semantic status: value-aware badge colors (0 errors ≠ red).
6. Left rail: add labels or a labeled expanded mode.

## Implementation risk

- Header fix touches the shell layout container shared by every view — verify all lenses and
  the narrow/Tauri webview after changing it.
- Density changes must not break the CodeMirror editor, the reactflow graph mini-map, or the
  structured Properties grid.
- Chat composer changes must preserve governance: prefill never auto-sends, drafts never
  clobbered, "Suggest edits" stays explicit (per references + slice-4 validation).

---

## Wave 2 (additional states, 2026-07-06)

Added captures:
- `vault-tasks-light-*` — Tasks GTD tabs (Inbox/Today/…/Completed), filters, "No tasks."
- `vault-graph-light-*` — Graph canvas, "No relationships yet" empty state
- `vault-newnote-menu-light-*` — "New note" dropdown open (menu treatment)
- `vault-notes-narrow-light-*` — **760px narrow viewport** (responsive)

### New findings

- **Narrow/responsive is broken (high priority).** At ~760px the left Notes panel and the right
  Info/Chat panel both become overlay drawers — and *both open at once*, each with its own ✕,
  burying the editor behind a dimmed sliver you can't use. The header VAULT cluster breaks
  further (overlaps, "Add vault" pokes out). There is no single-drawer / responsive-collapse
  discipline. → **architecture / responsive** (matters: these ship as Tauri webviews).
- **Menus feel plain (confirms the reference-category concern).** The "New note" menu is a bare
  white panel of 14 type rows — no icons, no separators (e.g. "Blank note" isn't divided from
  the typed list), no grouping, no selected/checkmark affordance, very tall rows (it nearly
  fills the viewport). Functional but undesigned. → **menus / popovers**
- **Vault's managed data is sparse.** Tasks, Graph, and the note list are near-empty (one daily
  note + templates). Good for auditing *empty states* (all are bare one-line text with no
  intentional treatment) but means Vault can't demonstrate real list/table density right now —
  seed data or use TestVault if we need to test dense layouts.
- **Tasks view** has a good bones: segmented GTD tabs + text filter + status/priority selects +
  "MORE FILTERS". The chrome is right; it just inherits the same airy spacing.
