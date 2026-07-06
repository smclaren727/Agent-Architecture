# Direction Brief

Status: **Accepted — Phase-1 build brief**
Date: 2026-07-06
Owner: Sean (smclaren727)

> **Phase-1 build boundary.** Implement **slices 1–3 only** (token foundation + native-feel base →
> shell & panels → menu/popover recipe). **Do not restructure Chat or Automations** in Phase 1 —
> they *inherit* token, native-feel, and menu-recipe changes automatically (buttons lose
> `cursor:pointer`, selects adopt the new menu recipe, etc.), but their **layouts are not
> redesigned** until Phase 2. Touch them only where a shell/token/menu change requires it.

## Selected Direction

Name: **Archive · Grounded** — one token system, two densities, a native-feel Tauri shell.

Short description:
Keep the existing **"Archive"** identity (warm paper, deep pine-teal ink, brass accent, Newsreader
/ Hanken Grotesk / JetBrains Mono, oklch tokens) — it is already deliberate and good. This effort
is **architecture-first**: fix the shell, density, status semantics, responsive behavior, and
"web-app feel" that make the apps read as bland/templated today. One shared token vocabulary and
component system spans both apps, expressed at **two densities** — Vault as a calm reading room,
Overlay as a dense operator console — inside a shell that feels like a **native local app, not a web
page**. The distinctive *visual* direction (glass depth, motion character) layers on top in Phase 2,
but the load-bearing shell/native-feel decisions live here in Phase 1.

## Why This Direction

- The premise was half-right: the apps aren't unthemed — they ship the Archive theme in
  `web/src/index.css`. The real problems (from the 2026-07-06 baseline capture) are **layout
  architecture, density, status-color inconsistency, broken responsive, and web-app feel** — not
  the palette. So we standardize and ground, we don't redesign the identity.
- The good patterns **already exist in-app** (Overlay Agent Runtimes' semantic badges; Canonical
  Files/Trajectories master-detail; Vault's structured Properties editor). Phase 1 is largely
  **extract → tokenize → apply everywhere**, which is lower-risk than inventing.
- Both apps are **React 19 + Tailwind v4 + shadcn + Vite in a Tauri shell**, and Tauri on macOS
  renders in **WKWebView** — the same engine Raycast 2.0 wraps. So "make web feel native" is a
  solved, borrowable problem, and several of those wins are shell-level → they belong in Phase 1.
- Cogito (the owner's daily driver) proves the target ergonomics for Vault's editor + Chat already
  exist in a shipped app — de-risking that surface.

## What To Borrow

Surfaces:
- One **flat panel level** on the paper/ink background with a hairline border — **kill card-in-card**
  (Material tonal elevation, not nested shadows). Reserve raised/glass for menus, popovers, docks.
- **Native vibrancy** for the window/sidebar material (Tauri `window-vibrancy` / NSVisualEffectView)
  — the *real* Liquid Glass. **Treat as a de-risking SPIKE, not a guaranteed implementation**
  (WKWebView + Tauri vibrancy has real caveats). Risk is contained: the **CSS glass + opaque
  fallback is already the baseline**, so if the spike fails we lose nothing — menus keep CSS glass,
  window/sidebar stay opaque flat. Nothing else may depend on vibrancy landing.
- **Master/detail** (list + detail) and a **dense-row/log** recipe for operator surfaces (Linear,
  Overlay Canonical Files/Trajectories).

Menus and overlays:
- Row anatomy: **leading icon · label · trailing shortcut/metadata**, section separators, a clear
  selected/focused row, compact row height (Raycast; fixes Vault's plain "New note" menu).
- Glass menu surface (one blur/alpha level) + hairline + soft shadow + opaque `@supports` fallback.
- Aspirational **Cmd-K** command palette as a shared surface (later).

Color:
- **One value-aware semantic status set** shared by both apps, built on Radix-style role scales
  (subtle-bg / border / solid / text per status): `active/healthy · warning/stale · error/down ·
  info · draft/neutral` + the brand brass accent. Fixes "0 errors in red" and "available = brass".
- **Material state-layers** (hover/focus/press/selected as fixed-alpha overlays) for consistent
  interaction feedback — but see native-feel restraint below.

Typography:
- Keep the three Archive faces. Newsreader for view titles/reading; Hanken for chrome; JetBrains
  Mono for code/paths/IDs. **Preload** the self-hosted variable fonts (no first-paint fallback flash).
- Monospace metadata (paths/IDs/timestamps) **truncated middle, never wrapped** (fixes Overlay's
  "/Develo⏎per" wrap).

Spacing and density:
- A **two-speed density scale**: `comfortable` (Vault reading-room) and `compact` (Overlay operator
  rows/tables). Cut the current landing-page padding; one hero H1+paragraph max per view, collapsible.

Motion:
- Small system: 2 durations (~120ms / ~260ms), 2 easings (standard/emphasized), reduced-motion path.
- Quiet and orienting (drawer from its edge, menu from its trigger); never bouncy; never delays
  repeated operator actions.

### Native-feel / platform conventions (folded in from Raycast 2.0 — Phase-1 shell)

Make the webview read as a **native local app, not a website**:
- **No `cursor: pointer` on controls** — native macOS controls use the default arrow. (Web/shadcn
  default adds pointer everywhere → the #1 "this is a website" tell.)
- **Hover/state-layers only on list & menu rows**, not on buttons/static controls. This *refines*
  the Material "state layers everywhere" idea — native apps don't light up every button.
- **`user-select: none` on chrome** (nav, labels, toolbars, buttons); opt selection back in only for
  the editor/note body and content.
- **Native vibrancy over CSS blur** (spike — see above); **kill the startup white-flash**
  (theme-colored Tauri window `background_color` + show-on-ready, not on-create). The no-flash fix
  is guaranteed; the vibrancy is the spike.
- Optional/later: native-window tooltips & popovers, settings in a separate window (higher effort).

## What To Avoid

- Redesigning the Archive identity or introducing a new palette (that's not the problem).
- Card-in-card, one-metric cards, oversized hero bands, decorative blur that hurts contrast.
- Non-semantic status pills (color that carries no meaning); inventing per-view status colors.
- Universal hover highlights and `cursor: pointer` everywhere (web-app tells).
- Faking Liquid Glass with heavy CSS blur when native vibrancy is available; ever trading text
  legibility for translucency.
- Native-window popovers / Cmd-K / big motion in Phase 1 — do the cheap, high-impact wins first.
- Changing Markdown/YAML ownership, API shapes, or Runner/Overlay/Vault responsibilities as part of
  visual work.

## App-Specific Notes

Vault should feel:
- A **reading room / editor** — comfortable density, calm surfaces, a readable center measure.
- Fix the **broken top-bar** (detached VAULT cluster) into one grounded shell grid; let the info
  dock and notes list **collapse** so the editor gets width; single-drawer (not both) on narrow.
- Cogito is the role model for the editor + Chat: runtime in the panel header, profile + permission
  inline in the composer footer, a graduated permission control, a tighter Info/Inspector dock.

Overlay should feel:
- A **dense operator console** — rows/tables over cards, scan-first hierarchy, monospace status
  grids (Linear). Denser than Vault.
- Keep critical warnings more prominent than decoration; never mask stale-daemon state behind
  service status; keep exact trigger attribution readable after re-layout.
- Sidebar must **collapse** on narrow, not stack the whole nav above content.

Shared visual language:
- Identical token vocabulary + semantic status set + menu/popover, chip, badge, input, button,
  dense-row recipes + the native-feel base. **Duplicated per repo** (locked no-shared-package
  decision) but authored from **one written spec** (this brief + the token plan) so they don't drift.
- Divergence is **density + primary-surface layout only** (editor pane vs. operator table).

## Token Implications

Likely CSS variables (author in the existing Archive oklch vocabulary in `web/src/index.css`,
mapped through the Tailwind v4 `@theme` block — see `implementation/css-tailwind-token-plan.md`):
- `--status-{active,warning,error,info,draft}` each as a role set (subtle-bg / border / solid / text).
- `--state-{hover,focus,press,selected}` foreground-overlay alphas (state layers).
- `--density-*` (row height, control height, gap) with `comfortable` / `compact` scopes.
- `--surface-{base,panel,glass}` + `--glass-alpha` + `--blur-panel`; native-vibrancy window bg.
- `--motion-duration-{short,medium}`, `--motion-ease-{standard,emphasized}`.
- Native-feel base: `cursor: default` on controls, `user-select: none` on chrome utilities.

Likely component recipes:
- App shell (grounded top-bar grid + collapsible sidebar/dock, responsive-collapse discipline).
- Panel (one flat level), menu/popover (glass), chip, badge (semantic), input/composer, dense row,
  master/detail, notice/callout, empty state.

## Phase-1 scope & sequencing (maps to `implementation/implementation-slices.md`)

1. **Token foundation + native-feel base** (slice 1): semantic status set, state layers, density
   scale, motion tokens, and the native-feel CSS (cursor/hover/user-select/font preload).
2. **Shell** (slice 2): grounded top-bar grid (fix Vault header), collapsible sidebar/dock +
   responsive-collapse; native vibrancy + no-startup-flash in the Tauri config; flatten card-in-card
   to one panel level.
3. **Menus/popovers** (slice 3): the glass menu recipe (icons/separators/selected/focus).
Phase 2 (chat/composer, automations density, states, QA) and the distinctive *visual* direction
follow, layered on this architecture.

## Acceptance Criteria

- Current-app screenshots show a clear before/after (header fixed; card-in-card gone; denser
  operator surfaces; semantic status; no web-app cursor/hover tells; no startup white-flash).
- Text remains readable in translucent surfaces; native vibrancy has an opaque/reduce-transparency
  fallback; contrast checked in normal and glass states.
- Menus/overlays feel polished, compact, keyboard-navigable (visible focus).
- Vault (reading-room) and Overlay (operator) feel related via one token system but keep distinct
  jobs and densities.
- Everything expressed through shared tokens + reusable recipes, not one-off per-view styling.
- No CSP/font/render regressions in the real Tauri/WKWebView path; narrow viewport works (single
  drawer, collapsible nav).
- **Seeded Vault fixture exists before visual QA** — Vault's live data is sparse (empty Tasks/Graph/
  Notes), so QA needs a populated fixture: a note with frontmatter + body, a few tasks across
  statuses, a conventions finding, and `[[wikilinks]]` so the graph renders. (Overlay already has
  real automations/runtimes/trajectories.) Prerequisite for slices that screenshot-compare.
- **Native vibrancy is a spike, not an acceptance gate** — shipping is fine with the CSS glass +
  opaque fallback if the spike doesn't pan out.

## Traceability

- Current-app findings: `current/{vault,overlay,cross-app}/OBSERVATIONS.md` (20 screenshots).
- References: `references/editor-reading/reference-cogito*` (Vault editor+Chat),
  `references/dense-operator-uis/reference-linear-dark` (operator density),
  `references/color-material/reference-radix-colors*` + `reference-material-design-surfaces-state`
  (status + state layers + tonal elevation), `references/transparency-glass/reference-apple-liquid-glass`
  (material + native vibrancy), `references/motion-interaction/reference-raycast-native-feel`
  (native-feel) + `reference-material-motion` (motion), `references/menus-popovers/*` (Raycast/shadcn).
