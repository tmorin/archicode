---
type: wave
wave: 015
status: proposed
date: 2026-10-18
related:
  - docs/wav/wav-015-editor-reshape-and-loose-ends/wbc-015-editor-reshape-and-loose-ends.md
  - docs/wav/wav-014-layered-plateaus/wav-014-layered-plateaus.md
  - docs/wav/wav-014-layered-plateaus/prg-014-layered-plateaus.md
  - docs/fixtures/brightcart-spec.md
  - CLAUDE.md
---

# Wave 015 — Editor Reshape and Loose Ends

## Purpose

When this wave is done, the editor opens on the Map of the applications. The band of plateaus is on the pages of the Timeline perspective only, chooses the plateau
drawn and the comparison and edits nothing; the page Plateaus (`#/timeline/plateaus`) makes, edits and deletes plateaus; Files lists every file grouped by plateau; the page
Environments is a Map of the technology layer; stories and views exist whatever plateau is drawn, and a step of a story can say the plateau it is told at and the one it is
compared with. The editor and the command line read the same input the same way and say the same sentence for the same fault, and the command line never crashes on one;
TOML manifests load; the root kinds `container-group`, `solution-group` and `system-group` are gone; the checks of a layer, the nesting rule and the states of a comparison
are written once; a comparison loads each plateau once; `diff --fail-on` and `views generate --only-changes` exist; the native checks run from Maven. The manual and the tutorial
describe all of it, and a workspace without plateaus still generates the same views as before.

## Non-Goals

- Does not build `plateau merge` (#65): it needs the `replaces` of the layers composed (#89) and a design the issue leaves to the layered-model decisions. It stays open.
- Does not compose the `replaces` of the layers (#89), does not let a patch take a field out (#94), does not make the save follow an anchor inside brackets (#78): the
  author accepted these as documented limits on 2026-10-18 (decisions B, D and the wave-014 list), and the manual keeps saying so.
- Does not build `--baseline-ref` (#25, second half: a ref needs a temporary checkout and a rule for a workspace in a sub-folder), a wrapped table for `diff` (#26) or the
  matrix of N plateaus (#24, first half). No design exists for them.
- Does not change what #39 decided (candidates of `replaces` are listed only for a plateau that uses `replaces`) and does not re-measure the candidates on a real pair (#33).
- Does not look at the editor on a real screen, nor on other browsers, nor build the native image locally: the checklist of #29 stays for the author, before the tag, after
  this wave (the pages it lists are the ones this wave reshapes).
- Does not reword the old-mechanism issues (#24 to #27, #29, #30, #33, #39, #43, #44, #65, #72, #80, #90, #96): that is issue hygiene, done by hand at the merge.
- Does not cut a release and does not put any text of a real workspace in the repository.

## Decisions

Given by the author before this wave (they are in the issues) and taken as decided by the runs:

- **D1 (2026-10-18, #92).** The page Environments is a Map like Applications, on the technology layer.
- **D2 (#98).** The band is visible on the pages of Timeline only, read-only and lean; the plateau drawn and the comparison are the editor's state, not the band's.
- **D3 (#99).** The page Timeline is renamed Plateaus (`#/timeline/plateaus`); `#/timeline` opens Applications.
- **D4 (#101).** Files lists all files grouped by plateau, with fold and unfold; the scope choice goes.
- **D5 (#100, challenged and accepted on 2026-10-18).** Stories and views are untied from plateaus (only elements, patches and plateaus are layers). A step of a story may
  carry an optional plateau and an optional comparison, default the plateau drawn, under keys other than the header's `plateau:`; designed with #24. A plateau-free check stays
  (every element named exists in at least one plateau, every view named is declared). `plateau:` on a story or a view is a warning, not an error. #86 closes with #100.
- **D6 (2026-10-18, the eight decisions).** #84: repair TOML and add cases. #79: remove the `*-group` root kinds (enum, editor, creation form). #92: build a map of the technology
  layer. #94: a patch still cannot remove a field. #89: document the limit. #95 was done in wave 014.

## Decisions taken by this plan

These are not the author's yet: the plan chooses so that an unattended wave can run. They are listed first in the hand-off report so the author can overrule them before the wave runs.

- **T1.** #97: the unreachable *Move and write replaces* is removed (the other option, giving the Move a meaning in layers, needs a rule of its own and nothing asks for it). *Write replaces*
  stays the way to write the key.
- **T2.** The step keys are `at` (the plateau it is told at) and `against` (the plateau it is compared with), so they do not share the name of the header's `plateau:`.
- **T3.** `diff --fail-on` takes the seven state words and `any`, a list separated by commas; the exit code is 3 (2 is picocli's usage error, 1 is an error); a difference without
  `--fail-on` is still exit 0.
- **T4.** #88: a folder that holds the `gap.json` or `gap.md` that a comparison writes is left out of a `/**` read, whichever command runs (no `--output` is needed).
- **T5.** #93: only a plateau that no other plateau overrides can be deleted, after a dialog that lists every file that goes; this is the only run on the stronger tier.
- **T6.** #25 is split: `--fail-on` is built, `--baseline-ref` is not; #26 is split: `--only-changes` is built, the wrapped table is not.

## Wave Manifest

```yaml
wave_manifest:
  wave: 015
  slug: editor-reshape-and-loose-ends
  status: proposed
  sources: []
  phases:
    - id: P0
      name: Loose ends of the command line, the kernel and the readers
      gate:
        criteria:
          - 'a comparison parses the manifests once per plateau it loads and never again for the union: a test counts the parses of `views generate --plateau <p> --against <q>`; `dropInheritedReplaces` is gone from `PlateauComparer` and the inherited `replaces` is dropped where the graph is built, with the same numbers on the layered Brightcart for every pair of `BrightcartLayeredDiffTest`; `--plateau <id>` works with a stale `settings.current` (a test); the facets are iterated in the order of the file and the warnings come out in that order whatever the JVM''s hash sequence (a test that runs the command twice with the facets listed in another order); the other commands leave out a folder of generated views whose name `-o` gave (#88: `diff`, `query graph`, `plateau list` after `views generate -o out`, a test)'
          - '`archicode diff --fail-on <states>` exits with the code the manual will give (3) when the comparison holds a change of a listed state and 0 otherwise, and `views generate --only-changes` draws only what changed; both are pinned by tests and by a line of the Native smoke step of `.github/workflows/ci-build.yaml`'
          - 'a manifest in TOML loads on the command line and gives the same graph as its YAML twin (a test per kind that the shipped examples use, and one case in `discovery-cases.json`); `git grep -n -E "archicode.morin.io/(container|solution|system)-group" -- src/main` finds nothing, and a manifest of one of those kinds gives the one sentence `unrecognized header.kind` in both tools, pinned by `negative-cases.json`'
          - 'none of the inputs of #80 gives a stack trace on the command line: each gives one `error:` line or is read as absent, the same in the editor, and each is a case of `negative-cases.json` run by both tools; `header.parent`, `header.plateau` and `content.id` written `yes`, `True` or `on` give the same reference in both tools (a case)'
          - 'the checks of a layer (a relationship, `uses`, a hosted application, a parent, what a view or a story names) and the nesting rule (#87: a system under a container) are one file of cases read by `LayerLoaderTest` and a node test; a kind under a parent that cannot hold it gives one sentence naming the file, with or without patches in its layer; the cases say which tool stops at the first wrong layer and which draws it all the same'
          - '`compare` puts `contains_changes` on the elements of its union and no host derives it any more: `git grep -n -E "referencesAboveChanges|computedStateOf" -- src/main` and the derivation in `StateTags.stateOf` are gone, and one test per host compares the states it reads with those of `compute` on the same data (#96)'
          - 'the first render of the 82-element `marketplace` with a facet makes a fixed number of kernel calls that does not grow with the elements (a test counts them) and takes under 100 ms in the node harness (it took 420 ms, #81)'
          - '`./mvnw -o verify`, `cargo test --manifest-path src/main/rust/viewpoint-kernel/Cargo.toml`, `src/main/rust/viewpoint-kernel/embed.sh --check`, `node --test "src/test/javascript/**/*.test.js"` and `npx prettier --check "src/**/*.java"` pass'
    - id: P1
      name: The editor reshape
      gate:
        criteria:
          - 'the perspectives are Timeline (the pages Plateaus, Applications, Environments, Elements), Stories, Files and Settings; `#/timeline` opens `#/timeline/applications`, `#/timeline/plateaus` is the page of the plateaus, `#/plateaus` still opens it, the old routes still open (`editor-structure.test.js`, the test of the addresses); an address typed while the editor is open draws the plateau and the comparison it names, and Back between two such addresses changes them (#91)'
          - 'the band exists only on the pages of Timeline, offers no write (`git grep -n -E "New plateau|Edit plateau|writing in" -- src/main/resources/editor-webapp/standalone.html` finds them on the page Plateaus only), holds the plateau drawn and the comparison in one row at 1280 px and in at most two rows at 360 px (measured with `getBoundingClientRect` in the built-in browser, the numbers in the run), and the plateau drawn and the comparison survive a visit to Stories, Files and Settings (a test)'
          - '`git grep -n -E "filesScope|FILES_SCOPES|set-files-scope" -- src/main src/test` finds nothing; Files lists every file grouped by plateau, a group folds and unfolds, opening a file unfolds its group, the files that belong to no plateau are in a group of their own, and the warning of a plateau that disagrees with its folder is kept (tests)'
          - 'the page Environments is a Map of the technology layer: draw, pin, hide, save and compare are tested, `elementsScope` and the special case of `currentPageId()` for `environments` are gone, the command line draws a saved view of `layer: technology` with the viewpoint `map` and a shared test shows both tools draw the same boxes on a shipped example'
          - 'a story or a view that says `plateau:` loads with one warning line, the same in both tools (`negative-cases.json`); `PlateauTree.redeclared`, `LayerLoader` and the editor no longer know the plateau of a story or a view; the page Stories lists the same stories whatever plateau is drawn (a test over the four plateaus of the layered Brightcart and a fixture with two stories); the checks that remain are plateau-free (every element a story or a view names exists in at least one plateau, every view a story names is declared)'
          - 'a step of a story may say the plateau it is told at and the plateau it is compared with, under keys that are not the header''s `plateau:`; the editor plays it, the command line reads it and refuses a plateau that does not exist with one sentence, and a shipped example with such a step is loaded by both tools in a test'
          - 'a plateau that no other plateau overrides can be deleted from the page Plateaus after a dialog that lists the files that go, with its `Kind: Plateau` manifest and its own manifests; a plateau another one overrides is refused with the ids that override it; the save is the line-preserving one and a refused write changes nothing (tests)'
          - 'the Changes panel has next and previous change and filters by state and layer, and the Stories page has the Changes tab (tests); the Move dialog can move a nested element to a parent declared in another file and to the top level, says why a parent is not offered, and no longer holds the path that writes `replaces` (`git grep -n "planMoveReplaces" -- src` finds nothing); a refused move changes nothing'
          - '`./mvnw -o verify`, `cargo test --manifest-path src/main/rust/viewpoint-kernel/Cargo.toml`, `src/main/rust/viewpoint-kernel/embed.sh --check`, `node --test "src/test/javascript/**/*.test.js"` and `npx prettier --check "src/**/*.java"` pass'
    - id: P2
      name: Native checks and the manual
      gate:
        criteria:
          - 'the checks of the Native smoke step run as `@QuarkusIntegrationTest` classes: `./mvnw -o verify -DskipITs=false` passes with the JVM jar, and the Native job of `.github/workflows/ci-build.yaml` runs them with `-Dnative`; the script step is gone'
          - '`git grep -n -E "Map of a technology layer does not exist|filesScope|This plateau|With its past|#/timeline\b" -- src/doc README.md` finds only sentences that say the old form is gone; the manual describes the pages, Files, the technology Map, stories and views not tied to plateaus and the steps, `--fail-on`, `--only-changes`, TOML manifests and the kinds that exist; the tutorial follows the new pages from the files; `CLAUDE.md` describes the new mechanism where it described the old one; the manual builds and every example is loaded by both tools (`ShippedFilesTest`, `shipped-files.test.js`)'
          - 'the views of every example of `src/doc/examples` that has views and no plateau (all but `domain_manifest_folders`, which the old jar does not read) are byte-identical to those of a jar built from `git archive 25471b3` outside the repository'
          - '`./mvnw -o verify`, `cargo test --manifest-path src/main/rust/viewpoint-kernel/Cargo.toml`, `src/main/rust/viewpoint-kernel/embed.sh --check`, `node --test "src/test/javascript/**/*.test.js"` and `npx prettier --check "src/**/*.java"` pass'
  runs:
    - id: W-1
      slug: review-findings-and-orders
      phase: P0
      depends_on: []
      run: 0089
      delegation: standard
      likely_paths:
        - 'src/main/java/io/morin/archicode/cli/**'
        - 'src/main/java/io/morin/archicode/workspace/**'
        - 'src/main/java/io/morin/archicode/viewpoint/kernel/**'
        - 'src/main/java/io/morin/archicode/manifest/ManifestDiscovery.java'
        - 'src/main/java/io/morin/archicode/resource/workspace/Settings.java'
        - 'src/test/java/**'
      focus: 'the five findings of the review of wave 014 (#102), the order of the facets (#83) and the generated folders other commands read (#88): one load per plateau, a rule at the place the graph is built, `--plateau` before `settings.current`'
    - id: W-2
      slug: cli-fail-on-and-only-changes
      phase: P0
      depends_on: []
      run: 0090
      delegation: standard
      likely_paths:
        - 'src/main/java/io/morin/archicode/cli/**'
        - 'src/main/java/io/morin/archicode/rendering/gap/**'
        - 'src/test/java/io/morin/archicode/cli/**'
        - '.github/workflows/ci-build.yaml'
      focus: 'fail a build on a change and draw only what changed, from the command line (#25 first half, #26)'
    - id: W-3
      slug: toml-manifests-and-group-kinds
      phase: P0
      depends_on: []
      run: 0091
      delegation: standard
      likely_paths:
        - 'src/main/java/io/morin/archicode/manifest/**'
        - 'src/main/resources/editor-webapp/standalone.html'
        - 'src/main/resources/META-INF/native-image/**'
        - 'src/test/java/**'
        - 'src/test/javascript/viewpoint-kernel/**'
        - 'src/test/resources/**'
      focus: 'a TOML manifest loads, and the three root kinds that do not exist are gone, in both tools (#84, #79)'
    - id: W-4
      slug: editor-reads-like-the-command-line
      phase: P0
      depends_on: [W-3]
      run: 0092
      delegation: standard
      likely_paths:
        - 'src/main/java/io/morin/archicode/manifest/**'
        - 'src/main/java/io/morin/archicode/workspace/**'
        - 'src/main/resources/editor-webapp/standalone.html'
        - 'src/test/resources/brightcart/negative-cases.json'
        - 'src/test/java/**'
        - 'src/test/javascript/viewpoint-kernel/**'
      focus: 'the same input gives the same model or the same sentence in both tools, and the command line never crashes on a null (#80, #85)'
    - id: W-5
      slug: layer-checks-shared-cases
      phase: P0
      depends_on: [W-3]
      run: 0093
      delegation: standard
      likely_paths:
        - 'src/main/java/io/morin/archicode/workspace/**'
        - 'src/main/java/io/morin/archicode/resource/**'
        - 'src/main/resources/editor-webapp/standalone.html'
        - 'src/test/java/**'
        - 'src/test/javascript/viewpoint-kernel/**'
      focus: 'the checks of a layer and the nesting rule are written once as cases that both tools run (#90, #87)'
    - id: W-6
      slug: compare-says-contains-changes
      phase: P0
      depends_on: []
      run: 0094
      delegation: standard
      likely_paths:
        - 'src/main/rust/viewpoint-kernel/**'
        - 'src/main/wasm/viewpoint_kernel.wasm'
        - 'src/main/java/io/morin/archicode/workspace/StateTags.java'
        - 'src/main/java/io/morin/archicode/viewpoint/kernel/**'
        - 'src/main/resources/editor-webapp/standalone.html'
        - 'src/test/**'
      focus: 'the kernel says `contains-changes` for the elements of a comparison, and the two copies of the rule go (#96)'
    - id: W-7
      slug: quiet-references-in-one-call
      phase: P0
      depends_on: []
      run: 0095
      delegation: standard
      likely_paths:
        - 'src/main/rust/viewpoint-kernel/**'
        - 'src/main/wasm/viewpoint_kernel.wasm'
        - 'src/main/resources/editor-webapp/standalone.html'
        - 'src/test/javascript/viewpoint-kernel/**'
      focus: 'the first render with a facet does not block the page: one kernel answer says which elements have nothing to draw (#81)'
    - id: W-8
      slug: plateaus-page-and-addresses
      phase: P1
      depends_on: []
      run: 0096
      delegation: standard
      likely_paths:
        - 'src/main/resources/editor-webapp/standalone.html'
        - 'src/test/javascript/viewpoint-kernel/**'
      focus: 'the page Timeline becomes Plateaus, the perspective opens on Applications, and an address typed while the editor is open draws what it names (#99, #91)'
    - id: W-9
      slug: lean-read-only-band
      phase: P1
      depends_on: [W-8]
      run: 0097
      delegation: standard
      likely_paths:
        - 'src/main/resources/editor-webapp/standalone.html'
        - 'src/test/javascript/viewpoint-kernel/**'
      focus: 'the band chooses the plateau and the comparison on the pages of Timeline and does nothing else (#98, #82)'
    - id: W-10
      slug: files-grouped-by-plateau
      phase: P1
      depends_on: [W-8]
      run: 0098
      delegation: standard
      likely_paths:
        - 'src/main/resources/editor-webapp/standalone.html'
        - 'src/test/javascript/viewpoint-kernel/**'
      focus: 'the page Files shows every file, grouped by plateau, folded and unfolded as the author wishes (#101)'
    - id: W-11
      slug: technology-map
      phase: P1
      depends_on: []
      run: null
      delegation: standard
      likely_paths:
        - 'src/main/resources/editor-webapp/standalone.html'
        - 'src/main/java/io/morin/archicode/viewpoint/**'
        - 'src/main/rust/viewpoint-kernel/**'
        - 'src/test/**'
        - 'src/doc/examples/**'
      focus: 'the page Environments is a Map of the technology layer, like Applications (#92)'
    - id: W-12
      slug: stories-and-views-untied
      phase: P1
      depends_on: [W-5, W-10]
      run: null
      delegation: standard
      likely_paths:
        - 'src/main/java/io/morin/archicode/resource/plateau/**'
        - 'src/main/java/io/morin/archicode/manifest/**'
        - 'src/main/java/io/morin/archicode/workspace/**'
        - 'src/main/resources/editor-webapp/standalone.html'
        - 'src/test/resources/brightcart/**'
        - 'src/test/java/**'
        - 'src/test/javascript/viewpoint-kernel/**'
      focus: 'a story and a view exist whatever plateau is drawn; only elements, patches and plateaus are layers (#100, #86)'
    - id: W-13
      slug: story-steps-plateau-and-compare
      phase: P1
      depends_on: [W-12]
      run: null
      delegation: standard
      likely_paths:
        - 'src/main/java/io/morin/archicode/resource/story/**'
        - 'src/main/java/io/morin/archicode/workspace/**'
        - 'src/main/resources/editor-webapp/standalone.html'
        - 'src/doc/examples/**'
        - 'src/test/**'
      focus: 'a step of a story can be told at a plateau and compared with another one (#24, second half)'
    - id: W-14
      slug: delete-a-plateau
      phase: P1
      depends_on: [W-8, W-9]
      run: null
      delegation: hard_judgment
      delegation_reason: 'data deletion: the editor removes a plateau''s manifests from the author''s workspace'
      likely_paths:
        - 'src/main/resources/editor-webapp/standalone.html'
        - 'src/test/javascript/viewpoint-kernel/**'
      focus: 'delete a plateau from the page Plateaus without losing anything the author did not see listed (#93)'
    - id: W-15
      slug: reading-a-long-list-of-changes
      phase: P1
      depends_on: []
      run: null
      delegation: standard
      likely_paths:
        - 'src/main/resources/editor-webapp/standalone.html'
        - 'src/test/javascript/viewpoint-kernel/**'
      focus: 'read 167 changes without losing the place: next and previous, filters, the Changes tab on Stories (#27)'
    - id: W-16
      slug: move-to-another-file-or-the-top
      phase: P1
      depends_on: [W-3]
      run: null
      delegation: standard
      likely_paths:
        - 'src/main/resources/editor-webapp/standalone.html'
        - 'src/test/javascript/viewpoint-kernel/**'
      focus: 'move an element wherever it can go, say why a parent is not offered, and drop the path nobody can reach (#43, #44, #97)'
    - id: W-17
      slug: native-checks-as-integration-tests
      phase: P2
      depends_on: [W-2, W-3]
      run: null
      delegation: standard
      likely_paths:
        - 'pom.xml'
        - '.github/workflows/ci-build.yaml'
        - 'src/test/java/**'
        - 'src/main/resources/META-INF/native-image/**'
      focus: 'the checks the Native job runs by script run from Maven, on the JVM jar and on the native runner (#62)'
    - id: W-18
      slug: manual-and-tutorial-015
      phase: P2
      depends_on: [W-1, W-2, W-3, W-4, W-5, W-6, W-7, W-8, W-9, W-10, W-11, W-12, W-13, W-14, W-15, W-16, W-17]
      run: null
      delegation: standard
      likely_paths:
        - 'src/doc/**'
        - 'src/site/**'
        - 'CLAUDE.md'
        - 'docs/fixtures/brightcart-spec.md'
        - 'README.md'
      focus: 'learn the editor and the command line as they end this wave, from the manual and the tutorial'
```

## Phase P0 — Loose ends of the command line, the kernel and the readers

| # | Run | Slug | Depends on | Focus | Scope | Exit evidence |
|---|-----|------|------------|-------|-------|---------------|
| W-1 | — | `review-findings-and-orders` | — | the five findings of the review of wave 014 (#102), the order of the facets (#83) and the generated folders other commands read (#88): one load per plateau, a rule at the place the graph is built, `--plateau` before `settings.current` | `WorkspaceFactory` parses once and `createUnion` takes the target already loaded; the inherited `replaces` is dropped where the layered graph is built and `dropInheritedReplaces` goes; `chosen` looks at `--plateau` first; `patchMapper` once per load; the Javadoc; `Settings.Facets.customs` keeps the order of the file; discovery leaves out a folder that holds the `gap.json` or `gap.md` a comparison writes (or one `-o` named), whichever command runs | the first criterion of P0; `BrightcartLayeredDiffTest` numbers unchanged; closes #83, #88 and #102 |
| W-2 | — | `cli-fail-on-and-only-changes` | — | fail a build on a change and draw only what changed, from the command line (#25 first half, #26) | `diff --fail-on <state>[,<state>...]` with the seven state words from `KernelStates` (and `any`), exit code 3, nothing else changes in the output; `views generate --only-changes` passes the kernel option; both documented in the command's help; `--baseline-ref` and a wrapped table stay out (Non-Goals) | the second criterion of P0; closes the `--fail-on` half of #25 and the `--only-changes` half of #26 (the rest of each is re-aimed) |
| W-3 | — | `toml-manifests-and-group-kinds` | — | a TOML manifest loads, and the three root kinds that do not exist are gone, in both tools (#84, #79) | `ManifestConverter` reads the content, which is JSON text, with a JSON mapper; a TOML twin of a YAML manifest gives the same graph; `ManifestKind`, `ARCHICODE_KIND_MAP`, `READ_SCHEMA` and the creation form lose `container-group`, `solution-group` and `system-group`; the editor keeps saying which files it does not read (TOML) | the third criterion of P0; closes #84 and #79 |
| W-4 | — | `editor-reads-like-the-command-line` | W-3 | the same input gives the same model or the same sentence in both tools, and the command line never crashes on a null (#80, #85) | `null` where a list or an object is expected, an empty `workspace.yaml`, `header.kind` as a number, items that are lists, the coercions the page does not follow, the Java names in `known: ...` replaced by the documented spellings, YAML 1.1 words in `header.parent`, `header.plateau` and `content.id`; each case goes to `negative-cases.json` or `plateau-model-cases.json`; the editor says the line and the column when the command line does, or the cases say it does not | the fourth criterion of P0; closes #80 and #85 |
| W-5 | — | `layer-checks-shared-cases` | W-3 | the checks of a layer and the nesting rule are written once as cases that both tools run (#90, #87) | one file of cases (workspace files, plateau, the sentences in order, which tool stops at the first wrong layer and which draws it all the same) read by `LayerLoaderTest` and a node test; the rule "which kind a parent holds" written once as data (from the model classes, read by the page's tables or checked against them as `EditorReadSchemaTest` does) and checked when an element is added, for every path, so a patched layer is no special case; the sentence is the reader's today, `unknown kind ... (known: ...)`, with the file | the fifth criterion of P0; closes #90 and #87 |
| W-6 | — | `compare-says-contains-changes` | — | the kernel says `contains-changes` for the elements of a comparison, and the two copies of the rule go (#96) | an additive key on the elements of `compare`'s union (`compute` must not read it back as a free-form field: check what a facet sees); the kernel README says it; `StateTags.stateOf` and the page's `referencesAboveChanges` and `computedStateOf` read it; one test per host draws the same data through `compute` and compares; `embed.sh` re-embeds the wasm | the sixth criterion of P0; closes #96 |
| W-7 | — | `quiet-references-in-one-call` | — | the first render with a facet does not block the page: one kernel answer says which elements have nothing to draw (#81) | a kernel entry (or an extension of `compute`) that answers "which elements have nothing to draw" for a layer and a viewpoint in one call; `quietReferencesThroughFacet` uses it; the answer stays cached on the version counter and the facet; the node harness measures the 82-element `marketplace` | the seventh criterion of P0; closes #81 |

**Gate:**

- a comparison parses the manifests once per plateau it loads and never again for the union: a test counts the parses of `views generate --plateau <p> --against <q>`; `dropInheritedReplaces` is gone from `PlateauComparer` and the inherited `replaces` is dropped where the graph is built, with the same numbers on the layered Brightcart for every pair of `BrightcartLayeredDiffTest`; `--plateau <id>` works with a stale `settings.current` (a test); the facets are iterated in the order of the file and the warnings come out in that order whatever the JVM's hash sequence (a test that runs the command twice with the facets listed in another order); the other commands leave out a folder of generated views whose name `-o` gave (#88: `diff`, `query graph`, `plateau list` after `views generate -o out`, a test)
- `archicode diff --fail-on <states>` exits with the code the manual will give (3) when the comparison holds a change of a listed state and 0 otherwise, and `views generate --only-changes` draws only what changed; both are pinned by tests and by a line of the Native smoke step of `.github/workflows/ci-build.yaml`
- a manifest in TOML loads on the command line and gives the same graph as its YAML twin (a test per kind that the shipped examples use, and one case in `discovery-cases.json`); `git grep -n -E "archicode.morin.io/(container|solution|system)-group" -- src/main` finds nothing, and a manifest of one of those kinds gives the one sentence `unrecognized header.kind` in both tools, pinned by `negative-cases.json`
- none of the inputs of #80 gives a stack trace on the command line: each gives one `error:` line or is read as absent, the same in the editor, and each is a case of `negative-cases.json` run by both tools; `header.parent`, `header.plateau` and `content.id` written `yes`, `True` or `on` give the same reference in both tools (a case)
- the checks of a layer (a relationship, `uses`, a hosted application, a parent, what a view or a story names) and the nesting rule (#87: a system under a container) are one file of cases read by `LayerLoaderTest` and a node test; a kind under a parent that cannot hold it gives one sentence naming the file, with or without patches in its layer; the cases say which tool stops at the first wrong layer and which draws it all the same
- `compare` puts `contains_changes` on the elements of its union and no host derives it any more: `git grep -n -E "referencesAboveChanges|computedStateOf" -- src/main` and the derivation in `StateTags.stateOf` are gone, and one test per host compares the states it reads with those of `compute` on the same data (#96)
- the first render of the 82-element `marketplace` with a facet makes a fixed number of kernel calls that does not grow with the elements (a test counts them) and takes under 100 ms in the node harness (it took 420 ms, #81)
- `./mvnw -o verify`, `cargo test --manifest-path src/main/rust/viewpoint-kernel/Cargo.toml`, `src/main/rust/viewpoint-kernel/embed.sh --check`, `node --test "src/test/javascript/**/*.test.js"` and `npx prettier --check "src/**/*.java"` pass

## Phase P1 — The editor reshape

| # | Run | Slug | Depends on | Focus | Scope | Exit evidence |
|---|-----|------|------------|-------|-------|---------------|
| W-8 | — | `plateaus-page-and-addresses` | — | the page Timeline becomes Plateaus, the perspective opens on Applications, and an address typed while the editor is open draws what it names (#99, #91) | `PERSPECTIVES.timeline` label and route (`#/timeline/plateaus`), `#/timeline` rewritten to `#/timeline/applications`, `#/plateaus` kept; `hashchange` draws the plateau and the comparison the address names (`drawPlateau`, `compareWithPlateau`) and the history has an entry per change; editing of plateaus is on this page | the first criterion of P1; closes #99 and #91 |
| W-9 | — | `lean-read-only-band` | W-8 | the band chooses the plateau and the comparison on the pages of Timeline and does nothing else (#98, #82) | visible only on the pages of Timeline; `bandWritingHtml` and its buttons move to the page Plateaus; the status sentence, the mistakes and the switch Everything / Changes only move to where they belong or behind one control, decided in the run and shown on the 4 plateaus of the layered Brightcart and on a long chain; the state is `AppState.layers`, not the band's; the width at 360 px is measured | the second criterion of P1; closes #98 and the width part of #82 |
| W-10 | — | `files-grouped-by-plateau` | W-8 | the page Files shows every file, grouped by plateau, folded and unfolded as the author wishes (#101) | `filesScope`, `FILES_SCOPES`, `set-files-scope` and the filter go; the groups come from `filePlateauOf`; files with no plateau (`workspace.yaml`, and the stories and views once they are not tied) are a group of their own; opening a file unfolds its group; the folds are kept for the session only; `filePlateauFolderWarning` stays | the third criterion of P1; closes #101 |
| W-11 | — | `technology-map` | — | the page Environments is a Map of the technology layer, like Applications (#92) | `buildKernelInput`, `currentViewDefinition`, `viewProblem`, *Open in Elements*, *Name view...* and the Changes panel take the layer as a parameter; saved views of `layer: technology` and `viewpoint: map` load and save like the application ones; states of a comparison on the boxes; `elementsScope` goes; the command line draws such a view (checked, fixed if not) and a shipped example with one is loaded by both tools | the fourth criterion of P1; closes #92 |
| W-12 | — | `stories-and-views-untied` | W-5, W-10 | a story and a view exist whatever plateau is drawn; only elements, patches and plateaus are layers (#100, #86) | the author's decision of 2026-10-18 on #100: assumption A8 of wave 014 is revised; `plateau:` on a story or a view is one warning line, the same in both tools; `PlateauTree.redeclared`, `LayerLoader` and `layerChainSet`, `allStories`, `allSavedViews` lose the plateau of a story or view; the plateau-free check (every element named exists in at least one plateau, every view named is declared); a new story or view is written in a folder of its own, not in the plateau drawn; rename and delete drop the plateau cases; `negative-cases.json` and `plateau-model-cases.json` follow | the fifth criterion of P1; closes #100 and #86 |
| W-13 | — | `story-steps-plateau-and-compare` | W-12 | a step of a story can be told at a plateau and compared with another one (#24, second half) | the step gets two optional keys, `at` (the plateau it is told at, default the plateau drawn) and `against` (the plateau it is compared with), chosen by this plan so as not to share the header's `plateau:`; the editor plays them and writes them from the step's form; the command line reads them and refuses an unknown plateau with one sentence; an example with such a step is shipped and loaded by both tools; the matrix of N plateaus (#24, first half) stays out | the sixth criterion of P1; closes the second half of #24 (the first half is re-aimed) |
| W-14 | — | `delete-a-plateau` | W-8, W-9 | delete a plateau from the page Plateaus without losing anything the author did not see listed (#93) | deletable only when no other plateau overrides it (the others are named in the refusal); a dialog lists the files that go (its `Kind: Plateau` manifest and every manifest whose header says its id) and nothing else; the elements other plateaus inherit from it are never deleted because only a leaf can go; the write goes through the line-preserving save and `guardedLayerWrite`, and a refused write changes nothing | the seventh criterion of P1; closes #93 |
| W-15 | — | `reading-a-long-list-of-changes` | — | read 167 changes without losing the place: next and previous, filters, the Changes tab on Stories (#27) | next and previous change buttons, filters by state and by layer on the Changes list, the Changes tab on the page Stories (the right panel of that page is the view's own today) | the eighth criterion of P1; closes #27 |
| W-16 | — | `move-to-another-file-or-the-top` | W-3 | move an element wherever it can go, say why a parent is not offered, and drop the path nobody can reach (#43, #44, #97) | a nested element to a parent declared in another file (cut the block from one file and paste it in the other, both marked modified, comments and quotes carried over, or offer a manifest of its own); an element to the top level for the kinds that may be roots; "why not" for each parent left out; the decision of #97 taken by this plan: remove the unreachable *Move and write replaces* (`planMoveReplaces`, `replacesWith` in `commitMoveElement`, the second button), the tests that stub it, and say in the Move dialog that *Move* writes no `replaces`, which is where *Write replaces* is | the eighth criterion of P1; closes #43, #44 and #97 |

**Gate:**

- the perspectives are Timeline (the pages Plateaus, Applications, Environments, Elements), Stories, Files and Settings; `#/timeline` opens `#/timeline/applications`, `#/timeline/plateaus` is the page of the plateaus, `#/plateaus` still opens it, the old routes still open (`editor-structure.test.js`, the test of the addresses); an address typed while the editor is open draws the plateau and the comparison it names, and Back between two such addresses changes them (#91)
- the band exists only on the pages of Timeline, offers no write (`git grep -n -E "New plateau|Edit plateau|writing in" -- src/main/resources/editor-webapp/standalone.html` finds them on the page Plateaus only), holds the plateau drawn and the comparison in one row at 1280 px and in at most two rows at 360 px (measured with `getBoundingClientRect` in the built-in browser, the numbers in the run), and the plateau drawn and the comparison survive a visit to Stories, Files and Settings (a test)
- `git grep -n -E "filesScope|FILES_SCOPES|set-files-scope" -- src/main src/test` finds nothing; Files lists every file grouped by plateau, a group folds and unfolds, opening a file unfolds its group, the files that belong to no plateau are in a group of their own, and the warning of a plateau that disagrees with its folder is kept (tests)
- the page Environments is a Map of the technology layer: draw, pin, hide, save and compare are tested, `elementsScope` and the special case of `currentPageId()` for `environments` are gone, the command line draws a saved view of `layer: technology` with the viewpoint `map` and a shared test shows both tools draw the same boxes on a shipped example
- a story or a view that says `plateau:` loads with one warning line, the same in both tools (`negative-cases.json`); `PlateauTree.redeclared`, `LayerLoader` and the editor no longer know the plateau of a story or a view; the page Stories lists the same stories whatever plateau is drawn (a test over the four plateaus of the layered Brightcart and a fixture with two stories); the checks that remain are plateau-free (every element a story or a view names exists in at least one plateau, every view a story names is declared)
- a step of a story may say the plateau it is told at and the plateau it is compared with, under keys that are not the header's `plateau:`; the editor plays it, the command line reads it and refuses a plateau that does not exist with one sentence, and a shipped example with such a step is loaded by both tools in a test
- a plateau that no other plateau overrides can be deleted from the page Plateaus after a dialog that lists the files that go, with its `Kind: Plateau` manifest and its own manifests; a plateau another one overrides is refused with the ids that override it; the save is the line-preserving one and a refused write changes nothing (tests)
- the Changes panel has next and previous change and filters by state and layer, and the Stories page has the Changes tab (tests); the Move dialog can move a nested element to a parent declared in another file and to the top level, says why a parent is not offered, and no longer holds the path that writes `replaces` (`git grep -n "planMoveReplaces" -- src` finds nothing); a refused move changes nothing
- `./mvnw -o verify`, `cargo test --manifest-path src/main/rust/viewpoint-kernel/Cargo.toml`, `src/main/rust/viewpoint-kernel/embed.sh --check`, `node --test "src/test/javascript/**/*.test.js"` and `npx prettier --check "src/**/*.java"` pass

## Phase P2 — Native checks and the manual

| # | Run | Slug | Depends on | Focus | Scope | Exit evidence |
|---|-----|------|------------|-------|-------|---------------|
| W-17 | — | `native-checks-as-integration-tests` | W-2, W-3 | the checks the Native job runs by script run from Maven, on the JVM jar and on the native runner (#62) | `@QuarkusIntegrationTest` classes for the examples of the manual (`views generate`, `query views`, `query schemas`, `query graph`, `diff`, `diff --fail-on`, `views generate --plateau --against`, a TOML manifest, `editor serve`); the Native job runs `./mvnw verify -Dnative` and the script step goes; the native image itself is checked by CI only | the first criterion of P2; closes #62 |
| W-18 | — | `manual-and-tutorial-015` | W-1, W-2, W-3, W-4, W-5, W-6, W-7, W-8, W-9, W-10, W-11, W-12, W-13, W-14, W-15, W-16, W-17 | learn the editor and the command line as they end this wave, from the manual and the tutorial | the pages, the band, Files, the technology Map, stories and views not tied to plateaus and the steps, deleting a plateau, the Changes panel, the Move dialog, `--fail-on`, `--only-changes`, TOML manifests, the kinds that exist, the limits that stay (`[[plateau-limits]]`: #89, #94, #78, and what no longer is one); the tutorial follows the new pages from the files; `CLAUDE.md` is corrected where it described the old pages; the document of the fixture says what a tool verifies | the second and third criteria of P2 |

**Gate:**

- the checks of the Native smoke step run as `@QuarkusIntegrationTest` classes: `./mvnw -o verify -DskipITs=false` passes with the JVM jar, and the Native job of `.github/workflows/ci-build.yaml` runs them with `-Dnative`; the script step is gone
- `git grep -n -E "Map of a technology layer does not exist|filesScope|This plateau|With its past|#/timeline\b" -- src/doc README.md` finds only sentences that say the old form is gone; the manual describes the pages, Files, the technology Map, stories and views not tied to plateaus and the steps, `--fail-on`, `--only-changes`, TOML manifests and the kinds that exist; the tutorial follows the new pages from the files; `CLAUDE.md` describes the new mechanism where it described the old one; the manual builds and every example is loaded by both tools (`ShippedFilesTest`, `shipped-files.test.js`)
- the views of every example of `src/doc/examples` that has views and no plateau (all but `domain_manifest_folders`, which the old jar does not read) are byte-identical to those of a jar built from `git archive 25471b3` outside the repository
- `./mvnw -o verify`, `cargo test --manifest-path src/main/rust/viewpoint-kernel/Cargo.toml`, `src/main/rust/viewpoint-kernel/embed.sh --check`, `node --test "src/test/javascript/**/*.test.js"` and `npx prettier --check "src/**/*.java"` pass

## Dependency View

```
P0:  W-1   W-2   W-3 ──┬── W-4        W-6   W-7
                       └── W-5
P1:  W-8 ──┬── W-9 ──┬── W-14         W-11   W-15   W-16 <── W-3
           └── W-10 ──┴── W-12 <── W-5, then W-13 <── W-12
P2:  W-17 <── (W-2, W-3)      W-18 <── every run
```

## Open Questions

- **#65, merge a future plateau into the present.** Waits for a rule for the `replaces` of the layers (#89) and for what *derivation versus concatenation* means once stories are untied. The
  issue stays open and the wave does not touch it.
- **The editor on a real screen.** No run can look at a page; the runs read it and measure it in the built-in browser and say what they did not see (as in waves 012 to 014). The
  list is #29's, to run by hand before the tag.
- **The names `at` and `against` of the step keys (T2).** W-13 may find a reason to rename them and says so in its run document before it writes a manual sentence.
- **#98: what stays on the band.** The issue gives the choice to the run ("the decision of what stays is part of this issue"); W-9 shows it on the 4 plateaus of the Brightcart and on a
  long chain and records the choice.

## Risks

- **Everything touches `standalone.html`.** Fourteen runs edit the page, six edit the kernel or the readers; one `target/` and one wasm. All runs `serialize`; no `concurrent-safe`
  verdict is claimed. They are dispatched one at a time, in the order W-1, W-2, W-3, W-4, W-5, W-6, W-7, W-8, W-9, W-10, W-11, W-12, W-13, W-14, W-15, W-16, W-17, W-18. The pairs that
  share a path: W-1 and W-2 (`cli/**`), W-1 and W-5 (`workspace/**`), W-3, W-4, W-5, W-12 (`manifest/**`, `resource/**`, `negative-cases.json`), W-6 and W-7 (the kernel and the wasm: two builds
  of one binary cannot merge), W-8 to W-16 (`standalone.html` and the node tests), W-2 and W-17 (`ci-build.yaml`), W-17 and W-18 (the examples).
- **Edges.** W-4 and W-5 need W-3 (the kinds the readers know). W-9 and W-10 need W-8 (the pages and routes they rewrite). W-12 needs W-5 (the checks it revises are the ones W-5 turns into cases) and
  W-10 (the group of files that belong to no plateau). W-13 needs W-12. W-14 needs W-8 and W-9 (the page Plateaus and a read-only band). W-16 needs W-3 (the kinds that may be roots). W-17 needs W-2 and W-3
  (it tests `--fail-on` and a TOML manifest). W-18 needs every other run.
- **W-12 revises assumption A8 of wave 014**, which the whole of wave 014 was built on (`LayerLoader`, `PlateauTree.redeclared`, `layerChainSet`, `allStories`). The run changes the model, the checks, the sentences,
  the editor and the cases in one go; if it finds a use of `plateau:` on a story or view that the plan does not know, it records it, keeps the warning and stops that branch.
- **Byte-identity.** Every run that changes `src/main` compares the views of every example of the repository that has no plateau against a jar built from `25471b3` (`git archive`, outside the
  repository), and says which workspaces and which commands. `domain_manifest_folders` is the one example the old jar does not read.
- **The contract of the kernel.** W-6 and W-7 add to `compare` and `compute` additively; if a run finds that a number is needed, it says it in its document and in the README of the kernel, and
  re-embeds the wasm with `embed.sh`.
- **Hand-written files.** Nothing from the author's real workspace is in the repository; the examples are invented. Every file or example a run ships is loaded by the command line and by the editor in a test
  (the rule of `CLAUDE.md`), and a failure that stays is pinned by a test that checks the message.
- **Outward-facing writes.** The runs file GitHub issues only for out-of-scope defects and name them in the log. The commits close the issues by keyword; the hygiene of the old issues is by hand.
- **The size.** Eighteen runs, one on the stronger tier, one run at a time. The wave is as large as wave 014 and edits the same page; a long wave may be interrupted, and `complete-wave` resumes from the files.

## Completion Criteria

The three phase gates verified; `./mvnw -o verify`, `cargo test`, `embed.sh --check`, `node --test` and `npx prettier --check "src/**/*.java"` pass on the final tree; every shipped example and fixture is
loaded by the command line and the editor in a test; issues #27, #43, #44, #62, #79, #81, #83, #84, #85, #86, #87, #88, #90, #91, #92, #93, #96, #97, #98, #99, #100, #101, #102 and
the `--fail-on` half of #25 are closed by their commits or re-filed with the reason; #25 (the `--baseline-ref` half) stays open with its reason; #65, #89, #94 and #78 stay open as limits; every item a run lists as "not
verified" is in the final report, with the list of #29 that the author runs on a real screen before the tag.
