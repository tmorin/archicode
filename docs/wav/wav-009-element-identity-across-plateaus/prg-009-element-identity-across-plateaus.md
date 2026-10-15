---
type: prg
status: active
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

## Findings

- W-1: a replaced element that holds a removed child stays in the union as `removed` with `replaced_by` (a deep view fails
  with `dangling reference` on a child without parent). W-6 must give the children of a moved container their own `replaces`.
- W-1: the new states have a placeholder look in `ChangeMarks.java` (state word, `±`, thin dashed outline) until W-3; the
  warnings of the comparison go nowhere yet (W-3 decides); the editor's `CHANGE_STATES` has three words until W-5.

## Lessons Learnt
