---
type: wbc
wave: 007
status: in-progress
date: 2026-10-14
related:
  - docs/wav/wav-004-editor-workspace-experience/run/run-0013-kernel-stereotypes.md
  - docs/wav/wav-005-follow-ups-and-field-check/wav-005-follow-ups-and-field-check.md
  - docs/wav/wav-006-library-view-editor/wav-006-library-view-editor.md
  - CLAUDE.md
---

# Wave 007 — Stable Stereotypes and Nested Fills — Business Case

## Context

A field trial of archicode on a real workspace (a baseline `as-is` and a target `to-be` of the same platform, kept in a
folder, about 3,500 generated files for the target) produced three findings that stand in the way of using
archicode for a baseline-versus-target comparison (tmorin/archicode#18):

1. The user reports that regenerating the views changes thousands of files with no real change, because the
   stereotypes of a box are not always written in the same order. They have been sorting them after the generation.
   Two things already touched this area: run 0013 made `rendering-stereotypes` a list computed by the kernel in a
   stable order, and run 0021 (commit `cf642ad`) made the CLI write the stereotypes of a box last first, so that the
   same workspace gives the same `.puml` byte for byte. A check on the current build (two consecutive generations of the
   target workspace, 3,461 files) gave 0 differing files. So the report may predate those two runs (they themselves
   reorder every file once), or it may depend on something a same-machine double generation does not exercise.
2. In the editor, boxes styled with the same fill, one inside the other, cannot be told apart. In the user's baseline,
   `external` is `background-color: lightgray` with no `line-color`, and it is on the `hub` solution and on each of its
   systems. A box with no `line-color` falls back to the theme's `--border`, which is invisible on its own fill, and
   the child vanishes into its parent. The `new` and `changed` styles of the target happen to carry a `line-color`,
   which is why they read.

Nothing in the registers covers this: there is no `docs/bkg` and no `docs/ana`. The sources are the field trial above and
the runs cited in `related`.

3. The labels of the links are drawn on one line in the editor. In the same baseline, `hub` receives links labelled
   `fetches catalogue data from [DOC]`, `issues access passes with [PASS]` and so on; a longer one crosses its
   neighbours. PlantUML already wraps at 200, the editor does not.

## Problems / Opportunities

- A generation that cannot be trusted to be byte-stable makes a workspace in git unreviewable: the real change drowns in
  thousands of lines of noise. It also breaks any later comparison of two generations.
- A style that gives only a fill produces boxes the reader cannot tell apart, which defeats the point of colouring them.
- A label that runs over the boxes and links next to it is as unreadable as a box that vanishes, and a real workspace has
  long labels.
  The comparison of a baseline and a target (#18) will colour boxes `new`, `changed` and `removed`, many of them inside a
  parent of the same colour, so the defect would get worse, not better, if it were left.

## Options & Recommendation

1. **Fix all three inside archicode, as three runs of one wave (recommended).** Reproduce the order report first, find the real
   cause or prove it is already fixed, and keep a determinism test so it stays so. Derive an outline for a box that
   has a fill and no outline. Wrap the long labels of the links.
2. **Sort the stereotypes after the generation** (the user's workaround, offered in the report). Rejected: it leaves the
   defect in the tool, every user has to rediscover it, and a post-processing step has no guard against the next
   reorder.
3. **Fix the nested fills by changing the author's colours** (shade each level, or lighten a child). Rejected: the manual
   promises that the fill is the author's own colour in both themes, as in the CLI; an outline derived from the fill
   changes nothing the author wrote, and an explicit `line-color` still wins.
4. **Do it as part of #18.** Rejected: the diff is a large feature with open design points; this wave is small and
   independent, and #18 needs it first.

## Vision

The same workspace gives the same generated files, byte for byte, whatever the machine or the run, and a test keeps it
so. In the editor, a styled box that has a fill and no outline still shows an outline of the same hue, so a box inside a
box of the same fill is told apart, in both themes and in the exported SVG, and a long label of a link is wrapped. The
manual says all three.
