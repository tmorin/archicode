---
type: wbc
wave: 008
status: completed
date: 2026-10-14
related:
  - docs/wav/wav-007-stable-stereotypes-and-nested-fills/wav-007-stable-stereotypes-and-nested-fills.md
  - docs/wav/wav-004-editor-workspace-experience/wav-004-editor-workspace-experience.md
  - CLAUDE.md
---

# Wave 008 — Plateaus and Baseline Diff — Business Case

## Context

A workspace describes one version of an architecture. The author marks `new` and `changed` by hand with
`rendering-stereotypes`, a deletion cannot be expressed, and there is no notion of a transition architecture
(tmorin/archicode#18, the TOGAF baseline, target and transition architectures).

A field trial on a real baseline and target (two sibling workspaces of one platform, 132 and 165 elements) showed what
a hand-tagged approach misses and what a computed one must handle: 38 new, 5 removed and 25 to 26 changed elements, 79
new and 23 removed relationships; the author's tags missed 16 new elements; 14 of 21 property changes were wording only;
a removed role was split in two new ones with no hint in the data.

A design study (an HTML page, "États d'une architecture", versions 1 to 3, read-only on the repository) compared six
options for persisting states and recommended hybrid H: one `workspace.yaml` at the root with `settings.plateaus`, one
complete folder per plateau, the difference computed by the kernel between any two plateaus, and one author hint,
`replaces`. The author answered its 17 questions on 2026-10-14. The answers this wave builds on:

- A plateau `path` is mandatory everywhere, relative, below the root; `.` is refused when there are several plateaus.
- No `..` and no absolute path anywhere, also in `manifests.paths` (a breaking change; no workspace of this repository
  uses `..`). Without `plateaus`, a workspace behaves as before.
- The plateau drawn by default is the last of the list unless `current` is written; `--plateau` picks another.
- `from` is reserved and refused with a clear message.
- The date of a plateau is a free text label, optional, never interpreted. The author asked for a better word than
  `date`; this wave names the key `horizon` (the TOGAF "time horizon"; it says that `2027-Q1` is a period, not a
  parsed date). It is one word to change if the author prefers another.
- A reference declared twice in one plateau is an error that names both files.
- The comparison is with the previous plateau of the list; a `baseline` key per plateau changes it.
- Output folders: `views-<plateau>/` and `views-<plateau>-vs-<base>/`.
- Plateaus are folders side by side; a git baseline comes later. All plateaus stay in the working folder.
- Hand-written `new` and `changed` tags keep working, without a warning.
- A container whose only descendants changed is not `changed`: it carries a discreet marker (the author chose this over
  plain context, so it is not lost).
- Wording-only changes are visible by default, counted apart, hidden in one click.
- Views and stories belong to the plateau folder that holds them.
- Drift between copies is accepted: the computed difference shows it.
- Layered increments (option F) stay out; reopen them if a real plan of many small increments appears.
- Moving an element under another parent: the author wants an editor action. That belongs with `replaces`, in the
  next wave (see Non-Goals of the plan).

Nothing in the registers covers this (there is no `docs/bkg` and no `docs/ana`).

## Problems / Opportunities

- A reviewer cannot see what a target architecture changes without reading 646 lines of text diff, and removals are
  invisible in the model.
- Without a computed difference, every state is a hand-tagged copy that drifts and forgets a third of its new elements.
- One `workspace.yaml` per state duplicates styles and facets, and the editor cannot read a sibling folder.

## Options & Recommendation

1. **Plateaus as complete folders, difference computed by the kernel (recommended, hybrid H).** One source of truth for
   the settings, each plateau valid on its own, one implementation of the comparison for the CLI and the editor.
2. **Layered increments over a base, folded in git (option F).** Rejected for now: on the trial data the increment is 58 to
   81 % of the target, even a pure addition replaces existing files, and it adds silent shadowing, a base that is no
   longer frozen, and about ten runs of tooling.
3. **A `workspace.yaml` per state, compared by path (option A).** Rejected: duplicates the settings and the editor cannot
   open a baseline outside its folder handle.
4. **Hand-typed tags, lifecycle fields or patch operations (options B, C, D).** Rejected: a deletion cannot be typed in
   B, a changed property has no place in C, D is a second language.

## Vision

An author lists the plateaus of an architecture in one `workspace.yaml`, each a complete folder. The CLI and the editor
draw any plateau and compare it with another: new, changed and removed elements and relationships are drawn in a visual
language that never relies on colour alone, listed in a table of changes, and filtered to "changes only". A workspace
without plateaus works exactly as before.
