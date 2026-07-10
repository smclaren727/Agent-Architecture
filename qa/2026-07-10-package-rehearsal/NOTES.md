# Unsigned/ad-hoc package rehearsal — packaged-app QA (2026-07-10)

Distribution Groundwork Slice 4 (build-plan Phase 5 pre-Developer-ID item 6). Both apps were
built from the working trees of this slice, **installed** (copied) to a scratch location outside
any repo checkout, and driven with isolated `HOME`s so the operator's real app data was never
touched. No product env vars were exported for any tested flow — the `HOME` override is test
isolation, not app configuration.

## Artifacts

| Artifact | sha256 |
| --- | --- |
| `Agent Vault_0.1.0_aarch64.dmg` | `1b8f10fe2c40918b9b185ac91cc213e146caa413a5f8d15e1ca9e9faedd9f444` |
| `Agent Vault.app` bundled `agent-vault-server` | `8d426ca36f93741dc64d1698547232614a6a133ab0dd6da282f5a09344c191fc` (== `target/release`) |
| `Agent Vault.app` bundled `web-dist` tree | `65e05d36915ca077479c6852a6660cc090013809c9d8b09ff0ca9ba12e474c08` (== `web/dist`, 150 files) |
| `Agent Overlay Console_0.0.0_aarch64.dmg` | `99f9f2bcfd69f31f449184da915a03b9ccbb39df9daddaf4824d6f60338d0b3f` |
| bundled `agent-overlay-server` | `4175599e5c6ec6b7dfb536d4eba10e72e56e4d4af7fa9966e550c645f5e2ff3b` (== `target/release`) |
| bundled `overlay` CLI | `07c357cc8b12645a733d586980a0f9c9a99c01241396bb7c57c0b041758ea6c9` (== `target/release`) |
| bundled `agent-runner` | `081d51ab7011ba9971cbc2baa39feb4b2d9eb8a5f7f65151dc3ed52ef5d67ac4` (== `target/release`) |
| bundled Overlay `web-dist` tree | `b43663973db2c4d49d38089a70560ce0c928b4b8bdc434063b3446a2a8fa806f` (== `apps/desktop/web/dist`, 19 files) |

`CFBundleIdentifier` of the built Vault app: `com.agentvault.desktop` (renamed from
`com.agentvault.app`; no macOS bundle-extension warning in the build log). Executables are
ad-hoc/linker-signed (`Signature=adhoc`, `TeamIdentifier=not set`). `codesign --verify --deep
--strict` reports "code has no resources but signature indicates they must be present" — the
bundle is not sealed; sealing happens when a real signing step (ad-hoc `signingIdentity` or
Developer ID) is added on the Developer ID track.

The Vault web build is byte-deterministic: two consecutive `npm run web:build` runs produced
identical tree digests (`311cb2b7…`).

## Evidence

- `01-overlay-first-run.png` — packaged Overlay, isolated HOME: no-workspace first-run
  ("Set up your Overlay workspace", create-from-template + open-existing + empty recents).
- `02-overlay-workspace-created.png` — after `POST /api/workspace/create` scaffolded the
  default template (3 profiles, zero validation issues) at an isolated-HOME path.
- `03-overlay-relaunch-persisted.png` — after quit (sidecar reaped, :4180 released) and
  relaunch: workspace restored with `source: persistedSettings`.
- `04-vault-connected.png` — packaged Vault running; the lazy-split `OpenFileView` route
  renders correctly in the packaged app (code-splitting proof).
- `overlay-readiness.json` — `GET /api/agents/readiness` from the packaged app: runtimes
  probed with versions, secrets are **names + status only**, regex leak-scan over the full
  response found no token-shaped values.

## Overlay smoke (isolated HOME)

- First-run `GET /api/settings`: settings store at `<iso-home>/.config/agent-overlay/desktop.json`,
  workspace `source: none`, **bundled** `overlay` CLI and `agent-runner` resolved from inside the
  installed `.app` — no repo checkout paths anywhere.
- `POST /api/workspace/create` scaffolded the embedded default template; clean validation.
- Quit → sidecar reaped, :4180 released. Relaunch → workspace restored (`persistedSettings`).
- `GET /api/agents/readiness` loads fully (runtime probes, hooks, env-hazard diagnostic).
- `GET /api/automations/runner/service/preview`: launchd plist targeted at
  `<iso-home>/Library/LaunchAgents/com.overlay.runner.plist`, ProgramArguments pin the bundled
  `agent-runner` + `overlay` from the installed `.app` and an isolated state dir;
  `status: notInstalled`. Preview only — nothing was installed, no cleanup needed.

## Vault smoke (isolated HOME, seeded legacy app-data)

Seeded `<iso-home>/Library/Application Support/com.agentvault.app/` with a real note,
`vaults.json` holding an absolute old-prefix path, and `settings.json` (explicit standalone).

- First packaged launch performed the one-time migration: legacy dir renamed to
  `com.agentvault.desktop`, `vaults.json` path rewritten to the new prefix, seeded note file
  byte-intact, seeded explicit-standalone setting honored (`reason: explicit-standalone`).
- Standalone editor works with no Overlay: `POST /api/notes` created a note in the migrated
  vault; search returns it.
- Native chat surfaces respond (`status: not-configured` on a fresh profile); no secret values
  in any response. Keychain probe reports `storage-failed` under the isolated HOME — a test
  isolation artifact (login keychain is HOME-derived); the operator's real install exercises the
  Keychain path daily.
- Cross-app: `PUT /api/overlay/settings` pointed at the workspace **created by the packaged
  Overlay** → connected, `GET /api/workspace/files` listed all 66 template files. Disconnect
  (`workspaceDir: null`) → standalone, overlay routes 503. Reconnect → 200.
- Settings land in app-data (`settings.json`, `vaults.json`, `index.sqlite` under
  `com.agentvault.desktop/`), nothing written to the process cwd.
- Quit → sidecar reaped, :4173 and :4183 released.
- Fresh-HOME launch (no legacy dir): creates `com.agentvault.desktop` directly (migration no-op),
  healthy, quits clean.

## Ports / cleanup

The operator's dogfood apps were quit for the smoke window and relaunched afterwards (verified
back on :4173/:4180). After the smoke: no `agent-vault-server` / `agent-overlay-server`
processes, no listeners on 4173/4180/4183 from smoke runs. No launchd units were installed.
Smoke homes lived in the session scratchpad.

## Known limitations recorded

- Real-HOME migration of the operator's dogfood data intentionally NOT run — it happens on first
  launch of the new build. Until the installed app in `~/Applications/Agent Apps` is replaced,
  launching the OLD build after a migration would recreate a fresh legacy dir (standard
  identifier-rename hazard; documented in Vault's `Docs/tauri-wrap-build-plan.md`).
- WKWebView localStorage/UI state resets once after the identifier rename (documented).
- Overlay's own web bundle still has a >500 kB entry-chunk warning — out of scope here (the
  build-plan warning cleanup named the Vault chunks); backlog.
- Two Vault node contract tests fail on clean HEAD, environment-induced: a real `overlay` CLI now
  exists at `~/.local/bin` (the CLI-installer well-known location), flipping
  "missing-overlay-cli" expectations (`tests/agent-endpoints.test.js`,
  `tests/overlay-connection.test.js`). Pre-existing, not caused by this slice; follow-up: the
  suite should isolate the well-known-location fallback.

## Remaining for the Developer ID track

Signing (incl. sealed bundle resources so `codesign --verify --deep --strict` passes),
notarization, stapling, auto-updater + release manifest/hosting, clean-machine install proof,
package-manager channels.
