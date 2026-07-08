# Slice 2 evidence — creation, backlinks, conversion, picker-first (2026-07-08)

Vault commit: `af8a7e2`. Verified against the scratch two-managed-vault registry on port 4590;
no real vault data touched.

## Screenshots

| File | Proof |
| --- | --- |
| `01-convert-dialog.png` | Governed conversion dialog: target-type select, FILE MOVE preview (Knowledge → Tasks), FIELDS DROPPED, REQUIRED DEFAULTS — all before any write. |
| `02-converted-to-task.png` | After confirm: file moved to `Tasks/` on disk, `type: task` + schema default `status: inbox` in frontmatter, same id, tree/badges/Properties dock all showing the new type. |
| `03-placeholder-dialog.png` | Unresolved `[[fresh-placeholder-note]]` chip renders dashed; clicking offers explicit "Create placeholder note" (humanized title + id shown) — never silent. |
| `04-placeholder-backlink.png` | Placeholder created in the note's own vault (research/Knowledge), navigation to it, and the graph already shows the Research Note Alpha → Fresh Placeholder Note backlink edge. |

## Adversarial review

ACCEPT-WITH-REPAIRS; repairs implemented and re-validated:
1. Conversion file move is rename-first, then atomic write at the destination — every interrupted
   state self-heals by re-running the same conversion (was: converted file stranded in the old
   folder with the same-type 400 blocking recovery).
2. `daily` excluded as a conversion target (bypassed the one-daily-per-day convention and the
   canonical `daily-<date>` id).
3. Wikilink resolution semantics: failed/pending index loads classify as "unknown" (normal
   styling), never unresolved-and-creatable; failed fetches retry; chip-dialog creates update the
   known-id set without remount; saves invalidate the cache; invalid ids get an explanation
   instead of a Create button; autocomplete-create failures surface in the editor status.
4. Cheap notes: dead Rust conversion helper removed, humanize helpers consolidated, dialog marked
   as a preview, Tauri manual-path disclosure focuses its input, workspace-shell-roadmap drift fixed.

Reviewer-verified sound (no repair needed): duplicate-id exclusion + collision 409, schema-derived
field mapping/defaults (nothing invented), OpenAPI/generated-client/conformance sync, PropertiesDock
threading the note's owning vault, cross-vault wikilinks never offering "create".

## Validation (final, local)

cargo fmt/build/clippy PASS · cargo test 275/275 · npm test 94/94 · test:openapi PASS ·
openapi:lint PASS · openapi:gen:check PASS · test:web 204/204 · web:build PASS.

## Deferred to Slice 4 packaged QA

Tauri picker-first behavior (Choose folder…/Choose markdown file… primary) is gated on `isTauri`
and unit-tested, but the real packaged `.app` proof rides with the Slice 4 titlebar `.app` smoke.

## Recorded backlog from this slice

- Conversion preview tables in `noteConversion.ts` mirror server rules without a pinning test —
  drift only affects the preview (server stays authoritative), but a `dry_run` endpoint flag would
  remove the mirror.
- Nested subfolders flatten on conversion (`Knowledge/Nested/x.md` → `Tasks/x.md`) — shown in the
  preview, raises collision likelihood.
- OpenFileView pick→confirm→Open adds one click vs pick→auto-open; deliberate (confirmation-first)
  but worth revisiting with real usage.
