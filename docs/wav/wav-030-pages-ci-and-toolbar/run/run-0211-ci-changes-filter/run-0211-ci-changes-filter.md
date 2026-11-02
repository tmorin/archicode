---
type: run
run: 0211
status: completed
profile: TDD+pln
wave: 030
---

# Run 0211: ci-changes-filter

Run W-1 of wave 030 (pages, CI and toolbar), manifest id W-1.

Review pass: dispatched, the Stage 5 KDMLLC review of the TDD ran in a different agent from the drafter; its findings F-1 to F-10 were applied to the TDD by task-001 (see the prg).

Files outside likely_paths: none in the code: the changes are `.github/CLAUDE.md`, `.github/workflows/ci-build.yaml`, `scripts/changes.mjs` and `src/test/javascript/changes-map.test.js`, all inside `.github/**`, `scripts/changes.mjs` and `src/test/javascript/changes-map.test.js`; the run's own documents under `docs/wav/wav-030-pages-ci-and-toolbar/run/run-0211-ci-changes-filter/` are the only other new files (the two wave documents modified before the run began are not this run's changes).

## Proved where (REQ-7)

Recorded 2026-11-01 by task-006, on branch `wave-030-pages-ci-and-toolbar`, nothing committed yet.

### 1. Proved on the pull request (before the merge)

- The map, the readers audit (A1 to A4), the diff handling, the summary and the shell of the `Build` gate are proved by `src/test/javascript/changes-map.test.js`: `node --test` on it gives 30 tests, 30 pass, 0 fail.
- `npm run test:unit`: tests 3438, pass 3437, fail 0, skipped 1 (no test other than `changes-map.test.js` fails).
- `npm run format:check`: "All matched files use Prettier code style!", exit 0. `npm run lint` (runs `editor:build` first, `78 parts, 2716022 bytes`, `standalone.html` unchanged in `git status`): exit 0.
- `npx prettier .github/workflows/ci-build.yaml > /dev/null`: exit 0 (the workflow parses). `actionlint` is not on the path, not run.
- `node scripts/changes.mjs --list | wc -l` prints 2303 and `git ls-files | wc -l` prints 2303; the per-rule count on stderr runs R-01 (11) to R-22 (4), the default R-22 holding 4 paths (they run all four jobs).
- Dry run, on the commit before the implementation (not `HEAD`, F-2: the branch now holds `scripts/changes.mjs` and `.github/**`, which R-06 maps to all four):

  ```
  $ node scripts/changes.mjs --event pull_request --base main --head 9e7cca2
  java=false
  page=false
  kernel=false
  e2e=false
  exit=0
  ```

  The diff `main...9e7cca2` holds only `docs/wav/` files (R-04, nothing runs), so the filter shows its decision on a real diff.
- Scope guard: `git diff --stat -- src/main pom.xml package.json package-lock.json CLAUDE.md` prints nothing. `git status --short` lists `.github/CLAUDE.md`, `.github/workflows/ci-build.yaml`, the two wave docs already modified at the start, `docs/wav/.../run/`, `scripts/changes.mjs` and `src/test/javascript/changes-map.test.js`, and nothing else.

### 2. Proved only after the merge

- The wave pull request edits `.github/**`, so R-06 runs all four jobs on it (RISK-2). What it shows: the job `Changes` runs, the four outputs are `true`, `Build` passes on `true/success` pairs. It does not show a skip.
- A pull request that really skips a job: proved only by the next pull request that qualifies (for example a `docs/**` or `CLAUDE.md` change, or a manual-only one that skips `E2E` and `Kernel`).
- The behaviour on a push to `main` (the publishing steps behind a `Build` that now needs `Changes`, every output `true`): proved only by the run of `main` after the merge.
- A tag (`Release`, `Smoke`, `Publish`, every output `true`, `Release` accepting `skipped`): proved only by the next release tag.

### 3. Deviations from #192 (DEC-3, the one list; the author may overturn a row, each is a one-row edit)

| Id | Direction | Reason |
|---|---|---|
| R-03 | more (adds Page) | `check-editor.test.js` reads the one `editor-cut.json` under `docs/wav/` |
| R-09 | less (drops E2E) | `E2E` builds the jar with `-Dmaven.test.skip`, so a test class cannot reach it (the one to look at first; #192 said E2E for `src/test/java/**`) |
| R-13 | more (adds E2E) | `harness.js` serves `src/site/index.html` |
| R-17 | more (adds Java and Kernel), narrows E2E | Java and Rust read the shared cases; no e2e spec reads that folder |
| R-18 | narrows E2E | no e2e spec reads `src/test/javascript/**` |
| R-20 | more (adds Java and Kernel) | `embed.sh --check` runs `build-editor.mjs`; a `tags.path` names `scripts/byte-identity.sh` |

### Duration of Native (DEF-5)

`Native` is not filtered by this run. On the last run of `main` (run 41295233712, commit `docs: plan wave 030 ...`): Native 09:56:17 to 10:00:07 = 3 min 50 s; E2E 09:56:07 to 10:08:39 = 12 min 32 s; Java 3 min 48 s, Page 2 min 57 s, Kernel 1 min 11 s; whole run 13 min 31 s. Native is far below E2E, so it is not the wall-clock of a pull request today and DEF-5 stays deferred.

## Verification

Stage 11, 2026-11-01, re-run by the Stage 11 agent after the six tasks: `node --test src/test/javascript/changes-map.test.js` 30 tests, 30 pass, 0 fail; `npm run test:unit` tests 3438, pass 3437, fail 0, skipped 1, exit 0; `npm run format:check` exit 0; `npm run lint` exit 0; `node scripts/changes.mjs --list | wc -l` 2303 equal to `git ls-files | wc -l`; `--event push` prints four `true`; `--event pull_request` without base and head exits with the one line `error: a pull_request event needs --base and --head`; the dry run on 9e7cca2 prints four `false`; `git diff --stat -- src/main pom.xml package.json package-lock.json CLAUDE.md` prints nothing; the diff of `ci-build.yaml` ends in the job `Build` (nothing removed in the Pages publish step or in `Targets` to `Publish`). Every criterion of the pln summary was re-read in the files and holds. Stage 11 trimmed two history marks from the paragraph of `.github/CLAUDE.md` (a wave and run id in the heading and "of wave 030" in a sentence), as the CLAUDE.md rule asks. Not confirmed here: `actionlint` is not installed (the workflow parses with Prettier only); a real skip, the push to `main` and a tag are proved only after the merge (section "Proved only after the merge"). No `docs/bkg` and no `tooling/docs/check-backlog.py` exist in this repository, so the backlog sweep has nothing to run. Canonical impact: none, see the TDD (`CI-arc-1` None, `CI-dom-1` None); no analysis was fulfilled.
