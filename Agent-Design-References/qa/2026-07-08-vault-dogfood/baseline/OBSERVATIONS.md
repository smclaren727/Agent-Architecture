# Vault dogfood UI campaign — baseline (2026-07-08)

Captured from `agent-vault-server` @ 927614b (release binary + web/dist built 2026-07-08 08:30,
newer than HEAD, clean tree — not stale), running against a scratch copy of the starter vault
(`vault/` template) on port 4590. No real user vault data was touched.

## Screenshots

| File | Flow | Baseline observations |
| --- | --- | --- |
| `01-open-view.png` | Open File view | Manual absolute-path text entry is the primary flow in browser mode. |
| `02-notes-view.png` | Notes list | Folder tree groups Daily/Templates; native header select for vault. |
| `03-daily-note-created.png` | Daily note creation | Template seeds `## Log`; Save+Delete in bottom action row; toolbar has only B/I/code/link/UL/quote; note **did** appear in panel here (default vault active — bug is scoped to non-default active vaults, see below). |
| `04-properties-dock.png` | Right dock Info tab | Info/Properties/Chat tabs; graph, outline, stats. |
| `05-properties-tab-daily.png` | Properties tab (daily) | Autosaving typed fields; relationship fields are native datalist inputs. |
| `06-add-vault-dialog.png` | Add vault dialog | Manual path entry primary in browser; mode select (Open/Managed) exists; native folder picker only shows under Tauri. |
| `07-task-note-properties.png` | Task note + properties | Status/priority selects; relationship fields (project/area/people/blocks/depends/waiting) as plain datalist typeaheads; RRULE free text. |
| `08-packaged-titlebar.png` | *(deferred)* | Packaged `.app` titlebar baseline deferred to Slice 4 real-app QA (app did not stay up for automated capture; current state per build-plan: detached default white titlebar, no titleBarStyle configured). |

## Root cause identified for the "No notes indexed yet" symptom

- `POST /api/notes` and daily-note creation always write into the default vault (`vault_dir`,
  registry id `vault`) and reindex only that vault (`handlers.rs` `create_note`/`ensure_daily_note`,
  local `reindex()`).
- `GET /api/notes` applies `WHERE vault = ?` when a specific vault is active — so with any
  non-default active vault, the just-created note is filtered out of the list.
- The file watcher (`index/watch.rs`) watches only the default vault dir; other registered vaults
  reindex only at startup (full-registry rebuild with prune) — hence "fixed by restart".
