---
type: run
run: 0095
status: completed
wave: 015
---

# Run 0095: Quiet references in one call

Wave 015 (`editor-reshape-and-loose-ends`), item W-7 (phase P0). Focus: the first render with a facet does not block the page: one kernel answer says which elements have nothing to draw (#81). #37 (the keys of the caches) was done by wave 014 run 0073; this run keeps its cache, and the version counter it reads.

Document profile: `single-document`, as runs 0089 to 0094: the scope is settled by the plan (the W-7 row, the seventh criterion of P0) and by the issue; there is no PRD, TDD or pln. The review passes (a KDMLLC read of this document, the open-question resolution, the C scan against the code, a read-only review of the working tree by a sub-agent) are answered below.

## Scope

In:

- A kernel entry that answers, for a layer and a viewpoint, which of the given elements have nothing to draw, in one call.
- `quietReferencesThroughFacet` uses it; the answer stays cached on the version counter (`modelsChanged()` / `modelVersion`) and the facet (the key of run 0073 is not touched).
- The README of the kernel, the header of `lib.rs`, `CLAUDE.md` (the count and the list of entry points) say it; `embed.sh` re-embeds the wasm.
- Tests: the answer is the old one (an oracle of one `compute` per element) on the layered Brightcart and on facets that remove elements; the kernel calls are counted (they do not grow with the elements); the first answer on the 82-element `marketplace` is under 100 ms.

Out: the manual (W-18; what it must say is in Findings), slices between frames and dimming as answers come (the other directions of #81: not needed once the miss costs 15 ms), `ViewpointKernel.java` (the command line draws views, it does not grey a tree).

## Decisions

- **D1. A new entry point, `quiet`, and not an extension of `compute`.** `compute` answers with one view. An extension (`focals: [...]`, a list of views or of verdicts back) would change the shape of its answer for every host, and would build for nothing what `quiet` does not need (`mark_expandable`, which builds the view again once per box that could open; the stereotypes; the serialisation of items and links). A new entry is additive: nothing the others take or give changes. It costs 28 KB of wasm (see Verification) and a seventh function of the C ABI.
- **D2. The input is the input of `compute` without `focal`, plus `focals: [{reference, viewpoint?}]`; the answer is `{version, quiet: [reference]}` in the order asked, or `{error}`.** The viewpoint per focal is needed because the page draws a leaf in the overview and a parent in the viewpoint of the tab; with it, one input per layer is enough, so the number of calls is at most two (application, technology) whatever the number of elements (the old page built one input per layer and viewpoint, and called `compute` per element). The map has no focal element and is refused (as a viewpoint of the input and of a focal).
- **D3. The rule is the old rule, not a new one.** An element is quiet when its view has no link that is not `secondary`; a view that cannot be built (the facet removed the element or what the view needs: `dangling reference`, `unknown focal element`) is quiet when the input has a `facet`, and not quiet otherwise (the element has no view, which is not an empty one). An input that cannot be read, a `change` that is not a word, a facet that fails and a missing `focals` are the one `{error}` for all the elements; the page reads an error through a facet as "every element is quiet", as it did when each `compute` said it. The view is built by the same `build` as `compute`'s, after the same `prepare` (checks of the `change`s and the facet, now one function shared by both), so the rule cannot drift.
- **D4. The contract stays at 5.** An additive entry point: a host written for 5 cannot be tripped by it, the answer says 5, and the number is the signal for a breaking change (`on_one_chain` was one; this is not). The plan (T: "the contract of the kernel") allowed it. The README and the header of `lib.rs` say so. The editor's wrapper (`kernel.quiet`) is the only host; the CLI's `ViewpointKernel` does not expose it (no use).
- **D5. The cache is untouched.** `treeQuietCache` keeps its key (`viewpointKey|modelsKey(...)`) and its net on the two indexes; `quietReferencesThroughFacet` still looks it up before any kernel input is built (a test of run 0073 reads the source for that). The one change is what a miss does: for each layer one `buildKernelInput('overview', first, {layer, facet})`, `focal` deleted, `focals` set, one `kernel.quiet`.
- **D6. The warnings of the facet are not repeated** by `quiet` (the page ignored those of the per-element computes; `compute` says them when the diagram is drawn).

## Tasks

- [x] T1. Read the plan row, #81 and #37, `lib.rs` (`compute_json`, `build`, `check_changes`), `facet::apply_to_input`, the page's `quietReferencesThroughFacet`, `markTreeThroughFacet`, `buildKernelInput`, and the tests that call the function.
- [x] T2. Kernel: `prepare` (shared by `compute_json` and `quiet_json`), `quiet_json`, the export, the header; `quiet_tests.rs` (ten tests, oracle = one `compute` per element).
- [x] T3. The README of the kernel; `embed.sh` and `embed.sh --check`.
- [x] T4. Page: `kernel.quiet` in the wrapper, `quietReferencesThroughFacet` uses it.
- [x] T5. Tests: `quiet-references.test.js` (equivalence on the layered Brightcart, whole-layer and refused facets, the calls counted, the time, the source), `editor-odds-and-ends.test.js` (the counter `quiets` for the tests of run 0073 that counted `compute`).
- [x] T6. `CLAUDE.md` (six entry points), the review pass, the gate commands, byte-identity, one commit.

## Canonical impact

None to the architecture model (no TDD, no `CI-arc` or `CI-dom` packet; the repository declares no register for it). `CLAUDE.md` is corrected where it counts and lists the entry points of the kernel.

## Shipped files

The run ships no example or fixture for the users. The tests read the fixture that exists (`src/test/resources/brightcart/layered`, loaded by the command line in `BrightcartLayeredDiffTest` and others and by the editor in `brightcart-layered.test.js` and now `quiet-references.test.js`) and the invented ferry company of `editor-odds-and-ends.test.js`.

## Verification

Run on the final tree, by me (JDK 25, `PLANTUML_JAR` set to `plantuml-1.2024.7.jar`, so no test is skipped):

| Command | Result |
|---|---|
| `./mvnw -o verify` | BUILD SUCCESS, 807 tests, 0 failures, 0 errors, 0 skipped (no Java test added: the CLI does not expose `quiet`; integration tests are skipped by default, `skipITs=true`) |
| `cargo test --manifest-path src/main/rust/viewpoint-kernel/Cargo.toml` | 206 passed (196 before; ten new tests in `quiet_tests.rs`) |
| `src/main/rust/viewpoint-kernel/embed.sh --check` | ok, 747933 bytes (719540 before: +28393) |
| `node --test "src/test/javascript/**/*.test.js"` | 1606 tests, 1606 pass (1598 before; `quiet-references.test.js` adds 8) |
| `npx prettier --check "src/**/*.java"` | clean (`--write` run before: nothing changed) |

*Time, measured by the node harness with the real kernel* on the layered Brightcart, `marketplace` (82 elements), comparison on `inhouse`, facet `journey`: the first answer took about 150-185 ms with one `compute` per element (the issue measured 420 ms on its machine) and 15-37 ms with `quiet` (the cold call is the slowest); the test takes the best of three fresh pages and asserts under 100 ms (a first version asserted one run and measured 108 ms once, while Maven and another test run were using the machine: the reviewer found it). The kernel calls: at most one `quiet` per layer (two), no `compute`, the same count on `baseline`, `inhouse` and `marketplace`; a second render, with the same model, facet and tab, makes none.

*Fail before, pass after.* With the page's reading of an error through a facet inverted (`if (!facet)`), `quiet-references.test.js` fails twice (the oracle test and the test of a facet the kernel refuses); a first version of that test used a facet that never failed (the index in the list was wrong) and passed under the mutation: it was the mutation that showed it. The equivalence test also checks it is not trivial (most questions have both quiet and not quiet elements).

*Byte-identity against `25471b3`* (a workspace without plateaus must give the same views). `identity85.py` (scratchpad, the jar built from `git archive 25471b3` outside the repository, compared with the jar of the tree), on the 11 tracked `workspace.yaml` without plateau (`src/doc/examples/domain_application`, `domain_manifest_folders`, `domain_technology`, `domain_viewpoint_views`, `domain_workspace`, `facet_example_step_1` to `_4`, `src/test/resources/hyphen-ids`, `src/test/resources/viewpoint-kernel/workspace`), three commands each on a fresh copy for each jar (`views generate`, `query graph`, `diff`): 33 commands, 19 identical (821 files compared), 14 differ, the same 14 as at the end of run 0094 and all known (the 11 `diff` rewordings, `domain_manifest_folders views generate` and `query graph`, which the old jar cannot read, the order of the deprecated-facet warnings of `viewpoint-kernel/workspace views generate`).

*The layered workspaces, against the jar of `HEAD` before the run* (`7ec999b`, built with `git archive HEAD` outside the repository). `pairs89.py` (scratchpad): `diff -f json --plateau <p> --against <q>` and `views generate --plateau <p> --against <q>` for every ordered pair of plateau ids of `src/test/resources/brightcart/layered` (baseline, inhouse, marketplace, saas), `src/doc/examples/domain_plateaus` (baseline, to-be) and `src/test/resources/plateau-comparison`, plus the pairs the script makes with the word `PLATEAU` (they fail the same way on both jars): 92 runs, each with its exit code, its standard and error output and the sha256 of every file of the folder afterwards; the two jars give identical results for all 92.

## Review pass, answered

A `general-purpose` sub-agent at the standard tier, read-only, on the working tree: no S0, no S1, no S2 on the behaviour. It checked that the rule is the old one (the viewpoint per focal against `buildKernelInput`, the error through a facet, a layer without elements, a comparison, `hide_unlinked`, the strip of `contains_changes`), that nothing leaks between focals (`build` takes `&Input`; only `focal` and `viewpoint` change and both are set each time), and that `prepare` is a pure move of the lines of `compute_json`. Four findings, all taken: (1) the timing test could fail on a busy machine (S2-border): best of three fresh pages; (2) the test of the strip of `contains_changes` could not fail on a regression of `prepare` (S3): it now asserts that the facet leaves some elements not quiet; (3) the README said `quiet` does not need `only_changes`, which `build` applies (S3): removed from that sentence; (4) no Rust case for a facet that asks for `hide_unlinked` (S3): `a_facet_that_hides_the_unlinked_boxes_is_asked_about_as_it_is_drawn`, two facets on a technology layer.

The KDMLLC read of this document: no duplication between the README, the header of `lib.rs` and this document beyond one sentence each; every point of Scope has a Decision or a Task, and the Decisions are answered by a test or a command of the table above.

The C scan against the code: the plan row says "a kernel entry (or an extension of `compute`)": an entry (D1). "The answer stays cached on the version counter and the facet": `treeQuietCache` and its key are not touched, and `quiet-references.test.js` and run 0073's tests (`editor-odds-and-ends.test.js`, which count the calls to `quiet` now where they counted `compute`) pin the cache. The seventh criterion of P0 ("a fixed number of kernel calls that does not grow with the elements (a test counts them) and takes under 100 ms"): holds. The plan says CLAUDE.md lists the entry points: it said five, now six.

## Findings

- F1 (wave, for W-18: what the manual must now say). Nothing the author sees changes: the same elements are greyed in the tree of the Elements and Map pages when a facet is picked, just sooner. If the manual describes the kernel, it has six entry points (`compute`, `apply_facet`, `compare`, `apply_patches`, `states`, `quiet`); the user manual does not talk about it.
- F2 (wave). Kernel contract: stays 5. One additive entry point, `quiet`, input of `compute` without `focal` plus `focals: [{reference, viewpoint?}]`, answer `{version, quiet: [reference]}`. The wasm is 747933 bytes (719540 at the end of run 0094, +28393: `serde_json::Value` and `from_value` are monomorphised for `Input` in the new path). A later run in the kernel must start from this wasm and run `embed.sh` again.
- F3. Files outside the `likely_paths`: `CLAUDE.md` (the count and the list of the entry points) and this document. Everything else is in the paths (`src/main/rust/viewpoint-kernel/**`, the wasm, `standalone.html`, `src/test/javascript/viewpoint-kernel/**`).
- F4. The commit closes #81 (`Fixes #81`). #37 was closed by run 0073; this run adds nothing to it.
- F5. A limit that stays, not filed (not a defect): `quiet` builds each element's view as `compute` does, one `build` per element, and every `build` reads the whole input, so the cost still grows faster than the elements (not measured beyond 82 elements: 15 ms there); a workspace of several thousand elements may cost seconds again. Nobody has such a workspace; the directions of #81 that are left (slices between frames, dimming the row under the pointer) remain available if one appears.

## Not verified

- The editor on a real screen: the page was run in the Node sandbox of the repository, not in a browser (the tree's dimming is covered by the tests that call `quietReferencesThroughFacet` and by `markTreeThroughFacet`'s untouched code). The 100 ms is a node-harness figure, as the plan says; a browser's WebAssembly (and the page around the call) was not timed.
- The native image: no class was added to `manifest` or `cli`; the CLI does not call the new export.
- `tooling/docs/check-backlog.py` and the `docs/bkg/` close-out sweep of `complete-run`: neither exists in this repository.
