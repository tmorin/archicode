---
type: run
run: 0188
status: completed
profile: TDD+pln
wave: 024
---

# Run 0188: editor-modules-closeout

Run of wave 024, manifest id W-9. Done by hand in the main worktree, commits by path, no workflow, nothing pushed.

Review pass: inline, by the run's author, against the tools; no fresh-agent review was dispatched. The change was checked by the gate P3 commands below (all run on the tree of the run), not by a fresh agent.

Files outside likely_paths: package.json (the format scripts), README.md (a short section "Editor sources"), src/main/editor/** (formatter output), src/test/javascript/** (six tests that read the page text, one new test), docs/wav/wav-024-fixes-and-editor-modules/ (this run's documents, the wave manifest and the wave prg), jacoco-quarkus.exec (an untracked Maven coverage file, not committed, not removed)

## What was built

- `package.json`: `format` and `format:check` also cover `src/main/editor/**/*.{js,mjs}`. `.prettierignore` no longer says the page waits for #161; it keeps the generated page (the output of `editor:build`) out, and the sources are formatted. `style.css` and `page.html` stay out (DEC-1 of the TDD).
- `style:` commit `6ff0a60`: formatter output on the 69 parts, `theme-boot.js` and `codemirror-loader.mjs`, with the page rebuilt (23,219 to 30,876 lines). Names, load order and the ratchet are unchanged (1334 names, 99 pairs).
- Tests: five tests matched the page text on one line (`comparison-cache`, `diagram-box-tab-stops`, `inspection-links` twice, `plateau-compare`) and a sixth (`diagram-link-tab-stops`) matched an export loop; their expressions allow white space between tokens, the `modelsChanged()` window is 12 lines instead of 8. `delete-confirmation-form.test.js` (6 tests) runs the Confirm delete block of the form, which the node suite did not run, because the formatted page put the `editing` area under its floor (89.49 % of the lines against 90).
- `scripts/editor-coverage-floor.json` raised, never lowered (`pages` lines 83.8 to 87.1, `other` lines 88.1 to 90, functions 75 to 76.4). `SECTIONS` unchanged: its markers are heading comments, kept by Prettier, each matched once in the assembled page. A report per part file was not built (the lines of the report map to a part with `build-editor.mjs --where`).
- CLAUDE.md: the paragraph of the generated page (69 parts, six layer folders, no `unsorted`, downward-only rule, the redraw contract `requestRedraw()` / `onRedraw` / `modelsChanged()`, ratchet 99, the commit kinds `refactor: move|relocate|change` and `style:`), the format paragraph and the coverage paragraph. README.md: "Editor sources". The manual (`src/doc/README.adoc`) is for readers of the tool and has no contributor section: unchanged.

## Verification

Gate P3, each command run on the tree of this run (HEAD `1df1e2d`):

- `./mvnw verify -DskipITs=false` (JDK 25.0.4-tem): BUILD SUCCESS, 1512 unit tests (2 skipped), 39 integration tests, PMD and the JaCoCo floors passed.
- `npm run test:unit` through `npm run test:coverage`: 2683 tests, 2682 pass, 1 skipped (the timing test); the figure holds its floor: 92.83 % of the lines (22,610 of 24,356), 96.32 % of the functions (2,021 of 2,098).
- `npm run test:e2e`: 38 passed (Chromium and Firefox) on the jar of the `verify` above.
- `npm run lint`: zero findings. `npm run format:check`: clean. `npm run editor:check`: the page is the assembly, 1334 names, load order holds, `upward pairs: 99 (max 99)`.
- `src/main/rust/viewpoint-kernel/embed.sh --check`: the committed WebAssembly is the one the sources build.
- `scripts/check-editor-moves.sh 2784716 HEAD`: exit 0, 59 commits checked (53 `refactor: move`, 6 `refactor: relocate`).
- `scripts/byte-identity.sh`: 20 workspaces, 332 commands, 330 identical, 1 accepted by the exceptions, 0 unexpected, self-check ok (21 minutes).
- No test of the comparison with a released page was touched in the phase (`git diff 2784716 HEAD` over the 8 tests that name `archicode-0.17.0` to `0.19.0`: empty).

## Pending

- The pull request run is not read; nothing was pushed.
- `style.css` and `page.html` are not formatted; 25 tests read the CSS as one-line rules.
- The 99 upward pairs are not removed (relocations, later steps). The coverage report is by area, not by part file.
- The wave is not marked completed and the pull request is not closed: that is the author's.
