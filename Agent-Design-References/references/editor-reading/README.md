# Editor And Reading References

Use this folder for markdown/knowledge editors, reading-room layouts, note panes, frontmatter/
properties panels, outline/backlink docks, and multi-pane document shells.

This category exists specifically for **Vault's** primary job — a calm, readable editing surface —
which the operator-console references in `dense-operator-uis/` do not cover. Added 2026-07-06 to
close the taxonomy gap noted during reference curation.

## What To Look For

- Reading measure / max content width.
- How left file tree, editor, and right panel coexist without crushing the editor.
- Properties / frontmatter treatment (typed fields kept quiet and compact).
- Right-panel docks: outline, backlinks, local graph, info.
- Focus mode and independent panel collapse.
- Narrow-viewport behavior (single drawer, not stacked drawers).
- Read vs. edit mode.

## Borrow / Avoid Notes

References (2026-07-06): `reference-obsidian-reading-panels`, `reference-cogito` (both App: Vault).
Cogito is the **closest analog** — a shipped markdown+AI editor with Vault's exact shell (sidebar
+ editor + AI-chat/Inspector dock), captured live from the owner's own machine.

Borrow:
- Collapsible side panels with a comfortable center reading measure; single-drawer on narrow
  (Obsidian); first-class panel toggles (Hide Sidebar / Hide AI Sidebar / Show Inspector) (Cogito).
- Compact, quiet Properties/frontmatter list instead of a large airy form (Obsidian);
  small-caps Inspector sections Summary/Stats/Outline/Related with hairline dividers (Cogito).
- Composer-first AI dock: runtime in the panel header, profile + permission inline in the
  composer footer; graduated permission ladder Read Only → Allow Edits → Full Access (Cogito).

Avoid:
- Generic/plugin-driven inconsistency; heavy borders everywhere — keep the "Archive" identity
  and one coherent surface system with hairline dividers.

Implementation caution:
- Vault should read as a reading room, not an operator console — this is the looser end of the
  shared density scale (Overlay is the denser end).
- Don't change Markdown/YAML ownership or make frontmatter feel like app-private state.
