# Chat/composer polish — baseline walk (2026-07-06)

Served build verified: `static/index-Dqo0L0JH.js` (Vault main `9f1933a`), byte-identical to
`web/dist`. Fixture: seeded QA vault + template overlay workspace. Theme: dark (system).

## Turn-capability setup used (config gaps, honestly)

Out of the box this environment has NO turn-capable profile: `/api/agent/status` returns
`no-turn-capable-profile` (claude-code/codex profiles: `missing-overlay-cli`; default direct
profile: no model/key). For live-safe turn captures the walk used a mock OpenAI-shaped provider
on `127.0.0.1:4497` (SSE + JSON), wired via a scratch copy of the template workspace
(`adapters.direct.base_url` override + `model: qa-mock-model` on the default profile). No real
provider was called; no secrets involved.

## Captures

- `chat-desktop-initial` — right dock on Info tab (reference for tab treatment)
- `chat-desktop-empty` — Chat tab, read-only, missing-config notice, bare "No messages yet."
- `chat-desktop-suggest` — permission select on Suggest edits
- `chat-convention-prefill` — Ask-agent prefill from a dangling-reference finding (draft
  populated with the structured finding text)
- `chat-streaming` — mid-stream assistant turn
- `chat-response-suggestion` — reply + suggestion card (Applies to / replacement / Copy / Apply)
- `chat-apply-confirmation` — Apply armed: Confirm/Cancel swap (cancelled; no mutation)
- `chat-narrow-760` — Chat tab in the narrow overlay drawer

## Flow map / observations feeding the slices

1. CONTROL STRIP: four stacked full-width selects (runtime / profile / context / permission) +
   Related chunks checkbox + Plan workflow button consume ~300px of dock height before the
   transcript. Permission lives four rows away from Send. (Slice 1/2)
2. EMPTY STATE: bare "No messages yet." in a tall empty box; no next-action hint. (Slice 1)
3. TRANSCRIPT RHYTHM: user and assistant entries carry near-equal visual weight; assistant
   metadata (run id · Open run · Capture) reads as part of the message body. (Slice 1)
4. COMPOSER: ~150px fixed textarea, Send alone bottom-right, no sending/streaming state on the
   button; no permission indicator near Send. (Slice 2)
5. PREFILL: works from findings on indexed notes but is visually unmarked (no "prefilled"
   affordance) and the draft does NOT survive a drawer close/reopen (remount loses it — the
   transcript persists via localStorage, the draft does not). (Slice 2; persistence change only
   if it stays purely local UI state)
6. SUGGESTION CARD: functional; replacement renders as raw text block; explanation, target line,
   and actions run together. Confirm/Cancel governance verified live (no auto-apply). (Slice 3)
7. MISSING CONFIG: the amber "Agent backend not configured" notice is reasonable but static —
   no per-profile detail (status API has rich unavailableReason data) and no refresh. (Slice 4)

## Known flow gap (recorded, not a polish target)

"Ask agent" on a finding whose note is NOT indexed (e.g. invalid frontmatter) navigates to a
"Note not found" editor and the prefill is dropped. The finding row already warns about id
resolution; fixing the prefill-through-unindexed path is behavior work outside this campaign.
