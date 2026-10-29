---
title: Execution Plan — Sticky walk bar
status: done
date: 2026-10-29
related:
  - docs/wav/wav-027-editor-layout-and-walk/run/run-0201-sticky-walk-bar/tdd-0201-sticky-walk-bar.md
  - docs/wav/wav-027-editor-layout-and-walk/rfc/rfc-001-diagram-layout-address-and-walk.md
  - 'gh:tmorin/archicode#179'
type: pln
run: 0201
wave: 027
---

# Execution Plan: Sticky walk bar

Profile TDD+pln: there is no PRD, so REQ-1 to REQ-6 are the IDs the TDD labels (section "PRD Traceability"), taken from #179, RFC-001 rule 5 and the wave manifest. The run operates under the autonomy override of complete-run: a task that would otherwise stop for a human is executed by an agent and the override is logged in the prg. No task below is `human_required`.

## 1. Executive Summary

```yaml
summary:
  status: 'done'
  product_goal: 'On a long comparison the Previous change and Next change buttons stay in view while the reader walks with the mouse, on every page that lists the changes, at 1280 px and at 360 px (#179).'
  technical_approach: 'Write the node markup test and the e2e walk spec first and see them fail on the unfixed page, then split the walk row out of .changes-reading as a sticky sibling, measure the sticky heights into two custom properties, scroll the selected row with block nearest, rebuild the generated page, measure the share at 360 x 640 (35 percent rule, option B otherwise), and update CLAUDE.md and the manual.'
  total_tasks: 6
  parallel_groups: 1
  high_risk_tasks: 0
  human_review_gates: 0
  autonomy_level: 'high'
  recommendation: 'proceed'
  criteria:
    - 'the new node test and the new e2e spec fail on the unfixed page (the failing output is recorded in the run document) and pass after the change, the e2e in chromium and firefox'
    - 'after each of thirty presses of Next change on the 360-change comparison, at 1280 x 800 and at 360 x 640, the button box is inside the box of #panel-right and the top of the selected row is at or below the bottom of the sticky block'
    - 'the run document records the sticky height as a share of the panel at 360 x 640 and the verdict, option A at most 35 percent, otherwise option B built and measured'
    - 'an empty list renders no walk bar, every page that writes the Changes list gets the bar, and the j and k tests are green and unchanged in meaning'
    - 'standalone.html is the output of npm run editor:build; npm run editor:check, npm run test:unit, npm run lint and npm run format:check pass; ratchet.max in src/main/editor/layers.json is not above 99'
    - 'CLAUDE.md and src/doc/README.adoc ([[editor-changes-panel]], [[editor-small-screen]]) describe the sticky walk bar, the nearest scroll and the Safari limit'
```

## 2. PRD/TDD Consistency Assessment

```yaml
consistency_assessment:
  aligned_items:
    - 'REQ-1 to REQ-6 are each addressed by a TDD goal (TG-1 to TG-4) and by a task below'
    - 'renderChangesReadingHtml in presentation/changes-panel.js, the render step at composition/render.js line 145 (block center), refreshRightPanel at presentation/right-panel.js line 55 and the resize hook at composition/bootstrap.js line 59 exist as the TDD describes'
  gaps:
    - id: gap-001
      type: 'missing_technical_design'
      description: 'Stage 5 review S2: refreshRightPanel (right-panel.js) writes the panel innerHTML outside render(), so a measure called only from render() misses it (kernel loaded late, selection dropped by itself, Plateaus page).'
      impact: 'medium'
      recommendation: 'task-003 calls syncRightPanelSticky() at the end of refreshRightPanel as well as in render() and on resize. composition/bootstrap.js (the resize listener) belongs to the files of the task.'
    - id: gap-002
      type: 'contradiction'
      description: 'Stage 5 review: changes-panel.test.js line 704 asserts the render source contains scrollIntoView({ block: center }) and css-theme-audit.test.js line 613 lists the walk class; the TDD IMP-5 names neither. Both must follow the change.'
      impact: 'medium'
      recommendation: 'task-003 updates the regular expression of changes-panel.test.js to block nearest and adds the changes-walkbar class to the audit entry of css-theme-audit.test.js (background and border use theme variables); the test is edited with the change, not weakened.'
    - id: gap-003
      type: 'ambiguity'
      description: 'Option B is underspecified in the TDD (what scrolls, what the max-height is).'
      impact: 'low'
      recommendation: 'Option B is only built if task-004 measures above 35 percent. Its form is then: ul.change-list scrolls inside the panel (overflow auto, max-height from the space left under the bar) and the bar, tabs and filters stay outside it; the form is recorded in the run document and tested by the same e2e assertions.'
    - id: gap-004
      type: 'missing_requirement'
      description: 'The Plateaus page (panel alone, no tabs) is not in the TDD e2e; the sticky top differs there (ASM-3).'
      impact: 'low'
      recommendation: 'The e2e spec walks on the page Plateaus as well as on Applications (with the tabs) at both widths.'
    - id: gap-005
      type: 'ambiguity'
      description: 'Q-1 (Safari and WebKit) is deferred to the record as DEF-1 and is not a blocker; the spec runs in chromium and firefox only (CON-6).'
      impact: 'low'
      recommendation: 'Say so in the manual sentence and in the run document.'
    - id: gap-006
      type: 'ambiguity'
      description: 'Stage 9 C scan against the repository: the harbour fixture keeps its workspace file as the hidden .archicode.yaml at its root, and the TDD helper that walks the folder into the files object of serve(null, files) does not say that hidden files are included. The Stage 5 findings the TDD text still lacks (IMP-3 composition/bootstrap.js, IMP-5 the two tests, option B form, Plateaus page in the e2e) are carried by gap-001 to gap-004; the TDD was not edited, so these gaps are the reference where the two documents differ.'
      impact: 'low'
      recommendation: 'The helper of task-002 reads every file of src/test/resources/replaces-large-pair including .archicode.yaml (fs.readdirSync lists dotfiles; do not filter them), and serve(null, files) is started with that object. The plateau ids are before and after-declared (their plateau.yaml), as the TDD says.'
  blocking_gaps: []
```

## 3. Execution Graph

```yaml
execution_graph:
  nodes:
    - id: task-001
      status: 'done'
      title: 'Write the node markup test and see it fail on the unfixed page'
      depends_on: []
      produces:
        - 'src/test/javascript/viewpoint-kernel/walk-bar.test.js'
        - 'the failing output in the run document'
      agent_role: 'Test Generation Agent'
      autonomy: 'autonomous'
      risk: 'low'
      confidence: 85
    - id: task-002
      status: 'done'
      title: 'Write the e2e walk spec and see it fail on the unfixed page'
      depends_on: []
      produces:
        - 'src/test/e2e/changes-walk.spec.js'
        - 'the failing output in the run document'
      agent_role: 'Test Generation Agent'
      autonomy: 'autonomous'
      risk: 'medium'
      confidence: 70
    - id: task-003
      status: 'done'
      title: 'Split the walk bar, style it sticky, measure it, scroll to nearest, rebuild the page'
      depends_on: [task-001, task-002]
      produces:
        - 'src/main/editor/presentation/changes-panel.js'
        - 'src/main/editor/presentation/right-panel.js'
        - 'src/main/editor/composition/render.js'
        - 'src/main/editor/composition/bootstrap.js'
        - 'src/main/editor/style.css'
        - 'src/main/editor/names.json'
        - 'src/main/resources/editor-webapp/standalone.html'
      agent_role: 'Frontend Implementation Agent'
      autonomy: 'autonomous'
      risk: 'medium'
      confidence: 75
    - id: task-004
      status: 'done'
      title: 'Measure the sticky share at 360 x 640 and decide option A or B'
      depends_on: [task-003]
      produces:
        - 'the measure and the verdict in run-0201-sticky-walk-bar.md'
        - 'option B in style.css only if the share is above 35 percent'
      agent_role: 'QA Agent'
      autonomy: 'autonomous'
      risk: 'medium'
      confidence: 70
    - id: task-005
      status: 'done'
      title: 'Update CLAUDE.md and the manual'
      depends_on: [task-004]
      produces:
        - 'CLAUDE.md'
        - 'src/doc/README.adoc'
      agent_role: 'Documentation Agent'
      autonomy: 'autonomous'
      risk: 'low'
      confidence: 85
    - id: task-006
      status: 'done'
      title: 'Run the gate commands and the negative run'
      depends_on: [task-004, task-005]
      produces:
        - 'the verdicts of the gate commands in the prg'
      agent_role: 'QA Agent'
      autonomy: 'autonomous'
      risk: 'low'
      confidence: 80
  edges:
    - from: task-001
      to: task-003
      reason: 'the markup test is the red test the change turns green'
    - from: task-002
      to: task-003
      reason: 'the e2e spec is the red test the change turns green'
    - from: task-003
      to: task-004
      reason: 'the share is measured on the built page'
    - from: task-004
      to: task-005
      reason: 'the documents state the verdict and the measure'
    - from: task-005
      to: task-006
      reason: 'the gate commands judge the final tree'
```

## 4. Task Catalog

```yaml
task_catalog:
  tasks:
    - id: task-001
      title: 'Write the node markup test and see it fail on the unfixed page'
      source_requirements:
        prd:
          - 'REQ-4'
        tdd:
          - 'Observability and Verification, Node'
          - 'CTR-1'
      outputs:
        - 'src/test/javascript/viewpoint-kernel/walk-bar.test.js on the harness of reading-changes.test.js: renderChangesPanelHtml on the replaces-large-pair comparison has one [data-changes-walkbar], a direct child of .changes-panel, outside .changes-reading, holding the two data-action buttons and .changes-position'
        - 'the same file: a comparison with no change renders no walk bar; the writers of Plateaus, Applications, Environments, Elements and Stories (with a view, and a story right panel) return a panel that contains the bar'
      verification:
        - 'node --test src/test/javascript/viewpoint-kernel/walk-bar.test.js exits non-zero on the unfixed page, and the failing assertions are copied into the run document'
        - 'npm run format:check passes on the new file'
      risk: 'low'
      confidence: 85
      human_review: 'none'
      escalation_triggers:
        - 'a page-level writer cannot be called from the harness: record which and cover it through the e2e spec only'
      delegation_tier: 'standard'
      results: "tier standard, model sonnet, effort medium, profile low-cost, passed first time, inline (leaf), independently verified"
    - id: task-002
      title: 'Write the e2e walk spec and see it fail on the unfixed page'
      source_requirements:
        prd:
          - 'REQ-1'
          - 'REQ-2'
        tdd:
          - 'Observability and Verification, e2e'
          - 'FLOW-1'
          - 'CON-5'
      outputs:
        - 'src/test/e2e/changes-walk.spec.js: serve the files of src/test/resources/replaces-large-pair (a helper walks the folder into the files object of serve), draw after-declared compared with before, press Next change thirty times at 1280 x 800 (page.setViewportSize) and at 360 x 640, on Applications and on Plateaus'
        - 'after each press wait for .change-row.selected, then assert the button boundingBox is inside the #panel-right box and the selected row top is at or below the bottom of the sticky block (tabs and bar)'
      verification:
        - 'run the spec against the packaged jar built from the unfixed page (npx playwright test src/test/e2e/changes-walk.spec.js --project=chromium) and see it fail; copy the failure into the run document'
        - 'npm run lint and npm run format:check pass on the spec'
      risk: 'medium'
      confidence: 70
      human_review: 'none'
      escalation_triggers:
        - 'the 360-change fixture cannot be opened through the band in the browser: use the address with plateau and compare and record it'
        - 'a timing dependence appears: wait on the selected row, never on a delay (CON-5)'
      delegation_tier: 'standard'
      results: "tier standard, model sonnet, effort medium, profile low-cost, passed first time, inline (leaf), independently verified"
    - id: task-003
      title: 'Split the walk bar, style it sticky, measure it, scroll to nearest, rebuild the page'
      source_requirements:
        prd:
          - 'REQ-1'
          - 'REQ-2'
          - 'REQ-4'
          - 'REQ-5'
        tdd:
          - 'Proposed Design'
          - 'IMP-1 to IMP-4'
          - 'DEC-1, DEC-2, DEC-4'
          - 'CON-1 to CON-4, CON-7'
      outputs:
        - 'renderChangesReadingHtml closes .changes-reading after the filters and the status and returns the walk row as the sibling div.changes-walkbar[data-changes-walkbar] holding the unchanged .changes-walk; no bar for an empty list'
        - 'style.css: .changes-walkbar sticky, top calc(-1rem + var(--right-tabs-h, 0px)), z-index below the tabs, theme background and border; .right-panel scroll-padding-top from --right-tabs-h and --right-walk-h'
        - 'presentation/right-panel.js: syncRightPanelSticky() sets the two custom properties on #panel-right (0 when absent), called at the end of refreshRightPanel; composition/render.js calls it after the panel is written and before the scroll step, which uses block nearest; composition/bootstrap.js calls it on resize'
        - 'names.json rewritten by node scripts/check-editor.mjs --write-names; changes-panel.test.js and css-theme-audit.test.js follow the change (gap-002); no modelsChanged(), no address key, no render() call below composition/'
        - 'standalone.html rebuilt by npm run editor:build'
      verification:
        - 'node --test src/test/javascript/viewpoint-kernel/walk-bar.test.js reading-changes.test.js changes-shortcut.test.js changes-panel.test.js css-theme-audit.test.js passes'
        - 'npm run editor:build then npm run editor:check exits 0 and ratchet.max in src/main/editor/layers.json is not above 99'
        - 'npm run format:check and npm run lint exit 0'
        - 'after ./mvnw package -Dmaven.test.skip -Dplugin.asciidoctor.skip=true, npx playwright test src/test/e2e/changes-walk.spec.js --project=chromium --project=firefox passes'
        - 'node --test src/test/javascript/viewpoint-kernel/browser-apis.test.js passes (scroll-padding-top is inside the support floor)'
      risk: 'medium'
      confidence: 75
      human_review: 'none'
      escalation_triggers:
        - 'a test other than the two named fails because it selects the buttons inside .changes-reading: update the selector, not the behavior, and log it'
        - 'ratchet.max would rise: move the helper to a lower layer instead'
        - 'the e2e still fails after two attempts: record the measured boxes and stop for the main agent'
      delegation_tier: 'standard'
      results: "tier standard, model sonnet, effort medium, profile low-cost, passed first time, inline (leaf), independently verified"
    - id: task-004
      title: 'Measure the sticky share at 360 x 640 and decide option A or B'
      source_requirements:
        prd:
          - 'REQ-3'
        tdd:
          - 'FLOW-2'
          - 'DEC-3'
          - 'RISK-1'
      outputs:
        - 'a section of run-0201-sticky-walk-bar.md with tabs plus bar height, panel height, the share and the verdict (A at most 35 percent)'
        - 'only if the share is above 35 percent: option B in style.css (gap-003 form), the share measured again and the spec green'
      verification:
        - 'the e2e spec or a one-shot playwright script prints stickyHeight and panelHeight at 360 x 640 and the numbers are written in the run document'
        - 'when B is built, npx playwright test src/test/e2e/changes-walk.spec.js --project=chromium --project=firefox passes again and npm run editor:check exits 0'
      risk: 'medium'
      confidence: 70
      human_review: 'none'
      escalation_triggers:
        - 'B is also above 35 percent: record both measures and the decision, do not shrink the bar by hiding the position'
      delegation_tier: 'standard'
      results: "tier standard, model sonnet, effort medium, profile low-cost, passed first time, inline (leaf), independently verified"
    - id: task-005
      title: 'Update CLAUDE.md and the manual'
      source_requirements:
        prd:
          - 'REQ-6'
        tdd:
          - 'IMP-6'
      outputs:
        - 'CLAUDE.md: the paragraph on the Changes list says the walk row is sticky under the tabs (data-changes-walkbar), scrolls the selected row with block nearest, and the measure and verdict of task-004'
        - 'src/doc/README.adoc: [[editor-changes-panel]] and [[editor-small-screen]] say the same for a reader, and that Safari is not proved'
      verification:
        - 'grep -n "changes-walkbar" CLAUDE.md returns a line and grep -n "walk" src/doc/README.adoc shows the new sentences under both anchors'
        - 'npm run format:check passes'
      risk: 'low'
      confidence: 85
      human_review: 'none'
      escalation_triggers:
        - 'an anchor named in the TDD is missing from README.adoc: find the nearest section and log it'
      delegation_tier: 'cheap'
      results: "tier cheap, model haiku, effort high, profile low-cost, passed first time, inline (leaf), independently verified"
    - id: task-006
      title: 'Run the gate commands and the negative run'
      source_requirements:
        prd:
          - 'REQ-5'
        tdd:
          - 'Observability and Verification, Commands'
      outputs:
        - 'the verdicts of the commands in the prg'
        - 'the negative run on the unfixed page recorded once (task-001 and task-002 outputs)'
      verification:
        - 'npm run editor:build then npm run editor:check, npm run test:unit, npm run lint and npm run format:check all exit 0'
        - './mvnw verify exits 0 and npm run test:e2e exits 0 after the package (chromium, firefox, webkit as configured)'
      risk: 'low'
      confidence: 80
      human_review: 'none'
      escalation_triggers:
        - 'the one test that compares the page with HEAD fails only because the change is uncommitted: record it, as earlier runs did'
      delegation_tier: 'standard'
      results: "tier standard, model sonnet, effort medium, profile low-cost, passed after escalation to effort high, inline (leaf), independently verified"
```

## 5. Parallelization Plan

```yaml
parallelization_plan:
  groups:
    - id: parallel-group-001
      tasks:
        - task-001
        - task-002
      reason: 'the node test and the e2e spec are separate new files and read no output of each other'
      conflict_risks:
        - 'both run against the unfixed page: neither edits src/main/editor'
```

## 6. Human Review Gates

```yaml
human_review_gates:
  gates: []
```

No gate. The run operates under the autonomy override of complete-run, and no task is flagged for a human. The one judgment the wave asks for, option A or B, is a measured rule (35 percent), decided by task-004 and logged in the run document.

## 7. Risk Assessment

```yaml
risk_assessment:
  by_task:
    - id: task-001
      risk: 'low'
      rationale: 'a new test file on markup the harness already renders'
    - id: task-002
      risk: 'medium'
      rationale: 'layout is checked in a real browser with one worker and no retry; a flaky wait would be a defect of the test'
    - id: task-003
      risk: 'medium'
      rationale: 'sticky inside a scroll container, a changed scroll step shared by other callers (RISK-4), a generated page'
    - id: task-004
      risk: 'medium'
      rationale: 'the measure may force option B, a second layout change'
    - id: task-005
      risk: 'low'
      rationale: 'prose in two files'
    - id: task-006
      risk: 'low'
      rationale: 'commands only'
  by_area:
    - area: 'ui'
      risk: 'medium'
      rationale: 'a view-only change in one panel; Safari not proved'
    - area: 'docs'
      risk: 'low'
      rationale: 'two files'
    - area: 'data'
      risk: 'low'
      rationale: 'no saved file, address, cache key or kernel contract changes'
```

## 8. Confidence Assessment

```yaml
confidence_assessment:
  by_task:
    - id: task-001
      score: 85
      rationale: 'the harness of reading-changes.test.js is the model'
    - id: task-002
      score: 70
      rationale: 'no spec has 360 changes yet; the fixture folder is read into serve for the first time'
    - id: task-003
      score: 75
      rationale: 'the design is small but the Stage 5 review found two tests and one path (refreshRightPanel) that the first TDD missed'
    - id: task-004
      score: 70
      rationale: 'the estimate is 85 to 115 px of 320 px; the real share is unknown until measured'
    - id: task-005
      score: 85
      rationale: 'prose from the TDD and the measure'
    - id: task-006
      score: 80
      rationale: 'the commands are known; the e2e needs a packaged jar and browsers on the machine'
```

## 9. Agent Assignment Plan

```yaml
agent_assignment_plan:
  assignments:
    - task_id: task-001
      agent_role: 'Test Generation Agent'
      objective: 'Write walk-bar.test.js so that it fails on the current page and states CTR-1.'
      context:
        prd_excerpts:
          - 'REQ-4: an empty list renders no sticky block beyond the tabs; every page that writes the Changes list gets the bar from renderChangesPanelHtml'
        tdd_excerpts:
          - 'CTR-1: .changes-reading holds filters and status; [data-changes-walkbar] is its following sibling under .changes-panel and holds .changes-walk'
      likely_files:
        - 'src/test/javascript/viewpoint-kernel/walk-bar.test.js'
        - 'src/test/javascript/viewpoint-kernel/reading-changes.test.js'
      acceptance_criteria:
        - 'the test fails on the unfixed page for the right reason (no [data-changes-walkbar])'
      verification:
        - 'node --test on the file, then npm run format:check'
      escalation_triggers:
        - 'a writer cannot be called from the harness'
      suggested_subagent_type: 'general-purpose'
      suggested_model: '(default)'
      suggested_effort: 'low'
    - task_id: task-002
      agent_role: 'Test Generation Agent'
      objective: 'Write changes-walk.spec.js that walks thirty changes and asserts the boxes, and see it fail on the unfixed jar.'
      context:
        prd_excerpts:
          - 'REQ-1 and REQ-2: buttons inside the panel box and the selected row below the sticky block after each press, at 1280 and 360 px'
        tdd_excerpts:
          - 'e2e: serve the harbour files, draw after-declared compared with before, wait for .change-row.selected after each press (CON-5)'
      likely_files:
        - 'src/test/e2e/changes-walk.spec.js'
        - 'src/test/e2e/fixtures.js'
        - 'src/test/e2e/harness.js'
        - 'src/test/resources/replaces-large-pair'
      acceptance_criteria:
        - 'the spec fails on the unfixed jar with the measured boxes in the message'
      verification:
        - 'npx playwright test src/test/e2e/changes-walk.spec.js --project=chromium; npm run lint'
      escalation_triggers:
        - 'the comparison cannot be opened'
      suggested_subagent_type: 'general-purpose'
      suggested_model: '(default)'
      suggested_effort: 'medium'
    - task_id: task-003
      agent_role: 'Frontend Implementation Agent'
      objective: 'Make the two red tests green with the smallest change of the parts, then rebuild the page.'
      context:
        prd_excerpts:
          - 'REQ-1, REQ-2, REQ-4, REQ-5'
        tdd_excerpts:
          - 'Proposed Design: markup, CSS, measuring, scroll step'
          - 'CON-3: ratchet.max not above 99; CON-4: nothing below composition/ calls render()'
      likely_files:
        - 'src/main/editor/presentation/changes-panel.js'
        - 'src/main/editor/presentation/right-panel.js'
        - 'src/main/editor/composition/render.js'
        - 'src/main/editor/composition/bootstrap.js'
        - 'src/main/editor/style.css'
        - 'src/main/editor/names.json'
        - 'src/test/javascript/viewpoint-kernel/changes-panel.test.js'
        - 'src/test/javascript/viewpoint-kernel/css-theme-audit.test.js'
      acceptance_criteria:
        - 'walk-bar.test.js and the changes tests pass; editor:check exits 0; the e2e passes in chromium and firefox'
      verification:
        - 'npm run editor:build, npm run editor:check, npm run lint, npm run format:check, the node tests named in the task'
      escalation_triggers:
        - 'ratchet.max would rise'
      suggested_subagent_type: 'general-purpose'
      suggested_model: '(default)'
      suggested_effort: 'medium'
    - task_id: task-004
      agent_role: 'QA Agent'
      objective: 'Measure tabs plus bar over the panel at 360 x 640, write the number and the verdict, build option B only above 35 percent.'
      context:
        prd_excerpts:
          - 'REQ-3: A at most 35 percent, otherwise B built instead, with the measure'
        tdd_excerpts:
          - 'FLOW-2 and DEC-3'
      likely_files:
        - 'src/test/e2e/changes-walk.spec.js'
        - 'src/main/editor/style.css'
        - 'docs/wav/wav-027-editor-layout-and-walk/run/run-0201-sticky-walk-bar/run-0201-sticky-walk-bar.md'
      acceptance_criteria:
        - 'the run document holds the three numbers and the verdict'
      verification:
        - 'the spec or script output; the e2e green again if B was built'
      escalation_triggers:
        - 'B is also above 35 percent'
      suggested_subagent_type: 'general-purpose'
      suggested_model: '(default)'
      suggested_effort: 'medium'
    - task_id: task-005
      agent_role: 'Documentation Agent'
      objective: 'Describe the sticky walk bar in CLAUDE.md and the manual.'
      context:
        prd_excerpts:
          - 'REQ-6'
        tdd_excerpts:
          - 'IMP-6'
      likely_files:
        - 'CLAUDE.md'
        - 'src/doc/README.adoc'
      acceptance_criteria:
        - 'both files say sticky, nearest, the measure and that Safari is not proved'
      verification:
        - 'grep for the new sentences; npm run format:check'
      escalation_triggers:
        - 'an anchor is missing'
      suggested_subagent_type: 'general-purpose'
      suggested_model: 'haiku'
      suggested_effort: 'low'
    - task_id: task-006
      agent_role: 'QA Agent'
      objective: 'Run the gate commands on the final tree and record the verdicts.'
      context:
        prd_excerpts:
          - 'REQ-5'
        tdd_excerpts:
          - 'Observability and Verification, Commands'
      likely_files:
        - 'docs/wav/wav-027-editor-layout-and-walk/run/run-0201-sticky-walk-bar/prg-0201-sticky-walk-bar.md'
      acceptance_criteria:
        - 'every command exits 0, or the one known uncommitted-page test is named'
      verification:
        - 'the commands of the task'
      escalation_triggers:
        - 'a failure that is not the known one'
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
        - 'node --test on the new file, red on the unfixed page'
        - 'format check'
      success_criteria:
        - 'the failure names the missing [data-changes-walkbar]'
    - task_id: task-002
      methods:
        - 'playwright spec on the unfixed jar, red'
        - 'lint and format check'
      success_criteria:
        - 'the failure shows a button box outside the panel box'
    - task_id: task-003
      methods:
        - 'node tests of the changes panel'
        - 'editor:build and editor:check'
        - 'lint and format check'
        - 'playwright spec in chromium and firefox on the rebuilt jar'
        - 'browser-apis.test.js'
      success_criteria:
        - 'all green; ratchet.max not above 99; the page is the assembly of its parts'
    - task_id: task-004
      methods:
        - 'measured heights at 360 x 640'
      success_criteria:
        - 'share and verdict written; at most 35 percent for A, else B built and measured'
    - task_id: task-005
      methods:
        - 'grep of the new sentences'
        - 'format check'
      success_criteria:
        - 'both files describe the bar, the scroll rule and the Safari limit'
    - task_id: task-006
      methods:
        - 'editor:check, test:unit, lint, format:check'
        - './mvnw verify and npm run test:e2e'
      success_criteria:
        - 'every command exits 0 or the known uncommitted-page test is named'
```

## 11. Escalation Rules

```yaml
escalation_rules:
  rules:
    - condition: 'A task fails its own verification'
      action: 'Re-dispatch it once one effort step up with the failing output; a second failure is handled inline by the main agent and logged as a finding in the prg.'
    - condition: 'ratchet.max would rise above 99'
      action: 'Move the new helper to a lower layer; never raise the ratchet.'
    - condition: 'Option A is above 35 percent of the panel at 360 x 640'
      action: 'Build option B as gap-003 describes, measure again, record both numbers.'
    - condition: 'A plan task would be human_required or a gate would be needed'
      action: 'None is. The run operates under the autonomy override of complete-run: if one appears, the main agent executes it and the override is logged in the prg.'
    - condition: 'A test other than those named fails because of the markup split'
      action: 'Update its selector to follow CTR-1, keep its meaning, log the file.'
    - condition: 'Safari behavior is asked for'
      action: 'It is DEF-1 and not proved; say so in the manual and the run document.'
```

## 12. Final Execution Manifest

```yaml
execution_manifest:
  status: 'done'
  recommendation: 'proceed'
  autonomy_level: 'high'
  total_tasks: 6
  autonomous_tasks: 6
  review_before_tasks: 0
  review_after_tasks: 0
  human_required_tasks: 0
  blocked_tasks: 0
  critical_path_tasks:
    - task-002
    - task-003
    - task-004
    - task-005
    - task-006
  parallel_groups:
    - parallel-group-001
  required_human_gates: []
  highest_risk_tasks:
    - task-003
    - task-004
  lowest_confidence_tasks:
    - task-002
    - task-004
  next_action: 'Run task-001 and task-002 in parallel (red tests on the unfixed page), then task-003.'
  criteria:
    - 'the node test and the e2e spec fail before the change and pass after it'
    - 'the share at 360 x 640 and the verdict A or B are in the run document'
    - 'editor:check, test:unit, lint and format:check pass with ratchet.max not above 99'
    - 'CLAUDE.md and the manual describe the sticky walk bar'
```
