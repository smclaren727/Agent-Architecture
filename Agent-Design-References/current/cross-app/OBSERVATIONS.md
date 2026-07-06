# Cross-App — Current UI Synthesis

Captured: 2026-07-06 · Vault `:4173` + Overlay `:4180`, both real builds, light + dark.
See `../vault/OBSERVATIONS.md` and `../overlay/OBSERVATIONS.md` for per-app detail.

## The one-line finding

The apps already **share a deliberate visual language** (the "Archive" theme — warm paper,
pine-teal ink, brass accent, Newsreader/Hanken/JetBrains type — copied verbatim between repos).
What's missing is **layout architecture and information density discipline**. Both apps render
as airy, landing-page-style card stacks on paper; neither yet reads as the dense, inspectable
working tool the product wants. So the rearchitecture is mostly about **shell, density, and
semantic tokens**, not a new palette.

## Shared strengths (keep)

- The Archive palette + typography identity. It's distinctive and product-grade.
- oklch tokens, custom shadows, three self-hosted variable faces — the token *foundation* the
  implementation plan wants already exists in `web/src/index.css` (both repos).
- Serif view titles as an editorial signature.

## Shared problems (fix once, apply to both)

| Problem | Vault | Overlay | Polish target |
| --- | --- | --- | --- |
| Landing-page density; big padding, one-metric cards | ✔ | ✔ | density |
| Cards inside cards on a paper background | ✔ | ✔ | density |
| Status color not value-aware (0 errors = red; available = brass) | ✔ | ✔ | color |
| Large hero H1 + paragraph before any data on every view | ✔ | ✔ | spacing |
| Shell chrome feels detached (Vault: broken top-bar; Overlay: floating nav card) | ✔ | ✔ | architecture |

## Where they should stay different (role clarity)

- **Vault = editor / reading room.** Comfortable measure for prose, the structured Properties
  form, the Info dock, CodeMirror. Density should tighten but keep a calm editing feel.
- **Overlay = operator console.** Should go *denser* than Vault — tables/rows over cards,
  scan-first hierarchy, monospace status grids. It's a tool you watch, not read.
- Shared: token vocabulary, status semantics, menus/popovers, button/badge/input recipes.
  Divergent: content density and primary-surface layout (editor pane vs. operator table).

## Concrete shared-token opportunities (feed the token plan)

- **Semantic status set**, value-aware, identical in both apps:
  healthy/available → green · warning/stale → amber · error/down → red · info/zero → neutral.
  (Today brass is overloaded as "accent" *and* half the statuses.)
- **Surface recipe** that kills card-in-card: `app-bg` (paper) → one `panel` level with a
  subtle border, no nested elevated cards. Reserve raised/glass for menus + popovers only.
- **Density scale**: a tighter default spacing rhythm; Overlay opts into an even denser table
  variant.
- **One real top-bar/shell grid recipe** shared by both (Vault's is currently broken).

## Wave 2 additions (2026-07-06)

Two cross-cutting findings from the deeper sweep sharpen the plan:

1. **The design system already contains the right ingredients — they're applied
   inconsistently.** Overlay's Agent Runtimes uses genuinely semantic status badges
   (ready=filled teal, unsupported=gray outline) and clean model chips; Canonical Files and
   Trajectories use a proper master/detail shape. The problem is that the *same* concepts are
   done well on one view and poorly on another (Dashboard's flat brass pills). So Phase 1
   (architecture/tokens) is largely a **consistency + extraction** job: pick the good existing
   patterns, tokenize them, apply everywhere. This lowers risk — we're standardizing, not
   redesigning from zero.

2. **Responsive/narrow is unhandled in BOTH apps** (new shared problem, high priority):
   - Vault ~760px: left + right panels both open as overlay drawers *simultaneously*, burying
     the editor; header breaks further.
   - Overlay ~760px: sidebar doesn't collapse — the whole 15-item nav stacks above the content.
   These ship as Tauri webviews, so a real responsive/collapse discipline belongs in the shared
   shell recipe from day one, not as an afterthought.

Also confirmed: **menus are undesigned** (Vault's "New note" = bare tall list, no icons/
separators/selection state) — the `menus-popovers` slice has real room to add value.

Updated shared-pattern shortlist to standardize in Phase 1:
- One shell recipe: grounded top-bar grid + sidebar with a defined narrow-collapse behavior.
- One semantic status set (from Agent Runtimes), value-aware, shared by both apps.
- One master/detail + one dense-row/log recipe (from Canonical Files / Trajectories).
- One menu/popover recipe (icons, separators, selected state, sane row height).
- Chip recipe (from model pills / origin chips).

## Open questions this raises for the direction brief

1. Of the 5 candidate directions in `mockups/`, the evidence points at a blend of
   **"Dense operator console"** (Overlay) over a **"Warm knowledge workspace"** (Vault) sharing
   one token set — rather than picking a single look for both. Worth deciding explicitly.
2. Dark-first or light-first? Dark reads better today in both; references lean dark. Suggest
   polishing dark first, verifying light for correctness (matches the token plan's open Q).
3. Keep duplicating tokens per repo (current locked decision) vs. document one shared vocabulary
   in Architecture that each repo implements. Duplication is fine if the vocabulary is written
   down here so they don't drift.
