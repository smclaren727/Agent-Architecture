# Motion And Interaction References

Use this folder for subtle interaction polish: hover, focus, disclosure, panel transitions, menu entry, and loading motion.

## What To Look For

- Motion duration.
- Easing.
- Whether motion helps orientation.
- Reduced-motion behavior.
- Loading and skeleton treatment.

## Borrow / Avoid Notes

References (2026-07-06): `reference-material-motion` (Material influence);
`reference-raycast-native-feel` (making a web UI feel like a native local app — very high
relevance; Raycast's stack ≈ our Tauri+React+Rust, same WKWebView on macOS).

Borrow:
- A small duration scale (short ~100–200ms, medium ~250–300ms) + two easings (standard,
  emphasized); motion that aids orientation (drawer from its edge, menu from its trigger).
- Native "web tells" to kill (cheap CSS): no `cursor: pointer` on controls, hover highlights only
  on list/menu rows (not buttons), `user-select: none` on chrome; plus native vibrancy over CSS
  blur, and no startup white-flash (theme window bg + show-on-ready). See the Raycast note.

Avoid:
- Ripples, big springs, expressive/decorative motion; any motion that adds latency to repeated
  operator actions. Always provide a `prefers-reduced-motion` instant/opacity-only path.

Implementation caution:
- Motion should be quiet and purposeful.
- Respect `prefers-reduced-motion`.
- Avoid animation that delays repeated operator workflows.

