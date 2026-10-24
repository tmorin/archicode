---
type: run
run: 0165
status: completed
wave: 023
profile: single-document
---

# Run 0165: dangling-reference-names-its-source

Single-document profile (as run 0164: the wave plan holds the requirements and the design). Wave 023, W-2, issue #159 (V-B), plus the reusable V-C harness.

## Scope and decisions

- **The sentence.** A relationship `destination`, a `uses` entry and a hosted application that name no element: ``` `shop.web` has a relationship towards `nowhere`, which does not exist, in `manifests/shop.yaml` at `relationships[0].destination` ``` (`uses[n]`, `applications[n]`). It keeps the words of the layered check; a layered workspace says ``in the plateau `p`, `` first and the fold `(N more elements of the plateau point at it)` as before, a workspace with no plateau says neither the plateau nor "of the plateau" (`(N more elements point at it)`).
- **One place for the words.** `workspace/DanglingReferences` (`find`, `sentences`, `about`) replaces the private code of `LayerLoader.problems`. The file of an element is `ElementIndex.sourceByReference`, filled by `ElementIndexFactory` from `Candidate.source` (a nested element has the file of its manifest). `LayerLoader` keeps its own cumulative map, because the patches rebuild the graph from JSON and lose it.
- **The key** is the place in the element's own list after the load (a Set kept in the order of the file). For a nested element the key is relative to the element, which the sentence names by reference. After a patch the place is that of the resolved list (K14: the entry `gone` of a `SET` is `applications[1]`, file of the manifest that declares the node). Accepted: no test needs more, and the issue asks for the element, the file and the key.
- **T2, no new failure.** The failure stays where it was raised: `LayerLoader` (layered load), `GetGraphQuery.collect` (`query graph`: a relationship destination only; `uses` and a hosted application stay unread there, case D05/D06), `KernelViewpointFactory.create` (the kernel's `dangling reference: x` / `dangling application reference: x`, turned into the sentence when an element of the graph holds `x`; a view that names `x` keeps the kernel's words, `TechnologyMapTest`). `ElementIndex.getElementByReference` is unchanged (views and other callers keep `unable to find the element x`). `compare.rs` messages (`diff`) are not touched: a layered workspace never reaches them, they are caught by the layer check first.
- **The editor** (`layerProblemsOf` in `standalone.html`) says the same words: the file comes from `state.roots` (nearest root at or above the reference), the key from the position among the present items. A workspace with no plateau is told without the plateau (the page said ``in the plateau `baseline`, `` for it before; every shipped test of that form has a plateau manifest, so none moved but the file and key).
- **V-B.** `src/test/javascript/viewpoint-kernel/dangling-reference-cases.json` (D01 to D10: plain relationship, second in the list, nested, declared under a parent by header, `uses`, hosted application, fold; layered baseline, layered in a plateau folder, layered nested + uses + hosted), read by `DanglingReferenceCasesTest` (runs `query graph` and `views generate` through the command line harness: one `error:` line each, exit 1, or exit 0 where it succeeded before) and `dangling-references.test.js` (the editor's `layerModelOf` problems). The 8 cases of `layer-checks-cases.json` (K01, K02, K03, K06, K09, K10, K14, K35) and N23, N47, N55 of `negative-cases.json` (with `description.mjs` and `variants/V5.json`) gained the file and the key.
- **"has no element" alignment (W-1's finding): not done, recorded.** The editor's `This view has no element.` is the voice of `viewProblem` (all its sentences are `The element "x" is not in the plateau...` style, pinned by many tests); aligning it is a change of the page's voice for every view problem, not a cheap one. Open as a finding for the wave.
- **Documents.** `src/doc/README.adoc` (the layered sentences, the generic example in "Errors, warnings and exit codes", one paragraph), `src/main/resources/guide/guide.md` and its golden file, `reflect-config.json` (`DanglingReferences`, `$Problem`, `LayerLoader$Files`; the removed `LayerLoader$Problem`), CLAUDE.md.
- **Autonomy used in lieu of gates.** No PRD/TDD/pln (profile). No question needed the author.

## V-C harness

`scripts/byte-identity.sh` with `scripts/byte-identity-exceptions.txt` (T1 exceptions of W-1 and W-2, BASE regex, tab, NEW regex). Documented in its header and in CLAUDE.md "Build & Test". Cumulative P0 change (W-1 and W-2, working tree against the tag): 20 workspaces, 330 commands compared (the seven commands, and the `--plateau` forms once per plateau of the layered Brightcart and the plateau examples), 330 identical (files written, stdout, stderr, exit code), 0 unexpected; the shipped workspaces are all valid, so no exception line fires on them. Self-check: a scratch workspace with a dangling relationship is found as a difference with an empty exceptions file and accepted with the real one (1 accepted). Edge: the `--plateau` runs are driven by the ids `plateau list` gives for the base program. Time: about 25 minutes (two JVM starts per command).

## Verification

- `./mvnw -o verify -DskipITs=false`: exit 0, 1380 unit tests (2 skipped, as before) and 39 integration tests, 0 failures (includes `DanglingReferenceCasesTest` 10 cases, `AgentWalkIT`, `GuideTest`, `NativeReflectionConfigTest`, the sweep `MistakeSweepTest`).
- `cargo test --manifest-path src/main/rust/viewpoint-kernel/Cargo.toml`: exit 0, 240 passed. `embed.sh --check`: exit 0 (the kernel is not changed; the `.wasm` is the committed one).
- `node --test "src/test/javascript/**/*.test.js"`: exit 0, 2576 tests, 0 failures (a first run had 3 failures: the generated Brightcart document and variants, regenerated with `node src/test/resources/brightcart/generate.mjs`, and a timing test of #125 that passed on its own when the machine was quiet).
- `npx prettier --check "src/**/*.java"`: exit 0.
- The editor save comparison (`save-keeps-quotes-and-comments.test.js` and its kin, byte for byte against the base page) is in the node suite and passed; the editor's writer was not touched, only `layerProblemsOf`.
- V-C: `scripts/byte-identity.sh`, exit 0, counts above.

## Gate criteria of P0 touched by this run

- "A relationship destination, a `uses` entry and a hosted application ... each give one `error:` line with the file, the declaring element and the key, for a plain and for a layered workspace, and the editor says the same sentence (V-B)": D01 to D10 (plain: relationship, second in list, nested, header parent, `uses`, hosted, fold; layered: baseline, plateau folder, nested + `uses` + hosted), a Java test and a node test of one cases file.
- "T1 holds": the V-C counts above.

## T1 exceptions (error sentences that moved)

- W-1: ``the view v has no element`` becomes ``the view v has no element: write the reference of one in `properties.element` `` (`scripts/byte-identity-exceptions.txt`).
- W-2: ``unable to find the element x`` (`query graph`), ``dangling reference: x`` and ``dangling application reference: x`` (while a view is drawn, a map names its view first), and the layered ``in the plateau `p`, `a` has a relationship towards `x`, which does not exist`` (and `uses`, `hosts`), each now with ``, in `file` at `key` `` (one rule per form in the exceptions file).
- Editor: ``in the plateau `baseline`, `` is no longer said for a workspace with no plateau; the file and the key are added to the layered sentences.

## Not verified

- The Native job (native image): `reflect-config.json` is updated for the new classes and `NativeReflectionConfigTest` passes, but no native build was run.
- CI on a runner (the draft pull request comes after W-3, T7).
- A hosted application or `uses` that a patch (`SET`) writes: the key is the place in the resolved list and the file is the manifest that declares the element (K14), which is not where the patch is; accepted and written in the scope.

## Canonical impact

Canonical text changed: CLAUDE.md (one paragraph "A dangling reference says where it is" and one Build & Test line for `scripts/byte-identity.sh`), `src/doc/README.adoc` (the layered sentences, the generic error example, one paragraph), `src/main/resources/guide/guide.md` with its golden file `src/test/resources/guide/golden.md`, and `docs/fixtures/brightcart-spec.md` (regenerated by `generate.mjs` from the changed description). No architecture-level impact: no component, contract or flow changed; the sentence is worded in one new helper (`DanglingReferences`) that replaces private code of `LayerLoader`, and failures are raised where they were.
