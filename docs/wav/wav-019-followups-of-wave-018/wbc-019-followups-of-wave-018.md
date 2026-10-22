---
type: wbc
wave: 019
status: proposed
date: 2026-10-22
related:
  - docs/wav/wav-018-groups-shims-and-plateau-gaps/wav-018-groups-shims-and-plateau-gaps.md
  - docs/wav/wav-018-groups-shims-and-plateau-gaps/prg-018-groups-shims-and-plateau-gaps.md
  - CLAUDE.md
---

# Wave 019 — Fixes and Follow-ups, no New Feature — Business Case

## Context

Wave 018 was released as 0.17.0 on 2026-10-21. Its runs filed five follow-up issues for what they chose not to do: #136 (the four differences left in how the two tools read a YAML number), #137 (three rough edges of the editor), #138 (what *Write replaces* and the delete of a plateau could do instead of refusing), #139 (two cases of the dependencies derived from a deployed application) and #140 (what `stories generate` does not write). Two older loose ends are still open: #78 (the save of the editor writes a file again in its own layout when it holds an anchor or a tag inside brackets) and #125 (the cost of the kernel grows faster than the elements). The author also wants the rename of `workspace.yaml` to `.archicode.yaml` (#133), decided on 2026-10-21 with "later" and brought forward on 2026-10-22.

On 2026-10-22 the author set the aim of this wave: close as many open issues as possible, without adding a new feature. The LikeC4 importer (#134) was planned here first and taken out; it and the Structurizr importer (#135) stay open, as do `plateau merge` (#65), the matrix of plateaus (#24) and the calmer reading of a story (#142), which are features.

Nothing in the registers (`docs/bkg`, `docs/ana`) covers this; the sources are the GitHub issues.

## Problems / Opportunities

The open issues that are not features are small and each one leaves a visible rough edge: a form that loses what was typed in one path, a merge that can end half-written, two dependency cases the technology map does not draw, a story command that writes less than the views command, four readings of a number that still differ, a save that rewrites a file the author wrote with care, a kernel that slows down on large pairs, and a file name the author does not want. Left alone they pile up in front of the next feature wave, and the rename gets more expensive with every example added.

## Options & Recommendation

1. **One wave: the fixes first, the rename alone after them, the manual last** (recommended). The fixes are independent runs that end in one gate with byte identity against 0.17.0 (only two of them change an output, on purpose). The rename is a run of its own in its own phase, because it touches almost every test and shipped workspace and has to be checked against the outputs of the end of the first phase. One manual run closes the wave, as wave 018 did.
2. **Leave the rename for a later wave.** It is the cheapest time to rename today (twenty workspaces, a young tool), but the wave would stay a pure fix wave. The author brought it forward; rejected.
3. **Fold the fixes into a feature wave** (the importers, or `plateau merge`). Fewer PRs, but the feature wave then carries unrelated edits to the same page and kernel files, and a regression is harder to place. Rejected.

## Vision

The open fixes are closed, or filed again with a reason; the editor refuses what a layer cannot hold before it writes and keeps what the author wrote when it saves; the maps and the stories command draw what the model says; the kernel stays quick on large pairs; the file that marks a workspace is `.archicode.yaml`; and the manual and `CLAUDE.md` say what the tools do at the end of the wave, with the one break told in a block.
