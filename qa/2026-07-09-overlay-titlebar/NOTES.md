# Overlay native titlebar — packaged-app QA (2026-07-09)

Bundle: `Agent Overlay Console.app` built from working tree at the titlebar slice
(web dist `index-D4GBXhwd.js`, verified served by the launched app on 127.0.0.1:4180).
Host: macOS (Darwin 25.5.0), Apple Silicon; Screen Recording + Accessibility TCC granted,
so the full automated pass ran (Quartz-synthesized mouse events + `screencapture -l`).

## Evidence

- `01-light-1280.png` — launch state (system dark theme): traffic lights inside the 64px
  header, vertically centered, brand block clear of the 80px safe area.
- `02-theme-toggled-1280.png` — theme toggle clicked through the deep drag region → light
  theme; chrome blends in both themes.
- `03-light-1920-zoomed.png` + `03b-1920-topleft-crop.png` — after header double-click
  zoom (window maximized): at >110rem the inner bar centers; lights sit in the header
  band's outer margin, no overlap.
- `04-light-{1440,1024,760}.png` — AX-resized widths; no overlapping text/controls, no
  horizontal overflow; at 760 the hamburger renders right of the lights.
- `05-drawer-760.png` — hamburger clicked → nav drawer + scrim open (interactive children
  unaffected by the drag region).
- `06-fullscreen.png` + `06b-fullscreen-topleft-crop.png` — native fullscreen: traffic
  lights auto-hide; the 80px reservation persists (accepted Vault-parity limitation,
  documented in CSS + docs).

## Interaction results

- Header drag: window moved exactly +120/+120 via synthesized drag on empty header space
  (`core:window:allow-start-dragging` + `data-tauri-drag-region="deep"` working).
- Double-click zoom: maximized 1280×800 → 1920×1050.
- Fullscreen enter/exit: clean, no layout break.
- Quit: port 4180 released and `agent-overlay-server` reaped (the surviving
  `agent-runner` PID 50101 predates the session — the operator's standing daemon,
  parent PID 1, started 2026-07-07).

## Not exercised

- System-level Reduce Transparency toggle (a11y setting left untouched); the titlebar
  rule was added inside the existing proven `prefers-reduced-transparency` fallback block.
- Startup white flash: no flash observed at launch; the `visible: false` +
  show-after-health flow and platform `backgroundColor` overrides are untouched by this
  slice, so no regression mechanism exists.
- Playwright environment note: the chromium-1217 CDN download stalled repeatedly; the
  fully-cached chromium-1228 build was staged in its place locally to run the smoke
  (environment workaround only, no repo change).
