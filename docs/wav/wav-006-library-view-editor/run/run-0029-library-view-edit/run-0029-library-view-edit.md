---
type: run
run: 0029
status: completed
wave: 006
---

# Run 0029: Library view edit

Wave 006 (`library-view-editor`), run W-3. Document profile: `TDD+pln` (the plan row says so; the requirements are the wave's own and there is no
product question, so no PRD); documents in this directory: `tdd-0029-library-view-edit.md`, `pln-0029-library-view-edit.md`, `prg-0029-library-view-edit.md`.

The attributes of a view on its page in the Library are fields: viewpoint, layer, element, facet, *Hide unlinked*, the four texts, and for a Map view the
pinned, hidden and open elements as lists. An edit changes the view entry in memory (*modified*, written by *Save all changes*, given up by *Cancel*) and
the diagram follows; the toolbar's *Hide unlinked* and text buttons are the same edits (the transient look is gone). Answers to the wave's open question
(TDD DEC-1): every attribute is edited by a field of the panel, the drawing edits nothing, Map pins are lists with add and remove in the panel. A view an
edit left undrawable says why, with the same form in the centre to correct it. The manual (`editor-stories`) describes the page. Canonical impact:
not applicable (CI-arc-1 and CI-dom-1, with their reason, in the TDD).
