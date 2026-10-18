---
type: run
run: 0085
status: completed
wave: 014
---

# Run 0085: Variants on layers

Wave 014 (`layered-plateaus`), item W-11 (phase P4). Focus: a wrong layered project gives one clear line, and the document says which variants a tool runs.

Document profile: `single-document`, as runs 0075 to 0084. The decisions that need a record (the one-cause rule for the elements under a missing parent, the elements that point at one missing reference and the files a manifest error leaves behind; the two warnings of V9 and V10; the generator that writes the "Run today" column; what was left of #86 to #89) are in this document; there is no PRD, TDD or pln.

## Scope

In (the W-11 row of the plan, the first criterion of the P4 gate, and the brief):

- V1, V3 and V6 to V10 of the Brightcart document run on the layered tools, from the command line and from the editor harness, each by a case of `src/test/resources/brightcart/negative-cases.json` that `BrightcartNegativeCasesTest` (Java) and `brightcart-negative.test.js` (node) both read. V2, V4 and V5 are run too (cases N53, N46, N47), since they cost nothing once the machinery was there; V11 was run already (case N43, and the shared cases of `plateau-model-cases.json`). V12 to V14 and M1 to M3 wait for `plateau merge` (#65) and say so.
- The cases of `negative-cases.json` that spoke of the old mechanism: W-9 had moved the file to `layered/` and removed those cases (N1 to N6, N11 to N15; the file keeps the numbers it had). What was left was read case by case; the ones that remain are kept (none speaks of `settings.plateaus` but N41, which is the removed key itself); the comment of the file is rewritten for the layers.
- A case that gave several lines for one error, or a wrong silence, is fixed when it is a few lines, with a test that fails before and passes after; filed otherwise (the list is in *Cases fixed and filed*).
- The "Run today" column of the document says which variants a tool runs, and is written by the generator from one field (`runToday`) of `description.mjs`, which also writes `variants/Vn.json`.
- Issues #86 to #89 looked at: #88 fixed for `views generate -o` twice (a few lines, tests that failed before), not for the other commands run after it; #87, #86 and #89 left, with the reason.

Out: the A1 warning (an open decision of the author; V5's output carries it, unchanged), the `Settings.Plateau` DTO, the kernel, the manual (W-13), `plateau merge`.

## Decisions

Given by the wave plan: D1 to D5, A1 to A9; none failed. Decided here (none contradicts the plan; each is pinned by a test):

- **D50. One cause is one line, in both tools.** Two kinds of layer mistake gave one line per consequence. (a) The elements a layer declares under a parent the graph does not have (V3: `marketplace` overrides `saas`, so the plateau that declares `commerce` and `prod.cloud` is not in its chain; four lines, one per element). (b) The elements that point at one reference that is not there (V5: `commerce.cart` is declared by a manifest whose plateau was misspelled; four lines, one per relationship or node that names it). Both are now one sentence: the first element (by reference) and how many others there are, `... which does not exist (3 more elements of the plateau are declared under a parent that does not exist)` and `... (3 more elements of the plateau point at it)`; the singular reads `1 more element of the plateau is declared ...` and `points at it` (N54, N55). The rule for (a) is one sentence for the layer, whatever the parents are called: the first told is a symptom of a missing layer, and a second wrong parent shows once the first is repaired (the cost of one line); for (b) one sentence for each missing reference, so two typos are two lines. `LayerLoader.foldParentProblems` and `problems`, `foldParentProblems` and `layerProblemsOf` in the page. The views and stories that name something that is not there keep one line each: they are not consequences of one another.
- **D51. A refused manifest is the sentence, in both tools (cases N21, N22, N26, N28).** The command line reads every manifest before it loads a layer, and stops at the first it refuses: one `error:` line. The editor, which draws what it can so the mistake can be repaired in it, listed that file's error and, as `layerProblems`, the five "declared under `commerce`, which does not exist" that the lost elements leave behind. The choice was to make both say the same set, and the same set is the command line's: when the plateau drawn has layer problems and a manifest is refused, the editor's `layerProblems` is `` `<file>` is not valid: <the sentence of the file> `` (the first refused file, in the order of the files, which is the command line's order: both sort by code point), in place of the sentences of the layer. The plateau is still drawn and flagged, and the file still has its badge. A plateau with no layer problem and a refused manifest is unchanged (the file's badge, no band message: N10, N16 to N20, N24, N27, N29 to N40 pin it); making the band refuse every plateau for every refused file would change the editor beyond this run. Pinned by the four cases and by the comparison of every editor text with the command line's lines, which no longer skips `layerProblems`.
- **D52. V9 and V10 warn (the document's rule, the tools said nothing).** V9, two `SET` of the same field of the same target in one plateau: `the plateau `marketplace` sets `description` of `commerce.catalog` in patches 1 and 14: the last one wins` (a `SET` with a `where` is a different one for each destination and label; a patch with a `json-path` is not compared: what it selects is not known before the patches are applied). V10, the `horizon` of a plateau earlier than the one of the plateau it overrides: `the horizon `2026-Q1` of the plateau `marketplace` is earlier than the horizon `2026-Q4` of the plateau it overrides, `inhouse``. A horizon is a free label that no tool interprets (the plan's first open question); the band orders siblings by it when it reads as a date, and the warning uses the same reading as a period (`2026`, `2026-10`, `2026-10-18`, `2026-Q4`, `2026Q4`, `2026-H2`): two that read as periods are compared, and one is earlier when its whole period ends before the period above begins, so `2026` under `2026-Q4` is not (the first run compared first days and said it was; a review caught it), equal ones are not, and any other label, an impossible day or a two-digit year is not compared. The Java reading (`PlateauTree.horizonPeriod`) and the page's (`horizonPeriod`) are kept alike and pinned by the shared cases M56, M57 and M61. Both warnings are those of the tree, told when the manifests are read (`PlateauTree.warningsOf`, `buildPlateauTree`), so every command prints them and the editor lists them in the note of the Elements and Files pages (read in the built-in browser on a served copy with both mistakes). Pinned by the shared cases M56 to M61 and by N51 and N52.
- **D53. The generator writes the "Run today" column.** `description.mjs` has a `runToday` text for each of V1 to V14; `generate.mjs` writes it as the `status` of `variants/Vn.json` and as the last cell of the row Vn of the table of section 11 of `docs/fixtures/brightcart-spec.md` (the only part of the table it writes; it finds the document four folders above its own, and a copy elsewhere, such as the one the node test makes, does not touch the real one). It fails if a variant has no `runToday` or the document has not exactly one row for it. The node test runs it in a copy that has a stale document and requires the committed bytes, runs it on a description without `runToday` and on a document without the row of V14 (exit 1, the document untouched), and requires that the document, `variants/` and the cases agree.
- **D54. `--output` and the manifests (#88).** `views generate` hands the discovery the beginning `--output` names beside `settings.views.path` (a relative one as written, an absolute one relativized to the workspace folder when it is below it), so the folders it wrote (`out-saas`, `out-saas-vs-baseline`) are left out of a `/**` read as the folders of the settings are. The other commands know no `--output`: after a `views generate -o out`, `diff` or `query graph` on a workspace whose `manifests.paths` has `/**` still reads `out-*` as manifests, so #88 stays open for that (a comment says so). A folder that has the name of the output (a real manifests folder called `out`) is left out as well, as `views` is: `-o` names a folder the tools own.
- **D55. The cases keep the numbers they had; new ones follow.** N44 (V1), N45 (V3), N46 (V4), N47 (V5, on `inhous` and on `inhouse`), N48 (V6), N49 (V7), N50 (V8, on `saas`, `inhouse` and `marketplace`), N51 (V9), N52 (V10), N53 (V2 as the document words it: `marketplace` declares what its ancestor `inhouse` declares), N54 and N55 (the singular of D50). N7 stays as the same reference twice in one plateau and is no longer tagged V2.

## Cases fixed and filed

Fixed (each with a test that fails on the code of `HEAD` and passes after; the lists of what failed are in *Verification*):

| Case | Before | After |
|---|---|---|
| V3 (N45, N54) | four `error:` lines, one per element | one line, the first element and a count |
| V5 (N47, N55) | four `error:` lines, one per relationship or node that names `commerce.cart` | one line and a count (after the two warnings of A1 and of the header) |
| N21, N22, N26, N28 | editor: five "declared under" lines beside the file's error; command line: one | both: the file's sentence |
| V9 (N51) | no warning | one warning, exit 0 |
| V10 (N52) | no warning | one warning, exit 0 |
| #88, the repeated `views generate -o out` | the second run failed on `out-saas-vs-baseline/gap.json is not valid ...` | exit 0, no error output |

Run and already right (no change; the pins are new): V1 (N44), V6 (N48), V7 (N49), V8 (N50), where the kernel's sentence names the plateau, the rank of the patch and the selector and the editor says the same one; V2 (N53), V4 (N46), where the model's sentence names the plateau and the reference (the files too, for V2).

V5 and the document: the document expects "the same error in the implicit plateau `inhous`"; `diff --plateau inhous` gives it (`in the plateau `inhous`, `commerce.cart` is declared under `commerce`, which does not exist`), and `diff --plateau inhouse`, which lacks the cart, gives the dangling relationship instead; N47 pins both, in the command line and in the editor.

Filed or left:

- #87 (an element under a parent that cannot hold its kind loads, unless its layer has patches) is left. The direction in the issue is a check of the nesting when the element is added, for every path; it needs the rule of which kind a parent holds written once and read by both tools (the page has its own tables), and the sentence for it. That is a model decision and two implementations, not a few lines. A comment on the issue says so.
- #88 stays open for the commands other than `views generate` (D54); a comment says so.
- #86 (views and stories are not repaired when a descendant plateau removes what they name) and #89 (the composition of `replaces`) are rule decisions of the wave (L9, L10); not touched.
- No new issue: what this run found is fixed or sits in the issues above.

## Canonical impact

None to the architecture model (no TDD, no `CI-arc` or `CI-dom` packet; the repository declares no register for it). `docs/fixtures/brightcart-spec.md` and `src/test/resources/brightcart/README.md` carry the load for the next reader; the manual's text about V9 and V10 is for W-13.

## Shipped files

CLAUDE.md asks the plan to name the test that loads each shipped form. This run ships no file of the repository's users: it changes cases, the generator, the fixture's document and the code that reads them. The forms it changes, and the test that loads each:

| form | command line | editor |
|---|---|---|
| the cases of `negative-cases.json` (V1 to V11 and the others) | `BrightcartNegativeCasesTest` (the `error:` lines, exit code, no stack trace, no Java class) | `brightcart-negative.test.js` (the same file; each editor text is a line of the command line up to the three differences) |
| the shared plateau cases M56 to M60 | `PlateauModelTest` | `plateau-model.test.js` |
| `variants/Vn.json` and the table of section 11 | `brightcart-layered.test.js` runs the generator in a copy and compares them byte for byte; it requires the document, `variants/` and the cases to agree | the same |
| every shipped workspace | `ShippedFilesTest` (`exceptions.json` is empty) | `shipped-files.test.js`, `brightcart-layered.test.js` |

## Tasks

- [x] T1. Read the plan, the document, the cases, the tests; run V1, V3 and V6 to V10 by hand on a copy of `layered/` with the jar of `HEAD`.
- [x] T2. V3 and V5 give one line (D50); the editor mirrors; N45 and N47.
- [x] T3. A refused manifest is the sentence in the editor (D51); N21, N22, N26, N28.
- [x] T4. V9 and V10 warn (D52); M56 to M60, N51, N52.
- [x] T5. Cases for V1, V2, V4, V6, V7, V8 (N44, N53, N46, N48, N49, N50); `brightcart-negative.test.js` reads the warnings and the redeclared references of the tree (`treeWarnings`, `redeclared`), compares every editor text with the command line's lines, and the `all` operation of the cases.
- [x] T6. `runToday`, the generator, the document, the README of the fixture (D53).
- [x] T7. #88 (D54), with `BrightcartOutputFolderTest`; #87 looked at and left.
- [x] T8. A review pass (a sub-agent), its findings answered; the gate commands on the final tree, the byte-identity of the views, one commit.

## Verification

Run on the final tree, by me (JDK 25, `PLANTUML_JAR` set to `plantuml-1.2024.7.jar`, so no test is skipped):

| Command | Result |
|---|---|
| `./mvnw -o verify` | BUILD SUCCESS, 596 tests, 0 failures, 0 errors, 0 skipped (574 at the end of run 0084, 592 before the review of this run) |
| `cargo test --manifest-path src/main/rust/viewpoint-kernel/Cargo.toml` | 182 passed (no Rust change) |
| `src/main/rust/viewpoint-kernel/embed.sh --check` | ok, 712646 bytes |
| `node --test "src/test/javascript/**/*.test.js"` | 1443 tests, 1443 pass (1423 at the end of run 0084) |
| `npx prettier --check "src/**/*.java"` | clean |

*Fail before, pass after.* The main Java code of `HEAD` swapped in (`git stash push -- src/main/java`, test files kept, the one test that uses the new `discover` overload set aside because it does not compile there): 12 tests fail in `BrightcartNegativeCasesTest` (N45, N47, N51, N52, N54, N55), `BrightcartOutputFolderTest` (the two that run `views generate -o` twice) and `PlateauModelTest` (M56, M58, M60, M61), 0 after. The page of `HEAD` swapped in: 14 tests fail in `brightcart-negative.test.js` and `plateau-model.test.js` (N21, N22, N26, N28, N45, N47, N51, N52, N54, N55, M56, M58, M60, M61), 0 after. The tests that guard what must not warn (M57, M59) and the pins of V1, V2, V4, V6, V7 and V8 pass on both, as they pin behaviour that was right. Both swaps were restored and the tree checked.

*Byte-identity against `25471b3`.* `identity85.py` (scratchpad): the jar built from `git archive 25471b3` outside the repository (`base25`) against the jar of the tree, on the 11 tracked `workspace.yaml` without plateau (`src/doc/examples/domain_application`, `domain_manifest_folders`, `domain_technology`, `domain_viewpoint_views`, `domain_workspace`, `facet_example_step_1` to `_4`, `src/test/resources/hyphen-ids`, `src/test/resources/viewpoint-kernel/workspace`), three commands each on a fresh copy for each jar (`views generate`, `query graph`, `diff`), exit code, standard output, standard error and a SHA-256 of every file of the copy: 33 commands, 19 identical (821 files compared); 14 differ, all known: the 11 `diff` (the reworded error of run 0083: exit code, files and standard output equal), `domain_manifest_folders views generate` and `query graph` (the old jar cannot read `manifests/**`), and `viewpoint-kernel/workspace views generate` (the order of the deprecated-facet warnings, #83; files and standard output equal). The views and the graph of every workspace the old jar can read are the same bytes.

*The page, in a browser.* A copy of `layered/` with a horizon earlier than the parent's and a second `SET` of one field was served by `archicode editor serve` and read in the built-in browser: the Timeline page shows the horizons and the counts, and the Elements page lists the two warnings of D52. No screenshot was taken, so the layout of the note was not seen.

## Review passes, answered

- **KDMLLC, C scan and defect hunt (a `general-purpose` sub-agent at the standard tier, read-only, on the whole change; it ran node tests and two scripts of its own against the harness).** No S0 or S1. Three S2, six S3, all answered:
  - S2 #88 is only half fixed (the other commands pass no output): true; the run document and the comment on #88 now say "fixed for `views generate`", the issue stays open (D54).
  - S2 V5 is not run on the plateau the document names: N47 now runs `diff --plateau inhous` (the document's error) and `diff --plateau inhouse`, in both tools.
  - S2 D51 overclaimed (a plateau without layer problems is not changed): the sentence says "when the plateau drawn has layer problems"; the alternative (the band refuses every plateau for every refused file) is a change of the editor beyond this run.
  - S3 "the first element is the cause": reworded (a symptom of a missing layer; a second wrong parent shows after the first is repaired).
  - S3 the horizon rule warned across granularities (`2026` under `2026-Q4`): it compares periods now, the whole period of the plateau must end before the period above begins (D52, M61).
  - S3 the Java/JS copies were only partly pinned: M61 (periods, `H`, a day, `2026Q4`, an impossible day, a two-digit year, mixed granularity) and N54, N55 (the singular of both folds).
  - S3 the comparison of the editor's sentences with the command line's removed the file prefix from both sides: the prefix is kept for everything but the badge of a file and the banner of `workspace.yaml`, which say the sentence alone.
  - S3 `--output` handling: the backslash of a relative path is replaced as the absolute one's is; `ManifestDiscoveryTest` runs the discovery with two beginnings. A folder called like the output is left out too (a manifests folder named `out` with `-o out`): documented in D54, `-o` names a folder the tools own, as `views` does.
  - S3 wording of the run document (counts, "Not defects" for V2 and V4, a pointer to an empty section, the third `BrightcartOutputFolderTest` test that passes on `HEAD`, a failure path of the generator that no test pinned): fixed; the generator's two failure paths are pinned.

## Findings

- F1. The negative test of the editor did not look at the tree's warnings, nor at a reference declared again in an ancestor: `treeWarnings` and `redeclared` are keys of `said()` now. V2 as the document words it (N53) had no case, and the editor said nothing about it in the test.
- F2. The editor's comparison "every editor text is a line of the command line" skipped `layerProblems`, which is why the five consequences of a refused manifest went unseen for a wave. It does not skip it any more.
- F3. For W-13 (the manual): the two warnings (V9 and V10, with the reading of a horizon as a period), the rule "one cause, one line" with its counts, `-o` must name a folder outside the paths read with `/**` for the commands other than `views generate` (#88), and the sentence of the CLAUDE.md that says what the shared cases file pins.
- F4. For the wave: the A1 warning appears in the output of V5 (two lines before the error); it is unchanged, and the author's decision stays open.
- F5. `PlateauTree` is outside the `likely_paths` of W-11 (`resource/plateau`); it holds the warnings of the tree, so the two new ones sit there; `plateau-model-cases.json` is outside too (the shared cases of the model).

## Not verified

The native image; other browsers; the layout of the note of the Elements page by eye; Windows (the separators of the `--output` folder are replaced and not run there); a tree of thousands of plateaus; `plateau merge` (V12 to V14, M1 to M3) which does not exist.
