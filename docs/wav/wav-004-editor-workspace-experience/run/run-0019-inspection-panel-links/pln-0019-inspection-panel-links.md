---
title: Editor — inspection panel for the selected link, execution plan
type: pln
status: completed
date: 2026-10-13
run: 0019
wave: 004
related:
  - docs/wav/wav-004-editor-workspace-experience/run/run-0019-inspection-panel-links/tdd-0019-inspection-panel-links.md
---

# 1. Executive Summary

No PRD (profile `TDD+pln`): the requirements are R1-R8 of the TDD. This run operates under the `complete-run` autonomy
override (no stop on `human_required` by category; none of its tasks carries that tier).

```yaml
summary:
  status: 'done'
  product_goal: 'Click a link of a diagram and read its relationships, with their qualifiers and tags, next to it'
  technical_approach: 'A selection kind link keyed by the pair of boxes, carried through Elements by a focal element; the panel is built from what the drawing drew; every reader of the selection goes through elementSelection()'
  total_tasks: 5
  parallel_groups: 0
  high_risk_tasks: 1
  human_review_gates: 0
  autonomy_level: 'high'
  recommendation: 'proceed'
  criteria:
    - 'AC-1 a click (or Enter / Space) on a link or its caption of the Map or of an Elements diagram selects the pair; the panel lists each declared relationship with label, qualifiers and tags'
    - 'AC-2 grouped, folded-end, ghost and multi-link pairs are listed as the TDD says (DEC-1, DEC-4)'
    - 'AC-3 in Elements the centre, the tree row, the tabs and the URL still follow the focal element while a link is selected'
    - 'AC-4 the selection ends on navigation (settleLinkSelection) and when the new drawing lacks the pair (reconcileLinkSelection, by hand: the Map removes the panel, Elements redraws the element panel)'
    - 'AC-5 Close and Escape deselect; the Close button exists in both perspectives'
    - 'AC-6 links are tab stops with role/aria, focus returns after the redraw, hover and focus light the pair; goto-element and fix-dangling are untouched'
    - 'AC-7 node tests, ./mvnw test and embed.sh --check pass; the kernel block of standalone.html is untouched'
    - 'AC-8 the panel with a link was seen in a real browser on a replica, light and dark, and what that could not confirm is said'
    - 'AC-9 the manual describes the link selection'
```

# 2. PRD/TDD Consistency Assessment

```yaml
consistency_assessment:
  aligned_items:
    - 'R1-R8 (TDD, PRD Traceability) each map to a DEC (R1 DEC-1/6, R2 DEC-4/5, R3 DEC-1/4, R4 DEC-2/3/7, R5 DEC-3, R6 DEC-6, R7 DEC-6/7, R8 DEC-3)'
  gaps:
    - id: gap-001
      type: 'ambiguity'
      description: 'No PRD; the requirements come from the wave plan row W-8 and the dispatch brief'
      impact: 'low'
      recommendation: 'Traceability marked incomplete in the TDD; nothing to resolve'
  blocking_gaps: []
```

# 3. Execution Graph

```yaml
execution_graph:
  nodes:
    - { id: task-001, status: 'done', title: 'Drawing: markup of links and captions, scene.links, CSS', depends_on: [], produces: ['standalone.html JS and CSS'], agent_role: 'Frontend Implementation Agent', autonomy: 'autonomous', risk: 'medium', confidence: 85 }
    - { id: task-002, status: 'done', title: 'Selection kind: elementSelection and the audited sites, settle / reconcile / drop, select-link and Close, Escape, focus', depends_on: ['task-001'], produces: ['standalone.html JS'], agent_role: 'Frontend Implementation Agent', autonomy: 'autonomous', risk: 'high', confidence: 75 }
    - { id: task-003, status: 'done', title: 'Panel: renderLinkInspectionHtml, shared pills and tag list, refreshInspection, markLinkSelection', depends_on: ['task-002'], produces: ['standalone.html JS and CSS'], agent_role: 'Frontend Implementation Agent', autonomy: 'autonomous', risk: 'medium', confidence: 80 }
    - { id: task-004, status: 'done', title: 'Tests, and the look on a replica in light and dark; manual', depends_on: ['task-003'], produces: ['inspection-links.test.js', 'README.adoc'], agent_role: 'Test Generation Agent', autonomy: 'autonomous', risk: 'low', confidence: 80 }
    - { id: task-005, status: 'done', title: 'Verification and close-out', depends_on: ['task-004'], produces: ['results'], agent_role: 'QA Agent', autonomy: 'autonomous', risk: 'low', confidence: 85 }
  edges:
    - { from: task-001, to: task-002, reason: 'the selection needs the markup and the scene records' }
    - { from: task-002, to: task-003, reason: 'the panel reads the selection' }
    - { from: task-003, to: task-004, reason: 'test what exists' }
    - { from: task-004, to: task-005, reason: 'verify the whole' }
```

# 4. Task Catalog

```yaml
task_catalog:
  tasks:
    - id: task-001
      title: 'Links in the drawing'
      source_requirements: { prd: [], tdd: ['R1', 'R6', 'DEC-5', 'DEC-6', 'CTR-2', 'CTR-3', 'CON-3'] }
      outputs: ['renderDiagramSvg link/caption attributes and returned links, scene.links, CSS for links']
      likely_files: ['src/main/resources/editor-webapp/standalone.html']
      verification: ['existing node tests green', 'review of the diff']
      risk: 'medium'
      confidence: 85
      human_review: 'none'
      escalation_triggers: ['an existing assertion on the markup of a link would have to be loosened']
      delegation_tier: 'standard'
    - id: task-002
      title: 'The selection kind'
      source_requirements: { prd: [], tdd: ['R1', 'R4', 'R5', 'R7', 'R8', 'DEC-1', 'DEC-2', 'DEC-3', 'DEC-6', 'DEC-7', 'CTR-1', 'CTR-5'] }
      outputs: ['elementSelection, dropLinkSelection, settleLinkSelection, reconcileLinkSelection, select-link, close-inspection, Escape, focus helpers, the audited sites']
      likely_files: ['src/main/resources/editor-webapp/standalone.html']
      verification: ['node tests green', 'goto-element untouched (diff)', 'grep of every AppState.selection read against DEC-7']
      risk: 'high'
      confidence: 75
      human_review: 'none'
      escalation_triggers: ['a consumer of the selection that DEC-7 does not list and that cannot take elementSelection()']
      delegation_tier: 'hard_judgment'
    - id: task-003
      title: 'The panel'
      source_requirements: { prd: [], tdd: ['R2', 'R3', 'DEC-4', 'DEC-5', 'CTR-4'] }
      outputs: ['renderLinkInspectionHtml, renderQualifierPillsHtml, renderTagListHtml, refreshInspection, markLinkSelection, .inspection-rel CSS']
      likely_files: ['src/main/resources/editor-webapp/standalone.html']
      verification: ['node tests green (the element panel markup is unchanged)']
      risk: 'medium'
      confidence: 80
      human_review: 'none'
      escalation_triggers: []
      delegation_tier: 'standard'
    - id: task-004
      title: 'Tests, replica look, manual'
      source_requirements: { prd: [], tdd: ['IF-1', 'IF-2', 'IF-3', 'IF-4', 'Observability and Verification'] }
      outputs: ['src/test/javascript/viewpoint-kernel/inspection-links.test.js', 'findings', 'a paragraph of src/doc/README.adoc']
      likely_files: ['src/test/javascript/viewpoint-kernel/inspection-links.test.js', 'src/doc/README.adoc']
      verification: ['node --test "src/test/javascript/**/*.test.js"', 'mutation check by hand: each behaviour broken in turn makes a test fail', 'the replica seen in light and dark']
      risk: 'low'
      confidence: 80
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

None. This run operates under the `complete-run` autonomy override; no task is `human_required`. Task-002 is tiered
`hard_judgment` (it changes what every reader of the selection sees): it stays inline in the executing session, as the
Delegation Policy requires.

# 7. Risk Assessment

- A reader of the selection that is missed breaks Elements while a link is selected: covered by the audit of DEC-7, a
  grep before closing, and a test per consumer.
- The Map's imperative clear must remove the panel too, and Elements must redraw the element's panel by hand: tests.

# 8. Confidence Assessment

Overall 78. The least certain points are the look beside a real drawing and the tab order on a dense map (replica only).

# 9. Agent Assignment Plan

Task-002 `hard_judgment`: inline. Tasks 001, 003, 004, 005 are tiered `standard`; they are worked inline by the executing
session too, because they edit one file and the tests depend on the markup written in 001-003 (the same deviation as runs
0016-0018, recorded in the Results). The only dispatch is the KDMLLC review of the TDD.

# 10. Verification Plan

- `node --test "src/test/javascript/**/*.test.js"` (baseline 313 pass).
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

- Deviation, as in runs 0016-0018: tasks 001, 003, 004, 005 are tiered `standard` but were worked inline by the executing
  session (one file, one design; the tests depend on the markup written in 001-003); task-002 is `hard_judgment` and inline
  as required. The only dispatch was the KDMLLC review of the TDD (standard tier): 12 findings, applied or answered in the
  TDD (the missed second read of `markElementTabs` was already done in the code; the arrow keys from a link, the export,
  the counts and the accepted loss of the clicked link's identity were taken; `focalLayer` was dropped).
- AC-1, AC-2: `inspection-links.test.js` ('the panel of a natural link…', 'a link that groups several relationships…',
  'a link to a folded box…', 'a link to an unknown element…', 'two links between the same two boxes are one pair'), green.
- AC-3: 'in Elements the element stays the subject…', 'on the Map a link selection is no element…', 'dropLinkSelection…'.
- AC-4: 'a link is cleared on navigation…', 'render() settles the link first…', the four `reconcileLinkSelection` tests (kept and
  refreshed; Map removes panel and handle; Elements redraws the element's panel; a scene with no links).
- AC-5: 'Close: the Map deselects, Elements goes back to the element…', 'Escape in the diagram deselects a link…'.
- AC-6: 'a link and its caption are selectable…', 'Enter on a focused link is a click…', 'the focus goes back to the same link…',
  'the arrow keys go on from the box a focused link starts from', 'hover and focus of a link light its pair…', 'a box click is
  exactly what it was…' (goto-element carries no link code; its diff is empty).
- AC-7: `node --test "src/test/javascript/**/*.test.js"` 351 pass (baseline 313, 38 new); `./mvnw test` 107 tests, 0 failures
  (JDK 25); `embed.sh --check` exit 0; the diff of `standalone.html` holds no line of the base64 block.
- Mutation checks by hand (seven, one at a time, file restored after each): the settle condition, `elementSelection`, the
  reconcile drop, the "grouped" note, the Close of a link, the folded-end note and the link's `tabindex` were each caught.
- AC-8: replica in the built-in browser (the real stylesheet, the panel from `renderElementsPerspectiveHtml` for a link of a
  folded box, the drawing from `renderDiagramSvg` with a hand layout): light and dark at 300px panel width. The ends, the
  two notes, the three relationship blocks, the pills and the selected (accent, dashed) link and caption read well in both.
- AC-9: `src/doc/README.adoc`, section `[[editor-inspection]]`.

## Findings

- Not confirmed: the real page (File System Access picker); a real ELK drawing (hit area of a thin link, the outline over
  real edges, tab order on a dense map); the tags rows with real tags in the browser (checked by tests on the markup, and the
  rows reuse the element's own); dragging the handle; the Map chips beside the panel.
- A link selection in Elements needed a `focal` and `elementSelection()` because the Elements selection *is* the element
  looked at; any new reader of the selection in a diagram perspective must use `elementSelection()` (TDD DEC-7).
- The Map's by-hand clear of an element in `showDiagramScene` is untouched; the link has its own, `reconcileLinkSelection`.
- Tab stops: links are drawn before the boxes, so Tab visits every link first on a dense map (TDD RISK-1).
