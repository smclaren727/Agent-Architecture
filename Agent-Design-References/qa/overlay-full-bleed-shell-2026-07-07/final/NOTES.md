# Full-bleed shell — final QA (2026-07-07)

Served build verified at capture: rebuilt dist byte-served on the QA port (Overlay main
`806fe48`). Captures: dashboard-1440, automations-1440/1280/1024/760, nav-drawer-760,
trajectories-1440, agent-runtimes-1440, automations-1440-light.

## Layout decision recap

Shell containers: max-w-6xl → max-w-[110rem] ultrawide safety cap (effectively full-bleed on
real displays; sidebar reaches the window edge below the cap; centered paper margins reappear
only above ~1760px, matching today's behavior class). Dashboard grid 3-up at xl. Automations:
xl fact-grid spreads, side-by-side service/cron at xl, detail rail deferred honestly to 2xl
(920px table + rail can't fit ~1190px at xl). Dense views: one pattern — bounded flexible
master columns, detail absorbs width; deliberate max-w-3xl reading caps for workspace/CLI/
Ping/memory-form; max-w-prose on hero paragraphs.

## Checks

Zero horizontal overflow at 1440/1280/1024/760 (programmatic at each step); zero console
messages; nav drawer opens/closes with scrim; trigger table scrolls only when genuinely
needed (fits without scroll at 1440); status chips clear in dark and light; no automations
actions, syncs, cron changes, or trigger writes performed.

## Intentionally unchanged

Dashboard beyond the 3-up grid step; StateCards; narrow (<md) layouts everywhere; Vault
(explicitly out of scope); the two uncommitted owner-WIP Rust files (watchdog work in
progress — `cargo fmt --check` currently fails on that WIP file only; all campaign commits
used explicit web-file adds and verified the WIP files stayed untouched).

## Remaining UI risks

- Above the 110rem cap (≳1760px windows) paper margins flank the sidebar — acceptable per
  decision, revisit only if ultrawide becomes a real operator setup.
- The 2xl detail rail threshold means 1440 users never see the side-by-side trigger detail;
  if operators want it at 1440, the table's 920px minimum would need column surgery first.
- Master-list minmax upper bounds picked conservatively (+60-80px); could widen after real
  operator feedback.
