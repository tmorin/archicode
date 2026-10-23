---
type: run
run: 0155
status: completed
profile: single-document
wave: 021
---

# Run 0155: version-and-binary-artifact

Wave 021, W-4 (decisions T8, T9, T1, T10; GitHub issue tmorin/archicode#149, first two items of "What is missing"). The command line tells its version (`archicode --version`), and the `Native` job of the pipeline keeps the native binary as an artifact of the workflow, with a checksum. The release job that attaches the binaries to a release page is W-5's; this run adds no job and no platform.

## What was measured first

- `archicode --version` on the jar of the tag `archicode-0.18.0`: `Unknown option: '--version'` and the usage, exit code 2. `ArchiCode` is a `@Command` with `-h` and `-w` (both `scope = INHERIT`, so every command's usage lists them) and no version.
- `ci-build.yaml`, job `Native`: Mandrel for JDK 25, `./mvnw verify -Dnative -Dplugin.asciidoctor.skip=true`, no `if:` (pull requests, `main`, tags), nothing kept after the build.
- The runner file. The wave plan names `target/archicode-<v>-native-image-source-jar/archicode-<v>-runner`; the pom says otherwise: Failsafe starts `${project.build.directory}/${project.build.finalName}-runner` (`native.image.path`), i.e. `target/archicode-<v>-runner`, and the Native job's integration tests pass on that path. The folder `archicode-<v>-native-image-source-jar` holds the `-runner.jar` the image is made from (a jar, not the binary). The step therefore looks for `archicode-*-runner` executables in `target` and one level below and fails unless there is exactly one, so either layout works and a wrong guess is a clear message, not a silent upload of a jar.
- Not run here: a native build. The shell has GraalVM CE 17 and JDKs 21 and 25 in `~/.sdkman`, no Mandrel for JDK 25 (the Java of the project), and the native build of this project is 10 minutes or more. What is checked here is the JVM jar; the proof of the native runner is the CI run of the wave's pull request (below).

## Decisions

| # | decision | verdict |
|---|---|---|
| 1 | where the version comes from | `quarkus.application.version`. The Quarkus Maven plugin sets it from the pom's `<version>` when it builds, and it is fixed in the build, so the jar, the container image and the native runner carry what they were built from, and nothing is read from disk or from a resource at run time. T9 foresaw "a resource" (filtered `.properties`); this needs no Maven resource filtering (which would also filter other resources or need includes), no entry in `quarkus.native.resources.includes` and no second source of truth. It is also what `ConfigProvider` returns in a `@QuarkusTest`, so the unit test reads the same value as the application. |
| 2 | the option | `-V`, `--version` on the top command only (`ArchiCode`), `versionHelp = true`, default scope: the usage of every other command is byte for byte what it was (only the top command's usage gains `-V, --version   Print the version of ArchiCode and exit.` and the `V` in `[-hV]`), and `archicode diff --version` stays a usage error (exit 2, tested). `-h` is untouched. `mixinStandardHelpOptions` was not used: it would add `-V` and `-h` to the usage of every command, replace the `-h` the project declares, and change every `--help`. |
| 3 | the output | one line on standard output, `archicode <version>` (e.g. `archicode 0.19.0-SNAPSHOT`), exit 0, nothing loaded (Picocli answers `versionHelp` before the command runs: `archicode -w no/such/file --version` prints the same, tested). |
| 4 | the provider | `cli/VersionProvider`, an `@ApplicationScoped` bean with `@ConfigProperty(name = "quarkus.application.version")`, named in `@Command(versionProvider = ...)`. An Arc bean needs no reflection; the class is registered in `reflect-config.json` anyway, like the other classes of the package, and `NativeReflectionConfigTest` passes. |
| 5 | the tests | `VersionCommandTest` (unit, `CliHarness`: `--version`, `-V`, no workspace, the shape of the version, only the top command has the option) and `VersionIT` (`@QuarkusMainIntegrationTest`: `--version`, `-V`, the usage lists the option; the jar under the JVM, the native runner under `-Dnative`). Both compare with `${project.version}`, which `pom.xml` hands to Surefire and Failsafe as the system property `archicode.version` (a test that compared the output with the same config key would pass for any value). |
| 6 | the artifact | in the `Native` job, after the build and the integration tests: step `Collect the native binary and its checksum` (id `collect`) and step `Keep the native binary as an artifact of the workflow` (`actions/upload-artifact@v7.0.2`, an exact tag: the latest release, published 2026-10-07; the other actions of the file are pinned to a major tag, `graalvm/setup-graalvm` to `v1.6.7`). Both run only when the previous steps succeeded (the default `success()`), so a failed build or failed integration tests upload nothing; `if-no-files-found: error`; `retention-days: 7`. |
| 7 | name and checksum | artifact `archicode-<version>-linux-amd64`, holding `archicode-<version>-linux-amd64` and `archicode-<version>-linux-amd64.sha256` (`<hash>  <file>`, the format of `sha256sum -c`; W-5 can concatenate them into `SHA256SUMS`). The version is the pom's (`./mvnw help:evaluate -Dexpression=project.version -DforceStdout`), and the step fails if `<runner> --version` does not print `archicode <that version>`: a first smoke test of the very file that is uploaded, and the proof that the version told by the binary is the version in its name. |
| 8 | what W-5 builds on | `env.TARGET: "linux-amd64"` at the top of the job (the last two words of the name) and `outputs.version` / `outputs.artifact` of the job (from the `collect` step). To make a matrix W-5 replaces `TARGET` by `matrix.target` (and adds `runs-on: ${{ matrix.runner }}` and the Mandrel setup per runner); the artifact name then differs per target and the release job downloads them with `pattern: archicode-*` (`merge-multiple: true`) or by name from the version in `needs.Native.outputs` (outputs of a matrix job are those of the last job to finish: use the artifact names, not the outputs, for several targets). The binary of a tag run is built once, by this job, and the release job reuses it (T8). |
| 9 | what the artifact is, for a user | a workflow artifact is a zip (the executable bit is lost: `chmod +x`), deleted after 7 days, downloaded from the run page (Actions, the run, Artifacts) or `gh run download <run> -n archicode-<version>-linux-amd64`; it is for trying the binary of a change, a release keeps its binaries on the release page (W-5). |

## Review passes (the trio's, answered here)

- **KDMLLC.** KISS: one class (14 lines), one option, two workflow steps; no resource filtering, no profile, no new plugin. DRY: the version is the pom's, said once, read by the provider and by the workflow (Maven and the runner must agree, which the step checks). MECE: `--version` is the top command's alone; the artifact is the Native job's alone, the release is W-5's. LEAN: no other platform, no release job, no compression (about 68 MB, T8). LUCID: the step names say what they do; the comments say why the glob and why the check. CONSISTENT: the artifact name is the one of T8 (`archicode-<version>-<os>-<arch>`), the checksum the one `sha256sum -c` reads.
- **Open questions.** Does `quarkus.application.version` hold in a native image? It is a build-time-fixed key (`ApplicationConfig`), so it is in the image; the proof is `VersionIT` under `-Dnative` in the Native job, which this run could not execute (below). If it were empty, the step of the workflow fails with a message that shows the line printed. Does `help:evaluate` print only the version? Run here: yes on standard output (the JVM's warnings go to standard error). Does the 7-day retention matter for tags? A tag's binaries are on the release page from W-5 on; before it, the artifact of the tag run is the only copy and expires: stated.
- **C scan against the repository.** `ArchiCode`'s fields are reached by Picocli through the Quarkus extension; the new field follows `usageHelpRequested`. No test pins the top usage text exactly (`grep` of the tests for `--help`: `ViewsAndQueriesIT.helpIsPrinted` checks it contains `views`; `DiffFailOnTest` and `OnlyChangesTest` check sub-command usages, which do not change). `NativeReflectionConfigTest` passes with the new entry. Nothing else in the repository names `ArchiCode.class` options.
- **Canonical impact.** `CLAUDE.md` (the entry point sentence, the paragraph on the integration tests: `VersionIT`, the artifact); the manual in W-6 (below). No `dom` packet, no `arc` item.

## Tasks

| id | task | status | verification |
|---|---|---|---|
| T-1 | `VersionProvider`, the option on `ArchiCode`, `reflect-config.json` | done | `VersionCommandTest`, `NativeReflectionConfigTest`, the jar run by hand |
| T-2 | `VersionCommandTest`, `VersionIT`, the system property in `pom.xml` | done | `./mvnw -o verify -DskipITs=false` |
| T-3 | the workflow: collect and upload steps, `env.TARGET`, `outputs` | done | YAML parsed, `actionlint` clean, the collect script run against a fake `target` (exactly one runner; wrong version; none) |
| T-4 | byte identity with the jar of the tag (T1) | done | below |
| T-5 | `CLAUDE.md` | done | two sentences, one paragraph |

## Verification (final tree)

- `./mvnw -o verify -DskipITs=false '-Dtest=!CustomRenderingTest' -Dsurefire.failIfNoSpecifiedTests=false` (JDK 25): 1356 unit tests (0 failures, 2 skipped; `VersionCommandTest` adds 5), 30 integration tests (0 failures; 3 more: `VersionIT`), build success.
- `cargo test` (viewpoint kernel): 240 passed. `embed.sh --check`: the committed wasm is the one the sources build (794709 bytes). `node --test "src/test/javascript/**/*.test.js"`: 2562 tests, 2562 passed. `npx prettier --check "src/**/*.java"`: clean.
- **`--version` by hand, jar.** In an empty folder: `archicode 0.19.0-SNAPSHOT` on standard output, nothing on standard error, exit 0; `-V` the same.
- **Usage text.** `--help` of the 14 commands (top, `views`, `views generate`, `query`, `query views|schemas|graph`, `editor`, `editor serve`, `plateau`, `plateau list`, `stories`, `stories generate`, `diff`), the output without argument and the exit codes, jar of `archicode-0.18.0` against this tree: identical, except the top command's, whose usage gains `[-hV]` (was `[-h]`), the line `-V, --version   Print the version of ArchiCode and exit.` and the column of the descriptions two characters to the right (Picocli aligns the column to the longest option). The no-argument usage (error output) shows the same difference; `--version` on the tag: `Unknown option`, exit 2.
- **Byte identity (T1).** The 20 shipped workspaces (the 11 examples that have a `.archicode.yaml` and the 9 under `src/test/resources`, `brightcart/layered` among them), each copied twice: `plateau list`, then `views generate`, `stories generate`, `query graph`, `diff`, `diff -f json`, `diff --against=baseline -f markdown`, without option and with `--plateau=<id>` for each plateau `plateau list` prints: 368 commands (218 exit 0, 150 exit 1, the same sentences on both sides: a workspace without plateau asked for a plateau, a tree that forks, and so on), standard output, error output and exit code of the jar of the tag and of this tree: `diff -rq` of the outputs, **no difference**; the two trees of 15511 files written by the commands, **no difference**.
- **The workflow.** The YAML parses (PyYAML: the jobs `Build` and `Native`, the five steps of `Native`, `outputs` with `version` and `artifact`); `actionlint` (from the PyPI package `actionlint-py`, installed in the scratch) reports nothing on the file. The `collect` step was run by hand (extracted from the YAML) against a fake `target` with one executable `archicode-<v>-runner` and a `-runner.jar` in the `native-image-source-jar` folder: it writes `native-dist/archicode-<v>-linux-amd64`, the `.sha256` (`sha256sum --check` OK) and the two outputs; with a runner whose `--version` says another version it fails with `::error::... --version prints 'archicode 9', expected ...`; with no runner, with `::error::expected exactly one native runner ..., found 0` and the listing of `target`. `./mvnw --batch-mode --quiet help:evaluate -Dexpression=project.version -DforceStdout` prints `0.19.0-SNAPSHOT` alone on standard output (it needs the network the first time: the help plugin is not in the offline repository; CI has it).
- **Not verified.** (1) The native image: no Mandrel for JDK 25 in the shell, and no native build was run. What only the CI run can show: that `VersionIT` passes under `-Dnative` (the version is `quarkus.application.version`, fixed in the build, and `VersionProvider` is an Arc bean), that the runner is `target/archicode-<v>-runner` (the step accepts the other layout too), that `actions/upload-artifact@v7.0.2` runs on that runner image, and the size of the upload. (2) That the pull request run keeps the artifact: the step has never run.

## What to look for in the CI run of the wave's pull request

- Job `Native`, steps `Collect the native binary and its checksum` and `Keep the native binary as an artifact of the workflow`: green, and the log of the first lists `native-dist` with `archicode-0.19.0-SNAPSHOT-linux-amd64` (about 68 MB) and `archicode-0.19.0-SNAPSHOT-linux-amd64.sha256`, and ends with the `sha256sum --check` line `... : OK`.
- The run summary page, Artifacts: `archicode-0.19.0-SNAPSHOT-linux-amd64`, expiring in 7 days. `gh run download <run-id> -n archicode-0.19.0-SNAPSHOT-linux-amd64`, then `sha256sum --check *.sha256`, `chmod +x`, `./archicode-0.19.0-SNAPSHOT-linux-amd64 --version` prints `archicode 0.19.0-SNAPSHOT` (the step has already compared it with the version of the pom).
- `VersionIT` in the Failsafe lines of the `Native` job: 3 tests, 0 failures.
- If the step fails with `expected exactly one native runner`, its log lists `target/archicode-*`: the glob (`find target -maxdepth 2`) is the one line to change.
- Job `Build` unchanged (it runs the same `verify`; its Failsafe is skipped as before).

## What changed

- `src/main/java/io/morin/archicode/cli/VersionProvider.java` (new), `ArchiCode.java` (the option, the `versionProvider`), `src/main/resources/META-INF/native-image/io.morin.archicode/archicode/reflect-config.json` (one entry).
- `pom.xml`: the property `archicode.version` for Surefire and Failsafe.
- `.github/workflows/ci-build.yaml`: job `Native` only.
- Tests: `cli/VersionCommandTest`, `it/VersionIT` (new).
- `CLAUDE.md`.

## For the manual (W-6)

- An install section: "Download the binary of a release" (W-5 puts the files on the release page): `archicode-<version>-<os>-<arch>` and `SHA256SUMS`; `sha256sum --check --ignore-missing SHA256SUMS`; `chmod +x archicode-<version>-linux-amd64`; then `./archicode-<version>-linux-amd64 --version`, which prints `archicode <version>` (for example `archicode 0.19.0`), with exit code 0, in any folder, no workspace needed. The JAR and the container image print the same: `java -jar quarkus-run.jar --version`.
- The usage of the command: `archicode [-hV] [-w=<workspace file>] [COMMAND]`; `-V, --version  Print the version of ArchiCode and exit.` It belongs to the top command: `archicode views --version` is a usage error.
- Upgrade block ("what changes for a reader who knows 0.18.0"): `archicode --version` exists; nothing else changes on the command line.
- For a reader of CI: a pull request's run keeps the native binary of the change for 7 days (Actions, the run, Artifacts: `archicode-<version>-linux-amd64`, a zip with the binary and its `.sha256`).

## Findings for the wave

- The wave plan's path for the runner (`target/archicode-<v>-native-image-source-jar/archicode-<v>-runner`) is not the binary's path (`target/archicode-<v>-runner`, the one Failsafe uses); W-5 should read the file from the artifact of this job and not from `target`. Worth a correction in the wave's T8 sentence.
- Several runs of a Quarkus main-class integration test through a launcher print the Quarkus log lines on the output (`Shipped.payload` removes them); a `--version` that must be exactly one line is tested with `payload`, and the binary is called directly in the workflow, where there are none.
- W-5: the artifact is a zip without the executable bit; the release job must `chmod +x` before the smoke test and attach the files from the download, not the zip. The `.sha256` files are `sha256sum -c` lines, so `cat *.sha256 > SHA256SUMS` is the release's checksum file.
- The Native job has no `if:`, so every tag run builds the binary and keeps it 7 days; W-5's release job should `needs: Native` and take it from there (T8).
- Commit subject proposed: `feat: archicode --version prints the version of the build, and the Native job keeps the native binary and its checksum as an artifact of the workflow`.
