---
type: wave
wave: 014
status: proposed
date: 2026-10-18
related:
  - docs/wav/wav-014-layered-plateaus/wbc-014-layered-plateaus.md
  - docs/fixtures/brightcart-spec.md
  - docs/wav/wav-013-reported-defects-and-shipped-files/wav-013-reported-defects-and-shipped-files.md
  - CLAUDE.md
---

# Wave 014 — Layered Plateaus

## Purpose

When this wave is done, a plateau is a layer: the manifests that say `plateau: <id>` in their header, whatever folder they are in, are added
to the graph of the plateau it overrides, then the ordered patches of its `Kind: Plateau` manifest (`REMOVE`, `SET`, `ADD`, `MERGE`) change
that graph, and a patch that selects nothing is an error that names the plateau and the patch. `baseline` is the root. `settings.plateaus`,
`plateau add` and `--baseline` no longer exist, and a workspace that still has the key fails with one line that says what to write. The
command line draws, lists and compares plateaus (`--plateau`, `--against`, `plateau list`), the editor is organised around a band of
plateaus and a Timeline perspective in which plateaus and their changes are edited, and the Brightcart fixture is the layered form that the
tools run on, with its negative cases. The manual, the example and the tutorial describe the layers. Before the layers, the open defects of
the previous waves are fixed: anchors, aliases and tags (#74), an editor that refuses what the command line refuses (#75, #76), the cache keys
of the editor (#37), the small defects found by the last runs, and the findings of the review of wave 013. A workspace that has no plateau
generates exactly the same views as before.

## Non-Goals

- Does not build `MOVE` or `RENAME`: the fixture shows `MOVE` is the right tool for 4 elements of 12 and the rest is a manifest with `replaces`.
  A patch never changes an `id` or a `parent`.
- Does not build `plateau migrate` and does not keep a transition version: a workspace with `settings.plateaus` fails with a clear line
  (the author's decision of 2026-10-18).
- Does not build `plateau merge` (#65), the fold of a future plateau into the present: it needs this model first.
- Does not decide how real workspaces are migrated by hand: the author's own workspace is migrated by the author, with the new manual. No text
  from it enters the repository.
- Does not put any text from a real workspace in the repository: the fixtures are invented.
- Does not cut a release and does not write release notes; it leaves the notes of what breaks (the key, the option, the folders of views, the
  contract of the kernel) in the progress log, for the release.

## Decisions

Given by the author on 2026-10-18, taken as decided by the runs:

- **D1.** `settings.plateaus` is removed now; a workspace that has it gets an error, with no `migrate` and no transition.
- **D2.** The plateau of a manifest is its `plateau:` header; without one it is `baseline`; the folder does not matter. Plateaus are inferred
  from the headers. `Kind: Plateau` qualifies a plateau: `name`, `override` (its one parent; absent means `baseline`), and the horizon and the
  patches of the study.
- **D3.** The operators of this wave are `REMOVE`, `SET`, `ADD`, `MERGE`.
- **D4.** The editor gets the whole Timeline in this wave (the band, Timeline with Applications, Environments, Elements, Stories, Files,
  Settings, editing plateaus and their patches).
- **D5.** The option `--baseline` is renamed `--against`; `baseline` means the root only.

## Assumed

Proposals of the study of 2026-10-17 that the author has not confirmed one by one. They are what the runs implement unless the plan is edited
at the review that precedes `complete-wave`:

- **A1 (C2).** A plateau may exist through a header alone; the tools warn when it exists only that way, or when its id is one letter from another.
- **A2 (C4, L8).** A reference declared in a layer and again in one of its ancestors is an error.
- **A3 (C5, C14).** A patch with no match is an error naming the plateau, the rank and the selector; `target` is a full reference and selects one
  node; `json-path` selects at least one node or the number given by `expect`.
- **A4 (C6).** `SET` replaces a field (a list is replaced), `ADD` adds a list item or a relationship, `MERGE` merges an object, a relationship
  is found by `(destination, label)`; the cascade of `REMOVE` is the facets' (it does not take the empty node that hosted the removed element).
- **A5 (C8).** Plateau ids have no dot and are in `[a-z0-9_-]`.
- **A6 (C9).** The tree has one root, a known parent and no cycle; the past of a plateau is its ancestor, the future is chosen on the band when
  there are several.
- **A7 (C10).** Discovery reads a path that ends in `/**` recursively, sorted, without the folders of generated views.
- **A8 (C11).** Views and stories carry `plateau:` and are validated after each layer.
- **A9.** The patches of a layer may touch the elements that layer adds.

## Wave Manifest

```yaml
wave_manifest:
  wave: 014
  slug: layered-plateaus
  status: proposed
  sources: []
  phases:
    - id: P0
      name: Fixes carried over from waves 011 to 013
      gate:
        criteria:
          - '#74: a manifest with a YAML anchor, an alias or a tag is read by the editor and saved with only the intended lines changed (the anchor, the alias and the tag kept as written), and the command line reads an alias as the value it points at, not as its name; a test of each, failing on the code of `25471b3` and passing after'
          - '#75 and #76: the editor refuses the unknown keys, unknown kinds and wrong shapes inside a manifest''s content and in `settings` with the sentence of the command line, an unknown `header.kind` gives one sentence in both tools, and the cases are listed once in a file that a Java test and a node test both read; the messages pinned by waves 012 and 013 are updated where this run changes them, and the run lists which'
          - '#37: the cache of the diagram and the cache of the quiet references are keyed on the version counter and the small parts that vary, not on the serialised input of the kernel; a node test shows two renders of an unchanged model serialise nothing, and a change of the model, of the facet or of the viewpoint still gives a fresh render'
          - 'the panel of a removed environment lists its `uses`; the document is not wider than the window at 360 px; each defect has a test that fails on the page of `25471b3`; the run states what it did not look at'
          - 'every verified finding of the code review of wave 013 (issue #77: a missing nested kind reported as `unknown kind null`, the editor and the command line checking in a different order, the quadratic lookup of the split relationships in the Changes panel, the Map recomputed once per removed reference, the lossless copy of a removed element, the split elements derived several times per report) is fixed with a test that fails before and passes after, or answered in the issue with the reason it is not a defect'
          - '`./mvnw -o verify`, `cargo test --manifest-path src/main/rust/viewpoint-kernel/Cargo.toml`, `src/main/rust/viewpoint-kernel/embed.sh --check`, `node --test "src/test/javascript/**/*.test.js"` and `npx prettier --check "src/**/*.java"` pass'
    - id: P1
      name: The engine and the fixture, beside the old mechanism
      gate:
        criteria:
          - 'the kernel has an entry point that applies an ordered array of patches (`REMOVE`, `SET`, `ADD`, `MERGE`) to the JSON of a workspace; `cargo test` shows, for each operator, a result, the nodes touched, and for a patch that selects nothing an error that names the rank and the selector; a `target` that is a full reference selects exactly one node and a `json-path` at least one or the number given by `expect`'
          - 'a `manifests.paths` entry that ends in `/**` is read recursively by the command line and by the editor, sorted, without the folders of the generated views, and an entry without `/**` reads exactly what it read before; the views of every workspace of the repository are byte-identical to those of a jar built from `25471b3` (`git archive 25471b3`, built outside the repository; the run lists the workspaces and the commands)'
          - 'a manifest of any kind accepts `plateau: <id>`, `kind: archicode.morin.io/plateau` accepts `id`, `name`, `horizon`, `override` (one value) and `patches`, and tests pin one `error:` line, with no stack trace, for each of: an `override` that names no plateau, a cycle, an id with a dot, a plateau declared twice, a list given to `override`; a plateau that exists only through headers, or whose id is one letter from another, gives a warning; a workspace with both `settings.plateaus` and a layered plateau is an error'
          - '`archicode -w <layered Brightcart> diff --plateau <id>` gives the counts of P1, P2, P3 and P5 read from `src/test/resources/brightcart/expected/`, and `views generate --plateau <id>` with its comparison views succeeds for the four plateaus and is identical over two runs; the layered rendition is committed again and the generator''s resolver still agrees with the complete folders'
          - 'the Native smoke step of `.github/workflows/ci-build.yaml` also runs `diff` and `views generate` on the layered Brightcart (the `folders/` lines stay until W-9), and every `expect` line of that step, run by hand with the JVM jar in place of the native runner (`java -jar target/quarkus-app/quarkus-run.jar`), passes; the run says that the native image itself was not built locally'
          - '`./mvnw -o verify`, `cargo test --manifest-path src/main/rust/viewpoint-kernel/Cargo.toml`, `src/main/rust/viewpoint-kernel/embed.sh --check`, `node --test "src/test/javascript/**/*.test.js"` and `npx prettier --check "src/**/*.java"` pass'
    - id: P2
      name: The editor
      gate:
        criteria:
          - 'the editor opens the layered Brightcart folder and shows a band with one node per plateau placed by the tree, a click on a node draws that plateau, two toggles compare with the past or with the future, and the Changes panel gives the counts of `archicode diff` for P1, P2, P3 and P5 (`cli-editor-counts.test.js`); the value of a field says where it comes from (declared in the plateau, inherited from another, set by patch N)'
          - 'the perspectives are Timeline (Applications, Environments, Elements), Stories, Files and Settings; `#/map`, `#/elements`, `#/library` and `#/stories` still open; Files shows the plateau of each file and filters by the plateau of the band; Settings has no plateau section'
          - 'in the editor, adding an element writes a manifest with `plateau:`; editing an inherited field adds one `SET` to the plateau (a second edit of the same target and field changes that patch); removing an inherited element adds a `REMOVE`; editing the baseline asks first and lists the plateaus it changes; every save goes through the line-preserving save and is accepted only if the resolution gives back the edited value; the faithful-saves tests pass'
          - 'the page was driven in the built-in browser in light and dark (counts read from the page) and, if the pane can lay out, looked at; if not, the report says it was not seen'
          - '`./mvnw -o verify`, `cargo test --manifest-path src/main/rust/viewpoint-kernel/Cargo.toml`, `src/main/rust/viewpoint-kernel/embed.sh --check`, `node --test "src/test/javascript/**/*.test.js"` and `npx prettier --check "src/**/*.java"` pass'
    - id: P3
      name: Remove the old mechanism
      gate:
        criteria:
          - '`git grep -n "settings.plateaus\|plateaus:" -- src docs/*.adoc` finds only the one error message, tests of it, and history in `docs/wav` and `docs/fixtures`; every shipped workspace that had `settings.plateaus` is layered, and `ShippedFilesTest` and `shipped-files.test.js` pass with an empty list of exceptions'
          - 'a workspace with `settings.plateaus` gives, on the command line and in the editor, exit 1 and one `error:` line that says the key no longer exists and what to write instead (a `plateau:` header and a `Kind: Plateau`), with no stack trace; `plateau add` and `--baseline` are gone (`--baseline` gives picocli''s usage error), `--against` and `plateau list` work; the directories of the views are named `views-<plateau>` and `views-<plateau>-vs-<against>`'
          - 'the editor has no plateau selector, no *Compare to* list, no plateau section in Settings and no code that reads `settings.plateaus` (the message aside); the Brightcart `folders/` rendition and the tests that read it are gone, replaced by the layered rendition'
          - '`git grep -n -e "--baseline" -- .github README.md src` finds no use of the option other than the test that expects picocli''s usage error; every `expect` line of the Native smoke step of `.github/workflows/ci-build.yaml`, converted to layers (`--against`, the layered `domain_plateaus` and Brightcart), run by hand with the JVM jar, passes; the sentences of `README.md` that name `--baseline` say `--against`'
          - '`./mvnw -o verify`, `cargo test --manifest-path src/main/rust/viewpoint-kernel/Cargo.toml`, `src/main/rust/viewpoint-kernel/embed.sh --check`, `node --test "src/test/javascript/**/*.test.js"` and `npx prettier --check "src/**/*.java"` pass'
    - id: P4
      name: Variants, siblings and the manual
      gate:
        criteria:
          - 'V1, V3 and V6 to V10 of the Brightcart document run on the layered tools and each gives the class of message the document expects, one line, from the command line and from the editor, pinned by tests; `negative-cases.json` is rewritten for the new form'
          - '#70: `diff --plateau inhouse --against saas` on the layered Brightcart no longer lists the pairs `commerce-live`/`tax-live` and `commerce-sandbox`/`tax-sandbox`, and `saas` against its parent `baseline` still proposes them; #34: the kernel says whether a `contains-changes` state is computed, the three lists of the seven state words are one; the kernel contract is 5 and its README says what changed'
          - 'the manual describes the layers (`plateau:`, `Kind: Plateau`, patches and their operators, `--against`, `plateau list`, the timeline), the example `domain_plateaus` is layered and loaded by the manual test, the tutorial follows it, and `CLAUDE.md` describes the new mechanism where it described `settings.plateaus`'
          - 'the views of every workspace of the repository that has no plateau are byte-identical to those of a jar built from `25471b3`'
          - '`./mvnw -o verify`, `cargo test --manifest-path src/main/rust/viewpoint-kernel/Cargo.toml`, `src/main/rust/viewpoint-kernel/embed.sh --check`, `node --test "src/test/javascript/**/*.test.js"` and `npx prettier --check "src/**/*.java"` pass'
  runs:
    - id: W-14
      slug: anchors-aliases-tags
      phase: P0
      depends_on: []
      run: 0071
      delegation: standard
      likely_paths:
        - 'src/main/resources/editor-webapp/standalone.html'
        - 'src/main/java/io/morin/archicode/manifest/**'
        - 'src/main/java/io/morin/archicode/**/*Mapper*.java'
        - 'src/test/javascript/viewpoint-kernel/**'
        - 'src/test/java/io/morin/archicode/manifest/**'
        - 'src/doc/README.adoc'
      focus: 'keep the anchors, aliases and tags of a manifest, in the editor and on the command line'
    - id: W-15
      slug: editor-validates-like-cli
      phase: P0
      depends_on: []
      run: 0072
      delegation: standard
      likely_paths:
        - 'src/main/resources/editor-webapp/standalone.html'
        - 'src/main/java/io/morin/archicode/manifest/**'
        - 'src/main/java/io/morin/archicode/ArchiCodeException.java'
        - 'src/test/java/io/morin/archicode/**'
        - 'src/test/javascript/viewpoint-kernel/**'
        - 'src/test/resources/brightcart/**'
      focus: 'have the editor and the command line refuse the same manifests with the same sentence'
    - id: W-16
      slug: editor-odds-and-ends
      phase: P0
      depends_on: []
      run: 0073
      delegation: standard
      likely_paths:
        - 'src/main/resources/editor-webapp/standalone.html'
        - 'src/test/javascript/viewpoint-kernel/**'
      focus: 'a faster editor on a big model, and a panel and a page that hold the width'
    - id: W-17
      slug: wave-013-review-findings
      phase: P0
      depends_on: []
      run: 0074
      delegation: standard
      likely_paths:
        - 'src/main/**'
        - 'src/test/**'
      focus: 'the defects a reviewer found in the last wave, fixed or answered'
    - id: W-1
      slug: kernel-apply-patches
      phase: P1
      depends_on: []
      run: 0075
      delegation: standard
      likely_paths:
        - 'src/main/rust/viewpoint-kernel/**'
        - 'src/main/wasm/viewpoint_kernel.wasm'
        - 'src/main/resources/editor-webapp/standalone.html'
        - 'src/test/javascript/viewpoint-kernel/**'
      focus: 'resolve the changes of a plateau on the graph the manifests loaded, with an error that says which patch missed'
    - id: W-2
      slug: recursive-discovery
      phase: P1
      depends_on: []
      run: 0076
      delegation: standard
      likely_paths:
        - 'src/main/java/io/morin/archicode/manifest/**'
        - 'src/main/java/io/morin/archicode/workspace/**'
        - 'src/main/resources/editor-webapp/standalone.html'
        - 'src/test/java/io/morin/archicode/manifest/**'
        - 'src/test/javascript/viewpoint-kernel/**'
        - 'src/doc/README.adoc'
      focus: 'put manifests in any folder and have them found, in the same order, by the command line and the editor'
    - id: W-3
      slug: plateau-model
      phase: P1
      depends_on: [W-15]
      run: 0077
      delegation: standard
      likely_paths:
        - 'src/main/java/io/morin/archicode/manifest/**'
        - 'src/main/java/io/morin/archicode/resource/**'
        - 'src/main/java/io/morin/archicode/workspace/**'
        - 'src/main/java/io/morin/archicode/ArchiCodeException.java'
        - 'src/test/java/io/morin/archicode/manifest/**'
        - 'src/test/java/io/morin/archicode/workspace/**'
        - 'src/test/java/io/morin/archicode/cli/LayeredPlateauRefusalTest.java'
        - 'src/test/javascript/viewpoint-kernel/shipped-files-layered-plateau.test.js'
      focus: 'write a plateau as manifests and have a mistake in the tree reported in one line'
    - id: W-4
      slug: layered-load-and-commands
      phase: P1
      depends_on: [W-1, W-2, W-3]
      run: 0078
      delegation: standard
      likely_paths:
        - 'src/main/java/io/morin/archicode/workspace/**'
        - 'src/main/java/io/morin/archicode/cli/**'
        - 'src/main/java/io/morin/archicode/viewpoint/kernel/**'
        - 'src/test/java/io/morin/archicode/**'
      focus: 'draw, list and compare layered plateaus from the command line'
    - id: W-5
      slug: layered-fixture
      phase: P1
      depends_on: [W-4]
      run: 0079
      delegation: standard
      likely_paths:
        - 'src/test/resources/brightcart/**'
        - 'docs/fixtures/brightcart-spec.md'
        - 'src/test/java/io/morin/archicode/brightcart/**'
        - 'src/test/javascript/viewpoint-kernel/brightcart-*.test.js'
        - '.github/workflows/ci-build.yaml'
      focus: 'run the Brightcart layered form on the real tools and have it agree with the complete folders'
    - id: W-6
      slug: editor-reads-layers
      phase: P2
      depends_on: [W-1, W-2, W-3, W-5]
      run: 0080
      delegation: standard
      likely_paths:
        - 'src/main/resources/editor-webapp/standalone.html'
        - 'src/test/javascript/viewpoint-kernel/**'
        - 'src/doc/README.adoc'
      focus: 'open a layered project in the editor and see its plateaus, the state of each, and where a value comes from'
    - id: W-7
      slug: editor-structure
      phase: P2
      depends_on: [W-6]
      run: null
      delegation: standard
      likely_paths:
        - 'src/main/resources/editor-webapp/standalone.html'
        - 'src/test/javascript/viewpoint-kernel/**'
        - 'src/doc/README.adoc'
      focus: 'find Applications, Environments, Elements, Stories and Files where the model puts them'
    - id: W-8
      slug: editor-writes-layers
      phase: P2
      depends_on: [W-7]
      run: null
      delegation: standard
      likely_paths:
        - 'src/main/resources/editor-webapp/standalone.html'
        - 'src/test/javascript/viewpoint-kernel/**'
      focus: 'edit a plateau and its changes from the editor, and have only the intended lines written'
    - id: W-9
      slug: remove-settings-plateaus
      phase: P3
      depends_on: [W-4, W-5, W-6]
      run: null
      delegation: standard
      likely_paths:
        - 'src/main/java/io/morin/archicode/**'
        - 'src/test/java/io/morin/archicode/**'
        - 'src/test/resources/**'
        - 'src/doc/examples/**'
        - 'src/test/javascript/viewpoint-kernel/**'
        - 'CLAUDE.md'
        - '.github/workflows/ci-build.yaml'
        - 'README.md'
      focus: 'a project with plateaus is a project of layers, and the old key says so'
    - id: W-10
      slug: remove-plateau-selector
      phase: P3
      depends_on: [W-9, W-8]
      run: null
      delegation: standard
      likely_paths:
        - 'src/main/resources/editor-webapp/standalone.html'
        - 'src/test/javascript/viewpoint-kernel/**'
        - 'src/doc/README.adoc'
      focus: 'an editor that has one way to choose and compare plateaus'
    - id: W-11
      slug: variants-on-layers
      phase: P4
      depends_on: [W-9]
      run: null
      delegation: standard
      likely_paths:
        - 'src/test/resources/brightcart/**'
        - 'docs/fixtures/brightcart-spec.md'
        - 'src/test/java/io/morin/archicode/brightcart/**'
        - 'src/test/javascript/viewpoint-kernel/brightcart-*.test.js'
        - 'src/main/java/io/morin/archicode/workspace/**'
        - 'src/main/java/io/morin/archicode/manifest/**'
        - 'src/main/resources/editor-webapp/standalone.html'
      focus: 'a wrong layered project gives one clear line, and the document says which variants a tool runs'
    - id: W-12
      slug: sibling-candidates
      phase: P4
      depends_on: [W-9]
      run: null
      delegation: standard
      likely_paths:
        - 'src/main/rust/viewpoint-kernel/**'
        - 'src/main/wasm/viewpoint_kernel.wasm'
        - 'src/main/resources/editor-webapp/standalone.html'
        - 'src/main/java/io/morin/archicode/viewpoint/kernel/**'
        - 'src/main/java/io/morin/archicode/rendering/**'
        - 'src/test/java/io/morin/archicode/**'
        - 'src/test/javascript/viewpoint-kernel/**'
        - 'src/test/resources/replaces-large-pair/**'
        - 'src/doc/README.adoc'
      focus: 'be offered a pair of replaces only when the two plateaus are one the past of the other'
    - id: W-13
      slug: layers-manual-and-tutorial
      phase: P4
      depends_on: [W-9, W-10]
      run: null
      delegation: standard
      likely_paths:
        - 'src/doc/**'
        - 'src/site/**'
        - 'CLAUDE.md'
        - 'docs/fixtures/brightcart-spec.md'
      focus: 'learn the layers from the manual, the example and the tutorial'
```

## Phase P0 — Fixes carried over from waves 011 to 013

| # | Run | Slug | Depends on | Focus | Scope | Exit evidence |
|---|-----|------|------------|-------|-------|---------------|
| W-14 | — | `anchors-aliases-tags` | — | keep the anchors, aliases and tags of a manifest, in the editor and on the command line | issue #74: the editor's reader accepts `&anchor`, `*alias` and `!tag` (today the file is listed as unreadable and never written) and the line-preserving save carries them under the rule of waves 010 and 011 (a result is accepted only if re-reading it gives the emitter's value); the command line reads an alias as the value of its anchor (`description: *n` gave `n`); a rename of a reference reaches the references in such files; what cannot be carried safely keeps the fallback and is filed | tests that fail on `25471b3`; the six edits of run 0055 still byte for byte on the files an edit does not concern; #74 closed by the commit or re-filed with the reason |
| W-15 | — | `editor-validates-like-cli` | — | have the editor and the command line refuse the same manifests with the same sentence | issues #75 and #76: the cases of wave 013's `negative-cases.json` that the editor accepts today (an unknown key, kind or shape inside the content and in `settings`, a nested element of unknown kind or without `id`) are refused by the editor with the sentence of the command line; an unknown `header.kind` gives one short sentence in both tools (the long reader enumeration with a Java class name goes); one file of cases read by a Java and a node test; the messages pinned by waves 012 and 013 (`LayeredPlateauRefusalTest`, `shipped-files-layered-plateau.test.js`) are updated where they change | the table of cases passing in both tools; no stack trace and no Java class name in any sentence; #75 and #76 closed |
| W-16 | — | `editor-odds-and-ends` | — | a faster editor on a big model, and a panel and a page that hold the width | issue #37 (the two caches still keyed on a serialised kernel input), the `uses` of a removed environment missing from its panel (run 0066), the document 424 px wide at 360 px because of the centre panel (run 0066); the header's other directions of #69 only if cheap | a node test per item that fails before; the cost of a render measured before and after on the largest plateau of the Brightcart fixture |
| W-17 | — | `wave-013-review-findings` | — | the defects a reviewer found in the last wave, fixed or answered | the verified findings of the `/code-review` of wave 013 (the diff `6575892..25471b3`), filed as issue #77 (six findings: four confirmed, two plausible, one dropped as documented behaviour): each is fixed with a test that fails before and passes after, or answered in the issue with the reason it is not a defect; the run does not widen its scope beyond that issue | one test per fixed finding; the issue's list answered; byte-identity of the views of the workspaces of the repository against `25471b3` |

**Gate:** see the manifest, phase P0.

## Phase P1 — The engine and the fixture, beside the old mechanism

| # | Run | Slug | Depends on | Focus | Scope | Exit evidence |
|---|-----|------|------------|-------|-------|---------------|
| W-1 | — | `kernel-apply-patches` | — | resolve the changes of a plateau on the graph the manifests loaded, with an error that says which patch missed | a kernel entry point (beside `compute`, `apply_facet` and `compare`) that takes the JSON of a workspace and an ordered array of patches and returns the new JSON and, per patch, the nodes it touched. `REMOVE` takes the subtree, the relationships towards it and its entries in `applications` and `uses`, and not the empty node that hosted it (the facet cascade, L5). `SET` replaces a field (a list is replaced), `ADD` adds a relationship or a list item, `MERGE` merges an object; a relationship is found by `(destination, label)`. `target` is a full reference, selects one node; `json-path` (RFC 9535, `serde_json_path`) selects at least one node or the `expect` given; zero is an error that names the plateau, the rank of the patch and the selector. A patch never changes an `id` or a `parent`. The wasm re-embedded; a conformance test with the same cases in Rust and in node | one test per operator and per error; `cargo test`, `embed.sh --check`, `node --test`, `verify` pass; no existing output changes |
| W-2 | — | `recursive-discovery` | — | put manifests in any folder and have them found, in the same order, by the command line and the editor | issue #73: an entry of `manifests.paths` that ends in `/**` is read recursively, with a deterministic sort of the paths and without the output folders of the generated views (`views.path`, `views-*`); an entry without `/**` reads exactly what it read before; the settings screen, its validation and the `..` and absolute path rules accept the new form; the same rule in `ManifestParser` and in `readManifestFolder`, with one shared list of cases tested on both | a Java and a node test on the same cases; byte-identity of every workspace of the repository against `25471b3` |
| W-3 | — | `plateau-model` | W-15 | write a plateau as manifests and have a mistake in the tree reported in one line | `ManifestKind.PLATEAU` and its content (`id`, `name`, `horizon`, `override`, `patches`); the header key `plateau` on every kind (views and stories included); the plateaus inferred from the headers plus the Plateau manifests; baseline as the implicit root; a tree check (one root, a known `override`, no cycle, ids without a dot in `[a-z0-9_-]`, declared once); a warning for a plateau that exists only through headers or is one letter from another id; a reference declared in a layer and again in an ancestor is an error (L8); the place-holder refusal of `kind: plateau` and `plateau:` (wave 013) is replaced by the real thing and its tests rewritten; a workspace with `settings.plateaus` AND layered plateaus is an error; the same messages in the editor harness; `ManifestKind` is also the place of #79 (the group kinds at the root of a manifest, refused by the command line and read by the editor) and of #80 (a `null` where a list or an object is expected): the run does not fix them but does not make them worse, and says in its document how the new kind and the new header key sit with them | one test per rule with the exact sentence; the shipped-files tests pass with the old workspaces unchanged |
| W-4 | — | `layered-load-and-commands` | W-1, W-2, W-3 | draw, list and compare layered plateaus from the command line | `WorkspaceFactory` loads a layered plateau as its chain: for each layer from the root, the manifests that say `plateau: <layer>` are added to the graph, then the kernel applies the patches of the layer; references, views and stories are validated after each layer and a failure names the layer; `--plateau <id>` draws a layer, `--against <id>` compares (default: the parent, `override`), `diff` between any two plateaus, siblings included; `plateau list` says each plateau, its parent and where its existence comes from (a Plateau manifest or headers only); the folders of the views are named `views-<plateau>` and `views-<plateau>-vs-<against>`; the old mechanism still works for a workspace that has `settings.plateaus` (removed in W-9); the cascade of a `REMOVE` is listed in `gap.md` | a layered workspace of a few plateaus built by the tests (the fixture is W-5) gives the expected `diff` and views; two runs identical; the old tests unchanged and green |
| W-5 | — | `layered-fixture` | W-4 | run the Brightcart layered form on the real tools and have it agree with the complete folders | the generator writes the layered rendition in the syntax the engine reads (`plateau:` headers, `Kind: Plateau` with `override`, the patches), committed again as `layered/` with its own `workspace.yaml` (`manifests.paths` with `/**`); the folders rendition stays until W-9; new tests run `diff` and `views generate` on `layered/` and require the same counts as `folders/` for P1, P2, P3 and P5 (this is the proof of the two mechanisms against each other), the notable cases, and a stable output; the document says which results the layered tools now verify; the Native smoke step of `.github/workflows/ci-build.yaml` gets the `diff` and `views generate` lines on `layered/` beside the ones on `folders/` | the counts of expected/ obtained from the layered folder; the `expect` lines of the smoke step pass with the JVM jar; generator regenerates byte for byte; the shipped-files tests load `layered/` |

**Gate:** see the manifest, phase P1.

## Phase P2 — The editor

| # | Run | Slug | Depends on | Focus | Scope | Exit evidence |
|---|-----|------|------------|-------|-------|---------------|
| W-6 | — | `editor-reads-layers` | W-1, W-2, W-3, W-5 | open a layered project in the editor and see its plateaus, the state of each, and where a value comes from | the editor resolves the chain with the kernel (W-1) from the manifests it reads recursively (W-2) with the rules of W-3 (same sentences); the band of plateaus, always present, `baseline` the only node of a workspace without others; a click draws the state, two toggles compare with the past or the future (the target is chosen on the band when it is ambiguous), the Changes panel with *Write replaces* and *Not related* works on any two nodes; the origin of each value; the old selector and *Compare to* stay for a workspace that still has `settings.plateaus` (removed in W-10) | counts of the Changes panel equal `archicode diff` on the layered Brightcart; tests in the harness; driven in the pane |
| W-7 | — | `editor-structure` | W-6 | find Applications, Environments, Elements, Stories and Files where the model puts them | the perspectives Timeline (with Applications, Environments, Elements), Stories in place of Library, Files (shows and filters by plateau), Settings without a plateau section; each page has the views of its layer; the routes `#/map`, `#/elements`, `#/library`, `#/stories` still open; a workspace without plateaus keeps the pages it has, `Map` called Applications | tests in the harness for the navigation and the old links; driven in the pane |
| W-8 | — | `editor-writes-layers` | W-7 | edit a plateau and its changes from the editor, and have only the intended lines written | create a successor, name, horizon and parent on the band, written in the `Kind: Plateau` manifest; an indicator "writing in: <plateau>"; adding an element writes a manifest with `plateau:`; editing an inherited field adds a `SET` to the plateau and merges it with a patch of the same target and field; removing an inherited element adds a `REMOVE`; editing a value set by a patch edits that patch; a patch written by hand with a free `json-path` is shown and not edited field by field; editing the baseline asks first and lists the plateaus it changes; the result is accepted only if the resolution gives back the edited value (the rule of the faithful save); `MOVE` is refused for an inherited element | tests per edit with the bytes of the files written; the faithful-saves tests pass; driven in the pane |

**Gate:** see the manifest, phase P2.

## Phase P3 — Remove the old mechanism

| # | Run | Slug | Depends on | Focus | Scope | Exit evidence |
|---|-----|------|------------|-------|-------|---------------|
| W-9 | — | `remove-settings-plateaus` | W-4, W-5, W-6 | a project with plateaus is a project of layers, and the old key says so | every shipped workspace that has `settings.plateaus` is rewritten as layers with the same plateaus (`domain_plateaus`, `plateau-comparison*`, `plateau-state-*`, `replaces-large-pair`, `split-relationships`, Brightcart `folders/`, which is deleted with its generator branch); the Java tests and node tests that read them are re-aimed with the same expected numbers; `Plateaus`, `PlateauAdder`, `BaselineOption`, `plateau add` and the reserved key `from` are removed; `--baseline` becomes `--against`; a workspace with `settings.plateaus` gives the one-line error of the P3 gate; `CLAUDE.md` describes the layers; the Native smoke step of `.github/workflows/ci-build.yaml` (it uses `--baseline`, `domain_plateaus`, `brightcart/folders` and the folder `views-to-be-vs-as-is`) and the two sentences of `README.md` that name `--baseline` are converted in the same commit, since the script is the only place that runs the native image on these workspaces (issues #29 and #62 speak of that script; they are re-aimed at the end of the wave, not closed by it) | the same expected counts as before the wave on every converted workspace (the run lists them); the `expect` lines of the smoke step pass with the JVM jar; the P3 gate commands |
| W-10 | — | `remove-plateau-selector` | W-9, W-8 | an editor that has one way to choose and compare plateaus | remove the plateau selector, *Compare to*, the plateau section of Settings and every read of `settings.plateaus` from the page; the editor shows the one-line error for a workspace that has the key; the tests of the old controls are removed or re-aimed at the band | no occurrence of the old controls; the P3 gate commands |

**Gate:** see the manifest, phase P3.

## Phase P4 — Variants, siblings and the manual

| # | Run | Slug | Depends on | Focus | Scope | Exit evidence |
|---|-----|------|------------|-------|-------|---------------|
| W-11 | — | `variants-on-layers` | W-9 | a wrong layered project gives one clear line, and the document says which variants a tool runs | run V1, V3 and V6 to V10 on the layered tools, and rewrite the cases of `negative-cases.json` that spoke of `settings.plateaus`; each gives one line, the same in the editor; a case that gives a stack trace or two sentences is fixed if it is a few lines, filed otherwise; the "Run today" column of the document says which variants run; the merge scenarios stay for #65 | one test per variant on the command line and one in the harness; the list of cases fixed and filed |
| W-12 | — | `sibling-candidates` | W-9 | be offered a pair of replaces only when the two plateaus are one the past of the other | the kernel contract becomes 5: `compare` takes whether the two plateaus are on one chain (the host knows it from the tree), so that a pair whose only reason is the shared parent is not proposed between siblings (#70); the state of `contains-changes` is explicit in the output and the three lists of the seven state words become one (#34); the README of the kernel and the manual say what changed | the Brightcart sibling pairs gone and the swap pair kept; `ReplacesLargePairTest` numbers not lower; the P4 gate commands |
| W-13 | — | `layers-manual-and-tutorial` | W-9, W-10 | learn the layers from the manual, the example and the tutorial | the manual sections on plateaus rewritten for the layers (the header, the Plateau manifest and its patches with their operators and errors, discovery with `/**`, `--plateau`, `--against`, `plateau list`, the timeline in the editor, what the cascade of `REMOVE` takes), the tutorial and the example `domain_plateaus` in the layered form, a note that `settings.plateaus` and `plateau add` no longer exist; the document of the fixture marks what is now verified by a tool | the manual builds; the manual test loads the examples; a reader can follow the tutorial from the files |

**Gate:** see the manifest, phase P4.

## Dependency View

```
P0:  W-14  W-15  W-16  W-17     (independent; W-15 before W-3)
P1:  W-1 ─┐
     W-2 ─┼─ W-4 ── W-5
     W-3 ─┘ (after W-15)       │
P2:  W-6 <── (W-1, W-2, W-3, W-5) ── W-7 ── W-8
P3:  W-9 <── (W-4, W-5, W-6) ──── W-10 <── (W-9, W-8)
P4:  W-11 <── W-9      W-12 <── W-9      W-13 <── (W-9, W-10)
```

## Open Questions

- **Where the horizon is written** (W-3): the study puts it in the Plateau manifest as a free label that no tool interprets. The runs take that.
- **Which sentence for the removed key** (W-9): it names the key and says what to write instead. The run chooses the words; the P3 gate pins them.
- **The order of the layers in a band** (W-6): by the tree, and by the horizon label among siblings when it reads as a date. The run chooses a
  stable rule and writes it in the manual.
- **How `Files` shows a manifest whose `plateau:` disagrees with the name of its folder** (W-7): the study proposed a warning. The run takes it.
- **How long `--baseline` stays as an error** (W-9): picocli's usage error ("Unknown option") is taken as enough.
- **The kernel contract** (W-1, W-12): `apply_patches` is added in W-1; if it needs a contract number, the run says it. The contract 5 of #34
  and #70 is W-12's.
- **The `of the split` counts and `replaces`** (W-9): converted workspaces keep their `replaces`; the comparison with a plateau that is not an ancestor
  is still possible (`--against` any plateau).

## Risks

- **W-17 is seeded by the review of wave 013**, whose six verified findings are issue #77. The two "plausible" ones (the lossless copy of a removed element,
  the split elements derived several times) may end as answers in the issue with a test showing there is no defect.
- **This is the largest change since wave 008.** It touches 33 files of `src/main/java`, 293 mentions of plateaus in the editor page, 20 Java
  test classes, 25 node test files, 8 shipped workspaces and the manual. The build stays green between runs because the old mechanism lives
  until W-9, and a workspace with both is an error.
- **All runs `serialize`.** The runs share `standalone.html` (W-1, W-2, W-6, W-7, W-8, W-10, W-11, W-12), `src/main/java/io/morin/archicode/workspace/**`
  and `manifest/**` (W-2, W-3, W-4, W-9, W-11), `src/test/javascript/viewpoint-kernel/**`, `src/doc/README.adoc` and one `target/`. They are dispatched one
  at a time, in the order W-14, W-15, W-16, W-17, W-1, W-2, W-3, W-4, W-5, W-6, W-7, W-8, W-9, W-10, W-11, W-12, W-13. No `concurrent-safe` verdict is claimed.
- **Edges.** W-3 needs W-15 (the editor's validation of keys must know the new header key and the new kind before the model adds them). W-4 needs the three before it (the kernel entry, the discovery, the model). W-5 needs W-4 to run the fixture. W-6 needs the kernel entry
  in the wasm, the discovery in the page, the rules of W-3 and the fixture. W-9 needs the command line (W-4), the fixture (W-5) and an editor that
  reads layers (W-6), because it converts the node tests too. W-10 needs the editor writes (W-8) and W-9. W-11, W-12 need W-9. W-13 needs W-9 and W-10.
- **Assumptions (A1 to A9) are the study's, not the author's.** If the author overrules one at the review, the plan is edited (`write-wave`)
  before the wave runs; a run that finds an assumption cannot hold records it, stops that branch and says so, it does not choose another rule.
- **Byte-identity.** Every run that changes `src/main` compares the views of every workspace of the repository that has no plateau against a jar
  built from `25471b3` (`git archive`, outside the repository) and lists the workspaces and the commands.
- **Contract of the kernel.** `apply_patches` is additive; contract 5 (W-12) changes the input of `compare`. Both re-embed the wasm with `embed.sh`.
- **The editor cannot be seen if the pane of the built-in browser is hidden** (waves 012 and 013). The runs read the page and say what was not seen.
- **Hand-written patches** with a free `json-path` are shown by the editor and not edited field by field.
- **The author's real workspace** uses `settings.plateaus`: after W-9 it stops loading until the author rewrites it with the new manual (W-13).
  Nothing in the repository mentions it.
- **Filing issues** is outward-facing; the runs file issues on tmorin/archicode only for out-of-scope defects and name them in the log.

## Completion Criteria

The four phase gates verified; `./mvnw -o verify`, `cargo test`, `embed.sh --check`, `node --test` and `npx prettier --check "src/**/*.java"` pass
on the final tree; `git grep` finds `settings.plateaus` only in the one error message, its tests, and the history in `docs`; every shipped workspace
with plateaus is layered and loaded by the command line and the editor in a test (the rule of `CLAUDE.md`); issues #34, #37, #70, #73, #74, #75, #76 and #77 are closed by their commits or re-filed with the reason; #30 is closed for its first idea only (layers with a tombstone, which are `override` and `REMOVE`) and its second idea (the `work-package` and `deliverable` manifests, a Migration view) and the fold (#65) are re-filed; #72 is closed except its last step, the merge into the present, which stays in #65; the issues whose premise the wave falsifies (#24, #25, #26, #27, #29, #62, #65, #82) are listed in the final report with the wording they need, and are re-aimed by the author or after the merge, not closed by the wave; every item a run lists as "not verified" is in the final report.
