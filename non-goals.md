# Non-goals — what we deliberately never build

> **Audience:** anyone (human or agent) about to add a feature to any plane.
> **Status:** standing guard-rails. This doc records the tempting-but-wrong extensions that would
> quietly reverse the system's invariants. If a proposed change matches an entry here, the answer
> is the listed alternative — or an explicit recorded decision amending this doc first.

These extend the invariants in [README.md](README.md) (the dependency arrow, three planes over one
corpus, library-not-framework, no second source of truth) into the specific drift risks identified
during the component-decomposition research pass (two-model adversarial review, 2026-07-22). The
unit of distribution in this system is **validated doctrine files vendored into the corpus** —
declarations, never platform code. Every entry below follows from that line.

## Never build

1. **A plugin API in Vault, or vendored view code.** Vault is a packaged app; third-party React
   views would recreate a plugin-compatibility problem, and view code carries implicit schema — the
   same defect the Phase 11 bundled-fallback rejection removed. *Alternative:* contract-driven
   typed views (Phase 11); declarative surface recipes later, only after contract-rendered views
   exist.
2. **A registry client inside `overlay serve`, or any live dependency.** No remote source is ever
   authoritative over `~/overlay/`; nothing phones home, nothing auto-updates. Fetching happens in
   an explicit CLI moment; installed files are owned by the operator and may diverge permanently.
   *Alternative:* vendor-with-preflight (an `overlay add`-shaped motion) plus an install receipt;
   updating means explicitly re-vendoring and reviewing a new diff.
3. **Executor or watcher extension points.** New trigger types and executor runtimes are platform
   code added in-tree — the Runner accumulates no capabilities and hosts no executors, and
   `overlay-core`'s adapter surface is a versioned contract, not a splice point. *Alternative:* the
   vendorable unit is the declaration (trigger YAML, adapter/profile YAML, harness scripts run
   under `--enforce` sandboxing), never the implementation.
4. **Active-on-install doctrine.** Copying files into the corpus must never start a watcher,
   replace the active policy, project a hook into a CLI, or make a tool callable. Installation and
   activation are separate operator decisions, enforced by state — not by assuming the current
   policy is strict. *Alternative:* a first-class installed-vs-active lifecycle
   ([build-plan.md](build-plan.md) → Recorded direction 2026-07-22).
5. **Distributable enforcement.** `policy_gate`, approval tokens, sandboxing, containment, atomic
   writers, and the trajectory store stay trusted platform code. A vendored policy *declares*
   constraints; the platform *enforces* them — and an imported policy is itself untrusted content
   until reviewed. *Alternative:* policies, like all doctrine, arrive quarantined and inert.
6. **Canonical memory imports, or secrets/machine-local state in doctrine.** Imported memory is
   untrusted testimony about someone else's world; it enters only as proposals through the human
   review queue. Credentials, watch roots, per-host executor settings, and state directories are
   local configuration or derived state, never portable doctrine. *Alternative:* memory-seed →
   proposal queue; secrets stay in `secret_env`/keychain resolution.
7. **Marketplace infrastructure ahead of need.** No registry service, discovery index, or payment
   rails — transport and discovery are borrowable (git URLs; existing content-agnostic registry
   formats). The differentiated, in-scope work is only the manifest + preflight + quarantine +
   receipt layer.

## How to use this doc

Cut no phase, accept no PR, and record no direction that crosses an entry here without amending
this doc first — the amendment *is* the decision record. When a proposal feels blocked by an entry,
the listed alternative is the shape the same value is allowed to take.
