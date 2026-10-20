---
type: wave
wave: 016
status: proposed
date: 2026-10-20
related:
  - docs/wav/wav-016-band-tree-and-technology-map/wbc-016-band-tree-and-technology-map.md
  - docs/wav/wav-015-editor-reshape-and-loose-ends/wav-015-editor-reshape-and-loose-ends.md
  - docs/wav/wav-015-editor-reshape-and-loose-ends/prg-015-editor-reshape-and-loose-ends.md
  - docs/fixtures/brightcart-spec.md
  - CLAUDE.md
---

# Wave 016 — Band Tree and Technology Map

## Purpose

When this wave is done, the list *Compare with* of the band shows the tree of the plateaus like the list *Plateau* and greys the plateau drawn; the page Environments shows the
application elements and the relationships, each hidden or shown from the toolbar; the Brightcart fixture ships views and stories, so that the untied views and the steps of a
story are checked on it; *Add to story...* can write `at` and `against`, Settings can write `settings.current`, Next and Previous change have a key, and a rename names the plateaus
that still declare the old reference. A story or a view that says `plateau:` loads with no message, a saved view's layer is read in any case by both tools, and a root `container`,
`component` or `node` is an error in a workspace that has plateaus. The text table of `diff` can be wrapped; the CSS of the page and the cost of the render at 600 elements are
audited by tests; the manual and `CLAUDE.md` say all of it, and a workspace with no plateau and no technology map still generates the same views as `archicode-0.14.0`.

## Non-Goals

- Does not build the lifecycle of plateaus: composing the `replaces` of the layers (#89), `plateau merge` (#65) and deleting a plateau that others override (#112) wait for one
  decision (derivation or concatenation) and are for a later wave.
- Does not build `--baseline-ref` (#25), the matrix of N plateaus and a comparison saved in a view (#24) or a drawn timeline (the rest of #72, which moves to #24); a patch still cannot take a
  field out (#94) and the save still does not follow an anchor inside brackets (#78): documented limits.
- Does not draw a story from the command line (#109), does not move a group under a parent of an overridden plateau (#114), does not read YAML 1.1 numbers the same in both tools (#103).
- Does not look at the editor on a real screen: the author looked at it on Brightcart on 2026-10-20 and found it right; the list of #29 stays the author's, and nothing in this wave claims the dark theme or
  a phone were seen (W-10 is a static audit, not a look).
- Does not close or reword any issue that no run closes (#24, #25, #30, #33, #39, #82, #103, #109, #114): that is issue hygiene, proposed to the author and done by hand.
- Does not fix the byte-order mark and the trailing comment of a moved block (#119, low priority). Does not cut a release.

## Decisions

Given by the author on 2026-10-20 and taken as decided by the runs:

- **D1 (#29, the look).** The editor on Brightcart is right for the author. The warning that a story or a view with `plateau:` is ignored goes from the code: nobody but Brightcart consumes a plateau, a story or a view.
- **D2 (#72).** The list on the left stays. The list on the right is the same tree, the plateau selected on the left being greyed in it, so that the reader sees the hierarchy of the plateaus. The plan's reading (see T2) keeps *Nothing* and *Past* above the tree and drops *Future*.
- **D3 (#107).** The Map of the technology layer shows the application elements and the relationships; both can be hidden and shown from the toolbar.
- **D4 (#106).** A root container, component or node is an error in a workspace that has plateaus only.
- **D5 (#110).** A check box in the story picker, checked when a comparison is on screen and unchecked otherwise.
- **D6 (#115).** The Brightcart fixture ships a few views and stories.

## Decisions taken by this plan

Not the author's yet: the plan chooses so that an unattended wave can run. They are listed first in the hand-off report.

- **T1.** `plateau:` on a story or a view is accepted and means nothing, with no message (not an error): a header carries the key for every kind, and the plan does not add a rule the author did not ask for.
- **T2.** *Compare with* keeps *Nothing* and *Past (follows the plateau drawn)* above the tree; the *Future* entries go because the tree lists the children; addresses with `compare=past` or `compare=future` still open. (Recommendation of the review of the open issues, accepted by the author.)
- **T3.** #107: both toggles are properties of the map view, shown by default, so that a saved view and the command line draw what the editor draws; the exact set of applications and relationships is decided by W-8 from #107 and `domain_technology_map` and written in its run document; the author may overrule it. The views of a workspace with a technology map change: 0.14.0 was published the same day and the author is the one known user.
- **T4.** #105 is done only if it is a small change; otherwise the issue stays open with the reason.
- **T5.** #113 is included as a whole (the shortcut and the detail of the current change): the look it was waiting for is done.
- **T6.** The byte-identity base is the tag `archicode-0.14.0` (a jar built from `git archive` outside the repository), not `25471b3`.
- **T7.** `diff --width <columns>`: no option means today's output, byte for byte.
- **T8.** Four issues were filed for what the review found: #116 (rename), #117 (CSS audit), #118 (performance budget) and #119 (left out).

## Wave Manifest


```yaml
wave_manifest:
  wave: 016
  slug: band-tree-and-technology-map
  status: proposed
  sources: []
  phases:
    - id: P0
      name: Two tools, one reading, and the warning that goes
      gate:
        criteria:
          - '`git grep -n -E "ignoredPlateauWarning|ignoredPlateauSentence" -- src` finds nothing, and a story and a view that say `plateau:` load with no message and no error in both tools (cases of `plateau-model-cases.json` and `negative-cases.json`)'
          - 'a saved view with `layer: Technology` (any case) is drawn on the technology layer by both tools, a root `container`, `component` or `node` in a layered workspace gives the same one `error:` line in both tools, and #105 is either fixed with a case or left open with the reason written in run W-2'
          - 'every example of `src/doc/examples` that has views and no plateau gives byte-identical views with a jar built from `git archive archicode-0.14.0` outside the repository (except `domain_manifest_folders`, `domain_plateaus` and the examples with a saved map view)'
          - '`./mvnw -o verify -DskipITs=false`, `cargo test --manifest-path src/main/rust/viewpoint-kernel/Cargo.toml`, `src/main/rust/viewpoint-kernel/embed.sh --check`, `node --test "src/test/javascript/**/*.test.js"` and `npx prettier --check "src/**/*.java"` pass'
    - id: P1
      name: The editor, the Brightcart fixture and the technology Map
      gate:
        criteria:
          - 'the options of *Compare with* are *Nothing*, *Past* and the whole tree of plateaus indented like *Plateau*, the plateau drawn is disabled in it, and `git grep -n "Future: " -- src/main/resources/editor-webapp/standalone.html` finds nothing; the band holds one row at 1280 px and at most two at 360 px (numbers in the run)'
          - 'the Brightcart fixture ships a view that names an element one plateau lacks, a story with `at` and `against` across a fork, a story with none and a saved technology map; `generate.mjs` regenerates it byte for byte and both tools load every file in a test'
          - '*Add to story...* writes `at` and `against` when its box is checked, Settings writes `settings.current`, Next and Previous change have a key that does not fire in a field, and a rename names the plateaus that still declare the old reference (tests on the fixture)'
          - 'the page Environments shows the application elements and the relationships, each hidden or shown from the toolbar and kept by a saved view; `expected-boxes.json` holds the boxes and the lines of both tools with the toggles on and off; `embed.sh --check` ok'
          - '`archicode diff --width <n>` wraps the text table and the output without it is byte-identical to `archicode-0.14.0`'
          - '`./mvnw -o verify -DskipITs=false`, `cargo test --manifest-path src/main/rust/viewpoint-kernel/Cargo.toml`, `src/main/rust/viewpoint-kernel/embed.sh --check`, `node --test "src/test/javascript/**/*.test.js"` and `npx prettier --check "src/**/*.java"` pass'
    - id: P2
      name: Audits and the manual
      gate:
        criteria:
          - 'the static CSS audit passes on the final tree and fails on a copy where a class gets a literal colour; the counts of kernel calls and of reads at 82 and 600 elements are equal where they must be (tests), the times are in the run'
          - '`git grep -n -E "Future: |filesScope|This plateau|With its past" -- src/doc README.md` finds only sentences that say the old form is gone; the manual builds, every example is loaded by both tools, and the views of every example that has views and no technology map are byte-identical to a jar built from `git archive archicode-0.14.0` outside the repository'
          - '`./mvnw -o verify -DskipITs=false`, `cargo test --manifest-path src/main/rust/viewpoint-kernel/Cargo.toml`, `src/main/rust/viewpoint-kernel/embed.sh --check`, `node --test "src/test/javascript/**/*.test.js"` and `npx prettier --check "src/**/*.java"` pass'
  runs:
    - id: W-1
      slug: plateau-on-story-or-view-is-silent
      phase: P0
      depends_on: []
      run: 0107
      delegation: standard
      likely_paths:
        - 'src/main/java/io/morin/archicode/manifest/**'
        - 'src/main/resources/editor-webapp/standalone.html'
        - 'src/test/javascript/viewpoint-kernel/**'
        - 'src/test/resources/brightcart/negative-cases.json'
        - 'src/test/java/**'
        - 'CLAUDE.md'
      focus: 'a story or a view that says `plateau:` loads with no message in both tools: nobody but Brightcart consumes a plateau, a story or a view, so the warning of wave 015 goes'
    - id: W-2
      slug: both-tools-read-the-same-016
      phase: P0
      depends_on: []
      run: 0108
      delegation: standard
      likely_paths:
        - 'src/main/java/io/morin/archicode/workspace/**'
        - 'src/main/java/io/morin/archicode/resource/**'
        - 'src/main/java/io/morin/archicode/manifest/**'
        - 'src/main/resources/editor-webapp/standalone.html'
        - 'src/test/javascript/viewpoint-kernel/**'
        - 'src/test/resources/brightcart/negative-cases.json'
        - 'src/test/java/**'
        - 'CLAUDE.md'
      focus: 'the three places where the editor and the command line still read one input two ways: the layer of a saved view (#108), a root manifest of kind container, component or node (#106) and an item with no value in `relationships` (#105)'
    - id: W-3
      slug: band-compare-shows-the-tree
      phase: P1
      depends_on: []
      run: 0109
      delegation: standard
      likely_paths:
        - 'src/main/resources/editor-webapp/standalone.html'
        - 'src/test/javascript/viewpoint-kernel/**'
        - 'src/doc/README.adoc'
        - 'CLAUDE.md'
      focus: 'the list *Compare with* of the band shows the tree of the plateaus like the list *Plateau*, with the plateau drawn greyed in it (#72, decision of the author)'
    - id: W-4
      slug: brightcart-views-and-stories
      phase: P1
      depends_on: []
      run: 0110
      delegation: standard
      likely_paths:
        - 'src/test/resources/brightcart/**'
        - 'docs/fixtures/brightcart-spec.md'
        - 'src/test/java/**'
        - 'src/test/javascript/viewpoint-kernel/**'
        - 'CLAUDE.md'
      focus: 'the Brightcart fixture ships a few views and stories, so that the untied views and the story steps are checked on the fixture itself (#115, decision of the author)'
    - id: W-5
      slug: add-to-story-and-current-plateau
      phase: P1
      depends_on: [W-4]
      run: 0111
      delegation: standard
      likely_paths:
        - 'src/main/resources/editor-webapp/standalone.html'
        - 'src/test/javascript/viewpoint-kernel/**'
        - 'CLAUDE.md'
      focus: '*Add to story...* can write `at` and `against` (#110) and Settings has a field for `settings.current` (#111)'
    - id: W-6
      slug: next-previous-shortcut
      phase: P1
      depends_on: []
      run: 0112
      delegation: standard
      likely_paths:
        - 'src/main/resources/editor-webapp/standalone.html'
        - 'src/test/javascript/viewpoint-kernel/**'
        - 'CLAUDE.md'
      focus: 'a keyboard shortcut for *Next change* and *Previous change*, and the detail of the current change inside the Changes tab (#113)'
    - id: W-7
      slug: rename-names-the-sibling-plateaus
      phase: P1
      depends_on: []
      run: 0113
      delegation: standard
      likely_paths:
        - 'src/main/resources/editor-webapp/standalone.html'
        - 'src/test/javascript/viewpoint-kernel/**'
        - 'CLAUDE.md'
      focus: 'a rename says which plateaus still declare the old reference before it rewrites the views and the stories that name it (#116)'
    - id: W-8
      slug: technology-map-apps-and-relations
      phase: P1
      depends_on: [W-4]
      run: 0114
      delegation: standard
      likely_paths:
        - 'src/main/rust/viewpoint-kernel/**'
        - 'src/main/wasm/**'
        - 'src/main/java/io/morin/archicode/viewpoint/**'
        - 'src/main/resources/editor-webapp/standalone.html'
        - 'src/test/javascript/viewpoint-kernel/**'
        - 'src/test/resources/technology-map/**'
        - 'src/test/java/**'
        - 'CLAUDE.md'
      focus: 'the page Environments shows the application elements and the relationships, and each can be hidden or shown from the toolbar (#107, as the author rewrote it)'
    - id: W-9
      slug: wrapped-diff-table
      phase: P1
      depends_on: []
      run: 0115
      delegation: standard
      likely_paths:
        - 'src/main/java/io/morin/archicode/cli/**'
        - 'src/main/java/io/morin/archicode/rendering/**'
        - 'src/test/java/**'
        - 'CLAUDE.md'
      focus: 'the text table of `archicode diff` can be wrapped to a width, so that a reference of 447 characters no longer makes it unreadable (#26)'
    - id: W-10
      slug: css-variables-audit
      phase: P2
      depends_on: [W-3, W-5, W-6, W-8]
      run: 0116
      delegation: standard
      likely_paths:
        - 'src/test/javascript/viewpoint-kernel/**'
        - 'src/main/resources/editor-webapp/standalone.html'
      focus: 'a static audit of the CSS of the page: no class uses a colour that is right in one theme only (#117)'
    - id: W-11
      slug: performance-budget
      phase: P2
      depends_on: [W-8]
      run: 0117
      delegation: standard
      likely_paths:
        - 'src/test/javascript/viewpoint-kernel/**'
        - 'src/main/resources/editor-webapp/standalone.html'
        - 'src/main/rust/viewpoint-kernel/**'
      focus: 'the first render, the Map, `quiet` and the Changes list at the size of the largest fixture (600 elements, 839 changes) do not grow faster than the elements (#118)'
    - id: W-12
      slug: manual-and-tutorial-016
      phase: P2
      depends_on: [W-1, W-2, W-3, W-4, W-5, W-6, W-7, W-8, W-9, W-10, W-11]
      run: 0118
      delegation: standard
      likely_paths:
        - 'src/doc/**'
        - 'src/site/**'
        - 'CLAUDE.md'
        - 'docs/fixtures/brightcart-spec.md'
        - 'README.md'
      focus: 'the manual, the tutorial and `CLAUDE.md` say what the editor and the command line do at the end of this wave'
```

## Phase P0 — Two tools, one reading, and the warning that goes

| # | Run | Slug | Depends on | Focus | Scope | Exit evidence |
|---|-----|------|------------|-------|-------|---------------|
| W-1 | — | `plateau-on-story-or-view-is-silent` | — | a story or a view that says `plateau:` loads with no message in both tools: nobody but Brightcart consumes a plateau, a story or a view, so the warning of wave 015 goes | remove `ManifestParser.ignoredPlateauWarning` and the page's sentence (`ignoredPlateauSentence`); the key stays accepted in a header and means nothing for a view or a story (no new error); the cases M01 and M84 to M86 of `plateau-model-cases.json` and N79 of `negative-cases.json` say that the story or the view loads with no message; `CLAUDE.md` loses the sentence about the warning | `git grep -n -E "ignoredPlateauWarning|ignoredPlateauSentence" -- src` finds nothing; the cases both tools run say a story or a view with `plateau:` loads, nothing is printed, and the plateau tree has no plateau made of it; a workspace with no plateau is byte-identical to `archicode-0.14.0`; closes — |
| W-2 | — | `both-tools-read-the-same-016` | — | the three places where the editor and the command line still read one input two ways: the layer of a saved view (#108), a root manifest of kind container, component or node (#106) and an item with no value in `relationships` (#105) | #108: the editor reads `layer` of a saved view in any case, like the command line (a shared case); #106 (decision of the author, 2026-10-20): in a workspace that has plateaus a root manifest of kind `container`, `component` or `node` is one `error:` line that names the file and the kind, in both tools (cases in `layer-checks-cases.json` and `negative-cases.json`; the page does not offer these kinds at the root), and a workspace with no plateau is untouched; #105 only if it is a small change (the editor draws no relationship for an item with no value, the index of a relationship in the file being kept for the edit forms): if it is not, the run says why in its document, leaves #105 open and does not change the page | a saved view with `layer: Technology` is drawn on the technology layer by both tools (a case); a layered workspace with a root `container` gives the same one line in both tools; `archicode-0.14.0` and this tree give the same views for every example that has no plateau; #105 is fixed with a case or left open with the reason written; closes #108, #106 (and #105 if done) |

**Gate:**

- `git grep -n -E "ignoredPlateauWarning|ignoredPlateauSentence" -- src` finds nothing, and a story and a view that say `plateau:` load with no message and no error in both tools (cases of `plateau-model-cases.json` and `negative-cases.json`)
- a saved view with `layer: Technology` (any case) is drawn on the technology layer by both tools, a root `container`, `component` or `node` in a layered workspace gives the same one `error:` line in both tools, and #105 is either fixed with a case or left open with the reason written in run W-2
- every example of `src/doc/examples` that has views and no plateau gives byte-identical views with a jar built from `git archive archicode-0.14.0` outside the repository (except `domain_manifest_folders`, `domain_plateaus` and the examples with a saved map view)
- `./mvnw -o verify -DskipITs=false`, `cargo test --manifest-path src/main/rust/viewpoint-kernel/Cargo.toml`, `src/main/rust/viewpoint-kernel/embed.sh --check`, `node --test "src/test/javascript/**/*.test.js"` and `npx prettier --check "src/**/*.java"` pass

## Phase P1 — The editor, the Brightcart fixture and the technology Map

| # | Run | Slug | Depends on | Focus | Scope | Exit evidence |
|---|-----|------|------------|-------|-------|---------------|
| W-3 | — | `band-compare-shows-the-tree` | — | the list *Compare with* of the band shows the tree of the plateaus like the list *Plateau*, with the plateau drawn greyed in it (#72, decision of the author) | *Compare with*: *Nothing*, *Past (follows the plateau drawn)*, then every plateau in the order of the tree, indented like *Plateau*, the plateau drawn being a disabled option in its place; the entries *Future* go (a child is chosen in the tree; `compare=past` and `compare=future` still open from an address, a single child being the future and several still a choice to make); both lists indent with a no-break space or an `optgroup`, because spaces at the start of an `<option>` collapse on a screen; `AppState.layers` and the addresses do not change shape; the band measured at 1280 and 360 px in the built-in browser; the manual's sentences about the two lists | the options of *Compare with* are *Nothing*, *Past* and the whole tree, the plateau drawn is disabled wherever it stands (root, middle, leaf, a workspace with one plateau) and moves with it, the parent is the comparison with the past and a child the future (tests, `lean-read-only-band.test.js` updated); the band holds one row at 1280 px and at most two at 360 px (numbers in the run); the layered Brightcart (a fork) and a chain of eight are tested; closes #72 |
| W-4 | — | `brightcart-views-and-stories` | — | the Brightcart fixture ships a few views and stories, so that the untied views and the story steps are checked on the fixture itself (#115, decision of the author) | `generate.mjs` writes: a view that names an element only one plateau declares (N81, N82), a story whose steps use `at` and `against` across the forked plateaus (`saas`, `inhouse`), a story with no step plateau, and a saved `viewpoint: map` view of the technology layer; `expected/` and the counts of the tests that read the fixture change; the section 9 of `brightcart-spec.md` says what is shipped; every shipped file is loaded by the command line and the editor in a test | `generate.mjs` regenerates the fixture byte for byte; the command line and the editor load every new file (`ShippedFilesTest`, `shipped-files.test.js` or their equivalents for the fixture) and the page Stories lists the same stories on the four plateaus; the sentence of the manual and of `CLAUDE.md` that says the fixture ships no view or story is corrected; closes #115 |
| W-5 | — | `add-to-story-and-current-plateau` | W-4 | *Add to story...* can write `at` and `against` (#110) and Settings has a field for `settings.current` (#111) | #110 (decision of the author): a check box in the story picker, checked when a comparison is on screen and unchecked otherwise, that writes `at` (the plateau drawn) and `against` on the new step; #111: a field *Current plateau* in Settings (a list of the plateaus and *none*), written through `commitSettingsEdit` with the one sentence of the tools for a plateau that does not exist, and the editor keeps `settings.current` out of the file when it is none; both through the line-preserving save and `markEntryChanged`/`modelsChanged()` as each already does | the step added with the box checked says `at` and `against` of the screen and the editor plays it back (a test on the fixture of W-4); with the box unchecked the step is as before; the field writes and clears `settings.current` and the page then draws the plateau the command line draws by default; closes #110, #111 |
| W-6 | — | `next-previous-shortcut` | — | a keyboard shortcut for *Next change* and *Previous change*, and the detail of the current change inside the Changes tab (#113) | one key for each walk that does not fire while the reader types in an input, a select, a text area or a code editor, and does not change the address; the detail of the current change is shown inside the Changes tab on the page Stories and on the page Plateaus (what #113 asks, read it again before writing); the shortcut is listed where the page lists its tools | the shortcut walks the list as the buttons do, and does nothing when the focus is in a field (tests); the detail follows the walk; nothing about the diagram changes; closes #113 |
| W-7 | — | `rename-names-the-sibling-plateaus` | — | a rename says which plateaus still declare the old reference before it rewrites the views and the stories that name it (#116) | when two plateaus that do not stack both declare the reference, the rename dialog lists them and the views and the steps that name the old reference in each, and the author confirms; a rename in a workspace with no fork asks nothing more than today; the rewrite itself is unchanged | on the layered Brightcart (a fork) a rename of an element that `saas` and `inhouse` both declare lists both and the views that would break; a rename with no sibling opens the dialog as before (tests, byte-identical writes); closes #116 |
| W-8 | — | `technology-map-apps-and-relations` | W-4 | the page Environments shows the application elements and the relationships, and each can be hidden or shown from the toolbar (#107, as the author rewrote it) | the author's sentence (2026-10-20): the Map of the technology layer must show the application elements and the relationships; both can be hidden and shown from the toolbar. Read #107 and `domain_technology_map` first and decide, in the run, the exact set (the applications hosted by the nodes and the environments; the relationships technology elements declare, the ones derived from `uses` between environments and the ones between the applications shown): both shown by default; the toggles are properties of the map view (so that a saved view and the command line draw the same boxes and lines), named in the run and in `expected-boxes.json`; the kernel (Rust, the wasm re-embedded, the contract of the kernel said in its README) or the adapter does it, whichever is smaller; the Map of the application layer is untouched | `src/test/resources/technology-map/expected-boxes.json` says the boxes and the lines both tools draw on `domain_technology_map` and on the technology map of W-4, with the two toggles on and off (a shared test); the toolbar has the two toggles and they are kept by a saved view; the views of every example that has no technology map are byte-identical to `archicode-0.14.0`; `embed.sh --check` ok; closes #107 |
| W-9 | — | `wrapped-diff-table` | — | the text table of `archicode diff` can be wrapped to a width, so that a reference of 447 characters no longer makes it unreadable (#26) | an option `--width <columns>` on `diff` and `views generate` that wraps a long reference and a long cell of the text table (a rule for a reference with no space: cut at the dots and the slashes, then hard); no option: the output is as today, byte for byte; `markdown` and `json` are untouched | a test on the invented pair with long references shows the wrapped table and that without `--width` the output is byte-identical to `archicode-0.14.0`; an unknown or non-positive width is one `error:` line; closes #26 |

**Gate:**

- the options of *Compare with* are *Nothing*, *Past* and the whole tree of plateaus indented like *Plateau*, the plateau drawn is disabled in it, and `git grep -n "Future: " -- src/main/resources/editor-webapp/standalone.html` finds nothing; the band holds one row at 1280 px and at most two at 360 px (numbers in the run)
- the Brightcart fixture ships a view that names an element one plateau lacks, a story with `at` and `against` across a fork, a story with none and a saved technology map; `generate.mjs` regenerates it byte for byte and both tools load every file in a test
- *Add to story...* writes `at` and `against` when its box is checked, Settings writes `settings.current`, Next and Previous change have a key that does not fire in a field, and a rename names the plateaus that still declare the old reference (tests on the fixture)
- the page Environments shows the application elements and the relationships, each hidden or shown from the toolbar and kept by a saved view; `expected-boxes.json` holds the boxes and the lines of both tools with the toggles on and off; `embed.sh --check` ok
- `archicode diff --width <n>` wraps the text table and the output without it is byte-identical to `archicode-0.14.0`
- `./mvnw -o verify -DskipITs=false`, `cargo test --manifest-path src/main/rust/viewpoint-kernel/Cargo.toml`, `src/main/rust/viewpoint-kernel/embed.sh --check`, `node --test "src/test/javascript/**/*.test.js"` and `npx prettier --check "src/**/*.java"` pass

## Phase P2 — Audits and the manual

| # | Run | Slug | Depends on | Focus | Scope | Exit evidence |
|---|-----|------|------------|-------|-------|---------------|
| W-10 | — | `css-variables-audit` | W-3, W-5, W-6, W-8 | a static audit of the CSS of the page: no class uses a colour that is right in one theme only (#117) | a node test that reads the `<style>` of `standalone.html`: every `var(--x)` used by a rule is defined on bare `:root`, and redefined by both dark blocks when the light value would not read on a dark ground; no literal colour outside a short list, each entry with its reason; the page is changed only where the audit finds a defect; it does not replace looking at the dark theme (#29) | the audit passes on the final tree and fails on a copy of the page where a class of wave 015 gets a literal colour (the test says so); closes #117 |
| W-11 | — | `performance-budget` | W-8 | the first render, the Map, `quiet` and the Changes list at the size of the largest fixture (600 elements, 839 changes) do not grow faster than the elements (#118) | in the node harness: the number of kernel calls and of reads of the rows are asserted not to grow with the elements (two sizes), the times are recorded in the run and not asserted; a fix only where a count grows with the elements | the counts at 82 and at 600 elements are equal where they must be (a test); the times are in the run document; no change to a page that already holds; closes #118 |
| W-12 | — | `manual-and-tutorial-016` | W-1, W-2, W-3, W-4, W-5, W-6, W-7, W-8, W-9, W-10, W-11 | the manual, the tutorial and `CLAUDE.md` say what the editor and the command line do at the end of this wave | the two lists of the band; stories and views with a `plateau:` in silence; the layer of a saved view in any case; the root kinds in a layered workspace; Add to story with the box; the field *Current plateau*; the shortcut and the detail of a change; the rename that names the sibling plateaus; the page Environments with its two toggles and the properties of the map view; `--width`; what the shipped Brightcart views and stories are for; `[[plateau-limits]]` loses #105/#106/#108/#110/#111/#113 as they are done and the pointers to #72, #107, #115; the manual builds | `git grep -n -E "Future: \|filesScope|This plateau|With its past" -- src/doc README.md` finds only sentences that say the old form is gone; the manual builds and every example is loaded by both tools; the views of every example that has views and no technology map are byte-identical to `archicode-0.14.0`; closes — |

**Gate:**

- the static CSS audit passes on the final tree and fails on a copy where a class gets a literal colour; the counts of kernel calls and of reads at 82 and 600 elements are equal where they must be (tests), the times are in the run
- `git grep -n -E "Future: |filesScope|This plateau|With its past" -- src/doc README.md` finds only sentences that say the old form is gone; the manual builds, every example is loaded by both tools, and the views of every example that has views and no technology map are byte-identical to a jar built from `git archive archicode-0.14.0` outside the repository
- `./mvnw -o verify -DskipITs=false`, `cargo test --manifest-path src/main/rust/viewpoint-kernel/Cargo.toml`, `src/main/rust/viewpoint-kernel/embed.sh --check`, `node --test "src/test/javascript/**/*.test.js"` and `npx prettier --check "src/**/*.java"` pass

## Dependency View

```
P0:  W-1   W-2
P1:  W-3   W-4 ──┬── W-5        W-6   W-7   W-9
                 └── W-8
P2:  W-10 <── (W-3, W-5, W-6, W-8)     W-11 <── W-8     W-12 <── every run
```

## Open Questions

- **Other shims of compatibility.** The reason the author gave for D1 (no consumer but Brightcart) holds for the other things kept for old workspaces: the `error:` line of `settings.plateaus`, the camel-case facet keys, the Jayway facet dialect rewrite with a warning, the old editor routes (`#/map`, `#/library`). The author named one warning; the plan removes only that one and asks, in its hand-off, whether the others go too.
- **The set of #107 (T3).** "The application elements and the relationships" can mean several sets; W-8 decides and records one.

## Risks

- **Everything but W-9 touches `standalone.html` or the node tests.** All runs `serialize`; no `concurrent-safe` verdict is claimed. They are dispatched one at a time, in the order W-1 to W-12. The pairs that
  share a path: W-1 and W-2 (`plateau-model-cases.json`, `negative-cases.json`, `ManifestParser`), W-3 to W-8, W-10 and W-11 (`standalone.html` and the node tests), W-4, W-5 and W-8 (the Brightcart fixture and its expected files), W-8 and W-11 (the kernel and the wasm), W-12 and every run (`CLAUDE.md`, the manual).
- **Edges.** W-5 and W-8 need W-4 (the fixture they are tested on); W-10 needs the runs that add classes (W-3, W-5, W-6, W-8); W-11 needs W-8 (the render it measures); W-12 needs every run.
- **W-8 is the large one.** It changes the contract of the kernel or its adapter, the wasm and the expected boxes; if it needs a kernel number it says so in its document and in the README of the kernel and re-embeds with `embed.sh`. It is `standard`: nothing in it deletes data, touches credentials or waits for an open decision.
- **Byte-identity.** Every run that changes `src/main` compares the views of every example that has no plateau (and no technology map for W-8) against a jar of `archicode-0.14.0` and says which workspaces and commands.
- **Hand-written files.** Nothing of the author's real workspace is in the repository; every file a run ships is loaded by the command line and by the editor in a test, and a failure that stays is pinned by a test that checks the message.
- **The size.** Twelve runs, all `standard`, one at a time; no run needs a stronger model. A long wave may be interrupted; `complete-wave` resumes from the files, and the executors write their progress in their run document.

## Completion Criteria

The three phase gates verified; `./mvnw -o verify -DskipITs=false`, `cargo test`, `embed.sh --check`, `node --test` and `npx prettier --check "src/**/*.java"` pass on the final tree; every shipped example and fixture is loaded by the command line
and the editor in a test; issues #72, #105 (or its reason), #106, #107, #108, #110, #111, #113, #115, #116, #117, #118 and #26 are closed by their commits; #119 stays open; every item a run lists as "not verified" is in the final report.
