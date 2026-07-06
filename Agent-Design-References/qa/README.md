# Design QA

Use this folder for visual QA notes after implementation slices.

## Prerequisite: seeded Vault fixture (before any screenshot QA)

Vault's live data is **sparse** — the baseline capture found empty Tasks, Graph, and a near-empty
notes list. Visual QA on dense states is meaningless against empty views, so **seed a fixture
before QA**:

- A note with full **frontmatter + body** (exercises the Properties editor + Info dock).
- A handful of **tasks across statuses** (inbox / today / done) for the GTD views.
- At least one **conventions finding** (so the Conventions view isn't the empty state).
- Several notes linked with **`[[wikilinks]]`** so the Graph actually renders nodes/edges.

Overlay already has real data (automations, runtimes, trajectories) and needs no fixture. Keep the
fixture reproducible (a small seed script or a committed test vault) so before/after screenshots are
comparable across slices.

## QA Rhythm

For every slice:

1. Capture before screenshots.
2. Apply the slice.
3. Capture after screenshots.
4. Compare against the selected direction.
5. Record issues and decisions.

## What Counts As A Pass

- The app feels more polished without losing operator clarity.
- Text remains readable.
- Controls are still discoverable.
- Menus and overlays have clear focus, hover, and selected states.
- No layout clipping at tested viewports.
- Console logs are free of new UI/CSP errors.

