---
type: run
run: 0156
status: completed
profile: single-document
wave: 021
---

# Run 0156: binaries-on-the-release-page

Wave 021, W-5 (decisions T8, T10; P1 gate criterion 3; GitHub issue tmorin/archicode#149, second item of "What is missing"). On a release, the pipeline builds the native `archicode` for `linux-amd64`, `linux-arm64` and `macos-arm64`, attaches the three files and one `SHA256SUMS` to the GitHub release page, smoke-tests each file as it is there, and only then publishes the release; a `workflow_dispatch` rebuilds and re-attaches for an existing tag, or rehearses the whole on a draft. `hard_judgment` (a job that publishes to a public page): every decision below was taken inline by the executor of the run, none delegated.

Profile `single-document`: the work is one workflow file and a handful of shell scripts with one design; a TDD would restate this page. The review passes are answered below.

## What was measured first

- `ci-build.yaml` at the start (W-4 merged in the tree): jobs `Build` and `Native` (one target, `ubuntu-latest`, Mandrel for JDK 25 through `graalvm/setup-graalvm@v1.6.7`, `-Dnative` with the integration tests, then the collect step and `actions/upload-artifact@v7.0.2`). The PR run of the wave (39929350382) shows `Native` green in 3 min (native image 1 min 50 s, peak RSS 3.36 GB on 16 GB), 30 integration tests, the artifact `archicode-0.19.0-SNAPSHOT-linux-amd64` (22.8 MB zipped, 67.7 MB the binary), linked against `dl`, `pthread`, `rt`, `z` only (no AWT library beside the binary).
- Branch protection of `main` (`gh api .../branches/main/protection`): no required status checks; rulesets: none. No check name is load-bearing, but the pull-request job keeps the name `Native`.
- The repository's default `GITHUB_TOKEN` is write-all (`default_workflow_permissions: write`; the job log lists every scope `write`). `Build` relies on it (`mvnw deploy` to GitHub Packages and ghcr, `peaceiris/actions-gh-pages`); this run does not touch `Build`'s permissions.
- Tags: `archicode-0.14.0` to `archicode-0.18.0`, no GitHub release at all (`gh release list` is empty): the first release `--generate-notes` makes must be told where to start (`--notes-start-tag`), or GitHub lists everything since the first commit.
- The CI triggers: push to `main`, push of any tag, `pull_request`. A push to a feature branch runs nothing; GitHub lets a workflow be dispatched on a branch only when a workflow file of that name exists on the default branch, which `ci-build.yaml` does (so the rehearsal can run before the merge, with the branch's version of the file).

## Evidence for the runners and the distribution

- **Runners** (docs.github.com, "GitHub-hosted runners", standard runners of public repositories, free): Linux arm64 `ubuntu-24.04-arm` (4 CPU, 16 GB), macOS arm64 `macos-latest`, `macos-14`, `macos-15`, `macos-26` (3 CPU M1, 7 GB). `macos-14` is out: the GitHub changelog of 2026-10-01 retires it on 2026-11-02 with brownouts through October (one on 2026-10-23 itself); `macos-latest` is `macos-26`. Chosen: **`macos-15`** (named, not `latest`, so the build host does not move under a release; a binary linked on 15 runs on 15 and later), **`ubuntu-24.04-arm`**, and **`ubuntu-24.04`** for `linux-amd64` (the image `ubuntu-latest` is today; pinned so that the glibc a release binary needs does not change when `latest` moves). The arm64 Linux image (partner image by Arm) ships `gh`, `git`, `curl`, `python3`.
- **Mandrel on macOS.** The brief expected "Mandrel does not build for macOS" and `graalvm-community` there. The files say otherwise: the release `mandrel-25.0.4.1-Final` publishes `mandrel-java25-macos-aarch64-25.0.4.1-Final.tar.gz` beside the two Linux builds (and its notes have a macOS quick start); `setup-graalvm@v1.6.7`'s `mandrel.ts` looks for `mandrel-java<v>-<macos|linux>-<aarch64|amd64>-` in the releases of `graalvm/mandrel` and, on macOS, takes `<top folder>/Contents/Home` as the JDK, which is the layout of that archive (listed: one top folder `mandrel-java25-25.0.4.1-Final/` with `Contents/Home`). So the three targets use **one distribution, Mandrel for JDK 25**, the one Quarkus builds with by default, and the `Native` job is the same on the three runners. Fallback if the rehearsal shows Mandrel failing on macOS: `distribution: ${{ matrix.target == 'macos-arm64' && 'graalvm-community' || 'mandrel' }}` (GraalVM CE `graalvm-community-jdk-25.0.2_macos-aarch64_bin.tar.gz` exists).
- **Memory.** The image peaks at 3.4 GB; the macOS runner has 7 GB. No `-Xmx` set.
- **Actions pinned** to exact tags, the latest releases: `actions/checkout@v7.0.1` and `actions/download-artifact@v8.0.2` in the jobs of this run (`download-artifact` v8 fails on a digest mismatch by default), `actions/upload-artifact@v7.0.2` and `graalvm/setup-graalvm@v1.6.7` as W-4 left them. `Build` keeps its major tags (`actions/checkout@v7`, ...), untouched.

## Design

Jobs of `ci-build.yaml` (one file: GitHub dispatches only a workflow the default branch knows):

| job | runs on | needs | when | permissions | what |
|---|---|---|---|---|---|
| `Build` | `ubuntu-latest` | - | every event but `workflow_dispatch` | the repository default (unchanged) | unchanged: unit tests, Maven/OCI publish, website |
| `Targets` | `ubuntu-24.04` | - | always | `contents: read` | runs `test-release-scripts.sh` (fakes), then `release-plan.sh`: the matrix and the release |
| `Native` / `Native (<target>)` | `matrix.runner` | `Targets` | once `Targets` passed (a release script that fails its test holds the native build of the pull request back: chosen, the failure is the pull request's) | `contents: read` | the native build and the integration tests per target, `native-collect.sh`, the artifact `archicode-<v>-<target>` |
| `Release` | `ubuntu-24.04` | `Targets`, `Build`, `Native` | `release == 'true'`, every `Native` passed, `Build` passed or skipped | `contents: write` | `release-assemble.sh` (checks, `chmod +x`, `SHA256SUMS`), `release-draft.sh` (a DRAFT release) |
| `Smoke (<target>)` | `matrix.runner` | `Targets`, `Release` | `Release` passed | `contents: write` (see below) | downloads its file and `SHA256SUMS` from the draft with `gh release download`, `release-smoke.sh` |
| `Publish` | `ubuntu-24.04` | `Targets`, `Smoke` | `publish == 'true'` and every `Smoke` passed | `contents: write` | `gh release edit <tag> --draft=false --latest=<latest>`, then checks it is published |

**The matrix rule** (`release-plan.sh`, the targets listed once in `release_targets` of `release-lib.sh`):

| event | targets | release | published |
|---|---|---|---|
| `pull_request`, push to `main`, push of a tag whose head commit is no release commit | `linux-amd64` (job named `Native`) | no (Release, Smoke, Publish skipped) | - |
| push of a tag `archicode-X.Y.Z` whose head commit message begins `chore(release)` (the condition of the Maven publish) | the three | draft `ArchiCode X.Y.Z` | yes, after the smoke tests |
| `workflow_dispatch`, `tag=archicode-X.Y.Z` (must exist: `git ls-remote`) | the three, built from the tag | its release: a new draft, or the draft that is there gets the files again (`--clobber`); a published release is refused | only with `draft=false` |
| `workflow_dispatch`, no `tag` (the rehearsal) | the three, from the dispatched commit | draft `rehearsal-<pom version>-<run id>`, titled `ArchiCode <v> (rehearsal, run <id>)`, on that commit (`--target`), its tag never made | never (`draft` ignored, with a warning) |

A release tag is `archicode-<major>.<minor>.<patch>`, numbers only (`version_of_tag`: no suffix, no fourth number). A release commit tagged with another name fails `Targets`, so no native binary and no release; `Build` still runs its Maven publish and website steps on it, as before this run (they test the tag ref and the message, not the name). A dispatched `tag` that is not a release tag, or that does not exist, fails `Targets` with one sentence.

**Latest.** `Targets` also says whether the release, once published, is the repository's "Latest": only when no release tag of the repository is newer (`is_latest_release`, over `git ls-remote --tags`). `Publish` passes it (`--latest=true|false`): publishing an older tag again (a fix of 0.19 after 0.20) does not take "Latest" from the newer one, which GitHub's default would.

**Versions.** For a tag, the version is the tag without `archicode-`; `native-collect.sh` fails unless the pom of the built sources has it (`EXPECTED_VERSION`) and the binary's `--version` prints `archicode <it>`; `release-smoke.sh` checks `--version` again on the downloaded file. For a rehearsal, the version is the pom's (`0.19.0-SNAPSHOT` today).

**The draft, then the smoke tests, then the publication.** Nothing is public until every file passed its smoke test as downloaded from the release: `Release` makes a draft; `Smoke` reads the draft (a draft is visible only to a token that can push, hence `contents: write` on `Smoke`; its token is handed to the download step alone, and every checkout has `persist-credentials: false`); `Publish` flips it. A dispatch that targets a published release is refused rather than swapping public files before a smoke test: make it a draft first (`gh release edit <tag> --draft=true`). A failed release (any job) leaves at most a draft; `workflow_dispatch` with the `tag` builds and attaches again and, with `draft=false`, publishes (the first real run of the job is 0.19.0; a failure never blocks the release, T8).

**Scripts from the running commit, sources from the tag.** A dispatch with `tag` builds the tag's sources but runs the scripts of the commit it is dispatched on (`Native` and `Smoke` check them out into `.release-scripts`, sparse): a fix of a script after a failed release applies to the rebuild of that release. A tag older than this job (0.18.0 and before) cannot be released this way (no `--version`): the collect step says the version is wrong.

**Notes.** `gh release create --generate-notes --notes-start-tag <previous release tag>` (the greatest `archicode-X.Y.Z` below the version) with a paragraph before the generated list: the link to the manual's block of what changes, `https://tmorin.github.io/archicode/docs/#upgrade-<previous major>-<previous minor>` (`#upgrade-0-18` for 0.19.0, the anchor W-6 rewords; the site is published by the same tag run), the three files and `SHA256SUMS`, how to check, `chmod +x` and run, and the macOS quarantine sentence. A rehearsal's notes begin with **Rehearsal** and the command that deletes it.

**`Build` on a dispatch.** Its publish steps test the ref, not the event (`github.ref == 'refs/heads/main' && !startsWith(head_commit.message, ...)` is true for a dispatch from `main`, where `head_commit` is empty), so a dispatch would publish a snapshot (and, from a tag ref, the website). `Build` gets `if: github.event_name != 'workflow_dispatch'`; its steps are byte for byte what they were, and for a push or a pull request nothing changes. `Release` accepts `Build` skipped.

**Concurrency.** The group gains the event name and a dispatch does not cancel (`cancel-in-progress: ${{ github.event_name != 'workflow_dispatch' }}`): a push to `main` and a dispatch on `main` (a re-attach after the merge) no longer cancel each other, and a dispatch waits for the dispatch running (GitHub keeps only the latest pending run of a group: a third dispatch replaces the one waiting); for a push or a pull request the group still holds one ref and one event, as before.

**Scripts** (`.github/scripts/`, `set -euo pipefail`, bash 3.2: no `mapfile`, no associative arrays, no `case` inside `$(...)`, `sha256sum` or `shasum -a 256`):

- `release-lib.sh` (sourced): `release_targets`, `die`, `sha256_line`, `sha256_check`, `version_of_tag`, `is_latest_release`, `set_output`, `previous_release_tag`, `version_key`.
- `release-plan.sh` (`Targets`), `native-collect.sh` (`Native`; replaces W-4's inline step, which used `mapfile` and `sha256sum` and could not run on macOS), `release-assemble.sh` (`Release`), `release-draft.sh` (`Release`), `release-smoke.sh` (`Smoke`), `test-release-scripts.sh` (`Targets`: 78 checks with a fake `gh`, a fake `archicode` and a local bare git remote).

A finding of the bash 3.2 test: **bash 3.2 does not stop on `(cd x && false)` under `set -e`** (checked in the `bash:3.2` image: the next line runs; a function that fails does stop it). Every such subshell in the scripts is followed by `|| die ...`; before that fix, a smoke test with a wrong checksum passed under bash 3.2. A command substitution that runs the binary or `curl` has its own `|| die ...` too, so that every failure of the scripts is one `::error::` annotation that says why. (The macOS runner may put a newer bash first on the PATH; 3.2 is the floor the scripts keep, not a measured fact of the runner.)

## Review passes (the trio's, answered here)

- **KDMLLC.** KISS: one plan script decides everything (the YAML holds no release logic but `if:` on its outputs); one distribution on three runners; no compression, no signing, no other platform. DRY: the targets are listed once (`release_targets`), the version once per run (`Targets`), the checksum functions once. MECE: Targets decides, Native builds, Release assembles and drafts, Smoke tests the files as they are on the draft, Publish flips; Build is untouched. LEAN: no new workflow file, no secret, no third-party action beyond those the file had and `download-artifact`. LUCID: job names say what they do; each script's header lists its inputs and outputs. CONSISTENT: file names `archicode-<version>-<os>-<arch>` (T8), `SHA256SUMS` in the format of `sha256sum -c`, the release condition is the Maven publish's. Review of this page, the workflow and the scripts by a sub-agent (standard tier): see the Log.
- **Open questions, resolved.** Q1 can a public repository use the arm64 and Apple Silicon runners: yes, free (docs). Q2 macOS label: `macos-15` (14 is retired on 2026-11-02, brownouts now). Q3 Mandrel on macOS: yes since the Mandrel 25 releases (asset and action source read). Q4 can a token with `contents: read` read a draft: no (REST: only users with push access see drafts), hence `contents: write` on `Smoke`. Q5 can the rehearsal run before the merge: yes, `workflow_dispatch` on the branch, because `ci-build.yaml` exists on `main` (the branch's version of the file runs). Q6 does a dispatch run `Build`'s publishing steps: it would (see Design), hence the job-level `if:`. Q7 does a job that needs a skipped job run: not by default, even when its direct need passed through `!cancelled()`, hence `!cancelled()` and explicit results on `Release`, `Smoke`, `Publish`. Q8 notes from where: `--notes-start-tag` the previous release tag (no release exists yet). Q9 "Latest" when an older tag is published again: GitHub would make it Latest; `--latest` from `Targets` (above).
- **C scan against the repository and the plan.** T8's targets, names, `SHA256SUMS`, `--generate-notes`, the three smoke checks, the `chore(release)` condition, `contents: write`, `workflow_dispatch` with `tag` and a draft flag, and "the release job reuses Native's binary (`needs`)": all held. Deviations, each said: the brief's "graalvm-community on macOS" (Mandrel works there, above); T8's `ubuntu-24.04`/`macos-14` (`macos-15`, 14 is being retired); W-4's inline collect step became a script (bash 3.2); `Build` gains one job-level `if:` (the plan says "the website steps unchanged": they are, byte for byte). The example is `src/doc/examples/domain_plateaus` with `--plateau to-be`, which writes 29 PlantUML files into `views-to-be` (run with the jar).
- **Canonical impact.** `CLAUDE.md` (the integration-test paragraph: the collect script and the targets; the Release section: the release job). The manual is W-6's (passages in the report). No `dom` packet, no `arc` item, no backlog item.

## Tasks

| id | task | status | verification |
|---|---|---|---|
| T-1 | research: runners, Mandrel on macOS, action versions, draft visibility, branch protection | done | sources above |
| T-2 | `release-lib.sh`, `release-plan.sh` | done | `test-release-scripts.sh` (plan: 37 checks; tags and latest: 10) |
| T-3 | `native-collect.sh` (W-4's step as a portable script, the expected version) | done | test (8 checks) |
| T-4 | `release-assemble.sh`, `release-draft.sh` | done | test (assemble: 9 checks; draft, with a fake `gh`: 9) |
| T-5 | `release-smoke.sh` | done | test (fake `archicode`: 5 checks); run by hand on the real jar |
| T-6 | `ci-build.yaml`: trigger, concurrency, `Build`'s `if:`, jobs `Targets`, `Native` matrix, `Release`, `Smoke`, `Publish` | done | PyYAML, `actionlint` 1.7.12 with `shellcheck` 0.11.0: clean |
| T-7 | bash 3.2 | done | the tests in the image `bash:3.2` (3.2.57), with `sha256sum` and with `shasum` alone |
| T-8 | `CLAUDE.md` | done | two passages |
| T-9 | the verification set on the final tree | done | below |
| T-10 | the rehearsal on GitHub | pending (the orchestrator runs it) | below |

## Verification

Run here (final tree):

- **The scripts.** `.github/scripts/test-release-scripts.sh`: 78 checks, 0 failed (bash 5.2); in the image `bash:3.2` (GNU bash 3.2.57, with coreutils, python3, curl, git): 78 of 78, and again with `sha256sum` removed so that `shasum -a 256` is used as on macOS: 78 of 78. `shellcheck -x` 0.11.0 on the seven scripts: clean.
- **The smoke script on the real application.** `release-smoke.sh` on a "downloaded" folder whose file is a wrapper around the JVM jar of this tree (`java -jar target/quarkus-app/quarkus-run.jar`) and its `SHA256SUMS`, on `src/doc/examples/domain_plateaus` `to-be`: checksum OK, `archicode 0.19.0-SNAPSHOT`, `views-to-be: 29 PlantUML files`, the editor page HTTP 200 (2 456 556 bytes), `editor serve stopped`, `passed`, in 2.6 s. The chain `native-collect.sh` (three targets, the jar wrapper as the runner) -> `release-assemble.sh` -> `release-smoke.sh` passes the same way. The example in the repository is left untouched (the script works on a copy).
- **The plan against the real repository** (read-only `git ls-remote`): `tag=archicode-0.18.0` gives the three targets, `source=refs/tags/archicode-0.18.0`, `latest=true`, `publish=false`; `tag=archicode-0.18.9` fails with `the tag ... does not exist`.
- **The notes**, rendered with a fake `gh` and the real tag list: start tag `archicode-0.18.0`, link `https://tmorin.github.io/archicode/docs/#upgrade-0-18` (the anchor exists, `src/doc/README.adoc` line 1478).
- **The workflow.** PyYAML parses it (jobs `Build`, `Targets`, `Native`, `Release`, `Smoke`, `Publish`); `actionlint` 1.7.12 with `shellcheck` on the `run:` blocks: clean. `git diff`: in `Build`, only the job-level `if:` and its comment.
- **The repository's set**, one command at a time: `./mvnw -o verify -DskipITs=false '-Dtest=!CustomRenderingTest' -Dsurefire.failIfNoSpecifiedTests=false` (JDK 25): 1356 unit tests (0 failures, 2 skipped), 30 integration tests (0 failures), BUILD SUCCESS (run twice: before the review fixes and on the final tree); `cargo test`: 240 passed; `embed.sh --check`: the committed wasm is the one the sources build (794709 bytes); `node --test "src/test/javascript/**/*.test.js"`: 2562 of 2562; `npx prettier --check "src/**/*.java"`: clean.

Not verified here (everything that needs GitHub): that the workflow runs at all on GitHub (the expressions in `name:`, `strategy.matrix.include` from an output, `cancel-in-progress` from an expression, the `if:` with `!cancelled()`); Mandrel and the native build and the 30 integration tests on `ubuntu-24.04-arm` and `macos-15`; `gh release create` / `upload` / `download` / `edit` on a draft whose tag does not exist (gh finds a draft by its pending tag through GraphQL, read in gh's `shared/fetch.go`, not run); `--generate-notes` with `--notes-start-tag` on a draft; draft visibility to a `contents: write` token; the binaries actually running on a fresh runner of their target (glibc on Linux arm64, the ad-hoc signature on macOS arm64); the tag path (`chore(release)` push) and `Publish`, which only the release of 0.19.0 will run.

## What a successful rehearsal looks like

The orchestrator pushes the branch and runs `gh workflow run ci-build.yaml --ref feat/wave-021-story-player-and-release-binaries` (no input: a rehearsal; `draft` is ignored). The run (event `workflow_dispatch`):

- `Build`: **skipped**.
- `Targets`: green; the test step ends with `78 checks, 0 failed`, the plan step prints `matrix=[...three...]`, `release=true`, `publish=false`, `rehearsal=true`, `latest=false`, `tag=rehearsal-0.19.0-SNAPSHOT-<run id>`, `version=0.19.0-SNAPSHOT` (and a warning only if `draft=false` was given).
- `Native (linux-amd64)`, `Native (linux-arm64)`, `Native (macos-arm64)`: green; each runs 30 integration tests (0 failures) on its runner, and its collect step prints `archicode-0.19.0-SNAPSHOT-<target>: OK`, the listing of `native-dist`, and the newest `GLIBC_` symbol (Linux) or the `minos` (macOS). Artifacts of the run: `archicode-0.19.0-SNAPSHOT-linux-amd64`, `-linux-arm64`, `-macos-arm64`.
- `Release`: green; six `: OK` lines (each `.sha256`, then `SHA256SUMS`), then `release rehearsal-0.19.0-SNAPSHOT-<id>: absent`, the notes, and `the release ... now: true SHA256SUMS archicode-0.19.0-SNAPSHOT-linux-amd64 archicode-0.19.0-SNAPSHOT-linux-arm64 archicode-0.19.0-SNAPSHOT-macos-arm64`.
- `Smoke (linux-amd64)`, `Smoke (linux-arm64)`, `Smoke (macos-arm64)`: green; each ends with `smoke test of archicode-0.19.0-SNAPSHOT-<target>: passed` after `--version` `archicode 0.19.0-SNAPSHOT`, `views-to-be: 29 PlantUML files`, `the editor page: HTTP 200, ... bytes`, `editor serve stopped`.
- `Publish`: **skipped**.
- `gh release view rehearsal-0.19.0-SNAPSHOT-<id>`: a draft titled `ArchiCode 0.19.0-SNAPSHOT (rehearsal, run <id>)`, four assets (the three binaries of about 68 MB and `SHA256SUMS`), notes beginning with **Rehearsal** then the link `.../docs/#upgrade-0-18` and the generated list from `archicode-0.18.0`. Delete it afterwards: `gh release delete rehearsal-0.19.0-SNAPSHOT-<id> --yes` (a draft has no tag to clean up).

The pull request's own run (event `pull_request`) must show `Targets` green, `Native` (one job, that name) green with the artifact `archicode-0.19.0-SNAPSHOT-linux-amd64`, `Build` green, and `Release`, `Smoke`, `Publish` skipped.

## For the manual (W-6)

- An install section, "The binary of a release": the release page `https://github.com/tmorin/archicode/releases` has `archicode-<version>-linux-amd64`, `archicode-<version>-linux-arm64`, `archicode-<version>-macos-arm64` and `SHA256SUMS`, from 0.19.0 on. Linux: `sha256sum --check --ignore-missing SHA256SUMS`, `chmod +x archicode-<version>-linux-amd64`, `./archicode-<version>-linux-amd64 --version` prints `archicode <version>`; put it on the `PATH` under the name `archicode` (for example `install -m 755 archicode-<version>-linux-amd64 ~/.local/bin/archicode`). macOS (Apple Silicon): `grep archicode-<version>-macos-arm64 SHA256SUMS | shasum -a 256 --check`, `chmod +x`, then run it. A single file: no Java, no Graphviz, the editor (`archicode editor serve`) included.
- **macOS Gatekeeper.** The macOS binary is not notarized and not signed with a Developer ID (only the ad-hoc signature the linker gives every arm64 binary). A file downloaded with a browser carries the quarantine attribute, and macOS refuses to run it ("cannot be opened because Apple cannot check it for malicious software"): `xattr -d com.apple.quarantine archicode-<version>-macos-arm64` once (or System Settings, Privacy & Security, *Open Anyway*). A file fetched with `curl -LO` or `gh release download` has no quarantine attribute and runs as is.
- **Where it runs.** Linux: built on Ubuntu 24.04, so a distribution with at least that glibc (the exact newest `GLIBC_` symbol is printed by the collect step of the rehearsal; say it after the rehearsal); macOS: Apple Silicon, built on macOS 15 (the `minos` printed by the collect step). No Windows and no Intel Mac binary: the JAR (Java 25) or the container image `ghcr.io/tmorin/archicode` there.
- The 0.18.0 upgrade block (`[[upgrade-0-18]]`): the release page carries native binaries for Linux (amd64, arm64) and macOS (arm64) with `SHA256SUMS`, smoke-tested as published; `archicode --version` (W-4). The release notes of the page link this block (`#upgrade-0-18`), so the anchor must keep its name.
- Optional, for a contributor (or only `CLAUDE.md`): a release is rehearsed with `gh workflow run ci-build.yaml --ref <branch>` (a draft, never published), and a failed release is finished with `gh workflow run ci-build.yaml --ref main -f tag=archicode-X.Y.Z -f draft=false`.

## Findings for the wave

- The brief's premise "Mandrel does not build for macOS" is out of date: Mandrel 25 publishes `macos-aarch64`, and `setup-graalvm@v1.6.7` installs it. One distribution on the three targets.
- `macos-14` (named in T8) is being retired on 2026-11-02 with brownouts in October 2026: `macos-15` is used.
- `Build`'s publish steps would have run on a `workflow_dispatch` from `main` (snapshot) or from a tag (website): their conditions test the ref, not the event. Guarded by a job-level `if:`.
- bash 3.2 does not stop on `(cd x && false)` under `set -e`; every subshell of the scripts that must succeed ends with `|| die`. Worth a line for any later script that runs on macOS.
- The repository's default `GITHUB_TOKEN` is write-all and `Build` has no `permissions:` block; this run gives every new job and `Native` explicit least permissions but leaves `Build` as it is (it needs `contents`, `packages` and Pages writes). A follow-up could pin `Build`'s permissions too and turn the repository default to read-only.
- Commit subject proposed: `feat: a release attaches the native archicode for linux-amd64, linux-arm64 and macos-arm64 and SHA256SUMS to its GitHub release page, each file smoke-tested on the draft before it is published, with a dispatch to rehearse or attach again`.

## Log

- 2026-10-23: run started from the dispatch (W-5, `hard_judgment`, executor `run-executor`); research, scripts, workflow, local tests as above. Every decision taken inline (no task delegated); the only sub-agent was the KDMLLC review (standard tier, read-only).
- 2026-10-23: KDMLLC review of this page, the workflow and the scripts: no event publishes what it should not, no context interpolated into a script. Applied: F1 (S2) a re-published older tag would have taken "Latest": `latest` from `Targets`, `--latest` on `Publish`; F2, F3, F4, F7, F10 (this page: a misnamed release tag still runs `Build`'s publishing; the tag pattern made strict, numbers only; six `: OK` lines; `Native` waits for `Targets`; Smoke tests the draft); F5 (the concurrency comment); F6 (`|| die` on the binary's `--version`, `curl`, `kill`); F8 (`Native`'s unused `outputs` removed); F9 (the `Targets` comment and `CLAUDE.md` point to `release-plan.sh` for the cases). Tests 69 -> 78 checks.
- 2026-10-23: verification set passed on the final tree (above). Status `completed`; T-10, the rehearsal on GitHub, is the orchestrator's (what it must show is above).
