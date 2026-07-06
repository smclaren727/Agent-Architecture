# Chat Composer References

Use this folder for chat input, model/runtime selectors, permission selectors, context selectors, send controls, and transcript action rows.

## What To Look For

- How runtime/model selection is exposed.
- How permissions are named and placed.
- How much composer height is available for long prompts.
- How transcript actions appear without overwhelming the message.
- How disabled or unavailable states are explained.

## Borrow / Avoid Notes

References (2026-07-06): `reference-claude-cursor-composer`; `editor-reading/reference-cogito`
(a shipped markdown+AI editor that implements this exact composer pattern — strongest validation).

Borrow:
- Composer-first: a large auto-growing input is dominant; runtime/model + permission controls
  live in a compact toolbar row inside the composer (not four stacked full-width selects above).
  Cogito places the runtime in the panel header and profile + permission inline in the composer
  footer — do this for Vault Chat.
- Mode/permission as a small explicit control. Cogito's **graduated ladder** (Read Only → Allow
  Edits → Full Access, with icons) is a richer model than our two-state Read-only/Suggest-edits.
- Hover transcript actions (copy/retry/apply) and clear "unavailable" explanation.

Avoid:
- Auto-send on prefill; clobbering a non-empty draft; hidden permission state (hard rules).

Implementation caution:
- Vault Chat should never auto-send a prefilled prompt.
- Do not clobber a non-empty user draft.
- Suggest/apply flows should stay explicit and reviewable.

