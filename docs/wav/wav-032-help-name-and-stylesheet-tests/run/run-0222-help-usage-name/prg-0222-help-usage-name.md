---
type: prg
status: completed
run: 0222
wave: 032
---

# Progress Log: Run 0222

## Log

- 2026-11-05: Stage 2 KDMLLC review of the run document (single-document, so the reviewed text is `run-0222-help-usage-name.md`; the review ran in a leaf agent, apart from any drafter). The text was the Stage 0 stub, so the review found LUCID/MECE-MISSING at S3 (no purpose, decisions, done criteria, verification, canonical-impact answer or open questions) and the rewrite plan was applied by writing the whole body from the wave plan, issue #201 and the code: referent, settled decisions, DEC-1 to DEC-5, tasks T1 to T6, canonical impact, verification, Q-1 to Q-3 (all bounded lookups for Stage 3, none a blocker). C scan against the code: F-1 (issue says 17 commands, the manual's block has 18, fixed), F-2 (a usage error also prints the usage with the placeholder, so one more place changes, given a test case in DEC-2, fixed), F-3 (the jar in target/ may predate main, left, T1 rebuilds). Run status set to `designing`. No blocker.

- 2026-11-05: Stage 3 resolved Q-1, Q-2 and Q-3 of the run document inline from the repository (jar run under JDK 25, pom.xml Failsafe configuration); Q-3 stays an assumption proved only by the Native job of CI after the push, not a blocker. No open question left as a blocker.
- 2026-11-05: Stage 6 single-document profile: the run document is also the design, and its Open questions section (Q-1, Q-2, Q-3) was already resolved at Stage 3; re-read, nothing open or contradicted, no new question. Q-3 stays an assumption proved only by the Native job of CI after the push. No blocker.
- 2026-11-05: Stage 7 PRD/TDD consistency check (single-document, done inline by a leaf agent; the Stage 2 review was a different agent from the one that scanned): every settled decision and gate 1 to 3 of P1 maps to a task, no assumption contradicts a requirement, Q-1 to Q-3 are still visible and resolved (Q-3 an assumption proved only by the Native job). Two small gaps fixed in the run document (F-4): the literal `Usage: archicode` must be in HelpIT for gate 3, and the literal prefix of `walk` stays in CommandReferenceTest as the test's own expectation. No product decision needed, no blocker.
- 2026-11-05: Stage 10 implemented T1 to T6 inline in the run document (single-document, no pln): `HelpIT` added and seen failing 3 of 3 with `Usage: <main class>`, `name = "archicode"` on `ArchiCode.java`, `setCommandName` out of `CommandReferenceTest` (generated block unchanged), the `[[command-reference]]` sentence reworded; `HelpIT` 3 of 3, `CommandReferenceTest`, `pmd:check`, `format:check`, `test:unit` and `./mvnw verify -DskipITs=false` all pass; files outside likely_paths: none; run status `in-progress`; native runner unproved locally (Q-3, Native job of CI). No blocker.
- 2026-11-05: Stage 11 verification: reran `./mvnw -o verify -DskipITs=false` (BUILD SUCCESS, 1784 unit and 49 integration tests, `HelpIT` 3 of 3), `pmd:check`, `format:check`, `lint` and `test:unit` (3515 tests, 0 fail), read gates 1 to 3 on the rebuilt jar and in the diff, reviewed the four files of the run (no leftover); no CLAUDE.md changed; `docs/bkg` does not exist here so no sweep; `check_run.py --as-completed` run, run and prg set to `completed`; native runner unproved locally (Q-3, Native job of CI after the push). No blocker.

## Findings

- Q-1 resolved: usage error on the jar exits 2, message then `Usage: <main class> ...` on stderr. Q-2 resolved: Failsafe takes `-Dit.test=HelpIT` with `-DskipITs=false`, JDK 25 needed. Q-3 decided as an assumption proved only by the Native job of CI.

## Lessons Learnt

- Nothing yet.
