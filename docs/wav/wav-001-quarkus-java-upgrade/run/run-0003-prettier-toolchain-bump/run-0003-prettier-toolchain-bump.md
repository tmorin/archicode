---
type: run
run: 0003
status: completed
wave: 001
profile: single-document
---

# Run 0003: Prettier Toolchain Bump

## Document profile

`single-document` (per `manage-runs`' "Document profiles"): scope arrives
settled — the wave plan (`docs/wav/wav-001-quarkus-java-upgrade/wav-001-quarkus-java-upgrade.md`,
run W-3) names the exact two npm packages, the exact reformat action, and
the exact exit evidence. The design has no live alternative worth recording
as rejected — there is one way to bump two npm deps and run a formatter.
The work is one sequence, one agent, start to finish. All three tests for a
`prd`/`tdd`/`pln` fail, so this run's own status file carries scope,
decisions, canonical impact, verification and findings in one body instead.

## Scope

Depends on W-1 (`run-0001-java-toolchain-baseline`) and W-2
(`run-0002-quarkus-platform-upgrade`), both `completed` and merged before
this run started; confirmed via `git log` that neither touched any file
under `src/main/java/**` or `src/test/java/**` (only `pom.xml`,
`.sdkmanrc`, `.github/workflows/ci-build.yaml`, `CLAUDE.md`), so the Java
source tree this run formats is unchanged from before the wave began.

1. Bump `prettier` (`^3.3.3` → latest) and `prettier-plugin-java` (`^2.6.4`
   → latest) in `package.json`, and refresh `package-lock.json` to match.
2. Run the formatter once over the full Java source tree
   (`npx prettier --write "src/**/*.java"`, per the existing
   `.prettierrc.yaml`: `prettier-plugin-java` plugin, `printWidth: 120`,
   `tabWidth: 4`, `useTabs: false`, `trailingComma: none`).
3. Verify the resulting diff is formatting-only — no identifier, literal,
   or control-flow change — and that `./mvnw verify` is still green.

Out of scope: wiring a new npm script for this (none exists today and none
is requested); touching anything under `pom.xml`, `.sdkmanrc`, or CI (W-1's
and W-2's settled ground).

## Decisions

- **D-1 — target versions.** Checked npm directly rather than trusting the
  wave plan's already-stale snapshot: `npm view prettier version` →
  `3.9.9`; `npm view prettier-plugin-java version` → `2.11.0`. These match
  the wave plan's prediction exactly, so no re-plan was needed.
  `prettier-plugin-java`'s own `peerDependencies` declare `prettier: ^3.0.0`,
  so `3.9.9` satisfies it; no breaking major-version jump is involved on
  either package.
- **D-2 — reformat method.** Used `npx prettier --write "src/**/*.java"`
  exactly as `CLAUDE.md`'s "Build & Test" section already documents (no npm
  script is wired up for this, confirmed by reading `package.json`), so the
  run introduces no new tooling surface, just uses what's already
  documented.
- **D-3 — "formatting-only" verification method.** Rather than a bytecode
  diff (would require a full build before and after and a classfile
  comparator not already in this toolchain), verification is: (a) `git
  diff --stat` shows only `.java` files touched, no renames/deletions; (b)
  a manual scan of the diff for any token-level change beyond
  whitespace/line-wrapping (confirms no identifier/literal/operator
  changed — formatters reflow text, they don't rewrite tokens); (c)
  `./mvnw verify` green afterward, which exercises the full test suite
  against the reformatted sources and would fail on any accidental
  semantic change. This combination is the TDD-equivalent design decision
  for this run: it was judged sufficient because Prettier (with a
  deterministic AST-based plugin) by construction only changes
  whitespace/trivia, and the test suite is the behavioral backstop.

## Canonical impact

None. This run does not touch any `arc`/`dom` register element — it is a
pure formatting-tool version bump with no architectural or domain
consequence. (No `CI-arc-n`/`CI-dom-n` to discharge.)

## Verification

All commands run from the repo root, `JAVA_HOME` pointed at the sdkman
`25.0.4-tem` candidate (required — `JAVA_HOME` unset in the shell resolves
to the system JDK 21, which `maven.compiler.release=25` rejects):

1. `npm view prettier version` → `3.9.9`; `npm view prettier-plugin-java
   version` → `2.11.0` — confirms the target versions before bumping.
2. `npm install` after editing `package.json` — refreshed
   `package-lock.json`; `npm` reports "added 1 package, removed 11
   packages, changed 2 packages" (prettier-plugin-java 2.11.0 switched its
   internal parser from `java-parser`/`chevrotain` to `web-tree-sitter`,
   shrinking its own dependency tree — a dependency-of-a-dependency detail,
   not something this run's own dependencies list needed to change).
3. `npx prettier --check "src/**/*.java"` (before reformatting) → 17 files
   flagged as needing reformatting under the new version.
4. `npx prettier --write "src/**/*.java"` → rewrote those 17 files.
5. `npx prettier --check "src/**/*.java"` (after) → **passes**: "All
   matched files use Prettier code style!"
6. Diff review for semantic drift: wrote a script comparing, per changed
   file, the whitespace-stripped concatenation of removed lines against
   added lines. 16 of 17 files are exactly whitespace-insensitive-identical
   (pure reflow/line-wrap). One file,
   `src/main/java/io/morin/archicode/workspace/ElementIndexFactory.java`,
   differs by two characters: `prettier-plugin-java` 2.11.0 removes a
   redundant parenthesis pair around a pattern-match operand —
   `appCandidate.getElement() instanceof TechnologyElement technologyElement && (root instanceof Technology technology)`
   → `... && root instanceof Technology technology`. Verified safe:
   `instanceof` pattern matching binds tighter than `&&` in Java, so the
   parens were redundant and removing them changes no semantics; the test
   suite (which exercises this exact code path, `ElementIndexFactory`) is
   green afterward, corroborating it.
7. `./mvnw verify` → **BUILD SUCCESS**, 83 tests run, 0 failures, 0 errors.
   (The Asciidoctor site-generation step logs `ERROR: ... Could not load
   PlantUML ...` for several `.adoc`/`.puml` inputs — this is the
   `asciidoctor-maven-plugin`'s site-doc image rendering, unrelated to
   Java/Prettier, pre-existing in this sandbox regardless of this run's
   changes [no PlantUML binary/jar reachable in this offline environment],
   and does not fail the build or any test. Not investigated further as
   out of this run's scope; flagged here rather than silently passed over.)
8. `git status --short` confirms only `package.json`, `package-lock.json`,
   and the 17 `src/**/*.java` files changed by this run — no files outside
   `likely_paths` touched.

All exit evidence from the wave plan's W-3 row is met: `npx prettier
--check "src/**/*.java"` passes with the new versions; the reformat diff is
formatting-only; `./mvnw verify` is green.

## Findings

- `prettier-plugin-java` 2.6.4 → 2.11.0 is a larger jump than the version
  numbers suggest: it replaced its Java-parsing backend entirely (from a
  `chevrotain`-based hand-rolled grammar, `java-parser`, to
  `web-tree-sitter`). This explains why 17/121 files needed reformatting —
  the new parser/printer makes slightly different (still
  `.prettierrc.yaml`-compliant) layout choices, not a bug in either
  version.
- One of the 17 files' diff includes a non-whitespace token change (a
  redundant-parentheses removal) — see Verification item 6. Worth a human
  skim of that one file (`ElementIndexFactory.java`) even though the test
  suite and precedence rules both confirm it's safe, since "formatting-
  only" was the stated acceptance bar and this is the one file that isn't
  trivially whitespace-identical.
- This repository has no `docs/bkg/` backlog directory and no
  `tooling/docs/check-backlog.py` yet — `manage-runs`' close-out step "run
  the expiry sweep … confirm check-backlog.py exits 0" has nothing to
  operate on here. Not a blocker for this run (nothing admissible surfaced
  to file anyway), but noted since that infrastructure doesn't exist in
  this repo as of this wave.
- No canonical-impact (`arc`/`dom`) obligations to discharge — stated
  up front in "Canonical impact" above and reconfirmed here at close-out.
