# Slice 3 evidence — vault switcher, management view, governed adoption (2026-07-08)

Vault commits: `55ef484` (missed wikilink test catch-up) + `55e8671` (the slice). Verified against
the scratch registry (managed `vault` + `research`, open `openvault`, plus an obsidian-style fixture)
on port 4590; no real vault data touched.

## Screenshots

| File | Proof |
| --- | --- |
| `01-themed-switcher-menu.png` | Header selector is the shared themed dropdown: radio selection, mode subtitles, divider, Add vault…/Manage vaults… bottom rows; separate pill gone. |
| `02-vaults-view.png` | New Vaults view: per-vault label/path/mode explanation/note counts/index status; default vault's Remove disabled with reason; Adopt as managed… on the open vault. |
| `03-adoption-preflight-blockers.png` | Preflight dialog: OK/REWRITE/BLOCKERS/WARNINGS summary, proposed frontmatter per rewrite, broken-YAML blocker disables Accept ("Resolve blockers first"). |
| `04-adoption-applied.png` | After fixing the blocker and accepting: files rewritten, mode flipped to managed. |

## Live API proof of the blocker repair (metadata merge)

Obsidian-style fixture (`title`/`tags`/`created`, no `id`): preflight proposed frontmatter kept
`title: My Research Topic`, both tags, and `created: 2025-03-15`, adding only `id`/`type`/`updated`
(droppedKeys: []). Apply preserved the body byte-exact and the typed lens immediately listed the
note. Fingerprint-gated apply (content hashes) 409s if the vault changes after preflight.

## Adversarial review

ACCEPT-WITH-REPAIRS with one BLOCKER, all repaired and re-validated:
1. **Blocker** — adoption originally REPLACED existing frontmatter wholesale (one Accept on a real
   Obsidian-style vault would have destroyed every note's tags/aliases/dates). Now merges: valid
   user metadata preserved, declared types respected with enum folding, duplicate-id files change
   only their id, dropped keys reported per file with current → proposed shown in the dialog.
2. Non-UTF-8 files now block adoption (previously would have been permanently rewritten with U+FFFD).
3. CRLF frontmatter blocks adoption (previously the old YAML block would nest into the body).
4. Index identity re-normalizes across mode flips (stale typed/loose rows for blank-body files).
5. VaultSwitcher refetches on open (stale menu after management operations).
6. Cross-cutting 415 documented; slugify/sha256/result-struct DRY; dot-directories excluded from
   the writing scan; `Docs/vault-management.md` added.

Reviewer-verified sound: fingerprint includes per-file content hashes (any edit/add/delete 409s),
apply refuses blockers server-side, atomic per-file writes with mode-flip-last recovery, DELETE
prunes all index tables, route matchers can't collide, OpenAPI/client/docs in sync.

## Validation (final, local)

cargo fmt/build/clippy PASS · cargo test 285/285 · npm test 99/99 · test:openapi PASS ·
openapi:lint PASS · openapi:gen:check PASS · test:web 210/210 · web:build PASS.

## Recorded limitation

Overlay proposal association for adoption decisions is not wired: the existing overlay-core
surfaces (capture, memory proposals, trajectories) have no generic accept/reject audit event, and
adding one requires Agent-Overlay changes — out of this campaign's scope per the brief. Local
accept/reject is authoritative; the adoption trail lives in the rewritten markdown + registry.
