---
title: Execution Plan — Kernel beside the page
status: done
date: 2026-11-07
related:
  - docs/wav/wav-034-diagrams-assets-likec4-matrix-page/run/run-0228-kernel-beside-the-page/tdd-0228-kernel-beside-the-page.md
  - docs/wav/wav-034-diagrams-assets-likec4-matrix-page/wav-034-diagrams-assets-likec4-matrix-page.md
  - 'gh:tmorin/archicode#207'
type: pln
run: 0228
wave: 034
---

# Execution Plan: Kernel beside the page

Profile TDD+pln: there is no PRD, so R-1 to R-9 are the IDs the TDD labels (section "PRD Traceability"), assumed from the manifest row W-3 of wave 034, gates 3, 4, 5 and 8 of P2, and issue #207. The TDD is the design (DEC-1 to DEC-7, IMP-1 to IMP-13, CTR-1 to CTR-4, FLOW-1 to FLOW-3). The plan commits nothing: the commit is a human step outside it.

Autonomy: the wave runs with no autonomy override (its progress log says "autonomy override: none"), so no task is `human_required` and none has `risk: critical`; a `human_required` task would stop the implement workflow with `awaiting-human`, which is why none was written. The wave declares W-3 `standard`, so no task is `hard_judgment`; the one review is `review_after` on task-008, the final check. A future reader should not look for a stop: none was needed.

Run 0227 (W-2) is finished and its files are in the starting tree. The wave's own documents are in the working tree and uncommitted; no task edits them. `pom.xml` and `.github/workflows/ci-build.yaml` may hold uncommitted lines of another run when the run starts (RISK-7): every edit of them is by anchor, after a re-read, and the task diffs before and after.

Every Maven command runs with `JAVA_HOME=$HOME/.sdkman/candidates/java/25.0.4-tem` (the shell Java is 21). Baseline on the starting repository, checked while drafting: `build-editor.test.js` 30 tests, 30 pass; `rustup` and `cargo` are on the machine, so `embed.sh --check` can run here if the toolchain of `rust-toolchain.toml` is installed or can be fetched; the page is 2,736,735 bytes. The Maven suites, `test:coverage`, `byte-identity.sh` and the e2e suite were not run while drafting; the tasks that name them say what to do if one is already red.

Resolutions of the open findings of the Stage 5 review of the TDD (not applied to its text), carried by the tasks so the plan holds either way:
- IMP-8 omits node tests that read the base64 block (patches, change, conformance, contains-changes-union, sibling-candidates) or read or copy `src/main/wasm` (patches, conformance, yaml-parts), and `.prettierignore` line 9: task-001 and task-002 own them, and the grep for the old path and the old block (RISK-1) lists what is left.
- R-8 says `git diff --stat -- src/main/rust` prints nothing, which contradicts IMP-7 and Q-2: the gate check is `git diff --stat -- 'src/main/rust/**/*.rs' 'src/main/rust/**/Cargo*' 'src/main/rust/**/rust-toolchain.toml'` printing nothing; `embed.sh` and the two notes under `src/main/rust/viewpoint-kernel/` do change, and the prg of the run names them (task-004, task-008).
- R-3 start size: the file measures 2,736,735 bytes, not 2,736,458; the gate keeps the stricter bound of the wave, at most 1,736,458 bytes, which the removal of about 1.08 MB of base64 meets.
- The traceability line "Unresolved: none" stands: Q-1 is resolved for the host and the file's own header is a named unproved item (task-008), not an open question.
- The reason text of rule `R-07a0` and the sentence of `.github/CLAUDE.md` are written by task-004 as DEC-7 says, with `R-07` losing "embedded in the page".

Order of the work: task-001 (the move, the build and the page) is the root. task-002 (loader and node tests), task-003 (server and Java tests) and task-004 (embed.sh, change map, CI comments, release scripts) then touch disjoint paths. Between task-001 and task-002 the whole node suite is red on purpose (the harness still reads the block the page no longer holds): task-001 asks only for its own tests, and task-002 turns the suite green. task-005 (the e2e spec) needs the loader and the server. task-006 rehearses the website step and measures; task-007 writes the sentences and the model from what task-006 measured; task-008 is the gate. `editor:build` writes `standalone.html`, which Maven copies into the jar: do not run Maven while an `editor:build` runs.

## 1. Executive Summary

```yaml
summary:
  status: 'done'
  product_goal: 'The viewpoint WebAssembly is one committed file in the assets folder, fetched by the page, served by editor serve and by the website, and the page loses about 1.08 MB of base64 with no change to the kernel bytes or to any command line output'
  technical_approach: 'git mv of the .wasm to editor-webapp/assets with the Chicory wasmFile following; assets.json gets a files list whose metas carry the hash; loadViewpointKernel fetches with instantiateStreaming and falls back to arrayBuffer on another content type; ASSETS gets an application/wasm entry; embed.sh builds and checks the file and the hash in the page with no Node or Python; the change map keeps the Kernel job on a .wasm change; the e2e spec proves the diagram with every host but 127.0.0.1 blocked'
  total_tasks: 8
  parallel_groups: 1
  high_risk_tasks: 0
  human_review_gates: 1
  autonomy_level: 'medium'
  recommendation: 'proceed_with_review'
  criteria:
    - 'ls src/main/wasm fails, the .wasm is in the assets folder with the bytes of the old file (cmp with git show HEAD:src/main/wasm/viewpoint_kernel.wasm), npm run editor:check exits 0, and editor:build and sample:build leave the tree unchanged'
    - 'standalone.html is at most 1,736,458 bytes and grep -c "application/octet-stream" prints 0'
    - 'editor serve answers 200 with application/wasm for /assets/viewpoint_kernel.wasm, 403 without proof and 404 for any other name; EditorHttpServerTest and EditorServeIT pass'
    - 'editor-offline.spec.js passes on chromium and firefox with every host but 127.0.0.1 blocked, asserts the kernel request, and fails on a jar whose wasm route is removed'
    - 'embed.sh --check needs neither Node nor Python and the node test pins its hash rule to the build rule; the Kernel job still runs on a .wasm change (rule R-07a0 and its test row)'
    - 'test:unit, test:coverage, format:check, lint, mvnw verify -DskipITs=false, test-compile pmd:check and byte-identity.sh exit 0 with the exceptions file unchanged; ratchet.max is at most 99; no .rs, Cargo or toolchain file changed'
    - 'The sizes of the page before and after (bytes and gzip) and the load times are in the prg; the website step is rehearsed and named unproved until a tag run'
```

## 2. PRD/TDD Consistency Assessment

```yaml
consistency_assessment:
  aligned_items:
    - 'R-1 to R-9 each map to at least one DEC or IMP of the TDD and to a task below'
    - 'The gate commands of phase P2 (3, 4, 5 and 8) are the verification of task-001, task-003, task-005 and task-008'
    - 'The split of the TDD (move and build, loader, server, kernel script and change map, e2e, sentences and model) is the split of task-001 to task-007'
    - 'The website step written by run 0227 already copies and compares the whole folder, so the plan does not edit it (R-7)'
  gaps:
    - id: gap-001
      type: 'missing_requirement'
      description: 'There is no PRD: R-1 to R-9 are assumed from the wave manifest and issue 207 (traceability incomplete in the TDD)'
      impact: 'low'
      recommendation: 'The tasks cite the R-n of the TDD; the gates of the wave are the acceptance criteria'
    - id: gap-002
      type: 'missing_technical_design'
      description: 'Stage 5 review findings not applied to the TDD text: IMP-8 omits five node tests that parse the base64 block and three that read or copy src/main/wasm, plus .prettierignore line 9; R-8 says the Rust diff prints nothing while IMP-7 changes embed.sh and two notes; R-3 states 2,736,458 bytes where the file is 2,736,735; the R-07a reason text and the .github/CLAUDE.md sentence need rewording'
      impact: 'low'
      recommendation: 'The plan carries the resolutions listed in its preamble; task-001 and task-002 own the omitted tests and the grep of RISK-1 catches any other reader of the old path or the old block'
    - id: gap-003
      type: 'risk'
      description: 'The step Assemble website runs only on a tag (CON-6) and GitHub Pages content type and base path for the .wasm cannot be rehearsed'
      impact: 'medium'
      recommendation: 'DEC-3 keeps the arrayBuffer path for a wrong type; task-006 rehearses the extracted block and the hosted e2e route table; the hand-off says the real step and the file header are unproved until a tag run (Q-1)'
    - id: gap-004
      type: 'ambiguity'
      description: 'The gate wording of the wave (git diff --stat -- src/main/rust prints nothing) contradicts the files the scope names (embed.sh and two notes under src/main/rust/viewpoint-kernel)'
      impact: 'low'
      recommendation: 'Q-2 of the TDD reads the gate as the Rust; the check uses the pathspec of the preamble and the prg names the three files'
    - id: gap-005
      type: 'risk'
      description: 'A saved page opened from file:// loses its diagrams in Chromium and Safari (DEC-6, RISK-4); a deliberate narrowing decided by the manifest and issue 207'
      impact: 'low'
      recommendation: 'task-007 writes the manual sentence; task-002 tests that the error panel names the file'
    - id: gap-006
      type: 'risk'
      description: 'Uncommitted lines of another run in pom.xml and ci-build.yaml (RISK-7)'
      impact: 'low'
      recommendation: 'task-001 and task-004 edit by anchors, re-read first, and diff before and after'
  blocking_gaps: []
```

## 3. Execution Graph

```yaml
execution_graph:
  nodes:
    - id: task-001
      status: 'done'
      title: 'The move and the build: git mv of the .wasm, the Chicory wasmFile, the files list of assets.json, the build script without the wasm directive, the page without the base64 block, the build tests'
      depends_on: []
      produces:
        - 'src/main/resources/editor-webapp/assets/viewpoint_kernel.wasm'
        - 'pom.xml (wasmFile and its comment)'
        - 'src/main/editor/assets.json'
        - 'scripts/build-editor.mjs'
        - 'src/main/editor/page.html (the @wasm block and its comment)'
        - 'src/main/resources/editor-webapp/standalone.html'
        - '.prettierignore (line 9)'
        - 'src/test/javascript/editor-build/build-editor.test.js'
        - 'src/test/javascript/editor-build/editor-assets.test.js'
      agent_role: 'Frontend Implementation Agent'
      autonomy: 'autonomous'
      risk: 'medium'
      confidence: 65
    - id: task-002
      status: 'done'
      title: 'Loader and node tests: loadViewpointKernel fetches the file, the harness and the tests that read the kernel, the names and the comment'
      depends_on: [task-001]
      produces:
        - 'src/main/editor/model/kernel-bridge.js'
        - 'src/main/editor/names.json (only if a name is added or removed)'
        - 'src/main/editor/presentation/diagram-state.js (the comment)'
        - 'src/main/resources/editor-webapp/standalone.html'
        - 'src/test/javascript/viewpoint-kernel/harness.js'
        - 'src/test/javascript/viewpoint-kernel/load-kernel.test.js'
        - 'src/test/javascript/viewpoint-kernel/compare.test.js'
        - 'src/test/javascript/viewpoint-kernel/patches.test.js'
        - 'src/test/javascript/viewpoint-kernel/change.test.js'
        - 'src/test/javascript/viewpoint-kernel/conformance.test.js'
        - 'src/test/javascript/viewpoint-kernel/contains-changes-union.test.js'
        - 'src/test/javascript/viewpoint-kernel/sibling-candidates.test.js'
        - 'src/test/javascript/editor-build/yaml-parts.test.js'
      agent_role: 'Frontend Implementation Agent'
      autonomy: 'autonomous'
      risk: 'medium'
      confidence: 70
    - id: task-003
      status: 'done'
      title: 'The editor server: the third entry of ASSETS and the Java and integration tests'
      depends_on: [task-001]
      produces:
        - 'src/main/java/io/morin/archicode/cli/EditorHttpServer.java'
        - 'src/test/java/io/morin/archicode/cli/EditorHttpServerTest.java'
        - 'src/test/java/io/morin/archicode/it/EditorServeIT.java'
      agent_role: 'Backend Implementation Agent'
      autonomy: 'autonomous'
      risk: 'medium'
      confidence: 80
    - id: task-004
      status: 'done'
      title: 'The kernel script, the change map and CI: embed.sh builds and checks the file only, rule R-07a0, the CI comments, the release smoke scripts, the kernel notes'
      depends_on: [task-001]
      produces:
        - 'src/main/rust/viewpoint-kernel/embed.sh'
        - 'src/main/rust/viewpoint-kernel/CLAUDE.md'
        - 'src/main/rust/viewpoint-kernel/README.md'
        - 'scripts/changes.mjs'
        - 'src/test/javascript/changes-map.test.js'
        - '.github/workflows/ci-build.yaml (comments and the Kernel step text only)'
        - '.github/scripts/release-smoke.sh'
        - '.github/scripts/test-release-scripts.sh'
        - '.github/CLAUDE.md'
      agent_role: 'Infrastructure Agent'
      autonomy: 'autonomous'
      risk: 'medium'
      confidence: 65
    - id: task-005
      status: 'done'
      title: 'End-to-end: the kernel comes from the file with every host but 127.0.0.1 blocked, on the served page and on the hosted route table'
      depends_on: [task-002, task-003]
      produces:
        - 'src/test/e2e/harness.js'
        - 'src/test/e2e/editor-offline.spec.js'
      agent_role: 'Test Generation Agent'
      autonomy: 'autonomous'
      risk: 'medium'
      confidence: 60
    - id: task-006
      status: 'done'
      title: 'Rehearse "Assemble website" with the three assets, and report the sizes and load times before and after (R-9)'
      depends_on: [task-004, task-005]
      produces:
        - 'docs/wav/wav-034-diagrams-assets-likec4-matrix-page/run/run-0228-kernel-beside-the-page/prg-0228-kernel-beside-the-page.md (a Findings block: the rehearsal, the sizes, the load times)'
      agent_role: 'QA Agent'
      autonomy: 'autonomous'
      risk: 'medium'
      confidence: 70
    - id: task-007
      status: 'done'
      title: 'The sentences and the model: manual, CLAUDE.md files, the kernel_wasm element and its relationships, the sample bundle'
      depends_on: [task-006]
      produces:
        - 'src/doc/README.adoc'
        - 'CLAUDE.md'
        - 'src/main/editor/CLAUDE.md'
        - 'src/test/CLAUDE.md'
        - 'scripts/extract-editor-script.mjs (its comment, only if it names the block)'
        - 'docs/architecture/manifests/archicode.yaml'
        - 'docs/architecture/manifests/views/view.contracts.yaml (only if a line follows)'
        - 'src/test/javascript/architecture/impact-questions.json (only if an expected set changes)'
        - 'src/main/resources/editor-webapp/samples/archicode.yaml'
      agent_role: 'Documentation Agent'
      autonomy: 'autonomous'
      risk: 'low'
      confidence: 80
    - id: task-008
      status: 'done'
      title: 'Gates of the run: the P2 criteria that belong to W-3, the whole suites, byte identity, the Rust diff check and a clean rebuild'
      depends_on: [task-007]
      produces:
        - 'docs/wav/wav-034-diagrams-assets-likec4-matrix-page/run/run-0228-kernel-beside-the-page/prg-0228-kernel-beside-the-page.md (a results block: commands, exit codes, what is unproved)'
      agent_role: 'QA Agent'
      autonomy: 'review_after'
      risk: 'medium'
      confidence: 75
  edges:
    - from: task-001
      to: task-002
      reason: 'The loader reads the meta line the build writes and fetches the file at its new place'
    - from: task-001
      to: task-003
      reason: 'The server tests compare the served bytes with the committed file in the assets folder'
    - from: task-001
      to: task-004
      reason: 'embed.sh writes and compares the file at its new place and the page hash the build writes'
    - from: task-002
      to: task-005
      reason: 'The spec needs a page that fetches the kernel'
    - from: task-003
      to: task-005
      reason: 'The spec needs a jar that serves the kernel'
    - from: task-004
      to: task-006
      reason: 'The rehearsal runs the website block over the folder the run now fills'
    - from: task-005
      to: task-006
      reason: 'The load times are read in the e2e run'
    - from: task-006
      to: task-007
      reason: 'The manual sentences follow what was measured and rehearsed'
    - from: task-007
      to: task-008
      reason: 'The final check runs after the sentences and the model are in place'
```

## 4. Task Catalog

```yaml
task_catalog:
  tasks:
    - id: task-001
      title: 'The move and the build: git mv of the .wasm, the Chicory wasmFile, the files list of assets.json, the build script without the wasm directive, the page without the base64 block, the build tests'
      source_requirements:
        prd:
          - 'none: there is no PRD (profile TDD+pln); the R-n of the TDD are listed with the TDD items'
        tdd:
          - 'R-1'
          - 'R-3'
          - 'TG-1'
          - 'TG-2'
          - 'TG-5'
          - 'ASM-1'
          - 'ASM-2'
          - 'CON-1'
          - 'CON-2'
          - 'CON-7'
          - 'DEC-1'
          - 'DEC-2'
          - 'CTR-1'
          - 'CTR-2'
          - 'CTR-4'
          - 'IMP-1'
          - 'IMP-2'
          - 'IMP-3'
          - 'IMP-5'
          - 'RISK-1'
          - 'RISK-7'
      outputs:
        - 'src/main/resources/editor-webapp/assets/viewpoint_kernel.wasm (git mv, same bytes)'
        - 'pom.xml (wasmFile and its comment only)'
        - 'src/main/editor/assets.json (a files list with the one name)'
        - 'scripts/build-editor.mjs (files read in readAssetList, metas for assets then files, wasm directive and header line removed, the missing-file error)'
        - 'src/main/editor/page.html (the @wasm block and its comment removed)'
        - 'src/main/resources/editor-webapp/standalone.html (regenerated: no base64 block, one more meta)'
        - '.prettierignore (the line for src/main/wasm removed)'
        - 'src/test/javascript/editor-build/build-editor.test.js (the wasm fixture and expectedPage become a files entry and its meta; cases for a missing file, a name in both lists and an old tree without files)'
        - 'src/test/javascript/editor-build/editor-assets.test.js (the page hash of the .wasm is the file hash, no octet-stream block, the file starts with the WebAssembly magic bytes)'
      verification:
        - 'test ! -e src/main/wasm/viewpoint_kernel.wasm && test -f src/main/resources/editor-webapp/assets/viewpoint_kernel.wasm'
        - 'git show HEAD:src/main/wasm/viewpoint_kernel.wasm | cmp - src/main/resources/editor-webapp/assets/viewpoint_kernel.wasm'
        - 'node --test src/test/javascript/editor-build/build-editor.test.js src/test/javascript/editor-build/editor-assets.test.js'
        - 'npm run editor:build && npm run editor:check'
        - 'test "$(wc -c < src/main/resources/editor-webapp/standalone.html)" -le 1736458'
        - 'test "$(grep -c "application/octet-stream" src/main/resources/editor-webapp/standalone.html)" -eq 0'
        - 'grep -q "archicode-asset:viewpoint_kernel.wasm" src/main/resources/editor-webapp/standalone.html'
        - 'JAVA_HOME=$HOME/.sdkman/candidates/java/25.0.4-tem ./mvnw -q compile -Dmaven.test.skip'
        - 'npm run format:check'
      risk: 'medium'
      confidence: 65
      human_review: 'none'
      escalation_triggers:
        - 'the Chicory plugin does not accept the new wasmFile path or the generated ViewpointKernelModule changes (ASM-2): stop and log it'
        - 'the file differs from the old one after the move, or a rebuild of the page changes any byte but the kernel meta and the removed block: stop and log it'
        - 'pom.xml holds uncommitted lines of another run, or an edit would drop one: edit by anchor, diff before and after, and stop if the edit needs more than wasmFile and its comment'
        - 'a build or check path of build-editor.mjs that runs on old trees without esbuild (--where, --map, --check-identical) would now need it (CON-7): stop and log it'
      delegation_tier: 'standard'
      results: 'tier standard, model sonnet, effort medium, profile low-cost, passed first time, inline (leaf), independently verified'
    - id: task-002
      title: 'Loader and node tests: loadViewpointKernel fetches the file, the harness and the tests that read the kernel, the names and the comment'
      source_requirements:
        prd:
          - 'none: there is no PRD (profile TDD+pln); the R-n of the TDD are listed with the TDD items'
        tdd:
          - 'R-2'
          - 'R-6'
          - 'R-8'
          - 'TG-1'
          - 'TG-4'
          - 'ASM-5'
          - 'CON-3'
          - 'CON-4'
          - 'DEC-3'
          - 'DEC-6'
          - 'CTR-2'
          - 'IF-1'
          - 'FLOW-1'
          - 'IMP-4'
          - 'IMP-8'
          - 'RISK-1'
          - 'RISK-4'
      outputs:
        - 'src/main/editor/model/kernel-bridge.js (assetAddress of the file, fetch, the three sentences of DEC-3, instantiateStreaming for application/wasm and arrayBuffer otherwise, the retry on failure unchanged)'
        - 'src/main/editor/names.json (only if a top-level name is added or removed)'
        - 'src/main/editor/presentation/diagram-state.js (the comment that says below as base64)'
        - 'src/main/resources/editor-webapp/standalone.html (regenerated)'
        - 'src/test/javascript/viewpoint-kernel/harness.js (createApp reads the file, answers the meta lookup for it, and serves it through a page fetch with a chosen content type; the options.fetch of a test still wins for other addresses)'
        - 'src/test/javascript/viewpoint-kernel/load-kernel.test.js (new: both content types, no meta, an HTTP error, a network error, the retry after a failure)'
        - 'src/test/javascript/viewpoint-kernel/compare.test.js, patches.test.js, change.test.js, conformance.test.js, contains-changes-union.test.js, sibling-candidates.test.js and src/test/javascript/editor-build/yaml-parts.test.js (read or copy the file at its new place instead of parsing the base64 block or naming src/main/wasm)'
      verification:
        - 'node --test src/test/javascript/viewpoint-kernel/load-kernel.test.js'
        - 'npm run editor:build && npm run editor:check'
        - 'npm run test:unit'
        - 'npm run test:coverage'
        - 'test "$(grep -rn "viewpoint-kernel-wasm" src/main/editor | wc -l)" -eq 0'
        - '! grep -rn "src/main/wasm" src/test/javascript'
        - '! grep -rnE "import\(.https?:" src/main/resources/editor-webapp/assets'
        - 'npm run format:check'
        - 'npm run lint'
      risk: 'medium'
      confidence: 70
      human_review: 'none'
      escalation_triggers:
        - 'a name added or removed at the top level of a part is not in names.json, or the ratchet or a coverage floor would have to move: stop and log it (floors never go down, ratchet.max stays at most 99)'
        - 'WebAssembly.instantiateStreaming is not available in the node harness and a stub would hide a real failure: stub only the fetch and the response, never the instantiation, and log it'
        - 'a test that reads the old block cannot be moved to the file without changing what it proves: stop and log it'
        - 'the kernel bridge would gain an upward use (CON-3): stop and log it'
      delegation_tier: 'standard'
      results: 'tier standard, model sonnet, effort medium, profile low-cost, passed first time, inline (leaf), independently verified'
    - id: task-003
      title: 'The editor server: the third entry of ASSETS and the Java and integration tests'
      source_requirements:
        prd:
          - 'none: there is no PRD (profile TDD+pln); the R-n of the TDD are listed with the TDD items'
        tdd:
          - 'R-4'
          - 'ASM-1'
          - 'ASM-3'
          - 'DEC-4'
          - 'CTR-3'
          - 'IF-3'
          - 'IMP-6'
      outputs:
        - 'src/main/java/io/morin/archicode/cli/EditorHttpServer.java (the entry for viewpoint_kernel.wasm typed application/wasm, the Javadoc saying three)'
        - 'src/test/java/io/morin/archicode/cli/EditorHttpServerTest.java (the third entry with its type and bytes compared as byte arrays, 403 without proof, other names still 404, the three assertions on the old element become the meta of the file)'
        - 'src/test/java/io/morin/archicode/it/EditorServeIT.java (the loop over names gains the .wasm compared as bytes with application/wasm, the assertion on the old element changes)'
      verification:
        - 'JAVA_HOME=$HOME/.sdkman/candidates/java/25.0.4-tem ./mvnw test -Dtest=EditorHttpServerTest'
        - 'JAVA_HOME=$HOME/.sdkman/candidates/java/25.0.4-tem ./mvnw test-compile pmd:check'
        - 'JAVA_HOME=$HOME/.sdkman/candidates/java/25.0.4-tem ./mvnw verify -DskipITs=false -Dtest=EditorHttpServerTest -Dit.test=EditorServeIT -Dsurefire.failIfNoSpecifiedTests=false'
        - 'bash -c "unzip -p target/*-runner.jar editor-webapp/assets/viewpoint_kernel.wasm 2>/dev/null | cmp - src/main/resources/editor-webapp/assets/viewpoint_kernel.wasm || unzip -p target/quarkus-app/app/*.jar editor-webapp/assets/viewpoint_kernel.wasm | cmp - src/main/resources/editor-webapp/assets/viewpoint_kernel.wasm"'
      risk: 'medium'
      confidence: 80
      human_review: 'none'
      escalation_triggers:
        - 'the jar holds a copy of the .wasm that differs from the committed file (a resource filter, ASM-1): stop and log it'
        - 'the route code, the Host check or the token or cookie proof would have to change for the new entry: stop and log it, the table is the only edit'
        - 'the integration-test flag form does not select the test: use the form the CLAUDE.md of src/test gives and record it'
        - 'an editor:build is running (it writes standalone.html, which Maven copies): wait for it'
      delegation_tier: 'standard'
      results: 'tier standard, model sonnet, effort medium, profile low-cost, passed first time, inline (leaf), independently verified'
    - id: task-004
      title: 'The kernel script, the change map and CI: embed.sh builds and checks the file only, rule R-07a0, the CI comments, the release smoke scripts, the kernel notes'
      source_requirements:
        prd:
          - 'none: there is no PRD (profile TDD+pln); the R-n of the TDD are listed with the TDD items'
        tdd:
          - 'R-4'
          - 'R-6'
          - 'R-7'
          - 'R-8'
          - 'TG-3'
          - 'ASM-3'
          - 'CON-1'
          - 'CON-5'
          - 'CON-6'
          - 'DEC-5'
          - 'DEC-7'
          - 'IF-2'
          - 'FLOW-2'
          - 'FLOW-3'
          - 'IMP-7'
          - 'IMP-9'
          - 'IMP-12'
          - 'RISK-3'
          - 'RISK-6'
          - 'RISK-7'
      outputs:
        - 'src/main/rust/viewpoint-kernel/embed.sh (write mode copies the build to the assets folder then runs scripts/build-editor.mjs; --check rebuilds in a scratch folder, compares the file, and compares the page meta hash with sha256sum of the file cut to 8 hex, with grep and sed only; the two failure messages of DEC-5; the Python block gone)'
        - 'src/main/rust/viewpoint-kernel/CLAUDE.md and README.md (lines about the file, the block and python3)'
        - 'scripts/changes.mjs (rule R-07a0 before R-07a with the four jobs and the reason of DEC-7, R-07 loses src/main/wasm and the words embedded in the page)'
        - 'src/test/javascript/changes-map.test.js (the row of the old path becomes the row of the new path, ALL; the row of assets/codemirror.js stays e2e,java,page)'
        - 'src/test/javascript/editor-build/editor-assets.test.js (one more case: the rule of embed.sh and the rule of the build give the same 8 hex for the committed file)'
        - '.github/workflows/ci-build.yaml (the comments of the jobs Page and Kernel and the text of the Kernel step: needs rustup, nothing else; the step Assemble website is not edited)'
        - '.github/scripts/release-smoke.sh (the check of the meta of the file and GET /assets/viewpoint_kernel.wasm answering 200 with the token)'
        - '.github/scripts/test-release-scripts.sh (the fake server serves the meta and the file)'
        - '.github/CLAUDE.md (the sentence on the Kernel job and the rule, stating what is true now)'
      verification:
        - 'node --test src/test/javascript/changes-map.test.js src/test/javascript/editor-build/editor-assets.test.js'
        - 'bash -n src/main/rust/viewpoint-kernel/embed.sh && bash -n .github/scripts/release-smoke.sh && bash -n .github/scripts/test-release-scripts.sh'
        - 'bash .github/scripts/test-release-scripts.sh'
        - 'python3 -c "import yaml; yaml.safe_load(open(''.github/workflows/ci-build.yaml''))"'
        - 'test "$(grep -c "Check the manual has its diagrams" .github/workflows/ci-build.yaml)" -ge 1'
        - 'test "$(grep -c "editor/assets" .github/workflows/ci-build.yaml)" -ge 1'
        - 'test "$(grep -c "python3" src/main/rust/viewpoint-kernel/embed.sh)" -eq 0'
        - 'src/main/rust/viewpoint-kernel/embed.sh --check'
        - 'npm run format:check'
      risk: 'medium'
      confidence: 65
      human_review: 'none'
      escalation_triggers:
        - 'embed.sh --check cannot run here (no network for the toolchain of rust-toolchain.toml): record it as the Kernel job proof, never as a pass, and still run bash -n and the stale-file negative check on a scratch copy of the file'
        - 'the rebuilt .wasm differs from the committed bytes (Non-Goal: the kernel is unchanged): stop and log it, never overwrite the committed file'
        - 'an edit would drop a line of another run in ci-build.yaml or .github/CLAUDE.md, or the step Assemble website would have to change: edit by anchors, diff before and after, and stop and log it'
        - 'a .rs, Cargo or rust-toolchain.toml file would have to change: stop and log it (Q-2)'
      delegation_tier: 'standard'
      results: 'tier standard, model sonnet, effort medium, profile low-cost, passed after escalation to effort high, inline (leaf), independently verified'
    - id: task-005
      title: 'End-to-end: the kernel comes from the file with every host but 127.0.0.1 blocked, on the served page and on the hosted route table'
      source_requirements:
        prd:
          - 'none: there is no PRD (profile TDD+pln); the R-n of the TDD are listed with the TDD items'
        tdd:
          - 'R-5'
          - 'R-9'
          - 'ASM-5'
          - 'DEC-3'
          - 'DEC-4'
          - 'FLOW-1'
          - 'FLOW-3'
          - 'IMP-11'
          - 'RISK-2'
      outputs:
        - 'src/test/e2e/harness.js (ASSET_TYPES gets the .wasm row so the hosted route table keeps the file)'
        - 'src/test/e2e/editor-offline.spec.js (both tests assert that the kernel file was requested, answered 200 with application/wasm and no host but 127.0.0.1 was asked, and that the page source holds no viewpoint-kernel-wasm element; the hosted test asserts /editor/assets/viewpoint_kernel.wasm in the requests)'
      verification:
        - 'npx playwright test src/test/e2e/editor-offline.spec.js --project=chromium'
        - 'npx playwright test src/test/e2e/editor-offline.spec.js --project=firefox'
        - 'a run of the spec against a jar or a harness whose wasm route is removed fails (the proof that it tests the file), recorded in the task result'
        - 'npm run format:check'
        - 'npm run lint'
      risk: 'medium'
      confidence: 60
      human_review: 'none'
      escalation_triggers:
        - 'a browser engine is not installed or the network is needed: record an environment gap, not a pass'
        - 'the hosted harness shows no diagram after the .wasm row is added: stop and log it before touching the loader'
        - 'the spec passes on a build whose wasm route is removed: the spec is vacuous, fix it before going on'
      delegation_tier: 'standard'
      results: 'tier standard, model sonnet, effort medium, profile low-cost, passed first time, inline (leaf), independently verified'
    - id: task-006
      title: 'Rehearse "Assemble website" with the three assets, and report the sizes and load times before and after (R-9)'
      source_requirements:
        prd:
          - 'none: there is no PRD (profile TDD+pln); the R-n of the TDD are listed with the TDD items'
        tdd:
          - 'R-7'
          - 'R-9'
          - 'CON-6'
          - 'DEC-3'
          - 'FLOW-3'
          - 'RISK-2'
          - 'Q-1'
      outputs:
        - 'docs/wav/wav-034-diagrams-assets-likec4-matrix-page/run/run-0228-kernel-beside-the-page/prg-0228-kernel-beside-the-page.md (a Findings block: the rehearsal, the sizes in bytes and gzip before from git show HEAD and after, the load time from goto to the first g.dg-node, and the line that the real step and the file header are unproved until a tag run)'
      verification:
        - 'a scratch folder in the scratchpad holds the output of the extracted block of the step Assemble website, and cmp passes for codemirror.js, elk.js and viewpoint_kernel.wasm against the committed files'
        - 'git status --short shows no change outside the prg of the run since task-005'
        - 'grep -c "Assemble website" docs/wav/wav-034-diagrams-assets-likec4-matrix-page/run/run-0228-kernel-beside-the-page/prg-0228-kernel-beside-the-page.md'
      risk: 'medium'
      confidence: 70
      human_review: 'none'
      escalation_triggers:
        - 'the extracted block would write outside the scratch folder: stop, never run it with the repository as target'
        - 'the block does not copy or compare the .wasm: stop and log it, the step of run 0227 is meant to cover the whole folder and the plan does not edit it'
        - 'the network of the day makes the load times meaningless: report them as noisy, they are reported and not gated'
      delegation_tier: 'standard'
      results: 'tier standard, model sonnet, effort medium, profile low-cost, passed first time, inline (leaf), independently verified'
    - id: task-007
      title: 'The sentences and the model: manual, CLAUDE.md files, the kernel_wasm element and its relationships, the sample bundle'
      source_requirements:
        prd:
          - 'none: there is no PRD (profile TDD+pln); the R-n of the TDD are listed with the TDD items'
        tdd:
          - 'R-1'
          - 'R-2'
          - 'R-6'
          - 'DEC-6'
          - 'IMP-10'
          - 'IMP-13'
          - 'RISK-1'
          - 'RISK-4'
      outputs:
        - 'src/doc/README.adoc (the kernel is the third file beside the page; the file:// sentence of DEC-6: the diagrams need the assets folder and a server, or Firefox, while the file editor works)'
        - 'CLAUDE.md (the path of the .wasm)'
        - 'src/main/editor/CLAUDE.md (the @wasm directive and the file:// lines, stating what is true now)'
        - 'src/test/CLAUDE.md and scripts/extract-editor-script.mjs (only where they name the block or the old path)'
        - 'docs/architecture/manifests/archicode.yaml (kernel_wasm tags.path at the new path; relationships editor_serve serves kernel_wasm and page reads kernel_wasm with qualifiers already used, parallel to editor_assets)'
        - 'docs/architecture/manifests/views/view.contracts.yaml (only if a line follows)'
        - 'src/test/javascript/architecture/impact-questions.json (only if an expected set changes)'
        - 'src/main/resources/editor-webapp/samples/archicode.yaml (npm run sample:build)'
      verification:
        - 'npm run sample:build'
        - 'JAVA_HOME=$HOME/.sdkman/candidates/java/25.0.4-tem ./mvnw test -Dtest=ArchitectureImpactTest,ArchitectureDriftTest,CommandReferenceTest'
        - '! grep -rnE "octet-stream|viewpoint-kernel-wasm|src/main/wasm" --include=* --exclude-dir=node_modules --exclude-dir=target --exclude-dir=.git --exclude-dir=wav --exclude-dir=rust .'
        - 'npm run format:check'
      risk: 'low'
      confidence: 80
      human_review: 'none'
      escalation_triggers:
        - 'ArchitectureDriftTest fails on a tags.path or an editor layer: fix the model, never the test'
        - 'a sentence would state history (a wave, a run or a date) in a CLAUDE.md: rewrite it to what is true now'
        - 'the grep finds a reader of the old path or the old block that no task changed: stop and log it, it is RISK-1'
      delegation_tier: 'standard'
      results: 'tier standard, model sonnet, effort medium, profile low-cost, passed after escalation to effort high, inline (leaf), independently verified'
    - id: task-008
      title: 'Gates of the run: the P2 criteria that belong to W-3, the whole suites, byte identity, the Rust diff check and a clean rebuild'
      source_requirements:
        prd:
          - 'none: there is no PRD (profile TDD+pln); the R-n of the TDD are listed with the TDD items'
        tdd:
          - 'R-1'
          - 'R-3'
          - 'R-4'
          - 'R-5'
          - 'R-8'
          - 'R-9'
          - 'TG-5'
          - 'RISK-1'
          - 'RISK-2'
          - 'Q-2'
      outputs:
        - 'docs/wav/wav-034-diagrams-assets-likec4-matrix-page/run/run-0228-kernel-beside-the-page/prg-0228-kernel-beside-the-page.md (a results block: each command, its exit code, and the list of what is unproved)'
      verification:
        - 'npm ci && npm run editor:check'
        - 'bash -c "set -e; f=src/main/resources/editor-webapp; s=$(mktemp); sha256sum $f/assets/* $f/standalone.html $f/samples/* > $s; npm run editor:build > /dev/null; npm run sample:build > /dev/null; sha256sum $f/assets/* $f/standalone.html $f/samples/* | diff - $s"'
        - 'test ! -e src/main/wasm && git show HEAD:src/main/wasm/viewpoint_kernel.wasm | cmp - src/main/resources/editor-webapp/assets/viewpoint_kernel.wasm'
        - 'test "$(wc -c < src/main/resources/editor-webapp/standalone.html)" -le 1736458 && test "$(grep -c "application/octet-stream" src/main/resources/editor-webapp/standalone.html)" -eq 0'
        - 'npm run test:unit'
        - 'npm run test:coverage'
        - 'npm run format:check'
        - 'npm run lint'
        - 'JAVA_HOME=$HOME/.sdkman/candidates/java/25.0.4-tem ./mvnw verify -DskipITs=false'
        - 'JAVA_HOME=$HOME/.sdkman/candidates/java/25.0.4-tem ./mvnw test-compile pmd:check'
        - 'scripts/byte-identity.sh'
        - 'git diff --stat -- "src/main/rust/**/*.rs" "src/main/rust/**/Cargo*" "src/main/rust/**/rust-toolchain.toml"'
        - 'npx playwright test src/test/e2e/editor-offline.spec.js --project=chromium --project=firefox'
        - 'src/main/rust/viewpoint-kernel/embed.sh --check'
      risk: 'medium'
      confidence: 75
      human_review: 'after'
      escalation_triggers:
        - 'a command is already red for a reason outside this run (a base already red, a browser not installed, no network, no toolchain for embed.sh): record it with its reason, an environment gap is not a pass'
        - 'byte-identity.sh needs a new exception or an existing command changes its output: stop and log it, this run must not change a command line output (TG-5)'
        - 'ratchet.max would be above 99 or a coverage floor would go down: stop and log it'
        - 'the Rust diff check prints a path: stop and log it (Q-2)'
      delegation_tier: 'standard'
      results: 'tier standard, model sonnet, effort medium, profile low-cost, passed first time, inline (leaf), independently verified'
```

## 5. Parallelization Plan

```yaml
parallelization_plan:
  groups:
    - id: parallel-group-001
      tasks:
        - task-002
        - task-003
        - task-004
      reason: 'Once the file is moved and the build writes its meta, the loader with the node tests (JavaScript), the server (Java) and the kernel script with the change map and CI comments (shell, YAML, rules) touch disjoint paths'
      conflict_risks:
        - 'task-002 runs editor:build, which writes standalone.html, and task-003 runs Maven, which copies it into the jar: run Maven after the editor:build of task-002 has finished, never at the same time'
        - 'task-004 edits editor-assets.test.js, which task-001 created: task-001 is finished before the group starts, and task-002 does not touch that file'
        - 'task-004 edits ci-build.yaml on top of lines another run may hold uncommitted: edit by anchors, diff before and after'
        - 'the wave runs its runs one after another (--max-parallel-runs 1); this group is inside the one run'
```

## 6. Human Review Gates

```yaml
human_review_gates:
  gates:
    - id: gate-001
      trigger: 'The website serves the .wasm only after a tag and a pull request cannot run that step, and the move changes the path that Maven, the rules, the model and the tests name'
      required_before: []
      required_after: ['task-008']
      reviewer_focus:
        - 'that the file in the assets folder has the bytes of the old one, that no second copy exists, and that no .rs, Cargo or toolchain file changed'
        - 'that the loader keeps the arrayBuffer path for a wrong content type and that the error panel names the file'
        - 'that the end-to-end spec fails when the wasm route is removed, and that the website step, the file header on GitHub Pages, macOS, Windows, the native image and the real Safari are listed as unproved'
```

This run operates under no autonomy override (the progress log of the wave says "autonomy override: none"). The gate does not stop the run: no task is `human_required`, the task it covers is `review_after`, and the review is the independent verification of the task together with the author's reading of the pull request.

## 7. Risk Assessment

```yaml
risk_assessment:
  by_task:
    - id: task-001
      risk: 'medium'
      rationale: 'A binary moves and the page and the Maven build both name its path; a stale reference shows only in a later job.'
    - id: task-002
      risk: 'medium'
      rationale: 'The loader sits on the path of every diagram and eight tests read the kernel through the old block or the old path.'
    - id: task-003
      risk: 'medium'
      rationale: 'Security-shaped handler but one more exact name in a table with its tests copied from the two other assets.'
    - id: task-004
      risk: 'medium'
      rationale: 'A first-match rule that silently drops the Kernel job if wrong, and a check script that must pass without Node.'
    - id: task-005
      risk: 'medium'
      rationale: 'Real browsers, two engines, and a non-vacuity proof.'
    - id: task-006
      risk: 'medium'
      rationale: 'A rehearsal of a step that runs only on a tag, and measurements that depend on the network of the day.'
    - id: task-007
      risk: 'low'
      rationale: 'Prose and model upkeep with generated checks (drift, impact, sample).'
    - id: task-008
      risk: 'medium'
      rationale: 'Independent final check before close-out.'
  by_area:
    - area: 'infra'
      risk: 'medium'
      rationale: 'The website serves the file only after a tag; the change map and the Kernel job follow a moved path'
    - area: 'api'
      risk: 'low'
      rationale: 'One more exact name on editor serve, additive, same proof and Host check'
    - area: 'ui'
      risk: 'medium'
      rationale: 'The loader is on every diagram; a page opened from file:// in Chromium or Safari loses its diagrams by design (DEC-6)'
    - area: 'security'
      risk: 'low'
      rationale: 'No new surface: a table of exact names, no path built from a request, no remote import'
    - area: 'docs'
      risk: 'low'
      rationale: 'The drift and impact tests and the sample check the model and the sentences'
```

## 8. Confidence Assessment

```yaml
confidence_assessment:
  by_task:
    - id: task-001
      score: 65
      rationale: 'The Chicory path and the rebuild of the page are checked by commands, but several readers of the old path are found only by the grep.'
    - id: task-002
      score: 70
      rationale: 'Clear design (DEC-3) and a large node suite as safety net; the harness must serve the file with a chosen type.'
    - id: task-003
      score: 80
      rationale: 'Third row of a table with a full list of cases in the TDD.'
    - id: task-004
      score: 65
      rationale: 'embed.sh --check needs the Rust toolchain on the machine and the first-match rule is easy to get wrong.'
    - id: task-005
      score: 60
      rationale: 'Browser timing and the broken-route proof are the unknowns.'
    - id: task-006
      score: 70
      rationale: 'Method fixed in the TDD; figures depend on the network.'
    - id: task-007
      score: 80
      rationale: 'Documentation with generated checks.'
    - id: task-008
      score: 75
      rationale: 'Many commands; two engines, the packaged jar and the Rust toolchain.'
```

## 9. Agent Assignment Plan

```yaml
agent_assignment_plan:
  assignments:
    - task_id: task-001
      agent_role: 'Frontend Implementation Agent'
      objective: 'git mv src/main/wasm/viewpoint_kernel.wasm to src/main/resources/editor-webapp/assets/viewpoint_kernel.wasm and point the Chicory wasmFile of pom.xml at it (by anchor, after a re-read); add the files list to assets.json and make scripts/build-editor.mjs read it, write one meta per asset of assets then of files with the first 8 hex of the SHA-256 of the file, fail with the one line "the asset ... is missing" for a listed file that does not exist, reject a name in both lists, and remove the wasm directive and its header line; remove the @wasm block and its comment from page.html; run npm run editor:build; remove the src/main/wasm line of .prettierignore; update the build and assets tests.'
      context:
        prd_excerpts:
          - 'none: there is no PRD (profile TDD+pln); the R-n of the TDD are listed with the TDD items'
        tdd_excerpts:
          - 'DEC-1, DEC-2, CTR-1, CTR-2, CTR-4, IMP-1, IMP-2, IMP-3, IMP-5, CON-7 (the TDD file of this run)'
      likely_files:
        - 'src/main/resources/editor-webapp/assets/viewpoint_kernel.wasm'
        - 'src/main/wasm/viewpoint_kernel.wasm'
        - 'pom.xml'
        - 'src/main/editor/assets.json'
        - 'scripts/build-editor.mjs'
        - 'src/main/editor/page.html'
        - 'src/main/resources/editor-webapp/standalone.html'
        - '.prettierignore'
        - 'src/test/javascript/editor-build/build-editor.test.js'
        - 'src/test/javascript/editor-build/editor-assets.test.js'
      acceptance_criteria:
        - 'src/main/wasm does not exist, the file in the assets folder is identical to the old one, and the page names it by a meta with a ?v= hash'
        - 'the page is at most 1,736,458 bytes and holds no application/octet-stream'
        - 'npm run editor:check exits 0 and a rebuild changes no byte'
        - 'a tree without files still builds as before, and --where, --map and --check-identical need no esbuild'
      verification:
        - 'test ! -e src/main/wasm/viewpoint_kernel.wasm && test -f src/main/resources/editor-webapp/assets/viewpoint_kernel.wasm'
        - 'git show HEAD:src/main/wasm/viewpoint_kernel.wasm | cmp - src/main/resources/editor-webapp/assets/viewpoint_kernel.wasm'
        - 'node --test src/test/javascript/editor-build/build-editor.test.js src/test/javascript/editor-build/editor-assets.test.js'
        - 'npm run editor:build && npm run editor:check'
        - 'test "$(wc -c < src/main/resources/editor-webapp/standalone.html)" -le 1736458'
        - 'test "$(grep -c "application/octet-stream" src/main/resources/editor-webapp/standalone.html)" -eq 0'
        - 'grep -q "archicode-asset:viewpoint_kernel.wasm" src/main/resources/editor-webapp/standalone.html'
        - 'JAVA_HOME=$HOME/.sdkman/candidates/java/25.0.4-tem ./mvnw -q compile -Dmaven.test.skip'
        - 'npm run format:check'
      escalation_triggers:
        - 'the Chicory plugin does not accept the new path (ASM-2): stop and log it'
        - 'the moved file differs from the old one: stop and log it'
      suggested_subagent_type: 'general-purpose'
      suggested_model: '(default)'
      suggested_effort: 'high'
    - task_id: task-002
      agent_role: 'Frontend Implementation Agent'
      objective: 'Rewrite loadViewpointKernel as DEC-3 says: assetAddress of viewpoint_kernel.wasm (null throws "The page names no viewpoint_kernel.wasm file."), fetch, an HTTP failure and a network failure with the two sentences of DEC-3, instantiateStreaming when the content-type starts with application/wasm and WebAssembly.instantiate of the array buffer otherwise, the ABI wrapper and the retry on failure unchanged; fix the comment of diagram-state.js; change the node harness so createApp reads the file, answers the meta and serves it through the page fetch with a chosen type, move the tests that parse the base64 block or name src/main/wasm to the file, add load-kernel.test.js, and run editor:build.'
      context:
        prd_excerpts:
          - 'none: there is no PRD (profile TDD+pln); the R-n of the TDD are listed with the TDD items'
        tdd_excerpts:
          - 'DEC-3, DEC-6, CTR-2, IF-1, FLOW-1, IMP-4, IMP-8 and the Stage 5 resolution in the preamble of this plan (the five tests that parse the block and the three that read or copy src/main/wasm)'
      likely_files:
        - 'src/main/editor/model/kernel-bridge.js'
        - 'src/main/editor/names.json'
        - 'src/main/editor/presentation/diagram-state.js'
        - 'src/main/resources/editor-webapp/standalone.html'
        - 'src/test/javascript/viewpoint-kernel/harness.js'
        - 'src/test/javascript/viewpoint-kernel/load-kernel.test.js'
        - 'src/test/javascript/viewpoint-kernel/compare.test.js'
        - 'src/test/javascript/viewpoint-kernel/patches.test.js'
        - 'src/test/javascript/viewpoint-kernel/change.test.js'
        - 'src/test/javascript/viewpoint-kernel/conformance.test.js'
        - 'src/test/javascript/viewpoint-kernel/contains-changes-union.test.js'
        - 'src/test/javascript/viewpoint-kernel/sibling-candidates.test.js'
        - 'src/test/javascript/editor-build/yaml-parts.test.js'
      acceptance_criteria:
        - 'both content types, a missing meta, an HTTP error, a network error and the retry after a failure are tested and covered'
        - 'the whole node suite passes, no coverage floor goes down, ratchet.max stays at most 99'
        - 'the kernel bridge gains no upward use and names.json matches the top-level names'
      verification:
        - 'node --test src/test/javascript/viewpoint-kernel/load-kernel.test.js'
        - 'npm run editor:build && npm run editor:check'
        - 'npm run test:unit'
        - 'npm run test:coverage'
        - 'test "$(grep -rn "viewpoint-kernel-wasm" src/main/editor | wc -l)" -eq 0'
        - '! grep -rn "src/main/wasm" src/test/javascript'
        - '! grep -rnE "import\(.https?:" src/main/resources/editor-webapp/assets'
        - 'npm run format:check'
        - 'npm run lint'
      escalation_triggers:
        - 'a floor or the ratchet would have to move: stop and log it'
        - 'the node harness would need a stub of the instantiation itself: stub the fetch only and log it'
      suggested_subagent_type: 'general-purpose'
      suggested_model: '(default)'
      suggested_effort: 'medium'
    - task_id: task-003
      agent_role: 'Backend Implementation Agent'
      objective: 'Add the entry viewpoint_kernel.wasm to ASSETS in EditorHttpServer with the path /editor-webapp/assets/viewpoint_kernel.wasm and the type application/wasm, change the Javadoc to three entries, and extend EditorHttpServerTest and EditorServeIT as IMP-6 says, comparing the bytes as byte arrays.'
      context:
        prd_excerpts:
          - 'none: there is no PRD (profile TDD+pln); the R-n of the TDD are listed with the TDD items'
        tdd_excerpts:
          - 'DEC-4, CTR-3, IF-3, IMP-6, ASM-1, ASM-3'
      likely_files:
        - 'src/main/java/io/morin/archicode/cli/EditorHttpServer.java'
        - 'src/test/java/io/morin/archicode/cli/EditorHttpServerTest.java'
        - 'src/test/java/io/morin/archicode/it/EditorServeIT.java'
      acceptance_criteria:
        - '/assets/viewpoint_kernel.wasm answers 200 with application/wasm and the bytes of the committed file when the token or the cookie is present, 403 without, and a ?v= query is ignored'
        - 'every other name under /assets/ and a trailing-slash form still answer 404'
        - 'PMD is green and the tests of the samples pass unedited'
      verification:
        - 'JAVA_HOME=$HOME/.sdkman/candidates/java/25.0.4-tem ./mvnw test -Dtest=EditorHttpServerTest'
        - 'JAVA_HOME=$HOME/.sdkman/candidates/java/25.0.4-tem ./mvnw test-compile pmd:check'
        - 'JAVA_HOME=$HOME/.sdkman/candidates/java/25.0.4-tem ./mvnw verify -DskipITs=false -Dtest=EditorHttpServerTest -Dit.test=EditorServeIT -Dsurefire.failIfNoSpecifiedTests=false'
        - 'bash -c "unzip -p target/*-runner.jar editor-webapp/assets/viewpoint_kernel.wasm 2>/dev/null | cmp - src/main/resources/editor-webapp/assets/viewpoint_kernel.wasm || unzip -p target/quarkus-app/app/*.jar editor-webapp/assets/viewpoint_kernel.wasm | cmp - src/main/resources/editor-webapp/assets/viewpoint_kernel.wasm"'
      escalation_triggers:
        - 'the jar copy of the .wasm differs from the committed file: stop and log it'
        - 'the route code or the proof would have to change: stop and log it'
      suggested_subagent_type: 'general-purpose'
      suggested_model: '(default)'
      suggested_effort: 'medium'
    - task_id: task-004
      agent_role: 'Infrastructure Agent'
      objective: 'Rewrite embed.sh as DEC-5 says (write mode copies the build into the assets folder then runs scripts/build-editor.mjs; --check rebuilds in a scratch folder and fails when the committed file is not the build or the page meta hash is not the first 8 hex of sha256sum of the file, using grep and sed only, with the two messages "... is not the build of the current sources" and "run src/main/rust/viewpoint-kernel/embed.sh and commit the result"; no Python); add rule R-07a0 before R-07a and drop src/main/wasm from R-07 in scripts/changes.mjs with its test row; edit the comments of the jobs Page and Kernel and the Kernel step text of ci-build.yaml by anchors, leaving the step Assemble website and the lines of other runs; make release-smoke.sh check the meta and GET the file with the token, and the fake server of test-release-scripts.sh serve both; update the two notes of the kernel and .github/CLAUDE.md to what is true now; run embed.sh --check, and a negative check on a scratch copy with a changed byte.'
      context:
        prd_excerpts:
          - 'none: there is no PRD (profile TDD+pln); the R-n of the TDD are listed with the TDD items'
        tdd_excerpts:
          - 'DEC-5, DEC-7, IF-2, FLOW-2, IMP-7, IMP-9, IMP-12, RISK-3, RISK-6, RISK-7 and the R-8 and Q-2 resolutions in the preamble of this plan'
      likely_files:
        - 'src/main/rust/viewpoint-kernel/embed.sh'
        - 'src/main/rust/viewpoint-kernel/CLAUDE.md'
        - 'src/main/rust/viewpoint-kernel/README.md'
        - 'scripts/changes.mjs'
        - 'src/test/javascript/changes-map.test.js'
        - 'src/test/javascript/editor-build/editor-assets.test.js'
        - '.github/workflows/ci-build.yaml'
        - '.github/scripts/release-smoke.sh'
        - '.github/scripts/test-release-scripts.sh'
        - '.github/CLAUDE.md'
      acceptance_criteria:
        - 'embed.sh holds no python3 and needs no Node to check; --check exits 0 on the committed file and fails with the named message on a stale file or a stale hash'
        - 'a change of the .wasm runs the four jobs (the row of changes-map.test.js), and assets/codemirror.js stays e2e,java,page'
        - 'the step Check the manual has its diagrams and the step Assemble website are intact in ci-build.yaml'
        - 'the release scripts test passes'
        - 'no .rs, Cargo or toolchain file changed'
      verification:
        - 'node --test src/test/javascript/changes-map.test.js src/test/javascript/editor-build/editor-assets.test.js'
        - 'bash -n src/main/rust/viewpoint-kernel/embed.sh && bash -n .github/scripts/release-smoke.sh && bash -n .github/scripts/test-release-scripts.sh'
        - 'bash .github/scripts/test-release-scripts.sh'
        - 'python3 -c "import yaml; yaml.safe_load(open(''.github/workflows/ci-build.yaml''))"'
        - 'test "$(grep -c "Check the manual has its diagrams" .github/workflows/ci-build.yaml)" -ge 1'
        - 'test "$(grep -c "editor/assets" .github/workflows/ci-build.yaml)" -ge 1'
        - 'test "$(grep -c "python3" src/main/rust/viewpoint-kernel/embed.sh)" -eq 0'
        - 'src/main/rust/viewpoint-kernel/embed.sh --check'
        - 'npm run format:check'
      escalation_triggers:
        - 'no toolchain or no network for embed.sh --check: record it as the Kernel job proof, never as a pass'
        - 'the rebuilt bytes differ from the committed file: stop and log it'
        - 'an edit would drop a line of another run: stop and log it'
      suggested_subagent_type: 'general-purpose'
      suggested_model: '(default)'
      suggested_effort: 'high'
    - task_id: task-005
      agent_role: 'Test Generation Agent'
      objective: 'Add the .wasm row to ASSET_TYPES of the e2e harness and extend both tests of editor-offline.spec.js as IMP-11 says: the kernel request answered 200 application/wasm, no host but 127.0.0.1, no viewpoint-kernel-wasm element in the page source, and on the hosted route table /editor/assets/viewpoint_kernel.wasm in the requests; prove the spec is not vacuous by running it with the wasm route removed.'
      context:
        prd_excerpts:
          - 'none: there is no PRD (profile TDD+pln); the R-n of the TDD are listed with the TDD items'
        tdd_excerpts:
          - 'R-5, R-9, FLOW-1, FLOW-3, IMP-11, RISK-2'
      likely_files:
        - 'src/test/e2e/harness.js'
        - 'src/test/e2e/editor-offline.spec.js'
      acceptance_criteria:
        - 'the spec passes on chromium and firefox with every host but 127.0.0.1 blocked'
        - 'the spec fails when the wasm route is removed'
        - 'the load time from goto to the first g.dg-node is printed so task-006 can read it'
      verification:
        - 'npx playwright test src/test/e2e/editor-offline.spec.js --project=chromium'
        - 'npx playwright test src/test/e2e/editor-offline.spec.js --project=firefox'
        - 'a run of the spec against a jar or a harness whose wasm route is removed fails (the proof that it tests the file), recorded in the task result'
        - 'npm run format:check'
        - 'npm run lint'
      escalation_triggers:
        - 'a browser is not installed: record an environment gap, not a pass'
        - 'the spec passes with the route removed: fix the spec first'
      suggested_subagent_type: 'general-purpose'
      suggested_model: '(default)'
      suggested_effort: 'high'
    - task_id: task-006
      agent_role: 'QA Agent'
      objective: 'Extract the block of the step Assemble website from ci-build.yaml, run it in a scratch folder with the repository as source only, and check with cmp that codemirror.js, elk.js and viewpoint_kernel.wasm arrive identical; measure the page in bytes and gzip before (git show HEAD:src/main/resources/editor-webapp/standalone.html) and after, and the load time from goto to the first g.dg-node with the method of the TDD; write a Findings block in the prg of the run, ending with the line that the real step and the file content type on GitHub Pages are unproved until a tag run.'
      context:
        prd_excerpts:
          - 'none: there is no PRD (profile TDD+pln); the R-n of the TDD are listed with the TDD items'
        tdd_excerpts:
          - 'R-7, R-9, CON-6, DEC-3, FLOW-3, RISK-2, Q-1'
      likely_files:
        - 'docs/wav/wav-034-diagrams-assets-likec4-matrix-page/run/run-0228-kernel-beside-the-page/prg-0228-kernel-beside-the-page.md'
      acceptance_criteria:
        - 'the prg holds the rehearsal result, the sizes in bytes and gzip before and after, and the load times'
        - 'nothing else in the repository changed'
      verification:
        - 'a scratch folder in the scratchpad holds the output of the extracted block of the step Assemble website, and cmp passes for codemirror.js, elk.js and viewpoint_kernel.wasm against the committed files'
        - 'git status --short shows no change outside the prg of the run since task-005'
        - 'grep -c "Assemble website" docs/wav/wav-034-diagrams-assets-likec4-matrix-page/run/run-0228-kernel-beside-the-page/prg-0228-kernel-beside-the-page.md'
      escalation_triggers:
        - 'the block would write outside the scratch folder: stop'
        - 'the block does not copy the .wasm: stop and log it'
      suggested_subagent_type: 'general-purpose'
      suggested_model: '(default)'
      suggested_effort: 'medium'
    - task_id: task-007
      agent_role: 'Documentation Agent'
      objective: 'Say where the kernel is and how the page gets it, as true now and with no history: the manual (the kernel is the third file beside the page, and the file:// sentence of DEC-6), CLAUDE.md, src/main/editor/CLAUDE.md, src/test/CLAUDE.md and the comment of extract-editor-script.mjs where they name the block or the old path; update the model (kernel_wasm tags.path and the two relationships parallel to editor_assets), run npm run sample:build, and run the drift and impact tests.'
      context:
        prd_excerpts:
          - 'none: there is no PRD (profile TDD+pln); the R-n of the TDD are listed with the TDD items'
        tdd_excerpts:
          - 'DEC-6, IMP-10, IMP-13, RISK-1, RISK-4 and the measurements of task-006 in the prg of the run'
      likely_files:
        - 'src/doc/README.adoc'
        - 'CLAUDE.md'
        - 'src/main/editor/CLAUDE.md'
        - 'src/test/CLAUDE.md'
        - 'scripts/extract-editor-script.mjs'
        - 'docs/architecture/manifests/archicode.yaml'
        - 'docs/architecture/manifests/views/view.contracts.yaml'
        - 'src/test/javascript/architecture/impact-questions.json'
        - 'src/main/resources/editor-webapp/samples/archicode.yaml'
      acceptance_criteria:
        - 'the drift and impact tests and the sample check pass'
        - 'the grep for octet-stream, viewpoint-kernel-wasm and src/main/wasm outside docs/wav, rust notes already handled, node_modules and target prints nothing'
        - 'no CLAUDE.md states history'
      verification:
        - 'npm run sample:build'
        - 'JAVA_HOME=$HOME/.sdkman/candidates/java/25.0.4-tem ./mvnw test -Dtest=ArchitectureImpactTest,ArchitectureDriftTest,CommandReferenceTest'
        - '! grep -rnE "octet-stream|viewpoint-kernel-wasm|src/main/wasm" --include=* --exclude-dir=node_modules --exclude-dir=target --exclude-dir=.git --exclude-dir=wav --exclude-dir=rust .'
        - 'npm run format:check'
      escalation_triggers:
        - 'a sentence would state history in a CLAUDE.md: rewrite it'
        - 'the grep finds a reader no task changed: stop and log it'
      suggested_subagent_type: 'general-purpose'
      suggested_model: '(default)'
      suggested_effort: 'medium'
    - task_id: task-008
      agent_role: 'QA Agent'
      objective: 'Run the gate commands of the run independently of the authors and write a results block in the prg of the run: each command with its exit code, the Rust diff check with the pathspec of the preamble, and the list of what is unproved (the website step, the content type of the file on GitHub Pages, macOS, Windows, the native image, the real Safari, and embed.sh --check if no toolchain).'
      context:
        prd_excerpts:
          - 'none: there is no PRD (profile TDD+pln); the R-n of the TDD are listed with the TDD items'
        tdd_excerpts:
          - 'R-1, R-3, R-4, R-5, R-8, R-9, TG-5, RISK-1, RISK-2, Q-2'
      likely_files:
        - 'docs/wav/wav-034-diagrams-assets-likec4-matrix-page/run/run-0228-kernel-beside-the-page/prg-0228-kernel-beside-the-page.md'
      acceptance_criteria:
        - 'every gate command exits 0 or is named in the prg with its reason'
        - 'the unproved list is complete'
        - 'editor:build and sample:build leave the files unchanged, and byte-identity.sh needs no new exception'
      verification:
        - 'npm ci && npm run editor:check'
        - 'bash -c "set -e; f=src/main/resources/editor-webapp; s=$(mktemp); sha256sum $f/assets/* $f/standalone.html $f/samples/* > $s; npm run editor:build > /dev/null; npm run sample:build > /dev/null; sha256sum $f/assets/* $f/standalone.html $f/samples/* | diff - $s"'
        - 'test ! -e src/main/wasm && git show HEAD:src/main/wasm/viewpoint_kernel.wasm | cmp - src/main/resources/editor-webapp/assets/viewpoint_kernel.wasm'
        - 'test "$(wc -c < src/main/resources/editor-webapp/standalone.html)" -le 1736458 && test "$(grep -c "application/octet-stream" src/main/resources/editor-webapp/standalone.html)" -eq 0'
        - 'npm run test:unit'
        - 'npm run test:coverage'
        - 'npm run format:check'
        - 'npm run lint'
        - 'JAVA_HOME=$HOME/.sdkman/candidates/java/25.0.4-tem ./mvnw verify -DskipITs=false'
        - 'JAVA_HOME=$HOME/.sdkman/candidates/java/25.0.4-tem ./mvnw test-compile pmd:check'
        - 'scripts/byte-identity.sh'
        - 'git diff --stat -- "src/main/rust/**/*.rs" "src/main/rust/**/Cargo*" "src/main/rust/**/rust-toolchain.toml"'
        - 'npx playwright test src/test/e2e/editor-offline.spec.js --project=chromium --project=firefox'
        - 'src/main/rust/viewpoint-kernel/embed.sh --check'
      escalation_triggers:
        - 'a command is already red for a reason outside this run: record it with its reason'
        - 'a new byte-identity exception is needed: stop and log it'
      suggested_subagent_type: 'general-purpose'
      suggested_model: '(default)'
      suggested_effort: 'medium'
```

## 10. Verification Plan

```yaml
verification_plan:
  checks:
    - task_id: task-001
      methods:
        - 'unit tests'
        - 'cmp of the moved file'
        - 'editor:check'
        - 'size and grep of the page'
        - 'Maven compile'
        - 'format check'
      success_criteria:
        - 'the file is at its new place with the old bytes and the page names it by a meta with a hash'
        - 'the page is at most 1,736,458 bytes with no octet-stream block and editor:check exits 0'
    - task_id: task-002
      methods:
        - 'unit tests'
        - 'whole node suite'
        - 'coverage'
        - 'grep for the old block and the old path'
        - 'format check'
        - 'lint'
      success_criteria:
        - 'both content types and the three failure sentences are covered'
        - 'the whole node suite passes and no coverage floor goes down'
    - task_id: task-003
      methods:
        - 'unit tests'
        - 'integration test on the packaged jar'
        - 'PMD'
        - 'cmp of the file in the jar'
      success_criteria:
        - '200 with application/wasm and the committed bytes, 403 without proof, 404 for every other name'
        - 'PMD is green and the jar holds the committed bytes'
    - task_id: task-004
      methods:
        - 'unit tests'
        - 'bash syntax check'
        - 'release scripts test'
        - 'YAML parse'
        - 'embed.sh --check and a negative check'
      success_criteria:
        - 'embed.sh checks the file and the page hash with no Node or Python and fails with the named message on a stale file'
        - 'the change map keeps the four jobs on a .wasm change and the steps of other runs in ci-build.yaml are intact'
    - task_id: task-005
      methods:
        - 'end-to-end tests on two engines'
        - 'non-vacuity run with the wasm route removed'
        - 'format check'
        - 'lint'
      success_criteria:
        - 'the spec passes on chromium and firefox with external hosts blocked'
        - 'the spec fails when the wasm route is removed'
    - task_id: task-006
      methods:
        - 'rehearsal in a scratch folder'
        - 'cmp of the three files'
        - 'measurement with the method of the TDD'
      success_criteria:
        - 'the prg holds the rehearsal, the sizes in bytes and gzip, and the load times'
        - 'nothing else in the repository changed'
    - task_id: task-007
      methods:
        - 'drift and impact tests'
        - 'sample check'
        - 'grep for stale references'
      success_criteria:
        - 'the model and the sample tests are green'
        - 'no sentence names the old path, the base64 block or a single-file kernel'
    - task_id: task-008
      methods:
        - 'whole suites'
        - 'byte identity'
        - 'clean rebuild'
        - 'Rust diff check'
        - 'review after'
      success_criteria:
        - 'every gate command exits 0 or is named in the prg with its reason'
        - 'the unproved list is complete'
```

## 11. Escalation Rules

```yaml
escalation_rules:
  rules:
    - condition: 'An assumption of the TDD is false in a way that changes a decision (ASM-1 the jar copy differs, ASM-2 the Chicory plugin does not take the new path, ASM-5 instantiateStreaming is missing)'
      action: 'Stop the task, log it in the prg and let the main agent amend the TDD; never change the check to make it pass'
    - condition: 'The change needs a line in a .rs, Cargo or rust-toolchain.toml file, or the rebuilt .wasm differs from the committed bytes'
      action: 'Stop and log: the kernel is unchanged in this run (Non-Goals); embed.sh and the two notes are the only touched files under src/main/rust'
    - condition: 'An edit would drop a line of another run in pom.xml or ci-build.yaml, or the step Assemble website would have to change'
      action: 'Edit by anchors and diff before and after; a change to the website step is stopped and logged'
    - condition: 'byte-identity.sh needs a new exception or an existing command changes its output'
      action: 'Stop and log: this run must not change a command line output (TG-5)'
    - condition: 'A command fails for a reason outside this run (a base already red, a browser not installed, no network, no Rust toolchain)'
      action: 'Record it in the task and do not fix it; a missing browser, network or toolchain is an environment gap and not a pass'
    - condition: 'A coverage floor or ratchet.max would have to move'
      action: 'Stop and log: floors never go down and ratchet.max stays at most 99'
    - condition: 'A task is flagged human_required or risk critical by a later edit'
      action: 'The wave has no autonomy override: the implement workflow stops with awaiting-human'
```

## 12. Final Execution Manifest

```yaml
execution_manifest:
  status: 'done'
  recommendation: 'proceed_with_review'
  autonomy_level: 'medium'
  total_tasks: 8
  autonomous_tasks: 7
  review_before_tasks: 0
  review_after_tasks: 1
  human_required_tasks: 0
  blocked_tasks: 0
  critical_path_tasks:
    - task-001
    - task-002
    - task-005
    - task-006
    - task-007
    - task-008
  parallel_groups:
    - parallel-group-001
  required_human_gates:
    - gate-001
  highest_risk_tasks:
    - task-001
    - task-004
    - task-005
  lowest_confidence_tasks:
    - task-005
    - task-001
    - task-004
  next_action: 'none: the run is verified; the commit is a human step'
  criteria:
    - 'The page holds no binary, fetches the kernel from the file beside it, and the editor draws a diagram with every host but 127.0.0.1 blocked'
    - 'editor serve serves the file with application/wasm, the website step is rehearsed, and the hand-off says the real step and the content type on GitHub Pages are unproved until a tag run'
    - 'The kernel bytes, the Rust and every command line output are unchanged, and the gates of phase P2 that belong to this run hold'
```
