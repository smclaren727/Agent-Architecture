# Overlay UI re-platform — Electron → local web app behind a view-seam

> **Superseded — history (2026-07-02).** This records the Electron→web-app re-platform delivered
> 2026-06-27. Its `node:http` backend was later re-platformed to Rust in the
> [Rust migration](rust-migration.md) (`apps/desktop`'s server → `crates/overlay-console`, axum;
> `@overlay/core` → the `overlay-core` crate); the React view-seam is unchanged. Read the below as history.

**✅ STATUS (2026-06-27): COMPLETE.** Electron is fully removed; `apps/desktop` is now a local web app —
a `node:http` server (`server/`, serving `web/dist` + the `/api/*` surface + SSE on `/api/events`) and a
Vite + React + TS + Tailwind + shadcn view-seam (`web/`) sharing Vault's "Archive" theme. All 14 feature
surfaces migrated; the `update` feature dropped; native dialogs → path inputs; `electron-store` → a JSON
settings file. Commits: 1 `d7d41f6`, 2 `1fb5a28`, 3 `b0c4d06`/`aaadd03`/`342c01f`/`7226929`/`a73f3c4`/
`1f6e438`, 4a `db22129` (remove Electron), 4b `82f3a13` (relocate cores + cleanup). Suite 242, web
Playwright smoke, and the cross-repo acceptance harness all green; Tauri-ready. Minor leftovers:
`scripts/prepare-desktop-cli.mjs` + `apps/desktop/resources/cli` are orphaned (harmless); `contract.ts`
retains a few Electron-era types still used by `core/store`.

Re-platform Agent-Overlay's desktop UI off Electron onto the same local-web-app pattern Agent-Vault
landed in Phase 5.0 (Vite + React + TS + Tailwind + shadcn, a view registry + router + shared context,
served by a local `node:http` server over `/api/*`), and **remove Electron entirely**. This is the
prerequisite for the eventual Tauri V2 wrap, and it tightens Overlay's UI the way the 5.0 seam tightened
Vault's.

## Grounding (current state)

`apps/desktop` is an Electron app whose **backend is already modular** but whose **frontend is a
monolith**:

- **Backend / main process — already a seam.** `src/main/features/feature-registry.ts` lists 14
  self-contained features (`ping`, `workspace-picker`, `workspace-tail`, `memory`, `trajectory`,
  `eval-reports`, `canonical-files`, `diagnostics`, `export`, `run-launch`, `dashboard`, `theme`,
  `update`, `cli`), each with its own `ipc.ts` exposing a `register(context)`, a typed `IPC_CHANNELS`
  contract (`shared/ipc-contract.ts`), and react-query-style `invalidationKeys` (`shared/feature-modules.ts`).
- **Frontend / renderer — the monolith.** One `src/renderer/app.tsx` (~2,700 lines) + one UI primitive
  (`components/ui/button.tsx`), but it **already uses `@tanstack/react-query`** with per-feature query
  keys, calling a typed `OverlayApi` exposed over the preload `contextBridge`.
- **Electron is the transport + shell.** `ipcRenderer.invoke` for request/response, `on*` events for
  streams (file-tail, run-launch output, export output, file-change, theme/update status), plus native
  dialogs, `electron-store`, and `electron-updater`.

So this is a **transport swap + a renderer decomposition + Electron deletion**, not a green-field rewrite.
The `OverlayApi` / `IPC_CHANNELS` + `invalidationKeys` are effectively the spec for the `/api/*` routes.

## Decisions (locked with the human, 2026-06-27)

- **Target the Vault pattern.** `apps/desktop` keeps its directory name (it's just Overlay's own UI — no
  sub-brand); its contents become `server/` (a `node:http` server: `/api/*` routes + SSE, reusing the
  existing feature logic) + `web/` (Vite + React + TS + Tailwind + shadcn behind a view-seam, built to
  `web/dist`, served by the server). The legacy "desktop" name is a mild post-Electron misnomer, kept for
  zero rename churn; renameable later.
- **IPC → HTTP/SSE, mechanically.** Each feature's `register()` binds HTTP routes instead of IPC
  channels; each `on*` event stream becomes **SSE** (the proven `/api/*/events` pattern from Vault). The
  renderer's `lib/ipc.ts` becomes `lib/api.ts` — an HTTP+SSE client implementing the same `OverlayApi`
  interface — so the react-query hooks keep working; only the fetcher underneath changes.
- **Renderer monolith → view-seam.** `app.tsx` is decomposed into a `ViewDescriptor` registry + router +
  shared context, one view module per feature surface, exactly like Vault 5.0.
- **Copy Vault's "Archive" theme** (tokens + shadcn/Tailwind setup) into Overlay so the two apps are one
  product family. **No** cross-repo shared UI package (the repos stay independent; revisit only if it
  earns its keep).
- **Keep the `cli`-installer feature** (server-shelled "install `overlay` CLI to PATH").
- **Remove all Electron:**
  | Removed | Replaced by |
  |---|---|
  | `electron`, `electron-builder`, `electron-vite` | `vite` + a Node server entry / start script |
  | `src/main/index.ts` (BrowserWindow), `src/preload/` | the HTTP server + web `lib/api.ts` |
  | `electron-store` | a small JSON settings file (last/recent workspaces, theme) — like Vault's `vaults.json` |
  | `electron-updater` + the **`update` feature** | dropped (packaging concern); auto-update returns with Tauri |
  | native dialogs (`workspaceOpenDialog`, `…ProjectOverlayDialog`, `createWorkspaceDialog`, `exportChooseTargetDialog`) | **path inputs + a recent-workspaces list** (native pickers return in the Tauri phase) |

## Fixed boundary / guardrail

- **No change to `@overlay/core`'s public API or the runner seam.** This is operator-UI work; if a slice
  needs a core API or seam change, stop and flag it.
- **Reuse each feature's core logic** (it should be Electron-free — `@overlay/core` + `node:fs` /
  `child_process`); only the dialog/store/updater touchpoints get swapped. Verify this per feature.
- The one accepted UX regression is native dialogs → path inputs (mirrors Vault's "add by path"); the one
  accepted feature drop is `update` (Electron auto-update). Anything beyond those is a pause trigger.

## Decomposition (sequential; small commits; verify each)

Build the new `server/` + `web/` alongside the Electron app, cut over at the end so the app stays runnable
throughout.

1. **Toolchain + server skeleton + shell + theme.** Vite/React/TS/Tailwind/shadcn `web/`; a `node:http`
   server with `/api/health` + `/api/ping`; copy Vault's Archive theme; a minimal shell + one placeholder
   view that calls `/api/ping`. Proves build → serve → API.
2. **The seam.** `ViewDescriptor` registry + router + shared context (api client, active-workspace
   selection, the SSE event bus), consumed via hooks. After this, adding a view = a descriptor + a module.
3. **Transport + migrate features to parity (leaf-first).** Each feature: bind its `register()` over
   HTTP/SSE and port its renderer slice out of `app.tsx` into `web/src/views/<feature>/`. Order:
   `ping` → `theme` → `dashboard` → `workspace-picker` (dialog → path-input + recent list) →
   `memory` / `trajectory` / `eval-reports` / `canonical-files` / `diagnostics` →
   `run-launch` / `export` (the SSE output streams). Fold the `electron-store` → JSON settings migration
   into the `workspace-picker` / `theme` slices.
4. **Cutover + delete Electron.** Drop the Electron deps, `src/main/index.ts`, `src/preload/`, the
   `electron-*.config` files, and the `update` feature; retire `app.tsx`; the server serves `web/dist`;
   scripts become `dev` / `build` / `start`.

## Verification per slice

- `pnpm build`, `pnpm typecheck`, the existing desktop feature tests re-pointed at the server handlers +
  the full suite (isolated HOME), `pnpm docs:check` if docs change.
- A Playwright smoke against the **served web app** (from the seam onward), replacing the Electron
  Playwright run.
- `@overlay/core` public-API snapshot + CHANGELOG **only if** core changes (it should not).
- Always: the cross-repo acceptance harness (`acceptance/capture-triage-loop.mjs`) stays green — it does
  not touch this operator UI, so it is a safety net that the runner/overlay seam was not disturbed.

## Pause for a human decision when

- A slice can't reach parity without dropping/altering a feature **beyond** the agreed `update` removal and
  the dialogs → path-input change.
- A slice would require changing `@overlay/core`'s public API or the runner seam.
- A genuinely subjective design/UX fork arises beyond the locked defaults.

## Done when

Overlay's UI is a React web app behind the view-module seam, served by a local `node:http` server over
`/api/*` + SSE, at parity with the Electron app (minus the intentionally-dropped auto-update and native
dialogs); **Electron is fully removed**; the suite + the web Playwright smoke + the cross-repo acceptance
harness are green; and the app is Tauri-ready.
