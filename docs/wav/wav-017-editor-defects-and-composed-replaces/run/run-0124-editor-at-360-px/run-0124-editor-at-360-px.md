---
type: run
run: 0124
status: completed
wave: 017
---

# Run 0124: editor-at-360-px

Wave 017 (`editor-defects-and-composed-replaces`), item W-6 (phase P1). Focus: the top bar and the Settings page at 360 px, measured on the band as it is now, then fixed or the issue closed with the numbers (#82; decision T4 of the wave plan: measure first).

Document profile: `single-document`, as the runs of wave 016. The run is a measure and one CSS rule block; a prd/tdd/pln would only copy the brief. The review passes are answered below.

## Scope

In: `standalone.html` (the query for the narrow window, `@media (max-width: 40rem)`), a test of the stylesheet (`src/test/javascript/viewpoint-kernel/editor-at-360-px.test.js`), this document.

Out: the stacked order and the heights of the regions (judged by the author, on a real phone: #29), the manual (`src/doc/README.adoc` line 1501 says the old thing: W-9), the lists of `CLAUDE.md` and of `[[plateau-limits]]` (W-9, "if closed"), the issue itself (the orchestrator).

## Method

Built-in browser, `resize_window` to 360x800 (light, then dark), `archicode editor serve` (the jar built from this tree) on a copy of the layered Brightcart (`src/test/resources/brightcart/layered`) and on a copy of the example `domain_application` (a workspace with no plateau), in the scratchpad. The browser pane's screenshots worked this time and every page and form below was looked at, not only measured. A script walked every state and measured with `getBoundingClientRect` and `scrollWidth`: for each region (`#panel-left`, `#panel-center`, `#panel-right`, `.app-dialog`, the band, the top bar) every element whose right edge is past x 360, the `scrollWidth` against the `clientWidth`, and every box whose text goes past its own box and past x 361.

## Measures (before any change)

| What | Layered Brightcart | `domain_application` (no plateau) |
|---|---|---|
| top bar (`header.top-panel`) | 105 px | 105 px |
| band (`#plateau-band`, the pages of Timeline only), nothing compared or marketplace compared with baseline | 80 px (two lists, one line each) | 80 px |
| page tabs (Plateaus, Applications, Environments, Elements) | 39 px | 39 px |
| the tree starts at | y 225 (105 + 80 + 39), a quarter of the 800 px | y 225 |
| tree (`left-panel`, 30vh), Applications / Environments / Elements | 240 px | 93 to 240 px (its content, 30vh at most) |
| centre (`center-panel`, 80vh) | 640 px | 640 px |
| inspection (`right-panel`, 50vh at most), when an element is selected or a comparison is on | 400 px | none |
| the document, `scrollWidth`, on Plateaus, Applications, Environments, Elements, Stories, Files, Settings | 360 on all seven | 360 on all seven |
| document height (scrolls vertically) | 865 (Plateaus), 1105 (Applications, Environments, Elements), 916 (Stories), 985 (Files), 800 (Settings), 1505 with a selection and a comparison | 800 to 1067 |
| Settings: fields (text, list, text area) / right edge of the widest | 22 of them, 55 controls with the labels and buttons, the widest ends at x 332 (the *Current plateau* list: x 28 to 332) | the same page |
| Settings: `scrollWidth` of the centre | 360 | 360 |

The first three claims of the issue, read against these numbers: the top bar is 105 px, not 344 (the plateau buttons and *Compare to* are gone; the band that replaced them is 80 px and shown on Timeline only); no field of Settings goes past the window (the widest control ends at x 332 of 360, the label sits over its field below 40rem); the document is 360 wide everywhere.

What the first scan found past the window, inside the scroll of the centre panel (`#panel-center`, 360 px wide, `scrollWidth` greater), on both workspaces:

| Where | Right edge / `scrollWidth` | Why |
|---|---|---|
| form of an element, the row that adds a tag (two text fields and *Add*, class `edition-add-row`) | x 492 | 196 + 196 + 59 px of fields in a row that does not wrap |
| form of an element that can hold children and be moved (Delete, Move, Add child, Back to view), `element-header-actions` | x 373 | the group does not wrap and does not shrink |
| a story, *Add a saved view as the last step* (`select#story-add-view`) | x 412 | as wide as its longest view name |
| *Confirm delete* of an element with children (`ul.relationship-list`, the references inside it and the paths of its manifests, one word each) | `scrollWidth` 541 on `domain_application` | no break in a long reference |

Not a defect, looked at: the code editor of Files scrolls inside itself (a code editor, `cm-scroller`); the list of the places not offered in the *Move* dialog has its own scroll bar inside the dialog (328 px wide, 326 inside); the diagram canvas is wider than the window by design (it is drawn to scale, in its own scroll); a few boxes of the views (`element-view`, `settings-view`) have a content 28 px wider than their padded box but end at x 332.

## Decisions

- **D1. The issue's own claims hold on the band as it is** (top bar 105 px, no Settings field past the window, the document 360 wide). What the run changes is the four places above, found by the scan, none of them in Settings.
- **D2. The fix is CSS only, four rules, no colour** (the theme audit has nothing to read). Three are in the query for the narrow window: `.edition-add-row` wraps and its fields never go wider than the row; `.story-add select` never goes wider than its row; `.delete-confirmation li` breaks inside a word (`overflow-wrap: anywhere`). The fourth is on the form, outside the query: `.element-edition-form .element-header-actions` wraps and may shrink. A first version put it in the query and `header.test.js` ("the strip is gone") refused: the header is told by the width of the centre, never by the window, and its own states stay as they are. A row that fits does not wrap, so a wide window is drawn as it was (checked at 1024 px: the four buttons on one row at the same `top`; a test pins that the base rule keeps `flex-shrink: 0` and no wrap).
- **D3. The heights and the order of the stacked regions are left as they are.** Tree 30vh (240 px), centre 80vh (640 px), inspection 50vh at most (400 px), the page scrolling from one to the next, looked at on screenshots of Applications, Elements, Stories, Files and Settings: nothing is cut, the tree is usable, the diagram has room. Whether that order suits a phone is a judgment on a real device (#29); this run does not make it.
- **D4. The *Move* dialog's list is left alone** (its text scrolls inside its own box, which is inside the dialog): not past the window.

## Tasks

- [x] T1. Serve the editor on the two copies; measure the top bar, the band, the tabs and the panels on every page.
- [x] T2. Measure every control of Settings, with the new *Current plateau* field.
- [x] T3. Walk the forms (ten elements of the Brightcart: view, edit, Move, Delete; the four of the example), the three stories, the seven views, Plateaus (new, edit), Files (a file opened), the help; with a comparison on and an element selected.
- [x] T4. Fix what is past the window (D2); the test of the stylesheet (7 tests in `editor-at-360-px.test.js`).
- [x] T5. Measure again on a rebuilt jar, both themes, both workspaces.
- [x] T6. The five commands of the gate, one commit.

## Review pass

- KDMLLC read: one measure, one rule block, one test file; each decision names what it leaves alone and why.
- Open questions: none left. Settled here: the stacked order and the heights are a judgment on a real phone (D3), not a measure.
- C scan against the repository: `CLAUDE.md` line 56 and the manual line 1501 name #82 as a limit; the first is W-9's (the lists), the second says "the top bar still wraps onto several lines (about 105 pixels), and the regions under it keep the heights they have on a large screen", which stays true and is now measured; W-9 words it.

## After (measured again on the rebuilt jar)

- Layered Brightcart, light: 52 states (the seven pages, ten elements in view / edit / Move / Delete, three stories, seven views): the document is 360 px wide in each, no element is past x 360, the centre has `scrollWidth` 360, no box has text that goes past x 361. Same in the dark theme (52 states). With marketplace drawn, compared with baseline and an element selected (inspection 400 px): 20 states, the same.
- `domain_application`, dark: 20 states (seven pages, four elements in view / edit / Move / Delete): the same; *Confirm delete* of `ArchiTool` has `scrollWidth` 360 (it was 541). The one box that still has text past its own box is the list inside the *Move* dialog (D4).
- Top bar 105, band 80, page tabs 39, tree 240, centre 640, inspection 400, as before: nothing in the layout moved.

## Verification

- `node --test src/test/javascript/viewpoint-kernel/editor-at-360-px.test.js`: 7 tests, pass; on the HEAD `standalone.html` (stash) 4 fail (the rows, the buttons, the list, *Confirm delete*) and the 3 about the wide layout and the markup pass.
- `./mvnw -o verify -DskipITs=false` (JDK 25, `PLANTUML_JAR`): BUILD SUCCESS, 902 unit tests and 21 integration tests, 0 failures (run twice: before and after the header rule moved out of the query; the second is the one of this commit).
- `cargo test --manifest-path src/main/rust/viewpoint-kernel/Cargo.toml`: 213 passed. `src/main/rust/viewpoint-kernel/embed.sh --check`: exit 0.
- `node --test "src/test/javascript/**/*.test.js"`: 1953 tests, 1953 pass, 0 fail (not run at the same time as Maven). A first run failed `header.test.js` ("the strip is gone": a window query must not name the header), which is why the header rule is on the form (D2).
- `npx prettier --check "src/**/*.java"`: clean.
- Browser, on the jar built from this tree: the tables above ("Measures", "After").

## Canonical impact

None for `CLAUDE.md`: it does not describe the stylesheet, and its `[[plateau-limits]]` list names #82 as a limit of the manual, which W-9 rewrites. No domain invariant changes. The manual's *The editor on a small screen* (`src/doc/README.adoc`, line 1501) is W-9's: it can say the bar is 105 px, the band 80 px, nothing past the window, the order and the heights not judged on a phone.

## Findings

- F1. For **#82**: what the issue asked is measured and holds; four places of the forms of the centre did go past the window (not Settings) and are fixed. What is left is a judgment (the stacked order, 30vh and 80vh, on a real phone), which is #29's. The orchestrator can close #82 with the table above.
- F2. For **W-9**: `src/doc/README.adoc` line 1501 (*The editor on a small screen*, #82) and `CLAUDE.md` line 56 (the list of `[[plateau-limits]]`) name #82.
- F3. Not verified: a real phone (touch targets, the on-screen keyboard, a browser other than the pane's); the Native job (no Java class touched).
- F4. The scan rule that found the four places is not in the repository (the harness has no layout engine): it is the table above. A later run that touches the forms measures again.
