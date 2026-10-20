---
type: run
run: 0118
status: completed
wave: 016
---

# Run 0118: Manual and tutorial 016

Wave 016 (`band-tree-and-technology-map`), item W-12 (phase P2, the last run of the wave). Focus: the manual, the tutorial and `CLAUDE.md` say what the editor and the command line do at the end of this wave (the tools changed since the manual was last written, at the end of wave 015, release 0.14.0).

Document profile: `single-document` (documentation only: no code, no example, no fixture file is changed; the review passes are answered below).

## Scope

In: `src/doc/README.adoc` (the manual and its tutorial), `README.md`, `src/site/index.html`, `docs/fixtures/brightcart-spec.md`, `CLAUDE.md`.

Out: the page, the Java, the kernel, every example of `src/doc/examples` and every fixture (loaded by tests), the wave's manifest and progress log (the orchestrator's), `SETTINGS_HELP_DOCS` of the page (the new key `current` has no manual link: the help of the field says what it does, so no change to the page was made; the anchor to give it, if the author wants one, is `editor-current-plateau`).

## Decisions

- **D1. The facts come from the run documents 0107 to 0117 (their findings "for W-12"), from `git diff archicode-0.14.0..HEAD -- CLAUDE.md` and from the code**, which wins when they differ. Differences found are listed under *Findings*.
- **D2. A new section for each thing that has no home**: `[[map-technology]]` (what the Map of the technology layer draws, in the Domain part, after `[[map-viewpoint]]`), `[[editor-rename]]` (the rename in a workspace of plateaus), `[[editor-current-plateau]]` (the Settings field), a block of the tutorial's *Later changes* for a reader who knows 0.14.0, and a block of `*A shipped example*` in `[[plateau-views-lacking]]` for the Brightcart views and stories. The existing anchors `editor-keyboard`, `editor-band`, `diff` take the rest.
- **D3. `[[plateau-limits]]` keeps only what is open and relevant**, each checked open with `gh api repos/tmorin/archicode/issues/N`: #89, #94, #78, #82, #103, #109, #112, #114, #25 (kept), #119, #120, #121, #122, #123, #124, #125 (added). #26, #105, #106, #107, #108, #110, #111, #113, #115, #72 are told where the thing they asked for is done, no longer as limits (the issues close with the wave's pull request; they are still open on GitHub today). `less -S` is gone. A new limit is told for the band: the parent in the tree of *Compare with* is read as *Past*, which follows the plateau drawn (run 0109 F2).
- **D4. "0.15.0"** is written only where the manual dates a change of output (`Only a new version of ArchiCode rewrites files...`), as the release the pom says it is; elsewhere "since 0.14.0". The release is not cut here.
- **D5. `--width` is `diff`'s alone**, as the plan row's "and `views generate`" is revised by run 0115 (D1): `views generate` writes Markdown and JSON only. The manual says it, with an excerpt of the real output (checked against the jar byte for byte, see Verification).
- **D6. No CHANGELOG exists** in the repository (`ls` and `git grep`): none is created. The "what is new" block is the tutorial's *Later changes*, which already is the manual's place for what moved for a reader of an earlier version.
- **D7. `docs/fixtures/brightcart-spec.md`** already says the fixture ships views and stories (run 0110); two sentences that still said the layered Brightcart's technology map has no link (#107) were corrected (the table of what is verified, the row of `environments_map`).

## Tasks

- [x] T1. Read the plan row, the run documents 0107 to 0117 (findings), the manual (the sections named in the brief), the page and the Java where a document and the code could differ (`GenerateViewsCommand`, `Width`, `TextWrap`, `DiffCommand`, the band, the story picker, the rename dialog, Settings).
- [x] T2. Manual, domain part: `plateau:` silent (`plateau-untied`, stories), the `layer` in any case and the two booleans (`map-viewpoint`), `map-technology`, `--view` draws the views asked for alone, the root kinds of a layer (`nesting`), the Brightcart views and stories (`plateau-views-lacking`, `story-step-plateaus`), the View appendix.
- [x] T3. Manual, plateaus part and tutorial: the settings table, `--plateau` and the editor's root, step 8 (the two lists), step 9, the upgrade list (*Later changes* and *What changes for a reader who knows 0.14.0*), `[[plateau-limits]]`.
- [x] T4. Manual, editor part: Environments and the Map (the tools *Applications* and *Relationships*, the address), the view form, *Add to story...*, `editor-rename`, `editor-current-plateau`, the band, the Plateaus page, *Compare with*, *Write replaces*, the Changes panel (the walk, the detail, `J` and `K`), the address of a comparison, *Move*, Keyboard.
- [x] T5. Manual, commands part: `--view`, the order of the output sentence, `diff --width` with a real excerpt, the warnings list (no `plateau:` warning), `--format text`.
- [x] T6. `README.md`, `src/site/index.html`, `docs/fixtures/brightcart-spec.md`, `CLAUDE.md` (the list of what `[[plateau-limits]]` holds and the sections that tell wave 016).
- [x] T7. Build the manual, run every test, byte-identity against the jar of `archicode-0.14.0`, this document, one commit.

## Canonical impact

Architecture and domain: none. The run writes the manual, the README, the site, the fixture's spec and `CLAUDE.md` (the one sentence naming what the manual holds); no behaviour, manifest kind, schema or contract changes, and the repository declares no `dom` register. No TDD, no `CI-arc` or `CI-dom` packet exists for this run; nothing moved to `ratified`.

## Shipped files

None: no manifest, example or fixture is added or changed. The only new quoted output is the excerpt of `archicode diff --plateau to-be --against baseline --width 100` on the example `domain_plateaus`, which is the output of the jar of this tree, compared line by line with the manual's block.

## Review pass, answered

A review sub-agent was not dispatched: the document is prose over facts that were each read in the code or in a run document, and a sub-agent given my conclusions would have confirmed them. Mine, KDMLLC read and C scan, against the code:

- C scan, claims checked in the code: `--view` draws the views asked for alone, and a named view is drawn only when asked (`GenerateViewsCommand`: the loop is over `viewIds`, and the built-in views are filtered by `viewIds`); `--width` has no `views generate` option (`DiffCommand` only), a bad width is one `error:` line (`Width.parse`), `$COLUMNS` is read nowhere; the entries of *Compare with* (`bandCompareSelectHtml`: *Nothing*, *Choose a future plateau* disabled, *Past (follows the plateau drawn)* only when the plateau has a parent, then the tree with the plateau drawn disabled); the story picker's box and what it says (`storyStepPlateaus`, `storyPlateauChoiceHtml`); the rename dialog's title, its two buttons and the sentence about renaming in each plateau (`renderRenameSiblingsDialogHtml`); the Settings field (`renderCurrentPlateauSettingsHtml`: shown with at least two plateaus or a `current`, disabled ids while the plateaus have mistakes); the sentence of the root kind is the one of `negative-cases.json` N88 (`manifests/...` in the manual is only a file name).
- Corrected while reading: my first draft said `views generate` without `--view` draws the named views too; the code draws a named view only when it is asked for. The sentence of the command section and of the Views section now say so.
- KDMLLC: the "what changes since 0.14.0" block repeats what the sections say; kept short on purpose (five lines, each a pointer), since a reader who knows the previous version wants the list first. The limits' bullets for #119 to #125 are one or two sentences each.

## Verification

Run by me on the tree as committed (JDK 25, `PLANTUML_JAR` and `DIAGRAM_PLANTUML_CLASSPATH` set, so no test is skipped and the diagrams of the manual are drawn):

| Command | Result |
|---|---|
| `./mvnw -o verify -DskipITs=false` | BUILD SUCCESS: 897 unit tests, 0 failures, 0 errors, 0 skipped; 20 integration tests, 0 failures. `ManualExamplesTest`, `ShippedFilesTest` and `PlateauComparisonTest` are among them |
| `node --test "src/test/javascript/**/*.test.js"` | 1900 pass, 0 fail |
| `./mvnw -o process-resources` (the goal `asciidoctor:process-asciidoc`, which `package` runs in `generate-resources`) | BUILD SUCCESS, no `WARN` or `ERROR` of Asciidoctor; `target/generated-docs/index.html` has the three new anchors and every `href="#..."` of the page has its `id` (135 ids, 113 links, none dangling). Without `DIAGRAM_PLANTUML_CLASSPATH` the build also succeeds but Asciidoctor reports 'Could not load PlantUML' for every diagram: it is the environment, not the manual (the jar of `PLANTUML_JAR` is what the diagrams need) |
| the gate grep `git grep -n -E "Future: \|filesScope\|This plateau\|With its past" -- src/doc README.md` | no line |
| byte-identity: `views generate` and `query graph` with the jar of `archicode-0.14.0` and with the jar of this tree, on a copy of each of the 19 `workspace*.yaml` of the 14 examples of `src/doc/examples` that have one (`domain_configuration` has none; the design examples have two or three each), `diff -r` of the folders, stdout, stderr and exit codes included | identical (`IDENTICAL`; 16 to 78 `.puml` files per example, every exit code 0). `domain_technology_map` (the one example with a technology map) is in that run, and its three saved maps drawn with `-i` give identical files too |

The examples of the manual have no change, so no example output of a manual quote changed: `ManualExamplesTest` is green.

## Not verified

- The editor in a browser: the sentences about the page are read from the code (`standalone.html`) and from the run documents, not seen on a screen. In particular the text of the two lists of the band, the dialog of the rename, the box of *Add to story...*, the field in Settings and the group of tools *Applications* / *Relationships* are said as the code writes them.
- The native image (no code changed).
- The published site (`src/site`, the page at `/editor/` and `/docs/`): the manual builds, nothing was deployed.
- `#123` (the dialog that may drop what was typed) is told in the limits as the issue says it, not verified in a browser.

## Findings

- **F1. What a run document says and the code does differently.** (a) The plan row and the brief say `--width` on `diff` and `views generate`: it is on `diff` only (run 0115 D1; the manual says so). (b) The brief says the manual's line 791 says `--view` "draws that view too": true of the old sentence, now corrected. (c) Run 0112's F1 says run 0103's text (the page Plateaus "only moves the mark") is out of date: it was in two places of the manual (the Plateaus page and the Changes panel) and both are corrected. (d) The *Past* entry of *Compare with* exists only for a plateau that has a parent, which no run document says (the root has none); the manual says it.
- **F2. For the author, not decided here.** (a) *SETTINGS_HELP_DOCS* has no `current` key: the help of the field links nowhere; the anchor is `editor-current-plateau` if wanted (a one-line change of the page, not made). (b) The manual says "0.15.0" once (the sentence that dates a change of output); the pom says `0.15.0-SNAPSHOT`: if the release is called otherwise, that word changes. (c) The sample error line of the root kinds (`manifests/root-container.yaml`) names an invented file; the sentence is the tool's.
- **F3. Issues.** The issues #72, #105, #106, #107, #108, #110, #111, #113, #115, #116, #117, #118 and #26 are told as done in the manual and close with the wave's pull request (`gh api` shows them open today); #119 to #125 are open and now told in the limits. No issue was filed.
- **F4. Files touched outside `likely_paths`:** none (`docs/fixtures/brightcart-spec.md`, `README.md`, `src/site/index.html`, `CLAUDE.md` and `src/doc/**` are the listed paths; this document is in the run's directory). The wave's manifest and progress log are the orchestrator's and were not touched.
