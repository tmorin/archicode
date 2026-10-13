---
type: run
run: 0012
status: completed
wave: 004
---

# Run 0012: Editor — toolbar polish

Profile: `single-document` (wave 004, W-1). This document carries scope, decisions, canonical impact, verification and findings.

## Scope

1. **Button groups keep their borders.** Neighbours of a `.button-group` overlap by one border (`margin-left: -1px`), so the right border of a hovered or focused button was hidden by the next one. `.button-group button:hover, .button-group button:focus-visible` now get `position: relative; z-index: 2` (above the pressed button's `z-index: 1`). One rule, so every group of the editor is fixed.
2. **Perspective switch is a button group.** `renderPerspectiveTabsHtml` emits `<span class="perspective-tabs button-group" role="group" aria-label="Perspectives">`; each button carries `aria-pressed` (true for `currentPerspective`) instead of the `active` class. The pill styling (`.perspective-tab`, `.perspective-tab.active`, the flex `gap`) is removed; the pressed one uses the accent colours shared with `.viewpoint-switch`.
3. **Close folder at the far right.** It moves into `.top-actions`, after the `?` button (still hidden when served by `archicode editor serve`). `.top-panel > button` no longer matches anything and is dropped from the shrink rule.

## Decisions

- Close folder goes inside `.top-actions` rather than staying a direct child of the bar: that group already sits on the right and wraps as a whole, so the button cannot be left stranded when the bar wraps.
- `z-index: 2` for hover/focus, not `1`: a pressed button (1) would otherwise win over its hovered neighbour, the later one in the DOM order.
- No migration of the `active` class: nothing else (JS, tests, manual) read it.

## Canonical impact

None. No `CI-arc`/`CI-dom` item: a CSS and markup change of the standalone editor, no architectural or domain invariant, no manual text mentions the tabs or Close folder (searched `src/doc`, `src/site`).

## Tasks

- [x] CSS: hover/focus rule, perspective group styling, drop the pill rules
- [x] Markup: perspective group with `aria-pressed`; Close folder after `?`
- [x] Tests: group markup, order of the top-bar controls, CSS rule (`ui-fixes.test.js`)

## Review passes

- KDMLLC: run inline over this document and the diff (small, single-file change): nothing duplicated (one rule fixes all groups, the accent colours reuse the viewpoint-switch rule), nothing left dead (the pill rules and the stale `.top-panel > button` selector are removed).
- Consistency scan: scope against the W-1 row of the plan (three items, all present); the tests assert the markup and the CSS text the scope names.

## Verification

- `node --test "src/test/javascript/**/*.test.js"`: 195 pass, 0 fail (baseline 193 plus 2 new tests).
- `JAVA_HOME=/home/tibo/.sdkman/candidates/java/25.0.4-tem ./mvnw test`: exit 0.
- Not confirmed: the rendering itself (the editor needs the File System Access picker, so the page was not looked at). The overlap of borders, the pressed colours and the position of Close folder when the bar wraps are asserted on the CSS text and the markup only.

## Findings

- No test of the existing suite read the `active` class or `.perspective-tab`; none had to be loosened.
