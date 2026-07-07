# State system — inventory + baseline (2026-07-07)

Served builds verified: Vault `static/index-UKqNxpZ1.js` (main `b1653d5`), Overlay
`assets/index-3yY5JZD1.js` (main `5547de4`), both byte-served from freshly rebuilt dists.
Fixture: seeded QA vault (Vault), real `~/overlay` workspace read-only (Overlay). Dark (system).

## Captures (reachable states)

- `vault-open-file` — Open File idle (no recent files section: empty-by-absence)
- `vault-search-noresults` — "No matching notes." bare paragraph
- `vault-proposals-empty` — "No pending memory proposals." bare paragraph
- `vault-agent-runs` — populated run list (mock-turn trajectories) + "Select a run." detail
- `vault-health` — health info grid (registered vault rows)
- `overlay-eval-reports-empty` — "No eval reports found." bare paragraph
- `overlay-approvals-empty` — "No approval requests." bare paragraph

## Unreachable without mutation/special setup (recorded, not captured)

- True load-failure errors (server down mid-view), apply/save failures, capture write errors —
  require fault injection; presentation covered by code inventory + tests instead.
- Vault Chat states — captured last campaign (chat-composer final set); regression-checked in
  slice 5 only.
- Overlay workspace-gated absence: 12/15 views are registry-filtered when no workspace is
  connected (no in-view placeholder exists at all — nav simply hides them).

## Code inventory (full sweep, both repos) — key findings feeding slices 1-3

VAULT: `EditorStateCard` (icon/title/hint, muted|danger) exists but has only 3 consumers
(notes editor/loose editor). ~40 other state renders are bare muted/destructive one-line
paragraphs (tasks/projects/search/trajectories/proposals/conventions/graph/health/workspace/
open-file/info-dock). Two components hand-rebuild the card shape instead of importing it
(ChatDock TranscriptEmptyState, WorkspaceFileDetail). Detail-masking fallbacks: ProjectDetail
and RunDetail render literal "Unknown error" when a message is nullish.

OVERLAY: no shared state component; 8+ views each define a local InlineLoading/InlineCard
helper; top-level errors are status-error Cards while detail-pane errors are bare destructive
paragraphs; empties are ~20 bare paragraphs. SYSTEMIC DEFECT: the repeated pattern
`error instanceof Error ? error.message : undefined` renders NOTHING for non-Error throws
(silent error) at ~14 sites, and top-level cards swap non-Error detail for canned strings
("Dashboard snapshot failed.") — both violate "don't hide operator-useful errors" and are
in-scope repairs for slice 3.

Copy dead-ends worth fixing while touching these sites: agent-runtimes "No local agent catalog
is available…" (no next action; contrast automations' good "Set AGENT_RUNNER_COMMAND…" copy),
CLI "(not found)" reading as part of a path, Chat "yet"-phrasing implying auto-resolution.

Behavior backlog carried forward: unindexed-note Ask-agent prefill drop (unchanged).
