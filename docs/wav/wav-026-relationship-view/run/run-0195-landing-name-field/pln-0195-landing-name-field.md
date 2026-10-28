---
title: Execution Plan — Landing name field
status: done
date: 2026-10-28
related:
  - docs/wav/wav-026-relationship-view/run/run-0195-landing-name-field/tdd-0195-landing-name-field.md
  - 'gh:tmorin/archicode#177'
type: pln
run: 0195
wave: 026
---

# Execution Plan: Landing name field

Profile TDD+pln: there is no PRD, so the requirement IDs REQ-1 to REQ-4 are the ones the TDD labels (section "PRD Traceability"), taken from #177 and the wave manifest. The run operates under the autonomy override of complete-run: a task that would otherwise stop for a human is executed by an agent and the override is logged in the prg. No task below is `human_required`.

## 1. Executive Summary

```yaml
summary:
  status: 'done'
  product_goal: 'The name field of New workspace in this browser and of Rename is one line high and fills its label, at desktop width and at 360 px, in Chromium, Firefox and WebKit (#177).'
  technical_approach: 'Write the e2e measurement first and see it fail on the unfixed page, replace the flex basis of .landing-browser-input in style.css by width 100 percent, rebuild the generated page, run the gate commands and look at the card once at 1280 and 360 px.'
  total_tasks: 4
  parallel_groups: 0
  high_risk_tasks: 0
  human_review_gates: 0
  autonomy_level: 'high'
  recommendation: 'proceed'
  criteria:
    - 'the new e2e test fails on the page built from the unfixed style.css (measured height recorded in the run document) and passes in chromium, firefox and webkit after the fix'
    - 'standalone.html is the output of npm run editor:build and npm run editor:check passes with ratchet.max in src/main/editor/layers.json not above 99'
    - 'npm run test:unit, npm run lint and npm run format:check pass, apart from the one test that compares the page with HEAD while the change is uncommitted (recorded if it occurs)'
    - 'the look at 1280 and 360 px is recorded in the run document'
```

## 2. PRD/TDD Consistency Assessment

```yaml
consistency_assessment:
  aligned_items:
    - 'REQ-1 to REQ-4 are each addressed by a TDD goal (TG-1 to TG-4) and by a task below'
    - 'style.css lines 131 to 134 and renderBrowserNameFieldHtml in presentation/landing.js exist as the TDD describes'
  gaps:
    - id: gap-001
      type: 'contradiction'
      description: 'The Stage 5 review (prg, 2026-10-28) found corrections the TDD does not carry yet: the textbox fills in browser-workspace.spec.js are at lines 44 and 98 (the TDD says 39 and 97); the viewport of the projects is the device of each project, not 1280 x 800, so the width must be set with page.setViewportSize; the rename form sits in li.landing-folder as an auto-sized flex item, so its width is the label basis of 10rem and not the full row; the 360 px scroll check on document.scrollWidth misses the rename row; the DEC-1 alternative (a) is equivalent to the chosen rule; the flex default is 0 1 auto, not none.'
      impact: 'medium'
      recommendation: 'The plan follows the review and the TDD is not binding where it differs: the width assertion is an absolute minimum of about 140 px (not half the form), the input right edge is asserted inside the card box at 360 px as well as the document scroll width, and the viewport is set explicitly.'
    - id: gap-002
      type: 'ambiguity'
      description: 'The TDD says the field fills the row in the rename case; with the label at flex 1 1 10rem in an auto-sized form the field is about 160 px wide there, which is what REQ-1 can ask for.'
      impact: 'low'
      recommendation: 'Assert one line of height and a usable minimum width for the rename field; do not assert that it fills the list row.'
    - id: gap-003
      type: 'inaccuracy'
      description: 'Stage 9 repository spot-check: the plan named the helpers of hosted.js as the way to open the card with an empty store; the page is served by the hosted fixture of fixtures.js (startHostedPage in harness.js) and hosted.js holds the sample helpers only. All other likely_files, rules (style.css lines 131 to 134, renderBrowserNameFieldHtml at landing.js line 159, ratchet.max 99, Escape cancelling the name field) and spec lines (44 and 98) exist as stated.'
      impact: 'low'
      recommendation: 'task-001 uses the hosted fixture and the page, hosted and browserName parameters as the existing test does; the wording is corrected in task-001.'
  blocking_gaps: []
```

## 3. Execution Graph

```yaml
execution_graph:
  nodes:
    - id: task-001
      status: 'done'
      title: 'Write the e2e field measurement and see it fail on the unfixed page'
      depends_on: []
      produces:
        - 'src/test/e2e/browser-workspace.spec.js'
        - 'the failing output in the run document'
      agent_role: 'Test Generation Agent'
      autonomy: 'autonomous'
      risk: 'low'
      confidence: 80
    - id: task-002
      status: 'done'
      title: 'Fix the input rule and rebuild the page'
      depends_on: [task-001]
      produces:
        - 'src/main/editor/style.css'
        - 'src/main/resources/editor-webapp/standalone.html'
      agent_role: 'Frontend Implementation Agent'
      autonomy: 'autonomous'
      risk: 'low'
      confidence: 90
    - id: task-003
      status: 'done'
      title: 'Run the e2e test in three engines and the gate commands'
      depends_on: [task-002]
      produces:
        - 'a section Checks of run-0195-landing-name-field.md'
      agent_role: 'QA Agent'
      autonomy: 'autonomous'
      risk: 'low'
      confidence: 75
    - id: task-004
      status: 'done'
      title: 'Look at the card at 1280 and 360 px and check the documentation'
      depends_on: [task-003]
      produces:
        - 'a section Look of run-0195-landing-name-field.md'
      agent_role: 'QA Agent'
      autonomy: 'autonomous'
      risk: 'low'
      confidence: 70
  edges:
    - from: task-001
      to: task-002
      reason: 'the test is written first and must fail on the unfixed rule'
    - from: task-002
      to: task-003
      reason: 'the checks run on the fix and the rebuilt page'
    - from: task-003
      to: task-004
      reason: 'the look uses the built page'
```

## 4. Task Catalog

```yaml
task_catalog:
  tasks:
    - id: task-001
      title: 'Write the e2e field measurement and see it fail on the unfixed page'
      source_requirements:
        prd:
          - 'REQ-2'
          - 'REQ-3'
        tdd:
          - 'DEC-2'
          - 'DEC-3'
          - 'IMP-3'
          - 'TG-3'
      outputs:
        - 'src/test/e2e/browser-workspace.spec.js gains a helper expectOneLineField(page, input, card) and one new test that opens the hosted page with an empty store (the `hosted` fixture of fixtures.js, which starts startHostedPage of harness.js; no JVM), for each width of 1280 and 360 px set with page.setViewportSize, presses New workspace in this browser, waits for the textbox with toBeVisible, then measures it'
        - 'the helper reads boundingBox and, through locator.evaluate, getComputedStyle lineHeight, paddingTop, paddingBottom, borderTopWidth, borderBottomWidth and fontSize, turns a line-height of normal into 1.5 times the font size, and expects height at most line + paddings + borders + 2; it expects width at least 140 px; at 360 px it expects the input right edge inside the card box and document scrollWidth at most clientWidth'
        - 'the test then creates a workspace, closes it, presses Rename, waits for the textbox and measures it the same way, then presses Escape; the existing test is unchanged'
        - 'the failing output (measured height) is recorded in the run document before the fix'
      verification:
        - 'npx playwright test src/test/e2e/browser-workspace.spec.js --project=chromium exits non-zero on the unfixed built page and the message names a height near 160 px'
        - 'npx prettier --check and npx eslint on src/test/e2e/browser-workspace.spec.js exit 0'
      risk: 'low'
      confidence: 80
      human_review: 'none'
      escalation_triggers:
        - 'the jar or the Playwright browsers are missing, so the red run cannot be made'
        - 'the height on the unfixed page is not near the 10rem fault (the cause of ASM-1 is wrong)'
      delegation_tier: 'standard'
      results: "tier standard, model sonnet, effort medium, profile low-cost, passed first time, inline (leaf), independently verified"
    - id: task-002
      title: 'Fix the input rule and rebuild the page'
      source_requirements:
        prd:
          - 'REQ-1'
          - 'REQ-3'
          - 'REQ-4'
        tdd:
          - 'DEC-1'
          - 'IMP-1'
          - 'IMP-2'
          - 'TG-1'
          - 'TG-2'
      outputs:
        - 'style.css: .landing-browser-input becomes width 100 percent, min-width 0, box-sizing border-box (flex and max-width removed), with one comment line saying why the basis must not come back; the label and the form rules and the markup are unchanged'
        - 'npm run format then npm run editor:build; standalone.html is the new assembly'
      verification:
        - 'grep -n "landing-browser-input" src/main/editor/style.css shows no flex declaration on that rule'
        - 'npm run editor:check exits 0 and git diff --stat src/main/editor/names.json is empty'
        - 'npx prettier --check src/main/editor/style.css exits 0'
      risk: 'low'
      confidence: 90
      human_review: 'none'
      escalation_triggers:
        - 'the field is still taller than one line after the fix (the cause is in a rule the TDD did not find)'
        - 'ratchet.max would have to rise'
      delegation_tier: 'standard'
      results: "tier standard, model sonnet, effort medium, profile low-cost, passed first time, inline (leaf), independently verified"
    - id: task-003
      title: 'Run the e2e test in three engines and the gate commands'
      source_requirements:
        prd:
          - 'REQ-2'
          - 'REQ-4'
        tdd:
          - 'Observability and Verification'
      outputs:
        - 'a section Checks of run-0195-landing-name-field.md with the output lines of: the e2e test with --project=chromium --project=firefox --project=webkit, npm run test:unit, npm run lint, npm run format:check, npm run editor:check, and the ratchet.max value'
        - 'if the test that compares the page with HEAD fails only because the change is uncommitted, say so; no commit is made by this workflow'
      verification:
        - 'npx playwright test src/test/e2e/browser-workspace.spec.js --project=chromium --project=firefox --project=webkit exits 0'
        - 'npm run lint exits 0'
        - 'npm run format:check exits 0'
        - 'npm run editor:check exits 0 and grep -n "max" src/main/editor/layers.json shows ratchet.max at most 99'
        - 'npm run test:unit exits 0, or fails only in the real-page --statements HEAD test, named in the section'
      risk: 'low'
      confidence: 75
      human_review: 'none'
      escalation_triggers:
        - 'a test fails that is unrelated to the landing card and not the HEAD comparison'
        - 'a flaky margin in the height assertion in firefox or webkit: widen the margin, never retry'
      delegation_tier: 'standard'
      results: "tier standard, model sonnet, effort medium, profile low-cost, passed first time, inline (leaf), independently verified"
    - id: task-004
      title: 'Look at the card at 1280 and 360 px and check the documentation'
      source_requirements:
        prd:
          - 'REQ-1'
          - 'REQ-3'
        tdd:
          - 'ASM-3'
          - 'DEC-4'
          - 'IMP-4'
      outputs:
        - 'a section Look of run-0195-landing-name-field.md: the card seen in the browser pane at 1280 and at 360 px (mobile preset), the field one line, nothing scrolling sideways, where the buttons sit at 360 px; or a statement that the look was not done and why'
        - 'the result of grep -rn "landing-browser" CLAUDE.md src/doc, and a change only if a sentence describes the field'
      verification:
        - 'grep -n "360 px" on the run document shows the section'
        - 'if a documentation sentence was changed, npm run format:check exits 0'
      risk: 'low'
      confidence: 70
      human_review: 'none'
      escalation_triggers:
        - 'the editor cannot be served or the hosted page opened: record that the look was not done and leave the e2e test as the evidence, do not claim it'
        - 'the look at 360 px shows the buttons unreachable'
      delegation_tier: 'cheap'
      results: "tier cheap, model haiku, effort high, profile low-cost, passed first time, inline (leaf), independently verified"
```

## 5. Parallelization Plan

```yaml
parallelization_plan:
  groups: []
```

No group: the plan is a chain. The conflict risk of the serial run is the run document, written by the three last tasks in turn.

## 6. Human Review Gates

```yaml
human_review_gates:
  gates: []
```

No gate: the change is view-only (CSS) and guarded by an e2e test. The run operates under the autonomy override of complete-run; no task is `human_required`, so the override is not exercised.

## 7. Risk Assessment

```yaml
risk_assessment:
  by_task:
    - id: task-001
      risk: 'low'
      rationale: 'test file only'
    - id: task-002
      risk: 'low'
      rationale: 'one CSS rule; nothing saved, no address, no cache key (TG-4)'
    - id: task-003
      risk: 'low'
      rationale: 'runs commands and writes the run document'
    - id: task-004
      risk: 'low'
      rationale: 'a look in a browser; at most a documentation sentence'
  by_area:
    - area: 'ui'
      risk: 'low'
      rationale: 'engines size the input differently (RISK-1), covered by the three-engine run'
    - area: 'tests'
      risk: 'low'
      rationale: 'a margin too tight could flake in CI (RISK-2); no retry exists, so the margin is widened if it happens'
```

## 8. Confidence Assessment

```yaml
confidence_assessment:
  by_task:
    - id: task-001
      score: 80
      rationale: 'the spec and the hosted helpers exist; the exact way to open the card with an empty store is read from the existing test'
    - id: task-002
      score: 90
      rationale: 'one rule; the stale-page risk is caught by editor:check'
    - id: task-003
      score: 75
      rationale: 'three browsers and the full unit suite; the HEAD comparison test may fail while uncommitted'
    - id: task-004
      score: 70
      rationale: 'depends on the browser pane and a servable page'
```

## 9. Agent Assignment Plan

```yaml
agent_assignment_plan:
  assignments:
    - task_id: task-001
      agent_role: 'Test Generation Agent'
      objective: 'Write the failing e2e measurement of the name field for both forms at two widths.'
      context:
        prd_excerpts:
          - 'REQ-2: field no taller than a line plus padding, desktop and 360 px, three engines'
        tdd_excerpts:
          - 'DEC-2: measure with a margin; the review sets an absolute minimum width and a card-box check at 360 px'
      likely_files:
        - 'src/test/e2e/browser-workspace.spec.js'
      acceptance_criteria:
        - 'the test fails on the unfixed page with the measured height in the message'
        - 'the existing test is unchanged'
      verification:
        - 'playwright run in chromium, expected red'
        - 'prettier --check and eslint'
      escalation_triggers:
        - 'no jar or browsers to run it'
      suggested_subagent_type: 'general-purpose'
      suggested_model: '(default)'
      suggested_effort: 'medium'
    - task_id: task-002
      agent_role: 'Frontend Implementation Agent'
      objective: 'Replace the flex basis of the input by width 100 percent and rebuild the page.'
      context:
        prd_excerpts:
          - 'REQ-1 and REQ-4'
        tdd_excerpts:
          - 'DEC-1: fix the input rule, not the label or the markup'
      likely_files:
        - 'src/main/editor/style.css'
        - 'src/main/resources/editor-webapp/standalone.html'
      acceptance_criteria:
        - 'no flex declaration on .landing-browser-input'
        - 'the page is rebuilt and editor:check passes'
      verification:
        - 'npm run editor:check'
        - 'prettier --check'
      escalation_triggers:
        - 'the field is still tall after the fix'
      suggested_subagent_type: 'general-purpose'
      suggested_model: '(default)'
      suggested_effort: 'low'
    - task_id: task-003
      agent_role: 'QA Agent'
      objective: 'Run the e2e test in three engines and the gate commands, record the output.'
      context:
        prd_excerpts:
          - 'REQ-2 and REQ-4'
        tdd_excerpts:
          - 'Observability and Verification'
      likely_files:
        - 'docs/wav/wav-026-relationship-view/run/run-0195-landing-name-field/run-0195-landing-name-field.md'
      acceptance_criteria:
        - 'every command of the verification list exited as stated, or the one HEAD-comparison failure is named'
      verification:
        - 'git diff --stat shows only the intended files'
      escalation_triggers:
        - 'an unrelated failure in test:unit'
      suggested_subagent_type: 'general-purpose'
      suggested_model: '(default)'
      suggested_effort: 'medium'
    - task_id: task-004
      agent_role: 'QA Agent'
      objective: 'See the card at 1280 and 360 px, record what was seen, check that no documentation sentence describes the field.'
      context:
        prd_excerpts:
          - 'REQ-1 and REQ-3'
        tdd_excerpts:
          - 'ASM-3 and DEC-4: buttons may wrap at 360 px'
      likely_files:
        - 'docs/wav/wav-026-relationship-view/run/run-0195-landing-name-field/run-0195-landing-name-field.md'
      acceptance_criteria:
        - 'the run document has a Look section, or says the look was not done and why'
      verification:
        - 'grep -n "360 px" on the run document'
      escalation_triggers:
        - 'the page cannot be served'
      suggested_subagent_type: 'Explore'
      suggested_model: 'haiku'
      suggested_effort: 'low'
```

## 10. Verification Plan

```yaml
verification_plan:
  checks:
    - task_id: task-001
      methods:
        - 'playwright test in chromium on the unfixed page, expected red'
        - 'prettier --check'
        - 'eslint'
      success_criteria:
        - 'red for the right reason (a height near 160 px), lint and format clean'
    - task_id: task-002
      methods:
        - 'grep of the rule'
        - 'npm run editor:check'
      success_criteria:
        - 'no flex on the input rule, page equals its assembly'
    - task_id: task-003
      methods:
        - 'playwright test in three projects'
        - 'npm run test:unit'
        - 'npm run lint'
        - 'npm run format:check'
        - 'npm run editor:check'
      success_criteria:
        - 'all exit 0 (the HEAD comparison excepted and named), ratchet.max at most 99'
    - task_id: task-004
      methods:
        - 'manual look in the browser pane at 1280 and 360 px'
        - 'grep of CLAUDE.md and src/doc'
      success_criteria:
        - 'the section is written with what was seen'
```

## 11. Escalation Rules

```yaml
escalation_rules:
  rules:
    - condition: 'the unfixed page does not show a field near the 10rem fault, so the cause of ASM-1 is wrong'
      action: 'stop task-002, log it in the prg as a blocker, find the rule that sizes the field before changing CSS'
    - condition: 'the retry of a failed task fails again'
      action: 'handle inline and log a finding in the prg'
    - condition: 'a change would raise ratchet.max'
      action: 'do not raise it; find the cause and log it'
    - condition: 'the plan runs under the autonomy override of complete-run'
      action: 'a human_required task, if one appears, is executed and the override is logged; none is planned'
```

## 12. Final Execution Manifest

```yaml
execution_manifest:
  status: 'done'
  recommendation: 'proceed'
  autonomy_level: 'high'
  total_tasks: 4
  autonomous_tasks: 4
  review_before_tasks: 0
  review_after_tasks: 0
  human_required_tasks: 0
  blocked_tasks: 0
  critical_path_tasks:
    - task-001
    - task-002
    - task-003
    - task-004
  parallel_groups: []
  required_human_gates: []
  highest_risk_tasks:
    - task-003
  lowest_confidence_tasks:
    - task-004
    - task-003
  next_action: 'task-001: write the failing e2e measurement and see it red'
  criteria:
    - 'the four summary criteria hold and are recorded in the run document'
```
