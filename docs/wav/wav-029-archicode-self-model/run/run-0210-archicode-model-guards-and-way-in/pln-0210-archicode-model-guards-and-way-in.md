---
title: Execution Plan — ArchiCode model guards and way in
status: done
date: 2026-10-31
related:
  - docs/wav/wav-029-archicode-self-model/run/run-0210-archicode-model-guards-and-way-in/tdd-0210-archicode-model-guards-and-way-in.md
  - docs/wav/wav-029-archicode-self-model/wav-029-archicode-self-model.md
  - docs/wav/wav-029-archicode-self-model/wbc-029-archicode-self-model.md
type: pln
run: 0210
wave: 029
---

# Execution Plan: ArchiCode model guards and way in

Profile TDD+pln: there is no PRD, so REQ-1 to REQ-7 are the IDs the TDD labels (section "PRD Traceability"), taken from the P2 gate and the W-2 row of the wave manifest. The plan follows the TDD plus the Stage 5 review findings (progress log, Stage 5 line), which the TDD has not absorbed: task-001 amends the TDD with them before any test is written. Where the TDD and a finding differ, the finding wins (the main one: rule 3 of the guard is deleted, because `query graph` sorts the elements by reference).

This run operates under the autonomy override of `complete-run` (read before Stage 10): no task stops for a human on its category alone. The one public action, the GitHub issues of task-006, is named in the wave plan (W-2 scope) and is gated by the safety rules of the session, not by this plan; if `gh` is not usable, the task logs "no issue" with the reason (REQ-5 allows it). No `human_required` task exists, so the override changes no route.

## 1. Executive Summary

```yaml
summary:
  status: 'done'
  product_goal: 'Keep docs/architecture true and usable by an agent: an impact oracle of seven exact-set questions answered from archicode query graph, a one-way drift guard (layers and tags.path), a CLAUDE.md paragraph that names the folder and the command, and one GitHub issue per tool friction met in wave 029.'
  technical_approach: 'Amend the TDD with the review findings, extract a shared query-graph helper, write the oracle red, write the guard with its sabotage tests, add the one relationship the oracle demands (editor core owns read_schema) and turn the oracle green, add the CLAUDE.md section, file the issues, then run the gates.'
  total_tasks: 8
  parallel_groups: 1
  high_risk_tasks: 0
  human_review_gates: 0
  autonomy_level: 'high'
  recommendation: 'proceed'
  criteria:
    - 'ArchitectureImpactTest answers 7 questions from query graph with exact sets and passes; its sabotage copies (Q05 without the owns relationship, Q01 without a calls relationship) fail as expected (REQ-1, REQ-6)'
    - 'ArchitectureDriftTest returns no problem on the repository and each sabotage copy (renamed layer, swapped layers, missing tags.path) fails with the rule that names it (REQ-2, REQ-3, REQ-6)'
    - 'CLAUDE.md has a section that contains docs/architecture and archicode query graph -w docs/architecture/.archicode.yaml, and git diff --numstat -- CLAUDE.md prints 0 deletions (REQ-4)'
    - 'Each friction of the run record has #NNN or the words no issue with a reason (REQ-5)'
    - 'Any model change is limited to relationships an oracle row demands, each justified in the run record (REQ-7)'
    - 'git status --short src lists only the new test files and the questions file, nothing under src/main (CON-1)'
    - 'Maven test-compile pmd:check, the Architecture tests, architecture-model.test.js and npm run format:check pass'
```

## 2. PRD/TDD Consistency Assessment

```yaml
consistency_assessment:
  aligned_items:
    - 'Scope, REQ labels, DEC-1 to DEC-8 and the one open question (resolved by DEC-2) agree with the P2 gate and the W-2 row of the wave manifest'
    - 'ASM-5 says Q05 fails on the current model; the plan keeps that red state until task-007 adds the owns relationship (DEC-6)'
  gaps:
    - id: gap-001
      type: contradiction
      description: 'Rule 3 of the guard reads the order of elements in the graph as declaration order, but query graph sorts the elements by reference, so the rule fails on the repository (review S3).'
      impact: 'high'
      recommendation: 'task-001 deletes rule 3; rule 4 over the order of layers.json already fixes the order, and sabotage (d) (model and persistence swapped) expects rule 4.'
    - id: gap-002
      type: ambiguity
      description: 'ASM-1 says every element has a tags map; 11 of 42 do not (the technology ones).'
      impact: 'medium'
      recommendation: 'task-001 amends ASM-1; the helper and rule 5 read an absent tags as no path; the at-least-one-path clause stays.'
    - id: gap-003
      type: ambiguity
      description: 'IF-1 ArchitectureGraph.load(Path) is static but the command line needs the injected CommandLine.IFactory and ErrorOutput.'
      impact: 'medium'
      recommendation: 'task-001 gives load the two as parameters (load(Path, IFactory, ErrorOutput)); the test classes keep the injection.'
    - id: gap-004
      type: contradiction
      description: 'IMP-4 re-draws only the contracts view, but core to read_schema also adds a link and a box to editor_layers (and maybe the overview); FLOW-2 (b) removes a calls relationship of a start although the callers hold it; (c) and (d) say TempDir for layers.json although the guard takes a JsonNode.'
      impact: 'medium'
      recommendation: 'task-001 amends the three: re-draw the five views in a scratch copy (task-007); (b) removes the relationships of editor.presentation towards kernel.engine.*; (c) and (d) edit the layers JsonNode in memory, so the TempDir copy is for (e) only.'
    - id: gap-005
      type: ambiguity
      description: 'Smaller findings (S1): the answer excludes the starts and their descendants and an element reached in a later hop covers its descendants; CLAUDE.md is 165,804 bytes, not 60 KB; the number of test classes counts the helper; DEC-7 lists 5 of the 10 qualifiers and fixed counts that will go stale; impact-questions.json sits under src/test/javascript/ with no JavaScript reader.'
      impact: 'low'
      recommendation: 'task-001 words the semantics, fixes the numbers and the count of classes (three test classes: model, impact, drift), drops the counts from DEC-7, and keeps the path src/test/javascript/architecture/ as the wave lists it (trade-off left to the author, said in the run record).'
    - id: gap-006
      type: ambiguity
      description: 'Stage 9 scan against the plan itself: task-005 said five qualifiers and then every qualifier the model uses (ten in the manifests, so the two disagreed), and its dispatch named the Explore agent, which cannot write CLAUDE.md.'
      impact: 'low'
      recommendation: 'Fixed in this plan at Stage 9: task-005 lists the qualifiers read from the manifests with no count, and its subagent type is general-purpose with the haiku model (the cheap tier allows general-purpose when the task writes).'
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
        - 'tdd-0210-archicode-model-guards-and-way-in.md amended'
      agent_role: 'Architecture Agent'
      autonomy: 'autonomous'
      risk: 'low'
      confidence: 90
    - id: task-002
      status: 'done'
      title: 'Extract the shared ArchitectureGraph helper'
      depends_on: [task-001]
      produces:
        - 'src/test/java/io/morin/archicode/doc/ArchitectureGraph.java'
        - 'ArchitectureModelTest using the helper, assertions unchanged'
      agent_role: 'Test Generation Agent'
      autonomy: 'autonomous'
      risk: 'low'
      confidence: 80
    - id: task-003
      status: 'done'
      title: 'Write the impact oracle and its questions file (Q05 red)'
      depends_on: [task-002]
      produces:
        - 'src/test/javascript/architecture/impact-questions.json'
        - 'src/test/java/io/morin/archicode/doc/ArchitectureImpactTest.java'
      agent_role: 'Test Generation Agent'
      autonomy: 'autonomous'
      risk: 'medium'
      confidence: 75
    - id: task-004
      status: 'done'
      title: 'Write the drift guard and its sabotage tests'
      depends_on: [task-003]
      produces:
        - 'src/test/java/io/morin/archicode/doc/ArchitectureDriftTest.java'
      agent_role: 'Test Generation Agent'
      autonomy: 'autonomous'
      risk: 'medium'
      confidence: 78
    - id: task-005
      status: 'done'
      title: 'Add the CLAUDE.md section The model of ArchiCode'
      depends_on: [task-001]
      produces:
        - 'CLAUDE.md with one section added before ## Architecture'
      agent_role: 'Documentation Agent'
      autonomy: 'autonomous'
      risk: 'low'
      confidence: 90
    - id: task-006
      status: 'done'
      title: 'File one GitHub issue per tool friction and record the numbers'
      depends_on: [task-001]
      produces:
        - 'GitHub issues on tmorin/archicode'
        - 'run record Findings with the numbers'
      agent_role: 'Documentation Agent'
      autonomy: 'review_after'
      risk: 'medium'
      confidence: 80
    - id: task-007
      status: 'done'
      title: 'Turn the oracle green: owns relationship, row check, views re-drawn, sabotage (a)'
      depends_on: [task-003, task-004]
      produces:
        - 'docs/architecture/manifests/archicode.yaml (relationship editor.core to read_schema, others only if a row demands)'
        - 'sabotage (a) test in ArchitectureImpactTest'
      agent_role: 'Architecture Agent'
      autonomy: 'autonomous'
      risk: 'medium'
      confidence: 75
    - id: task-008
      status: 'done'
      title: 'Run the gates and log the evidence'
      depends_on: [task-005, task-006, task-007]
      produces:
        - 'gate output summarised in prg-0210 (Findings)'
      agent_role: 'QA Agent'
      autonomy: 'autonomous'
      risk: 'low'
      confidence: 85
  edges:
    - from: task-003
      to: task-004
      reason: 'both compile and run in the one target/ directory; two Maven builds at once corrupt it'
    - from: task-004
      to: task-007
      reason: 'task-007 edits ArchitectureImpactTest and runs the guard against the changed model'
```

## 4. Task Catalog

```yaml
task_catalog:
  tasks:
    - id: task-001
      title: 'Amend the TDD with the Stage 5 findings'
      source_requirements:
        prd:
          - 'REQ-2'
          - 'REQ-6'
        tdd:
          - 'DEC-4'
          - 'IF-1'
          - 'IF-3'
          - 'FLOW-2'
          - 'IMP-4'
          - 'ASM-1'
          - 'Current State'
      outputs:
        - 'The TDD no longer has rule 3; the guard has four rules and sabotage (d) expects rule 4'
        - 'ASM-1 says an absent tags is no path; IF-1 takes the factory and ErrorOutput as parameters; FLOW-2 (b), (c), (d) and IMP-4 as in gap-004; the byte size and the counts of gap-005 fixed'
      verification:
        - 'grep -c "declaration order" the TDD prints 0'
        - 'grep -q "load(Path" the TDD, and the line names IFactory'
        - 'grep -c "about 60 KB" the TDD prints 0'
        - 'git diff --stat -- src is empty'
      risk: 'low'
      confidence: 90
      human_review: 'none'
      escalation_triggers:
        - 'A finding contradicts the code when read (record it in the run record and follow the code)'
      delegation_tier: 'standard'
      results: 'tier standard, model sonnet, effort medium, profile low-cost, passed first time, inline (leaf), independently verified'
    - id: task-002
      title: 'Extract the shared ArchitectureGraph helper'
      source_requirements:
        prd:
          - 'REQ-1'
          - 'REQ-2'
        tdd:
          - 'IMP-1'
          - 'IF-1'
          - 'CTR-3'
          - 'ASM-1'
      outputs:
        - 'ArchitectureGraph: load(Path, CommandLine.IFactory, ErrorOutput) runs query graph, fails on exit not 0 or non-empty stderr, returns the JsonNode; a failure names the missing field of the shape'
        - 'ArchitectureModelTest calls the helper in place of its private run; its assertions are untouched'
      verification:
        - 'JAVA_HOME at JDK 25: ./mvnw test -Dtest=ArchitectureModelTest -Djacoco.skip=true passes with the same test methods as before'
        - 'git diff of ArchitectureModelTest shows no assertion line changed'
      risk: 'low'
      confidence: 80
      human_review: 'none'
      escalation_triggers:
        - 'The run helper of ArchitectureModelTest returns stdout that other methods need (keep a thin wrapper instead of moving it)'
      delegation_tier: 'standard'
      results: 'tier standard, model sonnet, effort medium, profile low-cost, passed first time, inline (leaf), independently verified'
    - id: task-003
      title: 'Write the impact oracle and its questions file (Q05 red)'
      source_requirements:
        prd:
          - 'REQ-1'
          - 'REQ-6'
          - 'REQ-7'
        tdd:
          - 'DEC-1'
          - 'DEC-2'
          - 'DEC-3'
          - 'CTR-1'
          - 'IF-2'
          - 'FLOW-1'
      outputs:
        - 'impact-questions.json with the seven questions of the table of DEC-3, full references, no empty qualifiers'
        - 'ArchitectureImpactTest: one dynamic test per question (named by id) that fails on a missing start, an empty expect, and prints missing and unexpected references; walk breadth first, answers exclude the starts and their descendants; sabotage (b) in a graph copy'
        - 'Q05 is the only red question, and the failure sentence says the owns coupling is missing (task-007 turns it green)'
      verification:
        - './mvnw test -Dtest=ArchitectureImpactTest -Djacoco.skip=true: Q01 to Q04, Q06, Q07 and sabotage (b) pass, Q05 fails, nothing else fails'
        - 'The task recomputes the table from query graph before writing; a differing row is read against the code (DEC-6) and the reading is logged in the run record'
        - 'git diff --stat -- src/main is empty'
      risk: 'medium'
      confidence: 75
      human_review: 'none'
      escalation_triggers:
        - 'A row other than Q05 differs from the table and the code does not settle which side is wrong'
        - 'The sabotage (b) copy does not change the answer of Q01'
      delegation_tier: 'standard'
      results: 'tier standard, model sonnet, effort medium, profile low-cost, passed first time, inline (leaf), independently verified'
    - id: task-004
      title: 'Write the drift guard and its sabotage tests'
      source_requirements:
        prd:
          - 'REQ-2'
          - 'REQ-3'
          - 'REQ-6'
        tdd:
          - 'DEC-4'
          - 'DEC-5'
          - 'IF-3'
          - 'CTR-2'
          - 'FLOW-2'
      outputs:
        - 'ArchitectureDriftTest.problems(JsonNode graph, JsonNode layers, Path root) with the four rules left after task-001: a modeled layer exists, each is in layers.json, adjacent layers are linked by uses (later to earlier), each tags.path entry is relative, free of .., exists, and at least one is checked'
        - 'Tests: the repository gives no problem; (c) layers copy with core renamed fails rule 2; (d) model and persistence swapped fails rule 4; (e) a TempDir copy of docs/architecture with one tags.path made missing, loaded through the helper, fails rule 5; the layers copies are edited in memory'
      verification:
        - './mvnw test -Dtest=ArchitectureDriftTest -Djacoco.skip=true passes'
        - 'Each sabotage test asserts the rule it expects, not only that something failed'
        - 'git diff --stat -- docs/architecture is empty after the tests (the copies went to a TempDir)'
      risk: 'medium'
      confidence: 78
      human_review: 'none'
      escalation_triggers:
        - 'The repository gives a problem for a tags.path that does not exist (a real model error: fix the path in the manifest, log it)'
        - 'Rule 4 fails on the repository (the model lacks a uses link: add it as DEC-6 allows and log it)'
      delegation_tier: 'standard'
      results: 'tier standard, model sonnet, effort medium, profile low-cost, passed first time, inline (leaf), independently verified'
    - id: task-005
      title: 'Add the CLAUDE.md section The model of ArchiCode'
      source_requirements:
        prd:
          - 'REQ-4'
        tdd:
          - 'DEC-7'
          - 'IMP-5'
          - 'CON-4'
      outputs:
        - 'One section ## The model of ArchiCode before ## Architecture: the folder, the exact command, the qualifiers an agent follows (every qualifier the manifests use, read from them with grep and listed, not counted), the two tests that keep it true, the rule to change a coupling and its question in one commit; no count that goes stale'
      verification:
        - 'git diff --numstat -- CLAUDE.md prints a number of additions and 0 deletions'
        - 'grep -q "archicode query graph -w docs/architecture/.archicode.yaml" CLAUDE.md'
        - 'The qualifiers named in the section are the ones grep finds in docs/architecture/manifests'
      risk: 'low'
      confidence: 90
      human_review: 'none'
      escalation_triggers:
        - 'A test or script is found that pins CLAUDE.md text'
      delegation_tier: 'cheap'
      results: 'tier cheap, model haiku, effort high, profile low-cost, passed first time, inline (leaf), independently verified'
    - id: task-006
      title: 'File one GitHub issue per tool friction and record the numbers'
      source_requirements:
        prd:
          - 'REQ-5'
        tdd:
          - 'DEC-8'
          - 'DEF-1'
          - 'DEF-3'
      outputs:
        - 'One issue on tmorin/archicode for each of the six frictions of DEC-8, neutral, with command, output and expectation, labels enhancement or documentation only, after a gh issue list -S duplicate search that shows none'
        - 'The Findings of prg-0210 list each friction with #NNN, or the words no issue with the reason; the three non-issues are said'
      verification:
        - 'gh issue view <n> -R tmorin/archicode succeeds for every number logged'
        - 'Every friction line of the Findings has #NNN or no issue'
        - 'No issue text names a file, id or colour of the author real workspace (the model is of ArchiCode itself)'
      risk: 'medium'
      confidence: 80
      human_review: 'after'
      escalation_triggers:
        - 'gh is not logged in or has no access: log no issue with the reason and stop this task'
        - 'A duplicate issue exists: link it in the Findings instead of filing a second'
      delegation_tier: 'standard'
      results: 'tier standard, model sonnet, effort medium, profile low-cost, passed first time, inline (leaf), independently verified'
    - id: task-007
      title: 'Turn the oracle green: owns relationship, row check, views re-drawn, sabotage (a)'
      source_requirements:
        prd:
          - 'REQ-1'
          - 'REQ-6'
          - 'REQ-7'
        tdd:
          - 'IMP-4'
          - 'DEC-6'
          - 'FLOW-2'
          - 'RISK-3'
      outputs:
        - 'A relationship from archicode.editor.core to contracts.couplings.read_schema, label owns the schema, qualifier owns, in the manifest (query graph then has one more relationship); any further edit only because a row demands it, each justified in the run record'
        - 'Sabotage (a) added to ArchitectureImpactTest: the graph without the owns relationship makes Q05 fail'
        - 'The five saved views drawn in a scratch copy (views generate -o outside the repository), each still readable: the contracts view and editor_layers show the new link, nothing is written beside the workspace'
      verification:
        - './mvnw test -Dtest="Architecture*Test" -Djacoco.skip=true passes (all three classes, every question)'
        - 'node --test src/test/javascript/architecture-model.test.js passes'
        - 'find docs/architecture -name "views-*" prints nothing'
        - 'archicode query graph -w docs/architecture/.archicode.yaml exits 0 with an empty error output'
      risk: 'medium'
      confidence: 75
      human_review: 'none'
      escalation_triggers:
        - 'More than one question needs a model edit (RISK-3): continue, but log each edit and its justification before the next'
        - 'The element count leaves 35 to 45'
      delegation_tier: 'standard'
      results: 'tier standard, model sonnet, effort medium, profile low-cost, passed first time, inline (leaf), independently verified'
    - id: task-008
      title: 'Run the gates and log the evidence'
      source_requirements:
        prd:
          - 'REQ-4'
          - 'REQ-5'
          - 'REQ-6'
        tdd:
          - 'Observability and Verification'
          - 'CON-1'
          - 'CON-2'
      outputs:
        - 'The results of the gate commands and the three sabotage outcomes written in the Findings of prg-0210'
      verification:
        - './mvnw test-compile pmd:check exits 0 (JDK 25)'
        - 'npm run format:check exits 0'
        - './mvnw test -Dtest="Architecture*Test" -Djacoco.skip=true and node --test src/test/javascript/architecture-model.test.js pass'
        - 'git status --short src lists only ArchitectureGraph.java, ArchitectureImpactTest.java, ArchitectureDriftTest.java, the questions file and the modified ArchitectureModelTest.java (and the untracked files already there at the start)'
        - 'git diff --numstat -- CLAUDE.md prints 0 deletions'
      risk: 'low'
      confidence: 85
      human_review: 'none'
      escalation_triggers:
        - 'PMD reports a finding in the new Java (fix it; never NOPMD)'
      delegation_tier: 'standard'
      results: 'tier standard, model sonnet, effort medium, profile low-cost, passed after escalation to effort high, inline (leaf), independently verified'
```

## 5. Parallelization Plan

```yaml
parallelization_plan:
  groups:
    - id: parallel-group-001
      tasks:
        - task-005
        - task-006
      reason: 'Neither compiles or runs Maven; they write CLAUDE.md and GitHub issues, and each depends only on task-001. They can run beside the test chain task-002 to task-004.'
      conflict_risks:
        - 'task-006 appends to the Findings of prg-0210 and task-008 appends later: serialized by the dependency.'
        - 'task-005 and the test chain touch different files.'
```

## 6. Human Review Gates

```yaml
human_review_gates:
  gates: []
```

No gate. The run operates under the autonomy override of `complete-run`. The author reads the public issues (task-006 `human_review: after`) and the CLAUDE.md paragraph (DEC-7 states a rule for the first time) in the review of the wave PR, not before any task.

## 7. Risk Assessment

```yaml
risk_assessment:
  by_task:
    - id: task-001
      risk: 'low'
      rationale: 'Edits a draft document; no code.'
    - id: task-002
      risk: 'low'
      rationale: 'Refactor of a test helper; assertions untouched (RISK-6).'
    - id: task-003
      risk: 'medium'
      rationale: 'Exact sets may differ from the table (RISK-3); the oracle is red by design for Q05.'
    - id: task-004
      risk: 'medium'
      rationale: 'A guard that passes on nothing, or a sabotage that fails for the wrong reason.'
    - id: task-005
      risk: 'low'
      rationale: 'Additions to one document; no test pins its text.'
    - id: task-006
      risk: 'medium'
      rationale: 'Public issues cannot be unpublished (RISK-5); wording is neutral and duplicates are searched first.'
    - id: task-007
      risk: 'medium'
      rationale: 'Edits the model other tests load; may uncover further missing relationships (RISK-3).'
    - id: task-008
      risk: 'low'
      rationale: 'Runs checks and logs.'
  by_area:
    - area: 'docs'
      risk: 'low'
      rationale: 'CLAUDE.md additions, the TDD and the run record.'
    - area: 'api'
      risk: 'low'
      rationale: 'No product code changes; CTR-3 depends on the shape of query graph, which is unchanged.'
    - area: 'infra'
      risk: 'medium'
      rationale: 'GitHub issues are external and public.'
```

## 8. Confidence Assessment

```yaml
confidence_assessment:
  by_task:
    - id: task-001
      score: 90
      rationale: 'Every finding names the line it amends and was checked against the repository in Stage 5.'
    - id: task-002
      score: 80
      rationale: 'Small refactor; PMD may ask for a different shape of the helper.'
    - id: task-003
      score: 75
      rationale: 'The table was computed on the jar, but the Java traversal and the sabotage copy are new code.'
    - id: task-004
      score: 78
      rationale: 'Pure functions over JsonNode; the TempDir copy of the folder is the fragile step.'
    - id: task-005
      score: 90
      rationale: 'The text is given in DEC-7.'
    - id: task-006
      score: 80
      rationale: 'Depends on gh access, checked in Stage 4 (ASM-4).'
    - id: task-007
      score: 75
      rationale: 'The one relationship is known; the effect on the five views is not drawn yet.'
    - id: task-008
      score: 85
      rationale: 'Commands are fixed by the TDD.'
```

## 9. Agent Assignment Plan

```yaml
agent_assignment_plan:
  assignments:
    - task_id: task-001
      agent_role: 'Architecture Agent'
      objective: 'Apply the Stage 5 findings of the progress log to the TDD, as listed in gap-001 to gap-005.'
      context:
        prd_excerpts:
          - 'REQ-2: the drift guard fails on a renamed or reordered layer in a copy'
        tdd_excerpts:
          - 'DEC-4 rules 1 to 5; IF-1; FLOW-2 (a) to (f); IMP-4'
      likely_files:
        - 'docs/wav/wav-029-archicode-self-model/run/run-0210-archicode-model-guards-and-way-in/tdd-0210-archicode-model-guards-and-way-in.md'
      acceptance_criteria:
        - 'The five gaps are applied; the TDD stays consistent (rule numbers, REQ links, the count of classes)'
      verification:
        - 'grep -c "declaration order" the TDD prints 0'
        - 'grep -q "load(Path" the TDD, and the line names IFactory'
        - 'grep -c "about 60 KB" the TDD prints 0'
        - 'git diff --stat -- src is empty'
      escalation_triggers:
        - 'A finding is wrong against the code'
      suggested_subagent_type: 'general-purpose'
      suggested_model: '(default)'
      suggested_effort: 'medium'
    - task_id: task-002
      agent_role: 'Test Generation Agent'
      objective: 'Move the query graph runner into a package-private helper that three test classes share.'
      context:
        prd_excerpts:
          - 'REQ-1: the oracle reads what an agent reads'
        tdd_excerpts:
          - 'IMP-1; ASM-1; CTR-3'
      likely_files:
        - 'src/test/java/io/morin/archicode/doc/ArchitectureGraph.java'
        - 'src/test/java/io/morin/archicode/doc/ArchitectureModelTest.java'
      acceptance_criteria:
        - 'ArchitectureModelTest passes unchanged in what it asserts'
      verification:
        - 'JAVA_HOME at JDK 25: ./mvnw test -Dtest=ArchitectureModelTest -Djacoco.skip=true passes with the same test methods as before'
        - 'git diff of ArchitectureModelTest shows no assertion line changed'
      escalation_triggers:
        - 'PMD rejects a construct that the repository convention needs'
      suggested_subagent_type: 'general-purpose'
      suggested_model: '(default)'
      suggested_effort: 'medium'
    - task_id: task-003
      agent_role: 'Test Generation Agent'
      objective: 'Write the oracle: the questions file, the traversal, exact-set comparison, sabotage (b); leave Q05 red.'
      context:
        prd_excerpts:
          - 'REQ-1: 6 to 8 questions, each with its expected elements'
        tdd_excerpts:
          - 'The oracle (DEC-1 to DEC-3), CTR-1, FLOW-1'
      likely_files:
        - 'src/test/javascript/architecture/impact-questions.json'
        - 'src/test/java/io/morin/archicode/doc/ArchitectureImpactTest.java'
      acceptance_criteria:
        - 'Q05 is the only failing question'
      verification:
        - './mvnw test -Dtest=ArchitectureImpactTest -Djacoco.skip=true: Q01 to Q04, Q06, Q07 and sabotage (b) pass, Q05 fails, nothing else fails'
        - 'The task recomputes the table from query graph before writing; a differing row is read against the code (DEC-6) and the reading is logged in the run record'
        - 'git diff --stat -- src/main is empty'
      escalation_triggers:
        - 'A row other than Q05 differs and the code does not settle it'
      suggested_subagent_type: 'general-purpose'
      suggested_model: '(default)'
      suggested_effort: 'high'
    - task_id: task-004
      agent_role: 'Test Generation Agent'
      objective: 'Write the guard as pure functions and the sabotage tests that show it bites.'
      context:
        prd_excerpts:
          - 'REQ-2, REQ-3, REQ-6'
        tdd_excerpts:
          - 'The drift guard (DEC-4, DEC-5), CTR-2, FLOW-2 (c) to (f)'
      likely_files:
        - 'src/test/java/io/morin/archicode/doc/ArchitectureDriftTest.java'
      acceptance_criteria:
        - 'No problem on the repository; each sabotage names its rule'
      verification:
        - './mvnw test -Dtest=ArchitectureDriftTest -Djacoco.skip=true passes'
        - 'Each sabotage test asserts the rule it expects, not only that something failed'
        - 'git diff --stat -- docs/architecture is empty after the tests (the copies went to a TempDir)'
      escalation_triggers:
        - 'A real model error appears on the repository'
      suggested_subagent_type: 'general-purpose'
      suggested_model: '(default)'
      suggested_effort: 'high'
    - task_id: task-005
      agent_role: 'Documentation Agent'
      objective: 'Add the pointer section to CLAUDE.md, additions only.'
      context:
        prd_excerpts:
          - 'REQ-4'
        tdd_excerpts:
          - 'DEC-7'
      likely_files:
        - 'CLAUDE.md'
      acceptance_criteria:
        - 'Zero deleted lines; the exact command is present'
      verification:
        - 'git diff --numstat -- CLAUDE.md prints a number of additions and 0 deletions'
        - 'grep -q "archicode query graph -w docs/architecture/.archicode.yaml" CLAUDE.md'
        - 'The qualifiers named in the section are the ones grep finds in docs/architecture/manifests'
      escalation_triggers:
        - 'A test pins CLAUDE.md text'
      suggested_subagent_type: 'general-purpose'
      suggested_model: 'haiku'
      suggested_effort: 'low'
    - task_id: task-006
      agent_role: 'Documentation Agent'
      objective: 'File the six issues of DEC-8 after a duplicate search and record the numbers in the Findings of the run record.'
      context:
        prd_excerpts:
          - 'REQ-5: each friction has an issue, or the log says there is none'
        tdd_excerpts:
          - 'DEC-8; the Findings of prg-0209'
      likely_files:
        - 'docs/wav/wav-029-archicode-self-model/run/run-0210-archicode-model-guards-and-way-in/prg-0210-archicode-model-guards-and-way-in.md'
      acceptance_criteria:
        - 'Six issues or six reasoned no issue lines'
      verification:
        - 'gh issue view <n> -R tmorin/archicode succeeds for every number logged'
        - 'Every friction line of the Findings has #NNN or no issue'
        - 'No issue text names a file, id or colour of the author real workspace (the model is of ArchiCode itself)'
      escalation_triggers:
        - 'gh unusable'
      suggested_subagent_type: 'general-purpose'
      suggested_model: '(default)'
      suggested_effort: 'medium'
    - task_id: task-007
      agent_role: 'Architecture Agent'
      objective: 'Add the owns relationship, check the other rows, re-draw the five views in a scratch copy, add sabotage (a).'
      context:
        prd_excerpts:
          - 'REQ-7: the oracle adjusts the model, not the questions'
        tdd_excerpts:
          - 'IMP-4, DEC-6, RISK-3'
      likely_files:
        - 'docs/architecture/manifests/archicode.yaml'
        - 'src/test/java/io/morin/archicode/doc/ArchitectureImpactTest.java'
      acceptance_criteria:
        - 'All questions green; the views still draw'
      verification:
        - './mvnw test -Dtest="Architecture*Test" -Djacoco.skip=true passes (all three classes, every question)'
        - 'node --test src/test/javascript/architecture-model.test.js passes'
        - 'find docs/architecture -name "views-*" prints nothing'
        - 'archicode query graph -w docs/architecture/.archicode.yaml exits 0 with an empty error output'
      escalation_triggers:
        - 'More than one question needs a model edit'
      suggested_subagent_type: 'general-purpose'
      suggested_model: '(default)'
      suggested_effort: 'high'
    - task_id: task-008
      agent_role: 'QA Agent'
      objective: 'Run the gates of the TDD and write their outcome in the Findings.'
      context:
        prd_excerpts:
          - 'REQ-4, REQ-5, REQ-6'
        tdd_excerpts:
          - 'Observability and Verification'
      likely_files:
        - 'docs/wav/wav-029-archicode-self-model/run/run-0210-archicode-model-guards-and-way-in/prg-0210-archicode-model-guards-and-way-in.md'
      acceptance_criteria:
        - 'Every gate command passes or its failure is a finding'
      verification:
        - './mvnw test-compile pmd:check exits 0 (JDK 25)'
        - 'npm run format:check exits 0'
        - './mvnw test -Dtest="Architecture*Test" -Djacoco.skip=true and node --test src/test/javascript/architecture-model.test.js pass'
        - 'git status --short src lists only ArchitectureGraph.java, ArchitectureImpactTest.java, ArchitectureDriftTest.java, the questions file and the modified ArchitectureModelTest.java (and the untracked files already there at the start)'
        - 'git diff --numstat -- CLAUDE.md prints 0 deletions'
      escalation_triggers:
        - 'PMD finding'
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
        - 'grep checks on the TDD'
      success_criteria:
        - 'The five gaps are applied and src is untouched'
    - task_id: task-002
      methods:
        - 'unit tests (ArchitectureModelTest)'
      success_criteria:
        - 'Same assertions, green'
    - task_id: task-003
      methods:
        - 'unit tests (ArchitectureImpactTest)'
      success_criteria:
        - 'Q05 is the one red question; every other question and sabotage (b) pass'
    - task_id: task-004
      methods:
        - 'unit tests (ArchitectureDriftTest)'
      success_criteria:
        - 'Green on the repository; each sabotage fails with its rule'
    - task_id: task-005
      methods:
        - 'git diff --numstat'
        - 'grep'
      success_criteria:
        - '0 deletions and the exact command present'
    - task_id: task-006
      methods:
        - 'gh issue view'
      success_criteria:
        - 'Every number resolves; every friction is accounted for'
    - task_id: task-007
      methods:
        - 'unit tests (three Architecture classes)'
        - 'node test of run 0209'
        - 'views generate in a scratch copy'
      success_criteria:
        - 'All green, no views-* folder in the repository'
    - task_id: task-008
      methods:
        - 'static analysis (PMD)'
        - 'format check'
        - 'git status and diff checks'
      success_criteria:
        - 'All gates pass; only test files, docs/architecture, CLAUDE.md and the run record changed'
```

## 11. Escalation Rules

```yaml
escalation_rules:
  rules:
    - condition: 'A row of the oracle table differs and the code does not say which side is wrong'
      action: 'Stop the task, log the row and the evidence in the run record; leave the question as the TDD wrote it and report a blocker (DEC-6 forbids weakening a question).'
    - condition: 'The repository shows a real model error (a missing path, a missing uses link)'
      action: 'Fix the manifest, log the edit with its justification (REQ-7), continue.'
    - condition: 'A task needs a change under src/main'
      action: 'Stop: CON-1 forbids it; file the need as a friction in task-006 instead.'
    - condition: 'gh is not logged in, or an issue would reveal real workspace content'
      action: 'Write no issue; log no issue with the reason (REQ-5).'
    - condition: 'A task fails its own verification'
      action: 'Re-dispatch once one rung up (Delegation Policy), working from the files as the first attempt left them; a second failure is handled inline and logged as a finding.'
    - condition: 'Autonomy override'
      action: 'No task is human_required; the run does not stop for a category. The safety rules of the session (no force-push, no secrets, no destructive git, no commit unless the operator asks) still apply.'
```

## 12. Final Execution Manifest

```yaml
execution_manifest:
  status: 'done'
  recommendation: 'proceed'
  autonomy_level: 'high'
  total_tasks: 8
  autonomous_tasks: 7
  review_before_tasks: 0
  review_after_tasks: 1
  human_required_tasks: 0
  blocked_tasks: 0
  critical_path_tasks:
    - task-001
    - task-002
    - task-003
    - task-004
    - task-007
    - task-008
  parallel_groups:
    - parallel-group-001
  required_human_gates: []
  highest_risk_tasks:
    - task-003
    - task-004
    - task-006
    - task-007
  lowest_confidence_tasks:
    - task-003
    - task-007
    - task-004
  next_action: 'None: Stage 11 verified every criterion on 2026-10-31.'
  criteria:
    - 'All criteria of the summary are true'
    - 'The gates of task-008 pass'
```
