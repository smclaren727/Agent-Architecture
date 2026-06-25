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
- **Not yet wired:** a real `claude-code` / `codex` agent reaching `propose-memory`. `overlay run` does
  not yet inject MCP config into binary adapters — see the Phase 4 scope decisions in
  [../build-plan.md](../build-plan.md). That is a tracked Phase 5 item.
