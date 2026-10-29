---
type: wave
wave: 026
status: completed
date: 2026-10-28
related:
  - docs/wav/wav-026-relationship-view/wbc-026-relationship-view.md
  - docs/wav/wav-025-hosted-editor/wav-025-hosted-editor.md
  - docs/wav/wav-025-hosted-editor/run/run-0190-plateau-fold-analysis/run-0190-plateau-fold-analysis.md
---

# Wave 026 — Relationship view

## Purpose

A Map view of the application layer can say which relationships to show (`links`), and the boxes drawn are the ends of those relationships with their ancestors, in the command line and in the editor, drawn by the same kernel. A step of a story, and a view, can highlight one relationship against the ones shown, and the story player plays it. Every Map and view saved before the wave is drawn byte for byte as before. The name field of a new browser workspace is one line high (#177), and the manual's recipe for folding a plateau by hand gives the same tables before and after (the repair #65's analysis asks for).

## Non-Goals

- `plateau fold` is not built (#65); no `--archive`; the "make the future the new root" operation stays out.
- #143 v1 is the application layer only: no relationship of the technology layer, no derived dependency between environments in `links`.
- No new `viewpoint` value, no change to the overview, detailed and deep viewpoints.
- #134, #135, #24, #155 L3 and L4 are not in this wave.
- The kernel contract number does not move if the keys are additive (it stayed 5 for `chain`, `applications` and `relationships`); a run that cannot keep it additive stops and says so.
- The ratchet of `src/main/editor/layers.json` does not rise (99), and no file under `src/main/editor` goes over 3,000 lines.
- The tag run, the native runner and the real Safari are still not proved by this wave.

## Decision Prerequisites

None open. The shape is decided in D11 (comment of 2026-10-23 on #143): application layer only, a `links` property of `map`, highlight on the step and on the view, a relationship named by (layer, source, destination, label), the player plays these views. Left to the runs, because the issue does not settle them (see Open questions): the written form of an entry of `links`, how two relationships with the same triple are told, and the form of the highlight.

## Open questions

- The written form of an entry of `links` (a map `{source, destination, label}`, or a string) and what a relationship with no label is. Decided by W-3's TDD, who must say it in the guide and in the schema table of view properties.
- Two relationships of one source with the same destination and the same label (allowed today?): shown together, or refused. W-3 checks what the model allows and decides.
- Whether a rename or a move of an element rewrites `links` in the saved views, as it rewrites `pinned` and the steps. "A rename or a move must keep it" is in the issue; W-5 owns the editor side, W-3 says what the command line does (an entry that names nothing is an `error:` line or a warning, as for `pinned`).
- The form of the highlight (a `highlight` list of the same entries on the step and on the view; what "calmer" is in PlantUML and in the editor's SVG). W-4's TDD.

## Wave Manifest

```yaml
wave_manifest:
  wave: 026
  slug: relationship-view
  status: completed
  sources:
    - 'gh:tmorin/archicode#143'
    - 'gh:tmorin/archicode#177'
    - 'gh:tmorin/archicode#65'
  phases:
    - id: P1
      name: Fixes
      gate:
        criteria:
          - '`npm run test:unit`, `npm run lint`, `npm run format:check` and `npm run editor:check` pass, and `ratchet.max` in `src/main/editor/layers.json` is not above 99'
          - 'the end-to-end spec named in the run document of W-1 checks, in Chromium, Firefox and WebKit, that the name field of a new browser workspace and of a rename is no taller than one line of text plus its padding at desktop width and at 360 px (`npm run test:e2e`)'
          - 'the manual''s section `fold-by-hand` (`src/doc/README.adoc`) names the composition of the `replaces` of the plateau above and the two columns (PLATEAU and PATCH) that change; the run document of W-2 records `plateau list`, `diff` and `views generate` before and after the recipe on a copy of the layered Brightcart, equal but for those columns'
    - id: P2
      name: Links and highlight in the kernel and the command line
      gate:
        criteria:
          - '`./mvnw verify -DskipITs=false`, `cargo test --manifest-path src/main/rust/viewpoint-kernel/Cargo.toml`, `src/main/rust/viewpoint-kernel/embed.sh --check`, `npm run test:unit` and `npm run editor:check` pass; no Java or editor coverage floor is lowered; the kernel line coverage stays at or above 90 %'
          - '`scripts/byte-identity.sh` shows no unexpected difference (every view and Map written before the wave is byte for byte as the tag `archicode-0.19.0` writes it)'
          - 'a Java test and a Rust test draw a Map with `links` and assert the boxes and links (the ends of the relationships and their ancestors, nothing else); a test shows a `links` entry that names no relationship as one `error:` line or a warning, as W-3''s run document says, with exit 0 or 1 as written there'
          - 'a story step and a view with a highlight are drawn by `archicode stories generate` and `archicode views generate`, a test asserts the highlighted link differs from the others in the `.puml`, and a view with no highlight is drawn exactly as before'
          - '`GuideViewPropertiesTest` passes with `links` and the highlight in the guide''s table, and the golden `src/test/resources/guide/golden.md` is regenerated in the same commit'
    - id: P3
      name: The editor and the stories
      gate:
        criteria:
          - '`./mvnw verify -DskipITs=false`, `npm run test:coverage`, `npm run test:e2e`, `npm run lint`, `npm run format:check` and `npm run editor:check` pass; no coverage floor in `scripts/editor-coverage-floor.json` is lowered; `ratchet.max` is not above 99'
          - 'a node test asserts that, for each saved Map with `links` of the shipped examples and of the layered Brightcart, the editor''s boxes and links equal those the command line writes (`expected-boxes.json` style contract)'
          - 'an end-to-end spec in Chromium and Firefox picks relationships in the list and on the diagram, saves the view, reloads and finds the same boxes; the file written on disk holds the `links` (named in the run document of W-5)'
          - 'a node test plays a story whose steps show a growing set of relationships in the story player and asserts the highlighted link of each step, and that the editor is byte for byte what it was after the player closes (`story-player-modal.test.js` style)'
          - '`scripts/byte-identity.sh` shows no unexpected difference'
          - 'the manual, `archicode guide` and `CLAUDE.md` describe `links` and the highlight; `GuideTest` passes with the regenerated golden file'
          - 'the CI run of the wave pull request, recorded in the wave prg by its run id, has `Java`, `Page`, `Kernel`, `E2E` and `Native` green'
  runs:
    - id: W-1
      slug: landing-name-field
      phase: P1
      depends_on: []
      run: 0195
      delegation: standard
      likely_paths:
        - 'src/main/editor/style.css'
        - 'src/main/editor/presentation/landing.js'
        - 'src/main/resources/editor-webapp/standalone.html'
        - 'src/test/e2e/browser-workspace.spec.js'
        - 'src/test/javascript/**'
      focus: 'a visitor creating or renaming a browser workspace sees a one-line name field with its buttons on the same row, at desktop and at 360 px (#177)'
    - id: W-2
      slug: fold-recipe-repair
      phase: P1
      depends_on: []
      run: 0196
      delegation: standard
      profile: TDD+pln
      likely_paths:
        - 'src/doc/README.adoc'
        - 'docs/wav/wav-026-relationship-view/run/**'
      focus: 'an author who folds a plateau by hand with the manual gets the same plateau list, diff and views before and after (#65, the repair the analysis asks for)'
    - id: W-3
      slug: map-links-kernel
      phase: P2
      depends_on: []
      run: 0197
      delegation: standard
      likely_paths:
        - 'src/main/rust/viewpoint-kernel/**'
        - 'src/main/wasm/viewpoint_kernel.wasm'
        - 'src/main/java/io/morin/archicode/viewpoint/**'
        - 'src/main/java/io/morin/archicode/cli/**'
        - 'src/main/resources/editor-webapp/standalone.html'
        - 'src/test/java/**'
        - 'src/test/resources/**'
        - 'src/main/resources/guide/guide.md'
        - 'src/doc/**/*.adoc'
        - 'CLAUDE.md'
      focus: 'an author lists relationships in the `links` of a Map and the command line draws their ends and ancestors, and every Map saved before is drawn as it was (#143, kernel and command line)'
    - id: W-4
      slug: link-highlight
      phase: P2
      depends_on: [W-3]
      run: 0198
      delegation: standard
      likely_paths:
        - 'src/main/rust/viewpoint-kernel/**'
        - 'src/main/wasm/viewpoint_kernel.wasm'
        - 'src/main/java/io/morin/archicode/viewpoint/**'
        - 'src/main/java/io/morin/archicode/resource/**'
        - 'src/main/java/io/morin/archicode/cli/**'
        - 'src/main/java/io/morin/archicode/rendering/**'
        - 'src/main/resources/editor-webapp/standalone.html'
        - 'src/test/java/**'
        - 'src/test/resources/**'
        - 'src/main/resources/guide/guide.md'
        - 'src/doc/**/*.adoc'
        - 'CLAUDE.md'
      focus: 'a reader of the drawn files sees which link a story step is about: the highlighted one in full, the others calmer, from a property of the step and of the view (#143, highlight)'
    - id: W-5
      slug: editor-links
      phase: P3
      depends_on: [W-3]
      run: 0199
      delegation: standard
      likely_paths:
        - 'src/main/editor/**'
        - 'src/main/resources/editor-webapp/standalone.html'
        - 'src/test/javascript/**'
        - 'src/test/e2e/**'
        - 'src/doc/**/*.adoc'
        - 'CLAUDE.md'
      focus: 'an author ticks relationships in a list or clicks them on the diagram, the boxes follow, and the saved view keeps them through a rename or a move (#143, the editor)'
    - id: W-6
      slug: links-in-stories
      phase: P3
      depends_on: [W-4, W-5]
      run: 0200
      delegation: standard
      likely_paths:
        - 'src/main/editor/**'
        - 'src/main/resources/editor-webapp/standalone.html'
        - 'src/test/javascript/**'
        - 'src/test/e2e/**'
        - 'src/test/resources/**'
        - 'src/main/resources/guide/guide.md'
        - 'src/doc/**/*.adoc'
        - 'CLAUDE.md'
      focus: 'a reader plays a story whose steps light up a sequence of relationships, in the editor and in the player, and the manual tells how to write one (#143, stories and manual)'
```

## Phase P1 — Fixes

| # | Run | Slug | Depends on | Focus | Scope | Exit evidence |
|---|-----|------|------------|-------|-------|---------------|
| W-1 | — | `landing-name-field` | — | a one-line name field with its buttons on a row | `.landing-browser-input` sizing, the rename field of the list, narrow layout | an e2e check of the field height at desktop and 360 px in the three browsers; page rebuilt |
| W-2 | — | `fold-recipe-repair` | — | the by-hand fold gives the same tables before and after | the section `fold-by-hand` of the manual: compose the `replaces`, two columns change | before/after of `plateau list`, `diff`, `views generate` on a copy of the layered Brightcart, recorded |

**Gate:** see the manifest (P1).

## Phase P2 — Links and highlight in the kernel and the command line

| # | Run | Slug | Depends on | Focus | Scope | Exit evidence |
|---|-----|------|------------|-------|-------|---------------|
| W-3 | — | `map-links-kernel` | — | `links` of a Map drawn by the kernel and the command line | kernel `map`, `KernelViewpointFactory`, the written form and the refusals, the guide's table, byte-identity | Rust and Java tests of the boxes and links, `error:` or warning for a name that matches nothing, byte-identity clean |
| W-4 | — | `link-highlight` | W-3 | the link a step is about stands out | the `highlight` property of a view and of a step, the kernel's marking, PlantUML, `stories generate` | a `.puml` where the highlighted link differs; a view without highlight unchanged |

**Gate:** see the manifest (P2).

## Phase P3 — The editor and the stories

| # | Run | Slug | Depends on | Focus | Scope | Exit evidence |
|---|-----|------|------------|-------|-------|---------------|
| W-5 | — | `editor-links` | W-3 | pick relationships in a list or on the diagram | the list (by source, destination, kind, text), clicks, saved view writer, the diagram cache key, the address, rename and move following `links` | the editor equals the command line box by box; an e2e spec picks, saves, reloads |
| W-6 | — | `links-in-stories` | W-4, W-5 | play a sequence of relationships | highlight drawn in the editor and in the player, the shipped story of a flow, manual, guide, CLAUDE.md | the player test on a growing set of links; editor unchanged after close; docs regenerated |

**Gate:** see the manifest (P3).

## Dependency View

```
P1: W-1   W-2                (independent, no shared path)
P2: W-3 --> W-4
P3: W-3 --> W-5 --+
    W-4 ----------+--> W-6
```

## Risks

- **Overlap W-1 / W-2:** W-1 edits the editor sources and the generated page, W-2 edits `src/doc/README.adoc`; verdict `concurrent-safe`, no shared path (W-1 writes none under `src/doc`; if it must, it stops and says so).
- **Overlap W-3 / W-4 (the Rust kernel, the `.wasm`, the Java adapter, the page's kernel block, the guide, the golden file):** they are on a chain (`depends_on`), so never in one batch.
- **Overlap W-5 / W-6 (`src/main/editor/**`, the page, tests):** W-6 depends on W-5; no same-batch overlap. W-4 and W-5 do not overlap in a batch: W-4 is in P2, W-5 in P3, and the P2 gate comes first (both write the page: W-4 through `embed.sh`'s kernel block, W-5 through the sources).
- **The kernel is shared:** a change to `map` that moves an existing Map breaks the command line and the editor at once. The byte-identity harness and the saved maps' contract (`expected-boxes.json`, `domain_technology_map`, the layered Brightcart) are the guards; the keys are additive (`links` absent means drawn as before, as `applications` and `relationships` did in wave 016). The `.wasm` is committed; `embed.sh` and its `--check` mode must agree.
- **W-3 is `standard`, not `hard_judgment`:** the author's D11 wrote "hard_judgment" for the kernel cut, but none of the criteria of the tier (live capability, credentials, data deletion or migration, an unresolved decision) applies: the shape is decided, nothing is deleted, nothing is published by the run. The guard is the P2 gate (byte-identity and the saved maps). Raise it if the reviewer reads D11 differently.
- **The naming of a relationship** (source, destination, label) is not an id: a rename of an end or of the label breaks an entry. W-3 decides what the command line says, W-5 rewrites `links` on rename and move; a case the editor cannot follow is told, not guessed.
- **The generated page:** each run that touches the editor runs `npm run editor:build` and commits sources and page together; W-3 and W-4 commit the page block written by `embed.sh`.
- **Browser engines:** W-1 and W-5 are checked in Chromium and Firefox (W-1 also in WebKit); the real Safari is not tested.
- **Native:** `links` needs no reflection entry unless a new class is read by reflection (`reflect-config.json`); only the Native job proves it on a pull request (memory: CI PR vs main).
- **Size:** 6 runs, 3 phases; at most 2 runs dispatch at the same time (P1); P2 and P3 are chains.

## Completion Criteria

- The P1, P2 and P3 gates hold.
- #177 is closed by the PR; #143 is closed (or its remainder, if any, is a new issue); #65 stays open with the repaired recipe noted in a comment.
- The manual, `archicode guide` and `CLAUDE.md` describe `links` and the highlight, and the manual's fold recipe is repaired.
- The log records the CI result of the PR (`Java`, `Page`, `Kernel`, `E2E`, `Build`, `Native`).
