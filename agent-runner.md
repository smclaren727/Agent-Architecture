# Agent-Runner — role definition

> The trigger/execution plane. **Repo home migrated (Phase 8.2, slices 1–3 shipped):** the
> crate is hosted at [`Agent-Overlay/crates/agent-runner`](../Agent-Overlay/crates/agent-runner) as an
> Overlay-shipped daemon binary — the Overlay desktop app bundles it as a sidecar and its console
> prefers the bundled binary (operator override preserved), while
> `cargo build --release -p agent-runner` remains the standalone remote/headless artifact. The old
> Agent-Runner repo is an archived historical pointer, frozen read-only; its README redirects here
> and to Overlay. Everything below about the Runner's *role* — a separate daemon process,
> machine-local state, no doctrine — is unchanged by the move. This consolidates the
> existing trigger architecture into the three-plane frame; it does not duplicate it. Read alongside
> [`docs/trigger-system-build-plan.md`](../Agent-Overlay/docs/trigger-system-build-plan.md) and
> [`agent-overlay-trigger-system-decisions.md`](../Agent-Overlay/agent-overlay-trigger-system-decisions.md).

## Role: the loop, and nothing else

Agent-Runner is `main()`. It is the standalone process that **decides *when* work runs** — via cron,
file-watch, HTTP, or manual invocation — and then dispatches. It owns the loop, **holds no doctrine**,
and depends on Overlay as a library. A trigger system *is* the loop, and the loop belongs outside the
overlay by design: putting a watcher/timer daemon inside Overlay would convert a library-you-call into
a framework-that-runs-you, the exact inversion the project rejects
([decisions doc](../Agent-Overlay/agent-overlay-trigger-system-decisions.md), Decision 1).

The Runner has a **single dispatch path** and no actions of its own:

```
resolve trigger binding  ──▶  invoke named executor against named workflow
```

That is the whole job. Everything the Runner can *do* is expressed as portable doctrine in the
corpus (a workflow + an executor choice), never as a built-in capability of the daemon.

## Repo shape

Illustrative — its internals are not overlay doctrine (module roles from
[`docs/trigger-system-build-plan.md`](../Agent-Overlay/docs/trigger-system-build-plan.md) Phase 3;
Rust crate layout since the Phase 6 / [R2](rust-migration.md) re-platform; hosted in the
Agent-Overlay workspace since the Phase 8.2 slice-1 import, with fixtures under
`crates/agent-runner/tests/fixtures/` and unit templates under `units/runner/` there):

```
Agent-Overlay/                  # the crate's home since Phase 8.2 slice 1; overlay-core is
  crates/agent-runner/          #   an in-workspace sibling (the arrow still points at Overlay)
    src/
      main.rs                   # thin argv/exit shim; cli.rs wires the loop / entry point
      triggers/load.rs          # read declarations via Overlay (rmcp client on overlay://triggers)
      watchers/schedule.rs      # cron evaluation (15 s in-process poll, minute granularity)
      watchers/file.rs          # file-created / file-changed (1 s recursive mtime+size polling scan)
      watchers/http.rs          # inbound webhook listener (loopback; per-trigger auth)
      dispatch.rs               # single path: resolve binding → invoke executor against workflow
      reconcile.rs              # sync: state-dir manifest + cron/systemd/launchd unit projection
      crontab.rs                # explicit live-crontab flow (cron preview/status/install/remove)
    tests/fixtures/             # golden tables captured from the pre-port TS implementation
  units/runner/
    overlay-runner.service      # systemd unit (Linux / NixOS node; proven path)
    com.overlay.runner.plist    # launchd template (macOS; plist-lint-proven, bootstrap operator-run;
                                #   not yet proven as a second node)
```

Watcher modules are added in order of payoff — **schedule, then file, then http** — and every one of
them funnels into the *same* `dispatch.rs`. Adding an event source never adds an action.

## How Runner consumes Overlay

- **Trigger read seam (read-only).** Runner reads declarations through Overlay's narrow seam —
  `overlay triggers list` or `overlay://triggers[/{id}]` — exactly as a session asks "what skills
  exist?". It validates nothing of its own; `overlay validate --strict` already checks that each
  binding's `run.workflow` and `run.executor` resolve. (See [`docs/triggers.md`](../Agent-Overlay/docs/triggers.md).)
- **Execution seam.** Runner invokes a named executor — `claude-code`, `codex`, `direct`, or
  `harness` — against the named workflow, reusing `overlay run`/adapters for judgment paths and the
  `direct` adapter for the cheap deterministic path. The executor session pulls doctrine back over
  MCP and the run is captured as a trajectory via `OVERLAY_RUN_ID`. Both dispatch paths stamp the
  exact trigger id onto the captured trajectory (`overlay run --trigger-id`; metadata `trigger_id`),
  so run history joins back to the firing trigger without guessing from the workflow. (See
  [`docs/trajectories.md`](../Agent-Overlay/docs/trajectories.md), [`docs/harness-adapters.md`](../Agent-Overlay/docs/harness-adapters.md).)

## From declaration to live state (the reconcile model)

A trigger declaration is doctrine; turning it into a running watcher or timer is the Runner's job, and
it is **pure deterministic mechanism — no LLM in the provisioning path.** The pipeline is
**parse → validate → reconcile**:

1. **Parse / validate** happen in Overlay. The declaration is schema-validated (the `Trigger` schema +
   `validate_trigger_refs`) before the Runner ever sees it; the Runner consumes already-valid JSON via
   the read seam and never interprets prose. (An LLM may help a human *author* a declaration in Vault,
   but that output is validated like any other write — it is never in the materialization path.)
2. **Reconcile** is the Runner's deterministic step: read desired state (the declarations), make actual
   state match — start new watchers in the daemon or install/remove projected units. It is
   **idempotent**: run `agent-runner sync` repeatedly and it converges. The daemon also reconciles
   **continuously**: `agent-runner run` re-reads the trigger seam on a poll (default 30 s;
   `--reload-interval`, SIGHUP forces an attempt) and replaces watchers per event class — unchanged
   classes keep their state, a failed reload keeps the last-good set and surfaces the error, and
   in-flight dispatches are never aborted. `sync` remains the explicit step for the manifest and the
   cron projection. (Semantics in the [Runner manual](../Agent-Overlay/docs/runner.md) → "Live trigger
   reload".)

**Two materializations:**

- **In-process (default).** Watchers and an internal scheduler live in the Runner daemon's memory;
  there is **no per-trigger OS artifact** — one installed service (the Runner). `file` and `http`
  triggers are *always* in-process (the OS has no "watch this folder" primitive). The in-process
  watchers are **polling**, not OS event subscriptions: `schedule` polls every 15 seconds at minute
  granularity (each trigger fires at most once per matching minute), and `file` runs a recursive scan
  every second comparing each file's mtime and size against the previous scan.
- **OS-projection (optional, `schedule` only).** A `schedule` trigger can be rendered to a native
  unit — deterministic templating from `{cron, workflow, executor}` — for schedules that must fire
  when no daemon is resident. **Implemented today: cron fragments, per-trigger systemd
  `.timer`/`.service` pairs, and per-trigger launchd plists** — `agent-runner sync --unit-target
  <cron|systemd|launchd>` writes the generated units under the state directory (derived files),
  every projected unit dispatches through the same `agent-runner … dispatch <trigger-id>` path,
  and every sync sweeps generated units whose triggers are gone (across all unit dirs, so target
  switches leave no orphans). Unprojectable triggers (invalid cron, launchd calendar expansion
  over the cap, unrepresentable arguments) are skipped with recorded sync warnings rather than
  failing the reconcile. Installing generated units into the live system stays an explicit
  operator step: `agent-runner cron install|remove|preview|status` manages one marker-delimited,
  backed-up block in the user crontab (never touched by `sync`), while systemd/launchd unit
  installation remains manual (copy/symlink + `systemctl --user`/`launchctl`). Generated units are
  **derived artifacts: never hand-edited**; edit the declaration and re-reconcile. **Run-mode and
  an installed schedule projection are mutually exclusive per state directory** — an installed
  unit plus the in-process schedule watcher would double-dispatch the same trigger, so
  `agent-runner run` warns when the state dir's manifest records any `unit_target` other than
  `none` (see the [Runner manual](../Agent-Overlay/docs/runner.md)).

**Lifecycle.** The reconciler owns both *add* and *remove*, so deleting a declaration cleanly tears
down its watcher/unit — no orphans. Desired-state lives in doctrine; actual-state is reconciled to
match. It is neither "permanent" nor "recreated per event."

**What the Runner owns here** is the *mechanism* plus a little **machine-local config** (which host
honors which triggers, watch-root paths, per-host executor settings) — non-portable, so config, not
doctrine — and its **machine-local derived state**: the state directory's `manifest.json` of
reconciled triggers/units and the per-slot `owner.json` lock records under `dispatch-locks/`. The
audit record of a run is the rich *trajectory* Overlay captures; the Runner keeps **no dispatch
ledger of its own** (a thin append-only dispatch log was once planned and remains unimplemented).
That derived state is also the Runner's **machine-readable inspection contract** for external
operator tooling: `agent-runner status [--json]` reports the state dir, manifest, and the daemon's
`runtime.json` snapshot (live-reload interval, heartbeat interval and last-heartbeat stamp, reload
count, last reload time/error, active trigger counts) offline, plus a `liveness` verdict on that
snapshot — the daemon heartbeats `runtime.json` on its own ticker independent of trigger reload, and
`status` grades the heartbeat's age (fresh/stale/missing/malformed, with a dead-pid probe as a
downgrade-only signal), so a `runtime.json` that outlives a dead daemon is detected within seconds
rather than trusted indefinitely. `sync --json` emits the structured reconcile result — this is how
Overlay's console Automations surface reads and actuates the Runner (as a configured subprocess; the
arrow still points at Overlay, never back).

**Reliability is policy-in-doctrine, enforcement-in-Runner.** `debounce_ms` and `max_concurrency` are
*declared on the trigger* (portable doctrine), then enforced by the Runner so a different runner reads
the same knob and honors it the same way. An absent debounce means no debounce window; an absent
concurrency cap means one in-flight run per trigger.

## Current hardening status

These Runner-specific review items are now part of the implementation contract:

- **Dispatch concurrency is bounded by trigger id.** File, HTTP, and schedule watchers all pass through
  one dispatch gate that enforces `debounce_ms` and `max_concurrency`; excess busy firings coalesce
  into one pending run. Generated cron dispatch commands carry the reconciled state directory and use
  process slots there to avoid cross-process overrun.
- **Webhook authentication is doctrine, enforced fail-closed.** An `http` trigger may declare
  `on.auth` (`scheme: header` or `hmac-sha256`; the secret comes from a daemon-environment
  `secret_env`, never the corpus) — the declaration format is Overlay doctrine
  ([`docs/triggers.md`](../Agent-Overlay/docs/triggers.md)). The watcher enforces it with
  constant-time comparison before firing: mismatches get `401`, and an unset or empty secret env var
  fails closed with `503` — misconfigured, never served unauthenticated. The watcher also matches
  routes before draining request bodies, caps body size, times out slow bodies, contains handler
  errors, and binds loopback only — network exposure means fronting the daemon with a reverse proxy
  or Tailscale.
- **The OpenAPI contract is generated from live routes only.** `agent-runner openapi` loads triggers over
  the same Overlay seam as `triggers list`, filters to active `http` triggers, and emits one path per
  declared route/method/auth pair; inactive HTTP triggers and non-HTTP triggers are intentionally absent.
- **State-directory locks have explicit staleness rules.** Dispatch slots
  (`dispatch-locks/<trigger-id>/<n>.lock`) and the sync lock (`.sync.lock`) are directory locks with
  `owner.json` pid records; staleness is judged by a dead-pid probe plus mtime grace windows, and
  stale locks are reclaimed with a single retry. The verbatim on-disk contract lives in the
  [Runner manual](../Agent-Overlay/docs/runner.md) ("State-directory lock protocol").
- **Run-mode and an installed schedule projection are mutually exclusive per state directory.**
  An installed unit (cron, systemd, or launchd) plus the in-process schedule watcher would
  double-dispatch the same trigger; `agent-runner run` warns when the manifest records any
  `unit_target` other than `none`, `cron install` warns when a fresh daemon heartbeat is
  present, and `sync --unit-target none` removes the projection.
- **Runner-dispatched local adapters can opt into enforcement.** `agent-runner --enforce` passes
  `--enforce` through to `overlay run`, including generated cron dispatch commands.
- **Non-direct dispatch output is drained but bounded.** When Runner shells out to `overlay run`, it
  drains child stdout/stderr concurrently so large output cannot block dispatch, but retains only a
  64 KiB diagnostic tail in Runner errors because Overlay owns the full trajectory logs.
- **The `direct` executor uses Overlay scoring.** Direct dispatch evaluates workflow predicates and
  records `predicate_results` / `score` before declaring a run complete.
- **State writes are serialized.** Runner sync holds a state-dir lock and writes manifests/cron
  fragments with temp-file-then-rename discipline before stale cleanup.
- **Projection generation is complete; live installation is deliberately operator-gated.** All
  three unit targets generate deterministically (`sync --unit-target cron|systemd|launchd`,
  golden-pinned bytes). Live installation: cron has the explicit managed flow (`agent-runner cron
  preview|status|install|remove`, marker-delimited block, backup-before-write, byte-idempotent);
  systemd/launchd unit installation and the daemon's launchd bootstrap remain manual operator
  steps. The daemon's NixOS/systemd user unit is proven end-to-end; the launchd daemon template
  is plist-lint-proven (a macOS-gated test lints shipped templates and a generated trigger plist)
  but not yet proven as a running second node.

## How Runner relates to Vault

Runner's event sources are generalized **data-plane** folders — and the corpus folders Vault edits are
exactly such a source. A `capture/` (or inbox) directory in the workspace is watched by Runner: when a
note lands there (dropped by a human in Vault, or by any tool), a `file-created` trigger fires a
triage workflow. The originally-planned Agent-Vault integration becomes **one instance** of this
general pattern — Runner watching a data-plane folder and firing overlay workflows
([`docs/trigger-system-build-plan.md`](../Agent-Overlay/docs/trigger-system-build-plan.md) Phase 4). The agent's output
(e.g. a memory proposal) then surfaces back in Vault's review queue, closing the loop.

## Multi-runner, one doctrine

Because bindings are doctrine in the corpus, **multiple runners can read the same declarations** —
for example systemd on a Linux/NixOS box and launchd on a Mac — without doctrine divergence. The
proven everyday topology is still one active runner/state directory per responsibility, to avoid
double-firing the same trigger; additional machines should split responsibility deliberately or remain
operator-managed until a future multi-node coordination design exists.

## Guardrails (drift detectors)

Verbatim intent from the [decisions doc](../Agent-Overlay/agent-overlay-trigger-system-decisions.md). If any of
these is violated, the model has drifted back toward a framework:

- **No built-in actions.** The Runner accumulates no capabilities of its own. The cheap, no-LLM path
  is an **executor choice** (`executor: direct` or a test harness), never a daemon feature.
- **No doctrine in the Runner.** "What happens when a file lands?" must be answerable entirely by
  reading the corpus — not by reading the Runner's source.
- **Never add `overlay watch`.** A watcher subcommand inside Overlay reverses the dependency arrow.
  The loop lives in the separate `agent-runner` daemon/crate, not inside the Overlay server process.
- **No LLM in provisioning.** Declaration → watcher/unit is deterministic templating, reproducible and
  idempotent. If a model is generating system-level services, the path has stopped being mechanism.

## Non-goals (Runner)

- **Not an executor host.** Runner dispatches *to* executors; it does not implement the runtimes
  (those are Overlay's adapters / external CLIs).
- **Not a doctrine store and not an editor.** It reads bindings; it never writes the corpus.
