# Slice 4 evidence — native macOS titlebar overlay (2026-07-08)

Vault commit: `4c585f4`.

## What shipped

- macOS `tauri.conf.json`: `titleBarStyle: "Overlay"`, `hiddenTitle: true`,
  `trafficLightPosition {x:16, y:20}` (centers the 12px lights in the 52px bar). Keys verified
  against the locked Tauri schema (Cargo.lock resolves tauri 2.11.5; keys are macOS-only, and the
  Windows/Linux config overlays replace the whole `app.windows` array, so non-mac is untouched by
  two independent guarantees).
- Web: `data-mac-titlebar` on `<html>` (same packaged-mac main-window gate as vibrancy, capture
  window excluded) reserves 52px height + 80px traffic-light safe area on the header, which carries
  `data-tauri-drag-region="deep"`. Verified in tauri 2.11.5's injected drag script that clickable
  descendants block dragging before the deep ancestor is consulted; every interactive header child
  is a native button, and the Radix menu/dialog subtrees portal out of the header DOM.
- **Critical adversarial catch:** `start_dragging` is an ACL-gated IPC call not included in
  `core:default` — without `core:window:allow-start-dragging` in the main-window capability the
  overlay window is immovable. Granted in `capabilities/default.json`.
- Browser fallback proven live (DevTools against the served dist): no `data-mac-titlebar`, no drag
  region, stock header padding. 216/216 web tests cover the gating.

## Packaged .app status

Built (`target/release/bundle/macos/Agent Vault.app`, includes the drag-permission repair), launched,
stays up, sidecar healthy on 4173. **Visual/interactive QA is pending operator eyes:** this session's
terminal context lacks Screen Recording + Accessibility TCC grants, so window screenshots and
scripted drag/double-click checks were impossible. Checklist for the operator pass:
light/dark titlebar blend, traffic-light alignment (y:20), drag from header, double-click-to-zoom,
reduce-transparency, startup flash, and picker-first Add Vault ("Choose folder…" primary) /
Open File ("Choose markdown file…" primary) from Slice 2.

## Known limitation

The 52px/80px reservation persists in native fullscreen although the traffic lights auto-hide
(documented in `index.css`); toggle-on-fullscreen-event is recorded backlog.

## Validation

cargo fmt/build/clippy PASS (workspace incl. src-tauri) · cargo test 285/285 · test:web 216/216 ·
web:build PASS · tauri build PASS (app + dmg bundles).
