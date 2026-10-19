---
type: run
run: 0097
status: completed
wave: 015
---

# Run 0097: Lean read only band

Wave 015 (`editor-reshape-and-loose-ends`), item W-9 (phase P1). Focus: the band chooses the plateau and the comparison on the pages of Timeline and does nothing else (#98, and the width part of #82).

Document profile: `single-document`, as runs 0089 to 0096: the scope is settled by the plan (the W-9 row, the second criterion of P1), by #98 and by the decisions of the author of 2026-10-18 that the brief repeats; there is no PRD, TDD or pln. The review passes (a KDMLLC read of this document, the open questions, the C scan against the code, a read-only review of the working tree by a sub-agent) are answered below.

## Scope

In:

- Visibility: the band is on the four pages of the perspective Timeline (Plateaus, Applications, Environments, Elements) and on none of Stories, Files, Settings (`bandIsShown`, `renderShellHtml`).
- Read-only: `bandWritingHtml` and its call are gone; `plateauWritingHtml()` (*writing in*, *New plateau*, *Edit plateau*) is called by the page Plateaus only.
- Lean: the band is two lists, *Plateau* and *Compare with*, and, only when there is a mistake, one button. What it held before went elsewhere (D2 to D6).
- The state is `AppState.layers`; hiding the band resets nothing; Files and Stories read it as before (tests).
- Measures in the built-in browser at 1280 and 360 px, on the layered Brightcart, on a chain of eight plateaus and on a plateau with a mistake, before (the page of `HEAD`) and after.
- `CLAUDE.md`, the sentences that describe the band.

Out: the manual and the tutorial (W-18; what they must say is in Findings), the top bar's own 105 px at 360 px and the stacked heights of the regions (#82, see Measures), the Files page (W-10), deleting a plateau (W-14).

## Decisions

The issue gives the choice of what stays to this run. What was in the band before, and where each thing is now:

| Was in the band | Now | Why |
|---|---|---|
| the label *Plateaus* | the accessible name of the `<nav>`; the first list is labelled *Plateau* | a label that names the bar says nothing the bar does not |
| the tree of buttons (one `band-draw` per plateau, indented children), each with its horizon, its counts `+3 ~5 −11` and a `!` | the list *Plateau*: every plateau in the order of the tree, indented by its depth (at most six steps), `name · horizon`, a `! ` before one the command line refuses | a tree forks, so it cannot be one row (D1); the counts and the tree stay on the page Plateaus, where they were already |
| *Compare with* Past / Future toggles and a `⇄` on every other node | the list *Compare with*: *Nothing*, *Past: <plateau>*, *Future: <plateau>* (one entry for each plateau on top of the drawn one when there are several), then *Other plateaus* | one control for one choice; the pending state of the future ("Choose the future on the band: press ⇄ ...") becomes an entry of the list that is selected and disabled, *Future: choose one* |
| the status sentence ("X compared with Y.", "Nothing compared.") | nothing: the selected entry of the list says it; the Changes panel already says "X compared with Y." | said three times before |
| the switch *Everything / Changes only* | among the tools of the diagram (`renderDiagramCanvasHtml`, after *Hide unlinked*), only while a plateau is compared | it is what the diagram draws of a comparison, for every host (the Map, the diagram of an element, the page of a view in Stories), not a choice of plateau; the Changes panel is a list and is hidden behind a tab when something is selected, so it was not the better place |
| the lists of the mistakes of the plateau drawn and of the plateau compared with (`role="alert"`), the note that the plateaus are blocked, the note that a plateau cannot be written | one button *! N mistakes* that opens the dialog *Mistakes in the plateaus* (`bandMistakes`, `renderMistakesDialogBodyHtml`): a section for each, the same sentences as the command line, and the sentence that nothing is written in a plateau that cannot be drawn | nothing is lost and nothing is said twice: the mistakes are one click away on every page of Timeline, the plateau that is wrong is marked `!` in both lists, and the diagram says "Nothing is drawn: ..." as it did |
| *writing in*, *New plateau*, *Edit plateau* | the page Plateaus only (`plateauWritingHtml()`) | decision (2) of the author; the page had them since W-8 |

- **D1. Two lists in place of the tree.** The tree is the part that cannot be one row. Measured before (the page of `HEAD`): 160 px high at 1280 px and 306 px at 360 px on the Brightcart (baseline has two plateaus on top of it, one of which has another: three rows of buttons), 279 px at 360 px on the chain of eight, whose strip of buttons scrolls sideways inside itself and left the plateau drawn out of sight (seen on a screenshot: only *Monolith* and the beginning of *Keep the monolith one...* were on screen, the drawn plateau, step 8, was off to the right). A flat strip would hold the Brightcart in one row at 1280 px but not eight plateaus, and still needs a row of its own at 360 px. A list is one row for any number of plateaus and always shows the plateau drawn. What is lost is seeing the tree at a glance and the counts of each plateau; both are on the page Plateaus, one click on the bar under the band.
- **D2. The lists are native `<select>` elements**, handled by `handleAppInput` (`chooseOnBand`): the same functions as before do the work (`drawPlateau`, `toggleCompareWithPast`, `toggleCompareWithFuture`, `compareWithPlateau`), so the address, the history, the memory per folder and the writes behave as they did; the click cases `draw-plateau`, `compare-plateau`, `compare-past`, `compare-future` are gone with the buttons. A list that cannot be obeyed (a form typed in and not kept and the person says no, a write in flight, plateaus blocked) is put back by a render.
- **D3. The list *Compare with* names what the comparison is, by the plateau drawn.** *Past* is the plateau it overrides, a *Future* is a plateau that overrides it directly; a plateau further down or in another branch is under *Other plateaus* and is read by `compareWithPlateau` as it always was (a descendant is a future that was chosen, anything else is the base the drawn plateau is compared with, as `archicode diff --plateau <drawn> --against <id>`). A future with one plateau on top of it is one entry, `future`, which follows the plateau drawn as the toggle did.
- **D4. `schedulePlateauCounts`** (was `scheduleBandCounts`) computes the counts of the plateaus only while the page Plateaus is on screen: they are the only place that says them now.
- **D5. The plateau drawn and the comparison are `AppState.layers`.** `renderShellHtml` asks `bandIsShown()`; nothing else changes on Stories, Files and Settings, and the address of those pages still carries `plateau=`.
- **D6. The band's button of the mistakes is a button, not an alert.** The old lists were `role="alert"` and always on screen; the button says how many (`! 3 mistakes`), carries the first sentence in its tooltip, and the dialog is `aria-modal` with a Close button. The count is of sentences (one for each line of the command line's answer, one for the blocked tree).

## Tasks

- [x] T1. Read the plan row, the second criterion of P1, #98, #82, #72, #29, the run documents 0081, 0084 and 0096, the band, `plateauWritingHtml`, the Plateaus page, the diagram toolbar, `handleAppInput`, the dialogs.
- [x] T2. Measure the band as it was (the page of `HEAD`) on the layered Brightcart and on a chain of eight, at 1280 and 360 px.
- [x] T3. The band: `bandIsShown`, `renderPlateauBandHtml`, `bandPlateauSelectHtml`, `bandCompareSelectHtml`, `bandMistakes`, `chooseOnBand`, the dialog; delete `bandNodeHtml`, `bandNodeTitle`, `bandCountsText`, `bandWritingHtml` and the CSS of the tree.
- [x] T4. The switch in the tools of the diagram; the counts only on the page Plateaus; the two sentences that named `⇄` and *Past, Future*.
- [x] T5. Tests: the helper `chooseOnBand` and `bandOf` (`layered-folders.js`), the 19 tests that read the old markup, the new `lean-read-only-band.test.js`; the new ones fail on the page of `HEAD`.
- [x] T6. Measure the band as it is, at 1280 and 360 px, on the three workspaces; look at screenshots.
- [x] T7. `CLAUDE.md`, the review pass, the gate commands, one commit.

## Measures

Built-in browser, `archicode editor serve` on copies of `src/test/resources/brightcart/layered` (4 plateaus: `baseline` > `inhouse` > `marketplace`, `baseline` > `saas`), on a chain of eight plateaus over `baseline` made in a scratch copy (names of about 40 characters, a service each) and on a copy of the layered Brightcart whose plateau `saas` has a patch that selects nothing (a mistake). Heights in px from `getBoundingClientRect`, `document.documentElement.scrollWidth` for the width. "Before" is the page of `HEAD` (`ddb44c5`, the jar built from it), "after" the page of this run, the same workspaces and the same steps (plateau drawn, compared with its past).

| Case | Before: top bar / band / pages bar | After: top bar / band / pages bar | After: rows in the band |
|---|---|---|---|
| Brightcart, `baseline` drawn, nothing compared, 1280 | 48 / 127 / 39 | 48 / 43 / 39 | 1 |
| Brightcart, `marketplace` compared with its past, 1280 | 48 / 160 / 39 | 48 / 43 / 39 | 1 |
| Brightcart, `marketplace` compared with its past, 360 | 105 / 306 / 39 | 105 / 80 / 39 | 2 |
| chain of eight, `step8` compared with its past, 360 | 105 / 279 / 39 | 105 / 80 / 39 | 2 |
| chain of eight, `step8` compared with its past, 1280 | not measured before | 48 / 43 / 39 | 1 |
| Brightcart with a mistake in `saas`, `saas` drawn, 1280 | not measured before | 48 / 43 / 39 | 1 (the button sits in the row, at x 944 to 1035) |
| Brightcart with a mistake in `saas`, 360 | not measured before | 105 / 80 / 39 | 2 (the button shares the second row) |

The document is 360 px wide (no sideways scroll) in every 360 px case, and so is the centre panel of the page Plateaus (`scrollWidth` 360 of 360). At 360 px the two lists are 277 and 241 px wide and read with an ellipsis when a name is longer.

What was measured, read and looked at:

- Measured with `getBoundingClientRect` and `scrollWidth`: every number above.
- Read from the page (queries in the same calls, `javascript_tool`): the options of the *Plateau* list on the chain (nine, `Retire the back office screens` selected) and the order of the controls.
- Looked at on a screenshot: the band and the bar of the pages at 1280 px (Brightcart, `marketplace` compared with its past; the switch is in the diagram toolbar), the band at 360 px on the Brightcart and on the chain of eight (the plateau drawn is on screen, the two lists on two rows), the old band at 360 px on the chain of eight (before; strip scrolled, drawn plateau off screen), the dialog of the mistakes at 1280 px after a real click on its button, the page Plateaus at 360 px with the band above it.
- Not looked at: the dark theme (the band uses the same variables as before; no new colour but `--danger`, which the old lists used), the list of a `<select>` opened (the pane does not capture a native popup; the options were read, and a change of a list was made by dispatching `input` and `change` on it, which is what a browser fires), a real phone.
- The top bar is 105 px high at 360 px with or without this run (its buttons wrap), as runs 0081 and 0084 measured: it is not changed here. Together the top bar, the band and the pages bar take 224 px of 800 at 360 px (they took 450 before), 130 px of 800 at 1280 px (they took 247 before, with a plateau compared).

## Canonical impact

None to the architecture model (no TDD, no `CI-arc` or `CI-dom` packet; the repository declares no register for it). `CLAUDE.md` is corrected where it describes the band (the paragraph of the editor that reads layers, and the sentence that said Past, Future or ⇄ on a node).

## Shipped files

The run ships no example or fixture. The tests read the layered Brightcart (loaded by the command line in `BrightcartLayeredDiffTest` and others and by the editor in `brightcart-layered.test.js`, now also `lean-read-only-band.test.js`), invented plateaus of a few lines (`editor-reads-layers.test.js`) and a chain of eight written by the new test. The change is to the page only: the command line is not touched, so the check of the views against a jar built from `git archive 25471b3` is not needed.

## Verification

Run on the final tree, by me (JDK 25, `PLANTUML_JAR` set to `plantuml-1.2024.7.jar`, so no test is skipped):

| Command | Result |
|---|---|
| `./mvnw -o verify` | BUILD SUCCESS, 807 tests, 0 failures, 0 errors, 0 skipped (no Java test added: the change is to the page) |
| `cargo test --manifest-path src/main/rust/viewpoint-kernel/Cargo.toml` | 206 passed |
| `src/main/rust/viewpoint-kernel/embed.sh --check` | ok, 747933 bytes (the kernel is not touched) |
| `node --test "src/test/javascript/**/*.test.js"` | 1632 tests, 1632 pass (1624 before: 7 in `lean-read-only-band.test.js`, one in `editor-reads-layers.test.js`) |
| `npx prettier --check "src/**/*.java"` | clean |

*Fail before, pass after.* The 19 tests that read the old band (markup of the tree, the toggles, the status, the writing controls, `Changes only` on the band, the sentence "the band says what is wrong") failed on the new page and were rewritten for the lists, the button, the dialog and the diagram's switch. `lean-read-only-band.test.js` was run against the page of `HEAD` (put back for the run, then the new one restored): all of its tests failed there (visibility on four pages and not on three, the state kept through Stories, Files and Settings, the band writes nothing and no other function holds the writing phrases, two lists and nothing else on a chain of eight, the button and the dialog of the mistakes, a list put back when it cannot be obeyed, a list disabled by a write in flight still saying what it says). Mutations on the new page: `restoreBandLists` replaced by `render()` fails the test of the form that was typed in (the page is drawn again, `__renders` counts it) and a list that empties its options while disabled fails the test of the disabled comparison.

Where the criterion of the plan is checked: the band exists only on the pages of Timeline and offers no write (`lean-read-only-band.test.js`, tests 1 and 3; `git grep -n -E "New plateau|Edit plateau|writing in" -- src/main/resources/editor-webapp/standalone.html` finds them in `plateauWritingHtml` (and its comment), in the title of the form that makes a plateau (a dialog, opened from the page Plateaus), in a comment about writes and on the entries of the page Plateaus (*New plateau after this*), and not in the band); the plateau drawn and the comparison survive a visit to Stories, Files and Settings (test 2, and `plateaus-page-and-addresses.test.js` for the address); one row at 1280 px and at most two rows at 360 px: the Measures above.


## Review pass, answered

A `general-purpose` sub-agent at the standard tier, read-only, on the working tree (it ran the two band test files). Five findings; four taken or answered, one is W-18's.

- S1 (taken): answering *No* to "what you typed has not been saved" put the lists back with `render()`, which draws every form again from the model, so the typed text was lost (the old click path just returned). `restoreBandLists` now replaces the band alone; a test counts the renders (none) and checks that `draftTyped` stays. Seen in the built-in browser on the layered Brightcart: an element in edit mode, `TYPED-NOT-SAVED` typed, a change of the *Plateau* list with `confirm` answering no: the text stayed in the field and the list went back to `marketplace`.
- S2 (not a bug, kept): the indentation of the list *Plateau* is made of U+2003 (em space), which an `<option>` does not strip (only ASCII white space is collapsed); the reviewer read it as ordinary spaces. Not seen in a native popup (the pane does not capture one): if a browser did collapse it the list would lose its indentation and still read `name · horizon`.
- S2 (taken): while a write is in flight the list *Compare with* emptied its options and so showed *Nothing* whatever was compared. It keeps its options now and is only disabled; a test says what it shows during a write.
- S2 (answered): *Changes only* is reachable from the diagram toolbar only, while a plateau is compared. Every host of `renderDiagramCanvasHtml` shows it (the Map, the diagram of an element, the page of a view in Stories; test in `changes-panel.test.js`); Files and Settings have no diagram. A choice left on is still the one the diagrams of Stories draw, as it was when the band was the only place to turn it off and the band was hidden there is no change: the switch is on the diagram where it acts.
- S2 (W-18's): the manual still describes the old band (`README.adoc` near 970, 1227, 1499 to 1505). F2 says what it must say.

The KDMLLC read of this document: each decision is answered by a test, a measure or a command of this document; the table of what was in the band and where it went is the one answer to "what stays", with the reason in each row; D1 is the one decision that departs from the text of the issue (a list in place of the tree) and gives the measures that led to it. The C scan against the code: the plan says "`bandWritingHtml` and its buttons move to the page Plateaus" (W-8 had put them there; this run deletes the band's copy), "the status sentence, the mistakes and the switch move to where they belong or behind one control" (table), "the state is `AppState.layers`" (tests), "the width at 360 px is measured" (Measures).


## Findings

- F1 (wave, for W-14 and W-10). The page Plateaus is now the only place that writes a plateau and the only place that lists them as a tree with their counts. W-14 (delete a plateau) puts its button there; nothing is on the band to remove. The list *Plateau* is the one place that marks a plateau the command line refuses with `! ` in front of its name; the page Plateaus marks it with `!` and a tooltip.
- F2 (wave, for the manual, W-18). Say: the band is under the top bar on the four pages of Timeline and nowhere else; it has two lists, *Plateau* (draws a plateau) and *Compare with* (nothing, the past, the future, any other plateau) and, when something is wrong, a button *! N mistakes* that opens the list of the sentences; there is no tree, no *Past* / *Future* toggle, no `⇄` and no sentence under it; *Everything / Changes only* is a switch of the diagram, shown while a plateau is compared; making a plateau and editing it are on the page Plateaus, the band writes nothing; the page Plateaus shows the tree with the counts. The manual lines to change are in `src/doc/README.adoc` near 970, 1228, 1505 and 1567 (the sentences about *Past*, *Future*, `⇄`, the toggles and the anchor `editor-band`), and the tutorial step that compares two plateaus.
- F3 (#82, what is left). The top bar is still 105 px high at 360 px (the perspective buttons, Cancel, Save all changes and the help button wrap); the band is now 80 px at most and the bar of the pages 39 px, so the page starts 224 px down at 360 px (450 before) and 130 px down at 1280 px (247 before, with a plateau compared). Left open: the 105 px of the top bar, and the heights of the stacked regions (80vh for the centre, 30vh for the tree) at 360 px, which nobody has judged on a phone.
- F4 (#29). The list of #29 to look at by hand has the band: it is two lists and a button now, and the tree is on the page Plateaus; the dark theme and a real phone are still to look at.
- F5. Files outside the `likely_paths`: `CLAUDE.md` and this document. Everything else is in the paths (`standalone.html`, `src/test/javascript/viewpoint-kernel/**`).
- F6. The commit closes #98. It does not close #82 (see F3), #72 or #29.

## Not verified

- A phone, the dark theme and a screen reader on the band: the lists are native `<select>` elements with a `<label>` each, which is what a screen reader reads best, but none was run.
- The native popup of a list opened by a real click or key: a change was made by events (see Measures).
- The command line is not touched: `./mvnw -o verify` passes, and the byte-identity check of the views against `25471b3` was not run (the change is to the page only).
- `tooling/docs/check-backlog.py` and the `docs/bkg/` close-out sweep of `complete-run`: neither exists in this repository.
