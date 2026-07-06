# CSS Variables And Tailwind Token Plan

This document is the starting point for turning a selected design direction into implementation guidance.

## Core Recommendation

Use CSS variables as the source of truth for visual tokens, then expose those variables through Tailwind utilities. Do not scatter raw hex colors, opacity values, shadows, or blur values through individual components.

The preferred shape is:

1. Define semantic variables in app CSS.
2. Map Tailwind colors/effects to those variables.
3. Build component recipes from the mapped tokens.
4. Keep view-specific styling limited to layout and state.

## Token Layers

### Base Tokens

Base tokens describe raw design materials:

```css
:root {
  --color-ink: 222 18% 12%;
  --color-paper: 42 18% 96%;
  --color-accent: 210 80% 46%;
  --shadow-soft: 0 18px 44px rgb(15 23 42 / 0.14);
  --blur-panel: 18px;
}
```

Use the actual syntax supported by the app's Tailwind version. **These repos are Tailwind v4 and
author colors in `oklch(L C H)`** (see `web/src/index.css`, e.g. primary `oklch(0.47 0.072 192)`).
The `H S% L%` triplets in the examples throughout this doc are **illustrative role shapes only** —
express real values in **oklch** to match the theme. The authoritative status values are in the
[Phase-1 Concrete Plan](#phase-1-concrete-plan-2026-07-06).

### Semantic Tokens

Semantic tokens describe app roles:

```css
:root {
  --app-bg: var(--color-paper);
  --app-fg: var(--color-ink);
  --surface-base: 0 0% 100%;
  --surface-raised: 0 0% 100%;
  --surface-muted: 220 18% 96%;
  --surface-glass: 0 0% 100%;
  --surface-glass-alpha: 0.72;
  --border-subtle: 220 12% 82%;
  --border-strong: 220 14% 70%;
  --focus-ring: var(--color-accent);
}
```

### Status Tokens

Status tokens are shared, semantic, and **value-aware**. The authoritative definition — as oklch
**role sets** (subtle-bg / border / solid / text), not single hexes — lives in the
[Phase-1 Concrete Plan](#phase-1-concrete-plan-2026-07-06) below. Do not define a second status
palette here; that section is the single source of truth.

Avoid inventing separate colors for the same meaning in Vault and Overlay.

### Component Tokens

Component tokens describe reusable UI recipes:

```css
:root {
  --panel-bg: hsl(var(--surface-base));
  --panel-border: hsl(var(--border-subtle));
  --panel-radius: 8px;
  --menu-bg: hsl(var(--surface-glass) / var(--surface-glass-alpha));
  --menu-border: hsl(var(--border-subtle) / 0.8);
  --menu-shadow: var(--shadow-soft);
  --dock-bg: hsl(var(--surface-glass) / 0.78);
}
```

Keep these names stable enough that implementation can happen in slices.

## Tailwind Mapping Recommendations

Use Tailwind as the ergonomic layer over variables:

```js
theme: {
  extend: {
    colors: {
      app: {
        bg: "hsl(var(--app-bg))",
        fg: "hsl(var(--app-fg))",
      },
      surface: {
        base: "hsl(var(--surface-base))",
        raised: "hsl(var(--surface-raised))",
        muted: "hsl(var(--surface-muted))",
        glass: "hsl(var(--surface-glass) / <alpha-value>)",
      },
      status: {
        active: "hsl(var(--status-active))",
        draft: "hsl(var(--status-draft))",
        warning: "hsl(var(--status-warning))",
        error: "hsl(var(--status-error))",
        stale: "hsl(var(--status-stale))",
        info: "hsl(var(--status-info))",
      },
    },
    boxShadow: {
      soft: "var(--shadow-soft)",
    },
    backdropBlur: {
      panel: "var(--blur-panel)",
    },
  },
}
```

When implementing, verify the real repo's Tailwind version and adapt this shape. The principle is more important than this exact syntax.

## Transparency And Blur

Transparency should be a controlled material system:

- Use one or two glass alpha levels, not many.
- Pair translucent backgrounds with borders.
- Use blur only where layering matters.
- Keep text on sufficiently opaque surfaces.
- Add an opaque fallback for webviews or low-contrast contexts.

Example fallback pattern:

```css
.app-glass-panel {
  background: hsl(var(--surface-raised));
  border: 1px solid hsl(var(--border-subtle));
}

@supports ((backdrop-filter: blur(12px)) or (-webkit-backdrop-filter: blur(12px))) {
  .app-glass-panel {
    background: hsl(var(--surface-glass) / var(--surface-glass-alpha));
    backdrop-filter: blur(var(--blur-panel));
    -webkit-backdrop-filter: blur(var(--blur-panel));
  }
}
```

## Component Recipes To Define

Define recipes before broad implementation:

- App shell background.
- Side panel.
- Right dock.
- Toolbar.
- Menu/popover.
- Modal/confirmation.
- Input/composer.
- Status badge.
- Data row.
- Notice/callout.
- Empty state.

Each recipe should specify:

- Background token.
- Border token.
- Radius.
- Shadow.
- Text color.
- Density and spacing.
- Hover, active, disabled, and focus states.

## Phase-1 Concrete Plan (2026-07-06)

This section makes the generic guidance above specific to the **real stack**: React 19 + Tailwind
**v4** (`@theme` CSS-first) + shadcn (new-york, `cssVariables: true`) + Vite, in a **Tauri** shell
(macOS = **WKWebView**). Author values in the existing **Archive oklch** vocabulary already in
`web/src/index.css` — add/refine tokens; do not replace the palette. Duplicate per repo (Vault +
Overlay), authored from this one spec.

### 1. Native-feel base (the cheap, high-impact "not a website" layer)

From `references/motion-interaction/reference-raycast-native-feel`. Ship this in slice 1 as a small
global layer:

```css
@layer base {
  /* Native controls use the default arrow, not a hand. */
  button, [role="button"], summary, label, select, .control { cursor: default; }
  a[href] { cursor: default; }           /* even links, inside app chrome */

  /* Chrome isn't text-selectable; content is. */
  :root { user-select: none; -webkit-user-select: none; }
  .selectable, .prose, .cm-editor, [contenteditable], input, textarea { user-select: text; -webkit-user-select: text; }
}
```

- **Hover policy:** apply state layers (below) to `[role="row"]`, `[role="menuitem"]`, list items —
  **not** to buttons/static controls. Native apps don't light up every button.
- **Fonts:** `<link rel="preload">` (or `@font-face ... font-display: swap` + preloaded weights) the
  self-hosted variable faces so first paint isn't a fallback flash.

### 2. Semantic status set (value-aware, shared)

Each status is a **role set**, Radix-style (subtle-bg / border / solid / text), authored in oklch
for light + `.dark`. Value drives color — `0 errors` is neutral, not red; `available` is positive,
not brass.

```css
:root {
  /* oklch(L C H). Solids shown; derive -subtle (↑L, ↓C), -border (mid), -text (↓L light / ↑L dark). */
  --status-active:  oklch(0.62 0.13 150);  /* healthy / available / ready  → green (aligns w/ pine teal) */
  --status-warning: oklch(0.76 0.14 75);   /* warning / stale               → amber */
  --status-error:   oklch(0.57 0.19 28);   /* error / down / failed         → red (≈ theme --destructive) */
  --status-info:    oklch(0.60 0.13 240);  /* info / running                → blue */
  --status-draft:   oklch(0.65 0.02 230);  /* neutral / draft / zero-count  → gray */
}
.dark {
  /* raise L for solids/text so they read on deep ink; keep hues */
  --status-active:  oklch(0.72 0.12 150);
  --status-warning: oklch(0.80 0.13 75);
  --status-error:   oklch(0.64 0.17 28);
  --status-info:    oklch(0.70 0.12 240);
  --status-draft:   oklch(0.70 0.02 230);
}
```
Tailwind v4 `@theme`: `--color-status-active: var(--status-active)` etc. → `bg-status-active/10`,
`text-status-error`, `border-status-warning`. Brand **brass** stays a separate *accent*, not a status.
Model reference: `references/color-material/reference-radix-colors*`; already-correct in-app example:
Overlay Agent Runtimes badges.

### 3. State layers (Material) — feedback, restrained

```css
:root {
  --state-hover:    oklch(0 0 0 / 0.05);          /* fg overlay on light surfaces */
  --state-focus:    oklch(0 0 0 / 0.07);
  --state-press:    oklch(0 0 0 / 0.10);
  --state-selected: oklch(0.70 0.11 78 / 0.16);   /* brass tint */
}
.dark {
  --state-hover:    oklch(1 0 0 / 0.06);          /* light overlay on deep ink */
  --state-focus:    oklch(1 0 0 / 0.09);
  --state-press:    oklch(1 0 0 / 0.12);
  --state-selected: oklch(0.78 0.11 80 / 0.20);
}
```
Applied via a shared `.interactive-row` recipe on rows/menuitems only (see hover policy).

### 4. Two-speed density

```css
:root { --density-row: 2.25rem; --density-control: 2rem; --density-gap: 0.5rem; } /* comfortable (Vault) */
[data-density="compact"] { --density-row: 1.75rem; --density-control: 1.6rem; --density-gap: 0.35rem; } /* operator (Overlay) */
```
Vault defaults comfortable; Overlay sets `data-density="compact"` on its shell (and dense tables).

### 5. Surfaces, glass, and native vibrancy

- **Flatten card-in-card:** one `--surface-panel` level + a hairline `--border-subtle`; get hierarchy
  from **tonal shift + spacing**, not nested cards/shadows.
- **Material = native vibrancy** for window/sidebar: Tauri `window-vibrancy`
  (`NSVisualEffectView`, e.g. `sidebar`/`under-window` material) behind the webview; make the webview
  root background transparent where vibrancy shows through.
- **CSS glass only for menus/popovers/non-vibrancy**, with the opaque `@supports` fallback already
  documented above, plus a reduce-transparency fallback.
- **No startup white-flash:** set the Tauri window `background_color` to the theme ink/paper and
  **show the window on ready** (after first paint), not on create.

### 6. Shell + responsive

One grounded **top-bar grid** (fixes Vault's detached VAULT cluster) + a sidebar/dock with a defined
**narrow-collapse**: below a breakpoint, collapse to a **single** drawer (Vault opens one panel at a
time, not both; Overlay's sidebar collapses instead of stacking the whole nav above content).

## Anti-Patterns

- Raw hex values in component files.
- Arbitrary one-off blur classes.
- Multiple unrelated shadows.
- Component-specific status colors.
- Cards inside cards.
- Decoration that hides density or reduces contrast.
- Mockup-driven layout changes that break existing workflows.

## Resolved Decisions (2026-07-06)

- **Shared vocabulary, implemented locally.** One spec (this doc + the direction brief); tokens are
  **duplicated per repo** (locked no-shared-package decision), authored identically so they can't drift.
- **Both modes stay first-class.** Archive is a dual light/dark oklch theme — no dark-only pass. The
  status set, state layers, and vibrancy are authored for both; verify contrast in each.
- **Translucency is scoped:** native **vibrancy** for the window/sidebar material; **CSS glass** for
  menus/popovers only; main content panels are **opaque flat** (one level + hairline). Both have
  opaque + reduce-transparency fallbacks.
- **Divergence = density + primary-surface layout only.** Vault comfortable/editor; Overlay
  compact/operator-table. Everything else (tokens, status, menus, chips, buttons, native-feel) shared.

## Open Questions (Phase 2 / deferred)

- How far to take the *distinctive* visual direction (glass depth, motion character) on top of this
  architecture — decided in Phase 2 with the mockups.
- Native-window tooltips/popovers and a Cmd-K command palette: worth the native complexity, or keep
  DOM popovers? (Deferred; not Phase-1.)
- Which Tauri vibrancy material per surface (sidebar vs under-window) and per-OS behavior on the
  real WKWebView path — settle during the shell slice with screenshots.

