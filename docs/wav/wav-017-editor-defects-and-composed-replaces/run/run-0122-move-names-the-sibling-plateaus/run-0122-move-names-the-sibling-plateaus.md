---
type: run
run: 0122
status: completed
wave: 017
---

# Run 0122: move-names-the-sibling-plateaus

Wave 017 (`editor-defects-and-composed-replaces`), item W-4 (GitHub issue #122). Focus: the dialog of *Move* says which sibling plateaus still declare the old reference, as the rename dialog does (run 0113, #116), before it rewrites the views and the stories that name it.

Document profile: `single-document`, as the runs of wave 016. The change is one call of an existing function from the Move button and a variant of an existing dialog; a prd/tdd/pln would only copy the brief. The review passes are answered below.

## Scope

In: `standalone.html` (`submitMoveDialog`, `renderRenameSiblingsDialogHtml`, `closeAppDialog`), the tests (`move-sibling-plateaus.test.js` new, one test of `move-editor.test.js` changed), `CLAUDE.md`.

Out: `renameSiblingImpact` (generic, untouched), `commitMoveElement` and `applyMovePlan` (untouched), the kernel, the command line, the manual (W-9).

## Decisions

- **D1. The question is asked when the Move button is pressed with a valid parent**, not while the parent is being chosen: the new reference (`check.plan.newReference`) is known only after `validateMove`, and a refused move keeps being told in the Move dialog first. `submitMoveDialog` calls `renameSiblingImpact(reference, plan.newReference, layer)`; null (no plateau layered, baseline drawn, the element not declared in the plateau drawn, no sibling keeps the reference, or no view and no step names it where it stays) means the move is written at once, exactly as before.
- **D2. The same dialog, as a variant** (`kind: 'rename-siblings'`, `moving: true`), so the confirm path (`confirmLayerWrite`, then the dialog of the plateaus that inherit what is written, `guardedLayerWrite`) is the one of the rename. The words say move; the buttons are *Back to Move* (focused) and *Move anyway*. The rename's text is byte for byte what it was (`rename-sibling-plateaus.test.js` is unchanged and green).
- **D3. The cancel path gives the Move dialog back.** The Move dialog waits behind the question as `dialog.back`, with the parent chosen (`dialog.chosen`) and the search typed (`dialog.query`); *Back to Move*, Escape and a click beside the dialog (`closeAppDialog`) put it back, writing nothing, so the author can choose another parent or Cancel. A rename's Cancel is unchanged (it closes). `keptElementForm` (run 0121) is cleared on the way back: the form behind was applied before the Move dialog opened.
- **D4. Move still writes no `replaces`** (#97); the dialog does not offer to.
- **D5. Moves in a layered workspace where a sibling keeps the reference and a view or step names it now ask.** That is the point of the issue, and it changed one existing test: `move-editor.test.js` "confirming moves the element" has `base` and `target` as plateaus that do not stack, `base` keeps `bakery.oven` and the view `ovens` names it; the test now says yes to the question before its other assertions.

## Tasks

- [x] T1. Read `renameSiblingImpact`, the rename dialog, `submitMoveDialog`, the dialog plumbing (`openAppDialog`, `closeAppDialog`, `submitAppDialog`, Escape, the backdrop).
- [x] T2. Page: D1 to D3.
- [x] T3. Tests: `move-sibling-plateaus.test.js` (14 tests): the question and its content, nothing written while it stands, *Move anyway* byte for byte against the same move without the sibling, *Back to Move* by call, by the buttons' clicks, by Escape, a second parent after coming back, a refused move first, no sibling, a sibling named by no view or step, baseline, the element of another plateau, a workspace with no plateau.
- [x] T4. `CLAUDE.md`: the paragraph that said a *Move* still does not warn.
- [x] T5. Gate commands, byte identity against the page at HEAD, the review pass, one commit.

## Review pass

- KDMLLC read: one decision each; the dialog is not duplicated (one renderer, `moving` changes the words and the buttons), the impact is not recomputed elsewhere.
- Open questions: none. Settled here: when to ask (D1), what the cancel does (D3).
- C scan against the code: `renameSiblingImpact` reads `AppState.index` for the element and `layerModelOf` for the siblings, none of which `validateMove` changes (it writes nothing), so asking after `validateMove` and before `commitMoveElement` sees the model the move will rewrite. A *Move* of an element the plateau drawn does not declare is refused by `openMoveDialog` before any parent is chosen (wave 014, run 0082) and the impact is null for it anyway.

## Verification

- `./mvnw -o verify -DskipITs=false` (JDK 25, `PLANTUML_JAR`): exit 0, BUILD SUCCESS, 902 unit tests and 21 integration tests, 0 failures.
- `cargo test`: 213 passed. `embed.sh --check`: the committed WebAssembly is the one the sources build. `npx prettier --check "src/**/*.java"`: clean.
- `node --test "src/test/javascript/**/*.test.js"`: 1932 tests, 1932 pass, 0 fail (1918 before the wave's last run, plus 14 new). Run alone after Maven, never at the same time.
- Seven of the 14 new tests fail on the page at HEAD (the same file, `git show HEAD:...standalone.html` loaded in a copy of the harness); the other seven are the guards (no sibling, no name at risk, baseline, no plateau, a refused move, the element of another plateau).
- Byte identity against the page at HEAD, same harness: 587 moves (every parent offered, and the top level, for every element declared by the plateau drawn: 97 on the layered Brightcart drawn at `baseline`, 150 at `inhouse`, 189 at `marketplace` (`saas` declares one element that can go nowhere), 150 on a layered Brightcart where `saas` also has `commerce.cart` and no view or story names it, 1 on the example `domain_application`, which has no plateau), each pressed with the Move button's function, each answered yes to whatever dialog followed, then "Save all changes": the files written (2956 file writes in all), the removals, the dialogs met (360 `layer-confirm`, as before) and the status are identical in all 587 (549 moves written, the others refused with the same sentence); none met the new question, as expected (no sibling or no name at risk).
- Not run: a real browser (the buttons are driven by `handleAppClick` in the Node harness, which has no layout).

## Canonical impact

`CLAUDE.md` changes: the paragraph on the rename dialog (*Layered plateaus*, `commitElementWithDraft`) said "a *Move* still does not warn about it (#122)"; it now says that *Move* asks the same question, how, and how it is cancelled. The `[[plateau-limits]]` list at the end of the *Layered plateaus* paragraph still names #122; so does the manual (W-9). No domain invariant changes: views and stories belong to no plateau, a move writes no `replaces`.

## Findings

- F1. For **W-9**: `CLAUDE.md` line 56 (the list `[[plateau-limits]]`: "#89, #94, #78, #82, #103, ... #122, #123, ...") must drop #122 once W-9 lands the manual; the manual text of `[[editor-rename]]` or the Move section (`src/doc/README.adoc`, grep `#122` and "Move") must say that *Move* asks the sibling-plateaus question as a rename does, with *Back to Move*.
- F2. A pre-existing test (`move-editor.test.js`, "confirming moves the element") met the question because its fixture is a fork (`base` and `target` do not stack). Any later test that moves an element with a view in such a fixture will meet it; `sayYes` or `submitAppDialog({})` answers it.
- F3. Not verified: the Native job (page-only change, no class added), a real browser.
- F4. Files outside `likely_paths`: none but this run's own document. Issues filed: none.
