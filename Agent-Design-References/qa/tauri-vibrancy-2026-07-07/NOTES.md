# Native vibrancy — shipped QA evidence (2026-07-07)

Resumes and CLOSES the blocked vibrancy spike (`../tauri-vibrancy-spike-2026-07-07/DECISION.md`).
The earlier spike could not verify because the session host lacked Screen Recording TCC; that is
resolved — `screencapture -x` and `osascript … System Events` both work this session, so real
`.app` windows were captured.

## Architecture shipped (matches the spike decision, verified against locked Tauri 2.11.5)

- Tauri built-in `windowEffects: { effects: ["underWindowBackground"], state:
  "followsWindowActiveState" }` + `transparent: true`, `backgroundColor` removed, `visible:false`
  show-on-ready kept; `tauri` gains the `macos-private-api` feature + `app.macOSPrivateApi: true`.
  Identical mechanism in Vault and Overlay.
- Web CSS goes translucent ONLY under a `data-native-vibrancy` attribute on `<html>`, set (before
  React mounts, synchronously) only when `isTauri && isMac && !isCaptureWindow`. Absent attribute
  (browser, non-macOS, effect failure) → today's opaque tokens exactly. Translucency: body
  transparent (material shows), main pane ~90% opaque, sidebar/rail ~75%, drawers ~85%; status
  chips, cards-with-text, inputs, menus stay opaque for contrast. `prefers-reduced-transparency`
  restores opaque web tints (native NSVisualEffectView also degrades natively).
- **Non-macOS gate (added after adversarial review, finding F1):** the transparent/windowEffects
  config lives in the base `tauri.conf.json` (macOS uses it), and `tauri.linux.conf.json` /
  `tauri.windows.conf.json` overlays force `transparent:false` + an opaque `backgroundColor` on
  those targets, so a non-macOS bundle keeps its opaque backing (robust under either Tauri
  config-merge rule).

## Bundle-freshness proof (the launched apps are the vibrancy build)

`app` binary sha256, pre-vibrancy → final vibrancy (F1/F3 applied):
- Vault:   `83de13ab…` → `9cd216fb…`   (`pre-vibrancy-bundle-hashes.txt` / `post-vibrancy-bundle-hashes.txt`)
- Overlay: `7f373866…` → `302b4359…`
Both bundles built 13:54; the running `app` binary size matched the fresh build; `/api/health`
returned the current-main shape (Vault `assetPort:4183` — the privileged-origin split intact).
Launch path: quit the pre-vibrancy apps, SIGTERM the lingering sidecars (a KNOWN
reap-after-quit gap, unrelated to vibrancy), confirm ports free, `open` the fresh `.app`.

## Startup / no-white-flash

Both apps launched from the real `.app` bundles (not dev servers) and showed cleanly — no white
flash, no blank/see-through webview, no stale sidecar. show-on-ready holds: the window stays
`visible:false` until `/api/health` passes and the webview has navigated; the first painted frame
is the composited `underWindowBackground` material (there is no opaque background left to flash).

## Dark / light contrast (real-window captures)

`before/` = pre-vibrancy opaque baseline. `after/`:
- `vault-light.png`  — OS light + Vault light theme: material light, dark text legible.
- `vault-dark.png`   — OS dark + Vault dark theme: light text on translucent dark surfaces over
  the dark material — ribbon icons, headings/body, card text all legible; teal accents pop.
- `overlay-light.png`— OS light + Overlay dark theme: LIGHT titlebar/material with dark content —
  shows the material follows OS appearance independent of the web theme.
- `overlay-dark.png` — OS dark + Overlay dark theme: dense operator shell (sidebar nav, Workspace
  cards, the green `active` badge, amber pill) legible over the dark material.
Contrast holds in every combination; the 75–90% surface opacities keep text well clear of the
material while the material reads at window edges and behind the translucent columns.

## Browser / non-macOS fallback

`browser-fallback-proof.txt`: a plain Chrome tab at `http://127.0.0.1:4173` reports
`isTauri:false`, `hasVibrancyAttr:false`, `bodyBg: oklch(0.985 0.006 95)` (opaque), paper-grain
gradient present — byte-identical to pre-change. The Playwright browser smoke (Vault 15/15) runs
against this opaque path. Non-macOS Tauri: gated by the linux/windows config overlays (above);
no non-macOS bundle is produced in this environment, so that path is config-verified, not
launch-verified.

## Adversarial review

Two reviewers (Claude agent + the brief). No macOS-facing blocker. Findings repaired:
- **F1 (medium):** transparent/windowEffects/removed-backgroundColor were not platform-gated →
  added the linux/windows opacity overlays. **F3 (cosmetic):** the vibrancy body override left
  the paper-grain gradient painting over the material → added `background-image: none` under
  `[data-native-vibrancy] body`. **F2 (low, documented):** `isMac` matches iPadOS's "Macintosh"
  UA, but it is behind `isTauri` and neither app builds an iOS target — left as a noted limitation.

## Remaining limitations / backlog

- Non-macOS Tauri bundles are gate-configured but not built/launched here (config-verified only).
- The web theme (light/dark) does not live-follow a mid-session macOS appearance flip (pre-existing
  mount-time read; unrelated to vibrancy). The material DOES follow OS appearance live.
- F2 iPadOS UA false-positive (behind `isTauri`, no iOS target today).
- Sidecar reap-after-quit gap (ports linger until manual SIGTERM) — a real, pre-existing backlog
  item surfaced again during the relaunch cycle, orthogonal to vibrancy.
