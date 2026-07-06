# Reference — Raycast (glass menus, command palette, list rows)

Image: reference-raycast-2026-07-06.png (this folder) — captured 2026-07-06. NOTE: this is the
  marketing **hero** (dark, with Raycast's floating translucent nav bar — a decent glass-surface
  cue). The actual command palette / menu rows are below the fold and weren't scroll-capturable
  via the Safari method; the borrows below are curated from the product, not this image.
Source: https://raycast.com
Date added: 2026-07-06
Category: menus-popovers (also informs transparency-glass)
Primary app target: **Both** — Vault's plain "New note" menu + a future Cmd-K; Overlay actions

## Why This Reference Matters

Our baseline flagged menus as "undesigned" — Vault's "New note" dropdown is a bare, tall,
icon-less list with no separators or selection state. Raycast is the reference-grade example of
compact, glassy, keyboard-first menus and command surfaces: dense rows, leading icons, trailing
shortcut hints, section separators, and a clear selected row.

## Borrow

- **Menu row anatomy:** leading icon · label · trailing metadata/shortcut hint. Gives our note
  types (Agent, Person, Project…) recognizable icons instead of a flat text list.
- **Compact row height + section separators/labels** — group "Blank note" apart from the typed
  list; much tighter than our current near-full-viewport menu.
- **Clear selected/active row** (subtle filled highlight) and visible keyboard focus — our menus
  have neither today.
- **Glass surface for the overlay only:** translucent + blur for the floating menu/palette, with
  a hairline border and soft shadow — layering that reads as "above the page." (Matches the
  token plan: glass reserved for menus/popovers, not main panels.)
- **Command palette pattern** (fuzzy search + grouped results + actions) as an aspirational
  Cmd-K for both apps.

## Avoid

- Raycast is very dark/neutral; keep our warm palette. Apply the *structure*, not the hue.
- Don't over-blur — text must stay readable; provide an **opaque fallback** for webviews that
  render `backdrop-filter` inconsistently (Tauri caution already in the token plan).
- Don't make everything a palette; keep direct controls for primary actions.

## Details To Translate Into Tokens

- Surfaces: `--menu-bg` = glass (one glass alpha level) + `--menu-border` + `--menu-shadow`;
  opaque `@supports` fallback.
- Blur/transparency: a single `--blur-panel` value used only on menu/popover surfaces.
- Spacing/density: `--menu-row-h` compact; icon slot + shortcut slot tokens.
- Motion: fast fade/scale-in (~120ms), reduced-motion safe.
- Iconography: adopt lucide (already a dep) icons per note-type / action.

## Relevant App Surfaces

- **Vault:** "New note" menu, vault selector, note context menus, a future Cmd-K.
- **Overlay:** row actions (Accept/Reject, trigger lifecycle), a future command menu.
- **Cross-app:** the single **menu/popover recipe** in the Phase-1 shortlist.

## Implementation Notes

Anchor reference for the **menu/popover recipe**. Both apps are shadcn/Radix, so implement via
Radix Dropdown/Command primitives styled with these tokens — structure exists, styling is the gap.
