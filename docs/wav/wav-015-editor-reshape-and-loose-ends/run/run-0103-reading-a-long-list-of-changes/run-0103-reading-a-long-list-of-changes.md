---
type: run
run: 0103
status: completed
wave: 015
---

# Run 0103: Reading a long list of changes

Wave 015 (`editor-reshape-and-loose-ends`), item W-15 (phase P1). Focus: read 167 changes without losing the place: next and previous, filters, the Changes tab on Stories (#27)

Document profile: `single-document`, as runs 0089 to 0102. Tier `standard`: the tasks were done inline, none delegated (the code is one function family in one file and the tests need its whole state in mind). No data is written, no model changes: the list, the filters and the walk are view state.

## Scope

In: the editor (`standalone.html`: the Changes list, its filters, the walk, the Changes tab on the page Stories), the tests (`reading-changes.test.js`), `CLAUDE.md` (one sentence).

Out: the manual and the tutorial (W-18, see F1), the command line (it lists no changes interactively), the kernel (not touched), a keyboard shortcut (optional in the brief, not added, see D9).

## Decisions

- **D1. One list, one function.** `renderChangesPanelHtml` writes the list for every page that has it (Plateaus, Applications, Environments, Elements, and now Stories); the new part is `renderChangesReadingHtml` (filters, count, buttons), inside it. Nothing is copied.
- **D2. The walk stops at the ends, it does not wrap.** *Previous change* / *Next change* are disabled at the first and the last change shown (the story bar's *Previous* / *Next* do the same), and the list says where the reader is (`3 of 12`). With no change selected, *Next* goes to the first and *Previous* to the last.
- **D3. The order is the one on screen**: the elements, then the relationships, each in the order of `sortedChangeRows` (new, changed, moved, split, merged, removed; the kernel's order inside a state). `orderedChangeRows` is the one list the rows, the walk and the filters read.
- **D4. Where the reader is** is `currentChangeOf`: the row last walked to or clicked, as long as the selection of the page is the one that walk left (`changesWalk.selection`), else the first row that is the selection. This is what keeps *Next* going forward when the selection does not say which row it came from: the relationships of one pair of elements are all "the selection" of one link, and a relationship told by its source (Elements without a diagram) selects an element that has a row of its own.
- **D5. What a walk does depends on whether the page shows a selection** (`changeSelectionIsShown`). Where it does (Applications, Environments, Elements, a view that can be drawn on Stories) the change is selected exactly as a click on its row selects it (`selectChange`, same code), the list stays on screen (`keepList`: the Changes tab stays, where a click goes back to the Selected / View tab as it always did) and the row is scrolled into view (`scrollChangesToSelection`). On the page Plateaus and on a story with no view drawn, nothing can be shown, so the walk only moves the mark and the page does not change; a click on a row there opens the thing in Elements, as before (and now also from Stories).
- **D6. Filters.** Two lists, *State* (all, then the states that rows have: new, changed, moved, split, merged, removed, in the order of the list, each with the count it would show with the other filter as it is) and *Layer* (both, application, technology). `contains-changes` is the seventh word of `KernelStates` but never the state of a row (it marks a box above a change): it is not offered, and `setChangesFilter` refuses it. The line says `167 changes`, or `12 of 167 changes` when a filter is on; each group says `n of N`; a group with none says `None of the N matches the filters.`; *Show all* clears both.
- **D7. The filters do not change what the diagrams draw.** They are not an input of the comparison, of the kernel or of any cache: no `modelsChanged()`, `modelVersion` and `comparisonCache` are untouched (pinned). *Everything / Changes only* stays the one tool that changes a drawing. The counts chips under the title are the comparison's, whatever the filters say.
- **D8. A filter that leaves out the change the reader is at moves to the nearest change shown** (the one after it when two are as near), as a walk would (`nearestShownChange`); when nothing is shown or nothing was selected, nothing moves. The filters survive a render, the wording toggle and model changes; they are reset, with the walk, when the pair of plateaus compared changes (`changesFilterFor`, keyed on base and target; turning the comparison off and on with the same pair keeps them, a pair of two other plateaus and back resets them).
- **D9. No keyboard shortcut.** Optional in the brief; the buttons keep the focus (`pendingFocusSelector`, the other button at an end) so the keyboard walks them already, and a shortcut would have to be told apart from typing in the editor's many fields. Left to the issue below.
- **D10. The Changes tab on Stories.** Offered only while a comparison is on and can be drawn (`libraryChangesState`). On the page of a view that can be drawn the right panel gets two tabs, *View* (what was there) and *Changes* (`libraryRightTab`, a choice of whoever looks); on a story, or a view that cannot be drawn, which had no right panel, the Changes panel is alone on the right as on Plateaus. A row on the page of a view selects the thing on the page itself (`libraryPickFor`, as a click on a box does: the address, the Map and Elements are not touched; a removed element is the page's `baseline-element`). The kernel is not loaded until a drawing needs it: while it loads the panel says so and `settlePlateausPanel` writes the page again.

## Tasks

- [x] T1. Read the plan row W-15, #27 (no comments), the Changes panel code and its tests, runs 0096, 0097, 0101, 0102.
- [x] T2. The reading functions (`orderedChangeRows`, `currentChangeOf`, `neighbourChange`, `nearestShownChange`, `walkChange`, `setChangesFilter`, `goToChange`) and `renderChangesReadingHtml`; the click, input and CSS wiring.
- [x] T3. `selectChange` with `keepList` and the page Stories (`libraryRightHtml`, `libraryRightTab`).
- [x] T4. `reading-changes.test.js` (18 tests, on the 360 changes of `replaces-large-pair`, `before` and `after-declared`: six states, both layers).
- [x] T5. `CLAUDE.md`, the issue, the gate commands, one commit.

## Review pass

- KDMLLC read of this document: one decision each; D5 and D10 say what the page does where there is nothing to select; D4 says why the walk is remembered and not read from the selection.
- Open questions: none left. Settled here: wrap or stop (D2), what a filter does to the drawing (D7), the filters when the comparison changes (D8), the seven states (D6), the shortcut (D9).
- C scan against the code: `git grep -n -E "renderChangesReadingHtml|walkChange|setChangesFilter|currentChangeOf|libraryRightHtml|libraryRightTab|changesFilterFor" -- src/main` finds each; `renderChangesPanelHtml` is the only function that writes the list (`git grep -n "change-list" -- src/main` finds one place).

## Verification

The commands and their real results.

- `node --test src/test/javascript/viewpoint-kernel/reading-changes.test.js`: 18 tests, 18 pass (about 11 s, 480 MB resident).
- `node --test "src/test/javascript/**/*.test.js"`: 1736 tests, 1736 pass (1718 before this run; `reading-changes.test.js` adds 18).
- `./mvnw -o verify` (with `PLANTUML_JAR`): exit 0, 839 tests, 0 failures, 0 errors, 0 skipped (the count of run 0102: no Java test is added, no Java file is touched).
- `npx prettier --check "src/**/*.java"`: clean.
- `cargo test`: not run, the kernel is not touched.
- What the tests pin: 360 changes (six states, both layers) listed, each once, in a stable order; *Next* walks all 360 and stops, *Previous* walks back and stops; the walk selects what a click selects, keeps the Changes tab; a relationship that is told by its source does not trap the walk; a selection made by hand is where the walk goes on from; the counts of every state and layer, alone and together, and what each option would show; a choice that is not a state or a layer changes nothing; no `modelsChanged()`, same cache, same kernel input; the filters survive a render, the wording toggle and a model change and are reset by another pair; the selection moves to the nearest change shown; a filter that shows nothing; the walk with a filter on; the page Plateaus (mark moves, page stays, a click opens Elements); Stories: the Changes panel alone for a story and the same markup as elsewhere, nothing without a comparison, the two tabs on the page of a view, the walk selecting on the page itself (page's own selection, address and Map untouched, a removed element), a click on a row from a story opening Elements, the pending panel while the kernel loads. No test asserts a time.
- Not verified: the page on a real screen (no pixel was seen; the tests read the markup and the state), the dark theme, the narrow width (the filters wrap with `flex-wrap`, not seen), the scroll of a row into view in a real panel (`scrollIntoView` is not run by the harness: the flag is pinned), the focus after a walk (`pendingFocusSelector` is set, the harness does not focus), the Native job (no Java change).

## Canonical impact

The architecture description changes: `CLAUDE.md` says, in the paragraph on the editor's pages, that the Changes list is one function written by five pages, how it is walked and filtered, that it is view state and not an input of the comparison. No domain invariant changes (no model, no manifest, no rule of the kernel or the command line is touched), and no other architecture or domain document names the list. The manual and the tutorial are W-18's (F1).

## Findings

- F1. For **W-18** (the manual and the tutorial): the section on the Changes panel must say *Previous change* / *Next change* (stops at the ends, in the order of the list, elements then relationships), the two filters and the line `12 of 167 changes`, that the filters change only the list and not the diagrams (*Changes only* does), that they start again when the pair compared changes, that *Next* selects the change as a click does and leaves the list on screen, that the page Plateaus and a story (no view drawn) only move the mark, and the Changes tab on Stories (beside View on the page of a view, alone for a story, only while a comparison is on). The state `contains-changes` is not a filter.
- F2. For the rest of the wave: `selectChange` takes `{ keepList }` and a `label`, and `changeRowIsSelected` reads the page's own selection on Stories; a later run that changes the row or the selection must keep both. `currentChangeOf` is the place that says where the reader is.
- F3. A fixture measure: `replaces-large-pair` `before` / `after-declared` gives 360 changes: 223 elements of the application layer (65 moved, 53 changed, 49 removed, 41 new, 11 split, 4 merged), 27 of the technology layer, and 110 relationships (60 new, 50 removed); `before` / `after` gives 839. The Brightcart layered fixture gives 65 at most, too few for this test.
- F4. Issue filed: #113 (a keyboard shortcut for the walk, and the detail of the current change inside the Changes tab). #27 is closed by the wave's pull request (the commit says `Refs #27`).
- F5. Files outside `likely_paths`: `CLAUDE.md` (one sentence) and this run document.
