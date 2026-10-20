---
type: run
run: 0113
status: completed
wave: 016
---

# Run 0113: Rename names the sibling plateaus

Wave 016 (`band-tree-and-technology-map`), item W-7 (phase P1). Focus: a rename says which plateaus still declare the old reference before it rewrites the views and the stories that name it (#116)

Document profile: `single-document`, as runs 0089 to 0112: the scope is settled by #116 and by the findings F4 and decision D7 of run 0100. No PRD, TDD or pln. The review passes (KDMLLC read of this document, the open questions, the C scan against the code, a read-only review of the working tree) are answered below.

## Scope

In: `standalone.html` (the impact function, the dialog, the hook in the save of the element form), one node test file, `CLAUDE.md`.

Out: the manual (W-12's: lines in the findings), the Java main code and the kernel (none touched), a *Move* (same hazard, filed as #122), the low-level `commitElementEdit` (asks nothing, by design, D2).

## What was found before any change

- There is no rename dialog today. A rename is the id field of the element form, saved by "Save all changes" (`flushPendingDraft` → `commitElementWithDraft` → `commitElementEdit` with `renamedTo`). In a layered workspace the write runs under `guardedLayerWrite`, whose only dialog (`layer-confirm`) lists the plateaus whose *graph* changed. A sibling plateau's graph does not change when a rename leaves it alone, so nothing was said about it.
- What a rename rewrites: `rewriteInboundReferences` (files of the plateau drawn and of the plateaus that stand on it: `writeScopeHas`), `rewriteSavedViewReferences` (every view and every story step that carries its own recipe, whatever the plateau, since views and stories belong to no plateau, run 0100). The gap of #116 is the second, not the first.
- A rename is only written in the plateau that declares the element (`planLayerElementEdit` refuses an inherited one: "a patch never changes an id"), or in baseline. `PlateauTree.redeclared` forbids the same reference in a plateau and in its ancestor, so an ancestor never has the old reference, and a plateau that has it without standing on the plateau drawn is a plateau beside it, or one that stands on such a plateau.
- On the layered Brightcart no element is declared by two plateaus that do not stack (`saas` declares `commerce-saas` and the technology of the SaaS, `inhouse` its own services), so the fork is made in the tests by giving `saas` a `commerce` (and `inhouse` a `commerce-saas`), the way an author would. The shipped views and stories (`shared/`) are used: `commerce_overview` names `commerce`, step 2 of `fork_tour` names `commerce-saas`.
- The existing test `a rename or a delete reaches the plateaus that stand on the one written...` of `editor-writes-layers.test.js` calls `commitElementEdit` directly on a fork (p1, p2 both declare `foo`): it must keep passing unchanged, which fixes D2.

## Decisions

- **D1. Who counts as "still has the old reference".** Every plateau of the tree that is not the plateau drawn and does not stand on it (`layerIsBelow(id, drawn)`), whose resolved model (`layerModelOf`) holds the old reference or a reference below it (`old.x`) in the layer of the element. A plateau that only *inherits* the element from another plateau (for instance `marketplace` over `inhouse`, when `inhouse` is the sibling) counts as much as one that declares it: the view breaks in it all the same. The record's `declaredIn` says where it comes from, and the dialog prints "inherits it from ..." when that is another plateau. A plateau that stands on the plateau drawn is rewritten (`writeScopeHas`), so it is never listed. The ancestors of the plateau drawn cannot have the reference (`redeclared`).
- **D2. The hook is in the form (`commitElementWithDraft`), not in `commitElementEdit`.** The dialog belongs to the author's click. The low-level write is called by the Move, by the tests, by the delete of an inherited element and by the Replaces writer; adding a question to it would change every one of them and the byte-identical guarantee. `readElementDraft` returns `renamed: { from, to }` (null when the id is not changed); `commitElementWithDraft` asks `renameSiblingImpact(from, to, layer)`; when it returns something, it opens the dialog and returns `false` (Save all changes waits, as for `layer-confirm`); "Rename anyway" calls `writeElementDraft`, the unchanged body of the old function, with the draft read before the dialog (the form is redrawn behind the dialog, as it is for `layer-confirm`). The write is then the same write: `guardedLayerWrite` may open its own dialog next (the plateaus that stand on the plateau drawn and inherit the element), and the author answers both, in that order.
- **D3. When the dialog opens.** Only when at least one view or one story step *would break*: the plateau drawn is a plateau other than baseline (every plateau stands on baseline, so `layerIsBelow` leaves nothing), the element is declared in the plateau drawn (else the write refuses it with its own sentence, which the author gets as before), a plateau beside keeps the reference, and a view or a step names a reference the rename takes the name of that this plateau holds. A sibling that keeps the reference while no view and no step names it asks nothing (nothing to choose: the plateaus then simply disagree on the name, which is what the Changes panel is for). A workspace with no plateau, a layered workspace whose plateaus are not drawn (`writingPlateau()` is null), and a form whose id did not change open and write exactly as before.
- **D4. What "names" means.** `recipeNamedReferences(recipe, layer)` is the list `rewriteRecipeReferences` rewrites, read from the same conditions (the `element` of a view of the layer, the `pinned`, `hidden` and `opened` of a map of the layer). A test compares the two on seven recipes. A step that names a view by id (`view: x`) is not listed on its own: the view is, and the step follows it. A step with its own recipe is listed as the story and the number of the step (1-based, as the checks say it).
- **D5. A map that pins the element in a sibling is listed even when it only hides or opens it.** The page would rewrite the entry to a name the sibling lacks, and the pin, the hiding or the opening is then lost there; "can no longer be drawn" is exact for a pinned element and a little strong for the other two. Kept: the dialog is a warning, and the list is the exact set of what is rewritten.
- **D6. The advice is one sentence, and it is true.** "Cancel, draw each of these plateaus and give the element the same new id there": once every plateau that has the element uses the new id, the views are drawn in all of them. It is not a way to avoid the break in the meantime (the first rename always breaks the others until they follow), so the sentence adds "or rename here and repair the views in those plateaus afterwards". No attempt to rename in several plateaus at once: that is a new feature, not filed.
- **D7. The dialog.** Kind `rename-siblings`, drawn by `renderRenameSiblingsDialogHtml` (one function, the title, the body and the two buttons), with the classes of `layer-confirm` (`app-dialog-wide`, `layer-confirm-list`), the focus on *Cancel*, *Rename anyway* as the primary action, and the same submit and Escape handling as `layer-confirm` (it shares its branch in `submitAppDialog`). It is computed when the form is saved and kept in the dialog (nothing changes the models while it is open). No new CSS.
- **D8. A Move is not covered.** The impact function is generic (it takes the old and the new reference); the Move dialog needs the new parent chosen first. Filed as #122, mentioned in `CLAUDE.md`.

## Tasks

- [x] T1. Read #116, run 0100 (D7, F4), runs 0102 and 0104 (dialogs that list consequences), the code (`commitElementWithDraft`, `rewriteInboundReferences`, `rewriteSavedViewReferences`, `writeScopeHas`, `guardedLayerWrite`, `layerModelOf`).
- [x] T2. `renameSiblingImpact`, `recipeNamedReferences`, `renderRenameSiblingsDialogHtml`, the hook, the dialog kind in `renderAppDialogHtml` and `submitAppDialog`.
- [x] T3. Tests (`rename-sibling-plateaus.test.js`, 16 tests).
- [x] T4. `CLAUDE.md`.
- [x] T5. Gate, review pass, this document, one commit.

## Canonical impact

None to the architecture model: no TDD, no `CI-arc` or `CI-dom` packet, and the repository declares no register for the editor's behaviour. The run adds a question before a write in the editor: no domain invariant is added or moved (no manifest, model, kernel rule or command-line behaviour is touched; the rewrite of a rename is unchanged and a test pins it byte for byte). `CLAUDE.md` is the project's one description of the behaviour of the tools, and its paragraph about the write scope of a rename gains the dialog and where it stops.

## Shipped files

No manifest, example or fixture is added: the tests read the layered Brightcart (loaded by the command line and the editor in the tests of runs 0108 to 0110) and add to an in-memory copy of it one manifest each, to make the fork. The one new file is a node test.

## Review pass, answered

A `general-purpose` sub-agent at the standard tier (Sonnet, medium), read-only, on the working tree. No S1. Answers:

- S2, a sibling plateau the kernel refuses (`undrawable`) has an empty index and is not listed: kept. It has no graph, so no view is drawn in it before or after; the page already says so on the band. Not filed.
- S2, *Cancel* and Escape probably drop what was typed in the form (`render()` rebuilds it from the model; the page keeps no copy of the typed values). It is also what `layer-confirm` does today. Not verified in a browser (the harness has no DOM): filed as #123, with the caveat.
- S3, the Cancel test did not go through the Escape handler: a test now sends Escape through `handleAppDialogKeydown`.
- S3, `confirmLayerWrite` falls back on `dialog.plateau` for the failure message: the dialog now carries `plateau` (unreachable today, `writeElementDraft` catches its own errors).
- S3, the title and the subject use the old name of the element: kept, the body says `from` and `to`.

KDMLLC read and C scan, mine: the brief says the dialog names "the plateaus that still declare the old reference after the rename"; the code reads the resolved model, so it names plateaus that *inherit* it too, and says so (D1). The brief says "the views and the steps": a step that names a view by id is covered by the view (D4). The brief says "a rename with no sibling opens as before": the dialog is not opened, and `layer-confirm` (the plateaus that stand on the plateau drawn) still opens as it did, in a layered workspace; the test says it by the order of the dialogs met. The brief says "the rewrite itself is unchanged": a test compares the files written after the dialog with those of the low-level write, byte for byte. The brief expected a Brightcart element that `saas` and `inhouse` both declare: there is none (they declare different elements), so the tests add one manifest to an in-memory copy; the shipped views and stories are used as they are.

## Verification

Run by me, on the tree as committed (JDK 25, `PLANTUML_JAR` set, so no test is skipped):

| Command | Result |
|---|---|
| `./mvnw -o verify -DskipITs=false` | BUILD SUCCESS: 879 unit tests, 0 failures, 0 errors, 0 skipped; 18 integration tests, 0 failures |
| `node --test "src/test/javascript/**/*.test.js"` | 1864 tests, 1864 pass (0 fail); was 1847 before the run (+17 in `rename-sibling-plateaus.test.js`) |
| `npx prettier --check "src/**/*.java"` | clean |

`cargo test` and `embed.sh --check` were not run: no kernel file is touched, and no Java file either. The Maven run was made before the two last edits of the page and of the test file (`plateau:` in the dialog, one test); the node suite was run again after them.

*Fail before, pass after*: the new tests cannot pass on the old page (`renameSiblingImpact` and the dialog do not exist there); `editor-writes-layers.test.js` (the fork with `foo`, via the low-level write) passes unchanged. Mutations of the code the tests are about, each reverted (the file restored from a copy): the plateaus that stand on the plateau drawn counted as siblings (3 tests fail); the element not required to be declared in the plateau drawn (1 fails, after the test of `shop` was added); the dialog never opened (6 fail); the list not required to hold a view or a step (1 fails). Two mutations survive and are equivalent: the baseline guard (`layerIsBelow` already leaves no plateau) and the empty-plateaus early return (no plateau, no view); both are kept as cheap early exits.

## Not verified

- A real screen: the dialog was rendered as a string and read as text (`renderAppDialogHtml`); not seen, not on a phone (the classes are those of `layer-confirm`, `app-dialog-wide`), not in the dark theme, not with a screen reader, not with the keyboard in a browser (Escape and the buttons were given to the page's own handlers).
- That the form keeps what was typed when the dialog is cancelled (#123).
- The native image (the integration tests ran on the JVM jar).
- `tooling/docs/check-backlog.py` and the `docs/bkg/` close-out sweep: neither exists in this repository.

## Findings

- **F1 (W-12, the manual).** Lines to write in the section on renaming an element in a layered workspace (and in the section on the write scope of plateaus, `[[plateau-limits]]` if it lists the gap): a rename rewrites the files of the plateau drawn and of the plateaus that stand on it, and the views and stories of the workspace everywhere; when a plateau beside the one drawn (or one standing on it) still has the old reference and a view or a story step names it, saving the form with a new id first opens a dialog that names those plateaus and the views and steps, with *Cancel* and *Rename anyway*; nothing asks when no view or step is at risk, in baseline, in a workspace with no plateau; the advice is to rename the element to the same new id in each plateau that has it. A Move does not warn yet (#122). If the manual says that a rename leaves views of other plateaus broken without telling, it is out of date.
- **F2.** The Brightcart has no element declared by two plateaus that do not stack; the tests make the fork in memory. If the author wants a shipped example of it (for the manual), that is a fixture decision for a later run; none is filed.
- **F3.** `gh issue view 116` fails here (the deprecated Projects classic GraphQL field); `gh api repos/tmorin/archicode/issues/116` works.
- **F4.** Files touched outside the `likely_paths`: none (`standalone.html`, `CLAUDE.md`, one new node test in `src/test/javascript/viewpoint-kernel/`, this document). The wave's manifest and progress log are the orchestrator's and were not touched.
- **F5.** The commit says `Refs #116`; the issue closes with the wave's pull request. Issues filed: #122 (Move has the same hazard), #123 (cancelling a dialog probably drops the typed form, unverified).
