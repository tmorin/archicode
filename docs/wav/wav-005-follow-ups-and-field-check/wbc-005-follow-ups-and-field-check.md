---
type: wbc
wave: 005
status: completed
date: 2026-10-13
related:
  - docs/wav/wav-004-editor-workspace-experience/wav-004-editor-workspace-experience.md
  - CLAUDE.md
---

# Wave 005 — Follow-ups and Field Check — Business Case

## Context

Wave 004 (released as 0.10.0) left a short list of deferred items, filed as GitHub issues, and one large gap: no run could
look at the real editor, only at its DOM and at replicas of its layout. The open issues are:

- tmorin/archicode#15 — the CLI's PlantUML picks an undefined style when two styled stereotypes meet on one box (a
  `HashSet`); the editor is deterministic.
- tmorin/archicode#16 — the list of remembered folders does not say which folders will need a permission click, and two
  tabs picking the same folder at once can leave two records for it.
- tmorin/archicode#17 — follow-ups of the inspection panel: the declaring element of a relationship is not navigable, a
  selected link is not in the URL, the Map does not centre on a selected link, Tab visits every link first on a dense map,
  two parallel links are not told apart, and the element header shows no stereotype badges.
- tmorin/archicode#18 — computing a baseline-versus-target diff. This is an idea with open product decisions, not a
  specification (see Options).
- tmorin/archicode#8 — three unchecked points: the visual check of the editor, the dangling-reference fix run end to end,
  and the published artifacts (the 0.6.0 ones are obsolete; 0.10.0 is the release to check now).

Nothing in the registers covers this (`docs/` has no `bkg` or `ana` register).

## Problems / Opportunities

- The CLI and the editor disagree on which style wins on a box with two styled stereotypes, and the CLI's answer can
  change from one run to the next.
- The editor's newest features (styles, inspection panel, header menu, folders) were only ever checked through the DOM and
  through replicas of the layout. `archicode editor serve` opens a folder in any browser, so the built-in browser can drive
  the real page on a copy of a real workspace: a check that was not possible during wave 004 for lack of a way in.
- A release just went out (0.10.0) and nobody has pulled what it published.
- Small gaps in the inspection panel and in the folder list that were consciously deferred.

## Options & Recommendation

1. **One wave of six runs, grouped by area, with the field check last (recommended).** The code follow-ups come first, then
   the evidence run that exercises everything in the real page, so that its findings describe the final state.
2. **One wave or run per issue.** Rejected: the items are small, three of them edit the same file, and each wave costs three
   documents and a gate.
3. **Include #18 (baseline versus target) now.** Rejected: its inputs are undecided (how a baseline is provided: a second
   folder, a git reference, a published snapshot), what "changed" compares, and where the result is shown (CLI views, the
   editor, both). A run would have to invent product decisions that nobody has made. It needs an interactive requirements
   session first.
4. **Skip the evidence runs and only fix code.** Rejected: the unchecked real-page behaviour is the largest remaining risk of
   0.10.0, and the means to check it now exists.

## Vision

The CLI and the editor resolve styles the same way, deterministically. The inspection panel and the folder list have the
small features that were deferred. The newest editor features have been exercised in the real page on a copy of a real
workspace, light and dark, with the findings recorded; the dangling-reference fix has run end to end; the 0.10.0 artifacts
have been pulled and run. What needs a real folder picker (the IndexedDB migration of a profile filled by the previous
version) is the only thing left to a human.
