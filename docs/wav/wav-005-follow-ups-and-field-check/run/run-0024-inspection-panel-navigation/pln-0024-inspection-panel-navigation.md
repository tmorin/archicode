---
title: Editor — inspection panel navigation, execution plan
type: pln
status: completed
date: 2026-10-13
run: 0024
wave: 005
related:
  - docs/wav/wav-005-follow-ups-and-field-check/run/run-0024-inspection-panel-navigation/tdd-0024-inspection-panel-navigation.md
---

# 1. Executive Summary

No PRD (profile `TDD+pln`): the requirements are R1-R7 of the TDD (tmorin/archicode#17 items 1, 2, 3, 5 and 6, wave plan row
W-2). This run operates under the `complete-run` autonomy override: no stop on `human_required` by category. No task is
`hard_judgment`: nothing deletes stored data, touches credentials or the kernel.

```yaml
summary:
  status: 'done'
  product_goal: 'From the inspection panel: jump to the declaring element, share a selected link by URL, see which of several parallel links was clicked, and see the stereotype badges in the header of an element'
  technical_approach: 'goto-element reused for a declaring-element button; link-from/link-to in the address, restored through the existing "Reading the link…" and reconcile path; a one-shot reveal through the existing revealDiagramNode; data-nth on twin links and relationship keys (via) in the selection; a shrink-first badge group in the header'
  total_tasks: 6
  parallel_groups: 0
  high_risk_tasks: 0
  human_review_gates: 0
  autonomy_level: 'high'
  recommendation: 'proceed'
  criteria:
    - 'AC-1 each relationship of the link panel offers its declaring element as a native button with an accessible name, whose click is the goto-element case (layer of the drawing), and that is text when the layer lacks the element'
    - 'AC-2 a selected link is in the address (link-from, link-to) where it can live, is restored on load and on hashchange on the Map and over an element in Elements, and a lone parameter, a stale pair or a changed context is ignored or dropped with the address cleaned; Back after a declaring-element jump returns to the link; selecting a link pushes no history entry'
    - 'AC-3 selecting a link on the Map (or opening an address with one) brings it into view once, through revealDiagramNode, and never moves a link already in view; the framing pin of run 0019 and goto-element are unchanged'
    - 'AC-4 two links between the same two boxes carry data-nth, the selection keeps the relationships of the clicked one (not a position), and the panel says how many links join the boxes and marks those relationships in words, or marks nothing when they cannot be told apart; a link on its own keeps its markup'
    - 'AC-5 the header of an element on Details and on each diagram tab shows its styled stereotype badges (the tree markup) after its kind, nothing when it has none, and the actions row, the three container-query states and the existing header tests are unchanged'
    - 'AC-6 the manual [[editor-inspection]] says all of it; the header and the panel were checked on a replica in light and dark, and what that could not confirm is said'
    - 'AC-7 node suite, ./mvnw test and embed.sh --check pass; the kernel block is untouched; the tab-stop model of links is unchanged'
```

# 2. PRD/TDD Consistency Assessment

```yaml
consistency_assessment:
  aligned_items:
    - 'R1 DEC-1; R2 DEC-2; R3 DEC-3; R5 DEC-4; R6 DEC-5; R7 IMP-3, IMP-4, Observability and Verification'
  gaps:
    - id: gap-001
      type: 'ambiguity'
      description: 'No PRD; the requirements come from tmorin/archicode#17, the wave plan row W-2 and the dispatch brief'
      impact: 'low'
      recommendation: 'Traceability marked incomplete in the TDD; nothing to resolve'
  blocking_gaps: []
```

# 3. Execution Graph

```yaml
execution_graph:
  nodes:
    - { id: task-001, status: 'done', title: 'Declaring element button in the link panel', depends_on: [], produces: ['standalone.html JS'], agent_role: 'Frontend Implementation Agent', autonomy: 'autonomous', risk: 'low', confidence: 90 }
    - { id: task-002, status: 'done', title: 'Parallel links: data-nth, via, marks in the panel', depends_on: ['task-001'], produces: ['standalone.html JS and CSS'], agent_role: 'Frontend Implementation Agent', autonomy: 'autonomous', risk: 'medium', confidence: 85 }
    - { id: task-003, status: 'done', title: 'Link in the address: write, read, drop, history', depends_on: ['task-002'], produces: ['standalone.html JS'], agent_role: 'Frontend Implementation Agent', autonomy: 'autonomous', risk: 'medium', confidence: 80 }
    - { id: task-004, status: 'done', title: 'Bring the selected link into view, once', depends_on: ['task-003'], produces: ['standalone.html JS'], agent_role: 'Frontend Implementation Agent', autonomy: 'autonomous', risk: 'medium', confidence: 80 }
    - { id: task-005, status: 'done', title: 'Header badges and their CSS', depends_on: [], produces: ['standalone.html JS and CSS'], agent_role: 'Frontend Implementation Agent', autonomy: 'autonomous', risk: 'medium', confidence: 80 }
    - { id: task-006, status: 'done', title: 'Tests, manual, replica, verification', depends_on: ['task-001', 'task-002', 'task-003', 'task-004', 'task-005'], produces: ['inspection-navigation.test.js', 'README.adoc', 'results'], agent_role: 'QA Agent', autonomy: 'autonomous', risk: 'low', confidence: 85 }
  edges:
    - { from: task-001, to: task-002, reason: 'the marks are drawn by the function that now draws the declaring button' }
    - { from: task-002, to: task-003, reason: 'the address is read into the selection shape that task-002 settles (via is not in the address)' }
    - { from: task-003, to: task-004, reason: 'the address sets the reveal flag the click also sets' }
    - { from: task-001, to: task-006, reason: 'tests assert the markup and the behaviour' }
```

# 4. Task Catalog

```yaml
task_catalog:
  tasks:
    - id: task-001
      title: 'Declaring element button'
      source_requirements: { prd: [], tdd: ['R1', 'DEC-1', 'CTR-3', 'IF-1'] }
      outputs: ['renderDeclaringElementHtml; renderRelationshipInspectionHtml(rel, layer, marked)']
      likely_files: ['src/main/resources/editor-webapp/standalone.html']
      verification: ['inspection-navigation.test.js section 1', 'the three updated assertions of inspection-links.test.js']
      risk: 'low'
      confidence: 90
      human_review: 'none'
      escalation_triggers: ['goto-element would have to change']
      delegation_tier: 'standard'
    - id: task-002
      title: 'Parallel links'
      source_requirements: { prd: [], tdd: ['R5', 'DEC-4', 'CTR-1', 'CTR-3'] }
      outputs: ['relationshipsOfLink, relationshipKeyOf; data-nth in renderDiagramSvg; selectLink(…, nth) with via; the panel note and marks; CSS .inspection-rel-marked / -mark']
      likely_files: ['src/main/resources/editor-webapp/standalone.html']
      verification: ['inspection-navigation.test.js section 4', 'the exact-opening-tag test of inspection-links.test.js unchanged']
      risk: 'medium'
      confidence: 85
      human_review: 'none'
      escalation_triggers: ['the markup of a link without twin would have to change']
      delegation_tier: 'standard'
    - id: task-003
      title: 'Link in the address'
      source_requirements: { prd: [], tdd: ['R2', 'DEC-2', 'CTR-2', 'FLOW-2', 'FLOW-3'] }
      outputs: ['linkInRoute and currentRouteHash; linkFromHash, restoreLinkFromHash; applySelectionFromHashRef = selectFromHashRef + restoreLinkFromHash']
      likely_files: ['src/main/resources/editor-webapp/standalone.html']
      verification: ['inspection-navigation.test.js section 2', 'the two updated address assertions of inspection-links.test.js', 'the existing hash tests (diagram.test.js, ui-fixes.test.js) unchanged']
      risk: 'medium'
      confidence: 80
      human_review: 'none'
      escalation_triggers: ['an existing hash test would have to be loosened']
      delegation_tier: 'standard'
    - id: task-004
      title: 'Reveal'
      source_requirements: { prd: [], tdd: ['R3', 'DEC-3', 'IF-3', 'FLOW-1'] }
      outputs: ['revealLinkAfterDrawing, revealSelectedLink, settleLinkSelection clears it; set by select-link on the Map and by restoreLinkFromHash; called in showDiagramScene']
      likely_files: ['src/main/resources/editor-webapp/standalone.html']
      verification: ['inspection-navigation.test.js section 3 (including revealDiagramNode with a fake canvas)', 'the run 0019 tests of the pin and of showDiagramScene unchanged']
      risk: 'medium'
      confidence: 80
      human_review: 'none'
      escalation_triggers: ['the pin of run 0019 would have to change']
      delegation_tier: 'standard'
    - id: task-005
      title: 'Header badges'
      source_requirements: { prd: [], tdd: ['R6', 'DEC-5', 'TG-3', 'CTR-3'] }
      outputs: ['renderHeaderBadgesHtml in renderElementTitleHtml; .element-header-badges and its tight override']
      likely_files: ['src/main/resources/editor-webapp/standalone.html']
      verification: ['inspection-navigation.test.js section 5', 'header.test.js unchanged and green', 'replica: name width at the states, light and dark']
      risk: 'medium'
      confidence: 80
      human_review: 'none'
      escalation_triggers: ['a header test would have to be loosened']
      delegation_tier: 'standard'
    - id: task-006
      title: 'Tests, manual, replica, verification'
      source_requirements: { prd: [], tdd: ['R7', 'IMP-3', 'IMP-4', 'Observability and Verification'] }
      outputs: ['inspection-navigation.test.js; five updated assertions; README.adoc [[editor-inspection]] and the badge sentence; hand mutations; replica findings; results']
      likely_files: ['src/test/javascript/viewpoint-kernel/inspection-navigation.test.js', 'src/test/javascript/viewpoint-kernel/inspection-links.test.js', 'src/doc/README.adoc']
      verification: ['node suite', './mvnw test (JDK 25)', 'embed.sh --check', 'git diff has no line of the base64 block']
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
  notes: 'One file, each task builds on the previous one (task-005 is independent but edits the same file). Serial.'
```

# 6. Human Review Gates

None. The `complete-run` autonomy override applies; nothing in this run is irreversible (one HTML file, no stored data).

# 7. Risk Assessment

- Run 0025 edits the same link markup next: `data-nth` is additive and only on twins; the tab-stop model of links is not
  touched (TDD RISK-5).
- The header contract (run 0016): badges are label-side only, no new container query, shrink-first group, existing header tests
  unchanged (TDD DEC-5).
- A bad address: handled by the existing wait and reconcile path, tested (TDD RISK-1).

# 8. Confidence Assessment

Overall 80. The least certain points need a real browser: the pan in a real canvas with a real panel, a real hash navigation
with Back/Forward, a screen reader on the declaring button and the badge group.

# 9. Agent Assignment Plan

```yaml
agent_assignment_plan:
  - { task: task-001, suggested_subagent_type: 'general-purpose', suggested_model: null, actual: 'inline' }
  - { task: task-002, suggested_subagent_type: 'general-purpose', suggested_model: null, actual: 'inline' }
  - { task: task-003, suggested_subagent_type: 'general-purpose', suggested_model: null, actual: 'inline' }
  - { task: task-004, suggested_subagent_type: 'general-purpose', suggested_model: null, actual: 'inline' }
  - { task: task-005, suggested_subagent_type: 'general-purpose', suggested_model: null, actual: 'inline' }
  - { task: task-006, suggested_subagent_type: 'general-purpose', suggested_model: null, actual: 'inline' }
```

Tasks 001-006 are tiered `standard` but were worked inline: one file and one design, each task's tests assert the markup of
the previous one, and the replica needs the markup just written (the same deviation as runs 0016-0020 and 0023). The only
dispatch was the KDMLLC review of the TDD (standard tier), which read the committed code.

# 10. Verification Plan

- `node --test "src/test/javascript/**/*.test.js"` (baseline 385 pass, checked before this run's changes).
- `JAVA_HOME=/home/tibo/.sdkman/candidates/java/25.0.4-tem ./mvnw test` (baseline 111).
- `src/main/rust/viewpoint-kernel/embed.sh --check`.
- Hand mutations of the new code, one at a time, the file restored and its hash checked after each.
- The header and the link panel on a replica in the built-in browser (real stylesheet, markup from the harness), light and dark.

# 11. Escalation Rules

Stop only for a genuine blocker (conflicting requirements, missing access, a product tradeoff). The autonomy override of
`complete-run` applies.

# 12. Final Execution Manifest

```yaml
execution_manifest:
  status: 'done'
  criteria:
    - 'AC-1 … AC-7 above all hold'
```

## Results

- KDMLLC review of the TDD (standard tier, read the committed code): 8 findings (5 S2, 3 S1). F1 (the reveal named "the clicked
  one" through `via`, which cannot tell twins with identical relationships) changed the code: the request carries the position
  of the click (`{ nth }`), a test pins identical twins. F2/F3 (the label row's gap costs the name 0.75 rem; the CSS shape and
  placement) changed the CSS (`margin-left: -0.5rem`, tight override with `max-width: 100%; margin-left: 0`) and were measured on
  the replica. F4 (the issue says "centre"): stated as a relaxation of R3 and recorded as Q-1 for the issue's owner. F5 (the
  address is also written by `goToStoryStep`, `openSavedView`, `library-tab`): the guard is stated as a function of the state, with
  a test. F6 (RISK-3 described a flow that does not exist), F7 (reuse `renderReferenceLinkHtml`: done), F8 (0-based `data-nth`,
  top-left anchoring, DEC-6 folded into the verification section): applied.
- AC-1: 'each relationship of the link panel offers its declaring element…', 'the declaring button has an accessible name…', 'a click
  on it selects the element in the layer of the drawing…', 'on the Map the click goes through the same case…', 'an element the
  drawing's layer does not have stays readable text, quoted'.
- AC-2: the address tests of `inspection-navigation.test.js` (write Map and Elements, the guard, read both, ignored where a link
  cannot live, lone or broken parameters, a stale pair dropped and the address cleaned, kept when present, the round trip, no history
  entry on selection, Back after the declaring button, `hashchange`).
- AC-3: 'a click on a link of the Map asks for the link to be brought into view…', 'the pan happens once…', 'with several links…',
  'nothing is brought into view for a selection that is not a link…', 'showDiagramScene brings the link into view after the outlines…',
  'the reveal pans a link that is behind the edge by the least it takes…'; the run 0019 pin tests are unchanged and green.
- AC-4: 'only the links that have a twin say their position…', 'a click on a parallel link keeps the relationships of that link, not
  its position', the three panel tests; the exact-opening-tag test of a link without twin is unchanged.
- AC-5: the header tests of `inspection-navigation.test.js` (four tabs, tree markup, nothing without styled stereotype, actions row
  and other headers unchanged, CSS); `header.test.js` unchanged and green.
- AC-6: README `[[editor-inspection]]` (declaring element, parallel links, the URL, the pan, history, a link the drawing lacks) and the
  stereotype-badge paragraph. Replica (built-in browser, real stylesheet, markup from the harness): 40-character name with four
  badges at 1250/1030/1010/800/790 px: the name kept 292/166/291/156/293 px (never under 9.75 rem), the group shrank to nothing or to
  whole badges, the tight state (790) had two rows with all four badges; mark contrast 5.42 (light) and 7.23 (dark).
- AC-7: `node --test "src/test/javascript/**/*.test.js"` 424 pass, 0 fail (385 + 39); `./mvnw test` (JDK 25) exit 0, 111 tests, 0
  failures, 0 errors; `embed.sh --check` exit 0; no line of the base64 block in the diff; no `tabindex` line in the diff.
- Hand mutations (about thirty, one at a time, restored and hashed each time): every one caught (two were found alive at first,
  an unescaped reference in the button and a missing escape, and got a test).
- Five assertions of `inspection-links.test.js` updated deliberately (three relationship paths, two addresses).
- Not confirmed: the pan with a real canvas and a real panel, a real Back/Forward and hash navigation, a screen reader on the
  declaring button and the badge group, the focus after the declaring-button click (the panel is replaced, the focus falls to the
  body: same as the relationship buttons of Details), the look of the Map beside a real workspace (wave item W-5). The manual was not built.
