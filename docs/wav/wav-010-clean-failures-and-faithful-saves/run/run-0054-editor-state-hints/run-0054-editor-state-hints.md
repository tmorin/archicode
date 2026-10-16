---
type: run
run: 0054
status: completed
wave: 010
---

# Run 0054: Editor state hints

Wave 010 (`clean-failures-and-faithful-saves`), item W-6 (phase P2). Focus: learn in the editor why a hand-written state word is not drawn as a change, and read one look for `split` everywhere.
Scope and decision D-4 are in the wave plan (`docs/wav/wav-010-clean-failures-and-faithful-saves/wav-010-clean-failures-and-faithful-saves.md`), issues tmorin/archicode#36 and #42.
Document profile: `single-document` (the scope arrives settled by the wave plan, D-4 and the two issues; runs 0049 to 0053 did the same); this file carries scope, decisions,
canonical impact, review passes, tasks, verification and findings.

## Scope

1. #36. When a plateau is compared, the editor tells, for each state word the author wrote by hand (a qualifier or a word of the `rendering-stereotypes` tag, any of `new`,
   `changed`, `removed`, `moved`, `split`, `merged`, `contains-changes`) that the comparison does not compute for that element, the sentence the command line prints on its
   error output (`StateTags`), word for word. Where: the inspection of the element (where an author looks at a box that is not drawn as its word says) and a *Hand-written
   states* list in the *Changes* panel (one line per element and word, in the order of the command line). Nothing when nothing is compared, and nothing for a word that is
   the state of its element.
2. #42, D-4. `split` has one line style in both tools: the command line keeps `LineStyle: 6` (a dash and a gap of 6), the editor takes `6 6` instead of the dash-dot
   `9 3 2 3`. Both keys, the two manual tables and the tests say it.

Not in scope, not done: the CLI's patterns (a decision of D-4: it does not move), the kernel and its wasm, the manifest format.

## Decisions

- **D1. One wording, pinned.** The sentences exist twice (Java `StateTags.sentence`, JS `stateWordSentence`), because the command line and the editor share no code
  (the editor is a page; the kernel is not given the author's words and a contract change was ruled out by D-4's reading). A golden file,
  `src/test/resources/state-hints/expected-sentences.txt`, holds the sentences on an invented lending library (`src/test/resources/plateau-state-hints`, before and after
  plateaus, an application and a technology layer, the seven words, both sources, words that agree and words that do not). `StateTagRuleTest` runs `archicode diff` on it and
  asserts the error output is the file; `state-hints.test.js` asserts the editor's sentences are the file. Either side moving fails a test. Alternative rejected: moving the
  words to the kernel (the Rust and its contract would change, which the wave says not to do for this).
- **D2. What "the comparison computes" means in the editor.** The answer of `compare` with every change in it (`comparisonState().full`), whatever the wording toggle says: with
  *Hide wording-only changes* an element is drawn unchanged but the comparison still says it changed, so the hint does not appear or change with the toggle (a test says so).
  The state of an element is its own change, else `contains-changes` when an element below it has one (`StateTags.stateOf`, `computedStateOf`).
- **D3. Where.** Both places, from one function (`stateWordHintsOf`): the inspection note (one `inspection-note` per word, under *What changed*, so it is read on the element the
  author clicks on a box that looks unchanged) and the *Changes* panel list. The list is a section of its own, not a line added to *Warnings*: that list is the kernel's
  (`replaces` it ignored) and a test pins it as such. The wording is not changed to HTML (backticks stay), so that the text on the page is the file's text.
- **D4. The pair.** `6 6`. The command line's `LineStyle` is an integer, a dash and a gap of N, so the only editor pair that equals it is `N N`; `split` is 6 there, and the
  editor's other patterns are `2 3`, `7 4` (removed, and the grouped link), `14 4`, `4 2`, `4 3` and none, so `6 6` is used by no state and by no line of the page (a test reads
  the page's CSS for it). It is a weaker difference from `removed` than the dash-dot was (the gap, 6 against 4, with the dash 6 against 7: seen in the browser, the dashes
  of `split` are airy, those of `removed` dense), backed as always by the colour, the glyph and the pill. The command line's own patterns have the same property (removed 7-7,
  split 6-6, merged 5-5): issue #55, a decision for a release.
- **D5. No change to the command line, the kernel or the manifest format.** `src/main/java` is untouched, so the generated files are the ones of HEAD (proof below). The
  tree-row marks of a state (`.tree-change`, a bordered glyph) are not a line style of a box and are left as they are.
- **D6. `CLAUDE.md`.** Its plateau paragraph already says that the command says it "on the error output, as it does for the warnings of `replaces`" (run 0049 replaced
  `StateTagReport`), which is still true; no change.

## Canonical impact

None to the architecture model (no `CI-arc` or `CI-dom` packet: this run has no TDD). The manual: `editor-compare` table (split row, the sentence that named the exception), the
*State tags* section (the editor tells it) and the *Warnings* paragraph of the editor (the new list).

## Review passes

- **KDMLLC (inline).** K: one function decides (`stateWordHintsOf`), two renderers read it, the sentence has one builder in each language; no option, no storage. D: the sentence is
  duplicated by necessity and pinned by one shared file, not by two copies of a test; `CHANGE_STATES` (and the new `STATE_WORDS`) are read, not re-listed. M: each of the seven words
  appears in the golden file, both sources, both layers, the three "finds that" forms (did not change, is X, holds a change), and the agreeing words are tested to stay quiet; the
  looks: the editor's pair equals the command line's, is distinct in both tools, is not used by any other line of the page, and both keys say "medium dashes". L: no new class, no new
  option, no wasm; the no-comparison case is not told (the command line's "nothing is compared here" has no meaning where the comparison is a choice of the page). U: the rule is
  in the comment of the section and in the manual. C: below.
- **C scan.** The scope says "all the state words the editor knows (`CHANGE_STATES`)": `CHANGE_STATES` does not hold `contains-changes`, which the command line also checks; the
  list the editor reads is `STATE_WORDS` (`CHANGE_STATES` plus `contains-changes`), and the golden file has a `contains-changes` sentence. The scope says "appears only when a comparison
  is on and the word disagrees": the function returns `[]` for no comparison, a pending kernel, a problem, and for an agreeing word, each tested. The wave row says "a JS test of the
  sentence for the four cases": done for more (no comparison, agrees, does not change, is another state, holds a change, both sources, technology). The old manual sentence "(except
  the line of `split`, dash-dot here and medium dashes there)" is now false and was replaced. Three existing assertions of `replaces-editor.test.js` encoded `9 3 2 3` and `dash-dot` and were updated; the
  *Warnings* test of the same file now confirms the new list is separate (its fixture has a hand-written word, so the old merged design failed it).

## Tasks

- [x] T1. `stateWordHintsOf`, `writtenStateWordsOf`, `computedStateOf`, `stateWordSentence`, `renderStateWordHintsHtml` (inspection), `renderStateWordsHtml` (panel), `comparisonState().full`.
- [x] T2. The invented fixture `plateau-state-hints`, the golden file, the Java test of the command line against it (`StateTagRuleTest`, `copy` helper), `state-hints.test.js` (6 tests).
- [x] T3. `split` is `6 6` in `CHANGE_DEFAULT_LOOK`; the key (`CHANGE_WORDS`, `diagramComparisonLegendHtml`); `split-look.test.js` (3 tests, the command line read from `ChangeMarks.java`); the three assertions of `replaces-editor.test.js`.
- [x] T4. The manual (the `editor-compare` row and sentence, the state-tags section, the warnings paragraph).
- [x] T5. The real page, light and dark, on an invented copy; the proof that the command line writes what it wrote.
- [x] T6. Full verification; the issue for the one finding (#55).

## Verification

Run from `/home/tibo/git-perso/archicode`, JDK 25 (`JAVA_HOME=/home/tibo/.sdkman/candidates/java/25.0.4-tem`), offline.

- `./mvnw -o -q verify`: exit 0 (320 Java tests, 0 failures, 0 errors, 1 skipped as before; the new one is the sentence test of `StateTagRuleTest`), on the final tree.
- `cargo test --manifest-path src/main/rust/viewpoint-kernel/Cargo.toml`: 168 passed. `src/main/rust/viewpoint-kernel/embed.sh --check`: "the committed WebAssembly is the one the sources build", ok.
  `src/main/wasm` and `src/main/rust` untouched.
- `node --test "src/test/javascript/**/*.test.js"`: 887 passed, 0 failed (878 before, 9 added: `state-hints.test.js` 6, `split-look.test.js` 3), three runs in a row, the last on the final tree.
  `npx prettier --check "src/**/*.java"`: clean.
- **The new tests fail without the change.** Run against HEAD's `standalone.html` (a copy of the HEAD tree in the scratchpad with the new tests and fixtures overlaid): 8 of the 9 fail; the one that
  passes asserts that no other state has the pair of `split` and that no line of the page draws `6 6` (true of HEAD too, for the dash-dot).
- **No-change proof for the command line** (scratchpad `compare54.sh`, the method of runs 0049 to 0051): a jar built from `git archive HEAD` against a jar of the working tree, the same
  commands in copies of every `workspace.yaml` of the repository (examples and test fixtures, plus the new fixture) and of 3 scratch workspaces (18 workspaces, 146 commands each way:
  `views generate`, `query graph`, `query views -f json`, `query schemas`, and for the 8 workspaces with plateaus `diff` in its four forms, `views generate --baseline`, `--plateau` of each, `query graph --plateau`).
  Exit codes: 146 of 146 identical (all 0), error output identical, and `diff -rq` of the two trees of generated files (2445 files each) reports nothing. Standard output is identical except
  for `query schemas` (7 workspaces) and `query views -f json` (1): HEAD's own jar prints those in a different order from one run to the next (6 runs of the same command: two different checksums), and
  after sorting keys and lists the outputs of the two jars are equal. `src/main/java` has no change, so none was expected; no example view and no golden file was regenerated.
- **The real page** (`archicode editor serve`, a jar of the working tree, the built-in browser, light and dark, an invented copy in the scratchpad of the example `domain_plateaus` with the
  tag `rendering-stereotypes: "new"` added to `customer`, which did not change): *To be* compared with *As is*. The inspection of Customer says "the element `customer` carries `new`
  (`rendering-stereotypes` tag), but the comparison of `to-be` with `as-is` finds that it did not change and holds no change: ..." under its name, in both schemes; the *Changes* tab shows
  *Hand-written states 1* with the same sentence, under the candidates and above the lists; `shop.payments`, new and carrying `new` in the example, says nothing. The map with everything
  unfolded draws the split boxes (Cart, Checkout) with the pink tint and the new dashes, and the key says "split medium dashes: one of several that replace one". A strip of every pattern drawn
  in the page at a larger size showed `6 6` as even, airy dashes next to the dense `7 4` of removed, the long `14 4` of moved and the short `4 2` of merged.

## Not verified

- Nothing was run on a real workspace; every file is invented, or one of the repository's examples and fixtures.
- The PlantUML rendering of `split` was not re-drawn (the command line did not change); that PlantUML draws `LineStyle: 6` as a dash and a gap of 6 is the documented reading, not re-checked here, and
  no PlantUML was available offline in this environment.
- Other browsers than the built-in one; the screenshots are at a reduced resolution, so the difference between `6 6` and `7 4` was judged on a larger strip of lines, not on the diagram itself.
- The harness has no DOM: the click path that opens the inspection was exercised only in the built-in browser, once per scheme.
- The hint when the editor opens a workspace whose comparison is a single plateau against itself or with an unreadable baseline: those return no `full` and tell nothing (tested with `problems` and
  `pending`), not exercised in the browser.

## Findings

- **#55 filed.** The command line's own line styles of `removed` (7-7), `split` (6-6) and `merged` (5-5) differ by a pixel; the editor's `split` now equals the command line's, so it inherits
  that, softened by the gap. A decision for a release (it changes the views of every comparison).
- `CLAUDE.md` could name the golden file as the way the two sets of sentences stay one (a line under the plateau paragraph); it is true without it, and this run was told to change `CLAUDE.md`
  only if it were wrong, so it is left to the orchestrator.
- The `.tree-change` marks of the trees (a small bordered glyph; `split` is dashed with dotted top and bottom, `merged` is double) are their own language and were not touched; they are not the line
  style of a box.
- Files outside `likely_paths`: `src/test/java/io/morin/archicode/cli/StateTagRuleTest.java`, `src/test/resources/plateau-state-hints/**`, `src/test/resources/state-hints/expected-sentences.txt`
  (the shared fixture and golden file; `src/test/java/io/morin/archicode/cli/` is not under `rendering/`).
