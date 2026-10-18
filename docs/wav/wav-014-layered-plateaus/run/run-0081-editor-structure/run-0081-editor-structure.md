---
type: run
run: 0081
status: completed
wave: 014
---

# Run 0081: Editor structure

Wave 014 (`layered-plateaus`), item W-7 (phase P2). Focus: find Applications, Environments, Elements, Stories and Files where the model puts them.

Document profile: `single-document`, as runs 0075 to 0080. The one design fork (what the page *Environments* is) is a decision with a rejected alternative, written below; the rest is the navigation of one page and its tests. A TDD would restate it and a pln would restate a short task list. The review passes are kept (KDMLLC, C scan, open questions) and answered in this file. There is no prd, tdd or pln: the task list below is the plan, and its state is the state of the run.

## Scope

In (the W-7 row of the plan, and the second criterion of the gate of P2):

- The perspectives are Timeline (with the pages Applications, Environments, Elements), Stories in place of Library, Files and Settings. Each page has its address; `#/map`, `#/elements`, `#/library` and `#/stories` still open, each pinned by a test.
- The Timeline page shows the band's plateaus and what changes between them.
- Applications is the former Map; Environments is the technology tree and the pages of an element; Elements is the element tree and its pages.
- Each page has the views (and stories) of its layer, the plateau of the band.
- Files shows the plateau of each manifest, filters by the plateau of the band, and warns about a manifest whose `plateau:` disagrees with the name of its folder.
- Settings has no plateau section for a layered or plateau-less workspace; a workspace with `settings.plateaus` keeps its section until W-10.
- The editor stays responsive at 360 px: the document is measured, and the page was driven in light and dark in the built-in browser.

Out: patches and plateau manifests written by the editor (W-8), the old selector and *Compare to* (W-10), a map of environments (#92).

## The design fork: what is the page Environments

The plan says "Environments = the technology view (the former tree/map of environments as the editor has it today; do not invent a new diagram)". The editor has no map of environments: its Map draws the application layer alone (`buildKernelInput` forces `layer: 'application'` for a map; the manual says "The Map of a technology layer does not exist"). What it has is the tree of the technology layer in the Elements perspective, and the page and the three diagram tabs of the element selected in it.

- (a) **Environments is the Elements perspective with the technology tree alone** (`elementsScope = 'technology'`); the page of the selected environment, node or component is the very page of Elements. Chosen: nothing is invented, nothing is duplicated (one center, one inspection, one set of handlers), and the page that lists both trees stays Elements.
- (b) A new perspective id `environments` with its own render, selection and tab state. Rejected: it duplicates fifteen places that test `currentPerspective === 'elements'` (the address, the diagram host, the selection of a link, the removed pick, the history, the Changes panel), for a page that differs from Elements by its left panel.
- (c) A new map of the technology layer. Rejected by the plan ("do not invent a new diagram"); filed as #92 with what it would take.

Consequences, each pinned by a test: `currentPageId()` is `environments` when the perspective is `elements` and the scope is `technology`; the address is `#/timeline/environments`; an application element is not on that page, so opening Environments with one selected lets the selection go, and an address that names one opens Elements (`widenElementsScopeToSelection`).

## Decisions

Given by the wave plan: D1 to D5, A1 to A9. None of the assumptions failed when tried. Decided here (none contradicts the plan; each is pinned by a test of `editor-structure.test.js`):

- **D1. The navigation is the same for every workspace.** A workspace with no plateau has the band with `baseline` alone (run 0080) and the same four perspectives and pages: what it had as *Map* and *Library* is *Applications* and *Stories*, with the same behaviour and the same saves. "Keeps the pages it has" is read as "loses none". A workspace with `settings.plateaus` has the four perspectives too, no band, the old selector and *Compare to*, and a Timeline page that lists its plateaus with a word on the selector.
- **D2. Two bars.** The top bar has Timeline, Stories, Files, Settings (a click opens the first page of the perspective; the pressed one is the group of the page on screen). The pages below Timeline (Timeline itself, Applications, Environments, Elements) are in a bar of their own under the band, not in the top bar, which at 360 px already wraps. The buttons of that bar are `set-page` (the top bar's are `set-perspective`) so that the focus returns to the one that was pressed.
- **D3. New addresses, and the old ones rewritten.** `#/timeline`, `#/timeline/applications`, `#/timeline/environments`, `#/timeline/elements`, `#/stories` (and `#/stories/views`), `#/files`, `#/settings`. The former `#/map`, `#/elements`, `#/diagram`, `#/library`, `#/library/stories`, `#/library/views`, `#/stories` open the page that took their place and are rewritten by the next drawing (`replaceState`, no new entry). `#/applications` and `#/environments` also open the page they name (a hand-typed address). An address that names nothing opens the default page, Applications (the Map before).
- **D4. The Timeline page is a list, not a table.** One entry per plateau, in the order of the band, indented by depth: name (the button that draws it), id (once, when the name is not the id), horizon, drawn/compared, a line (overrides, where it is written, patches, files), the chips of the Changes panel for elements and relationships over the plateau it overrides (`layerNodeCounts`: the counts of `archicode diff`), and a *Changes* button that draws the plateau and compares it with the plateau it overrides. A list wraps at 360 px where a table does not. With a comparison on, the page has the Changes panel on its right; a row of that panel opens its element in Elements (this page draws none).
- **D5. Stories and views follow the chain.** With layers, `manifestEntries` returns the views and stories of the plateaus of the chain of the plateau drawn (the command line loads them the same way: `LayerLoader`), so every reader of `savedViews()` and `storiesList()` follows. The Stories page says whose they are and how many belong to other plateaus. Drawing another plateau lets go of a story, a view or a story being told that the new plateau does not have. A new story or view takes an id no plateau uses (`takenEntryIds`), so it cannot be declared again in a plateau that overrides (the tree check would flag it).
- **D6. Files filters by the plateau of the band.** *This plateau* (the default), *With its past* (the chain), *All files*. The file that is open and a file that could not be read stay listed. A workspace with no layer has no filter and no badge. The plateau of a file is its header's, else `baseline`; for a manifest of kind Plateau it is the plateau it declares (`filePlateauOf`).
- **D7. The folder warning** (the open question of the plan): a manifest whose plateau differs from the *deepest folder of its path that is named like a plateau of the tree* gets a `folder` mark on its row, a count in the list and a note on its page, with one sentence for the three ways it can happen (the header names another plateau, the header names none so it is `baseline`, a manifest of kind Plateau declares another). A folder that is no plateau says nothing; nothing is refused and the command line says nothing (it never reads folder names). Only a warning.
- **D8. Settings.** It already had no plateau section for a workspace without `settings.plateaus` (its `Manifests` section holds the paths). This run pins it and leaves the section of `settings.plateaus` for W-10.
- **D9. User-visible names.** The headings say *Applications* and *Stories*; the texts that told "on the Map or in Elements" say "in Applications or in Elements". The ids `map` and `library` stay the names the code uses, and the manual says so in its page section. The saved views keep `viewpoint: map` (it is the name of the viewpoint, not of the page).

## Canonical impact

None to the architecture model (no TDD, no `CI-arc` or `CI-dom` packet; the repository declares no register for it). `CLAUDE.md` carries the navigation for the next reader (one sentence added to the paragraph of the band).

## Shipped files

CLAUDE.md asks the plan to name the test that loads each shipped form. This run ships no workspace, fixture or example: the layered Brightcart (loaded by `editor-structure.test.js`, `editor-reads-layers.test.js`, `brightcart-layered.test.js` and `shipped-files.test.js`) is the workspace of its tests, and the small ferry workspaces it writes are built in memory. The page itself, `standalone.html`, is loaded by every node test.

## Tasks

- [x] T1. Read the plan, run 0080, the issues #72, #27 and #82, the routes and their tests, the manual of the editor.
- [x] T2. Routes and pages (`PERSPECTIVES`, `currentPageId`, `pageIdFromHash`, `setPerspective`, `currentRouteHash`, the two bars, the shell row) (`hard_judgment`, inline: it decides what every old link and every test of an address means).
- [x] T3. Applications, Environments (scope of Elements), Elements; the Timeline page and its Changes panel.
- [x] T4. Stories and views of the chain; Stories labels.
- [x] T5. Files: plateau, filter, folder warning.
- [x] T6. 360 px: the page bar, the Timeline list, the Settings fields (#82).
- [x] T7. Tests: `editor-structure.test.js` (new), the tests that pin an address or a label updated.
- [x] T8. The manual (the pages, Files, Timeline, the renamed headings), `CLAUDE.md`.
- [x] T9. The page driven in the built-in browser, light and dark, and measured at 360 px.
- [x] T10. Review pass (a `general-purpose` sub-agent, standard tier, read-only) and its fixes.
- [x] T11. The gate commands, the tests that fail on the old page, one commit.

Routing (Delegation Policy): T2 to T6 are `hard_judgment` and stay inline (they change what the addresses and labels the other tests pin mean). T7 and T8 are standard and were not dispatched: they are written from facts T2 to T6 settle, and a brief would be longer than the files. The review of T10 is the one dispatch.

## Review passes, answered

- **KDMLLC, C scan and defect hunt (a `general-purpose` sub-agent at the standard tier, read-only, on the diff, the plan, run 0080, the manual text and the tests; 10 findings, one S1/S2, three S2).** The agent also reproduced two of them in the node harness. Applied:
  - **1 (S1/S2)** filtering the views and stories by chain made the writers blind to those of the other plateaus: a rename of an element left the views, and the steps that carry their own view, of a plateau that is not drawn pointing at the old reference; the count of a move and the warning of a delete read the same filtered lists; a legacy entry of `workspace.yaml` could be moved onto the id of a manifest of another plateau. Now `allSavedViews()` and `allStories()` (every plateau) are what `rewriteSavedViewReferences`, `scanMoveReferences`, `storiesUsingView` and `legacyEntriesToMove` read; `entriesOf` shadows an entry of `workspace.yaml` by a manifest of any plateau. Tests: rename, delete count, move count, legacy move.
  - **2 and 3 (S2)** the page Environments was widened to Elements only from `hashchange`: a bookmark that names an application element, a link from an environment to one of its applications (`goto-element`) and a row of the Changes panel left an application element selected beside a tree that does not list it, and wrote an address that the next load turned into the same broken state. `widenElementsScopeToSelection()` is now called by `applySelectionFromHashRef` (every reading of an address, the load included) and by `render()` (every other way a selection is made). Tests: bookmark, link, row.
  - **4 (S2)** the Changes panel of the Timeline page could stay on "Reading..." for ever (a workspace with `settings.plateaus` and a remembered comparison, opened on `#/timeline` before the kernel is loaded): the Timeline page mounts no diagram, which is what loads the kernel and writes the panel again. `settleTimelinePanel()` does it, called by `render()`. Test: the function, and the call in `render()` read from its source (the harness does not draw the page).
  - **6 (S3)** the Timeline page computed the counts of every plateau at its first drawing, which the band avoids on purpose (one plateau per turn). It shows the counts that are cached, says "Counting..." for the others, and the step of `scheduleBandCounts` writes them into the entries as they come. Test: `cachedNodeCounts` is undefined at the first drawing.
  - **7 (S3)** the status said the Changes panel lists what differs when the comparison had mistakes and no panel: it says the two cannot be compared. **8 (S3)** a row of the Changes panel on the Timeline page left no entry in the history for the page it left: it pushes one. **10 (S3)** `overflow-wrap` on the id and the horizon; the manual says a file row "says" its plateau, after its name.
  - **9 (S3)** not changed: a story told (`activeStory`) can stay in the address if the chain changes by an edit rather than by drawing another plateau; edits happen only on `baseline`, whose chain does not change, so no path leads there today. W-8 should look again when an edit can add or remove a plateau.
  - **10 (S3), wording not changed:** "Show on map", "Selected on the map", and "Map of ..." in the name a view is given are the name of the drawing and of the viewpoint (`map`), which the saved views keep; the manual says so.
- **C scan.** The manual sections added (the perspectives and their pages, Files, the Timeline page) were read against the code; every `<<anchor>>` they use exists (`editor-band`, `editor-pages`, `editor-timeline`, `editor-files`, `editor-map`, `editor-stories`, `editor-elements`, `editor-plateaus`, `technical-configuration`); the one sentence that over-promised (a link to an application element opens Elements) is true now (finding 3). The routes of the manual are those of the table `PERSPECTIVES`, the counts of the Timeline page are those of `archicode diff` (the test reads them from `expected/comparisons.json`, as run 0080 does).
- **Open questions.** The plan leaves one to this run, how Files shows a manifest whose `plateau:` disagrees with its folder: D7. Raised and settled: what Environments is (the fork above), the default of the Files list (the plateau of the band; the choice is on the page), whether a workspace without plateaus has the Timeline page (yes, D1). Left to the author: whether Environments should draw a map of the technology layer (#92).

## Findings

- **F1. For W-8: the interfaces.** `PERSPECTIVES` (`label`, `group`, `route` of each page), `PERSPECTIVE_GROUPS`, `TIMELINE_PAGES`, `currentPageId()`, `pageIdFromHash()`, `perspectiveIdFromHash()`, `elementsScope` ('all' | 'technology'), `setPerspective(id)` (accepts `environments`), `renderPageTabsHtml()`, `renderTimelinePerspectiveHtml()` / `renderTimelinePageHtml()` / `timelineItemHtml(item, depth)` (the entry of a plateau: W-8 puts *create a successor*, name, horizon and parent there; its buttons are `timeline-draw` and `timeline-changes`), `showPlateauChanges(id)`, `cachedNodeCounts(id)`, `layerChainSet()` (the plateaus whose views and stories a page shows, null without layers), `manifestEntries(kind, all)`, `allSavedViews()`, `allStories()`, `takenEntryIds(kind, key)`, `filePlateauOf(mf)`, `filesScope` and `FILES_SCOPES`, `filePlateauFolderWarning(mf)`. A new manifest that the editor writes for a view or a story is written with no `plateau:` header today, so it belongs to `baseline`, which is the only plateau that can be written: W-8 must write `plateau:` when it lets another plateau be written, and `layerChainSet()` will then show it where it belongs.
- **F2. For W-10: what stays of the old mechanism.** The Timeline page of a workspace with `settings.plateaus` (`!AppState.layers`) lists `AppState.plateaus` and says the selector draws them; the Settings section `settings-plateaus` is the other place. Both are guarded by `AppState.layers` being null.
- **F3. #82 re-measured** (below, Verification): the top bar is 105 px at 360 px on a layered workspace (the plateau buttons are gone), 177 px with `settings.plateaus` (two plateaus); the Settings fields no longer go past the window. Not changed: the heights of the stacked regions (80vh for the centre, 30vh for the tree), and the 151 px of the band.
- **F4. #27** says "the Changes tab on the Library page": that page is Stories now. Its wording needs the new name; the issue is left open (the Changes panel is not on the page of a view, as before).
- **F5. Filed:** #91 (an address typed while the editor is open does not draw the plateau it names: `plateau=` and `compare=` are read at opening only), #92 (Environments has no map of its own: the question for the author). Nothing else out of scope was found.
- **F6. Outside `likely_paths`:** `CLAUDE.md` (one sentence), and the run's own documents. Inside: the page, `src/doc/README.adoc`, `editor-structure.test.js` and the nine existing test files under `src/test/javascript/viewpoint-kernel/` that pinned an address, a heading or the top bar. No Java, Rust or wasm file changed: the views of the command line are unaffected, and no differential check of them was run (none needed).

## Verification

With `JAVA_HOME=/home/tibo/.sdkman/candidates/java/25.0.4-tem` and `PLANTUML_JAR=/home/tibo/git-perso/plantuml-libs/.workdir/.cache/plantuml-1.2024.7.jar`, on the final tree (the gate commands ran after the last edit of the page, the tests, the manual and `CLAUDE.md`; this document and the commit came after).

- `./mvnw -o verify`: BUILD SUCCESS, 685 tests, 0 failures, 0 errors, 0 skipped (the same 685 as before this run: no Java file changed). `cargo test --manifest-path src/main/rust/viewpoint-kernel/Cargo.toml`: 182 passed. `src/main/rust/viewpoint-kernel/embed.sh --check`: "the committed WebAssembly is the one the sources build (712646 bytes)", exit 0. `node --test "src/test/javascript/**/*.test.js"`: 1428 tests, 1428 pass (1378 before: +50 in `editor-structure.test.js`). `npx prettier --check "src/**/*.java"`: clean. No Java, Rust or wasm file changed, so the views of the command line are unaffected (no differential check of them was run).
- **The tests fail on the old page.** With the page of `HEAD` in place (restored, `cmp` identical), `editor-structure.test.js` gives 39 of its 42 tests of the time failing (the three that pass are guards: a workspace with no layer lists every file with no filter and no badge, Settings has no plateau section, and a new story takes an id no plateau uses: the old page listed every story, so it passed), and the nine existing files whose pinned addresses, headings or top bar this run changes give 26 more failures. The tests added after the review (50 in all) were checked one change at a time: undoing the use of every plateau in the rename, the widening of the page Environments (the address, the drawing), the count of a delete, the legacy move, or the entry of the history each makes one test fail; `settleTimelinePanel` called from `render()` is read from the source, the harness not drawing the page.
- **The routes** (each a test of `editor-structure.test.js`, and read in the pane): `#/map` opens Applications, `#/map?pin=...` keeps its parameters, `#/elements` and `#/elements?ref=...` open Elements, `#/diagram?ref=...&vp=overview` opens Elements on the tab, `#/library`, `#/library/stories` and `#/stories` open the Stories side, `#/library/views` the Views side, `#/stories?story=...` keeps the story; `#/applications` and `#/environments` too; a bookmark that is loaded with one of them opens the same page. In the pane, with the address typed into a loaded editor and with the address of a fresh load (`#/library/views`), each of the former ones opened its page and was rewritten to the new address.
- **The navigation** (read from the page in the pane, the layered Brightcart, light and dark): the top bar `Timeline | Stories | Files | Settings`, the bar `Timeline | Applications | Environments | Elements` under the band; Environments lists `Partners (live)`, `Partners (sandbox)`, `Production`, `Staging` and an environment opens its Details with the Overview, Detailed and Deep tabs; Files with `This plateau`, `With its past`, `All files` lists 17 files for `marketplace`, 46 with its past, 50 in all, and `33 files of other plateaus are not listed`; two files that I added to the scratch copy (one in `inhouse/` that says `plateau: saas`, one in `saas/` with no header) had the `folder` mark, the sentence on the row and the warning on their page; Stories says `The stories of Marketplace and personalisation and of the plateaus it overrides (baseline, inhouse)`; Settings has `Appearance, Workspace, Manifests, Relationships, Views, Facets` and no plateau section.
- **The counts read from the Timeline page in the pane** (dark, then light), the Changes panel and the page agreeing with `archicode diff`: inhouse over baseline +17 ~5 -1 (7 moved, 2 split, 1 merged), relationships +17 ~1 -6; marketplace over inhouse +21 ~12 -5 (5 moved), relationships +18 ~1 -3; saas over baseline +3 ~5 -11, relationships +5 ~1 -12; inhouse against saas (the button of the band) +27 ~4 -3 (2 split, 1 merged), relationships +25 ~0 -7. They are the four pairs of `expected/comparisons.json`.
- **At 360 px** (the pane emulating 360x800; measured with `getBoundingClientRect` and `scrollWidth`): on Timeline, Applications, Environments, Elements, Stories, Files and Settings the document is 360 wide, the centre panel's `scrollWidth` is 360 and no element is past the window (the tree of the band scrolls inside itself, as before). Top bar 105 px, band 151 px, the bar of the pages 39 px. Before this run's CSS the pages below Timeline were 387 wide (the four buttons of the new bar); with `settings.plateaus` (`plateau-comparison`): top bar 177 px, all seven pages 360 wide. #82: Settings inputs ended at x 404 and 474 before, none is past 360 now (a comment is on the issue).
- **Contrast** (computed in the pane from the colours of the page): the new texts and badges are between 5.3:1 and 16.3:1 in light and between 5.3:1 and 12.4:1 in dark (the muted text of the Timeline entries and of the Files list, the pressed buttons, the badges).

## Not verified

- **The page was not looked at.** The pane's screenshot timed out on every try (one 240x150 thumbnail of Settings came back, too small to judge): the pages were driven, read and measured, not seen. The look of the Timeline list (the indent by depth, the chips), of the bar of pages and of the Files filter is unseen.
- Other browsers than the pane's; touch; a keyboard walk of the new bars (the focus stays on the button pressed, read from the page for the page bar, not for the Files filter and the Timeline buttons); a screen reader.
- A folder opened through the File System Access API (served mode only), a workspace of thousands of plateaus or files (the Timeline page computes the counts one plateau per turn, as the band does, but its list is built whole), Windows.
- `story=` left in an address after a change of chain by an edit (finding 9: no path leads there while only `baseline` is written).
- The native image (the page is not compiled into it differently, but it was not built).

## Issues

Filed: #91 (an address typed while the editor is open does not draw the plateau it names), #92 (Environments has no map of its own). Commented: #82 (the measures above). Not closed: #72 (the whole Timeline is W-6 to W-8), #27 (its wording says the Library), #82.
