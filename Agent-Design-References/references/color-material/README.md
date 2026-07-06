# Color And Material References

Use this folder for palette, surface material, border, shadow, focus, and accent-color references.

## What To Look For

- Primary background color.
- Raised surface color.
- Muted surface color.
- Accent color restraint.
- Border visibility.
- Focus ring color and strength.
- Status colors for success, warning, error, stale, active, draft, archived.

## Borrow / Avoid Notes

References (2026-07-06): `reference-radix-colors-semantic-status`,
`reference-material-design-surfaces-state` (owner-named influence; motion split to
`motion-interaction/reference-material-motion`).

Borrow:
- Radix: 12-step scale role model → give every semantic status a full set (subtle bg / border /
  solid / text), not one hex; semantic naming (active/warning/error/stale/info/draft + accent);
  built-in light/dark pairing with guaranteed contrast.
- Material 3: **state layers** (hover/focus/press/selected = fixed-alpha foreground overlays) for
  consistent interaction feedback; **color roles** (surface/surface-variant/outline/on-surface);
  **elevation as tonal surface** (shift tone + one hairline, not nested shadows → kills card-in-card).

Avoid:
- Radix's default palette or Material's bold saturated dynamic color / heavy filled buttons /
  ripples — borrow the *systems*, author values in our "Archive" oklch tokens; don't proliferate scales.

Implementation caution:
- Avoid one-note palettes dominated by a single hue family.
- Keep status colors semantic and reusable.
- Check contrast in both normal and translucent states.

