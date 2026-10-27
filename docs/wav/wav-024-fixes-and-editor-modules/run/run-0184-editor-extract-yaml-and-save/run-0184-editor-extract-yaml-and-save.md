---
type: run
run: 0184
status: completed
profile: TDD+pln
wave: 024
---

# Run 0184: editor-extract-yaml-and-save

Wave 024, manifest id W-6.

Review pass: dispatched, the Stage 5 review of the TDD was done by a leaf agent that did not draft it; findings R-1 to R-7 are in the prg and task-001 applied them to the TDD (R-4, R-5 and R-6 re-checked by grep, prg 2026-10-27).

Files outside likely_paths: docs/wav/wav-024-fixes-and-editor-modules/ (this run's documents and the wave prg), jacoco-quarkus.exec (an untracked Maven coverage file dated 2026-10-26 that this run did not write; not removed)

## What was built

The YAML reader, its serializer and the line-preserving save left `src/main/editor/unsorted/script.js` (3546 lines) for six files of layer `core` in `src/main/editor/core/`: `yaml-parser.js` (page lines 1030-2372), `yaml-serializer.js` (2373-2526), `yaml-patch-text.js` (2527-3085), `yaml-patch-flow.js` (3086-3579), `yaml-patch-lines.js` (3580-4272) and `yaml-block-moves.js` (4273-4575), listed in that order in `layers.json` before `unsorted/script.js`. One test was added, `src/test/javascript/editor-build/yaml-parts.test.js` (DEC-5). The assembled page is unchanged.

## Verification

Read back by the Stage 11 agent on 2026-10-27, in the working tree:
- `node scripts/build-editor.mjs --check`: the page is the assembly (23170 lines); `--check-identical HEAD`: the assembly is the page of HEAD, byte for byte; sha256 starts `a653717d5564c237`; `git status` shows no change under `src/main/resources`.
- `--map`: the six parts cover 1030-4575 exactly as listed above; `unsorted/script.js` 4576-23161 (18586 lines).
- `node scripts/check-editor.mjs --layers`: 1331 names equal `names.json`, java names ok, load order holds, upward pairs 0 (max 162).
- `npm run lint` and `npm run format:check`: clean.
- `node --test src/test/javascript/editor-build/*.test.js`: 80 pass, 0 fail, including the DEC-5 tests (the six parts name nothing outside the six but `parseYamlAsModel`; the check fails on a copy where a YAML part names a function of `unsorted`).
- `npm run test:unit`: 2672 tests, 2671 pass, 0 fail, 1 skipped (the timing test, by design).
- `embed.sh --check`: the committed WebAssembly is the one the sources build.
- IMP-5 paths (`src/main/resources`, `scripts`, `package.json`, `.github`, Java sources and tests): no diff against HEAD.

Not confirmed here: the Java build, the e2e suite and the coverage floor were not re-run by this stage (the run changes no Java file, no resource and no existing test); the Native job cannot run here.

## Pending

- The six moves are uncommitted (DEC-4, second path: the executor did not commit). `scripts/check-editor-moves.sh` has not run and the pull request run is read at gate-001.
- CLAUDE.md line 16 still says "today one part, `unsorted/script.js`"; the six files of `core/` make it stale. Left for the main agent to decide.
