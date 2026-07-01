# Agent-Runner — repo definition

> The trigger/execution plane. Standalone repository. This consolidates the existing trigger
> architecture into the three-repo frame; it does not duplicate it. Read alongside
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

Illustrative — its internals are not overlay doctrine (from
[`docs/trigger-system-build-plan.md`](../Agent-Overlay/docs/trigger-system-build-plan.md) Phase 3):

```
agent-runner/                   # its own git repo; depends on @overlay/* as a library
  src/
    main.ts                     # the loop / entry point
    triggers/load.ts            # read declarations via Overlay (overlay triggers list / overlay://triggers)
    watchers/schedule.ts        # cron evaluation
    watchers/file.ts            # file-created / file-changed (chokidar-style)
    watchers/http.ts            # inbound webhook listener
    dispatch.ts                 # single path: resolve binding → invoke executor against workflow
  units/
    agent-runner.service        # systemd unit (Linux / NixOS node; proven path)
    com.overlay.runner.plist    # launchd template (macOS; not yet proven as a second node)
```

Watcher modules are added in order of payoff — **schedule, then file, then http** — and every one of
them funnels into the *same* `dispatch.ts`. Adding an event source never adds an action.

## How Runner consumes Overlay

- **Trigger read seam (read-only).** Runner reads declarations through Overlay's narrow seam —
  `overlay triggers list` or `overlay://triggers[/{id}]` — exactly as a session asks "what skills
  exist?". It validates nothing of its own; `overlay validate --strict` already checks that each
  binding's `run.workflow` and `run.executor` resolve. (See [`docs/triggers.md`](../Agent-Overlay/docs/triggers.md).)
- **Execution seam.** Runner invokes a named executor — `claude-code`, `codex`, `direct`, or
  `harness` — against the named workflow, reusing `overlay run`/adapters for judgment paths and the
  `direct` adapter for the cheap deterministic path. The executor session pulls doctrine back over
  MCP and the run is captured as a trajectory via `OVERLAY_RUN_ID`. (See
  [`docs/trajectories.md`](../Agent-Overlay/docs/trajectories.md), [`docs/harness-adapters.md`](../Agent-Overlay/docs/harness-adapters.md).)

## From declaration to live state (the reconcile model)

A trigger declaration is doctrine; turning it into a running watcher or timer is the Runner's job, and
it is **pure deterministic mechanism — no LLM in the provisioning path.** The pipeline is
**parse → validate → reconcile**:

1. **Parse / validate** happen in Overlay. The declaration is schema-validated (`TriggerSchema` +
   `validateTriggerRefs`) before the Runner ever sees it; the Runner consumes already-valid JSON via
   the read seam and never interprets prose. (An LLM may help a human *author* a declaration in Vault,
   but that output is validated like any other write — it is never in the materialization path.)
2. **Reconcile** is the Runner's deterministic step: read desired state (the declarations), make actual
   state match — start new watchers, stop removed ones, install/remove projected units. It is
   **idempotent**: run it repeatedly, it converges. Triggered by `agent-runner sync`, on start, and on
   change — the Runner's first watcher watches the trigger source itself.

**Two materializations:**

- **In-process (default).** Watchers and an internal scheduler live in the Runner daemon's memory;
  there is **no per-trigger OS artifact** — one installed service (the Runner). `file` and `http`
  triggers are *always* in-process (the OS has no "watch this folder" primitive).
- **OS-projection (optional, `schedule` only).** A `schedule` trigger can be rendered to a native
  systemd `.timer` / cron / launchd unit — deterministic templating from `{cron, workflow, executor}`
  — for schedules that must fire when no daemon is resident. This is the target model; current
  implementation has a proven systemd user unit for the daemon, while per-trigger projection and the
  launchd path remain templates/backlog. Generated units are **derived artifacts: never hand-edited**;
  edit the declaration and re-reconcile.

**Lifecycle.** The reconciler owns both *add* and *remove*, so deleting a declaration cleanly tears
down its watcher/unit — no orphans. Desired-state lives in doctrine; actual-state is reconciled to
match. It is neither "permanent" nor "recreated per event."

**What the Runner owns here** is the *mechanism* plus a little **machine-local config** (which host
honors which triggers, watch-root paths, per-host executor settings) — non-portable, so config, not
doctrine — and a thin **dispatch ledger** (append-only JSONL: "matched X, dispatched W via Z, exit
status"), distinct from the rich *trajectory* Overlay captures for the run itself.

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
- **HTTP triggers remain trusted-local unless fronted by auth.** The watcher now matches routes before
  draining request bodies, caps body size, times out slow bodies, and contains handler errors. A
  portable header/HMAC authentication contract is still future doctrine.
- **Runner-dispatched local adapters can opt into enforcement.** `agent-runner --enforce` passes
  `--enforce` through to `overlay run`, including generated cron dispatch commands.
- **The `direct` executor uses Overlay scoring.** Direct dispatch evaluates workflow predicates and
  records `predicate_results` / `score` before declaring a run complete.
- **State writes are serialized.** Runner sync holds a state-dir lock and writes manifests/cron
  fragments with temp-file-then-rename discipline before stale cleanup.
- **Projection status is narrower than the target docs.** The NixOS/systemd user unit is proven; the
  launchd path and per-trigger systemd/cron/launchd projection remain implementation backlog.

## How Runner relates to Vault

Runner's event sources are generalized **data-plane** folders — and the corpus folders Vault edits are
exactly such a source. A `capture/` (or inbox) directory in the workspace is watched by Runner: when a
note lands there (dropped by a human in Vault, or by any tool), a `file-created` trigger fires a
triage workflow. The originally-planned Agent-Vault integration becomes **one instance** of this
general pattern — Runner watching a data-plane folder and firing overlay workflows
([`docs/trigger-system-build-plan.md`](../Agent-Overlay/docs/trigger-system-build-plan.md) Phase 4). The agent's output
(e.g. a memory proposal) then surfaces back in Vault's review queue, closing the loop.

## Multi-runner, one doctrine

Because bindings are doctrine in the corpus, **two runners can read the same declarations** — systemd
on a Linux/NixOS box, launchd on a Mac — without divergence. One doctrine, many runners, the same way
the system supports one doctrine across many executors.

## Guardrails (drift detectors)

Verbatim intent from the [decisions doc](../Agent-Overlay/agent-overlay-trigger-system-decisions.md). If any of
these is violated, the model has drifted back toward a framework:

- **No built-in actions.** The Runner accumulates no capabilities of its own. The cheap, no-LLM path
  is an **executor choice** (`executor: direct`/`shell`), never a daemon feature.
- **No doctrine in the Runner.** "What happens when a file lands?" must be answerable entirely by
  reading the corpus — not by reading the Runner's source.
- **Never add `overlay watch`.** A watcher subcommand inside Overlay reverses the dependency arrow.
  The loop lives here, in its own repo.
- **No LLM in provisioning.** Declaration → watcher/unit is deterministic templating, reproducible and
  idempotent. If a model is generating system-level services, the path has stopped being mechanism.

## Non-goals (Runner)

- **Not an executor host.** Runner dispatches *to* executors; it does not implement the runtimes
  (those are Overlay's adapters / external CLIs).
- **Not a doctrine store and not an editor.** It reads bindings; it never writes the corpus.
