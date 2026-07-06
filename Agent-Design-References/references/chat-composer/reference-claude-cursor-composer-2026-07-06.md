# Reference — Claude & Cursor (AI chat composer & controls)

Image: (none yet — curated from the products; capture on request)
Source: https://claude.ai · https://cursor.com
Date added: 2026-07-06
Category: chat-composer
Primary app target: **Vault** (right-dock Chat)

## Why This Reference Matters

Vault's Chat dock is the surface the baseline called out as cramped: four full-width stacked
selectors (runtime / profile / context / permission) eat the dock height, leaving a short
single-line composer at the very bottom — bad for the stated long-prompt use case. Claude and
Cursor are the reference-grade examples of composers that keep a **generous input area** while
exposing model/permission controls compactly *inline on the composer*, plus clean transcript
action rows and streaming/tool affordances.

## Borrow

- **Composer-first layout:** a large, auto-growing multiline input is the dominant element;
  controls live in a compact **toolbar row inside the composer** (model picker, mode/permission,
  attach/context), not as four stacked full-width selects above it.
- **Inline model/runtime selector** (small pill/dropdown in the composer footer) — collapses our
  runtime+profile into one compact control.
- **Mode/permission as a small labeled toggle** (Cursor's Ask/Agent, Claude's tool settings) —
  maps to our Read-only / Suggest-edits. Keep it explicit and visible (governance requirement).
- **Transcript action rows on hover** (copy, retry, apply) that don't overwhelm the message —
  maps to our Open-run / Capture / apply-suggestion actions.
- **Clear unavailable/disabled explanation** near the composer (Cursor explains when a model/
  tool is unavailable) — improves on our "Agent backend not configured" callout placement.
- **Streaming + tool-call affordances** rendered inline in the transcript, calm and legible.

## Avoid

- Don't auto-send or mutate a draft: **prefill must never auto-send; never clobber a non-empty
  draft; apply stays explicit** (hard governance rule from the references + slice-4 validation).
- Don't hide the permission/mode control behind polish — it must stay obvious.
- Avoid heavy composer chrome; keep it quiet so long prompts read cleanly.

## Details To Translate Into Tokens

- Surfaces: `--composer-bg` (subtle raised) with a focus ring; toolbar row uses ghost buttons.
- Spacing/density: **min composer height** token (multi-line by default) + max before scroll.
- Controls: compact select/toggle recipes reused from the shared menu recipe.
- Motion: quiet streaming caret; reduced-motion safe.

## Relevant App Surfaces

- **Vault:** right-dock Chat composer, runtime/profile/context/permission controls, transcript
  action rows, suggestion cards, unavailable/backend-not-configured state.
- **Cross-app:** compact select/toggle + button recipes shared with the menu system.

## Implementation Notes

Anchor reference for **Slice 4 (Chat & composer)**. Layout/ergonomics change only — governance
behavior (no auto-send, no draft clobber, explicit apply) is fixed and must be preserved.
