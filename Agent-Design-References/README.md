# Agent UI/UX Design References

This folder is the working area for visual polish across Agent-Vault and Agent-Overlay. It is for collecting references, choosing a direction, and translating that direction into implementation-ready UI guidance.

The goal is to make the apps feel more polished while preserving the system's north stars:

- Markdown/YAML/plain files remain the source of truth for product data.
- UI polish should not create app-private state or a second design source of truth.
- Vault and Overlay can share a visual language, but each app should keep its role clear.
- Design references are inputs, not implementation contracts. The final contract is the selected direction plus the CSS variable and Tailwind token plan.

## Recommended Workflow

> **How this actually proceeded (2026-07-06).** We ran steps 1–2 (capture + curate references) and
> then went **architecture-first**: because the good patterns already exist in the apps and in real
> references (Cogito, Linear, Radix, Apple Liquid Glass, Material, Raycast), we wrote the **Phase-1
> architecture direction** (`selected-direction/direction-brief.md`) and concrete token plan
> **directly from real apps and references**, without generating abstract mockups. **Mockups (step 3)
> are reframed as a Phase-2 tool** for exploring the distinctive *visual* direction on top of the
> Phase-1 architecture — not a prerequisite for it. Steps 4–7 otherwise stand.

1. Capture the current apps first.
   Save screenshots of the real Vault and Overlay UI in `current/`. Capture the states that matter before collecting external inspiration, so every future mockup can be compared against the product as it exists.

2. Curate references instead of collecting everything.
   Add screenshots under `references/` by theme. For each image, add a short note that says what to borrow and what to avoid. Ten well-described references are more useful than a hundred unlabeled screenshots.

3. Generate direction mockups (Phase 2 — deferred).
   Use `mockups/imagegen-prompts.md` to explore the distinctive *visual* direction on top of the
   Phase-1 architecture. Deferred in this pass — the direction was grounded in real apps/references
   instead. Generate real app surfaces when used: Vault notes plus Chat, Overlay Automations, menus,
   overlays, side docks, empty states, and error states.

4. Pick a direction.
   Written in `selected-direction/direction-brief.md` — currently the **Phase-1 architecture**
   direction ("Archive · Grounded"). Concrete: surface materials, color posture, menu treatment,
   density, contrast, interaction feel, and native-feel shell conventions.

5. Translate the direction into tokens.
   Use `implementation/css-tailwind-token-plan.md` to map the visual direction into CSS variables, Tailwind theme entries, and component recipes. Avoid scattered one-off hex colors, arbitrary blur values, and per-component shadow inventions.

6. Implement in thin slices.
   Use `implementation/implementation-slices.md`. Start with tokens, then app shell, menus/popovers, Chat, Automations, empty/error/loading states, and finally accessibility and cross-webview QA.

7. Compare with screenshots after every slice.
   Use `qa/screenshot-checklist.md` for desktop and narrow viewport checks. The goal is coherent product feel, not pixel-perfect cloning of a generated mockup.

## Folder Map

- `current/` - screenshots of the current apps and notes about what feels rough.
- `references/` - external inspiration grouped by visual or interaction theme.
- `mockups/` - imagegen prompts, generated direction notes, and iteration notes.
- `selected-direction/` - the chosen design direction and decision record.
- `implementation/` - token plan, Tailwind/CSS guidance, and implementation slices.
- `qa/` - screenshot QA checklist and visual acceptance notes.
- `notes/` - reusable note templates for references and design decisions.

## Capture Naming

Use stable, descriptive names:

```text
vault-chat-right-dock-current-2026-07-06.png
overlay-automations-live-runner-current-2026-07-06.png
reference-glass-menu-cogito-2026-07-06.png
mockup-direction-quiet-macos-glass-v1.png
```

Pair important images with a same-named Markdown note:

```text
reference-glass-menu-cogito-2026-07-06.png
reference-glass-menu-cogito-2026-07-06.md
```

Use `notes/reference-note-template.md` for those notes.

