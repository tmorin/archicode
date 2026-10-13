---
type: prg
status: completed
date: 2026-10-13
run: 0027
wave: 006
related:
  - docs/wav/wav-006-library-view-editor/run/run-0027-library-view-diagram/run-0027-library-view-diagram.md
---

# Progress Log: run 0027, Library view diagram

## Log

- 2026-10-13: Run set up (directory and number given by the orchestrator; status file already at `proposed`). Profile `TDD+pln` (the plan row says so; `manage-runs` agrees: the requirements are the wave's own, there is no product question, so no PRD): Stages 1-3 skipped. Read the wave plan and business case, the diagram pipeline of `standalone.html` (`mountDiagramIfNeeded`, `showDiagramScene`, `renderDiagramSvg`, the camera functions, the Library perspective, `render()`, the address) and the test harness. Baseline: node 454/454.
- 2026-10-13: Stage 4 TDD drafted (status `designing`); Stage 5 KDMLLC review dispatched (standard tier, read-only) and the code was written meanwhile against the draft; Stage 6: no blocking question (the wave's open question is answered by DEC-1 and DEC-4); Stage 7 not applicable (no PRD). Stage 8-9: pln written (status `planned`), tasks trace to TDD ids, `likely_files` exist, `blocking_gaps` empty.
- 2026-10-13: Stage 10 (`in-progress`): all six tasks inline. 43 new node tests; the review's findings applied (see the pln's Results); about 45 hand mutations, three alive at first and given tests; replica not needed: the real page was driven.
- 2026-10-13: Stage 11: node 497/497, `./mvnw test` (JDK 25) 114 tests 0 failures, `embed.sh --check` exit 0, base64 block untouched, the real page checked on a copy of the user's workspace (copy identical to the original afterwards). Canonical impact: CI-arc-1 and CI-dom-1 not applicable, with their reason, in the TDD. No backlog sweep (this repository has no `docs/bkg/`). Run completed.

## Findings

- Wave open question, how the Library host gets its inputs: a recipe argument (TDD DEC-1), not a view-scoped copy of the globals. The pipeline is asynchronous (kernel, ELK), so borrowed globals would stay borrowed across awaits during which the user can click, and an exception or a superseded mount would leave the Map changed; with a recipe the Library host has no write path to them, which the snapshot tests check.
- Wave open question, the tools: zoom, centre, fit, the pan and the exports belong to the page (its own camera, parked per host); fold/unfold do not exist on the page (a Map view's `opened` is part of the view); *Hide unlinked* and the four texts are a look of the page (`libraryLook`), neither edits nor the Map's choice. W-3 should replace `libraryLook` with edits of the view and make the toolbar act on them.
- The camera, scene, cache and the roving tab stop of the links were one set of globals shared by the Map and Elements, on purpose. The Library gets its own through a swap (`useDiagramHost`), done where `currentPerspective` is assigned because three callers write the address from the camera before `render()` (review F3).
- A box is named from `findElementRecord`, which asks `layerOfReference`, which reads the selection: a reference in both layers is named from whatever is selected. The Map and Elements keep that; the page passes the layer of the view (`itemLayer`). A latent inexactness for the Map and Elements, not changed (review F1).
- Pre-existing, left: a selected link (Map, or Elements over its element) is ended by entering the Library (`settleLinkSelection`), as by Files or Settings. A facet that the settings no longer have is ignored silently (`viewProblem` does not say it), by *Open on diagram* as by the page. `markElementTabs` runs the kernel for the Library header's tab group when an element is selected (harmless: its buttons are not `overview/detailed/deep`). Space on a read-only node scrolls the centre panel (no `data-action`, no `preventDefault`).
- The wave plan says 442 existing node tests; there were 454 when this run started (wave text to fix).
- The built-in browser could not take a screenshot (window behind another); the look of the page, light and dark and the widths were not seen. W-4 must.
- Wave-level for W-2: the page's drawing has no `data-action` (DEC-5): W-2 adds the box and link actions and the selection state of the page (a fourth thing to park or a field of the host record), and must add it to the snapshot test of a visit. The details block sits under the diagram at most 33% of the height; W-2 moves it to the right-hand panel and the `.library-view-details` rules go away. The header of the page carries the PNG/SVG group; W-2's narrow-width rules for the header must keep it.
