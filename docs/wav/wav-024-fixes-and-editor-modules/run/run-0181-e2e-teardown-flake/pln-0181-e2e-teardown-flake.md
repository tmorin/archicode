---
title: 'PLN: the E2E suite judges the page before its server stops'
type: pln
status: done
owner: tmorin
date: 2026-10-26
run: 0181
wave: 024
related:
  - docs/wav/wav-024-fixes-and-editor-modules/run/run-0181-e2e-teardown-flake/tdd-0181-e2e-teardown-flake.md
---

# Execution Plan: run 0181, the E2E teardown flake (W-10)

This is a TDD+pln run: there is no PRD. The requirements are `W10-1` to `W10-4` of the TDD, taken from the wave entry W-10 (`W10-3` is the P1 gate and can only be observed on the wave pull request). The plan reads the TDD with its Stage 5 review applied; the TDD text already carries those findings.

## 1. Executive Summary

```yaml
summary:
  status: 'done'
  product_goal: 'The E2E suite no longer fails a test because the page said an error after the test body returned and while its server was stopping.'
  technical_approach: 'Write the spec teardown.spec.js first and prove it fails on the old fixture order (V-1, the gate of Q-1), then make pageErrors depend on serve so the page is judged before the server stops, say the rule in the head comment of fixtures.js and in CLAUDE.md, and run the E2E, format and lint checks.'
  total_tasks: 4
  parallel_groups: 0
  high_risk_tasks: 0
  human_review_gates: 0
  autonomy_level: 'high'
  recommendation: 'proceed'
  criteria:
    - 'teardown.spec.js exists, its first test fails on the old order of the fixtures on Chromium and Firefox, and both of its tests pass after the change.'
    - 'The test.fail() test of the spec is shown to bite once (without test.fail() it fails).'
    - 'pageErrors takes serve in its parameters and the head comment of fixtures.js says the order and why, with the run number; the W-1 removal of the favicon exception is kept.'
    - 'The clause of CLAUDE.md on pageErrors says it judges the page at the end of the test body, before the server of serve stops.'
    - 'npm run test:e2e on Chromium and Firefox, npm run format:check and npm run lint pass; edit-and-save.spec.js passes with --repeat-each=5 on Chromium.'
    - 'W10-3 (three green E2E runs on the wave pull request) is recorded as pending in the run document.'
```

## 2. PRD/TDD Consistency Assessment

```yaml
consistency_assessment:
  aligned_items:
    - 'W10-1 is addressed by DEC-1, DEC-3 and IMP-1, IMP-2; W10-2 by DEC-2, IMP-1 and IMP-3; W10-4 by DEC-3 and V-3.'
    - 'W10-3 is observed on the pull request (V-5), outside the plan; the TDD says so.'
    - 'The TDD scope matches the wave entry W-10 and its place after W-1 in the lane (CON-3).'
  gaps:
    - id: gap-001
      type: 'risk'
      description: 'Q-1 and ASM-1 are open: the log of GitHub Actions run 40267805459 was never readable, so the cause (a request in flight at teardown) is inferred.'
      impact: 'medium'
      recommendation: 'task-001 runs the new spec against the old order before any fix (V-1). If it does not fail on Chromium and Firefox, the implementer stops, records it in the prg and does not ship DEC-1 as the fix for the flake (escalation).'
  blocking_gaps: []
```

## 3. Execution Graph

```yaml
execution_graph:
  nodes:
    - id: task-001
      status: 'done'
      title: 'Write teardown.spec.js and prove it fails on the old fixture order'
      depends_on: []
      produces:
        - 'src/test/e2e/teardown.spec.js'
      agent_role: 'Test Generation Agent'
      autonomy: 'autonomous'
      risk: 'low'
      confidence: 70
    - id: task-002
      status: 'done'
      title: 'Make pageErrors depend on serve and say the rule in the head comment'
      depends_on: [task-001]
      produces:
        - 'src/test/e2e/fixtures.js'
      agent_role: 'Implementation Agent'
      autonomy: 'autonomous'
      risk: 'low'
      confidence: 85
    - id: task-003
      status: 'done'
      title: 'Add the clause on pageErrors to CLAUDE.md'
      depends_on: [task-002]
      produces:
        - 'CLAUDE.md'
      agent_role: 'Documentation Agent'
      autonomy: 'autonomous'
      risk: 'low'
      confidence: 90
    - id: task-004
      status: 'done'
      title: 'Run the E2E, format and lint checks and the negative check of the test.fail() test'
      depends_on: [task-002, task-003]
      produces:
        - 'verification results in the run log'
      agent_role: 'QA Agent'
      autonomy: 'autonomous'
      risk: 'low'
      confidence: 75
  edges:
    - from: task-001
      to: task-002
      reason: 'The fix is shipped only if the spec first fails on the old order (V-1, Q-1).'
    - from: task-002
      to: task-003
      reason: 'CLAUDE.md describes the order the fixture now has.'
    - from: task-002
      to: task-004
      reason: 'Verification runs on the finished change.'
    - from: task-003
      to: task-004
      reason: 'Verification includes the documented state.'
```

## 4. Task Catalog

```yaml
task_catalog:
  tasks:
    - id: task-001
      title: 'Write teardown.spec.js and prove it fails on the old fixture order'
      source_requirements:
        prd:
          - 'W10-1'
          - 'W10-4'
        tdd:
          - 'DEC-3'
          - 'IMP-2'
          - 'TG-4'
          - 'ASM-1'
          - 'ASM-2'
          - 'V-1'
          - 'Q-1'
      outputs:
        - 'src/test/e2e/teardown.spec.js holds two tests: a request the page sends while its server stops is no error (the page runs a 20 ms setInterval fetch of / and says console.error itself when a fetch is refused; the body waits for one success, then returns), and test.fail() an error the page raises while the test runs still fails the test (console.error on purpose).'
        - 'The spec uses workspace.js for a small workspace and the serve fixture for the server, and the existing exports of fixtures.js.'
        - 'Run on the unchanged fixtures.js, the first test fails on Chromium and on Firefox; the result is recorded in the prg. If it does not fail on both, the task stops there (Q-1).'
      verification:
        - 'npx playwright test src/test/e2e/teardown.spec.js --project=chromium fails on the first test with the old order'
        - 'npx playwright test src/test/e2e/teardown.spec.js --project=firefox fails the same way'
        - 'npm run format:check'
        - 'npm run lint'
      risk: 'low'
      confidence: 70
      human_review: 'none'
      escalation_triggers:
        - 'The first test passes on the old order (ASM-1 not reproduced): stop, record in the prg, do not ship DEC-1 as the fix.'
        - 'The stop is too fast for a 20 ms period to catch a request: lower the period, never add a wait to the fixture.'
        - 'The packaged jar target/quarkus-app is missing: build it with ./mvnw package -Dmaven.test.skip -Dplugin.asciidoctor.skip=true and JAVA_HOME on a JDK 25.'
      delegation_tier: 'standard'
      results: 'tier standard, model sonnet, effort medium, profile low-cost, passed first time, inline (leaf), independently verified'
    - id: task-002
      title: 'Make pageErrors depend on serve and say the rule in the head comment'
      source_requirements:
        prd:
          - 'W10-1'
          - 'W10-2'
        tdd:
          - 'DEC-1'
          - 'DEC-2'
          - 'IMP-1'
          - 'CTR-1'
          - 'IF-1'
          - 'FLOW-1'
          - 'TG-1'
          - 'TG-2'
          - 'TG-3'
          - 'CON-3'
      outputs:
        - 'pageErrors is declared async ({ page, serve }, use) so serve is set up first and torn down after it; the check stays a single expect(errors).toEqual([]) right after use returns.'
        - 'The head comment of fixtures.js says the order (the page is judged first, then its server stops) and the reason, with the run number 0181.'
        - 'The W-1 removal of the favicon exception stays; the exports test, expect, openPerspective and openPage and the object serve(example, files) returns are unchanged; no spec changes.'
      verification:
        - 'npx playwright test src/test/e2e/teardown.spec.js --project=chromium passes, test.fail() test included'
        - 'npx playwright test src/test/e2e/teardown.spec.js --project=firefox passes'
        - 'npm run format:check'
        - 'npm run lint'
      risk: 'low'
      confidence: 85
      human_review: 'none'
      escalation_triggers:
        - 'The fixture order does not change as ASM-2 says (the spec still fails after the change): stop and record it.'
        - 'The edit would touch the lines of the favicon removal.'
      delegation_tier: 'standard'
      results: 'tier standard, model sonnet, effort medium, profile low-cost, passed first time, inline (leaf), independently verified'
    - id: task-003
      title: 'Add the clause on pageErrors to CLAUDE.md'
      source_requirements:
        prd:
          - 'W10-2'
        tdd:
          - 'DEC-2'
          - 'IMP-3'
      outputs:
        - 'The sentence of the End-to-end suite paragraph that describes the automatic fixture pageErrors gains one clause: it judges the page at the end of the test body, before the server of serve stops. No other part of CLAUDE.md changes, the file being already modified by other runs of the wave.'
      verification:
        - 'git diff CLAUDE.md shows this clause added on top of the other runs changes and nothing removed'
        - 'npm run format:check'
      risk: 'low'
      confidence: 90
      human_review: 'none'
      escalation_triggers:
        - 'The clause would contradict another sentence of CLAUDE.md.'
      delegation_tier: 'standard'
      results: 'tier standard, model sonnet, effort medium, profile low-cost, passed first time, inline (leaf), independently verified'
    - id: task-004
      title: 'Run the E2E, format and lint checks and the negative check of the test.fail() test'
      source_requirements:
        prd:
          - 'W10-1'
          - 'W10-2'
          - 'W10-3'
          - 'W10-4'
        tdd:
          - 'V-2'
          - 'V-3'
          - 'V-4'
          - 'V-5'
          - 'RISK-1'
          - 'RISK-2'
      outputs:
        - 'Results of the commands below recorded in the run log.'
        - 'Negative check: the test.fail() line of the second test removed once, the test seen failing, the line put back.'
        - 'The run document records W10-3 (three green E2E runs on the wave pull request) as pending.'
      verification:
        - 'npx playwright test --repeat-each=5 src/test/e2e/edit-and-save.spec.js --project=chromium'
        - 'npm run test:e2e'
        - 'npm run format:check'
        - 'npm run lint'
      risk: 'low'
      confidence: 75
      human_review: 'none'
      escalation_triggers:
        - 'A failure the change did not cause: log it as a finding, do not retry it away (retries stay 0).'
        - 'JAVA_HOME names a JDK older than 25 or the jar is stale: rebuild it before concluding.'
      delegation_tier: 'standard'
      results: 'tier standard, model sonnet, effort medium, profile low-cost, passed after escalation to effort high, inline (leaf), independently verified'
```

## 5. Parallelization Plan

```yaml
parallelization_plan:
  groups: []
  sequential_reason: 'All four tasks share fixtures.js through the spec and its verification, and the fix is gated on the spec failing first (V-1), so they run in order.'
```

## 6. Human Review Gates

No gate: test code and one sentence of project instructions, no authentication, data, release or public contract. The run operates under the autonomy override of complete-run (it continues without a stop between documents); no task is `human_required`, so the override changes nothing here. The one stop is conditional: the spec not failing on the old order (Q-1) stops the run before the fix.

```yaml
human_review_gates:
  gates: []
```

## 7. Risk Assessment

```yaml
risk_assessment:
  by_task:
    - id: task-001
      risk: 'low'
      rationale: 'A new spec; the unknown is whether it reproduces the flake on the old order (RISK-1).'
    - id: task-002
      risk: 'low'
      rationale: 'One parameter and a comment, guarded by the spec.'
    - id: task-003
      risk: 'low'
      rationale: 'One clause in a file other runs also edit.'
    - id: task-004
      risk: 'low'
      rationale: 'Read-only checks and one reversible negative edit.'
  by_area:
    - area: 'tests'
      risk: 'low'
      rationale: 'Test-only change, no application code, no release effect; rollback is a revert.'
```

## 8. Confidence Assessment

```yaml
confidence_assessment:
  by_task:
    - id: task-001
      score: 70
      rationale: 'The cause is inferred (ASM-1) and the timing of the stop against the 20 ms period is not measured.'
    - id: task-002
      score: 85
      rationale: 'The mechanism is Playwright fixture order (ASM-2) and the spec checks it.'
    - id: task-003
      score: 90
      rationale: 'One clause.'
    - id: task-004
      score: 75
      rationale: 'Two browsers and a JVM per test on a possibly busy machine.'
```

## 9. Agent Assignment Plan

```yaml
agent_assignment_plan:
  assignments:
    - task_id: task-001
      agent_role: 'Test Generation Agent'
      objective: 'Write teardown.spec.js and show its first test failing on the old order, on Chromium and Firefox.'
      context:
        prd_excerpts:
          - 'W10-1 a request the page sends during teardown is waited for before the stop or told apart from an error raised while the test ran.'
          - 'W10-4 the same test shows no flake in a repeated run.'
        tdd_excerpts:
          - 'DEC-3 two tests: the page fetches in a loop and says console.error itself when a fetch is refused; a test.fail() test for an error raised during the body.'
          - 'Q-1 and V-1 if the spec does not fail on the old order, stop and record it.'
      likely_files:
        - 'src/test/e2e/teardown.spec.js'
        - 'src/test/e2e/fixtures.js'
        - 'src/test/e2e/workspace.js'
      acceptance_criteria:
        - 'The first test fails on the unchanged fixtures on Chromium and Firefox; format and lint pass.'
      verification:
        - 'npx playwright test src/test/e2e/teardown.spec.js --project=chromium'
        - 'npx playwright test src/test/e2e/teardown.spec.js --project=firefox'
      escalation_triggers:
        - 'The first test passes on the old order.'
      suggested_subagent_type: 'general-purpose'
      suggested_model: '(default)'
      suggested_effort: 'medium'
    - task_id: task-002
      agent_role: 'Implementation Agent'
      objective: 'Add serve to the parameters of pageErrors and write the order and its reason in the head comment of fixtures.js.'
      context:
        prd_excerpts:
          - 'W10-1 the page is judged before its server stops.'
          - 'W10-2 the comment of fixtures.js says the order and why.'
        tdd_excerpts:
          - 'DEC-1 pageErrors depends on serve; no filter, no wait.'
          - 'DEC-2 the head comment names the run 0181.'
      likely_files:
        - 'src/test/e2e/fixtures.js'
      acceptance_criteria:
        - 'The spec of task-001 passes on both browsers; the favicon removal of W-1 is intact.'
      verification:
        - 'npx playwright test src/test/e2e/teardown.spec.js'
        - 'npm run lint'
      escalation_triggers:
        - 'The spec still fails after the change.'
      suggested_subagent_type: 'general-purpose'
      suggested_model: '(default)'
      suggested_effort: 'medium'
    - task_id: task-003
      agent_role: 'Documentation Agent'
      objective: 'Add one clause on when pageErrors judges the page to the End-to-end suite paragraph of CLAUDE.md.'
      context:
        prd_excerpts:
          - 'W10-2 the rule is written where the fixtures are described.'
        tdd_excerpts:
          - 'IMP-3 edit only that clause; the file is already modified by other runs.'
      likely_files:
        - 'CLAUDE.md'
      acceptance_criteria:
        - 'The clause is added; nothing else of the file moves.'
      verification:
        - 'git diff CLAUDE.md'
      escalation_triggers:
        - 'A contradiction with another sentence.'
      suggested_subagent_type: 'general-purpose'
      suggested_model: '(default)'
      suggested_effort: 'medium'
    - task_id: task-004
      agent_role: 'QA Agent'
      objective: 'Run every check of the TDD verification section and the negative check of the test.fail() test, and record the results.'
      context:
        prd_excerpts:
          - 'W10-4 no flake in a repeated run of the rename test.'
        tdd_excerpts:
          - 'V-2 to V-5; the repeated run is no proof of a rare flake, the spec is.'
      likely_files:
        - 'src/test/e2e/teardown.spec.js'
        - 'target/e2e'
      acceptance_criteria:
        - 'All commands exit 0; the test.fail() test is seen failing once without its test.fail() line and the line is back.'
      verification:
        - 'npm run test:e2e'
        - 'npm run format:check'
        - 'npm run lint'
      escalation_triggers:
        - 'A failure the change did not cause.'
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
        - 'end-to-end test on the old order'
        - 'lint and format'
      success_criteria:
        - 'The first test fails on Chromium and Firefox before the fix.'
    - task_id: task-002
      methods:
        - 'end-to-end test'
        - 'lint and format'
      success_criteria:
        - 'teardown.spec.js passes on both browsers, test.fail() test included.'
    - task_id: task-003
      methods:
        - 'diff review'
      success_criteria:
        - 'One clause added in CLAUDE.md.'
    - task_id: task-004
      methods:
        - 'end-to-end suite'
        - 'repeated run of the rename spec'
        - 'negative check'
      success_criteria:
        - 'test:e2e, format:check and lint exit 0; edit-and-save passes five times on Chromium; the test.fail() test bites once.'
```

## 11. Escalation Rules

This run operates under the autonomy override of complete-run: a task that would be `human_required` is executed and its decision logged. None is expected.

```yaml
escalation_rules:
  rules:
    - condition: 'The first test of teardown.spec.js passes on the old fixture order on either browser (Q-1, ASM-1 not reproduced).'
      action: 'Stop before task-002, record it in the prg, and do not ship DEC-1 as the fix for the flake.'
    - condition: 'The spec still fails after the change.'
      action: 'Stop, log the finding, and re-read the order Playwright 1.64.1 tears fixtures down in (ASM-2).'
    - condition: 'A failure of the E2E suite the change did not cause.'
      action: 'Log it as a finding; retries stay 0 and no flow is retried or dropped here.'
    - condition: 'Confidence of a task falls below 70.'
      action: 'Re-dispatch once one effort step up, then handle inline.'
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
    - task-001
  lowest_confidence_tasks:
    - task-001
  next_action: 'none: W10-3 (three green E2E runs on the wave pull request) is observed on the pull request.'
  criteria:
    - 'All four tasks done and their verification green.'
    - 'The spec failed on the old order before the fix and passes after it.'
    - 'W10-3 recorded as pending on the wave pull request.'
```
