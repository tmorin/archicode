---
type: wave
wave: 019
status: proposed
date: 2026-10-22
related:
  - docs/wav/wav-019-followups-of-wave-018/wbc-019-followups-of-wave-018.md
  - docs/wav/wav-018-groups-shims-and-plateau-gaps/wav-018-groups-shims-and-plateau-gaps.md
  - docs/wav/wav-018-groups-shims-and-plateau-gaps/prg-018-groups-shims-and-plateau-gaps.md
  - CLAUDE.md
---

# Wave 019 — Fixes and Follow-ups, no New Feature

## Purpose

When this wave is done, every open issue that is a fix, a loose end or a rename is closed, and none of them adds a feature: the follow-ups of wave 018 (#136 to #140), the save of the editor that keeps anchors and tags inside brackets (#78), the cost of the kernel on a large pair of plateaus (#125) and the name of the workspace file (#133) are each fixed or filed again with a reason.
The editor and the command line read a YAML number the same way in the four cases #136 left (or the difference is pinned with its sentence); the editor keeps its open key within its cap on a resize, keeps the typed form through every dialog and checks what a layer cannot hold before it writes; the technology maps and the three viewpoints draw the dependencies towards the inside of a deployed application; `archicode stories generate` writes what `views generate` writes for a comparison and for the facets; the file that marks a workspace is `.archicode.yaml`. The manual and `CLAUDE.md` say what the tools do at the end of the wave, with the breaking change told in one block.

## Non-Goals

- Adds no feature that is not a fix of something already built: the importers from LikeC4 (#134) and Structurizr (#135), `plateau merge` (#65), the matrix of N plateaus (#24) and the calmer reading of a story (#142) stay open. #140 and #139 are in the wave because the author kept them (they complete what `stories generate` and the technology maps already do).
- Does not offer a way through where the editor refuses (moving patches or elements into the plateau above, #138): that is a feature. The refusal stays; the manual tells how to fold a plateau into the one above by hand; #138 is closed as not planned after W-3.
- Does not make the editor read an anchor or a tag on a mapping key (#78): the command line reads it, the editor refuses it with its sentence, and the difference is documented in the limits as not planned (a wrong splice on a key would lose text, for a form nobody writes). The merge key `<<` is refused by both tools and is documented.
- Does not change the command line to match the page where the page cannot do what the command line does (#136): the command line is the reference, the difference is pinned.
- Does not rename or edit anything in a real workspace of the author (including the git-ignored `.custom/` and the one kept in a synchronized folder): the author renames those, and no file of them enters the repository.
- Does not keep `workspace.yaml` as a second name (no alias, no migration command): the author asked for a clean break.
- Does not cut a release (the author's call after the wave).

## Decision Prerequisites

None open. The two that were open were decided by the author on 2026-10-22: #138 (no offer, the refusal stays, see T4) and #78 (the editor reads what the command line reads, except an anchor or a tag on a key, see T2 and T7).

## Plan decisions

Choices made by the plan, not by the author; each can be reversed by the author in review. The final report lists them.

- **T1.** The byte-identity base for P0 is the tag `archicode-0.17.0` (a jar built from `git archive` outside the repository). A run that changes `src/main` compares `views generate`, `query graph` and `diff` on every workspace that does not use what the run changes, and says which workspaces and commands. The expected differences are named in advance: W-4 (a deployed application with descendants or with a destination inside another application) and W-5 (more files in the folders of `stories generate`, nothing else). W-6 and W-7 change no output. The base of W-8 (the rename) is the tree at the end of P0: a jar built from it on the old names against the new jar on the renamed workspaces.
- **T2 (#136).** Each of the four differences is fixed when the page can do what the command line does, and otherwise stays pinned with its sentence in the shared cases and in the manual; no difference is hidden. The line and the column of a mistake come from the YAML parser of the page if it has them; if it has not, that item stays a documented difference and the run says why. The command line is not changed (it is the reference). W-1 also takes the explicitly tagged scalars that #78 lists, with the command line as the reference (measured on the jar of 0.17: `!!int 0x1F` reads as `31`, like the plain `0x1F`; `!!int 1:30` stays the text `1:30`, it is not read as 90; `!!binary aGVsbG8=` stays the text `aGVsbG8=`, it is not decoded): the editor reads them the same way instead of refusing them, with the cases added to `yaml-number-cases.json`, expectations written from the command line.
- **T3 (#137).** The three rough edges are fixed in the page alone (`standalone.html`): the cap of the open key is computed again on a resize (view state, no `modelsChanged()`), the catch of `confirmLayerWrite` keeps the typed form as `writeElementDraft` does, and a node test draws a saved view whose facet uses a removed Jayway form and checks the error of the view.
- **T4 (#138).** W-3 builds three checks and no offer: (a) *Add replaces* of the inspection is checked with `replacesLayerProblem`, as *Write replaces* is; (b) a merge, which is written one pair at a time, is checked for all its pairs before the first is written, and refuses as a whole; (c) the delete of a plateau also looks at the `against` of the story steps and at the saved views drawn in a plateau above (it already looks at the `at`), and refuses with the same kind of sentence. Nothing else is written differently. The author decided on 2026-10-22 not to build the offer (it is a feature): #138 is closed as not planned once W-3 is done, and W-9 tells in the manual how to fold a plateau into the one above by hand (change the `plateau:` of its manifests to the plateau above, move its patches in front of that plateau's patches); the idea of an operation that does it is added to #65 as a comment.
- **T5 (#139).** A relationship whose destination is inside a deployed application is a dependency towards the node that hosts that application (the mirror of the decision D7 of wave 018, which made the source side count). The secondary links inside one environment, drawn for a flow, read the relationships of everything inside the deployed element, as the primary links do. The kernel contract stays 5 (no key or shape changes). Confirmed by the author on 2026-10-22, including the first half (it adds links to maps that did not have them).
- **T6 (#140).** `stories generate` writes the table of changes (`gap.md`, `gap.json`) beside the folder of each comparison step, as `views generate` writes it beside a comparison, and draws the facets of the workspace in the folders `views generate` uses for them (global views and one folder per facet), with no new key in a story. The files of the global views are as they were.
- **T7 (#78).** W-6 closes the three cases that #78 lists as *read, but written again in the editor's own layout*: an anchor, an alias or a tag inside square or curly brackets, a tag on a text that goes over several lines when the tag changes what it reads as, and an anchor on a list item whose map starts on the next line. The line-preserving save keeps them as written; where it still cannot do it safely, the fallback stays and the case is listed in the run with the reason. Reading is not changed in either tool by this run, and the forms the editor refuses stay refused (the tagged scalars are W-1's, T2; an anchor or a tag on a key stays refused, see the Non-Goals). The cases are shared or pinned by a node test that compares the file before and after a save (every other line byte for byte).
- **T8 (#125).** W-7 lowers the time of `quiet` and `apply_patches` (and `compare` and the application Map `compute` if the same work serves them) on `replaces-large-pair`, from the directions in #125 (`quiet` builds a view per element: share what `build` reads, or make one pass over the links; `apply_patches` evaluates every selector over the whole tree). Success is measured by `performance-budget.test.js`: the run at least halves the median of the first `quiet` and of `apply_patches` for the 591-element pair, or says what the floor is and why; the budget of the test is tightened to the new measure. The output does not change: every shared case, every example and every fixture give byte-identical files, and the kernel contract stays 5.
- **T9 (#133).** The decisions of the author on the issue are the plan: the file is `.archicode.yaml`; it is a rename with no alias; only the default of `-w` changes, so `-w workspace.yaml` still works because the path is explicit; when the default file is missing and `workspace.yaml` exists, the command line and the editor each print one sentence, the same one, that says to rename the file or to pass `-w`. The editor and `archicode editor serve` look for the new name. A hidden name needs the discovery rule to find it without reading it as a manifest (`ManifestDiscovery`, `readManifestFolder`, `discovery-cases.json` gets the cases). Every shipped example and fixture is renamed with `git mv`, the generator `generate.mjs` writes the new name, and the integration tests and the native job run on copies of them. The comment of the author dated 2026-10-21 that put the rename "later" is superseded by the request of 2026-10-22. The Breaking block of the manual is W-9's.

## Wave Manifest

```yaml
wave_manifest:
  wave: 019
  slug: followups-of-wave-018
  status: proposed
  sources: []
  phases:
    - id: P0
      name: The fixes and the follow-ups
      gate:
        criteria:
          - 'the four differences of #136 are each fixed in the page or pinned by a test that checks the sentence, in `yaml-number-cases.json` and in the manual; `!!int 0x1F`, `!!int 1:30` and `!!binary aGVsbG8=` are read by the editor as the command line reads them (`31`, `1:30`, `aGVsbG8=`); `YamlOneDotOneNumbersTest` and `yaml-numbers.test.js` pass'
          - 'the three rough edges of #137 each have a node test that fails on the page of 0.17.0 and passes on this one'
          - '*Add replaces* refuses a reference the layer cannot hold with the sentence of *Write replaces*; a merge with one pair the layer cannot hold writes none of its pairs; the delete of a plateau refuses for a story step whose `against` and for a saved view drawn in a plateau above would lose their element; each has a node test that fails on the page of 0.17.0'
          - 'on the layered Brightcart a relationship from an element inside a deployed application to an element inside another gives a link between the nodes that host them in the overview, the detailed and the deep viewpoints and the Map of the technology layer, in the command line and in the editor; `expected-boxes.json` is rewritten and every other changed file is listed in the run with the relationship that explains it; the kernel contract number is unchanged'
          - '`archicode stories generate --story fork_tour --plateau saas` writes `gap.md` and `gap.json` beside each comparison step and the folders of the facets of the workspace; the files of the global views are byte-identical to the jar of `archicode-0.17.0`; the integration test runs the packaged jar'
          - 'a file with an anchor, an alias or a tag inside brackets, a tag on a multi-line text and an anchor on a list item whose map starts on the next line is saved by the editor with every line it did not edit byte for byte as it was, or the case that still falls back is listed in the run with its reason; the forms the editor refuses are still refused with their sentences'
          - 'on `replaces-large-pair` the median of the first `quiet` and of `apply_patches` is at least halved, or the run says what the floor is; `performance-budget.test.js` has the tighter budget; every shared case, example and fixture gives byte-identical files'
          - 'every workspace that uses none of what W-4 and W-5 change gives byte-identical `views generate`, `query graph` and `diff` with the jar of `archicode-0.17.0`'
          - '`./mvnw -o verify -DskipITs=false`, `cargo test --manifest-path src/main/rust/viewpoint-kernel/Cargo.toml`, `src/main/rust/viewpoint-kernel/embed.sh --check`, `node --test "src/test/javascript/**/*.test.js"` and `npx prettier --check "src/**/*.java"` pass'
    - id: P1
      name: The name of the workspace file
      gate:
        criteria:
          - '`git ls-files | grep -c "workspace.yaml"` finds no shipped example or fixture under the old name (the cases that pin the old name are named); every example and fixture is loaded by the command line and by the editor in a test under `.archicode.yaml`'
          - 'a folder with `workspace.yaml` and no `.archicode.yaml` gives the one sentence in the command line and the same sentence in the editor (a shared case); `-w workspace.yaml` still works; `editor serve` serves the new name'
          - 'the discovery finds `.archicode.yaml` as the workspace and never reads it as a manifest, below a `/**` path too (cases in `discovery-cases.json`, read by `ManifestDiscoveryTest` and `discovery.test.js`)'
          - 'the views, `query graph` and `diff` of every renamed workspace are byte-identical to what the jar built at the end of P0 writes on the old name, except the lines that quote the file name (listed in the run)'
          - '`./mvnw -o verify -DskipITs=false`, `cargo test --manifest-path src/main/rust/viewpoint-kernel/Cargo.toml`, `src/main/rust/viewpoint-kernel/embed.sh --check`, `node --test "src/test/javascript/**/*.test.js"` and `npx prettier --check "src/**/*.java"` pass'
    - id: P2
      name: The manual
      gate:
        criteria:
          - 'the manual builds, every example it ships is loaded by both tools, the changes are told where they belong, with a block of what changes for a reader who knows 0.17.0 that lists the rename with the sentence the tools print and what to do; the limits and `CLAUDE.md` no longer list #136, #137, #139, #140, #78, #125, #133 and #138 as open, and say the manual folds a plateau by hand and that an anchor or a tag on a key stays refused by the editor; the views of every example that has views are byte-identical to the jar of `archicode-0.17.0` except the files W-4 lists'
          - '`./mvnw -o verify -DskipITs=false`, `cargo test --manifest-path src/main/rust/viewpoint-kernel/Cargo.toml`, `src/main/rust/viewpoint-kernel/embed.sh --check`, `node --test "src/test/javascript/**/*.test.js"` and `npx prettier --check "src/**/*.java"` pass'
  runs:
    - id: W-1
      slug: yaml-numbers-left-over
      phase: P0
      depends_on: []
      run: 0137
      delegation: standard
      likely_paths:
        - 'src/main/resources/editor-webapp/standalone.html'
        - 'src/test/javascript/**'
        - 'src/test/java/io/morin/archicode/manifest/**'
        - 'CLAUDE.md'
      focus: 'the editor and the command line read a YAML number the same way in the four cases #136 left and in the tagged scalars #78 lists, or the difference is pinned with its sentence'
    - id: W-2
      slug: editor-rough-edges
      phase: P0
      depends_on: []
      run: null
      delegation: standard
      likely_paths:
        - 'src/main/resources/editor-webapp/standalone.html'
        - 'src/test/javascript/**'
        - 'CLAUDE.md'
      focus: 'the open key keeps its cap on a resize and the typed form survives the second dialog (#137)'
    - id: W-3
      slug: replaces-and-delete-checks
      phase: P0
      depends_on: []
      run: null
      delegation: hard_judgment
      delegation_reason: 'changes the guard of the delete of a plateau (data deletion): a check that is too weak lets a plateau go with what stands on it'
      likely_paths:
        - 'src/main/resources/editor-webapp/standalone.html'
        - 'src/test/javascript/**'
        - 'CLAUDE.md'
      focus: 'Add replaces, a merge written in pairs and the delete of a plateau check what they cannot hold before they write (#138)'
    - id: W-4
      slug: dependencies-into-the-inside
      phase: P0
      depends_on: []
      run: null
      delegation: standard
      likely_paths:
        - 'src/main/rust/viewpoint-kernel/**'
        - 'src/main/wasm/viewpoint_kernel.wasm'
        - 'src/test/resources/technology-map/**'
        - 'src/test/resources/brightcart/**'
        - 'src/test/java/io/morin/archicode/cli/**'
        - 'src/test/javascript/**'
        - 'CLAUDE.md'
      focus: 'a relationship towards the inside of a deployed application, and the secondary links of a flow, are dependencies of the node (#139)'
    - id: W-5
      slug: stories-tables-and-facets
      phase: P0
      depends_on: []
      run: null
      delegation: standard
      likely_paths:
        - 'src/main/java/io/morin/archicode/cli/**'
        - 'src/main/resources/META-INF/native-image/**'
        - 'src/test/java/io/morin/archicode/cli/**'
        - 'src/test/java/io/morin/archicode/it/**'
        - 'CLAUDE.md'
      focus: 'stories generate writes the table of changes of a comparison step and draws the facets, as views generate does (#140)'
    - id: W-6
      slug: save-keeps-anchors-in-brackets
      phase: P0
      depends_on: []
      run: null
      delegation: hard_judgment
      delegation_reason: 'changes the line-preserving save that writes the author manifests: a wrong splice loses or corrupts the text of a file (data loss)'
      likely_paths:
        - 'src/main/resources/editor-webapp/standalone.html'
        - 'src/test/javascript/**'
        - 'CLAUDE.md'
      focus: 'saving a file keeps an anchor, an alias or a tag inside brackets, a tag on a multi-line text and an anchor on a list item as they were written (#78)'
    - id: W-7
      slug: kernel-cost-on-large-pairs
      phase: P0
      depends_on: []
      run: null
      delegation: standard
      likely_paths:
        - 'src/main/rust/viewpoint-kernel/**'
        - 'src/main/wasm/viewpoint_kernel.wasm'
        - 'src/test/javascript/viewpoint-kernel/performance-budget.test.js'
        - 'src/test/javascript/**'
        - 'CLAUDE.md'
      focus: 'the editor stays quick on a large pair of plateaus: quiet and apply_patches cost grows with the elements, not faster (#125)'
    - id: W-8
      slug: rename-workspace-file
      phase: P1
      depends_on: [W-1, W-2, W-3, W-4, W-5, W-6, W-7]
      run: null
      delegation: standard
      likely_paths:
        - 'src/main/java/**'
        - 'src/main/resources/editor-webapp/standalone.html'
        - 'src/test/**'
        - 'src/doc/examples/**'
        - 'docs/fixtures/**'
        - 'CLAUDE.md'
        - 'README.md'
      focus: 'the file that marks a workspace is .archicode.yaml, with no alias, and the old name gives one clear sentence (#133)'
    - id: W-9
      slug: manual-and-notes-019
      phase: P2
      depends_on: [W-1, W-2, W-3, W-4, W-5, W-6, W-7, W-8]
      run: null
      delegation: standard
      likely_paths:
        - 'src/doc/**'
        - 'src/site/**'
        - 'CLAUDE.md'
        - 'README.md'
      focus: 'the manual and CLAUDE.md say what the tools do at the end of this wave, with one block that lists the rename'
```

## Phase P0 — The fixes and the follow-ups

| # | Run | Slug | Depends on | Focus | Scope | Exit evidence |
|---|-----|------|------------|-------|-------|---------------|
| W-1 | — | `yaml-numbers-left-over` | — | the four differences left in how the two tools read a YAML number (#136) | T2: read `yaml-number-cases.json` and the paragraph of `CLAUDE.md` on the numbers; for each of the four (the line and the column of an error, `foo: .inf` under an unknown header key, a float that JavaScript prints another way, the style `line-gap: 0x1F` drawn with the default) fix it in the page if the page can do what the command line does, else pin it; the tagged scalars of #78 (`!!int` in hexadecimal, octal and base 60, `!!binary`) are read as the command line reads them (T2); the shared cases and the node tests are extended | each of the four is a shared case that both tools agree on, or a pinned difference with its sentence; the tagged scalars are shared cases with expectations from the command line; the cases of #103 still pass; closes #136 or files what remains |
| W-2 | — | `editor-rough-edges` | — | three rough edges of the editor (#137) | T3: `syncDiagramKey` on a resize; the catch of `confirmLayerWrite` keeps the form (`keepElementForm`, `keptElementForm`) as `writeElementDraft` does; a node test that draws a saved view whose facet uses `anyof` and checks that the view shows the sentence | three node tests, each fails on the page of `archicode-0.17.0`; the files written by every other path are byte for byte what they were; closes #137 |
| W-3 | — | `replaces-and-delete-checks` | — | the editor refuses what a layer cannot hold, before it writes (#138) | T4: *Add replaces* through `replacesLayerProblem`; a merge checked for all its pairs before the first is written; the delete of a plateau looks at the `against` of the story steps and at the saved views drawn in a plateau above, in `plateauDeletionAbove`/`stepsLosingTheirView`; nothing is offered instead of the refusal | node tests that fail on the page of `archicode-0.17.0`; a delete that was allowed and loses nothing is written byte for byte as before; builds the checks only; #138 is closed as not planned with a comment that says why |
| W-4 | — | `dependencies-into-the-inside` | — | a link between environments for a relationship towards the inside of a deployed application (#139) | T5: `derived_dependencies` and the secondary links in the kernel (`lib.rs`) read the destination inside a deployed application and the descendants for the flow; `embed.sh`; the three viewpoints and the Map of the technology layer change together; `expected-boxes.json` is rewritten | on the layered Brightcart the new links are listed in the run, each with the relationship that explains it; the workspaces that deploy no application with such relationships are byte-identical to `archicode-0.17.0`; contract 5 unchanged; closes #139 |
| W-5 | — | `stories-tables-and-facets` | — | `stories generate` writes what `views generate` writes for a comparison and for the facets (#140) | T6: `GenerateStoriesCommand` writes `gap.md` and `gap.json` beside a comparison step and draws the facets of the workspace in their folders; `GenerateStoriesTest` and `StoriesGenerateIT` are extended | the files of the global views are identical to `archicode-0.17.0`; the new files are listed in the run; the integration test runs the packaged jar; closes #140 |
| W-6 | — | `save-keeps-anchors-in-brackets` | — | the save of the editor keeps the forms #78 lists as written again (#78) | T7: read the line-preserving save (`patchYamlText` and its helpers) and the cases of #74; make it carry an anchor, an alias or a tag inside `[...]` and `{...}`, a tag on a multi-line text and an anchor on a list item whose map starts on the next line; keep the fallback where it cannot be done safely; the differences between the tools that #78 lists stay | a node test per form that saves an edited file and compares it with the original line by line; the fallback cases are listed with the reason; every existing save test is unchanged; closes #78 together with W-1 (tagged scalars) and the limits of W-9 |
| W-7 | — | `kernel-cost-on-large-pairs` | — | `quiet` and `apply_patches` stay quick on 591 elements (#125) | T8: profile the two entry points on `replaces-large-pair`; share what `build` reads in `quiet`, make one pass over the links, evaluate the selectors of `apply_patches` without walking the whole tree each time; `embed.sh`; tighten `performance-budget.test.js` | the medians before and after are in the run; `quiet` and `apply_patches` at least halved or the floor is explained; every shared case, example and fixture is byte-identical; contract 5 unchanged; closes #125 |

**Gate:**

- the four differences of #136 are each fixed in the page or pinned by a test that checks the sentence, in `yaml-number-cases.json` and in the manual; `!!int 0x1F`, `!!int 1:30` and `!!binary aGVsbG8=` are read by the editor as the command line reads them (`31`, `1:30`, `aGVsbG8=`); `YamlOneDotOneNumbersTest` and `yaml-numbers.test.js` pass
- the three rough edges of #137 each have a node test that fails on the page of 0.17.0 and passes on this one
- *Add replaces* refuses a reference the layer cannot hold with the sentence of *Write replaces*; a merge with one pair the layer cannot hold writes none of its pairs; the delete of a plateau refuses for a story step whose `against` and for a saved view drawn in a plateau above would lose their element; each has a node test that fails on the page of 0.17.0
- on the layered Brightcart a relationship from an element inside a deployed application to an element inside another gives a link between the nodes that host them in the overview, the detailed and the deep viewpoints and the Map of the technology layer, in the command line and in the editor; `expected-boxes.json` is rewritten and every other changed file is listed in the run with the relationship that explains it; the kernel contract number is unchanged
- `archicode stories generate --story fork_tour --plateau saas` writes `gap.md` and `gap.json` beside each comparison step and the folders of the facets of the workspace; the files of the global views are byte-identical to the jar of `archicode-0.17.0`; the integration test runs the packaged jar
- a file with an anchor, an alias or a tag inside brackets, a tag on a multi-line text and an anchor on a list item whose map starts on the next line is saved by the editor with every line it did not edit byte for byte as it was, or the case that still falls back is listed in the run with its reason; the forms the editor refuses are still refused with their sentences
- on `replaces-large-pair` the median of the first `quiet` and of `apply_patches` is at least halved, or the run says what the floor is; `performance-budget.test.js` has the tighter budget; every shared case, example and fixture gives byte-identical files
- every workspace that uses none of what W-4 and W-5 change gives byte-identical `views generate`, `query graph` and `diff` with the jar of `archicode-0.17.0`
- `./mvnw -o verify -DskipITs=false`, `cargo test --manifest-path src/main/rust/viewpoint-kernel/Cargo.toml`, `src/main/rust/viewpoint-kernel/embed.sh --check`, `node --test "src/test/javascript/**/*.test.js"` and `npx prettier --check "src/**/*.java"` pass

## Phase P1 — The name of the workspace file

| # | Run | Slug | Depends on | Focus | Scope | Exit evidence |
|---|-----|------|------------|-------|-------|---------------|
| W-8 | — | `rename-workspace-file` | W-1 to W-7 | `.archicode.yaml` replaces `workspace.yaml`, no alias (#133) | T9: the default of `-w` in `cli/ArchiCode`; `ServeEditorCommand` and `EditorHttpServer`; the editor's search for the file in a folder; the one sentence when `workspace.yaml` is there and the new name is not (a shared case in both tools); the discovery cases for a hidden workspace file; `git mv` of every shipped example and fixture, the generator, the helpers of the tests (`Brightcart`, `LayeredFixtures`, `Shipped`), the native job's copies; the sentences of the manual are W-9's | the exit evidence of the gate below; closes #133 |

It runs after P0 on purpose: it touches almost every test and shipped workspace, so no other run can be alongside, and the byte-identity of P0 is checked against the old name.

**Gate:**

- `git ls-files | grep -c "workspace.yaml"` finds no shipped example or fixture under the old name (the cases that pin the old name are named); every example and fixture is loaded by the command line and by the editor in a test under `.archicode.yaml`
- a folder with `workspace.yaml` and no `.archicode.yaml` gives the one sentence in the command line and the same sentence in the editor (a shared case); `-w workspace.yaml` still works; `editor serve` serves the new name
- the discovery finds `.archicode.yaml` as the workspace and never reads it as a manifest, below a `/**` path too (cases in `discovery-cases.json`, read by `ManifestDiscoveryTest` and `discovery.test.js`)
- the views, `query graph` and `diff` of every renamed workspace are byte-identical to what the jar built at the end of P0 writes on the old name, except the lines that quote the file name (listed in the run)
- `./mvnw -o verify -DskipITs=false`, `cargo test --manifest-path src/main/rust/viewpoint-kernel/Cargo.toml`, `src/main/rust/viewpoint-kernel/embed.sh --check`, `node --test "src/test/javascript/**/*.test.js"` and `npx prettier --check "src/**/*.java"` pass

## Phase P2 — The manual

| # | Run | Slug | Depends on | Focus | Scope | Exit evidence |
|---|-----|------|------------|-------|-------|---------------|
| W-9 | — | `manual-and-notes-019` | W-1 to W-8 | the manual and `CLAUDE.md` say what the tools do at the end of the wave | the follow-ups and the fixes where they belong (the numbers, the rough edges, *Add replaces*, the merge, the delete, the new links of the technology map, the tables and facets of `stories generate`, the save, the cost); the name of the workspace file everywhere (tutorial, examples, commands, the editor); how to fold a plateau into the one above by hand (the refusal of the delete tells when); `[[plateau-limits]]` and `CLAUDE.md` lose #136, #137, #139, #140, #78, #125, #133 and #138, and say as not planned the offer of #138 and the two differences that stay of #78 (an anchor or a tag on a key is read by the command line and refused by the editor; the merge key `<<` is refused by both); a block of what changes for a reader who knows 0.17.0, with the rename first | the manual builds and every example is loaded by both tools; every quoted `error:` line and table was run on the jar of this tree; the views of every example are byte-identical to `archicode-0.17.0` except the files W-4 lists |

**Gate:**

- the manual builds, every example it ships is loaded by both tools, the changes are told where they belong, with a block of what changes for a reader who knows 0.17.0 that lists the rename with the sentence the tools print and what to do; the limits and `CLAUDE.md` no longer list #136, #137, #139, #140, #78, #125, #133 and #138 as open, and say the manual folds a plateau by hand and that an anchor or a tag on a key stays refused by the editor; the views of every example that has views are byte-identical to the jar of `archicode-0.17.0` except the files W-4 lists
- `./mvnw -o verify -DskipITs=false`, `cargo test --manifest-path src/main/rust/viewpoint-kernel/Cargo.toml`, `src/main/rust/viewpoint-kernel/embed.sh --check`, `node --test "src/test/javascript/**/*.test.js"` and `npx prettier --check "src/**/*.java"` pass

## Dependency View

```
P0:  W-1   W-2   W-3*   W-4   W-5   W-6*   W-7    (no edge: the overlaps are serialized, not ordered)
P1:  W-8 <── (W-1 to W-7)
P2:  W-9 <── (W-1 to W-8)
* hard_judgment
```

## Risks

- **Overlaps, all `serialize`.** No `concurrent-safe` verdict is claimed; the runs are dispatched one at a time, in the order W-1 to W-9. The pairs that share a path: W-1, W-2, W-3 and W-6 (`standalone.html` and the node tests of the page), W-4 and W-7 (the kernel, the wasm that `embed.sh` rebuilds and the node tests), W-1, W-4 and W-7 (the node tests), W-4 and W-5 (`src/test/resources`, the tests of `cli`), W-8 and every other run (it touches almost every test, example and fixture), every run (`CLAUDE.md`), W-9 and every run (the manual).
- **Edges.** W-8 needs the seven runs of P0 so that nothing else is in flight while the shipped workspaces are renamed, and so that their byte identity is checked against the old name; W-9 needs every other run. The runs of P0 need no edge among themselves: they are ordered by the serialization above, which costs nothing when concurrency is 1.
- **W-3 changes a guard.** The delete of a plateau queues the removal of files, and a check that is too weak lets a plateau go with what stands on it. It works on copies of the layered Brightcart and writes through `guardedLayerWrite`, which restores everything on a refusal; a delete that was allowed must stay byte for byte what it was.
- **W-6 touches the save.** A wrong splice loses or corrupts the text of a file that the author wrote, with its comments. The run compares every file it saves with the original, line by line, and the fallback stays where the splice is not safe; the forms the editor refuses stay refused.
- **W-4 changes drawings.** Technology maps and the three viewpoints gain links for a deployed application with relationships towards the inside of another (accepted in T5, confirmed by the author on 2026-10-22). Each changed file must be explained by a relationship; a change nothing explains is a defect.
- **W-7 may find a floor.** If the cost of one call is dominated by work that cannot be shared, the run says so with the profile and tightens the budget to the measure it reached; a faster result that changes one byte of an output is a defect, not a result.
- **W-8 is a breaking change and the widest edit.** It renames about twenty shipped workspaces and changes the helpers of nearly every test; the Native job runs on copies of them. It is checked by loading every example and fixture in both tools, and by the byte identity of their outputs with the jar of the end of P0. Two things outside the repository need the author after the wave: the git-ignored `.custom/workspace.yaml` (read by `CustomRenderingTest` on the author's machine only, it fails locally until the file is renamed or the test passes `-w`) and the real workspace in the synchronized folder (rename the file, or pass `-w`).
- **W-1 may find that a difference cannot be closed in the page** (the YAML parser of the page may not tell the line). It pins the case and says why; the wave does not change the command line to match.
- **Hand-written files.** Nothing of the author's real workspace is in the repository; every file a run ships is loaded by the command line and by the editor in a test, and a failure that stays is pinned by a test that checks the message.
- **The size.** Nine runs, seven `standard` and two `hard_judgment`, one at a time; the largest phase dispatches one run at a time. A long wave may be interrupted; `complete-wave` resumes from the files.

## Completion Criteria

The three phase gates verified; `./mvnw -o verify -DskipITs=false`, `cargo test`, `embed.sh --check`, `node --test` and `npx prettier --check "src/**/*.java"` pass on the final tree; every shipped example and fixture is loaded by the command line and the editor in a test, under the new name; the issues #136, #137, #139, #140, #78, #125 and #133 are closed by their commits, #138 is closed as not planned after W-3 (the checks are built, the offer is not), the idea of a fold operation is a comment on #65, and the two differences of #78 that stay are told in the limits as not planned; #134, #135, #65, #24 and #142 stay open; every item a run lists as "not verified" (a real browser, the Native job) is in the final report.
