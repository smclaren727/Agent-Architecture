# Chat/composer polish — final QA (captured 2026-07-07)

Served build verified before capture: `static/index-UKqNxpZ1.js`, byte-served from the freshly
rebuilt `web/dist` at Vault main `b1653d5`. Fixture: seeded QA vault; turn-capable states used
the same mock-provider workspace as the baseline (local OpenAI-shaped SSE/JSON mock on
127.0.0.1:4497 via a scratch template-workspace copy; no real provider, no secrets). Theme: dark
(system).

## Captured

- `chat-missing-config` — real `no-turn-capable-profile` state (unconfigured template
  workspace): neutral config panel, per-profile reason chips, Check again.
- `chat-empty-readonly` — compact empty state + control strip, read-only chip near Send.
- `chat-suggest` — suggest mode (info-tinted permission select + Suggest chip).
- `chat-prefill-marker` — convention Ask-agent prefill with the dismissible marker row.
- `chat-response-suggestion-card` — streamed reply + "Suggested edit" card (target chip,
  clamped explanation, labeled replacement preview, Copy/Apply row).
- `chat-apply-confirmation` — armed state: warning-tinted card, frontmatter guard line,
  Confirm apply/Cancel (cancelled after capture; no note mutation).
- `chat-narrow-760` — Chat tab in the narrow overlay drawer, zero page overflow.

## Not captured / with mocks

- Live tool-bearing (claude-code/codex) turns and proposal cards from real runs: no
  Overlay CLI configured in this environment; proposal-card presentation is pinned by
  ChatDock tests instead.
- Allow-edits auto-apply: exercised by tests (single current-note suggestion auto-applies,
  ambiguous requires review); not captured to avoid mutating the fixture note during QA.
- Light theme: token-expressed styling; dark captured (system). Light parity spot-checks
  remain a standing cheap-insurance item from the Phase-2 report.

## Console

Zero errors/warnings in both walked sessions. One pre-existing DevTools accessibility issue
("form field should have an id or name", count 10) originates from the Properties-panel native
inputs, predates this campaign, and is unchanged by it — worth a small follow-up.

## Verified behaviors (live + tests)

Prefill never auto-sends and never clobbers a non-empty draft (pinned + walked); drafts survive
dock remounts via sessionStorage and clear on send; apply is Apply → tick-guarded Confirm
(double-click cannot fall through); cancel leaves the note untouched; allow-edits contract
unchanged per AGENTS.md; drawer/tab behavior and pane model unchanged.

## Remaining UI risks

- The config-panel reason labels hand-map the current unavailableReason enum; a new server
  enum value renders as its raw slug (acceptable fallback, revisit when reasons change).
- Suggestion replacement previews scroll internally; extremely long single-line replacements
  rely on the preview block's wrapping — watch real-world agent output.
- The unindexed-note Ask-agent path still drops the prefill (recorded in the baseline notes;
  behavior work outside this campaign).
