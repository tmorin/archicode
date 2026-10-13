---
title: Editor — editing a view from its page in the Library, execution plan
type: pln
status: completed
date: 2026-10-13
run: 0029
wave: 006
related:
  - docs/wav/wav-006-library-view-editor/run/run-0029-library-view-edit/tdd-0029-library-view-edit.md
---

# 1. Executive Summary

No PRD (profile `TDD+pln`): the requirements are R1-R9 of the TDD (row W-3 of wave 006, its P2 gate criteria, the dispatch brief). This run
operates under the `complete-run` autonomy override: no stop on `human_required` by category. No task is `hard_judgment`: nothing deletes stored
data, touches credentials or the kernel, and every file is under version control (the real-page check writes to a copy of the user's workspace made
outside the repository).

```yaml
summary:
  status: 'done'
  product_goal: 'Change a view by saying what it draws, from its page in the Library, and see the diagram follow'
  technical_approach: 'the attributes of the panel become controls that edit the view entry (markEntryChanged); the page recipe reads the view only; the toolbar toggles are the same edits'
  total_tasks: 6
  parallel_groups: 1
  high_risk_tasks: 1
  human_review_gates: 0
  autonomy_level: 'high'
  recommendation: 'proceed'
  criteria:
    - 'AC-1 a change of viewpoint, element (or pins), facet, hide-unlinked or a text from the panel redraws the diagram, marks the view modified, writes nothing before Save all changes, and then only the view manifest holds the new values'
    - 'AC-2 Cancel gives the edit up; a view edited into something that cannot be drawn says why instead of throwing'
    - 'AC-3 renaming an element still updates the views; the stories that show an edited view show it'
    - 'AC-4 the toolbar of the page edits the view (no transient look); camera moves are not edits; the Map and Elements are untouched'
    - 'AC-5 the manual (editor-stories) describes the page: diagram, panels, what can be edited'
    - 'AC-6 node suite and ./mvnw test pass; embed.sh --check passes and the kernel block is untouched'
```

# 2. PRD/TDD Consistency Assessment

```yaml
consistency_assessment:
  aligned_items:
    - 'R1 DEC-1..5; R2 DEC-8; R3 DEC-4; R4 DEC-8; R5 IMP-4; R6 DEC-2; R7 DEC-1; R8 DEC-6; R9 DEC-8'
  gaps:
    - id: gap-001
      type: 'ambiguity'
      description: 'No PRD; the requirements come from the wave plan row W-3, its gate criteria and the dispatch brief'
      impact: 'low'
      recommendation: 'Traceability marked incomplete in the TDD; nothing to resolve'
  blocking_gaps: []
```

# 3. Execution Graph

```yaml
execution_graph:
  nodes:
    - { id: task-001, status: 'done', title: 'Edit functions and the setters (viewpoint, layer, element, facet, flags, lists), libraryLook removed, recipe from the view, viewProblem', depends_on: [], produces: ['standalone.html JS'], agent_role: 'Frontend Implementation Agent', autonomy: 'autonomous', risk: 'high', confidence: 78 }
    - { id: task-002, status: 'done', title: 'The controls: attributes form (panel and centre), change listener, toolbar branches, CSS', depends_on: ['task-001'], produces: ['standalone.html JS and CSS'], agent_role: 'Frontend Implementation Agent', autonomy: 'autonomous', risk: 'medium', confidence: 78 }
    - { id: task-003, status: 'done', title: 'Tests: library-view-edit.test.js, edit the tests whose subject changed, hand mutations', depends_on: ['task-002'], produces: ['library-view-edit.test.js', 'library-view-diagram.test.js'], agent_role: 'QA Agent', autonomy: 'autonomous', risk: 'medium', confidence: 80 }
    - { id: task-004, status: 'done', title: 'Manual: editor-stories', depends_on: ['task-002'], produces: ['src/doc/README.adoc'], agent_role: 'Documentation Agent', autonomy: 'autonomous', risk: 'low', confidence: 85 }
    - { id: task-005, status: 'done', title: 'Real page on a copy of the workspace: edit and save of authentication_token_validation, manifest before/after', depends_on: ['task-003'], produces: ['results'], agent_role: 'QA Agent', autonomy: 'autonomous', risk: 'low', confidence: 70 }
    - { id: task-006, status: 'done', title: 'Verification: suites, embed check, manual build, diff review, close-out', depends_on: ['task-003', 'task-004', 'task-005'], produces: ['results'], agent_role: 'QA Agent', autonomy: 'autonomous', risk: 'low', confidence: 80 }
  edges:
    - { from: task-001, to: task-002, reason: 'the controls call the setters' }
    - { from: task-002, to: task-004, reason: 'the manual describes the page as built' }
```

# 4. Task Catalog

```yaml
task_catalog:
  tasks:
    - id: task-001
      title: 'Edit functions'
      source_requirements: { prd: [], tdd: ['R1', 'R3', 'R6', 'DEC-2', 'DEC-3', 'DEC-4', 'CTR-1'] }
      outputs: ['editSavedView, setViewViewpoint, setViewLayer, setViewElement, setViewFacet, setViewFlag/Show, setViewListItem; libraryDiagramRecipe reads the view only; viewProblem says an empty element']
      likely_files: ['src/main/resources/editor-webapp/standalone.html']
      verification: ['the node suite (existing tests edited only where the look is gone)']
      risk: 'high'
      confidence: 78
      human_review: 'none'
      escalation_triggers: ['an edit writes a global the Map or Elements read']
      delegation_tier: 'standard'
    - id: task-002
      title: 'Controls'
      source_requirements: { prd: [], tdd: ['R1', 'R6', 'R7', 'DEC-1', 'DEC-5', 'DEC-7', 'CTR-2', 'CTR-3', 'IF-1', 'IF-2', 'IF-3', 'IF-4'] }
      outputs: ['renderViewFactsHtml as a form; handleAppChange; view-list-add / view-list-remove; toggle-show and toggle-hide-unlinked edit the view; CSS']
      likely_files: ['src/main/resources/editor-webapp/standalone.html']
      verification: ['library-view-edit.test.js', 'the node suite']
      risk: 'medium'
      confidence: 78
      human_review: 'none'
      escalation_triggers: ['a source-pin test would have to be loosened']
      delegation_tier: 'standard'
    - id: task-003
      title: 'Tests and mutations'
      source_requirements: { prd: [], tdd: ['R1', 'R2', 'R3', 'R4', 'R8', 'Observability and Verification'] }
      outputs: ['library-view-edit.test.js; edited library-view-diagram.test.js; hand mutations, each caught']
      likely_files: ['src/test/javascript/viewpoint-kernel/library-view-edit.test.js', 'src/test/javascript/viewpoint-kernel/library-view-diagram.test.js', 'src/test/javascript/viewpoint-kernel/library-view-panels.test.js']
      verification: ['node suite']
      risk: 'medium'
      confidence: 80
      human_review: 'none'
      escalation_triggers: ['a mutation survives and cannot be killed by a reasonable test']
      delegation_tier: 'standard'
    - id: task-004
      title: 'Manual'
      source_requirements: { prd: [], tdd: ['R5', 'IMP-4'] }
      outputs: ['editor-stories describes the page of a view and what can be edited']
      likely_files: ['src/doc/README.adoc']
      verification: ['the section reads as the page behaves', 'the manual builds (asciidoctor via maven)']
      risk: 'low'
      confidence: 85
      human_review: 'none'
      escalation_triggers: ['the manual cannot be built and the markup is unusual']
      delegation_tier: 'standard'
    - id: task-005
      title: 'Real page'
      source_requirements: { prd: [], tdd: ['R9', 'Observability and Verification'] }
      outputs: ['an edit and a save of the view authentication_token_validation on a copy; manifest before and after']
      likely_files: []
      verification: ['built-in browser on a copy of /home/tibo/syncthing/tibo-work/archi', 'diff of the copy against the original shows only the copy changed']
      risk: 'low'
      confidence: 70
      human_review: 'none'
      escalation_triggers: ['a write would go to the original folder']
      delegation_tier: 'standard'
    - id: task-006
      title: 'Verification'
      source_requirements: { prd: [], tdd: ['Observability and Verification'] }
      outputs: ['suite results; what was not confirmed']
      likely_files: []
      verification: ['node suite', './mvnw test (JDK 25)', 'embed.sh --check', 'git diff has no line of the base64 block']
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
    - { id: group-1, tasks: ['task-003', 'task-004'], reason: 'the tests and the manual touch different files' }
  notes: 'task-001 and task-002 are serial in one file.'
```

# 6. Human Review Gates

None. The `complete-run` autonomy override applies; nothing in this run is irreversible.

# 7. Risk Assessment

- An edit writes a global the Map or Elements read: the visit/edit snapshot test (TDD RISK-1, TG-2).
- The saver changes more than the edited lines of a real manifest: recorded before/after on a real file (TDD RISK-4).
- The transient look is removed: the tests of runs 0027/0028 about it are edited, nothing else.

# 8. Confidence Assessment

Overall 76. The least certain points need a real browser: the look of the form in a 270 px panel, focus after a change, the datalist.

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

- `node --test "src/test/javascript/**/*.test.js"` (baseline 528 pass).
- `JAVA_HOME=/home/tibo/.sdkman/candidates/java/25.0.4-tem ./mvnw test` (baseline 114).
- `src/main/rust/viewpoint-kernel/embed.sh --check`.
- The manual built.
- Hand mutations of the new code, one at a time, the file restored and its hash checked after each.
- The page in the built-in browser on a copy of the user's workspace (`archicode editor serve`).

# 11. Escalation Rules

Stop only for a genuine blocker (conflicting requirements, missing access, a product tradeoff). The autonomy override of `complete-run` applies.

# 12. Final Execution Manifest

```yaml
execution_manifest:
  status: 'done'
  criteria:
    - 'AC-1 … AC-6 above all hold'
```

## Results

- All six tasks were worked inline: one file and one design, each test asserts the markup of the previous task, and the real-page check needs the code just written
  (as runs 0027 and 0028). The KDMLLC review of the TDD was dispatched (standard tier, read-only); its 15 findings are answered in the prg.
- AC-1: `library-view-edit.test.js` sections 1-3 and 6 (viewpoint, layer, element, facet, Hide unlinked, each text, the Map lists; each redraws to the boxes
  the kernel computes, marks the view modified in the header and the list, writes nothing before the save; the save writes `manifests/view.api_view.yaml`
  and no other file, keeps the comments of the file and reads back with the new values; the canonical form: a text equal to its default, Hide unlinked
  off, no facet are not kept).
- AC-2: Cancel test (section 5: view in memory, panel and diagram are the saved ones; nothing written); undrawable states (section 3: the layer switched
  without an element, a Map left with only missing pins; message in the centre, no canvas, same form, "(no element)" in the name, nothing throws, Save not blocked).
- AC-3: rename test (the views follow, the page draws the renamed element), story test (`goToStoryStep` draws the edited view), legacy view of workspace.yaml.
- AC-4: toolbar test (the same edits as the panel, both agree), camera test (zoom, fit, centre mark nothing), the edit-isolation test (Map/Elements globals and
  address unchanged, another view untouched), source pins (`libraryLook` gone).
- AC-5: `src/doc/README.adoc`, section `editor-stories` (new anchor `editor-view-edit`); built with
  `JAVA_HOME=.../25.0.4-tem ./mvnw -o -q generate-resources -Dplugin.asciidoctor.skip=false`, exit 0, no Asciidoctor warning, the text is in `target/generated-docs/index.html`.
- AC-6: `node --test "src/test/javascript/**/*.test.js"` 549 pass, 0 fail (528 + 21 in the new file; six full runs in a row green at the end);
  `./mvnw test` (JDK 25) 114 tests, 0 failures; `embed.sh --check` exit 0; no changed line of the base64 block.
- Hand mutations of the new code (29, one at a time, the file restored and its hash checked): all caught; four were alive at first (the deferred
  Save lighting, a technology element pinned on conversion, the header badge, the focus after a removal) and got tests.
- Existing tests edited because their subject changed: `library-view-diagram.test.js` (the transient-look tests removed, the visit test no longer toggles,
  the rapid-edit test reads the view), `library-view-panels.test.js` (two attribute tests read controls; the page harness moved to `library-page.js`),
  `model-ops.test.js` (the in-memory folder moved to `mem-folder.js`), `folders.test.js` (a fixed 30 ms wait replaced by waiting for the card: with the larger suite it failed in 3 of 8 full runs, the base commit 0 of 8; after, 0 of 6).
- Real page: `archicode editor serve` (jar built from this branch) on a copy of `/home/tibo/syncthing/tibo-work/archi` made in the scratchpad, with two comment
  lines added to the copy of the manifest. `#/library/views?view=authentication_token_validation` at 822 px: 13 boxes, 10 links; the form held viewpoint
  detailed, layer application, element platform.iam, facet oidc, Hide unlinked on, labels off, qualifiers on, descriptions off, wrap on. Viewpoint to
  Overview: 12 boxes, both *modified* marks, Save lit, focus kept, the file on disk unchanged. A typed `platform.nowhere` (real keystrokes, Enter): refused,
  the reason under the field, the text kept, nothing else changed. `platform.auditevents`: 3 boxes, status "Overview of platform.auditevents through facet oidc",
  name read back. Typing then clicking Save with the mouse: first found that the click was swallowed (the Save buttons were replaced), fixed
  (`syncSaveAllButtonsInPlace`); after the fix, with Save still disabled the click does nothing (the edit is applied and Save is lit), a second click saves
  ("Saved."). The saved manifest differs from the one before by one line (`element: platform.iam` to `element: platform.auditevents`); both comments and the missing final line break stay;
  the rest of the copy equals the original (`diff -r`: only my two comment lines). Toolbar *Hide unlinked* then *Cancel* (confirm accepted): 6 boxes then 4 again, the
  saved value, no mark. No console error.
- Manifest before and after (copy, comments added by hand): before `# reviewed with the architects, keep the facet / header: … / element: platform.iam / # the facet of the OIDC flow / facet: oidc / …`;
  after the same text with `element: platform.auditevents` and nothing else changed.
- Not confirmed: the look (the pane could not take a screenshot, as in runs 0027/0028; only measured and read in the DOM), light and dark, widths other than 822 px,
  a datalist suggestion picked with the mouse, Tab order, a screen reader, a real folder picker (served mode only), the form as it moves from the panel to the centre when a view becomes undrawable (scroll).
