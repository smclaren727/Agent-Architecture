# Menus And Popovers References

Use this folder for dropdowns, context menus, command menus, popovers, segmented controls, and small overlays.

## What To Look For

- Trigger placement.
- Menu width and density.
- Icon use.
- Checkmark/current-selection treatment.
- Separators and grouping.
- Keyboard focus treatment.
- Disabled and destructive items.

## Borrow / Avoid Notes

Reference (2026-07-06): `reference-raycast-glass-menus`.

Borrow:
- Menu row anatomy: leading icon · label · trailing shortcut/metadata; compact rows; section
  separators; a clear selected/focused row (all missing from Vault's current "New note" menu).
- Glass surface (one blur/alpha level) reserved for the overlay only, with hairline border +
  soft shadow and an opaque `@supports` fallback for webviews.
- Command-palette (Cmd-K) pattern as an aspirational shared surface.

Avoid:
- Over-blur that hurts text contrast; dark/neutral hue (keep our warm palette — borrow structure).

Implementation caution:
- Menus should use familiar controls and icons when available.
- Keep labels short and direct.
- Do not hide critical state behind visual polish alone.

