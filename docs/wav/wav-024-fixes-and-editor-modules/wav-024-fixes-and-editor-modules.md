---
type: wave
wave: 024
status: completed
date: 2026-10-26
related:
  - docs/wav/wav-024-fixes-and-editor-modules/wbc-024-fixes-and-editor-modules.md
  - docs/wav/wav-023-fixes-and-tooling/wav-023-fixes-and-tooling.md
---

# Wave 024 — Fixes and editor modules

## Purpose

#166, #167 and #170 are closed: the served page has no console error on load, the example `domain_plateaus` plays no empty slide, and a view with no element is said in the same words by the command line and the editor (one file of cases, read by a Java test and a node test). The editor page is split into source files, assembled into the one file that is distributed, formatted and linted file by file, with the editor's behaviour, its saves and its distribution unchanged.

## Non-Goals

- #155 L3 and L4 (pinned limits, decided 2026-10-23); no change to the save.
- #143, #162, #65, #24, #134, #135: other waves. The split does not add the hosted editor.
- No change to what the editor does, writes or reads; no rename of a function named by a "keep them alike" comment of the Java code, unless the design run lists it and the comment follows.
- No new user-facing build step for a person who only runs `archicode` or opens the page; no bundler dependency unless D1 says so.
- The browser's folder picker and the native runner are not newly tested beyond what the Native job and the e2e suite already run.

## Decision Prerequisites

- **D1. How the split page is distributed.** Accepted by the author on 2026-10-26 (RFC-001, `rfc/rfc-001-editor-distribution.md`): the editor stays one distributed file, assembled from parts in `src/main/editor/` by `scripts/build-editor.mjs` (no dependency); the committed `standalone.html` is the output and CI checks it. ES modules and a bundler are rejected for now. Gates P2 and P3.
- **D2. The size of the first cut.** Whether CSS, the theme boot, the kernel's base64 and the small module script are separate files in W-5 (default: yes, they are the safe cuts). Decided by W-4's design.

## Wave Manifest

```yaml
wave_manifest:
  wave: 024
  slug: fixes-and-editor-modules
  status: completed
  sources:
    - 'gh:tmorin/archicode#166'
    - 'gh:tmorin/archicode#167'
    - 'gh:tmorin/archicode#170'
    - 'gh:tmorin/archicode#161'
    - 'gh-run:tmorin/archicode/40267805459 (E2E red on main, edit-and-save.spec.js:165 chromium)'
  phases:
    - id: P1
      name: Fixes
      gate:
        criteria:
          - '`./mvnw verify` and `npm run test:unit` pass'
          - '`npm run test:e2e` passes with no exception for `/favicon.ico` left in src/test/e2e/fixtures.js (the gate reads the results recorded in the wave prg: three local passes of 2026-10-26, 38 of 38 each; it does not run the suite again)'
          - 'the issue numbers #166, #167 and #170 are each named in a commit message of the wave'
          - '`archicode editor serve` answers GET /favicon.ico with a status that is not 404 (EditorServeIT)'
          - 'the E2E job is green on a run of the wave pull request (the teardown flake of run 40267805459 does not come back; decided by the author on 2026-10-26: one green run is enough; the gate reads run 40349186285 of pull request #174, which passed, and does not start a new run)'
    - id: P2
      name: Design of the modules
      gate:
        criteria:
          - 'the run document of W-4 lists the modules, their order, what each exports or shares, the build and test loading choice (D1) and the steps of P3 with the node suite as the guard of each'
          - 'the author has accepted the design (D1 recorded)'
    - id: P3
      name: Split
      gate:
        criteria:
          - '`./mvnw verify -DskipITs=false`, `npm run test:unit`, `npm run test:e2e`, `npm run lint`, `npm run format:check` and `node scripts/editor-coverage.mjs` pass'
          - 'no file under the editor sources is over 3,000 lines (`wc -l`) and `.prettierignore` no longer lists the page sources'
          - 'every move commit of P3 passes `scripts/build-editor.mjs --check-identical <parent commit>`'
          - 'the ratchet count in `src/main/editor/layers.json` has not risen since W-5, and the assembled page equals the committed one; `src/main/rust/viewpoint-kernel/embed.sh --check` passes'
          - '`scripts/byte-identity.sh` shows no difference for the editor-independent commands, and the node tests that compare the save with the page of archicode-0.17.0 pass unmodified'
  runs:
    - id: W-1
      slug: editor-favicon
      phase: P1
      depends_on: []
      run: 0178
      delegation: standard
      likely_paths:
        - 'CLAUDE.md'
        - 'src/main/java/io/morin/archicode/editor/**'
        - 'src/main/resources/editor-webapp/standalone.html'
        - 'src/test/e2e/**'
        - 'src/test/java/io/morin/archicode/it/EditorServeIT.java'
      focus: 'a person opening the editor sees no console error on load (#166)'
    - id: W-2
      slug: migration-story-step-3
      phase: P1
      depends_on: []
      run: 0179
      delegation: standard
      likely_paths:
        - 'CLAUDE.md'
        - 'src/doc/examples/domain_plateaus/**'
        - 'src/doc/**/*.adoc'
        - 'src/test/javascript/**/story-steps-plateaus.test.js'
      focus: 'the story shipped in the example plays a slide with something on it (#167)'
    - id: W-3
      slug: view-problem-sentences
      phase: P1
      depends_on: []
      run: 0180
      delegation: standard
      likely_paths:
        - 'CLAUDE.md'
        - 'src/main/java/io/morin/archicode/viewpoint/**'
        - 'src/main/resources/editor-webapp/standalone.html'
        - 'src/test/javascript/**'
        - 'src/test/resources/**/view-problem-cases.json'
        - 'src/test/java/io/morin/archicode/**'
      focus: 'one mistake in a view is told in the same words by both tools, from one file of cases (#170)'
    - id: W-10
      slug: e2e-teardown-flake
      phase: P1
      depends_on: []
      run: 0181
      delegation: standard
      likely_paths:
        - 'CLAUDE.md'
        - 'src/test/e2e/**'
      focus: 'the E2E suite does not fail on a console error that a page sends after its server has stopped (run 40267805459, edit-and-save.spec.js:165 on chromium)'
    - id: W-4
      slug: editor-modules-design
      phase: P2
      depends_on: [W-1, W-2, W-3]
      run: 0182
      delegation: hard_judgment
      delegation_reason: 'rests on an unresolved decision prerequisite (D1, how the split page is distributed)'
      likely_paths:
        - 'docs/wav/wav-024-fixes-and-editor-modules/**'
      focus: 'a cut of the editor that follows its state dependencies, with a step order the node suite can guard (#161 proposal 1)'
    - id: W-5
      slug: editor-assembly-and-first-cuts
      phase: P3
      depends_on: [W-4]
      run: 0183
      delegation: hard_judgment
      delegation_reason: 'changes the published editor and the release pipeline (website assembly, jar and native serving) - live capability'
      likely_paths:
        - 'scripts/**'
        - '.github/**'
        - 'package.json'
        - 'src/main/resources/editor-webapp/**'
        - 'src/main/rust/viewpoint-kernel/embed.sh'
        - 'src/main/java/io/morin/archicode/editor/**'
        - 'src/test/javascript/harness.js'
        - 'pom.xml'
      focus: 'the assembler, the layer file src/main/editor/layers.json with its ratchet, the name-list and byte-check tools, the kernel embedding, CI and serving all follow the new layout; first cuts are the non-logic parts (CSS, theme boot, kernel base64) (RFC-001, RFC-002, RFC-003)'
    - id: W-6
      slug: editor-extract-yaml-and-save
      phase: P3
      depends_on: [W-5]
      run: 0184
      delegation: standard
      likely_paths:
        - 'src/main/resources/editor-webapp/**'
        - 'src/main/editor/**'
        - 'src/test/javascript/**'
      focus: 'the YAML layer and the line-preserving save are files of their own, guarded by the generated save test (#161 proposal 2)'
    - id: W-7
      slug: editor-extract-model-and-kernel
      phase: P3
      depends_on: [W-6]
      run: 0185
      delegation: standard
      likely_paths:
        - 'src/main/resources/editor-webapp/**'
        - 'src/main/editor/**'
        - 'src/test/javascript/**'
      focus: 'file reading and writing, the plateau and layer model, the read schema and the kernel bridge are files of their own (#161 proposal 3, first half)'
    - id: W-8
      slug: editor-extract-pages-and-player
      phase: P3
      depends_on: [W-7]
      run: 0186
      delegation: standard
      likely_paths:
        - 'src/main/resources/editor-webapp/**'
        - 'src/main/editor/**'
        - 'src/test/javascript/**'
      focus: 'the diagram, the pages, the stories and the story player are files of their own and the page keeps only its bootstrap (#161 proposal 3, second half)'
    - id: W-11
      slug: editor-state-notifies
      phase: P3
      depends_on: [W-8]
      run: 0187
      delegation: hard_judgment
      delegation_reason: 'changes when the editor redraws after a write, a behaviour change in the save and the views (live capability of the published editor)'
      likely_paths:
        - 'src/main/editor/**'
        - 'src/test/javascript/**'
        - 'src/test/e2e/**'
      focus: 'the state publishes a change and presentation redraws: no layer below presentation names a renderer (RFC-002 rule 2); a change step, not a move, with the e2e suite as guard'
    - id: W-9
      slug: editor-modules-closeout
      phase: P3
      depends_on: [W-8, W-11]
      run: 0188
      delegation: standard
      likely_paths:
        - '.prettierignore'
        - 'eslint.config.mjs'
        - 'scripts/**'
        - 'CLAUDE.md'
        - 'src/doc/**'
        - 'src/main/resources/editor-webapp/**'
      focus: 'format and lint apply to the editor files, the coverage floor and areas follow the sources, the documents say how the editor is built'
```

## Phase P1 — Fixes

| # | Run | Slug | Depends on | Focus | Scope | Exit evidence |
|---|-----|------|------------|-------|-------|---------------|
| W-1 | — | `editor-favicon` | — | no console error on load (#166) | a `<link rel="icon" href="data:,">` or a 204 for `/favicon.ico` in `EditorHttpServer` (the run chooses one and says why); remove the exception in the e2e `pageErrors` fixture and its comment in CLAUDE.md | `EditorServeIT` asserts the status is not 404; the e2e suite passes with no exception |
| W-2 | — | `migration-story-step-3` | — | a slide with content (#167) | read the step, change its viewpoint or view in `domain_plateaus` (the `detailed` viewpoint is the suggestion); update every place the manual quotes it | a test that every step of every shipped story draws at least one element or is stated empty on purpose; the unit and Java suites pass |
| W-3 | — | `view-problem-sentences` | — | one voice for the view problems (#170) | one case file for the view problems (as `dangling-reference-cases.json`), read by a Java test and a node test; align the words of whichever tool is changed, at least `has no element`; list the other view problems and align those the file covers | the two tests read the same file; `library-view-edit.test.js` and others updated for the words; CLAUDE.md "Not aligned, recorded" sentence removed |
| W-10 | — | `e2e-teardown-flake` | — | the E2E suite fails only on a real error (run 40267805459) | the `pageErrors` fixture and the `serve` fixture: a request the page sends during teardown (after the server stops) is either waited for before the stop or told apart from an error the page raised while the test ran; `fixtures.js` comment updated | the E2E job green on a run of the wave pull request; the same test shows no flake in a repeated run locally (`--repeat-each`) |

**Gate:** see manifest (P1).

## Phase P2 — Design of the modules

| # | Run | Slug | Depends on | Focus | Scope | Exit evidence |
|---|-----|------|------------|-------|-------|---------------|
| W-4 | — | `editor-modules-design` | W-1, W-2, W-3 | the cut | read the global state (`AppState`, `layerCache`, the `let`s at the top) and the 52 files that mention the page; write the modules and their dependency order, the D1 mechanism, how the tests, the coverage script (`SCRIPT_URL`, `SECTIONS`) and the lint extraction load the sources, how `embed.sh` and the website step change, the list of functions named by Java comments, and the steps of P3 each with its guard | the run document as listed in the gate; no source file changed |

**Gate:** see manifest (P2). The author reads the design before P3 is dispatched.

## Phase P3 — Split

| # | Run | Slug | Depends on | Focus | Scope | Exit evidence |
|---|-----|------|------------|-------|-------|---------------|
| W-5 | — | `editor-assembly-and-first-cuts` | W-4 | assembly, layers and the first guards, before any logic moves | `scripts/build-editor.mjs` (assemble, `--check`, `--check-identical <commit>`); `src/main/editor/layers.json` and its ratchet (the current violations, counted); the check that the top-level names equal a committed list and that the page functions named by Java comments exist; tests, coverage and lint read the sources; `embed.sh` through the assembler; CI "Page" job and the website `sed`; `EditorHttpServer` and `quarkus.native.resources.includes`; first cuts (CSS, theme boot, kernel base64) | node suite, Java suite, e2e, `embed.sh --check`, `EditorServeIT` pass; the assembled file equals the old page apart from the part headers |
| W-6 | — | `editor-extract-yaml-and-save` | W-5 | pure parts | YAML reading, `patchYamlText` and the helpers of the save, as named by the design, one commit each | each move or relocate passes its byte check against its parent; the node suite is green at the end of each step (RFC-003); `save-generator.js` and the comparison with `archicode-0.17.0` unchanged |
| W-7 | — | `editor-extract-model-and-kernel` | W-6 | stateful core | file handles and folder reading, `READ_SCHEMA`, the plateau tree and layer loader, the kernel bridge, the caches | as W-6, plus `EditorReadSchemaTest` and the discovery tests |
| W-8 | — | `editor-extract-pages-and-player` | W-7 | UI | diagram, pages, stories, the player, the bootstrap | as W-7, plus the e2e suite |
| W-11 | — | `editor-state-notifies` | W-8 | the cycles of state and rendering | `modelsChanged()` publishes a version; presentation subscribes and redraws; the commit pipeline stops calling renderers; the ratchet count falls (the listed violations go) | e2e and node suites green; the ratchet count is lower than after W-5 |
| W-9 | — | `editor-modules-closeout` | W-8 | tooling and docs | drop the page from `.prettierignore`, lint and format the sources, coverage areas by file with the floor not lowered, CLAUDE.md and the manual say how the editor is built | the P3 gate |

**Gate:** see manifest (P3).

## Dependency View

```
P1:  W-1   W-2   W-3   W-10   (W-1, W-3, W-10: serialize on the e2e and page files)
       \    |    /
P2:      W-4  (D1)
          |
P3:  W-5 -> W-6 -> W-7 -> W-8 -> W-11 -> W-9
```

## Risks

- **Overlap W-1 / W-3 (`standalone.html`, `src/test/e2e`, the Java tests):** verdict `serialize`. Both edit the page and shared tests; W-1 first.
- **Overlap W-10 / W-1 (`src/test/e2e/**`):** verdict `serialize`. Both edit the E2E fixtures; W-10 after W-1.
- **Overlap W-1 / W-2 / W-3 / W-10 on `CLAUDE.md`:** verdict `serialize`. Each run edits its own paragraph of the file. The first attempt ran W-1 and W-2 together and W-3 and W-10 together, which left the four edits in one working tree with no commit between them. Each run now commits before the next starts.
- **Overlap W-1 / W-2 on `src/test/e2e/**`:** not a collision in the first attempt (W-2 changed `story-player.spec.js`, W-1 the fixtures), but verdict `serialize` because both are in the E2E suite and run in one lane.
- **W-5 to W-9 all edit the editor sources:** they are a chain (`depends_on`), so there is no same-batch overlap; verdict `serialize` for any attempt to split a P3 run in two.
- **The Native job cannot be run locally** (no Mandrel here, wave 023's finding): a change to `pom.xml` or to the resources of the native image (W-5) is proved only by CI; the run says so and the PR waits for the Native job.
- **The page is the file 52 others name:** Java comments name its functions; W-4 lists them, and a rename is a change to those comments in the same commit.
- **Size:** a split of 22,000 lines is the largest change to one file in the history; the guards are the byte check of each move (RFC-003), the node suite (2,565 tests) at the end of each step, and the comparison with the released pages. If W-4 finds the state too entangled to cut the stateful parts safely, W-7 and W-8 are re-planned into a later wave rather than forced.
- **D1 unanswered:** W-4 stalls and nothing in P3 starts.
- **PR/main CI:** a pom or publishing change is proved only on main's run or a tag (see memory: CI PR vs main).

## Completion Criteria

- The P1, P2 and P3 gates hold.
- #166, #167 and #170 are closed by the PR; #161 is closed or its remaining part is a new issue; the issues have a comment with the commit that fixed them.
- CLAUDE.md describes the new layout in "Build & Test" and "Architecture" (the page as an assembly) with no remaining statement that the editor is one 23,000-line file.
- The log records the CI result of the PR (`Java`, `Page`, `Kernel`, `E2E`, `Build`, `Native`).
