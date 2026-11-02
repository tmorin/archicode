---
title: Execution Plan — The diagram toolbar, structure
status: done
date: 2026-11-01
related:
  - docs/wav/wav-030-pages-ci-and-toolbar/run/run-0217-toolbar-structure/tdd-0217-toolbar-structure.md
  - docs/wav/wav-030-pages-ci-and-toolbar/wav-030-pages-ci-and-toolbar.md
  - docs/wav/wav-027-editor-layout-and-walk/rfc/rfc-002-diagram-toolbar.md
  - src/main/editor/presentation/diagram-page.js
  - src/main/editor/presentation/diagram-controls.js
  - https://github.com/tmorin/archicode/issues/194
type: pln
run: 0217
wave: 030
---

# Execution Plan: The diagram toolbar, structure

Profile TDD+pln: there is no PRD, so REQ-1 to REQ-9 are the IDs the TDD labels (section "PRD Traceability"), taken from the W-7 row and gate P3 of the wave manifest, decision Q1, RFC-002 and issue #194. The plan follows the TDD plus the Stage 5 review findings of the run (progress log, 2026-11-01), which the TDD body does not yet hold: task-001 applies them first. The four questions of the TDD were settled in Stage 6, so none is open.

The findings task-001 applies are these. F1 (S2): after a press of *Changes only* the focus is lost, because `headerControlSelector` in `map-state.js` finds a control by `data-action` plus `data-value` and that attribute flips with the state; the fix gives the button an id, `diagram-changes-only-button`, which the selector then uses. F2 (S2): `story-player-scene.test.js` compares `renderDiagramCanvasHtml` with the page of archicode-0.18.0 and is missing from IMP-9. F3 (S2): other tests that slice the markup at `diagram-stage` are missing from IMP-9. S1: the duplicates (Q-1 and ASM-1, Q-4 and ASM-6 and RISK-7, the verification list and DEC-8), "four hits" against the five lines of `data-lit` that `grep` shows, the minus sign in CTR-4, and the unstated nested group for *Columns* and the `.button-group` styling.

The order is test first. task-001 amends the TDD, task-002 saves a baseline, task-003 writes the table and `toolbar.test.js` (red), task-004 builds the markup and the header, task-005 the keyboard, framing, pressed convention and focus restore (the last of the two turns the new test green), task-006 the styles, task-007 repairs the old tests that assert the old markup and brings the unit suite and the coverage floor green, task-008 writes the end-to-end spec, task-009 writes the manual and the note of the presentation layer, task-010 proves the whole.

Tasks 008 and 009 are the one parallel group: they edit disjoint files (task-008 the e2e spec, `playwright.config.js` and `src/test/CLAUDE.md`; task-009 `src/doc/README.adoc` and `src/main/editor/presentation/CLAUDE.md`) and neither runs Maven for the other. Every other pair of tasks shares `standalone.html` (rebuilt by each) or reads what the one before wrote, so they are sequential.

Baseline of the diff checks: the working tree holds uncommitted wave documents. A check of the form "only these files changed" is read against the baseline of task-002 (the output of `git status --short` and `git diff --stat`, saved in the scratchpad). No task commits (the generated implement workflow never commits; the commit is the run's, made by the main agent after Stage 11).

JDK: every Maven command runs with `JAVA_HOME=/home/tibo/.sdkman/candidates/java/25.0.4-tem` (the shell `java` is 21). `npm run editor:build` runs before any `node --test`, `./mvnw` or `npm run test:e2e` run by hand (CON-5).

This run operates under the autonomy override of `complete-run`: no task stops for a human on its category alone, so a future reader of this plan understands why a task flagged `review_after` was executed without a stop. No task of this plan is `critical` or `human_required`, so the override changes nothing beyond the review of gate-001 (the look of the docked toolbar and the wording of the titles), which is logged in the prg when the run ends.

## 1. Executive Summary

```yaml
summary:
  status: 'done'
  product_goal: 'The toolbar of a diagram is docked above the canvas on every surface, holds every control in one of five groups (Draw, Texts, Layout, Compare, Frame), has one Changes only toggle, uses aria-pressed with a constant label for every toggle and no data-lit, and its titles say what happens.'
  technical_approach: 'One function, renderDiagramToolbarHtml, builds the toolbar from five group renderers and renderDiagramCanvasHtml returns toolbar, stage and status line as three siblings; the Facet select moves from the header into Draw; the keyboard scope and the framing area follow the docking; one table, toolbar-controls.json, drives a node test per surface and an e2e spec runs in three browsers.'
  total_tasks: 10
  parallel_groups: 1
  high_risk_tasks: 0
  human_review_gates: 1
  autonomy_level: 'medium'
  recommendation: 'proceed_with_review'
  criteria:
    - 'grep -rc data-lit src/main/editor prints 0 for every file, and every toggle of the toolbar, the header Maximize, the story bar Edit text and the player Full screen and Center has aria-pressed and a label that does not change (REQ-4)'
    - 'On the element page (three viewpoints), both Maps, the page of a saved view and a story step, the toolbar is before the chips and before the canvas in the markup, the five groups come in the order Draw, Texts, Layout, Compare, Frame, and each control is in exactly one group; toolbar.test.js and diagram-toolbar.spec.js prove it (REQ-1, REQ-2)'
    - 'Changes only is one button, data-action set-changes-only, data-value the value a click sets, and the address key changes-only=1 is read and written as before; git diff ff3bacd on the two address specs shows no removed line (REQ-3, CON-2)'
    - 'npm run test:unit, npm run test:coverage, npm run editor:check, npm run format:check and npm run lint exit 0, and npm run editor:build run twice leaves git status --short as it was after the first (REQ-6, REQ-8)'
    - 'npx playwright test exits 0 on Chromium, Firefox and WebKit, WebKit running diagram-toolbar.spec.js (REQ-6, CON-4)'
    - 'JAVA_HOME of JDK 25 scripts/byte-identity.sh exits 0 with no new declared difference, and ./mvnw test -Dtest=ManualExamplesTest plus the two manual node tests exit 0 (REQ-7, REQ-8)'
    - 'The manual describes the toolbar in [[editor-layout]] and every anchor of git show ff3bacd:src/doc/README.adoc is still defined (REQ-7)'
```

## 2. PRD/TDD Consistency Assessment

```yaml
consistency_assessment:
  aligned_items:
    - 'Scope, REQ-1 to REQ-9, DEC-1 to DEC-9, CTR-1 to CTR-4 and IMP-1 to IMP-10 agree with the W-7 row and gate P3 of the manifest, decision Q1 and RFC-002 DEC-1 and DEC-3; every task below traces to them'
    - 'Q-1 to Q-4 are settled by Stage 6 (P-1 and P-8 built as proposed; titles worded by the implementer under CTR-4; group name equals aria name; one commit for IMP-1 with the cut rule at 1,600 lines), so no task waits on a question'
    - 'No command, option, message, file format or exit code changes; nothing under src/main/java, pom.xml, workflows or scripts is touched, and the address contract of run 0203 holds (CON-2, CON-7)'
  gaps:
    - id: gap-001
      type: missing_technical_design
      description: 'Stage 5 F1 (S2): headerControlSelector (map-state.js) finds a control by data-action plus data-value, and the Changes only button changes its data-value with its state, so after a press the focus helper looks for the old value and the focus is lost.'
      impact: 'medium'
      recommendation: 'task-001 adds to DEC-5 and CTR-3 an id, diagram-changes-only-button, kept in every state; the selector then takes the id first (it already does for any control that has one); task-005 proves the focus stays after a press.'
    - id: gap-002
      type: missing_technical_design
      description: 'Stage 5 F2 (S2): story-player-scene.test.js compares renderDiagramCanvasHtml with the page of archicode-0.18.0, and the markup now differs on purpose; the test is not in IMP-9.'
      impact: 'medium'
      recommendation: 'task-001 adds it to IMP-9 with the rule that the comparison keeps what did not change on purpose (the stage and the status line) and names the new toolbar as the difference; task-007 edits it.'
    - id: gap-003
      type: missing_technical_design
      description: 'Stage 5 F3 (S2): other tests slice the markup at diagram-stage and would read the toolbar as part of the stage or not find it.'
      impact: 'medium'
      recommendation: 'task-007 greps src/test for diagram-stage, diagram-tools, diagram-facet-select, set-changes-only and data-lit and lists every file it edits in the record; task-001 says so in IMP-9 and adds to it the three tests that stub closest with .diagram-stage and the shell comparison of story-player-scene.test.js (gap-007).'
    - id: gap-004
      type: ambiguity
      description: 'Stage 5 S1 findings: duplicated statements (Q-1 and ASM-1, Q-4 and ASM-6 and RISK-7, the verification list and DEC-8), four hits against five lines of data-lit, a minus sign in CTR-4 that the code does not match, and the nested group for Columns and the .button-group styling left unstated.'
      impact: 'low'
      recommendation: 'task-001 removes the duplicates, says five lines in four places, writes the minus key as the one handleDiagramKeydown tests, and states that Columns sits in a tool-group-controls span inside the Layout group and that .button-group styling is kept inside a group for the controls that had it.'
    - id: gap-005
      type: risk
      description: 'The look of the docked toolbar at each width cannot be proved by a node test or a structural e2e spec (TDD, Not proved by these checks).'
      impact: 'low'
      recommendation: 'task-010 looks at 1280 and 360 pixels in the browser pane when it is available and records the heights as a finding; gate-001 is the author review; if the pane is unavailable the record says not checked.'
    - id: gap-006
      type: risk
      description: 'The working tree holds uncommitted wave documents, and diagram-page.js may pass 1,600 lines (ASM-6, RISK-7), which would need a refactor move commit that a no-commit workflow cannot make.'
      impact: 'low'
      recommendation: 'task-004 measures with node scripts/build-editor.mjs --map; at 1,304 lines plus about 100 it stays under the cap; if it would pass 1,600, task-004 stops, records it, and leaves the cut to the main agent (a human step outside the plan).'
    - id: gap-007
      type: repository_mismatch
      description: 'Stage 9 scan against the repository. story-player-scene.test.js compares two things with archicode-0.18.0: renderDiagramCanvasHtml(null, "") (line 588, the toolbar was inside the stage) and renderShellHtml (line 580, whose header loses the Facet select and changes the Maximize label). The new toolbar is a sibling before the stage, so a text comparison with the old page fails for both on purpose; the existing withoutColumns filter cannot absorb it. Also, three tests stub closest with a test on the exact selector .diagram-stage (diagram-box-tab-stops.test.js line 236, diagram-link-tab-stops.test.js line 337, inspection-links.test.js lines 626 and 647), so the widened scope of DEC-2 (closest(.diagram-stage, .diagram-toolbar)) makes handleDiagramKeydown ignore their events until the stubs name the new selector.'
      impact: 'medium'
      recommendation: 'task-007 edits story-player-scene.test.js so that the old toolbar (the div.diagram-tools inside the old stage) and the new toolbar are both cut out before the stage and the status line are compared, and so that the shell comparison filters the Facet select and the Maximize button of both pages, each filter with its reason in a comment; it edits the three stubs to answer the new selector without weakening what they assert. task-004 keeps renderDiagramCanvasHtml(null, "") working with no record and no host (IF-1: same arguments), which that test calls.'
    - id: gap-008
      type: repository_mismatch
      description: 'Stage 9 scan: css-theme-audit.test.js lives in src/test/javascript/viewpoint-kernel/, not src/test/javascript/, so the path and the node --test command of task-006 named a file that does not exist. IMP-9 of the TDD names the bare file name, which is right. The TDD (IMP-8) also counts three mentions of the pair Everything | Changes only; the manual has the literal pair at lines 2134 and 2291 only, and line 809 says Changes only among the tools of a diagram, which stays true.'
      impact: 'low'
      recommendation: 'Corrected in this stage: the paths of task-006 are the real ones; task-009 rewrites the two literal pairs and reads line 809 for truth instead of rewriting a pair that is not there.'
  blocking_gaps: []
```

## 3. Execution Graph

```yaml
execution_graph:
  nodes:
    - id: task-001
      status: 'done'
      title: 'Amend the TDD with the Stage 5 findings'
      depends_on: []
      produces:
        - 'tdd-0217-toolbar-structure.md amended (DEC-5, CTR-3, IMP-4, IMP-9, Current State, CTR-1, CTR-4, duplicates removed)'
        - 'One row per finding in the Findings section of prg-0217-toolbar-structure.md'
      agent_role: 'Architecture Agent'
      autonomy: 'autonomous'
      risk: 'low'
      confidence: 85
    - id: task-002
      status: 'done'
      title: 'Save the baseline: tree state, data-lit and test-file counts, editor size map'
      depends_on: [task-001]
      produces:
        - 'Scratchpad directory baseline-0217 with status.txt, diffstat.txt, data-lit.txt, old-markup-tests.txt, map.txt, unit-before.txt and anchors-ff3bacd.txt'
      agent_role: 'QA Agent'
      autonomy: 'autonomous'
      risk: 'low'
      confidence: 85
    - id: task-003
      status: 'done'
      title: 'Write toolbar-controls.json and toolbar.test.js, red'
      depends_on: [task-002]
      produces:
        - 'src/test/javascript/viewpoint-kernel/toolbar-controls.json'
        - 'src/test/javascript/viewpoint-kernel/toolbar.test.js with one test per check (a) to (h) of the TDD'
      agent_role: 'Test Generation Agent'
      autonomy: 'autonomous'
      risk: 'medium'
      confidence: 75
    - id: task-004
      status: 'done'
      title: 'Build the toolbar markup and take the Facet out of the header'
      depends_on: [task-003]
      produces:
        - 'diagram-page.js: renderDiagramToolbarHtml, five group renderers, three siblings, one Changes only button with its id, Center with aria-pressed, titles'
        - 'diagram-controls.js: header without Facet, Maximize with a constant label and aria-pressed, Columns with title'
        - 'names.json and standalone.html rebuilt'
      agent_role: 'Frontend Implementation Agent'
      autonomy: 'review_after'
      risk: 'medium'
      confidence: 70
    - id: task-005
      status: 'done'
      title: 'Keyboard scope, framing area, pressed convention and focus restore'
      depends_on: [task-004]
      produces:
        - 'diagram-interaction.js, story-player.js, stories-pages.js and map-state.js edited; no data-lit left in src/main/editor except style.css'
        - 'toolbar.test.js green on checks (a) to (h)'
      agent_role: 'Frontend Implementation Agent'
      autonomy: 'review_after'
      risk: 'medium'
      confidence: 75
    - id: task-006
      status: 'done'
      title: 'Style the docked toolbar and the groups'
      depends_on: [task-005]
      produces:
        - 'style.css: .diagram-toolbar, .tool-group, .tool-group-name, .tool-group-controls, pressed rule without data-lit, .maximize-button pressed'
        - 'css-theme-audit.test.js entries for the new class'
        - 'No data-lit in any file of src/main/editor'
      agent_role: 'Frontend Implementation Agent'
      autonomy: 'autonomous'
      risk: 'low'
      confidence: 70
    - id: task-007
      status: 'done'
      title: 'Repair the tests that assert the old markup and meet the coverage floor'
      depends_on: [task-006]
      produces:
        - 'Edits to changes-panel, header, diagram, library-view-panels, story-player-modal, story-player-scene tests and any other file the unit run names'
        - 'npm run test:unit and npm run test:coverage exit 0'
      agent_role: 'Test Generation Agent'
      autonomy: 'autonomous'
      risk: 'medium'
      confidence: 70
    - id: task-008
      status: 'done'
      title: 'Write the end-to-end spec and add it to WebKit'
      depends_on: [task-007]
      produces:
        - 'src/test/e2e/diagram-toolbar.spec.js'
        - 'playwright.config.js WebKit testMatch with the spec'
        - 'src/test/CLAUDE.md paragraph on the six WebKit specs'
      agent_role: 'QA Agent'
      autonomy: 'autonomous'
      risk: 'medium'
      confidence: 65
    - id: task-009
      status: 'done'
      title: 'Write the manual and the note of the presentation layer'
      depends_on: [task-007]
      produces:
        - 'src/doc/README.adoc edited in [[editor-layout]], [[editor-texts]], [[editor-header]] and the two literal mentions of Everything | Changes only'
        - 'src/main/editor/presentation/CLAUDE.md with one paragraph on the toolbar'
      agent_role: 'Documentation Agent'
      autonomy: 'review_after'
      risk: 'low'
      confidence: 85
    - id: task-010
      status: 'done'
      title: 'Prove the whole and record the look of the toolbar'
      depends_on: [task-008, task-009]
      produces:
        - 'Every check of the Observability and Verification section run, results in the Findings of the prg'
        - 'Heights of the toolbar at 1280 and 360 pixels, or the statement not checked'
      agent_role: 'QA Agent'
      autonomy: 'review_after'
      risk: 'medium'
      confidence: 75
  edges:
    - from: task-001
      to: task-002
      reason: 'The baseline is read against the amended TDD, and the findings name the files the baseline lists'
    - from: task-002
      to: task-003
      reason: 'The test is written against the saved lists of surfaces and old assertions'
    - from: task-003
      to: task-004
      reason: 'The markup is built to turn the red test green'
    - from: task-004
      to: task-005
      reason: 'The interaction edits read the new class and the new button id'
    - from: task-005
      to: task-006
      reason: 'The pressed rule is written once no data-lit is left to select'
    - from: task-006
      to: task-007
      reason: 'The old tests are repaired against the final markup and style'
    - from: task-007
      to: task-008
      reason: 'The spec runs against the jar built from the final page'
    - from: task-007
      to: task-009
      reason: 'The manual describes the final controls and titles'
    - from: task-008
      to: task-010
      reason: 'The proof runs the e2e suite'
    - from: task-009
      to: task-010
      reason: 'The proof runs the manual tests'
```

## 4. Task Catalog

```yaml
task_catalog:
  tasks:
    - id: task-001
      title: 'Amend the TDD with the Stage 5 findings'
      source_requirements:
        prd:
          - 'REQ-3'
          - 'REQ-4'
          - 'REQ-6'
        tdd:
          - 'DEC-5'
          - 'CTR-1'
          - 'CTR-3'
          - 'CTR-4'
          - 'IMP-4'
          - 'IMP-9'
          - 'Current State'
      outputs:
        - 'tdd-0217-toolbar-structure.md with F1, F2, F3 and the S1 findings applied'
        - 'Findings of the prg with one line per finding, marked applied'
      verification:
        - 'grep -n "diagram-changes-only-button" tdd-0217-toolbar-structure.md shows the id in DEC-5, CTR-3 and IMP-4'
        - 'grep -n "story-player-scene" tdd-0217-toolbar-structure.md shows the test in IMP-9'
        - 'grep -c "four hits" tdd-0217-toolbar-structure.md prints 0'
        - 'grep -n "tool-group-controls" tdd-0217-toolbar-structure.md shows the nested group for Columns and the button-group styling stated in CTR-1'
        - 'grep -n "inspection-links" tdd-0217-toolbar-structure.md shows the closest stubs in IMP-9, with diagram-box-tab-stops and diagram-link-tab-stops'
        - 'sed -n 1,10p of the TDD still shows run: 0217 and wave: 030 in the frontmatter'
      risk: 'low'
      confidence: 85
      human_review: 'none'
      escalation_triggers:
        - 'A fix contradicts a section of the TDD that the review did not name'
      delegation_tier: 'standard'
      results: 'tier standard, model sonnet, effort medium, profile low-cost, passed first time, inline (leaf), independently verified'
    - id: task-002
      title: 'Save the baseline: tree state, data-lit and test-file counts, editor size map'
      source_requirements:
        prd:
          - 'REQ-4'
          - 'REQ-6'
          - 'REQ-8'
        tdd:
          - 'CON-2'
          - 'CON-3'
          - 'ASM-6'
          - 'IMP-9'
      outputs:
        - 'Scratchpad directory baseline-0217: status.txt, diffstat.txt, data-lit.txt (grep -rn data-lit src/main/editor), old-markup-tests.txt (grep -rln of diagram-stage, diagram-tools, diagram-facet-select, set-changes-only, data-lit and Restore in src/test), map.txt (node scripts/build-editor.mjs --map), unit-before.txt (the tail of npm run test:unit) and anchors-ff3bacd.txt (the ids of git show ff3bacd:src/doc/README.adoc)'
      verification:
        - 'ls baseline-0217 lists the seven files and none is empty'
        - 'data-lit.txt has 5 lines and none is in a file other than style.css, diagram-interaction.js, story-player.js and diagram-page.js'
        - 'map.txt shows diagram-page.js with its line count, under 1,600'
        - 'unit-before.txt ends with a line that shows npm run test:unit passing on the working copy, or the failing files are named in it so that a later failure is not charged to this run'
      risk: 'low'
      confidence: 85
      human_review: 'none'
      escalation_triggers:
        - 'The unit suite is red before any edit of this run'
        - 'npm run editor:build changes git status --short'
      delegation_tier: 'cheap'
      results: 'tier cheap, model haiku, effort high, profile low-cost, passed first time, inline (leaf), independently verified'
    - id: task-003
      title: 'Write toolbar-controls.json and toolbar.test.js, red'
      source_requirements:
        prd:
          - 'REQ-1'
          - 'REQ-2'
          - 'REQ-3'
          - 'REQ-4'
          - 'REQ-5'
        tdd:
          - 'DEC-8'
          - 'CTR-1'
          - 'CTR-2'
          - 'TG-3'
          - 'TG-5'
          - 'Observability and Verification 3'
      outputs:
        - 'src/test/javascript/viewpoint-kernel/toolbar-controls.json with the six surfaces element, map-application, map-technology, view-element, view-map-application and view-map-technology, groups in order, controls by data-action plus data-show, data-part or data-dir, or by id for a select'
        - 'src/test/javascript/viewpoint-kernel/toolbar.test.js with one test per check, each test name starting "check a:" to "check h:", covering the six surfaces (and a story step through goToStoryStep) with the openers of header.test.js, technology-map-parts.test.js and library-view-diagram.test.js'
      verification:
        - 'node --test src/test/javascript/viewpoint-kernel/toolbar.test.js runs after npm run editor:build and fails with assertion messages that name a missing toolbar (red by design); it does not fail on a syntax error or a missing import'
        - 'JSON.parse of toolbar-controls.json succeeds and lists six surfaces, each with the groups in the order Draw, Texts, Layout, Compare, Frame'
        - 'npx prettier --check on the two new files exits 0'
        - 'Task-005 turns the whole file green; no earlier task asks for it to pass'
      risk: 'medium'
      confidence: 75
      human_review: 'none'
      escalation_triggers:
        - 'An opener of an existing test cannot reach a surface (the story step or the technology Map view)'
        - 'The table needs a control the TDD does not list'
      delegation_tier: 'standard'
      results: 'tier standard, model sonnet, effort medium, profile low-cost, passed first time, inline (leaf), independently verified'
    - id: task-004
      title: 'Build the toolbar markup and take the Facet out of the header'
      source_requirements:
        prd:
          - 'REQ-1'
          - 'REQ-2'
          - 'REQ-3'
          - 'REQ-5'
        tdd:
          - 'DEC-1'
          - 'DEC-3'
          - 'DEC-4'
          - 'DEC-5'
          - 'DEC-7'
          - 'CTR-1'
          - 'IF-1'
          - 'IF-2'
          - 'IF-3'
          - 'IMP-1'
          - 'IMP-2'
          - 'IMP-6'
      outputs:
        - 'diagram-page.js: renderDiagramCanvasHtml returns toolbar, stage and status line; renderDiagramToolbarHtml(record, host) and five group renderers with div.tool-group[role=group][aria-label][data-group], span.tool-group-name and span.tool-group-controls; one Changes only button with id diagram-changes-only-button, data-value the value a click sets and aria-pressed; Center with aria-pressed and no data-lit; a title on every button and select that differs from its label'
        - 'diagram-controls.js: renderDiagramHeaderActionsHtml without renderFacetSelectHtml, Maximize with a constant label, aria-label and aria-pressed, Columns select with a title'
        - 'names.json updated with node scripts/check-editor.mjs --write-names, standalone.html rebuilt'
      verification:
        - 'npm run editor:build then npm run editor:check exit 0'
        - 'node --test src/test/javascript/viewpoint-kernel/toolbar.test.js --test-name-pattern "check (a|b|c|e|g|h):" passes (markup checks); checks d and f need task-005'
        - 'grep -n "renderFacetSelectHtml" src/main/editor/presentation/diagram-controls.js shows the definition and no call from the header actions'
        - 'node scripts/build-editor.mjs --map shows diagram-page.js under 1,600 lines'
        - 'git diff --stat against the baseline shows only files of IMP-1, IMP-2, IMP-6 and the new tests of task-003'
      risk: 'medium'
      confidence: 70
      human_review: 'after'
      escalation_triggers:
        - 'diagram-page.js would pass 1,600 lines: stop and record it, the cut is a refactor move commit that the main agent makes'
        - 'A top-level name that a Java source cites (java-names.json) would be removed or renamed'
        - 'The address specs would need an attribute that DEC-5 changes (data-action or data-value of set-changes-only)'
      delegation_tier: 'standard'
      results: 'tier standard, model sonnet, effort medium, profile low-cost, passed first time, inline (leaf), independently verified'
    - id: task-005
      title: 'Keyboard scope, framing area, pressed convention and focus restore'
      source_requirements:
        prd:
          - 'REQ-1'
          - 'REQ-4'
          - 'REQ-5'
          - 'REQ-9'
        tdd:
          - 'DEC-2'
          - 'DEC-6'
          - 'DEC-9'
          - 'CTR-3'
          - 'CTR-4'
          - 'IMP-3'
          - 'IMP-4'
          - 'FLOW-2'
          - 'TG-4'
          - 'TG-5'
      outputs:
        - 'diagram-interaction.js: handleDiagramKeydown tests closest(.diagram-stage, .diagram-toolbar); diagramViewSize returns the canvas size with no tools lookup; the Center and Fit updaters set aria-pressed'
        - 'story-player.js: Center with aria-pressed and no data-lit, Full screen with a constant label and a title that names the action; stories-pages.js: Edit text with a constant label and a title that names the action'
        - 'map-state.js: headerControlSelector adds .diagram-toolbar button and .diagram-toolbar select to its closest list'
        - 'standalone.html rebuilt'
      verification:
        - 'npm run editor:build then npm run editor:check exit 0'
        - 'node --test src/test/javascript/viewpoint-kernel/toolbar.test.js passes in full, checks a to h (the red file of task-003 is green)'
        - 'grep -rn "data-lit" src/main/editor prints only the line of style.css that task-006 removes'
        - 'A test of toolbar.test.js presses Changes only through the click handler on a page with a comparison and finds the focus on #diagram-changes-only-button after the redraw (finding F1)'
      risk: 'medium'
      confidence: 75
      human_review: 'after'
      escalation_triggers:
        - 'An auto or fit scale of a node test moves by more than the 16 pixels of margin (RISK-2): record it, do not loosen a tolerance'
        - 'A key named by a title is not handled by handleDiagramKeydown (change the title, never the handler, unless the TDD says so)'
      delegation_tier: 'standard'
      results: 'tier standard, model sonnet, effort medium, profile low-cost, passed after escalation to effort high, inline (leaf), independently verified'
    - id: task-006
      title: 'Style the docked toolbar and the groups'
      source_requirements:
        prd:
          - 'REQ-1'
          - 'REQ-2'
          - 'REQ-4'
        tdd:
          - 'DEC-1'
          - 'DEC-3'
          - 'DEC-6'
          - 'IMP-5'
          - 'CON-3'
          - 'CON-6'
      outputs:
        - 'style.css: .diagram-toolbar a docked wrapping row (flex none, margin 0 -1.75rem, the padding of the status line, a bottom border), .diagram-tools keeping the floating rules for the player only, .tool-group, .tool-group-name, .tool-group-controls, the pressed rule on [aria-pressed="true"] with no [data-lit], .maximize-button[aria-pressed="true"], colours from the existing theme tokens'
        - 'src/test/javascript/viewpoint-kernel/css-theme-audit.test.js entries for .diagram-toolbar beside the two of .diagram-tools'
        - 'standalone.html rebuilt'
      verification:
        - 'grep -rc "data-lit" src/main/editor prints 0 for every file'
        - 'npm run editor:build then npm run editor:check exit 0'
        - 'node --test src/test/javascript/viewpoint-kernel/css-theme-audit.test.js passes'
        - 'npm run format:check exits 0 for style.css'
      risk: 'low'
      confidence: 70
      human_review: 'none'
      escalation_triggers:
        - 'A colour not in the theme tokens is needed'
        - 'The theme audit test names a rule it cannot place'
      delegation_tier: 'standard'
      results: 'tier standard, model sonnet, effort medium, profile low-cost, passed first time, inline (leaf), independently verified'
    - id: task-007
      title: 'Repair the tests that assert the old markup and meet the coverage floor'
      source_requirements:
        prd:
          - 'REQ-2'
          - 'REQ-3'
          - 'REQ-4'
          - 'REQ-6'
        tdd:
          - 'IMP-9'
          - 'ASM-2'
          - 'ASM-3'
          - 'CON-8'
          - 'RISK-2'
      outputs:
        - 'Edited assertions in changes-panel.test.js, header.test.js, diagram.test.js, library-view-panels.test.js, story-player-modal.test.js, story-player-scene.test.js, story-player-page.js and every other file the unit run or the grep of old-markup-tests.txt names; each edit changes an assertion on markup that changed on purpose and states why'
        - 'The facet assertions of header.test.js moved to the toolbar, the data-lit assertions of diagram.test.js turned into aria-pressed, the 0.18.0 comparisons of story-player-scene.test.js (the canvas and the shell) keeping what did not change on purpose, and the closest stubs of diagram-box-tab-stops, diagram-link-tab-stops and inspection-links answering the selector of DEC-2 (gap-007)'
      verification:
        - 'npm run editor:build then npm run test:unit exits 0'
        - 'npm run test:coverage exits 0 against scripts/editor-coverage-floor.json, and the floor file is unchanged or only raised'
        - 'library-view-diagram.test.js line that asserts the page of a saved view has no diagram-facet-select, fold-all or unfold-all is unchanged and passes (W-8 reverses it)'
        - 'git diff against the baseline shows no test deleted and no tolerance loosened (a changed number has its reason in a comment)'
        - 'story-player-scene.test.js still compares the stage and the status line of the step with the page of archicode-0.18.0, and the only text it removes from either side is the toolbar and the header controls that this run moves, each with a comment'
      risk: 'medium'
      confidence: 70
      human_review: 'none'
      escalation_triggers:
        - 'A test fails for a reason that is not the markup change: record it, do not edit the test to pass'
        - 'The floor cannot be met without a test of behaviour outside this run'
      delegation_tier: 'standard'
      results: 'tier standard, model sonnet, effort medium, profile low-cost, passed first time, inline (leaf), independently verified'
    - id: task-008
      title: 'Write the end-to-end spec and add it to WebKit'
      source_requirements:
        prd:
          - 'REQ-1'
          - 'REQ-2'
          - 'REQ-6'
        tdd:
          - 'DEC-8'
          - 'CON-2'
          - 'CON-4'
          - 'ASM-5'
          - 'RISK-4'
          - 'RISK-5'
          - 'IMP-7'
          - 'IMP-10'
          - 'Observability and Verification 5'
          - 'Observability and Verification 6'
      outputs:
        - 'src/test/e2e/diagram-toolbar.spec.js with one test per surface (element, application Map, technology Map, saved view, story step): groups found by role in order, the toolbar box above the canvas box, Tab from the header reaches the first toolbar control before the canvas, getByRole button name Fit, Center and Changes only with pressed, F pressed on a toolbar button acts, and at 360 by 740 the document is not wider than 360 and every control is inside the width'
        - 'playwright.config.js with the spec in the WebKit testMatch'
        - 'src/test/CLAUDE.md saying WebKit runs six specs and which'
      verification:
        - 'JAVA_HOME=/home/tibo/.sdkman/candidates/java/25.0.4-tem ./mvnw package -Dmaven.test.skip -Dplugin.asciidoctor.skip=true exits 0, then npx playwright test src/test/e2e/diagram-toolbar.spec.js exits 0 on chromium, firefox and webkit'
        - 'npx playwright test src/test/e2e/diagram-address.spec.js src/test/e2e/address.spec.js src/test/e2e/diagram-columns.spec.js exits 0 in every project they run in'
        - 'git diff ff3bacd -- src/test/e2e/diagram-address.spec.js src/test/e2e/address.spec.js shows no removed line'
        - 'npx prettier --check src/test/e2e/diagram-toolbar.spec.js exits 0 and npm run lint exits 0'
      risk: 'medium'
      confidence: 65
      human_review: 'none'
      escalation_triggers:
        - 'A browser is not installed (npx playwright install) or WebKit lacks system libraries: record the project as not run, never claim it'
        - 'The spec flakes: make it stable or reduce it, never add a retry (RISK-4)'
        - 'The arrow keys on the Columns or Facet select are confirmed taken by the diagram handler: record it as the text of DEF-3 for an issue, do not fix it here'
      delegation_tier: 'standard'
      results: 'tier standard, model sonnet, effort medium, profile low-cost, passed after escalation to effort high, inline (leaf), independently verified'
    - id: task-009
      title: 'Write the manual and the note of the presentation layer'
      source_requirements:
        prd:
          - 'REQ-7'
          - 'REQ-2'
        tdd:
          - 'IMP-8'
          - 'IMP-10'
          - 'CON-9'
      outputs:
        - 'src/doc/README.adoc: [[editor-layout]] gets the paragraph on the toolbar (docked above the diagram, five groups in order, each control in one, the pressed convention, the titles) and rewords "A story step has no toolbar"; [[editor-texts]] says Texts and pressed; [[editor-header]] no longer keeps the facet list in the header; the two literal mentions of Everything | Changes only (lines 2134 and 2291) say one Changes only toggle, and line 809 is read for truth'
        - 'src/main/editor/presentation/CLAUDE.md with one paragraph: where the toolbar is built, the five groups, data-group, toolbar-controls.json as the table a new control is added to, the pressed convention'
      verification:
        - 'node --test src/test/javascript/manual-skeleton.test.js src/test/javascript/manual-voice.test.js exits 0 and every id of anchors-ff3bacd.txt is still defined in src/doc/README.adoc'
        - 'grep -n "Everything | Changes only" src/doc/README.adoc prints nothing'
        - 'grep -n "toolbar-controls.json" src/main/editor/presentation/CLAUDE.md prints the new paragraph'
        - 'npm run format:check exits 0'
      risk: 'low'
      confidence: 85
      human_review: 'after'
      escalation_triggers:
        - 'The voice test bans a word the sentence needs: rewrite the sentence, no exemption'
        - 'An anchor would have to be added or removed'
      delegation_tier: 'standard'
      results: 'tier standard, model sonnet, effort medium, profile low-cost, passed first time, inline (leaf), independently verified'
    - id: task-010
      title: 'Prove the whole and record the look of the toolbar'
      source_requirements:
        prd:
          - 'REQ-6'
          - 'REQ-7'
          - 'REQ-8'
        tdd:
          - 'Observability and Verification 1 to 10'
          - 'CON-1'
          - 'CON-5'
          - 'CON-7'
          - 'RISK-1'
      outputs:
        - 'Findings of prg-0217-toolbar-structure.md with the result of each check, the heights of the toolbar at 1280 and 360 pixels (or not checked), and the list of tests edited by task-007'
      verification:
        - 'npm run editor:build run twice: git status --short is the same after the second run, and npm run editor:check exits 0'
        - 'npm run test:unit, npm run test:coverage, npm run format:check and npm run lint exit 0, and grep -rc data-lit src/main/editor prints 0 for every file'
        - 'JAVA_HOME=/home/tibo/.sdkman/candidates/java/25.0.4-tem ./mvnw test -Dtest=ManualExamplesTest exits 0'
        - 'JAVA_HOME=/home/tibo/.sdkman/candidates/java/25.0.4-tem scripts/byte-identity.sh exits 0 with no new declared difference'
        - 'npx playwright test exits 0 on the three projects, or the projects not run are named'
        - 'git diff --stat against the baseline shows only the files of the TDD (Scope), the three new test files, the run folder and standalone.html'
      risk: 'medium'
      confidence: 75
      human_review: 'after'
      escalation_triggers:
        - 'A check fails for a file this run did not touch: list it, do not fix another run work here'
        - 'The browser pane is unavailable: record the look as not checked'
        - 'byte-identity.sh needs a declared exception'
      delegation_tier: 'standard'
      results: 'tier standard, model sonnet, effort medium, profile low-cost, passed first time, inline (leaf), independently verified'
```

## 5. Parallelization Plan

```yaml
parallelization_plan:
  groups:
    - id: parallel-group-001
      tasks:
        - task-008
        - task-009
      reason: 'The end-to-end spec and the manual with its note touch disjoint files and read the final page that task-007 left'
      conflict_risks:
        - 'task-008 builds the jar with Maven and task-009 must not run Maven (ManualExamplesTest is task-010), or the two corrupt target/'
        - 'Neither task may run npm run editor:build; standalone.html is final after task-007 and a rebuild by one would change what the other reads'
        - 'Both read src/test/CLAUDE.md and src/main/editor/presentation/CLAUDE.md only through their own paragraph; task-008 edits the first, task-009 the second'
```

Tasks 001 to 007 form a chain: 003 and 004 to 005 are one red then green sequence on `toolbar.test.js`, and every task from 004 to 007 rebuilds the generated page, so no pair can run together.

## 6. Human Review Gates

```yaml
human_review_gates:
  gates:
    - id: gate-001
      trigger: 'The run ends with a docked toolbar whose look at each width is judged in a browser and not by a test, titles worded by the implementing agent (Q-2), and the Facet moved out of the header.'
      required_before: []
      required_after: ['task-010']
      reviewer_focus:
        - 'Read the titles of the toolbar once: does each say what happens, and does each key it names work'
        - 'Look at the toolbar at 1280 and 360 pixels: its height against the window (RISK-1) and the wrapped groups, knowing that W-8 collapses them under 40 rem'
        - 'Accept the move of the Facet from the header into Draw, and the new texts Maximize, Edit text and Full screen with a pressed state in place of Restore, Done and Exit full screen'
```

## 7. Risk Assessment

```yaml
risk_assessment:
  by_task:
    - id: task-001
      risk: 'low'
      rationale: 'Edits a draft document against named findings; nothing runs'
    - id: task-002
      risk: 'low'
      rationale: 'Reads and saves outputs; changes no file of the repository'
    - id: task-003
      risk: 'medium'
      rationale: 'A table and a test that must reach six surfaces and a story step with openers written for other tests; a wrong table would bless the wrong markup'
    - id: task-004
      risk: 'medium'
      rationale: 'Rewrites the markup of every diagram surface and moves a control out of the header; the address specs click attributes that must stay'
    - id: task-005
      risk: 'medium'
      rationale: 'Changes the keyboard scope, the framing area and the focus restore; a scale may move by the removed 16 pixels (RISK-2) and a key must not be lost (RISK-3)'
    - id: task-006
      risk: 'low'
      rationale: 'Styles from existing tokens, guarded by the theme audit test; the look is judged at the gate'
    - id: task-007
      risk: 'medium'
      rationale: 'Edits many assertions; the risk is a loosened test, countered by the rule that a changed number has its reason'
    - id: task-008
      risk: 'medium'
      rationale: 'A new spec in WebKit, which has run five specs for a reason (RISK-4), and a viewport assertion that can flake'
    - id: task-009
      risk: 'low'
      rationale: 'Prose in the manual guarded by the skeleton, voice and example tests'
    - id: task-010
      risk: 'medium'
      rationale: 'Runs the whole proof; a failure for a file that is not this run may appear'
  by_area:
    - area: 'ui'
      risk: 'medium'
      rationale: 'Every diagram surface changes its layout and the canvas gets shorter by the height of the toolbar (RISK-1)'
    - area: 'api'
      risk: 'low'
      rationale: 'No command, file or address changes; the data attributes the address specs click are kept (CON-2)'
    - area: 'docs'
      risk: 'low'
      rationale: 'Manual sections and two notes, guarded by tests'
    - area: 'infra'
      risk: 'low'
      rationale: 'One line in playwright.config.js; no workflow or pom change'
```

## 8. Confidence Assessment

```yaml
confidence_assessment:
  by_task:
    - id: task-001
      score: 85
      rationale: 'Eleven findings with a stated fix; the TDD is read'
    - id: task-002
      score: 85
      rationale: 'Mechanical, each output is a file that can be counted'
    - id: task-003
      score: 75
      rationale: 'The openers exist but a story step and the technology Map view of a saved view are reached through helpers not yet read'
    - id: task-004
      score: 70
      rationale: 'The largest edit of the run in a 1,304-line file; the order of the groups and the conditions per surface are many'
    - id: task-005
      score: 75
      rationale: 'Small edits at known lines, with one new behaviour (the focus after a press) that has a test'
    - id: task-006
      score: 70
      rationale: 'The look is not provable by a test; the structure and the theme audit are'
    - id: task-007
      score: 70
      rationale: 'The list of tests that fail is known only after the first run'
    - id: task-008
      score: 65
      rationale: 'Three browsers, one of them new for the repository weight; ELK rows are not asserted'
    - id: task-009
      score: 85
      rationale: 'Prose with three guards'
    - id: task-010
      score: 75
      rationale: 'A list of known commands; the browser pane may be unavailable'
```

## 9. Agent Assignment Plan

```yaml
agent_assignment_plan:
  assignments:
    - task_id: task-001
      agent_role: 'Architecture Agent'
      objective: 'Apply the Stage 5 findings F1, F2, F3 and the S1 findings to the TDD without changing a decision the review did not question.'
      context:
        prd_excerpts:
          - 'REQ-3, REQ-4 and REQ-6 of the TDD traceability section (no PRD exists)'
        tdd_excerpts:
          - 'DEC-5, CTR-1, CTR-3, CTR-4, IMP-4, IMP-9, Current State'
      likely_files:
        - 'docs/wav/wav-030-pages-ci-and-toolbar/run/run-0217-toolbar-structure/tdd-0217-toolbar-structure.md'
        - 'docs/wav/wav-030-pages-ci-and-toolbar/run/run-0217-toolbar-structure/prg-0217-toolbar-structure.md'
      acceptance_criteria:
        - 'Each finding is applied as the plan describes it and the TDD holds no sentence that a fix makes false; IMP-9 also names the three closest stubs and the shell comparison of story-player-scene.test.js (gap-007)'
      verification:
        - 'grep -n "diagram-changes-only-button" tdd-0217-toolbar-structure.md shows the id in DEC-5, CTR-3 and IMP-4'
        - 'grep -n "story-player-scene" tdd-0217-toolbar-structure.md shows the test in IMP-9'
        - 'grep -c "four hits" tdd-0217-toolbar-structure.md prints 0'
        - 'grep -n "tool-group-controls" tdd-0217-toolbar-structure.md shows the nested group for Columns and the button-group styling stated in CTR-1'
        - 'grep -n "inspection-links" tdd-0217-toolbar-structure.md shows the closest stubs in IMP-9, with diagram-box-tab-stops and diagram-link-tab-stops'
        - 'sed -n 1,10p of the TDD still shows run: 0217 and wave: 030 in the frontmatter'
      escalation_triggers:
        - 'A fix contradicts another section'
      suggested_subagent_type: 'general-purpose'
      suggested_model: '(default)'
      suggested_effort: 'low'
    - task_id: task-002
      agent_role: 'QA Agent'
      objective: 'Save the tree state, the data-lit lines, the list of tests that assert the old markup, the editor size map, the unit result and the anchors of ff3bacd in the scratchpad, before any edit.'
      context:
        prd_excerpts:
          - 'REQ-4, REQ-6, REQ-8'
        tdd_excerpts:
          - 'CON-2, CON-3, ASM-6, IMP-9'
      likely_files:
        - 'src/main/editor'
        - 'src/test'
        - 'src/doc/README.adoc'
      acceptance_criteria:
        - 'The seven files exist in the scratchpad and describe the tree as it is before task-003'
      verification:
        - 'ls baseline-0217 lists the seven files and none is empty'
        - 'data-lit.txt has 5 lines and none is in a file other than style.css, diagram-interaction.js, story-player.js and diagram-page.js'
        - 'map.txt shows diagram-page.js with its line count, under 1,600'
        - 'unit-before.txt ends with a line that shows npm run test:unit passing on the working copy, or the failing files are named in it so that a later failure is not charged to this run'
      escalation_triggers:
        - 'The unit suite is red before any edit of this run'
      suggested_subagent_type: 'general-purpose'
      suggested_model: 'haiku'
      suggested_effort: 'low'
    - task_id: task-003
      agent_role: 'Test Generation Agent'
      objective: 'Write the table of controls and the node test of the toolbar so that they fail on the current markup and pass once task-004 and task-005 are done.'
      context:
        prd_excerpts:
          - 'REQ-1 to REQ-5'
        tdd_excerpts:
          - 'DEC-8, CTR-1, CTR-2, TG-3, TG-5, Observability and Verification 3 (checks a to h)'
      likely_files:
        - 'src/test/javascript/viewpoint-kernel/toolbar-controls.json'
        - 'src/test/javascript/viewpoint-kernel/toolbar.test.js'
        - 'src/test/javascript/viewpoint-kernel/header.test.js'
        - 'src/test/javascript/viewpoint-kernel/technology-map-parts.test.js'
        - 'src/test/javascript/viewpoint-kernel/library-view-diagram.test.js'
      acceptance_criteria:
        - 'One test per check a to h, named "check x:", on six surfaces and a story step, red for the reason that the toolbar is not yet as designed'
      verification:
        - 'node --test src/test/javascript/viewpoint-kernel/toolbar.test.js runs after npm run editor:build and fails with assertion messages that name a missing toolbar (red by design); it does not fail on a syntax error or a missing import'
        - 'JSON.parse of toolbar-controls.json succeeds and lists six surfaces, each with the groups in the order Draw, Texts, Layout, Compare, Frame'
        - 'npx prettier --check on the two new files exits 0'
        - 'Task-005 turns the whole file green; no earlier task asks for it to pass'
      escalation_triggers:
        - 'An opener cannot reach a surface'
      suggested_subagent_type: 'general-purpose'
      suggested_model: '(default)'
      suggested_effort: 'medium'
    - task_id: task-004
      agent_role: 'Frontend Implementation Agent'
      objective: 'Return the toolbar, the stage and the status line as three siblings, build the toolbar from five group renderers, move the Facet into Draw, make Changes only one button with an id and aria-pressed, and give every control a title.'
      context:
        prd_excerpts:
          - 'REQ-1, REQ-2, REQ-3, REQ-5'
        tdd_excerpts:
          - 'DEC-1, DEC-3, DEC-4, DEC-5, DEC-7, CTR-1, IF-1, IF-2, IF-3, IMP-1, IMP-2'
      likely_files:
        - 'src/main/editor/presentation/diagram-page.js'
        - 'src/main/editor/presentation/diagram-controls.js'
        - 'src/main/editor/names.json'
        - 'src/main/resources/editor-webapp/standalone.html'
      acceptance_criteria:
        - 'The markup checks a, b, c, e, g and h of toolbar.test.js pass and the header of an element and a Map has no Facet select'
      verification:
        - 'npm run editor:build then npm run editor:check exit 0'
        - 'node --test src/test/javascript/viewpoint-kernel/toolbar.test.js --test-name-pattern "check (a|b|c|e|g|h):" passes (markup checks); checks d and f need task-005'
        - 'grep -n "renderFacetSelectHtml" src/main/editor/presentation/diagram-controls.js shows the definition and no call from the header actions'
        - 'node scripts/build-editor.mjs --map shows diagram-page.js under 1,600 lines'
        - 'git diff --stat against the baseline shows only files of IMP-1, IMP-2, IMP-6 and the new tests of task-003'
      escalation_triggers:
        - 'diagram-page.js would pass 1,600 lines'
        - 'A name a Java source cites would be removed'
      suggested_subagent_type: 'general-purpose'
      suggested_model: '(default)'
      suggested_effort: 'medium'
    - task_id: task-005
      agent_role: 'Frontend Implementation Agent'
      objective: 'Widen the key scope to the toolbar, stop subtracting a strip from the canvas, set aria-pressed in the live updaters and the player and the story bar, and put the focus back on a toolbar control after a redraw.'
      context:
        prd_excerpts:
          - 'REQ-1, REQ-4, REQ-5, REQ-9'
        tdd_excerpts:
          - 'DEC-2, DEC-6, DEC-9, CTR-3, CTR-4, IMP-3, IMP-4, FLOW-2'
      likely_files:
        - 'src/main/editor/presentation/diagram-interaction.js'
        - 'src/main/editor/presentation/story-player.js'
        - 'src/main/editor/presentation/stories-pages.js'
        - 'src/main/editor/presentation/map-state.js'
      acceptance_criteria:
        - 'toolbar.test.js passes in full and no file of src/main/editor but style.css holds data-lit'
      verification:
        - 'npm run editor:build then npm run editor:check exit 0'
        - 'node --test src/test/javascript/viewpoint-kernel/toolbar.test.js passes in full, checks a to h (the red file of task-003 is green)'
        - 'grep -rn "data-lit" src/main/editor prints only the line of style.css that task-006 removes'
        - 'A test of toolbar.test.js presses Changes only through the click handler on a page with a comparison and finds the focus on #diagram-changes-only-button after the redraw (finding F1)'
      escalation_triggers:
        - 'A scale moves by more than the removed margin'
        - 'A key named by a title is not handled'
      suggested_subagent_type: 'general-purpose'
      suggested_model: '(default)'
      suggested_effort: 'medium'
    - task_id: task-006
      agent_role: 'Frontend Implementation Agent'
      objective: 'Write the rules of the docked toolbar and the groups and delete the data-lit rule, using the existing theme tokens.'
      context:
        prd_excerpts:
          - 'REQ-1, REQ-2, REQ-4'
        tdd_excerpts:
          - 'DEC-1, DEC-3, DEC-6, IMP-5, CON-3, CON-6'
      likely_files:
        - 'src/main/editor/style.css'
        - 'src/test/javascript/viewpoint-kernel/css-theme-audit.test.js'
        - 'src/main/resources/editor-webapp/standalone.html'
      acceptance_criteria:
        - 'No data-lit anywhere in src/main/editor and the theme audit passes with the new class'
      verification:
        - 'grep -rc "data-lit" src/main/editor prints 0 for every file'
        - 'npm run editor:build then npm run editor:check exit 0'
        - 'node --test src/test/javascript/viewpoint-kernel/css-theme-audit.test.js passes'
        - 'npm run format:check exits 0 for style.css'
      escalation_triggers:
        - 'A colour outside the theme tokens is needed'
      suggested_subagent_type: 'general-purpose'
      suggested_model: '(default)'
      suggested_effort: 'medium'
    - task_id: task-007
      agent_role: 'Test Generation Agent'
      objective: 'Change the assertions of the tests that read the old markup so that they read the new one, with a reason for each changed number, and bring the unit suite and the coverage floor green.'
      context:
        prd_excerpts:
          - 'REQ-2, REQ-3, REQ-4, REQ-6'
        tdd_excerpts:
          - 'IMP-9, ASM-2, ASM-3, CON-8, RISK-2'
      likely_files:
        - 'src/test/javascript/viewpoint-kernel/changes-panel.test.js'
        - 'src/test/javascript/viewpoint-kernel/header.test.js'
        - 'src/test/javascript/viewpoint-kernel/diagram.test.js'
        - 'src/test/javascript/viewpoint-kernel/library-view-panels.test.js'
        - 'src/test/javascript/viewpoint-kernel/story-player-modal.test.js'
        - 'src/test/javascript/viewpoint-kernel/story-player-scene.test.js'
        - 'src/test/javascript/viewpoint-kernel/diagram-box-tab-stops.test.js'
        - 'src/test/javascript/viewpoint-kernel/diagram-link-tab-stops.test.js'
        - 'src/test/javascript/viewpoint-kernel/inspection-links.test.js'
        - 'src/test/javascript/viewpoint-kernel/band-wrap.test.js'
        - 'src/test/javascript/viewpoint-kernel/map-facet-lists.test.js'
        - 'src/test/javascript/viewpoint-kernel/technology-map.test.js'
        - 'src/test/javascript/viewpoint-kernel/technology-map-parts.test.js'
      acceptance_criteria:
        - 'The unit suite and the coverage floor pass, no test is deleted and no tolerance is loosened without a stated reason'
      verification:
        - 'npm run editor:build then npm run test:unit exits 0'
        - 'npm run test:coverage exits 0 against scripts/editor-coverage-floor.json, and the floor file is unchanged or only raised'
        - 'library-view-diagram.test.js line that asserts the page of a saved view has no diagram-facet-select, fold-all or unfold-all is unchanged and passes (W-8 reverses it)'
        - 'git diff against the baseline shows no test deleted and no tolerance loosened (a changed number has its reason in a comment)'
        - 'story-player-scene.test.js still compares the stage and the status line of the step with the page of archicode-0.18.0, and the only text it removes from either side is the toolbar and the header controls that this run moves, each with a comment'
      escalation_triggers:
        - 'A failure not caused by the markup change'
      suggested_subagent_type: 'general-purpose'
      suggested_model: '(default)'
      suggested_effort: 'medium'
    - task_id: task-008
      agent_role: 'QA Agent'
      objective: 'Write the end-to-end spec of the toolbar for five surfaces, add it to the WebKit list and run it in the three browsers.'
      context:
        prd_excerpts:
          - 'REQ-1, REQ-2, REQ-6'
        tdd_excerpts:
          - 'DEC-8, CON-2, CON-4, ASM-5, RISK-4, RISK-5, IMP-7, IMP-10, Observability and Verification 5 and 6'
      likely_files:
        - 'src/test/e2e/diagram-toolbar.spec.js'
        - 'src/test/e2e/diagram-columns.spec.js'
        - 'src/test/e2e/fixtures.js'
        - 'playwright.config.js'
        - 'src/test/CLAUDE.md'
      acceptance_criteria:
        - 'The spec passes on Chromium, Firefox and WebKit, the two address specs have no removed line against ff3bacd, and no retry is added'
      verification:
        - 'JAVA_HOME=/home/tibo/.sdkman/candidates/java/25.0.4-tem ./mvnw package -Dmaven.test.skip -Dplugin.asciidoctor.skip=true exits 0, then npx playwright test src/test/e2e/diagram-toolbar.spec.js exits 0 on chromium, firefox and webkit'
        - 'npx playwright test src/test/e2e/diagram-address.spec.js src/test/e2e/address.spec.js src/test/e2e/diagram-columns.spec.js exits 0 in every project they run in'
        - 'git diff ff3bacd -- src/test/e2e/diagram-address.spec.js src/test/e2e/address.spec.js shows no removed line'
        - 'npx prettier --check src/test/e2e/diagram-toolbar.spec.js exits 0 and npm run lint exits 0'
      escalation_triggers:
        - 'A browser is not installed or WebKit lacks libraries'
        - 'The spec flakes'
      suggested_subagent_type: 'general-purpose'
      suggested_model: '(default)'
      suggested_effort: 'high'
    - task_id: task-009
      agent_role: 'Documentation Agent'
      objective: 'Describe the toolbar in the manual and in the note of the presentation layer, and remove the pair Everything | Changes only from the text.'
      context:
        prd_excerpts:
          - 'REQ-7'
        tdd_excerpts:
          - 'IMP-8, IMP-10, CON-9'
      likely_files:
        - 'src/doc/README.adoc'
        - 'src/main/editor/presentation/CLAUDE.md'
      acceptance_criteria:
        - 'Every anchor of ff3bacd is still defined and the skeleton and voice tests pass'
      verification:
        - 'node --test src/test/javascript/manual-skeleton.test.js src/test/javascript/manual-voice.test.js exits 0 and every id of anchors-ff3bacd.txt is still defined in src/doc/README.adoc'
        - 'grep -n "Everything | Changes only" src/doc/README.adoc prints nothing'
        - 'grep -n "toolbar-controls.json" src/main/editor/presentation/CLAUDE.md prints the new paragraph'
        - 'npm run format:check exits 0'
      escalation_triggers:
        - 'The voice test bans a word the sentence needs'
      suggested_subagent_type: 'general-purpose'
      suggested_model: '(default)'
      suggested_effort: 'low'
    - task_id: task-010
      agent_role: 'QA Agent'
      objective: 'Run every check of the Observability and Verification section, look at the toolbar at 1280 and 360 pixels, and record the results.'
      context:
        prd_excerpts:
          - 'REQ-6, REQ-7, REQ-8'
        tdd_excerpts:
          - 'Observability and Verification 1 to 10, CON-1, CON-5, CON-7, RISK-1'
      likely_files:
        - 'docs/wav/wav-030-pages-ci-and-toolbar/run/run-0217-toolbar-structure/prg-0217-toolbar-structure.md'
      acceptance_criteria:
        - 'Each check has a result in the Findings, and a project or a look not run is named as not run'
      verification:
        - 'npm run editor:build run twice: git status --short is the same after the second run, and npm run editor:check exits 0'
        - 'npm run test:unit, npm run test:coverage, npm run format:check and npm run lint exit 0, and grep -rc data-lit src/main/editor prints 0 for every file'
        - 'JAVA_HOME=/home/tibo/.sdkman/candidates/java/25.0.4-tem ./mvnw test -Dtest=ManualExamplesTest exits 0'
        - 'JAVA_HOME=/home/tibo/.sdkman/candidates/java/25.0.4-tem scripts/byte-identity.sh exits 0 with no new declared difference'
        - 'npx playwright test exits 0 on the three projects, or the projects not run are named'
        - 'git diff --stat against the baseline shows only the files of the TDD (Scope), the three new test files, the run folder and standalone.html'
      escalation_triggers:
        - 'A check fails for a file this run did not touch'
        - 'byte-identity.sh needs a declared exception'
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
        - 'grep over the amended TDD'
      success_criteria:
        - 'The id of Changes only, the two missing tests, the five lines of data-lit and the nested group are visible in the text'
    - task_id: task-002
      methods:
        - 'file counts and head of each saved file'
      success_criteria:
        - 'Seven files, five data-lit lines, diagram-page.js under 1,600 lines, the unit result of the working copy saved'
    - task_id: task-003
      methods:
        - 'node test run (red by design)'
        - 'format check'
      success_criteria:
        - 'The test fails with assertion messages for the missing toolbar and Prettier accepts both files'
    - task_id: task-004
      methods:
        - 'editor build and check'
        - 'node test, markup checks'
      success_criteria:
        - 'Checks a, b, c, e, g and h pass, the header has no Facet and the file is under 1,600 lines'
    - task_id: task-005
      methods:
        - 'editor build and check'
        - 'node test, full file'
        - 'grep'
      success_criteria:
        - 'toolbar.test.js is green in full, the focus stays after a press of Changes only, and data-lit remains only in style.css'
    - task_id: task-006
      methods:
        - 'grep'
        - 'node test of the theme audit'
        - 'format check'
      success_criteria:
        - 'data-lit is gone from src/main/editor and the audit passes'
    - task_id: task-007
      methods:
        - 'unit tests'
        - 'coverage floor'
      success_criteria:
        - 'npm run test:unit and npm run test:coverage exit 0, no test deleted'
    - task_id: task-008
      methods:
        - 'end-to-end tests in three browsers'
        - 'git diff on the address specs'
        - 'lint and format check'
      success_criteria:
        - 'The spec passes on Chromium, Firefox and WebKit and the address specs have no removed line'
    - task_id: task-009
      methods:
        - 'node tests of the manual'
        - 'grep'
      success_criteria:
        - 'Skeleton and voice tests pass, no old pair in the manual, the note is present'
    - task_id: task-010
      methods:
        - 'the full list of checks of the TDD'
        - 'a look in the browser pane'
      success_criteria:
        - 'Every check passes or is named as not run, and the heights at 1280 and 360 pixels are recorded or marked not checked'
```

## 11. Escalation Rules

```yaml
escalation_rules:
  rules:
    - condition: 'diagram-page.js would pass 1,600 lines'
      action: 'Stop task-004, record the measure, leave the refactor move commit to the main agent, and do not cut the file in the same change.'
    - condition: 'A change would touch src/main/java, pom.xml, a workflow or a script'
      action: 'Stop that change and record it as out of scope (REQ-9, CON-7).'
    - condition: 'An address spec would need a different data attribute of set-changes-only'
      action: 'Keep the attribute as DEC-5 says and change the markup, never the spec (CON-2).'
    - condition: 'A scale or a zoom label of a test moves'
      action: 'Update the expectation with the reason in a comment and name it in the record, never loosen a tolerance (RISK-2).'
    - condition: 'A title names a key that handleDiagramKeydown does not handle'
      action: 'Change the title, not the handler, and log it.'
    - condition: 'A test fails for a file or a reason that this run did not cause'
      action: 'List it in the record and leave it; do not fix another run work here.'
    - condition: 'The WebKit spec flakes or a browser is not installed'
      action: 'Make the spec stable or reduce it, never retry; record a project not run as not run.'
    - condition: 'The browser pane is unavailable'
      action: 'Record the look at each width as not checked; do not claim it.'
    - condition: 'The run operates under the autonomy override of complete-run and a task is flagged review_after or human_review after'
      action: 'Execute without a stop, log the review in the prg, and report it when the run ends.'
```

## 12. Final Execution Manifest

```yaml
execution_manifest:
  status: 'done'
  recommendation: 'proceed_with_review'
  autonomy_level: 'medium'
  total_tasks: 10
  autonomous_tasks: 6
  review_before_tasks: 0
  review_after_tasks: 4
  human_required_tasks: 0
  blocked_tasks: 0
  critical_path_tasks:
    - task-001
    - task-002
    - task-003
    - task-004
    - task-005
    - task-006
    - task-007
    - task-008
    - task-010
  parallel_groups:
    - parallel-group-001
  required_human_gates:
    - gate-001
  highest_risk_tasks:
    - task-004
    - task-005
    - task-008
  lowest_confidence_tasks:
    - task-008
    - task-004
    - task-006
  next_action: 'Run task-001: amend the TDD with the Stage 5 findings, then task-002 saves the baseline and task-003 writes toolbar.test.js red.'
  criteria:
    - 'A docked toolbar of five groups on every surface, proved by a node test per surface and an end-to-end spec in three browsers'
    - 'One Changes only toggle, aria-pressed for every toggle, no data-lit in src/main/editor, titles that say what happens'
    - 'The unit tests, coverage, editor check, format, lint, manual tests and byte identity pass, and the address specs have no removed line'
```
