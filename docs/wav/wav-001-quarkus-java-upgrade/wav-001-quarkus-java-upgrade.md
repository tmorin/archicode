---
type: wave
wave: 001
status: completed
date: 2026-10-04
related:
  - docs/wav/wav-001-quarkus-java-upgrade/wbc-001-quarkus-java-upgrade.md
  - CLAUDE.md
---

# Wave 001 — Upgrade to the Latest Quarkus & Java

## Purpose

When this wave is done, ArchiCode builds and runs on Quarkus 3.40 LTS and
Java 25, every Maven- and npm-managed dependency (Lombok, the core Maven
plugins, `prettier`/`prettier-plugin-java`) sits at its latest version
compatible with that baseline, and CI, `.sdkmanrc`, and `CLAUDE.md`
consistently reflect it with no drift. `./mvnw verify` and the SonarCloud
quality gate are green throughout.

## Non-Goals

- Does not migrate to Quarkus 4 — it is still Beta; GA has not shipped.
- Does not adopt or verify the native-image/GraalVM build path (the
  `native` Maven profile stays out of scope; only the JVM build is
  verified).
- Does not change ArchiCode's CLI behavior, output format, or public API —
  this is a dependency and toolchain bump, not a feature change.
- Does not touch `json-path` or `velocity-engine-core` version pins beyond
  what the Quarkus BOM or build moves automatically — they are not part of
  the stated goal.

## Wave Manifest

```yaml
wave_manifest:
  wave: 001
  slug: quarkus-java-upgrade
  status: completed
  sources: []
  phases:
    - id: P1
      name: Version & Toolchain Baseline
      gate:
        criteria:
          - 'pom.xml pins Quarkus to the chosen 3.40.x LTS release and maven.compiler.release to 25'
          - './mvnw verify is green on CI with the new baseline'
          - 'the SonarCloud quality gate is green on the new baseline'
    - id: P2
      name: Formatting Toolchain Modernization
      gate:
        criteria: []
  runs:
    - id: W-1
      slug: java-toolchain-baseline
      phase: P1
      depends_on: []
      run: 1
      delegation: standard
      likely_paths:
        - 'pom.xml'
        - '.sdkmanrc'
        - '.github/workflows/ci-build.yaml'
        - 'CLAUDE.md'
      focus: 'get the build running cleanly on the Quarkus-recommended JDK, with every build-time tool that depends on the JDK version (Lombok, the core Maven plugins) compatible with it'
    - id: W-2
      slug: quarkus-platform-upgrade
      phase: P1
      depends_on: []
      run: 2
      delegation: standard
      likely_paths:
        - 'pom.xml'
        - 'src/main/java/**'
        - 'src/test/java/**'
      focus: 'move the Quarkus platform and its extensions to the latest LTS release, fixing whatever the version jump breaks'
    - id: W-3
      slug: prettier-toolchain-bump
      phase: P2
      depends_on: [W-1, W-2]
      run: 3
      delegation: standard
      likely_paths:
        - 'package.json'
        - 'package-lock.json'
        - 'src/main/java/**'
        - 'src/test/java/**'
      focus: 'bring the npm-managed prettier/prettier-plugin-java pair up to date and run it once over the source tree settled by W-1 and W-2'
```

## Phase P1 — Version & Toolchain Baseline

| # | Run | Slug | Depends on | Focus | Scope | Exit evidence |
|---|-----|------|------------|-------|-------|---------------|
| W-1 | 0001 | `java-toolchain-baseline` | — | Get the build running cleanly on the Quarkus-recommended JDK | Bump `maven.compiler.release` to 25; bump Lombok to the latest 1.18.x (≥1.18.40, required for Java 25 support); bump the core Maven plugins (`maven-compiler-plugin`, `maven-surefire-plugin`, `maven-failsafe-plugin`, `maven-release-plugin`, `asciidoctor-maven-plugin` + `asciidoctorj-diagram`) to their latest versions compatible with Java 25; fix `.sdkmanrc` to match; update the JDK setup step in `.github/workflows/ci-build.yaml` (and the `setup-java` action version itself, if it cannot resolve a Java 25 Temurin build); resolve the JDK-mismatch gotcha recorded in `CLAUDE.md` | `./mvnw verify` green on JDK 25 with Quarkus still at its current (pre-upgrade) version; CI green on the updated workflow; `.sdkmanrc`, CI, and `CLAUDE.md` all name the same Java version |
| W-2 | 0002 | `quarkus-platform-upgrade` | — | Move the Quarkus platform and extensions to the latest LTS | Bump `quarkus.platform.version` to the current 3.40.x LTS release; run `quarkus:update` and review/apply its codemods; fix whatever it misses across the ~19 intervening minor releases (config property renames, `quarkus-picocli`/`quarkus-container-image-jib`/`quarkus-jacoco` extension changes); re-verify the Sonar suppression annotations added in recent commits still apply to the same findings | `./mvnw verify` green; `pom.xml` shows the new platform version; a CLI smoke test against `src/test/workspaces/**` and `src/doc/examples/**` produces unchanged output; SonarCloud quality gate green |

**Gate:** `pom.xml` pins the chosen Quarkus 3.40.x LTS release and
`maven.compiler.release=25`; `./mvnw verify` and the SonarCloud quality
gate are green on CI with both changes combined.

## Phase P2 — Formatting Toolchain Modernization

| # | Run | Slug | Depends on | Focus | Scope | Exit evidence |
|---|-----|------|------------|-------|-------|---------------|
| W-3 | 0003 | `prettier-toolchain-bump` | W-1, W-2 | Bring the npm-managed Prettier/Java formatter up to date | Bump `prettier` and `prettier-plugin-java` in `package.json`/`package-lock.json` to their latest versions; run the formatter once over the full Java source tree (now settled by W-1/W-2) and review the resulting diff is formatting-only | `npx prettier --check "src/**/*.java"` passes with the new versions; the one-time reformat diff touches only whitespace/formatting, nothing semantic; `./mvnw verify` still green afterward |

## Dependency View

```
W-1 (java-toolchain-baseline)  ─┐
                                 ├─▶ W-3 (prettier-toolchain-bump)
W-2 (quarkus-platform-upgrade) ─┘
```

W-1 and W-2 have no dependency between them — see Risks for why they still
cannot be dispatched in the same batch.

## Risks

- **W-1 / W-2 pom.xml overlap — verdict: `serialize`.** Both runs edit
  `pom.xml`'s `<properties>` and `<dependencies>`/`<build><plugins>`
  sections. There is no correctness dependency between them (Quarkus 3.40
  only requires Java 17, already satisfied before this wave), but editing
  the same file concurrently risks corrupting each other's changes. Do not
  dispatch them in the same batch.
- The Quarkus 3.21→3.40 jump spans roughly 19 minor releases.
  `quarkus:update`'s codemods may not cover every deprecation accumulated
  across that span — W-2 should budget time for manual fixups rather than
  assume the automated update alone is sufficient.
- `.github/workflows/ci-build.yaml` uses `actions/setup-java@v2`, which may
  not resolve a Java 25 Temurin build. W-1 should confirm this (and bump
  the action version itself if needed) rather than discover it only when
  CI fails.
- Quarkus 4.0 GA is expected around end of November 2026. If it ships
  before this wave completes, re-confirm 3.40 LTS is still the intended
  target rather than silently drifting onto 4.0 mid-wave.

## Completion Criteria

- `pom.xml` pins the Quarkus platform to the chosen 3.40.x LTS release and
  `maven.compiler.release` to 25.
- Lombok, the core Maven plugins, and the npm `prettier`/
  `prettier-plugin-java` pair are at their latest versions compatible with
  that baseline.
- `.github/workflows/ci-build.yaml`, `.sdkmanrc`, and `CLAUDE.md` all name
  Java 25 with no remaining version drift.
- `./mvnw verify` and the SonarCloud quality gate are green on CI.
- A CLI smoke test against `src/test/workspaces/**` and
  `src/doc/examples/**` produces unchanged output.
