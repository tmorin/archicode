---
type: run
run: 0186
status: completed
profile: TDD+pln
wave: 024
---

# Run 0186: editor-extract-pages-and-player

Run of wave 024, manifest id W-8. Done by hand in the main worktree, one commit per move, by path; no workflow.

Review pass: inline, by the run's author, against the tools; no fresh-agent review was dispatched. The commits were checked by the tools (`--check-identical`, `--layers`, `scripts/check-editor-moves.sh`), not by a fresh agent.

Files outside likely_paths: docs/wav/wav-024-fixes-and-editor-modules/ (this run's documents and the wave manifest), jacoco-quarkus.exec (an untracked Maven coverage file, not committed, not removed)

## What was built

The 42 parts of W-8 (rows 15 to 19, 24, 26 to 28, 30, 32, 34 to 45, 48, 50 to 53 and 55 to 68 of `0182 DEC-4`) left the nine `unsorted/from-<row>.js` files (13,241 lines) for files of the layers `application`, `presentation` and `composition`; `src/main/editor/unsorted/` holds no file any more and `layers.json` lists 83 parts in page order. The assembled page is unchanged (23,202 lines, byte for byte the page of `361d120`). The largest new part is `composition/events.js` (1,036 lines); `from-55.js` (3,890) and `from-34.js` (3,669) are cut into 14 and 12 parts, so no part is over 3,000 lines (DEF-4 of run 0185 met; the largest of all is `core/yaml-parser.js`, 1,343). The ratchet count went from 0 to 161 (max 162, not raised): `unsorted` was outside the count and the parts now are in it; those are the pairs W-11 removes.

## Verification

- Moves: each of the 42 `refactor: move` commits passes `build-editor.mjs --check-identical HEAD`; `scripts/check-editor-moves.sh 361d120 HEAD` says ok for 42 commits; `--layers` prints `upward pairs: N (max 162)` with N from 11 to 161 at every commit, never above 162.
- `npm run editor:check` clean (1331 names equal `names.json`, Java names, load order holds, 161 pairs). `names.json`, `java-names.json`, `ratchet.max`, the coverage floor and the page are not changed.
- `npm run test:unit`: 2672 tests, 2671 pass, 0 fail, 1 skipped (the timing test). `npm run test:coverage` holds the floor (pages 84.08 %, total 92.67 %, as at the end of run 0185). `npm run lint` and `npm run format:check` clean.
- `./mvnw -Dtest=EditorReadSchemaTest,GuideViewPropertiesTest,NativeReflectionConfigTest,ShippedFilesTest test` (JDK 25.0.4-tem): 0 failures. `npm run test:e2e` after `./mvnw package -Dmaven.test.skip -Dplugin.asciidoctor.skip=true -Dpmd.skip=true`: 38 passed.
- Shown to fail: the two tests that depended on `unsorted` and on a ratchet of zero failed on the first full run (`--layers passes on the repository`, the probe of `yaml-parts.test.js`) and were changed in a `test:` commit.

## Pending

- The pull request run (Page, Java, Kernel, E2E, Native, Build) is not read; Native cannot run here. `./mvnw verify` and `embed.sh --check` were not re-run: no Java, Rust or resource file changed and the page is identical.
- CLAUDE.md still describes `unsorted/script.js` (stale; W-9 rewrites it).
