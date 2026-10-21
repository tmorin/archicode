---
type: run
run: 0127
status: completed
wave: 017
---

# Run 0127: manual-and-tutorial-017

Wave 017 (`editor-defects-and-composed-replaces`), item W-9 (phase P2, the last run of the wave). Focus: the manual, `CLAUDE.md` and the specification of the Brightcart fixture say what the editor and the command line do at the end of this wave (runs 0119 to 0126, release 0.15.0 being the last one the manual dated).

Document profile: `single-document` (documentation only: no code, no example, no fixture file is changed; the review passes are answered below).

## Scope

In: `src/doc/README.adoc` (the manual and its tutorial), `CLAUDE.md`, `docs/fixtures/brightcart-spec.md`.

Looked at and unchanged: `README.md` and `src/site/index.html` (nothing in them is about what this wave changed: the site says "pre-1.0", the README one paragraph on `diff`), the tutorial (it builds `domain_plateaus`, which has two plateaus and no composed move, no cleared inherited field and no cancelled dialog).

Out: the page, the Java, the kernel, every example and fixture file (loaded by tests), the wave's manifest and progress log (the orchestrator's), `DOC_LINKS` of the page (no anchor was renamed; `settings-help-anchors.test.js` passes).

## Decisions

- **D1. The facts come from the run documents 0119 to 0126 (their findings "for W-9"), from `git diff archicode-0.15.0..HEAD -- CLAUDE.md` and from commands run on the jar of this tree**, which wins when they differ. The quoted output (the `error:` line of the view, the two sentences of a refused `REMOVE` with a `field`, the numbers of `marketplace` against `baseline`, the warnings of `marketplace` against `saas`) was run on copies of the layered Brightcart and of `domain_plateaus`, not copied from a run document.
- **D2. New places, existing anchors.** One new section, `[[editor-small-screen]]` (after the header of a diagram), for the 360 px measures. Everything else goes where the thing belongs: `[[plateau-views-lacking]]` (#121), `[[plateau-replaces]]` (#89), `[[plateau-patches]]` and `[[editor-writing]]` (#94), `[[editor-rename]]` (#123, #122), `[[editor-elements]]` (the byte-order mark), `[[editor-move]]` (#119). A block "What changes for a reader who knows 0.15.0" is added to the upgrade section, before the one for 0.14.0.
- **D3. `[[plateau-limits]]` after the wave**: #130 (new: *Write replaces* several layers apart), #114 and #112, #109, #124, #125, #129 (new: a refused write redraws the form), #78, #103, #25, and #29 (the editor on a real phone, in place of #82). #82, #89, #94, #119, #120, #121, #122 and #123 are told where the thing they asked for is done. The same list is in `CLAUDE.md`. All of them are still open on GitHub (the issues close with the wave's pull request).
- **D4. #82 is told as a measure, not a limit.** The numbers of run 0124 (top bar 105 px, band 80 px, tabs 39 px, document 360 px on the seven pages, the widest control of Settings at x 332, the four places fixed) are in a table; the section says they were taken in a desktop browser (the browser pane of the development tool), and that the order and the heights of the stacked regions, touch and the on-screen keyboard are a judgment nobody made on a phone. The limit that stays is "the editor on a phone", with #29 (whose list holds "Narrow width (about 360 px) and a phone").
- **D5. "0.16.0"** is written once, in the sentence that dates a change of output (`Only a new version of ArchiCode rewrites files...`), as the version the pom says is next; elsewhere "since 0.15.0". The release is not cut here.
- **D6. The specification of the fixture keeps its history.** Section 12 is "the record of the time they were made", so L3, the finding about P6 and the open-points lists say what was found and, in a clause, that run 0125 built it; the places that state what is true now (the header line, the table of what is verified, the table of the comparisons, N8, "what the fixture drives", the closing list) say P4 is verified by `archicode diff` and by the editor, with the new test name.

## Tasks

- [x] T1. Read the progress log, the run documents 0119 to 0126, the manual's sections named in the brief, the page and the kernel where a document and the code could differ (the dialog of the rename and of the move, `originText`, the sentences of `patch.rs`).
- [x] T2. Manual: #121 (the view whose element a facet removes: its paragraph, the note of the facets, the limit), #89 (the paragraph of `plateau-replaces`, the limit, with the numbers), #94 (the operator table, a paragraph *Taking a field out*, the two new error lines, the table of what an edit writes, *Clearing what the plateau inherits*, *Where a value comes from*), #120 (the limit goes), #123 and #122 (*Cancelling* and the question of *Move* in `editor-rename`, *What a move tells before it writes*), #119 (the byte-order mark in the save paragraph, the rule of the comment after the last line of a block with its limits in the *Move* section), #82 (`editor-small-screen`), the limits (#129, #130, #29), the upgrade block.
- [x] T3. `CLAUDE.md`: the list of `[[plateau-limits]]` and where wave 017 is told; the sentence that said a refused write redraws the form now names #129.
- [x] T4. `docs/fixtures/brightcart-spec.md`: lines 8, 35 to 36, 120, 1303, 1480, 1487, 1491, 1507, 1550, 1567, 1603, 1647, 1649, 1729.
- [x] T5. Build the manual, run the five commands of the gate, the greps, this document, one commit.

## Canonical impact

Architecture and domain: none. The run writes the manual, the specification of a fixture and `CLAUDE.md` (the list of what the manual holds and one limit); no behaviour, manifest kind, schema or contract changes, and the repository declares no `dom` register. No TDD, no `CI-arc` or `CI-dom` packet exists for this run; nothing moved to `ratified`.

## Shipped files

None: no manifest, example or fixture is added or changed. The quoted outputs are those of the jar built from this tree (`./mvnw -o verify -DskipITs=false`) on copies in the scratchpad: `archicode views generate --plateau saas -i saas_probe` (a view added to a copy of the layered Brightcart; the same view is the one of `ViewsAndQueriesIT`), `archicode diff --plateau marketplace --against baseline` and `--against saas` on the layered Brightcart, and two patches added to a copy of `domain_plateaus` (`REMOVE` of `kind`, `REMOVE` with a `value`).

## Review pass, answered

A review sub-agent was not dispatched: the document is prose over facts that were each read in the code, in a run document or in the output of a command, and an agent given my conclusions would have confirmed them. Mine, KDMLLC read and C scan, against the code:

- C scan, claims checked: the sentences of the `REMOVE` errors are the output of the jar (D1); the dialog of *Move* has the words and buttons of `renderRenameSiblingsDialogHtml` (`moving`: *Back to Move*, *Move anyway*); the Inspector sentence is `originText` (`taken out by patch N of <plateau> (REMOVE target x)`); the media query of the small screen is `max-width: 40rem` with the heights 30vh, 80vh and 50vh; the rule of the comment after the last line and its limits are D5 and D7 of run 0123; `Write replaces` several layers apart is the reproduction of #130; the `marketplace` against `saas` warning names `shop.app.search` (run on the jar), as run 0125 says.
- Corrected while reading: the brief says "#82 is a limit of the manual" and the old paragraph "the top bar still wraps onto several lines" stays true (105 px); it is now a measure. The first draft of the *Taking a field out* paragraph said "the element keeps the order of its other keys", a detail of the kernel that nobody reads; it is gone.
- KDMLLC: the upgrade block repeats what the sections say, four items each a pointer; kept short on purpose.

## Verification

Run by me on the tree as committed (JDK 25, `PLANTUML_JAR` and `DIAGRAM_PLANTUML_CLASSPATH` set, so no test is skipped and the diagrams are drawn):

| Command | Result |
|---|---|
| `./mvnw -o verify -DskipITs=false` | BUILD SUCCESS: 968 unit tests, 0 failures, 0 errors, 0 skipped; 21 integration tests, 0 failures. `ManualExamplesTest` and `ShippedFilesTest` are among them |
| `cargo test --manifest-path src/main/rust/viewpoint-kernel/Cargo.toml` | 228 pass, 0 fail |
| `src/main/rust/viewpoint-kernel/embed.sh --check` | exit 0 |
| `node --test "src/test/javascript/**/*.test.js"` | 2039 tests, 2039 pass, 0 fail (`settings-help-anchors.test.js`, `shipped-files.test.js` among them) |
| `npx prettier --check "src/**/*.java"` | clean |
| `./mvnw -o process-resources` (the goal `asciidoctor:process-asciidoc`) | BUILD SUCCESS twice, no Asciidoctor warning; `target/generated-docs/index.html` has 136 ids and 359 links to an anchor, none dangling; `editor-small-screen`, `plateau-limits`, `editor-rename`, `plateau-patches` are there |
| `git grep -n -E "#(82\|89\|94\|119\|120\|121\|122\|123)\b" -- src/doc README.md` | no line; in `CLAUDE.md` only the sentences that say what a run built (wave 017, run 01NN, #N) and the sentence that names where each is told |
| byte-identity | no Java, Rust, page, example or fixture file is changed (`git diff --stat` lists `CLAUDE.md`, `docs/fixtures/brightcart-spec.md`, `src/doc/README.adoc` and this wave's documents), so every file `views generate`, `query graph` and `diff` write is what the orchestrator compared with the jar of `archicode-0.15.0` at the commit before this one |

## Not verified

- The published site and the manual on GitHub Pages (the manual builds; nothing was deployed).
- The editor in a browser: the sentences about the page are read from the code (`standalone.html`) and from the run documents 0121 to 0126, which looked at the page in the built-in browser; this run did not open it again. The 360 px table is run 0124's, not measured again.
- The Native job (no code changed).
- A real phone (see D4).

## Findings

- **F1. Run documents and code that differ.** None found that the manual repeats. Run 0121 says the loss of the form was "worse than the issue said" (the values were gone when the dialog opened); the manual says only what is true now (Cancel gives the form back).
- **F2. For the author.** (a) The manual says "0.16.0" once, from the pom (`0.16.0-SNAPSHOT`). (b) #29 is a general list of checks by hand; the manual cites it for the phone only because one of its items is "Narrow width (about 360 px) and a phone". (c) The Brightcart specification still describes P6 and the old `folders/` rendition as history, deliberately.
- **F3. Files touched outside `likely_paths`:** none (`CLAUDE.md`, `docs/fixtures/brightcart-spec.md`, `src/doc/**` are the listed paths; this document is in the run's directory). The wave's manifest and progress log are the orchestrator's and were not touched.
- **F4. Wave-level.** The `[[plateau-limits]]` list ends the wave with #130 and #129 as new entries; the eight issues of the wave (#82, #89, #94, #119 to #123) are open on GitHub and close with the pull request. #124, #112, #109, #114, #78, #103, #125 and #25 are left as the wave plan said.
