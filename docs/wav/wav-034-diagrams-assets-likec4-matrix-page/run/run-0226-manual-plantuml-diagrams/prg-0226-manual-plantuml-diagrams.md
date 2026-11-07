---
type: prg
status: completed
run: 0226
wave: 034
---

# Progress Log: Run 0226

## Log

- 2026-11-06: Stage 2 - the run file held only its frontmatter, so the body (problem, done-when, decisions D-1 to D-3, rejected, tasks, canonical impact none, open question Q-1, findings) was written from the wave plan and checked on three scratch Maven runs (JDK 25.0.4: the dependency draws 18 PNG; a syntax error and a non-PlantUML block both give `Failed to generate image`), then reviewed with KDMLLC in the same leaf agent (not independent of the drafting, said in the run file); 7 findings, 5 of S2/S3 applied (one false claim about syntax errors removed, job names and the R-10 rule corrected, page-missing case and website PNG path added), 2 S1 kept; Q-1 (headless PlantUML on the ubuntu runner) stays open as a note, not a blocker; status set to designing.
- 2026-11-06: Stage 3 - single-document run, one open question: Q-1 (PlantUML headless on the ubuntu runner) re-examined from the repository (graphviz already installed in job `Java`), not resolvable without a CI run; kept as a stated assumption in the run file, failing loudly through the D-2 step; no blocker.
- 2026-11-06: Stage 6 - no TDD (single-document); the run file's only open question Q-1 (PlantUML headless on the ubuntu runner) stays an assumption guarded by the D-2 step, provable only by the CI run; not a blocker.
- 2026-11-06: Stage 7 - single-document run, so there is no PRD/TDD pair to check; the C scan was run on the run file against itself and the repository instead: done-when 1 to 5 match decisions D-1 to D-3 and tasks 1 to 4 (each done-when has a task, each decision a done-when), 18 `[plantuml` blocks in `src/doc/README.adoc` and the line numbers cited (graphviz at line 79 of `ci-build.yaml`, step "Build artifacts" at line 92, `asciidoctorj-diagram` in `pom.xml`) check out, Q-1 is still visible as the one open question; no contradiction found, nothing changed in the run file; no blocker.
- 2026-11-06: Stage 10 - implemented inline (single-document, no pln): `asciidoctorj-diagram-plantuml` 1.2024.0 in `pom.xml`; step "Check the manual has its diagrams" in the job `Java` after "Build artifacts" (page exists, no `Failed to generate image`, images >= `[plantuml` blocks) with the job comment updated; `.github/CLAUDE.md` names it; verified on JDK 25: manual rebuild exit 0 with 18 PNG, 18 img, 0 error text; step proved exit 0 on the real page and exit 1 on error text, one image fewer and a missing page; PMD, format:check and test:unit (3519 pass) green. Q-1 (PlantUML on the ubuntu runner) stays open, provable only by the pull request's CI run; not a blocker.
- 2026-11-06: Stage 11 - verification re-run from scratch on JDK 25.0.4: manual rebuild exit 0 with 18 PNG, 18 img, 0 error text; the step exit 0 on the real page and exit 1 on error text and on a missing page; PMD and format:check exit 0; test:unit 3519 pass; diff limited to likely_paths; canonical obligations none; check_run.py --as-completed OK; run and prg set to completed. Q-1 (PlantUML on the ubuntu runner) stays open as a note, not a blocker; unproved until the pull request's CI run.

## Findings

## Lessons Learnt

- Nothing yet.
