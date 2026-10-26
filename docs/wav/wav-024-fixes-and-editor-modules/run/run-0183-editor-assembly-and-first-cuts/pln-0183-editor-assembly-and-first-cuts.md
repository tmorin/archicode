---
title: 'PLN: the editor page assembler, its guards and the first cuts'
type: pln
status: draft
owner: tmorin
date: 2026-10-26
run: 0183
wave: 024
related:
  - docs/wav/wav-024-fixes-and-editor-modules/run/run-0183-editor-assembly-and-first-cuts/tdd-0183-editor-assembly-and-first-cuts.md
  - docs/wav/wav-024-fixes-and-editor-modules/run/run-0183-editor-assembly-and-first-cuts/run-0183-editor-assembly-and-first-cuts.md
  - docs/wav/wav-024-fixes-and-editor-modules/run/run-0182-editor-modules-design/tdd-0182-editor-modules-design.md
  - docs/wav/wav-024-fixes-and-editor-modules/wav-024-fixes-and-editor-modules.md
---

# Execution Plan: run 0183, the editor page assembler, its guards and the first cuts (W-5)

This is a TDD+pln run: there is no PRD. The requirements are `W5-1` to `W5-11` of the TDD, taken from the wave row W-5 and the P3 gate. The design is the accepted one of run 0182 (cited as `0182 DEC-n`); this plan builds the steps 5.1 to 5.4 of `0182 DEC-9` and moves no logic. The committed `src/main/resources/editor-webapp/standalone.html` becomes the output of `scripts/build-editor.mjs` and stays byte-identical to the page of today (sha256 starts `a653717d5564c237`) until the optional last step.

The five commits of the TDD (5.1a, 5.1b, 5.2, 5.3, 5.4) are the units of review. A commit is made as the wave git workflow says (one commit per step, the subject kinds of CTR-6: 5.1b is `refactor: move ...`), by the main agent or the author after the task that ends the step has passed its verification; a task never pushes, amends or rewrites history. Where an item of evidence needs the commit to exist (`scripts/check-editor-moves.sh <base> HEAD`), the task records it as pending until the commit exists and the Stage 11 verification reads it.

Files outside the `likely_paths` of the row W-5 that this plan edits, named here as the TDD does: `src/main/editor/**` (new), `src/test/javascript/editor-build/**` (new), `package-lock.json`, `CLAUDE.md`. The paths of the row that this plan proves unchanged are `pom.xml`, the editor server and the harness (DEC-8, IMP-7): a diff that touches one of them is a defect of the run. Two of the row's paths do not exist in the repository (checked at Stage 9): the row's `src/main/java/io/morin/archicode/editor/**` is in fact `src/main/java/io/morin/archicode/cli/EditorHttpServer.java`, and the row's `src/test/javascript/harness.js` is in fact `src/test/javascript/viewpoint-kernel/harness.js`; this plan uses the real paths, because a `git diff` on a path that does not exist prints nothing and would pass for the wrong reason.

## 1. Executive Summary

```yaml
summary:
  status: 'pending'
  product_goal: 'The editor page is assembled from files under src/main/editor by scripts/build-editor.mjs, the assembled file equals the page of today byte for byte, and the guards that W-6 to W-9 rely on (byte identity to a parent commit, statement identity, the layer ratchet with its maximum, the committed name lists) exist, are tested and run in CI, with no consumer of the page edited and the editor unchanged for its users.'
  technical_approach: 'Apply the Stage 5 review findings to the TDD, write the assembler and its tests (5.1a), move the page into src/main/editor and rebuild it identical (5.1b), write the checker with its modes, lists and the ratchet maximum 162 (5.2), then the hooks, the move-commit script, the Page job steps, embed.sh through the assembler and CLAUDE.md (5.3), and the generated-file comment as a last conditional change (5.4); prove the unchanged consumers by running them.'
  total_tasks: 13
  parallel_groups: 2
  high_risk_tasks: 2
  human_review_gates: 1
  autonomy_level: 'medium'
  recommendation: 'proceed_with_review'
  criteria:
    - 'npm run editor:build writes standalone.html and the written file is cmp-identical to git show HEAD of the page before 5.4; its sha256 starts a653717d5564c237 until 5.4.'
    - 'node scripts/build-editor.mjs --check-identical <parent> passes for the 5.1b move, and node scripts/check-editor.mjs --cut on editor-cut.json prints 311, 162 and 100 beside the output of measure-cut.cjs; ratchet.max 162 is committed once, in 5.2, and node scripts/check-editor.mjs --layers prints upward pairs: 0 (max 162).'
    - 'npm run editor:check passes on the true page and exits 1 with the sentence of DEC-2 on a one-byte hand edit of the page (shown locally and by the tests of the tools); the Page job has the stale-page step and, on a pull request, the move-commit step, and the pull request run is read and green.'
    - 'src/main/rust/viewpoint-kernel/embed.sh --check passes and embed.sh writes the kernel block through the assembler.'
    - 'npm run test:unit, npm run test:coverage (floor file unchanged), npm run lint, npm run format:check, ./mvnw verify -DskipITs=false (EditorServeIT, EditorReadSchemaTest, GuideViewPropertiesTest, NativeReflectionConfigTest), npm run test:e2e and the local website sed line pass on the assembled page.'
    - 'No file of pom.xml, src/main/java/io/morin/archicode/cli/EditorHttpServer.java, src/test/javascript/viewpoint-kernel/harness.js, src/main/resources/application.properties, scripts/editor-coverage*, scripts/extract-editor-script.mjs, .prettierignore or eslint.config.mjs is changed (IMP-7).'
    - 'The Native job is read on the pull request and is green (W5-11, CON-4: it cannot run here).'
```

## 2. PRD/TDD Consistency Assessment

```yaml
consistency_assessment:
  aligned_items:
    - 'W5-1 is addressed by DEC-2 and TG-1, W5-2 by DEC-3 and DEC-4, W5-3 by DEC-4 and DEC-5, W5-5 by DEC-7, W5-8 and W5-9 by DEC-2 and the 5.1b byte check, W5-10 by DEC-1, DEC-4 and DEC-6, W5-11 by Deployment and Rollout and RISK-7.'
    - 'W5-4, W5-6 and W5-7 are addressed by a different mechanism than the wave row suggests (the consumers keep reading the assembled page, hooks and a check keep it current): DEC-8 and the Mismatches list of the TDD.'
    - 'The scope matches the wave row W-5 and the steps 5.1 to 5.4 of 0182 DEC-9; nothing of W-6 to W-9 or W-11 is a task here.'
    - 'The page is unchanged since the measure of run 0182: the sha256 starts a653717d5564c237 and the file has 23,170 lines (ASM-1, re-checked while drafting this plan).'
  gaps:
    - id: gap-001
      type: 'contradiction'
      description: 'The Stage 5 review of the TDD returned findings R-1 to R-6 that no stage applied (the prg of the run says they are edits for the main agent). R-1 is the one that breaks the plan: DEC-5 check (c) fails on its first run, because EditorHttpServer.java and NativeReflectionConfigTest.java contain standalone.html and name no function. R-2 to R-6: editor:check and the dependencies have no single step, no table of the five commits, TG-4 over-claims, --cut is bound to one page hash against 0182 DEC-10, and Q-3 departs from the red-run guard of 0182 DEC-9.'
      impact: 'high'
      recommendation: 'task-001 applies R-1 to R-6 to the TDD before any code is written. The plan already builds the corrected design: the pathOnly list (task-006), editor:build and editor:check as --check alone in 5.1a, extended and with the two devDependencies in 5.2 (task-004, task-006), the hooks and CI in 5.3 (task-009).'
    - id: gap-002
      type: 'ambiguity'
      description: 'Q-3 of the TDD (the Page job shown red on a stale page) departs from the accepted guard of 0182 DEC-9 step 5.3 ("tried once on purpose"): the run proves it by the tools tests, a local one-byte edit with exit 1, and the green pull request run, and pushes no failing commit.'
      impact: 'medium'
      recommendation: 'Kept as the TDD decided, listed in its Mismatches by task-001, reopenable by the author (a throwaway commit on a scratch branch). No task depends on the author changing it.'
    - id: gap-003
      type: 'risk'
      description: 'The Native job cannot be run here (no Mandrel, CON-4) and the workflow change is proved only by the run of the pull request.'
      impact: 'medium'
      recommendation: 'No task touches pom.xml, application.properties or the native resources. gate-001 reads the Native job and the Page job on the pull request; the run records it as pending until the pull request exists.'
    - id: gap-004
      type: 'ambiguity'
      description: 'No PRD exists, so traceability to requirement ids is incomplete; the W5-n ids are sourced from the wave row and the P3 gate, not from a product document.'
      impact: 'low'
      recommendation: 'Each task cites the W5-n and TDD ids it implements; Stage 9 checks them against the TDD.'
    - id: gap-005
      type: 'ambiguity'
      description: 'The commit step 5.1a adds the npm scripts editor:build and editor:check before src/main/editor exists, so they exit 1 on the repository until 5.1b.'
      impact: 'low'
      recommendation: 'Accepted: nothing calls them in 5.1a, the tests of the assembler use temporary trees, and 5.1b is the next commit. task-001 states it in DEC-1.'
    - id: gap-006
      type: 'contradiction'
      description: 'The wave row W-5 and the TDD name src/test/javascript/harness.js and src/main/java/io/morin/archicode/editor/**, which do not exist: the harness is src/test/javascript/viewpoint-kernel/harness.js and EditorHttpServer is src/main/java/io/morin/archicode/cli/EditorHttpServer.java (found by the Stage 9 repository scan).'
      impact: 'medium'
      recommendation: 'This plan uses the real paths in its criteria, its untouched-paths proof (task-013) and its escalation rules; task-001 corrects the TDD (R-7). Without it the git diff proof of IMP-7 passes for the wrong reason.'
  blocking_gaps: []
```

## 3. Execution Graph

```yaml
execution_graph:
  nodes:
    - id: task-001
      status: 'done'
      title: 'Apply the Stage 5 review findings R-1 to R-6 to the TDD'
      depends_on: []
      produces:
        - 'docs/wav/wav-024-fixes-and-editor-modules/run/run-0183-editor-assembly-and-first-cuts/tdd-0183-editor-assembly-and-first-cuts.md'
      agent_role: 'Documentation Agent'
      autonomy: 'autonomous'
      risk: 'low'
      confidence: 80
    - id: task-002
      status: 'done'
      title: 'Step 5.1a: scripts/build-editor.mjs with its tests and the npm scripts editor:build and editor:check'
      depends_on: [task-001]
      produces:
        - 'scripts/build-editor.mjs'
        - 'src/test/javascript/editor-build/build-editor.test.js'
        - 'package.json'
      agent_role: 'Backend Implementation Agent'
      autonomy: 'autonomous'
      risk: 'medium'
      confidence: 80
    - id: task-003
      status: 'done'
      title: 'Step 5.1b: move the page into src/main/editor and rebuild it identical (the move commit)'
      depends_on: [task-002]
      produces:
        - 'src/main/editor/page.html'
        - 'src/main/editor/style.css'
        - 'src/main/editor/theme-boot.js'
        - 'src/main/editor/codemirror-loader.mjs'
        - 'src/main/editor/unsorted/script.js'
        - 'src/main/editor/layers.json'
        - 'src/main/resources/editor-webapp/standalone.html'
      agent_role: 'Refactoring Agent'
      autonomy: 'review_after'
      risk: 'high'
      confidence: 80
    - id: task-004
      status: 'done'
      title: 'Step 5.2a: check-editor.mjs core (parse, scope analysis, names, pairs, --list, --cut, --write-names), the two devDependencies and their tests'
      depends_on: [task-003]
      produces:
        - 'scripts/check-editor.mjs'
        - 'src/test/javascript/editor-build/check-editor.test.js'
        - 'package.json'
        - 'package-lock.json'
      agent_role: 'Backend Implementation Agent'
      autonomy: 'autonomous'
      risk: 'medium'
      confidence: 70
    - id: task-005
      status: 'done'
      title: 'Step 5.2b: the load-order check and --statements with their tests'
      depends_on: [task-004]
      produces:
        - 'scripts/check-editor.mjs'
        - 'src/test/javascript/editor-build/check-editor-statements.test.js'
      agent_role: 'Backend Implementation Agent'
      autonomy: 'autonomous'
      risk: 'medium'
      confidence: 65
    - id: task-006
      status: 'done'
      title: 'Step 5.2c: names.json, java-names.json with pathOnly, --layers, ratchet.max 162 and editor:check extended'
      depends_on: [task-005]
      produces:
        - 'src/main/editor/names.json'
        - 'src/main/editor/java-names.json'
        - 'src/main/editor/layers.json'
        - 'scripts/check-editor.mjs'
        - 'src/test/javascript/editor-build/check-editor-layers.test.js'
        - 'package.json'
      agent_role: 'Backend Implementation Agent'
      autonomy: 'autonomous'
      risk: 'medium'
      confidence: 75
    - id: task-007
      status: 'done'
      title: 'Step 5.3a: scripts/check-editor-moves.sh and its tests on a temporary repository'
      depends_on: [task-005]
      produces:
        - 'scripts/check-editor-moves.sh'
        - 'src/test/javascript/editor-build/check-editor-moves.test.js'
      agent_role: 'Backend Implementation Agent'
      autonomy: 'autonomous'
      risk: 'medium'
      confidence: 80
    - id: task-008
      status: 'done'
      title: 'Step 5.3b: embed.sh writes the kernel block through the assembler'
      depends_on: [task-003]
      produces:
        - 'src/main/rust/viewpoint-kernel/embed.sh'
      agent_role: 'Infrastructure Agent'
      autonomy: 'review_after'
      risk: 'medium'
      confidence: 80
    - id: task-009
      status: 'done'
      title: 'Step 5.3c: the hooks pretest:unit, pretest:coverage and prelint, and the two Page job steps'
      depends_on: [task-006, task-007, task-008]
      produces:
        - 'package.json'
        - '.github/workflows/ci-build.yaml'
      agent_role: 'Infrastructure Agent'
      autonomy: 'review_after'
      risk: 'high'
      confidence: 75
    - id: task-010
      status: 'done'
      title: 'Step 5.3d: CLAUDE.md gives the commands and says the page is generated'
      depends_on: [task-009]
      produces:
        - 'CLAUDE.md'
      agent_role: 'Documentation Agent'
      autonomy: 'autonomous'
      risk: 'low'
      confidence: 85
    - id: task-011
      status: 'dropped'
      dropped_reason: 'Step 5.4 is dropped by the author on 2026-10-26: the comment line is cosmetic and a test depends on the page as it is (DEC-9 keeps 5.4 only if no test needs editing). The page is not changed.'
      title: 'Step 5.4: the generated-file comment in page.html, kept only if no test needs editing'
      depends_on: [task-010]
      produces:
        - 'src/main/editor/page.html'
        - 'src/main/resources/editor-webapp/standalone.html'
      agent_role: 'Refactoring Agent'
      autonomy: 'autonomous'
      risk: 'medium'
      confidence: 80
    - id: task-012
      status: 'pending'
      title: 'Run the exit evidence of the run and record it'
      depends_on: [task-011]
      produces:
        - 'results of every command of the Observability and Verification section, in the prg of the run'
      agent_role: 'QA Agent'
      autonomy: 'autonomous'
      risk: 'low'
      confidence: 85
    - id: task-013
      status: 'pending'
      title: 'Write the exit evidence and the untouched-paths proof into the run document'
      depends_on: [task-012]
      produces:
        - 'docs/wav/wav-024-fixes-and-editor-modules/run/run-0183-editor-assembly-and-first-cuts/run-0183-editor-assembly-and-first-cuts.md'
      agent_role: 'Documentation Agent'
      autonomy: 'autonomous'
      risk: 'low'
      confidence: 85
  edges:
    - from: task-001
      to: task-002
      reason: 'The corrected DEC-1 and DEC-6 say which script lands in which commit.'
    - from: task-002
      to: task-003
      reason: 'The move commit rebuilds the page with the assembler and checks it with --check-identical.'
    - from: task-003
      to: task-004
      reason: 'The checker imports assemble() and reads the assembled page of the new layout; --cut needs the real page.'
    - from: task-003
      to: task-008
      reason: 'embed.sh calls build-editor.mjs, which needs src/main/editor to exist.'
    - from: task-004
      to: task-005
      reason: 'The load-order check and --statements use the parse, declarations and scope analysis of the core.'
    - from: task-005
      to: task-006
      reason: '--layers includes the load-order check.'
    - from: task-005
      to: task-007
      reason: 'The move script runs --statements for a relocate commit.'
    - from: task-006
      to: task-009
      reason: 'The Page job step is npm run editor:check as extended in 5.2.'
    - from: task-007
      to: task-009
      reason: 'The Page job runs check-editor-moves.sh on a pull request.'
    - from: task-008
      to: task-009
      reason: 'Step 5.3 is one commit; its parts are checked together by the hooks task.'
    - from: task-009
      to: task-010
      reason: 'CLAUDE.md names the hooks and the CI steps as built.'
    - from: task-010
      to: task-011
      reason: 'The comment commit is last: it moves the page by one line, after every step whose proof is byte identity.'
    - from: task-011
      to: task-012
      reason: 'The exit evidence is taken on the final tree.'
    - from: task-012
      to: task-013
      reason: 'The run document cites the results.'
```

## 4. Task Catalog

```yaml
task_catalog:
  tasks:
    - id: task-001
      title: 'Apply the Stage 5 review findings R-1 to R-6 to the TDD'
      source_requirements:
        prd:
          - 'W5-3'
          - 'W5-4'
          - 'W5-6'
          - 'W5-10'
        tdd:
          - 'DEC-1'
          - 'DEC-4'
          - 'DEC-5'
          - 'DEC-6'
          - 'CTR-4'
          - 'CTR-5'
          - 'TG-4'
          - 'Mismatches (PRD Traceability)'
          - 'DEF-3'
          - 'Review pass'
      outputs:
        - 'R-1: java-names.json gains a pathOnly list (the two files EditorHttpServer.java and NativeReflectionConfigTest.java); DEC-5 check (c) reads "contains standalone.html and is in neither the union of the files of the names nor pathOnly"; CTR-4 shows the shape; the test of the check names a pathOnly file that passes and a new file that fails.'
        - 'R-2: DEC-1 and DEC-6 and CTR-5 say that 5.1a adds editor:build and editor:check as node scripts/build-editor.mjs --check alone (not run on the repository before 5.1b), 5.2 extends editor:check with check-editor.mjs --layers and adds the two devDependencies, 5.3 adds the three hooks and the CI steps.'
        - 'R-3: one table in "Order of the work": commit, step, kind (additive, move, change), files, guard, DEC; the repeated "from 5.2 / from 5.3 / from 5.1b" remarks in DEC-3, DEC-6, CTR-5 and Observability are removed or point at the table.'
        - 'R-4: TG-4 reads "through the npm scripts that read the page, and CI fails a page that is not the assembly of its parts".'
        - 'R-5: the Mismatches list says that --cut is bound to the page of af1ed2d and that 8.3 of 0182 DEC-10 therefore uses --layers and --list; DEF-3 gains "remove --cut after P3".'
        - 'R-6: the Q-3 departure from the red-run guard of 0182 DEC-9 step 5.3 is listed in Mismatches with its substitute proof (the tools test on a changed byte, the local exit 1, the green pull request run).'
        - 'R-7 (found at Stage 9, a path correction): the TDD names `harness.js` and the row names `src/test/javascript/harness.js` and `src/main/java/io/morin/archicode/editor/**`; the real files are `src/test/javascript/viewpoint-kernel/harness.js` and `src/main/java/io/morin/archicode/cli/EditorHttpServer.java`. CON-2, DEC-8, IMP-7 and the Mismatches line about the row state the real paths.'
        - 'The Review pass section gains one line: findings R-1 to R-7 applied by run 0183 task-001; the findings table is unchanged. Frontmatter unchanged, status stays draft, no decision DEC-1 to DEC-9 changes except in the places the findings name.'
      verification:
        - 'grep for pathOnly, "5.1a", the commit table, "TG-4", "--cut" in DEF-3 and in Mismatches, Q-3 in Mismatches, and the two real paths of R-7'
        - 'node docs/wav/wav-024-fixes-and-editor-modules/run/run-0182-editor-modules-design/measure-cut.cjs still prints 1,349 declarations, 68 parts and 311, 162, 100'
        - 'sha256sum src/main/resources/editor-webapp/standalone.html starts a653717d5564c237'
      risk: 'low'
      confidence: 80
      human_review: 'none'
      escalation_triggers:
        - 'A fix would change a decision (the commit kinds, the order of the steps, a number of DEC-3): stop that edit, log it as a finding, leave the TDD as it is.'
        - 'The sha256 of the page does not start a653717d5564c237 (ASM-1): regenerate the numbers with measure-cut.cjs, correct the cut table and log it before any task goes on.'
      delegation_tier: 'standard'
      results: 'tier standard, model sonnet, effort medium, profile low-cost, passed first time, inline (leaf), independently verified'
    - id: task-002
      title: 'Step 5.1a: scripts/build-editor.mjs with its tests and the npm scripts editor:build and editor:check'
      source_requirements:
        prd:
          - 'W5-1'
          - 'W5-9'
          - 'W5-10'
        tdd:
          - 'DEC-1'
          - 'DEC-2'
          - 'CTR-1'
          - 'CTR-2'
          - 'IF-1'
          - 'ASM-2'
          - 'ASM-4'
          - 'CON-2'
          - 'CON-6'
          - 'Observability and Verification (tests of the tools: assembler)'
      outputs:
        - 'scripts/build-editor.mjs with no dependency: the directives @include, @parts and @wasm, the refusals of DEC-2 (unknown directive, stray <!--@, part missing, part on disk not listed, part listed twice, first path segment not its layer, layer unknown, CR or byte-order mark, no final newline), write only on a difference, and the modes --check, --check-identical <rev>, --where <line>, --map and --root <dir>; it exports assemble(root) and mapOf(root) and runs its command line only when executed directly.'
        - 'Every error is one line on stderr, exit 1, naming the file and where it applies the line and the part and what to do (npm run editor:build); an unknown revision or a missing git object is one line, never a stack trace (git read with execFileSync and an argument array).'
        - 'src/test/javascript/editor-build/build-editor.test.js: each directive, each refusal, byte-for-byte output, write only on a difference (the modification time is kept), --check and --check-identical on a temporary git repository (git init, two commits with -c user.name and -c user.email) with a changed byte and an unchanged one, --where, --map, --root, and the same tree assembled twice gives the same bytes. A fixed small fixture is the source of every expected value; no test names a commit hash of the project.'
        - 'package.json: scripts editor:build (node scripts/build-editor.mjs) and editor:check (node scripts/build-editor.mjs --check); no hook, no dependency.'
      verification:
        - 'node --test src/test/javascript/editor-build/build-editor.test.js'
        - 'npm run format:check'
        - 'npm run lint'
        - 'npm run test:unit (the node suite, the end of the step)'
      risk: 'medium'
      confidence: 80
      human_review: 'none'
      escalation_triggers:
        - 'A rule of DEC-2 cannot reproduce the page in the 5.1b rehearsal of the next task: fix the assembler and its test, not the page.'
        - 'A new file needs a Prettier or ESLint configuration change: stop; the scripts and tests must pass the existing options (CON-6).'
      delegation_tier: 'standard'
      results: 'tier standard, model sonnet, effort medium, profile low-cost, passed first time, inline (leaf), independently verified'
    - id: task-003
      title: 'Step 5.1b: move the page into src/main/editor and rebuild it identical (the move commit)'
      source_requirements:
        prd:
          - 'W5-1'
          - 'W5-8'
          - 'W5-9'
          - 'W5-10'
        tdd:
          - 'DEC-1'
          - 'DEC-2'
          - 'DEC-3'
          - 'ASM-1'
          - 'ASM-2'
          - 'CTR-1'
          - 'CTR-2'
          - 'CTR-7'
          - 'IMP-1'
          - 'IMP-2'
      outputs:
        - 'ASM-1 re-checked first: sha256 prefix a653717d5564c237 and 23,170 lines; if it differs, stop (escalation).'
        - 'src/main/editor/page.html (the 58-line skeleton: three @include lines, one @parts line, one @wasm line), theme-boot.js (page lines 12-15), style.css (18-970), codemirror-loader.mjs (1000-1026), unsorted/script.js (1030-23161, 22,132 lines), cut out of the committed page by line ranges, without editing a byte of any of them; layers.json with the six layers and the one part unsorted/script.js of layer unsorted, no ratchet key.'
        - 'The page rebuilt with npm run editor:build; cmp of the rebuilt file with git show HEAD:src/main/resources/editor-webapp/standalone.html is empty, and node scripts/build-editor.mjs --check-identical HEAD exits 0 (HEAD is the parent of the move commit when it is made).'
        - 'The tree is ready for one commit with the subject beginning refactor: move (CTR-6), holding the new files only; the page is rebuilt and unchanged, so the diff of the page is empty.'
      verification:
        - 'sha256sum src/main/resources/editor-webapp/standalone.html starts a653717d5564c237 after the rebuild'
        - 'cmp <(git show HEAD:src/main/resources/editor-webapp/standalone.html) src/main/resources/editor-webapp/standalone.html'
        - 'node scripts/build-editor.mjs --check-identical HEAD'
        - 'git diff --stat HEAD -- src/main/resources prints nothing'
        - 'npm run test:unit (the node suite, 106 files run the page through the harness)'
        - 'npm run lint and npm run format:check'
      risk: 'high'
      confidence: 80
      human_review: 'after'
      escalation_triggers:
        - 'The rebuilt page differs from the committed one by one byte: do not edit the page to match; find the rule of DEC-2 or the cut that is wrong.'
        - 'harness.js cannot match the first bare <script> or the wasm block of the rebuilt page (CON-2): stop and log; the skeleton keeps the shape, it is not the test that changes.'
        - 'A step of the work would edit a line of the script: it is not a move; stop.'
      delegation_tier: 'standard'
      results: 'tier standard, model sonnet, effort medium, profile low-cost, passed first time, inline (leaf), independently verified'
    - id: task-004
      title: 'Step 5.2a: check-editor.mjs core (parse, scope analysis, names, pairs, --list, --cut, --write-names), the two devDependencies and their tests'
      source_requirements:
        prd:
          - 'W5-2'
          - 'W5-3'
          - 'W5-10'
        tdd:
          - 'DEC-3'
          - 'DEC-4'
          - 'DEC-6'
          - 'CTR-5'
          - 'IF-2'
          - 'ASM-3'
          - 'RISK-1'
          - 'RISK-4'
          - 'Observability and Verification (tests of the tools: checker)'
      outputs:
        - 'package.json devDependencies acorn 8.19.0 and eslint-scope 9.1.2 pinned exact, installed with npm install --save-dev --save-exact --ignore-scripts; package-lock.json changes by the two root entries and the dev flags only (git diff package-lock.json reviewed), and npm ci succeeds in a scratch copy.'
        - 'scripts/check-editor.mjs: reads the assembled page through assemble(root), parses the main script with acorn (ecmaVersion latest, sourceType script), analyses it with eslint-scope, and defines declarations, names, references that resolve to the global scope, and the pairs (A, B) of different parts, B in a higher layer than A, A naming B (unsorted parts left out on both sides); modes --list, --cut <file>, --write-names, --root <dir>; --cut exits 2 on a page whose sha256 does not start with the sha256Prefix of the table.'
        - 'src/test/javascript/editor-build/check-editor.test.js: names equal and unequal with the difference in the message; the pair count on a small synthetic script with three parts of three layers, a shadowing local that is not a reference and a function called from below; --list grouping; --cut on a synthetic table and its refusal on another page; each run twice gives the same output. No test reads the real page for a number.'
        - 'Run on the real page, written in the prg: --write-names counts 1,331 distinct names and 18 unnamed statements, and node scripts/check-editor.mjs --cut docs/wav/wav-024-fixes-and-editor-modules/run/run-0182-editor-modules-design/editor-cut.json prints 311, 162 and 100, equal to the output of measure-cut.cjs on the same page.'
      verification:
        - 'node --test src/test/javascript/editor-build/check-editor.test.js'
        - 'node scripts/check-editor.mjs --cut docs/wav/wav-024-fixes-and-editor-modules/run/run-0182-editor-modules-design/editor-cut.json'
        - 'node docs/wav/wav-024-fixes-and-editor-modules/run/run-0182-editor-modules-design/measure-cut.cjs'
        - 'git diff package-lock.json and npm ci in a scratch copy of the repository'
        - 'npm run format:check and npm run lint'
      risk: 'medium'
      confidence: 70
      human_review: 'none'
      escalation_triggers:
        - 'RISK-1: --cut prints numbers other than 311, 162 and 100: explain the difference between measure-cut.cjs and the port in the prg, fix the port; if it cannot be reconciled, ratchet.max stays unwritten (task-006) and the run reports a blocker.'
        - 'RISK-4: npm install needs the registry and it is unreachable: edit the two root entries of the lock by hand and prove them with npm ci --offline against the cache, or report a blocker.'
        - 'The lock file changes beyond the two root entries and the dev flags: revert the install and find out why before going on.'
      delegation_tier: 'standard'
      results: 'tier standard, model sonnet, effort medium, profile low-cost, passed first time, inline (leaf), independently verified'
    - id: task-005
      title: 'Step 5.2b: the load-order check and --statements with their tests'
      source_requirements:
        prd:
          - 'W5-2'
          - 'W5-10'
        tdd:
          - 'DEC-4'
          - 'IF-2'
          - 'RISK-2'
          - 'Observability and Verification (tests of the tools: load order, --statements)'
      outputs:
        - 'In scripts/check-editor.mjs, the load-order check (a check inside --layers and --statements, not a mode): for every top-level declaration that is not a function declaration, the names it resolves to a let, const or class at load time, outside any function body plus the bodies of the top-level functions it calls while the script loads (over-approximated, transitively, outside deferred code), are declared earlier in the assembled script; a function declaration is always satisfied; listener registrations that pass a function by name are satisfied by the same rule.'
        - 'The mode --statements <rev>: the multisets of top-level declarations of the main script equal (each taken with the comment lines directly above it with no blank line), the multisets of all comments equal, everything outside the main script byte-equal, and the load-order check holds; the revision is read with git show through execFileSync.'
        - 'src/test/javascript/editor-build/check-editor-statements.test.js: a let moved before the const its initializer reads fails, a function moved passes, a call at load that reads a later const fails, a function relocated to another part passes, a function edited fails, a comment lost fails, a part outside the script changed fails. Each case is a small fixture in a temporary git repository.'
      verification:
        - 'node --test src/test/javascript/editor-build/check-editor-statements.test.js'
        - 'node scripts/check-editor.mjs --statements HEAD on the real page exits 0 (the page equals itself)'
        - 'npm run format:check and npm run lint'
        - 'npm run test:unit (the node suite, the end of the step 5.2 tools)'
      risk: 'medium'
      confidence: 65
      human_review: 'none'
      escalation_triggers:
        - 'RISK-2: the over-approximated call rule refuses a case the tests expect to pass: refuse is the safe direction; pin both the refusal and the pass, and write the case in the prg as a finding.'
        - 'The rule cannot be made exact for variables: stop and log; 0182 DEC-5 says the variable then stays and its pair stays in the count, the rule is not loosened.'
      delegation_tier: 'standard'
      results: 'tier standard, model sonnet, effort medium, profile low-cost, passed first time, inline (leaf), independently verified'
    - id: task-006
      title: 'Step 5.2c: names.json, java-names.json with pathOnly, --layers, ratchet.max 162 and editor:check extended'
      source_requirements:
        prd:
          - 'W5-2'
          - 'W5-3'
          - 'W5-10'
        tdd:
          - 'DEC-1'
          - 'DEC-3'
          - 'DEC-4'
          - 'DEC-5'
          - 'DEC-6'
          - 'CTR-2'
          - 'CTR-3'
          - 'CTR-4'
          - 'CTR-5'
          - 'RISK-5'
      outputs:
        - 'src/main/editor/names.json written by node scripts/check-editor.mjs --write-names (1,331 sorted names, unnamed 18).'
        - 'src/main/editor/java-names.json: the 21 names of CTR-4, each with the full repo paths of the Java files found by grep -rlw NAME src/main/java src/test/java run again by the task, and the pathOnly list (EditorHttpServer.java and NativeReflectionConfigTest.java); the file is checked from three sides (a name is a top-level name of the script, a listed file still contains the name as a word, a Java source that contains standalone.html is in the union of the files or in pathOnly) and the failure sentence says what to add.'
        - 'The mode --layers: the four checks in the order names, Java names, load order, ratchet; one line per check and upward pairs: N (max M); an unknown key of layers.json is refused; stops at the first failing check.'
        - 'layers.json gains ratchet.max 162, written only after task-004 showed --cut printing 311, 162, 100; node scripts/check-editor.mjs --layers prints upward pairs: 0 (max 162) on the page of one unsorted part.'
        - 'package.json: editor:check is node scripts/build-editor.mjs --check && node scripts/check-editor.mjs --layers.'
        - 'src/test/javascript/editor-build/check-editor-layers.test.js: names a, b, c on a temporary tree (including a file in pathOnly that passes and a new file that fails), the ratchet at, below and above max, the failure sentences, the order of the checks.'
      verification:
        - 'node --test src/test/javascript/editor-build/check-editor-layers.test.js'
        - 'npm run editor:check exits 0 on the true page and prints upward pairs: 0 (max 162)'
        - 'a one-byte hand edit of the page makes npm run editor:check exit 1 with the sentence of DEC-2, then the edit is restored (recorded in the prg)'
        - 'npm run format:check and npm run lint'
        - 'npm run test:unit (the node suite, the end of the step 5.2)'
      risk: 'medium'
      confidence: 75
      human_review: 'none'
      escalation_triggers:
        - 'The grep for a Java name gives a file or a count other than CTR-4 says: write what the grep finds and log the difference.'
        - 'Check (a) fails because a name of the 21 is not a top-level declaration of the page: stop and log; the list comes from the page and may not be bent.'
        - '--cut did not print 311, 162, 100 in task-004: ratchet.max is not written and the run reports a blocker.'
      delegation_tier: 'standard'
      results: 'tier standard, model sonnet, effort medium, profile low-cost, passed first time, inline (leaf), independently verified'
    - id: task-007
      title: 'Step 5.3a: scripts/check-editor-moves.sh and its tests on a temporary repository'
      source_requirements:
        prd:
          - 'W5-6'
          - 'W5-10'
        tdd:
          - 'DEC-6'
          - 'CTR-6'
          - 'IF-3'
          - 'FLOW-2'
          - 'RISK-8'
          - 'RISK-9'
          - 'Security and Privacy'
      outputs:
        - 'scripts/check-editor-moves.sh <base> <head> (bash, quoted expansions, hashes passed as arguments only, worktrees removed in a trap): for each commit of git rev-list --reverse <base>..<head> whose subject begins refactor: move it makes a detached worktree and runs node scripts/build-editor.mjs --root <worktree> --check-identical <commit>^; for refactor: relocate it runs node scripts/check-editor.mjs --root <worktree> --statements <commit>^; other subjects are not checked; one line per checked commit (hash, subject, ok); exit 1 on the first failure naming the commit; one sentence and exit 1 when <base> is missing (shallow clone). The scripts run are those of the checked-out head.'
        - 'src/test/javascript/editor-build/check-editor-moves.test.js, on a temporary repository: a pure move commit passes, a move commit that edits a byte fails and is named, a relocate commit passes and a relocate that edits a function fails, a feat commit is not checked, a missing base is the one sentence. No test names a hash of the project.'
        - 'The script run locally over the commits of the run once they exist (scripts/check-editor-moves.sh <merge-base> HEAD) printing ok for 5.1b; pending, and recorded as such, until the commit exists.'
      verification:
        - 'node --test src/test/javascript/editor-build/check-editor-moves.test.js'
        - 'shellcheck scripts/check-editor-moves.sh when shellcheck is installed, else bash -n'
        - 'npm run format:check and npm run lint'
      risk: 'medium'
      confidence: 80
      human_review: 'none'
      escalation_triggers:
        - 'git worktree is refused in the test environment (a restricted temp folder): stop and log; the script is the only way to assemble the tree of a past commit with the tool of the head.'
        - 'A subject rule of CTR-6 would check a commit kind the TDD does not name: stop.'
      delegation_tier: 'standard'
      results: 'tier standard, model sonnet, effort medium, profile low-cost, passed first time, inline (leaf), independently verified'
    - id: task-008
      title: 'Step 5.3b: embed.sh writes the kernel block through the assembler'
      source_requirements:
        prd:
          - 'W5-5'
          - 'W5-9'
        tdd:
          - 'DEC-7'
          - 'FLOW-3'
          - 'CON-7'
          - 'IMP-4'
      outputs:
        - 'src/main/rust/viewpoint-kernel/embed.sh: the write mode builds the wasm as now, copies it to src/main/wasm/viewpoint_kernel.wasm, then runs node "$root/scripts/build-editor.mjs" from the repository root; the Python block keeps only the check mode with the regex it has; the header says the write mode needs Node. The check mode needs rustup and python3 only (the Kernel job has no npm ci).'
        - 'Proof on this machine: src/main/rust/viewpoint-kernel/embed.sh --check exits 0 on the assembled page; a rebuild in write mode on the unchanged Rust leaves git diff empty for the wasm and the page.'
      verification:
        - 'src/main/rust/viewpoint-kernel/embed.sh --check'
        - 'src/main/rust/viewpoint-kernel/embed.sh then git diff --stat HEAD -- src/main/wasm src/main/resources prints nothing'
        - 'node --test src/test/javascript/viewpoint-kernel/compare.test.js src/test/javascript/viewpoint-kernel/change.test.js src/test/javascript/viewpoint-kernel/patches.test.js (they assert the block equals the base64 of the wasm)'
      risk: 'medium'
      confidence: 80
      human_review: 'after'
      escalation_triggers:
        - 'The write mode changes the wasm or the page on an unchanged kernel (a non-reproducible build on this machine): stop and log; do not commit a changed wasm.'
        - 'cargo or python3 is missing so embed.sh cannot be run: report a blocker for this task only; the Kernel job reads it on the pull request.'
      delegation_tier: 'standard'
      results: 'tier standard, model sonnet, effort medium, profile low-cost, passed first time, inline (leaf), independently verified'
    - id: task-009
      title: 'Step 5.3c: the hooks pretest:unit, pretest:coverage and prelint, and the two Page job steps'
      source_requirements:
        prd:
          - 'W5-4'
          - 'W5-6'
          - 'W5-10'
          - 'W5-11'
        tdd:
          - 'DEC-6'
          - 'DEC-8'
          - 'FLOW-1'
          - 'FLOW-2'
          - 'CTR-5'
          - 'RISK-3'
          - 'RISK-7'
          - 'IMP-5'
          - 'CON-9'
      outputs:
        - 'package.json: pretest:unit, pretest:coverage and prelint, each node scripts/build-editor.mjs; no hook on test:e2e, test:timing or any Maven step (CON-9).'
        - '.github/workflows/ci-build.yaml, job Page: after "Install the Node.js dependencies" and before "Check the format", the step "Check the editor page is the assembly of its parts" (npm run editor:check) and, on a pull_request only, the step "Check the move commits" (scripts/check-editor-moves.sh with the base sha and the head sha of the event). No other job, no publishing step, no website step, no path filter is touched.'
        - 'The workflow still parses as YAML (python3 -c yaml.safe_load or the repository checker) and the diff of the workflow is the two steps only.'
        - 'The proof that the hooks are quiet: npm run test:unit leaves git status clean for the page when nothing differs (the modification time of the committed page is kept).'
      verification:
        - 'python3 -c "import yaml,sys; yaml.safe_load(open(sys.argv[1]))" .github/workflows/ci-build.yaml'
        - 'git diff HEAD -- .github/workflows/ci-build.yaml shows the two steps and nothing else'
        - 'npm run editor:check, npm run lint, npm run format:check and npm run test:unit exit 0 and the page file is not rewritten'
        - 'the website sed line of the Observability and Verification section on the assembled page'
      risk: 'high'
      confidence: 75
      human_review: 'after'
      escalation_triggers:
        - 'A change to the workflow would reach a job other than Page or any publishing step: stop; the Build, Release and website steps are not part of this run.'
        - 'The pull_request event fields cannot be named in the step without a syntax this repository does not use: read the existing expressions of ci-build.yaml and follow them.'
        - 'A hook rewrites the page when nothing differs: stop, the write-only-on-a-difference rule of DEC-2 is broken.'
      delegation_tier: 'hard_judgment'
      results: 'tier hard_judgment, model sonnet, effort high, profile low-cost, passed first time, inline (leaf), independently verified'
    - id: task-010
      title: 'Step 5.3d: CLAUDE.md gives the commands and says the page is generated'
      source_requirements:
        prd:
          - 'W5-6'
        tdd:
          - 'IMP-6'
          - 'DEC-6'
          - 'DEC-8'
          - 'RISK-11'
      outputs:
        - 'CLAUDE.md, Build & Test: the commands editor:build and editor:check, the three hooks, the Page job steps, the sentence that standalone.html is generated from src/main/editor and is edited there, the lists layers.json, names.json and java-names.json and what each guards.'
        - 'The Format paragraph sentence that the page waits for #161 and the editor-script coverage paragraph wording about one script are corrected only as far as they stopped being true; the manual under src/doc is not edited.'
      verification:
        - 'grep of the new commands in CLAUDE.md'
        - 'every command named in the new text is run once and exits 0 (npm run editor:build, npm run editor:check)'
      risk: 'low'
      confidence: 85
      human_review: 'none'
      escalation_triggers:
        - 'A sentence would claim a guard the tools do not give (the hooks cover three npm scripts only): write what they cover.'
      delegation_tier: 'standard'
      results: 'tier standard, model sonnet, effort medium, profile low-cost, passed first time, inline (leaf), independently verified'
    - id: task-011
      title: 'Step 5.4: the generated-file comment in page.html, kept only if no test needs editing'
      source_requirements:
        prd:
          - 'W5-9'
        tdd:
          - 'DEC-9'
          - 'CON-2'
          - 'CON-3'
          - 'RISK-6'
      outputs:
        - 'One HTML comment line after <html lang="en"> in src/main/editor/page.html: "Generated by scripts/build-editor.mjs from src/main/editor: edit the parts there, not this file (npm run editor:build)." in the form of DEC-9; it contains no <script, no <meta and no archicode-version. The page is rebuilt and committed in the same change commit.'
        - 'If any test (node, Java or e2e) needs an edit to pass, the change is reverted by editing the file back, no destructive git, the reason is logged in the prg, and the step is recorded as dropped; the stale-page check, the hooks and CI remain the protection against a hand edit.'
        - '--cut and the numbers of 0182 are valid only before this commit; the task does not run --cut after it.'
      verification:
        - 'npm run editor:build then npm run editor:check'
        - 'npm run test:unit'
        - './mvnw verify -DskipITs=false -Dit.test=EditorServeIT (JAVA_HOME names JDK 25)'
        - 'npm run test:e2e'
      risk: 'medium'
      confidence: 80
      human_review: 'none'
      escalation_triggers:
        - 'A test depends on the line numbers or the head of the page: drop the step (RISK-6), log it, do not edit the test.'
        - 'The harness regexes of CON-2 stop matching: drop the step.'
      delegation_tier: 'standard'
      results: 'tier standard, effort medium, failed first check and the escalated retry (high); blocked by the implement workflow'
    - id: task-012
      title: 'Run the exit evidence of the run and record it'
      source_requirements:
        prd:
          - 'W5-4'
          - 'W5-5'
          - 'W5-7'
          - 'W5-9'
          - 'W5-10'
        tdd:
          - 'Observability and Verification'
          - 'DEC-8'
          - 'IMP-7'
          - 'CON-4'
      outputs:
        - 'In the prg of the run, each with its command and result (the results of the earlier tasks are cited, not re-run: after 5.4 the page has one more line, so --cut exits 2 on it by design and the cmp and --check-identical of 5.1b name a past commit; the others are run on the final tree): the sha256 of the page before 5.4; the cmp of the assembled page with git show HEAD of the page before and after 5.1b; build-editor.mjs --check-identical at 5.1b; --cut printing 311, 162, 100 beside measure-cut.cjs; --layers printing upward pairs: 0 (max 162); embed.sh --check; the stale-page check shown to fail locally; scripts/check-editor-moves.sh over the commits of the run (pending when the commits do not exist yet).'
        - 'The run of the consumers on the final tree: npm run test:unit, npm run test:coverage (the floor file scripts/editor-coverage-floor.json unchanged and not lowered), npm run lint, npm run format:check, ./mvnw verify -DskipITs=false, npm run test:e2e, and the website sed line followed by its grep -q checks.'
        - 'The time the tools tests add to test:unit (RISK-10), expected a few seconds against 76.'
        - 'The CI result of the pull request for Java, Page, Kernel, E2E, Build and Native: read when the pull request exists, recorded as pending before.'
      verification:
        - 'each command above exits 0, or the failure is logged as a finding with its output'
        - 'git status --porcelain lists only the files this plan names'
      risk: 'low'
      confidence: 85
      human_review: 'none'
      escalation_triggers:
        - 'A consumer fails on the assembled page: it is a defect of the run (the bytes are the same); find which step changed them, do not edit the consumer.'
        - 'The coverage floor fails: the tools tests do not load the page and cannot move it; find what did and do not lower the floor.'
        - 'The e2e suite fails once: run the failing spec alone as the P1 gate did, record both results, do not retry silently.'
      delegation_tier: 'standard'
    - id: task-013
      title: 'Write the exit evidence and the untouched-paths proof into the run document'
      source_requirements:
        prd:
          - 'W5-7'
          - 'W5-9'
          - 'W5-10'
          - 'W5-11'
        tdd:
          - 'IMP-7'
          - 'Observability and Verification'
          - 'Deployment and Rollout'
          - 'Q-3'
      outputs:
        - 'run-0183-editor-assembly-and-first-cuts.md gains an "Exit evidence" section, one line per item of the exit evidence of the row W-5 and of the three P3 gate items this run owns, each citing the command result recorded in the prg and not copying it.'
        - 'A "Files outside likely_paths" line: src/main/editor/**, src/test/javascript/editor-build/**, package-lock.json, CLAUDE.md, and a line that pom.xml, EditorHttpServer, harness.js and the other IMP-7 paths are unchanged, with the git diff --stat that shows it.'
        - 'A "Pending for the author" section: the read of the Native job and the Page job on the pull request (W5-11), and Q-3 (the red Page job on a stale page is proved locally, not pushed; the author can ask for a scratch-branch commit).'
        - 'A "Canonical impact" line (none: docs/ holds run, wav and fixtures; no canonical register is declared) and a "Review pass" line. The frontmatter status is not changed by this task.'
      verification:
        - 'grep that each cited prg line exists'
        - 'ls pom.xml src/main/java/io/morin/archicode/cli/EditorHttpServer.java src/test/javascript/viewpoint-kernel/harness.js (each path exists, else the empty diff proves nothing), then git diff --stat HEAD -- pom.xml src/main/java src/test/javascript/viewpoint-kernel/harness.js src/main/resources/application.properties scripts/editor-coverage.mjs scripts/editor-coverage-floor.json scripts/extract-editor-script.mjs .prettierignore eslint.config.mjs prints nothing'
      risk: 'low'
      confidence: 85
      human_review: 'none'
      escalation_triggers:
        - 'A path of IMP-7 differs: revert that edit by editing the file back (no destructive git) and log it as a finding.'
        - 'The wording would say that CI is green before the pull request exists: write pending.'
      delegation_tier: 'standard'
```

## 5. Parallelization Plan

```yaml
parallelization_plan:
  groups:
    - id: parallel-group-001
      tasks:
        - task-004
        - task-008
      reason: 'Both need the moved layout of task-003 and write different files: task-004 writes scripts/check-editor.mjs, its test, package.json and package-lock.json; task-008 writes embed.sh only.'
      conflict_risks:
        - 'Both run npm run editor:build or editor:check, which can rewrite standalone.html; the page is the same bytes after 5.1b, so a run by one cannot change what the other reads.'
        - 'The Rust build in embed.sh uses the cargo target folder under src/main/rust/viewpoint-kernel/target; task-004 does not touch it.'
    - id: parallel-group-002
      tasks:
        - task-006
        - task-007
      reason: 'Both need task-005 and write different files: task-006 writes check-editor.mjs, the three lists, layers.json, package.json and its tests; task-007 writes check-editor-moves.sh and its test.'
      conflict_risks:
        - 'task-007 runs check-editor.mjs --statements inside its tests; if task-006 is half-written the tests of task-007 may see a changed --layers. The tests of task-007 call --statements and --root only.'
        - 'Both run node --test over src/test/javascript/editor-build; run the whole folder once more after both are done.'
  sequential_reason: 'task-001, task-002 and task-003 are a chain (corrected design, assembler, move); task-005 follows task-004 in the same file; task-009 needs 006, 007 and 008; the rest follows the order of the five commits.'
```

## 6. Human Review Gates

This run operates under the autonomy override of complete-run: a task that would be `human_required` is executed and its decision logged. None is expected; the plan has no `human_required` task and no `critical` risk. The one gate of the run is the reading of the pull request by the author, which is not a task and which no task depends on. The override does not suspend the standing safety rules: no commit message carries a secret, no push, no force, no `--no-verify`, no destructive git; commits are made only as the session and the wave git workflow allow.

```yaml
human_review_gates:
  gates:
    - id: gate-001
      trigger: 'The pull request of the wave exists: the Page, Native, Java, Kernel, E2E and Build jobs of its run are the proof of the workflow change (W5-11, CON-4) and of the red-on-stale-page substitute (Q-3)'
      required_before: []
      required_after: ['task-003', 'task-009', 'task-013']
      reviewer_focus:
        - 'The Page job has the stale-page step before the format check and the move-commit step on a pull_request only; no publishing step, no Build, Release or website step changed.'
        - 'Native passes unchanged: pom.xml and quarkus.native.resources.includes are untouched, src/main/editor is outside src/main/resources.'
        - 'The 5.1b commit is a pure move (refactor: move subject, diff of the page empty) and the Page job output shows ok for it.'
        - 'ratchet.max 162 appears once, in the 5.2 commit, and is never raised.'
        - 'Q-3: whether the author wants a throwaway commit on a scratch branch to see the Page job red.'
```

## 7. Risk Assessment

```yaml
risk_assessment:
  by_task:
    - id: task-001
      risk: 'low'
      rationale: 'Edits to the text of a design already decided and reviewed; the one care is not changing a decision.'
    - id: task-002
      risk: 'medium'
      rationale: 'New code that every later step relies on; a wrong rule is caught by task-003 against the real page.'
    - id: task-003
      risk: 'high'
      rationale: 'Changes how the published page is produced (the editor served by the jar, the native image and the website) and the first commit is a pure move; mitigated by cmp with the parent, --check-identical and the whole node suite, and by the consumers keeping the same path and bytes.'
    - id: task-004
      risk: 'medium'
      rationale: 'A port of the measure with a numeric contract (311, 162, 100) and two added devDependencies that edit the lock file.'
    - id: task-005
      risk: 'medium'
      rationale: 'The load-order rule is over-approximated for calls; a mistake refuses a safe relocation (the safe direction) but a gap would let a wrong order through, so the tests pin both directions.'
    - id: task-006
      risk: 'medium'
      rationale: 'Commits the ratchet maximum and the name lists that W-6 to W-9 live by; a wrong list blocks every later run.'
    - id: task-007
      risk: 'medium'
      rationale: 'A shell script that runs git worktree and node on past commits; quoting and cleanup errors are the risk.'
    - id: task-008
      risk: 'medium'
      rationale: 'Touches the kernel embedding the Kernel job checks; the write mode needs Rust and Node.'
    - id: task-009
      risk: 'high'
      rationale: 'Edits the CI workflow that gates Build and the release, and adds hooks that write a committed file; proved only by the run of the pull request.'
    - id: task-010
      risk: 'low'
      rationale: 'Documentation of commands the run has already executed.'
    - id: task-011
      risk: 'medium'
      rationale: 'Moves the page by one line after every step whose proof is byte identity; conditional and dropped if any test needs editing.'
    - id: task-012
      risk: 'low'
      rationale: 'Read-only commands and records.'
    - id: task-013
      risk: 'low'
      rationale: 'Documents inside the run directory.'
  by_area:
    - area: 'infra'
      risk: 'high'
      rationale: 'The Page job and embed.sh are on the path of the release pipeline; nothing here touches the Build, Release, Native or website steps, and the run of the pull request is the proof.'
    - area: 'api'
      risk: 'low'
      rationale: 'The served and published page keeps its path and its bytes; the editor and the CLI are unchanged.'
    - area: 'docs'
      risk: 'low'
      rationale: 'CLAUDE.md and the run documents only.'
    - area: 'data'
      risk: 'low'
      rationale: 'No manifest, schema or kernel contract change; the wasm is rebuilt only to prove embed.sh and must come out unchanged.'
```

## 8. Confidence Assessment

```yaml
confidence_assessment:
  by_task:
    - id: task-001
      score: 80
      rationale: 'Six findings of different kinds in a long document; none changes a decision and each names its place.'
    - id: task-002
      score: 80
      rationale: 'The directives and refusals are fully specified in DEC-2, and the prototype assembly of ASM-2 already reproduced the page.'
    - id: task-003
      score: 80
      rationale: 'The line ranges of the cut are measured and the byte comparison is exact; the risk is a stray newline at a boundary, found at once by cmp.'
    - id: task-004
      score: 70
      rationale: 'The port of measure-cut.cjs must reproduce three numbers and 1,331 names; the original is committed beside it and runs on the same page.'
    - id: task-005
      score: 65
      rationale: 'The load-order rule for calls is the hardest definition of the run and its tests are to be written from definitions, not from a prior implementation.'
    - id: task-006
      score: 75
      rationale: 'Mostly wiring of earlier pieces and lists derived by grep; the Java names check has three sides.'
    - id: task-007
      score: 80
      rationale: 'A small script with a temporary-repository test for each branch.'
    - id: task-008
      score: 80
      rationale: 'A short change with a command that proves it (embed.sh --check), run locally.'
    - id: task-009
      score: 75
      rationale: 'Two workflow steps and three hooks; the unknown is the workflow expression for the base and head sha, which the pull request run settles.'
    - id: task-010
      score: 85
      rationale: 'Describes commands already executed.'
    - id: task-011
      score: 80
      rationale: 'One line, a clear drop rule if a test depends on the head of the page.'
    - id: task-012
      score: 85
      rationale: 'Commands with known results from the earlier tasks.'
    - id: task-013
      score: 85
      rationale: 'Short citations of recorded results.'
```

## 9. Agent Assignment Plan

```yaml
agent_assignment_plan:
  assignments:
    - task_id: task-001
      agent_role: 'Documentation Agent'
      objective: 'Apply findings R-1 to R-6 of the Stage 5 review to the TDD and record in its Review pass section that they were applied.'
      context:
        prd_excerpts:
          - 'W5-3 the top-level names equal a committed list and the Java-named functions exist.'
          - 'W5-10 the move check, the ratchet maximum committed once and never raised.'
        tdd_excerpts:
          - 'Review pass R-1 to R-6 with their fixes; DEC-1, DEC-5, DEC-6, CTR-4, CTR-5, TG-4, Mismatches, DEF-3.'
      likely_files:
        - 'docs/wav/wav-024-fixes-and-editor-modules/run/run-0183-editor-assembly-and-first-cuts/tdd-0183-editor-assembly-and-first-cuts.md'
      acceptance_criteria:
        - 'Each finding is applied in the place it names, no decision changes, and the Review pass section says which were applied.'
      verification:
        - 'grep for each new sentence'
        - 'measure-cut.cjs and the page hash'
      escalation_triggers:
        - 'A fix would change a decision.'
        - 'The page hash differs.'
      suggested_subagent_type: 'general-purpose'
      suggested_model: '(default)'
      suggested_effort: 'medium'
    - task_id: task-002
      agent_role: 'Backend Implementation Agent'
      objective: 'Write scripts/build-editor.mjs and its tests, and add editor:build and editor:check to package.json.'
      context:
        prd_excerpts:
          - 'W5-1 an assembler with assemble, --check and --check-identical.'
        tdd_excerpts:
          - 'DEC-2 the directives, the refusals and the modes; ASM-2 the prototype assembly; CON-2 the harness regexes; CON-6 Prettier and ESLint.'
      likely_files:
        - 'scripts/build-editor.mjs'
        - 'src/test/javascript/editor-build/build-editor.test.js'
        - 'package.json'
      acceptance_criteria:
        - 'Every rule and mode of DEC-2 has a test; no dependency; format and lint pass.'
      verification:
        - 'node --test src/test/javascript/editor-build/build-editor.test.js'
        - 'npm run format:check and npm run lint'
        - 'npm run test:unit'
      escalation_triggers:
        - 'A rule cannot reproduce the page.'
        - 'The existing Prettier or ESLint options cannot accept the new files.'
      suggested_subagent_type: 'general-purpose'
      suggested_model: '(default)'
      suggested_effort: 'medium'
    - task_id: task-003
      agent_role: 'Refactoring Agent'
      objective: 'Cut the committed page into the skeleton, the four files and the one script part by line ranges, write layers.json, rebuild, and prove the page did not change by one byte.'
      context:
        prd_excerpts:
          - 'W5-8 the first cuts are the non-logic parts.'
          - 'W5-9 the assembled file equals the old page.'
        tdd_excerpts:
          - 'ASM-2 the line ranges 12-15, 18-970, 1000-1026, 1030-23161 and the 58-line skeleton; DEC-1 5.1b is a pure move; DEC-3 layers.json without ratchet.'
      likely_files:
        - 'src/main/editor/page.html'
        - 'src/main/editor/style.css'
        - 'src/main/editor/theme-boot.js'
        - 'src/main/editor/codemirror-loader.mjs'
        - 'src/main/editor/unsorted/script.js'
        - 'src/main/editor/layers.json'
        - 'src/main/resources/editor-webapp/standalone.html'
      acceptance_criteria:
        - 'cmp of the rebuilt page with git show HEAD of it is empty; --check-identical HEAD exits 0; the node suite is green; the sha256 starts a653717d5564c237.'
      verification:
        - 'cmp, --check-identical, sha256sum'
        - 'npm run test:unit, npm run lint, npm run format:check'
      escalation_triggers:
        - 'One byte differs.'
        - 'The page hash is not a653717d5564c237 at the start.'
      suggested_subagent_type: 'general-purpose'
      suggested_model: '(default)'
      suggested_effort: 'high'
    - task_id: task-004
      agent_role: 'Backend Implementation Agent'
      objective: 'Write the core of scripts/check-editor.mjs (parse, scope analysis, names, pairs, --list, --cut, --write-names), add acorn and eslint-scope pinned exact, and make --cut reproduce 311, 162 and 100.'
      context:
        prd_excerpts:
          - 'W5-2 the layer file and its ratchet with the current violations counted.'
        tdd_excerpts:
          - 'DEC-4 the definitions of declaration, name, reference and pair, and the modes; DEC-6 and CTR-5 the dependencies; ASM-3; RISK-1 and RISK-4.'
          - 'measure-cut.cjs of run 0182 is the reference implementation of the counts.'
      likely_files:
        - 'scripts/check-editor.mjs'
        - 'src/test/javascript/editor-build/check-editor.test.js'
        - 'package.json'
        - 'package-lock.json'
        - 'docs/wav/wav-024-fixes-and-editor-modules/run/run-0182-editor-modules-design/measure-cut.cjs'
        - 'docs/wav/wav-024-fixes-and-editor-modules/run/run-0182-editor-modules-design/editor-cut.json'
      acceptance_criteria:
        - '--cut prints 311, 162 and 100 on the real page, equal to measure-cut.cjs; the tests pass on synthetic fixtures; the lock changes by the two root entries and dev flags only.'
      verification:
        - 'node --test src/test/javascript/editor-build/check-editor.test.js'
        - 'node scripts/check-editor.mjs --cut on editor-cut.json'
        - 'npm ci in a scratch copy'
      escalation_triggers:
        - 'The numbers differ from the measure.'
        - 'The registry is unreachable.'
      suggested_subagent_type: 'general-purpose'
      suggested_model: '(default)'
      suggested_effort: 'medium'
    - task_id: task-005
      agent_role: 'Backend Implementation Agent'
      objective: 'Add the load-order check and the --statements mode to scripts/check-editor.mjs with tests that pin both the refusals and the passes.'
      context:
        prd_excerpts:
          - 'W5-10 the guards the later move and relocate commits rely on.'
        tdd_excerpts:
          - 'DEC-4 the load-order rule (exact for variables, over-approximated for calls) and --statements; RISK-2; 0182 DEC-5 and DEC-10 for the meaning of relocate.'
      likely_files:
        - 'scripts/check-editor.mjs'
        - 'src/test/javascript/editor-build/check-editor-statements.test.js'
      acceptance_criteria:
        - 'Each case of the Outputs list has a test; --statements HEAD on the real page exits 0.'
      verification:
        - 'node --test src/test/javascript/editor-build/check-editor-statements.test.js'
        - 'npm run test:unit'
      escalation_triggers:
        - 'The rule cannot be exact for variables.'
        - 'A safe case is refused and the tests expect a pass.'
      suggested_subagent_type: 'general-purpose'
      suggested_model: '(default)'
      suggested_effort: 'high'
    - task_id: task-006
      agent_role: 'Backend Implementation Agent'
      objective: 'Write names.json and java-names.json (with pathOnly), the --layers mode, ratchet.max 162 and the extended editor:check.'
      context:
        prd_excerpts:
          - 'W5-2 the ratchet maximum; W5-3 the names equal a committed list and the Java-named functions exist.'
        tdd_excerpts:
          - 'DEC-3, DEC-4, DEC-5 (corrected by task-001), CTR-3, CTR-4, CTR-5.'
      likely_files:
        - 'src/main/editor/names.json'
        - 'src/main/editor/java-names.json'
        - 'src/main/editor/layers.json'
        - 'scripts/check-editor.mjs'
        - 'src/test/javascript/editor-build/check-editor-layers.test.js'
        - 'package.json'
        - 'src/main/java'
        - 'src/test/java'
      acceptance_criteria:
        - 'npm run editor:check exits 0 and prints upward pairs: 0 (max 162); a one-byte hand edit makes it exit 1 with the sentence of DEC-2; the Java check passes on the repository and fails on a new Java file that names the page.'
      verification:
        - 'node --test src/test/javascript/editor-build/check-editor-layers.test.js'
        - 'npm run editor:check'
        - 'npm run test:unit'
      escalation_triggers:
        - '--cut did not print the design numbers.'
        - 'A listed name is not a top-level declaration.'
      suggested_subagent_type: 'general-purpose'
      suggested_model: '(default)'
      suggested_effort: 'medium'
    - task_id: task-007
      agent_role: 'Backend Implementation Agent'
      objective: 'Write scripts/check-editor-moves.sh and its tests on a temporary repository.'
      context:
        prd_excerpts:
          - 'W5-10 every move commit passes --check-identical against its parent.'
        tdd_excerpts:
          - 'DEC-6 the script; CTR-6 the commit subjects; FLOW-2; RISK-8 and RISK-9; Security and Privacy.'
      likely_files:
        - 'scripts/check-editor-moves.sh'
        - 'src/test/javascript/editor-build/check-editor-moves.test.js'
      acceptance_criteria:
        - 'A pure move passes, a move that edits a byte fails and is named, a relocate is checked with --statements, other subjects are not checked, a missing base is one sentence.'
      verification:
        - 'node --test src/test/javascript/editor-build/check-editor-moves.test.js'
        - 'bash -n scripts/check-editor-moves.sh'
      escalation_triggers:
        - 'git worktree is not available in the test environment.'
      suggested_subagent_type: 'general-purpose'
      suggested_model: '(default)'
      suggested_effort: 'medium'
    - task_id: task-008
      agent_role: 'Infrastructure Agent'
      objective: 'Make the write mode of embed.sh write the kernel block through scripts/build-editor.mjs and keep the check mode as it is.'
      context:
        prd_excerpts:
          - 'W5-5 embed.sh through the assembler.'
        tdd_excerpts:
          - 'DEC-7, FLOW-3, CON-7 (the Kernel job has rustup and python3, no npm ci).'
      likely_files:
        - 'src/main/rust/viewpoint-kernel/embed.sh'
      acceptance_criteria:
        - 'embed.sh --check passes; a write-mode run on the unchanged kernel changes neither the wasm nor the page.'
      verification:
        - 'src/main/rust/viewpoint-kernel/embed.sh --check'
        - 'git diff --stat HEAD -- src/main/wasm src/main/resources after a write-mode run'
      escalation_triggers:
        - 'The kernel build is not reproducible on this machine.'
      suggested_subagent_type: 'general-purpose'
      suggested_model: '(default)'
      suggested_effort: 'medium'
    - task_id: task-009
      agent_role: 'Infrastructure Agent'
      objective: 'Add the three hooks to package.json and the two steps to the Page job, changing nothing else in the workflow.'
      context:
        prd_excerpts:
          - 'W5-4 tests, coverage and lint read a current page.'
          - 'W5-6 the CI Page job follows the layout.'
        tdd_excerpts:
          - 'DEC-6, FLOW-1, FLOW-2, CON-9, RISK-3, RISK-7.'
      likely_files:
        - 'package.json'
        - '.github/workflows/ci-build.yaml'
      acceptance_criteria:
        - 'The workflow diff is the two steps; the hooks are quiet when the page is current; the workflow parses.'
      verification:
        - 'yaml parse of the workflow and git diff of it'
        - 'npm run editor:check, lint, format:check, test:unit'
      escalation_triggers:
        - 'A change would reach another job or a publishing step.'
        - 'A hook rewrites the page when nothing differs.'
      suggested_subagent_type: '(inline)'
      suggested_model: '(default)'
      suggested_effort: '(inline)'
    - task_id: task-010
      agent_role: 'Documentation Agent'
      objective: 'Update CLAUDE.md with the commands, the hooks, the generated page and the three lists, and correct the sentences that stopped being true.'
      context:
        prd_excerpts:
          - 'W5-6 the layout is documented where the repository documents its commands.'
        tdd_excerpts:
          - 'IMP-6, DEC-6, DEC-8, RISK-11.'
      likely_files:
        - 'CLAUDE.md'
      acceptance_criteria:
        - 'Every command named in the new text runs and exits 0; no sentence claims a guard the tools do not give.'
      verification:
        - 'grep of the commands'
        - 'npm run editor:build and npm run editor:check'
      escalation_triggers:
        - 'A sentence would over-claim the hooks.'
      suggested_subagent_type: 'general-purpose'
      suggested_model: '(default)'
      suggested_effort: 'low'
    - task_id: task-011
      agent_role: 'Refactoring Agent'
      objective: 'Add the generated-file comment to page.html, rebuild, and keep the change only if no test needs editing.'
      context:
        prd_excerpts:
          - 'W5-9 the suites pass on the assembled page.'
        tdd_excerpts:
          - 'DEC-9, CON-2, CON-3, RISK-6.'
      likely_files:
        - 'src/main/editor/page.html'
        - 'src/main/resources/editor-webapp/standalone.html'
      acceptance_criteria:
        - 'The comment has no <script, <meta or archicode-version; the node suite, EditorServeIT and the e2e suite pass with no test edited, or the step is dropped and logged.'
      verification:
        - 'npm run editor:check, npm run test:unit, EditorServeIT, npm run test:e2e'
      escalation_triggers:
        - 'A test depends on the head of the page.'
      suggested_subagent_type: 'general-purpose'
      suggested_model: '(default)'
      suggested_effort: 'medium'
    - task_id: task-012
      agent_role: 'QA Agent'
      objective: 'Run every exit-evidence command on the final tree and record command and result in the prg.'
      context:
        prd_excerpts:
          - 'W5-9 node suite, Java suite, e2e, embed.sh --check and EditorServeIT pass.'
        tdd_excerpts:
          - 'Observability and Verification; DEC-8; CON-4.'
      likely_files:
        - 'docs/wav/wav-024-fixes-and-editor-modules/run/run-0183-editor-assembly-and-first-cuts/prg-0183-editor-assembly-and-first-cuts.md'
      acceptance_criteria:
        - 'Each command exits 0 or its failure is logged as a finding; the coverage floor file is unchanged.'
      verification:
        - 'the commands of the Observability and Verification section'
      escalation_triggers:
        - 'A consumer fails on the assembled page.'
      suggested_subagent_type: 'general-purpose'
      suggested_model: 'haiku'
      suggested_effort: 'low'
    - task_id: task-013
      agent_role: 'Documentation Agent'
      objective: 'Write the exit evidence, the files outside likely_paths and the pending items into the run document, citing the prg.'
      context:
        prd_excerpts:
          - 'W5-11 the Native job is read on the pull request.'
        tdd_excerpts:
          - 'IMP-7, Deployment and Rollout, Q-3.'
      likely_files:
        - 'docs/wav/wav-024-fixes-and-editor-modules/run/run-0183-editor-assembly-and-first-cuts/run-0183-editor-assembly-and-first-cuts.md'
      acceptance_criteria:
        - 'One line per exit item citing a recorded result; IMP-7 paths shown unchanged; the pull request read written as pending until it exists.'
      verification:
        - 'grep of the cited prg lines'
        - 'git diff --stat of the IMP-7 paths prints nothing'
      escalation_triggers:
        - 'A path of IMP-7 differs.'
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
        - 'grep of the applied sentences'
        - 'measure script'
        - 'sha256 of the page'
      success_criteria:
        - 'R-1 to R-6 are visible in the TDD in the place the review names, the Review pass section says they were applied, measure-cut.cjs prints 1,349, 68 and 311, 162, 100, and the page hash starts a653717d5564c237.'
    - task_id: task-002
      methods:
        - 'unit tests of the assembler'
        - 'format check'
        - 'lint'
        - 'node suite'
      success_criteria:
        - 'Every directive, refusal and mode of DEC-2 is tested; no dependency; the node suite is green.'
    - task_id: task-003
      methods:
        - 'cmp with the parent page'
        - '--check-identical'
        - 'sha256'
        - 'node suite'
        - 'lint and format check'
      success_criteria:
        - 'The rebuilt page equals the parent page byte for byte, its sha256 starts a653717d5564c237, the diff under src/main/resources is empty, the node suite is green.'
    - task_id: task-004
      methods:
        - 'unit tests of the checker'
        - '--cut against measure-cut.cjs'
        - 'npm ci in a scratch copy'
        - 'git diff of the lock file'
      success_criteria:
        - '--cut prints 311, 162, 100; 1,331 names and 18 unnamed statements; the lock changes by the two root entries and dev flags only.'
    - task_id: task-005
      methods:
        - 'unit tests of load order and --statements'
        - 'node suite'
      success_criteria:
        - 'Each refusal and each pass of the Outputs list is a passing test; --statements HEAD on the real page exits 0.'
    - task_id: task-006
      methods:
        - 'unit tests of --layers and the lists'
        - 'npm run editor:check on the true page and on a one-byte edit'
        - 'node suite'
      success_criteria:
        - 'upward pairs: 0 (max 162) on the true page; exit 1 with the sentence of DEC-2 on the edit, restored afterwards; the Java names check passes on the repository and fails on a new file that names the page.'
    - task_id: task-007
      methods:
        - 'unit tests on a temporary repository'
        - 'bash -n'
      success_criteria:
        - 'A pure move passes, an edited move fails and is named, a relocate is checked, other commits are not, a missing base is one sentence.'
    - task_id: task-008
      methods:
        - 'embed.sh --check'
        - 'write-mode run and git diff'
        - 'kernel tests that assert the block'
      success_criteria:
        - 'embed.sh --check exits 0; a write-mode run on the unchanged kernel changes neither the wasm nor the page.'
    - task_id: task-009
      methods:
        - 'yaml parse of the workflow'
        - 'git diff of the workflow'
        - 'npm scripts run'
      success_criteria:
        - 'The workflow diff is the two steps; the hooks are quiet on a current page; the pull request run is the final proof, read by gate-001.'
    - task_id: task-010
      methods:
        - 'grep'
        - 'run of the commands named'
      success_criteria:
        - 'The new text names the commands, the hooks, the generated page and the lists, and each command exits 0.'
    - task_id: task-011
      methods:
        - 'node suite'
        - 'EditorServeIT'
        - 'e2e suite'
      success_criteria:
        - 'All pass with no test edited, or the step is dropped and logged.'
    - task_id: task-012
      methods:
        - 'every command of Observability and Verification'
      success_criteria:
        - 'unit, coverage (floor unchanged), lint, format, mvnw verify -DskipITs=false, e2e, embed.sh --check, the website sed line, the stale-page check and the move script all recorded with their results.'
    - task_id: task-013
      methods:
        - 'grep of the cited prg lines'
        - 'git diff --stat of the IMP-7 paths'
      success_criteria:
        - 'Each exit item cites a recorded result; the IMP-7 paths are shown unchanged; pending items are written as pending.'
```

## 11. Escalation Rules

This run operates under the autonomy override of complete-run, so a task that would stop on category alone is executed and its decision logged. The rules below stop on a specific condition only.

```yaml
escalation_rules:
  rules:
    - condition: 'The sha256 of the page does not start a653717d5564c237, or its line count is not 23,170, at the start of task-001 or task-003 (ASM-1, ASM-6).'
      action: 'Regenerate the numbers with measure-cut.cjs, correct the cut table and the TDD where the figure appears, log it, and do not commit a ratchet maximum until --cut reproduces the design numbers.'
    - condition: 'The rebuilt page differs from its parent by one byte at 5.1b.'
      action: 'Do not edit the page; find the rule of DEC-2 or the cut that is wrong; the move commit is not made until cmp is empty.'
    - condition: 'check-editor.mjs --cut does not print 311, 162 and 100 (RISK-1).'
      action: 'Explain the difference from measure-cut.cjs in the prg and fix the port; if it cannot be reconciled, leave ratchet.max unwritten and report a blocker for the maximum, the rest of the run goes on.'
    - condition: 'A fix, a rule or a test would change a decision of the TDD (a commit kind, the order of the steps, a number of DEC-3, the layer of a part).'
      action: 'Stop that change, log it as a finding and leave the decision as the TDD has it; this run builds the accepted design and makes no new decision.'
    - condition: 'A diff touches pom.xml, src/main/java/io/morin/archicode/cli/EditorHttpServer.java, src/test/javascript/viewpoint-kernel/harness.js, application.properties, scripts/editor-coverage*, scripts/extract-editor-script.mjs, .prettierignore or eslint.config.mjs (IMP-7).'
      action: 'Revert that edit by editing the file back (no destructive git command) and log it as a finding; if the change is needed, stop and report: the design says it is not.'
    - condition: 'A workflow change would reach a job other than Page or any publishing step, or the Native job result cannot be read (CON-4).'
      action: 'Do not make the change; record the Native read as pending for gate-001.'
    - condition: 'A test needs editing to pass at 5.4 (RISK-6).'
      action: 'Drop the comment commit, log the reason, keep the other steps.'
    - condition: 'The coverage floor fails or the node suite fails on the assembled page.'
      action: 'The bytes are the same as before, so find which step changed them; do not lower the floor or edit a consumer.'
    - condition: 'Committing or pushing is needed for an item of evidence and the session is not authorised to commit.'
      action: 'Leave the item pending in the prg and the run document; never push, force, amend or skip hooks.'
    - condition: 'Confidence of a task falls below 70 during execution.'
      action: 'Re-dispatch once one effort step up, then handle inline, and log it.'
```

## 12. Final Execution Manifest

```yaml
execution_manifest:
  status: 'in_progress'
  recommendation: 'proceed_with_review'
  autonomy_level: 'medium'
  total_tasks: 13
  autonomous_tasks: 10
  review_before_tasks: 0
  review_after_tasks: 3
  human_required_tasks: 0
  blocked_tasks: 0
  critical_path_tasks:
    - task-001
    - task-002
    - task-003
    - task-004
    - task-005
    - task-006
    - task-009
    - task-010
    - task-011
    - task-012
    - task-013
  parallel_groups:
    - parallel-group-001
    - parallel-group-002
  required_human_gates:
    - gate-001
  highest_risk_tasks:
    - task-003
    - task-009
  lowest_confidence_tasks:
    - task-005
    - task-004
  next_action: 'task-001: apply R-1 to R-6 to the TDD, after re-checking the page hash.'
  criteria:
    - 'All thirteen tasks done and their verification green, task-011 either kept or dropped with its reason logged.'
    - 'The assembled page equals the old page byte for byte through 5.1b to 5.3; ratchet.max 162 is committed once and the checker prints upward pairs: 0 (max 162).'
    - 'The tools, the hooks, the move script and the Page job steps exist, are tested and pass; embed.sh --check passes.'
    - 'Every consumer of the page passes with no edit; the IMP-7 paths are unchanged.'
    - 'The pull request run (Page, Native, Java, Kernel, E2E, Build) is read by gate-001 and recorded; until then it is pending, not claimed.'
```
