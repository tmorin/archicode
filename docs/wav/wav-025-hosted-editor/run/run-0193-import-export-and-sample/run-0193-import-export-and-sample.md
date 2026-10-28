---
type: run
run: 0193
status: completed
profile: TDD+pln
wave: 025
---

# Run 0193: import-export-and-sample

Wave 025 (hosted-editor), manifest id W-5.

Files outside likely_paths: src/main/editor/layers.json, src/main/editor/model/app-state.js, src/main/editor/style.css, src/test/e2e/browser-workspace.spec.js, src/test/e2e/harness.js, src/test/e2e/sample.spec.js, src/test/java/io/morin/archicode/brightcart/BrightcartSampleTest.java, src/test/java/io/morin/archicode/cli/EditorHttpServerTest.java, package.json

Review pass: dispatched, the Stage 5 review of the TDD and the Stage 9 consistency check were made by leaf agents in fresh contexts, different from the agent that drafted each document (findings in the prg, Findings); Stage 11 is a third leaf agent.

Canonical impact: none. The TDD's Canonical Impact section says no canonical register is declared (`docs/CLAUDE.md` does not exist in this repository and `docs/ana`, `docs/bkg` do not exist either), so there is no `CI-arc-n` or `CI-dom-n` to discharge and no analysis to consume; the repository's own record of the change is the `CLAUDE.md` paragraph "Bundle I/O and the Brightcart sample".

## Sample check (task-002)

`scripts/build-sample.mjs` builds `src/main/resources/editor-webapp/samples/brightcart.yaml` (61 files carried, 0 skipped, 43,182 bytes) from the fixture and the page's codec. Tests: `build-sample-script.test.js` (6) and `sample-brightcart.test.js` (3) pass; prettier and lint are clean.

`npm run sample:check` on the tree:

```
exit 0 (no output)
```

`node scripts/build-sample.mjs --check --root <copy>` on a copy with one byte of the sample changed:

```
build-sample: src/main/resources/editor-webapp/samples/brightcart.yaml is not the bundle of src/test/resources/brightcart/layered (first difference at line 3): run `npm run sample:build`
exit 1
```

A `.md` file added to the copy of the fixture, `node scripts/build-sample.mjs --root <copy>`:

```
build-sample: the bundle skips 1 file(s) of the fixture: x.md (not YAML)
exit 1
```

## CI wiring and rehearsal of the assembly (task-004)

`.github/workflows/ci-build.yaml` gains 8 lines and changes none (`git diff --stat`: 8 insertions, 0 deletions):

- job `Page`, after "Check the editor page is the assembly of its parts" and before "Check the move commits" (so before the format check): the step "Check the Brightcart sample is the bundle of its fixture", `run: npm run sample:check`.
- job `Build`, step "Assemble website", after the line that writes `target/site/editor/index.html`: `mkdir -p target/site/editor/samples`, `cp -r src/main/resources/editor-webapp/samples/. target/site/editor/samples/`, `test -f target/site/editor/samples/brightcart.yaml` and `cmp` of that file with its source.

The workflow parses (`python3 -c "import yaml,sys; yaml.safe_load(open(sys.argv[1]))" .github/workflows/ci-build.yaml`, exit 0).

Rehearsal: the `run:` block of "Assemble website" was extracted from the workflow with PyYAML and run with `bash -euo pipefail` in a scratch copy (the page, the `samples/` folder and `src/site/index.html` of the tree, and a stand-in `target/generated-docs/index.html`) with `GITHUB_REF_NAME=archicode-0.0.0-rehearsal`.

```
exit 0
cmp target/site/editor/samples/brightcart.yaml src/main/resources/editor-webapp/samples/brightcart.yaml   -> exit 0

target/site/editor/:
-rw-rw-r-- 1 tibo tibo 2591402 index.html
drwxrwxr-x 2 tibo tibo    4096 samples
target/site/editor/samples/:
-rw-rw-r-- 1 tibo tibo   43182 brightcart.yaml
```

The same block with the `cp -r ... samples/.` line removed (`target/site` deleted first):

```
exit 1   (at `test -f target/site/editor/samples/brightcart.yaml`; `mkdir -p` had made the folder, the file is not there)
```

What this proves and what it does not: the rehearsal runs the same shell text on a copy, so a typo in the four lines or a missing source file is found here. The step runs on a tag only (CON-12), so the first proof on the real site is the tag run (the GitHub Pages configuration and the layout of a tag checkout are only seen there, RISK-2); the criterion for the published site is not met by this rehearsal alone.

## Verification (task-013)

`CLAUDE.md` gains one paragraph, "Bundle I/O and the Brightcart sample", after the one of run 0192 and before "CI jobs" (`git diff --stat CLAUDE.md`: 2 insertions, 0 deletions; made with a line insert on the file as it is).

Gates (JDK 25 for Maven):

| Command | Result |
| --- | --- |
| `npm run editor:build` | 75 parts, page written |
| `npm run test:coverage` | exit 0: 3,081 tests, 3,080 pass, 1 skipped (the timing test), 0 fail; `check-editor-statements.test.js` "--statements HEAD" is green (the sources are committed); lines 92.96 % (24,449 of 26,298), functions 96.37 % (2,236 of 2,320); "the figure holds the floor"; `git diff scripts/editor-coverage-floor.json` is empty |
| `npm run lint` | exit 0 |
| `npm run format:check` | exit 0 |
| `npm run editor:check` | exit 0; `ratchet.max` is 99 |
| `npm run sample:check` | exit 0 |
| `wc -l` of `persistence`, `application`, `presentation`, `composition` | largest part 1,494 lines (`presentation/changes-panel.js`), none near 3,000 |
| `./mvnw test-compile pmd:check` | exit 0 (BUILD SUCCESS) |
| `./mvnw verify -DskipITs=false` | exit 0 (BUILD SUCCESS), the `*IT` classes on the jar included |

Mutations (each: copy made, source changed, `npm run editor:build` for the editor parts, the named test run, file restored from the copy, `diff` against the copy and against the copy of the page empty, `npm run editor:check` exit 0):

1. One byte of `samples/brightcart.yaml` changed (line 3, `e` to `E`): `npm run sample:check` exit 1 ("is not the bundle of ... (first difference at line 3)"); `sample-brightcart.test.js` 3 fail ("the committed sample is the bundle of the fixture...", "the unbundled sample equals the files of the fixture...", "the address of the site button...").
2. The token check of the `/samples/` route dropped (`if (false && ...)` in `EditorHttpServer.handleSample`): `EditorHttpServerTest.doesNotServeTheSampleWithoutAProof` fails ("no header, no cookie ==> expected: <403> but was: <200>"), 1 failure of 27.
3. `replaceBrowserWorkspaceFiles` run before the fetch of the reset (in `confirmResetSample`, the replace with an empty set placed before `fetchSampleBundle`): `bundle-flows.test.js` 3 fail ("reset: a fetch that fails writes nothing, keeps the question and says the sentence", "reset: a transaction that fails keeps the old files", "reset: the sample is fetched first, then the files are replaced in one go...").
4. Export allowed with unsaved changes (`workspaceExportIsPending` returns `false`): `sample-landing.test.js` 2 fail ("Export from the menu is refused while changes are unsaved...", "a typed draft that is not committed counts as unsaved for Export...").
5. The sample found by the name Brightcart instead of by `sample` (`sampleRowOf`): `bundle-flows.test.js` 3 fail ("open sample: it is found by its sample property and not by its name, even renamed", "... a workspace of the visitor named Brightcart is left alone and the sample is created as Brightcart 2", "... when several workspaces are the sample, the one changed last is opened").

`git status` after the five restorations shows no change to `EditorHttpServer.java`, the sample, `bundle-flows.js`, `top-panel.js` or the page.

`scripts/byte-identity.sh` is the wave gate and was not run: no command-line behaviour changed (the Java change is one GET route of the editor server).

Not proved by this run: the tag run (the step "Assemble website" and the GitHub Pages configuration, RISK-2), the Native job (the `editor-webapp/**` include is read, not executed, and `EditorServeIT` ran on the jar only), WebKit and the real Safari, and the e2e suite was not re-run by this task (task-012 ran it).

Notes for the wave owner: the `likely_paths` of W-5 miss `src/main/editor/layers.json`, `src/main/editor/model/**`, `src/main/editor/style.css`, `src/test/e2e/**`, `src/test/java/io/morin/archicode/brightcart/**`, `src/test/java/io/morin/archicode/cli/**` and `package.json`, all touched by the design. This run did not write the wave manifest or the wave progress log.

## Stage 11 verification (2026-10-28)

Re-run by the Stage 11 agent on the tree as it stands (JDK 25 for Maven), after the task-013 table above:

| Command | Result |
| --- | --- |
| `npm run editor:build` | 75 parts, the page is unchanged (`git status` shows no change to `standalone.html`) |
| `npm run editor:check` | exit 0; 99 upward pairs (max 99) |
| `npm run sample:check` | exit 0 |
| `npm run lint`, `npm run format:check` | exit 0, exit 0 |
| `node --test src/test/javascript/site.test.js src/test/javascript/viewpoint-kernel/sample-brightcart.test.js` | 14 pass, 0 fail |
| `npm run test:coverage` | exit 0: 3,081 tests, 3,080 pass, 1 skipped (the timing test), 0 fail; lines 92.96 % (24,449 of 26,298), functions 96.37 % (2,236 of 2,320); "the figure holds the floor"; `scripts/editor-coverage-floor.json` not in the diff |
| `./mvnw package -Dmaven.test.skip -Dplugin.asciidoctor.skip=true`, then `npm run test:e2e` | exit 0 and 46 passed in 2.0 min, Chromium and Firefox, `sample.spec.js` included (3 cases per browser); the one `✘` line is the case of `teardown.spec.js` that is meant to fail |
| `./mvnw verify -DskipITs=false` | exit 0 (BUILD SUCCESS, 6:54 min): unit tests, jacoco "All coverage checks have been met", PMD, 39 integration tests on the jar (`EditorServeIT` among them) |

Criteria of the pln manifest, each read against the files: (1) the sample is committed, `sample:check` exits 0 on the tree and 1 on a copy (recorded above), `sample-brightcart.test.js` and `BrightcartSampleTest` load it; (2) `EditorHttpServer.SAMPLES` and `handleSample`, `EditorHttpServerTest` and `EditorServeIT` (green on the jar), the native includes are unchanged; (3) `ci-build.yaml` has the `Page` step and the four lines of "Assemble website", rehearsed locally; (4) `layers.json` and `names.json` carry `browser-transfer.js`, `bundle-io.js` and `bundle-flows.js`, 99 of 99, the largest part is 1,570 lines; (5) the seven new node files pass; the existing card, 360 px, theme, store, bundle and server-mode tests pass, with ONE exception to "unedited": `browser-landing.test.js` (two tests, 14 lines) lists the card actions in the order of DEC-11, as decided by the orchestrator when task-010 stopped on the contradiction (prg of wave 025, workflow 007 entry), under the pln rule "a test and the TDD disagree: change both and log it"; (6) `sample-served-mode.test.js` and the served case of `sample.spec.js` (hash of the served folder before and after); (7) `bundle-flows.test.js` and `bundle-io.test.js`; (8) the e2e run above; (9) `src/site/index.html` has the button and the sentence, `site.test.js` and `sample-brightcart.test.js` pin the link; (10) the gates above, no floor lowered; (11) the five mutations and the `CLAUDE.md` paragraph are in the task-013 section.

Not proved, and the reason the criterion for the published site is read as "rehearsed, not shipped": the tag run (the step "Assemble website" and the GitHub Pages configuration, RISK-2), the Native job (`EditorServeIT` ran on the jar only), WebKit and the real Safari, and `scripts/byte-identity.sh` (the wave gate; no command-line behaviour changed). The untracked `jacoco-quarkus.exec` at the root is a build artifact of a Maven run, not a file of the run; it is not added.
