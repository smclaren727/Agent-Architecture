# Rust / package-closure verification — 2026-07-07

Final verification that the Node/TS backend migration is closed and the packaged apps boot from
Rust sidecars in a clean-ish local state. Run artifacts (full build/test/harness logs):
`/tmp/compound-engineering/rust-package-closure-20260707-final/` (machine-local, not durable).

Repo state at verification (all `main`, clean, synced with origin):
Overlay `09c1b69` · Vault `e7e6c8c` · Runner `3804770` · Architecture `48012c0`.

## Clean-ish preflight

- `lsof -nP -iTCP:4173 -iTCP:4183 -iTCP:4180 -sTCP:LISTEN` → no listeners.
- No orphaned `agent-vault-server` / `agent-overlay-server` processes.
- Local user data dirs exist (`~/Library/Application Support/com.agentvault.app/…`) — allowed;
  no manually exported env vars used anywhere below.

## Builds + tests (all green)

| Step | Result |
| --- | --- |
| Overlay `cargo build` | exit 0 |
| Overlay `cargo test --workspace` | exit 0 |
| Overlay `npx pnpm@10.33.2 build:desktop` (includes tsc) | exit 0 |
| Vault `cargo build --release -p vault-server` | exit 0 |
| Vault `cargo test -p vault-server` | exit 0 |
| Vault `npm run web:build` | exit 0 |
| Vault `npm run release:preflight` (staged-sidecar hash check) | exit 0 |
| Runner `cargo build -p agent-runner` | exit 0 |
| Runner `cargo test -p agent-runner` | exit 0 |

## Bundled-sidecar hash verification

- Overlay `Agent Overlay Console.app/Contents/MacOS/`:
  `agent-overlay-server` = `e32dfeb5…` and `overlay` = `b46692e0…`, both **identical** to
  `target/release/` binaries rebuilt from current source during this run.
- Vault: the bundle was stale relative to the 15:32 sidecar rebuild (bundled `89b6b6c1…` vs
  staged/release `c50975ca…`) → rebuilt via `npm run tauri build`; fresh bundle's
  `agent-vault-server` = `c50975ca…`, **identical** to staged + release binaries.
- **Trap (durable):** Vault has a stale leftover bundle under
  `src-tauri/target/release/bundle/macos/` — the live Tauri build output is the workspace-root
  `target/release/bundle/macos/`. Launch smokes must use the root-target bundle.

## Packaged-app boot/quit smoke (PASS)

Launched via `open` with no exported env vars:

- **Vault** (`target/release/bundle/macos/Agent Vault.app`): `/api/health` → `ok:true` with
  per-launch `instanceToken`, `assetPort: 4183`, `assetOrigin: http://127.0.0.1:4183`,
  overlay connected. `lsof`: pid listening on **both 4173 and 4183** is the bundled
  `agent-vault-server` (path inside the .app). Origin split live: app origin `/assets/x.png`
  → **404**; asset origin serves no API (`/api/health` → 404 there).
- **Overlay** (`target/release/bundle/macos/Agent Overlay Console.app`): `/api/health` →
  `ok:true` with `instanceToken`, `uiDir` inside the bundle's `Resources/web-dist`; the 4180
  listener is the bundled `agent-overlay-server`.
- **Graceful quit** (AppleScript `quit` to both apps): within ~4s all three ports released,
  zero orphaned sidecar processes. (Kill-9 watchdog reap separately proven earlier the same
  day — see `qa/small-behavior-ui-hardening-2026-07-07/`.)

## Cross-system acceptance harnesses (PASS, all-Rust defaults R→R→R)

- `acceptance/capture-triage-loop.mjs` → exit 0 (capture posted → proposal awaiting review,
  linked trajectory completed and surfaced by Vault).
- `acceptance/world-knowledge-loop.mjs` → exit 0 (vault edit re-read through the
  world-knowledge lens; sentinel never appears under doctrine kinds).

## Honest scope

- This is a **clean-ish local** proof, not a clean-machine proof: local user data dirs and an
  existing `~/overlay` workspace were present. The literal clean-machine boot proof rides with
  the distribution work (signed/notarized DMG, first-run setup, updater) — which remains the
  **top open backlog item, not done**.
- **Overlay GitHub CI is red on every push**: `.github/workflows/ci.yml` is still the pre-Rust
  Node pipeline (root `pnpm test`, `pnpm build:binary -- --dry-run`,
  `node packages/cli/dist/index.js --help` — all stale/deleted). Needs a decision-level rewrite
  (Rust toolchain + web build steps); deliberately **not** changed in this docs campaign.
