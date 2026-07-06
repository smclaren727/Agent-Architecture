# Reference — Vercel dashboard / Geist (status semantics & monospace)

Image: (none yet — curated from the product; capture on request)
Source: https://vercel.com/dashboard · https://vercel.com/geist
Date added: 2026-07-06
Category: dense-operator-uis (also informs color-material)
Primary app target: **Overlay** (deployment/runner status is the closest analog to our Runner)

## Why This Reference Matters

Vercel's dashboard solves the exact problem our Overlay Automations + Dashboard have: showing
build/deploy **state** (Ready / Error / Building / Queued / Canceled) with color that is
*semantic and value-aware*. Its Geist design system also handles monospace paths, IDs, and
timestamps cleanly — which is precisely where our Runner panel wraps mid-word ("/Develo⏎per/").

## Borrow

- **Semantic status is the core borrow.** Ready=green, Error=red, Building=amber/animated,
  Queued/Canceled=neutral. The *state* drives the color, not the category. This is the fix for
  our Dashboard's "0 errors in red / available in brass" problem. (Overlay's own Agent Runtimes
  already does this well — Vercel confirms the target.)
- **Monospace metadata treatment:** paths/commit-SHAs/timestamps in mono, **truncated with
  middle-ellipsis + full value on hover**, never wrapped. Fixes the Runner path wrap.
- **Status + label pairing:** a small colored dot/badge next to a short status word, consistent
  everywhere it appears.
- **Restrained elevation:** flat bordered sections; the page is calm despite dense data.

## Avoid

- Geist is high-contrast near-black/white; don't lose our warm paper + teal identity chasing it.
- Vercel leans on subtle skeleton/shimmer loading — fine, but keep it quiet and respect
  `prefers-reduced-motion` (our motion caution).

## Details To Translate Into Tokens

- Colors: this reference + Radix Colors define the **semantic status token set**
  (`--status-active/warning/error/stale/info/draft`) shared by both apps — value-aware.
- Typography: `font-mono` for paths/IDs/timestamps; define a **truncate-middle** utility.
- Surfaces: flat bordered `panel`; status badges are the only saturated color on the page.
- Spacing/density: tight metadata rows; label→value gap much smaller than today.

## Relevant App Surfaces

- **Overlay:** Automations Runner (status, heartbeat, paths), Dashboard status cards,
  Trajectories run outcome/score, Diagnostics.
- **Vault:** Conventions severity counts (make "0 errors" neutral, not red), Health.
- **Cross-app:** the single semantic status set + monospace-truncation recipe.

## Implementation Notes

Anchor reference for **status color semantics** in Phase 1. The good news from the baseline:
Overlay's Agent Runtimes already implements this treatment, so Phase 1 is *extract + apply
everywhere*, not invent. Vercel/Radix just pin the target values.
