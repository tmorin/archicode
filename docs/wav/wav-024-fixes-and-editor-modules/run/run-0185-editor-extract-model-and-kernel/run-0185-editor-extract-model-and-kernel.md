---
type: run
run: 0185
status: completed
profile: TDD+pln
wave: 024
---

# Run 0185: editor-extract-model-and-kernel

Run of wave 024, manifest id W-7.

Review pass: dispatched at Stage 5 (KDMLLC review of the TDD by a fresh leaf agent); findings R-1 to R-4 were applied to the TDD by task-001 (prg 2026-10-27). The commits of this implementation were checked by the tools (`--check-identical`, `--statements`, `--layers`, `scripts/check-editor-moves.sh`), not by a second reader.

Files outside likely_paths: docs/wav/wav-024-fixes-and-editor-modules/ (this run's documents and the wave prg), jacoco-quarkus.exec (an untracked Maven coverage file that this run did not commit; not removed)

## What was built

Twenty parts left `src/main/editor/unsorted/script.js` (18,586 lines at the start of W-7) for files of `core`, `model` and `persistence` (rows 7 to 14, 20 to 23, 25, 29, 31, 33, 46, 47, 49, 54 of `0182 DEC-4`), `REMOVED_PLATEAUS_KEY` moved to `core/read-schema.js`, and `model/ui-state.js` (252 lines, 59 variables in five groups) sits between `unsorted/from-26.js` and `model/record-lookup.js`. `script.js` is replaced by nine `unsorted/from-<row>.js` files, in page order, for W-8. Three tests changed (DEC-5 a and b, DEC-7). Commits: see the prg of 2026-10-27.

## Verification

- Moves: each of the twenty `refactor: move` commits passes `build-editor.mjs --check-identical HEAD`; `scripts/check-editor-moves.sh b63d4b8 HEAD` says ok for every move and relocate commit.
- Relocations (the key and the five groups): `check-editor.mjs --statements HEAD` passes; `--layers` prints `upward pairs: 0 (max 162)` at every commit; `npm run editor:check` clean at the end.
- `npm run test:unit`: 2672 tests, 2671 pass, 0 fail, 1 skipped (the timing test); `npm run test:coverage` holds the floor (pages 84.08 %, total 92.67 %), floor file unchanged; `npm run lint` and `npm run format:check` clean.
- `./mvnw verify -DskipITs=false` (JDK 25): BUILD SUCCESS, 1512 unit tests and 39 integration tests, PMD and JaCoCo met; `EditorReadSchemaTest` and `GuideViewPropertiesTest` also run alone after step 7.1 and after groups 3 and 4. `npm run test:e2e`: 38 passed. `embed.sh --check` passes.
- Shown to fail: a changed character in a moved part fails `--check-identical`; a changed initializer in `model/ui-state.js` fails `--statements`.

## Pending

- The pull request run (Page, Java, Kernel, E2E, Native, Build) is read at gate-001; nothing here claims it green.
- Deviation: row 9 is 296 lines, not 297 (a blank line left with the key), recorded in the prg.
- CLAUDE.md still says "today one part, `unsorted/script.js`" (stale; W-9 rewrites it, DEF-3).
