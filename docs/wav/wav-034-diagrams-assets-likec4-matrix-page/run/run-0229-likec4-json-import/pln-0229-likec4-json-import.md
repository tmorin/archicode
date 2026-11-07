---
title: Execution Plan — Import a LikeC4 JSON export
status: pending
date: 2026-11-07
related:
  - docs/wav/wav-034-diagrams-assets-likec4-matrix-page/run/run-0229-likec4-json-import/tdd-0229-likec4-json-import.md
  - docs/wav/wav-034-diagrams-assets-likec4-matrix-page/wav-034-diagrams-assets-likec4-matrix-page.md
  - docs/wav/wav-033-import-structurizr-and-plateau-matrix/run/run-0224-structurizr-json-import/pln-0224-structurizr-json-import.md
  - 'gh:tmorin/archicode#134'
type: pln
run: 0229
wave: 034
---

# Execution Plan: Import a LikeC4 JSON export

Profile TDD+pln: there is no PRD, so REQ-1 to REQ-9 are the IDs the TDD labels (section "PRD Traceability"), taken from issue #134, its author's decision and the P3 gate of wave 034. The TDD is the design (DEC-1 to DEC-10, IMP-1 to IMP-13, CTR-1 to CTR-4). The plan commits nothing: the commit is a human step outside it.

Autonomy: no task is `human_required`, none has `risk: critical` or `human_review: required`, so no task stops for a human whether or not the launch carries the run's autonomy override (the wave's override, if any, is logged in the wave's progress log, and a reader of this plan who sees a `review_before` or `review_after` task executed without a stop should read that log, not this plan). The tasks that carry some weight are `review_before` (task-001, which downloads and runs a third-party package in a scratch folder) and `review_after` (task-002, the move that must not change the Structurizr output, task-005, the command and the report, and task-010, the final check); their independent verification runs at the elevated pair of the active profile, and the review is that verification and the author's reading of the pull request.

The Stage 5 review of the TDD found 13 points, all applied to the TDD before this plan; the plan follows the TDD as corrected. Two open questions are carried into the plan as facts the first task settles, each with a stated fallback: Q-5 (the vendor tool must run headless; `likec4 export json` was refused by the permission system of the drafting session) and Q-6 (the kinds and nesting pairs of the sample, which fix the `--map` options). Every Maven command runs with `JAVA_HOME=$HOME/.sdkman/candidates/java/25.0.4-tem` (the shell Java is 21).

## 1. Executive Summary

```yaml
summary:
  status: 'pending'
  product_goal: 'archicode import likec4 <model.json> --output <folder> turns the JSON written by likec4 export json into an ArchiCode workspace that loads, and says what it left out'
  technical_approach: 'Move the id rule, the output records and the service steps shared with the Structurizr importer into four small types without changing its output, then add a reader, a mapper and a service in the package importer behind a thin command in the group import, proved by a committed cloud-system sample, a golden output, an integration test and an editor test'
  total_tasks: 10
  parallel_groups: 2
  high_risk_tasks: 0
  human_review_gates: 1
  autonomy_level: 'medium'
  recommendation: 'proceed_with_review'
  criteria:
    - 'The sample, its licence and its provenance are committed and the importer reads and maps it into a workspace that the command line and the editor load'
    - 'A .c4 input, a non-empty output folder and a kind with no target and no --map are each one error: line, exit 1, nothing written, and --map for each listed kind exits 0'
    - 'The warnings name every dropped part present and every rewritten id'
    - 'import structurizr writes the same bytes as before, scripts/byte-identity.sh needs no new exception'
    - 'PMD, verify with the integration tests, the node tests, format, lint, editor:build and sample:build all pass'
    - 'The manual, the guide, the command-line notes and the model of ArchiCode say what the command does'
```

## 2. PRD/TDD Consistency Assessment

```yaml
consistency_assessment:
  aligned_items:
    - 'REQ-1 to REQ-9 each map to at least one DEC and one IMP of the TDD, and each to a task below'
    - 'The gate commands of phase P3 (criteria 1 to 4 and 7 of the wave) are the verification of task-001, task-006, task-007 and task-010'
    - 'The reader, mapper, service and command of the TDD are the split of task-003 to task-005; the move of DEC-3 is task-002'
  gaps:
    - id: gap-001
      type: 'ambiguity'
      description: 'Q-5: the vendor tool was not run by the drafting session (the permission system refused it); the sample and every number derived from it depend on it'
      impact: 'high'
      recommendation: 'Task-001 runs it first; if it cannot run, the run stops with the reason and the importer waits (no hand-written sample)'
    - id: gap-002
      type: 'missing_technical_design'
      description: 'Q-6: the (parent kind, child kind) pairs of the sample, hence the --map options of the golden and the IT, are known only from the generated file (RISK-2)'
      impact: 'medium'
      recommendation: 'Task-001 records them in a Facts block that tasks 004, 006 and 007 read'
    - id: gap-003
      type: 'ambiguity'
      description: 'DEC-1 names the export command from the vendor source read on main, not from the tool at the tag'
      impact: 'low'
      recommendation: 'Task-001 fixes the sentence to what likec4 export json --help printed; task-005 uses it'
    - id: gap-004
      type: 'risk'
      description: 'DEC-3 changes StructurizrMapper and its service (RISK-3) and the golden joins the shipped corpus with literal counts and MistakeSweepTest (RISK-5)'
      impact: 'medium'
      recommendation: 'Task-002 is its own task guarded by the Structurizr goldens, left unedited; task-001 greps the literals and task-006 updates them'
    - id: gap-005
      type: 'risk'
      description: 'docs/architecture/manifests/archicode.yaml and its sample bundle carry uncommitted edits of another run (RISK-8)'
      impact: 'low'
      recommendation: 'Task-009 reads the file as it is and touches only the lines for the importer'
    - id: gap-006
      type: 'risk'
      description: 'The repeatable Picocli Map option is new here and a missing reflection entry fails only in the native runner (RISK-4)'
      impact: 'low'
      recommendation: 'NativeReflectionConfigTest and the IT on the jar in tasks 005 and 007; the Native job of the pull request is the proof and task-010 says it was not proved on the branch'
  blocking_gaps: []
```

## 3. Execution Graph

```yaml
execution_graph:
  nodes:
    - id: task-001
      status: 'pending'
      title: 'Sample and facts: generate the cloud-system export with the vendor tool in a scratch folder, trim its views, add the licence and the provenance, record the kinds, the nesting pairs, the --map options and the literal counts'
      depends_on: []
      produces:
        - 'src/test/resources/likec4/cloud-system.json'
        - 'src/test/resources/likec4/LICENSE-MIT.txt'
        - 'src/test/resources/likec4/PROVENANCE.md'
        - 'a Facts block appended to prg-0229-likec4-json-import.md (the tool version, the commit SHA, the exact command and the help it printed, the kinds, the (parent kind, child kind) pairs, the chosen --map options, the shape of description, whether imports is empty, the literal counts of shipped workspaces found)'
      agent_role: 'Documentation Agent'
      autonomy: 'review_before'
      risk: 'medium'
      confidence: 65
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
      status: 'pending'
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
      status: 'pending'
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
      status: 'pending'
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
      status: 'pending'
      title: 'Golden output: the workspace written from the sample, the report, the golden test, and the shipped-corpus counts it moves'
      depends_on: [task-005]
      produces:
        - 'src/test/resources/likec4/expected/'
        - 'src/test/resources/likec4/expected-report.txt'
        - 'src/test/java/io/morin/archicode/importer/LikeC4GoldenTest.java'
        - 'the literal counts of shipped workspaces and manifests found by task-001, updated'
        - 'src/test/resources/known-traces.json (only an entry with a reason, if MistakeSweepTest needs one)'
      agent_role: 'Test Generation Agent'
      autonomy: 'autonomous'
      risk: 'medium'
      confidence: 70
    - id: task-007
      status: 'pending'
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
      status: 'pending'
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
      status: 'pending'
      title: 'The model of ArchiCode and its sample bundle'
      depends_on: [task-005]
      produces:
        - 'docs/architecture/manifests/archicode.yaml'
        - 'src/test/javascript/architecture/impact-questions.json (only if a question changes)'
        - 'src/main/resources/editor-webapp/samples/archicode.yaml'
      agent_role: 'Documentation Agent'
      autonomy: 'autonomous'
      risk: 'low'
      confidence: 80
    - id: task-010
      status: 'pending'
      title: 'Final check: the gates of the run on the packaged application and the whole suite'
      depends_on: [task-008, task-009]
      produces:
        - 'the gate commands and their results recorded in prg-0229-likec4-json-import.md'
        - 'a statement of whether the Native job was proved (it is not, on a branch)'
      agent_role: 'QA Agent'
      autonomy: 'review_after'
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
    - from: task-008
      to: task-010
      reason: 'task 010 needs the output of task 008'
    - from: task-009
      to: task-010
      reason: 'task 010 needs the output of task 009'
```

## 4. Task Catalog

```yaml
task_catalog:
  tasks:
    - id: task-001
      title: 'Sample and facts: generate the cloud-system export with the vendor tool in a scratch folder, trim its views, add the licence and the provenance, record the kinds, the nesting pairs, the --map options and the literal counts'
      source_requirements:
        prd:
          - 'none: there is no PRD (profile TDD+pln); the REQ-n of the TDD are listed with the TDD items'
        tdd:
          - 'REQ-1'
          - 'REQ-7'
          - 'DEC-1'
          - 'DEC-4'
          - 'DEC-9'
          - 'IMP-8'
          - 'ASM-1'
          - 'ASM-3'
          - 'ASM-4'
          - 'Q-2'
          - 'Q-3'
          - 'Q-5'
          - 'Q-6'
          - 'RISK-1'
          - 'RISK-2'
          - 'RISK-5'
      outputs:
        - 'src/test/resources/likec4/cloud-system.json'
        - 'src/test/resources/likec4/LICENSE-MIT.txt'
        - 'src/test/resources/likec4/PROVENANCE.md'
        - 'a Facts block appended to prg-0229-likec4-json-import.md (the tool version, the commit SHA, the exact command and the help it printed, the kinds, the (parent kind, child kind) pairs, the chosen --map options, the shape of description, whether imports is empty, the literal counts of shipped workspaces found)'
      verification:
        - 'ls src/test/resources/likec4/'
        - 'grep -E ''[0-9a-f]{40}'' src/test/resources/likec4/PROVENANCE.md'
        - 'grep -q ''github.com/likec4/likec4'' src/test/resources/likec4/PROVENANCE.md'
        - 'jq ''.elements | length'' src/test/resources/likec4/cloud-system.json'
        - 'jq -e ''.views == {}'' src/test/resources/likec4/cloud-system.json'
        - 'grep -q ''MIT License'' src/test/resources/likec4/LICENSE-MIT.txt'
      risk: 'medium'
      confidence: 65
      human_review: 'before'
      escalation_triggers:
        - 'npm or the registry is not reachable, or likec4 export json cannot run in the agent session (Q-5): stop, log the reason in the prg and leave the importer waiting; do not write a sample by hand'
        - 'the export is not one object with an elements object, or elements is an array (ASM-1): stop and log the shape found, the reader design needs a decision'
        - 'no (parent kind, child kind) mapping of the sample can load under Nesting (RISK-2): stop with the finding; Nesting is not weakened and the sample is edited only by removing views'
        - 'the example folder holds a licence other than the root MIT one at the commit (ASM-4)'
      delegation_tier: 'standard'
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
          - 'CON-8'
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
        - 'JAVA_HOME=$HOME/.sdkman/candidates/java/25.0.4-tem ./mvnw test -Dtest=''ImportIdsTest,Structurizr*Test,ImportFilesTest'''
        - 'git diff --stat -- src/test/resources/structurizr'
        - 'grep -rn ''StructurizrMapper.Planned\|StructurizrMapper.WorkspaceFile'' src | wc -l'
      risk: 'medium'
      confidence: 80
      human_review: 'after'
      escalation_triggers:
        - 'a Structurizr golden or test needs an edit to pass: stop, the move changed the output (CON-8); fix the move, never the golden'
        - 'a caller of the nested records outside importer/ and its tests is found: log it and update that caller only if it is a one-line rename'
        - 'the existing tests of the first importer are red on the starting repository: record it and do not fix it'
      delegation_tier: 'standard'
      results: 'tier standard, model sonnet, effort medium, profile low-cost, passed first time, inline (leaf), independently verified'
    - id: task-003
      title: 'Reader and model: LikeC4 JSON to LikeC4Model and counted Dropped, project selection and the sentences of the refusals'
      source_requirements:
        prd:
          - 'none: there is no PRD (profile TDD+pln); the REQ-n of the TDD are listed with the TDD items'
        tdd:
          - 'REQ-2'
          - 'REQ-3'
          - 'REQ-6'
          - 'TG-1'
          - 'DEC-1'
          - 'DEC-2'
          - 'DEC-8'
          - 'CTR-1'
          - 'IF-2'
          - 'IMP-1'
          - 'IMP-4'
          - 'ASM-1'
          - 'ASM-2'
      outputs:
        - 'src/main/java/io/morin/archicode/importer/LikeC4Model.java'
        - 'src/main/java/io/morin/archicode/importer/LikeC4Reader.java'
        - 'src/test/java/io/morin/archicode/importer/LikeC4ReaderTest.java'
      verification:
        - 'JAVA_HOME=$HOME/.sdkman/candidates/java/25.0.4-tem ./mvnw test -Dtest=LikeC4ReaderTest'
      risk: 'medium'
      confidence: 75
      human_review: 'none'
      escalation_triggers:
        - 'the sample shows a shape other than ASM-1 (task-001 Facts block): stop and log it before coding the reader'
        - 'a refusal sentence of the TDD cannot be produced with one error: line: log it as a finding'
      delegation_tier: 'standard'
    - id: task-004
      title: 'Mapper: kinds with --map, nesting check, ids and references, relationships, Planned manifests and the workspace file'
      source_requirements:
        prd:
          - 'none: there is no PRD (profile TDD+pln); the REQ-n of the TDD are listed with the TDD items'
        tdd:
          - 'REQ-2'
          - 'REQ-3'
          - 'REQ-6'
          - 'TG-2'
          - 'TG-3'
          - 'DEC-3'
          - 'DEC-4'
          - 'DEC-5'
          - 'DEC-6'
          - 'DEC-7'
          - 'DEC-10'
          - 'CTR-2'
          - 'ASM-6'
          - 'IMP-1'
          - 'IMP-4'
          - 'RISK-6'
      outputs:
        - 'src/main/java/io/morin/archicode/importer/LikeC4Mapper.java'
        - 'src/test/java/io/morin/archicode/importer/LikeC4MapperTest.java'
      verification:
        - 'JAVA_HOME=$HOME/.sdkman/candidates/java/25.0.4-tem ./mvnw test -Dtest=''LikeC4MapperTest,ImportIdsTest'''
      risk: 'medium'
      confidence: 70
      human_review: 'none'
      escalation_triggers:
        - 'Nesting cannot be read without a change under resource/ (DEC-5): choose the other of the two reads the TDD names, and if neither works stop and log it'
        - 'the loader refuses what the mapper writes: fix the mapper, never the loader'
      delegation_tier: 'standard'
    - id: task-005
      title: 'Service, command, group, report and native reflection'
      source_requirements:
        prd:
          - 'none: there is no PRD (profile TDD+pln); the REQ-n of the TDD are listed with the TDD items'
        tdd:
          - 'REQ-2'
          - 'REQ-3'
          - 'REQ-4'
          - 'REQ-6'
          - 'DEC-1'
          - 'DEC-7'
          - 'DEC-8'
          - 'CTR-3'
          - 'IF-1'
          - 'IF-2'
          - 'FLOW-1'
          - 'IMP-1'
          - 'IMP-3'
          - 'IMP-7'
          - 'CON-2'
          - 'CON-3'
          - 'RISK-4'
      outputs:
        - 'src/main/java/io/morin/archicode/importer/LikeC4ImportService.java'
        - 'src/main/java/io/morin/archicode/cli/ImportLikeC4Command.java'
        - 'src/main/java/io/morin/archicode/cli/ImportGroup.java'
        - 'src/main/resources/META-INF/native-image/io.morin.archicode/archicode/reflect-config.json'
        - 'src/test/java/io/morin/archicode/importer/LikeC4ImportServiceTest.java'
      verification:
        - 'JAVA_HOME=$HOME/.sdkman/candidates/java/25.0.4-tem ./mvnw test -Dtest=''LikeC4ImportServiceTest,NativeReflectionConfigTest,Structurizr*Test'''
        - 'grep -c LikeC4 src/main/resources/META-INF/native-image/io.morin.archicode/archicode/reflect-config.json'
      risk: 'medium'
      confidence: 75
      human_review: 'after'
      escalation_triggers:
        - 'a refusal prints a stack trace or two lines: fix the command, one error: line is the contract (CON-3)'
        - 'Picocli cannot bind a repeatable Map option in the native runner: record it as RISK-4 for the Native job of the pull request, do not change the option form'
      delegation_tier: 'standard'
    - id: task-006
      title: 'Golden output: the workspace written from the sample, the report, the golden test, and the shipped-corpus counts it moves'
      source_requirements:
        prd:
          - 'none: there is no PRD (profile TDD+pln); the REQ-n of the TDD are listed with the TDD items'
        tdd:
          - 'REQ-2'
          - 'REQ-4'
          - 'TG-5'
          - 'DEC-9'
          - 'DEC-10'
          - 'IMP-5'
          - 'CON-4'
          - 'RISK-5'
      outputs:
        - 'src/test/resources/likec4/expected/'
        - 'src/test/resources/likec4/expected-report.txt'
        - 'src/test/java/io/morin/archicode/importer/LikeC4GoldenTest.java'
        - 'the literal counts of shipped workspaces and manifests found by task-001, updated'
        - 'src/test/resources/known-traces.json (only an entry with a reason, if MistakeSweepTest needs one)'
      verification:
        - 'JAVA_HOME=$HOME/.sdkman/candidates/java/25.0.4-tem ./mvnw test -Dtest=''LikeC4GoldenTest,ShippedFilesTest,ManifestSchemaCorpusTest,ManifestRoundTripCorpusTest,MistakeSweepTest'''
        - 'npm run test:unit'
      risk: 'medium'
      confidence: 70
      human_review: 'none'
      escalation_triggers:
        - 'MistakeSweepTest ends in a stack trace on header.parent of an imported element: if the cause is the importer, fix the mapper; if not, add a reasoned entry of known-traces.json'
        - 'a literal count outside the list of task-001 moves: update it and say so in the prg'
      delegation_tier: 'standard'
    - id: task-007
      title: 'Integration test on the packaged application and the editor test on the golden'
      source_requirements:
        prd:
          - 'none: there is no PRD (profile TDD+pln); the REQ-n of the TDD are listed with the TDD items'
        tdd:
          - 'REQ-2'
          - 'REQ-3'
          - 'REQ-4'
          - 'IMP-6'
          - 'IF-3'
          - 'RISK-2'
          - 'RISK-4'
      outputs:
        - 'src/test/java/io/morin/archicode/it/LikeC4ImportIT.java'
        - 'src/test/javascript/viewpoint-kernel/likec4-import-workspace.test.js'
      verification:
        - 'node --test src/test/javascript/viewpoint-kernel/likec4-import-workspace.test.js'
        - 'JAVA_HOME=$HOME/.sdkman/candidates/java/25.0.4-tem ./mvnw verify -DskipITs=false -Dit.test=LikeC4ImportIT'
      risk: 'medium'
      confidence: 70
      human_review: 'none'
      escalation_triggers:
        - 'the packaged jar cannot be built in the session: run the node test, record the IT as not run and let task-010 say it'
        - 'the editor refuses the golden: fix the mapper, never the editor (no change under src/main/editor)'
      delegation_tier: 'standard'
    - id: task-008
      title: 'Help and guide goldens, the manual and the notes for the next session'
      source_requirements:
        prd:
          - 'none: there is no PRD (profile TDD+pln); the REQ-n of the TDD are listed with the TDD items'
        tdd:
          - 'REQ-5'
          - 'REQ-8'
          - 'CON-7'
          - 'CON-9'
          - 'IMP-9'
          - 'IMP-10'
          - 'IMP-11'
          - 'RISK-7'
      outputs:
        - 'src/test/resources/guide/golden.md'
        - 'src/test/java/io/morin/archicode/it/HelpIT.java'
        - 'src/doc/README.adoc'
        - 'src/main/java/io/morin/archicode/CLAUDE.md'
        - 'src/test/CLAUDE.md'
        - 'src/test/javascript/manual-anchors.json (only if the new anchor needs an entry)'
      verification:
        - 'JAVA_HOME=$HOME/.sdkman/candidates/java/25.0.4-tem ./mvnw test -Dtest=''GuideTest,CommandReferenceTest,HelpIT'''
        - 'npm run test:unit'
        - 'grep -c ''import-likec4'' src/doc/README.adoc'
        - 'grep -c ''import likec4'' src/test/resources/guide/golden.md'
      risk: 'low'
      confidence: 80
      human_review: 'none'
      escalation_triggers:
        - 'the regenerated guide golden differs by more than the new command: stop and read the diff, only the new command may differ'
        - 'a test reads a literal of the manual that the new section moves: update it and say so in the prg'
      delegation_tier: 'standard'
    - id: task-009
      title: 'The model of ArchiCode and its sample bundle'
      source_requirements:
        prd:
          - 'none: there is no PRD (profile TDD+pln); the REQ-n of the TDD are listed with the TDD items'
        tdd:
          - 'REQ-5'
          - 'REQ-8'
          - 'IMP-12'
          - 'RISK-8'
      outputs:
        - 'docs/architecture/manifests/archicode.yaml'
        - 'src/test/javascript/architecture/impact-questions.json (only if a question changes)'
        - 'src/main/resources/editor-webapp/samples/archicode.yaml'
      verification:
        - 'JAVA_HOME=$HOME/.sdkman/candidates/java/25.0.4-tem ./mvnw test -Dtest=''ArchitectureDriftTest,ArchitectureImpactTest'''
        - 'npm run sample:build && git diff --stat -- src/main/resources/editor-webapp/samples/archicode.yaml'
        - 'grep -c ''import_likec4'' docs/architecture/manifests/archicode.yaml'
      risk: 'low'
      confidence: 80
      human_review: 'none'
      escalation_triggers:
        - 'the architecture file or its sample carries uncommitted edits from another run (RISK-8): touch only the lines for the importer and keep the others as they are'
        - 'an impact question changes: change the model and the question in the same task'
      delegation_tier: 'standard'
    - id: task-010
      title: 'Final check: the gates of the run on the packaged application and the whole suite'
      source_requirements:
        prd:
          - 'none: there is no PRD (profile TDD+pln); the REQ-n of the TDD are listed with the TDD items'
        tdd:
          - 'REQ-2'
          - 'REQ-3'
          - 'REQ-4'
          - 'REQ-5'
          - 'DEC-10'
          - 'RISK-3'
          - 'RISK-4'
          - 'CON-8'
      outputs:
        - 'the gate commands and their results recorded in prg-0229-likec4-json-import.md'
        - 'a statement of whether the Native job was proved (it is not, on a branch)'
      verification:
        - 'JAVA_HOME=$HOME/.sdkman/candidates/java/25.0.4-tem ./mvnw test-compile pmd:check'
        - 'JAVA_HOME=$HOME/.sdkman/candidates/java/25.0.4-tem ./mvnw verify -DskipITs=false'
        - 'scripts/byte-identity.sh'
        - 'npm run test:unit'
        - 'npm run test:coverage'
        - 'npm run format:check'
        - 'npm run lint'
        - 'npm run editor:build && npm run sample:build && git status --short'
        - 'git diff --stat -- scripts/byte-identity-exceptions.txt src/main/rust src/main/wasm src/test/resources/structurizr'
      risk: 'medium'
      confidence: 70
      human_review: 'after'
      escalation_triggers:
        - 'byte-identity.sh needs a new exception or an existing command changes its output: stop and log, the importer must not change another command'
        - 'a command fails for a reason outside the importer (a base already red): record it and do not fix it'
        - 'npm run editor:build or sample:build leaves git status changed by a file of the run: fix the source and rerun'
      delegation_tier: 'standard'
```

## 5. Parallelization Plan

```yaml
parallelization_plan:
  groups:
    - id: parallel-group-001
      tasks:
        - task-001
        - task-002
      reason: 'The sample with its facts and the move of the shared part share no file and no type'
      conflict_risks:
        - 'task-001 writes under src/test/resources/likec4 and the run prg; task-002 writes in the package importer and its tests: disjoint'
    - id: parallel-group-002
      tasks:
        - task-007
        - task-009
      reason: 'The integration and editor tests and the model of ArchiCode touch disjoint paths'
      conflict_risks:
        - 'task-009 regenerates the sample bundle of the editor, which task-007 does not read'
        - 'task-008 waits for task-007 because both touch the tests of the command line (HelpIT, and src/test/CLAUDE.md after the counts of task-006)'
```

## 6. Human Review Gates

```yaml
human_review_gates:
  gates:
    - id: gate-001
      trigger: 'The run downloads and runs a third-party npm package in a scratch folder and commits one third-party file (task-001), and moves code shared with a shipped command (task-002)'
      required_before: []
      required_after: ['task-010']
      reviewer_focus:
        - 'the provenance, the licence, the tool version and the size of the sample, and that nothing the tool installed entered the repository or package.json'
        - 'that the Structurizr goldens and the byte-identity exceptions are untouched'
        - 'the --map options chosen for the sample and the sentence for a .c4 input'
```

The gate does not stop the run: no task is `human_required`. The review is the independent verification of the tasks it covers and the author's reading of the pull request.

## 7. Risk Assessment

```yaml
risk_assessment:
  by_task:
    - id: task-001
      risk: 'medium'
      rationale: 'Runs a downloaded package (with --ignore-scripts, outside the repository) and depends on a tool the drafting session could not run; a failure stops the importer'
    - id: task-002
      risk: 'medium'
      rationale: 'Changes a shipped command''s code; the output must not change, guarded by the existing goldens'
    - id: task-003
      risk: 'medium'
      rationale: 'Reads an external format whose shape is known from vendor source and checked on the sample'
    - id: task-004
      risk: 'medium'
      rationale: 'The kind mapping and the nesting check carry the refusals the gate asks for'
    - id: task-005
      risk: 'medium'
      rationale: 'New command with a Picocli Map option and a native reflection entry'
    - id: task-006
      risk: 'medium'
      rationale: 'The golden joins the shipped corpus and the mistake sweep'
    - id: task-007
      risk: 'medium'
      rationale: 'Runs on the packaged jar; low design risk'
    - id: task-008
      risk: 'low'
      rationale: 'Documentation and goldens; the generated listing moves'
    - id: task-009
      risk: 'low'
      rationale: 'Edits a file that carries another run''s uncommitted edits'
    - id: task-010
      risk: 'medium'
      rationale: 'Many commands; a base already red is recorded, not fixed'
  by_area:
    - area: 'data'
      risk: 'medium'
      rationale: 'An external format read with Jackson; the sample is the canary for a later version'
    - area: 'api'
      risk: 'low'
      rationale: 'One additive command; no existing command changes its output (byte-identity.sh)'
    - area: 'security'
      risk: 'low'
      rationale: 'Untrusted input produces file names only through the id rewrite; the tool runs with --ignore-scripts outside the repository'
    - area: 'docs'
      risk: 'low'
      rationale: 'The manual, the notes and the model say what the command does'
```

## 8. Confidence Assessment

```yaml
confidence_assessment:
  by_task:
    - id: task-001
      score: 65
      rationale: 'The tool has not been run yet (Q-5) and the sample facts are unknown'
    - id: task-002
      score: 80
      rationale: 'A move guarded by existing goldens'
    - id: task-003
      score: 75
      rationale: 'Shape read from vendor source, checked on the sample'
    - id: task-004
      score: 70
      rationale: 'Most decisions of the TDD land here; the nesting read is a choice between two options'
    - id: task-005
      score: 75
      rationale: 'The Picocli Map option is new; the native proof is outside the branch'
    - id: task-006
      score: 70
      rationale: 'Corpus counts and the sweep may surprise'
    - id: task-007
      score: 70
      rationale: 'Pattern of the first importer''s tests'
    - id: task-008
      score: 80
      rationale: 'Regenerated goldens and prose'
    - id: task-009
      score: 80
      rationale: 'Small edit with a shared file'
    - id: task-010
      score: 70
      rationale: 'Many gates; failures outside the run are recorded'
```

## 9. Agent Assignment Plan

```yaml
agent_assignment_plan:
  assignments:
    - task_id: task-001
      agent_role: 'Documentation Agent'
      objective: 'In a scratch folder outside the repository run npm install --ignore-scripts likec4@1.60.0 (state the package, version and source in the prg line before doing so; re-read the registry for a newer version per Q-3), clone github.com/likec4/likec4 at the tag v1.60.0 (record the 40-hex commit), run likec4 export json --help and then likec4 export json --skip-layout --project cloud-system on examples/cloud-system, empty the views key to {} with jq, copy the root LICENSE of the repository at that commit to LICENSE-MIT.txt and write PROVENANCE.md (repository URL, example path, exact tool version, exact command, commit SHA, date, size, the sentence that the only change is the removal of views). Then read the file: record the kinds of elements, the (parent kind, child kind) pairs from the dotted ids, whether description is a text or an object, whether imports is empty, whether elements and relations are objects; choose the --map options that make the sample load under Nesting; fix the DEC-1 sentence to what the tool printed; grep src/test and the docs for literal counts of shipped manifests or workspaces. Append a Facts block to the run prg. Nothing the tool installs is committed.'
      context:
        prd_excerpts:
          - 'none: there is no PRD (profile TDD+pln); the REQ-n of the TDD are listed with the TDD items'
        tdd_excerpts:
          - 'REQ-1'
          - 'REQ-7'
          - 'DEC-1'
          - 'DEC-4'
          - 'DEC-9'
          - 'IMP-8'
          - 'ASM-1'
          - 'ASM-3'
          - 'ASM-4'
          - 'Q-2'
          - 'Q-3'
          - 'Q-5'
          - 'Q-6'
          - 'RISK-1'
          - 'RISK-2'
          - 'RISK-5'
      likely_files:
        - 'src/test/resources/likec4/cloud-system.json'
        - 'src/test/resources/likec4/LICENSE-MIT.txt'
        - 'src/test/resources/likec4/PROVENANCE.md'
        - 'docs/wav/wav-034-diagrams-assets-likec4-matrix-page/run/run-0229-likec4-json-import/prg-0229-likec4-json-import.md'
      acceptance_criteria:
        - 'src/test/resources/likec4/ holds cloud-system.json, LICENSE-MIT.txt and PROVENANCE.md'
        - 'PROVENANCE.md contains github.com/likec4/likec4, the tool version, the command and a 40-hex SHA'
        - 'jq reads elements from the sample, its views are {} and the element count is recorded in the Facts block'
        - 'the Facts block lists the kinds, the nesting pairs, the --map options chosen and the literal counts found'
        - 'no file of the tool is added under the repository except the three files above'
      verification:
        - 'ls src/test/resources/likec4/'
        - 'grep -E ''[0-9a-f]{40}'' src/test/resources/likec4/PROVENANCE.md'
        - 'grep -q ''github.com/likec4/likec4'' src/test/resources/likec4/PROVENANCE.md'
        - 'jq ''.elements | length'' src/test/resources/likec4/cloud-system.json'
        - 'jq -e ''.views == {}'' src/test/resources/likec4/cloud-system.json'
        - 'grep -q ''MIT License'' src/test/resources/likec4/LICENSE-MIT.txt'
      escalation_triggers:
        - 'npm or the registry is not reachable, or likec4 export json cannot run in the agent session (Q-5): stop, log the reason in the prg and leave the importer waiting; do not write a sample by hand'
        - 'the export is not one object with an elements object, or elements is an array (ASM-1): stop and log the shape found, the reader design needs a decision'
        - 'no (parent kind, child kind) mapping of the sample can load under Nesting (RISK-2): stop with the finding; Nesting is not weakened and the sample is edited only by removing views'
        - 'the example folder holds a licence other than the root MIT one at the commit (ASM-4)'
      suggested_subagent_type: 'general-purpose'
      suggested_model: '(default)'
      suggested_effort: 'high'
    - task_id: task-002
      agent_role: 'Refactoring Agent'
      objective: 'Move, without changing a byte of the Structurizr output: the id rule (slug, rewritesCharacter, hasAlphanumeric) and the suffix loop into ImportIds with assign(bases, rewritten) returning the ids and the rewritten flags; WORKSPACE_FILE, parse, reason, serialize and add into ImportSupport; the nested records Planned and WorkspaceFile into top-level public records of the package with the same fields. StructurizrMapper and StructurizrImportService call them and keep their own fallback id. Grep first that no caller outside importer/ and its tests reads the nested records. Add ImportIdsTest (camel case lowercased, odd characters, a segment such as .. or x/y, a fallback, a collision suffix that skips a sibling already named x_2) and change the one reference in StructurizrMapperTest. Do not edit anything under src/test/resources/structurizr.'
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
          - 'CON-8'
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
        - 'the four shared types exist and StructurizrMapper and StructurizrImportService call them'
        - 'ImportIdsTest, the Structurizr tests and ImportFilesTest pass'
        - 'git diff --stat -- src/test/resources/structurizr prints nothing'
        - 'the only edit of an existing test is the one reference of StructurizrMapperTest'
      verification:
        - 'JAVA_HOME=$HOME/.sdkman/candidates/java/25.0.4-tem ./mvnw test -Dtest=''ImportIdsTest,Structurizr*Test,ImportFilesTest'''
        - 'git diff --stat -- src/test/resources/structurizr'
        - 'grep -rn ''StructurizrMapper.Planned\|StructurizrMapper.WorkspaceFile'' src | wc -l'
      escalation_triggers:
        - 'a Structurizr golden or test needs an edit to pass: stop, the move changed the output (CON-8); fix the move, never the golden'
        - 'a caller of the nested records outside importer/ and its tests is found: log it and update that caller only if it is a one-line rename'
        - 'the existing tests of the first importer are red on the starting repository: record it and do not fix it'
      suggested_subagent_type: 'general-purpose'
      suggested_model: '(default)'
      suggested_effort: 'medium'
    - task_id: task-003
      agent_role: 'Backend Implementation Agent'
      objective: 'Test first, then write LikeC4Model (records Element, Link and Dropped) and a pure LikeC4Reader on a Jackson JsonNode. It reads an object, or an array selected by --project (DEC-2: one-object array read as that object, several without --project refused with the ids, a project not held refused, an empty array or a scalar refused), keeps the elements with id, kind, title, description (a text, or an object with txt or md, or summary), technology and tags, keeps the relations with their ends as model references, and counts the parts present and not carried in the order of DEC-8 (views, deployment elements, deployment relationships, styles, metadata, links, globals, imports, diffs, manual layouts). Refusals: no elements object, an element with no kind (CTR-1; the reader takes a parsed JsonNode, so the missing file, the folder and the non-JSON cases are the service's, task-005). Cases on small inline JSON, then on the sample: the number of elements read equals the count read from the file by the test, not a literal. Each refusal is one error: line with no stack trace.'
      context:
        prd_excerpts:
          - 'none: there is no PRD (profile TDD+pln); the REQ-n of the TDD are listed with the TDD items'
        tdd_excerpts:
          - 'REQ-2'
          - 'REQ-3'
          - 'REQ-6'
          - 'TG-1'
          - 'DEC-1'
          - 'DEC-2'
          - 'DEC-8'
          - 'CTR-1'
          - 'IF-2'
          - 'IMP-1'
          - 'IMP-4'
          - 'ASM-1'
          - 'ASM-2'
      likely_files:
        - 'src/main/java/io/morin/archicode/importer/LikeC4Model.java'
        - 'src/main/java/io/morin/archicode/importer/LikeC4Reader.java'
        - 'src/test/java/io/morin/archicode/importer/LikeC4ReaderTest.java'
      acceptance_criteria:
        - 'LikeC4ReaderTest passes'
        - 'the reader opens no file and imports nothing from cli/'
        - 'the number of elements read from the sample equals the count read from the file'
        - 'every refusal sentence of DEC-2 and CTR-1 is asserted'
      verification:
        - 'JAVA_HOME=$HOME/.sdkman/candidates/java/25.0.4-tem ./mvnw test -Dtest=LikeC4ReaderTest'
      escalation_triggers:
        - 'the sample shows a shape other than ASM-1 (task-001 Facts block): stop and log it before coding the reader'
        - 'a refusal sentence of the TDD cannot be produced with one error: line: log it as a finding'
      suggested_subagent_type: 'general-purpose'
      suggested_model: '(default)'
      suggested_effort: 'medium'
    - task_id: task-004
      agent_role: 'Backend Implementation Agent'
      objective: 'Test first, then write the pure LikeC4Mapper: the model and the kind mapping in, Mapped out (Planned manifests, workspace file, element and relationship counts, dropped counts, rewrites). Defaults actor to person, system, container and component; --map overrides; errors in the order of DEC-4 (malformed, duplicated or out-of-list --map, a --map for an absent kind, kinds with no target listed together in the order of first use); nesting checked on the whole model with the sentence of DEC-5, reading the rule from Nesting; a parent absent from the file refused (CTR-1); ids from the last segment through ImportIds with the fallback kind_n, the tags likec4.id and likec4.kind, name from the title; header.kind is the full ManifestKind id (ManifestKind.getId()); relationships on the source with label, qualifiers (technology then the LikeC4 tags) and tags, resolved in a map built first, ends not imported dropped and counted, bidirectional written once and counted; workspace name from project.title, project.name, projectId, else the file name. Cases include camel case, a collision, a segment .., an unmapped kind, a --map for an absent kind, a bad nesting, a missing parent, and the load of a mapped sample under the loader.'
      context:
        prd_excerpts:
          - 'none: there is no PRD (profile TDD+pln); the REQ-n of the TDD are listed with the TDD items'
        tdd_excerpts:
          - 'REQ-2'
          - 'REQ-3'
          - 'REQ-6'
          - 'TG-2'
          - 'TG-3'
          - 'DEC-3'
          - 'DEC-4'
          - 'DEC-5'
          - 'DEC-6'
          - 'DEC-7'
          - 'DEC-10'
          - 'CTR-2'
          - 'ASM-6'
          - 'IMP-1'
          - 'IMP-4'
          - 'RISK-6'
      likely_files:
        - 'src/main/java/io/morin/archicode/importer/LikeC4Mapper.java'
        - 'src/test/java/io/morin/archicode/importer/LikeC4MapperTest.java'
      acceptance_criteria:
        - 'LikeC4MapperTest passes'
        - 'a mapped model loads under the loader in a test with no mistake'
        - 'every error sentence of DEC-4 and DEC-5 is asserted as one error: line'
        - 'a file name built from an id holds only [a-z0-9_.-]'
      verification:
        - 'JAVA_HOME=$HOME/.sdkman/candidates/java/25.0.4-tem ./mvnw test -Dtest=''LikeC4MapperTest,ImportIdsTest'''
      escalation_triggers:
        - 'Nesting cannot be read without a change under resource/ (DEC-5): choose the other of the two reads the TDD names, and if neither works stop and log it'
        - 'the loader refuses what the mapper writes: fix the mapper, never the loader'
      suggested_subagent_type: 'general-purpose'
      suggested_model: '(default)'
      suggested_effort: 'medium'
    - task_id: task-005
      agent_role: 'Backend Implementation Agent'
      objective: 'Write LikeC4ImportService (refuse a .c4 name with the DEC-1 sentence fixed by task-001, refuse a name that is not .json, refuse an input that is a folder or a missing file, check the output folder, parse, read, map, serialize through ImportSupport, commit through ImportFiles, then queue the warnings in the order of DEC-8 only after the move succeeded) and ImportLikeC4Command (name likec4, <model.json>, -o/--output required, repeatable --map as a Picocli Map<String,String>, --project; prints imported <n> elements and <m> relationships into <folder>; loads no workspace). Add the command to ImportGroup and the entry of the command to reflect-config.json. Service tests on the fake ImportFiles of run 0224: a refused folder is unchanged, a failed write leaves nothing and queues no warning, the report lists every dropped part present in a copy of the sample with a views entry added, and the .c4, non-JSON, unmapped kind, array and --project cases.'
      context:
        prd_excerpts:
          - 'none: there is no PRD (profile TDD+pln); the REQ-n of the TDD are listed with the TDD items'
        tdd_excerpts:
          - 'REQ-2'
          - 'REQ-3'
          - 'REQ-4'
          - 'REQ-6'
          - 'DEC-1'
          - 'DEC-7'
          - 'DEC-8'
          - 'CTR-3'
          - 'IF-1'
          - 'IF-2'
          - 'FLOW-1'
          - 'IMP-1'
          - 'IMP-3'
          - 'IMP-7'
          - 'CON-2'
          - 'CON-3'
          - 'RISK-4'
      likely_files:
        - 'src/main/java/io/morin/archicode/importer/LikeC4ImportService.java'
        - 'src/main/java/io/morin/archicode/cli/ImportLikeC4Command.java'
        - 'src/main/java/io/morin/archicode/cli/ImportGroup.java'
        - 'src/main/resources/META-INF/native-image/io.morin.archicode/archicode/reflect-config.json'
        - 'src/test/java/io/morin/archicode/importer/LikeC4ImportServiceTest.java'
      acceptance_criteria:
        - 'LikeC4ImportServiceTest and NativeReflectionConfigTest pass'
        - 'ImportGroup lists both commands'
        - 'reflect-config.json names cli.ImportLikeC4Command'
        - 'every refusal is one error: line, exit 1, nothing written; warnings are queued only on success'
      verification:
        - 'JAVA_HOME=$HOME/.sdkman/candidates/java/25.0.4-tem ./mvnw test -Dtest=''LikeC4ImportServiceTest,NativeReflectionConfigTest,Structurizr*Test'''
        - 'grep -c LikeC4 src/main/resources/META-INF/native-image/io.morin.archicode/archicode/reflect-config.json'
      escalation_triggers:
        - 'a refusal prints a stack trace or two lines: fix the command, one error: line is the contract (CON-3)'
        - 'Picocli cannot bind a repeatable Map option in the native runner: record it as RISK-4 for the Native job of the pull request, do not change the option form'
      suggested_subagent_type: 'general-purpose'
      suggested_model: '(default)'
      suggested_effort: 'medium'
    - task_id: task-006
      agent_role: 'Test Generation Agent'
      objective: 'Write LikeC4GoldenTest as StructurizrGoldenTest is (import the sample with the --map options chosen by task-001 into a temp folder, compare byte for byte with src/test/resources/likec4/expected/, regenerate with -Darchicode.golden.regenerate=true), generate and read the golden, write expected-report.txt, and update every literal count of shipped manifests or workspaces that task-001 found, in tests, in src/test/CLAUDE.md only for such a count (the notes of the second importer are task-008). Run the corpus tests, the shipped-files tests of Java and node, and MistakeSweepTest; handle a trace as the escalation says. The golden is a workspace loaded by ShippedFilesTest and shipped-files.test.js with no entry of exceptions.json.'
      context:
        prd_excerpts:
          - 'none: there is no PRD (profile TDD+pln); the REQ-n of the TDD are listed with the TDD items'
        tdd_excerpts:
          - 'REQ-2'
          - 'REQ-4'
          - 'TG-5'
          - 'DEC-9'
          - 'DEC-10'
          - 'IMP-5'
          - 'CON-4'
          - 'RISK-5'
      likely_files:
        - 'src/test/resources/likec4/expected/'
        - 'src/test/resources/likec4/expected-report.txt'
        - 'src/test/java/io/morin/archicode/importer/LikeC4GoldenTest.java'
        - 'src/test/resources/known-traces.json'
      acceptance_criteria:
        - 'LikeC4GoldenTest passes and the output is byte for byte the golden'
        - 'ShippedFilesTest, the corpus tests and MistakeSweepTest pass with no entry of exceptions.json for the golden'
        - 'npm run test:unit passes'
        - 'the sum rule of DEC-10 holds on the sample: the written elements equal the elements read from the file'
      verification:
        - 'JAVA_HOME=$HOME/.sdkman/candidates/java/25.0.4-tem ./mvnw test -Dtest=''LikeC4GoldenTest,ShippedFilesTest,ManifestSchemaCorpusTest,ManifestRoundTripCorpusTest,MistakeSweepTest'''
        - 'npm run test:unit'
      escalation_triggers:
        - 'MistakeSweepTest ends in a stack trace on header.parent of an imported element: if the cause is the importer, fix the mapper; if not, add a reasoned entry of known-traces.json'
        - 'a literal count outside the list of task-001 moves: update it and say so in the prg'
      suggested_subagent_type: 'general-purpose'
      suggested_model: '(default)'
      suggested_effort: 'medium'
    - task_id: task-007
      agent_role: 'Test Generation Agent'
      objective: 'Write LikeC4ImportIT on the pattern of StructurizrImportIT: import the sample into an empty folder with the --map options of task-001 (exit 0, one warning line per dropped part present, no stack trace), query graph on the output has as many elements as the sample (read by the test from the file), a .c4 input, a non-empty folder, a sample with an unmapped kind and an array of two projects are each one error: line with exit 1 and the folder unchanged, and --map for each listed kind exits 0. Write likec4-import-workspace.test.js on the pattern of structurizr-import-workspace.test.js: the editor opens src/test/resources/likec4/expected/ with no mistake, no duplicate reference and as many elements as the sample.'
      context:
        prd_excerpts:
          - 'none: there is no PRD (profile TDD+pln); the REQ-n of the TDD are listed with the TDD items'
        tdd_excerpts:
          - 'REQ-2'
          - 'REQ-3'
          - 'REQ-4'
          - 'IMP-6'
          - 'IF-3'
          - 'RISK-2'
          - 'RISK-4'
      likely_files:
        - 'src/test/java/io/morin/archicode/it/LikeC4ImportIT.java'
        - 'src/test/javascript/viewpoint-kernel/likec4-import-workspace.test.js'
      acceptance_criteria:
        - 'LikeC4ImportIT passes against the packaged jar'
        - 'the node test passes'
        - 'git diff --stat -- src/main/editor prints nothing for the run'
      verification:
        - 'node --test src/test/javascript/viewpoint-kernel/likec4-import-workspace.test.js'
        - 'JAVA_HOME=$HOME/.sdkman/candidates/java/25.0.4-tem ./mvnw verify -DskipITs=false -Dit.test=LikeC4ImportIT'
      escalation_triggers:
        - 'the packaged jar cannot be built in the session: run the node test, record the IT as not run and let task-010 say it'
        - 'the editor refuses the golden: fix the mapper, never the editor (no change under src/main/editor)'
      suggested_subagent_type: 'general-purpose'
      suggested_model: '(default)'
      suggested_effort: 'medium'
    - task_id: task-008
      agent_role: 'Documentation Agent'
      objective: 'Regenerate the guide golden and update the expectations of HelpIT (only the new command may differ); add the section [[import-likec4]] after [[import-structurizr]] in src/doc/README.adoc (how to export the JSON with likec4 export json, what is read, the default mapping and --map, the ids and the tags likec4.id and likec4.kind, what is dropped, the refusals), name it in the hand-written line of import, and make the generated listing hold the command (CommandReferenceTest); add the anchor to the manual tests if needed; write a short section for the second importer and the shared classes in src/main/java/io/morin/archicode/CLAUDE.md and a paragraph on the LikeC4 import golden in src/test/CLAUDE.md. The notes state what is true now: no wave, run or issue ids, no dates. Manual [source] blocks are read by tests: run them.'
      context:
        prd_excerpts:
          - 'none: there is no PRD (profile TDD+pln); the REQ-n of the TDD are listed with the TDD items'
        tdd_excerpts:
          - 'REQ-5'
          - 'REQ-8'
          - 'CON-7'
          - 'CON-9'
          - 'IMP-9'
          - 'IMP-10'
          - 'IMP-11'
          - 'RISK-7'
      likely_files:
        - 'src/test/resources/guide/golden.md'
        - 'src/test/java/io/morin/archicode/it/HelpIT.java'
        - 'src/doc/README.adoc'
        - 'src/main/java/io/morin/archicode/CLAUDE.md'
        - 'src/test/CLAUDE.md'
      acceptance_criteria:
        - 'GuideTest, CommandReferenceTest and HelpIT pass'
        - 'the manual has the section import-likec4 and names the command in the line of import'
        - 'the two CLAUDE.md files have no wave, run or issue id'
      verification:
        - 'JAVA_HOME=$HOME/.sdkman/candidates/java/25.0.4-tem ./mvnw test -Dtest=''GuideTest,CommandReferenceTest,HelpIT'''
        - 'npm run test:unit'
        - 'grep -c ''import-likec4'' src/doc/README.adoc'
        - 'grep -c ''import likec4'' src/test/resources/guide/golden.md'
      escalation_triggers:
        - 'the regenerated guide golden differs by more than the new command: stop and read the diff, only the new command may differ'
        - 'a test reads a literal of the manual that the new section moves: update it and say so in the prg'
      suggested_subagent_type: 'general-purpose'
      suggested_model: '(default)'
      suggested_effort: 'low'
    - task_id: task-009
      agent_role: 'Documentation Agent'
      objective: 'Read docs/architecture/manifests/archicode.yaml as it is in the working tree (it has uncommitted edits of another run) and add only the element import_likec4 (tags.path of ImportGroup.java and ImportLikeC4Command.java, its relationship to importer) and the description of importer, which no longer says only Structurizr. Update impact-questions.json only if a question changes. Run npm run sample:build last so that the bundle is the one of the folder.'
      context:
        prd_excerpts:
          - 'none: there is no PRD (profile TDD+pln); the REQ-n of the TDD are listed with the TDD items'
        tdd_excerpts:
          - 'REQ-5'
          - 'REQ-8'
          - 'IMP-12'
          - 'RISK-8'
      likely_files:
        - 'docs/architecture/manifests/archicode.yaml'
        - 'src/main/resources/editor-webapp/samples/archicode.yaml'
      acceptance_criteria:
        - 'ArchitectureDriftTest and ArchitectureImpactTest pass'
        - 'every tags.path of the new element exists'
        - 'npm run sample:build leaves the bundle equal to the folder (a second run changes nothing)'
        - 'lines of other runs in the two files are unchanged'
      verification:
        - 'JAVA_HOME=$HOME/.sdkman/candidates/java/25.0.4-tem ./mvnw test -Dtest=''ArchitectureDriftTest,ArchitectureImpactTest'''
        - 'npm run sample:build && git diff --stat -- src/main/resources/editor-webapp/samples/archicode.yaml'
        - 'grep -c ''import_likec4'' docs/architecture/manifests/archicode.yaml'
      escalation_triggers:
        - 'the architecture file or its sample carries uncommitted edits from another run (RISK-8): touch only the lines for the importer and keep the others as they are'
        - 'an impact question changes: change the model and the question in the same task'
      suggested_subagent_type: 'general-purpose'
      suggested_model: '(default)'
      suggested_effort: 'low'
    - task_id: task-010
      agent_role: 'QA Agent'
      objective: 'On the packaged application run by hand the gate commands: import likec4 on the sample with an empty output folder (exit 0, one warning per dropped part present), query graph on the output compared with jq ".elements|length" of the sample, a .c4 input, a non-empty folder and an unmapped kind (each one error: line, exit 1), and the --map form for the listed kinds. Run PMD, verify with the integration tests, byte-identity, the node tests, coverage, format, lint, editor:build and sample:build with git status --short unchanged by the last two. Record each command and its result in the run prg and say that the native image was not proved on the branch. Fix a failure only when its cause is in the files of this run.'
      context:
        prd_excerpts:
          - 'none: there is no PRD (profile TDD+pln); the REQ-n of the TDD are listed with the TDD items'
        tdd_excerpts:
          - 'REQ-2'
          - 'REQ-3'
          - 'REQ-4'
          - 'REQ-5'
          - 'DEC-10'
          - 'RISK-3'
          - 'RISK-4'
          - 'CON-8'
      likely_files:
        - 'docs/wav/wav-034-diagrams-assets-likec4-matrix-page/run/run-0229-likec4-json-import/prg-0229-likec4-json-import.md'
      acceptance_criteria:
        - 'every gate command exits 0 or the exception is recorded with its cause'
        - 'git diff --stat of the exceptions file, src/main/rust, src/main/wasm and src/test/resources/structurizr prints nothing for the run'
        - 'the Facts and gate results are in the run prg'
      verification:
        - 'JAVA_HOME=$HOME/.sdkman/candidates/java/25.0.4-tem ./mvnw test-compile pmd:check'
        - 'JAVA_HOME=$HOME/.sdkman/candidates/java/25.0.4-tem ./mvnw verify -DskipITs=false'
        - 'scripts/byte-identity.sh'
        - 'npm run test:unit'
        - 'npm run test:coverage'
        - 'npm run format:check'
        - 'npm run lint'
        - 'npm run editor:build && npm run sample:build && git status --short'
        - 'git diff --stat -- scripts/byte-identity-exceptions.txt src/main/rust src/main/wasm src/test/resources/structurizr'
      escalation_triggers:
        - 'byte-identity.sh needs a new exception or an existing command changes its output: stop and log, the importer must not change another command'
        - 'a command fails for a reason outside the importer (a base already red): record it and do not fix it'
        - 'npm run editor:build or sample:build leaves git status changed by a file of the run: fix the source and rerun'
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
        - 'file checks'
        - 'jq on the sample'
      success_criteria:
        - 'src/test/resources/likec4/ holds cloud-system.json, LICENSE-MIT.txt and PROVENANCE.md'
        - 'PROVENANCE.md contains github.com/likec4/likec4, the tool version, the command and a 40-hex SHA'
        - 'jq reads elements from the sample, its views are {} and the element count is recorded in the Facts block'
        - 'the Facts block lists the kinds, the nesting pairs, the --map options chosen and the literal counts found'
        - 'no file of the tool is added under the repository except the three files above'
    - task_id: task-002
      methods:
        - 'unit tests'
        - 'regression of the Structurizr goldens'
      success_criteria:
        - 'the four shared types exist and StructurizrMapper and StructurizrImportService call them'
        - 'ImportIdsTest, the Structurizr tests and ImportFilesTest pass'
        - 'git diff --stat -- src/test/resources/structurizr prints nothing'
        - 'the only edit of an existing test is the one reference of StructurizrMapperTest'
    - task_id: task-003
      methods:
        - 'unit tests'
      success_criteria:
        - 'LikeC4ReaderTest passes'
        - 'the reader opens no file and imports nothing from cli/'
        - 'the number of elements read from the sample equals the count read from the file'
        - 'every refusal sentence of DEC-2 and CTR-1 is asserted'
    - task_id: task-004
      methods:
        - 'unit tests'
        - 'loader round trip'
      success_criteria:
        - 'LikeC4MapperTest passes'
        - 'a mapped model loads under the loader in a test with no mistake'
        - 'every error sentence of DEC-4 and DEC-5 is asserted as one error: line'
        - 'a file name built from an id holds only [a-z0-9_.-]'
    - task_id: task-005
      methods:
        - 'unit tests'
        - 'native reflection test'
      success_criteria:
        - 'LikeC4ImportServiceTest and NativeReflectionConfigTest pass'
        - 'ImportGroup lists both commands'
        - 'reflect-config.json names cli.ImportLikeC4Command'
        - 'every refusal is one error: line, exit 1, nothing written; warnings are queued only on success'
    - task_id: task-006
      methods:
        - 'golden test'
        - 'corpus tests'
        - 'node tests'
      success_criteria:
        - 'LikeC4GoldenTest passes and the output is byte for byte the golden'
        - 'ShippedFilesTest, the corpus tests and MistakeSweepTest pass with no entry of exceptions.json for the golden'
        - 'npm run test:unit passes'
        - 'the sum rule of DEC-10 holds on the sample: the written elements equal the elements read from the file'
    - task_id: task-007
      methods:
        - 'integration test on the jar'
        - 'node test'
      success_criteria:
        - 'LikeC4ImportIT passes against the packaged jar'
        - 'the node test passes'
        - 'git diff --stat -- src/main/editor prints nothing for the run'
    - task_id: task-008
      methods:
        - 'guide, help and manual tests'
      success_criteria:
        - 'GuideTest, CommandReferenceTest and HelpIT pass'
        - 'the manual has the section import-likec4 and names the command in the line of import'
        - 'the two CLAUDE.md files have no wave, run or issue id'
    - task_id: task-009
      methods:
        - 'architecture drift and impact tests'
        - 'sample build'
      success_criteria:
        - 'ArchitectureDriftTest and ArchitectureImpactTest pass'
        - 'every tags.path of the new element exists'
        - 'npm run sample:build leaves the bundle equal to the folder (a second run changes nothing)'
        - 'lines of other runs in the two files are unchanged'
    - task_id: task-010
      methods:
        - 'PMD'
        - 'verify with the integration tests'
        - 'byte-identity'
        - 'node tests'
        - 'format'
        - 'lint'
      success_criteria:
        - 'every gate command exits 0 or the exception is recorded with its cause'
        - 'git diff --stat of the exceptions file, src/main/rust, src/main/wasm and src/test/resources/structurizr prints nothing for the run'
        - 'the Facts and gate results are in the run prg'
```

## 11. Escalation Rules

This run operates under the autonomy of the wave: no task is `human_required` or critical, so none is executed against a human gate; if the launch carries an autonomy override it is logged in the wave's progress log.

```yaml
escalation_rules:
  rules:
    - condition: 'The vendor tool cannot be run, or the registry or the network is absent (Q-5)'
      action: 'Stop task-001, log the reason in the prg, write no sample by hand, and leave the importer waiting; say so in the final check'
    - condition: 'The export is not the shape of ASM-1, or no mapping of the sample can load under Nesting (RISK-2)'
      action: 'Stop and log the finding; Nesting is not weakened and the sample is edited only by removing views'
    - condition: 'The loader or the editor refuses what the mapper writes'
      action: 'Fix the mapper; never change the loader or the editor; if the rule cannot be met, log a finding and stop the task'
    - condition: 'A Structurizr golden needs an edit, or byte-identity.sh needs a new exception, or an existing command changes its output'
      action: 'Stop and log: the move and the importer must not change another command'
    - condition: 'A command fails for a reason outside the run (a base that is already red)'
      action: 'Record it in the task and do not fix it'
    - condition: 'A task is flagged human_required or risk critical by a later edit'
      action: 'The implement workflow stops with awaiting-human unless the launch carries the autonomy override'
```

## 12. Final Execution Manifest

```yaml
execution_manifest:
  status: 'in_progress'
  recommendation: 'proceed_with_review'
  autonomy_level: 'medium'
  total_tasks: 10
  autonomous_tasks: 6
  review_before_tasks: 1
  review_after_tasks: 3
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
    - task-010
  parallel_groups:
    - parallel-group-001
    - parallel-group-002
  required_human_gates:
    - gate-001
  highest_risk_tasks:
    - task-001
    - task-002
    - task-005
  lowest_confidence_tasks:
    - task-001
    - task-004
    - task-006
  next_action: 'Start task-001 and task-002 in parallel: generate the cloud-system sample with the vendor tool and record its facts, and move the shared part out of the Structurizr importer'
  criteria:
    - 'The sample, golden and tests are in the working tree and pass'
    - 'The refusals are one error: line each with nothing written'
    - 'The gates exit 0 and byte-identity needs no new exception'
    - 'The manual, the guide, the notes and the model say what the command does'
```
