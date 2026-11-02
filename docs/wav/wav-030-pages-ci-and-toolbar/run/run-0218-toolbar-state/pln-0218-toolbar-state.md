---
title: Execution Plan — The diagram toolbar, state
status: pending
date: 2026-11-01
related:
  - docs/wav/wav-030-pages-ci-and-toolbar/run/run-0218-toolbar-state/tdd-0218-toolbar-state.md
  - docs/wav/wav-030-pages-ci-and-toolbar/wav-030-pages-ci-and-toolbar.md
  - docs/wav/wav-030-pages-ci-and-toolbar/run/run-0217-toolbar-structure/pln-0217-toolbar-structure.md
  - docs/wav/wav-027-editor-layout-and-walk/rfc/rfc-002-diagram-toolbar.md
  - src/main/editor/presentation/diagram-page.js
  - src/main/editor/application/view-recipe.js
  - https://github.com/tmorin/archicode/issues/194
type: pln
run: 0218
wave: 030
---

# Execution Plan: The diagram toolbar, state

Profile TDD+pln: there is no PRD, so REQ-1 to REQ-9 are the IDs the TDD labels (section "PRD Traceability"), taken from the W-8 row and the last three criteria of gate P3 of the wave manifest, decision Q1, RFC-002 and issue #194. The plan follows the TDD plus the Stage 5 review findings F-1 to F-10 of the run (progress log), which the TDD body does not yet hold: task-001 applies them first. Q-1 and Q-2 of the TDD were settled in Stage 6, so no question is open.

The order is test first. task-001 amends the TDD, task-002 saves a baseline, task-003 makes the move of the renderers (its own change, the page stays byte for byte), task-004 writes the table and the node tests red, task-005 adds the origin and the shared key setter and rebuilds applySavedView around it (the pure tests go green and every existing story and library test must stay green), task-006 builds the markup (dot, count, Reset, legend), task-007 wires Reset, the panel and Escape, task-008 adds the three controls to the page of a saved view (toolbar.test.js is green whole), task-009 writes the styles, task-010 repairs the old tests and meets the coverage floor, task-011 writes the end-to-end spec, task-012 the manual and the note, task-013 proves the whole.

Tasks 011 and 012 are the one parallel group: they edit disjoint files (task-011 the e2e spec, `playwright.config.js` and `src/test/CLAUDE.md`; task-012 `src/doc/README.adoc` and `src/main/editor/presentation/CLAUDE.md`) and neither rebuilds the page nor runs Maven for the other (task-011 builds the jar, task-012 runs no Maven). Every other pair shares `standalone.html` (rebuilt by each) or reads what the one before wrote, so they are sequential.

Stage 9 repository findings, applied below. (1) `toolbar.test.js` already holds eight checks of run 0217 named `check a:` to `check h:` and one more named `check i (F1):`; the new checks of this run are named `check i:` to `check o:` (with the colon) and every name pattern below carries the colon, so the old test is never taken for the new one. (2) The helper `groupsOf` of that file reads every button of a group, so the group button of the new head would be a control of each group and break checks b, d and f: task-004 makes it read `span.tool-group-controls` only, rewrites check h to the rule of DEC-7 (the Facet is in Draw on every surface, the page of a saved view included) and adds the new table rows, so checks b and h are red on the three library surfaces until task-008. (3) The group button and *Reset* are checked by check f (a title that is not the label): CTR-1 gets that title in task-001. (4) The assembly of the page is a plain concatenation of the parts (`scripts/build-editor.mjs`), and the toolbar renderers are in the middle of `diagram-page.js` (the canvas function before them, `diagramFoldTargets` after), so only a move of the whole prefix of the file, immediately before it in `layers.json`, leaves the page byte for byte: task-003 and DEC-9 say so.

Red tests are turned green by a named later task and no task before it asks for the whole file to pass: toolbar-origin.test.js by task-005, checks (i) and (j) by task-006, checks (k), (l), (m) and (o) by task-007, check (n) by task-008.

Baseline: the working tree holds uncommitted wave documents and run 0217's code. A check of the form "only these files changed" is read against the baseline of task-002 (saved in the scratchpad in `baseline-0218`). No task commits (the generated implement workflow never commits; the commits are the run's, made by the main agent after Stage 11, with the move of task-003 as its own commit `refactor: move the toolbar renderers to presentation/diagram-toolbar.js` per DEC-9 and `scripts/check-editor-moves.sh`).

JDK: every Maven command runs with `JAVA_HOME=/home/tibo/.sdkman/candidates/java/25.0.4-tem` (the shell `java` is 21). `npm run editor:build` runs before any `node --test`, `./mvnw` or `npm run test:e2e` run by hand (CON-5).

This run operates under the autonomy override of `complete-run`: no task stops for a human on its category alone, so a future reader of this plan understands why a task flagged `review_after` was executed without a stop. No task of this plan is `critical` or `human_required`, so the override changes nothing beyond the review of gate-001 (the look of the collapsed toolbar and the wording of the titles), which is logged in the prg when the run ends.
## 1. Executive Summary

```yaml
summary:
  status: 'pending'
  product_goal: 'A reader sees on the toolbar what a saved view keeps (a dot on Draw, Texts and Layout), undoes the changes to those three groups with one Reset, uses the toolbar on a 360 px window as one button per group with a count, and finds Fold all, Unfold all and Facet on the page of a saved view.'
  technical_approach: 'One origin snapshot recorded by applySavedView and one key setter shared with Reset; the group markup gains a head, a dot and a count read from its own markup, and CSS decides label or button under 40 rem; the page of a saved view gets three controls that edit the view; one table, toolbar-controls.json, drives a node test per surface and an e2e spec runs in three browsers.'
  total_tasks: 13
  parallel_groups: 1
  high_risk_tasks: 0
  human_review_gates: 1
  autonomy_level: 'medium'
  recommendation: 'proceed_with_review'
  criteria:
    - 'toolbar.test.js checks (i) to (o) and toolbar-origin.test.js pass, with checks a: to g: of run 0217, the test check i (F1): and, once task-008 is done, checks b: and h: (rewritten for the new table and DEC-7) passing, on every surface of toolbar-controls.json (REQ-1, REQ-3, REQ-4, REQ-5)'
    - 'Reset is aria-disabled while the diagram equals its origin, restores Draw, Texts and Layout only, is absent on the page of a saved view, and the origin is session state written nowhere (REQ-1, REQ-2)'
    - 'The dot is on exactly Draw, Texts and Layout with the accessible name Saved with the view, and under 40 rem each group is a button whose name includes its count; at 360 by 740 the toolbar is at most 148 px high or the miss is recorded as a finding (REQ-3, REQ-4)'
    - 'The page of a saved Map view has Fold all, Unfold all and Facet and a saved element view has Facet, each pressing edits the view and not the session (REQ-5)'
    - 'npm run test:unit, npm run test:coverage, npm run editor:check, npm run format:check and npm run lint exit 0, grep -rc data-lit src/main/editor prints 0 for every file, and npm run editor:build run twice leaves git status --short as it was after the first (REQ-6, REQ-7)'
    - 'npx playwright test exits 0 on Chromium, Firefox and WebKit, and git diff ff3bacd on diagram-address.spec.js and address.spec.js shows no removed line (REQ-6, CON-2)'
    - 'JAVA_HOME of JDK 25 scripts/byte-identity.sh exits 0 with no new declared difference, ManualExamplesTest, ArchitectureDriftTest and the two manual node tests exit 0, and the manual describes the toolbar in [[editor-layout]] and [[editor-small-screen]] with every earlier anchor still defined (REQ-7, REQ-8, REQ-9)'
```

## 2. PRD/TDD Consistency Assessment

```yaml
consistency_assessment:
  aligned_items:
    - 'Scope, REQ-1 to REQ-9, DEC-1 to DEC-9, CTR-1 to CTR-5 and IMP-1 to IMP-9 agree with the W-8 row and the last three criteria of gate P3 of the manifest, decision Q1 and RFC-002 DEC-2, DEC-4 and DEC-5; every task below traces to them'
    - 'Q-1 (the dot''s note is its title plus an aria-hidden legend on 40 rem or more) and Q-2 (a click outside does not close the panel) are settled by Stage 6, so no task waits on a question'
    - 'No command, option, message, file format, address key or exit code changes; nothing under src/main/java, pom.xml, workflows or scripts is touched except the coverage floor going up, and the address contract of run 0203 holds (CON-2, CON-7)'
  gaps:
    - id: gap-001
      type: 'contradiction'
      description: 'Stage 5 F-1 and F-2 (S2): DEC-7 says the confirmation of Unfold all on a view''s page is the Map''s, but mapBoxesIfOpened reads the session, not the view''s sets; and DEC-6 and RISK-1 disagree on what Compare is under 40 rem and on the count of items.'
      impact: 'medium'
      recommendation: 'task-001 states that the function takes the view''s opened and hidden sets, says Compare keeps its one control inline with no group button under 40 rem, and corrects the count; task-008 and task-009 follow the amended text.'
    - id: gap-002
      type: 'ambiguity'
      description: 'Stage 5 F-3, F-4, F-5, F-6 (S2): the saved groups are stated three times, the rule for clearing the origin and the panel flag has three mechanisms, setViewOpened is named as if it existed, and applyToolbarKeys has no signature.'
      impact: 'medium'
      recommendation: 'task-001 keeps key as the one fact with SAVED_GROUPS asserted equal to it, states one rule for clearing (the lazy comparison on read plus folder-session.js), lists setViewOpened as new and gives applyToolbarKeys the layer parameter; tasks 004 and 005 are written from the amended TDD.'
    - id: gap-003
      type: 'ambiguity'
      description: 'Stage 5 F-7 to F-10 (S1): the dot''s place under 40 rem, the origin having no viewpoint, three Escape branches in handleDiagramKeydown, and the repeated list of checks in DEC-8.'
      impact: 'low'
      recommendation: 'task-001 applies each as the prg words it; task-007 puts the panel branch before all three Escape branches.'
    - id: gap-004
      type: 'risk'
      description: 'The look of the collapsed toolbar in light and dark, the panel over rows drawn by ELK and Firefox and WebKit by eye cannot be proved by a node test or a structural e2e spec (TDD, Not proved by these checks).'
      impact: 'low'
      recommendation: 'task-009 and task-013 measure and look in the browser pane when it is available and record the heights as a finding; gate-001 is the author review; if the pane is unavailable the record says not checked.'
    - id: gap-005
      type: 'repository_mismatch'
      description: 'Tests that count [role=group] or slice the markup at tool-group-name (header.test.js, library-view-diagram.test.js, library-view-panels.test.js) are named by the TDD, but the full list is known only by grep, and the group head adds elements to every group.'
      impact: 'medium'
      recommendation: 'task-002 saves grep -rln tool-group src/test; task-010 repairs every file on that list without loosening an assertion and lists the files it edited.'
    - id: gap-006
      type: 'risk'
      description: 'The move of task-003 must be its own commit (DEC-9, check-editor-moves.sh), but the generated implement workflow never commits.'
      impact: 'low'
      recommendation: 'task-003 proves the move by cmp against the page copy of task-002 (byte for byte, as check-editor-moves.sh does); the commit is a human step outside the plan, made by the main agent before the later commits.'
    - id: gap-007
      type: 'repository_mismatch'
      description: 'Stage 9: toolbar.test.js already has a test named check i (F1), check h asserts that the page of a saved view has no Facet (the reverse of DEC-7), and groupsOf counts the group button of the new head as a control of every group; the plan said checks (a) to (h) keep passing and used the pattern check i|check j.'
      impact: 'medium'
      recommendation: 'task-001 adds the title of the group button to CTR-1 and the names of the old and new checks to DEC-8; task-004 changes groupsOf, rewrites check h and names the new tests check i: to check o:; the patterns of tasks 006 and 007 carry the colon and name the checks that stay red on the library surfaces.'
    - id: gap-008
      type: 'repository_mismatch'
      description: 'Stage 9: DEC-9 moves about 190 lines from the middle of diagram-page.js to a part placed before it, but the page is assembled by concatenation, so the page would not be byte for byte the page of before (renderDiagramCanvasHtml, lines 8 to 41, would come after the moved block).'
      impact: 'medium'
      recommendation: 'task-001 amends DEC-9 and IMP-1: the moved block is the whole prefix of diagram-page.js up to the doc comment of diagramFoldTargets (renderDiagramCanvasHtml, the toolbar renderers and renderDiagramDownloadHtml, about 225 lines), and the new part is listed immediately before diagram-page.js; task-003 does it and proves it by cmp.'
    - id: gap-009
      type: 'contradiction'
      description: 'Stage 9: task-002 asks for data-lit.txt to be the output of grep -rn data-lit src/main/editor and for no saved file to be empty, but the tree holds no data-lit (the grep prints nothing).'
      impact: 'low'
      recommendation: 'task-002 saves grep -rc data-lit src/main/editor (one count per file), which is never empty, and checks that every count is 0.'
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
          - 'tdd-0218-toolbar-state.md with F-1 to F-10 applied (F-11 needs no action)'
          - 'The Findings of prg-0218-toolbar-state.md with one line per finding marked applied'
      agent_role: 'Architecture Agent'
      autonomy: 'autonomous'
      risk: 'low'
      confidence: 85
    - id: task-002
      status: 'done'
      title: 'Save the baseline: tree state, page copy, counts, editor size map'
      depends_on: [task-001]
      produces:
          - 'Scratchpad directory baseline-0218 with status.txt, diffstat.txt, data-lit.txt, tool-group-tests.txt, map.txt, unit-before.txt, standalone-before.html and address-specs-diff.txt'
      agent_role: 'QA Agent'
      autonomy: 'autonomous'
      risk: 'low'
      confidence: 85
    - id: task-003
      status: 'done'
      title: 'Move the toolbar renderers to presentation/diagram-toolbar.js'
      depends_on: [task-002]
      produces:
          - 'src/main/editor/presentation/diagram-toolbar.js holding the whole prefix of diagram-page.js (canvas function, toolbar renderers, download buttons; about 225 lines), moved without a change of text'
          - 'layers.json with the new part immediately before diagram-page.js, names.json regenerated if the check asks for it, standalone.html rebuilt and identical to the baseline copy'
      agent_role: 'Refactoring Agent'
      autonomy: 'autonomous'
      risk: 'low'
      confidence: 80
    - id: task-004
      status: 'done'
      title: 'Write the table, toolbar.test.js checks (i) to (o) and toolbar-origin.test.js, red'
      depends_on: [task-003]
      produces:
          - 'src/test/javascript/viewpoint-kernel/toolbar-controls.json with key per control, actions per surface, absent with why, the three controls of DEC-7 on the library surfaces'
          - 'src/test/javascript/viewpoint-kernel/toolbar.test.js with checks (i) to (o), each test name starting check i: to check o: (the old test check i (F1): keeps its name), the helper groupsOf reading span.tool-group-controls only, check b reading the table with keys and naming the one exception of DEC-1, check h rewritten to DEC-7 (the Facet in Draw on every surface, once per page)'
          - 'src/test/javascript/viewpoint-kernel/toolbar-origin.test.js for diagramDiffersFromOrigin and applyToolbarKeys'
      agent_role: 'Test Generation Agent'
      autonomy: 'autonomous'
      risk: 'medium'
      confidence: 70
    - id: task-005
      status: 'done'
      title: 'Add the origin, applyToolbarKeys and diagramDiffersFromOrigin; rebuild applySavedView around them'
      depends_on: [task-004]
      produces:
          - 'application/view-recipe.js with diagramOrigin recorded by applySavedView, applyToolbarKeys(properties, layer), diagramDiffersFromOrigin() and currentDiagramOrigin() with the lazy comparison'
          - 'model/ui-state.js with the session variable, application/folder-session.js clearing it'
          - 'toolbar-origin.test.js green'
      agent_role: 'Frontend Implementation Agent'
      autonomy: 'review_after'
      risk: 'medium'
      confidence: 75
    - id: task-006
      status: 'done'
      title: 'Build the group header, the dot, the group button with its count, Reset and the legend'
      depends_on: [task-005]
      produces:
          - 'presentation/diagram-toolbar.js with the head, SAVED_GROUPS, countOnControls, renderResetHtml and the legend span'
          - 'data-on on the Facet and Columns selects (diagram-controls.js, diagram-toolbar.js)'
          - 'Checks (i) and (j) of toolbar.test.js green'
      agent_role: 'Frontend Implementation Agent'
      autonomy: 'autonomous'
      risk: 'medium'
      confidence: 70
    - id: task-007
      status: 'done'
      title: 'Wire Reset, the group panel, Escape and the live Frame label'
      depends_on: [task-006]
      produces:
          - 'composition/events.js with the actions diagram-reset and toggle-tool-group, toolPanelOpen in the session state, the Escape branch before the three existing ones, the live zoom in Frame''s button'
          - 'Checks (k), (l), (m) and (o) of toolbar.test.js green'
      agent_role: 'Frontend Implementation Agent'
      autonomy: 'autonomous'
      risk: 'medium'
      confidence: 70
    - id: task-008
      status: 'done'
      title: 'Add Fold all, Unfold all and Facet to the page of a saved view'
      depends_on: [task-007]
      produces:
          - 'presentation/view-edit.js with setViewOpened (new)'
          - 'presentation/stories-pages.js and viewDiagramRecipe with the facet name and canFold in host'
          - 'library branches of fold-all, unfold-all and the facet change (events.js, element-form.js)'
          - 'Check (n) of toolbar.test.js green, so toolbar.test.js passes whole'
      agent_role: 'Frontend Implementation Agent'
      autonomy: 'autonomous'
      risk: 'medium'
      confidence: 70
    - id: task-009
      status: 'done'
      title: 'Write the styles: dot, head, group button and panel, muted Reset, legend'
      depends_on: [task-008]
      produces:
          - 'style.css with the dot, the head, the group button, the panel under 40 rem, the aria-disabled Reset, the Reset dot and the legend, with light and dark tokens only'
          - 'css-theme-audit.test.js naming the new classes'
          - 'The toolbar height at 360 by 740 recorded in the Findings of the prg'
      agent_role: 'Frontend Implementation Agent'
      autonomy: 'review_after'
      risk: 'medium'
      confidence: 65
    - id: task-010
      status: 'done'
      title: 'Repair the tests that assert the old markup and meet the coverage floor'
      depends_on: [task-009]
      produces:
          - 'header.test.js, library-view-diagram.test.js, library-view-panels.test.js and any other test found by grep -rn tool-group src/test repaired to the new markup'
          - 'scripts/editor-coverage-floor.json raised only if the coverage grew'
          - 'npm run test:unit and npm run test:coverage green'
      agent_role: 'Test Generation Agent'
      autonomy: 'autonomous'
      risk: 'medium'
      confidence: 70
    - id: task-011
      status: 'done'
      title: 'Extend the end-to-end spec: Reset, dot, count, panel, 360 px bar, Unfold all on a view'
      depends_on: [task-010]
      produces:
          - 'src/test/e2e/diagram-toolbar.spec.js with the tests of Observability and Verification 5'
          - 'playwright.config.js unchanged unless the spec needs an entry'
          - 'src/test/CLAUDE.md with the toolbar tests paragraph'
      agent_role: 'QA Agent'
      autonomy: 'review_after'
      risk: 'medium'
      confidence: 60
    - id: task-012
      status: 'done'
      title: 'Write the manual and the note of the presentation layer'
      depends_on: [task-010]
      produces:
          - 'src/doc/README.adoc with the sections [[editor-layout]] (the dot, Reset, the rule of DEC-7 and its table of absent controls) and [[editor-small-screen]] (the group buttons, the count, the panel, Escape, the measure at 360 px updated)'
          - 'src/main/editor/presentation/CLAUDE.md with the origin, Reset and the panel, with no run id'
      agent_role: 'Documentation Agent'
      autonomy: 'autonomous'
      risk: 'low'
      confidence: 80
    - id: task-013
      status: 'pending'
      title: 'Prove the whole run'
      depends_on: [task-011, task-012]
      produces:
          - 'The record in the Findings of prg-0218-toolbar-state.md: each check of Observability and Verification with its result, the heights of the toolbar, and what was not proved'
      agent_role: 'QA Agent'
      autonomy: 'review_after'
      risk: 'medium'
      confidence: 70
```

The graph's edges are the `depends_on` of each node. Dependencies are genuine: the tests come before the code they check (004 before 005 to 008), 005 comes before the markup that reads the origin (006), 007 and 008 both edit `composition/events.js` and so are sequential, the styles (009) need the markup, the repair of old tests (010) needs the final markup, and the e2e spec and the manual (011, 012) need the final page.

## 4. Task Catalog

```yaml
task_catalog:
  tasks:
    - id: task-001
      title: 'Amend the TDD with the Stage 5 findings'
      source_requirements:
        prd:
          - 'REQ-1'
          - 'REQ-2'
          - 'REQ-4'
          - 'REQ-5'
        tdd:
          - 'DEC-3'
          - 'DEC-4'
          - 'DEC-5'
          - 'DEC-6'
          - 'DEC-7'
          - 'DEC-8'
          - 'CTR-3'
          - 'CTR-4'
          - 'IMP-4'
          - 'RISK-1'
      outputs:
        - 'tdd-0218-toolbar-state.md with F-1 to F-10 applied (F-11 needs no action)'
        - 'The Findings of prg-0218-toolbar-state.md with one line per finding marked applied'
      verification:
        - 'grep -n "mapBoxesIfOpened" tdd-0218-toolbar-state.md shows the parameter rule in DEC-7 or IMP-4'
        - 'grep -c "groupOrder.saved" tdd-0218-toolbar-state.md prints 0'
        - 'grep -n "setViewOpened" tdd-0218-toolbar-state.md shows it listed as new in IMP-4'
        - 'grep -n "applyToolbarKeys(" tdd-0218-toolbar-state.md shows a signature with the layer'
        - 'grep -n "presentation/shell.js" tdd-0218-toolbar-state.md shows the folder in IMP-4'
        - 'sed -n 1,10p of the TDD still shows run: 0218 and wave: 030 in the frontmatter'
        - 'grep -n "tool-group-button" tdd-0218-toolbar-state.md shows a title in CTR-1 that is not the button''s label (check f of toolbar.test.js asks it)'
        - 'grep -n "check i (F1)" tdd-0218-toolbar-state.md shows DEC-8 naming the old test and the new checks as check i: to check o:'
        - 'grep -n "prefix" tdd-0218-toolbar-state.md shows DEC-9 and IMP-1 moving the whole prefix of diagram-page.js, canvas function included, with the new part listed immediately before diagram-page.js'
      risk: 'low'
      confidence: 85
      human_review: 'none'
      escalation_triggers:
        - 'A fix contradicts a section of the TDD that the review did not name'
      delegation_tier: 'standard'
      results: 'tier standard, model sonnet, effort medium, profile low-cost, passed first time, inline (leaf), independently verified'
    - id: task-002
      title: 'Save the baseline: tree state, page copy, counts, editor size map'
      source_requirements:
        prd:
          - 'REQ-6'
          - 'REQ-7'
        tdd:
          - 'ASM-1'
          - 'ASM-4'
          - 'CON-2'
          - 'CON-3'
          - 'IMP-7'
      outputs:
        - 'Scratchpad directory baseline-0218 with status.txt, diffstat.txt, data-lit.txt, tool-group-tests.txt, map.txt, unit-before.txt, standalone-before.html and address-specs-diff.txt'
      verification:
        - 'ls baseline-0218 lists the eight files and none is empty'
        - 'grep -c tool-group src/main/editor/presentation/diagram-page.js prints a number that is not 0 (ASM-1)'
        - 'data-lit.txt is the output of grep -rc data-lit src/main/editor (one count per file, so it is never empty) and every count is 0'
        - 'map.txt shows diagram-page.js with its line count, under 1,600'
        - 'cmp src/main/resources/editor-webapp/standalone.html baseline-0218/standalone-before.html exits 0'
        - 'address-specs-diff.txt is git diff ff3bacd on diagram-address.spec.js and address.spec.js and grep -c ''^-[^-]'' on it prints 0'
        - 'unit-before.txt ends with a line that shows npm run test:unit passing on the working copy, or names the failing files so a later failure is not charged to this run'
      risk: 'low'
      confidence: 85
      human_review: 'none'
      escalation_triggers:
        - 'The unit suite is red before any edit of this run'
        - 'npm run editor:build changes git status --short'
        - 'ASM-1 does not hold (run 0217 is not in the working copy)'
      delegation_tier: 'cheap'
      results: 'tier cheap, model haiku, effort high, profile low-cost, passed first time, inline (leaf), independently verified'
    - id: task-003
      title: 'Move the toolbar renderers to presentation/diagram-toolbar.js'
      source_requirements:
        prd:
          - 'REQ-7'
        tdd:
          - 'DEC-9'
          - 'IMP-1'
          - 'CON-1'
          - 'CON-6'
          - 'ASM-4'
          - 'RISK-7'
      outputs:
        - 'src/main/editor/presentation/diagram-toolbar.js holding the whole prefix of diagram-page.js (the section comment, renderDiagramCanvasHtml, renderToolGroupHtml, renderDiagramToolbarHtml, the group renderers and renderDiagramDownloadHtml, lines 1 to the blank line before the doc comment of diagramFoldTargets, about 225 lines), moved without a change of text'
        - 'layers.json with the new part immediately before diagram-page.js, names.json regenerated if the check asks for it, standalone.html rebuilt and identical to the baseline copy'
      verification:
        - 'npm run editor:build exits 0 and cmp src/main/resources/editor-webapp/standalone.html baseline-0218/standalone-before.html exits 0 (the parts are assembled verbatim, so a pure move leaves the page byte for byte)'
        - 'npm run editor:check exits 0 (run node scripts/check-editor.mjs --write-names first only if it says a top-level name moved, and then the names file is the only other change)'
        - 'wc -l src/main/editor/presentation/diagram-page.js prints fewer lines than the 1,349 of the baseline map.txt, and cat diagram-toolbar.js diagram-page.js equals the baseline copy of diagram-page.js (cmp)'
        - 'grep -c ''diagram-toolbar.js'' src/main/editor/layers.json prints 1 and its line comes before the one of diagram-page.js'
        - 'npm run test:unit exits 0'
      risk: 'low'
      confidence: 80
      human_review: 'none'
      escalation_triggers:
        - 'The page differs from the baseline copy after a pure move (a name was changed or a declaration reordered): undo the change in the text, never accept a different page'
        - 'A moved function reads a top-level name that stays in diagram-page.js and the part order would break: stop and record it'
      delegation_tier: 'standard'
      results: 'tier standard, model sonnet, effort medium, profile low-cost, passed first time, inline (leaf), independently verified'
    - id: task-004
      title: 'Write the table, toolbar.test.js checks (i) to (o) and toolbar-origin.test.js, red'
      source_requirements:
        prd:
          - 'REQ-1'
          - 'REQ-3'
          - 'REQ-4'
          - 'REQ-5'
          - 'REQ-6'
        tdd:
          - 'DEC-8'
          - 'DEC-4'
          - 'DEC-1'
          - 'CTR-4'
          - 'TG-1'
          - 'TG-5'
          - 'Observability and Verification 3'
      outputs:
        - 'src/test/javascript/viewpoint-kernel/toolbar-controls.json with key per control, actions per surface, absent with why, the three controls of DEC-7 on the library surfaces'
        - 'src/test/javascript/viewpoint-kernel/toolbar.test.js with checks (i) to (o), each test name starting check i: to check o: (the old test check i (F1): keeps its name), the helper groupsOf reading span.tool-group-controls only, check b reading the table with keys and naming the one exception of DEC-1, check h rewritten to DEC-7 (the Facet in Draw on every surface, once per page)'
        - 'src/test/javascript/viewpoint-kernel/toolbar-origin.test.js for diagramDiffersFromOrigin and applyToolbarKeys'
      verification:
        - 'node --test src/test/javascript/viewpoint-kernel/toolbar.test.js runs after npm run editor:build; check a:, c:, d:, e:, f:, g: and check i (F1): pass; check b: and check h: fail only on the three library surfaces with a message that names Fold all, Unfold all or the Facet; checks i: to o: fail with assertion messages that name the missing dot, count, Reset, origin or control (red by design); there is no syntax error and no missing import'
        - 'node --test src/test/javascript/viewpoint-kernel/toolbar-origin.test.js fails because the functions do not exist yet, with a message that names them'
        - 'node -e "JSON.parse(require(''fs'').readFileSync(''src/test/javascript/viewpoint-kernel/toolbar-controls.json'',''utf8''))" exits 0'
        - 'npx prettier --check on the three files exits 0'
        - 'task-005 turns toolbar-origin.test.js green, task-006 turns checks (i) and (j) green, task-007 checks (k), (l), (m) and (o), task-008 check (n); no earlier task asks for any of them to pass'
      risk: 'medium'
      confidence: 70
      human_review: 'none'
      escalation_triggers:
        - 'A check cannot be written without a decision the TDD does not hold: record it and write the test for the stated behaviour only'
      delegation_tier: 'standard'
      results: 'tier standard, model sonnet, effort medium, profile low-cost, passed first time, inline (leaf), independently verified'
    - id: task-005
      title: 'Add the origin, applyToolbarKeys and diagramDiffersFromOrigin; rebuild applySavedView around them'
      source_requirements:
        prd:
          - 'REQ-1'
          - 'REQ-2'
        tdd:
          - 'DEC-2'
          - 'DEC-3'
          - 'TG-1'
          - 'TG-2'
          - 'CTR-3'
          - 'IMP-2'
          - 'RISK-2'
          - 'RISK-3'
      outputs:
        - 'application/view-recipe.js with diagramOrigin recorded by applySavedView, applyToolbarKeys(properties, layer), diagramDiffersFromOrigin() and currentDiagramOrigin() with the lazy comparison'
        - 'model/ui-state.js with the session variable, application/folder-session.js clearing it'
        - 'toolbar-origin.test.js green'
      verification:
        - 'npm run editor:build exits 0'
        - 'node --test src/test/javascript/viewpoint-kernel/toolbar-origin.test.js exits 0'
        - 'node --test $(find src/test/javascript -name ''library-view-*.test.js'' -o -name ''story-*.test.js'') exits 0 (the existing view and story tests are the guard that applySavedView behaves as before)'
        - 'grep -rn ''localStorage\|indexedDB'' src/main/editor/application/view-recipe.js prints nothing that concerns the origin'
        - 'grep -rc ''data-lit'' src/main/editor prints 0 for every file'
        - 'npm run editor:check exits 0'
      risk: 'medium'
      confidence: 75
      human_review: 'after'
      escalation_triggers:
        - 'An existing story or library test fails after the refactor: fix the refactor, never the test'
        - 'The origin would have to be stored to work: stop, it is session state only (RFC-002 DEC-5)'
      delegation_tier: 'standard'
      results: 'tier standard, model sonnet, effort medium, profile low-cost, passed first time, inline (leaf), independently verified'
    - id: task-006
      title: 'Build the group header, the dot, the group button with its count, Reset and the legend'
      source_requirements:
        prd:
          - 'REQ-1'
          - 'REQ-3'
          - 'REQ-4'
        tdd:
          - 'DEC-1'
          - 'DEC-2'
          - 'DEC-4'
          - 'DEC-5'
          - 'CTR-1'
          - 'CTR-2'
          - 'IMP-3'
          - 'Q-1'
      outputs:
        - 'presentation/diagram-toolbar.js with the head, SAVED_GROUPS, countOnControls, renderResetHtml and the legend span'
        - 'data-on on the Facet and Columns selects (diagram-controls.js, diagram-toolbar.js)'
        - 'Checks (i) and (j) of toolbar.test.js green'
      verification:
        - 'npm run editor:build exits 0'
        - 'node --test --test-name-pattern ''check i:|check j:'' src/test/javascript/viewpoint-kernel/toolbar.test.js exits 0 on every surface of the table'
        - 'node --test --test-name-pattern ''check a:|check c:|check d:|check e:|check f:|check g:|check i \(F1\)'' src/test/javascript/viewpoint-kernel/toolbar.test.js exits 0 (the structure checks of run 0217 still pass, check f included: the group button and Reset have a title that is not their label; check b: passes except on the three library surfaces, which task-008 turns green; the old tests that assert the old markup are task-010''s)'
        - 'grep -rc ''data-lit'' src/main/editor prints 0 for every file'
        - 'node scripts/build-editor.mjs --map shows no part over 1,600 lines'
      risk: 'medium'
      confidence: 70
      human_review: 'none'
      escalation_triggers:
        - 'A part would pass 1,600 lines: stop and record it'
        - 'The count cannot be read from the markup for a control: record which and keep the TDD''s rule'
      delegation_tier: 'standard'
      results: 'tier standard, model sonnet, effort medium, profile low-cost, passed first time, inline (leaf), independently verified'
    - id: task-007
      title: 'Wire Reset, the group panel, Escape and the live Frame label'
      source_requirements:
        prd:
          - 'REQ-1'
          - 'REQ-4'
        tdd:
          - 'DEC-2'
          - 'DEC-5'
          - 'DEC-6'
          - 'IMP-4'
          - 'FLOW-1'
          - 'FLOW-2'
          - 'IF-1'
          - 'IF-2'
          - 'RISK-5'
          - 'Q-2'
      outputs:
        - 'composition/events.js with the actions diagram-reset and toggle-tool-group, toolPanelOpen in the session state, the Escape branch before the three existing ones, the live zoom in Frame''s button'
        - 'Checks (k), (l), (m) and (o) of toolbar.test.js green'
      verification:
        - 'npm run editor:build exits 0'
        - 'node --test src/test/javascript/viewpoint-kernel/toolbar.test.js exits 0 for every check but check n: and checks b: and h: on the three library surfaces, which task-008 turns green'
        - 'node --test $(find src/test/javascript -name ''diagram-*.test.js'' -o -name ''story-*.test.js'') exits 0 or the failing files are the ones task-010 names (old markup) and none is caused by a handler'
        - 'git diff ff3bacd -- src/test/e2e/diagram-address.spec.js src/test/e2e/address.spec.js | grep -c ''^-[^-]'' prints 0'
        - 'grep -rc ''data-lit'' src/main/editor prints 0 for every file'
      risk: 'medium'
      confidence: 70
      human_review: 'none'
      escalation_triggers:
        - 'Reset would need a new address key: stop, it writes only the keys the toolbar already writes (CON-2)'
        - 'The focus is lost after a press: fix headerControlSelector use, never add a focus jump'
      delegation_tier: 'standard'
      results: 'tier standard, model sonnet, effort medium, profile low-cost, passed first time, inline (leaf), independently verified'
    - id: task-008
      title: 'Add Fold all, Unfold all and Facet to the page of a saved view'
      source_requirements:
        prd:
          - 'REQ-5'
        tdd:
          - 'DEC-7'
          - 'CTR-5'
          - 'IMP-4'
          - 'IMP-6'
          - 'IF-4'
          - 'FLOW-3'
          - 'ASM-2'
      outputs:
        - 'presentation/view-edit.js with setViewOpened (new)'
        - 'presentation/stories-pages.js and viewDiagramRecipe with the facet name and canFold in host'
        - 'library branches of fold-all, unfold-all and the facet change (events.js, element-form.js)'
        - 'Check (n) of toolbar.test.js green, so toolbar.test.js passes whole'
      verification:
        - 'npm run editor:build exits 0'
        - 'node --test src/test/javascript/viewpoint-kernel/toolbar.test.js exits 0 (all checks (a) to (o))'
        - 'node --test $(find src/test/javascript -name ''library-view-*.test.js'') exits 0 or the failing files are the ones task-010 names (old markup)'
        - 'grep -rc ''data-lit'' src/main/editor prints 0 for every file'
        - 'npm run editor:check exits 0'
      risk: 'medium'
      confidence: 70
      human_review: 'none'
      escalation_triggers:
        - 'The scene is not available on the page of a view (ASM-2 fails): record it, make the control do nothing before the first drawing, and do not add a second source of expandable boxes'
      delegation_tier: 'standard'
      results: 'tier standard, model sonnet, effort medium, profile low-cost, passed after escalation to effort high, inline (leaf), independently verified'
    - id: task-009
      title: 'Write the styles: dot, head, group button and panel, muted Reset, legend'
      source_requirements:
        prd:
          - 'REQ-3'
          - 'REQ-4'
        tdd:
          - 'DEC-5'
          - 'DEC-6'
          - 'IMP-5'
          - 'RISK-1'
          - 'RISK-6'
          - 'RISK-8'
      outputs:
        - 'style.css with the dot, the head, the group button, the panel under 40 rem, the aria-disabled Reset, the Reset dot and the legend, with light and dark tokens only'
        - 'css-theme-audit.test.js naming the new classes'
        - 'The toolbar height at 360 by 740 recorded in the Findings of the prg'
      verification:
        - 'npm run editor:build exits 0'
        - 'node --test src/test/javascript/viewpoint-kernel/css-theme-audit.test.js exits 0'
        - 'node --test src/test/javascript/viewpoint-kernel/toolbar.test.js exits 0'
        - 'grep -n ''tool-group-button'' src/main/editor/style.css shows the rule inside @media (max-width: 40rem)'
        - 'npm run format:check exits 0 (style.css is not in its globs and was not formatted at the base commit ff3bacd: the check on that file alone is left out)'
      risk: 'medium'
      confidence: 65
      human_review: 'after'
      escalation_triggers:
        - 'The 148 px bar is missed at 360 by 740 after the padding shrinks: record the measure as a finding and do not raise the bar'
        - 'The browser pane is unavailable: record the look as not checked'
      delegation_tier: 'standard'
      results: 'tier standard, model sonnet, effort medium, profile low-cost, passed first time, inline (leaf), independently verified'
    - id: task-010
      title: 'Repair the tests that assert the old markup and meet the coverage floor'
      source_requirements:
        prd:
          - 'REQ-6'
          - 'REQ-7'
        tdd:
          - 'IMP-7'
          - 'CON-8'
          - 'DEC-8'
      outputs:
        - 'header.test.js, library-view-diagram.test.js, library-view-panels.test.js and any other test found by grep -rn tool-group src/test repaired to the new markup'
        - 'scripts/editor-coverage-floor.json raised only if the coverage grew'
        - 'npm run test:unit and npm run test:coverage green'
      verification:
        - 'npm run test:unit exits 0'
        - 'npm run test:coverage exits 0 (the floor is met)'
        - 'git diff scripts/editor-coverage-floor.json shows no lowered number'
        - 'npm run format:check exits 0 and npm run lint exits 0'
        - 'grep -rc ''data-lit'' src/main/editor prints 0 for every file'
      risk: 'medium'
      confidence: 70
      human_review: 'none'
      escalation_triggers:
        - 'A repair would need an assertion to be loosened: stop and name the test in the record'
        - 'Coverage is under the floor and the uncovered code is in a handler: add a node test, never lower the floor'
      delegation_tier: 'standard'
      results: 'tier standard, model sonnet, effort medium, profile low-cost, passed first time, inline (leaf), independently verified'
    - id: task-011
      title: 'Extend the end-to-end spec: Reset, dot, count, panel, 360 px bar, Unfold all on a view'
      source_requirements:
        prd:
          - 'REQ-1'
          - 'REQ-3'
          - 'REQ-4'
          - 'REQ-5'
          - 'REQ-6'
        tdd:
          - 'DEC-6'
          - 'DEC-8'
          - 'CON-2'
          - 'CON-4'
          - 'Observability and Verification 5'
          - 'ASM-3'
          - 'ASM-5'
          - 'RISK-8'
      outputs:
        - 'src/test/e2e/diagram-toolbar.spec.js with the tests of Observability and Verification 5'
        - 'playwright.config.js unchanged unless the spec needs an entry'
        - 'src/test/CLAUDE.md with the toolbar tests paragraph'
      verification:
        - 'JAVA_HOME=/home/tibo/.sdkman/candidates/java/25.0.4-tem ./mvnw package -Dmaven.test.skip -Dplugin.asciidoctor.skip=true exits 0 (the e2e suite runs the packaged jar; run it once before the spec)'
        - 'npx playwright test src/test/e2e/diagram-toolbar.spec.js exits 0 on every project that runs it, WebKit included; a project that cannot start is recorded as not run, never as passed'
        - 'git diff ff3bacd -- src/test/e2e/diagram-address.spec.js src/test/e2e/address.spec.js | grep -c ''^-[^-]'' prints 0'
        - 'npx prettier --check src/test/e2e/diagram-toolbar.spec.js exits 0 and npm run lint exits 0'
      risk: 'medium'
      confidence: 60
      human_review: 'after'
      escalation_triggers:
        - 'The WebKit spec flakes or a browser is not installed: stabilise or reduce the spec, never retry; record a project not run'
        - 'Reset or the panel behaves in a browser as the node tests said it could not: record a finding, fix the code, add the node test'
      delegation_tier: 'standard'
      results: 'tier standard, model sonnet, effort medium, profile low-cost, passed first time, inline (leaf), independently verified'
    - id: task-012
      title: 'Write the manual and the note of the presentation layer'
      source_requirements:
        prd:
          - 'REQ-8'
          - 'REQ-9'
        tdd:
          - 'IMP-8'
          - 'IMP-9'
          - 'DEC-7'
          - 'CON-9'
          - 'CI-arc-1'
      outputs:
        - 'src/doc/README.adoc with the sections [[editor-layout]] (the dot, Reset, the rule of DEC-7 and its table of absent controls) and [[editor-small-screen]] (the group buttons, the count, the panel, Escape, the measure at 360 px updated)'
        - 'src/main/editor/presentation/CLAUDE.md with the origin, Reset and the panel, with no run id'
      verification:
        - 'node --test src/test/javascript/manual-skeleton.test.js src/test/javascript/manual-voice.test.js exits 0'
        - 'for each id in git show ff3bacd:src/doc/README.adoc matching [[id]], grep -c ''[[id]]'' src/doc/README.adoc prints 1 or more (compare with the anchors saved by the check of task-013 if needed)'
        - 'grep -n ''editor-toolbar'' src/doc/README.adoc prints nothing'
        - 'npm run format:check exits 0'
        - 'No Maven command and no npm run editor:build is run by this task (it runs beside task-011)'
      risk: 'low'
      confidence: 80
      human_review: 'none'
      escalation_triggers:
        - 'A sentence of the manual needs a fact the TDD does not hold: leave it out and record it'
      delegation_tier: 'standard'
      results: 'tier standard, model sonnet, effort medium, profile low-cost, passed first time, inline (leaf), independently verified'
    - id: task-013
      title: 'Prove the whole run'
      source_requirements:
        prd:
          - 'REQ-6'
          - 'REQ-7'
          - 'REQ-8'
          - 'REQ-9'
        tdd:
          - 'Observability and Verification 1 to 9'
          - 'CON-1'
          - 'CON-2'
          - 'CON-7'
          - 'CI-arc-1'
      outputs:
        - 'The record in the Findings of prg-0218-toolbar-state.md: each check of Observability and Verification with its result, the heights of the toolbar, and what was not proved'
      verification:
        - 'npm run editor:build run twice leaves git status --short unchanged between the two, and npm run editor:check exits 0'
        - 'npm run test:unit, npm run test:coverage, npm run format:check and npm run lint exit 0 and grep -rc ''data-lit'' src/main/editor prints 0 for every file'
        - 'npx playwright test exits 0 on every project (Chromium, Firefox, WebKit) after the jar of task-011 is current'
        - 'git diff ff3bacd -- src/test/e2e/diagram-address.spec.js src/test/e2e/address.spec.js | grep -c ''^-[^-]'' prints 0'
        - 'JAVA_HOME=/home/tibo/.sdkman/candidates/java/25.0.4-tem scripts/byte-identity.sh exits 0 with no new line in scripts/byte-identity-exceptions.txt'
        - 'JAVA_HOME=/home/tibo/.sdkman/candidates/java/25.0.4-tem ./mvnw test -Dtest=ManualExamplesTest+ArchitectureDriftTest exits 0, and node --test src/test/javascript/manual-skeleton.test.js src/test/javascript/manual-voice.test.js exits 0'
        - 'JAVA_HOME=/home/tibo/.sdkman/candidates/java/25.0.4-tem ./mvnw verify exits 0 (the CI command, run once at the end)'
        - 'npm run sample:check exits 0'
      risk: 'medium'
      confidence: 70
      human_review: 'after'
      escalation_triggers:
        - 'A check fails for a reason this run did not cause: list it and leave it'
        - 'A browser or the pane is not available: record not run, never passed'
      delegation_tier: 'standard'
```

## 5. Parallelization Plan

```yaml
parallelization_plan:
  groups:
    - id: parallel-group-001
      tasks:
        - task-011
        - task-012
      reason: 'The end-to-end spec and the manual with its note touch disjoint files and read the final page that task-010 left'
      conflict_risks:
        - 'task-011 builds the jar with Maven and task-012 must not run Maven (ManualExamplesTest is task-013), or the two corrupt target/'
        - 'Neither task may run npm run editor:build; standalone.html is final after task-010 and a rebuild by one would change what the other reads'
        - 'task-011 edits src/test/CLAUDE.md and task-012 src/main/editor/presentation/CLAUDE.md; neither edits the other file'
```

Tasks 001 to 010 form a chain: 004 and 005 to 008 are a red then green sequence on `toolbar.test.js`, and every task from 003 to 010 rebuilds the generated page or edits a file the next one reads, so no pair can run together.

## 6. Human Review Gates

```yaml
human_review_gates:
  gates:
    - id: gate-001
      trigger: 'The run ends with a collapsed toolbar whose look at each width and in each theme is judged in a browser and not by a test, titles and a legend worded by the implementing agent, and the page of a saved view gaining three controls that edit the view.'
      required_before: []
      required_after: ['task-013']
      reviewer_focus:
        - 'Look at the toolbar at 1280 and at 360 by 740 in light and dark: the group buttons, the count, the dot, the panel over the drawing and the toolbar height against the 148 px bar (RISK-1, RISK-8)'
        - 'Read the title of Reset and of each dot once: does each say what is restored or kept'
        - 'Accept that Reset leaves Changes only, the zoom, the pins and the selection alone, and that the origin is lost when the reader leaves the page'
```

## 7. Risk Assessment

```yaml
risk_assessment:
  by_task:
    - id: task-001
      risk: 'low'
      rationale: 'Edits a document only; the findings are specific.'
    - id: task-002
      risk: 'low'
      rationale: 'Reads and copies only.'
    - id: task-003
      risk: 'low'
      rationale: 'A pure move proved byte for byte by cmp; the risk is a top-level name that must stay before its reader.'
    - id: task-004
      risk: 'medium'
      rationale: 'Tests written before the code can assert a behavior the TDD leaves loose; the checks follow the amended TDD text.'
    - id: task-005
      risk: 'medium'
      rationale: 'applySavedView is shared by stories, Open on diagram and the Library (RISK-2); the existing tests are the guard.'
    - id: task-006
      risk: 'medium'
      rationale: 'The group markup is read by many tests and by the e2e spec of run 0217; the count must be read from the markup (ASM-5).'
    - id: task-007
      risk: 'medium'
      rationale: 'Focus and aria-disabled handling differ in three browsers (RISK-5); Escape has three existing branches.'
    - id: task-008
      risk: 'medium'
      rationale: 'The scene may not be available on a view''s page (ASM-2); the facet is refused by setViewFacet''s checks.'
    - id: task-009
      risk: 'medium'
      rationale: 'The look and the 148 px bar are judged in a browser (RISK-1, RISK-8).'
    - id: task-010
      risk: 'medium'
      rationale: 'Repairs old tests; the risk is weakening an assertion.'
    - id: task-011
      risk: 'medium'
      rationale: 'Three browsers, an overlaying panel and a measure of height can flake (RISK-8).'
    - id: task-012
      risk: 'low'
      rationale: 'Prose and anchors; the voice test and ManualExamplesTest guard it.'
    - id: task-013
      risk: 'medium'
      rationale: 'Runs the whole list; a failure is classified, not fixed here.'
  by_area:
    - area: 'ui'
      risk: 'medium'
      rationale: 'The collapsed toolbar and its panel are a look that node tests only partly prove; the e2e spec asserts widths, counts and heights.'
    - area: 'api'
      risk: 'low'
      rationale: 'No command, address key or file format changes; the origin is session state only (CON-2, CON-7).'
    - area: 'data'
      risk: 'low'
      rationale: 'Nothing is persisted; Reset writes only the keys the toolbar already writes.'
    - area: 'docs'
      risk: 'low'
      rationale: 'Two anchors of the manual and one note; the manual tests guard them.'
```

## 8. Confidence Assessment

```yaml
confidence_assessment:
  by_task:
    - id: task-001
      score: 85
      rationale: 'Clear acceptance criteria and an automated check.'
    - id: task-002
      score: 85
      rationale: 'Clear acceptance criteria and an automated check.'
    - id: task-003
      score: 80
      rationale: 'Clear acceptance criteria and an automated check.'
    - id: task-004
      score: 70
      rationale: 'Tests of a design not yet built; some assertions may need a reading of the TDD that the code then refines.'
    - id: task-005
      score: 75
      rationale: 'A refactor of a shared function with a good guard.'
    - id: task-006
      score: 70
      rationale: 'The count from the markup is new and every surface is touched.'
    - id: task-007
      score: 70
      rationale: 'Focus and aria-disabled across browsers.'
    - id: task-008
      score: 70
      rationale: 'Depends on ASM-2.'
    - id: task-009
      score: 65
      rationale: 'Lowest of the styling tasks: the look under 40 rem is decided by eye and the 148 px bar may need a second pass.'
    - id: task-010
      score: 70
      rationale: 'Clear acceptance criteria and an automated check.'
    - id: task-011
      score: 60
      rationale: 'Lowest: three browsers, an overlay and a height assertion; WebKit may need a reduced spec.'
    - id: task-012
      score: 80
      rationale: 'Clear acceptance criteria and an automated check.'
    - id: task-013
      score: 70
      rationale: 'A list of commands, but a long one.'
```

## 9. Agent Assignment Plan

```yaml
agent_assignment_plan:
  assignments:
    - task_id: task-001
      agent_role: 'Architecture Agent'
      objective: 'Apply the Stage 5 findings F-1 to F-10 to the TDD, none of which changes a decision the review did not question, and mark each in the Findings of the prg.'
      context:
        prd_excerpts:
          - 'REQ-1 of the TDD traceability section (no PRD exists)'
          - 'Requirements REQ-1, REQ-2, REQ-4, REQ-5'
        tdd_excerpts:
          - 'DEC-3, DEC-4, DEC-5, DEC-6, DEC-7, DEC-8, CTR-3, CTR-4, IMP-4, RISK-1'
          - 'Findings F-1 to F-10 of prg-0218-toolbar-state.md'
      likely_files:
        - 'docs/wav/wav-030-pages-ci-and-toolbar/run/run-0218-toolbar-state/tdd-0218-toolbar-state.md'
        - 'docs/wav/wav-030-pages-ci-and-toolbar/run/run-0218-toolbar-state/prg-0218-toolbar-state.md'
      acceptance_criteria:
        - 'F-1: DEC-7 and IMP-4 say the confirmation of Unfold all on the page of a view takes the view''s opened and hidden sets as a parameter (mapBoxesIfOpened reads the session today)'
        - 'F-2: the TDD says what Compare is under 40 rem (its one control, Changes only, stays a button inline and the group has no button) and RISK-1 counts the items right'
        - 'F-3: key in the table is the one fact, SAVED_GROUPS is asserted equal to the groups that have a keyed control, groupOrder.saved is gone from CTR-4'
        - 'F-4: one rule for clearing the origin and toolPanelOpen, the lazy comparison on read plus folder-session.js, the explicit clears removed or justified, applySavedView named as the other place currentPerspective is set'
        - 'F-5: setViewOpened is listed as new in IMP-4 and says whether it is built on setViewListItem'
        - 'F-6: applyToolbarKeys has a stated signature that takes the layer and says which keys applySavedView keeps outside it (pinned, hidden, links, highlight)'
        - 'F-7 to F-10 applied as the prg words them'
        - 'Stage 9 amendments: CTR-1 gives the group button a title that is not its label; DEC-8 says the eight checks of run 0217 are check a: to check h: and the old test check i (F1): stays, check b gets the table with keys and check h is rewritten to DEC-7 (the Facet on every surface), the new tests are named check i: to check o:, and the Current State says six surfaces and a story step, not seven; DEC-9 and IMP-1 move the whole prefix of diagram-page.js (renderDiagramCanvasHtml, the toolbar renderers, renderDiagramDownloadHtml, about 225 lines) because the page is a concatenation of the parts, and ASM-4 and the tradeoff say 225 lines, not 190'
      verification:
        - 'grep -n "mapBoxesIfOpened" tdd-0218-toolbar-state.md shows the parameter rule in DEC-7 or IMP-4'
        - 'grep -c "groupOrder.saved" tdd-0218-toolbar-state.md prints 0'
        - 'grep -n "setViewOpened" tdd-0218-toolbar-state.md shows it listed as new in IMP-4'
        - 'grep -n "applyToolbarKeys(" tdd-0218-toolbar-state.md shows a signature with the layer'
        - 'grep -n "presentation/shell.js" tdd-0218-toolbar-state.md shows the folder in IMP-4'
        - 'sed -n 1,10p of the TDD still shows run: 0218 and wave: 030 in the frontmatter'
        - 'grep -n "tool-group-button" tdd-0218-toolbar-state.md shows a title in CTR-1 that is not the button''s label (check f of toolbar.test.js asks it)'
        - 'grep -n "check i (F1)" tdd-0218-toolbar-state.md shows DEC-8 naming the old test and the new checks as check i: to check o:'
        - 'grep -n "prefix" tdd-0218-toolbar-state.md shows DEC-9 and IMP-1 moving the whole prefix of diagram-page.js, canvas function included, with the new part listed immediately before diagram-page.js'
      escalation_triggers:
        - 'A fix contradicts a section of the TDD that the review did not name'
      suggested_subagent_type: 'general-purpose'
      suggested_model: '(default)'
      suggested_effort: 'low'
    - task_id: task-002
      agent_role: 'QA Agent'
      objective: 'Save the tree state, a copy of the generated page, the data-lit lines, the tests that read the group markup, the editor size map, the unit result and the address-spec diff in the scratchpad, before any edit of this run''s code.'
      context:
        prd_excerpts:
          - 'REQ-6 of the TDD traceability section (no PRD exists)'
          - 'Requirements REQ-6, REQ-7'
        tdd_excerpts:
          - 'ASM-1 (run 0217 is in the working copy)'
          - 'ASM-4 (diagram-page.js 1,349 lines, cap 1,600)'
          - 'CON-2 (address specs)'
      likely_files:
        - 'src/main/editor'
        - 'src/test'
        - 'src/main/resources/editor-webapp/standalone.html'
      acceptance_criteria:
        - 'The eight files exist in the scratchpad and describe the tree as it is before task-003'
        - 'The page copy is the committed standalone.html, after npm run editor:build left git status --short unchanged'
      verification:
        - 'ls baseline-0218 lists the eight files and none is empty'
        - 'grep -c tool-group src/main/editor/presentation/diagram-page.js prints a number that is not 0 (ASM-1)'
        - 'data-lit.txt is the output of grep -rc data-lit src/main/editor (one count per file, so it is never empty) and every count is 0'
        - 'map.txt shows diagram-page.js with its line count, under 1,600'
        - 'cmp src/main/resources/editor-webapp/standalone.html baseline-0218/standalone-before.html exits 0'
        - 'address-specs-diff.txt is git diff ff3bacd on diagram-address.spec.js and address.spec.js and grep -c ''^-[^-]'' on it prints 0'
        - 'unit-before.txt ends with a line that shows npm run test:unit passing on the working copy, or names the failing files so a later failure is not charged to this run'
      escalation_triggers:
        - 'The unit suite is red before any edit of this run'
        - 'npm run editor:build changes git status --short'
        - 'ASM-1 does not hold (run 0217 is not in the working copy)'
      suggested_subagent_type: 'general-purpose'
      suggested_model: 'haiku'
      suggested_effort: 'low'
    - task_id: task-003
      agent_role: 'Refactoring Agent'
      objective: 'Move the toolbar renderers out of diagram-page.js into a part of their own, so that the assembled page is byte for byte the page it was. The page is the concatenation of the parts, and the renderers sit between renderDiagramCanvasHtml and diagramFoldTargets, so the unit moved is the whole prefix of diagram-page.js, about 225 lines, and the new part is listed immediately before diagram-page.js.'
      context:
        prd_excerpts:
          - 'REQ-7 of the TDD traceability section (no PRD exists)'
          - 'Requirements REQ-7'
        tdd_excerpts:
          - 'DEC-9: the move is its own change and leaves the page as it was'
          - 'CON-6: scripts/check-editor-moves.sh compares the page byte for byte'
      likely_files:
        - 'src/main/editor/presentation/diagram-page.js'
        - 'src/main/editor/presentation/diagram-toolbar.js'
        - 'src/main/editor/layers.json'
        - 'src/main/editor/names.json'
        - 'src/main/resources/editor-webapp/standalone.html'
      acceptance_criteria:
        - 'The moved prefix is in diagram-toolbar.js verbatim, line for line, and absent from diagram-page.js, which now starts at the doc comment of diagramFoldTargets; no declaration is reordered and no line is added or edited'
        - 'The page is unchanged and the editor check passes'
      verification:
        - 'npm run editor:build exits 0 and cmp src/main/resources/editor-webapp/standalone.html baseline-0218/standalone-before.html exits 0 (the parts are assembled verbatim, so a pure move leaves the page byte for byte)'
        - 'npm run editor:check exits 0 (run node scripts/check-editor.mjs --write-names first only if it says a top-level name moved, and then the names file is the only other change)'
        - 'wc -l src/main/editor/presentation/diagram-page.js prints fewer lines than the 1,349 of the baseline map.txt, and cat diagram-toolbar.js diagram-page.js equals the baseline copy of diagram-page.js (cmp)'
        - 'grep -c ''diagram-toolbar.js'' src/main/editor/layers.json prints 1 and its line comes before the one of diagram-page.js'
        - 'npm run test:unit exits 0'
      escalation_triggers:
        - 'The page differs from the baseline copy after a pure move (a name was changed or a declaration reordered): undo the change in the text, never accept a different page'
        - 'A moved function reads a top-level name that stays in diagram-page.js and the part order would break: stop and record it'
      suggested_subagent_type: 'general-purpose'
      suggested_model: '(default)'
      suggested_effort: 'low'
    - task_id: task-004
      agent_role: 'Test Generation Agent'
      objective: 'Write, before the code, the table and the node tests that say what the dot, the count, Reset, the origin, the panel and the controls of the page of a saved view must do.'
      context:
        prd_excerpts:
          - 'REQ-1 of the TDD traceability section (no PRD exists)'
          - 'Requirements REQ-1, REQ-3, REQ-4, REQ-5, REQ-6'
        tdd_excerpts:
          - 'DEC-8 lists checks (i) to (o)'
          - 'CTR-4 gives the new shape of the table'
          - 'the openers of header.test.js, library-view-diagram.test.js and toolbar.test.js (run 0217) are reused'
      likely_files:
        - 'src/test/javascript/viewpoint-kernel/toolbar-controls.json'
        - 'src/test/javascript/viewpoint-kernel/toolbar.test.js'
        - 'src/test/javascript/viewpoint-kernel/toolbar-origin.test.js'
      acceptance_criteria:
        - 'The table is valid JSON and every control has key (a view property or null), and Compare and Frame controls have none'
        - 'Each of checks (i) to (o) is a test of its own, covering every surface of the table, and toolbar-origin.test.js imports the functions by the names DEC-3 gives them'
        - 'Checks a: to g: of run 0217 and the test check i (F1): stay and pass; check b: and check h: change as the objective says and are red on the three library surfaces until task-008'
      verification:
        - 'node --test src/test/javascript/viewpoint-kernel/toolbar.test.js runs after npm run editor:build; check a:, c:, d:, e:, f:, g: and check i (F1): pass; check b: and check h: fail only on the three library surfaces with a message that names Fold all, Unfold all or the Facet; checks i: to o: fail with assertion messages that name the missing dot, count, Reset, origin or control (red by design); there is no syntax error and no missing import'
        - 'node --test src/test/javascript/viewpoint-kernel/toolbar-origin.test.js fails because the functions do not exist yet, with a message that names them'
        - 'node -e "JSON.parse(require(''fs'').readFileSync(''src/test/javascript/viewpoint-kernel/toolbar-controls.json'',''utf8''))" exits 0'
        - 'npx prettier --check on the three files exits 0'
        - 'task-005 turns toolbar-origin.test.js green, task-006 turns checks (i) and (j) green, task-007 checks (k), (l), (m) and (o), task-008 check (n); no earlier task asks for any of them to pass'
      escalation_triggers:
        - 'A check cannot be written without a decision the TDD does not hold: record it and write the test for the stated behaviour only'
      suggested_subagent_type: 'general-purpose'
      suggested_model: '(default)'
      suggested_effort: 'medium'
    - task_id: task-005
      agent_role: 'Frontend Implementation Agent'
      objective: 'Add the one new piece of state, the origin, and make applySavedView and Reset go through one key setter, in a step that first leaves every existing behaviour unchanged.'
      context:
        prd_excerpts:
          - 'REQ-1 of the TDD traceability section (no PRD exists)'
          - 'Requirements REQ-1, REQ-2'
        tdd_excerpts:
          - 'DEC-3 and CTR-3: the snapshot, its fields, who writes and who reads it'
          - 'DEC-2: applyToolbarKeys sets Draw, Texts and Layout and never the scale, the centre, Changes only, the pins, hidden, links, highlight or the selection'
          - 'IMP-2 and RISK-2: applySavedView is shared by stories, Open on diagram and the Library'
      likely_files:
        - 'src/main/editor/application/view-recipe.js'
        - 'src/main/editor/model/ui-state.js'
        - 'src/main/editor/application/folder-session.js'
        - 'src/main/editor/composition/address-routing.js'
      acceptance_criteria:
        - 'applySavedView sets the toolbar''s keys through applyToolbarKeys, records diagramOrigin as the TDD says, and keeps sending pinned, hidden, links and highlight outside it'
        - 'The origin is written in one place and read in two, is cleared by the lazy comparison and by folder-session.js, and is never written to a manifest, the address or browser storage'
        - 'A facet the workspace does not define is dropped by applyToolbarKeys as applySavedView did'
      verification:
        - 'npm run editor:build exits 0'
        - 'node --test src/test/javascript/viewpoint-kernel/toolbar-origin.test.js exits 0'
        - 'node --test $(find src/test/javascript -name ''library-view-*.test.js'' -o -name ''story-*.test.js'') exits 0 (the existing view and story tests are the guard that applySavedView behaves as before)'
        - 'grep -rn ''localStorage\|indexedDB'' src/main/editor/application/view-recipe.js prints nothing that concerns the origin'
        - 'grep -rc ''data-lit'' src/main/editor prints 0 for every file'
        - 'npm run editor:check exits 0'
      escalation_triggers:
        - 'An existing story or library test fails after the refactor: fix the refactor, never the test'
        - 'The origin would have to be stored to work: stop, it is session state only (RFC-002 DEC-5)'
      suggested_subagent_type: 'general-purpose'
      suggested_model: '(default)'
      suggested_effort: 'medium'
    - task_id: task-006
      agent_role: 'Frontend Implementation Agent'
      objective: 'Draw the new markup of the toolbar: each group with a head, a dot on Draw, Texts and Layout, a group button with its count, Reset after Layout on the surfaces of a session diagram, and the legend after Reset.'
      context:
        prd_excerpts:
          - 'REQ-1 of the TDD traceability section (no PRD exists)'
          - 'Requirements REQ-1, REQ-3, REQ-4'
        tdd_excerpts:
          - 'CTR-1 gives the markup of a group, CTR-2 the Reset button, DEC-5 the count read from the group''s own markup'
          - 'Q-1: the legend is aria-hidden, after Reset, hidden under 40 rem by CSS'
          - 'DEC-1: Reset is absent when host is given'
      likely_files:
        - 'src/main/editor/presentation/diagram-toolbar.js'
        - 'src/main/editor/presentation/diagram-controls.js'
        - 'src/main/editor/presentation/diagram-page.js'
      acceptance_criteria:
        - 'Every group has div.tool-group-head with the name, the dot where DEC-4 says, and the group button; Compare and Frame carry the title Not part of a view'
        - 'The count is the number of controls with aria-pressed true or data-on true in the group''s own markup'
        - 'Reset is aria-disabled while diagramDiffersFromOrigin() is false, shows the dot while it differs, and names the view (name cut to 24 characters, escaped) or defaults'
        - 'Roles and names that the e2e spec of run 0217 finds by role are unchanged'
      verification:
        - 'npm run editor:build exits 0'
        - 'node --test --test-name-pattern ''check i:|check j:'' src/test/javascript/viewpoint-kernel/toolbar.test.js exits 0 on every surface of the table'
        - 'node --test --test-name-pattern ''check a:|check c:|check d:|check e:|check f:|check g:|check i \(F1\)'' src/test/javascript/viewpoint-kernel/toolbar.test.js exits 0 (the structure checks of run 0217 still pass, check f included: the group button and Reset have a title that is not their label; check b: passes except on the three library surfaces, which task-008 turns green; the old tests that assert the old markup are task-010''s)'
        - 'grep -rc ''data-lit'' src/main/editor prints 0 for every file'
        - 'node scripts/build-editor.mjs --map shows no part over 1,600 lines'
      escalation_triggers:
        - 'A part would pass 1,600 lines: stop and record it'
        - 'The count cannot be read from the markup for a control: record which and keep the TDD''s rule'
      suggested_subagent_type: 'general-purpose'
      suggested_model: '(default)'
      suggested_effort: 'medium'
    - task_id: task-007
      agent_role: 'Frontend Implementation Agent'
      objective: 'Make Reset restore Draw, Texts and Layout through applyToolbarKeys with one history entry and the focus kept, and make the group button open, replace and close its panel with the keyboard.'
      context:
        prd_excerpts:
          - 'REQ-1 of the TDD traceability section (no PRD exists)'
          - 'Requirements REQ-1, REQ-4'
        tdd_excerpts:
          - 'DEC-2: pushDiagramHistory, applyToolbarKeys(origin ? origin.properties : {}), mapSelectionCheck, render; a click on aria-disabled does nothing'
          - 'DEC-6 and FLOW-2: one session flag, Escape closes it first and focuses the button, another group replaces, a page change clears it, a click outside does not close it (Q-2)'
          - 'IMP-4: shell.js keeps a list of actions that need no scroll or focus work'
      likely_files:
        - 'src/main/editor/composition/events.js'
        - 'src/main/editor/presentation/diagram-interaction.js'
        - 'src/main/editor/presentation/shell.js'
        - 'src/main/editor/model/ui-state.js'
        - 'src/main/editor/composition/address-routing.js'
      acceptance_criteria:
        - 'Pressing Reset after a change in each of Draw, Texts and Layout restores the origin''s keys and the address of the first drawing, leaves Changes only, zoom, pins and selection as they were, and keeps the focus on #diagram-reset-button'
        - 'Pressing it while disabled, by click or Enter, does nothing'
        - 'Escape with a panel open closes it and focuses its group button, and with none open the Esc of Maximize is unchanged'
        - 'applyDiagramScale also writes the zoom in Frame''s button'
      verification:
        - 'npm run editor:build exits 0'
        - 'node --test src/test/javascript/viewpoint-kernel/toolbar.test.js exits 0 for every check but check n: and checks b: and h: on the three library surfaces, which task-008 turns green'
        - 'node --test $(find src/test/javascript -name ''diagram-*.test.js'' -o -name ''story-*.test.js'') exits 0 or the failing files are the ones task-010 names (old markup) and none is caused by a handler'
        - 'git diff ff3bacd -- src/test/e2e/diagram-address.spec.js src/test/e2e/address.spec.js | grep -c ''^-[^-]'' prints 0'
        - 'grep -rc ''data-lit'' src/main/editor prints 0 for every file'
      escalation_triggers:
        - 'Reset would need a new address key: stop, it writes only the keys the toolbar already writes (CON-2)'
        - 'The focus is lost after a press: fix headerControlSelector use, never add a focus jump'
      suggested_subagent_type: 'general-purpose'
      suggested_model: '(default)'
      suggested_effort: 'medium'
    - task_id: task-008
      agent_role: 'Frontend Implementation Agent'
      objective: 'Draw and wire Fold all, Unfold all (Map views) and Facet (every view) on the page of a saved view as edits of the view, by the rule that a control is absent only when it can never apply.'
      context:
        prd_excerpts:
          - 'REQ-5 of the TDD traceability section (no PRD exists)'
          - 'Requirements REQ-5'
        tdd_excerpts:
          - 'DEC-7: one editSavedView call per press; the session''s diagramFacet and Map opened are untouched'
          - 'The confirmation above MAP_UNFOLD_CONFIRM_BOXES takes the view''s opened and hidden sets, as task-001 amended it'
          - 'ASM-2: diagramScene.expandable lists the boxes Unfold all may open; with no scene it does nothing'
      likely_files:
        - 'src/main/editor/presentation/diagram-toolbar.js'
        - 'src/main/editor/presentation/stories-pages.js'
        - 'src/main/editor/presentation/diagram-page.js'
        - 'src/main/editor/presentation/view-edit.js'
        - 'src/main/editor/presentation/element-form.js'
        - 'src/main/editor/composition/events.js'
      acceptance_criteria:
        - 'On a saved Map view the toolbar has Fold all, Unfold all, Hide unlinked, the parts and Facet; on a saved element view it has Facet'
        - 'One press changes the view and marks the entry changed, and changes neither diagramFacet nor the Map''s opened of the session'
        - 'A facet the workspace does not define is refused with the form''s message'
        - 'toolbar-controls.json and the manual''s later table say why each absent control is absent'
      verification:
        - 'npm run editor:build exits 0'
        - 'node --test src/test/javascript/viewpoint-kernel/toolbar.test.js exits 0 (all checks (a) to (o))'
        - 'node --test $(find src/test/javascript -name ''library-view-*.test.js'') exits 0 or the failing files are the ones task-010 names (old markup)'
        - 'grep -rc ''data-lit'' src/main/editor prints 0 for every file'
        - 'npm run editor:check exits 0'
      escalation_triggers:
        - 'The scene is not available on the page of a view (ASM-2 fails): record it, make the control do nothing before the first drawing, and do not add a second source of expandable boxes'
      suggested_subagent_type: 'general-purpose'
      suggested_model: '(default)'
      suggested_effort: 'medium'
    - task_id: task-009
      agent_role: 'Frontend Implementation Agent'
      objective: 'Make the toolbar one or two rows of compact buttons under 40 rem with an overlaying panel, and the head, the dot and the legend readable above it, in light and dark.'
      context:
        prd_excerpts:
          - 'REQ-3 of the TDD traceability section (no PRD exists)'
          - 'Requirements REQ-3, REQ-4'
        tdd_excerpts:
          - 'DEC-5: above 40 rem the button is hidden and the name shown, under it the name and the controls are hidden, the button shown, the controls shown as an overlaying panel when data-open is true'
          - 'DEC-6: at 360 by 740 the toolbar is at most 148 px high; padding shrinks before the bar is raised (RISK-1)'
          - 'The dot stays in the head under 40 rem (CTR-1)'
      likely_files:
        - 'src/main/editor/style.css'
        - 'src/test/javascript/viewpoint-kernel/css-theme-audit.test.js'
      acceptance_criteria:
        - 'Only var(--accent), var(--muted) and the other theme tokens are used; no literal colour'
        - 'The panel does not move the canvas'
        - 'With the browser pane available the toolbar is measured at 1280 and at 360 by 740 in light and dark and the heights are recorded; without it the record says not checked'
      verification:
        - 'npm run editor:build exits 0'
        - 'node --test src/test/javascript/viewpoint-kernel/css-theme-audit.test.js exits 0'
        - 'node --test src/test/javascript/viewpoint-kernel/toolbar.test.js exits 0'
        - 'grep -n ''tool-group-button'' src/main/editor/style.css shows the rule inside @media (max-width: 40rem)'
        - 'npm run format:check exits 0 (style.css is not in its globs and was not formatted at the base commit ff3bacd: the check on that file alone is left out)'
      escalation_triggers:
        - 'The 148 px bar is missed at 360 by 740 after the padding shrinks: record the measure as a finding and do not raise the bar'
        - 'The browser pane is unavailable: record the look as not checked'
      suggested_subagent_type: 'general-purpose'
      suggested_model: '(default)'
      suggested_effort: 'high'
    - task_id: task-010
      agent_role: 'Test Generation Agent'
      objective: 'Bring every existing test that counts groups or slices the markup at the old group name back to green without weakening what it asserts, and meet the coverage floor with the new code covered by node tests.'
      context:
        prd_excerpts:
          - 'REQ-6 of the TDD traceability section (no PRD exists)'
          - 'Requirements REQ-6, REQ-7'
        tdd_excerpts:
          - 'IMP-7: tests that count [role=group] or slice at tool-group-name are found with grep -n ''tool-group'' src/test'
          - 'CON-8: the floor only goes up'
      likely_files:
        - 'src/test/javascript'
        - 'scripts/editor-coverage-floor.json'
      acceptance_criteria:
        - 'Each edited test keeps its assertion''s meaning, with a comment that names the new markup when it changed; the list of edited files is in the Findings of the prg'
        - 'No file under src/main/editor changes in this task except if a missing cover requires a test seam, and then the record says which'
      verification:
        - 'npm run test:unit exits 0'
        - 'npm run test:coverage exits 0 (the floor is met)'
        - 'git diff scripts/editor-coverage-floor.json shows no lowered number'
        - 'npm run format:check exits 0 and npm run lint exits 0'
        - 'grep -rc ''data-lit'' src/main/editor prints 0 for every file'
      escalation_triggers:
        - 'A repair would need an assertion to be loosened: stop and name the test in the record'
        - 'Coverage is under the floor and the uncovered code is in a handler: add a node test, never lower the floor'
      suggested_subagent_type: 'general-purpose'
      suggested_model: '(default)'
      suggested_effort: 'medium'
    - task_id: task-011
      agent_role: 'QA Agent'
      objective: 'Prove in a real browser what the node tests prove on the markup: Reset disabled then enabled and restoring, the dot by role on three groups, the written view''s keys, the page of a Map view, and the 360 by 740 bar with its buttons, counts, panel and Escape.'
      context:
        prd_excerpts:
          - 'REQ-1 of the TDD traceability section (no PRD exists)'
          - 'Requirements REQ-1, REQ-3, REQ-4, REQ-5, REQ-6'
        tdd_excerpts:
          - 'Observability and Verification 5 lists the assertions'
          - 'ASM-3: toBeDisabled() reads aria-disabled; ASM-5: node and browser read the same count'
          - 'CON-4: the toolbar spec is already in the WebKit testMatch; add tests, not a file'
      likely_files:
        - 'src/test/e2e/diagram-toolbar.spec.js'
        - 'playwright.config.js'
        - 'src/test/CLAUDE.md'
      acceptance_criteria:
        - 'Each listed assertion is a test or a step of a test, on every surface that applies'
        - 'The spec at 360 by 740 asserts the document is 360 px wide, the toolbar at most 148 px high, each button''s name includes its count, Escape closes a panel and focuses its button, and Frame shows the zoom after a zoom key'
        - 'The two address specs are untouched'
      verification:
        - 'JAVA_HOME=/home/tibo/.sdkman/candidates/java/25.0.4-tem ./mvnw package -Dmaven.test.skip -Dplugin.asciidoctor.skip=true exits 0 (the e2e suite runs the packaged jar; run it once before the spec)'
        - 'npx playwright test src/test/e2e/diagram-toolbar.spec.js exits 0 on every project that runs it, WebKit included; a project that cannot start is recorded as not run, never as passed'
        - 'git diff ff3bacd -- src/test/e2e/diagram-address.spec.js src/test/e2e/address.spec.js | grep -c ''^-[^-]'' prints 0'
        - 'npx prettier --check src/test/e2e/diagram-toolbar.spec.js exits 0 and npm run lint exits 0'
      escalation_triggers:
        - 'The WebKit spec flakes or a browser is not installed: stabilise or reduce the spec, never retry; record a project not run'
        - 'Reset or the panel behaves in a browser as the node tests said it could not: record a finding, fix the code, add the node test'
      suggested_subagent_type: 'general-purpose'
      suggested_model: '(default)'
      suggested_effort: 'high'
    - task_id: task-012
      agent_role: 'Documentation Agent'
      objective: 'Describe what the toolbar now does in the manual under the two anchors the gate names, and in the note of the layer, with the voice rules of the manual.'
      context:
        prd_excerpts:
          - 'REQ-8 of the TDD traceability section (no PRD exists)'
          - 'Requirements REQ-8, REQ-9'
        tdd_excerpts:
          - 'IMP-9: no [[editor-toolbar]] section; the two existing anchors only'
          - 'IMP-8: a note of what the code does, history stays in the progress log'
          - 'manual-voice.test.js: the four filler words are absent'
      likely_files:
        - 'src/doc/README.adoc'
        - 'src/main/editor/presentation/CLAUDE.md'
      acceptance_criteria:
        - 'Every anchor of git show ff3bacd:src/doc/README.adoc is still defined'
        - 'The manual says what Reset restores and what it leaves, what the dot means, and the rule that a control is absent only when it can never apply'
        - 'No emoji and no real workspace content'
      verification:
        - 'node --test src/test/javascript/manual-skeleton.test.js src/test/javascript/manual-voice.test.js exits 0'
        - 'for each id in git show ff3bacd:src/doc/README.adoc matching [[id]], grep -c ''[[id]]'' src/doc/README.adoc prints 1 or more (compare with the anchors saved by the check of task-013 if needed)'
        - 'grep -n ''editor-toolbar'' src/doc/README.adoc prints nothing'
        - 'npm run format:check exits 0'
        - 'No Maven command and no npm run editor:build is run by this task (it runs beside task-011)'
      escalation_triggers:
        - 'A sentence of the manual needs a fact the TDD does not hold: leave it out and record it'
      suggested_subagent_type: 'general-purpose'
      suggested_model: '(default)'
      suggested_effort: 'low'
    - task_id: task-013
      agent_role: 'QA Agent'
      objective: 'Run every check of the TDD''s verification list in order on the final tree and record the results, naming what is not proved.'
      context:
        prd_excerpts:
          - 'REQ-6 of the TDD traceability section (no PRD exists)'
          - 'Requirements REQ-6, REQ-7, REQ-8, REQ-9'
        tdd_excerpts:
          - 'Observability and Verification items 1 to 9 and the list of what is not proved'
          - 'CON-7: byte identity against archicode-0.19.0 with JDK 25'
      likely_files:
        - 'docs/wav/wav-030-pages-ci-and-toolbar/run/run-0218-toolbar-state/prg-0218-toolbar-state.md'
      acceptance_criteria:
        - 'Every item has a result line, and a check that could not run is recorded as not run'
        - 'npm run editor:build run twice leaves git status --short as it was after the first'
      verification:
        - 'npm run editor:build run twice leaves git status --short unchanged between the two, and npm run editor:check exits 0'
        - 'npm run test:unit, npm run test:coverage, npm run format:check and npm run lint exit 0 and grep -rc ''data-lit'' src/main/editor prints 0 for every file'
        - 'npx playwright test exits 0 on every project (Chromium, Firefox, WebKit) after the jar of task-011 is current'
        - 'git diff ff3bacd -- src/test/e2e/diagram-address.spec.js src/test/e2e/address.spec.js | grep -c ''^-[^-]'' prints 0'
        - 'JAVA_HOME=/home/tibo/.sdkman/candidates/java/25.0.4-tem scripts/byte-identity.sh exits 0 with no new line in scripts/byte-identity-exceptions.txt'
        - 'JAVA_HOME=/home/tibo/.sdkman/candidates/java/25.0.4-tem ./mvnw test -Dtest=ManualExamplesTest+ArchitectureDriftTest exits 0, and node --test src/test/javascript/manual-skeleton.test.js src/test/javascript/manual-voice.test.js exits 0'
        - 'JAVA_HOME=/home/tibo/.sdkman/candidates/java/25.0.4-tem ./mvnw verify exits 0 (the CI command, run once at the end)'
        - 'npm run sample:check exits 0'
      escalation_triggers:
        - 'A check fails for a reason this run did not cause: list it and leave it'
        - 'A browser or the pane is not available: record not run, never passed'
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
        - 'Every finding is visible in the text and the frontmatter is unchanged'
    - task_id: task-002
      methods:
        - 'file counts, cmp and head of each saved file'
      success_criteria:
        - 'Eight files, the page copy identical to the committed one, diagram-page.js under 1,600 lines, the unit result of the working copy saved'
    - task_id: task-003
      methods:
        - 'editor build and cmp'
        - 'editor check'
        - 'unit tests'
      success_criteria:
        - 'The page is byte for byte the page of before, the check and the unit suite pass, diagram-page.js is shorter'
    - task_id: task-004
      methods:
        - 'node test run (red by design)'
        - 'format check'
      success_criteria:
        - 'The new checks fail for the missing feature and for no other reason, checks a:, c: to g: and check i (F1): pass, checks b: and h: fail only on the library surfaces, Prettier accepts the files'
    - task_id: task-005
      methods:
        - 'node tests of the origin'
        - 'existing story and library tests'
        - 'editor check'
      success_criteria:
        - 'The pure functions pass their tests, the existing view and story tests still pass, nothing is persisted'
    - task_id: task-006
      methods:
        - 'node tests (i) and (j)'
        - 'structure checks of run 0217'
        - 'editor build and map'
      success_criteria:
        - 'The dot and the count are in the markup on every surface, Reset is on the right surfaces, the old structure checks still pass'
    - task_id: task-007
      methods:
        - 'node tests (k), (l), (m), (o)'
        - 'address spec diff'
        - 'editor build'
      success_criteria:
        - 'Reset and the panel behave as DEC-2 and DEC-6 say and the address contract holds'
    - task_id: task-008
      methods:
        - 'node test (n) and the whole toolbar.test.js'
        - 'library view tests'
      success_criteria:
        - 'toolbar.test.js passes whole and a press edits the view and not the session'
    - task_id: task-009
      methods:
        - 'theme audit test'
        - 'format check'
        - 'measure in the browser pane when available'
      success_criteria:
        - 'The theme audit passes, the toolbar is compact under 40 rem, the measure is recorded or marked not checked'
    - task_id: task-010
      methods:
        - 'unit tests'
        - 'coverage'
        - 'format and lint'
      success_criteria:
        - 'The unit suite, the coverage floor, format and lint all pass'
    - task_id: task-011
      methods:
        - 'Playwright run in three browsers'
        - 'address spec diff'
        - 'format and lint'
      success_criteria:
        - 'The spec passes in every project that runs it, the address specs have no removed line'
    - task_id: task-012
      methods:
        - 'manual node tests'
        - 'anchor comparison'
        - 'format check'
      success_criteria:
        - 'The manual and the note describe the toolbar and the two manual node tests pass'
    - task_id: task-013
      methods:
        - 'every command of the TDD''s verification list'
      success_criteria:
        - 'Every item is green or recorded as not run, and the record names what the checks do not prove'
```

## 11. Escalation Rules

```yaml
escalation_rules:
  rules:
    - condition: 'A part of src/main/editor would pass 1,600 lines'
      action: 'Stop the task, record the measure, and leave a further cut to the main agent as a human step; do not cut a file inside another change.'
    - condition: 'A change would touch src/main/java, pom.xml, a workflow or a script other than the coverage floor'
      action: 'Stop that change and record it as out of scope (REQ-9, CON-7).'
    - condition: 'Reset or the panel would need a new key in the address, a manifest or browser storage'
      action: 'Do not write it: the origin is session state and the address keeps the keys the toolbar already writes (CON-2).'
    - condition: 'An existing test of the address specs, the stories or the Library fails after a change'
      action: 'Fix the code, never the test; the only tests edited are those that assert the old group markup, in task-010, with the assertion kept.'
    - condition: 'A test fails for a file or a reason that this run did not cause'
      action: 'List it in the record and leave it; do not fix another run work here.'
    - condition: 'The WebKit spec flakes or a browser is not installed'
      action: 'Make the spec stable or reduce it, never retry; record a project not run as not run.'
    - condition: 'The browser pane is unavailable'
      action: 'Record the look at each width and theme as not checked; do not claim it.'
    - condition: 'The 148 px bar is missed at 360 by 740 after padding is reduced'
      action: 'Record the measure as a finding; never raise the bar and never remove the assertion.'
    - condition: 'The run operates under the autonomy override of complete-run and a task is flagged review_after or human_review after'
      action: 'Execute without a stop, log the review in the prg, and report it when the run ends.'
```

## 12. Final Execution Manifest

```yaml
execution_manifest:
  status: 'in_progress'
  recommendation: 'proceed_with_review'
  autonomy_level: 'medium'
  total_tasks: 13
  autonomous_tasks: 9
  review_before_tasks: 0
  review_after_tasks: 4
  human_required_tasks: 0
  blocked_tasks: 0
  critical_path_tasks:
    - 'task-001'
    - 'task-002'
    - 'task-003'
    - 'task-004'
    - 'task-005'
    - 'task-006'
    - 'task-007'
    - 'task-008'
    - 'task-009'
    - 'task-010'
    - 'task-011'
    - 'task-013'
  parallel_groups:
    - parallel-group-001
  required_human_gates:
    - gate-001
  highest_risk_tasks:
    - task-005
    - task-007
    - task-011
  lowest_confidence_tasks:
    - task-011
    - task-009
    - task-004
  next_action: 'Run task-001: amend the TDD with the Stage 5 findings F-1 to F-10, then task-002 saves the baseline and task-003 moves the renderers.'
  criteria:
    - 'A toolbar with the dot, Reset, one button per group with a count under 40 rem and three new controls on the page of a saved view, proved by node tests per surface and an end-to-end spec in three browsers'
    - 'The origin is session state only and the address contract, the command line and the saved-view format are unchanged'
    - 'The unit tests, coverage, editor check, format, lint, manual tests, byte identity and the CI command pass, and the address specs have no removed line'
```
