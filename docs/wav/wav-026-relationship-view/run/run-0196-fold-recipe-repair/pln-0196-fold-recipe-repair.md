---
title: Execution Plan — Fold recipe repair
status: completed
date: 2026-10-28
related:
  - docs/wav/wav-026-relationship-view/run/run-0196-fold-recipe-repair/tdd-0196-fold-recipe-repair.md
  - 'gh:tmorin/archicode#65'
  - docs/wav/wav-025-hosted-editor/run/run-0190-plateau-fold-analysis/run-0190-plateau-fold-analysis.md
type: pln
run: 0196
wave: 026
---

# Execution Plan: Fold recipe repair

Profile TDD+pln: there is no PRD, so the requirement IDs REQ-1 to REQ-5 are the ones the TDD labels (section "PRD Traceability"), taken from run 0190's Findings and the wave plan (W-2, gate P1). The run operates under the autonomy override of complete-run: a task that would otherwise stop for a human is executed by an agent and the override is logged in the prg. No task below is `human_required`. The change is documentation only (`src/doc/README.adoc`) and the evidence is a before/after record of commands run on scratch copies outside the repository.

## 1. Executive Summary

```yaml
summary:
  status: 'done'
  product_goal: 'The manual recipe for folding a plateau into the one above by hand (fold-by-hand) composes the replaces of the plateau above, names the two columns of the cascade that change (PLATEAU and PATCH), and no longer leads to a plateau compared with itself, each statement proved by a recorded run on the layered Brightcart and on domain_plateaus (#65, W-2).'
  technical_approach: 'Run the recipe as designed on scratch copies and record the before and after outputs in the run document first, then rewrite the one bullet of src/doc/README.adoc using only sentences observed in that record, then build the manual and check the anchor and the touched files.'
  total_tasks: 4
  parallel_groups: 0
  high_risk_tasks: 0
  human_review_gates: 0
  autonomy_level: 'high'
  recommendation: 'proceed'
  criteria:
    - 'the run document holds a table of plateau list, diff and views generate before and after the fold on a scratch copy of the layered Brightcart and of domain_plateaus with tutorial plateau later, equal but for the PLATEAU and PATCH columns and the rows of the folded plateau, and the run without the replaces composition showing the ignored replaces warning'
    - 'the bullet fold-by-hand of src/doc/README.adoc has the composing step, names PLATEAU and PATCH, tells the replacement of at and against as a choice with the rule that avoids a self-comparison, and tells settings.current'
    - 'the manual builds with no unresolved cross reference and target/generated-docs holds the anchor fold-by-hand'
    - 'git status shows changes only in src/doc/README.adoc and the run directory'
```

## 2. PRD/TDD Consistency Assessment

```yaml
consistency_assessment:
  aligned_items:
    - 'REQ-1 to REQ-5 are each addressed by a TDD goal (TG-1 to TG-4) or a constraint (CON-1, CON-4) and by a task below'
    - 'the bullet fold-by-hand is at line 1956 of src/doc/README.adoc and the two pointers are at lines 1563 and 1604, as the TDD says'
    - 'Q-1 and Q-2 are resolved by observation in the prg (Stage 6), so no question is open and the plan has no blocking gap'
  gaps:
    - id: gap-001
      type: 'omission'
      description: 'The Stage 5 review (prg, 2026-10-28) found F-1: after the fold every command stops with the sentence that settings.current names the plateau to-be, which is not a plateau of this workspace (run 0190 observed it), and the new text of the TDD does not tell the reader to change settings.current. The review also found F-2 (the manual is produced by process-asciidoc in generate-resources and is skipped by plugin.asciidoctor.skip), F-3 (the manual has five numbered steps and the check paragraph, not six steps) and F-6 (the recipe stays for one plateau above only).'
      impact: 'medium'
      recommendation: 'The plan follows the review where the TDD text differs and the TDD is not binding there: the stories step also says to change settings.current when it names to-be, FLOW-1 records a settings.current case, and the manual is built with ./mvnw generate-resources (asciidoctor not skipped). The TDD is corrected by the main agent, not by this plan.'
    - id: gap-002
      type: 'ambiguity'
      description: 'The TDD names the composing step as "step 3" and the check as "step 6" while its list has the old step 3 and 4 moved to 4 and 5; F-3 says five steps and the check paragraph.'
      impact: 'low'
      recommendation: 'The manual text has five numbered steps (change plateau, change override and patches, compose replaces, delete the plateau manifest, change at against and settings.current) followed by the check paragraph; the record in the run document uses the same numbers.'
    - id: gap-003
      type: 'inaccuracy'
      description: 'Stage 9 repository spot-check: the plan was read against the working tree. src/doc/README.adoc has the anchor fold-by-hand at line 1956 and the pointers at 1563 and 1604, target/quarkus-app/quarkus-run.jar exists, src/test/resources/brightcart/layered holds baseline, inhouse, marketplace, saas and shared, and the scripts check_run.py and complete_wave.py exist where named. Nothing named in likely_files is missing. The jar may be older than the working tree, which task-001 checks by version line and by a rebuild if needed. The shell default java is JDK 21 and the jar needs JDK 25: run on 2026-10-28, java -jar target/quarkus-app/quarkus-run.jar --version fails with UnsupportedClassVersionError (class file version 69.0) under the default java and prints archicode 0.21.0-SNAPSHOT under JAVA_HOME=$HOME/.sdkman/candidates/java/25.0.4-tem; every command of task-001 and task-003 is run with that JAVA_HOME.'
      impact: 'low'
      recommendation: 'None beyond the rebuild condition in task-001.'
  blocking_gaps: []
```

## 3. Execution Graph

```yaml
execution_graph:
  nodes:
    - id: task-001
      status: 'done'
      title: 'Run the fold as designed on scratch copies and record before and after'
      depends_on: []
      produces:
        - 'a section Before and after of run-0196-fold-recipe-repair.md'
      agent_role: 'QA Agent'
      autonomy: 'autonomous'
      risk: 'low'
      confidence: 75
    - id: task-002
      status: 'done'
      title: 'Rewrite the bullet fold-by-hand from the recorded outputs'
      depends_on: [task-001]
      produces:
        - 'src/doc/README.adoc'
      agent_role: 'Technical Writing Agent'
      autonomy: 'autonomous'
      risk: 'low'
      confidence: 80
    - id: task-003
      status: 'done'
      title: 'Build the manual and check the anchor, the numbering and the neighbours'
      depends_on: [task-002]
      produces:
        - 'a section Manual build of run-0196-fold-recipe-repair.md'
      agent_role: 'QA Agent'
      autonomy: 'autonomous'
      risk: 'low'
      confidence: 70
    - id: task-004
      status: 'done'
      title: 'Check that the written text equals the record and that only the intended files changed'
      depends_on: [task-003]
      produces:
        - 'a section Verdict of run-0196-fold-recipe-repair.md'
      agent_role: 'QA Agent'
      autonomy: 'autonomous'
      risk: 'low'
      confidence: 80
  edges:
    - from: task-001
      to: task-002
      reason: 'every sentence of the manual that says what a tool prints is taken from the record (DEC-4)'
    - from: task-002
      to: task-003
      reason: 'the build runs on the edited manual'
    - from: task-003
      to: task-004
      reason: 'the verdict reads the build result and the whole diff'
```

## 4. Task Catalog

```yaml
task_catalog:
  tasks:
    - id: task-001
      title: 'Run the fold as designed on scratch copies and record before and after'
      source_requirements:
        prd:
          - 'REQ-1'
          - 'REQ-2'
          - 'REQ-3'
          - 'REQ-4'
        tdd:
          - 'FLOW-1'
          - 'FLOW-2'
          - 'TG-1'
          - 'TG-4'
          - 'DEC-3'
          - 'DEC-4'
      outputs:
        - 'a section Before and after of the run document with a table, one row per command and per copy, and the verdict of each row; scratch copies live outside the repository (the scratchpad directory), never under it'
        - 'FLOW-1 on a copy of src/test/resources/brightcart/layered (before and after): plateau list, diff --plateau P --against Q for the pairs of baseline, inhouse, marketplace and saas that survive, and views generate --plateau marketplace --against baseline, recorded before; after folding inhouse into marketplace by the five steps (the discovery.search entry written as shop.app.search, the at and against of the four steps of fork_tour and seller_journey chosen by the rule, settings.current changed if the fixture names inhouse or a copy sets it to inhouse), the same commands with inhouse removed from the pairs and an explicit --against'
        - 'the comparison of stdout, stderr, exit codes and the files of views-marketplace* between before and after: the differences must be the PLATEAU and PATCH columns of the cascade and the rows of inhouse; the numbers of the cascade rows renumbered are quoted'
        - 'a run on a second after-copy where the replaces is not composed: the warning text replaces ... is not an element of the base plateau, ignored, the exit code 0 and the changed counts, copied as printed'
        - 'a run with settings.current left at the folded plateau: the exact error: line, copied as printed'
        - 'a run with a story step compared against the plateau it is told at after the replacement: the exact error: line, copied as printed'
        - 'FLOW-2 on a copy of src/doc/examples/domain_plateaus with the plateau later of tutorial step 9 added: plateau list and diff --plateau later --against baseline before and after folding to-be into later, differences quoted; the sentence the manual keeps about the example is the one this row supports'
      verification:
        - 'test -f target/quarkus-app/quarkus-run.jar and, with JAVA_HOME naming JDK 25 (the default java of the shell is 21 and fails), $JAVA_HOME/bin/java -jar target/quarkus-app/quarkus-run.jar --version prints a line starting archicode; if the jar is missing or its commands differ from the working tree, rebuild it with ./mvnw package -Dmaven.test.skip -Dplugin.asciidoctor.skip=true with JAVA_HOME naming JDK 25'
        - 'grep -c "ignored" on the run document is at least 1 and the section Before and after names the scratch path'
        - 'git status --porcelain shows no path outside docs/wav/wav-026-relationship-view/run/run-0196-fold-recipe-repair/'
      risk: 'low'
      confidence: 75
      human_review: 'none'
      escalation_triggers:
        - 'a difference other than the PLATEAU and PATCH columns and the rows of the folded plateau appears: analyse it before the manual says the same'
        - 'a warning other than the expected one appears on stderr'
        - 'JDK 25 or the packaged application cannot be had, so the commands cannot be run'
      delegation_tier: 'standard'
      results: "tier standard, model sonnet, effort medium, profile low-cost, passed first time, inline (leaf), independently verified"
    - id: task-002
      title: 'Rewrite the bullet fold-by-hand from the recorded outputs'
      source_requirements:
        prd:
          - 'REQ-1'
          - 'REQ-2'
          - 'REQ-3'
          - 'REQ-5'
        tdd:
          - 'Proposed Design'
          - 'TG-2'
          - 'TG-3'
          - 'IMP-1'
          - 'IMP-2'
          - 'CTR-1'
          - 'DEC-1'
          - 'DEC-2'
          - 'DEC-3'
          - 'DEC-4'
      outputs:
        - 'src/doc/README.adoc: the bullet [[fold-by-hand]] rewritten in the manual voice with generic names (to-be, later, invented references such as shop.search; no Brightcart content), five numbered steps and the check paragraph: change plateau to later; change override and put the patches of to-be in front; compose the replaces (look in the manifests and the SET patches of later for an entry naming an element to-be declared, replace it by what that element replaced, in its manifest or by a patch of to-be, or take it out; entries naming the plateau below stay; forgotten gives the warning and the move read as one new and one removed element); delete the plateau manifest of to-be; change at, against and plateau naming to-be as a choice (at to-be becomes later and then draws more; against to-be becomes the plateau to-be overrode or the key is dropped; plateau of a view or story may stay) and change settings.current when it names to-be'
        - 'the check paragraph: plateau list, diff --plateau later --against <parent of to-be> with an explicit --against before and after, and views generate; the result stated as observed (text above the table and the .puml files the same, same rows, PLATEAU and PATCH columns differ, gap.md and gap.json in those two columns only); the warning replaces ignored as the sign of a missed step 3; query graph is not a byte check; the closing sentences (one plateau above only, the fold loses a comparison, a views folder and the against of a step) kept'
        - 'the sentence on domain_plateaus kept only as the record supports it (the column PLATEAU, and PATCH too when a row of the plateau above has a patch number)'
        - 'lines 1563 and 1604 changed only if a sentence there became false (expected: no change); the anchor name fold-by-hand unchanged'
      verification:
        - 'grep -n "\[\[fold-by-hand\]\]" src/doc/README.adoc prints exactly one line'
        - 'sed -n of the bullet shows the words PATCH and settings.current and the sentence with ignored'
        - 'git diff --stat shows src/doc/README.adoc as the only path outside docs/wav/'
      risk: 'low'
      confidence: 80
      human_review: 'none'
      escalation_triggers:
        - 'a sentence about a tool output has no row in the record: run the command, add the row, then write it'
        - 'the new step makes a sentence at line 1563 or 1604 false'
      delegation_tier: 'standard'
      results: "tier standard, model sonnet, effort medium, profile low-cost, passed first time, inline (leaf), independently verified"
    - id: task-003
      title: 'Build the manual and check the anchor, the numbering and the neighbours'
      source_requirements:
        prd:
          - 'REQ-5'
        tdd:
          - 'CON-1'
          - 'Observability and Verification'
          - 'RISK-3'
      outputs:
        - 'a section Manual build of the run document: the command run, its exit code, the line count of Asciidoctor warnings about the manual, and the check that target/generated-docs holds the anchor fold-by-hand and renders the bullet as a nested ordered list'
        - 'the result of grep -rn "step 4" and "fold-by-hand" over src/doc, CLAUDE.md and docs/wav showing no reference to the old numbering'
        - 'no example file, fixture or Java or JavaScript source changed'
      verification:
        - 'JAVA_HOME naming JDK 25 ./mvnw generate-resources exits 0 (the asciidoctor goal process-asciidoc runs in generate-resources and is skipped only by plugin.asciidoctor.skip, which is not set)'
        - 'grep -rl "fold-by-hand" target/generated-docs prints at least one file'
        - 'grep -c "ol class" on the generated html near the anchor shows an ordered list, checked with sed -n of the lines after the anchor'
        - 'git diff --stat -- src/main src/test pom.xml CLAUDE.md prints nothing'
      risk: 'low'
      confidence: 70
      human_review: 'none'
      escalation_triggers:
        - 'the manual does not build for a reason in this edit: fix the markup, never the build'
        - 'the offline Maven repository lacks the asciidoctor plugin: record that the build was not run and leave a text check of the markup, do not claim the build'
      delegation_tier: 'standard'
      results: "tier standard, model sonnet, effort medium, profile low-cost, passed first time, inline (leaf), independently verified"
    - id: task-004
      title: 'Check that the written text equals the record and that only the intended files changed'
      source_requirements:
        prd:
          - 'REQ-4'
          - 'REQ-5'
        tdd:
          - 'CON-2'
          - 'CON-4'
          - 'DEC-4'
      outputs:
        - 'a section Verdict of the run document: for each sentence of the new bullet that says what a tool prints or what changes, the row of the record that supports it; every unsupported sentence is either supported by a new row or removed'
        - 'the output of git status --porcelain and git diff --stat, with the two paths expected'
        - 'the output of check_run.py on the run directory'
      verification:
        - 'python3 /home/tibo/git-perso/claude-agents/plugins/run-management/skills/complete-run/scripts/check_run.py docs/wav/wav-026-relationship-view/run/run-0196-fold-recipe-repair exits 0 or its findings are named in the section'
        - 'git status --porcelain shows paths only under src/doc/README.adoc and docs/wav/wav-026-relationship-view/'
        - 'grep -c "Verdict" on the run document is at least 1'
      risk: 'low'
      confidence: 80
      human_review: 'none'
      escalation_triggers:
        - 'a sentence of the manual has no supporting row and cannot be run'
        - 'a path outside the two expected shows as changed'
      delegation_tier: 'cheap'
      results: "tier cheap, model haiku, effort high, profile low-cost, passed after escalation to effort medium, inline (leaf), independently verified"
```

## 5. Parallelization Plan

```yaml
parallelization_plan:
  groups: []
```

No group: the plan is a chain, the text depends on the record, the build on the text, the verdict on both. The conflict risk of the serial run is the run document, written by tasks 001, 003 and 004 in turn.

## 6. Human Review Gates

```yaml
human_review_gates:
  gates: []
```

No gate: the change is a paragraph of the manual and every claim in it is backed by a recorded run. The run operates under the autonomy override of complete-run, so a reviewer's `human_required` would have been executed and logged; none is planned. Posting a comment on #65 (DEF-3 of the TDD) is publishing and is left to the author, outside this plan.

## 7. Risk Assessment

```yaml
risk_assessment:
  by_task:
    - id: task-001
      risk: 'low'
      rationale: 'runs the packaged application on copies outside the repository and writes the run document'
    - id: task-002
      risk: 'low'
      rationale: 'one bullet of the manual; the failure mode is a wrong sentence, caught by the verdict task'
    - id: task-003
      risk: 'low'
      rationale: 'builds the manual; touches no source'
    - id: task-004
      risk: 'low'
      rationale: 'reads files and runs checks'
  by_area:
    - area: 'documentation'
      risk: 'low'
      rationale: 'the composition rule is proved on one entry (RISK-1), a three-plateau chain is not observed and the text says the warning is the sign of a miss'
    - area: 'overpromise'
      risk: 'low'
      rationale: 'a patch of to-be that selects by pattern may match more once later is loaded (RISK-2); the check paragraph says the check is the proof and the recipe is for one plateau above'
```

## 8. Confidence Assessment

```yaml
confidence_assessment:
  by_task:
    - id: task-001
      score: 75
      rationale: 'run 0190 and Stage 6 already ran the same commands; the fork_tour and settings.current cases and the build of the jar are the uncertain parts'
    - id: task-002
      score: 80
      rationale: 'the design and the record fix the content; the AsciiDoc list continuation inside a list item is fiddly'
    - id: task-003
      score: 70
      rationale: 'depends on a working Maven offline build of the manual'
    - id: task-004
      score: 80
      rationale: 'a mechanical cross-check of sentences against rows'
```

## 9. Agent Assignment Plan

```yaml
agent_assignment_plan:
  assignments:
    - task_id: task-001
      agent_role: 'QA Agent'
      objective: 'Run the fold on scratch copies of the layered Brightcart and of domain_plateaus and record before and after, the missed-composition warning, the settings.current error and the self-comparison error.'
      context:
        prd_excerpts:
          - 'REQ-4: the run document records plateau list, diff and views generate before and after, equal but for PLATEAU and PATCH'
        tdd_excerpts:
          - 'FLOW-1 and FLOW-2, DEC-3: always pass an explicit --against'
          - 'Resolved Questions Q-1 and Q-2 give the numbers already seen'
      likely_files:
        - 'docs/wav/wav-026-relationship-view/run/run-0196-fold-recipe-repair/run-0196-fold-recipe-repair.md'
      acceptance_criteria:
        - 'one table row per command and per copy, with the verdict'
        - 'the three printed sentences are copied as printed'
        - 'nothing is written inside the repository outside the run directory'
      verification:
        - 'git status --porcelain'
        - 'JAVA_HOME naming JDK 25: $JAVA_HOME/bin/java -jar target/quarkus-app/quarkus-run.jar --version'
      escalation_triggers:
        - 'an unexplained difference between before and after'
      suggested_subagent_type: 'general-purpose'
      suggested_model: '(default)'
      suggested_effort: 'medium'
    - task_id: task-002
      agent_role: 'Technical Writing Agent'
      objective: 'Rewrite the bullet fold-by-hand with five steps and the check paragraph, in the manual voice, from the record only.'
      context:
        prd_excerpts:
          - 'REQ-1 to REQ-3: compose the replaces, name PLATEAU and PATCH, a step 5 that avoids a self-comparison'
        tdd_excerpts:
          - 'Proposed Design and DEC-2: compose by substitution'
          - 'Stage 5 review F-1 and F-3: settings.current, five steps and the check'
      likely_files:
        - 'src/doc/README.adoc'
      acceptance_criteria:
        - 'one [[fold-by-hand]] anchor kept'
        - 'every printed sentence is in the record'
        - 'no Brightcart content in the manual'
      verification:
        - 'grep of the anchor and of the words PATCH and settings.current'
        - 'git diff --stat'
      escalation_triggers:
        - 'a sentence cannot be supported by the record'
      suggested_subagent_type: 'general-purpose'
      suggested_model: '(default)'
      suggested_effort: 'medium'
    - task_id: task-003
      agent_role: 'QA Agent'
      objective: 'Build the manual with ./mvnw generate-resources, check the anchor and the nested ordered list, and grep for references to the old numbering.'
      context:
        prd_excerpts:
          - 'REQ-5: the manual still builds and no shipped example or fixture changes'
        tdd_excerpts:
          - 'CON-1 and Observability and Verification'
      likely_files:
        - 'docs/wav/wav-026-relationship-view/run/run-0196-fold-recipe-repair/run-0196-fold-recipe-repair.md'
        - 'target/generated-docs'
      acceptance_criteria:
        - 'exit code of the build and the anchor check recorded'
        - 'no source file changed'
      verification:
        - 'JAVA_HOME naming JDK 25 ./mvnw generate-resources'
        - 'grep -rl fold-by-hand target/generated-docs'
      escalation_triggers:
        - 'the build cannot run offline'
      suggested_subagent_type: 'general-purpose'
      suggested_model: '(default)'
      suggested_effort: 'medium'
    - task_id: task-004
      agent_role: 'QA Agent'
      objective: 'Map each sentence of the new bullet to a row of the record, run check_run.py and confirm the diff holds only the intended files.'
      context:
        prd_excerpts:
          - 'REQ-4 and REQ-5'
        tdd_excerpts:
          - 'CON-2: the manual states what the tools do, proved by a run'
          - 'CON-4: no change outside the manual and the run directory'
      likely_files:
        - 'docs/wav/wav-026-relationship-view/run/run-0196-fold-recipe-repair/run-0196-fold-recipe-repair.md'
        - 'src/doc/README.adoc'
      acceptance_criteria:
        - 'a Verdict section with the sentence-to-row mapping'
        - 'check_run.py exit status stated'
      verification:
        - 'git status --porcelain'
        - 'check_run.py on the run directory'
      escalation_triggers:
        - 'an unsupported sentence or an unexpected changed path'
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
        - 'packaged application run on scratch copies, outputs compared with diff'
        - 'git status --porcelain'
      success_criteria:
        - 'differences between before and after are the PLATEAU and PATCH columns and the rows of the folded plateau only'
        - 'the three printed sentences are in the record'
    - task_id: task-002
      methods:
        - 'grep of the anchor, PATCH and settings.current'
        - 'git diff --stat'
      success_criteria:
        - 'one anchor, the composing step and the two columns named, README.adoc the only source path changed'
    - task_id: task-003
      methods:
        - './mvnw generate-resources'
        - 'grep of target/generated-docs'
        - 'git diff --stat of the sources'
      success_criteria:
        - 'exit 0, anchor present, list rendered, no source changed'
    - task_id: task-004
      methods:
        - 'sentence-to-row mapping'
        - 'check_run.py'
        - 'git status --porcelain'
      success_criteria:
        - 'every sentence supported, only the two expected paths changed'
```

## 11. Escalation Rules

```yaml
escalation_rules:
  rules:
    - condition: 'before and after differ in anything but the PLATEAU and PATCH columns and the rows of the folded plateau'
      action: 'stop task-002, analyse the difference, log it in the prg as a finding, and write in the manual what is observed instead of the same'
    - condition: 'the manual cannot be built in this environment'
      action: 'record that the build was not run, keep a text check of the markup, and do not claim the build'
    - condition: 'the retry of a failed task fails again'
      action: 'handle inline and log a finding in the prg'
    - condition: 'a change would touch a path outside src/doc/README.adoc and the run directory'
      action: 'do not make it; log it as deferred work'
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
    - task-001
  lowest_confidence_tasks:
    - task-003
    - task-001
  next_action: 'task-001: run the fold on scratch copies and record before and after'
  criteria:
    - 'the four summary criteria hold and are recorded in the run document'
```
