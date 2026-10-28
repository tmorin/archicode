---
type: run
run: 0194
status: completed
profile: TDD+pln
wave: 025
---

# Run 0194: hosted-editor-tests-and-docs

Run of wave 025, manifest id W-6.

Review pass: dispatched. The Stage 5 review of the TDD and the Stage 9 consistency check were done by leaf agents in fresh contexts, independent of the drafter, and every task of the plan was independently verified (see the prg).

Files outside likely_paths: none (the changes are `.github/workflows/ci-build.yaml`, `CLAUDE.md`, `playwright.config.js`, `src/doc/README.adoc`, `src/test/e2e/*`; the docs of the wave and the run are its own records).

## Verification

Stage 11, 2026-10-28, read back from the files and rerun here: `npx playwright test --list --project=webkit` lists 10 tests in exactly the four specs (`browser-workspace`, `hosted-acceptance`, `open-and-pages`, `sample`), chromium and firefox 26 tests in 9 files each; `hosted-acceptance` passes 9 of 9 in chromium, firefox and webkit; with the sample route removed from `HOSTED_ROUTES` the three tests fail in chromium and `harness.js` is restored byte for byte (`cmp` against a copy); `npm run lint`, `npm run format:check` and `npm run editor:check` exit 0 (page is the assembly, 99 upward pairs, max 99); `ci-build.yaml` parses and has the install line `chromium firefox webkit` and the cache key `...-chromium-firefox-webkit`; no `test.skip`, no `waitForTimeout`, `retries: 0` only; the sentence "Firefox and Safari do not" is gone from the manual, `[[editor-browser-workspace]]` follows `[[editor-folders]]` and `editor-open` links to it; `CLAUDE.md` names `hosted-acceptance` and the three-browser install. The full gates of task-008 (`test:unit` 3,081 tests, full `test:e2e` 62 passed in three projects, `byte-identity.sh` 0 unexpected differences) are in the table below; the other two mutations of task-005 (card Delete handler, import name rule) were checked and restored by that task and its independent verifier, not rerun here. `docs/bkg` and `tooling/docs/check-backlog.py` do not exist in this repository, so the backlog sweep is vacuous; the TDD has no `DEF-n`, `CI-arc-n` or `CI-dom-n` item (Canonical Impact: not applicable).

## Gates (task-008, 2026-10-28)

WebKit (`webkit-2370`) is installed in `~/.cache/ms-playwright` and `webkit.launch()` exits 0, so the webkit project ran here.

| Command | Result |
| --- | --- |
| `npm run lint` | exit 0, no warning |
| `npm run format:check` | exit 0, all files in Prettier style |
| `npm run editor:check` | exit 0; page is the assembly (33,308 lines); 1,482 names equal `names.json`; load order holds; upward pairs 99 (max 99) |
| `npm run test:unit` | 3,081 tests, 3,080 pass, 0 fail, 1 skipped (the timing test, run alone by `npm run test:timing`, by design) |
| `npx playwright test --list --project=webkit` | 10 tests in exactly four files: `browser-workspace`, `hosted-acceptance` (3), `open-and-pages` (3), `sample` (3) |
| `JAVA_HOME=~/.sdkman/candidates/java/25.0.4-tem npm run test:e2e` | exit 0, 62 passed in 3.4 min in three projects (chromium, firefox, webkit); the two lines marked failed for `teardown.spec.js:27` are `test.fail` cases (expected failure) and count as passed |
| `scripts/byte-identity.sh` (base `archicode-0.19.0`) | exit 0; 20 workspaces, 332 commands, 330 identical, 1 accepted by `scripts/byte-identity-exceptions.txt`, 0 unexpected, self-check ok. A first attempt failed only because `JAVA_HOME` was not set (shell java older than 25); rerun with JDK 25 |

Skips and retries: `grep -rn "test.skip\|retries\|waitForTimeout" src/test/e2e playwright.config.js` finds only `retries: 0`; no skip, no fixed wait.
`src/main/editor` and `standalone.html` were not edited by this run (`git status` lists only the files of the TDD Scope: CI workflow, `CLAUDE.md`, `playwright.config.js`, `src/doc/README.adoc`, `src/test/e2e/*`, the docs of the wave), so DEC-4 (defect fix) did not happen.

## Notes for the owner of the wave

- `likely_paths` of W-6 in the wave plan miss `src/main/editor/**` and `src/site/index.html`; the TDD Scope names them, neither was touched.
- The three-browser job time grows (suite 3.4 min locally on one worker); the cache is about 1.3 GB with WebKit; the `E2E` job installs `chromium firefox webkit` and the cache key names them.
- Commit by path is left to the operator; nothing was committed by this workflow.

## Not proved here

- The pull request CI run (`Java`, `Page`, `Kernel`, `E2E`, `Native` green, and the `E2E` job's `--with-deps` WebKit install on `ubuntu-latest`): proved only by the pull request.
- The real Safari (Playwright's WebKit is not Safari), the stock Firefox, Windows and macOS.
- GitHub Pages itself and the `Assemble website` step (first seen on the tag run); the native runner.
- The three mutations of task-005 and the manual build were checked by their own tasks, not re-run in this task.
- Local WebKit needed `libavif16` (system package); the operator installed it.
