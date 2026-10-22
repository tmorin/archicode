---
type: prg
status: active
date: 2026-10-22
related:
  - docs/wav/wav-020-reading-a-story-and-name-fixes/wav-020-reading-a-story-and-name-fixes.md
wave: 020
---

# Progress Log: reading-a-story-and-name-fixes

## Log

- 2026-10-22: wave 020 written (`write-wave`) after the release 0.18.0 (tag `archicode-0.18.0`), from the follow-up issues #145, #146 and #147 filed by wave 019 and from #142 (a calmer way to read a story).
- 2026-10-22: wave 020 starts (`complete-wave`, on the author's go). Branch `feat/wave-020-reading-a-story-and-name-fixes` from `main` (0835543), main worktree, one PR for the wave, one commit per run. The byte-identity base is a jar of the tag `archicode-0.18.0` built from `git archive` in the scratchpad (`base-0.18.0-src`). Verification set per run and gate: `./mvnw -o verify -DskipITs=false '-Dtest=!CustomRenderingTest' -Dsurefire.failIfNoSpecifiedTests=false`, cargo, `embed.sh --check`, node, prettier. All runs are serialized (T8), in the order W-1 to W-6; concurrency 1; all six `standard` (`run-management:run-executor`, default model, effort medium).
- 2026-10-22: dispatching W-1 (run 0146, `facet-name-is-one-folder`; no dependency, first of the serialized runs), `standard`, concurrency 1.
- 2026-10-22: W-1 (run 0146, `standard`) verified from disk: status `completed`, tree otherwise as the run reported. Outside `likely_paths`: `reflect-config.json` (the `FacetNames` entry, required by `NativeReflectionConfigTest`; W-2 needs it too if it adds a class) and the run file. The gate set was rerun by the orchestrator on the final tree (`gate-W1.log`): 1327 unit + 27 integration tests, cargo 240, `embed.sh --check` 0, node 2467 of 2467, prettier clean. The run compared 20 shipped workspaces (`plateau list`, `views generate`, `stories generate`, `query graph`, `diff`, per plateau) against the jar of `archicode-0.18.0`: no difference over 15551 files. The editor also refuses the names in *Add facet* (not asked by the plan). Windows reserved device names (`CON`, `NUL`) are not refused (not in T2). `plateau list` and `editor serve` load no facets, so the manual says "every command that loads the workspace". Not verified: a real browser, the Native job. Manual passages for W-6: the facets chapter (the rule and its sentence, `Add facet`), the block "what changes for a reader who knows 0.18.0" (a facet such as `a/b` loaded in 0.18.0 and does not now).

## Findings

## Lessons Learnt

- Carried from wave 019: brief every run with the byte-identity base in hand (a jar of the tag); a wall-clock ratio is not a gate until it has been measured on the CI runner; a manual test that reads `.adoc` makes a docs-only run need the whole verification set after its last edit.
