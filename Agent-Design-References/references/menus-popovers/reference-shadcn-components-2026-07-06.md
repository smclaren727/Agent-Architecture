# Reference — shadcn/ui (component recipe baseline)

Image: reference-shadcn-2026-07-06.png (this folder) — captured 2026-07-06 (light).
Source: https://ui.shadcn.com
Date added: 2026-07-06
Category: menus-popovers (also color-material / component recipes)
Primary app target: **Both** — Vault and Overlay are already built on shadcn/ui

## Why This Reference Matters

Both apps are literally shadcn/ui (new-york) apps, so shadcn is not aspirational — it's the
**baseline component library we're already styling**. The landing showcase captures the exact
primitives we're re-skinning: buttons (default/secondary/outline), inputs, textarea, badges,
checkbox/radio/switch, alert dialog, button-group with a dropdown chevron, a bar chart, and form
cards. It's the reference for what "a clean, correct shadcn component set" looks like before we
layer the Archive identity + Material state-layers on top.

## Borrow

- The **canonical shadcn component anatomy** (sizing, radius, spacing, focus rings) as the
  structural baseline — we restyle tokens, not rebuild components.
- Button/badge variant model (default/secondary/outline/ghost) → map to our semantic + brand tokens.
- Form card composition (label → control → helper) → tighten for Vault's Properties + Overlay forms.
- Button-group + dropdown chevron pattern → feeds the menu/popover recipe.

## Avoid

- The default shadcn look is the exact "generic zinc/neutral" we're moving away from — borrow the
  **structure**, not the neutral palette (that's the whole point of the Archive theme).
- Don't adopt shadcn charts wholesale for Overlay; operator data wants denser tables first.

## Details To Translate Into Tokens

- Confirm our component recipes (button/badge/input/card) match shadcn's structure so upgrades
  stay clean; override only via CSS variables + the Material state-layer overlays.
- Radius/spacing already customized in `index.css` (radius 0.75rem, spacing 0.26rem) — keep
  consistent with shadcn's role names.

## Relevant App Surfaces

- **Both:** every shadcn primitive already in use — buttons, badges, inputs, selects, dialogs,
  dropdown menus, tabs, cards.
- **Cross-app:** the component-recipe layer of the token plan.

## Implementation Notes

Pair with Radix Colors (semantic scales) + Material 3 (state layers) + Raycast (menu structure).
For actual menu/popover UI, view `ui.shadcn.com/docs/components/dropdown-menu` — the landing image
here shows the broader component set rather than an open menu.
