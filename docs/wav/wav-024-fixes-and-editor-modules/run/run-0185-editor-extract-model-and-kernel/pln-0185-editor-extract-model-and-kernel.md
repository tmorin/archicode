---
title: 'PLN: file access, the plateau and layer model, the read schema and the kernel bridge as parts of the editor (W-7)'
type: pln
status: draft
owner: tmorin
date: 2026-10-27
run: 0185
wave: 024
related:
  - docs/wav/wav-024-fixes-and-editor-modules/run/run-0185-editor-extract-model-and-kernel/tdd-0185-editor-extract-model-and-kernel.md
  - docs/wav/wav-024-fixes-and-editor-modules/run/run-0185-editor-extract-model-and-kernel/run-0185-editor-extract-model-and-kernel.md
  - docs/wav/wav-024-fixes-and-editor-modules/run/run-0182-editor-modules-design/tdd-0182-editor-modules-design.md
  - docs/wav/wav-024-fixes-and-editor-modules/run/run-0184-editor-extract-yaml-and-save/pln-0184-editor-extract-yaml-and-save.md
  - docs/wav/wav-024-fixes-and-editor-modules/wav-024-fixes-and-editor-modules.md
---

# Execution Plan: run 0185, file access, the plateau and layer model, the read schema and the kernel bridge as parts of the editor (W-7)

This is a TDD+pln run: there is no PRD. The requirements are W7-1 to W7-6 of the TDD, taken from the wave row W-7, the P3 gate and the accepted design of run 0182 (cited 0182 DEC-n). The plan carries out steps 7.1 and 7.2 of 0182 DEC-9: twenty pure moves (5,125 lines) out of src/main/editor/unsorted/script.js into parts of the layers core, model and persistence, in descending page order and with the leftover kept in unsorted/from-<N>.js files in page order (DEC-1, DEC-2); one relocation of REMOVED_PLATEAUS_KEY to core/read-schema.js; five relocation groups that move 59 variables to model/ui-state.js (DEC-4, DEC-6); and three test commits (DEC-5, DEC-7). Through the twenty moves the committed src/main/resources/editor-webapp/standalone.html is unchanged byte for byte (sha256 starts a653717d5564c237, 23,170 lines); the six relocation commits change its order of declarations only.

The Stage 5 review of the TDD (findings R-1 to R-4 and two S1 findings in the prg and in the TDD's Review pass) was not applied by any earlier stage; task-001 applies them first. The tasks below already use the corrected figures (row 9 is 297 lines after the key moved, R-2) and the corrected checks (the two Java classes run after step 7.1 and after groups 3 and 4, R-4).

PRECONDITION, not a task: the work of W-6 (run 0184: src/main/editor/core/, src/test/javascript/editor-build/yaml-parts.test.js, and the changes to layers.json and unsorted/script.js) is still uncommitted in the working tree (git status at drafting). The main agent or the author commits it by path before the implement workflow starts; task-002 stops the run, and does not degrade, if it is not.

This run operates under the autonomy override of complete-run: a task that would be human_required is executed and its decision logged. None is human_required. The override does not suspend the standing safety rules: no push, no force, no --no-verify, no destructive git, commits only by path (never git add -A, the tree holds jacoco-quarkus.exec and the wave documents) and only as the session allows (TDD DEC-9).

## 1. Executive Summary

```yaml
summary:
  status: 'pending'
  product_goal: 'Twenty parts of the layers core, model and persistence exist under src/main/editor, model/ui-state.js holds the 59 relocated variables and core/read-schema.js holds REMOVED_PLATEAUS_KEY, with the editor behaving as before.'
  technical_approach: 'Apply the review findings, check the baseline and the W-6 precondition, make the twenty moves one commit each in descending page order with the byte check, the key relocation, the three test commits, the whole suite after step 7.1, the five relocation groups with the statement check, then the end-of-run set.'
  total_tasks: 34
  parallel_groups: 0
  high_risk_tasks: 0
  human_review_gates: 1
  autonomy_level: 'medium'
  recommendation: 'proceed_with_review'
  criteria:

    - 'The twenty parts exist with the lines of their rows (5,125 lines) and layers.json lists them and the nine unsorted/from-<N>.js files in page order, script.js being gone.'
    - 'build-editor.mjs --check-identical HEAD passes after each of the twenty moves and check-editor.mjs --statements HEAD after each of the six relocations; check-editor.mjs --layers prints upward pairs: 0 (max 162) after every commit.'
    - 'The page sha256 starts a653717d5564c237 through the twenty moves and differs only after the key and the groups.'
    - 'npm run test:unit passes after step 7.1, after each relocation and after each test commit; EditorReadSchemaTest and GuideViewPropertiesTest pass after step 7.1 and after groups 3 and 4.'
    - 'npm run test:coverage holds the unchanged floor (pages about 84.08 percent against 83.8, total about 92.67 percent), ./mvnw verify -DskipITs=false, npm run test:e2e, embed.sh --check, npm run editor:check, npm run lint and npm run format:check pass.'
    - 'git diff --stat against the first parent lists only the paths of IMP-1 to IMP-5 and IMP-7.'
    - 'The pull request run (Page, Java, Kernel, E2E, Native, Build) is read at gate-001 and recorded; until then it is pending, not claimed.'
```

## 2. PRD/TDD Consistency Assessment

No PRD exists; the TDD is the referent and its requirement ids W7-1 to W7-6 stand in for the PRD ids.

```yaml
consistency_assessment:
  aligned_items:
    - 'W7-1 and W7-2 are addressed by DEC-1 to DEC-3 and FLOW-1 (the move tasks), W7-3 by DEC-8 and FLOW-3 and FLOW-4 (the suite tasks), W7-4 by CTR-1 and FLOW-4 (the end set), W7-5 by CON-1 and CON-3 and DEC-5 (every move, the test commits), W7-6 by DEC-4 and DEC-6 (the five groups).'
    - 'The scope matches the wave row W-7 and steps 7.1 and 7.2 of 0182 DEC-9; the rows of W-8 and the redraw notification are not tasks here.'
  gaps:
    - id: gap-001
      type: 'contradiction'
      description: 'The Stage 5 review findings R-1 to R-4 are not applied: DEC-7 misses three of the four places of the parseYamlAsModel exception and the probe test breaks when unsorted/script.js is gone, row 9 is 297 lines after the key moved and later ranges shift by 5, W7-4 cites a Constraint that does not exist, and DEC-8 defers the two Java classes that read the markers to the end of the run.'
      impact: 'medium'
      recommendation: 'task-001 applies R-1 to R-4 before any move; the tasks of this plan are already written to the corrected design.'
    - id: gap-002
      type: 'risk'
      description: 'ASM-2 does not hold: the work of W-6 is uncommitted, so a move of this run would not be checked against a parent that holds the six YAML parts.'
      impact: 'high'
      recommendation: 'The main agent or the author commits W-6 by path before the implement workflow; task-002 stops the run if it is not done. Carried as the blocking gap of this stage.'
    - id: gap-003
      type: 'missing_requirement'
      description: 'There is no PRD, so traceability to requirement ids is incomplete (the TDD says so).'
      impact: 'low'
      recommendation: 'Use W7-1 to W7-6 as the TDD names them.'
    - id: gap-004
      type: 'ambiguity'
      description: 'W7-4 as written promises no editor source over 3,000 lines at the end of P3, while unsorted/from-55.js (3,913 lines) and from-34.js (3,775 lines) stay over it until W-8.'
      impact: 'low'
      recommendation: 'R-3: the 3,000-line gate for the unsorted pieces is W-8 work (DEF-4); all new parts of this run are under 3,000 lines.'
  blocking_gaps:
    - 'gap-002: the work of W-6 is not committed; the implement workflow cannot start until it is, and task-002 enforces it.'
```

## 3. Execution Graph

```yaml
execution_graph:
  nodes:
    - id: task-001
      status: 'done'
      title: 'Apply the Stage 5 review findings R-1 to R-4 and the S1 findings to the TDD'
      depends_on: []
      produces:
        - 'docs/wav/wav-024-fixes-and-editor-modules/run/run-0185-editor-extract-model-and-kernel/tdd-0185-editor-extract-model-and-kernel.md'
      agent_role: 'Documentation Agent'
      autonomy: 'autonomous'
      risk: 'low'
      confidence: 85
    - id: task-002
      status: 'blocked'
      title: 'Precondition and baseline: the W-6 work is committed, the page is the measured one'
      depends_on: [task-001]
      produces:
        - 'evidence line in prg-0185 (baseline)'
      agent_role: 'QA Agent'
      autonomy: 'autonomous'
      risk: 'medium'
      confidence: 90
    - id: task-003
      status: 'pending'
      title: 'Move row 54: stories-model to src/main/editor/model/stories-model.js'
      depends_on: [task-002]
      produces:
        - 'src/main/editor/model/stories-model.js'
        - 'src/main/editor/layers.json'
        - 'src/main/editor/unsorted/'
      agent_role: 'Refactoring Agent'
      autonomy: 'autonomous'
      risk: 'medium'
      confidence: 90
    - id: task-004
      status: 'pending'
      title: 'Move row 49: styles to src/main/editor/model/styles.js'
      depends_on: [task-003]
      produces:
        - 'src/main/editor/model/styles.js'
        - 'src/main/editor/layers.json'
        - 'src/main/editor/unsorted/'
      agent_role: 'Refactoring Agent'
      autonomy: 'autonomous'
      risk: 'medium'
      confidence: 90
    - id: task-005
      status: 'pending'
      title: 'Move row 47: comparison to src/main/editor/model/comparison.js'
      depends_on: [task-004]
      produces:
        - 'src/main/editor/model/comparison.js'
        - 'src/main/editor/layers.json'
        - 'src/main/editor/unsorted/'
      agent_role: 'Refactoring Agent'
      autonomy: 'autonomous'
      risk: 'medium'
      confidence: 90
    - id: task-006
      status: 'pending'
      title: 'Move row 46: kernel-bridge to src/main/editor/model/kernel-bridge.js'
      depends_on: [task-005]
      produces:
        - 'src/main/editor/model/kernel-bridge.js'
        - 'src/main/editor/layers.json'
        - 'src/main/editor/unsorted/'
      agent_role: 'Refactoring Agent'
      autonomy: 'autonomous'
      risk: 'medium'
      confidence: 90
    - id: task-007
      status: 'pending'
      title: 'Move row 33: form-validation to src/main/editor/model/form-validation.js'
      depends_on: [task-006]
      produces:
        - 'src/main/editor/model/form-validation.js'
        - 'src/main/editor/layers.json'
        - 'src/main/editor/unsorted/'
      agent_role: 'Refactoring Agent'
      autonomy: 'autonomous'
      risk: 'medium'
      confidence: 90
    - id: task-008
      status: 'pending'
      title: 'Move row 31: save to src/main/editor/persistence/save.js'
      depends_on: [task-007]
      produces:
        - 'src/main/editor/persistence/save.js'
        - 'src/main/editor/layers.json'
        - 'src/main/editor/unsorted/'
      agent_role: 'Refactoring Agent'
      autonomy: 'autonomous'
      risk: 'medium'
      confidence: 88
    - id: task-009
      status: 'pending'
      title: 'Move row 29: record-lookup to src/main/editor/model/record-lookup.js'
      depends_on: [task-008]
      produces:
        - 'src/main/editor/model/record-lookup.js'
        - 'src/main/editor/layers.json'
        - 'src/main/editor/unsorted/'
      agent_role: 'Refactoring Agent'
      autonomy: 'autonomous'
      risk: 'medium'
      confidence: 90
    - id: task-010
      status: 'pending'
      title: 'Move row 25: escape-html to src/main/editor/core/escape-html.js'
      depends_on: [task-009]
      produces:
        - 'src/main/editor/core/escape-html.js'
        - 'src/main/editor/layers.json'
        - 'src/main/editor/unsorted/'
      agent_role: 'Refactoring Agent'
      autonomy: 'autonomous'
      risk: 'medium'
      confidence: 90
    - id: task-011
      status: 'pending'
      title: 'Move row 23: folder-access to src/main/editor/persistence/folder-access.js'
      depends_on: [task-010]
      produces:
        - 'src/main/editor/persistence/folder-access.js'
        - 'src/main/editor/layers.json'
        - 'src/main/editor/unsorted/'
      agent_role: 'Refactoring Agent'
      autonomy: 'autonomous'
      risk: 'medium'
      confidence: 90
    - id: task-012
      status: 'pending'
      title: 'Move row 22: workspace-loading to src/main/editor/persistence/workspace-loading.js'
      depends_on: [task-011]
      produces:
        - 'src/main/editor/persistence/workspace-loading.js'
        - 'src/main/editor/layers.json'
        - 'src/main/editor/unsorted/'
      agent_role: 'Refactoring Agent'
      autonomy: 'autonomous'
      risk: 'medium'
      confidence: 90
    - id: task-013
      status: 'pending'
      title: 'Move row 21: read-schema to src/main/editor/core/read-schema.js'
      depends_on: [task-012]
      produces:
        - 'src/main/editor/core/read-schema.js'
        - 'src/main/editor/layers.json'
        - 'src/main/editor/unsorted/'
      agent_role: 'Refactoring Agent'
      autonomy: 'autonomous'
      risk: 'medium'
      confidence: 90
    - id: task-014
      status: 'pending'
      title: 'Test commit (DEC-7): yaml-parts.test.js loses its parseYamlAsModel exception'
      depends_on: [task-013]
      produces:
        - 'src/test/javascript/editor-build/yaml-parts.test.js'
      agent_role: 'Test Generation Agent'
      autonomy: 'autonomous'
      risk: 'low'
      confidence: 82
    - id: task-015
      status: 'pending'
      title: 'Test commit (DEC-5 a): the --cut real-page test reads the page of af1ed2d from git'
      depends_on: [task-014]
      produces:
        - 'src/test/javascript/editor-build/check-editor.test.js'
      agent_role: 'Test Generation Agent'
      autonomy: 'autonomous'
      risk: 'low'
      confidence: 82
    - id: task-016
      status: 'pending'
      title: 'Relocate REMOVED_PLATEAUS_KEY to core/read-schema.js'
      depends_on: [task-015]
      produces:
        - 'src/main/editor/core/read-schema.js'
        - 'src/main/editor/layers.json'
        - 'src/main/editor/unsorted/'
        - 'src/main/resources/editor-webapp/standalone.html'
      agent_role: 'Refactoring Agent'
      autonomy: 'autonomous'
      risk: 'medium'
      confidence: 85
    - id: task-017
      status: 'pending'
      title: 'Move row 20: index-builder to src/main/editor/model/index-builder.js'
      depends_on: [task-016]
      produces:
        - 'src/main/editor/model/index-builder.js'
        - 'src/main/editor/layers.json'
        - 'src/main/editor/unsorted/'
      agent_role: 'Refactoring Agent'
      autonomy: 'autonomous'
      risk: 'medium'
      confidence: 90
    - id: task-018
      status: 'pending'
      title: 'Move row 14: origin-and-cascade to src/main/editor/model/origin-and-cascade.js'
      depends_on: [task-017]
      produces:
        - 'src/main/editor/model/origin-and-cascade.js'
        - 'src/main/editor/layers.json'
        - 'src/main/editor/unsorted/'
      agent_role: 'Refactoring Agent'
      autonomy: 'autonomous'
      risk: 'medium'
      confidence: 90
    - id: task-019
      status: 'pending'
      title: 'Move row 13: layer-loader to src/main/editor/model/layer-loader.js'
      depends_on: [task-018]
      produces:
        - 'src/main/editor/model/layer-loader.js'
        - 'src/main/editor/layers.json'
        - 'src/main/editor/unsorted/'
      agent_role: 'Refactoring Agent'
      autonomy: 'autonomous'
      risk: 'medium'
      confidence: 90
    - id: task-020
      status: 'pending'
      title: 'Move row 12: plateau-tree to src/main/editor/model/plateau-tree.js'
      depends_on: [task-019]
      produces:
        - 'src/main/editor/model/plateau-tree.js'
        - 'src/main/editor/layers.json'
        - 'src/main/editor/unsorted/'
      agent_role: 'Refactoring Agent'
      autonomy: 'autonomous'
      risk: 'medium'
      confidence: 90
    - id: task-021
      status: 'pending'
      title: 'Move row 11: element-index to src/main/editor/model/element-index.js'
      depends_on: [task-020]
      produces:
        - 'src/main/editor/model/element-index.js'
        - 'src/main/editor/layers.json'
        - 'src/main/editor/unsorted/'
      agent_role: 'Refactoring Agent'
      autonomy: 'autonomous'
      risk: 'medium'
      confidence: 90
    - id: task-022
      status: 'pending'
      title: 'Move row 10: manifest-kinds to src/main/editor/core/manifest-kinds.js'
      depends_on: [task-021]
      produces:
        - 'src/main/editor/core/manifest-kinds.js'
        - 'src/main/editor/layers.json'
        - 'src/main/editor/unsorted/'
      agent_role: 'Refactoring Agent'
      autonomy: 'autonomous'
      risk: 'medium'
      confidence: 90
    - id: task-023
      status: 'pending'
      title: 'Move row 9: settings to src/main/editor/model/settings.js'
      depends_on: [task-022]
      produces:
        - 'src/main/editor/model/settings.js'
        - 'src/main/editor/layers.json'
        - 'src/main/editor/unsorted/'
      agent_role: 'Refactoring Agent'
      autonomy: 'autonomous'
      risk: 'medium'
      confidence: 88
    - id: task-024
      status: 'pending'
      title: 'Move row 8: app-state to src/main/editor/model/app-state.js'
      depends_on: [task-023]
      produces:
        - 'src/main/editor/model/app-state.js'
        - 'src/main/editor/layers.json'
        - 'src/main/editor/unsorted/'
      agent_role: 'Refactoring Agent'
      autonomy: 'autonomous'
      risk: 'medium'
      confidence: 90
    - id: task-025
      status: 'pending'
      title: 'Move row 7: remembered-folders to src/main/editor/persistence/remembered-folders.js'
      depends_on: [task-024]
      produces:
        - 'src/main/editor/persistence/remembered-folders.js'
        - 'src/main/editor/layers.json'
        - 'src/main/editor/unsorted/'
      agent_role: 'Refactoring Agent'
      autonomy: 'autonomous'
      risk: 'medium'
      confidence: 90
    - id: task-026
      status: 'pending'
      title: 'Step 7.1 end: node suite, EditorReadSchemaTest and GuideViewPropertiesTest'
      depends_on: [task-025]
      produces:
        - 'evidence lines in prg-0185 (npm run test:unit, Java classes)'
      agent_role: 'QA Agent'
      autonomy: 'autonomous'
      risk: 'medium'
      confidence: 86
    - id: task-027
      status: 'pending'
      title: 'Test commit (DEC-5 b): the #37 test slices diagramCacheKey to its closing brace'
      depends_on: [task-026]
      produces:
        - 'src/test/javascript/viewpoint-kernel/editor-odds-and-ends.test.js'
      agent_role: 'Test Generation Agent'
      autonomy: 'autonomous'
      risk: 'low'
      confidence: 82
    - id: task-028
      status: 'pending'
      title: 'Relocation group 1 (DEC-4): page registry and shell to model/ui-state.js'
      depends_on: [task-027]
      produces:
        - 'src/main/editor/model/ui-state.js'
        - 'src/main/editor/layers.json'
        - 'src/main/editor/unsorted/'
        - 'src/main/resources/editor-webapp/standalone.html'
      agent_role: 'Refactoring Agent'
      autonomy: 'autonomous'
      risk: 'medium'
      confidence: 84
    - id: task-029
      status: 'pending'
      title: 'Relocation group 2 (DEC-4): panels to model/ui-state.js'
      depends_on: [task-028]
      produces:
        - 'src/main/editor/model/ui-state.js'
        - 'src/main/editor/layers.json'
        - 'src/main/editor/unsorted/'
        - 'src/main/resources/editor-webapp/standalone.html'
      agent_role: 'Refactoring Agent'
      autonomy: 'autonomous'
      risk: 'medium'
      confidence: 84
    - id: task-030
      status: 'pending'
      title: 'Relocation group 3 (DEC-4): diagram to model/ui-state.js'
      depends_on: [task-029]
      produces:
        - 'src/main/editor/model/ui-state.js'
        - 'src/main/editor/layers.json'
        - 'src/main/editor/unsorted/'
        - 'src/main/resources/editor-webapp/standalone.html'
      agent_role: 'Refactoring Agent'
      autonomy: 'autonomous'
      risk: 'medium'
      confidence: 80
    - id: task-031
      status: 'pending'
      title: 'Relocation group 4 (DEC-4): map to model/ui-state.js'
      depends_on: [task-030]
      produces:
        - 'src/main/editor/model/ui-state.js'
        - 'src/main/editor/layers.json'
        - 'src/main/editor/unsorted/'
        - 'src/main/resources/editor-webapp/standalone.html'
      agent_role: 'Refactoring Agent'
      autonomy: 'autonomous'
      risk: 'medium'
      confidence: 80
    - id: task-032
      status: 'pending'
      title: 'Relocation group 5 (DEC-4): dialogs and the plateau constant to model/ui-state.js'
      depends_on: [task-031]
      produces:
        - 'src/main/editor/model/ui-state.js'
        - 'src/main/editor/layers.json'
        - 'src/main/editor/unsorted/'
        - 'src/main/resources/editor-webapp/standalone.html'
      agent_role: 'Refactoring Agent'
      autonomy: 'autonomous'
      risk: 'medium'
      confidence: 84
    - id: task-033
      status: 'pending'
      title: 'End-of-run checks of 0182 DEC-6 and the shown-to-fail commands'
      depends_on: [task-032]
      produces:
        - 'evidence lines in prg-0185 (coverage, Java, e2e, embed, editor:check, diff stat, move script)'
      agent_role: 'QA Agent'
      autonomy: 'autonomous'
      risk: 'medium'
      confidence: 78
    - id: task-034
      status: 'pending'
      title: 'Record the evidence in the run document and the prg'
      depends_on: [task-033]
      produces:
        - 'docs/wav/wav-024-fixes-and-editor-modules/run/run-0185-editor-extract-model-and-kernel/run-0185-editor-extract-model-and-kernel.md'
        - 'docs/wav/wav-024-fixes-and-editor-modules/run/run-0185-editor-extract-model-and-kernel/prg-0185-editor-extract-model-and-kernel.md'
      agent_role: 'Documentation Agent'
      autonomy: 'autonomous'
      risk: 'low'
      confidence: 88
  edges:
    - from: task-001
      to: task-002
      reason: 'the later task reads what the earlier one leaves (the page, layers.json, the unsorted files or the evidence)'
    - from: task-002
      to: task-003
      reason: 'the later task reads what the earlier one leaves (the page, layers.json, the unsorted files or the evidence)'
    - from: task-003
      to: task-004
      reason: 'the later task reads what the earlier one leaves (the page, layers.json, the unsorted files or the evidence)'
    - from: task-004
      to: task-005
      reason: 'the later task reads what the earlier one leaves (the page, layers.json, the unsorted files or the evidence)'
    - from: task-005
      to: task-006
      reason: 'the later task reads what the earlier one leaves (the page, layers.json, the unsorted files or the evidence)'
    - from: task-006
      to: task-007
      reason: 'the later task reads what the earlier one leaves (the page, layers.json, the unsorted files or the evidence)'
    - from: task-007
      to: task-008
      reason: 'the later task reads what the earlier one leaves (the page, layers.json, the unsorted files or the evidence)'
    - from: task-008
      to: task-009
      reason: 'the later task reads what the earlier one leaves (the page, layers.json, the unsorted files or the evidence)'
    - from: task-009
      to: task-010
      reason: 'the later task reads what the earlier one leaves (the page, layers.json, the unsorted files or the evidence)'
    - from: task-010
      to: task-011
      reason: 'the later task reads what the earlier one leaves (the page, layers.json, the unsorted files or the evidence)'
    - from: task-011
      to: task-012
      reason: 'the later task reads what the earlier one leaves (the page, layers.json, the unsorted files or the evidence)'
    - from: task-012
      to: task-013
      reason: 'the later task reads what the earlier one leaves (the page, layers.json, the unsorted files or the evidence)'
    - from: task-013
      to: task-014
      reason: 'the later task reads what the earlier one leaves (the page, layers.json, the unsorted files or the evidence)'
    - from: task-014
      to: task-015
      reason: 'the later task reads what the earlier one leaves (the page, layers.json, the unsorted files or the evidence)'
    - from: task-015
      to: task-016
      reason: 'the later task reads what the earlier one leaves (the page, layers.json, the unsorted files or the evidence)'
    - from: task-016
      to: task-017
      reason: 'the later task reads what the earlier one leaves (the page, layers.json, the unsorted files or the evidence)'
    - from: task-017
      to: task-018
      reason: 'the later task reads what the earlier one leaves (the page, layers.json, the unsorted files or the evidence)'
    - from: task-018
      to: task-019
      reason: 'the later task reads what the earlier one leaves (the page, layers.json, the unsorted files or the evidence)'
    - from: task-019
      to: task-020
      reason: 'the later task reads what the earlier one leaves (the page, layers.json, the unsorted files or the evidence)'
    - from: task-020
      to: task-021
      reason: 'the later task reads what the earlier one leaves (the page, layers.json, the unsorted files or the evidence)'
    - from: task-021
      to: task-022
      reason: 'the later task reads what the earlier one leaves (the page, layers.json, the unsorted files or the evidence)'
    - from: task-022
      to: task-023
      reason: 'the later task reads what the earlier one leaves (the page, layers.json, the unsorted files or the evidence)'
    - from: task-023
      to: task-024
      reason: 'the later task reads what the earlier one leaves (the page, layers.json, the unsorted files or the evidence)'
    - from: task-024
      to: task-025
      reason: 'the later task reads what the earlier one leaves (the page, layers.json, the unsorted files or the evidence)'
    - from: task-025
      to: task-026
      reason: 'the later task reads what the earlier one leaves (the page, layers.json, the unsorted files or the evidence)'
    - from: task-026
      to: task-027
      reason: 'the later task reads what the earlier one leaves (the page, layers.json, the unsorted files or the evidence)'
    - from: task-027
      to: task-028
      reason: 'the later task reads what the earlier one leaves (the page, layers.json, the unsorted files or the evidence)'
    - from: task-028
      to: task-029
      reason: 'the later task reads what the earlier one leaves (the page, layers.json, the unsorted files or the evidence)'
    - from: task-029
      to: task-030
      reason: 'the later task reads what the earlier one leaves (the page, layers.json, the unsorted files or the evidence)'
    - from: task-030
      to: task-031
      reason: 'the later task reads what the earlier one leaves (the page, layers.json, the unsorted files or the evidence)'
    - from: task-031
      to: task-032
      reason: 'the later task reads what the earlier one leaves (the page, layers.json, the unsorted files or the evidence)'
    - from: task-032
      to: task-033
      reason: 'the later task reads what the earlier one leaves (the page, layers.json, the unsorted files or the evidence)'
    - from: task-033
      to: task-034
      reason: 'the later task reads what the earlier one leaves (the page, layers.json, the unsorted files or the evidence)'
```

The work is one chain: every move cuts an unsorted file that the one before left, every relocation reads the page the one before left, and all of them share layers.json. There is no fake parallelism.

## 4. Task Catalog

```yaml
task_catalog:
  tasks:
    - id: task-001
      title: 'Apply the Stage 5 review findings R-1 to R-4 and the S1 findings to the TDD'
      source_requirements:
        prd:
          - 'W7-3'
          - 'W7-4'
        tdd:
          - 'DEC-3'
          - 'DEC-7'
          - 'DEC-8'
          - 'FLOW-1'
          - 'IF-2'
          - 'Reliability, Performance, and Scalability'
          - 'Deferred Work'
      outputs:
        - 'Apply R-1 to R-4 and the cheap S1 findings of the Stage 5 review to the TDD, as the prg of the run lists them.'
      verification:
        - 'grep for each applied sentence'
        - 'node scripts/build-editor.mjs --check'
      risk: 'low'
      confidence: 85
      human_review: 'none'
      escalation_triggers:
        - 'A fix would change a decision.'
      delegation_tier: 'standard'
      results: 'tier standard, model sonnet, effort medium, profile low-cost, passed first time, inline (leaf), independently verified'
    - id: task-002
      title: 'Precondition and baseline: the W-6 work is committed, the page is the measured one'
      source_requirements:
        prd:
          - 'W7-2'
          - 'W7-4'
        tdd:
          - 'ASM-1'
          - 'ASM-2'
          - 'RISK-1'
          - 'FLOW-1'
      outputs:
        - 'Check ASM-1 and ASM-2 and stop, without degrading, if the work of W-6 is not committed.'
      verification:
        - 'git status --short -- src/main/editor src/test/javascript/editor-build'
        - 'node scripts/build-editor.mjs --check'
        - 'node scripts/check-editor.mjs --layers'
        - 'sha256sum src/main/resources/editor-webapp/standalone.html'
        - 'wc -l src/main/resources/editor-webapp/standalone.html'
      risk: 'medium'
      confidence: 90
      human_review: 'none'
      escalation_triggers:
        - 'A check fails: log the command and its first line; the coverage floor is never lowered in this run.'
      delegation_tier: 'standard'
      results: 'tier standard, effort medium, failed first check and the escalated retry (high); blocked by the implement workflow'
    - id: task-003
      title: 'Move row 54: stories-model to src/main/editor/model/stories-model.js'
      source_requirements:
        prd:
          - 'W7-1'
          - 'W7-2'
          - 'W7-5'
        tdd:
          - 'DEC-1'
          - 'DEC-2'
          - 'DEC-3'
          - 'DEC-8'
          - 'CON-1'
          - 'CON-3'
          - 'FLOW-1'
          - 'IMP-1 to IMP-3'
      outputs:
        - 'Cut row 54 of 0182 DEC-4 (164 lines in the table) from the unsorted file that holds it into src/main/editor/model/stories-model.js with the text unchanged, leave the rest in unsorted/from-<next row>.js files in page order (a file left empty is deleted), register all in layers.json in page order.'
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
        - 'Any check fails: restore the unsorted files and layers.json from HEAD and delete the new part file, each by path (no git stash, no checkout of the folder, no text edit to fit), log the failing command and its first line, stop the run.'
        - '--map differs from the range: the page changed since ASM-1, stop.'
      delegation_tier: 'standard'
    - id: task-004
      title: 'Move row 49: styles to src/main/editor/model/styles.js'
      source_requirements:
        prd:
          - 'W7-1'
          - 'W7-2'
          - 'W7-5'
        tdd:
          - 'DEC-1'
          - 'DEC-2'
          - 'DEC-3'
          - 'DEC-8'
          - 'CON-1'
          - 'CON-3'
          - 'FLOW-1'
          - 'IMP-1 to IMP-3'
      outputs:
        - 'Cut row 49 of 0182 DEC-4 (194 lines in the table) from the unsorted file that holds it into src/main/editor/model/styles.js with the text unchanged, leave the rest in unsorted/from-<next row>.js files in page order (a file left empty is deleted), register all in layers.json in page order.'
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
        - 'Any check fails: restore the unsorted files and layers.json from HEAD and delete the new part file, each by path (no git stash, no checkout of the folder, no text edit to fit), log the failing command and its first line, stop the run.'
        - '--map differs from the range: the page changed since ASM-1, stop.'
      delegation_tier: 'standard'
    - id: task-005
      title: 'Move row 47: comparison to src/main/editor/model/comparison.js'
      source_requirements:
        prd:
          - 'W7-1'
          - 'W7-2'
          - 'W7-5'
        tdd:
          - 'DEC-1'
          - 'DEC-2'
          - 'DEC-3'
          - 'DEC-8'
          - 'CON-1'
          - 'CON-3'
          - 'FLOW-1'
          - 'IMP-1 to IMP-3'
      outputs:
        - 'Cut row 47 of 0182 DEC-4 (273 lines in the table) from the unsorted file that holds it into src/main/editor/model/comparison.js with the text unchanged, leave the rest in unsorted/from-<next row>.js files in page order (a file left empty is deleted), register all in layers.json in page order.'
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
        - 'Any check fails: restore the unsorted files and layers.json from HEAD and delete the new part file, each by path (no git stash, no checkout of the folder, no text edit to fit), log the failing command and its first line, stop the run.'
        - '--map differs from the range: the page changed since ASM-1, stop.'
      delegation_tier: 'standard'
    - id: task-006
      title: 'Move row 46: kernel-bridge to src/main/editor/model/kernel-bridge.js'
      source_requirements:
        prd:
          - 'W7-1'
          - 'W7-2'
          - 'W7-5'
        tdd:
          - 'DEC-1'
          - 'DEC-2'
          - 'DEC-3'
          - 'DEC-8'
          - 'CON-1'
          - 'CON-3'
          - 'FLOW-1'
          - 'IMP-1 to IMP-3'
      outputs:
        - 'Cut row 46 of 0182 DEC-4 (140 lines in the table) from the unsorted file that holds it into src/main/editor/model/kernel-bridge.js with the text unchanged, leave the rest in unsorted/from-<next row>.js files in page order (a file left empty is deleted), register all in layers.json in page order.'
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
        - 'Any check fails: restore the unsorted files and layers.json from HEAD and delete the new part file, each by path (no git stash, no checkout of the folder, no text edit to fit), log the failing command and its first line, stop the run.'
        - '--map differs from the range: the page changed since ASM-1, stop.'
      delegation_tier: 'standard'
    - id: task-007
      title: 'Move row 33: form-validation to src/main/editor/model/form-validation.js'
      source_requirements:
        prd:
          - 'W7-1'
          - 'W7-2'
          - 'W7-5'
        tdd:
          - 'DEC-1'
          - 'DEC-2'
          - 'DEC-3'
          - 'DEC-8'
          - 'CON-1'
          - 'CON-3'
          - 'FLOW-1'
          - 'IMP-1 to IMP-3'
      outputs:
        - 'Cut row 33 of 0182 DEC-4 (355 lines in the table) from the unsorted file that holds it into src/main/editor/model/form-validation.js with the text unchanged, leave the rest in unsorted/from-<next row>.js files in page order (a file left empty is deleted), register all in layers.json in page order.'
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
        - 'Any check fails: restore the unsorted files and layers.json from HEAD and delete the new part file, each by path (no git stash, no checkout of the folder, no text edit to fit), log the failing command and its first line, stop the run.'
        - '--map differs from the range: the page changed since ASM-1, stop.'
      delegation_tier: 'standard'
    - id: task-008
      title: 'Move row 31: save to src/main/editor/persistence/save.js'
      source_requirements:
        prd:
          - 'W7-1'
          - 'W7-2'
          - 'W7-5'
        tdd:
          - 'DEC-1'
          - 'DEC-2'
          - 'DEC-3'
          - 'DEC-8'
          - 'CON-1'
          - 'CON-3'
          - 'FLOW-1'
          - 'IMP-1 to IMP-3'
      outputs:
        - 'Cut row 31 of 0182 DEC-4 (700 lines in the table) from the unsorted file that holds it into src/main/editor/persistence/save.js with the text unchanged, leave the rest in unsorted/from-<next row>.js files in page order (a file left empty is deleted), register all in layers.json in page order.'
      verification:
        - 'node scripts/build-editor.mjs --map'
        - 'node scripts/build-editor.mjs --check'
        - 'node scripts/build-editor.mjs --check-identical HEAD'
        - 'node scripts/check-editor.mjs --layers'
        - 'npm run lint'
        - 'npm run format:check'
        - 'sha256sum of the page starts a653717d5564c237'
      risk: 'medium'
      confidence: 88
      human_review: 'none'
      escalation_triggers:
        - 'Any check fails: restore the unsorted files and layers.json from HEAD and delete the new part file, each by path (no git stash, no checkout of the folder, no text edit to fit), log the failing command and its first line, stop the run.'
        - '--map differs from the range: the page changed since ASM-1, stop.'
      delegation_tier: 'standard'
    - id: task-009
      title: 'Move row 29: record-lookup to src/main/editor/model/record-lookup.js'
      source_requirements:
        prd:
          - 'W7-1'
          - 'W7-2'
          - 'W7-5'
        tdd:
          - 'DEC-1'
          - 'DEC-2'
          - 'DEC-3'
          - 'DEC-8'
          - 'CON-1'
          - 'CON-3'
          - 'FLOW-1'
          - 'IMP-1 to IMP-3'
      outputs:
        - 'Cut row 29 of 0182 DEC-4 (134 lines in the table) from the unsorted file that holds it into src/main/editor/model/record-lookup.js with the text unchanged, leave the rest in unsorted/from-<next row>.js files in page order (a file left empty is deleted), register all in layers.json in page order.'
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
        - 'Any check fails: restore the unsorted files and layers.json from HEAD and delete the new part file, each by path (no git stash, no checkout of the folder, no text edit to fit), log the failing command and its first line, stop the run.'
        - '--map differs from the range: the page changed since ASM-1, stop.'
      delegation_tier: 'standard'
    - id: task-010
      title: 'Move row 25: escape-html to src/main/editor/core/escape-html.js'
      source_requirements:
        prd:
          - 'W7-1'
          - 'W7-2'
          - 'W7-5'
        tdd:
          - 'DEC-1'
          - 'DEC-2'
          - 'DEC-3'
          - 'DEC-8'
          - 'CON-1'
          - 'CON-3'
          - 'FLOW-1'
          - 'IMP-1 to IMP-3'
      outputs:
        - 'Cut row 25 of 0182 DEC-4 (12 lines in the table) from the unsorted file that holds it into src/main/editor/core/escape-html.js with the text unchanged, leave the rest in unsorted/from-<next row>.js files in page order (a file left empty is deleted), register all in layers.json in page order.'
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
        - 'Any check fails: restore the unsorted files and layers.json from HEAD and delete the new part file, each by path (no git stash, no checkout of the folder, no text edit to fit), log the failing command and its first line, stop the run.'
        - '--map differs from the range: the page changed since ASM-1, stop.'
      delegation_tier: 'standard'
    - id: task-011
      title: 'Move row 23: folder-access to src/main/editor/persistence/folder-access.js'
      source_requirements:
        prd:
          - 'W7-1'
          - 'W7-2'
          - 'W7-5'
        tdd:
          - 'DEC-1'
          - 'DEC-2'
          - 'DEC-3'
          - 'DEC-8'
          - 'CON-1'
          - 'CON-3'
          - 'FLOW-1'
          - 'IMP-1 to IMP-3'
      outputs:
        - 'Cut row 23 of 0182 DEC-4 (363 lines in the table) from the unsorted file that holds it into src/main/editor/persistence/folder-access.js with the text unchanged, leave the rest in unsorted/from-<next row>.js files in page order (a file left empty is deleted), register all in layers.json in page order.'
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
        - 'Any check fails: restore the unsorted files and layers.json from HEAD and delete the new part file, each by path (no git stash, no checkout of the folder, no text edit to fit), log the failing command and its first line, stop the run.'
        - '--map differs from the range: the page changed since ASM-1, stop.'
      delegation_tier: 'standard'
    - id: task-012
      title: 'Move row 22: workspace-loading to src/main/editor/persistence/workspace-loading.js'
      source_requirements:
        prd:
          - 'W7-1'
          - 'W7-2'
          - 'W7-5'
        tdd:
          - 'DEC-1'
          - 'DEC-2'
          - 'DEC-3'
          - 'DEC-8'
          - 'CON-1'
          - 'CON-3'
          - 'FLOW-1'
          - 'IMP-1 to IMP-3'
      outputs:
        - 'Cut row 22 of 0182 DEC-4 (252 lines in the table) from the unsorted file that holds it into src/main/editor/persistence/workspace-loading.js with the text unchanged, leave the rest in unsorted/from-<next row>.js files in page order (a file left empty is deleted), register all in layers.json in page order.'
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
        - 'Any check fails: restore the unsorted files and layers.json from HEAD and delete the new part file, each by path (no git stash, no checkout of the folder, no text edit to fit), log the failing command and its first line, stop the run.'
        - '--map differs from the range: the page changed since ASM-1, stop.'
      delegation_tier: 'standard'
    - id: task-013
      title: 'Move row 21: read-schema to src/main/editor/core/read-schema.js'
      source_requirements:
        prd:
          - 'W7-1'
          - 'W7-2'
          - 'W7-5'
        tdd:
          - 'DEC-1'
          - 'DEC-2'
          - 'DEC-3'
          - 'DEC-8'
          - 'CON-1'
          - 'CON-3'
          - 'FLOW-1'
          - 'IMP-1 to IMP-3'
      outputs:
        - 'Cut row 21 of 0182 DEC-4 (442 lines in the table) from the unsorted file that holds it into src/main/editor/core/read-schema.js with the text unchanged, leave the rest in unsorted/from-<next row>.js files in page order (a file left empty is deleted), register all in layers.json in page order.'
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
        - 'Any check fails: restore the unsorted files and layers.json from HEAD and delete the new part file, each by path (no git stash, no checkout of the folder, no text edit to fit), log the failing command and its first line, stop the run.'
        - '--map differs from the range: the page changed since ASM-1, stop.'
      delegation_tier: 'standard'
    - id: task-014
      title: 'Test commit (DEC-7): yaml-parts.test.js loses its parseYamlAsModel exception'
      source_requirements:
        prd:
          - 'W7-5'
          - 'W7-6'
        tdd:
          - 'DEC-7'
          - 'CTR-4'
          - 'IMP-4'
      outputs:
        - 'Change yaml-parts.test.js at the four places of R-1 so that the rule is: every top-level name the six YAML parts name outside themselves is declared in a part of layer core, read from layers.json; the probe test finds unsorted functions from the parts of layer unsorted; rename the first test; commit as test:.'
      verification:
        - 'node --test on the changed file, on the page before and after the relocation it prepares'
        - 'npm run lint'
        - 'npm run format:check'
      risk: 'low'
      confidence: 82
      human_review: 'none'
      escalation_triggers:
        - 'The test cannot be made to pass without changing a decision of the TDD.'
      delegation_tier: 'standard'
    - id: task-015
      title: 'Test commit (DEC-5 a): the --cut real-page test reads the page of af1ed2d from git'
      source_requirements:
        prd:
          - 'W7-3'
          - 'W7-5'
        tdd:
          - 'DEC-5'
          - 'CTR-4'
          - 'IMP-4'
      outputs:
        - 'In check-editor.test.js make the test --cut on the real page read the page of af1ed2d with execFileSync git show (no shell), call cutCounts, assert 311, 162 and 100, rename it to say the page of af1ed2d; run it before and after; commit as test:.'
      verification:
        - 'node --test on the changed file, on the page before and after the relocation it prepares'
        - 'npm run lint'
        - 'npm run format:check'
      risk: 'low'
      confidence: 82
      human_review: 'none'
      escalation_triggers:
        - 'The test cannot be made to pass without changing a decision of the TDD.'
      delegation_tier: 'standard'
    - id: task-016
      title: 'Relocate REMOVED_PLATEAUS_KEY to core/read-schema.js'
      source_requirements:
        prd:
          - 'W7-2'
          - 'W7-4'
        tdd:
          - 'DEC-2'
          - 'DEC-4'
          - 'DEC-8'
          - 'FLOW-2'
      outputs:
        - 'Take the declaration of REMOVED_PLATEAUS_KEY with the comment line above it (five lines, page lines 5126-5130) out of the unsorted file that holds row 9 and append it after a blank line to core/read-schema.js; build the page, check with --statements, run the node suite, commit as refactor: relocate with the page.'
      verification:
        - 'npm run editor:build'
        - 'node scripts/check-editor.mjs --statements HEAD'
        - 'node scripts/check-editor.mjs --layers'
        - 'npm run lint'
        - 'npm run format:check'
        - 'npm run test:unit'
      risk: 'medium'
      confidence: 85
      human_review: 'none'
      escalation_triggers:
        - '--statements fails or the load order fails: revert by path; a group is regrouped, an initializer is never edited.'
        - 'The node suite fails: re-run the failing file on the parent in a scratch worktree; passing there means the relocation is wrong.'
      delegation_tier: 'standard'
    - id: task-017
      title: 'Move row 20: index-builder to src/main/editor/model/index-builder.js'
      source_requirements:
        prd:
          - 'W7-1'
          - 'W7-2'
          - 'W7-5'
        tdd:
          - 'DEC-1'
          - 'DEC-2'
          - 'DEC-3'
          - 'DEC-8'
          - 'CON-1'
          - 'CON-3'
          - 'FLOW-1'
          - 'IMP-1 to IMP-3'
      outputs:
        - 'Cut row 20 of 0182 DEC-4 (180 lines in the table) from the unsorted file that holds it into src/main/editor/model/index-builder.js with the text unchanged, leave the rest in unsorted/from-<next row>.js files in page order (a file left empty is deleted), register all in layers.json in page order. The page lines are 5 earlier than the table after the key relocation (R-2); take the ranges from --map.'
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
        - 'Any check fails: restore the unsorted files and layers.json from HEAD and delete the new part file, each by path (no git stash, no checkout of the folder, no text edit to fit), log the failing command and its first line, stop the run.'
        - '--map differs from the range: the page changed since ASM-1, stop.'
      delegation_tier: 'standard'
    - id: task-018
      title: 'Move row 14: origin-and-cascade to src/main/editor/model/origin-and-cascade.js'
      source_requirements:
        prd:
          - 'W7-1'
          - 'W7-2'
          - 'W7-5'
        tdd:
          - 'DEC-1'
          - 'DEC-2'
          - 'DEC-3'
          - 'DEC-8'
          - 'CON-1'
          - 'CON-3'
          - 'FLOW-1'
          - 'IMP-1 to IMP-3'
      outputs:
        - 'Cut row 14 of 0182 DEC-4 (74 lines in the table) from the unsorted file that holds it into src/main/editor/model/origin-and-cascade.js with the text unchanged, leave the rest in unsorted/from-<next row>.js files in page order (a file left empty is deleted), register all in layers.json in page order. The page lines are 5 earlier than the table after the key relocation (R-2); take the ranges from --map.'
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
        - 'Any check fails: restore the unsorted files and layers.json from HEAD and delete the new part file, each by path (no git stash, no checkout of the folder, no text edit to fit), log the failing command and its first line, stop the run.'
        - '--map differs from the range: the page changed since ASM-1, stop.'
      delegation_tier: 'standard'
    - id: task-019
      title: 'Move row 13: layer-loader to src/main/editor/model/layer-loader.js'
      source_requirements:
        prd:
          - 'W7-1'
          - 'W7-2'
          - 'W7-5'
        tdd:
          - 'DEC-1'
          - 'DEC-2'
          - 'DEC-3'
          - 'DEC-8'
          - 'CON-1'
          - 'CON-3'
          - 'FLOW-1'
          - 'IMP-1 to IMP-3'
      outputs:
        - 'Cut row 13 of 0182 DEC-4 (591 lines in the table) from the unsorted file that holds it into src/main/editor/model/layer-loader.js with the text unchanged, leave the rest in unsorted/from-<next row>.js files in page order (a file left empty is deleted), register all in layers.json in page order. The page lines are 5 earlier than the table after the key relocation (R-2); take the ranges from --map.'
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
        - 'Any check fails: restore the unsorted files and layers.json from HEAD and delete the new part file, each by path (no git stash, no checkout of the folder, no text edit to fit), log the failing command and its first line, stop the run.'
        - '--map differs from the range: the page changed since ASM-1, stop.'
      delegation_tier: 'standard'
    - id: task-020
      title: 'Move row 12: plateau-tree to src/main/editor/model/plateau-tree.js'
      source_requirements:
        prd:
          - 'W7-1'
          - 'W7-2'
          - 'W7-5'
        tdd:
          - 'DEC-1'
          - 'DEC-2'
          - 'DEC-3'
          - 'DEC-8'
          - 'CON-1'
          - 'CON-3'
          - 'FLOW-1'
          - 'IMP-1 to IMP-3'
      outputs:
        - 'Cut row 12 of 0182 DEC-4 (265 lines in the table) from the unsorted file that holds it into src/main/editor/model/plateau-tree.js with the text unchanged, leave the rest in unsorted/from-<next row>.js files in page order (a file left empty is deleted), register all in layers.json in page order. The page lines are 5 earlier than the table after the key relocation (R-2); take the ranges from --map.'
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
        - 'Any check fails: restore the unsorted files and layers.json from HEAD and delete the new part file, each by path (no git stash, no checkout of the folder, no text edit to fit), log the failing command and its first line, stop the run.'
        - '--map differs from the range: the page changed since ASM-1, stop.'
      delegation_tier: 'standard'
    - id: task-021
      title: 'Move row 11: element-index to src/main/editor/model/element-index.js'
      source_requirements:
        prd:
          - 'W7-1'
          - 'W7-2'
          - 'W7-5'
        tdd:
          - 'DEC-1'
          - 'DEC-2'
          - 'DEC-3'
          - 'DEC-8'
          - 'CON-1'
          - 'CON-3'
          - 'FLOW-1'
          - 'IMP-1 to IMP-3'
      outputs:
        - 'Cut row 11 of 0182 DEC-4 (123 lines in the table) from the unsorted file that holds it into src/main/editor/model/element-index.js with the text unchanged, leave the rest in unsorted/from-<next row>.js files in page order (a file left empty is deleted), register all in layers.json in page order. The page lines are 5 earlier than the table after the key relocation (R-2); take the ranges from --map.'
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
        - 'Any check fails: restore the unsorted files and layers.json from HEAD and delete the new part file, each by path (no git stash, no checkout of the folder, no text edit to fit), log the failing command and its first line, stop the run.'
        - '--map differs from the range: the page changed since ASM-1, stop.'
      delegation_tier: 'standard'
    - id: task-022
      title: 'Move row 10: manifest-kinds to src/main/editor/core/manifest-kinds.js'
      source_requirements:
        prd:
          - 'W7-1'
          - 'W7-2'
          - 'W7-5'
        tdd:
          - 'DEC-1'
          - 'DEC-2'
          - 'DEC-3'
          - 'DEC-8'
          - 'CON-1'
          - 'CON-3'
          - 'FLOW-1'
          - 'IMP-1 to IMP-3'
      outputs:
        - 'Cut row 10 of 0182 DEC-4 (28 lines in the table) from the unsorted file that holds it into src/main/editor/core/manifest-kinds.js with the text unchanged, leave the rest in unsorted/from-<next row>.js files in page order (a file left empty is deleted), register all in layers.json in page order. The page lines are 5 earlier than the table after the key relocation (R-2); take the ranges from --map.'
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
        - 'Any check fails: restore the unsorted files and layers.json from HEAD and delete the new part file, each by path (no git stash, no checkout of the folder, no text edit to fit), log the failing command and its first line, stop the run.'
        - '--map differs from the range: the page changed since ASM-1, stop.'
      delegation_tier: 'standard'
    - id: task-023
      title: 'Move row 9: settings to src/main/editor/model/settings.js'
      source_requirements:
        prd:
          - 'W7-1'
          - 'W7-2'
          - 'W7-5'
        tdd:
          - 'DEC-1'
          - 'DEC-2'
          - 'DEC-3'
          - 'DEC-8'
          - 'CON-1'
          - 'CON-3'
          - 'FLOW-1'
          - 'IMP-1 to IMP-3'
      outputs:
        - 'Cut row 9 of 0182 DEC-4 (297 lines in the table) from the unsorted file that holds it into src/main/editor/model/settings.js with the text unchanged, leave the rest in unsorted/from-<next row>.js files in page order (a file left empty is deleted), register all in layers.json in page order. Row 9 is 297 lines after the key left it (R-2); take the ranges from build-editor.mjs --map and not from the table.'
      verification:
        - 'node scripts/build-editor.mjs --map'
        - 'node scripts/build-editor.mjs --check'
        - 'node scripts/build-editor.mjs --check-identical HEAD'
        - 'node scripts/check-editor.mjs --layers'
        - 'npm run lint'
        - 'npm run format:check'
        - 'sha256sum of the page starts a653717d5564c237'
      risk: 'medium'
      confidence: 88
      human_review: 'none'
      escalation_triggers:
        - 'Any check fails: restore the unsorted files and layers.json from HEAD and delete the new part file, each by path (no git stash, no checkout of the folder, no text edit to fit), log the failing command and its first line, stop the run.'
        - '--map differs from the range: the page changed since ASM-1, stop.'
      delegation_tier: 'standard'
    - id: task-024
      title: 'Move row 8: app-state to src/main/editor/model/app-state.js'
      source_requirements:
        prd:
          - 'W7-1'
          - 'W7-2'
          - 'W7-5'
        tdd:
          - 'DEC-1'
          - 'DEC-2'
          - 'DEC-3'
          - 'DEC-8'
          - 'CON-1'
          - 'CON-3'
          - 'FLOW-1'
          - 'IMP-1 to IMP-3'
      outputs:
        - 'Cut row 8 of 0182 DEC-4 (103 lines in the table) from the unsorted file that holds it into src/main/editor/model/app-state.js with the text unchanged, leave the rest in unsorted/from-<next row>.js files in page order (a file left empty is deleted), register all in layers.json in page order.'
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
        - 'Any check fails: restore the unsorted files and layers.json from HEAD and delete the new part file, each by path (no git stash, no checkout of the folder, no text edit to fit), log the failing command and its first line, stop the run.'
        - '--map differs from the range: the page changed since ASM-1, stop.'
      delegation_tier: 'standard'
    - id: task-025
      title: 'Move row 7: remembered-folders to src/main/editor/persistence/remembered-folders.js'
      source_requirements:
        prd:
          - 'W7-1'
          - 'W7-2'
          - 'W7-5'
        tdd:
          - 'DEC-1'
          - 'DEC-2'
          - 'DEC-3'
          - 'DEC-8'
          - 'CON-1'
          - 'CON-3'
          - 'FLOW-1'
          - 'IMP-1 to IMP-3'
      outputs:
        - 'Cut row 7 of 0182 DEC-4 (430 lines in the table) from the unsorted file that holds it into src/main/editor/persistence/remembered-folders.js with the text unchanged, leave the rest in unsorted/from-<next row>.js files in page order (a file left empty is deleted), register all in layers.json in page order.'
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
        - 'Any check fails: restore the unsorted files and layers.json from HEAD and delete the new part file, each by path (no git stash, no checkout of the folder, no text edit to fit), log the failing command and its first line, stop the run.'
        - '--map differs from the range: the page changed since ASM-1, stop.'
      delegation_tier: 'standard'
    - id: task-026
      title: 'Step 7.1 end: node suite, EditorReadSchemaTest and GuideViewPropertiesTest'
      source_requirements:
        prd:
          - 'W7-3'
        tdd:
          - 'DEC-8'
          - 'FLOW-3'
          - 'ASM-5'
      outputs:
        - 'Run the whole node suite and the two Java classes that read the markers after the twenty moves and the key (R-4).'
      verification:
        - 'npm run test:unit'
        - './mvnw -Dtest=EditorReadSchemaTest,GuideViewPropertiesTest test (JDK 25)'
        - 'git status'
      risk: 'medium'
      confidence: 86
      human_review: 'none'
      escalation_triggers:
        - 'A check fails: log the command and its first line; the coverage floor is never lowered in this run.'
      delegation_tier: 'standard'
    - id: task-027
      title: 'Test commit (DEC-5 b): the #37 test slices diagramCacheKey to its closing brace'
      source_requirements:
        prd:
          - 'W7-3'
          - 'W7-5'
        tdd:
          - 'DEC-5'
          - 'CTR-4'
          - 'IMP-4'
      outputs:
        - 'In editor-odds-and-ends.test.js make the slice for diagramCacheKey end at the end of the function (HTML.indexOf of newline brace newline, plus 3) and no longer at let treeQuietCache; run it before and after; commit as test:.'
      verification:
        - 'node --test on the changed file, on the page before and after the relocation it prepares'
        - 'npm run lint'
        - 'npm run format:check'
      risk: 'low'
      confidence: 82
      human_review: 'none'
      escalation_triggers:
        - 'The test cannot be made to pass without changing a decision of the TDD.'
      delegation_tier: 'standard'
    - id: task-028
      title: 'Relocation group 1 (DEC-4): page registry and shell to model/ui-state.js'
      source_requirements:
        prd:
          - 'W7-1'
          - 'W7-2'
          - 'W7-6'
        tdd:
          - 'DEC-4'
          - 'DEC-6'
          - 'DEC-8'
          - 'FLOW-3'
          - 'RISK-3'
          - 'RISK-7'
      outputs:
        - 'Relocate the 11 names of group 1 (page registry and shell: rows 26 and 28) with the comment lines directly above each declaration, in page order, one blank line between, to model/ui-state.js (creates the file); ui-state sits between unsorted/from-26.js and model/record-lookup.js in layers.json (DEC-6); check that none of the 19 coverage markers is among the lines taken; --statements, --layers, lint, format check, node suite; commit as refactor: relocate with the page.'
      verification:
        - 'npm run editor:build'
        - 'node scripts/check-editor.mjs --statements HEAD'
        - 'node scripts/check-editor.mjs --layers'
        - 'npm run lint'
        - 'npm run format:check'
        - 'npm run test:unit'
      risk: 'medium'
      confidence: 84
      human_review: 'none'
      escalation_triggers:
        - '--statements fails or the load order fails: revert by path; a group is regrouped, an initializer is never edited.'
        - 'The node suite fails: re-run the failing file on the parent in a scratch worktree; passing there means the relocation is wrong.'
      delegation_tier: 'standard'
    - id: task-029
      title: 'Relocation group 2 (DEC-4): panels to model/ui-state.js'
      source_requirements:
        prd:
          - 'W7-1'
          - 'W7-2'
          - 'W7-6'
        tdd:
          - 'DEC-4'
          - 'DEC-6'
          - 'DEC-8'
          - 'FLOW-3'
          - 'RISK-3'
          - 'RISK-7'
      outputs:
        - 'Relocate the 11 names of group 2 (panels: rows 35, 36, 40, 41, 42, 48, 53, 57) with the comment lines directly above each declaration, in page order, one blank line between, to model/ui-state.js; ui-state sits between unsorted/from-26.js and model/record-lookup.js in layers.json (DEC-6); check that none of the 19 coverage markers is among the lines taken; --statements, --layers, lint, format check, node suite; commit as refactor: relocate with the page.'
      verification:
        - 'npm run editor:build'
        - 'node scripts/check-editor.mjs --statements HEAD'
        - 'node scripts/check-editor.mjs --layers'
        - 'npm run lint'
        - 'npm run format:check'
        - 'npm run test:unit'
      risk: 'medium'
      confidence: 84
      human_review: 'none'
      escalation_triggers:
        - '--statements fails or the load order fails: revert by path; a group is regrouped, an initializer is never edited.'
        - 'The node suite fails: re-run the failing file on the parent in a scratch worktree; passing there means the relocation is wrong.'
      delegation_tier: 'standard'
    - id: task-030
      title: 'Relocation group 3 (DEC-4): diagram to model/ui-state.js'
      source_requirements:
        prd:
          - 'W7-1'
          - 'W7-2'
          - 'W7-6'
        tdd:
          - 'DEC-4'
          - 'DEC-6'
          - 'DEC-8'
          - 'FLOW-3'
          - 'RISK-3'
          - 'RISK-7'
      outputs:
        - 'Relocate the 20 names of group 3 (diagram: rows 44, 51, 52) with the comment lines directly above each declaration, in page order, one blank line between, to model/ui-state.js; ui-state sits between unsorted/from-26.js and model/record-lookup.js in layers.json (DEC-6); check that none of the 19 coverage markers is among the lines taken; --statements, --layers, lint, format check, node suite; commit as refactor: relocate with the page. Run EditorReadSchemaTest and GuideViewPropertiesTest after this group (R-4).'
      verification:
        - 'npm run editor:build'
        - 'node scripts/check-editor.mjs --statements HEAD'
        - 'node scripts/check-editor.mjs --layers'
        - 'npm run lint'
        - 'npm run format:check'
        - 'npm run test:unit'
        - './mvnw -Dtest=EditorReadSchemaTest,GuideViewPropertiesTest test'
      risk: 'medium'
      confidence: 80
      human_review: 'none'
      escalation_triggers:
        - '--statements fails or the load order fails: revert by path; a group is regrouped, an initializer is never edited.'
        - 'The node suite fails: re-run the failing file on the parent in a scratch worktree; passing there means the relocation is wrong.'
      delegation_tier: 'standard'
    - id: task-031
      title: 'Relocation group 4 (DEC-4): map to model/ui-state.js'
      source_requirements:
        prd:
          - 'W7-1'
          - 'W7-2'
          - 'W7-6'
        tdd:
          - 'DEC-4'
          - 'DEC-6'
          - 'DEC-8'
          - 'FLOW-3'
          - 'RISK-3'
          - 'RISK-7'
      outputs:
        - 'Relocate the 10 names of group 4 (map: row 45) with the comment lines directly above each declaration, in page order, one blank line between, to model/ui-state.js; ui-state sits between unsorted/from-26.js and model/record-lookup.js in layers.json (DEC-6); check that none of the 19 coverage markers is among the lines taken; --statements, --layers, lint, format check, node suite; commit as refactor: relocate with the page. Run EditorReadSchemaTest and GuideViewPropertiesTest after this group (R-4).'
      verification:
        - 'npm run editor:build'
        - 'node scripts/check-editor.mjs --statements HEAD'
        - 'node scripts/check-editor.mjs --layers'
        - 'npm run lint'
        - 'npm run format:check'
        - 'npm run test:unit'
        - './mvnw -Dtest=EditorReadSchemaTest,GuideViewPropertiesTest test'
      risk: 'medium'
      confidence: 80
      human_review: 'none'
      escalation_triggers:
        - '--statements fails or the load order fails: revert by path; a group is regrouped, an initializer is never edited.'
        - 'The node suite fails: re-run the failing file on the parent in a scratch worktree; passing there means the relocation is wrong.'
      delegation_tier: 'standard'
    - id: task-032
      title: 'Relocation group 5 (DEC-4): dialogs and the plateau constant to model/ui-state.js'
      source_requirements:
        prd:
          - 'W7-1'
          - 'W7-2'
          - 'W7-6'
        tdd:
          - 'DEC-4'
          - 'DEC-6'
          - 'DEC-8'
          - 'FLOW-3'
          - 'RISK-3'
          - 'RISK-7'
      outputs:
        - 'Relocate the 7 names of group 5 (dialogs and the plateau constant: rows 15 and 58) with the comment lines directly above each declaration, in page order, one blank line between, to model/ui-state.js; ui-state sits between unsorted/from-26.js and model/record-lookup.js in layers.json (DEC-6); check that none of the 19 coverage markers is among the lines taken; --statements, --layers, lint, format check, node suite; commit as refactor: relocate with the page.'
      verification:
        - 'npm run editor:build'
        - 'node scripts/check-editor.mjs --statements HEAD'
        - 'node scripts/check-editor.mjs --layers'
        - 'npm run lint'
        - 'npm run format:check'
        - 'npm run test:unit'
      risk: 'medium'
      confidence: 84
      human_review: 'none'
      escalation_triggers:
        - '--statements fails or the load order fails: revert by path; a group is regrouped, an initializer is never edited.'
        - 'The node suite fails: re-run the failing file on the parent in a scratch worktree; passing there means the relocation is wrong.'
      delegation_tier: 'standard'
    - id: task-033
      title: 'End-of-run checks of 0182 DEC-6 and the shown-to-fail commands'
      source_requirements:
        prd:
          - 'W7-3'
          - 'W7-4'
        tdd:
          - 'FLOW-4'
          - 'Observability and Verification'
          - 'DEC-6'
          - 'IMP-6'
      outputs:
        - 'Run the end set of FLOW-4 and the two shown-to-fail commands of Observability and Verification.'
      verification:
        - 'npm run test:unit'
        - 'npm run test:coverage'
        - './mvnw verify -DskipITs=false'
        - 'npm run test:e2e'
        - 'src/main/rust/viewpoint-kernel/embed.sh --check'
        - 'npm run editor:check'
        - 'npm run lint'
        - 'npm run format:check'
        - 'git diff --stat against the first parent of the run'
        - 'scripts/check-editor-moves.sh <merge-base> HEAD when the commits exist'
      risk: 'medium'
      confidence: 78
      human_review: 'none'
      escalation_triggers:
        - 'A check fails: log the command and its first line; the coverage floor is never lowered in this run.'
      delegation_tier: 'standard'
    - id: task-034
      title: 'Record the evidence in the run document and the prg'
      source_requirements:
        prd:
          - 'W7-3'
        tdd:
          - 'FLOW-4'
          - 'IMP-7'
      outputs:
        - 'Write the evidence of every task into the prg and the run document, set the run status for the implement stage, and note the open pull request run as pending.'
      verification:
        - 'grep'
        - 'manual read'
      risk: 'low'
      confidence: 88
      human_review: 'none'
      escalation_triggers:
        - 'A fix would change a decision.'
      delegation_tier: 'standard'
```

## 5. Parallelization Plan

```yaml
parallelization_plan:
  groups: []
  sequential_reason: 'All 34 tasks are one chain: the moves and relocations share layers.json and the unsorted files, the order of the commits is fixed by DEC-2, and every later task reads the page the earlier ones leave.'
```

## 6. Human Review Gates

This run operates under the autonomy override of complete-run: a task that would be human_required is executed and its decision logged. None is expected; no task is human_required and none is critical. The one gate is the author reading the pull request, which no task depends on. The override does not suspend the standing safety rules: no push, no force, no --no-verify, no destructive git, commits only by path and only as the session allows.

```yaml
human_review_gates:
  gates:
    - id: gate-001
      trigger: 'The pull request of the wave exists: its run (Page, Java, Kernel, E2E, Native, Build) is the proof that this run cannot give for the Native job (CON-7) and for the move-commit check on commits.'
      required_before: []
      required_after: [task-026, task-033]
      reviewer_focus:
        - 'The twenty move commits have the refactor: move subject and an empty page diff, the six relocate commits the refactor: relocate subject, and the Page job reads them as ok.'
        - 'Native passes unchanged: src/main/editor is outside src/main/resources and no workflow, pom or Java file changed.'
        - 'model/ui-state.js sits between unsorted/from-26.js and model/record-lookup.js and the coverage floor file is unchanged (DEC-6).'
```

## 7. Risk Assessment

```yaml
risk_assessment:
  by_task:
    - id: task-001
      risk: 'low'
      rationale: 'Documentation only.'
    - id: task-002
      risk: 'medium'
      rationale: 'Runs checks that can fail for the environment; changes no shipped file.'
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
      rationale: 'Pure move checked byte for byte against the parent, no behaviour changes, restore by path.'
    - id: task-010
      risk: 'medium'
      rationale: 'Pure move checked byte for byte against the parent, no behaviour changes, restore by path.'
    - id: task-011
      risk: 'medium'
      rationale: 'Pure move checked byte for byte against the parent, no behaviour changes, restore by path.'
    - id: task-012
      risk: 'medium'
      rationale: 'Pure move checked byte for byte against the parent, no behaviour changes, restore by path.'
    - id: task-013
      risk: 'medium'
      rationale: 'Pure move checked byte for byte against the parent, no behaviour changes, restore by path.'
    - id: task-014
      risk: 'low'
      rationale: 'Changes one existing test, committed apart from the relocation it prepares.'
    - id: task-015
      risk: 'low'
      rationale: 'Changes one existing test, committed apart from the relocation it prepares.'
    - id: task-016
      risk: 'medium'
      rationale: 'Reorders the page; proved by the statement check and the node suite, restore by path.'
    - id: task-017
      risk: 'medium'
      rationale: 'Pure move checked byte for byte against the parent, no behaviour changes, restore by path.'
    - id: task-018
      risk: 'medium'
      rationale: 'Pure move checked byte for byte against the parent, no behaviour changes, restore by path.'
    - id: task-019
      risk: 'medium'
      rationale: 'Pure move checked byte for byte against the parent, no behaviour changes, restore by path.'
    - id: task-020
      risk: 'medium'
      rationale: 'Pure move checked byte for byte against the parent, no behaviour changes, restore by path.'
    - id: task-021
      risk: 'medium'
      rationale: 'Pure move checked byte for byte against the parent, no behaviour changes, restore by path.'
    - id: task-022
      risk: 'medium'
      rationale: 'Pure move checked byte for byte against the parent, no behaviour changes, restore by path.'
    - id: task-023
      risk: 'medium'
      rationale: 'Pure move checked byte for byte against the parent, no behaviour changes, restore by path.'
    - id: task-024
      risk: 'medium'
      rationale: 'Pure move checked byte for byte against the parent, no behaviour changes, restore by path.'
    - id: task-025
      risk: 'medium'
      rationale: 'Pure move checked byte for byte against the parent, no behaviour changes, restore by path.'
    - id: task-026
      risk: 'medium'
      rationale: 'Runs checks that can fail for the environment; changes no shipped file.'
    - id: task-027
      risk: 'low'
      rationale: 'Changes one existing test, committed apart from the relocation it prepares.'
    - id: task-028
      risk: 'medium'
      rationale: 'Reorders the page; a let read at load before its new place fails the statement check or a test, regroup rather than patch.'
    - id: task-029
      risk: 'medium'
      rationale: 'Reorders the page; a let read at load before its new place fails the statement check or a test, regroup rather than patch.'
    - id: task-030
      risk: 'medium'
      rationale: 'Reorders the page; a let read at load before its new place fails the statement check or a test, regroup rather than patch.'
    - id: task-031
      risk: 'medium'
      rationale: 'Reorders the page; a let read at load before its new place fails the statement check or a test, regroup rather than patch.'
    - id: task-032
      risk: 'medium'
      rationale: 'Reorders the page; a let read at load before its new place fails the statement check or a test, regroup rather than patch.'
    - id: task-033
      risk: 'medium'
      rationale: 'Runs checks that can fail for the environment; changes no shipped file.'
    - id: task-034
      risk: 'low'
      rationale: 'Documentation only.'
  by_area:
    - area: 'ui'
      risk: 'low'
      rationale: 'The shipped page is the same bytes through the moves and the same declarations in another order after the relocations; the byte and statement checks find a wrong cut before anything else.'
    - area: 'tests'
      risk: 'low'
      rationale: 'Three existing tests change, each in a test commit of its own (DEC-5, DEC-7).'
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
      rationale: 'The cut was reproduced in a scratch worktree while drafting the TDD (ASM-3, ASM-4, ASM-5).'
    - id: task-004
      score: 90
      rationale: 'The cut was reproduced in a scratch worktree while drafting the TDD (ASM-3, ASM-4, ASM-5).'
    - id: task-005
      score: 90
      rationale: 'The cut was reproduced in a scratch worktree while drafting the TDD (ASM-3, ASM-4, ASM-5).'
    - id: task-006
      score: 90
      rationale: 'The cut was reproduced in a scratch worktree while drafting the TDD (ASM-3, ASM-4, ASM-5).'
    - id: task-007
      score: 90
      rationale: 'The cut was reproduced in a scratch worktree while drafting the TDD (ASM-3, ASM-4, ASM-5).'
    - id: task-008
      score: 88
      rationale: 'The cut was reproduced in a scratch worktree while drafting the TDD (ASM-3, ASM-4, ASM-5).'
    - id: task-009
      score: 90
      rationale: 'The cut was reproduced in a scratch worktree while drafting the TDD (ASM-3, ASM-4, ASM-5).'
    - id: task-010
      score: 90
      rationale: 'The cut was reproduced in a scratch worktree while drafting the TDD (ASM-3, ASM-4, ASM-5).'
    - id: task-011
      score: 90
      rationale: 'The cut was reproduced in a scratch worktree while drafting the TDD (ASM-3, ASM-4, ASM-5).'
    - id: task-012
      score: 90
      rationale: 'The cut was reproduced in a scratch worktree while drafting the TDD (ASM-3, ASM-4, ASM-5).'
    - id: task-013
      score: 90
      rationale: 'The cut was reproduced in a scratch worktree while drafting the TDD (ASM-3, ASM-4, ASM-5).'
    - id: task-014
      score: 82
      rationale: 'Clear acceptance criteria and automated or grep checks.'
    - id: task-015
      score: 82
      rationale: 'Clear acceptance criteria and automated or grep checks.'
    - id: task-016
      score: 85
      rationale: 'The cut was reproduced in a scratch worktree while drafting the TDD (ASM-3, ASM-4, ASM-5).'
    - id: task-017
      score: 90
      rationale: 'The cut was reproduced in a scratch worktree while drafting the TDD (ASM-3, ASM-4, ASM-5).'
    - id: task-018
      score: 90
      rationale: 'The cut was reproduced in a scratch worktree while drafting the TDD (ASM-3, ASM-4, ASM-5).'
    - id: task-019
      score: 90
      rationale: 'The cut was reproduced in a scratch worktree while drafting the TDD (ASM-3, ASM-4, ASM-5).'
    - id: task-020
      score: 90
      rationale: 'The cut was reproduced in a scratch worktree while drafting the TDD (ASM-3, ASM-4, ASM-5).'
    - id: task-021
      score: 90
      rationale: 'The cut was reproduced in a scratch worktree while drafting the TDD (ASM-3, ASM-4, ASM-5).'
    - id: task-022
      score: 90
      rationale: 'The cut was reproduced in a scratch worktree while drafting the TDD (ASM-3, ASM-4, ASM-5).'
    - id: task-023
      score: 88
      rationale: 'The cut was reproduced in a scratch worktree while drafting the TDD (ASM-3, ASM-4, ASM-5).'
    - id: task-024
      score: 90
      rationale: 'The cut was reproduced in a scratch worktree while drafting the TDD (ASM-3, ASM-4, ASM-5).'
    - id: task-025
      score: 90
      rationale: 'The cut was reproduced in a scratch worktree while drafting the TDD (ASM-3, ASM-4, ASM-5).'
    - id: task-026
      score: 86
      rationale: 'Clear acceptance criteria and automated or grep checks.'
    - id: task-027
      score: 82
      rationale: 'Clear acceptance criteria and automated or grep checks.'
    - id: task-028
      score: 84
      rationale: 'The cut was reproduced in a scratch worktree while drafting the TDD (ASM-3, ASM-4, ASM-5).'
    - id: task-029
      score: 84
      rationale: 'The cut was reproduced in a scratch worktree while drafting the TDD (ASM-3, ASM-4, ASM-5).'
    - id: task-030
      score: 80
      rationale: 'The cut was reproduced in a scratch worktree while drafting the TDD (ASM-3, ASM-4, ASM-5).'
    - id: task-031
      score: 80
      rationale: 'The cut was reproduced in a scratch worktree while drafting the TDD (ASM-3, ASM-4, ASM-5).'
    - id: task-032
      score: 84
      rationale: 'The cut was reproduced in a scratch worktree while drafting the TDD (ASM-3, ASM-4, ASM-5).'
    - id: task-033
      score: 78
      rationale: 'Clear acceptance criteria and automated or grep checks.'
    - id: task-034
      score: 88
      rationale: 'Clear acceptance criteria and automated or grep checks.'
```

## 9. Agent Assignment Plan

```yaml
agent_assignment_plan:
  assignments:
    - task_id: task-001
      agent_role: 'Documentation Agent'
      objective: 'Apply R-1 to R-4 and the cheap S1 findings of the Stage 5 review to the TDD, as the prg of the run lists them.'
      context:
        prd_excerpts:
          - 'W7-3 of the TDD traceability'
          - 'W7-4 of the TDD traceability'
        tdd_excerpts:
          - 'DEC-3'
          - 'DEC-7'
          - 'DEC-8'
          - 'FLOW-1'
          - 'IF-2'
          - 'Reliability, Performance, and Scalability'
          - 'Deferred Work'
      likely_files:
        - 'docs/wav/wav-024-fixes-and-editor-modules/run/run-0185-editor-extract-model-and-kernel/tdd-0185-editor-extract-model-and-kernel.md'
      acceptance_criteria:
        - 'The objective is met and its verification passes.'
      verification:
        - 'grep for each applied sentence'
        - 'node scripts/build-editor.mjs --check'
      escalation_triggers:
        - 'A fix would change a decision.'
      suggested_subagent_type: 'general-purpose'
      suggested_model: '(default)'
      suggested_effort: 'medium'
    - task_id: task-002
      agent_role: 'QA Agent'
      objective: 'Check ASM-1 and ASM-2 and stop, without degrading, if the work of W-6 is not committed.'
      context:
        prd_excerpts:
          - 'W7-2 of the TDD traceability'
          - 'W7-4 of the TDD traceability'
        tdd_excerpts:
          - 'ASM-1'
          - 'ASM-2'
          - 'RISK-1'
          - 'FLOW-1'
      likely_files:
        - 'docs/wav/wav-024-fixes-and-editor-modules/run/run-0185-editor-extract-model-and-kernel/prg-0185-editor-extract-model-and-kernel.md'
      acceptance_criteria:
        - 'The objective is met and its verification passes.'
      verification:
        - 'git status --short -- src/main/editor src/test/javascript/editor-build'
        - 'node scripts/build-editor.mjs --check'
        - 'node scripts/check-editor.mjs --layers'
        - 'sha256sum src/main/resources/editor-webapp/standalone.html'
        - 'wc -l src/main/resources/editor-webapp/standalone.html'
      escalation_triggers:
        - 'A check fails: log the command and its first line; the coverage floor is never lowered in this run.'
      suggested_subagent_type: 'general-purpose'
      suggested_model: '(default)'
      suggested_effort: 'medium'
    - task_id: task-003
      agent_role: 'Refactoring Agent'
      objective: 'Cut row 54 of 0182 DEC-4 (164 lines in the table) from the unsorted file that holds it into src/main/editor/model/stories-model.js with the text unchanged, leave the rest in unsorted/from-<next row>.js files in page order (a file left empty is deleted), register all in layers.json in page order.'
      context:
        prd_excerpts:
          - 'W7-1 of the TDD traceability'
          - 'W7-2 of the TDD traceability'
          - 'W7-5 of the TDD traceability'
        tdd_excerpts:
          - 'DEC-1'
          - 'DEC-2'
          - 'DEC-3'
          - 'DEC-8'
          - 'CON-1'
          - 'CON-3'
          - 'FLOW-1'
          - 'IMP-1 to IMP-3'
      likely_files:
        - 'src/main/editor/model/stories-model.js'
        - 'src/main/editor/layers.json'
        - 'src/main/editor/unsorted/'
      acceptance_criteria:
        - 'The part has exactly the lines of its row and nothing else, and the assembled page is byte for byte the committed one.'
      verification:
        - 'node scripts/build-editor.mjs --map'
        - 'node scripts/build-editor.mjs --check'
        - 'node scripts/build-editor.mjs --check-identical HEAD'
        - 'node scripts/check-editor.mjs --layers'
        - 'npm run lint'
        - 'npm run format:check'
        - 'sha256sum of the page starts a653717d5564c237'
      escalation_triggers:
        - 'Any check fails: restore the unsorted files and layers.json from HEAD and delete the new part file, each by path (no git stash, no checkout of the folder, no text edit to fit), log the failing command and its first line, stop the run.'
        - '--map differs from the range: the page changed since ASM-1, stop.'
      suggested_subagent_type: 'general-purpose'
      suggested_model: '(default)'
      suggested_effort: 'medium'
    - task_id: task-004
      agent_role: 'Refactoring Agent'
      objective: 'Cut row 49 of 0182 DEC-4 (194 lines in the table) from the unsorted file that holds it into src/main/editor/model/styles.js with the text unchanged, leave the rest in unsorted/from-<next row>.js files in page order (a file left empty is deleted), register all in layers.json in page order.'
      context:
        prd_excerpts:
          - 'W7-1 of the TDD traceability'
          - 'W7-2 of the TDD traceability'
          - 'W7-5 of the TDD traceability'
        tdd_excerpts:
          - 'DEC-1'
          - 'DEC-2'
          - 'DEC-3'
          - 'DEC-8'
          - 'CON-1'
          - 'CON-3'
          - 'FLOW-1'
          - 'IMP-1 to IMP-3'
      likely_files:
        - 'src/main/editor/model/styles.js'
        - 'src/main/editor/layers.json'
        - 'src/main/editor/unsorted/'
      acceptance_criteria:
        - 'The part has exactly the lines of its row and nothing else, and the assembled page is byte for byte the committed one.'
      verification:
        - 'node scripts/build-editor.mjs --map'
        - 'node scripts/build-editor.mjs --check'
        - 'node scripts/build-editor.mjs --check-identical HEAD'
        - 'node scripts/check-editor.mjs --layers'
        - 'npm run lint'
        - 'npm run format:check'
        - 'sha256sum of the page starts a653717d5564c237'
      escalation_triggers:
        - 'Any check fails: restore the unsorted files and layers.json from HEAD and delete the new part file, each by path (no git stash, no checkout of the folder, no text edit to fit), log the failing command and its first line, stop the run.'
        - '--map differs from the range: the page changed since ASM-1, stop.'
      suggested_subagent_type: 'general-purpose'
      suggested_model: '(default)'
      suggested_effort: 'medium'
    - task_id: task-005
      agent_role: 'Refactoring Agent'
      objective: 'Cut row 47 of 0182 DEC-4 (273 lines in the table) from the unsorted file that holds it into src/main/editor/model/comparison.js with the text unchanged, leave the rest in unsorted/from-<next row>.js files in page order (a file left empty is deleted), register all in layers.json in page order.'
      context:
        prd_excerpts:
          - 'W7-1 of the TDD traceability'
          - 'W7-2 of the TDD traceability'
          - 'W7-5 of the TDD traceability'
        tdd_excerpts:
          - 'DEC-1'
          - 'DEC-2'
          - 'DEC-3'
          - 'DEC-8'
          - 'CON-1'
          - 'CON-3'
          - 'FLOW-1'
          - 'IMP-1 to IMP-3'
      likely_files:
        - 'src/main/editor/model/comparison.js'
        - 'src/main/editor/layers.json'
        - 'src/main/editor/unsorted/'
      acceptance_criteria:
        - 'The part has exactly the lines of its row and nothing else, and the assembled page is byte for byte the committed one.'
      verification:
        - 'node scripts/build-editor.mjs --map'
        - 'node scripts/build-editor.mjs --check'
        - 'node scripts/build-editor.mjs --check-identical HEAD'
        - 'node scripts/check-editor.mjs --layers'
        - 'npm run lint'
        - 'npm run format:check'
        - 'sha256sum of the page starts a653717d5564c237'
      escalation_triggers:
        - 'Any check fails: restore the unsorted files and layers.json from HEAD and delete the new part file, each by path (no git stash, no checkout of the folder, no text edit to fit), log the failing command and its first line, stop the run.'
        - '--map differs from the range: the page changed since ASM-1, stop.'
      suggested_subagent_type: 'general-purpose'
      suggested_model: '(default)'
      suggested_effort: 'medium'
    - task_id: task-006
      agent_role: 'Refactoring Agent'
      objective: 'Cut row 46 of 0182 DEC-4 (140 lines in the table) from the unsorted file that holds it into src/main/editor/model/kernel-bridge.js with the text unchanged, leave the rest in unsorted/from-<next row>.js files in page order (a file left empty is deleted), register all in layers.json in page order.'
      context:
        prd_excerpts:
          - 'W7-1 of the TDD traceability'
          - 'W7-2 of the TDD traceability'
          - 'W7-5 of the TDD traceability'
        tdd_excerpts:
          - 'DEC-1'
          - 'DEC-2'
          - 'DEC-3'
          - 'DEC-8'
          - 'CON-1'
          - 'CON-3'
          - 'FLOW-1'
          - 'IMP-1 to IMP-3'
      likely_files:
        - 'src/main/editor/model/kernel-bridge.js'
        - 'src/main/editor/layers.json'
        - 'src/main/editor/unsorted/'
      acceptance_criteria:
        - 'The part has exactly the lines of its row and nothing else, and the assembled page is byte for byte the committed one.'
      verification:
        - 'node scripts/build-editor.mjs --map'
        - 'node scripts/build-editor.mjs --check'
        - 'node scripts/build-editor.mjs --check-identical HEAD'
        - 'node scripts/check-editor.mjs --layers'
        - 'npm run lint'
        - 'npm run format:check'
        - 'sha256sum of the page starts a653717d5564c237'
      escalation_triggers:
        - 'Any check fails: restore the unsorted files and layers.json from HEAD and delete the new part file, each by path (no git stash, no checkout of the folder, no text edit to fit), log the failing command and its first line, stop the run.'
        - '--map differs from the range: the page changed since ASM-1, stop.'
      suggested_subagent_type: 'general-purpose'
      suggested_model: '(default)'
      suggested_effort: 'medium'
    - task_id: task-007
      agent_role: 'Refactoring Agent'
      objective: 'Cut row 33 of 0182 DEC-4 (355 lines in the table) from the unsorted file that holds it into src/main/editor/model/form-validation.js with the text unchanged, leave the rest in unsorted/from-<next row>.js files in page order (a file left empty is deleted), register all in layers.json in page order.'
      context:
        prd_excerpts:
          - 'W7-1 of the TDD traceability'
          - 'W7-2 of the TDD traceability'
          - 'W7-5 of the TDD traceability'
        tdd_excerpts:
          - 'DEC-1'
          - 'DEC-2'
          - 'DEC-3'
          - 'DEC-8'
          - 'CON-1'
          - 'CON-3'
          - 'FLOW-1'
          - 'IMP-1 to IMP-3'
      likely_files:
        - 'src/main/editor/model/form-validation.js'
        - 'src/main/editor/layers.json'
        - 'src/main/editor/unsorted/'
      acceptance_criteria:
        - 'The part has exactly the lines of its row and nothing else, and the assembled page is byte for byte the committed one.'
      verification:
        - 'node scripts/build-editor.mjs --map'
        - 'node scripts/build-editor.mjs --check'
        - 'node scripts/build-editor.mjs --check-identical HEAD'
        - 'node scripts/check-editor.mjs --layers'
        - 'npm run lint'
        - 'npm run format:check'
        - 'sha256sum of the page starts a653717d5564c237'
      escalation_triggers:
        - 'Any check fails: restore the unsorted files and layers.json from HEAD and delete the new part file, each by path (no git stash, no checkout of the folder, no text edit to fit), log the failing command and its first line, stop the run.'
        - '--map differs from the range: the page changed since ASM-1, stop.'
      suggested_subagent_type: 'general-purpose'
      suggested_model: '(default)'
      suggested_effort: 'medium'
    - task_id: task-008
      agent_role: 'Refactoring Agent'
      objective: 'Cut row 31 of 0182 DEC-4 (700 lines in the table) from the unsorted file that holds it into src/main/editor/persistence/save.js with the text unchanged, leave the rest in unsorted/from-<next row>.js files in page order (a file left empty is deleted), register all in layers.json in page order.'
      context:
        prd_excerpts:
          - 'W7-1 of the TDD traceability'
          - 'W7-2 of the TDD traceability'
          - 'W7-5 of the TDD traceability'
        tdd_excerpts:
          - 'DEC-1'
          - 'DEC-2'
          - 'DEC-3'
          - 'DEC-8'
          - 'CON-1'
          - 'CON-3'
          - 'FLOW-1'
          - 'IMP-1 to IMP-3'
      likely_files:
        - 'src/main/editor/persistence/save.js'
        - 'src/main/editor/layers.json'
        - 'src/main/editor/unsorted/'
      acceptance_criteria:
        - 'The part has exactly the lines of its row and nothing else, and the assembled page is byte for byte the committed one.'
      verification:
        - 'node scripts/build-editor.mjs --map'
        - 'node scripts/build-editor.mjs --check'
        - 'node scripts/build-editor.mjs --check-identical HEAD'
        - 'node scripts/check-editor.mjs --layers'
        - 'npm run lint'
        - 'npm run format:check'
        - 'sha256sum of the page starts a653717d5564c237'
      escalation_triggers:
        - 'Any check fails: restore the unsorted files and layers.json from HEAD and delete the new part file, each by path (no git stash, no checkout of the folder, no text edit to fit), log the failing command and its first line, stop the run.'
        - '--map differs from the range: the page changed since ASM-1, stop.'
      suggested_subagent_type: 'general-purpose'
      suggested_model: '(default)'
      suggested_effort: 'medium'
    - task_id: task-009
      agent_role: 'Refactoring Agent'
      objective: 'Cut row 29 of 0182 DEC-4 (134 lines in the table) from the unsorted file that holds it into src/main/editor/model/record-lookup.js with the text unchanged, leave the rest in unsorted/from-<next row>.js files in page order (a file left empty is deleted), register all in layers.json in page order.'
      context:
        prd_excerpts:
          - 'W7-1 of the TDD traceability'
          - 'W7-2 of the TDD traceability'
          - 'W7-5 of the TDD traceability'
        tdd_excerpts:
          - 'DEC-1'
          - 'DEC-2'
          - 'DEC-3'
          - 'DEC-8'
          - 'CON-1'
          - 'CON-3'
          - 'FLOW-1'
          - 'IMP-1 to IMP-3'
      likely_files:
        - 'src/main/editor/model/record-lookup.js'
        - 'src/main/editor/layers.json'
        - 'src/main/editor/unsorted/'
      acceptance_criteria:
        - 'The part has exactly the lines of its row and nothing else, and the assembled page is byte for byte the committed one.'
      verification:
        - 'node scripts/build-editor.mjs --map'
        - 'node scripts/build-editor.mjs --check'
        - 'node scripts/build-editor.mjs --check-identical HEAD'
        - 'node scripts/check-editor.mjs --layers'
        - 'npm run lint'
        - 'npm run format:check'
        - 'sha256sum of the page starts a653717d5564c237'
      escalation_triggers:
        - 'Any check fails: restore the unsorted files and layers.json from HEAD and delete the new part file, each by path (no git stash, no checkout of the folder, no text edit to fit), log the failing command and its first line, stop the run.'
        - '--map differs from the range: the page changed since ASM-1, stop.'
      suggested_subagent_type: 'general-purpose'
      suggested_model: '(default)'
      suggested_effort: 'medium'
    - task_id: task-010
      agent_role: 'Refactoring Agent'
      objective: 'Cut row 25 of 0182 DEC-4 (12 lines in the table) from the unsorted file that holds it into src/main/editor/core/escape-html.js with the text unchanged, leave the rest in unsorted/from-<next row>.js files in page order (a file left empty is deleted), register all in layers.json in page order.'
      context:
        prd_excerpts:
          - 'W7-1 of the TDD traceability'
          - 'W7-2 of the TDD traceability'
          - 'W7-5 of the TDD traceability'
        tdd_excerpts:
          - 'DEC-1'
          - 'DEC-2'
          - 'DEC-3'
          - 'DEC-8'
          - 'CON-1'
          - 'CON-3'
          - 'FLOW-1'
          - 'IMP-1 to IMP-3'
      likely_files:
        - 'src/main/editor/core/escape-html.js'
        - 'src/main/editor/layers.json'
        - 'src/main/editor/unsorted/'
      acceptance_criteria:
        - 'The part has exactly the lines of its row and nothing else, and the assembled page is byte for byte the committed one.'
      verification:
        - 'node scripts/build-editor.mjs --map'
        - 'node scripts/build-editor.mjs --check'
        - 'node scripts/build-editor.mjs --check-identical HEAD'
        - 'node scripts/check-editor.mjs --layers'
        - 'npm run lint'
        - 'npm run format:check'
        - 'sha256sum of the page starts a653717d5564c237'
      escalation_triggers:
        - 'Any check fails: restore the unsorted files and layers.json from HEAD and delete the new part file, each by path (no git stash, no checkout of the folder, no text edit to fit), log the failing command and its first line, stop the run.'
        - '--map differs from the range: the page changed since ASM-1, stop.'
      suggested_subagent_type: 'general-purpose'
      suggested_model: '(default)'
      suggested_effort: 'medium'
    - task_id: task-011
      agent_role: 'Refactoring Agent'
      objective: 'Cut row 23 of 0182 DEC-4 (363 lines in the table) from the unsorted file that holds it into src/main/editor/persistence/folder-access.js with the text unchanged, leave the rest in unsorted/from-<next row>.js files in page order (a file left empty is deleted), register all in layers.json in page order.'
      context:
        prd_excerpts:
          - 'W7-1 of the TDD traceability'
          - 'W7-2 of the TDD traceability'
          - 'W7-5 of the TDD traceability'
        tdd_excerpts:
          - 'DEC-1'
          - 'DEC-2'
          - 'DEC-3'
          - 'DEC-8'
          - 'CON-1'
          - 'CON-3'
          - 'FLOW-1'
          - 'IMP-1 to IMP-3'
      likely_files:
        - 'src/main/editor/persistence/folder-access.js'
        - 'src/main/editor/layers.json'
        - 'src/main/editor/unsorted/'
      acceptance_criteria:
        - 'The part has exactly the lines of its row and nothing else, and the assembled page is byte for byte the committed one.'
      verification:
        - 'node scripts/build-editor.mjs --map'
        - 'node scripts/build-editor.mjs --check'
        - 'node scripts/build-editor.mjs --check-identical HEAD'
        - 'node scripts/check-editor.mjs --layers'
        - 'npm run lint'
        - 'npm run format:check'
        - 'sha256sum of the page starts a653717d5564c237'
      escalation_triggers:
        - 'Any check fails: restore the unsorted files and layers.json from HEAD and delete the new part file, each by path (no git stash, no checkout of the folder, no text edit to fit), log the failing command and its first line, stop the run.'
        - '--map differs from the range: the page changed since ASM-1, stop.'
      suggested_subagent_type: 'general-purpose'
      suggested_model: '(default)'
      suggested_effort: 'medium'
    - task_id: task-012
      agent_role: 'Refactoring Agent'
      objective: 'Cut row 22 of 0182 DEC-4 (252 lines in the table) from the unsorted file that holds it into src/main/editor/persistence/workspace-loading.js with the text unchanged, leave the rest in unsorted/from-<next row>.js files in page order (a file left empty is deleted), register all in layers.json in page order.'
      context:
        prd_excerpts:
          - 'W7-1 of the TDD traceability'
          - 'W7-2 of the TDD traceability'
          - 'W7-5 of the TDD traceability'
        tdd_excerpts:
          - 'DEC-1'
          - 'DEC-2'
          - 'DEC-3'
          - 'DEC-8'
          - 'CON-1'
          - 'CON-3'
          - 'FLOW-1'
          - 'IMP-1 to IMP-3'
      likely_files:
        - 'src/main/editor/persistence/workspace-loading.js'
        - 'src/main/editor/layers.json'
        - 'src/main/editor/unsorted/'
      acceptance_criteria:
        - 'The part has exactly the lines of its row and nothing else, and the assembled page is byte for byte the committed one.'
      verification:
        - 'node scripts/build-editor.mjs --map'
        - 'node scripts/build-editor.mjs --check'
        - 'node scripts/build-editor.mjs --check-identical HEAD'
        - 'node scripts/check-editor.mjs --layers'
        - 'npm run lint'
        - 'npm run format:check'
        - 'sha256sum of the page starts a653717d5564c237'
      escalation_triggers:
        - 'Any check fails: restore the unsorted files and layers.json from HEAD and delete the new part file, each by path (no git stash, no checkout of the folder, no text edit to fit), log the failing command and its first line, stop the run.'
        - '--map differs from the range: the page changed since ASM-1, stop.'
      suggested_subagent_type: 'general-purpose'
      suggested_model: '(default)'
      suggested_effort: 'medium'
    - task_id: task-013
      agent_role: 'Refactoring Agent'
      objective: 'Cut row 21 of 0182 DEC-4 (442 lines in the table) from the unsorted file that holds it into src/main/editor/core/read-schema.js with the text unchanged, leave the rest in unsorted/from-<next row>.js files in page order (a file left empty is deleted), register all in layers.json in page order.'
      context:
        prd_excerpts:
          - 'W7-1 of the TDD traceability'
          - 'W7-2 of the TDD traceability'
          - 'W7-5 of the TDD traceability'
        tdd_excerpts:
          - 'DEC-1'
          - 'DEC-2'
          - 'DEC-3'
          - 'DEC-8'
          - 'CON-1'
          - 'CON-3'
          - 'FLOW-1'
          - 'IMP-1 to IMP-3'
      likely_files:
        - 'src/main/editor/core/read-schema.js'
        - 'src/main/editor/layers.json'
        - 'src/main/editor/unsorted/'
      acceptance_criteria:
        - 'The part has exactly the lines of its row and nothing else, and the assembled page is byte for byte the committed one.'
      verification:
        - 'node scripts/build-editor.mjs --map'
        - 'node scripts/build-editor.mjs --check'
        - 'node scripts/build-editor.mjs --check-identical HEAD'
        - 'node scripts/check-editor.mjs --layers'
        - 'npm run lint'
        - 'npm run format:check'
        - 'sha256sum of the page starts a653717d5564c237'
      escalation_triggers:
        - 'Any check fails: restore the unsorted files and layers.json from HEAD and delete the new part file, each by path (no git stash, no checkout of the folder, no text edit to fit), log the failing command and its first line, stop the run.'
        - '--map differs from the range: the page changed since ASM-1, stop.'
      suggested_subagent_type: 'general-purpose'
      suggested_model: '(default)'
      suggested_effort: 'medium'
    - task_id: task-014
      agent_role: 'Test Generation Agent'
      objective: 'Change yaml-parts.test.js at the four places of R-1 so that the rule is: every top-level name the six YAML parts name outside themselves is declared in a part of layer core, read from layers.json; the probe test finds unsorted functions from the parts of layer unsorted; rename the first test; commit as test:.'
      context:
        prd_excerpts:
          - 'W7-5 of the TDD traceability'
          - 'W7-6 of the TDD traceability'
        tdd_excerpts:
          - 'DEC-7'
          - 'CTR-4'
          - 'IMP-4'
      likely_files:
        - 'src/test/javascript/editor-build/yaml-parts.test.js'
      acceptance_criteria:
        - 'The objective is met and its verification passes.'
      verification:
        - 'node --test on the changed file, on the page before and after the relocation it prepares'
        - 'npm run lint'
        - 'npm run format:check'
      escalation_triggers:
        - 'The test cannot be made to pass without changing a decision of the TDD.'
      suggested_subagent_type: 'general-purpose'
      suggested_model: '(default)'
      suggested_effort: 'medium'
    - task_id: task-015
      agent_role: 'Test Generation Agent'
      objective: 'In check-editor.test.js make the test --cut on the real page read the page of af1ed2d with execFileSync git show (no shell), call cutCounts, assert 311, 162 and 100, rename it to say the page of af1ed2d; run it before and after; commit as test:.'
      context:
        prd_excerpts:
          - 'W7-3 of the TDD traceability'
          - 'W7-5 of the TDD traceability'
        tdd_excerpts:
          - 'DEC-5'
          - 'CTR-4'
          - 'IMP-4'
      likely_files:
        - 'src/test/javascript/editor-build/check-editor.test.js'
      acceptance_criteria:
        - 'The objective is met and its verification passes.'
      verification:
        - 'node --test on the changed file, on the page before and after the relocation it prepares'
        - 'npm run lint'
        - 'npm run format:check'
      escalation_triggers:
        - 'The test cannot be made to pass without changing a decision of the TDD.'
      suggested_subagent_type: 'general-purpose'
      suggested_model: '(default)'
      suggested_effort: 'medium'
    - task_id: task-016
      agent_role: 'Refactoring Agent'
      objective: 'Take the declaration of REMOVED_PLATEAUS_KEY with the comment line above it (five lines, page lines 5126-5130) out of the unsorted file that holds row 9 and append it after a blank line to core/read-schema.js; build the page, check with --statements, run the node suite, commit as refactor: relocate with the page.'
      context:
        prd_excerpts:
          - 'W7-2 of the TDD traceability'
          - 'W7-4 of the TDD traceability'
        tdd_excerpts:
          - 'DEC-2'
          - 'DEC-4'
          - 'DEC-8'
          - 'FLOW-2'
      likely_files:
        - 'src/main/editor/core/read-schema.js'
        - 'src/main/editor/layers.json'
        - 'src/main/editor/unsorted/'
        - 'src/main/resources/editor-webapp/standalone.html'
      acceptance_criteria:
        - 'The declarations and comments of the page of HEAD are all there, the load order holds, upward pairs stay 0 and the node suite is green.'
      verification:
        - 'npm run editor:build'
        - 'node scripts/check-editor.mjs --statements HEAD'
        - 'node scripts/check-editor.mjs --layers'
        - 'npm run lint'
        - 'npm run format:check'
        - 'npm run test:unit'
      escalation_triggers:
        - '--statements fails or the load order fails: revert by path; a group is regrouped, an initializer is never edited.'
        - 'The node suite fails: re-run the failing file on the parent in a scratch worktree; passing there means the relocation is wrong.'
      suggested_subagent_type: 'general-purpose'
      suggested_model: '(default)'
      suggested_effort: 'medium'
    - task_id: task-017
      agent_role: 'Refactoring Agent'
      objective: 'Cut row 20 of 0182 DEC-4 (180 lines in the table) from the unsorted file that holds it into src/main/editor/model/index-builder.js with the text unchanged, leave the rest in unsorted/from-<next row>.js files in page order (a file left empty is deleted), register all in layers.json in page order. The page lines are 5 earlier than the table after the key relocation (R-2); take the ranges from --map.'
      context:
        prd_excerpts:
          - 'W7-1 of the TDD traceability'
          - 'W7-2 of the TDD traceability'
          - 'W7-5 of the TDD traceability'
        tdd_excerpts:
          - 'DEC-1'
          - 'DEC-2'
          - 'DEC-3'
          - 'DEC-8'
          - 'CON-1'
          - 'CON-3'
          - 'FLOW-1'
          - 'IMP-1 to IMP-3'
      likely_files:
        - 'src/main/editor/model/index-builder.js'
        - 'src/main/editor/layers.json'
        - 'src/main/editor/unsorted/'
      acceptance_criteria:
        - 'The part has exactly the lines of its row and nothing else, and the assembled page is byte for byte the committed one.'
      verification:
        - 'node scripts/build-editor.mjs --map'
        - 'node scripts/build-editor.mjs --check'
        - 'node scripts/build-editor.mjs --check-identical HEAD'
        - 'node scripts/check-editor.mjs --layers'
        - 'npm run lint'
        - 'npm run format:check'
        - 'sha256sum of the page starts a653717d5564c237'
      escalation_triggers:
        - 'Any check fails: restore the unsorted files and layers.json from HEAD and delete the new part file, each by path (no git stash, no checkout of the folder, no text edit to fit), log the failing command and its first line, stop the run.'
        - '--map differs from the range: the page changed since ASM-1, stop.'
      suggested_subagent_type: 'general-purpose'
      suggested_model: '(default)'
      suggested_effort: 'medium'
    - task_id: task-018
      agent_role: 'Refactoring Agent'
      objective: 'Cut row 14 of 0182 DEC-4 (74 lines in the table) from the unsorted file that holds it into src/main/editor/model/origin-and-cascade.js with the text unchanged, leave the rest in unsorted/from-<next row>.js files in page order (a file left empty is deleted), register all in layers.json in page order. The page lines are 5 earlier than the table after the key relocation (R-2); take the ranges from --map.'
      context:
        prd_excerpts:
          - 'W7-1 of the TDD traceability'
          - 'W7-2 of the TDD traceability'
          - 'W7-5 of the TDD traceability'
        tdd_excerpts:
          - 'DEC-1'
          - 'DEC-2'
          - 'DEC-3'
          - 'DEC-8'
          - 'CON-1'
          - 'CON-3'
          - 'FLOW-1'
          - 'IMP-1 to IMP-3'
      likely_files:
        - 'src/main/editor/model/origin-and-cascade.js'
        - 'src/main/editor/layers.json'
        - 'src/main/editor/unsorted/'
      acceptance_criteria:
        - 'The part has exactly the lines of its row and nothing else, and the assembled page is byte for byte the committed one.'
      verification:
        - 'node scripts/build-editor.mjs --map'
        - 'node scripts/build-editor.mjs --check'
        - 'node scripts/build-editor.mjs --check-identical HEAD'
        - 'node scripts/check-editor.mjs --layers'
        - 'npm run lint'
        - 'npm run format:check'
        - 'sha256sum of the page starts a653717d5564c237'
      escalation_triggers:
        - 'Any check fails: restore the unsorted files and layers.json from HEAD and delete the new part file, each by path (no git stash, no checkout of the folder, no text edit to fit), log the failing command and its first line, stop the run.'
        - '--map differs from the range: the page changed since ASM-1, stop.'
      suggested_subagent_type: 'general-purpose'
      suggested_model: '(default)'
      suggested_effort: 'medium'
    - task_id: task-019
      agent_role: 'Refactoring Agent'
      objective: 'Cut row 13 of 0182 DEC-4 (591 lines in the table) from the unsorted file that holds it into src/main/editor/model/layer-loader.js with the text unchanged, leave the rest in unsorted/from-<next row>.js files in page order (a file left empty is deleted), register all in layers.json in page order. The page lines are 5 earlier than the table after the key relocation (R-2); take the ranges from --map.'
      context:
        prd_excerpts:
          - 'W7-1 of the TDD traceability'
          - 'W7-2 of the TDD traceability'
          - 'W7-5 of the TDD traceability'
        tdd_excerpts:
          - 'DEC-1'
          - 'DEC-2'
          - 'DEC-3'
          - 'DEC-8'
          - 'CON-1'
          - 'CON-3'
          - 'FLOW-1'
          - 'IMP-1 to IMP-3'
      likely_files:
        - 'src/main/editor/model/layer-loader.js'
        - 'src/main/editor/layers.json'
        - 'src/main/editor/unsorted/'
      acceptance_criteria:
        - 'The part has exactly the lines of its row and nothing else, and the assembled page is byte for byte the committed one.'
      verification:
        - 'node scripts/build-editor.mjs --map'
        - 'node scripts/build-editor.mjs --check'
        - 'node scripts/build-editor.mjs --check-identical HEAD'
        - 'node scripts/check-editor.mjs --layers'
        - 'npm run lint'
        - 'npm run format:check'
        - 'sha256sum of the page starts a653717d5564c237'
      escalation_triggers:
        - 'Any check fails: restore the unsorted files and layers.json from HEAD and delete the new part file, each by path (no git stash, no checkout of the folder, no text edit to fit), log the failing command and its first line, stop the run.'
        - '--map differs from the range: the page changed since ASM-1, stop.'
      suggested_subagent_type: 'general-purpose'
      suggested_model: '(default)'
      suggested_effort: 'medium'
    - task_id: task-020
      agent_role: 'Refactoring Agent'
      objective: 'Cut row 12 of 0182 DEC-4 (265 lines in the table) from the unsorted file that holds it into src/main/editor/model/plateau-tree.js with the text unchanged, leave the rest in unsorted/from-<next row>.js files in page order (a file left empty is deleted), register all in layers.json in page order. The page lines are 5 earlier than the table after the key relocation (R-2); take the ranges from --map.'
      context:
        prd_excerpts:
          - 'W7-1 of the TDD traceability'
          - 'W7-2 of the TDD traceability'
          - 'W7-5 of the TDD traceability'
        tdd_excerpts:
          - 'DEC-1'
          - 'DEC-2'
          - 'DEC-3'
          - 'DEC-8'
          - 'CON-1'
          - 'CON-3'
          - 'FLOW-1'
          - 'IMP-1 to IMP-3'
      likely_files:
        - 'src/main/editor/model/plateau-tree.js'
        - 'src/main/editor/layers.json'
        - 'src/main/editor/unsorted/'
      acceptance_criteria:
        - 'The part has exactly the lines of its row and nothing else, and the assembled page is byte for byte the committed one.'
      verification:
        - 'node scripts/build-editor.mjs --map'
        - 'node scripts/build-editor.mjs --check'
        - 'node scripts/build-editor.mjs --check-identical HEAD'
        - 'node scripts/check-editor.mjs --layers'
        - 'npm run lint'
        - 'npm run format:check'
        - 'sha256sum of the page starts a653717d5564c237'
      escalation_triggers:
        - 'Any check fails: restore the unsorted files and layers.json from HEAD and delete the new part file, each by path (no git stash, no checkout of the folder, no text edit to fit), log the failing command and its first line, stop the run.'
        - '--map differs from the range: the page changed since ASM-1, stop.'
      suggested_subagent_type: 'general-purpose'
      suggested_model: '(default)'
      suggested_effort: 'medium'
    - task_id: task-021
      agent_role: 'Refactoring Agent'
      objective: 'Cut row 11 of 0182 DEC-4 (123 lines in the table) from the unsorted file that holds it into src/main/editor/model/element-index.js with the text unchanged, leave the rest in unsorted/from-<next row>.js files in page order (a file left empty is deleted), register all in layers.json in page order. The page lines are 5 earlier than the table after the key relocation (R-2); take the ranges from --map.'
      context:
        prd_excerpts:
          - 'W7-1 of the TDD traceability'
          - 'W7-2 of the TDD traceability'
          - 'W7-5 of the TDD traceability'
        tdd_excerpts:
          - 'DEC-1'
          - 'DEC-2'
          - 'DEC-3'
          - 'DEC-8'
          - 'CON-1'
          - 'CON-3'
          - 'FLOW-1'
          - 'IMP-1 to IMP-3'
      likely_files:
        - 'src/main/editor/model/element-index.js'
        - 'src/main/editor/layers.json'
        - 'src/main/editor/unsorted/'
      acceptance_criteria:
        - 'The part has exactly the lines of its row and nothing else, and the assembled page is byte for byte the committed one.'
      verification:
        - 'node scripts/build-editor.mjs --map'
        - 'node scripts/build-editor.mjs --check'
        - 'node scripts/build-editor.mjs --check-identical HEAD'
        - 'node scripts/check-editor.mjs --layers'
        - 'npm run lint'
        - 'npm run format:check'
        - 'sha256sum of the page starts a653717d5564c237'
      escalation_triggers:
        - 'Any check fails: restore the unsorted files and layers.json from HEAD and delete the new part file, each by path (no git stash, no checkout of the folder, no text edit to fit), log the failing command and its first line, stop the run.'
        - '--map differs from the range: the page changed since ASM-1, stop.'
      suggested_subagent_type: 'general-purpose'
      suggested_model: '(default)'
      suggested_effort: 'medium'
    - task_id: task-022
      agent_role: 'Refactoring Agent'
      objective: 'Cut row 10 of 0182 DEC-4 (28 lines in the table) from the unsorted file that holds it into src/main/editor/core/manifest-kinds.js with the text unchanged, leave the rest in unsorted/from-<next row>.js files in page order (a file left empty is deleted), register all in layers.json in page order. The page lines are 5 earlier than the table after the key relocation (R-2); take the ranges from --map.'
      context:
        prd_excerpts:
          - 'W7-1 of the TDD traceability'
          - 'W7-2 of the TDD traceability'
          - 'W7-5 of the TDD traceability'
        tdd_excerpts:
          - 'DEC-1'
          - 'DEC-2'
          - 'DEC-3'
          - 'DEC-8'
          - 'CON-1'
          - 'CON-3'
          - 'FLOW-1'
          - 'IMP-1 to IMP-3'
      likely_files:
        - 'src/main/editor/core/manifest-kinds.js'
        - 'src/main/editor/layers.json'
        - 'src/main/editor/unsorted/'
      acceptance_criteria:
        - 'The part has exactly the lines of its row and nothing else, and the assembled page is byte for byte the committed one.'
      verification:
        - 'node scripts/build-editor.mjs --map'
        - 'node scripts/build-editor.mjs --check'
        - 'node scripts/build-editor.mjs --check-identical HEAD'
        - 'node scripts/check-editor.mjs --layers'
        - 'npm run lint'
        - 'npm run format:check'
        - 'sha256sum of the page starts a653717d5564c237'
      escalation_triggers:
        - 'Any check fails: restore the unsorted files and layers.json from HEAD and delete the new part file, each by path (no git stash, no checkout of the folder, no text edit to fit), log the failing command and its first line, stop the run.'
        - '--map differs from the range: the page changed since ASM-1, stop.'
      suggested_subagent_type: 'general-purpose'
      suggested_model: '(default)'
      suggested_effort: 'medium'
    - task_id: task-023
      agent_role: 'Refactoring Agent'
      objective: 'Cut row 9 of 0182 DEC-4 (297 lines in the table) from the unsorted file that holds it into src/main/editor/model/settings.js with the text unchanged, leave the rest in unsorted/from-<next row>.js files in page order (a file left empty is deleted), register all in layers.json in page order. Row 9 is 297 lines after the key left it (R-2); take the ranges from build-editor.mjs --map and not from the table.'
      context:
        prd_excerpts:
          - 'W7-1 of the TDD traceability'
          - 'W7-2 of the TDD traceability'
          - 'W7-5 of the TDD traceability'
        tdd_excerpts:
          - 'DEC-1'
          - 'DEC-2'
          - 'DEC-3'
          - 'DEC-8'
          - 'CON-1'
          - 'CON-3'
          - 'FLOW-1'
          - 'IMP-1 to IMP-3'
      likely_files:
        - 'src/main/editor/model/settings.js'
        - 'src/main/editor/layers.json'
        - 'src/main/editor/unsorted/'
      acceptance_criteria:
        - 'The part has exactly the lines of its row and nothing else, and the assembled page is byte for byte the committed one.'
      verification:
        - 'node scripts/build-editor.mjs --map'
        - 'node scripts/build-editor.mjs --check'
        - 'node scripts/build-editor.mjs --check-identical HEAD'
        - 'node scripts/check-editor.mjs --layers'
        - 'npm run lint'
        - 'npm run format:check'
        - 'sha256sum of the page starts a653717d5564c237'
      escalation_triggers:
        - 'Any check fails: restore the unsorted files and layers.json from HEAD and delete the new part file, each by path (no git stash, no checkout of the folder, no text edit to fit), log the failing command and its first line, stop the run.'
        - '--map differs from the range: the page changed since ASM-1, stop.'
      suggested_subagent_type: 'general-purpose'
      suggested_model: '(default)'
      suggested_effort: 'medium'
    - task_id: task-024
      agent_role: 'Refactoring Agent'
      objective: 'Cut row 8 of 0182 DEC-4 (103 lines in the table) from the unsorted file that holds it into src/main/editor/model/app-state.js with the text unchanged, leave the rest in unsorted/from-<next row>.js files in page order (a file left empty is deleted), register all in layers.json in page order.'
      context:
        prd_excerpts:
          - 'W7-1 of the TDD traceability'
          - 'W7-2 of the TDD traceability'
          - 'W7-5 of the TDD traceability'
        tdd_excerpts:
          - 'DEC-1'
          - 'DEC-2'
          - 'DEC-3'
          - 'DEC-8'
          - 'CON-1'
          - 'CON-3'
          - 'FLOW-1'
          - 'IMP-1 to IMP-3'
      likely_files:
        - 'src/main/editor/model/app-state.js'
        - 'src/main/editor/layers.json'
        - 'src/main/editor/unsorted/'
      acceptance_criteria:
        - 'The part has exactly the lines of its row and nothing else, and the assembled page is byte for byte the committed one.'
      verification:
        - 'node scripts/build-editor.mjs --map'
        - 'node scripts/build-editor.mjs --check'
        - 'node scripts/build-editor.mjs --check-identical HEAD'
        - 'node scripts/check-editor.mjs --layers'
        - 'npm run lint'
        - 'npm run format:check'
        - 'sha256sum of the page starts a653717d5564c237'
      escalation_triggers:
        - 'Any check fails: restore the unsorted files and layers.json from HEAD and delete the new part file, each by path (no git stash, no checkout of the folder, no text edit to fit), log the failing command and its first line, stop the run.'
        - '--map differs from the range: the page changed since ASM-1, stop.'
      suggested_subagent_type: 'general-purpose'
      suggested_model: '(default)'
      suggested_effort: 'medium'
    - task_id: task-025
      agent_role: 'Refactoring Agent'
      objective: 'Cut row 7 of 0182 DEC-4 (430 lines in the table) from the unsorted file that holds it into src/main/editor/persistence/remembered-folders.js with the text unchanged, leave the rest in unsorted/from-<next row>.js files in page order (a file left empty is deleted), register all in layers.json in page order.'
      context:
        prd_excerpts:
          - 'W7-1 of the TDD traceability'
          - 'W7-2 of the TDD traceability'
          - 'W7-5 of the TDD traceability'
        tdd_excerpts:
          - 'DEC-1'
          - 'DEC-2'
          - 'DEC-3'
          - 'DEC-8'
          - 'CON-1'
          - 'CON-3'
          - 'FLOW-1'
          - 'IMP-1 to IMP-3'
      likely_files:
        - 'src/main/editor/persistence/remembered-folders.js'
        - 'src/main/editor/layers.json'
        - 'src/main/editor/unsorted/'
      acceptance_criteria:
        - 'The part has exactly the lines of its row and nothing else, and the assembled page is byte for byte the committed one.'
      verification:
        - 'node scripts/build-editor.mjs --map'
        - 'node scripts/build-editor.mjs --check'
        - 'node scripts/build-editor.mjs --check-identical HEAD'
        - 'node scripts/check-editor.mjs --layers'
        - 'npm run lint'
        - 'npm run format:check'
        - 'sha256sum of the page starts a653717d5564c237'
      escalation_triggers:
        - 'Any check fails: restore the unsorted files and layers.json from HEAD and delete the new part file, each by path (no git stash, no checkout of the folder, no text edit to fit), log the failing command and its first line, stop the run.'
        - '--map differs from the range: the page changed since ASM-1, stop.'
      suggested_subagent_type: 'general-purpose'
      suggested_model: '(default)'
      suggested_effort: 'medium'
    - task_id: task-026
      agent_role: 'QA Agent'
      objective: 'Run the whole node suite and the two Java classes that read the markers after the twenty moves and the key (R-4).'
      context:
        prd_excerpts:
          - 'W7-3 of the TDD traceability'
        tdd_excerpts:
          - 'DEC-8'
          - 'FLOW-3'
          - 'ASM-5'
      likely_files:
        - 'docs/wav/wav-024-fixes-and-editor-modules/run/run-0185-editor-extract-model-and-kernel/prg-0185-editor-extract-model-and-kernel.md'
      acceptance_criteria:
        - 'The objective is met and its verification passes.'
      verification:
        - 'npm run test:unit'
        - './mvnw -Dtest=EditorReadSchemaTest,GuideViewPropertiesTest test (JDK 25)'
        - 'git status'
      escalation_triggers:
        - 'A check fails: log the command and its first line; the coverage floor is never lowered in this run.'
      suggested_subagent_type: 'general-purpose'
      suggested_model: '(default)'
      suggested_effort: 'medium'
    - task_id: task-027
      agent_role: 'Test Generation Agent'
      objective: 'In editor-odds-and-ends.test.js make the slice for diagramCacheKey end at the end of the function (HTML.indexOf of newline brace newline, plus 3) and no longer at let treeQuietCache; run it before and after; commit as test:.'
      context:
        prd_excerpts:
          - 'W7-3 of the TDD traceability'
          - 'W7-5 of the TDD traceability'
        tdd_excerpts:
          - 'DEC-5'
          - 'CTR-4'
          - 'IMP-4'
      likely_files:
        - 'src/test/javascript/viewpoint-kernel/editor-odds-and-ends.test.js'
      acceptance_criteria:
        - 'The objective is met and its verification passes.'
      verification:
        - 'node --test on the changed file, on the page before and after the relocation it prepares'
        - 'npm run lint'
        - 'npm run format:check'
      escalation_triggers:
        - 'The test cannot be made to pass without changing a decision of the TDD.'
      suggested_subagent_type: 'general-purpose'
      suggested_model: '(default)'
      suggested_effort: 'medium'
    - task_id: task-028
      agent_role: 'Refactoring Agent'
      objective: 'Relocate the 11 names of group 1 (page registry and shell: rows 26 and 28) with the comment lines directly above each declaration, in page order, one blank line between, to model/ui-state.js (creates the file); ui-state sits between unsorted/from-26.js and model/record-lookup.js in layers.json (DEC-6); check that none of the 19 coverage markers is among the lines taken; --statements, --layers, lint, format check, node suite; commit as refactor: relocate with the page.'
      context:
        prd_excerpts:
          - 'W7-1 of the TDD traceability'
          - 'W7-2 of the TDD traceability'
          - 'W7-6 of the TDD traceability'
        tdd_excerpts:
          - 'DEC-4'
          - 'DEC-6'
          - 'DEC-8'
          - 'FLOW-3'
          - 'RISK-3'
          - 'RISK-7'
      likely_files:
        - 'src/main/editor/model/ui-state.js'
        - 'src/main/editor/layers.json'
        - 'src/main/editor/unsorted/'
        - 'src/main/resources/editor-webapp/standalone.html'
      acceptance_criteria:
        - 'The declarations and comments of the page of HEAD are all there, the load order holds, upward pairs stay 0 and the node suite is green.'
      verification:
        - 'npm run editor:build'
        - 'node scripts/check-editor.mjs --statements HEAD'
        - 'node scripts/check-editor.mjs --layers'
        - 'npm run lint'
        - 'npm run format:check'
        - 'npm run test:unit'
      escalation_triggers:
        - '--statements fails or the load order fails: revert by path; a group is regrouped, an initializer is never edited.'
        - 'The node suite fails: re-run the failing file on the parent in a scratch worktree; passing there means the relocation is wrong.'
      suggested_subagent_type: 'general-purpose'
      suggested_model: '(default)'
      suggested_effort: 'medium'
    - task_id: task-029
      agent_role: 'Refactoring Agent'
      objective: 'Relocate the 11 names of group 2 (panels: rows 35, 36, 40, 41, 42, 48, 53, 57) with the comment lines directly above each declaration, in page order, one blank line between, to model/ui-state.js; ui-state sits between unsorted/from-26.js and model/record-lookup.js in layers.json (DEC-6); check that none of the 19 coverage markers is among the lines taken; --statements, --layers, lint, format check, node suite; commit as refactor: relocate with the page.'
      context:
        prd_excerpts:
          - 'W7-1 of the TDD traceability'
          - 'W7-2 of the TDD traceability'
          - 'W7-6 of the TDD traceability'
        tdd_excerpts:
          - 'DEC-4'
          - 'DEC-6'
          - 'DEC-8'
          - 'FLOW-3'
          - 'RISK-3'
          - 'RISK-7'
      likely_files:
        - 'src/main/editor/model/ui-state.js'
        - 'src/main/editor/layers.json'
        - 'src/main/editor/unsorted/'
        - 'src/main/resources/editor-webapp/standalone.html'
      acceptance_criteria:
        - 'The declarations and comments of the page of HEAD are all there, the load order holds, upward pairs stay 0 and the node suite is green.'
      verification:
        - 'npm run editor:build'
        - 'node scripts/check-editor.mjs --statements HEAD'
        - 'node scripts/check-editor.mjs --layers'
        - 'npm run lint'
        - 'npm run format:check'
        - 'npm run test:unit'
      escalation_triggers:
        - '--statements fails or the load order fails: revert by path; a group is regrouped, an initializer is never edited.'
        - 'The node suite fails: re-run the failing file on the parent in a scratch worktree; passing there means the relocation is wrong.'
      suggested_subagent_type: 'general-purpose'
      suggested_model: '(default)'
      suggested_effort: 'medium'
    - task_id: task-030
      agent_role: 'Refactoring Agent'
      objective: 'Relocate the 20 names of group 3 (diagram: rows 44, 51, 52) with the comment lines directly above each declaration, in page order, one blank line between, to model/ui-state.js; ui-state sits between unsorted/from-26.js and model/record-lookup.js in layers.json (DEC-6); check that none of the 19 coverage markers is among the lines taken; --statements, --layers, lint, format check, node suite; commit as refactor: relocate with the page. Run EditorReadSchemaTest and GuideViewPropertiesTest after this group (R-4).'
      context:
        prd_excerpts:
          - 'W7-1 of the TDD traceability'
          - 'W7-2 of the TDD traceability'
          - 'W7-6 of the TDD traceability'
        tdd_excerpts:
          - 'DEC-4'
          - 'DEC-6'
          - 'DEC-8'
          - 'FLOW-3'
          - 'RISK-3'
          - 'RISK-7'
      likely_files:
        - 'src/main/editor/model/ui-state.js'
        - 'src/main/editor/layers.json'
        - 'src/main/editor/unsorted/'
        - 'src/main/resources/editor-webapp/standalone.html'
      acceptance_criteria:
        - 'The declarations and comments of the page of HEAD are all there, the load order holds, upward pairs stay 0 and the node suite is green.'
      verification:
        - 'npm run editor:build'
        - 'node scripts/check-editor.mjs --statements HEAD'
        - 'node scripts/check-editor.mjs --layers'
        - 'npm run lint'
        - 'npm run format:check'
        - 'npm run test:unit'
        - './mvnw -Dtest=EditorReadSchemaTest,GuideViewPropertiesTest test'
      escalation_triggers:
        - '--statements fails or the load order fails: revert by path; a group is regrouped, an initializer is never edited.'
        - 'The node suite fails: re-run the failing file on the parent in a scratch worktree; passing there means the relocation is wrong.'
      suggested_subagent_type: 'general-purpose'
      suggested_model: '(default)'
      suggested_effort: 'high'
    - task_id: task-031
      agent_role: 'Refactoring Agent'
      objective: 'Relocate the 10 names of group 4 (map: row 45) with the comment lines directly above each declaration, in page order, one blank line between, to model/ui-state.js; ui-state sits between unsorted/from-26.js and model/record-lookup.js in layers.json (DEC-6); check that none of the 19 coverage markers is among the lines taken; --statements, --layers, lint, format check, node suite; commit as refactor: relocate with the page. Run EditorReadSchemaTest and GuideViewPropertiesTest after this group (R-4).'
      context:
        prd_excerpts:
          - 'W7-1 of the TDD traceability'
          - 'W7-2 of the TDD traceability'
          - 'W7-6 of the TDD traceability'
        tdd_excerpts:
          - 'DEC-4'
          - 'DEC-6'
          - 'DEC-8'
          - 'FLOW-3'
          - 'RISK-3'
          - 'RISK-7'
      likely_files:
        - 'src/main/editor/model/ui-state.js'
        - 'src/main/editor/layers.json'
        - 'src/main/editor/unsorted/'
        - 'src/main/resources/editor-webapp/standalone.html'
      acceptance_criteria:
        - 'The declarations and comments of the page of HEAD are all there, the load order holds, upward pairs stay 0 and the node suite is green.'
      verification:
        - 'npm run editor:build'
        - 'node scripts/check-editor.mjs --statements HEAD'
        - 'node scripts/check-editor.mjs --layers'
        - 'npm run lint'
        - 'npm run format:check'
        - 'npm run test:unit'
        - './mvnw -Dtest=EditorReadSchemaTest,GuideViewPropertiesTest test'
      escalation_triggers:
        - '--statements fails or the load order fails: revert by path; a group is regrouped, an initializer is never edited.'
        - 'The node suite fails: re-run the failing file on the parent in a scratch worktree; passing there means the relocation is wrong.'
      suggested_subagent_type: 'general-purpose'
      suggested_model: '(default)'
      suggested_effort: 'high'
    - task_id: task-032
      agent_role: 'Refactoring Agent'
      objective: 'Relocate the 7 names of group 5 (dialogs and the plateau constant: rows 15 and 58) with the comment lines directly above each declaration, in page order, one blank line between, to model/ui-state.js; ui-state sits between unsorted/from-26.js and model/record-lookup.js in layers.json (DEC-6); check that none of the 19 coverage markers is among the lines taken; --statements, --layers, lint, format check, node suite; commit as refactor: relocate with the page.'
      context:
        prd_excerpts:
          - 'W7-1 of the TDD traceability'
          - 'W7-2 of the TDD traceability'
          - 'W7-6 of the TDD traceability'
        tdd_excerpts:
          - 'DEC-4'
          - 'DEC-6'
          - 'DEC-8'
          - 'FLOW-3'
          - 'RISK-3'
          - 'RISK-7'
      likely_files:
        - 'src/main/editor/model/ui-state.js'
        - 'src/main/editor/layers.json'
        - 'src/main/editor/unsorted/'
        - 'src/main/resources/editor-webapp/standalone.html'
      acceptance_criteria:
        - 'The declarations and comments of the page of HEAD are all there, the load order holds, upward pairs stay 0 and the node suite is green.'
      verification:
        - 'npm run editor:build'
        - 'node scripts/check-editor.mjs --statements HEAD'
        - 'node scripts/check-editor.mjs --layers'
        - 'npm run lint'
        - 'npm run format:check'
        - 'npm run test:unit'
      escalation_triggers:
        - '--statements fails or the load order fails: revert by path; a group is regrouped, an initializer is never edited.'
        - 'The node suite fails: re-run the failing file on the parent in a scratch worktree; passing there means the relocation is wrong.'
      suggested_subagent_type: 'general-purpose'
      suggested_model: '(default)'
      suggested_effort: 'medium'
    - task_id: task-033
      agent_role: 'QA Agent'
      objective: 'Run the end set of FLOW-4 and the two shown-to-fail commands of Observability and Verification.'
      context:
        prd_excerpts:
          - 'W7-3 of the TDD traceability'
          - 'W7-4 of the TDD traceability'
        tdd_excerpts:
          - 'FLOW-4'
          - 'Observability and Verification'
          - 'DEC-6'
          - 'IMP-6'
      likely_files:
        - 'docs/wav/wav-024-fixes-and-editor-modules/run/run-0185-editor-extract-model-and-kernel/prg-0185-editor-extract-model-and-kernel.md'
      acceptance_criteria:
        - 'The objective is met and its verification passes.'
      verification:
        - 'npm run test:unit'
        - 'npm run test:coverage'
        - './mvnw verify -DskipITs=false'
        - 'npm run test:e2e'
        - 'src/main/rust/viewpoint-kernel/embed.sh --check'
        - 'npm run editor:check'
        - 'npm run lint'
        - 'npm run format:check'
        - 'git diff --stat against the first parent of the run'
        - 'scripts/check-editor-moves.sh <merge-base> HEAD when the commits exist'
      escalation_triggers:
        - 'A check fails: log the command and its first line; the coverage floor is never lowered in this run.'
      suggested_subagent_type: 'general-purpose'
      suggested_model: '(default)'
      suggested_effort: 'medium'
    - task_id: task-034
      agent_role: 'Documentation Agent'
      objective: 'Write the evidence of every task into the prg and the run document, set the run status for the implement stage, and note the open pull request run as pending.'
      context:
        prd_excerpts:
          - 'W7-3 of the TDD traceability'
        tdd_excerpts:
          - 'FLOW-4'
          - 'IMP-7'
      likely_files:
        - 'docs/wav/wav-024-fixes-and-editor-modules/run/run-0185-editor-extract-model-and-kernel/run-0185-editor-extract-model-and-kernel.md'
        - 'docs/wav/wav-024-fixes-and-editor-modules/run/run-0185-editor-extract-model-and-kernel/prg-0185-editor-extract-model-and-kernel.md'
      acceptance_criteria:
        - 'The objective is met and its verification passes.'
      verification:
        - 'grep'
        - 'manual read'
      escalation_triggers:
        - 'A fix would change a decision.'
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
        - 'grep for each applied sentence'
        - 'node scripts/build-editor.mjs --check'
      success_criteria:
        - 'The applied or written text is visible and the page check still passes.'
    - task_id: task-002
      methods:
        - 'git status --short -- src/main/editor src/test/javascript/editor-build'
        - 'node scripts/build-editor.mjs --check'
        - 'node scripts/check-editor.mjs --layers'
        - 'sha256sum src/main/resources/editor-webapp/standalone.html'
        - 'wc -l src/main/resources/editor-webapp/standalone.html'
      success_criteria:
        - 'Every listed command exits 0 and prints what the TDD says: byte identity or statement equality, upward pairs: 0 (max 162), tests green.'
    - task_id: task-003
      methods:
        - 'node scripts/build-editor.mjs --map'
        - 'node scripts/build-editor.mjs --check'
        - 'node scripts/build-editor.mjs --check-identical HEAD'
        - 'node scripts/check-editor.mjs --layers'
        - 'npm run lint'
        - 'npm run format:check'
        - 'sha256sum of the page starts a653717d5564c237'
      success_criteria:
        - 'Every listed command exits 0 and prints what the TDD says: byte identity or statement equality, upward pairs: 0 (max 162), tests green.'
    - task_id: task-004
      methods:
        - 'node scripts/build-editor.mjs --map'
        - 'node scripts/build-editor.mjs --check'
        - 'node scripts/build-editor.mjs --check-identical HEAD'
        - 'node scripts/check-editor.mjs --layers'
        - 'npm run lint'
        - 'npm run format:check'
        - 'sha256sum of the page starts a653717d5564c237'
      success_criteria:
        - 'Every listed command exits 0 and prints what the TDD says: byte identity or statement equality, upward pairs: 0 (max 162), tests green.'
    - task_id: task-005
      methods:
        - 'node scripts/build-editor.mjs --map'
        - 'node scripts/build-editor.mjs --check'
        - 'node scripts/build-editor.mjs --check-identical HEAD'
        - 'node scripts/check-editor.mjs --layers'
        - 'npm run lint'
        - 'npm run format:check'
        - 'sha256sum of the page starts a653717d5564c237'
      success_criteria:
        - 'Every listed command exits 0 and prints what the TDD says: byte identity or statement equality, upward pairs: 0 (max 162), tests green.'
    - task_id: task-006
      methods:
        - 'node scripts/build-editor.mjs --map'
        - 'node scripts/build-editor.mjs --check'
        - 'node scripts/build-editor.mjs --check-identical HEAD'
        - 'node scripts/check-editor.mjs --layers'
        - 'npm run lint'
        - 'npm run format:check'
        - 'sha256sum of the page starts a653717d5564c237'
      success_criteria:
        - 'Every listed command exits 0 and prints what the TDD says: byte identity or statement equality, upward pairs: 0 (max 162), tests green.'
    - task_id: task-007
      methods:
        - 'node scripts/build-editor.mjs --map'
        - 'node scripts/build-editor.mjs --check'
        - 'node scripts/build-editor.mjs --check-identical HEAD'
        - 'node scripts/check-editor.mjs --layers'
        - 'npm run lint'
        - 'npm run format:check'
        - 'sha256sum of the page starts a653717d5564c237'
      success_criteria:
        - 'Every listed command exits 0 and prints what the TDD says: byte identity or statement equality, upward pairs: 0 (max 162), tests green.'
    - task_id: task-008
      methods:
        - 'node scripts/build-editor.mjs --map'
        - 'node scripts/build-editor.mjs --check'
        - 'node scripts/build-editor.mjs --check-identical HEAD'
        - 'node scripts/check-editor.mjs --layers'
        - 'npm run lint'
        - 'npm run format:check'
        - 'sha256sum of the page starts a653717d5564c237'
      success_criteria:
        - 'Every listed command exits 0 and prints what the TDD says: byte identity or statement equality, upward pairs: 0 (max 162), tests green.'
    - task_id: task-009
      methods:
        - 'node scripts/build-editor.mjs --map'
        - 'node scripts/build-editor.mjs --check'
        - 'node scripts/build-editor.mjs --check-identical HEAD'
        - 'node scripts/check-editor.mjs --layers'
        - 'npm run lint'
        - 'npm run format:check'
        - 'sha256sum of the page starts a653717d5564c237'
      success_criteria:
        - 'Every listed command exits 0 and prints what the TDD says: byte identity or statement equality, upward pairs: 0 (max 162), tests green.'
    - task_id: task-010
      methods:
        - 'node scripts/build-editor.mjs --map'
        - 'node scripts/build-editor.mjs --check'
        - 'node scripts/build-editor.mjs --check-identical HEAD'
        - 'node scripts/check-editor.mjs --layers'
        - 'npm run lint'
        - 'npm run format:check'
        - 'sha256sum of the page starts a653717d5564c237'
      success_criteria:
        - 'Every listed command exits 0 and prints what the TDD says: byte identity or statement equality, upward pairs: 0 (max 162), tests green.'
    - task_id: task-011
      methods:
        - 'node scripts/build-editor.mjs --map'
        - 'node scripts/build-editor.mjs --check'
        - 'node scripts/build-editor.mjs --check-identical HEAD'
        - 'node scripts/check-editor.mjs --layers'
        - 'npm run lint'
        - 'npm run format:check'
        - 'sha256sum of the page starts a653717d5564c237'
      success_criteria:
        - 'Every listed command exits 0 and prints what the TDD says: byte identity or statement equality, upward pairs: 0 (max 162), tests green.'
    - task_id: task-012
      methods:
        - 'node scripts/build-editor.mjs --map'
        - 'node scripts/build-editor.mjs --check'
        - 'node scripts/build-editor.mjs --check-identical HEAD'
        - 'node scripts/check-editor.mjs --layers'
        - 'npm run lint'
        - 'npm run format:check'
        - 'sha256sum of the page starts a653717d5564c237'
      success_criteria:
        - 'Every listed command exits 0 and prints what the TDD says: byte identity or statement equality, upward pairs: 0 (max 162), tests green.'
    - task_id: task-013
      methods:
        - 'node scripts/build-editor.mjs --map'
        - 'node scripts/build-editor.mjs --check'
        - 'node scripts/build-editor.mjs --check-identical HEAD'
        - 'node scripts/check-editor.mjs --layers'
        - 'npm run lint'
        - 'npm run format:check'
        - 'sha256sum of the page starts a653717d5564c237'
      success_criteria:
        - 'Every listed command exits 0 and prints what the TDD says: byte identity or statement equality, upward pairs: 0 (max 162), tests green.'
    - task_id: task-014
      methods:
        - 'node --test on the changed file, on the page before and after the relocation it prepares'
        - 'npm run lint'
        - 'npm run format:check'
      success_criteria:
        - 'Every listed command exits 0 and prints what the TDD says: byte identity or statement equality, upward pairs: 0 (max 162), tests green.'
    - task_id: task-015
      methods:
        - 'node --test on the changed file, on the page before and after the relocation it prepares'
        - 'npm run lint'
        - 'npm run format:check'
      success_criteria:
        - 'Every listed command exits 0 and prints what the TDD says: byte identity or statement equality, upward pairs: 0 (max 162), tests green.'
    - task_id: task-016
      methods:
        - 'npm run editor:build'
        - 'node scripts/check-editor.mjs --statements HEAD'
        - 'node scripts/check-editor.mjs --layers'
        - 'npm run lint'
        - 'npm run format:check'
        - 'npm run test:unit'
      success_criteria:
        - 'Every listed command exits 0 and prints what the TDD says: byte identity or statement equality, upward pairs: 0 (max 162), tests green.'
    - task_id: task-017
      methods:
        - 'node scripts/build-editor.mjs --map'
        - 'node scripts/build-editor.mjs --check'
        - 'node scripts/build-editor.mjs --check-identical HEAD'
        - 'node scripts/check-editor.mjs --layers'
        - 'npm run lint'
        - 'npm run format:check'
        - 'sha256sum of the page starts a653717d5564c237'
      success_criteria:
        - 'Every listed command exits 0 and prints what the TDD says: byte identity or statement equality, upward pairs: 0 (max 162), tests green.'
    - task_id: task-018
      methods:
        - 'node scripts/build-editor.mjs --map'
        - 'node scripts/build-editor.mjs --check'
        - 'node scripts/build-editor.mjs --check-identical HEAD'
        - 'node scripts/check-editor.mjs --layers'
        - 'npm run lint'
        - 'npm run format:check'
        - 'sha256sum of the page starts a653717d5564c237'
      success_criteria:
        - 'Every listed command exits 0 and prints what the TDD says: byte identity or statement equality, upward pairs: 0 (max 162), tests green.'
    - task_id: task-019
      methods:
        - 'node scripts/build-editor.mjs --map'
        - 'node scripts/build-editor.mjs --check'
        - 'node scripts/build-editor.mjs --check-identical HEAD'
        - 'node scripts/check-editor.mjs --layers'
        - 'npm run lint'
        - 'npm run format:check'
        - 'sha256sum of the page starts a653717d5564c237'
      success_criteria:
        - 'Every listed command exits 0 and prints what the TDD says: byte identity or statement equality, upward pairs: 0 (max 162), tests green.'
    - task_id: task-020
      methods:
        - 'node scripts/build-editor.mjs --map'
        - 'node scripts/build-editor.mjs --check'
        - 'node scripts/build-editor.mjs --check-identical HEAD'
        - 'node scripts/check-editor.mjs --layers'
        - 'npm run lint'
        - 'npm run format:check'
        - 'sha256sum of the page starts a653717d5564c237'
      success_criteria:
        - 'Every listed command exits 0 and prints what the TDD says: byte identity or statement equality, upward pairs: 0 (max 162), tests green.'
    - task_id: task-021
      methods:
        - 'node scripts/build-editor.mjs --map'
        - 'node scripts/build-editor.mjs --check'
        - 'node scripts/build-editor.mjs --check-identical HEAD'
        - 'node scripts/check-editor.mjs --layers'
        - 'npm run lint'
        - 'npm run format:check'
        - 'sha256sum of the page starts a653717d5564c237'
      success_criteria:
        - 'Every listed command exits 0 and prints what the TDD says: byte identity or statement equality, upward pairs: 0 (max 162), tests green.'
    - task_id: task-022
      methods:
        - 'node scripts/build-editor.mjs --map'
        - 'node scripts/build-editor.mjs --check'
        - 'node scripts/build-editor.mjs --check-identical HEAD'
        - 'node scripts/check-editor.mjs --layers'
        - 'npm run lint'
        - 'npm run format:check'
        - 'sha256sum of the page starts a653717d5564c237'
      success_criteria:
        - 'Every listed command exits 0 and prints what the TDD says: byte identity or statement equality, upward pairs: 0 (max 162), tests green.'
    - task_id: task-023
      methods:
        - 'node scripts/build-editor.mjs --map'
        - 'node scripts/build-editor.mjs --check'
        - 'node scripts/build-editor.mjs --check-identical HEAD'
        - 'node scripts/check-editor.mjs --layers'
        - 'npm run lint'
        - 'npm run format:check'
        - 'sha256sum of the page starts a653717d5564c237'
      success_criteria:
        - 'Every listed command exits 0 and prints what the TDD says: byte identity or statement equality, upward pairs: 0 (max 162), tests green.'
    - task_id: task-024
      methods:
        - 'node scripts/build-editor.mjs --map'
        - 'node scripts/build-editor.mjs --check'
        - 'node scripts/build-editor.mjs --check-identical HEAD'
        - 'node scripts/check-editor.mjs --layers'
        - 'npm run lint'
        - 'npm run format:check'
        - 'sha256sum of the page starts a653717d5564c237'
      success_criteria:
        - 'Every listed command exits 0 and prints what the TDD says: byte identity or statement equality, upward pairs: 0 (max 162), tests green.'
    - task_id: task-025
      methods:
        - 'node scripts/build-editor.mjs --map'
        - 'node scripts/build-editor.mjs --check'
        - 'node scripts/build-editor.mjs --check-identical HEAD'
        - 'node scripts/check-editor.mjs --layers'
        - 'npm run lint'
        - 'npm run format:check'
        - 'sha256sum of the page starts a653717d5564c237'
      success_criteria:
        - 'Every listed command exits 0 and prints what the TDD says: byte identity or statement equality, upward pairs: 0 (max 162), tests green.'
    - task_id: task-026
      methods:
        - 'npm run test:unit'
        - './mvnw -Dtest=EditorReadSchemaTest,GuideViewPropertiesTest test (JDK 25)'
        - 'git status'
      success_criteria:
        - 'Every listed command exits 0 and prints what the TDD says: byte identity or statement equality, upward pairs: 0 (max 162), tests green.'
    - task_id: task-027
      methods:
        - 'node --test on the changed file, on the page before and after the relocation it prepares'
        - 'npm run lint'
        - 'npm run format:check'
      success_criteria:
        - 'Every listed command exits 0 and prints what the TDD says: byte identity or statement equality, upward pairs: 0 (max 162), tests green.'
    - task_id: task-028
      methods:
        - 'npm run editor:build'
        - 'node scripts/check-editor.mjs --statements HEAD'
        - 'node scripts/check-editor.mjs --layers'
        - 'npm run lint'
        - 'npm run format:check'
        - 'npm run test:unit'
      success_criteria:
        - 'Every listed command exits 0 and prints what the TDD says: byte identity or statement equality, upward pairs: 0 (max 162), tests green.'
    - task_id: task-029
      methods:
        - 'npm run editor:build'
        - 'node scripts/check-editor.mjs --statements HEAD'
        - 'node scripts/check-editor.mjs --layers'
        - 'npm run lint'
        - 'npm run format:check'
        - 'npm run test:unit'
      success_criteria:
        - 'Every listed command exits 0 and prints what the TDD says: byte identity or statement equality, upward pairs: 0 (max 162), tests green.'
    - task_id: task-030
      methods:
        - 'npm run editor:build'
        - 'node scripts/check-editor.mjs --statements HEAD'
        - 'node scripts/check-editor.mjs --layers'
        - 'npm run lint'
        - 'npm run format:check'
        - 'npm run test:unit'
        - './mvnw -Dtest=EditorReadSchemaTest,GuideViewPropertiesTest test'
      success_criteria:
        - 'Every listed command exits 0 and prints what the TDD says: byte identity or statement equality, upward pairs: 0 (max 162), tests green.'
    - task_id: task-031
      methods:
        - 'npm run editor:build'
        - 'node scripts/check-editor.mjs --statements HEAD'
        - 'node scripts/check-editor.mjs --layers'
        - 'npm run lint'
        - 'npm run format:check'
        - 'npm run test:unit'
        - './mvnw -Dtest=EditorReadSchemaTest,GuideViewPropertiesTest test'
      success_criteria:
        - 'Every listed command exits 0 and prints what the TDD says: byte identity or statement equality, upward pairs: 0 (max 162), tests green.'
    - task_id: task-032
      methods:
        - 'npm run editor:build'
        - 'node scripts/check-editor.mjs --statements HEAD'
        - 'node scripts/check-editor.mjs --layers'
        - 'npm run lint'
        - 'npm run format:check'
        - 'npm run test:unit'
      success_criteria:
        - 'Every listed command exits 0 and prints what the TDD says: byte identity or statement equality, upward pairs: 0 (max 162), tests green.'
    - task_id: task-033
      methods:
        - 'npm run test:unit'
        - 'npm run test:coverage'
        - './mvnw verify -DskipITs=false'
        - 'npm run test:e2e'
        - 'src/main/rust/viewpoint-kernel/embed.sh --check'
        - 'npm run editor:check'
        - 'npm run lint'
        - 'npm run format:check'
        - 'git diff --stat against the first parent of the run'
        - 'scripts/check-editor-moves.sh <merge-base> HEAD when the commits exist'
      success_criteria:
        - 'Every listed command exits 0 and prints what the TDD says: byte identity or statement equality, upward pairs: 0 (max 162), tests green.'
    - task_id: task-034
      methods:
        - 'grep'
        - 'manual read'
      success_criteria:
        - 'The applied or written text is visible and the page check still passes.'
```

## 11. Escalation Rules

This run operates under the autonomy override of complete-run, so a task that would stop on category alone is executed and its decision logged. The rules below stop on a specific condition only.

```yaml
escalation_rules:
  rules:
    - condition: 'The work of W-6 is listed by git status at task-002 (ASM-2).'
      action: 'Stop with state blocked and say the run waits for the commit of W-6; commit nothing from this run to work around it.'
    - condition: 'The page sha256 does not start a653717d5564c237 or its line count is not 23,170 (ASM-1).'
      action: 'Stop; the cut table is for another page.'
    - condition: 'A check of a move fails (byte difference, --map different from the range, upward pairs above 0, lint or format).'
      action: 'Restore the unsorted files and layers.json from HEAD and delete the new part file by path, do not edit the text to fit, log the command and its first line, stop the run.'
    - condition: 'A statement check, the load order or the node suite fails after a relocation.'
      action: 'Revert that relocation by path; regroup a failing group of DEC-4, never edit an initializer; re-run a failing test file on the parent in a scratch worktree before judging it a flake.'
    - condition: 'A fix or a test would change a decision of the TDD (a part name, a range, a layer, the place of ui-state).'
      action: 'Stop that change, log it as a finding, leave the decision as the TDD has it (CON-6).'
    - condition: 'A diff touches names.json, java-names.json, scripts, package.json, .github, the coverage floor, a Java file or a test other than the three of IMP-4.'
      action: 'Revert that edit by editing the file back (no destructive git) and log it as a finding.'
    - condition: 'The executor may not commit.'
      action: 'Take the second path of DEC-9: verify in the working tree, check each relocation against the saved page of the previous state, record each result, leave check-editor-moves.sh pending for gate-001.'
    - condition: 'Confidence of a task falls below 70 during execution.'
      action: 'Re-dispatch once one effort step up, then handle inline, and log it.'
```

## 12. Final Execution Manifest

```yaml
execution_manifest:
  status: 'in_progress'
  recommendation: 'proceed_with_review'
  autonomy_level: 'medium'
  total_tasks: 34
  autonomous_tasks: 34
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
    - task-013
    - task-014
    - task-015
    - task-016
    - task-017
    - task-018
    - task-019
    - task-020
    - task-021
    - task-022
    - task-023
    - task-024
    - task-025
    - task-026
    - task-027
    - task-028
    - task-029
    - task-030
    - task-031
    - task-032
    - task-033
    - task-034
  parallel_groups: []
  required_human_gates:
    - gate-001
  highest_risk_tasks:
    - task-016
    - task-033
  lowest_confidence_tasks:
    - task-033
    - task-030
  next_action: 'The main agent or the author commits the work of W-6 by path (gap-002), then the implement workflow starts at task-001.'
  criteria:
    - 'All tasks done and their verification green, or the run stopped at task-002 with the reason logged.'
    - 'The assembled page equals the committed one through the twenty moves and differs afterwards only in the order of declarations.'
    - 'The twenty parts, model/ui-state.js and the three changed tests exist and pass; layers.json lists the parts in page order.'
    - 'The IMP-6 paths are unchanged.'
    - 'The pull request run is read at gate-001 and recorded; until then pending.'
```
