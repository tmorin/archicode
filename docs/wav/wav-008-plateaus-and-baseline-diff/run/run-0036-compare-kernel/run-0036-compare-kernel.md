---
type: run
run: 0036
status: completed
wave: 008
---

# Run 0036: Compare kernel

Wave 008 (`plateaus-and-baseline-diff`), item W-3 (phase P2). Focus: get, for two plateaus, the same list of new, changed and
removed things in the CLI and in the editor. Document profile: `single-document`, with a TDD-lite section (the Decisions below), as
runs 0034 and 0035: the scope arrives settled (the W-3 row and the rules of the design study the author approved), the work is one
pure function in one crate, and there was no live alternative worth a PRD, a TDD or a pln. This file carries scope, decisions, the
interface for the next runs, canonical impact, verification and findings.

## Context

The kernel (Rust compiled to WebAssembly, `src/main/rust/viewpoint-kernel`) is shared by the CLI (Chicory, `KernelViewpointFactory`)
and by the editor (`standalone.html`). Wave 008 draws two plateaus of one architecture and the difference between them. Doing the
comparison in the kernel is what makes the CLI's `diff` and the editor's Changes panel list the same things. This run builds only
that function, its embedded wasm and the tests that run the wasm. The Java adapter and the views that carry `change` are W-4, the
CLI commands W-5, the editor W-6 and W-7. Nothing of them is done here.

## Scope

In: `compare` in the Rust kernel (`src/compare.rs`, exported in `lib.rs`), cargo tests, a JS test through the committed wasm, the
rebuilt and re-embedded wasm, the kernel README. Out: any Java, any change of `standalone.html` other than the re-embedded wasm
block, any change of `compute` or `apply_facet`.

## Decisions

Taken by the author (the brief; not reopened): identity is the dotted reference; a moved, renamed or split element is `removed`
plus `new` (a `replaces` hint is a later wave: no `hints` input now); `changed` is judged on normalised own properties and own
outgoing relationships, `rendering-*` tags and the order of lists ignored, a container is not changed by its children;
relationships keyed by (source, destination, label), one removed plus one new label for a pair is a label change when the pairing
is unambiguous; the output is a union model, a table and counts; errors follow `compute`.

Taken by this run:

- **D1. Input.** `{ base: { application: [element], technology: [element] }, target: { ...same } }`, a missing or `null` list being
  empty. The element is the one `compute` takes (`Elem`: `reference`, `parent`, `applications`, `uses`, `relationships`, and the
  free-form `kind`, `name`, `description`, `qualifiers`, `tags` in `other`). So the editor's `toKernelElements(map, true)` and what
  W-4 will build in Java already fit. Two layers are two keys, not a `layer` argument, because the comparison is one answer over
  both and the technology layer needs the application layer of its own plateau (to check `applications`). Identity is
  (layer, reference): the same reference in the two layers is two things (tested).
- **D2. Output.** `{ version, elements, relationships, changes, counts }`, written by serde structs (fixed field order) with keys
  sorted wherever a map is written, so the bytes depend on the content only.
  - `elements[]`: `layer`, `reference`, `parent` (as sent: can contain others, so a union element is a drop-in for `compute`'s
    input), `parent_reference` (read from the dotted reference; absent at the root), `kind`, `name`, `description` (when given),
    `qualifiers`, `tags` (all of them, `rendering-*` included), `applications`, `uses`, `change` (always present: `none`, `new`,
    `changed`, `removed`), `natures` (only when changed), `wording_only` (only when true), then the other free-form fields of the
    element with their keys sorted. The target's version is shown, the base's for a removed element. An extra field named like
    one the union writes (`change`, `natures`, ...) is dropped, so that a union fed back cannot pose as an answer.
  - `relationships[]`: `layer`, `from`, `destination`, `label` (null when none), `qualifiers`, `tags`, `change`, `natures`.
  - `changes[]`, the table: the changed elements, then the changed relationships, each in the order of the union. An element row:
    `thing: "element"`, `layer`, `reference`, `kind`, `name`, `change`, `natures`, `wording_only`, and for `changed` only `before`
    and `after` (the properties that differ, sets sorted, tags without `rendering-*`). A relationship row: `thing:
    "relationship"`, `layer`, `reference` (the source), `destination`, `label`, `change`, `natures`, `before`, `after`
    (`label`, `qualifiers`, `tags`, those that differ).
  - `counts`: `elements { new, changed, removed, wording_only }`, `relationships { new, changed, removed }`. `wording_only` is a part
    of `changed`, not an addition to it, so that a screen can say "26 changed, 10 wording only"; no `unchanged` count, so that a
    plateau against itself is all zeros.
- **D3. The natures** are a closed list, always written in this order: `kind`, `name`, `description`, `qualifiers`, `tags`,
  `deployment` (`applications` and `uses`: one nature, the row says which), `relationships-added`, `relationships-removed`,
  `relationships-changed`. For a relationship: `label`, `qualifiers`, `tags`. Wording-only means the natures are exactly
  `["description"]`: a description change next to a relationship change is not wording only. (This differs from the design
  study's count of "property changes", which ignores relationships: see the real-data check.)
- **D4. Normalisation.** Texts (`kind`, `name`, `description`, labels) are compared with line ends unified (`\r\n` to `\n`) and
  trimmed; an absent, `null` or empty text is the same. The internal whitespace is not touched: a re-wrapped paragraph is a
  change, because telling a re-wrap from an edit is a guess. Qualifiers, `applications` and `uses` are sets; tags are a map
  without the keys that start with `rendering-`. An empty label is no label (`label: ""` and no `label` are one key).
- **D5. Free-form fields beyond the five properties are not compared.** The kernel knows no meaning for them (a source file name, a
  layout hint, an id), a nature needs a closed meaning, and a field the caller wants compared is a field it can name as one of the
  five. They travel in the union, from the side shown. Said in the README. The author can add a property in one place
  (`compare_props`).
- **D6. Relationship pairing.** Group by key; in a key, equal relationships (same qualifier set, same compared tags) match first; the
  rest are paired in sorted order as `changed` (qualifiers or tags); the surplus is `new` or `removed`. Then, over what is left
  (removed and new, across keys), per (layer, source, destination): exactly one removed and exactly one new is one `changed`
  relationship (`label`, plus the other natures if they moved); otherwise they stay as they are. The pairing never crosses a source or
  a destination, and never crosses a layer.
- **D7. Errors**, as `compute` reports them (`{ "error": text }`, never a trap): `dangling reference: x` for a relationship or a
  `uses` entry that points at an element its own plateau does not have, `dangling application reference: x` for a deployed
  application missing from the application layer of its plateau, `duplicate reference: x` for a reference twice in one layer of one
  plateau (the CLI's loader refuses it already; here it would make the answer depend on the order), `invalid input: ..`. Each
  message of the first three ends with the element and `in the base plateau` or `in the target plateau`. Both plateaus are checked
  on their own, the base before the target and the lists sorted, so the first error does not depend on the order of the input. A base
  relationship that ends on an element only the base has is no error (the check is per plateau, the union is not checked).
- **D8. Contract version stays 2.** Bump when a caller must know. A caller cannot meet `compare` without being built with this
  wasm (the CLI translates the committed `.wasm`, the editor embeds the same bytes, a test checks that they are one build), and
  `compute` and `apply_facet` take and give what they gave. The version is returned by `compare` and checked by the callers as for
  `compute`. W-4, which changes what `compute` gives (`change` on items and links), is the run for which a caller must know:
  that is where 3 belongs, and it needs the Java constant and `KERNEL_CONTRACT_VERSION` in `standalone.html` to move, which
  are outside this run's paths.
- **D9. Determinism.** The order of the input lists (elements, relationships, `applications`, `uses`) and of the keys of maps never
  shows. The single exception, on purpose: `qualifiers` keep the order declared on the side that is shown, because the stereotypes
  of a box are drawn in that order and a union that drew them sorted would not match the view of the plateau alone. Two inputs that
  differ only in the order of the qualifiers of an unchanged element differ in that one list. Said in the README.

## The interface for the next runs

- **W-4 (Java adapter, views).** Add `compare` to `ViewpointKernel` the way `applyFacet` is (alloc, call `compare`, read
  `result_ptr`); the element JSON is the one the adapter already builds for `compute` (all five properties, `qualifiers`, `tags`,
  with `withProperties` on), once per layer and plateau. A union element and a union relationship carry `change` and `natures`; to
  draw them, feed `elements` (with each element's `relationships` rebuilt from `relationships` grouped by `from`, or accepted by
  `compute` directly) to `compute`: `parent` is already a drop-in, `layer` and `parent_reference` are ignored by it, and a removed
  element keeps its place under its parent because its parent is in the union. For a grouped link, the `change` of its relationships
  is what W-4 aggregates (the union relationships are the ones a link stands for). The editor's wrapper `loadViewpointKernel` gets
  a `compare(input)` method beside `compute`, a copy of it with the export name changed (W-6's first edit, or W-4's if it needs
  it earlier). The test of this run shows the protocol (`compare.test.js`, `loadEmbeddedKernel`).
- **W-5 (`archicode diff`).** The table is the content of the report: `changes` is already sorted and typed (`thing`, `change`,
  `natures`, `before`, `after`, `wording_only`), so text, Markdown and JSON are three renderings of the same rows, and "hide
  wording-only" is `row.wording_only !== true`. `counts` is the header. The CLI calls `compare` once for the pair of plateaus
  (base, target) it loaded with `WorkspaceFactory.create(path, viewsDir, plateauId)`.
- **W-6 and W-7 (editor).** The union is what the map is laid out on (a removed element keeps its place); the Changes panel is
  `changes` and `counts`; the inspector's before and after is the row of the element, and the relationships added or removed of
  an element are the union relationships with that `from` and a `change` other than `none`. The editor needs the elements of a
  second plateau, built by `toKernelElements` from a second `AppState.index` (run 0035's finding: the reading loop must become a
  function of a folder).
- **Left open for a later wave** (`replaces`): a `hints` input (`{ replaces: [{ from, to }] }`) fits beside `base` and `target`
  without touching the rest; nothing is implemented or reserved in the code.

## Canonical impact

None to canonical documents (`docs/` holds the run and wave records only). `CLAUDE.md`'s architecture paragraph names `apply_facet`
as the kernel's second entry point and does not name `compare`: a line there is the orchestrator's call (outside this run's paths,
as run 0035 said of plateaus). The manual (`src/doc/README.adoc`) does not document the kernel's entry points, so it is left to
W-8, which documents the user-visible commands. The kernel README is updated (a section, "Comparing two plateaus").

## Tasks

| Id | Task | Status |
|----|------|--------|
| T1 | Read the kernel (`lib.rs`, `facet.rs`), the README, the editor's `toKernelElements` and loader, the JS harness | done |
| T2 | `src/compare.rs`: model, normalisation, element and relationship comparison, union, table, counts, errors | done |
| T3 | Export `compare` in `lib.rs` (C ABI, doc of the contract) | done |
| T4 | Cargo tests on invented pairs, one or more per rule | done |
| T5 | `compare.test.js`: the committed wasm, the protocol, determinism, the fixture, errors, `compute` untouched | done |
| T6 | `embed.sh`, `embed.sh --check` | done |
| T7 | README of the kernel | done |
| T8 | Real data: the author's pair, read-only, through a throwaway script in the scratchpad | done |
| T9 | Full suites: `cargo test`, `node --test`, `./mvnw test` (the Java must still load the new wasm) | done |

## Acceptance criteria (the W-3 row)

- AC1. New and removed by reference, per layer: `a_reference_only_the_target_has_...`, `the_same_reference_in_the_two_layers_...`,
  `a_moved_or_renamed_element_...`.
- AC2. Each nature, from normalised properties: `each_property_has_its_nature` (name, kind, qualifiers, tags twice, description),
  `deployment_is_the_applications_and_the_uses_of_a_node`, the relationship natures in `a_relationship_is_new_removed_or_unchanged...`
  and `qualifiers_and_tags_make_a_relationship_changed...`; the row's before and after in `the_row_of_a_changed_element_...`.
- AC3. Not changed: `a_rendering_tag_is_not_a_change`, `the_order_of_lists_is_not_a_change`, `text_is_compared_trimmed_...`,
  `the_other_fields_travel_and_are_not_compared`, and `a_container_is_not_changed_because_a_child_is`.
- AC4. Wording is typed and counted apart: `a_change_of_description_alone_is_wording_and_is_counted_apart`.
- AC5. Relationships: `a_removed_label_and_a_new_one_...` (label changed), `a_label_that_changed_with_its_qualifiers_says_both`,
  `two_removed_or_two_new_for_a_pair_are_not_paired` and the ambiguous case in the first relationship test,
  `a_label_is_paired_with_another_one_of_the_same_pair_only`, `relationships_that_differ_by_their_tags_...`,
  `an_empty_label_is_no_label`.
- AC6. Union: a removed parent with its removed child (and the other way round), the relationships of new and removed elements, a
  base relationship ending on a removed element and a new one ending on a new element is no error.
- AC7. A plateau against itself: empty table, zero counts (`a_plateau_compared_with_itself_...`, and the JS test on the fixture).
- AC8. Byte-stable: `the_same_input_gives_the_same_bytes_whatever_the_order_of_its_lists` (a pair that exercises every nature,
  shuffled twice) and the same in JS through the wasm.
- AC9. Both layers, errors: `the_technology_layer_is_compared_...`, `a_dangling_reference_...`, `a_reference_declared_twice_...`.
- AC10. `embed.sh --check` passes; the editor's embedded module exports `compare` and is byte-identical to `src/main/wasm`
  (`compare.test.js`, first test).

## Review passes

Run inline (one document; no subagent dispatched, as in runs 0034 and 0035).

- **KDMLLC.** K: one new file, one function per rule, the output built by serde structs and three small maps; D: the order of the
  natures and the normalisation are written once (`compare_props`, `norm_text`, `compared_tags`) and the relationship natures reuse
  them; M: each rule of the brief has a test (the AC list above), and the output has one place per fact (`counts` counts what the
  table lists); L: no `hints`, no per-layer counts, no `unchanged`, nothing for W-4 to W-7 (no Java, no wrapper method in
  `standalone.html`); U: the README says what each field is and what `wording_only` is a part of; C: see below.
- **C scan.** Claim "a plateau against itself is empty": tested in Rust, in JS on the fixture, and measured on the author's two real plateaus each against
  itself (zero rows, zero counts). Claim "the output is byte-stable": tested by shuffling every collection of the input twice;
  **partly** true by design for `qualifiers` (D9), said in the README and the module doc. Claim "`wording_only` is countable apart":
  `counts.elements.wording_only` is a part of `changed`; the README says so. Claim "contract unchanged": `compute`'s tests (69 before)
  still pass unchanged, and the JS test asserts `compare` answers the version the editor expects. Claim "errors as `compute`": same
  key (`error`), same prefix text for the dangling cases; `compute` says only `dangling reference: x`, `compare` adds where.
  Claim in the wave plan "ignore the order of ... relationships": the order of the relationships of an element is ignored.
- **Open questions.** None left. D4 (internal whitespace), D5 (free-form fields) and D9 (qualifier order) are decided above with
  their reasons; each is one place in the code.

## Verification

All with the repository's own commands. `JAVA_HOME=/home/tibo/.sdkman/candidates/java/25.0.4-tem` for Maven.

### Results

- `cargo test --manifest-path src/main/rust/viewpoint-kernel/Cargo.toml`: 100 passed, 0 failed (69 before, plus 31 in `compare::tests`).
- `src/main/rust/viewpoint-kernel/embed.sh` (rebuild and re-embed), then `embed.sh --check`: "the committed WebAssembly is the one the
  sources build (591445 bytes)".
- `node --test "src/test/javascript/**/*.test.js"`: 643 tests (637 before, plus the 6 of `compare.test.js`), 643 pass, 0 fail.
- `./mvnw -o -q test` with JDK 25: exit 0, 179 tests, 0 failures, 0 errors (the surefire reports; the same count as run 0035): the CLI
  translates the new wasm and `compute` and `apply_facet` answer as before. The Java was not touched.
- **The real pair, read-only.** The author's `as-is` and `to-be` were copied to the scratchpad (`md5sum` of their 91 files identical
  before and after; nothing of them, no text or number, is in the repository). A throwaway script (scratchpad, not committed) loaded
  each copy with the editor's own loader (`harness.js`, `loadWorkspace`), built the elements with `toKernelElements`, and called
  `compare` through the embedded wasm. Elements 133 to 166 (the study counted 132 to 165: the loader of the editor counts one more
  on each side; the difference is the same). Result: elements **38 new, 5 removed, 26 changed** (21 application, 5 technology
  layer among the changed), relationships **71 new, 15 removed, 12 changed**, 146 kB of JSON, identical bytes on a second call.
  The comparison of each plateau against itself: zero rows, zero counts.
  - *Against the study (79 new, 23 removed, 4 changed relationships; 8 pairs where only the label changed).* 71 + 8 = 79, 15 + 8 =
    23, 4 + 8 = 12: the study counted the 8 label-only pairs as one removed plus one new, `compare` reads them as 8 `changed` (nature
    `label`, 8 of the 12; the other 4 are `tags`). Nothing else differs.
  - *Elements.* 38 new and 5 removed as the study. Changed: the study's 25 included 4 changed only by the hand-written
    `rendering-stereotypes` tag; those 4 are not changed here, which leaves 21 elements whose own properties changed, the study's
    count of "property changes". On top of those, 5 elements changed only by their relationships (not in the study's property
    count): 26. Natures of the changed: description 17, name 1, qualifiers 3, deployment 3, relationships-added 8, -removed 3,
    -changed 7.
  - *Wording.* The study's "14 of 21 property changes are wording only": 14 elements have a description as the only property that
    changed (confirmed). `counts.elements.wording_only` says **10**: 4 of those 14 also gained, lost or changed a relationship, so
    they are not wording only for an element (D3). If the author wants the 14 (the property-level notion), it is a filter of the
    rows (`natures` without `relationships-*` equal to `["description"]`), not a new rule; W-7's "hide wording-only changes" will
    say which of the two it means (W-8 checks it on the real pair).

## Findings

- **For the wave (W-4 to W-8).**
  - *Two readings of "wording only".* Element-level (10 on the real pair, the count in the kernel) hides an element only when it has
    nothing else to say; property-level (14) also hides a description change on an element whose relationships changed. W-7 decides
    which the filter means; the second is derivable from the table without touching the kernel.
  - *The contract version.* Left at 2 (D8). W-4 changes `compute`'s output and is where 3 belongs: the Java constant (`ViewpointKernel`)
    and `KERNEL_CONTRACT_VERSION` in `standalone.html` move together.
  - *The editor's wrapper* `loadViewpointKernel` exposes `compute` only; `compare` needs the same ten lines with the export name
    (the JS test has them). Not done here (editor work, W-6).
  - *The wasm grew from 495,062 to 591,445 bytes* (+96 kB, about +130 kB of base64 in `standalone.html`) for 500 lines of Rust:
    serde's code for the new input types and the flattened extra fields. Not a problem for the CLI; for the single-file editor it is
    a growth of the page from 1.35 MB to 1.48 MB (about 10 percent). If it matters, W-8 can look at it (`opt-level`, `serde(flatten)` in `OutElement`); not measured further.
  - *The element count of the editor's loader* (133 and 166) is one more per plateau than the design study's; harmless, noted
    because W-8's check will compare with the study again.
- **`CLAUDE.md`'s architecture paragraph** names `apply_facet` as the kernel's second entry point; a line on `compare` is the
  orchestrator's call (outside this run's paths).
- **Files touched outside `likely_paths`:** `src/main/resources/editor-webapp/standalone.html` (only the re-embedded wasm block, by
  `embed.sh`: one line); `docs/**` of this run. Everything else is inside: `src/main/rust/viewpoint-kernel/**` (`src/compare.rs`,
  `src/lib.rs`, `README.md`), `src/main/wasm/viewpoint_kernel.wasm`, `src/test/javascript/viewpoint-kernel/compare.test.js`.
- **Not verified.**
  - The editor in a real browser: the embedded module was run by Node's WebAssembly and through the harness only (as the existing
    kernel tests do); `compare` is not called by any page code yet.
  - The CLI side: no Java calls `compare` yet (W-4); only that the Java build still loads the new wasm was checked.
  - The native build (`-Dnative`): not run; the wasm is translated by the same plugin as before.
  - Performance on a large pair: the real pair (about 170 elements, 146 kB of answer) was not timed; a call is a few milliseconds
    in the JS test, not measured.
  - Cargo's `target/` of the kernel is untracked build output and was not committed or cleaned.
