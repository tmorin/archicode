---
type: run
run: 0037
status: completed
wave: 008
---

# Run 0037: Views carry change

Wave 008 (`plateaus-and-baseline-diff`), item W-4 (phase P2). Focus: every box and link of a view knows what changed, and a view can
show only the changes with their context. Document profile: `single-document`, with a TDD-lite section (the Decisions below), as
runs 0034 to 0036: the scope arrives settled (the W-4 row, the rules the author decided on the marker, the stereotypes and the
options), the work is one crate and its Java adapter, and there was no live alternative worth a PRD, a TDD or a pln. This file
carries scope, decisions, the interface for the next runs, canonical impact, verification and findings.

## Context

Run 0036 built `compare` in the Rust kernel: a union of two plateaus where every element and relationship carries `change` in
`none | new | changed | removed` (and `natures`), a table of changes and counts. Nothing drew it yet. This run makes `compute`, the
kernel's view assembly, draw that union: the items and the links of a view say what changed, grouped links add their relationships
up, the stereotypes tell the state so that `styles.by-tags` styles it, a container with changes inside is marked, and a view can
keep only the changes with their context. The Java adapter learns the new fields and calls `compare`. The CLI commands (W-5), the
PlantUML default styles (W-5) and the editor (W-6, W-7) are not touched.

## Scope

In: `compute` and the facet document in the Rust kernel (`src/lib.rs`, `src/facet.rs`, the new `src/change_tests.rs`), the contract
bump to 3, the re-embedded wasm, the kernel README; in Java `Change`, `Item`, `Link`, `KernelViewpointFactory`, `ViewpointKernel`
(the `compare` export), and the new `KernelGraph`, `Comparison`, `PlateauComparer`; tests in cargo, Node and JUnit.
Out: any CLI command, any change of the PlantUML renderer (a test of its stereotype order is added, the renderer is not touched),
the editor's wrapper `compare` and anything of the editor but the contract constant.

## Decisions

Taken by the author (the brief; not reopened): `change` on items and links; a grouped link adds its relationships up (all new is new,
all removed is removed, any other mixture is changed, all unchanged is none); the computed stereotypes `new`, `changed`, `removed`
go last and a hand-written tag of the same name does not duplicate and keeps working, without a warning; a container whose only
changes are below it is not `changed` and carries a discreet computed marker of its own; `only_changes` keeps changes, ancestors and
the ends of changed links as context, marked, respects the facets and works with `hide_unlinked`; a view with no change information is
byte-identical to wave 007's; contract 3; no CLI command, no renderer change.

Taken by this run:

- **D1. How a caller gives `change`: merged into the elements and the relationships (decision asked for by the brief).** `compute`
  takes no second input. An element carries `change` (and `natures`) among its free-form fields, a relationship carries `change`.
  Reasons: `compare`'s union elements already are drop-in elements (`layer` and `parent_reference` are ignored); a facet reads the
  free-form fields of the elements it is given, so a facet reads `change` with no new machinery, which a side table would have
  forbidden; the stereotypes already read free-form fields; and there is one lookup per element, not two. The glue left to a caller
  is one thing: `compare` lists its relationships apart, so each is nested under the element that declares it
  (`from`, same `layer`). `Comparison` does it for Java (`unionElements(layer)`); the JS test shows the ten lines the editor will
  copy (W-6). Rejected: the compare result as a second input to `compute` (two lookups in every viewpoint, its own validation, and a
  facet cannot see a side table).
- **D2. Comparison or not.** When any element or any relationship of the input has a `change`, the view is a *comparison*: every item
  and every link says its `change` (`none` when it did not change), including an element given without `change`. Otherwise nothing
  is added, which is what keeps wave 007's output byte for byte (the fields are `skip_serializing_if`). It is read before the facets
  run: a facet that removes everything that changed leaves a comparison whose items say `none`, not a view that suddenly says
  nothing. `change` must be one of the four words (else `{error}`), `null` is not given.
- **D3. What an item says.** The change of its own element (a deployed application item: its element of the application layer),
  never an aggregate of what it contains or hides, plus the element's `natures` as sent (items only, the kernel knows no meaning for
  them; a relationship's `natures` are not carried, the table of `compare` has them).
- **D4. A relationship is the same relationship whatever happened to it.** `Rel` carries `change`, but its equality and order ignore
  it, as `OutRel`'s `from` is not part of the caption rule. Otherwise a new `calls` and an unchanged `calls` grouped under one link
  would stop "counting once" and the caption would fall back to the default label *because of the comparison*: the comparison must not
  change how a view is built, only what it says. The link's `change` is computed from its `OutRel`s (which carry `change`) after the
  folds, so the merge of two links by `merge_links` and the grouping by `collapse` are both covered.
- **D5. Stereotypes: the state goes last, and it moves.** `new`, `changed` or `removed` is appended last. A word already in the list
  (the author's own `rendering-stereotypes: "changed"` or a qualifier) is removed from where it was and put last, so it counts
  once *and* the computed state is the last word. Wave 007's dedupe keeps the first occurrence; keeping it here would have left
  the author's `new` in the middle of the list and the state not last, and "the computed state wins" would depend on where the author
  wrote it. Other words of the author (`changed` on an element that is `new`) stay, before the state, so the state overrides them
  property by property. An element that did not change keeps every hand-written tag as it was.
  **How the precedence was checked, in both renderers.** The kernel's list is [qualifiers, tag words, computed state]. (a) *Editor:*
  `stereotypeLookOf` lets a later stereotype override an earlier one (manual, `styles.test.js`); `change.test.js` runs `compare`
  then `compute` through the embedded wasm and the editor's own `stereotypeLookOf`: with a hand-written `changed` on a new element
  the fill and the line are `new`'s, with a hand-written `new` before a computed `changed` they are `changed`'s, and the marker
  differs from `changed` in its variables. (b) *CLI:* `PlantumlUtilities.generateStereotypes` writes the list reversed, so the state
  is the first stereotype of the box, and PlantUML lets the first win (run 0021); `PlantumlUtilitiesTest` asserts the string
  `<<new>> <<changed>> <<external>> <<Spring Boot>> <<container>> <<atomic>>`. (c) *PlantUML itself:* a hand-written `.puml` with the
  four style blocks and boxes written as the CLI writes them was rendered with `plantuml-1.2024.7.jar` (a jar of another project on the
  machine, read only, nothing added): `<<new>> <<changed>> <<external>>` is filled with `new`'s colour, keeps `changed`'s line style
  and `external`'s line colour; `<<changed>> <<new>> <<external>>` is filled with `changed`'s colour; `<<contains-changes>>
  <<external>>` takes the marker's dashed red line and `external`'s fill (so a hyphen in a style selector is valid). The jar
  renders the output of the CLI only for what was written by hand: the CLI cannot yet generate a comparison view (W-5).
- **D6. The marker is `contains-changes`.** A stereotype of its own, so a style can give it a line style, a glyph or a badge: it
  is told from `changed` without colour. It is added when the element's own change is `none` and some element below it *in the
  reference tree* (the references are prefixes, so a missing intermediate element does not hide it) is new, changed or removed. A
  relationship that changed counts through its source element's `change` (that is what `compare` writes: the source is `changed`
  with `relationships-added`...), the relationship's own `change` is not read for this. A container that is itself new, changed or
  removed has no marker: its state says it, and the marker means "nothing here, something inside". It is computed from the elements
  the view is given (after the facets), also for a folded box, where it is the only trace of the changes the fold hides. The name is
  a constant (`STEREOTYPE_CONTAINS_CHANGES`) and in the README; the manual and the legend are W-5 and W-8's.
- **D7. `only_changes`.** An input option like `hide_unlinked`, not a facet property. Order: the facets (on the union, they read
  `change`), the viewpoint, `hide_unlinked` (technology layer), the folds, the grouped links' changes, then `only_changes`, on the
  items and links as drawn. Kept: items and links with a change; the ends of changed links that are drawn (a secondary link, which is
  not drawn, does not pull its ends in); a folded item that hides changes (otherwise a fold would silently drop them: it keeps its
  marker); the focal item; and the ancestors of all of them. `context: true` marks an item kept for no change of its own. A link is
  kept for its own change only. Two choices that go beyond the brief and are cheap to take back: **the focal item always stays**, as
  with `hide_unlinked`, so that a view without changes is one box, not an empty diagram a renderer may not like; and **the unchanged
  links between kept items are left out**, as the brief says ("the elements and links whose change is new, changed or removed"), so
  context is boxes, not lines. Without any `change` in the input, nothing changed: the focal item and its ancestors stay, as
  context. `expandable` is asked to the same filtered view (`mark_expandable` builds it again), so a box is offered only when
  opening it shows something that changed.
- **D8. Facets read `change`.** The document a facet path is evaluated against gets `change` (and the free-form `natures`) on an
  element, and `change` on a relationship; `read_document` reads a relationship back with it. `$..relationships[?(@.change=='removed')]`
  and `$.application..elements[?(@.change=='removed')]` work through the existing JSONPath machinery: tests in cargo (`change_tests.rs`)
  and in JS. Not done: `apply_facet`, the CLI's entry that filters the JSON of a *workspace*, is unchanged, and nobody yet writes
  `change` in a workspace's JSON; W-5 either gives the facet to `compute` (its `facet` input), or puts `change` in that JSON. Said
  in "the interface".
- **D9. Contract 3.** The output of `compute` gained fields and a stereotype; the version is 3 in the Rust (`CONTRACT_VERSION`), in
  `ViewpointKernel.CONTRACT_VERSION` and in `standalone.html`'s `KERNEL_CONTRACT_VERSION` (one token; the editor page shows
  "kernel contract 3" in its help, so `help.test.js` says 3, and `conformance.test.js` expects 3). `compare` answers 3 too.
- **D10. Java.** `Change` (NONE, NEW, CHANGED, REMOVED; `Change.of(word)`); `Item` gets `change`, `natures`, `context`, `Link` gets
  `change`, all defaulting to the "nothing" (NONE, empty, false), so a renderer that ignores them draws what it always drew.
  `KernelGraph` is the element-to-JSON code lifted out of `KernelViewpointFactory` (the JSON it gives for a view is unchanged; with
  `withProperties` it adds `kind`, `name`, `description`, which `compare` reads: the same function builds the input of both calls,
  so the CLI and the editor see the same elements). `PlateauComparer.compare(base, target)` takes two loaded `Workspace`s and returns
  a `Comparison`, an immutable read of the answer: union elements and relationships, the table (`Row`), the counts. A failure of
  the kernel, or another contract version, is an `ArchiCodeException`. `KernelViewpointFactory` gets a second constructor
  `(viewpoint, objectMapper, comparison, onlyChanges)`: with a comparison, the kernel is given the union of the layer
  (`Comparison.unionElements`, relationships nested) instead of the elements of the index, and `only_changes` is passed; the
  two-argument constructor `(viewpoint, objectMapper)` is what the services use and does what it did.
  **What the workspace must hold.** An `Item` is made of the `Element` it stands for, so the workspace given to the factory must have
  every element of the union, removed ones included, in its indices (W-5 builds it from the target plus the base's removed
  elements). A removed *relationship* of a surviving element needs nothing: the factory makes the `Relationship` from the
  comparison when the element does not declare it. New classes are registered in `reflect-config.json` (`NativeReflectionConfigTest`).

## The interface for the next runs

- **W-5 (CLI, `diff`, `views generate --baseline`).** `new PlateauComparer(objectMapper).compare(baseWorkspace, targetWorkspace)`
  gives a `Comparison` (`getCounts()`, `getChanges()` sorted rows with `before`/`after`, `getElements()`, `getRelationships()`).
  A view of the pair is `new KernelViewpointFactory(viewpoint, objectMapper, comparison, onlyChanges)` over a workspace whose
  indices hold the union (target plus the base's removed elements); `Item.getChange()`, `getNatures()`, `isContext()`,
  `getStereotypes()` (state last, `contains-changes` for a container) and `Link.getChange()` are what the PlantUML renderer reads.
  `ViewpointService`s build their factory with two arguments: the three services (`overview`, `detailed`, `deep`) will need to take a
  comparison, a one-line change each, or W-5 builds the factory itself. The style blocks of `new`, `changed`, `removed` and
  `contains-changes` are `styles.by-tags` keys (`.contains-changes { }`: a hyphen is valid in a selector, checked with PlantUML
  1.2024.7); the default styling is W-5's. A faceted workspace of a comparison: `apply_facet` does not see `change` (D8).
- **W-6 and W-7 (editor).** `loadViewpointKernel` exposes `compute`; add `compare` (the JS test has the ten lines). The union to draw is
  `elements` of `compare` for a layer, each with `relationships.filter(r => r.layer === layer && r.from === e.reference)` nested
  (`unionElements` in `change.test.js`); give it to `compute` as `elements` (and `app_elements` for the technology layer), with
  `only_changes` for "Changes only". The legend and the glyphs: `new`, `changed`, `removed`, `contains-changes` are plain
  stereotype names in `item.stereotypes`, `item.context` says "grey it". A stereotype is styled by `workspace.styles`; the editor
  needs defaults for the four when the author styled none.
- **W-8 (manual).** The marker `contains-changes` and the four states are documented in the kernel README ("Views of a comparison");
  the manual and the legend are for W-5 (CLI) and W-8.

## Canonical impact

None to canonical documents (`docs/` holds the run and wave records only). `CLAUDE.md`'s architecture paragraph names `apply_facet`
as the kernel's second entry point and `compare` is not named there (run 0036 said so); a line on `compare` and on the views of a
comparison is the orchestrator's call. The kernel README is updated ("Views of a comparison"); the manual does not document the
kernel's entry points.

## Tasks

| Id | Task | Status |
|----|------|--------|
| T1 | Read the W-4 row, run 0036 and its interface, the kernel (`lib.rs`, `facet.rs`), the README, the Java adapter, the renderer's stereotype order | done |
| T2 | Rust: `Change`, `change` on `Rel` (equality unchanged), `OutRel`, `OutLink`, `OutItem`; `only_changes`, the comparison flag | done |
| T3 | Rust: the aggregate, the marker, the computed stereotypes, `only_changes`, the facet document | done |
| T4 | Cargo tests (`src/change_tests.rs`): each rule, facets, hide_unlinked, determinism, no change byte-identical, errors, union of `compare` | done |
| T5 | Contract 3: Rust, Java, `standalone.html`; `embed.sh`, `embed.sh --check` | done |
| T6 | Java: `Change`, `Item`, `Link`, `KernelGraph`, `Comparison`, `PlateauComparer`, `KernelViewpointFactory`, `ViewpointKernel.compare`, `reflect-config.json` | done |
| T7 | Java tests: `PlateauComparerTest`, `PlantumlUtilitiesTest` (the order of the state) | done |
| T8 | JS tests: `change.test.js`; `conformance.test.js` and `help.test.js` say 3 | done |
| T9 | README of the kernel | done |
| T10 | PlantUML 1.2024.7: precedence and a hyphenated selector, on a hand-written `.puml` | done |
| T11 | Byte-identical views, HEAD jar against this run's jar, on fixtures and copies of the real workspaces | done |
| T12 | The real pair through `compare` then `compute` (every element, three viewpoints, with and without `only_changes`) | done |
| T13 | Full suites: `cargo test`, `embed.sh --check`, `node --test`, `./mvnw test`, `./mvnw verify`, Prettier | done |

## Acceptance criteria (the W-4 row and the brief)

- AC1. Items and links carry `change`; a removed element and a removed relationship are drawn, a removed child under its parent or
  under a removed parent: `the_items_and_the_links_of_a_view_carry_what_changed`, `a_removed_element_and_a_removed_relationship_...`,
  `the_overview_of_a_removed_element_...`; JS `the union that compare gives is drawn by compute`; Java `shouldTellEveryItemAndLinkOfAViewWhatChanged`.
- AC2. A grouped link: `a_grouped_link_adds_up_the_changes_of_what_it_stands_for` (nine mixtures), the caption rule is unchanged
  (`what_changed_does_not_change_how_a_link_is_grouped_nor_its_caption`), the overview's grouping, the JS test over every link.
- AC3. Stereotypes: `the_state_of_an_element_ends_its_stereotypes`, `a_word_the_author_wrote_is_not_repeated_...`, the unchanged
  tag stays; the precedence in the editor (JS), in the CLI (Java string), in PlantUML (D5).
- AC4. The container: `a_container_whose_descendants_changed_is_not_changed_...`, `..._even_when_the_box_is_folded`, `a_container_that_
  changed_by_itself_has_no_marker...`, `a_relationship_that_changed_counts_through_the_element_that_declares_it`, the application
  layer of a deployed item.
- AC5. `only_changes`: keeps changes, ends, ancestors, context marks, the focal item, the fold, the map, no change in the input;
  `only_changes_and_hide_unlinked_work_together`; the facet is read first (`a_facet_reads_the_change_of_an_element_too_...`).
- AC6. A facet reads `change`: `$..relationships[?(@.change=='removed')]` in cargo and in JS.
- AC7. No `change`, the same bytes: `an_input_without_change_gives_the_bytes_of_a_call_without_the_new_options` (five viewpoints,
  `only_changes` false and null, none of the new fields in the text), `a_comparison_in_which_nothing_changed_draws_the_same_boxes_and_
  links`, JS over the fixture's views, the fixture views of `ViewpointKernelFixtureTest`, and 5081 `.puml` generated by two jars.
- AC8. Determinism: `the_same_comparison_gives_the_same_bytes_whatever_the_order_of_its_elements`, JS, Java `compare` twice.
- AC9. Java: `Item`/`Link` fields, `PlateauComparer`, `Comparison`, the kernel's `compare` export, errors and versions.
- AC10. Contract 3 everywhere; `embed.sh --check` passes.

## Review passes

Run inline (one document; no subagent dispatched, as in runs 0034 to 0036).

- **KDMLLC.** K: the logic is four small functions (`aggregate`, `above_changes`, `annotate`, `keep_changes`) and one in
  `add_stereotypes`; `Rel` has an equality by hand so that no other code moved; the Java is a result type, a one-call entry and four
  lines in the factory. D: the element-to-JSON code exists once (`KernelGraph`, used by the views and by the comparison); the four
  words are one enum on each side; the order of the natures stays `compare`'s. M: each rule of the brief has a test (the AC list);
  every option combination that exists (fold, `hide_unlinked`, facet, map) is covered once. L: no `natures` on relationships, no
  per-link natures, no CLI wiring in the services, no editor wrapper, no `unchanged` count; the focal item and the folded marker are
  the only additions to the brief and are recorded as decisions. U: the README and D1 to D10 say what each field means, and why the
  state *moves*. C: below.
- **C scan.** Claim "no change, the same bytes": proven by construction (every new field is skipped when absent), by the unit tests
  above, by the 540-view fixture of the Java conformance test and the Node tests, and measured on 5081 files generated by two jars
  from nine fixtures and two copies of the author's workspaces (`diff -r` empty). Claim "the computed state wins": proven in three
  places (D5); it relies on a rule documented in the manual (stereotypes section: a later one overrides an earlier one in the
  editor, the CLI writes them last first), which `PlantumlUtilitiesTest` and `styles.test.js` already held. Claim "a facet reads
  `change`": proven. Claim in the brief "a container whose only changes are in its descendants is not `changed`": `compare`
  already does not mark a container for its children (run 0036, tested), the view does not either, and the marker is added to say it.
  Claim in the wave plan "grouped link: all new = new, all removed = removed, any other mixture = changed": the brief adds "all
  unchanged = none", which is the only case left. **A claim that is only partly true:** the brief says the marker is "documented in
  the manual-to-be and the legend": the README documents it; the manual and the legend are W-5, W-6 and W-8's, the kernel has no
  legend. Said in the interface.
- **Open questions.** None left. D5 (the state moves), D7 (the focal item stays, unchanged links are left out) and D6 (no marker on a
  container that changed itself) are decided with their reasons; each is one place in the code.

## Verification

All with the repository's own commands. `JAVA_HOME=/home/tibo/.sdkman/candidates/java/25.0.4-tem` for Maven.

### Results

- `cargo test --manifest-path src/main/rust/viewpoint-kernel/Cargo.toml`: 133 passed, 0 failed (100 before, plus 33 in `change_tests`).
- `src/main/rust/viewpoint-kernel/embed.sh` then `embed.sh --check`: "the committed WebAssembly is the one the sources build
  (601247 bytes)" (591,445 before: +9.8 kB).
- `node --test "src/test/javascript/**/*.test.js"`: 652 tests (643 before, plus the 9 of `change.test.js`), 652 pass, 0 fail.
- `npx prettier --check "src/**/*.java"`: clean.
- `./mvnw -o test` and `./mvnw -o verify` with JDK 25: both exit 0, 190 tests, 0 failures, 0 errors, 0 skipped (179 before, plus the 10 of
  `PlateauComparerTest` and the 1 added to `PlantumlUtilitiesTest`); `NativeReflectionConfigTest` passes with the ten classes registered.
  The integration tests are skipped by default (`skipITs`), as `CLAUDE.md` says.
- **Byte for byte, CLI.** `git archive HEAD` built into a jar in the scratchpad (before) and the jar of this run (after), `views generate`
  run in place on copies of `src/doc/examples/{domain_application, domain_technology, domain_viewpoint_views, domain_workspace,
  facet_example_step_1..4}`, `src/test/resources/viewpoint-kernel/workspace` and of the author's `as-is` and `to-be`: **5081 `.puml`**
  (13 + 11 + 11 + 12 + 26 + 26 + 52 + 52 + 540 + 927 + 3411), `diff -r` of the two trees empty for each of the 11 workspaces, and
  the `md5sum` of the sorted `.puml` of `to-be` identical (37c8d313...). The originals were only read: the `md5sum` of their files (41
  and 50) is the same before and after the copies were made. Nothing of them is in the repository.
- **The real pair through the whole chain** (throwaway script in the scratchpad, not committed): the copies of `as-is` and `to-be`
  loaded by the editor's own loader, `toKernelElements`, `compare` (58 ms), then `compute` on the union for every element of both
  layers, in the three viewpoints, with and without `only_changes`: 1026 views, **no error** except the 14 `detailed` views of
  elements that are not parents (the expected `not a parent` error), 5.7 ms a view; the counts are those of run 0036 (38 new, 5
  removed, 26 changed; 71 new, 15 removed, 12 changed relationships); the map with `only_changes` is the same bytes for a reversed
  input.
- **PlantUML 1.2024.7** on a hand-written `.puml`: see D5(c).

## Findings

- **For the wave (W-5 to W-8).**
  - *The three `ViewpointService`s* build `new KernelViewpointFactory(NAME, mapper)`; a comparison needs the 4-argument constructor.
    W-5 chooses how the comparison reaches them (a field of the `Workspace`, or the factory built by the command). Not done here:
    `workspace/**` and `cli/**` are W-5's paths.
  - *`apply_facet` does not see `change`* (D8). The CLI applies a facet to the JSON of the workspace *before* the views: for a
    compared faceted workspace W-5 must either hand the facet to `compute` (its `facet` input reads `change`) or write `change` in
    the JSON `apply_facet` filters.
  - *The union as a workspace.* The factory needs every union element in the indices of the workspace it is given (D10). That is a
    merge of the base's removed elements into the target's indices, in `workspace/**`; the removed relationship needs nothing.
  - *The editor's help* shows "kernel contract 3" (`help.test.js` follows).
  - *The wasm* is 601,247 bytes (+9.8 kB), about +13 kB in `standalone.html`.
  - *Technology layer views of a comparison in Java* are covered by the kernel tests (cargo and JS), not by a Java test: the Java
    test is on the application layer.
- **`CLAUDE.md`'s architecture paragraph** could name `compare` and the views of a comparison (the orchestrator's call).
- **Files touched outside `likely_paths`:** `src/main/resources/editor-webapp/standalone.html` (the contract constant, one token, and
  the re-embedded wasm block by `embed.sh`), `src/main/resources/META-INF/native-image/io.morin.archicode/archicode/reflect-config.json`
  (ten classes, required by `NativeReflectionConfigTest`), `src/test/java/io/morin/archicode/rendering/plantuml/PlantumlUtilitiesTest.java`
  (one test of the order of the state; the renderer is not touched), `docs/**` of this run. Inside: everything else
  (`src/main/rust/viewpoint-kernel/**`, `src/main/wasm/viewpoint_kernel.wasm`, `src/main/java/io/morin/archicode/viewpoint/**`,
  `src/test/java/io/morin/archicode/viewpoint/**`, `src/test/javascript/viewpoint-kernel/**`).
- **Not verified.**
  - The editor in a real browser: only the constant moved; the page embeds the same module and `compare`/`only_changes` are not called
    by any page code yet.
  - A comparison view generated by the CLI into `.puml`: there is no command yet (W-5). The PlantUML check is on a hand-written file.
  - A Java view over a *real* union workspace: `PlateauComparerTest` builds the union by hand, as W-5 will have to from two loaded
    plateaus.
  - The native build (`-Dnative`): not run; `NativeReflectionConfigTest` passes with the ten new classes registered; the new Java
    uses `JsonNode` only, no reflection of its own.
  - Performance beyond the real pair (about 170 elements).
  - Cargo's `target/` of the kernel is untracked build output and was not committed or cleaned.
