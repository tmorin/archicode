---
type: run
run: 0109
status: completed
wave: 016
---

# Run 0109: Band compare shows the tree

Wave 016 (`band-tree-and-technology-map`), item W-3 (phase P1). Focus: the list *Compare with* of the band shows the tree of the plateaus like the list *Plateau*, with the plateau drawn greyed in it (#72, decision of the author)

Document profile: `single-document`, as runs 0089 to 0108: the scope is settled by the plan (decision T2, accepted by the author) and by the author's words on #72 (2026-10-20): "je suis ok avec la select box de gauche, mais je veux pas même pour la droite. Pour celle de droite, celle sélectionnée à gauche est grisée. Ainsi l'utilisateur voit la hiérarchie des plateaux." No PRD, TDD or pln. The review passes (KDMLLC read of this document, the open questions, the C scan against the code, a read-only review of the working tree by a sub-agent) are answered below.

## Scope

In:

- `bandCompareSelectHtml`: *Nothing*; *Past (follows the plateau drawn)*; then the tree of the list *Plateau* (every plateau, same order, same indentation, same labels), the plateau drawn disabled in its place. A plateau of the tree is a comparison, as `archicode diff --plateau <drawn> --against <id>`.
- The entries *Future: ...* and the group *Other plateaus* are gone.
- `chooseOnBand`: a list chooses, it does not toggle.
- The indentation survives in both lists (D3).
- Tests (node, against the real page); the band measured at 1280 and 360 px.
- `CLAUDE.md`, the two sentences that say what the band's lists are.

Out: the manual (W-12's, lines in Findings), the model of `AppState.layers` and the address (unchanged, D2), the diagram, the Plateaus page.

## Decisions

- **D1. The list.** `Nothing` (`''`), `Past (follows the plateau drawn)` (`past`, only when the plateau drawn overrides one: the root has no past, and an entry that could not be chosen would be noise), then one entry `plateau:<id>` for each plateau of the tree. The plateau drawn is `disabled` wherever it stands (root, middle, leaf, one layer, no layer: with no layer the list is *Nothing* and the root, greyed), and it moves when the plateau drawn changes, since the list is rendered from the state each time. A blocked tree (a mistake) lists only *Nothing*, as before.
- **D2. No change to the model.** `AppState.layers`, `toggleCompareWithPast`, `toggleCompareWithFuture`, `compareWithPlateau`, `layerCompareOther`, `normalizedLayerCompare`, `layerCompareChoice` and the addresses are untouched. A test of wave 014 pins that a plateau chosen on the band is *read as it stands to the plateau drawn* (the plateau compared with becomes the past when the drawing moves onto its child: `editor-reads-layers.test.js`, "a comparison with a plateau chosen on the band is read as it stands..."), so a choice in the tree is not "frozen" as a separate kind of fixed choice. What a tree entry means is what `compareWithPlateau` always meant: a descendant is the future (base = drawn, target = the choice, which is what `diff --plateau <choice> --against <drawn>` prints), the parent is the past, anything else (sibling, cousin, an ancestor that is not the parent) is the base the drawn plateau is compared with (`diff --plateau <drawn> --against <choice>`). Said so, the claim "the same pair gives the same numbers as `diff`" is what the tests check (D5).
- **D3. Indentation: U+2003 (em space), in both lists, as the left list already had it.** The left list was already written with em spaces, a no-break-like character that an `<option>` keeps (only ASCII white space at the start of an option's text is collapsed), so it did not show flat. It is now one constant, `BAND_INDENT`, used by both lists. Seen in the built-in browser: the text of the options read back from the page holds the U+2003; the closed list shows the selected plateau with no indent. Not seen: the native popup (the pane does not capture it), so the indentation as drawn in a popup was not looked at. No `optgroup` is used: there is nothing to group, the tree is the list.
- **D4. A list chooses, it does not toggle.** `compareWithPlateau(id)` stops the comparison when `id` is the plateau already compared with (it is the function of the Plateaus page's and the tests' "same node again"). With a list that is wrong: *Past* is a comparison with the parent, so choosing the parent in the tree would have stopped it. `chooseOnBand` therefore does nothing, and puts the lists back, when the plateau chosen is the one already compared with (and when it is the plateau drawn, which the greyed entry already forbids). Stopping a comparison is *Nothing*.
- **D5. What each choice gives, and what the list shows then.** The list shows the entry the state is, so a person who chose a plateau in the tree sees it selected, except for the one comparison that has its own entry:

  | The state | Selected in the list |
  |---|---|
  | nothing | *Nothing* |
  | `past`, following (`chosen: false`): *Past*, `compare=past`, the *Changes* button of the page Plateaus, the parent chosen in the tree | *Past (follows the plateau drawn)* |
  | a plateau chosen (`chosen: true`), the future that follows with one plateau on top of the drawn one | that plateau in the tree |
  | `future` with several plateaus on top, nothing chosen yet (from an address) | the disabled entry *Choose a future plateau*, and nothing in the tree |

  Choosing the parent in the tree therefore turns into *Past* (the same comparison, which follows): the plateau compared with is the same, and what is shown is what it is.
- **D6. The address: unchanged, and old addresses open.** `layerCompareChoice` still writes `past` for a following past (the parent chosen in the tree is that), `future:<id>` for a descendant chosen (the only child included), `other:<id>` for the others; `compare=future` (follow) is still read and still written back as it was given, and shows the child's entry selected when there is one plateau on top of the drawn one. The history is unchanged: a plateau is an entry, a comparison is not (the address does not say it), and with a removed element picked the address says it as it did (tests).
- **D7. The future with several children, from an address.** A first entry, disabled and selected, *Choose a future plateau* (value `future`, the value `chooseOnBand` already handled), with the whole tree under it and nothing selected in it. It is gone as soon as a plateau is chosen. Nothing is compared meanwhile (`comparisonState()` is null), as before. "Future: " no longer appears anywhere in the page (`git grep -n "Future: " -- src/main/resources/editor-webapp/standalone.html` finds nothing; a test says it).
- **D8. Labels.** The labels of the tree entries are `bandPlateauLabel` as in the other list (name, ` · horizon`, a `! ` before a plateau the command line refuses), so both lists say the same thing of a plateau; the `title` of the list says the plateau drawn is greyed.

## Tasks

- [x] T1. Read runs 0096, 0097 and 0107/0108, the band, `compareWithPlateau`, `normalizedLayerCompare`, the tests that pin the band, the CLI numbers.
- [x] T2. `bandCompareSelectHtml`, `BAND_INDENT`, `chooseOnBand`, the comment of the band.
- [x] T3. Update the tests that pinned the old options (`editor-reads-layers.test.js`, `lean-read-only-band.test.js`); write `band-compare-tree.test.js`; check the new tests fail on the page of `HEAD`.
- [x] T4. Measure in the built-in browser, at 1280 and 360 px.
- [x] T5. `CLAUDE.md`; the review pass; the gate commands; one commit.

## Measures

Built-in browser, `archicode editor serve` on the jar built from this tree, on a copy of `src/test/resources/brightcart/layered` and on a chain of eight plateaus over `baseline` (names of about 60 characters, a service each) made in a scratch folder. Height of `#plateau-band` and the number of distinct `top` of its controls from `getBoundingClientRect`, `document.documentElement.scrollWidth` for the width. The lists were changed by dispatching `input` and `change` on them, which is what a browser fires.

| Case | Band height | Rows | Document width | The two lists (width) |
|---|---|---|---|---|
| Brightcart, `marketplace` drawn, compared with `saas` (a cousin), 1280 px | 43 px | 1 | 1280 | 397 and 361 px |
| chain of eight, `step8` drawn, compared with `step2`, 1280 px | 43 px | 1 | 1280 | 397 and 361 px |
| Brightcart, `marketplace` drawn, compared with `saas`, 360 px | 80 px | 2 | 360 | 277 and 241 px |
| chain of eight, `step8` drawn, compared with its past, 360 px | 80 px | 2 | 360 | |
| chain of eight, `step4` drawn, compared with its past, 360 px | 80 px | 2 | 360 | |
| chain of eight, `step4` drawn, compared with `step8` (a descendant), 360 px | 80 px | 2 | 360 | |

The numbers are those of run 0097 (43 / 80): the list now holds more options, but a closed list is as wide as before, so the band did not change. At 1280 px the Changes panel of the Brightcart case says 48 new, 3 changed and 8 removed elements, the numbers `archicode diff --plateau marketplace --against saas` prints. In every case read from the page the greyed option of *Compare with* was the plateau drawn (`plateau:marketplace`, `plateau:step8`, `plateau:step4`).

Looked at on a screenshot: the band and the Changes panel at 1280 px; the band at 360 px (two rows, the plateau drawn on screen); the closed list of the chain at 360 px with `step8` drawn (its text starts at the left edge, the em spaces do not eat the row).

Not looked at: the dark theme (no colour is new; the greyed entry is the browser's own `disabled` option), the native popup of a list opened by a real click or key (the pane does not capture a native popup; the options were read from the page, the lists were changed by events), a real phone, a screen reader.

## Canonical impact

None to the architecture model: no TDD, no `CI-arc` or `CI-dom` packet, and the repository declares no register for the editor's controls. The behaviour is a presentation of the same comparisons (`compareWithPlateau`, the address and the kernel's `compare` are untouched), so no domain invariant is added or moved; `CLAUDE.md` is corrected where it says what the band's lists are.

## Shipped files

The run ships no example or fixture. The tests read the layered Brightcart (loaded by the command line in `BrightcartLayeredDiffTest` and by the editor in `brightcart-layered.test.js`, now also `band-compare-tree.test.js`) and invented plateaus written by the tests (a chain of eight, one layer, none). The change is to the page only; the command line is not touched.

## Verification

Run by me (`./mvnw` before the last edits of the review pass, which are one comment in the page and one test; the node suite after them) (JDK 25, `PLANTUML_JAR` set to `plantuml-1.2024.7.jar`, so no test is skipped):

| Command | Result |
|---|---|
| `./mvnw -o verify -DskipITs=false` | BUILD SUCCESS: 865 unit tests, 0 failures, 0 errors, 0 skipped; 18 integration tests, 0 failures (the jar of the measures is the one it built) |
| `node --test "src/test/javascript/**/*.test.js"` | 1796 tests, 1796 pass (1778 before the run: 18 in `band-compare-tree.test.js`) |
| `npx prettier --check "src/**/*.java"` | clean |

*Fail before, pass after.* The page of `HEAD` was put back for the run of `band-compare-tree.test.js`: 16 of its 17 tests fail on it (the options, the greyed entry, each of the eight choices, the list that does not toggle, Past that follows, the old addresses, the future that asks); the 17th, that choosing a comparison is not an entry of the history, is a behaviour that was and stays. Mutation: letting `chooseOnBand` toggle (`compare.other === id` removed from its test) fails the test of the list that chooses. The two files that pinned the old options (`editor-reads-layers.test.js`, `lean-read-only-band.test.js`) were rewritten for the new options; every other behaviour they pin holds (no other test changed).

Where each required test is: the options are *Nothing*, *Past* and the whole tree (test 1, and the chain and the one-layer and no-layer cases in test 4); the plateau drawn is disabled wherever it stands and moves (tests 3 and 4); the parent, a child, a sibling, a cousin, an ancestor that is not the parent and a descendant that is not a child give the comparison and the counts of `diff` and of the Changes panel (the eight `choosing ...` tests; P1, P3 and P5 are read from `expected/comparisons.json`, the three pairs that file has not were printed by `archicode diff` on the same folder and are written in the test with the command); *Past* follows the plateau drawn (the `entry Past` test); the addresses, old and new, and the future that asks (the two address tests); the history (the last test); the Brightcart fork and the chain of eight (tests 1 to 4); `Future: ` found nowhere (test 2).

## Review pass, answered

A `general-purpose` sub-agent at the standard tier, read-only, on the working tree (it ran the three band test files). No S1. It traced the selected option for every state of `AppState.layers.compare` (past, chosen target, the follow with one child, the ask with several, a stale `other`, blocked) and found each consistent. Answers:

- S2, the manual still describes the removed entries: W-12's, lines in F1.
- S3, a comparison with the parent cannot be fixed on the band (choosing the parent while *Past* is selected is a no-op that keeps *Past*): D5 and F2; the model is not changed here.
- S3, the label *Past (follows the plateau drawn)* does not name the plateau: the brief gives the label; the tree says which plateau is the parent (the list *Plateau* names the drawn one and the *Plateau* list's tooltip says what it overrides). Not changed.
- S3, the `future` branch of `chooseOnBand` cannot be reached by a person: kept for the tests and scripts (`toggleCompareWithFuture` is still used by the helper); a comment says so.
- S3, a tautological assertion in the new test (`chosen : chosen`): fixed. The reviewer's doubt about the em spaces in `lean-read-only-band.test.js` is unfounded: that regex is written with the U+2003 character (the new line in this run says `\u2003{6}`), and the test passes on the markup, which is the evidence.
- S3, no test for a plateau compared with that is gone from the tree, or for a blocked tree: added (`a tree that is blocked, or a plateau compared with that is gone...`).

The KDMLLC read of this document: each decision is answered by a test, a measure or a command in it; D2 and D5 are the two that depart from a literal reading of the brief ("fixed comparison `plateau:<id>`"), and both give their reason (the wave 014 test, the plateau compared with is the same) and are repeated in F2 for the author. The C scan against the code: the brief says the entries *Future: ...* go (done, a test), that the plateau drawn is disabled in the tree (done), that `AppState.layers` and the addresses keep working (not touched), that the node tests read the markup and cannot see the indentation (D3: it was already U+2003, checked in the browser by reading the option text), that the band is one row at 1280 and at most two at 360 (Measures).

## Findings

- F1 (W-12, the manual). The sentences to change in `src/doc/README.adoc`: line 1343 (the tutorial step that says *In Compare with, choose Past: As is* and describes *Future*: say *Past (follows the plateau drawn)* and that the plateaus of the tree can be chosen, the one drawn greyed); line 1646 (the list of *Compare with*: it is now *Nothing*, *Past*, and the tree of the plateaus as in *Plateau* with the plateau drawn greyed; no *Future* entries, no group *Other plateaus*; a `compare=future` address with several plateaus on top is the disabled entry *Choose a future plateau*); line 1731 (the anchor `editor-band` text: *Past* is the plateau it overrides, *Future* the plateau that overrides it, *Other plateaus* any other plateau; say that every plateau of the tree is an entry, a descendant is the future, the parent is the past, and any other is the base it is compared with); line 1810 (*Write replaces*, "in the *Past* mode ... in the *Future* mode": the modes still exist, only the entries are gone; check the wording); and line 1655 if it quotes the entries.
- F2 (what is not in the issue's words, for the author). Choosing the parent in the tree turns into *Past (follows the plateau drawn)* in the list (D5), because the page has always read a comparison with the parent as the past that follows; there is no way, on the band, to compare with the parent and have it stay when another plateau is drawn. That is the behaviour a wave 014 test pins; making a choice "fixed" would change the model and the address, and is not done here. If the author wants it, it is its own issue.
- F3. Files outside the `likely_paths`: this run document only (and `src/test/javascript/viewpoint-kernel/band-compare-tree.test.js` and the two updated test files are inside them).
- F4. The commit says `Refs #72`; the issue closes with the wave's pull request.

## Not verified

- The native popup of the lists as drawn by a real click (indentation, the greyed option's look), the dark theme, a phone and a screen reader (see Measures).
- The command line is not touched; the check of the views against an older jar is not needed.
- `tooling/docs/check-backlog.py` and the `docs/bkg/` close-out sweep: neither exists in this repository.
