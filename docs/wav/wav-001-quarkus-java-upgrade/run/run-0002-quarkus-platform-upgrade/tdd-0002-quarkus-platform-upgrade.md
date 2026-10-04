---
title: Quarkus Platform Upgrade to 3.40.1 LTS
status: active
owner: run-0002
date: 2026-10-04
related:
  - docs/wav/wav-001-quarkus-java-upgrade/wav-001-quarkus-java-upgrade.md
  - docs/wav/wav-001-quarkus-java-upgrade/run/run-0001-java-toolchain-baseline/tdd-0001-java-toolchain-baseline.md
type: tdd
run: 0002
wave: 001
---

# Quarkus Platform Upgrade to 3.40.1 LTS

# Summary

Move ArchiCode's Quarkus platform from `3.21.1` to `3.40.1` (the current
3.40.x LTS release — confirmed as the newest 3.40.x via `quarkus-bom`'s
`maven-metadata.xml` on Maven Central; `3.40.0` only ever shipped as
`.CR1`). This closes a ~19-minor-release gap. There is no PRD for this run
(infra-only, `TDD+pln` profile — see "PRD Traceability" below); scope comes
from wave 001's manifest entry `W-2` / phase table row.

Technical outcome: `pom.xml` pins `quarkus.platform.version=3.40.1`;
`quarkus:update`'s codemods are reviewed and selectively applied by hand;
run-0001's four Java-25 test-tooling `dependencyManagement` override
categories (asm pre-BOM-import block, jacoco/mockito/byte-buddy/asm test
block) are removed because the 3.40.1 BOM now pins Java-25-compatible
versions of all of them natively; `./mvnw verify` is green; the tracked
generated outputs under `src/doc/examples/**` are byte-identical before and
after.

# Scope

In scope:

- `pom.xml`: `quarkus.platform.version` bump, the `quarkus-junit5`→
  `quarkus-junit` / `quarkus-junit5-mockito`→`quarkus-junit-mockito`
  extension rename, the `@{argLine}` surefire/failsafe fix, and the
  disposition of run-0001's test-tooling overrides.
- Reviewing `quarkus:update`'s proposed codemods (via `-DrewriteDryRun=true`)
  and applying the ones that are real and safe; identifying what it does
  *not* cover across the 3.21→3.40 span (config property renames in
  `src/main/resources/application.properties`, `quarkus-picocli` /
  `quarkus-container-image-jib` / `quarkus-jacoco` extension-level breakage)
  and fixing those by hand if found.
- Re-verifying the twelve `@SuppressWarnings("java:S____")` Sonar
  suppressions in `src/main/java`/`src/test/java` still sit on the same
  findings (no code changes expected to move them, but confirmed by
  inspection since SonarCloud itself isn't reachable from this sandbox).
- `./mvnw verify` as the primary gate; a before/after comparison of the
  tracked PlantUML outputs under `src/doc/examples/**` as the "unchanged
  output" smoke test the wave calls for. The wave's exit evidence names
  `src/test/workspaces/**` alongside `src/doc/examples/**` for this check;
  `src/test/workspaces/**` holds the *input* fixtures (`.yaml` workspaces)
  that `CaseATest`/`CaseBTest`/`CaseCTest`/`GetViewsQueryTest` etc. feed
  through the CLI, and its *generated* output directories
  (`case_a_yaml/`, etc.) are gitignored (`src/test/workspaces/.gitignore`)
  rather than tracked — so there is nothing to byte-diff there the way
  there is for `src/doc/examples/**`. `src/test/workspaces/**` is still
  exercised, just by `TG-5`'s `./mvnw verify` run and those tests'
  own `assertTrue(actual.contains(...))` assertions, not by a before/after
  diff.

Out of scope (per wave non-goals and risk list):

- Quarkus 4 (still Beta).
- The `native`/GraalVM build profile.
- Any change to ArchiCode's CLI behavior, output format, or public API.
- `json-path` / `velocity-engine-core` version pins, beyond whatever the
  3.40.1 BOM or `quarkus:update` moves automatically (neither did).
- SonarCloud's actual quality-gate run — only reachable from CI with a
  live `SONAR_TOKEN`; this sandbox has no network path to SonarCloud's API
  the way it does to Maven Central/`registry.quarkus.io`.
- run-0001's own changes (`maven.compiler.release=25`, `<proc>full</proc>`,
  the `-XX:+EnableDynamicAgentLoading` flag itself) — kept as-is; only the
  test-tooling *version overrides* are revisited, per the dispatch brief.

# PRD Traceability

No PRD exists for this run (infra-only `TDD+pln` profile). Traceability is
incomplete by design — requirements are sourced directly from wave 001's
manifest (`docs/wav/wav-001-quarkus-java-upgrade/wav-001-quarkus-java-upgrade.md`,
entry `W-2` and its Phase P1 table row), not from a PRD. The wave's stated
focus, scope, and exit evidence for `W-2` are treated as the requirement
set and are addressed in full below (see "Technical Goals" and
"Observability and Verification").

# Technical Goals

- `TG-1` — `pom.xml` pins `quarkus.platform.version` to `3.40.1`.
- `TG-2` — Every codemod `quarkus:update` proposes for this project is
  reviewed and either applied or explicitly rejected with a stated reason.
- `TG-3` — Breakage from the 3.21→3.40 span that `quarkus:update`'s
  codemods don't cover (config property renames; `quarkus-picocli` /
  `quarkus-container-image-jib` / `quarkus-jacoco` behavior changes) is
  found and fixed.
- `TG-4` — run-0001's Java-25 test-tooling overrides are kept, adjusted, or
  removed based on what the 3.40.1 BOM actually pins now — not left
  unexamined.
- `TG-5` — `./mvnw verify` is green on JDK 25 with the new platform version.
- `TG-6` — The tracked generated outputs under `src/doc/examples/**`
  produce byte-identical content before and after the upgrade;
  `src/test/workspaces/**`'s input fixtures round-trip through the same
  CLI path via `./mvnw verify`'s own test assertions (see "Scope" for why
  that directory has no tracked output to byte-diff).
- `TG-7` — The twelve existing `@SuppressWarnings("java:S____")`
  suppressions still sit on findings that would actually fire (verified by
  reasoning about each rule's trigger condition against the unchanged
  code, since SonarCloud itself can't run here).

# Non-Goals

- Migrating to Quarkus 4.
- Enabling or verifying the `native` Maven profile / GraalVM path.
- Changing CLI behavior, output format, or public API.
- Running an actual SonarCloud analysis from this sandbox.
- Re-deriving or second-guessing run-0001's JDK-25 build-toolchain changes
  (`maven.compiler.release`, `<proc>full</proc>`, the surefire/failsafe JVM
  flag) — only their *downstream test-tooling version pins* are revisited
  here, because the Quarkus bump directly changes what those pins should
  be.

# Assumptions

- `ASM-1` — `3.40.1` is the correct target: it is the newest version under
  `io.quarkus.platform:quarkus-bom` whose version string matches `3.40.*`
  with no pre-release qualifier, per that artifact's `maven-metadata.xml`
  on Maven Central (checked directly: `<latest>`/`<release>` point at
  `4.0.0.Beta1`, which is out of scope per the wave's non-goals; `3.40.1` is
  the newest LTS patch). Validated by direct Maven Central lookup, not
  assumed from memory.
- `ASM-2` — The sandbox's lack of a SonarCloud-reachable network path mirrors
  what run-0001 already reported for live GitHub Actions — this run can't
  newly contradict or confirm that; it's inherited, not re-discovered.
  Validated by inspecting `.github/workflows/ci-build.yaml`: the `sonar`
  goal only runs in that CI job, with a token this sandbox doesn't have.
- `ASM-3` — No `mockStatic`/`MockedStatic` usage exists anywhere in
  `src/test/java`, so Mockito's one known post-5.16 Java-25 regression
  (static `UUID` mocking corruption, fixed in Mockito 5.22.0) cannot affect
  this codebase regardless of whether the BOM's `5.21.0` or a newer pin is
  used. Validated by `grep -rl "mockStatic\|MockedStatic" src/test/java`
  (zero matches).

# Constraints

- `CON-1` — Must build and test on JDK 25 (run-0001's baseline); this run
  does not touch `maven.compiler.release`.
- `CON-2` — Quarkus 4 is Beta and explicitly out of scope per the wave's
  non-goals; `3.40.1` is the ceiling.
- `CON-3` — No production/credential/data-migration surface exists in this
  change; it is a dependency-and-config version bump only.
- `CON-4` — This sandbox has outbound access to Maven Central and
  `registry.quarkus.io` (confirmed directly) but not to SonarCloud's API
  (no token present, and the gate only runs from CI) — verification here is
  capped at what `./mvnw verify` and direct inspection can confirm.

# Current State

- `pom.xml` (root, single-module): `quarkus.platform.version=3.21.1`,
  imported via `dependencyManagement` as `io.quarkus.platform:quarkus-bom`.
  Extensions declared: `quarkus-picocli`, `quarkus-arc`, three Jackson
  dataformat/module extensions, `quarkus-container-image-jib`,
  `quarkus-jacoco` (test scope), `quarkus-junit5` (test scope),
  `quarkus-junit5-mockito` (test scope).
- run-0001 already landed (uncommitted in the working tree, but present)
  four Java-25-only additions to `pom.xml`, all justified by inline
  comments naming the exact incompatible versions the *old* `3.21.1` BOM
  pinned:
  - A `dependencyManagement` block (lines ~56-77) declaring
    `org.ow2.asm:asm`/`asm-commons:9.10.1`, placed *ahead of* the Quarkus
    BOM import so it wins over the BOM's own `9.7.1` pin, specifically for
    Quarkus's own build-time augmentation classloader.
  - A test-scope `dependencyManagement`-equivalent `<dependencies>` block
    (lines ~143-229) pinning `org.jacoco:*→0.8.15`,
    `org.mockito:*→5.24.0`, `net.bytebuddy:byte-buddy→1.17.7`, and the
    `org.ow2.asm:*` family again at `9.10.1` (test scope this time).
  - `<proc>full</proc>` on `maven-compiler-plugin`.
  - `-XX:+EnableDynamicAgentLoading` on both `maven-surefire-plugin`'s and
    `maven-failsafe-plugin`'s `<argLine>`.
- `src/main/resources/application.properties`: 7 properties, all under
  `quarkus.application.*`, `quarkus.banner.*`, `quarkus.log.*`,
  `quarkus.container-image.*`, `quarkus.jib.*` — no custom/extension-added
  config beyond Quarkus's own core and the two container-image extensions.
- `src/main/java` / `src/test/java` direct Quarkus-API surface is narrow:
  `@TopCommand` (picocli), `@QuarkusTest`, `jakarta.inject.Inject`,
  `jakarta.enterprise.context.ApplicationScoped`. No `@InjectMock`, no
  `mockStatic`/`MockedStatic`, no direct `quarkus-jacoco` or
  `quarkus-container-image-jib` API usage in code (those two are
  build/config-time extensions here, not code-level APIs this project
  calls into).
- Twelve `@SuppressWarnings("java:S____")` annotations exist across
  `src/main/java`/`src/test/java` (`S106` ×1, `S6813` ×4, `S3252` ×1,
  `S117` ×5, `S125` ×1), none in code paths this run touches.
- `./mvnw verify` on the current (pre-this-run) state — `3.21.1` + Java 25 +
  run-0001's overrides — was run and confirmed green before any change in
  this run.

# Proposed Design

No new component or module boundary is introduced — this is a dependency
version bump plus config/pom cleanup. The diagram trigger rules in
`write-technical-design-document` (2+ component relationships changing, or
a non-trivial branching/async/failure flow) don't apply, so this section
stays textual.

`DEC-1 — Target version: 3.40.1, not the registry's reported "latest"`

- Decision: Pin `quarkus.platform.version` to `3.40.1`.
- Rationale: `quarkus-bom`'s Maven Central `maven-metadata.xml` lists
  `<latest>`/`<release>` as `4.0.0.Beta1` (crawled most recently), but the
  wave's non-goals explicitly exclude Quarkus 4 (still Beta). The same
  metadata file's `<version>` list shows `3.40.0.CR1` and `3.40.1` as the
  only `3.40.*` entries — `3.40.1` is the actual LTS release (`3.40.0` never
  shipped as a final release; it went CR1 straight to `3.40.1`).
- Alternatives considered: staying on an older LTS (`3.33.x`) — rejected,
  wave explicitly calls for "the current 3.40.x LTS release"; jumping to
  `4.0.0.Beta1` — rejected per wave non-goals.
- Tradeoffs: none material; `3.40.1` is a direct, final LTS release.
- Linked requirement: wave 001 manifest `W-2` focus line ("bump
  `quarkus.platform.version` to the current 3.40.x LTS release").

`DEC-2 — Trust quarkus:update's codemods only after reviewing a dry run`

- Decision: Run
  `./mvnw io.quarkus.platform:quarkus-maven-plugin:3.40.1:update -N -DplatformVersion=3.40.1 -DrewriteDryRun=true`
  first, inspect `target/rewrite/rewrite.patch`/`rewrite.log`, and apply the
  resulting changes by hand rather than running `rewrite:run` blind or
  skipping the tool and hand-writing the whole migration.
- Rationale: The dry run is cheap, reviewable, and the actual output was
  small (3 distinct changes — see "Repository Impact"). Hand-applying lets
  the override-removal decision (`DEC-3`) and the codemod's own changes land
  in one coherent pom.xml edit instead of two passes that might conflict.
- Alternatives considered: running `rewrite:run` directly (applies without
  a chance to cross-check against the override-removal decision first —
  rejected, since the tool doesn't know about run-0001's manual overrides
  and could leave them stale); skipping the tool and inferring all changes
  from migration-guide reading alone (rejected — the tool's dry run is the
  authoritative, project-specific signal; guide-reading is used only to
  fill gaps the tool doesn't cover, per `TG-3`).
- Tradeoffs: hand-applying means re-deriving what the tool would have
  changed if re-run later (e.g. after a future version bump); acceptable
  since the pom is small and the patch is saved in this run's `prg` Log.
- Linked requirement: wave 001 manifest `W-2` ("run `quarkus:update` and
  review/apply its codemods").

`DEC-3 — Remove run-0001's four Java-25 test-tooling overrides`

- Decision: Remove (a) the pre-BOM-import `org.ow2.asm` block, and (b) the
  test-scope `org.jacoco:*`/`org.mockito:*`/`net.bytebuddy:byte-buddy`/
  `org.ow2.asm:*` block, in full. Let the `3.40.1` BOM's own pins stand.
- Rationale: direct inspection of `quarkus-bom-3.40.1.pom` (fetched from
  Maven Central) shows: `org.jacoco:*` → `0.8.15` (identical to the
  override), `org.ow2.asm:*` → `9.10.1` (identical), `net.bytebuddy:byte-
  buddy(-agent)` → `1.18.8` (*newer* than the override's `1.17.7` — keeping
  the override would be a downgrade), `org.mockito:*` → `5.21.0` (older
  than the override's `5.24.0`, but both are past the `5.16+`/Byte Buddy
  `1.17+` threshold identified as the point Mockito/Byte Buddy gained native
  Java-25 class-file support — and this codebase has zero `mockStatic`/
  `MockedStatic` usage, so the one known post-5.16 regression at that
  boundary, a static-`UUID`-mocking bug fixed in Mockito `5.22.0`, cannot
  fire here either way). Removing redundant/superseding pins is simpler
  (KISS) and avoids the pom silently holding a version below what `3.40.1`
  would pick on its own, which is exactly the risk the dispatch brief
  flagged.
- Alternatives considered: keeping all four unchanged (rejected — two are
  now pure duplication of the BOM, one is a needless downgrade below what
  the BOM already provides); keeping only the mockito override at `5.24.0`
  for "a newer, safer" pin (considered, but rejected — the actual, narrow
  known risk (`mockStatic` + `UUID`) doesn't apply to this test suite, and
  carrying a now-unexplained version-skew comment is worse than trusting
  the BOM, per DRY/KISS; the decision is verified empirically anyway via
  the full test run, which exercises every test-tooling-dependent test).
- Tradeoffs: if the 3.40.1 BOM's `mockito-core:5.21.0`/`byte-buddy:1.18.8`
  combination turns out to have some other, undiscovered Java-25 issue not
  caught by this project's test suite, the fallback is to reintroduce the
  minimal targeted override needed (e.g. just a mockito-core pin) rather
  than reverting this whole decision — acceptable, since this run's own
  full `./mvnw verify` run (see "Observability and Verification") is the
  actual empirical gate, not the version-number reasoning alone, and that
  gate would be the one to catch it.
- Linked requirement: dispatch brief's explicit instruction to check
  whether run-0001's overrides are now redundant given the new BOM.

`DEC-4 — Apply the two codemods beyond the version bump`

- Decision: Apply the `quarkus-junit5`→`quarkus-junit` /
  `quarkus-junit5-mockito`→`quarkus-junit-mockito` artifact rename, and
  prepend `@{argLine}` to the explicit `<argLine>` in both
  `maven-surefire-plugin` and `maven-failsafe-plugin`.
- Rationale: both are `quarkus:update`'s own dry-run output
  (`io.quarkus.updates.core.quarkus331.JUnitRelocations` and
  `...AddArglineToSurefireFailsafePlugins`), confirmed real against the
  3.40.1 BOM (both old and new JUnit artifact ids exist in the BOM — this
  is the recommended rename, not a hard break — so applying it is a
  cleanliness win, not a correctness requirement) and against published
  OpenRewrite recipe docs (`@{argLine}` is needed because "Quarkus 3.31 now
  supports Java 25 out of the box" and auto-injects extra JVM args into
  surefire/failsafe *unless* an explicit `<argLine>` is already present
  without the `@{argLine}` placeholder, in which case the auto-injected
  args are silently dropped).
- Alternatives considered: leaving `quarkus-junit5`/`quarkus-junit5-mockito`
  as-is (viable since both resolve in 3.40.1, but leaves the pom out of
  step with Quarkus's own stated direction for no reason); leaving
  `<argLine>` without `@{argLine}` (rejected — this would silently swallow
  whatever JVM args Quarkus 3.31+ auto-injects for Java 25 test runs,
  which is the exact class of problem run-0001 hand-patched around once
  already with the explicit `-XX:+EnableDynamicAgentLoading` flag).
- Tradeoffs: none identified.
- Linked requirement: wave 001 manifest `W-2` ("run `quarkus:update` and
  review/apply its codemods").

`DEC-5 — No application.properties or extension-API changes needed`

- Decision: Make no changes to `src/main/resources/application.properties`
  or to any `quarkus-picocli`/`quarkus-container-image-jib`/`quarkus-jacoco`
  usage in source.
- Rationale: `quarkus.jib.jvm-entrypoint` (the one non-trivial property in
  use) is confirmed still valid, non-deprecated, and documented identically
  in the current Jib extension guide. The remaining six properties
  (`quarkus.application.name`, `quarkus.banner.enabled`,
  `quarkus.log.level`, `quarkus.container-image.group`/`name`/`registry`)
  are core Quarkus properties with no renaming history found. Direct-API
  usage of all three named extensions in `src/main/java`/`src/test/java` is
  limited to a `@TopCommand` annotation (picocli) and `quarkus-jacoco`/
  `quarkus-container-image-jib` are config/build-time-only here (no Java
  API calls against either). `quarkus:update`'s dry run also proposed
  nothing against `application.properties`.
- Alternatives considered: proactively rewriting properties defensively —
  rejected; nothing in the dry-run output, the current Jib guide, or the
  BOM's extension list indicated a need, and doing so without a concrete
  reason would be exactly the "guessing" `write-technical-design-document`
  asks to avoid.
- Tradeoffs: residual risk that a deeper, code-level behavior change in one
  of these three extensions across the 19-release span isn't caught by
  config/API-surface inspection alone — mitigated by `TG-5`/`TG-6`
  (`./mvnw verify` plus the byte-identical-output check actually exercising
  all three extensions' runtime behavior, not just their config surface).
- Linked requirement: wave 001 manifest `W-2` ("fix whatever it misses
  across the ~19 intervening minor releases").

# Repository Impact

`IMP-1 — pom.xml: platform version and junit extension rename`
- Path(s): `pom.xml`
- Change type: modify
- Why impacted: `TG-1`, `DEC-1`, `DEC-4`.
- Linked PRD IDs: n/a (no PRD; see wave manifest `W-2`).
- Risks / notes: single-module pom; no transitive multi-module coordination
  risk.

`IMP-2 — pom.xml: remove run-0001's Java-25 test-tooling overrides`
- Path(s): `pom.xml` (the pre-BOM-import `org.ow2.asm` block; the test-scope
  jacoco/mockito/byte-buddy/asm block)
- Change type: remove
- Why impacted: `TG-4`, `DEC-3`.
- Linked PRD IDs: n/a.
- Risks / notes: this is the one change in this run with a real (if
  low-probability) regression risk — see `DEC-3`'s tradeoffs. Verified via
  the full test suite, not just version-number comparison.

`IMP-3 — pom.xml: argLine composability fix`
- Path(s): `pom.xml` (`maven-surefire-plugin`, `maven-failsafe-plugin`
  `<configuration><argLine>`)
- Change type: modify
- Why impacted: `DEC-4`.
- Linked PRD IDs: n/a.
- Risks / notes: purely additive to the existing flag (`@{argLine}` is a
  Maven late-property reference that resolves to empty string if nothing
  sets it — safe no-op if Quarkus 3.40.1 happens not to inject anything).

# Canonical Impact

Not applicable — no canonical registers declared. This repository has no
`docs/CLAUDE.md` register declaration and no `arc`/`dom` directories; the
only project-level convention file is the root `CLAUDE.md`, which declares
no canonical registers for either architecture elements or domain
invariants.

# Data Model and Contracts

None. No data structure, API boundary, message format, or file format
produced/consumed by ArchiCode itself changes. The only "contract" in play
is the Maven `dependencyManagement`/BOM-import contract between `pom.xml`
and the Quarkus platform, which is exactly what `DEC-1`-`DEC-3` describe.

# Interfaces and Behavior

Unchanged. ArchiCode's CLI surface (`ArchiCode`, `ViewsGroup`, `QueryGroup`
and their subcommands) is untouched by this run; `TG-6` exists specifically
to make that claim checkable rather than assumed.

# Flows and Processing Logic

Unchanged end-to-end flow (`workspace.yaml` → `WorkspaceFactory` →
`ManifestParser` → resource/view assembly → viewpoint assembly → PlantUML
rendering, per `CLAUDE.md`'s own architecture diagram). No branching,
async, or failure-path change is introduced by a dependency version bump,
so no diagram is added here per the diagram trigger rules.

# Reliability, Performance, and Scalability

Not materially affected. The one reliability-adjacent risk is `DEC-3`
(test-tooling version drift); it's addressed by running the actual test
suite as the gate rather than relying on version-number reasoning alone.

# Security and Privacy

Not materially affected. No new external integration, no credential
handling change, no new data flow.

# Observability and Verification

Primary gate, run from this run directory against the repository root
(JDK 25 active, per run-0001's `.sdkmanrc`):

```bash
./mvnw verify
```

Must be green — this exercises `quarkus-arc` (DI), `quarkus-picocli`
(CLI dispatch), `quarkus-junit`/`quarkus-junit-mockito` (test runtime),
and `quarkus-jacoco` (coverage instrumentation) all at once, which is the
realistic way to catch extension-level breakage across the 19-release span
that config/API-surface inspection alone can't guarantee it would catch.

Secondary, repository-specific checks:

- `git diff --stat -- src/doc/examples` after `./mvnw verify` must report no
  changes — these PlantUML outputs are tracked in git and regenerated
  in-place by `GenerateDesignExampleTest`/`GenerateFacetExampleTest`
  (`src/test/java/io/morin/archicode/doc/`); a byte-level diff is strictly
  stronger evidence than the wave's "produces unchanged output" exit
  criterion asks for by inspection alone.
- `./mvnw -q io.quarkus.platform:quarkus-maven-plugin:3.40.1:update -N -DplatformVersion=3.40.1 -DrewriteDryRun=true`
  re-run *after* applying `DEC-1`-`DEC-4`, to confirm it now reports no
  further changes (i.e. every codemod it identified was actually applied,
  not partially).
- Manual re-check of each of the twelve `@SuppressWarnings("java:S____")`
  sites: confirm the annotated code is unchanged by this run (`git diff`
  shows none of those files touched) — the finding each suppresses depends
  only on the code shape SonarCloud scans, not on the Quarkus/dependency
  version, so "unchanged code" is sufficient evidence the suppressions
  still apply to the same findings. SonarCloud's own quality gate cannot be
  run from this sandbox (`ASM-2`/`CON-4`) — this is explicitly named as an
  uncheckable item in this run's final report, matching how run-0001
  reported the same gap for the live CI run.

Out of scope for this run's verification: the `native` Maven profile
(`-Dnative`), and anything requiring a live SonarCloud token.

# Deployment and Rollout

Code-only, dependency-version change. No data migration, no backward-
compatibility concern (ArchiCode has no external API contract to break),
no feature flag. Rollback is `git revert` of this run's commit(s) — planning
guidance only; this TDD does not grant deployment permission.

# Risks and Tradeoffs

`RISK-1` — Removing run-0001's test-tooling overrides (`DEC-3`) could
regress coverage/mocking under Java 25 if the 3.40.1 BOM's bare pins turn
out to have a gap this project's test suite doesn't happen to exercise.
See `DEC-3`'s rationale and tradeoffs for the mitigation and fallback —
not restated here.

`RISK-2` — The `quarkus-junit5`→`quarkus-junit` rename (`DEC-4`) is
cosmetic today but could matter if a future Quarkus release actually
removes the old `-junit5` artifact id; low risk now, not current-run-
blocking, but worth flagging so a future reader isn't confused about why
both names appear in the BOM.

`RISK-3` — This sandbox cannot reach SonarCloud's API; the wave's exit
evidence calls for "SonarCloud quality gate green" and that specific claim
cannot be verified here, only on the next live CI run. Named explicitly
rather than silently assumed, matching run-0001's own reporting pattern for
the same constraint.

# Open Questions

None outstanding. The one genuine design fork this run faced (`DEC-3`,
whether to keep/adjust/remove run-0001's overrides) was resolved by direct
inspection of the 3.40.1 BOM plus empirical verification via the full test
suite, rather than left open.

# Deferred Work

None identified. This repository has no `docs/bkg/` backlog register (no
`docs/bkg/README.md` exists), so there is no admission-tested backlog to
file into even if something had surfaced; nothing did.

# File Placement and Frontmatter

Saved at
`docs/wav/wav-001-quarkus-java-upgrade/run/run-0002-quarkus-platform-upgrade/tdd-0002-quarkus-platform-upgrade.md`,
per this wave-owned run's directory (`manage-runs`' convention for a
wave-owned run, since a wave number and slug were supplied). Frontmatter
carries `type: tdd`, `run: 0002`, `wave: 001`, and `related:` links to the
wave plan and run-0001's TDD (settled ground this run builds on top of, not
re-reviews).
