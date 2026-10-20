---
type: wbc
wave: 016
status: proposed
date: 2026-10-20
related:
  - docs/wav/wav-015-editor-reshape-and-loose-ends/wav-015-editor-reshape-and-loose-ends.md
  - docs/wav/wav-015-editor-reshape-and-loose-ends/prg-015-editor-reshape-and-loose-ends.md
  - docs/fixtures/brightcart-spec.md
  - CLAUDE.md
---

# Wave 016 — Band Tree and Technology Map — Business Case

## Context

Wave 015 (PR 63, merged on 2026-10-20 and released as 0.14.0) reshaped the editor and closed about fifty issues. The author then looked at the editor on Brightcart and answered, the same day, the questions of a review of the
twenty-five issues that stayed open: the list *Compare with* of the band should show the tree of the plateaus with the plateau drawn greyed (#72); the page Environments should show the application elements and
the relationships, each hidden or shown from the toolbar (#107); a root container, component or node is an error in a workspace that has plateaus (#106); *Add to story...* gets a check box (#110); the Brightcart fixture ships
views and stories (#115); and the warning that a story or a view with `plateau:` is ignored goes, because nobody but Brightcart consumes a plateau, a story or a view.

The review also found small things that the issues do not hold: a rename that breaks a view in a sibling plateau (#116), a CSS that no test reads (#117), a render whose cost was measured on 82 elements only (#118), and a byte-order mark that the
save drops (#119, left out). The sources are those GitHub issues: #26, #72, #105, #106, #107, #108, #110, #111, #113, #115, #116, #117 and #118. Nothing in the registers (`docs/bkg`, `docs/ana`) exists to read.

## Problems / Opportunities

- The list on the right of the band hides the hierarchy that the list on the left shows, and its indentation is made of spaces that a browser collapses.
- The page Environments, built in wave 015, draws the technology layer and little else: the applications that run on it and the relationships between what is drawn are what a reader of an environment wants.
- The two tools still read three inputs two ways (the layer of a saved view, a root kind that no layer holds, an empty relationship), and the command line says nothing about a root `container` that no patch can reach.
- Three things the author does by hand in YAML have no place in the editor (`at` and `against` of a new step, `settings.current`), and a long list of changes can be walked with the mouse only.
- The Brightcart fixture proves the layers and says nothing about the views and the stories that wave 015 untied from them.

## Options & Recommendation

1. **One wave, three phases** (recommended): P0 makes the readers agree and removes the warning, so that the editor is changed on a reader that agrees with the command line; P1 is the editor, the fixture and the technology
   Map (the fixture first, since three runs are tested on it); P2 audits the CSS and the cost, and writes the manual. Twelve runs, all `standard`, one at a time.
2. **Only the decided items (#72, #115, #107, #106, #110, the warning)**. Rejected: the small defects of the review cost a run each and would wait for a wave that does not exist; the author asked for the wave to take what is worth it.
3. **Also the lifecycle of plateaus (#89, #65, #112)**. Rejected: they need one design decision (derivation or concatenation) that nobody has taken; building them first would build the wrong thing.

## Vision

The band says the hierarchy of the plateaus on both sides; the page Environments is a map of the technology layer with its applications and its relationships, each shown or hidden; the Brightcart fixture carries views and stories
on its four plateaus; the editor writes what the author used to write by hand; the two tools read the same input the same way and say nothing about what nobody uses; the CSS and the cost of the page are watched by tests; and the manual says it.
