---
title: 'PLN: the story migration plays a slide with content at step 3 (#167)'
type: pln
status: draft
owner: tmorin
date: 2026-10-26
run: 0179
wave: 024
related:
  - docs/wav/wav-024-fixes-and-editor-modules/run/run-0179-migration-story-step-3/tdd-0179-migration-story-step-3.md
---

# Execution Plan: run 0179, step 3 of the story migration (#167)

This is a TDD+pln run: there is no PRD. The requirements are `REQ-1` to `REQ-3` of the TDD, taken from the wave entry W-2 and issue #167. The plan reads the TDD together with the Stage 5 review findings F1 to F4 logged in `prg-0179-migration-story-step-3.md`; where the TDD text does not yet apply them, the plan follows the findings (gap-001).

## 1. Executive Summary

```yaml
summary:
  status: 'done'
  product_goal: 'Step 3 of the story migration draws something in the player and in stories generate, and no shipped story step can silently draw nothing (#167).'
  technical_approach: 'Change step 3 of story.migration.yaml to the detailed viewpoint, follow the folder and label in the three tests and the manual that name them, add one invariant over the four shipped stories in node and in Java with a shared empty-steps.json, then record it in CLAUDE.md and run the whole verification.'
  total_tasks: 5
  parallel_groups: 1
  high_risk_tasks: 0
  human_review_gates: 0
  autonomy_level: 'high'
  recommendation: 'proceed'
  criteria:
    - 'story.migration.yaml step 3 says viewpoint detailed and nothing else of the step changes.'
    - 'archicode stories generate on the example writes 03-detailed/plantuml/application/step_03.puml with warehouse.picking and warehouse.inventory and the link between them.'
    - 'GenerateStoriesTest, StoriesGenerateIT, story-player.spec.js and the manual name 03-detailed and Detailed of warehouse.'
    - 'story-steps-not-empty.test.js and StoriesNotEmptyTest fail on the old overview step and pass on the new one, and both state how many steps they checked.'
    - 'src/test/resources/stories/empty-steps.json exists, is an empty array, and is read by both tests.'
    - './mvnw test-compile pmd:check, ./mvnw verify, ./mvnw verify -DskipITs=false, npm run test:unit, npm run format:check, npm run lint and npm run test:e2e pass.'
```

## 2. PRD/TDD Consistency Assessment

```yaml
consistency_assessment:
  aligned_items:
    - 'REQ-1 is addressed by DEC-1 and IMP-1, REQ-2 by IMP-2 and IMP-3, REQ-3 by DEC-2, IMP-4, IMP-5 and IMP-6.'
    - 'The TDD scope matches the wave entry W-2 and its P1 gate.'
  gaps:
    - id: gap-001
      type: 'ambiguity'
      description: 'The Stage 5 findings are not all applied in the TDD text. F1: the Java emptiness rule is given as a link or two element rectangles, not an exact rule, and the page counts non-secondary links and ghosts. F2: the tests must discover the stories rather than list them and must assert how many steps were checked. F3: the homes the node test draws each step from are not named. F4: StoriesGenerateIT.migrationIsDrawnWithoutAnOption loops over four steps with one folder suffix, so step 3 is special-cased.'
      impact: 'medium'
      recommendation: 'The plan applies F1 to F4: task-003 writes the exact rule from diagramHasNothingToDraw and the puml the command writes, tasks 002 and 003 discover the stories and assert the count of checked steps, task-002 names its homes (the plateau each step is told at, else the root and the plateau of its story), task-001 special-cases step 3 in the IT loop. The main agent should align the TDD text.'
    - id: gap-002
      type: 'risk'
      description: 'Q-1 and ASM-3 are open: the Brightcart stories may hold a step the editor calls empty, which the invariant will find. The packaged jar did not start at Stage 6, so nothing was counted.'
      impact: 'medium'
      recommendation: 'task-002 and task-003 run the invariant before anything else of the Brightcart is touched and apply the decision rule of Q-1: a step empty on purpose is listed in empty-steps.json with a reason, any other is fixed; a fix that moves a golden file stops the run for the author (escalation).'
  blocking_gaps: []
```

## 3. Execution Graph

```yaml
execution_graph:
  nodes:
    - id: task-001
      status: 'done'
      title: 'Change step 3 to the detailed viewpoint and follow the folder and the label in tests and manual'
      depends_on: []
      produces:
        - 'src/doc/examples/domain_plateaus/plateaus/story.migration.yaml'
        - 'src/test/java/io/morin/archicode/cli/GenerateStoriesTest.java'
        - 'src/test/java/io/morin/archicode/it/StoriesGenerateIT.java'
        - 'src/test/e2e/story-player.spec.js'
        - 'src/doc/README.adoc'
      agent_role: 'Documentation Agent'
      autonomy: 'autonomous'
      risk: 'low'
      confidence: 85
    - id: task-002
      status: 'done'
      title: 'Add the node invariant and the shared empty-steps.json'
      depends_on: []
      produces:
        - 'src/test/javascript/viewpoint-kernel/story-steps-not-empty.test.js'
        - 'src/test/resources/stories/empty-steps.json'
      agent_role: 'Test Generation Agent'
      autonomy: 'autonomous'
      risk: 'low'
      confidence: 75
    - id: task-003
      status: 'done'
      title: 'Add the Java invariant StoriesNotEmptyTest'
      depends_on: [task-002]
      produces:
        - 'src/test/java/io/morin/archicode/doc/StoriesNotEmptyTest.java'
      agent_role: 'Test Generation Agent'
      autonomy: 'autonomous'
      risk: 'low'
      confidence: 70
    - id: task-004
      status: 'done'
      title: 'Record the invariant and the exceptions file in CLAUDE.md'
      depends_on: [task-002, task-003]
      produces:
        - 'CLAUDE.md'
      agent_role: 'Documentation Agent'
      autonomy: 'autonomous'
      risk: 'low'
      confidence: 90
    - id: task-005
      status: 'done'
      title: 'Run the whole verification and the negative check'
      depends_on: [task-001, task-003, task-004]
      produces:
        - 'verification results in the run log'
      agent_role: 'QA Agent'
      autonomy: 'autonomous'
      risk: 'low'
      confidence: 75
  edges:
    - from: task-002
      to: task-003
      reason: 'The Java test reads the exceptions file the node task creates and mirrors its discovery.'
    - from: task-002
      to: task-004
      reason: 'CLAUDE.md describes the node test.'
    - from: task-003
      to: task-004
      reason: 'CLAUDE.md describes the Java test.'
    - from: task-001
      to: task-005
      reason: 'The negative check restores the old viewpoint on top of the finished change.'
    - from: task-003
      to: task-005
      reason: 'Verification runs on the finished change.'
    - from: task-004
      to: task-005
      reason: 'Verification includes the documented state.'
```

## 4. Task Catalog

```yaml
task_catalog:
  tasks:
    - id: task-001
      title: 'Change step 3 to the detailed viewpoint and follow the folder and the label in tests and manual'
      source_requirements:
        prd:
          - 'REQ-1'
          - 'REQ-2'
        tdd:
          - 'DEC-1'
          - 'IMP-1'
          - 'IMP-2'
          - 'IMP-3'
          - 'CON-1'
          - 'CON-2'
          - 'CON-3'
          - 'ASM-2'
      outputs:
        - 'story.migration.yaml step 3 has viewpoint "detailed"; element and at are unchanged and no other step moves.'
        - 'GenerateStoriesTest.theManualsMigrationIsDrawnAtItsPlateausAndAgainstBaseline lists 03-detailed instead of 03-overview.'
        - 'StoriesGenerateIT.migrationIsDrawnWithoutAnOption special-cases step 3 (folder 03-detailed, the other three keep -overview), per finding F4.'
        - 'story-player.spec.js line 82 says the status text the e2e run reads for the Detailed viewpoint of warehouse (expected Detailed of warehouse; read it from the run before fixing the string).'
        - 'README.adoc line 2425 writes the folders of migration as a range, 01-overview/ to 04-overview/, which is no longer true for step 3: reword it so that it names the four folders (01-overview, 02-overview, 03-detailed, 04-overview) or says the folder is named after the viewpoint of each step; the sentence on 02-overview and 04-overview stays; a grep for overview near migration and domain_plateaus finds no other quotation.'
      verification:
        - './mvnw test -Dtest=GenerateStoriesTest,ShippedFilesTest'
        - 'node --test src/test/javascript/viewpoint-kernel/shipped-files.test.js src/test/javascript/viewpoint-kernel/example-identity.test.js src/test/javascript/viewpoint-kernel/story-steps-plateaus.test.js'
        - 'archicode stories generate on a copy of domain_plateaus and read 03-detailed/plantuml/application/step_03.puml: two containers in a composite warehouse and the link counts with'
      risk: 'low'
      confidence: 85
      human_review: 'none'
      escalation_triggers:
        - 'Another test or page of the manual quotes 03-overview or Overview of warehouse and is not in the list.'
        - 'The e2e status text is not Detailed of warehouse (RISK-3): fix the string, one line.'
      delegation_tier: 'standard'
      results: 'tier standard, model sonnet, effort medium, profile low-cost, passed first time, inline (leaf), independently verified'
    - id: task-002
      title: 'Add the node invariant and the shared empty-steps.json'
      source_requirements:
        prd:
          - 'REQ-3'
        tdd:
          - 'DEC-2'
          - 'IMP-4'
          - 'CTR-1'
          - 'FLOW-1'
          - 'TG-3'
          - 'ASM-3'
          - 'Q-1'
      outputs:
        - 'src/test/resources/stories/empty-steps.json holds [].'
        - 'story-steps-not-empty.test.js discovers the stories of domain_plateaus and of the layered Brightcart (no hand-written list of story ids), draws each step with storyStepScene from the homes of story-player-scene.test.js (the plateau each step is told at, else the root and the plateau of its story), skips a step that has a problem, fails a step whose diagram html holds diagram-empty and is not listed, fails a listed step that draws something, fails an entry without a reason, and asserts the number of steps it checked (the four stories, all their steps) so a skip cannot pass.'
        - 'If the invariant finds an empty Brightcart step, Q-1 is applied: listed with a reason when empty on purpose, else fixed; a fix that moves a golden file is an escalation.'
      verification:
        - 'node --test src/test/javascript/viewpoint-kernel/story-steps-not-empty.test.js'
        - 'npm run format:check'
        - 'npm run lint'
      risk: 'low'
      confidence: 75
      human_review: 'none'
      escalation_triggers:
        - 'The invariant finds an empty step in a Brightcart story whose fix moves a golden file or expected/entries.json.'
        - 'The scene of a step needs a helper that story-player-scene.test.js does not export and copying it exceeds a few lines.'
      delegation_tier: 'standard'
      results: 'tier standard, model sonnet, effort medium, profile low-cost, passed first time, inline (leaf), independently verified'
    - id: task-003
      title: 'Add the Java invariant StoriesNotEmptyTest'
      source_requirements:
        prd:
          - 'REQ-3'
        tdd:
          - 'DEC-2'
          - 'IMP-5'
          - 'CTR-1'
          - 'FLOW-1'
          - 'RISK-2'
          - 'Q-1'
      outputs:
        - 'StoriesNotEmptyTest in io.morin.archicode.doc runs stories generate on a copy of domain_plateaus and on the layered Brightcart for the plateaus StoriesGenerateIT uses (saas and marketplace), discovers the stories and steps from the output folders and the manifests (no list of ids), applies an exact rule written in the test (a step file is empty when it holds no -> link and fewer than two element rectangles, taken from diagramHasNothingToDraw and checked against the puml the command writes), reads src/test/resources/stories/empty-steps.json, fails an empty unlisted step, a listed step that draws something and an entry without a reason, and asserts the number of steps it checked.'
        - 'The test asserts what the files hold (T10) and PMD is clean on it.'
      verification:
        - './mvnw test -Dtest=StoriesNotEmptyTest'
        - './mvnw test-compile pmd:check'
      risk: 'low'
      confidence: 70
      human_review: 'none'
      escalation_triggers:
        - 'The Java rule and the node rule disagree on a step (RISK-2): resolve the disagreement, never loosen either.'
        - 'JaCoCo or PMD would need a suppression.'
      delegation_tier: 'standard'
      results: 'tier standard, model sonnet, effort medium, profile low-cost, passed first time, inline (leaf), independently verified'
    - id: task-004
      title: 'Record the invariant and the exceptions file in CLAUDE.md'
      source_requirements:
        prd:
          - 'REQ-3'
        tdd:
          - 'IMP-6'
      outputs:
        - 'The paragraph of CLAUDE.md on the shipped stories gets one sentence: the two tests, the editor rule they share, and empty-steps.json with its reason field; no other paragraph changes.'
      verification:
        - 'git diff --stat CLAUDE.md shows an added sentence only'
        - 'npm run format:check'
      risk: 'low'
      confidence: 90
      human_review: 'none'
      escalation_triggers:
        - 'The sentence would contradict another paragraph of CLAUDE.md.'
      delegation_tier: 'standard'
      results: 'tier standard, model sonnet, effort medium, profile low-cost, passed first time, inline (leaf), independently verified'
    - id: task-005
      title: 'Run the whole verification and the negative check'
      source_requirements:
        prd:
          - 'REQ-1'
          - 'REQ-2'
          - 'REQ-3'
        tdd:
          - 'TG-1'
          - 'TG-2'
          - 'TG-3'
          - 'RISK-1'
          - 'RISK-3'
          - 'Observability and Verification'
      outputs:
        - 'Results of the commands below recorded in the run log, with any finding.'
        - 'Negative check: step 3 restored once to overview, both new tests red naming the story and step, then detailed put back and both green.'
      verification:
        - './mvnw test-compile pmd:check'
        - './mvnw verify'
        - './mvnw verify -DskipITs=false'
        - 'npm run test:unit'
        - 'npm run format:check'
        - 'npm run lint'
        - './mvnw package -Dmaven.test.skip -Dplugin.asciidoctor.skip=true then npm run test:e2e (story-player.spec.js at least)'
      risk: 'low'
      confidence: 75
      human_review: 'none'
      escalation_triggers:
        - 'The packaged jar fails to start (ArC initialization error seen at Stage 6): log it and rebuild with ./mvnw clean install before concluding.'
        - 'A failure the change did not cause.'
      delegation_tier: 'standard'
      results: 'tier standard, model sonnet, effort medium, profile low-cost, passed after escalation to effort high, inline (leaf), independently verified'
```

## 5. Parallelization Plan

```yaml
parallelization_plan:
  groups:
    - id: parallel-group-001
      tasks:
        - task-001
        - task-002
      reason: 'One edits the example, three tests and the manual; the other adds a new test file and a new resource. No shared file.'
      conflict_risks:
        - 'task-002 draws the story as shipped: if task-001 has not landed, step 3 is empty and the new test is red, which is the expected negative; the order of merge does not matter for the files.'
```

## 6. Human Review Gates

No gate: example content and tests, no authentication, data, release or public contract. The run operates under the autonomy override of complete-run (it continues without a stop between documents); no task is `human_required`, so the override changes nothing here. The one stop is conditional: a fix of a Brightcart step that moves a golden file stops the run for the author (Q-1).

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
      rationale: 'One word in an example and the strings that follow it.'
    - id: task-002
      risk: 'low'
      rationale: 'A new test; the unknown is what it finds in the Brightcart (RISK-1).'
    - id: task-003
      risk: 'low'
      rationale: 'A new test with an approximate rule that must agree with the page (RISK-2).'
    - id: task-004
      risk: 'low'
      rationale: 'One sentence of CLAUDE.md.'
    - id: task-005
      risk: 'low'
      rationale: 'Read-only checks and one reversible negative edit.'
  by_area:
    - area: 'docs'
      risk: 'low'
      rationale: 'The manual quotes the YAML by include; only the folder names are typed.'
    - area: 'tests'
      risk: 'low'
      rationale: 'Additive tests, one shared resource.'
```

## 8. Confidence Assessment

```yaml
confidence_assessment:
  by_task:
    - id: task-001
      score: 85
      rationale: 'ASM-2 was validated by running the command on a copy; the dependent places were found by search.'
    - id: task-002
      score: 75
      rationale: 'Loading the page and the homes follows a neighbour test, but the Brightcart steps are not yet counted (ASM-3).'
    - id: task-003
      score: 70
      rationale: 'The Java rule is an approximation of the page rule and the Brightcart is drawn per plateau.'
    - id: task-004
      score: 90
      rationale: 'One sentence.'
    - id: task-005
      score: 75
      rationale: 'The e2e status string and the packaged jar are known unknowns.'
```

## 9. Agent Assignment Plan

```yaml
agent_assignment_plan:
  assignments:
    - task_id: task-001
      agent_role: 'Documentation Agent'
      objective: 'Set step 3 of migration to the detailed viewpoint and fix every string that names its folder or label.'
      context:
        prd_excerpts:
          - 'REQ-1 step 3 plays a slide with something on it.'
          - 'REQ-2 every place the manual quotes the example is updated.'
        tdd_excerpts:
          - 'DEC-1 viewpoint detailed, nothing else in the step changes.'
          - 'CON-3 the folder is NN-viewpoint, so 03-overview becomes 03-detailed.'
      likely_files:
        - 'src/doc/examples/domain_plateaus/plateaus/story.migration.yaml'
        - 'src/test/java/io/morin/archicode/cli/GenerateStoriesTest.java'
        - 'src/test/java/io/morin/archicode/it/StoriesGenerateIT.java'
        - 'src/test/e2e/story-player.spec.js'
        - 'src/doc/README.adoc'
      acceptance_criteria:
        - 'The generated step_03.puml has two containers and a link; no test or page names 03-overview for migration.'
      verification:
        - './mvnw test -Dtest=GenerateStoriesTest,ShippedFilesTest'
      escalation_triggers:
        - 'A quotation of step 3 outside the listed files.'
      suggested_subagent_type: 'general-purpose'
      suggested_model: '(default)'
      suggested_effort: 'medium'
    - task_id: task-002
      agent_role: 'Test Generation Agent'
      objective: 'Write the node invariant over the shipped stories and the empty exceptions file.'
      context:
        prd_excerpts:
          - 'REQ-3 a test that every step of every shipped story draws at least one element or is stated empty on purpose.'
        tdd_excerpts:
          - 'DEC-2 the rule is the editor diagramHasNothingToDraw; one list of exceptions with a reason for both tools.'
          - 'CTR-1 a JSON array of story, step from 1, reason; empty after this run.'
          - 'Q-1 list an empty-on-purpose Brightcart step with a reason, fix any other, stop if a golden file moves.'
      likely_files:
        - 'src/test/javascript/viewpoint-kernel/story-steps-not-empty.test.js'
        - 'src/test/resources/stories/empty-steps.json'
        - 'src/test/javascript/viewpoint-kernel/story-player-scene.test.js'
      acceptance_criteria:
        - 'Red on the old overview step, green on detailed, the count of checked steps asserted, no list of story ids in the test.'
      verification:
        - 'node --test src/test/javascript/viewpoint-kernel/story-steps-not-empty.test.js'
        - 'npm run lint'
      escalation_triggers:
        - 'An empty Brightcart step whose fix moves a golden file.'
      suggested_subagent_type: 'general-purpose'
      suggested_model: '(default)'
      suggested_effort: 'medium'
    - task_id: task-003
      agent_role: 'Test Generation Agent'
      objective: 'Write the Java invariant over the files stories generate writes, with the exact rule of the page.'
      context:
        prd_excerpts:
          - 'REQ-3 the same invariant holds for the command line.'
        tdd_excerpts:
          - 'DEC-2 at least one link or two element rectangles in the generated file, the same exceptions file.'
          - 'RISK-2 a disagreement with the node test is a finding, never a reason to loosen a rule.'
      likely_files:
        - 'src/test/java/io/morin/archicode/doc/StoriesNotEmptyTest.java'
        - 'src/test/java/io/morin/archicode/it/StoriesGenerateIT.java'
        - 'src/test/resources/stories/empty-steps.json'
      acceptance_criteria:
        - 'Discovers stories and steps, asserts the count checked, fails on an unlisted empty step and on a stale exception, PMD clean.'
      verification:
        - './mvnw test -Dtest=StoriesNotEmptyTest'
        - './mvnw test-compile pmd:check'
      escalation_triggers:
        - 'The two rules disagree on a step.'
      suggested_subagent_type: 'general-purpose'
      suggested_model: '(default)'
      suggested_effort: 'medium'
    - task_id: task-004
      agent_role: 'Documentation Agent'
      objective: 'Add one sentence to the CLAUDE.md paragraph on the shipped stories.'
      context:
        prd_excerpts:
          - 'REQ-3 on purpose is stated in one place.'
        tdd_excerpts:
          - 'IMP-6 one sentence on the invariant and the exceptions file.'
      likely_files:
        - 'CLAUDE.md'
      acceptance_criteria:
        - 'The sentence names both tests, the shared rule and empty-steps.json; nothing else changes.'
      verification:
        - 'git diff --stat CLAUDE.md'
      escalation_triggers:
        - 'A contradiction with another paragraph.'
      suggested_subagent_type: 'general-purpose'
      suggested_model: '(default)'
      suggested_effort: 'medium'
    - task_id: task-005
      agent_role: 'QA Agent'
      objective: 'Run every check of the TDD verification section and the negative check, and record the results.'
      context:
        prd_excerpts:
          - 'REQ-3 the unit and Java suites pass.'
        tdd_excerpts:
          - 'Observability and Verification; RISK-1 to RISK-3.'
      likely_files:
        - 'target/e2e'
        - 'src/doc/examples/domain_plateaus/plateaus/story.migration.yaml'
      acceptance_criteria:
        - 'All commands exit 0; the negative check is red then green; the story file is back on detailed.'
      verification:
        - './mvnw verify -DskipITs=false'
        - 'npm run test:unit'
        - 'npm run test:e2e'
      escalation_triggers:
        - 'The packaged jar does not start, or a failure the change did not cause.'
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
        - 'node tests on the shipped files'
        - 'manual read of the generated puml'
      success_criteria:
        - 'GenerateStoriesTest and ShippedFilesTest green; step_03.puml holds two containers and a link.'
    - task_id: task-002
      methods:
        - 'node unit test'
        - 'lint and format'
      success_criteria:
        - 'Green with detailed, red with overview, count of steps asserted.'
    - task_id: task-003
      methods:
        - 'unit tests'
        - 'PMD'
      success_criteria:
        - 'StoriesNotEmptyTest green; pmd:check clean; agrees with the node test on every step.'
    - task_id: task-004
      methods:
        - 'diff review'
      success_criteria:
        - 'One added sentence in CLAUDE.md.'
    - task_id: task-005
      methods:
        - 'full verify'
        - 'integration tests'
        - 'node suite'
        - 'end-to-end suite'
        - 'negative check'
      success_criteria:
        - 'verify, test:unit, format:check, lint and test:e2e exit 0; JaCoCo floors hold; the old step turns both new tests red.'
```

## 11. Escalation Rules

This run operates under the autonomy override of complete-run: a task that would be `human_required` is executed and its decision logged. None is expected.

```yaml
escalation_rules:
  rules:
    - condition: 'The invariant finds an empty step in fork_tour, order_journey or seller_journey.'
      action: 'Apply Q-1: list it in empty-steps.json with a reason if empty on purpose, else fix it in the fixture; log the choice in the prg.'
    - condition: 'A fix of a Brightcart step moves a golden file or expected/entries.json.'
      action: 'Stop the run for the author and log the finding.'
    - condition: 'The Java rule and the node rule disagree on a step.'
      action: 'Log it as a finding and resolve the disagreement in the Java rule; do not loosen the node rule.'
    - condition: 'The packaged jar fails to start (ArC initialization error).'
      action: 'Rebuild with ./mvnw clean install, log it, and rerun the integration and e2e checks.'
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
    - task-002
    - task-003
    - task-004
    - task-005
  parallel_groups:
    - parallel-group-001
  required_human_gates: []
  highest_risk_tasks:
    - task-005
  lowest_confidence_tasks:
    - task-003
  next_action: 'none: all five tasks done and verified at Stage 11.'
  criteria:
    - 'All five tasks done and their verification green.'
    - 'Step 3 of migration is detailed and every place that names its folder or label says so.'
    - 'Both invariant tests read empty-steps.json, state their step count and fail on the old overview step.'
```
