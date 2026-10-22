---
type: run
run: 0139
status: completed
profile: single-document
wave: 019
---

# Run 0139: replaces-and-delete-checks

Wave 019, W-3. The editor refuses what a layer cannot hold, before it writes (#138). Decision T4 of the wave: three checks; nothing is offered instead of a refusal (the author, 2026-10-22: the refusal stays, no fold operation); nothing else is written differently.

## Scope and decisions

Only `standalone.html` changes, with its node tests and one option of their harness. The command line writes no `replaces` and deletes no plateau: no shared case, no Java.

1. **(a) *Add replaces* of the inspection.** The `add-replaces` action asks `addReplacesLayerProblem(record, reference)` after `validateNewReplaces`. That function owns the two conditions: a comparison is on, and its more recent plateau is the plateau drawn (the plateau whose element the form edits; with the future the plateau drawn is the base, and the entry is not about that comparison). It then asks `replacesLayerProblem(layer, reference, state)`, the check of *Write replaces* (#130), which judges the layer only where the kernel composes the layers in between (`replacesChainBetween`: several layers apart). A refusal is the sentence of #130 in `add-replaces-error`, word for word; nothing is written and the text typed stays in the field (no redraw). With no comparison, one layer apart, or with no plateau, the entry is written as before, flagged "not in X" and warned by the kernel as before.
2. **(b) A merge.** The merge of a pair is the open pairs of the comparison (not set aside with *Not related*) of its layer and its `to`, when they have two `from` or more. `replacesMergeProblem(candidate, state)` finds that merge and returns its sentence when the layer cannot hold one of its `from` (the first in code-point order); `candidateLayerProblem(candidate, state)` is the pair's own `replacesLayerProblem` (the sentence of #130, unchanged for a lone pair and for the pair whose `from` is refused), else `replacesMergeProblem`. The panel (`renderCandidatesHtml`) and the writer (`acceptLayeredCandidate`) both ask `candidateLayerProblem`, so every button of such a merge is off with a sentence, and a click that gets through writes nothing. The sentence of the other pairs, verbatim for the case of the test (the reason of #130 without its "; nothing was written", then what to do):
   > “n” would merge “a” and “b”, which is written one pair at a time, so every pair is checked before the first is written: “a” is not an element of “p1”, the plateau “p2” builds on (a layer in between removed it): replaces is read against that plateau, so the entry would name nothing there. Compare “p2” with “p1”, or write the entry in the layer that still has “a” (a plateau that overrides one that holds it). If a pair is no part of the merge, set it aside with “Not related”; nothing was written.

   A split has one `from` for all its pairs, so they are already all refused or all allowed. A merge whose every `from` the layer holds is written one pair at a time, as before. The kernel proposes a merge only when several removed elements have a description close to one new element's (a name is a reason only when it is unique on both sides).
3. **(c) The delete of a plateau.** `stepsLosingTheirView` (called only when plateaus stand on the deleted one: a leaf has nothing above it, so nothing new is looked at) now looks at three things, each with the test the step told `at` already used, moved into `viewLosesInPlateauAbove` (a view's `element` the plateau above loses; a map, when none of its pins is left there, as `viewProblem` reads it):
   - a step told `at` a plateau above: as before, word for word;
   - a step compared `against` a plateau above, with or without `at`: ``the story `s` (`file`) step n is compared with `q`, which would no longer have `x` ``. The comparison draws the union, so the step may still be drawn; the step names `q` for what `q` has, and `q` would no longer have it. The stronger reading is the guard the risk of the wave asks for;
   - a saved view (of a manifest or of `workspace.yaml`): one sentence per view, naming every plateau above in which it is drawn now and would no longer be, in the order of the tree: ``the view `v` (`file`) is drawn in `beta`, `marketplace`, which would no longer have `x` ``.

   Order: for each story, each step's `at` then `against`; then the views; all after the plateau-free sentences, as before. A view or a step whose element no plateau would declare any more is also told by the plateau-free check, as the step told `at` already was: two sentences, each true. The refusal is the one of run 0132 (`plateauDeletionBlockedMessage`, the dialog with the sentences and no *Delete plateau* button); `commitPlateauDelete` throws it before `guardedLayerWrite` writes anything.

View state stays view state: no `modelsChanged()` is added; the refusals change nothing. Closing #138 as not planned and the comment on #65 are the orchestrator's (the dispatch brief: this run comments on no issue).

## Tasks

| Task | What | Verification | Result |
| --- | --- | --- | --- |
| T1 | (a) `addReplacesLayerProblem` in the `add-replaces` action | `replaces-and-delete-checks.test.js` (a): fails on `archicode-0.17.0`, passes here | done, inline |
| T2 | (b) `candidateLayerProblem`, `replacesMergeProblem`, used by the panel and by `acceptLayeredCandidate` | same file (b) | done, inline |
| T3 | (c) `stepsLosingTheirView` looks at `against` and at the saved views (`viewLosesInPlateauAbove`) | same file (c) | done, inline |
| T4 | byte for byte: two sets, below | `delete-plateau-as-released.test.js` | done, inline |
| T5 | `CLAUDE.md` where the text changes; the passages of the manual handed to W-9 (no manual change in this run) | review | done |
| T6 | the verification set of the wave | all green, see Verification | done |

T4, the two sets:
- **Still allowed, the same bytes.** The page of `archicode-0.17.0` (`git show`, harness option `html`) and this page delete, from the dialog, every plateau but the root of four copies of the layered Brightcart and save: without `shared/` (`marketplace`, `saas` allowed; `inhouse` refused by both), as shipped with `shared/` (all three refused by both), with an empty plateau in the middle of each branch (`pilot`, `trial`, `marketplace`, `saas` allowed), and with a plateau in the middle that declares, sets and removes (`pilot`, `marketplace`, `saas` allowed). Both pages allow the same deletes, and the files left and removed are the same bytes. Without the history (no tag) the test is skipped and says why; CI checks out with `fetch-depth: 0`.
- **Newly refused, nothing written.** One case per new sentence in `replaces-and-delete-checks.test.js` (c), on the Brightcart without `shared/` with `pilot` in the middle and `twin` beside it: `against` without `at`, `against` with an `at` beside, `at` and `against` both above, a saved view (an element, a map), and the double sentence with the plateau-free check. Each asserts the dialog, the thrown sentence, the unchanged state and an empty disk; each fails on `archicode-0.17.0`.

## Findings

- The kernel can propose a merge (two candidates with one `to`) only through close descriptions; a name is a reason only when it is unique among the removed and the new of its kind.
- The harness of the node tests takes `options.html` (another page's text) and `ARCHICODE_EDITOR_HTML` (the path of the page every test runs), so a new test can be run against a released page without touching the working tree: `ARCHICODE_EDITOR_HTML=<git show archicode-0.17.0:...> node --test <file>`.
- The KDMLLC review of this document (standard tier) found the byte-for-byte set unnamed (now the two sets of T4), the owner of the conditions of (a) unnamed (now `addReplacesLayerProblem`), `replacesMergeProblem` undefined and its sentence not quoted (now in (b)), the #130 rationale missing in (a) and T5 unclear; all applied. Its finding that closing #138 had no task is answered above: that is the orchestrator's.

## Canonical impact

`CLAUDE.md`: yes, three sentences changed in place: the *Write replaces* paragraph (the merge checked as a whole; *Add replaces* now checked, with `addReplacesLayerProblem`) and the delete paragraph (the `against` and the saved views, `viewLosesInPlateauAbove`, `delete-plateau-as-released.test.js`). No `dom`/`arc` packet, no analysis fulfilled.

## Manual passages for W-9 (src/doc/README.adoc, not edited here)

- `[[plateau-replaces]]`, the paragraph after the quoted sentence of #130 (about line 1910, "A split or a merge is written one pair at a time and each replaced element is checked alone. ... The field *Add replaces* ... is not checked."): a merge is checked for all its pairs before the first is written and refused as a whole (quote the merge sentence, and *Not related* for a pair that is no part of it); *Add replaces* is checked the same way when the plateau drawn is the more recent of the comparison, with the same sentence under the field.
- *By hand* (about line 1912, the *Replaces* section of the form): a reference the layer cannot hold, several layers apart, is refused with that sentence; one the plateau compared with does not have is still accepted and flagged.
- `[[editor-plateau-delete]]`, *What blocks it* (about line 1816): add a step compared `against` a plateau above and a saved view drawn in a plateau above that would lose what it draws, with their sentences; and the by-hand fold of a plateau into the one above that W-9 writes (when the refusal says the plateaus above would lose something).
- `[[plateau-limits]]` (about line 1506): it does not list #138 today; the offer of #138 (a fold operation) is to be said there as not planned, as the wave plan asks.

## Verification

On the final tree (JDK 25): `./mvnw -o verify -DskipITs=false '-Dtest=!CustomRenderingTest' -Dsurefire.failIfNoSpecifiedTests=false` BUILD SUCCESS (1249 unit tests, 2 skipped; 26 integration tests); `cargo test` 230 passed; `embed.sh --check` the committed WebAssembly is the one the sources build; `node --test` 2373/2373; `npx prettier --check "src/**/*.java"` clean. Of the eleven tests of `replaces-and-delete-checks.test.js`, the seven that pin a refusal (or call the new `addReplacesLayerProblem`) fail on the page of `archicode-0.17.0` (`ARCHICODE_EDITOR_HTML`), the four that pin what is written as before pass on it. Not verified: a real browser (the node harness renders the HTML and runs the handlers, it does not click). The timing test #81 of `performance-budget.test.js` failed once while Maven ran beside it and passed alone: a budget measured under load, not this run's.
