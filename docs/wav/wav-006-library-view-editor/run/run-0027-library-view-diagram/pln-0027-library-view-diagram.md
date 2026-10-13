---
title: Editor — a saved view drawn in the Library, execution plan
type: pln
status: completed
date: 2026-10-13
run: 0027
wave: 006
related:
  - docs/wav/wav-006-library-view-editor/run/run-0027-library-view-diagram/tdd-0027-library-view-diagram.md
---

# 1. Executive Summary

No PRD (profile `TDD+pln`): the requirements are R1-R7 of the TDD (row W-1 of wave 006, its gate, the dispatch brief). This run
operates under the `complete-run` autonomy override: no stop on `human_required` by category. No task is `hard_judgment`: nothing
deletes stored data, touches credentials or the kernel, and the one file is under version control.

```yaml
summary:
  status: 'done'
  product_goal: 'See a saved view drawn in the Library, where it is managed, without changing anything the Map and Elements show'
  technical_approach: 'a recipe argument for the diagram pipeline (the Map/Elements recipe reads the globals as before, the Library recipe reads the view); a parked, swapped record for the camera, scene, cache and link tab stop; a read-only drawing; the page as a diagram view with its facts under the stage'
  total_tasks: 6
  parallel_groups: 0
  high_risk_tasks: 1
  human_review_gates: 0
  autonomy_level: 'high'
  recommendation: 'proceed'
  criteria:
    - 'AC-1 the page of an Elements view (overview, detailed, deep, application or technology layer, a leaf asked detailed) puts a canvas in the centre whose scene has the boxes and links the kernel computes for the element, viewpoint, facet, hide-unlinked and texts of the view'
    - 'AC-2 the page of a Map view draws the map of its pinned, hidden and opened elements, with its facet, hide-unlinked and texts'
    - 'AC-3 the canvas has the toolbar of the Map minus the folds (zoom, centre, fit, PNG, SVG, hide unlinked, the four texts); hide unlinked and the texts redraw the page only and mark nothing modified'
    - 'AC-4 after visiting the page of a view and going back to the Map and to Elements, selection, pins, hidden and opened sets, facet, hide-unlinked, texts, tab, maximized state, camera, cached scene and address are what they were before'
    - 'AC-5 a view that cannot be drawn keeps its message and has no canvas; Open on diagram, Rename, Delete, the facts and the steps that show the view stay'
    - 'AC-6 the drawing of the page carries no data-action and no fold button: a click on any node reaches no case of the click handler'
    - 'AC-7 the existing node tests pass unchanged; node suite and ./mvnw test pass; embed.sh --check passes and the kernel block is untouched'
```

# 2. PRD/TDD Consistency Assessment

```yaml
consistency_assessment:
  aligned_items:
    - 'R1 DEC-1, DEC-6; R2 DEC-1; R3 DEC-4; R4 DEC-1, DEC-2, DEC-3; R5 DEC-6; R6 DEC-6; R7 DEC-1, DEC-4'
  gaps:
    - id: gap-001
      type: 'ambiguity'
      description: 'No PRD; the requirements come from the wave plan row W-1, its gate and the dispatch brief'
      impact: 'low'
      recommendation: 'Traceability marked incomplete in the TDD; nothing to resolve'
  blocking_gaps: []
```

# 3. Execution Graph

```yaml
execution_graph:
  nodes:
    - { id: task-001, status: 'done', title: 'Recipe: the pipeline takes it, Map and Elements build it as before', depends_on: [], produces: ['standalone.html JS'], agent_role: 'Frontend Implementation Agent', autonomy: 'autonomous', risk: 'high', confidence: 80 }
    - { id: task-002, status: 'done', title: 'Parked host record and useDiagramHost', depends_on: ['task-001'], produces: ['standalone.html JS'], agent_role: 'Frontend Implementation Agent', autonomy: 'autonomous', risk: 'high', confidence: 80 }
    - { id: task-003, status: 'done', title: 'Read-only drawing, canvas markup, showDiagramScene for the Library host', depends_on: ['task-001'], produces: ['standalone.html JS and CSS'], agent_role: 'Frontend Implementation Agent', autonomy: 'autonomous', risk: 'medium', confidence: 80 }
    - { id: task-004, status: 'done', title: 'The page: layout, tools (look), keyboard guards, export name', depends_on: ['task-002', 'task-003'], produces: ['standalone.html JS and CSS'], agent_role: 'Frontend Implementation Agent', autonomy: 'autonomous', risk: 'medium', confidence: 80 }
    - { id: task-005, status: 'done', title: 'Tests: library-view-diagram.test.js, mutation check', depends_on: ['task-004'], produces: ['library-view-diagram.test.js'], agent_role: 'QA Agent', autonomy: 'autonomous', risk: 'medium', confidence: 85 }
    - { id: task-006, status: 'done', title: 'Verification: suites, embed check, real page on a copy of the workspace', depends_on: ['task-005'], produces: ['results'], agent_role: 'QA Agent', autonomy: 'autonomous', risk: 'low', confidence: 80 }
  edges:
    - { from: task-001, to: task-002, reason: 'the host switch parks what the recipe-driven mount writes' }
    - { from: task-001, to: task-003, reason: 'the Library canvas is mounted through the recipe' }
    - { from: task-002, to: task-004, reason: 'the page needs its own camera before the tools are tried' }
    - { from: task-003, to: task-004, reason: 'the page lays out the canvas of the read-only drawing' }
```

# 4. Task Catalog

```yaml
task_catalog:
  tasks:
    - id: task-001
      title: 'Recipe'
      source_requirements: { prd: [], tdd: ['R1', 'R2', 'R7', 'DEC-1', 'CTR-1', 'CTR-2', 'TG-1'] }
      outputs: ['leafSafeViewpoint; mainDiagramRecipe, libraryDiagramRecipe, diagramRecipeOf, libraryLook; mountDiagramIfNeeded reads the recipe; layer argument of facetRemovesElement and diagramEmptyHtml']
      likely_files: ['src/main/resources/editor-webapp/standalone.html']
      verification: ['the 454 existing node tests, unchanged', 'library-view-diagram.test.js section 1 (the recipe and the scene of each kind of view)']
      risk: 'high'
      confidence: 80
      human_review: 'none'
      escalation_triggers: ['an existing test would have to be edited']
      delegation_tier: 'standard'
    - id: task-002
      title: 'Host switch'
      source_requirements: { prd: [], tdd: ['R4', 'DEC-2', 'CTR-3', 'FLOW-2', 'FLOW-3', 'RISK-1', 'RISK-2'] }
      outputs: ['useDiagramHost, the parked record; calls in render, syncPerspectiveFromHash; resetUiState']
      likely_files: ['src/main/resources/editor-webapp/standalone.html']
      verification: ['library-view-diagram.test.js section 3 (the snapshot of the globals, the camera, the cache, frame=fit)']
      risk: 'high'
      confidence: 80
      human_review: 'none'
      escalation_triggers: ['a global of the Map would have to be written by the Library host']
      delegation_tier: 'standard'
    - id: task-003
      title: 'Read-only drawing and the scene of the Library host'
      source_requirements: { prd: [], tdd: ['R4', 'R5', 'DEC-3', 'DEC-5', 'CTR-5', 'IF-4'] }
      outputs: ['renderDiagramSvg readonly; renderDiagramFallbackHtml; renderDiagramCanvasHtml(host); showDiagramScene skips the selection work for the Library']
      likely_files: ['src/main/resources/editor-webapp/standalone.html']
      verification: ['library-view-diagram.test.js section 4 (no data-action, click on every node reaches nothing)', 'the source-order tests of showDiagramScene unchanged']
      risk: 'medium'
      confidence: 80
      human_review: 'none'
      escalation_triggers: ['a source-pin test of showDiagramScene would have to be loosened']
      delegation_tier: 'standard'
    - id: task-004
      title: 'The page'
      source_requirements: { prd: [], tdd: ['R3', 'R5', 'R6', 'DEC-4', 'DEC-6', 'IF-1', 'IF-2', 'IF-3'] }
      outputs: ['renderLibraryPerspectiveHtml; toggle-show and toggle-hide-unlinked on the page; keyboard guards; export name; CSS']
      likely_files: ['src/main/resources/editor-webapp/standalone.html']
      verification: ['library-view-diagram.test.js sections 2 and 5']
      risk: 'medium'
      confidence: 80
      human_review: 'none'
      escalation_triggers: ['the Map toolbar would have to change']
      delegation_tier: 'standard'
    - id: task-005
      title: 'Tests and mutations'
      source_requirements: { prd: [], tdd: ['TG-3', 'Observability and Verification'] }
      outputs: ['library-view-diagram.test.js; hand mutations, each caught']
      likely_files: ['src/test/javascript/viewpoint-kernel/library-view-diagram.test.js']
      verification: ['node suite']
      risk: 'medium'
      confidence: 85
      human_review: 'none'
      escalation_triggers: ['a mutation survives and cannot be killed by a reasonable test']
      delegation_tier: 'standard'
    - id: task-006
      title: 'Verification'
      source_requirements: { prd: [], tdd: ['Observability and Verification', 'ASM-4'] }
      outputs: ['suite results; real page checked on a copy of the workspace; what was not confirmed']
      likely_files: []
      verification: ['node suite', './mvnw test (JDK 25)', 'embed.sh --check', 'git diff has no line of the base64 block', 'built-in browser on a copy of /home/tibo/syncthing/tibo-work/archi, light and dark']
      risk: 'low'
      confidence: 80
      human_review: 'none'
      escalation_triggers: ['a suite is red']
      delegation_tier: 'standard'
```

# 5. Parallelization Plan

```yaml
parallelization_plan:
  groups: []
  notes: 'One file, each task builds on the previous one. Serial.'
```

# 6. Human Review Gates

None. The `complete-run` autonomy override applies; nothing in this run is irreversible (one HTML file, no stored data, a copy
of the user workspace made outside the repository and never written back).

# 7. Risk Assessment

- The Map and Elements regress through the refactor of `mountDiagramIfNeeded`: the 454 existing tests are the net, none is edited.
- The host swap misses a global: the snapshot test of the visit, extended to every `let` of the diagram section (TDD RISK-1).
- Runs W-2 and W-3 extend the same page: the recipe and the host are the seams (TDD CON-3).

# 8. Confidence Assessment

Overall 80. The least certain points need a real browser: the layout of the page (canvas height beside the facts), the real ELK
on a real view, focus behaviour of read-only nodes.

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

# 10. Verification Plan

- `node --test "src/test/javascript/**/*.test.js"` (baseline 454 pass, checked before this run's changes).
- `JAVA_HOME=/home/tibo/.sdkman/candidates/java/25.0.4-tem ./mvnw test` (baseline 114).
- `src/main/rust/viewpoint-kernel/embed.sh --check`.
- Hand mutations of the new code, one at a time, the file restored and its hash checked after each.
- The page in the built-in browser on a copy of the user's workspace (`archicode editor serve`), light and dark, and the Map after
  a visit.

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

- Tasks 001-006 were worked inline: one file and one design, each task's tests assert the markup of the previous one, and the
  real-page check needs the code just written (the same deviation as runs 0016-0025). The only dispatch was the KDMLLC review of the
  TDD (standard tier, `general-purpose`), which read the working copy.
- KDMLLC review of the TDD: 12 findings (2 S2, 5 S1, 5 S0), applied or answered:
  F1 (S2, a box is named through `findElementRecord`, which reads the selection): changed the code (`itemLayer` through
  `diagramItemText`, `diagramLinkTitle`, `buildElkGraph`, `renderDiagramSvg`), with a both-layers test and mutations that fail without it.
  F2 (S2, where PNG and SVG live): the download group alone is in the header of the page; the canvas of the Map and Elements is unchanged.
  F3 (S1, the address is written before `render()`): the host is swapped where `currentPerspective` is assigned, with a test of the address
  before any redraw. F4 (S1, `pendingDiagramFocus`): dropped on a swap, with a test. F5 (S1, the `data-host` branch in `showDiagramScene`
  was six no-ops): removed; `markLinkSelection` skips `role="img"` links and the Escape rule gains `anyDiagramShown()`. F6 (R4 and link
  selection), F7 (`libraryLook` reset in `resetUiState`, one reader), F8 (CON-2 checklist), F9 (wording), F10 (no refactor of `diagramShows`):
  documents. F11 (the wave plan says 442 existing tests; there are 454): reported for the wave. F12 (Space on a read-only node scrolls
  the panel): left, cosmetic, not filed.
- AC-1, AC-2: `library-view-diagram.test.js` sections 1 and 2 (three viewpoints, technology layer, leaf demotion, facet, hide-unlinked,
  texts, Map view, stale Map references), each comparing the scene with what the kernel computes for the same recipe.
- AC-3: section 3 (header, tools, absence of folds, facet picker, Maximize) and section 6 (the toggles redraw the page only; nothing marked
  modified; the manifest in memory untouched; another view starts from its own values).
- AC-4: section 5 (a snapshot of every global the Map and Elements read, the address, the scene and the cache, before and after a visit to an
  Elements view, a Map view, a broken view and again, with the page's tools and keys used; for the Map and for Elements), the camera tests,
  `frame=fit`, the address before the redraw, the pending focus, the host switch itself.
- AC-5: section 4 (three kinds of broken view, an element deleted under a displayed view).
- AC-6: section 7 (no `data-action`, no fold, no `aria-pressed`, `role="img"`, one link tab stop; the same drawing of the Map and Elements keeps
  its actions; the empty and offline messages offer no action).
- AC-7: `node --test "src/test/javascript/**/*.test.js"` 497 pass, 0 fail (454 + 43, no existing assertion edited); `./mvnw test` (JDK 25)
  114 tests, 0 failures, 0 errors; `embed.sh --check` exit 0; no line of the base64 block in the diff.
- Hand mutations of the new code (about 45, one at a time, the file restored and its hash checked after the run): every one caught except
  `itemLayer` passed to `buildElkGraph` (it only sizes boxes, which the fake layout does not read; equivalent under the harness, covered by
  the drawing test through `renderDiagramSvg`). Three were alive at first (the fold buttons of a Map view, the cache key without the view,
  `resetUiState` not clearing the parked host) and got tests.
- Real page: `archicode editor serve` (the jar built from this branch) on a copy of `/home/tibo/syncthing/tibo-work/archi` made in the scratchpad
  (`diff -r` against the original afterwards: identical). `#/library/views?view=authentication_token_validation` drew 13 boxes and 10 links
  with the real ELK, status "Detailed of platform.iam through facet “oidc” — 13 items, 10 links … 2 unlinked boxes hidden"; the canvas had no
  `data-action`; PNG and SVG enabled; a click on a box did nothing. With the Map pinned on `admin`, facet `main`, Hide unlinked, labels and zoom 125%,
  a visit to the page (Hide unlinked toggled off: 15 boxes, labels, zoom, Center, a click on a box) and back left the selection, pins, facet,
  texts, camera, address and the Map's drawing identical; likewise an Elements deep diagram of `platform.iam` after visiting both views of the copy;
  nothing marked modified; no console error.
- Not confirmed: the look (the built-in browser could not take a screenshot: the window was behind another; only measured: header, stage and
  details do not overlap, stage 562x373 in a 853 px centre at 822 px wide before the details were capped at 33%), light and dark, other widths,
  a screen reader on the `role="img"` boxes, the focus order in a real browser, a real folder picker. The manual was not touched (W-2 and W-3).
