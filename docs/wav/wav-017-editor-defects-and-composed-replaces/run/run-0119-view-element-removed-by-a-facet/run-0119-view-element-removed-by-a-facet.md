---
type: run
run: 0119
status: completed
wave: 017
---

# Run 0119: view-element-removed-by-a-facet

Wave 017 (`editor-defects-and-composed-replaces`), item W-1 (phase P0). Focus: `views generate -i` on a view whose element a facet removes says the view and the facet in one `error:` line and writes nothing, instead of a bare `dangling reference: x` after half the folders (GitHub issue #121; decision T5 of the wave plan).

Document profile: `single-document`, as the runs of wave 016. The change is one check in one command and its tests; a prd/tdd/pln would copy the brief. The review passes are answered below.

## Scope

In: `GenerateViewsCommand` (the check, the order in which the facets and the comparison are made), a new test class `ViewRemovedByFacetTest`, one case in `ViewsAndQueriesIT`, `CLAUDE.md`.

Out: the manual (`src/doc/README.adoc`, lines 832 and 1486 still teach the old failure: W-9), the kernel (untouched), a map (an entry a facet removes is dropped without a word, #68), the editor (it does not generate views from named ids), an element the plateau lacks (skipped with a warning since #100, unchanged).

## Reproduction

On a copy of `src/test/resources/brightcart/layered` with `shared/view.saas_probe.yaml` (an `overview` of `commerce-saas`), `views generate --plateau saas -i saas_probe`, with the jar of `archicode-0.15.0`: `error: dangling reference: commerce-saas`, exit 1, `views-saas` and `views-saas-journey` already written (see Verification for the output).

## Decisions

- **D1 (T5). One `error:` line, the view is not skipped.** ``the view `saas_probe` cannot be drawn: it names `commerce-saas`, which the facet `no-externals` removes``. The author asked for the view by name; a skip with a warning would exit 0 on a request that was not served. The first facet that removes the element is named (facets in the order of the file; the plateau's own facets before those of its comparison).
- **D2. Nothing is written, so the check is before the first folder.** With `-i` the facet workspaces, and, when the plateau is compared, the base, the comparison and the union with its facets, are made before the first view is drawn, and each view named is looked at in each of them: the element must exist in the workspace the facet was applied to (the plateau drawn, or the union of the comparison) and not in the workspace of the facet. The facet workspaces made for the check are the ones then drawn (no second application of the facets).
- **D3. Without `-i` nothing changes**, not even the order in which things are made (facets are made lazily, folder by folder, as before): the failure needs a view named by id, since the built-in views are made from the elements the facet workspace still has.
- **D4. What is not this error.** A map (`viewpoint: map`), whose entries a facet removes are dropped without a word (#68); an element the plateau lacks (skipped with a warning, #100, `canBeDrawnInPlateau`, whose Javadoc now sends to the check); a viewpoint the command line does not generate (skipped with a warning). A workspace without plateaus gets the same error (same code path, the test uses `facet_example_step_4` of the manual).
- **D5. A side effect of D2, accepted.** For a run with `-i` and a comparison, the base plateau is loaded and compared before the views of the plateau are written, so a mistake of the base now fails before them (it failed after them), and the order of the warnings of such a run can differ (the facet and comparison warnings come before the skips of the views). The files, the standard output and the exit code of a successful run are the same.

## Tasks

- [x] T1. Reproduce #121 with the jar of the tag `archicode-0.15.0`.
- [x] T2. `GenerateViewsCommand`: `FacetWorkspace`, `facetWorkspaces`, `unionOf`, `requireViewsKeepTheirElement`, `renderWorkspaces` taking the facets already made.
- [x] T3. `ViewRemovedByFacetTest` (5 cases: the issue, the comparison, a view no facet touches, the same workspace without `-i`, a workspace without plateaus) and the case of `ViewsAndQueriesIT` through the packaged jar.
- [x] T4. `CLAUDE.md`.
- [x] T5. Gate commands, byte-identity against the jar of `archicode-0.15.0`, one commit.

## Review pass

- KDMLLC read: one decision each; D3 and D4 say what stays as it was.
- Open questions: none. Settled here: the first facet found is named, not the list (one line, T5); a mistake in a comparison pass is the same sentence (the facet names are the plateau's).
- C scan against the code: `canBeDrawnInPlateau` said "a view of an element it removes fails as it always did"; the Javadoc now says the mistake is told before anything is written. `requireViewsKeepTheirElement` reads `properties.element` as `canBeDrawnInPlateau` and `KernelViewpointFactory.create` do. CLAUDE.md names the method and the tests.

## Verification

- Reproduction, jar of `archicode-0.15.0` (built outside the repository from `git archive archicode-0.15.0`) against the jar of this change, on a copy of the layered Brightcart with the probe view, `views generate --plateau saas -i saas_probe`: before, `error: dangling reference: commerce-saas`, exit 1, `views-saas` and `views-saas-journey` written; after, ``error: the view `saas_probe` cannot be drawn: it names `commerce-saas`, which the facet `no-externals` removes``, exit 1, no `views*` folder.
- `./mvnw -o verify -DskipITs=false` (JDK 25, `PLANTUML_JAR`): exit 0, BUILD SUCCESS, 902 unit tests, 21 integration tests, 0 failures (the first run failed `NativeReflectionConfigTest` on the private record the first version had added to `cli`; it became a `LinkedHashMap`, no class is added, `reflect-config.json` is untouched).
- `cargo test --manifest-path src/main/rust/viewpoint-kernel/Cargo.toml`: 213 passed, 0 failed (kernel untouched); `embed.sh --check`: exit 0, the committed WebAssembly is the one the sources build.
- `node --test "src/test/javascript/**/*.test.js"`: 1903 tests, 1903 pass, 0 fail.
- `npx prettier --check "src/**/*.java"`: clean.
- Byte-identity, jar of `archicode-0.15.0` against the jar of this change: `identity119.sh` generates `views generate`, `query graph` and `diff` on the 20 workspaces of the repository that have a `workspace.yaml` (examples and fixtures), on a copy each, and compares standard output, exit code, error output (sorted) and every file written: 20 workspaces, no difference. Then `views generate -i` on views no facet removes, raw error output compared too: Brightcart `--plateau saas -i shop_overview`, two ids, `--plateau marketplace -i applications_map`, `--plateau baseline --against saas -i shop_overview`, `--plateau inhouse -i commerce_overview`, an id that names no view, and `domain_plateaus` (`-i shop-overview --plateau to-be`, `-i shop_web-overview`) and `facet_example_step_4` (`-i User-overview`): 9 runs, same exit code, same files, same error output byte for byte.

## Canonical impact

`CLAUDE.md`: the paragraph *Errors and warnings* gains the error of `views generate -i` (wave 017, run 0119, #121). No domain invariant changes. The manual teaches the old failure (`src/doc/README.adoc` lines 832 and 1486): W-9. `CLAUDE.md` still lists #121 among the limits of `[[plateau-limits]]` (the sentence "#121, #122, ..."): W-9 removes it with the others.

## Findings

- F1. For **W-9** (the manual and `CLAUDE.md`): `src/doc/README.adoc` line 832 (*A view that is about an element that a facet removes is a limit of the command line (#121)*) and line 1486 (the bullet *A view whose element a facet removes fails `views generate --view`*) teach the old failure; they must say the one `error:` line (``the view `v` cannot be drawn: it names `x`, which the facet `f` removes``), exit 1, nothing written, the view not skipped. `CLAUDE.md` lists #121 among the limits of `[[plateau-limits]]` (the sentence ending "#121, #122, #123, #124 and #125"): remove it. No test pins the manual's sentences.
- F2. A mistake of the base plateau of a `-i` run with a comparison now fails before the views of the plateau are written (D5); the warnings of such a run can come in another order. Nothing else of a successful run differs.
- F3. A custom facet with `hide-unlinked` or any other property is checked the same way (the check looks at the element in the facet's workspace, not at the kind of action).
- F4. Not verified: the Native job (no class is added; `NativeReflectionConfigTest` passes), the editor (it does not generate views from named ids), a facet that removes the element only in the union of a comparison and not in the plateau (no fixture has one; the union is checked by the same method, and the test `theComparisonIsLookedAtBeforeAnythingIsWrittenToo` covers a removal in the union with the plateau lacking the element).
- F5. Files outside `likely_paths`: `src/test/java/**` and `CLAUDE.md` are inside; none outside but this run's own document. Issues filed: none.
