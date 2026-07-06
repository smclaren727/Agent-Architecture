# Reference — Raycast 2.0 "native app feel" for a web UI (deep dive)

Image: (none — text article)
Source: https://www.raycast.com/blog/a-technical-deep-dive-into-the-new-raycast
Date added: 2026-07-06
Category: motion-interaction (cross-cuts transparency-glass + implementation/shell)
Primary app target: **Both** — Vault & Overlay are web UIs in a native shell, the exact problem

## Why This Reference Matters (very high relevance)

Raycast 2.0 is a **React + TypeScript web frontend inside a native shell** (Swift/AppKit on macOS,
.NET/WPF on Windows) with a long-lived Node process and a Rust core. That is almost exactly our
stack: **Tauri native shell + React/Vite web UI + Rust server**. Their thesis — *"we're a native
app that uses web for its UI"* (not a web app with native hooks) — is precisely the "strong local
app vibes vs web app" goal. **Critical parallel: Tauri on macOS renders in WKWebView, the same
engine Raycast wraps — so their WebKit-specific tricks apply to us directly.** They also adopted
**Apple's Liquid Glass material**, validating our `transparency-glass` direction.

## Borrow — the concrete "web tells" they kill (most are cheap CSS for us)

These are the small signals that scream "website"; removing them is high-impact, low-cost:

- **No `cursor: pointer` on interactive controls.** Buttons/menu items should use the default
  arrow cursor, like every native macOS control. Web/shadcn defaults add `cursor: pointer`
  everywhere → instantly reads as a web page. **Audit and remove across Vault/Overlay.**
- **No hover highlights on most controls.** Native apps don't light up every button on hover.
  → *Refines our Material state-layer note:* use hover/state layers on **list & menu rows** (where
  hover aids navigation) but **not** on buttons/static controls. Restraint, not universal hover.
- **`user-select: none` on chrome/UI** (labels, nav, buttons). Native apps don't let you
  text-select the toolbar; web apps do. (Established complement to the article's philosophy.)
- **Popovers/tooltips as native windows, not DOM** (macOS). Advanced for us — Tauri can do
  multi-window, but it's heavy; treat as optional polish, not Phase-1.
- **Settings in a separate window, not a modal** — a native convention worth considering.
- **Liquid Glass material** on macOS — for us this means **native vibrancy behind the webview**
  (see below), the *real* way to do glass.

## Borrow — Tauri shell techniques (the "native" half)

- **Native vibrancy > CSS blur.** The authentic macOS material comes from `NSVisualEffectView`
  behind the webview, not `backdrop-filter`. Tauri exposes this (e.g. the `window-vibrancy`
  crate / window effects). **This is the correct implementation of our Liquid Glass reference** —
  use native vibrancy for the window/sidebar material; reserve CSS `backdrop-filter` as the
  fallback (and for webview contexts where vibrancy isn't available). See
  `../transparency-glass/reference-apple-liquid-glass`.
- **Kill the startup white-flash.** Raycast syncs "the WebView has finished drawing before the
  window becomes visible" (`_doAfterNextPresentationUpdate`). Tauri analog: set the window
  `background_color` to the app theme (not white), and **show the window on ready**, not on
  create, so there's no white rectangle before first paint.
- **Prewarm fonts.** They "prewarm the emoji font on startup." We self-host variable fonts via
  `@fontsource`; ensure they're preloaded so first paint isn't a fallback-font flash (FOUT).
- **Implicit Core Animation for resizes** — they replace animated `setFrame` with implicit CA to
  avoid janky window resize. Analog: keep our own panel/drawer transitions short + GPU-friendly
  (ties to the Material motion tokens) and avoid layout-thrash on resize.

## Borrow — architecture validation (we already have this)

- **Rust core for perf-critical work** (their file index/sync) — we already have Rust servers
  (Vault/Overlay). Alignment, not new work.
- **Long-lived local process owns business logic** — mirrors our Rust server owning the corpus.
- **Web UI + hot reload** — we have Vite HMR. Aligned.
- Memory cost of the hybrid: Raycast v2 ~350–450 MB (WebView 120–200 + Node 150–200 + shell 40).
  Sanity check for our own webview footprint; bounded is fine.

## Avoid

- Don't chase the *native-window popover/tooltip* rabbit hole in Phase-1 — high effort, low
  early payoff; do the cheap CSS "web tells" first.
- Don't fake Liquid Glass with heavy CSS blur if native vibrancy is available — and never at the
  cost of text legibility (our standing rule + their reason for bounded transparency).
- Don't over-animate; native feel is quiet and instant, not bouncy.

## Details To Translate Into Tokens / Recipes

- A global "chrome" base: `cursor: default` on controls, `user-select: none` on UI chrome (opt
  text back in only for content/editor/note body).
- Hover policy token: state layers apply to `[role=row]`/menuitem/listitem, not `button`.
- Window: theme-colored `background_color` + show-on-ready in the Tauri config (both apps).
- Material: native vibrancy for window/sidebar; `backdrop-filter` + opaque fallback for menus.

## Relevant App Surfaces

- **Both:** every control (cursor/hover), the app shell (vibrancy, no-flash, window bg), menus.
- Feeds **Phase-1 shell recipe** and the **transparency-glass** + **motion** token work.

## Implementation Notes

This is more implementation guidance than visual inspiration — fold the cheap CSS wins (cursor,
hover restraint, user-select, font preload) into the token/shell slice, and the vibrancy +
no-flash items into the Tauri shell config. Pairs with `transparency-glass/reference-apple-liquid-glass`
(material) and `reference-material-motion` (motion). Strongly validates the "architecture-first"
plan: several of these are shell-level and belong in Phase-1, not late polish.
