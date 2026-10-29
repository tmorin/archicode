---
title: Execution Plan — layout.columns on every diagram
status: done
date: 2026-10-29
related:
  - docs/wav/wav-027-editor-layout-and-walk/run/run-0202-diagram-layout-columns/tdd-0202-diagram-layout-columns.md
  - docs/wav/wav-027-editor-layout-and-walk/rfc/rfc-001-diagram-layout-address-and-walk.md
  - 'gh:tmorin/archicode#178'
type: pln
run: 0202
wave: 027
---

# Execution Plan: layout.columns on every diagram

Profile TDD+pln: there is no PRD, so REQ-1 to REQ-12 are the IDs the TDD labels (section "PRD Traceability"), taken from RFC-001, the W-2 row of the wave plan and the P2 gate. The run operates under the autonomy override of complete-run: a task that would otherwise stop for a human is executed by an agent and the override is logged in the prg. No task below is `human_required`.

The TDD was reviewed at Stage 5 (findings F-1 to F-13, in the prg) and the review is not yet folded into the TDD text. Where the TDD and a finding disagree on a fact about the repository, the finding wins (the reviewer read the files); section 2 lists the corrections each task applies, so an agent never builds on a wrong sentence of the TDD.

## 1. Executive Summary

```yaml
summary:
  status: 'done'
  product_goal: 'An author sets layout.columns (1 to 20) in a saved view, in settings.views.properties.<viewpoint>.layout, or with a Columns list in the diagram toolbar, and the diagrams of the editor and of the story player aim at that many boxes per row; with nothing set nothing moves; the command line ignores the key (#178).'
  technical_approach: 'Write the node tests first and see them red, then add one pure resolver in model/diagram-columns.js, bind ELK layer size on the root and on every compound node in buildElkGraph, carry the value through the recipes, the cache key, applySavedView, the saved view canonical form and storyStepScene, add the toolbar list and the Settings check, extend GuideViewPropertiesTest and the guide with a layout row, write the Chromium and Firefox spec on the layered Brightcart and record the rows before and after, then document and run every gate.'
  total_tasks: 8
  parallel_groups: 2
  high_risk_tasks: 0
  human_review_gates: 0
  autonomy_level: 'high'
  recommendation: 'proceed'
  criteria:
    - 'the new node tests fail before the code and pass after it; three deliberate breaks (bound not set on a compound node, two levels swapped, value left out of the cache key) are each caught by a test and the failing output is recorded in the run document'
    - 'with no layout set, buildElkGraph returns an object deep-equal to the reference copy of the old function, diagramCacheKey returns the old strings, and the saved Maps of the shipped examples and fixtures draw the boxes of technology-map/expected-boxes.json and map-links/expected-boxes.json'
    - 'the resolver gives toolbar, then view, then workspace, then none for overview, detailed, deep and map, and an invalid value is the sentence of the TDD with columns null'
    - 'the story player and the editing walk build equal ELK graphs for the same step, and a toolbar value is ignored by the player'
    - 'GuideViewPropertiesTest passes with layout in its list of ignored keys and with a drawn-file-equals-bare-file case for a view and for settings.views.properties; GuideTest passes against a regenerated golden.md; workspace.schema.json and manifest.schema.json goldens are unchanged'
    - 'src/test/e2e/diagram-columns.spec.js passes in chromium and firefox on a copy of the layered Brightcart with at most 5 boxes in a row in each container at columns 4, and the run document holds the table of rows per container before and after columns 4 for the page of an element, a Map and a saved view'
    - 'npm run editor:build leaves standalone.html the assembly; npm run editor:check, test:unit, test:coverage, lint and format:check pass; ratchet.max in src/main/editor/layers.json is not above 99 and node scripts/check-editor.mjs --list shows no new upward pair; no coverage floor is lowered; no part has more than 3000 lines'
    - 'scripts/byte-identity.sh reports no new difference and scripts/byte-identity-exceptions.txt gains no line'
    - 'CLAUDE.md and src/doc/README.adoc describe layout.columns, its levels, its order, its range, the sentence and the command line ignoring it'
```

## 2. PRD/TDD Consistency Assessment

```yaml
consistency_assessment:
  aligned_items:
    - 'REQ-1 to REQ-12 are each addressed by a TDD design decision (DEC-1 to DEC-8) and by at least one task below'
    - 'buildElkGraph in presentation/diagram-layout.js, computeDiagramScene in presentation/diagram-page.js, storyStepScene in presentation/story-scene.js and canonicalViewProperties in application/view-recipe.js exist as the TDD describes'
    - 'the texts of a diagram (diagramShow, setViewShow, toggle-show) are the model the TDD follows, and the Stage 5 review confirms the pattern'
  gaps:
    - id: gap-001
      type: 'contradiction'
      description: 'Review F-1: VIEWPOINT_IDS in model/form-validation.js has three ids (overview, detailed, deep); the Settings page has three JSON editors and keeps map untouched. The TDD (ASM-3, DEC-8, FLOW-3, REQ-9) says four.'
      impact: 'high'
      recommendation: 'task-002 resolves four viewpoints (map included); task-004 checks the three of the Settings page in readSettingsDraft and does not add map to VIEWPOINT_IDS (it also drives views.labels and the Java View.viewpoint labels); the Map workspace value is checked when a Map is drawn (FLOW-1) and the manual says so.'
    - id: gap-002
      type: 'contradiction'
      description: 'Review F-2: OverviewViewpointService, DetailedViewpointService and DeepViewpointService merge settings.views.properties.<viewpoint> into the properties of every generated view, so the command line carries a layout there into generated views (and query views lists it) and draws nothing from it. The TDD ASM-2 and CTR-1 say it is read by no Java code that acts on it. MapViewpointService does not read it.'
      impact: 'medium'
      recommendation: 'task-005 states the corrected fact in the guide, proves it by test (the drawn file equals the bare one) and does not change Java main code.'
    - id: gap-003
      type: 'contradiction'
      description: 'Review F-3: the toolbar state belongs in model/ui-state.js beside diagramHideUnlinked, not in presentation/diagram-state.js, otherwise application/view-recipe.js (currentViewDefinition, applySavedView) would add upward pairs; the reset is resetUiState in application/folder-session.js; snapshotWriteState holds only what a write changes and must not list it; isPlainObject is in model/styles.js, not core.'
      impact: 'high'
      recommendation: 'task-003 puts diagramColumns in model/ui-state.js, resets it in resetUiState, leaves snapshotWriteState alone; task-008 compares node scripts/check-editor.mjs --list before (recorded by task-001) and after.'
    - id: gap-004
      type: 'missing_technical_design'
      description: 'Review F-5: applySavedView (application/view-recipe.js) puts a saved view or a story step of the editing walk on the main diagram and the TDD never sets diagramColumns there; the previous toolbar value would leak or the view layout be lost, and viewMatchesScreen would stop matching.'
      impact: 'medium'
      recommendation: 'task-003 makes applySavedView set diagramColumns from the valid layout of the view (else null) and tests a saved view and a story step.'
    - id: gap-005
      type: 'ambiguity'
      description: 'Review F-6: the resolver rule for an invalid level and the workspace key for a saved view are not stated.'
      impact: 'medium'
      recommendation: 'Rule applied by task-002: levels are read from the most specific, an unset level is skipped, the first level that is set decides whether valid or not, invalid means columns null plus its sentence. The workspace key is recipe.viewpoint (the viewpoint after leafSafeViewpoint) and one leafSafeViewpoint case is tested.'
    - id: gap-006
      type: 'missing_technical_design'
      description: 'Review F-7: toggle-show calls pushDiagramHistory because the texts are in the address; layout is not in the address until W-3 (DEF-1), so a history entry would restore nothing.'
      impact: 'low'
      recommendation: 'task-004 does not call pushDiagramHistory in set-columns and says why in a comment; W-3 adds it with the address.'
    - id: gap-007
      type: 'missing_requirement'
      description: 'Review F-4: byte-identity cannot show that the command line ignores layout because no shipped workspace has one, and GuideViewPropertiesTest holds a hand-written list of ignored keys that lacks layout. CON-3 means no Java main change; the Java test file does change.'
      impact: 'medium'
      recommendation: 'task-005 extends GuideViewPropertiesTest (layout in a view and in settings.views.properties.<viewpoint>, drawn file equals the bare one, layout in its key list) and keeps src/main/java unchanged.'
    - id: gap-008
      type: 'ambiguity'
      description: 'Review F-9, F-11: no test line for the form of a saved view (the Columns field, the invalid entry) nor for a story step with an inline recipe; VIEW_PROPERTY_ORDER is in presentation/view-edit.js and the guide test reads the first array literal of const VIEW_PROPERTY_ORDER by regular expression.'
      impact: 'low'
      recommendation: 'task-001 adds the view form and inline-recipe cases to diagram-columns-view.test.js; task-003 keeps the first array literal in the form const VIEW_PROPERTY_ORDER = [...] and adds layout to it (after hide-unlinked and the Map parts, before the texts).'
    - id: gap-009
      type: 'ambiguity'
      description: 'Review F-8, F-10, F-12, F-13: viewKey is unchanged (only diagramCacheKey carries the value); the read schema types Settings.views.properties as an object-map with free values; the TDD quotes line numbers of form-validation.js that are brittle.'
      impact: 'low'
      recommendation: 'Tasks name the function readSettingsDraft, not line numbers, and leave viewKey untouched.'
    - id: gap-010
      type: 'risk'
      description: 'RISK-1: the ELK bound is a tendency, not a cap; the spike gave rows of 5 for a bound of 4 once links joined containers. The acceptance is at most 5 for 4 on the real Brightcart (ASM-1).'
      impact: 'medium'
      recommendation: 'task-006 measures the real diagram; a value above 5 is recorded and escalated, not hidden.'
    - id: gap-011
      type: 'risk'
      description: 'diagram-page.js, diagram-state.js and style.css are also touched by W-1 and W-3; Settings and the address are W-3 (DEF-1).'
      impact: 'low'
      recommendation: 'Runs are serialised by the wave phases; this plan touches only the lines it names and leaves the address out.'
  blocking_gaps: []
```

## 3. Execution Graph

```yaml
execution_graph:
  nodes:
    - id: task-001
      status: 'done'
      title: 'Record the baselines and write the node tests, red'
      depends_on: []
      produces:
        - 'src/test/javascript/viewpoint-kernel/diagram-columns.test.js'
        - 'src/test/javascript/viewpoint-kernel/diagram-columns-elk.test.js'
        - 'src/test/javascript/viewpoint-kernel/diagram-columns-view.test.js'
        - 'the output of node scripts/check-editor.mjs --list and the ratchet count before the change, in the run document'
        - 'the failing output of the three tests in the run document'
      agent_role: 'Test Generation Agent'
      autonomy: 'autonomous'
      risk: 'low'
      confidence: 80
    - id: task-002
      status: 'done'
      title: 'Add the resolver part and the layer bound in buildElkGraph'
      depends_on: [task-001]
      produces:
        - 'src/main/editor/model/diagram-columns.js'
        - 'src/main/editor/presentation/diagram-layout.js'
        - 'src/main/editor/layers.json'
        - 'src/main/editor/names.json'
        - 'src/main/resources/editor-webapp/standalone.html'
      agent_role: 'Frontend Implementation Agent'
      autonomy: 'autonomous'
      risk: 'medium'
      confidence: 80
    - id: task-003
      status: 'done'
      title: 'Carry the value through the recipes, the cache key, applySavedView, the saved view and the story step'
      depends_on: [task-002]
      produces:
        - 'src/main/editor/model/ui-state.js'
        - 'src/main/editor/application/folder-session.js'
        - 'src/main/editor/application/view-recipe.js'
        - 'src/main/editor/presentation/view-edit.js'
        - 'src/main/editor/presentation/diagram-page.js'
        - 'src/main/editor/presentation/story-scene.js'
        - 'src/main/editor/names.json'
        - 'src/main/resources/editor-webapp/standalone.html'
      agent_role: 'Frontend Implementation Agent'
      autonomy: 'autonomous'
      risk: 'medium'
      confidence: 70
    - id: task-004
      status: 'done'
      title: 'Add the Columns list to the toolbar and the view form, and the Settings check'
      depends_on: [task-003]
      produces:
        - 'src/main/editor/presentation/diagram-page.js'
        - 'src/main/editor/presentation/stories-pages.js'
        - 'src/main/editor/composition/events.js'
        - 'src/main/editor/model/form-validation.js'
        - 'src/main/editor/presentation/help-and-settings.js'
        - 'src/main/editor/style.css'
        - 'src/main/resources/editor-webapp/standalone.html'
      agent_role: 'Frontend Implementation Agent'
      autonomy: 'autonomous'
      risk: 'medium'
      confidence: 70
    - id: task-005
      status: 'done'
      title: 'Extend GuideViewPropertiesTest, add the layout row to the guide and regenerate the golden'
      depends_on: [task-003]
      produces:
        - 'src/test/java/io/morin/archicode/cli/GuideViewPropertiesTest.java'
        - 'src/main/resources/guide/guide.md'
        - 'src/test/resources/guide/golden.md'
      agent_role: 'Documentation Agent'
      autonomy: 'autonomous'
      risk: 'low'
      confidence: 75
    - id: task-006
      status: 'done'
      title: 'Write the end-to-end spec, measure the real diagram and record the rows'
      depends_on: [task-004]
      produces:
        - 'src/test/e2e/diagram-columns.spec.js'
        - 'the table of rows per container before and after columns 4, and the layout times, in the run document'
      agent_role: 'QA Agent'
      autonomy: 'autonomous'
      risk: 'medium'
      confidence: 65
    - id: task-007
      status: 'done'
      title: 'Document layout.columns in the manual and in CLAUDE.md'
      depends_on: [task-004, task-005]
      produces:
        - 'src/doc/README.adoc'
        - 'CLAUDE.md'
      agent_role: 'Documentation Agent'
      autonomy: 'autonomous'
      risk: 'low'
      confidence: 85
    - id: task-008
      status: 'done'
      title: 'Show the tests fail on purpose, run every gate and record the evidence'
      depends_on: [task-006, task-007]
      produces:
        - 'the three deliberate breaks, each with its failing test, in the run document'
        - 'the output of every gate command in the run document'
      agent_role: 'QA Agent'
      autonomy: 'autonomous'
      risk: 'low'
      confidence: 75
  edges:
    - from: task-001
      to: task-002
      reason: 'the code is written against red tests'
    - from: task-002
      to: task-003
      reason: 'the recipes call resolveDiagramColumns and pass columns to buildElkGraph'
    - from: task-003
      to: task-004
      reason: 'the toolbar sets the state and the setter that task-003 adds'
    - from: task-003
      to: task-005
      reason: 'the guide test reads VIEW_PROPERTY_ORDER from the built page, which must hold layout'
    - from: task-004
      to: task-006
      reason: 'the spec drives the toolbar list on the packaged jar'
    - from: task-004
      to: task-007
      reason: 'the manual describes the control as built'
    - from: task-005
      to: task-007
      reason: 'the manual and the guide say the same about the command line'
    - from: task-006
      to: task-008
      reason: 'the gates run on the finished work'
    - from: task-007
      to: task-008
      reason: 'the gates run on the finished work'
```

## 4. Task Catalog

```yaml
task_catalog:
  tasks:
    - id: task-001
      title: 'Record the baselines and write the node tests, red'
      source_requirements:
        prd:
          - 'REQ-2'
          - 'REQ-3'
          - 'REQ-5'
          - 'REQ-6'
          - 'REQ-7'
          - 'REQ-8'
          - 'REQ-12'
        tdd:
          - 'Observability and Verification VER-1 to VER-4'
          - 'DEC-1 to DEC-7'
      outputs:
        - 'the output of node scripts/check-editor.mjs --list and the current ratchet count, pasted in the run document under "Baseline"'
        - 'diagram-columns.test.js: resolveDiagramColumns and columnsProblem for the order toolbar, view, workspace, none over overview, detailed, deep and map; a toolbar value equal to the lower levels is null; 3.0 is 3; "3", 0, 21, 1.5, true and [] give the sentence of DEC-1; layout 4 and layout with the key rows give the shape sentence; the first level that is set decides, valid or not; an invalid view value gives columns null while the workspace value is not used; one leafSafeViewpoint case'
        - 'diagram-columns-elk.test.js: buildElkGraph of the saved Maps of the shipped examples and fixtures with no columns deep-equals a copy of the old function body kept in the test as the reference; with columns 4 the two layering keys are on the root and on every node that has children and on no leaf; the boxes of the editor equal technology-map/expected-boxes.json and map-links/expected-boxes.json'
        - 'diagram-columns-view.test.js: canonicalViewProperties keeps layout, setViewLayout removes the key for the workspace value and keeps the order of VIEW_PROPERTY_ORDER, currentViewDefinition writes the toolbar value only, viewMatchesScreen, applySavedView sets diagramColumns for a view and for a story step, the cache key without a value equals the old string, the Settings save refuses an invalid value for overview, detailed and deep, the form of a saved view shows the Columns field and an invalid entry, a step with an inline recipe, a rename and a move leave layout alone'
        - 'the failing output of the three files, copied in the run document'
      verification:
        - 'node --test on each of the three files exits non-zero before task-002 and the failures name the missing resolveDiagramColumns, the missing layering keys and the missing layout handling'
        - 'node scripts/check-editor.mjs --list exits 0 and its output is in the run document'
        - 'npm run format:check passes on the three new files'
      risk: 'low'
      confidence: 80
      human_review: 'none'
      escalation_triggers:
        - 'buildElkGraph cannot be called from the harness: record which export is missing and call it through computeDiagramScene with a stub elk'
        - 'the old function body cannot be copied as a reference without importing the new one: copy it by git show HEAD:src/main/editor/presentation/diagram-layout.js into the scratchpad and inline the body'
      delegation_tier: 'standard'
      results: "tier standard, model sonnet, effort medium, profile low-cost, passed first time, inline (leaf), independently verified"
    - id: task-002
      title: 'Add the resolver part and the layer bound in buildElkGraph'
      source_requirements:
        prd:
          - 'REQ-1'
          - 'REQ-2'
          - 'REQ-3'
          - 'REQ-6'
          - 'REQ-12'
        tdd:
          - 'DEC-1'
          - 'DEC-2'
          - 'DEC-3'
          - 'IMP-1'
          - 'IMP-2'
          - 'CTR-2'
      outputs:
        - 'src/main/editor/model/diagram-columns.js (new): resolveDiagramColumns({ toolbar, view, settings, viewpoint }) returning { columns, from, problem }, columnsProblem(layout, where), DIAGRAM_COLUMNS_MAX = 20 and DIAGRAM_COLUMNS_CHOICES; uses isPlainObject from model/styles.js and nothing from a higher layer'
        - 'buildElkGraph reads options.columns and, when set, adds elk.layered.layering.strategy COFFMAN_GRAHAM and elk.layered.layering.coffmanGraham.layerBound to the layoutOptions of the root and of every node with children; when not set it adds nothing'
        - 'layers.json lists the part after model/map-links.js; names.json is rewritten with node scripts/check-editor.mjs --write-names'
        - 'standalone.html rebuilt with npm run editor:build'
      verification:
        - 'node --test on diagram-columns.test.js and diagram-columns-elk.test.js passes, except the one test `a saved Map with a layout reaches the layout engine bounded...` (diagram-columns-elk.test.js), which needs the recipe wiring of task-003 and is checked there (plan correction of 2026-10-29: task-001 wrote it before the wiring existed, and task-002 failed twice on it)'
        - 'npm run editor:check exits 0'
        - 'node scripts/check-editor.mjs --list shows no upward pair that was not in the baseline of task-001'
        - 'npm run format:check and npm run lint pass'
      risk: 'medium'
      confidence: 80
      human_review: 'none'
      escalation_triggers:
        - 'the part cannot be placed without an upward pair: move the helper it needs to a lower layer, never raise ratchet.max'
        - 'the graph with no columns differs from the reference in any key: stop and fix before going on'
      delegation_tier: 'standard'
      results: "tier standard, model sonnet, effort medium, profile low-cost, passed first time, inline (leaf), independently verified"
    - id: task-003
      title: 'Carry the value through the recipes, the cache key, applySavedView, the saved view and the story step'
      source_requirements:
        prd:
          - 'REQ-1'
          - 'REQ-2'
          - 'REQ-4'
          - 'REQ-6'
          - 'REQ-8'
        tdd:
          - 'DEC-5'
          - 'DEC-6'
          - 'DEC-7'
          - 'IMP-3'
          - 'IMP-5'
          - 'CTR-3'
          - 'FLOW-1'
      outputs:
        - 'diagramColumns (toolbar state, null by default) in model/ui-state.js beside diagramHideUnlinked, reset in resetUiState of application/folder-session.js; snapshotWriteState is not changed'
        - 'mainDiagramRecipe, viewDiagramRecipe and libraryDiagramRecipe carry columns and layoutProblem from resolveDiagramColumns (the main recipe passes diagramColumns, a view recipe passes toolbar null, the workspace key is recipe.viewpoint)'
        - 'diagramCacheKey joins cols: and the value only when the value is set; viewKey is unchanged'
        - 'computeDiagramScene starts with recipe.layoutProblem and returns the non-cacheable error panel through escapeHtml, and passes columns to buildElkGraph'
        - 'canonicalViewProperties keeps a valid layout as columns N; canonicalViewDefinition drops a value equal to the workspace value; VIEW_PROPERTY_ORDER (first array literal in the form const VIEW_PROPERTY_ORDER = [...], in presentation/view-edit.js) holds layout after hide-unlinked and the Map parts and before the four texts; currentViewDefinition writes the toolbar value only; setViewLayout removes the key for the workspace value, else writes layout columns through putViewProperty; viewProblem says an invalid layout; applySavedView sets diagramColumns from the valid layout of the view, else null'
        - 'storyStepScene resolves with toolbar null through viewDiagramRecipe; stepProblem reports an invalid layout through viewProblem'
        - 'names.json updated and standalone.html rebuilt'
      verification:
        - 'node --test on diagram-columns-view.test.js and story-player-scene.test.js passes, including the case that the ELK graph of the player equals the one of the editing walk and a toolbar value is ignored by the player'
        - 'node --test on diagram-columns-elk.test.js passes in full, including `a saved Map with a layout reaches the layout engine bounded...` (the columns of the view, then of the workspace, reach buildElkGraph through the recipes)'
        - 'npm run test:unit passes'
        - 'npm run editor:check exits 0 and node scripts/check-editor.mjs --list shows no upward pair absent from the baseline'
        - 'grep -n modelsChanged src/main/editor/model/diagram-columns.js src/main/editor/model/ui-state.js finds no new call for layout'
      risk: 'medium'
      confidence: 70
      human_review: 'none'
      escalation_triggers:
        - 'a name the application layer needs lives in presentation: move it down, never raise ratchet.max'
        - 'an existing test of the cache key or of the saved view canonical form fails: the value of an unset layout must leave every old string unchanged, fix the code, not the test'
      delegation_tier: 'standard'
      results: "tier standard, model sonnet, effort medium, profile low-cost, passed first time, inline (leaf), independently verified"
    - id: task-004
      title: 'Add the Columns list to the toolbar and the view form, and the Settings check'
      source_requirements:
        prd:
          - 'REQ-1'
          - 'REQ-6'
        tdd:
          - 'DEC-4'
          - 'DEC-8'
          - 'IMP-4'
          - 'IMP-6'
          - 'IF-1'
          - 'IF-2'
          - 'FLOW-2'
          - 'FLOW-3'
      outputs:
        - 'renderDiagramToolsHtml writes one select with data-action set-columns and the label Columns, entries Default (n) or Default (none), then 1 to 6, 8, 12 and the value in force when it is none of those; on the page of a saved view it edits the view through editSavedView and setViewLayout, elsewhere it sets diagramColumns (null when equal to what the lower levels give) and asks for a redraw'
        - 'the handler for set-columns in composition/events.js as a change event of a select; it does not call pushDiagramHistory (a comment says layout is not in the address until W-3); no modelsChanged'
        - 'the form of a saved view in presentation/stories-pages.js has the same list, and an extra entry invalid with the sentence under the field for an existing invalid value'
        - 'readSettingsDraft in model/form-validation.js runs columnsProblem on the layout of overview, detailed and deep and refuses with the sentence at the field; map is not added to VIEWPOINT_IDS; the help text of viewsProperties in presentation/help-and-settings.js names the key'
        - 'style.css: the list fits the .diagram-tools row and wraps at 360 px'
        - 'standalone.html rebuilt'
      verification:
        - 'node --test on diagram-columns-view.test.js passes, including the Settings refusal, the view form and the invalid entry'
        - 'npm run test:unit, npm run lint, npm run format:check and npm run editor:check pass'
        - 'grep -n pushDiagramHistory src/main/editor/composition/events.js shows no call in the set-columns branch'
      risk: 'medium'
      confidence: 70
      human_review: 'none'
      escalation_triggers:
        - 'redraw is only available through render(): use requestRedraw(); render() is called in composition only (RFC-002 rule 2)'
        - 'the css theme audit test fails on the new class: add the entry to the audit with theme variables, never weaken the test'
      delegation_tier: 'standard'
      results: "tier standard, model sonnet, effort medium, profile low-cost, passed first time, inline (leaf), independently verified"
    - id: task-005
      title: 'Extend GuideViewPropertiesTest, add the layout row to the guide and regenerate the golden'
      source_requirements:
        prd:
          - 'REQ-5'
          - 'REQ-11'
        tdd:
          - 'IMP-7'
          - 'CTR-1'
          - 'CON-7'
          - 'VER-5'
      outputs:
        - 'GuideViewPropertiesTest: layout added to the list of keys the guide says the command line ignores; a case where a view with properties layout columns 2 and a case where settings.views.properties.<viewpoint> holds layout columns 2 (overview, detailed, deep) draw files equal to the bare workspace; the existing check that every key of VIEW_PROPERTY_ORDER is in the guide passes'
        - 'guide.md: a row for layout in the table of view properties (all viewpoints, mapping with columns, whole number 1 to 20, ignored by the command line, aims at N boxes per row in the editor and ELK may exceed it when links join boxes) and layout in the closing sentence next to facet, hide-unlinked, labels, qualifiers, descriptions and wrap; a sentence that the generated views carry the key from settings.views.properties and draw nothing from it'
        - 'golden.md regenerated with archicode guide | sed 1s/.*/archicode guide @VERSION@/ from the built application'
        - 'src/main/java is unchanged'
      verification:
        - 'JAVA_HOME at JDK 25: ./mvnw test -Dtest=GuideViewPropertiesTest,GuideTest exits 0'
        - 'git diff --stat -- src/main/java prints nothing'
        - 'git diff --stat -- src/test/resources/schemas prints nothing'
        - 'wc -c src/main/resources/guide/guide.md stays within the 30 KB budget GuideTest enforces'
      risk: 'low'
      confidence: 75
      human_review: 'none'
      escalation_triggers:
        - 'the guide test reads VIEW_PROPERTY_ORDER from a page that lacks layout: rebuild the page with npm run editor:build first'
        - 'a drawn file differs from the bare one: the command line reads layout somewhere, stop and report with the file'
      delegation_tier: 'standard'
      results: "tier standard, model sonnet, effort medium, profile low-cost, passed first time, inline (leaf), independently verified"
    - id: task-006
      title: 'Write the end-to-end spec, measure the real diagram and record the rows'
      source_requirements:
        prd:
          - 'REQ-9'
          - 'REQ-10'
        tdd:
          - 'VER-6'
          - 'VER-7'
          - 'RISK-1'
          - 'RISK-2'
      outputs:
        - 'src/test/e2e/diagram-columns.spec.js (chromium and firefox, the serve fixture, a copy of the layered Brightcart): the Map with columns 4 in settings.views.properties.map.layout has at most 5 boxes in a row in each container (rows read from the y of the data-ref boxes of the SVG); a saved view with columns 2 overrides it; the toolbar list overrides both; the Default entry returns to the view value; removing the value from the file and reloading gives the box positions of the run before; at 360 px the list is inside the box of the toolbar'
        - 'a helper in the spec that counts rows per container, used to fill the table of VER-7 for the page of an element, a Map and a saved view, before and after columns 4, and to time the layout with and without the value'
        - 'the table and the times in the run document; a row above 5 or a time above twice the base is reported as a finding'
      verification:
        - 'JAVA_HOME at JDK 25: ./mvnw package -Dmaven.test.skip -Dplugin.asciidoctor.skip=true -Dpmd.skip=true exits 0, then npx playwright test src/test/e2e/diagram-columns.spec.js --project=chromium --project=firefox exits 0'
        - 'npm run lint and npm run format:check pass on the spec'
        - 'the run document holds the table of rows for the three pages'
      risk: 'medium'
      confidence: 65
      human_review: 'none'
      escalation_triggers:
        - 'a container shows 6 or more boxes in a row at columns 4: record it as RISK-1 evidence, keep the acceptance at most 5 in the spec for the shipped fixture and report the case in the run document'
        - 'the spec is unstable: drop the flaky flow with its reason, never add a retry (workers 1, retries 0)'
      delegation_tier: 'standard'
      results: "tier standard, model sonnet, effort medium, profile low-cost, passed first time, inline (leaf), independently verified"
    - id: task-007
      title: 'Document layout.columns in the manual and in CLAUDE.md'
      source_requirements:
        prd:
          - 'REQ-11'
        tdd:
          - 'IMP-8'
          - 'CTR-1'
      outputs:
        - 'src/doc/README.adoc: the diagram section of the editor, the settings section and the view properties describe layout.columns (aims at N boxes per row, ELK may exceed it when links join boxes, whole number 1 to 20, the four levels and their order, the sentence of an invalid value, the Map workspace value checked when a Map is drawn, the command line ignores it, the toolbar value is not in the address until the address work of the wave), and [[editor-small-screen]] names the list at 360 px'
        - 'CLAUDE.md: one paragraph in Architecture, in the style of the paragraphs on the links and the highlight (resolver part, bound, levels, cache key, state, Settings check, tests, what is not proved)'
      verification:
        - 'grep -n "layout.columns" CLAUDE.md src/doc/README.adoc finds the new text in both files'
        - 'JAVA_HOME at JDK 25: ./mvnw -q -DskipTests -Dplugin.asciidoctor.skip=false generate-resources exits 0 or, if the asciidoctor goal is bound to another phase, ./mvnw package -Dmaven.test.skip -Dpmd.skip=true exits 0, so the manual still builds'
        - 'npm run format:check passes'
      risk: 'low'
      confidence: 85
      human_review: 'none'
      escalation_triggers:
        - 'an anchor named in the manual does not exist: read the file and use the real anchor'
      delegation_tier: 'cheap'
      results: "tier cheap, model haiku, effort high, profile low-cost, passed first time, inline (leaf), independently verified"
    - id: task-008
      title: 'Show the tests fail on purpose, run every gate and record the evidence'
      source_requirements:
        prd:
          - 'REQ-5'
          - 'REQ-7'
          - 'REQ-12'
        tdd:
          - 'VER-8'
          - 'Observability and Verification, last bullet'
      outputs:
        - 'three deliberate breaks, each undone after the run: the layering keys left off a compound node, two levels of the resolver swapped, the value left out of diagramCacheKey; the failing test name of each in the run document'
        - 'the output tail of npm run editor:build, editor:check, test:unit, test:coverage, lint, format:check, node scripts/check-editor.mjs --list (compared with the baseline of task-001), ./mvnw verify, scripts/byte-identity.sh, npx playwright test src/test/e2e/diagram-columns.spec.js and wc -l of the new and edited parts, in the run document'
        - 'the result of each criterion of the Executive Summary, true or false, in the run document'
      verification:
        - 'after each break the named test exits non-zero, after the restore npm run editor:build then node --test on the same file exits 0 and git diff against the saved copy of the file prints nothing'
        - 'npm run editor:check, npm run test:coverage, npm run lint and npm run format:check exit 0'
        - 'JAVA_HOME at JDK 25: ./mvnw verify exits 0'
        - 'scripts/byte-identity.sh exits 0 and scripts/byte-identity-exceptions.txt is unchanged (git diff --stat -- scripts/byte-identity-exceptions.txt prints nothing)'
        - 'node scripts/check-editor.mjs --list shows no upward pair absent from the baseline and ratchet.max in src/main/editor/layers.json is at most 99'
        - 'git diff --stat -- scripts/editor-coverage-floor.json prints nothing that lowers a figure'
      risk: 'low'
      confidence: 75
      human_review: 'none'
      escalation_triggers:
        - 'a restore leaves a difference: restore from the saved copy and rebuild the page before anything else'
        - 'byte-identity reports a new difference: stop, name the command and the file, and do not add an exception'
        - 'a coverage floor fails: add tests, never lower the floor'
      delegation_tier: 'standard'
      results: "tier standard, model sonnet, effort medium, profile low-cost, passed first time, inline (leaf), independently verified"
```

## 5. Parallelization Plan

```yaml
parallelization_plan:
  groups:
    - id: parallel-group-001
      tasks:
        - task-004
        - task-005
      reason: 'the toolbar and the Settings check (editor sources) and the guide with its Java test (guide.md, golden.md, one test file) share no source file'
      conflict_risks:
        - 'both run npm run editor:build, which writes the one generated standalone.html: the write is idempotent for the same sources, but task-005 must rebuild after task-004 has saved its files before it regenerates golden.md, or run the guide test only against a page that already holds layout in VIEW_PROPERTY_ORDER (task-003 put it there)'
        - 'names.json is touched by task-004 only if it adds a top-level name; task-005 does not touch it'
    - id: parallel-group-002
      tasks:
        - task-006
        - task-007
      reason: 'the end-to-end spec (a new file under src/test/e2e and the run document) and the documentation (README.adoc and CLAUDE.md) share no file'
      conflict_risks:
        - 'both append to the run document: task-006 writes the table of rows, task-007 writes nothing there; keep the appends to separate headings'
```

## 6. Human Review Gates

```yaml
human_review_gates:
  gates: []
```

No gate. The run operates under the autonomy override of complete-run, and no task is flagged for a human. The judgments the run makes are measured rules: the bound of 20 (DEC-1, written in the guide and the manual), the 5-in-a-row acceptance for a bound of 4 on the real Brightcart (task-006), and the 2 times limit on layout time reported as a finding. Nothing here touches authentication, data deletion or a release.

## 7. Risk Assessment

```yaml
risk_assessment:
  by_task:
    - id: task-001
      risk: 'low'
      rationale: 'New test files only; the only trap is a reference copy of the old graph function.'
    - id: task-002
      risk: 'medium'
      rationale: 'The ELK keys decide the layout of every diagram; a key added when no value is set would move every drawing. The deep-equal test against the old function guards it.'
    - id: task-003
      risk: 'medium'
      rationale: 'Touches the recipes, the cache key, the saved view canonical form and applySavedView, which every diagram and every saved view go through; the price of a mistake is a changed key or a rewritten view for people who never set a layout.'
    - id: task-004
      risk: 'medium'
      rationale: 'A new control in a shared toolbar and the Settings save; the shared files diagram-page.js and style.css are also W-1 and W-3 files.'
    - id: task-005
      risk: 'low'
      rationale: 'A Java test and a document with a golden file; no Java main change.'
    - id: task-006
      risk: 'medium'
      rationale: 'ELK cannot run in the node suite, so the real layout is proved only here; the bound is a tendency (RISK-1) and the spec reads box positions from a real browser in two engines.'
    - id: task-007
      risk: 'low'
      rationale: 'Documentation of a finished control.'
    - id: task-008
      risk: 'low'
      rationale: 'Runs checks; the deliberate breaks are undone and compared with a saved copy.'
  by_area:
    - area: 'ui'
      risk: 'medium'
      rationale: 'Every diagram of the editor and of the player is drawn through the changed functions; the default path must be byte for byte today.'
    - area: 'api'
      risk: 'low'
      rationale: 'The contract is an additive editor key, ignored by the command line; kernel contract 5 and both schema goldens stay.'
    - area: 'docs'
      risk: 'low'
      rationale: 'The guide golden and the manual must move in the same change as the key.'
    - area: 'infra'
      risk: 'low'
      rationale: 'No workflow or pom change; the generated page is committed with its sources.'
```

## 8. Confidence Assessment

```yaml
confidence_assessment:
  by_task:
    - id: task-001
      score: 80
      rationale: 'The functions to test are named in the TDD and the review corrected where they live; the reference copy of the old graph is mechanical.'
    - id: task-002
      score: 80
      rationale: 'A pure function and two option keys that the spike already exercised; the deep-equal test catches a leak into the default path.'
    - id: task-003
      score: 70
      rationale: 'Many places to touch and one review correction (state in model/ui-state.js); the node tests for the view and the step are written first.'
    - id: task-004
      score: 70
      rationale: 'A select and a change handler follow a known pattern (handleStoryPlayerChange); the shared toolbar CSS and the redraw rule are the unknowns.'
    - id: task-005
      score: 75
      rationale: 'The guide test reads the page by regular expression and a case must prove the command line draws nothing from layout; a JDK 25 build is needed.'
    - id: task-006
      score: 65
      rationale: 'The bound is a tendency on real diagrams; the acceptance of at most 5 rests on one spike and may need a finding.'
    - id: task-007
      score: 85
      rationale: 'Prose in two files whose style is set by earlier paragraphs.'
    - id: task-008
      score: 75
      rationale: 'Long gates (Maven verify, byte-identity, coverage) with clear exit codes; the breaks are restored from a saved copy.'
```

## 9. Agent Assignment Plan

```yaml
agent_assignment_plan:
  assignments:
    - task_id: task-001
      agent_role: 'Test Generation Agent'
      objective: 'Record the ratchet baseline and write the three node test files so that they fail now for the right reasons and state DEC-1 to DEC-7.'
      context:
        prd_excerpts:
          - 'REQ-2 and REQ-6: one resolver, order toolbar, view, workspace, none; an invalid value is a sentence, never a silent fallback'
          - 'REQ-3 and REQ-7: with no value the ELK graph and the boxes of the saved Maps are today'
        tdd_excerpts:
          - 'DEC-1 sentences, DEC-2 resolveDiagramColumns returning columns, from and problem, DEC-3 the two layering keys on the root and each compound node'
          - 'Review F-5, F-6, F-9: applySavedView, the first set level decides, the view form and a step with an inline recipe'
      likely_files:
        - 'src/test/javascript/viewpoint-kernel/diagram-columns.test.js'
        - 'src/test/javascript/viewpoint-kernel/diagram-columns-elk.test.js'
        - 'src/test/javascript/viewpoint-kernel/diagram-columns-view.test.js'
        - 'src/test/javascript/viewpoint-kernel/harness.js'
        - 'src/test/javascript/viewpoint-kernel/story-player-scene.test.js'
      acceptance_criteria:
        - 'the three files fail on the current page and the failures name the missing resolver, keys and layout handling'
        - 'the baseline of check-editor.mjs --list is in the run document'
      verification:
        - 'node --test on each file, then npm run format:check'
      escalation_triggers:
        - 'buildElkGraph is not reachable from the harness'
      suggested_subagent_type: 'general-purpose'
      suggested_model: '(default)'
      suggested_effort: 'medium'
    - task_id: task-002
      agent_role: 'Frontend Implementation Agent'
      objective: 'Create model/diagram-columns.js and make buildElkGraph bind the layers when columns is set.'
      context:
        prd_excerpts:
          - 'REQ-3: the bound is set on the root and on every compound node; with no value it is set on none'
        tdd_excerpts:
          - 'DEC-2 and DEC-3, IMP-1 and IMP-2; elk.layered.layering.strategy COFFMAN_GRAHAM and elk.layered.layering.coffmanGraham.layerBound as String(columns)'
          - 'Review F-1, F-3, F-6: four viewpoints for the resolver, isPlainObject lives in model/styles.js, the first set level decides'
      likely_files:
        - 'src/main/editor/model/diagram-columns.js'
        - 'src/main/editor/presentation/diagram-layout.js'
        - 'src/main/editor/layers.json'
        - 'src/main/editor/names.json'
      acceptance_criteria:
        - 'diagram-columns.test.js passes, and diagram-columns-elk.test.js passes except the one test `a saved Map with a layout reaches the layout engine bounded...` (it needs the recipe wiring of task-003 and is checked there; do not add that wiring in this task)'
        - 'editor:check exits 0 with no new upward pair'
      verification:
        - 'node --test on both files (the one named test may fail until task-003), npm run editor:build, npm run editor:check, node scripts/check-editor.mjs --list'
      escalation_triggers:
        - 'a new upward pair appears'
      suggested_subagent_type: 'general-purpose'
      suggested_model: '(default)'
      suggested_effort: 'medium'
    - task_id: task-003
      agent_role: 'Frontend Implementation Agent'
      objective: 'Make every diagram read the value in force and make the saved view, applySavedView and storyStepScene keep it, with no change for a workspace that sets none.'
      context:
        prd_excerpts:
          - 'REQ-4: view state, in diagramCacheKey, never modelsChanged'
          - 'REQ-8: the player draws the same boxes as the editor for the same view'
        tdd_excerpts:
          - 'DEC-5 canonical form, setViewLayout, currentViewDefinition; DEC-6 cache key only when set; DEC-7 layoutProblem and the error panel in computeDiagramScene'
          - 'Review F-3 and F-5: diagramColumns in model/ui-state.js, reset in resetUiState, applySavedView sets it; F-8 viewKey unchanged; F-11 VIEW_PROPERTY_ORDER in presentation/view-edit.js as the first array literal'
      likely_files:
        - 'src/main/editor/model/ui-state.js'
        - 'src/main/editor/application/folder-session.js'
        - 'src/main/editor/application/view-recipe.js'
        - 'src/main/editor/presentation/view-edit.js'
        - 'src/main/editor/presentation/diagram-page.js'
        - 'src/main/editor/presentation/story-scene.js'
      acceptance_criteria:
        - 'diagram-columns-view.test.js and story-player-scene.test.js pass and npm run test:unit passes'
        - 'diagram-columns-elk.test.js passes in full, including `a saved Map with a layout reaches the layout engine bounded...`'
        - 'the cache key of a diagram with no value is the old string'
      verification:
        - 'npm run editor:build then npm run test:unit then npm run editor:check'
      escalation_triggers:
        - 'an existing test changes its expectation: fix the code'
      suggested_subagent_type: 'general-purpose'
      suggested_model: '(default)'
      suggested_effort: 'medium'
    - task_id: task-004
      agent_role: 'Frontend Implementation Agent'
      objective: 'Add the Columns select to the toolbar and to the form of a saved view, handle set-columns, and refuse an invalid layout in the Settings save for the three viewpoints it edits.'
      context:
        prd_excerpts:
          - 'REQ-1: an author changes the value on the diagram on screen with a list'
          - 'REQ-6: a typo is a sentence at the field'
        tdd_excerpts:
          - 'DEC-4 the list entries and the Default (n) entry; DEC-8 readSettingsDraft runs columnsProblem; IF-1, IF-2, FLOW-2, FLOW-3'
          - 'Review F-1 and F-7: do not add map to VIEWPOINT_IDS; no pushDiagramHistory in set-columns until the address work'
      likely_files:
        - 'src/main/editor/presentation/diagram-page.js'
        - 'src/main/editor/presentation/stories-pages.js'
        - 'src/main/editor/composition/events.js'
        - 'src/main/editor/model/form-validation.js'
        - 'src/main/editor/presentation/help-and-settings.js'
        - 'src/main/editor/style.css'
      acceptance_criteria:
        - 'the node tests of the toolbar list, the view form and the Settings refusal pass'
        - 'lint, format check and editor:check pass'
      verification:
        - 'npm run editor:build, npm run test:unit, npm run lint, npm run format:check, npm run editor:check'
      escalation_triggers:
        - 'the theme audit test fails on the new class'
      suggested_subagent_type: 'general-purpose'
      suggested_model: '(default)'
      suggested_effort: 'medium'
    - task_id: task-005
      agent_role: 'Documentation Agent'
      objective: 'Make the guide and its Java test say and prove that the command line ignores layout, and regenerate the golden.'
      context:
        prd_excerpts:
          - 'REQ-5: the command line ignores the key; the guide names layout among the ignored keys; golden.md is regenerated in the same change'
        tdd_excerpts:
          - 'IMP-7, CON-7, CTR-1'
          - 'Review F-2 and F-4: the overview, detailed and deep services merge settings.views.properties into generated views and draw nothing from layout; the proof is a drawn-file comparison, not a grep'
      likely_files:
        - 'src/test/java/io/morin/archicode/cli/GuideViewPropertiesTest.java'
        - 'src/main/resources/guide/guide.md'
        - 'src/test/resources/guide/golden.md'
      acceptance_criteria:
        - 'GuideViewPropertiesTest and GuideTest pass; src/main/java is unchanged'
      verification:
        - 'JAVA_HOME at JDK 25: ./mvnw test -Dtest=GuideViewPropertiesTest,GuideTest'
      escalation_triggers:
        - 'a drawn file differs from the bare one'
      suggested_subagent_type: 'general-purpose'
      suggested_model: '(default)'
      suggested_effort: 'medium'
    - task_id: task-006
      agent_role: 'QA Agent'
      objective: 'Write the Chromium and Firefox spec on the layered Brightcart, run it on the packaged jar, and record rows per container before and after columns 4 and the layout times.'
      context:
        prd_excerpts:
          - 'REQ-9 and REQ-10: at most 5 boxes in a row at columns 4; the run records the rows before and after for the page of an element, a Map and a saved view'
        tdd_excerpts:
          - 'VER-6 and VER-7; RISK-1 the bound is a tendency; RISK-2 time with and without the value'
      likely_files:
        - 'src/test/e2e/diagram-columns.spec.js'
        - 'src/test/e2e/fixtures.js'
        - 'src/test/e2e/harness.js'
      acceptance_criteria:
        - 'the spec passes in both engines and the table is in the run document'
      verification:
        - 'JAVA_HOME at JDK 25: ./mvnw package -Dmaven.test.skip -Dplugin.asciidoctor.skip=true -Dpmd.skip=true then npx playwright test src/test/e2e/diagram-columns.spec.js'
      escalation_triggers:
        - 'a container shows 6 or more boxes in a row at columns 4'
      suggested_subagent_type: 'general-purpose'
      suggested_model: '(default)'
      suggested_effort: 'high'
    - task_id: task-007
      agent_role: 'Documentation Agent'
      objective: 'Write layout.columns into the manual and into CLAUDE.md as built.'
      context:
        prd_excerpts:
          - 'REQ-11: the manual and CLAUDE.md describe layout.columns; the guide names the key'
        tdd_excerpts:
          - 'IMP-8, CTR-1, DEC-3 manual wording that it aims at N and ELK may exceed it'
      likely_files:
        - 'src/doc/README.adoc'
        - 'CLAUDE.md'
      acceptance_criteria:
        - 'both files describe the levels, the order, the range, the sentence, the Map workspace value check and the command line ignoring the key'
      verification:
        - 'grep for layout.columns in both files, then the manual builds'
      escalation_triggers:
        - 'an anchor does not exist'
      suggested_subagent_type: 'Explore'
      suggested_model: 'haiku'
      suggested_effort: 'low'
    - task_id: task-008
      agent_role: 'QA Agent'
      objective: 'Break the code three ways on purpose, see a test catch each, restore, then run every gate and record the evidence against the Executive Summary criteria.'
      context:
        prd_excerpts:
          - 'REQ-5, REQ-7, REQ-12: byte-identity, the Map contracts, ratchet and floors'
        tdd_excerpts:
          - 'VER-8 and the last bullet of Observability and Verification'
      likely_files:
        - 'src/main/editor/presentation/diagram-layout.js'
        - 'src/main/editor/model/diagram-columns.js'
        - 'src/main/editor/presentation/diagram-page.js'
        - 'docs/wav/wav-027-editor-layout-and-walk/run/run-0202-diagram-layout-columns/run-0202-diagram-layout-columns.md'
      acceptance_criteria:
        - 'every criterion of the Executive Summary is recorded true, or a finding names the one that is not'
      verification:
        - 'the commands of the task catalog, each with its exit code in the run document'
      escalation_triggers:
        - 'byte-identity reports a new difference'
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
        - 'node --test on the three new files, red'
        - 'format check'
      success_criteria:
        - 'the failures name the missing resolver, the missing layering keys and the missing layout handling'
        - 'the ratchet baseline is in the run document'
    - task_id: task-002
      methods:
        - 'node tests of the resolver and the ELK graph'
        - 'editor:build and editor:check'
        - 'check-editor.mjs --list against the baseline'
      success_criteria:
        - 'with no columns the graph deep-equals the reference copy of the old function'
        - 'with columns 4 the two keys are on the root and on each node with children and on no leaf'
        - 'no new upward pair'
    - task_id: task-003
      methods:
        - 'node tests of the view, the cache key and the story scene'
        - 'full node unit suite'
        - 'editor:check'
      success_criteria:
        - 'the cache key with no value is the old string'
        - 'the player and the editing walk build equal graphs and the player ignores a toolbar value'
        - 'applySavedView sets and clears diagramColumns for a view and a step'
    - task_id: task-004
      methods:
        - 'node tests of the toolbar, the view form and the Settings refusal'
        - 'lint and format check'
        - 'editor:check'
      success_criteria:
        - 'the list offers Default (n), 1 to 6, 8, 12 and the value in force'
        - 'the Settings save refuses an invalid layout with the sentence for overview, detailed and deep'
        - 'no pushDiagramHistory in set-columns'
    - task_id: task-005
      methods:
        - 'Maven tests GuideViewPropertiesTest and GuideTest'
        - 'diff of src/main/java and of the schema goldens'
      success_criteria:
        - 'a view and a settings layout draw files equal to the bare workspace'
        - 'golden.md equals the generated guide; src/main/java and the schema goldens are unchanged'
    - task_id: task-006
      methods:
        - 'playwright spec in chromium and firefox on the packaged jar'
        - 'lint and format check on the spec'
      success_criteria:
        - 'at most 5 boxes in a row in each container at columns 4'
        - 'view overrides workspace, toolbar overrides view, Default returns to the view, removing the value restores the old positions'
        - 'the table of rows and the times are in the run document'
    - task_id: task-007
      methods:
        - 'grep of the new text in both files'
        - 'manual build'
      success_criteria:
        - 'both files describe layout.columns as built'
    - task_id: task-008
      methods:
        - 'three deliberate breaks and restores'
        - 'editor:check, test:coverage, lint, format:check'
        - 'Maven verify'
        - 'byte-identity script'
        - 'ratchet and line counts'
      success_criteria:
        - 'each break is caught by a named test and each restore leaves the file as saved'
        - 'every gate exits 0, ratchet.max is at most 99, no floor is lowered, no part has more than 3000 lines'
        - 'byte-identity reports no new difference and its exceptions file is unchanged'
```

## 11. Escalation Rules

```yaml
escalation_rules:
  rules:
    - condition: 'A task fails its own verification'
      action: 'Re-dispatch it once one effort step up with the failing output; a second failure is handled inline by the main agent and logged as a finding in the prg.'
    - condition: 'ratchet.max would rise above 99 or a new upward pair appears'
      action: 'Move the helper to a lower layer; never raise the ratchet.'
    - condition: 'A statement of the TDD contradicts the repository'
      action: 'Section 2 lists the Stage 5 corrections; for any other contradiction the files win, the task logs the finding in the prg and builds on the files.'
    - condition: 'With no layout set, any drawing, key, file or cache string differs from today'
      action: 'Stop, fix the code, never the reference or the golden; the default path is the contract (TG-3).'
    - condition: 'The command line draws a different file when layout is set'
      action: 'Stop and report the file; a Java main change is out of scope and needs a decision recorded in the run document.'
    - condition: 'A container shows more than 5 boxes in a row at columns 4 on the Brightcart'
      action: 'Record it as RISK-1 evidence with the table; do not weaken the spec silently and do not add a post-ELK row cut (RFC-001 rejects it).'
    - condition: 'A coverage floor, the ratchet or the byte-identity check fails'
      action: 'Add tests or fix the code; never lower a floor, raise the ratchet or add an exception line.'
    - condition: 'A task would need a commit, a push or a clean git status to be verified'
      action: 'None does: every check reads files or command output. Committing is a step outside this plan.'
    - condition: 'A task is marked for a human'
      action: 'None is. The run operates under the autonomy override of complete-run, so a human_required or review_before task would be executed by an agent and the override logged in the prg.'
    - condition: 'The address, direction, spacing or a hard row cap is asked for'
      action: 'They are DEF-1 and DEF-3 and out of scope; say so in the run document.'
```

## 12. Final Execution Manifest

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
  critical_path_tasks:
    - task-001
    - task-002
    - task-003
    - task-004
    - task-006
    - task-008
  parallel_groups:
    - parallel-group-001
    - parallel-group-002
  required_human_gates: []
  highest_risk_tasks:
    - task-002
    - task-003
    - task-004
    - task-006
  lowest_confidence_tasks:
    - task-006
    - task-003
    - task-004
  next_action: 'Run task-001 (baselines and red node tests), then task-002 and task-003 in order, then task-004 and task-005 in parallel.'
  criteria:
    - 'the node tests fail before the code and pass after it, and three deliberate breaks are each caught'
    - 'with no layout set nothing moves: the graph, the cache key and the saved Map boxes are today'
    - 'the command line ignores layout, proved by a drawn-file comparison, and the guide golden is regenerated'
    - 'the end-to-end spec passes in chromium and firefox and the rows before and after columns 4 are recorded'
    - 'editor:check, test:unit, test:coverage, lint, format:check and Maven verify pass; ratchet.max at most 99; byte-identity shows no new difference'
    - 'CLAUDE.md and the manual describe layout.columns'
```
