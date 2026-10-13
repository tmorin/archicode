---
title: Editor — inspection panel for the selected element, execution plan
type: pln
status: completed
date: 2026-10-13
run: 0018
wave: 004
related:
  - docs/wav/wav-004-editor-workspace-experience/run/run-0018-inspection-panel-elements/tdd-0018-inspection-panel-elements.md
---

# 1. Executive Summary

No PRD (profile `TDD+pln`): the requirements are R1-R6 of the TDD. This run operates under the `complete-run` autonomy
override (no stop on `human_required` by category; none of its tasks carries that tier).

```yaml
summary:
  status: 'done'
  product_goal: 'Read the data of the selected element next to the diagram, without leaving the view'
  technical_approach: 'Fill the right region of the Map and of the diagram tabs of Elements with a panel built from the record, reusing renderElementPropertiesHtml and the badges of run 0017'
  total_tasks: 5
  parallel_groups: 0
  high_risk_tasks: 0
  human_review_gates: 0
  autonomy_level: 'high'
  recommendation: 'proceed'
  criteria:
    - 'AC-1 selecting an element on the Map renders the right panel with its kind, reference, layer, tags, description, source file and styled stereotype badges'
    - 'AC-2 with nothing selected, on Details, on the edit and create forms, and when maximized, no aside and no handle is rendered'
    - 'AC-3 the three diagram tabs of Elements render the panel, without a Close button; the Map renders it with one'
    - 'AC-4 the panel follows the layer of the selection, and is absent for a deleted element'
    - 'AC-5 the panel has a resize handle and a saved width (the shell contract); the Map clears its panel with its own selection'
    - 'AC-6 click semantics are unchanged (goto-element is not modified)'
    - 'AC-7 node tests, ./mvnw test and embed.sh --check pass; the kernel block of standalone.html is untouched'
    - 'AC-8 the panel next to the centre was seen in a real browser on a replica in light and dark, and what that could not confirm is said'
    - 'AC-9 the manual describes the panel'
```

# 2. PRD/TDD Consistency Assessment

```yaml
consistency_assessment:
  aligned_items:
    - 'R1-R6 (TDD, PRD Traceability) each map to a DEC (R1 DEC-1/2, R2 DEC-3, R3 DEC-1/5, R4 DEC-4, R5 DEC-6, R6 DEC-7)'
  gaps:
    - id: gap-001
      type: 'ambiguity'
      description: 'No PRD; the requirements come from the wave plan row W-7 and the dispatch brief'
      impact: 'low'
      recommendation: 'Traceability marked incomplete in the TDD; nothing to resolve'
  blocking_gaps: []
```

# 3. Execution Graph

```yaml
execution_graph:
  nodes:
    - { id: task-001, status: 'done', title: 'Panel: record lookup, markup, CSS, perspectives, shell aria-label', depends_on: [], produces: ['standalone.html JS and CSS'], agent_role: 'Frontend Implementation Agent', autonomy: 'autonomous', risk: 'medium', confidence: 85 }
    - { id: task-002, status: 'done', title: 'Close action, off-map note, imperative clear of the Map, scroll rule', depends_on: ['task-001'], produces: ['standalone.html JS'], agent_role: 'Frontend Implementation Agent', autonomy: 'autonomous', risk: 'medium', confidence: 80 }
    - { id: task-003, status: 'done', title: 'Tests: inspection.test.js and the three assertions of diagram.test.js', depends_on: ['task-002'], produces: ['inspection.test.js', 'diagram.test.js'], agent_role: 'Test Generation Agent', autonomy: 'autonomous', risk: 'low', confidence: 85 }
    - { id: task-004, status: 'done', title: 'Look at the panel beside the centre in a browser on a replica, light and dark; manual', depends_on: ['task-002'], produces: ['findings', 'README.adoc'], agent_role: 'QA Agent', autonomy: 'autonomous', risk: 'low', confidence: 75 }
    - { id: task-005, status: 'done', title: 'Verification and close-out', depends_on: ['task-003', 'task-004'], produces: ['results'], agent_role: 'QA Agent', autonomy: 'autonomous', risk: 'low', confidence: 85 }
  edges:
    - { from: task-001, to: task-002, reason: 'the actions work on the panel' }
    - { from: task-002, to: task-003, reason: 'test what exists' }
    - { from: task-002, to: task-004, reason: 'look at and document what exists' }
    - { from: task-003, to: task-005, reason: 'verify the whole' }
    - { from: task-004, to: task-005, reason: 'verify the whole' }
```

# 4. Task Catalog

```yaml
task_catalog:
  tasks:
    - id: task-001
      title: 'Panel'
      source_requirements: { prd: [], tdd: ['R1', 'R2', 'DEC-1', 'DEC-2', 'DEC-3', 'CTR-1', 'CTR-2'] }
      outputs: ['inspectionRecordFor, renderInspectionHtml, .inspection CSS, right of renderMapPerspectiveHtml and renderElementsPerspectiveHtml, aria-label of the aside']
      likely_files: ['src/main/resources/editor-webapp/standalone.html']
      verification: ['existing node tests green except the three right === null assertions', 'review of the diff']
      risk: 'medium'
      confidence: 85
      human_review: 'none'
      escalation_triggers: ['an existing assertion other than the three would have to be loosened']
      delegation_tier: 'standard'
    - id: task-002
      title: 'Close, off-map note, Map clear, scroll'
      source_requirements: { prd: [], tdd: ['R3', 'R4', 'R5', 'DEC-4', 'DEC-5', 'DEC-6', 'CTR-3'] }
      outputs: ['close-inspection, markInspection, removeInspectionPanel, the sameView rule for panel-right']
      likely_files: ['src/main/resources/editor-webapp/standalone.html']
      verification: ['node tests green', 'goto-element untouched (diff)']
      risk: 'medium'
      confidence: 80
      human_review: 'none'
      escalation_triggers: ['a change to goto-element is needed']
      delegation_tier: 'standard'
    - id: task-003
      title: 'Tests'
      source_requirements: { prd: [], tdd: ['IF-1', 'IF-2', 'IF-3', 'IF-4', 'IF-5', 'CTR-1', 'CTR-3'] }
      outputs: ['src/test/javascript/viewpoint-kernel/inspection.test.js', 'diagram.test.js']
      likely_files: ['src/test/javascript/viewpoint-kernel/inspection.test.js', 'src/test/javascript/viewpoint-kernel/diagram.test.js']
      verification: ['node --test "src/test/javascript/**/*.test.js"', 'mutation check by hand: each behaviour broken in turn makes a test fail']
      risk: 'low'
      confidence: 85
      human_review: 'none'
      escalation_triggers: []
      delegation_tier: 'standard'
    - id: task-004
      title: 'Browser look on a replica and the manual'
      source_requirements: { prd: [], tdd: ['R6', 'DEC-7', 'CON-2'] }
      outputs: ['findings in the Results', 'a section of src/doc/README.adoc']
      likely_files: ['src/doc/README.adoc']
      verification: ['the replica seen in light and dark, at a narrow and a wide centre', 'the section read']
      risk: 'low'
      confidence: 75
      human_review: 'none'
      escalation_triggers: []
      delegation_tier: 'standard'
    - id: task-005
      title: 'Verification and close-out'
      source_requirements: { prd: [], tdd: ['Observability and Verification'] }
      outputs: ['results', 'status files']
      likely_files: []
      verification: ['node suite', './mvnw test', 'embed.sh --check', 'git diff --stat']
      risk: 'low'
      confidence: 85
      human_review: 'none'
      escalation_triggers: ['a suite is red']
      delegation_tier: 'standard'
```

# 5. Parallelization Plan

```yaml
parallelization_plan:
  groups: []
  notes: 'All tasks edit the same file (standalone.html) or depend on it: serial.'
```

# 6. Human Review Gates

None. This run operates under the `complete-run` autonomy override; no task is `human_required`.

# 7. Risk Assessment

- The panel narrows the centre: the header states follow by construction (container query), seen on the replica.
- The Map's imperative selection clear must remove the panel too (DEC-4): covered by a test.

# 8. Confidence Assessment

Overall 82. The least certain point is the look beside a real diagram (task-004 sees it on a replica only).

# 9. Agent Assignment Plan

All tasks `standard`. Per this session's constraints (one file, one design, a dispatching agent already inside a run),
tasks 001-002 are worked inline by the executing session; tasks 003-005 inline too, because the tests depend on details
of the markup written in 001-002. The deviation from "standard tasks are dispatched" is recorded in the Results.

# 10. Verification Plan

- `node --test "src/test/javascript/**/*.test.js"` (baseline 288 pass).
- `JAVA_HOME=/home/tibo/.sdkman/candidates/java/25.0.4-tem ./mvnw test` (baseline 107).
- `src/main/rust/viewpoint-kernel/embed.sh --check`.
- The replica in the built-in browser, light and dark.

# 11. Escalation Rules

Stop only for a genuine blocker (conflicting requirements, missing access, a decision that is a product tradeoff). The
autonomy override of `complete-run` applies.

# 12. Final Execution Manifest

```yaml
execution_manifest:
  status: 'done'
  criteria:
    - 'AC-1 … AC-9 above all hold'
```

## Results

- Deviation, as in runs 0016 and 0017: tasks 001-005 are tiered `standard` but were worked inline by the executing session
  (one file, one design; the tests depend on the markup written in 001-002). The only dispatch was the KDMLLC review of the
  TDD (standard tier); its five findings (one wrong: C-2, see the TDD DEC-4) were applied.
- AC-1, AC-3: `inspection.test.js` ('the Map shows the selected element…', 'the Map has a Close button…'), green.
- AC-2: 'nothing selected…', 'Details, the edit form…', 'maximized…' green.
- AC-4: 'a reference that exists in both layers…', 'an element that no longer exists…', 'the header of the Map and the panel…'.
- AC-5: the shell tests (aside, handle, saved width, double click), 'the Map drops the panel and its handle…'.
- AC-6: `goto-element` untouched (a test reads its source and a click test checks the perspective is not changed).
- AC-7: `node --test "src/test/javascript/**/*.test.js"` 313 pass (baseline 288, 25 new); `./mvnw test` 107 tests,
  BUILD SUCCESS (JDK 25); `embed.sh --check` exit 0 ("the committed WebAssembly is the one the sources build"); the diff of
  `standalone.html` holds no line of the base64 block.
- Mutation checks by hand (five): removing the maximized guard, the Close condition, the `diagramTabShown()` gate and the
  layer lookup were each caught except the layer one (equivalent: `layerOfReference` reads the selection's layer by itself)
  and the edit-mode guard (added a direct test of `inspectionRecordFor`).
- AC-8: replica in the built-in browser (harness markup from `renderShellHtml` with the real stylesheet, a striped block for
  the diagram): the Map and a Deep tab with the panel, dark at 1400 px and light at 1100 px. The grid gives the panel its
  height and scroll and keeps the centre scrolling; the rows stack and read well; at a 34rem centre the header is in its
  two-row state without overflow. A first look showed the tag list indented: fixed (`.inspection .tag-list`).
- AC-9: `src/doc/README.adoc`, section `[[editor-inspection]]`.

## Findings

- The tree of the Map selects nothing and pin / hide / fold / facet / Hide unlinked set `mapSelectionCheck`, which makes
  `showDiagramScene` deselect an element the new drawing leaves out: the "not on the map" note is therefore only for a
  selection that arrives from elsewhere (Elements, the URL). `showDiagramScene` removes header pieces by hand: it now
  removes the panel and its handle too, and any future piece of the Map that depends on the selection must be added there.
- The key of the view in `render()` did not include the layer of the selection; it does now.
- Not confirmed: the real page (File System Access picker), ELK layout beside the panel (a box in the outer part of a wide
  Map can end up under the panel after a selection: RISK-1), dragging the handle, the Map chips against the panel.
