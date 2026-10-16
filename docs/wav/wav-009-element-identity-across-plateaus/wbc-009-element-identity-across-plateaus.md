---
type: wbc
wave: 009
status: completed
date: 2026-10-15
related:
  - docs/wav/wav-008-plateaus-and-baseline-diff/wav-008-plateaus-and-baseline-diff.md
  - docs/wav/wav-008-plateaus-and-baseline-diff/wbc-008-plateaus-and-baseline-diff.md
  - CLAUDE.md
---

# Wave 009 — Element Identity Across Plateaus — Business Case

## Context

Wave 008 compares two plateaus by reference, the dotted path of an element. That is exact for an element that stays
where it is, and wrong for one that does not: a rename, a move under another parent, a split or a merge changes the
reference, so the comparison draws one removed element and one or more new ones, with nothing to say they are the same
thing. The field trial behind wave 008 had such a case (a removed role split into two new ones) and the data kept no
trace of it. The wave 008 design chose one explicit author hint for this, `replaces`, and left it, with the editor
action to move an element, for the next wave (issues tmorin/archicode#22 and #23).

Three smaller follow-ups of wave 008 belong with it because they touch the same code and the same pages:

- #28: a hand-written `rendering-stereotypes: "new"` on an element that did not change is drawn differently by the CLI
  (the default look of the state is emitted for every box of a view that has something new) and by the editor (only a
  box that has the state computed). The manual says so; one rule should win.
- #32: the editor serialises both models to JSON on every render only to key the cache of the comparison. Moves and
  `replaces` writes add edits, so the cache key has to be right before they land.

Nothing in the registers covers this: there is no `docs/bkg` or `docs/ana` item; the sources are the GitHub issues.

## Problems / Opportunities

- A comparison of a reorganised architecture is mostly noise: every moved element is a removal and an addition, every
  relationship that points at it is too, and the reader has to rebuild the identity by eye.
- The author has no way to say "this is the same thing" in the data, and the editor, which already renames an element
  and rewrites the references that point at it, cannot move one under another parent.
- Two renderers, the CLI and the editor, must agree on what a state means; today they differ on one case.

## Options & Recommendation

1. **Guess the identity** (same name, same description, same last identifier). Rejected: the design study measured it on
   a real pair and it gave false positives (pairs with the same last identifier and nothing else in common).
2. **A mapping file outside the manifests** (`migrations.yaml` listing old and new references). Rejected: it lives away
   from the element it describes, it is not seen by the editor's per-element panel, and it is a second format.
3. **An explicit hint on the element of the more recent plateau, `replaces`, applied by the kernel, with candidates
   proposed but never applied** (recommended). The author declares, the tool suggests; old tools ignore an unknown key,
   so the manifest format stays compatible; the same data serves the CLI, the editor and the table of changes.

Decomposition: the kernel first (it owns the semantics, one contract bump), then the CLI and the editor that show and
write the hint, then the move action, which is only worth having once the hint can be written. The rule for a
hand-written state tag and the cache key are small and independent, and are done before the editor work that depends on
them.

## Vision

An author can write `replaces: [ref, ...]` on an element of the more recent plateau, or let the editor write it from a
proposed match or from a move or a rename. The comparison then reports that element as moved, split or merged instead
of removed plus new, in the table of changes, in the views of the CLI and in the editor. Candidates are listed but never
applied. The editor moves an element under another parent and rewrites the references to it. A hand-written state tag
means the same thing in the CLI and in the editor, and the editor does not re-serialise the model on every render.
