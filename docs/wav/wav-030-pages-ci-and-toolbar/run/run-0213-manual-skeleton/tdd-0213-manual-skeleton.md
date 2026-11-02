---
title: Manual skeleton
type: tdd
status: draft
run: 0213
wave: 030
owner: tmorin
date: 2026-11-01
related:
  - docs/wav/wav-030-pages-ci-and-toolbar/wav-030-pages-ci-and-toolbar.md
  - docs/wav/wav-030-pages-ci-and-toolbar/wbc-030-pages-ci-and-toolbar.md
  - src/doc/README.adoc
  - src/test/javascript/site.test.js
  - https://github.com/tmorin/archicode/issues/193
---

# Manual skeleton

# Summary

`src/doc/README.adoc` (3942 lines, one file) is sorted by the order it was written in, not by the kind of reading it serves. This run reorders it into six parts, in the Diataxis order the wave names: Start here, Tutorials, How-to guides, Reference, Concepts, Upgrading (#193 b). It moves whole sections, changes the heading level of the few that change parent, moves the six upgrade blocks under Upgrading with their ids, deletes the `//` draft lines (keeping the ArchiMate/C4 mapping as one real paragraph), fixes four stale passages (DEC-5 (a) to (d)), and counts the Asciidoctor warnings before and after. It writes no new page and rewrites no prose beyond those fixes: W-4 (one Concepts page for plateaus and the voice), W-5 (the CI and agent how-tos) and W-6 (the generated command reference) come after it and edit the same file.

There is no PRD (profile TDD+pln), so traceability is incomplete: requirements are labelled `REQ-n` from the manifest of wave 030 (row W-3, the last three criteria of gate P1) and from the scope column of W-3. No diagram: the change moves text inside one file, with no new boundary and no branching flow; the move map is a table (DEC-2).

# Scope

In scope: `src/doc/README.adoc` (moves, heading levels, the document header, the `//` lines, the listed prose fixes, including the removal of the Pluggable bullets of Views and Rendering, DEC-5 (d), REQ-7), one new node test and its fixture of anchors under `src/test/javascript/`, the run record.

Out of scope: any other prose change (W-4, W-5; W-5 only re-checks that `grep -c 'Pluggable Viewpoint Service'` prints 0, which DEC-5 (d) makes true here), a page on CI or for an agent (W-5), the generated reference (W-6), splitting the manual into files or a multi-page site (wave decision D2), the release-note text of the six `[[upgrade-0-NN]]` blocks (they move and keep their ids), the editor's links into the manual, `src/site/**`, the Maven build, and any command.

# PRD Traceability

No PRD. Requirements assumed from the wave manifest.

- `REQ-1` (P1 gate 5): the top-level headings of the manual are, in this order, Start here, Tutorials, How-to guides, Reference, Concepts, Upgrading; `[[upgrade-0-17]]` to `[[upgrade-0-22]]` sit under Upgrading. Addressed (DEC-1, DEC-2, DEC-3, IMP-1, CTR-1).
- `REQ-2` (P1 gate 6): every `[[id]]` of `git show ff3bacd:src/doc/README.adoc` is still defined; the `//` draft lines are gone except the one ArchiMate/C4 mapping paragraph; `./mvnw test -Dtest=ManualExamplesTest` exits 0. Addressed (DEC-3, DEC-4, DEC-6, CTR-2, IMP-1, IMP-2).
- `REQ-3` (P1 gate 7): the run record states the number of Asciidoctor warnings before and after, and after is not greater. Addressed (DEC-7, Observability).
- `REQ-4` (W-3 scope): a two-level table of contents (parts and chapters, `:toclevels: 1`, DEC-1). Addressed (DEC-1, CTR-1).
- `REQ-5` (W-3 scope): the stale intros are fixed: the Introduction names the six parts, the Commands intro lists the eight commands, Features stops promising extension points (DEC-5 (a) to (c)). Addressed (DEC-5).
- `REQ-6` (W-3 scope): no other prose change; every `[[id]]` and `<<id>>` kept; the record lists each paragraph moved or changed. Addressed (DEC-6, DEC-7).
- `REQ-7` (decision of this run, not of the wave): the Pluggable bullets of Views and Rendering and the sentences that lean on them are deleted (DEC-5 (d)), the same false claim as the Features entries; W-5 only re-checks the grep. Addressed (DEC-5).

# Technical Goals

- `TG-1` A reader finds the part by the kind of reading, from the table of contents alone, which shows the six parts and their chapters.
- `TG-2` Every address that works today still works: every explicit id, and the generated ids of the headings that carry none (ASM-3).
- `TG-3` The move is provably a move: a script compares the lines of the old and the new file, so the only differences are the ones the record lists.
- `TG-4` The properties of TG-1 to TG-3 that can be automated in node are in one test that the Page job runs (DEC-6); the build result (warnings, table of contents) is checked by the run and recorded.

# Non-Goals

- No new sentence of explanation except the two fixed intros, the Features and Pluggable fixes, and the one mapping paragraph (DEC-3, DEC-5).
- No rename of any heading (a rename changes its generated id, ASM-3).
- No merge of the two parts about plateaus (W-4), no filler or voice edit (W-4), no `Best Practices` topics written or dropped (W-5, Q2 of the wave).
- No change to `src/doc/examples/**`, to an `include::`, to a listing or a table.

# Assumptions

- `ASM-1` `src/doc/README.adoc` at HEAD equals the file of `ff3bacd` (`git log -1 -- src/doc/README.adoc` is `f50757e`, earlier than `ff3bacd`; `git status` shows it unmodified). The task confirms with `git diff ff3bacd -- src/doc/README.adoc` and uses `ff3bacd` as the base in every comparison.
- `ASM-2` The 91 explicit ids are 90 `[[id]]` anchors at the start of a line plus the inline anchor `[[fold-by-hand]]` that sits in a list item (line 2144 at HEAD); that anchor must move with its list item, not be lost at the start of a line. The two `<<changed>>` and `<<external>>` hits are PlantUML stereotypes in a literal, not cross references. `grep -oE '\[\[[^]]+\]\]'` finds 94, a superset: line 194 `[[content.relationships]]` is a TOML table header inside a listing and line 199 has `[[content.elements]]` and `[[content.relationships]]` in backticks. No `[[id,text]]` or `[#id]` form exists. Validated by the script of CTR-2.
- `ASM-3` A heading with no explicit id gets a generated id from its title (`_domain`, `_features`, `_composition`, `_composition_2`). A repeated title takes a number by order of appearance. This design keeps the order of the repeated titles (`Composition` three times, all in Domain and not moved; `Introduction` once at the top and twice in the two walkthroughs; `Conclusion` twice in the walkthroughs; the other repeated titles above; the walkthroughs keep their relative order, DEC-2), so the generated ids do not change. The base repeats twelve titles: Introduction x3, Composition x3, Conclusion x2, and Application Layer, Technology Layer, System, Container, Component, Solution, Environment, Node (Domain and Appendix), and Comparing two plateaus (Domain and Editor); the order of each pair is kept (Domain before Appendix and Editor, ecommerce before facets). Validated by comparing the pairs id to heading text of the HTML before and after (Observability 2); a pair that appears, disappears or swaps ids other than the new parts is a finding.
- `ASM-4` Asciidoctor with `:doctype: book` accepts `= Title` level-0 sections as parts, each followed by `==` chapters, and `asciidoctor-maven-plugin` 3.2.0 (the pom's) emits no new warning for it. Verified (Asciidoctor 3.2.0, scratch build, book doctype, level-0 parts, an anchor above a chapter after a part, `:TOC: left`): BUILD SUCCESS, no Asciidoctor line, the anchor id stays on the chapter `h2`, the parts get ids of the `_part_a` form. The render is still checked by eye (Observability 4).
- `ASM-5` The 139 lines that start with `//` at HEAD (`^//` and `^ *//` both give 139) are comment lines outside any listing: `awk '/^----$/{b=!b} b&&/^\/\//{print NR}'` prints nothing at HEAD. A `//` inside a listing would be content, not a draft line.
- `ASM-6` The eight commands of `archicode --help` (JDK 25, packaged jar `target/quarkus-app/quarkus-run.jar`) are `views`, `query`, `editor`, `plateau`, `stories`, `diff`, `guide`, `init`; `-V`/`--version` is an option (the manual's `[[version]]` section stays). Read from the help of the current jar.

# Constraints

- `CON-1` `src/site/index.html` and `src/main/editor` link to `docs/#<id>` for explicit ids; `src/test/javascript/site.test.js` ("every link into the manual ...") and `src/test/javascript/viewpoint-kernel/help.test.js` ("every anchor of the manual that the editor links to ...") fail if one is lost. They read the `.adoc` as text, so they do not see a heading level or an order.
- `CON-2` Seven more files read fixed passages of the manual by text: `settings-help-anchors.test.js`, `distinct-dashes.test.js` and `example-identity.test.js` (under `src/test/javascript/viewpoint-kernel/`; the settings help, the dash table), `replaces-editor.test.js`, `move-editor.test.js` (slices between `[[editor-replaces]]`, `[[editor-move]]` and `[[editor-theme]]`: order-dependent, safe only while the Editor chapter keeps its order) and the Java `PlateauComparisonTest` (two tests; the byte quote `[source,text]\n----\ncomparing to-be (To be) with baseline (As is)` of `diff` must split the manual into exactly 3 parts, so the plateau tutorial and the `diff` section must stay byte-identical). With site.test.js and help.test.js of CON-1 these are nine readers. A moved passage must stay byte-identical, and the Editor chapter and the Plateau tutorial move whole, so the tests keep passing without a change.
- `CON-3` An anchor line `[[id]]` is attached to the block that follows it. Putting a part heading between an anchor and its heading would give the anchor to the part. `[[domain]]` above `== Domain` and `[[editor]]` above `== Editor` are the cases (DEC-1).
- `CON-4` `W-4`, `W-5`, `W-6`, `W-7` and `W-8` edit the same file after this run and the wave ties them to the ids and to `[[editor-small-screen]]` and `[[editor-layout]]`; this run keeps the ids so that their gates read the same.
- `CON-5` The root `CLAUDE.md` forbids a wave or run id in a `CLAUDE.md` sentence; no `CLAUDE.md` is edited. `docs/CLAUDE.md` named by the skill does not exist here; the conventions followed are the root `CLAUDE.md` and the documents of runs 0211 and 0212.
- `CON-6` `scripts/changes.mjs` sends `src/doc/README.adoc` to Java and Page, not E2E or Kernel (gate P1 criterion 1, run 0211); a new file under `src/test/javascript/` runs Page. No change to the map is needed.
- `CON-7` `npm run format:check` and `npm run lint` cover the new test and fixture reader (`src/test/javascript/**/*.js`); the `.adoc` and the `.json` fixture are not read by Prettier.

# Current State

- `src/doc/README.adoc` (3942 lines at HEAD): header `= ArchiCode`, `:authors:`, `:TOC: left`, `:toclevels: 3`, `:source-highlighter: coderay`; no `:doctype:`, so the doctype is `article`. Top-level `==` sections, in this order: Introduction (7), Availability, License, and Deliverables (17; `=== Install` `[[install]]` inside), Features (71), Domain (`[[domain]]` 108; Workspace, Application Layer, Technology Layer, Relationships, Viewpoints and Views with Stories, Rendering, Stereotypes and styles, Technical Configuration), States of an architecture (plateaus) (`[[plateaus-overview]]` 1227; The idea, The layout, The settings in short, The states, Saying what an element replaces, A tutorial: from one workspace to a review of the changes (1334), Upgrading: what breaks, and what does not (`[[plateaus-upgrade]]` 1613, six `[[upgrade-0-NN]]` blocks inside), Limits of today (`[[plateau-limits]]` 1752)), Editor (`[[editor]]` 1779), Commands (2343), Best Practices (2915; Design Guidelines holds the incremental-design text and, as `====` sections, the ecommerce walkthrough (2963) and the facets walkthrough `[[facets]]` (3276); Source Code Organization 3538), Appendix (3607; Data Structures).
- 139 lines start with `//` (the count is the same with optional leading spaces); they are in Domain (the layer, relationship, viewpoint and rendering drafts), Commands, Best Practices and the two walkthroughs. Lines 549-552 and 659-662 carry the ArchiMate and C4 mapping of the two layers; 623, 635, 647, 703 and 715 say each element is the C4 element of the same name.
- Stale text: Features (lines 94-98) promises plugging in renderer engines and viewpoint providers; the Views section (842, 947) and the Rendering section (1109, 1111) describe a pluggable Viewpoint Service and Renderer Service; the Commands intro (2347-2353) speaks of two kinds of commands (generate, query) when `archicode --help` lists eight (ASM-6); the last paragraph of Introduction promises "the features, domain, commands, and best practices", which will not be the order of the parts.
- The build: `./mvnw -o generate-resources` converts the file with `asciidoctor-maven-plugin` 3.2.0 and asciidoctorj-diagram to `target/generated-docs/index.html`. Measured by this design on the unmodified file with JDK 25: `Converted .../README.adoc`, `BUILD SUCCESS`, no Asciidoctor line. The count of REQ-3 is the number of lines that match `asciidoctor: (WARNING|ERROR|INFO)` in the output of the build (`DEBUG` excluded; the `WARNING:` lines of the JDK 25 Maven run, jansi and guava, are not Asciidoctor's and are not counted), listed and not the number alone. The baseline is therefore 0 on this measure; the run measures again before editing, since the figure is what the record states.
- The tests that read the manual as text are the nine of CON-1 and CON-2; `ManualExamplesTest` loads the workspaces under `src/doc/examples` and does not read the `.adoc` (the gate names it as a guard that the examples are intact, not as a check of the move).

# Proposed Design

Reorder by moving contiguous blocks, with a script and not by hand, from the base file `ff3bacd:src/doc/README.adoc`, so that the move is exact and repeatable. The new file is the concatenation, in the order of DEC-2, of the blocks below, each after the part heading of its part; the heading levels of the blocks that change parent are lowered by the number of levels they rise (a `====` becomes `==`); nothing else in a block changes except by DEC-3 and DEC-5.

- `DEC-1 — Parts are level-0 sections of a book; the table of contents has two levels (parts and chapters)`
  - `Decision:` Add `:doctype: book` to the header and set `:toclevels: 1` (the key is written `:TOC:` today; it is kept as it is and `:toc: left` is not added). Each part is `= <Name>` on its own line with a blank line before and after, placed above the first chapter of the part and, when that chapter has an explicit id (`[[domain]]`, `[[editor]]`, `[[plateaus-overview]]`), above the `[[id]]` line, never between the anchor and its heading (CON-3). Existing `==` sections stay `==` and are the chapters. The part names are exactly `Start here`, `Tutorials`, `How-to guides`, `Reference`, `Concepts`, `Upgrading`. A part carries no introduction text of its own (no new prose, DEC-3).
  - `Rationale:` the gate reads the parts with `grep -n '^= '`; only a level-0 heading in a book matches, and Asciidoctor accepts level-0 sections only in the book doctype. With `:toclevels: 1`, the table of contents shows the six parts and their chapters, which is the point of the sort (REQ-4). Measured on a scratch book (`= Part`, `==` chapter, `===` section, `:TOC: left`): Asciidoctor recurses while the section level is below `toclevels` and the part is level 0, so `:toclevels: 2` would show three levels (parts, chapters, sections); the old `:toclevels: 3` would list sections, subsections and step headings too.
  - `Alternatives considered:` keep `article` and write parts as `==` (does not match `^= `, the gate fails, and the chapters would have to drop to `===`, moving every level); a separate heading level via a role (no table-of-contents effect); a multi-file book with `include::` (D2 of the wave: decided after the content is sorted).
  - `Tradeoffs:` `grep -n '^= '` prints seven lines, the first being the title `= ArchiCode`; the gate's "are, in this order" is read as the six parts after the document title (Q-1, settled: the record says so). The book doctype changes the HTML (the part is an `h1` and a chapter an `h2`; a chapter is not numbered because `sectnums` is not set); the render is checked (Observability 4).
  - `Linked PRD IDs:` REQ-1, REQ-4.

- `DEC-2 — Chapters go where their kind of reading puts them, whole, without splitting a chapter`
  - `Decision:` Blocks are cut at heading boundaries of the base file (line numbers of `ff3bacd`; the script cuts at the headings, the numbers are a guide). The map:

    | Part | Block, in order | Level change |
    |---|---|---|
    | Start here | `== Introduction` (7-16); `== Availability, License, and Deliverables` with `=== Install` (17-70); `== Features` (71-107) | none |
    | Tutorials | the ecommerce walkthrough (`==== Example: An ecommerce platform`, 2963-3275, with its `=====` steps, Introduction and Conclusion); the facets walkthrough (`[[facets]]` `==== Tackling view clutter`, 3276-3537); the plateau tutorial (`=== A tutorial: from one workspace to a review of the changes`, 1334-1612) | `====`/`=====` become `==`/`===` (two levels up); the tutorial `===` becomes `==` (one level up) |
    | How-to guides | `== Best Practices` with its intro, `=== Design Guidelines` (now holding only `==== Incremental and In-Depth Design Approach`) and `=== Source Code Organization` (2915-2962 and 3538-3606) | none |
    | Reference | `[[domain]] == Domain` (108-1226); `[[editor]] == Editor` (1779-2342); `== Commands` (2343-2914); `== Appendix` (3607-3942) | none |
    | Concepts | `[[plateaus-overview]] == States of an architecture (plateaus)` without its tutorial and its upgrade section (1227-1333), then `[[plateau-limits]] === Limits of today` (1752-1778) | none |
    | Upgrading | `[[plateaus-upgrade]] === Upgrading: what breaks, and what does not` with the six `[[upgrade-0-NN]]` blocks (1613-1751) | `===` becomes `==` (one level up) |

    The order of blocks inside a part follows the table, which is also the order they have in the base file where one part takes several (Reference keeps Domain, Editor, Commands, Appendix as they were). Titles are not changed.
  - `Rationale:` each chapter is mostly one kind: the walkthroughs are tutorials; Best Practices (the incremental approach and where to put files) tells how to organize work; Domain, Editor, Commands and the data structures are what the tool contains and does, to look up; the plateau chapter is the explanation of an idea and its limits; the upgrade section is what changes between versions. Cutting a chapter inside its prose is not done here: the plateau text under Domain, `Workspace` and in the plateau chapter is one subject in two places, and W-4 merges it into one Concepts page, so this run leaves each piece where its chapter is (Domain stays in Reference with the plateau header and patches it holds, Concepts holds the idea).
  - `Alternatives considered:` Editor in How-to guides (its chapters list pages and controls, which is reference; the how-to content, such as writing in a plateau, is a task inside a page, and splitting them is rewriting); Domain in Concepts (it is a catalogue of kinds and keys, looked up and not read through); dissolving Best Practices into the other parts (leaves its filler intro with no home, and W-5 has to decide those topics).
  - `Tradeoffs:` Reference is long and mixed; the table of contents shows its four chapters. Concepts starts with a thin set of three subsections plus Limits until W-4. How-to guides has one chapter until W-5 adds two. Concepts is placed after Reference by the wave's order.
  - `Linked PRD IDs:` REQ-1, REQ-6.

- `DEC-3 — The `//` draft lines are deleted; the ArchiMate and C4 mapping becomes one paragraph in Domain`
  - `Decision:` Delete every line that starts with `//` (139 lines at HEAD; none inside a listing, ASM-5), and the blank line it leaves when two blank lines meet. Write the mapping that lines 549-552 and 659-662 draft as one real paragraph (no `//`) in the introduction of `== Domain`, after its bullet list: the Application layer matches the ArchiMate Application layer and the Technology layer the ArchiMate Technology layer, both for the structure aspect only; the Application layer follows the C4 model with the Solution on top of the System; the Technology layer follows the C4 deployment representation with two elements, Environment and Node. The task checks each sentence against the Introduction (which already says the model is rooted in the structural aspect and spans the two layers) and against `docs/architecture`, and drops a clause it cannot confirm. The ArchiMate quotations of lines 550 and 660 are not copied. The drafts that say each element is "equivalent to" its C4 element (623, 635, 647, 703, 715) are covered by that paragraph and are deleted.
  - `Rationale:` the gate allows the lines of one paragraph, and "kept as one paragraph" in the scope means real prose; the other drafts repeat text that the section already says or promise a mechanism that does not exist (the pluggable services of DEC-5).
  - `Alternatives considered:` keep the mapping as `//` lines (invisible to a reader, and the gate's count would be 0 only by excepting them); delete all drafts and write no mapping (the C4/ArchiMate link is the claim of the tool and stays only in the Introduction); move the paragraph to Concepts (W-4 owns Concepts).
  - `Tradeoffs:` this is the one new paragraph of the run and a change of meaning, so the record quotes it and where each sentence came from.
  - `Linked PRD IDs:` REQ-2, REQ-6.

- `DEC-4 — Every explicit id and every link target is kept; nothing is renamed`
  - `Decision:` No `[[id]]`, `[#id]` or inline `[[id]]` is removed, renamed or duplicated, no `<<id>>` is rewritten, and no title is edited (ASM-3). Where a block moves, its anchors move with it. A reference whose wording depends on position (the words above, below, previous, next or following a part or section: 118 lines contain one of them at HEAD) is read for each moved block and either still true or listed in the record; a wrong one is fixed with the least words and listed (DEC-5 rule).
  - `Rationale:` the site, the editor and external links point at ids (CON-1).
  - `Alternatives considered:` none; this is the wave's rule.
  - `Tradeoffs:` the position words cost a read of the 118 lines, bounded by listing only those in a moved block.
  - `Linked PRD IDs:` REQ-2, REQ-6.

- `DEC-5 — Four stale passages are fixed in the fewest words, each listed in the record`
  - `Decision:` (a) the last paragraph of Introduction names the six parts in their order instead of "features, domain, commands, and best practices" and keeps its one sentence of invitation (no `journey`: W-4 greps for it, and the sentence already there stays as it is only if it is not stale, otherwise it is replaced by the plain one). (b) The Commands intro (the two bullets about generate and query, and the closing paragraph) is replaced by one sentence and a list of the eight commands of ASM-6, one line each, with a `<<id>>` to the explicit id of its section where one exists (`generate-views`, `serve-the-editor`, `stories-generate`, `diff`, `guide`, `init`, `plateau-list`) and plain words where the section has none (`query`); each one-line description is the first sentence of the description of `archicode --help` (`diff` and `init` wrap on three lines there), so it is true by copy. (c) Features: the two entries that promise plugging in renderer engines and viewpoint providers (94-98) are deleted, and the closing paragraph of Features (about "this next parts") is reduced to what is true. (d) The same promise, in Views (the bullet "Pluggable Viewpoint Service" and the sentence at 947 that leans on it) and Rendering (the bullet "Pluggable Renderer Service" and the sentence at 1111), is deleted by the same rule, so that `grep -c 'Pluggable Viewpoint Service'` prints 0 (the gate P2 criterion 3 is then true for a file W-5 still has to check) and `grep -ciE 'pluggable|plug-gable|extension point|viewpoint provider'` has no hit that promises a plug-in.
  - `Rationale:` REQ-5 names (a)-(c); (d) is the same false claim and the P2 gate reads the whole file; one pass is cheaper than two runs touching the same lines. The tool has no plug-in point: the renderer is PlantUML and the viewpoints are `overview`, `detailed`, `deep` and `map` (root `CLAUDE.md`, Architecture).
  - `Alternatives considered:` leave (d) to W-4 or W-5 (the sentences are drafts under the pluggable bullets that DEC-3 deletes; the bullets would be orphaned); rewrite the Commands section (W-6 generates the reference; only the intro is stale).
  - `Tradeoffs:` this is a prose change that REQ-6 forbids in general; it is allowed here because the scope says "the stale intros fixed" and the record lists each such line with its old and new text, so a reviewer sees that every other line is identical (DEC-7).
  - `Linked PRD IDs:` REQ-5, REQ-6, REQ-7.

- `DEC-6 — One node test and one fixture pin what a script cannot be trusted to keep`
  - `Decision:` Add `src/test/javascript/manual-skeleton.test.js` and `src/test/javascript/manual-anchors.json` (the ids of `ff3bacd`, sorted, written by the run from the base file, the 91 anchors of ASM-2, extracted from outside listings and backticks). The test reads `src/doc/README.adoc` as text and asserts: (1) every id of the fixture is defined (`[[id]]` at the start of a line, or inline; the plain regex reading of the gate is a superset and also passes); (2) the level-0 headings after the title are exactly the six names in order (no other `^= ` line); (3) the six anchors `upgrade-0-17` to `upgrade-0-22` are defined after the `= Upgrading` heading; (4) no line starts with `//`; (5) the header has `:doctype: book` and `:toclevels: 1`; (6) the headings of the walkthroughs and the tutorial sit under Tutorials, and `[[domain]]`, `[[editor]]` and the heading of Commands under Reference (so a later run that moves them fails here); (7) `grep`-style: no `Pluggable Viewpoint Service`. W-4 and W-5 may add to the fixture (a new id) but not remove one; the test says so in its title.
  - `Rationale:` the wave's criteria are shell commands run once at the gate; a test keeps them true for W-4 to W-8, which edit the same file, in the Page job that `scripts/changes.mjs` already runs for this path (CON-6). It follows `site.test.js`, which reads the same file as text.
  - `Alternatives considered:` rely on the gate's `git show ff3bacd` only (a shallow clone in CI has no `ff3bacd`; the fixture is self-contained); parse with Asciidoctor in node (no dependency in `package.json`; the text checks are enough for ids and headings); a Java test (the Java job builds the whole jar for a text check).
  - `Tradeoffs:` a fixture is a second copy of the ids and goes stale if a section is removed on purpose: the test then fails and the fixture is edited in the same commit, which is the point.
  - `Linked PRD IDs:` REQ-1, REQ-2.

- `DEC-7 — The move is checked by a line-multiset comparison and the record lists every difference`
  - `Decision:` The run writes a throw-away script (scratchpad, not committed) that reads the base file and the new file and checks that, after removing the lines that start with `//`, the lines that are `[[...]]` anchors or headings (compared without their `=` prefix) and blank lines, the multiset of remaining lines is identical except for the lines of DEC-3 and DEC-5; and that the count of lines that match `asciidoctor: (WARNING|ERROR|INFO)` of the build, before and after, is listed (REQ-3); and that every heading of the base file is present in the new file with its title unchanged and a level that is the one in DEC-2. The run record has one table: each block moved (base lines, new part, level change), the `//` lines deleted (a count), and, for DEC-3, DEC-4 and DEC-5, each paragraph added, changed or deleted, with the old and the new text.
  - `Rationale:` REQ-6 asks the record to list each moved or changed paragraph so a reviewer can check the rest is identical; a multiset comparison proves it for 3942 lines faster than a read.
  - `Alternatives considered:` `git diff --color-moved` (useful to the reviewer, but it proves nothing and gives no list); a read of the whole file (not repeatable).
  - `Tradeoffs:` the script is not kept; its result is in the record and the same property is partly kept by DEC-6.
  - `Linked PRD IDs:` REQ-2, REQ-3, REQ-6.

# Repository Impact

- `IMP-1 — The manual`
  - `Path(s):` `src/doc/README.adoc`
  - `Change type:` modify (large, a move; about 150 lines removed or added, the rest moves)
  - `Why impacted:` REQ-1 to REQ-7, DEC-1 to DEC-5.
  - `Linked PRD IDs:` REQ-1 to REQ-7
  - `Risks / notes:` the header (`:doctype: book`, `:toclevels: 1`); six part headings; heading levels of four blocks (DEC-2); the one mapping paragraph; the fixes of DEC-5; the deleted drafts. The nine tests that read it as text keep passing (CON-1, CON-2).

- `IMP-2 — The anchor test and fixture`
  - `Path(s):` `src/test/javascript/manual-skeleton.test.js`, `src/test/javascript/manual-anchors.json`
  - `Change type:` additive
  - `Why impacted:` REQ-1, REQ-2; DEC-6.
  - `Linked PRD IDs:` REQ-1, REQ-2
  - `Risks / notes:` formatted by Prettier and linted (CON-7); picked up by `npm run test:unit`; the Page job runs it. The fixture is JSON, so it is not shipped as a manual example.

- `IMP-3 — The run record`
  - `Path(s):` `docs/wav/wav-030-pages-ci-and-toolbar/run/run-0213-manual-skeleton/run-0213-manual-skeleton.md`
  - `Change type:` modify
  - `Why impacted:` REQ-3, REQ-6: the warnings before and after, the move table, each changed paragraph, the reading of the gate's `^= ` (Q-1), and the checks that were by eye (render).
  - `Linked PRD IDs:` REQ-3, REQ-6
  - `Risks / notes:` none.

# Canonical Impact

`None`. The model of ArchiCode in `docs/architecture/` has no element for the manual (the task checks `grep -ril "README.adoc\|src/doc" docs/architecture`; an element with `tags.path` `src/doc` would be `CI-arc-1`, and none is expected). No domain register is declared. If the check finds one, the run adds the element id here and in the record, and runs `npm run sample:build` as the root `CLAUDE.md` says.

# Data Model and Contracts

- `CTR-1 — The shape of the manual`
  - `Current contract:` an `article` of 11 `==` sections, `:toclevels: 3`, parts none; read by the Pages publish step as one file (`src/doc` built to `target/generated-docs`, published at `docs/`).
  - `Proposed contract:` a `book` of six `=` parts holding the chapters of DEC-2, `:toclevels: 1`; the file name, the output name (`index.html`) and the address `docs/` are the same.
  - `Affected files:` `src/doc/README.adoc`; read by `pom.xml` (the plugin's `sourceDirectory` and `outputFile`, unchanged), `src/site/index.html` (links), `ci-build.yaml` (the copy of `target/generated-docs` to `target/site/docs`, unchanged).
  - `Migration or compatibility notes:` additive for readers; the six parts are new top-level entries. Nothing is removed from the output except the `//` comments, which never rendered.
  - `Linked PRD IDs:` REQ-1, REQ-4.

- `CTR-2 — The anchors of the manual`
  - `Current contract:` 91 explicit anchors (ASM-2) plus the generated ids of the untitled-id headings; used by `docs/#<id>` links from the page, the editor (`DOC_LINKS`), the release notes, and readers.
  - `Proposed contract:` the same 91 explicit anchors, each on the same block; the generated ids unchanged (ASM-3); the six parts add generated ids `_start_here`, `_tutorials`, `_how_to_guides`, `_reference`, `_concepts`, `_upgrading` (none collides with an existing id: the task checks the HTML). The fixture of DEC-6 is the list.
  - `Affected files:` `src/doc/README.adoc`, `src/test/javascript/manual-anchors.json`.
  - `Migration or compatibility notes:` an id never moves to another page; it moves inside the one page.
  - `Linked PRD IDs:` REQ-2.

# Interfaces and Behavior

- `IF-1` The manual at `docs/`: one HTML page, the table of contents on the left with the six parts and their chapters; an old `docs/#id` lands on the same text.
- `IF-2` `archicode --help` is the source of the Commands intro of DEC-5 (b); no command changes.
- Error states: a broken `<<id>>` is rendered by Asciidoctor as `[id]` with an INFO line (`possible invalid reference`); the count of DEC-7 and the anchors test catch it.

# Flows and Processing Logic

- `FLOW-1 — The move`
  - `Trigger:` the task starts, with the base file `ff3bacd:src/doc/README.adoc` and the nine reading tests passing.
  - `Steps:` (1) run the build and save the warning count, the set of generated ids and the title list of the unmodified file; write the fixture of ids from the base file; (2) cut the base file at its headings into the blocks of DEC-2 with a script; (3) write the new file: header, parts, blocks in order, levels changed; (4) delete the `//` lines, write the mapping paragraph, apply the four fixes of DEC-5, read the position words of the moved blocks; (5) run the comparison of DEC-7, the node tests, the build, the render; (6) write the record.
  - `Branches / failure paths:` the comparison shows a line that is not accounted for: restore it from the base; a warning count above the baseline: find the line (a level jump or a part with no chapter) and fix; a generated id changes (ASM-3): add the explicit anchor `[[old_id]]` above that heading, which keeps the address and is listed.
  - `Final output / rendered result:` the manual in six parts with every address kept.
  - `Linked PRD IDs:` REQ-1 to REQ-6.

# Reliability, Performance, and Scalability

- The file stays one file of about 3800 lines; the HTML build takes the same time (about 17 s for the whole `generate-resources` on this machine).
- The risk of a lost line is the one that matters: DEC-7 (multiset) and DEC-6 (anchors, drafts, parts) are the controls, both repeatable.
- Asciidoctor sections must not skip a level (`=` to `===`): the lowered blocks of DEC-2 are all one or two levels up from a parent that exists in the new place, so a part is followed by `==` and a chapter by `===`.

# Security and Privacy

Nothing material: a documentation file and a test. No workspace content of a real user is added (a root rule): the mapping paragraph and the intros use only the names of the tool's own commands and layers.

# Observability and Verification

Run by the task from the repository root, with JDK 25 (`JAVA_HOME=/home/tibo/.sdkman/candidates/java/25.0.4-tem`; the shell default is 21):

1. Before editing: `./mvnw -o generate-resources` and save, outside the repository, the lines that match `asciidoctor: (WARNING|ERROR|INFO)` (DEC-7), `target/generated-docs/index.html` (for the ids) and `git show ff3bacd:src/doc/README.adoc` (for the script). The count of those lines before, listed, is what the record states (0 at the design measure).
2. After: the same build; the lines after are listed and their count is not greater (REQ-3, gate 7); the pairs id to heading text (read `<h[1-6] id=...>text` of both HTML files) after equal the pairs before plus the six part ids, or the differences are listed and justified (ASM-3).
3. `node --test src/test/javascript/manual-skeleton.test.js`, then `npm run test:unit`, `npm run format:check` and `npm run lint` exit 0; `./mvnw test -Dtest=ManualExamplesTest` and `./mvnw test -Dtest=PlateauComparisonTest` exit 0 (gate 6); the nine readers of CON-1 and CON-2 pass unmodified (`git diff --stat` shows them untouched).
4. The gate commands: `grep -n '^= ' src/doc/README.adoc` prints the title then the six parts in order; `grep -c '^// - ' src/doc/README.adoc` prints 0; every id of `git show ff3bacd:src/doc/README.adoc` is defined (the fixture and a one-off script both). The table of contents in the HTML has the top `<ul class="sectlevel0">` with six `<li>` and no `sectlevel2` list (a read of the `#toc`), and the page is opened in the browser pane once, in light and dark, to confirm the contents on the left, the parts as headings and a click on `#plateau-fold` and `#editor-layout` landing on the right text; the record says this check is by eye.
5. The mutation check that the test is not vacuous: delete one anchor and one part heading in a copy and see `manual-skeleton.test.js` fail (run on a copy path via an environment variable or a copy of the test, never by committing a broken file; the record says what was done).
6. `git diff --stat` shows only `src/doc/README.adoc`, the two new test files and the run documents; `git diff ff3bacd -- src/doc/examples` is empty.

# Deployment and Rollout

Content and test only: no data, no service, no pom change. The manual goes live with the next release tag through the existing Pages step (unchanged by this run); the pull request's Java and Page jobs (R-13/R-14 map: `src/doc/README.adoc` runs Java and Page) build it and run the node tests. Compatible: every address works (TG-2). Rollback: revert the commit; the published site keeps the previous release until the next tag.

# Risks and Tradeoffs

- `RISK-1` A generated id changes because a repeated title changes order or a title is touched, and an old `docs/#_composition_2`-style link breaks. Mitigation: ASM-3, the id-to-title comparison, and the `[[old_id]]` fallback in FLOW-1. Such links are unlikely outside the site's own redirect list, which `site.test.js` pins.
- `RISK-2` The book doctype renders the page differently (heading sizes, a different title block) or warns. Mitigation: Observability 2 and 4.
- `RISK-3` A moved passage reads wrongly after the move ("see the section above", "as in the next part"). Mitigation: DEC-4 reads the 118 candidate lines of the moved blocks only and lists each fix.
- `RISK-4` The tests that read the manual as text break on a changed passage (CON-2). Mitigation: passages move byte-identical; the nine tests are run unmodified.
- `RISK-5` W-4 to W-8 re-break the skeleton or the ids. Mitigation: `manual-skeleton.test.js` runs in the Page job for every later run (it may gain ids, never lose one).
- `RISK-6` Reference becomes a long, mixed part and Concepts, How-to guides and Tutorials are thin until W-4 and W-5. Accepted: sorting first is the order of the wave (the wave's Risks, "Moving the file once, first").

# Open Questions

- `Q-1` (settled) Whether `grep -n '^= '` must print only the six parts. It cannot: the document title `= ArchiCode` is also level 0. Decision: the title stays, the six parts follow it, and the record states the reading; `manual-skeleton.test.js` asserts the six after the title. No author input is needed because the gate's intent (the parts and their order) is met either way.
- `Q-2` (settled) Where Domain and Editor go. Decision: Reference (DEC-2). Not a tradeoff that blocks: W-4 may move a plateau piece to Concepts, and a later move of a whole chapter is a one-line change in the test (DEC-6 (6)).
- `Q-3` (settled) Whether the part headings carry an introduction. Decision: none (new prose is W-4 and W-5's).

No question is open and none needs the author.

# Deferred Work

- `DEF-1` Splitting `README.adoc` into one file per part (wave decision D2, decided after the content is sorted and W-4 to W-6 are done).
- `DEF-2` A real part introduction (`[partintro]`) for each part, once the content of W-4 and W-5 exists.
- `DEF-3` A test that renders the manual and checks every `<<id>>` resolves (needs Asciidoctor in node or in the Java job; the warning count of REQ-3 is the stand-in).
- `DEF-4` Moving the plateau pieces of Domain into Concepts (W-4).

# File Placement and Frontmatter

Saved as `docs/wav/wav-030-pages-ci-and-toolbar/run/run-0213-manual-skeleton/tdd-0213-manual-skeleton.md`, with `type: tdd`, `run: 0213`, `wave: 030`, `status: draft`, `owner`, `date` and `related`, as the TDDs of runs 0211 and 0212.
