---
title: 'PLN: the YAML layer as six parts of the editor (W-6)'
type: pln
status: draft
owner: tmorin
date: 2026-10-26
run: 0184
wave: 024
related:
  - docs/wav/wav-024-fixes-and-editor-modules/run/run-0184-editor-extract-yaml-and-save/tdd-0184-editor-extract-yaml-and-save.md
  - docs/wav/wav-024-fixes-and-editor-modules/run/run-0184-editor-extract-yaml-and-save/run-0184-editor-extract-yaml-and-save.md
  - docs/wav/wav-024-fixes-and-editor-modules/run/run-0182-editor-modules-design/tdd-0182-editor-modules-design.md
  - docs/wav/wav-024-fixes-and-editor-modules/wav-024-fixes-and-editor-modules.md
---

# Execution Plan: run 0184, the YAML layer as six parts of the editor (W-6)

This is a TDD+pln run: there is no PRD. The requirements are W6-1 to W6-6 of the TDD, taken from the wave row W-6, the P3 gate and the accepted design of run 0182 (cited as 0182 DEC-n). The plan moves no logic: it cuts rows 1 to 6 of 0182 DEC-4 (3,546 lines, 137 declarations) out of src/main/editor/unsorted/script.js into six files of layer core, with the committed src/main/resources/editor-webapp/standalone.html unchanged byte for byte (sha256 starts a653717d5564c237), and adds one test (DEC-5).

The Stage 5 review of the TDD (findings R-1 to R-7 in the prg) was not applied by any earlier stage; task-001 applies them first. R-1 is a precondition and not a task: the sources of run 0183 are still uncommitted in the working tree, and a commit by path of a move must not be the commit that first adds them. The main agent or the author commits them by path before the implement workflow starts; task-002 stops, and does not degrade, if they are not.

Stage 9 (consistency check, 2026-10-26) re-read every task against the TDD, the wave row W-6 and the repository: the ranges, the part names and the first lines of the six cuts hold (checked on unsorted/script.js: script line k is page line k + 1029), the tools and options named exist (`--check`, `--check-identical`, `--map`, `--layers`, `embed.sh --check`, `editor:check`), and two corrections were made here: analyse takes the page text and not a root (R-3 wording), and the precondition of task-002 now lists the whole W-5 set that git status shows as uncommitted (package-lock.json, .github, CLAUDE.md and embed.sh as well as the sources). gap-002 is still true and is carried forward.

Commits follow the wave git workflow: one commit per move, by path (never git add -A), only when the session may commit (DEC-4); a task never pushes, amends, rewrites history or uses --no-verify. Where the commit does not exist, the evidence is recorded in the prg and the move-commit script is recorded as pending.

## 1. Executive Summary

```yaml
summary:
  status: 'pending'
  product_goal: 'The YAML reader, its serializer and the line-preserving save are six files of layer core under src/main/editor/core, the assembled page is byte for byte the page of today, and a test keeps the six parts from naming anything outside core.'
  technical_approach: 'Apply the review findings to the TDD, check the baseline and the W-5 precondition, cut the six ranges from the head of unsorted/script.js one after the other with the byte check, the map check and the layer check per move, run the whole node suite, add the DEC-5 test, then the end-of-run set.'
  total_tasks: 12
  parallel_groups: 0
  high_risk_tasks: 0
  human_review_gates: 1
  autonomy_level: 'medium'
  recommendation: 'proceed_with_review'
  criteria:
    - 'The six files exist with the lines of the ranges 1030-2372, 2373-2526, 2527-3085, 3086-3579, 3580-4272 and 4273-4575, layers.json lists them in this order before unsorted/script.js, and npm run editor:build writes a page cmp-identical to the committed one (sha256 starts a653717d5564c237).'
    - 'build-editor.mjs --check-identical HEAD passes and check-editor.mjs --layers prints upward pairs: 0 (max 162) after every move.'
    - 'npm run test:unit passes after the sixth move, then the DEC-5 test passes on the tree and fails on the altered copy.'
    - 'npm run test:coverage (floor file unchanged), ./mvnw verify -DskipITs=false, npm run test:e2e, embed.sh --check, npm run editor:check, npm run lint and npm run format:check pass.'
    - 'git diff --stat against the first parent lists only src/main/editor/core, unsorted/script.js, layers.json, the new test and the run documents.'
    - 'The pull request run (Page, Java, Kernel, E2E, Native, Build) is read at gate-001 and recorded; until then it is pending, not claimed.'
```

## 2. PRD/TDD Consistency Assessment

No PRD exists; the TDD is the referent and its requirement ids W6-1 to W6-6 stand in for the PRD ids.

```yaml
consistency_assessment:
  aligned_items:
    - 'W6-1 and W6-2 are addressed by DEC-1 and DEC-2 (tasks 003 to 008), W6-3 by DEC-3 and FLOW-2 (task-009 and task-011), W6-4 by CTR-1 and the end-of-run set (task-011), W6-5 by CON-1 and CON-3 (every move), W6-6 by DEC-5 (task-010).'
    - 'The scope matches the wave row W-6 and steps 6.1 to 6.6 of 0182 DEC-9; the rows 7 and after, parseYamlAsModel and persistence/save.js are not tasks here.'
  gaps:
    - id: gap-001
      type: 'contradiction'
      description: 'The prg lists review findings R-1 to R-7 that no stage applied; the TDD still names four per-move save tests in DEC-3 although Q-2 says they were dropped, and its figures and revert sentence are as the findings describe.'
      impact: 'medium'
      recommendation: 'task-001 applies R-1 to R-7 before any move; the plan builds the corrected design (no per-move node tests, whole suite at the end of the step).'
    - id: gap-002
      type: 'risk'
      description: 'ASM-2 does not hold: git status lists the W-5 sources as modified or untracked and nobody owns committing them (R-1).'
      impact: 'high'
      recommendation: 'The main agent or the author commits W-5 by path before the implement workflow; task-002 stops the run if it is not done. Carried as the blocker of this stage.'
    - id: gap-003
      type: 'missing_requirement'
      description: 'There is no PRD, so traceability to requirement ids is incomplete (the TDD says so).'
      impact: 'low'
      recommendation: 'Use W6-1 to W6-6 as the TDD names them.'
    - id: gap-004
      type: 'ambiguity'
      description: 'Stage 9: the plan said mapOf and analyse take a root; analyse takes the assembled page text, and the precondition of task-002 looked at fewer paths than the uncommitted W-5 set.'
      impact: 'low'
      recommendation: 'Corrected in this plan at Stage 9: task-001 and task-010 name mapOf(root), assemble(root) and analyse(html); task-002 checks package-lock.json, .github, CLAUDE.md and embed.sh too. Resolved.'
  blocking_gaps:
    - 'gap-002: the sources of run 0183 are not committed (R-1); the implement workflow cannot start until they are, and task-002 enforces it.'
```

## 3. Execution Graph

```yaml
execution_graph:
  nodes:
    - id: task-001
      status: 'done'
      title: 'Apply the Stage 5 review findings R-1 to R-7 to the TDD'
      depends_on: []
      produces:
        - 'docs/wav/wav-024-fixes-and-editor-modules/run/run-0184-editor-extract-yaml-and-save/tdd-0184-editor-extract-yaml-and-save.md'
      agent_role: 'Documentation Agent'
      autonomy: 'autonomous'
      risk: 'low'
      confidence: 85
    - id: task-002
      status: 'blocked'
      title: 'Precondition and baseline: the run 0183 sources are committed, the page is the measured one'
      depends_on: [task-001]
      produces:
        - 'evidence line in prg-0184 (baseline)'
      agent_role: 'QA Agent'
      autonomy: 'autonomous'
      risk: 'medium'
      confidence: 90
    - id: task-003
      status: 'pending'
      title: 'Move 1 of 6 (step 6.1): yaml-parser to src/main/editor/core/yaml-parser.js'
      depends_on: [task-002]
      produces:
        - 'src/main/editor/core/yaml-parser.js'
        - 'src/main/editor/unsorted/script.js'
        - 'src/main/editor/layers.json'
      agent_role: 'Refactoring Agent'
      autonomy: 'autonomous'
      risk: 'medium'
      confidence: 90
    - id: task-004
      status: 'pending'
      title: 'Move 2 of 6 (step 6.2): yaml-serializer to src/main/editor/core/yaml-serializer.js'
      depends_on: [task-003]
      produces:
        - 'src/main/editor/core/yaml-serializer.js'
        - 'src/main/editor/unsorted/script.js'
        - 'src/main/editor/layers.json'
      agent_role: 'Refactoring Agent'
      autonomy: 'autonomous'
      risk: 'medium'
      confidence: 90
    - id: task-005
      status: 'pending'
      title: 'Move 3 of 6 (step 6.3): yaml-patch-text to src/main/editor/core/yaml-patch-text.js'
      depends_on: [task-004]
      produces:
        - 'src/main/editor/core/yaml-patch-text.js'
        - 'src/main/editor/unsorted/script.js'
        - 'src/main/editor/layers.json'
      agent_role: 'Refactoring Agent'
      autonomy: 'autonomous'
      risk: 'medium'
      confidence: 90
    - id: task-006
      status: 'pending'
      title: 'Move 4 of 6 (step 6.4): yaml-patch-flow to src/main/editor/core/yaml-patch-flow.js'
      depends_on: [task-005]
      produces:
        - 'src/main/editor/core/yaml-patch-flow.js'
        - 'src/main/editor/unsorted/script.js'
        - 'src/main/editor/layers.json'
      agent_role: 'Refactoring Agent'
      autonomy: 'autonomous'
      risk: 'medium'
      confidence: 90
    - id: task-007
      status: 'pending'
      title: 'Move 5 of 6 (step 6.5): yaml-patch-lines to src/main/editor/core/yaml-patch-lines.js'
      depends_on: [task-006]
      produces:
        - 'src/main/editor/core/yaml-patch-lines.js'
        - 'src/main/editor/unsorted/script.js'
        - 'src/main/editor/layers.json'
      agent_role: 'Refactoring Agent'
      autonomy: 'autonomous'
      risk: 'medium'
      confidence: 90
    - id: task-008
      status: 'pending'
      title: 'Move 6 of 6 (step 6.6): yaml-block-moves to src/main/editor/core/yaml-block-moves.js'
      depends_on: [task-007]
      produces:
        - 'src/main/editor/core/yaml-block-moves.js'
        - 'src/main/editor/unsorted/script.js'
        - 'src/main/editor/layers.json'
      agent_role: 'Refactoring Agent'
      autonomy: 'autonomous'
      risk: 'medium'
      confidence: 90
    - id: task-009
      status: 'pending'
      title: 'Step 6.6 end: the whole node suite after the sixth move'
      depends_on: [task-008]
      produces:
        - 'evidence line in prg-0184 (npm run test:unit)'
      agent_role: 'QA Agent'
      autonomy: 'autonomous'
      risk: 'medium'
      confidence: 88
    - id: task-010
      status: 'pending'
      title: 'Test that the six YAML parts name nothing outside core (DEC-5), shown to fail once'
      depends_on: [task-009]
      produces:
        - 'src/test/javascript/editor-build/yaml-parts.test.js'
      agent_role: 'Test Generation Agent'
      autonomy: 'autonomous'
      risk: 'low'
      confidence: 80
    - id: task-011
      status: 'pending'
      title: 'End-of-run checks of 0182 DEC-6'
      depends_on: [task-010]
      produces:
        - 'evidence lines in prg-0184 (coverage, Java, e2e, embed, editor:check, diff stat)'
      agent_role: 'QA Agent'
      autonomy: 'autonomous'
      risk: 'medium'
      confidence: 80
    - id: task-012
      status: 'pending'
      title: 'Record the evidence and the sentence of CLAUDE.md if it states a size'
      depends_on: [task-011]
      produces:
        - 'docs/wav/wav-024-fixes-and-editor-modules/run/run-0184-editor-extract-yaml-and-save/run-0184-editor-extract-yaml-and-save.md'
        - 'docs/wav/wav-024-fixes-and-editor-modules/run/run-0184-editor-extract-yaml-and-save/prg-0184-editor-extract-yaml-and-save.md'
      agent_role: 'Documentation Agent'
      autonomy: 'autonomous'
      risk: 'low'
      confidence: 88
  edges:
    - from: task-001
      to: task-002
      reason: 'the later task reads what the earlier one leaves (the page, layers.json or the evidence)'
    - from: task-002
      to: task-003
      reason: 'the later task reads what the earlier one leaves (the page, layers.json or the evidence)'
    - from: task-003
      to: task-004
      reason: 'the later task reads what the earlier one leaves (the page, layers.json or the evidence)'
    - from: task-004
      to: task-005
      reason: 'the later task reads what the earlier one leaves (the page, layers.json or the evidence)'
    - from: task-005
      to: task-006
      reason: 'the later task reads what the earlier one leaves (the page, layers.json or the evidence)'
    - from: task-006
      to: task-007
      reason: 'the later task reads what the earlier one leaves (the page, layers.json or the evidence)'
    - from: task-007
      to: task-008
      reason: 'the later task reads what the earlier one leaves (the page, layers.json or the evidence)'
    - from: task-008
      to: task-009
      reason: 'the later task reads what the earlier one leaves (the page, layers.json or the evidence)'
    - from: task-009
      to: task-010
      reason: 'the later task reads what the earlier one leaves (the page, layers.json or the evidence)'
    - from: task-010
      to: task-011
      reason: 'the later task reads what the earlier one leaves (the page, layers.json or the evidence)'
    - from: task-011
      to: task-012
      reason: 'the later task reads what the earlier one leaves (the page, layers.json or the evidence)'
```

The six moves are a chain: each cuts the head that the one before left, and each is checked against the page the one before left. There is no fake parallelism.

## 4. Task Catalog

```yaml
task_catalog:
  tasks:
    - id: task-001
      title: 'Apply the Stage 5 review findings R-1 to R-7 to the TDD'
      source_requirements:
        prd:
          - 'W6-2'
          - 'W6-3'
        tdd:
          - 'ASM-2'
          - 'DEC-1'
          - 'DEC-3'
          - 'DEC-4'
          - 'DEC-5'
          - 'TG-2'
          - 'TG-4'
          - 'FLOW-1'
          - 'Observability and Verification'
          - 'Open Questions'
      outputs:
        - 'R-1: ASM-2 and RISK-1 say the main agent or the author commits the run 0183 sources by path before the implement workflow, the run stops and does not degrade otherwise, and the second path of DEC-4 covers only the case of a tracked tree without authority to commit.'
        - 'R-2: the four named save tests are removed from DEC-3 and from its rationale and tradeoffs; the whole suite stays at the end of the step.'
        - 'R-3: DEC-5 says the test calls a function of its own over a root folder (mapOf(root) from build-editor.mjs gives the parts; assemble(root).text from the same file is the page text that analyse(html) from check-editor.mjs takes: analyse takes the page text and not a root), runs it on the repository and on a temporary copy where a YAML part names a function of unsorted; TG-4 uses the wording of DEC-5 (outside the six, plus parseYamlAsModel).'
        - 'R-4: the figure 2,592 tests is removed from Observability and Verification.'
        - 'R-5: TG-2 and FLOW-1 step 7 make the commit conditional on DEC-4.'
        - 'R-6: the revert of DEC-3 and FLOW-1 restores unsorted/script.js and layers.json and deletes the new part file, by path.'
        - 'R-7: the sentence of DEC-1 on where the entry goes in layers.json reads after the previous part and before unsorted/script.js; mapOf is said to be exported by build-editor.mjs and analyse by check-editor.mjs.'
      verification:
        - 'grep for each applied sentence and for the absence of "2,592" and of the four test file names in DEC-3'
        - 'node scripts/build-editor.mjs --check'
      risk: 'low'
      confidence: 85
      human_review: 'none'
      escalation_triggers:
        - 'A fix would change a decision.'
        - 'The page hash differs.'
      delegation_tier: 'standard'
      results: 'tier standard, model sonnet, effort medium, profile low-cost, passed first time, inline (leaf), independently verified'
    - id: task-002
      title: 'Precondition and baseline: the run 0183 sources are committed, the page is the measured one'
      source_requirements:
        prd:
          - 'W6-2'
          - 'W6-4'
        tdd:
          - 'ASM-1'
          - 'ASM-2'
          - 'RISK-1'
          - 'FLOW-1'
      outputs:
        - 'git status --short -- scripts src/main/editor src/test/javascript/editor-build package.json package-lock.json .github CLAUDE.md src/main/rust/viewpoint-kernel/embed.sh is empty, or the task stops with state blocked and says the run waits for the commits of W-5 (nothing is committed by this task).'
        - 'build-editor.mjs --check prints that standalone.html is the assembly of src/main/editor (23170 lines); check-editor.mjs --layers prints 1331 names equal to names.json, load order holds and upward pairs: 0 (max 162); sha256sum of the page starts a653717d5564c237.'
        - 'The line count of src/main/editor/unsorted/script.js is 22132 and its first line is the line of the page 1030.'
      verification:
        - 'git status --short -- scripts src/main/editor src/test/javascript/editor-build package.json package-lock.json .github CLAUDE.md src/main/rust/viewpoint-kernel/embed.sh'
        - 'node scripts/build-editor.mjs --check'
        - 'node scripts/check-editor.mjs --layers'
        - 'sha256sum src/main/resources/editor-webapp/standalone.html'
        - 'wc -l src/main/editor/unsorted/script.js'
      risk: 'medium'
      confidence: 90
      human_review: 'none'
      escalation_triggers:
        - 'git status lists a W-5 source.'
        - 'The sha256 or a line count differs from the TDD.'
      delegation_tier: 'standard'
      results: 'tier standard, effort medium, failed first check and the escalated retry (high); blocked by the implement workflow'
    - id: task-003
      title: 'Move 1 of 6 (step 6.1): yaml-parser to src/main/editor/core/yaml-parser.js'
      source_requirements:
        prd:
          - 'W6-1'
          - 'W6-2'
          - 'W6-5'
        tdd:
          - 'DEC-1'
          - 'DEC-2'
          - 'DEC-3'
          - 'DEC-4'
          - 'CON-1'
          - 'CON-3'
          - 'FLOW-1'
          - 'IMP-1 to IMP-3'
      outputs:
        - 'src/main/editor/core/yaml-parser.js holds page lines 1030-2372 unchanged (1,343 lines, 68 declarations: `use strict` first, then the YAML 1.1 reader, numbers, tags, anchors), cut from the head of unsorted/script.js by line count, not by hand editing.'
        - 'layers.json lists the part with layer core after the previous part and before unsorted/script.js.'
        - 'The page is unchanged: build-editor.mjs --map gives the range 1030-2372 for the part, --check-identical HEAD prints no difference, --layers prints upward pairs: 0 (max 162).'
        - 'One commit by path with the subject "refactor: move yaml-parser to src/main/editor/core/yaml-parser.js" when the executor may commit (DEC-4), else the evidence only, in the prg.'
      verification:
        - 'node scripts/build-editor.mjs --map'
        - 'node scripts/build-editor.mjs --check'
        - 'node scripts/build-editor.mjs --check-identical HEAD'
        - 'node scripts/check-editor.mjs --layers'
        - 'npm run lint'
        - 'npm run format:check'
        - 'sha256sum of the page starts a653717d5564c237'
      risk: 'medium'
      confidence: 90
      human_review: 'none'
      escalation_triggers:
        - 'Any check fails: restore unsorted/script.js and layers.json and delete the new part file, by path (no git stash, no text edit to fit), log the failing command and its first line, stop the run.'
        - '--map differs from the range: the page changed since ASM-1, stop.'
      delegation_tier: 'standard'
    - id: task-004
      title: 'Move 2 of 6 (step 6.2): yaml-serializer to src/main/editor/core/yaml-serializer.js'
      source_requirements:
        prd:
          - 'W6-1'
          - 'W6-2'
          - 'W6-5'
        tdd:
          - 'DEC-1'
          - 'DEC-2'
          - 'DEC-3'
          - 'DEC-4'
          - 'CON-1'
          - 'CON-3'
          - 'FLOW-1'
          - 'IMP-1 to IMP-3'
      outputs:
        - 'src/main/editor/core/yaml-serializer.js holds page lines 2373-2526 unchanged (154 lines, 10 declarations: the serializer, starting at the "YAML serializer" heading), cut from the head of unsorted/script.js by line count, not by hand editing.'
        - 'layers.json lists the part with layer core after the previous part and before unsorted/script.js.'
        - 'The page is unchanged: build-editor.mjs --map gives the range 2373-2526 for the part, --check-identical HEAD prints no difference, --layers prints upward pairs: 0 (max 162).'
        - 'One commit by path with the subject "refactor: move yaml-serializer to src/main/editor/core/yaml-serializer.js" when the executor may commit (DEC-4), else the evidence only, in the prg.'
      verification:
        - 'node scripts/build-editor.mjs --map'
        - 'node scripts/build-editor.mjs --check'
        - 'node scripts/build-editor.mjs --check-identical HEAD'
        - 'node scripts/check-editor.mjs --layers'
        - 'npm run lint'
        - 'npm run format:check'
        - 'sha256sum of the page starts a653717d5564c237'
      risk: 'medium'
      confidence: 90
      human_review: 'none'
      escalation_triggers:
        - 'Any check fails: restore unsorted/script.js and layers.json and delete the new part file, by path (no git stash, no text edit to fit), log the failing command and its first line, stop the run.'
        - '--map differs from the range: the page changed since ASM-1, stop.'
      delegation_tier: 'standard'
    - id: task-005
      title: 'Move 3 of 6 (step 6.3): yaml-patch-text to src/main/editor/core/yaml-patch-text.js'
      source_requirements:
        prd:
          - 'W6-1'
          - 'W6-2'
          - 'W6-5'
        tdd:
          - 'DEC-1'
          - 'DEC-2'
          - 'DEC-3'
          - 'DEC-4'
          - 'CON-1'
          - 'CON-3'
          - 'FLOW-1'
          - 'IMP-1 to IMP-3'
      outputs:
        - 'src/main/editor/core/yaml-patch-text.js holds page lines 2527-3085 unchanged (559 lines, 19 declarations: patchYamlText and the decorations), cut from the head of unsorted/script.js by line count, not by hand editing.'
        - 'layers.json lists the part with layer core after the previous part and before unsorted/script.js.'
        - 'The page is unchanged: build-editor.mjs --map gives the range 2527-3085 for the part, --check-identical HEAD prints no difference, --layers prints upward pairs: 0 (max 162).'
        - 'One commit by path with the subject "refactor: move yaml-patch-text to src/main/editor/core/yaml-patch-text.js" when the executor may commit (DEC-4), else the evidence only, in the prg.'
      verification:
        - 'node scripts/build-editor.mjs --map'
        - 'node scripts/build-editor.mjs --check'
        - 'node scripts/build-editor.mjs --check-identical HEAD'
        - 'node scripts/check-editor.mjs --layers'
        - 'npm run lint'
        - 'npm run format:check'
        - 'sha256sum of the page starts a653717d5564c237'
      risk: 'medium'
      confidence: 90
      human_review: 'none'
      escalation_triggers:
        - 'Any check fails: restore unsorted/script.js and layers.json and delete the new part file, by path (no git stash, no text edit to fit), log the failing command and its first line, stop the run.'
        - '--map differs from the range: the page changed since ASM-1, stop.'
      delegation_tier: 'standard'
    - id: task-006
      title: 'Move 4 of 6 (step 6.4): yaml-patch-flow to src/main/editor/core/yaml-patch-flow.js'
      source_requirements:
        prd:
          - 'W6-1'
          - 'W6-2'
          - 'W6-5'
        tdd:
          - 'DEC-1'
          - 'DEC-2'
          - 'DEC-3'
          - 'DEC-4'
          - 'CON-1'
          - 'CON-3'
          - 'FLOW-1'
          - 'IMP-1 to IMP-3'
      outputs:
        - 'src/main/editor/core/yaml-patch-flow.js holds page lines 3086-3579 unchanged (494 lines, 15 declarations: the brackets), cut from the head of unsorted/script.js by line count, not by hand editing.'
        - 'layers.json lists the part with layer core after the previous part and before unsorted/script.js.'
        - 'The page is unchanged: build-editor.mjs --map gives the range 3086-3579 for the part, --check-identical HEAD prints no difference, --layers prints upward pairs: 0 (max 162).'
        - 'One commit by path with the subject "refactor: move yaml-patch-flow to src/main/editor/core/yaml-patch-flow.js" when the executor may commit (DEC-4), else the evidence only, in the prg.'
      verification:
        - 'node scripts/build-editor.mjs --map'
        - 'node scripts/build-editor.mjs --check'
        - 'node scripts/build-editor.mjs --check-identical HEAD'
        - 'node scripts/check-editor.mjs --layers'
        - 'npm run lint'
        - 'npm run format:check'
        - 'sha256sum of the page starts a653717d5564c237'
      risk: 'medium'
      confidence: 90
      human_review: 'none'
      escalation_triggers:
        - 'Any check fails: restore unsorted/script.js and layers.json and delete the new part file, by path (no git stash, no text edit to fit), log the failing command and its first line, stop the run.'
        - '--map differs from the range: the page changed since ASM-1, stop.'
      delegation_tier: 'standard'
    - id: task-007
      title: 'Move 5 of 6 (step 6.5): yaml-patch-lines to src/main/editor/core/yaml-patch-lines.js'
      source_requirements:
        prd:
          - 'W6-1'
          - 'W6-2'
          - 'W6-5'
        tdd:
          - 'DEC-1'
          - 'DEC-2'
          - 'DEC-3'
          - 'DEC-4'
          - 'CON-1'
          - 'CON-3'
          - 'FLOW-1'
          - 'IMP-1 to IMP-3'
      outputs:
        - 'src/main/editor/core/yaml-patch-lines.js holds page lines 3580-4272 unchanged (693 lines, 14 declarations: the line-by-line save), cut from the head of unsorted/script.js by line count, not by hand editing.'
        - 'layers.json lists the part with layer core after the previous part and before unsorted/script.js.'
        - 'The page is unchanged: build-editor.mjs --map gives the range 3580-4272 for the part, --check-identical HEAD prints no difference, --layers prints upward pairs: 0 (max 162).'
        - 'One commit by path with the subject "refactor: move yaml-patch-lines to src/main/editor/core/yaml-patch-lines.js" when the executor may commit (DEC-4), else the evidence only, in the prg.'
      verification:
        - 'node scripts/build-editor.mjs --map'
        - 'node scripts/build-editor.mjs --check'
        - 'node scripts/build-editor.mjs --check-identical HEAD'
        - 'node scripts/check-editor.mjs --layers'
        - 'npm run lint'
        - 'npm run format:check'
        - 'sha256sum of the page starts a653717d5564c237'
      risk: 'medium'
      confidence: 90
      human_review: 'none'
      escalation_triggers:
        - 'Any check fails: restore unsorted/script.js and layers.json and delete the new part file, by path (no git stash, no text edit to fit), log the failing command and its first line, stop the run.'
        - '--map differs from the range: the page changed since ASM-1, stop.'
      delegation_tier: 'standard'
    - id: task-008
      title: 'Move 6 of 6 (step 6.6): yaml-block-moves to src/main/editor/core/yaml-block-moves.js'
      source_requirements:
        prd:
          - 'W6-1'
          - 'W6-2'
          - 'W6-5'
        tdd:
          - 'DEC-1'
          - 'DEC-2'
          - 'DEC-3'
          - 'DEC-4'
          - 'CON-1'
          - 'CON-3'
          - 'FLOW-1'
          - 'IMP-1 to IMP-3'
      outputs:
        - 'src/main/editor/core/yaml-block-moves.js holds page lines 4273-4575 unchanged (303 lines, 11 declarations: cut and paste of a block, stray comments), cut from the head of unsorted/script.js by line count, not by hand editing.'
        - 'layers.json lists the part with layer core after the previous part and before unsorted/script.js.'
        - 'The page is unchanged: build-editor.mjs --map gives the range 4273-4575 for the part, --check-identical HEAD prints no difference, --layers prints upward pairs: 0 (max 162).'
        - 'One commit by path with the subject "refactor: move yaml-block-moves to src/main/editor/core/yaml-block-moves.js" when the executor may commit (DEC-4), else the evidence only, in the prg.'
      verification:
        - 'node scripts/build-editor.mjs --map'
        - 'node scripts/build-editor.mjs --check'
        - 'node scripts/build-editor.mjs --check-identical HEAD'
        - 'node scripts/check-editor.mjs --layers'
        - 'npm run lint'
        - 'npm run format:check'
        - 'sha256sum of the page starts a653717d5564c237'
      risk: 'medium'
      confidence: 90
      human_review: 'none'
      escalation_triggers:
        - 'Any check fails: restore unsorted/script.js and layers.json and delete the new part file, by path (no git stash, no text edit to fit), log the failing command and its first line, stop the run.'
        - '--map differs from the range: the page changed since ASM-1, stop.'
      delegation_tier: 'standard'
    - id: task-009
      title: 'Step 6.6 end: the whole node suite after the sixth move'
      source_requirements:
        prd:
          - 'W6-3'
        tdd:
          - 'DEC-3'
          - 'FLOW-2'
          - 'RISK-2'
      outputs:
        - 'npm run test:unit exits 0 on the assembled page; the number of tests is read from the output; git status shows standalone.html unchanged after the hooks.'
      verification:
        - 'npm run test:unit'
        - 'git status --short -- src/main/resources/editor-webapp/standalone.html'
      risk: 'medium'
      confidence: 88
      human_review: 'none'
      escalation_triggers:
        - 'A test fails: run that file alone on the parent tree (a scratch copy or a detached worktree, no git stash); if it passes there the failure is the cut and the step is reverted by path; if it fails there too it is named in the prg and re-run once.'
      delegation_tier: 'standard'
    - id: task-010
      title: 'Test that the six YAML parts name nothing outside core (DEC-5), shown to fail once'
      source_requirements:
        prd:
          - 'W6-6'
        tdd:
          - 'DEC-5'
          - 'TG-4'
          - 'CON-5'
          - 'RISK-6'
          - 'DEF-3'
      outputs:
        - 'yaml-parts.test.js calls a function of its own over a root folder, with mapOf(root) and assemble(root) from build-editor.mjs and analyse(html) from check-editor.mjs (analyse takes the assembled page text, not a root), takes the declarations of the six parts and asserts every top-level name they reference is declared in the six or is parseYamlAsModel (a commented exception that W-7 removes).'
        - 'It asserts the six files are in layers.json in this order, each with layer core, core/yaml-parser.js first and starting with use strict, and no part over 3000 lines.'
        - 'It runs the same function on a temporary copy of the tree where a YAML part names a function of unsorted and asserts the failure; the repository itself passes.'
        - 'One commit "test: the YAML parts name nothing outside core", never mixed with a move, when the executor may commit.'
      verification:
        - 'node --test src/test/javascript/editor-build/yaml-parts.test.js'
        - 'npm run format:check'
        - 'npm run lint'
      risk: 'low'
      confidence: 80
      human_review: 'none'
      escalation_triggers:
        - 'analyse or mapOf output differs from what the TDD assumes: log it, keep the test to what the output shows, change no decision.'
      delegation_tier: 'standard'
    - id: task-011
      title: 'End-of-run checks of 0182 DEC-6'
      source_requirements:
        prd:
          - 'W6-3'
          - 'W6-4'
          - 'W6-5'
        tdd:
          - 'FLOW-2'
          - 'IMP-5'
          - 'Observability and Verification'
          - 'Q-3'
      outputs:
        - 'npm run test:coverage passes and scripts/editor-coverage-floor.json is unchanged.'
        - 'JAVA_HOME of sdkman JDK 25: ./mvnw verify -DskipITs=false passes (PMD included).'
        - 'npm run test:e2e passes.'
        - 'src/main/rust/viewpoint-kernel/embed.sh --check and npm run editor:check pass; npm run lint and npm run format:check pass.'
        - 'git diff --stat against the first parent of the run lists only the IMP-1 to IMP-4 paths and the run documents; sha256 of the page starts a653717d5564c237.'
        - 'scripts/check-editor-moves.sh <merge-base> HEAD is run when the move commits exist, else recorded pending.'
      verification:
        - 'npm run test:coverage'
        - './mvnw verify -DskipITs=false'
        - 'npm run test:e2e'
        - 'src/main/rust/viewpoint-kernel/embed.sh --check'
        - 'npm run editor:check'
        - 'npm run lint'
        - 'npm run format:check'
        - 'git diff --stat'
      risk: 'medium'
      confidence: 80
      human_review: 'none'
      escalation_triggers:
        - 'A command fails because of the environment (JDK, browsers): name it in the prg, re-run once, record the rest and do not claim it green.'
        - 'Authorship of commits unavailable: check-editor-moves.sh stays pending for gate-001.'
      delegation_tier: 'standard'
    - id: task-012
      title: 'Record the evidence and the sentence of CLAUDE.md if it states a size'
      source_requirements:
        prd:
          - 'W6-2'
          - 'W6-3'
        tdd:
          - 'IMP-6'
          - 'Scope'
      outputs:
        - 'The run document cites the evidence of the prg (commands, exit codes, printed lines) and does not copy it; pending items (pull request run, check-editor-moves.sh without commits) are named.'
        - 'CLAUDE.md is edited only if it states a number of lines of unsorted/script.js or of the parts; it states neither today, so no edit is expected.'
      verification:
        - 'grep -n "unsorted/script.js" CLAUDE.md'
        - 'git diff --stat -- CLAUDE.md'
      risk: 'low'
      confidence: 88
      human_review: 'none'
      escalation_triggers:
        - 'A command line has no recorded result: do not write the claim.'
      delegation_tier: 'cheap'
```

## 5. Parallelization Plan

```yaml
parallelization_plan:
  groups: []
  sequential_reason: 'All twelve tasks are one chain: task-001 and task-002 precede every move, the moves share unsorted/script.js and layers.json, and every later task reads the page the moves leave.'
```

## 6. Human Review Gates

This run operates under the autonomy override of complete-run: a task that would be human_required is executed and its decision logged. None is expected; no task is human_required and none is critical. The one gate is the author reading the pull request, which no task depends on. The override does not suspend the standing safety rules: no push, no force, no --no-verify, no destructive git, commits only by path and only as the session allows.

```yaml
human_review_gates:
  gates:
    - id: gate-001
      trigger: 'The pull request of the wave exists: its run (Page, Java, Kernel, E2E, Native, Build) is the proof that this run cannot give for the Native job (CON-7) and for the move-commit check on commits.'
      required_before: []
      required_after: [task-008, task-010, task-011]
      reviewer_focus:
        - 'The six move commits have the refactor: move subject, a page diff that is empty, and the Page job reads them as ok.'
        - 'Native passes unchanged: src/main/editor is outside src/main/resources and no workflow, pom or Java file changed.'
        - 'The only exception in the DEC-5 test is parseYamlAsModel, with the comment that W-7 removes it.'
```

## 7. Risk Assessment

```yaml
risk_assessment:
  by_task:
    - id: task-001
      risk: 'low'
      rationale: 'Documentation or test only, no shipped file changes.'
    - id: task-002
      risk: 'medium'
      rationale: 'Reads or runs checks that can fail for the environment; changes no shipped file.'
    - id: task-003
      risk: 'medium'
      rationale: 'Pure move checked byte for byte against the parent, no behaviour changes, restore by path.'
    - id: task-004
      risk: 'medium'
      rationale: 'Pure move checked byte for byte against the parent, no behaviour changes, restore by path.'
    - id: task-005
      risk: 'medium'
      rationale: 'Pure move checked byte for byte against the parent, no behaviour changes, restore by path.'
    - id: task-006
      risk: 'medium'
      rationale: 'Pure move checked byte for byte against the parent, no behaviour changes, restore by path.'
    - id: task-007
      risk: 'medium'
      rationale: 'Pure move checked byte for byte against the parent, no behaviour changes, restore by path.'
    - id: task-008
      risk: 'medium'
      rationale: 'Pure move checked byte for byte against the parent, no behaviour changes, restore by path.'
    - id: task-009
      risk: 'medium'
      rationale: 'Reads or runs checks that can fail for the environment; changes no shipped file.'
    - id: task-010
      risk: 'low'
      rationale: 'Documentation or test only, no shipped file changes.'
    - id: task-011
      risk: 'medium'
      rationale: 'Reads or runs checks that can fail for the environment; changes no shipped file.'
    - id: task-012
      risk: 'low'
      rationale: 'Documentation or test only, no shipped file changes.'
  by_area:
    - area: 'docs'
      risk: 'low'
      rationale: 'Only the TDD, the run documents and one test file change.'
    - area: 'ui'
      risk: 'low'
      rationale: 'The shipped page is the same bytes; a wrong cut shows in the byte check before anything else.'
```

## 8. Confidence Assessment

```yaml
confidence_assessment:
  by_task:
    - id: task-001
      score: 85
      rationale: 'Clear acceptance criteria and automated or grep checks.'
    - id: task-002
      score: 90
      rationale: 'Clear acceptance criteria and automated or grep checks.'
    - id: task-003
      score: 90
      rationale: 'The cut was reproduced in a scratch copy while drafting the TDD (cmp-identical, upward pairs 0).'
    - id: task-004
      score: 90
      rationale: 'The cut was reproduced in a scratch copy while drafting the TDD (cmp-identical, upward pairs 0).'
    - id: task-005
      score: 90
      rationale: 'The cut was reproduced in a scratch copy while drafting the TDD (cmp-identical, upward pairs 0).'
    - id: task-006
      score: 90
      rationale: 'The cut was reproduced in a scratch copy while drafting the TDD (cmp-identical, upward pairs 0).'
    - id: task-007
      score: 90
      rationale: 'The cut was reproduced in a scratch copy while drafting the TDD (cmp-identical, upward pairs 0).'
    - id: task-008
      score: 90
      rationale: 'The cut was reproduced in a scratch copy while drafting the TDD (cmp-identical, upward pairs 0).'
    - id: task-009
      score: 88
      rationale: 'Clear acceptance criteria and automated or grep checks.'
    - id: task-010
      score: 80
      rationale: 'Clear acceptance criteria and automated or grep checks.'
    - id: task-011
      score: 80
      rationale: 'Clear acceptance criteria and automated or grep checks.'
    - id: task-012
      score: 88
      rationale: 'Clear acceptance criteria and automated or grep checks.'
```

## 9. Agent Assignment Plan

```yaml
agent_assignment_plan:
  assignments:
    - task_id: task-001
      agent_role: 'Documentation Agent'
      objective: 'Apply findings R-1 to R-7 of the Stage 5 review to the TDD, as the prg of the run lists them.'
      context:
        prd_excerpts:
          - 'W6-2 of the TDD traceability'
          - 'W6-3 of the TDD traceability'
        tdd_excerpts:
          - 'ASM-2'
          - 'DEC-1'
          - 'DEC-3'
          - 'DEC-4'
          - 'DEC-5'
          - 'TG-2'
          - 'TG-4'
          - 'FLOW-1'
          - 'Observability and Verification'
          - 'Open Questions'
      likely_files:
        - 'docs/wav/wav-024-fixes-and-editor-modules/run/run-0184-editor-extract-yaml-and-save/tdd-0184-editor-extract-yaml-and-save.md'
      acceptance_criteria:
        - 'Each finding is applied in the place it names, no decision DEC-1 to DEC-5 changes, and the Review pass of the run document stays accurate.'
      verification:
        - 'grep for each applied sentence and for the absence of "2,592" and of the four test file names in DEC-3'
        - 'node scripts/build-editor.mjs --check'
      escalation_triggers:
        - 'A fix would change a decision.'
        - 'The page hash differs.'
      suggested_subagent_type: 'general-purpose'
      suggested_model: '(default)'
      suggested_effort: 'medium'
    - task_id: task-002
      agent_role: 'QA Agent'
      objective: 'Check ASM-1 and ASM-2 and stop, without degrading, if the W-5 sources are not committed.'
      context:
        prd_excerpts:
          - 'W6-2 of the TDD traceability'
          - 'W6-4 of the TDD traceability'
        tdd_excerpts:
          - 'ASM-1'
          - 'ASM-2'
          - 'RISK-1'
          - 'FLOW-1'
      likely_files:
        - 'src/main/editor/layers.json'
        - 'src/main/editor/unsorted/script.js'
      acceptance_criteria:
        - 'All four baseline facts hold, or the run is blocked with the sentence of ASM-2.'
      verification:
        - 'git status --short -- scripts src/main/editor src/test/javascript/editor-build package.json package-lock.json .github CLAUDE.md src/main/rust/viewpoint-kernel/embed.sh'
        - 'node scripts/build-editor.mjs --check'
        - 'node scripts/check-editor.mjs --layers'
        - 'sha256sum src/main/resources/editor-webapp/standalone.html'
        - 'wc -l src/main/editor/unsorted/script.js'
      escalation_triggers:
        - 'git status lists a W-5 source.'
        - 'The sha256 or a line count differs from the TDD.'
      suggested_subagent_type: 'general-purpose'
      suggested_model: '(default)'
      suggested_effort: 'medium'
    - task_id: task-003
      agent_role: 'Refactoring Agent'
      objective: 'Cut the range 1030-2372 of the page (1,343 lines) from the head of unsorted/script.js into src/main/editor/core/yaml-parser.js and register it in layers.json, with the page unchanged.'
      context:
        prd_excerpts:
          - 'W6-1 of the TDD traceability'
          - 'W6-2 of the TDD traceability'
          - 'W6-5 of the TDD traceability'
        tdd_excerpts:
          - 'DEC-1'
          - 'DEC-2'
          - 'DEC-3'
          - 'DEC-4'
          - 'CON-1'
          - 'CON-3'
          - 'FLOW-1'
          - 'IMP-1 to IMP-3'
      likely_files:
        - 'src/main/editor/core/yaml-parser.js'
        - 'src/main/editor/unsorted/script.js'
        - 'src/main/editor/layers.json'
      acceptance_criteria:
        - 'The part has exactly the lines of the range and the first line the cut table gives (use strict).'
        - 'The assembled page is byte for byte the committed one.'
      verification:
        - 'node scripts/build-editor.mjs --map'
        - 'node scripts/build-editor.mjs --check'
        - 'node scripts/build-editor.mjs --check-identical HEAD'
        - 'node scripts/check-editor.mjs --layers'
        - 'npm run lint'
        - 'npm run format:check'
        - 'sha256sum of the page starts a653717d5564c237'
      escalation_triggers:
        - 'Any check fails: restore unsorted/script.js and layers.json and delete the new part file, by path (no git stash, no text edit to fit), log the failing command and its first line, stop the run.'
        - '--map differs from the range: the page changed since ASM-1, stop.'
      suggested_subagent_type: 'general-purpose'
      suggested_model: '(default)'
      suggested_effort: 'medium'
    - task_id: task-004
      agent_role: 'Refactoring Agent'
      objective: 'Cut the range 2373-2526 of the page (154 lines) from the head of unsorted/script.js into src/main/editor/core/yaml-serializer.js and register it in layers.json, with the page unchanged.'
      context:
        prd_excerpts:
          - 'W6-1 of the TDD traceability'
          - 'W6-2 of the TDD traceability'
          - 'W6-5 of the TDD traceability'
        tdd_excerpts:
          - 'DEC-1'
          - 'DEC-2'
          - 'DEC-3'
          - 'DEC-4'
          - 'CON-1'
          - 'CON-3'
          - 'FLOW-1'
          - 'IMP-1 to IMP-3'
      likely_files:
        - 'src/main/editor/core/yaml-serializer.js'
        - 'src/main/editor/unsorted/script.js'
        - 'src/main/editor/layers.json'
      acceptance_criteria:
        - 'The part has exactly the lines of the range and the first line the cut table gives.'
        - 'The assembled page is byte for byte the committed one.'
      verification:
        - 'node scripts/build-editor.mjs --map'
        - 'node scripts/build-editor.mjs --check'
        - 'node scripts/build-editor.mjs --check-identical HEAD'
        - 'node scripts/check-editor.mjs --layers'
        - 'npm run lint'
        - 'npm run format:check'
        - 'sha256sum of the page starts a653717d5564c237'
      escalation_triggers:
        - 'Any check fails: restore unsorted/script.js and layers.json and delete the new part file, by path (no git stash, no text edit to fit), log the failing command and its first line, stop the run.'
        - '--map differs from the range: the page changed since ASM-1, stop.'
      suggested_subagent_type: 'general-purpose'
      suggested_model: '(default)'
      suggested_effort: 'medium'
    - task_id: task-005
      agent_role: 'Refactoring Agent'
      objective: 'Cut the range 2527-3085 of the page (559 lines) from the head of unsorted/script.js into src/main/editor/core/yaml-patch-text.js and register it in layers.json, with the page unchanged.'
      context:
        prd_excerpts:
          - 'W6-1 of the TDD traceability'
          - 'W6-2 of the TDD traceability'
          - 'W6-5 of the TDD traceability'
        tdd_excerpts:
          - 'DEC-1'
          - 'DEC-2'
          - 'DEC-3'
          - 'DEC-4'
          - 'CON-1'
          - 'CON-3'
          - 'FLOW-1'
          - 'IMP-1 to IMP-3'
      likely_files:
        - 'src/main/editor/core/yaml-patch-text.js'
        - 'src/main/editor/unsorted/script.js'
        - 'src/main/editor/layers.json'
      acceptance_criteria:
        - 'The part has exactly the lines of the range and the first line the cut table gives.'
        - 'The assembled page is byte for byte the committed one.'
      verification:
        - 'node scripts/build-editor.mjs --map'
        - 'node scripts/build-editor.mjs --check'
        - 'node scripts/build-editor.mjs --check-identical HEAD'
        - 'node scripts/check-editor.mjs --layers'
        - 'npm run lint'
        - 'npm run format:check'
        - 'sha256sum of the page starts a653717d5564c237'
      escalation_triggers:
        - 'Any check fails: restore unsorted/script.js and layers.json and delete the new part file, by path (no git stash, no text edit to fit), log the failing command and its first line, stop the run.'
        - '--map differs from the range: the page changed since ASM-1, stop.'
      suggested_subagent_type: 'general-purpose'
      suggested_model: '(default)'
      suggested_effort: 'medium'
    - task_id: task-006
      agent_role: 'Refactoring Agent'
      objective: 'Cut the range 3086-3579 of the page (494 lines) from the head of unsorted/script.js into src/main/editor/core/yaml-patch-flow.js and register it in layers.json, with the page unchanged.'
      context:
        prd_excerpts:
          - 'W6-1 of the TDD traceability'
          - 'W6-2 of the TDD traceability'
          - 'W6-5 of the TDD traceability'
        tdd_excerpts:
          - 'DEC-1'
          - 'DEC-2'
          - 'DEC-3'
          - 'DEC-4'
          - 'CON-1'
          - 'CON-3'
          - 'FLOW-1'
          - 'IMP-1 to IMP-3'
      likely_files:
        - 'src/main/editor/core/yaml-patch-flow.js'
        - 'src/main/editor/unsorted/script.js'
        - 'src/main/editor/layers.json'
      acceptance_criteria:
        - 'The part has exactly the lines of the range and the first line the cut table gives.'
        - 'The assembled page is byte for byte the committed one.'
      verification:
        - 'node scripts/build-editor.mjs --map'
        - 'node scripts/build-editor.mjs --check'
        - 'node scripts/build-editor.mjs --check-identical HEAD'
        - 'node scripts/check-editor.mjs --layers'
        - 'npm run lint'
        - 'npm run format:check'
        - 'sha256sum of the page starts a653717d5564c237'
      escalation_triggers:
        - 'Any check fails: restore unsorted/script.js and layers.json and delete the new part file, by path (no git stash, no text edit to fit), log the failing command and its first line, stop the run.'
        - '--map differs from the range: the page changed since ASM-1, stop.'
      suggested_subagent_type: 'general-purpose'
      suggested_model: '(default)'
      suggested_effort: 'medium'
    - task_id: task-007
      agent_role: 'Refactoring Agent'
      objective: 'Cut the range 3580-4272 of the page (693 lines) from the head of unsorted/script.js into src/main/editor/core/yaml-patch-lines.js and register it in layers.json, with the page unchanged.'
      context:
        prd_excerpts:
          - 'W6-1 of the TDD traceability'
          - 'W6-2 of the TDD traceability'
          - 'W6-5 of the TDD traceability'
        tdd_excerpts:
          - 'DEC-1'
          - 'DEC-2'
          - 'DEC-3'
          - 'DEC-4'
          - 'CON-1'
          - 'CON-3'
          - 'FLOW-1'
          - 'IMP-1 to IMP-3'
      likely_files:
        - 'src/main/editor/core/yaml-patch-lines.js'
        - 'src/main/editor/unsorted/script.js'
        - 'src/main/editor/layers.json'
      acceptance_criteria:
        - 'The part has exactly the lines of the range and the first line the cut table gives.'
        - 'The assembled page is byte for byte the committed one.'
      verification:
        - 'node scripts/build-editor.mjs --map'
        - 'node scripts/build-editor.mjs --check'
        - 'node scripts/build-editor.mjs --check-identical HEAD'
        - 'node scripts/check-editor.mjs --layers'
        - 'npm run lint'
        - 'npm run format:check'
        - 'sha256sum of the page starts a653717d5564c237'
      escalation_triggers:
        - 'Any check fails: restore unsorted/script.js and layers.json and delete the new part file, by path (no git stash, no text edit to fit), log the failing command and its first line, stop the run.'
        - '--map differs from the range: the page changed since ASM-1, stop.'
      suggested_subagent_type: 'general-purpose'
      suggested_model: '(default)'
      suggested_effort: 'medium'
    - task_id: task-008
      agent_role: 'Refactoring Agent'
      objective: 'Cut the range 4273-4575 of the page (303 lines) from the head of unsorted/script.js into src/main/editor/core/yaml-block-moves.js and register it in layers.json, with the page unchanged.'
      context:
        prd_excerpts:
          - 'W6-1 of the TDD traceability'
          - 'W6-2 of the TDD traceability'
          - 'W6-5 of the TDD traceability'
        tdd_excerpts:
          - 'DEC-1'
          - 'DEC-2'
          - 'DEC-3'
          - 'DEC-4'
          - 'CON-1'
          - 'CON-3'
          - 'FLOW-1'
          - 'IMP-1 to IMP-3'
      likely_files:
        - 'src/main/editor/core/yaml-block-moves.js'
        - 'src/main/editor/unsorted/script.js'
        - 'src/main/editor/layers.json'
      acceptance_criteria:
        - 'The part has exactly the lines of the range and the first line the cut table gives.'
        - 'The assembled page is byte for byte the committed one.'
      verification:
        - 'node scripts/build-editor.mjs --map'
        - 'node scripts/build-editor.mjs --check'
        - 'node scripts/build-editor.mjs --check-identical HEAD'
        - 'node scripts/check-editor.mjs --layers'
        - 'npm run lint'
        - 'npm run format:check'
        - 'sha256sum of the page starts a653717d5564c237'
      escalation_triggers:
        - 'Any check fails: restore unsorted/script.js and layers.json and delete the new part file, by path (no git stash, no text edit to fit), log the failing command and its first line, stop the run.'
        - '--map differs from the range: the page changed since ASM-1, stop.'
      suggested_subagent_type: 'general-purpose'
      suggested_model: '(default)'
      suggested_effort: 'medium'
    - task_id: task-009
      agent_role: 'QA Agent'
      objective: 'Run the whole node suite once, as 0182 DEC-9 says for the end of step 6.'
      context:
        prd_excerpts:
          - 'W6-3 of the TDD traceability'
        tdd_excerpts:
          - 'DEC-3'
          - 'FLOW-2'
          - 'RISK-2'
      likely_files:
        - 'src/test/javascript/'
      acceptance_criteria:
        - 'The node suite is green, save-generator.js and the comparisons with the released pages unchanged.'
      verification:
        - 'npm run test:unit'
        - 'git status --short -- src/main/resources/editor-webapp/standalone.html'
      escalation_triggers:
        - 'A test fails: run that file alone on the parent tree (a scratch copy or a detached worktree, no git stash); if it passes there the failure is the cut and the step is reverted by path; if it fails there too it is named in the prg and re-run once.'
      suggested_subagent_type: 'general-purpose'
      suggested_model: '(default)'
      suggested_effort: 'medium'
    - task_id: task-010
      agent_role: 'Test Generation Agent'
      objective: 'Write the test of DEC-5 so that it can be shown to fail without editing the repository.'
      context:
        prd_excerpts:
          - 'W6-6 of the TDD traceability'
        tdd_excerpts:
          - 'DEC-5'
          - 'TG-4'
          - 'CON-5'
          - 'RISK-6'
          - 'DEF-3'
      likely_files:
        - 'src/test/javascript/editor-build/yaml-parts.test.js'
        - 'scripts/build-editor.mjs'
        - 'scripts/check-editor.mjs'
      acceptance_criteria:
        - 'The test passes on the repository, fails on the altered copy, and passes format and lint.'
      verification:
        - 'node --test src/test/javascript/editor-build/yaml-parts.test.js'
        - 'npm run format:check'
        - 'npm run lint'
      escalation_triggers:
        - 'analyse or mapOf output differs from what the TDD assumes: log it, keep the test to what the output shows, change no decision.'
      suggested_subagent_type: 'general-purpose'
      suggested_model: '(default)'
      suggested_effort: 'medium'
    - task_id: task-011
      agent_role: 'QA Agent'
      objective: 'Run the end-of-run set once and record each result in the prg.'
      context:
        prd_excerpts:
          - 'W6-3 of the TDD traceability'
          - 'W6-4 of the TDD traceability'
          - 'W6-5 of the TDD traceability'
        tdd_excerpts:
          - 'FLOW-2'
          - 'IMP-5'
          - 'Observability and Verification'
          - 'Q-3'
      likely_files:
        - 'scripts/editor-coverage-floor.json'
        - 'src/main/resources/editor-webapp/standalone.html'
      acceptance_criteria:
        - 'Every command exits 0 and the IMP-5 paths show no change.'
      verification:
        - 'npm run test:coverage'
        - './mvnw verify -DskipITs=false'
        - 'npm run test:e2e'
        - 'src/main/rust/viewpoint-kernel/embed.sh --check'
        - 'npm run editor:check'
        - 'npm run lint'
        - 'npm run format:check'
        - 'git diff --stat'
      escalation_triggers:
        - 'A command fails because of the environment (JDK, browsers): name it in the prg, re-run once, record the rest and do not claim it green.'
        - 'Authorship of commits unavailable: check-editor-moves.sh stays pending for gate-001.'
      suggested_subagent_type: 'general-purpose'
      suggested_model: '(default)'
      suggested_effort: 'medium'
    - task_id: task-012
      agent_role: 'Documentation Agent'
      objective: 'Close the documentation of the run without claiming anything not run.'
      context:
        prd_excerpts:
          - 'W6-2 of the TDD traceability'
          - 'W6-3 of the TDD traceability'
        tdd_excerpts:
          - 'IMP-6'
          - 'Scope'
      likely_files:
        - 'docs/wav/wav-024-fixes-and-editor-modules/run/run-0184-editor-extract-yaml-and-save/run-0184-editor-extract-yaml-and-save.md'
        - 'docs/wav/wav-024-fixes-and-editor-modules/run/run-0184-editor-extract-yaml-and-save/prg-0184-editor-extract-yaml-and-save.md'
      acceptance_criteria:
        - 'Every claim in the run document has its line in the prg.'
      verification:
        - 'grep -n "unsorted/script.js" CLAUDE.md'
        - 'git diff --stat -- CLAUDE.md'
      escalation_triggers:
        - 'A command line has no recorded result: do not write the claim.'
      suggested_subagent_type: 'Explore'
      suggested_model: 'haiku'
      suggested_effort: 'low'
```

## 10. Verification Plan

```yaml
verification_plan:
  checks:
    - task_id: task-001
      methods:
        - 'grep of the applied sentences'
        - 'node scripts/build-editor.mjs --check'
      success_criteria:
        - 'R-1 to R-7 are visible in the TDD and the page check still prints that standalone.html is the assembly of src/main/editor.'
    - task_id: task-002
      methods:
        - 'git status'
        - 'build-editor.mjs --check'
        - 'check-editor.mjs --layers'
        - 'sha256sum'
      success_criteria:
        - 'git status is empty for the W-5 paths, the sha256 starts a653717d5564c237, --check and --layers pass.'
    - task_id: task-003
      methods:
        - 'build-editor.mjs --map, --check and --check-identical HEAD'
        - 'check-editor.mjs --layers'
        - 'npm run lint'
        - 'npm run format:check'
      success_criteria:
        - '--check-identical HEAD prints no difference, --map equals 1030-2372, upward pairs: 0 (max 162), lint and format check pass.'
    - task_id: task-004
      methods:
        - 'build-editor.mjs --map, --check and --check-identical HEAD'
        - 'check-editor.mjs --layers'
        - 'npm run lint'
        - 'npm run format:check'
      success_criteria:
        - '--check-identical HEAD prints no difference, --map equals 2373-2526, upward pairs: 0 (max 162), lint and format check pass.'
    - task_id: task-005
      methods:
        - 'build-editor.mjs --map, --check and --check-identical HEAD'
        - 'check-editor.mjs --layers'
        - 'npm run lint'
        - 'npm run format:check'
      success_criteria:
        - '--check-identical HEAD prints no difference, --map equals 2527-3085, upward pairs: 0 (max 162), lint and format check pass.'
    - task_id: task-006
      methods:
        - 'build-editor.mjs --map, --check and --check-identical HEAD'
        - 'check-editor.mjs --layers'
        - 'npm run lint'
        - 'npm run format:check'
      success_criteria:
        - '--check-identical HEAD prints no difference, --map equals 3086-3579, upward pairs: 0 (max 162), lint and format check pass.'
    - task_id: task-007
      methods:
        - 'build-editor.mjs --map, --check and --check-identical HEAD'
        - 'check-editor.mjs --layers'
        - 'npm run lint'
        - 'npm run format:check'
      success_criteria:
        - '--check-identical HEAD prints no difference, --map equals 3580-4272, upward pairs: 0 (max 162), lint and format check pass.'
    - task_id: task-008
      methods:
        - 'build-editor.mjs --map, --check and --check-identical HEAD'
        - 'check-editor.mjs --layers'
        - 'npm run lint'
        - 'npm run format:check'
      success_criteria:
        - '--check-identical HEAD prints no difference, --map equals 4273-4575, upward pairs: 0 (max 162), lint and format check pass.'
    - task_id: task-009
      methods:
        - 'npm run test:unit'
        - 'git status'
      success_criteria:
        - 'npm run test:unit exits 0 and the page is byte-identical.'
    - task_id: task-010
      methods:
        - 'node --test on the new file'
        - 'npm run lint'
        - 'npm run format:check'
      success_criteria:
        - 'The new test is green on the tree and red on the altered copy.'
    - task_id: task-011
      methods:
        - 'the commands listed under outputs'
      success_criteria:
        - 'All listed commands exit 0; the diff stat lists only the expected paths.'
    - task_id: task-012
      methods:
        - 'grep'
        - 'manual read'
      success_criteria:
        - 'The run document and the prg agree.'
```

## 11. Escalation Rules

This run operates under the autonomy override of complete-run, so a task that would stop on category alone is executed and its decision logged. The rules below stop on a specific condition only.

```yaml
escalation_rules:
  rules:
    - condition: 'The W-5 sources are listed by git status at task-002 (ASM-2).'
      action: 'Stop with state blocked and say the run waits for the commits of W-5; commit nothing from this run to work around it.'
    - condition: 'The page sha256 does not start a653717d5564c237 or its line count is not 23,170 (ASM-1).'
      action: 'Stop; the cut table is for another page.'
    - condition: 'A check of a move fails (byte difference, --map different from the range, upward pairs above 0, lint or format).'
      action: 'Restore unsorted/script.js and layers.json and delete the new part file by path, do not edit the text to fit, log the command and its first line, stop the run.'
    - condition: 'A fix or a test would change a decision of the TDD (a part name, a range, a layer).'
      action: 'Stop that change, log it as a finding, leave the decision as the TDD has it (CON-6).'
    - condition: 'A diff touches standalone.html, names.json, java-names.json, scripts, package.json, .github, the coverage floor, a Java file or an existing test (IMP-5).'
      action: 'Revert that edit by editing the file back (no destructive git) and log it as a finding.'
    - condition: 'The executor may not commit.'
      action: 'Take the second path of DEC-4: verify in the working tree, record each result, leave check-editor-moves.sh pending for gate-001.'
    - condition: 'Confidence of a task falls below 70 during execution.'
      action: 'Re-dispatch once one effort step up, then handle inline, and log it.'
```

## 12. Final Execution Manifest

```yaml
execution_manifest:
  status: 'in_progress'
  recommendation: 'proceed_with_review'
  autonomy_level: 'medium'
  total_tasks: 12
  autonomous_tasks: 12
  review_before_tasks: 0
  review_after_tasks: 0
  human_required_tasks: 0
  blocked_tasks: 0
  critical_path_tasks:
    - task-001
    - task-002
    - task-003
    - task-004
    - task-005
    - task-006
    - task-007
    - task-008
    - task-009
    - task-010
    - task-011
    - task-012
  parallel_groups: []
  required_human_gates:
    - gate-001
  highest_risk_tasks:
    - task-003
    - task-011
  lowest_confidence_tasks:
    - task-010
    - task-011
  next_action: 'The main agent or the author commits the run 0183 sources by path (gap-002), then the implement workflow starts at task-001.'
  criteria:
    - 'All twelve tasks done and their verification green, or the run stopped at task-002 with the reason logged.'
    - 'The assembled page equals the committed one at every move and at the end.'
    - 'The six parts and the DEC-5 test exist and pass; layers.json lists the parts in page order.'
    - 'The IMP-5 paths are unchanged.'
    - 'The pull request run is read at gate-001 and recorded; until then pending.'
```
