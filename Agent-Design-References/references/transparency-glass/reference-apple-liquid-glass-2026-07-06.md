# Reference — Apple Liquid Glass (translucent layered material)

Image: (none yet — curated from Apple's HIG/WWDC 2025 material; capture on request)
Source: https://developer.apple.com/design/human-interface-guidelines/materials
  · WWDC 2025 "Liquid Glass" (iOS 26 / iPadOS 26 / macOS Tahoe 26)
Date added: 2026-07-06
Category: transparency-glass
Primary app target: **Both** — menus, popovers, right dock, side panels, overlays
Owner direction: a named influence to lean on for this campaign.

## Why This Reference Matters

Liquid Glass is Apple's 2025 system material: translucent surfaces that sample, blur, and lightly
refract what's behind them, with specular edge highlights, floating layered chrome, and dynamic
light/dark adaptation. It's the reference-grade version of the "glass" our token plan already
calls for (glass menus/docks with blur + border + opaque fallback). It's the aspirational look for
our overlay surfaces — **applied with discipline**, because its known weakness (contrast/legibility)
is exactly the trap our acceptance criteria warn against.

## Borrow

- **Layered translucency to signal hierarchy:** overlay chrome (menus, popovers, docks) floats
  *above* content on a blurred, lightly tinted glass surface — clarifies what's on top.
- **Specular hairline edges:** a subtle light border/inner-highlight on glass surfaces reads as a
  real material edge (cheap to approximate with a 1px light-on-dark border + faint inset highlight).
- **Dynamic light/dark:** the material re-tints per theme — matches our oklch light/dark tokens.
- **Restraint of chrome:** glass lets navigation/controls recede so content leads — good for
  Vault's editor and Overlay's data.
- **One or two glass levels, not many** (Apple uses a small, consistent material set).

## Avoid

- **Legibility loss.** Liquid Glass drew real criticism for text-over-busy-background contrast;
  Apple added mitigations (Reduce Transparency, more-opaque variants). We must keep text on
  sufficiently opaque surfaces and honor a reduce-transparency fallback.
- **Over-blur / heavy refraction as decoration** — our tools are working surfaces, not showcases.
- **Assuming native fidelity:** we render in **Tauri webviews**; real-time refraction/lensing is
  not achievable. We approximate with `backdrop-filter: blur()` + tint + specular border, and
  **must ship an opaque `@supports` fallback** (webview blur is inconsistent). Set expectations:
  "glass-inspired," not pixel-Liquid-Glass.

## Details To Translate Into Tokens

- Surfaces: `--surface-glass` + a single `--surface-glass-alpha` (maybe one denser variant for
  text-heavy overlays); reserve glass for **menus/popovers/dock**, not main panels.
- Blur/transparency: one `--blur-panel` value; specular `--glass-border` (light, low-alpha) +
  optional faint inset highlight.
- Fallback: opaque `background: hsl(var(--surface-raised))` when `backdrop-filter` unsupported or
  when a reduce-transparency preference is set.
- Motion: gentle material settle on open (≤150ms), reduced-motion safe.

## Relevant App Surfaces

- **Both:** menu/popover surface, command palette, right dock, side panels, confirmation overlays.
- **Cross-app:** the glass half of the shared menu/popover + dock recipe.

## Implementation Notes

Pair with Raycast (`menus-popovers/`) for menu structure and with Material Design's state layers
(`color-material/`) for interaction feedback on glass. Aesthetic split for the direction: **Liquid
Glass governs overlay/dock *materials*; Material governs *state/elevation/motion* logic.**
Legibility + opaque fallback are non-negotiable (acceptance criteria + webview reality).

**Native vibrancy is the most promising way to do this in Tauri — but treat it as a SPIKE** (see
`../motion-interaction/reference-raycast-native-feel`): Raycast 2.0 uses Apple's Liquid Glass via
`NSVisualEffectView` behind its WKWebView — and Tauri on macOS is *also* WKWebView, so we *may* get
authentic material via native window vibrancy (e.g. the `window-vibrancy` crate) instead of faking
it with `backdrop-filter`. Caveats are real (transparent webview root, macOS-version behavior,
redraw glitches under the web compositor), so **prove it on the real Tauri path before anything
depends on it.** Preferred *if it lands*: native vibrancy for window/sidebar; CSS `backdrop-filter`
+ opaque `@supports` fallback for menus/popovers. **Fallback if it doesn't:** opaque flat
window/sidebar + CSS glass for menus — no loss. The spike belongs in the Phase-1 shell slice; the
*outcome* is not guaranteed.
