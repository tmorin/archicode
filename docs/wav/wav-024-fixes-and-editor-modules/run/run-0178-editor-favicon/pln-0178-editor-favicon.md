---
title: 'PLN: the editor has no console error on load (#166)'
type: pln
status: completed
owner: tmorin
date: 2026-10-26
run: 0178
wave: 024
related:
  - docs/wav/wav-024-fixes-and-editor-modules/run/run-0178-editor-favicon/tdd-0178-editor-favicon.md
---

# Execution Plan: run 0178, editor favicon (#166)

This is a TDD+pln run: there is no PRD. The requirements are the wave's `W1-1` to `W1-4`, as named in the TDD. The plan reads the TDD together with the Stage 5 review findings logged in `prg-0178-editor-favicon.md`, which the TDD does not yet apply; where they differ the plan follows the findings and says so (gap-001).

## 1. Executive Summary

```yaml
summary:
  status: 'done'
  product_goal: 'Opening the editor logs no console error; GET /favicon.ico on editor serve is not a 404 (#166).'
  technical_approach: 'A data URI link rel=icon in standalone.html, a 204 answer for GET /favicon.ico in EditorHttpServer.handleRoot after the host check, tests at unit and packaged level, then the e2e exception and its CLAUDE.md sentence are removed.'
  total_tasks: 5
  parallel_groups: 1
  high_risk_tasks: 0
  human_review_gates: 0
  autonomy_level: 'high'
  recommendation: 'proceed'
  criteria:
    - 'EditorHttpServerTest asserts GET /favicon.ico is 204 with no body and no token, a foreign host 403, POST 405, /other still 404.'
    - 'EditorServeIT asserts GET /favicon.ico is not 404 and the served page contains rel="icon".'
    - 'standalone.html carries one link rel=icon with a data URI and nothing else of the page changes.'
    - 'src/test/e2e/fixtures.js has no favicon exception and npm run test:e2e passes in Chromium and Firefox.'
    - 'CLAUDE.md no longer records the exception or the 404.'
    - './mvnw test-compile pmd:check, ./mvnw verify and npm run test:unit pass.'
```

## 2. PRD/TDD Consistency Assessment

```yaml
consistency_assessment:
  aligned_items:
    - 'W1-1 to W1-4 are each addressed by a TDD decision (DEC-1 to DEC-3) and an impact (IMP-1 to IMP-6).'
    - 'The TDD scope matches the wave row W-1 and its P1 gate.'
  gaps:
    - id: gap-001
      type: 'ambiguity'
      description: 'The Stage 5 review findings are not applied to the TDD: HEAD is in DEC-1, DEC-2, CTR-1 and IMP-3 but the server answers 405 for HEAD on / and W1-2 asks GET only; the 204 must be sent without a body (sendResponseHeaders(204, -1)); the Cache-Control on the 204 answers no W1-n.'
      impact: 'low'
      recommendation: 'The plan implements GET only, 405 for every other method, a 204 sent with sendResponseHeaders(204, -1), and no Cache-Control. The main agent should align the TDD; if it keeps HEAD or the header, task-001 and task-003 follow it with one added assertion.'
    - id: gap-002
      type: 'risk'
      description: 'The e2e Chromium project is the headless shell, which the fixture comment says does not report the favicon error, so ASM-1, ASM-2 and the negative check cannot be observed by npm run test:e2e alone.'
      impact: 'medium'
      recommendation: 'task-005 runs one throwaway check in full Chromium (channel chromium) outside the committed config; EditorHttpServerTest and EditorServeIT are the permanent guards of the 204 and the link.'
  blocking_gaps: []
```

## 3. Execution Graph

```yaml
execution_graph:
  nodes:
    - id: task-001
      status: 'done'
      title: 'Answer GET /favicon.ico with 204 in EditorHttpServer and unit-test it'
      depends_on: []
      produces:
        - 'src/main/java/io/morin/archicode/cli/EditorHttpServer.java'
        - 'src/test/java/io/morin/archicode/cli/EditorHttpServerTest.java'
      agent_role: 'Backend Implementation Agent'
      autonomy: 'autonomous'
      risk: 'low'
      confidence: 90
    - id: task-002
      status: 'done'
      title: 'Add the link rel=icon to the head of standalone.html'
      depends_on: []
      produces:
        - 'src/main/resources/editor-webapp/standalone.html'
      agent_role: 'Frontend Implementation Agent'
      autonomy: 'autonomous'
      risk: 'low'
      confidence: 90
    - id: task-003
      status: 'done'
      title: 'Assert the 204 and the icon link in EditorServeIT'
      depends_on: [task-001, task-002]
      produces:
        - 'src/test/java/io/morin/archicode/it/EditorServeIT.java'
      agent_role: 'Test Generation Agent'
      autonomy: 'autonomous'
      risk: 'low'
      confidence: 85
    - id: task-004
      status: 'done'
      title: 'Remove the e2e exception and the CLAUDE.md sentence'
      depends_on: [task-001, task-002]
      produces:
        - 'src/test/e2e/fixtures.js'
        - 'CLAUDE.md'
      agent_role: 'Documentation Agent'
      autonomy: 'autonomous'
      risk: 'low'
      confidence: 90
    - id: task-005
      status: 'done'
      title: 'Run the whole verification and the full-Chromium check'
      depends_on: [task-003, task-004]
      produces:
        - 'verification results in the run log'
      agent_role: 'QA Agent'
      autonomy: 'autonomous'
      risk: 'low'
      confidence: 75
  edges:
    - from: task-001
      to: task-003
      reason: 'The packaged test needs the route.'
    - from: task-002
      to: task-003
      reason: 'The packaged test reads the link from the served page.'
    - from: task-001
      to: task-004
      reason: 'The exception goes only once the server no longer answers 404.'
    - from: task-002
      to: task-004
      reason: 'The exception goes only once the page declares the icon.'
    - from: task-003
      to: task-005
      reason: 'Verification runs on the finished change.'
    - from: task-004
      to: task-005
      reason: 'The e2e run needs the exception gone.'
```

## 4. Task Catalog

```yaml
task_catalog:
  tasks:
    - id: task-001
      title: 'Answer GET /favicon.ico with 204 in EditorHttpServer and unit-test it'
      source_requirements:
        prd:
          - 'W1-2'
        tdd:
          - 'DEC-1'
          - 'DEC-2'
          - 'IMP-1'
          - 'IMP-3'
          - 'CTR-1'
          - 'CON-3'
          - 'CON-4'
          - 'CON-5'
      outputs:
        - 'handleRoot answers /favicon.ico after the host check and before the path check and the token check: GET gives 204 with no body (sendResponseHeaders(204, -1)), any other method gives 405, a foreign host gives 403; the class javadoc names the icon.'
        - 'EditorHttpServerTest cases asserting status, empty body, no token needed, 405 for POST, 403 for a foreign host, and /other still 404.'
      verification:
        - './mvnw test -Dtest=EditorHttpServerTest'
        - './mvnw test-compile pmd:check'
      risk: 'low'
      confidence: 90
      human_review: 'none'
      escalation_triggers:
        - 'The existing 404 and 405 tests of / fail for a reason other than the new path.'
        - 'JaCoCo branch floor would drop below 0.90.'
      delegation_tier: 'standard'
      results: 'tier standard, model sonnet, effort medium, profile low-cost, passed first time, inline (leaf), independently verified'
    - id: task-002
      title: 'Add the link rel=icon to the head of standalone.html'
      source_requirements:
        prd:
          - 'W1-3'
        tdd:
          - 'DEC-1'
          - 'IMP-2'
          - 'CTR-2'
          - 'CON-1'
          - 'CON-2'
          - 'ASM-3'
      outputs:
        - 'One link rel="icon" with the data URI of src/site/index.html, copied unchanged, after the title; no other byte of the page changes.'
      verification:
        - 'git diff --stat shows one added line in standalone.html'
        - 'npm run test:unit'
      risk: 'low'
      confidence: 90
      human_review: 'none'
      escalation_triggers:
        - 'A node test asserts the content of the head and fails.'
      delegation_tier: 'standard'
      results: 'tier standard, model sonnet, effort medium, profile low-cost, passed first time, inline (leaf), independently verified'
    - id: task-003
      title: 'Assert the 204 and the icon link in EditorServeIT'
      source_requirements:
        prd:
          - 'W1-2'
        tdd:
          - 'IMP-4'
      outputs:
        - 'servesTheEditorAndStops also asserts GET /favicon.ico is not 404 (204) and that the served page contains rel="icon"; no new class.'
      verification:
        - './mvnw verify -DskipITs=false'
      risk: 'low'
      confidence: 85
      human_review: 'none'
      escalation_triggers:
        - 'The test needs a reflect-config.json change.'
      delegation_tier: 'standard'
      results: 'tier standard, model sonnet, effort medium, profile low-cost, passed first time, inline (leaf), independently verified'
    - id: task-004
      title: 'Remove the e2e exception and the CLAUDE.md sentence'
      source_requirements:
        prd:
          - 'W1-1'
          - 'W1-4'
        tdd:
          - 'DEC-3'
          - 'IMP-5'
          - 'IMP-6'
      outputs:
        - 'The favicon.ico branch and its comment are gone from pageErrors in src/test/e2e/fixtures.js; nothing else of the fixture changes (the teardown flake is W-10).'
        - 'CLAUDE.md, End-to-end paragraph, no longer says the fixture excepts /favicon.ico or that the server answers 404 for it; it says the server answers 204 and the page declares an icon.'
      verification:
        - 'npm run format:check'
        - 'npm run lint'
        - 'grep -n favicon src/test/e2e/fixtures.js returns nothing'
      risk: 'low'
      confidence: 90
      human_review: 'none'
      escalation_triggers:
        - 'The sentence in CLAUDE.md is also relied on by another paragraph that needs to change.'
      delegation_tier: 'standard'
      results: 'tier standard, model sonnet, effort medium, profile low-cost, passed after escalation to effort high, inline (leaf), independently verified'
    - id: task-005
      title: 'Run the whole verification and the full-Chromium check'
      source_requirements:
        prd:
          - 'W1-1'
          - 'W1-3'
        tdd:
          - 'TG-1'
          - 'ASM-1'
          - 'ASM-2'
          - 'RISK-1'
          - 'RISK-2'
      outputs:
        - 'Results of the commands below recorded in the run log, with any finding.'
      verification:
        - './mvnw test-compile pmd:check'
        - './mvnw verify -DskipITs=false'
        - 'npm run test:unit'
        - './mvnw package -Dmaven.test.skip -Dplugin.asciidoctor.skip=true then npm run test:e2e (Chromium and Firefox)'
        - 'One throwaway run in full Chromium (channel chromium, a local config not committed) logging page requests and console errors on load, once with the link and the 204, and once with the link removed to see the 204 alone is silent.'
      risk: 'low'
      confidence: 75
      human_review: 'none'
      escalation_triggers:
        - 'The full Chromium reports the 204 as a console error (RISK-2); the plan then keeps the link and stops, logging the finding.'
        - 'Another spec fails on a console error the old exception hid (RISK-1).'
      delegation_tier: 'standard'
      results: 'tier standard, model sonnet, effort medium, profile low-cost, passed first time, inline (leaf), independently verified'
```

## 5. Parallelization Plan

```yaml
parallelization_plan:
  groups:
    - id: parallel-group-001
      tasks:
        - task-001
        - task-002
      reason: 'A Java file and one line of an HTML file, with no shared file.'
      conflict_risks:
        - 'None; task-003 and task-004 wait for both.'
```

## 6. Human Review Gates

No gate: no task touches authentication, data, release or a public contract beyond one additive route. The run operates under the autonomy override of complete-run (it continues without a stop between documents); no task is `human_required`, so the override changes nothing here.

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
      rationale: 'One branch on a path, host check kept first.'
    - id: task-002
      risk: 'low'
      rationale: 'One line in the head, additive.'
    - id: task-003
      risk: 'low'
      rationale: 'One test method extended.'
    - id: task-004
      risk: 'low'
      rationale: 'Removal of an exception and a sentence.'
    - id: task-005
      risk: 'low'
      rationale: 'Read-only checks; the unknown is how full Chromium treats a 204.'
  by_area:
    - area: 'api'
      risk: 'low'
      rationale: 'Additive route on a local server, host-guarded.'
    - area: 'ui'
      risk: 'low'
      rationale: 'Inline icon, no external request.'
    - area: 'docs'
      risk: 'low'
      rationale: 'One sentence of CLAUDE.md.'
```

## 8. Confidence Assessment

```yaml
confidence_assessment:
  by_task:
    - id: task-001
      score: 90
      rationale: 'Clear contract and existing tests to extend.'
    - id: task-002
      score: 90
      rationale: 'The string exists in src/site/index.html.'
    - id: task-003
      score: 85
      rationale: 'The IT exists; only the packaged runner is not run locally.'
    - id: task-004
      score: 90
      rationale: 'Deletion of a known branch.'
    - id: task-005
      score: 75
      rationale: 'Browser behaviour for the 204 is an assumption (ASM-2) checked here for the first time.'
```

## 9. Agent Assignment Plan

```yaml
agent_assignment_plan:
  assignments:
    - task_id: task-001
      agent_role: 'Backend Implementation Agent'
      objective: 'Special-case GET /favicon.ico in handleRoot with a bodiless 204 and test it.'
      context:
        prd_excerpts:
          - 'W1-2 archicode editor serve answers GET /favicon.ico with a status that is not 404.'
        tdd_excerpts:
          - 'DEC-2 the icon route is answered before the token check; the host check still runs first.'
      likely_files:
        - 'src/main/java/io/morin/archicode/cli/EditorHttpServer.java'
        - 'src/test/java/io/morin/archicode/cli/EditorHttpServerTest.java'
      acceptance_criteria:
        - 'GET gives 204, empty body, no token; POST 405; foreign host 403; /other 404.'
      verification:
        - './mvnw test -Dtest=EditorHttpServerTest'
        - './mvnw test-compile pmd:check'
      escalation_triggers:
        - 'PMD or JaCoCo floor fails and the fix needs a suppression.'
      suggested_subagent_type: 'general-purpose'
      suggested_model: '(default)'
      suggested_effort: 'medium'
    - task_id: task-002
      agent_role: 'Frontend Implementation Agent'
      objective: 'Add the icon link to the head of the editor page.'
      context:
        prd_excerpts:
          - 'W1-3 a person opening the editor sees no console error on load.'
        tdd_excerpts:
          - 'CTR-2 one link rel=icon with a data URI; no new request.'
      likely_files:
        - 'src/main/resources/editor-webapp/standalone.html'
        - 'src/site/index.html'
      acceptance_criteria:
        - 'One added line; the data URI is that of the site page.'
      verification:
        - 'npm run test:unit'
      escalation_triggers:
        - 'A test reads the head and fails.'
      suggested_subagent_type: 'general-purpose'
      suggested_model: '(default)'
      suggested_effort: 'medium'
    - task_id: task-003
      agent_role: 'Test Generation Agent'
      objective: 'Extend the packaged test with the icon route and the link.'
      context:
        prd_excerpts:
          - 'W1-2 asserted by EditorServeIT.'
        tdd_excerpts:
          - 'IMP-4 servesTheEditorAndStops also asserts the 204 and the link.'
      likely_files:
        - 'src/test/java/io/morin/archicode/it/EditorServeIT.java'
      acceptance_criteria:
        - 'The test fails with the old 404 and passes with the 204.'
      verification:
        - './mvnw verify -DskipITs=false'
      escalation_triggers:
        - 'The test needs anything but the command line and the HTTP port.'
      suggested_subagent_type: 'general-purpose'
      suggested_model: '(default)'
      suggested_effort: 'medium'
    - task_id: task-004
      agent_role: 'Documentation Agent'
      objective: 'Delete the e2e exception for /favicon.ico and the sentence that records it.'
      context:
        prd_excerpts:
          - 'W1-1 no exception for /favicon.ico left in fixtures.js.'
          - 'W1-4 the sentence of CLAUDE.md goes with it.'
        tdd_excerpts:
          - 'DEC-3 the exception goes, nothing replaces it.'
      likely_files:
        - 'src/test/e2e/fixtures.js'
        - 'CLAUDE.md'
      acceptance_criteria:
        - 'No favicon text in fixtures.js; the CLAUDE.md paragraph is true again.'
      verification:
        - 'npm run format:check'
        - 'npm run lint'
      escalation_triggers:
        - 'The branch is entangled with the teardown code of W-10.'
      suggested_subagent_type: 'general-purpose'
      suggested_model: '(default)'
      suggested_effort: 'medium'
    - task_id: task-005
      agent_role: 'QA Agent'
      objective: 'Run every check of the TDD verification section and the full-Chromium check, and record the results.'
      context:
        prd_excerpts:
          - 'W1-1 npm run test:e2e passes with the exception removed.'
        tdd_excerpts:
          - 'Observability and Verification; ASM-1 and ASM-2; RISK-1 and RISK-2.'
      likely_files:
        - 'target/e2e'
      acceptance_criteria:
        - 'All commands exit 0; the full-Chromium run shows no /favicon.ico request and an empty console.'
      verification:
        - './mvnw verify -DskipITs=false'
        - 'npm run test:e2e'
      escalation_triggers:
        - 'A failure that the change did not cause, or a Chromium console error on the 204.'
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
        - 'unit tests'
        - 'PMD'
      success_criteria:
        - 'EditorHttpServerTest green; pmd:check clean.'
    - task_id: task-002
      methods:
        - 'node unit suite'
      success_criteria:
        - 'npm run test:unit green; diff is one added line.'
    - task_id: task-003
      methods:
        - 'integration tests on the jar'
      success_criteria:
        - 'EditorServeIT green with -DskipITs=false.'
    - task_id: task-004
      methods:
        - 'format check'
        - 'lint'
      success_criteria:
        - 'Both exit 0; grep for favicon in fixtures.js is empty.'
    - task_id: task-005
      methods:
        - 'full verify'
        - 'end-to-end suite'
        - 'manual full-Chromium run'
      success_criteria:
        - 'verify, test:unit and test:e2e exit 0; the JaCoCo floors hold; the browser shows no console error on load.'
```

## 11. Escalation Rules

This run operates under the autonomy override of complete-run: a task that would be `human_required` is executed and its decision logged. None is expected.

```yaml
escalation_rules:
  rules:
    - condition: 'The full Chromium reports the 204 as a console error.'
      action: 'Keep the link, keep the route answered, log the finding in the prg and name the open question; do not re-add the exception.'
    - condition: 'Another e2e spec fails on a console error the old exception hid.'
      action: 'Log it as a finding; fix it if it is a one-line cause in the editor, else stop and report.'
    - condition: 'The TDD and the Stage 5 findings still disagree when task-001 starts.'
      action: 'Follow gap-001 (GET only, bodiless 204, no cache header) and log the choice.'
    - condition: 'Confidence of a task falls below 70.'
      action: 'Re-dispatch once one effort step up, then handle inline.'
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
    - task-003
    - task-005
  parallel_groups:
    - parallel-group-001
  required_human_gates: []
  highest_risk_tasks:
    - task-005
  lowest_confidence_tasks:
    - task-005
  next_action: 'Run task-001 and task-002 in parallel.'
  criteria:
    - 'All five tasks done and their verification green.'
    - 'No favicon exception in src/test/e2e/fixtures.js and none in CLAUDE.md.'
    - 'GET /favicon.ico is not a 404 on editor serve, asserted by EditorServeIT.'
```
