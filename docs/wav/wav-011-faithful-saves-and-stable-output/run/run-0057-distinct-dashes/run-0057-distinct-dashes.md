---
type: run
run: 0057
status: completed
wave: 011
---

# Run 0057: Distinct dashes

Wave 011 (`faithful-saves-and-stable-output`), item W-3 (phase P1). Focus: tell removed, split and merged apart by their line in a rendered comparison.
Document profile: `single-document` (the scope arrives settled by the wave plan and by issue tmorin/archicode#55 and the author's ruling in it, "ships in the same release as #48 and #49, so the
generated views change only once"); this file carries scope, decisions, canonical impact, review passes, tasks, verification and findings.

## Scope

The command line drew `removed`, `split` and `merged` boxes with `LineStyle: 7`, `6` and `5` (a dash and a gap of N), which differ by one pixel. Give the three a dash-gap pair that differs visibly
pairwise and from the other states, carry a pair in the style model, change the editor's patterns, the keys of both tools and the two manual tables to match, and regenerate the committed
comparison views once.

## Decisions

- **D1. The pairs.** `removed` 16-3 (long dashes, narrow gaps), `split` 8-8 (medium dashes), `merged` 3-9 (short dashes, far apart). The other states keep their lines: `changed` 2-2, `contains-changes`
  4-4, `moved` 12-12, `new` solid. Chosen by rendering candidates with `plantuml-1.2024.7.jar` at scale 3 and looking (sets 7-3/6-6/3-8, 10-3/5-5/2-6, 9-3/6-6/3-9, 16-3/6-6/3-9, 8-2/6-6/3-9,
  14-3/8-8/2-8, then the final one). Why they are visibly different: they vary along two axes, the dash (16, 8, 3) and the gap (3, 8, 9), so no two are a rescaling of the other; the dash or the gap of each of the three
  differs by at least 4 from the dash or the gap of every other state, in both tools (a Java test and a node test fix it). 10-3 against 6-6 was too close in the render (a dash is a dash), and a 2-wide-gap dotted
  `merged` was too close to the dotted `changed` (2-2), hence 3-9.
- **D2. `split` changed from 6-6 to 8-8.** The wave said to keep the other states' lines unless the pairs force a change; `split` is one of the three, and 6-6 sat 2 away from `contains-changes` (4-4, a
  thinner line); 8-8 sits 4 from both 4-4 and `moved` (12-12). The editor drew `split` with `6 6` since run 0054 (#42): it is `8 8` now, and `split-look.test.js` follows.
- **D3. The editor's `moved` changed from `14 4` to `12 12`.** Forced by the pairs: next to the editor's `removed` `16 3`, `14 4` was two long dashes with a one-pixel difference in the gap, the very defect of #55. `12 12` is the pair
  the command line already drew for `moved`, so the editor now draws the command line's pair for `removed`, `moved`, `split` and `merged`. The editor's `changed` (`2 3`) and `contains-changes` (`4 3`) are untouched
  (they are approximations of the command line's 2-2 and 4-4, as the manual already says).
- **D4. The style model carries a pair as a second optional property, `line-gap`** (`Styles.Style.lineGap`, `Integer`), beside `line-style`. Without it the gap is the dash (`line-style: 5` is 5-5 as before, so every
  existing workspace and every generated line of a non-comparison view is byte-identical); with it, `LineStyle: <line-style>-<line-gap>` (PlantUML 1.2024.7 reads the pair, see Verification). Alternatives: a
  `line-style` that is a string `"16-3"` (changes the type in `query schemas` from integer to string for every author), or a field hidden from the manifests (an author could not restyle `removed` with the same shape). The property
  is public, so `line-gap` is in the manual (the paragraph on styles) and in `query schemas`; the editor reads it too (`styleLookOf`).
  The pair travels together when styles are merged (`PlantumlUtilities.override`): an author's `line-style` on `removed` replaces the default's dash and its gap (it is a dash of N and a gap of N, not N-3); a `line-gap`
  without a `line-style` means nothing (the default pair stays). No new class, so nothing to add to `reflect-config.json` (`NativeReflectionConfigTest` passes).
- **D5. The keys say the same lines in words** (a test reads all five places): `removed` "long dashes, narrow gaps" (grey outline, struck title), `moved` "long dashes, wide gaps", `split` "medium dashes", `merged`
  "short dashes, far apart". Five places: the legend of the command line (`ChangeMarks.legend`), the words of the editor (`CHANGE_WORDS`), the key of the editor (`diagramComparisonLegendHtml`), and the two manual tables
  (`plateau-comparison`, `editor-compare` in `src/doc/README.adoc`). The link column of `removed` still says "dashed grey line": the lines of links are not changed.
- **D6. Not done:** no change to the Rust or the wasm (the kernel does not draw lines); the lines of links (`-[dashed,...]`, the editor's `7 4` edges) are not part of #55; `CLAUDE.md` does not describe the line styles, so it is
  unchanged.

## Canonical impact

None to the architecture model (no `CI-arc` or `CI-dom` packet: this run has no TDD). `CLAUDE.md` does not mention line styles. The manual: two tables, the style paragraph (`line-gap`) and the sentence on the editor's lines.

## Note for the release notes

> The views of a comparison (`views generate --baseline`, `diff`) draw `removed`, `split` and `merged` boxes with line styles that differ visibly: `LineStyle: 16-3`, `8-8` (written `8`) and `3-9` instead of 7, 6 and 5, so the
> generated `.puml` of every comparison changes once (the three lines of the styles and the three legend lines that describe them; nothing else), and a view without a comparison is byte-identical. The editor draws the same
> pairs (and `moved` as 12 12 like the command line). A style can now set a gap with `line-gap` next to `line-style`, so that `line-style: 16` and `line-gap: 3` give `LineStyle: 16-3`; without `line-gap`
> nothing changes. `query schemas` lists the new property.

## Review passes

- **KDMLLC (inline).** K: one new optional property, no new class, no option. D: the pair is written in one place per tool (`ChangeMarks.style`, `CHANGE_DEFAULT_LOOK`) and the tests read the sources instead of repeating the
  values by hand where they compare tools. M: lines (D1-D3), model (D4), keys (D5), generated files (Verification), each has its own check. L: no change to the other states, to links, to the Rust. U: the reason of each pair is in the
  javadoc of `ChangeMarks` and in the comment of `CHANGE_DEFAULT_LOOK`. C: below.
- **C scan.** The wave plan: "dash-gap pairs for the three states that differ pairwise, carried by the style model": D1, D4. "The editor's patterns and the key of both tools and the two manual tables changed to match": D1-D3, D5.
  "The files generated for the workspaces without a comparison are byte-identical, those with a comparison differ only on the `LineStyle` of the three states": byte-identical, yes; the comparison ones differ on the `LineStyle`
  of the three states **and on the three legend lines that say them in words**, which is the key the plan asks to change (Verification). Not a contradiction, said as a finding.

## Tasks

- [x] T1. Pick the pairs by rendering with `plantuml-1.2024.7.jar` (D1).
- [x] T2. Style model: `Styles.Style.lineGap`, `PlantumlUtilities.generateStyle` and `override`; `ChangeMarks.style`, its legend and javadoc.
- [x] T3. Editor: `CHANGE_DEFAULT_LOOK`, `CHANGE_WORDS`, the key, `line-gap` in `styleLookOf` and `STYLE_KEYS`.
- [x] T4. Manual: the two tables, the sentence on the editor's lines, the style paragraph.
- [x] T5. Tests: `ChangeMarksTest` (pairs, gap with its dash), `DistinctDashesRenderingTest` (renders with PlantUML when `PLANTUML_JAR` is set), `distinct-dashes.test.js` (both tools, five keys, `line-gap` in the editor), the old tests that held 7, 6, 5, `7 4`, `14 4`, `4 2`.
- [x] T6. Byte-identity against a jar of `8e84e7e`, regeneration of the committed comparison files.
- [x] T7. The editor looked at in the built-in browser, light and dark.
- [x] T8. Full verification (below).

## Verification

- **PlantUML renders the pairs.** `plantuml-1.2024.7.jar` (found at `/home/tibo/git-perso/plantuml-libs/.workdir/.cache/plantuml-1.2024.7.jar`) accepts `LineStyle: 16-3` (SVG `stroke-dasharray:16.0,3.0`), `8` (`8.0,8.0`), `3-9`
  (`3.0,9.0`), `12` (`12.0,12.0`); the PNG of a box for each state was looked at (scale 3). `DistinctDashesRenderingTest` does it with the jar (`PLANTUML_JAR`), reads the SVG and checks the three patterns and that no two
  states have the same one; it is skipped without the jar. `HyphenIdViewsTest.plantumlRendersEveryViewOfTheFixtures` (same jar) renders every view of the comparison fixtures, which now carry the new styles: passes.
- **Byte identity.** A jar of `8e84e7e` was built from `git archive HEAD` in the scratchpad; both jars ran `views generate -w <file>` on every YAML file of `src/doc/examples`, `src/test/resources` and `src/test/workspaces`
  that is a workspace (the committed `views*` folders left out of the copy, so everything is regenerated), and, for the 5 workspaces that have plateaus, on every plateau (`--plateau P`) and every ordered pair
  (`--plateau P --baseline Q`): 87 invocations per jar. Their output (the exit codes and the messages, 33 of 87 with exit 0; the rest are manifests that are not workspaces, the same message and exit 1 on both) is identical.
  `diff -rq` of the two trees: **no file differs outside a comparison folder** (`views` and every `views-<facet>` of the viewpoint-kernel fixture, the design and facet examples: byte-identical), and
  in the comparison folders (`views-*-vs-*`: 25 folders hold a differing file, 643 files differ of 853) the only differing lines are, counted over all of them: `LineStyle: 7` to `16-3` (1050), `6` to `8` (90), `5` to `3-9` (72), and the legend lines of the
  command line that describe them: `removed` (643), `moved` (22), `merged` (12). `.moved`'s `LineStyle: 12` and every other line are unchanged.
- **Regenerated committed files** (all that hold a comparison, all three equal to the output of the previous jar before the change, so the change is only the lines above):
  `src/doc/examples/domain_plateaus/views-to-be-vs-as-is/plantuml/application/shop-detailed.puml`, `shop_web-overview.puml`, `warehouse_inventory_levels-overview.puml`. `src/test/resources` holds no committed comparison
  output (the fixtures are generated into a temporary folder by the tests).
- **Editor, built-in browser.** `archicode editor serve` on a scratchpad copy of the invented `plateau-comparison/replaces` fixture plus an invented `depot` system (a merged `Load` from two crates, a split `Ledger`
  into goods and money, a removed `Scrap`); compared with `before`: the key shows the new words, the map draws the boxes (computed `stroke-dasharray` read from the page: removed `16 3`, moved `12 12`, split `8 8`, merged `3 9`,
  changed `2 3`, contains-changes `4 3`, new none), in light and, with the colour scheme emulated, in dark. The pane is small, so the page was looked at with an emulated viewport and zoomed in; read as screenshots
  of boxes whose dash patterns are told apart, not as a design review.
- **Checks run on the final tree.** `JAVA_HOME=<sdkman 25.0.4-tem> PLANTUML_JAR=... ./mvnw -o verify`: BUILD SUCCESS, 333 tests, 0 failures, 0 skipped (integration tests are skipped by default, `skipITs=true`);
  `node --test "src/test/javascript/**/*.test.js"`: 913 pass, 0 fail (909 reported after run 0055, +4 here); `npx prettier --check "src/**/*.java"`: clean. `cargo test` and `embed.sh --check`: not run, the Rust and the
  wasm are untouched.

## Findings

- F1. The legend lines are also generated lines: the wave's gate says the comparison files "differ only on the `LineStyle` of the three states"; they differ on those and on the three legend lines that name the dashes in words
  (the keys the same gate asks to change). Listed above.
- F2. `query schemas` now has `line-gap` in the schema of a style (a change of the output W-2 just made stable; the author writes the release notes, the note above covers it).
- F3. The editor's `changed` (`2 3`) and `contains-changes` (`4 3`) are approximations of the command line's `2-2` and `4-4` (documented in the manual as an approximation); they were not aligned (out of scope), and `2`, `4` against `8`
  are far enough apart in both tools.
- F4. The pair 4 apart rule leaves `changed` (2-2) and `contains-changes` (4-4) 2 apart, which is not a pair of the three and not changed here.
