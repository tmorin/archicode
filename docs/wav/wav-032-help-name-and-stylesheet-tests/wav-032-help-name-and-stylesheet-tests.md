---
type: wave
wave: 032
status: proposed
date: 2026-11-02
related:
  - docs/wav/wav-032-help-name-and-stylesheet-tests/wbc-032-help-name-and-stylesheet-tests.md
  - docs/wav/wav-031-graph-answers-impact/wav-031-graph-answers-impact.md
---

# Wave 032 — The name in `--help` and tests that read the stylesheet as a stylesheet

## Purpose

Every `--help` of the command line starts with `Usage: archicode`, in the jar and in the native image, and the manual's command listing is what the program prints. No unit test of the editor page matches the text of the stylesheet with a regular expression: each such assertion is deleted (an end-to-end spec covers it) or rewritten on a parsed stylesheet, and `compactStyle` no longer exists.

## Non-Goals

- No change to a command other than the name its usage shows: no option, no exit code, no file written, no other message (#201).
- No change to the CSS itself and no change to an existing end-to-end spec; a spec is added only where a deleted assertion leaves a behaviour unproved that matters (#203).
- No change to the assertions that read the JavaScript of the page, only those that read its stylesheet.
- No change to the query commands (wave 031), and nothing of #24, #134, #135.

## Decision Prerequisites

None: the shape of both changes is decided on #201 and #203.

## Wave Manifest

```yaml
wave_manifest:
  wave: 032
  slug: help-name-and-stylesheet-tests
  status: proposed
  sources:
    - '#201'
    - '#203'
  phases:
    - id: P1
      name: The name and the stylesheet tests
      gate:
        criteria:
          - 'with the application built (`./mvnw -o package -DskipTests -DskipITs`, JAVA_HOME a JDK 25), the first line of `java -jar target/quarkus-app/quarkus-run.jar --help` and of `... query graph --help` starts with `Usage: archicode` (on the starting repository both start with `Usage: <main class>`)'
          - '`grep -c setCommandName src/test/java/io/morin/archicode/doc/CommandReferenceTest.java` prints 0 (1 on the starting repository), `./mvnw test -Dtest=CommandReferenceTest` exits 0, and `git diff` of src/doc/README.adoc for the wave changes only the sentence of [[command-reference]] that says "with `archicode` for its name", with the listings unchanged'
          - 'a test under src/test/java/io/morin/archicode/it holds the string `Usage: archicode` (none does on the starting repository) and `./mvnw verify -DskipITs=false` exits 0'
          - '`grep -rl compactStyle src/test` prints nothing (15 files on the starting repository, the helper included) and src/test/javascript/viewpoint-kernel/stylesheet-support.js does not exist'
          - 'a fresh agent reads the 13 test files that wrapped the page in `compactStyle` (list in #203; `git show` of the first commit of the wave for the list) and finds no assertion whose pattern holds a CSS rule or a media query and no cut of the stylesheet by position (`indexOf`, `slice`, `substring` on the text of the style); a shared reader `rule(selector, at)` over a parsed stylesheet exists and the kept assertions use it'
          - 'the commits of the second run list each deleted test with the end-to-end spec of src/test/e2e that covers it (`git log --format=%B` over the wave), and `git diff --name-status` of src/test/e2e for the wave shows only added files or added tests, and nothing under src/main/editor'
          - '`npm run test:unit`, `npm run test:coverage`, `npm run format:check` and `npm run lint` exit 0, and `npm run editor:build` and `npm run sample:build` leave `git status --short` unchanged'
  runs:
    - id: W-1
      slug: help-usage-name
      phase: P1
      depends_on: []
      run: null
      delegation: standard
      profile: single-document
      likely_paths:
        - 'src/main/java/io/morin/archicode/cli/ArchiCode.java'
        - 'src/test/java/io/morin/archicode/doc/CommandReferenceTest.java'
        - 'src/test/java/io/morin/archicode/it/**'
        - 'src/test/java/io/morin/archicode/cli/**'
        - 'src/doc/README.adoc'
      focus: 'read "Usage: archicode" at the top of every --help, in the jar and in the native image'
    - id: W-2
      slug: stylesheet-tests-on-a-parsed-stylesheet
      phase: P1
      depends_on: []
      run: null
      delegation: standard
      likely_paths:
        - 'src/test/javascript/viewpoint-kernel/**'
        - 'src/test/e2e/**'
        - 'src/test/CLAUDE.md'
      focus: 'a test of the stylesheet fails when the page looks wrong, not when the formatter moves a line'
```

## Phase P1 — The name and the stylesheet tests

| # | Slug | Depends on | Focus | Scope | Exit evidence |
|---|------|------------|-------|-------|---------------|
| W-1 | `help-usage-name` | — | read `Usage: archicode` at the top of every `--help` | `name = "archicode"` on the `@Command` of `ArchiCode.java`; a test that `--help` of the top command and of one subcommand start with `Usage: archicode`, run by an `*IT` on the packaged application (and so by the Native job); `CommandReferenceTest` without `setCommandName`; the sentence of `[[command-reference]]` reworded to say the listing is what `--help` prints; the commit says that `scripts/byte-identity.sh` runs no `--help`; the first line of the native runner checked to be the same (proved by the Native job of CI if not runnable locally) | gates 1 to 3 of P1 |
| W-2 | `stylesheet-tests-on-a-parsed-stylesheet` | — | a stylesheet test that reads rules, not lines | list of the assertions that read the stylesheet as text (the 13 files); `rulesOf` of `css-theme-audit.test.js` moved to a shared file with `rule(selector, at)`; per assertion: delete (a Playwright spec proves it, named in the commit message), rewrite on the parsed stylesheet (no literal colour, the dark variables defined twice, the order of two rules in the cascade), or add an end-to-end test where a deletion leaves a behaviour unproved that matters; order: `css-theme-audit.test.js`, `styles.test.js`, the rest; `compactStyle` and `stylesheet-support.js` removed last; about ten tasks | gates 4 to 6 of P1 |

**Gate:** the seven criteria of P1 in the manifest.

## Risks

- **Overlap W-1 and W-2:** `likely_paths` do not intersect (production code, the manual and Java tests against JavaScript tests, the e2e folder and `src/test/CLAUDE.md`). Verdict: `concurrent-safe`, different files under different folders; if W-1 ever needs `src/test/CLAUDE.md`, the verdict becomes `serialize`.
- **Overlap with wave 031:** wave 031 edits `src/doc/README.adoc` and `cli/**` too. The waves run one after the other, 032 after 031; the repository is the one 031 leaves.
- **Deleting without a check test by test.** The author accepted deleting what an end-to-end spec already covers, listed in the commit message. The risk is a spec that names the behaviour but does not prove it; the gate has a fresh agent read the commit lists, and a browser spec is added where a deletion leaves a behaviour that matters unproved.
- **The native image.** The first line of the native runner is not run by a pull request on a branch; the runs say so if it is not proved.
- **The unit suite is large** (about 13 files and 340 tests read by the second run); `npm run test:coverage` has a floor (`scripts/editor-coverage-floor.json`): removing assertions may lower the covered lines of the page script, which the run checks and reports.

## Completion Criteria

- The gate of P1 holds.
- #201 and #203 are closed by the wave's pull request.
- `./mvnw verify -DskipITs=false`, `npm run test:unit`, `npm run test:coverage`, `npm run format:check` and `npm run lint` pass.
