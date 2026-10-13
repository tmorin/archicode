---
title: Editor — a saved view drawn in the Library
type: tdd
status: completed
date: 2026-10-13
run: 0027
wave: 006
related:
  - docs/wav/wav-006-library-view-editor/wav-006-library-view-editor.md
  - docs/wav/wav-006-library-view-editor/wbc-006-library-view-editor.md
  - docs/wav/wav-004-editor-workspace-experience/run/run-0019-inspection-panel-links/tdd-0019-inspection-panel-links.md
  - docs/wav/wav-005-follow-ups-and-field-check/run/run-0025-diagram-link-tab-stops/run-0025-diagram-link-tab-stops.md
---

# Editor — a saved view drawn in the Library

# Summary

The page of a view in the Library (`#/library/views?view=<id>`) describes a diagram in words and sends the reader to the Map or
to Elements to see it. This design draws it in the centre of the page, with the canvas of the Map and Elements, its tools (zoom,
centre, fit, PNG, SVG, *Hide unlinked*, the four texts) and the facet of the view, **without changing anything the Map and
Elements show**. The diagram pipeline (`mountDiagramIfNeeded`) is parametrised by a **recipe** (what to draw: element or map
scope, viewpoint, layer, facet, hide-unlinked, texts) that it receives from the host instead of reading the page's globals; the
Map and Elements hosts build the recipe from those globals exactly as before, the Library host builds it from the view. The state
that is really "the diagram on screen" (camera, scene, cache, link tab stop) is parked and swapped when the host changes, so the
two hosts never share it. The page's diagram is read-only in this run: a click on a box or a link does nothing (W-2 gives it a
meaning). Scope arrives from wave 006 (run W-1); there is no PRD.

# Scope

In: `src/main/resources/editor-webapp/standalone.html` (the recipe, `mountDiagramIfNeeded`, `renderDiagramSvg`'s `readonly`
option, the fallback list and the empty messages, `renderDiagramCanvasHtml`, `showDiagramScene`, `renderLibraryPerspectiveHtml`,
the host switch, `render()`, `syncPerspectiveFromHash`, `resetUiState`, the actions `toggle-show` and `toggle-hide-unlinked`, the
keyboard handler, the export name, CSS); `src/test/javascript/viewpoint-kernel/library-view-diagram.test.js` (new). The manual
is not touched (W-2 and W-3 own it; no behaviour it describes changes here beyond what they will describe).

Out: the right-hand panels (W-2), editing a view (W-3), creating a view, Maximize on this page, a facet picker on this page,
fold/unfold of a Map view, selecting a box or a link on this page, the Rust kernel and its base64 block, the Java side, the
view manifest format.

# PRD Traceability

No PRD (profile `TDD+pln`): **traceability is incomplete** by construction. The requirements are the W-1 row of "Phase P1" of the
wave plan, its gate, and the dispatch brief:

- R1 — The centre of the page of an Elements view (`overview`, `detailed`, `deep`; layer application or technology) draws a
  diagram canvas whose boxes and links are those the kernel computes for the element, viewpoint, facet, *Hide unlinked* and
  texts of the view.
- R2 — The page of a Map view draws the map of its pinned, hidden and opened elements, with the same facet, *Hide unlinked* and
  texts.
- R3 — The canvas has its tools: zoom, centre, fit, PNG, SVG, *Hide unlinked*, the four texts.
- R4 — Visiting the page changes nothing the Map and Elements show: selection, pins, hidden, opened, facet, *Hide unlinked*,
  texts, tab and address (and, as a consequence of the same reading, the camera, the maximized state and the tab stop of the
  links). One pre-existing rule is not part of it: a **selected link** is ended on entering any other perspective, the Library
  included (`settleLinkSelection`, run 0019); the snapshot tests use an element selection and a separate test pins the link rule.
- R5 — A view that cannot be drawn (its element was deleted) keeps its message and has no canvas.
- R6 — *Open on diagram*, *Rename* and *Delete* stay; the facts and the steps that show the view stay on the page (W-2 moves them).
- R7 — The wave's open question for this run: how the Library host gets its inputs (DEC-1), and whether the tools belong to the
  page or to the view (DEC-4).

All are addressed. The gate criterion about the right-hand panel belongs to W-2.

# Technical Goals

- TG-1 — The Map and Elements behave exactly as before: the existing node tests (454) pass unchanged, no assertion edited.
- TG-2 — No global the Map or Elements read is written by anything the Library host does (DEC-1, DEC-2, DEC-3).
- TG-3 — Everything is testable in Node against the harness (a fake canvas, the real kernel, a fake layout engine).

# Non-Goals

- No selection on the page's diagram, no `goto-element`, no `select-link`, no fold button, no `fix-dangling`: the page's drawing
  carries no `data-action` (DEC-5). W-2 decides what a click does.
- No edit of a view: the toolbar's *Hide unlinked* and texts act on a look of the page, never on the manifest (DEC-4).
- No change of the address grammar: the page's address is still `/library/views?view=<id>`; the camera is not in it.

# Assumptions

- ASM-1 — The Library has at most one canvas on screen, and the Map, Elements and Library never have one at the same time:
  `document.getElementById('diagram-canvas')` can keep being the only lookup (zoom, centre, fit, export and the keyboard all use
  it).
- ASM-2 — `loadElk` fails in Node (an `https` import); the tests replace it with a fake layout engine the way the existing tests
  replace the layout (`fakeLayout`). The real ELK is only exercised in a browser.
- ASM-3 — `viewProblem(view)` is the one place that says a view cannot be drawn; it covers the Map (no pinned element left) and
  Elements (unknown viewpoint, missing element). A facet the settings no longer have is **not** a problem there: `applySavedView`
  draws without it and so does this page (said in the findings, not changed).
- ASM-4 — A browser's layout cannot be exercised in Node: the layout of the page is checked in the built-in browser on a copy
  of the user's workspace, and what that did not confirm is said.

# Constraints

- CON-1 — `standalone.html` is one file; the kernel block (base64) is not touched.
- CON-2 — Source-level tests of earlier runs pin the code, so the design stays inline (checklist from the design review):
  `mountDiagramIfNeeded` keeps its async body (the `drawnStereotypes` lines, `diagramLegendHtml(ghosts.items.length > 0, drawnStereotypes)`
  are read from its source), the FIRST line of it containing `const key =` holds `JSON.stringify(input)`, `diagramModelFingerprint()` and
  `JSON.stringify(AppState.workspace.styles` (the viewKey suffix goes on that same line), `diagramCache.key === key` is spelled so;
  `showDiagramScene` keeps `diagramScene = scene;`, then `reconcileLinkSelection();`, `markMapSelection();`, `markLinkSelection();`,
  `syncLinkTabStop(canvas);`, `revealSelectedLink(canvas);`, `markMapScope();`, `markInspection();`, `restoreDiagramFocus(canvas);`
  in that order, with `applyDiagramScale();` before the reveal, and the literal `mapSelectionCheck && sel.kind === 'element'`;
  `markLinkSelection` keeps `setAttribute('aria-pressed', String(selected))`; `renderDiagramCanvasHtml` does not say "one tab stop";
  `settleLinkSelection();` stays before `landingScreenConfig()` in `render()`; `renderDiagramCanvasHtml(record)` / `(null)` carry no
  `diagram-export` (the download is in the header). All hold.
- CON-3 — Runs W-2 and W-3 edit the same page next; the recipe and the host are what they extend.

# Current State

- `renderLibraryPerspectiveHtml` returns the page of a view as `.story-view` > header + `.story-body` (facts, the steps that show
  the view); `right: null`. No canvas.
- `mountDiagramIfNeeded` reads the canvas (`data-map`, `data-ref`), then `currentDiagramFacet()`, `currentMapState()`,
  `diagramShows(isMap)`, `effectiveDiagramViewpoint(record)` (which reads `elementTab`), `diagramHideUnlinked`, and writes
  `diagramSeq`, `diagramCache`; `showDiagramScene` (shared) writes `diagramScene`, `diagramShownView`, `diagramScale` and reads and
  may write `AppState.selection` (the Map's clear of an element, `reconcileLinkSelection`), `markMapScope`, `markInspection`.
- The camera (`diagramScale`, `diagramCenter`) is one set of globals shared by the Map and Elements on purpose ("the same diagram,
  whichever perspective shows it, keeps the view the user chose"); `diagramLinkStop` (the roving tab stop of the links) is one too.
- `toggle-show` mutates `diagramShow` whatever is on screen; `toggle-hide-unlinked` returns early outside the Map and a diagram tab.
  The `M` and `Escape` keys read `diagramMaximized`.
- A node of the drawing carries `data-action="goto-element"` (a ghost: `fix-dangling`), a link `select-link`, a fold button
  `toggle-fold`; the empty messages of a facet carry `clear-facet`.

# Proposed Design

## DEC-1 — The Library host gets its inputs from a recipe; the pipeline stops reading the globals (the wave's open question)

`mountDiagramIfNeeded` obtains a **recipe** from `diagramRecipeOf(canvas)` and uses nothing else to decide what to draw:

```
recipe = { host: 'main' | 'library', view, isMap, reference, record, layer, viewpoint, facet,
           mapState: { opened, pinned, hidden } | null, hideUnlinked, shows }
```

`mainDiagramRecipe(canvas)` builds it from `data-map`, `data-ref` and the globals exactly as the function read them (layer left
undefined so `buildKernelInput` keeps picking `layerOfReference`: the Map and Elements are byte-for-byte the same input).
`libraryDiagramRecipe(view)` builds it from the view: layer from the view (`technology` only if asked and not a map), viewpoint
from the view (`detailed` demoted to `overview` for a leaf kind, through `leafSafeViewpoint`, which `effectiveDiagramViewpoint`
also uses), facet by name in the settings, `opened`/`pinned`/`hidden` filtered to the existing application elements (as
`currentMapState` and `applySavedView` do), the texts and *Hide unlinked* from the view's properties over the defaults of that kind
of diagram, then the page's look (DEC-4). The layer is always given to `buildKernelInput`, `facetRemovesElement` and
`diagramEmptyHtml`, and, as `itemLayer`, to `diagramItemText`, `diagramLinkTitle`, `buildElkGraph` and `renderDiagramSvg`
(the review found that these name a box through `findElementRecord`, which asks `layerOfReference`, which reads the selection): the
box of the diagram's own layer (its id is its reference) takes its record from that layer, an application hosted on it from the
application layer. The Map and Elements pass nothing and keep letting the selection decide, so their drawings are unchanged.

*Why not a view-scoped copy of the globals* (assign the view's values to `diagramFacet`, `mapPinned`, `elementTab`… then restore):
the pipeline is asynchronous (the kernel is instantiated lazily, ELK is awaited), so the globals would have to stay borrowed across
awaits during which the user can click, and an exception or a superseded mount would leave the Map or Elements changed; the
constraint of the wave is exactly that this never happens. A recipe argument makes the property structural: the Library host has
no write path to those globals, which the tests check by snapshot after a visit rather than by trusting the restore.

## DEC-2 — The diagram on screen is parked per host

What belongs to "the diagram on screen" and not to the model is one record per host: `diagramScale`, `diagramCenter`,
`diagramShownView`, `diagramScene`, `diagramCache`, `diagramLinkStop`. `useDiagramHost(host)` swaps the live globals with the
parked record when the host changes (two hosts: a swap, not a map). It is called where `currentPerspective` is assigned, because three callers write the address
(`pushFrameParam` reads `diagramScale`) before `render()`: `setPerspective`, `syncPerspectiveFromHash`, `applySavedView` and the
story bar's fallback to the Map; and at the start of `render()` as the safety net (so the tree of the Map is rendered with the
Map's scene). It also drops `pendingDiagramFocus`, the box that had the focus on the other host. `resetUiState` resets both hosts
and the page's look. The host is `library` when
`currentPerspective === 'library'`, else `main`. Consequences: a zoom or a pan on the page does not move the Map; a visit does
not evict the Map's cached scene (no recompute and no "Computing the diagram…" when coming back); each host has its own
one-entry cache, so the source pin `diagramCache.key === key` stays true. Another view drops a manual zoom, as another diagram does on the Map: the library
`viewKey` ends with `view:<id>`, and `showDiagramScene` already resets a numeric scale (not `fit`) when the `viewKey` changes.
The cache key of the Library host ends with the `viewKey` so that two views with the same inputs do not share a scene.

## DEC-3 — `showDiagramScene` is not branched on the host

The Library canvas has no `data-map`, so the Map's block of `showDiagramScene` (the clear of an element) and `markMapSelection` do
not run; `settleLinkSelection` (start of `render()`) guarantees no link is selected on the page, so `reconcileLinkSelection` and
`revealSelectedLink` do nothing; the page has no map-scope rows and no inspection note, so `markMapScope` and `markInspection` find
nothing. The one call with an effect is `markLinkSelection`, which would give every link `aria-pressed="false"`: it now sets it only
on links that are not `role="img"` (the read-only links of the page). In `handleDiagramKeydown`, `M` was already guarded by
`anyDiagramShown()`; `Escape` with a maximized Map or a selected link gains the same guard, so the page cannot lift the Map's
maximized state. (The first draft of this design skipped these calls for the Library host; the review showed six of seven were
no-ops, and a mutation check agreed.)

## DEC-4 — The tools: the camera and the exports belong to the page; *Hide unlinked* and the texts are a look of the page

Zoom, centre, fit, the pan, PNG and SVG act on the page's camera and scene (DEC-2): they need no further change. Fold all /
Unfold all are not offered (a Map view's `opened` is part of the view, W-3's) and the Map chips are not drawn. *Hide unlinked* and
the four texts are on the toolbar, show the state the page draws, and toggling them redraws the page's diagram from
`libraryLook` (`{ view, hideUnlinked, shows }`, null = follow the view), reset when another view is shown (`libraryLookFor`, the one
function the recipe, and so the toolbar and the drawing, read it through) and by `resetUiState`. They are **not edits**:
nothing is marked modified or written, and the global `diagramHideUnlinked` / `diagramShow` are not touched (`toggle-show` and
`toggle-hide-unlinked` branch on `currentPerspective === 'library'`). This is deliberately the same status as zoom, "looking at
the view in another way". W-3 turns these two groups of buttons into edits of the view and removes `libraryLook`.
The facet is drawn, not picked.

## DEC-5 — The page's drawing is read-only

`renderDiagramSvg(…, { readonly: true })` omits every `data-action` (boxes, ghosts, links, captions), the fold buttons, and the
`aria-pressed`; boxes and links get `role="img"` (they keep their `tabindex`, labels, highlighting, arrow keys and the roving tab
stop of run 0025: all of these are classes and focus, not actions). The plain-list fallback (offline) renders names as text.
The empty messages of the page (`Nothing to show…`) have no `clear-facet` button and name no control the page does not have.
CSS: the nodes and links of this canvas keep the canvas' own cursor. A click or Enter on a box therefore reaches no case of
`handleAppClick`, and cannot leave the page or change the selection (tested by clicking every kind of node).

## DEC-6 — Layout of the page

A view that can be drawn: `.diagram-view.library-view` (the flex column of the Map) = header, the notices (story notice, legacy
notice), the stage (canvas, tools; `flex: 1 1 0`), the status line, then the facts and the steps that show the view in a block
under it (`.library-view-details`, at most 40% of the height, scrolling on its own, readable measure). A view that cannot be
drawn keeps today's page unchanged (`.story-view` > `.story-body`, its message first, no canvas). `right` stays null.
The PNG and SVG buttons (`renderDiagramDownloadHtml()`, alone: not the facet picker, the story buttons or Maximize of the Map's header
actions) are in the header of the page, as in the Map's overflow menu, and `renderDiagramCanvasHtml(record)` / `(null)` stay
byte-identical. The canvas label says what it is and which keys work ("Diagram of the view …. Arrow keys move between boxes, plus and minus
zoom."); the export file is named from the view (`<view id>-<viewpoint>`).

# Repository Impact

- IMP-1 — `standalone.html` JS: `leafSafeViewpoint`, `effectiveDiagramViewpoint`; `mainDiagramRecipe`, `libraryDiagramRecipe`,
  `diagramRecipeOf`, `libraryLook`; `mountDiagramIfNeeded`; `renderDiagramSvg` (`readonly`), `renderDiagramFallbackHtml`,
  `diagramEmptyHtml`, `facetRemovesElement` (layer); `renderDiagramCanvasHtml`, `renderDiagramShowGroupHtml`;
  `useDiagramHost` and the parked record; `showDiagramScene`; `renderLibraryPerspectiveHtml`; `render`,
  `syncPerspectiveFromHash`, `resetUiState`; the `toggle-show` and `toggle-hide-unlinked` cases; `handleDiagramKeydown`;
  `diagramExportDocument` (name); `diagramItemText`, `diagramLinkTitle`, `buildElkGraph` (`itemLayer`); `markLinkSelection`;
  `renderDiagramDownloadHtml` in the header of the page; `diagramShows` is not refactored: the recipe computes the four texts itself
  (view value over the default of that kind of diagram), the Map and Elements keep `diagramShows`.
- IMP-2 — `standalone.html` CSS: `.library-view-details`, the cursor of the read-only canvas.
- IMP-3 — `src/test/javascript/viewpoint-kernel/library-view-diagram.test.js` (new). No existing assertion is edited.
- IMP-4 — Run documents of this run.

# Canonical Impact

- CI-arc-1 — Not applicable. The repository declares no `arc` register (no `docs/CLAUDE.md`, no `docs/arc`); the change is one
  component of a single-file web page (a third host of the diagram) and no cross-cutting structure of the system changes.
- CI-dom-1 — Not applicable. No `dom` register is declared and no domain invariant becomes enforceable: the view manifest, the
  kernel contract and the address grammar of the CLI do not change; no analysis is fulfilled.

# Data Model and Contracts

- CTR-1 — Recipe (above): the one input of the pipeline's decisions. A host that builds one gets the rest unchanged.
- CTR-2 — Canvas attributes: Map `data-map`; Elements `data-ref`; Library `data-host="library"` and `data-view`. Only the Library
  host sets `data-host`.
- CTR-3 — Parked host record `{ scale, center, shownView, scene, cache, linkStop }`, one for the host not on screen.
- CTR-4 — `libraryLook = { view, hideUnlinked, shows: { labels, qualifiers, descriptions, wrap } }`, null entries follow the view.
- CTR-5 — Read-only drawing: no `data-action` in the SVG, no `.dg-fold`; `role="img"` on `.dg-node` and `.dg-link`.

# Interfaces and Behavior

- IF-1 — Opening the page of an Elements or Map view draws its diagram; changing view redraws, framed on the new one.
- IF-2 — Zoom, centre, fit, drag, wheel, `+ - 0 F C`, PNG, SVG work on the page; the Map's camera is what it was on return.
- IF-3 — *Hide unlinked* and the texts redraw the page's diagram only; leaving the page and coming back to the same view keeps the
  look; showing another view resets it.
- IF-4 — A click, Enter or Space on a box, a link or a caption does nothing.

# Flows and Processing Logic

- FLOW-1 — `render()` → `useDiagramHost(host of the perspective)` → `renderShellHtml` (canvas with `data-host`) → `mountDiagramIfNeeded`
  → recipe → input → cache hit (`showDiagramScene`) or kernel + ELK → `showDiagramScene` (Library: no selection work).
- FLOW-2 — Map → Library (view) → Map: the Map's camera, scene and cache are parked, then swapped back; the globals of the Map
  were never written; the address is rebuilt from them.
- FLOW-3 — Address with `frame=fit` typed while on the page: `syncPerspectiveFromHash` switches host first, so `fit` is the Map's.

# Reliability, Performance, and Scalability

The page computes one diagram per mount, cached per host; the Map's cache survives a visit, so coming back is instant. The
cost of a view is that of the same diagram on the Map or in Elements. A superseded mount still shows nothing (`diagramSeq`).

# Security and Privacy

Names and ids reach the markup through `escapeHtml` (the canvas label, `data-view`); the view's values reach the kernel only as
the references and strings the existing builders already pass. No network, no storage.

# Observability and Verification

New Node tests (`library-view-diagram.test.js`), with the real kernel, a fake layout engine and a fake canvas, mounting the real
`mountDiagramIfNeeded`: the page of an Elements view puts a canvas in the centre whose scene holds the boxes and links the kernel
computes for the view (three viewpoints, a technology view, a facet, *Hide unlinked*, texts, a leaf element asked `detailed`);
the page of a Map view draws its pinned/hidden/opened elements; the toolbar and the canvas label; broken views (element deleted,
no pinned element left, unknown viewpoint) keep their message and have no canvas; the read-only drawing (no action anywhere,
clicking every kind of node reaches no case); the snapshot of every global the Map and Elements read, before and after a visit
(elements view, map view, broken view, tools used on the page, a keyboard `M`/`Escape`), and the address; the camera of the Map
after a zoom on the page; the Map's cache after a visit; the sequence edit-edit-edit (several mounts in a row, only the last
shown); `useDiagramHost` and `frame=fit`; `toggle-show` / `toggle-hide-unlinked` on the page do not write the globals and do not
mark the view modified; the existing 454 tests pass unchanged. Hand mutations of the new code, one at a time. The page is then
looked at in the built-in browser on a copy of the user's workspace (`archicode editor serve`), light and dark, to check the
layout and the Map after a visit; it cannot confirm a real folder picker (served mode only) nor a screen reader.

# Deployment and Rollout

None beyond the file. No stored data changes; an older editor ignores nothing new.

# Risks and Tradeoffs

- RISK-1 — A reader of a global that the swap does not cover. Mitigation: the snapshot test lists every `let` of the diagram
  section the Map and Elements read; a new global added later (W-2 selection) must be added to the snapshot test.
- RISK-2 — `render()` calls `useDiagramHost` before anything else draws; a code path that draws a diagram without `render()` (the
  hash handler, the async mount) relies on the host being right already: the mount runs from `render()` and
  `syncPerspectiveFromHash` is covered (FLOW-3).
- RISK-3 — The page's tools look like the Map's but do not write the view; a user may expect *Hide unlinked* to be saved. Mitigation:
  the status line and the tooltip say it ("for this page only, until the view is edited" is W-3's to replace); recorded as
  the reason W-3 exists.
- RISK-4 — `role="img"` on focusable nodes is a pattern some screen readers read as a picture without children; the label holds
  the name, kind and stereotypes. Not confirmable here.
- RISK-5 — A facet the settings lost is silently ignored on the page (ASM-3), as by *Open on diagram*.

# Open Questions

- Q-1 — (answered here, wave open question) the Library host takes a recipe (DEC-1); the tools split between page and view (DEC-4).
  W-2 owns: what a click on a box does, the right-hand panel, Maximize on this page; W-3: which attributes are fields.

# Deferred Work

- DEF-1 — Maximize on this page (W-2 decides with the right panel).
- DEF-2 — A message for a view whose facet no longer exists (a finding, small).
- DEF-3 — `markElementTabs` runs the kernel for the header's tab group even on the Library (its `.viewpoint-switch` is the
  Library tabs): pre-existing, harmless, left alone.

# File Placement and Frontmatter

`docs/wav/wav-006-library-view-editor/run/run-0027-library-view-diagram/tdd-0027-library-view-diagram.md`.
