# Acceptance — capture → triage → review

System-level acceptance for the Phase 4 loop: a note dropped in Vault's `capture/` folder is picked
up by an Agent-Runner trigger, dispatched to a triage executor that files a memory **proposal** over
MCP, and surfaced back in Vault alongside the run's trajectory — all explainable from the corpus.

This harness is a **black box**: it spawns the Agent-Vault server and an Agent-Runner `run` loop over
one shared overlay workspace and asserts the loop through their HTTP APIs. It imports neither product
repo, so the dependency arrows stay intact (Runner and Vault each depend only on Agent-Overlay;
nothing depends on the other).

## Automated run

Build the siblings first, then run the harness from `~/Developer`:

```sh
(cd Agent-Overlay && pnpm build)     # packages/cli/dist + packages/core/dist
(cd Agent-Runner && npm run build)   # dist/
# Agent-Vault is plain JS (needs Node 24+ for node:sqlite); no build step
node Agent-Architecture/acceptance/capture-triage-loop.mjs
```

A green run prints `PASS — capture → triage → review loop is live across all three planes.` and
asserts: the capture POST returns 201, a pending proposal appears in Vault, a completed trajectory is
surfaced, and the proposal links to the run that produced it.

## Manual procedure

1. Copy the Overlay template to a scratch workspace and activate the trigger:
   `cp -r Agent-Overlay/templates/default-workspace /tmp/ws`, then set `status: active` in
   `/tmp/ws/triggers/capture-triage.yaml`.
2. Start Vault over that workspace (from the Agent-Vault repo):
   `AGENT_VAULT_WORKSPACE=/tmp/ws AGENT_VAULT_DB=/tmp/agent-vault.sqlite npm start`
3. Start the Runner loop over the same workspace (from the Agent-Runner repo), exporting the Overlay
   CLI so the triage harness can reach `overlay serve`:
   ```sh
   OVERLAY_CLI_PATH=$PWD/../Agent-Overlay/packages/cli/dist/index.js \
   node dist/main.js run --workspace /tmp/ws \
     --overlay-command node --overlay-arg ../Agent-Overlay/packages/cli/dist/index.js
   ```
4. Drop a capture through Vault (UI "new capture", or curl):
   ```sh
   curl -XPOST localhost:4173/api/capture -H 'content-type: application/json' \
     -d '{"content":"# Capture\n\nA durable fact to triage.\n"}'
   ```
5. Watch the proposal queue and trajectories surface in Vault
   (`GET /api/memory/proposals?status=pending`, `GET /api/trajectories`).

## What this proves — and what it does not

- **Proven:** the live, cross-service loop on the deterministic `triage-capture-harness` executor.
- **Now wired (Phase 5):** `overlay run` injects MCP config into the binary adapters, so a real
  `claude-code` / `codex` agent can reach `propose-memory` — see the Phase 5 work in
  [../build-plan.md](../build-plan.md). The harness still binds the deterministic `triage-capture-harness`
  executor for determinism; a live `claude-code` / `codex` end-to-end proof remains a manual exercise.

---

# Acceptance — world-knowledge loop (Phase 5.3)

System-level acceptance for the Phase 5.3 boundary: Overlay serves an arbitrary markdown folder as
**world-knowledge** through the single search lens (distinct from doctrine), Vault edits a file in that
*same* folder as a loose vault, Overlay re-reads the edit, and world-knowledge **never silently becomes
doctrine**.

Like the capture loop, this harness is a **black box**: it spawns the Agent-Vault server and the built
Overlay CLI over one shared folder and asserts through their interfaces (Vault HTTP API + Overlay
`search` stdout). It imports neither product repo.

## Automated run

Build Overlay first, then run the harness from `~/Developer`:

```sh
(cd Agent-Overlay && pnpm build)     # packages/cli/dist + packages/core/dist
# Agent-Vault is plain JS (needs Node 24+ for node:sqlite); no build step
node Agent-Architecture/acceptance/world-knowledge-loop.mjs
```

A green run prints `PASS — world-knowledge loop is live across both planes.` and asserts five proof
points:

1. **world-knowledge served** — `overlay search "<token>" --kind world-knowledge` returns the kv file
   with a `knowledge://` URI.
2. **distinct from doctrine** — the same query with no `--kind` (the doctrine default) excludes it.
3. **Vault edits the kv folder** — `PUT /api/vaults/kv/files/notes/standards.md` writes the loose note
   (2xx) and re-indexes that vault.
4. **Overlay re-reads the edit** — `overlay search "<new-token>" --kind world-knowledge` returns the
   updated content (Overlay rebuilds its index per search).
5. **boundary holds** — the new token never appears under the doctrine default nor an explicit doctrine
   kind (`--kind memory-fact`); a Vault `GET /api/search?...&vault=kv` cross-check confirms the edit.

## What this proves — and what it does not

- **Proven:** the end-to-end folder-level coordination — point Overlay's `knowledge_vaults` at a folder
  Vault manages as a loose vault, edit it in Vault, and Overlay re-indexes it — with the
  doctrine/world-knowledge boundary enforced on the retrieval surface.
- **Not exercised:** the MCP transport (the harness drives Overlay's `search` CLI, the same index the
  MCP `search-overlay` tool serves) and promotion of world-knowledge into doctrine (the human-reviewed
  propose flow, deliberately out of scope for an automated boundary check).
