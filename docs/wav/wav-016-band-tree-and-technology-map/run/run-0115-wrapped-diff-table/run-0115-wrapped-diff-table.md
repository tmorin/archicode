---
type: run
run: 0115
status: completed
wave: 016
---

# Run 0115: Wrapped diff table

Wave 016 (`band-tree-and-technology-map`), item W-9 (phase P1). Focus: the text table of `archicode diff` can be wrapped to a width, so that a reference of 447 characters no longer makes it unreadable (#26)

Document profile: `single-document` (a small change in one place of the command line; the review passes are answered below).

## Scope

In: the option `--width <columns>` of `archicode diff`; the layout of the text report (`rendering/gap/GapReport`, the new `rendering/gap/TextWrap`, `cli/Width`); the tests (`TextWrapTest`, `DiffWidthTest`, two cases of `PlateauComparisonIT`); `reflect-config.json` (the two new classes, `NativeReflectionConfigTest` asks for them); `CLAUDE.md` (one sentence where `diff` is described).

Out: the manual (W-12's: the lines are in the findings), the Markdown and JSON formats, the editor.

## What was found before any change

- The text report is `GapReport.text`: a header of counts, the table (six columns, the last one not padded), then the candidates and the cascade of the removals, each a table of its own, written by three copies of one loop. Every column is as wide as its longest cell, so a reference of 447 characters is the width of the table.
- `views generate` writes `gap.md` and `gap.json` only (Markdown and JSON, which the issue says work and which the task leaves untouched). It prints no text table, so there is nothing for a width to wrap there.
- `FailOn` is the model for an option checked before anything is loaded (`ArchiCodeException`, one `error:` line, exit 1).

## Decisions

- **D1. The option is `diff`'s alone.** The brief asks for `--width` "on `diff` and `views generate`". `views generate` writes the Markdown and the JSON table only, never the text one, and both are untouched by this run, so an option there would be accepted and change nothing: a width that does nothing is a trap, not a feature. Left out; reported to the orchestrator (W-12: the manual says `diff --width`, not `views generate`).
- **D2. The value is read as text.** picocli would answer a value that is not a number with its usage error (exit 2); the task asks for one `error:` line, exit 1, before anything is loaded. `Width.parse` (like `FailOn.parse`, called before the workspace is read): a whole number above zero, else ``` `--width` must be a whole number of columns above zero, for example 100: `x` is not ```.
- **D3. No option, no change.** `GapReport.render` keeps its four-argument form, which is the new five-argument form with `NO_WIDTH` (0); `TextWrap.table` with no width is the loop that was written three times, and a table that is not wider than the width is written the same way (so a width as wide as the table is a no-op, tested).
- **D4. What wraps.** A cell wraps at its spaces. A word with no space is cut after a dot, a slash or a comma (a reference; the natures of a row are joined by commas), as many segments to a line as fit; a segment that is still longer is cut after a hyphen or an underscore (the identifiers: the brief said "then hard", which comes last; without the hyphens an identifier of 80 characters is cut at random places and is unreadable); then where the line ends. Nothing is lost: joined, the lines are the cell.
- **D5. How the width is shared.** The change, the thing and the layer are short and must not wrap before a reference does: each column keeps at least its heading (`REFERENCE` is not cut), then the columns that are narrower grow first, up to their longest cell, one character at a time. If even the headings do not fit (under about 50 columns for the main table), the lines are longer than the width and nothing is cut off. Rows are not separated: a row is as many lines as its tallest cell, the first column says where the next one begins.
- **D6. The sentences wrap too.** The counts, the `of a split` line, the `--no-wording` line and the two sentences above the candidates and the cascade are longer than 80 columns; a reader who asks for 80 columns wants them at 80. They wrap at the spaces, the values of the labelled lines under themselves (14 columns). The lines of the counts (`elements +1 ~1 -1`) are short and never wrap.
- **D7. No kernel, no editor, no manual.** Nothing here is read by the editor; the Java is the only place.

## Tasks

- [x] T1. Read the issue, the plan, `GapReport`, `DiffCommand`, `FailOn`, `GenerateViewsCommand`, the tests of `diff`.
- [x] T2. `TextWrap` (`wrap`, `cut`, `table`, `prose`, `labelled`), `GapReport.text` on it, `Width`, the option of `DiffCommand`, `reflect-config.json`.
- [x] T3. `TextWrapTest` (words, segments, tables), `DiffWidthTest` (an invented pair with references of two hundred characters, exact table at 120 columns, widths 100 to 40, nothing lost in the reference column, markdown and JSON unchanged, `--fail-on` together, seven bad widths), two cases of `PlateauComparisonIT` (the packaged jar).
- [x] T4. Byte-identity against the jar of `archicode-0.14.0`.
- [x] T5. `CLAUDE.md`, review pass, gate, this document, one commit.

## Canonical impact

None to the model, the kernel or the two tools' shared contracts: one option of one command and the layout of one output format of that command. `CLAUDE.md` says it where `diff` is described.

## Shipped files

None: the pair of plateaus of `DiffWidthTest` is written into a temporary folder by the test (the manifests are loaded by the command line in the same test), and no example or fixture is added. The two new classes are in `reflect-config.json`.

## Review pass, answered

A `general-purpose` sub-agent at the standard tier (Sonnet, medium), read-only, given the diff and the requirements and not my conclusions. No S1, no S2. Answers:

- Unwrapped output byte-identical, markdown and JSON untouched, the error before the load, the rule of the cuts, no loop and no exception at width 1: nothing found.
- S3, a wrapped sentence could end with a space (two spaces in the text at a wrap): fixed (`stripTrailing` on the wrapped lines of `prose` and `labelled`).
- S3, `Integer.parseInt` accepts `+5`: kept (`+5` is five).
- S3, the labelled lines are longer than a width under 24: kept (the same rule as the headings: nothing is cut off, 10 columns for the value).
- S3, the case `-5` of the error test relies on picocli taking `-5` as the value of the option: it did (the test passes).

KDMLLC read and C scan, mine: the brief says "on `diff` and `views generate`" and "cut at the dots and the slashes, then hard"; D1 and D4 say where the code differs and why. The brief says `markdown` and `json` untouched: the five-argument `render` gives them no width. The brief says the error is raised "before anything is loaded": `Width.parse` runs before `WorkspaceFactory`, and the test points `-w` at a file that does not exist so that a late check would say something else.

## Verification

Run by me on the tree as committed (JDK 25, `PLANTUML_JAR` set, so no test is skipped):

| Command | Result |
|---|---|
| `./mvnw -o verify -DskipITs=false` | BUILD SUCCESS: 897 unit tests, 0 failures, 0 errors, 0 skipped; 20 integration tests, 0 failures (880 and 18 before the run in the wave's previous run) |
| `npx prettier --check "src/**/*.java"` | clean |

The node and cargo suites were not run: nothing they cover was touched.

Byte-identity (a copy of each workspace for each jar, the same commands, the standard output, the exit code and the files of the two folders compared, the standard error compared as a set of lines): the jar of the tag `archicode-0.14.0` against the jar of this tree, on the eleven examples of `src/doc/examples` and the nine fixtures of `src/test/resources` that have a `workspace.yaml`, with no `--width`: `views generate`; `diff` in the three formats (text, markdown, json) with and without `--no-wording`; for every plateau of the workspace `diff --plateau` and, in the three formats, `diff --plateau --against` every other plateau (also with `--fail-on any`: same table, same exit code); `views generate --plateau` for each plateau, on the seventeen first workspaces. **Every output and every file identical**, 656 comparisons. For the three last workspaces (`replaces-large-pair`, `split-relationships`, `viewpoint-kernel/workspace`) `views generate --plateau` for each plateau was left out of the second pass (a run of the 360-change pair takes minutes, and what `views generate` writes of the table, `gap.md` and `gap.json`, is covered by the default `views generate` and by the Markdown and JSON `diff`). The jar compared was built before the last two edits (the cut after hyphens and the end-of-line strip of the wrapped sentences), which are on the wrapped paths only; the text of `diff` without `--width` is the same loop, tested by `DiffWidthTest.aWidthAsWideAsTheTableChangesNothing` and `TextWrapTest.aTableThatFitsIsWrittenAsItAlwaysWas`.

Fail before, pass after: `DiffWidthTest` and `TextWrapTest` cannot pass without the option (`--width` is an unknown option, exit 2); `NativeReflectionConfigTest` failed once on the two new classes and passes with their entries.

## Not verified

- The native image (the integration tests ran on the JVM jar). `TextWrap` and `Width` are plain classes; both are in `reflect-config.json` like their neighbours.
- A real workspace with a 447-character reference (none is shipped): the invented pair has references of 210 characters, the rule is the same.
- `tooling/docs/check-backlog.py` and the `docs/bkg/` close-out sweep: neither exists in this repository.

## Findings

- **F1 (W-12, the manual, `src/doc/README.adoc`).** Where the text table of `diff` is described and where `less -S` is advised (the issue says the manual does): `diff --width <columns>` wraps the text table (cells at their spaces, references after their dots, slashes and commas, then their hyphens, then where the line ends; the columns share the width; the sentences wrap too); a width that is not a whole number above zero is one `error:` line; `markdown` and `json` are not wrapped; the option is `diff`'s, not `views generate`'s (which writes Markdown and JSON only). `[[plateau-limits]]` may drop `less -S` if it names it.
- **F2.** Under about 50 columns the headings of the main table do not fit and the lines are longer than the width; the cells still wrap at their column. Nothing is cut off. If a real use asks for 40 columns, the next step is a layout with one row per block (key: value lines), not a narrower table.
- **F3.** `views generate` could write a `gap.txt` (the text table) next to `gap.md` and `gap.json`; then `--width` would have something to wrap there. Not asked, not done.
- **F4.** The commit says `Refs #26`; the issue closes with the wave's pull request.
