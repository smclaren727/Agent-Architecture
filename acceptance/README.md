# Acceptance — capture → triage → review

System-level acceptance for the Phase 4 loop: a note dropped in Vault's `capture/` folder is picked
up by an Agent-Runner trigger, dispatched to a triage executor that files a memory **proposal** over
MCP, and surfaced back in Vault alongside the run's trajectory — all explainable from the corpus.

This harness is a **black box**: it spawns the Agent-Vault server and an Agent-Runner `run` loop over
one shared overlay workspace and asserts the loop through their HTTP APIs. It imports no product
repo, so the dependency arrows stay intact (Runner and Vault each depend only on Agent-Overlay;
nothing depends on the other).

## Automated run

Build the active siblings first, then run the harness from `~/Developer`:

```sh
(cd Agent-Overlay && cargo build)    # target/debug/overlay and target/debug/agent-runner (the defaults)
(cd Agent-Vault && cargo build --release -p vault-server)  # target/release/agent-vault-server (the default)
node Agent-Architecture/acceptance/capture-triage-loop.mjs
```

The harness fails fast with a `cargo build` pointer if any of the three Rust binaries (`overlay`,
`agent-runner`, or `agent-vault-server`) is missing.

A green run prints `PASS — capture → triage → review loop is live across all three planes.` and
asserts: the capture POST returns 201, a pending proposal appears in Vault, a completed trajectory is
surfaced, and the proposal links to the run that produced it.

By default the harness spawns the Rust `overlay`, `agent-runner`, and `agent-vault-server` binaries
(since the R1/R2/R3 cutovers — the acceptance matrix is now **R→R→R**); each plane's command can be
overridden per
implementation — see
[Selecting implementations](#selecting-implementations--the-acceptance__cmd-knobs).

## Manual procedure

1. Copy the Overlay template to a scratch workspace and activate the trigger:
   `cp -r Agent-Overlay/templates/default-workspace /tmp/ws`, then set `status: active` in
   `/tmp/ws/triggers/capture-triage.yaml`.
2. Start Vault over that workspace (from the Agent-Vault repo):
   `AGENT_VAULT_WORKSPACE=/tmp/ws AGENT_VAULT_DB=/tmp/agent-vault.sqlite target/release/agent-vault-server`
3. Start the Runner loop over the same workspace (from the Agent-Overlay repo), with `overlay` on
   `PATH` so the triage harness can reach `overlay serve` (a native install puts it there):
   ```sh
   target/debug/agent-runner run --workspace /tmp/ws \
     --overlay-command target/debug/overlay
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
(cd Agent-Overlay && cargo build)    # target/debug/overlay — the Rust CLI (the default)
(cd Agent-Vault && cargo build --release -p vault-server)  # target/release/agent-vault-server (the default)
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

The Overlay CLI and Vault server commands are overridable here too (no Runner in this loop) — see
[Selecting implementations](#selecting-implementations--the-acceptance__cmd-knobs).

## What this proves — and what it does not

- **Proven:** the end-to-end folder-level coordination — point Overlay's `knowledge_vaults` at a folder
  Vault manages as a loose vault, edit it in Vault, and Overlay re-indexes it — with the
  doctrine/world-knowledge boundary enforced on the retrieval surface.
- **Not exercised:** the MCP transport (the harness drives Overlay's `search` CLI, the same index the
  MCP `search-overlay` tool serves) and promotion of world-knowledge into doctrine (the human-reviewed
  propose flow, deliberately out of scope for an automated boundary check).

---

# Selecting implementations — the `ACCEPTANCE_*_CMD` knobs

Both harnesses are black boxes over the system's language-agnostic seams (HTTP, MCP, argv + exit
codes, the corpus), so the *implementation* behind each plane is selectable. Three env vars — each a
**JSON argv array** (`["command", ...args]`) — choose what gets spawned:

| Knob | Selects | Default |
|---|---|---|
| `ACCEPTANCE_OVERLAY_CMD` | the Overlay CLI (`… run` / `… serve` / `… search`) | `["<Agent-Overlay>/target/debug/overlay"]` — the Rust binary (since the R1 cutover); the harness fails fast with a `cargo build` pointer if it is missing |
| `ACCEPTANCE_RUNNER_CMD` | the Agent-Runner daemon (`… run`); capture-triage loop only | `["<Agent-Overlay>/target/debug/agent-runner"]` — the Rust binary (since the Phase 8.2 import; the pre-8.2 default was the old Agent-Runner repo's binary); same fail-fast if missing |
| `ACCEPTANCE_VAULT_CMD` | the Agent-Vault server | `["<Agent-Vault>/target/release/agent-vault-server"]` — the Rust binary (since the R3.9 cutover); same fail-fast if missing |

Arrays because the TS forms need a Node interpreter prefix (`<node>` above is the Node running the
harness, `process.execPath`); a native binary is just a one-element array, e.g.
`ACCEPTANCE_OVERLAY_CMD='["/usr/local/bin/overlay"]'`. Everything downstream is derived from these
arrays:

- the Runner's `--overlay-command` / `--overlay-arg` flags come from `ACCEPTANCE_OVERLAY_CMD`
  (first element = command, remaining elements = one `--overlay-arg` each);
- `OVERLAY_CLI_PATH` (which the dispatched triage executor wraps in a Node interpreter to re-launch
  `overlay serve`) is set **only** when `ACCEPTANCE_OVERLAY_CMD` is the two-element
  `[node, <cli.js>]` form; for any other shape it is left unset and the executor falls back to
  resolving `overlay` on `PATH` — which is what a native cutover installs.

The defaults now *are* matrix step **R→R→R** of the [Rust re-platform](../rust-migration.md): the
Rust `overlay`, `agent-runner`, and `agent-vault-server` binaries — the terminal all-Rust step,
default since the R3.9 Vault cutover.

The historical TS forms remain documented for the record. The TS Overlay CLI no longer exists on
`main` (deleted at the R1 cutover); it lives at Agent-Overlay's annotated tag **`ts-core-final`** —
build at that tag and point the knob at it. The TS Runner (`ACCEPTANCE_RUNNER_CMD='[<node>,
"<Agent-Runner>/dist/main.js"]'`) was deleted at the R2 cutover and lives only in Agent-Runner's
pre-cutover history (now archived) — check out the last pre-cutover commit, `npm install` (its `file:` dep is the
frozen `@overlay/core` dist), and `npm run build` to resurrect it. The TS Vault
(`ACCEPTANCE_VAULT_CMD='[<node>, "<Agent-Vault>/server/main.js"]'`) was deleted at the R3.9 cutover
and lives only in Agent-Vault's pre-R3.9 history (its `file:` dep was the frozen `@overlay/core`
dist; run `npm install` on that checkout to resurrect it):

```sh
ACCEPTANCE_OVERLAY_CMD='["'"$(command -v node)"'", "/path/to/ts-core-final-checkout/packages/cli/dist/index.js"]' \
node Agent-Architecture/acceptance/capture-triage-loop.mjs
```
