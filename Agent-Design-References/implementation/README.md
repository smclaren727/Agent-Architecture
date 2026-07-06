# Implementation Planning

Use this folder to translate the selected visual direction into code-ready guidance.

Do not treat generated mockups as source code. Extract the stable design decisions into CSS variables, Tailwind theme mappings, and component recipes.

## Recommended Order

1. Token foundation.
2. App shell and panels.
3. Menus, popovers, and overlays.
4. Chat and composer surfaces.
5. Automations and status-heavy surfaces.
6. Empty, loading, error, and unavailable states.
7. Accessibility, dark/light, and cross-webview QA.

## Implementation Principles

- Prefer semantic CSS variables over hard-coded colors.
- Use Tailwind classes through shared tokens, not scattered arbitrary values.
- Keep visual polish inside UI layers.
- Do not change data ownership, Markdown/YAML behavior, API shapes, or Runner/Overlay/Vault responsibilities as part of visual polish.
- Verify in the actual Tauri/webview path, not only a browser.

