---
type: run
run: 0198
status: completed
profile: TDD+pln
wave: 026
---

# Run 0198 link-highlight

Run of wave 026 (relationship view), manifest id W-4. Issue `gh:tmorin/archicode#143`. The design is `tdd-0198-link-highlight.md` (DEC-1 to DEC-8); this document records what was built, as the tests pin it.

## What was built

A Map view of the application layer takes a `highlight` property (a list of `{source, destination, label}` entries, the form of `links`), and a story step takes a `highlight` key beside `view`, `at` and `against`. The kernel marks the links that stand for the named relationships with `highlighted: true` (absent otherwise); the command line draws a marked link heavy, with a glyph and a bold label, and the other links of such a view calm. A view with no marked link is drawn as before, byte for byte.

## Sentences

Each sentence is quoted as the test pins it. The fragment in angle brackets stands for the entry the author wrote. The kernel's sentences are the ones of `links` with the word `highlight` in place of `links`.

Errors (exit 1, one line, nothing written):

| Case (DEC) | Sentence | Pinned by |
|---|---|---|
| Entry of the wrong shape (DEC-1) | ``error: the view hl_view: `highlight[0]` is a mapping with `source`, `destination` and optionally `label`, and <entry> is not one`` | `MapLinksTest.shouldSayTheShapeOfAHighlightEntryAsOneErrorLine` |
| Entry naming no relationship, with a label (DEC-6) | ``error: the view hl_view: `highlight[1]` names a relationship from `shop.web` to `shop.api` with the label `reads`, which does not exist`` | `MapLinksTest.shouldSayAHighlightThatNamesNoRelationshipAsOneErrorLine` |
| Entry naming no relationship, with no label (DEC-6) | ``error: the view hl_view: `highlight[0]` names a relationship from `customer` to `shop.web` with no label, which does not exist`` | `MapLinksTest.shouldSayAHighlightWithNoLabelThatNamesNoRelationshipWithoutALabel` |
| Unknown end (DEC-6) | ``error: the view hl_view: dangling reference: nowhere`` | `MapLinksTest.shouldSayAnUnknownEndOfHighlightLikeAPinnedElementThatIsNotThere` |
| Highlight in the technology layer (DEC-3) | ``error: the view hl_view: highlight is read in the map of the application layer only`` | `MapLinksTest.shouldRefuseHighlightInTheMapOfTheTechnologyLayer` |
| Entry naming no relationship, in a story step (DEC-6) | the line starts with `error: ` and contains ``` `highlight[0]` names a relationship from `shop.web` to `shop.api` with the label `reads`, which does not exist``` | `GenerateStoriesTest.aStepHighlightThatNamesNoRelationshipIsOneErrorLine` |

Warnings (exit 0, the view or the step is drawn):

| Case (DEC) | Sentence | Pinned by |
|---|---|---|
| A view whose highlight lacks in the plateau drawn (DEC-6) | ``warning: the view `hl_view` is drawn without the highlight `partner -> shop.web`, which the plateau `baseline` does not have`` | `MapLinksTest.shouldWarnOfAHighlightThePlateauLacksAndDrawTheViewWithoutIt` |
| A step whose highlight lacks in the plateau drawn (DEC-6) | ``warning: the step plateau_hl/1 is drawn without the highlight `partner -> shop.web`, which the plateau `baseline` does not have`` | `GenerateStoriesTest.aStepHighlightThePlateauLacksIsAWarningAndTheStepIsDrawnWithoutItOrSkipped` |
| A view whose highlight entries all lack is drawn without the highlight, not skipped (DEC-6) | ``warning: the view `hl_view` is drawn without the highlight `partner -> shop.web`, which the plateau `baseline` does not have``, and the view is drawn | `MapLinksTest.shouldDrawAViewWhoseHighlightIsAllLackingInThePlateauAndNotSkipIt` |
| A view whose links all lack is skipped, as before the highlight (DEC-6) | ``warning: skip `hl_view`: none of its links is in the plateau `baseline` `` | `MapLinksTest.shouldStillSkipAViewWhoseLinksAreAllLackingWhateverItsHighlight` |
| A step whose links all lack is skipped, as before the highlight (DEC-6) | ``warning: skip plateau_hl/2: none of its links is in the plateau `baseline` `` | `GenerateStoriesTest.aStepHighlightThePlateauLacksIsAWarningAndTheStepIsDrawnWithoutItOrSkipped` |

Exit codes: 1 for each error above, 0 for each warning. An error is raised before the first folder is written (`MapLinksTest` asserts that no `views` folder exists after each error).

## The look

The PlantUML of a highlighted view (DEC-5, `HighlightMarks`, called by `LinkRenderer`). A view is highlighting when at least one of its links is highlighted; the arrows and labels are these strings, pinned by `HighlightMarksTest` and `MapLinksTest`. The tests write the glyph as the constant `GLYPH` (`**<U+25B6>**`, `HighlightMarksTest`), so the rows below join the literal parts of each golden line with that glyph; each literal part is found in a test:

| Link | Drawn as | Pinned by |
|---|---|---|
| Highlighted, no state | `from -[thickness=5,#D55E00]-> to : **<U+25B6>** **reads**` (the glyph alone when there is no label) | `HighlightMarksTest.aHighlightedLinkIsHeavyWithAGlyphAndABoldLabel` |
| Highlighted, `new` | `from -[thickness=5,#009E73]-> to : **+** **<U+25B6>** **reads**` | `HighlightMarksTest.aHighlightedNewLinkKeepsItsColourAndItsGlyphAndGainsTheWeight` |
| Highlighted, `changed` | `from -[dotted,thickness=5,#E69F00]-> to : **<U+007E>** **<U+25B6>** **reads**` | `HighlightMarksTest.aHighlightedChangedLinkStaysDotted` |
| Highlighted, `removed` | `from -[dashed,thickness=5,#7F7F7F]-> to : **<U+2212>** **<U+25B6>** **reads**` | `HighlightMarksTest.aHighlightedRemovedLinkStaysDashedAndGrey`, `MapLinksTest.shouldHighlightARemovedRelationshipInAComparison` |
| Not highlighted, no state, in a highlighting view (calm) | `from -[#A6A6A6]-> to : <color:#7F7F7F>reads</color>` | `HighlightMarksTest.aLinkThatIsNotHighlightedIsCalmInAHighlightingView` |
| Not highlighted, with a state, in a highlighting view | the state's arrow as before, at its own weight: `from -[thickness=3,#009E73]-> to : **+** reads` | `HighlightMarksTest.aLinkWithAStateThatIsNotHighlightedKeepsItsStateInAHighlightingView` |
| Secondary link, in a highlighting view | `from ..[#gray]> to : reads`, as without the highlight | `HighlightMarksTest.aSecondaryLinkIsDrawnAsWithoutTheHighlight` |
| No highlighted link in the view | drawn as before, `from --> to : reads` | `HighlightMarksTest.aViewWithNoHighlightedLinkIsDrawnAsItAlwaysWas` |

Colour is never alone: the highlight is the heaviest line (thickness 5, against the 3 of `new`), the glyph `**<U+25B6>**` and the bold label. The bold covers the label text only; the qualifiers are drawn after it, outside the bold (`HighlightMarksTest.theBoldCoversTheLabelAndNotTheQualifiers`). A step's `highlight` replaces the `highlight` of the view it draws, `highlight: []` switches it off, and the saved view is never written (`GenerateStoriesTest.aStepHighlightReplacesTheHighlightOfTheViewItDrawsAndNeverWritesTheView`).

## Limits as built

- **The editor draws no highlight yet.** The editor's kernel input (`buildKernelInput` in `src/main/editor/model/comparison.js`) does not pass `highlight` to the kernel. The step key is known to the editor's read schema (`Step.highlight: 'any'` in `src/main/editor/core/read-schema.js`), so the editor reads the key without an error. The editor side (the Map, the player) is W-5 and W-6.
- **A grouped link is highlighted as a whole.** A synthetic link that stands for several relationships is highlighted when one of them is named (the kernel's `highlighted` is one boolean per link). The whole link is drawn heavy; the label names the relationship the reader means. A finer drawing needs its own key (Q-1, decided at Stage 6, left to W-6).
- **A merged link is one link.** Two relationships merged into one link are highlighted together (`map-links-cases.json`, `a_merged_link_is_highlighted_as_one`).
- **A highlighted `removed` link is heavy, dashed and grey.** The glyph decides, not the colour (RISK-4, accepted).
- **Non-map viewpoints ignore `highlight` silently.** A view or step of `overview`, `detailed` or `deep` with `highlight` draws as without it, with no error and no warning (`MapLinksTest.shouldIgnoreHighlightInAViewpointThatIsNotAMap`).
- **An entry that names a relationship the map does not draw marks nothing and is no error.** A hidden end, both ends in one closed box, or a link dropped by `only_changes` marks nothing (`map-links-cases.json`, `a_hidden_end_marks_nothing_and_is_no_error`, `both_ends_in_one_closed_box_mark_nothing_and_are_no_error`). A `highlight` without `links` marks links of the whole map.
- **A typo that names an existing relationship cannot be told from a deliberate one.** The match is exact on the references and the label, after trimming.
- **Custom link labels.** A formatter `formatters.link.label` that already has Creole in it is wrapped in the bold, not rewritten (the TDD's stated tradeoff). `HighlightMarksTest` uses the default formatters only, so this is not pinned by a test.
- **Kernel contract 5 is unchanged.** `highlighted` is additive and absent when false, so every output without `highlight` is byte for byte the same.
- **The PlantUML was rendered once, by hand.** Stage 11 rendered the `.puml` of a workspace of `archicode init` (a map `hl_map` with `highlight: [{source: customer, destination: shop.web, label: uses}]` and a second system `billing` that reads `shop`) with a PlantUML jar found on the machine outside the repository (`-tpng`): the highlighted link is a thick vermilion arrow with a black triangle and a bold `uses`, the other link a thin grey arrow with a grey `reads` (ASM-5 met). The look is otherwise pinned as text by `HighlightMarksTest`; no image is kept in the repository.

## Verification

Stage 11, 2026-10-28, run here on JDK 25.0.4 and read back; every command exited 0.

- Kernel: `cargo test` 325 passed, `cargo fmt --check`, `cargo clippy --all-targets -D warnings`, `cargo llvm-cov --fail-under-lines 90` (98.97 % of the lines in all), `embed.sh --check` (the committed `.wasm` and page block are the ones the sources build); `CONTRACT_VERSION` is still 5.
- Java: `./mvnw test-compile pmd:check`; `./mvnw clean verify -DskipITs=false` (1585 unit tests, 2 skipped as before, 39 integration tests, 0 failures, the jacoco floors included).
- Page: `npm run editor:check` (99 upward pairs, max 99), `npm run format:check`, `npm run lint`, `npm run test:unit`, `npm run test:timing`.
- `scripts/byte-identity.sh`: 20 workspaces, 332 commands, 330 identical, 1 accepted by the exceptions, 0 unexpected, self-check ok. No existing golden `.puml`, golden view or `expected-boxes.json` changed in the run (`git diff 3579159 --name-only` lists `guide/golden.md` only among the golden files).
- No yaml, yml, toml or json file under `src` starts a line with `highlight:` (DEC-9).
- Acceptance re-read in the files: the Rust cases (`lib_tests.rs`, `map-links-cases.json`), `MapLinks`, `KernelViewpointFactory`, `ViewInPlateau`, `GenerateStoriesCommand`, `HighlightMarks`, `LinkRenderer`, the guide row and `golden.md`, `[[map-highlight]]` and `[[stories-generate]]` of the manual, the paragraph of CLAUDE.md, and `read-schema.js` with `manifest.schema.json`. Each sentence of this document appears in a test (`grep -F`, found in `MapLinksTest`, `GenerateStoriesTest` and `HighlightMarksTest`).
- Render (ASM-5): one `.puml` rendered to an image, see the limits above.

The changes of tasks 001 to 008 are committed (d6877db, 565991f, 8099eda); those of tasks 009 to 012 and the documents are in the working tree, uncommitted; the commit is a step outside this workflow. The untracked `jacoco-quarkus.exec` at the root is a leftover of the test runs (it was there at the start of this stage) and is left for the author.

Review pass: dispatched. The Stage 5 review of the TDD and the Stage 9 consistency check were done by leaf agents in fresh contexts, and tasks 001 to 012 were each verified by an agent other than the one that built them (see the prg).

## Canonical impact

None. No canonical register is declared in this repository (`docs/CLAUDE.md` does not exist, the wave names no `docs/bkg` or `docs/ana` register), as the Canonical Impact section of the TDD says.

Files outside likely_paths: src/main/editor/core/read-schema.js (the step key in `READ_SCHEMA`, DEC-8, gap-005), src/main/resources/META-INF/native-image/io.morin.archicode/archicode/reflect-config.json (the entries for the new reflected classes, needed by the native image), src/test/javascript/viewpoint-kernel/map-links-cases.json (the highlight cases, read by the Rust and the node suites)
