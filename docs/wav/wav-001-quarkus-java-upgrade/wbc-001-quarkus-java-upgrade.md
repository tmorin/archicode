---
type: wbc
wave: 001
status: completed
date: 2026-10-04
related: []
---

# Wave 001 — Upgrade to the Latest Quarkus & Java — Business Case

## Context

ArchiCode is a single-module Quarkus/Picocli CLI pinned to Quarkus 3.21.1,
`maven.compiler.release=21`, Lombok 1.18.34, and a handful of other Maven-
and npm-managed dependencies (`json-path`, `velocity-engine-core`, the core
Maven plugins, `prettier`/`prettier-plugin-java`) that have not moved in
step with it. [CLAUDE.md](../../../CLAUDE.md) already documents one symptom
of this drift: `.sdkmanrc` still pins Java 17 while the build actually
requires 21.

Nothing in `docs/bkg/` or `docs/ana/` covers this — those registers do not
exist yet in this repository, so this wave's scope comes directly from the
stated goal rather than from a backlog item or analysis.

Quarkus 3.40 LTS shipped 2026-09-30 as the last feature release of the 3.x
line (12 months of support) and is the newest stable Quarkus release.
Quarkus 4.0.0.Beta1 followed two days later; its final GA is planned for
end of November 2026 and it raises the minimum Java version to 21 (dropping
17). Lombok's own Java 25 support landed in 1.18.40.

## Problems / Opportunities

- The project cannot pick up roughly 19 minor Quarkus releases' worth of
  fixes, extensions, and performance work while pinned to 3.21.1.
- The documented JDK mismatch (`.sdkmanrc` vs. the actual Java 21
  requirement) is a standing trap for anyone bootstrapping the project with
  `sdkman auto-env` — it silently installs the wrong JDK.
- Build-time tooling (Lombok, Maven core plugins, Prettier) has drifted far
  enough behind that a future bump risks landing all at once, entangled
  with unrelated changes, instead of being a clean, reviewable step now.

## Options & Recommendation

- **A — Upgrade to Quarkus 3.40 LTS + Java 25 now** (recommended). Targets
  the newest *final* (GA) release available today, inside the
  already-familiar 3.x/Jakarta namespace (no repeat of the 2.x→3.x
  `javax`→`jakarta` migration). Longest support window of any currently
  shipping Quarkus release.
- **B — Target Quarkus 4.0's eventual final release instead.** Only a Beta
  (4.0.0.Beta1) exists today; GA is planned for "end of November 2026" but
  has not shipped. Rejected: this wave targets only a final version, never
  a Beta/RC — waiting on an unshipped release for no firm date is not a
  final version to target.
- **C — Take a smaller step within the 3.x stream (e.g. 3.21 → 3.27 LTS)
  and leave Java at 21.** Lower short-term risk, but does not satisfy "the
  latest Quarkus version" and would need redoing almost immediately, since
  3.27 is already two LTS releases behind 3.40. Rejected as not actually
  meeting the goal.

Recommendation: **A**. 3.40 LTS is the newest release that is actually
*final* — it is the newest stable target, carries the longest support
window, stays inside the current major-version idioms, and is the natural
point to also fix the already-documented JDK drift and bump the
npm-managed Prettier toolchain that formats the Java sources.

## Vision

ArchiCode builds and runs on Quarkus 3.40 LTS and Java 25 (Quarkus's
recommended runtime). Lombok, the core Maven plugins, and the npm-managed
`prettier`/`prettier-plugin-java` pair all sit at their latest versions
compatible with that baseline. CI (`.github/workflows/ci-build.yaml`),
`.sdkmanrc`, and `CLAUDE.md` consistently describe the same Java version —
no drift between what's documented and what's actually required. `./mvnw
verify` and the SonarCloud quality gate are green throughout, and a CLI
smoke test against the existing example and test workspaces produces
unchanged output.
