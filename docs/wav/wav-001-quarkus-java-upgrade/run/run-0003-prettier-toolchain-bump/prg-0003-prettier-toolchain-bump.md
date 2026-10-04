---
type: prg
status: completed
date: 2026-10-04
related:
  - docs/wav/wav-001-quarkus-java-upgrade/run/run-0003-prettier-toolchain-bump/run-0003-prettier-toolchain-bump.md
run: 0003
wave: 001
---

# Progress Log: Prettier Toolchain Bump

## Log

- 2026-10-04: Run dispatched by `complete-wave` for W-3. Confirmed via
  `git log --oneline` that W-1/W-2 are merged and (per orchestrator's own
  `git diff --stat`) touched no `src/**/*.java`. Settled document profile
  as `single-document` per `manage-runs`' rule (scope arrives settled from
  the wave plan, no live design fork, one agent end to end). Wrote the
  run's own status file with scope/decisions/canonical-impact sections in
  place of a prd/tdd/pln trio.
- 2026-10-04: Verified target versions directly against npm
  (`npm view prettier version` → 3.9.9; `npm view prettier-plugin-java
  version` → 2.11.0), matching the wave plan's own prediction. Bumped
  `package.json`, ran `npm install` to refresh `package-lock.json`.
- 2026-10-04: Ran `npx prettier --write "src/**/*.java"` over the full
  source tree (17 of 121 files rewritten). Diff-reviewed every changed
  file with a whitespace-insensitive token comparison script; 16/17 are
  pure reflow, 1/17 (`ElementIndexFactory.java`) drops a redundant
  parenthesis pair, verified semantically safe by Java operator-precedence
  rules (`instanceof` binds tighter than `&&`). Ran `npx prettier --check
  "src/**/*.java"` — passes. Ran `./mvnw verify` with `JAVA_HOME` pointed
  at the sdkman `25.0.4-tem` candidate — BUILD SUCCESS, 83 tests, 0
  failures/errors. Updated run doc's Verification/Findings sections in
  full detail; set run and prg `status` to `completed`.

## Findings

- `prettier-plugin-java` 2.6.4 → 2.11.0 swapped its Java-parsing backend
  from a `chevrotain`/`java-parser` combo to `web-tree-sitter` — a larger
  internal change than the semver bump suggests, which is why 17/121 files
  needed reformatting rather than zero.
- One file's diff (`ElementIndexFactory.java`) is not purely
  whitespace-identical — it drops a redundant parenthesis pair around a
  pattern-match operand. Confirmed semantically inert via Java's
  `instanceof`/`&&` precedence and corroborated by the green test suite,
  but it's the one exception to "formatting-only" worth a human's own
  glance (see run doc's Findings for the exact before/after).
- `docs/bkg/` and `tooling/docs/check-backlog.py` do not exist in this
  repository yet — the generic `manage-runs` close-out steps that touch
  them have nothing to operate on here; not a blocker.
- `./mvnw verify` emits `asciidoctor: ERROR: ... Could not load PlantUML
  ...` during the site-doc build step — pre-existing, environment-related
  (no PlantUML binary/jar reachable in this sandbox), unrelated to
  Prettier/Java, and does not fail the build. Out of this run's scope; not
  filed as a backlog item since `docs/bkg/` doesn't exist and this didn't
  look like a repo bug so much as a sandbox/network limitation — flagging
  it in case a future run with internet access wants to confirm.

## Lessons Learnt

- Running `./mvnw verify` in this sandbox requires explicitly exporting
  `JAVA_HOME` to the sdkman-managed JDK 25 candidate
  (`~/.sdkman/candidates/java/25.0.4-tem`) — the shell's default `java` on
  `PATH` resolves to the system JDK 21 (via `update-alternatives`), and an
  unset `JAVA_HOME` makes Maven pick that one up instead of respecting
  `.sdkmanrc`. Worth remembering for any later run in this wave/repo that
  needs to build.
- A minor version-looking bump in an npm formatter plugin (2.6→2.11) can
  swap its entire parsing backend; "latest compatible version" exit
  evidence should always include an actual reformat diff review, not just
  a successful `npm install` — the version-number delta alone would have
  under-signaled how much output could change.
