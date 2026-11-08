---
title: Execution Plan — Import a LikeC4 JSON export
status: done
date: 2026-11-08
related:
  - docs/wav/wav-035-maven-builds-kernel-and-page-likec4-import/run/run-0233-likec4-json-import/tdd-0233-likec4-json-import.md
  - docs/wav/wav-035-maven-builds-kernel-and-page-likec4-import/wav-035-maven-builds-kernel-and-page-likec4-import.md
  - docs/wav/wav-034-diagrams-assets-likec4-matrix-page/run/run-0229-likec4-json-import/pln-0229-likec4-json-import.md
  - 'gh:tmorin/archicode#134'
type: pln
run: 0233
wave: 035
---

# Execution Plan: Import a LikeC4 JSON export

Profile TDD+pln: there is no PRD, so REQ-1 to REQ-9 are the IDs the TDD labels (section "PRD Traceability"), taken from issue #134, its author's decision and the P3 gate of wave 035. The TDD is the design (DEC-1 to DEC-10, IMP-1 to IMP-13, CTR-1 to CTR-4). The plan commits nothing: the commit is a human step outside it. Every Maven command runs with `JAVA_HOME=$HOME/.sdkman/candidates/java/25.0.4-tem` (the shell Java is 21).

The sample is already in the repository (commit `331f1d5`), so, unlike the plan of run 0229, no task runs the vendor tool or touches the sample; the three files stay as they are and several verifications check it.

The review of the TDD at Stage 5 found 11 points (F1 to F11) that the TDD text does not yet carry. The plan applies them as follows, and task-001 amends the TDD text to match, so the plan and the TDD agree before any code is written: F1 the goldens go to `src/test/resources/likec4-expected/` (workspace) and `src/test/resources/likec4-expected-report.txt`, outside `src/test/resources/likec4/`, so that the literal command of gate P3.1 prints nothing; F2 every new class, nested records included, is registered in `reflect-config.json`; F3 `--map` is a repeated `String` parsed by the service, never a Picocli `Map`; F4 the report has a count line of the dropped elements; F5 `navigateTo` and `notation` are reported as dropped parts and `specification` is read through the kinds of the elements and is not reported; F6 the fallback position and the collision suffix count the siblings of the export in file order, dropped ones included; F7 a `.likec4` name is refused as `.c4` is; F8 the list of refusals is stated once; F9 `Nesting` is read through `kindsHeldBy(Element)` and `kindsHeldAtTheTop(Parent)` on a bare instance built with the Lombok builder (`System.builder().id("s").build()`, `Application.builder().build()`, as `ManifestSchema` and `SolutionAndNestingTest` do), never through a copy of the table; F10 the array-of-projects shape is from the vendor source only, tested on a synthetic array; F11 the shared id helper keeps the exception of the Structurizr rule (CON-7).

Autonomy: no task is `human_required`, none has `risk: critical` or `human_review: required`, so no task stops for a human whether or not the launch carries the run's autonomy override (the wave's override, if any, is logged in the wave's progress log; a reader who sees a `review_after` task executed without a stop should read that log, not this plan). The tasks that carry some weight are `review_after`: task-002 (the move that must not change the Structurizr output) and task-005 (the command and the report); their independent verification runs at the elevated pair of the active profile, and the review is that verification and the author's reading of the pull request.

Tests by zone: a task lists only fast checks (one or a few test classes, PMD on the sources, a format or lint of the files it changes). The whole unit and integration suites, `scripts/byte-identity.sh`, `npm run test:unit`, `npm run test:coverage`, `npm run format:check`, `npm run lint`, the page build, and the gate commands of P3 run by hand on the packaged application (the sample into an empty folder with the eight `--map` options, `query graph`, the count of `dropped` lines, the `.c4` input, the non-empty folder, the sample with no `--map`) belong to the Verification Plan and run once at Stage 11 of `complete-run` or in the wave's phase gate; no task lists them.

## 1. Executive Summary

```yaml
summary:
  status: 'pending'
  product_goal: 'archicode import likec4 <model.json> --output <folder> turns the JSON written by likec4 export json into an ArchiCode workspace that loads, and says what it left out'
  technical_approach: 'Amend the TDD with the review findings, move the id rule, the output records and the service steps shared with the Structurizr importer into four small types without changing its output, then add a reader, a mapper and a service in the package importer behind a thin command in the group import, proved by the committed cloud-system sample, a golden output beside it, an integration test and an editor test'
  total_tasks: 9
  parallel_groups: 2
  high_risk_tasks: 0
  human_review_gates: 1
  autonomy_level: 'medium'
  recommendation: 'proceed_with_review'
  criteria:
    - 'The importer reads the committed sample and maps it into a workspace that the command line and the editor load, with 21 elements written and the 6 that the nesting cannot hold dropped, each with a warning'
    - 'A .c4 or .likec4 input, a non-empty output folder and a kind with no target and no --map are each one error: line, exit 1, nothing written, and --map for each listed kind exits 0'
    - 'The warnings name every dropped part present, the count of dropped elements and every rewritten id'
    - 'import structurizr writes the same bytes as before and scripts/byte-identity.sh needs no new exception'
    - 'The sample files are unchanged since 331f1d5'
    - 'PMD, verify with the integration tests, the node tests, format, lint, the page build and sample:build all pass at Stage 11'
    - 'The manual, the guide, the command-line notes and the model of ArchiCode say what the command does'
```

## 2. PRD/TDD Consistency Assessment

```yaml
consistency_assessment:
  aligned_items:
    - 'REQ-1 to REQ-9 each map to at least one DEC and one IMP of the TDD, and each to a task below'
    - 'The gate criteria of phase P3 (1 to 6) are the verification of task-001, task-006, task-007 and the Verification Plan'
    - 'The reader, mapper and service of the TDD are the split of task-003 to task-005; the move of DEC-3 is task-002'
  gaps:
    - id: gap-001
      type: 'contradiction'
      description: 'The TDD plans the goldens under src/test/resources/likec4/expected/, which makes the literal command of gate P3.1 print a diff (review F1)'
      impact: 'high'
      recommendation: 'Goldens in src/test/resources/likec4-expected/ and likec4-expected-report.txt; task-001 amends the TDD, tasks 006 and 007 use the sibling path'
    - id: gap-002
      type: 'contradiction'
      description: 'IMP-7, CTR-4 and RISK-4 say no reflection entry is needed for records, but NativeReflectionConfigTest registers every class, nested records included (review F2)'
      impact: 'medium'
      recommendation: 'Task-005 registers every class the test asks for; task-001 corrects the TDD'
    - id: gap-003
      type: 'ambiguity'
      description: 'The TDD leaves --map open between a Picocli Map and a repeated String, and a Map cannot give the sentences of DEC-4 (review F3)'
      impact: 'medium'
      recommendation: 'Repeated String parsed by the service (task-004, task-005)'
    - id: gap-004
      type: 'missing_technical_design'
      description: 'Gate 2 subtracts the number the report says were dropped, but DEC-8 prints lines and no count; navigateTo, notation and specification are in the sample and silent (review F4, F5)'
      impact: 'medium'
      recommendation: 'A count line of dropped elements; navigateTo and notation reported; specification read through the kinds and not reported'
    - id: gap-005
      type: 'ambiguity'
      description: 'The numbering of fallback ids and the suffixes when some siblings are dropped, the .likec4 source extension, the way Nesting is read, and the space exception of the Structurizr id rule are not decided (review F6, F7, F9, F11)'
      impact: 'low'
      recommendation: 'Decided in the overview above; task-001 records the exception found in StructurizrMapper (a space is turned to _ and is not a rewrite) and task-002 reads it from the code and keeps it'
    - id: gap-006
      type: 'risk'
      description: 'The golden joins the shipped corpus, so literal counts and MistakeSweepTest may move (RISK-5)'
      impact: 'medium'
      recommendation: 'Task-001 greps the literals; task-006 updates them and handles the sweep'
    - id: gap-007
      type: 'risk'
      description: 'docs/architecture/manifests/archicode.yaml, the manual, src/test/CLAUDE.md and the harness carry or move edits of other waves (RISK-8, CON-9)'
      impact: 'low'
      recommendation: 'Each of tasks 006 to 009 reads the file as it is and touches only its own lines'
    - id: gap-008
      type: 'risk'
      description: 'The Native job of CI does not run on a branch, so the reflection entries are proved only by NativeReflectionConfigTest here (RISK-4)'
      impact: 'low'
      recommendation: 'The hand-off says the native image was not proved on the branch'
  blocking_gaps: []
```

## 3. Execution Graph

```yaml
execution_graph:
  nodes:
    - id: task-001
      status: 'done'
      title: 'Preflight: read the files as they are, amend the TDD with the review findings, record the facts the later tasks read'
      depends_on: []
      produces:
        - 'docs/wav/wav-035-maven-builds-kernel-and-page-likec4-import/run/run-0233-likec4-json-import/tdd-0233-likec4-json-import.md'
        - 'a Facts block appended to the Log of docs/wav/wav-035-maven-builds-kernel-and-page-likec4-import/run/run-0233-likec4-json-import/prg-0233-likec4-json-import.md'
      agent_role: 'Documentation Agent'
      autonomy: 'autonomous'
      risk: 'low'
      confidence: 85
    - id: task-002
      status: 'done'
      title: 'Shared part moved: ImportIds, ImportSupport, Planned and WorkspaceFile, called by the Structurizr importer, its output unchanged'
      depends_on: []
      produces:
        - 'src/main/java/io/morin/archicode/importer/ImportIds.java'
        - 'src/main/java/io/morin/archicode/importer/ImportSupport.java'
        - 'src/main/java/io/morin/archicode/importer/Planned.java'
        - 'src/main/java/io/morin/archicode/importer/WorkspaceFile.java'
        - 'src/main/java/io/morin/archicode/importer/StructurizrMapper.java'
        - 'src/main/java/io/morin/archicode/importer/StructurizrImportService.java'
        - 'src/test/java/io/morin/archicode/importer/ImportIdsTest.java'
        - 'src/test/java/io/morin/archicode/importer/StructurizrMapperTest.java'
      agent_role: 'Refactoring Agent'
      autonomy: 'review_after'
      risk: 'medium'
      confidence: 80
    - id: task-003
      status: 'done'
      title: 'Reader and model: LikeC4 JSON to LikeC4Model and counted Dropped, project selection and the sentences of the refusals'
      depends_on: [task-001]
      produces:
        - 'src/main/java/io/morin/archicode/importer/LikeC4Model.java'
        - 'src/main/java/io/morin/archicode/importer/LikeC4Reader.java'
        - 'src/test/java/io/morin/archicode/importer/LikeC4ReaderTest.java'
      agent_role: 'Backend Implementation Agent'
      autonomy: 'autonomous'
      risk: 'medium'
      confidence: 75
    - id: task-004
      status: 'done'
      title: 'Mapper: kinds with --map, nesting check, ids and references, relationships, Planned manifests and the workspace file'
      depends_on: [task-002, task-003]
      produces:
        - 'src/main/java/io/morin/archicode/importer/LikeC4Mapper.java'
        - 'src/test/java/io/morin/archicode/importer/LikeC4MapperTest.java'
      agent_role: 'Backend Implementation Agent'
      autonomy: 'autonomous'
      risk: 'medium'
      confidence: 70
    - id: task-005
      status: 'done'
      title: 'Service, command, group, report and native reflection'
      depends_on: [task-004]
      produces:
        - 'src/main/java/io/morin/archicode/importer/LikeC4ImportService.java'
        - 'src/main/java/io/morin/archicode/cli/ImportLikeC4Command.java'
        - 'src/main/java/io/morin/archicode/cli/ImportGroup.java'
        - 'src/main/resources/META-INF/native-image/io.morin.archicode/archicode/reflect-config.json'
        - 'src/test/java/io/morin/archicode/importer/LikeC4ImportServiceTest.java'
      agent_role: 'Backend Implementation Agent'
      autonomy: 'review_after'
      risk: 'medium'
      confidence: 75
    - id: task-006
      status: 'done'
      title: 'Golden output: the workspace written from the sample, the report, the golden test, and the shipped-corpus counts it moves'
      depends_on: [task-005]
      produces:
        - 'src/test/resources/likec4-expected/'
        - 'src/test/resources/likec4-expected-report.txt'
        - 'src/test/java/io/morin/archicode/importer/LikeC4GoldenTest.java'
        - 'the literal counts of shipped workspaces and manifests found by task-001, updated'
        - 'src/test/resources/known-traces.json (only an entry with case, issue and reason, if MistakeSweepTest needs one and an issue tracks it)'
      agent_role: 'Test Generation Agent'
      autonomy: 'autonomous'
      risk: 'medium'
      confidence: 70
    - id: task-007
      status: 'done'
      title: 'Integration test on the packaged application and the editor test on the golden'
      depends_on: [task-006]
      produces:
        - 'src/test/java/io/morin/archicode/it/LikeC4ImportIT.java'
        - 'src/test/javascript/viewpoint-kernel/likec4-import-workspace.test.js'
      agent_role: 'Test Generation Agent'
      autonomy: 'autonomous'
      risk: 'medium'
      confidence: 70
    - id: task-008
      status: 'done'
      title: 'Help and guide goldens, the manual and the notes for the next session'
      depends_on: [task-007]
      produces:
        - 'src/test/resources/guide/golden.md'
        - 'src/test/java/io/morin/archicode/it/HelpIT.java'
        - 'src/doc/README.adoc'
        - 'src/main/java/io/morin/archicode/CLAUDE.md'
        - 'src/test/CLAUDE.md'
        - 'src/test/javascript/manual-anchors.json (only if the new anchor needs an entry)'
      agent_role: 'Documentation Agent'
      autonomy: 'autonomous'
      risk: 'low'
      confidence: 80
    - id: task-009
      status: 'done'
      title: 'The model of ArchiCode and its sample bundle'
      depends_on: [task-005]
      produces:
        - 'docs/architecture/manifests/archicode.yaml'
        - 'src/test/javascript/architecture/impact-questions.json (only if a question changes)'
        - 'the sample bundle that npm run sample:build writes, wherever the wave that moves it puts it'
      agent_role: 'Documentation Agent'
      autonomy: 'autonomous'
      risk: 'medium'
      confidence: 70
  edges:
    - from: task-001
      to: task-003
      reason: 'task 003 needs the output of task 001'
    - from: task-002
      to: task-004
      reason: 'task 004 needs the output of task 002'
    - from: task-003
      to: task-004
      reason: 'task 004 needs the output of task 003'
    - from: task-004
      to: task-005
      reason: 'task 005 needs the output of task 004'
    - from: task-005
      to: task-006
      reason: 'task 006 needs the output of task 005'
    - from: task-006
      to: task-007
      reason: 'task 007 needs the output of task 006'
    - from: task-007
      to: task-008
      reason: 'task 008 needs the output of task 007'
    - from: task-005
      to: task-009
      reason: 'task 009 needs the output of task 005'
```

## 4. Task Catalog

```yaml
task_catalog:
  tasks:
    - id: task-001
      title: 'Preflight: read the files as they are, amend the TDD with the review findings, record the facts the later tasks read'
      source_requirements:
        prd:
          - 'none: there is no PRD (profile TDD+pln); the REQ-n of the TDD are listed with the TDD items'
        tdd:
          - 'REQ-1'
          - 'REQ-9'
          - 'DEC-1'
          - 'DEC-4'
          - 'DEC-5'
          - 'DEC-8'
          - 'DEC-9'
          - 'DEC-10'
          - 'IMP-5'
          - 'IMP-7'
          - 'IMP-8'
          - 'CTR-1'
          - 'CTR-4'
          - 'CON-7'
          - 'CON-9'
          - 'RISK-5'
          - 'RISK-8'
          - 'Q-2'
      outputs:
        - 'docs/wav/wav-035-maven-builds-kernel-and-page-likec4-import/run/run-0233-likec4-json-import/tdd-0233-likec4-json-import.md'
        - 'a Facts block appended to the Log of docs/wav/wav-035-maven-builds-kernel-and-page-likec4-import/run/run-0233-likec4-json-import/prg-0233-likec4-json-import.md'
      verification:
        - 'git diff 331f1d5 HEAD --stat -- src/test/resources/likec4/cloud-system.json src/test/resources/likec4/LICENSE src/test/resources/likec4/PROVENANCE.md'
        - 'jq ''.elements | length'' src/test/resources/likec4/cloud-system.json'
        - 'grep -c ''likec4-expected'' docs/wav/wav-035-maven-builds-kernel-and-page-likec4-import/run/run-0233-likec4-json-import/tdd-0233-likec4-json-import.md'
        - '! grep -n ''likec4/expected'' docs/wav/wav-035-maven-builds-kernel-and-page-likec4-import/run/run-0233-likec4-json-import/tdd-0233-likec4-json-import.md'
        - 'grep -c ''Facts'' docs/wav/wav-035-maven-builds-kernel-and-page-likec4-import/run/run-0233-likec4-json-import/prg-0233-likec4-json-import.md'
      risk: 'low'
      confidence: 85
      human_review: 'none'
      escalation_triggers:
        - 'The sample differs from the one of commit 331f1d5 or its element count is not the number the TDD names: stop and log; the sample is never regenerated or edited'
        - 'The id rule of StructurizrMapper has behaviour the TDD does not know beyond the space exception (isIdCharacter and replacesCharacter in StructurizrMapper): log it in the Facts block; task-002 reads the code and parametrizes the helper by itself'
        - 'A resolution needs a product decision beyond these eleven: log it as a finding and keep the TDD as it was on that point'
      delegation_tier: 'standard'
      results: 'tier standard, model sonnet, effort medium, profile low-cost, passed first time, inline (leaf), independently verified'
    - id: task-002
      title: 'Shared part moved: ImportIds, ImportSupport, Planned and WorkspaceFile, called by the Structurizr importer, its output unchanged'
      source_requirements:
        prd:
          - 'none: there is no PRD (profile TDD+pln); the REQ-n of the TDD are listed with the TDD items'
        tdd:
          - 'REQ-5'
          - 'REQ-9'
          - 'TG-4'
          - 'DEC-3'
          - 'IMP-2'
          - 'IMP-13'
          - 'CTR-4'
          - 'CON-7'
          - 'CON-1'
          - 'IMP-4'
          - 'RISK-3'
      outputs:
        - 'src/main/java/io/morin/archicode/importer/ImportIds.java'
        - 'src/main/java/io/morin/archicode/importer/ImportSupport.java'
        - 'src/main/java/io/morin/archicode/importer/Planned.java'
        - 'src/main/java/io/morin/archicode/importer/WorkspaceFile.java'
        - 'src/main/java/io/morin/archicode/importer/StructurizrMapper.java'
        - 'src/main/java/io/morin/archicode/importer/StructurizrImportService.java'
        - 'src/test/java/io/morin/archicode/importer/ImportIdsTest.java'
        - 'src/test/java/io/morin/archicode/importer/StructurizrMapperTest.java'
      verification:
        - 'JAVA_HOME=$HOME/.sdkman/candidates/java/25.0.4-tem ./mvnw -q test -Dtest=''ImportIdsTest,Structurizr*Test,ImportFilesTest'''
        - 'JAVA_HOME=$HOME/.sdkman/candidates/java/25.0.4-tem ./mvnw -q test-compile pmd:check'
        - 'git diff --stat -- src/test/resources/structurizr'
      risk: 'medium'
      confidence: 80
      human_review: 'after'
      escalation_triggers:
        - 'A Structurizr golden or the Structurizr report needs an edit to pass: stop, the move must not change the output'
        - 'A caller outside importer/ reads the nested records: log it and keep a compatible access, do not edit that caller beyond the import'
        - 'PMD names a rule that the ruleset does not allow: fix the code, never add a NOPMD'
      delegation_tier: 'standard'
      results: 'tier standard, model sonnet, effort medium, profile low-cost, passed first time, inline (leaf), independently verified'
    - id: task-003
      title: 'Reader and model: LikeC4 JSON to LikeC4Model and counted Dropped, project selection and the sentences of the refusals'
      source_requirements:
        prd:
          - 'none: there is no PRD (profile TDD+pln); the REQ-n of the TDD are listed with the TDD items'
        tdd:
          - 'REQ-2'
          - 'REQ-7'
          - 'TG-1'
          - 'DEC-2'
          - 'DEC-8'
          - 'DEC-9'
          - 'CTR-1'
          - 'ASM-1'
          - 'ASM-2'
          - 'CON-3'
          - 'IMP-4'
          - 'RISK-1'
      outputs:
        - 'src/main/java/io/morin/archicode/importer/LikeC4Model.java'
        - 'src/main/java/io/morin/archicode/importer/LikeC4Reader.java'
        - 'src/test/java/io/morin/archicode/importer/LikeC4ReaderTest.java'
      verification:
        - 'JAVA_HOME=$HOME/.sdkman/candidates/java/25.0.4-tem ./mvnw -q test -Dtest=''LikeC4ReaderTest'''
        - 'JAVA_HOME=$HOME/.sdkman/candidates/java/25.0.4-tem ./mvnw -q test-compile pmd:check'
      risk: 'medium'
      confidence: 75
      human_review: 'none'
      escalation_triggers:
        - 'The sample does not hold a key the reader needs (ASM-1): stop and log the key, never edit the sample'
        - 'A Jackson feature the native image cannot use is needed: use the JsonNode tree instead'
      delegation_tier: 'standard'
      results: 'tier standard, model sonnet, effort medium, profile low-cost, passed first time, inline (leaf), independently verified'
    - id: task-004
      title: 'Mapper: kinds with --map, nesting check, ids and references, relationships, Planned manifests and the workspace file'
      source_requirements:
        prd:
          - 'none: there is no PRD (profile TDD+pln); the REQ-n of the TDD are listed with the TDD items'
        tdd:
          - 'REQ-2'
          - 'REQ-3'
          - 'REQ-7'
          - 'TG-2'
          - 'TG-3'
          - 'DEC-3'
          - 'DEC-4'
          - 'DEC-5'
          - 'DEC-6'
          - 'DEC-10'
          - 'CTR-2'
          - 'ASM-3'
          - 'ASM-5'
          - 'ASM-6'
          - 'IMP-4'
          - 'RISK-2'
          - 'RISK-6'
      outputs:
        - 'src/main/java/io/morin/archicode/importer/LikeC4Mapper.java'
        - 'src/test/java/io/morin/archicode/importer/LikeC4MapperTest.java'
      verification:
        - 'JAVA_HOME=$HOME/.sdkman/candidates/java/25.0.4-tem ./mvnw -q test -Dtest=''LikeC4MapperTest,LikeC4ReaderTest,ImportIdsTest'''
        - 'JAVA_HOME=$HOME/.sdkman/candidates/java/25.0.4-tem ./mvnw -q test-compile pmd:check'
      risk: 'medium'
      confidence: 70
      human_review: 'none'
      escalation_triggers:
        - 'The golden mapping does not give 21 and 6 (DEC-9): stop and log the real numbers; the TDD and the gate wording are then amended in the Facts block before the golden is written'
        - 'Nesting cannot be read on a bare builder instance without a change under resource/: log it and stop the task; Nesting is never edited here'
        - 'The loader refuses a manifest that the mapper writes: fix the mapper, never the loader'
      delegation_tier: 'standard'
      results: 'tier standard, model sonnet, effort medium, profile low-cost, passed first time, inline (leaf), independently verified'
    - id: task-005
      title: 'Service, command, group, report and native reflection'
      source_requirements:
        prd:
          - 'none: there is no PRD (profile TDD+pln); the REQ-n of the TDD are listed with the TDD items'
        tdd:
          - 'REQ-2'
          - 'REQ-3'
          - 'REQ-4'
          - 'DEC-1'
          - 'DEC-2'
          - 'DEC-4'
          - 'DEC-7'
          - 'DEC-8'
          - 'DEC-10'
          - 'IMP-1'
          - 'IMP-3'
          - 'IMP-7'
          - 'CTR-3'
          - 'IF-1'
          - 'IF-2'
          - 'FLOW-1'
          - 'CON-2'
          - 'CON-3'
          - 'ASM-4'
          - 'CON-8'
          - 'IMP-4'
          - 'RISK-4'
      outputs:
        - 'src/main/java/io/morin/archicode/importer/LikeC4ImportService.java'
        - 'src/main/java/io/morin/archicode/cli/ImportLikeC4Command.java'
        - 'src/main/java/io/morin/archicode/cli/ImportGroup.java'
        - 'src/main/resources/META-INF/native-image/io.morin.archicode/archicode/reflect-config.json'
        - 'src/test/java/io/morin/archicode/importer/LikeC4ImportServiceTest.java'
      verification:
        - 'JAVA_HOME=$HOME/.sdkman/candidates/java/25.0.4-tem ./mvnw -q test -Dtest=''LikeC4ImportServiceTest,NativeReflectionConfigTest,LikeC4MapperTest,Structurizr*Test'''
        - 'JAVA_HOME=$HOME/.sdkman/candidates/java/25.0.4-tem ./mvnw -q test-compile pmd:check'
        - 'grep -c LikeC4 src/main/resources/META-INF/native-image/io.morin.archicode/archicode/reflect-config.json'
      risk: 'medium'
      confidence: 75
      human_review: 'after'
      escalation_triggers:
        - 'NativeReflectionConfigTest asks for an entry that cannot be written: log it, the Native job of the pull request is then the proof'
        - 'The binding of the repeated --map option cannot give the sentences of DEC-4: keep the raw strings and parse them in the service'
        - 'HelpIT or GuideTest fail here: they are task-008''s, do not fix them in this task'
      delegation_tier: 'standard'
      results: 'tier standard, model sonnet, effort medium, profile low-cost, passed first time, inline (leaf), independently verified'
    - id: task-006
      title: 'Golden output: the workspace written from the sample, the report, the golden test, and the shipped-corpus counts it moves'
      source_requirements:
        prd:
          - 'none: there is no PRD (profile TDD+pln); the REQ-n of the TDD are listed with the TDD items'
        tdd:
          - 'REQ-2'
          - 'REQ-4'
          - 'TG-5'
          - 'DEC-8'
          - 'DEC-9'
          - 'DEC-10'
          - 'IMP-5'
          - 'CON-4'
          - 'CON-5'
          - 'RISK-5'
      outputs:
        - 'src/test/resources/likec4-expected/'
        - 'src/test/resources/likec4-expected-report.txt'
        - 'src/test/java/io/morin/archicode/importer/LikeC4GoldenTest.java'
        - 'the literal counts of shipped workspaces and manifests found by task-001, updated'
        - 'src/test/resources/known-traces.json (only an entry with case, issue and reason, if MistakeSweepTest needs one and an issue tracks it)'
      verification:
        - 'JAVA_HOME=$HOME/.sdkman/candidates/java/25.0.4-tem ./mvnw -q test -Dtest=''LikeC4GoldenTest,ShippedFilesTest,ManifestSchemaCorpusTest,ManifestRoundTripCorpusTest,MistakeSweepTest'''
        - 'node --test src/test/javascript/viewpoint-kernel/shipped-files.test.js'
        - 'git diff 331f1d5 HEAD --stat -- src/test/resources/likec4/cloud-system.json src/test/resources/likec4/LICENSE src/test/resources/likec4/PROVENANCE.md'
      risk: 'medium'
      confidence: 70
      human_review: 'none'
      escalation_triggers:
        - 'The golden does not hold 21 elements and 6 drops: stop and log the numbers (see task-004)'
        - 'A trace whose cause is not the importer needs an entry of known-traces.json with case, issue and reason: no issue is created here, so log the trace as a finding and report it as a blocker if no issue tracks it; one whose cause is the importer goes back to the mapper'
        - 'A count in a test or in a CLAUDE.md moves by a number other than the golden''s manifests: log it'
      delegation_tier: 'standard'
      results: 'tier standard, model sonnet, effort medium, profile low-cost, passed first time, inline (leaf), independently verified'
    - id: task-007
      title: 'Integration test on the packaged application and the editor test on the golden'
      source_requirements:
        prd:
          - 'none: there is no PRD (profile TDD+pln); the REQ-n of the TDD are listed with the TDD items'
        tdd:
          - 'REQ-2'
          - 'REQ-3'
          - 'REQ-4'
          - 'DEC-4'
          - 'DEC-10'
          - 'IMP-6'
          - 'CON-9'
          - 'IF-3'
          - 'RISK-4'
      outputs:
        - 'src/test/java/io/morin/archicode/it/LikeC4ImportIT.java'
        - 'src/test/javascript/viewpoint-kernel/likec4-import-workspace.test.js'
      verification:
        - 'node --test src/test/javascript/viewpoint-kernel/likec4-import-workspace.test.js'
        - 'JAVA_HOME=$HOME/.sdkman/candidates/java/25.0.4-tem ./mvnw -q test-compile pmd:check'
        - 'git diff --stat -- src/main/rust src/main/editor'
      risk: 'medium'
      confidence: 70
      human_review: 'none'
      escalation_triggers:
        - 'The editor shows a mistake on the golden: the importer is wrong, fix the mapper (task-004) and regenerate the golden, never the editor'
        - 'The harness moved and the pattern of structurizr-import-workspace.test.js no longer loads: read how that test loads now and follow it'
      delegation_tier: 'standard'
      results: 'tier standard, model sonnet, effort medium, profile low-cost, passed first time, inline (leaf), independently verified'
    - id: task-008
      title: 'Help and guide goldens, the manual and the notes for the next session'
      source_requirements:
        prd:
          - 'none: there is no PRD (profile TDD+pln); the REQ-n of the TDD are listed with the TDD items'
        tdd:
          - 'REQ-6'
          - 'REQ-8'
          - 'DEC-1'
          - 'DEC-4'
          - 'DEC-5'
          - 'DEC-8'
          - 'IMP-9'
          - 'IMP-10'
          - 'IMP-11'
          - 'CON-6'
          - 'RISK-7'
          - 'RISK-8'
      outputs:
        - 'src/test/resources/guide/golden.md'
        - 'src/test/java/io/morin/archicode/it/HelpIT.java'
        - 'src/doc/README.adoc'
        - 'src/main/java/io/morin/archicode/CLAUDE.md'
        - 'src/test/CLAUDE.md'
        - 'src/test/javascript/manual-anchors.json (only if the new anchor needs an entry)'
      verification:
        - 'JAVA_HOME=$HOME/.sdkman/candidates/java/25.0.4-tem ./mvnw -q test -Dtest=''GuideTest,CommandReferenceTest'''
        - 'node --test src/test/javascript/manual-skeleton.test.js'
        - 'grep -c ''import-likec4'' src/doc/README.adoc'
        - '! grep -nE ''wave [0-9]+|run [0-9]{4}|#134'' src/main/java/io/morin/archicode/CLAUDE.md'
        - '! grep -nE ''wave [0-9]+|run [0-9]{4}|#134'' src/test/CLAUDE.md'
      risk: 'low'
      confidence: 80
      human_review: 'none'
      escalation_triggers:
        - 'The guide golden differs by more than the new command: stop and log, do not accept an unrelated diff'
        - 'The manual''s skeleton test needs an anchor entry: add it to manual-anchors.json'
      delegation_tier: 'standard'
      results: 'tier standard, model sonnet, effort medium, profile low-cost, passed first time, inline (leaf), independently verified'
    - id: task-009
      title: 'The model of ArchiCode and its sample bundle'
      source_requirements:
        prd:
          - 'none: there is no PRD (profile TDD+pln); the REQ-n of the TDD are listed with the TDD items'
        tdd:
          - 'REQ-6'
          - 'REQ-8'
          - 'IMP-12'
          - 'RISK-8'
      outputs:
        - 'docs/architecture/manifests/archicode.yaml'
        - 'src/test/javascript/architecture/impact-questions.json (only if a question changes)'
        - 'the sample bundle that npm run sample:build writes, wherever the wave that moves it puts it'
      verification:
        - 'JAVA_HOME=$HOME/.sdkman/candidates/java/25.0.4-tem ./mvnw -q test -Dtest=''ArchitectureDriftTest,ArchitectureImpactTest'''
        - 'grep -c ''import_likec4'' docs/architecture/manifests/archicode.yaml'
        - 'node --test src/test/javascript/viewpoint-kernel/build-sample-script.test.js'
        - 'git diff --stat -- src/main/rust src/main/editor'
      risk: 'medium'
      confidence: 70
      human_review: 'none'
      escalation_triggers:
        - 'A tags.path names a file that does not exist: fix the path, never the test'
        - 'The sample bundle is written to a path another wave has moved or removed: read scripts/build-sample.mjs and follow it, log where it wrote'
        - 'archicode.yaml has edits in the lines of the importer that are not this run''s: leave them and log'
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
      reason: 'The preflight (the TDD text and the run prg) and the move of the shared part (the package importer and its tests) share no file'
      conflict_risks:
        - 'task-001 reads StructurizrMapper that task-002 edits; it only reads it, and its Facts block is about the id-rule exception, which task-002 reads from the code itself'
    - id: parallel-group-002
      tasks:
        - task-006
        - task-009
      reason: 'The golden and its corpus counts (src/test) and the model of ArchiCode with its sample bundle (docs/architecture) touch disjoint paths'
      conflict_risks:
        - 'task-009 runs npm run sample:build, which writes the bundle of the editor; task-006 does not read it'
        - 'task-008 waits for task-007 because both touch the tests of the command line and src/test/CLAUDE.md that task-006 also edits'
```

## 6. Human Review Gates

```yaml
human_review_gates:
  gates:
    - id: gate-001
      trigger: 'The run moves code shared with a shipped command (task-002) and adds a public command with its report (task-005)'
      required_before: []
      required_after: ['task-005']
      reviewer_focus:
        - 'that the Structurizr goldens and scripts/byte-identity-exceptions.txt are untouched'
        - 'the kinds of --map, the sentence for a .c4 input, and the list of what the report says is dropped'
        - 'that dropping the elements the nesting cannot hold (DEC-5) is the behaviour wanted, since six of 27 elements of the sample are lost under the golden mapping'
```

The gate does not stop the run: no task is `human_required`. The review is the independent verification of the tasks it covers and the author's reading of the pull request.

## 7. Risk Assessment

```yaml
risk_assessment:
  by_task:
    - id: task-001
      risk: 'low'
      rationale: 'Documentation and reading only; the one risk is a TDD edit that drifts from the review.'
    - id: task-002
      risk: 'medium'
      rationale: 'It edits a shipped importer (RISK-3); the Structurizr goldens, left unedited, are the guard.'
    - id: task-003
      risk: 'medium'
      rationale: 'Pure code on a third-party shape, fixed by the sample.'
    - id: task-004
      risk: 'medium'
      rationale: 'The densest logic of the run and the one that decides which of the author''s elements are written.'
    - id: task-005
      risk: 'medium'
      rationale: 'A new public command and the one place where a missing reflection entry fails only natively.'
    - id: task-006
      risk: 'medium'
      rationale: 'The golden joins the shipped corpus, so it moves counts and sweeps in tests it does not own (RISK-5).'
    - id: task-007
      risk: 'medium'
      rationale: 'Tests only, but one of them rests on the harness that another wave moves.'
    - id: task-008
      risk: 'low'
      rationale: 'Documentation and goldens regenerated from the code.'
    - id: task-009
      risk: 'medium'
      rationale: 'The file carries uncommitted edits of other work (RISK-8); the drift tests catch a wrong path.'
  by_area:
    - area: 'api'
      risk: 'medium'
      rationale: 'A new public command and a report whose sentences the manual and the gates fix; no existing command changes its output'
    - area: 'data'
      risk: 'medium'
      rationale: 'The importer drops part of an author model by a rule (DEC-5); each drop is one line with its cause'
    - area: 'security'
      risk: 'low'
      rationale: 'The input is untrusted but nothing in it is executed and every file name passes through the id rewrite'
    - area: 'infra'
      risk: 'low'
      rationale: 'The native image is not proved on a branch; NativeReflectionConfigTest is the guard'
    - area: 'docs'
      risk: 'low'
      rationale: 'The manual, the notes and the model follow the code and are checked by tests'
```

## 8. Confidence Assessment

```yaml
confidence_assessment:
  by_task:
    - id: task-001
      score: 85
      rationale: 'The resolutions are listed and the checks are greps.'
    - id: task-002
      score: 80
      rationale: 'A move guarded by byte-for-byte goldens; the id-rule exception is the one unknown.'
    - id: task-003
      score: 75
      rationale: 'The shape is read from the sample; the array shape is from the vendor source only.'
    - id: task-004
      score: 70
      rationale: 'Six elements are dropped by a rule the sample forced; the numbers are computed, not yet seen.'
    - id: task-005
      score: 75
      rationale: 'Same seam as the Structurizr importer; the Native job is not run on a branch.'
    - id: task-006
      score: 70
      rationale: 'The numbers are computed but unseen, and the sweep may need an entry.'
    - id: task-007
      score: 70
      rationale: 'Two patterns exist; the IT cannot be run in the task.'
    - id: task-008
      score: 80
      rationale: 'Mechanical, with tests that name the failure.'
    - id: task-009
      score: 70
      rationale: 'The model is small; where the bundle lands depends on another wave.'
```

## 9. Agent Assignment Plan

```yaml
agent_assignment_plan:
  assignments:
    - task_id: task-001
      agent_role: 'Documentation Agent'
      objective: 'Read the sample, PROVENANCE.md, Nesting, ImportGroup, StructurizrMapper (its id rule, including any exception for a space or another character) and StructurizrImportService as they are in the working tree (other waves leave edits there), and grep src/test and the CLAUDE.md files for literal counts of shipped workspaces or manifests (RISK-5). Amend the TDD text, and only its text, so that it states the resolutions of the review of Stage 5 that the plan applies: (1) the golden workspace is src/test/resources/likec4-expected/ and the report src/test/resources/likec4-expected-report.txt, outside src/test/resources/likec4/, so that the literal command of gate P3.1 prints nothing; (2) NativeReflectionConfigTest registers every class including nested records, so IMP-7, CTR-4 and RISK-4 are corrected; (3) --map is a repeated String (List<String>) parsed by the service, never a Picocli Map; (4) the report has a count line for the dropped elements; (5) navigateTo and notation are reported as dropped parts and specification is stated as read through the kinds of the elements and not reported; (6) the fallback position and the collision suffix count the siblings of the export in file order, dropped ones included; (7) a name ending in .likec4 is refused as .c4 is; (8) the list of refusals is stated once (IF-2) and the DECs point to it; (9) the mapper reads Nesting through kindsHeldBy(Element) and kindsHeldAtTheTop(Parent) on a bare instance built with the builder of the target class (System.builder().id("s").build(), Application.builder().build(): both methods take an instance, there is no static table to read), never through a copy of the table; (10) the array-of-projects shape is from the vendor source, not seen in the sample, and the command quoted in the sentence of DEC-1 is the one PROVENANCE.md records; (11) the shared id helper keeps the exception of the Structurizr rule (CON-7). Then append a Facts block to the run prg: the signatures of Nesting, the id-rule exception found in StructurizrMapper, the literal counts found with their files, the current content of ImportGroup and of the importer folder, the 12 kinds and the 6 elements dropped under the golden mapping read from the sample and the tree rule, and the folder where the editor harness lives now.'
      context:
        prd_excerpts:
          - 'none: there is no PRD (profile TDD+pln); the REQ-n of the TDD are listed with the TDD items'
        tdd_excerpts:
          - 'REQ-1'
          - 'REQ-9'
          - 'DEC-1'
          - 'DEC-4'
          - 'DEC-5'
          - 'DEC-8'
          - 'DEC-9'
          - 'DEC-10'
          - 'IMP-5'
          - 'IMP-7'
          - 'IMP-8'
          - 'CTR-1'
          - 'CTR-4'
          - 'CON-7'
          - 'CON-9'
          - 'RISK-5'
          - 'RISK-8'
          - 'Q-2'
      likely_files:
        - 'docs/wav/wav-035-maven-builds-kernel-and-page-likec4-import/run/run-0233-likec4-json-import/tdd-0233-likec4-json-import.md'
        - 'docs/wav/wav-035-maven-builds-kernel-and-page-likec4-import/run/run-0233-likec4-json-import/prg-0233-likec4-json-import.md'
      acceptance_criteria:
        - 'The TDD names src/test/resources/likec4-expected/ and src/test/resources/likec4-expected-report.txt for the goldens and no longer src/test/resources/likec4/expected/'
        - 'The TDD states resolutions (2) to (11) in the sections they concern and states the list of refusals in one place'
        - 'The Facts block is in the prg and lists the literal counts (or says there are none) with file and line'
        - 'src/test/resources/likec4/cloud-system.json, LICENSE and PROVENANCE.md are unchanged since 331f1d5'
      verification:
        - 'git diff 331f1d5 HEAD --stat -- src/test/resources/likec4/cloud-system.json src/test/resources/likec4/LICENSE src/test/resources/likec4/PROVENANCE.md'
        - 'jq ''.elements | length'' src/test/resources/likec4/cloud-system.json'
        - 'grep -c ''likec4-expected'' docs/wav/wav-035-maven-builds-kernel-and-page-likec4-import/run/run-0233-likec4-json-import/tdd-0233-likec4-json-import.md'
        - '! grep -n ''likec4/expected'' docs/wav/wav-035-maven-builds-kernel-and-page-likec4-import/run/run-0233-likec4-json-import/tdd-0233-likec4-json-import.md'
        - 'grep -c ''Facts'' docs/wav/wav-035-maven-builds-kernel-and-page-likec4-import/run/run-0233-likec4-json-import/prg-0233-likec4-json-import.md'
      escalation_triggers:
        - 'The sample differs from the one of commit 331f1d5 or its element count is not the number the TDD names: stop and log; the sample is never regenerated or edited'
        - 'The id rule of StructurizrMapper has behaviour the TDD does not know beyond the space exception (isIdCharacter and replacesCharacter in StructurizrMapper): log it in the Facts block; task-002 reads the code and parametrizes the helper by itself'
        - 'A resolution needs a product decision beyond these eleven: log it as a finding and keep the TDD as it was on that point'
      suggested_subagent_type: 'general-purpose'
      suggested_model: '(default)'
      suggested_effort: 'low'
    - task_id: task-002
      agent_role: 'Refactoring Agent'
      objective: 'Move, without changing a byte of the Structurizr output: the id rule (slug, rewritesCharacter, hasAlphanumeric) with the exception of the Structurizr rule that you read in StructurizrMapper itself (a space is turned to _ and is not a rewrite; parametrize the helper rather than lose it) and the suffix loop into ImportIds with assign(bases, rewritten) returning the ids and the rewritten flags; WORKSPACE_FILE, parse, reason, serialize and add into ImportSupport; the nested records Planned and WorkspaceFile into top-level public records of the package with the same fields. StructurizrMapper and StructurizrImportService call them and keep their own fallback id. Grep first that no caller outside importer/ and its tests reads the nested records. Add ImportIdsTest (camel case lowercased, odd characters, a segment such as .. or x/y, a fallback, a collision suffix that skips a sibling already named x_2) and change the one reference in StructurizrMapperTest. Do not edit anything under src/test/resources/structurizr.'
      context:
        prd_excerpts:
          - 'none: there is no PRD (profile TDD+pln); the REQ-n of the TDD are listed with the TDD items'
        tdd_excerpts:
          - 'REQ-5'
          - 'REQ-9'
          - 'TG-4'
          - 'DEC-3'
          - 'IMP-2'
          - 'IMP-13'
          - 'CTR-4'
          - 'CON-7'
          - 'CON-1'
          - 'IMP-4'
          - 'RISK-3'
      likely_files:
        - 'src/main/java/io/morin/archicode/importer/ImportIds.java'
        - 'src/main/java/io/morin/archicode/importer/ImportSupport.java'
        - 'src/main/java/io/morin/archicode/importer/Planned.java'
        - 'src/main/java/io/morin/archicode/importer/WorkspaceFile.java'
        - 'src/main/java/io/morin/archicode/importer/StructurizrMapper.java'
        - 'src/main/java/io/morin/archicode/importer/StructurizrImportService.java'
        - 'src/test/java/io/morin/archicode/importer/ImportIdsTest.java'
        - 'src/test/java/io/morin/archicode/importer/StructurizrMapperTest.java'
      acceptance_criteria:
        - 'The four shared types exist and StructurizrMapper and StructurizrImportService call them'
        - 'ImportIdsTest, the Structurizr tests and ImportFilesTest pass'
        - 'git diff --stat -- src/test/resources/structurizr prints nothing'
        - 'The only edit of an existing test is the one reference of StructurizrMapperTest'
      verification:
        - 'JAVA_HOME=$HOME/.sdkman/candidates/java/25.0.4-tem ./mvnw -q test -Dtest=''ImportIdsTest,Structurizr*Test,ImportFilesTest'''
        - 'JAVA_HOME=$HOME/.sdkman/candidates/java/25.0.4-tem ./mvnw -q test-compile pmd:check'
        - 'git diff --stat -- src/test/resources/structurizr'
      escalation_triggers:
        - 'A Structurizr golden or the Structurizr report needs an edit to pass: stop, the move must not change the output'
        - 'A caller outside importer/ reads the nested records: log it and keep a compatible access, do not edit that caller beyond the import'
        - 'PMD names a rule that the ruleset does not allow: fix the code, never add a NOPMD'
      suggested_subagent_type: 'general-purpose'
      suggested_model: '(default)'
      suggested_effort: 'medium'
    - task_id: task-003
      agent_role: 'Backend Implementation Agent'
      objective: 'Write the pure reader: a JsonNode in, a LikeC4Model out (records Element, Link and Dropped as the TDD describes them), with project selection (DEC-2), description read as a text or an object with txt or md and the summary as fallback, tags, technology, isBidirectional, and the counts of the dropped parts of DEC-8 as amended by task-001 (views, deployment elements and relationships, styles, metadata, links, globals, imports, diffs, manual layouts, notation, navigateTo). The reader opens no file and imports nothing from cli/. The sentences of DEC-2 and CTR-1 (not an export, no elements, element with no kind, parent absent from the file, array cases) are ArchiCodeException messages with the file name passed in. LikeC4ReaderTest reads src/test/resources/likec4/cloud-system.json and compares the number of elements and relations read with the counts read from the same file, and uses copies made in memory for what the sample lacks (diffs, a non-empty globals or imports, an array of projects, a bidirectional relationship).'
      context:
        prd_excerpts:
          - 'none: there is no PRD (profile TDD+pln); the REQ-n of the TDD are listed with the TDD items'
        tdd_excerpts:
          - 'REQ-2'
          - 'REQ-7'
          - 'TG-1'
          - 'DEC-2'
          - 'DEC-8'
          - 'DEC-9'
          - 'CTR-1'
          - 'ASM-1'
          - 'ASM-2'
          - 'CON-3'
          - 'IMP-4'
          - 'RISK-1'
      likely_files:
        - 'src/main/java/io/morin/archicode/importer/LikeC4Model.java'
        - 'src/main/java/io/morin/archicode/importer/LikeC4Reader.java'
        - 'src/test/java/io/morin/archicode/importer/LikeC4ReaderTest.java'
      acceptance_criteria:
        - 'LikeC4ReaderTest passes'
        - 'The reader opens no file and imports nothing from cli/'
        - 'The number of elements read from the sample equals the count read from the file, not a literal'
        - 'Every refusal sentence of DEC-2 and CTR-1 is asserted as one line with no stack trace'
      verification:
        - 'JAVA_HOME=$HOME/.sdkman/candidates/java/25.0.4-tem ./mvnw -q test -Dtest=''LikeC4ReaderTest'''
        - 'JAVA_HOME=$HOME/.sdkman/candidates/java/25.0.4-tem ./mvnw -q test-compile pmd:check'
      escalation_triggers:
        - 'The sample does not hold a key the reader needs (ASM-1): stop and log the key, never edit the sample'
        - 'A Jackson feature the native image cannot use is needed: use the JsonNode tree instead'
      suggested_subagent_type: 'general-purpose'
      suggested_model: '(default)'
      suggested_effort: 'medium'
    - task_id: task-004
      agent_role: 'Backend Implementation Agent'
      objective: 'Write the pure mapper: LikeC4Model, the raw --map options (List<String>) and the project name in; Mapped out (the Planned files, the written element and relationship counts, the messages of the report). It resolves the kinds (the four defaults, --map, the errors of DEC-4 in the order DEC-4 gives, every unmapped kind listed in the order of first appearance), builds the tree from the dotted ids, drops with a reason the elements that Nesting cannot hold and what they hold (DEC-5; Nesting read through kindsHeldBy(Element) and kindsHeldAtTheTop(Parent) on a bare instance made with the builder of the target class, never a copy of the table), gives ids with ImportIds (fallback and suffix over all the siblings of the export in file order, dropped ones included), the dotted references, the tags likec4.id and likec4.kind, relationships on their source (DEC-6, with the counts of the relationships dropped and of the bidirectional ones), and the workspace file. It serializes and writes nothing. LikeC4MapperTest covers camel case, collisions, odd characters, the fallback, the default and the given mapping, the unmapped kinds, a --map for an absent kind, malformed and duplicated --map, a person under a system and a component under a component dropped with their descendants, a relationship to a missing or dropped element, a bidirectional one, and on the sample with the golden mapping (app, gqlMutation, gqlQuery, lambda, mobileApp, queue and table to component, externalSystem to system) exactly 21 elements written and the six elements of DEC-5 dropped.'
      context:
        prd_excerpts:
          - 'none: there is no PRD (profile TDD+pln); the REQ-n of the TDD are listed with the TDD items'
        tdd_excerpts:
          - 'REQ-2'
          - 'REQ-3'
          - 'REQ-7'
          - 'TG-2'
          - 'TG-3'
          - 'DEC-3'
          - 'DEC-4'
          - 'DEC-5'
          - 'DEC-6'
          - 'DEC-10'
          - 'CTR-2'
          - 'ASM-3'
          - 'ASM-5'
          - 'ASM-6'
          - 'IMP-4'
          - 'RISK-2'
          - 'RISK-6'
      likely_files:
        - 'src/main/java/io/morin/archicode/importer/LikeC4Mapper.java'
        - 'src/test/java/io/morin/archicode/importer/LikeC4MapperTest.java'
      acceptance_criteria:
        - 'LikeC4MapperTest passes'
        - 'The sample with the golden mapping gives 21 written and the six named elements dropped'
        - 'Every error sentence of DEC-4 is asserted in its order'
        - 'The mapper writes no file and calls no cli class'
      verification:
        - 'JAVA_HOME=$HOME/.sdkman/candidates/java/25.0.4-tem ./mvnw -q test -Dtest=''LikeC4MapperTest,LikeC4ReaderTest,ImportIdsTest'''
        - 'JAVA_HOME=$HOME/.sdkman/candidates/java/25.0.4-tem ./mvnw -q test-compile pmd:check'
      escalation_triggers:
        - 'The golden mapping does not give 21 and 6 (DEC-9): stop and log the real numbers; the TDD and the gate wording are then amended in the Facts block before the golden is written'
        - 'Nesting cannot be read on a bare builder instance without a change under resource/: log it and stop the task; Nesting is never edited here'
        - 'The loader refuses a manifest that the mapper writes: fix the mapper, never the loader'
      suggested_subagent_type: 'general-purpose'
      suggested_model: '(default)'
      suggested_effort: 'medium'
    - task_id: task-005
      agent_role: 'Backend Implementation Agent'
      objective: 'Write LikeC4ImportService (refuse .c4 and .likec4 names with the sentence of DEC-1 and a name that is not .json, an input that is a folder or absent, parse, read, map, serialize with MapperFactory.forWriting(YAML), write through ImportFiles.commit, queue the warnings only after the move succeeded, in the order of DEC-8 as amended: parts, the count line of dropped elements, one line per dropped element, one sentence per rewritten id), the command ImportLikeC4Command (name likec4, <model.json>, -o/--output required, --map as a repeated String, --project, the same one-line standard output as the Structurizr command) and its name in ImportGroup. Register in reflect-config.json every new class NativeReflectionConfigTest asks for, nested records included. LikeC4ImportServiceTest uses the fakes of ImportFiles as ImportFilesTest and StructurizrImportServiceTest do: every refusal is one error: line with nothing staged, a failed write removes the staging folder and queues no warning, the warnings and the standard-output line on the sample.'
      context:
        prd_excerpts:
          - 'none: there is no PRD (profile TDD+pln); the REQ-n of the TDD are listed with the TDD items'
        tdd_excerpts:
          - 'REQ-2'
          - 'REQ-3'
          - 'REQ-4'
          - 'DEC-1'
          - 'DEC-2'
          - 'DEC-4'
          - 'DEC-7'
          - 'DEC-8'
          - 'DEC-10'
          - 'IMP-1'
          - 'IMP-3'
          - 'IMP-7'
          - 'CTR-3'
          - 'IF-1'
          - 'IF-2'
          - 'FLOW-1'
          - 'CON-2'
          - 'CON-3'
          - 'ASM-4'
          - 'CON-8'
          - 'IMP-4'
          - 'RISK-4'
      likely_files:
        - 'src/main/java/io/morin/archicode/importer/LikeC4ImportService.java'
        - 'src/main/java/io/morin/archicode/cli/ImportLikeC4Command.java'
        - 'src/main/java/io/morin/archicode/cli/ImportGroup.java'
        - 'src/main/resources/META-INF/native-image/io.morin.archicode/archicode/reflect-config.json'
        - 'src/test/java/io/morin/archicode/importer/LikeC4ImportServiceTest.java'
      acceptance_criteria:
        - 'LikeC4ImportServiceTest and NativeReflectionConfigTest pass'
        - 'Every refusal of IF-2 is one error: line with the output folder unchanged'
        - 'The warnings are queued only on the success branch'
        - 'The command holds no logic beyond calling the service'
        - 'grep -c LikeC4 on reflect-config.json prints at least 1 (gate 4 of the wave)'
      verification:
        - 'JAVA_HOME=$HOME/.sdkman/candidates/java/25.0.4-tem ./mvnw -q test -Dtest=''LikeC4ImportServiceTest,NativeReflectionConfigTest,LikeC4MapperTest,Structurizr*Test'''
        - 'JAVA_HOME=$HOME/.sdkman/candidates/java/25.0.4-tem ./mvnw -q test-compile pmd:check'
        - 'grep -c LikeC4 src/main/resources/META-INF/native-image/io.morin.archicode/archicode/reflect-config.json'
      escalation_triggers:
        - 'NativeReflectionConfigTest asks for an entry that cannot be written: log it, the Native job of the pull request is then the proof'
        - 'The binding of the repeated --map option cannot give the sentences of DEC-4: keep the raw strings and parse them in the service'
        - 'HelpIT or GuideTest fail here: they are task-008''s, do not fix them in this task'
      suggested_subagent_type: 'general-purpose'
      suggested_model: '(default)'
      suggested_effort: 'medium'
    - task_id: task-006
      agent_role: 'Test Generation Agent'
      objective: 'Write LikeC4GoldenTest on the model of StructurizrGoldenTest: import src/test/resources/likec4/cloud-system.json with the eight --map options of DEC-9 into a temp folder and compare it byte for byte with src/test/resources/likec4-expected/ (a sibling of the sample folder, which stays untouched) and the warnings with src/test/resources/likec4-expected-report.txt, with -Darchicode.golden.regenerate=true to write both. Generate them, read them (21 elements, the six drops with their causes, customer carries its description, tblUsers and supportUser give no rewrite warning, the count line says 6), and commit nothing else under src/test/resources/likec4/. Update the literal counts of shipped workspaces or manifests that task-001 found, in the tests and in src/test/CLAUDE.md as it stands. If MistakeSweepTest ends in a stack trace: fix the mapper when the cause is the importer, or add an entry of known-traces.json when it is not (its fields are case, issue and reason, and MistakeSweepTest wants an existing issue: this plan opens none, so when no issue tracks the trace the task logs it as a finding and the trace stays a blocker for the human).'
      context:
        prd_excerpts:
          - 'none: there is no PRD (profile TDD+pln); the REQ-n of the TDD are listed with the TDD items'
        tdd_excerpts:
          - 'REQ-2'
          - 'REQ-4'
          - 'TG-5'
          - 'DEC-8'
          - 'DEC-9'
          - 'DEC-10'
          - 'IMP-5'
          - 'CON-4'
          - 'CON-5'
          - 'RISK-5'
      likely_files:
        - 'src/test/resources/likec4-expected/'
        - 'src/test/resources/likec4-expected-report.txt'
        - 'src/test/java/io/morin/archicode/importer/LikeC4GoldenTest.java'
        - 'src/test/resources/known-traces.json'
        - 'src/test/CLAUDE.md'
      acceptance_criteria:
        - 'LikeC4GoldenTest passes and the golden is reproducible'
        - 'ShippedFilesTest, ManifestSchemaCorpusTest, ManifestRoundTripCorpusTest and MistakeSweepTest pass with the golden in the corpus'
        - 'The node test shipped-files.test.js passes'
        - 'git diff 331f1d5 HEAD --stat -- src/test/resources/likec4 prints nothing for the three sample files'
      verification:
        - 'JAVA_HOME=$HOME/.sdkman/candidates/java/25.0.4-tem ./mvnw -q test -Dtest=''LikeC4GoldenTest,ShippedFilesTest,ManifestSchemaCorpusTest,ManifestRoundTripCorpusTest,MistakeSweepTest'''
        - 'node --test src/test/javascript/viewpoint-kernel/shipped-files.test.js'
        - 'git diff 331f1d5 HEAD --stat -- src/test/resources/likec4/cloud-system.json src/test/resources/likec4/LICENSE src/test/resources/likec4/PROVENANCE.md'
      escalation_triggers:
        - 'The golden does not hold 21 elements and 6 drops: stop and log the numbers (see task-004)'
        - 'A trace whose cause is not the importer needs an entry of known-traces.json with case, issue and reason: no issue is created here, so log the trace as a finding and report it as a blocker if no issue tracks it; one whose cause is the importer goes back to the mapper'
        - 'A count in a test or in a CLAUDE.md moves by a number other than the golden''s manifests: log it'
      suggested_subagent_type: 'general-purpose'
      suggested_model: '(default)'
      suggested_effort: 'high'
    - task_id: task-007
      agent_role: 'Test Generation Agent'
      objective: 'Write LikeC4ImportIT on the pattern of StructurizrImportIT: on the packaged application the sample with the eight --map options exits 0, query graph on the output has as many elements as the sample''s elements (read from the file) minus the number of warning lines that start "warning: element " and contain " dropped: ", and that equals the count line; a .c4 input, a non-empty folder, the sample with no --map (the error names the eight kinds in order) and a synthetic array of two projects are each one error: line, exit 1, no stack trace and the folder unchanged; --map for the listed kinds then exits 0. Write likec4-import-workspace.test.js on the pattern of structurizr-import-workspace.test.js: it opens src/test/resources/likec4-expected/ in the editor with no mistake, no duplicate reference and as many elements as the golden holds. Read the harness where it stands now (CON-9). Nothing under src/main/editor changes. The integration test runs in the full verify at Stage 11; here only the node test and the compile are run.'
      context:
        prd_excerpts:
          - 'none: there is no PRD (profile TDD+pln); the REQ-n of the TDD are listed with the TDD items'
        tdd_excerpts:
          - 'REQ-2'
          - 'REQ-3'
          - 'REQ-4'
          - 'DEC-4'
          - 'DEC-10'
          - 'IMP-6'
          - 'CON-9'
          - 'IF-3'
          - 'RISK-4'
      likely_files:
        - 'src/test/java/io/morin/archicode/it/LikeC4ImportIT.java'
        - 'src/test/javascript/viewpoint-kernel/likec4-import-workspace.test.js'
      acceptance_criteria:
        - 'likec4-import-workspace.test.js passes'
        - 'LikeC4ImportIT compiles and holds every case of IMP-6'
        - 'No file under src/main/editor or src/main/rust is changed'
      verification:
        - 'node --test src/test/javascript/viewpoint-kernel/likec4-import-workspace.test.js'
        - 'JAVA_HOME=$HOME/.sdkman/candidates/java/25.0.4-tem ./mvnw -q test-compile pmd:check'
        - 'git diff --stat -- src/main/rust src/main/editor'
      escalation_triggers:
        - 'The editor shows a mistake on the golden: the importer is wrong, fix the mapper (task-004) and regenerate the golden, never the editor'
        - 'The harness moved and the pattern of structurizr-import-workspace.test.js no longer loads: read how that test loads now and follow it'
      suggested_subagent_type: 'general-purpose'
      suggested_model: '(default)'
      suggested_effort: 'high'
    - task_id: task-008
      agent_role: 'Documentation Agent'
      objective: 'Regenerate the guide golden and update HelpIT for the new command (read the diff: only import likec4 differs), add the section [[import-likec4]] after [[import-structurizr]] in src/doc/README.adoc (how to export the JSON with the command PROVENANCE.md records, what is read, the mapping and --map, the ids and tags, the report including the elements the nesting cannot hold and the count line, the refusals) and the mention in the hand-written line of import, and a short section for the second importer and the shared classes in src/main/java/io/morin/archicode/CLAUDE.md and a paragraph "The LikeC4 import golden" in src/test/CLAUDE.md. Read each file as it is first: other waves edit the manual and src/test/CLAUDE.md. The notes state what is true now, with no wave, run or issue id.'
      context:
        prd_excerpts:
          - 'none: there is no PRD (profile TDD+pln); the REQ-n of the TDD are listed with the TDD items'
        tdd_excerpts:
          - 'REQ-6'
          - 'REQ-8'
          - 'DEC-1'
          - 'DEC-4'
          - 'DEC-5'
          - 'DEC-8'
          - 'IMP-9'
          - 'IMP-10'
          - 'IMP-11'
          - 'CON-6'
          - 'RISK-7'
          - 'RISK-8'
      likely_files:
        - 'src/test/resources/guide/golden.md'
        - 'src/test/java/io/morin/archicode/it/HelpIT.java'
        - 'src/doc/README.adoc'
        - 'src/main/java/io/morin/archicode/CLAUDE.md'
        - 'src/test/CLAUDE.md'
        - 'src/test/javascript/manual-anchors.json'
      acceptance_criteria:
        - 'GuideTest and CommandReferenceTest pass and list import likec4'
        - 'The manual section exists with the anchor import-likec4 and its source blocks are accepted by the manual tests'
        - 'The two CLAUDE.md files describe the second importer, the shared classes and the golden in its sibling folder'
        - 'No sentence of the notes names a wave, a run or an issue'
      verification:
        - 'JAVA_HOME=$HOME/.sdkman/candidates/java/25.0.4-tem ./mvnw -q test -Dtest=''GuideTest,CommandReferenceTest'''
        - 'node --test src/test/javascript/manual-skeleton.test.js'
        - 'grep -c ''import-likec4'' src/doc/README.adoc'
        - '! grep -nE ''wave [0-9]+|run [0-9]{4}|#134'' src/main/java/io/morin/archicode/CLAUDE.md'
        - '! grep -nE ''wave [0-9]+|run [0-9]{4}|#134'' src/test/CLAUDE.md'
      escalation_triggers:
        - 'The guide golden differs by more than the new command: stop and log, do not accept an unrelated diff'
        - 'The manual''s skeleton test needs an anchor entry: add it to manual-anchors.json'
      suggested_subagent_type: 'general-purpose'
      suggested_model: '(default)'
      suggested_effort: 'medium'
    - task_id: task-009
      agent_role: 'Documentation Agent'
      objective: 'Read docs/architecture/manifests/archicode.yaml as it is (it carries uncommitted edits of other work) and touch only the lines of the importer: add the command import_likec4 with tags.path naming ImportGroup.java and ImportLikeC4Command.java (both exist after task-005), its edge to importer, and make the description of importer say it holds both importers. Change impact-questions.json only if a question about the importer changes. Then run npm run sample:build and read which file it writes. ArchitectureDriftTest must pass.'
      context:
        prd_excerpts:
          - 'none: there is no PRD (profile TDD+pln); the REQ-n of the TDD are listed with the TDD items'
        tdd_excerpts:
          - 'REQ-6'
          - 'REQ-8'
          - 'IMP-12'
          - 'RISK-8'
      likely_files:
        - 'docs/architecture/manifests/archicode.yaml'
        - 'src/test/javascript/architecture/impact-questions.json'
        - 'scripts/build-sample.mjs'
      acceptance_criteria:
        - 'The model names import_likec4 and its tags.path exist'
        - 'ArchitectureDriftTest and ArchitectureImpactTest pass'
        - 'npm run sample:build ran and the bundle it writes matches the folder'
        - 'Only the lines of the importer changed in archicode.yaml'
      verification:
        - 'JAVA_HOME=$HOME/.sdkman/candidates/java/25.0.4-tem ./mvnw -q test -Dtest=''ArchitectureDriftTest,ArchitectureImpactTest'''
        - 'grep -c ''import_likec4'' docs/architecture/manifests/archicode.yaml'
        - 'node --test src/test/javascript/viewpoint-kernel/build-sample-script.test.js'
        - 'git diff --stat -- src/main/rust src/main/editor'
      escalation_triggers:
        - 'A tags.path names a file that does not exist: fix the path, never the test'
        - 'The sample bundle is written to a path another wave has moved or removed: read scripts/build-sample.mjs and follow it, log where it wrote'
        - 'archicode.yaml has edits in the lines of the importer that are not this run''s: leave them and log'
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
        - 'the fast checks of the task'
      success_criteria:
        - 'The TDD names src/test/resources/likec4-expected/ and src/test/resources/likec4-expected-report.txt for the goldens and no longer src/test/resources/likec4/expected/'
        - 'The TDD states resolutions (2) to (11) in the sections they concern and states the list of refusals in one place'
        - 'The Facts block is in the prg and lists the literal counts (or says there are none) with file and line'
        - 'src/test/resources/likec4/cloud-system.json, LICENSE and PROVENANCE.md are unchanged since 331f1d5'
    - task_id: task-002
      methods:
        - 'the fast checks of the task'
      success_criteria:
        - 'The four shared types exist and StructurizrMapper and StructurizrImportService call them'
        - 'ImportIdsTest, the Structurizr tests and ImportFilesTest pass'
        - 'git diff --stat -- src/test/resources/structurizr prints nothing'
        - 'The only edit of an existing test is the one reference of StructurizrMapperTest'
    - task_id: task-003
      methods:
        - 'the fast checks of the task'
      success_criteria:
        - 'LikeC4ReaderTest passes'
        - 'The reader opens no file and imports nothing from cli/'
        - 'The number of elements read from the sample equals the count read from the file, not a literal'
        - 'Every refusal sentence of DEC-2 and CTR-1 is asserted as one line with no stack trace'
    - task_id: task-004
      methods:
        - 'the fast checks of the task'
      success_criteria:
        - 'LikeC4MapperTest passes'
        - 'The sample with the golden mapping gives 21 written and the six named elements dropped'
        - 'Every error sentence of DEC-4 is asserted in its order'
        - 'The mapper writes no file and calls no cli class'
    - task_id: task-005
      methods:
        - 'the fast checks of the task'
      success_criteria:
        - 'LikeC4ImportServiceTest and NativeReflectionConfigTest pass'
        - 'Every refusal of IF-2 is one error: line with the output folder unchanged'
        - 'The warnings are queued only on the success branch'
        - 'The command holds no logic beyond calling the service'
        - 'grep -c LikeC4 on reflect-config.json prints at least 1 (gate 4 of the wave)'
    - task_id: task-006
      methods:
        - 'the fast checks of the task'
      success_criteria:
        - 'LikeC4GoldenTest passes and the golden is reproducible'
        - 'ShippedFilesTest, ManifestSchemaCorpusTest, ManifestRoundTripCorpusTest and MistakeSweepTest pass with the golden in the corpus'
        - 'The node test shipped-files.test.js passes'
        - 'git diff 331f1d5 HEAD --stat -- src/test/resources/likec4 prints nothing for the three sample files'
    - task_id: task-007
      methods:
        - 'the fast checks of the task'
      success_criteria:
        - 'likec4-import-workspace.test.js passes'
        - 'LikeC4ImportIT compiles and holds every case of IMP-6'
        - 'No file under src/main/editor or src/main/rust is changed'
    - task_id: task-008
      methods:
        - 'the fast checks of the task'
      success_criteria:
        - 'GuideTest and CommandReferenceTest pass and list import likec4'
        - 'The manual section exists with the anchor import-likec4 and its source blocks are accepted by the manual tests'
        - 'The two CLAUDE.md files describe the second importer, the shared classes and the golden in its sibling folder'
        - 'No sentence of the notes names a wave, a run or an issue'
    - task_id: task-009
      methods:
        - 'the fast checks of the task'
      success_criteria:
        - 'The model names import_likec4 and its tags.path exist'
        - 'ArchitectureDriftTest and ArchitectureImpactTest pass'
        - 'npm run sample:build ran and the bundle it writes matches the folder'
        - 'Only the lines of the importer changed in archicode.yaml'
  run_once_at_stage_11:
    - 'JAVA_HOME=$HOME/.sdkman/candidates/java/25.0.4-tem ./mvnw test-compile pmd:check'
    - 'JAVA_HOME=$HOME/.sdkman/candidates/java/25.0.4-tem ./mvnw verify -DskipITs=false (unit tests, then LikeC4ImportIT, StructurizrImportIT and HelpIT on the packaged jar)'
    - 'npm run test:unit, npm run test:coverage, npm run format:check, npm run lint'
    - 'scripts/byte-identity.sh exits 0 with scripts/byte-identity-exceptions.txt unchanged'
    - 'npm run sample:build and the build of the page leave git status --short unchanged'
    - 'git diff 331f1d5 HEAD --stat -- src/test/resources/likec4/cloud-system.json src/test/resources/likec4/LICENSE src/test/resources/likec4/PROVENANCE.md prints nothing, and git diff 7742b07 HEAD --stat -- src/test/resources/structurizr prints nothing'
    - 'the gate commands of P3 by hand on target/quarkus-app/quarkus-run.jar: the sample into an empty folder with the eight --map options exits 0, query graph prints 27 minus the number of dropped lines (21), a .c4 input, a non-empty folder and the sample with no --map are each one error: line; the numbers are recorded in the prg'
    - 'the Native job of CI is the proof of the native image and does not run on a branch: the hand-off says so'
```

The full suite was not measured on the starting repository: the working tree carries the uncommitted edits of waves W-1 and W-2, so a red base is possible. If a command is red on the base for a reason outside this run, the final check records it and does not ask for it to pass.

## 11. Escalation Rules

This run operates under the autonomy of the wave: no task is `human_required` or critical, so none is executed against a human gate; if the launch carries an autonomy override it is logged in the wave's progress log, which is where a future reader of this plan finds why a `review_after` task ran without a stop.

```yaml
escalation_rules:
  rules:
    - condition: 'The sample differs from commit 331f1d5, or a key the reader needs is missing from it'
      action: 'Stop and log the finding; the sample is never regenerated or edited and the vendor tool is not run; the wave then closes without this run'
    - condition: 'The loader or the editor refuses what the mapper writes'
      action: 'Fix the mapper; never change the loader, Nesting or the editor; if the rule cannot be met, log a finding and stop the task'
    - condition: 'A Structurizr golden needs an edit, or byte-identity.sh needs a new exception, or an existing command changes its output'
      action: 'Stop and log: the move and the importer must not change another command'
    - condition: 'The golden mapping does not give 21 elements written and 6 dropped'
      action: 'Log the real numbers in the prg; amend the TDD and the golden with them before the integration test reads them'
    - condition: 'A command fails for a reason outside the run (a base that is already red, or an edit of another wave)'
      action: 'Record it in the task and do not fix it'
    - condition: 'A decision outside the eleven resolutions F1 to F11 and the TDD is needed'
      action: 'Log it as a finding, choose the smaller change, and say so in the final check'
    - condition: 'A task is flagged human_required or risk critical by a later edit'
      action: 'The implement workflow stops with awaiting-human unless the launch carries the autonomy override'
```

## 12. Final Execution Manifest

```yaml
execution_manifest:
  status: 'done'
  recommendation: 'proceed_with_review'
  autonomy_level: 'medium'
  total_tasks: 9
  autonomous_tasks: 7
  review_before_tasks: 0
  review_after_tasks: 2
  human_required_tasks: 0
  blocked_tasks: 0
  critical_path_tasks:
    - task-001
    - task-003
    - task-004
    - task-005
    - task-006
    - task-007
    - task-008
  parallel_groups:
    - parallel-group-001
    - parallel-group-002
  required_human_gates:
    - gate-001
  highest_risk_tasks:
    - task-002
    - task-005
    - task-004
  lowest_confidence_tasks:
    - task-004
    - task-006
    - task-007
    - task-009
  next_action: 'Start task-001 and task-002 in parallel: amend the TDD with the review findings and record the facts, and move the shared part out of the Structurizr importer'
  criteria:
    - 'The reader, mapper, service and command are in the working tree and their tests pass'
    - 'The golden and the editor test load the output, and the sample is unchanged'
    - 'The refusals are one error: line each with nothing written'
    - 'The manual, the guide, the notes and the model say what the command does'
```
