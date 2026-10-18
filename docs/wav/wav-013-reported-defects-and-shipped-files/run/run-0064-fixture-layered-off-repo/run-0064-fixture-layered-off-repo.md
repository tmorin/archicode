---
type: run
run: 0064
status: completed
wave: 013
---

# Run 0064: Fixture layered off repo

Wave 013 (`reported-defects-and-shipped-files`), item W-1 (phase P1). Focus: open the Brightcart folder and find nothing that no tool can open, and a build that does not wait minutes for one test.
Document profile: `single-document` (the scope arrives settled by the wave plan; the only design choice is where the generator builds the layered rendition for its resolver). This file carries scope, decisions, canonical impact, review passes, tasks, verification and findings.

## Scope

1. `generate.mjs --layered <dir>` writes the layered rendition into `<dir>` (empty or absent, outside the fixture folder). Without the option the generator builds it in a temporary folder, reads it back with the resolver, checks it against `folders/` for the four plateaus (50, 42, 66, 82) and removes it. `src/test/resources/brightcart/layered/` leaves the repository (`git rm`); so do the layered saves test of `brightcart-editor.test.js`, the `layered` entry of `expected/renditions.json`, and what the README, the generator header and the document say about a committed folder.
2. The second run of `BrightcartStableOutputTest.twoRunsOnTwoCopiesWriteTheSameFilesWithTheSameBytes` covers `saas` and `marketplace` only. The first run (`Brightcart.firstRun`, shared with `BrightcartViewsTest`) and the other tests of the class still cover the four plateaus.
3. The limits of the document (section 13) say the complete-folder rendition is flat because the loader reads one level (#73).
4. No tool code (`src/main`) changes.

## Decisions

- **D1. The generated layered `workspace.yaml` keeps `settings.manifests.paths` listing the four plateau folders**: that file is what an engine would read. The output of `--layered` is byte for byte what `layered/` held (checked with `diff -r` against `git archive HEAD`).
- **D2. The generator never empties a folder it did not make.** `writeTree` empties its root; `--layered` therefore refuses a folder that is not empty or absent, and a folder inside the fixture folder (exit 2, one line). An unknown argument gives the usage line, exit 2.
- **D3. The temporary folder is `os.tmpdir()/brightcart-layered-*`, removed in a `finally` after the resolver has read it.** The counts of the layered rendition (49 files, 45 manifests, 4 `plateau.yaml`, 66 patches, 1172 lines, 32237 bytes) are printed on every run but no longer committed: `renditions.json` holds `folders` only, and the node test asserts that `layered` is absent.
- **D4. The second run of the stable-output test is a parameter, not a copy.** `Brightcart.generate(cli, dir, plateaus)`; `generateAll` is `generate` with the four. The comparison keeps the folders of the first run whose name is `views-<plateau>` or starts with `views-<plateau>-` for the two plateaus, and asserts the second run wrote exactly those names.
- **D5. Only the double run is cut.** `aRunInTheFolderWhereTheViewsAlreadyAreChangesNothing` (three `views generate` of `baseline` and of `saas` in one folder) is left as it is: the brief names the double run, and its cost is recorded in the findings for the author.

## Canonical impact

None to the architecture model (no TDD, no `CI-arc` or `CI-dom` packet): a fixture, its generator, a test and a document.

## Review passes

- **KDMLLC (inline).** K: one option, no new file. D: the layered text is still written by the one function (`writeLayered`); the counts are printed from it and no longer duplicated in `renditions.json`. M: the generator checks, the README says how, the document says why. L: no flag for the temporary folder. U: the refusal messages say what to do. C: the exit evidence of the wave plan is covered one for one in Verification.
- **C scan.** Wave plan W-1 scope against the tree: `git ls-files src/test/resources/brightcart/layered` empty; no mention of a committed `layered/` outside `docs/wav/wav-0xx` (history of earlier waves, left as written) and the sentences that now say it is generated; `BrightcartViewsTest` and the other tests of the class are untouched and still read the four plateaus.

## Tasks

- [x] T1. Read the wave plan, the document, the fixture, the generator, wave 012's runs.
- [x] T2. `generate.mjs --layered`, temporary folder, refusals; `git rm -r layered/`; regenerate `expected/`.
- [x] T3. `brightcart-editor.test.js` without the layered saves; README, generator header and document (sections 1, 3, 10, 11, 12, 13, 15).
- [x] T4. `BrightcartStableOutputTest`: second run on two plateaus.
- [x] T5. Time of the class before and after.
- [x] T6. The five commands of the P1 gate on the final tree.

## Verification

With `JAVA_HOME=/home/tibo/.sdkman/candidates/java/25.0.4-tem` and `PLANTUML_JAR=/home/tibo/git-perso/plantuml-libs/.workdir/.cache/plantuml-1.2024.7.jar`, on the final tree.

- Gate 1. `git ls-files src/test/resources/brightcart/layered`: empty (50 files `git rm`-ed, staged). `node generate.mjs` run twice: `git status --porcelain src/test/resources/brightcart` identical before and after the two runs (only this run's own edits show). `node generate.mjs --layered <empty dir>`: 50 files written (49 plus `workspace.yaml`), identical (`diff -r`) to the folder that was committed; the resolver line is `resolver     baseline 50, saas 42, inhouse 66, marketplace 82 elements (the layered rendition resolved from the files, compared with folders/)`, then `ok: ...`. A non-empty folder, a folder inside the fixture folder and an unknown argument each give one line and exit 2. No `brightcart-layered-*` is left in the temporary folder.
- Gate 2. `BrightcartStableOutputTest` (15 tests, 0 failures) second run on `saas` and `marketplace`; the first run, `BrightcartViewsTest` and the rest of the class cover the four plateaus. Time of the class, surefire `testsuite time`, `./mvnw -o -q test -Dtest=BrightcartStableOutputTest`, before and after alternated on the same machine (an IDE and a browser were running, so the load changed from one run to the next; the pairs are the comparison):
  | Pair | Load | Before (HEAD) class / second-run test | After class / second-run test |
  | --- | --- | --- | --- |
  | 1 | 8 to 5 | 235.9 s / 53.2 s | 217.5 s / 37.8 s |
  | 2 | 6 to 3.5 | 133.0 s / 36.0 s | 126.3 s / 21.4 s |
  A single earlier run of the unchanged class, at a load of about 3, took 264.5 s (wall 7m41s with Maven); the same run after the change under a load of 10 took 298 s, which says only that the load decides. The cut saves 15 s of the test (about 40%) and 7 to 18 s of the class; the class does **not** fall to a fraction. It stays above a minute unloaded (126 s in the quietest pair).
- Gate 5 (the document). Section 13 has the bullet "The complete-folder rendition is flat, so it does not exercise sub-folders" (loader reads one level, #73); the README of the fixture has "The layered rendition" with the command.
- Gate 6. `./mvnw -o verify`: BUILD SUCCESS, 412 tests, 0 failures, 0 errors, 0 skipped (407 s). `cargo test --manifest-path src/main/rust/viewpoint-kernel/Cargo.toml`: 173 passed. `src/main/rust/viewpoint-kernel/embed.sh --check`: "the committed WebAssembly is the one the sources build (655569 bytes)", exit 0. `node --test "src/test/javascript/**/*.test.js"`: 967 pass, 0 fail. `npx prettier --check "src/**/*.java"`: clean.
- `grep -rn "layered/"` over `src/test/resources/brightcart`, `docs/fixtures`, `src/test/javascript`, `src/test/java`: no match. The earlier waves' documents (`docs/wav/wav-008` to `wav-012`) still say `layered/`: they are the history and are left as written.

## Findings

- **F1. The stable-output class stays slow after the cut (answer to the wave's open question "The cost of verify").** What remains is the shared first run (four plateaus, needed by `BrightcartViewsTest`) and `aRunInTheFolderWhereTheViewsAlreadyAreChangesNothing` (`views generate` twice for `baseline` and for `saas`, after the shared run). A `views generate` takes 20 to 110 s per plateau on this machine (CLI alone, under load: baseline 21 s, saas 51 s, inhouse 81 s, marketplace 112 s: PlantUML renders every view). The author decides whether to tag the class (for example to run it in CI only) or to cut the in-folder test to one plateau; neither is done here.
- **F2. Timings are not stable on this machine.** The same unchanged class took 133 s to 265 s across runs; wave 012 measured 84.7 s. Any threshold on this time needs a run at a known load.
