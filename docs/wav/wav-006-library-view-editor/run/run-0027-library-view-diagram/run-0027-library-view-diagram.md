---
type: run
run: 0027
status: completed
wave: 006
---

# Run 0027: Library view diagram

Wave 006 (`library-view-editor`), run W-1. Document profile: `TDD+pln` (the plan row says so; the requirements are the wave's own and
there is no product question, so no PRD); documents in this directory: `tdd-0027-library-view-diagram.md`,
`pln-0027-library-view-diagram.md`, `prg-0027-library-view-diagram.md`.

The page of a view in the Library (`#/library/views?view=<id>`) draws the view in its centre with the canvas of the Map and Elements, its
tools (zoom, centre, fit, PNG, SVG, *Hide unlinked*, the four texts) and the view's facet, and keeps *Open on diagram*, *Rename*, *Delete*, the
facts and the steps that show the view. Answer to the wave's open question (TDD DEC-1): the diagram pipeline is parametrised by a **recipe**
that the host builds (the Map and Elements from the page's globals as before, the Library from the view); the camera, scene, cache and link tab
stop are parked per host and swapped (`useDiagramHost`), so the Library host has no write path to anything the Map and Elements read. The page's
drawing is read-only (W-2 gives a click a meaning); *Hide unlinked* and the texts are a look of the page, not edits (W-3 turns them into edits).
A view that cannot be drawn keeps its message and has no canvas. Canonical impact: not applicable (CI-arc-1 and CI-dom-1, with their reason, in
the TDD).
