---
type: wbc
wave: 021
status: completed
date: 2026-10-23
related:
  - docs/wav/wav-020-reading-a-story-and-name-fixes/wav-020-reading-a-story-and-name-fixes.md
  - docs/wav/wav-020-reading-a-story-and-name-fixes/prg-020-reading-a-story-and-name-fixes.md
  - CLAUDE.md
---

# Wave 021 — Story Player and Release Binaries — Business Case

## Context

Wave 020 was merged on 2026-10-23 (PR 152) and is not released: the author decided to cut 0.19.0 after this wave. On trying the reading mode that wave built for #142, the author found it wrong: it is still the editor's own page, sharing the editor's state (plateau, comparison, selection, address), so a story shown to someone changes what the editor shows. The author asked for a reading decoupled from that state: *Play* opens a modal that takes all the room and plays the story like slides (#153).

The backlog was reviewed by a sub-agent on 2026-10-23 and decided by the author the same day, on a page of decisions (14 decisions, all answered with the recommendation, no veto among the 8 points settled by default). Two older defects of the editor's save, #150 (quotes lost when a bracketed collection changes shape) and #151 (a comment moves to the wrong item when an item of a list of lists is removed), were reproduced by the review; and #149 asks for the native binary to be built by the pipeline and attached to the release page (it is built on every pull request today and thrown away; no GitHub release exists, only tags).

Nothing in the registers (`docs/bkg`, `docs/ana`) covers this; the sources are the GitHub issues.

## Problems / Opportunities

A reader who only presents an architecture cannot do it without disturbing, or being disturbed by, an editing session. A user who wants the tool must have a JDK or Docker: there is no file to download. And the editor's save, the one place where it rewrites the author's text, still drops quotes and a comment in two cases found by a generated test in minutes, which says there are more.

## Options & Recommendation

1. **Stories and distribution in one wave: the player in two runs, the save, the binary in two runs, the manual** (recommended). The player is the author's priority; the binary touches only the workflow and a command-line flag, so it shares no file with the editor runs and costs little in review; the save fix gets the generative test that wave 019 and 020 each needed.
2. **Stories alone.** Five runs, no `hard_judgment`. Rejected: the binary has no dependency on the player, and leaving it out delays a release page for another wave.
3. **Distribution first** (the binary, then the agent work of #144, as the review proposed before the author's feedback on the reading). Rejected by the author: the player is the priority and the agent work comes in wave 022.
4. **Keep the wave 020 reading mode and add the modal beside it.** Rejected: two readers to maintain, two paragraphs of manual, and the reading mode is not released, so removing it breaks no one.

## Vision

*Play* opens a modal that fills the window and plays the story slide by slide, each step drawn from the model for the plateau and comparison it names, with the editor behind it untouched and put back exactly as it was on close. The editor's save keeps the quotes and comments it can keep, with a generated test as the guard. A person can download `archicode` for Linux or a Mac from the release page and print its version. The manual and `CLAUDE.md` say what the tools do at the end of the wave.
