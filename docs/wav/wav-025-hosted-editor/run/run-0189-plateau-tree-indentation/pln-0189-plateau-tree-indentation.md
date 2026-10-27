---
title: Execution Plan — Plateau tree indentation
status: draft
date: 2026-10-27
related:
  - docs/wav/wav-025-hosted-editor/run/run-0189-plateau-tree-indentation/tdd-0189-plateau-tree-indentation.md
  - 'gh:tmorin/archicode#175'
type: pln
run: 0189
wave: 025
---

# Execution Plan: Plateau tree indentation

Profile TDD+pln: there is no PRD, so the requirement IDs REQ-1 to REQ-4 are the ones the TDD labels (Section "PRD Traceability"), taken from #175 and the wave manifest. The run operates under the autonomy override of complete-run: a task that would otherwise stop for a human is executed by an agent and the override is logged in the prg. No task below is `human_required`.

## 1. Executive Summary

```yaml
summary:
  status: 'pending'
  product_goal: 'The indentation of a plateau grows with its depth for a chain of any length, on the page Plateaus and in the two band lists, and fits at 360 px (#175).'
  technical_approach: 'Remove Math.min(depth, 6) in three places, add one rule to the existing narrow-screen media query of style.css (half step under 40rem), update the two existing tests the cap or the one-digit regex break, add a node test on a 12-plateau chain, rebuild the generated page, say it in CLAUDE.md and the manual.'
  total_tasks: 5
  parallel_groups: 0
  high_risk_tasks: 0
  human_review_gates: 0
  autonomy_level: 'high'
  recommendation: 'proceed'
  criteria:
    - 'No Math.min(depth, 6) remains in src/main/editor, and the new node test passes on a chain of 12 plateaus for the page card and both band lists'
    - 'npm run test:unit, npm run lint, npm run format:check and npm run editor:check pass, ratchet.max in src/main/editor/layers.json is not above 99'
    - 'standalone.html is the output of npm run editor:build'
    - 'the new test fails when the cap is put back (recorded in the run document), and the look at 360 px is recorded there'
    - 'CLAUDE.md and the manual say the indentation is not capped'
```

## 2. PRD/TDD Consistency Assessment

```yaml
consistency_assessment:
  aligned_items:
    - 'REQ-1 to REQ-4 are each addressed by a TDD goal (TG-1 to TG-4) and by a task below'
    - 'The sources named in the TDD (pages-plateaus-files.js line ~100, plateau-band.js lines ~60 and ~107, style.css line 177) exist as described'
  gaps:
    - id: gap-001
      type: 'contradiction'
      description: 'The TDD proposes data-depth on the li, a --timeline-step custom property and the claim that the card is never negative. The Stage 5 review (prg, 2026-10-27) found data-depth redundant, the custom property worse than one rule in the existing narrow query, and the layout overflowing near 45 levels at 360 px. The TDD was not revised.'
      impact: 'low'
      recommendation: 'The plan follows the review: no data-depth (the test reads --depth from the style attribute), the narrow step is one .timeline-item margin-left rule inside the existing max-width: 40rem block, and no claim that the card is never negative. The TDD text is not binding where it differs.'
    - id: gap-002
      type: 'missing_technical_design'
      description: 'Two existing tests are not in the TDD Repository Impact: lean-read-only-band.test.js lines 165-176 assert six em spaces for a plateau at depth 8, and editor-structure.test.js line ~425 reads --depth with a one-digit regex right after data-plateau.'
      impact: 'medium'
      recommendation: 'task-001 and task-002 update them: the first to the exact depth, the second to \d+. editor-structure.test.js line ~1112 (margin-left calc(var(--depth, 0) * 1rem) in the base rule) stays true because the base rule is unchanged.'
  blocking_gaps: []
```

## 3. Execution Graph

```yaml
execution_graph:
  nodes:
    - id: task-001
      status: 'done'
      title: 'Write the new node test and update the two existing tests (red first)'
      depends_on: []
      produces:
        - 'src/test/javascript/viewpoint-kernel/plateau-tree-indentation.test.js'
        - 'edited lean-read-only-band.test.js and editor-structure.test.js'
      agent_role: 'Test Generation Agent'
      autonomy: 'autonomous'
      risk: 'low'
      confidence: 85
    - id: task-002
      status: 'done'
      title: 'Remove the cap in the three places and add the narrow-screen rule'
      depends_on: [task-001]
      produces:
        - 'src/main/editor/presentation/pages-plateaus-files.js'
        - 'src/main/editor/presentation/plateau-band.js'
        - 'src/main/editor/style.css'
        - 'src/main/resources/editor-webapp/standalone.html'
      agent_role: 'Frontend Implementation Agent'
      autonomy: 'autonomous'
      risk: 'low'
      confidence: 85
    - id: task-003
      status: 'done'
      title: 'Say it in CLAUDE.md and the manual'
      depends_on: [task-002]
      produces:
        - 'CLAUDE.md'
        - 'src/doc/README.adoc'
      agent_role: 'Documentation Agent'
      autonomy: 'autonomous'
      risk: 'low'
      confidence: 90
    - id: task-004
      status: 'done'
      title: 'Show the test fails with the cap restored, then run the gate commands'
      depends_on: [task-002, task-003]
      produces:
        - 'results recorded in the run document'
      agent_role: 'QA Agent'
      autonomy: 'autonomous'
      risk: 'low'
      confidence: 80
    - id: task-005
      status: 'done'
      title: 'Look at 360 px in a browser and record the choice of the step'
      depends_on: [task-004]
      produces:
        - 'a section of run-0189-plateau-tree-indentation.md'
      agent_role: 'QA Agent'
      autonomy: 'autonomous'
      risk: 'low'
      confidence: 70
  edges:
    - from: task-001
      to: task-002
      reason: 'the test is written first and must fail on the capped sources'
    - from: task-002
      to: task-003
      reason: 'the documentation states what the sources now do'
    - from: task-002
      to: task-004
      reason: 'the gate runs on the changed sources and the rebuilt page'
    - from: task-003
      to: task-004
      reason: 'the format check covers the edited files'
    - from: task-004
      to: task-005
      reason: 'the look in a browser uses the built page'
```

## 4. Task Catalog

```yaml
task_catalog:
  tasks:
    - id: task-001
      title: 'Write the new node test and update the two existing tests (red first)'
      source_requirements:
        prd:
          - 'REQ-1'
          - 'REQ-2'
        tdd:
          - 'DEC-2'
          - 'IMP-5'
          - 'TG-2'
      outputs:
        - 'src/test/javascript/viewpoint-kernel/plateau-tree-indentation.test.js builds a chain of 12 plateaus with the helper the other plateau tests use (read plateau-model.test.js, lean-read-only-band.test.js and the harness first), renders the page Plateaus and both band lists, and asserts the --depth of the cards and the leading em spaces of the options are exactly 0..11, strictly increasing'
        - 'the same file asserts on the CSS text that the base .timeline-item margin-left rule (outside any media query) is defined once as depth times 1rem with no cap, and that the one max-width: 40rem block, read with the narrow() and declarationsFor() helpers of editor-at-360-px.test.js, sets a margin-left of depth times 0.5rem for .timeline-item (its base rule comes earlier in the sheet, so the narrow one wins)'
        - 'lean-read-only-band.test.js lines 165-176 assert the exact depth of step8 in both lists (eight em spaces, or the value the chain gives) instead of {6}, and their messages stop saying "up to six steps"'
        - 'editor-structure.test.js line ~425 reads the depth with \d+ instead of \d'
      verification:
        - 'node --test src/test/javascript/viewpoint-kernel/plateau-tree-indentation.test.js exits non-zero before task-002 (the cap is still there) and the failure names the depth'
        - 'npx prettier --check on the three test files exits 0'
        - 'npx eslint on the three test files exits 0'
      risk: 'low'
      confidence: 85
      human_review: 'none'
      escalation_triggers:
        - 'the harness offers no way to render the page list or a band list for a 12-plateau tree'
        - 'another existing test asserts the cap (found by grep for "Math.min", "{6}" and "--depth" under src/test)'
      delegation_tier: 'standard'
      results: 'tier standard, model sonnet, effort medium, profile low-cost, passed first time, inline (leaf), independently verified'
    - id: task-002
      title: 'Remove the cap in the three places and add the narrow-screen rule'
      source_requirements:
        prd:
          - 'REQ-1'
          - 'REQ-3'
          - 'REQ-4'
        tdd:
          - 'DEC-1'
          - 'IMP-1'
          - 'IMP-2'
          - 'IMP-3'
          - 'IMP-4'
          - 'CTR-1'
          - 'CTR-2'
      outputs:
        - 'pages-plateaus-files.js writes the depth unchanged in --depth (no Math.min, no data-depth)'
        - 'plateau-band.js uses BAND_INDENT.repeat(depth) in both lists'
        - 'style.css has one added rule .timeline-item { margin-left: calc(var(--depth, 0) * 0.5rem); } inside the existing max-width: 40rem block, and the base rule is unchanged'
        - 'standalone.html rebuilt by npm run editor:build'
      verification:
        - 'grep -rn "Math.min(depth" src/main/editor returns nothing'
        - 'node --test src/test/javascript/viewpoint-kernel/plateau-tree-indentation.test.js src/test/javascript/viewpoint-kernel/lean-read-only-band.test.js src/test/javascript/viewpoint-kernel/editor-structure.test.js exits 0'
        - 'npm run editor:check exits 0 and names.json is unchanged (git diff --stat src/main/editor/names.json is empty)'
        - 'npx prettier --check on the changed sources exits 0'
      risk: 'low'
      confidence: 85
      human_review: 'none'
      escalation_triggers:
        - 'a new top-level name or an upward pair is needed, so that ratchet.max would have to rise'
        - 'another test or the e2e suite fails on an indentation it expected'
      delegation_tier: 'standard'
      results: 'tier standard, model sonnet, effort medium, profile low-cost, passed first time, inline (leaf), independently verified'
    - id: task-003
      title: 'Say it in CLAUDE.md and the manual'
      source_requirements:
        prd:
          - 'REQ-3'
        tdd:
          - 'IMP-6'
      outputs:
        - 'CLAUDE.md: the paragraph on the band says the indentation is one em space per level with no cap, and that the page Plateaus halves its step under 40rem'
        - 'src/doc/README.adoc: one sentence at the Plateaus page (line ~1918) or in the editor-small-screen section saying the indentation grows with the depth for any chain and is half as wide on a small screen; the existing "indented by its depth" sentences stay true and are not rewritten'
      verification:
        - 'grep -n "capped\|up to six\|Math.min" CLAUDE.md src/doc/README.adoc returns nothing about the indentation'
        - 'grep -n "0.5rem\|half" CLAUDE.md src/doc/README.adoc shows the new sentence'
        - 'npm run format:check exits 0'
      risk: 'low'
      confidence: 90
      human_review: 'none'
      escalation_triggers:
        - 'the manual states a number of levels somewhere else that now contradicts the change'
      delegation_tier: 'cheap'
    - id: task-004
      title: 'Show the test fails with the cap restored, then run the gate commands'
      source_requirements:
        prd:
          - 'REQ-2'
          - 'REQ-4'
        tdd:
          - 'Observability and Verification'
      outputs:
        - 'a section "Checks" of run-0189-plateau-tree-indentation.md with the output lines of: the new test against the capped code (temporarily put Math.min(depth, 6) back in plateau-band.js, run the test, restore the file, confirm git diff shows only the intended change), npm run test:unit, npm run lint, npm run format:check, npm run editor:check, and the ratchet.max value'
        - 'one line saying scripts/byte-identity.sh was not run because the command line is untouched'
      verification:
        - 'the test run with the cap restored exits non-zero, and after the restore exits 0'
        - 'npm run test:unit exits 0'
        - 'npm run lint exits 0'
        - 'npm run format:check exits 0'
        - 'npm run editor:check exits 0 and grep -n "max" src/main/editor/layers.json shows ratchet.max at most 99'
      risk: 'low'
      confidence: 80
      human_review: 'none'
      escalation_triggers:
        - 'npm run test:unit fails on a test unrelated to the indentation'
        - 'the restore of the capped line cannot be confirmed by git diff'
      delegation_tier: 'standard'
      results: 'tier standard, effort medium, unmeetable precondition or check, no escalated retry (nothing commits in this workflow): npm run test:unit must exit 0, but "check-editor-statements.test.js: the real page: --statements HEAD passes" compares the generated page with the HEAD commit and fails while the intended editor change is uncommitted. It cannot pass without a commit, which this workflow forbids. No unrelated test failed.'
    - id: task-005
      title: 'Look at 360 px in a browser and record the choice of the step'
      source_requirements:
        prd:
          - 'REQ-3'
        tdd:
          - 'DEC-1'
          - 'Q-1'
          - 'Observability and Verification'
      outputs:
        - 'a section "360 px" of run-0189-plateau-tree-indentation.md: a copy of a workspace with a chain of ten plateaus opened with archicode editor serve, the page Plateaus and the band lists seen at 360 px (browser pane, mobile preset), what was seen, and why 0.5rem stays or what replaced it'
        - 'npm run test:e2e result, or the reason it was not run'
      verification:
        - 'the section exists in the run document and names the width, the chain length and the page seen'
        - 'if the step changed, the node test of task-001 and npm run editor:check still exit 0'
      risk: 'low'
      confidence: 70
      human_review: 'none'
      escalation_triggers:
        - 'the editor cannot be served (no jar, no JDK 25): record that the look was not done and leave the node test as the evidence, do not claim it'
        - 'the 360 px look shows the cards unreadable at ten levels'
      delegation_tier: 'standard'
```

## 5. Parallelization Plan

```yaml
parallelization_plan:
  groups: []
```

No group: the plan is a chain (task-001, task-002, then task-003, task-004, task-005 in order). task-004 depends on task-003 (the format check covers the documentation), so the two do not run together. Conflict risks for the serial run: the run document is written by task-004 and task-005 in turn, and task-004 temporarily edits plateau-band.js and must restore it before anything else reads it.

## 6. Human Review Gates

```yaml
human_review_gates:
  gates: []
```

No gate: the change is view-only and guarded by tests. The run operates under the autonomy override of complete-run; no task is `human_required`, so the override is not exercised.

## 7. Risk Assessment

```yaml
risk_assessment:
  by_task:
    - id: task-001
      risk: 'low'
      rationale: 'test files only'
    - id: task-002
      risk: 'low'
      rationale: 'view-only markup and one CSS rule; nothing saved, no address, no cache key (TG-4)'
    - id: task-003
      risk: 'low'
      rationale: 'documentation'
    - id: task-004
      risk: 'low'
      rationale: 'runs commands; the temporary cap restore is the only edit and is checked by git diff'
    - id: task-005
      risk: 'low'
      rationale: 'a look in a browser; can only change the step'
  by_area:
    - area: 'ui'
      risk: 'low'
      rationale: 'deep chains are cramped at 360 px (RISK-3), accepted by DEC-1'
    - area: 'docs'
      risk: 'low'
      rationale: 'two sentences'
```

## 8. Confidence Assessment

```yaml
confidence_assessment:
  by_task:
    - id: task-001
      score: 85
      rationale: 'the harness helpers exist; the exact way to render a band list for 12 plateaus is to be read from lean-read-only-band.test.js'
    - id: task-002
      score: 85
      rationale: 'three one-line changes and one rule; the stale-page risk is caught by editor:check'
    - id: task-003
      score: 90
      rationale: 'locations are known by grep'
    - id: task-004
      score: 80
      rationale: 'the full unit suite takes minutes and may show an unrelated failure'
    - id: task-005
      score: 70
      rationale: 'depends on a JDK 25 jar and the browser pane being available'
```

## 9. Agent Assignment Plan

```yaml
agent_assignment_plan:
  assignments:
    - task_id: task-001
      agent_role: 'Test Generation Agent'
      objective: 'Write a failing node test for REQ-1/REQ-2 and fix the two existing assertions the change makes false.'
      context:
        prd_excerpts:
          - 'REQ-2: a node test with a chain of at least ten plateaus asserts the indentation for the page and both band lists'
        tdd_excerpts:
          - 'DEC-2: test the markup and the CSS text, not pixels; 12 plateaus; the narrow rule read from the CSS text'
      likely_files:
        - 'src/test/javascript/viewpoint-kernel/plateau-tree-indentation.test.js'
        - 'src/test/javascript/viewpoint-kernel/lean-read-only-band.test.js'
        - 'src/test/javascript/viewpoint-kernel/editor-structure.test.js'
      acceptance_criteria:
        - 'the new test fails on the capped sources and names the depth'
        - 'the two edited tests describe the uncapped behavior'
      verification:
        - 'node --test on the new file'
        - 'prettier --check and eslint on the three files'
      escalation_triggers:
        - 'no harness path to render the lists'
      suggested_subagent_type: 'general-purpose'
      suggested_model: '(default)'
      suggested_effort: 'medium'
    - task_id: task-002
      agent_role: 'Frontend Implementation Agent'
      objective: 'Remove the cap in three places, add the narrow-screen rule, rebuild the page.'
      context:
        prd_excerpts:
          - 'REQ-1 and REQ-3'
        tdd_excerpts:
          - 'DEC-1: indentation is depth * step with no cap; the Stage 5 review replaces the custom property by one rule in the existing max-width: 40rem block and drops data-depth'
      likely_files:
        - 'src/main/editor/presentation/pages-plateaus-files.js'
        - 'src/main/editor/presentation/plateau-band.js'
        - 'src/main/editor/style.css'
        - 'src/main/resources/editor-webapp/standalone.html'
      acceptance_criteria:
        - 'no Math.min(depth in src/main/editor'
        - 'the page is rebuilt and editor:check passes'
      verification:
        - 'the three node test files pass'
        - 'npm run editor:check'
      escalation_triggers:
        - 'ratchet.max would have to rise'
      suggested_subagent_type: 'general-purpose'
      suggested_model: '(default)'
      suggested_effort: 'low'
    - task_id: task-003
      agent_role: 'Documentation Agent'
      objective: 'State the uncapped indentation and the half step on a small screen.'
      context:
        prd_excerpts:
          - 'REQ-3'
        tdd_excerpts:
          - 'IMP-6: CLAUDE.md band paragraph and the manual, a line only where the text states it'
      likely_files:
        - 'CLAUDE.md'
        - 'src/doc/README.adoc'
      acceptance_criteria:
        - 'no sentence says the indentation is capped'
        - 'one sentence in each file says it is not and gives the small-screen step'
      verification:
        - 'grep checks and npm run format:check'
      escalation_triggers:
        - 'a contradicting number elsewhere in the manual'
      suggested_subagent_type: 'general-purpose'
      suggested_model: 'haiku'
      suggested_effort: 'low'
    - task_id: task-004
      agent_role: 'QA Agent'
      objective: 'Prove the new test catches the cap, run the gate commands, record the output.'
      context:
        prd_excerpts:
          - 'REQ-4'
        tdd_excerpts:
          - 'Observability and Verification'
      likely_files:
        - 'docs/wav/wav-025-hosted-editor/run/run-0189-plateau-tree-indentation/run-0189-plateau-tree-indentation.md'
      acceptance_criteria:
        - 'every command of the verification list exited as stated'
        - 'plateau-band.js is restored after the mutation'
      verification:
        - 'git diff --stat shows only the intended files'
      escalation_triggers:
        - 'an unrelated failure in test:unit'
      suggested_subagent_type: 'general-purpose'
      suggested_model: '(default)'
      suggested_effort: 'medium'
    - task_id: task-005
      agent_role: 'QA Agent'
      objective: 'See the page at 360 px with a chain of ten plateaus and record what was seen.'
      context:
        prd_excerpts:
          - 'REQ-3'
        tdd_excerpts:
          - 'Q-1: the 0.5rem step is checked by eye at 360 px; it can only change the step'
      likely_files:
        - 'docs/wav/wav-025-hosted-editor/run/run-0189-plateau-tree-indentation/run-0189-plateau-tree-indentation.md'
      acceptance_criteria:
        - 'the run document has a 360 px section, or says the look was not done and why'
      verification:
        - 'grep -n "360 px" on the run document'
      escalation_triggers:
        - 'the editor cannot be served'
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
        - 'node --test on the new file, expected red'
        - 'prettier --check'
        - 'eslint'
      success_criteria:
        - 'red for the right reason (a depth above 6), lint and format clean'
    - task_id: task-002
      methods:
        - 'node --test on the three files'
        - 'npm run editor:check'
        - 'grep for Math.min(depth'
      success_criteria:
        - 'green, page equals its assembly, no cap left'
    - task_id: task-003
      methods:
        - 'grep'
        - 'npm run format:check'
      success_criteria:
        - 'the sentence is there and nothing says capped'
    - task_id: task-004
      methods:
        - 'npm run test:unit'
        - 'npm run lint'
        - 'npm run format:check'
        - 'npm run editor:check'
        - 'mutation of the cap and restore'
      success_criteria:
        - 'all exit 0, the mutation turns the new test red, ratchet.max at most 99'
    - task_id: task-005
      methods:
        - 'manual look in the browser pane at 360 px'
        - 'npm run test:e2e if a packaged jar exists'
      success_criteria:
        - 'the section is written with what was seen'
```

## 11. Escalation Rules

```yaml
escalation_rules:
  rules:
    - condition: 'a task needs a decision that the TDD does not make (a different presentation of the tree, a marker past a depth)'
      action: 'stop that task, log it in the prg as a blocker, keep DEC-1 (uncapped, linear) unless the 360 px look shows it unusable'
    - condition: 'the retry of a failed task fails again'
      action: 'handle inline and log a finding in the prg'
    - condition: 'a change would raise ratchet.max or the floor of a coverage figure would fall'
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
  total_tasks: 5
  autonomous_tasks: 5
  review_before_tasks: 0
  review_after_tasks: 0
  human_required_tasks: 0
  blocked_tasks: 0
  critical_path_tasks:
    - task-001
    - task-002
    - task-004
    - task-005
  parallel_groups: []
  required_human_gates: []
  highest_risk_tasks:
    - task-002
  lowest_confidence_tasks:
    - task-005
    - task-004
  next_action: 'task-001: write the failing node test and fix the two existing assertions'
  criteria:
    - 'the five summary criteria hold and are recorded in the run document'
```
