# Phase-1 After — QA evidence (2026-07-06)

Captured against real builds after Phase-1 (slices 1–3) landed:
Vault `web/dist` served by `agent-vault-server` on `:4290` with a seeded QA fixture vault
(notes with `[[wikilinks]]` incl. one broken reference, five tasks across statuses, a project,
a person, a daily note that trips a schema finding, plus the starter Templates). Overlay
`apps/desktop/web/dist` served by a fresh `agent-overlay-server` on `:4181` over the real
`~/overlay` workspace (read-only browsing).

## Captures

- `vault-editor-infodock-light-1440` — grounded one-row header (VAULT cluster inline, no
  detached block), flattened note header + tonal Properties panel, brass selected row.
- `vault-newnote-menu-light-1440` / `-focus-` — Radix New note menu: icon-led compact rows,
  TEMPLATES group + separator, bounded height; focus shot shows the visible keyboard ring.
- `vault-narrow-760` / `-infodrawer` — single-drawer discipline: opening either drawer closes
  the other; header intact at 760px (nothing overlaps or pokes out).
- `vault-editor-dark-1440`, `vault-conventions-dark-1440` — dark parity; value-aware severity
  badges (error red / warning amber / info blue role sets) on real findings.
- `overlay-dashboard-light-1440` — grounded full-height sidebar (no floating nav card),
  one-line hero, `0 errors`/`0 warnings` neutral (not brass), `1 pending` amber,
  `stopped` red.
- `overlay-automations-light-1440` / `-dark-1440` — `available` green, `manifest absent`
  neutral, `daemon stale` SOLID red (loudest element), `live reload on (daemon stale)` amber,
  `process not running` red; mono paths truncate instead of wrapping.
- `overlay-agent-runtimes-light-1440` — card-in-card flattened to one bordered section with
  hairline-separated runtime rows; `ready` green + check, `unsupported` neutral.
- `overlay-narrow-760` / `-drawer` — sidebar collapses to a header menu button; drawer slides
  over a scrim with active item highlighted (no stacked 15-item nav).

## Programmatic checks

- Console: zero messages on both apps (no CSP/font/render errors).
- Native feel: `cursor: default` on buttons and in-app links; `user-select: none` on chrome
  with content/inputs re-enabled.
- Reduced motion: the capture environment had reduce-motion on — `--motion-duration-short`
  resolved to `0s`, proving the override path.
- Font preload: dist `index.html` preloads the same hashed woff2 assets the CSS references
  (single fetch, no double download) in both apps.

## Known gaps / Phase-2 candidates

- Tauri desktop (.app) smoke not run this pass; `backgroundColor` validated against the Tauri
  config schema (+ `cargo check` on the Overlay shell). Native vibrancy spike deliberately
  not attempted — opaque surfaces + CSS glass ship per the brief.
- A running console instance serves the dist it was launched with — restart the desktop
  app/console to pick up the new UI.
- Runner grid truncates aggressively in narrow columns (`threshold 1…`, `0 schedul…`) —
  full values are in tooltips; Phase-2 polish candidate.
- Overlay shell is still a centered `max-w-6xl` grid (paper gutters at ultra-wide);
  full-bleed operator shell is a Phase-2 layout question.
- Vault daily-note bar still renders above an open note (Chat/composer & deeper editor-region
  work are Phase 2 by boundary).
