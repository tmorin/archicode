---
type: run
run: 0110
status: completed
wave: 016
---

# Run 0110: Brightcart views and stories

Wave 016 (`band-tree-and-technology-map`), item W-4 (phase P1). Focus: the Brightcart fixture ships a few views and stories, so that the untied views and the story steps are checked on the fixture itself (#115, decision of the author)

Document profile: `single-document`, as runs 0089 to 0109: the scope is settled by issue #115 (decision D6 of the plan, the author's, 2026-10-20) and by the brief; no PRD, TDD or pln. The review passes (KDMLLC read of this document, the open questions, the C scan against the code and the other tests that read the fixture, a read-only review of the working tree by a sub-agent) are answered below.

## Scope

In: seven views and three stories, invented, in a new folder `layered/shared/` of the fixture, written by `generate.mjs` from `ENTRIES` of `description.mjs`; `expected/entries.json` (where each view can be drawn, the warning of the command line where it cannot, the steps of the stories); a test of the command line and a test of the editor that read them; the tests of wave 015 that the new files change; `docs/fixtures/brightcart-spec.md`, `src/test/resources/brightcart/README.md` and `CLAUDE.md`.

Out: the manual (W-12's), the Java main code and the kernel (none touched), the drawing of a story by the command line (#109), the application elements and the relationships of the technology map (W-8).

## What was found before any change

- **`views generate` draws a saved view only when it is named** (`-i <id>`): without `-i` it draws the built-in views of the elements and nothing else, and with `-i` it draws the named views *alone* (`GenerateViewsCommand`: the built-in views are filtered by `viewIds` too). So the brief's "the counts of generated files change" does not hold for the plain run: the files `views generate` writes without `-i` are the same bytes (109 / 93 / 147 / 181 for the four plateaus, 3758 files in all the folders), and what changes is the rendition itself (`expected/renditions.json`) and what the tests that draw the saved views name.
- **A view of an element that a facet removes fails the command** (`error: dangling reference: commerce-saas`, no view and no facet named). `commerce-saas`, the only element `saas` alone declares, is tagged external and removed by the facet `no-externals`; a first version of the fixture had a view of it and `views generate --plateau saas -i ...` exited 1. The view is not shipped (the step of `fork_tour` that needs the element (the second) carries its own view, which no command draws); issue #121 files the question.
- A saved view's `description` is the title of its diagram: the descriptions are titles ("The cloud region, the Kubernetes cluster pinned."), and what each view is for is a comment in `description.mjs`, in `expected/entries.json` and in the spec.
- Names: the ids of the views and the stories avoid every id that a test adds to a copy of `layered/` (`cart_view`, `catalog_view`, `shop_map`, `catalog_map`, `tour`, ...: an id is declared once), checked by `git grep` over `src/test` and `src/main`. The folder is called `shared/` because it must not begin with `views` (the folder of the generated views and the folders beside it that begin with its name and a dash are not read: `views.path` is `views` in this workspace).

## Decisions

- **D1. Where.** `layered/shared/`, files `view.<id>.yaml` and `story.<id>.yaml`, no `plateau:` header (a view and a story belong to no plateau). The page lists them in the group *No plateau* of Files, last.
- **D2. The seven views.** `customer_overview` (an element every plateau has), `shop_overview` (renamed `storefront` in `marketplace`: the question L10 of the spec), `commerce_overview` (`commerce`: `inhouse` and `marketplace`), `marketplace_overview` (an element one plateau alone declares), `environments_map` (technology, `prod` opened, `sandbox` and `staging` hidden: four plateaus), `cloud_map` (technology, pinned on `prod.cloud.k8s` and opened on `prod`, `prod.cloud`: skipped where there is no cloud), `applications_map` (application, pinned `customer` and `psp`, `shop` opened: `marketplace` leaves `shop` out with a warning). The names `shop_overview`, `order_journey` and `seller_journey` are those of section 9 of the spec (the study plan); the others are new.
- **D3. The three stories.** `order_journey` (no step names a plateau; two named views and one carried; every step can be drawn in each of the four plateaus), `fork_tour` (seven steps across the fork: at `baseline`; `saas` against `baseline` (P1); `inhouse` against `baseline` (P2); `inhouse` against `saas` (P5, two plateaus that override `baseline` and do not stack); `marketplace` against `inhouse` (P3); `marketplace` against `baseline` (P4's pair); and `against: saas` with no `at`), `seller_journey` (every step told at `marketplace`, the last compared with `inhouse`). Every view a step names is declared once (checked by the generator and by both tests).
- **D4. The generator knows the model's answer.** `entryFacts` in `generate.mjs` works out, from the resolved plateaus, where each view can be drawn by the rules of `canBeDrawnInPlateau` (the sentences are those of the command line, so the Java test compares them byte for byte), checks that what the entries name is declared by some plateau, that every view a step names exists once, that `at` and `against` are plateaus and differ, and that the fixture holds what #115 asked for (a view every plateau draws, a view one plateau alone declares, a view some plateau cannot draw, a saved map of each layer, a map that leaves an entry out, a map a plateau cannot draw, a step at each plateau of the fork and the comparison of the two, a step compared further up the chain, `against` without `at`, a story with no step plateau). It reads the files back from the disk and compares them with the description (the existing resolver check, extended). `expected/entries.json` is its answer, and the tests type no number or sentence of their own.
- **D5. The old tests change as little as they must.** `brightcart-negative.test.js` leaves the shipped views, stories and the sentences of `entryProblems` that name a file of `shared/` out of what a case expects (they are a constant of the fixture, pinned for the four plateaus by the new test; the 74 cases are about their alterations; a view a case writes is told as before). `delete-plateau.test.js` and two tests of `editor-writes-layers.test.js` start from the fixture without `shared/`: the shipped entries *refuse* the delete of `saas`, `marketplace`, `commerce-saas` and `shop`, which is the guard working and is a test of its own in the new file. `editor-structure.test.js` expects the shipped ids and the ones the test adds. `brightcart-editor.test.js` counts the rendition by kind. `TomlManifestTest` no longer keeps a sample view (a shipped file has the kind now: the failure of its own rule), and keeps the sample for the test of the TOML twin of a view and a story.
- **D6. `renditions.json` says the kinds.** `files` 60 (was 50), `manifests` 46 (the elements: unchanged), `plateauFiles` 4, `views` 7, `stories` 3, `patches` 68.

## Counts: old and new

| What | Old | New |
|---|---|---|
| Files of `layered/` (without `workspace.yaml`) | 50 | 60 (46 manifests of elements, 4 `plateau.yaml`, 7 views, 3 stories) |
| Lines / bytes of `layered/` | 1251 / 34446 | 1415 / 39186 (+164 / +4740) |
| Files of `expected/` | 6 | 7 (`entries.json`) |
| PlantUML files of `views generate --plateau <p>` (plain): baseline, saas, inhouse, marketplace | 109, 93, 147, 181 | the same four numbers, the same bytes (see Identity) |
| PlantUML files of `views generate --plateau <p> -i <the seven views>` in `views-<p>` | (no such view) | 4, 4, 6, 6; the whole run (facets and comparisons) writes 148 files in 28 folders |
| Tables of `diff` (`comparisons.json`, `changes.json`, `sizes.json`) | | unchanged: not one byte of them is in the diff of the commit |
| Unit tests (`./mvnw -o verify`) / integration tests | 865 / 18 | 879 / 18 (+14: `BrightcartViewsAndStoriesTest`) |
| Node tests | 1796 | 1805 (+9: `brightcart-views-and-stories.test.js`) |

## Tasks

- [x] T1. Read #115, the plan, runs 0107 to 0109, the generator, the description, the spec, the tests that read the fixture, `GenerateViewsCommand`, `KernelViewpointFactory`, the page's `viewProblem`, `stepProblem`.
- [x] T2. `ENTRIES`, the emitter, `entryFacts`, the read-back, `entries.json`, `renditions.json`.
- [x] T3. Run the whole suites on the new fixture; list what breaks (78 node tests, 1 Java test); decide each (D5).
- [x] T4. `BrightcartViewsAndStoriesTest.java` and `brightcart-views-and-stories.test.js`.
- [x] T5. Spec (front matter, sections 1, 9, 10, 12, 13, L10), `README.md` of the fixture, `CLAUDE.md`.
- [x] T6. Identity, mutation checks, the gate, the review pass, this document, one commit.

## Canonical impact

None to the architecture model: no TDD, no `CI-arc` or `CI-dom` packet, and the repository declares no register for the fixture. The run adds test resources and tests, and corrects `CLAUDE.md` and the spec where they said what the fixture ships; no domain invariant is added or moved (the invariants it exercises, that a view and a story belong to no plateau, that a name must be declared by some plateau, that a step may be told at a plateau and compared with another, are those of waves 015 and 016 run 0107, and were already in `CLAUDE.md`). `CLAUDE.md` is the project's one description of the behaviour: its sentence on the fixture and its sentence on the shipped examples of a step told at a plateau are corrected.

## Shipped files

The run ships ten manifests, one generated JSON and one generator change. Each is loaded by the command line and the editor in a test (rule of `CLAUDE.md`); none is an exception (`shipped-files/exceptions.json` stays empty).

| File | Kind | Loaded by the command line | Loaded by the editor |
|---|---|---|---|
| `layered/shared/view.customer_overview.yaml` | view | `ShippedFilesTest` (every plateau of `layered/` loads), `BrightcartViewsAndStoriesTest` (drawn in four), `TomlManifestTest` (its TOML twin) | `shipped-files.test.js`, `brightcart-views-and-stories.test.js` |
| `layered/shared/view.shop_overview.yaml` | view | the same (skipped in `marketplace` with the warning of `entries.json`) | the same (`viewProblem` in each plateau) |
| `layered/shared/view.commerce_overview.yaml` | view | the same (skipped in `baseline` and `saas`) | the same |
| `layered/shared/view.marketplace_overview.yaml` | view | the same (skipped in three) | the same |
| `layered/shared/view.environments_map.yaml` | view, map technology | the same (drawn: `Production` opened, `Staging` and the sandboxes absent) | the same (`applySavedView` opens the page Environments with the lists) |
| `layered/shared/view.cloud_map.yaml` | view, map technology | the same (skipped in `baseline` and `saas`) | the same |
| `layered/shared/view.applications_map.yaml` | view, map application | the same (`shop` left out in `marketplace`, with the warning) | the same (`applySavedView` opens the page Applications; `shop` is not opened in `marketplace`) |
| `layered/shared/story.order_journey.yaml` | story | `ShippedFilesTest`, `TomlManifestTest` (the plateau-free check and the steps' plateaus are in the load) | `brightcart-views-and-stories.test.js` (every step, every plateau drawn) |
| `layered/shared/story.fork_tour.yaml` | story | the same, and `BrightcartViewsAndStoriesTest` (a mistyped `at` is one sentence with the story, the file and the step) | `brightcart-views-and-stories.test.js` (`goToStoryStep` draws the plateau and the comparison of each step, counts equal to P1, P2, P5, P3 and to what the tool prints for P4) |
| `layered/shared/story.seller_journey.yaml` | story | the same | `brightcart-views-and-stories.test.js` |
| `expected/entries.json` | generated | `BrightcartViewsAndStoriesTest` | `brightcart-views-and-stories.test.js`, `brightcart-negative.test.js`, `editor-structure.test.js` |
| `generate.mjs`, `description.mjs` | generator | | `brightcart-layered.test.js` (the generator in a copy writes `layered/`, `variants/`, `expected/` byte for byte) |

## Verification

Run by me, on the tree as committed (JDK 25, `PLANTUML_JAR` set to `plantuml-1.2024.7.jar`, so no test is skipped):

| Command | Result |
|---|---|
| `node src/test/resources/brightcart/generate.mjs` | exit 0, "ok: the description matches the document, and the layered rendition resolves to the model for the four plateaus"; `git status` after it shows the committed files only (the generator is idempotent: `brightcart-layered.test.js` runs it in a copy and compares byte for byte) |
| `./mvnw -o verify -DskipITs=false` | BUILD SUCCESS: 879 unit tests, 0 failures, 0 errors, 0 skipped; 18 integration tests, 0 failures |
| `node --test "src/test/javascript/**/*.test.js"` | 1805 tests, 1805 pass (0 fail) |
| `npx prettier --check "src/**/*.java"` | clean |

`cargo test` and `embed.sh --check` were not run: no kernel file is touched. The numbers above are those of the last run, after the review pass's edits. The generator was run once more *while* the Maven run was going (it rewrites `layered/` with the same bytes; the Maven run passed, and `git status` shows no change to the generated files from it).

*Fail before, pass after* (the new tests cannot fail on the old fixture: they read `expected/entries.json` and `layered/shared/`, which it lacks). Mutations of the code the tests are about, each reverted (`git diff --quiet` on the file afterwards): `stepProblem` looking at the plateau drawn instead of the plateau the step names fails the fork test and the seller test; `viewProblem` never saying an overview's element is missing fails the test of which view is drawn where; `GenerateViewsCommand.canBeDrawnInPlateau` returning true always fails 8 of the 14 Java tests (the warnings, the files, the maps). The 78 node tests that failed on the new files (60 negative cases, 13 deletes of a plateau, 2 of the save, the rendition count, the page Stories) were each looked at, and the table in D5 says what was done to each group.

### Identity

The jar of `archicode-0.14.0` against the jar built from this tree (`views generate`, `query graph` and `diff` of each workspace, on copies, stdout, stderr (sorted), exit code and `diff -r` of the copies):

- the 20 workspaces that `git ls-files` lists outside `docs/`: 11 `src/doc/examples/*/workspace.yaml` (`domain_application`, `domain_manifest_folders`, `domain_plateaus`, `domain_technology`, `domain_technology_map`, `domain_viewpoint_views`, `domain_workspace`, `facet_example_step_1` to `4`), `hyphen-ids`, `plateau-comparison` (and its `replaces`), `plateau-state-hints`, `plateau-state-tags`, `replaces-large-pair`, `split-relationships`, `viewpoint-kernel/workspace` and the layered Brightcart (the three forks fail on both jars with the same error, since no `--plateau` is named): **identical** in all (status 0);
- the 8 `workspace_*.yaml` of `design_example_step_1` to `3` (they are not named `workspace.yaml`), run with `-w <file>`: **identical** (status 0). `domain_configuration` holds defaults, not a workspace: not run. Of the 15 folders of `src/doc/examples`, 14 were run;
- Brightcart: `diff --plateau saas|inhouse|marketplace`, `diff --plateau inhouse --against saas`, `diff --plateau marketplace --against baseline` (text and `--format json`), `plateau list` and `query graph --plateau inhouse`, with the fixture of `HEAD` (from `git archive`) and the new fixture, and with the jar of 0.14.0 on the new fixture: **identical** (the tables are the same). `views generate --plateau <p>` for the four plateaus: `diff -r` of the four copies is empty between the fixture of `HEAD` and the new one (same jar) and between the two jars (new fixture): **identical, and no file more**: 3758 PlantUML files in all the folders, either way. What is more is what a name asks for: see the counts above.

## Review pass, answered

A `general-purpose` sub-agent at the standard tier (Sonnet, medium), read-only, on the working tree. No S1. Answers:

- S2, "two steps carry their own view of `commerce-saas`" (spec section 9, this document): false, only step 2 names it. Fixed in the spec and here.
- S2, stale counts of files ("50 files of `layered/`" in sections 10 and 11 of the spec, "the saves of the 123 files" in the front matter, the header of `brightcart-editor.test.js`): fixed (60 files; the saves run over every file of `layered/`, the views and stories included).
- S3, `against: saas` with no `at` has no comparison when `saas` is the plateau drawn (a plateau compared with itself, as the step of `migration` of the manual's example): the page behaves so and says nothing, so the test now asserts it (`drawing` is `{ plateau: 'saas', against: null }` and `stepProblem` is null), and the text of the step says there is nothing to compare then.
- S3, a comment with no assertion (the shop is opened where there is one): `BrightcartViewsAndStoriesTest` now asserts that the containers of `shop` are drawn (`Web storefront`) in the plateaus that have `shop` and not in `marketplace`.
- S3, the filters of `brightcart-negative.test.js` are broad (a case that broke a shipped entry would be left out of what it expects): kept on purpose and said in the comment; none of the 74 cases alters what the shipped entries name except the four that make a manifest of `inhouse` unreadable (N21, N22, N26, N28), where the page cannot say what `commerce` is. The cases that write a view or a story of their own (N79 to N88) are told in full.
- S3, `canBeDrawnInPlateau` lets a view with a blank `element` through and `viewIn` does not: no shipped view has one (an overview without an element is `the view v has no element` elsewhere); not changed.
- S3, nothing copied from a real workspace in `layered/shared/` (searched for the author's name, the sync tool and the domain of the kind URI), and no sentence of the repository still says the fixture ships no view or story, except the one of section 12 that is history.

KDMLLC read and C scan, mine: the brief says `views generate` writes more files; the code says a saved view is drawn only when named (D5 of the findings above), so the document says it and the counts show it. The brief says "pinned/hidden/opened as the example does": `environments_map` (opened, hidden) and `cloud_map` (pinned, opened) cover the three lists. The brief says one step compared with `marketplace`'s ancestry: step 6 of `fork_tour` (`marketplace` against `baseline`, which the tools read as P4's pair without composing `replaces`). The brief says the page Stories lists the same stories in the four plateaus: tested on the shipped files (test 2), and the old test that added stories at test time expects the shipped ones too. The spec's old sentence "the committed fixture has no manifest view or story" is gone from sections 9 and 13 and from L10; a sentence in section 12 that records what an earlier session saw ("no manifest view or story existed in the fixture then") is kept as history.

## Findings

- **F1 (W-5, `Add to story...` and Settings).** `layered/shared/` has three stories to write into: `order_journey` (no step plateau) is the one to *Add to story...* on and check that `at`/`against` are written only when the box is checked; `fork_tour` is the one that already has both keys. A save writes `shared/story.*.yaml` through the line-preserving save (`brightcart-editor.test.js` saves every file of the fixture with an edit and puts it back, the new files included). The tests that delete a plateau or an element of the layered Brightcart start from the files without `shared/` (D5): if a W-5 test needs the delete or `settings.current` of `saas` or `marketplace` it should do the same, or the shipped stories will refuse (correctly). `settings.current` has no value in the fixture's `workspace.yaml` (the tree forks, so every command names the plateau).
- **F2 (W-8, the technology map).** The two saved technology maps (`environments_map`, `cloud_map`) are drawn by `BrightcartViewsAndStoriesTest.theSavedMapsAreDrawnWithWhatTheyOpenHideAndPin`, which only asserts boxes by label (`Production`, `Partners (live)`, `Kubernetes cluster` present; `Partners (sandbox)` and `Staging` absent from `environments_map`), not the links. When W-8 draws the applications and the relationships on the map, those assertions should hold unless an application is labelled `Staging` or `Partners (sandbox)`; if W-8 wants the Brightcart maps pinned like `domain_technology_map` (`expected-boxes.json`), `environments_map` and `cloud_map` are ready to be added there with their boxes and lines. The layered Brightcart still has no `uses` link between its environments (#107).
- **F3 (W-12, the manual).** `src/doc/README.adoc` line 791 says `--view` "draws that view too": the command draws the named views *alone*, no built-in view with them (`GenerateViewsCommand`, the filter of `renderBuiltinViews`). The sentence of line 810 (a view that cannot be drawn in the plateau is skipped by `views generate --view`) is exactly what the shipped views show; the manual could quote `shop_overview` (skipped in `marketplace`, where the shop is called `storefront`) and `fork_tour` (the shipped example of a step told at a plateau on a fork) next to `migration` of `domain_plateaus`. #121 (a view whose element a facet removes) is a limit the manual may say.
- **F4.** Files touched outside the `likely_paths`: none (this document is in the run's directory). The wave's manifest and progress log are the orchestrator's and were not touched.
- **F5.** The commit says `Refs #115`; the issue closes with the wave's pull request.
- **F6.** Issue filed: #121 (a view whose element a facet removes fails the command with a bare `dangling reference`).

## Not verified

- A look at the page: the saved maps and the story bar were read through the page's functions in node (`applySavedView`, `goToStoryStep`, `renderStoryBarHtml`), not seen in a browser, in either theme, or at 360 px.
- The native image (the integration tests ran on the JVM jar).
- `cargo test` and `embed.sh --check`: no kernel file changed.
- `tooling/docs/check-backlog.py` and the `docs/bkg/` close-out sweep: neither exists in this repository.
- The 15th folder of `src/doc/examples` (`domain_configuration`) holds defaults, not a workspace: not run in the identity check.
