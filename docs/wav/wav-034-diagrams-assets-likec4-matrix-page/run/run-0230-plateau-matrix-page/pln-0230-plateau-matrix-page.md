---
title: Execution Plan - A Reading view for a path of plateaus on the page Plateaus
status: draft
date: 2026-11-07
related:
  - docs/wav/wav-034-diagrams-assets-likec4-matrix-page/run/run-0230-plateau-matrix-page/tdd-0230-plateau-matrix-page.md
  - docs/wav/wav-034-diagrams-assets-likec4-matrix-page/wav-034-diagrams-assets-likec4-matrix-page.md
  - 'gh:tmorin/archicode#24'
type: pln
run: 0230
wave: 034
---

# Execution Plan: A Reading view for a path of plateaus on the page Plateaus

Profile TDD+pln: there is no PRD, so REQ-1 to REQ-7 are the IDs the TDD labels (section "PRD Traceability"), taken from issue #24, its author's decisions of 2026-10-31 and the gate of phase P3. The TDD is the design (DEC-1 to DEC-8, IMP-1 to IMP-10, CTR-1 to CTR-3, FLOW-1 and FLOW-2). The plan commits nothing: the commit is a human step outside it.

Autonomy: this wave runs with no autonomy override. The plan has no `human_required` task and no task with `risk: critical` or `human_review: required`, so none stops for a human. The final gates task is `review_after`: the author reads the page and the pull request.

The Stage 5 review of the TDD found points that the TDD text carried when this plan was drafted. Stage 9 amended the TDD with each of them (the TDD and this plan now agree); the plan was drafted from the corrections, and each is a gap below, recorded as fixed in the TDD: `drawPlateau` takes `{ compare: '<choice>' }` and not a string; `CHANGE_STATES` and the glyphs live in `presentation/diagram-states.js` and are empty until the kernel loads, so the pure rule returns state words only and the glyphs are added in `presentation/`; the page has no memo of its own (the comparison cache `sceneComparisonMemo()` is the only one); `application/folder-session.js` is edited (`resetUiState`); the blocked, null and stale-path states are handled; CI-arc-1 is checked against `mirror of` and `shared_cases`; Q-1 is resolved (`replaces` and `natures` are arrays on the rows of `state.full.changes`).

Every Maven command runs with `JAVA_HOME=$HOME/.sdkman/candidates/java/25.0.4-tem` (the shell Java is 21). Tasks that edit `src/main/editor` run `npm run editor:build` themselves and run in sequence, so no two tasks write `standalone.html` at once.

## 1. Executive Summary

```yaml
summary:
  status: 'pending'
  product_goal: 'On the page Plateaus a reader chooses a plateau on the tree and reads, in one table, the lineages of the path from the root to it (a column per plateau plus Span, rows grouped by layer, unchanged rows folded), with the same rows as archicode plateau matrix'
  technical_approach: 'A pure port of PlateauMatrix.java in model/plateau-matrix.js pinned by matrix-cases.json, an assembly and a table in presentation/plateau-matrix-page.js that read comparisonStateOf through the story scene drawing and memo, two address keys, a click that draws the pair and opens the Changes panel, one end-to-end spec on two browsers'
  total_tasks: 8
  parallel_groups: 1
  high_risk_tasks: 0
  human_review_gates: 1
  autonomy_level: 'medium'
  recommendation: 'proceed_with_review'
  criteria:
    - 'A node test reads matrix-cases.json and the pure rule gives the rows, the cells, the Span, the from of each cell and the counts of the three cases, with matrix-cases.json unchanged'
    - 'The page Plateaus has Read the path on every non-root plateau, the table of the path, the Changes only fold, the keys matrix= and rows=all in the address, and a click that draws the pair and opens the Changes panel'
    - 'The end-to-end spec plateau-matrix.spec.js passes with --project=chromium and --project=firefox'
    - 'npm run editor:check shows the ratchet at 99 or lower with no new upward pair, and no figure of scripts/editor-coverage-floor.json is lower'
    - 'git diff --stat on src/main/rust, src/main/wasm, matrix-cases.json and the expected comparisons of the Brightcart prints nothing'
    - 'PMD, verify with the integration tests, byte-identity without a new exception, the node tests, format, lint, editor:build and sample:build all pass and leave git status unchanged by the two builds'
    - 'The manual and the notes of presentation/ say what the page does'
```

## 2. PRD/TDD Consistency Assessment

```yaml
consistency_assessment:
  aligned_items:
    - 'REQ-1 to REQ-7 each map to at least one DEC and one IMP of the TDD, and each to a task below'
    - 'The gate commands of the wave (P3 criteria 1 to 3) are the verification of task-002, task-006 and task-008'
    - 'The three new places and six edited ones of the TDD are the split of task-002 to task-005'
  gaps:
    - id: gap-001
      type: 'contradiction'
      description: 'DEC-7 and FLOW-2 write drawPlateau(column, ''other:<id>'') with a string; the function takes (id, options) with options.compare (application/plateau-choice.js)'
      impact: 'medium'
      recommendation: 'Task-003 calls drawPlateau(target, { compare: choice }) and the page test pins it. Stage 9: the TDD (DEC-7, FLOW-2) now says so'
    - id: gap-002
      type: 'contradiction'
      description: 'The Proposed Design puts matrixCellText in model/ with CHANGE_STATES glyphs, but CHANGE_STATES is in presentation/diagram-states.js and is empty until the kernel loads; a model part using it is an upward pair'
      impact: 'high'
      recommendation: 'Task-002 returns state words only (new, changed, removed, moved, split, merged, absent, present); task-003 maps the glyphs from CHANGE_STATES in presentation/, with - and = for absent and present, and a plain word while CHANGE_STATES is empty (matrixGlyphOf). Stage 9: the TDD (Proposed Design, DEC-4, CON-5) now says so'
    - id: gap-003
      type: 'contradiction'
      description: 'The Proposed Design says plateauMatrixNow memoizes on layerCache; DEC-3 says no second cache'
      impact: 'medium'
      recommendation: 'No memo of the page: the cache is the comparison memo of sceneComparisonMemo() only. Stage 9: the TDD (Proposed Design, TG-2) now says so'
    - id: gap-004
      type: 'contradiction'
      description: 'The Proposed Design says application is untouched; resetUiState is in application/folder-session.js and must clear plateauReading'
      impact: 'medium'
      recommendation: 'Task-003 edits application/folder-session.js for the reset and keeps snapshotWriteState free of the state. Stage 9: the TDD (Proposed Design, IMP-4, Scope) now says so'
    - id: gap-005
      type: 'missing_technical_design'
      description: 'Blocked layers (layers.blocked), no layers (AppState.layers null) and a stored path that is not in the tree are not designed'
      impact: 'medium'
      recommendation: 'Task-003 and task-004: no block and no button when there is no plateau tree or the layers are blocked; a path that is not in the tree, is the root or has a plateau that cannot be drawn is dropped from the state and the address; the page test has one case for each. Stage 9: the TDD (IF-4, DEC-6, CTR-2) now says so'
    - id: gap-006
      type: 'ambiguity'
      description: 'CI-arc-1 says none, while the model of ArchiCode has mirror of relationships and shared_cases that may name the Plateaus page or the matrix cases'
      impact: 'low'
      recommendation: 'Task-007 greps docs/architecture for plateau, matrix, mirror of and shared_cases and for the question files; if a sentence goes stale it is changed with sample:build and the drift and impact tests are run. Stage 9: the TDD (CI-arc-1) now says so'
    - id: gap-007
      type: 'ambiguity'
      description: 'Q-1 (the shape of a changes row) is resolved from the sources: replaces and natures are arrays on the rows of state.full.changes (the TDD says so since Stage 6)'
      impact: 'low'
      recommendation: 'Task-001 prints one row of the Brightcart pair to pin the shape; task-002 reads row.replaces and row.natures as arrays'
    - id: gap-008
      type: 'risk'
      description: 'Q-2 (time of N compare calls) is resolved by default: no worker; the figure is measured at the end'
      impact: 'low'
      recommendation: 'Task-008 times the first open on the Brightcart and on replaces-large-pair (839 changes, the harbour of src/test/resources/replaces-large-pair/plateaus) and records the figures; over one second is a finding, DEF-3 stands'
    - id: gap-010
      type: 'ambiguity'
      description: 'The TDD (DEC-1, IMP-7) says the oracle test feeds the rule with the data of the Brightcart without saying where presence and the changes of each pair come from before the page exists; task-003 reads the cells through the page'
      impact: 'low'
      recommendation: 'Task-002 builds the inputs of the oracle test in the test itself, through the node harness as story-player-scene.test.js and plateaus-page-and-addresses.test.js do (createApp, loadWorkspace on the layered Brightcart, loadViewpointKernel, then layerModelOf for presence and comparisonStateOf over drawingOfPlateaus with the memo for each pair and the Span, element rows of state.full.changes); task-003 then proves the same cells through the table. Where that cannot be done before the assembly exists, task-002 proves the rule on presence and rows rebuilt from the oracle itself (expectRows and the counts) and logs it, and the comparison with the kernel is proved in task-003'
    - id: gap-009
      type: 'missing_requirement'
      description: 'There is no PRD, so REQ-n are labels read from the TDD and traceability is incomplete'
      impact: 'low'
      recommendation: 'Accepted by the profile; every task lists the REQ-n it serves'
  blocking_gaps: []
```

## 3. Execution Graph

```yaml
execution_graph:
  nodes:
    - id: task-001
      status: 'done'
      title: 'Baseline facts: state of the gates on the starting repository, the shape of one changes row, the count of upward pairs'
      depends_on: []
      produces:
        - 'a Facts block appended to prg-0230-plateau-matrix-page.md (the result of editor:check and the node tests on the starting tree, the number printed by check-editor.mjs --list, the keys of one row of state.full.changes for the Brightcart pair baseline to inhouse, the figures of editor-coverage-floor.json)'
      agent_role: 'QA Agent'
      autonomy: 'autonomous'
      risk: 'low'
      confidence: 90
    - id: task-002
      status: 'done'
      title: 'The pure rule: plateauMatrixOf in model/plateau-matrix.js, red then green on the oracle matrix-cases.json and on hand-made inputs'
      depends_on: [task-001]
      produces:
        - 'src/main/editor/model/plateau-matrix.js'
        - 'src/main/editor/layers.json and src/main/editor/names.json'
        - 'src/test/javascript/viewpoint-kernel/plateau-matrix-cases.test.js'
        - 'src/test/javascript/viewpoint-kernel/plateau-matrix-rule.test.js'
      agent_role: 'Frontend Implementation Agent'
      autonomy: 'autonomous'
      risk: 'medium'
      confidence: 75
    - id: task-003
      status: 'done'
      title: 'The assembly and the table: state, plateau-matrix-page.js, the page Plateaus block and button, the reset, with their page test'
      depends_on: [task-002]
      produces:
        - 'src/main/editor/presentation/plateau-matrix-page.js'
        - 'src/main/editor/presentation/pages-plateaus-files.js'
        - 'src/main/editor/model/ui-state.js'
        - 'src/main/editor/application/folder-session.js'
        - 'src/main/editor/layers.json and src/main/editor/names.json'
        - 'src/test/javascript/viewpoint-kernel/plateau-matrix-page.test.js'
      agent_role: 'Frontend Implementation Agent'
      autonomy: 'review_after'
      risk: 'medium'
      confidence: 65
    - id: task-004
      status: 'done'
      title: 'The four events and the two address keys, with the address audit and the address tests'
      depends_on: [task-003]
      produces:
        - 'src/main/editor/composition/events.js'
        - 'src/main/editor/composition/address-routing.js'
        - 'src/test/javascript/viewpoint-kernel/diagram-address-audit.test.js'
        - 'src/test/javascript/viewpoint-kernel/plateau-matrix-page.test.js'
      agent_role: 'Frontend Implementation Agent'
      autonomy: 'autonomous'
      risk: 'medium'
      confidence: 70
    - id: task-005
      status: 'done'
      title: 'The style of the table: scroll box, sticky first column, Span column, narrow layout, both themes'
      depends_on: [task-004]
      produces:
        - 'src/main/editor/style.css'
      agent_role: 'Frontend Implementation Agent'
      autonomy: 'autonomous'
      risk: 'medium'
      confidence: 75
    - id: task-006
      status: 'done'
      title: 'The end-to-end spec plateau-matrix.spec.js on chromium and firefox, at 1280 and 360 px'
      depends_on: [task-005]
      produces:
        - 'src/test/e2e/plateau-matrix.spec.js'
      agent_role: 'Test Generation Agent'
      autonomy: 'autonomous'
      risk: 'medium'
      confidence: 65
    - id: task-007
      status: 'done'
      title: 'The manual, the notes of presentation/ and the check of the model of ArchiCode (CI-arc-1)'
      depends_on: [task-005]
      produces:
        - 'src/doc/README.adoc'
        - 'src/main/editor/presentation/CLAUDE.md'
        - 'docs/architecture/ and the generated sample, only if a sentence of the model is stale'
      agent_role: 'Documentation Agent'
      autonomy: 'autonomous'
      risk: 'low'
      confidence: 85
    - id: task-008
      status: 'pending'
      title: 'Gates of the run: the whole suites, the floor, PMD, verify, byte identity, the builds, the time of the first open, a look at the page'
      depends_on: [task-006, task-007]
      produces:
        - 'src/main/resources/editor-webapp/standalone.html'
        - 'scripts/editor-coverage-floor.json, only if a figure can go up'
        - 'a Gates block appended to prg-0230-plateau-matrix-page.md (the figures, the times of Q-2, the result of each command)'
      agent_role: 'QA Agent'
      autonomy: 'review_after'
      risk: 'medium'
      confidence: 75
  edges:
    - from: task-001
      to: task-002
      reason: 'the baseline says which gates are green before the first edit and how many upward pairs there are'
    - from: task-002
      to: task-003
      reason: 'the assembly calls plateauMatrixOf'
    - from: task-003
      to: task-004
      reason: 'the events call openPlateauMatrix, closePlateauMatrix, setMatrixRows and openMatrixCell; the address reads plateauReading'
    - from: task-004
      to: task-005
      reason: 'the style is written against the final markup, and both write the generated page in turn'
    - from: task-005
      to: task-006
      reason: 'the spec runs against the built page with its style'
    - from: task-005
      to: task-007
      reason: 'the manual describes the final behavior'
    - from: task-006
      to: task-008
      reason: 'the gates run after the spec exists'
    - from: task-007
      to: task-008
      reason: 'the doc tests and the sample are part of the gates'
```

## 4. Task Catalog

```yaml
task_catalog:
  tasks:
    - id: task-001
      title: 'Baseline facts: state of the gates on the starting repository, the shape of one changes row, the count of upward pairs'
      source_requirements:
        prd:
          - 'none: there is no PRD (profile TDD+pln); the REQ-n of the TDD are listed with the TDD items'
        tdd:
          - 'REQ-3'
          - 'ASM-1'
          - 'Q-1'
          - 'RISK-1'
          - 'RISK-2'
      outputs:
        - 'a Facts block appended to prg-0230-plateau-matrix-page.md'
      verification:
        - 'grep -q ''Facts'' docs/wav/wav-034-diagrams-assets-likec4-matrix-page/run/run-0230-plateau-matrix-page/prg-0230-plateau-matrix-page.md'
        - 'node scripts/check-editor.mjs --list'
        - 'git diff --stat -- src/main'
      risk: 'low'
      confidence: 90
      human_review: 'none'
      escalation_triggers:
        - 'npm run editor:check or the node tests are already red on the starting tree: record it, do not fix it, and name each red test in the Facts block so that later tasks do not ask for it to pass'
        - 'the changes rows of the Brightcart pair do not carry replaces and natures as arrays: stop and log it, task-002 and task-003 read them'
      delegation_tier: 'standard'
      results: 'tier standard, model sonnet, effort medium, profile low-cost, passed first time, inline (leaf), independently verified'
    - id: task-002
      title: 'The pure rule: plateauMatrixOf in model/plateau-matrix.js, red then green on the oracle matrix-cases.json and on hand-made inputs'
      source_requirements:
        prd:
          - 'none: there is no PRD (profile TDD+pln); the REQ-n of the TDD are listed with the TDD items'
        tdd:
          - 'REQ-1'
          - 'REQ-3'
          - 'TG-1'
          - 'TG-4'
          - 'DEC-1'
          - 'DEC-5'
          - 'DEC-8'
          - 'CTR-3'
          - 'IMP-1'
          - 'IMP-7'
          - 'RISK-4'
          - 'CON-2'
          - 'CON-5'
      outputs:
        - 'src/main/editor/model/plateau-matrix.js: plateauMatrixOf({ columns, presence, steps, span }) returning { columns, rows, unchanged, spanCounts }, each row with a flag changes, state words only'
        - 'the part added to layers.json after model/comparison.js and its names to names.json'
        - 'plateau-matrix-cases.test.js: the oracle, three cases, expectRows, rows, unchanged, pairs, span counts, rows plus unchanged equal to the lineages (88 for the first case); the inputs are built in the test through the node harness (gap-010)'
        - 'plateau-matrix-rule.test.js: split, merge, a transient row, code point order with an astral character, two plateaus with no Span, sizes that disagree'
      verification:
        - 'npm run editor:build'
        - 'node --test src/test/javascript/viewpoint-kernel/plateau-matrix-cases.test.js src/test/javascript/viewpoint-kernel/plateau-matrix-rule.test.js'
        - 'npm run editor:check'
        - 'node scripts/check-editor.mjs --list prints the same number of upward pairs as the Facts block of task-001'
        - 'git diff --stat -- src/test/resources/brightcart/matrix-cases.json src/test/resources/brightcart/expected src/main/rust src/main/wasm prints nothing'
      risk: 'medium'
      confidence: 75
      human_review: 'none'
      escalation_triggers:
        - 'a case of the oracle cannot be met without a different rule from PlateauMatrix.java: stop, log the case, never edit matrix-cases.json'
        - 'the part cannot be placed without an upward pair: stop and log it'
        - 'the oracle supplies presence in a shape the page cannot build from layerModelOf: log it for task-003'
      delegation_tier: 'standard'
      results: 'tier standard, model sonnet, effort medium, profile low-cost, passed first time, inline (leaf), independently verified'
    - id: task-003
      title: 'The assembly and the table: state, plateau-matrix-page.js, the page Plateaus block and button, the reset, with their page test'
      source_requirements:
        prd:
          - 'none: there is no PRD (profile TDD+pln); the REQ-n of the TDD are listed with the TDD items'
        tdd:
          - 'REQ-1'
          - 'REQ-3'
          - 'REQ-5'
          - 'TG-2'
          - 'TG-3'
          - 'TG-4'
          - 'DEC-2'
          - 'DEC-3'
          - 'DEC-4'
          - 'DEC-5'
          - 'DEC-7'
          - 'DEC-8'
          - 'CTR-1'
          - 'IF-1'
          - 'IF-2'
          - 'IF-3'
          - 'IF-4'
          - 'FLOW-1'
          - 'FLOW-2'
          - 'IMP-2'
          - 'IMP-3'
          - 'IMP-4'
          - 'IMP-7'
          - 'CON-4'
          - 'CON-5'
          - 'CON-6'
          - 'RISK-2'
          - 'RISK-3'
      outputs:
        - 'model/ui-state.js: plateauReading = { path, all }, view state'
        - 'application/folder-session.js: resetUiState clears plateauReading; snapshotWriteState does not hold it'
        - 'presentation/plateau-matrix-page.js: plateauMatrixPathOf, plateauMatrixNow (pending, problems or the matrix, no memo of its own), renderPlateauMatrixHtml (table, head, Span column, layer groups, one glyph and word per cell, from <references>, counts, escapeHtml everywhere), openPlateauMatrix, closePlateauMatrix, setMatrixRows, openMatrixCell calling drawPlateau(target, { compare }) then goToChange'
        - 'presentation/pages-plateaus-files.js: Read the path button with aria-pressed on a non-root entry, the block under the list, settlePlateausPanel redraws a pending reading; the list markup is byte for byte unchanged when no path is chosen'
        - 'layers.json and names.json updated for the new part and names'
        - 'plateau-matrix-page.test.js: the block, the counts, the fold, the pending kernel, the problems state, a workspace with no plateau, blocked layers, a stale path, a reference with < and &, the click and its compare choice'
      verification:
        - 'npm run editor:build'
        - 'node --test src/test/javascript/viewpoint-kernel/plateau-matrix-page.test.js'
        - 'node --test src/test/javascript/viewpoint-kernel/plateaus-page-and-addresses.test.js src/test/javascript/viewpoint-kernel/story-player-scene.test.js'
        - 'npm run editor:check'
        - 'node scripts/check-editor.mjs --list prints the same number of upward pairs as the Facts block of task-001'
      risk: 'medium'
      confidence: 65
      human_review: 'after'
      escalation_triggers:
        - 'the assembly needs a name of a higher layer from model/ or application/: stop, move it to presentation/, never raise ratchet.max'
        - 'the cells of the first case do not equal the oracle when fed from layerModelOf and comparisonStateOf: log the first differing row, never edit the oracle or the kernel'
        - 'an existing test of the page Plateaus goes red because of the new markup: fix the new markup, not the test'
        - 'drawPlateau returns false and the Changes panel does not open: log how the panel is opened on that page'
      delegation_tier: 'standard'
      results: 'tier standard, model sonnet, effort medium, profile low-cost, passed first time, inline (leaf), independently verified'
    - id: task-004
      title: 'The four events and the two address keys, with the address audit and the address tests'
      source_requirements:
        prd:
          - 'none: there is no PRD (profile TDD+pln); the REQ-n of the TDD are listed with the TDD items'
        tdd:
          - 'REQ-2'
          - 'REQ-5'
          - 'DEC-6'
          - 'CTR-2'
          - 'FLOW-1'
          - 'IMP-4'
          - 'IMP-5'
          - 'IMP-7'
          - 'ASM-5'
      outputs:
        - 'composition/events.js: the actions matrix-open, matrix-close, matrix-rows and matrix-cell'
        - 'composition/address-routing.js: matrix=<plateau id> and rows=all written after plateau= on the page Plateaus only, read by syncPerspectiveFromHash (an unknown, root or undrawable path drops the key and the address is written back), restored on a reload and on Back and Forward, a chosen path is an entry of the history'
        - 'diagram-address-audit.test.js: the two inputs added to the audit with their parameter'
        - 'plateau-matrix-page.test.js: address cases (write, read, reload, Back, a dropped key, the order of the keys, nothing on another page)'
      verification:
        - 'npm run editor:build'
        - 'node --test src/test/javascript/viewpoint-kernel/plateau-matrix-page.test.js src/test/javascript/viewpoint-kernel/diagram-address-audit.test.js src/test/javascript/viewpoint-kernel/plateaus-page-and-addresses.test.js'
        - 'npm run editor:check'
        - 'node scripts/check-editor.mjs --list prints the same number of upward pairs as the Facts block of task-001'
      risk: 'medium'
      confidence: 70
      human_review: 'none'
      escalation_triggers:
        - 'the audit cannot hold a new input to a parameter or a reason without a change of its rule: stop and log it'
        - 'a key changes the address of a page that has no path: the address of every existing test must stay byte for byte'
      delegation_tier: 'standard'
      results: 'tier standard, model sonnet, effort medium, profile low-cost, passed first time, inline (leaf), independently verified'
    - id: task-005
      title: 'The style of the table: scroll box, sticky first column, Span column, narrow layout, both themes'
      source_requirements:
        prd:
          - 'none: there is no PRD (profile TDD+pln); the REQ-n of the TDD are listed with the TDD items'
        tdd:
          - 'REQ-5'
          - 'TG-3'
          - 'DEC-4'
          - 'IMP-6'
          - 'CON-6'
          - 'CON-8'
          - 'RISK-6'
          - 'RISK-7'
      outputs:
        - 'style.css: a block after the existing ones (.matrix, its scroll box, a sticky first column, the Span column, the layer caption rows, a 360 px layout that scrolls the table in its box and not the page), colours through the existing tokens only, nothing newer than the Safari floor'
      verification:
        - 'npm run editor:build'
        - 'npx prettier --check src/main/editor/style.css'
        - 'node --test src/test/javascript/workspace-menu-layout.test.js src/test/javascript/viewpoint-kernel/browser-apis.test.js'
        - 'npx playwright test src/test/e2e/stylesheet-claims.spec.js --project=chromium'
      risk: 'medium'
      confidence: 75
      human_review: 'none'
      escalation_triggers:
        - 'a declaration that stylesheet-claims.spec.js or workspace-menu-layout.test.js reads moves: put the new block after the old ones and log it'
        - 'a rule needs a CSS feature newer than the floor of browser-apis.test.js: use overflow and position: sticky only'
      delegation_tier: 'standard'
      results: 'tier standard, model sonnet, effort medium, profile low-cost, passed first time, inline (leaf), independently verified'
    - id: task-006
      title: 'The end-to-end spec plateau-matrix.spec.js on chromium and firefox, at 1280 and 360 px'
      source_requirements:
        prd:
          - 'none: there is no PRD (profile TDD+pln); the REQ-n of the TDD are listed with the TDD items'
        tdd:
          - 'REQ-2'
          - 'TG-5'
          - 'DEC-6'
          - 'IMP-8'
          - 'RISK-7'
      outputs:
        - 'src/test/e2e/plateau-matrix.spec.js: opens the Brightcart sample on the page Plateaus, Read the path on marketplace, the head (baseline, inhouse, marketplace, Span), the row count and the Span words of one row, a click on a cell shows the Changes panel, a reload keeps matrix=marketplace and the table, at 1280 and 360 px (no horizontal scroll of the page)'
      verification:
        - 'npm run editor:build'
        - 'npx playwright test src/test/e2e/plateau-matrix.spec.js --project=chromium'
        - 'npx playwright test src/test/e2e/plateau-matrix.spec.js --project=firefox'
        - 'npx prettier --check src/test/e2e/plateau-matrix.spec.js'
      risk: 'medium'
      confidence: 65
      human_review: 'none'
      escalation_triggers:
        - 'a browser of the playwright cache is missing and cannot be run in the session: log which one, and name the spec as not run on it'
        - 'the two browsers differ on the sticky column or the scroll box: fix the style (task-005 files) with the smallest edit and log it'
      delegation_tier: 'standard'
      results: 'tier standard, model sonnet, effort medium, profile low-cost, passed first time, inline (leaf), independently verified'
    - id: task-007
      title: 'The manual, the notes of presentation/ and the check of the model of ArchiCode (CI-arc-1)'
      source_requirements:
        prd:
          - 'none: there is no PRD (profile TDD+pln); the REQ-n of the TDD are listed with the TDD items'
        tdd:
          - 'REQ-7'
          - 'IMP-9'
          - 'IMP-10'
          - 'CI-arc-1'
          - 'RISK-5'
      outputs:
        - 'src/doc/README.adoc: [[editor-plateaus]] describes Read the path, the table, the fold, the click and its effect (as Changes), [[editor-link-carries]] lists matrix= and rows=all, the line of plateau matrix says the page reads the same cases'
        - 'src/main/editor/presentation/CLAUDE.md: the new part and what it reads, stated as true now, with no wave, run or issue id'
        - 'the result of grep -n -i for plateau, matrix, mirror of and shared_cases in docs/architecture/manifests, and a change plus npm run sample:build only if a sentence is stale'
      verification:
        - 'node --test src/test/javascript/manual-skeleton.test.js'
        - 'npx prettier --check src/main/editor/presentation/CLAUDE.md'
        - 'grep -n -i "plateau\|matrix\|mirror of\|shared_cases" docs/architecture/manifests/archicode.yaml'
        - 'npm run sample:build && git status --short docs/architecture src/main/resources/editor-webapp/samples'
      risk: 'low'
      confidence: 85
      human_review: 'none'
      escalation_triggers:
        - 'a doc test reads an anchor or a count that the new text moves: fix the text, and name the test'
        - 'a sentence of the model is stale: change it, run sample:build, ArchitectureDriftTest and the impact questions, and say so in the log'
      delegation_tier: 'standard'
      results: 'finished by the operator: manual and notes written, model of ArchiCode unchanged (CI-arc-1), logged in the prg'
    - id: task-008
      title: 'Gates of the run: the whole suites, the floor, PMD, verify, byte identity, the builds, the time of the first open, a look at the page'
      source_requirements:
        prd:
          - 'none: there is no PRD (profile TDD+pln); the REQ-n of the TDD are listed with the TDD items'
        tdd:
          - 'REQ-1'
          - 'REQ-2'
          - 'REQ-3'
          - 'REQ-4'
          - 'REQ-7'
          - 'IMP-10'
          - 'Q-2'
          - 'ASM-3'
          - 'RISK-1'
          - 'RISK-2'
          - 'RISK-3'
      outputs:
        - 'a Gates block in the prg with each command and its result, the time of the first open of the Brightcart path and of replaces-large-pair, and the look at 1280 and 360 px in both themes'
        - 'scripts/editor-coverage-floor.json raised only if test:coverage says so (--write-floor only raises)'
        - 'standalone.html as editor:build writes it'
      verification:
        - 'npm run editor:build && npm run sample:build && git status --short src/main/resources/editor-webapp/samples'
        - 'npm run test:unit'
        - 'npm run test:coverage'
        - 'npm run format:check'
        - 'npm run lint'
        - 'npm run editor:check'
        - 'git diff --stat -- src/main/rust src/main/wasm src/test/resources/brightcart/matrix-cases.json src/test/resources/brightcart/expected prints nothing'
        - 'JAVA_HOME=$HOME/.sdkman/candidates/java/25.0.4-tem ./mvnw test-compile pmd:check'
        - 'JAVA_HOME=$HOME/.sdkman/candidates/java/25.0.4-tem ./mvnw verify -DskipITs=false'
        - 'scripts/byte-identity.sh with its exceptions file unchanged'
        - 'npx playwright test src/test/e2e/plateau-matrix.spec.js --project=chromium'
        - 'npx playwright test src/test/e2e/plateau-matrix.spec.js --project=firefox'
      risk: 'medium'
      confidence: 75
      human_review: 'after'
      escalation_triggers:
        - 'a figure of the coverage floor is lower than before: add the missing node tests to the page test, never lower the floor'
        - 'byte-identity reports a difference: the page change must touch nothing but standalone.html; log it and stop, never add an exception'
        - 'the first open of replaces-large-pair takes more than one second: record the figure as a finding, DEF-3 stands'
        - 'a test red on the starting tree (task-001 Facts) stays red: say so, it is not a regression'
      delegation_tier: 'standard'
```

## 5. Parallelization Plan

```yaml
parallelization_plan:
  groups:
    - id: parallel-group-001
      tasks:
        - task-006
        - task-007
      reason: 'The spec and the documentation touch disjoint files (src/test/e2e/plateau-matrix.spec.js against src/doc/README.adoc, presentation/CLAUDE.md and docs/architecture)'
      conflict_risks:
        - 'task-007 may run npm run sample:build, which writes src/main/resources/editor-webapp/samples, and task-006 runs npm run editor:build, which writes standalone.html: the two outputs are different files; if task-007 changes docs/architecture the sample is a bundle of that folder only'
        - 'neither task edits src/main/editor sources: a source edit needed by task-006 (a style fix) is done after task-007 ends, or in task-008'
  sequential_reason: 'task-002 to task-005 all write layers.json, names.json, the generated standalone.html or the same page test in turn, so they run one after another'
```

## 6. Human Review Gates

```yaml
human_review_gates:
  gates:
    - id: gate-001
      trigger: 'the run is complete and its gates have run'
      required_before: []
      required_after: ['task-008']
      reviewer_focus:
        - 'the table on the Brightcart path at 1280 and 360 px in both themes: the words and glyphs, the fold, the click'
        - 'that a click changing the editor drawing is acceptable (RISK-5)'
        - 'the Q-2 figure and the decision to leave a worker deferred'
        - 'the pull request as a whole before the commit, which is a human step outside this plan'
```

## 7. Risk Assessment

```yaml
risk_assessment:
  by_task:
    - id: task-001
      risk: 'low'
      rationale: 'Reads and runs, writes one log block'
    - id: task-002
      risk: 'medium'
      rationale: 'A second implementation of one rule; the oracle holds it equal, but it has three cases and no transient row'
    - id: task-003
      risk: 'medium'
      rationale: 'The widest edit: assembly, markup, state and reset; the ratchet at 99 and the coverage floor are at stake'
    - id: task-004
      risk: 'medium'
      rationale: 'The address is read by every page and by the audit; an extra key must change no existing address'
    - id: task-005
      risk: 'medium'
      rationale: 'Two tests read declarations of the sheet; the sticky column differs by browser'
    - id: task-006
      risk: 'medium'
      rationale: 'A spec on two browsers; timing of the kernel load may make it flaky'
    - id: task-007
      risk: 'low'
      rationale: 'Text, read by doc tests; the model check is a grep'
    - id: task-008
      risk: 'medium'
      rationale: 'Whole suites and byte identity; a red gate may come from the base and not from the change'
  by_area:
    - area: 'ui'
      risk: 'medium'
      rationale: 'A click changes the drawing of the whole editor (RISK-5); layout at 360 px'
    - area: 'api'
      risk: 'low'
      rationale: 'The address gains two keys that older addresses do not have; nothing is stored'
    - area: 'data'
      risk: 'low'
      rationale: 'View state only, nothing is written to the workspace'
    - area: 'security'
      risk: 'low'
      rationale: 'Every reference and id goes through escapeHtml and encodeURIComponent, with a test'
    - area: 'docs'
      risk: 'low'
      rationale: 'The manual is read by doc tests'
```

## 8. Confidence Assessment

```yaml
confidence_assessment:
  by_task:
    - id: task-001
      score: 90
      rationale: 'Commands and one print'
    - id: task-002
      score: 75
      rationale: 'The Java rule and the oracle are exact, but the input of the page is only checked in task-003'
    - id: task-003
      score: 65
      rationale: 'Many seams (the story scene drawing, the memo, the panel, the kernel pending state) and a TDD that still carries the Stage 5 errors'
    - id: task-004
      score: 70
      rationale: 'The address code is dense and an audit test holds every input'
    - id: task-005
      score: 75
      rationale: 'Plain CSS with two guard tests'
    - id: task-006
      score: 65
      rationale: 'End-to-end on two browsers, the selectors depend on the markup of task-003'
    - id: task-007
      score: 85
      rationale: 'Prose and a grep, read by doc tests'
    - id: task-008
      score: 75
      rationale: 'Long commands that may fail for reasons of the base'
```

## 9. Agent Assignment Plan

```yaml
agent_assignment_plan:
  assignments:
    - task_id: task-001
      agent_role: 'QA Agent'
      objective: 'Before any edit, run npm run editor:check, the node tests named in this plan and node scripts/check-editor.mjs --list on the starting tree; print one row of state.full.changes for the Brightcart pair baseline to inhouse (the layered folder of plateaus-page-and-addresses.test.js) with its keys and the types of replaces and natures; read the figures of editor-coverage-floor.json; append a Facts block to prg-0230'
      context:
        prd_excerpts:
          - 'none: no PRD; see the REQ-n of the TDD'
        tdd_excerpts:
          - 'Q-1'
          - 'ASM-1'
          - 'RISK-1'
          - 'RISK-2'
      likely_files:
        - 'docs/wav/wav-034-diagrams-assets-likec4-matrix-page/run/run-0230-plateau-matrix-page/prg-0230-plateau-matrix-page.md'
      acceptance_criteria:
        - 'the Facts block gives the result of each command, the number of upward pairs and the floor figures'
        - 'the keys of one changes row are listed and replaces and natures are said to be arrays or not'
        - 'no file under src/main changed'
      verification:
        - 'grep -q ''Facts'' docs/wav/wav-034-diagrams-assets-likec4-matrix-page/run/run-0230-plateau-matrix-page/prg-0230-plateau-matrix-page.md'
        - 'node scripts/check-editor.mjs --list'
        - 'git diff --stat -- src/main'
      escalation_triggers:
        - 'a gate is red on the starting tree: record it and go on'
      suggested_subagent_type: 'general-purpose'
      suggested_model: '(default)'
      suggested_effort: 'low'
    - task_id: task-002
      agent_role: 'Frontend Implementation Agent'
      objective: 'Write the two node tests first (the oracle test reading matrix-cases.json with fs and building presence and the changes of each pair through the node harness, see gap-010, and the hand-made rule test), see them red, then write model/plateau-matrix.js as a statement for statement port of rendering/matrix/PlateauMatrix.java (predecessors, backward trace, split in each result row, merge as one row, Span from the first to the last, removed for a row that ends early, sort by layer rank then code point then first column, unchanged counted). The module returns state words only and imports nothing above model/. Add the part to layers.json after model/comparison.js and run node scripts/check-editor.mjs --write-names'
      context:
        prd_excerpts:
          - 'none: no PRD; see the REQ-n of the TDD'
        tdd_excerpts:
          - 'DEC-1'
          - 'DEC-5'
          - 'DEC-8'
          - 'CTR-3'
          - 'IMP-1'
          - 'RISK-4'
      likely_files:
        - 'src/main/editor/model/plateau-matrix.js'
        - 'src/main/editor/layers.json'
        - 'src/main/editor/names.json'
        - 'src/test/javascript/viewpoint-kernel/plateau-matrix-cases.test.js'
        - 'src/test/javascript/viewpoint-kernel/plateau-matrix-rule.test.js'
        - 'src/main/java/io/morin/archicode/rendering/matrix/PlateauMatrix.java'
        - 'src/test/resources/brightcart/matrix-cases.json'
      acceptance_criteria:
        - 'the oracle test passes for the three cases: expectRows, rows, unchanged, pairs, span counts'
        - 'the rule test passes: split, merge, a transient row with span null written from the Java comment, code point order, two plateaus with no Span, sizes that disagree'
        - 'the ratchet is unchanged and matrix-cases.json is not edited'
      verification:
        - 'npm run editor:build'
        - 'node --test src/test/javascript/viewpoint-kernel/plateau-matrix-cases.test.js src/test/javascript/viewpoint-kernel/plateau-matrix-rule.test.js'
        - 'npm run editor:check'
        - 'node scripts/check-editor.mjs --list prints the same number of upward pairs as the Facts block of task-001'
        - 'git diff --stat -- src/test/resources/brightcart/matrix-cases.json src/test/resources/brightcart/expected src/main/rust src/main/wasm prints nothing'
      escalation_triggers:
        - 'a case of the oracle needs another rule than the Java one: stop and log it'
      suggested_subagent_type: 'general-purpose'
      suggested_model: '(default)'
      suggested_effort: 'medium'
    - task_id: task-003
      agent_role: 'Frontend Implementation Agent'
      objective: 'Add plateauReading to model/ui-state.js and its reset to application/folder-session.js; write presentation/plateau-matrix-page.js (plateauMatrixPathOf from plateauChain, plateauMatrixNow with one comparisonStateOf(drawingOfPlateaus(column, previous, { hideWording: false }), sceneComparisonMemo()) per pair and one for the Span when there are three columns or more, the element rows of state.full.changes, pending and problems states, the table of DEC-4 with glyphs from CHANGE_STATES, openMatrixCell calling drawPlateau(target, { compare }) then goToChange); add the button and the block to pages-plateaus-files.js; write plateau-matrix-page.test.js against the layered Brightcart and drive it red then green'
      context:
        prd_excerpts:
          - 'none: no PRD; see the REQ-n of the TDD'
        tdd_excerpts:
          - 'DEC-2'
          - 'DEC-3'
          - 'DEC-4'
          - 'DEC-7'
          - 'IF-1'
          - 'IF-2'
          - 'IF-3'
          - 'IF-4'
          - 'FLOW-1'
          - 'FLOW-2'
          - 'gap-001 to gap-005 of this plan (the Stage 5 corrections)'
      likely_files:
        - 'src/main/editor/presentation/plateau-matrix-page.js'
        - 'src/main/editor/presentation/pages-plateaus-files.js'
        - 'src/main/editor/model/ui-state.js'
        - 'src/main/editor/application/folder-session.js'
        - 'src/main/editor/layers.json'
        - 'src/main/editor/names.json'
        - 'src/test/javascript/viewpoint-kernel/plateau-matrix-page.test.js'
      acceptance_criteria:
        - 'for the path baseline, inhouse, marketplace the cells of the table are the cells of matrix-cases.json, Span included (11 moved, 2 split, 1 merged), read through the page'
        - 'the list of plateaus is byte for byte the same when no path is chosen'
        - 'pending, problems, no plateau, blocked layers and a stale path each have a test'
        - 'a cell click draws the pair with { compare } and the Changes panel is on the element'
        - 'the ratchet is unchanged and plateauReading is not in snapshotWriteState'
      verification:
        - 'npm run editor:build'
        - 'node --test src/test/javascript/viewpoint-kernel/plateau-matrix-page.test.js'
        - 'node --test src/test/javascript/viewpoint-kernel/plateaus-page-and-addresses.test.js src/test/javascript/viewpoint-kernel/story-player-scene.test.js'
        - 'npm run editor:check'
        - 'node scripts/check-editor.mjs --list prints the same number of upward pairs as the Facts block of task-001'
      escalation_triggers:
        - 'a name of a higher layer is needed from model/ or application/: move the code to presentation/'
        - 'the page cells differ from the oracle: log the first row, never edit the oracle'
      suggested_subagent_type: 'general-purpose'
      suggested_model: '(default)'
      suggested_effort: 'high'
    - task_id: task-004
      agent_role: 'Frontend Implementation Agent'
      objective: 'Wire matrix-open, matrix-close, matrix-rows and matrix-cell in composition/events.js; write matrix= and rows=all in currentRouteHash and read them in syncPerspectiveFromHash on the page Plateaus only; add the two inputs to diagram-address-audit.test.js; add address cases to plateau-matrix-page.test.js'
      context:
        prd_excerpts:
          - 'none: no PRD; see the REQ-n of the TDD'
        tdd_excerpts:
          - 'DEC-6'
          - 'CTR-2'
          - 'ASM-5'
          - 'IMP-4'
          - 'IMP-5'
      likely_files:
        - 'src/main/editor/composition/events.js'
        - 'src/main/editor/composition/address-routing.js'
        - 'src/test/javascript/viewpoint-kernel/diagram-address-audit.test.js'
        - 'src/test/javascript/viewpoint-kernel/plateau-matrix-page.test.js'
      acceptance_criteria:
        - 'the address carries matrix=<id> and rows=all only when set, on the page Plateaus only, after plateau='
        - 'an unknown, root or undrawable path drops the key and the address is written back as it is'
        - 'a reload and Back and Forward restore the path and the unfolding'
        - 'the addresses of every existing test are unchanged'
      verification:
        - 'npm run editor:build'
        - 'node --test src/test/javascript/viewpoint-kernel/plateau-matrix-page.test.js src/test/javascript/viewpoint-kernel/diagram-address-audit.test.js src/test/javascript/viewpoint-kernel/plateaus-page-and-addresses.test.js'
        - 'npm run editor:check'
        - 'node scripts/check-editor.mjs --list prints the same number of upward pairs as the Facts block of task-001'
      escalation_triggers:
        - 'the audit needs a change of its rule: stop and log it'
      suggested_subagent_type: 'general-purpose'
      suggested_model: '(default)'
      suggested_effort: 'medium'
    - task_id: task-005
      agent_role: 'Frontend Implementation Agent'
      objective: 'Add the block of the table to style.css after the existing blocks, with the class names that plateau-matrix-page.js writes: a scroll box, a sticky first column, the Span column set apart, caption rows for the layers, glyph and word visible, a layout at 360 px where only the box scrolls; colours through the existing tokens so dark mode follows'
      context:
        prd_excerpts:
          - 'none: no PRD; see the REQ-n of the TDD'
        tdd_excerpts:
          - 'DEC-4'
          - 'IMP-6'
          - 'CON-6'
          - 'CON-8'
      likely_files:
        - 'src/main/editor/style.css'
      acceptance_criteria:
        - 'the table is readable at 1280 and 360 px in both themes and the page has no horizontal scroll at 360 px'
        - 'no CSS newer than the Safari floor and no new colour outside the tokens'
        - 'stylesheet-claims.spec.js and workspace-menu-layout.test.js stay green'
      verification:
        - 'npm run editor:build'
        - 'npx prettier --check src/main/editor/style.css'
        - 'node --test src/test/javascript/workspace-menu-layout.test.js src/test/javascript/viewpoint-kernel/browser-apis.test.js'
        - 'npx playwright test src/test/e2e/stylesheet-claims.spec.js --project=chromium'
      escalation_triggers:
        - 'a guard test reads a declaration that the block moves: put the block after the old ones'
      suggested_subagent_type: 'general-purpose'
      suggested_model: '(default)'
      suggested_effort: 'medium'
    - task_id: task-006
      agent_role: 'Test Generation Agent'
      objective: 'Write src/test/e2e/plateau-matrix.spec.js on the model of changes-walk.spec.js and sample.spec.js: open the Brightcart sample on the page Plateaus, press Read the path on marketplace, check the head, the row count and the Span words of one row, click a cell and see the Changes panel, reload and find matrix=marketplace and the table, at 1280 and 360 px'
      context:
        prd_excerpts:
          - 'none: no PRD; see the REQ-n of the TDD'
        tdd_excerpts:
          - 'IMP-8'
          - 'DEC-6'
          - 'RISK-7'
      likely_files:
        - 'src/test/e2e/plateau-matrix.spec.js'
        - 'src/test/e2e/changes-walk.spec.js'
        - 'src/test/e2e/sample.spec.js'
      acceptance_criteria:
        - 'the spec passes on chromium and on firefox'
        - 'the path is in the address and a reload keeps it'
      verification:
        - 'npm run editor:build'
        - 'npx playwright test src/test/e2e/plateau-matrix.spec.js --project=chromium'
        - 'npx playwright test src/test/e2e/plateau-matrix.spec.js --project=firefox'
        - 'npx prettier --check src/test/e2e/plateau-matrix.spec.js'
      escalation_triggers:
        - 'a browser is not installed: log it and name the spec as not run there'
      suggested_subagent_type: 'general-purpose'
      suggested_model: '(default)'
      suggested_effort: 'high'
    - task_id: task-007
      agent_role: 'Documentation Agent'
      objective: 'Update the manual (editor-plateaus, editor-link-carries and the line of plateau matrix) and the notes of presentation/CLAUDE.md for the Reading view, with no wave, run or issue id; grep docs/architecture for plateau, matrix, mirror of and shared_cases and the question files, change a stale sentence and run npm run sample:build only if one is'
      context:
        prd_excerpts:
          - 'none: no PRD; see the REQ-n of the TDD'
        tdd_excerpts:
          - 'IMP-9'
          - 'IMP-10'
          - 'CI-arc-1'
          - 'RISK-5'
      likely_files:
        - 'src/doc/README.adoc'
        - 'src/main/editor/presentation/CLAUDE.md'
        - 'docs/architecture/manifests/archicode.yaml'
        - 'src/test/javascript/architecture/impact-questions.json'
      acceptance_criteria:
        - 'the manual says what Read the path does, that a click draws the pair as Changes does, and the two address keys'
        - 'the doc tests pass and the notes carry no history'
        - 'the log says whether the model of ArchiCode changed'
      verification:
        - 'node --test src/test/javascript/manual-skeleton.test.js'
        - 'npx prettier --check src/main/editor/presentation/CLAUDE.md'
        - 'grep -n -i "plateau\|matrix\|mirror of\|shared_cases" docs/architecture/manifests/archicode.yaml'
        - 'npm run sample:build && git status --short docs/architecture src/main/resources/editor-webapp/samples'
      escalation_triggers:
        - 'a doc test reads something that the new text moves: fix the text'
      suggested_subagent_type: 'general-purpose'
      suggested_model: '(default)'
      suggested_effort: 'low'
    - task_id: task-008
      agent_role: 'QA Agent'
      objective: 'Run the gates of the run: editor:build and sample:build with git status unchanged afterwards, test:unit, test:coverage (raise the floor with --write-floor only if a figure went up), format:check, lint, editor:check, the git diff --stat that prints nothing, PMD, verify with the integration tests, byte-identity, the spec on the two browsers; time the first open of the Brightcart path and of replaces-large-pair; look at the page at 1280 and 360 px in both themes; append a Gates block to prg-0230'
      context:
        prd_excerpts:
          - 'none: no PRD; see the REQ-n of the TDD'
        tdd_excerpts:
          - 'Observability and Verification'
          - 'Q-2'
          - 'RISK-1'
          - 'RISK-2'
          - 'RISK-3'
      likely_files:
        - 'scripts/editor-coverage-floor.json'
        - 'src/main/resources/editor-webapp/standalone.html'
        - 'docs/wav/wav-034-diagrams-assets-likec4-matrix-page/run/run-0230-plateau-matrix-page/prg-0230-plateau-matrix-page.md'
      acceptance_criteria:
        - 'every command of the verification list exits 0, or the Facts block of task-001 says it was already red'
        - 'no figure of the coverage floor is lower and ratchet.max is 99 or lower'
        - 'the times of Q-2 are in the Gates block'
      verification:
        - 'npm run editor:build && npm run sample:build && git status --short src/main/resources/editor-webapp/samples'
        - 'npm run test:unit'
        - 'npm run test:coverage'
        - 'npm run format:check'
        - 'npm run lint'
        - 'npm run editor:check'
        - 'git diff --stat -- src/main/rust src/main/wasm src/test/resources/brightcart/matrix-cases.json src/test/resources/brightcart/expected prints nothing'
        - 'JAVA_HOME=$HOME/.sdkman/candidates/java/25.0.4-tem ./mvnw test-compile pmd:check'
        - 'JAVA_HOME=$HOME/.sdkman/candidates/java/25.0.4-tem ./mvnw verify -DskipITs=false'
        - 'scripts/byte-identity.sh with its exceptions file unchanged'
        - 'npx playwright test src/test/e2e/plateau-matrix.spec.js --project=chromium'
        - 'npx playwright test src/test/e2e/plateau-matrix.spec.js --project=firefox'
      escalation_triggers:
        - 'byte-identity reports a difference: stop, never add an exception'
        - 'a coverage figure is lower: add tests, never lower the floor'
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
        - 'file check of the Facts block'
      success_criteria:
        - 'the baseline and the row shape are recorded and src/main is untouched'
    - task_id: task-002
      methods:
        - 'node tests of the oracle and of the rule'
        - 'editor:check (layers, lists, ratchet)'
      success_criteria:
        - 'the three cases of matrix-cases.json are met and no upward pair is added'
    - task_id: task-003
      methods:
        - 'node page test on the layered Brightcart'
        - 'the existing Plateaus and story tests'
        - 'editor:check'
      success_criteria:
        - 'the cells equal the oracle through the page and the states are covered'
    - task_id: task-004
      methods:
        - 'node address tests and the address audit'
      success_criteria:
        - 'the keys round trip and no existing address changes'
    - task_id: task-005
      methods:
        - 'prettier check'
        - 'layout and API floor tests'
        - 'the stylesheet claims spec'
      success_criteria:
        - 'the guard tests stay green'
    - task_id: task-006
      methods:
        - 'playwright on chromium and firefox'
      success_criteria:
        - 'the spec passes on both and the reload keeps the path'
    - task_id: task-007
      methods:
        - 'manual doc tests'
        - 'sample:build and git status'
      success_criteria:
        - 'the doc tests pass and the sample is the bundle of its folder'
    - task_id: task-008
      methods:
        - 'the whole node suite and the coverage floor'
        - 'format, lint, PMD, verify with integration tests, byte identity'
        - 'git diff --stat on the forbidden paths'
        - 'a look at the page in the Browser pane'
      success_criteria:
        - 'every gate exits 0 and the forbidden paths are unchanged'
```

## 11. Escalation Rules

```yaml
escalation_rules:
  rules:
    - condition: 'a task needs an edit of src/main/rust, src/main/wasm, matrix-cases.json or the expected comparisons of the Brightcart'
      action: 'stop and log it: the wave forbids it (gate 2); the rule is changed in the page, never in the oracle'
    - condition: 'a part cannot be placed without raising ratchet.max or adding an upward pair'
      action: 'move the code to the layer that holds the names it uses, or stop and log it'
    - condition: 'a gate is red on the starting tree (task-001 Facts)'
      action: 'record it and do not ask a task to make it green; a regression is a new red'
    - condition: 'a human_required task or an unresolved product decision appears'
      action: 'none is planned; if one appears, stop with awaiting-human and log it'
    - condition: 'a task fails its own verification'
      action: 'one retry one rung up with the failing output, then inline, then a finding in the prg'
    - condition: 'a confidence below 60 or a decision missing from the TDD'
      action: 'log it and choose the smallest change that the TDD allows, naming the choice'
```

## 12. Final Execution Manifest

```yaml
execution_manifest:
  status: 'in_progress'
  recommendation: 'proceed_with_review'
  autonomy_level: 'medium'
  total_tasks: 8
  autonomous_tasks: 6
  review_before_tasks: 0
  review_after_tasks: 2
  human_required_tasks: 0
  blocked_tasks: 0
  critical_path_tasks:
    - task-001
    - task-002
    - task-003
    - task-004
    - task-005
    - task-006
    - task-008
  parallel_groups:
    - parallel-group-001
  required_human_gates:
    - gate-001
  highest_risk_tasks:
    - task-003
    - task-004
    - task-006
  lowest_confidence_tasks:
    - task-003
    - task-006
    - task-004
  next_action: 'Start task-001: record the baseline of the gates and the shape of one changes row, then task-002, the pure rule on the oracle'
  criteria:
    - 'The cells of the Reading view are the cells of matrix-cases.json, Span included, and the oracle is unchanged'
    - 'The path is in the address, a reload keeps it, and the spec passes on chromium and firefox'
    - 'The ratchet is at 99 or lower and no coverage figure is lower'
    - 'The gates exit 0 and byte identity needs no new exception'
    - 'The manual and the notes of presentation/ say what the page does'
```
