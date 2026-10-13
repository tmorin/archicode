---
title: Editor — a right-hand panel reads the data of the selected element
type: tdd
status: completed
date: 2026-10-13
run: 0018
wave: 004
related:
  - docs/wav/wav-004-editor-workspace-experience/wav-004-editor-workspace-experience.md
  - docs/wav/wav-004-editor-workspace-experience/run/run-0016-center-header-responsive/tdd-0016-center-header-responsive.md
  - docs/wav/wav-004-editor-workspace-experience/run/run-0017-editor-applies-styles/tdd-0017-editor-applies-styles.md
---

# Editor — a right-hand panel reads the data of the selected element

# Summary

To read the description, the tags or the source file of an element, the editor makes the user leave the view: on the
Map they open the element in Elements, on a diagram of Elements they go back to the Details tab. This design uses the
resizable right panel the shell already supports (`p.right`, none used until now) to show the data of the selected
element **next to the diagram**: its name and styled stereotypes, kind, layer, id, reference, description, qualifiers,
tags and source file. It is shown where a diagram is on screen (the Map, and the diagram tabs of Elements), never when
nothing is selected, and never in the maximized mode. Click semantics do not change. Scope arrives settled from the wave
plan (row W-7), so there is no PRD.

# Scope

In: `src/main/resources/editor-webapp/standalone.html` (a panel renderer, the two perspectives, the shell's `aside`, the
CSS, one action, the Map's imperative selection clear, the scroll restore of the side panel); the tests of
`src/test/javascript/viewpoint-kernel/**`; the manual (`src/doc/README.adoc`).

Out: selecting a link (W-8, which adds a selection kind to this same panel); the `Parent` / `Children` /
`Relationships` rows (they are navigation and stay on the Details page); editing from the panel; a floating hover card
(native tooltips stay); the badges in the Details header of an element (DEF-1); any change to the Rust kernel.

# PRD Traceability

No PRD: traceability is **incomplete by design**. The requirements are the "Scope" and "Verified by" cells of row W-7 of
the wave plan and the instructions of the dispatch brief:

- R1. A right panel shown when an element is selected in the Map, and in the diagram tabs of Elements where this design
  finds it useful (the open question of the plan, answered by DEC-2).
- R2. It reuses `renderElementPropertiesHtml` and the badges of run 0017; it shows kind, reference, layer, tags,
  description, source file.
- R3. Click semantics unchanged; nothing is rendered with nothing selected, and the Map keeps its width then.
- R4. The cases: a selection not on the drawn map, a selection of the other layer, a deleted element, the maximized mode.
- R5. Resize handle and saved width (the shell's existing contract).
- R6. The centre header states of run 0016 still make sense with a narrower centre.

All six are addressed (R1 DEC-1/2, R2 DEC-3, R3 DEC-1/5, R4 DEC-4, R5 DEC-6, R6 DEC-7).

# Technical Goals

- TG-1. One function decides whether the panel exists (`inspectionRecordFor`): same answer for the shell, the tests and
  the imperative clear of the Map.
- TG-2. The panel is cheap: it is plain markup built from the record, no kernel call, no asynchronous work.
- TG-3. Nothing the user typed or the diagram state is lost when the panel appears or goes: the diagram's framing and
  the stateful controls are exactly as before.

# Non-Goals

- Making the panel a form. It reads; editing stays on the Details page, one click away from the Details tab.
- Replacing the Details page (which also holds the hierarchy and the relationships).

# Assumptions

- ASM-1. `renderShellHtml` renders `p.right` as `<aside id="panel-right">` with a resize handle and the saved width
  (`savedPanelSizeStyle`), and `handleAppPointerDown` / `handleAppDblClick` handle any `[data-resize]`. Validated by
  reading the shell and its handlers; the classes it uses (`min-w-56`, `w-72`, `max-w-[40vw]`, the grid templates) exist
  in the stylesheet.
- ASM-2. `.center-panel` is a container named `center` (run 0016, CTR-1); its states answer to its own width, so a panel
  that narrows it is followed by the header without a change. Validated: `@container center (...)` rules.
- ASM-3. A `goto-element` on the Map does not call `setPerspective`, and in an Elements diagram tab it moves the
  selection to the clicked element (so the panel follows the diagram). Validated in the handler.

# Constraints

- CON-1. A container query adds no specificity (run 0016): anything in the panel that must override a base rule follows
  it in the stylesheet.
- CON-2. Colours come from the CSS variables of the theme (`data-theme`, run 0014); the dark variables are written twice
  and a test pins that: the panel adds **no** variable, only uses the existing ones.
- CON-3. The base64 kernel block of `standalone.html` is not touched (no Rust change).

# Current State

- `renderShellHtml` already lays out `p.left | center | p.right` and `p.bottom`; every perspective returns `right: null`.
- The Map has a header subject (`.element-header-subject`) that shows the name of the selected element, and a button
  *Open in Elements*; the selection is cleared imperatively (`showDiagramScene`) when a scope change removes the
  selected element from the drawing.
- The Details page shows the same rows through `renderElementPropertiesHtml` plus the hierarchy and the relationships.
- `render()` restores the scroll of `panel-left`, `panel-right`, `panel-bottom` and of the centre when the view is the
  same.

# Proposed Design

```
shell:   [ left ][ centre (container "center") ]| [ panel-right ]
                                             handle   aside.right-panel > .inspection
```

`inspectionRecordFor(selection)` returns the record to show or `null`:

- `selection.kind === 'element'`, `mode !== 'edit'`, and a record found by `findElementRecord(key, layer)` (the
  layer-aware lookup of run 0011: the same reference in both layers gives the layer the selection carries);
- `null` otherwise (nothing selected, a file, a create form, a deleted element).

`renderInspectionHtml(record, { onMap })` is the content; `renderMapPerspectiveHtml` sets
`right: diagramMaximized ? null : renderInspectionHtml(...)` and `renderElementsPerspectiveHtml` does the same only while
`diagramTabShown()`.

## Decisions

- **DEC-1 — The panel is a region of the shell, not an overlay.** It is the `right` region of a perspective, so it
  inherits the resize handle, the saved width (`archicode-standalone-editor:panel-size:panel-right:width`), the minimum
  (14rem) and the maximum (40vw), and double-click on the handle resets it. When it is absent nothing is rendered: no
  `aside`, no handle, no reserved space, so the Map keeps its whole width with nothing selected (R3). The `aside` gets
  `aria-label="Inspection"`.
- **DEC-2 — Which diagram tabs of Elements show it: all three (Overview, Detailed, Deep); not Details, not the edit
  form.** Answer to the open question of the plan. In a diagram tab a click on a box *navigates* (the selection moves to
  that element and the centre redraws around it), so the centre header gives only the name and the kind of the focal
  element; its description, tags, qualifiers and source file are one tab away, and going there loses the diagram. The
  panel keeps them next to it, and follows the user as they walk from box to box, which is the use case of the panel.
  The redundancy that matters is the opposite one: on the Details tab the panel would repeat the page word for word, and
  on the edit form it would show stale data beside the fields being changed. So it is absent there.
  Cost: 18rem less for the diagram; the user can resize, close it on the Map (DEC-5) or Maximize. The diagram scales to
  its canvas (`ResizeObserver`), so it stays drawn whole.
- **DEC-3 — Content.** A heading "Selected element", the name (or id) with the **text badges of its styled stereotypes**
  (`stereotypeBadgesHtml(styledStereotypesOf(stereotypesOfRecord(record)))`, run 0017), then the rows: Kind, Layer, then
  `renderElementPropertiesHtml(record)` unchanged (Id, Reference, Name, Description, Qualifiers, Tags), then Source
  file. Kind and Layer are rows of the same `field-row` markup, so the panel reads like the Details page. In a 18rem
  panel the label column (140 px) leaves nothing to the value, so inside `.inspection` the rows stack (label above
  value): a rule of the panel's own, no change to the Details page. Parent / Children / Relationships are not in the
  panel (Out of scope): they are links, W-8 adds the links of a diagram to this panel.
  The Details header still has no badges (the DEF-4 of run 0017): the panel has them, because it is new and has the
  room; the header is shared by every tab and is already tight (run 0016), so it stays as it is (DEF-1).
- **DEC-4 — Special selections.**
  - *Not on the drawn map* (a pin, a hidden element or a folded parent left it out): the panel still shows the data,
    which is the element's and not the drawing's, and adds a note, "Not on the map right now." The note is a hidden
    paragraph in the markup that `markInspection()` un-hides after each drawing (it runs next to `markMapScope`, with
    `mapElementIsOnMap`). When can an off-map element be selected on the Map? The tree of the Map selects nothing, and
    pin, hide, fold, facet and "Hide unlinked" set `mapSelectionCheck`, after which `showDiagramScene` *deselects* an
    element the new drawing leaves out (and takes the panel with it, below). So the note is for a selection that arrives
    from elsewhere: an element picked in Elements and then the Map opened on it, a URL, or an element that a pin of the
    user's saved view leaves out. A technology
    element selected on the Map (the Map draws applications only) gets a static note: "The map draws applications only."
  - *The other layer*: `findElementRecord(key, layer)` with the layer the selection carries; the Layer row names it, so
    `epr` the solution and `epr` the environment are told apart. The header of the Map calls `findElementRecord(key)`
    without a layer: `layerOfReference` then takes the layer of the selection when it is that very reference, so the
    header and the panel agree (a test pins it).
  - *Deleted element*: `forgetUiReferences` already resets the selection; if a record still cannot be found the panel is
    not rendered (never a panel with an error).
  - *Maximized mode*: `diagramMaximized` makes `right` null on both perspectives (the side panels are hidden, as the
    tree already is).
  - *The Map clears its selection by itself* (`showDiagramScene` when a scope change removes the selected element):
    that code already removes the header subject by hand; it also removes `#panel-right` and its handle by hand
    (`removeInspectionPanel`), so the Map does not keep a panel for a selection it no longer has.
- **DEC-5 — Close, on the Map only.** On the Map nothing deselects an element, so the panel would take 18rem for good
  once an element was clicked. A **Close** button in the panel (`data-action="close-inspection"`) sets the selection to
  none and redraws. It is rendered on the Map only: in an Elements diagram tab the selection is the element being looked
  at, and "closing" would blank the centre. It adds a way out; it changes no existing click (R3).
- **DEC-6 — Scroll.** `render()` restores the scroll of the side panels whatever the view; for `panel-right` that
  would carry the scroll of the previous element over to the next. It is restored only while the view is the same
  (`sameView`), like the centre. The key of the view gains the layer of the selection, since `epr` the solution and
  `epr` the environment are two elements (the centre opens at the top for the other one too).
- **DEC-7 — The header of the centre.** No change. The breakpoints of run 0016 are container queries on the width of
  `.center-panel`, so a panel that takes 18rem moves the header to the compact / minimal / tight state at a wider window
  than before, by construction. The panel can be resized or closed to get the full header back; Maximize hides it.

# Repository Impact

- IMP-1 — `standalone.html`: CSS `.inspection*` (rows stacked, name, badges, note, close). JS: `inspectionRecordFor`,
  `renderInspectionHtml`, `markInspection`, `removeInspectionPanel`; the two perspective functions; `renderShellHtml`
  (the `aria-label`); the action `close-inspection`; the scroll restore and the view key in `render()`; the comments
  of the two perspective functions that said the right region is unused. Additive; modifies the `right: null` of two
  perspectives.
- IMP-2 — `src/test/javascript/viewpoint-kernel/inspection.test.js` (new); `diagram.test.js` (two assertions invert: the
  Deep tab and the Map with a selection; the Details one and the empty Map stay `null`).
- IMP-3 — `src/doc/README.adoc`: a short section on the panel. Additive.

# Canonical Impact

- CI-arc-1 — None. The repository declares no `arc` register (no `docs/CLAUDE.md`, no `docs/arc`); the change is the
  presentation of existing data in one file of the editor.
- CI-dom-1 — None. No `dom` register is declared and no domain invariant becomes enforceable: nothing about the model,
  the manifests or the kernel changes.

# Data Model and Contracts

- CTR-1 — Panel markup: `aside#panel-right.right-panel[aria-label="Inspection"] > .inspection[data-inspection-ref]
  [data-inspection-layer]` with `.inspection-head` (h3, close), `.inspection-name`, `.field-row`s, `.inspection-note`.
  W-8 extends it; the root class and attributes are the stable part.
- CTR-2 — Perspective regions: `right` is `null` or a string. `bottom` stays `null`.
- CTR-3 — Action `close-inspection`: selection becomes `{ kind: 'none', key: null, mode: 'view' }`, then `render()`.

# Interfaces and Behavior

- IF-1. Map with an element selected: the panel with its data, a Close button; Open in Elements still in the header.
- IF-2. Map with nothing selected: no `aside`, no handle.
- IF-3. Elements, Overview / Detailed / Deep: the panel with the element's data, no Close button; clicking a box moves
  the selection and the panel follows.
- IF-4. Elements on Details, on the edit form, on the create form; Files, Library, Settings: no panel.
- IF-5. Maximized: no panel.

# Flows and Processing Logic

- FLOW-1 — Select on the Map. Click on a box → `goto-element` (unchanged) → `render()` → `renderMapPerspectiveHtml` →
  panel → `mountDiagramIfNeeded` (cache) → `showDiagramScene` → `markInspection` (the off-map note, for a selection
  that did not come from a click on a box, DEC-4).
- FLOW-2 — Close. `close-inspection` → selection none → `render()` → no panel; the canvas widens and its
  `ResizeObserver` reapplies the scale.

# Reliability, Performance, and Scalability

Markup from one record; no new asynchronous work. The canvas narrows when the panel appears: `takeOverDiagramFraming`
(already called by `goto-element` on the Map) pins the scale and the centre of the view, so what was on screen stays
centred, except that a box in the outer 9rem of a wide canvas can end up behind the panel's edge (RISK-1).

# Security and Privacy

Every value of the record goes through `escapeHtml` (the reused function already does, the new rows do). The panel adds
no input.

# Observability and Verification

- Node tests (`inspection.test.js`): the panel for an element on the Map (kind, reference, layer, tags, description,
  source file, styled stereotype badges); absent with nothing selected (`right === null`, and no `panel-right` in the
  shell); absent on Details, edit, create; present on the three diagram tabs, without Close; Close only on the Map; the
  other layer (same reference in both); a deleted element; maximized; the shell renders the `aside`, the handle with
  `data-resize="panel-right"`, and the saved width as an inline style; the stacked rows and the stylesheet rules;
  no new CSS variable (the dark blocks still hold the same properties); `close-inspection` clears the selection;
  `markInspection` toggles the off-map note; `removeInspectionPanel`; the scroll rule.
- `./mvnw test`, `embed.sh --check`.
- Looked at in the built-in browser on a **replica** (harness markup, real stylesheet) next to the centre, light and dark.
- Cannot be confirmed: the real page (File System Access picker); ELK layout beside the panel; dragging the handle.

# Deployment and Rollout

Code and documentation only. Rollback: revert the commit. The saved width key is the one the shell already defined.

# Risks and Tradeoffs

- RISK-1. On the Map, the box just clicked may sit in the outer part of the canvas that the panel then covers: the user
  pans (or Center). Accepted rather than scrolling the view on every selection (it would break "selecting must not
  jump the view").
- RISK-2. A narrow window: 40vw maximum plus the left tree leaves little for the centre. The header states answer to
  the centre; the panel can be closed (Map) or maximized away.
- RISK-3. The panel and the Details page show the same rows, from the same function: they cannot drift, which is why
  `renderElementPropertiesHtml` is reused rather than copied.

# Open Questions

None open. Answered here: which diagram tabs show the panel (DEC-2), the open question of the wave plan for W-7.

# Deferred Work

- DEF-1. Badges in the Details header of an element (DEF-4 of run 0017), once the header has the room.
- DEF-2. Parent / Children / Relationships in the panel, if users ask to read them without leaving the diagram.
- DEF-3. A human look at the real page in Chromium, light and dark, with the user's workspace, and the panel next to a
  wide Map.

# File Placement and Frontmatter

`docs/wav/wav-004-editor-workspace-experience/run/run-0018-inspection-panel-elements/tdd-0018-inspection-panel-elements.md`.
