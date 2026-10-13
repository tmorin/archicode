---
type: run
run: 0021
status: completed
wave: 005
---

# Run 0021: CLI — style order

Wave 005 (`follow-ups-and-field-check`), run W-1, GitHub issue tmorin/archicode#15. Document profile:
`single-document` (this file carries scope, decisions, canonical impact, verification and findings).

## Context

- `PlantumlViewRenderer` collected the entries of `styles.by-qualifiers` and `styles.by-tags` in a `HashSet`, so the
  order of the `<style>` blocks (and of the `skinparam` lines) was not stable. Whether that order mattered was the open
  question.
- Since run 0013 a box can have several stereotypes (`rendering-stereotypes: "external changed"`), and since run 0017 the
  editor resolves them: a later stereotype of the box overrides an earlier one property by property, and `by-tags`
  overrides `by-qualifiers` for the same key (`stereotypeStyleOf` in the standalone editor).
- The kernel tells the stereotypes of a box in the editor's order: qualifiers, then the words of the tag. The CLI wrote
  them in that order after the shape: `rectangle id <<q>> <<external>> <<changed>> <<kind>> <<atomic>> [`.

## Investigation: how PlantUML resolves several stereotypes on one box

There is no PlantUML jar in the repository. Jars from other projects of the machine were used read-only (never written,
never added to the repository): `plantuml-1.2024.7.jar` and `plantuml-mit-1.2026.8.jar`. The experiments are small
`.puml` files with `<style>` blocks for `.a`, `.b`, `.s1`... and boxes carrying two or three of those stereotypes. Older
jars (1.2021.15, 1.2022.4, 1.2022.6) ignore the stereotype styles of a `<style>` block altogether and say nothing about
the question.

Observed on both recent jars:

1. **The order of the `<style>` blocks does not decide.** The same two blocks written `a, b` or `b, a` give the same box.
2. **The order of the stereotypes of the box decides, and the first one wins.** With `.a` (red fill, blue line) and `.b`
   (green fill), `<<a>> <<b>>` is red and `<<b>> <<a>>` is green. The merge is property by property: the winner's
   properties are used, and what it does not set comes from the next stereotype (the line stays blue when `b` wins the
   fill). With three styled stereotypes, each property comes from the first stereotype of the box that sets it.
3. **`<<atomic>>` and `<<composite>>` give way to every stereotype listed before them**, so being listed last is being
   the weakest, which is what the renderer wants.
4. **Two blocks for the same selector merge, the later one winning property by property** (`.k` written twice).
5. `skinparam <shape>Shadowing<<s>> true` lines are only ever written for `true`; a box shadows if one of its
   stereotypes asks for it, whatever the order.

So the editor's rule ("the later one wins") is exactly PlantUML's rule ("the first one wins") run backwards: exact parity
is possible, and the lever is the order of the stereotypes on the box, not the order of the style blocks.

## Scope

In:

1. The stereotypes of a box are written last first (the qualifiers and the words of the tag reversed), the kind and the
   shape (`<<system>> <<atomic>>`, `<<composite>>`) staying last.
2. The style blocks come from one list built from both maps: sorted by stereotype name, one entry per stereotype, `by-tags`
   merged over `by-qualifiers` property by property when a name is in both. The output is byte-identical across renders
   and across JVM runs.
3. Regenerated test fixtures; the node conformance test reads the order back; the manual describes the rule.

Out: the kernel and the editor (released, unchanged); the kernel contract (the kernel still tells the stereotypes in the
editor's order, the reversal is the CLI's rendering detail); the regenerated `src/doc/examples/**/views` (see Findings).

## Decisions

- **D1. Reverse the stereotypes of the box, do not reorder the style blocks.** Block order does not matter (observation
  1); the first-wins rule needs the strongest stereotype first. Rejected: emitting one combined selector per
  combination of stereotypes (explodes with the number of stereotypes, and depends on selector priority rules that were not
  tested); keeping the order and documenting the difference (leaves a CLI that disagrees with the editor for no reason).
- **D2. The reversal happens in `PlantumlUtilities.generateStereotypes`**, the single place both item renderers use.
  The kind and `atomic`/`composite` are appended after the reversed list, as before. A stereotype that is also the kind
  or `atomic` is still listed once (the `LinkedHashSet`).
- **D3. Merge the two maps in Java, once per stereotype.** PlantUML would merge two blocks of the same selector too
  (observation 4), but a single block does not depend on that, halves the output for such workspaces, and states the rule
  in code. Merge: a non-null number, or a non-blank text, of `by-tags` replaces the `by-qualifiers` one; a blank text is
  no value (the editor ignores them too, and `generateStyle` never wrote them).
- **D4. Sort the entries by name (natural `String` order), not by declaration order.** The block order is irrelevant to
  the look, so the only requirement is a stable one; the sort does not depend on what a map implementation upstream does,
  and a reader finds a block by name. Rejected: declaration order (works only as long as every map upstream keeps it).
- **D5. Residual difference, documented: `shadowing`.** `Styles.Style.shadowing` is a primitive `boolean`, so "absent"
  and `false` are the same and the CLI only writes `true` lines. A style cannot switch off the shadow another style of
  the box switched on; the editor can (`shadowing: false` of a later stereotype). Fixing it means changing `Styles`
  (an `Optional`/`Boolean`) and the `skinparam` output, which is a model change out of this run's paths; the case is
  contrived (a later stereotype that asks for no shadow over one that asks for it). Written in the manual and as a finding.
- **D6. The output of a workspace with a single styled stereotype per box is unchanged** except for the reversal of
  boxes with several stereotypes; the style blocks of the fixtures kept their order by chance of the hash, the fixtures
  show only the reversed stereotypes.

## Canonical impact

None to the canonical docs: `docs/` holds the run and wave records only; this repository has no ADR/arc/dom packet for
the rendering of styles. The user-visible rule is documented in the manual (`src/doc/README.adoc`, "Stereotypes and
styles"), the repository's canonical description of the product, which this run updates. `docs/` has no analysis this
run fulfils.

## Tasks

| Id | Task | Status |
|----|------|--------|
| T1 | Investigate PlantUML's resolution of several stereotypes (read-only jars, small `.puml` files) | done |
| T2 | `PlantumlUtilities.stereotypeStyles` (merge, sort) and the reversed `generateStereotypes` | done |
| T3 | `PlantumlViewRenderer` uses `stereotypeStyles` instead of the `HashSet` | done |
| T4 | Java tests: item renderers, `PlantumlUtilitiesTest`, repeated render of a workspace with several styled stereotypes | done |
| T5 | Regenerate `src/test/resources/viewpoint-kernel/workspace/views*` (reorderings only); conformance test reads the order back | done |
| T6 | Manual: the rule and the residual difference | done |
| T7 | Check the box of a real render against the editor's rule | done |

## Acceptance criteria

- AC1. Rendering the same workspace twice gives the same bytes; the style blocks are in the order of the sorted names.
  Held by `PlantumlViewRendererTest.shouldRenderTheStylesInAStableOrderAndTheStereotypesLastFirst` and
  `PlantumlUtilitiesTest`.
- AC2. A stereotype declared in both maps is one block, `by-tags` over `by-qualifiers` property by property.
  `PlantumlUtilitiesTest.shouldMergeTheTwoMapsForTheSameStereotypeWithTagsOverridingQualifiers`.
- AC3. The stereotypes of a box are written last first, the kind and the shape last. `ItemRendererFor*Test`, and the
  renderer test above.
- AC4. The look PlantUML draws for a box with `external changed` is the editor's: the fill of `external` where `changed`
  sets none, the line of `changed` over `external`'s. Checked on a real render (T7, below).
- AC5. `./mvnw test` and the node tests green; the diff of the fixtures is only the reordering of stereotypes.

## Review passes

Run inline (the document is short; no subagent was dispatched for it).

- **KDMLLC.** K: one list, one sort, one reversal, no new class. D: the stereotype order is reversed in the one place
  that writes it; the merge exists once. M/L: nothing in scope that is not the issue (the `shadowing` model change and
  the examples are explicitly out). U/C: the manual says what the code does (checked sentence by sentence against T7).
- **C scan against the repository.** The claims of the Context were checked against `PlantumlViewRenderer` before the
  change, the kernel's stereotype order against `conformance.test.js` (the test that compares the kernel with the
  generated `.puml`, which had to learn the reversed order), the editor's rule against `stereotypeStyleOf` and the
  README. The README sentence "the command line defines no order for this case" was the one claim made false by this run
  and is rewritten.
- **Open questions.** "Does block order matter?" (no) and "which stereotype wins in PlantUML?" (the first) were settled
  by experiment, not by guess. None left open.

## Verification

All with `JAVA_HOME=/home/tibo/.sdkman/candidates/java/25.0.4-tem`.

- `./mvnw test`: 111 tests, 0 failures (baseline 107, plus 3 in `PlantumlUtilitiesTest` and 1 in
  `PlantumlViewRendererTest`). Before the fixtures were regenerated, `ViewpointKernelFixtureTest` failed on exactly the
  112 reordered views, which is the intended signal.
- `node --test "src/test/javascript/**/*.test.js"`: 372 tests, 0 failures (baseline 372), including the conformance test
  that compares the stereotypes of the kernel with the generated `.puml`.
- `src/main/rust/viewpoint-kernel/embed.sh --check`: the committed WebAssembly is the one the sources build (no Rust
  change).
- Fixture diff: 112 files, one line each, every line `<<external>> <<changed>> <<system>> <<atomic>> [` becoming
  `<<changed>> <<external>> <<system>> <<atomic>> [`. Nothing else moved.
- **T7, a real render.** The fixture workspace was copied outside the repository, `external` given `background-color
  lightgray`, `line-color blue`, `round-corner 30`, and `changed` given `line-color orangered`, `line-thickness 3`; the CLI
  of this branch generated the `.puml`, and `plantuml-1.2024.7.jar` rendered it to SVG. The box `mailer`
  (`external changed`) came out with the fill `#D3D3D3` (lightgray, from `external`), the line `#FF4500` (orangered) at
  width 3 (from `changed`, over `external`'s blue) and the corner of `external`: the editor's rule, property by property.
  Not run with the older 1.2022 jars, which do not apply stereotype styles; not run on PlantUML versions between or after
  the two tested ones.
- Not verified: byte-identity "across JVM runs" is argued (a `TreeMap` over the names and an ordered list; no hash order
  is left in the path), tested with repeated renders in one JVM, not with two JVMs side by side.

## Findings

- **Wave-level.** PlantUML's rule is first-wins on the stereotypes of the box; the editor's is last-wins. A future change
  to either side's precedence must reverse the other in the same change. The reversal lives in
  `PlantumlUtilities.generateStereotypes` and in the node conformance test.
- **Examples.** No committed `src/doc/examples/**/views` file has a box with several stereotypes, and the committed example
  views are a hand-kept subset of what the CLI generates (regenerating `facet_example_step_*` yields more files than are committed): they were left as they are. Regenerating them is out of this run; if wanted it is
  a follow-up on its own.
- **Open, small.** `Styles.Style.shadowing` cannot say "explicitly off" (D5); worth a follow-up only if someone needs a
  later stereotype to switch a shadow off.
- **Constraint for later runs.** Tests that pin the `<<...>>` order of a box (`ItemRendererFor*Test`, the fixtures, the
  conformance test) now pin the reversed order.
