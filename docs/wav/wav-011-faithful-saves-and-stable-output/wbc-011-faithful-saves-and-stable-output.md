---
type: wbc
wave: 011
status: proposed
date: 2026-10-16
related:
  - docs/wav/wav-010-clean-failures-and-faithful-saves/wav-010-clean-failures-and-faithful-saves.md
  - docs/wav/wav-010-clean-failures-and-faithful-saves/prg-010-clean-failures-and-faithful-saves.md
  - CLAUDE.md
---

# Wave 011 — Faithful Saves and Stable Output — Business Case

## Context

Wave 010 is completed and left 17 issues open on tmorin/archicode. On 2026-10-16 the author went through them and ruled on
each (the rulings are commented on the issues). This wave carries out the rulings that ask for work:

- **The editor's save** (#50, #52, #53, #54): a comment at the end of a rewritten line is lost, a comment or blank line above a
  rewritten line ends up below it, a YAML 1.1 boolean word (`yes`, `on`...) makes the save rewrite the whole file, and a flow
  collection that an edit changes loses the comments inside its brackets, the quotes of its keys and the words of its
  booleans. Ruled: the four together, in one run.
- **The output of the command line** (#48, #49): `query views` lists the views in an order that depends on the identity hash
  of an enum, and `query schemas` moves the properties of an object about one run in twenty. Ruled: a dedicated run that sorts
  both, announced as a change of output. #55 (the dashes of `removed`, `split` and `merged` are 7-7, 6-6 and 5-5) ruled: in
  the same release, so the generated views change once.
- **Two checks that wave 010 left to later** (#33, #29). #33: the thresholds of the candidates of `replaces` are checked on
  a large invented pair of plateaus kept in the repository, not on a real workspace. #29: a native image build joins the CI,
  and what only a person can check becomes a list to tick.

Ruled and left alone: #39 (the rule for listing candidates stays), #34 (waits for the next change of the kernel contract).
No ruling yet: #43, #44, #27, #37; not planned for now: #24, #25, #26, #30. Nothing in the registers (`docs/bkg`, `docs/ana`)
covers this; the sources are the GitHub issues, as for waves 009 and 010.

The rulings were first recorded as "nothing to prepare, note them in the issues"; they were noted, and the author then asked
for this wave to be written and completed.

## Problems / Opportunities

- The editor's promise is "a line changed, the rest is yours". Four cases break it with a loss that shows in a pull request:
  a comment gone, a comment moved under the line it explains, a whole file rewritten. Of these, #52 and #53 change a file in a
  way nobody asked for.
- A script that diffs or stores the output of `query views` or `query schemas` sees noise between two builds, and #55 makes
  three states of a comparison hard to tell apart by line alone. All three change generated output once; doing them in one
  release spends that cost once.
- The thresholds of the candidates and the native image have only been exercised on invented data and on the JVM. A check kept
  in the repository, and a CI job, stop depending on one person's memory.

## Options & Recommendation

1. **One wave of five runs: the editor's save, the sorted output, the dashes, the candidates check, the native CI job**
   (recommended). Each run has its own exit evidence; the three runs whose output changes are in the first phase so that one
   release can carry them; the two checks follow.
2. **Group #48, #49 and #55 into one run** ("everything that changes generated output once"). Rejected: the sorts touch the
   `query` commands and the dashes touch the PlantUML styles, the editor's patterns and two manual tables. The exit evidence is
   different (an order versus a line style) and a failure of one would hold back the other.
3. **Split the editor's save into one run per issue.** Rejected by the ruling (one run), and the four are the same function,
   `patchYamlLines`, so four runs would edit it in turn and rebase on each other.
4. **Leave #33 and #29 out and ship only the three fixes.** Rejected: both rulings ask for work and neither touches the same
   files as the fixes, so they cost little next to them.

## Vision

The editor saves a manifest keeping every comment, blank line, quote and boolean word of the lines it does not intend to
change, and the comment of the line it does change. `archicode query views` and `archicode query schemas` give the same
output on every run and every build. In a comparison, `removed`, `split` and `merged` are told apart by their line alone, in
the generated views and in the editor, and the key of both says it. The candidates of `replaces` have been run against a large
invented pair with known answers, and a native image is built by the CI.
