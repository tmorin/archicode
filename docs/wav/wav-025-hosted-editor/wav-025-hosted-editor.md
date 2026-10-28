---
type: wave
wave: 025
status: planned
date: 2026-10-27
related:
  - docs/wav/wav-025-hosted-editor/wbc-025-hosted-editor.md
  - docs/wav/wav-024-fixes-and-editor-modules/wav-024-fixes-and-editor-modules.md
---

# Wave 025 — Hosted editor

## Purpose

A person with nothing installed opens https://tmorin.github.io/archicode/editor/ in Chrome, Firefox or Safari, opens the Brightcart sample in one click, edits it, finds the changes after a reload, and exports and imports the workspace as one YAML file with the same bytes. The same works when the editor is served by `archicode editor serve`, and it never touches the served folder or the user's disk unless a folder is picked. The plateau tree is indented by depth for a chain of any length (#175). `plateau fold` (#65) has an analysis that says what to build.

## Non-Goals

- #143, #134, #135, #24, #155 L3 and L4: not in this wave (see the business case).
- No code for `plateau fold`: W-2 writes an analysis and a recommendation, nothing else.
- No sync between devices, accounts, server-side store or collaborative editing; no TOML or JSON manifests in the editor; no reading of the bundle by the command line (a separate small issue once the format exists) (#162, "Not in scope").
- No change to how the editor writes a folder the user picks (Chromium's `showDirectoryPicker` path) or to the served-folder path.
- The ratchet of `src/main/editor/layers.json` does not rise; no file under `src/main/editor` goes over 3,000 lines.
- The browser's own folder picker is still not tested (as in wave 023).

## Decision Prerequisites

- **D1. A WebKit project in the end-to-end suite.** #162 targets Safari; Playwright's WebKit is not Safari but is the nearest test, and CLAUDE.md records it as "one more project and `webkit` in the install command when the hosted editor, #162, needs it" (three more system libraries, more CI time). **Accepted by the author on 2026-10-27: W-6 adds the WebKit project.** (The alternative, Chromium and Firefox only, would have left the Safari claim untested and said so in the manual.) Gates W-6 only; no longer open.
- Left to the runs, as the issue says: which page and plateau the call to action lands on (W-5); whether the browser workspace menu offers *Download a copy of the sample* (W-5); whether the node suite fakes IndexedDB with a dependency or with a small in-repo fake (W-4, a dev dependency needs the run to say why).

## Wave Manifest

```yaml
wave_manifest:
  wave: 025
  slug: hosted-editor
  status: planned
  sources:
    - 'gh:tmorin/archicode#175'
    - 'gh:tmorin/archicode#162'
    - 'gh:tmorin/archicode#65'
  phases:
    - id: P1
      name: Tree indentation and fold analysis
      gate:
        criteria:
          - '`npm run test:unit`, `npm run lint`, `npm run format:check` and `npm run editor:check` pass, and `ratchet.max` in `src/main/editor/layers.json` is not above 99'
          - 'a node test builds a chain of at least ten plateaus and asserts that the indentation of the card on the page Plateaus and of the entries of the two band lists grows with the depth up to the last plateau (read from the test file named in the run document of W-1)'
          - 'the run document of W-2 exists and has a section for each of: several plateaus above one, a plateau with siblings, `--archive`, the by-hand recipe checked on the Brightcart fixture, and a recommendation (build, build later, or close #65); it names the oracle a build would use (`plateau list` and `diff` before and after)'
          - '#65 has a comment that links the analysis document and states the recommendation (`gh issue view 65 --json comments`)'
    - id: P2
      name: Browser workspace, bundle and sample
      gate:
        criteria:
          - '`./mvnw verify -DskipITs=false`, `npm run test:coverage`, `npm run test:e2e`, `npm run lint`, `npm run format:check` and `npm run editor:check` pass; no coverage floor in `scripts/editor-coverage-floor.json` is lowered; `ratchet.max` is not above 99'
          - 'a node test asserts `unbundle(bundle(folder))` equals the folder byte for byte for every shipped example and fixture folder that holds a `.archicode.yaml`, and a cases file covers the refused paths (`..`, absolute, hidden other than the root `.archicode.yaml`, a path twice, over the size limit), a BOM, CRLF and a `---` inside a file'
          - 'the check of `src/main/resources/editor-webapp/samples/brightcart.yaml` exits 0 on the tree and exits 1 on a copy of the tree with one byte of the file changed (run both, record the output in the run document of W-5); the unbundled sample is loaded by the editor in a node test and by `archicode views generate` in a Java test'
          - '`EditorServeIT` asserts that the jar serves the sample, and a test asserts that opening the sample from `archicode editor serve` leaves the served folder unchanged'
          - 'an end-to-end spec in Chromium and Firefox (and WebKit if D1 is kept) opens the page without choosing a folder, opens the Brightcart sample, changes an element, reloads and finds the change, exports, deletes the browser workspace, imports the file and finds the same bytes; the spec is named in the run document of W-6'
          - 'the landing card shows no "Firefox and Safari don''t support it" sentence when `showDirectoryPicker` is absent and the browser workspace is available (a node test on `landingScreenConfig` or its successor)'
          - '`scripts/byte-identity.sh` shows no difference (the command line is unchanged)'
          - 'the CI run of the wave pull request, recorded in the wave prg by its run id, has `Java`, `Page`, `Kernel`, `E2E` and `Native` green'
  runs:
    - id: W-1
      slug: plateau-tree-indentation
      phase: P1
      depends_on: []
      run: 0189
      delegation: standard
      likely_paths:
        - 'src/main/editor/presentation/pages-plateaus-files.js'
        - 'src/main/editor/presentation/plateau-band.js'
        - 'src/main/editor/style.css'
        - 'src/main/resources/editor-webapp/standalone.html'
        - 'src/test/javascript/**'
        - 'src/doc/**/*.adoc'
        - 'CLAUDE.md'
      focus: 'a reader of the Plateaus page and of the two band lists sees a chain of any length as a sequence (#175)'
    - id: W-2
      slug: plateau-fold-analysis
      phase: P1
      depends_on: []
      run: 0190
      delegation: standard
      profile: single-document
      likely_paths:
        - 'docs/wav/wav-025-hosted-editor/run/**'
      focus: 'the author can decide whether to build `plateau fold` (#65), knowing what it does for several plateaus above, for siblings and for --archive'
    - id: W-3
      slug: bundle-codec
      phase: P2
      depends_on: []
      run: 0191
      delegation: standard
      likely_paths:
        - 'src/main/editor/persistence/**'
        - 'src/main/editor/names.json'
        - 'src/main/editor/java-names.json'
        - 'src/main/editor/layers.json'
        - 'src/main/resources/editor-webapp/standalone.html'
        - 'src/test/javascript/**'
        - 'src/test/resources/**/bundle-cases.json'
      focus: 'a whole workspace is one YAML text that comes back byte for byte (#162 proposal 1)'
    - id: W-4
      slug: browser-workspace
      phase: P2
      depends_on: []
      run: 0192
      delegation: hard_judgment
      delegation_reason: 'deletes and overwrites user data (a browser workspace can be deleted, reset or replaced) and changes the published editor; a flaw loses a visitor''s work'
      likely_paths:
        - 'src/main/editor/persistence/**'
        - 'src/main/editor/application/folder-session.js'
        - 'src/main/editor/presentation/**'
        - 'src/main/editor/style.css'
        - 'src/main/editor/names.json'
        - 'src/main/editor/java-names.json'
        - 'src/main/editor/layers.json'
        - 'src/main/resources/editor-webapp/standalone.html'
        - 'src/test/javascript/**'
        - 'src/test/e2e/**'
        - 'package.json'
        - 'CLAUDE.md'
      focus: 'a visitor in Chrome, Firefox or Safari works in a workspace kept in the browser, told plainly that it lives there (#162 proposal 2)'
    - id: W-5
      slug: import-export-and-sample
      phase: P2
      depends_on: [W-3, W-4]
      run: 0193
      delegation: hard_judgment
      delegation_reason: 'changes the published pipeline and site (website assembly in ci-build.yaml, the jar and native resources, the presentation page) - live capability'
      likely_paths:
        - 'src/main/editor/persistence/**'
        - 'src/main/editor/application/**'
        - 'src/main/editor/presentation/**'
        - 'src/main/editor/composition/**'
        - 'src/main/editor/names.json'
        - 'src/main/editor/java-names.json'
        - 'src/main/resources/editor-webapp/**'
        - 'src/main/java/io/morin/archicode/cli/EditorHttpServer.java'
        - 'src/test/java/io/morin/archicode/it/EditorServeIT.java'
        - 'scripts/**'
        - '.github/workflows/ci-build.yaml'
        - 'src/site/index.html'
        - 'src/test/javascript/**'
        - 'CLAUDE.md'
      focus: 'one click from the site to the editor on Brightcart, and one file out and back in (#162 proposals 3 and 4)'
    - id: W-6
      slug: hosted-editor-tests-and-docs
      phase: P2
      depends_on: [W-5]
      run: null
      delegation: standard
      likely_paths:
        - 'src/test/e2e/**'
        - 'playwright.config.js'
        - '.github/workflows/ci-build.yaml'
        - 'package.json'
        - 'src/doc/**/*.adoc'
        - 'CLAUDE.md'
      focus: 'the flow of the issue''s acceptance is a test in Firefox and Chromium, and the manual, CLAUDE.md and the presentation page tell it (#162 proposal 4)'
```

## Phase P1 — Tree indentation and fold analysis

| # | Run | Slug | Depends on | Focus | Scope | Exit evidence |
|---|-----|------|------------|-------|-------|---------------|
| W-1 | — | `plateau-tree-indentation` | — | a chain of any length reads as a sequence (#175) | remove or replace the `Math.min(depth, 6)` cap in `pages-plateaus-files.js` and `plateau-band.js` (two lists); the run chooses between unbounded growth and a capped step with a depth marker, checks it at 360 px (`[[editor-small-screen]]`) and says why; the manual line if any | a node test with a chain of ten plateaus or more on the page and on both band lists; `npm run test:unit` passes |
| W-2 | — | `plateau-fold-analysis` | — | the decision on #65 | a single document: run the by-hand recipe (`[[fold-by-hand]]`) on a copy of the Brightcart fixture and compare `plateau list` and `diff` before and after; settle the semantics for a plateau with several plateaus above it (the manual says keep it), for siblings, for `--archive`, for views and stories that name the plateau; the checks a command would need; a size and a recommendation. No source file changes | the document as listed in the gate; a comment on #65 |

**Gate:** see manifest (P1).

## Phase P2 — Browser workspace, bundle and sample

| # | Run | Slug | Depends on | Focus | Scope | Exit evidence |
|---|-----|------|------------|-------|-------|---------------|
| W-3 | — | `bundle-codec` | — | a workspace as one YAML text | `bundle` / `unbundle` as pure functions in a `persistence/` part, split on the `--- # file: <path>` lines only; the rules on import (refuse `..`, absolute paths, a hidden file other than the root `.archicode.yaml`, a path twice, a size over 10 MB); a list in the message of the files it cannot carry (not YAML, not UTF-8); `bundle-cases.json`; the round trip on every shipped workspace | the cases file and the round-trip test; `npm run editor:check` holds the ratchet |
| W-4 | — | `browser-workspace` | — | work in the browser | the IndexedDB store of `{workspace, path, bytes, modified}`; `browserDirectoryHandle` implementing the same interface as `serverDirectoryHandle`; the landing card (list, create from nothing, open, rename, delete); `navigator.storage.persist()` at the first save; the notice "lives in this browser" and the time of the last export; the unsupported card goes away where the browser store is available; a pass over the Chromium-only APIs of the whole page for Firefox and Safari (dialogs, `inert`, fullscreen, CSS) | node tests of the handle against an IndexedDB fake; an e2e spec that creates a browser workspace, edits, reloads and finds the change, in Chromium and Firefox; the saves of the existing tests are unchanged |
| W-5 | — | `import-export-and-sample` | W-3, W-4 | one click to Brightcart; one file out and in | *Export* and *Import* in the editor on the bundle; `samples/brightcart.yaml` generated by a script from `src/test/resources/brightcart/layered` and committed, with a `--check` (the pattern of `embed.sh --check` and `build-editor.mjs --check`) wired into CI; `EditorHttpServer` serves it, the site assembly copies it, native resources checked (`EditorServeIT`); *Open sample* / *Reset* always into a browser workspace, also from `editor serve`; the `#sample=brightcart` address read before anything is drawn; the button on `src/site/index.html`; the landing page of the call to action is the run's choice | the gate criteria on the sample, the check, `EditorServeIT`, the served folder untouched |
| W-6 | — | `hosted-editor-tests-and-docs` | W-5 | the acceptance as a test, and told | the end-to-end spec of the issue's acceptance in Chromium and Firefox, and WebKit if D1 is kept (the project and the install line in `playwright.config.js` and `ci-build.yaml`); `[[editor-open]]` in the manual, the editor pages' link to the sample, `CLAUDE.md` (the paragraph on the editor's distribution and the e2e suite's "what it does not test") | the spec named in the gate; the manual builds |

**Gate:** see manifest (P2).

## Dependency View

```
P1:  W-1   W-2        (W-2: documents only, no overlap with W-1)
       |
P2:  W-3   W-4        (serialize: both write the generated page and the name lists)
       \   /
        W-5
         |
        W-6
```

W-1 and the P2 runs edit the same generated page, which the phase gate already orders; no edge is declared. W-3 and W-4 need no edge between them but cannot run together (Risks).

## Risks

- **Overlap W-1 / W-2:** W-2 writes only under `docs/wav/wav-025-hosted-editor/run/`; verdict `concurrent-safe`, no shared path.
- **Overlap W-3 / W-4 (the generated `standalone.html`, `names.json`, `java-names.json`, `layers.json`, `src/test/javascript/**`, `persistence/`):** verdict `serialize`. Both change the committed page and the lists that `npm run editor:check` compares with it; two runs in one working tree would leave one stale page. W-3 first (it is smaller), then W-4.
- **W-5 and W-6 follow W-3 and W-4:** `depends_on` carries it, no same-batch overlap.
- **CLAUDE.md** is in the `likely_paths` of W-1, W-4, W-5 and W-6: all four are on a chain (W-1 in P1; W-4, W-5, W-6 ordered), so no overlap in a batch; each commits before the next starts (the lesson of wave 024's first batch).
- **The page is generated:** each run runs `npm run editor:build` and commits the sources and the page together; `npm run editor:check` fails otherwise. New files go in `persistence/` and `application/`; a name used by a lower layer from a higher one is an upward pair and raises the ratchet, which the gate forbids.
- **Firefox and Safari differences are found late:** W-4 does the pass over the page; the e2e suite in Firefox is the guard; Playwright's WebKit is not Safari and the real Safari is not tested, which the manual says (D1).
- **Browser storage is best-effort:** eviction, private windows and cleared site data lose a workspace. The mitigation is in the scope (storage.persist, the notice, the export reminder); the run says what it does not cover.
- **A Native-only failure:** the sample under `editor-webapp/samples/` must be in `quarkus.native.resources.includes` (`editor-webapp/**` already is); only the Native job proves it and Mandrel is not available locally (wave 023); the PR waits for it. A change in `pom.xml` or in publishing is proved on main's run or a tag (memory: CI PR vs main).
- **The site button and `ci-build.yaml`** change what the tag run publishes; W-5 is `hard_judgment` for that; the PR run never publishes.
- **Dependencies:** a fake for IndexedDB in the node suite may need a dev dependency; the run names it and why, or writes a small in-repo fake. No dependency enters the page.
- **Size:** 6 runs in 2 phases; the largest phase dispatches at most 2 runs at the same time (W-3 and W-4 serialized, so 1 in practice).

## Completion Criteria

- The P1 and P2 gates hold.
- #175 is closed by the PR; #162 is closed or its remainder is a new issue; #65 has the analysis and a recommendation (the issue stays open or is closed as the author decides on that comment).
- `CLAUDE.md` and the manual describe the browser workspace, the bundle and the sample, and the e2e suite's list of what it does not test is up to date.
- The log records the CI result of the PR (`Java`, `Page`, `Kernel`, `E2E`, `Build`, `Native`).
