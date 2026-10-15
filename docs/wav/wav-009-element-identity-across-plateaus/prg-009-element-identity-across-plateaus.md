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

## Findings

- W-1: a replaced element that holds a removed child stays in the union as `removed` with `replaced_by` (a deep view fails
  with `dangling reference` on a child without parent). W-6 must give the children of a moved container their own `replaces`.
- W-1: the new states have a placeholder look in `ChangeMarks.java` (state word, `±`, thin dashed outline) until W-3; the
  warnings of the comparison go nowhere yet (W-3 decides); the editor's `CHANGE_STATES` has three words until W-5.

## Lessons Learnt
