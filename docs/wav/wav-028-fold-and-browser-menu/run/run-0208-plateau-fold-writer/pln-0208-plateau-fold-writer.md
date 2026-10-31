---
title: Execution Plan — Plateau fold writer
status: done
date: 2026-10-30
related:
  - docs/wav/wav-028-fold-and-browser-menu/run/run-0208-plateau-fold-writer/tdd-0208-plateau-fold-writer.md
  - docs/wav/wav-028-fold-and-browser-menu/run/run-0207-plateau-fold-dry-run/pln-0207-plateau-fold-dry-run.md
  - docs/wav/wav-028-fold-and-browser-menu/wav-028-fold-and-browser-menu.md
  - 'gh:tmorin/archicode#65'
type: pln
run: 0208
wave: 028
---

# Execution Plan: Plateau fold writer

Profile TDD+pln: there is no PRD, so REQ-1 to REQ-8 are the IDs the TDD labels (section "PRD Traceability"), taken from the decisions D1 to D4 and the P3 gate of the wave manifest, and from run 0207. The TDD is the design (DEC-1 to DEC-10, IMP-1 to IMP-9, CTR-1 to CTR-4); the TDD review (R1 to R8) was applied at Stage 6, so this plan amends no design document. The run operates under the autonomy override of complete-run: the writer deletes and rewrites manifests of the author's workspace, which the default policy would send to a human, and it is executed by agents; the three tasks that carry that risk (task-005, task-006, task-007) are `hard_judgment`, `risk: high` and `review_after`, so their independent verification runs at the elevated pair of the active profile, and the review the gate asks for is the Stage 11 verification of the run and the author's reading at close-out (the plan has no `human_required` task, and no task stops for a human). The plan commits nothing: the commit is a human step outside it.

Every Maven command below runs with `JAVA_HOME=$HOME/.sdkman/candidates/java/25.0.4-tem` (the shell Java is 21). Files this run changes outside the `likely_paths` of the wave manifest (stated in TDD CON-7 and IMP-5): `src/main/java/io/morin/archicode/MapperFactory.java`, `src/main/java/io/morin/archicode/Warnings.java`, `src/main/java/io/morin/archicode/manifest/Manifest.java` and `src/test/javascript/viewpoint-kernel/fold-workspace.test.js`.

## 1. Executive Summary

```yaml
summary:
  status: 'pending'
  product_goal: '`archicode plateau fold <id>` folds a plateau into the one above: it rewrites the manifests that name it, merges its Kind: Plateau manifest into the one above, composes the replaces, deletes its manifest, after proving on a temporary copy that every plateau that stays reads the same, and writes all its files or none (#65 second half, D1 to D4, P3 gate).'
  technical_approach: 'Additive foundations first (a writer mapper, Header.toBuilder, the discovered manifest files, Warnings.silently, a round-trip corpus test), then the records, stubs and red tests of the three new classes, then FoldRewrite, FoldCheck and FoldFiles one after the other, then the service (prepare and check, the dry run, then the write), the command and the IT, the before and after test and the node test that opens the folded workspace, the guide with its golden file, the manual and CLAUDE.md, the gates and four sabotage checks.'
  total_tasks: 14
  parallel_groups: 2
  high_risk_tasks: 3
  human_review_gates: 1
  autonomy_level: 'medium'
  recommendation: 'proceed_with_review'
  criteria:
    - 'FoldRewriteTest, FoldCheckTest and FoldFilesTest failed on their stubs and pass on the implementations, with no picocli, jakarta.inject or java.nio.file in FoldRewrite and FoldCheck'
    - 'every manifest the repository ships (ManifestCorpus) is read, written with forWriting in its own format and read again equal'
    - 'the cases of fold-cases.json (F01 to F06, the write case F07, F08, F20 to F27) pass through PlateauFoldService and through the command, with expect.files, and every refusal leaves the folder identical byte for byte (hidden files included)'
    - 'on a copy of the layered Brightcart, inhouse folded into marketplace: plateau list, diff, query graph and views generate before and after are equal for every plateau that stays but for the PLATEAU and PATCH columns of the cascade, and a second fold is refused with the sentence of F01'
    - 'a failing FoldFiles double at each operation in turn leaves the folder as it was, and a changed file between the read and the commit stops before the first write'
    - 'the node test opens the folded hand-made workspace in the editor with no error, plateaus baseline, marketplace and saas, inhouse gone'
    - './mvnw verify, ./mvnw verify -DskipITs=false and ./mvnw test-compile pmd:check exit 0 with the JaCoCo floors unchanged; npm run test:unit, lint, format:check and editor:check exit 0; scripts/byte-identity.sh shows no unexpected difference'
    - 'golden.md is regenerated under the 30 KB budget; the manual (plateau-fold, fold-by-hand, plateau-limits, upgrade-0-21) and CLAUDE.md say what the command does, refuses and loses'
    - 'the four sabotage checks fail the tests they name and the restored tree passes'
```

## 2. PRD/TDD Consistency Assessment

```yaml
consistency_assessment:
  aligned_items:
    - 'REQ-1 to REQ-8 each map to a decision and a repository impact of the TDD (the Addressed lines of PRD Traceability)'
    - 'FoldRewrite and FoldCheck are pure (CON-1, DEC-1); FoldFiles is the one class that writes into the folder (CON-4); the service is the one class a later endpoint calls'
    - 'Every refusal and failure is an ArchiCodeException printed as one error line, exit 1 (CON-3); sentences 1 to 6 of run 0207 stay word for word (REQ-8, DEC-6)'
    - 'Nothing in the existing commands moves (CON-5), proved by scripts/byte-identity.sh'
    - 'No file under src/main/editor, layers.json or standalone.html changes (CON-7)'
  gaps:
    - id: gap-001
      type: 'ambiguity'
      description: 'D3 says the patches become direct values; the TDD keeps them as patches (DEC-3, run 0207 DEC-2). The check in the dry run adds a refusal beyond D2 (DEC-4). A rewritten manifest keeps its format and loses its comments (DEC-2).'
      impact: 'low'
      recommendation: 'Decided in the TDD and told to the author at close-out, not asked; task-014 puts the three items in the run document for the author.'
    - id: gap-002
      type: 'risk'
      description: 'ASM-5 (the oracle holds for inhouse into marketplace once discovery.search is composed) and ASM-6 (a replaces entry that names an element the folded plateau removes shows up as a difference) are measured by hand in run 0190 or assumed; ASM-2 (native serialisation of Manifest) is proved only by the Native job.'
      impact: 'medium'
      recommendation: 'task-006 holds F24 for ASM-6 with the stated fallback case, task-009 is the first full proof of ASM-5, and the Native job proves ASM-2 (logged as not run here).'
    - id: gap-003
      type: 'missing_technical_design'
      description: 'The TDD says the proof on the Brightcart is in the run document, but names no section for it; the Brightcart write case F07 pins the report and marks files as changed, not their texts.'
      impact: 'low'
      recommendation: 'task-009 writes the figures into a section Verification of run-0208-plateau-fold-writer.md; task-007 makes F07 pin the report and the changed markers.'
  blocking_gaps: []
```

## 3. Execution Graph

```yaml
execution_graph:
  nodes:
    - id: task-001
      status: 'done'
      title: 'Additive foundations: forWriting, Header.toBuilder, Facts.manifestFiles, Warnings.silently, and the round-trip corpus test'
      depends_on: []
      produces:
        - 'src/main/java/io/morin/archicode/MapperFactory.java'
        - 'src/main/java/io/morin/archicode/manifest/Manifest.java'
        - 'src/main/java/io/morin/archicode/Warnings.java'
        - 'src/main/java/io/morin/archicode/workspace/WorkspaceFactory.java'
        - 'src/test/java/io/morin/archicode/doc/ManifestRoundTripCorpusTest.java'
      agent_role: 'Backend Implementation Agent'
      autonomy: 'autonomous'
      risk: 'medium'
      confidence: 75
    - id: task-002
      status: 'done'
      title: 'Plan fields, the new records, stubs of FoldRewrite, FoldCheck and FoldFiles, and their red tests'
      depends_on: [task-001]
      produces:
        - 'src/main/java/io/morin/archicode/workspace/Fold.java'
        - 'src/main/java/io/morin/archicode/workspace/FoldRewrite.java (records and a stub)'
        - 'src/main/java/io/morin/archicode/workspace/FoldCheck.java (records and a stub)'
        - 'src/main/java/io/morin/archicode/workspace/FoldFiles.java (interface and stubs)'
        - 'src/test/java/io/morin/archicode/workspace/FoldTest.java'
        - 'src/test/java/io/morin/archicode/workspace/FoldRewriteTest.java'
        - 'src/test/java/io/morin/archicode/workspace/FoldCheckTest.java'
        - 'src/test/java/io/morin/archicode/workspace/FoldFilesTest.java'
      agent_role: 'Test Generation Agent'
      autonomy: 'autonomous'
      risk: 'medium'
      confidence: 70
    - id: task-003
      status: 'done'
      title: 'Implement FoldRewrite (the five edits)'
      depends_on: [task-002]
      produces:
        - 'src/main/java/io/morin/archicode/workspace/FoldRewrite.java'
      agent_role: 'Backend Implementation Agent'
      autonomy: 'autonomous'
      risk: 'medium'
      confidence: 75
    - id: task-004
      status: 'done'
      title: 'Implement FoldCheck (canonical lines, snapshot comparison, the first difference)'
      depends_on: [task-003]
      produces:
        - 'src/main/java/io/morin/archicode/workspace/FoldCheck.java'
      agent_role: 'Backend Implementation Agent'
      autonomy: 'autonomous'
      risk: 'medium'
      confidence: 75
    - id: task-005
      status: 'done'
      title: 'Implement FoldFiles (stage, move, delete last, put back, the stale-read check)'
      depends_on: [task-004]
      produces:
        - 'src/main/java/io/morin/archicode/workspace/FoldFiles.java'
      agent_role: 'Backend Implementation Agent'
      autonomy: 'review_after'
      risk: 'high'
      confidence: 70
    - id: task-006
      status: 'done'
      title: 'The service: read, rewrite, temporary copy, snapshots, the check and the dry run, with the cases F20 to F27'
      depends_on: [task-003, task-004, task-005]
      produces:
        - 'src/main/java/io/morin/archicode/workspace/PlateauFoldService.java'
        - 'src/main/java/io/morin/archicode/workspace/FoldReport.java'
        - 'src/test/java/io/morin/archicode/workspace/PlateauFoldServiceTest.java'
        - 'src/test/javascript/viewpoint-kernel/fold-cases.json'
      agent_role: 'Backend Implementation Agent'
      autonomy: 'review_after'
      risk: 'high'
      confidence: 65
    - id: task-007
      status: 'done'
      title: 'The write path of the service, the written report, the write case F07 and the failed-write proof'
      depends_on: [task-006]
      produces:
        - 'src/main/java/io/morin/archicode/workspace/PlateauFoldService.java'
        - 'src/main/java/io/morin/archicode/workspace/FoldReport.java'
        - 'src/test/java/io/morin/archicode/workspace/PlateauFoldServiceTest.java'
        - 'src/test/javascript/viewpoint-kernel/fold-cases.json'
      agent_role: 'Backend Implementation Agent'
      autonomy: 'review_after'
      risk: 'high'
      confidence: 70
    - id: task-008
      status: 'done'
      title: 'The command writes, PlateauFoldCommandTest and PlateauFoldIT'
      depends_on: [task-007]
      produces:
        - 'src/main/java/io/morin/archicode/cli/FoldCommand.java'
        - 'src/test/java/io/morin/archicode/cli/PlateauFoldCommandTest.java'
        - 'src/test/java/io/morin/archicode/it/PlateauFoldIT.java'
      agent_role: 'Backend Implementation Agent'
      autonomy: 'autonomous'
      risk: 'medium'
      confidence: 75
    - id: task-009
      status: 'done'
      title: 'The before and after test on the layered Brightcart and its record in the run document'
      depends_on: [task-008]
      produces:
        - 'src/test/java/io/morin/archicode/cli/PlateauFoldBeforeAfterTest.java'
        - 'docs/wav/wav-028-fold-and-browser-menu/run/run-0208-plateau-fold-writer/run-0208-plateau-fold-writer.md (section Verification)'
      agent_role: 'QA Agent'
      autonomy: 'autonomous'
      risk: 'medium'
      confidence: 70
    - id: task-010
      status: 'done'
      title: 'The node test that opens the folded workspace in the editor'
      depends_on: [task-007]
      produces:
        - 'src/test/javascript/viewpoint-kernel/fold-workspace.test.js'
        - 'src/test/javascript/viewpoint-kernel/fold-cases.json (header comment)'
      agent_role: 'Test Generation Agent'
      autonomy: 'autonomous'
      risk: 'low'
      confidence: 75
    - id: task-011
      status: 'done'
      title: 'Say the writer in the guide and regenerate the golden file'
      depends_on: [task-008, task-009]
      produces:
        - 'src/main/resources/guide/guide.md'
        - 'src/test/resources/guide/golden.md'
      agent_role: 'Documentation Agent'
      autonomy: 'autonomous'
      risk: 'low'
      confidence: 85
    - id: task-012
      status: 'done'
      title: 'Describe the writer in the manual and in CLAUDE.md'
      depends_on: [task-008]
      produces:
        - 'src/doc/README.adoc'
        - 'CLAUDE.md'
      agent_role: 'Documentation Agent'
      autonomy: 'autonomous'
      risk: 'low'
      confidence: 75
    - id: task-013
      status: 'done'
      title: 'Run the gates'
      depends_on: [task-009, task-010, task-011, task-012]
      produces:
        - 'a Log line in prg-0208 with the exit code of each gate'
      agent_role: 'QA Agent'
      autonomy: 'autonomous'
      risk: 'low'
      confidence: 85
    - id: task-014
      status: 'done'
      title: 'Sabotage checks, the notice for the author, and close the implementation'
      depends_on: [task-013]
      produces:
        - 'a Log line in prg-0208 with the four sabotage verdicts, the list of files changed and the three items for the author'
      agent_role: 'QA Agent'
      autonomy: 'autonomous'
      risk: 'medium'
      confidence: 75
  edges:
    - from: task-001
      to: task-002
      reason: 'the stubs and tests use forWriting, Header.toBuilder and Facts.manifestFiles'
    - from: task-002
      to: task-003
      reason: 'red before green: FoldRewriteTest must fail on its stub first'
    - from: task-003
      to: task-004
      reason: 'one build tree: Maven compiles into target/, so two implementation tasks never run it at once; the order is the order of the TDD (rewrite, check, files)'
    - from: task-004
      to: task-005
      reason: 'one build tree, as above'
    - from: task-003
      to: task-006
      reason: 'the service calls FoldRewrite.apply'
    - from: task-004
      to: task-006
      reason: 'the service calls FoldCheck.firstDifference'
    - from: task-005
      to: task-006
      reason: 'the service takes a FoldFiles as a parameter of fold(...)'
    - from: task-006
      to: task-007
      reason: 'the write path reuses every step up to the check (FLOW-1, steps 1 to 6)'
    - from: task-007
      to: task-008
      reason: 'the command calls the service and prints its report'
    - from: task-007
      to: task-010
      reason: 'the node test reads the write cases and their expect.files'
    - from: task-008
      to: task-009
      reason: 'the before and after test folds through the command'
    - from: task-008
      to: task-011
      reason: 'the guide command list and its help are generated from the command'
    - from: task-009
      to: task-011
      reason: 'one build tree: the golden file is regenerated with the packaged application while no other Maven task runs'
    - from: task-008
      to: task-012
      reason: 'the manual quotes the report and the sentences the command prints'
    - from: task-009
      to: task-013
      reason: 'the gates run on the final tree'
    - from: task-010
      to: task-013
      reason: 'the gates run on the final tree'
    - from: task-011
      to: task-013
      reason: 'GuideTest needs the golden file'
    - from: task-012
      to: task-013
      reason: 'ManualExamplesTest and the format check run on the final tree'
    - from: task-013
      to: task-014
      reason: 'the sabotage edits sources and restores them, so it runs after the gates, never beside them'
```

## 4. Task Catalog

```yaml
task_catalog:
  tasks:
    - id: task-001
      title: 'Additive foundations: forWriting, Header.toBuilder, Facts.manifestFiles, Warnings.silently, and the round-trip corpus test'
      source_requirements:
        prd:
          - 'REQ-5'
          - 'REQ-7'
        tdd:
          - 'DEC-2'
          - 'IMP-5'
          - 'IMP-7'
          - 'ASM-1'
          - 'ASM-2'
          - 'ASM-3'
          - 'ASM-7'
          - 'ASM-8'
          - 'CON-5'
      outputs:
        - 'MapperFactory.forWriting(MapperFormat): a copy of the mapper of the format with the writing features (YAML without the document start marker and with array items indented under their key, JSON indented, TOML as its mapper writes) and the NON_NULL inclusion of DEC-2, so an empty top-level content is written as content: {}; the reading mappers are unchanged'
        - 'Manifest.Header gains toBuilder = true (additive)'
        - 'WorkspaceFactory.Facts gains List<Path> manifestFiles, the files ManifestDiscovery.discover returns (the workspace file is not one); every caller of the Facts constructor is updated; create is untouched'
        - 'Warnings.silently(Supplier<T>): runs the supplier and forgets the sentences it added, leaving the ones already kept'
        - 'ManifestRoundTripCorpusTest (package doc, beside ManifestCorpus): every manifest of ManifestCorpus (the 421 the repository ships) is read as the loader reads it, written with forWriting in its own format, read again, and the two Manifest values are equal; a header with parent yes and plateau 010 comes back as the texts yes and 010; an empty content is written; a file named x.yaml.archicode-fold is not discovered by ManifestDiscovery (ASM-7); Warnings.silently keeps the earlier sentences and drops its own'
        - 'One Log line in prg-0208 beginning Writer facts: the count of manifests round-tripped per format, the figure of ASM-3 measured on the 11 manifests of inhouse that name the plateau (lines that differ by a round trip alone, expected 56 of 273, every one a flow list written as a block), and whether Header needed anything beyond toBuilder'
      verification:
        - 'JAVA_HOME=$HOME/.sdkman/candidates/java/25.0.4-tem ./mvnw -q test -Dtest=ManifestRoundTripCorpusTest exits 0'
        - 'JAVA_HOME=$HOME/.sdkman/candidates/java/25.0.4-tem ./mvnw -q test -Dtest=ManifestDiscoveryTest+FoldTest exits 0 (the existing readers are unchanged)'
        - 'JAVA_HOME=$HOME/.sdkman/candidates/java/25.0.4-tem ./mvnw -q test-compile pmd:check exits 0'
        - 'grep -c "Writer facts" docs/wav/wav-028-fold-and-browser-menu/run/run-0208-plateau-fold-writer/prg-0208-plateau-fold-writer.md prints 1 or more'
        - 'git status --short src/main/editor src/main/resources/editor-webapp shows no change'
      risk: 'medium'
      confidence: 75
      human_review: 'none'
      escalation_triggers:
        - 'A manifest of the corpus does not round-trip equal in some format: stop, find whether the mapper or the manifest is the cause, and amend DEC-2 before any other task relies on it'
        - 'Adding a field to Facts breaks a caller outside workspace/: stop, it is outside the design'
        - 'ASM-3 measures far from 56 of 273 lines: log the figure, the report text of the loss is unchanged'
      delegation_tier: 'standard'
      results: "tier standard, model sonnet, effort medium, profile low-cost, passed first time, inline (leaf), independently verified"
    - id: task-002
      title: 'Plan fields, the new records, stubs of FoldRewrite, FoldCheck and FoldFiles, and their red tests'
      source_requirements:
        prd:
          - 'REQ-2'
          - 'REQ-3'
          - 'REQ-5'
          - 'REQ-6'
        tdd:
          - 'DEC-1'
          - 'DEC-3'
          - 'DEC-4'
          - 'DEC-5'
          - 'DEC-7'
          - 'CTR-1'
          - 'IF-1'
          - 'IMP-1'
          - 'IMP-2'
          - 'IMP-3'
          - 'IMP-4'
          - 'CON-1'
      outputs:
        - 'Fold.Plan gains headers, intoManifest, foldedName and foldedHorizon (CTR-1), Fold.build fills them from the tree node and the step list; plan(...) keeps its signature; FoldTest and the other callers of the Plan constructor are updated and FoldTest asserts the four new fields on the Brightcart shape (11 header files, the manifest of marketplace, name and horizon of inhouse) and on a plateau with no manifest (null name and horizon, nothing deleted)'
        - 'The records of CTR-1 in workspace/: Rewritten(Map<String, Manifest> written, List<String> deleted), Snapshot(Map<String, List<String>> models, Map<String, ComparisonLines> comparisons), ComparisonLines(List<String> rows, List<String> warnings, List<String> cascade), Check(int plateaus, int comparisons), Folded(Plan plan, Check check, boolean written)'
        - 'FoldRewrite.apply(Plan, Map<String, Manifest>) and FoldCheck.firstDifference(Plan, Snapshot, Snapshot) as stubs that throw UnsupportedOperationException; FoldFiles as an interface with stage, move, delete, restore, disk() and commit(...) where disk() and commit throw UnsupportedOperationException; none of FoldRewrite and FoldCheck imports picocli, jakarta.inject or java.nio.file'
        - 'FoldRewriteTest (plain JUnit): each of the five edits on hand-made Manifests, including a nested element, a patch value that is a text and a list, a replaces that becomes empty, a folded plateau with no manifest, a plateau above whose new parent is not the root (override becomes that plateau), a header that stays as written (yes), and that the argument is not changed'
        - 'FoldCheckTest (plain JUnit): equal snapshots, a changed model line, a missing element, a changed comparison row, a changed warning, a cascade that differs only in its plateau and rank (equal), a cascade that differs in its element (different), two equal elements with their sets in two orders (equal lines, ASM-4), and the order of the walk (the first difference is the one of the first plateau by id)'
        - 'FoldFilesTest: commit on a temporary folder with a failing double at each operation in turn (stage 1, stage 2, move 1, move 2, delete) and after each the folder is byte for byte the folder before (hidden files included); a file changed between the read and the commit stops before the first write; a failure of the restore lists the files; a target that is a symbolic link stays a link and the file it points to has the new bytes; a stale .archicode-fold file is overwritten by the staging; the sentences are those of CTR-2 numbers 10 and 11'
      verification:
        - 'JAVA_HOME=$HOME/.sdkman/candidates/java/25.0.4-tem ./mvnw -q test -Dtest=FoldTest+PlateauFoldServiceTest exits 0'
        - 'JAVA_HOME=$HOME/.sdkman/candidates/java/25.0.4-tem ./mvnw -q test -Dtest=FoldRewriteTest+FoldCheckTest+FoldFilesTest exits non-zero and every failure is UnsupportedOperationException from a stub, not a compile error (task-003 turns FoldRewriteTest green, task-004 FoldCheckTest, task-005 FoldFilesTest)'
        - 'grep -c "picocli\|jakarta.inject\|java.nio.file" src/main/java/io/morin/archicode/workspace/Fold.java src/main/java/io/morin/archicode/workspace/FoldRewrite.java src/main/java/io/morin/archicode/workspace/FoldCheck.java prints 0 for each'
      risk: 'medium'
      confidence: 70
      human_review: 'none'
      escalation_triggers:
        - 'A new test is green on its stub: it proves nothing, strengthen it'
        - 'A test needs Quarkus to call FoldRewrite or FoldCheck: the pure class has a hidden dependency'
        - 'Fold.build cannot fill foldedName or foldedHorizon from the tree node without changing run 0207 refusals: stop, the sentences 1 to 6 are fixed'
      delegation_tier: 'standard'
      results: "tier standard, model sonnet, effort medium, profile low-cost, passed first time, inline (leaf), independently verified"
    - id: task-003
      title: 'Implement FoldRewrite (the five edits)'
      source_requirements:
        prd:
          - 'REQ-2'
          - 'REQ-5'
        tdd:
          - 'DEC-2'
          - 'DEC-3'
          - 'CTR-1'
          - 'IMP-1'
          - 'IF-1'
          - 'CON-1'
          - 'CON-2'
      outputs:
        - 'FoldRewrite.apply: edit 1 (header.plateau becomes plan.into() in each file of plan.headers()), edit 2 (content.override of the plateau above becomes plan.newParent(), taken out when that is baseline), edit 3 (content.patches becomes the patches of the folded manifest followed by the own ones, in order, none turned into a value; nothing added when no manifest declares the folded plateau), edit 4 (each ReplacesChange carried out in the file or in the nth patch value: each reference of from replaced in place by the references of to, distinct, the key taken out when nothing is left, a text stays a text when one reference is left, an empty value written as []), edit 5 (the folded manifest in deleted); the argument and the Manifests it holds are never changed (deepCopy); a file the plan does not name is never touched'
      verification:
        - 'JAVA_HOME=$HOME/.sdkman/candidates/java/25.0.4-tem ./mvnw -q test -Dtest=FoldRewriteTest+FoldTest exits 0'
        - 'JAVA_HOME=$HOME/.sdkman/candidates/java/25.0.4-tem ./mvnw -q test-compile pmd:check exits 0'
        - 'grep -c "picocli\|jakarta.inject\|java.nio.file" src/main/java/io/morin/archicode/workspace/FoldRewrite.java prints 0'
      risk: 'medium'
      confidence: 75
      human_review: 'none'
      escalation_triggers:
        - 'A case needs an edit the TDD does not list: stop, it is a change of the design (DEC-3 says nothing else changes)'
        - 'PMD reports a finding that needs a rule turned off'
      delegation_tier: 'standard'
      results: "tier standard, model sonnet, effort medium, profile low-cost, passed first time, inline (leaf), independently verified"
    - id: task-004
      title: 'Implement FoldCheck (canonical lines, snapshot comparison, the first difference)'
      source_requirements:
        prd:
          - 'REQ-2'
          - 'REQ-6'
        tdd:
          - 'DEC-4'
          - 'ASM-4'
          - 'CTR-1'
          - 'CTR-2'
          - 'IMP-2'
          - 'CON-1'
      outputs:
        - 'FoldCheck: the canonical line of an element (its reference and its JSON as the mapper writes it with object keys sorted and every array sorted by its text, without its elements and relationships, which have lines of their own) and of a relationship; the walk in the fixed order (models by plateau id, then pairs by ids); the cascade rows compared by patch, effect, layer, element and detail with the plateau and the rank left out; firstDifference returns the sentence 9 of CTR-2, for a model and for a comparison, naming the plateau or the pair and the two lines, or Optional.empty()'
      verification:
        - 'JAVA_HOME=$HOME/.sdkman/candidates/java/25.0.4-tem ./mvnw -q test -Dtest=FoldCheckTest exits 0'
        - 'JAVA_HOME=$HOME/.sdkman/candidates/java/25.0.4-tem ./mvnw -q test-compile pmd:check exits 0'
        - 'grep -c "picocli\|jakarta.inject\|java.nio.file" src/main/java/io/morin/archicode/workspace/FoldCheck.java prints 0'
      risk: 'medium'
      confidence: 75
      human_review: 'none'
      escalation_triggers:
        - 'The sentence of a refusal has to change after fold-cases.json holds it: the cases file, the manual and the golden change in the same change'
        - 'Two equal elements give different lines (a collection that is not a set): stop and fix the canonical form, ASM-4 is wrong'
      delegation_tier: 'standard'
      results: "tier standard, model sonnet, effort medium, profile low-cost, passed first time, inline (leaf), independently verified"
    - id: task-005
      title: 'Implement FoldFiles (stage, move, delete last, put back, the stale-read check)'
      source_requirements:
        prd:
          - 'REQ-3'
        tdd:
          - 'DEC-1'
          - 'DEC-5'
          - 'CTR-2'
          - 'ASM-7'
          - 'RISK-2'
          - 'IMP-3'
          - 'CON-3'
          - 'CON-4'
      outputs:
        - 'FoldFiles.disk() and FoldFiles.commit over any implementation, in the order of DEC-5: step a re-reads every file to be rewritten or deleted and compares with the bytes the service read, any difference stops with sentence 10 before anything is written; step b stages the new bytes next to each real target (toRealPath) as <file>.archicode-fold, create or truncate, with the permissions of the original, a failure removes what was staged and stops; step c moves each staged file over its target (an atomic replace, in the order of the paths); step d deletes the folded manifest last; a failure in step c or d puts back, from the bytes held in memory, every file already moved or deleted, removes the rest of the staged files and stops with sentence 11, listing the files that may be partly written when putting back failed too; the file system reason is the JDK message, never a stack trace'
      verification:
        - 'JAVA_HOME=$HOME/.sdkman/candidates/java/25.0.4-tem ./mvnw -q test -Dtest=FoldFilesTest exits 0'
        - 'JAVA_HOME=$HOME/.sdkman/candidates/java/25.0.4-tem ./mvnw -q test-compile pmd:check exits 0'
        - 'grep -c "NOPMD" src/main/java/io/morin/archicode/workspace/FoldFiles.java prints 0'
      risk: 'high'
      confidence: 70
      human_review: 'after'
      escalation_triggers:
        - 'A failing double at any operation leaves the folder different from before: stop, this is the one promise of the writer (REQ-3)'
        - 'The atomic move is not supported on the file system of the test (a link or a mount): log it and use the nearest documented fallback only if it keeps the all-or-nothing test green'
        - 'A branch of FoldFiles cannot be reached by a double and the JaCoCo branch floor would fall: add the double, never lower the floor'
      delegation_tier: 'hard_judgment'
      results: "tier hard_judgment, model sonnet, effort high, profile low-cost, passed first time, inline (leaf), independently verified"
    - id: task-006
      title: 'The service: read, rewrite, temporary copy, snapshots, the check and the dry run, with the cases F20 to F27'
      source_requirements:
        prd:
          - 'REQ-1'
          - 'REQ-2'
          - 'REQ-6'
          - 'REQ-7'
          - 'REQ-8'
        tdd:
          - 'DEC-4'
          - 'DEC-6'
          - 'DEC-7'
          - 'DEC-8'
          - 'CTR-1'
          - 'CTR-2'
          - 'CTR-4'
          - 'FLOW-1'
          - 'IMP-4'
          - 'ASM-5'
          - 'ASM-6'
          - 'ASM-8'
          - 'CON-4'
      outputs:
        - 'PlateauFoldService.fold(Path, String, boolean write, FoldFiles) returning Folded: steps 1 to 6 of FLOW-1 (the plan; the bytes and Manifests of the files the plan names; FoldRewrite.apply and the texts written with forWriting; the temporary folder holding .archicode.yaml and the discovered manifests with the new texts and the deletion applied; the snapshot of the original and of the copy for every plateau that remains, the loads of the copy under Warnings.silently; FoldCheck.firstDifference); sentence 7 (a kept plateau does not load on the original: the loader line) and sentence 8 (it does not load on the copy); the temporary folder removed in a finally whatever the outcome; with write false it returns Folded(plan, check, false) and the folder is unchanged; plan(Path, String) of run 0207 stays'
        - 'FoldReport.render(Folded) in its dry mode: the first line, the blocks of run 0207 in the same order, the deleted file line with name and horizon not kept (DEC-7), the new closing line with the counts of Check'
        - 'fold-cases.json: the comment at the top updated; expect.files supported (exact text, null for a deleted file, the marker changed for a rewritten file whose text is not pinned, every other file of the base byte-identical); F08 updated to the new closing line and the dry first line; the new cases F20 (small workspace, exact expect.files: header changed, override taken out, patches in order), F21 (the plateau above overrides a plateau that is not the root), F22 (the folded plateau has no manifest), F23 (a replaces entry in a patch value is composed), F24 (an entry that names an element the folded plateau removes: the check refuses, sentence 9; if the kernel behaves otherwise, the fallback of ASM-6 is a folded patch whose json-path matches an element of the plateau above), F25 (a TOML and a JSON manifest keep their format), F26 (a kept plateau is unreadable on the original: the loader line), F27 (the dry run of F20 prints the dry report and writes nothing)'
        - 'PlateauFoldServiceTest (QuarkusTest): every case of the file through the service on a temp copy of its base with a FoldFiles double that fails the test if it is called in a dry run; the error stream is empty on the Brightcart plan (ASM-8); the dry run leaves the folder identical byte for byte and its report twice gives the same bytes'
      verification:
        - 'JAVA_HOME=$HOME/.sdkman/candidates/java/25.0.4-tem ./mvnw -q test -Dtest=PlateauFoldServiceTest+FoldTest+FoldRewriteTest+FoldCheckTest exits 0, except the write case F07 which task-007 turns green'
        - 'node -e "JSON.parse(require(''fs'').readFileSync(''src/test/javascript/viewpoint-kernel/fold-cases.json'',''utf8''))" exits 0'
        - 'npx prettier --check src/test/javascript/viewpoint-kernel/fold-cases.json exits 0'
        - 'JAVA_HOME=$HOME/.sdkman/candidates/java/25.0.4-tem ./mvnw -q test-compile pmd:check exits 0'
        - 'grep -c "picocli" src/main/java/io/morin/archicode/workspace/PlateauFoldService.java prints 0'
      risk: 'high'
      confidence: 65
      human_review: 'after'
      escalation_triggers:
        - 'The check refuses the Brightcart fold of inhouse into marketplace (ASM-5 refuted): read the first difference it names, fix the rewrite or the composition, never loosen the check'
        - 'F24 does not refuse (ASM-6 refuted): use the fallback case of the task and log it'
        - 'The loads of the copy print a warning on the error output: Warnings.silently is not covering them'
        - 'A sentence of run 0207 (1 to 6) has to change: stop, REQ-8'
      delegation_tier: 'hard_judgment'
      results: "tier hard_judgment, model sonnet, effort high, profile low-cost, passed first time, inline (leaf), independently verified"
    - id: task-007
      title: 'The write path of the service, the written report, the write case F07 and the failed-write proof'
      source_requirements:
        prd:
          - 'REQ-2'
          - 'REQ-3'
          - 'REQ-7'
        tdd:
          - 'DEC-5'
          - 'DEC-6'
          - 'DEC-8'
          - 'CTR-2'
          - 'FLOW-1'
          - 'IF-2'
          - 'CON-4'
      outputs:
        - 'PlateauFoldService.fold with write true: after the check it calls FoldFiles.commit (DEC-5) with the bytes it read first and returns Folded(plan, check, true); sentences 10 and 11 reach the caller as ArchiCodeException'
        - 'FoldReport.render(Folded) in its written mode: the first line (written), the block title in the past tense, the final line that points to git diff, plateau list and diff; same workspace, same bytes (sorted, no clock, no machine path)'
        - 'fold-cases.json: F07 replaced by the plain form on the Brightcart with the two stories replaced, with expect.files marking each file the report lists as changed and the deleted manifest as null, and the written report as expect.output'
        - 'PlateauFoldServiceTest: F07 through the service; a fold with a FoldFiles double that fails at the first move and at the delete leaves the whole Brightcart copy byte for byte as it was (REQ-3, snapshot with hidden files); a file of the plan changed between the read and the commit leaves the folder unchanged and gives sentence 10; a second fold of the folded copy gives the sentence of F01'
      verification:
        - 'JAVA_HOME=$HOME/.sdkman/candidates/java/25.0.4-tem ./mvnw -q test -Dtest=PlateauFoldServiceTest+FoldTest+FoldFilesTest exits 0'
        - 'npx prettier --check src/test/javascript/viewpoint-kernel/fold-cases.json exits 0'
        - 'JAVA_HOME=$HOME/.sdkman/candidates/java/25.0.4-tem ./mvnw -q test-compile pmd:check exits 0'
      risk: 'high'
      confidence: 70
      human_review: 'after'
      escalation_triggers:
        - 'The folded Brightcart is refused by its own check: the writer would write what the oracle rejects, stop and find the difference'
        - 'A failing double leaves a file different from before: stop, DEC-5 is broken'
        - 'The written report differs between two runs on the same workspace: find the unsorted source'
      delegation_tier: 'hard_judgment'
      results: "tier hard_judgment, model sonnet, effort high, profile low-cost, passed first time, inline (leaf), independently verified"
    - id: task-008
      title: 'The command writes, PlateauFoldCommandTest and PlateauFoldIT'
      source_requirements:
        prd:
          - 'REQ-1'
          - 'REQ-7'
          - 'REQ-8'
        tdd:
          - 'DEC-6'
          - 'CTR-3'
          - 'IMP-6'
          - 'IF-3'
          - 'CON-6'
          - 'RISK-7'
      outputs:
        - 'FoldCommand: the plain form folds and prints the written report, exit 0; --dry-run prints the dry report and writes nothing; any refusal or failure is one error line on the error output, exit 1, nothing on the standard output; no logic beyond the arguments and printing; the description says the fold writes; it passes FoldFiles.disk() to the service; the refusal of the plain form is gone'
        - 'PlateauFoldCommandTest: the cases of the file (F01 to F08 and F20 to F27) through CliHarness with expect.files, the stream and the exit code; for every refusal the folder is unchanged (snapshot of every file with its bytes, hidden ones too); the dry run is unchanged byte for byte and its report twice gives the same bytes; nothing on the standard output on an error'
        - 'PlateauFoldIT (the packaged application, the jar and the native runner): fold on a copy of the layered Brightcart, exit 0 and the written first line, plateau list without inhouse, views generate succeeds, the second fold refused with the sentence of F01 (one error line, exit 1)'
      verification:
        - 'JAVA_HOME=$HOME/.sdkman/candidates/java/25.0.4-tem ./mvnw -q test -Dtest=PlateauFoldCommandTest+PlateauFoldServiceTest+FoldTest exits 0'
        - 'JAVA_HOME=$HOME/.sdkman/candidates/java/25.0.4-tem ./mvnw -q verify -DskipITs=false -Dit.test=PlateauFoldIT -Dtest=NoSuchTest -Dsurefire.failIfNoSpecifiedTests=false -Djacoco.skip=true exits 0 (no unit test runs there, so the JaCoCo floors are left to task-013)'
        - 'JAVA_HOME=$HOME/.sdkman/candidates/java/25.0.4-tem ./mvnw -q test-compile pmd:check exits 0'
        - 'grep -c "does not write yet" src/main/java/io/morin/archicode/cli/FoldCommand.java prints 0'
      risk: 'medium'
      confidence: 75
      human_review: 'none'
      escalation_triggers:
        - 'The IT fails on the jar but the command test passes: a class read by reflection is missing from reflect-config.json, add it (Rewritten, Snapshot, ComparisonLines, Check and Folded are plain records and are not read by reflection; Manifest and its builders are registered)'
        - 'The unchanged-folder test fails for a refusal: something writes before the check, stop and find it'
        - 'No JDK 25 for the jar'
      delegation_tier: 'standard'
      results: "tier standard, model sonnet, effort medium, profile low-cost, passed first time, inline (leaf), independently verified"
    - id: task-009
      title: 'The before and after test on the layered Brightcart and its record in the run document'
      source_requirements:
        prd:
          - 'REQ-2'
        tdd:
          - 'DEC-9'
          - 'ASM-5'
          - 'RISK-4'
          - 'TG-6'
      outputs:
        - 'PlateauFoldBeforeAfterTest (QuarkusTest, CliHarness, package cli): copies the layered Brightcart, replaces the two stories that name inhouse as F08 does, runs plateau list, diff -f json for every ordered pair of the plateaus that remain, query graph --plateau P (sorted) and views generate for each remaining plateau and for marketplace against baseline, folds inhouse into marketplace through the command, runs the same again, and asserts equality but for the cascade rows of diff and gap.json without their plateau and rank, the same rows of gap.md with their first two cells blanked, and the rows of plateau list; then folds again and asserts the sentence of F01'
        - 'A section Verification in run-0208-plateau-fold-writer.md: the commands, the figures (plateaus that remain, comparisons checked, files rewritten, patches merged, the one replaces composed, the byte counts or hashes of the equal outputs) and the second-fold sentence, as the P3 gate asks for a record'
      verification:
        - 'JAVA_HOME=$HOME/.sdkman/candidates/java/25.0.4-tem ./mvnw -q test -Dtest=PlateauFoldBeforeAfterTest exits 0'
        - 'grep -n "^## Verification" docs/wav/wav-028-fold-and-browser-menu/run/run-0208-plateau-fold-writer/run-0208-plateau-fold-writer.md prints a line'
        - 'JAVA_HOME=$HOME/.sdkman/candidates/java/25.0.4-tem ./mvnw -q test-compile pmd:check exits 0'
      risk: 'medium'
      confidence: 70
      human_review: 'none'
      escalation_triggers:
        - 'A difference other than the PLATEAU and PATCH columns appears: ASM-5 is refuted for the writer, the run is not done until the cause is fixed in FoldRewrite, never by loosening the test'
        - 'The order of siblings in query graph is not stable (run 0190): sort the output before comparing, as the test says'
      delegation_tier: 'standard'
      results: "tier standard, model sonnet, effort medium, profile low-cost, passed first time, inline (leaf), independently verified"
    - id: task-010
      title: 'The node test that opens the folded workspace in the editor'
      source_requirements:
        prd:
          - 'REQ-1'
        tdd:
          - 'DEC-10'
          - 'RISK-6'
          - 'CON-7'
      outputs:
        - 'src/test/javascript/viewpoint-kernel/fold-workspace.test.js: builds the folded workspace in memory from the base folder, the case files and expect.files of the hand-made write cases (F20 and F25, the ones with exact texts), opens it in the editor harness as init-workspace.test.js opens the workspace init writes, and asserts no error, the plateaus baseline, marketplace and saas present and inhouse gone'
        - 'The comment at the top of fold-cases.json says the node test reads it too'
      verification:
        - 'npm run editor:build exits 0 and git status --short src/main/resources/editor-webapp shows no change'
        - 'node --test src/test/javascript/viewpoint-kernel/fold-workspace.test.js exits 0'
        - 'npx eslint --max-warnings 0 src/test/javascript/viewpoint-kernel/fold-workspace.test.js exits 0'
        - 'npx prettier --check src/test/javascript/viewpoint-kernel/fold-workspace.test.js src/test/javascript/viewpoint-kernel/fold-cases.json exits 0'
      risk: 'low'
      confidence: 75
      human_review: 'none'
      escalation_triggers:
        - 'The editor refuses a folded workspace the loader reads: a real difference between the tools, stop and log it as a finding'
        - 'The write cases carry no exact text the test can use: ask for the marker changed to be replaced by a text in the case, in task-007 terms'
      delegation_tier: 'standard'
      results: "tier standard, model sonnet, effort medium, profile low-cost, passed first time, inline (leaf), independently verified"
    - id: task-011
      title: 'Say the writer in the guide and regenerate the golden file'
      source_requirements:
        prd:
          - 'REQ-4'
        tdd:
          - 'IMP-9'
          - 'CON-5'
      outputs:
        - 'guide.md: the plateau paragraph says that plateau fold folds, that --dry-run prints the checked plan, that a refused or failed fold changes nothing, and that the rewritten files lose their comments; the sentence that says the plain form is an error is gone'
        - 'golden.md regenerated with archicode guide piped through the sed of CLAUDE.md (archicode guide | sed 1s/.*/archicode guide @VERSION@/), in the same change, from the packaged application'
      verification:
        - 'JAVA_HOME=$HOME/.sdkman/candidates/java/25.0.4-tem ./mvnw -q test -Dtest=GuideTest+GuideCorpusTest exits 0'
        - 'wc -c src/test/resources/guide/golden.md prints fewer than 30000'
        - 'grep -c "does not write yet" src/main/resources/guide/guide.md src/test/resources/guide/golden.md prints 0 for both'
      risk: 'low'
      confidence: 85
      human_review: 'none'
      escalation_triggers:
        - 'The golden file would exceed the 30 KB budget of GuideTest: shorten the sentence, the budget is not changed'
      delegation_tier: 'standard'
      results: "tier standard, model sonnet, effort medium, profile low-cost, passed first time, inline (leaf), independently verified"
    - id: task-012
      title: 'Describe the writer in the manual and in CLAUDE.md'
      source_requirements:
        prd:
          - 'REQ-4'
          - 'REQ-5'
        tdd:
          - 'IMP-9'
          - 'CTR-2'
          - 'DEC-5'
          - 'DEC-7'
          - 'RISK-1'
          - 'RISK-2'
          - 'DEF-1'
          - 'DEF-3'
          - 'DEF-4'
      outputs:
        - 'README.adoc: [[plateau-fold]] becomes the page of the command (the dry run and the fold, the order of the refusals, sentences 7 to 11 copied from the cases file, what is checked, what the rewritten files lose including the name and horizon of the deleted manifest, the guarantee worded as all of its files or none unless the process is killed while it moves them, git and a clean tree); [[fold-by-hand]] says the command does the recipe and checks it and keeps the recipe for a plateau the command refuses; [[plateau-limits]] loses the sentence that folding is done by hand and gains the limits (comments, quotes and layout; the name and horizon; one plateau above only; a killed process); the item of [[upgrade-0-21]] for plateau fold says that the plain form folds'
        - 'CLAUDE.md: the layered-plateaus paragraph names the writer, FoldRewrite, FoldCheck, FoldFiles, the check on a temporary copy, the guarantee and its limit, fold-cases.json with expect.files and the new node test, and replaces run 0207 sentence that the plain form refuses'
      verification:
        - 'grep -n "\[\[plateau-fold\]\]" src/doc/README.adoc prints a line'
        - 'grep -c "does not write yet" src/doc/README.adoc CLAUDE.md prints 0 for both'
        - 'grep -n "FoldFiles" CLAUDE.md prints a line'
        - 'npm run format:check exits 0'
      risk: 'low'
      confidence: 75
      human_review: 'none'
      escalation_triggers:
        - 'A sentence quoted in the manual differs from the cases file: the cases file wins, copy it'
        - 'The manual has no open release block for the next version'
      delegation_tier: 'standard'
      results: "tier standard, model sonnet, effort medium, profile low-cost, passed after escalation to effort high, inline (leaf), independently verified"
    - id: task-013
      title: 'Run the gates'
      source_requirements:
        prd:
          - 'REQ-1'
        tdd:
          - 'Observability and Verification'
          - 'CON-2'
          - 'CON-5'
          - 'CON-7'
      outputs:
        - 'One Log line in prg-0208 with the exit code of each gate and the line, instruction and branch coverage of the JaCoCo report'
      verification:
        - 'JAVA_HOME=$HOME/.sdkman/candidates/java/25.0.4-tem ./mvnw verify exits 0 (unit tests, PMD and the JaCoCo floors)'
        - 'JAVA_HOME=$HOME/.sdkman/candidates/java/25.0.4-tem ./mvnw verify -DskipITs=false exits 0'
        - 'JAVA_HOME=$HOME/.sdkman/candidates/java/25.0.4-tem ./mvnw test-compile pmd:check exits 0'
        - 'JAVA_HOME=$HOME/.sdkman/candidates/java/25.0.4-tem scripts/byte-identity.sh exits 0 with no unexpected difference'
        - 'npm run test:unit exits 0'
        - 'npm run lint exits 0'
        - 'npm run format:check exits 0'
        - 'npm run editor:check exits 0'
      risk: 'low'
      confidence: 85
      human_review: 'none'
      escalation_triggers:
        - 'A JaCoCo floor fails: add a test that asserts what the code returns, never lower a floor'
        - 'byte-identity shows a difference in an existing command'
        - 'No JDK 25, no tag archicode-0.19.0 for the harness, or no npm ci done: log the gate as not run with the reason'
      delegation_tier: 'standard'
      results: "tier standard, model sonnet, effort medium, profile low-cost, passed first time, inline (leaf), independently verified"
    - id: task-014
      title: 'Sabotage checks, the notice for the author, and close the implementation'
      source_requirements:
        prd:
          - 'REQ-2'
          - 'REQ-3'
        tdd:
          - 'Observability and Verification (sabotage record)'
          - 'DEC-3'
          - 'DEC-4'
          - 'DEC-5'
          - 'Open Questions'
      outputs:
        - 'One Log line with the four verdicts and the list of files changed. Sabotage 1 (the composition of replaces left out of FoldRewrite): the oracle refuses the Brightcart fold and F07 and the before and after test fail. Sabotage 2 (the check made to skip the warnings): the test of F24 fails. Sabotage 3 (FoldFiles.commit made to delete before it moves): the folder-unchanged test fails at the failing move. Sabotage 4 (the stale-read check removed): the changed-file test fails. All four sources restored and the named tests pass again'
        - 'The three items for the author, in the run document and in the Log: the check in the dry run adds a refusal beyond D2 list; the patches stay patches (D3 says direct values); a rewritten manifest keeps its extension and format and loses its comments; plus the pinned ids F20 to F27 of fold-cases.json and the one new node test outside likely_paths'
      verification:
        - 'a sha256 list of every file under src/main/java and src/test/java, taken into the scratchpad before the sabotage (find ... -type f | sort | xargs sha256sum), is identical after the restore (git diff --stat is not enough: the files of this run are untracked, the run commits nothing)'
        - 'JAVA_HOME=$HOME/.sdkman/candidates/java/25.0.4-tem ./mvnw -q test -Dtest=FoldRewriteTest+FoldCheckTest+FoldFilesTest+PlateauFoldServiceTest+PlateauFoldCommandTest exits 0 after the restore'
        - 'git status --short lists only the files named in the outputs of tasks 001 to 012 and the run documents'
      risk: 'medium'
      confidence: 75
      human_review: 'none'
      escalation_triggers:
        - 'A sabotaged tree still passes: the test proves nothing, strengthen it and run task-013 again'
        - 'A file outside the expected list changed'
      delegation_tier: 'standard'
      results: "tier standard, model sonnet, effort medium, profile low-cost, passed first time, inline (leaf), independently verified"
```

## 5. Parallelization Plan

```yaml
parallelization_plan:
  groups:
    - id: parallel-group-001
      tasks:
        - task-008
        - task-010
      reason: 'Both need only the finished service and its cases (task-007). The command with its Maven tests and the IT is Java; the node test is JavaScript and reads fold-cases.json without changing code.'
      conflict_risks:
        - 'task-008 runs Maven and builds the jar into target/ while task-010 runs node only (editor:build writes the page only when its bytes change and no source of the editor changes); no two Maven commands run at once'
        - 'Both read fold-cases.json; task-010 may only change its header comment, and task-008 does not edit the file, so there is one writer'
    - id: parallel-group-002
      tasks:
        - task-011
        - task-012
      reason: 'The guide with its golden file and the manual with CLAUDE.md are different files and both need only the finished command.'
      conflict_risks:
        - 'task-011 runs Maven and the packaged application to regenerate the golden file while task-012 edits README.adoc and CLAUDE.md and runs only the format check; ManualExamplesTest runs in task-013, so two builds never share target/'
        - 'Neither task edits Java; the gates of task-013 run after both'
```

Tasks 001 to 007 are a straight line (each reads what the one before wrote, and each runs Maven in the one build tree). Task-009 follows task-008 because it folds through the command. Tasks 013 and 014 edit and run the whole tree, so they run alone.

## 6. Human Review Gates

```yaml
human_review_gates:
  gates:
    - id: gate-001
      trigger: 'The writer deletes and rewrites manifests in the author workspace (task-005, task-006, task-007)'
      required_before: []
      required_after: ['task-007']
      reviewer_focus:
        - 'the order of FoldFiles.commit and what it puts back when a write fails (DEC-5)'
        - 'that the check on the temporary copy runs before the first write and in the dry run too, and that no flag lets a refused fold through'
        - 'that the three decisions told at close-out (the new refusal beyond D2, patches kept as patches, format kept and comments lost) are acceptable'
```

Under the autonomy override of complete-run the gate does not stop the run: the tasks it covers are `review_after`, not `human_required`, their independent verification runs at the elevated pair, task-009 and task-014 prove the writer from outside (the before and after record, the sabotage checks), and the author reads the three items at close-out. The loss of data is bounded: git holds the old files (RISK-1), the write is all or nothing for a failure the process survives (DEC-5), and the check refuses before the first write.

## 7. Risk Assessment

```yaml
risk_assessment:
  by_task:
    - id: task-001
      risk: 'medium'
      rationale: 'A new public field on Facts and a writer variant of the shared mapper; the round-trip corpus test is the guard, and CON-5 is checked by the existing tests'
    - id: task-002
      risk: 'medium'
      rationale: 'The stubs and records fix the contract of three classes; a test green on its stub proves nothing'
    - id: task-003
      risk: 'medium'
      rationale: 'Five edits on manifests; a wrong edit is caught by the check on the copy, and by the cases'
    - id: task-004
      risk: 'medium'
      rationale: 'Too loose a check lets a different model through, too strict refuses a good fold (RISK-3, RISK-4)'
    - id: task-005
      risk: 'high'
      rationale: 'Deletes and replaces files in the workspace; a wrong order or a missing put-back loses data (RISK-1, RISK-2)'
    - id: task-006
      risk: 'high'
      rationale: 'The service decides what is written; ASM-5 and ASM-6 are tested here for the first time, and the temporary copy must never leak into the workspace'
    - id: task-007
      risk: 'high'
      rationale: 'The first task that writes into a workspace; the failed-write proof is REQ-3'
    - id: task-008
      risk: 'medium'
      rationale: 'Native registration is proved only by CI; the refusals must leave the folder unchanged'
    - id: task-009
      risk: 'medium'
      rationale: 'It can show that ASM-5 does not hold; the record is the evidence the P3 gate asks for'
    - id: task-010
      risk: 'low'
      rationale: 'A node test over files; it can only fail, not change behaviour'
    - id: task-011
      risk: 'low'
      rationale: 'Generated command list; the size budget is checked'
    - id: task-012
      risk: 'low'
      rationale: 'Prose with located anchors, sentences copied from the cases file'
    - id: task-013
      risk: 'low'
      rationale: 'Commands only'
    - id: task-014
      risk: 'medium'
      rationale: 'Temporary edits to the writer restored and compared by a sha256 list of the sources'
  by_area:
    - area: 'data'
      risk: 'high'
      rationale: 'RISK-1 and RISK-2: the command deletes a manifest and rewrites others; mitigated by the check before the write, the all-or-nothing commit and git'
    - area: 'api'
      risk: 'medium'
      rationale: 'The plain form of the command changes from an error to a fold, announced by run 0207; Facts and Plan gain fields that other classes construct'
    - area: 'infra'
      risk: 'medium'
      rationale: 'RISK-7: native serialisation of Manifest is proved only by the Native job'
    - area: 'docs'
      risk: 'low'
      rationale: 'The sentences are copied from the cases file; the golden file has a budget'
```

## 8. Confidence Assessment

```yaml
confidence_assessment:
  by_task:
    - id: task-001
      score: 75
      rationale: 'The round trip was measured on 120 files, the corpus is 421; JSON and TOML writers have no sample in the repository'
    - id: task-002
      score: 70
      rationale: 'Many tests and records in one task; the hand-made data for the check needs care'
    - id: task-003
      score: 75
      rationale: 'Five edits fully specified in DEC-3; the replaces edit in a nested element and in a patch value has the most cases'
    - id: task-004
      score: 75
      rationale: 'The canonical form is decided (ASM-4); the walk order and the sentence are fixed'
    - id: task-005
      score: 70
      rationale: 'The order is specified; symbolic links, atomic moves and permissions vary by file system'
    - id: task-006
      score: 65
      rationale: 'The largest task: snapshots of every plateau and pair, the temporary copy, and ASM-5 and ASM-6 are first exercised here'
    - id: task-007
      score: 70
      rationale: 'Mostly wiring over task-005 and task-006; the failed-write proof is specified'
    - id: task-008
      score: 75
      rationale: 'The pattern is the command of run 0207; the IT builds a jar'
    - id: task-009
      score: 70
      rationale: 'It runs three commands per plateau; the cascade columns to ignore are known from run 0190'
    - id: task-010
      score: 75
      rationale: 'The precedent is init-workspace.test.js'
    - id: task-011
      score: 85
      rationale: 'A regeneration recipe is in CLAUDE.md'
    - id: task-012
      score: 75
      rationale: 'Five anchors to edit and prose that must match the cases file'
    - id: task-013
      score: 85
      rationale: 'Known commands; needs a JDK 25, the 0.19.0 tag and npm ci'
    - id: task-014
      score: 75
      rationale: 'Four sabotages, each needing an exact restore'
```

## 9. Agent Assignment Plan

```yaml
agent_assignment_plan:
  assignments:
    - task_id: task-001
      agent_role: 'Backend Implementation Agent'
      objective: 'Add the writer mapper, Header.toBuilder, Facts.manifestFiles and Warnings.silently, and prove by a corpus test that every manifest the repository ships round-trips in its own format'
      context:
        prd_excerpts:
          - 'REQ-5: the rewrite is in Java from the manifests as the loader reads them; REQ-7: a rewritten manifest keeps its format'
        tdd_excerpts:
          - 'DEC-2 (NON_NULL for forWriting), IMP-5, IMP-7, ASM-1, ASM-3, ASM-7, ASM-8'
      likely_files:
        - 'src/main/java/io/morin/archicode/MapperFactory.java'
        - 'src/main/java/io/morin/archicode/manifest/Manifest.java'
        - 'src/main/java/io/morin/archicode/Warnings.java'
        - 'src/main/java/io/morin/archicode/workspace/WorkspaceFactory.java'
        - 'src/test/java/io/morin/archicode/doc/ManifestCorpus.java'
        - 'src/test/java/io/morin/archicode/doc/ManifestRoundTripCorpusTest.java'
      acceptance_criteria:
        - 'The corpus test passes in YAML, JSON and TOML; the reading mappers are unchanged'
        - 'The Writer facts line is in the progress log'
      verification:
        - 'JAVA_HOME=$HOME/.sdkman/candidates/java/25.0.4-tem ./mvnw -q test -Dtest=ManifestRoundTripCorpusTest exits 0'
        - 'JAVA_HOME=$HOME/.sdkman/candidates/java/25.0.4-tem ./mvnw -q test -Dtest=ManifestDiscoveryTest+FoldTest exits 0 (the existing readers are unchanged)'
        - 'JAVA_HOME=$HOME/.sdkman/candidates/java/25.0.4-tem ./mvnw -q test-compile pmd:check exits 0'
        - 'grep -c "Writer facts" docs/wav/wav-028-fold-and-browser-menu/run/run-0208-plateau-fold-writer/prg-0208-plateau-fold-writer.md prints 1 or more'
        - 'git status --short src/main/editor src/main/resources/editor-webapp shows no change'
      escalation_triggers:
        - 'A manifest does not round-trip equal'
      suggested_subagent_type: 'general-purpose'
      suggested_model: '(default)'
      suggested_effort: 'medium'
    - task_id: task-002
      agent_role: 'Test Generation Agent'
      objective: 'Extend the Plan, write the records and the stubs, and the tests of the three new classes so that they fail on the stubs for the right reason'
      context:
        prd_excerpts:
          - 'REQ-3: a test makes a write fail; REQ-5: the logic is pure classes a later endpoint can call'
        tdd_excerpts:
          - 'CTR-1 (every record), DEC-1 (the four methods of FoldFiles), DEC-3 (the five edits), DEC-4 (what a snapshot holds), DEC-5 (the order of commit), Observability and Verification (the lists of tests)'
      likely_files:
        - 'src/main/java/io/morin/archicode/workspace/Fold.java'
        - 'src/main/java/io/morin/archicode/workspace/FoldRewrite.java'
        - 'src/main/java/io/morin/archicode/workspace/FoldCheck.java'
        - 'src/main/java/io/morin/archicode/workspace/FoldFiles.java'
        - 'src/test/java/io/morin/archicode/workspace/FoldTest.java'
        - 'src/test/java/io/morin/archicode/workspace/FoldRewriteTest.java'
        - 'src/test/java/io/morin/archicode/workspace/FoldCheckTest.java'
        - 'src/test/java/io/morin/archicode/workspace/FoldFilesTest.java'
      acceptance_criteria:
        - 'FoldTest passes with the four new fields; the other three test classes fail with UnsupportedOperationException, not a compile error'
        - 'No pure class imports picocli, jakarta.inject or java.nio.file'
      verification:
        - 'JAVA_HOME=$HOME/.sdkman/candidates/java/25.0.4-tem ./mvnw -q test -Dtest=FoldTest+PlateauFoldServiceTest exits 0'
        - 'JAVA_HOME=$HOME/.sdkman/candidates/java/25.0.4-tem ./mvnw -q test -Dtest=FoldRewriteTest+FoldCheckTest+FoldFilesTest exits non-zero and every failure is UnsupportedOperationException from a stub, not a compile error (task-003 turns FoldRewriteTest green, task-004 FoldCheckTest, task-005 FoldFilesTest)'
        - 'grep -c "picocli\|jakarta.inject\|java.nio.file" src/main/java/io/morin/archicode/workspace/Fold.java src/main/java/io/morin/archicode/workspace/FoldRewrite.java src/main/java/io/morin/archicode/workspace/FoldCheck.java prints 0 for each'
      escalation_triggers:
        - 'Green on a stub'
      suggested_subagent_type: 'general-purpose'
      suggested_model: '(default)'
      suggested_effort: 'medium'
    - task_id: task-003
      agent_role: 'Backend Implementation Agent'
      objective: 'Make FoldRewriteTest pass with the five edits of the TDD'
      context:
        prd_excerpts:
          - 'REQ-5: the rewrite carries out the plan and nothing else'
        tdd_excerpts:
          - 'DEC-3 (the five edits in full), CTR-1 (Rewritten), IMP-1'
      likely_files:
        - 'src/main/java/io/morin/archicode/workspace/FoldRewrite.java'
        - 'src/main/java/io/morin/archicode/workspace/Fold.java'
        - 'src/main/java/io/morin/archicode/manifest/Manifest.java'
      acceptance_criteria:
        - 'FoldRewriteTest and FoldTest pass; PMD is clean with no NOPMD'
      verification:
        - 'JAVA_HOME=$HOME/.sdkman/candidates/java/25.0.4-tem ./mvnw -q test -Dtest=FoldRewriteTest+FoldTest exits 0'
        - 'JAVA_HOME=$HOME/.sdkman/candidates/java/25.0.4-tem ./mvnw -q test-compile pmd:check exits 0'
        - 'grep -c "picocli\|jakarta.inject\|java.nio.file" src/main/java/io/morin/archicode/workspace/FoldRewrite.java prints 0'
      escalation_triggers:
        - 'An edit the TDD does not list'
      suggested_subagent_type: 'general-purpose'
      suggested_model: '(default)'
      suggested_effort: 'medium'
    - task_id: task-004
      agent_role: 'Backend Implementation Agent'
      objective: 'Make FoldCheckTest pass with the canonical lines and the walk of DEC-4'
      context:
        prd_excerpts:
          - 'REQ-2 and REQ-6: the plateaus that stay read the same but for the PLATEAU and PATCH columns'
        tdd_excerpts:
          - 'DEC-4, ASM-4, CTR-1 (Snapshot, ComparisonLines), CTR-2 sentence 9'
      likely_files:
        - 'src/main/java/io/morin/archicode/workspace/FoldCheck.java'
        - 'src/main/java/io/morin/archicode/rendering/gap/GapReport.java'
      acceptance_criteria:
        - 'FoldCheckTest passes; PMD is clean; the class takes snapshots and does not load plateaus'
      verification:
        - 'JAVA_HOME=$HOME/.sdkman/candidates/java/25.0.4-tem ./mvnw -q test -Dtest=FoldCheckTest exits 0'
        - 'JAVA_HOME=$HOME/.sdkman/candidates/java/25.0.4-tem ./mvnw -q test-compile pmd:check exits 0'
        - 'grep -c "picocli\|jakarta.inject\|java.nio.file" src/main/java/io/morin/archicode/workspace/FoldCheck.java prints 0'
      escalation_triggers:
        - 'Two equal elements give different lines'
      suggested_subagent_type: 'general-purpose'
      suggested_model: '(default)'
      suggested_effort: 'medium'
    - task_id: task-005
      agent_role: 'Backend Implementation Agent'
      objective: 'Write the all-or-nothing commit of the files and the disk implementation, and make every failure branch reachable by a test double'
      context:
        prd_excerpts:
          - 'REQ-3: the fold writes all its files or none, and a test makes one write fail and shows the folder unchanged'
        tdd_excerpts:
          - 'DEC-5 in full (steps a to d, toRealPath, the stale .archicode-fold, the limit of a killed process), CTR-2 sentences 10 and 11, ASM-7, IMP-3'
      likely_files:
        - 'src/main/java/io/morin/archicode/workspace/FoldFiles.java'
        - 'src/test/java/io/morin/archicode/workspace/FoldFilesTest.java'
      acceptance_criteria:
        - 'FoldFilesTest passes with a failing double at each operation in turn; the folder is byte for byte as it was after each'
        - 'PMD is clean with no NOPMD; every failure branch is covered'
      verification:
        - 'JAVA_HOME=$HOME/.sdkman/candidates/java/25.0.4-tem ./mvnw -q test -Dtest=FoldFilesTest exits 0'
        - 'JAVA_HOME=$HOME/.sdkman/candidates/java/25.0.4-tem ./mvnw -q test-compile pmd:check exits 0'
        - 'grep -c "NOPMD" src/main/java/io/morin/archicode/workspace/FoldFiles.java prints 0'
      escalation_triggers:
        - 'A folder differs after a failure'
      suggested_subagent_type: '(inline)'
      suggested_model: '(default)'
      suggested_effort: '(inline)'
    - task_id: task-006
      agent_role: 'Backend Implementation Agent'
      objective: 'Build the service up to the check and the dry run, and the cases of the shared file that exercise it'
      context:
        prd_excerpts:
          - 'REQ-2, REQ-6, REQ-7: the plateaus that stay read the same, the cascade columns are compared as the TDD says, the check runs in the dry run too'
        tdd_excerpts:
          - 'FLOW-1 steps 1 to 6, DEC-4, DEC-7, DEC-8, CTR-2 (all the sentences), CTR-4 (the cases F20 to F27), IMP-4, ASM-5, ASM-6, ASM-8'
      likely_files:
        - 'src/main/java/io/morin/archicode/workspace/PlateauFoldService.java'
        - 'src/main/java/io/morin/archicode/workspace/FoldReport.java'
        - 'src/main/java/io/morin/archicode/workspace/WorkspaceFactory.java'
        - 'src/main/java/io/morin/archicode/viewpoint/kernel/PlateauComparer.java'
        - 'src/main/java/io/morin/archicode/Warnings.java'
        - 'src/test/java/io/morin/archicode/workspace/PlateauFoldServiceTest.java'
        - 'src/test/javascript/viewpoint-kernel/fold-cases.json'
      acceptance_criteria:
        - 'The cases other than the write case F07 pass through the service; a dry run changes nothing and prints nothing on the error stream'
        - 'The Brightcart fold of inhouse into marketplace passes its own check'
      verification:
        - 'JAVA_HOME=$HOME/.sdkman/candidates/java/25.0.4-tem ./mvnw -q test -Dtest=PlateauFoldServiceTest+FoldTest+FoldRewriteTest+FoldCheckTest exits 0, except the write case F07 which task-007 turns green'
        - 'node -e "JSON.parse(require(''fs'').readFileSync(''src/test/javascript/viewpoint-kernel/fold-cases.json'',''utf8''))" exits 0'
        - 'npx prettier --check src/test/javascript/viewpoint-kernel/fold-cases.json exits 0'
        - 'JAVA_HOME=$HOME/.sdkman/candidates/java/25.0.4-tem ./mvnw -q test-compile pmd:check exits 0'
        - 'grep -c "picocli" src/main/java/io/morin/archicode/workspace/PlateauFoldService.java prints 0'
      escalation_triggers:
        - 'The check refuses the Brightcart fold'
        - 'F24 does not refuse'
      suggested_subagent_type: '(inline)'
      suggested_model: '(default)'
      suggested_effort: '(inline)'
    - task_id: task-007
      agent_role: 'Backend Implementation Agent'
      objective: 'Add the write to the service, the written report, the Brightcart write case, and the proof that a failed write changes nothing'
      context:
        prd_excerpts:
          - 'REQ-2 and REQ-3: the folded plateaus read the same, and a failed write leaves the folder unchanged'
        tdd_excerpts:
          - 'DEC-5, DEC-6, DEC-8 (the changed marker), CTR-2 (the written report, sentences 10 and 11), FLOW-1 step 7'
      likely_files:
        - 'src/main/java/io/morin/archicode/workspace/PlateauFoldService.java'
        - 'src/main/java/io/morin/archicode/workspace/FoldReport.java'
        - 'src/test/java/io/morin/archicode/workspace/PlateauFoldServiceTest.java'
        - 'src/test/javascript/viewpoint-kernel/fold-cases.json'
      acceptance_criteria:
        - 'F07 passes through the service; a failing double at the first move and at the delete leaves the Brightcart copy byte for byte as it was'
        - 'A second fold of the folded copy gives the sentence of F01'
      verification:
        - 'JAVA_HOME=$HOME/.sdkman/candidates/java/25.0.4-tem ./mvnw -q test -Dtest=PlateauFoldServiceTest+FoldTest+FoldFilesTest exits 0'
        - 'npx prettier --check src/test/javascript/viewpoint-kernel/fold-cases.json exits 0'
        - 'JAVA_HOME=$HOME/.sdkman/candidates/java/25.0.4-tem ./mvnw -q test-compile pmd:check exits 0'
      escalation_triggers:
        - 'A failing double leaves a file different from before'
      suggested_subagent_type: '(inline)'
      suggested_model: '(default)'
      suggested_effort: '(inline)'
    - task_id: task-008
      agent_role: 'Backend Implementation Agent'
      objective: 'Make the plain form fold, and prove it through the command line in the unit suite and on the packaged application'
      context:
        prd_excerpts:
          - 'REQ-1: the jar opens the folded workspace; REQ-7: the plain form writes; REQ-8: the refusal sentences are unchanged'
        tdd_excerpts:
          - 'CTR-3, DEC-6, IMP-6, IF-3, CON-6; the IT talks to the application by its command line only'
      likely_files:
        - 'src/main/java/io/morin/archicode/cli/FoldCommand.java'
        - 'src/test/java/io/morin/archicode/cli/CliHarness.java'
        - 'src/test/java/io/morin/archicode/cli/PlateauFoldCommandTest.java'
        - 'src/test/java/io/morin/archicode/it/PlateauFoldIT.java'
        - 'src/main/resources/META-INF/native-image/io.morin.archicode/archicode/reflect-config.json'
      acceptance_criteria:
        - 'Every case of the file passes through the command; every refusal leaves the folder unchanged, hidden files included'
        - 'The IT runs against the jar and folds a copy of the Brightcart'
      verification:
        - 'JAVA_HOME=$HOME/.sdkman/candidates/java/25.0.4-tem ./mvnw -q test -Dtest=PlateauFoldCommandTest+PlateauFoldServiceTest+FoldTest exits 0'
        - 'JAVA_HOME=$HOME/.sdkman/candidates/java/25.0.4-tem ./mvnw -q verify -DskipITs=false -Dit.test=PlateauFoldIT -Dtest=NoSuchTest -Dsurefire.failIfNoSpecifiedTests=false -Djacoco.skip=true exits 0 (no unit test runs there, so the JaCoCo floors are left to task-013)'
        - 'JAVA_HOME=$HOME/.sdkman/candidates/java/25.0.4-tem ./mvnw -q test-compile pmd:check exits 0'
        - 'grep -c "does not write yet" src/main/java/io/morin/archicode/cli/FoldCommand.java prints 0'
      escalation_triggers:
        - 'The IT fails on the jar only'
        - 'A refusal changes the folder'
      suggested_subagent_type: 'general-purpose'
      suggested_model: '(default)'
      suggested_effort: 'medium'
    - task_id: task-009
      agent_role: 'QA Agent'
      objective: 'Record the before and after of the Brightcart fold as a repeatable test and as a table in the run document'
      context:
        prd_excerpts:
          - 'REQ-2: plateau list, diff and views generate before and after are equal but for the PLATEAU and PATCH columns, and a second fold is refused'
        tdd_excerpts:
          - 'DEC-9 in full, ASM-5, RISK-4'
      likely_files:
        - 'src/test/java/io/morin/archicode/cli/CliHarness.java'
        - 'src/test/java/io/morin/archicode/cli/PlateauFoldBeforeAfterTest.java'
        - 'docs/wav/wav-028-fold-and-browser-menu/run/run-0208-plateau-fold-writer/run-0208-plateau-fold-writer.md'
        - 'docs/wav/wav-025-hosted-editor/run/run-0190-plateau-fold-analysis/run-0190-plateau-fold-analysis.md'
      acceptance_criteria:
        - 'The test passes and compares every ordered pair of the plateaus that remain'
        - 'The run document has a section Verification with the commands and the figures'
      verification:
        - 'JAVA_HOME=$HOME/.sdkman/candidates/java/25.0.4-tem ./mvnw -q test -Dtest=PlateauFoldBeforeAfterTest exits 0'
        - 'grep -n "^## Verification" docs/wav/wav-028-fold-and-browser-menu/run/run-0208-plateau-fold-writer/run-0208-plateau-fold-writer.md prints a line'
        - 'JAVA_HOME=$HOME/.sdkman/candidates/java/25.0.4-tem ./mvnw -q test-compile pmd:check exits 0'
      escalation_triggers:
        - 'A difference other than the two columns'
      suggested_subagent_type: 'general-purpose'
      suggested_model: '(default)'
      suggested_effort: 'medium'
    - task_id: task-010
      agent_role: 'Test Generation Agent'
      objective: 'Open the folded hand-made workspaces in the editor harness and check the plateaus'
      context:
        prd_excerpts:
          - 'REQ-1: the editor opens the folded workspace'
        tdd_excerpts:
          - 'DEC-10, RISK-6, CON-7; the precedent is init-workspace.test.js'
      likely_files:
        - 'src/test/javascript/viewpoint-kernel/init-workspace.test.js'
        - 'src/test/javascript/viewpoint-kernel/fold-workspace.test.js'
        - 'src/test/javascript/viewpoint-kernel/fold-cases.json'
        - 'src/test/javascript/viewpoint-kernel/mem-folder.js'
      acceptance_criteria:
        - 'The node test passes and reads the base folder, the case files and expect.files'
        - 'Lint and format pass on the new file'
      verification:
        - 'npm run editor:build exits 0 and git status --short src/main/resources/editor-webapp shows no change'
        - 'node --test src/test/javascript/viewpoint-kernel/fold-workspace.test.js exits 0'
        - 'npx eslint --max-warnings 0 src/test/javascript/viewpoint-kernel/fold-workspace.test.js exits 0'
        - 'npx prettier --check src/test/javascript/viewpoint-kernel/fold-workspace.test.js src/test/javascript/viewpoint-kernel/fold-cases.json exits 0'
      escalation_triggers:
        - 'The editor refuses a folded workspace the loader reads'
      suggested_subagent_type: 'general-purpose'
      suggested_model: '(default)'
      suggested_effort: 'medium'
    - task_id: task-011
      agent_role: 'Documentation Agent'
      objective: 'Update the guide sentence and regenerate the golden file'
      context:
        prd_excerpts:
          - 'REQ-4: the guide says what the command does'
        tdd_excerpts:
          - 'IMP-9: regenerate with archicode guide piped through sed 1s/.*/archicode guide @VERSION@/ in the same change; the budget is 30 KB (26,183 used)'
      likely_files:
        - 'src/main/resources/guide/guide.md'
        - 'src/test/resources/guide/golden.md'
      acceptance_criteria:
        - 'GuideTest and GuideCorpusTest pass with the regenerated golden file'
      verification:
        - 'JAVA_HOME=$HOME/.sdkman/candidates/java/25.0.4-tem ./mvnw -q test -Dtest=GuideTest+GuideCorpusTest exits 0'
        - 'wc -c src/test/resources/guide/golden.md prints fewer than 30000'
        - 'grep -c "does not write yet" src/main/resources/guide/guide.md src/test/resources/guide/golden.md prints 0 for both'
      escalation_triggers:
        - 'Over the budget'
      suggested_subagent_type: 'general-purpose'
      suggested_model: '(default)'
      suggested_effort: 'low'
    - task_id: task-012
      agent_role: 'Documentation Agent'
      objective: 'Write the manual page of the command, the limits and the release item, and the CLAUDE.md paragraph, from the sentences of the cases file'
      context:
        prd_excerpts:
          - 'REQ-4 and REQ-5: the manual, the guide and CLAUDE.md say what the command does, refuses and loses'
        tdd_excerpts:
          - 'IMP-9 (the four anchors and their content), CTR-2 (the sentences and the report), DEC-5 (the guarantee and its honest wording), DEC-7 (what the deleted manifest took)'
      likely_files:
        - 'src/doc/README.adoc'
        - 'CLAUDE.md'
        - 'src/test/javascript/viewpoint-kernel/fold-cases.json'
      acceptance_criteria:
        - 'The sentences quoted in the manual equal those of the cases file'
        - 'Neither document still says the plain form refuses'
      verification:
        - 'grep -n "\[\[plateau-fold\]\]" src/doc/README.adoc prints a line'
        - 'grep -c "does not write yet" src/doc/README.adoc CLAUDE.md prints 0 for both'
        - 'grep -n "FoldFiles" CLAUDE.md prints a line'
        - 'npm run format:check exits 0'
      escalation_triggers:
        - 'No open release block'
      suggested_subagent_type: 'general-purpose'
      suggested_model: '(default)'
      suggested_effort: 'medium'
    - task_id: task-013
      agent_role: 'QA Agent'
      objective: 'Run every gate and log each exit code'
      context:
        prd_excerpts:
          - 'REQ-1: the Java build, the node suite, lint, format and the editor check pass and no coverage floor is lowered'
        tdd_excerpts:
          - 'Observability and Verification commands; JAVA_HOME must name a JDK 25 (the shell Java is 21)'
      likely_files:
        - 'target/jacoco-report'
        - 'scripts/byte-identity.sh'
        - 'scripts/editor-coverage-floor.json'
      acceptance_criteria:
        - 'Every gate exits 0 or its failure is shown to pre-exist on the parent commit'
      verification:
        - 'JAVA_HOME=$HOME/.sdkman/candidates/java/25.0.4-tem ./mvnw verify exits 0 (unit tests, PMD and the JaCoCo floors)'
        - 'JAVA_HOME=$HOME/.sdkman/candidates/java/25.0.4-tem ./mvnw verify -DskipITs=false exits 0'
        - 'JAVA_HOME=$HOME/.sdkman/candidates/java/25.0.4-tem ./mvnw test-compile pmd:check exits 0'
        - 'JAVA_HOME=$HOME/.sdkman/candidates/java/25.0.4-tem scripts/byte-identity.sh exits 0 with no unexpected difference'
        - 'npm run test:unit exits 0'
        - 'npm run lint exits 0'
        - 'npm run format:check exits 0'
        - 'npm run editor:check exits 0'
      escalation_triggers:
        - 'A floor fails'
      suggested_subagent_type: 'general-purpose'
      suggested_model: '(default)'
      suggested_effort: 'low'
    - task_id: task-014
      agent_role: 'QA Agent'
      objective: 'Show that the tests catch four breakages of the writer, restore the sources, and close the log with the notice for the author'
      context:
        prd_excerpts:
          - 'REQ-2 and REQ-3'
        tdd_excerpts:
          - 'Observability and Verification (the sabotage record: composition left out, warnings skipped, delete before move, stale-read check removed), Open Questions (the three items for the author)'
      likely_files:
        - 'src/main/java/io/morin/archicode/workspace/FoldRewrite.java'
        - 'src/main/java/io/morin/archicode/workspace/FoldCheck.java'
        - 'src/main/java/io/morin/archicode/workspace/FoldFiles.java'
        - 'src/main/java/io/morin/archicode/workspace/PlateauFoldService.java'
        - 'docs/wav/wav-028-fold-and-browser-menu/run/run-0208-plateau-fold-writer/prg-0208-plateau-fold-writer.md'
      acceptance_criteria:
        - 'Each sabotaged tree fails the test named for it; the restored tree passes and its sha256 list equals the one taken before'
        - 'The Log holds the three items for the author'
      verification:
        - 'a sha256 list of every file under src/main/java and src/test/java, taken into the scratchpad before the sabotage (find ... -type f | sort | xargs sha256sum), is identical after the restore (git diff --stat is not enough: the files of this run are untracked, the run commits nothing)'
        - 'JAVA_HOME=$HOME/.sdkman/candidates/java/25.0.4-tem ./mvnw -q test -Dtest=FoldRewriteTest+FoldCheckTest+FoldFilesTest+PlateauFoldServiceTest+PlateauFoldCommandTest exits 0 after the restore'
        - 'git status --short lists only the files named in the outputs of tasks 001 to 012 and the run documents'
      escalation_triggers:
        - 'A sabotaged tree still passes'
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
        - 'static analysis'
        - 'file check'
      success_criteria:
        - 'Every shipped manifest round-trips equal in its own format and the Writer facts line is logged'
    - task_id: task-002
      methods:
        - 'unit tests'
        - 'file check'
      success_criteria:
        - 'FoldTest passes; the three new test classes fail with the stub exception and the pure classes have no forbidden import'
    - task_id: task-003
      methods:
        - 'unit tests'
        - 'static analysis'
      success_criteria:
        - 'FoldRewriteTest passes and PMD is clean'
    - task_id: task-004
      methods:
        - 'unit tests'
        - 'static analysis'
      success_criteria:
        - 'FoldCheckTest passes and PMD is clean'
    - task_id: task-005
      methods:
        - 'unit tests'
        - 'static analysis'
      success_criteria:
        - 'FoldFilesTest passes with a failing double at each operation and the folder unchanged after each'
    - task_id: task-006
      methods:
        - 'unit tests'
        - 'static analysis'
        - 'format check'
      success_criteria:
        - 'The cases other than the write case pass through the service, the dry run changes nothing and the error stream is empty'
    - task_id: task-007
      methods:
        - 'unit tests'
        - 'static analysis'
        - 'regression check'
      success_criteria:
        - 'F07 passes, a failed write leaves the Brightcart copy byte for byte as it was, a second fold is refused'
    - task_id: task-008
      methods:
        - 'unit tests'
        - 'integration test'
        - 'static analysis'
      success_criteria:
        - 'The command test and the IT pass and every refusal leaves the folder unchanged'
    - task_id: task-009
      methods:
        - 'regression check'
        - 'unit tests'
      success_criteria:
        - 'The Brightcart outputs are equal before and after but for the two cascade columns, and the figures are in the run document'
    - task_id: task-010
      methods:
        - 'unit tests'
        - 'linting'
        - 'format check'
      success_criteria:
        - 'The editor harness opens the folded workspace with no error and the plateaus expected'
    - task_id: task-011
      methods:
        - 'unit tests'
        - 'file check'
      success_criteria:
        - 'GuideTest passes and the golden file is under 30 KB'
    - task_id: task-012
      methods:
        - 'file check'
        - 'format check'
      success_criteria:
        - 'The anchors are present, nothing says the plain form refuses, and the format check passes; ManualExamplesTest runs in task-013'
    - task_id: task-013
      methods:
        - 'build'
        - 'integration test'
        - 'static analysis'
        - 'linting'
        - 'regression check'
      success_criteria:
        - 'Every gate exits 0, the JaCoCo floors are unchanged and the byte-identity harness reports no unexpected difference'
    - task_id: task-014
      methods:
        - 'regression check'
        - 'unit tests'
      success_criteria:
        - 'The four sabotaged trees fail the tests named for them, the restored tree passes, only the expected files changed'
```

## 11. Escalation Rules

```yaml
escalation_rules:
  rules:
    - condition: 'A new test is green on its stub or on the unsabotaged tree for the wrong reason'
      action: 'Strengthen the assertion until it fails for the reason it names before the next task starts'
    - condition: 'The check refuses the Brightcart fold of inhouse into marketplace, or the before and after record shows a difference beyond the PLATEAU and PATCH columns (ASM-5 refuted)'
      action: 'Read the first difference it names, fix FoldRewrite or the composition, log the finding and amend the TDD; never loosen the check or the test'
    - condition: 'F24 does not refuse (ASM-6 refuted)'
      action: 'Use the fallback case of ASM-6 (a folded patch whose json-path matches an element of the plateau above), log it and amend the TDD'
    - condition: 'A failing double or any refusal leaves the folder different from before'
      action: 'Stop the task: this is the one promise of the writer (REQ-3); find the write that happens too early'
    - condition: 'A refusal sentence of run 0207 (1 to 6) or of the new set (7 to 11) has to change after the cases file holds it'
      action: 'Change the cases file, the manual and the golden file in the same change and rerun task-013; sentences 1 to 6 change only with the author (REQ-8)'
    - condition: 'The change would need create, the kernel, the schema, a file the existing commands write, or anything under src/main/editor'
      action: 'Stop and treat it as a change of the design (CON-5, CON-7), not a plan step'
    - condition: 'A JaCoCo floor, a coverage floor or PMD fails'
      action: 'Add a test that asserts what the code returns, or fix the finding; never lower a floor and never add NOPMD'
    - condition: 'The packaged application cannot be built or run (no JDK 25), the tag archicode-0.19.0 is missing for the harness, or npm ci was not done'
      action: 'Log the gate as not run with the reason; the Native job (RISK-7, ASM-2) and the tag run prove the rest in CI'
    - condition: 'Autonomy override of complete-run'
      action: 'Tasks 005 to 007 are the ones the default policy would send to a human (deletion of manifests in the author workspace); they run under the override as review_after, their verifier is elevated, the override is logged in the prg, and the three items for the author are told at close-out. No task is human_required.'
```

## 12. Final Execution Manifest

```yaml
execution_manifest:
  status: 'done'
  recommendation: 'proceed_with_review'
  autonomy_level: 'medium'
  total_tasks: 14
  autonomous_tasks: 11
  review_before_tasks: 0
  review_after_tasks: 3
  human_required_tasks: 0
  blocked_tasks: 0
  critical_path_tasks:
    - task-001
    - task-002
    - task-003
    - task-004
    - task-005
    - task-006
    - task-007
    - task-008
    - task-009
    - task-011
    - task-013
    - task-014
  parallel_groups:
    - parallel-group-001
    - parallel-group-002
  required_human_gates:
    - gate-001
  highest_risk_tasks:
    - task-005
    - task-006
    - task-007
  lowest_confidence_tasks:
    - task-006
    - task-002
    - task-005
    - task-009
  next_action: 'Start task-001: add the writer mapper, Header.toBuilder, Facts.manifestFiles and Warnings.silently, and round-trip every manifest the repository ships'
  criteria:
    - 'The new pure classes and the files seam fail on their stubs and pass on their implementations'
    - 'The Brightcart fold writes files whose plateaus read the same, a refusal or a failed write leaves the folder identical byte for byte, and a second fold is refused'
    - 'The gates exit 0, the floors are unchanged and the existing commands write the same bytes'
    - 'The guide, the manual and CLAUDE.md say what the writer does, refuses and loses, and the author is told the three decisions'
```
