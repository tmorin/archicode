---
title: The address carries what changes the diagram
type: tdd
status: draft
run: 0203
wave: 027
owner: tmorin
date: 2026-10-29
related:
  - 'gh:tmorin/archicode#178'
  - docs/wav/wav-027-editor-layout-and-walk/wav-027-editor-layout-and-walk.md
  - docs/wav/wav-027-editor-layout-and-walk/rfc/rfc-001-diagram-layout-address-and-walk.md
  - docs/wav/wav-027-editor-layout-and-walk/run/run-0202-diagram-layout-columns/tdd-0202-diagram-layout-columns.md
---

# The address carries what changes the diagram

# Summary

A link copied from the address bar must draw, for a reader who opens the same workspace, the diagram the sender saw: the same boxes, the same links, in the same places. RFC-001 DEC-2 fixes the rule: an option is in the address when it changes which boxes and links are drawn, or where; never when it changes only the surroundings. This run applies the rule to every surface that draws a diagram and is written from the address: the page of an element (overview, detailed, deep), the Map of the application layer, the Map of the technology layer and the page of a saved view. It adds to the address the toolbar's `layout` (W-2's `diagramColumns`), *Changes only*, the comparison on every diagram surface of a layered workspace, the fold state (`open=`) and the hidden elements (`hide=`) of a Map; it corrects the comment of `address-routing.js` and the editor paragraph of the manual that say the opposite; and it adds a guard that fails when a new input of the drawing is neither in the address nor on the list of the exceptions. No PRD exists; the requirements are those of RFC-001, the W-3 row and the P2 gate of the wave.

# Scope

In scope:

- The writer of the address, `currentRouteHash` and `pushShowParams` (`composition/address-routing.js`), and its reader, `applyDiagramParamsFromHash`, for the options of PRD-less requirements REQ-1 to REQ-5 below.
- A reset of the fold state and of the hidden list when the address has none (as `pin` already is), so that Back and Forward restore it.
- The comment before `layerCompareChoice` use in `currentRouteHash`, the comment of `AppState.changesOnly` (`model/app-state.js`), the comment of `rememberFlag` use for `changes-only` (`model/settings.js`), the editor paragraph of `CLAUDE.md`, and the manual's sentences on the address (`[[editor-changes-address]]`, `[[editor-band]]`, `[[editor-map]]`, `[[editor-changes-only]]` or whichever anchors hold the lines found by `grep -n "not in the address\|the other choices of the comparison\|comparison chosen on the band changes no address" src/doc/README.adoc`).
- Node tests (a round trip per option and surface, an audit of the inputs of the cache key), one end-to-end spec in Chromium and Firefox, the measure of the address on the layered Brightcart.
- `names.json` and the regenerated `src/main/resources/editor-webapp/standalone.html`.

Out of scope: the wording toggle, the open or folded key, zoom and pan, the selection of a box (RFC-001 DEC-2, the three exceptions); the story player's toggles (the player reads no state of the editor, run 0153); the layout of the saved view and of the workspace (they are files, not session state, so a link cannot and need not carry them); any Java, Rust, kernel, schema or command-line change; the toolbar redesign (W-4).

# PRD Traceability

There is no PRD, so traceability is incomplete: the requirements below are labelled here from RFC-001, the W-3 row of the wave plan and the P2 gate, and each is an assumption sourced from them.

- `REQ-1` (RFC-001 DEC-2): the address carries `layout`, *Changes only* and the fold and unfold state, besides what it already carries (`labels`, `qualifiers`, `descriptions`, `wrap` when not the default, `applications=0`, `relationships=0`, `pin`, `rel`, `hl`, `hide-unlinked`, `frame=fit`, `facet`).
- `REQ-2` (RFC-001 DEC-2, rule 2): the rule holds on every surface that draws a diagram: the page of an element, both Maps and the page of a saved view.
- `REQ-3` (RFC-001 DEC-2): the wording toggle, the open or folded key and zoom and pan are not in the address.
- `REQ-4` (P2 gate, last criterion): for each option that changes what is drawn, on each of the four surfaces, a node test shows that the address written, read back by `applyDiagramParamsFromHash`, gives the same drawn boxes and links; an end-to-end spec in Chromium and Firefox opens the copied address in a new page and finds the same diagram.
- `REQ-5` (wave Risks, "A rule reversed"): *Changes only* enters the address against the comment in `address-routing.js` and the editor paragraph of `CLAUDE.md`; both change in the same commit.
- `REQ-6` (wave Open questions, W-3): how the fold state is written (a list as `pin` is, or a count) and how long an address may get on a large Map; the run measures it on the layered Brightcart and states the encoding.
- `REQ-7` (wave Non-Goals, P2 gate): no coverage floor is lowered, `ratchet.max` of `layers.json` stays at 99 or lower, `scripts/byte-identity.sh` shows no unexpected difference, `workspace.schema.json` and the kernel contract do not move.
- `REQ-8` (wave Completion Criteria): `CLAUDE.md` and the manual describe the address rule and its three exceptions.

Addressed: REQ-1 to REQ-8. Partially addressed: none. Unresolved: none that blocks (see Open Questions). Assumed rather than sourced: `DEC-5` (`hide=`), which is not in the RFC's list but follows from its rule.

# Technical Goals

- TG-1: one rule, "in the address iff it changes the boxes and links drawn, or where", applied to the four surfaces, and a guard that keeps it true (REQ-1, REQ-2).
- TG-2: a reader of a copied link sees the sender's diagram, including a reader whose browser remembers another comparison or another *Changes only* (REQ-4).
- TG-3: no address that the page wrote before this run reads differently: every new parameter is optional, and an absent one means what it meant (REQ-7).
- TG-4: the address stays short enough to paste in a message on the layered Brightcart (REQ-6).
- TG-5: no new upward pair between the layers, no part over 3,000 lines (REQ-7).

# Non-Goals

- No `frame=fit` on the page of a saved view, no zoom or pan (framing is how the diagram is looked at; `frame=fit` stays where it is).
- No compression, no short codes, no hashing of the fold state (DEF-1).
- No change to what a saved view stores: the view's own `layout`, `opened`, `hidden` and `pinned` are its file; the address of its page names the view.
- No reading of the address by the command line.

# Assumptions

- ASM-1: only the Maps have a fold state of their own. `diagramFoldTargets` is computed for `isMap && !readonly` (`presentation/diagram-page.js`), the action `toggle-fold` acts when `mapIsShown()` (`composition/events.js`), and the page of an element and the page of a saved view draw boxes the kernel decides to fold. Validation: node test that no `toggle-fold` button is in the scene of an element diagram or of the page of a view.
- ASM-2: the page of a saved view draws from the view's own recipe (`libraryDiagramRecipe`, with `columnsOfRecipe(view, viewpoint, null)`) plus the page-wide state: the plateau, the comparison, *Changes only* and the facets of the workspace. So `view=<id>` already names everything but those three. Validation: the round-trip test on the page of a view varies each of them.
- ASM-3: `layerCompareChoice()` is a complete name of the comparison (`past`, `future`, `future:<id>`, `other:<id>`, empty) and `drawPlateau(id, { compare, fromAddress: true })` accepts the empty string as "no comparison" (it is how `drawLayersNamedByAddress` passes a `compare` that is `''`). Validation: the round-trip test for the comparison, four values and empty.
- ASM-4: a fresh page (new browser context) has no remembered comparison and no remembered *Changes only*, so the end-to-end spec can only show the exact reproduction if the node tests also run the reader with a remembered choice that differs. Validation: VER-3 sets `chosenFlags` and the remembered comparison in the reading page.
- ASM-5: the Brightcart measure of `open=` (REQ-6) is a bound: the unfold-all confirm of a Map is at `MAP_UNFOLD_CONFIRM_BOXES` (150) boxes. Measured now: the layered Brightcart at `marketplace` has 10 parents in the application layer (97 characters of references joined by commas) and 7 in the technology layer (63). Validation: VER-5 prints the longest address the e2e spec writes.

# Constraints

- CON-1: the page is generated; edit `src/main/editor` and run `npm run editor:build`. `names.json` follows the top-level names (`node scripts/check-editor.mjs --write-names`).
- CON-2: a layer uses the layers before it; the address is read and written in `composition/` and the state it sets is in `model/` and `presentation/` (already the case for `pin`, `rel`, `hl`). `render()` is called in `composition/` only; redraws are requested by `requestRedraw()`.
- CON-3: view state never calls `modelsChanged()`. The fold, the hidden list, *Changes only* and the columns are already in `diagramCacheKey` (`modelsKey` carries `changesOnly`, the key carries `[opened, pinned, hidden]` and `cols:`), so a change read from the address needs no new key part.
- CON-4: the committed `standalone.html` is the assembly of the parts; `npm run editor:check` and `ratchet.max` (99) hold.
- CON-5: the node suite loads the page with no DOM; real layout is only seen by the end-to-end suite (`npm run test:e2e`, Chromium and Firefox for the specs that start a JVM).
- CON-6: addresses written by the 0.19 and earlier pages keep their meaning: `compare=` absent leaves the comparison as the reader has it only for an address that is not written by this run's page (DEC-3); see CTR-1.
- CON-7: no coverage floor in `scripts/editor-coverage-floor.json` is lowered.

# Current State

`composition/address-routing.js` (377 lines) holds the reader and the writer.

- Reader, `applyDiagramParamsFromHash`, for `elements`, `map`, `environments`, `library`: `story`, `step`, `tab` (elements), `pin` (maps; also `expandParentsOf` for each), `rel` and `hl` (application Map), the four show names, `applications` and `relationships` (technology Map), `hide-unlinked`, `frame`, `facet`. The library branch returns after `view=` and `story=`.
- Writer, `currentRouteHash`: `ref`, `layer`, `tab`, `facet`, show names, `hide-unlinked`, parts, `frame` on the page of an element; `facet`, `pin`, `rel`, `hl`, show names, parts, `frame` on a Map; `story`/`view` on the library; `story` and `step` of a walk; the selected link; `removed`, `removed-layer` and `compare` only with a removed element (the comment says "the other choices of the comparison (Changes only, the wording-only toggle) are a choice of whoever looks, remembered per folder, and are not in the address"); `plateau` when not the root; `play` and `step` of the player.
- *Changes only* is `AppState.changesOnly`, remembered per folder through `rememberFlag('changes-only', ...)` and read back by `recalledFlag` in `persistence/workspace-loading.js`. The `set-changes-only` handler (`composition/events.js`) drops `diagramCache` and renders.
- The fold state of a Map is `mapStateOf().opened` (a `Set`, or null for the default, folded); hidden elements are `mapStateOf().hidden`. Neither is in the address. `hidden` is not in RFC-001's list but is in the key `[opened, pinned, hidden]` of `diagramCacheKey`, so it changes the boxes.
- The comparison (`AppState.layers.compare`) is remembered per folder (`rememberComparison`) and read at load by `openLayers` (`compareFromHash()` wins when not null). Documented (`src/doc/README.adoc`, the passages on `compare=`): a link that has no `compare=` leaves the comparison as it is.
- W-2 added `diagramColumns` (`model/ui-state.js`), the toolbar's boxes per row, set by `set-columns`, reset by `resetUiState`/`folder-session.js`, and by `applySavedView` to what the view says. It is in the key as `cols:`. It is not in the address (W-2's TDD, out of scope).
- Exact hash assertions exist in node tests (`plateaus-page-and-addresses.test.js`, `remove-buttons-address-the-file.test.js`, `editor-reads-layers.test.js`, `band-compare-tree.test.js`, others found by `grep -ln "currentRouteHash\|location.hash" src/test/javascript`) and in `src/test/e2e/address.spec.js`.

# Proposed Design

One rule, written once as a table in the test and enforced twice: the writer pushes a parameter for each option below, the reader sets the option from it, and an audit test fails when an input of the drawing is neither on the table nor an exception.

| Option | Parameter | Surfaces that write it | Written when | Absent means |
|---|---|---|---|---|
| columns on the toolbar | `layout=N` | element, both Maps | `diagramColumns !== null` | none (the view, then the workspace decide) |
| Changes only | `changes-only=1` | element, both Maps, page of a view | `AppState.changesOnly` and a comparison is on | off, if the address has `compare=`; else unchanged |
| comparison | `compare=<choice>` | element, both Maps, page of a view | the workspace has plateaus (`plateauTree.layered`); empty when nothing is compared | unchanged (old links) |
| fold state | `open=a,b` | both Maps | `opened` is not empty | folded (the default) |
| hidden elements | `hide=a,b` | both Maps | `hidden` is not empty | none hidden |

`pin`, `rel`, `hl`, `facet`, `hide-unlinked`, the four texts, `applications`, `relationships`, `frame`, `plateau` stay as they are. Unchanged exceptions: wording toggle, key, zoom and pan, the selection of a box.

```plantuml
@startuml
participant Sender
participant "currentRouteHash\n(address-routing.js)" as W
participant Reader
participant "applyDiagramParamsFromHash\n+ drawLayersNamedByAddress" as R
participant "diagram-page.js\n(recipe, diagramCacheKey)" as D
Sender -> W : render() ends -> syncHashFromState
W --> Sender : #/timeline/applications?plateau=p&compare=past&changes-only=1&open=a,b&layout=4
Sender ..> Reader : link
Reader -> R : hashchange / load
R -> R : compare -> drawPlateau(id, {compare, fromAddress})
R -> R : pin, hide, open, rel, hl, layout, changes-only
R -> D : mount: same recipe, same key
D --> Reader : same boxes and links
@enduml
```

The reviewer checks that every arrow of the writer has a reader and that the reader sets state the key already carries (CON-3).

Design decisions:

- DEC-1 — `layout=N`, the toolbar level only
  - Decision: the address carries `layout=<N>` for `diagramColumns` when it is not null, on the page of an element and on both Maps. It never carries the view's or the workspace's value. On the page of a saved view nothing is written: the toolbar there edits the view (`setViewLayout`), which is a file. An invalid value in the address (not a whole number from 1 to `DIAGRAM_COLUMNS_MAX`, 20) is dropped and the address is written back without it.
  - Rationale: the view and the workspace levels are in the files the reader has; the toolbar level is the only session state of the four (RFC-001 rule 1). Dropping an invalid typed value is how `tab=`, `facet=` and `pin=` treat theirs; the sentence of RFC-001 rule 4 is about values an author writes in a file, which the page must tell, not about an address.
  - Alternatives considered: the resolved value (would fix a file's value in a link and go stale when the file changes); an editor sentence for a bad `layout=` (a typed address is not an author's file, and no place on the page shows it besides the diagram's own error, which would then block the diagram); `layout.columns=4` as the name (longer, no gain).
  - Tradeoffs: a link with `layout=` that the reader's view says otherwise draws the toolbar's value, as the toolbar does on the sender's page.
  - Linked PRD IDs: REQ-1, REQ-2, REQ-3.
- DEC-2 — *Changes only* is in the address, and means something only with a comparison
  - Decision: `changes-only=1` is written on the four surfaces when `AppState.changesOnly` is true and a comparison is on (`compareTargetPlateau()`); never `changes-only=0`. Reading: when the address has `compare=`, `AppState.changesOnly` becomes `params.get('changes-only') === '1'` (so an absent parameter means off, whatever this browser remembered); when it has no `compare=`, the flag is left as it is. The reader does not `rememberFlag` from an address (an address is not a choice of the reader's, unlike `openLayers`' comparison), so the reader's own remembered flag survives.
  - Rationale: `only_changes` is the kernel's input, it changes the boxes and links (RFC-001 DEC-2, REQ-5). Absent-means-off is what makes the link exact for a reader who had it on; tying it to `compare=` keeps old links, which never had either, from switching a reader's flag off.
  - Alternatives considered: write `changes-only=0` too (noise in every address); always reset on read (an old link without `compare=` would switch it off); remember it from the address (a link someone sent would change the reader's later sessions).
  - Tradeoffs: the reader's flag is in memory for the page's life only: after a reload of a bare address it is the remembered one again. That is the intended meaning of "a choice of whoever looks" for what the address does not say.
  - Linked PRD IDs: REQ-1, REQ-4, REQ-5.
- DEC-3 — the comparison is always in the address of a layered workspace, on the diagram surfaces
  - Decision: `compare=<layerCompareChoice()>` is written on the page of an element (diagram tab), on both Maps and on the page of a saved view whenever `AppState.plateauTree.layered`, empty when nothing is compared; the removed-element case keeps its own rule (it already writes it) and is not written twice. Reading is unchanged (`compareFromHash`, an empty string means no comparison). A workspace with no plateau never writes it.
  - Rationale: *Changes only* and the states drawn are meaningless without the comparison, and a comparison is part of what is drawn (states, ghosts of removed elements). Writing it only when on leaves a reader whose browser remembers a comparison with a diagram the sender did not see; writing it empty costs `&compare=` (9 characters) in layered workspaces only. The documented contract (a link with none leaves the comparison as it is) stays true for every link older than this run.
  - Alternatives considered: only when on (exactness lost for a reader with a remembered comparison, TG-2); only with `changes-only` (same loss); always in every workspace (noise where it means nothing).
  - Tradeoffs: every address of a layered workspace on those surfaces changes; the exact-hash assertions in the node suite and `address.spec.js` change in the same commit (RISK-2). The passage on the Back button between two comparisons ("A comparison chosen on the band changes no address") is false after this run and is rewritten: the comparison is an entry of the history already (`layerChangeIsAnEntry`), now visibly.
  - Linked PRD IDs: REQ-1, REQ-2, REQ-4.
- DEC-4 — `open=` is a list, like `pin`
  - Decision: `open=<ref>,<ref>` (each `encodeURIComponent`ed, joined by a comma, the references sorted, the list of the Map on screen) when `mapStateOf().opened` is non-empty; absent means the default, folded. Reading sets `state.opened = new Set(refs that exist in the layer)`, or null when absent, before `pin` is read, so that the `expandParentsOf` of each pin still opens its ancestors. Unfold all and the buttons of the boxes rewrite the address in place (no history entry, like `pin`'s neighbours `frame`).
  - Rationale: the same encoding as `pin`, one reader, and the measure says a list is short (ASM-5: 97 and 63 characters before encoding on the layered Brightcart; at most 150 boxes by the unfold-all confirm, about 2,300 characters in the worst case, which a browser accepts and a message carries). A count cannot say which.
  - Alternatives considered: a count or a depth (loses which boxes); an index into the sorted references (breaks when an element is added); omitting the references an ancestor of a pin opens anyway (saves little, couples the writer to the reader's order).
  - Tradeoffs: a long address on a very large Map (DEF-1).
  - Linked PRD IDs: REQ-1, REQ-6.
- DEC-5 — `hide=` for the hidden elements of a Map
  - Decision: `hide=<ref>,<ref>` on both Maps when `mapStateOf().hidden` is non-empty, read like `pin` (filtered to existing references, reset to empty when absent).
  - Rationale: `hidden` changes which boxes are drawn and is in the cache key, so DEC-2's rule puts it in; RFC-001's list did not name it. Without it the copied link of a Map the sender narrowed by hiding shows the elements back. This is an assumption derived from the rule, to be confirmed by the author when the run is reviewed (Q-1).
  - Alternatives considered: leave it out and say so (a known gap in the rule the run is written to close); fold it into `open=` (two meanings in one parameter).
  - Tradeoffs: one more parameter; `map-pin` already removes a hidden element it pins, so the two lists never overlap on a write.
  - Linked PRD IDs: REQ-1, REQ-2.
- DEC-6 — the reader resets what the address does not say
  - Decision: for `map` and `environments`, the reader sets `pinned`, `hidden` and `opened` from the address (empty/null when absent), as it does for `pinned`; `diagramColumns` from `layout` (null when absent or invalid); `diagramHideUnlinked` and the show names already so. The addresses the page writes are therefore a complete description of the Map on screen, and Back and Forward restore it.
  - Rationale: without the reset a hand-edited or followed address keeps the fold of the previous address, and the round trip is not exact.
  - Alternatives considered: leave `opened` alone when absent (the folded default would depend on history).
  - Tradeoffs: a bare `#/timeline/applications` typed in the tab folds a Map the reader had opened; it already clears the pins.
  - Linked PRD IDs: REQ-2, REQ-4.
- DEC-7 — an audit keeps the rule true
  - Decision: a node test (`diagram-address-audit.test.js`) holds the table of the inputs of the drawing: for each identifier read by `diagramCacheKey`, `modelsKey` and the recipe builders (`mainDiagramRecipe`, `libraryDiagramRecipe`, `buildKernelInput`) it names either the address parameter that carries it or the reason it is an exception (RFC-001's three, plus the selection of a box, plus the facts that are files: the view, the workspace's settings, the styles). The identifiers are taken from the source text of those functions in the sandbox; an identifier on neither list fails the test with the sentence "add it to the address (`currentRouteHash`) or give the reason it is not there".
  - Rationale: the rule was broken before not by a decision but by omission (`hidden`, the comparison); the audit makes the next omission fail a test.
  - Alternatives considered: only round-trip tests (they prove the options listed, not the options forgotten).
  - Tradeoffs: the test reads function sources, so a rename of a variable asks for a line in the table; accepted.
  - Linked PRD IDs: REQ-1, REQ-2, REQ-4.

# Repository Impact

- IMP-1 — writer and reader of the address
  - Path(s): `src/main/editor/composition/address-routing.js`
  - Change type: modify
  - Why impacted: `currentRouteHash` writes `layout`, `changes-only`, `compare`, `open`, `hide`; `applyDiagramParamsFromHash` reads them and resets `opened`, `hidden`, `diagramColumns`, `changesOnly`; two small helpers (`pushFoldParams`, `listParam`, names to be settled by the implementation) share the encoding of `pin`; the comment about "a choice of whoever looks" is rewritten, and the library branch reads `compare`/`changes-only` before it returns.
  - Linked PRD IDs: REQ-1, REQ-2, REQ-5.
  - Risks / notes: the file stays near 420 lines; the order of parameters in the written hash is fixed (see CTR-1) because tests and links compare strings.
- IMP-2 — comments that say the opposite
  - Path(s): `src/main/editor/model/app-state.js` (the comment of `changesOnly`), `src/main/editor/model/settings.js` (the comment before `recalledFlag`/`rememberFlag`), `src/main/editor/application/plateau-choice.js` (the doc comment of `drawLayersNamedByAddress` and `openLayers`, which say `compare=` is "written with a removed element")
  - Change type: modify
  - Why impacted: they describe the old rule.
  - Linked PRD IDs: REQ-5.
- IMP-3 — page state (no change expected)
  - Path(s): `src/main/editor/model/ui-state.js`, `src/main/editor/presentation/diagram-state.js`, `src/main/editor/presentation/map-state.js`, `src/main/editor/presentation/diagram-page.js`
  - Change type: none unless the audit finds an input not listed; the run reads them and changes no key.
  - Why impacted: the state the reader sets is theirs; the cache key already carries it (CON-3).
  - Linked PRD IDs: REQ-1.
- IMP-4 — names and layers
  - Path(s): `src/main/editor/names.json`, `src/main/editor/layers.json`
  - Change type: modify (names added); `ratchet.max` unchanged
  - Why impacted: new top-level helper names; no new upward pair (the helpers live in `composition/`).
  - Linked PRD IDs: REQ-7.
- IMP-5 — the page
  - Path(s): `src/main/resources/editor-webapp/standalone.html`
  - Change type: modify (generated by `npm run editor:build`)
  - Why impacted: it is the assembly of the parts.
  - Linked PRD IDs: REQ-7.
- IMP-6 — node tests
  - Path(s): new `src/test/javascript/viewpoint-kernel/diagram-address.test.js` (the round trip per option and per surface: VER-1, VER-2, VER-3), new `src/test/javascript/viewpoint-kernel/diagram-address-audit.test.js` (DEC-7); existing exact-hash assertions updated: `plateaus-page-and-addresses.test.js`, `remove-buttons-address-the-file.test.js`, `editor-reads-layers.test.js`, `band-compare-tree.test.js` and every other test found by `grep -ln "currentRouteHash\|location.hash\|compare=" src/test/javascript`.
  - Change type: additive, modify
  - Why impacted: a layered workspace's address gains `compare=`.
  - Linked PRD IDs: REQ-4.
  - Risks / notes: the new tests use the support of `src/test/javascript/map-links-support.js` (required as `../map-links-support.js` from `viewpoint-kernel/`; the layered Brightcart and the bookshop in memory) and `library-page.js`; a second page is a new sandbox on the same files.
- IMP-7 — end-to-end spec
  - Path(s): new `src/test/e2e/diagram-address.spec.js` (Chromium and Firefox; no WebKit, it starts a JVM); `src/test/e2e/address.spec.js` and `src/test/e2e/diagram-and-compare.spec.js` updated if they assert a layered address exactly.
  - Change type: additive, modify
  - Why impacted: VER-4 and VER-5.
  - Linked PRD IDs: REQ-4, REQ-6.
- IMP-8 — documents
  - Path(s): `CLAUDE.md` (the editor paragraphs that say what the address carries and that Changes only is a choice of whoever looks, and one paragraph for this run in the style of "The highlight in the editor"), `src/doc/README.adoc` (the passages found by `grep -n "changes no address\|The other choices of the comparison\|only next to the selection of a removed element\|leaves the comparison as it is\|It is in the URL" src/doc/README.adoc`: `[[editor-changes-address]]`, `[[editor-band]]`, `[[editor-map]]` and the section on *Changes only*; one short section "What a link carries" with the table above and the three exceptions)
  - Change type: modify
  - Why impacted: REQ-8; the passages state the old rule.
  - Linked PRD IDs: REQ-5, REQ-8.
- IMP-9 — the run record
  - Path(s): `docs/wav/wav-027-editor-layout-and-walk/run/run-0203-diagram-address/run-0203-diagram-address.md`
  - Change type: modify
  - Why impacted: it records the measure (VER-5) and the command outputs of the gate.
  - Linked PRD IDs: REQ-6.

# Canonical Impact

Not applicable — no canonical registers declared in `docs/CLAUDE.md` (the file does not exist in this repository). CI-arc-1: None. CI-dom-1: None.

# Data Model and Contracts

- CTR-1 — the address of the diagram surfaces
  - Current contract: `#/<route>?ref&layer&tab&facet&<show names>&hide-unlinked&applications&relationships&pin&rel&hl&frame&story&step&link-from&link-to&removed&removed-layer&compare&plateau&play&step` as written by `currentRouteHash`; `compare=` only with a removed element; unknown parameters ignored; absent `compare=` leaves the comparison.
  - Proposed contract: the same, plus `layout=N` (1 to 20; element and Maps), `changes-only=1` (with a comparison), `compare=<choice>` on the four surfaces of a layered workspace (empty for none), `open=<refs>` and `hide=<refs>` (Maps). Order of the new parameters in the written hash: after `facet`, `hide=`, `open=` and `pin=` together on a Map (in that order: `facet`, `pin`, `hide`, `open`, then `rel`, `hl`), `layout=` after the show names, then in the place `removed`/`compare` already has: `compare=`, `changes-only=`, then `plateau=`. A reader accepts any order. Absent means: `layout` none, `open` folded, `hide` none; `changes-only` off when `compare=` is present, else unchanged; `compare` unchanged. A value that names nothing (an unknown reference, a `layout` not in 1 to 20, an unknown `compare`) is dropped and the address is written back without it.
  - Affected files: `composition/address-routing.js`, tests and manual above.
  - Migration or compatibility notes: every address written before this run reads as before (an address with `compare=` and no `changes-only` now turns *Changes only* off for that page, which it could not have meant on).
  - Linked PRD IDs: REQ-1, REQ-2.
- CTR-2 — no other contract. No change to `.archicode.yaml`, to a manifest, to `workspace.schema.json`, to the kernel (contract 5), to `archicode guide` or to any command-line output; the key `layout` was named in the guide by run 0202. `GuideViewPropertiesTest` and `golden.md` do not move.

# Interfaces and Behavior

- IF-1 — the user sees nothing new on the page: the address bar changes with the toolbar, the same way it does for `pin`. Copy, paste in a new tab: the same diagram.
- IF-2 — the Columns list, *Changes only*, *Fold all*, *Unfold all*, the fold buttons and *Hide* each rewrite the address in place (`replaceState`); a comparison chosen on the band stays an entry of the history (`layerChangeIsAnEntry`).
- IF-3 — Back and Forward restore the pins, hidden, open boxes, columns and *Changes only* of the entry they return to.
- IF-4 — failure: an address that names a reference the layer lacks drops it silently from `open`/`hide`/`pin` (as `pin` does); an invalid `layout` is dropped; the address is rewritten as it is.
- IF-5 — the surfaces: the page of an element writes `layout`, `compare`, `changes-only`; a Map writes those and `open`, `hide`; the page of a saved view writes `view=`, `compare`, `changes-only`, `plateau`; the Stories page without a view and the other pages write none of them.

# Flows and Processing Logic

- FLOW-1 — write
  - Trigger: `render()` ends and calls `syncHashFromState`.
  - Steps: `currentRouteHash` builds the parameters in the order of CTR-1; the new ones come from `diagramColumns`, `AppState.changesOnly`, `layerCompareChoice()`, `mapStateOf().opened` and `.hidden`; the hash is compared with `location.hash` and `replaceState`d (or `pushState`d when `layerChangeIsAnEntry`).
  - Branches / failure paths: workspace without plateaus: no `compare`, no `changes-only`; library without a selected view: none; a Map with an empty `opened`: no `open`.
  - Final output / rendered result: a hash that describes the diagram.
  - Linked PRD IDs: REQ-1, REQ-2.
- FLOW-2 — read
  - Trigger: bootstrap (`syncPerspectiveFromHash`) or `hashchange`.
  - Steps: `drawLayersNamedByAddress` first (plateau and comparison, before the selection: an element may exist in one plateau only); then `applyDiagramParamsFromHash`: `changes-only` (when `compare=` is there), then for a Map `pin`, `hide`, `open` (reset when absent), `rel`, `hl`, then `layout`, shows, parts, `hide-unlinked`, `frame`, `facet`; the library branch reads `compare`'s companion `changes-only` before it returns.
  - Branches / failure paths: unknown values dropped; an address typed with no `compare=` leaves the comparison and the flag.
  - Final output / rendered result: the page state the writer would write from; the next `render()` writes the same hash (a fixed point, asserted by VER-1).
  - Linked PRD IDs: REQ-2, REQ-4.

# Reliability, Performance, and Scalability

- The address is rewritten at every render today; this adds a sort and a join of at most 150 references on a Map. No measurable cost.
- The fixed-point property (write then read then write gives the same string) is the reliability property; VER-1 asserts it for every option and surface, which also catches an option the reader sets but the writer does not.
- Length: ASM-5; no limit is enforced (DEF-1).

# Security and Privacy

The address is data, not instructions: every value is looked up in the model (`pin` pattern) or checked as a number before it is used; none is evaluated or inserted as HTML (references reach the page only through the existing escaping). A link carries references of the workspace, which the sender chose to share; nothing new beyond what `pin` and `ref` already carry.

# Observability and Verification

Commands: `npm run editor:build`, `npm run test:unit`, `npm run test:coverage`, `npm run lint`, `npm run format:check`, `npm run editor:check`, `npm run test:e2e` (after `./mvnw verify` or `package`; `JAVA_HOME` names JDK 25), `./mvnw verify -DskipITs=false`, `scripts/byte-identity.sh`.

- VER-1 — round trip, node (`diagram-address.test.js`). For each option (`layout`, `changes-only`, `compare` in its four forms and empty, `open`, `hide`, `pin`, `rel`, `hl`, `facet`, `hide-unlinked`, `applications=0`, `relationships=0`, `labels`, `qualifiers`, `descriptions`, `wrap`) and each surface where it exists (element overview, detailed and deep; the application Map; the technology Map; the page of a saved view): set the state in page A, take `currentRouteHash()`, open page B on the same files at that hash, and assert that B's drawn boxes and links (`boxIdsOf`, `linkPairsOf`, and the compare states) equal A's and that B's `currentRouteHash()` equals A's. The option is then varied, and a case with the option at its default asserts the parameter is absent.
- VER-2 — exceptions, node. The wording toggle, the key, zoom and pan, and the selection of a box change the hash by nothing (`currentRouteHash()` before and after).
- VER-3 — reader with another memory, node. Page B has a remembered *Changes only* and a remembered comparison different from A's; after the address is applied B draws A's diagram, and B's remembered values are unchanged (DEC-2, ASM-4). An old address without `compare=` leaves both as they were.
- VER-4 — end-to-end (`diagram-address.spec.js`, Chromium and Firefox, on the layered Brightcart at `plateau=marketplace`): set a comparison, *Changes only*, unfold two boxes, hide one, `layout` 4 on the Map; copy `page.url()`; open it in a new context; assert the same boxes and links (ids and the count of `g.dg-link`); repeat on the page of an element and on the page of a saved view (the view of run 0202's spec, `The whole map, opened`); Back and Forward return the folds.
- VER-5 — length. The spec prints `ADDRESS_LENGTH <surface> <n>` for the longest address it writes (all the Brightcart parents of the application layer opened plus the pins); the run records the numbers in its record and states the encoding (DEC-4). Pass: the unfolded Map of the Brightcart under 600 characters.
- VER-6 — audit, node (`diagram-address-audit.test.js`, DEC-7). Fails on an unclassified input; shown to fail by adding a throw-away input to the cache key and running the test (recorded in the run, then removed).
- VER-7 — no regression. `layout` and the others absent: a Map of every shipped example and fixture has the boxes of `src/test/resources/technology-map/expected-boxes.json` and `src/test/resources/map-links/expected-boxes.json` (the existing tests, unchanged); `scripts/byte-identity.sh` shows no unexpected difference; `workspace.schema.json` and `golden.md` unchanged; the e2e specs of the address (`address.spec.js`) pass with updated exact hashes only where DEC-3 requires.
- VER-8 — gates of P2 for this run: `npm run editor:check` with `ratchet.max` not above 99, no floor of `editor-coverage-floor.json` lowered.

# Deployment and Rollout

Code-only (a static page). No staging beyond the e2e suite. Backward compatible: older links open as before (CTR-1). Rollback: revert the commit; a link written by the new page then ignores the parameters the old page does not know (it ignores unknown parameters), so a shared link degrades to the old reading rather than failing. The tag run, the native runner, the real Safari and the real GitHub Pages are not proved by this run.

# Risks and Tradeoffs

- RISK-1: a reader or the writer forgets an input; mitigation: DEC-7's audit and VER-1's fixed-point assertion.
- RISK-2: DEC-3 changes the exact hash of every layered address, which many tests pin; mitigation: the list of tests is found by `grep` (IMP-6) and updated in the same commit; the review reads the diff of those assertions as the intended change only.
- RISK-3: `changes-only` absent turning the flag off for a reader whose address has `compare=` (DEC-2) surprises someone who navigates by typing `compare=past` by hand; accepted, and written in the manual.
- RISK-4: resetting `opened` and `hidden` when absent (DEC-6) loses a fold on a click on a tab that writes a bare address; mitigation: the tab handler writes `currentRouteHash()` of the page, which now includes them for a Map; VER-1 includes the perspective switches Applications to Environments and back.
- RISK-5: the e2e spec depends on ELK for `layout=4` boxes; it asserts the same ids and links, not positions.
- RISK-6: a long address on a very large Map (DEF-1).
- RISK-7: DEC-5 goes beyond RFC-001's list; Q-1 resolved as in on the rule's authority; the author may overturn it at review.

# Open Questions

- None open. Q-1 (resolved, Stage 6): `hide=` stays in (DEC-5). Resolution: the rule the wave adopted (RFC-001 DEC-2, "in the address iff it changes the boxes and links drawn, or where") puts `hidden` in, since `hidden` changes which boxes are drawn and is already in `diagramCacheKey`; leaving it out would make a copied Map link show elements the sender hid, the very gap this run closes, and a fourth exception would contradict REQ-8's "three exceptions". The cost is one optional parameter, read like `pin`, which cannot change an address written before the run (TG-3). Hard judgment resolved by the leaf agent from the rule and the code facts above; the author may overturn it at review (then RISK-7's fallback applies). Not a blocker.

# Deferred Work

- DEF-1: a shorter encoding of the fold state, if an address on a very large Map proves too long to paste (only if a real workspace shows it).
- DEF-2: `frame=fit` and the framing on the page of a saved view.
- DEF-3: the wording toggle in the address, if the author decides it changes what a reader must see (RFC-001 decided no).
- DEF-4: the story player's toggles in `play=` (the player reads no editor state by design, run 0153).

# File Placement and Frontmatter

Saved at `docs/wav/wav-027-editor-layout-and-walk/run/run-0203-diagram-address/tdd-0203-diagram-address.md`, frontmatter `type: tdd`, `run: 0203`, `wave: 027`, as run 0202's TDD.
