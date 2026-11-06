---
title: Execution Plan — Plateau matrix file
status: draft
date: 2026-11-06
related:
  - docs/wav/wav-033-import-structurizr-and-plateau-matrix/run/run-0225-plateau-matrix-file/tdd-0225-plateau-matrix-file.md
  - docs/wav/wav-033-import-structurizr-and-plateau-matrix/wav-033-import-structurizr-and-plateau-matrix.md
  - 'gh:tmorin/archicode#24'
type: pln
run: 0225
wave: 033
---

# Execution Plan: Plateau matrix file

Profile TDD+pln: there is no PRD, so R-1 to R-8 are the IDs the TDD labels (section "PRD Traceability"), assumed from the manifest row W-2, issue #24 and run 0206. The TDD is the design (DEC-1 to DEC-7, IMP-1 to IMP-6, CTR-1 and CTR-2). The plan commits nothing: the commit is a human step outside it.

Autonomy: this wave runs with no autonomy override (its progress log says "autonomy override: none"), so no task is `human_required` and none has `risk: critical`. The tasks that carry some weight are `review_after` (task-004, the oracle, and task-008, the final check); their independent verification is the review, together with the author's reading of the pull request. A future reader should not look for a stop: none was needed.

The Stage 5 review of the TDD returned 17 findings that the main agent applies to the TDD; the plan is drafted so that it holds either way: task-001 writes down the three that touch the code (reflect-config entries are classes, the default folder name does not read a views.path already of the form views-<plateau>, the derived path needs settings.current before any load) and task-003 applies them.

W-1 (run 0224) is already in the working tree and edited the shared files (`ArchiCode.java` is not touched here; `reflect-config.json`, `README.adoc`, the CLAUDE.md files, `golden.md`, `HelpIT`, `docs/architecture/`): every task edits by anchors and leaves its lines.

Every Maven command runs with `JAVA_HOME=$HOME/.sdkman/candidates/java/25.0.4-tem` (the shell Java is 21).

## 1. Executive Summary

```yaml
summary:
  status: 'draft'
  product_goal: 'archicode plateau matrix writes, for one path of plateaus, a row per element lineage, a column per plateau and a Span column that is one comparison of the first with the last, as text, matrix.md and matrix.json'
  technical_approach: 'A pure model and writer in a new package rendering.matrix behind a command in the group plateau that loads each plateau once and compares consecutive pairs plus the span with the existing PlateauComparer, proved by matrix-cases.json cross-checked live against diff'
  total_tasks: 8
  parallel_groups: 1
  high_risk_tasks: 0
  human_review_gates: 0
  autonomy_level: 'medium'
  recommendation: 'proceed_with_review'
  criteria:
    - 'Every cell of the matrix equals the state diff gives for the same pair and the Span counts equal diff for the first and the last plateau'
    - 'A path with two siblings and each other mistake of the author is one error: line, exit 1, nothing written'
    - 'The command is in the manual, the guide, the native reflection entries and the model of ArchiCode, and one integration test runs it'
    - 'src/main/rust, src/main/wasm, brightcart/expected and the gap goldens are unchanged and byte-identity needs no new exception'
```

## 2. PRD/TDD Consistency Assessment

```yaml
consistency_assessment:
  aligned_items:
    - 'R-1 to R-8 each map to at least one DEC and one IMP of the TDD, and each to a task below'
    - 'The gate commands of the wave are the verification of task-004 and task-008'
    - 'The pure model, the thin command and the oracle of the TDD are the split of task-002 to task-004'
  gaps:
    - id: gap-001
      type: 'missing_technical_design'
      description: 'There is no PRD: R-1 to R-8 are assumed from the wave plan, issue #24 and run 0206 (traceability incomplete in the TDD)'
      impact: 'low'
      recommendation: 'The tasks cite the R-n of the TDD; the wave verification reads the same sources'
    - id: gap-002
      type: 'ambiguity'
      description: 'ASM-3: the split and merged counts of the kernel count the elements that replace and may not equal the rows'
      impact: 'medium'
      recommendation: 'Task-001 checks it; task-002 and task-004 fall back to comparing span.counts with diff'
    - id: gap-003
      type: 'risk'
      description: 'Stage 5 findings on the reflect-config entries, the default folder name and settings.current'
      impact: 'medium'
      recommendation: 'Task-001 records them and task-003 applies them with a test each'
    - id: gap-004
      type: 'risk'
      description: 'Uncommitted W-1 lines in shared files (CON-6, RISK-4)'
      impact: 'medium'
      recommendation: 'Edit by anchors, diff before and after, in task-003, task-006 and task-007'
  blocking_gaps: []
```

## 3. Execution Graph

```yaml
execution_graph:
  nodes:
    - id: task-001
      status: 'done'
      title: 'Facts: confirm ASM-1 to ASM-4 on the layered Brightcart and read the shared files W-1 left'
      depends_on: []
      produces:
        - 'a Facts block appended to prg-0225-plateau-matrix-file.md (what Comparison.getElements() and ElementChange.replaces give for baseline, inhouse, marketplace; the reference counts per plateau against expected/sizes.json; the row and Span counts; the diff of the shared files of W-1)'
      agent_role: 'Documentation Agent'
      autonomy: 'autonomous'
      risk: 'low'
      confidence: 75
    - id: task-002
      status: 'done'
      title: 'Model and writer: PlateauMatrix (lineages, cells, Span) and MatrixReport (text, markdown, json)'
      depends_on: [task-001]
      produces:
        - 'src/main/java/io/morin/archicode/rendering/matrix/PlateauMatrix.java'
        - 'src/main/java/io/morin/archicode/rendering/matrix/MatrixReport.java'
        - 'src/test/java/io/morin/archicode/rendering/matrix/PlateauMatrixTest.java'
      agent_role: 'Backend Implementation Agent'
      autonomy: 'autonomous'
      risk: 'medium'
      confidence: 70
    - id: task-003
      status: 'done'
      title: 'Command: MatrixPath, PlateauMatrixCommand, registration in PlateauGroup, native reflection, refusals and file writing'
      depends_on: [task-002]
      produces:
        - 'src/main/java/io/morin/archicode/cli/MatrixPath.java'
        - 'src/main/java/io/morin/archicode/cli/PlateauMatrixCommand.java'
        - 'src/main/java/io/morin/archicode/cli/PlateauGroup.java'
        - 'src/main/resources/META-INF/native-image/io.morin.archicode/archicode/reflect-config.json'
        - 'src/test/java/io/morin/archicode/cli/PlateauMatrixCommandTest.java'
      agent_role: 'Backend Implementation Agent'
      autonomy: 'autonomous'
      risk: 'medium'
      confidence: 70
    - id: task-004
      status: 'done'
      title: 'Oracle: matrix-cases.json and PlateauMatrixCasesTest, cross-checked live against diff'
      depends_on: [task-003]
      produces:
        - 'src/test/resources/brightcart/matrix-cases.json'
        - 'src/test/java/io/morin/archicode/cli/PlateauMatrixCasesTest.java'
      agent_role: 'Test Generation Agent'
      autonomy: 'review_after'
      risk: 'medium'
      confidence: 65
    - id: task-005
      status: 'done'
      title: 'Integration test on the packaged application'
      depends_on: [task-003]
      produces:
        - 'src/test/java/io/morin/archicode/it/PlateauMatrixIT.java'
      agent_role: 'Test Generation Agent'
      autonomy: 'autonomous'
      risk: 'low'
      confidence: 80
    - id: task-006
      status: 'done'
      title: 'Manual, guide golden, help test and command-line notes'
      depends_on: [task-003]
      produces:
        - 'src/doc/README.adoc'
        - 'src/test/resources/guide/golden.md'
        - 'src/test/java/io/morin/archicode/it/HelpIT.java'
        - 'src/main/java/io/morin/archicode/CLAUDE.md'
        - 'src/main/java/io/morin/archicode/workspace/CLAUDE.md'
      agent_role: 'Documentation Agent'
      autonomy: 'autonomous'
      risk: 'low'
      confidence: 75
    - id: task-007
      status: 'done'
      title: 'The model of ArchiCode: the matrix component, its edges, and the sample bundle'
      depends_on: [task-003]
      produces:
        - 'docs/architecture/manifests/archicode.yaml'
        - 'src/test/javascript/architecture/impact-questions.json'
        - 'src/main/resources/editor-webapp/samples/archicode.yaml'
      agent_role: 'Documentation Agent'
      autonomy: 'autonomous'
      risk: 'low'
      confidence: 70
    - id: task-008
      status: 'done'
      title: 'Gates of the run: the whole suite, byte identity, format, lint, builds'
      depends_on: [task-004, task-005, task-006, task-007]
      produces:
        - 'a results block in prg-0225-plateau-matrix-file.md (commands, exit codes, whether the native image was proved)'
      agent_role: 'QA Agent'
      autonomy: 'review_after'
      risk: 'medium'
      confidence: 75
```

## 4. Task Catalog

```yaml
task_catalog:
  tasks:
    - id: task-001
      title: 'Facts: confirm ASM-1 to ASM-4 on the layered Brightcart and read the shared files W-1 left'
      source_requirements:
        prd:
          - 'none: there is no PRD (profile TDD+pln); the R-n of the TDD are listed with the TDD items'
        tdd:
          - 'R-6'
          - 'ASM-1'
          - 'ASM-2'
          - 'ASM-3'
          - 'ASM-4'
          - 'CON-6'
          - 'RISK-1'
          - 'RISK-4'
          - 'Q-4'
      outputs:
        - 'a Facts block appended to prg-0225-plateau-matrix-file.md (what Comparison.getElements() and ElementChange.replaces give for baseline, inhouse, marketplace; the reference counts per plateau against expected/sizes.json; the row and Span counts; the diff of the shared files of W-1)'
      verification:
        - 'JAVA_HOME=$HOME/.sdkman/candidates/java/25.0.4-tem ./mvnw -q -DskipTests package'
        - 'java -jar target/quarkus-app/quarkus-run.jar diff --plateau marketplace --against baseline -w src/test/resources/brightcart/layered/.archicode.yaml -f json'
        - 'git diff --stat -- src/main/java/io/morin/archicode/cli/ArchiCode.java src/main/resources/META-INF/native-image src/doc/README.adoc src/test/resources/guide/golden.md'
      risk: 'low'
      confidence: 75
      human_review: 'none'
      escalation_triggers:
        - 'an assumption is false in a way that changes a decision, not only a test: stop and log it'
      delegation_tier: 'standard'
      results: 'tier standard, model sonnet, effort medium, profile low-cost, passed first time, inline (leaf), independently verified'
    - id: task-002
      title: 'Model and writer: PlateauMatrix (lineages, cells, Span) and MatrixReport (text, markdown, json)'
      source_requirements:
        prd:
          - 'none: there is no PRD (profile TDD+pln); the R-n of the TDD are listed with the TDD items'
        tdd:
          - 'R-1'
          - 'R-2'
          - 'R-3'
          - 'TG-2'
          - 'TG-3'
          - 'DEC-3'
          - 'DEC-4'
          - 'DEC-5'
          - 'CTR-1'
          - 'IF-3'
          - 'IMP-2'
          - 'IMP-4'
          - 'ASM-3'
          - 'RISK-1'
          - 'RISK-2'
      outputs:
        - 'src/main/java/io/morin/archicode/rendering/matrix/PlateauMatrix.java'
        - 'src/main/java/io/morin/archicode/rendering/matrix/MatrixReport.java'
        - 'src/test/java/io/morin/archicode/rendering/matrix/PlateauMatrixTest.java'
      verification:
        - 'JAVA_HOME=$HOME/.sdkman/candidates/java/25.0.4-tem ./mvnw test -Dtest=PlateauMatrixTest'
      risk: 'medium'
      confidence: 70
      human_review: 'none'
      escalation_triggers:
        - 'ASM-3 is false for split or merged: write the counts of the comparison as they are in span.counts and compare those, not the rows (RISK-1)'
      delegation_tier: 'standard'
      results: 'tier standard, model sonnet, effort medium, profile low-cost, passed first time, inline (leaf), independently verified'
    - id: task-003
      title: 'Command: MatrixPath, PlateauMatrixCommand, registration in PlateauGroup, native reflection, refusals and file writing'
      source_requirements:
        prd:
          - 'none: there is no PRD (profile TDD+pln); the R-n of the TDD are listed with the TDD items'
        tdd:
          - 'R-1'
          - 'R-4'
          - 'R-5'
          - 'R-7'
          - 'TG-1'
          - 'TG-4'
          - 'DEC-1'
          - 'DEC-2'
          - 'DEC-6'
          - 'IF-1'
          - 'IF-2'
          - 'FLOW-1'
          - 'CTR-2'
          - 'CON-1'
          - 'CON-2'
          - 'CON-3'
          - 'IMP-1'
          - 'IMP-3'
          - 'IMP-4'
          - 'RISK-3'
      outputs:
        - 'src/main/java/io/morin/archicode/cli/MatrixPath.java'
        - 'src/main/java/io/morin/archicode/cli/PlateauMatrixCommand.java'
        - 'src/main/java/io/morin/archicode/cli/PlateauGroup.java'
        - 'src/main/resources/META-INF/native-image/io.morin.archicode/archicode/reflect-config.json'
        - 'src/test/java/io/morin/archicode/cli/PlateauMatrixCommandTest.java'
      verification:
        - 'JAVA_HOME=$HOME/.sdkman/candidates/java/25.0.4-tem ./mvnw test -Dtest=''PlateauMatrixCommandTest,NativeReflectionConfigTest'''
        - 'JAVA_HOME=$HOME/.sdkman/candidates/java/25.0.4-tem ./mvnw test-compile pmd:check'
      risk: 'medium'
      confidence: 70
      human_review: 'none'
      escalation_triggers:
        - 'W-1 lines in PlateauGroup or reflect-config.json would be lost by an edit: edit by anchors and diff before and after (RISK-4)'
        - 'the command needs a change under viewpoint/kernel: stop and log it'
      delegation_tier: 'standard'
      results: 'tier standard, model sonnet, effort medium, profile low-cost, passed first time, inline (leaf), independently verified'
    - id: task-004
      title: 'Oracle: matrix-cases.json and PlateauMatrixCasesTest, cross-checked live against diff'
      source_requirements:
        prd:
          - 'none: there is no PRD (profile TDD+pln); the R-n of the TDD are listed with the TDD items'
        tdd:
          - 'R-6'
          - 'R-8'
          - 'TG-2'
          - 'TG-3'
          - 'DEC-7'
          - 'CTR-1'
          - 'ASM-3'
          - 'ASM-4'
          - 'RISK-1'
          - 'RISK-2'
      outputs:
        - 'src/test/resources/brightcart/matrix-cases.json'
        - 'src/test/java/io/morin/archicode/cli/PlateauMatrixCasesTest.java'
      verification:
        - 'JAVA_HOME=$HOME/.sdkman/candidates/java/25.0.4-tem ./mvnw test -Dtest=PlateauMatrixCasesTest'
        - 'git diff --stat -- src/main/rust src/main/wasm src/test/resources/brightcart/expected'
      risk: 'medium'
      confidence: 65
      human_review: 'after'
      escalation_triggers:
        - 'a cell disagrees with diff: the defect is in task-002, fix it there; the case file is never edited to match the code'
      delegation_tier: 'standard'
      results: 'tier standard, model sonnet, effort medium, profile low-cost, passed first time, inline (leaf), independently verified'
    - id: task-005
      title: 'Integration test on the packaged application'
      source_requirements:
        prd:
          - 'none: there is no PRD (profile TDD+pln); the R-n of the TDD are listed with the TDD items'
        tdd:
          - 'R-7'
          - 'IMP-4'
          - 'Observability and Verification'
      outputs:
        - 'src/test/java/io/morin/archicode/it/PlateauMatrixIT.java'
      verification:
        - 'JAVA_HOME=$HOME/.sdkman/candidates/java/25.0.4-tem ./mvnw verify -DskipITs=false -Dit.test=PlateauMatrixIT -Dtest=NoSuchTest -Dsurefire.failIfNoSpecifiedTests=false'
      risk: 'low'
      confidence: 80
      human_review: 'none'
      escalation_triggers:
        - 'the packaged application refuses what the in-process test accepted: log it as a finding against task-003'
      delegation_tier: 'standard'
      results: 'tier standard, model sonnet, effort medium, profile low-cost, passed first time, inline (leaf), independently verified'
    - id: task-006
      title: 'Manual, guide golden, help test and command-line notes'
      source_requirements:
        prd:
          - 'none: there is no PRD (profile TDD+pln); the R-n of the TDD are listed with the TDD items'
        tdd:
          - 'R-7'
          - 'CON-4'
          - 'CON-5'
          - 'CON-6'
          - 'DEC-1'
          - 'IMP-5'
          - 'CTR-2'
      outputs:
        - 'src/doc/README.adoc'
        - 'src/test/resources/guide/golden.md'
        - 'src/test/java/io/morin/archicode/it/HelpIT.java'
        - 'src/main/java/io/morin/archicode/CLAUDE.md'
        - 'src/main/java/io/morin/archicode/workspace/CLAUDE.md'
      verification:
        - 'JAVA_HOME=$HOME/.sdkman/candidates/java/25.0.4-tem ./mvnw test -Dtest=''CommandReferenceTest,GuideTest'''
        - 'grep -nE ''wave|run-0|#24|20[0-9]{2}-'' src/main/java/io/morin/archicode/CLAUDE.md src/main/java/io/morin/archicode/workspace/CLAUDE.md || true'
      risk: 'low'
      confidence: 75
      human_review: 'none'
      escalation_triggers:
        - 'the generated listing moves for a command other than plateau matrix'
      delegation_tier: 'standard'
      results: 'tier standard, model sonnet, effort medium, profile low-cost, passed first time, inline (leaf), independently verified'
    - id: task-007
      title: 'The model of ArchiCode: the matrix component, its edges, and the sample bundle'
      source_requirements:
        prd:
          - 'none: there is no PRD (profile TDD+pln); the R-n of the TDD are listed with the TDD items'
        tdd:
          - 'R-7'
          - 'IMP-6'
          - 'CI-arc-1'
      outputs:
        - 'docs/architecture/manifests/archicode.yaml'
        - 'src/test/javascript/architecture/impact-questions.json'
        - 'src/main/resources/editor-webapp/samples/archicode.yaml'
      verification:
        - 'JAVA_HOME=$HOME/.sdkman/candidates/java/25.0.4-tem ./mvnw test -Dtest=''ArchitectureDriftTest,ArchitectureImpactTest,ArchitectureModelTest'''
        - 'npm run sample:build && npm run sample:check'
      risk: 'low'
      confidence: 70
      human_review: 'none'
      escalation_triggers:
        - 'an impact question changes in a way the run did not intend'
      delegation_tier: 'standard'
      results: 'tier standard, model sonnet, effort medium, profile low-cost, passed first time, inline (leaf), independently verified'
    - id: task-008
      title: 'Gates of the run: the whole suite, byte identity, format, lint, builds'
      source_requirements:
        prd:
          - 'none: there is no PRD (profile TDD+pln); the R-n of the TDD are listed with the TDD items'
        tdd:
          - 'R-8'
          - 'CON-3'
          - 'CON-4'
          - 'Observability and Verification'
          - 'RISK-3'
      outputs:
        - 'a results block in prg-0225-plateau-matrix-file.md (commands, exit codes, whether the native image was proved)'
      verification:
        - 'JAVA_HOME=$HOME/.sdkman/candidates/java/25.0.4-tem ./mvnw verify -DskipITs=false'
        - 'JAVA_HOME=$HOME/.sdkman/candidates/java/25.0.4-tem ./mvnw test-compile pmd:check'
        - 'scripts/byte-identity.sh'
        - 'npm run test:unit'
        - 'npm run format:check'
        - 'npm run lint'
        - 'npm run editor:build && npm run sample:build'
        - 'git diff --stat -- src/main/rust src/main/wasm src/test/resources/brightcart/expected scripts/byte-identity-exceptions.txt'
      risk: 'medium'
      confidence: 75
      human_review: 'after'
      escalation_triggers:
        - 'byte-identity needs a new exception or an existing command changes its output'
        - 'a command fails for a reason outside the matrix (a base already red): record it, do not fix it'
      delegation_tier: 'standard'
      results: 'tier standard, model sonnet, effort medium, profile low-cost, passed after escalation to effort high, inline (leaf), independently verified'
```

## 5. Parallelization Plan

```yaml
parallelization_plan:
  groups:
    - id: parallel-group-001
      tasks:
        - task-004
        - task-005
        - task-006
        - task-007
      reason: 'Once the command exists, the oracle, the integration test, the documentation and the model touch disjoint paths'
      conflict_risks:
        - 'task-005 and task-006 both add to src/test/java/io/morin/archicode/it: PlateauMatrixIT and HelpIT are distinct files'
        - 'task-004, task-005, task-006 and task-007 all run Maven (task-005 packages the jar) or npm builds in the same target folder: run the build commands one after another, never at the same time'
        - 'task-006 and task-007 edit files W-1 also edited: distinct files, edit by anchors'
```

## 6. Human Review Gates

```yaml
human_review_gates:
  gates:
    - id: gate-001
      trigger: 'The oracle (task-004) and the final check (task-008) decide whether the matrix agrees with diff'
      required_before: []
      required_after: ['task-008']
      reviewer_focus:
        - 'that the cases file was written from the run and every cell is also checked live against diff'
        - 'that the Span is one comparison and never a fold of the cells'
        - 'that the native image was not proved by this run'
```

This wave carries no autonomy override. The gate does not stop the run: no task is `human_required`; the tasks it covers are `review_after`, and the review is the verification of the run and the author's reading of the pull request.

## 7. Risk Assessment

```yaml
risk_assessment:
  by_task:
    - id: task-001
      risk: 'low'
      rationale: 'Read-only facts, a clear oracle.'
    - id: task-002
      risk: 'medium'
      rationale: 'The lineage rule carries the value; run 0206 showed that a row by reference is wrong.'
    - id: task-003
      risk: 'medium'
      rationale: 'Glue with the sentences of IF-2 and the folder rule of DEC-6.'
    - id: task-004
      risk: 'medium'
      rationale: 'The oracle must not be a snapshot of the implementation.'
    - id: task-005
      risk: 'low'
      rationale: 'Pattern copy of the existing integration tests.'
    - id: task-006
      risk: 'low'
      rationale: 'Documentation with generated checks.'
    - id: task-007
      risk: 'low'
      rationale: 'Model upkeep, the drift test is the oracle.'
    - id: task-008
      risk: 'medium'
      rationale: 'Independent final check before close-out.'
  by_area:
    - area: 'security'
      risk: 'low'
      rationale: 'The command reads the workspace and writes at most two files in a folder the author names with -o'
    - area: 'data'
      risk: 'low'
      rationale: 'Nothing existing is rewritten except the command own two files in its own folder'
    - area: 'api'
      risk: 'medium'
      rationale: 'The command listing, the guide and the help move; the native image needs reflection entries that only its job proves'
    - area: 'docs'
      risk: 'low'
      rationale: 'The generated listing and the drift test check the manual and the model'
```

## 8. Confidence Assessment

```yaml
confidence_assessment:
  by_task:
    - id: task-001
      score: 75
      rationale: 'Read-only facts, a clear oracle.'
    - id: task-002
      score: 70
      rationale: 'The lineage rule carries the value; run 0206 showed that a row by reference is wrong.'
    - id: task-003
      score: 70
      rationale: 'Glue with the sentences of IF-2 and the folder rule of DEC-6.'
    - id: task-004
      score: 65
      rationale: 'The oracle must not be a snapshot of the implementation.'
    - id: task-005
      score: 80
      rationale: 'Pattern copy of the existing integration tests.'
    - id: task-006
      score: 75
      rationale: 'Documentation with generated checks.'
    - id: task-007
      score: 70
      rationale: 'Model upkeep, the drift test is the oracle.'
    - id: task-008
      score: 75
      rationale: 'Independent final check before close-out.'
```

## 9. Agent Assignment Plan

```yaml
agent_assignment_plan:
  assignments:
    - task_id: task-001
      agent_role: 'Documentation Agent'
      objective: 'Run the existing diff on the layered Brightcart for each pair and for the span, print Comparison.getElements() through a throwaway test or jshell in the scratchpad (nothing kept in the repository), compare the per-plateau reference counts with expected/sizes.json, and read PlateauOption, PlateauTree and the W-1 lines of the shared files. Write only the Facts block.'
      context:
        prd_excerpts:
          - 'none: there is no PRD (profile TDD+pln); the R-n of the TDD are listed with the TDD items'
        tdd_excerpts:
          - 'R-6'
          - 'ASM-1'
          - 'ASM-2'
          - 'ASM-3'
          - 'ASM-4'
          - 'CON-6'
          - 'RISK-1'
          - 'RISK-4'
          - 'Q-4'
      likely_files:
        - 'docs/wav/wav-033-import-structurizr-and-plateau-matrix/run/run-0225-plateau-matrix-file/prg-0225-plateau-matrix-file.md'
      acceptance_criteria:
        - 'the Facts block says, for each of ASM-1 to ASM-4, true or false with the number seen'
        - 'the Facts block lists the lines W-1 left in each shared file so that later tasks edit by anchors'
        - 'the three Stage 5 corrections are written down for the tasks that apply them: every reflect-config entry is a class (NativeReflectionConfigTest), the default folder name must not read a views.path already of the form views-<plateau>, the derived path needs settings.current before any load'
      verification:
        - 'JAVA_HOME=$HOME/.sdkman/candidates/java/25.0.4-tem ./mvnw -q -DskipTests package'
        - 'java -jar target/quarkus-app/quarkus-run.jar diff --plateau marketplace --against baseline -w src/test/resources/brightcart/layered/.archicode.yaml -f json'
        - 'git diff --stat -- src/main/java/io/morin/archicode/cli/ArchiCode.java src/main/resources/META-INF/native-image src/doc/README.adoc src/test/resources/guide/golden.md'
      escalation_triggers:
        - 'an assumption is false in a way that changes a decision, not only a test: stop and log it'
      suggested_subagent_type: 'general-purpose'
      suggested_model: '(default)'
      suggested_effort: 'medium'
    - task_id: task-002
      agent_role: 'Backend Implementation Agent'
      objective: 'Write the lineage rule of DEC-3 (backward trace from terminal nodes; predecessors are the replaces present in the previous column, else the same reference), the cell states of DEC-4, the Span from one comparison of the first with the last plateau (only with three columns or more), the omission of DEC-5, and the three renderings of CTR-1 and IF-3. Sorted maps only, no clock, no absolute path.'
      context:
        prd_excerpts:
          - 'none: there is no PRD (profile TDD+pln); the R-n of the TDD are listed with the TDD items'
        tdd_excerpts:
          - 'R-1'
          - 'R-2'
          - 'R-3'
          - 'TG-2'
          - 'TG-3'
          - 'DEC-3'
          - 'DEC-4'
          - 'DEC-5'
          - 'CTR-1'
          - 'IF-3'
          - 'IMP-2'
          - 'IMP-4'
          - 'ASM-3'
          - 'RISK-1'
          - 'RISK-2'
      likely_files:
        - 'src/main/java/io/morin/archicode/rendering/matrix/PlateauMatrix.java'
        - 'src/main/java/io/morin/archicode/rendering/matrix/MatrixReport.java'
        - 'src/test/java/io/morin/archicode/rendering/matrix/PlateauMatrixTest.java'
      acceptance_criteria:
        - 'PlateauMatrix is plain Java (records, no Picocli, no CDI) and takes presence sets and Comparison objects'
        - 'unit cases on small hand-made comparisons: a move in two steps, a split (two rows, same origin), a merge (one row, origins listed), a transient (empty Span), a removal, a new element'
        - 'a row with no change is left out and counted in unchanged'
        - 'MatrixReport.json keys are in the order of CTR-1 and the same input gives the same bytes'
        - 'the text cell words are -, =, new, changed, removed, moved from, split from, merged from'
      verification:
        - 'JAVA_HOME=$HOME/.sdkman/candidates/java/25.0.4-tem ./mvnw test -Dtest=PlateauMatrixTest'
      escalation_triggers:
        - 'ASM-3 is false for split or merged: write the counts of the comparison as they are in span.counts and compare those, not the rows (RISK-1)'
      suggested_subagent_type: 'general-purpose'
      suggested_model: '(default)'
      suggested_effort: 'high'
    - task_id: task-003
      agent_role: 'Backend Implementation Agent'
      objective: 'Write MatrixPath (ids in order, ancestry through PlateauTree, derived path from --plateau, settings.current or the last plateau of a one-line tree), the command (one WorkspaceFactory.create per plateau, N-1 pair compares, one span compare, PlateauMatrix.of, MatrixReport, the files written after the whole text is built, matrix.md first), register it in PlateauGroup.subcommands, and add the reflect-config class entries.'
      context:
        prd_excerpts:
          - 'none: there is no PRD (profile TDD+pln); the R-n of the TDD are listed with the TDD items'
        tdd_excerpts:
          - 'R-1'
          - 'R-4'
          - 'R-5'
          - 'R-7'
          - 'TG-1'
          - 'TG-4'
          - 'DEC-1'
          - 'DEC-2'
          - 'DEC-6'
          - 'IF-1'
          - 'IF-2'
          - 'FLOW-1'
          - 'CTR-2'
          - 'CON-1'
          - 'CON-2'
          - 'CON-3'
          - 'IMP-1'
          - 'IMP-3'
          - 'IMP-4'
          - 'RISK-3'
      likely_files:
        - 'src/main/java/io/morin/archicode/cli/MatrixPath.java'
        - 'src/main/java/io/morin/archicode/cli/PlateauMatrixCommand.java'
        - 'src/main/java/io/morin/archicode/cli/PlateauGroup.java'
        - 'src/main/resources/META-INF/native-image/io.morin.archicode/archicode/reflect-config.json'
        - 'src/test/java/io/morin/archicode/cli/PlateauMatrixCommandTest.java'
      acceptance_criteria:
        - 'nothing is loaded or compared before the path is valid (MatrixPath reads the tree only)'
        - 'each refusal of IF-2 is one error: line, exit 1, no stack trace, nothing written: fewer than two plateaus, an unknown id, siblings (inhouse saas, saas inhouse marketplace), a plateau twice, --plateau with ids, -f with -o, a forked tree with neither ids nor --plateau, a workspace with no plateau'
        - 'with -o the folder is <path>-matrix-<first>-to-<last> (default path settings.views.path, without reading a views.path that is already views-<plateau>), holds matrix.md and matrix.json, one line wrote <folder> is printed, and reloading a /** workspace with the folder in place exits 0'
        - 'warnings go through Warnings and print when the command ends; standard output holds the table only'
        - 'every new class reflect-config.json needs is a class entry and NativeReflectionConfigTest passes'
        - 'PMD passes with no NOPMD'
      verification:
        - 'JAVA_HOME=$HOME/.sdkman/candidates/java/25.0.4-tem ./mvnw test -Dtest=''PlateauMatrixCommandTest,NativeReflectionConfigTest'''
        - 'JAVA_HOME=$HOME/.sdkman/candidates/java/25.0.4-tem ./mvnw test-compile pmd:check'
      escalation_triggers:
        - 'W-1 lines in PlateauGroup or reflect-config.json would be lost by an edit: edit by anchors and diff before and after (RISK-4)'
        - 'the command needs a change under viewpoint/kernel: stop and log it'
      suggested_subagent_type: 'general-purpose'
      suggested_model: '(default)'
      suggested_effort: 'high'
    - task_id: task-004
      agent_role: 'Test Generation Agent'
      objective: 'Generate the cases file from the run, review the expected rows by eye against run 0206 (discovery.search, storefront.web, orders.history, orders.placement, accounts.profiles, commerce.cart, shop.app), then write the test with the live cross-check.'
      context:
        prd_excerpts:
          - 'none: there is no PRD (profile TDD+pln); the R-n of the TDD are listed with the TDD items'
        tdd_excerpts:
          - 'R-6'
          - 'R-8'
          - 'TG-2'
          - 'TG-3'
          - 'DEC-7'
          - 'CTR-1'
          - 'ASM-3'
          - 'ASM-4'
          - 'RISK-1'
          - 'RISK-2'
      likely_files:
        - 'src/test/resources/brightcart/matrix-cases.json'
        - 'src/test/java/io/morin/archicode/cli/PlateauMatrixCasesTest.java'
      acceptance_criteria:
        - 'matrix-cases.json holds the cases baseline inhouse marketplace (with its Span), baseline saas (no Span), baseline marketplace (a skip), and the refusals, in the shape of CTR-1'
        - 'the numbers in the file are written from the run, not from the TDD sentence'
        - 'the test runs the command in process and compares with the file, runs diff -f json for each pair, and checks that every cell equals the state diff gives the element and that the Span counts equal diff for the first and the last plateau (+38 ~3 -6, 11 moved, 2 split, 1 merged for marketplace against baseline)'
        - 'the command run twice gives the same bytes'
        - 'git diff --stat on src/main/rust, src/main/wasm and brightcart/expected prints nothing'
      verification:
        - 'JAVA_HOME=$HOME/.sdkman/candidates/java/25.0.4-tem ./mvnw test -Dtest=PlateauMatrixCasesTest'
        - 'git diff --stat -- src/main/rust src/main/wasm src/test/resources/brightcart/expected'
      escalation_triggers:
        - 'a cell disagrees with diff: the defect is in task-002, fix it there; the case file is never edited to match the code'
      suggested_subagent_type: 'general-purpose'
      suggested_model: '(default)'
      suggested_effort: 'high'
    - task_id: task-005
      agent_role: 'Test Generation Agent'
      objective: 'Follow the pattern of the other *IT classes that copy the layered Brightcart with Shipped.copy.'
      context:
        prd_excerpts:
          - 'none: there is no PRD (profile TDD+pln); the R-n of the TDD are listed with the TDD items'
        tdd_excerpts:
          - 'R-7'
          - 'IMP-4'
          - 'Observability and Verification'
      likely_files:
        - 'src/test/java/io/morin/archicode/it/PlateauMatrixIT.java'
      acceptance_criteria:
        - 'the IT runs plateau matrix on a copy of the layered Brightcart through the packaged jar, exit 0, the table on standard output'
        - '-o writes matrix.md and matrix.json and a sibling refusal is one error: line, exit 1'
      verification:
        - 'JAVA_HOME=$HOME/.sdkman/candidates/java/25.0.4-tem ./mvnw verify -DskipITs=false -Dit.test=PlateauMatrixIT -Dtest=NoSuchTest -Dsurefire.failIfNoSpecifiedTests=false'
      escalation_triggers:
        - 'the packaged application refuses what the in-process test accepted: log it as a finding against task-003'
      suggested_subagent_type: 'general-purpose'
      suggested_model: '(default)'
      suggested_effort: 'medium'
    - task_id: task-006
      agent_role: 'Documentation Agent'
      objective: 'Edit by anchors on top of W-1''s lines; regenerate the listing and the golden; write the manual section and the two short notes.'
      context:
        prd_excerpts:
          - 'none: there is no PRD (profile TDD+pln); the R-n of the TDD are listed with the TDD items'
        tdd_excerpts:
          - 'R-7'
          - 'CON-4'
          - 'CON-5'
          - 'CON-6'
          - 'DEC-1'
          - 'IMP-5'
          - 'CTR-2'
      likely_files:
        - 'src/doc/README.adoc'
        - 'src/test/resources/guide/golden.md'
        - 'src/test/java/io/morin/archicode/it/HelpIT.java'
        - 'src/main/java/io/morin/archicode/CLAUDE.md'
        - 'src/main/java/io/morin/archicode/workspace/CLAUDE.md'
      acceptance_criteria:
        - 'the generated command reference is regenerated with ARCHICODE_MANUAL_REGENERATE=1 and golden.md with archicode guide, and the diff of each holds only the new command beside W-1 lines'
        - 'a section [[plateau-matrix]] sits next to [[plateau-fold]] and says the Span is one comparison, the folder name, and that -o outside the views family below a /** path makes matrix.json read as a manifest'
        - 'HelpIT has the new line'
        - 'the CLAUDE.md paragraphs state what is true now: no wave, run or issue id, no date'
      verification:
        - 'JAVA_HOME=$HOME/.sdkman/candidates/java/25.0.4-tem ./mvnw test -Dtest=''CommandReferenceTest,GuideTest'''
        - 'grep -nE ''wave|run-0|#24|20[0-9]{2}-'' src/main/java/io/morin/archicode/CLAUDE.md src/main/java/io/morin/archicode/workspace/CLAUDE.md || true'
      escalation_triggers:
        - 'the generated listing moves for a command other than plateau matrix'
      suggested_subagent_type: 'general-purpose'
      suggested_model: '(default)'
      suggested_effort: 'medium'
    - task_id: task-007
      agent_role: 'Documentation Agent'
      objective: 'Add the component in the style of the neighbouring command elements, on top of the W-1 lines of the same file, then rebuild the sample.'
      context:
        prd_excerpts:
          - 'none: there is no PRD (profile TDD+pln); the R-n of the TDD are listed with the TDD items'
        tdd_excerpts:
          - 'R-7'
          - 'IMP-6'
          - 'CI-arc-1'
      likely_files:
        - 'docs/architecture/manifests/archicode.yaml'
        - 'src/test/javascript/architecture/impact-questions.json'
        - 'src/main/resources/editor-webapp/samples/archicode.yaml'
      acceptance_criteria:
        - 'a component plateau_matrix in the container commands with tags.path naming the two real classes and calls towards the viewpoint, workspace and rendering elements, and the rendering description gains matrix'
        - 'ArchitectureDriftTest and ArchitectureImpactTest pass; an impact question is changed only when its answer changes on purpose'
        - 'npm run sample:check exits 0 after npm run sample:build'
      verification:
        - 'JAVA_HOME=$HOME/.sdkman/candidates/java/25.0.4-tem ./mvnw test -Dtest=''ArchitectureDriftTest,ArchitectureImpactTest,ArchitectureModelTest'''
        - 'npm run sample:build && npm run sample:check'
      escalation_triggers:
        - 'an impact question changes in a way the run did not intend'
      suggested_subagent_type: 'general-purpose'
      suggested_model: '(default)'
      suggested_effort: 'medium'
    - task_id: task-008
      agent_role: 'QA Agent'
      objective: 'Run the gates from the repository root and record each exit code.'
      context:
        prd_excerpts:
          - 'none: there is no PRD (profile TDD+pln); the R-n of the TDD are listed with the TDD items'
        tdd_excerpts:
          - 'R-8'
          - 'CON-3'
          - 'CON-4'
          - 'Observability and Verification'
          - 'RISK-3'
      likely_files:
        - 'docs/wav/wav-033-import-structurizr-and-plateau-matrix/run/run-0225-plateau-matrix-file/prg-0225-plateau-matrix-file.md'
      acceptance_criteria:
        - 'every command exits 0, or the failure is named with its owning task'
        - 'scripts/byte-identity-exceptions.txt, src/main/rust, src/main/wasm and brightcart/expected are unchanged'
        - 'git status --short is the same before and after editor:build and sample:build'
        - 'the results block says the native image was not proved by this run'
      verification:
        - 'JAVA_HOME=$HOME/.sdkman/candidates/java/25.0.4-tem ./mvnw verify -DskipITs=false'
        - 'JAVA_HOME=$HOME/.sdkman/candidates/java/25.0.4-tem ./mvnw test-compile pmd:check'
        - 'scripts/byte-identity.sh'
        - 'npm run test:unit'
        - 'npm run format:check'
        - 'npm run lint'
        - 'npm run editor:build && npm run sample:build'
        - 'git diff --stat -- src/main/rust src/main/wasm src/test/resources/brightcart/expected scripts/byte-identity-exceptions.txt'
      escalation_triggers:
        - 'byte-identity needs a new exception or an existing command changes its output'
        - 'a command fails for a reason outside the matrix (a base already red): record it, do not fix it'
      suggested_subagent_type: 'general-purpose'
      suggested_model: '(default)'
      suggested_effort: 'high'
```

## 10. Verification Plan

```yaml
verification_plan:
  checks:
    - task_id: task-001
      methods:
        - 'JAVA_HOME=$HOME/.sdkman/candidates/java/25.0.4-tem ./mvnw -q -DskipTests package'
        - 'java -jar target/quarkus-app/quarkus-run.jar diff --plateau marketplace --against baseline -w src/test/resources/brightcart/layered/.archicode.yaml -f json'
        - 'git diff --stat -- src/main/java/io/morin/archicode/cli/ArchiCode.java src/main/resources/META-INF/native-image src/doc/README.adoc src/test/resources/guide/golden.md'
      success_criteria:
        - 'the Facts block says, for each of ASM-1 to ASM-4, true or false with the number seen'
        - 'the Facts block lists the lines W-1 left in each shared file so that later tasks edit by anchors'
        - 'the three Stage 5 corrections are written down for the tasks that apply them: every reflect-config entry is a class (NativeReflectionConfigTest), the default folder name must not read a views.path already of the form views-<plateau>, the derived path needs settings.current before any load'
    - task_id: task-002
      methods:
        - 'JAVA_HOME=$HOME/.sdkman/candidates/java/25.0.4-tem ./mvnw test -Dtest=PlateauMatrixTest'
      success_criteria:
        - 'PlateauMatrix is plain Java (records, no Picocli, no CDI) and takes presence sets and Comparison objects'
        - 'unit cases on small hand-made comparisons: a move in two steps, a split (two rows, same origin), a merge (one row, origins listed), a transient (empty Span), a removal, a new element'
        - 'a row with no change is left out and counted in unchanged'
        - 'MatrixReport.json keys are in the order of CTR-1 and the same input gives the same bytes'
        - 'the text cell words are -, =, new, changed, removed, moved from, split from, merged from'
    - task_id: task-003
      methods:
        - 'JAVA_HOME=$HOME/.sdkman/candidates/java/25.0.4-tem ./mvnw test -Dtest=''PlateauMatrixCommandTest,NativeReflectionConfigTest'''
        - 'JAVA_HOME=$HOME/.sdkman/candidates/java/25.0.4-tem ./mvnw test-compile pmd:check'
      success_criteria:
        - 'nothing is loaded or compared before the path is valid (MatrixPath reads the tree only)'
        - 'each refusal of IF-2 is one error: line, exit 1, no stack trace, nothing written: fewer than two plateaus, an unknown id, siblings (inhouse saas, saas inhouse marketplace), a plateau twice, --plateau with ids, -f with -o, a forked tree with neither ids nor --plateau, a workspace with no plateau'
        - 'with -o the folder is <path>-matrix-<first>-to-<last> (default path settings.views.path, without reading a views.path that is already views-<plateau>), holds matrix.md and matrix.json, one line wrote <folder> is printed, and reloading a /** workspace with the folder in place exits 0'
        - 'warnings go through Warnings and print when the command ends; standard output holds the table only'
        - 'every new class reflect-config.json needs is a class entry and NativeReflectionConfigTest passes'
        - 'PMD passes with no NOPMD'
    - task_id: task-004
      methods:
        - 'JAVA_HOME=$HOME/.sdkman/candidates/java/25.0.4-tem ./mvnw test -Dtest=PlateauMatrixCasesTest'
        - 'git diff --stat -- src/main/rust src/main/wasm src/test/resources/brightcart/expected'
      success_criteria:
        - 'matrix-cases.json holds the cases baseline inhouse marketplace (with its Span), baseline saas (no Span), baseline marketplace (a skip), and the refusals, in the shape of CTR-1'
        - 'the numbers in the file are written from the run, not from the TDD sentence'
        - 'the test runs the command in process and compares with the file, runs diff -f json for each pair, and checks that every cell equals the state diff gives the element and that the Span counts equal diff for the first and the last plateau (+38 ~3 -6, 11 moved, 2 split, 1 merged for marketplace against baseline)'
        - 'the command run twice gives the same bytes'
        - 'git diff --stat on src/main/rust, src/main/wasm and brightcart/expected prints nothing'
    - task_id: task-005
      methods:
        - 'JAVA_HOME=$HOME/.sdkman/candidates/java/25.0.4-tem ./mvnw verify -DskipITs=false -Dit.test=PlateauMatrixIT -Dtest=NoSuchTest -Dsurefire.failIfNoSpecifiedTests=false'
      success_criteria:
        - 'the IT runs plateau matrix on a copy of the layered Brightcart through the packaged jar, exit 0, the table on standard output'
        - '-o writes matrix.md and matrix.json and a sibling refusal is one error: line, exit 1'
    - task_id: task-006
      methods:
        - 'JAVA_HOME=$HOME/.sdkman/candidates/java/25.0.4-tem ./mvnw test -Dtest=''CommandReferenceTest,GuideTest'''
        - 'grep -nE ''wave|run-0|#24|20[0-9]{2}-'' src/main/java/io/morin/archicode/CLAUDE.md src/main/java/io/morin/archicode/workspace/CLAUDE.md || true'
      success_criteria:
        - 'the generated command reference is regenerated with ARCHICODE_MANUAL_REGENERATE=1 and golden.md with archicode guide, and the diff of each holds only the new command beside W-1 lines'
        - 'a section [[plateau-matrix]] sits next to [[plateau-fold]] and says the Span is one comparison, the folder name, and that -o outside the views family below a /** path makes matrix.json read as a manifest'
        - 'HelpIT has the new line'
        - 'the CLAUDE.md paragraphs state what is true now: no wave, run or issue id, no date'
    - task_id: task-007
      methods:
        - 'JAVA_HOME=$HOME/.sdkman/candidates/java/25.0.4-tem ./mvnw test -Dtest=''ArchitectureDriftTest,ArchitectureImpactTest,ArchitectureModelTest'''
        - 'npm run sample:build && npm run sample:check'
      success_criteria:
        - 'a component plateau_matrix in the container commands with tags.path naming the two real classes and calls towards the viewpoint, workspace and rendering elements, and the rendering description gains matrix'
        - 'ArchitectureDriftTest and ArchitectureImpactTest pass; an impact question is changed only when its answer changes on purpose'
        - 'npm run sample:check exits 0 after npm run sample:build'
    - task_id: task-008
      methods:
        - 'JAVA_HOME=$HOME/.sdkman/candidates/java/25.0.4-tem ./mvnw verify -DskipITs=false'
        - 'JAVA_HOME=$HOME/.sdkman/candidates/java/25.0.4-tem ./mvnw test-compile pmd:check'
        - 'scripts/byte-identity.sh'
        - 'npm run test:unit'
        - 'npm run format:check'
        - 'npm run lint'
        - 'npm run editor:build && npm run sample:build'
        - 'git diff --stat -- src/main/rust src/main/wasm src/test/resources/brightcart/expected scripts/byte-identity-exceptions.txt'
      success_criteria:
        - 'every command exits 0, or the failure is named with its owning task'
        - 'scripts/byte-identity-exceptions.txt, src/main/rust, src/main/wasm and brightcart/expected are unchanged'
        - 'git status --short is the same before and after editor:build and sample:build'
        - 'the results block says the native image was not proved by this run'
```

## 11. Escalation Rules

```yaml
escalation_rules:
  rules:
    - condition: 'An assumption of the TDD (ASM-1 to ASM-4) is false in a way that changes a decision'
      action: 'Stop the task, log it in the prg and let the main agent amend the TDD; a false ASM-3 only changes the test, as the TDD says'
    - condition: 'A cell of the matrix disagrees with diff'
      action: 'Fix PlateauMatrix; never edit matrix-cases.json to match the code'
    - condition: 'The change needs a line under src/main/rust, src/main/wasm, viewpoint/kernel or brightcart/expected'
      action: 'Stop and log: the wave forbids it'
    - condition: 'byte-identity.sh needs a new exception or an existing command changes its output'
      action: 'Stop and log: the matrix must not change another command'
    - condition: 'A command fails for a reason outside the matrix (a base that is already red)'
      action: 'Record it in the task and do not fix it'
    - condition: 'A task is flagged human_required or risk critical by a later edit'
      action: 'The wave has no autonomy override: the implement workflow stops with awaiting-human'
```

## 12. Final Execution Manifest

```yaml
execution_manifest:
  status: 'done'
  recommendation: 'proceed_with_review'
  autonomy_level: 'medium'
  total_tasks: 8
  autonomous_tasks: 6
  review_before_tasks: 0
  review_after_tasks: 2
  human_required_tasks: 0
  blocked_tasks: 0
  critical_path_tasks:
    - task-001
    - task-002
    - task-003
    - task-004
    - task-008
  parallel_groups:
    - parallel-group-001
  required_human_gates:
    - gate-001
  highest_risk_tasks:
    - task-002
    - task-003
    - task-004
  lowest_confidence_tasks:
    - task-004
    - task-002
    - task-003
  next_action: 'Start task-001: confirm the assumptions of the TDD on the layered Brightcart and read the lines W-1 left in the shared files'
  criteria:
    - 'The matrix agrees with diff on every cell and on the Span counts'
    - 'The refusals are one error: line each with nothing written'
    - 'The gates exit 0 and byte-identity needs no new exception'
    - 'The manual, the guide, the notes and the model say what the command does'
```
