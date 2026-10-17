---
type: prg
status: active
date: 2026-10-17
related:
  - docs/wav/wav-012-brightcart-fixture/wav-012-brightcart-fixture.md
wave: 012
---

# Progress Log: brightcart-fixture

## Log

- 2026-10-17: wave drafted from next steps 2 to 5 of `docs/fixtures/brightcart-spec.md` (the home, the generator, the tests the current tools allow, E1). Next step 6 (the layered engine, the fold, `migrate`) is left out on purpose: it waits for decisions that are not taken.
- 2026-10-17: wave started (`complete-wave`), plan status `in-progress`, on branch `feat/faithful-saves-and-stable-output` in the main worktree (the author asked for one branch and one pull request: the commits of this wave ride on #63, one commit per run). Runs execute one at a time (one working tree, one `target/`).
- 2026-10-17: batch 1 dispatched: W-1 `brightcart-generator` (run 0060), tier `standard`, `run-executor` at the default model, 1 run (the only one with its dependencies satisfied). Phase P2 (W-2, W-3, serialized, W-2 first) and P3 (W-4) follow.
- 2026-10-17: W-1 `brightcart-generator` (run 0060) returned `completed`; status file `completed` (single-document, no pln). Verified by the orchestrator on the tree: 150 files / 856 KB under `src/test/resources/brightcart` (`layered/`, `folders/`, `variants/` 17 descriptions, `expected/` 6 files, `generate.mjs`, `description.mjs`, `README.md`); with the files staged, a new run of the generator leaves no diff and exits 0 with "layered/ resolves to folders/ for the four plateaus"; the real `archicode diff` on a copy of `folders/` gives P1 (new 3, changed 5, removed 11; relationships 5/1/12), P2 (17/5/1, 7 moved, 2 split, 1 merged; relationships 17/1/6), P3 (21/12/5, 5 moved; relationships 18/1/3) and P5 (27/4/3, 2 split, 1 merged; relationships 25/0/7), as in the document; `./mvnw -o -q verify` exit 0 with `PLANTUML_JAR` set, `node --test` 914/914, `prettier --check` clean. Out-of-path files: none. Not re-run by the orchestrator: P6 and the changes table of `expected/changes.json` against `diff -f json` (from the run's report), the tamper test of the resolver, the three facets on the four plateaus.
- 2026-10-17: **gate P1 verified, with one criterion amended.** Criterion 3 ("`views generate --plateau <id>` without an error for each of the four plateaus, no comparison view asked") cannot hold: a plateau with a `baseline` key always draws its comparison, and the plan itself requires the key to be explicit (E2), so `inhouse` and `marketplace` write their views and exit 1 on E1 (`dangling application reference: shop.cache`, `dangling reference: shop.web`); `baseline` and `saas` exit 0. That is a defect of the plan's wording, not of the run; the criterion was edited in the plan to say what holds now and what W-3 fixes (the ripple: W-3's gate criterion already asks for the comparison views to succeed). Other criteria: (1) regeneration, (2) resolver and sizes 50/42/66/82, (4) counts, (5) `variants/` V1-V14 and M1-M3 and `expected/` with P4 marked model-only (P6 is marked `archicode diff`, since the tool prints it; the run's note says the real change is P4), (6) the three commands, all checked as above. Canonical discharge: the run answers in its own body (single-document profile) with a reason; read in the run file.
- 2026-10-17: W-1 committed as one commit on the branch.

## Findings

- The document was corrected by the run where the tool or the files disagreed: the layered rendition has 49 files (45 manifests and 4 `plateau.yaml`), 1172 lines; the `no-externals` facet removes the `Payment provider` system but the technology nodes with that name stay; the model stops a plateau at its first error (V8). The tool prints the `replaces ... is not an element of the base plateau, ignored` warning 0 times for P1 to P3, 7 times for P5 and once for P6; the `diff` table has no `contains-changes` state (N13 needs the views or the kernel to be tested).

## Lessons Learnt
