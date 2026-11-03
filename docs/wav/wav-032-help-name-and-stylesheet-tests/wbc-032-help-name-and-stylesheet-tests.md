---
type: wbc
wave: 032
status: proposed
date: 2026-11-02
related:
  - docs/wav/wav-030-pages-ci-and-toolbar/wav-030-pages-ci-and-toolbar.md
  - docs/wav/wav-031-graph-answers-impact/wav-031-graph-answers-impact.md
---

# Wave 032 — The name in `--help` and tests that read the stylesheet as a stylesheet — Business Case

## Context

Two tickets found while closing wave 030 are `ready` since 2026-11-02, each with the author's decision on the ticket:

- #201 Every `--help` starts with `Usage: <main class>` because the top `@Command` of `cli/ArchiCode.java` has no `name`. The generated command reference of the manual and `CommandReferenceTest` work around it (`setCommandName("archicode")` on a private `CommandLine`, and a sentence of the manual).
- #203 About 55 assertions with a CSS rule pattern and about 40 cuts of the page by position, in 13 test files, match the text of the stylesheet. Formatting `style.css` with Prettier broke 28 of them with no regression behind it; the helper `compactStyle` (`src/test/javascript/viewpoint-kernel/stylesheet-support.js`) keeps them green but they still read text.

The registers do not cover this: `docs/` has no `bkg` or `ana` register. The sources are the two issues. They are not part of wave 031 (the query commands), which this wave follows because #201 edits `src/doc/README.adoc`, a file wave 031 also edits.

## Problems / Opportunities

- A user who types `archicode --help` reads a placeholder where the program's name should be, in the 17 usage texts, and the manual has to say that its listing is not what the program prints.
- A test that passes while another rule overrides the one it matches, and fails when the formatter moves a line, gives no signal: it blocks formatting and proves nothing.

## Options & Recommendation

1. **Two runs, in one phase, side by side** (recommended). The two share no file: one is a line of production code with two cleanups, the other is test code. Each ends in evidence a command can show.
2. **One run for the two tickets.** Rejected: they have nothing in common but their date; a failure of the longer one (about ten tasks) would hold back a one-line fix.
3. **#203 as one run per file.** Rejected: the 13 files share one reader and the removal of `compactStyle` comes last; split by file, the first run could not be finished and evidenced on its own.
4. **Add #24 (the matrix of N plateaus, file first) to this wave.** Rejected: it is a new feature with its own contract and goldens, medium in size; it is another wave.

## Vision

`archicode --help` and every subcommand's `--help` start with `Usage: archicode`, the jar and the native image print the same, and the manual's listing is what the program prints. No unit test matches the stylesheet with a regular expression: each assertion was deleted because an end-to-end spec covers it, or rewritten on a parsed stylesheet, and `compactStyle` is gone.
