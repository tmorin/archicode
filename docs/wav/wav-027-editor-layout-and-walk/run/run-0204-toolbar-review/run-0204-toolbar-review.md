---
type: run
run: 0204
status: completed
profile: single-document
wave: 027
---

# Run 0204 toolbar-review

Wave 027, manifest id W-4 (phase P3, depends on W-3, delegation standard). Profile `single-document`: the scope arrives settled (RFC-001 DEC-3 and DEC-4, the gate of P3, issue #178's toolbar review and #179 option C), the output is a document and a mock-up and no design alternative of code is at stake, and one agent carries the sequence. This file is the run's whole record: scope, decisions, tasks, inventory, proposal, canonical impact, verification, findings.

Review pass: dispatched. The Stage 2 review ran in a separate leaf agent with a fresh context. The text it reviewed was the Stage 0 stub (a title and the manifest id); no drafting agent exists under `single-document`. The body below applies that review's rewrite plan and was written by the reviewing agent, so Stage 7's scan is the first independent read of it. Stage 7 (C scan, run by a leaf agent that did not write the body; no PRD or TDD exists under `single-document`, so the referent is the wave plan's manifest and P3 gate, RFC-001 DEC-2 to DEC-4, issue #178 and the code named above) found Q-1's account of the editor's step bar wrong (C-DOC, fixed in Q-1 and in the referent list): the bar has no *Play* or step menu. Everything else checked held: the eight columns of the gate, the seven tasks against the gate's three criteria, every named function exists in the file named, and the three tabs of the right panel (Selected and Changes, View and Changes on Stories).

## Purpose

The author reads one inventory of the diagram toolbar across every diagram of the editor, and a mock-up, and decides what wave 028 builds. The run builds no editor code (`likely_paths` is this folder only; `git status` must show nothing under `src/main/editor`, `src/main/resources`, `src/test`, `src/doc` or `CLAUDE.md` from this run). The run cannot pass its own gate: the author's agreement is recorded by the author, and the wave completes without it.

## Referent (what the inventory is read from)

- The toolbar markup: `renderDiagramCanvasHtml` and `renderMapPartsToolHtml` (`src/main/editor/presentation/diagram-page.js`), `renderDiagramShowGroupHtml` (`presentation/diagram-page.js`), `renderColumnsToolHtml`, the maximize button and the header actions (`presentation/diagram-controls.js`), the relationships list and highlight controls (`presentation/map-links.js`), the saved view's form (`presentation/view-edit.js`), the Stories pages and the bar over a step (`presentation/stories-pages.js`), the story player (`presentation/story-player.js`, with `presentation/story-scene.js` and the step menu of `presentation/story-menu.js`), `renderStoryButtonsHtml` (`presentation/stories-pages.js`), the right panel tabs (`presentation/right-panel.js`).
- The rules each control follows: `CLAUDE.md` (the paragraphs on the Maps, the links, the highlight, the story player, and the address rule of wave 027), `rfc/rfc-001-diagram-layout-address-and-walk.md` (DEC-2 the address, DEC-3, DEC-4, rule 1 the resolver), run documents 0202 and 0203 (what `layout`, *Changes only*, `open` and `hide` do on each surface).
- The manual's `[[editor-small-screen]]` for the 360 px measures.

## Settled decisions (read, not made here)

1. The code of a toolbar redesign is wave 028, after the author agrees (RFC-001 DEC-3, wave Non-Goals).
2. The lateral rail (#179 option C) is decided in this run's document (DEC-4). Not built.
3. The proposal covers the six items of #178: grouping by what a control acts on, which controls are saved with a view and which are only for the session, a *Reset to the view* action, one `aria-pressed` convention, keyboard order, narrow screens, and the page of a saved view and the page of an element offering the same controls where they apply.
4. This run writes the wave's agreement-waiting statement as a sentence in its own report; the line in the wave's progress log (`prg-027-...md`) is written by the wave's orchestrator, not by a run.
5. The inventory and the proposal are sections of this document (one document, not a sibling file); the mock-up is the one other file, `mockup-0204-toolbar.html`, self-contained (inline CSS, no import from `src/main`), at 1280 px and 360 px.

## Open questions

- Q-1 (resolved at Stage 3, from the code): the story player (`renderStoryPlayerHtml`, `presentation/story-player.js`) has its own bar: the title, "Step n of N", the step menu (`renderStoryStepMenuHtml`), *Previous* and *Next* (a group, `data-player-action`), *Full screen* (`aria-pressed`, only where the Fullscreen API is enabled) and *Close*; the diagram tools `Zoom` (out, actual size, in), *Center* (`data-lit`, no `aria-pressed`) and *Fit* (`aria-pressed`), drawn only when the diagram has an SVG; the plateau and comparison line (`playerPlateausHtml`), the status line and the key button (`toggle-diagram-key`, `playerLegendHtml`). It has no *Changes only*, no Map parts, no links or highlight controls, no maximize, no *Add to story*: the step's own `highlight`, `links`, `at` and `against` are drawn, not chosen. A step in the editor's Stories page has the bar over the diagram (`presentation/stories-pages.js`, the `story-bar` block: the story title, "Step n of N", the plateaus of the step, *Back to this step* (`story-restore`, only when the diagram is not the step), *Edit text* (`story-bar-edit`, `aria-pressed`), *Edit story* (`story-edit`) and *Leave story* (`story-exit`); it has no *Previous*, *Next*, step menu or *Play*, which are the player's, CLAUDE.md wave 021 run 0153) plus the diagram's own tools of the page, as a saved view's page has them; *Play* (`story-player-open`) is an action of the header of the Stories page, and *Name view…* / *Add to story…* (`renderStoryButtonsHtml`, `name-view`, `add-to-story`) are the header group of a diagram. T1 still lists each control cell by cell; this answer fixes which surfaces have a player-only or bar-only set.
- Q-2 (resolved at Stage 3 as a method, not a tradeoff): for each control T2 reads, in this order, whether `canonicalViewProperties` / `VIEW_PROPERTY_ORDER` writes it into `view.properties` (view), whether `currentRouteHash` writes it (address), whether `localStorage` is used for it (folder or browser), else session (a variable of `model/ui-state.js`) or nothing, and names the function in the cell. No product decision is in it; the per-control values are recorded by T2 at Stage 10, not guessed here.

## Tasks

Each task is verified by its own check before the next one starts; the proposal (T5) and the rail (T4) are the run's hard-judgment work and are done inline by the agent that runs Stage 10.

- T1. Read the referent and list every control of the diagram surfaces: the label, the `data-action`, the group, the `aria-pressed` or other state attribute, the title text, the key. Done when the list has no control that the markup functions above draw and the list lacks.
- T2. The inventory table: one row per control, one column per surface (page of an element in Overview, in Detailed, in Deep; Map of the application layer; Map of the technology layer; page of a saved view; a story step in the editor; the story player). Each cell says whether the control is there, what it saves and where (view, address, folder, session, nothing). Done when no cell is empty and each cell with a claim about what it saves names the function or key that does it. Two columns may be merged only with a note that names them and the check that they are equal.
- T3. Answer each item of #178 against the table: the finding (what is true today), then the proposal in one sentence. Done when six answers exist and none of them cites a control that the table lacks.
- T4. Decide the rail of #179 option C: count the domains of the right panel (today the tabs Selected and Changes with a comparison on, and View beside Changes on the page of a saved view, per `right-panel.js` and `stories-pages.js`; T1 confirms) and those the proposal adds, say yes or no and when it would change, with the evidence from the table. Done when the answer is one sentence and its evidence.
- T5. The list of proposed changes, each with the test that would guard it (a node test, an end-to-end spec, or the manual and the guide), and which control it touches in the table. Done when every change has a guard named by file kind and what it asserts, and none needs a file of this run to change code.
- T6. The mock-up: one HTML file at `mockup-0204-toolbar.html` that shows the proposed toolbar at 1280 px and at 360 px, in light and dark, with the grouping, the saved-with-the-view mark, *Reset to the view* and the pressed convention. Done when it opens in the Browser pane at both widths with no console error and a screenshot of each width was looked at.
- T7. Close-out: `git status` shows only files under this folder from this run; the report ends with the sentence that the proposal waits for the author's agreement before wave 028 and says which line the orchestrator writes in the wave's progress log; the `Files outside likely_paths:` line is written.

## Inventory

Read from the code on 2026-10-29 (the page as committed, `src/main/editor`, after runs 0202 and 0203), and checked in the editor: the Brightcart sample (`#/timeline/applications?plateau=marketplace&compare=past&sample=brightcart`) was opened in the Browser pane and the toolbar, the header and the geometry were read from the page, on the Map of the application layer, the Map of the technology layer, the page of an element in its three viewpoints and the page of a saved view.

**Where the controls are.** A diagram has four places for controls, all drawn by the functions in the Referent: the **toolbar** (`.diagram-tools`, `renderDiagramCanvasHtml`), a floating bar at the bottom right of the canvas, placed after the canvas in the page, `role="toolbar"`, every control a tab stop; the **header** of the page (facet, the tabs of an element, the "..." menu, Maximize); the **chips** over the diagram (Map only); and the **panels** beside it (the tree and the list of relationships on the left, the inspection and the Changes panel on the right). The inventory lists the toolbar first (rows 1 to 14), then the header (15 to 23), the chips and panels that act on what is drawn (24 to 28), and the story controls (29 to 31).

**What a control can save (the codes of the table).** The question is answered per control by this order (Q-2): `canonicalViewProperties` / `VIEW_PROPERTY_ORDER` (view), `currentRouteHash` (address), `localStorage` (folder), a variable of `model/ui-state.js` (session), else nothing.

| Code | Meaning | Where it is done |
| --- | --- | --- |
| V | saved with a view: `properties.<key>` of a saved view, kept by *Name view...* and *Add to story...* (`currentViewDefinition`) and edited on the page of a saved view | `canonicalViewProperties`, `VIEW_PROPERTY_ORDER` (`presentation/view-edit.js`, `application/view-recipe.js`) |
| A | in the address (a copied link draws it) | `currentRouteHash`, `pushShowParams`, `pushLayoutParam`, `pushFrameParam` (`composition/address-routing.js`) |
| F | remembered for this folder in this browser | `rememberFlag` (`model/settings.js`, `localStorage`) |
| S | session only (lost with the page) | a `let` of `model/ui-state.js` or `AppState` |
| - | nothing saved | |

### Table A: the controls and what each saves

| # | Control | Markup (`data-action`, state attribute) | Saves (the key and the function) | Key |
| --- | --- | --- | --- | --- |
| 1 | Fold all | `fold-all`; group "Fold the boxes" | V `opened`; A `open=<refs>` (`listParam`); S `mapOpened` / `technologyMapState` (`mapStateOf`) | none |
| 2 | Unfold all | `unfold-all`; asks to confirm above `MAP_UNFOLD_CONFIRM_BOXES` boxes | as 1 | none |
| 3 | Hide unlinked | `toggle-hide-unlinked`, `aria-pressed` | V `hide-unlinked: true` (`setViewHideUnlinked`); A `hide-unlinked=1`; S `diagramHideUnlinked` | none |
| 4 | Everything / Changes only | `set-changes-only` with `data-value` 0 or 1: two buttons, both `aria-pressed`; group "What the diagram draws of the comparison"; drawn only while `layerCompareOther()` | V never; A `changes-only=1` next to `compare=` (`changesOnlyFromParams`); F `rememberFlag('changes-only')`; S `AppState.changesOnly` | none |
| 5 | Applications, Relationships | `toggle-map-part` with `data-part`, `aria-pressed`; group "What the map draws"; technology Map only | V `applications: false`, `relationships: false` (`setViewMapPart`); A `applications=0`, `relationships=0`; S `technologyMapParts` | none |
| 6 | Columns | `set-columns`, a `select` with a `label`; group "Boxes per row" | V `layout.columns` (`setViewLayout`; the workspace gives a default in `settings.views.properties.<viewpoint>.layout`); A `layout=N` (`pushLayoutParam`); S `diagramColumns` | none |
| 7 to 10 | Labels, Qualifiers, Descriptions, Wrap | `toggle-show` with `data-show`, `aria-pressed`; group "Show" | V `labels`, `qualifiers`, `descriptions`, `wrap`, only when not the default of `DIAGRAM_SHOW_DEFAULTS` (`canonicalViewDefinition`, `setViewShow`); A `<name>=0` or `=1` (`pushShowParams`); S `diagramShow` | none |
| 11 | Zoom out, 100%, Zoom in | `diagram-zoom` with `data-dir` out, reset, in | S `diagramScale` and the framing of the host (`useDiagramHost`); never V, never A | `-`, `0`, `+` |
| 12 | Center | `diagram-recenter`; the lit state is `data-lit`, no `aria-pressed` | S `diagramScale === 'auto'` | `C` |
| 13 | Fit | `diagram-zoom` with `data-dir="fit"`, `aria-pressed` | A `frame=fit` (`pushFrameParam`; Elements and Maps, not the page of a saved view); S `diagramScale` | `F` |
| 14 | Key (legend of a comparison) | `toggle-diagram-key`, `aria-expanded`; in the status line, only while a comparison is drawn | S `diagramKeyOpen`; never A, never V | none |
| 15 | Facet | `diagram-facet-select`, a `select` in the header | V `facet`; A `facet=`; S `diagramFacet` | none |
| 16 | Tabs Details, Overview, Detailed, Deep | `set-element-tab`, `aria-pressed` (the Detailed tab disabled for a leaf kind) | A `tab=`; S `elementTab` (a view's viewpoint is its `viewpoint`, not a property) | none |
| 17 | "..." menu | `toggle-header-menu`, `aria-expanded`; shown only when the centre is narrower than 60 rem | S `headerMenuOpen` | `Esc` closes |
| 18 | Show on map, Open in Elements, Open on diagram | `show-on-map`, `open-as-diagram` (needs a selected element), `saved-view-open` | - (they move to another page) | none |
| 19 | Name view... | `name-view` | writes a view: the V keys of the diagram on screen (`currentViewDefinition`) | none |
| 20 | Add to story... | `add-to-story` | writes a step: the V keys, and `highlight` as the step's own key | none |
| 21 | Download PNG, SVG | `diagram-export` with `data-format`; off until a drawing is on screen | - | none |
| 22 | Maximize | `toggle-maximize`; the label says the state (Maximize, Restore), no `aria-pressed` | S `diagramMaximized` (parked per host) | `M`, `Esc` |
| 23 | Rename, Delete (a saved view) | `saved-view-rename`, `saved-view-delete` | V (the file of the view) | none |
| 24 | Pinned and Hidden chips, Clear all | `map-unpin`, `map-unhide`, `map-clear` | V `pinned`, `hidden`; A `pin=`, `hide=`; S `mapStateOf().pinned`, `.hidden` | none |
| 25 | Relationships chip, Highlight chip | `map-links-clear`, `map-highlight-clear`; application Map only | V `links`, `highlight`; A `rel=`, `hl=`; S `mapLinks`, `mapHighlight` | none |
| 26 | List of relationships (left panel) | `map-link-toggle`, a filter, a kind, *Ticked only*; application Map only | what is ticked as 25; the filter, the kind, *Ticked only* and the open state: S only (`mapLinksFilter`, `mapLinksKind`, `mapLinksTickedOnly`, `mapLinksListOpen`) | none |
| 27 | Link panel: Drawn, Highlight, Draw only this link | `map-link-toggle`, `map-link-highlight`, `map-link-only`; `mapLinkControlsApply`: application Map only | as 25 | none |
| 28 | Wording-only | `toggle-hide-wording`, a check box of the Changes panel | F `rememberFlag('hide-wording')`; S `AppState.hideWording`; never V, never A | none |
| 29 | Story bar: Back to this step, Edit text, Edit story, Leave story | `story-restore`, `story-bar-edit` (`aria-pressed` and a label that changes, Edit text / Done), `story-edit`, `story-exit` | S `storyBarEditing`, `activeStory`; A `story=`, `step=`; the words typed are written to the story | none |
| 30 | Play | `story-player-open`, in the header of a story on the page Stories | S `storyPlayer`; A `play=`, `step=` | none |
| 31 | Player bar: step menu, Previous, Next, Full screen, Close | `data-player-step-menu`, `data-player-action` previous, next, fullscreen (`aria-pressed` and a label that changes), close | S `storyPlayer` only | `Left`, `Right`, `Home`, `End`, `Esc` |

### Table B: which surface has which control

The columns are the six surfaces of the P3 gate. **Elem** is the page of an element in Overview, in Detailed and in Deep, **merged into one column** (see the note under the table). **MapA** and **MapT** are the Maps of the application and of the technology layer. **View** is the page of a saved view (Stories, Views). **Step** is a step of a story shown in the editor: it is drawn on the Elem, MapA or MapT page that its view belongs to (`goToStoryStep` → `applySavedView` sets the perspective), so each cell says "as the page" and the page's codes of Table A hold, with the bar (row 29) over the diagram. **Player** is the modal window of *Play*.

Cell vocabulary: **yes** (there, and it saves what Table A says); **yes, edits the view** (there, and it changes the saved view instead of the session: the view shows *modified* until *Save all changes*; Table A's V and nothing else); **no** with the reason; **as page** (as the page the step is drawn on).

| # | Control | Elem | MapA | MapT | View | Step | Player |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | Fold all | no: the three viewpoints are drawn as the command line draws them | yes (V A S) | yes (V A S) | no: the open boxes are a list in the view's form (`Open`) | as page | no: the step's view decides |
| 2 | Unfold all | no (as 1) | yes | yes | no (as 1) | as page | no |
| 3 | Hide unlinked | yes (A S) | yes (A S) | yes (A S) | yes, edits the view | as page | no: the step's view decides |
| 4 | Everything / Changes only | yes, with a comparison (A F S) | yes, with a comparison | yes, with a comparison | yes, with a comparison, session only (not V) | as page | no: the scene draws Everything |
| 5 | Applications, Relationships | no | no | yes (V A S) | yes, edits the view, for a Map of the technology layer | as page (MapT) | no |
| 6 | Columns | yes (A S) | yes (A S) | yes (A S) | yes, edits the view | as page | no: the step's view and the workspace decide |
| 7 to 10 | Labels, Qualifiers, Descriptions, Wrap | yes (A S; Labels and Qualifiers on by default) | yes (A S; all off by default) | yes (A S; off by default) | yes, edits the view | as page | no: the step's view decides |
| 11 | Zoom out, 100%, Zoom in | yes (S) | yes (S) | yes (S) | yes (S) | as page | yes, its own framing (S, `storyPlayer.framing`) |
| 12 | Center | yes (S) | yes (S) | yes (S) | yes (S) | as page | yes (S) |
| 13 | Fit | yes (A S) | yes (A S) | yes (A S) | yes (S: not in the address) | as page | yes (S) |
| 14 | Key | yes, with a comparison (S) | yes (S) | yes (S) | yes (S) | as page | yes, its own button and state (`player.keyOpen`) |
| 15 | Facet | yes (V A S) | yes | yes | no: not in the header or the toolbar; in the view's form, edits the view (`setViewFacet`) | as page | no: the step's view decides |
| 16 | Tabs of an element | yes (A S) | no | no | no: a *Viewpoint* list in the form | as page (Elem) | no |
| 17 | "..." menu | yes (narrow centre) | yes | yes | yes | as page | no |
| 18 | Show on map / Open in Elements / Open on diagram | Show on map | Open in Elements, with a selection | Open in Elements, with a selection | Open on diagram | as page | no |
| 19 | Name view... | yes | yes | yes | no: it is a view; Rename and Delete instead | as page | no |
| 20 | Add to story... | yes | yes | yes | no | as page | no |
| 21 | Download PNG, SVG | yes | yes | yes | yes | as page | no |
| 22 | Maximize | yes (S) | yes (S) | yes (S) | yes (S; hides the list and the panel) | as page | no: the window already covers the page; it has Full screen (31) |
| 23 | Rename, Delete | no | no | no | yes (V) | no | no |
| 24 | Pinned, Hidden chips; Clear all | no | yes (V A S) | yes (V A S) | no: pills in the view's form, edit the view | as page | no |
| 25 | Relationships and Highlight chips | no | yes (V A S) | no: the technology Map has no `links` | no: fields `links`, `highlight` of the form, edit the view | as page | no |
| 26 | List of relationships | no | yes | no | no: the form's lists | as page | no |
| 27 | Link panel boxes | no | yes | no | no | as page | no |
| 28 | Wording-only | yes, with a comparison (F S) | yes | yes | yes | as page | no: the scene never reads the editor's |
| 29 | Story bar | no | no | no | no | yes: over the page the step is drawn on | no |
| 30 | Play | no | no | no | no (it is in the header of Stories, over a story) | no | opens it |
| 31 | Player bar | no | no | no | no | no | yes |

**Elem is one column, with this check.** The three viewpoints are drawn by one call, `renderDiagramCanvasHtml(record)`, and the code does not branch on the viewpoint there, except for two values: the Default of *Columns* (`workspaceColumnsOf(viewpoint)`) and the Detailed tab, disabled for a leaf kind (`LEAF_KINDS`); the texts have one set of defaults for the three (`DIAGRAM_SHOW_DEFAULTS.elements`). The check: in the Browser pane, on the Brightcart sample with a comparison on, for the elements `commerce` and `accounts` in `tab=overview`, `tab=detailed` and `tab=deep`, the ordered list of `data-action`, `data-show`, `data-dir`, `data-value` and `aria-pressed` of the toolbar and of the header was read by script, and the three lists were equal for each element.

### What the toolbar costs (measured)

On the Brightcart sample, plateau `marketplace` compared with its past, the Map of the application layer, 15 controls in the toolbar (the two Fold buttons, Hide unlinked, the pair Everything / Changes only, Columns, the four texts, the three zoom buttons, Center, Fit):

| Window | Toolbar | Canvas | Share of the canvas covered |
| --- | --- | --- | --- |
| 1280 x 800 (the canvas 728 wide, the three regions side by side) | 696 x 68 px, two rows, floating over the diagram | 728 x 511 | 12.7 % of the area |
| 360 x 800 (the regions stacked) | 328 x 164 px, floating over the diagram | 360 x 466 | 32 % of the area, 35 % of the height |

At either width the toolbar draws over the boxes (the Fold buttons and the texts sit on the lower right of the drawing), and in the page it comes after the canvas, which is one tab stop of its own with arrow keys inside. The tab order of a diagram page is therefore: the header, the chips, the canvas, the 11 to 17 buttons of the toolbar, the status line and its Key button. A measure that is not about the toolbar was made on the way and is a finding below: in a browser workspace (the sample), the top bar is 572 px wide in a window of 360.

## Answers to #178's toolbar review

Each answer is a finding (what is true today, from the tables above) and a proposal in one sentence (the numbers P-1 to P-8 are the list under "Proposal and the tests that would guard it"). The mock-up `mockup-0204-toolbar.html` shows the proposal at 1280 px (a centre 730 px wide) and at 360 px, in light and dark.

**1. Grouping by what a control acts on.**
Finding: the toolbar has five kinds of control side by side in the order they were added by waves: Fold (row 1, 2), what is drawn (3, 4, 5), how it is laid out (6), how it is written (7 to 10) and the framing (11 to 13), and the header carries a sixth kind, the facet (15), which acts on what is drawn but sits apart from Hide unlinked. The only separators are two thin rules before the texts and before the zoom; nothing says that Everything / Changes only is about the comparison and the others about the view.
Proposal (P-1): five groups in this order, named in the markup (`role="group"` with an `aria-label`): **Draw** (Fold all, Unfold all, Hide unlinked, Applications, Relationships, and the Facet moved from the header), **Texts** (Labels, Qualifiers, Descriptions, Wrap), **Layout** (Columns), **Compare** (Changes only), **Frame** (Zoom, Center, Fit); Maximize stays in the header, Download in the "..." menu, Key under the drawing where its legend is.

**2. Saved with a view, or only for the session, visibly.**
Finding: the inventory gives a clean split that the page does not show. What a view keeps is exactly rows 1 to 10 and 15 (and, beside the toolbar, 24 to 27): Draw, Texts and Layout. What it never keeps is Changes only (4), the wording toggle (28), the framing (11 to 13), the key (14) and Maximize (22). Two of the unsaved controls are in the address (Changes only, Fit) and two are remembered in the browser (Changes only, wording-only), so "session only" is not one thing: the page has four kinds of memory (view, address, folder, session) and shows none. On the page of a saved view the same buttons look alike and mean something else: the texts there edit the file, Changes only does not.
Proposal (P-2): a dot in the name of every group whose controls a view keeps (Draw, Texts, Layout), with `aria-label="Saved with the view"` and a one-line note under the toolbar ("kept when you name the view"); Compare and Frame carry no dot, and their titles say "Not part of a view". The dot is data-driven: it is drawn for a control exactly when `canonicalViewProperties` keeps its key.

**3. Show when the diagram differs from the saved view, and a *Reset to the view* action.**
Finding: the editor already has the signal for one case. A step shown in the editor has *Back to this step* in its bar, drawn only while `viewMatchesScreen(view)` is false (`renderStoryBarHtml`), and `applySavedView` is the function that puts a view's recipe back into the session. For every other diagram the reference is missing: *Open on diagram* (`saved-view-open`) applies a view and keeps no memory of it, a diagram never opened from a view has no view to go back to, and the only reset is *Clear all* on a Map, which also drops the pins and the relationships. The page of a saved view needs no reset (its toolbar edits the view; the *modified* badge and *Save all changes* are its reference).
Proposal (P-3): one *Reset* button after Layout, disabled while the diagram is what its origin says and marked with a dot when it differs; its name says what it goes back to: *Reset to "applications_map"* when the diagram came from a view or a step, *Reset to defaults* when it did not (the defaults are the workspace's and the command line's); it puts back Draw, Texts and Layout only, never Compare or Frame, and it is not shown on the page of a saved view. It needs one new piece of session state, the origin of the diagram (a view id), set by `applySavedView` and *Open on diagram* and cleared when the reader leaves the page.

**4. One pressed convention.**
Finding: five conventions coexist. A toggle with `aria-pressed` (Hide unlinked, the four texts, the two Map parts, Fit, the tabs); a **pair** of buttons that are both `aria-pressed` (Everything / Changes only: two controls for one switch); a lit state with **no ARIA state** (Center, `data-lit`, so a screen reader hears nothing of it); a **label that changes with the state** with no `aria-pressed` (Maximize / Restore); and a label that changes **and** `aria-pressed` (Edit text / Done in the story bar, Full screen / Exit full screen in the player), which says the state twice. Disclosures use `aria-expanded` (the "..." menu, Key), which is right.
Proposal (P-4): a toggle is a button with `aria-pressed` and one constant label that names the thing, never the state: Maximize (not Restore), Edit text (not Done), Full screen (not Exit); Center gets `aria-pressed` in place of `data-lit` (it is one of the three framings with Fit and the zoom); Everything / Changes only becomes one toggle, *Changes only* (one control fewer in the narrowest part of the toolbar); a disclosure keeps `aria-expanded`. The segmented tabs (Details to Deep, Selected / Changes) keep `aria-pressed` as they have it, which is outside this review.

**5. Keyboard: every control reachable, the tab order equal to the visual order, shortcuts only where one exists.**
Finding: every control is a button or a select and is reachable. The order is the page order (header, chips, canvas, toolbar, status) and the toolbar floats at the bottom of the canvas, so the visual and the tab order agree as long as the toolbar is last; but the canvas is a tab stop with its own arrow keys, so a reader who wants Hide unlinked crosses the drawing first, then up to 17 stops. The shortcuts that exist are the zoom (`-`, `0`, `+`), `C`, `F`, `M` and `Esc` on a diagram, and `j` and `k` for the changes; the titles of the zoom, Center, Fit and Maximize say theirs, and no other control has one.
Proposal (P-5): dock the toolbar above the canvas, so that the page order is header, toolbar, chips, canvas, status and the visual order is the same; keep each control a tab stop (a `select` inside a toolbar does not fit the arrow-key pattern of ARIA toolbars, so no roving tabindex); add no shortcut; and write each title as what happens plus the key where there is one (P-8).

**6. Narrow screens: wrap or fold without hiding the state of a control.**
Finding: at 360 px the toolbar is 164 px high over a canvas 466 px high (35 % of it) and covers a third of the drawing (measured above); it wraps, so no control is lost, but it hides the boxes it floats over, and the pressed state of a control is visible only while its button is.
Proposal (P-6): under 40 rem (the width at which the regions stack) each group is one button that shows how many of its controls are on ("Texts 2") and opens its controls in a panel under the toolbar; Reset and Changes only stay out as buttons, and Frame shows the zoom ("Frame 100%"); so the state is never hidden: a group button carries its count, and Reset its dot. In the mock-up at 360 px the toolbar is two rows and 79 px (10 % of the window height), docked, with the page 360 px wide.

**7. The page of a saved view and the page of an element offer the same controls where they apply, and say plainly where they do not.**
Finding (Table B): the page of a saved view lacks three controls that apply to its diagram: *Fold all* and *Unfold all* on a Map view (its open boxes are edited as a list in the form, not by a button) and the *Facet* (a field of the form, not of the toolbar or the header), and nothing says so; it has three controls the page of an element has not (Rename, Delete, Open on diagram), which belong to a view and are right, and lacks two that would be wrong there (Name view and Add to story: it already is a view). Pins, Hidden, `links` and `highlight` are chips and panels on the Map and fields of a form on the page of a view: the same state, two places, and no sentence to say it.
Proposal (P-7): a rule instead of a list: a control is **absent** only when it can never apply to that kind of diagram (Fold on an element, Map parts off the technology Map, the tabs off an element) and **present and working** wherever the diagram is of the kind it applies to, on every page; on the page of a view the control edits the view. So *Fold all*, *Unfold all* and *Facet* go to the toolbar of the page of a saved view and edit `opened` and `facet`. The rule and the table of Table B are written once in the manual, with the rows that are absent and why.

### Findings found on the way (not part of the proposal)

- The manual's `[[editor-layout]]` (`src/doc/README.adoc`, line 1945) still says that the toolbar's value "is not in the address yet", while run 0203 put `layout=N` in the address (the same manual lists it, line 2216). A one-sentence correction, for the orchestrator or wave 028.
- A browser workspace (a folder kept in the browser, the sample) has a top bar that is 572 px wide in a window of 360: the buttons *Workspace*, *?* and *Close workspace* go past it. `[[editor-small-screen]]` measured a served folder, which has no such button. It is not the toolbar's, and it is the author's to put in an issue.

## The rail (#179 option C)

**Decision: no rail, not now.** The right panel has two domains at most on any page, and the toolbar proposal adds none.

Evidence, from the tabs the code draws (`withChangesPanel`, `libraryRightHtml`): on the page of an element and on both Maps the right panel is *Selected* alone, or *Selected* and *Changes* while a comparison is on (two); on the page of a saved view it is *View* (which holds the selection under it) and *Changes* (two); on the page Plateaus and on a story it is *Changes* alone (one); the player has none. The names are three (Selected, View, Changes) and they are never on one page together. #179's own threshold for the rail is four or more domains in the panel at once. The reason #179 opened, the walk buttons leaving the view, was fixed by W-1's sticky bar (option A). All the changes of the proposal are in the toolbar and the header, none in the panel, so none adds a domain. A rail would replace `.right-tabs` and touch `right-panel.js`, `stories-pages.js`, `style.css`, `events.js` and many tests, for two tabs.

It would change when a page has a third domain at the same time as these two: for instance if the form of a saved view (today the View tab) and its inspection became two tabs beside Changes, or if the list of relationships moved from the left panel to the right as its own domain. The author's call then; this run records no such plan.

## Proposal and the tests that would guard it

**Status of the proposal: awaiting the author's agreement; wave 028 builds only what the author agrees.** Nothing below is built, and the run changed no editor file.

Each change names the rows of Table A it touches, its guard (a node test in `src/test/javascript`, an end-to-end spec in `src/test/e2e` in Chromium and Firefox, or the manual and the guide), and what the guard asserts. No guard needs a file of this run to change code. The order is the order wave 028 would build in: P-4 and P-8 are markup only; P-1, P-2 and P-5 move controls; P-7 adds two controls to a page; P-3 adds one control and a piece of state; P-6 is the largest and comes last.

| # | Change | Rows touched | Guard (kind, and what it asserts) |
| --- | --- | --- | --- |
| P-1 | Five named groups in this order: Draw, Texts, Layout, Compare, Frame; the Facet moves from the header to Draw | 1 to 10, 11 to 13, 15 | node: for each of the six surfaces the groups of the toolbar markup are in that order, each control of Table A is in exactly one group, and the Facet is not in the header; e2e: on a Map and on an element the group labels are found by role, in that order |
| P-2 | A dot (`aria-label="Saved with the view"`) on the groups a view keeps, none on Compare and Frame, and the note under the toolbar | 1 to 10, 15 | node (an audit, as run 0203's address audit): every key of `VIEW_PROPERTY_ORDER` that a toolbar control edits is in a marked group, and no control of Compare or Frame is; e2e: *Name view...* writes the keys of the marked groups and none other, after a change in each group |
| P-3 | *Reset* after Layout: disabled when the diagram is its origin, a dot when it differs; *Reset to "view"* or *Reset to defaults*; it restores Draw, Texts and Layout only; absent on the page of a saved view; the origin is session state set by `applySavedView` and *Open on diagram* | new, 3, 6, 7 to 10, 15, 24, 25 | node: "differs" is `viewMatchesScreen`'s comparison (`canonicalViewDefinition` against `currentViewDefinition`), after Reset the address is the address of the first drawing, Changes only and the zoom are untouched, the origin is cleared when the page is left; e2e: change Hide unlinked on a diagram opened from a view, Reset appears, press it, the address is as before |
| P-4 | One pressed convention: constant labels (Maximize, Edit text, Full screen), Center with `aria-pressed` and no `data-lit`, one *Changes only* toggle in place of the pair | 4, 12, 22, 29, 31 | node: no `data-lit` in the markup of any surface, no button that has both `aria-pressed` and a label from a state pair, Changes only is one button; the address `changes-only=1` is as before (run 0203's round trip stays green); e2e: `getByRole('button', { name: 'Fit', pressed })` and the same for Center and Changes only |
| P-5 | The toolbar docked above the canvas: page order header, toolbar, chips, canvas, status; every control still a tab stop | 1 to 14 | node: the toolbar is before the canvas in the markup of each surface; e2e: from the header, Tab reaches the first control of the toolbar before the canvas, and `+`, `-`, `0`, `F`, `C`, `M` and `Esc` still act from the canvas |
| P-6 | Under 40 rem each group is one button with its count ("Texts 2"), opening its controls in a panel; Frame shows the zoom; Reset and Changes only stay buttons | 1 to 13 | node: the count of a group equals the number of its controls that are `aria-pressed="true"`, and the panel holds the same controls as the wide group; e2e at 360 x 800: the document is 360 px wide, the toolbar is at most 20 % of the window's height, no control is reachable only by scrolling sideways, Escape closes the panel and gives the focus back to its button |
| P-7 | The page of a saved view gets *Fold all*, *Unfold all* and *Facet* in its toolbar, which edit `opened` and `facet`; the rule "absent only when it can never apply" and Table B go in the manual | 1, 2, 15 | node: the set of `data-action` of each surface equals the table of Table B, kept as `src/test/resources/toolbar/controls.json` and read by the test; the page of a Map view has the three, and one press changes the view and not the session; manual: a section `[[editor-toolbar]]` with the table, and a node test that fails when a `data-action` of the toolbar is missing from it |
| P-8 | Every title says what happens, then the key where one exists | all of 1 to 31 | node: each button of the toolbar has a title that is not its label, and every key named in a title is one that `handleDiagramKeydown` handles |

What stays as it is: the right panel (no rail, see above), the shortcuts, the address (run 0203's rule and its audit), the story player's own bar (it is a window, not a toolbar of the editor), the segmented tabs and the "..." menu.

**Questions for the author.** The run states a recommendation for each and decides none; wave 028 needs the answer.

- Q-A: dock the toolbar above the diagram (P-5), which changes how every diagram looks? Recommended: yes; the floating bar covers 13 % of the drawing at 1280 px and 32 % at 360 px.
- Q-B: when no view is behind the diagram, should Reset go back to the defaults (P-3)? Recommended: yes, since the defaults are the one reference a diagram always has; the alternative is to show Reset only for a diagram from a view or a step.
- Q-C: replace the pair Everything / Changes only by one toggle (P-4)? Recommended: yes; the address does not change.
- Q-D: at narrow widths, a button per group with its count (P-6), or one "Tools" menu for the whole toolbar? Recommended: a button per group, because a single menu would hide every state.
- Q-E: may *Open on diagram* remember which view it opened (session only), which P-3 needs? Recommended: yes.

**Closing statement.** The toolbar proposal waits for the author's agreement before wave 028. The run cannot record that agreement. The line for the wave's progress log (`prg-027-editor-layout-and-walk.md`) is written by the wave's orchestrator, not by this run: "the toolbar proposal of run 0204 (inventory, answers to #178, the decision on the rail, the list of changes with their guards, and the mock-up) waits for the author's agreement before wave 028".

## Canonical impact

None for `CLAUDE.md`, the manual, the guide or any register: the run writes a document and a mock-up in its own folder and changes no behaviour, key, contract or page, and `docs/CLAUDE.md`, `docs/arc` and `docs/dom` do not exist in this repository (run 0203's gate read them as absent). What the author agrees of the proposal carries its canonical impact into wave 028's plan.

## Verification

Results, Stage 11 (2026-10-29, run by a leaf agent that did not write the body; no pln, so no `execution_manifest.status` to set and no repository build or test suite to run: the run changes no code, and `git diff --name-only HEAD -- src CLAUDE.md` is empty):

- Gate P3 criterion 1 held: Table A has 31 rows (a few rows group controls that are one control family: 7 to 10 the four texts, 11 the three zoom buttons), Table B has the seven columns of the gate with the three viewpoints of an element in one column (merged with its note and check), every cell filled, and what each control saves is in Table A with the function that does it. Spot-checked in the code on this date: `data-lit` on Center (`presentation/diagram-page.js`, and in the player), the pair of `set-changes-only` buttons, `Restore` / `Maximize` and `Exit full screen` / `Full screen` as state labels, `MAP_UNFOLD_CONFIRM_BOXES` in `composition/events.js`, and the 27 functions of the Referent exist in the files named. The sentence of `[[editor-layout]]` (`src/doc/README.adoc`, line 1945) that says the toolbar's value "is not in the address yet" is there, so that finding is true.
- Gate P3 criterion 2 held: six items of #178 answered (plus a seventh row for the sixth item), the rail decided (no, with the count of domains), eight changes P-1 to P-8 each with a guard named by kind and what it asserts, five questions for the author; `git status --short` shows nothing under `src/main/editor`, `src/main/resources`, `src/test`, `src/doc` or `CLAUDE.md`.
- Gate P3 criterion 3 is the orchestrator's: the line for the wave's progress log is in the Closing statement above; the run cannot write it.
- The mock-up was opened again in the Browser pane: at 360 x 800 the document is 360 px wide, the toolbar has its groups with their counts, Reset and Changes only out as buttons, and the console is empty; at 1280 x 800 the toolbar is 730 x 83 px in the centre, the document is 1280 px wide. Its buttons carry the names of the inventory (Fold all, Unfold all, Hide unlinked, Applications, Relationships, Labels, Qualifiers, Descriptions, Wrap, Columns, Changes only, Center, Fit, Reset). It loads nothing from `src/main` and nothing from the network. The screenshot of the 1280 px page is small in the pane, as at Stage 10; the geometry was read from the page. Dark mode was looked at at Stage 10, not again.
- `check_run.py --as-completed` on this folder exits 0.
- Not applicable here: `docs/bkg` and `tooling/docs/check-backlog.py` do not exist in this repository (deferred items are GitHub issues, per the project's practice), so no expiry sweep or backlog check could run; the two findings found on the way (the stale sentence of `[[editor-layout]]`, the 572 px top bar of a browser workspace) are for the author or the orchestrator to put in issues, and this run opened none.

Files outside likely_paths: none

Planned at Stage 2 (kept for the record):

- Each acceptance sentence of the P3 gate, read against the file: the inventory has the rows and columns the gate names with every cell filled; the document answers the six items of #178, decides the rail, and lists the changes with their guards; the mock-up opens at 1280 px and 360 px.
- `git status --short` and `git diff --stat` show no file outside `docs/wav/wav-027-editor-layout-and-walk/run/run-0204-toolbar-review/` from this run (the wave's own files are the orchestrator's).
- `python3 complete-run/scripts/check_run.py --as-completed` on this folder exits 0.
- The mock-up is read in the Browser pane at both widths (console clean) and its markup uses the real control names of the inventory.

## Findings

- The Stage 0 stub had no body; the Stage 2 review (below) applied.
- Stage 10 (T1 to T7, done inline by the agent that ran the stage, `single-document`: no pln, so no `task_catalog` and no dispatch). Each task's check:
  - T1: 31 rows (14 in the toolbar proper, 9 in the header, 5 chips and panels, 3 story controls). The check that the list lacks no control the markup draws: the toolbar of each surface was read by script in the Browser pane (with a comparison on: Map of the application layer 15 controls, Map of the technology layer 17, page of an element 13, page of a saved view, a Map of the technology layer, 15; the element page has 11 without a comparison) and every `data-action` found is a row; the header lists of the four surfaces were read the same way.
  - T2: Table B has no empty cell; the merged column Elem carries its note and its check (equal in the three viewpoints for two elements).
  - T3: six answers, plus a seventh row for the sixth item of #178 (same controls on the page of an element and of a saved view), each citing only rows of the tables.
  - T4: the rail, one sentence and its evidence: no.
  - T5: eight proposed changes, each with a guard named by kind and what it asserts; five questions for the author.
  - T6: `mockup-0204-toolbar.html` (self-contained, no import from `src/main`). Opened in the Browser pane at 360 x 800 (light and dark; a group opened, a toggle pressed, Reset enabled and pressed, Escape closing the panel; the document 360 px wide, the toolbar 79 px high, console clean) and at 1280 x 800 (the geometry read from the page: a centre 730 px wide, the toolbar two rows and 83 px, three rows and 119 px for the Map of the technology layer). The screenshot of the page at 1280 px was taken too small by the pane to read the controls; the wide form was looked at in a screenshot of the same page at the centre's width, 730 px, where the controls read, and its geometry at 1280 px was measured. This is the weakest part of the check and is said so.
  - T7: `git status --short` shows the run's folder and the two wave files that were already modified before the stage (`prg-027-...md`, `wav-027-...md`), nothing under `src/main`, `src/test`, `src/doc` or `CLAUDE.md`.
- Files outside likely_paths: none from this run (the two modified wave files were modified before Stage 10 by the orchestrator).
- Found on the way, not fixed (the run writes no code and no manual): the sentence of `[[editor-layout]]` that says the toolbar's `layout` is not in the address yet (stale since run 0203); the top bar of a browser workspace, 572 px wide at 360. The second is an issue to open; the run opened none.
- The measure at 360 px was made with the Browser pane's emulated viewport on the real editor and on the mock-up, in a desktop browser, as `[[editor-small-screen]]` was: not a phone.

### KDMLLC review of the stub (Stage 2)

Reviewed text: the 7-line file as Stage 0 left it. Referent: `wav-027-...md` (manifest W-4 and the P3 gate), `rfc-001-...md` (DEC-3, DEC-4), `complete-run`'s completion contract, the sibling run documents 0202 and 0203.

| Principle | Score | Status |
| --- | --- | --- |
| KISS | 5 | Pass |
| DRY | 5 | Pass |
| MECE | 1 | Needs revision |
| LEAN | 5 | Pass |
| LUCID | 2 | Needs revision |
| C | 4 | Acceptable |

Overall: Needs revision. Top concern: the document carries none of scope, acceptance, decisions, task list, canonical impact or verification, so Stage 10 has nothing to work and the gate cannot be checked against it.

| ID | Principle | Severity | Finding | Fix applied |
| --- | --- | --- | --- | --- |
| F1 | MECE-MISSING | S3 | No scope, no done condition, no task list, no Canonical impact, no Verification, no review line: a `single-document` run drops files, never questions | Sections added: Purpose, Settled decisions, Open questions, Tasks, Canonical impact, Verification, Review pass |
| F2 | LUCID | S2 | "Manifest id W-4" does not say what the run delivers, that it writes no code, or that its gate belongs to the author | Purpose states the output, the constraint and the human gate |
| F3 | MECE-MISSING | S2 | The P3 gate names eight columns and a mock-up at two widths; nothing says where the inventory, the proposal and the mock-up live | Decision 5: inventory and proposal in this document, one mock-up file |
| F4 | C-UNCHECKED | S2 | The claims the inventory will make (which controls a surface has, what each saves) need a referent bounded in advance | Referent section names the functions and documents read |
| F5 | LUCID | S1 | #178 says the proposal goes "in the run's TDD"; this run has none (`single-document`) | Decision 5: it goes in this document; no TDD is added (LEAN) |
| F6 | MECE-MISSING | S1 | Criterion 3 of the gate is a line in the wave's progress log, which no run writes | Decision 4 and task T7: the run states it, the orchestrator writes it |

S0/S1 findings F5 and F6 were cheap and are applied. No finding was left for the prg beyond this table.

## Lessons Learnt

- Nothing yet.
