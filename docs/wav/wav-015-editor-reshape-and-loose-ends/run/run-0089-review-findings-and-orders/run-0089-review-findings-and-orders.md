---
type: run
run: 0089
status: completed
wave: 015
---

# Run 0089: Review findings and orders

Wave 015 (`editor-reshape-and-loose-ends`), item W-1 (phase P0). Focus: the five findings of the review of wave 014 (#102), the order of the facets (#83) and the generated folders other commands read (#88): one load per plateau, a rule at the place the graph is built, `--plateau` before `settings.current`.

Document profile: `single-document`, as the runs of wave 014. The decisions that need a record (the rule for the inherited `replaces`, the pair of files that marks a folder of a comparison, the copy that `createUnion` works on) are in this document; there is no PRD, TDD or pln.

## Scope

In (the W-1 row of the plan, the first criterion of the P0 gate, decision T4, and the three issues):

- **#102.1** A comparison parses the manifests once for each plateau it loads and never again for the union: `createUnion` takes the target already loaded.
- **#102.2** `PlateauComparer.dropInheritedReplaces` is gone; one test, given to the kernel's graph when it is built, says which `replaces` of the target a comparison carries.
- **#102.3** `--plateau` is looked at before `settings.current`.
- **#102.4** `LayerLoader.patchMapper` is built once per load.
- **#102.5** The Javadoc of `ManifestDiscovery` names `views-to-be-vs-baseline` (the comment of the same name in the page too).
- **#83** `settings.facets.customs` (and the actions of a facet) keep the order of the file.
- **#88** A folder that holds the files a comparison writes is left out of a `/**` read, whichever command runs and whatever `--output` named it (T4).

Out: the rest of the P0 phase (W-2 to W-7), the editor's own comparison of `replaces` (see *Findings*), the manual (W-18).

## Decisions

- **D1. The rule for the inherited `replaces` is the base's, decided where the kernel's graph is built; it is not the plan's sentence.** #102.2 words it as "an element the target does not declare itself carries no `replaces` into the comparison", and the P0 gate as "dropped where the graph is built". Written that way it changes the output of two pairs the tests pin: `marketplace` against `baseline` carries the `replaces` that `inhouse` wrote (10 moved, 2 split, 1 merged: `marketplaceAgainstBaselineIsP4ButForTheMoveThatTookTwoSteps`), because the root has not got the layer `inhouse`; and `inhouse` against `marketplace` lists its candidates (`aPlateauAndTheOneItBuildsOnStillListTheirCandidates`), because `marketplace` moved `commerce.search` again and holds nothing of what `inhouse` said about it. Whether an entry is news depends on the plateau it is compared with, so the load of one plateau cannot take it out. What is kept is what the old code did: the `replaces` of the target are given to the kernel unless the base holds the element and says exactly the same (the editor does the same, `comparisonInputBetween`). What changes is where: `PlateauComparer.carries` builds the test from the two elements and `KernelGraph.of` takes it while it writes the graph, so no `ObjectNode` is edited afterwards and `dropInheritedReplaces` is gone. For all 92 commands run on the three layered workspaces the output is byte-identical to the one before (see *Verification*). *Tried and dropped:* a first version recorded in the layered load which plateau wrote each `replaces` (a new class, a field of `Workspace`) and carried an entry unless that plateau was one the base is made of and the base still held the element. The review found it did not agree with the editor in two corner cases (two sibling plateaus that declare the same reference with the same `replaces`; a base that patched the key), it needed two more classes registered for the native image, and no pair of the fixtures needed it: removed.
- **D2. A folder of a comparison is the folder that holds `gap.json` and `gap.md`.** T4 says "`gap.json` or `gap.md`". A lone `gap.json` can be an author's manifest, and leaving its folder out of the read in silence would hide manifests; both files together are what `views generate` writes (`GenerateViewsCommand.writeGap`), nothing else does. The rule is applied below the entry of a `/**` path (not to the entry folder itself), by the command line (`ManifestDiscovery.holdsComparison`) and by the editor (`holdsComparisonFiles`, from the listing of the folder it reads anyway, so a served folder costs no request), and is case D34 of `discovery-cases.json`, which both tools run. The folders of the views that `--output` named stay left out by name for `views generate`, as before; the rule above is what makes `diff`, `query` and `plateau list` (and the editor) right after it.
- **D3. `createUnion` works on a copy, not on the target.** The index adds the elements it is given to the sets of their parents, so the union of a comparison (the target and what only the baseline had) cannot be built on the target's own tree without changing it. `WorkspaceFactory.createUnion(target, base, comparison)` copies the tree of the two layers with `Parent.withElements` (the leaves are shared; indexing changes nothing in them), adds the removed elements to the copy and indexes it. The target is as it was (`UnionWorkspaceTest`), and a second union from the same target is a new tree.
- **D4. `--plateau` first.** `chosen` returns the plateau asked for (the unknown one is told by the tree, with the list of the plateaus), and looks at `settings.current` only when nothing was asked. `LayerLoaderTest.aPlateauWithAnInvalidCurrentIsToldWhateverThePlateauAskedFor` pinned the old order on purpose and is replaced by `anExplicitPlateauGetsPastACurrentThatNamesNothingAnyMore`, which pins the new one and that a stale `current` is still told when no plateau is asked.
- **D5. Facets in the order of the file.** `customs` and `actions` are read into `LinkedHashSet` (`@JsonDeserialize(as = ...)`: a `Set` field is read into a `HashSet` otherwise, whatever the default of the builder says). The hash of a `Facet` still covers an enum, which is why a hash set could not be ordered by anything stable.

## Tasks

- [x] T1. Read the plan, the three issues and the code (`WorkspaceFactory`, `LayerLoader`, `PlateauComparer`, `ManifestDiscovery`, `Settings`, the two commands); capture the output of the previous jar for every ordered pair of plateaus of three layered workspaces.
- [x] T2. #83: `Settings` (D5); `FacetOrderTest`.
- [x] T3. #102.3 and .4 and .5 (D4); `LayerLoaderTest`, `ComparisonLoadTest`.
- [x] T4. #102.1 (D3) and #102.2 (D1); `UnionWorkspaceTest`, `LayerLoaderTest`, `ComparisonLoadTest`.
- [x] T5. #88 (D2): `ManifestDiscovery`, the page, D34, `BrightcartOutputFolderTest`.
- [x] T6. CLAUDE.md where it described what the run changes.
- [x] T7. A review pass (a sub-agent), its findings answered; the gate commands on the final tree; the byte-identity of the views; one commit.

## Canonical impact

None to the architecture model (no TDD, no `CI-arc` or `CI-dom` packet; the repository declares no register for it). `CLAUDE.md` is corrected where it described the old comparer rule, the discovery rule and the load of a comparison.

## Shipped files

The run ships no file of the repository's users. The forms it changes, and the test that loads each:

| form | command line | editor |
|---|---|---|
| the folder of a comparison (`gap.json` + `gap.md`), case D34 | `ManifestDiscoveryTest` (all cases of `discovery-cases.json`), `BrightcartOutputFolderTest` (`diff`, `query graph`, `query views`, `plateau list` after `views generate -o out`; a lone `gap.json` is refused with the one `error:` line) | `discovery.test.js` |
| the facets of a workspace, in the order of the file | `FacetOrderTest` (the warnings, the settings read) | not read by the page |
| the layered Brightcart and the layered fixture | `BrightcartLayeredDiffTest`, `ComparisonLoadTest`, `LayerLoaderTest` | unchanged (`brightcart-*.test.js`) |

## Verification

Run on the final tree, by me (JDK 25, `PLANTUML_JAR` set to `plantuml-1.2024.7.jar`, so no test is skipped):

| Command | Result |
|---|---|
| `./mvnw -o verify` | BUILD SUCCESS, 625 tests, 0 failures, 0 errors, 0 skipped (the run adds `FacetOrderTest` 3, `ComparisonLoadTest` 4, two tests in `BrightcartOutputFolderTest`, three in `LayerLoaderTest` (one replaces one), one in `ManifestDiscoveryTest` and the two cases D34 and D35) |
| `cargo test --manifest-path src/main/rust/viewpoint-kernel/Cargo.toml` | 190 passed (no Rust change) |
| `src/main/rust/viewpoint-kernel/embed.sh --check` | ok, 715537 bytes |
| `node --test "src/test/javascript/**/*.test.js"` | 1462 tests, 1462 pass (D34, D35 and the test of `holdsComparisonFiles` are new) |
| `npx prettier --check "src/**/*.java"` | clean |

The first `./mvnw -o verify` of the run failed on `NativeReflectionConfigTest` (two classes of the first version of D1 were not registered for reflection); the second and the third (after the last edit, on the tree that is committed) passed.

*Fail before, pass after.* The four causes put back one at a time in the main code (`Settings` with a `HashSet`, `chosen` with `settings.current` first, the discovery without the pair of files, `GenerateViewsCommand` with a third load), the tests kept: 9 fail (`FacetOrderTest` 3, `ComparisonLoadTest` 2, `BrightcartOutputFolderTest` 1, `ManifestDiscoveryTest` cases D34 and D35, `LayerLoaderTest.anExplicitPlateauGetsPastACurrentThatNamesNothingAnyMore` 1), all with the sentence the issue describes (`gap.json is not valid`, `expected: <2> but was: <3>` parses, `settings.current names the plateau ...`, the warnings in the order `delta, x-ray, bravo, zulu, ...`); the main code was restored from copies and the final gate ran after. The tests that pin what must not change (the lone `gap.json` is refused, `aComparisonLeavesOutTheReplacesTheBaseAlreadySays...`, `theHistoryOfAnOlderLayerIs...`, the numbers of `BrightcartLayeredDiffTest`) pass on both, as they should.

*Same output, every pair.* `pairs89.py` (scratchpad): the jar of `HEAD` (before the run) against the jar of the tree, on `src/test/resources/brightcart/layered` (baseline, inhouse, marketplace, saas), `src/doc/examples/domain_plateaus` and `src/test/resources/plateau-comparison`, every ordered pair of plateaus (the ids the `plateau list` gives, plus the header word it also lists, which gives the same error on both), `diff -f json` and `views generate --plateau <t> --against <a>`, exit code, standard output, standard error and a SHA-256 of every file of the copy: 92 commands, 0 differences.

*Byte-identity against `25471b3`* (the rule of the repository, a workspace without plateaus). `identity85.py` (scratchpad): the jar built from `git archive 25471b3` outside the repository against the jar of the tree, on the 11 tracked `workspace.yaml` without plateau (`src/doc/examples/domain_application`, `domain_manifest_folders`, `domain_technology`, `domain_viewpoint_views`, `domain_workspace`, `facet_example_step_1` to `_4`, `src/test/resources/hyphen-ids`, `src/test/resources/viewpoint-kernel/workspace`), three commands each on a fresh copy for each jar (`views generate`, `query graph`, `diff`): 33 commands, 19 identical (821 files compared), 14 differ, the same 14 as at the end of run 0085 and all known: the 11 `diff` (the reworded error of run 0083: exit code, files and standard output equal), `domain_manifest_folders views generate` and `query graph` (the old jar cannot read `manifests/**`), and `viewpoint-kernel/workspace views generate` (the order of the deprecated-facet warnings, which is what #83 fixes: files and standard output equal, the warnings now in the order of the file). The views of every workspace the old jar can read are the same bytes.

## Review pass, answered

A `general-purpose` sub-agent at the standard tier, read-only, on the whole change (KDMLLC and a defect hunt). No S0 or S1; six S2 and eight S3.

- S2 the editor and the command line disagree on which `replaces` a comparison carries; S2 `carried` can drop an entry the base does not say (the base patched the key); S3 the two `plateausOf`, the `base` passed twice, the nullable mapper: all three came from the first version of D1, which is removed (D1, *Tried and dropped*). The editor and the command line now apply the same rule; the stale comment that named `dropInheritedReplaces` (the page and `brightcart-kernel.test.js`) names `PlateauComparer.carries`.
- S2 the manual still documents #88 as a limit (`src/doc/README.adoc`, the passages about `--output` near lines 165 and 1336): true, and left to W-18 (the manual is rewritten there); recorded in *Findings*.
- S2 nothing pins the order of the actions of a facet: `theActionsOfAFacetAreReadIntoTheOrderOfTheFile` (30 actions, fails with a `HashSet`).
- S2 the tests of the replaces pass on the old code too: yes, they pin what must not change; the fail-before list above says which tests the run adds that do not pass on it. A test that goes through the comparer on the layered fixture (`LayerLoaderTest.aComparisonLeavesOutTheReplacesTheBaseAlreadySays...`: the cart is `changed` against `inhouse` with no warning, `moved` against `baseline`; `sellers`, written by `marketplace`, `moved`) is added.
- S3 a Javadoc of `UnionWorkspaceTest` ("read afresh"): fixed. S3 the entry folder is read whatever it holds, untested: case D35. S3 the pair of names is written three times: `ManifestDiscoveryTest` ties the Java constant to the formats `views generate` writes, `discovery.test.js` tests `holdsComparisonFiles` and D34 ties the page to the Java rule. S3 `@SneakyThrows` on `createUnion`: removed. S3 a nested parent copy untested: `LayerLoaderTest.theUnionOfAComparisonIsBuiltOnACopyAndTheTargetIsAsItWas` (`shop.cache` under `shop`, two levels below the root). S3 `settings.current` is fatal in the editor and passed by `--plateau` on the command line: the editor has no `--plateau`; nothing to change, and the manual (W-18) says it in the line about `--plateau`.

## Findings

- F1 (for the orchestrator, the plan). The sentence of #102.2 and of the first P0 criterion ("the inherited `replaces` is dropped where the graph is built") cannot be read literally: whether an entry is news depends on the plateau compared with (D1). The criterion that can be checked holds: `dropInheritedReplaces` is gone from `PlateauComparer`, the numbers of every pair of `BrightcartLayeredDiffTest` are unchanged, and so is the output of 92 commands on three layered workspaces.
- F2 (the plan). T4 says a folder that holds "the `gap.json` or `gap.md`" is left out; the rule is **both** (D2), so that a lone `gap.json` that is a manifest is not skipped in silence. Case D34 says it in both tools.
- F3 (for W-18). The manual says in `src/doc/README.adoc` that the commands other than `views generate` do not know `--output` and read its folders as manifests, and lists #88 in `[[plateau-limits]]`; both are false now for the folder of a comparison (the folders of the plateaus' own views, `out-saas`, hold no `gap.json` and were never a problem). The order of the warnings of the facets is the order of the file; a facet's actions are applied in the order of the file too.
- F4. The order in which a workspace's facets are written, and so the order of their warnings and of the creation of their folders, was a function of the JVM and is now the file's. A workspace without plateaus that has several facets keeps the same files and standard output (checked on `viewpoint-kernel/workspace`); only the order of the warnings on the error output differs from `25471b3`.
- F5. Files outside the `likely_paths`: `src/main/resources/editor-webapp/standalone.html` (`holdsComparisonFiles` and its call in `readManifestFolder`; two comments), `src/test/javascript/viewpoint-kernel/discovery-cases.json` (D34, D35), `src/test/javascript/viewpoint-kernel/discovery.test.js` (one test), `src/test/javascript/viewpoint-kernel/brightcart-kernel.test.js` (one comment), `CLAUDE.md` (three sentences), and this document. The two wave files were not written.
- No issue was filed: nothing out of scope was found that the issues of the wave do not already hold.

## Not verified

- The editor reading a folder with a `gap.json` and a `gap.md` in a browser, and over `archicode editor serve` (the harness and the in-memory folders are tested; the served handle lists the folder once, as before).
- A Windows file system (`Files.isRegularFile` on a link to a file is followed as on Linux; not run there).
- The native image (the build of the reflection configuration is checked by `NativeReflectionConfigTest`, which passes; the image itself is CI's).
- `tooling/docs/check-backlog.py` and the `docs/bkg/` close-out sweep of `complete-run`: neither exists in this repository.
