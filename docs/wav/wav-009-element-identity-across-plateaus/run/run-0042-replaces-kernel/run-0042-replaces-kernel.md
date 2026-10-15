---
type: run
run: 0042
status: completed
wave: 009
---

# Run 0042: Replaces in the kernel

Wave 009 (`element-identity-across-plateaus`), item W-1 (phase P1). Focus: say in the data that an element is the same thing under
another name or place, and have the comparison report it. Document profile: `single-document`, with a TDD-lite section (the Decisions
below), as the runs of wave 008: the scope arrives settled (the W-1 row and D-1 to D-4 of the wave plan, issue #22), the work is one
rule set in one crate plus the plumbing that carries one optional key to it, and there was no live alternative worth a PRD, a TDD or a
pln. This file carries scope, decisions, the interface for the next runs, canonical impact, verification and findings. The review
passes were run inline (no subagent), see "Review passes".

## Context

Wave 008 compares two plateaus by dotted reference: a renamed, moved, split or merged element is one `removed` plus one or more `new`,
with nothing linking them. Issue tmorin/archicode#22 asks for an explicit hint, `replaces: [ref, ...]`, on the element of the more
recent plateau, in the manner of the `moved` block of Terraform: the author declares it, the tool never guesses. This run puts the hint
in the kernel (`compare`), in the Java adapter and in the editor's kernel input. What the CLI prints for it is W-3, what the editor
shows and writes is W-5 and W-6, the manual is W-7.

## Scope

In: `compare` reads `replaces`, reports moved, split and merged elements, stops reporting the replaced ones as removed, lists
candidates, warns on references it ignores; `compute` accepts the three new words of `change`; contract 3 to 4 (Rust,
`ViewpointKernel.CONTRACT_VERSION`, `KERNEL_CONTRACT_VERSION`); the Java model reads the key, the adapter carries it and the answer;
the editor keeps it in its records and sends it to `compare`; cargo, Java and JS tests; re-embedded wasm; kernel README and the
architecture paragraph of `CLAUDE.md`. Out: any wording of the CLI table (`GapReport`), the look of the new states in PlantUML and in the
editor, the Changes panel, writing `replaces` from the editor, the user manual.

## Decisions

Taken by the wave (not reopened): D-1 (`replaces` is an optional list of full references on an element of the more recent plateau; a
reference unknown in the baseline is a warning; one still in the target is ignored with a warning), D-2 (one replaced and one replacing
is `moved`, several replacing one replaced is `split`, one replacing several replaced is `merged`; a replaced element is no longer
`removed`; the replacing element keeps its own changes), D-3 (candidates are listed, never drawn nor applied), D-4 (contract 4).

Taken by this run:

- **E1. How the three identities are exposed: as values of `change`.** A union element says `change: "moved" | "split" | "merged"`,
  next to the four old words, and `replaces: [ref, ...]` (the valid references, sorted). `compute` accepts the three words for an
  *element* (not for a relationship, where they are an `error`), makes each a state like `new` (it ends the stereotypes, the container
  above says `contains-changes`, `only_changes` keeps it). Rejected: a separate `identity` object beside `change: "new"`, because
  W-3 and W-5 draw one state per box and the computed stereotype is the state; and keeping `change` in four words with the identity in
  a side table, because the editor feeds the union to `compute` and a moved box would then be told as `new` or `changed`, which is wrong.
  The contract bump is exactly this: a caller that does not know the words must not receive them.
- **E2. Natures next to the identity.** "The replacing element keeps its own changes" is `natures` (and `before`/`after` in the row)
  *next to* `change: moved`. A moved element is counted as `moved`, never also as `changed`; `wording_only` is never set for it. An
  element is compared with: its own base version when it had one (so a `merged` that already existed), the element it replaces when it is
  `moved`, nothing when it is new and `split` or `merged`, so that only its relationships are compared.
- **E3. Kind rule.** `merged` when the element replaces two or more elements, or one while being in the base itself; else `split` when
  what it replaces is replaced by others too; else `moved`. `merged` wins when an element is both (`a` is split into `b1` and `b2`, and
  `b2` also replaces `c`: `b1` is `split`, `b2` is `merged`).
- **E4. What follows a replaced element.** Its relationships and its deployment (`applications`, `uses`) are read as the target says
  them when exactly one element replaces it (`c -> a.svc` becomes `c -> b.svc` before the comparison, so a move is not a change of
  `c`); those of a split element are left out (which half would own them is a guess, and the opposite choice invents removed
  relationships). A merge needs no rule: each replaced element goes to the one that replaces it.
- **E5. The replaced elements are not in the union, with one exception.** They have no row and no count. But what a replaced element
  held is removed unless it is replaced too, and `compute` cannot place a child whose parent is missing (it is a `dangling reference`
  in the deep viewpoint, found by the CLI test). So a replaced element that has a removed descendant stays in the union as `removed`
  with `replaced_by: [...]`, no row, no count. Rejected: always keeping every replaced element as a grey ghost (the CLI would draw
  removed boxes for things the author says moved, against the point of the wave); dropping the orphans from the union (the editor's
  Changes panel would list a row that has no element).
- **E6. Candidates.** `candidates: [{ layer, from, to, reasons }]`, always present (an empty list without any), sorted. A pair is an
  element only the base has and nothing replaces, and an element only the target has that replaces nothing, of the same layer and the
  same non-empty kind, with at least one reason, in this order: `name` (same name, ignoring case), `description` (at least 60 percent of
  the words of the two in common, three words or more on each side), `parent` (the only two of that kind under the same parent: a
  parent alone would pair every sibling with every other). The wave plan said "same parent or same name, close description"; the lone
  sibling rule is this run's reading of "same parent", to keep the list useful. Candidates are in the kernel answer only; gap.md and
  gap.json are W-3's.
- **E7. Warnings.** `warnings: [text]`, omitted when empty, in a fixed order (layer, then reference of the replacing element, then the
  order of its entries): a reference not in the base, one still in the target (this covers a self reference and a cycle between two
  elements that both exist), one listed twice (counted once), an entry that is not a reference, a `replaces` that is not a list. Never
  an `error`. There is no recursion, so a cycle cannot loop: what is replaced is not in the target, so it cannot replace anything.
- **E8. Reserved fields.** `replaces` and `replaced_by` join the names the union writes, so that a free-form field of that name never
  reaches the answer (wave 008 had this defect with `wording_only`); the kernel writes `replaces` itself, only on an element that
  replaces something. A `replaces` on a base element is not read.
- **E9. The counts** gain `moved`, `split`, `merged`, written only when not zero, so that a comparison without `replaces` has the
  counts and the bytes it had (`expected-counts.json` is unchanged).
- **E10. Java.** The element model reads the key (`AbstractElement.replaces`, a set, empty by default and left out when empty because
  the mappers write with `NON_EMPTY`; the loader ignores unknown keys, so without this the key never reached the kernel). `KernelGraph`
  sends it with the comparison properties and only when there is one. `Comparison` carries `replaces` and `replacedBy` on an element,
  `replaces` on a row, `moved/split/merged` in the counts (the four-argument constructor stays for the callers that count none),
  `getCandidates()` and `getWarnings()`. `PlateauComparer` does not log the warnings: the CLI decides where they go (W-3), because
  D-5 notes that `log.warn` can be hidden.
- **E11. Editor.** The record of an element keeps `replaces`; `toKernelElements(map, true)` sends it when there is one, `toKernelElements(map,
  false)` never; `KERNEL_CONTRACT_VERSION` is 4. Nothing else: the new states have no glyph, colour or row in the page yet (W-5).

## The interface for the next runs

- **W-3 (CLI).** `Comparison.getChanges()` rows of `moved|split|merged` carry `replaces` (and `before`/`after` when the element also
  changed); `getCandidates()` and `getWarnings()` are ready to print; `ChangeMarks` draws the three words, until W-3, with the
  state word itself and the default look of a state that has none (glyph `±`, thin dashed outline): a placeholder, to be replaced by
  the look W-3 designs. `GapReport` prints the word of the change as it prints the others.
- **W-5 (editor).** `comparisonState().records` holds the union elements with `replaces`; `CHANGE_STATES` in `standalone.html` still
  has three words, so the page does not yet mark, count or list the three new states (it draws them as unmarked boxes carrying the word
  as a stereotype); the Changes panel gets them from `counts.elements.moved|split|merged` and `changes`. Candidates are
  `loadedKernel.compare(...).candidates`; they are not in `comparisonState()` yet. The `replaces` of a record is the YAML as read: to
  write one the editor goes through the line-preserving save.
- **Left for a decision in W-3/W-5:** whether a replaced element that is only a place (E5) should be drawn at all in the editor's map.

## Canonical impact

`CLAUDE.md`, architecture paragraph on plateaus: updated (the key, the three states, candidates, contract 4). The kernel README: updated
("Comparing two plateaus", "Views of a comparison"). The user manual `src/doc/README.adoc` is not edited by this run (W-7, and the
rules of the manual are written when the CLI and the editor show the feature). No other canonical document.

## Tasks

| Id | Task | Status |
|----|------|--------|
| T1 | Read the wave, wave 008's compare run, issue #22, `compare.rs`, `lib.rs`, the Java adapter, the editor's record and kernel input | done |
| T2 | Build a jar from HEAD, before any change, for the byte-identity check | done |
| T3 | `compare.rs`: resolve `replaces`, identities, rewrite, candidates, warnings, counts, rows, reserved names, placeholders | done |
| T4 | `lib.rs`: three words of `change`, stereotypes, contract 4; relationships refuse them | done |
| T5 | Cargo tests: 1:1, 1:n, n:1, unknown, still in the target, malformed, duplicate, cycles, self, layers, candidates, reserved, bytes | done |
| T6 | Java: model key, `KernelGraph`, `Change`, `Comparison`, `ChangeMarks` placeholder, contract constant | done |
| T7 | Java tests through `PlateauComparer` on an invented YAML pair and on builders; a CLI smoke test | done |
| T8 | Editor: record, kernel input, contract constant; `replaces.test.js`, `compare.test.js`; contract version in the other JS tests | done |
| T9 | `embed.sh`, `embed.sh --check` | done |
| T10 | README of the kernel, `CLAUDE.md` | done |
| T11 | Byte-identity: HEAD jar against this run's jar, on every workspace of the fixtures and of the manual | done |
| T12 | Full suites: `cargo test`, `embed.sh --check`, `node --test`, `./mvnw -o -q verify`, Prettier | done |

## Acceptance criteria (the W-1 row)

- AC1. `replaces` gives moved, split, merged: `one_element_that_replaces_one_in_another_place_is_moved_...`,
  `one_element_that_replaces_several_is_merged_and_several_that_replace_one_are_split`,
  `an_element_that_was_already_there_and_replaces_another_is_merged_with_it`, `merged_wins_over_split_...`; Java
  `shouldReadReplacesFromTheManifestsAndReportMovedSplitAndMergedElements`, `shouldCarryReplacesFromTheElementModelToTheKernel`; JS
  `replaces.test.js` and the last test of `compare.test.js`.
- AC2. The replaced are no longer removed, the replacing keeps its changes: `a_moved_element_keeps_its_own_changes_next_to_its_identity`,
  `the_relationships_follow_...`, `the_deployment_follows_...`, `a_description_change_of_a_moved_element_is_not_wording_only`,
  `what_a_replaced_element_contained_is_still_removed_unless_it_is_replaced_too`.
- AC3. Candidates listed and not applied: `candidates_are_listed_with_their_reasons_and_never_applied`,
  `the_same_parent_makes_a_candidate_only_for_...`, `what_is_replaced_or_replaces_is_no_candidate_...`; Java
  `shouldWarnAboutAReplacedReferenceUnknownInTheBaselineAndListCandidatesWithoutApplyingThem`.
- AC4. Warnings (D-1): `a_reference_unknown_in_the_base_...`, `a_reference_that_is_still_in_the_target_...`,
  `a_replaces_that_is_malformed_...`, `a_reference_listed_twice_counts_once`; cycles and self references never loop or panic:
  `cycles_and_self_references_are_ignored_and_never_loop`.
- AC5. Byte-stable: `the_same_pair_with_replaces_gives_the_same_bytes_whatever_the_order` (cargo, shuffled twice), Java
  `shouldGiveTheSameAnswerTwiceWithReplaces`, JS in `compare.test.js`.
- AC6. Reserved: `a_free_form_field_named_like_a_reserved_word_does_not_reach_the_answer`, `a_replaces_on_a_base_element_is_not_read_and_never_leaks`.
- AC7. Contract 4 in the three places: `the_contract_is_version_4` (cargo), `shouldSpeakTheContractVersionOfTheKernel` (Java), `the editor and
  the kernel it embeds speak contract version 4` (JS).
- AC8. `compute` draws the union: `moved_split_and_merged_are_states_of_an_element_...`, `the_union_of_a_pair_with_replaces_is_a_view_input_in_every_viewpoint`,
  a relationship refuses the words (`a_change_that_is_not_one_of_the_words_is_an_error`); the CLI loads, compares and generates views on the invented
  warehouse (`diffAndViewsDoNotFailOnPlateausWhoseElementsSayWhatTheyReplace`).
- AC9. Without `replaces` nothing changes: `without_replaces_the_answer_is_what_it_was_plus_an_empty_list_of_candidates`, the unchanged
  `expected-counts.json`, the JS test "a workspace without replaces compares as it did", and the byte-identity check (T11).

## Review passes

Run inline (one document; no subagent dispatched, as in the runs of wave 008).

- **KDMLLC.** K: one file gets the rules (`compare.rs`), one function per rule (`resolve`, `Rewrite`, `candidates`), the Java side is a
  field and a few records; D: the identity words exist once in the kernel and are parsed once in Java (`Change.of`); `Rewrite` serves the
  relationships, the deployment, the candidates and the placeholders; M: each rule of the brief has a test (AC list), and each output has one
  place (`replaces` on the element and the row, `candidates` and `warnings` at the top); L: no UI, no wording of the CLI, no manual, no
  `hints` input, no log; U: the rules are written at the top of `compare.rs` (rules 6 and 7) and in the README; C: see below.
- **C scan.** Claim "a workspace without `replaces` is byte-identical": measured (T11) on the CLI side; at the kernel level the answer of
  `compare` gains `candidates: []` (always present), which the CLI does not print yet. Claim "no cycle": true by construction (what is
  replaced is absent from the target, what replaces is present), tested with two cycles and two self references. Claim "the replaced
  are not removed": true for rows and counts; the union still holds a replaced element that has a removed descendant (E5), said in the
  README and the Javadoc of `Comparison`. Claim in the wave plan "`moved` is already a reserved word of the visual language": no
  such word was found in the code (`CHANGE_STATES`, `ChangeMarks`); the stereotype is simply new. Claim "the loader ignores unknown keys, so old
  tools ignore `replaces`": true (`FAIL_ON_UNKNOWN_PROPERTIES` is off), and this is also why the key had to be modelled to reach the kernel.
- **Open questions.** None left. E3, E4, E5 and E6 are the judgements of this run; each is one place in the code.

## Verification

All with the repository's own commands. `JAVA_HOME=/home/tibo/.sdkman/candidates/java/25.0.4-tem` for Maven.

### Results

- `cargo test --manifest-path src/main/rust/viewpoint-kernel/Cargo.toml`: 160 passed, 0 failed (134 before; the new ones are in `compare::tests` and
  `change_tests`; 3 old tests re-aimed at version 4 or at the new words).
- `src/main/rust/viewpoint-kernel/embed.sh`, then `embed.sh --check`: "the committed WebAssembly is the one the sources build (651048 bytes)"
  (was 601255: +50 kB, about +67 kB of base64 in `standalone.html`; 10 kB of it is Unicode case folding for names and descriptions).
- `node --test "src/test/javascript/**/*.test.js"`: 764 tests, 764 pass, 0 fail (the flaky "Open on a folder..." test passed). 5 new in
  `replaces.test.js`, 1 in `compare.test.js`; 5 existing tests only had their expected contract version moved from 3 to 4.
- `./mvnw -o -q verify` with JDK 25: exit 0, 251 tests in the surefire reports, 0 failures, 0 errors, 0 skipped (integration tests are
  skipped by default). The first run failed on `NativeReflectionConfigTest` (`Comparison$Candidate` was not in `reflect-config.json`, the
  same kind of miss as wave 008's `RelationshipLabel`); registered, second run green.
- `npx prettier --check "src/**/*.java"`: clean. It was not at HEAD: `KernelViewpointFactoryTest.java` had two long lines, formatted here.
- **Byte-identity (hard requirement 1).** A jar built from a `git archive` of HEAD (before any change of this run) against the jar of this
  run, on the 11 workspaces under `src/doc/examples` and `src/test/resources` (the invented warehouse of this run excluded: only the new
  jar understands it), 31 commands in all: `views generate`, and for the three workspaces with plateaus each plateau with `views generate
  --plateau`, `diff --plateau` in text, JSON and Markdown. Result: every output folder identical file by file (`diff -r`, 1131 `.puml` in
  each, `gap.md` and `gap.json` included) and the standard output and exit code of the 31 commands identical (six `diff` runs exit 1 in both: the first
  plateau has no baseline). The script is in the scratchpad, not committed.
- Not run: `-Dnative`, `failsafe` integration tests, a real browser.

### The pair of the tests

The invented warehouse (`src/test/resources/plateau-comparison/replaces`): the till moves from the shop to the stock system (moved); the
report becomes two (split) and its chart is not replaced (removed, under a replaced place); the bin and the shelf become a place (merged); a
`replaces` points at nothing (warning); the mailer is rewritten as the postman and nobody says so (one candidate, reasons `description` and
`parent`, still removed and new). `expected-counts.json` is unchanged.

## Findings

- **For the wave (W-2 to W-7).**
  - *The new states have no look yet.* In the CLI `ChangeMarks` gives `moved`, `split` and `merged` the word as the state and the default
    look of a state that has none (glyph `±`, thin dashed outline, the same as `contains-changes`); in the editor `CHANGE_STATES` has three
    words, so a moved box is unmarked, not counted in the legend and not listed in the Changes panel, though `counts` and `changes` carry
    them. W-3 and W-5 own that; both are edits of one place.
  - *`GapReport`* prints `row.change().word()`, so `diff` shows `moved`, `split`, `merged` rows already; there is no identity column, no
    `replaces` and no candidates section (W-3). The CLI test only checks that nothing fails.
  - *Warnings go nowhere yet.* `Comparison.getWarnings()` is filled; nothing prints it. D-5's remark applies: the application's log level
    hides `log.warn`, so W-3 must choose where they appear (probably the `diff` text and Markdown and stderr).
  - *The children of a moved container are not carried.* `replaces` on `stock.sub` does not say anything about `shop.sub.x`: each child
    needs its own `replaces`, else it reads `removed` (with its old container kept as a place, E5). W-6's move action is where the editor
    should offer to write them.
  - *A replaced element that is only a place* (E5) is in `elements` as `removed` with `replaced_by`; the editor's `unionLayersOf` takes
    it like any removed element and will draw it. Whether that is wanted in the map is W-5's call.
  - *Payload.* The wasm grew by 50 kB (651,048 bytes); the single-file page by about 67 kB.
- **A defect worth the next run's attention in an existing area.** `compute` fails with `dangling reference: x` for the deep viewpoint when
  an element's ancestor is missing from its input (the overview, detailed and map viewpoints ignore the orphan). Not new, not changed
  here: the union of `compare` was made to never need it (E5).
- **The wave 009 plan said `moved` is "already a reserved word of the visual language".** Nothing in the code reserves it; the three words
  are plain new states.
- **Issue filed:** tmorin/archicode#33, the thresholds of the candidates and the relationships of a split element, to check on a real
  pair by someone who may read it.
- **Files touched outside `likely_paths`:** `src/main/java/io/morin/archicode/resource/element/AbstractElement.java` and
  `Element.java` (the model must read the key: the loader ignores unknown keys), `src/main/java/io/morin/archicode/rendering/plantuml/ChangeMarks.java`
  (two `switch` arms, the enum grew), `src/main/resources/META-INF/native-image/io.morin.archicode/archicode/reflect-config.json` (the new record),
  `src/test/java/io/morin/archicode/cli/PlateauComparisonTest.java` (a smoke test through the real command line, and its copy of the fixture skips
  the new sub-folder), `CLAUDE.md` (asked for). Inside, but not about this run's subject:
  `KernelViewpointFactoryTest.java` (Prettier).
- **Not verified.**
  - The editor in a real browser: the page was run only through the harness (Node, no DOM layout); nothing in the page marks the new
    states yet, so a browser would show them unmarked.
  - The native image (`-Dnative`): not built; the reflection list is checked by `NativeReflectionConfigTest` only.
  - The quality of the candidates and the reading of a split on real data (issue #33): the run read no real workspace.
  - Failsafe integration tests (skipped by default in this repository).
  - The cost of `compare` on a large pair: `candidates()` is quadratic in the number of removed times new elements of a layer; the
    invented pairs are tiny.
  - Cargo's `target/` of the kernel is untracked build output and was not committed.
