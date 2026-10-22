---
type: wbc
wave: 020
status: proposed
date: 2026-10-22
related:
  - docs/wav/wav-019-followups-of-wave-018/wav-019-followups-of-wave-018.md
  - docs/wav/wav-019-followups-of-wave-018/prg-019-followups-of-wave-018.md
  - CLAUDE.md
---

# Wave 020 — Reading a Story, and the Small Fixes — Business Case

## Context

Wave 019 was released as 0.18.0 on 2026-10-22. It closed every open fix and filed three more as it ended: #145 (a changed bracketed collection is written back as a block), #146 (the failure "the workspace file is missing or unreadable" is recognised by the file name found in the message) and #147 (a facet name is used as is in a folder name). The same day the author opened #142: a story is read today inside the whole editing environment, with a bar that has *Previous* and *Next* only, and the author wants a calmer way to read it and a menu to jump to any step. The author asked for this wave on 2026-10-22: as many fixes as possible, and the feature on stories.

No open issue carries the `bug` label; the three that are fixes (#145, #146, #147) carry `enhancement`. They are the fixes of this wave. Of the feature issues, #142 is the feature on stories. #143 (a view built on relationships, for stories that light up a sequence) is also about stories, but it has five open questions that only the author can settle (the layer, how a relationship is named, the highlight, the value of `viewpoint`, the link with #142); it stays open. Nothing in the registers (`docs/bkg`, `docs/ana`) covers this; the sources are the GitHub issues.

## Problems / Opportunities

A story shown to someone else looks like a work in progress: the tree, the inspection, the forms and the tool bars stay around the diagram, and reaching step 7 takes six presses of *Next*. That is the one thing the editor cannot do for a review of an architecture with people who do not edit. The three fixes are small rough edges that cost little now and more after the next feature lands on the same files: a folder named by a facet called `a/b` or `..` writes in the wrong place or fails with a message from the file system, the error wording of the command line and of the editor depends on a file name found in a message, and a one-word edit of a `[a, b]` list rewrites the author's layout.

## Options & Recommendation

1. **One wave: the three fixes first, then the story in two runs (the step menu, then the reading mode), the manual last** (recommended). The fixes are independent and small and end in one gate with byte identity against 0.18.0. The menu is useful on its own on the bar that exists, and the reading mode reuses it, so building it first lets each run be finished and evidenced alone. One manual run closes the wave, as the two last waves did.
2. **The story feature in one run.** Fewer documents, but the menu and the reading mode have different exit evidence (a step reached from a list on the existing bar; a layout with the editing tools gone, an address, the keys and the phone), and one large run fails more expensively. Rejected.
3. **Take #143 as the story feature, or with #142.** It would let a story light up a sequence, but its open questions are architecture decisions (how a relationship is named, a new `viewpoint` or a property of `map`) that a wave must wait for, not make; and it should follow #142, which sets the reading experience it will be read in. Rejected for this wave.
4. **Fold the fixes into the story runs.** Fewer PRs, but a regression of the save or of the facets would then be found among the edits of a new mode. Rejected.

## Vision

The folder a facet writes in is always one plain folder, or the facet is refused at load with one sentence in both tools; the failure to read the workspace file is a typed failure, whose wording does not depend on a file name; the save keeps the brackets of a collection it changed. A story can be read in a mode of its own, with the diagram, the words of the step, a menu of the steps and *Previous*/*Next*, and none of the tools that edit; any step can be shown straight from the menu; viewing writes nothing and leaving puts the reader back as they were. The manual and `CLAUDE.md` say what the tools do at the end of the wave.
