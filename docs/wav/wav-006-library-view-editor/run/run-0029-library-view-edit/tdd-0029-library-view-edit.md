---
title: Editor — editing a view from its page in the Library
type: tdd
status: completed
date: 2026-10-13
run: 0029
wave: 006
related:
  - docs/wav/wav-006-library-view-editor/wav-006-library-view-editor.md
  - docs/wav/wav-006-library-view-editor/run/run-0027-library-view-diagram/tdd-0027-library-view-diagram.md
  - docs/wav/wav-006-library-view-editor/run/run-0028-library-view-panels/tdd-0028-library-view-panels.md
---

# Editor — editing a view from its page in the Library

# Summary

Since runs 0027 and 0028 the page of a view (`#/library/views?view=<id>`) draws the view in its centre and lists its attributes in the
panel on the right, read-only; *Hide unlinked* and the four texts of its toolbar are a transient look (`libraryLook`). This design makes the
attributes **controls**: viewpoint, layer, element (or the pinned, hidden and opened elements of a Map view), facet, *Hide unlinked*, the
four texts. A control changes the view entry in memory (`markEntryChanged`, the *modified* badge, *Save all changes* / *Cancel* as for any
entry), and the diagram follows because the page's recipe is built from the view. The toolbar's *Hide unlinked* and text buttons on the page
become the same edits (the transient look goes). Nothing is written before *Save all changes*, and then only the manifest of that view.
Scope arrives from wave 006 (run W-3); there is no PRD.

# Scope

In: `src/main/resources/editor-webapp/standalone.html` (the view's attributes as controls, the edit functions, the `change` listener, the two
toolbar branches, `libraryLook` removed, CSS); `src/test/javascript/viewpoint-kernel/` (`library-view-edit.test.js` new; the tests of run
0027/0028 whose subject changes are edited); `src/doc/README.adoc` (`editor-stories`).

Out: creating or deleting a view from the Library (*Name view…*, *Delete* already exist), editing the steps, a baseline/target diff, editing
a box or a link of the drawing, folding on the page, the Rust kernel, the Java side, the view manifest format, the YAML saver (commit
7a3c3be already keeps comments).

# PRD Traceability

No PRD (profile `TDD+pln`): **traceability is incomplete** by construction. Requirements: the W-3 row of "Phase P2" of the wave plan, the P2
gate criteria, and the dispatch brief.

- R1 — A change of the viewpoint, the element (or the pins), the facet, *Hide unlinked* or a text from the panel redraws the diagram, marks the
  view modified, and writes nothing until *Save all changes*, after which the view manifest holds the new values and only that file changed.
- R2 — *Cancel* gives the edit up (manifest in memory and diagram are the saved ones again).
- R3 — A view edited into something that cannot be drawn says why instead of throwing.
- R4 — Renaming an element still updates the views that point at it; the stories that show an edited view show the edited view.
- R5 — The manual describes the page of a view: the diagram, the panels and what can be edited.
- R6 — The toolbar of the diagram on this page acts on the view being edited, not on the Map's state; moving the camera is not an edit.
- R7 — (wave open question) which attributes are edited by a field and which by the diagram; where the pins of a Map view are edited.
- R8 — `libraryPick` stays consistent with the edits; the Map and Elements are untouched by a visit and by an edit.
- R9 — Saving does not make the loss of YAML comments worse; the saved file is recorded before and after.

Map: R1 DEC-1..DEC-5; R2 DEC-8; R3 DEC-4; R4 DEC-8; R5 IMP-4; R6 DEC-2; R7 DEC-1; R8 DEC-6; R9 DEC-8.

# Technical Goals

- TG-1 — The Map and Elements behave as before: the existing tests pass; only the tests whose subject changes (the transient look, the
  read-only facts) are edited.
- TG-2 — An edit touches the entry of the view and nothing else: no global the Map or Elements read, no other manifest.
- TG-3 — Everything is testable in Node against the harness of run 0027, with an in-memory folder for the save.

# Non-Goals

- No new way to create a view; no undo of an edit (Cancel gives up everything unsaved, as elsewhere); no editing in the drawing.

# Assumptions

- ASM-1 — `markEntryChanged(entry)` re-serialises the manifest line by line against its previous text (`patchYamlText`, commit 7a3c3be), so
  comments and layout of the file stay and only the changed lines change **when the layout is one `patchYamlText` can follow** (else the file is
  emitted whole, RISK-4). An entry of `workspace.yaml` (a legacy view) marks the workspace file instead: saving it rewrites workspace.yaml, and
  `entryIsModified` shows *modified* on every legacy entry (existing behaviour, accepted).
- ASM-2 — A step points at a view by id (`step.view`); `stepView` reads the entry, so an edit is seen by every story at once, and
  `rewriteSavedViewReferences` already rewrites the properties of the entry when an element is renamed.
- ASM-3 — `cancelChanges` re-reads the folder (`loadWorkspace`): the entries are new objects, the page redraws from them.
- ASM-4 — The harness has no layout, no focus, no event dispatch and no scroll: the controls are driven through their handlers with fake targets, and
  focus, tab order, click-after-type, scroll and the look are checked in a browser; what that does not confirm is said.

# Constraints

- CON-1 — `standalone.html` is one file; the kernel block (base64) is not touched.
- CON-2 — The source pins of earlier runs hold (`showDiagramScene` order, the cases `goto-element`/`select-link` text, `markMapSelection` after
  `showDiagramScene` in the file).
- CON-3 — The right panel is 270-400 px: the controls stack (label over control), as the fields of the inspection.

# Current State

- `libraryDiagramRecipe(view)` builds the recipe from the view and `libraryLook` (null: as the view says). `toggle-show` and
  `toggle-hide-unlinked` write `libraryLook` when `currentPerspective === 'library'`.
- `renderViewAttributesHtml(view)` = `renderViewFactsHtml` (a `<dl>` of `describeViewDefinition`, viewpoint, layer, the canonical properties,
  *Kept in*) + the steps that show the view. It is the right panel of a drawable view and the centre of one that cannot be drawn
  (`renderViewDetailHtml`, with the problem).
- `canonicalViewDefinition` drops a text equal to its default (`DIAGRAM_SHOW_DEFAULTS[map|elements]`), keeps `hide-unlinked` only when true, sorts
  the lists. `viewProblem(view)` is the one place that says why a view cannot be drawn.
- Forms type references in an `<input list=…>` backed by the `archicode-*-references` datalists; facets are a `<select>` of
  `settings.facets.customs`; the only delegated form listener is `input`.

# Proposed Design

## DEC-1 — What is edited by a field, and what by the diagram (the wave's open question)

**Every attribute is edited by a field of the panel; the drawing itself edits nothing.** The panel's section "The view" becomes a form:

- *Viewpoint*: `<select>` Overview, Detailed, Deep, Map (and, for a view whose viewpoint the editor does not draw, that value, marked as such).
- *Layer*: `<select>` application / technology, for the three element viewpoints only (a Map view has the application layer).
- *Element*: `<input list=…>` over the references of the layer, for the element viewpoints; committed on `change` (a keystroke is not an edit).
- *Pinned*, *Hidden*, *Open*: for a Map view, each a list of pills with a remove button and an input to add a reference (committed on `change`).
- *Facet*: `<select>` "none" + the facets of the workspace (a facet the workspace no longer has stays as an option marked "not defined").
- *Hide unlinked* and *Labels / Qualifiers / Descriptions / Wrap*: checkboxes.

The toolbar's *Hide unlinked* and the four text buttons of the diagram are the same edits, so they stay lit as the view says, and the
two surfaces agree. Zoom, centre, fit, pan, PNG and SVG move the camera or export: not edits. Map pins are edited **in the panel, as
lists with add and remove**, not on the diagram: the page's drawing is read-only on purpose (a click selects, DEC-3 of run 0028; there are
no fold buttons or chips), and the Map is still the place to explore (*Open on diagram*). A typed list is also the only way to reach an element that
the drawing does not draw (hidden ones, pins that no longer exist).

## DEC-2 — The view entry is the single source; `libraryLook` goes

An edit mutates the entry (`view.viewpoint`, `view.layer`, `view.properties`) and calls `markEntryChanged(view)`, then `render()`.
`libraryDiagramRecipe(view)` reads the view only (the look is removed with `libraryLookFor`, its reset and its tests), and the cache key of
`mountDiagramIfNeeded` already holds the input, `hideUnlinked` and the texts, so a new value is a new layout (the cache keeps the last scene only: an
identical redraw is a hit, going back to an earlier value is a new layout).
`toggle-show` and `toggle-hide-unlinked` on the page call the same functions as the panel.

## DEC-3 — The shape of an edit

One function `editSavedView(viewId, change)`: finds the entry (the page's view), applies `change(view, properties)`, marks it changed, clears the notice,
and renders; the controls reach it by a `change` listener on `#app` (`handleAppChange`, selects, checkboxes, inputs with `data-view-field`) and
by `data-action` buttons (`view-list-remove`, `view-list-add`). Rules that keep the file as the canonical form says:

- a property equal to "nothing" is removed (`facet` empty, a list that became empty, `hide-unlinked` false, `element` empty);
- a text equal to the default of that kind of diagram is removed, any other is written as a boolean (so the file never holds a choice that is not a choice);
- a key the editor does not know stays as it was; the keys of an edit appear in the file where `patchYamlText` puts them (the end of `properties`).

*Viewpoint*: between the three element viewpoints it only changes `viewpoint`. Element viewpoint to Map: `pinned: [element]` when the element is
of the application layer (else none), `element` goes, `layer: application`. Map to an element viewpoint: `element` becomes the first pinned
element, in the order of the file, that still exists (none when there is none), `pinned`, `hidden`, `opened` go. The texts the view showed are kept: the defaults of a Map and of an
Elements diagram differ, so the shown values are re-written against the defaults of the new kind. *Layer*: the element is kept when it
exists in the other layer, else cleared (the view then says it needs an element).

## DEC-4 — Invalid input is refused; an undrawable state is said

A typed element that is not an element of the layer, or a reference to add that is not an application element, **changes nothing** and says so under
the field (`role="alert"`, `viewEditNotice`). A state the controls can still reach and that cannot be drawn (the layer switched without an
element; a pinned list left with only pins that no longer exist — an empty list is the whole map, a list of missing pins is a problem) is said by
`viewProblem` ("This view has no element." when `element` is empty; the name of such a view reads "(no element)"), in the centre as today: the centre of an undrawable view keeps the form, so the reader repairs it
where the message is. A facet that removes the element is already said by the diagram ("Nothing to show: facet … removes this element").
Nothing throws: `libraryDiagramRecipe` returns null for any `viewProblem`. **Saving is not blocked** for such a view: it is the user's text, the
Library already lists a view whose element was deleted as *broken*, and Cancel gives the edit up. A refused text stays in its field with the notice, to be corrected.

## DEC-5 — Controls are committed on `change`

`app.addEventListener('change', handleAppChange)`. A select, a checkbox or a text input (blur, Enter, a datalist choice) is one edit. Every control
has an id. The focus is given back to the control only when it still has it (Enter, a select, a checkbox); a text committed by leaving it for
another control is applied at once, *Save all changes* is lit in place, and the redraw follows 250 ms later, so that the click that made it lose the
focus (the replaced controls would otherwise swallow it) lands, and Tab is not pulled back. The scroll of the panel is kept by `render()` (same view
key); the form moving from the panel to the centre when a view becomes undrawable opens at the top (accepted). Adding a pin has one path: the input, Enter.

## DEC-6 — The selection of the page stays consistent

`libraryPick` is left alone by an edit: a picked element exists in the workspace whatever the view draws (run 0028), so it stays and is
outlined only if the drawing has a box for it; a picked link is ended by `reconcileLinkSelection` when the new drawing holds none. A
view that becomes undrawable keeps its pick for when it is drawn again; the pick is dropped when another view is shown (as today).

## DEC-7 — Layout

A section "The view" of fields: label over control, full width, in the panel and, for an undrawable view, in the centre. Pills use the
existing `.pill` / `.pill-remove`. *Draws* (the canonical definition in words, the one read-back of what the fields say) and *Kept in* stay as read-only facts above the fields,
*Shown in* below; a *modified* mark is on the Views list (existing) and in the header of the page.

## DEC-8 — Saving, Cancel, renames (nothing new)

*Save all changes* writes the manifests marked dirty: the edited view's file only (test: the writes list). The saved file is the old text
patched line by line: comments and layout stay (recorded before/after in the prg for a real manifest). *Cancel* is `cancelChanges`
(confirmation, re-read from disk): the entries are the saved ones again and the page redraws from them. Renaming an element rewrites the
properties of the views through `rewriteSavedViewReferences` (existing), and the page then draws the renamed element.

# Repository Impact

- IMP-1 — `standalone.html` JS: `renderViewAttributesHtml` (controls), `renderViewFactsHtml` (fields; the read-only facts reduced to *Kept in*),
  `editSavedView` and the setters (`setViewViewpoint`, `setViewLayer`, `setViewElement`, `setViewFacet`, `setViewFlag`, `setViewListItem`),
  `handleAppChange`, the cases `toggle-show`, `toggle-hide-unlinked`, `view-list-remove`, `libraryDiagramRecipe`,
  `viewProblem` (empty element), `describeViewDefinition` ("(no element)"), `render()` (the notice), `resetUiState`; `libraryLook` removed.
- IMP-2 — CSS: `.view-edit*`.
- IMP-3 — Tests: `library-view-edit.test.js` (new); `library-view-diagram.test.js`, `library-view-panels.test.js` edited where the subject changed.
- IMP-4 — `src/doc/README.adoc` (`editor-stories`).
- IMP-5 — Run documents.

# Canonical Impact

- CI-arc-1 — Not applicable. No `arc` register is declared in this repository; one page of a single-file web page changes.
- CI-dom-1 — Not applicable. No `dom` register is declared; the view manifest format, the kernel contract and the address grammar do not change;
  no analysis is fulfilled.

# Data Model and Contracts

- CTR-1 — A view entry stays `{ id, name?, viewpoint, layer, properties: { element? | pinned?, hidden?, opened?, facet?, hide-unlinked?, labels?, qualifiers?, descriptions?, wrap? } }`.
- CTR-2 — Controls (each with an id `view-edit-…`): `data-view-field` ∈ `viewpoint | layer | element | facet | hide-unlinked | show:<name>`; list inputs: `data-view-list` ∈ `pinned | hidden | opened` (add by Enter).
- CTR-3 — Action: `view-list-remove` (`data-list`, `data-ref`).

# Interfaces and Behavior

- IF-1 — Choosing a value changes the drawing at once, adds *modified* to the view in the list and enables *Save all changes* and *Cancel*.
- IF-2 — Typing an unknown element or reference changes nothing and says why under the field.
- IF-3 — The toolbar's *Hide unlinked* and text buttons do what the checkboxes do.
- IF-4 — A view that cannot be drawn shows the same form in the centre with its message.

# Flows and Processing Logic

- FLOW-1 — control `change` → `handleAppChange` → `editSavedView` → mutate entry → `markEntryChanged` → `render()` → `renderLibraryPerspectiveHtml`
  (recipe from the edited entry) → `mountDiagramIfNeeded` (supersedes the layout in flight; cache hit when known) → `showDiagramScene`
  (`reconcileLinkSelection`).

# Reliability, Performance, and Scalability

Each edit is one layout (as a click on the Map's tools); a sequence of edits supersedes the layouts in flight (`diagramSeq`) and ends on the
last one. Datalists hold the references of the workspace as the forms do.

# Security and Privacy

Names, references and ids go through `escapeHtml`; typed text is only ever compared with the index or stored as a YAML scalar by the existing
serialiser. No network.

# Observability and Verification

Node tests (real kernel, fake layout, fake canvas, in-memory folder; the `libraryPick` cases: an element pick survives an edit, a link pick is ended by an edit that drops the link, an undrawable view and back, Cancel; a legacy view of workspace.yaml): each attribute edit changes the recipe and the drawing, marks the view
modified, writes nothing before the save, and the save writes the view's file only with the new values (and the file keeps its comments);
Cancel; refused input; undrawable states; three rapid edits end on the last; the toolbar toggles edit the view; rename of an element; a story
step shows the edited view; the Map and Elements untouched by edits; hand mutations. The page is then used in the built-in browser on a copy of the user's
workspace (an edit and a save of `authentication_token_validation`, the manifest before and after).

# Deployment and Rollout

None beyond the file and the manual.

# Risks and Tradeoffs

- RISK-1 — Two controls for the same attribute (panel and toolbar) could disagree. Mitigation: both read the recipe built from the view; tested.
- RISK-2 — Converting Map to Elements keeps one pin (the first that exists) and drops `hidden` and `opened`; a technology element converted to Map gives no pin. Accepted and said in the manual; *Cancel* restores before the save.
- RISK-3 — Committing on `change` means a typed element is not applied until blur or Enter. Standard for a field with suggestions.
- RISK-4 — The saver rewrites the file: comments stay (7a3c3be) but a layout the editor does not write (flow style, anchors) is rewritten whole.
  Recorded for the real manifest.

# Open Questions

None: the wave's open question of this run is answered by DEC-1.

# Deferred Work

- DEF-1 — Choosing the pins by clicking boxes or the tree on the page. Not asked; the Map does it.

# File Placement and Frontmatter

`docs/wav/wav-006-library-view-editor/run/run-0029-library-view-edit/tdd-0029-library-view-edit.md`.
