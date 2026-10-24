---
type: run
run: 0173
status: completed
wave: 023
profile: single-document
---

# Run 0173: editor-script-coverage-floor

Single-document profile (as runs 0164 to 0172). Wave 023, W-10, Q6, T10, V-G, V-H, V-E, V-C. How much of the editor page's script the node suite runs, measured by area, with a floor that CI refuses to lower. Twins: run 0171 (Java), run 0172 (Rust kernel).

## Result

The node suite (`npm run test:unit`, 2,581 tests now, 2,576 before) runs **92.7 % of the lines of code** of the editor script (15,469 of 16,692) and **96.2 % of its functions** (2,015 of 2,095). That is above 90 %, so the floor of the total is 90 (Q6), and the figure did not need thousands of lines of tests: it needed a measure that is true.

| area | lines | covered | of | functions | covered | of |
|---|---:|---:|---:|---:|---:|---:|
| `yaml-and-save` | 96.01 % | 3,202 | 3,335 | 99.69 % | 327 | 328 |
| `layers-and-plateaus` | 98.09 % | 2,415 | 2,462 | 99.18 % | 365 | 368 |
| `workspace-and-files` | 96.31 % | 1,230 | 1,277 | 96.64 % | 144 | 149 |
| `editing` | 90.91 % | 1,271 | 1,398 | 94.08 % | 159 | 169 |
| `pages` | **83.88 %** | 2,862 | 3,412 | 93.68 % | 386 | 412 |
| `diagram` | 91.85 % | 2,312 | 2,517 | 93.47 % | 344 | 368 |
| `stories` | 97.00 % | 1,458 | 1,503 | 97.79 % | 222 | 227 |
| `story-player` | 93.01 % | 466 | 501 | 96.55 % | 56 | 58 |
| `other` | 88.15 % | 253 | 287 | 75.00 % | 12 | 16 |
| **total** | **92.67 %** | 15,469 | 16,692 | **96.18 %** | 2,015 | 2,095 |

Before this run's tests (the measure was already the final one): 92.45 % of the lines (15,432), 95.94 % of the functions (2,009 of 2,094). The five tests of `form-validators.test.js` took `editing` from 89.19 % to 90.91 % (+37 lines) and the total by 0.22 point.

## How the page is loaded, and what was found about the measure

The page is run by `harness.js` with `vm.runInContext(script, sandbox, { filename: 'standalone.html-script.js' })`, the text being the first `<script>` of `standalone.html`. V8 does see it: `NODE_V8_COVERAGE` (every test file is a process; `node --test` hands the variable to its children) writes one JSON per process and the script appears in it under that file name, with function and block ranges as offsets in that text (about 109 of the ~118 processes load the page). Two things were not as the brief supposed.

- **Some tests run another page.** `createApp({ html: released })` (the comparisons with the released pages: `save-keeps-quotes-and-comments`, `save-keeps-the-brackets`, `story-player-scene`, and the tag pages of `delete-plateau-as-released`) runs the text of an older page under the same file name; counting those ranges on the current page would be wrong. The one change to the harness: the file name is `standalone.html-script.js` for the page of the repository only, and `other-page-script.js` when `options.html` is given or `ARCHICODE_EDITOR_HTML` is set (`harness.js`, 5 lines with their comment). It changes nothing the page does.
- **The first version of the merge undercounted by 3 points** (89.68 % instead of 92.45 %) because it skipped the script's own function when merging, and with it the range that says the top-level statements ran (the object literal of `READ_SCHEMA`, 48 lines, showed as never run). Found by reading the largest "uncovered" range and asking V8 for the ranges at one of its offsets; fixed by keeping the script's ranges for the lines and leaving the script out of the functions. A figure that looks bad may be the tool, as in W-8.

`scripts/editor-coverage.mjs` (491 lines, formatted, passes ESLint):

1. runs `scripts/extract-editor-script.mjs` into `target/editor-coverage/script/` and checks that the text the harness runs is, line for line, the `page.js` ESLint reads (a line of the report is a line of `standalone.html`, the one `npm run lint` reports);
2. runs `node --test` on the suite (or on the files given) with `NODE_V8_COVERAGE=target/editor-coverage/v8`, the test output going to the terminal as `test:unit` writes it;
3. merges the processes: a line is covered when the innermost V8 block range at its first character has a count above 0 in any process; a function when its own range was called once in any process (nested functions of a function that never ran are not reported by V8 separately, so they are not in the 2,095); blank and comment lines are not counted;
4. prints the table, writes `target/editor-coverage/report.json`, `report.txt`, `uncovered-functions.txt` and `uncovered-lines.txt` (the HTML lines, in ranges, with their area);
5. fails (exit 1) when a test fails (the figure of a failing run is not judged), or when the total or any area is below the floor, listing every figure below.

Options: `--write-floor` (writes the floor from the measure, refuses to lower any figure unless `--lower`), `--no-floor`, `--floor <file>`, `--reuse` (reads the last run's V8 data, to look at a figure again in a second), and test files after the options (a subset).

**How the areas were chosen.** The page is one script with section headings (`// ===== ... =====`, `// ---- ... ----`). `SECTIONS` in the script lists, in order, an area and a marker: a regular expression of one line of the page that must match exactly once; the section runs to the next marker, and the heading comment directly above a marker belongs to it. A marker that no longer matches once, or out of order, fails the script and names the marker, so a renamed heading cannot move lines from one area to another unseen. The nine areas: `yaml-and-save` (the YAML reader and writer, and the line-preserving save), `layers-and-plateaus` (AppState, the settings, the comparison state, the plateau tree, the layers, the band, patches, the plateau edits), `workspace-and-files` (IndexedDB, loading, the served folder), `editing` (the commit pipeline, create, delete, move, the validation rules, the forms), `pages` (the shell, the panels, the help, the Changes panel, the page Plateaus, the delegated events), `diagram` (viewpoints, the comparison drawn, styles, scale/pan/export), `stories` (the library of views and stories, their editing, the dialogs, the actions), `story-player` (the announcer, the scene of a step, the player), `other` (the start of the script, the landing screen, the bootstrap). They add up to the total. Two of them are the brief's own list refined where a section is none of them (`workspace-and-files`, `editing`, `stories`). The delegated event handler `handleAppClick` (about 1,000 lines, one `switch` over the actions of every page) is in `pages`, which is why `pages` is the weakest.

## The floor

`scripts/editor-coverage-floor.json`: for the total and each area, the lines and the functions, the figure rounded down to a tenth of a point and never above 90 (Q6: a total above 90 has the floor 90; the same rule is applied to the areas and to the functions). Today: every figure 90, except `pages` lines 83.8 and `other` lines 88.1 and functions 75.0 (the three figures below 90). Raising a figure is `node scripts/editor-coverage.mjs --write-floor` (it writes only upwards, and says which figure it would have lowered); lowering one is `--write-floor --lower`, a conscious edit that shows in the diff. The command prints "it could be raised" when the total is a tenth above its floor (never, with the total at 90 and the figure above it).

Two cautions, recorded rather than hidden. (1) `other` is 12 functions of 16 and 253 lines of 287: a floor to the tenth leaves it one line of margin; a change to the landing screen or the bootstrap that adds a line no test runs fails the step, which is what a floor is for, but the first pull request will show whether the runner (Node 22; this machine has 24.12) reports the same ranges. (2) With the areas above 90 held at 90, an area can fall from 98 to 90 without a failure: the total and the area figures are a floor, not a ratchet at the figure, for what is above 90 (the wave's rule for the total, applied to the areas).

## CI

Two steps in `Build`, after "Test the viewpoint kernel", which now runs `cargo test` only:

- **"Cover the editor script"**: `npm run test:coverage`. It is THE run of the node unit suite, not a second one: same files, same tests, same output (the node reporter lines are the ones of `test:unit`, followed by the table). `npm run test:unit` is no longer a step of `Build` and stays the command to run the tests alone.
- **"Keep the editor coverage report"**: `actions/upload-artifact@v7.0.2` (the version already used by the Java step), `report.json`, `report.txt`, `uncovered-functions.txt`, `uncovered-lines.txt` of `target/editor-coverage` (not the 60 MB of V8 data), 7 days, also when the step above failed.
- **"Check the time budget of the kernel"**: `npm run test:timing`, about 5 seconds (below, the load-sensitive test).

Cost, measured on this machine (8 cores, the desktop running: the figures move by 20 % between two identical runs): the node suite alone, 161 s and 186 s (two runs); with coverage, 257 s, 196 to 248 s in the earlier runs; a first run on an idle machine, 127 s. So the coverage adds about 40 to 50 % to the node suite (60 to 90 s) and 1 to 2 s of reading ~60 MB of V8 data and merging; it replaces a step, so the `Build` job grows by that, plus 5 s of the timing step. No server, token or secret; no dependency (V8 coverage and `node:*` modules only; `package-lock.json` unchanged).

## Seen to fail (T4, V-E)

| seeded fault | result |
|---|---|
| floor file with the total at 93, `pages` lines at 84, `other` functions at 80 (the V8 data of the last full run, `--reuse`) | exit 1, three lines: `total: lines 92.6 % is below the floor 93.0 %`, `pages: lines 83.8 % ...`, `other: functions 75.0 % ...` |
| three test files only (a seeded drop of nearly the whole suite) | 18.5 % of the lines, exit 1, every area listed |
| the two story-player test files (`story-player-modal`, `story-player-scene`, 49 tests) taken out of an otherwise full run | total 89.83 % (floor 90.0), `pages` 83.35 % (floor 83.8), `story-player` 8.98 % lines and 14.58 % functions (floor 90): exit 1, four lines, and the other areas hold. The area floor sees a drop the total would only just see |
| restored (full suite, the committed floor) | 92.67 %, "the figure holds the floor", exit 0 |

A failing test is not a coverage verdict: with the time-ratio test failing (below) the script said `the tests failed (exit 1): the coverage of a failing run is not judged` and exited 1 with the figures printed.

## Determinism of the figure

Four full runs of the suite with coverage on, with a test failing in two of them (the timing test below): the report is the same JSON, figure by figure (the total and the nine areas, lines and functions, covered and counted): 15,469 of 16,692 lines and 2,015 of 2,095 functions, four times; a fifth full run (after the timing test was moved) gives it again. V8 precise coverage counts blocks, it does not sample, and the merge takes "any process ran it", so the only way the figure moves is a test that stops running a line, which is the point. (Run time varies from 127 to 257 s; the figure does not.)

## The load-sensitive node tests

- **Found: `#125: the first quiet and the apply_patches of a plateau take less than ... times as long at 591 elements as at 82`** (`performance-budget.test.js`). It failed on its first run under coverage (15.3 times, the limit 12) and about one run in several of the plain suite (W-1, W-2, the orchestrator). A measurement showed why and what is wrong with the test as a ratio of two single timings: the first pair of a process is cold (the small pair pays for compiling the WebAssembly, 11.5 ms for the first `quiet`; from the second pair on 5.5 ms) so its ratio is 6.5 where the warm ratio of the same kernel is 10 to 13; and under the suite's 70 files running at once the large pair (which does not fit the caches) goes from 60 ms to 100 ms while the small one does not move: 17 times. The old, quadratic kernel was about 19 and 18 times (comment of the test, cold pair), so under that load no limit tells the two apart, and no number of repeats helps, since the whole file runs under the load.
  Two changes. (a) The test judges the fastest of 4 warm runs per size, one after the other (after one run thrown away), and the limit is 16, between the 13 of the new kernel warm and the 18 and 19 of the old one. (b) A ratio is only the kernel's on a quiet machine, so the test is **skipped in the suite** (the skip says why) and runs alone as `npm run test:timing` (`ARCHICODE_TIMING=1`, the file alone, the one test; 4 s: 10.2 and 12.9 times, passes), a CI step of its own. The suite goes from 2,580 passed to 2,580 passed and 1 skipped; the tests of the call counts, the reads per row and the budget's own logic (the next test: 19 times fails both entries, 8 passes) stay in the suite. With coverage on, the test failed in 2 of 5 full runs before (b), and in none of the 4 full runs after.
  This is not a retry: the test cannot pass by trying again, and it does not run where it cannot judge.
- **Not found: a second one.** The log says two. `quiet-references.test.js` #81 also reads the clock (the first `quiet` under 100 ms, the best of three; then a cached lookup under 5 ms), measured here at 9 to 15 ms and microseconds: 10 times and some hundreds of times below the limits, and it did not fail in any of the full runs of this run (nine). `performance-budget.test.js` is the only other file with `performance.now`, and its other timings are recorded, not asserted. The other failure of W-2 ("3 on a stale fixture") was a stale generated fixture, not a timing.

## Tests added (T10)

`src/test/javascript/viewpoint-kernel/form-validators.test.js`, 5 tests, each asserting what the page function answers (nothing runs a line to run it): `validateNewListEntry` (trims; blank, `undefined`, `null`, a number and an object are `Value is required.`), `validateNewTagKey` (trimmed key, case-sensitive, blank is required, an existing tag is refused with the sentence naming it, and `toString` is a free key until it is a tag: the `hasOwnProperty` guard), `validateFacetActionDraft` (trims a JSONPath; blank and non-texts are `JSON path is required.`), `fileHasUnsavedChanges` and `currentFileEditorText` (an unknown file has none; a dirty one, a rejected draft and an editor holding other text each do; the textarea is the editor when there is no CodeMirror view and the CodeMirror document comes first; no file being edited is `null`). They add 37 lines to `editing` (89.19 % to 90.91 %). No other test was written: `pages` (83.88 %) and `diagram` hold their uncovered lines in the click, pointer and keyboard handlers that the harness has no DOM to drive (`handleAppClick` cases `add-qualifier`..., `handleAppPointerDown`, `startDiagramPan`, `handleNavKeydown`, `exportDiagramPng`: 132 lines in one run of the `add-*` actions alone); the e2e suite of W-13 is where they are exercised, and `#161` is what makes them testable without it. Writing tests that call the handlers with a fake event to run their lines was not done (T10).

## What is not covered, and what to do (for #161 and W-13)

`target/editor-coverage/uncovered-lines.txt` lists the 1,223 lines no test runs, by range and area; the largest: `handleAppClick` 22401-22532 (the `add-*` actions of the element form, 132 lines), 21996-22028, `startDiagramPan` 18132-18164, `handleStoryPlayerPointerDown` 21247-21274, `handleNavKeydown` 19011-19055, `exportDiagramPng` 18325-18347, `diagramNeighbor` 18167-18189 and the form's textarea and tag-key code 13555-13596 and 13861-13891. They are DOM event code, behind a click, a pointer or a key. The 80 functions never called are in `uncovered-functions.txt` with their length.

## V-H (mutation score)

No mutation tool is in the repository for JavaScript, and the wave's V-H names PIT and `cargo-mutants` for the packages W-8 and W-9 added the most tests to; this run added five tests to the page. They were checked by hand against four mutants of the page (a copy of the page in the scratch, run with `ARCHICODE_EDITOR_HTML`, nothing committed): `validateNewTagKey` with `hasOwnProperty` replaced by `in` (the `toString` test fails), without `.trim()` (the first tag test fails), `validateNewListEntry` turning a number into a text (the non-text assertion fails), `fileHasUnsavedChanges` ignoring the rejected draft (the unsaved-changes test fails). All four killed; none survived.

## Gates run before the end

`npm run test:coverage`: exit 0, 92.67 % (above). `npm run test:unit`: exit 0, 2,581 tests, 2,580 passed, 1 skipped (the timing test, which `npm run test:timing` runs and passes). `npm run format:check` and `npm run lint`: exit 0. `cargo test`: 268 passed. `(cd src/main/rust/viewpoint-kernel && cargo fmt --check && cargo clippy --all-targets -- -D warnings)`: exit 0. `embed.sh --check`: exit 0 (794,741 bytes, the committed `.wasm`; the page `standalone.html` is not touched). `./mvnw verify -DskipITs=false` (JDK 25): exit 0, 1,492 unit tests (2 skipped, as before), 39 integration tests, "All coverage checks have been met". `scripts/byte-identity.sh --no-build` (JDK 25 on the PATH; the first attempt ran under the shell's Java 21 and every command died with `ExceptionInInitializerError`, which the script reported as 136 unexpected: not a result): 20 workspaces, 332 commands compared, 330 identical, 1 accepted by the exceptions file (the harness's self-check), **0 unexpected**. `standalone.html` and the kernel are untouched, so this is the expected result.

## Findings of the run (for the wave, not written into its files)

1. A coverage figure of the page is only true if the loader's file name is: a page loaded under the same name for a released text would be counted as this page. `harness.js` now names it. Any future loader of the page in a test (the e2e suite loads it in a browser: not this figure) should keep the name.
2. A ratio of two wall-clock timings is not a deterministic assertion in a suite that runs 70 files at once: it must run alone. The pattern (`skip` + an npm script + a CI step) is the one to use for any further timing test.
3. The floor is capped at 90 for every figure, so what is above 90 is not protected beyond 90; if the author wants a tighter ratchet for the areas above 90 (floor at the figure), it is one line in `floorOf` and `--write-floor`.
4. Node 22 (CI) against Node 24 (here): V8 12.4 against 13.6 may write different block ranges for the same page; `other` has one line of margin. Not verifiable here.
5. No bug in the page was met. The one thing in the page that is easy to misread: `validateNewTagKey` checks `hasOwnProperty`, so a tag named `toString` is a free key (pinned by the new test).

## Not verified

- The CI run on a runner (the three new steps, Node 22, the artifact upload, the cost there); that the figure on Node 22 is the one of Node 24 (the floors are tenths, `other` has one line of margin).
- That the old quadratic kernel fails the new limit of 16 on a quiet machine warm: its ratio was measured only in the comment of the test (19 and 18, cold). An attempt to run the page of the commit before the fix (`ARCHICODE_EDITOR_HTML`) stopped at the scenario (`plateauTree` null on that page); the synthetic test of the budget (19 times fails both entries) is what pins the limit's logic.
- A second load-sensitive test: none found.

## Canonical impact

Canonical text changed: CLAUDE.md "Build & Test" (the command `npm run test:coverage` in the code block, one paragraph next to the Java coverage paragraph: what it measures, how the areas are made, the floor and its rule, the figure, the report, the CI steps and their cost, the timing test that moved out of the suite), `.github/workflows/ci-build.yaml` (three steps in `Build`, `npm run test:unit` replaced by `npm run test:coverage`), `package.json` (two scripts). New files: `scripts/editor-coverage.mjs`, `scripts/editor-coverage-floor.json`, `src/test/javascript/viewpoint-kernel/form-validators.test.js`. No architecture-level impact: no component, contract or flow changed; `standalone.html` and the kernel are untouched (`embed.sh --check`, the byte-identity sweep); the only change to the test harness is the name under which the page is run.
