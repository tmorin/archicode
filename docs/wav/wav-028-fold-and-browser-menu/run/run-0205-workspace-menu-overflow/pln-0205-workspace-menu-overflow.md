---
title: Execution Plan — Workspace menu overflow
status: pending
date: 2026-10-30
related:
  - docs/wav/wav-028-fold-and-browser-menu/run/run-0205-workspace-menu-overflow/tdd-0205-workspace-menu-overflow.md
  - docs/wav/wav-028-fold-and-browser-menu/wav-028-fold-and-browser-menu.md
  - 'gh:tmorin/archicode#182'
type: pln
run: 0205
wave: 028
---

# Execution Plan: Workspace menu overflow

Profile TDD+pln: there is no PRD, so REQ-1 to REQ-5 are the IDs the TDD labels (section "PRD Traceability"), taken from #182 and the P1 gate of the wave manifest. The plan follows the TDD as it stands plus the findings F-1 to F-10 of the Stage 5 review (progress log, section Findings), which the TDD has not yet absorbed: where the two differ the plan says which finding it applies. The run operates under the autonomy override of complete-run: a task that would otherwise stop for a human is executed by an agent and the override is logged; this plan has no such task.

## 1. Executive Summary

```yaml
summary:
  status: 'pending'
  product_goal: 'In a browser workspace the Workspace menu items each have their own box with the note under the label, and the top bar wraps so that no button is cut off at 360 px and about 560 px (#182).'
  technical_approach: 'Measure the cascade first, write the node test and the end-to-end spec (three engines) and see them fail on the committed page, then change style.css only (item reset with important, wrapping button group, bar anchored menu under 40 rem), rebuild the generated page, run the gates, sabotage once, look at the result, and describe the narrow case in the manual and CLAUDE.md.'
  total_tasks: 7
  parallel_groups: 0
  high_risk_tasks: 0
  human_review_gates: 0
  autonomy_level: 'high'
  recommendation: 'proceed'
  criteria:
    - 'workspace-menu.spec.js passes in chromium, firefox and webkit and failed on the page as committed before the fix'
    - 'workspace-menu-layout.test.js passes and failed before the fix'
    - 'npm run editor:check, test:unit, lint and format:check exit 0 and ratchet.max is still 99'
    - 'the other end-to-end specs still pass in the three projects'
    - 'standalone.html is the output of editor:build for the changed style.css'
    - 'README.adoc editor-small-screen and upgrade-0-21 and CLAUDE.md describe the menu boxes, the wrap and the five-spec WebKit list'
```

## 2. PRD/TDD Consistency Assessment

```yaml
consistency_assessment:
  aligned_items:
    - 'REQ-1 to REQ-5 each map to a design decision and a repository impact of the TDD'
    - 'The cause (ASM-1, ASM-2) is a hypothesis validated by task-001 before any edit'
    - 'CSS only: top-panel.js, names.json and layers.json stay as they are (DEC-4, IMP-7)'
  gaps:
    - id: gap-001
      type: 'ambiguity'
      description: 'F-1 of the review: the intersection check alone is green on today page; the assertion that is red is that the label and note rectangles lie inside their item rectangle.'
      impact: 'medium'
      recommendation: 'task-002 writes that containment assertion and records which assertion failed.'
    - id: gap-002
      type: 'missing_requirement'
      description: 'F-2: the TDD tests 1280 and 360 px only, but the wrap can put Workspace at the left of its row between 640 px and about 900 px where the menu could pass the left edge, and the wave row W-1 says 560 and 360 px.'
      impact: 'medium'
      recommendation: 'task-001 measures the width where the group stops fitting in one row; task-002 tests 1280, 900, 700, 560 and 360 px and asserts the menu left >= 0; DEC-3 condition is widened in task-003 if the measure shows the defect above 40 rem.'
    - id: gap-003
      type: 'missing_requirement'
      description: 'F-3 and F-4: the reset question buttons, the pending-changes note and the bundle notice after an export are branches with no assertion.'
      impact: 'medium'
      recommendation: 'task-002 covers the three; the served page button Back to the served folder is listed as untested in the docs (DEF).'
    - id: gap-004
      type: 'ambiguity'
      description: 'F-9 and F-6: the ask-actions rule ties .top-panel button in specificity and wins by order; the dark pass wording on the idle background is ambiguous.'
      impact: 'low'
      recommendation: 'task-003 scopes it as .workspace-menu .workspace-ask-actions button with a vertical padding; task-002 asserts the idle item background is rgba(0, 0, 0, 0) in both schemes.'
    - id: gap-005
      type: 'ambiguity'
      description: 'Q-1 (does the wrap alone fit) and Q-2 (the help menu anchor) are open in the TDD; both are answered by the measurement of task-001 and neither blocks.'
      impact: 'low'
      recommendation: 'If Q-1 finds a child still past 360 px, task-003 stops and the fold alternative of DEC-2 is decided inline and logged; if Q-2 finds the help menu defect, open the follow-up issue DEF-1 as a human step outside the plan.'
  blocking_gaps: []
```

## 3. Execution Graph

```yaml
execution_graph:
  nodes:
    - id: task-001
      status: 'done'
      title: 'Measure the cascade, the bar and the widths on the committed page'
      depends_on: []
      produces:
        - 'a Log line in prg-0205 with the measured values'
      agent_role: 'QA Agent'
      autonomy: 'autonomous'
      risk: 'low'
      confidence: 85
    - id: task-002
      status: 'done'
      title: 'Write the node test, the end-to-end spec and the WebKit match, see them red'
      depends_on: [task-001]
      produces:
        - 'src/test/javascript/workspace-menu-layout.test.js'
        - 'src/test/e2e/workspace-menu.spec.js'
        - 'playwright.config.js'
      agent_role: 'Test Generation Agent'
      autonomy: 'autonomous'
      risk: 'medium'
      confidence: 75
    - id: task-003
      status: 'done'
      title: 'Change style.css and rebuild the generated page'
      depends_on: [task-002]
      produces:
        - 'src/main/editor/style.css'
        - 'src/main/resources/editor-webapp/standalone.html'
      agent_role: 'Frontend Implementation Agent'
      autonomy: 'autonomous'
      risk: 'medium'
      confidence: 80
    - id: task-004
      status: 'pending'
      title: 'Run the gate commands'
      depends_on: [task-003]
      produces:
        - 'a Log line in prg-0205 with the result of each gate'
      agent_role: 'QA Agent'
      autonomy: 'autonomous'
      risk: 'low'
      confidence: 85
    - id: task-005
      status: 'pending'
      title: 'Sabotage check and look at the result at 360 and 1280 px, light and dark'
      depends_on: [task-004]
      produces:
        - 'a Log line in prg-0205 with the sabotage verdicts and the measured figures'
      agent_role: 'QA Agent'
      autonomy: 'autonomous'
      risk: 'low'
      confidence: 80
    - id: task-006
      status: 'pending'
      title: 'Describe the narrow case in the manual and CLAUDE.md'
      depends_on: [task-005]
      produces:
        - 'src/doc/README.adoc'
        - 'CLAUDE.md'
      agent_role: 'Documentation Agent'
      autonomy: 'autonomous'
      risk: 'low'
      confidence: 85
    - id: task-007
      status: 'pending'
      title: 'Final run of the changed files and of the docs checks'
      depends_on: [task-006]
      produces:
        - 'a Log line in prg-0205 closing the implementation'
      agent_role: 'QA Agent'
      autonomy: 'autonomous'
      risk: 'low'
      confidence: 85
  edges:
    - from: task-001
      to: task-002
      reason: 'the spec thresholds and widths come from the measure'
    - from: task-002
      to: task-003
      reason: 'red before green: the tests must fail on the unfixed page'
    - from: task-003
      to: task-004
      reason: 'the gates run on the fixed page'
    - from: task-004
      to: task-005
      reason: 'sabotage edits style.css and the page, so it runs after the gates and the jar build that read them, never beside them'
    - from: task-005
      to: task-006
      reason: 'the manual quotes the figures measured in task-005'
    - from: task-006
      to: task-007
      reason: 'the final check covers the docs; the gates of task-004 are upstream of it through task-005 and task-006'
```

## 4. Task Catalog

```yaml
task_catalog:
  tasks:
    - id: task-001
      title: 'Measure the cascade, the bar and the widths on the committed page'
      source_requirements:
        prd:
          - 'REQ-1'
          - 'REQ-2'
        tdd:
          - 'ASM-1'
          - 'ASM-2'
          - 'Q-1'
          - 'Q-2'
          - 'Observability step 1'
          - 'Stage 5 review F-2 (progress log, Findings)'
      outputs:
        - 'One Log line in prg-0205 with computed height, padding-block and border-top-width of a .workspace-item, the scrollWidth of .top-actions at 360 px, the window width below which the group no longer fits one row, whether the menu passes the left edge at 560, 700 and 900 px, and whether the help menu does'
      verification:
        - 'grep -c "Workspace menu measure" docs/wav/wav-028-fold-and-browser-menu/run/run-0205-workspace-menu-overflow/prg-0205-workspace-menu-overflow.md prints 1 or more'
        - 'git status --short src/ shows no change under src/main'
      risk: 'low'
      confidence: 85
      human_review: 'none'
      escalation_triggers:
        - 'The computed values refute ASM-1 or ASM-2'
        - 'The browser cannot be driven'
      delegation_tier: 'standard'
      results: "tier standard, model sonnet, effort medium, profile low-cost, passed first time, inline (leaf), independently verified"
    - id: task-002
      title: 'Write the node test, the end-to-end spec and the WebKit match, see them red'
      source_requirements:
        prd:
          - 'REQ-1'
          - 'REQ-2'
          - 'REQ-3'
        tdd:
          - 'DEC-5'
          - 'DEC-6'
          - 'IMP-3'
          - 'IMP-4'
          - 'IMP-5'
          - 'TG-4'
          - 'FLOW-1'
          - 'FLOW-2'
          - 'Stage 5 review F-1, F-2, F-3, F-4, F-6, F-10 (progress log, Findings)'
      outputs:
        - 'src/test/javascript/workspace-menu-layout.test.js: reads style.css and asserts by selector and property, three declarations only (item height auto, .top-actions flex-wrap, the narrow anchor); the reason it exists next to the spec is that it is the one red/green guard that runs without a browser'
        - 'src/test/e2e/workspace-menu.spec.js: startHostedPage, SAMPLE_ADDRESS, openWorkspaceMenu; widths 1280, 900, 700, 560 and 360; asserts item rectangles do not intersect, label and note rectangles lie inside their item rectangle, the menu is inside the window (left >= 0), every .top-panel button is inside the window, the document is no wider than the window; the pending-changes note wraps inside its item; after Reset to the sample the two .workspace-ask-actions buttons do not intersect and sit inside the menu with an 80-character name wrapping; the bundle notice after an export at 360 px; a dark pass whose idle item background is rgba(0, 0, 0, 0)'
        - 'playwright.config.js: workspace-menu added to the anchored WebKit testMatch'
      verification:
        - 'node --test src/test/javascript/workspace-menu-layout.test.js exits non-zero on the committed style.css and the failing assertion names the missing declaration'
        - 'npx playwright test src/test/e2e/workspace-menu.spec.js --project=chromium exits non-zero and the failing assertion is recorded in the Log (expected the containment or the wrap assertion)'
        - 'grep -n "workspace-menu" playwright.config.js prints the testMatch line'
        - 'npm run format:check exits 0 for the new files'
      risk: 'medium'
      confidence: 75
      human_review: 'none'
      escalation_triggers:
        - 'The spec is green on the unfixed page: it proves nothing, strengthen the assertion before going on'
        - 'The spec needs a JVM or a jar'
      delegation_tier: 'standard'
      results: "tier standard, model sonnet, effort medium, profile low-cost, passed first time, inline (leaf), independently verified"
    - id: task-003
      title: 'Change style.css and rebuild the generated page'
      source_requirements:
        prd:
          - 'REQ-1'
          - 'REQ-2'
          - 'REQ-4'
        tdd:
          - 'DEC-1'
          - 'DEC-2'
          - 'DEC-3'
          - 'DEC-4'
          - 'IMP-1'
          - 'IMP-2'
          - 'CON-1'
          - 'CON-2'
          - 'CON-3'
          - 'Stage 5 review F-2, F-9 (progress log, Findings)'
      outputs:
        - 'style.css: .workspace-menu .workspace-item gets height auto, min-height 2rem, padding 0.35rem 1rem important, border 0 important, border-radius 0 important, background transparent important, white-space normal, with hover and focus backgrounds important, and a comment naming the two rules it beats (the global button rule and .top-panel button)'
        - 'style.css: .workspace-menu .workspace-ask-actions button gets height auto, min-height 2rem, white-space normal and a vertical padding (F-9)'
        - 'style.css: .top-actions gets flex-wrap wrap and justify-content flex-end'
        - 'style.css: in the max-width 40rem block .top-panel is position relative and .workspace-wrap is static; widened to the width measured in task-001 if the menu passed the left edge above 40 rem'
        - 'standalone.html rebuilt by npm run editor:build, no colour literal added'
      verification:
        - 'npm run format exits 0, then npm run editor:build exits 0'
        - 'node --test src/test/javascript/workspace-menu-layout.test.js exits 0'
        - 'npx playwright test src/test/e2e/workspace-menu.spec.js exits 0 in chromium, firefox and webkit'
        - 'node scripts/build-editor.mjs --check exits 0'
      risk: 'medium'
      confidence: 80
      human_review: 'none'
      escalation_triggers:
        - 'A child of the bar is still wider than 360 px after the wrap (Q-1): stop, decide the fold alternative of DEC-2 inline and log it'
        - 'The fix needs a change to top-panel.js or names.json (DEC-4 refuted)'
      delegation_tier: 'standard'
      results: "tier standard, model sonnet, effort medium, profile low-cost, passed first time, inline (leaf), independently verified"
    - id: task-004
      title: 'Run the gate commands'
      source_requirements:
        prd:
          - 'REQ-4'
        tdd:
          - 'Observability step 5'
          - 'CON-6'
          - 'RISK-2'
      outputs:
        - 'One Log line with the exit code of editor:check, test:unit, lint, format:check and test:e2e, and the value of ratchet.max'
        - 'target/quarkus-app rebuilt from the changed page: the served-folder specs read the page from the jar, and the jar present before the run holds the page as committed before the fix'
      verification:
        - 'JAVA_HOME set to a JDK 25, then ./mvnw package -Dmaven.test.skip -Dplugin.asciidoctor.skip=true exits 0 before test:e2e (the build the job E2E of CI does)'
        - 'npm run editor:check exits 0'
        - 'npm run test:unit exits 0'
        - 'npm run lint exits 0'
        - 'npm run format:check exits 0'
        - 'npm run test:e2e exits 0, or each failing spec is shown to fail on the parent commit too and logged'
        - 'grep -n "max" src/main/editor/layers.json shows ratchet max 99'
      risk: 'low'
      confidence: 85
      human_review: 'none'
      escalation_triggers:
        - 'The jar cannot be built (no JDK 25)'
        - 'A spec other than workspace-menu fails because of the wrap or the narrow anchor'
        - 'ratchet.max would have to rise'
      delegation_tier: 'standard'
    - id: task-005
      title: 'Sabotage check and look at the result at 360 and 1280 px, light and dark'
      source_requirements:
        prd:
          - 'REQ-1'
          - 'REQ-2'
          - 'REQ-3'
        tdd:
          - 'Observability step 6'
          - 'Sabotage check'
          - 'IF-1'
          - 'IF-2'
          - 'IF-3'
      outputs:
        - 'One Log line: the spec failed in chromium, firefox and webkit with height auto removed, and with flex-wrap removed, and passed again after each restore; the measured bar width, the menu width and the item heights at 360 and 1280 px, light and dark'
      verification:
        - 'git diff --stat src/main/editor/style.css is the same before and after the sabotage and the restore (the file is back as task-003 left it)'
        - 'npx playwright test src/test/e2e/workspace-menu.spec.js exits 0 after the restore'
        - 'node scripts/build-editor.mjs --check exits 0 after the restore'
      risk: 'low'
      confidence: 80
      human_review: 'none'
      escalation_triggers:
        - 'A sabotaged page still passes the spec in some engine'
      delegation_tier: 'standard'
    - id: task-006
      title: 'Describe the narrow case in the manual and CLAUDE.md'
      source_requirements:
        prd:
          - 'REQ-5'
        tdd:
          - 'IMP-6'
          - 'DEF-1'
          - 'DEF-2'
          - 'Stage 5 review F-4, F-5, F-10 (progress log, Findings)'
      outputs:
        - 'README.adoc [[editor-small-screen]]: one sentence with the figures measured in task-005 for the bar and the Workspace menu of a browser workspace at 360 px; the served-folder row 105 pixels high is left as it is'
        - 'README.adoc [[upgrade-0-21]]: an item of the form Fixed, see <<editor-small-screen>> for the menu boxes and the wrapping bar'
        - 'CLAUDE.md: the menu items are boxes of their own, workspace-menu.spec.js, and the WebKit list is five specs; the served page button Back to the served folder and the help menu anchor named as not covered'
      verification:
        - 'grep -n "workspace-menu.spec.js" CLAUDE.md prints a line'
        - 'grep -n "Fixed, see <<editor-small-screen>>" src/doc/README.adoc prints at least one line in the upgrade-0-21 block'
        - 'npm run format:check exits 0'
      risk: 'low'
      confidence: 85
      human_review: 'none'
      escalation_triggers:
        - 'The manual has no open release block for the next version'
      delegation_tier: 'cheap'
    - id: task-007
      title: 'Final run of the changed files and of the docs checks'
      source_requirements:
        prd:
          - 'REQ-3'
          - 'REQ-4'
          - 'REQ-5'
        tdd:
          - 'Observability'
          - 'Deployment and Rollout'
      outputs:
        - 'A Log line closing the implementation with the list of files changed'
      verification:
        - 'npm run editor:check exits 0'
        - 'npx playwright test src/test/e2e/workspace-menu.spec.js exits 0'
        - 'node --test src/test/javascript/workspace-menu-layout.test.js exits 0'
        - 'git status --short lists only style.css, standalone.html, the two new tests, playwright.config.js, README.adoc, CLAUDE.md and the run documents'
      risk: 'low'
      confidence: 85
      human_review: 'none'
      escalation_triggers:
        - 'A file outside the list above changed'
      delegation_tier: 'standard'
```

## 5. Parallelization Plan

```yaml
parallelization_plan:
  groups: []
```

No parallel group. Task-004 (the gates and the jar build) and task-005 (the sabotage, which edits style.css and the page and restores them) read and write the same two files in one working tree, so they run one after the other, gates first (Stage 9 consistency check: the earlier draft listed them as a parallel group while its own conflict note said to serialise them).

## 6. Human Review Gates

```yaml
human_review_gates:
  gates: []
```

No gate: the change is a stylesheet and its tests, reversible by a revert. Under the autonomy override of complete-run no `human_required` task exists in this plan, so nothing was executed without a stop that would otherwise have stopped.

## 7. Risk Assessment

```yaml
risk_assessment:
  by_task:
    - id: task-001
      risk: 'low'
      rationale: 'Read only'
    - id: task-002
      risk: 'medium'
      rationale: 'A spec that is green on the unfixed page proves nothing; three engines differ in layout'
    - id: task-003
      risk: 'medium'
      rationale: 'The wrap moves the bar down by a row at 360 px and important declarations deepen the cascade'
    - id: task-004
      risk: 'low'
      rationale: 'Commands only'
    - id: task-005
      risk: 'low'
      rationale: 'Temporary edit restored and checked by build-editor --check'
    - id: task-006
      risk: 'low'
      rationale: 'Prose'
    - id: task-007
      risk: 'low'
      rationale: 'Commands only'
  by_area:
    - area: 'ui'
      risk: 'medium'
      rationale: 'RISK-2 and RISK-3 of the TDD: the bar height and WebKit flex-wrap'
    - area: 'docs'
      risk: 'low'
      rationale: 'The figures must be those measured in task-005'
```

## 8. Confidence Assessment

```yaml
confidence_assessment:
  by_task:
    - id: task-001
      score: 85
      rationale: 'A short Playwright or Browser pane measurement'
    - id: task-002
      score: 75
      rationale: 'Many cases in one spec and three engines; the helpers exist in hosted.js'
    - id: task-003
      score: 80
      rationale: 'The pattern exists at the header overflow menu; Q-1 could force the fold alternative'
    - id: task-004
      score: 85
      rationale: 'Known commands'
    - id: task-005
      score: 80
      rationale: 'Needs care to restore the file exactly'
    - id: task-006
      score: 85
      rationale: 'Prose with located anchors'
    - id: task-007
      score: 85
      rationale: 'Known commands'
```

## 9. Agent Assignment Plan

```yaml
agent_assignment_plan:
  assignments:
    - task_id: task-001
      agent_role: 'QA Agent'
      objective: 'Measure the cascade and the bar on the committed page and log the figures before any edit'
      context:
        prd_excerpts:
          - 'REQ-1 and REQ-2 from #182'
        tdd_excerpts:
          - 'ASM-1 and ASM-2 name the computed values to read; Q-1 and Q-2 are answered by this measure; F-2 asks for the width at which the group stops fitting'
      likely_files:
        - 'docs/wav/wav-028-fold-and-browser-menu/run/run-0205-workspace-menu-overflow/prg-0205-workspace-menu-overflow.md'
        - 'src/test/e2e/hosted.js'
      acceptance_criteria:
        - 'The Log line begins with Workspace menu measure and gives each value named in the task outputs'
      verification:
        - 'grep -c "Workspace menu measure" docs/wav/wav-028-fold-and-browser-menu/run/run-0205-workspace-menu-overflow/prg-0205-workspace-menu-overflow.md prints 1 or more'
        - 'git status --short src/ shows no change under src/main'
      escalation_triggers:
        - 'ASM-1 or ASM-2 refuted'
      suggested_subagent_type: 'general-purpose'
      suggested_model: '(default)'
      suggested_effort: 'medium'
    - task_id: task-002
      agent_role: 'Test Generation Agent'
      objective: 'Write the node test and the spec so that they fail on the committed page for the reason of ASM-1 and ASM-2'
      context:
        prd_excerpts:
          - 'REQ-3: three engines, 1280 and 360 px, the menu opened'
        tdd_excerpts:
          - 'DEC-5 and DEC-6, with F-1 (containment is the red assertion), F-2 (more widths), F-3 (reset question, pending note), F-4 (bundle notice) and F-6 (idle background rgba(0, 0, 0, 0)); IMP-3 limited to three declarations (F-10)'
      likely_files:
        - 'src/test/e2e/workspace-menu.spec.js'
        - 'src/test/javascript/workspace-menu-layout.test.js'
        - 'playwright.config.js'
        - 'src/test/e2e/hosted.js'
      acceptance_criteria:
        - 'Both tests fail on the committed style.css; the failing assertion is logged'
        - 'The spec starts no JVM'
      verification:
        - 'node --test src/test/javascript/workspace-menu-layout.test.js exits non-zero on the committed style.css and the failing assertion names the missing declaration'
        - 'npx playwright test src/test/e2e/workspace-menu.spec.js --project=chromium exits non-zero and the failing assertion is recorded in the Log (expected the containment or the wrap assertion)'
        - 'grep -n "workspace-menu" playwright.config.js prints the testMatch line'
        - 'npm run format:check exits 0 for the new files'
      escalation_triggers:
        - 'Green on the unfixed page'
      suggested_subagent_type: 'general-purpose'
      suggested_model: '(default)'
      suggested_effort: 'medium'
    - task_id: task-003
      agent_role: 'Frontend Implementation Agent'
      objective: 'Make the tests of task-002 pass with CSS only and rebuild the page'
      context:
        prd_excerpts:
          - 'REQ-1 and REQ-2'
        tdd_excerpts:
          - 'DEC-1 to DEC-4; F-9 scopes the ask rule as .workspace-menu .workspace-ask-actions button; the pattern to follow is the header overflow menu rule of style.css'
      likely_files:
        - 'src/main/editor/style.css'
        - 'src/main/resources/editor-webapp/standalone.html'
      acceptance_criteria:
        - 'Only style.css and the generated page change; no colour literal; the page is the output of editor:build'
      verification:
        - 'npm run format exits 0, then npm run editor:build exits 0'
        - 'node --test src/test/javascript/workspace-menu-layout.test.js exits 0'
        - 'npx playwright test src/test/e2e/workspace-menu.spec.js exits 0 in chromium, firefox and webkit'
        - 'node scripts/build-editor.mjs --check exits 0'
      escalation_triggers:
        - 'Q-1 finds a child past 360 px'
      suggested_subagent_type: 'general-purpose'
      suggested_model: '(default)'
      suggested_effort: 'medium'
    - task_id: task-004
      agent_role: 'QA Agent'
      objective: 'Run the gates and log each exit code'
      context:
        prd_excerpts:
          - 'REQ-4'
        tdd_excerpts:
          - 'Observability step 5; ratchet.max stays 99'
      likely_files:
        - 'src/main/editor/layers.json'
        - 'target/quarkus-app/quarkus-run.jar'
      acceptance_criteria:
        - 'Every gate exits 0 or its failure is shown to pre-exist'
        - 'The jar is rebuilt from the changed page before test:e2e'
      verification:
        - 'JAVA_HOME set to a JDK 25, then ./mvnw package -Dmaven.test.skip -Dplugin.asciidoctor.skip=true exits 0 before test:e2e (the build the job E2E of CI does)'
        - 'npm run editor:check exits 0'
        - 'npm run test:unit exits 0'
        - 'npm run lint exits 0'
        - 'npm run format:check exits 0'
        - 'npm run test:e2e exits 0, or each failing spec is shown to fail on the parent commit too and logged'
        - 'grep -n "max" src/main/editor/layers.json shows ratchet max 99'
      escalation_triggers:
        - 'A regression in another spec'
      suggested_subagent_type: 'general-purpose'
      suggested_model: '(default)'
      suggested_effort: 'low'
    - task_id: task-005
      agent_role: 'QA Agent'
      objective: 'Show that the tests catch the removal of each fix, restore it, and measure the result'
      context:
        prd_excerpts:
          - 'REQ-3'
        tdd_excerpts:
          - 'Sabotage check: remove height auto, then flex-wrap; Observability step 6 for the figures'
      likely_files:
        - 'src/main/editor/style.css'
        - 'src/main/resources/editor-webapp/standalone.html'
      acceptance_criteria:
        - 'The sabotaged page fails the spec in the three engines; the restored page passes; build-editor --check exits 0'
      verification:
        - 'git diff --stat src/main/editor/style.css is the same before and after the sabotage and the restore (the file is back as task-003 left it)'
        - 'npx playwright test src/test/e2e/workspace-menu.spec.js exits 0 after the restore'
        - 'node scripts/build-editor.mjs --check exits 0 after the restore'
      escalation_triggers:
        - 'The restore does not give back the bytes of task-003'
      suggested_subagent_type: 'general-purpose'
      suggested_model: '(default)'
      suggested_effort: 'medium'
    - task_id: task-006
      agent_role: 'Documentation Agent'
      objective: 'Write the manual and CLAUDE.md sentences with the figures of task-005'
      context:
        prd_excerpts:
          - 'REQ-5'
        tdd_excerpts:
          - 'IMP-6 with F-5 (the figures are those of step 6, the block is upgrade-0-21, the item form is Fixed, see <<editor-small-screen>>) and F-10 (the 105 pixels row is left as it is)'
      likely_files:
        - 'src/doc/README.adoc'
        - 'CLAUDE.md'
      acceptance_criteria:
        - 'The sentences quote measured figures and no others'
      verification:
        - 'grep -n "workspace-menu.spec.js" CLAUDE.md prints a line'
        - 'grep -n "Fixed, see <<editor-small-screen>>" src/doc/README.adoc prints at least one line in the upgrade-0-21 block'
        - 'npm run format:check exits 0'
      escalation_triggers:
        - 'No open release block'
      suggested_subagent_type: 'general-purpose'
      suggested_model: '(default)'
      suggested_effort: 'low'
    - task_id: task-007
      agent_role: 'QA Agent'
      objective: 'Confirm the final tree and close the implementation in the log'
      context:
        prd_excerpts:
          - 'REQ-3, REQ-4 and REQ-5'
        tdd_excerpts:
          - 'Deployment and Rollout: code only, nothing is committed by the plan'
      likely_files:
        - 'docs/wav/wav-028-fold-and-browser-menu/run/run-0205-workspace-menu-overflow/prg-0205-workspace-menu-overflow.md'
      acceptance_criteria:
        - 'The changed files are exactly the expected list'
      verification:
        - 'npm run editor:check exits 0'
        - 'npx playwright test src/test/e2e/workspace-menu.spec.js exits 0'
        - 'node --test src/test/javascript/workspace-menu-layout.test.js exits 0'
        - 'git status --short lists only style.css, standalone.html, the two new tests, playwright.config.js, README.adoc, CLAUDE.md and the run documents'
      escalation_triggers:
        - 'An unexpected file changed'
      suggested_subagent_type: 'general-purpose'
      suggested_model: '(default)'
      suggested_effort: 'low'
```

## 10. Verification Plan

```yaml
verification_plan:
  checks:
    - task_id: task-001
      methods:
        - 'file check'
      success_criteria:
        - 'The measure is logged and src/main is unchanged'
    - task_id: task-002
      methods:
        - 'unit tests'
        - 'end-to-end tests'
        - 'format check'
      success_criteria:
        - 'Both new tests fail on the committed page, with the failing assertion logged'
    - task_id: task-003
      methods:
        - 'unit tests'
        - 'end-to-end tests'
        - 'generated page check'
      success_criteria:
        - 'The new tests pass in the three engines and editor build --check exits 0'
    - task_id: task-004
      methods:
        - 'editor:check'
        - 'unit tests'
        - 'linting'
        - 'format check'
        - 'end-to-end tests'
      success_criteria:
        - 'Every gate exits 0 and ratchet.max is 99'
    - task_id: task-005
      methods:
        - 'regression check'
        - 'end-to-end tests'
      success_criteria:
        - 'The sabotaged page fails, the restored page passes, bytes restored'
    - task_id: task-006
      methods:
        - 'file check'
        - 'format check'
      success_criteria:
        - 'The anchors and the spec name are present in the docs'
    - task_id: task-007
      methods:
        - 'editor:check'
        - 'end-to-end tests'
      success_criteria:
        - 'Only the expected files changed and the new tests pass'
```

## 11. Escalation Rules

```yaml
escalation_rules:
  rules:
    - condition: 'A new test is green on the page as committed'
      action: 'Strengthen the assertion until it fails for the reason of ASM-1 or ASM-2 before task-003 starts'
    - condition: 'The measure refutes ASM-1 or ASM-2, or a child of the bar stays wider than 360 px after the wrap'
      action: 'Stop the CSS edit, decide inline between the TDD alternatives (DEC-1 and DEC-2), log the decision in the progress log and amend the TDD'
    - condition: 'The help menu shows the same anchor defect (Q-2)'
      action: 'Log it and state it as not covered in CLAUDE.md; opening the follow-up issue DEF-1 is a human step outside this plan'
    - condition: 'Another spec fails after the change'
      action: 'Show whether it fails on the parent commit; if not, fix the CSS and rerun task-004'
    - condition: 'The change would need top-panel.js, names.json or a ratchet.max above 99'
      action: 'Stop and treat it as a change of the design (DEC-4), not a plan step'
    - condition: 'Autonomy override of complete-run'
      action: 'No task of this plan is human_required, so the override is not used; if one is added it runs under the override and is logged'
```

## 12. Final Execution Manifest

```yaml
execution_manifest:
  status: 'in_progress'
  recommendation: 'proceed'
  autonomy_level: 'high'
  total_tasks: 7
  autonomous_tasks: 7
  review_before_tasks: 0
  review_after_tasks: 0
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
  parallel_groups: []
  required_human_gates: []
  highest_risk_tasks:
    - task-002
    - task-003
  lowest_confidence_tasks:
    - task-002
    - task-003
  next_action: 'Start task-001: measure the committed page and log the figures'
  criteria:
    - 'The spec and the node test fail before the fix and pass after it'
    - 'The gates exit 0 with ratchet.max at 99'
    - 'The manual and CLAUDE.md say what the run built'
```
