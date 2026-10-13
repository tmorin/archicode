---
type: prg
status: completed
date: 2026-10-13
run: 0028
wave: 006
related:
  - docs/wav/wav-006-library-view-editor/run/run-0028-library-view-panels/run-0028-library-view-panels.md
---

# Progress Log: run 0028, Library view panels

## Log

- 2026-10-13: Run set up (directory and number given by the orchestrator; status file already at `proposed`). Profile `TDD+pln`: Stages 1-3 skipped, Stage 7 and the PRD checks of Stage 9 not applicable. Read the wave plan, the business case, the progress log of the wave, and the documents of run 0027 (tdd, pln, prg); read the page code (`renderLibraryPerspectiveHtml`, `renderShellHtml`, `renderInspectionHtml`, the link panel, `selectLink`, `showDiagramScene`, `useDiagramHost`, `handleAppClick`, the keyboard). Baseline: node 497/497.

- 2026-10-13: Stage 4 TDD drafted; Stage 5 KDMLLC review dispatched (standard tier, read-only) and the code was written meanwhile; Stage 6: no blocking question (the three open questions owned by this run are answered by DEC-1, DEC-3, DEC-4); Stage 7 not applicable (no PRD). Stage 8-9: pln written, tasks trace to TDD ids, `likely_files` exist, `blocking_gaps` empty.
- 2026-10-13: Stage 10: tasks 001-004 and 006 inline, task 005 (the manual) dispatched to a subagent. The review's findings applied (see the pln's Results). 31 new node tests, 36 hand mutations (all caught, three needed a test).
- 2026-10-13: Stage 11: node 528/528, `./mvnw test` (JDK 25) 114 tests 0 failures, `embed.sh --check` exit 0, base64 block untouched, manual built, the real page checked on a copy of the user's workspace (copy identical to the original afterwards). Canonical impact: CI-arc-1 and CI-dom-1 not applicable, with their reason, in the TDD. No backlog sweep (this repository has no `docs/bkg/`). Run completed.

## Findings

- Wave open question, the shape of the attributes: one panel on the right, two sections, the view first and the selection under it (TDD DEC-1). A click on a box or link selects on the page (the page's own selection, `libraryPick`, never `AppState.selection`), and the panels of the Map render it unchanged (DEC-2, DEC-3). The way to the element in Elements is a *Show in Elements* button in the element panel, not a click (DEC-4).
- The right region of the shell narrows the centre, which made the header's row of buttons overflow it at 822 px (measured: 270 px of centre, 510 px of buttons). The page's header now uses the Map's "⋯" mechanism for PNG, SVG, Open on diagram, Rename and Delete. For the wave: W-3 adds controls to the panel and the header; the same width budget applies.
- Maximize on the page is real (the wave row says the panel is absent while maximized): `diagramMaximized` is parked per host with the rest of the diagram state, so the Map's readers did not change.
- Pre-existing, left: the status line of a diagram overflows a very narrow centre (a `nowrap` span), on the Map as on the page. A selected link of the Map is still ended on entering the Library (finding F-1 of run 0027). Space on a node scrolls the centre panel when it has no action; now that a box has one, Enter and Space select it.
- For W-3: `libraryLook` and the two toolbar branches are still there; the section "the view" of the panel (`renderViewAttributesHtml`) is what becomes controls; keep `libraryPick` consistent (a link no drawing holds is dropped by `reconcileLinkSelection`, an element that no longer exists by `renderLibraryPanelHtml`). The panel width is the Map's (one `panel-right`).
- The built-in browser could not take a screenshot (as in run 0027): the look, light and dark, other widths and the focus after a pointer click were not seen. W-4 must.
- The wave plan text says 442 existing node tests (454 at the start of the wave, 497 at the start of this run): wave text to fix (already noted by run 0027).

## Lessons Learnt

- A design review that lists the readers and writers of a shared global is worth its cost when the new state mirrors an old one: it found `syncLinkTabStop`, the outline by id and the stale pick, none of which a test of the happy path would have shown.
- The first draft of a header for a new, narrower centre was tested only in Node; the overflow was found by measuring the real page. Measure the header whenever a panel is added next to it.
