---
type: run
run: 0183
status: completed
profile: TDD+pln
wave: 024
---

# Run 0183 editor-assembly-and-first-cuts

Run of wave 024 (fixes-and-editor-modules), manifest id W-5.

## Exit evidence

Each line cites the entry of `prg-0183-editor-assembly-and-first-cuts.md` that holds the command and its result (line 23 of the prg is the exit-evidence run of task-012 on the final tree; line 20 is the drop of step 5.4); nothing is copied here.

Exit evidence of the row W-5:

- The assembled file equals the old page: `build-editor.mjs --check` and `--check-identical HEAD~1`, prg line 23.
- The node suite, with the coverage floor unchanged: `npm run test:coverage`, prg line 23 (the floor file is byte-identical to before).
- The Java suite and `EditorServeIT`: `./mvnw verify -DskipITs=false`, prg line 23.
- The end-to-end suite: `npm run test:e2e`, prg line 23.
- `embed.sh --check`: prg line 23.
- The website `sed` line, checked locally: prg line 23.
- Layers and the ratchet: `check-editor.mjs --layers` prints `upward pairs: 0 (max 162)`, prg line 23.
- The first cuts (CSS, theme boot, kernel base64): they are the parts of `src/main/editor`, covered by the identity checks above (prg line 23). The generated-file comment of step 5.4 was dropped by the author, prg line 20; the page is unchanged by it.

Items of the P3 gate that this run owns:

- Every move commit passes `--check-identical <parent>`: `--check-identical HEAD~1` passes, prg line 23; the per-commit script `scripts/check-editor-moves.sh` is pending until the commits exist (see below).
- The ratchet count has not risen and the assembled page equals the committed one, with `embed.sh --check`: prg line 23.
- `lint`, `format:check`, `test:unit` (inside `test:coverage`), `test:e2e` and the coverage floor: prg line 23. The stale-page check shown to fail locally (exit 1) and the finding F-1: prg lines 23 and 27.

## Files outside likely_paths

Files outside likely_paths: src/main/editor/**, src/test/javascript/editor-build/**, package-lock.json, CLAUDE.md, docs/wav/wav-024-fixes-and-editor-modules/run/run-0183-editor-assembly-and-first-cuts/**

`src/main/editor/**` (new), `src/test/javascript/editor-build/**` (new), `package-lock.json` and `CLAUDE.md` are edited by this run, as the plan says. `git diff --stat HEAD -- package-lock.json CLAUDE.md` shows `CLAUDE.md` 18 lines and `package-lock.json` 2 lines changed; the new directories and the scripts `scripts/build-editor.mjs`, `scripts/check-editor.mjs` and `scripts/check-editor-moves.sh` are untracked.

IMP-7 paths are unchanged. Each path exists (`ls` printed all nine), and `git diff --stat HEAD -- pom.xml src/main/java src/test/javascript/viewpoint-kernel/harness.js src/main/resources/application.properties scripts/editor-coverage.mjs scripts/editor-coverage-floor.json scripts/extract-editor-script.mjs .prettierignore eslint.config.mjs` prints nothing (run at task-013). `EditorHttpServer.java` is under `src/main/java`, covered by the same diff. `git status` of `src/main/resources` is also empty, so the page is as committed.

## Pending for the author

- W5-11 (gate-001): the pull request does not exist yet. The Native job cannot run here (no Mandrel), so it, and the Page, Java, Kernel, E2E and Build jobs, are to be read on the pull request run; nothing here claims they are green.
- `scripts/check-editor-moves.sh <merge-base> HEAD` prints `no refactor: move or refactor: relocate commit` because the work is not committed yet (prg line 23); read its `ok` for step 5.1b once the commits exist.
- Q-3: the red Page job on a stale page is proved locally and by the tools' tests (prg line 23), not pushed. The author can ask for a throwaway commit on a scratch branch to see it red.

## Canonical impact

None: `docs/` holds run, wave and fixture documents and no canonical register is declared.

## Verification

Stage 11 re-ran the checks of the Verification Plan on the final, uncommitted tree (prg line 24 holds the result of each): `build-editor.mjs --check` and `--check-identical HEAD` (the assembly is the committed page, sha256 `a653717d5564c237`, 23,170 lines), `check-editor.mjs --layers` (1,331 names, Java names, load order, `upward pairs: 0 (max 162)`), `check-editor.mjs --cut` on `editor-cut.json` (311, 162, 100), `embed.sh --check`, `npm run editor:check`, `npm run lint`, `npm run format:check`, the 77 tests of `src/test/javascript/editor-build`, `npm run test:coverage` (2,668 pass, 0 fail, 1 skipped; 92.67 % of the lines, 96.18 % of the functions; the floor file is unchanged and holds), `./mvnw verify -DskipITs=false` (BUILD SUCCESS, 39 integration tests), `npm run test:e2e` (38 passed on chromium and firefox) and the local website `sed` line. The IMP-7 paths show an empty `git diff --stat HEAD`. Not confirmable here, and not claimed: the pull request run (gate-001, the Native job included) and the `ok` of `check-editor-moves.sh` for step 5.1b, which needs the commits.

Review pass: dispatched. The Stage 5 review of the TDD was made by an agent independent of its drafter (prg, Stage 5); its findings R-1 to R-7 were applied by task-001, and the tasks were verified one by one by agents other than their executors.
