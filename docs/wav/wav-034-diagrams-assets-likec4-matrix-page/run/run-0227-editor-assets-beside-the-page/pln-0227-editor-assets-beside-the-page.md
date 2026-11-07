---
title: Execution Plan — Editor assets beside the page
status: done
date: 2026-11-06
related:
  - docs/wav/wav-034-diagrams-assets-likec4-matrix-page/run/run-0227-editor-assets-beside-the-page/tdd-0227-editor-assets-beside-the-page.md
  - docs/wav/wav-034-diagrams-assets-likec4-matrix-page/wav-034-diagrams-assets-likec4-matrix-page.md
  - 'gh:tmorin/archicode#207'
type: pln
run: 0227
wave: 034
---

# Execution Plan: Editor assets beside the page

Profile TDD+pln: there is no PRD, so R-1 to R-13 are the IDs the TDD labels (section "PRD Traceability"), assumed from the manifest row W-2 of wave 034, its gates 1 to 3 and 5 to 8 of P2, and issue #207. The TDD is the design (DEC-1 to DEC-9, IMP-1 to IMP-10, CTR-1 to CTR-5, FLOW-1 to FLOW-4). The plan commits nothing: the commit is a human step outside it.

Autonomy: the wave runs with no autonomy override (its progress log says "autonomy override: none"), so no task is `human_required` and none has `risk: critical`; this is why a `human_required` task would stop the implement workflow with `awaiting-human` and why none was written. The run was declared `hard_judgment` by the wave because the website step is proved only by a tag run; the one task that carries that weight is task-004 (`risk: high`, `hard_judgment`, `review_after`), so its verifier runs at the elevated pair of the cost profile. task-008, the final check, is `review_after`. A future reader should not look for a stop: none was needed.

Shared files with run 0226 (W-1), whose edits are in the working tree and uncommitted: `.github/workflows/ci-build.yaml`, `.github/CLAUDE.md` and `pom.xml`. task-004 edits the first two by anchors and keeps the lines of W-1 (the step "Check the manual has its diagrams" and the sentence about PlantUML); no task touches `pom.xml`. The wave also changes its own documents in the working tree; no task edits them.

Every Maven command runs with `JAVA_HOME=$HOME/.sdkman/candidates/java/25.0.4-tem` (the shell Java is 21). Baseline on the starting repository, checked while drafting: `build-editor.test.js` 22 pass, `npm run format:check` and `npm run lint` exit 0, `npm run test:unit` 3520 tests, 3519 pass, 0 fail. `npm run test:coverage`, the Maven suites, `byte-identity.sh` and the e2e suite were not run while drafting; the tasks that name them say what to do if one is already red.

Order of the work: task-001 (the build and the two bundles) is the root. task-002 (loaders), task-003 (server) and task-004 (CI) then touch disjoint paths. task-005 (the e2e spec) needs the loaders and the server. task-006 rehearses the website step and measures; task-007 writes the sentences from what task-006 measured; task-008 is the gate. `editor:build` writes `standalone.html`, which Maven copies into the jar: do not run Maven while an `editor:build` runs.

## 1. Executive Summary

```yaml
summary:
  status: 'done'
  product_goal: 'The editor draws diagrams and edits YAML with no network: CodeMirror and ELK are served as committed files beside the page, by editor serve and by the website, and the page no longer imports from esm.sh'
  technical_approach: 'esbuild (pinned, run by scripts/build-editor.mjs) bundles two entry files into assets/codemirror.js and assets/elk.js, committed and compared by editor:check; the page learns their hashes from meta tags and loads them with import(); EditorHttpServer serves them from a table of two names; the website step copies and compares the folder; an end-to-end spec with every host but 127.0.0.1 blocked proves it'
  total_tasks: 8
  parallel_groups: 1
  high_risk_tasks: 1
  human_review_gates: 1
  autonomy_level: 'medium'
  recommendation: 'proceed_with_review'
  criteria:
    - 'The grep of gate 1 prints nothing, esbuild is in package.json and the lock, npm ci exits 0, and editor:check exits 0 with codemirror.js and elk.js in the assets folder (the .wasm halves of gates 3 and 5 are W-3)'
    - 'editor serve answers 200 with a JavaScript type for both assets, 403 without proof and 404 for any other name; EditorHttpServerTest and EditorServeIT pass'
    - 'editor-offline.spec.js passes on chromium and firefox with every host but 127.0.0.1 blocked and fails on a jar whose bundle is broken'
    - 'The step Assemble website copies the assets folder and compares each file with cmp, rehearsed in a scratch folder; the hand-off says the real step is unproved until a tag run'
    - 'test:unit, test:coverage, format:check, lint and mvnw verify -DskipITs=false exit 0; byte-identity needs no new exception; ratchet.max is at most 99; editor:build and sample:build leave the tree unchanged'
    - 'The manual, README.md, the CLAUDE.md files and the model of ArchiCode say how the page is built and loaded now, and the sizes and load times before and after are in the prg'
```

## 2. PRD/TDD Consistency Assessment

```yaml
consistency_assessment:
  aligned_items:
    - 'R-1 to R-13 each map to at least one DEC or IMP of the TDD and to a task below'
    - 'The gate commands of phase P2 are the verification of task-002, task-003, task-005 and task-008'
    - 'The split of the TDD (build, loaders, server, CI, e2e, sentences) is the split of task-001 to task-007'
  gaps:
    - id: gap-001
      type: 'missing_requirement'
      description: 'There is no PRD: R-1 to R-13 are assumed from the wave manifest and issue 207 (traceability incomplete in the TDD)'
      impact: 'low'
      recommendation: 'The tasks cite the R-n of the TDD; the gates of the wave are the acceptance criteria'
    - id: gap-002
      type: 'missing_technical_design'
      description: 'Stage 5 review findings still open in the TDD text: DEC-1 does not name metafile true although DEC-8 reads the esbuild metafile; R-13 (sizes and load times) names no owner or command; the grep of gate 1 also scans the committed bundles; the rationale of R-07a and the role of check-editor-moves.sh are not named; the traceability line says Unresolved none'
      impact: 'low'
      recommendation: 'The plan carries the resolutions so it holds either way: task-001 sets metafile true, task-006 owns R-13 with the method of Q-3, task-001 and task-002 run the gate-1 grep on the assets folder and on the rest, task-004 states the rationale of R-07a, and the unit tests of task-001 prove --where, --map and --check-identical need no esbuild so that check-editor-moves.sh, which runs the build script on old trees, still works'
    - id: gap-003
      type: 'risk'
      description: 'The step Assemble website runs only on a tag (CON-6) and its base path and cache cannot be rehearsed'
      impact: 'high'
      recommendation: 'task-004 is hard_judgment with a high-risk verifier; task-006 rehearses the extracted block with a browser; the hand-off says the real step is unproved until a tag run'
    - id: gap-004
      type: 'ambiguity'
      description: 'ASM-1 (identical bytes on every machine) is validated on Linux only, and ASM-3 (ELK bundled) in Node only'
      impact: 'medium'
      recommendation: 'task-001 builds twice in two folders; task-005 is the browser proof on two engines; the first pull request run of the job Page is the Linux proof and macOS and Windows stay unproved'
    - id: gap-005
      type: 'risk'
      description: 'Uncommitted lines of run 0226 in ci-build.yaml, .github/CLAUDE.md and pom.xml'
      impact: 'medium'
      recommendation: 'task-004 edits by anchors and checks that the step Check the manual has its diagrams is still there; no task edits pom.xml'
    - id: gap-006
      type: 'ambiguity'
      description: 'The .wasm halves of gates 3 and 5 are named by both W-2 and W-3 in the manifest'
      impact: 'low'
      recommendation: 'DEC-7 assigns them to W-3; task-003 adds two entries only and task-008 lists them as not proved here'
  blocking_gaps: []
```

## 3. Execution Graph

```yaml
execution_graph:
  nodes:
    - id: task-001
      status: 'done'
      title: 'Pins, bundle entries and the build: esbuild API, assets.json, the @assets directive, the notice file, --check, the two committed bundles'
      depends_on: []
      produces:
        - 'package.json'
        - 'package-lock.json'
        - 'src/main/editor/assets.json'
        - 'src/main/editor/bundles/codemirror.mjs'
        - 'src/main/editor/bundles/elk.mjs'
        - 'scripts/build-editor.mjs'
        - 'src/main/editor/page.html (the <!--@assets--> line only)'
        - 'src/main/resources/editor-webapp/assets/codemirror.js'
        - 'src/main/resources/editor-webapp/assets/elk.js'
        - 'src/main/resources/editor-webapp/assets/THIRD-PARTY-NOTICES.txt'
        - 'src/main/resources/editor-webapp/standalone.html (three <meta> lines)'
        - 'src/test/javascript/editor-build/build-editor.test.js (new cases)'
        - 'src/test/javascript/editor-build/editor-assets.test.js'
      agent_role: 'Frontend Implementation Agent'
      autonomy: 'autonomous'
      risk: 'medium'
      confidence: 65
    - id: task-002
      status: 'done'
      title: 'Loaders: assetAddress, loadElk and the module script read the <meta>; the remote-import guard test; the shorter page comment'
      depends_on: [task-001]
      produces:
        - 'src/main/editor/model/kernel-bridge.js'
        - 'src/main/editor/codemirror-loader.mjs'
        - 'src/main/editor/page.html'
        - 'src/main/editor/names.json'
        - 'src/main/resources/editor-webapp/standalone.html'
        - 'src/test/javascript/editor-build/remote-import.test.js'
        - 'src/test/javascript/viewpoint-kernel/asset-address.test.js'
        - 'src/test/javascript/viewpoint-kernel/harness.js (a querySelector that tolerates a missing meta, only if needed)'
      agent_role: 'Frontend Implementation Agent'
      autonomy: 'autonomous'
      risk: 'medium'
      confidence: 70
    - id: task-003
      status: 'done'
      title: 'The editor server: the ASSETS table, one static handler for samples and assets, and the Java and integration tests'
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
      title: 'CI: "Assemble website" copies and compares the assets folder, the R-07a rule of the change map, and the notes of .github/CLAUDE.md'
      depends_on: [task-001]
      produces:
        - '.github/workflows/ci-build.yaml'
        - 'scripts/changes.mjs'
        - 'src/test/javascript/changes-map.test.js'
        - '.github/CLAUDE.md'
      agent_role: 'Infrastructure Agent'
      autonomy: 'review_after'
      risk: 'high'
      confidence: 60
    - id: task-005
      status: 'done'
      title: 'End-to-end: the editor draws a diagram and edits YAML in CodeMirror with every host but 127.0.0.1 blocked'
      depends_on: [task-002, task-003]
      produces:
        - 'src/test/e2e/editor-offline.spec.js'
        - 'src/test/e2e/harness.js'
      agent_role: 'Test Generation Agent'
      autonomy: 'autonomous'
      risk: 'medium'
      confidence: 60
    - id: task-006
      status: 'done'
      title: 'Rehearse "Assemble website", repeat the file:// measurement on the real assets, and report sizes and load times after (R-13)'
      depends_on: [task-004, task-005]
      produces:
        - 'docs/wav/wav-034-diagrams-assets-likec4-matrix-page/run/run-0227-editor-assets-beside-the-page/prg-0227-editor-assets-beside-the-page.md (a Findings block: the rehearsal, the file:// result, sizes, load times)'
      agent_role: 'QA Agent'
      autonomy: 'autonomous'
      risk: 'medium'
      confidence: 70
    - id: task-007
      status: 'done'
      title: 'The sentences and the model: manual, README.md, CLAUDE.md files, embed.sh comment, the editor_assets component and the sample bundle'
      depends_on: [task-006]
      produces:
        - 'src/doc/README.adoc'
        - 'README.md'
        - 'CLAUDE.md'
        - 'src/main/editor/CLAUDE.md'
        - 'src/test/CLAUDE.md'
        - 'src/main/rust/viewpoint-kernel/embed.sh (its comment)'
        - 'docs/architecture/manifests/archicode.yaml'
        - 'docs/architecture/manifests/views/view.contracts.yaml'
        - 'src/test/javascript/architecture/impact-questions.json (only if a question is added)'
        - 'src/main/resources/editor-webapp/samples/archicode.yaml'
      agent_role: 'Documentation Agent'
      autonomy: 'autonomous'
      risk: 'low'
      confidence: 75
    - id: task-008
      status: 'done'
      title: 'Gates of the run: the P2 criteria that belong to W-2, the whole suites, byte identity and a clean rebuild'
      depends_on: [task-007]
      produces:
        - 'docs/wav/wav-034-diagrams-assets-likec4-matrix-page/run/run-0227-editor-assets-beside-the-page/prg-0227-editor-assets-beside-the-page.md (a results block: commands, exit codes, what is unproved)'
      agent_role: 'QA Agent'
      autonomy: 'review_after'
      risk: 'medium'
      confidence: 75
  edges:
    - from: task-001
      to: task-002
      reason: 'The loaders read the meta lines and import the files the build writes'
    - from: task-001
      to: task-003
      reason: 'The server tests compare the served bytes with the committed files'
    - from: task-001
      to: task-004
      reason: 'The step copies a folder that the build creates'
    - from: task-002
      to: task-005
      reason: 'The spec needs a page that loads the assets'
    - from: task-003
      to: task-005
      reason: 'The spec needs a jar that serves the assets'
    - from: task-004
      to: task-006
      reason: 'The rehearsal runs the block the task edits'
    - from: task-005
      to: task-006
      reason: 'The rehearsal checks the diagram with the same browser method'
    - from: task-006
      to: task-007
      reason: 'The manual sentence on file:// follows the measurement'
    - from: task-007
      to: task-008
      reason: 'The final check runs after the sentences and the model are in place'
```

## 4. Task Catalog

```yaml
task_catalog:
  tasks:
    - id: task-001
      title: 'Pins, bundle entries and the build: esbuild API, assets.json, the @assets directive, the notice file, --check, the two committed bundles'
      source_requirements:
        prd:
          - 'none: there is no PRD (profile TDD+pln); the R-n of the TDD are listed with the TDD items'
        tdd:
          - 'R-1'
          - 'R-3'
          - 'R-4'
          - 'R-11'
          - 'R-12'
          - 'TG-2'
          - 'TG-3'
          - 'ASM-1'
          - 'ASM-2'
          - 'ASM-3'
          - 'CON-1'
          - 'CON-2'
          - 'CON-5'
          - 'CON-8'
          - 'DEC-1'
          - 'DEC-2'
          - 'DEC-3'
          - 'DEC-4'
          - 'DEC-8'
          - 'DEC-9'
          - 'CTR-1'
          - 'CTR-2'
          - 'CTR-5'
          - 'IF-1'
          - 'FLOW-1'
          - 'IMP-1'
          - 'IMP-2'
          - 'IMP-3'
          - 'IMP-5'
          - 'RISK-1'
          - 'RISK-2'
          - 'RISK-6'
          - 'RISK-7'
      outputs:
        - 'package.json'
        - 'package-lock.json'
        - 'src/main/editor/assets.json'
        - 'src/main/editor/bundles/codemirror.mjs'
        - 'src/main/editor/bundles/elk.mjs'
        - 'scripts/build-editor.mjs'
        - 'src/main/editor/page.html (the <!--@assets--> line only)'
        - 'src/main/resources/editor-webapp/assets/codemirror.js'
        - 'src/main/resources/editor-webapp/assets/elk.js'
        - 'src/main/resources/editor-webapp/assets/THIRD-PARTY-NOTICES.txt'
        - 'src/main/resources/editor-webapp/standalone.html (three <meta> lines)'
        - 'src/test/javascript/editor-build/build-editor.test.js (new cases)'
        - 'src/test/javascript/editor-build/editor-assets.test.js'
      verification:
        - 'npm ci'
        - 'node --test src/test/javascript/editor-build/build-editor.test.js src/test/javascript/editor-build/editor-assets.test.js'
        - 'npm run editor:build && npm run editor:check'
        - 'bash -c ''set -e; f=src/main/resources/editor-webapp; s=$(mktemp); sha256sum $f/assets/* $f/standalone.html > "$s"; npm run editor:build > /dev/null; sha256sum $f/assets/* $f/standalone.html | diff - "$s"'''
        - 'test "$(grep -c esbuild package.json)" -ge 1 && test "$(grep -c node_modules/esbuild package-lock.json)" -ge 1'
        - 'test -f src/main/resources/editor-webapp/assets/codemirror.js && test -f src/main/resources/editor-webapp/assets/elk.js && test -f src/main/resources/editor-webapp/assets/THIRD-PARTY-NOTICES.txt'
        - '! grep -rnE "import\(.https?:" src/main/resources/editor-webapp/assets'
        - 'npm run format:check'
      risk: 'medium'
      confidence: 65
      human_review: 'none'
      escalation_triggers:
        - 'the two builds of ASM-1 differ: stop and log it, RISK-2 changes the design (a pinned toolchain image or a different check)'
        - 'elk.js does not export the ELK class as default once bundled, or ESM bundling of elk.bundled.js fails: stop and log it (ASM-3, RISK-7)'
        - 'npm install cannot resolve one pin: stop and log it, never move to another version silently'
      delegation_tier: 'standard'
      results: 'tier standard, model sonnet, effort medium, profile low-cost, passed first time, inline (leaf), independently verified'
    - id: task-002
      title: 'Loaders: assetAddress, loadElk and the module script read the <meta>; the remote-import guard test; the shorter page comment'
      source_requirements:
        prd:
          - 'none: there is no PRD (profile TDD+pln); the R-n of the TDD are listed with the TDD items'
        tdd:
          - 'R-2'
          - 'R-5'
          - 'R-9'
          - 'R-12'
          - 'TG-1'
          - 'TG-4'
          - 'CON-1'
          - 'CON-3'
          - 'CON-8'
          - 'DEC-3'
          - 'DEC-4'
          - 'DEC-9'
          - 'CTR-1'
          - 'CTR-2'
          - 'IF-2'
          - 'IF-3'
          - 'IF-5'
          - 'FLOW-2'
          - 'IMP-4'
          - 'IMP-9'
          - 'ASM-4'
      outputs:
        - 'src/main/editor/model/kernel-bridge.js'
        - 'src/main/editor/codemirror-loader.mjs'
        - 'src/main/editor/page.html'
        - 'src/main/editor/names.json'
        - 'src/main/resources/editor-webapp/standalone.html'
        - 'src/test/javascript/editor-build/remote-import.test.js'
        - 'src/test/javascript/viewpoint-kernel/asset-address.test.js'
        - 'src/test/javascript/viewpoint-kernel/harness.js (a querySelector that tolerates a missing meta, only if needed)'
      verification:
        - 'node --test src/test/javascript/editor-build/remote-import.test.js src/test/javascript/viewpoint-kernel/asset-address.test.js'
        - 'npm run editor:build && npm run editor:check'
        - '! grep -rnE "import\(.https?:" src/main/editor src/main/resources/editor-webapp --include=*.js --include=*.mjs --include=*.html'
        - 'npm run test:unit'
        - 'npm run format:check'
        - 'npm run lint'
      risk: 'medium'
      confidence: 70
      human_review: 'none'
      escalation_triggers:
        - 'a loader needs a new name outside names.json or a new upward pair: stop and log it (the editor layers are not changed by this run)'
        - 'the unit harness needs more than a null-tolerant querySelector: stop and log it, do not rewrite the harness'
        - 'an existing test of the loaders fails for a reason other than the address: fix the loader, never the old test'
      delegation_tier: 'standard'
      results: 'tier standard, model sonnet, effort medium, profile low-cost, passed after escalation to effort high, inline (leaf), independently verified'
    - id: task-003
      title: 'The editor server: the ASSETS table, one static handler for samples and assets, and the Java and integration tests'
      source_requirements:
        prd:
          - 'none: there is no PRD (profile TDD+pln); the R-n of the TDD are listed with the TDD items'
        tdd:
          - 'R-6'
          - 'R-12'
          - 'TG-3'
          - 'CON-2'
          - 'CON-7'
          - 'CON-9'
          - 'DEC-5'
          - 'DEC-7'
          - 'CTR-3'
          - 'IF-4'
          - 'FLOW-2'
          - 'IMP-6'
          - 'ASM-5'
          - 'RISK-4'
      outputs:
        - 'src/main/java/io/morin/archicode/cli/EditorHttpServer.java'
        - 'src/test/java/io/morin/archicode/cli/EditorHttpServerTest.java'
        - 'src/test/java/io/morin/archicode/it/EditorServeIT.java'
      verification:
        - 'JAVA_HOME=$HOME/.sdkman/candidates/java/25.0.4-tem ./mvnw test -Dtest=EditorHttpServerTest'
        - 'JAVA_HOME=$HOME/.sdkman/candidates/java/25.0.4-tem ./mvnw verify -DskipITs=false -Dit.test=EditorServeIT -Dtest=NoSuchTest -Dsurefire.failIfNoSpecifiedTests=false'
        - 'JAVA_HOME=$HOME/.sdkman/candidates/java/25.0.4-tem ./mvnw test-compile pmd:check'
      risk: 'medium'
      confidence: 80
      human_review: 'none'
      escalation_triggers:
        - 'the served page or the samples route changes behaviour for an existing test: stop and log it, the samples are unchanged'
        - 'the 500 for a missing resource cannot be tested without a classpath trick: cover it with a unit test of the lookup, never with a suppression'
      delegation_tier: 'standard'
      results: 'tier standard, model sonnet, effort medium, profile low-cost, passed first time, inline (leaf), independently verified'
    - id: task-004
      title: 'CI: "Assemble website" copies and compares the assets folder, the R-07a rule of the change map, and the notes of .github/CLAUDE.md'
      source_requirements:
        prd:
          - 'none: there is no PRD (profile TDD+pln); the R-n of the TDD are listed with the TDD items'
        tdd:
          - 'R-7'
          - 'R-8'
          - 'R-12'
          - 'TG-5'
          - 'CON-6'
          - 'DEC-6'
          - 'CTR-4'
          - 'FLOW-3'
          - 'FLOW-4'
          - 'IMP-7'
          - 'RISK-3'
      outputs:
        - '.github/workflows/ci-build.yaml'
        - 'scripts/changes.mjs'
        - 'src/test/javascript/changes-map.test.js'
        - '.github/CLAUDE.md'
      verification:
        - 'node --test src/test/javascript/changes-map.test.js'
        - 'python3 -c "import yaml; yaml.safe_load(open(''.github/workflows/ci-build.yaml''))"'
        - 'test "$(grep -c "Failed to generate image" .github/workflows/ci-build.yaml)" -ge 1'
        - 'test "$(grep -c "editor/assets" .github/workflows/ci-build.yaml)" -ge 1'
        - 'npm run format:check'
      risk: 'high'
      confidence: 60
      human_review: 'after'
      escalation_triggers:
        - 'the cp or the cmp would fail on a file the folder legitimately holds (the notice file has no reader but must be copied): stop and log it'
        - 'an edit would drop a line of W-1 in ci-build.yaml or .github/CLAUDE.md: edit by anchors and diff before and after'
        - 'the step is changed beyond the editor assets (the stamp, the presentation page, the manual): stop and log it'
      delegation_tier: 'hard_judgment'
      results: 'tier hard_judgment, model sonnet, effort high, profile low-cost, passed first time, inline (leaf), independently verified'
    - id: task-005
      title: 'End-to-end: the editor draws a diagram and edits YAML in CodeMirror with every host but 127.0.0.1 blocked'
      source_requirements:
        prd:
          - 'none: there is no PRD (profile TDD+pln); the R-n of the TDD are listed with the TDD items'
        tdd:
          - 'R-10'
          - 'R-12'
          - 'TG-1'
          - 'TG-4'
          - 'CON-3'
          - 'IF-2'
          - 'IF-3'
          - 'IF-4'
          - 'FLOW-2'
          - 'FLOW-3'
          - 'IMP-8'
          - 'ASM-3'
          - 'ASM-4'
          - 'ASM-5'
          - 'RISK-7'
      outputs:
        - 'src/test/e2e/editor-offline.spec.js'
        - 'src/test/e2e/harness.js'
      verification:
        - 'JAVA_HOME=$HOME/.sdkman/candidates/java/25.0.4-tem ./mvnw package -Dmaven.test.skip -Dplugin.asciidoctor.skip=true'
        - 'npx playwright test src/test/e2e/editor-offline.spec.js --project=chromium'
        - 'npx playwright test src/test/e2e/editor-offline.spec.js --project=firefox'
        - 'npx playwright test src/test/e2e/hosted-acceptance.spec.js --project=chromium'
        - 'npm run format:check'
        - 'npm run lint'
      risk: 'medium'
      confidence: 60
      human_review: 'none'
      escalation_triggers:
        - 'ELK or CodeMirror does not load in a real browser although node and Java tests pass (ASM-3, RISK-7): stop and log it with the console output, do not weaken the spec'
        - 'a browser project is not installed (npx playwright install chromium firefox needed): record it and stop, it is an environment gap, not a pass'
        - 'the spec is flaky: drop the flow with its reason, never add a retry (src/test/CLAUDE.md)'
      delegation_tier: 'standard'
      results: 'tier standard, model sonnet, effort medium, profile low-cost, passed after escalation to effort high, inline (leaf), independently verified'
    - id: task-006
      title: 'Rehearse "Assemble website", repeat the file:// measurement on the real assets, and report sizes and load times after (R-13)'
      source_requirements:
        prd:
          - 'none: there is no PRD (profile TDD+pln); the R-n of the TDD are listed with the TDD items'
        tdd:
          - 'R-8'
          - 'R-13'
          - 'TG-5'
          - 'ASM-1'
          - 'ASM-4'
          - 'IF-5'
          - 'FLOW-4'
          - 'RISK-3'
          - 'RISK-5'
          - 'Q-2'
          - 'Q-3'
      outputs:
        - 'docs/wav/wav-034-diagrams-assets-likec4-matrix-page/run/run-0227-editor-assets-beside-the-page/prg-0227-editor-assets-beside-the-page.md (a Findings block: the rehearsal, the file:// result, sizes, load times)'
      verification:
        - 'grep -c "Rehearsal of Assemble website" docs/wav/wav-034-diagrams-assets-likec4-matrix-page/run/run-0227-editor-assets-beside-the-page/prg-0227-editor-assets-beside-the-page.md'
        - 'grep -c "file:// on the real assets" docs/wav/wav-034-diagrams-assets-likec4-matrix-page/run/run-0227-editor-assets-beside-the-page/prg-0227-editor-assets-beside-the-page.md'
        - 'grep -ci "median" docs/wav/wav-034-diagrams-assets-likec4-matrix-page/run/run-0227-editor-assets-beside-the-page/prg-0227-editor-assets-beside-the-page.md'
      risk: 'medium'
      confidence: 70
      human_review: 'none'
      escalation_triggers:
        - 'the rehearsal shows an asset missing from target/site: fix task-004 there, never patch the rehearsal'
        - 'the network is not available for a measurement: record the before figures only and say the after is not taken'
        - 'the file:// result differs from Q-2: report it; the manual sentence follows the measurement'
      delegation_tier: 'standard'
      results: 'tier standard, model sonnet, effort medium, profile low-cost, passed first time, inline (leaf), independently verified'
    - id: task-007
      title: 'The sentences and the model: manual, README.md, CLAUDE.md files, embed.sh comment, the editor_assets component and the sample bundle'
      source_requirements:
        prd:
          - 'none: there is no PRD (profile TDD+pln); the R-n of the TDD are listed with the TDD items'
        tdd:
          - 'R-11'
          - 'R-12'
          - 'CON-1'
          - 'CON-7'
          - 'IF-5'
          - 'IMP-10'
          - 'CI-arc-1'
          - 'RISK-5'
          - 'Q-2'
      outputs:
        - 'src/doc/README.adoc'
        - 'README.md'
        - 'CLAUDE.md'
        - 'src/main/editor/CLAUDE.md'
        - 'src/test/CLAUDE.md'
        - 'src/main/rust/viewpoint-kernel/embed.sh (its comment)'
        - 'docs/architecture/manifests/archicode.yaml'
        - 'docs/architecture/manifests/views/view.contracts.yaml'
        - 'src/test/javascript/architecture/impact-questions.json (only if a question is added)'
        - 'src/main/resources/editor-webapp/samples/archicode.yaml'
      verification:
        - 'JAVA_HOME=$HOME/.sdkman/candidates/java/25.0.4-tem ./mvnw test -Dtest=ArchitectureDriftTest,ArchitectureImpactTest,ArchitectureModelTest'
        - 'npm run sample:build && npm run sample:check'
        - 'node --test src/test/javascript/manual-skeleton.test.js src/test/javascript/manual-voice.test.js src/test/javascript/manual-howto.test.js src/test/javascript/architecture-model.test.js'
        - '! grep -rn "esm.sh" README.md CLAUDE.md src/doc/README.adoc src/main/editor/CLAUDE.md src/test/CLAUDE.md src/main/rust/viewpoint-kernel/embed.sh src/main/editor/page.html'
        - 'npm run format:check'
      risk: 'low'
      confidence: 75
      human_review: 'none'
      escalation_triggers:
        - 'a modeled editor layer or a tags.path would no longer match layers.json: stop and log it, the model change is a coupling and not a layer'
        - 'the manual test of voice or anchors fails on a sentence this task did not write: record it and do not fix it'
        - 'a sentence outside the listed files says how the page is built or loaded: add it to the log and fix it only if it is the same fact'
      delegation_tier: 'standard'
      results: 'tier standard, model sonnet, effort medium, profile low-cost, passed first time, inline (leaf), independently verified'
    - id: task-008
      title: 'Gates of the run: the P2 criteria that belong to W-2, the whole suites, byte identity and a clean rebuild'
      source_requirements:
        prd:
          - 'none: there is no PRD (profile TDD+pln); the R-n of the TDD are listed with the TDD items'
        tdd:
          - 'R-1'
          - 'R-2'
          - 'R-3'
          - 'R-4'
          - 'R-6'
          - 'R-8'
          - 'R-10'
          - 'R-12'
          - 'R-13'
          - 'CON-4'
          - 'CON-7'
          - 'DEC-7'
          - 'RISK-1'
          - 'RISK-2'
          - 'RISK-3'
          - 'Observability and Verification'
      outputs:
        - 'docs/wav/wav-034-diagrams-assets-likec4-matrix-page/run/run-0227-editor-assets-beside-the-page/prg-0227-editor-assets-beside-the-page.md (a results block: commands, exit codes, what is unproved)'
      verification:
        - '! grep -rnE "import\(.https?:" src/main/editor src/main/resources/editor-webapp --include=*.js --include=*.mjs --include=*.html'
        - 'npm ci'
        - 'npm run editor:check'
        - 'JAVA_HOME=$HOME/.sdkman/candidates/java/25.0.4-tem ./mvnw verify -DskipITs=false'
        - 'JAVA_HOME=$HOME/.sdkman/candidates/java/25.0.4-tem ./mvnw test-compile pmd:check'
        - 'npx playwright test src/test/e2e/editor-offline.spec.js --project=chromium'
        - 'npx playwright test src/test/e2e/editor-offline.spec.js --project=firefox'
        - 'npm run test:unit'
        - 'npm run test:coverage'
        - 'npm run format:check'
        - 'npm run lint'
        - 'scripts/byte-identity.sh'
        - 'node -e "process.exit(require(''./src/main/editor/layers.json'').ratchet.max <= 99 ? 0 : 1)"'
        - 'git diff --stat -- scripts/byte-identity-exceptions.txt scripts/byte-identity-new-files.txt scripts/byte-identity-stdout-changes.txt src/main/rust src/main/wasm'
      risk: 'medium'
      confidence: 75
      human_review: 'after'
      escalation_triggers:
        - 'byte-identity needs a new exception or an existing command changes its output: stop and log it (CON-4)'
        - 'a command fails for a reason outside this run (a base already red): record it, do not fix it'
        - 'the Java coverage floor or an editor coverage floor goes down: stop and log it, do not lower a floor'
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
      reason: 'Once the build and the two bundles exist, the loaders (JavaScript), the server (Java) and the CI step with the change map touch disjoint paths'
      conflict_risks:
        - 'task-002 runs editor:build, which writes standalone.html, and task-003 runs Maven, which copies it into the jar: run Maven after the editor:build of task-002 has finished, never at the same time'
        - 'task-002 and task-004 both run node tests and format:check over the same tree: read-only, no conflict'
        - 'task-004 edits ci-build.yaml and .github/CLAUDE.md on top of uncommitted lines of run 0226: edit by anchors, diff before and after'
        - 'the wave runs its runs one after another (--max-parallel-runs 1); this group is inside the one run'
```

## 6. Human Review Gates

```yaml
human_review_gates:
  gates:
    - id: gate-001
      trigger: 'The step Assemble website (task-004) and the final check (task-008) decide whether the hosted editor keeps working on the next tag, and a pull request cannot run that step'
      required_before: []
      required_after: ['task-008']
      reviewer_focus:
        - 'that the step copies the assets folder and compares every file of the source folder, and that the lines of run 0226 in the same workflow are intact'
        - 'that the rehearsal of task-006 ran the extracted block and a browser, and that the real step is named as unproved until a tag run'
        - 'that the end-to-end spec fails on a broken bundle, and that macOS, Windows, the native image and the real Safari are listed as unproved'
```

This run operates under no autonomy override (the progress log of the wave says "autonomy override: none"). The gate does not stop the run: no task is `human_required`, the two tasks it covers are `review_after`, and the review is the independent verification of each task together with the author's reading of the pull request.

## 7. Risk Assessment

```yaml
risk_assessment:
  by_task:
    - id: task-001
      risk: 'medium'
      rationale: 'Build script and generated bytes in git: a bad bundle looks like a good one; the e2e spec of task-005 is the browser proof.'
    - id: task-002
      risk: 'medium'
      rationale: 'Two loaders on a path every page load takes, with fallbacks that must stay as they are.'
    - id: task-003
      risk: 'medium'
      rationale: 'Security-shaped handler (Host check, token or cookie) but a table of two exact names and tests copied from the samples.'
    - id: task-004
      risk: 'high'
      rationale: 'A wrong copy publishes a hosted editor without CodeMirror or diagrams on the next tag, and a pull request cannot run the step.'
    - id: task-005
      risk: 'medium'
      rationale: 'Real browsers, two engines, and a non-vacuity proof; ELK bundled is validated in Node only before this task.'
    - id: task-006
      risk: 'medium'
      rationale: 'Measurements in scratch space; the network of the day moves the load times.'
    - id: task-007
      risk: 'low'
      rationale: 'Prose and model upkeep with generated checks (drift, impact, sample, manual tests).'
    - id: task-008
      risk: 'medium'
      rationale: 'Independent final check before close-out.'
  by_area:
    - area: 'infra'
      risk: 'high'
      rationale: 'The website step runs only on a tag and a wrong copy breaks the hosted editor'
    - area: 'api'
      risk: 'medium'
      rationale: 'A new route on editor serve with the Host check and the token rule, additive'
    - area: 'ui'
      risk: 'medium'
      rationale: 'The two loaders sit on every page load; the fallbacks are the safety'
    - area: 'security'
      risk: 'low'
      rationale: 'No third-party code at run time any more; the new route follows the samples rules with a table of exact names'
    - area: 'docs'
      risk: 'low'
      rationale: 'The drift and impact tests and the manual tests check the sentences and the model'
```

## 8. Confidence Assessment

```yaml
confidence_assessment:
  by_task:
    - id: task-001
      score: 65
      rationale: 'ASM-1 is validated on Linux only and the notice file is new code.'
    - id: task-002
      score: 70
      rationale: 'Clear design (DEC-3, DEC-4), a large existing suite as safety net.'
    - id: task-003
      score: 80
      rationale: 'Pattern copy of handleSample with a full list of cases in the TDD.'
    - id: task-004
      score: 60
      rationale: 'The step is proved here only by extraction and rehearsal; GitHub Pages base path and cache are not reproduced.'
    - id: task-005
      score: 60
      rationale: 'Browser timing and the broken-jar proof are the unknowns.'
    - id: task-006
      score: 70
      rationale: 'Method fixed in the TDD; figures depend on the network.'
    - id: task-007
      score: 75
      rationale: 'Documentation with generated checks.'
    - id: task-008
      score: 75
      rationale: 'Many commands; two engines and the packaged jar.'
```

## 9. Agent Assignment Plan

```yaml
agent_assignment_plan:
  assignments:
    - task_id: task-001
      agent_role: 'Frontend Implementation Agent'
      objective: 'Add the seven pinned dev dependencies of DEC-2 (npm install --save-dev --save-exact, then npm ci), the two bundle entries of DEC-3 and assets.json, and extend scripts/build-editor.mjs as DEC-1, DEC-4, DEC-8 and CTR-5 say: a lazy import of esbuild with metafile: true (the notice file reads the packages the metafile lists), the bundles built in memory with the fixed target list and written only when their bytes differ, the notice file, the @assets directive that writes one <meta name="archicode-asset:NAME" content="./assets/NAME?v=8hex"> per asset from the SHA-256 of the committed file on disk (so --where, --map and --check-identical need no esbuild), --check that names the stale asset or notice file, and the error: lines of FLOW-1. Add the directive line to page.html, run npm run editor:build to write the assets, the notice file and the page, and add the node tests of the TDD (build-editor.test.js cases and editor-assets.test.js on the lock layout, ASM-2).'
      context:
        prd_excerpts:
          - 'none: there is no PRD (profile TDD+pln); the R-n of the TDD are listed with the TDD items'
        tdd_excerpts:
          - 'R-1'
          - 'R-3'
          - 'R-4'
          - 'R-11'
          - 'R-12'
          - 'TG-2'
          - 'TG-3'
          - 'ASM-1'
          - 'ASM-2'
          - 'ASM-3'
          - 'CON-1'
          - 'CON-2'
          - 'CON-5'
          - 'CON-8'
          - 'DEC-1'
          - 'DEC-2'
          - 'DEC-3'
          - 'DEC-4'
          - 'DEC-8'
          - 'DEC-9'
          - 'CTR-1'
          - 'CTR-2'
          - 'CTR-5'
          - 'IF-1'
          - 'FLOW-1'
          - 'IMP-1'
          - 'IMP-2'
          - 'IMP-3'
          - 'IMP-5'
          - 'RISK-1'
          - 'RISK-2'
          - 'RISK-6'
          - 'RISK-7'
      likely_files:
        - 'package.json'
        - 'package-lock.json'
        - 'src/main/editor/assets.json'
        - 'src/main/editor/bundles/codemirror.mjs'
        - 'src/main/editor/bundles/elk.mjs'
        - 'scripts/build-editor.mjs'
        - 'src/main/editor/page.html'
        - 'src/main/resources/editor-webapp/assets/codemirror.js'
        - 'src/main/resources/editor-webapp/assets/elk.js'
        - 'src/main/resources/editor-webapp/assets/THIRD-PARTY-NOTICES.txt'
        - 'src/main/resources/editor-webapp/standalone.html'
        - 'src/test/javascript/editor-build/build-editor.test.js'
        - 'src/test/javascript/editor-build/editor-assets.test.js'
      acceptance_criteria:
        - 'package.json holds esbuild 0.28.2, codemirror 6.0.1, @codemirror/lang-yaml 6.1.1, @codemirror/lang-json 6.0.1, @codemirror/language 6.13.1, @lezer/highlight 1.2.5 and elkjs 0.9.3 as exact devDependencies, and npm ci exits 0'
        - 'the build calls esbuild with metafile: true and the notice file lists, sorted by name, each package of the metafile with its version, SPDX licence and LICENSE* text (EPL-2.0 for elkjs, MIT for the others)'
        - 'the written <meta> hash of each asset equals the first 8 hex of the SHA-256 of the file on disk, a second editor:build writes nothing, and editor:check fails with the error: line of CTR-5 on an edited asset and on an edited notice file'
        - 'a page with the directive and no assets.json, assets.json and no directive, and a copy of the script in a folder with no node_modules (error: esbuild is not installed: run npm ci) each give one error: line and exit 1; the unit trees without assets.json behave as before; --where and --map run with no esbuild'
        - 'editor-assets.test.js fails unless @codemirror/state and @codemirror/view each exist once in package-lock.json with no nested copy, and says what it read'
        - 'the sizes (raw and gzip) of the two bundles and the notice file are written in the prg of the run, with the result of building twice in two folders (ASM-1)'
        - 'no hit of import( followed by an http(s) string inside the committed assets folder; if one exists, stop and log it (the grep of the wave gate covers that folder)'
        - 'package.json scripts and the prelint, pretest:unit and pretest:coverage entries are unchanged'
      verification:
        - 'npm ci'
        - 'node --test src/test/javascript/editor-build/build-editor.test.js src/test/javascript/editor-build/editor-assets.test.js'
        - 'npm run editor:build && npm run editor:check'
        - 'bash -c ''set -e; f=src/main/resources/editor-webapp; s=$(mktemp); sha256sum $f/assets/* $f/standalone.html > "$s"; npm run editor:build > /dev/null; sha256sum $f/assets/* $f/standalone.html | diff - "$s"'''
        - 'test "$(grep -c esbuild package.json)" -ge 1 && test "$(grep -c node_modules/esbuild package-lock.json)" -ge 1'
        - 'test -f src/main/resources/editor-webapp/assets/codemirror.js && test -f src/main/resources/editor-webapp/assets/elk.js && test -f src/main/resources/editor-webapp/assets/THIRD-PARTY-NOTICES.txt'
        - '! grep -rnE "import\(.https?:" src/main/resources/editor-webapp/assets'
        - 'npm run format:check'
      escalation_triggers:
        - 'the two builds of ASM-1 differ: stop and log it, RISK-2 changes the design (a pinned toolchain image or a different check)'
        - 'elk.js does not export the ELK class as default once bundled, or ESM bundling of elk.bundled.js fails: stop and log it (ASM-3, RISK-7)'
        - 'npm install cannot resolve one pin: stop and log it, never move to another version silently'
      suggested_subagent_type: 'general-purpose'
      suggested_model: '(default)'
      suggested_effort: 'high'
    - task_id: task-002
      agent_role: 'Frontend Implementation Agent'
      objective: 'Replace the six import() of https://esm.sh with the loaders of DEC-3 and DEC-4: a top-level assetAddress(name) in model/kernel-bridge.js (null for no document, no meta, empty content; otherwise new URL(content, document.baseURI).href), loadElk() importing elk.js with the 30 s retry and the warning unchanged, and codemirror-loader.mjs importing codemirror.js once and building window.CM (EditorView, basicSetup, yaml, json, darkHighlight with its inner try) with the colours unchanged and the codemirror-ready event; replace the long esm.sh comment of page.html with a short one about the assets; add assetAddress to names.json (node scripts/check-editor.mjs --write-names); write remote-import.test.js (DEC-9a, each shape proved on strings first) and asset-address.test.js (no meta, empty content, a valid one against document.baseURI, and loadElk() returning null with no address); run editor:build.'
      context:
        prd_excerpts:
          - 'none: there is no PRD (profile TDD+pln); the R-n of the TDD are listed with the TDD items'
        tdd_excerpts:
          - 'R-2'
          - 'R-5'
          - 'R-9'
          - 'R-12'
          - 'TG-1'
          - 'TG-4'
          - 'CON-1'
          - 'CON-3'
          - 'CON-8'
          - 'DEC-3'
          - 'DEC-4'
          - 'DEC-9'
          - 'CTR-1'
          - 'CTR-2'
          - 'IF-2'
          - 'IF-3'
          - 'IF-5'
          - 'FLOW-2'
          - 'IMP-4'
          - 'IMP-9'
          - 'ASM-4'
      likely_files:
        - 'src/main/editor/model/kernel-bridge.js'
        - 'src/main/editor/codemirror-loader.mjs'
        - 'src/main/editor/page.html'
        - 'src/main/editor/names.json'
        - 'src/main/resources/editor-webapp/standalone.html'
        - 'src/test/javascript/editor-build/remote-import.test.js'
        - 'src/test/javascript/viewpoint-kernel/asset-address.test.js'
        - 'src/test/javascript/viewpoint-kernel/harness.js'
      acceptance_criteria:
        - 'neither src/main/editor nor standalone.html has an import( of an http(s) address, nor from followed by an http(s) string, nor a script tag with an http src (the grep of gate 1 prints nothing and remote-import.test.js passes)'
        - 'a missing, empty or unreadable <meta> gives a null address and the fallbacks of today (window.CM undefined and a console warning for CodeMirror, loadElk() null for ELK), never a thrown error or a blank page'
        - 'window.CM keeps its keys EditorView, basicSetup, yaml, json and darkHighlight, and the codemirror-ready event still fires after a successful import'
        - 'no upward pair is added: node scripts/check-editor.mjs --layers exits 0 and ratchet.max in layers.json is unchanged'
        - 'scripts/editor-coverage-floor.json is not edited and no floor goes down'
        - 'the 3519 tests that pass on the starting repository still pass'
      verification:
        - 'node --test src/test/javascript/editor-build/remote-import.test.js src/test/javascript/viewpoint-kernel/asset-address.test.js'
        - 'npm run editor:build && npm run editor:check'
        - '! grep -rnE "import\(.https?:" src/main/editor src/main/resources/editor-webapp --include=*.js --include=*.mjs --include=*.html'
        - 'npm run test:unit'
        - 'npm run format:check'
        - 'npm run lint'
      escalation_triggers:
        - 'a loader needs a new name outside names.json or a new upward pair: stop and log it (the editor layers are not changed by this run)'
        - 'the unit harness needs more than a null-tolerant querySelector: stop and log it, do not rewrite the harness'
        - 'an existing test of the loaders fails for a reason other than the address: fix the loader, never the old test'
      suggested_subagent_type: 'general-purpose'
      suggested_model: '(default)'
      suggested_effort: 'medium'
    - task_id: task-003
      agent_role: 'Backend Implementation Agent'
      objective: 'Add the context /assets/ and the table ASSETS (record Asset(resource, contentType); codemirror.js and elk.js only, text/javascript; charset=utf-8) to EditorHttpServer as DEC-5 says, merging handleSample and the new handler into one private method over a lookup name to resource and type with the order Host check 403, unknown name 404, non-GET 405, no token header and no session cookie 403 (the token in the query is not accepted), resource missing 500, then 200 with Cache-Control no-store and nosniff; the request never builds a path. Add the route to the Javadoc. Write the EditorHttpServerTest cases of the Observability section (bytes equal to the committed files, type, nosniff, header and cookie, no proof or wrong or empty or query token 403, host not allowed 403, non-GET 405, the 404 names of CTR-3, unknown name before token 404) and the EditorServeIT cases (200 for both with the token read from the printed address, 403 without, 404 for another name). The .wasm entry and application/wasm are W-3 (DEC-7): do not add them.'
      context:
        prd_excerpts:
          - 'none: there is no PRD (profile TDD+pln); the R-n of the TDD are listed with the TDD items'
        tdd_excerpts:
          - 'R-6'
          - 'R-12'
          - 'TG-3'
          - 'CON-2'
          - 'CON-7'
          - 'CON-9'
          - 'DEC-5'
          - 'DEC-7'
          - 'CTR-3'
          - 'IF-4'
          - 'FLOW-2'
          - 'IMP-6'
          - 'ASM-5'
          - 'RISK-4'
      likely_files:
        - 'src/main/java/io/morin/archicode/cli/EditorHttpServer.java'
        - 'src/test/java/io/morin/archicode/cli/EditorHttpServerTest.java'
        - 'src/test/java/io/morin/archicode/it/EditorServeIT.java'
      acceptance_criteria:
        - 'GET /assets/codemirror.js and /assets/elk.js with the token header or the session cookie answer 200 with text/javascript; charset=utf-8, Cache-Control no-store, X-Content-Type-Options nosniff and the bytes of the committed file; the ?v= query is ignored'
        - '/assets, /assets/, /assets/elk.js/, /assets/ELK.js, /assets/../standalone.html and any name outside the table answer 404 even with the right token; a request with no proof, a wrong or empty token or only the token in the query answers 403; a Host that is not allowed answers 403; a non-GET answers 405'
        - 'the existing sample tests of EditorHttpServerTest pass unedited, and ASSETS has exactly two entries with no .wasm and no application/wasm'
        - 'no // NOPMD and no @SuppressWarnings("PMD...") is added, the native reflect-config is not touched, and the Java coverage floors of the pom still hold'
      verification:
        - 'JAVA_HOME=$HOME/.sdkman/candidates/java/25.0.4-tem ./mvnw test -Dtest=EditorHttpServerTest'
        - 'JAVA_HOME=$HOME/.sdkman/candidates/java/25.0.4-tem ./mvnw verify -DskipITs=false -Dit.test=EditorServeIT -Dtest=NoSuchTest -Dsurefire.failIfNoSpecifiedTests=false'
        - 'JAVA_HOME=$HOME/.sdkman/candidates/java/25.0.4-tem ./mvnw test-compile pmd:check'
      escalation_triggers:
        - 'the served page or the samples route changes behaviour for an existing test: stop and log it, the samples are unchanged'
        - 'the 500 for a missing resource cannot be tested without a classpath trick: cover it with a unit test of the lookup, never with a suppression'
      suggested_subagent_type: 'general-purpose'
      suggested_model: '(default)'
      suggested_effort: 'medium'
    - task_id: task-004
      agent_role: 'Infrastructure Agent'
      objective: 'Edit by anchors, on top of the lines that run 0226 (W-1) left uncommitted in ci-build.yaml and .github/CLAUDE.md (the step "Check the manual has its diagrams" and the sentence about PlantUML must stay): in the step "Assemble website" add mkdir -p target/site/editor/assets, cp -r of src/main/resources/editor-webapp/assets/. into it, and a loop over the SOURCE folder that does test -f and cmp for each file of the folder (so a file added later is compared too), keeping set -euo pipefail. In scripts/changes.mjs add R-07a before R-07 for src/main/resources/editor-webapp/assets/** running java, page and e2e (not kernel; rationale: the Kernel job reads the .wasm and the page kernel block, which an asset does not touch), and rows in the EXAMPLES of changes-map.test.js for an asset path (java, page, e2e) and for src/main/editor/bundles/x.mjs (all four). Add to .github/CLAUDE.md what the step now copies and that W-3 revisits R-07a when the .wasm joins the folder. Do not touch pom.xml.'
      context:
        prd_excerpts:
          - 'none: there is no PRD (profile TDD+pln); the R-n of the TDD are listed with the TDD items'
        tdd_excerpts:
          - 'R-7'
          - 'R-8'
          - 'R-12'
          - 'TG-5'
          - 'CON-6'
          - 'DEC-6'
          - 'CTR-4'
          - 'FLOW-3'
          - 'FLOW-4'
          - 'IMP-7'
          - 'RISK-3'
      likely_files:
        - '.github/workflows/ci-build.yaml'
        - 'scripts/changes.mjs'
        - 'src/test/javascript/changes-map.test.js'
        - '.github/CLAUDE.md'
      acceptance_criteria:
        - 'the step "Assemble website" holds a copy of the assets folder into target/site/editor/assets, and a test -f and a cmp for every file of the source folder, in a loop over the source folder'
        - 'the lines of W-1 are intact: the step "Check the manual has its diagrams" with the text Failed to generate image is still in ci-build.yaml'
        - 'the run block of the step, extracted from the YAML, passes bash -n and every command of the editor part is run once in a scratch copy of the tree, outside the repository, with GITHUB_REF_NAME=archicode-0.0.0-rehearsal (the full rehearsal with a browser is task-006)'
        - 'changes-map.test.js passes with the new rows, R-07a precedes R-07, and R-16 and R-06 are unchanged'
        - 'the pull request cannot prove this step: the log of the task says so in one line'
      verification:
        - 'node --test src/test/javascript/changes-map.test.js'
        - 'python3 -c "import yaml; yaml.safe_load(open(''.github/workflows/ci-build.yaml''))"'
        - 'test "$(grep -c "Failed to generate image" .github/workflows/ci-build.yaml)" -ge 1'
        - 'test "$(grep -c "editor/assets" .github/workflows/ci-build.yaml)" -ge 1'
        - 'npm run format:check'
      escalation_triggers:
        - 'the cp or the cmp would fail on a file the folder legitimately holds (the notice file has no reader but must be copied): stop and log it'
        - 'an edit would drop a line of W-1 in ci-build.yaml or .github/CLAUDE.md: edit by anchors and diff before and after'
        - 'the step is changed beyond the editor assets (the stamp, the presentation page, the manual): stop and log it'
      suggested_subagent_type: 'general-purpose'
      suggested_model: '(default)'
      suggested_effort: 'high'
    - task_id: task-005
      agent_role: 'Test Generation Agent'
      objective: 'Add HOSTED_ROUTES entries to harness.js for /editor/assets/NAME for each file of src/main/resources/editor-webapp/assets (read at request, with the right type), so the hosted-style page loads them at the website layout, and write editor-offline.spec.js as the Observability section describes: every URL whose host is not 127.0.0.1 is route-aborted and recorded; (a) on a served example, draw a view (g.dg-node exists only when ELK laid it out), open a file in the raw YAML view (#file-edit-codemirror-host holds a .cm-editor), type, save and read the file back from the disk of the copy; (b) on the hosted-style page open the sample, draw a diagram, mount CodeMirror; assert the list of blocked requests is empty. Package the application first. Show the spec is not vacuous: on a copy of target/quarkus-app (ARCHICODE_E2E_JAR) whose elk.js or codemirror.js is broken the spec fails; write the command and the failure in the prg.'
      context:
        prd_excerpts:
          - 'none: there is no PRD (profile TDD+pln); the R-n of the TDD are listed with the TDD items'
        tdd_excerpts:
          - 'R-10'
          - 'R-12'
          - 'TG-1'
          - 'TG-4'
          - 'CON-3'
          - 'IF-2'
          - 'IF-3'
          - 'IF-4'
          - 'FLOW-2'
          - 'FLOW-3'
          - 'IMP-8'
          - 'ASM-3'
          - 'ASM-4'
          - 'ASM-5'
          - 'RISK-7'
      likely_files:
        - 'src/test/e2e/editor-offline.spec.js'
        - 'src/test/e2e/harness.js'
      acceptance_criteria:
        - 'the spec runs on chromium and on firefox and exits 0 on each; webkit is not added to the testMatch of playwright.config.js, which is not edited'
        - 'the spec records every request to a host other than 127.0.0.1 and asserts the list is empty, so a build that still imports from a remote host fails it'
        - 'the fixture rule that fails a test on a console error is kept: a blocked request that was attempted would fail the test'
        - 'the spec fails on a copy of the packaged application whose elk.js is broken and on one whose codemirror.js is broken (non-vacuity, recorded in the prg of the run)'
        - 'the other hosted specs still pass with the new routes (hosted-acceptance.spec.js on chromium)'
      verification:
        - 'JAVA_HOME=$HOME/.sdkman/candidates/java/25.0.4-tem ./mvnw package -Dmaven.test.skip -Dplugin.asciidoctor.skip=true'
        - 'npx playwright test src/test/e2e/editor-offline.spec.js --project=chromium'
        - 'npx playwright test src/test/e2e/editor-offline.spec.js --project=firefox'
        - 'npx playwright test src/test/e2e/hosted-acceptance.spec.js --project=chromium'
        - 'npm run format:check'
        - 'npm run lint'
      escalation_triggers:
        - 'ELK or CodeMirror does not load in a real browser although node and Java tests pass (ASM-3, RISK-7): stop and log it with the console output, do not weaken the spec'
        - 'a browser project is not installed (npx playwright install chromium firefox needed): record it and stop, it is an environment gap, not a pass'
        - 'the spec is flaky: drop the flow with its reason, never add a retry (src/test/CLAUDE.md)'
      suggested_subagent_type: 'general-purpose'
      suggested_model: '(default)'
      suggested_effort: 'high'
    - task_id: task-006
      agent_role: 'QA Agent'
      objective: 'Do the three measurements of the TDD in a scratch folder outside the repository and record them in the Findings of the prg of the run (R-13 has this task as its owner). (1) FLOW-4: copy src/site, src/main/resources/editor-webapp and a stub target/generated-docs/index.html, extract the run block of "Assemble website" from the YAML, run it with GITHUB_REF_NAME=archicode-0.0.0-rehearsal, serve target/site with a static server on 127.0.0.1, open /editor/ in Chromium with external hosts blocked, and check that a g.dg-node draws and .cm-editor mounts; say that the real step stays unproved until a tag. (2) Q-2 again: open a copy of the page with the assets folder beside it from file:// in Chromium, Firefox and WebKit and compare with the TDD (Firefox loads, Chromium and WebKit refuse); state any difference, because task-007 writes the manual sentence from it. (3) Sizes (raw and gzip) of codemirror.js, elk.js and standalone.html against 2,736,458 bytes for the page before, and the median of five loads per engine of the first g.dg-node and of window.CM with the method of Q-3 (hosted-style server, the Brightcart sample address, a new context per load), next to the before figures of the TDD. Nothing in the repository changes except the prg.'
      context:
        prd_excerpts:
          - 'none: there is no PRD (profile TDD+pln); the R-n of the TDD are listed with the TDD items'
        tdd_excerpts:
          - 'R-8'
          - 'R-13'
          - 'TG-5'
          - 'ASM-1'
          - 'ASM-4'
          - 'IF-5'
          - 'FLOW-4'
          - 'RISK-3'
          - 'RISK-5'
          - 'Q-2'
          - 'Q-3'
      likely_files:
        - 'docs/wav/wav-034-diagrams-assets-likec4-matrix-page/run/run-0227-editor-assets-beside-the-page/prg-0227-editor-assets-beside-the-page.md'
      acceptance_criteria:
        - 'the Findings of the prg hold a "Rehearsal of Assemble website" entry with the commands, the exit codes and the result of the browser check, and the sentence that the real step is unproved until a tag run'
        - 'the Findings hold a "file:// on the real assets" entry with one line per engine and a line saying whether it differs from Q-2 of the TDD'
        - 'the Findings hold the raw and gzip sizes of the three files and, per engine, the five values and the median of each of the two times, next to the before figures of the TDD'
        - 'git status --short shows no change outside the prg of the run and the files of earlier tasks'
      verification:
        - 'grep -c "Rehearsal of Assemble website" docs/wav/wav-034-diagrams-assets-likec4-matrix-page/run/run-0227-editor-assets-beside-the-page/prg-0227-editor-assets-beside-the-page.md'
        - 'grep -c "file:// on the real assets" docs/wav/wav-034-diagrams-assets-likec4-matrix-page/run/run-0227-editor-assets-beside-the-page/prg-0227-editor-assets-beside-the-page.md'
        - 'grep -ci "median" docs/wav/wav-034-diagrams-assets-likec4-matrix-page/run/run-0227-editor-assets-beside-the-page/prg-0227-editor-assets-beside-the-page.md'
      escalation_triggers:
        - 'the rehearsal shows an asset missing from target/site: fix task-004 there, never patch the rehearsal'
        - 'the network is not available for a measurement: record the before figures only and say the after is not taken'
        - 'the file:// result differs from Q-2: report it; the manual sentence follows the measurement'
      suggested_subagent_type: 'general-purpose'
      suggested_model: '(default)'
      suggested_effort: 'medium'
    - task_id: task-007
      agent_role: 'Documentation Agent'
      objective: 'State what is true now, with no history (the CLAUDE.md rule). Manual (line near 1881, and where the page is called a single file): the editor loads CodeMirror and the layout from files served beside the page, with no network, and say from the result of task-006 what happens from a saved copy opened from file:// (Firefox loads the folder beside the page; Chromium and Safari show the textarea and the plain list). README.md (lines 87 and 123 to 126): the page is generated and a folder of assets sits beside it. CLAUDE.md and src/main/editor/CLAUDE.md: the page and the assets folder are generated by editor:build, which needs npm ci (no longer "no npm install"), the loader and the @assets and @wasm lists. src/test/CLAUDE.md: the spec editor-offline.spec.js, the hosted routes of the assets, the guard tests. embed.sh: its comment about no npm install. Model: add archicode.contracts.couplings.editor_assets (tags.path src/main/resources/editor-webapp/assets, src/main/editor/bundles) with archicode.commandline.commands.editor_serve --serves--> it and archicode.editor.page --reads--> it, and the five couplings become six in the container and in view.contracts.yaml; then npm run sample:build.'
      context:
        prd_excerpts:
          - 'none: there is no PRD (profile TDD+pln); the R-n of the TDD are listed with the TDD items'
        tdd_excerpts:
          - 'R-11'
          - 'R-12'
          - 'CON-1'
          - 'CON-7'
          - 'IF-5'
          - 'IMP-10'
          - 'CI-arc-1'
          - 'RISK-5'
          - 'Q-2'
      likely_files:
        - 'src/doc/README.adoc'
        - 'README.md'
        - 'CLAUDE.md'
        - 'src/main/editor/CLAUDE.md'
        - 'src/test/CLAUDE.md'
        - 'src/main/rust/viewpoint-kernel/embed.sh'
        - 'docs/architecture/manifests/archicode.yaml'
        - 'docs/architecture/manifests/views/view.contracts.yaml'
        - 'src/test/javascript/architecture/impact-questions.json'
        - 'src/main/resources/editor-webapp/samples/archicode.yaml'
      acceptance_criteria:
        - 'no sentence of the manual, README.md or a CLAUDE.md says that the editor loads from a CDN or esm.sh, that the page is a single file with nothing beside it, or that editor:build needs no npm install; no CLAUDE.md names a wave, a run or a date'
        - 'the manual sentence on file:// matches the measurement of task-006'
        - 'the component editor_assets exists with its two edges, every tags.path exists, and the five couplings read six where the container and the saved view count them'
        - 'npm run sample:build leaves the bundle current: npm run sample:check exits 0 and a second npm run sample:build changes nothing'
        - 'the manual keeps its voice and anchors: the tests manual-skeleton, manual-voice, manual-howto and the anchors file pass'
      verification:
        - 'JAVA_HOME=$HOME/.sdkman/candidates/java/25.0.4-tem ./mvnw test -Dtest=ArchitectureDriftTest,ArchitectureImpactTest,ArchitectureModelTest'
        - 'npm run sample:build && npm run sample:check'
        - 'node --test src/test/javascript/manual-skeleton.test.js src/test/javascript/manual-voice.test.js src/test/javascript/manual-howto.test.js src/test/javascript/architecture-model.test.js'
        - '! grep -rn "esm.sh" README.md CLAUDE.md src/doc/README.adoc src/main/editor/CLAUDE.md src/test/CLAUDE.md src/main/rust/viewpoint-kernel/embed.sh src/main/editor/page.html'
        - 'npm run format:check'
      escalation_triggers:
        - 'a modeled editor layer or a tags.path would no longer match layers.json: stop and log it, the model change is a coupling and not a layer'
        - 'the manual test of voice or anchors fails on a sentence this task did not write: record it and do not fix it'
        - 'a sentence outside the listed files says how the page is built or loaded: add it to the log and fix it only if it is the same fact'
      suggested_subagent_type: 'general-purpose'
      suggested_model: '(default)'
      suggested_effort: 'medium'
    - task_id: task-008
      agent_role: 'QA Agent'
      objective: 'Run the gates of the wave that belong to this run from the repository root with Java 25 and record each command and exit code in the prg: the gate-1 grep over the whole scope of the wave, esbuild in package.json and the lock, npm ci, the assets folder holding codemirror.js and elk.js (the .wasm half of gates 3 and 5 is W-3, DEC-7), editor:check, the Java and integration tests, the 200/403/404 answers of editor serve on a free port, the e2e spec on both engines, the website step, test:unit, test:coverage, format:check, lint, byte-identity, ratchet.max and the unchanged tree after editor:build and sample:build. Say what is not proved: the real Assemble website step (a tag run), macOS and Windows determinism, the native image, Safari. Fix nothing that is red outside this run: record it.'
      context:
        prd_excerpts:
          - 'none: there is no PRD (profile TDD+pln); the R-n of the TDD are listed with the TDD items'
        tdd_excerpts:
          - 'R-1'
          - 'R-2'
          - 'R-3'
          - 'R-4'
          - 'R-6'
          - 'R-8'
          - 'R-10'
          - 'R-12'
          - 'R-13'
          - 'CON-4'
          - 'CON-7'
          - 'DEC-7'
          - 'RISK-1'
          - 'RISK-2'
          - 'RISK-3'
          - 'Observability and Verification'
      likely_files:
        - 'docs/wav/wav-034-diagrams-assets-likec4-matrix-page/run/run-0227-editor-assets-beside-the-page/prg-0227-editor-assets-beside-the-page.md'
      acceptance_criteria:
        - 'every command of the verification below exits 0, or the prg names it, its exit code and why it is outside this run'
        - 'scripts/byte-identity-exceptions.txt, scripts/byte-identity-new-files.txt and scripts/byte-identity-stdout-changes.txt are unchanged and byte-identity needs no new exception'
        - 'npm run editor:build and npm run sample:build leave git status --short as it was before they ran'
        - 'the prg lists as unproved: the real website step until a tag run, macOS and Windows, the native image, the real Safari, and the .wasm halves of gates 3 and 5 (W-3)'
      verification:
        - '! grep -rnE "import\(.https?:" src/main/editor src/main/resources/editor-webapp --include=*.js --include=*.mjs --include=*.html'
        - 'npm ci'
        - 'npm run editor:check'
        - 'JAVA_HOME=$HOME/.sdkman/candidates/java/25.0.4-tem ./mvnw verify -DskipITs=false'
        - 'JAVA_HOME=$HOME/.sdkman/candidates/java/25.0.4-tem ./mvnw test-compile pmd:check'
        - 'npx playwright test src/test/e2e/editor-offline.spec.js --project=chromium'
        - 'npx playwright test src/test/e2e/editor-offline.spec.js --project=firefox'
        - 'npm run test:unit'
        - 'npm run test:coverage'
        - 'npm run format:check'
        - 'npm run lint'
        - 'scripts/byte-identity.sh'
        - 'node -e "process.exit(require(''./src/main/editor/layers.json'').ratchet.max <= 99 ? 0 : 1)"'
        - 'git diff --stat -- scripts/byte-identity-exceptions.txt scripts/byte-identity-new-files.txt scripts/byte-identity-stdout-changes.txt src/main/rust src/main/wasm'
      escalation_triggers:
        - 'byte-identity needs a new exception or an existing command changes its output: stop and log it (CON-4)'
        - 'a command fails for a reason outside this run (a base already red): record it, do not fix it'
        - 'the Java coverage floor or an editor coverage floor goes down: stop and log it, do not lower a floor'
      suggested_subagent_type: 'general-purpose'
      suggested_model: '(default)'
      suggested_effort: 'high'
```

## 10. Verification Plan

```yaml
verification_plan:
  checks:
    - task_id: task-001
      methods:
        - 'unit tests'
        - 'build twice and compare'
        - 'editor:check'
        - 'format check'
      success_criteria:
        - 'the two bundles and the notice file exist, are identical on a second build, and editor:check exits 0'
        - 'the unit tests of the build and of the lock layout pass'
    - task_id: task-002
      methods:
        - 'unit tests'
        - 'whole node suite'
        - 'grep of gate 1'
        - 'editor:check'
        - 'format check'
        - 'lint'
      success_criteria:
        - 'no remote import is left in the sources or the page'
        - 'the whole node suite passes and no coverage floor goes down'
    - task_id: task-003
      methods:
        - 'unit tests'
        - 'integration test on the packaged jar'
        - 'PMD'
      success_criteria:
        - 'both assets answer 200 with the right type and headers, every other case answers as CTR-3 says'
        - 'the sample tests pass unedited and PMD is green'
    - task_id: task-004
      methods:
        - 'unit tests'
        - 'YAML parse'
        - 'bash syntax check of the extracted block'
        - 'run of the editor commands in a scratch copy'
        - 'review after'
      success_criteria:
        - 'the step copies and compares the assets folder and the lines of run 0226 are intact'
        - 'the change map has R-07a before R-07 and its test passes'
    - task_id: task-005
      methods:
        - 'end-to-end tests on two engines'
        - 'non-vacuity run on a broken jar'
        - 'format check'
        - 'lint'
      success_criteria:
        - 'the spec passes on chromium and firefox with external hosts blocked'
        - 'the spec fails when a bundle of the jar is broken'
    - task_id: task-006
      methods:
        - 'rehearsal in a scratch folder'
        - 'browser check'
        - 'measurement with the method of the TDD'
      success_criteria:
        - 'the prg holds the rehearsal, the file:// result, the sizes and the medians'
        - 'nothing else in the repository changed'
    - task_id: task-007
      methods:
        - 'drift and impact tests'
        - 'sample check'
        - 'manual tests'
        - 'grep for stale sentences'
      success_criteria:
        - 'the model, the sample and the manual tests are green'
        - 'no stale sentence about a CDN, a single file or no npm install remains'
    - task_id: task-008
      methods:
        - 'whole suites'
        - 'byte identity'
        - 'clean rebuild'
        - 'review after'
      success_criteria:
        - 'every gate command exits 0 or is named in the prg with its reason'
        - 'the unproved list is complete'
```

## 11. Escalation Rules

```yaml
escalation_rules:
  rules:
    - condition: 'An assumption of the TDD is false in a way that changes a decision (ASM-1 bytes differ between two builds, ASM-3 ELK does not bundle, ASM-5 the cookie does not reach a module import)'
      action: 'Stop the task, log it in the prg and let the main agent amend the TDD; never change the check to make it pass'
    - condition: 'The change needs a line under src/main/rust, src/main/wasm, or the .wasm entry of the server table'
      action: 'Stop and log: the kernel beside the page is W-3 (DEC-7, CON-7)'
    - condition: 'An edit would drop a line of run 0226 in ci-build.yaml or .github/CLAUDE.md, or needs a change to pom.xml'
      action: 'Edit by anchors and diff before and after; a pom.xml change is stopped and logged'
    - condition: 'byte-identity.sh needs a new exception or an existing command changes its output'
      action: 'Stop and log: this run must not change a command line output (CON-4)'
    - condition: 'A command fails for a reason outside this run (a base already red, a browser not installed, no network)'
      action: 'Record it in the task and do not fix it; a missing browser or network is an environment gap and not a pass'
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
  autonomous_tasks: 6
  review_before_tasks: 0
  review_after_tasks: 2
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
    - task-004
    - task-001
    - task-005
  lowest_confidence_tasks:
    - task-004
    - task-005
    - task-001
  next_action: 'Start task-001: pin the dependencies, write the bundle entries and extend scripts/build-editor.mjs to build, write and check the two assets and the notice file'
  criteria:
    - 'The editor draws a diagram and edits YAML in CodeMirror with every host but 127.0.0.1 blocked, and the committed assets are what the pinned inputs build'
    - 'editor serve and the website step publish the same two names, the step is rehearsed, and the hand-off says the real step is unproved until a tag run'
    - 'No output of an existing command changes and the gates of phase P2 that belong to this run hold'
```
