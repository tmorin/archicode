---
type: wave
wave: 023
status: in-progress
date: 2026-10-24
related:
  - docs/wav/wav-023-fixes-and-tooling/wbc-023-fixes-and-tooling.md
  - docs/wav/wav-022-agent-way-in/wav-022-agent-way-in.md
  - docs/wav/wav-022-agent-way-in/prg-022-agent-way-in.md
  - CLAUDE.md
---

# Wave 023 — Fixes and Tooling

## Purpose

When this wave is done, no mistake an author can make in a manifest ends in a stack trace on a command that loads a workspace (a sweep over the shipped files shows it, and a saved view with no `properties` says `has no element` like `properties: {}` does), and a dangling reference says the file, the element that declares it and the key. The Rust, the Java and the JavaScript tests are formatted by one tool each (`rustfmt`, Prettier), clippy and ESLint run, all of it checked by the `Build` job, with nothing the tools write changed. **Every finding the tools report is fixed, not baselined** (clippy, ESLint on the tests and on the editor script, the mistake sweep). **Line coverage is above 90 % for the Java and for the Rust kernel, checked by the build**, and the part of the editor script the node suite runs is measured and cannot go down. The JavaScript tests are two named suites, unit/integration (`npm run test:unit`) and end-to-end in a real browser (`npm run test:e2e`), the second in the framework a dedicated run chose by trying the candidates. For Java, a research has answered whether static analysis can run with no server; once the author accepts its recommendation, the tool runs and the findings on `src/main/java` and `src/test/java` are fixed too.

## Non-Goals

- Does not split `standalone.html` (#161) nor format the editor page: Prettier leaves it out. ESLint does read a copy of its script, and its findings are fixed in the page (renames and deletions guarded by the node suite and the save comparison), not baselined. Coverage of the page is measured and ratcheted, not raised to 90 % here (Q6): 22,000 lines in one script is what #161 makes testable.
- Does not fix L3 and L4 of #155 (a list of lists in a patch `value`).
- Does not choose the Java analysis tool: W-7 recommends, the author accepts (D1), and only then does W-11 adopt it.
- Does not add a Sonar server, SonarCloud or any secret to CI or to a local run.
- Does not change what any command writes when it succeeds, nor the editor's save. The error sentences of W-1 and W-2 are the only outputs that move.
- Does not build the view on relationships (#143, the next wave), the importers, `plateau fold` or the matrix of plateaus.
- Does not cut a release, does not close #155; the pull request closes #158 and #159, and #160 when W-11 has run (else it comments on #160). Adding the commit hashes of the reformatting commits to `.git-blame-ignore-revs` is a chore after the merge (a rebase-and-merge rewrites the hashes).

## Decision Prerequisites

- **D1. The Java tool.** Question: which static analysis, if any, does the project adopt for Java (no server, no secret)? Input: the recommendation of W-7 (what, how it runs, a first count of findings, cost). Recorded: by the author in the progress log ("D1: adopt X", "D1: IDE route only" or "D1: none"), and on #160. Gates: P5 (W-11) only, so the author can answer while the coverage runs go on; the orchestrator stops only if W-11 is reached with no answer. If D1 is "adopt X", W-11 adopts and fixes; if "IDE route only" or "none", W-11 only writes CLAUDE.md and step 6 of #160 as far as they apply; if the author wants the wave closed first, W-11 is cancelled and #160 stays open.

The scope is otherwise the author's decisions of 2026-10-24 (#160; the findings are fixed, not baselined; line coverage above 90 %) and the open bugs #158 and #159. The points below are open questions with a default; none blocks the first run.

## Open questions

- **Q1. Clippy.** Decided by the author (2026-10-24): the findings are fixed. W-3 fixes every warning and runs `cargo clippy --all-targets -- -D warnings`. A lint whose fix would change what the kernel computes (the output of every other tool depends on it) is not fixed by editing the logic: it is turned off with a `#[allow]` on the item, with the lint name and the reason, and listed in the log (T9).
- **Q2. The Prettier options for JavaScript.** Default: the options that change the fewest lines of `src/test/javascript` among a few candidates (single quotes, width 100/120, no trailing commas), measured by W-4 with `--write` on a copy. The code is written with single quotes and about 120 columns.
- **Q3. ESLint: which rules, since there is no baseline.** Decided by the author: the findings are fixed. W-6 starts from the bug rules (`no-undef`, `no-unused-vars`, `no-shadow`, `eqeqeq`) and fixes what they report in the tests and in the page's script. A rule that reports hundreds of findings none of which is a bug (likely `no-shadow` on a 22,000-line script) is turned off in the config with the rule's name, its count and the reason (T9), rather than fixed in bulk or baselined. A fix in the page is a rename or a deletion, proved by the node suite and the save comparison (T1).
- **Q4. What W-7 compares for Java.** Default: SonarLint without a server if a documented way exists; else Error Prone, SpotBugs, PMD and Checkstyle on `src/main/java` with their findings counted; the IDE-only route as the baseline. The run lists what it could not run and why. W-7 does not fix findings: the count it measures is what W-11 fixes once D1 is answered.

- **Q5. What "above 90 %" measures.** Decided by the author: above 90 %. Default reading: JaCoCo **line** coverage of the whole bundle (`src/main/java`) and the same for **instructions**, both above 0.90, enforced by `jacoco:check` in `verify`; **branch** coverage is reported (it is 32 % in the only report that exists) and the run proposes its own floor from what it reaches, for the author to raise. For the Rust kernel, line coverage above 0.90 by `cargo llvm-cov`, enforced in CI. The author may ask for branch coverage above 90 % as well, which is a larger wave.
- **Q6. The editor page.** The page is one script of 22,000 lines in an HTML file; the node suite (2565 tests) runs it, but no figure for how much of it exists. W-10 measures it (V8 coverage of the script the tests load), publishes the figure by area, and fixes it as a floor that CI refuses to lower (a ratchet: the only baseline of the wave, because coverage can only be raised by tests, not by editing). Raising it to 90 % belongs after #161. If the measure shows the node suite already covers more than 90 %, the floor is 90 %.

- **Q7. The e2e framework (decided by W-12, with evidence).** The author asked for a dedicated run that chooses the best e2e framework or solution for ArchiCode. The criteria W-12 starts from, each answered by trying, not by reading: (1) it drives a real browser against `archicode editor serve` (the packaged jar, and the native runner if it costs nothing) on a free port; (2) headless on Linux in GitHub Actions with no paid plan, no server of ours and no secret (T5); (3) it works with the editor's way of opening a folder: `editor serve` gives the page a server-backed folder, while the browser's own folder picker (File System Access API) cannot be driven by a script, so the suite uses the served folder and the run says what that leaves untested; (4) the file the page writes can be read back from disk to assert it (the editor's output is its contract); (5) stability: auto-waiting, retries, a flakiness check of three runs; (6) cost: install size, download of browsers in CI and locally, licence, maintenance state at the date of the run, Node 22; (7) **the browsers it can drive: Chromium, and Firefox and WebKit as well** (issue #162 will need the editor tested in Firefox; the run says which of the three each candidate drives, and the winner must drive Chromium and Firefox at least); (8) how well it fits an agent: a failure says which step and what was on screen (trace, screenshot, readable logs), and the tests are plain JavaScript or TypeScript files that Prettier and ESLint read. Candidates to try (not a closed list): Playwright, Cypress, WebdriverIO, Selenium WebDriver, Puppeteer with `node --test`, and the in-app browser tools of the agent as a non-CI complement. The run names the runner-up. The author can overturn the choice by reading the log; nothing else in the wave depends on which framework wins, except W-13.
- **Q8. What the e2e suite covers.** Flows chosen for risk, not for line count: open a folder served by `editor serve` (the landing card and the error card for a folder without `.archicode.yaml`); the pages Applications, Environments, Elements, Plateaus, Stories and Settings load a shipped example with no console error; edit an element's description and save, then read the file on disk (the line-preserving save: comments and quotes kept); create an element; rename with the dialog; draw a view and see its boxes; compare two plateaus and see the Changes panel; play a story in the player (keys, Escape, focus); the address (`#/timeline/...`) opens the right page and Back/Forward work. W-12 and W-13 may shorten the list with a reason; they do not add flows that duplicate what the unit/integration suite already proves.

## Plan decisions

- **T1. Byte-identity base.** The jar built from `git archive` of the tag `archicode-0.19.0`, outside the repository. `views generate`, `stories generate`, `query graph`, `query views`, `diff`, `plateau list` and `query schemas workspace` on every shipped workspace give the same files and exit codes as the base jar (wave 022's sweep, V7 below), and the editor's save writes the bytes of the base page (the comparison of `save-keeps-quotes-and-comments.test.js`). Exceptions, listed by the run that makes them: the error sentence of a view with no `properties` (W-1), the sentence of a dangling reference (W-2), what the sweep of W-1 finds and fixes (each listed with the case that shows it), and the renames and deletions that the findings of clippy, ESLint and the Java tool ask for (W-3, W-6, W-11): none may move an output, so V-C applies to them as to the formatting.
- **T2. A fix is a sentence, not a new failure.** W-1 and W-2 change what is printed when a command already fails; no command that succeeds today starts to fail (in particular a dangling reference that no command reads stays unread: the sentence changes where it is raised, not whether). The editor and the command line say the same words where both say them (the rule of CLAUDE.md for author errors; the cases both run are in `negative-cases.json`).
- **T3. One formatter per language, checked in CI, run by npm scripts.** Rust: `cargo fmt`. Java and JavaScript: Prettier. `package.json` gets `format` and `format:check`; CLAUDE.md names them in Build & Test. The JavaScript reformatting is a commit of formatter output only (a second `--write` is a no-op) and nothing else, in a run of its own (W-5), so that `git blame` can skip it; for Rust the kernel is small and W-3 holds the formatting, the clippy fixes and the CI step, with the formatting checked as formatter-only before the fixes are made.
- **T4. A check must be seen to fail.** Each new CI step is shown red once, locally, on a deliberately wrong file (recorded in the run: the command, the exit code), then restored; a step that has never been seen to fail is not trusted.
- **T5. No analysis tool that needs a server or a secret** (the author's decision). A build that needs the network at test time is not acceptable either.
- **T6. All thirteen runs serialized, concurrency 1**, as in the last five waves: every run edits `CLAUDE.md`, the tooling runs share `ci-build.yaml`, `package.json` and `.prettierrc.yaml`, W-1 and W-2 share `KernelViewpointFactory`.
- **T8. Findings are fixed.** (Author, 2026-10-24.) No baseline file and no count that is allowed to stay: each finding of a tool is fixed, or its rule or lint is turned off with a reason written where the tool is configured (T9). A fix that would change behaviour is not made to satisfy a tool.
- **T9. A turned-off rule is a decision, so it is visible.** In the config, one line per rule or lint with the reason; the log lists them with their counts; the gate reads the list. It is the only place a finding may stay.
- **T10. Coverage is earned by assertions, not by running lines.** (Author: above 90 %, high quality.) A test written for coverage asserts what the code returns, writes or throws; a test that only calls a method does not count towards the review of the run. Nothing is excluded from the measure but code the compiler generates (Lombok marked `@Generated` through `lombok.config`, so it is not a line to cover), and each other exclusion is a line in the plugin's config with a reason (T9). A line the tests cannot reach because it is dead is deleted, not excluded.
- **T11. Two suites, named.** (Author, 2026-10-24.) The JavaScript tests are of two kinds and both are in this wave: unit/integration (today's `node --test` suite, which loads the page and the kernel in Node: `npm run test:unit`) and end-to-end (a real browser against the served application: `npm run test:e2e`). The coverage floor of W-10 is the unit/integration suite's; the e2e suite is not counted in it and does not replace any unit/integration test. Test files of the two suites live apart (`src/test/javascript/` stays unit/integration; e2e files in `src/test/e2e/` unless W-12 finds a reason).
- **T7. Draft PR after W-3.** The first run that changes CI is the first that can be proved on a runner: the pull request is opened as a draft after W-3 so that `Build` and `Native` see the new steps while the next run is written (the lesson of waves 021 and 022).

## Validation architecture

The risk of this wave is a fix that moves something it should not, and a check that is added but never fails. So the checks come from a side the author of the run does not control: the old jar, the formatter's own AST check, a seeded fault.

| # | Oracle | What it holds | Fails when |
|---|---|---|---|
| V-A | **The sweep of mistakes** (W-1) | A test takes each shipped workspace (`ManifestCorpus` C1) and, in memory, removes one key at a time from each manifest (header and content; each `required` and each optional key), empties each list and each map, and sets each key to `null`; it loads the workspace and runs `query graph` and `views generate` on it. The verdict is one of: succeeds, or exactly one `error:` line, exit 1. A stack trace, `unexpected` or an exit code other than 0 and 1 fails, except the cases in `src/test/resources/known-traces.json`, each with the issue that tracks it. The cases the sweep finds and the run fixes are in the test as named cases of their own. | a command prints a stack trace for a mistake of the author |
| V-B | **The same words in both tools** (W-2) | The cases of the dangling reference (a relationship's destination, a `uses`, a hosted application; plain and layered; in a nested element) are in one cases file read by the Java test and by a node test of the editor, as `layer-checks-cases.json` is today. | the command line and the editor disagree, or a sentence loses its file, element or key |
| V-C | **Byte identity** (every run) | T1, the sweep of wave 022 over every shipped workspace against the base jar, and for the editor the comparison with the base page. For W-3 to W-5 it is the proof that formatting changed nothing observable. | a successful output moves |
| V-D | **The formatter checks itself** (W-3, W-5) | Prettier: `--debug-check` reformats the output and compares the AST, so a reformatted file is the same program. Rust: `cargo test` (240 tests), the kernel conformance tests of the Java and node suites, and `embed.sh --check`. The reformatting commit is checked as formatter-only: a second `--write` changes nothing, and only the expected files are in it. | the formatter changed the meaning of a file, or the commit holds anything but formatter output |
| V-E | **A check with teeth** (W-3 to W-6) | T4: a deliberately wrong file per language and per tool is made, the command exits non-zero, the file is restored. For ESLint, a seeded finding fails and the tree is clean with no baseline; for the Java tool, a seeded finding fails; for coverage, a seeded drop below the floor fails. | a CI step is green whatever it is given |
| V-G | **Coverage is measured from the real run** (W-8 to W-10) | The figure comes from all the tests that run in `verify` (plain JUnit and `@QuarkusTest`: the existing report counts only the second and says 47 % of instructions, 32 % of branches, so it is not the figure), with `jacoco:check` at 0.90 for lines and instructions; the same for the kernel with `cargo llvm-cov`; the page by V8 coverage. The figure and the report are the same locally and on the runner. | the figure on the runner differs from the local one, or a floor is not enforced |
| V-H | **The tests that earn it assert something** (W-8, W-9) | On a scratch copy (nothing committed), a mutation tool (PIT for Java, `cargo-mutants` for the kernel) runs on the packages the run added most tests to; the mutation score of those packages is in the log. A package with high line coverage and a low mutation score is a defect of the run (T10). | tests that execute lines and assert nothing |
| V-I | **The e2e suite can fail and does not flake** (W-12, W-13) | A seeded break of the page (a renamed `data-action`, a save that writes the wrong line) makes the e2e suite fail with a message that names the step; three runs in a row of the unchanged tree pass; the same suite passes on the runner of CI. W-12's choice is made from the same two flows tried in each candidate, with the numbers (time, install size, failures over three runs). | the suite passes on a broken page, or fails on a good one |
| V-F | **CI is the second runner** | The CI run of the draft pull request (`Build`, `Native`, `Targets`) is green on the tip of each run; the step names match CLAUDE.md. | a step passes locally and fails on the runner |

Which run adds what:

| Run | Adds | Uses |
|---|---|---|
| W-1 | V-A (the sweep, `known-traces.json`) | V-C |
| W-2 | V-B (the cases file of dangling references) | V-A, V-C |
| W-3 | V-D (Rust), V-E for `cargo fmt` and clippy | V-C |
| W-4 | V-E for Prettier on Java; the npm scripts | V-C |
| W-5 | V-D (Prettier AST check), V-E for JavaScript | V-C |
| W-6 | V-E for ESLint (no baseline) | V-A to V-C |
| W-7 | nothing built; its evidence is the commands it ran and the counts | — |
| W-8 | V-G (Java coverage, with V-H), V-E for the floor | V-A, V-C |
| W-9 | V-G (Rust), V-E for the floor | V-D |
| W-10 | V-G (page: measure and ratchet), V-E for the ratchet | V-C |
| W-11 | V-E for the Java tool; V-C for every fix | V-A, V-C, V-G |
| W-12 | V-I (the trials) | — |
| W-13 | V-I, V-E for the e2e step | V-C, V-F |

Each run runs the gate set before it completes, and the orchestrator reruns it from disk (as in waves 021 and 022).

## Wave Manifest

```yaml
wave_manifest:
  wave: 023
  slug: fixes-and-tooling
  status: in-progress
  sources: []
  phases:
    - id: P0
      name: No stack trace, and say where
      gate:
        criteria:
          - 'a saved view of any viewpoint with no `properties` key gives, on `views generate -i <view>`, one `error:` line that names the view and `properties.element` (or the key the viewpoint needs), exit 1, no stack trace; the same view with `properties: {}` gives the same line (W-1, a test per viewpoint)'
          - 'the sweep V-A over the shipped workspaces ends every case in success or one `error:` line with exit 1; `known-traces.json` is empty, or each entry is a mistake whose fix needs a decision of the author, with an open issue (T8)'
          - 'a relationship destination, a `uses` entry and a hosted application that name no element each give one `error:` line with the file, the declaring element and the key, for a plain and for a layered workspace, and the editor says the same sentence (V-B, one cases file, a Java test and a node test)'
          - 'T1 holds: the sweep of V-C over the shipped workspaces and the editor save are byte-identical to the 0.19.0 base, except the sentences listed by W-1 and W-2'
          - '`./mvnw -o verify -DskipITs=false`, `cargo test --manifest-path src/main/rust/viewpoint-kernel/Cargo.toml`, `src/main/rust/viewpoint-kernel/embed.sh --check`, `node --test "src/test/javascript/**/*.test.js"` and `npx prettier --check "src/**/*.java"` pass'
    - id: P1
      name: One format per language, checked in CI
      gate:
        criteria:
          - '`cargo fmt --check` and `cargo clippy --all-targets -- -D warnings` pass in `src/main/rust/viewpoint-kernel`; `rust-toolchain.toml` has the two components; every `#[allow]` added for a clippy lint is listed in the log with its reason (Q1, T9); `embed.sh --check` passes; the log says whether the committed `.wasm` bytes moved, and `cargo test` (240 tests), the kernel conformance and the sweep V-C show no output moved (W-3)'
          - '`npm run format:check` checks `src/**/*.java` and `src/test/javascript/**/*.js`; the JavaScript options are in `.prettierrc.yaml`; the reformatting commit of the 118 test files is formatter output only (`prettier --write` again is a no-op, `--debug-check` passes) and the 2565 node tests pass (W-4, W-5)'
          - 'each of `cargo fmt --check`, `cargo clippy`, `npm run format:check` exits non-zero on a deliberately wrong file of its language, recorded (V-E, T4)'
          - 'the CI run of the draft pull request on the tip is green (`Targets`, `Build`, `Native`), and the names of the steps in `ci-build.yaml` match the commands in CLAUDE.md "Build & Test"'
          - '`./mvnw -o verify -DskipITs=false`, `cargo test --manifest-path src/main/rust/viewpoint-kernel/Cargo.toml`, `src/main/rust/viewpoint-kernel/embed.sh --check`, `node --test "src/test/javascript/**/*.test.js"` and `npm run format:check` pass'
    - id: P2
      name: Analysis with no server
      gate:
        criteria:
          - '`npm run lint` passes with no baseline file on `src/test/javascript/**` and on a copy of the script of `standalone.html` extracted by a script, fails on a seeded error, and is a step of `Build`; no rule that Prettier owns is on; each rule turned off is listed in the config and the log with its count and reason (T9); the page and the save are byte-identical to the base (V-C) and the 2565 node tests pass (W-6)'
          - 'the research of W-7 answers (a) to (d) of #160 step 5 with the commands run and the numbers measured (findings of each tool on `src/main/java`, Lombok and Java 25), states what it could not run, gives one recommendation with how it runs and what a first baseline looks like, and is also posted as a comment on #160; no change to the build or to `src/main/java` comes from it; the log asks D1 of the author'
          - 'no step of CI needs a server, a token or a secret that it did not have before this wave'
          - '`./mvnw -o verify -DskipITs=false`, `cargo test --manifest-path src/main/rust/viewpoint-kernel/Cargo.toml`, `src/main/rust/viewpoint-kernel/embed.sh --check`, `node --test "src/test/javascript/**/*.test.js"`, `npm run format:check` and `npm run lint` pass; CLAUDE.md "Build & Test" says the new commands'
    - id: P3
      name: Coverage above 90 %
      gate:
        criteria:
          - 'the Java figure is measured from every test of `verify` (plain JUnit and `@QuarkusTest`), and `./mvnw verify` fails when the line coverage or the instruction coverage of `src/main/java` is 0.90 or below (`jacoco:check`); the figure above 0.90 and the branch figure are in the log; the report is the same on the runner; the only exclusions are code Lombok generates and the lines listed in the plugin config with a reason (T10)'
          - 'the Rust kernel has line coverage above 0.90 by `cargo llvm-cov`, enforced in CI, with `llvm-tools-preview` in `rust-toolchain.toml` and the tool pinned; `embed.sh --check` still passes'
          - 'the share of the editor script that the node suite runs is measured by area and written in the log; a floor at that figure (or 0.90 if it is higher) is enforced in CI and fails on a seeded drop; no test was written to run lines without asserting (T10)'
          - 'the mutation score of the packages W-8 and W-9 added the most tests to is in the log (V-H), with the weak spots named; the unit tests added by W-8 to W-10 are formatted and pass ESLint and the Java tool when it is adopted'
          - '`./mvnw -o verify -DskipITs=false`, `cargo test --manifest-path src/main/rust/viewpoint-kernel/Cargo.toml`, `src/main/rust/viewpoint-kernel/embed.sh --check`, `node --test "src/test/javascript/**/*.test.js"`, `npm run format:check` and `npm run lint` pass'
    - id: P4
      name: End-to-end tests
      gate:
        criteria:
          - 'the choice of the e2e framework is recorded in the run of W-12 with the criteria of Q7, each candidate tried on the same two flows against `archicode editor serve` (measured, not described), the runner-up and why it lost, and the decision is also posted as a comment on #160 or on a new issue; no candidate that needs a server of ours, a paid plan or a secret is chosen'
          - 'the e2e suite (W-13) runs from one command (`npm run test:e2e`) against the packaged application started as `archicode editor serve` on a free port, in headless mode, on the machine and in the `Build` job of CI; it covers the flows listed in Q8 with assertions on what the page shows and on the files it writes; it is run three times in a row with no failure (flakiness check) and fails on a seeded break of the page (V-E)'
          - 'the unit/integration tests and the e2e tests are two named suites: `npm run test:unit` (`node --test`, as today) and `npm run test:e2e`; CLAUDE.md "Build & Test" names both; the e2e files are formatted by Prettier and pass ESLint (W-5, W-6); the figure of W-10 is that of the unit/integration suite, e2e adds no line to it'
          - '`./mvnw -o verify -DskipITs=false`, `cargo test --manifest-path src/main/rust/viewpoint-kernel/Cargo.toml`, `src/main/rust/viewpoint-kernel/embed.sh --check`, `node --test "src/test/javascript/**/*.test.js"`, `npm run test:e2e`, `npm run format:check` and `npm run lint` pass'
          - 'the Build job of CI is split into jobs that run in parallel (W-14), every check of the old job runs in exactly one of them with the same command, a final job named `Build` needs them all and carries the publishing steps with their conditions, and the CI run of the draft pull request shows the duration of each job and a critical path shorter than the sum of the parts (the figures are in the log)'
    - id: P5
      name: Java analysis, if the author adopts it
      gate:
        criteria:
          - 'D1 is answered in the progress log by the author before W-11 starts'
          - 'if D1 is "adopt X": X runs with no server and no secret, from one documented command, in `Build` or as a script an agent can run before a pull request (as D1 says); it reports no finding on `src/main/java` and `src/test/java`, or each rule it is told to ignore is listed in its config with its count and reason (T9); a seeded finding makes it fail (V-E); every fix is proved by V-C and the coverage floors still hold; the ten `@SuppressWarnings("java:S...")` are re-read when X is SonarLint (kept with a reason, or deleted)'
          - 'CLAUDE.md "Build & Test" and the Conventions paragraph say what runs, the coverage floors, and that no Sonar server is part of CI; #160 is closed by the pull request, or the log says what is left of it'
          - '`./mvnw -o verify -DskipITs=false`, `cargo test --manifest-path src/main/rust/viewpoint-kernel/Cargo.toml`, `src/main/rust/viewpoint-kernel/embed.sh --check`, `node --test "src/test/javascript/**/*.test.js"`, `npm run format:check` and `npm run lint` pass'
  runs:
    - id: W-1
      slug: view-without-properties-and-mistake-sweep
      phase: P0
      depends_on: []
      run: 0164
      delegation: standard
      likely_paths:
        - 'src/main/java/io/morin/archicode/viewpoint/**'
        - 'src/main/java/io/morin/archicode/resource/view/**'
        - 'src/main/java/io/morin/archicode/cli/**'
        - 'src/main/resources/editor-webapp/standalone.html'
        - 'src/test/java/io/morin/archicode/**'
        - 'src/test/resources/**'
        - 'src/test/javascript/**'
        - 'CLAUDE.md'
      focus: 'a view with no `properties` gives the same `has no element` error as `properties: {}` (#158), and a sweep of one-key mistakes over the shipped files shows what else ends in a stack trace, all fixed'
    - id: W-2
      slug: dangling-reference-names-its-source
      phase: P0
      depends_on: []
      run: 0165
      delegation: standard
      likely_paths:
        - 'src/main/java/io/morin/archicode/workspace/**'
        - 'src/main/java/io/morin/archicode/viewpoint/**'
        - 'src/main/java/io/morin/archicode/manifest/**'
        - 'src/main/resources/editor-webapp/standalone.html'
        - 'src/test/java/io/morin/archicode/**'
        - 'src/test/resources/**'
        - 'src/test/javascript/**'
        - 'src/doc/README.adoc'
        - 'scripts/**'
        - 'CLAUDE.md'
      focus: 'a dangling reference says the file, the element that declares it and the key, with the words of the layered check, in the command line and in the editor (#159)'
    - id: W-3
      slug: rust-fmt-and-clippy
      phase: P1
      depends_on: []
      run: 0166
      delegation: standard
      likely_paths:
        - 'rust-toolchain.toml'
        - 'src/main/rust/viewpoint-kernel/**'
        - 'src/main/wasm/**'
        - 'src/main/resources/editor-webapp/standalone.html'
        - '.github/workflows/ci-build.yaml'
        - 'CLAUDE.md'
      focus: 'the kernel is formatted by rustfmt and every clippy finding is fixed, both checked in CI, with the compiler and the behaviour unchanged (#160 step 3)'
    - id: W-4
      slug: prettier-scripts-and-java-in-ci
      phase: P1
      depends_on: []
      run: 0167
      delegation: standard
      likely_paths:
        - 'package.json'
        - 'package-lock.json'
        - '.prettierrc.yaml'
        - '.prettierignore'
        - '.github/workflows/ci-build.yaml'
        - 'CLAUDE.md'
      focus: 'one command formats and one checks, Java is checked in CI, and the JavaScript options are chosen from a measurement (#160 steps 1 and 2, config only)'
    - id: W-5
      slug: prettier-javascript-tests
      phase: P1
      depends_on: [W-4]
      run: 0168
      delegation: standard
      likely_paths:
        - 'src/test/javascript/**'
        - 'package.json'
        - '.github/workflows/ci-build.yaml'
        - 'CLAUDE.md'
      focus: 'the 118 JavaScript test files are formatted by Prettier in one commit of formatter output only, and `format:check` covers them in CI (#160 step 2)'
    - id: W-6
      slug: eslint-javascript
      phase: P2
      depends_on: [W-4]
      run: 0169
      delegation: standard
      likely_paths:
        - 'package.json'
        - 'package-lock.json'
        - 'eslint.config.*'
        - 'src/test/javascript/**'
        - 'scripts/**'
        - 'src/main/resources/editor-webapp/standalone.html'
        - '.github/workflows/ci-build.yaml'
        - 'CLAUDE.md'
      focus: 'ESLint finds bugs in the JavaScript tests and in the editor script, every finding is fixed or its rule is turned off with a reason, and a new one fails the build (#160 step 4)'
    - id: W-7
      slug: java-static-analysis-research
      phase: P2
      depends_on: []
      run: 0170
      delegation: standard
      likely_paths:
        - 'docs/wav/wav-023-fixes-and-tooling/run/**'
      focus: 'whether Java static analysis can run with no server, what covers the same ground if not, measured on this code, and what to adopt (#160 step 5)'
    - id: W-8
      slug: java-coverage-above-90
      phase: P3
      depends_on: []
      run: 0171
      delegation: standard
      likely_paths:
        - 'pom.xml'
        - 'lombok.config'
        - 'src/main/java/**'
        - 'src/test/java/**'
        - 'src/test/resources/**'
        - '.github/workflows/ci-build.yaml'
        - 'CLAUDE.md'
      focus: 'the Java line and instruction coverage, measured from every test, is above 90 % and the build fails below it, with tests that assert (Q5, T10)'
    - id: W-9
      slug: rust-coverage-above-90
      phase: P3
      depends_on: []
      run: 0172
      delegation: standard
      likely_paths:
        - 'rust-toolchain.toml'
        - 'src/main/rust/viewpoint-kernel/**'
        - 'src/main/wasm/**'
        - 'src/main/resources/editor-webapp/standalone.html'
        - '.github/workflows/ci-build.yaml'
        - 'CLAUDE.md'
      focus: 'the kernel line coverage is above 90 % by cargo llvm-cov and CI fails below it, with tests that assert (Q5, T10)'
    - id: W-10
      slug: editor-script-coverage-floor
      phase: P3
      depends_on: [W-6]
      run: 0173
      delegation: standard
      likely_paths:
        - 'scripts/**'
        - 'package.json'
        - 'src/test/javascript/**'
        - '.github/workflows/ci-build.yaml'
        - 'CLAUDE.md'
      focus: 'how much of the editor script the node suite runs is measured by area and cannot go down; tests are added where the figure is cheap to raise (Q6)'
    - id: W-11
      slug: java-analysis-adopted-and-findings-fixed
      phase: P5
      depends_on: [W-7, W-8]
      run: null
      delegation: standard
      likely_paths:
        - 'pom.xml'
        - 'package.json'
        - 'scripts/**'
        - 'src/main/java/**'
        - 'src/test/java/**'
        - '.github/workflows/ci-build.yaml'
        - 'CLAUDE.md'
      focus: 'the Java tool the author accepted (D1) runs with no server and every finding on the Java, tests included, is fixed; the ten inert suppressions re-read if it is SonarLint (#160 steps 5 and 6)'
    - id: W-12
      slug: e2e-framework-choice
      phase: P4
      depends_on: [W-6]
      run: 0174
      delegation: standard
      likely_paths:
        - 'docs/wav/wav-023-fixes-and-tooling/run/**'
      focus: 'choose the best end-to-end test framework or solution for ArchiCode by trying the candidates on the same two flows against editor serve, and record the decision with its evidence (Q7, T11)'
    - id: W-13
      slug: e2e-suite
      phase: P4
      depends_on: [W-12, W-5]
      run: 0175
      delegation: standard
      likely_paths:
        - 'package.json'
        - 'package-lock.json'
        - 'src/test/e2e/**'
        - 'scripts/**'
        - 'eslint.config.*'
        - '.prettierignore'
        - '.github/workflows/ci-build.yaml'
        - 'CLAUDE.md'
      focus: 'an end-to-end suite in the chosen framework runs the flows of Q8 against the served application, in CI, without flaking (Q8, T11)'
    - id: W-14
      slug: ci-parallel-jobs
      phase: P4
      depends_on: [W-13]
      run: 0176
      delegation: standard
      likely_paths:
        - '.github/workflows/ci-build.yaml'
        - 'CLAUDE.md'
        - 'docs/wav/wav-023-fixes-and-tooling/run/**'
      focus: 'the Build job is split into parallel jobs (Java, Page, Kernel, E2E) and a last job named Build publishes only when every part passed, so that the critical path of CI is the slowest part and not the sum (the author, 2026-10-25)'
```

## Phase P0 — No stack trace, and say where

| # | Run | Slug | Depends on | Focus | Scope | Exit evidence |
|---|-----|------|------------|-------|-------|---------------|
| W-1 | — | `view-without-properties-and-mistake-sweep` | — | a view with no `properties` says `has no element` (#158); a sweep shows what else ends in a stack trace | Reproduce #158 for every viewpoint (`overview`, `detailed`, `deep`, `map`) and fix it where `KernelViewpointFactory.create` reads `getProperties()` (a missing node is an empty one, one sentence that names the view and `properties.element`); check whether the editor accepts or writes a view without `properties`, and what it says. Then V-A: the sweep (`MistakeSweepTest`, `known-traces.json`): one key removed, a list or map emptied, a key set to `null`, per shipped manifest, run through `query graph` and `views generate`; fix every trace the sweep finds (T8) and add each as a named case; `known-traces.json` holds only a mistake whose fix needs the author to decide what the sentence or the behaviour should be, with an issue. Add the sentence(s) to `negative-cases.json` where both tools load it. | the test per viewpoint; the sweep green with its list; `ErrorOutput` unchanged (the traces are fixed at their source, not hidden); V-C; the sentences listed as the T1 exceptions |
| W-2 | — | `dangling-reference-names-its-source` | — | a dangling reference names the file, the element and the key (#159) | Find every place that raises `unable to find the element` (`ElementIndex.getElementByReference`, `KernelViewpointFactory.findRelationship`, the graph and the viewpoints) and the layered check's sentence (`LayerLoader`, `layerProblemsOf`); make the load-time source of the failure known (file, declaring element, key such as `relationships[0].destination`) without making any command fail that does not today (T2); one cases file read by Java and node (V-B), including a nested element, a `uses` and a hosted application; the manual's list of errors. | V-B; the sweep of W-1 still green; the layered Brightcart and the shipped examples unchanged (V-C); the sentences listed as T1 exceptions; the editor's draw of a dangling relationship (the red dashed badge) is untouched |

**Gate:** the five criteria of P0 in the manifest.

## Phase P1 — One format per language, checked in CI

| # | Run | Slug | Depends on | Focus | Scope | Exit evidence |
|---|-----|------|------------|-------|-------|---------------|
| W-3 | — | `rust-fmt-and-clippy` | — | rustfmt and clippy on the kernel (#160 step 3) | `components = ["rustfmt", "clippy"]` in `rust-toolchain.toml` (a compiler that does not change, so `embed.sh --check` must still rebuild the committed `.wasm`); measure `cargo fmt --check` and `cargo clippy --all-targets` first and write the counts in the log; `cargo fmt` first, its diff checked as formatter-only (a second `cargo fmt` is a no-op, `cargo test` unchanged) before any clippy fix is made; fix every clippy warning (Q1: a lint that would change the computation is allowed on the item with its reason, listed); re-embed with `embed.sh` and record whether the `.wasm` moved (a panic location carries a line number); CI steps `cargo fmt --check` and `cargo clippy ... -D warnings` in `Build`; CLAUDE.md. | the counts before and after; `cargo test` 240; the kernel conformance tests of Java and node; V-C; V-E for fmt and clippy; `embed.sh --check` |
| W-4 | — | `prettier-scripts-and-java-in-ci` | — | one command formats and one checks (#160 steps 1 and 2, config only) | npm scripts `format` and `format:check` (Java now; JavaScript added by W-5); the step in `Build`; Prettier options for `*.js` chosen by Q2 on a scratch copy (counts of changed lines per candidate in the log; the repository files are not rewritten here); `.prettierignore` (the page, generated and vendored files); CLAUDE.md "Build & Test" names the two commands instead of the raw `npx prettier --write`. | the CI step runs and is green; V-E for Java; the options and the measurement in the log |
| W-5 | — | `prettier-javascript-tests` | W-4 | the JavaScript tests are formatted (#160 step 2) | `prettier --write` on `src/test/javascript` (118 files at the measurement of 2026-10-24; W-4 counted 119 `.js` files plus the 3 `.mjs` generators of the Brightcart fixture) and nothing else in the commit's content; `format:check` gains the JavaScript and the CI step follows; `standalone.html` stays out (`.prettierignore`, #161). | `--debug-check` over the files; a second `--write` is a no-op; `git diff --stat` lists only test JavaScript, the script and the config; 2565 node tests pass; V-E for JavaScript |

**Gate:** the five criteria of P1 in the manifest.

## Phase P2 — Analysis with no server

| # | Run | Slug | Depends on | Focus | Scope | Exit evidence |
|---|-----|------|------------|-------|-------|---------------|
| W-6 | — | `eslint-javascript` | W-4 | ESLint finds bugs, Prettier keeps the style (#160 step 4) | Flat config with bug rules only (`no-undef`, `no-unused-vars`, `no-shadow`, `eqeqeq`, and what the first run shows is worth having); lint `src/test/javascript/**` and a copy of the script of `standalone.html` extracted by a script into a scratch folder (line numbers readable, or mapped back); the rule policy of Q3; npm script `lint`; a step in `Build`; CLAUDE.md. Every finding is fixed (an unused variable is removed, an undefined name is a defect, a shadowed name is renamed), in the tests and in the page's script; a rule with hundreds of non-bugs is turned off with its count and reason (T9). | V-E for ESLint; the node suite unchanged; the page and the save byte-identical to the base (V-C); the findings fixed and the rules turned off, with counts, in the log |
| W-7 | — | `java-static-analysis-research` | — | a recommendation for Java analysis with no server (#160 step 5) | The research of #160: (a) SonarLint without an IDE or a server, official documentation first, then unofficial wrappers (maintainer, licence, Java 25, Lombok, cost of a third-party tool in the build); (b) Error Prone, SpotBugs, PMD, Checkstyle run on `src/main/java`, findings counted, Lombok and Java 25 behaviour; (c) SonarLint in the IDE as the baseline; (d) whether an agent can run it before a pull request. Output: a short document in the run, a comment on #160, one recommendation (what, how it runs, a first baseline, cost). Nothing in `src/main/java`, `pom.xml` or CI changes; the tools are run from a scratch folder. | the commands and the counts in the run document; what could not be run, said; the comment on #160; V-C trivially (no source change) |

**Gate:** the four criteria of P2 in the manifest.

## Phase P3 — Coverage above 90 %

| # | Run | Slug | Depends on | Focus | Scope | Exit evidence |
|---|-----|------|------------|-------|-------|---------------|
| W-8 | — | `java-coverage-above-90` | — | Java line and instruction coverage above 90 %, enforced (Q5, T10) | First make the measure true: the existing report is the `@QuarkusTest` classes only (47 % instructions, 32 % branches); an ad hoc JaCoCo agent on the plain tests fails against Quarkus' class loader, so the run finds the working setup (the `jacoco-maven-plugin` with the class-loader exclusion Quarkus documents, or `quarkus-jacoco` configured to count all tests), and records the real figure per package. Add `lombok.config` (`lombok.addLombokGeneratedAnnotation = true`) so generated code is not a line to cover. Then raise the figure: tests for what is uncovered, asserting returns, files written and `error:` lines (T10); delete dead code instead of excluding it; CLI classes are covered through Picocli (`CommandLine.execute` in-process), the `it` classes stay the process-boundary tests. `jacoco:check` in `verify` at 0.90 for lines and instructions; branch figure reported with a proposed floor. V-H on a scratch copy with PIT for the packages that gained most. | the real figure before and after, per package, in the log; `verify` fails below 0.90 (V-E, seeded drop); the report equal on the runner; mutation score; V-C trivially (tests only, plus the deletions of dead code, each shown unused) |
| W-9 | — | `rust-coverage-above-90` | — | kernel line coverage above 90 % by cargo llvm-cov, enforced | `llvm-tools-preview` in `rust-toolchain.toml` (the compiler is unchanged, `embed.sh --check` must still pass); `cargo llvm-cov` (a pinned version) measures the 240 tests; add tests for what is uncovered, asserting results (T10); CI step with `--fail-under-lines 90`; V-H with `cargo-mutants` on a scratch copy for the modules that gained most. Source changes other than tests are limited to deleting dead code; the `.wasm` is re-embedded only if the source changed. | the figure per module before and after; the step fails below 90 (seeded); `cargo test` count up; the conformance tests and V-C unchanged |
| W-10 | — | `editor-script-coverage-floor` | W-6 | the share of the editor script the node suite runs, measured and ratcheted (Q6) | A script that runs the node suite with V8 coverage (`NODE_V8_COVERAGE`) and maps it to the extracted script of W-6 (function-level and line-level, by area: YAML and the save, layers, diagram, pages, story player); the figure by area in the log; a floor at the figure that CI refuses to lower; tests added where a whole area is cheap to raise, asserting what the page does. If the figure is already above 90 %, the floor is 90 %. If it is far below, the run says so and files the issue (raise after #161); it does not write thousands of lines of tests that only execute. | the figure by area; the floor enforced and failing on a seeded drop (V-E); node tests all pass; the page unchanged (V-C) |

**Gate:** the five criteria of P3 in the manifest.

## Phase P4 — End-to-end tests

| # | Run | Slug | Depends on | Focus | Scope | Exit evidence |
|---|-----|------|------------|-------|-------|---------------|
| W-12 | — | `e2e-framework-choice` | W-6 | the e2e framework for ArchiCode, chosen by trial (Q7, T11) | Build a minimal harness that starts `archicode editor serve` on a free port on a copy of a shipped example and gives a test its URL and its folder. In a scratch folder (nothing committed but the run document and the winning spike), try each candidate of Q7 on the same two flows (open the example and see a page without a console error; edit a description, save, read the file back from disk), recording install size, time, failures over three runs, how the failure reads, headless behaviour on the CI image (a trial on the draft PR's runner is allowed in a scratch workflow dispatch, not committed to `main`'s workflow), licence and last release date. Decide, name the runner-up and the reasons, say what the choice leaves untested (the browser's folder picker), and list the dependencies and the CI cost W-13 will add. | the table of trials with measured numbers; the decision and the runner-up; what is untested; the comment on #160 (or a new issue); the spike of the winner works on the machine |
| W-13 | — | `e2e-suite` | W-12, W-5 | the e2e suite for the flows of Q8 (T11) | The winner of W-12: the dependency, `npm run test:e2e`, the harness, the flows of Q8 in `src/test/e2e/`, assertions on the page and on the files written; the browser installed in CI by a pinned step; the step in `Build` after the packaging so that it runs on the jar (the native runner only if W-12 found it free); retries off (a retry hides a flake), traces/screenshots uploaded on failure only; the three-runs check; a seeded break (V-E, V-I); formatting and ESLint cover the files (W-5, W-6); CLAUDE.md names the two suites. | V-I; the three green runs; the CI run of the draft PR green with the step; both suites named in CLAUDE.md; V-C trivially (tests only) |
| W-14 | — | `ci-parallel-jobs` | W-13 | the Build job runs as parallel jobs | Split `Build` of `ci-build.yaml` into `Java` (`./mvnw verify`, the coverage report), `Page` (npm ci, format, lint, editor coverage, timing), `Kernel` (cargo test, fmt, clippy, coverage, the committed-WebAssembly check) and `E2E` (the Playwright suite, with its own jar or the artifact of `Java`, whichever measures better), and a last job named `Build` that needs them all and carries the snapshot, release and website steps with their conditions; same commands, triggers, permissions and cache keys; `Targets` and `Native` untouched. | the CI run of the draft pull request: each job green, the duration of each, the critical path against today's 8 minutes plus the e2e steps; nothing published on a failing part (read from the conditions); V-C trivially |

**Gate:** the five criteria of P4 in the manifest.

## Phase P5 — Java analysis, if the author adopts it

| # | Run | Slug | Depends on | Focus | Scope | Exit evidence |
|---|-----|------|------------|-------|-------|---------------|
| W-11 | — | `java-analysis-adopted-and-findings-fixed` | W-7, W-8 | the accepted Java tool runs, its findings are fixed (#160 steps 5 and 6) | Read D1 in the log first. If "adopt X": wire X as D1 says (Maven plugin in `verify`, a script, both), run it on `src/main/java` and `src/test/java` (the tests W-8 wrote are in scope), fix every finding (a rule that reports only non-bugs is turned off in the tool's config with count and reason, T9; a fix never changes behaviour and never lowers a coverage floor), re-read the ten `@SuppressWarnings("java:S...")` if X is SonarLint, update the Conventions paragraph and "Build & Test" of CLAUDE.md, a step in `Build` if D1 says so. If "IDE route only" or "none": CLAUDE.md only. | V-E for X; V-C for every fix; V-G floors still hold; the count of findings before and after and the rules turned off, in the log |

**Gate:** the four criteria of P5 in the manifest.

## Dependency View

```
P0:  W-1   W-2                (independent, serialized)
P1:  W-3   W-4 ── W-5
P2:  W-6 (after W-4)   W-7
P3:  W-8   W-9   W-10 (after W-6)
P4:  W-12 ── W-13 ── W-14 (W-13 also after W-5, W-6)
P5:  W-11 (after W-7, W-8, and D1)
```

Order of execution: W-1 to W-10, then W-12, W-13, W-14, then W-11 once D1 is answered (W-11 comes last so that the Java tool also reads every test the wave wrote).

## Risks

- **Overlaps, all `serialize`.** The runs are dispatched one at a time (T6). Pairs that share paths: W-1 and W-2 (`KernelViewpointFactory`, `standalone.html`, `negative-cases.json`, the Java test folders), W-3, W-4, W-5 and W-6 (`ci-build.yaml`, `CLAUDE.md`, and `package.json` for W-4 to W-6), W-3 and W-1/W-2 (`standalone.html`: the `.wasm` is embedded there, a re-embed rewrites a base64 block), every run (`CLAUDE.md`). W-7 touches nothing but its own run folder and could run beside the others; it is serialized for the repository's timing tests, which fail under load. W-8 and W-9 share `ci-build.yaml` and `CLAUDE.md`; W-9 and W-3 both edit `rust-toolchain.toml`, the kernel and the `.wasm` block of `standalone.html`; W-11 shares `pom.xml` with W-8 and edits Java that W-1, W-2 and W-8 edited.
- **The edges are real, the chain is a choice.** W-5 uses the options and scripts of W-4; W-6 uses the npm scripts and the ignore file of W-4. W-1 to W-4 and W-7 have no edge between them; the order is the reading order (fix, then tooling, then the research that measures the code as it is left).
- **A sweep that finds too much (W-1).** One-key mistakes over 421 manifests may produce many failing cases. The run fixes them (T8), most at a few shared places (a missing guard, a `requireNonNull`); if the count says the loaders need a redesign, it fixes the classes of mistake it can, lists the rest in `known-traces.json` with an issue each, and says so in the log: the wave does not turn into a rewrite of the loaders. The sweep itself must stay under the repository's time budget for the unit tests (it runs in memory, not by process), or be an integration test.
- **A fix that moves a success (T2).** The danger of W-2 is raising the dangling reference at load, which would fail workspaces that load today (the editor draws a dangling relationship on purpose). The run keeps the failure where it is and only enriches the sentence, or proves by V-C that nothing moves.
- **Reformatting the kernel moves the `.wasm` (W-3).** `rustfmt` changes line numbers, and the compiled program carries panic locations; `embed.sh --check` compares bytes. The run re-embeds and records whether the bytes moved, and the kernel tests and V-C show the behaviour did not. The base64 block in `standalone.html` then changes in the same commit.
- **Clippy fixes change code (W-3).** A lint such as `needless_range_loop` is mechanical, one such as `type_complexity` is not. Q1 gives the exit: an `#[allow]` on the item with a reason rather than a risky edit of a kernel whose output every other tool depends on. The kernel tests, the conformance tests and V-C guard every fix.
- **A formatter changes the meaning of a JavaScript file (W-5).** Rare, and Prettier's `--debug-check` is the guard, with the 2565 node tests. Template literals and long comments in the tests are the places to read.
- **A step green that cannot fail (T4).** Shown red locally for each tool; the first CI run of the draft pull request is the second look.
- **Fixing the findings of the page is the riskiest edit of the wave (W-6).** A rename in a 22,000-line script with 2565 tests around it and a save that must write the base bytes. Renames are made rule by rule, the node suite and the save comparison run after each, and a rule whose fixes cannot be made safely is turned off with count and reason (T9), not forced.
- **The size of the Java coverage work (W-8) is not known.** The only figure that exists (47 % of instructions, 32 % of branches) counts the `@QuarkusTest` classes alone and says little about the real one; plain unit tests are not in it. The run's first output is the true figure per package. If it is far below 90 %, W-8 may be the largest run of the wave: it writes tests package by package, the largest uncovered classes first, and its log records the figure after each batch so that an interrupted run resumes where it was. If the author wants the wave to finish sooner, W-8 to W-10 and W-11 are the natural wave 024.
- **Coverage bought with empty tests.** The failure mode of a coverage target. T10 and V-H (mutation score on a scratch copy) are the guards, and the review of the run reads the new tests, not the figure.
- **The page cannot reach 90 % in this wave (Q6).** A ratchet is a baseline, the only one, and the log says why: coverage can only be raised by tests, and the page is the one place where a test per area is a wave of its own.
- **A coverage tool in CI that is not on the runner.** `cargo llvm-cov` and PIT need installing; they are pinned, and PIT is not in CI (scratch copy only, V-H). The step uses the pinned version and the CI run of the draft PR is the proof.
- **A new dependency in `package.json` (W-4, W-6).** ESLint and its plugins join Prettier as `dependencies`/`devDependencies`; `npm ci` must be what CI runs, with the lockfile committed. Versions older than two weeks, and no `postinstall` script from a package that was not already there.
- **The research finds nothing usable (W-7).** A legitimate result: the recommendation is then the IDE route and the alternatives with their counts; the wave is complete without an adoption.
- **E2e is the likeliest source of flakes (W-12, W-13).** A browser, a server and a file system. The answers: no retries, auto-waiting assertions rather than sleeps, a free port and a temp copy per test, a three-runs check, and traces kept on failure only. A flow that cannot be made stable is dropped from the suite with a reason in the log, not retried.
- **The e2e suite and the folder picker.** The editor's own way of opening a folder cannot be scripted; the suite runs the served-folder path (`editor serve`). That is a stated gap of the suite, not a hidden one (W-12 records it; the manual's editor pages say what the picker does).
- **A browser download in CI.** The browser binaries come from the framework's own host at install time; the step pins the version and the CI run of the draft PR is the proof. If the chosen framework needs a download that the repository's rules do not allow, W-12 does not choose it.
- **W-12 and W-13 share nothing with the Java coverage runs but `ci-build.yaml` and `CLAUDE.md`**, and W-13 shares `package.json`, `eslint.config.*` and `.prettierignore` with W-4/W-6: serialized.
- **The wave may wait for the author at D1.** Only if W-11 is reached with no answer; the log says so, and the wave is then `completed` with W-11 named as an exception.

## Completion Criteria

The three gates in the manifest hold on the final tree. The progress log records the base of T1, the counts of clippy and of the ESLint baseline, whether the `.wasm` bytes moved, every entry of `known-traces.json` with its issue, and the deferred items as issues (the traces not fixed, the clippy lints allowed, the rules turned off, the coverage of the editor page above its floor which waits for #161). `CLAUDE.md` lists #158 and #159 as fixed, #160 with what is built (and what waits, if W-11 did not run), the coverage floors and how they are measured, and the new commands in "Build & Test". The log lists every rule and lint turned off with its count and reason, the coverage figure before and after for Java, Rust and the page, the mutation scores, and the e2e decision with its trials and runner-up. The pull request closes #158 and #159, and #160 when W-11 has run.
