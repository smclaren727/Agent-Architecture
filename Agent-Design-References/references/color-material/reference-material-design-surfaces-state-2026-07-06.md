# Reference — Material Design 3 (surfaces, elevation, state layers, color roles)

Image: (none yet — curated from Material 3 docs; capture on request)
Source: https://m3.material.io (Color roles, Elevation, States, Motion)
Date added: 2026-07-06
Category: color-material (motion split into `motion-interaction/reference-material-motion`)
Primary app target: **Both** — interaction states, elevation logic, color-role structure
Owner direction: a named influence to lean on for this campaign.

## Why This Reference Matters

Material 3 (Material You) is a rigorously specified system for the exact things our apps apply
inconsistently: **color roles**, **elevation as tonal surface** (not just shadow), and **state
layers** (hover/focus/press as translucent overlays). Our baseline found interaction states are
weak/inconsistent (menus lack hover/selected states; cards all read at one weight). Material gives
a principled, tokenizable model to fix that — used *for structure*, not for its bold hue.

## Borrow

- **State layers (highest-value borrow):** hover/focus/pressed/selected = a translucent overlay
  of the foreground color at fixed opacities (~8% / 10% / 10% / 12%) on top of any surface. One
  consistent interaction-feedback system for buttons, menu rows, list rows, tabs — exactly what
  our plain menus and flat rows need.
- **Color roles:** `primary / on-primary / surface / surface-variant / outline` etc. — a
  role-based structure that complements Radix's scales and our semantic status set. Maps cleanly
  onto our `surface-*` / `border-*` / `on-*` tokens.
- **Elevation as tonal surface:** raise a surface by shifting its tone (subtle), not by stacking
  shadows — helps kill our "cards inside cards" by giving hierarchy through tone + one hairline
  instead of nested borders/shadows.
- **Shape + density scale:** consistent radius roles and comfortable/compact density options —
  supports our two-speed density (Vault reading-room vs. Overlay operator).

## Avoid

- **Material's bold, saturated dynamic color / heavy filled buttons** — off-brand for the calm
  "Archive" identity. Borrow the *systems* (state layers, roles, tonal elevation), author values
  in our oklch tokens.
- **Big ripple animations** and pronounced FABs — too loud for working tools; keep feedback quiet.
- Don't adopt Material iconography over lucide (already our dep).

## Details To Translate Into Tokens

- State layers: `--state-hover / --state-focus / --state-press / --state-selected` as
  foreground-color overlays at fixed alphas; apply via a shared `interactive` recipe.
- Color roles: align `surface / surface-variant / outline / on-surface` naming with our existing
  semantic tokens so both apps share one vocabulary.
- Elevation: prefer tonal surface steps + one hairline border over multiple shadows.
- Radius/density: radius roles (we already have `--radius`); a compact vs. comfortable density flag.

## Relevant App Surfaces

- **Both:** every interactive element — menu rows, list/table rows, tabs, buttons, toggles,
  segmented controls; the elevation/surface system that flattens card-in-card.
- **Cross-app:** the interaction-state + elevation half of the shell/component recipes.

## Implementation Notes

Complements — doesn't compete with — Liquid Glass: **Material governs state/elevation/color-role
logic; Liquid Glass governs overlay/dock materials.** Pair state layers with Radix status scales
and the Raycast menu structure. See `motion-interaction/reference-material-motion` for the motion half.
