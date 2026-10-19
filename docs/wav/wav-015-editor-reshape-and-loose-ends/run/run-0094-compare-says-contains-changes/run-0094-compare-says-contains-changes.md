---
type: run
run: 0094
status: completed
wave: 015
---

# Run 0094: Compare says contains changes

Wave 015 (`editor-reshape-and-loose-ends`), item W-6 (phase P0). Focus: the kernel says `contains-changes` for the elements of a comparison, and the two copies of the rule go (#96). #34 (the kernel does not say whether `contains-changes` is computed or hand-written) was closed in spirit by wave 014 run 0086 (contract 5: `contains_changes` on the items of a view); its decision of 2026-10-16 asked for the list of the seven words to be exposed once at the same time, which `states` already does, so nothing of #34 is left for this run.

Document profile: `single-document`, as runs 0089 to 0093: the scope is settled by the plan (the W-6 row, the sixth criterion of P0) and by the issue; there is no PRD, TDD or pln. The review passes (a KDMLLC read of this document, the open-question resolution, the C scan against the code, a read-only review of the working tree by a sub-agent) are answered below.

## Scope

In:

- `compare` says, on each element of its union, `contains_changes: true` when the element did not change itself and an element below it in the reference tree is new, changed, removed, moved, split or merged (the rule `compute` already applies to the items of a view: `above_changes` and `annotate` in `lib.rs`).
- `compute` does not read the key back as a free-form field.
- `StateTags.stateOf` (Java) and the page (`treeChangeOf`, the hints about hand-written states) read the key; `referencesAboveChanges` and `computedStateOf` go.
- The kernel README says it; `embed.sh` re-embeds the wasm.
- One test per host draws the same data through `compute` and compares every item with what the union says.

Out: the manual (W-18; what it must say is in Findings), the words of #34 (done by run 0086).

## Decisions

- **D1. The key is `contains_changes`, a boolean on the union's elements, absent when false.** The same name and the same shape as the key of the items of a view (contract 5), so that a host reads one word. It is set when `change` is `none` and the element is above a change; an element that changed itself says `change` and never says it. The rule is computed once, in `compare.rs` (`mark_containers`), over the whole sorted union and per layer, with the same input as `compute` would get: every element of the union whose `change` is not `none` counts, a replaced element kept as a place for what was removed below it included (it is `removed`, and `compute` counts it as a change).
- **D2. The contract stays at 5.** Two keys are added to an answer, absent when false; a host written for 5 cannot be tripped by an extra key, and the number is the signal for a breaking change (the input `on_one_chain` was one; this is not). The plan allowed "contract stays 5 if purely additive, or say why not": it is purely additive on the output of `compare`, and on the input of `compute` it takes away a free-form field that nobody used (see D4). The README says so under "The contract version".
- **D3. A second key, `contains_more_than_wording`, because the editor's toggle needs it.** The tree of the editor, when the author hides the wording-only changes, gives `compute` the elements whose only change is their description as unchanged, and the box above such an element is then not marked (`setWordingAside`, run 0040). The old page worked that out again with `referencesAboveChanges(quiet.layers)`; a single `contains_changes` computed on the full union cannot answer for that drawing. `contains_more_than_wording: true` says the same question without the elements whose `wording_only` is true, and for every element whatever it did itself (an element set aside is unchanged now and may hold a new element). The page reads it in one place, `setWordingAside`, which turns it into `contains_changes` on the records and layers of the set-aside view; everything else reads `contains_changes` and does not know about the toggle. Alternatives rejected: keeping `referencesAboveChanges` for the quiet case only (the derivation the issue asks to delete would stay); asking `compare` a second time with the descriptions equal (a second kernel call per toggle and a second cache).
- **D4. `compute` removes both keys from its input** (`check_changes`, before the facets run), so they are not free-form fields: a facet written against them selects nothing (it never saw them), and the drawing is byte for byte what it is without them. Without that, a facet such as `$..elements[?(@.contains_changes == true)]` would have worked on the union and depended on whether the host kept the key, and a facet that removes a changed element would have left a box marked that no longer holds a change. `compute` says its own `contains_changes` on the items it draws, after the facets, as before. In `compare`, a free-form field of the input with either name is reserved (`RESERVED`) and never reaches the union.
- **D5. The Java record `Comparison.ElementChange` gets `containsChanges`** (read from the answer); `StateTags.stateOf` becomes "its own change, else `container()` if `containsChanges`, else null". The page's `computedStateOf(full, layer, reference)` and `treeChangeOf` become one function, `comparisonStateOfElement(record)`, which reads `change` and `contains_changes` of a record of the union. `state.above` is gone from the answer of `comparisonState()`.
- **D6. One test per host compares the states read from the union with those `compute` works out on the same data**: `PlateauComparerTest.shouldReadTheStateOfAContainerFromTheUnionAndFindItAgainOnTheItemsOfTheView` (Java, three levels, two systems) and `contains-changes-union.test.js` (node: both layers of the invented `plateau-state-hints` library with the full drawing and with the wording set aside, a hand-built case where a box holds a rewording only, the facet that never sees the key, the drawing that does not depend on it, and the page that holds no copy of the rule). The Rust side has its own (`the_union_says_which_elements_contain_changes`, `compute_works_out_the_same_states_as_the_union_says`, and the others of `compare.rs`).

## Tasks

- [x] T1. Read the plan row, #96 and #34, `compare.rs`, `lib.rs` (`Elem`, `check_changes`, `above_changes`, `annotate`), `Comparison`, `StateTags`, the page's `referencesAboveChanges`, `computedStateOf`, `treeChangeOf`, `setWordingAside`.
- [x] T2. Kernel: `mark_containers`, `OutElement.contains_changes` and `contains_more_than_wording`, `RESERVED`, the strip in `check_changes`; the tests; the README, the headers of `compare.rs` and `lib.rs`.
- [x] T3. `embed.sh` and `embed.sh --check`.
- [x] T4. Java: `Comparison.ElementChange`, `StateTags`.
- [x] T5. Page: `comparisonStateOfElement`, `treeChangeOf`, `setWordingAside`, the end of `above`.
- [x] T6. Tests: Rust, `PlateauComparerTest`, `contains-changes-union.test.js`, `replaces-editor.test.js` (the line that read `state.above`).
- [x] T7. `CLAUDE.md`, the review pass, the gate commands, byte-identity, one commit.

## Canonical impact

None to the architecture model (no TDD, no `CI-arc` or `CI-dom` packet; the repository declares no register for it). `CLAUDE.md` is corrected where it describes who says `contains-changes` (the sentence about the computed states).

## Shipped files

The run ships no example or fixture for the users. The tests read the fixtures that exist (`plateau-state-hints`, loaded by the command line in `StateTagRuleTest` and by the editor in `state-hints.test.js`, and now `contains-changes-union.test.js`).

## Verification

Run on the final tree, by me (JDK 25, `PLANTUML_JAR` set to `plantuml-1.2024.7.jar`, so no test is skipped):

| Command | Result |
|---|---|
| `./mvnw -o verify` | BUILD SUCCESS, 807 tests, 0 failures, 0 errors, 0 skipped (run 0093 left 806; this run adds `PlateauComparerTest.shouldReadTheStateOfAContainerFromTheUnionAndFindItAgainOnTheItemsOfTheView`; integration tests are skipped by default, `skipITs=true`) |
| `cargo test --manifest-path src/main/rust/viewpoint-kernel/Cargo.toml` | 196 passed (190 before; six new tests in `compare.rs`) |
| `src/main/rust/viewpoint-kernel/embed.sh --check` | ok, 719540 bytes (715537 before: +4003) |
| `node --test "src/test/javascript/**/*.test.js"` | 1598 tests, 1598 pass (1591 before; `contains-changes-union.test.js` adds 7) |
| `npx prettier --check "src/**/*.java"` | clean |
| `git grep -n -E "referencesAboveChanges\|computedStateOf" -- src/main` | nothing (exit 1) |

*Fail before, pass after.* With the strip of the two keys in `check_changes` commented out, `compute_works_out_the_same_states_as_the_union_says` fails (the facet `$..elements[?(@.contains_changes == true)]` then removes the boxes the union marks). A first version of that test used a path that selects nothing and passed without the strip: it was the mutation that showed it.

*Byte-identity against `25471b3`* (a workspace without plateaus must give the same views). `identity85.py` (scratchpad, the jar built from `git archive 25471b3` outside the repository, compared with the jar of the tree), on the 11 tracked `workspace.yaml` without plateau (`src/doc/examples/domain_application`, `domain_manifest_folders`, `domain_technology`, `domain_viewpoint_views`, `domain_workspace`, `facet_example_step_1` to `_4`, `src/test/resources/hyphen-ids`, `src/test/resources/viewpoint-kernel/workspace`), three commands each on a fresh copy for each jar (`views generate`, `query graph`, `diff`): 33 commands, 19 identical (821 files compared), 14 differ, the same 14 as at the end of run 0093 and all known (the 11 `diff` rewordings, `domain_manifest_folders views generate` and `query graph`, which the old jar cannot read, the order of the deprecated-facet warnings of `viewpoint-kernel/workspace views generate`).

*The layered workspaces, against the jar of `HEAD` before the run* (`cb50c7d`, built with `git archive HEAD` outside the repository). `pairs89.py` (scratchpad): `diff -f json --plateau <p> --against <q>` and `views generate --plateau <p> --against <q>` for every ordered pair of plateau ids of `src/test/resources/brightcart/layered` (baseline, inhouse, marketplace, saas: 12 pairs), `src/doc/examples/domain_plateaus` (baseline, to-be: 2) and `src/test/resources/plateau-comparison` (baseline, as-is, later, to-be: 12), plus the pairs the script makes with the word `PLATEAU` that a `plateau list` header gives it (they fail the same way on both jars): 92 runs, each with its exit code, its standard and error output and the sha256 of every file of the folder afterwards; the two jars give identical results for all 92 (the views, the tables, `gap.md` and `gap.json` are byte for byte the same).

## Review pass, answered

A `general-purpose` sub-agent at the standard tier, read-only, on the working tree: no S0, no S1, no S2. It checked that `mark_containers` is the rule of `above_changes` and `annotate` (own state first, the six states, the replaced places, the layers apart, `wording_only` forced false for the identity states), that `compute` strips both keys before the facets and the build, that no `above` is left on the page and that `quieter` copies a non-wording element as it was, and that `ElementChange` is built in one place only. One design point it confirmed as intended: `compute` marks over the elements left after the facets, the union over the whole union (the facet case of D4).

The KDMLLC read of this document: no duplication between the README, the headers of `compare.rs` and `lib.rs` and this document beyond one sentence each; nothing in Scope is unanswered by a Decision.

The C scan against the code: the plan row says "`StateTags.stateOf` ... read it": the method stays and reads the key (the derivation in it is gone); the sixth criterion of P0 says "the derivation in `StateTags.stateOf` [is] gone": holds. The issue #34 text (the kernel keeps `contains_changes` to itself) is stale since run 0086; nothing in the repository says it any more.

## Findings

- F1 (wave, for W-18: what the manual must now say). Nothing the author sees changes: the same states, the same marks, the same sentences about a state word written by hand. If the manual describes how `contains-changes` is decided, it is the kernel's rule: an element that did not change itself and has below it, in the reference tree, an element that is new, changed, removed, moved, split or merged; the editor's toggle that hides the wording-only changes does not count a change of the description alone.
- F2 (wave). Kernel contract: stays 5. Two additive keys on the elements of `compare`'s union (`contains_changes`, `contains_more_than_wording`), removed from the input of `compute`. W-7 (also in the kernel and the wasm) must start from this wasm (719540 bytes) and run `embed.sh` again; nothing in this run conflicts with its plan row.
- F3. Files outside the `likely_paths`: `CLAUDE.md` (the sentence about who says `contains-changes`) and `docs/wav/.../run-0094-.../run-0094-compare-says-contains-changes.md` (this document). Everything else is in the paths (`src/main/rust/viewpoint-kernel/**`, the wasm, `Comparison.java` under `viewpoint/kernel/**`, `StateTags.java`, `standalone.html`, `src/test/**`).
- F4. The commit closes #96 (`Fixes #96`). #34 is still open on GitHub although run 0086 did what it asked (contract 5: `contains_changes` on the items of a view and the seven words said once by `states`); this run adds nothing to it, so the commit does not close it: the orchestrator closes it by hand, with that reason.

## Not verified

- The native image: no class was added to `manifest` or `cli`; `Comparison.ElementChange` gained a component, read with the accessors of a record, which the native build already registers; whether the native runner gives the same warnings is CI's.
- The editor on a real screen: the page was run in the Node sandbox of the repository, not in a browser (the tree marks and the Changes panel are covered by `replaces-editor.test.js`, `changes-panel.test.js`, `state-hints.test.js` and the new test).
- `tooling/docs/check-backlog.py` and the `docs/bkg/` close-out sweep of `complete-run`: neither exists in this repository.
