---
type: prg
status: completed
date: 2026-10-04
related:
  - docs/wav/wav-001-quarkus-java-upgrade/wav-001-quarkus-java-upgrade.md
wave: 001
---

# Progress Log: quarkus-java-upgrade

## Log

- 2026-10-04: Wave drafted and proposed. Not yet started.
- 2026-10-04: Wave status set to `in-progress`. Batch 1 computed: W-1
  (`java-toolchain-baseline`, run-0001) and W-2
  (`quarkus-platform-upgrade`, run-0002) — both phase P1, no unmet
  dependencies. Run directories created and numbers allocated. Per the
  plan's Risks section, W-1 and W-2 declare an unresolved `pom.xml`
  overlap with verdict `serialize` — dispatching one at a time, not
  concurrently, despite both being batch-eligible. Both dispatched at
  `standard` tier via `run-management:run-executor`. Dispatching W-1
  first.
- 2026-10-04: W-1 (run-0001, `java-toolchain-baseline`) completed. Verified
  from disk, not from the subagent's report alone: run status file reads
  `completed`; pln `execution_manifest.status: done`, all 5 tasks `done`,
  all 3 criteria `MET`; `git status`/`diff --stat` confirms only the 4
  declared `likely_paths` files changed (`pom.xml`, `.sdkmanrc`,
  `.github/workflows/ci-build.yaml`, `CLAUDE.md`) — nothing outside them,
  nothing in the wave's own files or run-0002's directory. Independently
  grepped `pom.xml`: `maven.compiler.release=25`,
  `quarkus.platform.version=3.21.1` (untouched, confirmed by the run's own
  task-001 diff review too), `.sdkmanrc` reads `java=25.0.4-tem`, CI step
  reads `actions/setup-java@v6` / `java-version: "25"`. `./mvnw verify` was
  actually run (not just claimed) twice post-fix: BUILD SUCCESS, 83/83
  tests. Dispatching W-2 next, serialized after W-1 per the declared
  `pom.xml` overlap.
- 2026-10-04: W-2 (run-0002, `quarkus-platform-upgrade`) completed.
  Verified from disk: run status file reads `completed`; pln
  `execution_manifest.status: done`, all 6 tasks done. `git diff --stat`
  confirms only `pom.xml` changed by this run (the `.sdkmanrc`/CI/
  `CLAUDE.md` diffs present are W-1's, carried forward unchanged — grep
  confirms `Set up JDK 25` / `java-version: "25"` still intact, not
  reverted). Independently grepped `pom.xml`:
  `quarkus.platform.version=3.40.1`, `quarkus-junit`/`quarkus-junit-mockito`
  (renamed per `quarkus:update`'s own codemod). The run removed all four of
  W-1's Java-25 test-tooling overrides after confirming by direct
  inspection of the 3.40.1 BOM that jacoco/asm are now pinned identically
  (pure duplication), byte-buddy's BOM pin is newer, and mockito's BOM pin
  is past the known compatibility threshold — confirmed empirically via
  `dependency:tree`, not by version-number reasoning alone. `git diff
  --stat -- src/main/java src/test/java` and `-- src/doc/examples` both
  empty — no Java source touched, no tracked generated output changed.
  `./mvnw clean verify` actually run (not just claimed): exit 0.
- 2026-10-04: Phase P1 gate verified.
  - Criterion "pom.xml pins Quarkus to the chosen 3.40.x LTS release and
    maven.compiler.release to 25" — **MET**, confirmed by direct grep
    (`quarkus.platform.version=3.40.1`, `maven.compiler.release=25`).
  - Criterion "./mvnw verify is green on CI with the new baseline" — **MET
    by local equivalent + static inspection**: `./mvnw clean verify` was
    actually run and passed under JDK 25 with Quarkus 3.40.1 (both runs,
    multiple times). `.github/workflows/ci-build.yaml` was read back
    directly and its JDK/Sonar steps validated as well-formed YAML. The
    live GitHub Actions run itself was not exercised — no CI access from
    this sandbox, the same constraint both run 0001 and run 0002 reported
    rather than glossing over.
  - Criterion "the SonarCloud quality gate is green on the new baseline" —
    **verified by inspection only, not run live**: no SonarCloud
    token/network reachable from this sandbox. Inspected instead: zero
    Java source files were touched by either run (`git diff --stat --
    src/main/java src/test/java` empty across both), so none of the
    repository's existing twelve `@SuppressWarnings("java:S____")` sites
    could have drifted from the findings they suppress, and no new
    Sonar-relevant code shape was introduced. This supports, but does not
    substitute for, an actual SonarCloud scan — flagging this plainly
    rather than claiming a check that didn't run.
  - Canonical discharge (`CI-arc-n`/`CI-dom-n`): not applicable — this
    repository has no `arc`/`dom` registers (`docs/CLAUDE.md` doesn't
    exist), confirmed at the start of both runs, and both TDDs state this
    explicitly in their Canonical Impact sections rather than leaving it
    silent.
  - Gate holds (with the CI/SonarCloud caveats above named, not glossed
    over). Proceeding into phase P2.
- 2026-10-04: Batch 2 computed: W-3 (`prettier-toolchain-bump`, run-0003)
  — phase P2, both dependencies (W-1, W-2) now `completed`. Run directory
  created, number 0003 allocated. Sole batch member, no overlap to
  consider. Dispatched at `standard` tier via `run-management:run-executor`.
- 2026-10-04: W-3 (run-0003, `prettier-toolchain-bump`) completed, profile
  `single-document` (judged by the run itself — settled scope, no live
  design fork, one agent end to end). Verified from disk: run status file
  reads `completed`. `git status --short` confirms exactly 19 files
  changed by this run (`package.json`, `package-lock.json`, and 17
  `src/**/*.java` files) — nothing outside `likely_paths`, nothing in the
  wave's own files or run-0001/0002's directories. Independently read
  `package.json`: `prettier: ^3.9.9`, `prettier-plugin-java: ^2.11.0`.
  Independently diffed the one non-trivially-whitespace-only file
  (`ElementIndexFactory.java`): confirmed it only drops a redundant
  parenthesis pair around a pattern-match operand in an `&&` expression —
  semantically inert (`instanceof` pattern matching binds tighter than
  `&&` in Java). `./mvnw verify` actually run (not just claimed): BUILD
  SUCCESS, 83/83 tests.
- 2026-10-04: Phase P2 gate verified. `gate.criteria: []` — no criteria
  declared, so the gate holds trivially (empty means no gate, per the
  plan). No later phase exists, so this is also the wave's last gate.
- 2026-10-04: Wave Completion Criteria checked against the final state:
  `pom.xml` pins `quarkus.platform.version=3.40.1` and
  `maven.compiler.release=25` (MET); Lombok (1.18.48), the core Maven
  plugins, and npm `prettier`/`prettier-plugin-java` (3.9.9/2.11.0) are at
  their latest Java-25/Quarkus-3.40-compatible versions (MET); CI,
  `.sdkmanrc`, and `CLAUDE.md` all name Java 25 consistently (MET);
  `./mvnw verify` is green locally across all three runs (MET; the live
  GitHub Actions run and the live SonarCloud scan itself were not
  reachable from this sandbox — verified by local-equivalent + inspection
  instead, as recorded in the P1 gate entry above); the test suite
  exercises `src/test/workspaces/**` with 83/83 passing, and
  `src/doc/examples/**`'s tracked generated output was confirmed
  byte-identical after the full build (MET). Wave complete. Status set to
  `completed` in the plan's frontmatter and manifest, the business case,
  and this progress log.

## Findings

- W-1 discovered that Quarkus 3.21.1's own BOM transitively pins
  JaCoCo 0.8.12, ASM 9.7.1, Mockito 5.12.0, and Byte Buddy 1.15.11 — none
  of which can parse Java 25 class files (major version 69). W-1 fixed
  this with explicit third-party `dependencyManagement` overrides
  (`org.jacoco:*`→0.8.15, `org.mockito:*`→5.24.0,
  `net.bytebuddy:byte-buddy`→1.17.7, `org.ow2.asm:*`→9.10.1, the asm pair
  declared ahead of the Quarkus BOM import). W-2 should check whether
  Quarkus 3.40's own BOM already pins Java-25-compatible versions of
  these before assuming W-1's overrides still need to stay as-is —
  they may become redundant, or may need re-pinning again if 3.40 picks
  different transitive versions.
- W-3 found that `prettier-plugin-java` 2.6.4→2.11.0 replaced its entire
  Java-parsing backend (`chevrotain`-based `java-parser` → `web-tree-sitter`),
  which is why 17/121 files needed reformatting on what looked like a minor
  version bump — not a bug in either version, just a different (still
  config-compliant) layout choice from the new parser/printer.
- W-3's one non-whitespace diff (`ElementIndexFactory.java`, a redundant
  parenthesis removed around a pattern-match operand) is worth a human's
  own glance even though it was verified semantically inert — flagged here
  so it isn't lost once this prg is read back later.
- The sandbox this wave ran in could not reach live GitHub Actions or
  SonarCloud (no network/token), and Asciidoctor's PlantUML diagram
  rendering failed for the same reason (no PlantUML binary/jar reachable).
  None of this is a defect in the repository — it's an environment
  limitation every run hit and reported rather than working around
  silently.

## Lessons Learnt

- Sequencing a Java-baseline bump (W-1) strictly before a Quarkus-platform
  bump (W-2) — even with no genuine correctness dependency between them —
  meant W-1 had to add test-tooling version overrides to make JDK 25 work
  against the *old* Quarkus BOM's transitive pins, which W-2 then had to
  remove once the *new* BOM's own pins made them redundant. The end state
  was correct either way, but a future wave bumping both a language
  baseline and a framework platform together could save a round-trip by
  bumping the framework first (so its BOM's own transitive pins are
  already current) and the language baseline second.
- `complete-wave`'s `serialize` verdict on a shared-file overlap worked
  exactly as designed here: W-1 and W-2 both edited `pom.xml` but never
  ran concurrently, and the batch-self-check (step 7) found no collision
  because there was none to find.
