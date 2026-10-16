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
- 2026-10-16: dispatching W-3 `plantuml-hyphen-ids` (run 0050), tier `standard`, `run-executor` at the default model, 1 run in flight. W-2 `facet-removes-element` follows after it (shared `src/doc/README.adoc`, verdict `serialize`).
- 2026-10-16: W-3 `plantuml-hyphen-ids` (run 0050) returned `completed`; status file `completed` (single-document). Verified by the orchestrator: `./mvnw -o -q verify` exit 0, `node --test` 845/845, `embed.sh --check` ok, `prettier --check` clean. Reported by the run: `cargo test` 160; PlantUML 1.2024.7 renders every view of the new fixture (`HyphenIdViewsTest` with `PLANTUML_JAR`, 30+ views); byte-identity on 14 workspaces and 94 commands per jar (exit codes and stderr identical; the only changed generated files are views of hyphenated ids, 104 in `viewpoint-kernel/workspace`, reproduced by applying the naming rule to the old files). Issue filed: #49. Single run in flight, no collision to check.
- 2026-10-16: dispatching W-2 `facet-removes-element` (run 0051), tier `standard`, `run-executor` at the default model, 1 run in flight (last run of phase P1; the gate is verified when it returns).
- 2026-10-16: W-2 `facet-removes-element` (run 0051) returned `completed`; status file `completed` (single-document). Verified by the orchestrator: `./mvnw -o -q verify` exit 0, `cargo test` 168 passed, `embed.sh --check` ok (655,251 bytes), `node --test` 850/850, `prettier --check` clean. Reported by the run: the reproduction of #46 on a copy of `domain_plateaus` (four facets: id, `changed`, `moved`, `split`) failed with `dangling reference` before and exits 0 after on `views generate`, `--baseline`, `--plateau as-is` and `--plateau to-be`; byte-identity on 17 workspaces and 133 commands per jar (only the 4 commands that crashed differ). No issue filed. Single run in flight, no collision to check.
- 2026-10-16: **gate P1 verified**. (1) Failing commands: by hand on the built jar, a missing workspace file prints `error: the workspace file ... does not exist` and exits 1, an unknown plateau prints `error: unknown plateau ...` and exits 1, no stack trace; `CleanFailuresTest` covers each command that throws `ArchiCodeException` (read, in the passing `verify`). (2) `views generate` on `src/test/resources/viewpoint-kernel/workspace` (a copy) prints `warning: facet ...: deprecated facet syntax ...` on the error output; `diff` on a copy of `domain_plateaus` prints the candidate table. (3) #46: covered by `FacetRemovesElementTest`, `facet-removes-element.test.js` and the cargo tests, and by the run's reproduction (not re-run by the orchestrator); `HyphenIdViewsTest` re-run by the orchestrator with `PLANTUML_JAR` set to the 1.2024.7 jar: 4 tests, 0 skipped, 0 failures, 203 s. (4) `verify`, `cargo test`, `embed.sh --check` pass as above. (5) Byte-identity: reported by each of the three runs against a jar of the previous commit (13, 14 and 17 workspaces); the only changed generated files are those of the defects fixed (invisible warnings, hyphenated ids, the four crashing facets); not re-run by the orchestrator. Canonical impact: each run is `single-document`; the docs say what the run changes in the manual and `CLAUDE.md` (read, no `CI-arc`/`CI-dom` items were opened).

## Findings

- W-1: the warnings channel prints when the command ends, so on `views generate` the warnings come after the files are written. W-2 (D-1 is (a)) needs no message path from W-1, only the kernel and the manual's facet section.
- W-1: the natural file list of a CLI run reaches `resource/**` and `reflect-config.json` (the native-image test asks for every new class); W-3 and W-2 should expect the same.
- W-3: PlantUML 1.2024.7 reads a name only up to the first character that is not a letter, digit, `_` or `.`; quoting does not help, so the fix replaces such characters by `_` (collisions get `_2`, `_3`) in `rendering/plantuml/PlantumlNames`. The conformance test and the committed views of `viewpoint-kernel/workspace` pin this naming; W-2 and W-6 regenerate them if they change how boxes are named. `render` in `ItemRenderer` and `LinkRenderer` takes a `PlantumlNames`.
- W-1, W-3: the order of `query views` and `query schemas` output is not stable between runs (#48, #49).
- W-2: a facet that removes an element now also drops the relationships, the `uses` entries and the node `applications` that name it, and the removed element's children; a reference already dangling before the facet stays an error. No warning is printed (the facet asked for it).

## Lessons Learnt
