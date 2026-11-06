---
title: Execution Plan — Import a Structurizr workspace
status: done
date: 2026-11-05
related:
  - docs/wav/wav-033-import-structurizr-and-plateau-matrix/run/run-0224-structurizr-json-import/tdd-0224-structurizr-json-import.md
  - docs/wav/wav-033-import-structurizr-and-plateau-matrix/wav-033-import-structurizr-and-plateau-matrix.md
  - 'gh:tmorin/archicode#135'
type: pln
run: 0224
wave: 033
---

# Execution Plan: Import a Structurizr workspace

Profile TDD+pln: there is no PRD, so REQ-1 to REQ-9 are the IDs the TDD labels (section "PRD Traceability"), taken from issue #135, its author's decision of 2026-10-31 and the P1 gate of the wave. The TDD is the design (DEC-1 to DEC-9, IMP-1 to IMP-12, CTR-1 to CTR-3). The plan commits nothing: the commit is a human step outside it.

Autonomy: this wave runs with no autonomy override (the wave's progress log says "autonomy override: none"). The plan therefore has no `human_required` task and no task with `risk: critical` or `human_review: required`, so none stops for a human. The tasks that carry some weight are `review_before` (task-001, which downloads one third-party file) and `review_after` (task-004, which writes to the author's disk, and task-010, the final check); their independent verification runs at the elevated pair of the active profile, and the review is the verification of the run and the author's reading of the pull request.

The Stage 5 review of the TDD found 13 points (F1 to F13 in the prg). The plan was drafted from the corrections and Stage 9 amended the TDD to carry them, so the two agree; the corrections, as the plan applies them: `header.kind` is the full `ManifestKind` id (F1); the id fallback passes through the same rewrite and a hostile id is a unit case (F2); the writer settles an existing staging folder, an output that is a file, an absent parent (F3); "rewritten id" is defined once (F4); the mapper returns `Planned(path, Manifest)` and the service serializes (F5); the suffix takes the first unused one among all siblings (F6); the reason for not extending `FoldFiles` is that `commit` rewrites and never creates (F7); `import` joins the hand-written command list of the manual (F9); the golden joins `MistakeSweepTest` and `byte-identity.sh` (F10); the warnings are queued after the move (F13). DEC-10 of the first TDD text is folded into IMP-6 and Q-3 into DEC-4.

Every Maven command runs with `JAVA_HOME=$HOME/.sdkman/candidates/java/25.0.4-tem` (the shell Java is 21).

## 1. Executive Summary

```yaml
summary:
  status: 'done'
  product_goal: 'archicode import structurizr <workspace.json> --output <folder> turns the JSON export of a Structurizr workspace into an ArchiCode workspace that loads, and says what it left out'
  technical_approach: 'A new package importer (reader, mapper, files seam, service) behind a thin command in a new group import, proved by a committed Big Bank sample, a golden output, an integration test and an editor test'
  total_tasks: 10
  parallel_groups: 2
  high_risk_tasks: 0
  human_review_gates: 1
  autonomy_level: 'medium'
  recommendation: 'proceed_with_review'
  criteria:
    - 'The sample, its licence and its provenance are committed and the importer reads and maps it into a workspace that the command line and the editor load'
    - 'A .dsl input and a non-empty output folder are each one error: line, exit 1, nothing written'
    - 'The warnings name every dropped part present in the sample'
    - 'PMD, verify with the integration tests, byte-identity without a new exception, the node tests, format, lint, editor:build and sample:build all pass'
    - 'The manual, the guide, the command-line notes and the model of ArchiCode say what the command does'
```

## 2. PRD/TDD Consistency Assessment

```yaml
consistency_assessment:
  aligned_items:
    - 'REQ-1 to REQ-9 each map to at least one DEC and one IMP of the TDD, and each to a task below'
    - 'The gate commands of the wave (P1 criteria 1 to 4 and 7) are the verification of task-001, task-006, task-007 and task-010'
    - 'The new package, the thin command and the pure classes of the TDD are the split of task-002 to task-005'
  gaps:
    - id: gap-001
      type: 'contradiction'
      description: 'CTR-2 names header.kind as person, system, container, component; the loader reads the full ManifestKind id (review F1)'
      impact: 'high'
      recommendation: 'Task-003 uses ManifestKind.getId(); CTR-2 and DEC-3 now say the full id'
    - id: gap-002
      type: 'ambiguity'
      description: 'DEC-4 warned on some rewrites, Summary and REQ-6 on every one, DEC-9 once per id, and the TDD listed Q-3 as open (F4); resolved by Stage 9, a rewritten id is defined once in DEC-4'
      impact: 'medium'
      recommendation: 'Task-003 implements the definition of DEC-4; the TDD is aligned'
    - id: gap-003
      type: 'missing_technical_design'
      description: 'DEC-7 does not say what an existing staging folder, an output that is a file, an absent parent or a folder as input do (F3)'
      impact: 'medium'
      recommendation: 'Task-004 settles each with a test; the input folder is refused by the reader step of task-005'
    - id: gap-004
      type: 'risk'
      description: 'The fallback id and the suffix can collide or carry a raw Structurizr id into a file name (F2, F6)'
      impact: 'medium'
      recommendation: 'Task-003 cases for ../x and for a sibling named x_2'
    - id: gap-005
      type: 'missing_technical_design'
      description: 'The golden joins MistakeSweepTest and byte-identity.sh (F10), and the corpus may hold literal counts (RISK-5)'
      impact: 'medium'
      recommendation: 'Task-001 greps the literals, task-006 updates them and runs the sweep'
    - id: gap-006
      type: 'ambiguity'
      description: 'The wave scope says the manifests are written with FoldFiles and DEC-7 deviates on purpose'
      impact: 'low'
      recommendation: 'Task-004 builds ImportFiles; the deviation is recorded in DEC-7 and in the run document so the wave verification does not read it as a miss'
  blocking_gaps: []
```

## 3. Execution Graph

```yaml
execution_graph:
  nodes:
    - id: task-001
      status: 'done'
      title: 'Facts and sample: fetch the Big Bank export with its licence and provenance, confirm the .dsl export command, grep the literal counts the golden will move'
      depends_on: []
      produces:
        - 'src/test/resources/structurizr/big-bank-plc.json'
        - 'src/test/resources/structurizr/LICENSE-Apache-2.0.txt'
        - 'src/test/resources/structurizr/PROVENANCE.md'
        - 'a Facts block appended to prg-0224-structurizr-json-import.md (the commit SHA, the DSL export outcome, the literals found)'
      agent_role: 'Documentation Agent'
      autonomy: 'review_before'
      risk: 'medium'
      confidence: 70
    - id: task-002
      status: 'done'
      title: 'Reader and model: Structurizr JSON to StructurizrModel and counted Dropped, with the sentences of the refusals'
      depends_on: [task-001]
      produces:
        - 'src/main/java/io/morin/archicode/importer/StructurizrModel.java'
        - 'src/main/java/io/morin/archicode/importer/StructurizrReader.java'
        - 'src/test/java/io/morin/archicode/importer/StructurizrReaderTest.java'
      agent_role: 'Backend Implementation Agent'
      autonomy: 'autonomous'
      risk: 'medium'
      confidence: 80
    - id: task-003
      status: 'done'
      title: 'Mapper: ids from names, references, relationships, Planned manifests and the workspace file'
      depends_on: [task-002]
      produces:
        - 'src/main/java/io/morin/archicode/importer/StructurizrMapper.java'
        - 'src/test/java/io/morin/archicode/importer/StructurizrMapperTest.java'
      agent_role: 'Backend Implementation Agent'
      autonomy: 'autonomous'
      risk: 'medium'
      confidence: 70
    - id: task-004
      status: 'done'
      title: 'ImportFiles seam and DiskImportFiles: staging, all or nothing, refusals of the output folder'
      depends_on: [task-001]
      produces:
        - 'src/main/java/io/morin/archicode/importer/ImportFiles.java'
        - 'src/main/java/io/morin/archicode/importer/DiskImportFiles.java'
        - 'src/test/java/io/morin/archicode/importer/ImportFilesTest.java'
      agent_role: 'Backend Implementation Agent'
      autonomy: 'review_after'
      risk: 'medium'
      confidence: 70
    - id: task-005
      status: 'done'
      title: 'Service, command, group, report and native reflection'
      depends_on: [task-003, task-004]
      produces:
        - 'src/main/java/io/morin/archicode/importer/StructurizrImportService.java'
        - 'src/main/java/io/morin/archicode/cli/ImportGroup.java'
        - 'src/main/java/io/morin/archicode/cli/ImportStructurizrCommand.java'
        - 'src/main/java/io/morin/archicode/cli/ArchiCode.java'
        - 'src/main/resources/META-INF/native-image/io.morin.archicode/archicode/reflect-config.json'
        - 'src/test/java/io/morin/archicode/importer/StructurizrImportServiceTest.java'
      agent_role: 'Backend Implementation Agent'
      autonomy: 'autonomous'
      risk: 'medium'
      confidence: 75
    - id: task-006
      status: 'done'
      title: 'Golden output of the sample, report golden, and the shipped-corpus counts it moves'
      depends_on: [task-001, task-005]
      produces:
        - 'src/test/resources/structurizr/expected/'
        - 'src/test/resources/structurizr/expected-report.txt'
        - 'src/test/java/io/morin/archicode/importer/StructurizrGoldenTest.java'
        - 'the literals found by task-001 updated'
        - 'src/test/resources/known-traces.json (only if MistakeSweepTest needs an entry)'
      agent_role: 'Test Generation Agent'
      autonomy: 'autonomous'
      risk: 'medium'
      confidence: 65
    - id: task-007
      status: 'done'
      title: 'Integration test on the packaged application and the editor test that opens the output'
      depends_on: [task-006]
      produces:
        - 'src/test/java/io/morin/archicode/it/StructurizrImportIT.java'
        - 'src/test/javascript/viewpoint-kernel/structurizr-import-workspace.test.js'
      agent_role: 'Test Generation Agent'
      autonomy: 'autonomous'
      risk: 'low'
      confidence: 80
    - id: task-008
      status: 'done'
      title: 'Manual, guide and help goldens, and the command-line notes'
      depends_on: [task-005, task-001]
      produces:
        - 'src/doc/README.adoc'
        - 'src/test/resources/guide/golden.md'
        - 'src/test/java/io/morin/archicode/it/HelpIT.java'
        - 'src/main/java/io/morin/archicode/CLAUDE.md'
      agent_role: 'Documentation Agent'
      autonomy: 'autonomous'
      risk: 'low'
      confidence: 75
    - id: task-009
      status: 'done'
      title: 'The model of ArchiCode: the importer package, the command, their edges, and the sample bundle'
      depends_on: [task-005]
      produces:
        - 'docs/architecture/manifests/ (the importer and the command, edges to Manifest and Warnings, tags.path)'
        - 'src/test/javascript/architecture/impact-questions.json (only if a question changes)'
        - 'src/main/resources/editor-webapp/ and samples bundle regenerated by npm run sample:build'
      agent_role: 'Documentation Agent'
      autonomy: 'autonomous'
      risk: 'low'
      confidence: 70
    - id: task-010
      status: 'done'
      title: 'Gates of the run: the whole suite, byte identity, format, lint, builds, and the gate run on the packaged application'
      depends_on: [task-007, task-008, task-009]
      produces:
        - 'a results block in prg-0224-structurizr-json-import.md (commands, exit codes, the jq count against query graph, whether the native image was proved)'
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
      title: 'Facts and sample: fetch the Big Bank export with its licence and provenance, confirm the .dsl export command, grep the literal counts the golden will move'
      source_requirements:
        prd:
          - 'none: there is no PRD (profile TDD+pln); the REQ-n of the TDD are listed with the TDD items'
        tdd:
          - 'REQ-1'
          - 'REQ-7'
          - 'DEC-6'
          - 'DEC-8'
          - 'IMP-7'
          - 'Q-1'
          - 'Q-2'
          - 'RISK-1'
          - 'RISK-2'
          - 'RISK-5'
      outputs:
        - 'src/test/resources/structurizr/big-bank-plc.json'
        - 'src/test/resources/structurizr/LICENSE-Apache-2.0.txt'
        - 'src/test/resources/structurizr/PROVENANCE.md'
        - 'a Facts block appended to prg-0224-structurizr-json-import.md (the commit SHA, the DSL export outcome, the literals found)'
      verification:
        - 'ls src/test/resources/structurizr/'
        - 'grep -E ''[0-9a-f]{40}'' src/test/resources/structurizr/PROVENANCE.md'
        - 'grep -q ''github.com/structurizr/structurizr'' src/test/resources/structurizr/PROVENANCE.md'
        - 'jq ''.model.softwareSystems | length'' src/test/resources/structurizr/big-bank-plc.json'
        - 'grep -q ''Apache License'' src/test/resources/structurizr/LICENSE-Apache-2.0.txt'
      risk: 'medium'
      confidence: 70
      human_review: 'before'
      escalation_triggers:
        - 'the download is not permitted in the agent session or the network is absent: stop, log it, and fall back to the hand-written minimal workspace of Q-2 (a smaller sample that loses the compatibility proof; the wave verification must be told)'
        - 'a licence file other than Apache-2.0 sits in or above the path at that SHA'
        - 'the file is not a Structurizr workspace export'
      delegation_tier: 'standard'
      results: 'tier standard, model sonnet, effort medium, profile low-cost, passed first time, inline (leaf), independently verified'
    - id: task-002
      title: 'Reader and model: Structurizr JSON to StructurizrModel and counted Dropped, with the sentences of the refusals'
      source_requirements:
        prd:
          - 'none: there is no PRD (profile TDD+pln); the REQ-n of the TDD are listed with the TDD items'
        tdd:
          - 'TG-1'
          - 'DEC-1'
          - 'DEC-2'
          - 'CTR-1'
          - 'ASM-1'
          - 'IF-2'
          - 'IMP-1'
          - 'IMP-3'
      outputs:
        - 'src/main/java/io/morin/archicode/importer/StructurizrModel.java'
        - 'src/main/java/io/morin/archicode/importer/StructurizrReader.java'
        - 'src/test/java/io/morin/archicode/importer/StructurizrReaderTest.java'
      verification:
        - 'JAVA_HOME=$HOME/.sdkman/candidates/java/25.0.4-tem ./mvnw test -Dtest=StructurizrReaderTest'
      risk: 'medium'
      confidence: 80
      human_review: 'none'
      escalation_triggers:
        - 'the sample has a key the model cannot hold (ASM-1 is false)'
      delegation_tier: 'standard'
      results: 'tier standard, model sonnet, effort medium, profile low-cost, passed first time, inline (leaf), independently verified'
    - id: task-003
      title: 'Mapper: ids from names, references, relationships, Planned manifests and the workspace file'
      source_requirements:
        prd:
          - 'none: there is no PRD (profile TDD+pln); the REQ-n of the TDD are listed with the TDD items'
        tdd:
          - 'TG-2'
          - 'DEC-3'
          - 'DEC-4'
          - 'DEC-5'
          - 'CTR-2'
          - 'ASM-2'
          - 'ASM-3'
          - 'RISK-3'
          - 'RISK-6'
          - 'IMP-1'
          - 'IMP-3'
      outputs:
        - 'src/main/java/io/morin/archicode/importer/StructurizrMapper.java'
        - 'src/test/java/io/morin/archicode/importer/StructurizrMapperTest.java'
      verification:
        - 'JAVA_HOME=$HOME/.sdkman/candidates/java/25.0.4-tem ./mvnw test -Dtest=StructurizrMapperTest'
      risk: 'medium'
      confidence: 70
      human_review: 'none'
      escalation_triggers:
        - 'a Manifest the mapper builds is refused by the loader in a way that needs a loader change (RISK-6): stop and log it, the loader is not changed'
      delegation_tier: 'standard'
      results: 'tier standard, model sonnet, effort medium, profile low-cost, passed first time, inline (leaf), independently verified'
    - id: task-004
      title: 'ImportFiles seam and DiskImportFiles: staging, all or nothing, refusals of the output folder'
      source_requirements:
        prd:
          - 'none: there is no PRD (profile TDD+pln); the REQ-n of the TDD are listed with the TDD items'
        tdd:
          - 'TG-3'
          - 'DEC-7'
          - 'IF-2'
          - 'FLOW-1'
          - 'IMP-1'
          - 'IMP-3'
      outputs:
        - 'src/main/java/io/morin/archicode/importer/ImportFiles.java'
        - 'src/main/java/io/morin/archicode/importer/DiskImportFiles.java'
        - 'src/test/java/io/morin/archicode/importer/ImportFilesTest.java'
      verification:
        - 'JAVA_HOME=$HOME/.sdkman/candidates/java/25.0.4-tem ./mvnw test -Dtest=ImportFilesTest'
      risk: 'medium'
      confidence: 70
      human_review: 'after'
      escalation_triggers:
        - 'an atomic move of the staging folder onto an existing empty folder is not possible on the platform: use the move of each file and say so'
      delegation_tier: 'standard'
      results: 'tier standard, model sonnet, effort medium, profile low-cost, passed first time, inline (leaf), independently verified'
    - id: task-005
      title: 'Service, command, group, report and native reflection'
      source_requirements:
        prd:
          - 'none: there is no PRD (profile TDD+pln); the REQ-n of the TDD are listed with the TDD items'
        tdd:
          - 'DEC-1'
          - 'DEC-6'
          - 'DEC-9'
          - 'CTR-3'
          - 'IF-1'
          - 'IF-2'
          - 'FLOW-1'
          - 'TG-4'
          - 'CON-2'
          - 'CON-3'
          - 'IMP-1'
          - 'IMP-2'
          - 'IMP-8'
      outputs:
        - 'src/main/java/io/morin/archicode/importer/StructurizrImportService.java'
        - 'src/main/java/io/morin/archicode/cli/ImportGroup.java'
        - 'src/main/java/io/morin/archicode/cli/ImportStructurizrCommand.java'
        - 'src/main/java/io/morin/archicode/cli/ArchiCode.java'
        - 'src/main/resources/META-INF/native-image/io.morin.archicode/archicode/reflect-config.json'
        - 'src/test/java/io/morin/archicode/importer/StructurizrImportServiceTest.java'
      verification:
        - 'JAVA_HOME=$HOME/.sdkman/candidates/java/25.0.4-tem ./mvnw test -Dtest=''StructurizrImportServiceTest,NativeReflectionConfigTest'''
        - 'JAVA_HOME=$HOME/.sdkman/candidates/java/25.0.4-tem ./mvnw test-compile pmd:check'
      risk: 'medium'
      confidence: 75
      human_review: 'none'
      escalation_triggers:
        - 'the command needs a change of an existing command''s output (byte-identity would move)'
      delegation_tier: 'standard'
      results: 'tier standard, model sonnet, effort medium, profile low-cost, passed first time, inline (leaf), independently verified'
    - id: task-006
      title: 'Golden output of the sample, report golden, and the shipped-corpus counts it moves'
      source_requirements:
        prd:
          - 'none: there is no PRD (profile TDD+pln); the REQ-n of the TDD are listed with the TDD items'
        tdd:
          - 'TG-5'
          - 'REQ-2'
          - 'DEC-8'
          - 'DEC-9'
          - 'IMP-4'
          - 'CON-4'
          - 'RISK-5'
          - 'RISK-6'
          - 'ASM-3'
      outputs:
        - 'src/test/resources/structurizr/expected/'
        - 'src/test/resources/structurizr/expected-report.txt'
        - 'src/test/java/io/morin/archicode/importer/StructurizrGoldenTest.java'
        - 'the literals found by task-001 updated'
        - 'src/test/resources/known-traces.json (only if MistakeSweepTest needs an entry)'
      verification:
        - 'JAVA_HOME=$HOME/.sdkman/candidates/java/25.0.4-tem ./mvnw test -Dtest=''StructurizrGoldenTest,ShippedFilesTest,ManifestSchemaCorpusTest,ManifestRoundTripCorpusTest,MistakeSweepTest'''
      risk: 'medium'
      confidence: 65
      human_review: 'none'
      escalation_triggers:
        - 'the loader refuses the output (ASM-3 false): stop and log, no loader change'
        - 'MistakeSweepTest needs a known trace that hides an importer defect'
      delegation_tier: 'standard'
      results: 'tier standard, model sonnet, effort medium, profile low-cost, passed first time, inline (leaf), independently verified'
    - id: task-007
      title: 'Integration test on the packaged application and the editor test that opens the output'
      source_requirements:
        prd:
          - 'none: there is no PRD (profile TDD+pln); the REQ-n of the TDD are listed with the TDD items'
        tdd:
          - 'REQ-4'
          - 'IMP-5'
          - 'IMP-6'
          - 'CON-4'
          - 'IF-3'
      outputs:
        - 'src/test/java/io/morin/archicode/it/StructurizrImportIT.java'
        - 'src/test/javascript/viewpoint-kernel/structurizr-import-workspace.test.js'
      verification:
        - 'JAVA_HOME=$HOME/.sdkman/candidates/java/25.0.4-tem ./mvnw verify -DskipITs=false -Dit.test=StructurizrImportIT -Dtest=NoSuchTest -Dsurefire.failIfNoSpecifiedTests=false'
        - 'node --test src/test/javascript/viewpoint-kernel/structurizr-import-workspace.test.js'
        - 'npx prettier --check src/test/javascript/viewpoint-kernel/structurizr-import-workspace.test.js'
      risk: 'low'
      confidence: 80
      human_review: 'none'
      escalation_triggers:
        - 'the editor refuses a manifest the CLI loads (contract drift): log it as a finding, do not change the editor'
      delegation_tier: 'standard'
      results: 'tier standard, model sonnet, effort medium, profile low-cost, passed first time, inline (leaf), independently verified'
    - id: task-008
      title: 'Manual, guide and help goldens, and the command-line notes'
      source_requirements:
        prd:
          - 'none: there is no PRD (profile TDD+pln); the REQ-n of the TDD are listed with the TDD items'
        tdd:
          - 'REQ-5'
          - 'REQ-8'
          - 'CON-7'
          - 'IMP-9'
          - 'IMP-10'
          - 'IMP-12'
      outputs:
        - 'src/doc/README.adoc'
        - 'src/test/resources/guide/golden.md'
        - 'src/test/java/io/morin/archicode/it/HelpIT.java'
        - 'src/main/java/io/morin/archicode/CLAUDE.md'
      verification:
        - 'JAVA_HOME=$HOME/.sdkman/candidates/java/25.0.4-tem ./mvnw test -Dtest=''CommandReferenceTest,GuideTest'''
        - 'node --test src/test/javascript/manual-skeleton.test.js'
        - 'grep -nE ''wave|run-0|#135|20[0-9]{2}-'' src/main/java/io/morin/archicode/CLAUDE.md | grep -i import || true'
      risk: 'low'
      confidence: 75
      human_review: 'none'
      escalation_triggers:
        - 'the generated listing moves for a command other than import'
      delegation_tier: 'standard'
      results: 'tier standard, model sonnet, effort medium, profile low-cost, passed first time, inline (leaf), independently verified'
    - id: task-009
      title: 'The model of ArchiCode: the importer package, the command, their edges, and the sample bundle'
      source_requirements:
        prd:
          - 'none: there is no PRD (profile TDD+pln); the REQ-n of the TDD are listed with the TDD items'
        tdd:
          - 'REQ-5'
          - 'REQ-8'
          - 'IMP-11'
      outputs:
        - 'docs/architecture/manifests/ (the importer and the command, edges to Manifest and Warnings, tags.path)'
        - 'src/test/javascript/architecture/impact-questions.json (only if a question changes)'
        - 'src/main/resources/editor-webapp/ and samples bundle regenerated by npm run sample:build'
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
    - id: task-010
      title: 'Gates of the run: the whole suite, byte identity, format, lint, builds, and the gate run on the packaged application'
      source_requirements:
        prd:
          - 'none: there is no PRD (profile TDD+pln); the REQ-n of the TDD are listed with the TDD items'
        tdd:
          - 'REQ-2'
          - 'REQ-4'
          - 'REQ-5'
          - 'RISK-4'
          - 'RISK-7'
          - 'Observability and Verification'
      outputs:
        - 'a results block in prg-0224-structurizr-json-import.md (commands, exit codes, the jq count against query graph, whether the native image was proved)'
      verification:
        - 'JAVA_HOME=$HOME/.sdkman/candidates/java/25.0.4-tem ./mvnw verify -DskipITs=false'
        - 'npm run format:check'
        - 'npm run lint'
        - 'git diff --stat scripts/byte-identity-exceptions.txt'
      risk: 'medium'
      confidence: 75
      human_review: 'after'
      escalation_triggers:
        - 'byte-identity needs a new exception'
        - 'a command fails for a reason outside the importer (a base that is already red): record it, do not fix it'
      delegation_tier: 'standard'
      results: 'tier standard, model sonnet, effort medium, profile low-cost, passed after escalation to effort high, inline (leaf), independently verified'
```

## 5. Parallelization Plan

```yaml
parallelization_plan:
  groups:
    - id: parallel-group-001
      tasks:
        - task-002
        - task-004
      reason: 'The reader and the files seam share no file and no type'
      conflict_risks:
        - 'Both add to the package importer: distinct classes, no shared file'
    - id: parallel-group-002
      tasks:
        - task-007
        - task-008
        - task-009
      reason: 'The two tests, the documentation and the model touch disjoint paths'
      conflict_risks:
        - 'task-007 and task-008 both add to src/test/java/io/morin/archicode/it: HelpIT and StructurizrImportIT are distinct files'
        - 'task-009 regenerates the sample bundle, which task-007 and task-008 do not read'
```

## 6. Human Review Gates

```yaml
human_review_gates:
  gates:
    - id: gate-001
      trigger: 'The run downloads one third-party file (task-001) and writes a folder on the disk of the author (task-004)'
      required_before: []
      required_after: ['task-010']
      reviewer_focus:
        - 'the provenance, the licence and the size of the downloaded sample'
        - 'that a failed write leaves nothing and a non-empty folder is never touched'
        - 'the sentence for a .dsl input and whether the export command it names was confirmed'
```

This wave carries no autonomy override, and the gate does not stop the run: no task is `human_required`, the two tasks it covers are `review_before` and `review_after`, and the review is the verification at Stage 11 and the author's reading of the pull request.

## 7. Risk Assessment

```yaml
risk_assessment:
  by_task:
    - id: task-001
      risk: 'medium'
      rationale: 'Downloading a third-party file needs the session''s permission; the author''s launch of the wave and IMP-7 cover this one file, no other.'
    - id: task-002
      risk: 'medium'
      rationale: 'Pure parsing with a clear oracle.'
    - id: task-003
      risk: 'medium'
      rationale: 'Rules of id rewriting carry the product value; collisions need cases.'
    - id: task-004
      risk: 'medium'
      rationale: 'Writes to the author''s disk, bounded to an empty or absent folder; reviewed after.'
    - id: task-005
      risk: 'medium'
      rationale: 'Glue with the contracts of DEC-6 and DEC-9.'
    - id: task-006
      risk: 'medium'
      rationale: 'Proves the output against the loader; the corpus tests move with the golden.'
    - id: task-007
      risk: 'low'
      rationale: 'Pattern copy of init.'
    - id: task-008
      risk: 'low'
      rationale: 'Documentation with generated checks.'
    - id: task-009
      risk: 'low'
      rationale: 'Model upkeep, drift test as oracle.'
    - id: task-010
      risk: 'medium'
      rationale: 'Independent final check before close-out.'
  by_area:
    - area: 'security'
      risk: 'low'
      rationale: 'The input is untrusted and is only read; file names come from rewritten references; the output folder must be empty or absent'
    - area: 'data'
      risk: 'low'
      rationale: 'Nothing existing is rewritten; a failed write removes its staging folder'
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
      score: 70
      rationale: 'Downloading a third-party file needs the session''s permission; the author''s launch of the wave and IMP-7 cover this one file, no other.'
    - id: task-002
      score: 80
      rationale: 'Pure parsing with a clear oracle.'
    - id: task-003
      score: 70
      rationale: 'Rules of id rewriting carry the product value; collisions need cases.'
    - id: task-004
      score: 70
      rationale: 'Writes to the author''s disk, bounded to an empty or absent folder; reviewed after.'
    - id: task-005
      score: 75
      rationale: 'Glue with the contracts of DEC-6 and DEC-9.'
    - id: task-006
      score: 65
      rationale: 'Proves the output against the loader; the corpus tests move with the golden.'
    - id: task-007
      score: 80
      rationale: 'Pattern copy of init.'
    - id: task-008
      score: 75
      rationale: 'Documentation with generated checks.'
    - id: task-009
      score: 70
      rationale: 'Model upkeep, drift test as oracle.'
    - id: task-010
      score: 75
      rationale: 'Independent final check before close-out.'
```

## 9. Agent Assignment Plan

```yaml
agent_assignment_plan:
  assignments:
    - task_id: task-001
      agent_role: 'Documentation Agent'
      objective: 'Download structurizr-export/src/test/resources/big-bank-plc.json and the root LICENSE of github.com/structurizr/structurizr at one commit (read the SHA with gh api or git ls-remote; state the source URL and the size in the prg line), check there is no NOTICE or other licence file in or above that path at that SHA, write PROVENANCE.md (repository URL, path, 40-hex SHA, date), confirm with jq that the file has model.people, softwareSystems, containers and components, and count the elements. Then try the documented export of a DSL to JSON once (Q-1); if the tool is not runnable here, record that and keep the no-command sentence of DEC-6. Finally grep src/test and the docs for literal counts of shipped manifests or workspaces (ManifestSchemaCorpusTest, ManifestRoundTripCorpusTest, ManifestCorpus, src/test/CLAUDE.md) and list them in the Facts block.'
      context:
        prd_excerpts:
          - 'none: no PRD; see the REQ-n of the TDD'
        tdd_excerpts:
          - 'REQ-1'
          - 'REQ-7'
          - 'DEC-6'
          - 'DEC-8'
          - 'IMP-7'
          - 'Q-1'
          - 'Q-2'
          - 'RISK-1'
          - 'RISK-2'
          - 'RISK-5'
      likely_files:
        - 'src/test/resources/structurizr/big-bank-plc.json'
        - 'src/test/resources/structurizr/LICENSE-Apache-2.0.txt'
        - 'src/test/resources/structurizr/PROVENANCE.md'
        - 'docs/wav/wav-033-import-structurizr-and-plateau-matrix/run/run-0224-structurizr-json-import/prg-0224-structurizr-json-import.md'
      acceptance_criteria:
        - 'src/test/resources/structurizr/ holds big-bank-plc.json, LICENSE-Apache-2.0.txt and PROVENANCE.md'
        - 'PROVENANCE.md contains github.com/structurizr/structurizr and a 40-hex SHA'
        - 'jq reads model.softwareSystems from the sample and the element count is recorded in the Facts block'
        - 'the Facts block says whether the DSL export command ran, and lists each literal count found'
      verification:
        - 'ls src/test/resources/structurizr/'
        - 'grep -E ''[0-9a-f]{40}'' src/test/resources/structurizr/PROVENANCE.md'
        - 'grep -q ''github.com/structurizr/structurizr'' src/test/resources/structurizr/PROVENANCE.md'
        - 'jq ''.model.softwareSystems | length'' src/test/resources/structurizr/big-bank-plc.json'
        - 'grep -q ''Apache License'' src/test/resources/structurizr/LICENSE-Apache-2.0.txt'
      escalation_triggers:
        - 'the download is not permitted in the agent session or the network is absent: stop, log it, and fall back to the hand-written minimal workspace of Q-2 (a smaller sample that loses the compatibility proof; the wave verification must be told)'
        - 'a licence file other than Apache-2.0 sits in or above the path at that SHA'
        - 'the file is not a Structurizr workspace export'
      suggested_subagent_type: 'general-purpose'
      suggested_model: '(default)'
      suggested_effort: 'medium'
    - task_id: task-002
      agent_role: 'Backend Implementation Agent'
      objective: 'Write the model records (Person, System, Container, Component, Link, Dropped) and a pure reader that takes a Jackson JsonNode and returns the model and the counted drops (views, deployment nodes counted as the TDD''s DEC-9 says, styles, documentation, properties, perspectives, custom elements, configuration, implied relationships). A missing model is the error ''is not a Structurizr workspace: it has no model''; an element with no name is an error naming its Structurizr id. Test first on small inline JSON, then on the sample: the number of elements read equals the count that jq gives on the file, read by the test and not a literal.'
      context:
        prd_excerpts:
          - 'none: no PRD; see the REQ-n of the TDD'
        tdd_excerpts:
          - 'TG-1'
          - 'DEC-1'
          - 'DEC-2'
          - 'CTR-1'
          - 'ASM-1'
          - 'IF-2'
          - 'IMP-1'
          - 'IMP-3'
      likely_files:
        - 'src/main/java/io/morin/archicode/importer/StructurizrModel.java'
        - 'src/main/java/io/morin/archicode/importer/StructurizrReader.java'
        - 'src/test/java/io/morin/archicode/importer/StructurizrReaderTest.java'
      acceptance_criteria:
        - 'the reader reads the four element kinds and the relationships of the sample and its element count equals the jq count'
        - 'a document with no model and an element with no name each throw ArchiCodeException with one sentence'
        - 'every dropped part present in the sample is counted'
        - 'the reader touches no file'
      verification:
        - 'JAVA_HOME=$HOME/.sdkman/candidates/java/25.0.4-tem ./mvnw test -Dtest=StructurizrReaderTest'
      escalation_triggers:
        - 'the sample has a key the model cannot hold (ASM-1 is false)'
      suggested_subagent_type: 'general-purpose'
      suggested_model: '(default)'
      suggested_effort: 'medium'
    - task_id: task-003
      agent_role: 'Backend Implementation Agent'
      objective: 'Write the pure mapper: model in, a list of Planned(path, Manifest) plus the typed content of .archicode.yaml out; it serializes nothing. Rules: header.kind is the full id of ManifestKind (archicode.morin.io/person and the like, read from ManifestKind.getId(), never the short word); ids derived from names (DEC-4) where a missing name is the reader''s error and a name with no [a-z0-9] takes the fallback <kind>_<structurizr id> passed through the same rewrite (add a unit case with an id such as ../x); siblings are all elements under one parent whatever their kind, a collision takes the first unused suffix _2, _3 and never lands on a sibling really named x_2; the tags structurizr.id and group; relationships resolved from a map built before the first manifest; linkedRelationshipId ones skipped and counted; a relationship to a not-imported element dropped and counted. Define ''rewritten id'' once (a character replaced, a fallback, a suffix; case and spaces turned to _ are not) and give each rewrite one warning sentence with the element, its Structurizr id and the id written.'
      context:
        prd_excerpts:
          - 'none: no PRD; see the REQ-n of the TDD'
        tdd_excerpts:
          - 'TG-2'
          - 'DEC-3'
          - 'DEC-4'
          - 'DEC-5'
          - 'CTR-2'
          - 'ASM-2'
          - 'ASM-3'
          - 'RISK-3'
          - 'RISK-6'
          - 'IMP-1'
          - 'IMP-3'
      likely_files:
        - 'src/main/java/io/morin/archicode/importer/StructurizrMapper.java'
        - 'src/test/java/io/morin/archicode/importer/StructurizrMapperTest.java'
      acceptance_criteria:
        - 'header.kind of every Planned manifest is a full ManifestKind id'
        - 'two siblings of different kinds named alike get distinct ids, and a sibling named x_2 is never shadowed'
        - 'an id such as ../x yields a path under manifests/ with only [a-z0-9_.-]'
        - 'the references of the sample are unique and every relationship destination resolves'
        - 'the same input gives the same output twice'
      verification:
        - 'JAVA_HOME=$HOME/.sdkman/candidates/java/25.0.4-tem ./mvnw test -Dtest=StructurizrMapperTest'
      escalation_triggers:
        - 'a Manifest the mapper builds is refused by the loader in a way that needs a loader change (RISK-6): stop and log it, the loader is not changed'
      suggested_subagent_type: 'general-purpose'
      suggested_model: '(default)'
      suggested_effort: 'high'
    - task_id: task-004
      agent_role: 'Backend Implementation Agent'
      objective: 'Write the interface ImportFiles that writes (path, bytes) pairs and nothing else, and its disk implementation: refuse an existing folder that holds any entry (hidden included) with ''the folder <f> is not empty: import writes nothing over a folder''; refuse an --output that is an existing file; create an absent folder and an absent parent; write into <output>.archicode-import, replacing a stale staging folder left by a crash, then move it into place; a failing write removes the staging folder and says ''the import stopped at <file> (<reason>): nothing is written''. A fake lets a test fail the write at the step it chooses. The reason FoldFiles is not extended is that its commit rewrites existing files and creates none.'
      context:
        prd_excerpts:
          - 'none: no PRD; see the REQ-n of the TDD'
        tdd_excerpts:
          - 'TG-3'
          - 'DEC-7'
          - 'IF-2'
          - 'FLOW-1'
          - 'IMP-1'
          - 'IMP-3'
      likely_files:
        - 'src/main/java/io/morin/archicode/importer/ImportFiles.java'
        - 'src/main/java/io/morin/archicode/importer/DiskImportFiles.java'
        - 'src/test/java/io/morin/archicode/importer/ImportFilesTest.java'
      acceptance_criteria:
        - 'a non-empty folder, an existing file as output and a failure at each step leave the file system as it was, byte for byte'
        - 'a stale <output>.archicode-import is replaced'
        - 'an empty existing folder is accepted'
        - 'every refusal is an ArchiCodeException with one sentence'
      verification:
        - 'JAVA_HOME=$HOME/.sdkman/candidates/java/25.0.4-tem ./mvnw test -Dtest=ImportFilesTest'
      escalation_triggers:
        - 'an atomic move of the staging folder onto an existing empty folder is not possible on the platform: use the move of each file and say so'
      suggested_subagent_type: 'general-purpose'
      suggested_model: '(default)'
      suggested_effort: 'high'
    - task_id: task-005
      agent_role: 'Backend Implementation Agent'
      objective: 'Write the service (refuse a .dsl or non-.json name before reading, read, map, serialize with MapperFactory.forWriting(YAML), write through ImportFiles, queue the warnings in Warnings after the move succeeds, so a failed write prints no drop list) and the command import structurizr <workspace.json> --output <folder> in the group import, registered in ArchiCode. The .dsl sentence names the export command only as task-001 confirmed it, else the no-command sentence of DEC-6. The command loads no workspace and prints ''imported <n> elements and <m> relationships into <folder>''. Add the two command classes to reflect-config.json and run NativeReflectionConfigTest. Run PMD on the new code.'
      context:
        prd_excerpts:
          - 'none: no PRD; see the REQ-n of the TDD'
        tdd_excerpts:
          - 'DEC-1'
          - 'DEC-6'
          - 'DEC-9'
          - 'CTR-3'
          - 'IF-1'
          - 'IF-2'
          - 'FLOW-1'
          - 'TG-4'
          - 'CON-2'
          - 'CON-3'
          - 'IMP-1'
          - 'IMP-2'
          - 'IMP-8'
      likely_files:
        - 'src/main/java/io/morin/archicode/importer/StructurizrImportService.java'
        - 'src/main/java/io/morin/archicode/cli/ImportGroup.java'
        - 'src/main/java/io/morin/archicode/cli/ImportStructurizrCommand.java'
        - 'src/main/java/io/morin/archicode/cli/ArchiCode.java'
        - 'src/main/resources/META-INF/native-image/io.morin.archicode/archicode/reflect-config.json'
        - 'src/test/java/io/morin/archicode/importer/StructurizrImportServiceTest.java'
      acceptance_criteria:
        - 'a .dsl input, a non-JSON file, a missing file, a JSON with no model and a non-empty folder are each one error: line, exit 1, no stack trace, folder unchanged'
        - 'the warnings are in the order of DEC-9'
        - 'reflect-config.json names at least two io.morin.archicode.cli.Import classes'
        - 'PMD passes on the new code'
      verification:
        - 'JAVA_HOME=$HOME/.sdkman/candidates/java/25.0.4-tem ./mvnw test -Dtest=''StructurizrImportServiceTest,NativeReflectionConfigTest'''
        - 'JAVA_HOME=$HOME/.sdkman/candidates/java/25.0.4-tem ./mvnw test-compile pmd:check'
      escalation_triggers:
        - 'the command needs a change of an existing command''s output (byte-identity would move)'
      suggested_subagent_type: 'general-purpose'
      suggested_model: '(default)'
      suggested_effort: 'medium'
    - task_id: task-006
      agent_role: 'Test Generation Agent'
      objective: 'Write a test that imports the sample into a temp folder and compares it byte for byte with src/test/resources/structurizr/expected/ and the warnings with expected-report.txt, with a documented way to regenerate both; commit the regenerated golden after reading it. The folder joins ShippedFilesTest, ManifestCorpus and MistakeSweepTest: run them, update the literal counts task-001 listed, and when a mutation of header.parent of an imported container ends in a stack trace, fix it in the importer''s output only if the cause is the importer, else add the entry to known-traces.json with its reason. State that scripts/byte-identity.sh loads the golden with the base jar and must not need an exception. Check the count of elements of the output equals the count read from the sample by jq.'
      context:
        prd_excerpts:
          - 'none: no PRD; see the REQ-n of the TDD'
        tdd_excerpts:
          - 'TG-5'
          - 'REQ-2'
          - 'DEC-8'
          - 'DEC-9'
          - 'IMP-4'
          - 'CON-4'
          - 'RISK-5'
          - 'RISK-6'
          - 'ASM-3'
      likely_files:
        - 'src/test/resources/structurizr/expected/'
        - 'src/test/resources/structurizr/expected-report.txt'
        - 'src/test/java/io/morin/archicode/importer/StructurizrGoldenTest.java'
        - 'src/test/resources/known-traces.json'
        - 'src/test/CLAUDE.md'
        - 'src/test/java/io/morin/archicode/doc/ManifestCorpus.java'
      acceptance_criteria:
        - 'the golden test passes and fails when one byte of the golden changes'
        - 'ShippedFilesTest, ManifestSchemaCorpusTest, ManifestRoundTripCorpusTest and MistakeSweepTest pass with the golden present and with no entry in shipped-files exceptions'
        - 'the element count of the golden equals the jq count of the sample'
        - 'the report golden holds one warning per dropped part present in the sample (views, deployment)'
      verification:
        - 'JAVA_HOME=$HOME/.sdkman/candidates/java/25.0.4-tem ./mvnw test -Dtest=''StructurizrGoldenTest,ShippedFilesTest,ManifestSchemaCorpusTest,ManifestRoundTripCorpusTest,MistakeSweepTest'''
      escalation_triggers:
        - 'the loader refuses the output (ASM-3 false): stop and log, no loader change'
        - 'MistakeSweepTest needs a known trace that hides an importer defect'
      suggested_subagent_type: 'general-purpose'
      suggested_model: '(default)'
      suggested_effort: 'high'
    - task_id: task-007
      agent_role: 'Test Generation Agent'
      objective: 'Write StructurizrImportIT in the pattern of InitIT: the packaged application imports the sample, query graph loads the output and has as many elements as the sample, a .dsl and a non-empty folder are each one error: line with the folder unchanged. Write the node test in the pattern of init-workspace.test.js: the editor opens src/test/resources/structurizr/expected/ with no error in any manifest, no duplicate reference and as many elements as the sample. No change under src/main/editor.'
      context:
        prd_excerpts:
          - 'none: no PRD; see the REQ-n of the TDD'
        tdd_excerpts:
          - 'REQ-4'
          - 'IMP-5'
          - 'IMP-6'
          - 'CON-4'
          - 'IF-3'
      likely_files:
        - 'src/test/java/io/morin/archicode/it/StructurizrImportIT.java'
        - 'src/test/javascript/viewpoint-kernel/structurizr-import-workspace.test.js'
      acceptance_criteria:
        - 'the IT passes against the jar'
        - 'the node test passes and reads the golden folder'
        - 'git status shows no change under src/main/editor'
      verification:
        - 'JAVA_HOME=$HOME/.sdkman/candidates/java/25.0.4-tem ./mvnw verify -DskipITs=false -Dit.test=StructurizrImportIT -Dtest=NoSuchTest -Dsurefire.failIfNoSpecifiedTests=false'
        - 'node --test src/test/javascript/viewpoint-kernel/structurizr-import-workspace.test.js'
        - 'npx prettier --check src/test/javascript/viewpoint-kernel/structurizr-import-workspace.test.js'
      escalation_triggers:
        - 'the editor refuses a manifest the CLI loads (contract drift): log it as a finding, do not change the editor'
      suggested_subagent_type: 'general-purpose'
      suggested_model: '(default)'
      suggested_effort: 'medium'
    - task_id: task-008
      agent_role: 'Documentation Agent'
      objective: 'Add to the manual a section for import structurizr (what it reads, writes, drops, the refusals) and add import to the hand-written list of first-level commands (== Commands, near the line for init); say whether guide.md mentions init and mirror it if so. Update the generated listing, the guide golden and the HelpIT expectation; read the diff, only the new command may differ. Add a short section to src/main/java/io/morin/archicode/CLAUDE.md that states what is true now (rules, tests), with no wave, run, issue or date. Update manual-anchors.json if the skeleton test asks.'
      context:
        prd_excerpts:
          - 'none: no PRD; see the REQ-n of the TDD'
        tdd_excerpts:
          - 'REQ-5'
          - 'REQ-8'
          - 'CON-7'
          - 'IMP-9'
          - 'IMP-10'
          - 'IMP-12'
      likely_files:
        - 'src/doc/README.adoc'
        - 'src/test/resources/guide/golden.md'
        - 'src/test/java/io/morin/archicode/it/HelpIT.java'
        - 'src/main/java/io/morin/archicode/CLAUDE.md'
        - 'src/test/javascript/manual-anchors.json'
        - 'src/main/resources/guide/guide.md'
      acceptance_criteria:
        - 'CommandReferenceTest, GuideTest and HelpIT pass'
        - 'the diff of golden.md holds only the new command'
        - 'the CLAUDE.md section carries no wave, run or issue id'
        - 'the manual lists import in both places'
      verification:
        - 'JAVA_HOME=$HOME/.sdkman/candidates/java/25.0.4-tem ./mvnw test -Dtest=''CommandReferenceTest,GuideTest'''
        - 'node --test src/test/javascript/manual-skeleton.test.js'
        - 'grep -nE ''wave|run-0|#135|20[0-9]{2}-'' src/main/java/io/morin/archicode/CLAUDE.md | grep -i import || true'
      escalation_triggers:
        - 'the generated listing moves for a command other than import'
      suggested_subagent_type: 'general-purpose'
      suggested_model: '(default)'
      suggested_effort: 'medium'
    - task_id: task-009
      agent_role: 'Documentation Agent'
      objective: 'Model the importer package and the command in docs/architecture in the style of the neighbouring command-line elements, with tags.path naming real paths and the qualifiers the manifests use; run archicode query impact on Warnings and Manifest to see whether an impact question changes and change the question in the same commit if so; run npm run sample:build.'
      context:
        prd_excerpts:
          - 'none: no PRD; see the REQ-n of the TDD'
        tdd_excerpts:
          - 'REQ-5'
          - 'REQ-8'
          - 'IMP-11'
      likely_files:
        - 'docs/architecture/manifests/'
        - 'src/test/javascript/architecture/impact-questions.json'
        - 'src/main/resources/editor-webapp/samples/archicode.yaml'
      acceptance_criteria:
        - 'ArchitectureDriftTest and ArchitectureImpactTest pass'
        - 'npm run sample:check exits 0 after npm run sample:build'
        - 'the model loads: query graph on docs/architecture/.archicode.yaml lists the new elements'
      verification:
        - 'JAVA_HOME=$HOME/.sdkman/candidates/java/25.0.4-tem ./mvnw test -Dtest=''ArchitectureDriftTest,ArchitectureImpactTest,ArchitectureModelTest'''
        - 'npm run sample:build && npm run sample:check'
      escalation_triggers:
        - 'an impact question changes in a way the run did not intend'
      suggested_subagent_type: 'general-purpose'
      suggested_model: '(default)'
      suggested_effort: 'medium'
    - task_id: task-010
      agent_role: 'QA Agent'
      objective: 'Run the commands of the gates in the repository root and record each exit code: ./mvnw verify -DskipITs=false; ./mvnw test-compile pmd:check; scripts/byte-identity.sh with scripts/byte-identity-exceptions.txt unchanged; npm run test:unit; npm run format:check; npm run lint; npm run editor:build and npm run sample:build with git status --short unchanged by them. Then, on the packaged application, import the sample into a new folder, check the exit code 0, at least one warning for views and for deployment, and that query graph on the output has as many elements as jq counts on the sample; and that a .dsl input and a non-empty folder are each one error: line. Say that the Native job of CI is not run on a branch and is left to the pull request. Fix nothing in this task beyond a failing command''s cause; a fix goes back to the task that owns the file.'
      context:
        prd_excerpts:
          - 'none: no PRD; see the REQ-n of the TDD'
        tdd_excerpts:
          - 'REQ-2'
          - 'REQ-4'
          - 'REQ-5'
          - 'RISK-4'
          - 'RISK-7'
          - 'Observability and Verification'
      likely_files:
        - 'docs/wav/wav-033-import-structurizr-and-plateau-matrix/run/run-0224-structurizr-json-import/prg-0224-structurizr-json-import.md'
      acceptance_criteria:
        - 'every command above exits 0, or the failure is named with its owning task'
        - 'scripts/byte-identity-exceptions.txt is unchanged'
        - 'the count of elements in the output equals the sample''s'
        - 'the prg holds the results block'
      verification:
        - 'JAVA_HOME=$HOME/.sdkman/candidates/java/25.0.4-tem ./mvnw verify -DskipITs=false'
        - 'npm run format:check'
        - 'npm run lint'
        - 'git diff --stat scripts/byte-identity-exceptions.txt'
      escalation_triggers:
        - 'byte-identity needs a new exception'
        - 'a command fails for a reason outside the importer (a base that is already red): record it, do not fix it'
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
        - 'ls src/test/resources/structurizr/'
        - 'grep -E ''[0-9a-f]{40}'' src/test/resources/structurizr/PROVENANCE.md'
        - 'grep -q ''github.com/structurizr/structurizr'' src/test/resources/structurizr/PROVENANCE.md'
        - 'jq ''.model.softwareSystems | length'' src/test/resources/structurizr/big-bank-plc.json'
        - 'grep -q ''Apache License'' src/test/resources/structurizr/LICENSE-Apache-2.0.txt'
      success_criteria:
        - 'src/test/resources/structurizr/ holds big-bank-plc.json, LICENSE-Apache-2.0.txt and PROVENANCE.md'
        - 'PROVENANCE.md contains github.com/structurizr/structurizr and a 40-hex SHA'
        - 'jq reads model.softwareSystems from the sample and the element count is recorded in the Facts block'
        - 'the Facts block says whether the DSL export command ran, and lists each literal count found'
    - task_id: task-002
      methods:
        - 'JAVA_HOME=$HOME/.sdkman/candidates/java/25.0.4-tem ./mvnw test -Dtest=StructurizrReaderTest'
      success_criteria:
        - 'the reader reads the four element kinds and the relationships of the sample and its element count equals the jq count'
        - 'a document with no model and an element with no name each throw ArchiCodeException with one sentence'
        - 'every dropped part present in the sample is counted'
        - 'the reader touches no file'
    - task_id: task-003
      methods:
        - 'JAVA_HOME=$HOME/.sdkman/candidates/java/25.0.4-tem ./mvnw test -Dtest=StructurizrMapperTest'
      success_criteria:
        - 'header.kind of every Planned manifest is a full ManifestKind id'
        - 'two siblings of different kinds named alike get distinct ids, and a sibling named x_2 is never shadowed'
        - 'an id such as ../x yields a path under manifests/ with only [a-z0-9_.-]'
        - 'the references of the sample are unique and every relationship destination resolves'
        - 'the same input gives the same output twice'
    - task_id: task-004
      methods:
        - 'JAVA_HOME=$HOME/.sdkman/candidates/java/25.0.4-tem ./mvnw test -Dtest=ImportFilesTest'
      success_criteria:
        - 'a non-empty folder, an existing file as output and a failure at each step leave the file system as it was, byte for byte'
        - 'a stale <output>.archicode-import is replaced'
        - 'an empty existing folder is accepted'
        - 'every refusal is an ArchiCodeException with one sentence'
    - task_id: task-005
      methods:
        - 'JAVA_HOME=$HOME/.sdkman/candidates/java/25.0.4-tem ./mvnw test -Dtest=''StructurizrImportServiceTest,NativeReflectionConfigTest'''
        - 'JAVA_HOME=$HOME/.sdkman/candidates/java/25.0.4-tem ./mvnw test-compile pmd:check'
      success_criteria:
        - 'a .dsl input, a non-JSON file, a missing file, a JSON with no model and a non-empty folder are each one error: line, exit 1, no stack trace, folder unchanged'
        - 'the warnings are in the order of DEC-9'
        - 'reflect-config.json names at least two io.morin.archicode.cli.Import classes'
        - 'PMD passes on the new code'
    - task_id: task-006
      methods:
        - 'JAVA_HOME=$HOME/.sdkman/candidates/java/25.0.4-tem ./mvnw test -Dtest=''StructurizrGoldenTest,ShippedFilesTest,ManifestSchemaCorpusTest,ManifestRoundTripCorpusTest,MistakeSweepTest'''
      success_criteria:
        - 'the golden test passes and fails when one byte of the golden changes'
        - 'ShippedFilesTest, ManifestSchemaCorpusTest, ManifestRoundTripCorpusTest and MistakeSweepTest pass with the golden present and with no entry in shipped-files exceptions'
        - 'the element count of the golden equals the jq count of the sample'
        - 'the report golden holds one warning per dropped part present in the sample (views, deployment)'
    - task_id: task-007
      methods:
        - 'JAVA_HOME=$HOME/.sdkman/candidates/java/25.0.4-tem ./mvnw verify -DskipITs=false -Dit.test=StructurizrImportIT -Dtest=NoSuchTest -Dsurefire.failIfNoSpecifiedTests=false'
        - 'node --test src/test/javascript/viewpoint-kernel/structurizr-import-workspace.test.js'
        - 'npx prettier --check src/test/javascript/viewpoint-kernel/structurizr-import-workspace.test.js'
      success_criteria:
        - 'the IT passes against the jar'
        - 'the node test passes and reads the golden folder'
        - 'git status shows no change under src/main/editor'
    - task_id: task-008
      methods:
        - 'JAVA_HOME=$HOME/.sdkman/candidates/java/25.0.4-tem ./mvnw test -Dtest=''CommandReferenceTest,GuideTest'''
        - 'node --test src/test/javascript/manual-skeleton.test.js'
        - 'grep -nE ''wave|run-0|#135|20[0-9]{2}-'' src/main/java/io/morin/archicode/CLAUDE.md | grep -i import || true'
      success_criteria:
        - 'CommandReferenceTest, GuideTest and HelpIT pass'
        - 'the diff of golden.md holds only the new command'
        - 'the CLAUDE.md section carries no wave, run or issue id'
        - 'the manual lists import in both places'
    - task_id: task-009
      methods:
        - 'JAVA_HOME=$HOME/.sdkman/candidates/java/25.0.4-tem ./mvnw test -Dtest=''ArchitectureDriftTest,ArchitectureImpactTest,ArchitectureModelTest'''
        - 'npm run sample:build && npm run sample:check'
      success_criteria:
        - 'ArchitectureDriftTest and ArchitectureImpactTest pass'
        - 'npm run sample:check exits 0 after npm run sample:build'
        - 'the model loads: query graph on docs/architecture/.archicode.yaml lists the new elements'
    - task_id: task-010
      methods:
        - 'JAVA_HOME=$HOME/.sdkman/candidates/java/25.0.4-tem ./mvnw verify -DskipITs=false'
        - 'npm run format:check'
        - 'npm run lint'
        - 'git diff --stat scripts/byte-identity-exceptions.txt'
      success_criteria:
        - 'every command above exits 0, or the failure is named with its owning task'
        - 'scripts/byte-identity-exceptions.txt is unchanged'
        - 'the count of elements in the output equals the sample''s'
        - 'the prg holds the results block'
```

## 11. Escalation Rules

```yaml
escalation_rules:
  rules:
    - condition: 'The sample cannot be downloaded, or its licence is not Apache-2.0 for its path'
      action: 'Stop task-001, log it in the prg, fall back to the hand-written minimal workspace of Q-2 and say in the final check that the compatibility proof is weaker'
    - condition: 'The loader or the editor refuses what the mapper writes'
      action: 'Fix the mapper; never change the loader or the editor; if the rule cannot be met, log a finding and stop the task'
    - condition: 'byte-identity.sh needs a new exception or an existing command changes its output'
      action: 'Stop and log: the importer must not change another command'
    - condition: 'A command fails for a reason outside the importer (a base that is already red)'
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
  total_tasks: 10
  autonomous_tasks: 7
  review_before_tasks: 1
  review_after_tasks: 2
  human_required_tasks: 0
  blocked_tasks: 0
  critical_path_tasks:
    - task-001
    - task-002
    - task-003
    - task-005
    - task-006
    - task-007
    - task-010
  parallel_groups:
    - parallel-group-001
    - parallel-group-002
  required_human_gates:
    - gate-001
  highest_risk_tasks:
    - task-001
    - task-004
    - task-010
  lowest_confidence_tasks:
    - task-006
    - task-003
    - task-004
  next_action: 'Start task-001: fetch the Big Bank export with its licence and provenance and record the facts the later tasks need'
  criteria:
    - 'The sample, golden and tests are committed in the working tree and pass'
    - 'The refusals are one error: line each with nothing written'
    - 'The gates exit 0 and byte-identity needs no new exception'
    - 'The manual, the guide, the notes and the model say what the command does'
```
