# Reference — Radix Colors (semantic status scales & contrast)

Image: reference-radix-colors-scales-2026-07-06.png (this folder) — the step role model:
  Backgrounds (1–2) · Interactive components (3–5) · Borders & separators (6–8) · Solid (9–10) ·
  Accessible text (11–12), across the Gray/Mauve/Slate/… scales.
Source: https://www.radix-ui.com/colors
Date added: 2026-07-06
Category: color-material
Primary app target: **Both** (the shared semantic status token set)

## Why This Reference Matters

Our #1 cross-app problem is inconsistent, non-semantic status color (brass used for accent *and*
half the statuses; "0 errors" shown red; "available" competing with "daemon stale"). Radix Colors
is the reference for building **semantic, accessible color scales** — each hue is a 12-step scale
with defined roles (backgrounds → borders → solid → text) and guaranteed contrast, plus automatic
dark-mode pairing. It's the principled way to define our status tokens once and use them everywhere.

## Borrow

- **12-step scale role model:** steps 1–2 app/subtle bg, 3–5 component bg, 6–8 borders, 9–10
  solid (badge fill), 11 low-contrast text, 12 high-contrast text. Gives every status a *full*
  set (subtle bg + border + solid + text), not just one hex — so badges, tints, and text all
  stay consistent and legible.
- **Semantic naming over literal hue:** define `--status-active / warning / error / stale /
  info / draft` (+ our brand accent) and map each to a scale — value-aware, not category-flat.
- **Built-in light/dark pairing** with preserved contrast — matches our oklch light/dark goal.
- **Contrast guarantees** (step 11/12 on step 2/3) — satisfies the accessibility + "readable in
  translucent surfaces" acceptance criteria.

## Avoid

- Don't adopt Radix's default palette wholesale — we keep the "Archive" identity (paper, pine
  teal, brass). Borrow the *system/roles*, author values in our oklch tokens.
- Don't proliferate scales; a small fixed set of semantic statuses + brand accent only.

## Details To Translate Into Tokens

- Colors: author each semantic status as a small role set —
  `--status-error: { subtle-bg, border, solid, text }`, etc. — in `web/src/index.css` for both
  repos (duplicated per the locked no-shared-package decision, but from one written spec here).
- Surfaces/borders: use the same role model for `surface-*` and `border-*` so translucent menus
  keep contrast.
- Verify contrast in **both normal and glass** states (token-plan caution).

## Relevant App Surfaces

- **Overlay:** Dashboard status pills, Automations Runner states, Agent Runtimes badges,
  Trajectories outcomes, Diagnostics.
- **Vault:** Conventions severity (neutralize "0 errors"), note status, Chat availability.
- **Cross-app:** the single **semantic status set** — top item in the Phase-1 shortlist.

## Implementation Notes

Pair with Vercel/Geist (target status treatment) and Overlay's existing Agent Runtimes badges
(proof the app can already do it). This reference governs *how* the status tokens are structured;
those two govern *what they look like applied*. This is the concrete input for the token plan's
Status Tokens section.
