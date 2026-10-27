---
title: 'TDD: the diagram, the pages, the stories, the story player and the bootstrap as parts of the editor (W-8)'
type: tdd
status: accepted
owner: tmorin
date: 2026-10-27
run: 0186
wave: 024
related:
  - docs/wav/wav-024-fixes-and-editor-modules/run/run-0182-editor-modules-design/tdd-0182-editor-modules-design.md
  - docs/wav/wav-024-fixes-and-editor-modules/run/run-0185-editor-extract-model-and-kernel/tdd-0185-editor-extract-model-and-kernel.md
---

# Technical Design: the rest of the editor script as parts (W-8)

Step 8.1 of `0182 DEC-9`. The 42 rows of `0182 DEC-4` that run 0185 left in `unsorted/from-<row>.js` become parts of the layer the table gives; the layer of each row is the table's, no row needed another choice. Pure moves: the page is the page of `361d120` after every commit.

## Canonical impact

None: no canonical document is changed. CLAUDE.md is stale about `unsorted/script.js`; W-9 rewrites it.

## Method

- DEC-1: a move cuts the tail of an `unsorted/from-N.js` file at the first line of a row and writes it to the part; cuts run from the last row of a file to its first, so that the leftover keeps its name and its place in `layers.json`, and the last cut of a file replaces the file. The first line of a row is found by the three lines of the page of `af1ed2d` in the file; rows 26, 42, 45 and 58 lost their first lines to the relocations of run 0185 and are found by the first remaining line (row 26 is the head of `from-26.js`; row 42 `// ---- The right-hand panel`; row 45 `/** The parts of the Map of the technology layer`; row 58 `// ---- Dialogs`). Row 45 starts after the heading comment of the map viewpoint, which stays at the end of row 44.
- DEC-2: one commit per part, subject `refactor: move <part> to src/main/editor/<part>`, checked by `--check-identical HEAD` and `--layers` before the commit.
- DEC-3: the 3,000-line gate: the largest new part is 1,036 lines.
- DEC-4: two tests changed (`test:` commit, after the moves): `check-editor-layers.test.js` expected 0 pairs (now at most the ratchet) and `yaml-parts.test.js` probed a function of `unsorted` (now a part outside core).
- Trial: all 42 cuts in the working tree gave a page identical to HEAD and 161 pairs (max 162) before any commit.

## Parts

| Commit | Row | Part | Layer | Lines |
|---|---|---|---|---|
| `7fe4ebb` | 68 | `composition/bootstrap.js` | composition | 53 |
| `9992d7e` | 67 | `composition/render.js` | composition | 137 |
| `e0b1709` | 66 | `presentation/landing.js` | presentation | 174 |
| `3b22509` | 65 | `composition/events.js` | composition | 1036 |
| `f00d620` | 64 | `presentation/shell.js` | presentation | 107 |
| `e1c5be0` | 63 | `presentation/stories-pages.js` | presentation | 376 |
| `2b07740` | 62 | `presentation/story-player.js` | presentation | 502 |
| `669cc31` | 61 | `presentation/story-scene.js` | presentation | 146 |
| `36260b1` | 60 | `presentation/story-menu.js` | presentation | 39 |
| `eb19958` | 59 | `application/story-actions.js` | application | 421 |
| `7a1c880` | 58 | `presentation/dialogs.js` | presentation | 264 |
| `86d67c8` | 57 | `presentation/view-edit.js` | presentation | 285 |
| `c10e3d9` | 56 | `application/story-entries.js` | application | 199 |
| `0798a30` | 55 | `application/view-recipe.js` | application | 151 |
| `18c9018` | 53 | `presentation/diagram-page.js` | presentation | 700 |
| `f588764` | 52 | `presentation/diagram-interaction.js` | presentation | 664 |
| `7c3df60` | 51 | `presentation/diagram-layout.js` | presentation | 689 |
| `3c06d17` | 50 | `presentation/diagram-states.js` | presentation | 280 |
| `935e54f` | 48 | `presentation/diagram-controls.js` | presentation | 198 |
| `00b2afc` | 45 | `presentation/map-state.js` | presentation | 107 |
| `79d2706` | 44 | `presentation/diagram-state.js` | presentation | 93 |
| `894ba04` | 43 | `presentation/pages-plateaus-files.js` | presentation | 141 |
| `07508c3` | 42 | `presentation/right-panel.js` | presentation | 365 |
| `8c91f70` | 41 | `presentation/changes-panel.js` | presentation | 888 |
| `74cc8fb` | 40 | `presentation/inspection.js` | presentation | 108 |
| `9aa84a9` | 39 | `presentation/element-form.js` | presentation | 640 |
| `5da4f32` | 38 | `presentation/element-view.js` | presentation | 183 |
| `f444800` | 37 | `presentation/theme.js` | presentation | 131 |
| `fd85455` | 36 | `presentation/help-and-settings.js` | presentation | 464 |
| `d427039` | 35 | `presentation/left-panel.js` | presentation | 391 |
| `a273301` | 34 | `presentation/top-panel.js` | presentation | 158 |
| `2e549a1` | 32 | `application/move.js` | application | 465 |
| `649e048` | 30 | `application/commit-pipeline.js` | application | 489 |
| `9c147f9` | 28 | `presentation/shell-state.js` | presentation | 17 |
| `fc755ef` | 27 | `composition/address-routing.js` | composition | 305 |
| `3c0a9b7` | 26 | `presentation/page-registry.js` | presentation | 36 |
| `77e89e6` | 24 | `application/folder-session.js` | application | 133 |
| `dbb981f` | 19 | `application/plateau-commands.js` | application | 476 |
| `b40ab56` | 18 | `application/plateau-patches.js` | application | 429 |
| `a7402e9` | 17 | `application/layer-writes.js` | application | 234 |
| `da34dd0` | 16 | `presentation/plateau-band.js` | presentation | 214 |
| `65e286a` | 15 | `application/plateau-choice.js` | application | 353 |
