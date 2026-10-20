---
type: wbc
wave: 017
status: proposed
date: 2026-10-20
related:
  - docs/wav/wav-016-band-tree-and-technology-map/wav-016-band-tree-and-technology-map.md
  - docs/wav/wav-016-band-tree-and-technology-map/prg-016-band-tree-and-technology-map.md
  - docs/fixtures/brightcart-spec.md
  - CLAUDE.md
---

# Wave 017 — Editor Defects and Composed Replaces — Business Case

## Context

Wave 016 (PR 126, released as 0.15.0 on 2026-10-20) left twenty issues open. The author asked for a review of them and for the next wave to be chosen from it; the review and its recommendations
were accepted the same day ("Écrit la vague et complète la"). The sources are those GitHub issues: #82, #89, #94, #119, #120, #121, #122 and #123. Nothing in the registers (`docs/bkg`, `docs/ana`) exists to read.

Four of them are defects with a reproduction or a clear reading of the code, found by wave 016 itself while it was built: a `Remove` button that removes the wrong item (#120), a bare `dangling reference` that
leaves the folders of `views generate -i` half written (#121), a dialog whose *Cancel* probably drops what was typed (#123, never seen in a browser) and a *Move* that rewrites the views of the sibling plateaus without saying
so (#122). Two are known gaps of the layers: the `replaces` of the layers between two plateaus are not composed, so a move made in two steps reads as *new* and *removed* (#89), and a patch cannot take a field out (#94).
Two are small losses or measures to redo: the byte-order mark and a trailing comment of a moved block (#119) and the editor at 360 px, measured before the band was reworked (#82).

## Problems / Opportunities

- The author must not find the errors: a wrong item removed and a typed text lost are the kind of defect that costs trust, and both have a cheap fix.
- The command line says `error: dangling reference: x` with neither the view nor the facet, and has already written half of the folders when it does.
- A comparison two plateaus apart gives a table that differs from the model of the fixture on two rows, and the tool prints a warning about it that the author cannot act on.
- An inherited description cannot be cleared in a plateau: the editor refuses with a sentence.
- The top bar and Settings at 360 px were measured on a band that no longer exists.

## Options & Recommendation

1. **The defects, the two gaps and the measure, in three phases** (recommended): P0 the five editor and command-line defects (one run each, small), P1 the 360 px measure and the two gaps of the layers (the kernel is touched), P2 the manual and `CLAUDE.md`. Nine runs, all `standard`, one at a time.
2. **Only the defects (#120, #121, #122, #123, #119)**. Rejected: #89 and #94 are the two limits the manual lists that a reader of a plateau meets first, and both have a direction written in their issue; the author asked for the wave to take what is worth it.
3. **Also #124 (the dependencies of what is inside an application), #112 (delete a plateau in the middle) and #109 (draw a story from the command line)**. Rejected: #124 changes the output of three viewpoints and the Map and nobody has asked for it; #112 and #109 wait for decisions the author has not taken.

## Vision

A button removes what it says, a dialog that is cancelled gives the form back as it was, a view whose element a facet removes is told by name before anything is written, a *Move* says what it breaks in the sibling plateaus as a rename does, and the save keeps the byte-order mark.
A move made in two steps is a move in the comparison two plateaus apart, and a plateau can say that an inherited field is gone. The editor at 360 px is measured on the band as it is now. The manual and `CLAUDE.md` say it.
