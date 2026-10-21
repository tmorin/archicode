---
type: prg
status: active
date: 2026-10-21
related:
  - docs/wav/wav-018-groups-shims-and-plateau-gaps/wav-018-groups-shims-and-plateau-gaps.md
wave: 018
---

# Progress Log: groups-shims-and-plateau-gaps

## Log

- 2026-10-21: wave 018 written (`write-wave`) after the release 0.16.0, from the author's answers to the decision page on the open issues. It plans 9 runs in four phases; 8 are `standard` and 1 is `hard_judgment` (W-5, it deletes the files of a plateau); all serialized. Sources: #132, #129, #130, #112, #109, #124, #103, #114 (removed with the group), #128 (removed with the shims). Closed by the author on the same day: #25, #29. Left open on purpose: #65 (another wave), #24, #78, #125.
- 2026-10-21: wave 018 starts (`complete-wave`, directly after the plan was written, on the author's go). Branch `feat/wave-018-groups-shims-and-plateau-gaps` from `main` (9b7f549), main worktree, one commit per run, one pull request. Batch 1 (P0): W-1 (run 0128, `remove-the-group-kind`) and W-2 (`remove-the-compatibility-shims`) have no dependency; their `likely_paths` intersect (the kernel, the wasm, `standalone.html`, `negative-cases.json`, `CLAUDE.md`), so they are serialized, W-1 first. Dispatching W-1 (run 0128), `standard` (`run-management:run-executor`, default model, effort medium), concurrency 1. Byte-identity base for the wave (T1): a jar of the tag `archicode-0.16.0` built from `git archive` in the session scratchpad.
- 2026-10-21: W-1 (run 0128, `remove-the-group-kind`, `standard`) is `completed`, commit cc3eb76 before the orchestration files were amended into it, verified from disk: status file `completed`, working tree clean apart from the wave documents, one commit `feat!: remove the group kind from both tools`. `git grep` for `kind: group`, `ContainerGroup`, `SolutionGroup`, `SystemGroup`, `ApplicationGroup` finds only the cases and sentences that pin the error, the manual (W-9's) and `CLAUDE.md`. The executor reports `./mvnw -o verify -DskipITs=false` 954 unit (2 skipped, as before) + 21 integration tests, 0 failures, cargo 228, `embed.sh --check` ok, node 2025 pass (2040 before the group-only tests went), prettier clean; `views generate`, `query graph` and `diff` on the 20 workspaces with a `workspace.yaml` (and `views generate` + `diff` for each plateau of the layered Brightcart) identical to the jar of `archicode-0.16.0`. Decisions: the error is the unknown-kind sentence with a hint (``unknown kind `group`, a group is no kind any more: write its children in the `elements` of its parent``; the same hint for `archicode.morin.io/group` and the three `*-group` header kinds), one constant in Java (`GROUP_IS_GONE`) and one in the page, shared cases N89 and N90 (N56 to N58 carry the hint); a reference through a group was a plain path segment, nothing is migrated; the kernel never knew groups (no Rust change, wasm unchanged); the only group in the repository was `shop.web.edge` of the kernel test workspace, now a container with a component (same references, 78 expected views regenerated, four hashes of `plateau-compare.test.js`); editor tests that used a group as an in-file parent were reworked. Outside `likely_paths`: `src/doc/README.adoc` (4 lines: quoted error lines, left as the executor made them; W-9 does the rest), `src/test/resources/viewpoint-kernel/**` (README, comments, views). Not verified: the built-in browser, the Native job. Findings for W-9: README lines 170, 173, 177, 1462, 1493, 1780, 1898, 1900, 1917 and the `[[plateau-limits]]` entry for #114 teach groups; the Breaking block needs the two sentences. For W-2: the kernel workspace still prints the deprecated-facet warnings (`anyof`, `noneof`) when its views are regenerated.
- 2026-10-21: dispatching W-2 (run 0129, `remove-the-compatibility-shims`; no dependency, serialized after W-1: same files), `standard` (`run-management:run-executor`, default model, effort medium), concurrency 1.

## Findings

## Lessons Learnt
