---
type: prg
status: completed
run: 0216
wave: 030
---

# Progress Log: Run 0216

## Log

- 2026-11-01: Stage 4 drafted `tdd-0216-generated-command-reference.md` (no PRD, traceability by REQ-1 to REQ-6 from the W-6 row): Q3 settled by DEC-1 as a block generated into `src/doc/README.adoc` between two markers by a new `@QuarkusTest` `CommandReferenceTest`, which also compares it and checks the hand-written command lines and options against the same `CommandSpec`; found one stale listing (`--properties`, line 2606) and `<main class>` in every usage (DEF-1, no program change); Q-1 (usage text equal to the jar's `--help`) left open for Stage 6, not a blocker; run status set to `designing`.
- 2026-11-01: Stage 5 KDML review of the TDD by a leaf agent (independent of the drafter): overall Acceptable (KISS 4, DRY 4, MECE 4, LEAN 4, LUCID 4, C 4), 5 findings F-1 to F-5 (none S3, three S2) listed under Findings for the main agent to apply; the TDD body is untouched, only its review line is set to dispatched; no blocker, Q-1 still open for Stage 6.
- 2026-11-01: Stage 6 resolved the only open question of the TDD: Q-1 (usage text of a `CommandLine` equal to `--help` of the jar) is yes, checked by a throwaway program on the packaged jar over the 17 commands, byte-identical including `<main class>`; the TDD's Open Questions section now says none open and records the result; no blocker.
- 2026-11-01: Stage 8 drafted `pln-0216-generated-command-reference.md` (7 sequential tasks: task-001 applies Stage 5 findings F-1 to F-5 to the TDD, task-002 baseline, task-003 `CommandReferenceTest` red, task-004 section, markers, regenerated block and the `--properties` fix, task-005 node assertion and notes, task-006 mutation checks and suites, task-007 record and the DEF-1 issue; one gate, gate-001 after task-007); the generator check exits 0; run status set to planned; no blocker.
- 2026-11-01: Stage 9 C scan of the pln against the TDD and the repository by a leaf agent: every source_requirements ID exists in the TDD, the repository facts hold (the jar is newer than src/main/java, gh is authenticated, `[[command-reference]]` is free, 91 ids at ff3bacd, 49 `archicode` lines, line 2606 stale, `CommandReferenceTest` absent), `blocking_gaps` is empty so nothing is carried to Stage 10; four edits to the pln: gap-008 (CTR-2 (b) would fail on the `query` bullet, which has no `<<id>>`: task-001 amends (b) to accept a bullet without a link), the vacuous grep of task-001 replaced by `grep -n "insert the section"` (two places), and the node test variable named `MANUAL_HOWTO_PATH` in task-005 (two places); generator check exits 0; no blocker.

- 2026-11-01: Stage 11 verification: reran CommandReferenceTest (pass), node manual and site tests 56 of 56, format:check exit 0; the rest (full mvn test 1720 pass, npm test:unit 3483 pass, lint, PMD, mutation checks, generate-resources 8 of 8 warnings) read from the task-006 and task-007 records; all three pln criteria hold, pln status done, run completed; DEF-1 is issue 201; tooling/docs/check-backlog.py does not exist in this repository, so the backlog check was not run.

## Findings

Stage 5, KDML review of the TDD (referent: the repository files the TDD cites: `ArchiCode.java`, `DiffCommand.java`, `Guide.java`, `ArchitectureGraph.java`, `src/doc/README.adoc` lines 2415 to 2970, `scripts/changes.mjs`, `manual-howto.test.js`, `site.test.js`, the wave manifest P2 criterion 4). Verified true: the command tree (17 usage messages), `== Commands` at line 2419 and `== Appendix` at 2968, 49 `^archicode ` lines with `--properties` at 2606, `toclevels: 1`, R-12 of `changes.mjs`, `ff3bacd` and the 91-id fixture, `site.test.js` id rule, the `GuideCorpusTest` pattern, `Guide.walk` skipping hidden commands.

- F-1 (C-DOC, S2). Current State says the hand-written list holds "the description of the program ... identical to the `--help` text today" and CTR-2 (b) compares the bullet with "the description of the command". `DiffCommand` has five description paragraphs (and `init` and `guide` use a description array too); the bullet is the first one only, so a test that compares the whole description fails on the first run. Fix: define (b) as the first element of `usageMessage().description()`, whitespace normalised, compared with the bullet text up to its last ` (see`; correct the Current State sentence.
- F-2 (KISS, S2). FLOW-1 step 5 inserts the section before `== Appendix` when the markers are absent, but CTR-1 makes the introduction hand-written and the branch list says absent markers are a failure: two rules, and the test would own a prose paragraph. Fix: delete the insertion; the implementation adds the section, its id and the two markers by hand once, and the regenerate mode fails with the same marker message as the compare mode.
- F-3 (KISS, S2). DEC-4, RISK-4 and the `finally` rename the root spec of the shared injected `CommandLine`. The repository already builds a private one in tests (`new CommandLine(ArchiCode.class, factory)` with an injected `CommandLine.IFactory`, `ArchitectureGraph.run`, `PlateauModelTest`), so the test can build its own command line, call `setCommandName("archicode")` on it and leave the shared spec alone. That removes RISK-4, the readback assertion and the `finally`; DEC-6's alternative ("needs the Arc factory") is answered by the injected factory. ASM-1 and Q-1 are then proved on that instance.
- F-4 (MECE-MISSING, S1). CTR-2 (d) covers code spans of `== Commands` only; an option in a code span of a tutorial or how-to page is unchecked, and `manual-howto.test.js` `documented(option)` reads the whole Commands part, which will now hold every real option through the block, so that check can no longer find an option missing from the prose. Fix: say both in the TDD (Non-Goals or IMP-3): the Java test owns "the option exists", the node test owns the shape of the two how-to pages; code spans outside Commands are accepted as unchecked (or widen (d) to the whole manual with `NOT_OPTIONS` if the scan stays clean).
- F-5 (LUCID, S1). The Summary said the review was pending, and Q-1 sits in Open Questions although Observability 2 and the fresh command line of F-3 make it a one-run check; keep it for Stage 6 but name the single comparison that settles it.

## Lessons Learnt

- Nothing yet.
