# Vibrancy spike — Slice 0 partial results (2026-07-07)

## Capability probe (complete)

Both shells: Tauri **2.11.5** (locked; conf schema from @tauri-apps/cli). The 2.11 schema
supports `windows[].transparent`, `windows[].windowEffects` (NSVisualEffectView materials incl.
sidebar/hudWindow/underWindowBackground), and `app.macOSPrivateApi` (required for a transparent
WKWebView). Current state both apps: opaque `backgroundColor` (`#fbfbf7` / `#FCFBF4`),
`visible:false` + show-on-ready, no macos-private-api feature, no vibrancy code. Sidecar ports
are HARDCODED constants (Vault 4173, Overlay 4180) — real-app smoke owns those ports.
Architecture decision recorded in ../DECISION.md.

## Real-bundle rebuild + functional smoke (complete)

Rebuilt from current main (Vault `85b7e0a`, Overlay `a22a857`):
- /Users/seanmclaren/Developer/Agent-Vault/target/release/bundle/macos/Agent Vault.app
- /Users/seanmclaren/Developer/Agent-Overlay/target/release/bundle/macos/Agent Overlay Console.app
Both launch healthy and serve their packaged dists (Vault `static/index-CtTHjO3P.js`, Overlay
`assets/index-Er81ZKO3.js` from Contents/Resources/web-dist).

Environment note: the previously-running app instances (launched 2026-07-06 evening, serving
pre-Phase-1 bundles) were quit for the smoke; their sidecars survived the parent quit and had
to be terminated manually — the parent-death watchdog did NOT reap them (real observation,
added to backlog). The rebuilt current-main apps were left running afterward.

## BLOCKED: real-window captures

`screencapture` fails ("could not create image from display") — the session's host terminal
lacks macOS Screen Recording permission; System Events window positioning also lacks
Accessibility permission. Real-window screenshots are REQUIRED for this spike (the vibrancy
material exists only behind the native window; localhost captures cannot show it, nor verify
startup flash or over-material contrast). Baseline and final visual captures, and therefore
the ship/no-ship contrast gate, are blocked until the permission is granted.

## Discovered backlog

- Tauri sidecar parent-death watchdog failed to reap sidecars after app quit (both apps,
  observed once each; ports stayed bound until manual SIGTERM).
