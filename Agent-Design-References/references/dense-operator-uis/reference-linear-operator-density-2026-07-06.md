# Reference — Linear (operator density & list hierarchy)

Image: reference-linear-dark-2026-07-06.png (this folder) — captured 2026-07-06; shows Linear's
  dark app UI: left nav (Inbox/My issues/Reviews/Pulse) + issue view with monospace `vehicle_state`
  + right metadata rail (In Progress · High · assignee · ENG-2703) + activity feed. The exact
  rows-over-cards / scan-column + right-metadata borrow.
Source: https://linear.app
Date added: 2026-07-06
Category: dense-operator-uis
Primary app target: **Overlay** (secondary: Vault list lenses — Tasks, Search, Proposals)

## Why This Reference Matters

Linear is the canonical example of "dense but calm." It shows a huge amount of operational
information (issues, states, assignees, priorities, cycles) as **rows on a flat surface**, not
cards, and it never feels noisy. This is exactly the correction our Overlay needs: today Overlay
renders one-metric cards on a paper background (landing-page density); Linear proves you can be
information-dense and still elegant.

## Borrow

- **Rows over cards.** A single list surface with thin dividers; each row is compact (~32–36px),
  scannable, with the primary label left and metadata right-aligned. No card wrapper per item.
- **Left-aligned scan column + right-aligned metadata.** The eye reads titles down the left edge;
  status/priority/time sit on the right rail. Directly fixes Overlay's loose key/value grids.
- **Quiet status via small colored glyphs**, not big filled pills — a small state dot/icon +
  short label. Color carries meaning at low visual weight.
- **Section headers are lightweight** (small caps / muted), not giant serif H1 + paragraph. One
  compact header per group.
- **Command menu (Cmd-K)** as the primary action surface — reduces chrome/buttons on the page.

## Avoid

- Linear's near-monochrome restraint can feel *too* cool/corporate; keep our warm "Archive"
  paper + brass identity rather than adopting Linear's gray.
- Its information density assumes power users; keep first-run labels/descriptions available
  (collapsible) so Overlay stays approachable.
- Don't import Linear's exact purple accent — we have brass + teal.

## Details To Translate Into Tokens

- Colors: small **state dots** using our semantic status set (healthy/warn/error/stale/info),
  not brass-for-everything.
- Surfaces: one flat `panel` level for lists; kill the per-row card. Reserve elevation for menus.
- Borders: hairline row dividers (`border-subtle`) instead of card borders.
- Typography: compact row text (sans) + right-aligned mono for IDs/timestamps.
- Spacing/density: define a **dense row height** token (~32–36px) for Overlay operator tables.
- Motion: near-instant row hover tint; no per-row entrance animation.

## Relevant App Surfaces

- **Overlay:** Automations trigger list, Canonical Files list, Trajectories runs list, Approvals.
- **Vault:** Tasks, Search results, Proposals list.
- **Cross-app:** the shared "dense-row / list" recipe called for in `cross-app/OBSERVATIONS.md`.

## Implementation Notes

This is the anchor reference for the **dense-row recipe** in Phase 1. Pair with Vercel/Geist
(status color) and the existing good in-app pattern (Canonical Files master/detail) rather than
redesigning from scratch.
