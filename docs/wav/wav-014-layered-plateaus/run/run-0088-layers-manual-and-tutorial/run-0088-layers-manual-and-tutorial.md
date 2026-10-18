---
type: run
run: 0088
status: completed
wave: 014
---

# Run 0088: Layers manual and tutorial

Wave 014 (`layered-plateaus`), item W-13 (phase P4). Focus: learn the layers from the manual, the example and the tutorial.

Document profile: `single-document`, as runs 0075 to 0087. The work is documentation and one example; the one real fork (what the example is, once the empty layer of D33 is gone) is decided below. The review passes were kept (KDMLLC and a C scan by a read-only sub-agent at the standard tier, answered in *Review passes*); there is no PRD, TDD or pln.

## Scope

In (the W-13 row of the plan, the fourth criterion of the P4 gate, and the brief):

- The manual (`src/doc/README.adoc`) rewritten for the layers: the header `plateau:`, the root, the manifest of kind `archicode.morin.io/plateau` (`id`, `name`, `horizon`, `override`, `patches`), the operators and selectors with the lines they give, the cascade of a `REMOVE`, discovery with `/**`, `--plateau`, `--against`, `plateau list`, the folders of the views, `replaces` and candidates (the one-chain rule), the editor (band, pages, Files, writing in a plateau, the confirmation), the warnings of V9 and V10 and of A1, "one cause, one line".
- The note that `settings.plateaus`, `plateau add` and `--baseline` no longer exist, with the line a workspace file that still has the key gets (quoted by running the command, and read from `WorkspaceFactory.REMOVED_KEY`).
- A section *Limits of today* (`[[plateau-limits]]`): #89, #94, #84, #78 (three lines), #88, and #86, #87 and #97.
- The example `src/doc/examples/domain_plateaus` in the layered form a reader would write, and the tutorial rewritten on it (nine steps, every command run).
- `docs/fixtures/brightcart-spec.md`: what a tool verifies today, and the sentences about `folders/` and the old mechanism put in the past. `CLAUDE.md`: what was stale. `src/site/**`: nothing to change (it has no mention of the old mechanism).

Out: any Java, Rust, page or kernel change (none was needed: no snippet showed a defect), `plateau merge`, the decision of #97.

## Decisions

- **D61. The example has a root and one layer, and the root is named by its own manifest.** The converted fixtures keep their first state as an empty layer over an empty root (D33), which keeps their numbers; a reader would not write that. `domain_plateaus` is now: `plateaus/baseline/` (the old first state, no `plateau:` header, plus `plateau.baseline.yaml`, a `Kind: Plateau` manifest with `id: baseline`, `name: "As is"`, `horizon: "2026-Q3"`) and `plateaus/to-be/` (the manifests that say `plateau: "to-be"` and `plateau.to-be.yaml`, `override: "baseline"`). The ids `as-is` and `to-be` of the old example become `baseline` and `to-be`: the comparison reads `comparing to-be (To be) with baseline (As is)`, the folders are `views-to-be` and `views-to-be-vs-baseline`, and `archicode diff` and `views generate` need no `--against`. The numbers are those of the empty-layer form (+2 ~2 -2, 2 moved / 2 split / 1 merged, +1 ~1 -1, the same cascade). Folder names (`10_as-is`, `20_to-be`) became `baseline` and `to-be`, so that a folder says the plateau it holds, which the editor's Files page checks. The relabelling of `shop.web` towards `shop.catalog` is a `SET` with `where` and the new relationship an `ADD`, in place of a `SET` of the whole list: it is what the editor writes and it teaches `where`; the output is the same bytes.
- **D62. Tests that name the example were re-aimed, not changed in meaning.** `FacetRemovesElementTest`, `facet-removes-element.test.js` and `example-identity.test.js` said `as-is` and `views-to-be-vs-as-is`; they say `baseline` and `views-to-be-vs-baseline`, and `example-identity.test.js` expects two plateaus (`baseline`, `to-be`) in place of three. The `expect` lines of the Native smoke step of `.github/workflows/ci-build.yaml` (`--against as-is`, the folder `views-to-be-vs-as-is`) are the same change. `move-editor.test.js` asserted that the section on *Move* names *Move and write replaces* and *Move only*; it now asserts the opposite (see D64).
- **D63. Where the limits live.** One section, `[[plateau-limits]]`, linked from the places a reader would meet them (the features list, the TOML sentences, the discovery rules, `replaces`, the editor's save). Each limit names its issue, and what the tools say (a real line, run) when there is one: #89 (the warning of Brightcart), #84 (`Unknown token`), #88 (`gap.json is not valid ...`).
- **D64. The manual does not teach *Move and write replaces*.** After W-18 the button is unreachable (#97). The section on *Move* says that *Move* writes no `replaces` and where to write it; the page of an element, the tutorial and the Changes panel use *Write replaces*. The code that writes the key is untouched (it is #97's to decide), and `CLAUDE.md` says so.
- **D65. What the editor tutorial claims was run.** The page was served by `archicode editor serve` on a copy of the example and read in the built-in browser (pane open, 572 px wide): the band and its labels, *Past*, the Changes panel (counts, candidates, cascade), *Write replaces* (and *Save all changes*, which wrote `replaces: - "shop.reviews"` in `plateaus/to-be/ratings.yaml` and nothing else), the page of an element and where each value comes from, an edit of an inherited description in `to-be` (one `SET` appended at the end of the patches; `plateaus/baseline/shop.yaml` unchanged), the same kind of edit in `baseline` on a field `to-be` inherits (the dialog *Writing in baseline changes other plateaus*), and the *Move* dialog. The form of an element is written by *Save all changes*, not on leaving the form.
- **D66. `plateau list` and the band order siblings differently** (by id and by horizon-as-date): the manual says both. Not filed: the tree is the same, and the band's order was decided in run 0080 (D3).

## Canonical impact

None to the architecture model (`docs/arc`, `docs/dom`): documentation, one example and the tests that name it. No `CI-arc` or `CI-dom` packet is touched; no behaviour of a tool changed.

## Shipped files

The example is the one shipped form this run changes. The test that loads it, by tool:

| form | command line | editor |
|---|---|---|
| `src/doc/examples/domain_plateaus` (root `baseline` named by its manifest, layer `to-be`) | `ManualExamplesTest` (loads every `workspace.yaml` under `src/doc/examples`), `ShippedFilesTest` (once per plateau of its tree), `PlateauComparisonTest` (the table the manual quotes, twice; the example without its `replaces`), `FacetRemovesElementTest` | `shipped-files.test.js` (every plateau opens, compared with the one it overrides, no problem), `example-identity.test.js` (the rows of the manual's table, the candidate), `facet-removes-element.test.js` |
| the tutorial's later plateau `later` (step 9) and the patches quoted in the manual | run by hand on copies (see *Verification*); the same lines are pinned for Brightcart by `BrightcartNegativeCasesTest` | `brightcart-negative.test.js` |

`ShippedFilesTest` and `shipped-files.test.js` keep their list of exceptions empty.

## Tasks

- [x] T1. Read the plan, the manual, the example, the tests that load it, the run documents of the wave, the issues.
- [x] T2. The example (D61) and the tests that name it (D62).
- [x] T3. The Plateaus and comparison sections of the Domain chapter, the chapter of the overview, the tutorial, the upgrade section and *Limits of today*.
- [x] T4. The editor chapter (D64, D65) and the Commands chapter; the appendix (`replaces`, Plateau, Patch).
- [x] T5. `docs/fixtures/brightcart-spec.md`, `CLAUDE.md`, `src/site` (nothing).
- [x] T6. Every quoted command run; the editor driven in the built-in browser (D65).
- [x] T7. Review pass, answered; the gate commands on the final tree; one commit.

## Review passes, answered

A read-only `general-purpose` sub-agent at the standard tier (KDMLLC and a C scan of the manual against the code, the CLI and the issues; it also found no S0). 7 S1 and 14 S2; all applied except where said.

- **S1** step 2 quoted a manifest the reader had not written (the CLI says `headers only` without it): the step now writes a minimal `plateau.to-be.yaml` and says where the other manifests are. The upgrade recipe said to give changed manifests `plateau:` (which is the redeclaration error), never said to delete the old copies, did not say the first plateau's id becomes `baseline`, assumed a `manifests.paths` that a workspace of plateaus could not have, and did not list the stricter plateau ids as a breaking change: rewritten as four steps, and the ids are in the breaking-changes box. *Write replaces* wrote "in the manifest of the plateau that is drawn" where it is the manifest that declares the element (the next paragraph was right). A leftover "with *Nothing*" of the removed list. `<FILENAME>.{yaml,toml,json}` in *Source Code Organization* (TOML does not load).
- **S2** applied: `views-to-be-vs-as-is` in the discovery rule; "none is hidden by the tools" (#87 is silent); a fourth case of #78; the REMOVE rules of `patch.rs` (no `field`, `where`, `value`; a `json-path` without `field`); the order in which the editor chooses the plateau it opens (address, remembered, `settings.current`, `baseline`) and the false reason "where it can write"; the Changes panel is on Applications, Elements and Timeline only; the root is compared when `--against` names a plateau; where a plateau manifest is written when the plateau exists through headers; the dialog's hint about `replaces` (a sentence under *Move*); a pointer from `[[duplicate-references]]` to the layered rule.
- **Not applied, with the reason:** the DRY remarks (three TOML parentheticals, `replaces` not composed told in `[[plateau-replaces]]` and in the limits): each sits where a reader would meet it and the second is one sentence plus a link; the "wave 014" words of text this run did not write ("until wave 014" in the pages section); the `SET json-path` error line quoted under a `MERGE` snippet (the lines are said to come from one added patch each; none is the snippet); the step 8 flows the reviewer could not drive were driven here (D65).
- **C scan.** Every `<<anchor>>` has its `[[anchor]]` (script and the generated HTML), every `include::` path exists, every quoted output block was compared with what the command prints (D61, *Verification*), the patch table matches the header of `patch.rs`, the limits match the text of the nine issues.

## Verification

Run on the final tree, by me (JDK 25.0.4, `PLANTUML_JAR` set to `plantuml-1.2024.7.jar`, so no test is skipped):

| Command | Result |
|---|---|
| `./mvnw -o verify` | BUILD SUCCESS, 611 tests, 0 failures, 0 errors, 0 skipped (the manual builds in the same run: its only messages are the `Could not load PlantUML` errors of the images, which the build's own classpath cannot load (run 0084 records them; 18 of them, one for each image of the manual, the three of the example included), and one INFO about `<<: *base>>`, in a sentence that this run did not touch) |
| `cargo test --manifest-path src/main/rust/viewpoint-kernel/Cargo.toml` | 190 passed |
| `src/main/rust/viewpoint-kernel/embed.sh --check` | ok, 715537 bytes |
| `node --test "src/test/javascript/**/*.test.js"` | 1459 tests, 1459 pass |
| `npx prettier --check "src/**/*.java"` | clean |

*The P4 gate, third criterion.* `git grep -n "settings.plateaus\|plateau add\|--baseline" -- src/doc` (ten lines, each in a note that says the key, the command or the option no longer exists: 179, 182 and 185 the note of `[[plateaus]]`; 888 the sentence of the settings; 915 the breaking-changes box; 933 the row of the table of settings; 1295, 1299 and 1302 the upgrade recipe; 1933 the note of `plateau list`):

```
src/doc/README.adoc:179:*There is no `settings.plateaus` any more.* ...
src/doc/README.adoc:182:error: `settings.plateaus` no longer exists: ...
src/doc/README.adoc:185:`--baseline` is a usage error (`Unknown options: '--baseline', ...`...
src/doc/README.adoc:888:... There is no `settings.plateaus`: the plateaus are written in the manifests ...
src/doc/README.adoc:915:IMPORTANT: *Breaking changes.* `settings.plateaus`, `archicode plateau add` and `--baseline` no longer exist ...
src/doc/README.adoc:933:| `settings.plateaus` | No longer exists ...
src/doc/README.adoc:1295:*From `settings.plateaus` to layers.* The key no longer exists ...
src/doc/README.adoc:1299:. Delete `settings.plateaus`, and write `manifests.paths` ...
src/doc/README.adoc:1302:Four differences to know: ... `--baseline` is `--against`. ... `archicode plateau add`, are gone.
src/doc/README.adoc:1933:IMPORTANT: `archicode plateau add` no longer exists: it copied ...
```

`git grep -n "settings.plateaus\|plateau add\|--baseline" -- src/site README.md` finds nothing (exit 1; `src/site/index.html` and `README.md` never named the old mechanism after run 0083).

*Every quoted command was run against the built jar* (`java -jar target/quarkus-app/quarkus-run.jar`, on copies of the example, of the layered Brightcart and of variants of them): `plateau list` (the root alone, two plateaus, three, a fork, a typo), `diff` (default, `--plateau`, `--against`, the root without `--against`, an unknown plateau, the plateau itself, a fork), `views generate` (default, `--plateau`, `--against`, `-o out` twice), the removed key, `--baseline` and `plateau add` (usage errors), the nine patch errors, the six tree and plateau errors, the two "one cause" lines, the four warnings, the TOML error, the `gap.json` error of #88, the #89 warning on Brightcart, and the table of step 9 (`later`). A script compared every stdout line of the quoted commands with the manual: none missing. The three `include`d `.puml` files equal what `views generate` writes now.

*The editor* was served on a copy and driven in the built-in browser (D65). The layout was seen in one screenshot of the band at 572 px; light and dark were not compared.

*Not verified:* the native image; other browsers; the published page (`/editor/`); the layout of the new manual in a browser (the HTML was built, with no unresolved directive or anchor, and not looked at); *Hide wording-only changes* and the Past/Future toggles beyond *Past*; Windows paths.

## Files outside the paths

The `likely_paths` are `src/doc/**`, `src/site/**`, `CLAUDE.md` and `docs/fixtures/brightcart-spec.md`. Outside them, because the example changed its plateau ids and one test asserted a button the manual no longer teaches:

- `.github/workflows/ci-build.yaml` (the Native smoke step: `--against baseline`, `views-to-be-vs-baseline`; the same two expectations as before).
- `src/test/java/io/morin/archicode/cli/FacetRemovesElementTest.java`, `src/test/javascript/viewpoint-kernel/facet-removes-element.test.js`, `src/test/javascript/viewpoint-kernel/example-identity.test.js` (`as-is` is `baseline`; two plateaus in the tree, not three).
- `src/test/javascript/viewpoint-kernel/move-editor.test.js` (the section on *Move* must no longer name *Move and write replaces* and *Move only*; it asserts that it does not).
- This run's own document.

No Java, Rust, kernel or page file changed; the wasm is the committed one.

## Findings

- F1. **The example's plateau ids changed** (`as-is` to `baseline`): a reader who follows the manual from a checkout of an older version meets `views-to-be-vs-baseline`. Nothing else in the repository named the old ones (the grep is in D62).
- F2. **`plateau list` and the band order siblings differently** (ids, and horizon read as a date): D66; a one-line manual sentence says so. Not an issue: decided in run 0080.
- F3. **The editor's *Move* dialog still says "To write replaces, compare the plateau with another one on the band"** for a button that cannot be reached (#97). The manual says so in one clause; the fix is #97's (remove the path, or give the move a meaning).
- F4. **A form of an element is applied by *Save all changes*, not on leaving the form** (the draft is read when the button is pressed): the tutorial says "Save all changes" after *Edit*. Found by driving the page; the manual's *Elements* text already says edits stay in memory until the save, but does not say that the open form counts.
- F5. For the wave: the manual is the one place that says the limits together (`[[plateau-limits]]`); when #84, #89, #94, #97 or #88 is fixed, that section and `CLAUDE.md` change with it (the test `PlateauComparisonTest.theManualShowsWhatTheCommandPrintsOnTheExampleOfTheManual` pins the two quotes of the table; `move-editor.test.js` pins the section on *Move*).
- F6. For the wave: the P4 gate sentence "the manual test loads the examples" is `ManualExamplesTest` (every `workspace.yaml` under `src/doc/examples`, once, without choosing a plateau) plus `ShippedFilesTest`, which loads each plateau of a layered example; the second is the one that would catch a broken layer.
