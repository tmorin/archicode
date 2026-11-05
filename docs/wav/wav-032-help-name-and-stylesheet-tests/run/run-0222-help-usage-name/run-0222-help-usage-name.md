---
type: run
run: 0222
status: completed
profile: single-document
wave: 032
---

# Run 0222 help-usage-name

Wave 032, manifest id W-1 (phase P1, no dependency, delegation standard). Profile `single-document`: the scope arrives settled (issue #201, "ready", decision of the author on 2026-11-02), the design has no live alternative worth recording as rejected beyond the two in DEC-1 and DEC-3, and one agent carries the sequence. This file is the run's whole record: scope, decisions, tasks, canonical impact, verification, findings.

Review pass: dispatched. The Stage 2 review ran in a leaf agent with a fresh context, apart from any drafter: no drafting agent exists under `single-document`. The text it reviewed was the Stage 0 stub (a title and the manifest id). The KDMLLC verdict on the stub: LUCID and MECE-MISSING at S3 (no purpose, no definition of done, no decisions, no verification, no canonical-impact answer, no open questions, so a reader could not tell what the run owns), C applicable (referent: the wave plan, issue #201, `ArchiCode.java`, `CommandReferenceTest.java`, `src/doc/README.adoc`, the `*IT` classes and `src/test/CLAUDE.md`), KISS, DRY and LEAN not applicable to an empty text. The body below applies that rewrite plan and was written by the reviewing agent from the wave plan, the issue and the code, so Stage 7's C scan is the first independent read of it. The C findings of this pass are in "Findings" (F-1 to F-3), fixed in the text where the text was wrong.

## Purpose

Every `--help` of the command line starts with `Usage: archicode`, in the jar and in the native image, and the manual's listing of the commands is what the program prints. Today the top `@Command` of `cli/ArchiCode.java` has no `name`, so picocli prints `Usage: <main class>` (read on 2026-11-05 on `target/quarkus-app/quarkus-run.jar`: `--help`, `views generate --bogus` and `query graph --help` all start `Usage: <main class>`), and two things work around it: `CommandReferenceTest.commands()` calls `root.setCommandName("archicode")` on a private `CommandLine`, and the manual says the listing is shown "with `archicode` for its name".

## Referent (what this run is read against)

- `src/main/java/io/morin/archicode/cli/ArchiCode.java`: the `@TopCommand` `@CommandLine.Command(description, versionProvider, subcommands)`, with no `name`.
- `src/test/java/io/morin/archicode/doc/CommandReferenceTest.java`: `commands()` builds `new CommandLine(ArchiCode.class, factory)` and calls `setCommandName("archicode")` (one occurrence of `setCommandName`, line 240); `walk` asserts the usage width of every command is 80.
- `src/doc/README.adoc`: the sentence of `[[command-reference]]` (line 3046) "Each listing below is the usage of one command, in the text the program prints for `--help`, with `archicode` for its name."; the generated block between the markers (18 listings today); the `[[version]]` paragraph.
- `src/test/java/io/morin/archicode/it/VersionIT.java` and `Shipped.java`: the model of an `*IT` (a `@QuarkusMainIntegrationTest` that launches the packaged application, `payload(result)` drops the Quarkus log lines, `succeeded`, `said`).
- `src/test/CLAUDE.md` (sections "Integration tests" and "The byte-identity harness" and "The command reference of the manual"), `scripts/byte-identity.sh` (it runs `views generate`, `stories generate`, `query graph`, `query views`, `diff`, `plateau list`, `query schemas workspace`; its own `--help` is the script's, not the program's), `.github/CLAUDE.md` (the Native job runs the `*IT` classes on the native runner).
- Issue #201 and the wave plan's gates 1 to 3 of P1.

## Settled decisions (read, not made here)

1. The change is `name = "archicode"` on the `@Command` of `ArchiCode.java` (#201, the author, 2026-11-02).
2. The cleanups are `setCommandName` out of `CommandReferenceTest` and the sentence of `[[command-reference]]` reworded (#201).
3. The proof is a test asserting that `--help` of the top command and of one subcommand start with `Usage: archicode`, run by an `*IT` on the packaged application, and so by the Native job (#201, wave gate 3).
4. The commit says that `scripts/byte-identity.sh` runs no `--help` (#201).
5. Wave non-goal: no option, no exit code, no file written and no message changes other than the name its usage shows.

## Decisions made by this run

- DEC-1. The `*IT` is a new class `HelpIT` in `src/test/java/io/morin/archicode/it`, on the model of `VersionIT`, and not a test added to `VersionIT`. Why: `VersionIT` is the proof of `--version` (its Javadoc names its issue and its job), and an `--help` test in it would give the class two owners. Rejected: a `@QuarkusTest` in `cli/` only (it does not run on the packaged jar and the native runner, which is the proof #201 asks for; `cli/` already has `ArchiCodeTest`, and a unit assertion may be added there only if it adds a case the IT lacks, which it does not).
- DEC-2. `HelpIT` asserts on the first line of the output after `Shipped.payload` drops the Quarkus log lines, for `--help` (the top command), `query graph --help` (a command of the second level, the one named in gate 1 of the wave) and `views generate --bogus` (stderr: picocli prints the message, then the usage of the command, so the name is in the usage after a usage error as well; exit code 2, message unchanged). The third case is there because the change reaches every place the usage is printed, and a test that covers only `--help` leaves the other place unproved. The assertions hold the literal `Usage: archicode` in the class (gate 3 of the wave greps `src/test/java/io/morin/archicode/it` for that string). Rejected: testing all 18 commands in the IT; the 18 usages are already compared with the program's by `CommandReferenceTest`, and each of them is built by the same picocli path, so two second-level samples prove the name, and a third level adds nothing.
- DEC-3. The sentence of `[[command-reference]]` says the listings are what `--help` prints, and nothing else in the manual changes. Wording to write: "Each listing below is the usage of one command, in the text the program prints for `--help`." The two-line paragraph's second sentence (the order of the listings) stays. Rejected: adding a line that explains the old placeholder; the manual says what is true now, and the history is in the commit.
- DEC-4. The regenerated block of the manual is checked, not rewritten by hand: after the change, `./mvnw test -Dtest=CommandReferenceTest` passes without `ARCHICODE_MANUAL_REGENERATE`, which proves the block is unchanged (it already printed `archicode` because of `setCommandName`).
- DEC-5. The first line of the native runner: a pull request on a branch does not run the Native job, so the claim "the native image prints the same" is proved by `HelpIT` in the Native job of CI after the push, and by nothing locally. The run's report says so, as the wave's Risks section requires. Picocli reads the `name` from the annotation at build time in both, so no `reflect-config.json` line is expected; if the Native job fails on `HelpIT`, that is the first place to look.

## Out of scope

No change to another command, option, exit code, written file or message; no change to the CSS or to the JavaScript tests (run 0223); no new `src/test/CLAUDE.md` text (it belongs to run 0223 in this wave, and the `*IT` sentence there lists `VersionIT` only as an example, so it needs no change; if the run finds it must change, the wave plan turns the verdict into `serialize`); nothing of #24, #134, #135; no change to `scripts/byte-identity.sh` or its exception files (a `--help` is not run by it).

## Tasks

Each task has its own check; the next one starts when it passes. The JDK is 25 (`JAVA_HOME=~/.sdkman/candidates/java/25.0.4-tem`; the shell's `java` is 21).

- T1. Write `HelpIT` (DEC-1, DEC-2) first and run it on the starting repository to see it fail: `./mvnw verify -DskipITs=false -Dit.test=HelpIT` (or the Failsafe property the `pom.xml` takes) fails with `Usage: <main class>` in the message. Done when the failure is the expected one for each of the three cases.
- T2. Add `name = "archicode"` to the `@Command` of `ArchiCode.java`. Done when `HelpIT` passes on the packaged application and `java -jar target/quarkus-app/quarkus-run.jar --help` and `... query graph --help` (rebuilt with `./mvnw -o package -DskipTests -DskipITs`) start with `Usage: archicode` (gate 1).
- T3. Remove `root.setCommandName("archicode");` from `CommandReferenceTest.commands()` and the line above it if it only introduces it. The literal `"archicode"` that `walk(root, "archicode", commands)` takes as the prefix of the tree stays: it is the test's own expectation of the name, which the program's `name` must now equal, so the test fails if the annotation drifts. Done when `grep -c setCommandName src/test/java/io/morin/archicode/doc/CommandReferenceTest.java` prints 0 and `./mvnw test -Dtest=CommandReferenceTest` exits 0 with the manual untouched (gate 2, DEC-4).
- T4. Reword the sentence of `[[command-reference]]` (DEC-3). Done when `git diff src/doc/README.adoc` shows only that sentence, with the listings unchanged, and `CommandReferenceTest` and `manual-howto.test.js` (`npm run test:unit`) still pass.
- T5. Run the checks of the repository for what was touched: `./mvnw test-compile pmd:check`, `npm run format:check` (it covers `src/**/*.java`), `./mvnw verify -DskipITs=false` (gate 3), and `scripts/byte-identity.sh` is not run (it runs no `--help`; the commit says so).
- T6. Close-out: `git status` shows only `ArchiCode.java`, `CommandReferenceTest.java`, `HelpIT.java` (new), `src/doc/README.adoc` and the files of this run folder; the commit message says that `scripts/byte-identity.sh` runs no `--help`, that the usage of the 18 commands and of a usage error changes in its first word and the indentation of the continuation lines of each synopsis (three columns), and that the native runner is proved by the Native job; the `Files outside likely_paths:` line is written.

## Canonical impact

Answered, not skipped. Documents that state or depend on this: the manual's `[[command-reference]]` sentence (T4); the generated block of the manual (unchanged, DEC-4); `src/test/CLAUDE.md`, section "Integration tests", lists the `*IT` classes' coverage by example (`--version` named) and does not enumerate every class, so it needs no new line (checked: no occurrence of `<main class>` or of `setCommandName` in any `CLAUDE.md`, any `.md` or any `.adoc` outside `docs/wav`); `docs/architecture/` models the cli by package, not the placeholder (`grep` found nothing), so no model change and no `npm run sample:build`. The `ArchitectureDriftTest` is unaffected because no `tags.path` or editor layer changes. The guide (`archicode guide`) does not print a usage line (to confirm in T5 by `GuideTest`, which runs in `verify`). No `byte-identity` exception: it runs no `--help`.

## Open questions

- Q-1. Resolved (2026-11-05, read on the jar of `target/` run with JDK 25): `views generate --bogus` exits 2, prints `Unknown option: '--bogus'` then `Usage: <main class> views generate ...` on standard error, nothing on standard output. Decision: DEC-2's third case asserts the first line of standard error equals the message and the second line starts `Usage: archicode views generate`, exit code 2. T1 still confirms it on a rebuilt jar (F-3).
- Q-2. Resolved (lookup in `pom.xml`, lines 357-380): the Failsafe plugin has no `includes`, `test` or `groups` override, so its defaults apply (`*IT` classes) and the standard property `-Dit.test=HelpIT` selects one class, with `-DskipITs=false` (the pom defaults `skipITs` to true, line 49). T1 runs `./mvnw verify -DskipITs=false -Dit.test=HelpIT`; the shell's `java` is 21, so `JAVA_HOME` is set first (the jar fails with an initializer error under 21).
- Q-3. Decided, not a blocker: not decidable locally (no Mandrel image is built on a branch). Assumption, backed by DEC-5: picocli reads `name` from the annotation, so the native runner prints what the jar prints. It is proved only by `HelpIT` in the Native job of CI after the push; the run's report says "unproved locally". No `reflect-config.json` line is planned.

## Verification (what makes the run done)

1. Gate 1 of P1: with the application built, the first line of `--help` and of `query graph --help` starts with `Usage: archicode`.
2. Gate 2: `grep -c setCommandName` of `CommandReferenceTest.java` prints 0; `./mvnw test -Dtest=CommandReferenceTest` exits 0; `git diff` of `src/doc/README.adoc` changes only the sentence of `[[command-reference]]`.
3. Gate 3: `HelpIT` holds `Usage: archicode`, and `./mvnw verify -DskipITs=false` exits 0.
4. `./mvnw test-compile pmd:check` and `npm run format:check` exit 0; `npm run test:unit` exits 0.
5. `git status --short` shows only the files of T6.
6. Not proved by this run and said so in the report: the native runner (Q-3).

## Task results

Stage 10, one agent inline (the run is `single-document`; every task was small and verified by the same agent against the real output, JDK 25).

- T1 done. `HelpIT` written; `./mvnw -o verify -DskipITs=false -Dit.test=HelpIT` on the starting repository failed 3 of 3, each with `Usage: <main class>` in the output (Q-1 re-read on a rebuilt jar: `views generate --bogus` exits 2, the message then the usage, on standard error). The usage-error case asserts exit code 2, an empty standard output, `Unknown option: '--bogus'` as the first line of standard error and `Usage: archicode views generate` as the second.
- T2 done. `name = "archicode"` on the `@Command` of `ArchiCode.java`; `HelpIT` 3 of 3 pass on the packaged jar; the rebuilt jar prints `Usage: archicode [-hV] [-w=<workspace file>] [COMMAND]` for `--help` and `Usage: archicode query graph ...` for `query graph --help` (gate 1).
- T3 done. `setCommandName` removed from `CommandReferenceTest.commands()` (count 0); the literal prefix `"archicode"` of `walk` stays; `./mvnw test -Dtest=CommandReferenceTest` passes without `ARCHICODE_MANUAL_REGENERATE` (4 tests), so the generated block is unchanged (gate 2, DEC-4).
- T4 done. `git diff src/doc/README.adoc` is the one sentence of `[[command-reference]]`, now "Each listing below is the usage of one command, in the text the program prints for `--help`."; the listings are unchanged.
- T5 done. `./mvnw test-compile pmd:check` exit 0; `npm run format:check` exit 0; `npm run test:unit` exit 0 (3510 tests, 1 skipped, 0 failed; the tree held run 0223's edits at that moment); `./mvnw -o verify -DskipITs=false` BUILD SUCCESS (1784 unit tests, 49 integration tests, 0 failures; the first attempt hit the 10-minute limit of the tool, not a failure, and was rerun in the background). `scripts/byte-identity.sh` not run, by DEC settled 4.
- T6 done up to the commit, which this stage does not make. Files of the run: `src/main/java/io/morin/archicode/cli/ArchiCode.java`, `src/test/java/io/morin/archicode/doc/CommandReferenceTest.java`, `src/test/java/io/morin/archicode/it/HelpIT.java` (new), `src/doc/README.adoc`, and this run folder. Files outside likely_paths: none. For the commit message: `scripts/byte-identity.sh` runs no `--help`; the usage of the 18 commands and of a usage error changes in its first word and the indentation of the continuation lines of each synopsis; the native runner is proved only by `HelpIT` in the Native job of CI (Q-3, unproved locally).

## Stage 11 verification (2026-11-05)

Files outside likely_paths: none

Checks run again by the Stage 11 agent on the tree as it stood (JDK 25), not trusted from Stage 10:

- `./mvnw -o verify -DskipITs=false`: BUILD SUCCESS; 1784 unit tests (2 skipped, as before), 49 integration tests, 0 failures; `HelpIT` 3 of 3 on the packaged jar. `./mvnw -o test-compile pmd:check` exit 0.
- `npm run format:check` exit 0; `npm run lint` exit 0; `npm run test:unit` 3515 tests, 3514 pass, 1 skipped, 0 fail (the tree includes run 0223's edits).
- Gate 1, read on the rebuilt jar: `--help` starts `Usage: archicode [-hV] [-w=<workspace file>] [COMMAND]`; `query graph --help` starts `Usage: archicode query graph`. Gate 2: `grep -c setCommandName` prints 0; the diff of `src/doc/README.adoc` is the one sentence of `[[command-reference]]`; `CommandReferenceTest` passes inside `verify` without `ARCHICODE_MANUAL_REGENERATE`, so the generated block is unchanged. Gate 3: `HelpIT` holds `Usage: archicode` and `verify` exits 0.
- Diff review of this run's four files (`ArchiCode.java` +1 line, `CommandReferenceTest.java` -1 line, `README.adoc` one sentence, `HelpIT.java` new): no debug leftover, no scope change. `git status` shows no other file of this run; `jacoco-quarkus.exec` is a build artefact (F-5) and the files of run 0223 belong to it.
- No `CLAUDE.md` was changed by this run. No `main class>` string remains outside `docs/wav`.
- Not applicable here: `docs/bkg/` and `tooling/docs/check-backlog.py` do not exist in this repository, so the expiry sweep and the backlog check have nothing to run on; deferred items go to GitHub issues.
- Canonical obligations: single-document profile, the Canonical impact answer above is the discharge (no `docs/architecture` change, no `CI-` items, no analysis fulfilled).
- Not proved: the native runner, only by `HelpIT` in the Native job of CI after the push (Q-3).

## Findings

- F-1 (C-DOC, S2, fixed). Issue #201 says the change reaches "the 17 commands"; the manual's block holds 18 listings (the command `query impact` of wave 031 is in it). The run says 18 where it states a count (T6, DEC-2), and the commit says 18.
- F-2 (C-DOC, S2, fixed). Issue #201 and the wave's non-goal say "no other message" changes. The usage that picocli prints after a usage error (read: `views generate --bogus`) carries the same first word, so a message of the program does change, in its usage lines, never in its text or exit code. The run states it (Purpose, DEC-2, T6) and DEC-2 gives the case a test, so the "no other message" of the wave reads as "no sentence of the program other than the name in its usage".
- F-3 (C-UNCHECKED, S1, left). The jar read on 2026-11-05 is the one in `target/` at that date and may be older than `main`; the placeholder behaviour is a property of the source (`ArchiCode.java` has no `name`), so T1 rebuilds before it reads.
- F-4 (Stage 7 consistency scan, C-DOC, S1, fixed). Single-document profile, so the requirements are the Purpose, the settled decisions and the Verification list, and the design is the DEC items and the tasks. Scan against the wave's gates 1 to 3 of P1 and against the code: every settled decision and every gate has a task (decision 1 and gate 1: T2; decision 2 and gate 2: T3, T4; decision 3 and gate 3: T1, T2, T5; decision 4: T6; decision 5: out of scope and T6), no assumption contradicts a requirement (Q-3 is an assumption and is stated as unproved in DEC-5, Verification 6 and the report), and Q-1 to Q-3 stay visible with their resolution. Code facts re-read: `ArchiCode.java` has no `name`, `CommandReferenceTest.java` holds one `setCommandName` (line 240), the sentence of `[[command-reference]]` is at line 3046, Failsafe `skipITs` defaults to true (pom line 49). Two gaps were closed in the text: DEC-2 now says the literal `Usage: archicode` must be in the class (gate 3 greps for it), and T3 now says the literal prefix of `walk` stays as the test's independent expectation of the name. No product decision is needed, no blocker.
- F-5 (C-REPO, S1, left for the commit step). `jacoco-quarkus.exec` at the repository root is tracked (since the commit that split `CLAUDE.md` by area) and a Maven build rewrites it, so `git status` shows it modified after T1 to T5. It is a build artefact and not a file of this run: the commit of the run leaves it out (T6 lists the files to stage).
