---
type: wave
wave: 034
status: completed
date: 2026-11-06
related:
  - docs/wav/wav-034-diagrams-assets-likec4-matrix-page/wbc-034-diagrams-assets-likec4-matrix-page.md
  - docs/wav/wav-033-import-structurizr-and-plateau-matrix/wav-033-import-structurizr-and-plateau-matrix.md
---

# Wave 034 — The manual's diagrams, the editor's files beside a lean page and the matrix page

## Purpose

The manual on the website draws its 18 diagrams and the build fails when it does not. The editor's page is lean: CodeMirror, ELK and the kernel are three files committed beside it, served by `editor serve`, the website and the native image, nothing is imported from a public server, and the editor works with external hosts blocked. The page Plateaus reads a path of plateaus in a table that shows the same rows as `plateau matrix`.

## Non-Goals

- No Maven build of the kernel (Rust) and no Maven build of the page (Node): the files stay committed and the Java build needs neither (#207, the road after this wave).
- No change of the kernel's Rust, no change of `plateau matrix`, `gap.*` or `matrix-cases.json` (the page reads them).
- No LikeC4 importer (#134): its run was started and stopped at its first task, see Deferred.
- No relationships, no transient row and no all-against-baseline in the matrix page (#24).
- No tag and no release: the manual on the website changes on the next tag, which the author decides.
- No change of an existing command's output on a shipped workspace (`scripts/byte-identity.sh` stays green with no new exception).

## Decision Prerequisites

None: each ticket carries the author's decision (#209 verified fix; #207 of 2026-11-06; #134 and #24 of 2026-10-31 and 2026-11-02). The run of #134 needs Node and the network once, to generate the sample with the vendor tool; if it cannot, it stops and says so (see Open questions).

## Open questions

- If `likec4 export json` cannot be run by the run (no Node, no network, a different JSON in the current version), the run does not invent a sample: it stops with the reason and the importer waits. Proposed default, to confirm.
- Whether the fix of #209 is released in a patch tag is the author's call after the merge.

## Deferred

- **W-4 `likec4-json-import` (#134), run 0229.** Its design (TDD and plan) was written; its first task, which generates the sample with the vendor tool, was stopped because the session's permission system refused to run `likec4 export json` (the install of `likec4@1.60.0` with `--ignore-scripts` and the clone at the tag v1.60.0 had worked). The plan's own open question says the run does not invent a sample, so the run was cancelled and taken out of the manifest; no code of it is kept. #134 stays `ready` and open. To resume: the author runs once, in a scratch folder, `npm install --ignore-scripts likec4@1.60.0`, clones github.com/likec4/likec4 at v1.60.0 and runs `likec4 export json --skip-layout --project cloud-system` on `examples/cloud-system`, or allows the agent to; the design of run 0229 (`run/run-0229-likec4-json-import/`) is the starting point of the next wave.

## Wave Manifest

```yaml
wave_manifest:
  wave: 034
  slug: diagrams-assets-likec4-matrix-page
  status: completed
  sources:
    - '#209'
    - '#207'
    - '#134'
    - '#24'
  phases:
    - id: P1
      name: The manual draws its diagrams
      gate:
        criteria:
          - 'with JAVA_HOME a JDK 25, `rm -rf target/generated-docs && ./mvnw -o generate-resources -Dmaven.test.skip` exits 0, `grep -c "Could not load PlantUML" target/generated-docs/index.html` prints 0 (18 on the starting repository) and `ls target/generated-docs/*.png | wc -l` prints at least 18 (0 on the starting repository)'
          - '`grep -c asciidoctorj-diagram-plantuml pom.xml` prints at least 1 (0 on the starting repository)'
          - 'a step of the job `Java` in .github/workflows/ci-build.yaml holds the text `Failed to generate image` (it does not on the starting repository); the command of that step, run in a scratch folder on a copy of target/generated-docs/index.html where one block is replaced by that text, exits non-zero, and on the real page it exits 0'
          - '`./mvnw test-compile pmd:check` and `npm run format:check` exit 0'
    - id: P2
      name: The editor files beside a lean page
      gate:
        criteria:
          - '`grep -rnE "import\(.https?:" src/main/editor src/main/resources/editor-webapp --include=*.js --include=*.mjs --include=*.html` prints nothing (6 hits in src/main/editor and 6 in standalone.html on the starting repository)'
          - '`grep -c esbuild package.json` prints at least 1 and `grep -c "node_modules/esbuild" package-lock.json` prints at least 1 (0 and 0 on the starting repository); `npm ci` exits 0'
          - 'the folder src/main/resources/editor-webapp/assets holds codemirror.js, elk.js and viewpoint_kernel.wasm (the folder does not exist on the starting repository), and `npm run editor:check` exits 0, which includes a rebuild of the bundles compared to the committed ones'
          - 'standalone.html is at least 1,000,000 bytes smaller than the 2,736,458 bytes of the starting repository, and `grep -c "application/octet-stream" src/main/resources/editor-webapp/standalone.html` prints 0 (1 on the starting repository)'
          - 'with the application built, `editor serve` started on a free port (src/test/CLAUDE.md for the way), a request with the token for /assets/viewpoint_kernel.wasm answers 200 with the type application/wasm, one for /assets/codemirror.js answers 200 with a JavaScript type, a request without the token or the cookie answers 403 and a name that is not in the table answers 404; EditorHttpServerTest and EditorServeIT pass'
          - 'an end-to-end spec named in the document of the run W-2 starts the editor with every host but 127.0.0.1 blocked, draws a diagram and edits YAML in CodeMirror, and `npx playwright test <that spec> --project=chromium` and `--project=firefox` exit 0'
          - 'the step "Assemble website" of .github/workflows/ci-build.yaml copies the folder assets to the editor folder of the site and compares each file with `cmp` (no mention of `editor/assets` on the starting repository)'
          - '`npm run test:unit`, `npm run test:coverage`, `npm run format:check`, `npm run lint` and `./mvnw verify -DskipITs=false` exit 0, `scripts/byte-identity.sh` exits 0 with scripts/byte-identity-exceptions.txt unchanged, `ratchet.max` in src/main/editor/layers.json is at most 99, and `npm run editor:build` and `npm run sample:build` leave `git status --short` unchanged'
    - id: P3
      name: The matrix page
      gate:
        criteria:
          - 'criterion 1 of the first gate of P3 held, as recorded by the entry `gate P3 verified by a fresh agent` of docs/wav/wav-034-diagrams-assets-likec4-matrix-page/prg-034-diagrams-assets-likec4-matrix-page.md (index 1: the node test over matrix-cases.json, the e2e spec on chromium and firefox, the address and the reload), and the tree has not changed since: `git status --short -- src scripts` prints nothing and the last commit that changes src or scripts is a2906de (`git log -1 --format=%h -- src scripts` prints a2906de)'
          - 'the oracle and the Rust are not edited by the wave: `git diff --stat c9a618c HEAD -- src/test/resources/brightcart/matrix-cases.json src/test/resources/brightcart/expected src/main/rust/viewpoint-kernel/src` prints nothing (c9a618c is the commit before the wave; only the notes, README and embed.sh of src/main/rust/viewpoint-kernel and the move of the .wasm to editor-webapp/assets changed, by runs W-2 and W-3), `ratchet.max` in src/main/editor/layers.json is at most 99, and `git diff c9a618c HEAD -- scripts/editor-coverage-floor.json` shows no number lower than before'
          - 'criterion 3 of the first gate of P3 held, as recorded by the entry `gate P3 verified by a fresh agent` of docs/wav/wav-034-diagrams-assets-likec4-matrix-page/prg-034-diagrams-assets-likec4-matrix-page.md (index 3: the build, test, format, lint and byte-identity gates), and the tree has not changed since: `git status --short -- src scripts` prints nothing and the last commit that changes src or scripts is a2906de (`git log -1 --format=%h -- src scripts` prints a2906de)'
          - 'criterion 4 of the first gate of P3 held, as recorded by the entry `gate P3 verified by a fresh agent` of docs/wav/wav-034-diagrams-assets-likec4-matrix-page/prg-034-diagrams-assets-likec4-matrix-page.md (index 4: the page opened from a disk: the third test of editor-offline.spec.js on chromium and firefox, no import(, three classic scripts), and the tree has not changed since: `git status --short -- src scripts` prints nothing and the last commit that changes src or scripts is a2906de (`git log -1 --format=%h -- src scripts` prints a2906de)'
  runs:
    - id: W-1
      slug: manual-plantuml-diagrams
      phase: P1
      depends_on: []
      run: 0226
      delegation: standard
      profile: single-document
      likely_paths:
        - 'pom.xml'
        - '.github/workflows/ci-build.yaml'
        - '.github/CLAUDE.md'
      focus: 'read the manual on the website with its 18 diagrams drawn, and have the build say when one is not'
    - id: W-2
      slug: editor-assets-beside-the-page
      phase: P2
      depends_on: []
      run: 0227
      delegation: hard_judgment
      delegation_reason: 'changes the files the live hosted editor serves (the website step is proved only by a tag run)'
      likely_paths:
        - 'package.json'
        - 'package-lock.json'
        - 'scripts/build-editor.mjs'
        - 'scripts/check-editor.mjs'
        - 'scripts/changes.mjs'
        - 'src/main/editor/**'
        - 'src/main/resources/editor-webapp/**'
        - 'src/main/java/io/morin/archicode/cli/EditorHttpServer.java'
        - 'src/test/java/io/morin/archicode/cli/EditorHttpServerTest.java'
        - 'src/test/java/io/morin/archicode/it/EditorServeIT.java'
        - 'src/test/javascript/**'
        - 'src/test/e2e/**'
        - '.github/workflows/ci-build.yaml'
        - '.github/CLAUDE.md'
        - 'src/doc/README.adoc'
        - 'src/test/CLAUDE.md'
      focus: 'open the editor with the network blocked and still draw a diagram and edit YAML in CodeMirror'
    - id: W-3
      slug: kernel-beside-the-page
      phase: P2
      depends_on: [W-2]
      run: 0228
      delegation: standard
      likely_paths:
        - 'src/main/editor/model/kernel-bridge.js'
        - 'src/main/editor/names.json'
        - 'src/main/editor/CLAUDE.md'
        - 'scripts/build-editor.mjs'
        - 'src/main/rust/viewpoint-kernel/embed.sh'
        - 'src/main/rust/viewpoint-kernel/CLAUDE.md'
        - 'src/main/resources/editor-webapp/**'
        - 'pom.xml'
        - 'src/test/javascript/**'
        - 'src/test/e2e/**'
        - '.github/workflows/ci-build.yaml'
        - 'src/doc/README.adoc'
      focus: 'load a page 1.1 MB smaller, with the kernel fetched as a WebAssembly file'
    - id: W-5
      slug: plateau-matrix-page
      phase: P3
      depends_on: []
      run: 0230
      delegation: standard
      likely_paths:
        - 'src/main/editor/**'
        - 'src/main/resources/editor-webapp/standalone.html'
        - 'src/test/javascript/**'
        - 'src/test/e2e/**'
        - 'scripts/editor-coverage-floor.json'
        - 'src/doc/README.adoc'
        - 'docs/architecture/**'
        - 'src/main/resources/editor-webapp/samples/**'
      focus: 'read in the editor where each element of a path of plateaus came from and went'
```

## Phase P1 — The manual draws its diagrams

| # | Slug | Depends on | Focus | Scope | Exit evidence |
|---|------|------------|-------|-------|---------------|
| W-1 | `manual-plantuml-diagrams` | — | the manual's 18 diagrams drawn, and a build that says when they are not | `asciidoctorj-diagram-plantuml` added to the plugin dependencies of `pom.xml` (the latest version that loads on JDK 25; `1.2024.0` was verified); a step of the job `Java` after `./mvnw verify` that fails when the generated page holds `Failed to generate image` or fewer images than the page has diagram blocks; `<failIf>` is not used (tried: the build exits 0 with the errors); `.github/CLAUDE.md` says what the step does | gates 1 to 4 of P1 |

**Gate:** the four criteria of P1 in the manifest.

## Phase P2 — The editor files beside a lean page

| # | Slug | Depends on | Focus | Scope | Exit evidence |
|---|------|------------|-------|-------|---------------|
| W-2 | `editor-assets-beside-the-page` | — | the editor works with the network blocked | esbuild as a pinned dev dependency; `codemirror`, `@codemirror/lang-yaml`, `@codemirror/lang-json`, `@codemirror/language`, `@lezer/highlight` and `elkjs` in `package.json` and the lock; `codemirror.js` and `elk.js` as ES modules in `src/main/resources/editor-webapp/assets/`, built by `build-editor.mjs`, committed, rebuilt and compared by `editor:check`; the page loads them with `import("./assets/…?v=<8 hex of the SHA-256>")`, the fallbacks unchanged; a table `ASSETS` in `EditorHttpServer` (exact names, token or cookie, `Host` check, 404 otherwise, the right types); a rule in `scripts/changes.mjs` for the new folder; "Assemble website" copies and compares the folder; a test that fails if the sources or the page name a remote `import(`; an end-to-end spec with external hosts blocked; the manual and the editor `CLAUDE.md` say that building the page needs `npm ci` | gates 1 to 3, 5 to 8 of P2 |
| W-3 | `kernel-beside-the-page` | W-2 | a page 1.1 MB smaller | `viewpoint_kernel.wasm` in `assets/` (Maven puts `src/main/wasm/viewpoint_kernel.wasm` there in the jar: one copy in git), fetched with `WebAssembly.instantiateStreaming` and the `?v=` hash; the base64 block gone from the page and from `build-editor.mjs`; `embed.sh` builds and compares the `.wasm` only; `harness.js` and the node tests read the file; the Kernel job and the Rust `CLAUDE.md` follow | gates 3, 4, 5 and 8 of P2 |

**Gate:** the eight criteria of P2 in the manifest.

## Phase P3 — The matrix page

| # | Slug | Depends on | Focus | Scope | Exit evidence |
|---|------|------------|-------|-------|---------------|
| W-5 | `plateau-matrix-page` | — | a Reading view for a path of plateaus | on the page Plateaus, a view for one path chosen on the tree: columns are the path plus Span, lineage rows grouped by layer, a Changes-only fold, elements only; cells from `comparisonStateOf` per consecutive pair and once for the Span with `chain` from `replacesChainBetween`; the path in the address under the rule of wave 027; a click opens the existing Changes panel; a node test over `matrix-cases.json` (the oracle, not edited); one end-to-end spec on Chromium and Firefox; `ratchet.max` stays at 99 or lower; the floor of the coverage not lowered | gates 1 to 3 of P3 |

**Gate:** the four criteria of P3 in the manifest.

## Dependency View

```
P1  W-1
P2  W-2 --> W-3
P3  W-5
```

Inside a phase only W-3 has a dependency (the server table and the build step that W-2 adds). The phases are the order of the rest: the editor's build before the features written on it.

## Risks

- **Overlaps, all with the verdict `serialize`; the author wants runs strictly one after another, so launch with `--max-parallel-runs 1`.** W-1 and W-2 share `.github/workflows/ci-build.yaml` and `.github/CLAUDE.md`; W-1 and W-3 share `pom.xml` and the workflow; W-2 and W-3 share the editor sources, the build script, the server tests and the manual (W-3 depends on W-2 anyway); W-2, W-3 and W-5 share `src/main/editor/**`, the page and the test folders; W-4 and W-5 share `src/doc/README.adoc`, `docs/architecture/**` and the generated sample; W-2, W-3, W-4 and W-5 share `src/test/javascript/**`. None is `concurrent-safe`.
- **The website is proved only by a tag run.** W-2 changes what `Assemble website` copies; the pull request does not run it, so the hand-off says it is unproved until a tag. A wrong copy would break the live hosted editor, which is why W-2 is `hard_judgment`.
- **The size of the bundles is not measured yet.** ELK bundled may be large; the committed files grow by their size. W-2 reports the sizes and the load time before and after; the gate bounds only the page.
- **The `?v=` hash and the generated page.** `build-editor.mjs` writes a hash of each asset into the page; the gate `editor:check` must pass on a clean checkout of any platform (esbuild is deterministic for one version; the run proves it on the CI of the pull request).
- **Cost.** Wave 033 (two runs) used about 92 agents and 6.9 million tokens; five runs of which four have a TDD and a plan may use about twice that. This is what the author is asked to approve.
- **Manual CLAUDE.md rules.** "Maven needs no Rust" and "the page is committed" stay true after this wave; the runs update the sentences that mention `esm.sh`, the base64 kernel and `npm ci`, with no history in them.

## Completion Criteria

- The gates of P1, P2 and P3 hold.
- #209, #134 and #24 are closed by the wave's pull request, #207 is retitled to the road that remains (the kernel and the page built by Maven) and stays open.
- `./mvnw verify -DskipITs=false`, `npm run test:unit`, `npm run format:check` and `npm run lint` pass; the Native job and the three browser jobs of the pull request pass.
