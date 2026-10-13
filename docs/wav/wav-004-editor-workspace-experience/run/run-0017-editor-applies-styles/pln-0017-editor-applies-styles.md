---
title: Editor — the workspace styles drawn by the editor, execution plan
type: pln
status: completed
date: 2026-10-13
run: 0017
wave: 004
related:
  - docs/wav/wav-004-editor-workspace-experience/run/run-0017-editor-applies-styles/tdd-0017-editor-applies-styles.md
---

# 1. Executive Summary

No PRD (profile `TDD+pln`): the requirements are R1-R6 of the TDD. This run operates under the `complete-run` autonomy
override (no stop on `human_required` by category; none of its tasks carries that tier).

```yaml
summary:
  status: 'done'
  product_goal: 'See in the editor what the workspace styled: new, changed, external'
  technical_approach: 'One block of pure functions (colour, style, look), drawn through CSS custom properties on the box, shared by the diagram, the trees, the legend and the export'
  total_tasks: 8
  parallel_groups: 1
  high_risk_tasks: 0
  human_review_gates: 0
  autonomy_level: 'high'
  recommendation: 'proceed'
  criteria:
    - 'AC-1 a box with a styled stereotype is drawn with its fill, stroke and the other properties, in the editor SVG and in the exported SVG, and carries a text badge with the stereotype name'
    - 'AC-2 the Elements tree rows, the Map scope rows and the legend carry the same badge look; modified-dot is untouched'
    - 'AC-3 the text colour reaches a contrast of 4.5 on any custom fill whatever the theme; no dark variant of styles'
    - 'AC-4 nothing is hard-coded to new / changed / external; the mapping is read from the workspace styles; a hostile value never reaches the markup'
    - 'AC-5 a box with no styled stereotype is drawn as before'
    - 'AC-6 node tests, ./mvnw test and embed.sh --check pass; the kernel block of standalone.html is untouched'
    - 'AC-7 the look was seen in a real browser on a replica in light and dark, and what that could not confirm is said'
    - 'AC-8 the manual describes what the editor draws, the precedence rules and the dark-theme decision'
```

# 2. PRD/TDD Consistency Assessment

```yaml
consistency_assessment:
  aligned_items:
    - 'R1-R6 (TDD, PRD Traceability) each map to a DEC (R1 DEC-2/4/5, R2 DEC-6, R3 DEC-6/7/8, R4 DEC-3, R5 DEC-1, R6 DEC-7)'
  gaps:
    - id: gap-001
      type: 'ambiguity'
      description: 'No PRD; the requirements come from the wave plan row W-6 and the dispatch brief'
      impact: 'low'
      recommendation: 'Traceability marked incomplete in the TDD; nothing to resolve'
  blocking_gaps: []
```

# 3. Execution Graph

```yaml
execution_graph:
  nodes:
    - { id: task-001, status: 'done', title: 'Style block: colours, contrast, style lookup, look of a stereotype list', depends_on: [], produces: ['standalone.html JS'], agent_role: 'Frontend Implementation Agent', autonomy: 'autonomous', risk: 'medium', confidence: 85 }
    - { id: task-002, status: 'done', title: 'Diagram: item text, leaf and compound layout, SVG, CSS', depends_on: ['task-001'], produces: ['standalone.html JS and CSS'], agent_role: 'Frontend Implementation Agent', autonomy: 'autonomous', risk: 'medium', confidence: 80 }
    - { id: task-003, status: 'done', title: 'Trees, legend, badge CSS', depends_on: ['task-001'], produces: ['standalone.html JS and CSS'], agent_role: 'Frontend Implementation Agent', autonomy: 'autonomous', risk: 'low', confidence: 85 }
    - { id: task-004, status: 'done', title: 'Export CSS and diagram cache key', depends_on: ['task-002'], produces: ['standalone.html JS'], agent_role: 'Frontend Implementation Agent', autonomy: 'autonomous', risk: 'low', confidence: 85 }
    - { id: task-005, status: 'done', title: 'Tests: styles.test.js', depends_on: ['task-002', 'task-003', 'task-004'], produces: ['styles.test.js'], agent_role: 'Test Generation Agent', autonomy: 'autonomous', risk: 'low', confidence: 80 }
    - { id: task-006, status: 'done', title: 'Manual: what the editor draws', depends_on: ['task-004'], produces: ['README.adoc'], agent_role: 'Documentation Agent', autonomy: 'autonomous', risk: 'low', confidence: 90 }
    - { id: task-007, status: 'done', title: 'Look at it in a browser on a replica, light and dark', depends_on: ['task-004'], produces: ['findings'], agent_role: 'QA Agent', autonomy: 'autonomous', risk: 'low', confidence: 75 }
    - { id: task-008, status: 'done', title: 'Verification and close-out', depends_on: ['task-005', 'task-006', 'task-007'], produces: ['results'], agent_role: 'QA Agent', autonomy: 'autonomous', risk: 'low', confidence: 85 }
  edges:
    - { from: task-001, to: task-002, reason: 'the diagram draws what the block computes' }
    - { from: task-001, to: task-003, reason: 'the trees use the same block' }
    - { from: task-002, to: task-004, reason: 'the export carries the diagram rules' }
    - { from: task-004, to: task-005, reason: 'test what exists' }
    - { from: task-004, to: task-006, reason: 'the manual describes what exists' }
    - { from: task-004, to: task-007, reason: 'look at what exists' }
    - { from: task-005, to: task-008, reason: 'verify the whole' }
    - { from: task-006, to: task-008, reason: 'verify the whole' }
    - { from: task-007, to: task-008, reason: 'verify the whole' }
```

# 4. Task Catalog

```yaml
task_catalog:
  tasks:
    - id: task-001
      title: 'Style block'
      source_requirements: { prd: [], tdd: ['R1', 'R4', 'R5', 'DEC-2', 'DEC-3', 'DEC-4', 'TG-2', 'TG-3'] }
      outputs: ['parseCssColor, cssColorOf, contrastRatio, readableTextColor, stereotypeStyleOf, stereotypeLookOf, stereotypeBadgeOf, stereotypesOfRecord'] 
      verification: ['node check of the functions on the three colours of the user and on every CSS name', 'review of the diff']
      risk: 'medium'
      confidence: 85
      human_review: 'none'
      escalation_triggers: ['a name of the table is wrong']
      delegation_tier: 'standard'
    - id: task-002
      title: 'Diagram'
      source_requirements: { prd: [], tdd: ['R1', 'R2', 'DEC-5', 'DEC-6', 'CON-2', 'TG-4', 'CTR-3'] }
      outputs: ['diagramItemText, diagramLeafLayout, buildElkGraph, renderDiagramSvg, the .dg-styled / .dg-badge / .dg-shadow rules']
      verification: ['existing diagram tests green unchanged', 'the unstyled box is byte for byte as before']
      risk: 'medium'
      confidence: 80
      human_review: 'none'
      escalation_triggers: ['an existing assertion would have to be loosened']
      delegation_tier: 'standard'
    - id: task-003
      title: 'Trees and legend'
      source_requirements: { prd: [], tdd: ['R3', 'R6', 'DEC-7'] }
      outputs: ['renderTreeNodeHtml, renderMapScopeNodeHtml, diagramLegendHtml and its call site, .stereotype-badge']
      verification: ['existing tests green', 'rows of an unstyled element unchanged']
      risk: 'low'
      confidence: 85
      human_review: 'none'
      escalation_triggers: []
      delegation_tier: 'standard'
    - id: task-004
      title: 'Export and cache'
      source_requirements: { prd: [], tdd: ['R3', 'DEC-8', 'DEC-9', 'CON-3'] }
      outputs: ['diagramExportCss, the cache key of mountDiagramIfNeeded']
      verification: ['the export document of a styled box holds the rules and the inline variables']
      risk: 'low'
      confidence: 85
      human_review: 'none'
      escalation_triggers: []
      delegation_tier: 'standard'
    - id: task-005
      title: 'styles.test.js'
      source_requirements: { prd: [], tdd: ['AC-1 to AC-5', 'Observability and Verification'] }
      outputs: ['src/test/javascript/viewpoint-kernel/styles.test.js']
      verification: ['node --test; mutation checks by hand on two behaviours']
      risk: 'low'
      confidence: 80
      human_review: 'none'
      escalation_triggers: ['the code contradicts the TDD']
      delegation_tier: 'standard'
    - id: task-006
      title: 'Manual'
      source_requirements: { prd: [], tdd: ['IMP-3', 'DEC-2', 'DEC-3', 'DEC-4'] }
      outputs: ['the section "Stereotypes and styles" extended, a short editor section in src/doc/README.adoc']
      verification: ['reading; the anchors do not clash']
      risk: 'low'
      confidence: 90
      human_review: 'none'
      escalation_triggers: []
      delegation_tier: 'cheap'
    - id: task-007
      title: 'Browser replica'
      source_requirements: { prd: [], tdd: ['TG-2', 'Observability and Verification'] }
      outputs: ['findings in the pln']
      verification: ['screenshots in light and dark of the user\'s three styles, boxes and rows']
      risk: 'low'
      confidence: 75
      human_review: 'none'
      escalation_triggers: []
      delegation_tier: 'standard'
    - id: task-008
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
      reason: 'different files (styles.test.js, README.adoc)'
      conflict_risks: ['none: the manual is not read by the tests']
```

Tasks 001-004 are sequential: they edit the same file and share one design.

# 6. Human Review Gates

```yaml
human_review_gates:
  gates: []
```

Autonomy override: this run is executed under `complete-run`'s override. No task is `human_required`. The only
reviewer-focus item left for a person is DEF-1 of the TDD (a human look at the page with the user's workspace, and a
comparison with the PlantUML of the CLI), which is not a completion criterion.

# 7. Risk Assessment

```yaml
risk_assessment:
  by_task:
    - { id: task-001, risk: 'medium', rationale: 'a wrong table entry or contrast formula gives unreadable text; checked on numbers' }
    - { id: task-002, risk: 'medium', rationale: 'layout and drawing must agree on the height of a box, and ELK is not available to the harness' }
  by_area:
    - { area: 'ui', risk: 'medium', rationale: 'the editor cannot be opened here; checked on a replica and by tests of the markup and of the CSS text' }
```

# 8. Confidence Assessment

```yaml
confidence_assessment:
  by_task:
    - { id: task-001, score: 85, rationale: 'pure functions, testable on numbers' }
    - { id: task-002, score: 80, rationale: 'the cascade is only verified on a replica' }
    - { id: task-005, score: 80, rationale: 'the behaviours to pin are decided in the TDD' }
```

# 9. Agent Assignment Plan

```yaml
agent_assignment_plan:
  assignments:
    - task_id: task-005
      agent_role: 'Test Generation Agent'
      objective: 'Write styles.test.js for the behaviours listed under Observability and Verification of the TDD'
      context:
        prd_excerpts: []
        tdd_excerpts: ['DEC-1 to DEC-9', 'CTR-3', 'Observability and Verification']
      likely_files: ['src/test/javascript/viewpoint-kernel/styles.test.js']
      acceptance_criteria: ['AC-1 to AC-5']
      verification: ['node --test src/test/javascript/viewpoint-kernel/styles.test.js']
      escalation_triggers: ['the code contradicts the TDD: report, do not edit standalone.html']
      suggested_subagent_type: 'general-purpose'
      suggested_model: '(default)'
    - task_id: task-006
      agent_role: 'Documentation Agent'
      objective: 'Extend the manual: the stereotypes and styles section, and the editor'
      context: { prd_excerpts: [], tdd_excerpts: ['DEC-2', 'DEC-3', 'DEC-4', 'DEC-6', 'DEC-7'] }
      likely_files: ['src/doc/README.adoc']
      acceptance_criteria: ['AC-8']
      verification: ['reading']
      escalation_triggers: []
      suggested_subagent_type: 'general-purpose'
      suggested_model: 'haiku'
```

Tasks 001-004 are worked inline by this session although tiered `standard`: they are one design in one file, and a
subagent would need the whole TDD and the file to do them, then be verified line by line by this session (the same
choice as run 0016, recorded here as a deliberate deviation from "dispatch standard tasks"). Tasks 005 and 006 are
dispatched. Task 007 needs the browser tools of this session; task 008 is this session's own check.

# 10. Verification Plan

```yaml
verification_plan:
  checks:
    - task_id: task-005
      methods: ['node --test "src/test/javascript/**/*.test.js"']
      success_criteria: ['all pass; the baseline of 251 plus the new tests']
    - task_id: task-008
      methods: ['JAVA_HOME=/home/tibo/.sdkman/candidates/java/25.0.4-tem ./mvnw test', 'src/main/rust/viewpoint-kernel/embed.sh --check', 'git diff review: no change to the base64 kernel block']
      success_criteria: ['0 failures', 'exit 0', 'kernel block untouched']
```

# 11. Escalation Rules

```yaml
escalation_rules:
  rules:
    - { condition: 'an existing assertion would have to be loosened', action: 'stop and change the implementation instead' }
    - { condition: 'the kernel would have to change', action: 'out of scope: record it as a finding for the wave' }
```

# 12. Final Execution Manifest

```yaml
execution_manifest:
  status: 'done'
  recommendation: 'proceed'
  autonomy_level: 'high'
  total_tasks: 8
  autonomous_tasks: 8
  review_before_tasks: 0
  review_after_tasks: 0
  human_required_tasks: 0
  blocked_tasks: 0
  critical_path_tasks: ['task-001', 'task-002', 'task-004', 'task-005', 'task-008']
  parallel_groups: ['parallel-group-001']
  required_human_gates: []
  highest_risk_tasks: ['task-001', 'task-002']
  lowest_confidence_tasks: ['task-007']
  next_action: 'none: every criterion holds (see Results)'
  criteria:
    - 'AC-1 to AC-8 of the Executive Summary hold'
```

## Results

Run on 2026-10-13, JDK 25 (`JAVA_HOME=/home/tibo/.sdkman/candidates/java/25.0.4-tem`):

- `node --test "src/test/javascript/**/*.test.js"`: 288 pass, 0 fail (baseline 251; 37 new in `styles.test.js`; two
  assertions of `diagram.test.js` changed on purpose, see Findings).
- `./mvnw test`: 107 tests, 0 failures, 0 errors (baseline 107).
- `src/main/rust/viewpoint-kernel/embed.sh --check`: exit 0; the base64 kernel block of `standalone.html` is not in the diff.
- Mutation checks by the test agent (file restored each time, `cmp` identical): the contrast fallback always black (4
  tests fail), the merge order of stereotypes reversed (2), the styles removed from the cache key (1).
- Looked at in the built-in Chromium browser pane on a replica (a throwaway page: the SVG, the tree rows and the
  legend the editor's own functions produce for `external`, `new`, `changed` as the user styles them plus a dark fill, a
  mid grey with a dashed thick line and an italic rounded shadowed box, with the real stylesheet), `data-theme` light
  and dark. Computed styles read in the page: the badge border falls back to the theme's `--border` where a style has
  no `line-color` (`--st-stroke: initial` works), pills take their own fill and a black text on a pale or grey fill.

| Criterion | Evidence |
|-----------|----------|
| AC-1 | `styles.test.js` (box markup, variables, pills, `rx`, export CSS and document); the replica |
| AC-2 | `styles.test.js` (Elements and Map scope rows, `modified-dot` next to the badge, legend); the replica |
| AC-3 | `styles.test.js` (contrast of 4.5 on every CSS name and on the user's colours; same look in light and dark; no `--st-` variable in the dark blocks); no dark variant added |
| AC-4 | `styles.test.js` (a made-up stereotype works the same way; hostile values and names never reach the markup) |
| AC-5 | `styles.test.js` (an unstyled box and an unstyled row are byte for byte what they were) |
| AC-6 | suites above; `git diff` has no change to the kernel block |
| AC-7 | replica, light and dark; what it could not confirm is below |
| AC-8 | `README.adoc`: "In the editor." in "Stereotypes and styles", and a pointer in "Elements" |

Not confirmed: the real editor page (File System Access picker); ELK laying out the grown boxes (the harness has no
ELK: widths and heights are computed by the same functions the layout and the drawing share, and the replica placed
boxes by hand); hover, focus and selection outlines winning over a custom stroke (read from rule order, tested as
CSS text, not seen); the PNG export; PlantUML parity of `line-style` and `round-corner` (ASM-4); the manual build with Asciidoctor.

## Findings

- A light chevron (the fold button, a sibling of the box and not inside it) was invisible on a pale fill in the dark
  theme: found on the replica, fixed by giving the button the box's `--st-text`.
- Two existing assertions of `diagram.test.js` changed on purpose: the spoken label of the tree rows of the fixture's
  `external` elements now carries the stereotype ("Mail Provider, external, hidden", "Payment Provider, external,
  modified"). Nothing was loosened.
- Review of the TDD (dispatched, standard tier): Acceptable. Applied: contrast fallback is pure black/white (a `#111`
  would fall to 4.37 on a mid grey), compounds and the folded stack are specified, the CLI divergences (kind and
  `atomic` / `composite` as keys; `font-color` without a background) are written down, ASM-4 marked unchecked,
  dangling references fixed. Not applied: dropping `shadowing` (the review said the CLI ignores it; it does not:
  `StyleShapeRenderer` emits `skinparam ...Shadowing<<stereotype>> true`).
- The CLI orders its styles through a `HashSet` (`PlantumlViewRenderer`): two styled stereotypes on one box give an
  undefined winner there; the editor is deterministic (DEC-2). Candidate for a later run (TDD DEF-3).
- A parallel agent restoring a file copy over a concurrent edit is a hazard of dispatching a test agent that does
  mutation checks on the same file: the fold-button fix had to be applied twice.
