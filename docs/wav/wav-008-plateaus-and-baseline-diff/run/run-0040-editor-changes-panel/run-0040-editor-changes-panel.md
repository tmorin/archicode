---
type: run
run: 0040
status: completed
wave: 008
---

# Run 0040: Editor changes panel

Wave 008 (`plateaus-and-baseline-diff`), item W-7 (phase P3). Focus: list the changes, open one to see what changed in it, and hide the
noise. Document profile: `single-document`, with a TDD-lite section (the Decisions below), as runs 0034 to 0039. The scope arrives settled
(the W-7 row, run 0039's interface and the brief); the work is one file (`standalone.html`) and its tests. This file carries scope,
decisions, canonical impact, verification and findings. **The Decisions are written as the work goes** (an earlier executor of this wave died
with code and no recorded reasons) and are in the order they were taken.

## Context

Run 0039 made the editor read a second plateau, compare it (`comparisonState()`), draw the union with the four states and a legend, and open
a read-only panel on a removed box. Nothing lists the changes, nothing says *what* changed in a changed element, `only_changes` is not used,
wording-only changes cannot be set aside and the address does not carry a removed element. This run adds the reading tools.

## Scope

In: `standalone.html` (the Changes panel, the "What changed" block, the Changes only filter, hide wording-only, the address, the chips in the
two trees), the tests under `src/test/javascript/viewpoint-kernel/`, the manual's `editor-compare` section, a look at the real page.
Out: the Rust and the wasm (a kernel defect is a finding), any Java, the CLI parts of the manual, `replaces` and the next wave.

## Decisions

Taken by the author (the brief; not reopened): the Changes panel (counts, then Elements and Relationships lists), a state chip with a glyph
and a word, never colour alone; the before and after in the inspector; a "Changes only" filter (`only_changes`, context faded and told in the
legend); wording-only changes visible by default, counted apart, hidden in one click; the selection carried in the address; with Compare to
`Nothing` the editor draws and behaves exactly as today.

Taken by this run (the order they were taken in; each is amended in place if the work disproves it):

- **D1. Where the Changes panel lives: the right-hand panel, as a tab beside "Selected".** The Map and Elements already have `#panel-right`
  (the inspection of the selected element, link or removed box; nothing is rendered there while nothing is selected). With a comparison on,
  that panel always exists on those two perspectives (on Elements: with a diagram tab shown *or* any comparison) and holds two tabs, `Selected`
  (only when something is selected, a removed box included) and `Changes` (with the number of rows). Nothing selected: the Changes tab alone,
  with no tab strip, so the list is reachable without a click. Something selected: `Selected` first, as today; one click on `Changes`
  shows the list. The `Changes` tab is a pick valid only while the page's selection is what it was (the idiom of `removedPick`: no place to
  remember to clear it), so a click on a row, which selects something, lands on `Selected`; the tab `Changes` brings the list back with the row
  of the selection marked. Not on the page of a view in the Library (its panel is the view's own); the "What changed" block works there too,
  since it lives in the inspection. Rejected: a new fourth region (the grid has three), a modal list, a section stacked under the inspection
  (the panel is 18 rem wide and the list is long).
- **D2. Order of the lists.** Grouped by state, in the order a reviewer reads them: new, changed, removed; inside a group, the kernel's table
  order (the union's: by reference). The kernel's table is by reference only, which interleaves the three states; a state chip on every row
  already says it, and the grouping makes "what is new" a block. Relationships are listed the same way.
- **D3. Nature words.** The kernel's closed list in words: `kind`, `name`, `description` (marked "wording" when it is the only one),
  `qualifiers`, `tags`, `deployment`, `relationships added`, `relationships removed`, `relationships changed`; for a relationship `label`,
  `qualifiers`, `tags`.
- **D4. The row of the list and the chip.** A chip is the pill the boxes already carry (`stereotypeBadgeVarsOf`, so an entry of the workspace's `styles`
  with the name of the state styles it here too) with the glyph (`+ ~ −`), then the word, always both; the counts use the same chip with the number
  between them (`+ 2 new`). A row is one `<button>` (keyboard and screen reader for free): chip, name and reference, then, for a changed element,
  the natures in words; a relationship row reads `source → destination “label”`, and, for a pair whose label changed, `“before” → “after”`. The row of
  the selection is marked (`aria-current`, an accent bar: not colour alone). The words of the natures: `relationships added` for
  `relationships-added`, and so on; a change of the description alone reads `description (wording only)`.
- **D5. What a click on a row does.** It selects the thing as a click on its box or link does, then shows it. Element (new or changed): the element is the
  selection (`ref=` in the address, the trees open down to it). Removed element: run 0039's `removedPick` (nothing else selected on the Map; the element
  of the diagram stays the subject in Elements) and its read-only panel, no second copy of it. Relationship: its link is selected (`select-link`'s
  selection) on the Map, and in Elements the declaring element is selected and, when its diagram is shown, the link over it. On the Map the boxes that
  enclose the thing are **opened** (`mapOpened`), so that it is drawn, and the view is **centred** on it (`diagramScale = 'auto'`, what the Center button
  does): a list that selects something you cannot see would be no list. A pin or a hidden element the user chose is not undone: the panel's existing
  "Not on the map right now" note says so. A row of the technology layer on the Map selects the element (the Map draws applications only, its panel says
  so already).
- **D6. The "What changed" block** is part of the inspection (`inspectionPanelHtml`), so it is in the panel of the Map, of Elements and of the page of a
  view in the Library. **It comes first**, right after the name and the badges (it was last at first; on the real page a long description pushed it
  out of sight, which is what the screenshot showed). A *changed* element: the natures in words, then each property that differs with `Before` and `After` on two lines (a word and a
  sign, the old value struck: nothing relies on colour), straight from the table's `before`/`after`; then its relationships that are new, changed or
  removed, each a line with its chip (a label-changed pair reads as one changed relationship with its label before and after). A *new* element: "Whole
  element is new", its properties being the ones the panel lists below the block (copying them in the block would say everything twice), then the relationships it
  declares. A *removed* element: it is added to run 0039's panel, which already lists the properties and the relationships: the block only says "Whole
  element is removed", it does not repeat them. A *link*: its state (the kernel's rule for a grouped link: all new, all removed, a mixture is changed) and,
  on each relationship it groups, that relationship's chip and, when it changed, what it was and what it is.
- **D7. Changes only is a control in the header, next to Compare to** (a button group `Everything | Changes only`, only while a comparison is on), not in
  the diagram toolbar: it is a way of reading the *comparison*, so it lives with Compare to, it is one control for the Map, the diagrams of Elements and the
  page of a view in the Library (three toolbars would be three controls that must agree), and the header already wraps. It sets `only_changes` in
  `buildKernelInput`, the one place that builds the input for all three, so it composes with the pins, the hidden elements, the facets and
  *Hide unlinked* as the kernel composes them (run 0037's order). It is remembered per folder in this browser (`archicode-standalone-editor:flag:changes-only:...`
  with the in-memory fallback, like Compare to), not in the address.
- **D8. Context is drawn faded and says nothing of itself.** A box the kernel keeps only to place the changes (`context`) gets `dg-context` (opacity .55),
  **no state**: no glyph, no pill, no tint, no `±`: its ancestors would otherwise all be marked `contains-changes`, which is noise in a view that is all
  changes. **The focal box is the exception**: it is the element the diagram is about, always kept, so it is never faded and keeps its state as in the full drawing (a focal box that
  contains changes keeps its `contains-changes` marker, and the key counts it; the first real look of a view's page, where it lost its marker, showed this). The key gets a fifth entry, "context, faded: shown to place the changes", with a faded sample
  and the number of such boxes, and only when the drawing has some. The tooltip and the `aria-label` of the box say "context". The SVG export has the same
  rule.
- **D9. Hide wording-only changes is a checkbox in the Changes panel**, off by default (wording-only changes are visible and counted apart), remembered per
  folder. **Where it is applied: on the input.** `comparisonState()` gives, with the toggle on, a union in which the elements whose natures are exactly
  `description` are `change: none` (no natures), so the drawing does not mark them, `compute` computes its `contains-changes` marker and `only_changes` from
  that input (a container whose only change below it is wording is no longer marked, and `only_changes` does not keep the wording-only element), the list
  drops their rows, `counts.elements.changed` drops by their number, and the panel says "N wording-only changes hidden". With the toggle off the panel says
  how many of the changed elements are wording only. Relationships are never hidden by it (a relationship change is structure). The layout is not
  disturbed: the union has the same boxes either way; only the state of a box moves.
- **D10. The address.** A selected element or link is carried as it always was (`ref=`, `link-from=`/`link-to=`): a changed or new element, or a relationship,
  reopens on reload with nothing new. A removed element is carried as `removed=<reference>` (and `removed-layer=technology` for the other layer), **together with
  `compare=<the choice>`** (`@baseline` or a plateau id), because a removed element exists only next to its comparison: an address that names it must name
  that. On load `compare=` wins over what the browser remembered for the folder and is remembered like a choice made (a link shared with someone who had
  `Nothing` therefore opens the same picture); `removed=` becomes the page's pick, as a click would make it, and the panel waits for the kernel
  (`{pending}`); the address keeps it while the kernel loads and drops it when the comparison does not have the element. `Changes only` and the
  wording-only toggle are choices of whoever looks (remembered per folder, like the Plateau and Compare to) and are not in the address; `compare=` is
  written only with a removed element, not with every address, so that the address of a page with a comparison but no removed selection is what it was.
  The Changes tab itself is not in the address (it is a view of the panel, like a scroll).
- **D11. The trees show the state of an element after its name; removed elements stay out of them.** With a comparison on, a row of the Elements tree and of the
  tree of the Map gets a small glyph in a thin box: `+` (new, solid line), `~` (changed, dotted), `±` (unchanged, something below it changed, dashed); the word
  is the tooltip and is added to what a screen reader reads (the glyph is `aria-hidden`). It is the same table as the boxes use, read from the union, so the
  trees and the diagrams cannot disagree. A removed element is **not** listed in either tree: it is not an element of the plateau drawn, so it could be neither
  pinned nor hidden nor opened for editing, and rows that do none of the things a row of that tree does would break its contract and its keyboard tests. The
  Changes panel lists them and opens their read-only panel. Chosen because it is the simpler of the two and leaves the trees' behaviour untouched; a "Removed"
  group would need rows of a new kind in a tree whose rows all select, fold, pin or hide. The lookup is made once per tree (`treeComparison`), not per row.
- **D12. The Changes panel is not on the page of a view in the Library.** That page's right panel is the view's own (its attributes and the inspection of
  what is selected in its diagram, which has the "What changed" block). Adding a tab there would make the panel of a view carry the state of the page, which it
  does not. Said, not done.
- **D13. One existing test had to change, and why.** `a click on a removed box shows what the other plateau had...` (run 0039) asserted that after the cross of
  the panel the Map's right region was empty. With a comparison on that is exactly what this run's brief forbids (the Changes panel must be reachable
  without a click when nothing is selected), so the assertion now says that the inspection is gone and the Changes panel is what is left. Every other
  test, including the ten pinned drawings and the legend of `Nothing`, is untouched and green.
- **D14. The state of a link with one relationship.** The kernel's aggregate for a grouped link ("any other mixture is changed") also covers a link that
  stands for a single changed relationship; the sentence of the block says "The relationship it stands for changed" for it, not "not all the same"
  (the first real look showed the wrong sentence). A link of one new or removed relationship says "is new", "is removed".
- **D15. The tabs are sticky and the Changes tab scrolls to the selection.** The list is long (167 rows on the real pair), so the tab strip stays at the top
  of the panel while it scrolls, and a click on the *Changes* tab brings the row of the selection into view (`scrollChangesToSelection`, consumed by the
  next `render()`).
- **D16. Not done / limits.** No "next change / previous change" buttons (the list is the way through). No filter by state or by layer in the list. A row of
  a relationship in Elements selects the link only when the declaring element's diagram is the one shown. The Changes panel is not on the page of a view
  (D12). These are listed in the findings.
- **D17. One contract file for the CLI and the editor (the P3 gate: "give the same counts as the editor on the same pair (a test compares them)").**
  `src/test/resources/plateau-comparison/expected-counts.json`, inside the invented bookshop of `PlateauComparisonTest`, holds for `to-be` against `as-is` the
  counts (elements new/changed/removed/wording_only, relationships new/changed/removed), the number `--no-wording` hides, and the table (thing, layer, reference,
  destination and label of a relationship, change, natures; in the kernel's order). It was written from the output of `archicode diff --format json`, the reference
  side. Java: `PlateauComparisonTest.theCliGivesTheCountsAndTheRowsOfTheFileTheEditorReadsToo` asserts `diff --format json` (counts and every row), the
  `hidden_wording_only` of `--no-wording` and the counts printed by the text and Markdown forms against the file. JS: `cli-editor-counts.test.js` loads the
  same folders through the editor's own `loadWorkspace`, `switchPlateau` and `setCompareTo`, the embedded kernel through `comparisonState()`, and asserts the same
  file, plus the editor's toggle: `wordingHidden` equals the file's hidden number, `changed` drops by it, the rows lose exactly the wording-only ones. A last test
  checks that the Java side still names the file. The fixture was not extended: it covers name, description (wording), qualifiers, deployment, label and the
  three relationship natures of an element; `kind` and `tags` are covered by the kernel's own tests and are not in this contract (adding them would change the
  exact text the existing Java tests assert). **`src/test/java/**` and `src/test/resources/**` are outside this run's declared `likely_paths`; this fix needs them.**

## Canonical impact

None to canonical documents (`docs/` holds the run and wave records only). The manual (`src/doc/README.adoc`) gets four short subsections under
`editor-compare` (`editor-changes-panel`, `editor-what-changed`, `editor-changes-only`, `editor-changes-address`); the CLI parts are not touched.
`CLAUDE.md` needs nothing from this run (the architecture paragraph could name the editor's comparison: the orchestrator's call, as runs 0035 to 0039 said).

## Tasks

| Id | Task | Status |
|----|------|--------|
| T1 | Read the wave plan, runs 0036, 0037 and 0039, the right-hand panel, the hash router, the trees, the harness | done |
| T2 | Flags in `AppState` (`changesOnly`, `hideWording`), remembered per folder; `comparisonState()` with wording set aside, `above`, counts | done |
| T3 | The Changes panel, the chips, the lists, the tabs of the right-hand panel, `selectChange` | done |
| T4 | The "What changed" block (element, removed element, link) | done |
| T5 | Changes only: the header control, `only_changes`, the faded context, the key, the export CSS | done |
| T6 | The address: `removed=`, `compare=`; the marks in the two trees | done |
| T7 | Tests (`changes-panel.test.js`, 46) | done |
| T8 | The real page, light and dark, on a copy of the real pair | done |
| T9 | The manual | done |
| T10 | `node --test`, `./mvnw -o verify` | done |

## Acceptance criteria (the W-7 row and the brief)

- AC1. A Changes panel with counts and two lists, state chips with a glyph and a word, an order, the natures in words; on the Map and in Elements, reachable
  without a click when nothing is selected; a click selects, centres and opens: `with a comparison the right-hand panel is the Changes panel...`, `the
  counts...`, `a chip is its glyph and its word...`, `the lists...`, `the rows are in the order...`, `a row is a button that selects...`, `with something
  selected the panel has two tabs...`, `a click on an element row...`, `a click on a removed row...`, `a click on a relationship row...`, `in Elements a row...`.
- AC2. The before and after of the inspector for a changed, new and removed element and for a link, from the table: the five `What changed` tests.
- AC3. Changes only on every host, with the pins and the hidden elements, faded context, no state on it, the key says it, the export agrees: the six tests of
  section 5.
- AC4. Hide wording-only changes: off by default, counted apart, applied on the input so that the marker and `only_changes` follow, remembered: the five tests of
  section 3.
- AC5. The selection in the address round trips, and `compare=` goes with a removed element: the six tests of section 6.
- AC6. The marks in the two trees, removed elements out of them: the two tests of section 8.
- AC7. `Nothing` is today's editor: `with Compare to Nothing none of it is on the page...`, the ten pinned drawings and the legend of run 0039 (untouched), and the
  existing tests (one assertion changed, D13).
- AC8. The real page in light and dark: see Verification.

## Review passes

Run inline (one document; no subagent dispatched, as in runs 0034 to 0039).

- **KDMLLC.** K: one function knows the comparison (`comparisonState`), the wording-only override is one function (`setWordingAside`), the right-hand panel is
  one wrapper (`withChangesPanel`) around the inspection that already existed, the chips are one function, the trees read one lookup; nothing was added to the
  Rust or the Java. D: the look of a state is read once (the same pill as on the boxes); the list's natures, the block's and the table's are one list
  (`NATURE_WORDS`); the one place a selection is made from a row is `selectChange`. M: each rule of the brief has a test (the AC list), and each state is tested
  on a chip, a row, the block, a box, a link, a tree row and the key. L: no next/previous, no filters, no tab on the page of a view, no Rust change, no new kernel
  input but `only_changes`. U: the decisions say why (the block comes first; `compare=` only with a removed element; removed elements out of the trees). C: below.
- **C scan.** Claim "with `Nothing` the editor draws and behaves exactly as today": the ten pinned drawings and the legend of run 0039 are untouched and green, a
  test lists what is absent (`with Compare to Nothing none of it is on the page`), and one assertion of run 0039 had to change (D13) because it said that the
  right region is empty with a comparison on and nothing selected, which is the opposite of this run's brief; that is said, not hidden. Claim "the wording-only
  toggle keeps the marker and the filter coherent": proved on the input (the kernel computes both from it) by the two tests that draw with it on. Claim "a
  shared link reopens the same selection with the same comparison": proved by the round trip, with the cases the kernel loading late and the element gone.
  **A claim that is only partly true:** "a click on a row centres the element on the Map": it does when the drawing does not fit (the view is put on it) and
  when the box is in a part of a large drawing that the edges clamp (the view never goes past the drawing); on the real page the box was in view but not
  always in the exact middle. Said in the findings.
- **Open questions.** None left.

## Verification

All with the repository's own commands. `JAVA_HOME=/home/tibo/.sdkman/candidates/java/25.0.4-tem` for Maven.

### Results

- `node --test "src/test/javascript/**/*.test.js"`: 750 tests (700 before, plus the 46 of `changes-panel.test.js` and the 4 of `cli-editor-counts.test.js`), 750 pass, 0 fail.
- `./mvnw -o verify`: BUILD SUCCESS, 237 tests, 0 failures, 0 errors (the Java was not touched; the asciidoctor step ran, the four new anchors are in the
  generated manual; its only errors are the two PlantUML-diagram ones that exist without this run, and the two `possible invalid reference` infos of an
  existing sentence).
- `cargo test` and `embed.sh --check`: not run, the Rust and the wasm were not touched. `npx prettier`: no Java was touched.
- **The editor's counts on the real pair** (the copies arranged as two plateaus, the built jar, `editor serve`): elements **38 new, 26 changed (10 wording only),
  5 removed**; relationships **71 new, 12 changed, 15 removed**, the counts of runs 0036, 0038 and 0039; 167 rows in the Changes tab; with *Hide wording-only
  changes* on: 16 changed and "10 wording-only changes hidden", 157 rows.
- **The real page** (the built jar, `editor serve` on two copies of the real pair in the scratchpad, one with the author's `styles`, one without; the snap
  `firefox.geckodriver` driving a headless Firefox over WebDriver with a small script of this run; the theme set through the Settings key; the built-in
  browser pane was not used, its screenshot times out here). Every screenshot named here was opened and looked at. The originals (`as-is`, `to-be`) were only
  read: the `md5sum` of their 91 files is the same before and after; the servers were stopped. No client text is in this document or in the repository.
  - *The Changes panel, Map, light.* With `Compare to` on the baseline and nothing selected, the right-hand panel is `Changes`: the compared-with line, the
    chips `+ 38 new`, `~ 26 changed`, `− 5 removed` and `+ 71 new`, `~ 12 changed`, `− 15 removed` (each a glyph, a number and a word in a thin coloured pill),
    the checkbox, "10 of the changed elements are changes of wording only", then `Elements 69` and the rows (a `+ new` chip, the name in bold, the reference
    in grey). The header shows `Everything | Changes only` after *Reload*; the tree of the Map has a small boxed `+`, `~` or `±` after the name of the
    elements that are new, changed or contain changes (and the author's own `new`/`changed` pills next to it).
  - *A click on a changed element* (a person with one relationship whose label changed): the panel is on the `Selected` tab (a strip `Selected | Changes 167`,
    the pressed tab blue), the name and badges, then the block `What changed ~ CHANGED`, "Changed: relationships changed", the relationship with its chip,
    its target, its label, "Changed: label" and `Label`, `− Before` (the old label struck) and `+ After`; the kind, layer, id, description follow. The Map
    keeps the box outlined.
  - *The list again*, from the `Changes` tab: the row of the selection has an accent bar and is scrolled into view (the first look showed that the list
    opened at its top: fixed, D15).
  - *A removed element*: the panel is run 0039's read-only one with the pill `removed`, its note, then `What changed − REMOVED`, "Whole element is removed. Its
    properties and its relationships are the ones below."; the box on the Map is outlined; the address reads `#/map?removed=<reference>&compare=%40baseline`.
  - *A relationship row*: its link is selected on the Map, the boxes around its two ends are opened, the panel is `Selected link` with `What changed ~ CHANGED`,
    the relationship with its chip and `Before`/`After`. (The first look showed "not all the same" for a link of one relationship: fixed, D14.)
  - *Reload with the removed element in the address*: the page reopens on the same element, with the comparison, and writes the same address again.
  - *Changes only, Map*: the map falls from 13 items to 10: what is new or changed stays, and two unchanged boxes that are ends of changed links are drawn
    faded, with no pill and no mark, their tree rows greyed; the key says "context faded: shown to place the changes 2 boxes". *Changes only, Elements* (the
    deep diagram of a new system): the unchanged boxes outside the changes are faded, the focal box is not; the key counts 4 context boxes. *Changes only, page of
    a view in the Library* (the real workspace has saved views): the diagram keeps the changes; the focal element of the view is kept and not faded.
  - *Hide wording-only changes*: the counts say 16 changed and "10 wording-only changes hidden"; the list loses ten rows; the boxes of those elements are drawn
    unchanged; the tree row of a container that only they changed loses its `±`.
  - *Dark*: the same screens. The greens, oranges and greys of the chips, the lines and the glyphs read on the dark background; the faded boxes are still told
    from the others by their lack of a pill; the tabs, the counts' pills and the accent bar read. (One defect seen and fixed: the count pill of the pressed tab
    was drawn blank, now `color: inherit`.)
  - *At 700 px* the panel keeps its tabs and its block; the centre of the page is narrow, as it already was with a selection.
  - *`Nothing`* after a comparison: the same page as before, no tab, no block, no mark, no `Changes only`.

## Findings

- **For the wave (W-8).**
  - The editor's counts on the real pair equal the study's and run 0038's (38 / 26 / 5 and 71 / 12 / 15); with the toggle: 16 changed, 10 wording only hidden.
  - The real workspace *does* have saved views (a Library page with a comparison was looked at in this run, which run 0039 could not do).
  - **Found and fixed on the real page:** under `only_changes` the kernel calls the focal item `context` when it did not change itself; drawn as context
    (faded, no state) it lost the `±` mark it has in the full drawing. The focal box is now the one context item that keeps its state (D8). The kernel is
    unchanged and right: `context` says "kept for no change of its own", which is true of the focal box.
  - The author's hand-written `new` and `changed` tags (still in the real `styles`) now sit beside the computed state: a box says `changed` and `new`, or
    `external` `changed` and the computed pill; the author may drop the tags.
- **Limits and not done:** no next/previous change; no filter of the list by state or layer; the Changes panel is not on the page of a view; the relationship
  row in Elements selects the link only when the declaring element's diagram is shown; the click on a row centres the element only as far as the Center rule
  can (the drawing's edges clamp it).
- **`CLAUDE.md`'s architecture paragraph** could name the editor's comparison (the orchestrator's call).
- **Files touched outside `likely_paths`:** `src/test/java/io/morin/archicode/cli/PlateauComparisonTest.java` and
  `src/test/resources/plateau-comparison/expected-counts.json` (D17: the one contract file). Besides: `src/main/resources/editor-webapp/standalone.html`,
  `src/test/javascript/viewpoint-kernel/changes-panel.test.js`, `src/test/javascript/viewpoint-kernel/plateau-compare.test.js` (one assertion, D13),
  `src/doc/README.adoc` and `docs/**` of this run.
- **Not verified.**
  - The editor in Chromium, Edge or Safari (Firefox only), and the File System Access picker (served mode only).
  - The built-in browser pane (could not draw a screenshot).
  - A pair of plateaus larger than the real one (about 170 elements; the Changes list of 167 rows rendered and scrolled without a visible delay).
  - Windows or touch devices; a screen reader (the chips carry the word, the tree marks are `aria-hidden` with the word in the row's label, the tabs are
    buttons with `aria-pressed`; nothing was listened to). Colour-vision simulation (the glyph, the word and the line carry the meaning; no simulator was run).
  - The PNG download of a Changes only drawing (the SVG export carries the faded rule by test; the page's own SVG was looked at).
  - The ELK layout in the node tests (the harness has no ELK: the markup is checked there, the layout on the real page).
  - `Changes only` on the Map with a pin or a hidden element on the real page (the kernel composes them by run 0037's tests, and a test here checks the input; not
    looked at).
