---
title: Java Toolchain Baseline — JDK 25 compiler release, Lombok, core Maven plugins, CI, docs
status: active
owner: run-0001
date: 2026-10-04
related:
  - docs/wav/wav-001-quarkus-java-upgrade/wav-001-quarkus-java-upgrade.md
run: 0001
wave: 001
type: tdd
---

# Java Toolchain Baseline — JDK 25 compiler release, Lombok, core Maven plugins, CI, docs

## Summary

This TDD has no PRD (infra-only `TDD+pln` run; scope arrives settled from the
wave manifest W-1 row). It designs the first phase of wave
`quarkus-java-upgrade`: move ArchiCode's build-time JDK target from 21 to 25
(the version the wave's business case names as the Quarkus-recommended
baseline), and bring every build-time tool whose compatibility depends on
that JDK version — Lombok's annotation processor, the core Maven plugins,
and the Asciidoctor documentation toolchain — up to the latest version that
is actually compatible with it. It also removes the version drift between
`.sdkmanrc`, `.github/workflows/ci-build.yaml`, and `CLAUDE.md`, which today
disagree with each other and with `pom.xml`.

`quarkus.platform.version` and every `quarkus-*` artifact stay untouched —
that is run-0002's (`quarkus-platform-upgrade`) job, serialized against this
one only because both edit `pom.xml`, not because of any correctness
dependency.

## Scope

In scope:

- `pom.xml`: `maven.compiler.release`, `compiler-plugin.version`,
  `surefire-plugin.version` (shared by surefire and failsafe),
  `maven-release-plugin` version, `org.projectlombok:lombok` version,
  `asciidoctor-maven-plugin` version and its `asciidoctorj-diagram`
  dependency version. Expanded during implementation (DEC-4, DEC-5) to
  also cover: explicit annotation-processing configuration
  (`maven-compiler-plugin`'s `<proc>`), `-XX:+EnableDynamicAgentLoading`
  on the surefire/failsafe `argLine`, and third-party test-tooling version
  overrides (`org.mockito:*`, `net.bytebuddy:byte-buddy`, `org.jacoco:*`,
  `org.ow2.asm:*`) needed to make the explicitly-scoped JDK 25 bump
  actually build — all discovered only once `./mvnw verify` was run for
  real, none touching `quarkus.platform.version` or any `io.quarkus:*`
  coordinate.
- `.sdkmanrc`: the pinned `java=` line.
- `.github/workflows/ci-build.yaml`: the JDK setup step (`java-version`,
  `distribution`) and the `actions/setup-java` action version itself.
- `CLAUDE.md`: the "JDK version gotcha" section, which documents a
  mismatch this run removes.

Out of scope (explicitly, per the wave manifest):

- `quarkus.platform.version`, the `quarkus-maven-plugin` version (tied to
  the same property), and every `quarkus-*` dependency — reserved for
  run-0002.
- `maven-javadoc-plugin` (declared in `pluginManagement` only, with no
  `<plugins>` entry activating it — it does not run in the current build
  and is not named in the wave's plugin list; left untouched, noted under
  Deferred Work).
- `actions/checkout`, `actions/cache` versions in CI — not named in the
  wave's focus for this run, and not blocking a JDK 25 build.
- `package.json`/Prettier — phase P2 (run W-3), depends on this run but is
  not this run's work.
- The `native` Maven profile / GraalVM/Mandrel path — wave-level non-goal.

## PRD Traceability

Not applicable — this run has no PRD (`TDD+pln` profile). Scope traces
directly to the wave manifest's W-1 row in
`docs/wav/wav-001-quarkus-java-upgrade/wav-001-quarkus-java-upgrade.md`.

## Technical Goals

- `TG-1` — `pom.xml` compiles and targets Java 25 (`maven.compiler.release=25`).
- `TG-2` — Lombok's annotation processor runs correctly under JDK 25 (needs ≥1.18.40; this run uses the current latest, 1.18.48).
- `TG-3` — `maven-compiler-plugin`, `maven-surefire-plugin`, `maven-failsafe-plugin`, `maven-release-plugin`, `asciidoctor-maven-plugin`, and `asciidoctorj-diagram` are all at their latest release compatible with a JDK 25 build.
- `TG-4` — `.sdkmanrc`, the CI workflow's JDK setup step, and `CLAUDE.md` all name Java 25 consistently, with no remaining drift.
- `TG-5` — `./mvnw verify` passes locally and on CI under JDK 25, with `quarkus.platform.version` unchanged at 3.21.1.

## Non-Goals

- Does not change `quarkus.platform.version` or any `quarkus-*` dependency.
- Does not adopt the `native`/GraalVM build path.
- Does not touch `prettier`/`prettier-plugin-java` (run W-3's job).
- Does not change any Java source file's logic or the CLI's behavior — this
  is a toolchain bump, not a feature or refactor.
- Does not activate `maven-javadoc-plugin` (it stays inert, as it is today).

## Assumptions

- `ASM-1` — Eclipse Temurin publishes a JDK 25 build resolvable by
  `actions/setup-java`. Validated: confirmed via `sdk list java` (Temurin
  `25.0.4-tem` installed and used locally for this run's own verification)
  and via `actions/setup-java`'s own README, which uses `distribution:
  temurin, java-version: '25'` as its canonical example.
- `ASM-2` — Quarkus 3.21.1 (the pinned, untouched platform version) can
  build and run its test suite with `maven.compiler.release=25` and a JDK
  25 build JVM, even though Quarkus's own "full Java 25 support" milestone
  landed later, in Quarkus 3.31 (quarkus.io/blog/quarkus-3-31-released).
  That announcement frames 3.31 as resolving warnings and adding
  native-image/Mandrel support for Java 25 — not as the first version able
  to build/run on a JDK 25 JVM at all; Quarkus's stated minimum Java
  requirement across the 3.x line stays 17. Validated empirically in this
  run by actually running `./mvnw verify` with JDK 25 as `JAVA_HOME` and
  `maven.compiler.release=25` against the unmodified Quarkus 3.21.1
  pin — see Observability and Verification, and Risks/Open Questions for
  the actual outcome and any caveats (warnings tolerated, errors are not).
- `ASM-3` — `actions/setup-java@v2` (currently pinned in CI) cannot resolve
  a Java 25 Temurin build without an upgrade. Validated: `v2`-`v4` are
  listed as deprecated by the action's own README; the `adopt` distribution
  id used today was removed entirely as of `v6` (replaced by `temurin`),
  and GitHub's own current example for Java 25 uses `v6`. `v6` is adopted
  as the target version (see DEC-3).

## Constraints

- `CON-1` — Repository is a single-module Maven/Quarkus project; version
  properties in `pom.xml` are shared (e.g. `surefire-plugin.version` backs
  both `maven-surefire-plugin` and `maven-failsafe-plugin`) — changing one
  changes both.
- `CON-2` — CI (`.github/workflows/ci-build.yaml`) is the actual gate (build
  + SonarCloud); any JDK/plugin change must keep that job green.
- `CON-3` — `quarkus.platform.version` is immutable for the duration of this
  run (owned by run-0002; wave Risk section mandates serializing the two
  runs due to shared-file edits, not shared correctness).
- `CON-4` — No native-image/GraalVM verification is in scope (wave non-goal).

## Current State

- `pom.xml`: `maven.compiler.release=21`; `compiler-plugin.version=3.14.0`;
  `surefire-plugin.version=3.5.2` (shared by surefire+failsafe);
  `maven-release-plugin` pinned inline at `3.0.1`; Lombok pinned at
  `1.18.34`; `asciidoctor-maven-plugin` pinned inline at `2.2.4` with an
  `asciidoctorj-diagram` dependency override at `2.3.0`;
  `quarkus.platform.version=3.21.1` (untouched by this run).
- `.sdkmanrc`: pins `java=17.0.8-tem` — already stale against the current
  `pom.xml` (which requires 21), a pre-existing drift this run also fixes.
- `.github/workflows/ci-build.yaml`: `actions/setup-java@v2`,
  `java-version: "21"`, `distribution: "adopt"` (the retired AdoptOpenJDK
  identifier).
- `CLAUDE.md`: "JDK version gotcha" section documents the 17-vs-21 drift
  above and tells the reader to use 21, not 17.

## Proposed Design

A direct property/version bump across the four files, validated by an
actual local and CI build rather than by assumption, in this order:

1. Bump `pom.xml`'s version properties and inline plugin versions (DEC-1,
   DEC-2 below).
2. Fix `.sdkmanrc` to match.
3. Fix the CI workflow's JDK setup step and, if needed, the `setup-java`
   action's own major version (DEC-3).
4. Remove the now-resolved drift from `CLAUDE.md`.
5. Verify locally (`./mvnw verify` under JDK 25) before relying on CI alone,
   since CI round-trips are slower to iterate on than a local build.

No architectural change, no new component — this is a dependency-version
edit, so no diagram is warranted (the diagram trigger rule needs a
structural change; there is none here).

### DEC-1 — Target Java 25 via `maven.compiler.release`

- **Decision:** Set `<maven.compiler.release>25</maven.compiler.release>`.
- **Rationale:** 25 is the version the wave's business case names as the
  Quarkus-recommended baseline (the current Java LTS as of this run), and
  is the version this run's own local verification installs and exercises.
- **Alternatives considered:** Staying on 21 (rejected — defeats the wave's
  purpose); jumping to a non-LTS interim release (rejected — no stated
  reason to target a non-LTS version).
- **Tradeoffs:** None at the `maven.compiler.release` level by itself; the
  real risk is whether Quarkus 3.21.1's build-time bytecode processing
  tolerates a release-25 target before run-0002 lands Quarkus 3.40 — see
  ASM-2 and RISK-1.
- **Linked PRD IDs:** None (no PRD).

### DEC-2 — Plugin/library versions

- **Decision:** Bump to the latest Maven Central release of each, verified
  directly against Maven Central's `maven-metadata.xml` (not memory) on
  2026-10-04:
  - `org.projectlombok:lombok`: `1.18.34` → `1.18.48` (latest; comfortably
    above the `1.18.40` floor the Lombok project states is required for
    JDK 25 annotation-processing support — Lombok's own changelog records
    "PLATFORM: JDK25 support added" at `1.18.40`, released 2025-09-04).
  - `compiler-plugin.version` (`maven-compiler-plugin`): `3.14.0` →
    `3.15.0` (latest stable 3.x; `4.0.0` is still beta-only on Central and
    is not adopted here).
  - `surefire-plugin.version` (`maven-surefire-plugin` and
    `maven-failsafe-plugin` both read this property): `3.5.2` → `3.6.0`
    (latest stable; identical release train for both artifacts).
  - `maven-release-plugin`: `3.0.1` → `3.3.1` (latest stable).
  - `asciidoctor-maven-plugin`: `2.2.4` → `3.2.0` (latest stable; a major
    version bump — see CTR-1 below for the migration note).
  - `asciidoctorj-diagram`: `2.3.0` → `3.2.1` (latest stable; paired with
    the `asciidoctor-maven-plugin` bump since `asciidoctorj-diagram` tracks
    the AsciidoctorJ core API surface, which changed from `1.x` to `3.0.0`
    between the plugin's `2.x` and `3.x` lines).
- **Rationale:** The wave's stated goal is "every build-time tool ...
  compatible with it [JDK 25]"; using each tool's actual current release
  (rather than the oldest version that merely compiles) avoids immediately
  re-doing this work for a known compatibility gap.
- **Alternatives considered:** Bumping only Lombok (minimum needed for JDK
  25 annotation processing) and leaving the Maven plugins untouched —
  rejected, because the wave's focus explicitly names the core Maven
  plugins as in scope, and older `maven-compiler-plugin`/`surefire`
  releases have known rough edges on very new JDKs that the latest
  releases have already fixed upstream.
- **Tradeoffs:** `asciidoctor-maven-plugin` 2.x→3.x is a major version;
  see CTR-1 for the one breaking change checked against this repo's actual
  configuration.
- **Linked PRD IDs:** None.

### DEC-3 — `actions/setup-java` major version

- **Decision:** Bump `actions/setup-java` from `v2` to `v6`, change
  `distribution` from `"adopt"` to `"temurin"`, `java-version` from
  `"21"` to `"25"`, and the step's own `name:` label from `"Set up JDK
  21"` to `"Set up JDK 25"` (a stale display name would otherwise survive
  the bump and mislead anyone reading CI logs).
- **Rationale:** `actions/setup-java` versions `v1`-`v4` are deprecated per
  the action's own README; `v6`'s own "What's new" notes state the legacy
  `adopt` distribution id was *removed* in `v6` (replaced by `temurin`), so
  simply bumping the `java-version` on `v2` while keeping `distribution:
  adopt` would not resolve a Temurin 25 build even if `v2` itself kept
  working. `v6`'s README uses exactly `distribution: temurin, java-version:
  '25'` as its own canonical example.
- **Alternatives considered:** Minimal bump to `v4` (the last version still
  carrying the deprecated `adopt` alias) — rejected, since `v4` is itself
  listed as deprecated and the project gains nothing by stopping one major
  short of the officially current, non-deprecated release.
- **Tradeoffs:** `v6` migrated its runtime to Node 24 / ESM and renamed a
  few unrelated inputs (`server-username` → `server-username-env-var`,
  etc.) — none of which this workflow uses, so no further edits are
  required beyond the `uses:`/`distribution:`/`java-version:` lines.
- **Linked PRD IDs:** None.

### DEC-4 — Explicit annotation processing (`<proc>full</proc>`)

- **Decision:** Add `<proc>full</proc>` to `maven-compiler-plugin`'s
  `<configuration>`, alongside the existing `<parameters>true</parameters>`.
- **Rationale:** Discovered empirically, not anticipated at drafting time.
  Under JDK 21 the build already printed: *"Annotation processing is
  enabled because one or more processors were found on the class path. A
  future release of javac may disable annotation processing unless at
  least one processor is specified by name (-processor), or ... annotation
  processing is enabled explicitly (-proc:only, -proc:full)."* JDK 25 is
  that future release: with `maven.compiler.release=25` and no explicit
  `-proc` setting, javac silently skipped annotation processing entirely —
  no error, no warning — so Lombok (`@Builder`, `@Slf4j`,
  `@RequiredArgsConstructor`, `val`, etc.) never ran, and compilation then
  failed downstream with "cannot find symbol" errors at every call site
  that depended on Lombok-generated code (confirmed by isolating the
  variable: identical pom.xml under JDK 21 built clean; only the JDK
  version differed).
- **Alternatives considered:** `-Dmaven.compiler.proc=full` as a one-off
  CLI flag — rejected, since CI and every future local build must get this
  without being told to pass an extra flag; the fix belongs in `pom.xml`,
  not in the command line.
- **Tradeoffs:** None identified — `-proc:full` simply restores the
  previously-implicit behavior explicitly; it does not change what gets
  processed, only removes the ambiguity javac itself flagged.
- **Linked PRD IDs:** None.

### DEC-5 — Test-tooling version overrides (Mockito/Byte Buddy/JaCoCo/ASM) and dynamic agent loading

- **Decision:** Override, via explicit `<dependency>` entries (not
  touching `quarkus.platform.version` or any `io.quarkus:*` coordinate):
  - `org.mockito:mockito-core` / `mockito-junit-jupiter`: `5.12.0` (brought
    in transitively by `quarkus-junit5-mockito`) → `5.24.0`.
  - `net.bytebuddy:byte-buddy`: `1.15.11` (pinned by the Quarkus BOM's own
    `dependencyManagement`, which otherwise wins over what the newer
    Mockito itself would request) → `1.17.7` (the version `mockito-core
    5.24.0` itself declares).
  - `org.jacoco:org.jacoco.core` / `org.jacoco.report` / `org.jacoco.agent`
    (both the plain and `runtime`-classifier artifacts — a classifier is
    part of the artifact identity, so each needed its own explicit
    override): `0.8.12` (via `quarkus-jacoco`) → `0.8.15`.
  - `org.ow2.asm:asm` / `asm-tree` / `asm-commons` / `asm-util` /
    `asm-analysis`: `9.7.1` (via `quarkus-jacoco`, and also pinned by the
    Quarkus BOM) → `9.10.1`. `asm`/`asm-commons` additionally needed a
    **`<dependencyManagement>` entry** declared *before* the Quarkus BOM
    import (not just a `<dependencies>` override) — see the Risks note
    below for why.
  - Added `<argLine>-XX:+EnableDynamicAgentLoading</argLine>` to both
    `maven-surefire-plugin` and `maven-failsafe-plugin`.
- **Rationale:** All discovered empirically, in sequence, by actually
  running `./mvnw verify` under JDK 25 and reading each real failure:
  1. JaCoCo instrumentation failed: `java.lang.IllegalArgumentException:
     Unsupported class file major version 69` (69 = Java 25's class file
     version) — the ASM version JaCoCo 0.8.12 bundles cannot parse Java
     25 bytecode. JaCoCo 0.8.15 and ASM 9.10.1 add that support.
  2. Mockito's inline mock maker failed: `Could not initialize plugin:
     interface org.mockito.plugins.MockMaker` — traced to Byte Buddy's
     self-attach mechanism (it calls the JDK Attach API to obtain an
     `Instrumentation` instance when not started with `-javaagent`), which
     JDK 25 blocks by default unless `-XX:+EnableDynamicAgentLoading` is
     passed to the JVM running the tests.
  3. With that flag added, a *different* Mockito failure appeared:
     `Mockito cannot mock this class ... Could not modify all classes` —
     Byte Buddy itself (version `1.15.11`, transitively too old) still
     could not transform Java-25-compiled classes. Bumping `mockito-core`
     alone did not fix this: the Quarkus BOM's own `dependencyManagement`
     pin of `byte-buddy:1.15.11` out-ranked the newer transitive request
     from `mockito-core:5.24.0`, so `byte-buddy` needed its own explicit
     override too.
  4. After all test-classpath fixes, `./mvnw test` passed (83/83), but
     `./mvnw verify`'s `quarkus:build` goal still failed with the same
     "Unsupported class file major version 69" error — this time from
     `io.quarkus.deployment.steps.ClassTransformingBuildStep`, Quarkus's
     own build-time bytecode transformer, during the augmentation phase
     (not the test phase). A `<dependencies>` override scoped to the
     `quarkus-maven-plugin` `<plugin>` block (mirroring how
     `asciidoctor-maven-plugin` overrides `asciidoctorj-diagram`) was
     *not* sufficient — the debug log showed **both** `asm-9.10.1.jar`
     and `asm-9.7.1.jar` added to Quarkus's own `QuarkusClassLoader`
     ("Augmentation Class Loader: PROD"), with the older one apparently
     still resolved at lookup time. Quarkus's bootstrap/app-model resolver
     (`quarkus-bootstrap-maven-resolver`) re-resolves the project's
     dependency graph from the **effective POM's `dependencyManagement`**
     independently of the executing plugin's own Maven-resolved classpath,
     so the fix had to be a `<dependencyManagement>` entry for
     `org.ow2.asm:asm`/`asm-commons`, declared *ahead of* the Quarkus BOM
     `<import>` in the same section (Maven's merge keeps the
     first-declared entry for a given GA when both a direct entry and an
     imported BOM entry exist). With that in place, the redundant
     plugin-level override was removed again (confirmed still green
     without it).
- **Alternatives considered:** Disabling `quarkus-jacoco` coverage or the
  Mockito inline mock maker for JDK 25 builds — rejected: that would
  silently drop test coverage/mocking capability rather than fix the
  underlying JDK-25 compatibility gap, and the wave's own exit evidence
  requires `./mvnw verify` green with tests actually running, not skipped.
- **Tradeoffs:** This expands pom.xml's `<dependencies>` with five
  overridden third-party coordinates beyond the wave's originally-named
  plugin list (Lombok, the four core Maven plugins, Asciidoctor). None of
  them are `io.quarkus:*` artifacts or touch `quarkus.platform.version` —
  they are the same "pin the actual third-party library, not the Quarkus
  extension" pattern this `pom.xml` already used for `json-path` and
  `velocity-engine-core` before this run. Framed under this run's stated
  focus ("every build-time tool that depends on the JDK version ...
  compatible with it"), Mockito/Byte Buddy/JaCoCo/ASM are exactly such
  tools, discovered to be in scope only once the build was actually run
  rather than merely read.
- **Linked PRD IDs:** None.

### CTR-1 — `asciidoctor-maven-plugin` 2.x → 3.x configuration contract

- **Current contract:** `<configuration>` sets `sourceDirectory`, `backend`,
  `outputFile`, `requires`, and `skip` (`${plugin.asciidoctor.skip}`); the
  plugin is bound to `generate-resources` via the `process-asciidoc` goal.
- **Proposed contract:** Unchanged. The 3.x migration guide
  (docs.asciidoctor.org/maven-tools/latest/plugin/v3-migration-guide/)
  names exactly one breaking change relevant to existing configurations —
  the deprecated `headerFooter` option was replaced by `standalone` — and
  this repo's `pom.xml` does not set `headerFooter`, so no configuration
  edit is needed. The guide's other changes (AsciidoctorJ `1.6.x` support
  removed, Java 11 minimum) do not affect this repo (already on
  AsciidoctorJ-via-2.x and JDK 21→25).
- **Affected files:** `pom.xml` (`<plugin>` block only — no behavior change
  expected in `src/doc/**` output).
- **Migration or compatibility notes:** Verified by actually running the
  `generate-resources` phase (via `./mvnw verify`, which runs the full
  lifecycle) and confirming `target/generated-docs/index.html` is produced
  without errors.
- **Linked PRD IDs:** None.

## Repository Impact

- `IMP-1` — `pom.xml`
  - **Path(s):** `pom.xml`
  - **Change type:** modify
  - **Why impacted:** Central location for `maven.compiler.release` and
    every plugin/dependency version in scope.
  - **Linked PRD IDs:** None.
  - **Risks / notes:** Shared-file edit with run-0002 (same file, different
    properties) — wave mandates serializing the two runs; this run does
    not touch `quarkus.platform.version` or any `quarkus-*` coordinate.
    Expanded beyond the originally-scoped property/plugin-version edits
    once `./mvnw verify` was actually run under JDK 25 — see DEC-4 (`<proc>
    full</proc>`) and DEC-5 (test-tooling version overrides + dynamic
    agent loading), both discovered empirically, not anticipated when this
    section was first drafted.

- `IMP-2` — `.sdkmanrc`
  - **Path(s):** `.sdkmanrc`
  - **Change type:** modify
  - **Why impacted:** Pins the local dev JDK; must match `pom.xml` and CI.
  - **Linked PRD IDs:** None.
  - **Risks / notes:** None — single-line change.

- `IMP-3` — `.github/workflows/ci-build.yaml`
  - **Path(s):** `.github/workflows/ci-build.yaml`
  - **Change type:** modify
  - **Why impacted:** CI's JDK setup step must install JDK 25 via a
    `setup-java` version that actually resolves a Temurin 25 build; the
    step's `uses:`, `distribution:`, `java-version:`, and `name:` fields
    all change together (see DEC-3).
  - **Linked PRD IDs:** None.
  - **Risks / notes:** `actions/setup-java` major-version bump (v2→v6) is
    larger than a patch bump; mitigated by DEC-3's research and by the
    unrelated-inputs check in its Tradeoffs.

- `IMP-4` — `CLAUDE.md`
  - **Path(s):** `CLAUDE.md`
  - **Change type:** modify
  - **Why impacted:** The documented "JDK version gotcha" (17-vs-21 drift)
    is resolved by this run; the section must now state the single,
    consistent version (25) rather than describing a mismatch that no
    longer exists.
  - **Linked PRD IDs:** None.
  - **Risks / notes:** None.

## Canonical Impact

Not applicable — no `arc`/`dom` canonical registers are declared in this
repository (`docs/CLAUDE.md` does not exist yet, and no such register was
found under `docs/`).

## Data Model and Contracts

None — no data structures, APIs, message formats, or file formats produced
by ArchiCode itself change. The only "contract" touched is the Asciidoctor
Maven plugin's own configuration surface (CTR-1), which is unchanged.

## Interfaces and Behavior

None — no change to the CLI's inputs, outputs, or user-facing behavior.

## Flows and Processing Logic

None — no new or changed runtime flow. The only process affected is the
build pipeline itself (Maven lifecycle under a new JDK/plugin set), not
application logic.

## Reliability, Performance, and Scalability

- Build reliability is the entire point of this run: a build that silently
  tolerates a stale `.sdkmanrc` while CI and `pom.xml` drift apart is a
  standing reliability risk for anyone who trusts the local pin. Fixing the
  drift removes that risk going forward.
- No runtime performance or scalability change is expected; JDK 25 and the
  bumped plugins affect build time and compiled bytecode version only.

## Security and Privacy

Not materially relevant. No secrets, credentials, or user data are touched.
`actions/setup-java@v6`'s renamed secret-adjacent inputs
(`server-username-env-var` etc.) are not used by this workflow, so no
secret-handling behavior changes.

## Observability and Verification

Repository-realistic commands (from `CLAUDE.md` and
`.github/workflows/ci-build.yaml`):

- `./mvnw clean install` and `./mvnw verify` — the actual CI build+test
  command (`verify` additionally runs Failsafe integration tests if
  `-Dnative`/`native` profile is active; by default `skipITs=true`).
- CI's full command, run locally with the same flags where feasible:
  `./mvnw verify org.sonarsource.scanner.maven:sonar-maven-plugin:sonar
  --batch-mode --update-snapshots -Dsonar.java.coveragePlugin=jacoco
  -Dsonar.coverage.jacoco.xmlReportPaths=target/jacoco-report/jacoco.xml`
  (the Sonar upload itself needs `SONAR_TOKEN`/network access not
  available in this run's execution environment; the Maven build portion
  is what this run verifies locally).
- Direct JDK check: `java -version` under the `.sdkmanrc`-pinned JDK must
  report Java 25.
- CI: the updated `.github/workflows/ci-build.yaml` must pass on its next
  push (this run verifies the workflow file's correctness locally — e.g.
  that the `setup-java` inputs are valid per its README — and leaves the
  actual CI run's result to be confirmed once pushed, since this run
  executes in a sandbox without GitHub Actions access).

**Actual result (this run):** `./mvnw -B clean verify` was run locally
under JDK 25 (Temurin `25.0.4-tem`, installed via sdkman for this run) and
reached `BUILD SUCCESS` — 83/83 tests passing, Quarkus augmentation
completing, and `target/generated-docs/index.html` produced by Asciidoctor
— after the fixes in DEC-4 and DEC-5. `quarkus.platform.version` stayed at
`3.21.1` throughout; `git diff -- pom.xml` was reviewed line by line to
confirm no `quarkus.platform.version` or `io.quarkus:*` coordinate was
touched. The Sonar-plugin goal itself was not run locally (needs
`SONAR_TOKEN`); everything else in CI's actual command was exercised.

## Deployment and Rollout

- Code-only / build-toolchain change — no data migration, no external
  service dependency change, no user-facing deployment.
- Backward compatibility: none claimed or needed — this is a dev/build
  environment bump, not a released artifact's compatibility contract.
- Rollback: revert the four files; no state to unwind.

## Risks and Tradeoffs

- `RISK-1` — Quarkus 3.21.1's build-time augmentation (ArC, Gizmo bytecode
  generation, Jandex indexing) might not fully tolerate a
  `maven.compiler.release=25` target, since Quarkus's own "full Java 25
  support" milestone landed in 3.31, ~10 minor releases after 3.21.
  **Outcome:** partially confirmed, fully mitigated without touching
  `quarkus.platform.version`. Quarkus's own `ClassTransformingBuildStep`
  (used during the `quarkus:build` goal, i.e. real augmentation) did fail
  on Java 25 class files via a too-old bundled ASM — exactly the kind of
  gap the risk anticipated — but it was fixable entirely through
  third-party dependency version overrides (DEC-5), not a
  `quarkus.platform.version` bump. Two other failures surfaced along the
  way turned out to be unrelated to Quarkus's own augmentation layer: a
  javac behavior change (DEC-4, Lombok/annotation-processing) and a
  JDK-25 JVM security default affecting Mockito/Byte Buddy (DEC-5). All
  three are now resolved; `./mvnw verify` is green with
  `quarkus.platform.version` unchanged (see Observability's "Actual
  result"). Had `ClassTransformingBuildStep`'s failure *not* been
  fixable via a dependency override alone, this would have become a
  genuine cross-run blocker for the wave to resolve via run-0002 instead.
- `RISK-2` — `asciidoctor-maven-plugin` 2.x→3.x is a major version; CTR-1
  checked the one documented breaking change against this repo's actual
  configuration and found no impact, but the check is paper-based for the
  migration guide and empirical for the actual build output.
- `RISK-3` — `actions/setup-java@v6`'s runtime migration to Node 24 /
  ESM has no per-repository risk (it's the action's own internal runtime,
  not something this workflow configures), but is noted since it's a larger
  jump than a routine patch bump.

## Open Questions

None outstanding. The one open question this design started with — whether
Quarkus 3.21.1 actually builds under a JDK 25 / release-25 target without
touching `quarkus.platform.version` — is resolved empirically in
Observability and Verification / this run's `prg` Findings, not left open.

## Deferred Work

- `DEF-1` — `maven-javadoc-plugin` (pinned at `3.5.0` in `pluginManagement`,
  not activated by any `<plugins>` entry) is not touched by this run. It is
  not named in the wave's plugin list and does not run in the current
  build, so it carries no JDK-25-compatibility risk today; whether it
  should be removed as dead configuration or actually wired up is a
  separate judgment call outside this run's scope.

## File Placement and Frontmatter

Saved under `docs/wav/wav-001-quarkus-java-upgrade/run/run-0001-java-toolchain-baseline/tdd-0001-java-toolchain-baseline.md`, following this repository's wave/run convention (`docs/wav/wav-NNN-slug/run/run-NNNN-slug/tdd-NNNN-slug.md`). Frontmatter carries `run: 0001` and `wave: 001` per that convention.
