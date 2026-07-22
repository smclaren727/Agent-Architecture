# AGENTS.md — Agent-Architecture

This repository is the **system-level documentation home** for the three-plane system
(**Agent-Overlay** · **Agent-Vault** · the Overlay-shipped **Agent-Runner** daemon; the old
Agent-Runner repo is archived since Phase 8.2). It holds the architecture and the build plan, and it
contains **no code**.

## Contents

- `README.md` — the whole-system architecture (three planes over one corpus; the dependency arrow).
- `agent-overlay.md`, `agent-vault.md`, `agent-runner.md` — per-plane role definitions.
- `build-plan.md` — the phased, multi-repo build plan.
- `non-goals.md` — the standing do-not-build list: tempting extensions that would reverse the invariants.
- `rust-migration.md` — the Node/TypeScript → Rust re-platform campaign (crate layout, cutover gates, risks).
- `openapi-contracts.md` — the OpenAPI 3.1 API-contract seam across the three HTTP surfaces.
- `overlay-ui-replatform.md`, `phase-5-knowledge-vaults.md` — completed-phase records, kept as history.
- `acceptance/` — the cross-system acceptance harnesses.

## Language & tooling

- **Markdown only.** No build, no tests, no dependencies.

## Operating rules

- **Docs describe; they never diverge from the code.** If the implementation in a product repo
  changed, update the doc here to match — do not let it drift.
- Prose should be **clear and well-reasoned, not clever**; concrete over abstract.
- **DRY:** each doc owns its scope — role docs cover one repo, `README.md` covers the system,
  `build-plan.md` covers phasing. Link rather than restate; don't duplicate content across docs.
- **Small commits, concise messages** — one documented change each.
- **Link discipline:** links *between these docs* are relative; cross-repo references are GitHub URLs
  into the product repos (e.g. Agent-Overlay) and resolve once that repo is pushed.

## Invariants to preserve when editing

Edits must not contradict the load-bearing rules these docs exist to record:

- **The dependency arrow never reverses:** Vault and Runner depend on Overlay; Overlay depends on
  neither.
- **Three planes, one corpus:** Vault edits, Overlay serves, Runner acts — over one plain-file source
  of truth; nothing derived is authoritative.
- **Library, not framework**, and **no second source of truth** (edit in place; promote via review).

The tempting-but-wrong extensions of these rules are enumerated in `non-goals.md` — consult it
before documenting any new capability, and amend it (explicitly) rather than drift past it.

## Scope

This repo is documentation. Implementation belongs in the product repos — do not add code here.
