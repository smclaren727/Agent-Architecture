# Security + documentation audit — July 2026 (archived record)

Archived record of the July 2026 cross-repo audit of **Agent-Overlay**, **Agent-Vault**, and **Agent-Architecture** and its full remediation. Kept as the audit trail behind the changes; the working scratch directory that produced it (`~/Developer/agent-review-2026-07-16`) has been removed.

## Contents
- **`REVIEW.md`** — all 199 confirmed findings with per-finding evidence, recommendation, and reviewer verdicts.
- **`PROGRESS.md`** — the remediation ledger: every finding ticked with its resolving commit hash, plus the Phase-0 re-rank decisions, KEPT-BY-DESIGN calls, partials, and sanctioned behavior changes.

## Outcome
All 199 findings were remediated across Phase 0 → WS-A/B (security) → WS-C/D (docs) → Track-3 (dead code) → Track-4 (DRY), each fix independently reviewed on a green build and pushed to the relevant repo's `main` (2026-07-16/17). Every fix references its finding ID in the commit message, so `git log --grep=<finding-id>` in the target repo locates the exact change.

## Notable retained decisions (do not silently "re-fix")
- `openapi-fetch` devDependency in both Overlay and Vault is **KEPT-BY-DESIGN** (documented staging for a deferred fetch-client migration), not dead.
- `vault-server-domain:4` (native_chat vs native_runtime subprocess timeout) is an **intentional divergence** — caller-kills vs helper-kills, distinct buffer caps — only the identical output-join helper was shared.
- Two **sanctioned behavior changes**: the unified Unix signal-name table (`SIG<n>` fallback, corrects prior wrong Darwin literals), and `repeat_interval` now valid for tasks on note conversion (aligns conversion with the form).

## Open loose end
An unrelated Agent-Overlay `ci.yml` change (it disables push/PR CI) is parked in that repo's `git stash`. Because CI was parked, all Overlay remediation commits were verified locally, not by CI.
