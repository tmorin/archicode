---
type: run
run: 0223
status: completed
profile: TDD+pln
wave: 032
---

# Run 0223 — stylesheet-tests-on-a-parsed-stylesheet

Run W-2 of wave 032 (wav-032-help-name-and-stylesheet-tests).

## Verification (task-011)

| Gate | Result |
|---|---|
| `npm run test:unit` | exit 0: 3515 tests, 3514 pass, 0 fail, 1 skipped |
| `npm run test:coverage` | exit 0 on a run alone: 3514 pass, 0 fail, TOTAL 93.15 % lines, 96.31 % functions, "holds the floor of scripts/editor-coverage-floor.json". A first run overlapped with `format:check` and `lint` (which rebuilds the editor page) and reported "the tests failed (exit 1)"; the rerun alone passed, so that failure is taken as interference between concurrent commands, not a regression (the failing test of the first run was not captured) |
| `npm run format:check` | exit 0 |
| `npm run lint` | exit 0 |
| `npm run editor:build` then `npm run sample:build` | `git status --short` identical before and after; the only entry under `src/main` is `cli/ArchiCode.java`, modified by another run of the wave, not by this one |
| `grep -rl compactStyle src/test` | prints nothing; `stylesheet-support.js` is deleted |
| `git status --short -- src/test/e2e` | one new file, `stylesheet-claims.spec.js` (4 tests: NS-1 to NS-4), no modified file |
| `test ! -d commit-record` | succeeds after the parts below were merged here |
| New e2e spec run in a browser | not verified by this task (formatted and linted only); it is proved by the job `E2E` of CI |

## Commit record

Deleted tests and assertions, each with what covers it (CTR-2). Source: the parts written by tasks 004 to 008; tasks 003, 009 and 010 deleted no assertion (inventory row I-04 kept, the audit file was converted in place, the new spec was added, the helper was removed).

### styles.test.js (task-004)

No test is deleted. Rewritten on the parsed reader: "styled rules come before the outlines of focus, selection and focal" (`order`, `decl`; the focal case is also covered by `stylesheet-claims.spec.js`, "a styled box shows its fill and its own stroke, and the focal box keeps the accent stroke over its style"), "the dark theme was given no --st- variable" (`rule` on both dark blocks), "the badge of a tree row has its rule", plus the CSS assertions of five more tests (`decl`, `order`, `has`, and the export CSS read by `loadStylesheet`). Rows I-77 and I-78 (inventory: new spec) were kept as rewrites because the spec proves the focal case only.

### changes-panel.test.js and inspection-links.test.js (task-005)

- changes-panel, no hex or `rgb(` in the cut from `.right-tabs` to `[data-resize]`: css-theme-audit.test.js, "every class of the stylesheet draws with variables that both themes define".
- inspection-links, no own colour in four rules: same audit test.
- inspection-links, dark blocks hold the same variables: same audit test.
- Rewritten on `decl`, `has`, `order`: change-row selected, context opacity, seven panel selectors, link cursor and accent, three inspection selectors, selected edge after ghost edge.

### plateau-compare.test.js and inspection-navigation.test.js (task-006)

- inspection-navigation, no colour added in four rules: css-theme-audit.test.js, same audit test.
- Rewritten on `loadStylesheet`: tint opacities and fill, the three link states, the rules of the states, the `--chg-*` variables in `:root` and both dark blocks, the badges' base rule, their order against the first `@container`, the tight state, the three container queries, `.inspection-rel-marked`. The export side kept (it reads the script).

### ui-fixes.test.js, header.test.js, theme.test.js (task-007)

- header "the container queries come after the base rules they override", "the compact state hides the words of the icon controls and leaves the overflow alone", "the minimal state shows the "..." button and turns the overflow into a popup that opens with data-open", "the "..." button keeps its 2rem and no padding", "the tight state gives the header two rows instead of overflowing": stylesheet-claims.spec.js, "the header of an element page keeps its actions at three widths of the centre: labels, the "..." button with its menu, two rows".
- header "the block of the header uses the colours of the theme only": css-theme-audit.test.js (literal colours in every rule, shadow list).
- header "a narrow centre" (toolbar groups part): diagram-toolbar.spec.js, "at 360 by 740 the toolbar of the ..." and the phone block of the Changes test.
- ui-fixes reset block, literal colours `#e5e7eb` and `#9ca3af`: css-theme-audit.test.js.
- ui-fixes reset block, `.top-panel` wraps: workspace-menu.spec.js, "a workspace with the longest name holds the bar and the menu, at 360 px".
- theme "the dark variables are the same for the system's dark and for the forced one": css-theme-audit.test.js, "a copy where a variable is missing, misspelt or one-sided fails the audit".
- Rewritten on the parsed sheet: header container, three queries widest first, strip gone, help look, hint and legend; ui-fixes badges, reset block, button group, pressed tab; theme forced themes and color-scheme.

### diagram-key-folded, editor-odds-and-ends, story-player-modal, editor-structure (task-008)

- diagram-key-folded "the rules of the page: folded hides the sentences and the note, open is capped and scrolls, a narrow screen keeps one row" (three of four assertions): stylesheet-claims.spec.js, "the key of a comparison is folded to one row, is capped at 30 percent of the diagram area once open and scrolls inside"; the fourth (toggle pressed look) is rewritten as `has`.
- editor-odds-and-ends "at 360 px the three columns do not fit ...": diagram-toolbar.spec.js and workspace-menu.spec.js (document not wider than the window at 360 and 1280).
- story-player-modal "the page of the player: ..." (layout assertions): stylesheet-claims.spec.js, "the story player opened on a phone is not wider than the window and keeps its bar, its step menu and its words inside it"; `.story-player` position and inset and the absence of `overflow-x` stay as lookups.
- Rewritten on `decl`: editor-structure "the bar of the pages and the Plateaus page hold the width", editor-odds-and-ends "below 40rem the regions are stacked" and "the wide layout is untouched".

Review pass: dispatched, a different agent from the drafter reviewed tdd-0223 at Stage 5 against the repository (8 findings, absorbed by task-001).

Files outside likely_paths: none
