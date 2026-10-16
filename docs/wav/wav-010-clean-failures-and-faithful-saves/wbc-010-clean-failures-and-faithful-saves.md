---
type: wbc
wave: 010
status: proposed
date: 2026-10-16
related:
  - docs/wav/wav-009-element-identity-across-plateaus/wav-009-element-identity-across-plateaus.md
  - docs/wav/wav-009-element-identity-across-plateaus/prg-009-element-identity-across-plateaus.md
  - CLAUDE.md
---

# Wave 010 — Clean Failures and Faithful Saves — Business Case

## Context

Waves 008 and 009 added plateaus, the comparison, `replaces` and the move action. Each run filed what it found but did not
fix, and 20 issues are open on tmorin/archicode. They fall in four groups:

- **Defects of what exists today** (small, reproduced): #46 (a facet that removes an element a relationship points at ends in
  a stack trace, also on the release 0.12.0), #38 (an element id with a hyphen makes the PlantUML invalid), #45 (the editor
  drops the quoting style of a line it rewrites), #41 (the editor rewrites a whole file for some flow collections), #35 (every
  `log.warn` is hidden by the log level `ERROR`), #40 (three of the five warnings about a malformed `replaces` never fire from
  the command line), #36 (the editor does not say that a hand-written state word disagrees with the comparison), #42 (the
  `split` state has one line style in the CLI and another in the editor).
- **Extensions of the editor's move** (#43, #44), **features of the CLI** (#25, the rest of #26, #24, #27) and the **later**
  idea (#30): new capability, not a repair.
- **Checks that need someone's real data or a machine** (#29, #33) and **decisions on what to list** (#39).
- **Measured-nothing optimisations or contract changes** (#37, #34).

Nothing in the registers (`docs/bkg`, `docs/ana`) covers this; the sources are the GitHub issues, as for wave 009. Wave 009 is
merged but not released (16 commits after `archicode-0.12.0`), so a look it introduced (the line style of `split`) can still
change without breaking anyone.

## Problems / Opportunities

- A user of the command line meets stack traces and silence: an error prints the exception and its stack, and the warnings
  the application emits are invisible. The messages that wave 009 added (state tags, `replaces`) only reach the user because
  each run found its own way around the log level.
- A generated file can be invalid (#38), and the editor, whose promise is "a line changed, the rest is yours", changes two
  things on a line it rewrites and sometimes rewrites the file (#41, #45). Those are the defects that cost trust on a pull
  request diff.
- The release after wave 009 would carry all of that. Cleaning it before the next feature wave keeps the next one
  from inheriting the same silent failures.

## Options & Recommendation

1. **A hardening wave on the defects only** (recommended): six runs, one per coherent defect or pair of defects, no change to
   the manifest format, byte-identical output for every workspace that does not hit a defect. Small, serial, cheap.
2. **Hardening plus the editor's move extensions (#43, #44)**: the move is fresh in the code, so extending it now is cheaper
   than later. Rejected for this wave: it is new capability with its own design choices (a block cut across two files), and
   it would turn a clean-up into a feature wave. It is the best candidate for wave 011.
3. **A feature wave first (`--baseline-ref` and `--fail-on`, #25)**: it is what a CI user of plateaus asks for. Rejected for
   now: `--fail-on` needs a vocabulary of exit codes, and the commands do not yet have a clean error path (#26) to hang one on;
   doing the repair first is on the road to it.
4. **Wait for a field check (#29, #33) before changing anything**: rejected; those need the author's real pair and a
   machine, and none of the defects above depends on their result.

## Vision

Every failure of the command line prints a message and a non-zero exit code instead of a stack trace, every warning the
application emits reaches the error output, and a facet or a view never produces an invalid file silently. The editor writes
a changed or added line in the quoting style of its file, keeps the file's lines when it holds the flow collections of a
manifest, and says in the Changes panel when a hand-written state word does not match the comparison. The workspaces that hit
none of these defects generate exactly the same files as before.
