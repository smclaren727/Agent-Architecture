# State system — final QA (2026-07-07)

Served builds verified at capture time: Vault `web/dist` rebuilt at main `85b7e0a` and
byte-served on the QA port; Overlay `apps/desktop/web/dist` rebuilt at main `a22a857` and
byte-served. Dark (system) for baseline comparability; light parity captured separately in
`../light-parity/`.

## Captured (final)

Vault: notes no-selection (panel card), search no-results (row card + hint), conventions
findings (severity rows), agent runs (populated list + select-a-run panel), proposals empty
(row card), health info grid, chat missing-config regression check (unchanged panel), narrow
760 drawer showing a row state card.
Overlay: dashboard status cards, automations runner/service/cron/trigger sections, eval
reports empty (row + panel pair), trajectories (populated), CLI status (draft-tone not-found
chips), narrow 760 automations.

## Not captured and why

True fetch-failure errors, apply failures, and write errors require fault injection; their
presentation is pinned by tests and the errorDetail contract instead. Overlay
workspace-absent states don't exist as views (registry-filtered). Allow-edits flows untouched
by this campaign.

## Checks

Console: zero errors/warnings both apps across the full walk (the pre-existing form-field
id/name DevTools audit item remains, unchanged). Horizontal overflow 0 at 1440/1280/1024/760
(programmatic). No writes, sends, applies, syncs, or runner actions performed. Drawers, menus,
Info/Chat tabs verified working; state cards render inside existing slots without layout jumps.

## Behavior backlog (carried + discovered)

- Unindexed-note Ask-agent prefill drop (carried, unchanged).
- Overlay PingView loading/error left bare (deliberately out of scope; trivial follow-up).
- Vault WorkspaceView "connecting…" badge can persist indefinitely without a timeout/error
  transition (inventoried; a behavior change, deferred).
- Form-field id/name accessibility audit (Properties panel inputs) still open.

## Remaining UI risks

- errorDetail stringifies unknown throws; a structured JSON payload error would render as its
  stringification — acceptable, but revisit if API error shapes evolve.
- Row cards in very long lists add ~1 line of height vs the old bare paragraphs; density
  checked at Overlay defaults, watch operator feedback.
- New unavailableReason enum values still fall back to raw slugs (carried rule).
