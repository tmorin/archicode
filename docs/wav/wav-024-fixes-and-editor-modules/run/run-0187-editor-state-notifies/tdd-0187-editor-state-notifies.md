---
title: 'TDD: the parts below the composition request a redraw (W-11)'
type: tdd
status: accepted
owner: tmorin
date: 2026-10-27
run: 0187
wave: 024
related:
  - docs/wav/wav-024-fixes-and-editor-modules/rfc/rfc-002-editor-architecture.md
  - docs/wav/wav-024-fixes-and-editor-modules/rfc/rfc-003-editor-migration.md
  - docs/wav/wav-024-fixes-and-editor-modules/run/run-0182-editor-modules-design/tdd-0182-editor-modules-design.md
---

# Technical Design: redraw is requested, never called (W-11)

Step 5 of the migration order of RFC-003 (the notification, a change after the parts exist).

## Canonical impact

None. CLAUDE.md says `ratchet.max` is 162; W-9 rewrites it.

## Analysis of the 161 pairs before the change

| Group | Pairs | Cause |
|---|---|---|
| names `render` | 62 (removed) | a lower layer redraws by calling the composition's `render` (application 30, persistence 11, presentation 21 minus overlaps) |
| names address functions of the composition | 15 (left) | `currentRouteHash`, `compareFromHash`, `syncHashFromState`, `diagramFramingChanged`, `syncPerspectiveFromHash`, `applySelectionFromHashRef`: they read or write the address, most return a value |
| application and persistence naming presentation helpers | 54 (left) | state and helpers of the presentation layer that the logic reads (`viewLayerOf`, the diagram host, dialogs) |
| model naming application or presentation | 15 (left) | helpers that sit one layer too high |
| persistence naming application | 15 (left) | helpers that sit one layer too high |

Only the first group is a notification: a call whose result nobody reads. The other groups need a relocation (state moves down), not a notification, and are left.

## Decisions

- DEC-1: `requestRedraw()` and `onRedraw(handler)` live in `model/app-state.js`, next to `modelsChanged()`; the version counter does not redraw (RFC-002 amendment).
- DEC-2: the request is synchronous. An asynchronous redraw would move the order of a write, the address and the focus; the editor must behave identically, so the request does what the call did, at the same moment.
- DEC-3: the handler is `() => render()`, looked up at each request: tests replace `render` with a counter and must still see every redraw.
- DEC-4: one commit, `refactor: change ...`: 97 mechanical replacements of `render();` outside `composition/`, comments untouched, and the mechanism. Checked by `editor:check`, the node suite, the e2e suite.
- DEC-5: `ratchet.max` is lowered by hand to the count reached (99).

## Tests

`src/test/javascript/viewpoint-kernel/redraw-requests.test.js` (see the run document).
