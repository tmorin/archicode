---
type: prg
status: active
date: 2026-10-16
related:
  - docs/wav/wav-010-clean-failures-and-faithful-saves/wav-010-clean-failures-and-faithful-saves.md
wave: 010
---

# Progress Log: clean-failures-and-faithful-saves

## Log

- 2026-10-16: wave drafted (`proposed`) from the 20 open issues; five rulings (D-1 to D-5) wait for the user.
- 2026-10-16: the user confirmed the recommendation of D-1 to D-5 (and kept the rule of wave 009's D-7 for #39); wave `planned`.
- 2026-10-16: wave `in-progress`, branch `feat/clean-failures-and-faithful-saves` in the main worktree (no linked worktree), one commit per run. Batch 1 of phase P1 is W-1 and W-3, which share `src/doc/README.adoc` and `src/test/java/**` (verdict `serialize`): dispatched one after the other. First: W-1 `cli-messages` (run 0049), tier `standard`, `run-executor` at the default model, 1 run in flight. Then W-3 `plantuml-hyphen-ids`; W-2 `facet-removes-element` follows in the next batch (depends on W-1).
- 2026-10-16: W-1 `cli-messages` (run 0049) returned `completed`; status file `completed` (single-document run, no pln). Verified by the orchestrator on the tree: `./mvnw -o -q verify` exit 0, `node --test` 845/845, `embed.sh --check` ok, `prettier --check` clean. Reported by the run: `cargo test` 160, 27 new Java tests, byte-identity against a jar of HEAD on 13 workspaces and 91 commands per jar (exit codes and generated trees identical; stdout identical except the order of `query views -f json`, see #48; stderr gains the 5 facet-dialect warnings only on `viewpoint-kernel/workspace`). Issue filed: #48. Out-of-path files: `CLAUDE.md`, `reflect-config.json`, `resource/element/**`, `viewpoint/kernel/KernelGraph.java`. Single run in flight, so no collision to check.

## Findings

- W-1: the warnings channel prints when the command ends, so on `views generate` the warnings come after the files are written. W-2 (D-1 is (a)) needs no message path from W-1, only the kernel and the manual's facet section.
- W-1: the natural file list of a CLI run reaches `resource/**` and `reflect-config.json` (the native-image test asks for every new class); W-3 and W-2 should expect the same.

## Lessons Learnt
