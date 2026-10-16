---
type: prg
status: completed
date: 2026-10-15
related:
  - docs/wav/wav-009-element-identity-across-plateaus/wav-009-element-identity-across-plateaus.md
wave: 009
---

# Progress Log: element-identity-across-plateaus

## Log

- 2026-10-15: wave written on the branch `feat/element-identity-across-plateaus`, autonomously as the author asked
  ("t'es autonome pour l'écrire et la compléter"); the review gate of the decomposition is waived by that instruction.
- 2026-10-15: batch 1 of phase P1, part 1: W-1 `replaces-kernel` (run 0042) at tier `standard`, `run-executor` at the default
  model, 1 run in flight. W-2 `state-tag-rule` waits for it: the plan's verdict for the W-1/W-2 overlap is `serialize`. The
  wave is expected to cost 7 runs (0 `hard_judgment`), at most 2 concurrently (W-3 with W-4).
- 2026-10-15: W-1 `replaces-kernel` (run 0042) returned `completed`, commit 1836d89. Verified from disk: status file `completed`,
  contract version 4 in Rust, Java and `standalone.html`, `cargo test` 160 passed, `embed.sh --check` ok (wasm 651,048 bytes,
  +50 kB). Reported by the run: `./mvnw -o -q verify` exit 0 (251 tests), node 764/764, byte-identity of 31 commands on 11
  workspaces against a jar of the previous commit. Files outside its `likely_paths`: `AbstractElement.java`, `Element.java`,
  `ChangeMarks.java`, `reflect-config.json`, `PlateauComparisonTest.java`, `CLAUDE.md`. It filed issue #33.
- 2026-10-15: batch 1, part 2: W-2 `state-tag-rule` (run 0043) at tier `standard`, `run-executor` at the default model, 1 run in
  flight, serialized after W-1 as the plan's `serialize` verdict says. The two members never ran together, so that verdict is
  neither confirmed nor contradicted.
- 2026-10-16: W-2 `state-tag-rule` (run 0043) returned `completed`, commit c339ec6; status file `completed`. Reported by the run:
  `./mvnw -o -q verify` exit 0 (259 tests), byte-identity of 37 commands on 12 workspaces (the error output differs only by the
  intended new warning on `domain_plateaus` and by stack-frame line numbers of already expected `diff` errors). It filed issues
  #34, #35, #36. Files outside its `likely_paths`: `GenerateViewsCommand.java`, `DiffCommand.java`, the new `StateTagReport.java`,
  `reflect-config.json`, the new `state-tags.test.js` and `src/test/resources/plateau-state-tags/**`.
- 2026-10-16: **gate P1 verified** by the orchestrator against real evidence: `cargo test` 160 passed; `embed.sh --check` ok (wasm
  651,048 bytes); `KERNEL_CONTRACT_VERSION`, `ViewpointKernel.CONTRACT_VERSION` and the Rust `CONTRACT_VERSION` are all 4 (read in
  the three files); `./mvnw -o -q verify` exit 0; `node --test` 767/767; `prettier --check` clean; `StateTagRuleTest.java` and
  `state-tags.test.js` assert the same case in the CLI and the editor; `replaces.test.js`, the cargo tests of run 0042 and
  `PlateauComparerTest` cover moved, split, merged and candidates; byte-identity without `replaces` was run by both runs
  against a jar of the previous commit (reported, not re-run by the orchestrator). Canonical impact: both runs answer it in
  their `Canonical impact` section (read).
- 2026-10-16: batch 2 of phase P2: W-3 `replaces-cli` (run 0044) and W-4 `comparison-cache-version` (run 0045), both tier
  `standard`, `run-executor` at the default model, 2 runs in flight concurrently (plan verdict `concurrent-safe`: W-3 edits Java
  and the manual, W-4 only `standalone.html` and its JS tests).
- 2026-10-16: W-3 `replaces-cli` (run 0044) returned `completed`, commit d2c8bb3, and W-4 `comparison-cache-version` (run 0045)
  returned `completed`, commit 7aad144; both status files read `completed`. Verified by the orchestrator on the tree with both
  commits: `./mvnw -o -q verify` exit 0, `cargo test` 160 passed, `embed.sh --check` ok (651,048 bytes), `node --test` 778/778,
  `prettier --check` clean. Reported by the runs: byte-identity of 51 commands on 12 workspaces (run 0044), a measured cost of
  `comparisonState()` on a pair of 3,060 elements of 77 to 111 ms before and 0.011 ms after (run 0045). Issues filed: #37, #38,
  #39, #40. Real collision check of the concurrent batch: run 0044 touched outside its paths only `Item.java` and
  `KernelViewpointFactory.java`; run 0045 touched only `standalone.html` and JS tests; neither is in the other's declared paths
  nor in the other's out-of-path list, and each commit holds only its own files (read with `git show --stat`). The
  `concurrent-safe` verdict for W-3/W-4 is confirmed.
- 2026-10-16: **gate P2 verified**: `gap.md`/`gap.json`/`diff` show moved, split, merged and the candidates (a Java test pins the
  manual's sample output to the command's output on the warehouse fixture); the views carry the three states with distinct
  glyphs and outlines (looked at by the run on rendered PNGs); `comparison-cache.test.js` (11 tests) shows that a load, an edit
  and a baseline change invalidate the cache and that a plain render serialises nothing; the suites above pass. Canonical
  impact: answered in both run documents.
- 2026-10-16: decision D-7 added to the plan (editor proposes candidates always, CLI only for a plateau that uses `replaces`).
- 2026-10-16: batch 3, phase P3: W-5 `replaces-editor` (run 0046), tier `standard`, `run-executor` at the default model, 1 run in
  flight (W-6 depends on it).
- 2026-10-16: W-5 `replaces-editor` (run 0046) returned `completed`, commit a7ba873; status file `completed`. Verified by the
  orchestrator: `node --test` 809/809, `embed.sh --check` ok (651,048 bytes). Reported by the run: `./mvnw -o -q verify` exit 0
  (273 tests), `cargo test` 160, prettier clean, the wasm block of `standalone.html` unchanged, a look at the page in the built-in
  browser (light and dark) on an invented library copy in the scratchpad. It fixed a defect of the editor's save (a list written
  on one line made the whole file be rewritten) because accepting a candidate would otherwise have broken the "one line changed"
  requirement, and filed #41 and #42.
- 2026-10-16: batch 4, phase P3: W-6 `move-element-editor` (run 0047), tier `standard`, `run-executor` at the default model, 1 run
  in flight.
- 2026-10-16: W-6 `move-element-editor` (run 0047) returned `completed`, commit 41fbf84; status file `completed`. Verified by the
  orchestrator on the final tree: `./mvnw -o -q verify` exit 0, `cargo test` 160 passed, `embed.sh --check` ok (651,048 bytes),
  `node --test` 842/842, `prettier --check` clean. Reported by the run: the move dialog looked at in the built-in browser (light
  and dark) on an invented bakery copy in the scratchpad, the saved files differing from the originals only by the moved block,
  the rewritten references and the `replaces` lines, and `archicode diff` on that copy reading 3 moved. Issues filed: #43, #44.
- 2026-10-16: **gate P3 verified**: `replaces-editor.test.js` (31 tests: panel rows, candidates, "Write replaces" writing exactly
  one added line, refusals, hand editing, warnings) and `move-editor.test.js` (33 tests: children follow, references rewritten
  across files, refusals leave the files unchanged, offer of `replaces` for the element and each descendant, cache
  invalidation); the node suite and Maven pass as above. Canonical impact: answered in the run documents.
- 2026-10-16: batch 5, phase P4: W-7 `identity-proof` (run 0048), tier `standard`, `run-executor` at the default model, 1 run in
  flight (the last).
- 2026-10-16: W-7 `identity-proof` (run 0048) returned `completed`, commit 8c3f2e4; status file `completed`. Verified by the
  orchestrator on the final tree: `./mvnw -o -q verify` exit 0, `cargo test` 160 passed, `embed.sh --check` ok, `node --test`
  845/845, `prettier --check` clean; an audit of the added lines of the whole wave against the non-dictionary words of the
  author's real workspace found none (only the generic words `workspace`, `yaml` and `vault`); no name from the history rewrite
  appears in the diff or in the commit messages. Reported by the run: byte-identity against a jar of the release
  `archicode-0.12.0` on 13 workspaces and 106 commands per jar (identical stdout, exit codes and generated files for every
  workspace that uses neither `replaces` nor a hand-written state word on an element without that state), the editor looked at
  on the example (light and dark), a second reader of the manual's CLI steps. Issues filed: #45, #46.
- 2026-10-16: **gate P4 verified**: the manual has `plateau-replaces`, `editor-replaces` and `editor-move` (22 references to them)
  and its sample tables are pinned to the command output by `PlateauComparisonTest`; `domain_plateaus` carries a move with a
  child, a split, a merge and a candidate, with three committed views; the editor was looked at on it by the run; the
  `CLAUDE.md` paragraph mentions `replaces`; all suites pass; the run's "Not verified in this wave" section lists what could
  not be checked (read).
- 2026-10-16: wave 009 `completed`. Every run executed in a subagent of its own; no `hard_judgment` tier was used; the only
  concurrent batch (W-3 with W-4) had no path collision.

## Findings

- W-1: a replaced element that holds a removed child stays in the union as `removed` with `replaced_by` (a deep view fails
  with `dangling reference` on a child without parent). W-6 must give the children of a moved container their own `replaces`.
- W-1: the new states have a placeholder look in `ChangeMarks.java` (state word, `±`, thin dashed outline) until W-3; the
  warnings of the comparison go nowhere yet (W-3 decides); the editor's `CHANGE_STATES` has three words until W-5.
- W-3: `PlantUML` ids with a hyphen produce invalid files (#38): W-7 must avoid hyphens in the ids of the example it renders.
- W-3: extending `domain_plateaus` with `replaces` turns its candidates on, so the manual's `diff` sample must be regenerated by W-7.
- W-4: any new way to change a model must call `modelsChanged()` (or end in `rebuildIndexAndRender()`); W-5 and W-6 inherit this.
- W-3: the manual says in one sentence that the editor has three states; W-5 removes it.
- W-5, W-6: the editor's save used to rewrite a whole file for some list shapes; one-line lists are now kept, the other flow
  shapes are #41. The quoting style of rewritten lines is not kept (#45).
- W-7: a facet removing an element that a relationship points at fails with a stack trace, also on 0.12.0 (#46).

## Lessons Learnt

- A run that has to keep the files of other workspaces byte-identical cannot also add a new section to their output: W-3
  resolved the conflict between "list candidates" and "byte-identical" by listing candidates only for a plateau that uses
  `replaces` (D-7), and the choice is open in #39.
- The application log level (`ERROR`) hides every `log.warn`; a message the user must see goes through the command's error
  output (#35).
