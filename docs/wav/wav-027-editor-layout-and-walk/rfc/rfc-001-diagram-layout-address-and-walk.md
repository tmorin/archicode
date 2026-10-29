---
type: rfc
rfc: 001
status: accepted
date: 2026-10-29
accepted: 2026-10-29 by the author, as recommended (D1a, D2a, D3a, D4a, D5a)
issue: 'gh:tmorin/archicode#178'
related:
  - docs/wav/wav-027-editor-layout-and-walk/wav-027-editor-layout-and-walk.md
  - docs/wav/wav-027-editor-layout-and-walk/rfc/spike/elk-layer-bound-1.mjs
  - docs/wav/wav-027-editor-layout-and-walk/rfc/spike/elk-layer-bound-2.mjs
---

# RFC-001 — Diagram layout, address and walk bar

Five decisions for wave 027 (issues #179, #178, #155). The brief the author answered is the artifact of 2026-10-29 (`https://claude.ai/artifact/M59cSAyTSbobJW6Wknz6dd`, private). Every decision applies to **every diagram of the editor**, not to the comparison alone: the page of an element (overview, detailed, deep), the Maps of the application and technology layers, the page of a saved view, the step of a story in the editor, and the step in the story player.

## DEC-1 — The layout option is `layout.columns`, and it aims at N boxes per row

A whole number of at least 1. Empty means today's layout, so every diagram keeps drawing as it does. It is set on the root and on **every compound node** of the ELK graph (`COFFMAN_GRAHAM`, `layerBound: N`); on the root alone the containers ignore it. The manual and the guide say that it aims at N and that ELK may exceed it when links join boxes.

Rejected: a hard `max-per-row` (re-cutting the rows after ELK moves boxes and deforms links; large cost, no request for it); no option; a `direction` or spacing preset (see evidence: `RIGHT` makes unlinked boxes a single tall column; no case asks for spacing).

## DEC-2 — The address carries what changes the boxes and links drawn

Rule: an option is in the address when it changes which boxes and links are drawn, or where; never when it changes only the surroundings. In: `layout`, *Changes only*, the fold and unfold state, and what is already there (`labels`, `qualifiers`, `descriptions`, `wrap` when not the default, `applications=0`, `relationships=0`, `pin`, `rel`, `hl`, `hide-unlinked`, `frame=fit`, `facet`). Out: the wording toggle, the open or folded key (#130, #137), zoom and pan. *Changes only* was a choice "of whoever looks, remembered per folder" (`address-routing.js`, comment before `layerCompareChoice`); it now enters the address and this RFC reverses that comment for it alone. The rule holds on every surface that draws a diagram.

## DEC-3 — The toolbar review is a document in wave 027; its code is wave 028

Run W-4 delivers the inventory (every control against every surface and viewpoint), the proposal and a mock-up at desktop width and at 360 px. It writes no editor code. The gate is the author's agreement, recorded in the wave's progress log; the changes it asks for are the next wave's. The proposal covers the items of #178 (grouping by what a control acts on, which controls are saved with a view, a *Reset to the view* action, one `aria-pressed` convention, keyboard order, narrow screens, the page of a saved view and the page of an element offering the same controls where they apply).

## DEC-4 — The lateral rail (#179, option C) is decided in W-4's document

Not built in this wave. Three tabs do not justify it; the document revisits it with the inventory, since a rail pays from four domains.

## DEC-5 — #155 L3 and L4 are accepted limits

L2 was fixed by run 0162. L3 (a comment on an item that is a list, lost or taken by the item above when lists are nested again) and L4 (a list that holds a list in brackets, wrapped in another list, is written in brackets) need a list of lists, which only a patch `value` can hold. The model read back is right; only the text of the author changes. The manual already says so (`[[plateau-limits]]`), and two `known limit` tests pin them. The issue is closed with a comment and a corrected title; nothing is built.

## Rules that follow

1. **One resolver.** The layout in force is resolved by one pure function, most specific first: the toolbar of the diagram on screen, then `view.properties.layout`, then `settings.views.properties.<viewpoint>.layout`, then the built-in default (none). The editor and `storyStepScene` both call it. The player never reads the toolbar: it passes `null` for the first level. A value equal to the default is not remembered.
2. **View state, not model state.** The option is part of `diagramCacheKey` and never calls `modelsChanged()`.
3. **The command line ignores the key**, as it ignores `labels`, `qualifiers`, `descriptions` and `wrap`. `scripts/byte-identity.sh` shows no unexpected difference, `workspace.schema.json` (golden) does not move, and the guide names the key in its table of properties the command line ignores (`GuideViewPropertiesTest` holds it).
4. **An invalid value says so.** A value that is not a whole number of at least 1 is an editor sentence, never a silent fallback. The run fixes the upper bound.
5. **The sticky walk bar** (#179, option A): the *Previous change* / *Next change* row, "n of N" and *Show all* stick under the tabs in one sticky block with `.right-tabs`; `scroll-padding-top` on the panel equals the height of the block; the selected row is brought into view with `block: 'nearest'`. If the sticky block is more than 35 % of the panel height at 360 × 640, the run builds option B (the rows scroll in their own box) instead and records the measure.

## Evidence

`elkjs@0.9.3` (the version the editor loads), boxes 120 × 60, run by the two scripts in `rfc/spike/`. Synthetic graphs: the run repeats it on a real diagram of the layered Brightcart (W-2).

| Case | Boxes per row | Size (px) |
|---|---|---|
| 3 containers × 12 boxes, today | 12 · 12 · 12 | 5132 × 108 |
| bound 4 on each container, no link | 4+4+4 in each | 1772 × 268 |
| bound 4 on the root only (2 links) | 12 · 12 · 12 | 2132 × 510 |
| bound 4 on all, 3 links between containers | 3+4+5 · 3+4+5 · 5+3+4 | 1148 × 888 |
| 20 unlinked boxes, today | 20 | 2956 × 84 |
| 20 unlinked boxes, bound 4 | 5 rows of 4 | 588 × 548 |
| 20 unlinked boxes, direction `RIGHT` | one column of 20 | 144 × 1756 |

The sticky block at 360 × 640 (panel 320 px, `max-height: 50vh`) is estimated at 85 to 115 px from the CSS; it is not measured. W-1 measures it.

## Consequences

- The ELK graph is built in one place (`buildElkGraph`, `diagram-layout.js`): node tests assert the options it sets on the root and on each container, without running ELK; the real layout is checked by an end-to-end spec in Chromium and Firefox.
- A link copied from the address bar draws the same diagram for every option above, on every surface.
- The toolbar gains one control for the layout in W-2 (a list of values, empty first); W-4 may move it.
