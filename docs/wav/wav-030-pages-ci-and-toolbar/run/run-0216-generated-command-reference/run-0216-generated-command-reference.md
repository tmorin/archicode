---
type: run
run: 0216
status: completed
profile: TDD+pln
wave: 030
---

# Run 0216: generated-command-reference

Run of wave 030 (pages-ci-and-toolbar), manifest id W-6.

Review pass: dispatched (the TDD review of Stage 5 was done by an agent other than the Stage 4 drafter; each task was verified by a separate agent).

Files outside likely_paths: src/test/java/io/morin/archicode/doc/CommandReferenceTest.java, src/test/javascript/manual-howto.test.js, src/test/CLAUDE.md, src/main/java/io/morin/archicode/CLAUDE.md (the test, the node assertion and the two notes for later authors; the wave named only README.adoc).

## Decision

Q3 is settled by DEC-1: the command reference is a block generated into `src/doc/README.adoc` (section `[[command-reference]]`, `=== Every command and option`, last of `== Commands`) between two attribute-entry markers, by `CommandReferenceTest`, which also compares it with the live `CommandSpec`. Regenerate with `ARCHICODE_MANUAL_REGENERATE=1 ./mvnw test -Dtest=CommandReferenceTest`. One file, no second page.

## Requirements

- REQ-1 (generated or checked): met. 17 listings, one per command (root first, a group before its commands), the text of `--help` with `archicode` for `<main class>`. Q-1 holds: the saved `--help` of the 17 commands taken before the work equal the ones taken after (`diff` of the 17 files: no difference).
- REQ-2 (a test fails when manual and `--help` disagree): met. `CommandReferenceTest` has 4 tests; passes on the repository manual (4 of 4) and each mutation below fails with the message of the check it targets.
- REQ-3 (mutation checks on a copy, `./mvnw test` exits 0): met. On a copy via `ARCHICODE_MANUAL_PATH`: untouched copy passes; (a) one line deleted from the `plateau fold` listing fails check (a); (b) `views generate` listing changed fails (a); (c) `plateau fold` block deleted fails (a) "has no listing"; (d) the `init` bullet deleted fails (b) "list names ... the program has [... init]"; (e) `--properties` back in the listing fails (c) "line 2606 ... has no option `--properties`"; (f) `--nope` in a code span of `== Commands` fails (d); (g) the `END` marker deleted fails (a) "holds it 0 times". `./mvnw test`: 1720 tests, 0 failures, 0 errors, 2 skipped, BUILD SUCCESS (before the final README edits of task-006: file mtime 16:20, run finished 16:38, so on the final file).
- REQ-4 (no command changes): met. No file of `src/main` other than `src/main/java/io/morin/archicode/CLAUDE.md` (a note), none of `pom.xml`, `.github`, `scripts`, `src/site/index.html`, `src/doc/examples` in `git diff`; the `--help` outputs are identical before and after. The program still prints `<main class>`: DEF-1.
- REQ-5 (one file; every `archicode` line of a listing names a command and options the program has): met. Check (c) covers the listings; it found one stale option at the start, `archicode views generate --properties` (line 2606), now `--properties-content`, and the sentence that counted the commands no longer has a count.
- REQ-6 (ids, voice, warnings): met. Every id of `git show ff3bacd:src/doc/README.adoc` is still defined (compared again here: none missing of 93 extracted); `manual-skeleton`, `manual-voice`, `manual-howto` and `site` node tests 56 of 56; `./mvnw -o generate-resources` exits 0 and the count of warning lines is 8, as at the baseline (8).

## Verification

Run by task-006 on the files as they were, read here from its saved outputs: `npm run test:unit` 3483 pass, 0 fail, 1 skipped; `npm run format:check` and `npm run lint` exit 0; `./mvnw test-compile pmd:check` BUILD SUCCESS. Rerun by task-007: the diff of the 17 saved `--help` outputs against fresh ones (read from the saved files, no jar run), `./mvnw -o generate-resources` (exit 0, 8 against 8), the id comparison, `git diff --stat` of the guarded paths, the reader pass below, and the issue.

Reader pass (the built manual `target/generated-docs/index.html`, served on 127.0.0.1 for the check and stopped, opened at `#command-reference` in the browser pane): the section renders as `Every command and option` (h3) under Commands; 17 listings; the first is `Usage: archicode [-hV] [-w=<workspace file>] [COMMAND]`, the last `Usage: archicode init [-h] [-w=<workspace file>] [<folder>]`; the one link to it, in the list of commands at the top of Commands, goes to `#command-reference`; the top-level parts are six (Start here, Tutorials, How-to guides, Reference, Concepts, Upgrading). Seen on that pass: the intro sentence does not link the per-command sections (IF-1 hoped for it); not a failure of a requirement.

Not run: the mutation checks (run by task-006, read from `run-m*.log`, not rerun), the full `./mvnw test`, `npm run test:unit`, lint and PMD (read from the task-006 logs, not rerun here), the commands on the jar after the work (the saved outputs of task-006 were compared, the jar itself was not run again), the native image, and CI (nothing in `pom.xml` or the workflows changed, so the rule that a pom change is proved only on `main` does not apply; PR CI not run). Nothing is committed: the commit is left to the operator.

## Follow-up

DEF-1 is filed as https://github.com/tmorin/archicode/issues/201 ("Every --help prints 'Usage: <main class>' because the top command has no name"): set `name = "archicode"` on the `@Command` of `ArchiCode.java`; `scripts/byte-identity.sh` runs no `--help` and will not flag it. DEF-2 (prose defaults not compared) and DEF-3 (guide against block) stay as in the TDD, no issue.
