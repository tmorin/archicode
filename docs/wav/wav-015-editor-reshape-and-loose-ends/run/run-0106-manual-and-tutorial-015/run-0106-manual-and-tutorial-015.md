---
type: run
run: 0106
status: completed
wave: 015
---

# Run 0106: Manual and tutorial 015

Wave 015 (`editor-reshape-and-loose-ends`), item W-18 (phase P2). Focus: learn the editor and the command line as they end this wave, from the manual and the tutorial

Document profile: `single-document`, as runs 0089 to 0105. Tier `standard`. A documentation run: the manual (`src/doc/README.adoc`), the tutorial that is inside it (`[[plateaus-overview]]`, steps 1 to 9), `CLAUDE.md`, `docs/fixtures/brightcart-spec.md`, `README.md` and `src/site/**`. Done inline: every sentence has to be checked against the code or a command, and the edits are in one file whose parts depend on each other (anchors, cross references), which a subagent would not see.

## Scope

In: `src/doc/README.adoc`, `src/doc/examples/**` (only if a test loads the change), `CLAUDE.md`, `docs/fixtures/brightcart-spec.md`, `README.md`, `src/site/**`.

Out: any code (`src/main`, `src/test`); the wave manifest and the wave's progress log (the orchestrator's); the issues of the wave (closed by the pull request).

## Method

The sources of truth, in this order: the code and a command run here; `CLAUDE.md`; the Findings "for W-18" of runs 0089 to 0105 (the authoritative list of what the manual must say or stop saying) and their Decisions. When a finding is ambiguous the code is read or the command run, and the line says what was checked. No sentence says the editor was seen on a screen: nobody saw it in a browser in this run.

## Progress (kept up to date so that an interrupted session can resume)

(sections of `src/doc/README.adoc` done are ticked as they are finished; by anchor)

- [x] Features, Workspace (TOML sentences), `[[manifest-formats]]` and `[[manifest-kinds]]`/`[[nesting]]` (new), `[[manifests-folders]]` rules 3 and 4
- [x] `[[plateaus]]`: header, `[[plateau-untied]]` (new), what is checked, patches sentence
- [x] Viewpoints and views: named views, `[[map-viewpoint]]` (new, with the example `domain_technology_map`), `[[plateau-views-lacking]]` (new)
- [x] `[[stories]]`: `--view`, `[[story-step-plateaus]]` (new)
- [x] `[[plateaus-overview]]`: intro, state tags sentence, tutorial steps 8, 9, 10 (new)
- [x] `[[plateau-limits]]` rewritten
- [x] Editor: `[[editor-reads]]`, `[[editor-pages]]`, the Map (Applications and Environments), inspection, `[[editor-stories]]`, `[[editor-view-edit]]`, `[[editor-files]]`, `[[editor-band]]`, `[[editor-writing]]`, `[[editor-plateaus]]` (was `editor-timeline`)
- [x] Editor: `[[editor-compare]]`, `[[editor-changes-panel]]` (Previous/Next, filters, Stories tabs), `[[editor-changes-only]]`, `[[editor-changes-address]]`, `[[editor-move]]` (rewritten)
- [x] Commands: warnings list, `--view` (the manual said `--view-id`, which does not exist), `--only-changes`, `diff --fail-on`, exit codes, Best Practices (TOML), Appendix (Story, Step), upgrade (`Later changes`)
- [x] `CLAUDE.md` (the pointer to the limits, the command line draws maps), `docs/fixtures/brightcart-spec.md`, `README.md`
- [x] Grep for the leftovers: the camel-case keys of the facets (none), "the Library" (none: Stories), the band on pages that have none (none), `--view-id` (fixed), `editor-timeline` (renamed, no reference left)

## Decisions

- **D1. The sources are the code and a run, then the findings.** Where a finding of an earlier run was ambiguous or turned out wrong, the code or the command decided, and the manual says what was seen. Two findings were wrong and are not repeated: the option that draws a named view is `--view` (short `-i`), not `--view-ids` (run 0099 F4) and not `--view-id`, which the manual itself had in its example of *Selective View Rendering* and which picocli refuses (`Unknown option: '--view-id=...'`, checked here); the sentence of run 0090 F2 that "the manual still says so in its limits (#25, #26)" was false, the manual said nothing, so the limits now say it.
- **D2. Anchors.** `editor-timeline` becomes `editor-plateaus` (the page is Plateaus); no other anchor of the old manual is removed, and every anchor the editor's help links to (`editor`, `editor-elements`, `editor-map`, `editor-facets`, `editor-keyboard`, `serve-the-editor`, `workspace`, `viewpoints`, `technical-configuration`, `facets`) and the site's (`editor-map`, `domain`, `serve-the-editor`) still exists. New anchors: `manifest-formats`, `manifest-kinds`, `nesting`, `application-layer`, `plateau-untied`, `plateau-views-lacking`, `map-viewpoint`, `story-step-plateaus`, `editor-reads`, `editor-plateaus`, `editor-plateau-delete`.
- **D3. The limits.** `[[plateau-limits]]` loses #84 (TOML loads), #86, #87, #88 and #97 (each is gone or no longer a limit: a view whose name another plateau has is left out or skipped, the nesting rule is an error, a folder that holds `gap.json` and `gap.md` is left out, *Move* writes no `replaces` by design) and keeps #89, #94 and #78. It gains what the wave left open and filed: #82, #103 and #105 (what the two tools still read differently), #106, #107, #108, #109, #110, #111, #112, #114 and, for the command line, #25 and #26. #113 (no shortcut for the walk) is told where the walk is described. #104 (a null pointer for a dotted id) no longer reproduces: the id is refused by both tools since run 0093 (the repro of the issue gives `error: ... the id `a.b` contains a dot`), so it is not a limit; it is left open for the orchestrator to close with that reason.
- **D4. The tutorial is the manual's `[[plateaus-overview]]`.** Steps 1 to 7 and 9 are unchanged (their commands and their output are the ones the shipped example gives, and `PlateauComparisonTest` quotes the tables). Step 5 gains the `--fail-on` line, step 7 `--only-changes`; step 8 is rewritten for the pages of the editor as they end this wave and gains the story `migration` and Files; step 10 (new) deletes a plateau. No file under `src/doc/examples` is changed, so no test that loads them had to move; the manual now includes `domain_technology_map/workspace.yaml` and `story.migration.yaml`, which were shipped and loaded already.
- **D5. TOML.** The TOML twin of `manifests/user.yaml` is written inline in the manual, not shipped as a file: it is what `TomlManifestIT` checks and what `query graph` here gave for the twin of `domain_workspace` (the same graph).
- **D6. `CLAUDE.md`.** Runs 0089 to 0105 each updated their own sentences; here the pointer to `[[plateau-limits]]` (it named #84, #88, #86 and #97, which are gone) and the sentence of the viewpoints (the command line draws a map when asked) are corrected, and nothing else was found stale (checked by grep for the old pages, the old mechanism and the old scope names).
- **D7. `docs/fixtures/brightcart-spec.md`.** The table of what a tool verifies gains the rows of wave 015 (the cases N56 to N85, the shared files of M, K and D cases, the technology map, `--fail-on` and `--only-changes`), each read from the files it names (counts: 74 cases in `negative-cases.json` with the identifiers N7 to N85, 81 in `plateau-model-cases.json`, 37 in `layer-checks-cases.json`, 36 in `discovery-cases.json`). Section 9 said the fixture has views and stories in each plateau; it has none (the generator writes none), so the section now says it is the plan of the study, and what wave 015 decided about L10 (#100, #86). Section 13 loses L10 as a limit.
- **D8. `README.md`** said `views generate --against as-is`, the id of a plateau of the old mechanism that the manual says to rename `baseline`: corrected, and `--fail-on` named in one clause. `src/site` has nothing stale (it says manifests are in the formats of the workspace, which is true since run 0091).
- **D9. Nothing is claimed that nobody saw.** No sentence says what the pages look like. What the editor does is told from `standalone.html` and from the decisions and tests of runs 0096 to 0104; the labels quoted (lists, buttons, dialogs) were read in the code.

## Tasks

- [x] T1. Read the plan row W-18, the gates of P1 and P2, the Findings of runs 0089 to 0105, the manual.
- [x] T2. The command line half of the manual (TOML, the kinds, `--fail-on`, `--only-changes`, maps, steps `at` / `against`, exit codes, warnings).
- [x] T3. The editor half (pages, band, Plateaus, Files, Environments, Stories, steps, delete, Changes panel, Move).
- [x] T4. `[[plateau-limits]]`.
- [x] T5. The tutorial.
- [x] T6. `CLAUDE.md`, `docs/fixtures/brightcart-spec.md`, `README.md`, `src/site/**`.
- [x] T7. The gates.

## Review pass

- KDMLLC read of this document: one decision each (D1 to D9); the manual is not repeated here, its sections are listed once under Progress.
- Open questions: none left. Settled: which issues stay in the limits and which go (D3), the `--view` option (D1), what the spec says of views and stories (D7).
- C scan against the repository, done claim by claim: the CLI sentences quoted in the manual were produced here by the command and pasted (the `--fail-on` errors and exit codes 0, 1 and 3, `--only-changes` on the bookshop, the map by `--view`, the TOML twin of `manifests/user.yaml` by `query graph`, `container-group`/`system-group`, a system under a container, a dotted id, a `plateau:` on a view, a step with `at: tobe`, `at` equal to `against`, `at` with no plateau in the workspace, `against: nope`, a view that names `shop.mailer`); the editor's labels were read in `standalone.html` (the band lists and their options, *! N mistakes* and *Mistakes in the plateaus*, the buttons of the page Plateaus, the dialog of the delete, the dialog of the move and its sentences, *Previous change* and *Next change*, the lists *State* and *Layer*, *Told at* and *Compared with*, the bar, the groups of Files).
- A read-only subagent (`standard`, sonnet, medium) checked the new editor and command-line sentences against the code and the JSON cases and found no mismatch of substance. Four small ones were taken: *Clear all* appears for more than two pins and hidden elements, not for two; the button of an entry is *Edit* and the one beside *New plateau* is *Edit plateau*; the counts of the Plateaus page are chips (`+ 2 new`), not the `+2 ~2 −2` shorthand (the table of `diff` has that one); and the ellipsis of *Name view…* is a character the manual writes as three dots (left, style only). What it could not confirm was checked here: the files of step 10 are the two the tutorial writes in step 9, and the command line takes `hide_unlinked` from the facet of the workspace, never from a view, so the sentence about the map stands.
- One test pinned a sentence of the old section of the move (`move-editor.test.js`, *the manual describes the move*: `does not write \`replaces\``, `header.parent`, `another file`, `Cancel`): the first node run failed on it, the rewritten section now says them, and the file passes.

## Verification

On the final tree (JDK 25, `PLANTUML_JAR` set); the machine was not under other load.

- The gate grep, `git grep -n -E "Map of a technology layer does not exist|filesScope|This plateau|With its past|#/timeline\b" -- src/doc README.md`: six lines, all in `src/doc/README.adoc`, and every one is the route of a page, `#/timeline/plateaus`, `#/timeline/applications`, `#/timeline/environments`, `#/timeline/elements` (the pattern `#/timeline\b` matches the start of those) or the sentence that says the bare `#/timeline` used to name the list of the plateaus and now opens Applications. `Map of a technology layer does not exist`, `filesScope`, `This plateau` and `With its past` match nothing. The criterion as written cannot give an empty answer while the routes of the pages are in the manual.
- `./mvnw -o verify`: BUILD SUCCESS, 839 tests, 0 failures, 0 errors, 0 skipped (the count of run 0105: no test was added or removed), 4:37 min. The Asciidoctor step converted `src/doc/README.adoc` with no `possible invalid reference` (the one that the manual had, the text `<<: *base`, is escaped now: `+<<: *base+`), and every `href="#..."` of the generated page has its `id`. It logs 18 lines `Failed to generate image: Could not load PlantUML` for the includes of `.puml` files: the same 18 lines as the logs of earlier runs (`verify-final.log`, from before this run), the plugin cannot load PlantUML in this environment and does not fail the build.
- `./mvnw -o verify -DskipITs=false`: BUILD SUCCESS, 839 unit tests, then 18 integration tests, 0 failures (`EditorServeIT`, `PlateauComparisonIT`, `TomlManifestIT`, `ViewsAndQueriesIT`), 5:43 min.
- `node --test "src/test/javascript/**/*.test.js"`: 1747 tests, 1747 pass (the first run had one failure, the sentences of the move in the manual: see the review pass).
- `npx prettier --check "src/**/*.java"`: clean (no Java changed).
- Every example is loaded by both tools: `ManualExamplesTest`, `ShippedFilesTest` (inside `./mvnw verify`) and `shipped-files.test.js` (inside the node run); none was changed.
- **Byte identity** of the views of the examples with no plateau, against a jar built from `git archive 25471b3` outside the repository. The jar is the one the earlier runs of this wave built in the scratchpad (`base25/target/quarkus-app/quarkus-run.jar`); its `src` and `pom.xml` were compared with `git archive 25471b3 src pom.xml` (`diff -rq`: identical) before it was used. The new jar is `target/quarkus-app/quarkus-run.jar` of this tree (`./mvnw -o package -DskipTests -Dplugin.asciidoctor.skip=true`). On a copy of each example, with its `views*` folders removed first, each jar ran `views generate`, `query graph` and `query views`; standard output, exit codes, standard error (sorted, the path replaced) and `diff -r` of the whole tree were compared: `domain_application`, `domain_technology`, `domain_viewpoint_views`, `domain_workspace`, `domain_technology_map`, `facet_example_step_1`, `_2`, `_3` and `_4`: identical in all of the three commands. `design_example_step_1` to `3` and `domain_configuration` have no `workspace.yaml` (they are fragments the manual includes), so there was nothing to run. Different, as the brief expects: `domain_manifest_folders` and `domain_plateaus` (the old jar does not read `manifests/**` nor plateaus: the graph, the views and the files differ). And the saved map: `views generate -i datacentre-map` on `domain_technology_map` skips the view with a warning on the old jar and writes `datacentre-map.puml` on the new one.
- By hand, with the JVM jar of this tree, on copies in the scratchpad: the commands whose lines the manual quotes (see the review pass).
- Not verified: the editor on a screen, in any browser, in the light or the dark theme (every sentence about it was read from `standalone.html` and from the tests of runs 0096 to 0104, none from a pixel); the native image (the Native job of CI); `cargo test` and `embed.sh --check` (no Rust or wasm file changed); `tooling/docs/check-backlog.py` and the `docs/bkg/` sweep (neither exists in this repository).

## Canonical impact

The architecture description changes in two places of `CLAUDE.md`: the pointer to the limits of the manual (`[[plateau-limits]]` named #84, #88, #86 and #97, which are gone, and now names the issues the wave left open) and the sentence about the viewpoints (the command line draws a map when it is asked for it by its id). No domain invariant changes: nothing in `src/main` or `src/test` moved, and no other architecture or domain document describes the manual. `docs/fixtures/brightcart-spec.md` is the fixture's own document and was brought up to date (D7).

## Shipped files

The run ships no new example or fixture: `src/doc/examples` is unchanged (the manual now includes `domain_technology_map/workspace.yaml` and `domain_plateaus/plateaus/story.migration.yaml`, which `ManualExamplesTest`, `ShippedFilesTest` and `shipped-files.test.js` already load in both tools), and the TOML twin in the manual is a snippet pinned by `TomlManifestTest`, `TomlManifestIT` and the run of `query graph` on it (D5). The manual itself is built by the Asciidoctor step of `./mvnw verify`.

## Findings

- F1. The manual had a wrong option in its example of *Selective View Rendering*: `--view-id=view_a`, which picocli refuses. It is `--view` (short `-i`); fixed. The findings of runs 0099 (`--view-ids`) and 0090 would have copied the same mistake.
- F2 (wave, for the orchestrator). The issue #104 (null pointer for `header.parent` naming a dotted id) no longer reproduces: its own repro gives `error: `m/a.yaml` is not valid: the id `a.b` contains a dot ...` since run 0093 (cases M81 to M83 pin it). It is open on GitHub; close it with that reason (or by the wave's pull request, which does not name it).
- F3 (wave). The issues the manual's limits name are the ones the wave leaves open: #25 and #26 (the halves not built), #78, #82, #89, #94, #103, #105, #106, #107, #108, #109, #110, #111, #112, #113 (told where the walk is described), #114. Those the tools fix are out of the limits (their commits say which ones the pull request closes): #43, #44, #84, #86, #87, #88, #93 and #97. The orchestrator re-aims #25 and #26 (`--fail-on` and `--only-changes` done).
- F4 (wave). The gate criterion with `#/timeline\b` matches the routes of the pages (`#/timeline/applications`...), so it cannot be empty; the check that matters (no description of the old pages) is the other four words, which match nothing.
- F5. `docs/fixtures/brightcart-spec.md`, section 9, described views and stories in each plateau of the fixture; the committed fixture has none (the generator writes none). The section now says it is the plan of the study. Whether the fixture should ship a few views and one story (so that the tools are checked on files and not on a file added in a temporary copy) is a decision for the author; no issue was filed.
- F6. No defect of a tool was found while documenting, so no issue was filed. What looked odd and is not a defect: the table of `diff` quotes `+2 ~2 -2` but the Plateaus page shows chips (`+ 2 new`), which the manual now says in each place.
- F7. Files outside `likely_paths`: only this run document. `src/doc/README.adoc`, `CLAUDE.md`, `docs/fixtures/brightcart-spec.md` and `README.md` are inside; `src/site/**` needed no change.
- F8. The two wave files were not written. For the wave's final report: the manual and the tutorial are done, the gates above, the pull request closes the issues listed in F3.
