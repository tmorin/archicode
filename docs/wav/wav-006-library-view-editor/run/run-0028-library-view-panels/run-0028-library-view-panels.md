---
type: run
run: 0028
status: completed
wave: 006
---

# Run 0028: Library view panels

Wave 006 (`library-view-editor`), run W-2. Document profile: `TDD+pln` (the plan row says so; the requirements are the wave's own and
there is no product question, so no PRD); documents in this directory: `tdd-0028-library-view-panels.md`,
`pln-0028-library-view-panels.md`, `prg-0028-library-view-panels.md`.

The page of a view in the Library has a right-hand panel (the shell's: resizable, width remembered, absent while the page is maximized): the
attributes of the view first, then — once a box or a link of the diagram is selected — the inspection of the selection, the same panels as the
Map's. Answers to the wave's open questions (TDD DEC-1, DEC-3, DEC-4): one panel with two sections; a click selects on the page (its own selection,
not the Map's), and a *Show in Elements* button in the element panel leaves for the element. The page gained Maximize (state parked per host) and
a "⋯" menu in its header. The manual (`editor-stories`, `editor-inspection`, `editor-keyboard`) describes it. Canonical impact: not applicable
(CI-arc-1 and CI-dom-1, with their reason, in the TDD).
