# Transparency And Glass References

Use this folder for references involving translucent surfaces, blur, layered panels, and macOS-like materials.

## What To Look For

- How much background shows through.
- Whether text remains readable.
- Border treatment around translucent surfaces.
- Shadow strength and direction.
- How menus differ from main panels.
- Fallback appearance when blur is unavailable.

## Borrow / Avoid Notes

Reference (2026-07-06): `reference-apple-liquid-glass` (owner-named influence).

Borrow:
- Layered translucency to signal hierarchy; specular hairline edges; dynamic light/dark; chrome
  that recedes so content leads. Reserve glass for menus/popovers/dock — one or two levels only.

Avoid:
- Legibility loss over busy backgrounds (Liquid Glass's known weakness) — keep text on
  sufficiently opaque surfaces and honor a reduce-transparency fallback.
- Assuming native fidelity: we render in Tauri webviews, so this is "glass-inspired" via
  `backdrop-filter` + specular border, with a required opaque `@supports` fallback.

Implementation caution:
- Transparency should clarify layering, not reduce contrast.
- Use tokenized opacity and blur values instead of one-off classes.
- Provide opaque fallbacks for webviews that render blur inconsistently.

