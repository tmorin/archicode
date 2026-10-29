---
type: rfc
rfc: 002
status: accepted
date: 2026-10-29
accepted: 2026-10-29 by the author, as recommended (Q-A to Q-E of run 0204), through the decision page of the same day
issue: 'gh:tmorin/archicode#178'
related:
  - docs/wav/wav-027-editor-layout-and-walk/run/run-0204-toolbar-review/run-0204-toolbar-review.md
  - docs/wav/wav-027-editor-layout-and-walk/rfc/rfc-001-diagram-layout-address-and-walk.md
---

# RFC-002 — The diagram toolbar

The author's answers to the five questions of run 0204's proposal. They apply to every diagram of the editor (an element in its three viewpoints, both Maps, a saved view, a story step in the editor); the story player has no toolbar and is unchanged. Wave 028 builds what they say, through the changes P-1 to P-8 of the run document, each with its guard.

## Decisions

- **DEC-1 (Q-A, P-5).** The toolbar is docked above the diagram, not floating over it. The page order becomes header, toolbar, chips, canvas, status; every control stays a tab stop.
- **DEC-2 (Q-B, P-3).** *Reset* goes back to the defaults when no view is behind the diagram (*Reset to defaults*), and to the view or step when there is one (*Reset to "name"*). It restores Draw, Texts and Layout only, never Compare or Frame, and is absent on the page of a saved view.
- **DEC-3 (Q-C, P-4).** *Everything* and *Changes only* become one toggle, *Changes only*. The address (`changes-only=1`) is unchanged.
- **DEC-4 (Q-D, P-6).** Under 40 rem each group is one button with the count of its controls that are on ("Texts 2"), opening its controls in a panel; *Reset* and *Changes only* stay buttons and *Frame* shows the zoom. A single "Tools" menu is rejected because it hides every state.
- **DEC-5 (Q-E, P-3).** *Open on diagram* remembers which view it opened, as session state only: nothing is written, and it is reset with the folder.

## Not decided here

P-1 (five named groups), P-2 (the "saved with the view" dot), P-7 (the page of a saved view gets *Fold all*, *Unfold all* and *Facet*) and P-8 (titles say what happens) were in the proposal and not among the five questions. Wave 028's plan takes them as proposed, and the author may overturn them when the plan is reviewed. The rail of #179 option C stays out (run 0204's decision).
