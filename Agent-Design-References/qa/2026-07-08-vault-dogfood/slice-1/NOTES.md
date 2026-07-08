# Slice 1 evidence — core correctness + editor chrome (2026-07-08)

Vault commits: `330baf8` (vault-aware managed-note writes + immediate Notes-panel visibility +
daily-template fix) and `dc01a51` (editor chrome around authoritative autosave + Tab-indent fix +
toolbar expansion). Verified against a scratch two-managed-vault registry (`vault` + `research`)
on port 4590; no real vault data touched.

## Screenshots

| File | Proof |
| --- | --- |
| `01-research-vault-empty.png` | Research vault active, empty — the pre-fix repro scope for "No notes indexed yet." |
| `02-research-note-visible-immediately.png` | Note created while Research is active appears in the Notes panel immediately (Knowledge/Research Note Alpha), written to the research vault's directory. |
| `03-daily-conflict-409.png` | Cross-vault daily conflict surfaces as an explicit inline 409 ("Daily note already exists in vault: vault") instead of a silent wrong-vault write; autosave status "Saved automatically." also visible. |
| `04-editor-chrome-after.png` | New chrome: Delete in the note header (danger outline), no bottom action row, expanded grouped toolbar, vault-grouped tree under All-vaults. |
| `05-tab-indent-and-toolbar.png` | Live Tab-indent proof (`- first item` → Tab → `  - nested item`, marker preserved, cursor collapsed) with the autosave status beside Body/Source. |

## Live checks beyond screenshots

- Autosave (PUT) of the research-vault note rewrote `research/Knowledge/note-20260708-research-note-alpha.md` (body change on disk ~1s after typing).
- Frontmatter contains no `vault` key — the target vault is API-only.
- Task created into research + `PATCH /api/tasks/:id` rewrote `research/Tasks/task-repair-smoke.md` (`status: next`).
- Unknown/open-mode vault create targets return 400.

## Adversarial review

ACCEPT-WITH-REPAIRS; all four repairs implemented and re-validated:
1. Scoped rebuilds mark cross-vault duplicate ids invalid instead of wedging the vault's reindex on the `notes.id` primary key.
2. NotesView refetches `/api/vaults` when the active vault is missing from its cache (mid-session vault adds no longer silently create into the default vault).
3. Watcher docs are honest: roots are captured at startup; runtime-added vaults index on add + API writes, external edits there need a restart (recorded backlog).
4. `PATCH /api/tasks/:id` routes through the note's actual managed vault.

## Validation (final, local)

cargo fmt --check PASS · cargo build --release -p vault-server PASS · clippy -D warnings PASS ·
cargo test -p vault-server 269/269 · npm test 93/93 · test:openapi PASS · openapi:lint PASS ·
openapi:gen:check PASS · test:web 168/168 · web:build PASS.

## Editor-chrome half (`dc01a51`)

Second adversarial review: ACCEPT-WITH-REPAIRS; all four repairs implemented and re-verified —
autosave-failure Retry affordance + refocus self-healing, dirty-draft flush on note switch/unmount +
beforeunload guard, blank-line boundaries for standalone block inserts (HR/table/fence — fixes the
setext-heading corruption), and heading-menu focus return to the editor. Web validation: 187/187
vitest, web:build clean. Live checks: Tab-indent in real CodeMirror, HR blank-line insert, and
typing-after-heading-selection all verified in the served app.

## Recorded backlog from this slice

- Daily 409 cross-vault dead-end: offer "open the existing daily (switches vault)" instead of an error-only state.
- Watcher hot-reload for vaults registered at runtime (external-edit live watch).
- `/api/vaults` fetch failure in NotesView blocks vault-targeted create with an error rather than retrying automatically.
- Toolbar list-kind conversion (UL ↔ OL ↔ task on already-listed lines currently no-ops).
- Image/attachment toolbar action deferred until Vault has an attachment story.
