---
type: run
run: 0024
status: completed
wave: 005
---

# Run 0024: Inspection panel — navigation

Wave 005 (`follow-ups-and-field-check`), run W-2, tmorin/archicode#17 items 1, 2, 3, 5 and 6 (item 4, the roving tab stop of the
diagram links, is run 0025's). Document profile: `TDD+pln`; documents in this directory:
`tdd-0024-inspection-panel-navigation.md`, `pln-0024-inspection-panel-navigation.md`, `prg-0024-inspection-panel-navigation.md`.

In the panel of a link each relationship offers its declaring element as a button (`goto-element`, in the layer of the drawing).
A selected link is in the address (`link-from=` and `link-to=`, the pair of boxes; the wave's open question, TDD DEC-2), restored on
load and on Back/Forward, dropped with the address cleaned when the drawing lacks it; selecting still pushes no history entry.
On the Map a selected link, or one an address names, is brought into view once by the least pan, through `revealDiagramNode`: a
relaxation of the issue's "centre" (TDD DEC-3, Q-1). Parallel links are told apart by their position in the markup (`data-nth`,
only on twins) and, in the selection, by the keys of the relationships of the clicked one (TDD DEC-4, the wave's second open
question): the panel marks them in words. The header of an element shows its styled stereotype badges after its kind, giving way
before the name does. Manual `[[editor-inspection]]` updated. Canonical impact: not applicable (CI-arc-1 and CI-dom-1, with their
reason, in the TDD).
