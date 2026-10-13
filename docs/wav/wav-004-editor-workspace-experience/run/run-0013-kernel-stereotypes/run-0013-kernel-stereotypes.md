---
type: run
run: 0013
status: completed
wave: 004
---

# Run 0013: Kernel — stereotypes

Wave 004 (`editor-workspace-experience`), run W-5. Document profile: `single-document` (this file carries scope,
decisions, canonical impact, verification and findings). Focus: the CLI and the editor read `rendering-stereotypes` the
same way, from the kernel.

## Problem

- `PlantumlUtilities.generateStereotypes` adds the whole value of the tag `rendering-stereotypes` as one stereotype:
  `"external changed"` becomes `<<external changed>>`, which matches neither `.external` nor `.changed` of
  `styles.by-tags`.
- The same method ends in `Collectors.toSet()`: the order of the stereotypes in the generated PlantUML is the order of a
  hash set, not a decision.
- The kernel (Rust) returns no per-item stereotypes, so the editor cannot reuse the rule (run W-6 needs it).
- The manual documents neither `rendering-stereotypes` nor `styles.by-tags` / `styles.by-qualifiers`.

## Scope

In:

1. Kernel: every output item carries `stereotypes`, a list of strings: the qualifiers of its element (declared order),
   then the whitespace-separated words of its `rendering-stereotypes` tag; no duplicate, first occurrence wins.
2. Java: `Item` carries `stereotypes`; `KernelViewpointFactory` sends the qualifiers and tags of each element and
   reads the answer; `PlantumlUtilities.generateStereotypes` consumes them (no more `Collectors.toSet()`), then adds
   the kind and `atomic` / `composite`.
3. Editor: `toKernelElements` always sends the qualifiers and tags of the elements (it did only with a facet), so the
   kernel's answer is complete. Nothing else of the page changes (W-6 consumes the answer).
4. `embed.sh` re-run: `src/main/wasm/viewpoint_kernel.wasm` and the base64 block of `standalone.html`.
5. Tests: Rust unit tests, a Java test, a node conformance test on `"external changed"` (stereotypes of the kernel
   against those of the PlantUML files the CLI generates), fixture views regenerated.
6. Manual: `rendering-stereotypes`, `styles.by-tags` and `styles.by-qualifiers` documented.

Out: any visual change in the editor (W-6); the Jayway `query` commands; changing which keys `styles` accepts.

## Decisions

- **D1. The tag value is a whitespace-separated list.** Backward compatible: a value without whitespace gives the one
  stereotype it always gave. Rejected: a comma separated list or a YAML list (breaks existing single-word values for
  nobody, but needs a second syntax and `tags` are `Map<String, String>`).
- **D2. Qualifiers are not split.** `Spring Boot` stays one stereotype, as it has always been in the generated files
  (27 occurrences in the fixture). Only the new tag syntax is split. Rejected: splitting everything (changes existing
  output and the committed views for no gain).
- **D3. The kernel returns qualifiers + tag words, never the kind, `atomic` or `composite`.** Those depend on how the
  renderer draws the box, which the kernel does not decide for the CLI. Java appends the `types` the renderer passes:
  `kind, atomic` for a box without children, `composite` for one with children (as `ItemRenderer` does today). Order:
  the element's stereotypes, then those types; one set, so a type already named by the element is not repeated (first
  occurrence wins). Rejected: the kernel adds them (the editor has no use for `<<composite>>`).
- **D4. Contract version stays 2.** `stereotypes` is an added output field and `qualifiers` / `tags` of an element are
  optional input; the contract has always listed such additions as "added to version 2, all optional" (`uses`,
  `application_links`, ...). Bumping would make an older cached editor refuse a kernel that still works. Rejected:
  bumping to 3.
- **D5. The kernel reads `qualifiers` and `tags` from the element's free-form properties** (the `other` map a facet
  already reads), instead of typed fields: moving them out of `other` would make them vanish from the document a facet
  filters. A helper reads them from there.
- **D6. Stable order is the input order**, not an alphabetical one: the CLI draws qualifiers in their declared order
  and `Element.qualifiers` is a `LinkedHashSet`. Tag words keep their written order.
- **D7. Deployed applications** (item id different from its reference, technology layer) take their stereotypes from
  `app_elements`, as Java resolves their element from the application index.
- **D8. Golden views are regenerated**: the box lines whose stereotypes were in hash-set order may reorder (stable order
  now), plus the new `external changed` on the mailer of the fixture. The diff is reordering and that one tag.
- **D9. `toKernelElements` sends `qualifiers` and `tags` unconditionally**; `kind`, `name` and `description` stay behind
  `withProperties` (a facet), and its comment says so.

## Canonical impact

None to the canonical docs (`docs/` holds the run and wave records only here; there are no ADR/arc/dom packets in this
repository's workflow for this change). The user-visible behaviour is documented in `src/doc/README.adoc`, which is the
repository's canonical manual: that is the "impact", and task T6 discharges it.

## Tasks

| Id | Task | Status |
|----|------|--------|
| T1 | Kernel: `stereotypes` on items, Rust unit tests, contract header docs | done |
| T2 | Java: `Item.stereotypes`, `KernelViewpointFactory`, `PlantumlUtilities`, renderer tests, Java test of `"external changed"` | done |
| T3 | Editor: `toKernelElements` sends qualifiers and tags | done |
| T4 | `embed.sh`, then `embed.sh --check` | done |
| T5 | Fixture (`external changed`), regenerate the views, node conformance test | done |
| T6 | Manual: `rendering-stereotypes`, `styles.by-tags`, `styles.by-qualifiers`; kernel README | done |

## Acceptance criteria

- AC1. `rendering-stereotypes: "external changed"` renders `<<external>> <<changed>>`, never `<<external changed>>`.
- AC2. The order of stereotypes in a generated file is the same on every run.
- AC3. A value without whitespace renders as before.
- AC4. The kernel's `stereotypes` of every item of every view of every set of the fixture (the workspace and each facet)
  equals the element stereotypes in the PlantUML the CLI generates (node test).
- AC4b. Qualifiers keep their spaces (`Spring Boot`), the tag is split, a repeated word appears once, and a deployed
  application carries the stereotypes of its application-layer element (Rust unit tests).
- AC5. `embed.sh --check` passes; the CLI's wasm and the editor's block come from the same build.
- AC6. The manual documents `rendering-stereotypes` (syntax: whitespace-separated list), and `styles.by-tags` /
  `styles.by-qualifiers` (key = stereotype).

## Review passes

KDMLLC review of this document (dispatched, standard tier, with a C scan against the repository). Verdict Acceptable;
one S3 and several S2 findings, all applied above: D3 reworded (a composite box carries no kind, the dedup covers the
renderer's types: F1, F2), AC4b added for D2/D7/dedup (F5), the `toKernelElements` change specified as D9 (F6), the
task status aligned (F4), D8 softened and the view sets named in AC4 (F7, F8), the dispatch note folded into the
tasks note (F9, was D9). F10 (repetition of the manual scope) left: the scope, the task table and the AC serve three
different readers and are one line each. Open questions: none left. The C scan found no wrong claim about the current
code beyond F1.

Tasks are worked inline: they are small and share one contract (Rust field, Java field, JS input), so a brief for a
subagent would be as long as the change; none is `hard_judgment`.

## Verification

Run on 2026-10-13, JDK 25 (`JAVA_HOME=/home/tibo/.sdkman/candidates/java/25.0.4-tem`):

- `cargo test --manifest-path src/main/rust/viewpoint-kernel/Cargo.toml`: 69 passed (7 new, on stereotypes).
- `src/main/rust/viewpoint-kernel/embed.sh`, then `embed.sh --check`: "the committed WebAssembly is the one the sources
  build (495062 bytes)".
- `node --test "src/test/javascript/**/*.test.js"`: 197 pass, 0 fail (baseline 195, 2 new: the stereotypes of every
  box of every view of every fixture set against the PlantUML the CLI generates, and the split tag).
- `./mvnw test`: 104 tests, 0 failures, including `ViewpointKernelFixtureTest` (generated views equal the committed
  ones), the renderer tests and the new `KernelViewpointFactoryTest` case.
- AC1: the Java renderer test and the regenerated mailer line `<<external>> <<changed>> <<system>> <<atomic>>`.
  AC2: one ordered list from the kernel, `LinkedHashSet`, `Collectors.joining`; the views are the same on every run.
  AC3: Rust test of a one-word tag; unchanged boxes only reorder. AC4, AC4b: node and Rust tests. AC5: above.
  AC6: `src/doc/README.adoc`, section "Stereotypes and styles", and the Base Element `tags` row.
- Diff of the regenerated fixture views and the manual's example views: same number of lines added and removed, all
  `<<...>>` reorderings, plus the mailer's `<<changed>>`.

Not confirmed: the page itself (the editor needs the File System Access picker, so it was not opened); the node tests
check the kernel's answer and the inputs `buildKernelInput` produces, not a rendering. The manual was not built with
Asciidoctor (`./mvnw test` does not build it).

## Findings

- `rendering-stereotypes` was read by the Java renderer only; the kernel now owns the rule. `ViewRenderer.TAG_ADDITIONAL_STEREOTYPES`
  (public constant, unused after this) was removed.
- `src/doc/examples/**/views/**.puml` are committed outputs the Java tests rewrite: they reordered with the rest and are
  part of the commit.
- For the wave: W-6 can read `item.stereotypes` from the kernel output as is; the editor now always sends the
  qualifiers and tags of every element to the kernel (a payload a little larger than before).
