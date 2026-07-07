# Small behavior/UI hardening — QA evidence (2026-07-07)

Batch closing the small behavior/UI backlog before the Rust/distribution
closure. Commits: Vault `0e0655a..e7e6c8c` (4), Overlay `69131a8..09c1b69` (2).

## 1. Sidecar reap-after-quit (the required starting item)

**Verified real and root-caused.** At session start both sidecars were live
orphans: `agent-vault-server` (pid 34879) and `agent-overlay-server`
(pid 34880), **PPID 1**, holding 127.0.0.1:4173/:4183/:4180, launched *with*
the parent-PID env by bundles built *after* the 2026-07-07 09:39 watchdog
commits — so this was not the stale-binary trap.

**Root cause (proven, not the watchdog logic):** on parent death the watchdog
detected it, then called `eprintln!` before `std::process::exit(0)`. The
sidecar's stderr is a pipe whose reader died with the Tauri shell; Rust
ignores SIGPIPE, the write fails with EPIPE, and `eprintln!` **panics** —
unwinding only the watchdog thread, so `exit(0)` never ran. A thread dump of
the live orphan showed every thread accounted for except the watchdog loop.

**Deterministic proof** (both repos' release binaries, pre-fix): a python
parent that spawns the sidecar with the parent-PID env and **piped** stderr,
then dies → child survives indefinitely; identical run with stderr on
`/dev/null` → child reaps itself in ~1s. See `sidecar-reap-repro.md` here.

**Fix (same shape in both repos):** best-effort `writeln!` (errors ignored) +
the watch loop wrapped in `catch_unwind` with `exit(0)` after it, so the reap
is guaranteed even if the thread panics. Pinned by real-binary regression
tests (`crates/*/tests/parent_death_watchdog.rs`): spawn the server against a
fake `sleep` parent, close the stderr pipe readers, kill the parent, assert
self-exit ≤10s with success. Both pass locally in ~1.2s. Adversarial-review
repairs: the loopback-denied silent-skip path was removed (a sandboxed runner
can no longer green-skip the regression), and the Vault test retries with
fresh ports to dodge the ephemeral-port reuse race.

**Real `.app` smoke:** the two *pre-existing* orphans still hold the fixed
ports and could not be terminated from the agent session (permission
classifier); the packaged-app quit smoke on the rebuilt bundles is recorded in
`sidecar-reap-smoke.txt` once the ports were released.

## 2. Vault Ask-agent prefill drop (unindexed notes)

Cause: ChatDock's prefill effect required `chatPrompt.noteId` to equal the
*active document* id; an unindexed note never loads, so the prompt was
stranded forever (and never cleared). Fix: matching notes keep today's
behavior; a prompt whose note never becomes active is consumed after a 2s
grace — draft prefilled *without* note context, never auto-sent, never
clobbering a non-empty draft, always cleared. Adversarial repair: grace raised
300ms→2000ms (slow indexed-note loads no longer lose note context) + a
mid-grace-match regression test.

## 3. Vault Workspace connecting badge

`connecting…` could persist forever (SSE bus had no timeout/retry). Now: 10s
connect timeout → `connection timed out` badge; timed-out/offline badges carry
a compact retry that recreates the EventSource. Covered by a new
`WorkspaceView.test.tsx` (stubbed EventSource + fake timers).

## 4. Vault Properties a11y

Every metadata Field control (input/select/checkbox) now has a `useId`-based
`id` with `htmlFor` on its wrapping label; `name` attributes and visuals
unchanged. New `metadataForm.test.tsx` asserts label association per variant
and id uniqueness across duplicate renders.

## 5. Overlay PingView StateCard

Loading/error paragraphs replaced with `StateCardLoading` / danger `StateCard`
+ `errorDetail` (size `row`), matching the 13 other views; success JSON,
refresh, badge, heading unchanged. PingView was the last StateCard holdout.

## Validation (all local, post-repairs)

- Vault: `cargo fmt --check` ✓ · `cargo build --release -p vault-server` ✓ ·
  `cargo clippy --all-targets -D warnings` ✓ · `cargo test -p vault-server`
  ✓ (244 lib + all integration incl. the new watchdog test) · `npm test` ✓ ·
  `npm run test:web` ✓ (20 files / 139) · `npm run test:openapi` ✓ ·
  `openapi:lint` ✓ · `openapi:gen:check` ✓ · `web:build` ✓ ·
  `npm run test:browser` ✓ (15 Playwright)
- Overlay: `cargo fmt --check` ✓ · `cargo build` ✓ · `cargo test --workspace`
  ✓ · `cargo clippy --workspace --all-targets -D warnings` ✓ · `pnpm test` ✓
  (134) · `docs:check` ✓ · `openapi:lint` ✓ · `openapi:gen:check` ✓ ·
  `build:desktop` ✓
- Codex-sandbox failures during implementation (watcher/tailer timeouts,
  loopback EPERM) were confirmed environment flakes — all pass locally.

## Intentionally not done (optional item 6)

- Structured JSON error rendering: Overlay's `errorDetail` already normalizes
  error payloads; nothing forced this.
- Mid-session theme follow: touches the vibrancy layer; not "genuinely small".
