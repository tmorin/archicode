---
type: run
run: 0066
status: completed
wave: 013
---

# Run 0066: Editor defects from Brightcart

Wave 013 (`reported-defects-and-shipped-files`), item W-3 (phase P2). Focus: use the editor on a four-plateau project without a Map that fails, a header off screen, a panel that hides what a node deployed, or a test that fails at random.
Document profile: `single-document` (the scope arrives settled by the wave plan; four small fixes in one file of the editor and its tests, one sequence). This file carries scope, decisions, canonical impact, review passes, tasks, verification and findings.

## Scope

#68 the Map with an element opened, pinned or hidden that a facet removes; #69 the plateau group and *Compare to* of the header; #71 the panel of a removed node; #66 the flaky wait of `folders.test.js`. #57 (the line-preserving save) is W-4's, not this run's.
Editor page and node tests only: no kernel, no contract, no faithful-save code. Nothing the command line generates changes.

## Decisions

- **D1. #68 is fixed in the editor, as the wave plan says.** `computeMapThroughFacet(kernel, input)` (called by `mountDiagramIfNeeded` for a Map drawn through a facet) asks the kernel for the Map and, when it answers `dangling reference: x` for an `x` the three lists name, drops `x` and what is inside it (`x.`) from `opened`, `pinned` and `hidden` of the input and asks again. It stops on the first answer that is not that error, so an error the lists do not explain is still shown. The kernel is not changed and the contract (#34) is not touched. The lists of the page (`mapOpened`, `mapPinned`, `mapHidden`) are left as the user made them: *Facet: none* brings back the open box, the pin and the hidden element (a test pins it). The pruned lists are also what the page uses afterwards for the drawing (`opened` and `pinned` marks, `hideUnlinked`, the "hidden ones" sentence), so it never marks a box that is not drawn. The Library page of a saved Map view goes through the same function (same `mountDiagramIfNeeded`). The cost is zero when no listed element is removed (the first answer is the one drawn) and one more kernel call per removed reference otherwise; it applies only to a Map with a facet.
  - Why not "ask the kernel what the facet removes" in one call: the kernel has no entry point that lists the elements left after a facet for an editor input (`apply_facet` takes the JSON of a workspace, not the elements of a view); a new one is a contract change (#34). The loop reads the kernel's own error, whose form (`dangling reference: <reference>`) is the one the CLI and the editor already show.
- **D2. #69 is a stylesheet fix: the switch is capped at the bar and wraps inside.** `.plateau-switch` loses `flex-shrink: 0` and gets `min-width: 0; max-width: 100%`; `.plateau-tabs` (the buttons) and `.compare-control` get `flex-wrap: wrap; min-width: 0; max-width: 100%`. The perspective tabs keep their size. The look of a wrapped group of joined buttons (square inner corners) is the one the viewpoint tabs already have. No scroll bar inside the group, no list of plateaus, no tooltip-only names: the issue's other directions are left.
- **D3. #71 shows the other plateau's file as written.** The panel of a removed node lists *Applications deployed* with the label and the markup of the changed node's block (`change-diff`, the Before line alone, `renderChangeDiffsHtml(..., beforeOnly)`), read from the baseline record: `shop.cache` for `prod.dc.cache-vm`. This is what the same panel already does for relationships (the destinations as the file wrote them), and what the gate asks. The *Before* of the changed `staging.vm` reads a reference to a replaced element as the replacing one (`commerce.cart-store`, #67, as `archicode diff` does); the two panels share the label and the shape, not that reading, and the test pins both. `Uses` of a removed environment is not added (not in the issue).
- **D4. #66: wait for the condition, with a deadline.** `waitFor(condition, what, timeout)` in `harness.js` polls every 5 ms, 10 s deadline, and the failure names what it waited for. The test of the issue waits for the workspace to be loaded and the folder to be remembered as the last one, and its stand-in for the permission prompt now takes 150 ms (a person answers in their own time), so that a fixed 50 ms fails on any machine. The other fixed delays of the file stay: 2 ms to get two different `openedAt`, and 20 ms/5 ms "long after the transaction would have committed" before asserting that nothing was written or ordered (an absence cannot be polled; a longer wait there can only hide a bug, never raise a false failure).
- **D5. Browser pane.** The pane is hidden (`document.hidden` true, a screenshot times out, as in wave 012) but the page lays out: `getBoundingClientRect` and `scrollWidth` answer. The #69 numbers below are those; nothing was looked at on a screen.
- **D6. Copies, not the repository.** The editor was served from two copies of the built jar outside the repository (HEAD's page and the fixed page) on two copies of `folders/`; both servers were stopped by pid.

## Canonical impact

None to the architecture model (no TDD, no `CI-arc` or `CI-dom` packet): an editor page and tests.

## Review passes

- **KDMLLC (inline).** K: four small edits, one new function, one optional argument, one helper in the harness. D: the three panel lines reuse `renderChangeDiffsHtml`; the Map reuses `buildKernelInput`. M: the four issues do not overlap (a call to the kernel, a stylesheet, a panel, a test). L: the issue's alternative directions (a kernel change, a list of plateaus) are not built. U: each test says its issue. C: see the C scan.
- **C scan.** Wave plan W-3 scope against the work: #68 "drop from the three lists what the facet removes before it calls the kernel" (done through the kernel's own error, D1); #69 "wrap or scroll inside their own group" (wrap, D2); #71 "lists the applications it deployed, as the panel of a changed node does" (D3); #66 "waits for the condition with a deadline" (D4). Gate P2: one test per issue that fails before and passes after (shown below); #57 is W-4's. The wave's text "it already asks the kernel what a facet removes" refers to `facetRemovesElement`, which answers for one focal element, not for a list: D1.

## Tasks

- [x] T1. Read the wave plan, CLAUDE.md, the four issues, run 0063, runs 0064 and 0065.
- [x] T2. #66: `waitFor`, the test of the issue.
- [x] T3. #68: `computeMapThroughFacet`, `map-facet-lists.test.js` (and `dir` in `library-page.js`'s `startPage`).
- [x] T4. #69: the stylesheet, `header-plateaus-wrap.test.js`.
- [x] T5. #71: the block in the removed panel, `removed-node-applications.test.js`.
- [x] T6. The browser measures; the before/after of each test; six parallel runs.
- [x] T7. The five commands of the P2 gate on the final tree.

## Verification

JDK 25 for Maven, `PLANTUML_JAR=plantuml-1.2024.7.jar`, 2026-10-17, on the final tree; the machine was loaded by an IDE (load average 37 to 49 during the runs).

**Before and after, one test per issue** (the three new test files run against `git show HEAD:src/main/resources/editor-webapp/standalone.html`, then against the fixed page):

| Issue | Test | HEAD page | Fixed page |
|---|---|---|---|
| #68 | `map-facet-lists.test.js` (3 tests: Unfold all then `journey`; pin and hide `backoffice` then `journey`; a pin that the facet leaves) | 3 fail with `dangling reference: backoffice` | 3 pass |
| #69 | `header-plateaus-wrap.test.js` (5 tests; the rule of the switch, of the buttons, of Compare to) | 3 fail (the two others, the perspective tabs and the markup, pass on both) | 5 pass |
| #71 | `removed-node-applications.test.js` (3 tests; `Cache VM` panel lists `shop.cache`, `staging.vm` unchanged, every removed node) | 2 fail (the `staging.vm` one passes on both) | 3 pass |
| #66 | `folders.test.js`, the test of the issue with a 150 ms permission prompt | fails deterministically (`assert.ok(p.state().workspace)`, actual `null`) with the old fixed 50 ms | passes (waits for the condition) |

**#66 under load**, `node --test "src/test/javascript/**/*.test.js"` six at once (the issue's own reproduction): on the commit before, 6 of 6 failed on "Open on a folder of the list ..."; after, 6 of 6 gave 1020 tests, 1020 pass, 0 fail. Six parallel `node --test src/test/javascript/viewpoint-kernel/folders.test.js`: 6 of 6 pass (34 tests) after (they also passed before: the file alone is not loaded enough; the condition is the whole suite six times).

**In the built-in browser** (the pane is hidden, `document.hidden` true: a screenshot times out, so nothing was looked at on a screen; layout was read with `getBoundingClientRect` and `scrollWidth`, which answer). The editor was served from two copies of the jar (HEAD's page, the fixed page) on copies of `folders/`:
- #69, 800 px, plateau Marketplace drawn: HEAD document 1274 px wide, button `Marketplace and personalisation` x 686 to 968, Compare to x 1050 to 1274 (the issue's numbers, reproduced). Fixed: document 800 px, the last button wraps to a second row (x 15 to 297), Compare to x 89 to 313 on a third row, with a comparison on Reload, Everything, Changes only x 320 to 568; header 200 px high. At 1400 px: document 1400, the four buttons on one row (x 67 to 968), Compare to on the second row, header 141 px. At 360 px (the mobile emulation): every child of the header ends at x 359 or less; the document is 424 wide because of the centre panel (`element-header-actions` ends at 412), which this run did not touch and did not investigate further.
- #68, plateau `baseline`, Map, Unfold all, then the facet `journey`: HEAD shows the error panel `dangling reference: backoffice` and 0 boxes; fixed shows the Map through the facet, 11 boxes, 7 links, no error panel.
- #71, `inhouse` compared with `baseline`, click on the removed `Cache VM` in the Changes list: the panel has `Applications deployed - Before shop.cache` and no After line.

**The five commands of the gate:**
- `./mvnw -o verify`: BUILD SUCCESS, 422 tests, 0 failures, 0 errors, 0 skipped (16 min 09 s on the loaded machine; integration tests skipped by default).
- `cargo test --manifest-path src/main/rust/viewpoint-kernel/Cargo.toml`: 173 passed, 0 failed.
- `src/main/rust/viewpoint-kernel/embed.sh --check`: "the committed WebAssembly is the one the sources build (655569 bytes)", exit 0.
- `node --test "src/test/javascript/**/*.test.js"`: 1020 tests, 1020 pass, 0 fail (1009 before this run plus 11 new tests).
- `npx prettier --check "src/**/*.java"`: clean.

Byte-identity: nothing the command line generates changed (no Java, Rust or wasm touched); `git status` of `src/test/resources` is clean.

NOT verified: nothing was seen on a screen (the pane is hidden); no other browser than the built-in one; the Library page of a saved Map view with a facet and an opened element (it goes through the same `mountDiagramIfNeeded`, but no test drives it); the page at 360 px beyond the header; the native image.

## Findings

- **F1. #68 is closed by this commit** (editor side; the kernel still refuses a list that names a removed element, which is #34's direction).
- **F2. #69, #71, #66 are closed by this commit.** #71's *related observation* stays as the issue says (a reference to a replaced element reads as the replacing one in the Before of a changed node; the removed node's panel shows the file as written): D3.
- **F3. For W-4, W-6, W-7** (they edit the same page): the edits are local: three CSS rules near the top of the stylesheet, `computeMapThroughFacet` before `diagramHasNothingToDraw`, four lines in `mountDiagramIfNeeded` (`mapState.pinned`/`hidden`/`opened` read from `input` after the call), one optional argument of `renderChangeDiffsHtml` and four lines in the removed branch of `renderWhatChangedHtml`. `harness.js` has `waitFor`; `library-page.js`'s `startPage` takes `{ dir, plateau }` to open a folder of the repository in place.
- **F4. The editor test pages can use `waitFor` elsewhere.** The other fixed delays of `folders.test.js` are waits for an absence or for a clock tick (D4); other test files were not audited.
- **F5. The header at 800 px is 200 px high with four plateaus and a comparison** (four rows). It holds; a more compact form (the issue's other directions: a list of plateaus, the id with the full name in the tooltip) is not built.
