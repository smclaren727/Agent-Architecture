# Reference — Obsidian (reading-room editor, right panels, properties)

Image: (none yet — curated from the product; capture on request)
Source: https://obsidian.md
Date added: 2026-07-06
Category: editor-reading
Primary app target: **Vault** (editor shell, Info dock, Properties, Graph)

## Why This Reference Matters

Obsidian is the closest real-world analog to Vault: a **markdown-first, plain-file** knowledge
tool with a left file tree, a reading/editing column, and a right panel (backlinks, outline,
properties, local graph). It's the reference for how to make Vault's four regions (rail · list ·
editor · info dock) coexist without crushing the editor — which the baseline flagged as too
crowded, with a broken narrow-viewport drawer behavior.

## Borrow

- **Collapsible side panels with a comfortable reading measure.** Left and right panels toggle
  independently; the center editor keeps a readable max-width. Fixes Vault's squeezed middle
  column and gives a real focus mode.
- **Properties panel treatment:** typed frontmatter rendered as a compact, quiet key/value list
  (not a giant airy form). A tighter model for Vault's strong-but-airy Properties editor.
- **Right-panel tabs** (Backlinks / Outline / Graph) that are dense and calm — maps directly to
  Vault's Info dock sections.
- **Single-drawer discipline on narrow widths** (one panel overlays at a time), the opposite of
  Vault's current both-drawers-open bug.
- **Reading vs. edit** as a first-class toggle (we already have EDIT/READ — keep, make quieter).

## Avoid

- Obsidian's default theme is generic/dark and plugin-driven inconsistency; we keep the curated
  "Archive" identity and one coherent surface system.
- Its settings/plugin density is overwhelming — Vault should stay opinionated and minimal.
- Don't copy its slightly heavy borders everywhere; use hairline dividers.

## Details To Translate Into Tokens

- Surfaces: one `panel` level for side regions; editor column on `app-bg` with a max-width token.
- Spacing/density: a **reading-room density** (looser than Overlay) — Vault's variant of the
  shared density scale.
- Borders: hairline dividers between regions instead of nested card borders.
- Typography: keep Newsreader for reading; ensure comfortable line-length/measure token.
- Layout: define **panel-collapse** + **single-drawer narrow** behavior in the shared shell.

## Relevant App Surfaces

- **Vault:** app shell (rail/list/editor/dock), Info dock tabs, Properties, Graph, narrow view.
- **Overlay:** the collapse/single-drawer discipline applies to its sidebar too.
- **Cross-app:** feeds the **shell recipe + responsive-collapse** item in the Phase-1 shortlist.

## Implementation Notes

Anchor reference for **Vault's editor shell + the responsive-collapse fix**. Pair with the shared
shell-grid recipe so both apps get one collapse discipline (Overlay sidebar, Vault side panels).
