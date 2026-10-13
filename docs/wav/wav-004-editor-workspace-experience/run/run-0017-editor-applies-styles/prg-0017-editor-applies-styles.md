---
type: prg
status: completed
date: 2026-10-13
run: 0017
wave: 004
related:
  - docs/wav/wav-004-editor-workspace-experience/run/run-0017-editor-applies-styles/run-0017-editor-applies-styles.md
---

# Progress Log: run 0017, editor applies styles

## Log

- 2026-10-13: Run set up (profile `TDD+pln`: Stages 1-3 skipped). Read the wave plan, its progress log, the TDD and pln of run 0016, `Styles.java`, the PlantUML style renderers, the editor's diagram, tree and export code, the kernel contract and the user's own workspace (read only: three `by-tags` styles; values of `rendering-stereotypes` are `new`, `changed`, `external`, `external changed`).
- 2026-10-13: Stage 4 TDD drafted. The CSS colour-name table was generated in the built-in browser (141 names after folding `grey` into `gray`), not typed from memory.
- 2026-10-13: Stage 5 KDMLLC review of the TDD dispatched (standard tier).

- 2026-10-13: Stage 5 review returned: Acceptable (4 S2, 3 S1). Applied to the TDD; one finding (that the CLI ignores `shadowing`) was wrong and not applied: `StyleShapeRenderer` emits the skinparam. No PRD-side stage (profile `TDD+pln`); Stage 7 not applicable; Stage 9: the pln traces to real TDD ids (R/DEC/CTR/AC), `likely_files` exist, `blocking_gaps` empty.
- 2026-10-13: Stage 10: tasks 001-004 worked inline (one design, one file; deviation recorded in the pln), task 005 (tests) and 006 (manual, haiku) dispatched, each verified by this session (suites, mutation checks, the diff of the manual). Task 007: replica in the built-in browser, light and dark; found and fixed the invisible chevron.
- 2026-10-13: Stage 11: node 288/288, `./mvnw test` 107, `embed.sh --check` exit 0; run completed (see the Results of the pln).

## Findings

- The CLI's order of styles on a box with several stereotypes is undefined (`HashSet`); the editor's is documented and deterministic.
- `styles.atomic` / `styles.composite` and kind-named keys are not drawn by the editor (documented).

## Lessons Learnt

- Look at the colours in a real browser even on a replica: a unit test of the markup cannot see a light chevron on a pale fill.
- Do not let a test-writing agent run mutation checks on the file another agent or session is editing.
