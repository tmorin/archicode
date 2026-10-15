---
type: wave
wave: 009
status: proposed
date: 2026-10-15
related:
  - docs/wav/wav-009-element-identity-across-plateaus/wbc-009-element-identity-across-plateaus.md
  - docs/wav/wav-008-plateaus-and-baseline-diff/wav-008-plateaus-and-baseline-diff.md
  - CLAUDE.md
---

# Wave 009 — Element Identity Across Plateaus

## Purpose

When this wave is done, an element of the more recent plateau can say what it replaces (`replaces: [ref, ...]`), and
the comparison reports it as moved, split or merged instead of removed plus new, in the table of changes (`gap.md`,
`gap.json`), in the views of the CLI and in the editor, without ever applying a guess: candidates are listed, not
applied. The editor writes the hint from a proposed match, and moves an element under another parent, rewriting the
references to it and offering to write the hint. A hand-written state tag means the same in the CLI and in the editor,
and the editor no longer serialises the model on every render. A workspace without `replaces` generates exactly the
same files as before.

## Non-Goals

- Does not guess an identity: no match is applied without a `replaces` written by the author (issues #22, #23).
- Does not compare more than two plateaus at once, nor add the timeline or the `compare` property of views and
  stories (#24).
- Does not read a baseline from git, nor add `--fail-on` (#25), nor the other polish of `diff` (#26).
- Does not add a reader for a long list of changes in the editor (#27), nor layered increments (#30).
- Does not check what wave 008 could not verify: native image, other browsers, folder picker (#29).
- Does not change the format of manifests beyond one optional key, `replaces`, which tools that do not know it ignore.
- Does not put any text from a real workspace in the repository: fixtures and examples are invented.
- Does not cut a release.

## Decision Prerequisites

None. The decisions below are made by this wave and recorded in the runs that apply them:

- **D-1** `replaces` is an optional list of full references (strings) on an element of the more recent plateau; it
  names references of the baseline. A reference that does not exist in the baseline is a warning, not an error (the
  author may have compared with another baseline); a reference that exists in the target as well is ignored with a
  warning.
- **D-2** One replaced and one replacing element, in another place or under another name, is `moved`; several replacing
  one replaced is `split`; one replacing several replaced is `merged`. A replaced element is no longer `removed`. The
  replacing element keeps its own changes (`changed`) next to its identity.
- **D-3** Candidates (same kind, same parent or same name, close description) are listed in the answer of the
  comparison and in `gap.json` and `gap.md`, never drawn in a view and never applied.
- **D-4** The kernel contract goes from version 3 to 4 (Rust, `ViewpointKernel.CONTRACT_VERSION`,
  `KERNEL_CONTRACT_VERSION` in `standalone.html`).
- **D-5** For #28 the rule is the editor's: a box gets the default look of a state only when the state is computed for
  it. A hand-written tag that contradicts the computed state is reported with a warning that the user sees (the log
  level `ERROR` of the application hides `log.warn`, so the run must check where the message goes).
- **D-6** For #32 the cache of the comparison is keyed on a version counter of the two models, bumped by loads and
  edits, not on their serialised content.

## Wave Manifest

```yaml
wave_manifest:
  wave: 009
  slug: element-identity-across-plateaus
  status: proposed
  sources: []
  phases:
    - id: P1
      name: Identity in the kernel and one rule for state tags
      gate:
        criteria:
          - '`cargo test --manifest-path src/main/rust/viewpoint-kernel/Cargo.toml` passes and `src/main/rust/viewpoint-kernel/embed.sh --check` passes'
          - 'on an invented pair of plateaus, `replaces` gives moved, split and merged elements, the replaced elements are no longer removed, and candidates are listed without being applied (cargo tests and a Java test)'
          - 'the kernel contract version is 4 in Rust, in `ViewpointKernel.CONTRACT_VERSION` and in `KERNEL_CONTRACT_VERSION` of `standalone.html`'
          - 'a test shows that a hand-written state tag on an unchanged element gets the same look in the CLI and in the editor'
          - '`./mvnw -o verify` and `node --test "src/test/javascript/**/*.test.js"` pass, and the views of a workspace without `replaces` are byte-identical to the ones before the wave'
    - id: P2
      name: The CLI and the cache of the editor
      gate:
        criteria:
          - '`archicode diff` and `views generate --baseline` show moved, split and merged elements and the candidates in `gap.md` and `gap.json`, and the views carry the state in a way that does not rely on colour'
          - 'the comparison of the editor is keyed on a version counter and a test shows that a load, an edit and a change of baseline each invalidate it while a plain render does not serialise the models'
          - '`./mvnw -o verify` and `node --test "src/test/javascript/**/*.test.js"` pass'
    - id: P3
      name: Identity in the editor
      gate:
        criteria:
          - 'the Changes panel shows moved, split and merged elements and the candidates; a candidate can be accepted ("Write replaces") or dismissed; accepting writes the key through the line-preserving save and changes only that line (a test compares the saved file with the original)'
          - 'an element can be moved under another parent from its panel: its children follow, the references that point at it are rewritten in every file, and a test shows that nothing else changes in the files; the editor offers to write `replaces` for the move'
          - '`node --test "src/test/javascript/**/*.test.js"` and `./mvnw -o verify` pass'
    - id: P4
      name: Proof
      gate:
        criteria:
          - 'the manual (`src/doc/README.adoc`) describes `replaces`, the new states, the candidates, the move action and the rule for hand-written state tags, and its example workspace loads and gives the documented result'
          - 'the invented example `domain_plateaus` is extended with `replaces`, its generated views are committed, and the editor page was looked at (light and dark) on it with a move, a split and a merge'
          - 'the CLAUDE.md architecture paragraph is up to date, `./mvnw -o verify`, `cargo test`, `embed.sh --check`, `node --test` and `npx prettier --check "src/**/*.java"` pass, and every item of "not verified" of the runs is listed in the final report'
  runs:
    - id: W-1
      slug: replaces-kernel
      phase: P1
      depends_on: []
      run: '0042'
      delegation: standard
      likely_paths:
        - 'src/main/rust/viewpoint-kernel/**'
        - 'src/main/wasm/viewpoint_kernel.wasm'
        - 'src/main/java/io/morin/archicode/viewpoint/**'
        - 'src/main/java/io/morin/archicode/workspace/ComparisonDocument.java'
        - 'src/main/resources/editor-webapp/standalone.html'
        - 'src/test/java/io/morin/archicode/viewpoint/**'
        - 'src/test/resources/plateau-comparison/**'
        - 'src/test/javascript/**'
      focus: 'say in the data that an element is the same thing under another name or place, and have the comparison report it'
    - id: W-2
      slug: state-tag-rule
      phase: P1
      depends_on: []
      run: null
      delegation: standard
      likely_paths:
        - 'src/main/java/io/morin/archicode/rendering/plantuml/**'
        - 'src/main/java/io/morin/archicode/workspace/**'
        - 'src/test/java/io/morin/archicode/**'
        - 'src/doc/README.adoc'
      focus: 'a hand-written new or changed tag looks the same in the CLI and in the editor'
    - id: W-3
      slug: replaces-cli
      phase: P2
      depends_on: [W-1, W-2]
      run: null
      delegation: standard
      likely_paths:
        - 'src/main/java/io/morin/archicode/cli/**'
        - 'src/main/java/io/morin/archicode/rendering/**'
        - 'src/main/java/io/morin/archicode/workspace/**'
        - 'src/test/java/io/morin/archicode/**'
        - 'src/test/resources/plateau-comparison/**'
        - 'src/doc/README.adoc'
      focus: 'read in the table of changes and in the views that an element moved, split or merged, and see the candidates'
    - id: W-4
      slug: comparison-cache-version
      phase: P2
      depends_on: []
      run: null
      delegation: standard
      likely_paths:
        - 'src/main/resources/editor-webapp/standalone.html'
        - 'src/test/javascript/**'
      focus: 'a render of the editor with a comparison on does not serialise the whole model'
    - id: W-5
      slug: replaces-editor
      phase: P3
      depends_on: [W-1, W-4]
      run: null
      delegation: standard
      likely_paths:
        - 'src/main/resources/editor-webapp/standalone.html'
        - 'src/test/javascript/**'
        - 'src/doc/README.adoc'
      focus: 'see in the Changes panel what moved, split or merged, and accept a proposed match in one click'
    - id: W-6
      slug: move-element-editor
      phase: P3
      depends_on: [W-5]
      run: null
      delegation: standard
      likely_paths:
        - 'src/main/resources/editor-webapp/standalone.html'
        - 'src/test/javascript/**'
        - 'src/doc/README.adoc'
      focus: 'move an element under another parent without breaking a reference, and say what it replaces'
    - id: W-7
      slug: identity-proof
      phase: P4
      depends_on: [W-3, W-6]
      run: null
      delegation: standard
      likely_paths:
        - 'src/doc/**'
        - 'CLAUDE.md'
        - 'README.md'
        - 'docs/wav/wav-009-element-identity-across-plateaus/**'
      focus: 'see the whole story work on an invented architecture, in the CLI and in the real editor page, and have it documented'
```

## Phase P1 — Identity in the kernel and one rule for state tags

| # | Run | Slug | Depends on | Focus | Scope | Exit evidence |
|---|-----|------|------------|-------|-------|---------------|
| W-1 | 0042 | `replaces-kernel` | — | say in the data that an element is the same thing under another name or place | `replaces` read from the elements of the target (Rust and Java adapter, and the editor's input); `compare` reports moved, split and merged, stops reporting the replaced as removed, lists candidates; contract version 4; wasm re-embedded | cargo tests on invented pairs (1:1, 1:n, n:1, unknown reference, a reference that exists in the target, cycles of `replaces`), a Java test through `PlateauComparer`, `embed.sh --check`, byte-identity without `replaces` |
| W-2 | — | `state-tag-rule` | — | a hand-written new or changed tag looks the same in the CLI and in the editor | the CLI gives the default look of a state only to a box that has the state computed; a contradicting hand-written tag is reported (D-5); the manual states the rule | a Java test and a JS test on the same invented case, the manual updated, byte-identity without a comparison |

**Gate:** see the manifest.

## Phase P2 — The CLI and the cache of the editor

| # | Run | Slug | Depends on | Focus | Scope | Exit evidence |
|---|-----|------|------------|-------|-------|---------------|
| W-3 | — | `replaces-cli` | W-1, W-2 | read in the table of changes and in the views that an element moved, split or merged, and see the candidates | `diff` text, markdown and json, `gap.md`, `gap.json` (identity column, candidates section), the computed stereotypes in the views and their look (not colour alone), `--no-wording` unchanged | Java tests on the fixture, the generated files of an invented pair, the manual's CLI section |
| W-4 | — | `comparison-cache-version` | — | a render of the editor with a comparison on does not serialise the whole model | a version counter of the two models bumped by loads, edits and baseline changes; the cache key built from it | JS tests: invalidation on load, edit and baseline change; no serialisation on a plain render |

**Gate:** see the manifest.

## Phase P3 — Identity in the editor

| # | Run | Slug | Depends on | Focus | Scope | Exit evidence |
|---|-----|------|------------|-------|-------|---------------|
| W-5 | — | `replaces-editor` | W-1, W-4 | see in the Changes panel what moved, split or merged, and accept a proposed match in one click | Changes panel rows and filters for the new states, candidates with "Write replaces" and "Not related", `replaces` written through the line-preserving save, the inspector shows what an element replaces | JS tests on the markup and on the saved file (one line changed), the manual's editor section |
| W-6 | — | `move-element-editor` | W-5 | move an element under another parent without breaking a reference, and say what it replaces | a Move action in the element panel (children follow, inbound references rewritten in every file, a clash of ids refused), offering to write `replaces`; works on the plateau being edited only | JS tests on the files after a move (nothing else changes), a refused move, the offer of `replaces` |

**Gate:** see the manifest.

## Phase P4 — Proof

| # | Run | Slug | Depends on | Focus | Scope | Exit evidence |
|---|-----|------|------------|-------|-------|---------------|
| W-7 | — | `identity-proof` | W-3, W-6 | see the whole story work on an invented architecture, in the CLI and in the real editor page, and have it documented | the example `domain_plateaus` extended with a move, a split and a merge; the manual, README.md and the CLAUDE.md paragraph; the final report | generated views committed, the editor looked at in light and dark in the built-in browser, all test suites and prettier, "not verified" listed |

**Gate:** see the manifest.

## Dependency View

```
P1  W-1 replaces-kernel ─┬─────────────┐
    W-2 state-tag-rule ──┼─> W-3 replaces-cli ─────────────┐
                         │                                  ├─> W-7 identity-proof
P2  W-4 comparison-cache ┴─> W-5 replaces-editor -> W-6 move┘
```

## Risks

- **Overlap W-1 / W-2 (same batch).** `serialize`: W-1 changes the kernel input and re-embeds the wasm into
  `standalone.html` and `Comparison`/`ComparisonDocument`, and W-2 changes how the CLI emits the look of a state from
  the same documents; running together would race on those files.
- **Overlap W-3 / W-4 (same batch).** `concurrent-safe`: W-3 edits Java sources, the CLI and the manual; W-4 edits
  `standalone.html` and its JS tests only. W-3 must not edit `standalone.html`, W-4 must not edit Java or the manual.
- **Overlap W-5 / W-6.** Not in the same batch: W-6 depends on W-5 (it reuses the writer of `replaces`).
- **The editor's save.** W-5 and W-6 write the user's manifests through the existing line-preserving save; a bug there
  corrupts a file. Both runs test the saved text against the original, and the editor is exercised on invented
  workspaces and on copies only.
- **A rewrite of references across files (W-6)** is the riskiest edit of the wave. It reuses the machinery of rename
  and must refuse, not guess, when a reference cannot be rewritten safely.
- **Contract bump.** Version 4 must change in Rust, Java and `standalone.html` together (W-1); a mismatch makes the
  editor and the CLI refuse the kernel.
- **Reserved names.** `replaces` joins the reserved fields of the kernel's answer for elements; a free-form field
  named like it must not leak (wave 008 had the same defect with `wording_only`).
- **No real content.** The runs read no real workspace. Examples and tests use invented names; the audit of the
  history for the user's real tokens is not needed because none is read.

## Completion Criteria

- All four phase gates hold.
- The branch `feat/element-identity-across-plateaus` carries one commit per run and is opened as one pull request,
  merged by rebase only.
- The follow-ups the runs defer are GitHub issues on tmorin/archicode, listed in the progress log.
- The status of this plan, the business case and the progress log is `completed`.
