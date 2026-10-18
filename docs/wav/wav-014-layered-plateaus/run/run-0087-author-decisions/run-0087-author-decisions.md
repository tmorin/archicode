---
type: run
run: 0087
status: completed
wave: 014
---

# Run 0087: Author decisions

Wave 014 (`layered-plateaus`), item W-18 (phase P4). Focus: two rules the author decided on 2026-10-18: no warning for two plateaus that both have their manifest (A1), and a replaces written only against an ancestor (#95).

Document profile: `single-document`, as runs 0075 to 0086. Scope is settled by the author's decisions, the design has no live alternative worth a TDD (the choices that remain are in *Decisions*), and one agent carries the work in one sequence; there is no PRD, TDD or pln.

## Scope

In (the W-18 row of the plan, A1 of the Assumptions, the second criterion of the P4 gate):

- **A1.** Two plateau ids one letter apart warn only when at least one of the two only has headers to name it (`PlateauTree.Node.headerOnly`: no manifest of kind plateau, not `baseline`, at least one header names it). Two plateaus with a manifest each (`p1`/`p2`, `q1` to `q4`, `saas`/`saas2`) give no warning. Same condition, same sentence, same order in `PlateauTree.warningsOf` and `buildPlateauTree`.
- **#95.** *Move and write replaces* is offered only against a plateau that the plateau drawn overrides, directly or not. Against a sibling or a cousin the dialog offers *Move* alone and says why, `planMoveReplaces` offers nothing and a move that asks for the key is refused whole. In `past` mode nothing changes. No other write of `replaces` changes (*Write replaces* of the Changes panel, the `replaces` field of the edit form, the rename that keeps the old reference).

Out: the kernel and its contract, the manual (W-13; one sentence it made false is fixed, see *Files outside the paths*), the other open issues.

## Decisions

- **D56. What "has no manifest" means for A1: `headerOnly`.** The typo case is a plateau that only headers name, the condition the other warning already uses. `baseline` is the implicit root and has no manifest in most workspaces, but it is not a plateau a header invents: a plateau with its own manifest whose id is one letter from it (`baselines`) is not a typo, and a plateau that only a header names (`baselin`) still is. Pinned by M64. The reading "at least one of the two has no manifest", taken literally, would have warned for `baseline`/`baselines` in every workspace that does not write a manifest for the root.
- **D57. The pair warning keeps its place and its sentence.** The header-only warnings come first, then the pairs in id order, then the horizon and repeated `SET` warnings, as before; only the pairs are filtered. V5 (`inhous` next to `inhouse`) keeps its two warnings (M06, N47 unchanged); `docs/fixtures/brightcart-spec.md` V5 and `description.mjs` say "it is one letter from `inhouse`" and stay true.
- **D58. Ancestor, not mode.** The rule reads the tree (`layerIsBelow(drawn, base)`), not the `mode` of the comparison: the band calls the plateau a plateau overrides `past` only when it is the direct parent, and a grandparent is reached as `other`. The grandparent is an ancestor and keeps the offer (the dialog then says, as it always did, that none of the elements is in it). The future is `replacesDirectionProblem`'s and is unchanged; the new check (`replacesAncestorProblem`) runs after it, in `planMoveReplaces`, so the dialog, `validateMove` and the move itself read one answer.
- **D59. The sentence.** `“Base” is not a plateau that “Target” overrides, so replaces is not written against it: the key names references of an earlier plateau of the same line (compare with the plateau it overrides, or with one further up).` The dialog shows it where it showed the other reasons; a refused move says it with `Nothing was changed.`
- **D60. The machinery that writes the key is kept and still pinned.** Finding (issue #97, filed): in a layered workspace the old reference of a movable element is never in an ancestor (it would be declared in both, which the tree refuses; an inherited element cannot be moved), so against an ancestor the dialog always says there is nothing to replace. The rule asked for is implemented as asked; the effect is that the second button cannot be reached from the page. The tests that pin what the move writes once the key is offered (the keys, the lists, the quotes, the lines, the comparison after it) stay, through a stub of `replacesAncestorProblem` named in their helper (`openOffering` in `move-editor.test.js`; the `open` of `quotes-editor.test.js` and `flow-collections-editor.test.js`). #97 asks whether to remove that path or to give the Move a meaning in layers.

## Canonical impact

None to the architecture model: no TDD, no `CI-arc` or `CI-dom` packet, and the repository declares no register for it. The change is a warning condition and a condition on a dialog of the editor; the rules are written in CLAUDE.md (two clauses edited, see below).

## Shipped files

This run ships no file of the repository's users. The forms it changes, and the test that loads each:

| form | command line | editor |
|---|---|---|
| the cases of `plateau-model-cases.json` (M02 and M35 changed, M62 to M64 added) | `PlateauModelTest` | `plateau-model.test.js` |
| V5 of the Brightcart document (`negative-cases.json` N47, `variants/V5.json`) | `BrightcartNegativeCasesTest` | `brightcart-negative.test.js` (both unchanged and green) |
| the Move dialog against a sibling, a cousin and an ancestor | not applicable (the Move is the editor's) | `move-editor.test.js`, section 6 |

## Tasks

- [x] T1. Read the plan, the A1 entries of the progress log, issue #95, runs 0078, 0083, 0084, 0085.
- [x] T2. A1: cases first (M02 and M35 now expect none, M62 both with a manifest, M63 two header-only ids, M64 the root), then `PlateauTree.warningsOf` and `buildPlateauTree` (helper `plateauIsHeaderOnly`, used by both warnings).
- [x] T3. #95: tests first (section 6 of `move-editor.test.js`: sibling, cousin, parent, grandparent), then `replacesAncestorProblem` and its use in `planMoveReplaces`; the 8 tests that pinned the sibling behaviour rewritten to say what they pin (D60); CLAUDE.md and one sentence of the manual.
- [x] T4. Fail-before / pass-after, the five gate commands, one commit.

## Verification

Run on the final tree, by me (JDK 25, `PLANTUML_JAR` set to `plantuml-1.2024.7.jar` from another checkout on this machine, so no test is skipped):

| Command | Result |
|---|---|
| `./mvnw -o verify` | BUILD SUCCESS, 611 tests, 0 failures, 0 errors, 0 skipped |
| `cargo test --manifest-path src/main/rust/viewpoint-kernel/Cargo.toml` | 190 passed (no Rust change) |
| `src/main/rust/viewpoint-kernel/embed.sh --check` | ok, 715537 bytes (no change to the .wasm) |
| `node --test "src/test/javascript/**/*.test.js"` | 1459 tests, 1459 pass |
| `npx prettier --check "src/**/*.java"` | clean |

*Fail before, pass after.* The Java of `HEAD` swapped in (`git stash push -- src/main/java`, tests kept): `PlateauModelTest` fails 4 cases (M02, M35, M62, M64), `BrightcartNegativeCasesTest` 0 (V5 keeps its warnings); restored and compared byte for byte. The page of `HEAD` swapped in: 6 node tests fail (the same four cases, and the two new tests of section 6 of `move-editor.test.js`: the sibling and cousin test, and the ancestor test, which needs `replacesAncestorProblem`); M63 and the parts that pin what must not change pass on both. Restored and compared byte for byte.

Not verified: the page in a real browser (the dialog was exercised through the harness, which renders `renderMoveDialogBodyHtml` and clicks `handleAppClick`, not by eye), the native image.

## Files outside the paths

- `CLAUDE.md`: the clause on the warning for two ids one letter apart, and the clause on *Move* and `replaces`, because both became false.
- `src/doc/README.adoc`: one sentence of the *Replaces* paragraph of the editor chapter ("Without a comparison, or with a plateau compared with that comes after the one drawn, the dialog offers Move alone") now also names the sibling and the cousin. The rest of the manual, and the tutorial step 8 that has the reader press *Move and write replaces* (it also speaks of the old *Plateau* selector and *Compare to*, which run 0084 removed), are W-13's.
- `src/test/javascript/viewpoint-kernel/flow-collections-editor.test.js` and `quotes-editor.test.js` (inside `src/test/javascript/viewpoint-kernel/**`, listed because they were not named by the brief): the stub of D60.

## Findings

- F1. A rule decided on a layered tree can empty a feature without anyone saying so: #95's "offer the key only against an ancestor" leaves the key writable from the Move dialog in no layered workspace (D60, #97). The decision of the author is applied; the consequence is told to them in #97 and here.
