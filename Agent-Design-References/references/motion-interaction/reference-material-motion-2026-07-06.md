# Reference — Material Design 3 motion (easing, duration, transitions)

Image: (none — motion reference; see source for specs/curves)
Source: https://m3.material.io/styles/motion
Date added: 2026-07-06
Category: motion-interaction
Primary app target: **Both** — a shared, quiet motion system
Owner direction: part of the Material Design influence to lean on.

## Why This Reference Matters

Our motion caution is "quiet and purposeful, reduced-motion-safe, never delay repeated operator
workflows." Material 3 provides a specified, tokenizable motion system (standard vs. emphasized
easing, a small duration scale, enter/exit patterns) we can borrow the *values and discipline*
from — so transitions are consistent instead of per-component guesses, and always short.

## Borrow

- **A small duration scale** (short ~100–200ms, medium ~250–300ms) — pick 2–3 tokens, use them
  everywhere. Menus/popovers/hover use short; panel/drawer transitions use medium.
- **Standard vs. emphasized easing:** a standard ease for most UI; a slightly emphasized ease for
  larger, meaningful moves (drawer/panel). Two easing tokens, not many.
- **Enter/exit asymmetry done subtly:** quick, legible open; even quicker close.
- **Motion that aids orientation** (drawer slides from its edge; menu scales from its trigger).

## Avoid

- **Ripples, big springs, and expressive/decorative motion** — too loud for working tools.
- Motion that adds latency to repeated operator actions (Overlay) — keep everything ≤ ~200ms for
  frequent interactions.
- Animating large content regions on every navigation.

## Details To Translate Into Tokens

- `--motion-duration-short / -medium`; `--motion-ease-standard / -emphasized`.
- A **`prefers-reduced-motion`** path that drops to instant/opacity-only — required.
- Reuse across menu open, drawer/panel collapse, tab switch, hover/press state-layer fades.

## Relevant App Surfaces

- **Both:** menu/popover open, right-dock & sidebar collapse (ties to the responsive-collapse
  fix), tab switches, hover/press feedback (with Material state layers).
- **Cross-app:** the motion tokens in the shared component recipes.

## Implementation Notes

Pair with the state-layer note (`color-material/reference-material-design-surfaces-state`) — state
fades use `--motion-duration-short` + `--motion-ease-standard`. Keep the whole system to ~2 durations
+ ~2 easings so it stays coherent and quiet.
