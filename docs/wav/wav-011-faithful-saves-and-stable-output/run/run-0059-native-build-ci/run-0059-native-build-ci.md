---
type: run
run: 0059
status: completed
wave: 011
---

# Run 0059: Native build CI

Wave 011 (`faithful-saves-and-stable-output`), item W-5 (phase P2). Focus: see a broken native image on the pull request that breaks it, not after a release.
Document profile: `single-document` (the scope arrives settled by the wave plan and by issue tmorin/archicode#29 and the author's ruling of 2026-10-16 in it, "add a native image build to CI; the remaining items become a
checklist to run by hand"); this file carries scope, decisions, canonical impact, review passes, tasks, verification and findings.

## Scope

Issue #29: a job in `.github/workflows/ci-build.yaml` that builds the native image, parallel to `Build`, with the Maven cache; the reflection configuration fixed only if a native build shows a gap; the body of #29 rewritten as a
checklist of what only a person or another machine can check.

## Decisions

- **D1. A job `Native`, appended after `Build`.** `Build`, its publish steps and the website steps are untouched (the diff is 70 added lines, no deleted or changed one). Same `on:` as `Build` (pull request, push to `main`, tags),
  so it runs on every pull request, in parallel with `Build`.
- **D2. Cost, and where to change it.** A native build of a Quarkus CLI with the Chicory-translated kernel is expected to take several minutes (not measured: no native build ran, see Verification) on a 4 vCPU runner, on every
  pull request and push, on top of `Build`. The job has `timeout-minutes: 45` as a guard. To run it less often, add an `if:` to the job (the comment above the job gives one for `main` and tags only), or narrow the `on:` of
  the workflow; the workflow-level `concurrency` already cancels a superseded run.
- **D3. Distribution and version: `graalvm/setup-graalvm@v1.6.7`, `distribution: mandrel`, `java-version: "25"`.** v1.6.7 is the latest release of the action (2026-10-01), pinned by tag as the other actions of the file are.
  Quarkus 3.40.1 (the `quarkus.platform.version` of the pom) has `quay.io/quarkus/ubi9-quarkus-mandrel-builder-image:jdk-25` as its default builder image (read in `NativeConfig` of `quarkus-core-deployment-3.40.1`), so
  Mandrel for JDK 25 is the combination Quarkus itself ships for this version, and JDK 25 is the Java of the project (`.sdkmanrc` 25.0.4-tem, `maven.compiler.release`, `Build`). With a Mandrel distribution and a major
  `java-version`, the action takes the latest Mandrel release that has a `mandrel-java25-linux-amd64-` asset (read in the action's `mandrel.ts`; that is Mandrel 25.0.4.1-Final today), so the version moves with Mandrel's
  patch releases, not with a workflow edit. Oracle GraalVM (`distribution: graalvm`) was the alternative; Mandrel was kept because Quarkus defaults to it and it is free of the Oracle license terms.
- **D4. Local build, not a container build.** The image is built by the Mandrel the action puts in `JAVA_HOME` / `GRAALVM_HOME` (Quarkus uses a local `native-image` when it finds one; `quarkus.native.container-build`
  stays unset). Reason: no builder image of about a gigabyte to pull on every run, and the Mandrel is the one the workflow names. `quarkus.native.enabled=true` comes from the `native` profile of the pom, activated by
  `-Dnative`, which also sets `skipITs=false`. The Maven cache is the action's `cache: maven` (the same cache as `actions/setup-java`, keyed on the poms), the second `actions/cache` step of `Build` is not repeated.
- **D5. Build command: `./mvnw verify --batch-mode --update-snapshots -Dnative -DskipTests -Dplugin.asciidoctor.skip=true`.** `-DskipTests` because the unit tests are `Build`'s and would run twice; the manual is skipped (it
  needs graphviz and is not part of the image). FINDING: the project has no integration test (no `*IT` class, no `@QuarkusIntegrationTest`), although Failsafe is configured with `native.image.path`; `-Dnative` alone only
  builds the image and nothing runs it.
- **D6. So the job runs the image itself.** A second step runs the native runner on copies of two examples of the manual (`domain_workspace`, `domain_plateaus`): `--help`; `views generate` (kernel + PlantUML text);
  `query views`, `query schemas`, `query graph` (Jackson by reflection, the sorted output); `diff` and `views generate --baseline` (the comparison through the kernel); `editor serve --port 0` and a `curl` of the page (the
  `editor-webapp/**` resource of `quarkus.native.resources.includes`). Each check is an exit code plus one `grep`/`test -s` on the output; captured into a variable first, because `grep -q` on a pipe under `pipefail` fails
  the producer. The script was run here against the JVM build (`target/quarkus-app`) through a stand-in runner, from the text of the step extracted from the YAML: it passes there. Moving these checks to
  `@QuarkusIntegrationTest` is filed as **tmorin/archicode#62**.
- **D7. No change to the reflection configuration, the resources or the pom.** `META-INF/native-image/io.morin.archicode/archicode/reflect-config.json` (the brief and the wave plan say `src/main/resources/reflect-config.json`;
  that file does not exist) and `quarkus.native.resources.includes` are what `NativeReflectionConfigTest` checks; a gap is to be found by a native build, and none ran.
- **D8. #29 body rewritten** (`gh issue edit 29 --body-file`): the original items kept, as a checklist; the native image item links the `Native` job and is left unticked until the job is green on a pull request (it is not
  claimed green); the "Also" section and the follow-up paragraph kept; the issue is open, no comment posted, no other issue touched but the one filed (#62).

## Canonical impact

None to the architecture model (no `CI-arc` or `CI-dom` packet: no TDD). `CLAUDE.md` says integration tests run under `-Dnative` or the `native` profile; they do not exist, which that line does not say. Not changed here (the
wave's file list does not include it); see the findings.

## Review passes

- **KDMLLC (inline).** K: one job, two steps that matter, no new file. D: `Build` is not repeated (no `actions/cache`, no Node, no Rust, no graphviz: not needed by the image). M: the build step builds, the second step runs;
  neither does the other's work. L: no integration-test scaffolding added for a check a script of 30 lines does (#62 holds the question). U: comments in the file say why the flags are what they are and where to throttle. C:
  see below.
- **C scan.** Wave plan: "builds the native image and runs the native tests (`-Dnative`), parallel to `Build`, with the Maven cache": built, run (by script, because there are no native tests to run: D5), parallel, cached.
  "`ci-build.yaml` parses with its publish steps unchanged": `yaml.safe_load` parses, the diff has no deleted line. "native build run locally if available, otherwise reported as not run": not run.

## Tasks

- [x] T1. Read #29 and its comment, the wave plan, `ci-build.yaml`, the pom (`native` profile, Failsafe), `application.properties`, `NativeReflectionConfigTest`.
- [x] T2. Choose the distribution and the action version; check them against the Quarkus version and the action's source.
- [x] T3. Find the CLI commands to run against the image; write the script; run it against the JVM build.
- [x] T4. Add the job; validate the YAML statically.
- [x] T5. Try a native build locally: NOT run (below).
- [x] T6. Rewrite the body of #29; file #62.
- [x] T7. Full verification (below).

## Verification

- `ci-build.yaml`: `yaml.safe_load` parses it; jobs `Build` and `Native`; `git diff` shows only added lines (against the file at HEAD); `npx prettier --check` of the file: clean.
  `actionlint` and `shellcheck` are not installed and were not installed. The text of the `Native` smoke step, extracted from the parsed YAML, ran with `bash -e` against the JVM jar: exit 0.
- `JAVA_HOME=<sdkman 25.0.4-tem> PLANTUML_JAR=... ./mvnw -o verify`: BUILD SUCCESS, 336 tests, 0 failures, 0 skipped.
- `cargo test --manifest-path src/main/rust/viewpoint-kernel/Cargo.toml`: 169 passed, 0 failed.
- `src/main/rust/viewpoint-kernel/embed.sh --check`: "the committed WebAssembly is the one the sources build (655544 bytes)", exit 0.
- `node --test "src/test/javascript/**/*.test.js"`: 913 pass, 0 fail.
- `npx prettier --check "src/**/*.java"`: clean.
- NOT verified: **no native image was built.** The only GraalVM on this machine is 17.0.9-graalce (cannot read Java 25 classes); a JDK 25 Mandrel or GraalVM, or a Mandrel builder image for a container build, would be a download
  of several hundred megabytes to a gigabyte, which was not made. So the job has never run: it can be valid and red (a reflection gap, a resource missing, a flag, the smoke script's greps against the native output, the
  time of the build). Its first run is on the wave's pull request. The job is not claimed green.

## Findings

- **F1. There are no native tests.** No `*IT` class and no `@QuarkusIntegrationTest` exist, so `-Dnative` builds an image that nothing runs. The smoke step is the stand-in (D6); #62 holds the proper form. `CLAUDE.md`'s "Integration
  tests (Failsafe) are skipped by default ... unless run with `-Dnative`" reads as if there were some.
- **F2. The path of `reflect-config.json` in the brief is wrong.** It is `src/main/resources/META-INF/native-image/io.morin.archicode/archicode/reflect-config.json`; `likely_paths` has its folder (`META-INF/native-image/**`) and
  a path that does not exist.
- **F3. `finalName` is `archicode-<version>`**, so the runner is `target/archicode-0.14.0-SNAPSHOT-runner`; the step globs `target/*-runner`.
- **F4. For the wave.** W-5 touched `.github/workflows/ci-build.yaml` only, in the repository; issue #29 (body) and #62 (new) outside it. No file outside `likely_paths`. The native job is to be read on the wave's pull request:
  if it is red, the likely places are the smoke greps, a reflection registration of a class the smoke commands reach, and the 45 minute guard.
