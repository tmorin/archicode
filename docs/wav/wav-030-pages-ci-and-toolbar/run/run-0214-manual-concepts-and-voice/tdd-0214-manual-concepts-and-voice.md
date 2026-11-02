---
title: Manual concepts and voice
type: tdd
status: draft
run: 0214
wave: 030
owner: tmorin
date: 2026-11-01
related:
  - docs/wav/wav-030-pages-ci-and-toolbar/wav-030-pages-ci-and-toolbar.md
  - docs/wav/wav-030-pages-ci-and-toolbar/wbc-030-pages-ci-and-toolbar.md
  - docs/wav/wav-030-pages-ci-and-toolbar/run/run-0213-manual-skeleton/tdd-0213-manual-skeleton.md
  - src/doc/README.adoc
  - src/test/javascript/manual-skeleton.test.js
  - https://github.com/tmorin/archicode/issues/193
---

# Manual concepts and voice

# Summary

Review pass: done (KDMLLC review of this TDD, run 2026-11-01 in a different agent from the drafter, so it is independent of the drafting; its findings are applied in this version, and the counts were re-measured on the base copy). Q-1 is open and is the blocker for the wave manifest: seven lines of the manual hold a gate word inside a listing or a code span and cannot lose it, so the first criterion of gate P2 must read "outside listings and code spans" (or "prints 7"); the run proceeds on that reading.

Run 0213 sorted `src/doc/README.adoc` into six parts. Two pieces about plateaus are still in two places: `==== Plateaus` and `==== Comparing two plateaus` under Reference, Domain, Workspace (about 265 lines), and `== States of an architecture (plateaus)` under Concepts (about 135 lines, with `== Limits of today` after it). This run puts them on one page, `== Plateaus`, under Concepts, in the voice of decision D3 (direct, second person, one idea per sentence, one word per thing). It also removes the filler intros and the filler words from the whole manual, because the gate of phase P2 reads the whole file. It changes no id, no command, no listing, no table and no example.

There is no PRD (profile TDD+pln), so traceability is incomplete: requirements are labelled `REQ-n` from the manifest of wave 030 (row W-4 and the first criterion of gate P2). No diagram: the change edits text inside one file, with no new boundary and no branching flow; the section map is a table (DEC-1).

# Scope

In scope: `src/doc/README.adoc` (the new page, the filler rewrite, the pointers that change), `README.md` (one sentence that names the old title, IMP-4), one new node test `src/test/javascript/manual-voice.test.js`, an addition to the comment of `src/test/javascript/manual-skeleton.test.js` only if its checks need it (DEC-7), the run record.

Out of scope: the missing pages (the CI and the agent how-tos, W-5), the topics of Best Practices that Q2 drops (W-5, DEC-5 keeps them untouched), the generated command reference (W-6), the editor chapters, the Commands content beyond its filler sentences, any change to `src/doc/examples/**`, to an `include::`, to a listing or to a table, and any new fact: a sentence is rewritten, not corrected, unless DEC-4 lists it.

# PRD Traceability

No PRD. Requirements assumed from the wave manifest.

- `REQ-1` (W-4 scope): one page of Concepts for plateaus replaces the two pieces; `grep -c '^=\+ Plateaus$' src/doc/README.adoc` prints 1 and the title sits under the part Concepts. Addressed (DEC-1, DEC-2, CTR-1).
- `REQ-2` (W-4 scope and gate P2, first criterion): every id of `git show ff3bacd:src/doc/README.adoc` is still defined; the `<<id>>` links still resolve. Addressed (DEC-3, CTR-2).
- `REQ-3` (W-4 scope): the voice of D3 on that page: direct, second person, one idea per sentence, one word per thing (plateau, layer, view, viewpoint, sample, workspace). Addressed (DEC-4, DEC-6).
- `REQ-4` (W-4 scope and gate P2): the filler intros are rewritten and `grep -ciE 'journey|prowess|delve|unlock' src/doc/README.adoc` reaches the count the gate wants. Partly addressed: seven lines, four distinct strings, cannot go (ASM-6, DEC-5; Q-1 is open, blocker for the wave manifest, the gate text needs the author's amendment: "outside listings and code spans", or "prints 7").
- `REQ-5` (wave Risks, "Voice is a judgement"): the review of the voice is a reader reading the page, and the only test is the filler-word grep. Addressed (DEC-7, Observability).
- `REQ-6` (decision of this run, not of the wave): a plateau is never called a state; "state" belongs to the marks of a comparison. Addressed (DEC-6).

# Technical Goals

- `TG-1` A reader who asks "what is a plateau and how do I use it" finds one page, in the order of use: the idea, the files, the patches, the choice of a plateau, the comparison, the replaces, the checks.
- `TG-2` Every address that works today still works, and every `<<id>>` of the manual points to the same text or to the page that now holds it (ASM-3).
- `TG-3` No fact is lost in the rewrite: the code spans, the numbers and the `<<id>>` links of the two old pieces all appear on the new page, or the record lists the one that went and why (DEC-4).
- `TG-4` The filler words of the manual are counted by a test that the Page job runs, so a later run cannot bring them back (DEC-7).

# Non-Goals

- No new section of content: the page is made of the sentences of the two old pieces, rewritten and sorted.
- No rename of a heading that has an explicit id, and no removal of an id (ASM-3).
- No change to the tutorials, the Reference chapters Application Layer to Technical Configuration, the Editor and the Commands beyond the sentences DEC-5 lists.
- No glossary section: the glossary of DEC-6 is the rule of the run and lives in this document and the record, not in the manual (a new page would be W-5 scope).
- No test of the voice beyond a word list: sentence length and person are read, not computed (Voice is a judgement).

# Assumptions

- `ASM-1` The file at the start of the task is the result of run 0213, uncommitted (`git status` shows `src/doc/README.adoc` modified; the Concepts part starts at line 3495 and the Domain plateau pieces at 1160 and 1384 in the 3770-line file read for this design). The task saves a copy of it outside the repository before editing and uses that copy, with `git show ff3bacd:src/doc/README.adoc`, as the base of every comparison. If the line numbers differ the task cuts at the headings, not at the numbers.
- `ASM-2` The 91 explicit ids of `src/test/javascript/manual-anchors.json` are all defined at the start of the task (`node --test src/test/javascript/manual-skeleton.test.js` passes). The 14 explicit ids that live in the two pieces are `plateaus`, `plateau-header`, `plateau-untied`, `plateau-manifest`, `plateau-patches`, `plateau-cascade`, `plateau-choose`, `plateau-comparison` (Domain) and `plateaus-overview`, `plateau-state-tags`, `plateau-replaces`, `plateau-candidates`, `plateau-replaces-warnings`, `plateau-limits` (Concepts); the task re-checks the count with `grep`.
- `ASM-3` A heading with no explicit id gets a generated id from its title, and a repeated title takes a number by order of appearance. After the move, the Domain `Comparing two plateaus` is no longer before the Editor's one: Concepts comes after Reference, so the Editor one is now first and takes `_comparing_two_plateaus`, the Concepts one takes `_comparing_two_plateaus_2`. The two generated ids swap. Both sections have an explicit id (`plateau-comparison`, `editor-compare`), which is the address the site, the editor and the manual use; the swap is listed in the record (RISK-1). The headings `The idea`, `The layout`, `The settings in short` and `The states` have no explicit id and their generated ids (`_the_idea`, `_the_layout`, `_the_settings_in_short`, `_the_states`) change with the titles DEC-1 gives; no file of the repository links to them (the task confirms with `grep -rn '#_the_' src`).
- `ASM-4` The `:doctype: book` build of run 0213 emits no Asciidoctor line (WARNING, ERROR, INFO) beyond its recorded baseline; this run's count after is not greater than the count at its start (the same measure, DEC-7). Asciidoctor needs no level jump: the new page is `==` with `===` chapters and `====` only where `===` has a child, as in the old pieces.
- `ASM-5` The nine readers of the manual as text (`site.test.js`, `help.test.js`, `settings-help-anchors.test.js`, `distinct-dashes.test.js`, `example-identity.test.js`, `replaces-editor.test.js`, `move-editor.test.js`, `PlateauComparisonTest.java`, `manual-skeleton.test.js`) read fixed strings. The ones that touch this run's text are: the warning plus table sample (`PlateauComparisonTest`, `REPLACES_WARNING + "\n" + REPLACES_AFTER_BEFORE`), the sample of `diff` on the example (quoted twice, in the tutorial and under `diff`, both outside this run's text), the table rows `| removed |`, `| moved |`, `| split |`, `| merged |` (`distinct-dashes.test.js`) and the block that starts `comparing to-be (To be) with baseline (As is)` (`example-identity.test.js`). These lines are copied byte for byte (DEC-4).
- `ASM-6` `grep -niE 'journey|prowess|delve|unlock' src/doc/README.adoc` hits 33 lines on the base copy: 26 outside listings and code spans (the worklist of DEC-5) and 7 inside them, which cannot lose the word. The seven lines are 442, 1852, 2897, 3044, 3047, 3712 and 3735, with four distinct strings: `journey` (442, 3712, 3735: the error text `write a plain word, such as `journey``, quoted from `FacetNames.java` line 26 and `src/main/editor/model/settings.js`; 442 and 3712 are the two quoted messages, 3735 is a listing line), `order_journey` (1852), `01-shop_overview-journey` (2897) and `seller_journey` (3044, 3047, the id of a story of the layered Brightcart, `src/test/resources/brightcart/layered/shared/story.seller_journey.yaml`, in a listing and in one sentence). Each is a quote of something the tool says or of a fixture of the repository, so no message and no fixture changes. The task confirms the counts (33, 26, 7) with `grep -c` and the script of task-002 after the rewrite, and that each remaining line is inside a listing or a code span.

# Constraints

- `CON-1` `src/site/index.html` and `src/main/editor` link to `docs/#<id>` for explicit ids; `site.test.js` and `help.test.js` fail if one is lost. `[[plateaus]]`, `[[plateaus-overview]]` and the rest of ASM-2 are among them or are linked inside the manual.
- `CON-2` No command changes, so `--help` and the messages quoted in listings stay as they are: the manual quotes `FacetNames.ADVICE`, the `settings.plateaus` error line, the patch errors and the warnings, byte for byte. A sentence that quotes a message is not "voice": it is a quote.
- `CON-3` An anchor line `[[id]]` is attached to the block that follows it, and a section has one id. `[[plateaus]]` goes above `== Plateaus`; `plateaus-overview` becomes an inline anchor with a reference text at the start of the first paragraph, as `[[fold-by-hand]]` already is inside a list item (DEC-3).
- `CON-4` `W-5` and `W-6` edit the same file after this run and read `[[commands]]`-level ids and the Best Practices part; this run keeps them (DEC-5).
- `CON-5` The root `CLAUDE.md` forbids a wave or run id in a `CLAUDE.md` sentence; no `CLAUDE.md` is edited. `docs/CLAUDE.md` named by the skill does not exist here; the conventions followed are the root `CLAUDE.md` and the documents of runs 0211 to 0213.
- `CON-6` `scripts/changes.mjs` sends `src/doc/README.adoc` to Java and Page, and a new file under `src/test/javascript/` runs Page; no change to the map.
- `CON-7` `npm run format:check` and `npm run lint` cover the new test (`src/test/javascript/**/*.js`); the `.adoc` is not read by Prettier.
- `CON-8` The root `CLAUDE.md` rule: no real workspace content in the repository. The page uses the example `domain_plateaus` (an invented bookshop) and the layered Brightcart names that the manual already uses, nothing else.

# Current State

- Reference, Domain, Workspace holds `[[plateaus]] ==== Plateaus` (line 1160 at the design) up to `[[plateau-comparison]] ==== Comparing two plateaus` (1384) and its end at 1425. The first piece opens with a note ("There is no `settings.plateaus` any more", with the error line), the example `domain_plateaus` and its folders, then bold lead-ins with ids: the header (`plateau-header`), views and stories (`plateau-untied`), the manifest of a plateau (`plateau-manifest`, a table), what is checked (seven `error:` lines, two more, "One cause, one line", four `warning:` lines and four bullets), the patches (`plateau-patches`, two tables, a YAML sample, "Taking a field out", eleven `error:` lines, "stale patch"), the cascade (`plateau-cascade`, a sample), the choice of a plateau (`plateau-choose`, `--plateau`, `plateau list`, `--against`, `settings.manifests.paths`, a breaking-change note). The second piece says what counts as a change, how the views mark it (a four-column table that `distinct-dashes.test.js` reads), the stereotypes and a `styles` sample. The paragraph before it (line 1157, "Incorporating workspaces and manifests ... Let's explore further") is filler that ends the Workspace chapter.
- Concepts (line 3495) holds `[[plateaus-overview]] == States of an architecture (plateaus)`: a paragraph that is one sentence of 160 words made of links, an IMPORTANT note (the same breaking changes as the Domain note), `=== The idea`, `=== The layout`, `=== The settings in short` (a table), `=== The states` (a table of seven rows: state, mark, means) and the paragraph on the stereotypes (`plateau-state-tags`, a warning line), `=== Saying what an element replaces` (`plateau-replaces`, the example inventory, three bullets, `plateau-candidates`, `plateau-replaces-warnings`, five bullets, a warning line, the composition of the `replaces` of the layers, what the command line shows), then `[[plateau-limits]] === Limits of today` (plateaus, reading and writing files, the command line, the phone). `= Upgrading` follows, with `[[plateaus-upgrade]]` whose first paragraph says the `settings.plateaus` key is "refused with the one line quoted in <<plateaus>>".
- The two pieces repeat each other: the breaking-change note exists twice (Domain note, Concepts IMPORTANT), the settings are told twice (`plateau-choose` and "The settings in short"), the states are told twice (the "Means" table and the "How the views say it" table; different columns), and the intro of Concepts promises "the story in one place, from the idea to a review of the changes", which is the tutorial of the Tutorials part.
- Filler: `grep -ciE 'journey|prowess|delve|unlock' src/doc/README.adoc` prints 33 on the base copy: 7 lines inside listings or code spans (ASM-6) and 26 outside them, by part: Introduction 1 (line 18), Tutorials 8 (111, 186, 499, 531, 597, 601, 606, 609: the ecommerce intro and steps, the facets steps and the closing blocks), Best Practices 6 (894, 908, 914, 916, 926, 930: the welcome paragraph, the closing paragraph and four bullets), Domain 8 (994, 1002, 1432, 1524, 1530, 1611, 1636, 1668: the intros of the chapters and four bullets) and Commands 3 (2737, 2825, 3131). The Features section holds none. The wider list B of DEC-5 finds 49 more lines outside listings and code spans that carry no gate word (66 lines carry a word of B, 17 of them also carry a gate word).
- Stale: the sentence added by run 0213 to the Introduction ("Let's explore how ArchiCode can elevate your architecture-as-code journey") is itself filler and contains two gate words.
- The build: `./mvnw -o generate-resources` converts the file with `asciidoctor-maven-plugin` to `target/generated-docs/index.html`; the baseline of Asciidoctor lines is the record of run 0213 ("after"), re-measured at the start of this task.

# Proposed Design

One new page, built from the sentences of the two old pieces, in the order of use, rewritten sentence by sentence, with the filler rewritten across the whole manual by a worklist. The work is done by hand with the help of three scripts in the scratchpad (a section splitter, a fact comparison, a gate-word lister); none is committed.

- `DEC-1 — One page, `== Plateaus`, in Concepts; Limits of today stays its own chapter`
  - `Decision:` The Concepts part becomes two chapters: `[[plateaus]] == Plateaus` and `[[plateau-limits]] == Limits of today` (one level up from `===`, id kept, text kept apart from voice edits). `== Plateaus` takes the sentences of both old pieces in this order, each `===` a chapter of the page; headings in the new column have no explicit id unless the old block had one:

    | Section of the page | Made from | Ids it holds |
    |---|---|---|
    | (opening) | the first paragraph of the Concepts piece, cut to what a plateau is and a short list of where the tutorial, the commands and the editor are | `plateaus` (on the section), `plateaus-overview` (inline, with the reference text `Plateaus`) |
    | `=== The idea` | `The idea` of Concepts and the first paragraph of the Domain piece | none |
    | `=== The files of a plateau` | the example and folders (`.archicode.yaml`, the tree and its callouts), "The folders are only a habit", the header, views and stories, the manifest of a plateau | `plateau-header`, `plateau-untied`, `plateau-manifest` |
    | `=== Mistakes and warnings` | "What is checked", "One cause, one line", "Warnings" with their listings and bullets, moved whole | none |
    | `=== The patches` | the patches, the two tables, the YAML sample, "Taking a field out", the errors, the stale patch, the cascade of the removals | `plateau-patches`, `plateau-cascade` |
    | `=== Choosing a plateau` | `plateau-choose`, `plateau list`, `--against`, and "The settings in short" merged in (each setting once) | `plateau-choose` |
    | `=== Comparing two plateaus` | the Domain section of that name, then "The states" (the table of meanings) and the stereotypes paragraph; the look table stays where `distinct-dashes.test.js` reads it | `plateau-comparison`, `plateau-state-tags` |
    | `=== Saying what an element replaces` | the Concepts section of that name, with its ids | `plateau-replaces`, `plateau-candidates`, `plateau-replaces-warnings` |

    The Domain Workspace chapter loses both pieces and ends with one sentence that links to `<<plateaus>>`; the filler paragraph that ended it (line 1157) is deleted with it.
  - `Rationale:` the gate asks for one section titled `Plateaus`; the order of use is idea, files, the mistakes the files can have, the patches, the choice, the comparison, `replaces` (a reader writes the files before comparing them). The tutorial (Tutorials part) already tells the story from the idea to a review, so the opening does not tell it again. Limits of today is about the editor save, the command line and a phone as much as about plateaus; a chapter of its own keeps `== Plateaus` one subject and keeps the id and its anchor lines intact.
  - `Alternatives considered:` keep the Domain half as a Reference chapter and write a thin Concepts page that links to it (does not meet "one page about plateaus", and the gate counts one section titled Plateaus, which a pointer would be); put Limits of today inside the Plateaus page as `===` (it is not only about plateaus, and the page would end on the phone); split into three pages (more ids to keep and a second heading `Plateaus`-like titles; D2 of the wave keeps one file but not one page per chapter); one `==` per old piece (two pages, the problem of this run).
  - `Tradeoffs:` the page is long (about 330 lines after cuts, from about 400) and the table of contents, one level deep, shows it as one entry; its `===` chapters are the way in. Reference loses its plateau chapters, so a reader who looks up the keys of the manifest of a plateau finds them in Concepts, one link from Workspace (DEC-2).
  - `Linked PRD IDs:` REQ-1, REQ-3.

- `DEC-2 — Reference keeps a pointer where the plateau pieces were`
  - `Decision:` The Workspace chapter of Domain ends, in place of the filler paragraph and the two pieces, with one sentence: where plateaus are described (`<<plateaus,Plateaus>>`), and that `settings.manifests.paths` and the files of a workspace are in the sections above. `Manifests in folders` (`manifests-folders`) is not changed except for its links.
  - `Rationale:` Domain is the place a reader looks up a key; a plateau is now a concept with keys, so the pointer is where the lookup lands. The gate allows no second `Plateaus` heading, so the pointer is a sentence, not a section.
  - `Alternatives considered:` a heading `Plateaus in short` (reads as a second page and would be found by the same grep family); nothing at all (a lookup in Domain finds nothing).
  - `Tradeoffs:` one extra hop for a reader of Reference.
  - `Linked PRD IDs:` REQ-1.

- `DEC-3 — Every id is kept, `plateaus-overview` becomes an inline anchor, and the dropped generated ids are listed`
  - `Decision:` Nothing in ASM-2's list is removed, renamed or duplicated, and the 91 ids of the fixture stay (the test of run 0213 enforces it). `[[plateaus]]` above `== Plateaus`; `[[plateaus-overview,Plateaus]]` at the start of the first paragraph (inline, with a reference text so that a link without text reads "Plateaus"). Every `<<plateaus-overview>>` and `<<plateaus>>` link (17 at the design) keeps working, and a link whose text says "in the Domain section", "above", "below" or "in the next part" is rewritten (the task lists each, bounded to the sentences of the moved blocks and to the links to them). The new `===` headings get generated ids that must not collide with an existing one (checked in the built HTML, DEC-7). The old generated ids that go (ASM-3) are listed in the record.
  - `Rationale:` explicit ids are the contract (CON-1); generated ids are an accident that no file of the repository uses.
  - `Alternatives considered:` an explicit `[[_the_idea]]` anchor above each renamed heading (keeps addresses nobody links to and puts ids into the fixture for nothing); keep the old titles (`The states` would contradict DEC-6).
  - `Tradeoffs:` an external link to an old generated id lands on the top of the page; unlikely (ASM-3), and the `docs/#id` redirects the site pins are explicit ids.
  - `Linked PRD IDs:` REQ-2.

- `DEC-4 — Sentences are rewritten, facts are copied, and a script proves no fact is lost`
  - `Decision:` The rewrite works paragraph by paragraph from the base copy. A listing (`----`, `[source]`), a table and a quoted message are moved byte for byte, with the lines of ASM-5 pinned. In prose: one idea per sentence (cut a sentence at "and" when it carries two), second person for what the reader does ("You write", not "the author writes" or "one writes"), the present tense, no sentence that says what the next sentence will say. Three paragraphs are merged away: the second breaking-change note (the one on the page keeps a link to `plateaus-upgrade`; the Domain NOTE with the `settings.plateaus` error line moves into the Upgrading chapter, at the start of `plateaus-upgrade`, where its first paragraph ("quoted in <<plateaus>>") is changed to "quoted below"), the settings listed twice (DEC-1), and the "story in one place" promise. A script in the scratchpad lists, for the base copy and the new file, the sets of code spans, `<<id>>` targets, numbers and listing blocks of the two pieces; the task shows that the new page's sets contain the old ones, and lists each item that is gone with the reason (the two merged notes are the expected ones). The record lists each paragraph with its old and new first words, not its whole text.
  - `Rationale:` the voice cannot be tested (REQ-5), but a lost fact can: code spans, links and numbers are where this manual keeps its facts.
  - `Alternatives considered:` rewrite the page from scratch (loses facts the tests pin and the editor links read); only fix the gate words (does not meet "read one page ... in a plain direct voice"); diff the files by hand (the pieces are re-sorted, so a line diff shows everything).
  - `Tradeoffs:` the script compares the set of items, not their sentence; a fact stated only in prose ("the last one wins") is checked by the reader reading the page, as Voice is a judgement says.
  - `Linked PRD IDs:` REQ-2, REQ-3, REQ-5.

- `DEC-5 — The filler words go from the whole manual, by a worklist, with the Best Practices topics left for W-5`
  - `Decision:` Three lists, measured on the base copy at the start of the task and kept in the record: (A) the gate words `journey|prowess|delve|unlock` (case-insensitive) outside listings and code spans; (B) the other filler words `empower|embark|elevate|seamless|realm|intricate|pivotal|let's|tapestry|in essence|leverage` outside listings and code spans; (C) the paragraphs that are only a welcome or a conclusion (the Introduction's last paragraph, the closing "Conclusion" and "Reflecting on the Journey" / "Your Journey Awaits" blocks of the two tutorials, the opening and closing paragraphs of Best Practices and of Domain chapters). Each hit of A and B is rewritten to say what the sentence meant in plain words, or the sentence is deleted when it says nothing a reader can use; each paragraph of C is cut to one or two sentences or deleted. Words that are plain English and sometimes real (`navigate`, `comprehensive`, `harness`, `orchestrat`) are looked at but not counted. In Best Practices, six lines carry gate words (894, 908, 914, 916, 926, 930), and every sentence that carries one is rewritten: the welcome paragraph becomes one sentence that says what the part holds, the closing paragraph is deleted, and the four bullets that carry a gate word lose the word and keep their fact; the six-item list of topics (including Diagrams Styling, Label Formatting and CI/CD Integration) stays exactly as it is for W-5, which drops the promises (Q2) and names them in its record. The rewrite of the other filler of the bullets is W-5's (it changes the same lines). The Commands sentences with `unlocks` (View generation, JSON Schema) are rewritten, no more. The Introduction paragraph added by run 0213 is rewritten to one plain sentence that names the six parts.
  - `Rationale:` the gate reads the whole file, so the voice pass cannot stop at plateaus; the word lists make the worklist finite and repeatable, and list C is where filler lives as text with no word to grep. Leaving the Best Practices list alone keeps Q2 with the run that owns it.
  - `Alternatives considered:` change only the gate words (leaves the filler: "unlock" replaced by "open" in the same empty sentence); rewrite every paragraph of the manual in D3's voice (the manual is 3770 lines, the gate asks for the plateau page and the words; a full rewrite is a wave of its own, and the risk of losing facts goes up); drop the Best Practices bullets here (Q2 says W-5 does it and names it).
  - `Tradeoffs:` about 100 lines are touched outside the plateau page, so the diff is wide; each one is a sentence with no fact in it, and the record lists them by line number and first words so a reviewer can scan. The Best Practices intro and its bullets disagree in tone for one run.
  - `Linked PRD IDs:` REQ-4.

- `DEC-6 — One word for one thing, with a short glossary applied to the touched text`
  - `Decision:` The glossary of the run: *plateau* (one layer of the architecture over the plateau it overrides; never "state", "stage", "snapshot", "version" or "scenario" for it), *layer* (the word that defines a plateau; the application layer and the technology layer of the domain are *layers* too, the manual already says "layer" for both and the page says which when it could be read either way), *change state* or just *state*, only for the marks `new`, `changed`, `removed`, `contains-changes`, `moved`, `split` and `merged` of a comparison (the product's own word), *view* (a diagram a manifest of kind view or a command draws), *viewpoint* (the way a view is assembled: `overview`, `detailed`, `deep`, `map`), *sample* (a bundle the hosted editor opens, `sample=brightcart`, `sample=archicode`), *example* (a folder under `src/doc/examples` that the manual quotes), *workspace* (the folder with `.archicode.yaml` and its manifests; never "project" for it, except as the literal `project_dir` of the folder listing). The words of the glossary are used in the sentences this run writes or rewrites; the task greps the base copy for the variants (`snapshot`, `scenario`, `project`, `diagram` for a view, `sample` for an example) and rewrites the ones in the touched text. A variant that stays in text the run does not touch (the Editor, the Commands) is left and listed.
  - `Rationale:` the wave names the six words (D3); "state" is the product's word for the marks (the `state` of a row in `archicode diff`, the stereotypes), so it is kept for them and taken away from the plateau, where the two meanings met in the old title.
  - `Alternatives considered:` call the marks "change marks" (the CLI and the editor say "state": the manual would disagree with the program); a glossary section in the manual (new content, W-5's pages).
  - `Tradeoffs:` the Editor and Commands chapters, untouched, keep their own variants until a later run.
  - `Linked PRD IDs:` REQ-3, REQ-6.

- `DEC-7 — One node test, `manual-voice.test.js`, keeps the checks a script can keep`
  - `Decision:` Add `src/test/javascript/manual-voice.test.js`, in the style of `manual-skeleton.test.js` (it reads `src/doc/README.adoc` as text, strips listing blocks between `----` lines, `[source]` blocks and inline code spans, then checks): (1) the gate words of DEC-5 list A are absent, so the count outside literals is 0; (2) list B words are absent; (3) exactly one line matches `^=+ Plateaus$`, it is `==` and under the part Concepts, and `Limits of today` is the other `==` of that part (after `Plateaus`); (4) no `Plateaus` or `Comparing two plateaus` heading sits in Reference, Domain; (5) the ids of the page appear in this order after `[[plateaus]]`: `plateau-header`, `plateau-untied`, `plateau-manifest`, `plateau-patches`, `plateau-cascade`, `plateau-choose`, `plateau-comparison`, `plateau-state-tags`, `plateau-replaces`, `plateau-candidates`, `plateau-replaces-warnings`, and all of them are before `[[plateau-limits]]`; `plateaus-overview` is defined once, inline; (6) the page does not say "state of an architecture", "states of an architecture" or call a plateau a state (a regex on the page's text: `plateaus? (is|are) (a |an |the )?states?`, and the old title); (7) no `<<id>>` of the manual is rendered by the pointer words "in the Domain section"; (8) `Pluggable Viewpoint Service` stays absent (already in the skeleton test). It does not check sentence length or person. The mutation check is run on a copy (Observability 5). If `manual-skeleton.test.js` has the count of anchors fixed at 91 and this run adds none, it is not touched.
  - `Rationale:` the gate grep is a command run once; a test keeps it true for W-5 to W-8, which edit the same file; the glossary and order are the cheap structural checks; the voice stays a reading (REQ-5).
  - `Alternatives considered:` add the checks to `manual-skeleton.test.js` (one file for two runs' decisions; the skeleton test is the anchor contract and should stay small); a shell grep in the Page job (not run by `npm run test:unit` and not by a developer); parse the adoc with Asciidoctor in node (no dependency in `package.json`; text checks are enough for headings and words).
  - `Tradeoffs:` list B is a choice: a word on it that is right somewhere is a false failure; the list holds only words with no technical sense, measured on the base copy first.
  - `Linked PRD IDs:` REQ-1, REQ-4, REQ-5, REQ-6.

# Repository Impact

- `IMP-1 — The manual`
  - `Path(s):` `src/doc/README.adoc`
  - `Change type:` modify (the two pieces are cut and re-sorted into one page; about 400 lines become about 330; about 100 further lines of filler are rewritten or deleted across the file; one note moves to the Upgrading chapter; one sentence replaces the old pieces in Domain)
  - `Why impacted:` REQ-1 to REQ-6, DEC-1 to DEC-6.
  - `Linked PRD IDs:` REQ-1 to REQ-6
  - `Risks / notes:` the nine tests that read it as text keep passing (ASM-5); the lines of ASM-5 are byte for byte; no `include::` or listing changes.

- `IMP-2 — The voice test`
  - `Path(s):` `src/test/javascript/manual-voice.test.js`
  - `Change type:` additive
  - `Why impacted:` REQ-1, REQ-4, REQ-5, REQ-6; DEC-7.
  - `Linked PRD IDs:` REQ-1, REQ-4, REQ-5, REQ-6
  - `Risks / notes:` formatted by Prettier and linted (CON-7); picked up by `npm run test:unit`; written first and red on the base copy (the words, the heading, the order), green at the end.

- `IMP-3 — The run record`
  - `Path(s):` `docs/wav/wav-030-pages-ci-and-toolbar/run/run-0214-manual-concepts-and-voice/run-0214-manual-concepts-and-voice.md`
  - `Change type:` modify
  - `Why impacted:` REQ-2, REQ-4: the Asciidoctor lines before and after, the generated ids that change, the fact-comparison result, the list of paragraphs touched, the seven lines and four strings of Q-1, the glossary variants left, and what was read by eye.
  - `Linked PRD IDs:` REQ-2, REQ-4
  - `Risks / notes:` none.

- `IMP-4 — The root README`
  - `Path(s):` `README.md`
  - `Change type:` modify (one sentence)
  - `Why impacted:` line 37 ends with `See "States of an architecture (plateaus)" in the manual.`, the old title that DEC-1 removes; no other file of `src` or the root quotes it (checked with `grep -rn`; the run records under `docs/wav` are history and stay).
  - `Linked PRD IDs:` REQ-1, REQ-6
  - `Risks / notes:` the sentence names the title `Plateaus`; no test reads `README.md`; the manual stays the source.

# Canonical Impact

`None`. The model of ArchiCode in `docs/architecture/` has no element for the manual (the task checks `grep -ril "README.adoc\|src/doc" docs/architecture`; an element with `tags.path` `src/doc` would be `CI-arc-1`, and none is expected). No domain register is declared. If the check finds one, the run adds the element id here and in the record.

# Data Model and Contracts

- `CTR-1 — The shape of the Concepts part`
  - `Current contract:` the part Concepts holds one chapter `== States of an architecture (plateaus)` with `===` sections, and the Domain chapter of Reference holds two `====` sections about plateaus.
  - `Proposed contract:` Concepts holds `== Plateaus` (eight `===` sections of DEC-1) and `== Limits of today`; Domain holds no plateau section. The table of contents shows two entries under Concepts (`toclevels: 1`).
  - `Affected files:` `src/doc/README.adoc`; read by `pom.xml` (the plugin's sourceDirectory, unchanged) and by the Pages publish step (unchanged).
  - `Migration or compatibility notes:` additive for readers; two headings lose their old generated id (ASM-3).
  - `Linked PRD IDs:` REQ-1.

- `CTR-2 — The anchors of the manual`
  - `Current contract:` the 91 explicit ids of the fixture, 14 of them in the two pieces (ASM-2).
  - `Proposed contract:` the same 91, none moved to another page; `plateaus-overview` is an inline anchor with a reference text; no id is added (the fixture and its test of 91 stay unchanged); the generated ids that change are listed (ASM-3).
  - `Affected files:` `src/doc/README.adoc`, `src/test/javascript/manual-anchors.json` (unchanged).
  - `Migration or compatibility notes:` `docs/#plateaus`, `docs/#plateaus-overview` and the rest land on the same text now on the page.
  - `Linked PRD IDs:` REQ-2.

- `CTR-3 — The vocabulary`
  - `Current contract:` a plateau is also called a state of an architecture in the manual; "state" also names the marks of a comparison.
  - `Proposed contract:` the glossary of DEC-6 for the text this run writes; a plateau is never a state.
  - `Affected files:` `src/doc/README.adoc`; `manual-voice.test.js` pins the old title and the regex.
  - `Migration or compatibility notes:` the program's own words are not changed.
  - `Linked PRD IDs:` REQ-3, REQ-6.

# Interfaces and Behavior

- `IF-1` The manual at `docs/`: Concepts opens with one page about plateaus and the page after it is Limits of today; an old `docs/#id` lands on the same text.
- `IF-2` Domain, Workspace ends with a sentence and a link to the page.
- `IF-3` `archicode` and the editor do not change; the editor's `DOC_LINKS` and the site's links read explicit ids only.
- Error states: a broken `<<id>>` is rendered as `[id]` with an INFO line (`possible invalid reference`); the count of DEC-7 and the skeleton test catch it.

# Flows and Processing Logic

- `FLOW-1 — The page and the filler pass`
  - `Trigger:` the task starts with the file of run 0213 and the readers passing.
  - `Steps:` (1) save a copy of the file outside the repository; run `./mvnw -o generate-resources`, save the Asciidoctor lines and the id-to-heading pairs of the built HTML; run the nine readers; measure lists A, B and C of DEC-5 and the glossary variants of DEC-6; (2) write `manual-voice.test.js` and see it fail on the base copy for the right reasons (words, heading, order); (3) cut the two pieces at their headings with a script, build the page in the order of DEC-1 (listings, tables and quotes copied), then rewrite the prose paragraph by paragraph in the voice of DEC-4; (4) move the `settings.plateaus` note to the Upgrading chapter and fix the sentence that quotes it; replace the two old pieces in Domain with the pointer; (5) work list A and B and list C across the file; (6) run the fact comparison of DEC-4 and the build; (7) run the gates and tests of Observability; (8) read the page once top to bottom as a reader who knows nothing of plateaus and fix what is not plain, then rebuild.
  - `Branches / failure paths:` the fact comparison finds a lost code span: put the fact back in its sentence; a reader test fails on a changed line: restore the line byte for byte; Asciidoctor warns on a level jump or a lost anchor: fix the level or the anchor; a generated id collides: rename the new heading, not the old one.
  - `Final output / rendered result:` one Plateaus page in Concepts, a manual without the filler words, every address kept.
  - `Linked PRD IDs:` REQ-1 to REQ-6.

# Reliability, Performance, and Scalability

- The file stays one file of about 3600 lines; the build takes the same time.
- The risk that matters is a lost fact: DEC-4 (the fact comparison) and the pinned strings of ASM-5 are the controls.
- Asciidoctor sections must not skip a level: the page is `==` then `===`, and the sections that held `====` children keep one level below their `===`.

# Security and Privacy

Nothing material: a documentation file and a test. No content of a real workspace is added (CON-8): the page uses the example `domain_plateaus` and names the manual already uses.

# Observability and Verification

Run from the repository root with JDK 25 (`JAVA_HOME=/home/tibo/.sdkman/candidates/java/25.0.4-tem`; the shell default is 21):

1. Before editing: save the file outside the repository; `./mvnw -o generate-resources` and keep the lines that match `asciidoctor: (WARNING|ERROR|INFO)` and the pairs `<hN id=...>text` of `target/generated-docs/index.html`; `node --test src/test/javascript/manual-skeleton.test.js` passes; the counts of lists A and B and of the glossary variants are written in the record.
2. After: the same build; the Asciidoctor lines after are listed and not more than before; the id-to-heading pairs after equal the pairs before except the ones DEC-3 and ASM-3 list.
3. `node --test src/test/javascript/manual-voice.test.js` passes; `npm run test:unit`, `npm run format:check` and `npm run lint` exit 0; `./mvnw test -Dtest=ManualExamplesTest` and `./mvnw test -Dtest=PlateauComparisonTest` exit 0; `git diff --stat` shows the nine readers untouched.
4. The gate commands: `grep -c '^=\+ Plateaus$' src/doc/README.adoc` prints 1 and the line is under `= Concepts` (`awk` on the line numbers of `^= `); every id of `git show ff3bacd:src/doc/README.adoc` is defined (the fixture test and a one-off script); `grep -ciE 'journey|prowess|delve|unlock' src/doc/README.adoc` prints the count of the lines of ASM-6 (7, each inside a listing or a code span; it is 33 on the base copy), and `grep -niE 'journey|prowess|delve|unlock' src/doc/README.adoc` shows only them; Q-1 is open (blocker for the wave manifest), so this is the count the run proves, not 0.
5. The mutation check that the test is not vacuous: in a copy of the manual (the test reads a path from an environment variable, or the task runs a copy of the test next to a copy of the manual), put back one filler word, a second `== Plateaus`, and swap two of the ids of the page, and see the test fail on each; the record says what was done, nothing broken is committed.
6. The fact comparison of DEC-4: the code spans, link targets, numbers and listing blocks of the two old pieces against the new page, the lost ones listed.
7. A reader pass by eye: the page and the rewritten intros read top to bottom, with the render of the table of contents (two entries under Concepts, one per part in total six) looked at in `target/generated-docs/index.html`.
8. `git diff --stat` shows only `src/doc/README.adoc`, `README.md`, the new test and the run documents; `git diff ff3bacd -- src/doc/examples` is empty.

# Deployment and Rollout

Content and test only: no data, no service, no pom change. The manual goes live with the next release tag through the existing Pages step (unchanged); the pull request's Java and Page jobs build it and run the node tests (`src/doc/README.adoc` runs Java and Page, a new test runs Page). Compatible: every explicit address works (TG-2). Rollback: revert the commit; no data is touched.

# Risks and Tradeoffs

- `RISK-1` A generated id changes: `_comparing_two_plateaus` and `_comparing_two_plateaus_2` swap between the Editor and the Concepts page, and four titles of Concepts change. Mitigation: ASM-3; the explicit ids are the addresses in use; the record lists the changes.
- `RISK-2` A fact is lost in the rewrite, in prose where the script cannot see it. Mitigation: DEC-4's comparison, the reader pass, the pinned strings.
- `RISK-3` Voice is a judgement: the page may still read heavy. Mitigation: the review is the reader reading the page (the wave's Risks, REQ-5); the test keeps only the words.
- `RISK-4` A word of list B is right in some place and the test fails on it. Mitigation: the list holds words with no technical sense, measured first; a false hit is fixed by rewording, not by a test exception.
- `RISK-5` The wide diff outside the plateau page (about 100 lines) hides a change of meaning. Mitigation: the record lists each by line and first words; each is a sentence with no fact; the fact comparison runs on the whole file for code spans and numbers, not on the two pieces only, so a deleted span is listed.
- `RISK-6` Best Practices reads oddly for one run (a new plain sentence over the old promise list). Accepted: W-5 drops the promises (Q2).
- `RISK-7` W-5 to W-8 bring the filler back or lose an id. Mitigation: `manual-voice.test.js` and `manual-skeleton.test.js` run in the Page job for every later run.

# Open Questions

- `Q-1` (open, blocker for the wave manifest; the run proceeds on the decision below). The first criterion of gate P2 reads `grep -ciE 'journey|prowess|delve|unlock' src/doc/README.adoc` prints 0. Seven lines (442, 1852, 2897, 3044, 3047, 3712, 3735; four strings, ASM-6) cannot lose the word: two listings quote the error of `FacetNames.ADVICE` and `settings.js` (`such as `journey``), and the others quote ids of examples and of the layered Brightcart, a test fixture (`seller_journey`, `order_journey`, `01-shop_overview-journey`). Changing the message or the fixtures is a command or fixture change, which the wave excludes (W-6 says "no change to a command"; ShippedFilesTest and the Brightcart expected files pin the fixture). Decision: the run proves 0 outside listings and code spans (the test of DEC-7), lists the seven lines in its record, and asks that the criterion text read "outside listings and code spans" (or "prints 7"). Impact: if the criterion is read literally, the gate cannot pass without a separate change to the message and the fixtures.
- `Q-2` (settled). Does the filler pass stop at the plateau page? No: the gate reads the whole file (DEC-5).
- `Q-3` (settled). Are the Best Practices bullets rewritten here? Only the sentences that carry a gate word (six lines); the topic list and the rest of the bullets stay for W-5, which owns them under Q2 (DEC-5).

# Deferred Work

- `DEF-1` A glossary section or page in the manual (W-5 scope or later).
- `DEF-2` The voice of the Editor and Commands chapters, beyond their filler sentences; a later run, one chapter at a time.
- `DEF-3` The variants of the glossary left in text this run does not touch (listed in the record).
- `DEF-4` A sentence-level check of the voice (length, person) if the author wants one; not computed here (REQ-5).

# File Placement and Frontmatter

This file is `docs/wav/wav-030-pages-ci-and-toolbar/run/run-0214-manual-concepts-and-voice/tdd-0214-manual-concepts-and-voice.md`, after `tdd-0213-manual-skeleton.md`. Frontmatter: `title`, `type: tdd`, `status: draft`, `run: 0214`, `wave: 030`, `owner`, `date`, `related`.
