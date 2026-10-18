---
type: run
run: 0074
status: completed
wave: 014
---

# Run 0074: Wave 013 review findings

Wave 014 (`layered-plateaus`), item W-17 (phase P0). Focus: the defects a reviewer found in the last wave, fixed or answered (issue #77).
Document profile: `single-document` (six findings with settled causes, a plan that says how each ends; no new contract between components beyond one additive key of the kernel's error). This file carries scope, decisions, canonical impact, review passes, tasks, verification and findings. There is no prd, tdd or pln: the task list below is the plan, and its state is the state of the run.

## Scope

Issue #77, six findings, no more (the seventh, `line-gap`, was dropped by the orchestrator as documented behaviour and is left alone).

1. A nested element with no `kind` reported as ``unknown kind `null` ``. Done by run 0072 (commit `deedf66`): verified here, answered in the issue.
2. The editor checking `header.version` before the layered-plateau and unknown-key checks. Done by run 0072: verified here, answered in the issue.
3. `ofSplitOf` scans every row for each end of each row of the Changes panel.
4. `computeMapThroughFacet` computes the Map again for each reference of the lists that the facet removes.
5. `WorkspaceFactory.onlyWhatIsRemoved` copies an element through `valueToTree` and `treeToValue`.
6. `GapReport` derives the set of the split elements in each renderer.

## Decisions

- **D1. Items 1 and 2 are answered, not redone.** The tests of run 0072 pin both: `editor-reads-like-cli.test.js` (``missing `kind` (known: container, group) at `elements[0]` `` for `content.elements: - id: c`, and the layered-plateau sentence before the missing version) and `LayeredPlateauRefusalTest.shouldTellThePlateauKindBeforeTheVersionThatIsMissing`. Both pass on the final tree; the command line was also run by hand on the jar of this tree (below).
- **D2. Item 3 is fixed in the page: the set of the split elements is built once per render.** `splitElementsOf(rows)` (a `Set` of `layer NUL reference`, the key the Java `GapReport` uses) is built by `renderChangesPanelHtml` and handed to `ofSplitOf(row, splits)`, `newRelationshipsOfSplits(rows, splits)` and `renderChangeRowHtml(row, selected, rows, splits)`. `renderChangeRowHtml` still builds the set when it is called without one, so a caller outside the panel is not broken. The scan `identityTextOf` makes for a split row (the other halves of the same replaced references) is left as it is: it runs for the split rows only (a handful), where `ofSplitOf` ran for every new relationship, and the finding does not name it.
- **D3. Item 4 is fixed by asking the kernel for all the dangling entries at once, not by guessing in the page.** The page does not know what a facet removes: the facet is evaluated inside the kernel. The only way to filter "in one pass" is to have the kernel say it. When the map fails on `pinned`, `opened` or `hidden`, the error now also has `dangling`: every entry the layer does not have, each once, in the order the map checks them (`error` still names the first, so every caller that reads only `error` is unchanged). The page drops all of them and their descendants, and computes again: two computations however many references the facet removes (it was k + 1). The key exists only on that failure, so no output that worked changes: the contract version stays 4 (a key added to an error). The `wasm` is rebuilt and re-embedded (`embed.sh`), for the editor and the command line both.
- **D4. Item 5 is a defect, fixed by copying with the classes, not with the mapper.** The test (`RemovedElementCopyTest`) found two losses on the copy of a removed parent that holds a child another element replaced: a relationship with `label: ""` came back with no label (the mapper writes with `NON_EMPTY`, an empty text is not written, reads back as `null`), and `replaces` came back without what the author wrote (`[billing, billing]` became `[billing]`, since `Replaces` is written as the set it is). The copy is now `Parent.withElements(Set)`, which the eleven classes that have children implement with their own `toBuilder()`: every other property is the very object of the baseline. `Parent` gaining the method makes a new kind of parent a compile error, not a silent loss. Native image: no class is added, `NativeReflectionConfigTest` is part of `verify`.
- **D5. Item 6 is answered: not a defect.** See Findings F3.

## Canonical impact

None to the architecture model (no TDD, no `CI-arc` or `CI-dom` packet). The kernel's README and the header of `lib.rs` say the new key of the error.

## Review passes

- **KDMLLC (inline).** K: one set built per render, one list from the kernel, one method per parent class; no cache, no option. D: the key of a split element is built in one place on each side (`splitElementsOf`, `GapReport.splitElements`); the filtering of the lists is in `computeMapThroughFacet` only. M: the six findings are four fixes, two answers and one dropped, each with its reason. L: no setting, no new class in the native reflection config. U: every name says what it holds (`splitElementsOf`, `withElements`, `dangling`). C: the scope and exit evidence of W-17 in the wave plan (one test per fixed finding, the list answered, byte-identity of the views of the repository's workspaces against `25471b3`) are covered one for one below.
- **C scan.** The wave plan says the two plausible findings "may end as answers in the issue with a test showing there is no defect": item 5 turned out to be a defect (a test shows two losses) and is fixed; item 6 is answered with the arithmetic. The gate criterion ("fixed with a test that fails before and passes after, or answered in the issue with the reason it is not a defect") holds for each of the six.

## Tasks

- [x] T1. Read the wave plan, the issue, runs 0072 and 0073, and the current code of each finding.
- [x] T2. Items 1 and 2: verified against the tests of run 0072 and by hand on the jar (Verification).
- [x] T3. Item 3: `splitElementsOf`, the signatures of `ofSplitOf`, `newRelationshipsOfSplits`, `renderChangeRowHtml`; the old test of `ofSplitOf` takes the set; a test that counts the reads of the rows of a table of 2002 rows.
- [x] T4. Item 4: `dangling` in the kernel's error (`compute_json`, `dangling_in_lists`), a Rust test, README and header of `lib.rs`, `embed.sh`; `computeMapThroughFacet`; a node test that counts the computations.
- [x] T5. Item 5: `Parent.withElements` in the eleven classes, `WorkspaceFactory.onlyWhatIsRemoved` without the mapper, `RemovedElementCopyTest`.
- [x] T6. Item 6: answered with evidence (Findings F3).
- [x] T7. The gate commands on the final tree, the proof that the tests fail on the old code, byte-identity of the views, the answers in the issue, one commit.

## Verification

With `JAVA_HOME=/home/tibo/.sdkman/candidates/java/25.0.4-tem` and `PLANTUML_JAR=/home/tibo/git-perso/plantuml-libs/.workdir/.cache/plantuml-1.2024.7.jar`, on the final tree (the gate commands were run after the last edit of code, tests, page and wasm; this document and the commit came after).

- `./mvnw -o verify`: BUILD SUCCESS, 482 tests, 0 failures, 0 errors, 0 skipped (481 before: +1, `RemovedElementCopyTest`).
- `cargo test --manifest-path src/main/rust/viewpoint-kernel/Cargo.toml`: 176 passed (175 before: +1, `a_map_that_fails_on_its_lists_names_every_entry_it_cannot_find`). `src/main/rust/viewpoint-kernel/embed.sh --check`: "the committed WebAssembly is the one the sources build (661735 bytes)", exit 0 (658369 bytes before). `node --test "src/test/javascript/**/*.test.js"`: 1131 tests, 1131 pass (2 new). `npx prettier --check "src/**/*.java"`: clean.
- **The tests fail before.** Item 3: the page swapped for `git show HEAD:.../standalone.html` (restored from a copy, `git status` checked): the new test fails (the rows were read 16,129,924 times for 2002 rows; 66,602 after, 33 per row) and so does the test of run 0069 that now asks for the set. Item 4: the new node test with the old `computeMapThroughFacet` and the new wasm fails (5 computations for four removed boxes; the old kernel, which has no `dangling`, can only be worse); with the new one it passes (2). Item 5: `WorkspaceFactory.java` swapped for `HEAD`: `RemovedElementCopyTest` fails on the relationship with `label: ""` (first run) and, with that one taken out, on `replaces` as written (`[billing, billing]` was `[billing]`); restored, it passes.
- **Items 1 and 2 on the tree.** `editor-reads-like-cli.test.js` (``missing `kind` (known: container, group) at `elements[0]` `` for `content.elements: - id: c`; the layered-plateau sentence before the missing version) and `LayeredPlateauRefusalTest.shouldTellThePlateauKindBeforeTheVersionThatIsMissing` pass. By hand, on a workspace of two lines in the scratchpad: the jar built from `git archive 25471b3` says ``unknown kind `null` at `elements[0]` ``, the jar of this tree says ``missing `kind` (known: container, group) at `elements[0]` ``; a manifest with `kind: plateau` and no `version` gives the layered-plateau sentence in both jars.
- **Byte-identity of the views.** `identity.py` (scratchpad): the jar built from `git archive 25471b3` outside the repository against the jar of the working tree (`target/quarkus-app`, built by `verify`), on **19** `workspace.yaml`: the 18 of the repository (`src/doc/examples/domain_application`, `domain_plateaus`, `domain_technology`, `domain_viewpoint_views`, `domain_workspace`, `facet_example_step_1` to `_4`; `src/test/resources/brightcart/folders`, `hyphen-ids`, `plateau-comparison`, `plateau-comparison/replaces`, `plateau-state-hints`, `plateau-state-tags`, `replaces-large-pair`, `split-relationships`, `viewpoint-kernel/workspace`) and one of the scratchpad that goes through the changed path (a removed system that holds a box another element replaced, with a relationship to the box that stays). Each copied to the scratchpad; `views generate`, `query graph` and `diff`, and for every workspace with `settings.plateaus`, `views generate --plateau <id>` and `diff --plateau <id>` for each plateau: **101 commands** (19,522 files compared, summed over the commands that agree). Every generated file, every standard output, every exit code and every line of every error output identical, except one: `viewpoint-kernel/workspace`, `views generate`, whose five `warning: facet ...` lines come in another order (files and standard output identical). That is not this run's doing: see F4, filed as #83.

## Findings

- **F1. Items 1 and 2 were done by run 0072** (decision D2 there, its F4): verified, nothing redone.
- **F2. Item 5 was a defect, and not the one the finding guessed.** `@JsonIgnore` and getter-only properties are not on the element classes; what the copy lost was an empty text (`label: ""` of a relationship, which the mapper's `NON_EMPTY` does not write) and the form of `replaces` as written (a duplicate, or an entry that is not a text: the set is what the mapper writes). Both are properties of the element that `KernelGraph` hands on, so the copy was no longer the element of the baseline. The elements nobody copies (the usual case: a removed element that holds only removed ones) were never concerned.
- **F3. Item 6 is not a defect.** `GapReport.splitElements` is one loop over the elements of the comparison. A report builds it twice (`countOfSplit` and the table: `details()` takes the set it is given, it derives nothing), once per `diff` command, whichever of the three formats is asked: two passes over a few hundred elements (360 rows in `replaces-large-pair`, the largest pair of the repository) beside a table that formats every row. The output is the same bytes whichever way it is derived, so no test can tell the two forms apart; a refactor with no test that fails before is not what the gate asks for. Answered in the issue; the code is left as it is.
- **F4. Filed: #83.** The order of the facets, and so of their warnings, is the iteration order of a `HashSet<Facet>`, whose `hashCode` goes down to the identity hash of the `Operator` enum: the same jar prints the warnings in another order with `-XX:hashCode=2` or `5` than with `0`, `1`, `3` or `4`, and a rebuild that moves the class loading moves it too. Found because the byte-identity check below saw it.
- **F5. For the wave.** The wasm is re-embedded (661,735 bytes, 658,369 before): the error of a failed Map gains `dangling`, nothing else moves, the contract version stays 4. W-1 (`kernel-apply-patches`) re-embeds it again; the runs of the wave are serialised, so no merge of the binary is expected. `Parent` gained `withElements`: a run that adds a kind of parent has to implement it (it is a compile error otherwise).
- **F6. Not seen.** The page in a browser (the Changes panel and the Map through a facet were read from the node harness, not looked at); the native image (`NativeReflectionConfigTest` passes, no class was added, the native runner was not run, as in earlier runs); the wasm in the Java side through Chicory with a map that fails (the CLI never gives the map its lists; the Rust test and the node test run the module).
