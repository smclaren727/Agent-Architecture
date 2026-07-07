# Vibrancy spike — architecture decision (2026-07-07)

Probe: both shells are Tauri 2.11.5 (locked), no `macos-private-api` feature, opaque
`backgroundColor` windows, `visible: false` + show-on-ready. The 2.11 config schema exposes
`windows[].transparent`, `windows[].windowEffects` (NSVisualEffectView materials incl.
`sidebar`, `hudWindow`, `underWindowBackground`, `windowBackground`), and `app.macOSPrivateApi`.

## Decision

- **API**: Tauri built-in `windowEffects` — no plugin, no extra crate, no Rust window code.
  Config: `windowEffects: { effects: ["underWindowBackground"], state: "followsWindowActiveState" }`
  + `transparent: true`; `backgroundColor` is REMOVED (incompatible with transparency; a
  transparent window cannot flash white, and show-on-ready stays).
- **Cargo**: `tauri` gains the `macos-private-api` feature in both shells +
  `app.macOSPrivateApi: true` — required for a transparent WKWebView on macOS. Local apps;
  no App Store distribution concern.
- **Parity**: identical mechanism in Vault and Overlay.
- **Fallback selection**: transparency in the web layer is opt-in via a
  `data-native-vibrancy` attribute on `<html>`, set only when running under Tauri on macOS
  (existing isTauri detection + platform check). Absent attribute (browser, non-macOS, effect
  failure) → today's opaque token backgrounds exactly. macOS "Reduce transparency" degrades
  NSVisualEffectView to an opaque system material natively — a second, OS-level fallback.
- **Contrast protection**: only the root/window backing goes transparent. Shell columns keep
  tokenized tinted backgrounds — main content near-opaque (~90% color-mix over the material),
  sidebar/ribbon lighter (~75%) so the material reads at the window edges. Status
  chips/cards/notices keep their existing opaque subtle backgrounds untouched. Both themes
  smoke-checked.
- **Flash test**: launch the rebuilt `.app` and capture a startup burst; first paint is the
  composited material (no opaque background exists to flash).
- **Browser isolation**: native changes are config-only; CSS changes are attribute-gated.
  Localhost/web builds never set the attribute → zero visual change, verified by the existing
  browser smoke and screenshot comparison.

Orchestration note: slices 2+3 land as one reviewed Vault change and 2+4 as one reviewed
Overlay change (the gated CSS is inert without the native flag); browser-safety is reviewed
first in each diff, and the real-bundle smoke gates the final report.
