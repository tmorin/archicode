---
type: wave
wave: 013
status: in-progress
date: 2026-10-17
related:
  - docs/wav/wav-013-reported-defects-and-shipped-files/wbc-013-reported-defects-and-shipped-files.md
  - docs/wav/wav-012-brightcart-fixture/wav-012-brightcart-fixture.md
  - docs/fixtures/brightcart-spec.md
  - CLAUDE.md
---

# Wave 013 — Reported Defects and Shipped Files

## Purpose

When this wave is done, every fixture and example the repository ships is loaded by the command line and by the editor in a test,
with a named list of exceptions; the layered rendition of Brightcart is generated on demand and no longer committed; the command
line and the editor refuse a manifest of `Kind: plateau` or with a `plateau` header with one clear line. The editor defects
#66, #68, #69, #71 and #57 are fixed with a test each, `query graph` is sorted (#58) and `query views -f toml` is valid (#59),
and the candidates of `replaces` are measured better on the large invented pair, no longer pair two sibling alternatives
(#60, #70), and the relationships of a split element say they come from it (#61). The negative cases of the Brightcart fixture that
today's tools can run (a plateau declared twice, a baseline that names nothing, a folder that is missing, a `current` that names
nothing, a reference declared twice, a mistyped `replaces`) have been run, and each gives one author's line or a fix; the lossy
cases of the editor's save that no issue named (anchors and tags, a comment inside an empty collection) are fixed or filed. A
workspace that hits none of these defects generates exactly the same views as before.

## Non-Goals

- Does not make `manifests.paths` recursive (#73), build `plateau merge` (#65), build the timeline of the editor (#72), run the
  native checks as integration tests (#62), or decide the layered model (#30). Each is an issue; #72 and #73 were filed for this
  wave's request.
- Does not touch what is not a defect: #34 (a change of the kernel's contract), #39 (a decision), #33 and #29 (checks on a real
  pair and by hand), #43 and #44 (moves the editor does not do yet), #37 (an efficiency remark the issue itself says is not a
  defect on the sizes tried), #26, #25, #27, #24 (features and polish). After this wave, the open issues are those and the ones
  that wait for the author.
- Does not recognise `Kind: plateau` or the `plateau` header: it refuses them with a message, as `from` is refused today.
- Does not change the format of manifests, `settings.plateaus`, or the views of a workspace that hits none of the defects.
- Does not put any text from a real workspace in the repository: the fixtures are invented.
- Does not cut a release and does not write release notes; it leaves the note of the changed output of `query` and of the
  candidates where the release will find it.
- Does not close #67: the commit `ce452a2` (wave 012) does it when the pull request is merged.

## Wave Manifest

```yaml
wave_manifest:
  wave: 013
  slug: reported-defects-and-shipped-files
  status: in-progress
  sources: []
  phases:
    - id: P1
      name: Shipped files and the fixture
      gate:
        criteria:
          - '`git ls-files src/test/resources/brightcart/layered` is empty; `node src/test/resources/brightcart/generate.mjs` run twice leaves `git status --porcelain src/test/resources/brightcart` empty; `node src/test/resources/brightcart/generate.mjs --layered <empty dir>` writes the layered rendition there and the resolver reports that it equals `folders/` for the four plateaus (sizes 50, 42, 66, 82)'
          - 'the double run of `BrightcartStableOutputTest` covers `saas` and `marketplace` only, the other tests of the class and `BrightcartViewsTest` still cover the four plateaus, and the run reports the time of the class before and after'
          - 'one Java test loads every `workspace.yaml` under `src/doc/examples` and `src/test/resources` with `WorkspaceFactory`, and one node test opens the same list in the editor harness, each from a list of exceptions in which every entry has a reason; altering a fixture manifest (an unknown key) makes both fail, shown by the run'
          - 'a manifest with `kind: archicode.morin.io/plateau` and one with a `plateau:` header each give, on the command line, exit 1 and one `error:` line that names the key, says layered plateaus are not supported yet and points at #30, with no stack trace; the editor shows the same sentence; tests pin both'
          - 'the document says in its limits that the complete-folder rendition is flat because the loader reads one level (#73), and the README of the fixture says how to write the layered rendition'
          - '`./mvnw -o verify`, `cargo test --manifest-path src/main/rust/viewpoint-kernel/Cargo.toml`, `src/main/rust/viewpoint-kernel/embed.sh --check`, `node --test "src/test/javascript/**/*.test.js"` and `npx prettier --check "src/**/*.java"` pass'
    - id: P2
      name: Editor defects
      gate:
        criteria:
          - 'a node test per issue (#68, #69, #71, #57, #66) fails on the editor page and the test of the commit before the run and passes after it, shown by the run'
          - '#68: on the Brightcart folder, *Unfold all* followed by the facet `journey` draws the Map with no `dangling reference` error; #71: the panel of the removed `Cache VM` of `inhouse` against `baseline` lists `shop.cache` under applications; #66: six parallel `node --test` runs of `folders.test.js` give no failure'
          - '#69: either the page was measured in the built-in browser at 800 px (document width not wider than the window, *Compare to* reachable without scrolling the page sideways), or the run says the pane could not lay out and a node test asserts the rule that makes the group wrap or scroll'
          - '#57: a list at the column of its key is saved with only the lines the edit changes, its comments and blank lines kept; the six edits on the YAML files of the repository save every file the edit does not concern byte for byte, and the run says which edits it ran'
          - 'the five commands of P1 pass'
    - id: P3
      name: Outputs and candidates
      gate:
        criteria:
          - '#58: `archicode query graph` lists elements by layer then reference and gives one output over 20 runs; #59: `archicode query views -f toml` is read back by a TOML parser in a test; the manual says both outputs changed once'
          - '#60, #70: `ReplacesLargePairTest` records the new numbers with precision above 0.45 and recall not below 0.70, or the run records with the sweep why the issue''s idea does not hold; `archicode diff --plateau inhouse --baseline saas` on the Brightcart folders no longer lists the pairs `commerce-live`/`tax-live` and `commerce-sandbox`/`tax-sandbox` while `saas` against `baseline` still proposes them'
          - '#61: a relationship that belongs to a split element carries a note in `gap.md` and the header counts them; the output shape of the kernel and its contract (4) are unchanged, or the run stops and records it (#34)'
          - 'the views of every workspace of the repository that has no comparison are byte-identical to those of a jar built from the commit before the wave (`6575892`), and those with a comparison differ only where the candidates or the notes changed; the run lists the workspaces and commands'
          - 'the five commands of P1 pass and `npx prettier --check "src/**/*.java"` is clean on the final tree'
    - id: P4
      name: The negative cases of the fixture
      gate:
        criteria:
          - '`src/test/resources/brightcart/variants/` holds, for each variant that today''s tools can run (at least: a plateau declared twice, a baseline that names no plateau, a baseline that is a cycle, a plateau folder that is missing, a `current` that names no plateau, a reference declared twice in one plateau, a `replaces` that names nothing, a typo in a plateau id given to `--plateau`), the folders to run it on, and a test runs each on the command line and in the editor harness'
          - 'each of those gives exit 1 and one `error:` line without a stack trace on the command line (or a warning, where the variant is a warning), and the same sentence in the editor; a case that gave a stack trace, a wrong silence or two different sentences is fixed in the run with a test, or filed as an issue with its reproduction, and the run lists which'
          - 'the document''s variants table says which variants are run by a tool and which wait for the layered engine'
          - 'the five commands of P1 pass'
  runs:
    - id: W-1
      slug: fixture-layered-off-repo
      phase: P1
      depends_on: []
      run: '0064'
      delegation: standard
      likely_paths:
        - 'src/test/resources/brightcart/**'
        - 'docs/fixtures/brightcart-spec.md'
        - 'src/test/javascript/viewpoint-kernel/brightcart-editor.test.js'
        - 'src/test/java/io/morin/archicode/brightcart/**'
      focus: 'open the Brightcart folder and find nothing that no tool can open, and a build that does not wait minutes for one test'
    - id: W-2
      slug: shipped-files-loaded
      phase: P1
      depends_on: [W-1]
      run: null
      delegation: standard
      likely_paths:
        - 'src/test/java/io/morin/archicode/doc/**'
        - 'src/test/java/io/morin/archicode/manifest/**'
        - 'src/main/java/io/morin/archicode/manifest/**'
        - 'src/main/resources/editor-webapp/standalone.html'
        - 'src/test/javascript/viewpoint-kernel/shipped-files*.test.js'
        - 'src/doc/README.adoc'
      focus: 'learn from a test, not by opening the file, that a shipped fixture does not load, and why'
    - id: W-3
      slug: editor-defects-from-brightcart
      phase: P2
      depends_on: []
      run: null
      delegation: standard
      likely_paths:
        - 'src/main/resources/editor-webapp/standalone.html'
        - 'src/test/javascript/viewpoint-kernel/**'
      focus: 'use the editor on a four-plateau project without a Map that fails, a header off screen, a panel that hides what a node deployed, or a test that fails at random'
    - id: W-4
      slug: save-list-at-key-column
      phase: P2
      depends_on: []
      run: null
      delegation: standard
      likely_paths:
        - 'src/main/resources/editor-webapp/standalone.html'
        - 'src/test/javascript/viewpoint-kernel/faithful-saves.test.js'
        - 'src/test/javascript/viewpoint-kernel/brightcart-editor.test.js'
        - 'src/test/javascript/viewpoint-kernel/anchors-tags-save*.test.js'
      focus: 'save a manifest whose lists are written at the column of their key, or that has anchors, tags or a comment in an empty list, and see only my lines change'
    - id: W-5
      slug: query-output-fixes
      phase: P3
      depends_on: []
      run: null
      delegation: standard
      likely_paths:
        - 'src/main/java/io/morin/archicode/cli/**'
        - 'src/test/java/io/morin/archicode/cli/**'
        - 'src/doc/README.adoc'
      focus: 'store or diff the output of query graph, and read query views as TOML'
    - id: W-6
      slug: candidates-and-split-reading
      phase: P3
      depends_on: [W-1]
      run: null
      delegation: standard
      likely_paths:
        - 'src/main/rust/viewpoint-kernel/**'
        - 'src/main/wasm/viewpoint_kernel.wasm'
        - 'src/main/resources/editor-webapp/standalone.html'
        - 'src/main/java/io/morin/archicode/viewpoint/kernel/**'
        - 'src/main/java/io/morin/archicode/rendering/gap/**'
        - 'src/test/resources/replaces-large-pair/**'
        - 'src/test/resources/brightcart/**'
        - 'src/test/java/io/morin/archicode/**'
        - 'src/test/javascript/viewpoint-kernel/**'
        - 'src/doc/README.adoc'
      focus: 'get fewer wrong candidates of replaces, none between two alternatives, and a table of changes that says where a split element''s relationships come from'
    - id: W-7
      slug: negative-variants-run
      phase: P4
      depends_on: [W-1, W-2]
      run: null
      delegation: standard
      likely_paths:
        - 'src/test/resources/brightcart/**'
        - 'docs/fixtures/brightcart-spec.md'
        - 'src/test/java/io/morin/archicode/brightcart/**'
        - 'src/test/javascript/viewpoint-kernel/brightcart-*.test.js'
        - 'src/main/java/io/morin/archicode/workspace/**'
        - 'src/main/java/io/morin/archicode/cli/**'
        - 'src/main/resources/editor-webapp/standalone.html'
      focus: 'give a workspace that is wrong one clear line from the command line and from the editor, and know it from a test, not from a bug report'
```

## Phase P1 — Shipped files and the fixture

| # | Run | Slug | Depends on | Focus | Scope | Exit evidence |
|---|-----|------|------------|-------|-------|---------------|
| W-1 | — | `fixture-layered-off-repo` | — | no shipped file that no tool opens; a build that does not wait for one test | `generate.mjs --layered <dir>` writes the layered rendition outside the repository and the resolver checks it against `folders/`; `layered/` is removed from the repository, with the layered saves test of `brightcart-editor.test.js`, `layered` entries of `expected/renditions.json` and what the README and the document say about it; the double run of `BrightcartStableOutputTest` cut to `saas` and `marketplace` (the other tests of the class are cheap and stay); the document's limits say the folders rendition is flat because the loader reads one level (#73) | the five commands of the gate; the resolver message; the class time before and after; nothing in the repository mentions a committed `layered/` |
| W-2 | — | `shipped-files-loaded` | W-1 | a test, not a surprise, says a shipped file does not load | a Java test that loads every `workspace.yaml` under `src/doc/examples` and `src/test/resources` (the manual test already does the first folder) from a list of exceptions that each carry a reason; a node test that opens the same list in the editor harness; `Kind: plateau` and a `plateau` header refused by `ManifestParser` and by the editor with one line (the way `from` is refused), pinned by a test on each; a sentence in the manual where it lists the reserved keys | an unknown key in a fixture manifest fails both tests (shown); the message is one `error:` line without a stack trace; the five commands |

**Gate:** see the manifest, phase P1.

## Phase P2 — Editor defects

| # | Run | Slug | Depends on | Focus | Scope | Exit evidence |
|---|-----|------|------------|-------|-------|---------------|
| W-3 | — | `editor-defects-from-brightcart` | — | an editor that holds on a four-plateau project | #68 the Map with an element opened, pinned or hidden that a facet removes: the editor drops from the three lists what the facet removes before it calls the kernel (it already asks the kernel what a facet removes); #69 the plateau group and *Compare to* of the header wrap or scroll inside their own group; #71 the panel of a removed node lists the applications it deployed, as the panel of a changed node does; #66 the test waits for the condition with a deadline in place of 50 ms | one test per issue that fails before and passes after; the reproduction of each on the Brightcart folder; six parallel runs of `folders.test.js`; the page looked at at 800 px if the pane can lay out, else said so |
| W-4 | — | `save-list-at-key-column` | — | save and see only my lines change when a list is at the column of its key, or the file has anchors, tags or a comment in an empty list | the lossy cases wave 011 named and did not file, after the aligner's: a file with anchors or tags, and a comment inside an empty collection that an edit fills (fixed if the line-preserving save can carry them under the rule below, else filed with the reproduction); the aligner accepts the item of a list at the column of its key for the item the emitter writes two columns deeper, keeps the author's lines for the items an edit does not touch, and writes an item an edit adds at the column the list already uses; the rule of wave 010 stays (a result is accepted only if re-reading it gives the emitter's value) | tests with the issue's example and one per other case, with comments kept; the six edits on the YAML files of the repository; #57 closed by the commit; each case not fixed is an issue |

**Gate:** see the manifest, phase P2.

## Phase P3 — Outputs and candidates

| # | Run | Slug | Depends on | Focus | Scope | Exit evidence |
|---|-----|------|------------|-------|-------|---------------|
| W-5 | — | `query-output-fixes` | — | diff or parse the output of `query` | `GetGraphQuery` walks the references in sorted order (layer, then reference), relationships by source then as written (#58); `query views -f toml` writes a valid document, by wrapping the list in a table (or says in the manual that TOML is not usable for a list, if wrapping is refused: see Open Questions) (#59); the manual and the commit body say each output changed once | 20 runs and two builds give one output of `query graph`; a test reads the TOML back; the set of elements and views of every workspace of the repository unchanged |
| W-6 | — | `candidates-and-split-reading` | W-1 | better candidates, and a table that explains a split | `candidates()` in `compare.rs`: a measured choice between "name unique among the removed and the new elements" and "the parents are themselves a pair" (#60), using `generate.mjs --sweep` and `ReplacesLargePairTest`; no pair whose only reason is the shared parent when the two plateaus compared are not on the same chain (#70); `gap.md` marks the relationships of a split element and the header counts them (#61); the wasm re-embedded, the expected candidates of the Brightcart folder regenerated by the generator | the numbers recorded before and after; P5 loses the two sibling pairs and P1 keeps the swap pair; `cargo test`, `embed.sh --check`, `node --test`, `verify`; if the output shape of the kernel or its contract would change, the run stops and records it (#34) |

**Gate:** see the manifest, phase P3.

## Phase P4 — The negative cases of the fixture

| # | Run | Slug | Depends on | Focus | Scope | Exit evidence |
|---|-----|------|------------|-------|-------|---------------|
| W-7 | — | `negative-variants-run` | W-1, W-2 | a wrong workspace gives one clear line, tested | the negative variants of the document that today's tools can run on the complete folders (V2, V4, V5, V11 and their kin, and the ones `settings.plateaus` adds: a baseline that names nothing or loops, a missing folder, a `current` that names nothing, a mistyped `--plateau`), written as small folders next to the fixture and run on the command line and in the editor harness; every case that gives a stack trace, a wrong silence or two sentences for one error is fixed when it is a few lines and filed with its reproduction otherwise; the document's variants table says which are run | one test per variant on the command line and one in the harness; the list of cases fixed and filed; the five commands |

**Gate:** see the manifest, phase P4.

## Dependency View

```
P1:  W-1 ---- W-2
       \
P2:     \   W-3     W-4
         \
P3:       +-- W-6   W-5
P4:  W-7  (after W-1 and W-2)
```

## Open Questions

- **The wording of the refusal** (W-2): "`kind: plateau` is not supported yet (layered plateaus, see #30)" and the same for the
  `plateau` key. The run chooses the sentence; it names the key, says not supported yet and points at #30.
- **How `query views -f toml` is made valid** (W-5): `views = [...]` (a table holding the list) or an array of tables. It
  changes the output of a format that no parser could read, so the risk is nil; the run takes the table and says so.
- **Which option for #60** (W-6): the issue gives two. The run measures both with the sweep and takes the one with the better
  precision for the least loss of recall, and says the numbers. If neither beats 0.45 with a recall of 0.70, the gate
  criterion says the run records why instead.
- **Whether the chain is known to the kernel** (W-6, #70): the kernel is given two plateaus and may not know whether one is the
  other's ancestor. If the fix needs a new input, it changes the contract (#34): the run stops and says it, and does only #60 and
  #61.
- **Where #68 is fixed** (W-3): in the editor (drop from the three lists what the facet removes), which changes no contract. The
  other direction (the kernel ignores an unknown reference in the lists when a facet is given) is #34's.
- **The cost of `verify`** (W-1): with the double run cut, the class should be a fraction of its time. If it is still more than
  a minute unloaded, the run says so and the author decides on a tag.

## Risks

- **Overlap, W-2, W-3, W-4 and W-6** (`src/main/resources/editor-webapp/standalone.html`, `src/test/javascript/viewpoint-kernel/**`):
  `serialize`. One file edited by four runs, each committing its own; and W-6 re-embeds the wasm in the same page. The order is
  W-2, W-3, W-4, W-6.
- **Overlap, W-1 and W-6** (`src/test/resources/brightcart/**`, `src/test/java/io/morin/archicode/**`): resolved by the edge
  `W-1 -> W-6`. W-6 changes the expected candidates of the fixture through the generator W-1 reshapes.
- **Overlap, W-3 and W-4** (`brightcart-editor.test.js` is edited by W-1, W-4 only; `standalone.html` by both): `serialize`.
- **Overlap, W-5 and W-6** (`src/doc/README.adoc`, and `./mvnw verify` in one `target/`): `serialize`. W-5 first.
- **Overlap, W-1 and W-2**: resolved by the edge `W-1 -> W-2`.
- **Overlap, W-7 and W-1, W-2** (`src/test/resources/brightcart/**`, the manifest parser, the editor page): resolved by the edges
  `W-1 -> W-7` and `W-2 -> W-7`. **W-7 and W-3, W-4, W-6** (`standalone.html`, `src/test/resources/brightcart/**`): `serialize`;
  W-7 is in the last phase, so it runs after them.
- **W-7 may find more than it can fix.** A case that needs more than a few lines is filed as an issue and left; the wave does
  not grow to hold it.
- **Overlap, W-2 and W-5** (`src/doc/README.adoc`, `src/test/java/io/morin/archicode/**` by directory only): `serialize`, because
  of the manual; W-2 is in P1.
- Every run in this wave runs `./mvnw verify` in the same working tree and `target/`, as in waves 011 and 012: all runs are
  dispatched one at a time, in the order W-1, W-2, W-3, W-4, W-5, W-6, W-7.
- Byte-identity is the invariant every run can break quietly (the views, the saves, the outputs of `query`). Each run compares
  against a jar built from `6575892` on the workspaces of the repository, and says which workspaces and commands.
- W-6 changes the candidates that every user of `replaces` sees (fewer, not in another shape) and the table of changes; W-5
  changes two outputs of `query` once. The runs write a note for the release where the wave 011 notes are (progress log).
- The page cannot be laid out when the pane of the built-in browser is hidden (wave 012): W-3's layout check may be reported as
  not verified.
- The first run of the `Native` job on the pull request is not seen by any run; if it is red, it is wave 012's and the branch's,
  not this wave's.

## Completion Criteria

The four phase gates verified; `./mvnw -o verify`, `cargo test`, `embed.sh --check`, `node --test` and `npx prettier --check
"src/**/*.java"` pass on the final tree; the issues #57, #58, #59, #60, #61, #66, #68, #69, #70, #71 are closed by their commits
or re-filed with the reason; `CLAUDE.md`'s rule about shipped files is met by a test and not only by a sentence; every item a run
lists as "not verified" is in the final report.
