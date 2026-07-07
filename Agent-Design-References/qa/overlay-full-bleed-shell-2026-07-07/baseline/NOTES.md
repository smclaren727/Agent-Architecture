# Full-bleed shell — baseline + layout inventory (2026-07-07)

Served build verified: `assets/index-Er81ZKO3.js` (main `a22a857`), byte-served from the
rebuilt dist. Dark (system). Captures: dashboard-1440, automations-1440/1280/1024/760,
nav-drawer-760.

Preflight: the sidecar watchdog fix has NOT landed; an in-progress uncommitted hand edit
exists in apps/desktop/src-tauri/src/lib.rs (parent-PID env pass, console-side consumption
absent). This slice will not touch or commit it; `cargo fmt --check` currently fails on that
uncommitted edit (pre-existing, unrelated).

## Width constraints today

- SHELL (the target): header inner `mx-auto max-w-6xl px-4`; content grid
  `mx-auto max-w-6xl grid-cols-1 md:grid-cols-[14rem_minmax(0,1fr)]`. At 1440 the console
  uses 1152px and leaves ~288px of paper gutter.
- Sidebar column: fixed 14rem at md+; narrow drawer `w-72 max-w-[86vw]` (unchanged scope).
- Per-view internals (constraints that SHOULD adapt once the shell widens):
  master/detail lists pinned to fixed left columns — canonical-files 380px, trajectories
  360px, eval-reports 360px, export 420px, diagnostics 320px; automations detail rail fixed
  420px at xl; agent-runtimes row grid caps its third column at 24rem; approvals snippet
  `max-w-[28rem]`. Key/value grids inside Automations use fixed 120-180px label columns
  (fine — labels don't need growth).
- Views' hero rows and StateCards are width-neutral (flex/grid-fluid).
