# Item 1 — Sidecar reap-after-quit: forensics (2026-07-07)

## Live reproduction found at session start

- `agent-vault-server` pid 34879 and `agent-overlay-server` pid 34880, both **PPID 1**
  (orphaned), started 13:57, still holding 127.0.0.1:4173 + :4183 and :4180.
- Both were launched **with** the parent-PID env set (`AGENT_VAULT_PARENT_PID=34866`,
  `OVERLAY_UI_PARENT_PID=34868`); both original parents are gone (kill -0 → no such process,
  i.e. **not** PID-reuse/EPERM).
- Bundle binaries were built 13:53 the same day — **after** the watchdog commits
  (Vault 3497d9d, Overlay 66bf75a, both 07-07 09:39). Not the stale-binary trap.
- `strings` confirms the watchdog message is present in both running binaries.

## Thread-dump evidence (sample of pid 34879)

Full inventory: main thread (tokio park), 12 tokio-rt-workers, 1 wq thread,
2 notify-rs fsevents loops, 2 debounce loops. **No thread in the watchdog's 500 ms
sleep loop.** The watchdog thread is dead while the process lives.
(`scratchpad/vault-orphan-sample.txt`)

## Root cause

The watchdog detects parent death, then calls `eprintln!(...)` **before**
`std::process::exit(0)`. The sidecar's stderr is a pipe whose read end lived in the
dead parent (tauri_plugin_shell pipes and drains sidecar output). Rust std ignores
SIGPIPE, so the write fails with EPIPE — and `eprintln!` **panics** on write failure
("failed printing to stderr"). The panic unwinds only the watchdog thread
(panic=unwind), `exit(0)` is never reached, and the orphan lives forever holding the
fixed port.

## Deterministic proof (current on-disk bundle binaries, both repos)

Repro: python parent spawns the binary with PARENT_PID=<python pid> and stderr
**piped**, sleeps 4 s, dies via `os._exit(0)` without killing the child.

| binary               | stderr piped (Tauri shape) | stderr /dev/null (control) |
|----------------------|----------------------------|----------------------------|
| agent-vault-server   | child ALIVE after 6 s → orphan | child exited → reaped   |
| agent-overlay-server | child ALIVE after 6 s → orphan | child exited → reaped   |

The only variable is whether the stderr write can fail ⇒ EPIPE-panic root cause proven.
Script: `scratchpad/repro_orphan.py`.

## Fix direction

In both watchdogs: the parent-death exit path must be panic-free — best-effort
stderr write (`let _ = writeln!(...)`), and the thread must be structured so any
panic still results in process exit rather than a silently dead watchdog.
