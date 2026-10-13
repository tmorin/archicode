---
title: Editor — the Library view panels, execution plan
type: pln
status: completed
date: 2026-10-13
run: 0028
wave: 006
related:
  - docs/wav/wav-006-library-view-editor/run/run-0028-library-view-panels/tdd-0028-library-view-panels.md
---

# 1. Executive Summary

No PRD (profile `TDD+pln`): the requirements are R1-R9 of the TDD (row W-2 of wave 006, its P1 gate criterion, the dispatch brief). This
run operates under the `complete-run` autonomy override: no stop on `human_required` by category. No task is `hard_judgment`: nothing
deletes stored data, touches credentials or the kernel, and every file is under version control.

```yaml
summary:
  status: 'done'
  product_goal: 'Read the attributes of a view, and of the box or link selected in it, in the right-hand panel of the Library page, without leaving it'
  technical_approach: 'the page returns a right region (the view, then the selection); the selection is the page own (libraryPick) and the drawing actions select on it; Maximize through the host swap; the manual describes the page'
  total_tasks: 6
  parallel_groups: 1
  high_risk_tasks: 1
  human_review_gates: 0
  autonomy_level: 'high'
  recommendation: 'proceed'
  criteria:
    - 'AC-1 the right-hand panel of the page of a drawable view lists the attributes of the view (what it draws, viewpoint, layer, element or pins, facet, hide-unlinked, texts, the file that keeps it, the steps that show it) and the centre no longer holds them'
    - 'AC-2 a click on a box shows the inspection panel of that element, a click on a link the link panel, in the same panel, with the perspective and the address unchanged'
    - 'AC-3 the selection of the page is never written to the Map and Elements: after a visit with boxes and links selected, closed, and the diagram maximized and restored, their state and the address are what they were'
    - 'AC-4 the steps that show the view lead to their story; Show in Elements in the element panel leads to the element in Elements'
    - 'AC-5 the panel is the shell panel (resize handle, remembered width) and is absent while the page is maximized; Maximize is the page own'
    - 'AC-6 a view that cannot be drawn keeps its message, its facts and its steps in the centre and has no canvas and no right region'
    - 'AC-7 the manual describes the page (diagram in the centre, attributes and inspection on the right)'
    - 'AC-8 node suite and ./mvnw test pass; embed.sh --check passes and the kernel block is untouched'
```

# 2. PRD/TDD Consistency Assessment

```yaml
consistency_assessment:
  aligned_items:
    - 'R1 DEC-5, DEC-6; R2 DEC-1; R3 DEC-2, DEC-3; R4 DEC-2, DEC-3, DEC-5; R5 DEC-1; R6 DEC-4; R7 DEC-6; R8 DEC-1; R9 IMP-4'
  gaps:
    - id: gap-001
      type: 'ambiguity'
      description: 'No PRD; the requirements come from the wave plan row W-2, its gate criterion and the dispatch brief'
      impact: 'low'
      recommendation: 'Traceability marked incomplete in the TDD; nothing to resolve'
  blocking_gaps: []
```

# 3. Execution Graph

```yaml
execution_graph:
  nodes:
    - { id: task-001, status: 'done', title: 'The right region: the view section, the selection state, the shell label, CSS (details block removed)', depends_on: [], produces: ['standalone.html JS and CSS'], agent_role: 'Frontend Implementation Agent', autonomy: 'autonomous', risk: 'medium', confidence: 85 }
    - { id: task-002, status: 'done', title: 'Selecting on the page: drawing actions, handlers, marks, reconcile, close, Escape, Open in Elements', depends_on: ['task-001'], produces: ['standalone.html JS'], agent_role: 'Frontend Implementation Agent', autonomy: 'autonomous', risk: 'high', confidence: 75 }
    - { id: task-003, status: 'done', title: 'Maximize through the host swap, absent panels, keys', depends_on: ['task-001'], produces: ['standalone.html JS'], agent_role: 'Frontend Implementation Agent', autonomy: 'autonomous', risk: 'medium', confidence: 80 }
    - { id: task-004, status: 'done', title: 'Tests: edit the read-only tests of run 0027, library-view-panels.test.js, mutation check', depends_on: ['task-002', 'task-003'], produces: ['library-view-panels.test.js', 'library-view-diagram.test.js'], agent_role: 'QA Agent', autonomy: 'autonomous', risk: 'medium', confidence: 80 }
    - { id: task-005, status: 'done', title: 'Manual: editor-stories (and editor-inspection)', depends_on: ['task-003'], produces: ['src/doc/README.adoc'], agent_role: 'Documentation Agent', autonomy: 'autonomous', risk: 'low', confidence: 85 }
    - { id: task-006, status: 'done', title: 'Verification: suites, embed check, manual build, real page on a copy of the workspace', depends_on: ['task-004', 'task-005'], produces: ['results'], agent_role: 'QA Agent', autonomy: 'autonomous', risk: 'low', confidence: 80 }
  edges:
    - { from: task-001, to: task-002, reason: 'the selection section lives in the region task-001 adds' }
    - { from: task-001, to: task-003, reason: 'Maximize hides the region' }
    - { from: task-003, to: task-005, reason: 'the manual describes the page as built' }
```

# 4. Task Catalog

```yaml
task_catalog:
  tasks:
    - id: task-001
      title: 'The right region'
      source_requirements: { prd: [], tdd: ['R1', 'R2', 'R5', 'R7', 'R8', 'DEC-1', 'DEC-6', 'CTR-4'] }
      outputs: ['renderViewAttributesHtml; renderLibraryPerspectiveHtml right region; libraryPick, libraryPickFor, diagramSelection; rightLabel in renderShellHtml; CSS; viewKey of render()']
      likely_files: ['src/main/resources/editor-webapp/standalone.html']
      verification: ['the existing node tests', 'library-view-panels.test.js section 1']
      risk: 'medium'
      confidence: 85
      human_review: 'none'
      escalation_triggers: ['an existing assertion about the Map or Elements would have to change']
      delegation_tier: 'standard'
    - id: task-002
      title: 'Selecting on the page'
      source_requirements: { prd: [], tdd: ['R3', 'R4', 'R6', 'DEC-2', 'DEC-3', 'DEC-4', 'CTR-1', 'CTR-3', 'IF-2', 'IF-3', 'IF-4', 'TG-2', 'RISK-1'] }
      outputs: ['renderDiagramSvg actions; goto-element, select-link, close-inspection, library-open-element; markMapSelection, markLinkSelection, reconcileLinkSelection, refreshInspection on diagramSelection; Escape']
      likely_files: ['src/main/resources/editor-webapp/standalone.html']
      verification: ['library-view-panels.test.js sections 2-4', 'the existing node tests (the Map and Elements unchanged)']
      risk: 'high'
      confidence: 75
      human_review: 'none'
      escalation_triggers: ['a source-pin test of showDiagramScene would have to be loosened']
      delegation_tier: 'standard'
    - id: task-003
      title: 'Maximize'
      source_requirements: { prd: [], tdd: ['R1', 'R4', 'DEC-5', 'CTR-2', 'IF-5', 'RISK-3'] }
      outputs: ['parked record gets maximized; page header Maximize; regions null while maximized; M and Escape; resetUiState']
      likely_files: ['src/main/resources/editor-webapp/standalone.html']
      verification: ['library-view-panels.test.js section 5', 'the existing node tests']
      risk: 'medium'
      confidence: 80
      human_review: 'none'
      escalation_triggers: ['a reader of diagramMaximized outside the diagram on screen']
      delegation_tier: 'standard'
    - id: task-004
      title: 'Tests and mutations'
      source_requirements: { prd: [], tdd: ['TG-1', 'TG-3', 'Observability and Verification'] }
      outputs: ['library-view-panels.test.js; library-view-diagram.test.js edited where the subject changed; hand mutations, each caught']
      likely_files: ['src/test/javascript/viewpoint-kernel/library-view-panels.test.js', 'src/test/javascript/viewpoint-kernel/library-view-diagram.test.js']
      verification: ['node suite']
      risk: 'medium'
      confidence: 80
      human_review: 'none'
      escalation_triggers: ['a mutation survives and cannot be killed by a reasonable test']
      delegation_tier: 'standard'
    - id: task-005
      title: 'Manual'
      source_requirements: { prd: [], tdd: ['R9', 'IMP-4'] }
      outputs: ['editor-stories describes the page (diagram, panels, selection, Open in Elements, Maximize); editor-inspection mentions the Library']
      likely_files: ['src/doc/README.adoc']
      verification: ['the section reads as the page behaves', 'the manual builds if the toolchain allows (asciidoctor via maven)']
      risk: 'low'
      confidence: 85
      human_review: 'none'
      escalation_triggers: ['the manual cannot be built and the markup is unusual']
      delegation_tier: 'standard'
    - id: task-006
      title: 'Verification'
      source_requirements: { prd: [], tdd: ['Observability and Verification', 'ASM-3'] }
      outputs: ['suite results; real page checked on a copy of the workspace; what was not confirmed']
      likely_files: []
      verification: ['node suite', './mvnw test (JDK 25)', 'embed.sh --check', 'git diff has no line of the base64 block', 'built-in browser on a copy of /home/tibo/syncthing/tibo-work/archi']
      risk: 'low'
      confidence: 80
      human_review: 'none'
      escalation_triggers: ['a suite is red']
      delegation_tier: 'standard'
```

# 5. Parallelization Plan

```yaml
parallelization_plan:
  groups:
    - { id: group-1, tasks: ['task-004', 'task-005'], reason: 'the tests and the manual touch different files; the manual task is dispatched to a subagent while the tests are written' }
  notes: 'task-001 to task-003 are serial in one file.'
```

# 6. Human Review Gates

None. The `complete-run` autonomy override applies; nothing in this run is irreversible (HTML, tests and the manual under version
control; a copy of the user workspace made outside the repository and never written back).

# 7. Risk Assessment

- The Map and Elements regress through the switch to `diagramSelection()` and the per-host `diagramMaximized`: the 497 existing tests are the net; only the tests of the subject this run changes are edited.
- The page writes a global the Map reads: the visit snapshot test, extended with the picks, the close, Escape and Maximize (TDD RISK-1, RISK-3).
- Run W-3 turns the section "the view" into controls and must keep `libraryPick` consistent (TDD CON-3).

# 8. Confidence Assessment

Overall 78. The least certain points need a real browser: the layout of the narrower centre (the header wrapping earlier), the scroll
of the panel to the selection, focus after a click.

# 9. Agent Assignment Plan

```yaml
agent_assignment_plan:
  - { task: task-001, suggested_subagent_type: 'general-purpose', suggested_model: null, actual: 'inline' }
  - { task: task-002, suggested_subagent_type: 'general-purpose', suggested_model: null, actual: 'inline' }
  - { task: task-003, suggested_subagent_type: 'general-purpose', suggested_model: null, actual: 'inline' }
  - { task: task-004, suggested_subagent_type: 'general-purpose', suggested_model: null, actual: 'inline' }
  - { task: task-005, suggested_subagent_type: 'general-purpose', suggested_model: null, actual: 'dispatched' }
  - { task: task-006, suggested_subagent_type: 'general-purpose', suggested_model: null, actual: 'inline' }
```

# 10. Verification Plan

- `node --test "src/test/javascript/**/*.test.js"` (baseline 497 pass, checked before this run's changes).
- `JAVA_HOME=/home/tibo/.sdkman/candidates/java/25.0.4-tem ./mvnw test` (baseline 114).
- `src/main/rust/viewpoint-kernel/embed.sh --check`.
- The manual built if the toolchain allows it.
- Hand mutations of the new code, one at a time, the file restored and its hash checked after each.
- The page in the built-in browser on a copy of the user's workspace (`archicode editor serve`).

# 11. Escalation Rules

Stop only for a genuine blocker (conflicting requirements, missing access, a product tradeoff). The autonomy override of
`complete-run` applies.

# 12. Final Execution Manifest

```yaml
execution_manifest:
  status: 'done'
  criteria:
    - 'AC-1 … AC-8 above all hold'
```

## Results

- Tasks 001-004 and 006 were worked inline: one file and one design, each test asserts the markup of the previous task, and the real-page
  check needs the code just written (the same deviation as run 0027). Task 005 (the manual) was dispatched to a `general-purpose`
  subagent (standard tier) with the behaviour as a brief; its diff was read, and one word changed afterwards (*Open in Elements* became
  *Show in Elements*, see below). The KDMLLC review of the TDD was dispatched too (standard tier, read-only, read the working copy).
- KDMLLC review of the TDD: 19 findings (0 S3, 10 S2, 9 S1), applied or answered. Changed the code: F1 `syncLinkTabStop` reads the page's
  selection (test and mutation), F4 a picked element that no longer exists is dropped when the panel is built (test and mutation), F5 the
  outline finds a box by reference and layer on the page (test and mutation), F9 the button is *Show in Elements*, not the Map's
  *Open in Elements* (which goes to the element's diagram). Documented in the TDD: F2/F3/F6/F8 (the page's own drop, the refresh that removes
  only the selection section, `revealSelectedLink` not moved, the third mode of the element panel), F7 (the offline list selects), F10
  (the settleLinkSelection rule stays outside R4), F11 (the source pins hold: nothing was loosened, the case helper keeps their text),
  F12 left (restatements), F13 (the R to DEC map, the wave criterion on the narrow viewport adjusted), F14, F15, F17, F18, F19 (the page left
  maximized is intended). F16 (the `takeOverDiagramFraming` on selecting) kept, as on the Map.
- AC-1, AC-6: `library-view-panels.test.js` section 1 (the attributes of an Elements view and a Map view; the shell's aside with its label,
  handle and remembered width; a view that cannot be drawn keeps everything in the centre).
- AC-2, AC-3: sections 2 to 4 (box, technology box, Map-view box, link, outline, marks, framing, declaring element, close, Escape, another
  view, the Map and back) and the visit snapshot test of `library-view-diagram.test.js` extended with a box, a link, an element named in the
  panel, Maximize and Restore, Escape and the cross, for the Map and for Elements: `AppState.selection`, the globals, the address and the
  cache are unchanged.
- AC-4: *Show in Elements* (section 5), the steps lead to their story (section 1, and `model-ops.test.js`, whose assertion on where the
  facts are is the one existing assertion edited besides run 0027's own read-only tests).
- AC-5: section 6 (Maximize) and the header menu test.
- AC-7: `src/doc/README.adoc` (`editor-stories`, `editor-inspection`, `editor-keyboard`); built with
  `JAVA_HOME=.../25.0.4-tem ./mvnw -o -q generate-resources -Dplugin.asciidoctor.skip=false`, exit 0, no Asciidoctor warning, the new text is in
  `target/generated-docs/index.html`.
- AC-8: `node --test "src/test/javascript/**/*.test.js"` 528 pass, 0 fail (497 + 31 in the new file; existing assertions edited only where
  their subject changed: run 0027's six read-only tests, one assertion of `model-ops.test.js`); `./mvnw test` (JDK 25) 114 tests, 0 failures;
  `embed.sh --check` exit 0; no line of the base64 block in the diff.
- Hand mutations of the new code (36, one at a time, the file restored and its hash checked): all caught; three were alive at first (the
  `data-nth` of a link click, the refresh that removed the whole aside, the leaving set) and got tests.
- Real page: `archicode editor serve` (jar built from this branch) on a copy of `/home/tibo/syncthing/tibo-work/archi` made in the scratchpad
  (`diff -r` afterwards: identical). `#/library/views?view=authentication_token_validation` at 1400 px: 13 boxes and 10 links, the panel on the
  right (288 px, labelled "View and selection") lists the view (viewpoint, layer, element, facet, hide-unlinked, labels, wrap, kept in, shown
  in); a click on a box showed "Selected element" (kind, layer, id, reference, description, source file, *Show in Elements*), outlined it
  and kept the address; a click on a link showed "Selected link" with its relationship, marked the link and set `aria-pressed`; the cross
  deselected; Maximize removed both panels and the resize handles, Restore brought them back; the Map after the visit was as drawn
  before (12 boxes, not maximized); *Show in Elements* went to `#/elements?ref=platform.auditevents`; no console error. At 822 px the centre is
  270 px: the row of header buttons overflowed it (510 px), which led to the "⋯" menu for PNG, SVG, Open on diagram, Rename and Delete (the
  menu opens, five items); after it the buttons fit.
- Not confirmed: the look (the built-in browser could not take a screenshot, as in run 0027: only measured in the DOM), light and dark,
  three widths (only 822 and 1400), the focus returning to the box after a click (the clicks were dispatched, not made with a pointer),
  the scroll of the panel to the selection beyond the measured `scrollTop`, a screen reader, a real folder picker. The status line of the
  diagram overflows a 270 px centre (the Map's own behaviour).
