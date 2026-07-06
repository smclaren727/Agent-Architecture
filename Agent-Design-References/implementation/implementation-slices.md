# Implementation Slices

Use this as a rough implementation order. **Slices 1–3 are the Phase-1 architecture** specified in
`../selected-direction/direction-brief.md` + `css-tailwind-token-plan.md` (§ Phase-1 Concrete Plan);
the concrete decisions are annotated inline below. Slices 4–7 and the distinctive *visual* direction
(mockups) are Phase 2, layered on this architecture.

## Slice 1: Token Foundation

Goal:
- Add or refine CSS variables and Tailwind mappings in Vault and Overlay.

Scope:
- Colors.
- Border tokens.
- Shadow tokens.
- Radius tokens.
- Blur/material tokens.
- Status colors.

Phase-1 concrete (from the token plan):
- **Native-feel base layer** — `cursor: default` on controls, `user-select: none` on chrome
  (opt content back in), font preload. (Cheap, high-impact "not a website" wins.)
- **Value-aware semantic status set** as oklch role sets (subtle-bg/border/solid/text), light + dark.
- **Material state layers** (`--state-*`) — applied to rows/menuitems only, not buttons.
- **Two-speed density** scopes (`comfortable` default, `data-density="compact"` for Overlay).
- **Motion tokens** (2 durations, 2 easings, reduced-motion path).

Validation:
- Existing UI still renders.
- No one-off visual regressions.
- Light/dark modes remain readable.
- No `cursor: pointer` / stray text-selection on chrome; fonts don't flash a fallback on first paint.

## Slice 2: Shell And Panels

Goal:
- Apply the new material system to app shells, side panels, right docks, and primary content regions.

Scope:
- Vault shell.
- Overlay shell.
- Side panels.
- Right docks.
- Main content bands.

Phase-1 concrete (from the direction brief):
- **Grounded top-bar grid** — fix Vault's detached VAULT/toggles cluster (the header bug).
- **Responsive-collapse discipline** — below a breakpoint, a **single** drawer (Vault opens one
  panel at a time, not both); Overlay's sidebar collapses instead of stacking the whole nav.
- **Flatten card-in-card** to one `--surface-panel` level + hairline; hierarchy via tone + spacing.
- **Native vibrancy** (Tauri `window-vibrancy`) for window/sidebar material; **no startup white-flash**
  (theme window `background_color` + show-on-ready). Verify on the real WKWebView path.

Validation:
- No clipped content.
- Responsive/narrow viewport behavior still works (single drawer; nav collapses, doesn't stack).
- Panels do not become cards inside cards.
- No white flash on launch; vibrancy has an opaque / reduce-transparency fallback.

## Slice 3: Menus, Popovers, And Overlays

Goal:
- Make menus and small overlays feel polished and native.

Scope:
- Dropdowns.
- Context menus.
- Confirmation popovers.
- Mode selectors.
- Runtime/profile selectors.

Phase-1 concrete (from the menu recipe):
- **One menu/popover recipe** (Raycast/shadcn model): leading icon · label · trailing
  shortcut/metadata, section separators, clear selected + visible focus, compact row height.
- **CSS glass surface** for menus/popovers (one blur/alpha level) + hairline + soft shadow, with the
  opaque `@supports` and reduce-transparency fallbacks. (Glass here is CSS, not native vibrancy.)
- Add per-note-type / per-action **icons** (lucide, already a dep); fixes Vault's plain "New note" menu.

Validation:
- Keyboard focus remains visible.
- Hover/active/disabled states are clear.
- Menu content is compact but readable.
- Glass menu stays legible; opaque fallback verified in the Tauri webview.

## Slice 4: Chat And Composer

Goal:
- Polish Vault Chat without changing governance behavior.

Scope:
- Composer.
- Permission/context/runtime controls.
- Transcript rows.
- Suggestion cards.
- Open run and Capture actions.

Validation:
- Prefill never auto-sends.
- Non-empty drafts are not clobbered.
- Apply remains explicit.
- Long prompts remain readable.

## Slice 5: Automations And Status Surfaces

Goal:
- Polish Overlay Automations as an operator console.

Scope:
- Trigger list.
- Runner liveness.
- Recent runs.
- Trigger lifecycle controls.
- Service/sync/cron controls.
- Validation messages.

Validation:
- Exact trigger attribution remains clear.
- Stale daemon state is not masked by service status.
- Critical warnings remain more prominent than decorative polish.

## Slice 6: Empty, Loading, Error, And Unavailable States

Goal:
- Make non-happy paths feel intentional.

Scope:
- Empty lists.
- Loading skeletons or progress states.
- Errors.
- Missing configuration.
- Unavailable agent/runtime states.

Validation:
- Copy stays operational and specific.
- States remain accessible.
- No new app-private state or hidden recovery path is introduced.

## Slice 7: Accessibility And Cross-Webview QA

Goal:
- Confirm the polished UI works in real app shells.

Scope:
- Tauri webviews on macOS.
- Browser smoke checks.
- Narrow viewport.
- Contrast.
- Reduced motion.
- Console errors.

Validation:
- Screenshot comparison before/after.
- No CSP regressions.
- No font/rendering errors.
- No clipped text in buttons, menus, panels, or composer.

