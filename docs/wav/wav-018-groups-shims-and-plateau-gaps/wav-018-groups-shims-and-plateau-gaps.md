---
type: wave
wave: 018
status: proposed
date: 2026-10-21
related:
  - docs/wav/wav-018-groups-shims-and-plateau-gaps/wbc-018-groups-shims-and-plateau-gaps.md
  - docs/wav/wav-017-editor-defects-and-composed-replaces/wav-017-editor-defects-and-composed-replaces.md
  - docs/wav/wav-017-editor-defects-and-composed-replaces/prg-017-editor-defects-and-composed-replaces.md
  - docs/fixtures/brightcart-spec.md
  - CLAUDE.md
---

# Wave 018 — Groups, Shims and Plateau Gaps

## Purpose

When this wave is done, the notion of group and the compatibility shims are gone from both tools: a manifest or an element of kind `group`, the camel-case keys of `settings.facets` and the Jayway dialect of the facets are each one `error:` line that says what to write instead, the old routes of the editor are dropped, and the manual lists the breaks in one block.
The key under a diagram is a folded row, a refused write keeps what was typed, *Write replaces* refuses an entry that its layer cannot hold, and a plateau in the middle of the tree is deleted in one step that lists what the plateaus above it lose.
The command line draws the steps of the stories at their plateaus, the dependencies derived from a deployed application include those of what is inside it, and `id: 010` is read the same by the command line and by the editor. The manual and `CLAUDE.md` say all of it.

## Non-Goals

- Does not build `plateau merge` (#65): the author keeps it for another wave.
- Does not build the matrix of N plateaus nor a comparison saved in a view (#24), does not follow an anchor inside brackets (#78) and does not work on the cost of the kernel at 600 elements (#125): they stay open.
- Does not close or reword an issue that no run closes. Does not cut a release (the release is the author's call after the wave).
- Does not touch the real workspace of the author, and no file of it enters the repository.
- Does not keep a way to read a group or a removed form "for a while": the author asked for no legacy. The one `error:` line is the whole help.
- Does not look at the editor on a real phone, with a screen reader or in a browser other than the built-in one: a run says what it measured, not what it saw.

## Decisions

Given by the author on 2026-10-21 (the answers of the decision page, quoted in the comments of the issues):

- **D1 (#114).** The notion of group is removed; the issue closes with it.
- **D2 (#128).** The shims are removed in 0.17 with no legacy; each removed form of a file gets one `error:` line that names what to write; an unknown route of the editor opens the default page; the release carries a Breaking block. The error of `settings.plateaus` stays.
- **D3 (#132, #129).** The proposal of #132 as written (a folded row, a *Key* button, a capped height, view state only), in the same lot as #129.
- **D4 (#130).** *Write replaces* refuses the write and says why.
- **D5 (#112).** One step: the plateaus that override the deleted one go under its parent, what the deleted plateau brought is lost to them, and the dialog lists the elements lost for each plateau.
- **D6 (#109).** A command of its own draws the steps of the stories; `views generate` does not.
- **D7 (#124).** The relationships of the descendants of a deployed application are dependencies of the node that hosts it; the output of the viewpoints and the Map changes with it.
- **D8 (#103).** The parser marks the plain scalars that YAML 1.1 reads as numbers.

## Decisions taken by this plan

Not the author's yet: the plan chooses so that an unattended wave can run; the report of the wave lists them.

- **T1.** The byte-identity base is the tag `archicode-0.16.0` (a jar built from `git archive` outside the repository). A run that changes `src/main` compares `views generate`, `query graph` and `diff` on every workspace that does not use what the run changes, and says which workspaces and commands. The expected differences are named in advance: W-1 and W-2 (a workspace that uses a removed form), W-6 (a deployed application with descendants that declare relationships).
- **T2 (#114).** The group is removed from the model (`ContainerGroup`, `SolutionGroup`, `SystemGroup`, the `group` entries of `Nesting` and `ManifestKind`, the kind `group` of `READ_SCHEMA`, the cases of `layer-checks-cases.json` and `negative-cases.json`, the *Move* and creation exceptions of the editor). An element of `kind: group` is one `error:` line that names the file, says the kind is gone and what to write (the children go in the `elements` of the parent). W-1 reads the code first to settle what a reference through a group was and whether the kernel draws a box for it (`Item.Kind.GROUP`); a drawing kind that nothing produces any more goes too.
- **T3 (#128).** The camel-case keys are refused by the same sentence as an unknown key of `settings.facets`, completed with the kebab-case name (``unknown property `hideUnlinked`, write `hide-unlinked` ``); the Jayway dialect (`anyof`, `noneof`, `== null`) is refused by the kernel with one sentence that names the RFC 9535 form to write. The kernel contract number moves only if the W-2 document finds a reason to say so. The old routes are dropped from `pageIdFromHash`: an unknown route opens Applications.
- **T4 (#103).** The editor adopts what the command line reads, and the command line is not changed: the model value of a plain scalar that YAML 1.1 reads as a number is the one YAML 1.1 gives (`id: 010` is the reference `8`), the text as written is kept for the save, and the checks accept the forms the command line accepts (`line-gap: 0x1F`). W-7 may find a reason to choose otherwise and then records it in its document and in the cases; the cases `editor-reads-like-cli.test.js` (`KNOWN DIFFERENCE`), N77 and `YamlOneDotOneNumbersTest` become shared cases.
- **T5 (#109).** The command is `archicode stories generate [--story <id>]`, with its own group, writing to `<views.path>-stories/<story>/<NN>-<view>/` (the same files a view of that kind writes in `views-<plateau>`); a step told at a plateau is drawn from that plateau, and compared with `against` when it has one, through the same loader and `compare` that `views generate` uses; the `map` viewpoint is drawn (the command line has drawn it since 0.14.0 when it is asked by id); a name that the plateau of a step lacks is a warning, ``skip <story>/<step>: it names `x`, which the plateau `p` does not have ``, as for a view. W-8 settles the details in its document inside this shape.
- **T6 (#124).** The run lists every file of the examples and the fixtures whose output changes, with the relationship that explains each; `src/test/resources/technology-map/expected-boxes.json` is rewritten from the new output, and a difference that no descendant relationship explains is a defect of the run.
- **T7 (#112).** A plateau that has a `Kind: Plateau` manifest and one that only headers name are both deleted; the plateaus above are given the parent of the deleted one by editing their `override` (or by writing the `Kind: Plateau` manifest the key needs, W-5 decides) under `guardedLayerWrite`, with the files of the deleted plateau queued in `pendingFileRemovals`. The root cannot be deleted (as today).

## Wave Manifest

```yaml
wave_manifest:
  wave: 018
  slug: groups-shims-and-plateau-gaps
  status: proposed
  sources: []
  phases:
    - id: P0
      name: The breaking removals
      gate:
        criteria:
          - 'a manifest or an element of `kind: group` is one `error:` line that names the file and says what to write, in the command line and in the editor, with the same sentence (a shared case in `negative-cases.json`); no class, kind, case or sentence of the editor still names a group as a kind'
          - 'the camel-case keys of `settings.facets` and the Jayway dialect of a facet are each one `error:` line that names what to write, in the command line and in the editor (shared cases); the routes `#/map`, `#/elements`, `#/library`, `#/stories`, `#/diagram` and `#/timeline` open the default page or their current page by the rule W-2 documents; the error of `settings.plateaus` is as it was'
          - 'every example of `src/doc/examples` and every fixture loads in both tools (the existing tests), and `views generate`, `query graph` and `diff` of every workspace that used no removed form are byte-identical to a jar built from `git archive archicode-0.16.0` outside the repository'
          - '`./mvnw -o verify -DskipITs=false`, `cargo test --manifest-path src/main/rust/viewpoint-kernel/Cargo.toml`, `src/main/rust/viewpoint-kernel/embed.sh --check`, `node --test "src/test/javascript/**/*.test.js"` and `npx prettier --check "src/**/*.java"` pass'
    - id: P1
      name: The editor lot
      gate:
        criteria:
          - 'with a comparison on, the status zone under the diagram of the layered Brightcart (`marketplace` against its past) is at most two rows high at 1440 px and at 360 px, the *Key* button opens the full text with a capped height and an inner scroll, and the open key holds what the key held before (tests, and the numbers in the run measured in the built-in browser)'
          - 'a refused write (`Not written: ...`) and an error in `writeElementDraft` leave the typed id, name and description in the form (a test for each, which fails on HEAD of wave 017)'
          - '*Write replaces* on a pair whose `from` the layer of the manifest does not have refuses the write with the reason and changes no file (the case R07 of `compose-replaces-cases.json` with the name of `n` set to `A`); a pair it can write is written as before'
          - 'a plateau that other plateaus override is deleted in one step: the plateaus above go under its parent, its files are removed, the dialog lists the elements each plateau loses, a view or a step that would name a gone element refuses it, and a refused delete changes nothing (tests on the layered Brightcart)'
          - '`./mvnw -o verify -DskipITs=false`, `cargo test --manifest-path src/main/rust/viewpoint-kernel/Cargo.toml`, `src/main/rust/viewpoint-kernel/embed.sh --check`, `node --test "src/test/javascript/**/*.test.js"` and `npx prettier --check "src/**/*.java"` pass'
    - id: P2
      name: The model and the command line
      gate:
        criteria:
          - 'the relationships of the descendants of a deployed application are dependencies of the node that hosts it, in the overview, the detailed, the deep viewpoint and the Map of the technology layer, in the command line and in the editor; on the layered Brightcart `prod.dc.app-vm` is linked to the node that hosts `psp`; `expected-boxes.json` is rewritten and every other file whose output changes is listed in the run with the relationship that explains it'
          - '`id: 010`, `id: 0x1F`, `line-gap: 0x1F`, `5.0`, `1e3` and `header.parent: 0` are read the same by the command line and by the editor, or the difference that stays is pinned by a test that checks the sentence (shared cases); `#103` is closed or its remainder is filed'
          - '`archicode stories generate` draws the steps of `fork_tour` and `migration` at their plateaus and compared with their `against`, writes the folders T5 says, tells a name a plateau lacks as a warning and exits 0, tells a story that does not exist as one `error:` line, exit 1; it is in `ViewsAndQueriesIT` or a class of its own in `src/test/java/io/morin/archicode/it`, and its classes are in `reflect-config.json`'
          - 'every workspace that uses neither feature gives byte-identical `views generate`, `query graph` and `diff` with the jar of `archicode-0.16.0` (except the files W-6 lists)'
          - '`./mvnw -o verify -DskipITs=false`, `cargo test --manifest-path src/main/rust/viewpoint-kernel/Cargo.toml`, `src/main/rust/viewpoint-kernel/embed.sh --check`, `node --test "src/test/javascript/**/*.test.js"` and `npx prettier --check "src/**/*.java"` pass'
    - id: P3
      name: The manual
      gate:
        criteria:
          - 'the manual builds, every example is loaded by both tools, the block "What changes for a reader who knows 0.16.0" lists every break of P0 with the sentence the tool prints, `[[plateau-limits]]` and `CLAUDE.md` no longer list #114, #128, #129, #130, #132, #112, #109, #124 and #103 (if closed) as open, and the views of every example that has views are byte-identical to the jar of `archicode-0.16.0` except the files W-6 lists'
          - '`./mvnw -o verify -DskipITs=false`, `cargo test --manifest-path src/main/rust/viewpoint-kernel/Cargo.toml`, `src/main/rust/viewpoint-kernel/embed.sh --check`, `node --test "src/test/javascript/**/*.test.js"` and `npx prettier --check "src/**/*.java"` pass'
  runs:
    - id: W-1
      slug: remove-the-group-kind
      phase: P0
      depends_on: []
      run: 0128
      delegation: standard
      likely_paths:
        - 'src/main/java/io/morin/archicode/resource/element/**'
        - 'src/main/java/io/morin/archicode/manifest/**'
        - 'src/main/java/io/morin/archicode/viewpoint/**'
        - 'src/main/java/io/morin/archicode/workspace/**'
        - 'src/main/rust/viewpoint-kernel/**'
        - 'src/main/wasm/**'
        - 'src/main/resources/editor-webapp/standalone.html'
        - 'src/test/javascript/viewpoint-kernel/**'
        - 'src/test/resources/**'
        - 'src/test/java/**'
        - 'CLAUDE.md'
      focus: 'a group is no kind any more: `kind: group` is one clear `error:` line in both tools, and every rule, exception and limit that existed for it is gone (#114)'
    - id: W-2
      slug: remove-the-compatibility-shims
      phase: P0
      depends_on: []
      run: 0129
      delegation: standard
      likely_paths:
        - 'src/main/java/io/morin/archicode/resource/workspace/**'
        - 'src/main/java/io/morin/archicode/workspace/**'
        - 'src/main/java/io/morin/archicode/manifest/**'
        - 'src/main/rust/viewpoint-kernel/**'
        - 'src/main/wasm/**'
        - 'src/main/resources/editor-webapp/standalone.html'
        - 'src/test/javascript/viewpoint-kernel/**'
        - 'src/test/resources/**'
        - 'src/test/workspaces/**'
        - 'src/test/java/**'
        - 'CLAUDE.md'
      focus: 'the camel-case facet keys, the Jayway facet dialect and the old routes of the editor are gone, each removed form of a file says what to write in one line (#128)'
    - id: W-3
      slug: legend-folded-and-form-kept
      phase: P1
      depends_on: []
      run: 0130
      delegation: standard
      likely_paths:
        - 'src/main/resources/editor-webapp/standalone.html'
        - 'src/test/javascript/viewpoint-kernel/**'
        - 'CLAUDE.md'
      focus: 'the key under a diagram is a folded row with a *Key* button, and a refused write keeps what was typed in the form of an element (#132, #129)'
    - id: W-4
      slug: write-replaces-refuses-a-bad-entry
      phase: P1
      depends_on: []
      run: 0131
      delegation: standard
      likely_paths:
        - 'src/main/resources/editor-webapp/standalone.html'
        - 'src/test/javascript/viewpoint-kernel/**'
        - 'CLAUDE.md'
      focus: '*Write replaces* refuses an entry that the layer of the manifest cannot hold and says why (#130)'
    - id: W-5
      slug: delete-a-plateau-in-the-middle
      phase: P1
      depends_on: []
      run: 0132
      delegation: hard_judgment
      delegation_reason: 'data deletion: it removes the manifests of a plateau from the author folder and rewrites the override of the plateaus above it'
      likely_paths:
        - 'src/main/resources/editor-webapp/standalone.html'
        - 'src/test/javascript/viewpoint-kernel/**'
        - 'src/test/resources/brightcart/**'
        - 'CLAUDE.md'
      focus: 'delete a plateau that other plateaus override in one step, naming what each plateau above loses (#112)'
    - id: W-6
      slug: dependencies-of-the-descendants
      phase: P2
      depends_on: [W-2]
      run: 0133
      delegation: standard
      likely_paths:
        - 'src/main/rust/viewpoint-kernel/**'
        - 'src/main/wasm/**'
        - 'src/main/java/io/morin/archicode/viewpoint/**'
        - 'src/main/resources/editor-webapp/standalone.html'
        - 'src/test/javascript/viewpoint-kernel/**'
        - 'src/test/resources/**'
        - 'src/test/java/**'
        - 'CLAUDE.md'
      focus: 'the relationships of what is inside a deployed application are dependencies of the node that hosts it, in the three viewpoints and the Map (#124)'
    - id: W-7
      slug: yaml-numbers-read-alike
      phase: P2
      depends_on: []
      run: 0134
      delegation: standard
      likely_paths:
        - 'src/main/java/io/morin/archicode/manifest/**'
        - 'src/main/java/io/morin/archicode/workspace/**'
        - 'src/main/resources/editor-webapp/standalone.html'
        - 'src/test/javascript/viewpoint-kernel/**'
        - 'src/test/resources/brightcart/negative-cases.json'
        - 'src/test/java/**'
        - 'CLAUDE.md'
      focus: 'a plain scalar that YAML 1.1 reads as a number is read the same by the command line and the editor, and saved back as written (#103)'
    - id: W-8
      slug: stories-generate
      phase: P2
      depends_on: [W-6]
      run: 0135
      delegation: standard
      likely_paths:
        - 'src/main/java/io/morin/archicode/cli/**'
        - 'src/main/java/io/morin/archicode/workspace/**'
        - 'src/main/resources/META-INF/native-image/**'
        - 'src/test/java/**'
        - 'src/test/resources/**'
        - 'CLAUDE.md'
      focus: 'the command line draws the steps of a story at their plateaus, with a command of its own (#109)'
    - id: W-9
      slug: manual-and-upgrade-notes-018
      phase: P3
      depends_on: [W-1, W-2, W-3, W-4, W-5, W-6, W-7, W-8]
      run: null
      delegation: standard
      likely_paths:
        - 'src/doc/**'
        - 'src/site/**'
        - 'CLAUDE.md'
        - 'docs/fixtures/brightcart-spec.md'
        - 'README.md'
      focus: 'the manual, the tutorial and `CLAUDE.md` say what the tools do at the end of this wave, with one block that lists the breaks'
```

## Phase P0 — The breaking removals

| # | Run | Slug | Depends on | Focus | Scope | Exit evidence |
|---|-----|------|------------|-------|-------|---------------|
| W-1 | — | `remove-the-group-kind` | — | a group is no kind any more (#114) | T2: read the code first (what a reference through a group was, whether the kernel draws a box for it); remove `ContainerGroup`, `SolutionGroup`, `SystemGroup`, the `group` entries of `Nesting` and `ManifestKind`, the kind in `READ_SCHEMA`, the creation, *Move*, top-level and inherited-parent exceptions of the editor, the cases and the sentences; add the one `error:` line for `kind: group`; `EditorReadSchemaTest` still compares the page with the classes | `kind: group` in an `elements` list and in a header is the same sentence in both tools (a shared case); `git grep -n -i "kind: group\|ContainerGroup\|SolutionGroup\|SystemGroup"` finds only the cases that pin the error; no example or fixture used a group, so every workspace of the repository is byte-identical to `archicode-0.16.0`; closes #114 |
| W-2 | — | `remove-the-compatibility-shims` | — | the old forms are gone (#128) | T3: drop the `@JsonAlias` of `Settings.Facets` (`globalEnabled`, `directoryNameTemplate`, `hideUnlinked`, `jsonPath`) and the same aliases in the editor's `READ_SCHEMA`; the kernel (`facet.rs`, `lib.rs`) stops rewriting `anyof`, `noneof` and `== null` and refuses them with one sentence; the editor drops the old routes of `pageIdFromHash`; the workspaces of the repository (`src/test/workspaces`, `src/test/resources`, `src/doc/examples`) are rewritten to the current forms, and the cases of the old forms become the cases of the new errors; `embed.sh` and the wasm | each removed form is one `error:` line with the new spelling, in both tools (shared cases); `settings.plateaus` gives the sentence it gave; `embed.sh --check` ok; a workspace that used none of the forms is byte-identical to `archicode-0.16.0`; closes #128 |

**Gate:**

- a manifest or an element of `kind: group` is one `error:` line that names the file and says what to write, in the command line and in the editor, with the same sentence (a shared case in `negative-cases.json`); no class, kind, case or sentence of the editor still names a group as a kind
- the camel-case keys of `settings.facets` and the Jayway dialect of a facet are each one `error:` line that names what to write, in the command line and in the editor (shared cases); the routes `#/map`, `#/elements`, `#/library`, `#/stories`, `#/diagram` and `#/timeline` open the default page or their current page by the rule W-2 documents; the error of `settings.plateaus` is as it was
- every example of `src/doc/examples` and every fixture loads in both tools (the existing tests), and `views generate`, `query graph` and `diff` of every workspace that used no removed form are byte-identical to a jar built from `git archive archicode-0.16.0` outside the repository
- `./mvnw -o verify -DskipITs=false`, `cargo test --manifest-path src/main/rust/viewpoint-kernel/Cargo.toml`, `src/main/rust/viewpoint-kernel/embed.sh --check`, `node --test "src/test/javascript/**/*.test.js"` and `npx prettier --check "src/**/*.java"` pass

## Phase P1 — The editor lot

| # | Run | Slug | Depends on | Focus | Scope | Exit evidence |
|---|-----|------|------------|-------|-------|---------------|
| W-3 | — | `legend-folded-and-form-kept` | — | the key under the diagram is folded, a refused write keeps the typed form (#132, #129) | D3: one compact row (sample, glyph, word and count for each state) and a *Key* button (`aria-expanded`, `aria-controls`) that opens the full text with a capped height (about 30 % of the diagram area) and an inner scroll; view state only (no `modelsChanged()`, not in the diagram cache key, not in the address); the typed values survive a refused write and an error of `writeElementDraft` with `keptElementForm`; measure in the built-in browser at 1440 px, in the 558 x 514 pane and at 360 px | the status zone is at most two rows at 1440 px and 360 px with a comparison on; the open key holds what it held (`replaces-editor`, `styles`, `header` tests unchanged); a test types, triggers a refused write and finds the typed values (fails on HEAD); the numbers are in the run; closes #132 and #129 |
| W-4 | — | `write-replaces-refuses-a-bad-entry` | — | *Write replaces* refuses an entry its layer cannot hold (#130) | D4: before writing, check that `from` is an element of the plateau the manifest builds on; if not refuse with a sentence that names the element, the plateau and what to do (compare with the plateau below, or write the entry in the layer that still has it); no file changes; the button says why it is off when it can know | R07 with the name of `n` set to `A` refuses with the sentence and writes nothing, a pair its layer can hold is written as in wave 017; closes #130 |
| W-5 | — | `delete-a-plateau-in-the-middle` | — | delete a plateau that other plateaus override in one step (#112) | D5, T7: `plateauDeletion` accepts a plateau that is overridden; the dialog lists, for each plateau above, the elements and patches it loses and the new parent; `commitPlateauDelete` edits the `override` of those plateaus and queues the files of the deleted one, under `guardedLayerWrite`; the refusals of wave 015 (the root, a view or a step that would name a gone element) stay; a refused write restores everything | on the layered Brightcart a plateau in the middle is deleted and the tree reads as the dialog said, the lost elements are the ones listed, a refused delete changes nothing and a leaf is deleted as before; closes #112 |

**Gate:**

- with a comparison on, the status zone under the diagram of the layered Brightcart (`marketplace` against its past) is at most two rows high at 1440 px and at 360 px, the *Key* button opens the full text with a capped height and an inner scroll, and the open key holds what the key held before (tests, and the numbers in the run measured in the built-in browser)
- a refused write (`Not written: ...`) and an error in `writeElementDraft` leave the typed id, name and description in the form (a test for each, which fails on HEAD of wave 017)
- *Write replaces* on a pair whose `from` the layer of the manifest does not have refuses the write with the reason and changes no file (the case R07 of `compose-replaces-cases.json` with the name of `n` set to `A`); a pair it can write is written as before
- a plateau that other plateaus override is deleted in one step: the plateaus above go under its parent, its files are removed, the dialog lists the elements each plateau loses, a view or a step that would name a gone element refuses it, and a refused delete changes nothing (tests on the layered Brightcart)
- `./mvnw -o verify -DskipITs=false`, `cargo test --manifest-path src/main/rust/viewpoint-kernel/Cargo.toml`, `src/main/rust/viewpoint-kernel/embed.sh --check`, `node --test "src/test/javascript/**/*.test.js"` and `npx prettier --check "src/**/*.java"` pass

## Phase P2 — The model and the command line

| # | Run | Slug | Depends on | Focus | Scope | Exit evidence |
|---|-----|------|------------|-------|-------|---------------|
| W-6 | — | `dependencies-of-the-descendants` | W-2 | the relationships of what is inside a deployed application are dependencies of its node (#124) | D7, T6: `derived_dependencies` in the kernel reads the relationships of the descendants of the application a node lists (the contract number is said in the README of the kernel if it moves); the overview, the detailed and the deep viewpoints and the Map of the technology layer change together; the editor takes it from the kernel; `expected-boxes.json` is rewritten | on the layered Brightcart `prod.dc.app-vm` is linked to the node that hosts `psp` through `shop.app.payments`; the list of changed files and the relationship that explains each is in the run; the workspaces that deploy no application with descendants are byte-identical to `archicode-0.16.0`; closes #124 |
| W-7 | — | `yaml-numbers-read-alike` | — | a YAML 1.1 number is read the same by both tools (#103) | D8, T4: the parser of the editor marks a plain scalar that YAML 1.1 reads as a number (`0x1F`, `010`, `0b11`, `1_000`, `+5`, `.5`, `5.0`, `1e3`), gives the model the value the command line gives, keeps the text as written for the save, and accepts it where the command line accepts it; `.inf` and `.nan`, a number beyond 2^53 and `header.parent: 0` get the sentence of the command line; the pinned `KNOWN DIFFERENCE` cases become shared cases | `id: 010` is the reference `8` in both tools; `line-gap: 0x1F` loads in both; the save writes `010` back as `010`; the cases are run by `YamlOneDotOneNumbersTest` and `editor-reads-like-cli.test.js`; what stays different is pinned with its sentence; closes #103 or files what remains |
| W-8 | — | `stories-generate` | W-6 | the command line draws the steps of a story (#109) | D6, T5: a group `stories` with `generate [--story <id>]`; each step is drawn from its plateau (and compared with `against`) through the loader and `compare` of `views generate`; folders `<views.path>-stories/<story>/<NN>-<view>/`; a name the plateau lacks is a warning and a skip; an unknown story is one `error:` line; `reflect-config.json`; an integration test in `src/test/java/io/morin/archicode/it` | the steps of `fork_tour` and `migration` are drawn at their plateaus and against theirs (the files are in the run); the integration test runs the packaged jar; the manual's "The command line ignores the stories" is named for W-9; closes #109 |

**Gate:**

- the relationships of the descendants of a deployed application are dependencies of the node that hosts it, in the overview, the detailed, the deep viewpoint and the Map of the technology layer, in the command line and in the editor; on the layered Brightcart `prod.dc.app-vm` is linked to the node that hosts `psp`; `expected-boxes.json` is rewritten and every other file whose output changes is listed in the run with the relationship that explains it
- `id: 010`, `id: 0x1F`, `line-gap: 0x1F`, `5.0`, `1e3` and `header.parent: 0` are read the same by the command line and by the editor, or the difference that stays is pinned by a test that checks the sentence (shared cases); #103 is closed or its remainder is filed
- `archicode stories generate` draws the steps of `fork_tour` and `migration` at their plateaus and compared with their `against`, writes the folders T5 says, tells a name a plateau lacks as a warning and exits 0, tells a story that does not exist as one `error:` line, exit 1; it is in `ViewsAndQueriesIT` or a class of its own in `src/test/java/io/morin/archicode/it`, and its classes are in `reflect-config.json`
- every workspace that uses neither feature gives byte-identical `views generate`, `query graph` and `diff` with the jar of `archicode-0.16.0` (except the files W-6 lists)
- `./mvnw -o verify -DskipITs=false`, `cargo test --manifest-path src/main/rust/viewpoint-kernel/Cargo.toml`, `src/main/rust/viewpoint-kernel/embed.sh --check`, `node --test "src/test/javascript/**/*.test.js"` and `npx prettier --check "src/**/*.java"` pass

## Phase P3 — The manual

| # | Run | Slug | Depends on | Focus | Scope | Exit evidence |
|---|-----|------|------------|-------|-------|---------------|
| W-9 | — | `manual-and-upgrade-notes-018` | W-1 to W-8 | the manual, the tutorial and `CLAUDE.md` say what the tools do at the end of this wave | the block "What changes for a reader who knows 0.16.0" (Breaking: the group, the camel-case keys, the Jayway dialect, the old routes, each with the sentence the tool prints and what to write); the folded key, the refused write, *Write replaces* that refuses, the deletion of a plateau in the middle, `stories generate`, the new dependencies and the numbers; `[[plateau-limits]]` and `CLAUDE.md` lose #114, #128, #129, #130, #132, #112, #109, #124 and #103 (if closed) and keep #78, #125, #24, #65 | the manual builds and every example is loaded by both tools; every quoted `error:` line and table was run on the jar of this tree; the views of every example are byte-identical to `archicode-0.16.0` except the files W-6 lists; closes — |

**Gate:**

- the manual builds, every example is loaded by both tools, the block "What changes for a reader who knows 0.16.0" lists every break of P0 with the sentence the tool prints, `[[plateau-limits]]` and `CLAUDE.md` no longer list #114, #128, #129, #130, #132, #112, #109, #124 and #103 (if closed) as open, and the views of every example that has views are byte-identical to the jar of `archicode-0.16.0` except the files W-6 lists
- `./mvnw -o verify -DskipITs=false`, `cargo test --manifest-path src/main/rust/viewpoint-kernel/Cargo.toml`, `src/main/rust/viewpoint-kernel/embed.sh --check`, `node --test "src/test/javascript/**/*.test.js"` and `npx prettier --check "src/**/*.java"` pass

## Dependency View

```
P0:  W-1   W-2
P1:  W-3   W-4   W-5*
P2:  W-6 <── W-2        W-7        W-8 <── W-6
P3:  W-9 <── (W-1 to W-8)
* hard_judgment
```

## Risks

- **Overlaps, all `serialize`.** No `concurrent-safe` verdict is claimed; the runs are dispatched one at a time, in the order W-1 to W-9. The pairs that share a path: W-1, W-2, W-3, W-4, W-5, W-6 and W-7 (`standalone.html`, the node tests), W-1, W-2 and W-6 (the kernel and the wasm, which cannot be re-embedded twice at once), W-1, W-2 and W-7 (`negative-cases.json`, `src/test/resources`), W-6 and W-8 (`src/test/resources`, the viewpoints), every run (`CLAUDE.md`), W-9 and every run (the manual).
- **Edges.** W-6 needs W-2 because both change the kernel facet code and the wasm in the same files; W-8 needs W-6 because it records the drawings of the maps and the dependencies that W-6 changes; W-9 needs every run.
- **Breaking by design.** W-1 and W-2 make a workspace that used a removed form fail with one line. The repository has no workspace that uses a group, and the shims are used by tests and by `src/test/workspaces`, which W-2 rewrites. The author's own workspace is not in the repository: before the release the author runs the 0.17 build on it. The wave does not look at it.
- **W-5 deletes files.** It is the only `hard_judgment` run: it removes manifests of a plateau and edits the override of the plateaus above it. It works on copies of the layered Brightcart in its tests and writes through `guardedLayerWrite`, which restores everything on a refusal.
- **W-6 changes drawings.** The output of three viewpoints and the Map changes for a deployed application whose descendants declare relationships (accepted: D7). T6 requires that each changed file is explained by a relationship; a change nothing explains is a defect.
- **W-7 may find that T4 is wrong.** If it finds that the editor cannot print back a value it reads as the command line does, it records the cases that stay different and files them; it does not change the command line without saying so.
- **W-8 is a new command.** It needs the reflection entries for the Native job (`reflect-config.json`, `NativeReflectionConfigTest`) and an integration test that talks to the packaged jar; the Native job is not run in this session.
- **The size.** Nine runs, eight `standard` and one `hard_judgment`, one at a time; the largest phase dispatches two runs at most only if the overlap checks allowed it, which they do not: concurrency 1. A long wave may be interrupted; `complete-wave` resumes from the files.
- **Hand-written files.** Nothing of the author's real workspace is in the repository; every file a run ships is loaded by the command line and by the editor in a test, and a failure that stays is pinned by a test that checks the message.

## Completion Criteria

The four phase gates verified; `./mvnw -o verify -DskipITs=false`, `cargo test`, `embed.sh --check`, `node --test` and `npx prettier --check "src/**/*.java"` pass on the final tree; every shipped example and fixture is loaded by the command line and the editor in a test; issues #114, #128, #129, #130, #132, #112, #109, #124 and #103 (or its remainder) are closed by their commits; #65, #24, #78 and #125 stay open; every item a run lists as "not verified" is in the final report.
