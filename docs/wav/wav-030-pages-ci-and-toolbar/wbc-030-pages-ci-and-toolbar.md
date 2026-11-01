---
type: wbc
wave: 030
status: proposed
date: 2026-11-01
related:
  - docs/wav/wav-027-editor-layout-and-walk/rfc/rfc-002-diagram-toolbar.md
  - CLAUDE.md
---

# Wave 030 — Pages, CI and toolbar — Business Case

## Context

Five open issues are ready or became ready on 2026-10-31 and 2026-11-01, each with the author's decisions written on it:

- #195 the homepage: shows nothing of what ArchiCode produces in the first screen, has two identical buttons, mentions neither the second sample nor an entry for agents, and omits plateaus, stories and `plateau fold`. The author added metadata, `sitemap.xml`, `robots.txt` and `/llms.txt`.
- #193 the manual and the presentation page, split by the author into (a) the homepage (#195), (b) the skeleton of the manual, (c1) the prose, (c2) the missing pages. The decisions D1 to D4 of 2026-11-01 fix the sorting rule (Diátaxis: Start here, Tutorials, How-to guides, Reference, Concepts, then Upgrading), one file first, the voice (direct, second person, one word per thing), and a generated command reference.
- #199 the command reference of the manual generated from `--help` and checked by a test (D4), to be done after the skeleton.
- #192 CI: run each job only when the change can affect it. The author accepted the corrected map and the design (`scripts/changes.mjs`, a `Changes` job); the correction of 2026-11-01 puts `CLAUDE.md` with the files that run no job.
- #194 the diagram toolbar of RFC-002, in two runs (A structure, B state). Its decisions DEC-1 to DEC-5 are written in the RFC; the proposals P-1, P-2, P-7 and P-8 are not yet answered.

Nothing in the registers covers this: `docs/` has no `bkg` or `ana` register. The sources are the issues.

## Problems / Opportunities

- A visitor does not see what ArchiCode produces, and an agent has no entry on the page. The manual is one file of about 3,900 lines whose parts are in the order they were written, with draft lines left in the source, filler intros and stale facts (two groups of commands listed out of eight).
- Facts in the command reference are copied by hand, which is why they go stale.
- A change to the manual starts the end-to-end suite (about 9 minutes) that cannot fail for it.
- The diagram toolbar floats over the canvas (13 % of the drawing at 1280 px, 32 % at 360 px), its controls are ungrouped and mix two pressed conventions.

## Options & Recommendation

1. **One wave, three phases: the pages and CI first, the prose and the generated reference second, the toolbar last** (recommended). The skeleton of the manual is a move with no prose change, done once and before anything else edits the file; the prose, the new pages and the generated reference then write into the sorted manual; the toolbar updates two sections of the manual last, when no other run edits it.
2. **The toolbar first.** Rejected: its manual sections move with the skeleton, so it would be edited twice; and the skeleton is the larger risk, so it should fail first and cheaply.
3. **Do the prose before the skeleton.** Rejected by the author's own plan (#193, 2026-11-01): the prose waits for the sorted structure, and a move that carries a rewrite cannot be reviewed as a move.
4. **Leave CI (#192) out for another wave.** Rejected by the author: it is independent, small, and the later runs of this wave are the first to save its minutes.

## Vision

A first-time visitor sees what ArchiCode produces and a way to try it; an agent finds `init`, `guide`, `query graph` and the model of ArchiCode from the page and from `/llms.txt`. The manual is sorted by type of reading, has one page for plateaus, a how-to for CI and one for agents, and a command reference that a test holds to the real `--help`. A pull request that changes only the manual does not run the end-to-end suite. The diagram toolbar is docked, grouped in five, has one pressed convention and a Reset, and its state is told by a dot.
