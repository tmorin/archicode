---
type: prg
status: active
date: 2026-10-22
related:
  - docs/wav/wav-019-followups-of-wave-018/wav-019-followups-of-wave-018.md
wave: 019
---

# Progress Log: followups-of-wave-018

## Log

- 2026-10-21: wave 019 written (`write-wave`) after the release 0.17.0 (tag `archicode-0.17.0`), from the follow-up issues #136 to #140 filed by wave 018 and from #134 (LikeC4 importer).
- 2026-10-22: the author took the LikeC4 importer out of the wave, then set its aim: close as many issues as possible without a new feature. The plan was rewritten: #78 and #125 were added (two older fixes), #140, #139 and #133 (the rename of `workspace.yaml` to `.archicode.yaml`) were kept by the author. It plans 9 runs in three phases (W-1 to W-7 in P0, the rename W-8 alone in P1, the manual W-9 in P2); 7 are `standard` and 2 are `hard_judgment` (W-3, the guard of the delete of a plateau; W-6, the line-preserving save). Not started: it waits for the author's review.
- 2026-10-22: the author confirmed T5 (a relationship towards the inside of a deployed application is a dependency of the node that hosts it). Recommendations on #138 (keep the refusal, fold the case into #65) and #78 (the editor reads what the command line reads: anchor or tag on a key, explicit `!!int`; `!!binary` and the merge key stay refused and are pinned) were given, challenged against the jar (the command line keeps `!!binary` as text and reads `!!int 1:30` as the text `1:30`, which corrected two claims) and then decided by the author on 2026-10-22: #138 is closed as not planned after W-3 (no offer; the manual tells how to fold by hand; the fold operation is a comment on #65); W-1 also reads the tagged scalars of #78 like the command line; an anchor or a tag on a key stays refused by the editor (documented as not planned); the merge key stays refused by both.
- 2026-10-22: wave 019 starts (`complete-wave`, on the author's go). Branch `feat/wave-019-followups-of-wave-018` from `main` (554a6a6, the tag `archicode-0.17.0` plus the next snapshot), main worktree, one PR for the wave, one commit per run. The byte-identity base is a jar of the tag `archicode-0.17.0` built from `git archive` in the scratchpad (`base-0.17.0`). Verification set per run and gate: `./mvnw -o verify -DskipITs=false '-Dtest=!CustomRenderingTest' -Dsurefire.failIfNoSpecifiedTests=false`, cargo, `embed.sh --check`, node, prettier. All runs are serialized (every pair shares `CLAUDE.md`), in the order W-1 to W-9; concurrency 1. Tiers: W-3 and W-6 `hard_judgment` (`run-executor`, `model: opus`, `effort: high`), the others `standard` (default model, `effort: medium`).
- 2026-10-22: dispatching W-1 (run 0137, `yaml-numbers-left-over`; no dependency, first of the serialized P0 runs), `standard` (`run-management:run-executor`, default model, effort medium), concurrency 1.
- 2026-10-22: W-1 (run 0137) verified from disk: status `completed`, commit f438219 (`feat: the editor reads a refused scalar, a tagged number and a style number as the command line does`), tree clean; only `standalone.html` changed under `src/main` (no kernel, wasm or Java change), outside `likely_paths`: the run file and `StyleNumbersTest.java` (inside the Java test folder). The gate set was rerun by the orchestrator on the final tree (`gate-W1.log`): 1249 unit + 26 integration tests, cargo 230, `embed.sh --check` 0, node 2355 of 2355, prettier clean. `yaml-number-cases.json` has 279 cases (Y125 to Y279 new, expectations from the 0.17.0 jar). Two differences stay pinned (line/column of a mistake; `5.0` as a patch `value`), plus `!!binary` in a typed field and Java-only tag edge cases. `1.5` in a style number was also fixed (not listed by #136). Manual passages for W-9: `src/doc/README.adoc` lines ~1487, 1520, 1521. No new issue to file.

## Findings

## Lessons Learnt
