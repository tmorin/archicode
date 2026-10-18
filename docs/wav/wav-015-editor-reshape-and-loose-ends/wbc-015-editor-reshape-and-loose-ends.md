---
type: wbc
wave: 015
status: proposed
date: 2026-10-18
related:
  - docs/wav/wav-014-layered-plateaus/wav-014-layered-plateaus.md
  - docs/wav/wav-014-layered-plateaus/prg-014-layered-plateaus.md
  - docs/fixtures/brightcart-spec.md
  - CLAUDE.md
---

# Wave 015 — Editor Reshape and Loose Ends — Business Case

## Context

Wave 014 made a plateau a layer and built the editor around a band of plateaus. The author saw the editor on 2026-10-18 and asked for it to be reshaped:
the band only in the Timeline perspective, read-only and lean (#98); the page `Timeline` renamed `Plateaus`, with `Applications` as the default page of the
perspective (#99); the page `Files` listing every file grouped by plateau, without the choice of a scope (#101); the page `Environments` as a Map like
`Applications`, on the technology layer (#92); and the life cycle of a story not tied to a plateau (#100), a decision that the author extended to views after
a challenge (a step of a story may carry an optional plateau and an optional comparison, designed with #24; a `plateau:` on a story or a view becomes a
warning; #86 closes with #100).

The same day, wave 014 closed with a list of things it chose not to do or could not do, all filed as issues on tmorin/archicode: TOML manifests that cannot
be loaded (#84), the root kinds `container-group`, `solution-group` and `system-group` that the command line refuses and the editor offers (#79), the
differences that remain between the editor and the command line (#80, #85), the checks of a layer that are written twice (#90) and the nesting rule that
only a patched layer enforces (#87), the states of a comparison still worked out outside the kernel (#96), the quiet references that cost one kernel call
per element (#81), the unreachable *Move and write replaces* (#97), the facets whose order depends on an identity hash (#83), and the generated folders that
other commands read as manifests (#88). The code review of wave 014 added five findings (#102). Older issues wait too: the Move of an element to another
file or to the top level (#43, #44), deleting a plateau (#93), reading a long list of changes (#27), the polish of `diff` and `views generate` (#26),
failing a build on a change (#25), the native checks as integration tests (#62), an address typed while the editor is open (#91).

The author asked, on 2026-10-18, for this wave to include as many of them as can be done, in the same branch and the same pull request as wave 014 (PR 63),
and to take the earlier comments into account (they are in the issues, and in the plan as decisions).

Nothing in the registers (`docs/bkg`, `docs/ana`) exists to read. The sources are the GitHub issues named above.

## Problems / Opportunities

- The editor of wave 014 shows too much at once: a band that edits, a page `Timeline` that is the default although the first wish is the Map, a Files page with
  a scope choice that hides files, stories and views that a plateau can hold although nobody uses it (no shipped story has a `plateau:`), and no Map of the
  technology layer.
- The two tools still disagree on forms of input that the author can write: a `null`, an empty `workspace.yaml`, `yes` for a text, a kind that is a number.
  Some of them make the command line crash with a stack trace, against the rule that a failure the author can act on is one `error:` line.
- A format the command line says it reads (TOML) does not load, and two kinds the editor offers (`*-group`) are refused by the command line. Both are found
  by a test that nobody wrote, the very thing the convention "every shipped form is loaded by both tools" is meant to prevent.
- Several rules are written twice (the checks of a layer, the states of a comparison) and nothing keeps the copies equal.

## Options & Recommendation

1. **One wave, three phases, in the same PR** (recommended). P0: the loose ends of the command line, the kernel and the readers (no page change), so that
   the editor is reshaped on a reader that agrees with the command line. P1: the reshape of the editor, in the order the pages depend on each other (pages and
   addresses, the band, Files, the Map of the technology layer, stories and views untied, steps with a plateau, deleting a plateau, reading the changes, the
   Move). P2: the manual and a native-check run. The author asked for one PR; the build stays green between runs.
2. **Two waves: the editor reshape, then the loose ends.** Rejected: the reshape would be built on the readers that still disagree (the same files are
   edited by both: `standalone.html`, `negative-cases.json`), and the author asked for everything in one go.
3. **The reshape only, the issues later.** Rejected by the author, who asked for as many issues as can be done.

What is left out on purpose is in the plan (Non-Goals): `plateau merge` (#65) waits for a decision on composing `replaces` (#89); `--baseline-ref` (#25),
the matrix of N plateaus (#24, first half) and a wrapped table (#26) need a design the issues do not give; #94, #89 and #78 stay documented limits.

## Vision

The editor opens on the Map of the applications, with a lean band on the pages of the Timeline and none elsewhere; the page Plateaus is where a plateau is
made, edited and deleted; Files shows everything, grouped by plateau; Environments is a Map; stories and views exist whatever plateau is drawn, and a step
of a story can say which plateau it is told at and what it is compared with. The editor and the command line read the same files the same way, say the same
sentence for the same fault, and neither crashes. TOML manifests load, the kinds that do not exist are gone, the rules that were written twice are written
once with the cases both tools run, and the manual and the tutorial describe the result.
