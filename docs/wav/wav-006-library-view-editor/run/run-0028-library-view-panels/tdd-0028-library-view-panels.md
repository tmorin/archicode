---
title: Editor — the attributes of a view and the inspection of its selection, in the right-hand panel of the Library
type: tdd
status: completed
date: 2026-10-13
run: 0028
wave: 006
related:
  - docs/wav/wav-006-library-view-editor/wav-006-library-view-editor.md
  - docs/wav/wav-006-library-view-editor/run/run-0027-library-view-diagram/tdd-0027-library-view-diagram.md
  - docs/wav/wav-004-editor-workspace-experience/run/run-0019-inspection-panel-links/tdd-0019-inspection-panel-links.md
---

# Editor — the attributes of a view and the inspection of its selection, in the right-hand panel of the Library

# Summary

Since run 0027 the page of a view in the Library (`#/library/views?view=<id>`) draws the view in its centre, read-only, with the
facts and the steps that show the view in a block under the diagram. This design gives the page the **right-hand panel** of the Map:
the facts and the steps move there (the first section, "the view"), and a click on a box or a link of the diagram selects it **on the
page** and adds a second section with the inspection of the Map (`renderInspectionHtml`'s element panel, the link panel). The page
stays where it is and keeps its address; the Map's and Elements' selection is never written (the page has a selection of its own).
A reader who wants the element in Elements has a button for it in the panel. The panel is the shell's own (resizable, width
remembered, absent while the diagram is maximized): the page gains **Maximize**, whose state belongs to the page through the host
swap of run 0027. Scope arrives from wave 006 (run W-2); there is no PRD.

# Scope

In: `src/main/resources/editor-webapp/standalone.html` (the page, its right region, the selection of the page, the drawing's
actions on this page, the inspection panels' mode, Maximize through the host swap, the keyboard, `resetUiState`, the scroll key of
`render()`, CSS); `src/test/javascript/viewpoint-kernel/library-view-diagram.test.js` (the read-only tests of run 0027 whose
subject changes are edited; new tests) and `library-view-panels.test.js` (new); `src/doc/README.adoc` (section `editor-stories`, and
`editor-inspection` if it speaks of where the inspection can be).

Out: editing a view (W-3), a facet picker, folding on the page, a ghost's repair (`fix-dangling`) on the page, the address carrying the
selection of the page, the Rust kernel, the Java side, the view manifest format.

# PRD Traceability

No PRD (profile `TDD+pln`): **traceability is incomplete** by construction. The requirements are the W-2 row of "Phase P1" of the wave
plan, the P1 gate criterion about the right-hand panel, and the dispatch brief (hand-over from W-1):

- R1 — The page has a right-hand panel, resizable like the Map's, its width remembered, absent while the diagram is maximized. (The wave
  row also says "absent while the viewport is too narrow, as the Map's": the shell has no such rule, the Map's panel is only clamped
  (ASM-1), so the page gets the same clamping and no more.)
- R2 — The panel lists the attributes of the view: what it draws, viewpoint, layer, element or pins, facet, hide-unlinked, texts, the
  file that keeps it, the steps that show it. The facts now in the centre move there; the `.library-view-details` rules go.
- R3 — After a box of the diagram is selected the panel shows the inspection panel of that element; after a link, the link panel;
  without leaving the page.
- R4 — The selection stays on the page and in its address; the page writes none of the Map's and Elements' selection, pins, hidden and
  opened sets, facet, hide-unlinked, texts, tab and address: they are what they were before a visit (the visit snapshot test covers the
  new state). One pre-existing rule stays outside it: a selected link of the Map is ended on entering the Library (`settleLinkSelection`,
  finding F-1 of run 0027).
- R5 — The steps that show the view still lead to their story (`library-go-story`).
- R6 — A reader still reaches the element in Elements (the wave's open question: what a click does).
- R7 — The PNG/SVG group stays in the header at narrow widths.
- R8 — The wave's open question: the shape of "the attributes in the right-hand panels" (one panel, two sections, view first).
- R9 — The manual describes the page: diagram in the centre, attributes and inspection on the right.

Map of requirements to decisions: R1 DEC-5, DEC-6; R2 DEC-1; R3 DEC-2, DEC-3; R4 DEC-2, DEC-3, DEC-5; R5 DEC-1 (unchanged action);
R6 DEC-4; R7 DEC-6; R8 DEC-1; R9 IMP-4. The other P1 criteria belong to run 0027.

# Technical Goals

- TG-1 — The Map and Elements behave exactly as before: the existing node tests pass; the ones that say "the page's drawing acts on
  nothing" (run 0027's section 7, the role-`img` link test, the `M`/`Escape` test, the "no right-hand panel yet" assertion) are the
  tests of the subject this run changes and are edited for it, nothing else.
- TG-2 — No state the Map or Elements read is written by anything the page does (selection, `revealLinkAfterDrawing`, the address).
- TG-3 — Everything is testable in Node against the harness of run 0027.

# Non-Goals

- No edit of the view; *Hide unlinked* and the texts stay a look of the page (W-3 replaces `libraryLook`).
- The panel does not show the controls of W-3: the attributes are read.
- No toggle by a second click on the selected box, no multiple selection.

# Assumptions

- ASM-1 — The shell already draws, resizes and remembers a right region (`renderShellHtml`, `renderResizeHandleHtml('panel-right')`,
  `savedPanelSizeStyle`, `min-w-56 w-72 max-w-[40vw]`); it has no media query for a narrow viewport, the Map's panel is just
  clamped. The page gets the same by returning a `right`. The width is the one the Map remembers (one `panel-right`).
- ASM-2 — `inspectionLinkFor(sel)` reads `diagramScene`, which is the page's own scene while the page is the host (run 0027).
- ASM-3 — The harness has no layout: widths, scrolling and the look are checked in a browser, and what that does not confirm is said.

# Constraints

- CON-1 — `standalone.html` is one file; the kernel block (base64) is not touched.
- CON-2 — The source pins of earlier runs hold: `showDiagramScene`'s order (`diagramScene = scene;`, `reconcileLinkSelection();`,
  `markLinkSelection();`, `syncLinkTabStop(canvas);`, `revealSelectedLink(canvas);`, `markMapScope();`, `markInspection();`,
  `restoreDiagramFocus(canvas);`), `markMapSelection` stays after `showDiagramScene` in the file, the literal
  `mapSelectionCheck && sel.kind === 'element'`, `setAttribute('aria-pressed', String(selected))` in `markLinkSelection`.
- CON-3 — Run W-3 edits the same page next: the section of the view in the panel becomes controls, and the selection of the page is
  what W-3's edits must keep consistent.

# Current State

- `renderLibraryPerspectiveHtml` returns `right: null`; a drawable view is `.diagram-view.library-view` = header, notices, canvas,
  `.library-view-details` (the facts + "Shown in") capped at 33%. A view that cannot be drawn is `.story-view` > `.story-body`.
- The page's drawing is read-only: `renderDiagramSvg(…, { readonly: true })` omits every `data-action`, uses `role="img"`, no
  `aria-pressed`; the fold buttons and `clear-facet` are absent.
- The element panel `renderInspectionHtml(onMap)` reads `AppState.selection` (the link panel `renderLinkInspectionHtml(sel)` already takes
  its selection, but `refreshInspection`, `markLinkSelection`, `reconcileLinkSelection`, `syncLinkTabStop` and `markMapSelection` read it
  too); the panels' buttons are `goto-element` (declaring elements of a relationship) and `close-inspection`. The Map's click on a box
  already selects in place (it also pushes a history entry, writes `ref=` in the address and moves the tree).
- `diagramMaximized` is one global; the host swap (`useDiagramHost`) parks the camera, scene, cache and link tab stop.
- `render()` keeps the scroll of the right panel only while `viewKey` (perspective + selection) is unchanged.

# Proposed Design

## DEC-1 — One panel, two sections, the view first (the wave's open question)

`right` of the page is one `<div class="library-panel">`: **the view** (the facts, then "Shown in", exactly the markup of today:
`renderViewFactsHtml`, `renderViewUsesHtml`) and, when the page has a selection, **the selection** (the element panel or the link panel).
The aside is labelled "View and selection" (the shell takes the label from the perspective: `rightLabel`, default "Inspection").
Why one: the right region is one `aside` in the shell, the Map's panel already is "the inspection", and two aside side by side would
halve the diagram for a read-only fact list; stacking keeps the width the user chose. If two side-by-side panels were meant, the
content is the same sections.
A view that cannot be drawn keeps today's page (message + facts + "Shown in" in the centre, `right: null`): the section "the view" is
rendered by the same function in both places (`renderViewAttributesHtml`); `renderViewDetailHtml` (problem + attributes) stays for it.
The `.library-view-details` block and its CSS go; the centre is the header, the notices and the stage.

## DEC-2 — The selection of the page is the page's own: `libraryPick`

`libraryPick = { view: <id>|null, selection: null | element | link }` (CTR-1), read through `libraryPickFor(viewId)` which starts afresh
when another view is shown (the same discipline as `libraryLook`) and is cleared by `resetUiState`. `AppState.selection` is never
written by the page, so the tree of Elements, the Map's panel and the address keep what they had. The selection objects have the shapes
of the Map's (`{kind:'element', key, layer, mode:'view'}`, `{kind:'link', key, from, to, layer, mode:'view', via?}`), so
the panels render them unchanged; `selectLink`'s construction is shared (`linkSelectionFor`). `diagramSelection()` is the one reader:
`libraryPick`'s selection while the page is shown, else `AppState.selection`; it replaces the reads of `AppState.selection` in
`markMapSelection`, `markLinkSelection`, `reconcileLinkSelection`, `revealSelectedLink` and the panels, **without borrowing**: the
Map's path is the `else` branch, byte for byte the same value. The page is "shown" when `currentPerspective === 'library'` and the
Views side is open (the Stories side selects nothing); `libraryDiagramShown()` adds "and the view can be drawn", for the keys.
The reads moved are those of the drawing of the selection: `markMapSelection` (which outlines a box on the page by its reference and
layer, since a box hosted by another has an id that is not its reference), `markLinkSelection`, `reconcileLinkSelection`,
`syncLinkTabStop` and `refreshInspection`; `revealSelectedLink` is not moved (the page never sets the request it consumes).
The writes: `dropLinkSelection` is the Map's and is left alone; the page drops its own pick (`reconcileLinkSelection`'s page branch,
`closeLibrarySelection`), and a refresh that finds nothing to show removes the selection section only, never the whole aside
(`removeInspectionPanel` is the Map's). A picked element that is renamed or deleted meanwhile (in Elements, or by a save) is dropped
when the panel is next built.
It is kept when the reader goes to the Map and comes back to the same view; the host swap does not need to park it because
nothing the Map reads is involved (the visit test checks that picking leaves `AppState.selection`, the address, `revealLinkAfterDrawing`
and the other globals as they were).

## DEC-3 — What a click does on this page: it selects, in the panel, on the page

The drawing carries its actions again, with the meaning they have on this page: a box (`goto-element`) and a link (`select-link`)
select; `handleAppClick` sends both to `libraryPick` when the page is the Library (`currentPerspective === 'library'`), and does
**not** change perspective, tab, history or address (the Map's rule "a click on a box moves to that element" is not the page's).
The same two actions inside the panels (the declaring element of a relationship) therefore select that element on the page. The branch
is a helper called from the case, so that the source pins of the cases `goto-element` and `select-link` keep their text.
The offline list of the drawing (no layout engine) selects like the boxes; the empty messages carry no button. A box for a ghost
stays a `role="img"` picture.
`readonly` of `renderDiagramSvg` keeps its meaning "the page offers no way to change what it draws": no fold button, no
`fix-dangling` on a ghost (a ghost stays an inert `role="img"` box: repairing a dangling relationship is the Map's tool, in a form), no
`clear-facet`. Boxes are `role="link"`, links `role="button"` with `aria-pressed`, as on the Map: `markLinkSelection` goes back to its
original form (the `role="img"` exception of run 0027 is dead code and is removed). The selected box is outlined (`dg-selected`,
`markMapSelection` also runs for the page's canvas), the selected link and its caption are marked (`markLinkSelection`).
Enter and Space on a focused box or link act as a click (the keyboard handler already does this for any `g[data-action]`).
Selecting redraws through `render()` as on the Map (the scene is a cache hit; `takeOverDiagramFraming` first, so "auto" framing does
not jump), the focus returns to the box (`pendingDiagramFocus`), and the panel's selection section is scrolled into view
(`scrollIntoView({block:'nearest'})`), because the section of the view is above it. The right panel is always present on the page, so
a selection never narrows the canvas and `revealLinkAfterDrawing` is not used.
The selection is ended by: the panel's close button (`close-inspection`, which on the page clears `libraryPick`), `Escape` (when the diagram is not maximized, first Restore),
another view, a folder closed, and by a drawing that does not hold the selected link (`reconcileLinkSelection`: facet, hide-unlinked
toggle, another view's recipe). A picked element need not be drawn (the panel shows any element of the workspace; there is no
"Not on the map" note: that note is the Map's).

## DEC-4 — How a reader still reaches the element in Elements

The element panel of the page has a button **Show in Elements** (`library-open-element`, with the reference and the layer; not named
"Open in Elements", which on the Map goes to the element's diagram): it
selects the element in Elements (`AppState.selection`, `expandAncestorsOf`, `scrollNavToSelection`) and goes to Elements by
`setPerspective`, on the tab Elements had (the same tab it would show for any element: Details by default). It is the one place the
page writes the selection of Elements, on an explicit click that leaves the page. The action
is in `ACTIONS_LEAVING_THE_FORM` (a typed draft asks first). The link panel leads to its ends by the two ends being selectable boxes of the diagram
and by the declaring-element buttons (which select on the page).
The wave's alternatives: "select, as written" (taken); "open the element in Elements on click" (rejected: it leaves the diagram
the reader is reading and makes Back the only way home); "both with a modifier key" (rejected: invisible, no touch equivalent).

## DEC-5 — Maximize belongs to the page, through the host swap

The Map's right panel is "absent while maximized" because `renderInspectionHtml` returns null and the left region is skipped when
`diagramMaximized`. The page gets the same by having a Maximize of its own: `diagramMaximized` joins the record the host swap parks
(`useDiagramHost`: `maximized`), so each host has its own and every existing reader of `diagramMaximized` (the Map's regions, the
button, `toggleDiagramMaximized`) works unchanged on whichever host is on screen. On the page `left` and `right` are null while it is
maximized **and the view is drawn**; Maximize is in the header (the button of the Map, with a label that names the page's panels);
`M` and `Escape` work on the diagram (the guard `anyDiagramShown()` becomes `anyDiagramShown() || libraryDiagramShown()`);
the tests of run 0027 that said the keys do not touch maximize are edited to say they do not touch the Map's. `resetUiState` resets
both. A visit does not change the Map's maximized state (it is parked), which the visit snapshot checks.
(Run 0027's DEF-1.)

## DEC-6 — Layout

`.diagram-view.library-view` is header + notices + stage + status (as the Map). The right region is the shell's `aside#panel-right`
(`right-panel`, scrolls on its own); `.library-panel` stacks its sections with a `.library-selection` section under a rule. The facts
are stacked (label over value) in the narrow panel (`.library-panel .view-facts`), as the field rows of the inspection. The
panel narrows the centre (270 px of centre in an 822 px window, measured), and the header's row of buttons then overflowed it. The
header therefore uses the Map's mechanism: PNG, SVG, *Open on diagram*, *Rename* and *Delete* are in `.header-overflow` (the row in a
wide header, the menu of the "⋯" button in a narrow one, by the container queries of the Map's header) and *Maximize* stays in the row.
PNG and SVG stay in the header at every width, in the menu when it is folded. A view that cannot be drawn has no diagram to fold:
*Rename* and *Delete* stay in the row.
The scroll of the right panel opens at the top when another view is shown: the view shown joins `viewKey` in `render()`.

# Repository Impact

- IMP-1 — `standalone.html` JS: `renderLibraryPerspectiveHtml` (right region, header menu and Maximize, rightLabel), `renderLibraryPanelHtml`,
  `selectOnLibraryPage`, `closeLibrarySelection`, `syncLinkTabStop`, `renderDiagramFallbackHtml`, `renderViewAttributesHtml`
  (new, used by `renderViewDetailHtml`), `renderLibrarySelectionHtml` (new), `renderShellHtml` (aside label), `libraryPick`,
  `libraryPickFor`, `diagramSelection`, `linkSelectionFor` (`selectLink`), `libraryDiagramShown`; `renderInspectionHtml` and the new
  `inspectionPanelHtml(sel, mode)` ('map', 'elements' or 'library': the Library's element panel has a close button and *Show in
  Elements*, and none of the Map's notes), `renderDiagramSvg` (actions for boxes and links, the
  ghost inert), `markMapSelection`, `markLinkSelection` (original form), `reconcileLinkSelection`, `refreshInspection`;
  the cases `goto-element`, `select-link`, `close-inspection`, `library-open-element`, `toggle-maximize`; `handleDiagramKeydown`;
  `useDiagramHost` and the parked record (`maximized`); `renderMaximizeButtonHtml` (label); `resetUiState`; `render()` (`viewKey`);
  `ACTIONS_LEAVING_THE_FORM`; the canvas label.
- IMP-2 — `standalone.html` CSS: `.library-view-details*` removed; `.library-panel`, `.library-selection`, `.library-panel .view-facts`;
  the cursor rule of the read-only canvas removed (the nodes act).
- IMP-3 — Tests: `library-view-diagram.test.js` edited where the subject changed (see TG-1); `library-view-panels.test.js` (new).
- IMP-4 — `src/doc/README.adoc` (`editor-stories`, `editor-inspection`).
- IMP-5 — Run documents.

# Canonical Impact

- CI-arc-1 — Not applicable. The repository declares no `arc` register (no `docs/CLAUDE.md`, no `docs/arc`); the change is one
  page of a single-file web page; no cross-cutting structure of the system changes.
- CI-dom-1 — Not applicable. No `dom` register is declared; the view manifest, the kernel contract and the address grammar do not
  change; no analysis is fulfilled.

# Data Model and Contracts

- CTR-1 — `libraryPick = { view, selection }`; `selection` is `null`, `{kind:'element', key, layer, mode:'view'}` or
  `{kind:'link', key, from, to, layer, mode:'view', via?}`. Not in the address, not saved, not shared with the Map.
- CTR-2 — Parked host record `{ scale, center, shownView, scene, cache, linkStop, maximized }`.
- CTR-3 — Actions on the page: `goto-element` / `select-link` (select on the page), `close-inspection` (clear the page selection),
  `library-open-element` (leave for Elements), `toggle-maximize`.
- CTR-4 — The aside of the Library carries `aria-label="View and selection"`.

# Interfaces and Behavior

- IF-1 — Opening a drawable view shows the panel with its attributes; no selection section until something is selected.
- IF-2 — A click (or Enter) on a box or on a link shows the selection section; the address and the perspective do not change; the
  outline follows; the focus stays on the box.
- IF-3 — Close, `Escape`, another view: the selection section goes.
- IF-4 — *Show in Elements* in the element panel leaves the page for that element.
- IF-5 — Maximize hides the left list and the panel; Restore, `Escape` and `M` bring them back.

# Flows and Processing Logic

- FLOW-1 — click on a box → `goto-element` → page? → `libraryPickFor(selectedViewId).selection = element` → `takeOverDiagramFraming` →
  `render()` → right region (panel with selection) → `mountDiagramIfNeeded` (cache hit) → `showDiagramScene` (`reconcileLinkSelection`,
  `markMapSelection`, `markLinkSelection`) → `scrollIntoView` of the selection section.
- FLOW-2 — Page → Map → page: the page's pick of the same view is still there; the Map's selection never moved.

# Reliability, Performance, and Scalability

A selection is a redraw of the page with a cache hit, as on the Map. Nothing is computed that was not already.

# Security and Privacy

Names, references and ids reach the markup through `escapeHtml` (the panel's buttons carry `data-ref`/`data-layer`). No network, no
storage beyond the width the shell already remembers.

# Observability and Verification

Node tests (real kernel, fake layout, fake canvas of run 0027, plus a panel-aware fake for the marks): the right region of the page
lists the attributes (viewpoint, layer, element or pins, facet, hide-unlinked, texts, kept in, shown in), `.library-view-details` is
gone; a click on a box shows the element panel of that element, on a link the link panel (several relationships, the clicked link's marked),
with the page, the perspective and the address unchanged and `AppState.selection`, the globals of the Map and
`revealLinkAfterDrawing` untouched; the declaring-element button of the link panel selects on the page; *Show in Elements* leaves for Elements
with the element selected; close, `Escape`, another view and a link no drawing holds clear the selection; the steps that show the view
lead to their story; a ghost is inert; Maximize hides both regions, is the page's own and leaves the Map's; the shell draws the aside
with the saved width and the resize handle; the visit snapshot with picks, closes and maximize; hand mutations. The page is then looked at
in the built-in browser on a copy of the user's workspace; it cannot confirm a real folder picker or a screen reader.

# Deployment and Rollout

None beyond the file and the manual. No stored data changes.

# Risks and Tradeoffs

- RISK-1 — A reader of `AppState.selection` that the page's drawing reaches and that I did not switch to `diagramSelection()`. Mitigation:
  list them (the grep of this design), test the page with a Map selection set and a link selected, and mutation-check each switch.
- RISK-2 — The right panel narrows the centre, so the header folds earlier (container query on the centre). Same as the Map; the
  header's row was measured in the real page at 822 px (it overflowed before the menu; it fits after). The status line of the diagram
  still overflows a 270 px centre (text in a `nowrap` span): the Map's own behaviour with its panel at that width, left.
- RISK-3 — A page left maximized stays maximized when the reader comes back to a drawn view (intended: it is the page's own state, like
  the Map's); the list of views comes back by itself while the view cannot be drawn or the Stories side is open. `diagramMaximized` per host: a reader of `diagramMaximized` outside the Map's regions would see the page's value. The
  readers are listed (`renderInspectionHtml`, `renderElementsPerspectiveHtml`, `renderMapPerspectiveHtml`, the button, the toggle, the
  keys); each is for the diagram on screen.
- RISK-4 — The right panel's width is the Map's (one remembered width). A user who wants a wider panel on one page widens it on the
  other. Accepted: the shell has one `panel-right`.
- RISK-5 — A selection kept for a view while the user is elsewhere may name a box that a later edit (W-3) removes: `reconcileLinkSelection`
  ends a link no drawing holds; a picked element needs no box.

# Open Questions

- Q-1 — (answered here, wave open question) the shape of the panels: one panel, the view first (DEC-1).
- Q-2 — (answered here, wave open question) a click selects on the page; the way to Elements is a button in the panel (DEC-3, DEC-4).

# Deferred Work

- DEF-1 — The address carrying the selection of the page (a link to a box of a view). Not asked; the address grammar is untouched.
- DEF-2 — Repairing a dangling relationship from the page (`fix-dangling`).
- DEF-3 — A panel width of the page's own.

# File Placement and Frontmatter

`docs/wav/wav-006-library-view-editor/run/run-0028-library-view-panels/tdd-0028-library-view-panels.md`.
