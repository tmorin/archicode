---
title: 'PLN: one mistake in a view is told in the same words by both tools (#170)'
type: pln
status: completed
owner: tmorin
date: 2026-10-26
run: 0180
wave: 024
related:
  - docs/wav/wav-024-fixes-and-editor-modules/run/run-0180-view-problem-sentences/tdd-0180-view-problem-sentences.md
---

# Execution Plan: run 0180, view problem sentences (#170)

This is a TDD+pln run: there is no PRD. The requirements are `REQ-1` to `REQ-5` of the TDD, taken from the wave entry W-3 and issue #170. The plan reads the TDD as reviewed at Stage 5 (the `detailed` viewpoint says `unknown focal element`, DEC-3).

## 1. Executive Summary

```yaml
summary:
  status: 'done'
  product_goal: 'A view with no element and a view whose element exists nowhere are told with the same sentence, byte for byte, by the command line and by the editor, and a test holds both tools to it (#170).'
  technical_approach: 'Add the backticks and the new names-which-does-not-exist sentence in KernelViewpointFactory, move viewProblem and stepProblem of the editor page to the same two sentences (step_NN for a step), write view-problem-cases.json with a Java and a node reader, update the tests that quote the old words, rewrite the Not aligned note of CLAUDE.md, then run the whole verification and the negative check.'
  total_tasks: 6
  parallel_groups: 1
  high_risk_tasks: 0
  human_review_gates: 0
  autonomy_level: 'high'
  recommendation: 'proceed'
  criteria:
    - 'archicode views generate -i v on a view with no element prints error: the view `v` has no element: write the reference of one in `properties.element`, exit 1, and the editor viewProblem returns the same bytes.'
    - 'A view whose element exists nowhere prints the view `v` names `gone`, which does not exist for overview, detailed and deep, in both tools; an element that holds the missing reference still gets the sentence of #159.'
    - 'A story step with an inline recipe is named step_NN (two digits) in both tools.'
    - 'view-problem-cases.json is read by ViewProblemCasesTest and view-problems.test.js, and each fails when either tool changes a word of a covered sentence.'
    - 'No output of a command that succeeds changes: scripts/byte-identity.sh reports no difference and needs no new exception.'
    - 'CLAUDE.md no longer says Not aligned, recorded for these sentences and lists the problems that stay different on purpose.'
    - './mvnw test-compile pmd:check, ./mvnw verify, ./mvnw verify -DskipITs=false, npm run test:coverage, npm run format:check, npm run lint and npm run test:e2e pass.'
```

## 2. PRD/TDD Consistency Assessment

```yaml
consistency_assessment:
  aligned_items:
    - 'REQ-1 is addressed by DEC-1, IMP-4 and IMP-5; REQ-2 by DEC-2, IMP-1 and IMP-2; REQ-3 by DEC-3 and DEC-4; REQ-4 by IMP-6; REQ-5 by IMP-7.'
    - 'The TDD scope matches the wave entry W-3 and its P1 gate.'
  gaps:
    - id: gap-001
      type: 'ambiguity'
      description: 'The TDD says the case file lives in src/test/javascript/viewpoint-kernel/ while the wave manifest lists src/test/resources as a likely path. CON-1 settles it (the neighbour wins, as in run 0165).'
      impact: 'low'
      recommendation: 'Follow CON-1: put the file beside dangling-reference-cases.json and read it from there in Java.'
    - id: gap-002
      type: 'risk'
      description: 'The TDD names the five call sites of stepProblem by line number (20349, 20621, 20751, 21287, 21372) taken from a working tree that other runs of the wave are editing; the lines may have moved.'
      impact: 'low'
      recommendation: 'task-002 finds the call sites with a search for stepProblem( and viewProblem( and does not trust the numbers (at Stage 9 the five stepProblem callers were still at the lines the TDD gives, and stepProblem itself calls viewProblem(step, at) for an inline recipe, which needs the step name too).'
    - id: gap-003
      type: 'risk'
      description: 'CLAUDE.md, standalone.html and several tests already carry uncommitted changes of other runs of the wave.'
      impact: 'medium'
      recommendation: 'Every task edits only the lines it owns and never reverts, formats or restages a file wholesale.'
  blocking_gaps: []
```

## 3. Execution Graph

```yaml
execution_graph:
  nodes:
    - id: task-001
      status: 'done'
      title: 'Command line: backticks in has no element and the new names-which-does-not-exist sentence'
      depends_on: []
      produces:
        - 'src/main/java/io/morin/archicode/viewpoint/kernel/KernelViewpointFactory.java'
        - 'src/test/java/io/morin/archicode/cli/ViewWithoutPropertiesTest.java'
      agent_role: 'Backend Agent'
      autonomy: 'autonomous'
      risk: 'low'
      confidence: 80
    - id: task-002
      status: 'done'
      title: 'Editor: viewProblem and stepProblem return the two shared sentences, with step_NN'
      depends_on: []
      produces:
        - 'src/main/resources/editor-webapp/standalone.html'
      agent_role: 'Frontend Agent'
      autonomy: 'autonomous'
      risk: 'medium'
      confidence: 75
    - id: task-003
      status: 'done'
      title: 'Update the tests and data that quote the old words'
      depends_on: [task-002]
      produces:
        - 'src/test/javascript/viewpoint-kernel/library-view-edit.test.js'
        - 'src/test/javascript/viewpoint-kernel/library-view-diagram.test.js'
        - 'src/test/javascript/viewpoint-kernel/library-view-panels.test.js'
        - 'src/test/javascript/viewpoint-kernel/view-layer-any-case.test.js'
        - 'src/test/resources/brightcart/negative-cases.json'
      agent_role: 'Test Generation Agent'
      autonomy: 'autonomous'
      risk: 'low'
      confidence: 80
    - id: task-004
      status: 'done'
      title: 'Add view-problem-cases.json and its Java and node readers'
      depends_on: [task-001, task-002]
      produces:
        - 'src/test/javascript/viewpoint-kernel/view-problem-cases.json'
        - 'src/test/java/io/morin/archicode/cli/ViewProblemCasesTest.java'
        - 'src/test/javascript/viewpoint-kernel/view-problems.test.js'
      agent_role: 'Test Generation Agent'
      autonomy: 'autonomous'
      risk: 'medium'
      confidence: 70
    - id: task-005
      status: 'done'
      title: 'Rewrite the Not aligned note of CLAUDE.md and check the manual and the guide'
      depends_on: [task-004]
      produces:
        - 'CLAUDE.md'
      agent_role: 'Documentation Agent'
      autonomy: 'autonomous'
      risk: 'low'
      confidence: 90
    - id: task-006
      status: 'done'
      title: 'Run the whole verification and the negative check'
      depends_on: [task-003, task-004, task-005]
      produces:
        - 'verification results in the run log'
      agent_role: 'QA Agent'
      autonomy: 'autonomous'
      risk: 'low'
      confidence: 75
  edges:
    - from: task-002
      to: task-003
      reason: 'The quoting tests are changed to the words the page now returns.'
    - from: task-001
      to: task-004
      reason: 'The Java reader asserts the command line lines of the new sentences.'
    - from: task-002
      to: task-004
      reason: 'The node reader asserts the page sentence equals the command line line.'
    - from: task-004
      to: task-005
      reason: 'CLAUDE.md names the case file and its two readers.'
    - from: task-003
      to: task-006
      reason: 'Verification runs on the finished change.'
    - from: task-004
      to: task-006
      reason: 'Verification includes the new readers and the negative check.'
    - from: task-005
      to: task-006
      reason: 'Verification includes the documented state.'
```

## 4. Task Catalog

```yaml
task_catalog:
  tasks:
    - id: task-001
      title: 'Command line: backticks in has no element and the new names-which-does-not-exist sentence'
      source_requirements:
        prd:
          - 'REQ-2'
          - 'REQ-3'
        tdd:
          - 'DEC-2'
          - 'DEC-3'
          - 'IMP-1'
          - 'CTR-2'
          - 'ASM-3'
          - 'ASM-4'
          - 'RISK-1'
          - 'CON-3'
      outputs:
        - 'KernelViewpointFactory.create says the view `v` has no element: write the reference of one in `properties.element` (backticks round the id), for a view and for a step named step_NN.'
        - 'Where danglingSentence returned the kernel own words, create rewrites dangling reference: X and unknown focal element: X into the view `v` names `X`, which does not exist, only for a view that is not a map and only when X is the focal element of the view; every other X and a map keep the kernel words. One pattern placed next to DANGLING matches the two kernel messages.'
        - 'An element that holds X (a relationship, a uses, a hosted application) still gets the sentence of #159.'
        - 'ViewWithoutPropertiesTest SENTENCE has the backticks and step_01.'
        - 'The kernel, the .wasm and the contract number are untouched; no NOPMD and no SuppressWarnings.'
      verification:
        - './mvnw test -Dtest=ViewWithoutPropertiesTest,DanglingReferenceCasesTest,GuideViewPropertiesTest,KernelViewpointFactoryTest'
        - './mvnw test-compile pmd:check'
        - 'Run the packaged jar on a copy with one view per viewpoint (overview, detailed, deep) on element gone and read the one error line of each; a map pinned on gone still prints the view v: dangling reference: gone.'
      risk: 'low'
      confidence: 80
      human_review: 'none'
      escalation_triggers:
        - 'The rewrite changes a message that is not the focal element of the view (RISK-1): narrow the match, never widen it.'
        - 'A test other than the listed ones quotes the old command line text.'
      delegation_tier: 'standard'
      results: 'tier standard, model sonnet, effort medium, profile low-cost, passed first time, inline (leaf), independently verified'
    - id: task-002
      title: 'Editor: viewProblem and stepProblem return the two shared sentences, with step_NN'
      source_requirements:
        prd:
          - 'REQ-2'
          - 'REQ-3'
        tdd:
          - 'DEC-2'
          - 'DEC-3'
          - 'IMP-2'
          - 'TG-3'
          - 'RISK-3'
          - 'RISK-4'
          - 'ASM-2'
      outputs:
        - 'viewProblem(view, plateau, name) takes an optional third parameter name (default view.id) and returns the view `name` has no element: write the reference of one in `properties.element` where it said This view has no element.'
        - 'In the branch that said The element “x” does not exist any more. (the one where viewLacksInPlateau is null) viewProblem returns the view `name` names `x`, which does not exist.'
        - 'stepProblem(step, plateau, number) takes the step place and passes step_NN (two digits from 01); every caller of stepProblem is found by a search and passes the place of its step; a step that names a view keeps its view id.'
        - 'The sentences stay the plain text the page already escapes where it shows them; no new call site inserts it raw. The other sentences of viewProblem and stepProblem are not touched (DEC-4).'
        - 'applySavedView returns the sentence to its caller unchanged.'
      verification:
        - 'node --test src/test/javascript/viewpoint-kernel/library-view-edit.test.js src/test/javascript/viewpoint-kernel/editor-at-360-px.test.js'
        - 'npm run lint'
        - 'Search standalone.html for This view has no element and for does not exist any more and check what is left is the Move dialog and the pills, not viewProblem.'
      risk: 'medium'
      confidence: 75
      human_review: 'none'
      escalation_triggers:
        - 'A caller of stepProblem cannot compute the place of its step.'
        - 'The longer sentence breaks a measure of editor-at-360-px.test.js or the broken badge (RISK-3).'
        - 'Another run of the wave has edited the same functions in the working tree: merge by hand, never overwrite.'
      delegation_tier: 'standard'
      results: 'tier standard, model sonnet, effort medium, profile low-cost, passed after escalation to effort high, inline (leaf), independently verified'
    - id: task-003
      title: 'Update the tests and data that quote the old words'
      source_requirements:
        prd:
          - 'REQ-4'
        tdd:
          - 'IMP-6'
          - 'IMP-3'
      outputs:
        - 'library-view-edit.test.js (has no element), library-view-diagram.test.js, library-view-panels.test.js, view-layer-any-case.test.js assert the new words; the search of src/test, src/doc and src/main for has no element, does not exist any more, This view does not exist and This step has no view is run again first and its result is what is edited.'
        - 'The two viewProblems entries of negative-cases.json for commerce.cartt (cart_view, lines 2820 and 2832) follow DEC-3; the three entries that say is not in the plateau stay (DEC-4); the reader of the key is brightcart-negative.test.js (node only); each test is changed only after reading why it asserts the old text.'
        - 'A match about a deleted view or an element deleted from the page (the Move dialog, the pills, The view “v” does not exist any more., This step has no view.) stays.'
        - 'The search of the manual and of the guide for the old words finds nothing to change (README.adoc line 1525 already has the backticks); if guide.md or golden.md moves, golden.md is regenerated with the command of CLAUDE.md.'
      verification:
        - 'node --test on each edited test file'
        - 'node --test src/test/javascript/viewpoint-kernel/brightcart-negative.test.js (the one reader of the viewProblems key; BrightcartNegativeCasesTest.java reads cli only)'
        - 'npm run format:check'
      risk: 'low'
      confidence: 80
      human_review: 'none'
      escalation_triggers:
        - 'A test asserts the old words for a reason the TDD did not foresee.'
      delegation_tier: 'standard'
      results: 'tier standard, model sonnet, effort medium, profile low-cost, passed first time, inline (leaf), independently verified'
    - id: task-004
      title: 'Add view-problem-cases.json and its Java and node readers'
      source_requirements:
        prd:
          - 'REQ-1'
        tdd:
          - 'DEC-1'
          - 'CTR-1'
          - 'IMP-4'
          - 'IMP-5'
          - 'TG-1'
          - 'TG-2'
          - 'CON-1'
          - 'FLOW-1'
      outputs:
        - 'view-problem-cases.json beside dangling-reference-cases.json with a comment that lists the problems that stay different (DEC-4) and the cases V01 to V08 of IMP-4: overview with no properties, properties empty, element blank, detailed and deep with no element, a story step with no properties (step_01, stories generate), overview, detailed and deep on an element that exists nowhere, and the case where a relationship destination is also missing and the sentence of #159 wins with its two lines in print order.'
        - 'ViewProblemCasesTest (new, modelled on DanglingReferenceCasesTest) runs the command of each case on a copy of its files, asserts the error lines and exit 1, and fails on a stack trace and on an extra line.'
        - 'view-problems.test.js (new, modelled on dangling-references.test.js) loads each workspace, calls viewProblem (stepProblem(step, null, 1) for a step) and asserts the problem equals the single line of every cli entry.'
        - 'The cases are written from the output of the packaged jar before the change (the old sentences) and then corrected, as the cases of #159 were.'
      verification:
        - './mvnw test -Dtest=ViewProblemCasesTest'
        - 'node --test src/test/javascript/viewpoint-kernel/view-problems.test.js'
        - './mvnw test-compile pmd:check'
        - 'npm run format:check'
        - 'npm run lint'
      risk: 'medium'
      confidence: 70
      human_review: 'none'
      escalation_triggers:
        - 'The two tools disagree on a case after tasks 001 and 002: fix the tool, never loosen the case.'
        - 'PMD or JaCoCo would need a suppression.'
      delegation_tier: 'standard'
      results: 'tier standard, model sonnet, effort medium, profile low-cost, passed first time, inline (leaf), independently verified'
    - id: task-005
      title: 'Rewrite the Not aligned note of CLAUDE.md and check the manual and the guide'
      source_requirements:
        prd:
          - 'REQ-5'
        tdd:
          - 'IMP-7'
          - 'DEC-4'
          - 'IMP-3'
      outputs:
        - 'The sentence Not aligned, recorded under A dangling reference says where it is is replaced by one on view-problem-cases.json, ViewProblemCasesTest, view-problems.test.js and the two covered sentences, followed by the list of the problems that stay different on purpose with their reasons (DEC-4).'
        - 'The sentence quoted under No author mistake in one key ends in a stack trace is left as it is; no other paragraph of CLAUDE.md changes.'
      verification:
        - 'git diff CLAUDE.md shows only these paragraphs of this run'
      risk: 'low'
      confidence: 90
      human_review: 'none'
      escalation_triggers:
        - 'The paragraph has been edited by another run of the wave in the working tree.'
      delegation_tier: 'standard'
      results: 'tier standard, model sonnet, effort medium, profile low-cost, passed first time, inline (leaf), independently verified'
    - id: task-006
      title: 'Run the whole verification and the negative check'
      source_requirements:
        prd:
          - 'REQ-1'
          - 'REQ-2'
          - 'REQ-3'
          - 'REQ-4'
          - 'REQ-5'
        tdd:
          - 'TG-1'
          - 'TG-2'
          - 'TG-3'
          - 'TG-4'
          - 'CON-4'
          - 'CON-5'
          - 'Observability and Verification'
      outputs:
        - 'Results of the commands below recorded in the run log, with any finding.'
        - 'Negative check: put the old text back in one tool, see the case fail in that tool reader and not in the other, restore it; once for each tool.'
        - 'Manual check: the packaged jar on a copy gives the two new lines.'
      verification:
        - './mvnw test-compile pmd:check'
        - './mvnw verify'
        - './mvnw verify -DskipITs=false'
        - 'npm run test:coverage'
        - 'npm run format:check'
        - 'npm run lint'
        - './mvnw package -Dmaven.test.skip -Dplugin.asciidoctor.skip=true then npm run test:e2e'
        - 'scripts/byte-identity.sh reports no difference and no new exception'
      risk: 'low'
      confidence: 75
      human_review: 'none'
      escalation_triggers:
        - 'The packaged jar fails to start: rebuild with ./mvnw clean install before concluding.'
        - 'A failure the change did not cause (a flake of another run of the wave): log it as a finding.'
        - 'byte-identity.sh reports a difference: a command that succeeds changed, stop and fix.'
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
      reason: 'One edits a Java class and its test, the other the editor page; no shared file.'
      conflict_risks:
        - 'standalone.html is out of Prettier and carries uncommitted edits of other runs: task-002 edits only viewProblem, stepProblem and their callers.'
```

## 6. Human Review Gates

No gate: error sentences, an editor page text, tests and notes; no authentication, data, release or public contract beyond two error sentences (CTR-2, one release old). The run operates under the autonomy override of complete-run, so a `human_required` task would have been executed without a stop; none exists here.

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
      rationale: 'The rewrite runs only after the kernel refused, so no success output moves (RISK-1 narrows the match).'
    - id: task-002
      risk: 'medium'
      rationale: 'A shared page file edited by several runs, and five callers that must all pass the step place.'
    - id: task-003
      risk: 'low'
      rationale: 'Strings in tests, changed after reading why they assert the old text.'
    - id: task-004
      risk: 'medium'
      rationale: 'Two readers of one file, written from the jar output before the change; the unknown is the order of the lines of V08.'
    - id: task-005
      risk: 'low'
      rationale: 'Two paragraphs of CLAUDE.md.'
    - id: task-006
      risk: 'low'
      rationale: 'Read-only checks and reversible negative edits.'
  by_area:
    - area: 'command line'
      risk: 'low'
      rationale: 'Error text only.'
    - area: 'editor page'
      risk: 'medium'
      rationale: 'A large single-file page shared with other runs.'
    - area: 'tests'
      risk: 'low'
      rationale: 'Additive tests and string updates.'
```

## 8. Confidence Assessment

```yaml
confidence_assessment:
  by_task:
    - id: task-001
      score: 80
      rationale: 'ASM-3 was validated by running the packaged jar on one view per viewpoint.'
    - id: task-002
      score: 75
      rationale: 'The call sites are known but their lines may have moved (gap-002).'
    - id: task-003
      score: 80
      rationale: 'The tests that quote the words were found by search; the reader of the viewProblems of negative-cases.json is brightcart-negative.test.js (checked at Stage 9).'
    - id: task-004
      score: 70
      rationale: 'The case file shape follows a proven neighbour; the cases of the layered and step forms are new.'
    - id: task-005
      score: 90
      rationale: 'Text edit of known paragraphs.'
    - id: task-006
      score: 75
      rationale: 'Long suite; a flake of another run is possible.'
```

## 9. Agent Assignment Plan

```yaml
agent_assignment_plan:
  assignments:
    - task_id: task-001
      agent_role: 'Backend Agent'
      objective: 'Make the command line say the two shared sentences.'
      context:
        prd_excerpts:
          - 'REQ-2 the words of whichever tool is behind are aligned, at least has no element.'
          - 'REQ-3 the sentence for an element that exists nowhere is shared.'
        tdd_excerpts:
          - 'DEC-2 the view `v` has no element: write the reference of one in `properties.element`.'
          - 'DEC-3 the view `v` names `X`, which does not exist, for dangling reference and unknown focal element, focal element of a non-map only.'
      likely_files:
        - 'src/main/java/io/morin/archicode/viewpoint/kernel/KernelViewpointFactory.java'
        - 'src/test/java/io/morin/archicode/cli/ViewWithoutPropertiesTest.java'
      acceptance_criteria:
        - 'The three viewpoints print the new line on element gone; a map and an element that holds X keep their sentences.'
      verification:
        - './mvnw test -Dtest=ViewWithoutPropertiesTest,DanglingReferenceCasesTest'
      escalation_triggers:
        - 'The match catches a message that is not the focal element.'
      suggested_subagent_type: 'general-purpose'
      suggested_model: '(default)'
      suggested_effort: 'medium'
    - task_id: task-002
      agent_role: 'Frontend Agent'
      objective: 'Make viewProblem and stepProblem return the same two sentences, with step_NN for a step.'
      context:
        prd_excerpts:
          - 'REQ-2 and REQ-3 as above.'
        tdd_excerpts:
          - 'DEC-2 a name parameter, default view.id; stepProblem takes the place and passes step_NN.'
          - 'DEC-3 the branch that said any more says names x, which does not exist.'
          - 'RISK-4 every caller passes the place.'
      likely_files:
        - 'src/main/resources/editor-webapp/standalone.html'
      acceptance_criteria:
        - 'Search finds no caller of stepProblem without the place; the other sentences are byte for byte as before.'
      verification:
        - 'node --test src/test/javascript/viewpoint-kernel/library-view-edit.test.js'
        - 'npm run lint'
      escalation_triggers:
        - 'A measure of the 360 px suite breaks.'
      suggested_subagent_type: 'general-purpose'
      suggested_model: '(default)'
      suggested_effort: 'medium'
    - task_id: task-003
      agent_role: 'Test Generation Agent'
      objective: 'Move every test and data file that quotes the old words to the new ones.'
      context:
        prd_excerpts:
          - 'REQ-4 the tests that quote the words are updated.'
        tdd_excerpts:
          - 'IMP-6 the list of files; a match about a deleted view or element stays.'
      likely_files:
        - 'src/test/javascript/viewpoint-kernel/library-view-edit.test.js'
        - 'src/test/javascript/viewpoint-kernel/library-view-diagram.test.js'
        - 'src/test/javascript/viewpoint-kernel/library-view-panels.test.js'
        - 'src/test/javascript/viewpoint-kernel/view-layer-any-case.test.js'
        - 'src/test/resources/brightcart/negative-cases.json'
      acceptance_criteria:
        - 'The edited tests pass on the new words and no test asserts the old viewProblem text.'
      verification:
        - 'node --test on each edited file'
      escalation_triggers:
        - 'A test asserts the old words for another reason.'
      suggested_subagent_type: 'general-purpose'
      suggested_model: '(default)'
      suggested_effort: 'medium'
    - task_id: task-004
      agent_role: 'Test Generation Agent'
      objective: 'Write the case file and the two readers that hold the tools to the same sentences.'
      context:
        prd_excerpts:
          - 'REQ-1 one case file read by a Java test and a node test.'
        tdd_excerpts:
          - 'DEC-1 the shape of dangling-reference-cases.json; cli lines without the error: prefix, editor.problem equal to the cli line.'
          - 'IMP-4 the cases V01 to V08.'
      likely_files:
        - 'src/test/javascript/viewpoint-kernel/view-problem-cases.json'
        - 'src/test/java/io/morin/archicode/cli/ViewProblemCasesTest.java'
        - 'src/test/javascript/viewpoint-kernel/view-problems.test.js'
        - 'src/test/java/io/morin/archicode/cli/DanglingReferenceCasesTest.java'
        - 'src/test/javascript/viewpoint-kernel/dangling-references.test.js'
      acceptance_criteria:
        - 'Both readers green; each red when the other tool is reverted to the old text.'
      verification:
        - './mvnw test -Dtest=ViewProblemCasesTest'
        - 'node --test src/test/javascript/viewpoint-kernel/view-problems.test.js'
      escalation_triggers:
        - 'The tools disagree on a case.'
      suggested_subagent_type: 'general-purpose'
      suggested_model: '(default)'
      suggested_effort: 'medium'
    - task_id: task-005
      agent_role: 'Documentation Agent'
      objective: 'Replace the Not aligned note of CLAUDE.md with the new file and the list that stays different.'
      context:
        prd_excerpts:
          - 'REQ-5 the Not aligned, recorded sentence is removed.'
        tdd_excerpts:
          - 'IMP-7 and DEC-4.'
      likely_files:
        - 'CLAUDE.md'
      acceptance_criteria:
        - 'Only the paragraph of this run changes.'
      verification:
        - 'git diff CLAUDE.md'
      escalation_triggers:
        - 'The paragraph was edited by another run.'
      suggested_subagent_type: 'general-purpose'
      suggested_model: '(default)'
      suggested_effort: 'medium'
    - task_id: task-006
      agent_role: 'QA Agent'
      objective: 'Run every check of the TDD verification section and both negative checks, and record the results.'
      context:
        prd_excerpts:
          - 'REQ-1 to REQ-5 hold.'
        tdd_excerpts:
          - 'Observability and Verification; RISK-1 to RISK-4.'
      likely_files:
        - 'target/e2e'
        - 'src/main/resources/editor-webapp/standalone.html'
        - 'src/main/java/io/morin/archicode/viewpoint/kernel/KernelViewpointFactory.java'
      acceptance_criteria:
        - 'All commands exit 0, byte-identity reports no difference, each negative check is red then green, and both tools are back on the new sentences.'
      verification:
        - './mvnw verify -DskipITs=false'
        - 'npm run test:coverage'
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
        - 'PMD'
        - 'packaged jar on a copy, one view per viewpoint'
      success_criteria:
        - 'The new lines on overview, detailed and deep; map and #159 sentences unchanged.'
    - task_id: task-002
      methods:
        - 'node unit tests'
        - 'lint'
        - 'search of the page for the old words'
      success_criteria:
        - 'library-view-edit and the 360 px suite green; every stepProblem caller passes the place.'
    - task_id: task-003
      methods:
        - 'node tests'
        - 'brightcart-negative.test.js, the node reader of the viewProblems of negative-cases.json'
      success_criteria:
        - 'Edited tests green on the new words; nothing asserts the old viewProblem text.'
    - task_id: task-004
      methods:
        - 'unit tests'
        - 'node test'
        - 'PMD'
        - 'lint and format'
      success_criteria:
        - 'Both readers green on all cases; the cases name the exact bytes of both tools.'
    - task_id: task-005
      methods:
        - 'diff review'
      success_criteria:
        - 'Only the paragraphs of this run changed in CLAUDE.md.'
    - task_id: task-006
      methods:
        - 'full verify'
        - 'integration tests'
        - 'node suite with coverage floors'
        - 'end-to-end suite'
        - 'byte-identity harness'
        - 'negative checks'
      success_criteria:
        - 'verify, test:coverage, format:check, lint and test:e2e exit 0; JaCoCo and editor floors hold; byte-identity reports no difference; each reverted tool turns its own reader red.'
```

## 11. Escalation Rules

This run operates under the autonomy override of complete-run: a task that would be `human_required` is executed and its decision logged. None is expected.

```yaml
escalation_rules:
  rules:
    - condition: 'The tools disagree on a case of the file after tasks 001 and 002.'
      action: 'Fix the tool that is behind and log it; never loosen a case.'
    - condition: 'The rewrite of DEC-3 catches a dangling reference that is not the focal element of the view.'
      action: 'Narrow the match (RISK-1) and add a case to the file.'
    - condition: 'byte-identity.sh reports a difference.'
      action: 'Stop: a command that succeeds changed (TG-4). Find the cause and fix it; do not add an exception.'
    - condition: 'The packaged jar fails to start (ArC initialization error).'
      action: 'Rebuild with ./mvnw clean install, log it, and rerun the integration and e2e checks.'
    - condition: 'A file to edit carries uncommitted changes of another run of the wave in the lines this run owns.'
      action: 'Merge by hand and log it; never revert or restage the other change.'
    - condition: 'Confidence of a task falls below 70.'
      action: 'Re-dispatch once one effort step up, then handle inline.'
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
    - task-004
    - task-005
    - task-006
  parallel_groups:
    - parallel-group-001
  required_human_gates: []
  highest_risk_tasks:
    - task-002
    - task-004
  lowest_confidence_tasks:
    - task-004
  next_action: 'None: run verified at Stage 11.'
  criteria:
    - 'All six tasks done and their verification green.'
    - 'The command line and the editor say the same bytes for the two covered mistakes, held by view-problem-cases.json.'
    - 'No output of a command that succeeds changed.'
```
