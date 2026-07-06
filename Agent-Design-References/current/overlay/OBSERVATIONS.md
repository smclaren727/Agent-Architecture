# Overlay — Current UI Observations

App: Agent-Overlay
Captured: 2026-07-06
Viewport: 1440×900 (desktop normal), Chrome
Build: already-running operator console on `localhost:4180`
Theme in captures: light + dark

Captures in this folder:
- `overlay-workspace-home-light-*` — Workspace/home view (open/create/recent)
- `overlay-automations-light-*` / `overlay-automations-dark-*` — Automations, Runner panel
- `overlay-dashboard-light-*` / `overlay-dashboard-dark-*` — Dashboard card grid

## Provenance note

Overlay's theme is the **"Archive"** theme copied verbatim from Vault (`THEME.md` confirms:
same oklch tokens, radius, spacing, typefaces; only branding strings + icon differ). There is
deliberately **no shared cross-repo UI package** — the theme is duplicated. So the two apps
already share a visual language; the shared-vs-distinct question is about *layout role*, not
palette.

## What feels good

- Same tasteful Archive identity; dark mode in particular looks premium (deep ink, teal active
  nav, brass badges pop).
- The left nav is a clean, legible labeled list (better than Vault's icon-only rail) — 15
  operator destinations, serif section label "VIEWS".
- Real operator data is present and honest: the Automations Runner panel surfaces genuine
  states — `daemon stale` (red), `available` (brass), `manifest absent` (gray),
  `process not running` (red text), PID/interval/heartbeat-age/threshold. The *information* an
  operator needs is there.
- Status semantics are attempted (red for stale/error), unlike a monochrome dashboard.

## What feels rough

- **Landing-page density, not operator density.** Every surface is large white/ink cards with
  huge padding on a paper background. The Dashboard is a 2-col card grid with one metric each;
  the Automations Runner is one giant card wrapping many flat sub-sections. For a console meant
  to be scanned repeatedly this wastes enormous vertical space. → **density**
- **Uniform card weight flattens hierarchy.** On the Dashboard every card looks identical in
  weight, so "Validation", "Server status", "Proposal queue" read as equal priority with no
  scan order. → **dense-operator hierarchy**
- **Status pills not differentiated by meaning.** On the Dashboard "0 errors", "0 warnings",
  "1 pending", "1 total", "stopped" all render as near-identical brass/gray pills — color
  carries no signal. And a *positive* state ("available") uses the same brass as neutral, so it
  competes with the red "daemon stale" instead of reading as good/green. → **color**
- **Loose key/value grids.** In the Runner panel, label→value pairs have large gaps and the
  command path wraps mid-word ("/Develo⏎per/…"), which looks broken. Monospace fields need a
  tighter, non-wrapping/scrolling treatment. → **dense-operator / typography**
- **Nav is a floating rounded card.** The primary nav sits as a detached pill-card with its own
  border and shadow, separated from the content by a wide gutter — more decorative than a
  grounded operator sidebar. → **shell architecture**
- **A lot of hero copy per view.** Each view opens with a large serif H1 + a full paragraph of
  description before any data. Fine once; heavy for a tool you live in. → **spacing**

## Likely polish targets (ranked)

1. Introduce a real operator density mode: flatten cards to bordered sections/tables, cut
   padding, tighten key/value grids. **dense-operator-uis**
2. Value-aware, semantic status colors shared with Vault (green=healthy/available,
   amber=warning/stale, red=error/down, neutral=info/zero). **color**
3. Fix monospace path/field wrapping (truncate + tooltip, or horizontal scroll container).
4. Ground the nav into the shell (or make the floating-card treatment intentional and lighter).
5. Establish scan hierarchy on the Dashboard (primary vs. secondary card weight).

## Implementation risk

- Automations is the load-bearing operator surface: any density change must **keep critical
  warnings more prominent than decoration** and must not mask stale-daemon state behind service
  status (per slice-5 validation + the daemon-heartbeat work in memory).
- Exact trigger attribution and recent-run accuracy must remain readable after re-layout.
- Status-color changes should be tokenized once and shared, not re-invented per view.

---

## Wave 2 (additional states, 2026-07-06)

Added captures:
- `overlay-memory-light-*` — Memory: propose-memory form + proposal queue
- `overlay-canonical-files-light-*` — Canonical Files: master/detail file list + YAML editor
- `overlay-trajectories-light-*` — Trajectories: runs list + run detail (score, JSON events)
- `overlay-agent-runtimes-light-*` — Agent Runtimes: 3 runtime cards + Lifecycle Hooks
- `overlay-agent-runtimes-narrow-light-*` — **760px narrow viewport** (responsive)

### New findings

- **The system CAN do semantic status — it's just inconsistent.** Agent Runtimes nails it:
  "ready" = filled teal badge, "unsupported" = gray outline badge; a green check vs. amber
  warning on the per-runtime status line. This is the treatment the Dashboard *should* use but
  doesn't (there everything is a flat brass/gray pill). The fix is consistency + tokenizing one
  semantic set, not inventing something new. → **color (consistency)**
- **Master/detail is the strongest existing pattern.** Canonical Files and Trajectories both use
  a left list + right detail/editor. This is the right operator shape and should be the model
  for denser surfaces — but the rows are still tall/airy and each JSON event renders as its own
  bordered card (a stacked-cards log). Tighten rows; turn event lists into a real dense log.
- **Card nesting hits three levels.** Agent Runtimes = "Local Agents" card → per-runtime card →
  chip pills inside. Exactly the "cards inside cards" anti-pattern; flatten to one bordered
  section with rows/columns.
- **Responsive is unhandled (same class of bug as Vault).** At ~760px the sidebar does **not**
  collapse to a drawer/hamburger — the full 15-item nav stacks as a full-width block and pushes
  the actual view heading far below the fold (you scroll past all of nav to reach content).
  → **architecture / responsive**
- **Good chips.** Model pills (Default / Sonnet / Opus / Haiku) and the `base` file-origin chips
  are a clean, reusable pattern worth keeping and tokenizing.
