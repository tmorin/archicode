---
title: 'PLN: the design of the editor modules, closed for the P2 gate'
type: pln
status: done
owner: tmorin
date: 2026-10-26
run: 0182
wave: 024
related:
  - docs/wav/wav-024-fixes-and-editor-modules/run/run-0182-editor-modules-design/tdd-0182-editor-modules-design.md
  - docs/wav/wav-024-fixes-and-editor-modules/run/run-0182-editor-modules-design/run-0182-editor-modules-design.md
  - docs/wav/wav-024-fixes-and-editor-modules/wav-024-fixes-and-editor-modules.md
---

# Execution Plan: run 0182, the design of the editor modules (W-4)

This is a TDD+pln run: there is no PRD. The requirements are `W4-1` to `W4-11` of the TDD, taken from the wave entry W-4 and the P2 gate. This run is a design run: the TDD, `editor-cut.json` and `measure-cut.cjs` exist (Stages 4 to 6); no source file changes (`W4-8`). The plan covers what is left to make the design closable at the P2 gate: apply the Stage 5 findings that Stage 6 did not apply, re-prove the numbers on the edited TDD, write the gate evidence into the run document, and prove that nothing outside the run directory moved. The steps of P3 (W-5 to W-9, W-11) are the TDD's DEC-9, not tasks of this plan.

## 1. Executive Summary

```yaml
summary:
  status: 'done'
  product_goal: 'The wave can pass its P2 gate: the run document of W-4 lists the modules, their order, what each exports or shares, the D1 loading choice and the steps of P3 with a guard each, and the author can accept it, with no source file changed.'
  technical_approach: 'Apply the Stage 5 review findings R-1 and R-3 to R-7 to the TDD (R-2 was applied in Stage 6), re-run measure-cut.cjs and the sums of editor-cut.json against the edited TDD, write the P2 gate evidence and the pending acceptance of Q-1 into the run document, then check that the working tree changed nowhere outside the run directory.'
  total_tasks: 4
  parallel_groups: 1
  high_risk_tasks: 0
  human_review_gates: 1
  autonomy_level: 'high'
  recommendation: 'proceed_with_review'
  criteria:
    - 'The TDD states which name names which in a pair (R-1), the registration and the no-handler behaviour of requestRedraw (R-3), the step that builds each mode of check-editor.mjs (R-4), the corrected counts (R-5), the 68 and 69 parts and the meaning of unnamed (R-6) and the checks a commit of step 5.1 can run (R-7), and its Review section says which findings were applied.'
    - 'node docs/wav/wav-024-fixes-and-editor-modules/run/run-0182-editor-modules-design/measure-cut.cjs prints 1,349 declarations, 68 parts, cycles 95, 7, 3, 3 and 311, 162, 100 upward pairs, and the sha256 of standalone.html starts a653717d5564c237 (ASM-1).'
    - 'The run document of W-4 lists, for each item of the first P2 criterion, the section of the TDD that answers it, and records Q-1 (the author accepts RFC-002 and RFC-003 as amended) and the wording difference of DEC-6 as pending for the gate.'
    - 'Nothing under src/, scripts/, .github/, pom.xml, package.json, package-lock.json or CLAUDE.md is changed by this run; the only files it adds or edits are in the run directory.'
    - 'W4-10 (the author has accepted the design) is recorded as pending for the wave gate, not claimed.'
```

## 2. PRD/TDD Consistency Assessment

```yaml
consistency_assessment:
  aligned_items:
    - 'W4-1 is addressed by Current State, W4-2 by DEC-3 and DEC-4 with editor-cut.json, W4-3 and W4-5 by DEC-1 and DEC-7, W4-4 by DEC-5, DEC-6 and DEC-9, W4-6 by IMP-4, IMP-5 and FLOW-3, W4-7 by DEC-11, W4-8 by Observability and Verification, W4-9 by DEC-2, W4-11 by DEC-3 (the state is not too entangled).'
    - 'The TDD says that W4-10 is the gate of the author and cannot be given by this run; the plan carries it as pending.'
    - 'The scope matches the wave entry W-4 and its exit evidence (the run document, no source file changed).'
  gaps:
    - id: gap-001
      type: 'ambiguity'
      description: 'Q-1 is open: RFC-002 and RFC-003 are status proposed and the wave records only D1 (RFC-001) as accepted, so the amendments A1 to A3 of DEC-3, the narrowing of RFC-003 in DEC-6 and the reordered step of DEC-8 are accepted by nobody yet.'
      impact: 'high'
      recommendation: 'No task can close it. The plan records it as pending in the run document and in gate-001, and the tasks do not depend on it. If the author refuses, DEC-3 starts at 311 and DEC-8 redraws on modelsChanged(), and the design is re-run.'
    - id: gap-002
      type: 'contradiction'
      description: 'The wave (gates of W-6 to W-8, Risks) and RFC-003 say the node suite is green after each commit; DEC-6 runs it at every relocate and change commit and at the end of each step, and reads a move commit as covered by the last suite run on identical bytes (Q-2).'
      impact: 'medium'
      recommendation: 'DEC-6 stands as resolved in Stage 6. task-003 writes the difference, with the argument, into the run document for the author at P2. The wave file is not edited by this run.'
    - id: gap-003
      type: 'missing_technical_design'
      description: 'The Stage 5 review returned findings R-1 and R-3 to R-7 that Stage 6 left unapplied (R-2 was applied with the resolution of Q-3). Until they are applied, the TDD does not say which side of a pair names the other, what requestRedraw does with no handler, which step builds --cut and --same-ast, and some of its counts are off by one to three.'
      impact: 'medium'
      recommendation: 'task-001 applies them. R-8 is left as it is (each of 311, 162 and 100 states the check of its own section).'
  blocking_gaps: []
```

## 3. Execution Graph

```yaml
execution_graph:
  nodes:
    - id: task-001
      status: 'done'
      title: 'Apply the Stage 5 review findings R-1 and R-3 to R-7 to the TDD'
      depends_on: []
      produces:
        - 'docs/wav/wav-024-fixes-and-editor-modules/run/run-0182-editor-modules-design/tdd-0182-editor-modules-design.md'
      agent_role: 'Documentation Agent'
      autonomy: 'autonomous'
      risk: 'low'
      confidence: 80
    - id: task-002
      status: 'done'
      title: 'Re-run the measure and check the TDD against editor-cut.json and the page'
      depends_on: [task-001]
      produces:
        - 'results of the measure and of the sums, in the prg of the run'
      agent_role: 'QA Agent'
      autonomy: 'autonomous'
      risk: 'low'
      confidence: 90
    - id: task-003
      status: 'done'
      title: 'Write the P2 gate evidence and the pending acceptance into the run document'
      depends_on: [task-001]
      produces:
        - 'docs/wav/wav-024-fixes-and-editor-modules/run/run-0182-editor-modules-design/run-0182-editor-modules-design.md'
      agent_role: 'Documentation Agent'
      autonomy: 'autonomous'
      risk: 'low'
      confidence: 85
    - id: task-004
      status: 'done'
      title: 'Prove that no file outside the run directory was changed by the run'
      depends_on: [task-002, task-003]
      produces:
        - 'result of the working tree comparison, in the prg of the run'
      agent_role: 'QA Agent'
      autonomy: 'autonomous'
      risk: 'low'
      confidence: 90
  edges:
    - from: task-001
      to: task-002
      reason: 'The numbers are checked on the TDD as edited, since R-5 changes counts.'
    - from: task-001
      to: task-003
      reason: 'The gate evidence points at sections the findings edit (DEC-3, DEC-8, DEC-9, DEC-10).'
    - from: task-002
      to: task-004
      reason: 'The comparison is the last check, after every file of the run is written.'
    - from: task-003
      to: task-004
      reason: 'The comparison includes the run document.'
```

## 4. Task Catalog

```yaml
task_catalog:
  tasks:
    - id: task-001
      title: 'Apply the Stage 5 review findings R-1 and R-3 to R-7 to the TDD'
      source_requirements:
        prd:
          - 'W4-2'
          - 'W4-4'
          - 'W4-5'
          - 'W4-11'
        tdd:
          - 'DEC-3'
          - 'DEC-6'
          - 'DEC-8'
          - 'DEC-9'
          - 'DEC-10'
          - 'IF-2'
          - 'ASM-3'
          - 'Current State'
          - 'Review'
      outputs:
        - 'R-1 (LUCID): DEC-3 and the --list line of IF-2 say that a pair is (A, B) where A names B, naming being a call, a read or an assignment of the top-level declaration B in the body of A, and B sits in a higher layer than A.'
        - 'R-3 (MECE): DEC-8 says that onRedraw(() => render()) is a top-level statement of composition/bootstrap.js, so the statements that name a declaration at load are 20 after step 11.1 (the 19 of Current State plus this one, which --load-order lists), and says what requestRedraw() does when no handler is registered. The default is that it throws, because a missing registration is a bug and not a skipped redraw; if the implementer finds a top-level path that calls it before the registration at load, DEC-8 says so and names the one that stays silent, with the reason.'
        - 'R-4 (MECE): step 5.2 of DEC-9 lists --cut among the modes it builds; the content of step 9.1 or 9.2 builds --same-ast in the commit before the one that uses it; --load-order is said to be a check inside --layers and --statements, not a mode, in DEC-5, DEC-10 and IF-2; the guard of 5.2 (311, 162, 100 by --cut) and the guard of 9.2 (--same-ast) name a step that builds them.'
        - 'R-5 (C-DOC): the counts are corrected to what the stated commands find (the implementer runs each command first and writes its result): the test files that replace modelsChanged (3 per Stage 5), the node test files (116) and those that use createApp or openFixture (106); every sentence that carries the old figures follows the corrected one (found by grep for 103 and 115 in the TDD: the Summary, the plantuml of Current State, the consumers paragraph of Current State and the Rationale of DEC-7). The conclusion of ASM-3 (a top-level name is part of the contract) is unchanged.'
        - 'R-6 (LUCID): the Summary and Scope say once that there are 68 parts, 69 once model/ui-state.js exists; IMP-1 and RISK-7 (both say 69) agree; names.json unnamed is defined where DEC-10 introduces it (the number of top-level statements, 18, that have no name).'
        - 'R-7 (MECE): DEC-6 says that the commits of step 5.1 run the checks of build-editor.mjs only, since check-editor.mjs is written in 5.2, and that the per-commit list of DEC-6 applies in full from 5.2.'
        - 'Q-2 is left decided; the Open Questions text for Q-2 is not shortened. The Review section gains one line that says which findings were applied by run 0182 Stage 8 / task-001 (R-1, R-3 to R-7) and that R-2 was applied in Stage 6, and the section keeps the findings table unchanged.'
        - 'Q-4 says the plan carries the reading of the Native job result as a step of the run verification; this plan has no such task, because the Native job runs on the pull request of P3 (W-5), not on this design run. The sentence of Q-4 is reworded to say that the check is read on the pull request of W-5 and recorded in that run, and the P2 gate evidence of task-003 says the same.'
        - 'Frontmatter and headings are unchanged; status stays draft; no number in DEC-3 (311, 162, 100) changes.'
      verification:
        - 'grep for the new sentences: names, onRedraw as a top-level statement, 20 statements, throws, --cut in 5.2, --same-ast in a step before 9.2, 69 parts, unnamed defined, 5.1 checks'
        - 'the commands of R-5 run once each and their output written into the prg (grep -rln "modelsChanged *=" src/test/javascript, find src/test/javascript -name "*.test.js" | wc -l, grep -rl "createApp\|openFixture" src/test/javascript | wc -l)'
        - 'node docs/wav/wav-024-fixes-and-editor-modules/run/run-0182-editor-modules-design/measure-cut.cjs still prints the figures of the TDD'
      risk: 'low'
      confidence: 80
      human_review: 'none'
      escalation_triggers:
        - 'A command of R-5 prints a figure that differs from Stage 5: write the figure the command prints, log the difference in the prg as a finding.'
        - 'A correction would change a decision (a number of DEC-3, the order of a layer, the commit kinds): stop and log it as a finding; this task corrects the text of decided design and does not make new decisions.'
        - 'The requestRedraw default (throw) is found to break a load-time path: record the path and keep the TDD consistent with the alternative the reviewer allowed, silence with the reason.'
      delegation_tier: 'standard'
      results: 'tier standard, model sonnet, effort medium, profile low-cost, passed first time, inline (leaf), independently verified'
    - id: task-002
      title: 'Re-run the measure and check the TDD against editor-cut.json and the page'
      source_requirements:
        prd:
          - 'W4-1'
          - 'W4-2'
          - 'W4-3'
          - 'W4-8'
        tdd:
          - 'ASM-1'
          - 'DEC-3'
          - 'DEC-4'
          - 'Observability and Verification'
          - 'TG-1'
          - 'TG-2'
      outputs:
        - 'Output of measure-cut.cjs on the page of the working tree, with the sha256 of standalone.html, written into the prg: 1,349 declarations, 68 parts, cycles 95, 7, 3, 3 and pairs 311, 162, 100.'
        - 'The sums of editor-cut.json by layer and by cutting run, compared with the line "Sums by layer, in lines" of DEC-4 (core 4,028, model 2,898, persistence 1,745, application 3,353, presentation 8,577, composition 1,531; W-6 3,546, W-7 5,125, W-8 13,461), and the 68 rows of the table of DEC-4 compared with the parts of editor-cut.json (first and last line, lines, layer, run).'
        - 'The line count (23,170) and the first and last line of the main script of the page, and the base64 line equal to the base64 of src/main/wasm/viewpoint_kernel.wasm, checked once.'
        - 'If any figure differs: the TDD is corrected in the place the figure appears, with the command that gave it, and the difference is a finding in the prg.'
      verification:
        - 'node docs/wav/wav-024-fixes-and-editor-modules/run/run-0182-editor-modules-design/measure-cut.cjs'
        - 'sha256sum src/main/resources/editor-webapp/standalone.html'
        - 'a node one-liner that sums editor-cut.json by layer and by run and compares with the TDD'
      risk: 'low'
      confidence: 90
      human_review: 'none'
      escalation_triggers:
        - 'The sha256 of the page does not start a653717d5564c237: the page changed since af1ed2d (ASM-1); regenerate the numbers, correct the TDD, and log that W-5 must start by the same comparison.'
        - 'The measure cannot run (node missing or the script fails): fix the invocation; the script is read-only and takes the page path from the repository root.'
      delegation_tier: 'standard'
      results: 'tier standard, model sonnet, effort medium, profile low-cost, passed first time, inline (leaf), independently verified'
    - id: task-003
      title: 'Write the P2 gate evidence and the pending acceptance into the run document'
      source_requirements:
        prd:
          - 'W4-2'
          - 'W4-3'
          - 'W4-4'
          - 'W4-10'
        tdd:
          - 'DEC-1'
          - 'DEC-4'
          - 'DEC-6'
          - 'DEC-7'
          - 'DEC-9'
          - 'Open Questions'
          - 'Q-1'
          - 'Q-2'
      outputs:
        - 'run-0182-editor-modules-design.md gains, below its title, a section "P2 gate evidence" with one line per item of the first criterion of the gate: the modules and their order (DEC-4 and the table, editor-cut.json), what each exports or shares (DEC-4 Exports and sharing, ui-state, check-editor.mjs --list), the build and test loading choice for D1 (DEC-1, DEC-2, DEC-7), and the steps of P3 with the guard of each (DEC-9, with DEC-5 and DEC-6 for the checks). Each line names the section of the TDD that answers it and does not copy it.'
        - 'A section "Pending for the author" with Q-1 (accept RFC-002 and RFC-003 as amended: A1 state in the model layer, A2 rule 4 not enforced, A3 requestRedraw beside modelsChanged, the layer Domain called Model, the narrowing of RFC-003 in DEC-6, the reordered notification step) and the wording difference of Q-2 ("node suite green after each commit" in the wave and in RFC-003 against DEC-6), each with the recommendation (accept) and the consequence of refusing, and the two questions Q-3 and Q-4 as decided and as a check read on the pull request.'
        - 'The second criterion of the gate (the author has accepted the design) is written as not met by this run, with the reason: only the author can give it.'
        - 'A "Canonical impact" line (none: docs/ holds run, wav and fixtures; no canonical register is declared), a "Files outside likely_paths" line (none expected; the run directory only), and a "Review pass" line as in run 0181: dispatched, the Stage 5 review of the TDD was made by an agent independent of its drafter.'
        - 'The frontmatter of the run document is not changed by this task (the status is set by the stages that own it).'
      verification:
        - 'grep of the four items of the first criterion in the run document, each with a TDD section name that exists in the TDD'
        - 'each cited section heading or id (DEC-1, DEC-2, DEC-4, DEC-5, DEC-6, DEC-7, DEC-9, Q-1 to Q-4) is found in the TDD by grep'
      risk: 'low'
      confidence: 85
      human_review: 'none'
      escalation_triggers:
        - 'A criterion item has no answering section in the TDD: log it as a gap and add the missing statement to the TDD, not to the run document.'
        - 'The wording would claim that the author accepted anything: do not write it; W4-10 stays pending.'
      delegation_tier: 'standard'
      results: 'tier standard, model sonnet, effort medium, profile low-cost, passed first time, inline (leaf), independently verified'
    - id: task-004
      title: 'Prove that no file outside the run directory was changed by the run'
      source_requirements:
        prd:
          - 'W4-8'
        tdd:
          - 'Observability and Verification'
          - 'Out of scope'
          - 'IMP-8'
      outputs:
        - 'The result of git status --porcelain and of git diff --name-only HEAD written into the prg, next to the baseline taken at the start of the session: two modified wave files (docs/wav/wav-024-fixes-and-editor-modules/prg-024-fixes-and-editor-modules.md and wav-024-fixes-and-editor-modules.md), the untracked run directory of this run and the untracked jacoco-quarkus.exec at the root (written by a coverage build before this run, not by it).'
        - 'The statement, with the evidence, that nothing under src/, scripts/, .github/, pom.xml, package.json, package-lock.json, CLAUDE.md or .prettierignore is modified or untracked because of this run, and that the standalone.html is unchanged (sha256 of task-002).'
      verification:
        - 'git status --porcelain'
        - 'git diff --name-only HEAD'
        - 'git diff --stat HEAD -- src scripts .github pom.xml package.json package-lock.json CLAUDE.md prints nothing'
      risk: 'low'
      confidence: 90
      human_review: 'none'
      escalation_triggers:
        - 'A file outside the run directory differs from the baseline and the run wrote it: revert that edit with a normal edit of the file (no destructive git command) and log it as a finding.'
        - 'A file outside the run directory differs and the run did not write it: log it as a finding of the wave and leave it.'
      delegation_tier: 'standard'
      results: 'tier standard, model sonnet, effort medium, profile low-cost, passed first time, inline (leaf), independently verified'
```

## 5. Parallelization Plan

```yaml
parallelization_plan:
  groups:
    - id: parallel-group-001
      tasks:
        - task-002
        - task-003
      reason: 'Both start from the edited TDD and write different files: task-002 writes results into the prg and edits the TDD only to correct a figure, task-003 writes the run document.'
      conflict_risks:
        - 'task-002 may edit the TDD to correct a figure while task-003 reads it for section names: task-003 cites section ids, which task-002 does not change; if task-002 edits the TDD, task-003 re-checks its citations by grep at the end.'
        - 'Both append to nothing shared: the prg is appended to by task-004 and by the stages of the workflow, one writer at a time.'
  sequential_reason: 'task-001 comes first and task-004 last; the rest of the order is in the graph.'
```

## 6. Human Review Gates

This run operates under the autonomy override of complete-run (it continues without a stop between documents). No task is `human_required`, so the override changes nothing in the order of the work. The one human gate of the run is the wave's P2 gate, whose second criterion is the author's acceptance of the design; it is outside the tasks, because no task of this plan can obtain it and none depends on it. The run ends with it recorded as pending.

```yaml
human_review_gates:
  gates:
    - id: gate-001
      trigger: 'P2 gate of the wave: the author has accepted the design (D1 recorded), Q-1, and the wording difference of DEC-6'
      required_before: []
      required_after: ['task-004']
      reviewer_focus:
        - 'RFC-002 and RFC-003 as amended: the state in the model layer (A1), rule 4 not enforced (A2), requestRedraw beside modelsChanged (A3), the layer called Model'
        - 'DEC-6: the node suite at every relocate and change commit and at the end of each step, against the wave and RFC-003 which say every commit'
        - 'DEC-9: W-5 cuts only the safe parts and commits ratchet.max once; W-6 to W-8 cut the 68 parts; the notification step after W-8'
        - 'DEC-3: the starting count 162 as ratchet.max, 100 after the notification step'
```

## 7. Risk Assessment

```yaml
risk_assessment:
  by_task:
    - id: task-001
      risk: 'low'
      rationale: 'A correction of the text of a design already decided and reviewed; the one judgment is the default of requestRedraw with no handler, which the reviewer recommended and which the task may only change with a reason on record.'
    - id: task-002
      risk: 'low'
      rationale: 'Read-only commands and a comparison of figures.'
    - id: task-003
      risk: 'low'
      rationale: 'Documents inside the run directory; the only risk is wording that claims an acceptance nobody gave, which the acceptance criteria forbid.'
    - id: task-004
      risk: 'low'
      rationale: 'Read-only git commands.'
  by_area:
    - area: 'docs'
      risk: 'low'
      rationale: 'Only files of the run directory change; rollback is an edit of those files.'
    - area: 'api'
      risk: 'low'
      rationale: 'No source, script, workflow or build file changes (W4-8).'
```

## 8. Confidence Assessment

```yaml
confidence_assessment:
  by_task:
    - id: task-001
      score: 80
      rationale: 'Six findings of different kinds in four places of a 540-line document; the counts of R-5 are given by commands and the reviewer already ran them, the R-3 default is a decision the task takes within the reviewer margin.'
    - id: task-002
      score: 90
      rationale: 'The measure script is committed beside the TDD and was reproduced by the Stage 5 reviewer.'
    - id: task-003
      score: 85
      rationale: 'The gate wording is short and each item has a section that answers it.'
    - id: task-004
      score: 90
      rationale: 'The baseline of the working tree is known from the start of the session.'
```

## 9. Agent Assignment Plan

```yaml
agent_assignment_plan:
  assignments:
    - task_id: task-001
      agent_role: 'Documentation Agent'
      objective: 'Apply findings R-1 and R-3 to R-7 of the Stage 5 review to the TDD and record in its Review section which were applied.'
      context:
        prd_excerpts:
          - 'W4-2 the layers, their count and what each part is.'
          - 'W4-4 the steps of P3 with the guard of each.'
          - 'W4-11 the state is not too entangled to cut safely.'
        tdd_excerpts:
          - 'Review table R-1 to R-8 and their recommended fixes.'
          - 'DEC-8 the redraw notification; DEC-9 step 5.2 and 9.2; DEC-10 the modes of check-editor.mjs.'
      likely_files:
        - 'docs/wav/wav-024-fixes-and-editor-modules/run/run-0182-editor-modules-design/tdd-0182-editor-modules-design.md'
      acceptance_criteria:
        - 'Each finding is applied in the place it names, no decision of DEC-3 to DEC-12 changes, and the Review section says what was applied.'
      verification:
        - 'grep for each new sentence'
        - 'the three counting commands of R-5, run once'
        - 'measure-cut.cjs'
      escalation_triggers:
        - 'A correction would change a decision.'
        - 'The requestRedraw default is shown to break a load-time path.'
      suggested_subagent_type: 'general-purpose'
      suggested_model: '(default)'
      suggested_effort: 'medium'
    - task_id: task-002
      agent_role: 'QA Agent'
      objective: 'Re-run the measure and compare its figures, the sums of editor-cut.json and the page with the numbers of the TDD.'
      context:
        prd_excerpts:
          - 'W4-3 the assembled page equals the old one, so the numbers are those of the page at af1ed2d.'
        tdd_excerpts:
          - 'ASM-1 the sha256 prefix a653717d5564c237 and the line count.'
          - 'DEC-3 311, 162, 100; DEC-4 the table and the sums by layer and by run.'
      likely_files:
        - 'docs/wav/wav-024-fixes-and-editor-modules/run/run-0182-editor-modules-design/measure-cut.cjs'
        - 'docs/wav/wav-024-fixes-and-editor-modules/run/run-0182-editor-modules-design/editor-cut.json'
        - 'src/main/resources/editor-webapp/standalone.html'
      acceptance_criteria:
        - 'Every figure of the TDD equals the figure the commands print, or the TDD is corrected and the difference logged.'
      verification:
        - 'node docs/wav/wav-024-fixes-and-editor-modules/run/run-0182-editor-modules-design/measure-cut.cjs'
        - 'sha256sum src/main/resources/editor-webapp/standalone.html'
      escalation_triggers:
        - 'The page changed since af1ed2d.'
      suggested_subagent_type: 'general-purpose'
      suggested_model: '(default)'
      suggested_effort: 'low'
    - task_id: task-003
      agent_role: 'Documentation Agent'
      objective: 'Write the P2 gate evidence and the pending acceptance into the run document, citing the TDD sections and claiming no acceptance.'
      context:
        prd_excerpts:
          - 'W4-10 the author has accepted the design; not satisfiable by this run.'
        tdd_excerpts:
          - 'Open Questions Q-1 to Q-4 as resolved in Stage 6.'
          - 'DEC-1, DEC-4, DEC-7, DEC-9 for the four items of the first criterion of the gate.'
      likely_files:
        - 'docs/wav/wav-024-fixes-and-editor-modules/run/run-0182-editor-modules-design/run-0182-editor-modules-design.md'
      acceptance_criteria:
        - 'Four lines of evidence each citing an existing TDD section; Q-1 and the DEC-6 wording difference under Pending for the author; the second criterion marked not met by this run.'
      verification:
        - 'grep of the cited section ids in the TDD'
      escalation_triggers:
        - 'A criterion item with no answering section.'
      suggested_subagent_type: 'general-purpose'
      suggested_model: '(default)'
      suggested_effort: 'medium'
    - task_id: task-004
      agent_role: 'QA Agent'
      objective: 'Show with git that the run changed nothing outside its own directory and that the page is untouched.'
      context:
        prd_excerpts:
          - 'W4-8 no source file changed.'
        tdd_excerpts:
          - 'IMP-8 and Out of scope list what must not change.'
      likely_files:
        - 'docs/wav/wav-024-fixes-and-editor-modules/run/run-0182-editor-modules-design/prg-0182-editor-modules-design.md'
      acceptance_criteria:
        - 'The porcelain status equals the baseline plus the files of the run directory.'
      verification:
        - 'git status --porcelain'
        - 'git diff --stat HEAD -- src scripts .github pom.xml package.json package-lock.json CLAUDE.md'
      escalation_triggers:
        - 'A file outside the run directory differs from the baseline.'
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
        - 'grep of the applied sentences'
        - 'counting commands of R-5'
        - 'measure script'
      success_criteria:
        - 'Each of R-1, R-3, R-4, R-5, R-6 and R-7 is visible in the TDD in the place the review names; the figures of R-5 equal the output of their commands; the Review section lists what was applied; measure-cut.cjs still prints the figures of the TDD.'
    - task_id: task-002
      methods:
        - 'measure script'
        - 'sha256 of the page'
        - 'sum of editor-cut.json by layer and by run'
      success_criteria:
        - '1,349 declarations, 68 parts, cycles 95, 7, 3, 3, pairs 311, 162, 100; the sha256 starts a653717d5564c237; the layer and run sums equal the line of DEC-4.'
    - task_id: task-003
      methods:
        - 'grep of the cited section ids'
        - 'diff review'
      success_criteria:
        - 'Every cited id exists in the TDD; Q-1 and the DEC-6 wording difference are pending; no sentence says that the author accepted the design.'
    - task_id: task-004
      methods:
        - 'git status'
        - 'git diff'
      success_criteria:
        - 'Nothing outside the run directory differs from the baseline of the start of the session; the page is byte-identical.'
```

## 11. Escalation Rules

This run operates under the autonomy override of complete-run: a task that would be `human_required` is executed and its decision logged. None is expected. The author's acceptance of the design (Q-1) is not a task and is not worked around: it is carried to the wave's P2 gate as pending.

```yaml
escalation_rules:
  rules:
    - condition: 'A correction of task-001 would change a decision (a number of DEC-3, a layer of a part, the commit kinds, the order of the steps).'
      action: 'Stop that correction, log it as a finding in the prg and leave the decision as the TDD has it; this run corrects the statement of a decision and makes no new one.'
    - condition: 'The sha256 of the page, a line count or a figure of the measure differs from the TDD (ASM-1).'
      action: 'Regenerate the numbers with measure-cut.cjs, correct the TDD where the figure appears, and log that W-5 must start by the same comparison.'
    - condition: 'A file outside the run directory is changed by the run.'
      action: 'Revert that edit by editing the file back (no destructive git command), and log it as a finding.'
    - condition: 'The wording of a document would say that the author accepted RFC-002, RFC-003 or the design.'
      action: 'Do not write it; W4-10 stays pending until the wave gate.'
    - condition: 'Confidence of a task falls below 70.'
      action: 'Re-dispatch once one effort step up, then handle inline.'
```

## 12. Final Execution Manifest

```yaml
execution_manifest:
  status: 'done'
  recommendation: 'proceed_with_review'
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
    - task-004
  parallel_groups:
    - parallel-group-001
  required_human_gates:
    - gate-001
  highest_risk_tasks:
    - task-001
  lowest_confidence_tasks:
    - task-001
  next_action: 'none: the run closes; the P2 gate (the author accepts the design, Q-1) is the wave gate.'
  criteria:
    - 'All four tasks done and their verification green.'
    - 'The TDD carries the Stage 5 findings and its figures equal the measure.'
    - 'The run document holds the P2 gate evidence, with Q-1 and the DEC-6 wording difference pending for the author.'
    - 'No file outside the run directory is changed by the run.'
    - 'W4-10 (the author has accepted the design) is recorded as pending for the wave gate, not claimed.'
```
