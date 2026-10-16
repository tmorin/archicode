---
type: prg
status: active
date: 2026-10-16
related:
  - docs/wav/wav-011-faithful-saves-and-stable-output/wav-011-faithful-saves-and-stable-output.md
wave: 011
---

# Progress Log: faithful-saves-and-stable-output

## Log

- 2026-10-16: wave drafted from the rulings on the open issues (commented on each issue the same day).
- 2026-10-16: the wave is on branch `feat/faithful-saves-and-stable-output` in the main worktree (one PR for the wave, one commit per run, rebase-and-merge). Runs are executed one at a time even where the plan allows W-1 and W-2 together: they share one working tree, one `target/` and one commit per run. Order: W-1, W-2, W-3, then W-4 and W-5.
- 2026-10-16: batch 1a dispatched: W-1 `editor-faithful-saves` (run 0055), tier `standard`, `run-executor` at the default model, 1 run at a time.
- 2026-10-16: W-1 `editor-faithful-saves` (run 0055) returned `completed`; status file `completed` (single-document run, no pln). Verified by the orchestrator on the tree: `node --test` 909/909, `embed.sh --check` ok, `prettier --check` clean. Reported by the run: `./mvnw -o -q verify` exit 0, `cargo test` 169, 19 new tests (14 fail on the previous `standalone.html`), six edits on 85 YAML files (507 of 510 results byte-identical to HEAD, the 3 others are #52 on one-key `workspace.yaml` files), differential fuzz without other differences, the real page looked at in light and dark. Out-of-path file: `src/doc/README.adoc` (one sentence). Serialized with the rest, so no collision to check; W-2 and W-3 will edit the same README after it. Issue filed: #57.
- 2026-10-16: W-1 committed as one commit on the wave branch.

## Findings

- #50's single-scalar case was already fixed before the wave (commit `d2849d2`, issue left open); the run closed the remaining gap (several keyless list items rewritten in a row). #53 also covers `~`, `Null` and a bare `key:`. Say both in the closing notes of the issues.
- Still lossy after W-1 (not in this wave): files with anchors or tags, a list at the column of its key (#57), a comment inside an empty collection that an edit fills.

## Lessons Learnt
