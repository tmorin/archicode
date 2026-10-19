---
type: run
run: 0096
status: completed
wave: 015
---

# Run 0096: Plateaus page and addresses

Wave 015 (`editor-reshape-and-loose-ends`), item W-8 (phase P1). Focus: the page Timeline becomes Plateaus, the perspective opens on Applications, and an address typed while the editor is open draws what it names (#99, #91).

Document profile: `single-document`, as runs 0089 to 0095: the scope is settled by the plan (the W-8 row, the first criterion of P1), by the issues and by the decisions of the author of 2026-10-18 that the brief repeats; there is no PRD, TDD or pln. The review passes (a KDMLLC read of this document, the open-question resolution, the C scan against the code, a read-only review of the working tree by a sub-agent) are answered below.

## Scope

In:

- `PERSPECTIVES`: the page that lists and edits the plateaus is `plateaus` (label *Plateaus*, route `timeline/plateaus`); there is no page called Timeline any more, Timeline is the perspective. `#/plateaus` opens the page too.
- The perspective Timeline (the top button) opens Applications (`PERSPECTIVE_GROUPS`), and `#/timeline` (alone, with a query, or with a part that names no page) opens Applications, which the page then rewrites to `#/timeline/applications` as it does `#/map`.
- The page Plateaus has the editing of the plateaus: the controls of the band (*writing in*, *New plateau*, *Edit plateau*) are on it, above the list, for the plateau drawn, besides *New plateau after this* and *Edit* of each entry that were already there. The band keeps its own until W-9.
- #91: `hashchange` (`syncPerspectiveFromHash`) draws the plateau and the comparison the address names, through `drawPlateau` (one more optional argument), without reading the disk. A plateau the author chooses (the band, the page, *Changes*, a new plateau) is an entry of the history; an address that is read is not.
- Tests: `editor-structure.test.js` and the three other tests that named the page by its old id, the new `plateaus-page-and-addresses.test.js`, and a history in the harness (`harness.js`: `pushState`, Back and Forward, as a browser has them).
- `CLAUDE.md`, the paragraph of the editor's pages.

Out: the manual and the tutorial (W-18, what they must say is in Findings), the band (W-9), `compare=` in every address (see D5), the CSS classes `timeline-*` and the actions `timeline-draw` and `timeline-changes` (they name the list of the plateaus, which is a timeline; nothing a user sees).

## Decisions

- **D1. The page id is renamed `plateaus`, not only its label and route.** The plan says "label and route"; with the id left `timeline` the code would have a page `timeline` in the group `timeline` and a button Timeline that does not open it, which is the confusion #99 is about. The cost is six identifiers (`renderPlateausPageHtml`, `renderPlateausPerspectiveHtml`, `settlePlateausPanel`, the page id in four `currentPerspective` tests) and the tests that named them. The ids `map` and `library` stay (CLAUDE.md already says so).
- **D2. The top button opens Applications by giving the group a `page`**: `PERSPECTIVE_GROUPS.timeline.page` is `map`. The editor already opens on Applications (`DEFAULT_PERSPECTIVE`); the button was what opened the list.
- **D3. `#/timeline` and `#/timeline/<anything that is not a page>` are Applications.** A link made before this run named the list of the plateaus; it now opens Applications and the manual says so (#99, point 3). `#/timeline/plateaus` and `#/plateaus` are the list.
- **D4. The address is the whole say of the plateau, once the editor is open.** An address with no `plateau=` is the root: the page never writes `plateau=baseline` (the tests of ten files pin that), so Back to the place before the first plateau can only be told by its absence. Every address the page writes itself goes through `currentRouteHash`, which has the plateau, so no internal navigation switches plateau by accident (checked: every `location.hash =` of the page is `currentRouteHash()`, and there is no `href="#/..."`). A plateau the address names that does not exist leaves the plateau drawn and the page writes its own address back (nothing is lost on a typing mistake). At the opening of a folder nothing changes: the address, else what the browser last drew, else `settings.current` (`openLayers`, run 0080).
- **D5. `compare=` is read when the address has it, and the page still writes it only with a removed element (run 0040).** The issue says the band writes it; it does not, on purpose (the test of run 0040 says "nothing new in the address"), and writing it in every address would change some twenty assertions of runs 0040 and 0080 (`changes-panel.test.js`, `inspection-navigation.test.js`) and every link people have kept. So: an address with `compare=` draws that comparison (`past`, `future`, `future:<id>`, `other:<id>`, and the empty word for none), one without leaves the comparison alone (as the plateau changes it follows: `past` is the plateau it overrides, `normalizedLayerCompare`), and Back between two addresses that differ only by the comparison changes nothing, because they do not differ. This is a limit, said in the findings; if the author wants the comparison in the address, it is one line in `currentRouteHash` and those assertions.
- **D6. One drawing, through `drawPlateau(id, { compare, fromAddress })`.** The plateau and the comparison of an address are set together and settled once (`settleAfterLayerChange(false)`: no `render()`, the hashchange handler draws once, after the page and the selection are read, so an element that only the addressed plateau has can be selected). `drawPlateau` answers whether anything changed, and compares the plateau and the normalised comparison before and after, so an address that says what is already drawn redraws nothing. The plateau is remembered for the folder as when the band chooses it.
- **D7. An entry of the history per plateau the author chooses**: `settleAfterLayerChange()` (every step of the author) sets `layerChangeIsAnEntry`, and `syncHashFromState`, at the end of the drawing, uses `pushState` once instead of `replaceState` when the address differs; the flag is cleared by the drawing and by `syncHashFromState` itself, so a drawing that wrote no address cannot leave it set. A comparison chosen on the band changes no address and so adds no entry (D5). Back and Forward then fire `hashchange`, which draws the plateau (D6) and, being an address, adds nothing.
- **D8. While a write is in flight, or a dialog is open, the address is not followed** (`saveInFlight`, `appDialog`; the review found the dialog): the band's buttons are disabled for the same reason, and `guardedLayerWrite` resolves the plateau written. The drawing then writes the address of the plateau drawn back.
- **D9. The editing of the plateaus on the page is the same function as the band's** (`plateauWritingHtml(domId)`; the band passes `band-writing`, the page none, since an id exists once in a document). W-9 removes the band's call; the page keeps the function. No feature is lost between the runs and nothing is written twice.

## Tasks

- [x] T1. Read the plan row, the first criterion of P1, #99, #91, #98, #72, `PERSPECTIVES`, `pageIdFromHash`, `syncPerspectiveFromHash`, the hashchange listener, `drawPlateau`, `settleAfterLayerChange`, `openLayers`, `currentRouteHash`, `syncHashFromState`, the page and the band, and every place that sets the address.
- [x] T2. The page: `PERSPECTIVES`, `PERSPECTIVE_GROUPS`, `pageIdFromHash`, the bar of the pages, the six identifiers, the heading, the writing controls.
- [x] T3. The addresses: `drawPlateau`, `drawLayersNamedByAddress`, `layerChangeIsAnEntry`, `syncHashFromState`, `syncPerspectiveFromHash`.
- [x] T4. Tests: the four files that named the old page, the new file, the history of the harness; the new tests fail on the old page (see Verification).
- [x] T5. The page in the built-in browser (`archicode editor serve` on a copy of the layered Brightcart).
- [x] T6. `CLAUDE.md`, the review pass, the gate commands, one commit.

## Canonical impact

None to the architecture model (no TDD, no `CI-arc` or `CI-dom` packet; the repository declares no register for it). `CLAUDE.md` is corrected where it names the pages and the routes of the editor.

## Shipped files

The run ships no example or fixture for the users. The tests read the fixture that exists (`src/test/resources/brightcart/layered`, loaded by the command line in `BrightcartLayeredDiffTest` and others and by the editor in `brightcart-layered.test.js`, and now `plateaus-page-and-addresses.test.js`) and the invented ferry company of `editor-structure.test.js`. The change is to the page only: the command line is not touched, so the check of the views against a jar built from `git archive 25471b3` is not needed.

## Verification

Run on the final tree, by me (JDK 25, `PLANTUML_JAR` set to `plantuml-1.2024.7.jar`, so no test is skipped):

| Command | Result |
|---|---|
| `./mvnw -o verify` | BUILD SUCCESS, 807 tests, 0 failures, 0 errors, 0 skipped (no Java test added: the change is to the page; integration tests are skipped by default, `skipITs=true`) |
| `cargo test --manifest-path src/main/rust/viewpoint-kernel/Cargo.toml` | 206 passed |
| `src/main/rust/viewpoint-kernel/embed.sh --check` | ok, 747933 bytes (the kernel is not touched) |
| `node --test "src/test/javascript/**/*.test.js"` | 1624 tests, 1624 pass (1606 before: 15 in `plateaus-page-and-addresses.test.js`, 3 former routes in `editor-structure.test.js`) |
| `npx prettier --check "src/**/*.java"` | clean |

*Fail before, pass after.* The new file was run against the page of `HEAD` (the old `standalone.html` put back for the run of the file, then the new one restored): 11 of its 13 tests then failed (the two that passed are guards: a write in flight and a workspace with no plateau, which the old page satisfied by never following an address). With the new page, mutations: the guard `saveInFlight` removed fails the test of a write in flight; the guard `appDialog` removed fails the test of a dialog; `pushState` replaced by `replaceState` fails 3 tests of the history; the flag not cleared after a failed drawing fails the test of a failed drawing.

*The page, seen.* `archicode editor serve` (the jar built by `./mvnw -o -q package -DskipTests`) on a copy of `src/test/resources/brightcart/layered`, in the built-in browser, whose pane is 558 px wide (a narrow window; the width was not measured at 1280 px, which is W-9's measure). What I saw and read: the folder opens on `#/timeline/applications`; the top bar reads Timeline (pressed), Stories, Files, Settings; the bar of the pages reads Plateaus, Applications, Environments, Elements; the page Plateaus has the heading *Plateaus*, the *writing in* line with *New plateau* and *Edit plateau* above the list (the band has them too, until W-9), no duplicate element id, no horizontal scroll (`scrollWidth` 543 of 558); *Edit plateau* of the page opens the dialog *Edit the plateau Monolith*. Typing addresses by assigning `location.hash` (what a pasted link followed in the open tab does): `#/timeline` gives `#/timeline/applications`; `#/files?plateau=saas` draws `saas` on Files; `#/timeline/applications?plateau=marketplace&compare=past` draws `marketplace` compared with `inhouse`; `history.back()` twice goes back to `saas` then to `baseline`, `history.forward()` returns to `saas`; the button Timeline from Files opens `#/timeline/applications`; a click on *Draw* of `saas` on the page adds one entry and Back returns to `baseline`. I did not look at the screen as a person does (no screenshot read beyond one at 0.6 scale of the top of the page).

## Review pass, answered

A `general-purpose` sub-agent at the standard tier, read-only, on the working tree (it ran the node suite once, on a tree it had stashed and restored). Seven findings; all but two taken.

- S0 (taken): the history of the harness threw on `history.pushState(null, '', location.href)` (the page calls it in two places, the harness `location` has no `href`): 16 existing tests failed. This was a mistake of mine: the suite had been run before the harness change. `pushState` now takes a missing address as the one the page is on. The gate above is on the tree after the fix.
- S2 (taken): an address could change the plateau under an open dialog (a form of a plateau, the question of a write that other plateaus inherit), and the write then went to another plateau than the one asked about. `drawLayersNamedByAddress` does nothing while `appDialog` is open (D8), with a test.
- S2 (not taken here, W-18): the manual (`src/doc/README.adoc`, near lines 1229, 1365 to 1371, 1537, 1558, 1597 and the anchor `editor-timeline`) still describes the page Timeline at `#/timeline`. It is W-18's, and F3 says what it must say.
- S3 (taken): `layerChangeIsAnEntry` stayed set if `render()` threw: `try`/`finally`, with a test. S3 (taken): the page called `plateauWritingHtml(null)` twice. S3 (accepted): a Back that is ignored for a write in flight (or a dialog) is overwritten by the address of what is drawn, so the entry the person went to is rewritten, not lost from the stack. S3 (accepted): an address that changes the plateau resets an element in edit mode to view mode, as a click on the band does (`settleAfterLayerChange`).

The KDMLLC read of this document: the decisions are answered by a test or a command of the table; D5 is the one that departs from the issue's text and says why; no duplication beyond the one sentence of CLAUDE.md. The C scan against the code: the plan row says "`#/plateaus` kept": it opens the page (it is the id of the page, so it needed no code, and a test pins it). "The history has an entry per change": per plateau (D7); per comparison it cannot, since the comparison is not in the address (D5, F2). "Editing of plateaus is on this page": the page had *New plateau after this* and *Edit* per entry; it now also has the controls of the band for the plateau drawn (D9). The first criterion of P1 says `#/timeline` opens `#/timeline/applications`, `#/timeline/plateaus` is the page, `#/plateaus` opens it, the old routes open, and Back between two addresses that differ by the plateau changes it: each is a test of `editor-structure.test.js` or `plateaus-page-and-addresses.test.js`.

## Findings

- F1 (wave, for W-9). The band is read-only and Timeline-only in the next run. The writing controls are `plateauWritingHtml`, called by `bandWritingHtml()` (the band) and by `renderPlateausPageHtml` (the page): W-9 deletes `bandWritingHtml` and its call in `renderPlateauBandHtml`, and the gate's `git grep -n -E "New plateau|Edit plateau|writing in"` then finds them in `plateauWritingHtml` and on the page only. The test `the page Plateaus makes a plateau and edits one` pins the page's side; `editor-writes-layers.test.js` ("the band says where a write goes") pins the band's and goes with W-9. The state the band reads is `AppState.layers`; `drawPlateau` is the one function the band, the page and the address draw through.
- F2 (wave, limit). The comparison is not in the address except with a removed element (D5). A link carries the plateau and, with `compare=`, the comparison it was written with; Back between two comparisons of the same plateau does nothing. If the author wants it, `currentRouteHash` writes `compare=` when `layerCompareChoice()` is not empty and the assertions of `changes-panel.test.js` and `inspection-navigation.test.js` that pin its absence change.
- F3 (wave, for the manual, W-18). Say: the perspective Timeline opens Applications; its pages are Plateaus, Applications, Environments, Elements; the address of the list of the plateaus is `#/timeline/plateaus` (`#/plateaus` too) and `#/timeline` is Applications (an old link to the list opens Applications); a link with `plateau=<id>` opened in the tab that is already open draws that plateau, `compare=` the comparison, an address with no `plateau=` is the root, and Back and Forward walk through the plateaus the author drew; making a plateau and editing one is on the page Plateaus (and, until W-9, on the band too). The tutorial step that opens the Timeline opens the page Plateaus by its button or by `#/timeline/plateaus`.
- F4 (wave). The harness records a history (`sandbox.__history`, `history.back()`, `history.forward()`, a `location.hash` assignment is an entry). Tests that replace `history.pushState` by hand are unchanged. A later run that tests the address uses it.
- F5. Files outside the `likely_paths`: `CLAUDE.md` (the paragraph of the editor's pages) and this document. Everything else is in the paths (`standalone.html`, `src/test/javascript/viewpoint-kernel/**`).
- F6. The commit closes #99 and #91.

## Not verified

- The editor on a real screen and at 1280 px: the pane of the built-in browser was 558 px wide, and the layout of the page Plateaus and of the two sets of controls (the page's and the band's) at 1280 px and 360 px was not measured (W-9 measures the band, and the controls of the page stay after it). The list of #29, run by hand before the tag, covers it.
- A real browser's Back and Forward through `history.back()` was driven by script in the built-in browser (the events a button press fires), not by a pressed button.
- The command line is not touched: `./mvnw -o verify` passes, and the byte-identity check of the views against `25471b3` was not run (the change is to the page only).
- `tooling/docs/check-backlog.py` and the `docs/bkg/` close-out sweep of `complete-run`: neither exists in this repository.
