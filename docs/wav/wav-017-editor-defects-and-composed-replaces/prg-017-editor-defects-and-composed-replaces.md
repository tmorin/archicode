---
type: prg
status: active
date: 2026-10-20
related:
  - docs/wav/wav-017-editor-defects-and-composed-replaces/wav-017-editor-defects-and-composed-replaces.md
wave: 017
---

# Progress Log: editor-defects-and-composed-replaces

## Log

- 2026-10-20: wave 017 written (`write-wave`) after the release 0.15.0, from the review of the twenty open issues and the author's answer ("Écrit la vague et complète la", taking the recommendations of the review). It plans 9 runs in three phases, all on the `standard` tier (no `hard_judgment`: nothing deletes data, touches credentials or waits for an open decision), all serialized (one run at a time, no `concurrent-safe` verdict). Sources: #82, #89, #94, #119, #120, #121, #122, #123. Left open on purpose: #124 (changes the output of three viewpoints, nobody asked), #112, #109, #114, #78, #103, #125, #24, #25, #65, #29, #128. The wave is completed right after it is written, on the branch `feat/wave-017-editor-defects-and-composed-replaces`, one commit per run, one pull request.
- 2026-10-20: wave 017 starts (`complete-wave`, directly after the plan was written, as the author asked). All 9 runs are `standard` (`run-management:run-executor`), serialized, concurrency 1, in the order W-1 to W-9. Dispatching W-1 (run 0119, `view-element-removed-by-a-facet`; no dependency), `standard`, concurrency 1.
- 2026-10-20: W-1 (run 0119, `view-element-removed-by-a-facet`, `standard`) is `completed`, commit 3ffe292 (the orchestration files of the wave are amended into it), verified from disk: status file `completed`, working tree clean, no file outside `likely_paths`. The executor reports `./mvnw -o verify -DskipITs=false` 902 unit + 21 integration tests, 0 failures, cargo 213, `embed.sh --check` ok, node 1903 pass, prettier clean; byte-identity of `views generate`, `query graph` and `diff` on 20 workspaces and of 9 `views generate -i` runs against the jar of `archicode-0.15.0`; the reproduction of #121 gives the 0.15.0 bare error with two folders written and the new line with none. Decisions: the error is ``the view `v` cannot be drawn: it names `x`, which the facet `f` removes``, exit 1, the view is not skipped; the check runs only with `-i`, in the plateau's facets and those of its comparison, so facets and comparison are built before the first view is drawn (a mistake in the base plateau now fails before the plateau's views are written; the order of warnings can differ). Not verified: the Native job (a class was avoided so that `reflect-config.json` is unchanged), a removal only in the union of a comparison on a shipped fixture. Findings for W-9: README line 832 and the bullet at 1486 teach the bare `dangling reference`; the `[[plateau-limits]]` list of CLAUDE.md still names #121.

## Findings

## Lessons Learnt
