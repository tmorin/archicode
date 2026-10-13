---
title: Editor — select a link and read its relationships in the inspection panel
type: tdd
status: completed
date: 2026-10-13
run: 0019
wave: 004
related:
  - docs/wav/wav-004-editor-workspace-experience/wav-004-editor-workspace-experience.md
  - docs/wav/wav-004-editor-workspace-experience/run/run-0018-inspection-panel-elements/tdd-0018-inspection-panel-elements.md
---

# Editor — select a link and read its relationships in the inspection panel

# Summary

Run 0018 put the data of the selected element in a right-hand panel. The relationships of an element are still read
on its Details page, or by hovering a link (a native tooltip that cuts at eight lines and shows neither the tags nor
the declaring element's file). This design lets the user **click a link of a diagram to select it**, and fills the same
panel with every declared relationship the link stands for: its label, its qualifiers and its tags (`tcp-port`,
`fhir-exchange`, `authn-enforcer-point` on the real workspace). The selection gets a new kind, `link`. Scope arrives
settled from the wave plan (row W-8) and the dispatch brief, so there is no PRD.

# Scope

In: `src/main/resources/editor-webapp/standalone.html` (the markup of the links of the SVG, the drawing's record of
what it drew, the selection kind and every place that reads the selection, the panel, CSS, one action, keyboard,
focus); the tests of `src/test/javascript/viewpoint-kernel/**`; the manual (`src/doc/README.adoc`, section
`[[editor-inspection]]`, outside the plan's `likely_paths`).

Out: editing a relationship from the panel (the Details page edits them); jumping from a relationship to its
declaring element (DEF-1); a link in the URL (DEF-2); the Rust kernel (no change, the base64 block is untouched);
selecting a link in a Library or story view (the diagram on screen is the only one).

# PRD Traceability

No PRD: traceability is **incomplete by design**. The requirements are the "Scope" and "Verified by" cells of row W-8 of
the wave plan and the dispatch brief:

- R1. A new selection kind `link`; a click on a diagram link selects it; a box click keeps its meaning (DEC-1, DEC-6).
- R2. The panel lists each declared relationship of the link with its label, qualifiers and tags (DEC-4, DEC-5).
- R3. A link that groups several relationships, is secondary, joins ghosts or collapsed boxes: what it is keyed by and
  what the panel shows (DEC-1, DEC-4).
- R4. Every place that switches on the kind stays correct for `link` (DEC-2, DEC-3, IMP-2).
- R5. The Map's own clear in `showDiagramScene` also clears what depends on a link selection (DEC-3).
- R6. Keyboard: links are reachable and selectable (DEC-6).
- R7. Closing and deselecting agree with run 0018's panel; light and dark; unsaved drafts discarded as the other
  selection handlers do (DEC-6, DEC-7).
- R8. Selection cleared on navigation (DEC-3).

All eight are addressed.

# Technical Goals

- TG-1. One gate per kind decides the panel: `inspectionRecordFor` (an element, unchanged) and `inspectionLinkFor` (a
  link); `renderInspectionHtml` is the only function that turns either into markup.
- TG-2. A link selection never makes the rest of the editor believe no element is selected when one is: in Elements the
  element being looked at keeps being the subject of the centre, the tree and the URL.
- TG-3. Nothing is derived twice: the panel reads what the drawing drew (the kernel's `relationships` of each link),
  not a second walk of the model.

# Non-Goals

- Making a relationship navigable, or editable, from the panel.
- Changing what a click on a box, a fold button or a ghost does.

# Assumptions

- ASM-1. The kernel returns, per link, `relationships: [{from, destination, label, qualifiers, tags, application}]`: the
  declared relationships the link stands for (several when it groups some). Validated in `lib.rs` (`emit_links`,
  `OutRel`) and the module comment ("Contract").
- ASM-2. Several links can join the same two boxes: a natural link is one per distinct relationship (different label,
  qualifiers or tags), and `highlightDiagram` already lights every link of the pair together. Validated in
  `emit_links` and in `highlightDiagram`.
- ASM-3. A link not drawn (the kernel's `secondary`, or a link ELK gave no section) has no element in the SVG, so it
  cannot be clicked: nothing to design for it. Validated in `buildElkGraph` (secondary links are left out) and
  `renderDiagramSvg` (`if (!section) continue`).
- ASM-4. Item ids are unique in a drawing; ghost ids (`ghost:<owner>><destination>`) are deterministic. Validated in
  `buildDiagramGhosts`.
- ASM-5. `render()` runs after every handler and ends with `mountDiagramIfNeeded()`, which shows a cached scene
  synchronously or computes one asynchronously; `diagramScene` holds the scene on screen until the next one replaces it.

# Constraints

- CON-1. A container query adds no specificity (run 0016); colours come from the theme variables, the dark ones are
  written twice and a test pins that: the panel adds no variable.
- CON-2. The base64 kernel block is not touched; no Rust change.
- CON-3. Tests match `<g class="dg-link"` as the start of a link: `class` stays the first attribute.
- CON-4. A box click (`goto-element`), a ghost click (`fix-dangling`) and the fold buttons keep their code paths.

# Current State

- A link in the SVG is `<g class="dg-link" data-from data-to><title/><path class="dg-hit-edge"/><path class="dg-edge"/></g>`
  and its caption a `<text class="dg-label" data-from data-to>`; neither has `data-action`, `tabindex` or a role. Hover
  and focus of a *box* dim everything but its links (`highlightDiagram`); hovering a link lights the links of the pair.
- The selection is `{kind: 'none'|'element'|'file'|'create', key, mode, layer?}`; 25 sites read it (counted by grep at the
  start of the run: about 45 lines).
- The panel (`renderInspectionHtml(onMap)`) is the right region of the Map and of the three diagram tabs of Elements;
  `markInspection` and `removeInspectionPanel` serve the Map's own clear in `showDiagramScene`.
- In an Elements diagram tab the selection **is** the element looked at: the centre, the tree, the URL and the tabs read
  `sel.key`. A click on a box there navigates (`goto-element` replaces the selection).

# Proposed Design

```
click on a link ──► select-link ──► AppState.selection = { kind:'link', from, to, layer, focal? }
                                          │
render() ── settleLinkSelection() ──► keeps it only while the diagram it was made on is on screen
        └─► renderInspectionHtml ──► inspectionLinkFor(sel) ──► the pair in diagramScene.links ──► relationships
showDiagramScene ── reconcileLinkSelection(scene) ──► drops it if the new drawing has no such pair, refreshes the panel
```

## Decisions

- **DEC-1 — What a link selection is keyed by: the pair of boxes, `(from, to)`, plus the layer of the drawing.**
  `{ kind: 'link', key: from + ' -> ' + to, from, to, layer, mode: 'view' }`, where `from` / `to` are item ids of the
  drawing (a reference for a plain box, `ghost:…` for an unknown element, a reference of a collapsed box). Not the link
  object, not a position in the list: the drawing is rebuilt at every change and the pair is the only identity that
  survives it (ASM-4), and it is what hover already treats as "the same link" (ASM-2). Consequence: the selection is
  the **connection between two boxes**, so the panel lists the relationships of every link of the pair, and the
  outline marks every link of the pair. `key` exists for the view key of `render()` (`kind|key|mode|layer`); the
  match is on `from` and `to`. The direction matters: `A → B` and `B → A` are two selections.
  Cases: a link that **groups** several relationships is one pair (the panel lists them all); a link between
  **collapsed or folded boxes** is keyed by those boxes (the panel names the folded end, says how many elements it
  hides and that opening it shows the relationships one by one; opening it makes that pair disappear from the drawing,
  and the selection with it, DEC-3); a link to a **ghost** is selectable (it is clickable like its box, but a click on
  the link only reads: the box still carries the fix action); a **secondary** link is not drawn, so it is never
  selected (ASM-3). Accepted loss: with two parallel links between the same boxes, a click on one selects the pair and the
  panel lists both relationships, without marking which link was clicked (the outline marks both): what the user wants to
  read is what connects the two boxes, and a pair is the identity that survives a redraw.
- **DEC-2 — Elements too, with the element kept as the subject: `focal`.** Selecting a link in a diagram tab of
  Elements must not blank the centre, empty the tree or lose the URL, which all read the selection as the element
  being looked at. So a link selection made in Elements carries `focal` (the reference of the element whose diagram
  it was made on), and every place that asks "which element is this perspective about" reads
  `elementSelection()`: the selection itself, or for a link with a `focal`, the element-shaped selection of that
  element (`{kind: 'element', key: focal, layer, mode: 'view'}`). On the Map a link selection has no
  `focal` and is a selection of no element, like `none`: no subject in the header, no *Open in Elements*, no outline on
  a box. A `link` that is a selection kind is a constraint of the dispatch brief, not a free choice; the review of this
  design (KDMLLC) pointed out that a module-level `selectedLink` next to the element selection would avoid `focal`,
  `elementSelection()` and the audit below at the price of two selections that must be kept consistent (a box click
  would have to clear the link, every selection handler too): the constraint wins, and `elementSelection()` keeps the
  cost in one function. The layer of the drawing is the layer of its element, so `layer` serves for the `focal` too.
  Rejected: Map only (a link click that does nothing in Elements, where the panel already follows the user from
  box to box, is a trap the user finds at once); a `link` field on the element selection (it would not be a new
  selection kind, and every consumer of the element would have to know about it).
- **DEC-3 — Lifetime: a link selection lives only while the diagram it was made on is on screen.**
  - `render()` begins with `settleLinkSelection()`: a link of the Map stays only on the Map; a link with a `focal` stays
    only on a diagram tab of Elements whose element is that `focal`. Anything else (another perspective, Details, the
    edit form, a deleted element) turns it into `elementSelection()` (the `focal`, or `none`). This one place is what
    "selection cleared on navigation" means; no handler has to remember it. Every other handler already *replaces*
    the selection (`goto-element`, `select-element`, `select-file`, the create forms), which also ends the link.
  - `showDiagramScene` calls `reconcileLinkSelection(scene)` after the scene is on screen: a scene without that pair
    (a facet, Hide unlinked, a fold or an unfold, another tab, a pin, a hidden element, a scene that draws no links:
    an error, "Nothing to show", the plain list) drops the selection, **by hand** and without a redraw, as W-7's code
    does for an element: on the Map the panel and its handle are removed (`removeInspectionPanel`); in Elements the
    panel is redrawn for the focal element (`refreshInspection`). A scene that does have the pair refreshes the panel
    (the facet may have removed some of its relationships). The Map has nothing else that depends on a link selection
    (no header subject, no *Open in Elements*), so there is nothing else to remove; the list is in the comment of the
    function, for the next piece that depends on it.
  - The rename / delete / reload paths (`rewriteUiReferences`, `forgetUiReferences`, the reload) first turn a link
    selection into `elementSelection()` (`dropLinkSelection`), so that the rest of their code only ever sees the kinds
    it knows.
  - Maximizing keeps the selection (the panel is hidden, as for an element) and un-maximizing shows it again.
- **DEC-4 — What the panel shows.** `renderInspectionHtml` branches on the selection: an element as before, a link
  through `renderLinkInspectionHtml`. Heading "Selected link" and a **Close** button (both perspectives: on the Map
  nothing else deselects; in Elements it goes back to the element's own panel, `close-inspection` reads
  `dropLinkSelection`). Then:
  - the two ends as two rows, *From* and *To*: the name, the kind in brackets (`diagramItemText`), the reference when it
    differs from the name, and for a folded box "N hidden" with a note that opening it shows the relationships one by
    one; for a ghost "unknown element";
  - *Relationships (N)*: one block per declared relationship, in the kernel's order, each with its label (or "no
    label"), the path `declaring reference → destination reference` (it differs from the ends when the link groups or
    rolls up relationships of elements inside folded boxes), a *Qualifiers* row (pills, the same markup as the
    element's) and a *Tags* row (`tag-key: tag-value`, the same markup), each "none" when empty;
  - a note "N relationships are grouped in this link" when the pair carries more than one; for a ghost link the one
    relationship says it points at an element that does not exist (its dashed box says it too and fixes it);
  - *Layer*: the layer of the drawing.
  The relationships come from the kernel's `relationships` of the links of the pair (ASM-1, TG-3). A link whose
  `relationships` is empty (a ghost link) is described from the link itself (label, qualifiers, tags, ends); this is the
  one second path, and it stays because the kernel never sees a ghost: `buildDiagramGhosts` gains the `tags` of the
  relationship on its link so that the fallback has them.
  `renderElementPropertiesHtml` is left as it is; the pills and the tag list are extracted from it into two helpers
  (`renderQualifierPillsHtml`, `renderTagListHtml`) used by both, so that the markup of an element's qualifiers and
  tags and a relationship's cannot drift (RISK-3 of run 0018, again).
- **DEC-5 — Where the data comes from, and when.** `renderDiagramSvg` returns `links`: one record per drawn pair with
  its ends (`{from, to, fromEnd, toEnd, links: [link…]}`, each end `{id, reference, title, sub, ghost, collapsed,
  hidden}`), and `mountDiagramIfNeeded` puts it on the scene (`scene.links`, cached with it). `inspectionLinkFor(sel)`
  finds the pair in `diagramScene.links`. `render()` builds the panel before the new drawing exists, from the scene on
  screen; when that scene has no such pair (the first redraw after a change) the panel is rendered with its heading and
  Close and a "Reading the link…" line, and `reconcileLinkSelection` fills it or drops it right after. No kernel call
  and no asynchronous work in the panel.
- **DEC-6 — Click and keyboard.** A link and its caption carry `data-action="select-link"`, `data-from`, `data-to` and
  `data-layer`. The link `<g>` is a tab stop like a box: `tabindex="0"`, `role="button"`, `aria-pressed` (the pair is
  selected or not), `aria-label` "Link from A to B: caption". `Enter` and `Space` already turn a keypress on a focused
  `<g>` with a `data-action` into a click (`handleDiagramKeydown`), so no new key code is needed for that; the caption
  `<text>` is clickable but not a tab stop (the link already is). Justification for a tab stop rather than a roving
  scheme: it is how the boxes work and the only way a keyboard user finds a link without a new key to learn; the
  price is that Tab visits the links (drawn before the boxes) first, and a dense Map has as many stops as links
  (RISK-1, no threshold: a roving scheme can replace it without touching the selection). The arrow keys go on from a
  focused link as from the box it starts from (`diagramLinkStartOf`), so a user on a link is not thrown to the first
  box. `Escape` while the focus is in the diagram stage (the keydown handler is bound there) deselects a link selection
  when not maximized (it already leaves Maximize); it does nothing for an element selection, and from the panel the
  Close button is the way. Focus: hover and focus of a link light the links of its pair
  (`handleDiagramFocus` and `handleDiagramPointerOut` now include links), a focused link is panned into view, and the
  focus returns to the same link after the redraw (`diagramFocusTargetOf` / `restoreDiagramFocus` know links), because
  Enter redraws everything. The selected pair is outlined (`dg-link-selected`) and `aria-pressed` set after each drawing
  (`markLinkSelection`). The click handler:
  - discards `rawYamlEditDraft` and `pendingDeleteConfirmation` like `goto-element` (and is listed in
    `ACTIONS_LEAVING_THE_FORM`, for the same reason);
  - on the Map, with the framing on Center, pins the framing (`takeOverDiagramFraming`) before the panel can appear,
    as `goto-element` does: selecting must not jump the view;
  - does not push a history entry (a link is not a place; the URL does not carry it: DEF-2), and does not change the
    perspective, the tab, the facet or the box selection of the focal element.
  A box click is untouched (`goto-element` is not modified: a test pins its source, as in run 0018).
- **DEC-7 — Audit of the places that switch on the selection kind.** For each, what a `link` does:
  - `currentRouteHash`: reads `elementSelection()`: Elements keeps `ref=<focal>` and its tab params; the Map has no
    `ref` for a link (as for `none`).
  - `layerOfReference`, `renderTreeNodeHtml`, `renderElementsNavHtml` (the active row and the tab stop),
    `renderCenterPanelHtml`, `diagramTabShown`, `markElementTabs`, `currentViewDefinition`: read `elementSelection()`;
    so a link selected in Elements leaves the tree row active, the centre on the diagram, the tabs marked and *Name
    view…* saving the element's view.
  - `forgetUiReferences`, `rewriteUiReferences`, the reload after a file edit: `dropLinkSelection()` first.
  - `markElementTabs`: both reads (the one before the await and the guard `nowSel` after it) go through
    `elementSelection()`; with only the first one the guard would return early with a link selected and the tabs that
    say "Nothing to show" would stay clickable.
  - `commitPendingEdits` (the draft flush reads `kind === 'file'` and `'element'` with `mode === 'edit'`) and
    `renderMapPerspectiveHtml` (`kind === 'element'` for the header subject): judged unaffected, a link is neither.
  - `showDiagramScene` (`scene.focal`, `mapSelectionCheck`): a link is not an element, so the focal of the Map is
    none and the existing element check is skipped; DEC-3 adds the link check. It also drops the link on a scene that
    draws no links (an error, "Nothing to show"), where the Map's rule for an element leaves the selection alone: a link
    that is not on screen cannot be selected, and the next drawing is what would show it again.
  - `markMapSelection`: only boxes (`dg-selected`); `markLinkSelection` is the links' own.
  - `render()` view key: `kind|key|mode|layer` + `focal`, so the panel opens at the top for another pair.
  - `toggle-element-edit`, the create/submit handlers, `select-file`: act on `kind === 'element'` / `'create'` /
    `'file'` and are unreachable or inert with a link selected (Details and the forms are not diagram tabs, and
    `settleLinkSelection` has already ended the link there); no change.
  - `goto-element`'s `AppState.selection.key !== destinationRef` history test: a link's `key` never equals a reference.
  - `close-inspection`: element → none (Map); link → `dropLinkSelection()` (Map: none; Elements: the element).
  - The export (`diagramExportDocument`) strips `tabindex` and `data-action` already; it also strips `aria-pressed` and
    the `dg-link-selected` class. `role` and `aria-label` stay: they are valid, useful SVG.

# Repository Impact

- IMP-1 — `standalone.html`: CSS (`.dg-link` cursor, focus and selected outline, the caption, `.inspection-rel*`); JS:
  `renderDiagramSvg` (the markup of links and captions, the returned `links`), `mountDiagramIfNeeded`
  (`scene.links`), `elementSelection`, `dropLinkSelection`, `settleLinkSelection`, `inspectionLinkFor`,
  `renderLinkInspectionHtml`, `renderQualifierPillsHtml`, `renderTagListHtml`, `refreshInspection`,
  `reconcileLinkSelection`, `markLinkSelection`, `select-link` and `close-inspection`, `Escape`, the focus helpers.
- IMP-2 — The sites of DEC-7 (12 one-line changes: eleven reads through `elementSelection()` or `dropLinkSelection()`,
  plus the view key).
- IMP-3 — `src/test/javascript/viewpoint-kernel/inspection.test.js` (new tests, or a new `inspection-links.test.js`).
- IMP-4 — `src/doc/README.adoc`: `[[editor-inspection]]` gains the link.

# Canonical Impact

- CI-arc-1 — None. The repository declares no `arc` register (no `docs/CLAUDE.md`, no `docs/arc`); the change is the
  presentation of existing data in one file of the editor.
- CI-dom-1 — None. No `dom` register is declared and no domain invariant becomes enforceable: nothing about the model,
  the manifests or the kernel changes.

# Data Model and Contracts

- CTR-1 — Selection: `{ kind: 'link', key, from, to, layer, mode: 'view', focal? }`; `focal` present exactly when it
  was made in a diagram tab of Elements. `key` is only for the view key of `render()`.
- CTR-2 — Link markup: `<g class="dg-link" data-from data-to data-layer? data-action="select-link" tabindex="0"
  role="button" aria-pressed aria-label>`; the caption `<text class="dg-label" data-from data-to data-layer?
  data-action="select-link">`.
- CTR-3 — Scene: `scene.links: [{from, to, fromEnd, toEnd, links}]`, present on every scene that has an SVG.
- CTR-4 — Panel markup: the element panel is unchanged (`.inspection[data-inspection-ref][data-inspection-layer]`); the
  link panel is `.inspection.inspection-link[data-inspection-from][data-inspection-to][data-inspection-layer]`, with
  `.inspection-head`, a `.field-row` per end and one `.inspection-rel` per relationship. A link has no single
  `data-inspection-ref`, so `markInspection` (the element's off-map note) finds nothing to do for it.
- CTR-5 — Action `select-link` (`data-from`, `data-to`, `data-layer`); `close-inspection` as in DEC-4.

# Interfaces and Behavior

- IF-1. Click (or Enter / Space) on a link or its caption: the pair is selected, outlined, and the panel lists its
  relationships. The perspective, the tab and the focal element do not change.
- IF-2. Click on a box: as before (it selects the element, which ends the link selection).
- IF-3. Close or Escape: the panel is the element's again (Elements) or goes (Map).
- IF-4. Nothing selected: nothing rendered, as in run 0018.

# Flows and Processing Logic

- FLOW-1 — Select on the Map. Click → `select-link` (framing pinned, drafts discarded) → `AppState.selection` →
  `render()` → `settleLinkSelection` (kept) → shell with the panel (from `diagramScene`) → `mountDiagramIfNeeded` (cache)
  → `showDiagramScene` → `reconcileLinkSelection` (kept, panel refreshed) → `markLinkSelection`.
- FLOW-2 — A fold on the Map while a link is selected. `toggle-fold` → `render()` → new scene → the pair is still drawn
  (kept) or is not (dropped by hand, panel removed).
- FLOW-3 — Navigate. Any click that replaces the selection, or `setPerspective`, or the Details tab →
  `settleLinkSelection` / the replaced selection ends the link before the shell is built.

# Reliability, Performance, and Scalability

The panel is markup from the scene's records: no kernel call, no asynchronous work. `scene.links` is one record per
pair: it is the size of the drawing's links. A panel that lists a very large grouping (hundreds of relationships) is a
long list in a scrolling aside; it is not truncated (the tooltip is, at eight) because the panel is where to read them.

# Security and Privacy

Every value goes through `escapeHtml` (labels, qualifiers, tags, references and names come from user files); the
attributes of the SVG (`data-from`, `data-to`) are escaped as they are today. The panel adds no input.

# Observability and Verification

- Node tests: selection and key; a click on a link (fake target) sets the selection, discards the drafts and does not
  navigate; the markup of a link (action, `tabindex`, `role`, `aria-pressed`, `aria-label`) and of the caption; the
  panel for a natural link (label, qualifiers, tags `audited: no`), for a grouped one (several blocks, the note), for a
  link of a folded box, for a ghost link; the same pair listed once for two links; the panel in Elements (tabs, no
  centre change, `elementSelection`, the hash, the tree row); Close in both; `settleLinkSelection` per perspective and
  tab; `reconcileLinkSelection` (kept, refreshed, dropped, Map removes the panel, Elements redraws the element's);
  `Escape`; the focus helpers; every consumer of DEC-7 with a link selected; the stylesheet text (cursor, outline, no
  new variable); the export strips `aria-pressed`.
- `./mvnw test`, `embed.sh --check`, the whole node suite.
- Looked at in the built-in browser on a **replica** (harness markup, real stylesheet) with a link panel, light and
  dark, at a narrow and a wide panel.
- Cannot be confirmed: the real page (File System Access picker); a real ELK drawing, the 12px hit area of a link
  under a finger or a pointer, the outline over a real drawing, tabbing through a dense map.

# Deployment and Rollout

Code and documentation only. Rollback: revert the commit. No stored data changes.

# Risks and Tradeoffs

- RISK-1. Tab stops: a dense Map has as many link stops as links. Accepted (DEC-6); a roving scheme can replace it
  without touching the selection model.
- RISK-2. The hit area of a link is the 12px transparent path it already has (it carries the tooltip today); a click
  that lands between a link and a box edge selects the box, as before.
- RISK-3. A selection made on a drawing can name a pair that a redraw does not have: DEC-3 drops it by hand; the
  window is the time between `render()` and the new scene, in which the panel shows the previous drawing's data.
- RISK-4. The element-shaped selection of `elementSelection()` is a new object per call: nothing may compare it by
  identity or mutate it (the mutating sites, DEC-7, `dropLinkSelection` first).

# Open Questions

None open. Answered here: what a link selection is keyed by (DEC-1), what the panel shows in each case (DEC-4), links
in Elements (DEC-2), keyboard (DEC-6).

# Deferred Work

- DEF-1. Make the declaring element of a relationship a button (open its Details, to edit the relationship).
- DEF-2. A link in the URL (`link=from>to`), so a shared address opens with the link selected.
- DEF-3. A human look at the real page in Chromium, light and dark, with the user's workspace: a real drawing, the click
  on a thin link, the outline and the tab order on a dense map.
- DEF-4. Center on the selected link on the Map (`scene.focal` is none for a link).

# File Placement and Frontmatter

`docs/wav/wav-004-editor-workspace-experience/run/run-0019-inspection-panel-links/tdd-0019-inspection-panel-links.md`.
