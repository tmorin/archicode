---
title: Execution Plan — Editor page built by Maven
status: done
date: 2026-11-07
related:
  - docs/wav/wav-035-maven-builds-kernel-and-page-likec4-import/run/run-0232-editor-page-built-by-maven/tdd-0232-editor-page-built-by-maven.md
  - docs/wav/wav-035-maven-builds-kernel-and-page-likec4-import/wav-035-maven-builds-kernel-and-page-likec4-import.md
  - docs/wav/wav-035-maven-builds-kernel-and-page-likec4-import/wbc-035-maven-builds-kernel-and-page-likec4-import.md
  - 'gh:tmorin/archicode#207'
type: pln
run: 0232
wave: 035
---

# Execution Plan: Editor page built by Maven

Profile TDD+pln: there is no PRD, so REQ-1 to REQ-7 are the IDs the TDD labels (section "PRD Traceability"), taken from the seven gate criteria of phase P2 of wave 035, the manifest row W-2 and issue #207. The TDD is the design (DEC-1 to DEC-10, IMP-1 to IMP-14, CTR-1 to CTR-4, IF-1 to IF-5, FLOW-1 to FLOW-4). The plan commits nothing: the commit is a human step outside it. One task stages a deletion (`git rm` of the seven generated files, recoverable from HEAD); no task commits, pushes or dispatches a workflow.

Autonomy: the wave runs with no autonomy override (its progress log says "autonomy override: none"), so no task is `human_required` and none has `risk: critical`; a task so flagged would stop the implement workflow with `awaiting-human`, which is why none was written. The wave declares W-2 `hard_judgment` (it changes the files the live hosted editor serves and what the jar holds, and the website step is proved only by a tag run): the two tasks that carry that risk, task-005 (the pom) and task-007 (the workflow and the job map), are `hard_judgment` with `risk: high` and `review_after`, so their verifier runs at the elevated pair of the cost profile; the other eight are `standard`. No task needs a stop: the reviews are the independent verification of each task and the author's reading of the pull request. A future reader should not look for a stop.

Starting repository, checked while drafting: commit `7742b07` and the tag `archicode-0.25.0` exist; seven files are tracked under `src/main/resources/editor-webapp/` (`standalone.html`, `assets/codemirror.js`, `assets/elk.js`, `assets/viewpoint_kernel.js`, `assets/THIRD-PARTY-NOTICES.txt`, `samples/brightcart.yaml`, `samples/archicode.yaml`; the `.wasm` left git in run 0231, whose changes are still uncommitted in the working tree, among them the antrun block `kernel` of `pom.xml`, the Rust cache steps of `ci-build.yaml` and `package.json` with `kernel:build`); the committed page has the 1679514 bytes of `git show 7742b07:...`; 61 files of `src/test/javascript` name `editor-webapp` (53 under `viewpoint-kernel/`, 5 under `editor-build/`, 3 at the top), 3 files of `src/test/e2e` and 5 Java test classes read a file; the workflow has one file, with the jobs `Changes`, `Java`, `Page`, `Kernel`, `E2E`, `Build`, `Targets`, `Native`, `Release`, `Smoke` and `Publish`, of which `Java`, `E2E`, `Build` and `Native` run `./mvnw`, `Page` and `E2E` already have `actions/setup-node@v4` (22, npm cache), and `Kernel` runs cargo only; `.gitignore` ignores `target/` and `node_modules` but not the old folder; JDK 25 is `$HOME/.sdkman/candidates/java/25.0.4-tem` (the shell Java is 21, so every Maven command is prefixed `JAVA_HOME=...`); `target/` exists from earlier builds. No suite was run while drafting; the whole suites run once at Stage 11, not in a task. Do not run Maven while `npm run editor:build` runs, and the reverse: both write `target/editor-webapp`, and `npm ci` of the pom deletes `node_modules` (DEC-3, RISK-7).

Resolutions of the Stage 5 review of the TDD (its S2 and S1 findings; the TDD text was not edited, so the tasks carry them and the plan holds either way):
- F1, the word in the documents: DEC-9 asks the documents to say "no file is committed", which the grep of REQ-6 finds (any line with `committed` and `standalone`, `assets`, `wasm`, `bundle`, `sample` or `page`). task-009 words it "built", "made by the build", "not in git", and the check is that grep over the three files of the gate plus a like grep over the other four documents.
- F2, a revision with no page: the TDD keeps a path that reads a page from the revision in `--check-identical` and `--statements` and says "both paths are kept". It cannot work with the new script (an old worktree has no `target/editor-webapp`, and a page assembled with placeholder hashes cannot be compared with one with real hashes). task-001 and task-003 always read `src/main/editor` of the revision with `git archive`, assemble it non-strict and compare the two assemblies, with no branch that reads a page from a revision, for the commits before this run as for those after it.
- F3, the job map: `editor-files.js` (new, imported by `harness.js`) falls under R-18 and would reach `Page` only, though the build runs `harness.js` and `harness.js` imports it. task-007 sends both files to Java, Page and E2E.
- F4, the Node step of `Build`: DEC-7 says the step runs before the deploy steps and IMP-12 gives it `if: env.PUBLISHES == 'true'`, but "Assemble website" and the new `process-resources` step run on any tag, so the step has no `if`. The `npm ci` step of `E2E` before Maven is not redundant (the Playwright version and the browsers use `node_modules`) and stays.
- F5, offline builds: `scripts/byte-identity.sh` builds the head with `./mvnw -o package` and a tag checkout in a folder outside the repository, and `release:perform` builds in `target/checkout`; `npm ci` is not offline, so each needs the npm cache or the network. task-010 lists this in the unproved part of the hand-off (ASM-6); no script is changed by this run (CON-4).
- F6, `src/test/CLAUDE.md` and `.github/CLAUDE.md`: neither holds a line that the grep of REQ-6 finds, and the TDD says both name the sample check and the folder; `src/test/CLAUDE.md` names only `standalone.html` (about line 32), `.github/CLAUDE.md` names the step "Assemble website", the rule R-07a, the sample step and the editor step of `Page`. task-009 reads both and rewrites each sentence that stops being true after task-007 and task-008.
- F7, `editor:check`: `--check` no longer reads the kernel, so `editor:check` drops `kernel:build` (task-002).
- F8, the baseline of gate 3 for `archicode.yaml`: the commit that closes run 0231 does not exist; the retag of `kernel_wasm` is 2 removed and 2 added lines, and the sample also changes by the model edit of task-008. task-010 compares with `7742b07` and lists the differing lines with their cause.
- F9, the environment property: each antrun execution has its own target, so the `page` execution declares `<property environment="env"/>` again (task-005); and PMD does read the page build through `generate-resources` when it runs with `test-compile`, so the sentence of CTR-4 that PMD does not need the page is not carried into any document.
- F10, history reads: the four tests of older tags and `check-editor.test.js` (a fixed commit) keep the old path as a string in `git show <rev>:...`, because a revision holds its page at that path; no second constant is added (task-001, task-003, task-004).

Order of the work: task-001 (`build-editor.mjs`) is the root: every other task calls it. task-002 (samples, helper, npm scripts) and task-003 (checks of the sources) then touch disjoint paths. task-004 (the node readers) waits for both so that the helper and the scripts exist. task-005 (the pom) waits for the readers, so that nothing reads the old folder when it is excluded from the jar. task-006 (Java and e2e readers, which need the folder Maven builds) and task-007 (the workflow and the job map, which run no build) run side by side. task-008 removes the files from git and edits the model once every reader has moved. task-009 writes the sentences from what the tasks did, and task-010 proves gates 1, 2, 3, 5 and 6 on a clean build and records what only a tag run proves.

## 1. Executive Summary

```yaml
summary:
  status: 'done'
  product_goal: 'No generated file of the editor is in git: ./mvnw runs npm ci and the two scripts and builds the page, the bundles, the kernel script and the samples into target/editor-webapp, the jar and the website take them from there at their old paths, every reader reads that folder, and the bytes, the page opened from a disk and every command line output stay what they were'
  technical_approach: 'A second maven-antrun-plugin execution (page, generate-resources) checks node and npm with one error line and runs npm ci, build-editor.mjs and build-sample.mjs; the scripts write the old layout under target/editor-webapp with non-strict assembly for the source-only modes; one helper per language names the folder; the pom adds the folder as a resource and excludes the old one; CI gets Node in the jobs that run Maven and assembles the website from the folder; the seven files leave git; the model and eight documents say what is built'
  total_tasks: 10
  parallel_groups: 2
  high_risk_tasks: 2
  human_review_gates: 1
  autonomy_level: 'medium'
  recommendation: 'proceed_with_review'
  criteria:
    - 'git ls-files src/main/resources/editor-webapp prints nothing and git ls-files | grep -c viewpoint_kernel prints 0'
    - 'from rm -rf target node_modules, ./mvnw package -Dmaven.test.skip -Dplugin.asciidoctor.skip=true exits 0 with Maven running npm ci, and the jar holds editor-webapp/standalone.html, assets/codemirror.js, assets/elk.js, assets/viewpoint_kernel.js, samples/brightcart.yaml and samples/archicode.yaml'
    - 'the built codemirror.js, elk.js, viewpoint_kernel.js and standalone.html are byte-identical to the files of commit 7742b07, as are THIRD-PARTY-NOTICES.txt and samples/brightcart.yaml, and archicode.yaml differs only by the lines run 0231 retagged and the model edit'
    - 'without node on the PATH the build fails with exactly one [ERROR] line that names Node.js and no stack trace'
    - 'the step Assemble website copies and compares from target/editor-webapp (the sed range names src/main/resources/editor-webapp 0 times), and each of Java, E2E, Build and Native has a Set up Node.js step before its first ./mvnw step'
    - 'the grep of REQ-6 over the three CLAUDE.md prints nothing and the manual says how to get the page'
    - 'the Stage 11 commands and the phase gate (npm run test:unit, test:coverage, format:check, lint, test-compile pmd:check, verify -DskipITs=false, the two Playwright projects on editor-offline.spec.js, byte-identity.sh with its exceptions file unchanged, ratchet.max at most 99, no lower number in editor-coverage-floor.json) exit 0'
    - 'the prg of the run lists what only a tag run proves (the arm and macOS native targets, the website step, a cold runner) and the figures of the clean build'
```

## 2. PRD/TDD Consistency Assessment

```yaml
consistency_assessment:
  aligned_items:
    - 'REQ-1 to REQ-7 each map to at least one DEC or IMP of the TDD and to a task below; the seven criteria of gate P2 are the acceptance criteria'
    - 'The split of the TDD (build-editor.mjs, samples and harness, checks of the sources, node readers, pom, Java and e2e readers, CI with the job map, removal with the model, documents) is the split of task-001 to task-009; task-010 proves the clean build'
    - 'No line of src/main/editor, the kernel Rust, embed.sh, EditorHttpServer or application.properties changes (Scope, Non-Goals), and the output of no command changes (CON-4)'
  gaps:
    - id: gap-001
      type: 'missing_requirement'
      description: 'There is no PRD: REQ-1 to REQ-7 are the seven criteria of gate P2 and the scope text of W-2 (traceability incomplete in the TDD)'
      impact: 'low'
      recommendation: 'The tasks cite the REQ-n of the TDD; the seven criteria are the acceptance criteria'
    - id: gap-002
      type: 'contradiction'
      description: 'Stage 5 findings not applied to the TDD text: DEC-5 keeps a path that reads a page from a revision (cannot work with the new script), DEC-9 asks the documents to say no file is committed (the REQ-6 grep finds that word), the job map misses editor-files.js, DEC-7 and IMP-12 disagree on the if of the Node step of Build, editor:check keeps kernel:build, the pom needs the environment property again, and the gate-3 baseline for archicode.yaml names a commit that does not exist'
      impact: 'medium'
      recommendation: 'The plan carries the resolutions F1 to F10 listed in its preamble; the TDD text is not edited and the plan holds either way; each resolution has an owning task and a check'
    - id: gap-003
      type: 'risk'
      description: 'The arm and macOS native targets, the website step and the cold-runner time are proved only by a tag run (RISK-1, ASM-5, Q-1)'
      impact: 'medium'
      recommendation: 'Q-1 is a tradeoff the author decides; task-010 writes the unproved list in the prg and no task starts a dispatch'
    - id: gap-004
      type: 'risk'
      description: 'Every ./mvnw now needs Node, npm, rustup and the network at the first run (CTR-4): a contributor who only works on Java needs them'
      impact: 'low'
      recommendation: 'The one-line message says how; task-009 states the rule in the CLAUDE.md files'
    - id: gap-005
      type: 'ambiguity'
      description: 'The command that proves the failure without node needs a PATH with only the tools the Maven wrapper uses, which the TDD does not list'
      impact: 'low'
      recommendation: 'task-005 and task-010 build the folder of symlinks from a list, run only the execution (antrun:run@page) and add a tool when the wrapper reports it missing, never node or npm'
    - id: gap-006
      type: 'ambiguity'
      description: 'The gate 3 baseline for samples/archicode.yaml, the commit that closes run 0231, does not exist (run 0231 is uncommitted) and the TDD counts two lines where the retag is two removed and two added'
      impact: 'low'
      recommendation: 'task-010 compares with 7742b07 and lists the differing lines with their cause (the retag of run 0231 and the model edit of task-008)'
  blocking_gaps: []
```

## 3. Execution Graph

```yaml
execution_graph:
  nodes:
    - id: task-001
      status: 'done'
      title: 'build-editor.mjs writes target/editor-webapp, assembles without assets for the structural modes, and --check means "the sources assemble"; its three test files'
      depends_on: []
      produces:
        - 'scripts/build-editor.mjs'
        - 'src/test/javascript/editor-build/build-editor.test.js'
        - 'src/test/javascript/editor-build/editor-assets.test.js and src/test/javascript/editor-build/yaml-parts.test.js'
      agent_role: 'Frontend Implementation Agent'
      autonomy: 'autonomous'
      risk: 'medium'
      confidence: 75
    - id: task-002
      status: 'done'
      title: 'The samples and the node harness read the folder: build-sample.mjs, the helper editor-files.js with its test, harness.js, and the npm scripts that build the whole folder'
      depends_on: [task-001]
      produces:
        - 'scripts/build-sample.mjs'
        - 'src/test/javascript/viewpoint-kernel/editor-files.js'
        - 'src/test/javascript/viewpoint-kernel/editor-files.test.js'
        - 'src/test/javascript/viewpoint-kernel/harness.js (HTML and KERNEL come from editor-files.js; the ARCHICODE_EDITOR_HTML override stays)'
        - 'src/test/javascript/viewpoint-kernel/build-sample-script.test.js'
        - 'package.json'
      agent_role: 'Frontend Implementation Agent'
      autonomy: 'autonomous'
      risk: 'medium'
      confidence: 75
    - id: task-003
      status: 'done'
      title: 'The checks of the sources read the sources: check-editor.mjs, the move check, the coverage script, the lint extraction and their tests'
      depends_on: [task-001]
      produces:
        - 'scripts/check-editor.mjs'
        - 'scripts/check-editor-moves.sh'
        - 'scripts/editor-coverage.mjs and scripts/extract-editor-script.mjs (HTML and the default html are target/editor-webapp/standalone.html)'
        - 'src/test/javascript/editor-build/check-editor.test.js, check-editor-statements.test.js, check-editor-layers.test.js and check-editor-moves.test.js'
      agent_role: 'Frontend Implementation Agent'
      autonomy: 'autonomous'
      risk: 'medium'
      confidence: 70
    - id: task-004
      status: 'done'
      title: 'The node readers use the helper: the files of src/test/javascript that name editor-webapp read the folder through editor-files.js, and plateau-matrix-page.test.js reads the tag archicode-0.25.0'
      depends_on: [task-002, task-003]
      produces:
        - 'every file of src/test/javascript outside editor-build/ and outside the files of task-001 to task-003 that builds the path src/main/resources/editor-webapp itself'
        - 'conformance.test.js'
        - 'plateau-matrix-page.test.js'
        - 'story-player-scene.test.js, save-keeps-the-brackets.test.js, save-keeps-quotes-and-comments.test.js and delete-plateau-as-released.test.js keep their git show <tag>:src/main/resources/editor-webapp/standalone.html'
      agent_role: 'Test Generation Agent'
      autonomy: 'autonomous'
      risk: 'medium'
      confidence: 65
    - id: task-005
      status: 'done'
      title: 'The pom: a second antrun execution builds the page and the samples at generate-resources, the jar and the classes take target/editor-webapp, and .gitignore names the old folder'
      depends_on: [task-004]
      produces:
        - 'pom.xml'
        - '.gitignore (the line /src/main/resources/editor-webapp/ with a comment saying the page is built into target/editor-webapp)'
      agent_role: 'Infrastructure Agent'
      autonomy: 'review_after'
      risk: 'high'
      confidence: 70
    - id: task-006
      status: 'done'
      title: 'The Java and end-to-end readers use the folder: EditorFiles.java and the five Java test classes, the e2e harness, hosted.js and the offline spec'
      depends_on: [task-005]
      produces:
        - 'src/test/java/io/morin/archicode/EditorFiles.java'
        - 'cli/EditorHttpServerTest.java'
        - 'src/test/e2e/harness.js'
      agent_role: 'Backend Implementation Agent'
      autonomy: 'autonomous'
      risk: 'medium'
      confidence: 70
    - id: task-007
      status: 'done'
      title: 'CI: Node in every job that runs Maven, the website assembled from target/editor-webapp, the sample step gone from Page, and the job map'
      depends_on: [task-005]
      produces:
        - '.github/workflows/ci-build.yaml'
        - 'scripts/changes.mjs'
        - 'src/test/javascript/changes-map.test.js'
      agent_role: 'Release Agent'
      autonomy: 'review_after'
      risk: 'high'
      confidence: 65
    - id: task-008
      status: 'done'
      title: 'The seven generated files leave git, .prettierignore loses the page, and the model of ArchiCode names the sources'
      depends_on: [task-006, task-007]
      produces:
        - 'the seven tracked files under src/main/resources/editor-webapp'
        - '.prettierignore'
        - 'docs/architecture/manifests/archicode.yaml'
      agent_role: 'Refactoring Agent'
      autonomy: 'review_after'
      risk: 'medium'
      confidence: 70
    - id: task-009
      status: 'done'
      title: 'The documents say what is built and where the page is: six CLAUDE.md and README files and the manual'
      depends_on: [task-008]
      produces:
        - 'CLAUDE.md'
        - 'src/main/editor/CLAUDE.md'
        - 'src/main/rust/viewpoint-kernel/CLAUDE.md, src/main/rust/viewpoint-kernel/README.md and README.md'
        - 'src/doc/README.adoc'
      agent_role: 'Documentation Agent'
      autonomy: 'autonomous'
      risk: 'low'
      confidence: 75
    - id: task-010
      status: 'done'
      title: 'Proof on a clean build: Maven, the jar, the bytes, the failure without Node, the repository grep, and the list of what only a tag run proves'
      depends_on: [task-009]
      produces:
        - 'a Findings paragraph in the prg of the run'
      agent_role: 'QA Agent'
      autonomy: 'autonomous'
      risk: 'medium'
      confidence: 65
  edges:
    - from: task-001
      to: task-002
      reason: 'build-sample.mjs and the harness read the page and the assets that the script of task-001 writes under target/editor-webapp, and call its assembly'
    - from: task-001
      to: task-003
      reason: 'check-editor.mjs imports assemble and mapOf from build-editor.mjs and relies on the non-strict form'
    - from: task-002
      to: task-004
      reason: 'the node readers import editor-files.js and need the npm scripts that build the folder'
    - from: task-003
      to: task-004
      reason: 'the node suite the readers belong to runs the checks, and the lint extraction reads the folder'
    - from: task-004
      to: task-005
      reason: 'no reader may read src/main/resources/editor-webapp when the pom starts to exclude it from the jar'
    - from: task-005
      to: task-006
      reason: 'the Java tests read target/editor-webapp, which only the pom execution writes under Maven'
    - from: task-005
      to: task-007
      reason: 'the process-resources step and the Node steps rely on the execution page of the pom'
    - from: task-006
      to: task-008
      reason: 'the Java and e2e readers must not read the old folder when its files leave git'
    - from: task-007
      to: task-008
      reason: 'the map and the workflow are made for the tree where the seven files are no longer tracked, and changes-map.test.js lists tracked paths'
    - from: task-008
      to: task-009
      reason: 'the documents state the repository after the removal and the model edit'
    - from: task-009
      to: task-010
      reason: 'the proof builds and greps the final tree, documents included'
```

## 4. Task Catalog

```yaml
task_catalog:
  tasks:
    - id: task-001
      title: 'build-editor.mjs writes target/editor-webapp, assembles without assets for the structural modes, and --check means "the sources assemble"; its three test files'
      source_requirements:
        prd:
          - 'none: there is no PRD (profile TDD+pln); the REQ-n of the TDD are listed with the TDD items'
        tdd:
          - 'REQ-1'
          - 'REQ-3'
          - 'REQ-7'
          - 'TG-1'
          - 'TG-2'
          - 'TG-5'
          - 'ASM-1'
          - 'CON-1'
          - 'CON-2'
          - 'CON-8'
          - 'DEC-1'
          - 'DEC-4'
          - 'DEC-5'
          - 'CTR-1'
          - 'CTR-2'
          - 'IMP-3'
          - 'RISK-6'
          - 'resolutions F2 and F10 of the preamble of this plan'
      outputs:
        - 'scripts/build-editor.mjs (PAGE_PATH is target/editor-webapp/standalone.html and ASSETS_DIR target/editor-webapp/assets, both under --root; assemble(root, { strict }): the write mode is strict and a missing asset still throws, every other mode is non-strict and writes the placeholder hash 00000000 in the <meta archicode-asset> line of a missing asset; --check writes nothing and exits 1 only when the sources do not assemble (a part missing from layers.json, a bad assets.json, a bundle that does not build), the sentences "is generated: edit src/main/editor" and the staleAssets code go; --check-identical <rev> always reads src/main/editor of the revision with git archive <rev> src/main/editor into a temporary folder, assembles it non-strict and compares it with the non-strict assembly of the tree, with no path that reads a page from the revision (resolution F2); --where and --map are non-strict; an unknown revision is the one line error: cannot read src/main/editor at <rev>; the header comment is rewritten to what is true now; --root keeps its meaning of a tree with the repository layout)'
        - 'src/test/javascript/editor-build/build-editor.test.js (rewritten for the folder and the new --check: the cases about a stale or a missing committed page go, a case for --check on sources that do not assemble stays; a new case builds the repository own src/main/editor into a temporary root (node_modules linked, target/kernel copied) and compares standalone.html, codemirror.js, elk.js and viewpoint_kernel.js with git show archicode-0.25.0:src/main/resources/editor-webapp/<name>, skipped with the reason when the tag, node_modules or target/kernel is missing)'
        - 'src/test/javascript/editor-build/editor-assets.test.js and src/test/javascript/editor-build/yaml-parts.test.js (the tree of yaml-parts.test.js no longer copies the committed assets, since the structural modes are non-strict)'
      verification:
        - 'node --test src/test/javascript/editor-build/build-editor.test.js src/test/javascript/editor-build/editor-assets.test.js src/test/javascript/editor-build/yaml-parts.test.js'
        - 'bash -c ''set -e; test -f target/kernel/viewpoint_kernel.wasm || npm run kernel:build; node scripts/build-editor.mjs'''
        - 'bash -c ''set -e; for f in standalone.html assets/codemirror.js assets/elk.js assets/viewpoint_kernel.js assets/THIRD-PARTY-NOTICES.txt; do git show 7742b07:src/main/resources/editor-webapp/$f | cmp - target/editor-webapp/$f; done'''
        - 'node scripts/build-editor.mjs --check'
        - 'node scripts/build-editor.mjs --check-identical HEAD'
        - 'test -z "$(find src/main/resources/editor-webapp -type f -newer scripts/build-editor.mjs)"'
        - '! grep -nE "is generated|staleAssets" scripts/build-editor.mjs'
        - 'npx prettier --check scripts/build-editor.mjs src/test/javascript/editor-build/build-editor.test.js src/test/javascript/editor-build/editor-assets.test.js src/test/javascript/editor-build/yaml-parts.test.js'
        - 'npx eslint --max-warnings 0 scripts/build-editor.mjs src/test/javascript/editor-build/build-editor.test.js src/test/javascript/editor-build/editor-assets.test.js src/test/javascript/editor-build/yaml-parts.test.js'
      risk: 'medium'
      confidence: 75
      human_review: 'none'
      escalation_triggers:
        - 'the built page or a script differs from the file of 7742b07 (ASM-1 is false, or a part or a bundle moved): stop and log it, never touch src/main/editor to make the comparison pass'
        - 'node_modules or target/kernel is missing and the network is not reachable to restore them: record an environment gap for the cmp lines, never a pass, and run the other checks'
        - 'a mode that must stay source-only (--where, --map, --check-identical) cannot run without an asset on disk even non-strict: stop and log it (DEC-4)'
      delegation_tier: 'standard'
      results: 'tier standard, model sonnet, effort medium, profile low-cost, passed first time, inline (leaf), independently verified'
    - id: task-002
      title: 'The samples and the node harness read the folder: build-sample.mjs, the helper editor-files.js with its test, harness.js, and the npm scripts that build the whole folder'
      source_requirements:
        prd:
          - 'none: there is no PRD (profile TDD+pln); the REQ-n of the TDD are listed with the TDD items'
        tdd:
          - 'REQ-4'
          - 'REQ-7'
          - 'TG-4'
          - 'TG-5'
          - 'ASM-2'
          - 'CON-8'
          - 'DEC-4'
          - 'DEC-6'
          - 'DEC-8'
          - 'CTR-2'
          - 'IF-2'
          - 'IF-4'
          - 'FLOW-2'
          - 'IMP-4'
          - 'IMP-8'
          - 'IMP-9'
          - 'resolution F7 of the preamble of this plan'
      outputs:
        - 'scripts/build-sample.mjs (the sample paths and PAGE under target/editor-webapp/samples and target/editor-webapp/standalone.html under --root; the --check mode goes with the committed sample it compared; the check inside buildSample that a bundle drops no file of its fixture stays, with its one line)'
        - 'src/test/javascript/viewpoint-kernel/editor-files.js (new CommonJS helper, not a *.test.js: exports PAGE, ASSETS_DIR and SAMPLES_DIR as absolute paths under target/editor-webapp of the repository and readPage(root), which throws the one line the editor page is missing: target/editor-webapp/standalone.html (run npm run editor:build) when the file is absent)'
        - 'src/test/javascript/viewpoint-kernel/editor-files.test.js (new: readPage on an empty temporary root throws that one line; on a root that holds the file it returns its text; the exported paths end with the three names of the folder)'
        - 'src/test/javascript/viewpoint-kernel/harness.js (HTML and KERNEL come from editor-files.js; the ARCHICODE_EDITOR_HTML override stays)'
        - 'src/test/javascript/viewpoint-kernel/build-sample-script.test.js (runs the script on a copy of the fixture and of the page under --root with the new layout; the cases of --check go, the cases of a bundle that skips a file and of the count of carried files stay)'
        - 'package.json (editor:build is npm run kernel:build && node scripts/build-editor.mjs && node scripts/build-sample.mjs; prelint, pretest:unit and pretest:coverage are npm run editor:build; editor:check is node scripts/build-editor.mjs --check && node scripts/check-editor.mjs --layers because --check no longer reads the kernel (resolution F7); sample:build stays; sample:check is removed; package-lock.json does not change)'
      verification:
        - 'node --test src/test/javascript/viewpoint-kernel/editor-files.test.js src/test/javascript/viewpoint-kernel/build-sample-script.test.js src/test/javascript/viewpoint-kernel/load-kernel.test.js'
        - 'npm run editor:build'
        - 'git show 7742b07:src/main/resources/editor-webapp/samples/brightcart.yaml | cmp - target/editor-webapp/samples/brightcart.yaml'
        - 'cmp src/main/resources/editor-webapp/samples/archicode.yaml target/editor-webapp/samples/archicode.yaml'
        - 'grep -qF "\"editor:build\": \"npm run kernel:build && node scripts/build-editor.mjs && node scripts/build-sample.mjs\"" package.json'
        - 'grep -qF "\"editor:check\": \"node scripts/build-editor.mjs --check && node scripts/check-editor.mjs --layers\"" package.json'
        - 'test "$(grep -c "\"npm run editor:build\"" package.json)" -eq 3'
        - '! grep -n "sample:check" package.json'
        - 'bash -c ''set -e; npm run editor:build >/dev/null; a=$(git status --short | md5sum); npm run editor:build >/dev/null; test "$a" = "$(git status --short | md5sum)"'''
        - 'npx prettier --check scripts/build-sample.mjs src/test/javascript/viewpoint-kernel/editor-files.js src/test/javascript/viewpoint-kernel/editor-files.test.js src/test/javascript/viewpoint-kernel/harness.js src/test/javascript/viewpoint-kernel/build-sample-script.test.js'
        - 'npx eslint --max-warnings 0 scripts/build-sample.mjs src/test/javascript/viewpoint-kernel/editor-files.js src/test/javascript/viewpoint-kernel/editor-files.test.js src/test/javascript/viewpoint-kernel/harness.js src/test/javascript/viewpoint-kernel/build-sample-script.test.js'
      risk: 'medium'
      confidence: 75
      human_review: 'none'
      escalation_triggers:
        - 'build-sample.mjs fails on the page of task-001 (a part of the page differs in a way the harness feels): stop and log it, never edit src/main/editor'
        - 'the sample archicode.yaml differs from the working-tree file by more than the run 0231 retag: stop and log the lines, do not rewrite the model here (task-008 owns it)'
        - 'a script of package.json outside the list would have to change, or package-lock.json would change: stop and log it'
      delegation_tier: 'standard'
      results: 'tier standard, model sonnet, effort medium, profile low-cost, passed first time, inline (leaf), independently verified'
    - id: task-003
      title: 'The checks of the sources read the sources: check-editor.mjs, the move check, the coverage script, the lint extraction and their tests'
      source_requirements:
        prd:
          - 'none: there is no PRD (profile TDD+pln); the REQ-n of the TDD are listed with the TDD items'
        tdd:
          - 'REQ-7'
          - 'TG-5'
          - 'CON-5'
          - 'CON-8'
          - 'DEC-4'
          - 'DEC-5'
          - 'CTR-2'
          - 'IF-5'
          - 'FLOW-4'
          - 'IMP-5'
          - 'IMP-6'
          - 'resolutions F2 and F10 of the preamble of this plan'
      outputs:
        - 'scripts/check-editor.mjs (the mode --statements <rev> takes the statements of the page that the non-strict assembly of src/main/editor of <rev> gives, read with git archive, as task-001 does for --check-identical; PAGE_PATH goes (resolution F2/F10: no revision is asked for a committed page); an unknown revision is the one line error: cannot read src/main/editor at <rev>; the other modes keep their usage and output)'
        - 'scripts/check-editor-moves.sh (only if a comment or a message names the committed page; its usage and its output "<short hash> <subject> ok" or the first differing line stay)'
        - 'scripts/editor-coverage.mjs and scripts/extract-editor-script.mjs (HTML and the default html are target/editor-webapp/standalone.html)'
        - 'src/test/javascript/editor-build/check-editor.test.js, check-editor-statements.test.js, check-editor-layers.test.js and check-editor-moves.test.js (the fixture repositories hold src/main/editor and no page; the message pinned for an unreadable revision follows the new sentence; check-editor-moves.test.js keeps one case where a move passes and one where a non-move fails, on commits that have no page)'
      verification:
        - 'node --test src/test/javascript/editor-build/check-editor.test.js src/test/javascript/editor-build/check-editor-statements.test.js src/test/javascript/editor-build/check-editor-layers.test.js src/test/javascript/editor-build/check-editor-moves.test.js'
        - 'node scripts/check-editor.mjs --layers'
        - 'bash -c ''set -e; npm run editor:build >/dev/null; node scripts/extract-editor-script.mjs; test -s target/eslint-editor/page.js'''
        - '! grep -n "src/main/resources/editor-webapp" scripts/check-editor.mjs scripts/check-editor-moves.sh scripts/editor-coverage.mjs scripts/extract-editor-script.mjs'
        - 'grep -q "target/editor-webapp" scripts/editor-coverage.mjs && grep -q "target/editor-webapp" scripts/extract-editor-script.mjs'
        - 'node --check scripts/editor-coverage.mjs'
        - 'bash -n scripts/check-editor-moves.sh'
        - 'npx prettier --check scripts/check-editor.mjs scripts/editor-coverage.mjs scripts/extract-editor-script.mjs src/test/javascript/editor-build/check-editor.test.js src/test/javascript/editor-build/check-editor-statements.test.js src/test/javascript/editor-build/check-editor-layers.test.js src/test/javascript/editor-build/check-editor-moves.test.js'
        - 'npx eslint --max-warnings 0 scripts/check-editor.mjs scripts/editor-coverage.mjs scripts/extract-editor-script.mjs src/test/javascript/editor-build/check-editor.test.js src/test/javascript/editor-build/check-editor-statements.test.js src/test/javascript/editor-build/check-editor-layers.test.js src/test/javascript/editor-build/check-editor-moves.test.js'
      risk: 'medium'
      confidence: 70
      human_review: 'none'
      escalation_triggers:
        - 'the statements of a revision cannot be taken from its sources without a built asset (the extraction needs a real hash): stop and log it (DEC-4b)'
        - 'check-editor-moves.sh must change its usage or its output to work: stop and log it (IF-5)'
        - 'the coverage floor or ratchet.max would have to move: stop and log it (CON-5)'
      delegation_tier: 'standard'
      results: 'tier standard, model sonnet, effort medium, profile low-cost, passed first time, inline (leaf), independently verified'
    - id: task-004
      title: 'The node readers use the helper: the files of src/test/javascript that name editor-webapp read the folder through editor-files.js, and plateau-matrix-page.test.js reads the tag archicode-0.25.0'
      source_requirements:
        prd:
          - 'none: there is no PRD (profile TDD+pln); the REQ-n of the TDD are listed with the TDD items'
        tdd:
          - 'REQ-4'
          - 'REQ-7'
          - 'TG-4'
          - 'CON-2'
          - 'DEC-5'
          - 'DEC-6'
          - 'IMP-9'
          - 'RISK-4'
          - 'RISK-6'
          - 'resolution F10 of the preamble of this plan'
      outputs:
        - 'every file of src/test/javascript outside editor-build/ and outside the files of task-001 to task-003 that builds the path src/main/resources/editor-webapp itself (51 under viewpoint-kernel/, plus map-highlight-diagram.test.js and site.test.js, and editor-build/remote-import.test.js) takes PAGE, ASSETS_DIR, SAMPLES_DIR or readPage from src/test/javascript/viewpoint-kernel/editor-files.js (by its relative path); a test that takes the page from ARCHICODE_EDITOR_HTML keeps that override'
        - 'conformance.test.js (the folder built from the repository root at about line 315 reads the new folder; remote-import.test.js keeps its checks that the page and its sources hold no import( and no fetch)'
        - 'plateau-matrix-page.test.js (reads git show archicode-0.25.0:src/main/resources/editor-webapp/standalone.html instead of HEAD:, skips with the reason when the tag is not in the clone as the four tests of the older tags do, and its failure message says to name a newer tag when the plateaus list changes (RISK-4))'
        - 'story-player-scene.test.js, save-keeps-the-brackets.test.js, save-keeps-quotes-and-comments.test.js and delete-plateau-as-released.test.js keep their git show <tag>:src/main/resources/editor-webapp/standalone.html (a tag is immutable and holds its page); only their reading of the current page moves to the helper'
      verification:
        - 'npm run editor:build'
        - 'test -z "$(grep -rl "main/resources/editor-webapp" src/test/javascript | grep -vE "(story-player-scene|save-keeps-the-brackets|save-keeps-quotes-and-comments|delete-plateau-as-released|plateau-matrix-page|check-editor[a-z-]*)[.]test[.]js$")"'
        - 'node --test src/test/javascript/viewpoint-kernel/conformance.test.js src/test/javascript/viewpoint-kernel/plateau-matrix-page.test.js src/test/javascript/viewpoint-kernel/story-player-scene.test.js src/test/javascript/viewpoint-kernel/save-keeps-the-brackets.test.js src/test/javascript/viewpoint-kernel/save-keeps-quotes-and-comments.test.js src/test/javascript/viewpoint-kernel/delete-plateau-as-released.test.js'
        - 'node --test src/test/javascript/site.test.js src/test/javascript/editor-build/remote-import.test.js src/test/javascript/viewpoint-kernel/sample-brightcart.test.js src/test/javascript/viewpoint-kernel/sample-archicode.test.js src/test/javascript/viewpoint-kernel/sample-landing.test.js src/test/javascript/viewpoint-kernel/bundle-flows.test.js'
        - 'npx prettier --check "src/test/javascript/viewpoint-kernel/*.js" src/test/javascript/map-highlight-diagram.test.js src/test/javascript/site.test.js src/test/javascript/editor-build/remote-import.test.js'
        - 'npx eslint --max-warnings 0 "src/test/javascript/viewpoint-kernel/*.js" src/test/javascript/map-highlight-diagram.test.js src/test/javascript/site.test.js src/test/javascript/editor-build/remote-import.test.js'
      risk: 'medium'
      confidence: 65
      human_review: 'none'
      escalation_triggers:
        - 'a test builds a tree of its own with the old layout (copies the committed page or assets) and cannot read the helper without changing what it proves: stop and log the file, do not weaken the test'
        - 'the tag archicode-0.25.0 is absent from the clone or its page differs from that of 7742b07: record an environment gap for plateau-matrix-page.test.js, never a pass'
        - 'more than ten files need a hand edit beyond the path: stop and log the list (RISK-6)'
      delegation_tier: 'standard'
      results: 'tier standard, model sonnet, effort medium, profile low-cost, passed first time, inline (leaf), independently verified'
    - id: task-005
      title: 'The pom: a second antrun execution builds the page and the samples at generate-resources, the jar and the classes take target/editor-webapp, and .gitignore names the old folder'
      source_requirements:
        prd:
          - 'none: there is no PRD (profile TDD+pln); the REQ-n of the TDD are listed with the TDD items'
        tdd:
          - 'REQ-2'
          - 'REQ-3'
          - 'TG-1'
          - 'TG-2'
          - 'TG-3'
          - 'ASM-1'
          - 'ASM-3'
          - 'ASM-4'
          - 'CON-1'
          - 'CON-3'
          - 'CON-6'
          - 'DEC-1'
          - 'DEC-2'
          - 'DEC-3'
          - 'CTR-1'
          - 'CTR-4'
          - 'IF-1'
          - 'FLOW-1'
          - 'IMP-1'
          - 'RISK-2'
          - 'RISK-3'
          - 'RISK-7'
          - 'resolution F9 of the preamble of this plan'
      outputs:
        - 'pom.xml (in the maven-antrun-plugin 3.2.0 block of run 0231, a second execution page, goal run, phase generate-resources: the target loads the environment again with property environment="env" (an execution has its own target, resolution F9), sets page.missing-node to the sentence Node.js is not installed: the editor page is built with node and npm, install Node.js 22 from https://nodejs.org (Maven runs npm ci and scripts/build-editor.mjs), sets node.found with a condition and of two available checks on node and npm along ${env.PATH}, fails unless node.found with that message, then three exec with failonerror and dir ${project.basedir}: npm ci --no-audit --no-fund, node scripts/build-editor.mjs, node scripts/build-sample.mjs, in that order; the first resource entry excludes editor-webapp/** (not only the .wasm); a third resource entry has directory ${project.build.directory}/editor-webapp and targetPath editor-webapp; the comments say where the files come from; the kernel execution, Chicory, Quarkus, Failsafe, JaCoCo and the native profile are untouched)'
        - '.gitignore (the line /src/main/resources/editor-webapp/ with a comment saying the page is built into target/editor-webapp)'
      verification:
        - 'JAVA_HOME=$HOME/.sdkman/candidates/java/25.0.4-tem ./mvnw --batch-mode -q package -Dmaven.test.skip -Dplugin.asciidoctor.skip=true'
        - 'bash -c ''set -e; for f in standalone.html assets/codemirror.js assets/elk.js assets/viewpoint_kernel.js assets/THIRD-PARTY-NOTICES.txt samples/brightcart.yaml samples/archicode.yaml; do unzip -p target/quarkus-app/app/archicode-*.jar editor-webapp/$f | cmp - target/editor-webapp/$f; done; unzip -p target/quarkus-app/app/archicode-*.jar editor-webapp/assets/viewpoint_kernel.wasm | cmp - target/kernel/viewpoint_kernel.wasm'''
        - 'test "$(unzip -l target/quarkus-app/app/archicode-*.jar | grep -cE "editor-webapp/(standalone.html|assets/(codemirror|elk|viewpoint_kernel).js|samples/(brightcart|archicode).yaml)")" -eq 6'
        - 'bash -c ''set -e; for f in standalone.html assets/codemirror.js assets/elk.js assets/viewpoint_kernel.js assets/THIRD-PARTY-NOTICES.txt samples/brightcart.yaml; do git show 7742b07:src/main/resources/editor-webapp/$f | cmp - target/editor-webapp/$f; done'''
        - 'bash -c ''d=$(mktemp -d); for t in java bash sh env uname dirname basename cat tr sed grep head mkdir rm ls wc cut cmp mv cp mktemp date sleep awk; do p=$(command -v $t) && ln -s "$p" "$d/$t"; done; if JAVA_HOME=$HOME/.sdkman/candidates/java/25.0.4-tem PATH="$d" ./mvnw --batch-mode -o antrun:run@page > "$d/out.txt" 2>&1; then exit 1; fi; test "$(grep -c "^.ERROR.*Node.js is not installed" "$d/out.txt")" -eq 1 && ! grep -q "^[[:space:]]*at org[.]" "$d/out.txt"'''
        - 'grep -q "scripts/build-editor.mjs" pom.xml && grep -q "scripts/build-sample.mjs" pom.xml && grep -qF "<exclude>editor-webapp/**</exclude>" pom.xml && grep -qF "${project.build.directory}/editor-webapp" pom.xml'
        - 'grep -qxF "/src/main/resources/editor-webapp/" .gitignore'
        - 'git check-ignore -q --no-index src/main/resources/editor-webapp/standalone.html'
        - 'test -z "$(git diff -U0 -- pom.xml | grep -E "^[-+]" | grep -E "chicory|quarkus-maven|failsafe|jacoco|<profile>")"'
      risk: 'high'
      confidence: 70
      human_review: 'after'
      escalation_triggers:
        - 'the antrun failure without node is not one line without a stack trace: record the measured output, try the property and fail forms, stop and log it if none works (DEC-2)'
        - 'the jar copy of a file differs from target/editor-webapp, or the page differs from 7742b07: stop and log it, never copy a file by hand'
        - 'npm ci cannot run (no network and a cold cache): record an environment gap for every check that needs the build, never a pass'
        - 'an edit would drop a line of run 0231 in pom.xml, or a plugin outside the list would have to change: stop and log it (edit by anchors, diff before and after)'
      delegation_tier: 'hard_judgment'
      results: 'tier hard_judgment, model sonnet, effort high, profile low-cost, passed first time, inline (leaf), independently verified'
    - id: task-006
      title: 'The Java and end-to-end readers use the folder: EditorFiles.java and the five Java test classes, the e2e harness, hosted.js and the offline spec'
      source_requirements:
        prd:
          - 'none: there is no PRD (profile TDD+pln); the REQ-n of the TDD are listed with the TDD items'
        tdd:
          - 'REQ-4'
          - 'REQ-7'
          - 'TG-4'
          - 'CON-2'
          - 'CON-3'
          - 'CON-6'
          - 'DEC-6'
          - 'IF-3'
          - 'IF-4'
          - 'IMP-10'
          - 'IMP-11'
      outputs:
        - 'src/test/java/io/morin/archicode/EditorFiles.java (new: a final class with PAGE, ASSETS and SAMPLES as Path under target/editor-webapp, in the style of the other test helpers, in the scope of PMD)'
        - 'cli/EditorHttpServerTest.java (5 literals), it/EditorServeIT.java (2: it compares the served assets with the folder, which proves the jar holds the build), cli/GuideViewPropertiesTest.java, manifest/EditorReadSchemaTest.java and brightcart/BrightcartSampleTest.java read through EditorFiles; the assertion messages that say as committed are reworded; NativeReflectionConfigTest is not changed'
        - 'src/test/e2e/harness.js (PAGE, SAMPLE and ASSETS point at the folder and are exported for hosted.js and the specs; ASSET_ROUTES, computed at import, throws the one line the editor page is missing: target/editor-webapp/standalone.html (run npm run editor:build) instead of being empty when the folder is absent), src/test/e2e/hosted.js and src/test/e2e/editor-offline.spec.js (its third test opens target/editor-webapp/standalone.html from a disk)'
      verification:
        - 'JAVA_HOME=$HOME/.sdkman/candidates/java/25.0.4-tem ./mvnw --batch-mode -q test -Dplugin.asciidoctor.skip=true -Dsurefire.failIfNoSpecifiedTests=false -Dtest=EditorHttpServerTest,GuideViewPropertiesTest,EditorReadSchemaTest,BrightcartSampleTest,NativeReflectionConfigTest'
        - 'JAVA_HOME=$HOME/.sdkman/candidates/java/25.0.4-tem ./mvnw --batch-mode -q test-compile pmd:check -Dplugin.asciidoctor.skip=true'
        - '! grep -rn "main/resources/editor-webapp" src/test/java src/test/e2e'
        - 'grep -q "target/editor-webapp" src/test/e2e/harness.js && grep -q "npm run editor:build" src/test/e2e/harness.js'
        - 'npx playwright test --list --project=chromium'
        - 'npx prettier --check src/test/java/io/morin/archicode/EditorFiles.java src/test/java/io/morin/archicode/cli/EditorHttpServerTest.java src/test/java/io/morin/archicode/it/EditorServeIT.java src/test/java/io/morin/archicode/cli/GuideViewPropertiesTest.java src/test/java/io/morin/archicode/manifest/EditorReadSchemaTest.java src/test/java/io/morin/archicode/brightcart/BrightcartSampleTest.java src/test/e2e/harness.js src/test/e2e/hosted.js src/test/e2e/editor-offline.spec.js'
        - 'npx eslint --max-warnings 0 src/test/e2e'
      risk: 'medium'
      confidence: 70
      human_review: 'none'
      escalation_triggers:
        - 'a Java test reads the file through the classpath on purpose (the packaged jar) and must not move: leave it and log why'
        - 'a spec depends on the page being at the old path in a way the harness cannot hide: stop and log it (CON-2)'
        - 'PMD flags the helper in a way that needs a rule turned off: stop and log it, never add a NOPMD or a SuppressWarnings (CLAUDE.md)'
      delegation_tier: 'standard'
      results: 'tier standard, model sonnet, effort medium, profile low-cost, passed first time, inline (leaf), independently verified'
    - id: task-007
      title: 'CI: Node in every job that runs Maven, the website assembled from target/editor-webapp, the sample step gone from Page, and the job map'
      source_requirements:
        prd:
          - 'none: there is no PRD (profile TDD+pln); the REQ-n of the TDD are listed with the TDD items'
        tdd:
          - 'REQ-5'
          - 'REQ-7'
          - 'TG-6'
          - 'ASM-4'
          - 'ASM-5'
          - 'DEC-7'
          - 'CTR-3'
          - 'FLOW-3'
          - 'IMP-7'
          - 'IMP-12'
          - 'RISK-1'
          - 'RISK-8'
          - 'resolution F3 and F4 of the preamble of this plan'
      outputs:
        - '.github/workflows/ci-build.yaml (a step "Set up Node.js", actions/setup-node@v4 with node-version "22" and cache "npm", before the first ./mvnw step of Java, Build and Native, on every Native target and with no if on Build (resolution F4: Assemble website and the new step below run on any tag, the deploy steps only for a release commit); E2E and Page keep theirs and E2E keeps its npm ci for the Playwright version and the browsers; no npm ci step is added to the others, Maven runs it; in Build a step with the same if as Assemble website runs ./mvnw --batch-mode process-resources -Dplugin.asciidoctor.skip=true before it; Assemble website copies standalone.html (through the stamp sed), samples/ and assets/ from target/editor-webapp/, compares each file with cmp as now, and the lines that name src/main/resources/editor-webapp go; Page loses the step "Check the samples are the bundles of their folders" and the step "Check the editor page is the assembly of its parts" is renamed "Check the editor sources assemble" with a comment that says what editor:check checks now; the comments that say a file is committed are rewritten)'
        - 'scripts/changes.mjs (the rule R-07a is removed; R-05, R-16 and R-20 each send their paths to Java, Page and E2E; a new rule before R-18 sends src/test/javascript/viewpoint-kernel/harness.js and src/test/javascript/viewpoint-kernel/editor-files.js to Java, Page and E2E, because the build runs the first and the first imports the second (resolution F3); the Kernel job is not added to any of them; the reasons of the rules say what each path now reaches)'
        - 'src/test/javascript/changes-map.test.js (the rows that name the page and codemirror.js go; the rows for package.json, scripts/build-editor.mjs, docs/architecture/manifests/archicode.yaml, harness.js and editor-files.js follow the rules above; the [workflow] cases follow the renamed and removed steps)'
      verification:
        - 'python3 -c "import yaml; yaml.safe_load(open(''.github/workflows/ci-build.yaml''))"'
        - 'python3 -c "import yaml; d=yaml.safe_load(open(''.github/workflows/ci-build.yaml'')); j=d[''jobs'']; n=lambda k: [s.get(''name'') for s in j[k][''steps'']]; f=lambda k: [i for i,s in enumerate(j[k][''steps'']) if ''./mvnw'' in str(s.get(''run'',''''))][0]; assert all(''Set up Node.js'' in n(k) and n(k).index(''Set up Node.js'') < f(k) for k in [''Java'',''E2E'',''Build'',''Native'']); assert ''Set up Node.js'' in n(''Page''); assert ''if'' not in [s for s in j[''Build''][''steps''] if s.get(''name'')==''Set up Node.js''][0]"'
        - 'python3 -c "import yaml; d=yaml.safe_load(open(''.github/workflows/ci-build.yaml'')); s=d[''jobs''][''Build''][''steps'']; a=[x for x in s if x.get(''name'')==''Assemble website''][0]; p=[x for x in s if ''process-resources'' in str(x.get(''run'',''''))][0]; assert p.get(''if'')==a.get(''if'') and s.index(p) < s.index(a)"'
        - 'test "$(sed -n "/Assemble website/,/Publish website/p" .github/workflows/ci-build.yaml | grep -c "src/main/resources/editor-webapp")" -eq 0'
        - 'test "$(sed -n "/Assemble website/,/Publish website/p" .github/workflows/ci-build.yaml | grep -c "target/editor-webapp")" -ge 3'
        - 'test "$(grep -c "Check the samples are the bundles of their folders" .github/workflows/ci-build.yaml)" -eq 0'
        - 'test "$(grep -c "Check the editor page is the assembly of its parts" .github/workflows/ci-build.yaml)" -eq 0 && grep -q "Check the editor sources assemble" .github/workflows/ci-build.yaml'
        - '! grep -n "R-07a" scripts/changes.mjs'
        - 'node --test src/test/javascript/changes-map.test.js'
        - 'node scripts/changes.mjs --list'
        - 'npx prettier --check scripts/changes.mjs src/test/javascript/changes-map.test.js'
        - 'npx eslint --max-warnings 0 scripts/changes.mjs src/test/javascript/changes-map.test.js'
      risk: 'high'
      confidence: 65
      human_review: 'after'
      escalation_triggers:
        - 'the step Assemble website needs more than a change of the folder it reads (the stamp sed, the grep of the stamp or the publish step would have to change): stop and log it'
        - 'an edit would drop a line of another run in ci-build.yaml: edit by anchors, diff before and after'
        - 'changes-map.test.js audits a rule against a reader in a way this task cannot satisfy without widening a rule further: stop and log it (CTR-3)'
        - 'a job other than the four needs Node (the Kernel job runs the page build): stop and log it'
      delegation_tier: 'hard_judgment'
      results: 'tier hard_judgment, model sonnet, effort high, profile low-cost, passed first time, inline (leaf), independently verified'
    - id: task-008
      title: 'The seven generated files leave git, .prettierignore loses the page, and the model of ArchiCode names the sources'
      source_requirements:
        prd:
          - 'none: there is no PRD (profile TDD+pln); the REQ-n of the TDD are listed with the TDD items'
        tdd:
          - 'REQ-1'
          - 'REQ-7'
          - 'TG-1'
          - 'CON-4'
          - 'DEC-1'
          - 'DEC-10'
          - 'CTR-1'
          - 'IMP-2'
          - 'IMP-13'
          - 'RISK-3'
      outputs:
        - 'the seven tracked files under src/main/resources/editor-webapp (standalone.html, assets/codemirror.js, assets/elk.js, assets/viewpoint_kernel.js, assets/THIRD-PARTY-NOTICES.txt, samples/brightcart.yaml, samples/archicode.yaml) removed from the index with git rm -r -f (no commit; recoverable from HEAD) and the folder deleted from the working tree'
        - '.prettierignore (the line src/main/resources/editor-webapp/standalone.html goes and the comment above it says the page is built into target/, which Prettier ignores)'
        - 'docs/architecture/manifests/archicode.yaml (archicode.editor.page gets tags.path src/main/editor/page.html and the description The standalone page, assembled by scripts/build-editor.mjs into target/editor-webapp; archicode.contracts.couplings.editor_assets gets tags.path src/main/editor/assets.json, src/main/editor/bundles; no relationship changes; src/test/javascript/architecture/impact-questions.json is untouched unless a question names a moved path)'
      verification:
        - 'git rm -r -f -q --ignore-unmatch src/main/resources/editor-webapp && rm -rf src/main/resources/editor-webapp'
        - 'test -z "$(git ls-files src/main/resources/editor-webapp)" && test "$(git ls-files | grep -c viewpoint_kernel)" -eq 0'
        - 'bash -c ''set -e; npm run editor:build >/dev/null; test ! -e src/main/resources/editor-webapp; a=$(git status --short | md5sum); npm run editor:build >/dev/null; test "$a" = "$(git status --short | md5sum)"; test ! -e src/main/resources/editor-webapp'''
        - 'bash -c ''set -e; for f in standalone.html assets/codemirror.js assets/elk.js assets/viewpoint_kernel.js assets/THIRD-PARTY-NOTICES.txt samples/brightcart.yaml; do git show 7742b07:src/main/resources/editor-webapp/$f | cmp - target/editor-webapp/$f; done'''
        - '! grep -n "src/main/resources/editor-webapp" .prettierignore'
        - 'grep -qF "src/main/editor/page.html" docs/architecture/manifests/archicode.yaml && ! grep -n "src/main/resources/editor-webapp" docs/architecture/manifests/archicode.yaml'
        - 'node --test src/test/javascript/architecture-model.test.js src/test/javascript/site.test.js src/test/javascript/editor-build/remote-import.test.js src/test/javascript/viewpoint-kernel/sample-archicode.test.js'
        - 'JAVA_HOME=$HOME/.sdkman/candidates/java/25.0.4-tem ./mvnw --batch-mode -q test -Dplugin.asciidoctor.skip=true -Dsurefire.failIfNoSpecifiedTests=false -Dtest=ArchitectureDriftTest,ArchitectureImpactTest'
      risk: 'medium'
      confidence: 70
      human_review: 'after'
      escalation_triggers:
        - 'a test or script still reads the old folder and fails now that it is gone: stop, log the file, send it back to the owning task, never restore the committed file'
        - 'ArchitectureImpactTest changes its answer because of the tags.path edit: stop and log it (no relationship may change, DEC-10)'
        - 'the folder comes back after a build: stop and log which script writes it'
      delegation_tier: 'standard'
      results: 'tier standard, model sonnet, effort medium, profile low-cost, passed first time, inline (leaf), independently verified'
    - id: task-009
      title: 'The documents say what is built and where the page is: six CLAUDE.md and README files and the manual'
      source_requirements:
        prd:
          - 'none: there is no PRD (profile TDD+pln); the REQ-n of the TDD are listed with the TDD items'
        tdd:
          - 'REQ-6'
          - 'TG-7'
          - 'DEC-8'
          - 'DEC-9'
          - 'IMP-14'
          - 'resolutions F1 and F6 of the preamble of this plan'
      outputs:
        - 'CLAUDE.md (lines 24, 25 and 39 that say the page, the bundles and the kernel script are committed, and the rule after any change under docs/architecture run npm run sample:build, are rewritten to what is true now: the page, the bundles, the kernel script and the samples are made by the build into target/editor-webapp, ./mvnw or npm run editor:build makes them, they are not in git)'
        - 'src/main/editor/CLAUDE.md (lines 7, 20 and 57 and any sentence on the steps, the checks, sample:check or the sample bundles), src/test/CLAUDE.md (the sentences that name the folder, the page as standalone.html at about line 32 and the sample check of the job Page) and .github/CLAUDE.md (the sentences on the step Assemble website, the rule R-07a, the sample step and the editor step of Page, Node in the jobs that run Maven, the new process-resources step)'
        - 'src/main/rust/viewpoint-kernel/CLAUDE.md, src/main/rust/viewpoint-kernel/README.md and README.md (the sentences that say the page or the kernel script is committed)'
        - 'src/doc/README.adoc (section Opening the editor gets a third way, From a build: ./mvnw package or npm run editor:build writes target/editor-webapp/standalone.html with assets/ beside it, which opens from a disk, offline; the page published at /editor/ and editor serve stay as they are; the generated command-reference block is not touched)'
      verification:
        - 'test -z "$(grep -n "committed" CLAUDE.md src/main/editor/CLAUDE.md src/main/rust/viewpoint-kernel/CLAUDE.md | grep -E "standalone|assets|wasm|bundle|sample|page")"'
        - 'test -z "$(grep -n -i "committed" src/test/CLAUDE.md .github/CLAUDE.md src/main/rust/viewpoint-kernel/README.md README.md | grep -iE "standalone|editor-webapp|viewpoint_kernel|codemirror|elk[.]js|brightcart[.]yaml|archicode[.]yaml|the page|the samples|the bundles")"'
        - 'grep -n "target/editor-webapp" src/doc/README.adoc'
        - 'grep -c "target/editor-webapp" CLAUDE.md src/main/editor/CLAUDE.md src/test/CLAUDE.md .github/CLAUDE.md'
        - '! grep -n "after any change under .docs/architecture. run" CLAUDE.md'
        - '! git grep -n "sample:check" -- . ":!docs/wav"'
        - '! grep -n "R-07a" .github/CLAUDE.md src/test/CLAUDE.md'
        - 'node --test src/test/javascript/manual-howto.test.js'
        - 'JAVA_HOME=$HOME/.sdkman/candidates/java/25.0.4-tem ./mvnw --batch-mode -q test -Dplugin.asciidoctor.skip=true -Dsurefire.failIfNoSpecifiedTests=false -Dtest=CommandReferenceTest'
      risk: 'low'
      confidence: 75
      human_review: 'none'
      escalation_triggers:
        - 'a sentence cannot be made true without a fact the run did not establish (for example the time a CI job takes): leave it out, do not invent it'
        - 'the manual test pins a sentence the new paragraph would break: stop and log it'
      delegation_tier: 'standard'
      results: 'tier standard, model sonnet, effort medium, profile low-cost, passed first time, inline (leaf), independently verified'
    - id: task-010
      title: 'Proof on a clean build: Maven, the jar, the bytes, the failure without Node, the repository grep, and the list of what only a tag run proves'
      source_requirements:
        prd:
          - 'none: there is no PRD (profile TDD+pln); the REQ-n of the TDD are listed with the TDD items'
        tdd:
          - 'REQ-1'
          - 'REQ-2'
          - 'REQ-3'
          - 'REQ-5'
          - 'REQ-6'
          - 'ASM-3'
          - 'ASM-4'
          - 'ASM-6'
          - 'Q-1'
          - 'RISK-1'
          - 'RISK-8'
          - 'resolutions F5 and F8 of the preamble of this plan'
      outputs:
        - 'a Findings paragraph in the prg of the run (docs/wav/wav-035-maven-builds-kernel-and-page-likec4-import/run/run-0232-editor-page-built-by-maven/prg-0232-editor-page-built-by-maven.md, under the heading Findings) with the measured figures of a clean build (seconds of the build from rm -rf target node_modules, and of an up-to-date build), the result of each check below, and the list of what is unproved until a tag run: the arm and macOS native targets with Node and npm ci, the website step Assemble website, the time of npm ci on a cold runner and the Node cache, the build of a release by maven-release-plugin and scripts/byte-identity.sh, which build the head and a tag checkout without the network for npm (resolution F5: ./mvnw -o package runs npm ci, which needs its cache or the network)'
      verification:
        - 'rm -rf target node_modules'
        - 'JAVA_HOME=$HOME/.sdkman/candidates/java/25.0.4-tem ./mvnw --batch-mode package -Dmaven.test.skip -Dplugin.asciidoctor.skip=true'
        - 'test "$(unzip -l target/quarkus-app/app/archicode-*.jar | grep -cE "editor-webapp/(standalone.html|assets/(codemirror|elk|viewpoint_kernel).js|samples/(brightcart|archicode).yaml)")" -eq 6'
        - 'bash -c ''set -e; for f in standalone.html assets/codemirror.js assets/elk.js assets/viewpoint_kernel.js assets/THIRD-PARTY-NOTICES.txt samples/brightcart.yaml; do git show 7742b07:src/main/resources/editor-webapp/$f | cmp - target/editor-webapp/$f; done'''
        - 'bash -c ''git show 7742b07:src/main/resources/editor-webapp/samples/archicode.yaml | diff - target/editor-webapp/samples/archicode.yaml > target/archicode-sample.diff; test $? -le 1'''
        - 'test -z "$(git ls-files src/main/resources/editor-webapp)" && test "$(git ls-files | grep -c viewpoint_kernel)" -eq 0'
        - 'test "$(git grep --untracked -l "src/main/resources/editor-webapp" -- . ":!docs/wav" | grep -vcE "^(.gitignore|src/test/javascript/viewpoint-kernel/(story-player-scene|save-keeps-the-brackets|save-keeps-quotes-and-comments|delete-plateau-as-released|plateau-matrix-page)[.]test[.]js|src/test/javascript/editor-build/check-editor[a-z-]*[.]test[.]js)$")" -eq 0'
        - 'bash -c ''d=$(mktemp -d); for t in java bash sh env uname dirname basename cat tr sed grep head mkdir rm ls wc cut cmp mv cp mktemp date sleep awk; do p=$(command -v $t) && ln -s "$p" "$d/$t"; done; if JAVA_HOME=$HOME/.sdkman/candidates/java/25.0.4-tem PATH="$d" ./mvnw --batch-mode -o antrun:run@page > "$d/out.txt" 2>&1; then exit 1; fi; test "$(grep -c "^.ERROR.*Node.js is not installed" "$d/out.txt")" -eq 1 && ! grep -q "^[[:space:]]*at org[.]" "$d/out.txt"'''
        - 'bash -c ''set -e; npm run editor:build >/dev/null; a=$(git status --short | md5sum); npm run editor:build >/dev/null; test "$a" = "$(git status --short | md5sum)"'''
        - 'test "$(sed -n "/Assemble website/,/Publish website/p" .github/workflows/ci-build.yaml | grep -c "src/main/resources/editor-webapp")" -eq 0'
        - 'test -s docs/wav/wav-035-maven-builds-kernel-and-page-likec4-import/run/run-0232-editor-page-built-by-maven/prg-0232-editor-page-built-by-maven.md && grep -q "unproved" docs/wav/wav-035-maven-builds-kernel-and-page-likec4-import/run/run-0232-editor-page-built-by-maven/prg-0232-editor-page-built-by-maven.md'
      risk: 'medium'
      confidence: 65
      human_review: 'none'
      escalation_triggers:
        - 'the clean build fails for a reason inside the run (a reader, the pom, a script): stop, log the failing output and send it to the owning task; never repair the file here'
        - 'the built page differs from the file of 7742b07 and no change of src/main/editor explains it: stop and log it (REQ-3)'
        - 'npm ci cannot run (no network, cold cache): record an environment gap for every check that needs the build, never a pass'
      delegation_tier: 'standard'
      results: 'tier standard, model sonnet, effort medium, profile low-cost, passed after escalation to effort high, inline (leaf), independently verified'
```

## 5. Parallelization Plan

```yaml
parallelization_plan:
  groups:
    - id: parallel-group-001
      tasks:
        - 'task-002'
        - 'task-003'
      reason: 'Once build-editor.mjs writes the folder, the samples with the harness and the npm scripts (task-002) and the checks of the sources with the coverage and lint scripts (task-003) touch disjoint paths'
      conflict_risks:
        - 'both tasks run npm run editor:build (task-003 once, for the extraction), which writes target/editor-webapp and target/kernel; run the two builds one after the other, never at the same moment, and run no Maven while one runs'
        - 'both import functions of build-editor.mjs (task-001, finished) and neither edits it'
    - id: parallel-group-002
      tasks:
        - 'task-006'
        - 'task-007'
      reason: 'The Java and end-to-end readers (task-006) and the workflow with the job map (task-007) touch disjoint paths once the pom builds the folder'
      conflict_risks:
        - 'task-006 runs Maven, which runs npm ci and rewrites target/editor-webapp and node_modules; task-007 runs only node --test on changes-map.test.js, python and grep, and writes nothing under target: no editor:build in task-007'
        - 'task-007 edits ci-build.yaml on top of lines run 0231 left uncommitted: edit by anchors, diff before and after'
        - 'the wave runs its runs one after another (--max-parallel-runs 1); the groups are inside the one run'
```

## 6. Human Review Gates

```yaml
human_review_gates:
  gates:
    - id: gate-001
      trigger: 'The change adds Node, npm and the network to every ./mvnw, changes what the jar of every release and the live hosted editor serve, removes seven generated files from git, and the website step and the arm and macOS native targets are proved only by a tag run'
      required_before: []
      required_after: ['task-005', 'task-007', 'task-008', 'task-010']
      reviewer_focus:
        - 'that the seven files are out of git and the jar holds the bytes of 7742b07 at the paths they had, with the .wasm from target/kernel, and that a build without node fails with one line that names it'
        - 'that the page opened from a disk is the folder of the build (the third test of editor-offline.spec.js at the phase gate) and no output of a command changed (byte-identity.sh with its exceptions file unchanged)'
        - 'that the website step reads target/editor-webapp, Node is in the four jobs that run Maven, and the list of what is unproved until a tag run is complete; the choice of a rehearsal dispatch before a tag (Q-1) is the author'
```

This run operates under no autonomy override (the progress log of the wave says "autonomy override: none"), the same as run 0231. The gate does not stop the run: no task is human_required or has risk critical, the four tasks it covers are review_after, and the review is the independent verification of each task (at the elevated pair for task-005 and task-007, whose risk is high) together with the author's reading of the pull request. A later edit that flags a task human_required or critical makes the implement workflow stop with awaiting-human; no task so flagged was written, so a future reader should not look for a stop.

## 7. Risk Assessment

```yaml
risk_assessment:
  by_task:
    - id: task-001
      risk: 'medium'
      rationale: 'The page and the three scripts are what the hosted editor serves; the contract is byte identity with 7742b07, which the task checks with cmp; the modes that change meaning (--check, --check-identical) have tests that are rewritten'
    - id: task-002
      risk: 'medium'
      rationale: 'Build scripts and the harness that runs the page in Node; the two samples are the data of the hosted editor, checked by cmp against the previous bytes'
    - id: task-003
      risk: 'medium'
      rationale: 'Source-only checks that guard every pull request (the move check); a mistake lets a bad move through or fails a good one, but nothing shipped changes'
    - id: task-004
      risk: 'medium'
      rationale: 'A mechanical change over about 54 test files; a missed file fails loudly (the helper line or a missing path) and the node suite is the net, so the risk is volume not meaning'
    - id: task-005
      risk: 'high'
      rationale: 'Changes what the jar of every release holds and the build of four CI jobs; the antrun failure form is spiked but the arm and macOS native targets are proved only by a tag run; reversible by reverting the file'
    - id: task-006
      risk: 'medium'
      rationale: 'Test code only; a wrong path fails loudly. The packaged-jar IT and the Playwright specs are not run in this task, so their failure shows only at Stage 11 and the phase gate'
    - id: task-007
      risk: 'high'
      rationale: 'Changes the CI of four jobs and the website assembly that publishes the live hosted editor; a pull request cannot run the website step or the arm and macOS native targets, so only a tag run proves it; reversible by reverting the file'
    - id: task-008
      risk: 'medium'
      rationale: 'Removes files from git, but they are in history (git checkout 7742b07 -- src/main/resources/editor-webapp restores them) and every reader was moved first; the model edit is two paths and a description'
    - id: task-009
      risk: 'low'
      rationale: 'Documents only; the greps are the gate and a wrong sentence has no runtime effect'
    - id: task-010
      risk: 'medium'
      rationale: 'Destructive to local build output only (target, node_modules, both restored by the build); nothing committed or published'
  by_area:
    - area: 'infra'
      risk: 'high'
      rationale: 'The pom, the Node step of four CI jobs and the website assembly change what a release holds and publishes; the website step and the non-Linux native targets are proved only by a tag run'
    - area: 'data'
      risk: 'medium'
      rationale: 'Seven files leave git; they are in history and the build recreates them, and the byte comparison with 7742b07 is the contract'
    - area: 'api'
      risk: 'low'
      rationale: 'EditorHttpServer, the paths in the jar and the paths on the website do not change; the output of no command changes'
    - area: 'ui'
      risk: 'low'
      rationale: 'The page is built from unchanged sources and compared byte for byte; the offline spec at the phase gate proves it opens from a disk'
    - area: 'docs'
      risk: 'low'
      rationale: 'Eight documents are rewritten to state what is true now; two tests read the manual'
    - area: 'security'
      risk: 'low'
      rationale: 'npm ci runs the install scripts of the pinned lock during a Maven build as the jobs Page and E2E already do (Security and Privacy of the TDD); no secret and no new fetch at run time'
```

## 8. Confidence Assessment

```yaml
confidence_assessment:
  by_task:
    - id: task-001
      score: 75
      rationale: 'The spike of the TDD built the same bytes from a scratch tree; the rewrite of --check-identical (git archive) and the placeholder hash are new code, and a test of the script is rewritten in the same task'
    - id: task-002
      score: 75
      rationale: 'The spike of the TDD ran build-sample.mjs on the working tree in 0.07 s; the helper is small and tested first; removing --check changes tests that must be edited by hand'
    - id: task-003
      score: 70
      rationale: 'The assembly function and the git archive route are the same as in task-001; the four test files build git repositories and are rewritten, which is fiddly'
    - id: task-004
      score: 65
      rationale: 'The codemod is simple but wide; the odd files (conformance, site, remote-import, the tag tests) need care, and only a subset runs in the task (the whole suite runs once at Stage 11)'
    - id: task-005
      score: 70
      rationale: 'The execution is spiked end to end in the TDD and run 0231 left a working block to extend; the resource exclusion and the stale-copy case are the parts a clean-checkout build must prove'
    - id: task-006
      score: 70
      rationale: 'The readers are few and the helper is simple; the Quarkus-free unit classes run quickly, but the IT and the browsers are checked later'
    - id: task-007
      score: 65
      rationale: 'The edits follow a table and anchors, and the map has an audit test, but the workflow cannot be run here and a mistake shows on a tag'
    - id: task-008
      score: 70
      rationale: 'The risk is a reader missed by tasks 004 to 007, which the rebuild twice and the model tests catch at once; the full suite at Stage 11 is the net'
    - id: task-009
      score: 75
      rationale: 'The lines to rewrite are listed by the TDD and the grep, and two tests read the manual; the wording of five other documents is a judgment the verifier reads'
    - id: task-010
      score: 65
      rationale: 'Each command is spiked in the TDD; the clean build depends on the network for npm ci and on the machine for time figures'
```

## 9. Agent Assignment Plan

```yaml
agent_assignment_plan:
  assignments:
    - task_id: task-001
      agent_role: 'Frontend Implementation Agent'
      objective: 'Move the output of scripts/build-editor.mjs to target/editor-webapp as DEC-1 and DEC-4 say, and redefine its modes: PAGE_PATH and ASSETS_DIR under target/editor-webapp (both under --root); assemble(root, { strict }) with strict only in the write mode after the assets are written, the placeholder hash 00000000 for a missing asset otherwise; --check writes nothing and fails only when the sources do not assemble (drop the "is generated" sentences and staleAssets); --check-identical <rev> and the analysis modes work on a worktree where nothing is built, and --check-identical always compares the non-strict assembly of src/main/editor taken from the revision with git archive with the non-strict assembly of the tree (resolution F2: no branch that reads a page from the revision, so "both paths are kept" of DEC-5 is not carried out). Write the tests first, red (the new --check, the non-strict assembly of a tree with no build, the revision with no page, the byte comparison with the tag archicode-0.25.0), then turn them green. Run the build and compare the five files with commit 7742b07.'
      context:
        prd_excerpts:
          - 'none: there is no PRD (profile TDD+pln); the REQ-n of the TDD are listed with the TDD items'
        tdd_excerpts:
          - 'REQ-1, REQ-3, REQ-7, TG-1, TG-2, TG-5, ASM-1, CON-1, CON-2, CON-8, DEC-1, DEC-4, DEC-5, CTR-1, CTR-2, IMP-3, RISK-6, resolutions F2 and F10 of the preamble of this plan (the TDD file of this run)'
      likely_files:
        - 'scripts/build-editor.mjs'
        - 'src/test/javascript/editor-build/build-editor.test.js'
        - 'src/test/javascript/editor-build/editor-assets.test.js'
        - 'src/test/javascript/editor-build/yaml-parts.test.js'
      acceptance_criteria:
        - 'the built standalone.html, codemirror.js, elk.js, viewpoint_kernel.js and THIRD-PARTY-NOTICES.txt under target/editor-webapp are byte-identical to the files of commit 7742b07'
        - 'the script writes nothing under src/main/resources/editor-webapp; --check and --check-identical HEAD exit 0 and need neither the kernel nor the built assets'
        - '--check-identical <rev> works on a revision that holds no page (it reads src/main/editor of the revision) and an unknown revision is one error line'
        - 'the tests of the three files pass; the byte comparison with the tag archicode-0.25.0 is skipped with its reason when the tag is absent, never silently passed'
      verification:
        - 'node --test src/test/javascript/editor-build/build-editor.test.js src/test/javascript/editor-build/editor-assets.test.js src/test/javascript/editor-build/yaml-parts.test.js'
        - 'bash -c ''set -e; test -f target/kernel/viewpoint_kernel.wasm || npm run kernel:build; node scripts/build-editor.mjs'''
        - 'bash -c ''set -e; for f in standalone.html assets/codemirror.js assets/elk.js assets/viewpoint_kernel.js assets/THIRD-PARTY-NOTICES.txt; do git show 7742b07:src/main/resources/editor-webapp/$f | cmp - target/editor-webapp/$f; done'''
        - 'node scripts/build-editor.mjs --check'
        - 'node scripts/build-editor.mjs --check-identical HEAD'
        - 'test -z "$(find src/main/resources/editor-webapp -type f -newer scripts/build-editor.mjs)"'
        - '! grep -nE "is generated|staleAssets" scripts/build-editor.mjs'
        - 'npx prettier --check scripts/build-editor.mjs src/test/javascript/editor-build/build-editor.test.js src/test/javascript/editor-build/editor-assets.test.js src/test/javascript/editor-build/yaml-parts.test.js'
        - 'npx eslint --max-warnings 0 scripts/build-editor.mjs src/test/javascript/editor-build/build-editor.test.js src/test/javascript/editor-build/editor-assets.test.js src/test/javascript/editor-build/yaml-parts.test.js'
      escalation_triggers:
        - 'the built page or a script differs from the file of 7742b07 (ASM-1 is false, or a part or a bundle moved): stop and log it, never touch src/main/editor to make the comparison pass'
        - 'node_modules or target/kernel is missing and the network is not reachable to restore them: record an environment gap for the cmp lines, never a pass, and run the other checks'
        - 'a mode that must stay source-only (--where, --map, --check-identical) cannot run without an asset on disk even non-strict: stop and log it (DEC-4)'
      suggested_subagent_type: 'general-purpose'
      suggested_model: '(default)'
      suggested_effort: 'medium'
    - task_id: task-002
      agent_role: 'Frontend Implementation Agent'
      objective: 'Make the samples and the node harness read target/editor-webapp as DEC-4d, DEC-6 and DEC-8 say. Write editor-files.test.js first (red), then add the helper editor-files.js (PAGE, ASSETS_DIR, SAMPLES_DIR, readPage(root) with the one-line advice). Point build-sample.mjs (sample paths, PAGE, --root) and harness.js (HTML, KERNEL) at the folder, drop the --check mode of build-sample.mjs and its test cases, and rewrite package.json: editor:build builds the kernel, the bundles, the page and the samples; the three pre hooks run editor:build; editor:check no longer builds the kernel (resolution F7); sample:check is removed. Run npm run editor:build and compare the samples: brightcart.yaml with commit 7742b07, archicode.yaml with the file of the working tree (run 0231 retagged two lines of the model; nothing else differs until task-008 changes the model).'
      context:
        prd_excerpts:
          - 'none: there is no PRD (profile TDD+pln); the REQ-n of the TDD are listed with the TDD items'
        tdd_excerpts:
          - 'REQ-4, REQ-7, TG-4, TG-5, ASM-2, CON-8, DEC-4, DEC-6, DEC-8, CTR-2, IF-2, IF-4, FLOW-2, IMP-4, IMP-8, IMP-9, resolution F7 of the preamble of this plan (the TDD file of this run)'
      likely_files:
        - 'scripts/build-sample.mjs'
        - 'package.json'
        - 'src/test/javascript/viewpoint-kernel/editor-files.js'
        - 'src/test/javascript/viewpoint-kernel/editor-files.test.js'
        - 'src/test/javascript/viewpoint-kernel/harness.js'
        - 'src/test/javascript/viewpoint-kernel/build-sample-script.test.js'
      acceptance_criteria:
        - 'target/editor-webapp/samples/brightcart.yaml is byte-identical to the file of 7742b07 and archicode.yaml to the file of the working tree'
        - 'readPage on a root with no build throws exactly one line with the path and npm run editor:build; harness.js takes the page and the kernel script from the helper'
        - 'npm run editor:build builds the whole folder and twice in a row leaves git status unchanged; package.json has the four script changes of the objective and no other'
      verification:
        - 'node --test src/test/javascript/viewpoint-kernel/editor-files.test.js src/test/javascript/viewpoint-kernel/build-sample-script.test.js src/test/javascript/viewpoint-kernel/load-kernel.test.js'
        - 'npm run editor:build'
        - 'git show 7742b07:src/main/resources/editor-webapp/samples/brightcart.yaml | cmp - target/editor-webapp/samples/brightcart.yaml'
        - 'cmp src/main/resources/editor-webapp/samples/archicode.yaml target/editor-webapp/samples/archicode.yaml'
        - 'grep -qF "\"editor:build\": \"npm run kernel:build && node scripts/build-editor.mjs && node scripts/build-sample.mjs\"" package.json'
        - 'grep -qF "\"editor:check\": \"node scripts/build-editor.mjs --check && node scripts/check-editor.mjs --layers\"" package.json'
        - 'test "$(grep -c "\"npm run editor:build\"" package.json)" -eq 3'
        - '! grep -n "sample:check" package.json'
        - 'bash -c ''set -e; npm run editor:build >/dev/null; a=$(git status --short | md5sum); npm run editor:build >/dev/null; test "$a" = "$(git status --short | md5sum)"'''
        - 'npx prettier --check scripts/build-sample.mjs src/test/javascript/viewpoint-kernel/editor-files.js src/test/javascript/viewpoint-kernel/editor-files.test.js src/test/javascript/viewpoint-kernel/harness.js src/test/javascript/viewpoint-kernel/build-sample-script.test.js'
        - 'npx eslint --max-warnings 0 scripts/build-sample.mjs src/test/javascript/viewpoint-kernel/editor-files.js src/test/javascript/viewpoint-kernel/editor-files.test.js src/test/javascript/viewpoint-kernel/harness.js src/test/javascript/viewpoint-kernel/build-sample-script.test.js'
      escalation_triggers:
        - 'build-sample.mjs fails on the page of task-001 (a part of the page differs in a way the harness feels): stop and log it, never edit src/main/editor'
        - 'the sample archicode.yaml differs from the working-tree file by more than the run 0231 retag: stop and log the lines, do not rewrite the model here (task-008 owns it)'
        - 'a script of package.json outside the list would have to change, or package-lock.json would change: stop and log it'
      suggested_subagent_type: 'general-purpose'
      suggested_model: '(default)'
      suggested_effort: 'medium'
    - task_id: task-003
      agent_role: 'Frontend Implementation Agent'
      objective: 'Make the checks that work on the sources read the sources, as DEC-5 and FLOW-4 say with resolution F2: check-editor.mjs --statements <rev> reads src/main/editor of <rev> (git archive), assembles it non-strict with the function of task-001 and takes the statements of that page; drop PAGE_PATH and the git show of a page; keep the usage and the output of every mode and of check-editor-moves.sh. Move HTML of editor-coverage.mjs and the default html of extract-editor-script.mjs to target/editor-webapp/standalone.html. Rewrite the four test files so that their fixture repositories hold src/main/editor and no committed page, and the pinned sentence for an unreadable revision follows the new one. The coverage floor (scripts/editor-coverage-floor.json) and ratchet.max are not touched.'
      context:
        prd_excerpts:
          - 'none: there is no PRD (profile TDD+pln); the REQ-n of the TDD are listed with the TDD items'
        tdd_excerpts:
          - 'REQ-7, TG-5, CON-5, CON-8, DEC-4, DEC-5, CTR-2, IF-5, FLOW-4, IMP-5, IMP-6, resolutions F2 and F10 of the preamble of this plan (the TDD file of this run)'
      likely_files:
        - 'scripts/check-editor.mjs'
        - 'scripts/check-editor-moves.sh'
        - 'scripts/editor-coverage.mjs'
        - 'scripts/extract-editor-script.mjs'
        - 'src/test/javascript/editor-build/check-editor.test.js'
        - 'src/test/javascript/editor-build/check-editor-statements.test.js'
        - 'src/test/javascript/editor-build/check-editor-layers.test.js'
        - 'src/test/javascript/editor-build/check-editor-moves.test.js'
      acceptance_criteria:
        - 'a refactor: move commit and a non-move commit are told apart on repositories whose commits hold no page, and the output of check-editor-moves.sh is unchanged'
        - 'node scripts/check-editor.mjs --layers exits 0; editor-coverage.mjs and extract-editor-script.mjs read target/editor-webapp/standalone.html, and the extraction writes target/eslint-editor/page.js'
        - 'no script of the list names src/main/resources/editor-webapp, and scripts/editor-coverage-floor.json and src/main/editor/layers.json are untouched'
      verification:
        - 'node --test src/test/javascript/editor-build/check-editor.test.js src/test/javascript/editor-build/check-editor-statements.test.js src/test/javascript/editor-build/check-editor-layers.test.js src/test/javascript/editor-build/check-editor-moves.test.js'
        - 'node scripts/check-editor.mjs --layers'
        - 'bash -c ''set -e; npm run editor:build >/dev/null; node scripts/extract-editor-script.mjs; test -s target/eslint-editor/page.js'''
        - '! grep -n "src/main/resources/editor-webapp" scripts/check-editor.mjs scripts/check-editor-moves.sh scripts/editor-coverage.mjs scripts/extract-editor-script.mjs'
        - 'grep -q "target/editor-webapp" scripts/editor-coverage.mjs && grep -q "target/editor-webapp" scripts/extract-editor-script.mjs'
        - 'node --check scripts/editor-coverage.mjs'
        - 'bash -n scripts/check-editor-moves.sh'
        - 'npx prettier --check scripts/check-editor.mjs scripts/editor-coverage.mjs scripts/extract-editor-script.mjs src/test/javascript/editor-build/check-editor.test.js src/test/javascript/editor-build/check-editor-statements.test.js src/test/javascript/editor-build/check-editor-layers.test.js src/test/javascript/editor-build/check-editor-moves.test.js'
        - 'npx eslint --max-warnings 0 scripts/check-editor.mjs scripts/editor-coverage.mjs scripts/extract-editor-script.mjs src/test/javascript/editor-build/check-editor.test.js src/test/javascript/editor-build/check-editor-statements.test.js src/test/javascript/editor-build/check-editor-layers.test.js src/test/javascript/editor-build/check-editor-moves.test.js'
      escalation_triggers:
        - 'the statements of a revision cannot be taken from its sources without a built asset (the extraction needs a real hash): stop and log it (DEC-4b)'
        - 'check-editor-moves.sh must change its usage or its output to work: stop and log it (IF-5)'
        - 'the coverage floor or ratchet.max would have to move: stop and log it (CON-5)'
      suggested_subagent_type: 'general-purpose'
      suggested_model: '(default)'
      suggested_effort: 'medium'
    - task_id: task-004
      agent_role: 'Test Generation Agent'
      objective: 'Replace, in the node tests that name src/main/resources/editor-webapp (the list of the outputs), the path each builds for itself by the constants and readPage of src/test/javascript/viewpoint-kernel/editor-files.js, a mechanical change (a codemod run by a script of your own in the scratchpad is fine, then read the diff of every file with an unusual shape: conformance.test.js, site.test.js, remote-import.test.js, the sample and bundle tests). Keep the git show <tag>:src/main/resources/editor-webapp/standalone.html strings of the four tests of older tags, and make plateau-matrix-page.test.js read the tag archicode-0.25.0 (DEC-5; the page of that tag equals that of 7742b07) with a skip and a message when the tag is absent. Do not touch the files of task-001 to task-003 (the editor-build tests of the build and the checks), nor changes-map.test.js (task-007).'
      context:
        prd_excerpts:
          - 'none: there is no PRD (profile TDD+pln); the REQ-n of the TDD are listed with the TDD items'
        tdd_excerpts:
          - 'REQ-4, REQ-7, TG-4, CON-2, DEC-5, DEC-6, IMP-9, RISK-4, RISK-6, resolution F10 of the preamble of this plan (the TDD file of this run)'
      likely_files:
        - 'src/test/javascript/viewpoint-kernel/*.test.js'
        - 'src/test/javascript/map-highlight-diagram.test.js'
        - 'src/test/javascript/site.test.js'
        - 'src/test/javascript/editor-build/remote-import.test.js'
      acceptance_criteria:
        - 'the only files of src/test/javascript that still name main/resources/editor-webapp are the five tests that read git show <tag>: and the check-editor tests of task-003 (a fixed commit)'
        - 'the tests of the verification list pass on the freshly built folder, so a reader that built its own path is not left behind'
        - 'a test run with no build prints the one line of the helper, not a stack trace of readFileSync'
      verification:
        - 'npm run editor:build'
        - 'test -z "$(grep -rl "main/resources/editor-webapp" src/test/javascript | grep -vE "(story-player-scene|save-keeps-the-brackets|save-keeps-quotes-and-comments|delete-plateau-as-released|plateau-matrix-page|check-editor[a-z-]*)[.]test[.]js$")"'
        - 'node --test src/test/javascript/viewpoint-kernel/conformance.test.js src/test/javascript/viewpoint-kernel/plateau-matrix-page.test.js src/test/javascript/viewpoint-kernel/story-player-scene.test.js src/test/javascript/viewpoint-kernel/save-keeps-the-brackets.test.js src/test/javascript/viewpoint-kernel/save-keeps-quotes-and-comments.test.js src/test/javascript/viewpoint-kernel/delete-plateau-as-released.test.js'
        - 'node --test src/test/javascript/site.test.js src/test/javascript/editor-build/remote-import.test.js src/test/javascript/viewpoint-kernel/sample-brightcart.test.js src/test/javascript/viewpoint-kernel/sample-archicode.test.js src/test/javascript/viewpoint-kernel/sample-landing.test.js src/test/javascript/viewpoint-kernel/bundle-flows.test.js'
        - 'npx prettier --check "src/test/javascript/viewpoint-kernel/*.js" src/test/javascript/map-highlight-diagram.test.js src/test/javascript/site.test.js src/test/javascript/editor-build/remote-import.test.js'
        - 'npx eslint --max-warnings 0 "src/test/javascript/viewpoint-kernel/*.js" src/test/javascript/map-highlight-diagram.test.js src/test/javascript/site.test.js src/test/javascript/editor-build/remote-import.test.js'
      escalation_triggers:
        - 'a test builds a tree of its own with the old layout (copies the committed page or assets) and cannot read the helper without changing what it proves: stop and log the file, do not weaken the test'
        - 'the tag archicode-0.25.0 is absent from the clone or its page differs from that of 7742b07: record an environment gap for plateau-matrix-page.test.js, never a pass'
        - 'more than ten files need a hand edit beyond the path: stop and log the list (RISK-6)'
      suggested_subagent_type: 'general-purpose'
      suggested_model: '(default)'
      suggested_effort: 'medium'
    - task_id: task-005
      agent_role: 'Infrastructure Agent'
      objective: 'Edit pom.xml by anchor after a re-read (the working tree holds the antrun block of run 0231, uncommitted) as DEC-1, DEC-2 and DEC-3 say, with resolution F9: add the execution page at generate-resources to the same maven-antrun-plugin 3.2.0 block, its target re-declaring <property environment="env"/>, failing with one line that names Node.js when node or npm is not on ${env.PATH}, then running npm ci --no-audit --no-fund, node scripts/build-editor.mjs and node scripts/build-sample.mjs from ${project.basedir}, unconditionally (Ant exec has no unless, DEC-3). Widen the exclusion of the first resource to editor-webapp/** and add the resource target/editor-webapp with targetPath editor-webapp. Add /src/main/resources/editor-webapp/ to .gitignore. Do not git rm anything (task-008). Build the jar with JDK 25 and check the contents against the folder and against 7742b07; check the failure without node with a PATH of symlinks to the tools the Maven wrapper needs and no node (run only the execution: ./mvnw -o antrun:run@page; add a tool to the list when the wrapper reports it missing, never node or npm); report the time of a clean-folder build.'
      context:
        prd_excerpts:
          - 'none: there is no PRD (profile TDD+pln); the REQ-n of the TDD are listed with the TDD items'
        tdd_excerpts:
          - 'REQ-2, REQ-3, TG-1, TG-2, TG-3, ASM-1, ASM-3, ASM-4, CON-1, CON-3, CON-6, DEC-1, DEC-2, DEC-3, CTR-1, CTR-4, IF-1, FLOW-1, IMP-1, RISK-2, RISK-3, RISK-7, resolution F9 of the preamble of this plan (the TDD file of this run)'
      likely_files:
        - 'pom.xml'
        - '.gitignore'
      acceptance_criteria:
        - 'the jar holds editor-webapp/standalone.html, assets/codemirror.js, assets/elk.js, assets/viewpoint_kernel.js, assets/THIRD-PARTY-NOTICES.txt, samples/brightcart.yaml and samples/archicode.yaml with the bytes of target/editor-webapp (not those of a stale file under src), and the .wasm of target/kernel'
        - 'the built page and scripts are byte-identical to the files of 7742b07 (REQ-3), and samples/brightcart.yaml too'
        - 'without node on the PATH the execution fails with exactly one [ERROR] line holding the sentence that names Node.js and no at org. line; the record says what the count printed if it is not 1 and keeps the intent'
        - 'the kernel execution, Chicory, Quarkus, Failsafe, JaCoCo and the native profile are untouched; .gitignore ignores the old folder'
      verification:
        - 'JAVA_HOME=$HOME/.sdkman/candidates/java/25.0.4-tem ./mvnw --batch-mode -q package -Dmaven.test.skip -Dplugin.asciidoctor.skip=true'
        - 'bash -c ''set -e; for f in standalone.html assets/codemirror.js assets/elk.js assets/viewpoint_kernel.js assets/THIRD-PARTY-NOTICES.txt samples/brightcart.yaml samples/archicode.yaml; do unzip -p target/quarkus-app/app/archicode-*.jar editor-webapp/$f | cmp - target/editor-webapp/$f; done; unzip -p target/quarkus-app/app/archicode-*.jar editor-webapp/assets/viewpoint_kernel.wasm | cmp - target/kernel/viewpoint_kernel.wasm'''
        - 'test "$(unzip -l target/quarkus-app/app/archicode-*.jar | grep -cE "editor-webapp/(standalone.html|assets/(codemirror|elk|viewpoint_kernel).js|samples/(brightcart|archicode).yaml)")" -eq 6'
        - 'bash -c ''set -e; for f in standalone.html assets/codemirror.js assets/elk.js assets/viewpoint_kernel.js assets/THIRD-PARTY-NOTICES.txt samples/brightcart.yaml; do git show 7742b07:src/main/resources/editor-webapp/$f | cmp - target/editor-webapp/$f; done'''
        - 'bash -c ''d=$(mktemp -d); for t in java bash sh env uname dirname basename cat tr sed grep head mkdir rm ls wc cut cmp mv cp mktemp date sleep awk; do p=$(command -v $t) && ln -s "$p" "$d/$t"; done; if JAVA_HOME=$HOME/.sdkman/candidates/java/25.0.4-tem PATH="$d" ./mvnw --batch-mode -o antrun:run@page > "$d/out.txt" 2>&1; then exit 1; fi; test "$(grep -c "^.ERROR.*Node.js is not installed" "$d/out.txt")" -eq 1 && ! grep -q "^[[:space:]]*at org[.]" "$d/out.txt"'''
        - 'grep -q "scripts/build-editor.mjs" pom.xml && grep -q "scripts/build-sample.mjs" pom.xml && grep -qF "<exclude>editor-webapp/**</exclude>" pom.xml && grep -qF "${project.build.directory}/editor-webapp" pom.xml'
        - 'grep -qxF "/src/main/resources/editor-webapp/" .gitignore'
        - 'git check-ignore -q --no-index src/main/resources/editor-webapp/standalone.html'
        - 'test -z "$(git diff -U0 -- pom.xml | grep -E "^[-+]" | grep -E "chicory|quarkus-maven|failsafe|jacoco|<profile>")"'
      escalation_triggers:
        - 'the antrun failure without node is not one line without a stack trace: record the measured output, try the property and fail forms, stop and log it if none works (DEC-2)'
        - 'the jar copy of a file differs from target/editor-webapp, or the page differs from 7742b07: stop and log it, never copy a file by hand'
        - 'npm ci cannot run (no network and a cold cache): record an environment gap for every check that needs the build, never a pass'
        - 'an edit would drop a line of run 0231 in pom.xml, or a plugin outside the list would have to change: stop and log it (edit by anchors, diff before and after)'
      suggested_subagent_type: 'general-purpose'
      suggested_model: '(default)'
      suggested_effort: 'high'
    - task_id: task-006
      agent_role: 'Backend Implementation Agent'
      objective: 'Make the Java tests and the end-to-end suite read target/editor-webapp as DEC-6 says. Add the test helper EditorFiles.java (PAGE, ASSETS, SAMPLES as Path under target/editor-webapp, a failure message naming the path and npm run editor:build when a read finds nothing) and use it in the five Java classes that read a file; reword the assertion messages that say as committed. In src/test/e2e/harness.js point PAGE, SAMPLE and ASSETS at the folder and make ASSET_ROUTES throw the one line of advice when the folder is missing (a missing build must not become a 404 that the specs explain badly); hosted.js and editor-offline.spec.js follow. The Playwright specs are not run here (the end-to-end suite is a gate of the phase, never a task): list them, and run only the Java classes of the verification list.'
      context:
        prd_excerpts:
          - 'none: there is no PRD (profile TDD+pln); the REQ-n of the TDD are listed with the TDD items'
        tdd_excerpts:
          - 'REQ-4, REQ-7, TG-4, CON-2, CON-3, CON-6, DEC-6, IF-3, IF-4, IMP-10, IMP-11 (the TDD file of this run)'
      likely_files:
        - 'src/test/java/io/morin/archicode/EditorFiles.java'
        - 'src/test/java/io/morin/archicode/cli/EditorHttpServerTest.java'
        - 'src/test/java/io/morin/archicode/it/EditorServeIT.java'
        - 'src/test/java/io/morin/archicode/cli/GuideViewPropertiesTest.java'
        - 'src/test/java/io/morin/archicode/manifest/EditorReadSchemaTest.java'
        - 'src/test/java/io/morin/archicode/brightcart/BrightcartSampleTest.java'
        - 'src/test/e2e/harness.js'
        - 'src/test/e2e/hosted.js'
        - 'src/test/e2e/editor-offline.spec.js'
      acceptance_criteria:
        - 'the five Java classes pass reading target/editor-webapp, and EditorServeIT compiles and compares the served assets with that folder'
        - 'no file of src/test/java or src/test/e2e names main/resources/editor-webapp; the Java helper passes PMD and the format check'
        - 'npx playwright test --list loads every spec with the new harness; with no build the harness throws one line instead of an empty route table'
      verification:
        - 'JAVA_HOME=$HOME/.sdkman/candidates/java/25.0.4-tem ./mvnw --batch-mode -q test -Dplugin.asciidoctor.skip=true -Dsurefire.failIfNoSpecifiedTests=false -Dtest=EditorHttpServerTest,GuideViewPropertiesTest,EditorReadSchemaTest,BrightcartSampleTest,NativeReflectionConfigTest'
        - 'JAVA_HOME=$HOME/.sdkman/candidates/java/25.0.4-tem ./mvnw --batch-mode -q test-compile pmd:check -Dplugin.asciidoctor.skip=true'
        - '! grep -rn "main/resources/editor-webapp" src/test/java src/test/e2e'
        - 'grep -q "target/editor-webapp" src/test/e2e/harness.js && grep -q "npm run editor:build" src/test/e2e/harness.js'
        - 'npx playwright test --list --project=chromium'
        - 'npx prettier --check src/test/java/io/morin/archicode/EditorFiles.java src/test/java/io/morin/archicode/cli/EditorHttpServerTest.java src/test/java/io/morin/archicode/it/EditorServeIT.java src/test/java/io/morin/archicode/cli/GuideViewPropertiesTest.java src/test/java/io/morin/archicode/manifest/EditorReadSchemaTest.java src/test/java/io/morin/archicode/brightcart/BrightcartSampleTest.java src/test/e2e/harness.js src/test/e2e/hosted.js src/test/e2e/editor-offline.spec.js'
        - 'npx eslint --max-warnings 0 src/test/e2e'
      escalation_triggers:
        - 'a Java test reads the file through the classpath on purpose (the packaged jar) and must not move: leave it and log why'
        - 'a spec depends on the page being at the old path in a way the harness cannot hide: stop and log it (CON-2)'
        - 'PMD flags the helper in a way that needs a rule turned off: stop and log it, never add a NOPMD or a SuppressWarnings (CLAUDE.md)'
      suggested_subagent_type: 'general-purpose'
      suggested_model: '(default)'
      suggested_effort: 'medium'
    - task_id: task-007
      agent_role: 'Release Agent'
      objective: 'Edit .github/workflows/ci-build.yaml by anchors after a re-read (the working tree holds run 0231 edits, uncommitted) and the job map, as DEC-7, CTR-3 and IMP-12 say with resolutions F3 and F4. The jobs of the file that run ./mvnw are Java (verify), E2E (package), Build (deploy twice, then the new process-resources step) and Native (verify -Dnative on three targets); list them in your result with the step that makes Node available in each. Add the "Set up Node.js" step (setup-node@v4, 22, npm cache) to Java, Build and Native before their first ./mvnw step, with no if on Build and no npm ci step (Maven runs it); add the process-resources step to Build before Assemble website with the same if; make Assemble website copy and cmp from target/editor-webapp/ and drop the six lines that name src/main/resources/editor-webapp; remove the sample step of Page and rename the editor step. In scripts/changes.mjs remove R-07a, widen R-05, R-16 and R-20 to Java, Page and E2E, and add the rule for harness.js and editor-files.js before R-18; update changes-map.test.js (write its changed rows first, red, then the rules). Do not start a workflow dispatch; the website step and the native targets other than ubuntu-24.04 are proved only by a tag run, which the prg lists as unproved.'
      context:
        prd_excerpts:
          - 'none: there is no PRD (profile TDD+pln); the REQ-n of the TDD are listed with the TDD items'
        tdd_excerpts:
          - 'REQ-5, REQ-7, TG-6, ASM-4, ASM-5, DEC-7, CTR-3, FLOW-3, IMP-7, IMP-12, RISK-1, RISK-8, resolution F3 and F4 of the preamble of this plan (the TDD file of this run)'
      likely_files:
        - '.github/workflows/ci-build.yaml'
        - 'scripts/changes.mjs'
        - 'src/test/javascript/changes-map.test.js'
      acceptance_criteria:
        - 'each of Java, E2E, Build and Native has a "Set up Node.js" step before its first ./mvnw step, Page has its own, and the step of Build has no if'
        - 'the range from Assemble website to Publish website names no src/main/resources/editor-webapp, copies from target/editor-webapp and still compares each file with cmp; the process-resources step has the same if as Assemble website and comes before it'
        - 'the sample step of Page is gone and the editor step is renamed; changes-map.test.js passes, R-07a is gone, and a path that falls to no rule still runs all four jobs'
      verification:
        - 'python3 -c "import yaml; yaml.safe_load(open(''.github/workflows/ci-build.yaml''))"'
        - 'python3 -c "import yaml; d=yaml.safe_load(open(''.github/workflows/ci-build.yaml'')); j=d[''jobs'']; n=lambda k: [s.get(''name'') for s in j[k][''steps'']]; f=lambda k: [i for i,s in enumerate(j[k][''steps'']) if ''./mvnw'' in str(s.get(''run'',''''))][0]; assert all(''Set up Node.js'' in n(k) and n(k).index(''Set up Node.js'') < f(k) for k in [''Java'',''E2E'',''Build'',''Native'']); assert ''Set up Node.js'' in n(''Page''); assert ''if'' not in [s for s in j[''Build''][''steps''] if s.get(''name'')==''Set up Node.js''][0]"'
        - 'python3 -c "import yaml; d=yaml.safe_load(open(''.github/workflows/ci-build.yaml'')); s=d[''jobs''][''Build''][''steps'']; a=[x for x in s if x.get(''name'')==''Assemble website''][0]; p=[x for x in s if ''process-resources'' in str(x.get(''run'',''''))][0]; assert p.get(''if'')==a.get(''if'') and s.index(p) < s.index(a)"'
        - 'test "$(sed -n "/Assemble website/,/Publish website/p" .github/workflows/ci-build.yaml | grep -c "src/main/resources/editor-webapp")" -eq 0'
        - 'test "$(sed -n "/Assemble website/,/Publish website/p" .github/workflows/ci-build.yaml | grep -c "target/editor-webapp")" -ge 3'
        - 'test "$(grep -c "Check the samples are the bundles of their folders" .github/workflows/ci-build.yaml)" -eq 0'
        - 'test "$(grep -c "Check the editor page is the assembly of its parts" .github/workflows/ci-build.yaml)" -eq 0 && grep -q "Check the editor sources assemble" .github/workflows/ci-build.yaml'
        - '! grep -n "R-07a" scripts/changes.mjs'
        - 'node --test src/test/javascript/changes-map.test.js'
        - 'node scripts/changes.mjs --list'
        - 'npx prettier --check scripts/changes.mjs src/test/javascript/changes-map.test.js'
        - 'npx eslint --max-warnings 0 scripts/changes.mjs src/test/javascript/changes-map.test.js'
      escalation_triggers:
        - 'the step Assemble website needs more than a change of the folder it reads (the stamp sed, the grep of the stamp or the publish step would have to change): stop and log it'
        - 'an edit would drop a line of another run in ci-build.yaml: edit by anchors, diff before and after'
        - 'changes-map.test.js audits a rule against a reader in a way this task cannot satisfy without widening a rule further: stop and log it (CTR-3)'
        - 'a job other than the four needs Node (the Kernel job runs the page build): stop and log it'
      suggested_subagent_type: 'general-purpose'
      suggested_model: '(default)'
      suggested_effort: 'high'
    - task_id: task-008
      agent_role: 'Refactoring Agent'
      objective: 'Do the removal of IMP-2 now that every reader and the pom read the folder (tasks 004 to 007): git rm -r -f the seven tracked files of src/main/resources/editor-webapp (the sample archicode.yaml has an uncommitted change from run 0231, hence -f; the build rewrites it), delete the folder from the working tree, edit .prettierignore, and apply DEC-10 to the model of ArchiCode (the two tags.path and the description), because ArchitectureDriftTest fails when a tags.path does not exist. Then prove nothing needs the old folder: rebuild twice with npm run editor:build and check that the folder never comes back, that git status is the same after each build, and that the five files and the brightcart sample still equal the bytes of 7742b07. Do not run npm run sample:build to write a sample into git (the sample is built, nothing is committed).'
      context:
        prd_excerpts:
          - 'none: there is no PRD (profile TDD+pln); the REQ-n of the TDD are listed with the TDD items'
        tdd_excerpts:
          - 'REQ-1, REQ-7, TG-1, CON-4, DEC-1, DEC-10, CTR-1, IMP-2, IMP-13, RISK-3 (the TDD file of this run)'
      likely_files:
        - 'src/main/resources/editor-webapp'
        - '.prettierignore'
        - 'docs/architecture/manifests/archicode.yaml'
        - 'src/test/javascript/architecture/impact-questions.json'
      acceptance_criteria:
        - 'git ls-files src/main/resources/editor-webapp prints nothing and git ls-files | grep -c viewpoint_kernel prints 0'
        - 'two builds in a row leave git status identical and never recreate src/main/resources/editor-webapp; the built bytes are still those of 7742b07'
        - 'ArchitectureDriftTest, ArchitectureImpactTest and the node architecture test pass; the questions Q03 and Q04 of impact-questions.json hold without a change'
      verification:
        - 'git rm -r -f -q --ignore-unmatch src/main/resources/editor-webapp && rm -rf src/main/resources/editor-webapp'
        - 'test -z "$(git ls-files src/main/resources/editor-webapp)" && test "$(git ls-files | grep -c viewpoint_kernel)" -eq 0'
        - 'bash -c ''set -e; npm run editor:build >/dev/null; test ! -e src/main/resources/editor-webapp; a=$(git status --short | md5sum); npm run editor:build >/dev/null; test "$a" = "$(git status --short | md5sum)"; test ! -e src/main/resources/editor-webapp'''
        - 'bash -c ''set -e; for f in standalone.html assets/codemirror.js assets/elk.js assets/viewpoint_kernel.js assets/THIRD-PARTY-NOTICES.txt samples/brightcart.yaml; do git show 7742b07:src/main/resources/editor-webapp/$f | cmp - target/editor-webapp/$f; done'''
        - '! grep -n "src/main/resources/editor-webapp" .prettierignore'
        - 'grep -qF "src/main/editor/page.html" docs/architecture/manifests/archicode.yaml && ! grep -n "src/main/resources/editor-webapp" docs/architecture/manifests/archicode.yaml'
        - 'node --test src/test/javascript/architecture-model.test.js src/test/javascript/site.test.js src/test/javascript/editor-build/remote-import.test.js src/test/javascript/viewpoint-kernel/sample-archicode.test.js'
        - 'JAVA_HOME=$HOME/.sdkman/candidates/java/25.0.4-tem ./mvnw --batch-mode -q test -Dplugin.asciidoctor.skip=true -Dsurefire.failIfNoSpecifiedTests=false -Dtest=ArchitectureDriftTest,ArchitectureImpactTest'
      escalation_triggers:
        - 'a test or script still reads the old folder and fails now that it is gone: stop, log the file, send it back to the owning task, never restore the committed file'
        - 'ArchitectureImpactTest changes its answer because of the tags.path edit: stop and log it (no relationship may change, DEC-10)'
        - 'the folder comes back after a build: stop and log which script writes it'
      suggested_subagent_type: 'general-purpose'
      suggested_model: '(default)'
      suggested_effort: 'medium'
    - task_id: task-009
      agent_role: 'Documentation Agent'
      objective: 'Rewrite the sentences of the eight documents of the outputs so that each states what is true now (the page, the bundles, the kernel script and the samples are made by the build into target/editor-webapp; ./mvnw and npm run editor:build make them; no file of them is in git) with no history of how it was and without the word committed on a line that also says standalone, assets, wasm, bundle, sample or page (resolution F1: write built, made by the build, not in git). Read each of the three CLAUDE.md the gate greps, and src/test/CLAUDE.md and .github/CLAUDE.md, which hold no line the grep finds but name the sample check and the folder (resolution F6); the rule of the root file to run npm run sample:build after a change under docs/architecture goes (the sample is built). Add the third way to the manual. Do not edit the TDD or the wave documents.'
      context:
        prd_excerpts:
          - 'none: there is no PRD (profile TDD+pln); the REQ-n of the TDD are listed with the TDD items'
        tdd_excerpts:
          - 'REQ-6, TG-7, DEC-8, DEC-9, IMP-14, resolutions F1 and F6 of the preamble of this plan (the TDD file of this run)'
      likely_files:
        - 'CLAUDE.md'
        - 'src/main/editor/CLAUDE.md'
        - 'src/test/CLAUDE.md'
        - '.github/CLAUDE.md'
        - 'src/main/rust/viewpoint-kernel/CLAUDE.md'
        - 'src/main/rust/viewpoint-kernel/README.md'
        - 'README.md'
        - 'src/doc/README.adoc'
      acceptance_criteria:
        - 'the grep of the gate over CLAUDE.md, src/main/editor/CLAUDE.md and src/main/rust/viewpoint-kernel/CLAUDE.md prints nothing, and the same kind of grep over the other four documents prints nothing'
        - 'the manual says how to get the page without the editor server or the website, and manual-howto.test.js and CommandReferenceTest pass'
        - 'no document names sample:check, the rule R-07a or a step that task-007 removed or renamed; none states history (wave, run, issue, date)'
      verification:
        - 'test -z "$(grep -n "committed" CLAUDE.md src/main/editor/CLAUDE.md src/main/rust/viewpoint-kernel/CLAUDE.md | grep -E "standalone|assets|wasm|bundle|sample|page")"'
        - 'test -z "$(grep -n -i "committed" src/test/CLAUDE.md .github/CLAUDE.md src/main/rust/viewpoint-kernel/README.md README.md | grep -iE "standalone|editor-webapp|viewpoint_kernel|codemirror|elk[.]js|brightcart[.]yaml|archicode[.]yaml|the page|the samples|the bundles")"'
        - 'grep -n "target/editor-webapp" src/doc/README.adoc'
        - 'grep -c "target/editor-webapp" CLAUDE.md src/main/editor/CLAUDE.md src/test/CLAUDE.md .github/CLAUDE.md'
        - '! grep -n "after any change under .docs/architecture. run" CLAUDE.md'
        - '! git grep -n "sample:check" -- . ":!docs/wav"'
        - '! grep -n "R-07a" .github/CLAUDE.md src/test/CLAUDE.md'
        - 'node --test src/test/javascript/manual-howto.test.js'
        - 'JAVA_HOME=$HOME/.sdkman/candidates/java/25.0.4-tem ./mvnw --batch-mode -q test -Dplugin.asciidoctor.skip=true -Dsurefire.failIfNoSpecifiedTests=false -Dtest=CommandReferenceTest'
      escalation_triggers:
        - 'a sentence cannot be made true without a fact the run did not establish (for example the time a CI job takes): leave it out, do not invent it'
        - 'the manual test pins a sentence the new paragraph would break: stop and log it'
      suggested_subagent_type: 'general-purpose'
      suggested_model: '(default)'
      suggested_effort: 'medium'
    - task_id: task-010
      agent_role: 'QA Agent'
      objective: 'Prove gates 1, 2, 3, 5 and 6 of phase P2 on the tree the tasks left, once, and write what was measured and what is not provable. Run the verification list in order: remove target and node_modules, build the jar with JDK 25 (Maven runs npm ci itself), check the six files of the jar, compare the built page, scripts, notice file and brightcart sample with commit 7742b07 and archicode.yaml with the same file (it differs by the two lines run 0231 retagged, counted as 2 removed and 2 added, and the lines of the model edit of task-008; list the differing lines in the Findings, resolution F8: no commit closes run 0231, so the baseline of the retag is the working tree), check the tracked files, the grep for the old folder, the failure without node (adding a tool to the PATH of symlinks when the wrapper names it missing, never node or npm), the repeat build, and the website range. Time the clean build and an up-to-date build. Write the Findings paragraph in the prg. This task does not run the Stage 11 suites, the Playwright specs or byte-identity.sh, and starts no workflow dispatch; it does not commit.'
      context:
        prd_excerpts:
          - 'none: there is no PRD (profile TDD+pln); the REQ-n of the TDD are listed with the TDD items'
        tdd_excerpts:
          - 'REQ-1, REQ-2, REQ-3, REQ-5, REQ-6, ASM-3, ASM-4, ASM-6, Q-1, RISK-1, RISK-8, resolutions F5 and F8 of the preamble of this plan (the TDD file of this run)'
      likely_files:
        - 'docs/wav/wav-035-maven-builds-kernel-and-page-likec4-import/run/run-0232-editor-page-built-by-maven/prg-0232-editor-page-built-by-maven.md'
      acceptance_criteria:
        - 'the clean build exits 0, the jar holds the six files, and the built page, three scripts, notice file and brightcart sample are byte-identical to the files of commit 7742b07'
        - 'the failure without node is one [ERROR] line naming Node.js with no stack trace, and two builds leave git status unchanged'
        - 'the prg Findings give the figures, the differing lines of archicode.yaml with their cause, and a list of what only a tag run proves (Q-1) with the reason for each'
      verification:
        - 'rm -rf target node_modules'
        - 'JAVA_HOME=$HOME/.sdkman/candidates/java/25.0.4-tem ./mvnw --batch-mode package -Dmaven.test.skip -Dplugin.asciidoctor.skip=true'
        - 'test "$(unzip -l target/quarkus-app/app/archicode-*.jar | grep -cE "editor-webapp/(standalone.html|assets/(codemirror|elk|viewpoint_kernel).js|samples/(brightcart|archicode).yaml)")" -eq 6'
        - 'bash -c ''set -e; for f in standalone.html assets/codemirror.js assets/elk.js assets/viewpoint_kernel.js assets/THIRD-PARTY-NOTICES.txt samples/brightcart.yaml; do git show 7742b07:src/main/resources/editor-webapp/$f | cmp - target/editor-webapp/$f; done'''
        - 'bash -c ''git show 7742b07:src/main/resources/editor-webapp/samples/archicode.yaml | diff - target/editor-webapp/samples/archicode.yaml > target/archicode-sample.diff; test $? -le 1'''
        - 'test -z "$(git ls-files src/main/resources/editor-webapp)" && test "$(git ls-files | grep -c viewpoint_kernel)" -eq 0'
        - 'test "$(git grep --untracked -l "src/main/resources/editor-webapp" -- . ":!docs/wav" | grep -vcE "^(.gitignore|src/test/javascript/viewpoint-kernel/(story-player-scene|save-keeps-the-brackets|save-keeps-quotes-and-comments|delete-plateau-as-released|plateau-matrix-page)[.]test[.]js|src/test/javascript/editor-build/check-editor[a-z-]*[.]test[.]js)$")" -eq 0'
        - 'bash -c ''d=$(mktemp -d); for t in java bash sh env uname dirname basename cat tr sed grep head mkdir rm ls wc cut cmp mv cp mktemp date sleep awk; do p=$(command -v $t) && ln -s "$p" "$d/$t"; done; if JAVA_HOME=$HOME/.sdkman/candidates/java/25.0.4-tem PATH="$d" ./mvnw --batch-mode -o antrun:run@page > "$d/out.txt" 2>&1; then exit 1; fi; test "$(grep -c "^.ERROR.*Node.js is not installed" "$d/out.txt")" -eq 1 && ! grep -q "^[[:space:]]*at org[.]" "$d/out.txt"'''
        - 'bash -c ''set -e; npm run editor:build >/dev/null; a=$(git status --short | md5sum); npm run editor:build >/dev/null; test "$a" = "$(git status --short | md5sum)"'''
        - 'test "$(sed -n "/Assemble website/,/Publish website/p" .github/workflows/ci-build.yaml | grep -c "src/main/resources/editor-webapp")" -eq 0'
        - 'test -s docs/wav/wav-035-maven-builds-kernel-and-page-likec4-import/run/run-0232-editor-page-built-by-maven/prg-0232-editor-page-built-by-maven.md && grep -q "unproved" docs/wav/wav-035-maven-builds-kernel-and-page-likec4-import/run/run-0232-editor-page-built-by-maven/prg-0232-editor-page-built-by-maven.md'
      escalation_triggers:
        - 'the clean build fails for a reason inside the run (a reader, the pom, a script): stop, log the failing output and send it to the owning task; never repair the file here'
        - 'the built page differs from the file of 7742b07 and no change of src/main/editor explains it: stop and log it (REQ-3)'
        - 'npm ci cannot run (no network, cold cache): record an environment gap for every check that needs the build, never a pass'
      suggested_subagent_type: 'general-purpose'
      suggested_model: '(default)'
      suggested_effort: 'medium'
```

## 10. Verification Plan

Testing by zone for this run. A task runs only the fast checks of the files it changes. The whole suites run once, at Stage 11 of complete-run, and the end-to-end suite and the byte-identity harness belong to the phase gate of the wave; no task lists them.

| Zone | Per task | Once per run (Stage 11) | At the phase gate |
| --- | --- | --- | --- |
| Build scripts and node tests | `node --test` of the files the task changes, Prettier and ESLint on them | `npm run test:unit`, `npm run test:coverage`, `npm run format:check`, `npm run lint` | none |
| Java | the test classes the task changes, `test-compile pmd:check` once in task-006 | `./mvnw test-compile pmd:check`, `./mvnw verify -DskipITs=false` | none |
| Maven build and jar | `package -Dmaven.test.skip` in task-005 and task-010 (Maven runs `npm ci`; needs the network or a warm npm cache) | the same builds inside `verify` | `rm -rf target node_modules` build (gate 2) |
| End-to-end | `npx playwright test --list` in task-006 | none | `editor-offline.spec.js` on chromium and firefox (gate 4), then the whole suite as CI runs it |
| Byte identity | none | none | `scripts/byte-identity.sh` with `scripts/byte-identity-exceptions.txt` unchanged (gate 7) |
| CI workflow | YAML parse and structure asserts in task-007 | none | only a pull request run and a tag run prove it (Q-1) |

Last measure: the starting repository was inspected while drafting on the date of this plan; no suite was run (the figures come from the TDD spikes: bundles and page 0.32 s, samples 0.07 s, `npm ci` 0.6 s warm).

```yaml
verification_plan:
  checks:
    - task_id: task-001
      methods:
        - 'unit tests of the build script'
        - 'cmp of the built files with commit 7742b07'
        - '--check and --check-identical'
        - 'format check and lint'
      success_criteria:
        - 'the five built files are byte-identical to 7742b07 and nothing is written under src/main/resources/editor-webapp'
        - 'the source-only modes run on a tree where nothing is built'
    - task_id: task-002
      methods:
        - 'unit tests of the helper, the sample script and the harness'
        - 'npm run editor:build twice'
        - 'cmp of the samples'
        - 'grep of package.json'
        - 'format check and lint'
      success_criteria:
        - 'brightcart.yaml equals the file of 7742b07 and archicode.yaml the working-tree file'
        - 'two builds leave git status unchanged'
    - task_id: task-003
      methods:
        - 'unit tests of the four check files'
        - 'check-editor --layers'
        - 'extraction of the page script'
        - 'grep of the old path'
        - 'format check and lint'
      success_criteria:
        - 'a move and a non-move are told apart on commits with no page'
        - 'no script of the list names the old folder'
    - task_id: task-004
      methods:
        - 'grep of the old path over the node tests'
        - 'a subset of the node suite on the built folder'
        - 'format check and lint'
      success_criteria:
        - 'only the tag readers and the fixed-commit tests still name the old path'
        - 'the subset passes on the folder'
    - task_id: task-005
      methods:
        - 'Maven package without tests with JDK 25'
        - 'cmp of the jar files with target/editor-webapp and of the folder with 7742b07'
        - 'a controlled PATH without node'
        - 'grep of the pom and .gitignore'
      success_criteria:
        - 'the jar holds the six files and the .wasm with the bytes of the build'
        - 'without node: one [ERROR] line naming Node.js and no stack trace'
    - task_id: task-006
      methods:
        - 'the Java test classes the task changes'
        - 'test-compile pmd:check'
        - 'grep of the old path'
        - 'playwright --list'
        - 'format check and lint'
      success_criteria:
        - 'the five Java classes pass on the folder, PMD passes on the helper'
        - 'no Java or e2e file names the old folder'
    - task_id: task-007
      methods:
        - 'YAML parse and structure asserts'
        - 'sed range of Assemble website'
        - 'changes-map.test.js'
        - 'format check and lint'
      success_criteria:
        - 'Node is before the first ./mvnw in four jobs, the website range reads target/editor-webapp, the map test passes'
    - task_id: task-008
      methods:
        - 'git ls-files'
        - 'two builds and git status'
        - 'cmp of the built files'
        - 'the node and Java architecture tests'
      success_criteria:
        - 'no tracked file under src/main/resources/editor-webapp, the folder never comes back, the model tests pass'
    - task_id: task-009
      methods:
        - 'greps of the documents'
        - 'manual-howto.test.js and CommandReferenceTest'
      success_criteria:
        - 'the REQ-6 grep prints nothing, the manual names target/editor-webapp, no document names sample:check'
    - task_id: task-010
      methods:
        - 'clean build with JDK 25'
        - 'unzip -l of the jar'
        - 'cmp with 7742b07'
        - 'git grep for the old folder'
        - 'a controlled PATH without node'
        - 'timing'
      success_criteria:
        - 'gates 1, 2, 3, 5 and 6 hold on the final tree and the prg lists what is unproved until a tag run'
    - task_id: stage-11
      methods:
        - 'npm ci, then npm run test:unit, test:coverage, format:check and lint'
        - './mvnw test-compile pmd:check and ./mvnw verify -DskipITs=false with JDK 25'
        - 'scripts/byte-identity.sh, the sha256 of scripts/byte-identity-exceptions.txt, jq .ratchet.max src/main/editor/layers.json, git diff 7742b07 HEAD -- scripts/editor-coverage-floor.json'
        - 'npm run editor:build twice with git status --short unchanged'
      success_criteria:
        - 'every command exits 0 or is named in the prg with its reason (REQ-7); an environment gap is not a pass'
        - 'the exceptions file is unchanged, ratchet.max is at most 99, no number of the coverage floor is lower'
        - 'what only a pull request or a tag proves (the workflow, the website, the arm and macOS targets) is listed as unproved'
```

## 11. Escalation Rules

```yaml
escalation_rules:
  rules:
    - condition: 'An assumption of the TDD is false in a way that changes a decision (ASM-1 the bytes depend on the folder or the Node, ASM-3 the antrun failure is not one line, ASM-4 npm ci is too slow to run every time)'
      action: 'Stop the task, log it in the prg and let the main agent amend the TDD; never change a check to make it pass'
    - condition: 'A built file differs from the file of commit 7742b07 and no change of src/main/editor explains it'
      action: 'Stop and log: the sources are unchanged in this run (Non-Goals); no part, bundle entry or lock line may change to make the bytes match'
    - condition: 'The failure without node is not one [ERROR] line without a stack trace, or the count of the sentence differs from 1'
      action: 'Record the measured output; adjust the antrun target; if no form gives one line, stop and log it (DEC-2); a count other than 1 that still means one line carries the sentence is recorded and kept'
    - condition: 'An edit would drop a line of another run in pom.xml or ci-build.yaml, or the step Assemble website would have to change beyond the folder it reads'
      action: 'Edit by anchors and diff before and after; a larger change to the website step is stopped and logged'
    - condition: 'byte-identity.sh needs a new exception or a command changes its output'
      action: 'Stop and log: this run must not change a command line output (CON-4)'
    - condition: 'A command fails for a reason outside this run (a base already red, no network for npm ci or the Rust toolchain, a browser not installed)'
      action: 'Record it in the task and do not fix it; a missing network or toolchain is an environment gap and not a pass'
    - condition: 'A sentence in a document would state history, say that a file of the page is committed, or use the word committed on a line that also names the page, the bundles, the kernel or the samples'
      action: 'Rewrite it to what is true now: built, made by the build, not in git'
    - condition: 'A test or script is found that still reads src/main/resources/editor-webapp after its owning task finished'
      action: 'Send it back to the owning task; never restore a generated file to make it pass'
    - condition: 'A task is flagged human_required or risk critical by a later edit'
      action: 'The wave has no autonomy override: the implement workflow stops with awaiting-human'
```

## 12. Final Execution Manifest

```yaml
execution_manifest:
  status: 'done'
  recommendation: 'proceed_with_review'
  autonomy_level: 'medium'
  total_tasks: 10
  autonomous_tasks: 7
  review_before_tasks: 0
  review_after_tasks: 3
  human_required_tasks: 0
  blocked_tasks: 0
  critical_path_tasks:
    - 'task-001'
    - 'task-002'
    - 'task-004'
    - 'task-005'
    - 'task-006'
    - 'task-008'
    - 'task-009'
    - 'task-010'
  parallel_groups:
    - parallel-group-001
    - parallel-group-002
  required_human_gates:
    - gate-001
  highest_risk_tasks:
    - task-005
    - task-007
    - task-008
  lowest_confidence_tasks:
    - task-004
    - task-007
    - task-010
  next_action: 'Stage 9: re-run the consistency scan of this plan against the TDD and the repository, then the implement workflow starts at task-001'
  criteria:
    - 'No generated file of the editor is in git, the jar holds the bytes of 7742b07 at the paths they had, and a build without node fails with one line that names it'
    - 'The website step reads target/editor-webapp, Node is in the four jobs that run Maven, the model and the eight documents state what is built, and the manual says how to get the page'
    - 'The Stage 11 commands and the phase gate exit 0 with the byte-identity exceptions file unchanged, and the hand-off lists what is unproved until a tag run'
```
