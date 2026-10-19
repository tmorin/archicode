---
type: run
run: 0105
status: completed
wave: 015
---

# Run 0105: Native checks as integration tests

Wave 015 (`editor-reshape-and-loose-ends`), item W-17 (phase P2). Focus: the checks the Native job runs by script run from Maven, on the JVM jar and on the native runner (#62)

Document profile: `single-document`, as runs 0089 to 0104. Tier `standard`, done inline (the build files and the workflow are small, and the native half cannot be tried here).

## Scope

In: `src/test/java/io/morin/archicode/it/` (five new files), `pom.xml` (the `native` profile), `.github/workflows/ci-build.yaml` (the Native job), `CLAUDE.md` (Build & Test).

Out: the manual and the tutorial (W-18, F2), any change to the application (no Java under `src/main`, so no class for `reflect-config.json` and `NativeReflectionConfigTest` is unaffected).

## Decisions

- **D1. `@QuarkusMainIntegrationTest`, not `@QuarkusIntegrationTest`.** The application is a Picocli command-mode program (it ends with its command, it has no HTTP port of its own), and `@QuarkusIntegrationTest` is for an application that stays up. `@QuarkusMainIntegrationTest` with a `QuarkusMainLauncher` parameter runs the packaged artifact to completion for each `launch(args)`, as a process, and gives the exit code, the output and the error output: the jar (`java -jar target/quarkus-app/quarkus-run.jar`) by default, the native runner under `-Dnative` (the extension reads `target/quarkus-artifact.properties`). The same classes therefore check both artifacts. The classes are named `*IT`, which Failsafe picks and Surefire does not, so a plain `./mvnw verify` is unchanged (`skipITs=true`).
- **D2. What the checks are**: the script step's, one test each, plus the ones the plan adds: `ViewsAndQueriesIT` (`--help`, `views generate` and the file it writes, `query views|schemas|graph`, a missing workspace is one `error:` line and no stack trace, on `domain_workspace`); `PlateauComparisonIT` (`diff`; `diff --fail-on moved,removed` exits 3; `--fail-on` for states the table does not hold exits 0, on the bookshop fixture, since `domain_plateaus` holds every state; `--fail-on nothing` exits 1 with an `error:` line; `views generate --against` writes the views and `gap.md`/`gap.json`; `--only-changes` draws less; Brightcart `plateau list`, `diff`, `diff --against`, `views generate --plateau` with the comparison, the cascade and a facet); `TomlManifestIT` (the TOML twin of `manifests/user.yaml` gives the graph of the YAML one, byte for byte); `EditorServeIT` (see D4). `Shipped` holds the helpers.
- **D3. Nothing writes in the repository**: every example and fixture is copied into a `@TempDir` first (the commands write next to `workspace.yaml`). The tests use no reflection or side effect of the JVM: only the command line, the exit code, the files written and an HTTP port. The Quarkus launcher turns the `io.quarkus` log category on, so three or four log lines of the application precede its output; `Shipped.payload` drops them where a test compares whole outputs, and the other checks read lines or substrings.
- **D4. `editor serve` is started by the test itself**, not by the launcher, which waits for the end of the process and the server only ends on a signal. `EditorServeIT` reads `target/quarkus-artifact.properties` (what the extension reads: `type=jar` gives `java -jar <path>`, `type=native` the runner), starts it with `--host 127.0.0.1 --port 0` (the application takes a free port and prints it, so no fixed port), polls its output up to 90 s for the address (a clear failure that quotes what was printed, also when the process ends before), asks the page with the token (200, `<html`, the kernel is in it) and without it (403), then `destroy()` (SIGTERM, which runs the shutdown hook) and a bounded wait of 20 s, `destroyForcibly()` and a failure after it. No timing assertion.
- **D5. The `native` profile skips Surefire** (`skipTests` of `maven-surefire-plugin` in the profile). `-DskipTests` cannot stay on the Native job: it skips Failsafe too. The unit tests are the Build job's, and some need graphviz, which the Native job does not install. A side effect, intended: `-Dnative` anywhere runs no unit test; `-DskipITs=false` is the way to run the integration tests on the JVM. The CI Build job (`./mvnw verify`, no flag) gets what it got: Surefire runs, Failsafe is skipped.
- **D6. The Native job** is one step, `./mvnw verify --batch-mode --update-snapshots -Dnative -Dplugin.asciidoctor.skip=true`; the two steps (build, then the script) are replaced by it and every other step of the workflow is untouched. The script's checks are all in D2 (its `help`, `views generate` and the file, the three queries, `diff`, `--against` and its table, `--fail-on` 3 and 1, `--only-changes`, the five Brightcart checks, `editor serve`; added: exit 0 of `--fail-on`, the TOML manifest, the error line of a missing workspace).

## Tasks

- [x] T1. Read the plan row W-17, the first criterion of P2, #62, the Native job, the pom, runs 0090 and 0091.
- [x] T2. The `*IT` classes.
- [x] T3. The `native` profile skips Surefire; the Native job runs `./mvnw verify -Dnative`; the script step goes.
- [x] T4. `CLAUDE.md`, the gate commands, one commit.

## Review pass

- KDMLLC read of this document: one decision each, D1 says why not `@QuarkusIntegrationTest`, D5 says why not `-DskipTests`.
- Open questions: none. Settled: the annotation (D1), how `editor serve` is run (D4), how Surefire is skipped (D5).
- C scan against the repository: every command the old script ran is in a test (D6); `git grep -n "Run the native image on the examples" -- .github` finds nothing; the workflow reads as YAML (`python3 -c "import yaml..."`: the Native job has two steps, Mandrel and the build).

## Verification

The commands and their real results, on the final tree (JDK 25, `PLANTUML_JAR` set; the machine was under load from other work, load average 6 to 8, so every duration is a high one).

- `./mvnw -o verify`: BUILD SUCCESS, 839 tests, 0 failures, 0 errors, 0 skipped (the count of run 0104: no unit test is added), Failsafe `Tests are skipped.` (`skipITs=true` stays the default, so what the CI Build job runs gets what it got); 10:50 min under load.
- `./mvnw -o verify -DskipITs=false`: BUILD SUCCESS, 839 unit tests then 18 integration tests, 0 failures (`EditorServeIT` 1, `PlateauComparisonIT` 10, `TomlManifestIT` 1, `ViewsAndQueriesIT` 6); the integration tests took about 110 s of the 12:58 min of the whole build (each `launch` is a JVM start; `PlateauComparisonIT` alone 89 s under load, 18 s on a quiet machine in an earlier try).
- `./mvnw -o verify -Dnative -Dquarkus.native.enabled=false -Dplugin.asciidoctor.skip=true` (the `native` profile without the image: it is what the Native job runs with the image switched off): Surefire `Tests are skipped.`, the 18 integration tests pass against the jar, 40 s to 3 min.
- `node --test "src/test/javascript/**/*.test.js"`: 1747 tests, 1747 pass.
- `npx prettier --check "src/**/*.java"`: clean (the new files were written with `--write` first).
- The first run of the new classes found two mistakes of the tests, fixed before this result: the launcher's Quarkus log lines precede the output (D3), and `domain_plateaus` holds every state so no `--fail-on` for an absent state is possible on it (D2: the bookshop fixture).
- `git status` after the runs: only the files of this run changed; no test wrote in the repository.
- Not verified: **the native image** (no GraalVM or Mandrel here; the Native job of CI is the only check of the native half: that the same classes pass against the runner, in particular `TomlManifestIT` (the TOML mapper has no entry in `reflect-config.json`, and no check ran it on the image before) and `EditorServeIT` under SIGTERM of a native process), and **the YAML of the workflow was not run** (it parses with PyYAML and has the two steps; read twice against the old file, the steps before it are untouched). If the Native job fails on `TomlManifestIT`, the fix is a registration in `src/main/resources/META-INF/native-image` (it is a likely_path), not a change to the test.

## Canonical impact

The architecture description changes in one place: `CLAUDE.md` Build & Test says how the integration tests run (the commands, the `native` profile skipping Surefire, what the `*IT` classes are and what a test may use). No domain invariant changes (no change to the application, to a manifest or to a view), and no other architecture or domain document describes the build.

## Shipped files

The run ships no example or fixture to the users of the repository; the tests read the shipped examples and fixtures and write only in temp folders. The TOML twin of `user.yaml` lives in the test (the editor does not read TOML, as in `TomlManifestTest`).

## Findings

- F1. The plan said `closes #62`: the commit says `Refs #62`; the wave's pull request closes it.
- F2. For **W-18** (the manual): `src/doc/README.adoc` line 166 and `[[plateau-limits]]` (line 1334) still say that a TOML manifest is refused (`Unknown token`), #84; it loads since run 0091 and `TomlManifestIT` runs it. Nothing in the manual describes the integration tests (it need not: they are the repository's, described in `CLAUDE.md`).
- F3. For the wave: the shape to know when another run adds a command is to add a test to `src/test/java/io/morin/archicode/it` (copy the example with `Shipped.copy`, launch with the `QuarkusMainLauncher` parameter), not a line to the workflow. `-DskipTests` kills Failsafe as well as Surefire: to run only the integration tests use `-Dnative -Dquarkus.native.enabled=false` or `-DskipITs=false` with the unit tests.
- F4. Files outside `likely_paths`: `CLAUDE.md` and this run document. No issue filed: nothing deferred.
