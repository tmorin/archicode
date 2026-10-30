---
type: wbc
wave: 027
status: completed
date: 2026-10-29
related:
  - docs/wav/wav-027-editor-layout-and-walk/rfc/rfc-001-diagram-layout-address-and-walk.md
  - docs/wav/wav-026-relationship-view/wav-026-relationship-view.md
---

# Wave 027 — Editor layout and walk — Business Case

## Context

Three open issues are about the editor alone: #179 (the *Previous change* / *Next change* buttons leave the viewport when a comparison has many changes), #178 (the diagram layout cannot be configured, the address does not carry every option, the toolbar has grown by waves) and #155 (two layout losses of the save when lists are nested again). Wave 026 added the relationships list and the highlight to the same toolbar and panel, so both are now crowded.

The registers: `docs/bkg` and `docs/ana` do not exist in this repository; the backlog is GitHub. The wave consumes #179, #178 and #155. Four open issues are not in it: #134 and #135 (importers), #65 and #24 (plateaus).

The author answered the five decisions of the brief on 2026-10-29 as recommended; they are recorded in `rfc/rfc-001-diagram-layout-address-and-walk.md`.

## Problems / Opportunities

- A reader of a large comparison cannot walk the changes with the mouse without scrolling back to the buttons after every click.
- A Map with many boxes that no link joins is drawn as one long row (12 boxes in a container: 1,688 px; 20 unlinked boxes: 2,956 px). Nothing can change it.
- A link copied from the address bar does not always draw what the sender sees: the fold state and *Changes only* are not in it.
- The toolbar has no inventory: each control has its own rule for what it saves and where it lives, and the controls differ between the page of an element, the Maps, and the page of a saved view.
- #155 is open for two cases no manifest field can produce, and its body is stale.

## Options & Recommendation

1. **Three issues, five decisions, four runs (recommended).** The walk bar alone first (small, proves the e2e pattern for a sticky panel), then the layout option and the address in a chain, then the toolbar review as a document. #155 closes with no run.
2. **One run per issue.** #178 mixes four subjects that do not end together (an option, a rule, a design document, a rail). One run would carry a design gate that an autonomous wave cannot pass.
3. **Everything including the toolbar code, the rail and L3/L4.** The rail touches the right panel, the stories page and many tests for three tabs; L3 and L4 add heuristics to the most fragile code of the save for a case only a patch `value` can produce; the toolbar code needs the author's mock-up first.

Recommended: option 1. It keeps the wave to the work that has a checkable end, and it hands the toolbar code to the next wave with a proposal the author has agreed.

## Vision

When the wave is done, the Changes list of every page can be walked with the mouse for any number of changes without a manual scroll. Every diagram of the editor (an element, a Map, a saved view, a story step) can be laid out with `layout.columns` at the workspace, the view and the diagram, and a link from the address bar reproduces everything that changes the boxes and links drawn. The command line draws what it drew. The toolbar has a written inventory over every diagram and a proposal waiting for the author's agreement. #155 is closed with its limits written in the manual.
