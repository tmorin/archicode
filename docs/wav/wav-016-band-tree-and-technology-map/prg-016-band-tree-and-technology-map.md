---
type: prg
status: active
date: 2026-10-20
related:
  - docs/wav/wav-016-band-tree-and-technology-map/wav-016-band-tree-and-technology-map.md
wave: 016
---

# Progress Log: band-tree-and-technology-map

## Log

- 2026-10-20: wave 016 written (`write-wave`) after the merge of wave 015 (PR 63) and the release 0.14.0, from the answers of the author to the review of the open issues. It plans 12 runs in three phases, all on the `standard` tier (no `hard_judgment`: nothing deletes data, touches credentials or waits for an open decision), all serialized (one run at a time, no `concurrent-safe` verdict). Sources: #26, #72, #105, #106, #107, #108, #110, #111, #113, #115, #116, #117, #118 (#116 to #119 filed by the review). The decisions of the author are D1 to D6 and those the plan takes are T1 to T8 in the plan. The author asked for the wave to be completed right after it is written, in a branch of its own (`feat/wave-016-band-tree-and-technology-map`) and one pull request.
- 2026-10-20: wave 016 starts (`complete-wave`, directly after the plan was written, as the author asked). All 12 runs are `standard` (`run-management:run-executor`), serialized, concurrency 1, in the order of the plan. Dispatching W-1 (run 0107, `plateau-on-story-or-view-is-silent`) next.
- 2026-10-20: dispatching W-1 (run 0107, `plateau-on-story-or-view-is-silent`; no dependency), `standard`, concurrency 1.
- 2026-10-20: W-1 (run 0107, `plateau-on-story-or-view-is-silent`, `standard`) is `completed`, commit cc6243e, verified from disk: status file `completed`, working tree clean, `git grep "ignoredPlateauWarning|ignoredPlateauSentence" -- src` finds nothing, `node --test` 1748 pass / 0 fail, prettier clean, canonical-impact answered with a reason (CLAUDE.md). The executor reports `./mvnw -o verify -DskipITs=false` 840 unit + 18 integration tests, 0 failures, and byte-identity (`views generate`, `query graph`, `diff`) on the 20 workspaces of the repository against the jar of `archicode-0.14.0`; the orchestrator re-runs `verify` at the P0 gate. Decisions: `plateau:` on a view or a story is accepted and means nothing, no message, no plateau made of it (even with an invalid id); the `warnings` component of `Parsed` is gone; cases M01, M84, M85, N79 say no warning, M87 added. Not verified: the editor in a browser, the Native job, cargo (kernel untouched). Outside `likely_paths`: `WorkspaceFactory.java` (one line). Finding for W-12: `src/doc/README.adoc` lines 290-293 (a quoted `warning:` line), 870, 1432, 1918 still teach the warning, and no test pins them.
- 2026-10-20: dispatching W-2 (run 0108, `both-tools-read-the-same-016`; no dependency, serialized after W-1: shared cases files), `standard`, concurrency 1.

## Findings

## Lessons Learnt
