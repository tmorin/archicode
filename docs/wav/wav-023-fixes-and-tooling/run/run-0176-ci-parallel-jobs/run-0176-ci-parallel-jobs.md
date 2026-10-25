---
type: run
run: 0176
status: completed
wave: 023
profile: single-document
---

# Run 0176: ci-parallel-jobs

Single-document profile (as runs 0164 to 0175). Wave 023, W-14, added by the author's request on 2026-10-25 ("can the CI already parallelize tasks? if yes, optimize"). The `Build` job of `ci-build.yaml` becomes four parallel jobs and a last job named `Build`.

## Scope

Changed: `.github/workflows/ci-build.yaml` (the job `Build` is replaced by `Java`, `Page`, `Kernel`, `E2E` and a new `Build`; two comments of `Native` name the new jobs), `CLAUDE.md` (what said "the `Build` job runs ..." now names the job; one paragraph "CI jobs"). Not changed: `Targets`, `Native` (needs, steps), `Release`, `Smoke`, `Publish`, the scripts of `.github/scripts`, the triggers, the concurrency block, every command of every step, no new action (the ones used are `actions/checkout@v7`, `cache@v6`, `setup-java@v6`, `setup-node@v4`, `upload-artifact@v7.0.2`, `download-artifact@v8.0.2` (already used by `Release`), `taiki-e/install-action`, `peaceiris/actions-gh-pages`), no secret or token beyond `GITHUB_TOKEN`, no server (T5).

## The layout

| Job | Check name | Permissions | Needs | Runs |
| --- | --- | --- | --- | --- |
| `Java` | Java | contents: read | none | apt (graphviz), Maven cache, JDK 25, `./mvnw verify`, Java coverage report upload, on a tag the manual as an artifact |
| `Page` | Page | contents: read | none | Node 22, `npm ci`, format, lint, editor coverage (+ report), time budget |
| `Kernel` | Kernel | contents: read | none | `cargo test`, fmt, clippy, cargo-llvm-cov, coverage, the committed-WebAssembly check |
| `E2E` | E2E | contents: read | none | JDK 25, Node 22, `npm ci`, its own jar, Playwright browsers, the suite, results on failure |
| `Build` | Build | contents: write, packages: write | Java, Page, Kernel, E2E | the check of the four results; then (main and tags only) checkout, apt, Maven cache, JDK; snapshot, release, manual download, website |

`Java`, `Page`, `Kernel`, `E2E` and `Build` all carry `if: github.event_name != 'workflow_dispatch'` (a dispatch runs only `Targets` to `Publish`, as before).

### Decisions

- **D1. `E2E` builds its own jar (option a).** `./mvnw package --batch-mode --update-snapshots -Dmaven.test.skip -Dplugin.asciidoctor.skip=true`. Measured here on a scratch copy of the tracked files (warm `~/.m2`, offline): 15 s, a 13 MB `target/quarkus-app`, `--version` prints `archicode 0.20.0-SNAPSHOT`, and the Chromium project of the suite passes on it (17 tests, 38 s). On a runner the build is estimated at 45 to 90 s (cold `~/.m2` first time), so `E2E` is about 3.7 minutes. Option (b), the artifact of `Java`, would start `E2E` after `Java` (about 5 minutes) and add the upload and download of 13 MB: the path becomes `Java` + `E2E` (about 8 minutes), the same order of magnitude as the sequential job. (a) wins by about 4 minutes of critical path, for about a minute of CPU. The manual is not in the jar (checked: `target/generated-docs` is apart), so `-Dplugin.asciidoctor.skip=true` (as `Native` and the deploy steps) saves the drawing of the manual and the need for graphviz in `E2E`.
- **D2. `E2E` has its own Maven cache key** (`<os>-e2e-m2-<pom hash>`, restore prefix `<os>-e2e-m2`, and no `cache: maven` in its `setup-java`). A build without tests downloads less than `verify`; if it saved under `Java`'s key first, the next `Java` would restore a poorer `~/.m2`. The prefix `<os>-e2e-m2` does not start with `Java`'s `<os>-m2`, so `Java` never restores it.
- **D3. `Build` runs under `!cancelled()` and checks the four results itself, first.** The default (`needs` alone) skips `Build` when a part fails. A skipped job is a passing check for a required status check, and `Release` accepts `needs.Build.result == 'skipped'` (the dispatch case): a failing part would have let a release tag go on to build a draft. With `!cancelled()` `Build` starts, the first step fails unless the four results are `success` (a skipped part is not a pass), the steps after it do not run (their implicit `success()`), so nothing is published, and `Build` is red, so `Release` (needs `success` or `skipped`) does not run. The repository has no required status check today (`gh api repos/tmorin/archicode/branches/main/protection`: no `required_status_checks`; no rulesets); the name `Build` is kept for whoever adds one.
- **D4. The manual reaches the website through an artifact.** The old job made `target/generated-docs` in `./mvnw verify` and the website copied it; the deploy steps pass `-Dplugin.asciidoctor.skip=true`, so a new `Build` has no manual. `Java` uploads `target/generated-docs` as `manual` on a tag (`include-hidden-files: true`: the folder holds `.asciidoctor/diagram`, which the website copied; 1.9 MB; retention 1 day), `Build` downloads it before "Assemble website". The manual of the website is the one that passed `verify`. Another way, drawing the manual again in `Build`, would cost graphviz and about a minute for nothing.
- **D5. `fetch-depth: 0`** stays on `Page` (the node tests read the page of released tags with `git show archicode-0.17.0:...`, 0.18.0, 0.19.0: `delete-plateau-as-released`, `save-keeps-*`, `story-player-scene`) and on `Build` (as the job had it, for the publishing steps). `Java` (no test, no plugin reads git: `grep` of `src/test/java` and the `pom.xml`), `Kernel` and `E2E` use the default depth.
- **D6. `Build` on a pull request does nothing but the check.** The checkout, apt, cache and JDK steps are conditioned on `env.PUBLISHES` (the ref is `main` or a tag, the union of the three publishing conditions), so the last job adds seconds, not the setup, to the critical path. The three publishing steps keep their `if` word for word.
- **D7. Kernel needs rustup and python3 only** (both on `ubuntu-latest`, as in the old job; rustup installs the toolchain, components and wasm target of `rust-toolchain.toml` at the first cargo command). No apt, no JDK, no Node: the node tests use the committed `.wasm`.
- **D8. `Page` needs no JDK, no graphviz and no jar**: the old job ran these steps before `./mvnw verify`, so no node test could depend on the output of Maven; the node tests spawn `node` and `git` only (checked with `grep`).

## Step mapping (old `Build`, 28 steps, to the new jobs)

Checked by a script that reads the old file from `HEAD` and the new one: each old step is found by name, with the same `run`/`uses` (and `tool`), in the job named below. Support steps (checkout, caches, setups) are repeated in each job that needs them, which is the only duplication; nothing is lost.

| # | Old step | New job | Same command |
| --- | --- | --- | --- |
| 1 | actions/checkout@v7 (`fetch-depth: 0`) | all five (full depth in `Page` and `Build`) | yes |
| 2 | Install apt dependencies | `Java`, `Build` | yes |
| 3 | Cache Maven packages | `Java`, `Build` (same key), `E2E` (own key, D2) | yes |
| 4 | Set up JDK 25 | `Java`, `Build`, `E2E` (no `cache: maven` there) | yes |
| 5 | Set up Node.js | `Page`, `E2E` | yes |
| 6 | Install the Node.js dependencies | `Page`, `E2E` | yes |
| 7 | Check the format | `Page` | yes |
| 8 | Lint the JavaScript | `Page` | yes |
| 9 | Test the viewpoint kernel | `Kernel` | yes |
| 10 | Cover the editor script | `Page` | yes |
| 11 | Keep the editor coverage report | `Page` | yes |
| 12 | Check the time budget of the kernel | `Page` | yes |
| 13 | Check the format of the viewpoint kernel | `Kernel` | yes |
| 14 | Lint the viewpoint kernel | `Kernel` | yes |
| 15 | Install cargo-llvm-cov | `Kernel` | yes |
| 16 | Cover the viewpoint kernel | `Kernel` | yes |
| 17 | Check the committed WebAssembly is the one the Rust builds | `Kernel` | yes |
| 18 | Build artifacts | `Java` | yes |
| 19 | Keep the Java coverage report | `Java` | yes |
| 20 | Find the Playwright version | `E2E` | yes |
| 21 | Cache the Playwright browsers | `E2E` | yes |
| 22 | Install the browsers of the end-to-end tests | `E2E` | yes |
| 23 | Run the end-to-end tests | `E2E` | yes |
| 24 | Keep the end-to-end results | `E2E` | yes |
| 25 | Publish snapshot artifacts | `Build` | yes, `if` unchanged |
| 26 | Publish release artifacts | `Build` | yes, `if` unchanged |
| 27 | Assemble website | `Build` | yes, `if` unchanged |
| 28 | Publish website | `Build` | yes, `if` unchanged |

(The log of the run numbers 29 steps because it adds "Set up job"; the YAML has the 28 above.) New steps, none of them a check: `Build artifacts` of `E2E` is "Build the packaged application" (D1, replaces the dependency on `verify`'s jar), "Keep the manual for the website" (`Java`) and "Download the manual" (`Build`) (D4), "Check that the four parts passed" (`Build`, D3).

## Durations (estimates from the last green run, 40225266150)

The old `Build`: 19:16:47 to 19:29:07, **740 s (12.3 min)**, of which the e2e steps 47 + 83 + about 12 s. Step times by new job (seconds, from `started_at` and `completed_at` of each step):

| New job | Steps of the old job that go there | Sum of the steps | Setup + post of its own (checkout 3, setup 3 to 8, post 3 to 10) | Estimate |
| --- | --- | --- | --- | --- |
| `Java` | apt 5, cache 4, JDK 3, verify 269, upload 2 | 283 | about 8 | **about 290 s (4.9 min)** |
| `Page` | node 1, `npm ci` 2, format 7, lint 5, coverage 219, upload 1, timing 7 | 242 | about 10 (full clone) | **about 252 s (4.2 min)** |
| `Kernel` | cargo test 28, fmt 0, clippy 6, install 1, coverage 15, embed 15 | 65 | about 6 | **about 71 s (1.2 min)** |
| `E2E` | browser cache 1, browsers 47, tests 83 + a new jar build (15 s here, 45 to 90 s estimated) + node 1, `npm ci` 2, cache 4, JDK 3 | 140 + 60 + 10 | about 15 | **about 225 s (3.8 min)**, 4.5 with a cold Maven cache |
| `Build` (pull request) | the check | 1 | about 4 | **about 5 s** |
| `Build` (main, tag) | checkout 3, apt 5, cache 4, JDK 3, then the deploy (not in the log: skipped on a pull request) | 15 | about 5 | 20 s + the deploy |

Critical path on a pull request: `Java` then `Build`, **about 295 s (4.9 min) against 740 s (12.3 min)**, about 60 % less. `Native` (160 s, untouched) is not on it. After this the longest part is the Maven build, and the next cut would be inside it (the unit tests, 269 s) or in the node suite (219 s), not in the workflow. Each job also pays a runner start-up (about 2 s) and, in total, uses about 840 s of runner time against 740 s (checkouts and setups repeated, the jar built twice): more minutes billed (free on a public repository), fewer waited.

## Review passes (single-document)

- **KDMLLC.** K: one reading order, four parts and a gate. D: the checkout and the setups are repeated per job (inherent to separate runners; the YAML has no reusable step); the publishing steps and the checks are not duplicated; the two Maven cache blocks differ on purpose (D2). M/E: every old step is in exactly one job except the setup steps; the table above shows it. L: `E2E`'s jar is built without tests and the manual; `Build` does nothing on a pull request but the check. U: the comments of each job say what it runs and why it needs what it needs. C: names of the steps are the old ones, so the names in `CLAUDE.md` still hold.
- **C scan (the file against the repository).** (1) `Release` reads `needs.Build.result` as `success` or `skipped`: with the default `needs` a failing part would have shown as `skipped`; fixed by D3, found by reading `Release`, not by the brief. (2) The deploy steps skip the manual, so the website had no manual of its own: found by reading the commands, fixed by D4. (3) `fetch-depth: 0` was a hidden need of `Page`: found by `grep` of `git show` in the node tests. (4) `CLAUDE.md` paragraphs that said "the `Build` job of CI runs this" (seven places) are corrected; the lines that name a step ("Cover the editor script", "Check the format") still hold. `release-plan.sh` says "the Maven publish of the Build job": still true.
- **Open questions.** None left. "Which jar for `E2E`" is D1 (measured). "Does a skipped dependency make `Build` green" is D3 (read, with `Release`'s condition, and no required check exists today).

## Verification

Run here:

- The YAML parses (`python3`, PyYAML 6.0.1); the jobs, `needs`, `if` and `permissions` are as the table says (printed from the parsed file). `actionlint` is not installed and was not downloaded; the expressions were read by hand (`env` is available in a step `if`; a job `env` may use `github`; `!cancelled()` and the implicit `success()` of the steps after the check).
- The step mapping script (above): every old step is found in the job named, with the same command; the four publishing steps are copied with their `if`.
- `npm run format:check`: "All matched files use Prettier code style!".
- The jar of D1: `./mvnw package -Dmaven.test.skip -Dplugin.asciidoctor.skip=true` on a scratch copy of the tracked files, 15 s, `quarkus-run.jar` exists, `--version` is `archicode 0.20.0-SNAPSHOT`, and `npx playwright test --project=chromium` on it passes 17 of 17.
- `git diff --stat`: `.github/workflows/ci-build.yaml`, `CLAUDE.md`, and the run folder only (the `prg` of the wave was already modified when the run started; it was not touched).

**Not verified (only the next CI run shows):** the real duration of each job and the critical path (the numbers above are estimates from the old run's steps, not measures); that `Java`, `Page`, `Kernel` and `E2E` are green each on a runner (`Kernel` and `Page` have never run without a JDK and graphviz, and `Page` without the Maven step before it; `E2E` has never built its jar on a runner or restored its own Maven cache); that `Build` goes green only with all four and red with one failing (the logic is read, not run: a seeded failure on a scratch branch would show it); that nothing is published on a failing part; the three publishing steps on `main` and on a tag (`GITHUB_TOKEN` and the permissions of `Build` alone, the container image push, the `manual` artifact path and `include-hidden-files`, the download of it before "Assemble website"), which only a push to `main` and a release tag run; that the pull request check named `Build` still appears (it does by construction: the job id is `Build`).

## Risks on the first run

1. `E2E`: a cold Maven cache (first run on this key) adds 30 to 60 s; it is a one-off.
2. The `manual` artifact: if `include-hidden-files` or the path is wrong, "Assemble website" fails on a tag (`test -f target/site/docs/index.html`), not silently; the first release tag is where it shows. A rehearsal is not possible from a dispatch (the website steps do not run there).
3. `Build` checkout is conditioned on `env.PUBLISHES`: if the expression evaluates to something else than the string `true`, the deploy steps would run without a checkout and fail loudly (on `main` only), nothing partial is published before the Maven step.
4. Two jobs save a Maven cache: `Java` (key `<os>-m2-...`, and `setup-java`'s own) and `Build` restores it; `E2E` has its own: no key is saved by two jobs, so no "unable to reserve cache" warning.
5. `Kernel` pays the Rust toolchain install in its first cargo command, as before (28 s in the old log for `cargo test`).
6. Permissions: `Java`, `Page`, `Kernel` and `E2E` have `contents: read`; the `upload-artifact`, cache and `taiki-e` actions need nothing more. A pull request from a fork gets a read-only token in any case.

## Findings for the wave

- The `Release` job accepts a skipped `Build`; any future change that makes `Build` conditional must keep it from being skipped by a failing dependency (D3). The comment in the workflow says it.
- The website's manual depended on `verify` having drawn it in the same job; now it is an artifact of `Java` (D4).
- The repository has no required status check or ruleset; the check names after this change are `Java`, `Page`, `Kernel`, `E2E`, `Build`, `Targets`, `Native`.
- `harness.js` and `playwright.config.js` say "after `./mvnw verify` (or `./mvnw package`)": still true; not touched.

## Tasks (the document's own list)

| Task | Status |
| --- | --- |
| T1 Read the workflow, the sibling runs, the old step times | done |
| T2 What each part needs (Java, Node, Rust, git, graphviz, the jar) by reading and `grep` | done |
| T3 Measure the jar of option (a) | done |
| T4 Write the five jobs and the gate | done |
| T5 Step mapping script, YAML parse, `format:check` | done |
| T6 `CLAUDE.md` | done |
| T7 This document | done |

## Canonical impact

**`CLAUDE.md`, "Build & Test"**: every sentence that said "the `Build` job" now names the job that runs it (`Java`, `Page`, `E2E`), and a paragraph "CI jobs" gives the layout, the gate semantics of `Build` (`!cancelled()` and the explicit check), the manual artifact, and that `Targets`, `Native` and the release jobs are as they were. No architecture impact (no code, no contract, no document of `docs/`). The wave plan and its `prg` are written by the orchestrator.
