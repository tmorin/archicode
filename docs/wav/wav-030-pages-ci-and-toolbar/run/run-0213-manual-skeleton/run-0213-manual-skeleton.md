---
type: run
run: 0213
status: completed
profile: TDD+pln
wave: 030
---

# Run 0213 manual-skeleton

Run of wave 030 (pages, CI and toolbar), manifest id W-3.

Record of the sort of `src/doc/README.adoc` into six parts. The base of every comparison is `ff3bacd:src/doc/README.adoc` (3942 lines); the file after is 3770 lines. The status of this run is left to the main agent.

## Asciidoctor lines (REQ-3)

Count = lines of the real build (`./mvnw -o generate-resources`, JDK 25) that match `asciidoctor: (WARNING|ERROR|INFO)`, `DEBUG` excluded; the `WARNING:` lines of the JDK 25 Maven run (jansi, guava) are not Asciidoctor's and are not counted.

| | Asciidoctor lines | Listed |
|---|---|---|
| Before (base file, measured by the TDD design, Current State) | 0 | none; `Converted ...`, `BUILD SUCCESS` |
| After (this task, rebuilt) | 0 | none; `[INFO] Converted .../README.adoc`, `[INFO] BUILD SUCCESS` |

After (0) is not greater than before (0).

## Move table

Line numbers of the base are those of `ff3bacd`; the lines after are those of the new file (heading line). A block moves whole, titles are not changed.

| Block | Base lines | Part | Line after | Level change |
|---|---|---|---|---|
| Introduction | 7-16 | Start here | 10 | none |
| Availability, License, and Deliverables (with Install) | 17-70 | Start here | 20 | none |
| Features | 71-107 | Start here | 74 | none |
| Example: An ecommerce platform (walkthrough, with its steps, Introduction and Conclusion) | 2963-3275 | Tutorials | 107 | `====` to `==`, `=====` to `===` |
| Tackling view clutter (`[[facets]]`, walkthrough) | 3276-3537 | Tutorials | 383 | `====` to `==`, `=====` to `===` |
| A tutorial: from one workspace to a review of the changes | 1334-1612 | Tutorials | 611 | `===` to `==` |
| Best Practices (intro, Design Guidelines, Source Code Organization) | 2915-2962 and 3538-3606 | How-to guides | 892 | none |
| Domain (`[[domain]]`) | 108-1226 | Reference | 986 | none |
| Editor (`[[editor]]`) | 1779-2342 | Reference | 2046 | none |
| Commands | 2343-2914 | Reference | 2609 | none |
| Appendix | 3607-3942 | Reference | 3158 | none |
| States of an architecture (plateaus) (`[[plateaus-overview]]`), without the tutorial and the upgrade section | 1227-1333 | Concepts | 3498 | none |
| Limits of today (`[[plateau-limits]]`) | 1752-1778 | Concepts | 3604 | none |
| Upgrading: what breaks, and what does not (`[[plateaus-upgrade]]`, with `[[upgrade-0-17]]` to `[[upgrade-0-22]]`) | 1613-1751 | Upgrading | 3634 | `===` to `==` |

Reading of `grep -n '^= '` (Q-1): the title `= ArchiCode` (line 1), then the six parts in this order: `= Start here` (8), `= Tutorials` (105), `= How-to guides` (890), `= Reference` (983), `= Concepts` (3495), `= Upgrading` (3631). Seven lines, the first is the document title. The header now has `:doctype: book` and `:toclevels: 1`; `:TOC: left` is unchanged.

## Lines deleted: the drafts

139 lines that started with `//` at the base; 0 remain (`grep -c '^//' src/doc/README.adoc` prints 0). The ArchiMate/C4 mapping they carried is kept as one prose paragraph (DEC-3, below).

## Paragraphs added, changed, deleted (old and new text)

Differences found by comparing the sorted lines of the base and of the new file (`comm`), besides the 139 `//` lines and blank lines, the moved headings, and the heading level changes of the table (the headings that rise).

Added or changed:

- Header: old `:toclevels: 3` (and no doctype); new `:toclevels: 1` and `:doctype: book` (DEC-1).
- Six part headings added, each `= <name>` with a blank line before and after: `= Start here`, `= Tutorials`, `= How-to guides`, `= Reference`, `= Concepts`, `= Upgrading` (DEC-1).
- DEC-3, mapping paragraph (replaces the draft lines 549-552 and 659-662 of the base). New: "The Application layer matches the Application layer of ArchiMate and the Technology layer matches the Technology layer of ArchiMate, both for the structure aspect only. The Application layer follows the C4 model, with the Solution on top of the System; the Technology layer follows the deployment representation of the C4 model, with two elements, the Environment and the Node."
- DEC-5 (a), the Introduction. Old, the last paragraph: "This documentation will guide you through the features, domain, commands, and best practices for utilizing ArchiCode in your architectural projects. Let's explore how ArchiCode can elevate your architecture-as-code journey." New: "This documentation is sorted by the kind of reading: Start here, Tutorials, How-to guides, Reference, Concepts and Upgrading, in that order. Let's explore how ArchiCode can elevate your architecture-as-code journey." The second Introduction paragraph also changed. Old: "This next parts will comprehensively guide you through ArchiCode's features, commands, and best practices, enabling you to harness the full potential of this tool in your architectural endeavors. Let's delve into the details and unlock the benefits ArchiCode has to offer." New: "The next parts guide you through ArchiCode with tutorials, how-to guides, the reference of the domain, the editor and the commands, and the concepts behind them."
- DEC-5 (b), the Commands intro. Old: the paragraph "Within the realm of ArchiCode, an array of meticulously designed commands ..." and the two bullets "View Generation Commands" and "Data Model Querying Commands". New: "ArchiCode has eight commands, run as `archicode <command>`:" followed by one bullet each for `views`, `query`, `editor`, `plateau`, `stories`, `diff`, `guide` and `init`, each with the first sentence of its description in `--help` and a `see <<id>>` reference (for example "`diff`: Compare a plateau with another one: the elements and the relationships that are new, changed or removed, and what changed in each, as a table (see <<diff>>).").
- DEC-5 (c), Features. Old: the closing paragraph "ArchiCode's extensibility goes further by integrating viewpoint providers ..." and the entry ".Extensibility Through Plug-gable Engines" with "Customize and extend ArchiCode's functionality by plugging in renderer engines ..." and ".Diverse Viewpoint Providers". New: those passages are deleted.
- DEC-5 (d) and REQ-7 (decision of this run), Pluggable bullets of Views and Rendering. Old: "- Pluggable Viewpoint Service: ArchiCode harnesses a pluggable Viewpoint Service architecture ...", "- Pluggable Renderer Service: ArchiCode harnesses a pluggable Renderer Service architecture ...". New: both bullets deleted, and the two sentences that leaned on them are shortened: "By embracing dynamic view generation and facilitating ad-hoc view definitions, ..." (old: "..., leveraging pluggable Viewpoint Services, and ...") and "By introducing a robust rendering mechanism and employing opinionated rules for artifact generation, ArchiCode enhances ..." (old: "..., and facilitating the pluggable Renderer Service, ArchiCode ..."). W-5 only re-checks `grep -c 'Pluggable Viewpoint Service'`.
- DEC-5, the plateau layout paragraph. Old: "... are drawn in <<plateaus>>; the tutorial below builds it." New: "... are drawn in <<plateaus>>; the tutorial of the part Tutorials builds it." (the position word "below" fixed, as the tutorial now sits in another part).

Position words fixed: "below" in the plateau layout paragraph (above). No other position word was changed (not re-audited line by line in this task).

Apart from the differences above and about 38 fewer blank lines (the deleted drafts and passages leave blank lines behind), the sorted lines of the base and of the new file are the same; the comparison script of task-005 holds the exact accounting. Also, `git diff ff3bacd -- src/doc/examples` is empty (no example changed).

## Render check

The table of contents of the built page `target/generated-docs/index.html` (served by `python3 -m http.server` on 127.0.0.1 and opened in the browser pane, because the pane refuses `file://`):

- Counted in the page (script): the top list is `ul.sectlevel0` with six `li` (Start here, Tutorials, How-to guides, Reference, Concepts, Upgrading), the chapters under them are `ul.sectlevel1` (3, 3, 1, 4, 1, 1), and there is no `sectlevel2` list. No part is without a chapter.
- By eye, in light (`prefers-color-scheme: light`, 1280x800): the contents sit fixed on the left with the six parts and their chapters; the title and "Start here" show at the top of the body. A click on a link to `#plateau-fold` lands on the heading "Fold a plateau into the one above" with the fold command text under it; a click on a link to `#editor-layout` lands on "The boxes per row" with the text on columns under it.
- By eye, in dark (`prefers-color-scheme: dark` emulated): same layout and the same six parts; the page has no dark style (Asciidoctor's default stylesheet, body background white), so it stays light and readable. This is the same as the base page, not a change of this run.
- Not checked: other browsers, a phone width.

## Commands run

- `git show ff3bacd:src/doc/README.adoc` into the scratchpad, then `sort` of both files and `comm -23` / `comm -13` for the differences; `grep -n '^= '`, `grep -c '^//'`, `grep -n '^\[\['` on the new file.
- `JAVA_HOME=/home/tibo/.sdkman/candidates/java/25.0.4-tem ./mvnw -o generate-resources`, filtered on `asciidoctor: (WARNING|ERROR|INFO)`, `Converted` and `BUILD`.
- A script on `target/generated-docs/index.html` (count of `sectlevel0`, `sectlevel1`, `sectlevel2`) and in the pane (`javascript_tool`) for the lists of the contents.
- `python3 -m http.server 8765 --bind 127.0.0.1` in `target/generated-docs`, the browser pane with the color scheme set to light then dark, clicks on the links to `#plateau-fold` and `#editor-layout`.
- `npm run format:check` (exit 0).

Git status against the baseline: `git status --short` lists, for this run, only `src/doc/README.adoc`, `src/test/javascript/manual-skeleton.test.js`, `src/test/javascript/manual-anchors.json` and the run documents; the other modified files listed by `git status` (workflow, site, `site.test.js`, `sample-brightcart.test.js`, `scripts/changes.mjs`, `changes-map.test.js`) belong to the earlier runs of the wave and were not touched here.

## Verification

Stage 11, read back from the files and run by the stage agent: `src/doc/README.adoc` 3770 lines, six level-0 parts in order, `grep -c '^//'` 0, `:doctype: book`, `:toclevels: 1`, no Pluggable Viewpoint Service passage; `manual-skeleton.test.js` 8 of 8; `npm run test:unit` 3461 tests, 0 failed; `npm run format:check` and `npm run lint` exit 0; `PlateauComparisonTest` 43 tests, 0 failures; `./mvnw -o generate-resources` BUILD SUCCESS with 0 Asciidoctor lines (baseline 0). The render was checked by eye in the browser pane by task-006 (see Render check); other browsers and a phone width were not checked.

Review pass: dispatched (the TDD review of Stage 5 was done by an agent other than the Stage 4 drafter; each task was verified by a separate agent).

Files outside likely_paths: src/test/javascript/manual-skeleton.test.js, src/test/javascript/manual-anchors.json, docs/wav/wav-030-pages-ci-and-toolbar/run/run-0213-manual-skeleton/

## Canonical impact

None. No element of `docs/architecture` names `src/doc` or `README.adoc` (`grep -ril "README.adoc\|src/doc" docs/architecture` finds nothing), so there is no `CI-arc-1` to change and no domain register is declared.
