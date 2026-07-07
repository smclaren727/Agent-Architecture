# Screenshot QA Checklist

Use this checklist after each visual slice.

## Preflight (required before trusting any capture)

- **Verify the served build hash/path first.** A running server keeps serving the dist it was
  launched with; two campaigns have now been misled by stale builds (the 2026-07-06 UI walk
  captured a pre-Phase-1 Vault at `:4173`, and the live Overlay console at `:4180` served a
  pre-Phase-1 bundle). Before treating screenshots as current: rebuild, then confirm the served
  document equals the on-disk dist (e.g. `curl -s <base>/ | shasum` vs `shasum dist/index.html`,
  or compare the hashed `index-*.js` bundle name) — for Overlay, `/api/health` also reports
  `uiDir`.
- **Current Phase-2 baseline:** `qa/stabilization-2026-07-06/` (captured 2026-07-06 from Vault
  `4fa0990` / Overlay `5651838`). The earlier `/tmp/agent-ui-walk-2026-07-06` evidence was stale
  for Vault — do not scope from it.
- **Known deliberate tradeoff to revisit during polish:** Vault's `md–<xl` widths run the
  single-pane panel model (both side panels cannot be open between 768 and 1279px; dual-pane
  resumes at `xl`). Chosen in the stabilization pass to protect center-pane width.

## Viewports

- Desktop wide:
- Desktop normal:
- Narrow webview:
- Mobile-width drawer behavior, if relevant:

## Vault

- Notes editor:
- Right dock Info:
- Right dock Chat empty:
- Right dock Chat with long prefilled prompt:
- Chat transcript with actions:
- Conventions findings:
- Structured editor view:
- Empty state:
- Error/unavailable state:

## Overlay

- Workspace/home:
- Automations trigger list:
- Runner liveness fresh:
- Runner liveness stale/missing:
- Recent runs:
- Trigger edit/toggle:
- Service/sync/cron controls:
- Empty state:
- Error/unavailable state:

## Cross-App

- Shared colors feel related:
- App-specific accents remain clear:
- Status colors mean the same thing:
- Menus/popovers feel consistent:
- Panel density feels consistent:
- Focus rings are visible:
- Reduced-motion behavior is acceptable:
- Console has no new CSP/font/render errors:

## Notes

Issues found:
-

Follow-up decisions:
-

