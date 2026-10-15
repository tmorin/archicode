---
type: run
run: 0044
status: completed
wave: 009
---

# Run 0044: Replaces in the CLI

Wave 009 (`element-identity-across-plateaus`), item W-3 (phase P2). Focus: read in the table of changes and in the views that an
element moved, split or merged, and see the candidates. Document profile: `single-document`, as runs 0042 and 0043 and the runs of
wave 008: the scope arrives settled (the W-3 row and D-1 to D-3 of the wave plan, issue tmorin/archicode#22, the interface that run 0042
left), the work is one report, one look and the plumbing of a warning channel that exists, and there was no live alternative worth a
PRD, a TDD or a pln. This file carries scope, decisions, canonical impact, verification and findings. The review passes were run inline
(no subagent), see "Review passes". Run 0045 (the comparison cache of the editor) ran at the same time in the same working tree, on
`standalone.html` and the JS tests only; nothing of it is in this commit.

## Context

Run 0042 put `replaces` in the kernel: the comparison answers `moved`, `split` and `merged` rows, `candidates` and `warnings`. The
CLI printed the three words as it printed any change, with no identity, no candidates, no warnings, and a placeholder look in
`ChangeMarks` (the state word and the `±` glyph of `contains-changes`). Run 0043 built the channel for warnings that the user sees
(`StateTagReport`, picocli's `getErr()`), because the log level `ERROR` of the application hides `log.warn` (issue #35).

## Scope

In: `diff` (text, Markdown, JSON), `gap.md` and `gap.json` tell where a moved, split or merged element comes from, count them, and list
the candidates as not applied; the warnings of the comparison on the error output of `diff` and `views generate --baseline`; the three
states in the views with a real look, told apart from the other four, and where the element came from; the manual; tests. Out: the
editor (W-5, W-6; `standalone.html` is run 0045's), the example `domain_plateaus` (W-7), the CLAUDE.md paragraph (W-7), the kernel
(no change: the wasm is the one of run 0042), a single channel for all the warnings (#35).

## Decisions

Taken by the wave (not reopened): D-1, D-2, D-3.

Taken by this run:

- **R1. The identity is in the DETAILS column, and the REFERENCE stays the element's own.** The text and Markdown rows begin their
  details with `from <what it replaces>` (several references joined by `, ` for a merge), then the name, then what differs from the
  replaced element (`name: "Till" -> "Cash desk"`, from the row's `before`/`after`), then, for a split, `split with <the other halves>`
  (computed from the other rows of the same layer that replace one of the same references). JSON rows have `replaces`
  (sorted, as the kernel gives them) between `wording_only` and `before`. Rejected: `from -> to` in the REFERENCE column: the table is
  sorted by the reference of the element (the kernel's order, which the editor lists too), and a column that begins with what it
  replaces would look unsorted exactly where the author reads it; a new column: it changes the header, hence the bytes, of every
  table. The relationships rows already use `a -> b` in that column. A moved element that has changes of its own keeps its natures
  and its `before`/`after` next to `moved` (E2 of run 0042); a name is added to the details only when it is not in the diff.
- **R2. Counts.** The kernel writes `moved`, `split`, `merged` in the counts only when not zero; the report does the same: a line
  `replacing     1 moved, 2 split, 1 merged` right after `elements` in the text, `Replacing elements: ...` after the table of counts in
  Markdown, `moved`/`split`/`merged` after `wording_only` in `counts.elements` in JSON. They are counted apart from `new`, `changed`,
  `removed` (the kernel's rule), and the replaced elements have no row and no count. `--no-wording` is unchanged: it filters the
  wording-only rows and says how many; the identity rows and the candidates are never wording only, so it leaves them alone (a test).
- **R3. Candidates.** After the table: `candidates, not applied (each pair looks like one thing said twice; to accept one, write
  `replaces: [FROM]` on the element TO)` and a table `LAYER FROM TO REASONS` (text); `## Candidates, not applied` and a table
  (Markdown); `candidates: [{layer, from, to, reasons, applied: false}]` (JSON). The kernel's order (sorted) is kept. Nothing is applied:
  the postman of the fixture is still new, the mailer still removed (a test).
- **R4. The candidates are listed only for a plateau that uses `replaces`** (`GapReport.listsCandidates`: there are candidates and an
  element is moved, split or merged, or the comparison warned about a `replaces`). This is the judgement of the run on a conflict
  inside the brief. The first version listed them always; the check of byte-identity then showed that the manual's example
  `domain_plateaus` (no `replaces`) gets a candidate (`shop.mailer` -> `shop.payments`, reason `parent`: the lone-siblings rule of run
  0042) and so a new section in all of its `diff` formats and in its `gap.md`/`gap.json`, which breaks the hard requirement and the wave's
  promise "a workspace without `replaces` generates exactly the same files". The scope also asks for the section. The two cannot both
  hold for such a workspace. Kept: byte-identity, the section for every plateau that has begun to say what replaces what. The cost: an
  author who never wrote `replaces` does not learn from the CLI that a candidate exists. Filed as issue #39, with the switch (one
  method). The manual says it (a test pins the sample of the manual).
- **R5. The warnings.** `StateTagReport.replaces` puts `warning: ` in front of each sentence of `Comparison.getWarnings()` and `DiffCommand`
  and `GenerateViewsCommand` (with a baseline) print them with `StateTagReport.print` before the warnings of the state tags: on the
  error output of the command, the standard output being what it was. The sentences are the kernel's (no rewording: they name the
  replacing element and its layer). A test reads the error output of the real command line (picocli), for `diff` in the three
  formats and for `views generate --baseline`, and the standard output holds no warning. `views generate` without a baseline compares
  nothing and says nothing. From Java only the unknown reference and the reference still in the target can be written: the model reads
  a `Set<String>` (duplicates dropped, `12` becomes `"12"`), so the kernel's duplicate and malformed warnings do not fire (issue #40).
- **R6. The look.** Checked on a hand-written `.puml` and on the views the CLI writes for the warehouse, rendered to PNG and looked at
  with `plantuml-1.2024.7.jar` (the jar of another project on the machine, read only, as run 0038): moved: `→` (U+2192), long dashes
  (`LineStyle: 12`), blue `#0072B2`; split: `⋔` (U+22D4), medium dashes (`6`), purple `#CC79A7`; merged: `⊕` (U+2295), short dashes
  (`5`), light blue `#56B4E9`; thickness 2 for the three, the fill left to the author, as for `new` and `changed`. Each has a line
  style and a thickness that no other state has (a test asserts that the seven states are pairwise different in glyph and in line
  style/thickness), and a glyph and a `(from ...)` in the title, so the meaning does not rest on colour; the colours are the
  Okabe-Ito ones, as wave 008's. The author's `styles.by-tags`/`by-qualifiers` entry of the name wins property by property, through
  the same code as for `new` (`PlantumlUtilities.stereotypeStyles`; a test). The computed state is last in the stereotypes, as
  `new`; a hand-written `moved` on a box that is not moved is `written-moved` (run 0043's rule, which `ChangeMarks.STATES` already
  carried). The glyphs are PlantUML escapes (`<U+2192>`, `<U+22D4>`, `<U+2295>`): the files stay ASCII. Rejected: the same dashes
  for the three (the legend would then rest on the glyph alone; they cost nothing to tell apart); a fill tint (would override the
  author's fill, as wave 008 refused for `new`).
- **R7. Where it came from, in the view.** The title of an element that replaces others ends with `(from shop.till)` /
  `(from stock.bin, stock.shelf)`, and the title of a replaced element that a view still draws as the place of what was removed from
  it (E5 of run 0042) ends with `(replaced by shop.report-a, shop.report-b)`, after the struck name. It is the existing label mechanism
  (the title of the box, through the formatter `%s`), so the file of a view without any identity is the same bytes. `Item` gains
  `replaces` and `replacedBy` (empty by default), filled by `KernelViewpointFactory` from the comparison (the answer of `compute` does
  not carry them): only for the layer being drawn and for the applications deployed on a node. Rejected: putting it in the
  description lines (a description is optional and the formatter of each shape differs), a tooltip or a link (PlantUML output
  here has none).
- **R8. The legend.** The three rows (`moved or renamed, replaces one element: long dashes`, `split, one of several that replace one
  element: medium dashes`, `merged, replaces several elements: short dashes`) are in the legend only when the view uses the state, so
  the legend of every other view is what it was.
- **R9. The manual.** A section `plateau-replaces` in the story of plateaus ("Saying what an element replaces": the key, D-1 to D-3, the
  three states, what is not carried, candidates, warnings), the table of the marks in "Comparing two plateaus" and in "The states",
  the `diff` section (a sample taken from the fixture's output, pinned by a test) and the `--baseline` item of `views generate`. The
  example `domain_plateaus` is not touched (W-7); the sample is the invented warehouse. The editor does not draw the three states
  yet, and the manual says so in one sentence that W-5 removes.

## Canonical impact

`src/doc/README.adoc`: updated (R9). `CLAUDE.md`: not edited (W-7 owns the architecture paragraph; it may say that `Item` carries
`replaces`/`replacedBy`, that the CLI prints the warnings of the comparison on the error output, and that the candidates are listed
only for a plateau that uses `replaces`). The kernel and its README: untouched (the wasm is the one of run 0042). No other canonical
document.

## Tasks

| Id | Task | Status |
|----|------|--------|
| T1 | Read the wave, runs 0042/0043, wave 008's CLI runs, `GapReport`, `ChangeMarks`, the commands and the manual | done |
| T2 | Build a jar from `git archive` of 07e3429, before any change, for the byte-identity check | done |
| T3 | `GapReport`: identity in the details, counts, candidates, JSON keys | done |
| T4 | Warnings of the comparison through `StateTagReport` for `diff` and `views generate --baseline` | done |
| T5 | `Item.replaces/replacedBy`, `KernelViewpointFactory`, `ChangeMarks` (glyphs, looks, titles, legend), `ItemRenderer` | done |
| T6 | Look checked on a hand-written file and on the generated views of the warehouse, rendered and looked at | done |
| T7 | Fixture (the till is renamed on its way), Java tests: report, warnings, views, gap files, `ChangeMarks`, the manual's sample | done |
| T8 | Byte-identity against the jar of 07e3429; the conflict of the candidates found, R4 | done |
| T9 | Manual | done |
| T10 | Full suites, prettier, cargo, embed check | done |

## Acceptance criteria (the W-3 row)

- AC1. The table tells moved, split and merged with their identity, sorted: `diffTellsWhatMovedWasSplitAndMergedAndWhereItCameFromInASortedTable`
  (the exact text), `markdownTellsTheIdentity...`, `jsonHasTheIdentityOfEachRow...`; the replaced are not removed (the same tests, and
  `PlateauComparerTest`).
- AC2. The candidates are listed, marked not applied, never applied: the same three tests (the mailer is still removed and the postman still new),
  `theGapFilesNextToTheViewsTellTheSameAsTheTableAndTheCandidates`.
- AC3. `--no-wording` still behaves: `noWordingLeavesTheIdentityAndTheCandidatesAlone`, the existing `noWordingHides...`.
- AC4. The warnings are seen: `theWarningsOfTheComparisonAreOnTheErrorOutputOfDiff...` (three formats) and `...OfViewsGenerateWithABaselineAndOnlyThere`,
  `everyReplacesTheComparisonIgnoresIsToldWithTheElementThatSaidIt` (two sentences, in order), through the real picocli command line.
- AC5. The views draw the three states and not by colour alone: `theViewsOfTheComparisonDrawTheThreeStatesWithAGlyphAndTheirOwnLine`,
  `ChangeMarksTest` (`anElementThatReplacesOthersHasItsOwnGlyph...`, `theThreeIdentityStatesAreToldApart...`,
  `theAuthorsStyleOfAnIdentityStateWins...`, `theLegendListsTheStatesOfIdentityTheViewUsesAndOnlyThose`).
- AC6. A workspace without `replaces` generates the same bytes: the byte-identity check (Verification) and
  `aPlateauThatDoesNotUseReplacesIsToldAsItAlwaysWasEvenWhenTheKernelFindsACandidate` (the manual's example, three formats, no error output).
- AC7. The manual: R9, and `theManualShowsWhatTheCommandPrintsOnTheWarehouse`.

## Review passes

Run inline (one document; no subagent dispatched, as in the runs before).

- **KDMLLC.** K: the report gained one helper per new thing (`replacing`, `listsCandidates`, the candidates of each format); the look is three
  arms in the switches that already existed; no new class, no new option. D: the identity words are the kernel's and parsed once
  (`Change.of`); the lookup of what an element replaces is one method (`KernelViewpointFactory.identities`); the sample of the manual
  and the test share the text. M: each output (text, Markdown, JSON, gap files, `.puml`, legend, error output) has a test; the three
  states each have a glyph, a look and a legend row. L: no new flag, no column, no editor, no kernel. U: the Javadoc of `GapReport` and
  `ChangeMarks` say the rules; the manual says them to the author. C: below.
- **C scan.** Claim of the brief, "a workspace without `replaces` generates byte-identical files for every command": true after R4, false
  before it (measured: six outputs of `domain_plateaus` gained a candidates section). Claim of the manual before this run, "an element that
  moves under another parent is a removed one and a new one": still true without `replaces`, now qualified. Claim of run 0042, "the CLI
  does not print the candidates yet": no longer true, now printed. Claim "the tables are sorted": the kernel sorts the rows by (thing,
  layer, reference of the element) and `GapReport` keeps that order; the identity is in the details so the order is visibly the one of
  the REFERENCE column. Claim of run 0042's findings, "`GapReport` prints `row.change().word()`": kept. Claim in the manual that the
  warnings cover a duplicate and a malformed entry: true of the kernel, false from the CLI (R5, issue #40); the manual lists the five cases
  as what "the comparison" ignores, which is the kernel's truth; the two that cannot be written through a manifest are not hidden in the
  findings below. Claim "the legend of a view with no identity is unchanged": proven by the byte-identity run (1,811 `.puml` files
  identical).
- **Open questions.** One left, as an issue: whether to list the candidates for a plateau that does not use `replaces` (#39).

## Verification

All with the repository's own commands. `JAVA_HOME=/home/tibo/.sdkman/candidates/java/25.0.4-tem` for Maven.

### Results

- `./mvnw -o -q verify` with JDK 25: exit 0; 273 tests in the surefire reports (259 before this run's), 0 failures, 0 errors, 0 skipped
  (integration tests are skipped by default). The first runs failed on three of my own tests (a helper that copied the fixture twice, a
  legend assertion that matched "removed" for "moved", fixed); there was no `NativeReflectionConfigTest` miss (no new class).
- `src/main/rust/viewpoint-kernel/embed.sh --check`: "the committed WebAssembly is the one the sources build (651048 bytes)", exit 0.
- `cargo test --manifest-path src/main/rust/viewpoint-kernel/Cargo.toml`: 160 passed, 0 failed.
- `node --test "src/test/javascript/**/*.test.js"` (read only): 778 tests, 778 pass, 0 fail (run 0045 had already committed its
  files, 7aad144). `expected-counts.json` is unchanged and still read by `PlateauComparisonTest` and `cli-editor-counts.test.js`.
- `npx prettier --check "src/**/*.java"`: clean (the new tests were formatted with `--write` first).
- **Byte-identity (hard requirement 1).** A jar built from a `git archive` of 07e3429 (before any change) against the jar of this run, on
  every workspace of `src/doc/examples` and `src/test/resources` (12 workspaces; the warehouse of `replaces` excluded: only the new jar
  understands it), 51 commands: `views generate`; and for the three workspaces with plateaus (`domain_plateaus`, `plateau-comparison`,
  `plateau-state-tags`) each plateau with `views generate --plateau`, `--baseline` the first plateau on each of the others, and `diff
  --plateau` in text, JSON, Markdown and `--no-wording`. Result: the output folders (1,811 `.puml`, 12 `gap.md`/`gap.json`), the standard output,
  the error output and the exit code of the 51 commands are identical (`diff -r`, no difference; 12 `diff` runs exit 1 in both: the first
  plateau has no baseline). The first version of the run, which listed the candidates always, differed on six outputs of
  `domain_plateaus` (the four formats of `diff --plateau to-be` and `gap.md`/`gap.json` of its comparison, each only a new candidates
  section): that is R4. The script is in the scratchpad, not committed.
- The look was rendered with `plantuml-1.2024.7.jar` (`/home/tibo/git-perso/plantuml-libs/.workdir/.cache/`, read only) on a hand-written file with the
  seven states and on the generated `shop-detailed` and `stock-detailed` of the warehouse (ids with a hyphen replaced by hand: see
  Findings) and looked at: the three outlines differ from each other and from the four others, the glyphs draw, the titles read
  `→ Cash desk (from shop.till)`, `⊕ Place (from stock.bin, stock.shelf)`, `− Report (replaced by ...)`, the legend lists only the
  states the view uses.
- Not run: `-Dnative`, `failsafe` integration tests, a real browser.

## Findings

- **For the wave (W-5 to W-7).**
  - *The editor does not know the three states.* `CHANGE_STATES` has three words; the manual says "the editor does not draw these three
    states yet" in one sentence (the section `plateau-replaces`): W-5 removes it. The look the editor should mirror is `ChangeMarks`
    (glyphs `→`, `⋔`, `⊕`; dashes long, medium, short; blue, purple, light blue; thickness 2; `(from ...)`/`(replaced by ...)` after
    the title; the legend rows only for the states in the drawing).
  - *Candidates are listed by the CLI only for a plateau that uses `replaces`* (R4, #39). The editor's panel (W-5) will show them in all
    cases unless that is decided otherwise: the two should say the same, whatever #39 decides.
  - *W-7's extension of `domain_plateaus`* will turn on the candidates for that example (it will have `replaces`): the sample of the
    manual's `diff` section for it must then be regenerated, and its candidate (`shop.mailer` -> `shop.payments`, `parent`) is a
    weak one that the author may want to resolve with a `replaces` or not.
  - *`CLAUDE.md`* (W-7): the CLI prints the comparison's warnings on the error output through `StateTagReport`; `Item` carries
    `replaces`/`replacedBy`; the views draw the three states.
  - *Element ids with a hyphen produce invalid PlantUML* (rendered with 1.2024.7, in the plain views too, so older than this run); the
    invented warehouse has `report-a` and `report-b`, and its views cannot be rendered as generated. Issue #38. The fixtures stay as
    they are (their ids are read by `PlateauComparerTest`); W-7 must not use hyphens in the ids of the example it will render.
- **Issues filed:** tmorin/archicode#38 (a hyphen in an element id), #39 (candidates for a plateau that does not use `replaces`), #40 (a duplicate or
  malformed `replaces` never reaches the warnings).
- **Files touched outside `likely_paths`:** `src/main/java/io/morin/archicode/viewpoint/Item.java` and
  `src/main/java/io/morin/archicode/viewpoint/kernel/KernelViewpointFactory.java` (the item must carry what it replaces: the answer of
  `compute` does not), and `docs/wav/wav-009-element-identity-across-plateaus/run/run-0044-replaces-cli/` (this file). Inside:
  `GapReport` (rendering/gap), `ChangeMarks` and `ItemRenderer` (rendering/plantuml), `DiffCommand`, `GenerateViewsCommand`,
  `StateTagReport` (cli).
- **Not verified.**
  - The views rendered by the PlantUML of the application's users: only 1.2024.7 was used, on two views and a hand-written file; the
    glyphs `⋔` and `⊕` depend on a font that has them (they drew with the fonts of this machine). A machine whose fonts lack them shows
    a box; the `(from ...)`, the line style and the legend say the same.
  - The look on a very large view (a long `(from ...)` on a merge of many elements lengthens the title; PlantUML wraps at
    `wrapWidth`).
  - The facets on a comparison with identity (`change` takes seven words now; a facet that selects on `change` was not exercised on
    `moved`).
  - The warnings in a native binary (picocli's error output is covered by the tests of the JVM only), the native image, the failsafe
    integration tests, a real browser.
  - The candidates on a real pair (#33; no real workspace was read).
  - The editor on the same workspace: nothing in it was changed or exercised by this run.
