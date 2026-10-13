---
title: Editor — the centre header holds together at any width, execution plan
type: pln
status: completed
date: 2026-10-13
run: 0016
wave: 004
related:
  - docs/wav/wav-004-editor-workspace-experience/run/run-0016-center-header-responsive/tdd-0016-center-header-responsive.md
---

# 1. Executive Summary

No PRD (profile `TDD+pln`): the requirements are R1-R5 of the TDD. The plan says how they were realised and checked. This
run operates under the `complete-run` autonomy override (no stop on `human_required` by category; none of its tasks
carries that tier). The implementation of T1-T3 was written **before** this plan, as a prototype: the breakpoints
(DEC-2) can only be answered by measuring a real layout, so the CSS and the markup had to exist first. The plan records
them as done with their evidence.

```yaml
summary:
  status: 'done'
  product_goal: 'The header of the centre panel holds together whatever the width of the panel'
  technical_approach: 'Container queries on .center-panel, one DOM for every state, a popover for the rarely used actions'
  total_tasks: 7
  parallel_groups: 1
  high_risk_tasks: 0
  human_review_gates: 0
  autonomy_level: 'high'
  recommendation: 'proceed'
  criteria:
    - 'AC-1 each of full / compact / minimal / tight is a container query on .center-panel, after the base header rules'
    - 'AC-2 every diagram header (Elements, Map) holds its actions once: the ones that go in the menu are inside .header-overflow, Facet and Maximize are not'
    - 'AC-3 the menu opens and closes without a redraw, closes on Esc, a click outside and an item, and keeps aria-expanded true to its state'
    - 'AC-4 the focus ends on a visible control after an item is used and after the dialog it opens'
    - 'AC-5 no overflow-x strip in .element-header-actions and no viewport @media on the header'
    - 'AC-6 the existing header tests are updated, not loosened; node tests, ./mvnw test and embed.sh --check pass'
    - 'AC-7 the rendering was measured in a real browser on a replica, and what it could not confirm is said'
```

# 2. PRD/TDD Consistency Assessment

```yaml
consistency_assessment:
  aligned_items:
    - 'R1-R5 (TDD, PRD Traceability) each map to a DEC or CTR (R1 DEC-8, R2 DEC-2/5, R3 DEC-3/4, R4 DEC-8, R5 DEC-1/7)'
  gaps:
    - id: gap-001
      type: 'ambiguity'
      description: 'No PRD; the requirements come from the wave plan row W-2 and the decisions of the progress log'
      impact: 'low'
      recommendation: 'Traceability marked incomplete in the TDD; nothing to resolve'
  blocking_gaps: []
```

# 3. Execution Graph

```yaml
execution_graph:
  nodes:
    - { id: task-001, status: 'done', title: 'CSS: container states, popover, two-row fallback, strip removed', depends_on: [], produces: ['standalone.html CSS'], agent_role: 'Frontend Implementation Agent', autonomy: 'autonomous', risk: 'medium', confidence: 85 }
    - { id: task-002, status: 'done', title: 'Markup and JS: header actions, menu state, focus', depends_on: [], produces: ['standalone.html JS'], agent_role: 'Frontend Implementation Agent', autonomy: 'autonomous', risk: 'medium', confidence: 85 }
    - { id: task-003, status: 'done', title: 'Measure the states in a browser on a replica', depends_on: ['task-001', 'task-002'], produces: ['breakpoints, findings'], agent_role: 'QA Agent', autonomy: 'autonomous', risk: 'low', confidence: 80 }
    - { id: task-004, status: 'done', title: 'Update the existing header tests deliberately', depends_on: ['task-002'], produces: ['diagram.test.js'], agent_role: 'Test Generation Agent', autonomy: 'autonomous', risk: 'low', confidence: 90 }
    - { id: task-005, status: 'done', title: 'New DOM-level tests per state (header.test.js)', depends_on: ['task-001', 'task-002', 'task-004'], produces: ['header.test.js'], agent_role: 'Test Generation Agent', autonomy: 'autonomous', risk: 'low', confidence: 80 }
    - { id: task-006, status: 'done', title: 'Manual: a paragraph on the header', depends_on: ['task-003'], produces: ['README.adoc'], agent_role: 'Documentation Agent', autonomy: 'autonomous', risk: 'low', confidence: 90 }
    - { id: task-007, status: 'done', title: 'Verification and close-out', depends_on: ['task-005', 'task-006'], produces: ['results'], agent_role: 'QA Agent', autonomy: 'autonomous', risk: 'low', confidence: 85 }
  edges:
    - { from: task-001, to: task-003, reason: 'measure what exists' }
    - { from: task-002, to: task-003, reason: 'measure what exists' }
    - { from: task-002, to: task-004, reason: 'the markup is what the old tests read' }
    - { from: task-004, to: task-005, reason: 'one test file at a time' }
    - { from: task-003, to: task-006, reason: 'the manual quotes the states' }
    - { from: task-005, to: task-007, reason: 'verify the whole' }
    - { from: task-006, to: task-007, reason: 'verify the whole' }
```

# 4. Task Catalog

```yaml
task_catalog:
  tasks:
    - id: task-001
      title: 'CSS states'
      source_requirements: { prd: [], tdd: ['R1', 'R2', 'R4', 'DEC-2', 'DEC-3', 'DEC-5', 'DEC-8', 'CON-3', 'CON-4'] }
      outputs: ['the header block after .element-header-actions in standalone.html']
      verification: ['replica in a real browser: no overflow from 240 to 1500px, states change at 85/60/46rem']
      risk: 'medium'
      confidence: 85
      human_review: 'none'
      escalation_triggers: ['a state does not apply because of rule order']
      delegation_tier: 'standard'
    - id: task-002
      title: 'Markup and JS'
      source_requirements: { prd: [], tdd: ['R3', 'R5', 'DEC-1', 'DEC-4', 'DEC-5', 'DEC-6', 'DEC-7', 'CTR-1'] }
      outputs: ['renderDiagramHeaderActionsHtml, setHeaderMenuOpen, focusControl, click/keydown handling']
      verification: ['node tests', 'review of the diff']
      risk: 'medium'
      confidence: 85
      human_review: 'none'
      escalation_triggers: ['a test needs loosening']
      delegation_tier: 'standard'
    - id: task-003
      title: 'Measure'
      source_requirements: { prd: [], tdd: ['DEC-2'] }
      outputs: ['the table of limits in the TDD']
      verification: ['sweep of widths with a 40-character name']
      risk: 'low'
      confidence: 80
      human_review: 'none'
      escalation_triggers: []
      delegation_tier: 'standard'
    - id: task-004
      title: 'Existing tests'
      source_requirements: { prd: [], tdd: ['R5'] }
      outputs: ['the maximize-label assertions, the actions-row extraction in the tabs test']
      verification: ['node tests green, assertions as strict as before']
      risk: 'low'
      confidence: 90
      human_review: 'none'
      escalation_triggers: []
      delegation_tier: 'standard'
    - id: task-005
      title: 'header.test.js'
      source_requirements: { prd: [], tdd: ['AC-1', 'AC-2', 'AC-3', 'AC-4', 'AC-5', 'Observability and Verification'] }
      outputs: ['src/test/javascript/viewpoint-kernel/header.test.js']
      verification: ['node --test; each test fails when the behaviour it tests is broken (mutation check by hand on two)']
      risk: 'low'
      confidence: 80
      human_review: 'none'
      escalation_triggers: ['a behaviour of the code contradicts the TDD']
      delegation_tier: 'standard'
    - id: task-006
      title: 'Manual'
      source_requirements: { prd: [], tdd: ['IMP-3'] }
      outputs: ['a section in src/doc/README.adoc']
      verification: ['reading; the anchor does not clash']
      risk: 'low'
      confidence: 90
      human_review: 'none'
      escalation_triggers: []
      delegation_tier: 'cheap'
    - id: task-007
      title: 'Verification'
      source_requirements: { prd: [], tdd: ['Observability and Verification'] }
      outputs: ['results in this plan, run status completed']
      verification: ['node tests', './mvnw test', 'embed.sh --check', 'diff review']
      risk: 'low'
      confidence: 85
      human_review: 'none'
      escalation_triggers: ['a red check']
      delegation_tier: 'standard'
```

# 5. Parallelization Plan

```yaml
parallelization_plan:
  groups:
    - id: parallel-group-001
      tasks: ['task-005', 'task-006']
      reason: 'different files (header.test.js, README.adoc)'
      conflict_risks: ['none: the manual is not read by the new tests']
```

Everything else is sequential: one file, `standalone.html`, and one test directory.

# 6. Human Review Gates

```yaml
human_review_gates:
  gates: []
```

Autonomy override: this run is executed under `complete-run`'s override. No task is `human_required`; the only
reviewer-focus item left for a person is DEF-3 of the TDD (a human look at the page in Chromium at several widths, light
and dark), which is not a completion criterion.

# 7. Risk Assessment

```yaml
risk_assessment:
  by_task:
    - { id: task-001, risk: 'medium', rationale: 'a CSS rule-order slip disables a state and no layout engine is in the node harness' }
    - { id: task-002, risk: 'medium', rationale: 'the focus and the menu state interact with a full re-render' }
    - { id: task-005, risk: 'low', rationale: 'tests only' }
  by_area:
    - { area: 'ui', risk: 'medium', rationale: 'the editor cannot be opened here; checked on a replica and by tests of the markup and of the CSS text' }
```

# 8. Confidence Assessment

```yaml
confidence_assessment:
  by_task:
    - { id: task-001, score: 85, rationale: 'measured on a real layout' }
    - { id: task-002, score: 85, rationale: 'the help menu is the model' }
    - { id: task-005, score: 80, rationale: 'the behaviours to pin are decided in the TDD' }
```

# 9. Agent Assignment Plan

```yaml
agent_assignment_plan:
  assignments:
    - task_id: task-005
      agent_role: 'Test Generation Agent'
      objective: 'Write header.test.js: markup per header and per perspective, the CSS text per state, the menu behaviour, the focus'
      context:
        prd_excerpts: []
        tdd_excerpts: ['DEC-1 to DEC-8', 'CTR-1', 'Observability and Verification']
      likely_files: ['src/test/javascript/viewpoint-kernel/header.test.js']
      acceptance_criteria: ['AC-1 to AC-5']
      verification: ['node --test src/test/javascript/viewpoint-kernel/header.test.js']
      escalation_triggers: ['the code contradicts the TDD: report, do not edit standalone.html']
      suggested_subagent_type: 'general-purpose'
      suggested_model: '(default)'
    - task_id: task-006
      agent_role: 'Documentation Agent'
      objective: 'A short manual section on the states of the header'
      context: { prd_excerpts: [], tdd_excerpts: ['Proposed Design table'] }
      likely_files: ['src/doc/README.adoc']
      acceptance_criteria: ['AC-7 documented']
      verification: ['reading']
      escalation_triggers: []
      suggested_subagent_type: 'general-purpose'
      suggested_model: '(default)'
```

Tasks 001-004 were done by this session before the plan existed (see Executive Summary); task-003's browser
measurement needed the MCP browser tools of this session, and the instructions of task-004 were bound to the prototype.
Task-007 is this session's own check of the others' work.

# 10. Verification Plan

```yaml
verification_plan:
  checks:
    - task_id: task-005
      methods: ['node --test "src/test/javascript/**/*.test.js"']
      success_criteria: ['all pass; the baseline of 222 plus the new tests']
    - task_id: task-007
      methods: ['JAVA_HOME=/home/tibo/.sdkman/candidates/java/25.0.4-tem ./mvnw test', 'src/main/rust/viewpoint-kernel/embed.sh --check', 'git diff review: no change to the base64 kernel block']
      success_criteria: ['0 failures', 'exit 0', 'kernel block untouched']
```

# 11. Escalation Rules

```yaml
escalation_rules:
  rules:
    - { condition: 'a test of the existing header would have to be loosened', action: 'stop and change the markup instead' }
    - { condition: 'a state cannot be made to apply without a viewport media query', action: 'record it in the TDD and report it' }
```

# 12. Final Execution Manifest

```yaml
execution_manifest:
  status: 'done'
  recommendation: 'proceed'
  autonomy_level: 'high'
  total_tasks: 7
  autonomous_tasks: 7
  review_before_tasks: 0
  review_after_tasks: 0
  human_required_tasks: 0
  blocked_tasks: 0
  critical_path_tasks: ['task-001', 'task-002', 'task-005', 'task-007']
  parallel_groups: ['parallel-group-001']
  required_human_gates: []
  highest_risk_tasks: ['task-001', 'task-002']
  lowest_confidence_tasks: ['task-005']
  next_action: 'none: every criterion holds (see Results)'
  criteria:
    - 'AC-1 to AC-7 of the Executive Summary hold'
```

## Results

Run on 2026-10-13, JDK 25 (`JAVA_HOME=/home/tibo/.sdkman/candidates/java/25.0.4-tem`):

- `node --test "src/test/javascript/**/*.test.js"`: 251 pass, 0 fail (baseline 222; 29 new in `header.test.js`).
- `./mvnw test`: 107 tests, 0 failures, 0 errors (baseline 107).
- `src/main/rust/viewpoint-kernel/embed.sh --check`: exit 0; the base64 kernel block of `standalone.html` is not in the diff.
- Mutation checks by hand on the page (restored from a copy each time, `git diff` identical afterwards): changing the
  minimal limit, breaking the tight-state selector, dropping the focus-to-button on an item click, and showing the "⋯"
  button in the base rules each make `header.test.js` fail (3, 1, 2 and 1 tests).
- Measured in the built-in Chromium browser pane on a replica (the markup of the harness plus the real stylesheet, a
  throwaway page): widths 240-1500px, name of 40 characters; light and dark (`prefers-color-scheme` emulation) looked at
  in the minimal state with the popup open, and the compact state in light. Header height and overflow were read at each
  width: no overflow from 320px up (at 280px the tabs overflow by 7px, at 240px by 47px: the panel is narrower than the
  tabs themselves), the two-row fallback starts at 46rem.

| Criterion | Evidence |
|-----------|----------|
| AC-1 | `header.test.js` (container, three queries in order, after the base rules); the replica |
| AC-2 | `header.test.js` (Elements and Map headers, overflow content, one copy of each control) |
| AC-3 | `header.test.js` (open/close without render, click outside/inside, Esc, `aria-expanded`, state across a redraw, a stale state) |
| AC-4 | `header.test.js` (`focusControl`, `returnFocus` of the dialog is the "⋯" button when the menu is in use) |
| AC-5 | `header.test.js` (no `overflow-x` in any rule naming `element-header-actions`, no viewport `@media` on the header) |
| AC-6 | `diagram.test.js`: the two `maximize-label` assertions now read `control-label`, the actions row of the tabs test is cut by depth (its old regex stopped at the first `</div></div>`); no assertion weakened; suites above |
| AC-7 | measured on a replica; what it could not confirm is below |

Not confirmed: the real editor page (File System Access picker): the sticky header over a real diagram, the Map's
chips under the open popup (`z-index` raised by `:has()` is read from the CSS, not seen), a dragged resize, touch, the
popup staying inside the panel at the narrowest widths, the compact state in dark. Container queries cannot be run by
the node harness: the tests read the markup and the CSS text.

## Findings

- A container query adds no specificity: a first prototype put the container block before the base `.element-header`
  rules and the two-row fallback silently did not apply; the new test pins the order.
- The estimates of the wave plan (1150/950/700) would have left the longest header's name under 8rem; the measured
  limits are 85rem / 60rem / 46rem of content width (`.center-panel` content, the panel minus its 1.75rem padding).
- The Facet moved to the front of the actions (DEC-4), to keep the controls of the menu contiguous.
- Review of the TDD (dispatched, standard tier): Acceptable; four S2 and four S1 findings applied (a stale open state
  cleared at workspace load and ignored by Escape when the button is not drawn; the wide-state wording of FLOW-2; one
  measurement basis; the "More actions" group name in wide states; TG-1 narrowed to the diagram headers).
- The tasks were not worked strictly in plan order: the CSS and markup (tasks 001-002) came first, as a prototype
  needed to measure the limits, then the TDD and this plan.
