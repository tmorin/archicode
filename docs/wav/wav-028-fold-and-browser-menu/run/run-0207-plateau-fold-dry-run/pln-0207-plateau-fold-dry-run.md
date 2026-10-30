---
title: Execution Plan — Plateau fold dry-run
status: done
date: 2026-10-30
related:
  - docs/wav/wav-028-fold-and-browser-menu/run/run-0207-plateau-fold-dry-run/tdd-0207-plateau-fold-dry-run.md
  - docs/wav/wav-028-fold-and-browser-menu/wav-028-fold-and-browser-menu.md
  - 'gh:tmorin/archicode#65'
type: pln
run: 0207
wave: 028
---

# Execution Plan: Plateau fold dry-run

Profile TDD+pln: there is no PRD, so REQ-1 to REQ-6 are the IDs the TDD labels (section "PRD Traceability"), taken from the decisions D1 to D4 and the P2 gate of the wave manifest. The plan follows the TDD plus the findings F-1 to F-10 of the Stage 5 review (progress log, section Findings), which the TDD has not absorbed: task-001 amends the TDD with them before any code, and where the two differ the plan says which finding it applies. The run operates under the autonomy override of complete-run: a task that would otherwise stop for a human is executed by an agent and the override is logged; this plan has no such task. The plan commits nothing: the commit is a human step outside it.

## 1. Executive Summary

```yaml
summary:
  status: 'pending'
  product_goal: '`archicode plateau fold <id> --dry-run` prints what folding a plateau into the one above would do (files rewritten, file deleted, patches, replaces to compose) or one error line that says why it cannot be done, and writes nothing (#65, D1 to D4).'
  technical_approach: 'Amend the TDD with the review findings and check its assumptions on the code, write the records, a stub and the red tests (plain JUnit on the pure class, the cases file), implement Fold and FoldReport, add the service and the one read method, add the command and its tests including the byte-for-byte unchanged-folder proof and the IT, then the guide with its golden file, the manual and CLAUDE.md, the gates, and two sabotage checks.'
  total_tasks: 9
  parallel_groups: 1
  high_risk_tasks: 0
  human_review_gates: 0
  autonomy_level: 'high'
  recommendation: 'proceed'
  criteria:
    - 'FoldTest calls Fold.plan on hand-made data with no Picocli and no CDI and passes; it failed on the stub'
    - 'the cases of fold-cases.json pass through PlateauFoldService and through the command, seven refusal cases and the Brightcart plan'
    - 'a dry-run and each refusal leave a copy of the layered Brightcart identical byte for byte (hidden files included)'
    - './mvnw verify, ./mvnw test-compile pmd:check and ./mvnw verify -DskipITs=false exit 0 with the JaCoCo floors unchanged'
    - 'scripts/byte-identity.sh shows no unexpected difference and golden.md is regenerated, under the 30 KB budget'
    - 'the manual (plateau-fold, fold-by-hand, upgrade-0-21) and CLAUDE.md describe the command and what it does not do yet'
    - 'both sabotage checks fail the tests and the restored tree passes'
```

## 2. PRD/TDD Consistency Assessment

```yaml
consistency_assessment:
  aligned_items:
    - 'REQ-1 to REQ-6 each map to a design decision and a repository impact of the TDD'
    - 'The pure class is Fold with no Picocli and no CDI in its signature (CON-1, DEC-1); the P2 gate test calls it without a command line'
    - 'Every refusal is an ArchiCodeException printed by ErrorOutput as one error line, exit 1 (CON-3)'
    - 'Nothing in the existing commands moves (CON-5), proved by scripts/byte-identity.sh'
  gaps:
    - id: gap-001
      type: 'contradiction'
      description: 'F-1: the Composition record has three shapes (IMP-1, CTR-1, DEC-1) and the refusals are counted five, six and seven times (REQ-2, DEC-6, IMP-7, CTR-2).'
      impact: 'medium'
      recommendation: 'task-001 makes CTR-1 the owner of every record and says seven cases (root, leaf, several above, settings.current, steps, unknown id, missing --dry-run) in DEC-6; the loader line is not a case of the file.'
    - id: gap-002
      type: 'missing_technical_design'
      description: 'F-3: settings.current has no owner; WorkspaceFactory.read is private and parsed(Path) returns Parsed only.'
      impact: 'medium'
      recommendation: 'task-004 adds one public read method that returns a small record of Parsed and the current plateau; the service takes the tree from parsed.plateaus() and does not call plateauTree; the dry-run parses the manifests twice (facts, then the load of the plateau above), which task-001 states in Reliability.'
    - id: gap-003
      type: 'ambiguity'
      description: 'F-4: the cases of CTR-4 are whole workspace copies, so they need WorkspaceFactory and cannot run in a plain JUnit test of the pure class.'
      impact: 'medium'
      recommendation: 'task-002 splits the tests: FoldTest is plain JUnit on Fold.plan with hand-made data; the cases run through PlateauFoldService in a QuarkusTest and through the command in PlateauFoldCommandTest.'
    - id: gap-004
      type: 'ambiguity'
      description: 'F-5 and ASM-2: ElementIndex does not expose replaces; PlateauTree.children(id) exists and is sorted.'
      impact: 'low'
      recommendation: 'task-001 uses children(id) and reads the replaces as step.application().searchElement(ref).getReplaces() (and the technology index); the one thing to check is which step holds the value after the folded plateau patches.'
    - id: gap-005
      type: 'missing_requirement'
      description: 'F-6 and F-7: upgrade-0-21 gets no item; the report line for a replaces change has a placeholder path; patch n is undefined.'
      impact: 'low'
      recommendation: 'task-001 and task-008 fix them: the item New: plateau fold --dry-run, the concrete line discovery.search (marketplace/application/discovery.yaml), n is the 1-based place in the patches of the plateau above as written.'
    - id: gap-006
      type: 'ambiguity'
      description: 'F-8, F-9, F-10: the departure from D3 is stated six times; Q-2 and RISK-4 belong to the writer (W-4); five records and a Supplier need one stated reason.'
      impact: 'low'
      recommendation: 'task-001 keeps DEC-2 and the closing note, reduces RISK-3 and DEF-4 to one line pointing to DEC-2, removes RISK-4 (DEF-5 holds it), and states the reason for the Supplier once: a leaf or a root says its own sentence, not the loader error on a plateau that cannot load.'
  blocking_gaps: []
```

## 3. Execution Graph

```yaml
execution_graph:
  nodes:
    - id: task-001
      status: 'done'
      title: 'Amend the TDD with the review findings and check ASM-1 to ASM-3 on the code'
      depends_on: []
      produces:
        - 'tdd-0207-plateau-fold-dry-run.md'
        - 'a Log line in prg-0207 with the result of the checks'
      agent_role: 'QA Agent'
      autonomy: 'autonomous'
      risk: 'low'
      confidence: 80
    - id: task-002
      status: 'done'
      title: 'Write the records, a stub, FoldTest and the cases file, see them red'
      depends_on: [task-001]
      produces:
        - 'src/main/java/io/morin/archicode/workspace/Fold.java (records and a stub)'
        - 'src/test/java/io/morin/archicode/workspace/FoldTest.java'
        - 'src/test/javascript/viewpoint-kernel/fold-cases.json'
      agent_role: 'Test Generation Agent'
      autonomy: 'autonomous'
      risk: 'medium'
      confidence: 75
    - id: task-003
      status: 'done'
      title: 'Implement Fold.plan and FoldReport.render'
      depends_on: [task-002]
      produces:
        - 'src/main/java/io/morin/archicode/workspace/Fold.java'
        - 'src/main/java/io/morin/archicode/workspace/FoldReport.java'
      agent_role: 'Backend Implementation Agent'
      autonomy: 'autonomous'
      risk: 'medium'
      confidence: 75
    - id: task-004
      status: 'done'
      title: 'Add the read method of WorkspaceFactory and PlateauFoldService, with the cases through the service'
      depends_on: [task-003]
      produces:
        - 'src/main/java/io/morin/archicode/workspace/WorkspaceFactory.java'
        - 'src/main/java/io/morin/archicode/workspace/PlateauFoldService.java'
        - 'src/test/java/io/morin/archicode/workspace/PlateauFoldServiceTest.java'
      agent_role: 'Backend Implementation Agent'
      autonomy: 'autonomous'
      risk: 'medium'
      confidence: 70
    - id: task-005
      status: 'done'
      title: 'Add the command, reflect-config, the command test, the unchanged-folder proof and the IT'
      depends_on: [task-004]
      produces:
        - 'src/main/java/io/morin/archicode/cli/FoldCommand.java'
        - 'src/main/java/io/morin/archicode/cli/PlateauGroup.java'
        - 'src/main/resources/META-INF/native-image/io.morin.archicode/archicode/reflect-config.json'
        - 'src/test/java/io/morin/archicode/cli/PlateauFoldCommandTest.java'
        - 'src/test/java/io/morin/archicode/it/PlateauFoldIT.java'
      agent_role: 'Backend Implementation Agent'
      autonomy: 'autonomous'
      risk: 'medium'
      confidence: 75
    - id: task-006
      status: 'done'
      title: 'Say the command in the guide and regenerate the golden file'
      depends_on: [task-005]
      produces:
        - 'src/main/resources/guide/guide.md'
        - 'src/test/resources/guide/golden.md'
      agent_role: 'Documentation Agent'
      autonomy: 'autonomous'
      risk: 'low'
      confidence: 80
    - id: task-007
      status: 'done'
      title: 'Describe the command in the manual, upgrade-0-21 and CLAUDE.md'
      depends_on: [task-005]
      produces:
        - 'src/doc/README.adoc'
        - 'CLAUDE.md'
      agent_role: 'Documentation Agent'
      autonomy: 'autonomous'
      risk: 'low'
      confidence: 85
    - id: task-008
      status: 'done'
      title: 'Run the gates'
      depends_on: [task-006, task-007]
      produces:
        - 'a Log line in prg-0207 with the exit code of each gate'
      agent_role: 'QA Agent'
      autonomy: 'autonomous'
      risk: 'low'
      confidence: 80
    - id: task-009
      status: 'done'
      title: 'Sabotage checks and close the implementation'
      depends_on: [task-008]
      produces:
        - 'a Log line in prg-0207 with the sabotage verdicts and the list of files changed'
      agent_role: 'QA Agent'
      autonomy: 'autonomous'
      risk: 'low'
      confidence: 80
  edges:
    - from: task-001
      to: task-002
      reason: 'the tests are written against the amended contract (records, seven cases, concrete report lines)'
    - from: task-002
      to: task-003
      reason: 'red before green: the tests must fail on the stub'
    - from: task-003
      to: task-004
      reason: 'the service calls Fold.plan'
    - from: task-004
      to: task-005
      reason: 'the command calls the service'
    - from: task-005
      to: task-006
      reason: 'the guide command list is generated from the command'
    - from: task-005
      to: task-007
      reason: 'the manual quotes the report and the sentences the command prints'
    - from: task-006
      to: task-008
      reason: 'the gates run on the final tree and GuideTest needs the golden file'
    - from: task-007
      to: task-008
      reason: 'the gates run on the final tree'
    - from: task-008
      to: task-009
      reason: 'the sabotage edits sources and restores them, so it runs after the gates, never beside them'
```

## 4. Task Catalog

```yaml
task_catalog:
  tasks:
    - id: task-001
      title: 'Amend the TDD with the review findings and check ASM-1 to ASM-3 on the code'
      source_requirements:
        prd:
          - 'REQ-2'
          - 'REQ-3'
          - 'REQ-4'
        tdd:
          - 'ASM-1'
          - 'ASM-2'
          - 'ASM-3'
          - 'RISK-1'
          - 'Stage 5 review F-1 to F-10 (progress log, Findings)'
      outputs:
        - 'tdd-0207: CTR-1 owns every record and IMP-1 and DEC-1 point to it; DEC-6 says seven cases; IMP-3 says the read method returns the parsed manifests and settings.current and the service uses parsed.plateaus(); IMP-4 splits FoldTest (plain JUnit) from the cases (QuarkusTest through the service, and through the command); ASM-1 uses children(id); ASM-2 reads replaces through the element of the index; CTR-2 has the concrete line discovery.search (marketplace/application/discovery.yaml) and defines n; IMP-7 adds the upgrade-0-21 item; RISK-3 and DEF-4 are one line each, RISK-4 is removed; the Supplier reason is stated once; Reliability says the manifests are parsed twice'
        - 'One Log line in prg-0207 beginning Fold facts: the replaces of commerce.search read from the step of inhouse, the number of patches of inhouse (26) and marketplace (23), the 11 header files, and whether the replaces are read from the step of the folded plateau or of the plateau above'
      verification:
        - 'grep -c "Fold facts" docs/wav/wav-028-fold-and-browser-menu/run/run-0207-plateau-fold-dry-run/prg-0207-plateau-fold-dry-run.md prints 1 or more'
        - 'grep -c "RISK-4" docs/wav/wav-028-fold-and-browser-menu/run/run-0207-plateau-fold-dry-run/tdd-0207-plateau-fold-dry-run.md prints 0'
        - 'grep -n "upgrade-0-21" docs/wav/wav-028-fold-and-browser-menu/run/run-0207-plateau-fold-dry-run/tdd-0207-plateau-fold-dry-run.md prints a line in IMP-7'
        - 'git status --short src/ shows no change'
      risk: 'low'
      confidence: 80
      human_review: 'none'
      escalation_triggers:
        - 'ASM-2 or ASM-3 is refuted: no step holds the replaces after the patches of the folded plateau'
        - 'A fact of the Brightcart differs from the TDD (patch counts, header files, the replaces entry)'
      delegation_tier: 'standard'
      results: "tier standard, model sonnet, effort medium, profile low-cost, passed first time, inline (leaf), independently verified"
    - id: task-002
      title: 'Write the records, a stub, FoldTest and the cases file, see them red'
      source_requirements:
        prd:
          - 'REQ-2'
          - 'REQ-3'
        tdd:
          - 'DEC-1'
          - 'DEC-6'
          - 'CTR-1'
          - 'CTR-2'
          - 'CTR-4'
          - 'IMP-1'
          - 'IMP-4'
          - 'CON-1'
          - 'Stage 5 review F-1, F-2, F-4, F-7 (progress log, Findings)'
      outputs:
        - 'Fold.java: the records of CTR-1 (Plan, ReplacesChange, StepNaming, Composition and its entry) and plan(...) that throws UnsupportedOperationException; no import of picocli or jakarta.inject'
        - 'FoldTest.java (plain JUnit, no Quarkus): one test per refusal on hand-made data (root, leaf, several above, settings.current, steps, unknown id), the plan on hand-made data of the shape of inhouse into marketplace (rewritten, deleted, patch counts, one replaces change), an entry that names an element of the plateau below is not listed, a folded plateau with no manifest has nothing to delete, a patch that sets replaces is listed as patch n, a fold into a plateau whose parent is the root, and that the Supplier is not called when a refusal applies'
        - 'fold-cases.json: cases F01 and on in the shape of CTR-4 (id, what, base, files, args, expect), the seven refusals with the sentences of CTR-2 and the Brightcart inhouse report as the expected output lines; the first lines of the file say only Java reads it'
      verification:
        - './mvnw -q test -Dtest=FoldTest exits non-zero and the failures are UnsupportedOperationException from the stub, not a compile error'
        - 'grep -c "picocli\|jakarta.inject" src/main/java/io/morin/archicode/workspace/Fold.java prints 0'
        - 'npx prettier --check src/test/javascript/viewpoint-kernel/fold-cases.json exits 0'
        - 'node -e "JSON.parse(require(\"fs\").readFileSync(\"src/test/javascript/viewpoint-kernel/fold-cases.json\",\"utf8\"))" exits 0'
      risk: 'medium'
      confidence: 75
      human_review: 'none'
      escalation_triggers:
        - 'FoldTest is green on the stub: it proves nothing, strengthen it'
        - 'A test needs Quarkus to call Fold.plan: the pure class has a hidden dependency'
      delegation_tier: 'standard'
      results: "tier standard, model sonnet, effort medium, profile low-cost, passed first time, inline (leaf), independently verified"
    - id: task-003
      title: 'Implement Fold.plan and FoldReport.render'
      source_requirements:
        prd:
          - 'REQ-2'
          - 'REQ-3'
          - 'REQ-4'
        tdd:
          - 'DEC-1'
          - 'DEC-2'
          - 'DEC-3'
          - 'DEC-4'
          - 'DEC-6'
          - 'CTR-1'
          - 'CTR-2'
          - 'CON-1'
          - 'CON-2'
          - 'CON-3'
          - 'Stage 5 review F-2, F-7, F-10 (progress log, Findings)'
      outputs:
        - 'Fold.plan: the refusals in the order of DEC-6 (the Supplier is called only when all pass), then the Plan: rewritten (headers of the folded node, manifest of the plateau above, files of the elements that hold an entry to compose, sorted, distinct), deleted, patch counts, replaces changes, the plateaus that stay'
        - 'FoldReport.render(Plan): the report of CTR-2 in a fixed order, sorted, relative paths, no clock, same bytes for the same plan'
      verification:
        - './mvnw -q test -Dtest=FoldTest exits 0'
        - './mvnw -q test-compile pmd:check exits 0'
        - 'grep -c "picocli\|jakarta.inject" src/main/java/io/morin/archicode/workspace/Fold.java src/main/java/io/morin/archicode/workspace/FoldReport.java prints 0 for both'
      risk: 'medium'
      confidence: 75
      human_review: 'none'
      escalation_triggers:
        - 'A refusal sentence has to change: the cases file, the manual and the golden change in the same commit (RISK-5)'
        - 'PMD reports a finding that needs a rule turned off'
      delegation_tier: 'standard'
      results: "tier standard, model sonnet, effort medium, profile low-cost, passed first time, inline (leaf), independently verified"
    - id: task-004
      title: 'Add the read method of WorkspaceFactory and PlateauFoldService, with the cases through the service'
      source_requirements:
        prd:
          - 'REQ-1'
          - 'REQ-2'
          - 'REQ-4'
        tdd:
          - 'DEC-4'
          - 'IMP-1'
          - 'IMP-3'
          - 'IMP-4'
          - 'FLOW-1'
          - 'ASM-2'
          - 'ASM-3'
          - 'Stage 5 review F-3, F-4, F-5 (progress log, Findings)'
      outputs:
        - 'WorkspaceFactory: one public additive method that returns the parsed manifests and settings.current, with the same requireReadablePaths and requireNoPlateaus checks as plateauTree; create is untouched'
        - 'PlateauFoldService.plan(Path, String): builds the StepNaming list from the placed stories, the Composition from one load of the plateau above (declared references of the folded plateau from the candidates, their replaces after its patches, the entries of the plateau above from its candidates and from its patches that set replaces) and calls Fold.plan'
        - 'PlateauFoldServiceTest (QuarkusTest): every case of fold-cases.json through the service on a temp copy of the case base; the Brightcart plan has 26 and 23 patches, the 11 header files, the manifest to delete and the one replaces change commerce.search -> shop.app.search'
      verification:
        - './mvnw -q test -Dtest=PlateauFoldServiceTest+FoldTest exits 0'
        - './mvnw -q test -Dtest=GuideTest+ArchiCodeTest exits 0 or fails only on the missing golden line, which task-006 regenerates'
        - './mvnw -q test-compile pmd:check exits 0'
      risk: 'medium'
      confidence: 70
      human_review: 'none'
      escalation_triggers:
        - 'No step holds the replaces after the folded patches (RISK-1): decide inline between the step of the folded plateau and the element of the plateau above, log it'
        - 'A change to create would be needed: stop, it is outside the design (CON-5)'
      delegation_tier: 'standard'
      results: "tier standard, model sonnet, effort medium, profile low-cost, passed first time, inline (leaf), independently verified"
    - id: task-005
      title: 'Add the command, reflect-config, the command test, the unchanged-folder proof and the IT'
      source_requirements:
        prd:
          - 'REQ-1'
          - 'REQ-2'
          - 'REQ-5'
        tdd:
          - 'DEC-5'
          - 'DEC-7'
          - 'CTR-3'
          - 'IMP-2'
          - 'IMP-4'
          - 'IMP-6'
          - 'IF-3'
          - 'CON-4'
          - 'CON-6'
      outputs:
        - 'FoldCommand: plateau fold <id> --dry-run, prints with System.out like ListPlateausCommand, no logic beyond the --dry-run rule and printing; without --dry-run the one error line of DEC-7; PlateauGroup registers it'
        - 'reflect-config.json: the entry for io.morin.archicode.cli.FoldCommand copied from ListPlateausCommand'
        - 'PlateauFoldCommandTest: the cases of fold-cases.json through CliHarness (exit and stream); a snapshot of every file (path and bytes, hidden ones too) of a copy of the layered Brightcart before and after a successful dry-run and after each refusal, equal; the report twice gives the same bytes; nothing on the standard output on an error'
        - 'PlateauFoldIT: on the packaged application on a copy, the dry-run exits 0, prints the first line and leaves the folder unchanged, and one refusal exits 1 with one error line'
      verification:
        - './mvnw -q test -Dtest=PlateauFoldCommandTest+PlateauFoldServiceTest+FoldTest exits 0'
        - 'grep -n "FoldCommand" src/main/resources/META-INF/native-image/io.morin.archicode/archicode/reflect-config.json prints a line'
        - './mvnw -q verify -DskipITs=false -Dit.test=PlateauFoldIT -Dtest=NoSuchTest -Dsurefire.failIfNoSpecifiedTests=false -Djacoco.skip=true exits 0, with JAVA_HOME set to a JDK 25 (no unit test runs there, so the JaCoCo floors are left to task-008)'
        - './mvnw -q test-compile pmd:check exits 0'
      risk: 'medium'
      confidence: 75
      human_review: 'none'
      escalation_triggers:
        - 'The unchanged-folder test fails: something writes, stop and find it'
        - 'The jar cannot be built (no JDK 25)'
      delegation_tier: 'standard'
      results: "tier standard, model sonnet, effort medium, profile low-cost, passed first time, inline (leaf), independently verified"
    - id: task-006
      title: 'Say the command in the guide and regenerate the golden file'
      source_requirements:
        prd:
          - 'REQ-5'
        tdd:
          - 'IMP-5'
          - 'CON-5'
      outputs:
        - 'guide.md: one sentence in the plateaus convention saying what plateau fold --dry-run reads and that it writes nothing'
        - 'golden.md regenerated with archicode guide piped through the sed of CLAUDE.md, in the same change'
      verification:
        - './mvnw -q test -Dtest=GuideTest exits 0'
        - 'wc -c src/test/resources/guide/golden.md prints fewer than 30000'
        - 'grep -n "plateau fold" src/test/resources/guide/golden.md prints a line'
      risk: 'low'
      confidence: 80
      human_review: 'none'
      escalation_triggers:
        - 'The golden file would exceed the 30 KB budget of GuideTest'
      delegation_tier: 'standard'
      results: "tier standard, model sonnet, effort medium, profile low-cost, passed first time, inline (leaf), independently verified"
    - id: task-007
      title: 'Describe the command in the manual, upgrade-0-21 and CLAUDE.md'
      source_requirements:
        prd:
          - 'REQ-4'
          - 'REQ-5'
        tdd:
          - 'IMP-7'
          - 'CTR-2'
          - 'DEF-1'
          - 'DEF-2'
          - 'DEF-3'
          - 'Stage 5 review F-6, F-7 (progress log, Findings)'
      outputs:
        - 'README.adoc: a section [[plateau-fold]] with what --dry-run prints, the seven sentences, that nothing is written and that the writer comes later; one sentence in [[fold-by-hand]] that points to it; one item in the open [[upgrade-0-21]] block; [[plateau-limits]] is left as it is (W-4, P3 gate)'
        - 'CLAUDE.md: the command, the classes (Fold, FoldReport, PlateauFoldService, FoldCommand) and fold-cases.json in the layered plateaus paragraph, and what it does not do yet'
      verification:
        - 'grep -n "\[\[plateau-fold\]\]" src/doc/README.adoc prints a line'
        - 'grep -n "plateau fold" CLAUDE.md prints a line'
        - 'npm run format:check exits 0'
      risk: 'low'
      confidence: 85
      human_review: 'none'
      escalation_triggers:
        - 'The manual has no open release block for the next version'
      delegation_tier: 'cheap'
      results: "tier cheap, model haiku, effort high, profile low-cost, passed after escalation to effort medium, inline (leaf), independently verified"
    - id: task-008
      title: 'Run the gates'
      source_requirements:
        prd:
          - 'REQ-5'
        tdd:
          - 'Observability and Verification'
          - 'CON-2'
          - 'CON-5'
      outputs:
        - 'One Log line with the exit code of each gate'
      verification:
        - 'JAVA_HOME set to a JDK 25, then ./mvnw verify exits 0 (unit tests, PMD and the JaCoCo floors)'
        - './mvnw verify -DskipITs=false exits 0'
        - './mvnw test-compile pmd:check exits 0'
        - 'scripts/byte-identity.sh exits 0 with no unexpected difference'
        - 'npm run format:check exits 0'
      risk: 'low'
      confidence: 80
      human_review: 'none'
      escalation_triggers:
        - 'A JaCoCo floor fails: add a test that asserts what the code returns, never lower a floor'
        - 'byte-identity shows a difference in an existing command'
        - 'No JDK 25 or no tag archicode-0.19.0 for the harness'
      delegation_tier: 'standard'
      results: "tier standard, model sonnet, effort medium, profile low-cost, passed first time, inline (leaf), independently verified"
    - id: task-009
      title: 'Sabotage checks and close the implementation'
      source_requirements:
        prd:
          - 'REQ-1'
          - 'REQ-2'
        tdd:
          - 'Observability and Verification (sabotage record)'
          - 'DEC-4'
      outputs:
        - 'One Log line: with the command made to write one byte (a touch of a manifest) the unchanged-folder test fails; with the composition dropped the case of the replaces change fails; both restored and the tests pass again; and the list of files changed'
      verification:
        - 'a sha256 list of every file under src/main/java and src/test/java, taken into the scratchpad before the sabotage (find ... -type f | sort | xargs sha256sum), is identical after the restore (git diff --stat is not enough: the files of this run are untracked, the run commits nothing)'
        - './mvnw -q test -Dtest=FoldTest+PlateauFoldServiceTest+PlateauFoldCommandTest exits 0 after the restore'
        - 'git status --short lists only the files named in the outputs of tasks 001 to 007 and the run documents'
      risk: 'low'
      confidence: 80
      human_review: 'none'
      escalation_triggers:
        - 'A sabotaged tree still passes: the test proves nothing, strengthen it and run task-008 again'
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
        - task-006
        - task-007
      reason: 'The guide and its golden file, and the manual with CLAUDE.md, are different files and both only need the finished command.'
      conflict_risks:
        - 'task-006 runs Maven and the packaged application to regenerate the golden file while task-007 edits README.adoc and CLAUDE.md; task-007 runs no Maven command (ManualExamplesTest is part of the ./mvnw verify of task-008), so two builds never share target/'
        - 'Neither task edits Java; the gates of task-008 run after both'
```

Tasks 001 to 005 are a straight line (each reads what the one before wrote), and tasks 008 and 009 edit and run the whole tree, so they run alone.

## 6. Human Review Gates

```yaml
human_review_gates:
  gates: []
```

No gate: the command only reads, the change is additive and reversible by a revert, and no task deletes data. Under the autonomy override of complete-run no `human_required` task exists in this plan, so nothing was executed without a stop that would otherwise have stopped. DEC-2 departs from the sentence of D3; the author is told at the close-out of the run, not asked (Stage 6 of the TDD).

## 7. Risk Assessment

```yaml
risk_assessment:
  by_task:
    - id: task-001
      risk: 'low'
      rationale: 'Document edit and read-only checks'
    - id: task-002
      risk: 'medium'
      rationale: 'A test green on the stub proves nothing; the cases file is a contract for four later tasks'
    - id: task-003
      risk: 'medium'
      rationale: 'The refusal order and the composition rules are the logic; a wrong sentence moves the cases, the manual and the golden'
    - id: task-004
      risk: 'medium'
      rationale: 'RISK-1 (which step holds the replaces) and a new public read method on the shared factory'
    - id: task-005
      risk: 'medium'
      rationale: 'Native registration is proved only by CI; the unchanged-folder test is the guard of the one promise of the command'
    - id: task-006
      risk: 'low'
      rationale: 'Generated command list; the size budget is checked'
    - id: task-007
      risk: 'low'
      rationale: 'Prose with located anchors'
    - id: task-008
      risk: 'low'
      rationale: 'Commands only'
    - id: task-009
      risk: 'low'
      rationale: 'Temporary edits restored and compared by a sha256 list of the sources'
  by_area:
    - area: 'java'
      risk: 'medium'
      rationale: 'RISK-1 and RISK-5 of the TDD; PMD and the 0.90 floors apply to the new code'
    - area: 'docs'
      risk: 'low'
      rationale: 'The sentences are copied from the cases file'
```

## 8. Confidence Assessment

```yaml
confidence_assessment:
  by_task:
    - id: task-001
      score: 80
      rationale: 'Reading and a bounded document edit'
    - id: task-002
      score: 75
      rationale: 'Many cases in one file; the harness and the fixture exist'
    - id: task-003
      score: 75
      rationale: 'Plain logic with the sentences fixed in the cases file'
    - id: task-004
      score: 70
      rationale: 'Depends on where the replaces can be read after the folded patches'
    - id: task-005
      score: 75
      rationale: 'The pattern is ListPlateausCommand and CliHarness; the IT builds a jar'
    - id: task-006
      score: 80
      rationale: 'A regeneration recipe is in CLAUDE.md'
    - id: task-007
      score: 85
      rationale: 'Prose with located anchors'
    - id: task-008
      score: 80
      rationale: 'Known commands; needs a JDK 25 and the 0.19.0 tag'
    - id: task-009
      score: 80
      rationale: 'Needs care to restore the files exactly'
```

## 9. Agent Assignment Plan

```yaml
agent_assignment_plan:
  assignments:
    - task_id: task-001
      agent_role: 'QA Agent'
      objective: 'Fold the review findings into the TDD and check on the code and the fixture the facts the design rests on'
      context:
        prd_excerpts:
          - 'REQ-2, REQ-3 and REQ-4'
        tdd_excerpts:
          - 'ASM-1 to ASM-3 and RISK-1; the findings F-1 to F-10 in the progress log say what to change'
      likely_files:
        - 'docs/wav/wav-028-fold-and-browser-menu/run/run-0207-plateau-fold-dry-run/tdd-0207-plateau-fold-dry-run.md'
        - 'docs/wav/wav-028-fold-and-browser-menu/run/run-0207-plateau-fold-dry-run/prg-0207-plateau-fold-dry-run.md'
        - 'src/main/java/io/morin/archicode/resource/plateau/PlateauTree.java'
        - 'src/test/resources/brightcart/layered'
      acceptance_criteria:
        - 'Every finding is applied or answered in one line in the Log'
        - 'The Fold facts line gives the figures named in the task outputs'
      verification:
        - 'grep -c "Fold facts" docs/wav/wav-028-fold-and-browser-menu/run/run-0207-plateau-fold-dry-run/prg-0207-plateau-fold-dry-run.md prints 1 or more'
        - 'grep -c "RISK-4" docs/wav/wav-028-fold-and-browser-menu/run/run-0207-plateau-fold-dry-run/tdd-0207-plateau-fold-dry-run.md prints 0'
        - 'grep -n "upgrade-0-21" docs/wav/wav-028-fold-and-browser-menu/run/run-0207-plateau-fold-dry-run/tdd-0207-plateau-fold-dry-run.md prints a line in IMP-7'
        - 'git status --short src/ shows no change'
      escalation_triggers:
        - 'ASM-2 or ASM-3 refuted'
      suggested_subagent_type: 'general-purpose'
      suggested_model: '(default)'
      suggested_effort: 'medium'
    - task_id: task-002
      agent_role: 'Test Generation Agent'
      objective: 'Write the records, a stub and the tests so that they fail on the stub for the right reason'
      context:
        prd_excerpts:
          - 'REQ-2: the refusals are cases of one file; REQ-3: a test calls the class without a command line'
        tdd_excerpts:
          - 'CTR-1 (records), CTR-2 (sentences), CTR-4 (cases shape), DEC-6 (seven cases), IMP-4 split by F-4'
      likely_files:
        - 'src/main/java/io/morin/archicode/workspace/Fold.java'
        - 'src/test/java/io/morin/archicode/workspace/FoldTest.java'
        - 'src/test/javascript/viewpoint-kernel/fold-cases.json'
        - 'src/test/javascript/viewpoint-kernel/discovery-cases.json'
      acceptance_criteria:
        - 'FoldTest fails with the stub exception, not a compile error'
        - 'Fold.java imports neither picocli nor jakarta.inject'
      verification:
        - './mvnw -q test -Dtest=FoldTest exits non-zero and the failures are UnsupportedOperationException from the stub, not a compile error'
        - 'grep -c "picocli\|jakarta.inject" src/main/java/io/morin/archicode/workspace/Fold.java prints 0'
        - 'npx prettier --check src/test/javascript/viewpoint-kernel/fold-cases.json exits 0'
        - 'node -e "JSON.parse(require(\"fs\").readFileSync(\"src/test/javascript/viewpoint-kernel/fold-cases.json\",\"utf8\"))" exits 0'
      escalation_triggers:
        - 'Green on the stub'
      suggested_subagent_type: 'general-purpose'
      suggested_model: '(default)'
      suggested_effort: 'medium'
    - task_id: task-003
      agent_role: 'Backend Implementation Agent'
      objective: 'Make FoldTest pass with the refusal order and the plan of the TDD'
      context:
        prd_excerpts:
          - 'REQ-2, REQ-3, REQ-4'
        tdd_excerpts:
          - 'DEC-1 to DEC-4, DEC-6, CTR-1 and CTR-2; the Supplier is called only when every refusal passes'
      likely_files:
        - 'src/main/java/io/morin/archicode/workspace/Fold.java'
        - 'src/main/java/io/morin/archicode/workspace/FoldReport.java'
        - 'src/main/java/io/morin/archicode/resource/plateau/PlateauTree.java'
      acceptance_criteria:
        - 'FoldTest passes; PMD is clean with no NOPMD'
      verification:
        - './mvnw -q test -Dtest=FoldTest exits 0'
        - './mvnw -q test-compile pmd:check exits 0'
        - 'grep -c "picocli\|jakarta.inject" src/main/java/io/morin/archicode/workspace/Fold.java src/main/java/io/morin/archicode/workspace/FoldReport.java prints 0 for both'
      escalation_triggers:
        - 'A sentence has to change'
      suggested_subagent_type: 'general-purpose'
      suggested_model: '(default)'
      suggested_effort: 'medium'
    - task_id: task-004
      agent_role: 'Backend Implementation Agent'
      objective: 'Build the facts of a workspace and hand them to Fold, and run the cases through the service'
      context:
        prd_excerpts:
          - 'REQ-1, REQ-2, REQ-4'
        tdd_excerpts:
          - 'IMP-3 as amended by F-3, FLOW-1, ASM-2 and ASM-3; the replaces are read as the element of the index getReplaces'
      likely_files:
        - 'src/main/java/io/morin/archicode/workspace/WorkspaceFactory.java'
        - 'src/main/java/io/morin/archicode/workspace/PlateauFoldService.java'
        - 'src/test/java/io/morin/archicode/workspace/PlateauFoldServiceTest.java'
        - 'src/main/java/io/morin/archicode/workspace/LayerLoader.java'
      acceptance_criteria:
        - 'Every case of the file passes through the service; create is unchanged'
      verification:
        - './mvnw -q test -Dtest=PlateauFoldServiceTest+FoldTest exits 0'
        - './mvnw -q test -Dtest=GuideTest+ArchiCodeTest exits 0 or fails only on the missing golden line, which task-006 regenerates'
        - './mvnw -q test-compile pmd:check exits 0'
      escalation_triggers:
        - 'RISK-1 materialises'
      suggested_subagent_type: 'general-purpose'
      suggested_model: '(default)'
      suggested_effort: 'high'
    - task_id: task-005
      agent_role: 'Backend Implementation Agent'
      objective: 'Add the command and prove it writes nothing, on the test side and on the packaged application'
      context:
        prd_excerpts:
          - 'REQ-1: byte for byte on the folder; REQ-2: one error line, exit 1'
        tdd_excerpts:
          - 'CTR-3, DEC-7, IMP-2, IMP-4 and IMP-6; copy the registration of ListPlateausCommand; the IT talks to the application by its command line only (CON-6)'
      likely_files:
        - 'src/main/java/io/morin/archicode/cli/FoldCommand.java'
        - 'src/main/java/io/morin/archicode/cli/PlateauGroup.java'
        - 'src/main/java/io/morin/archicode/cli/ListPlateausCommand.java'
        - 'src/test/java/io/morin/archicode/cli/CliHarness.java'
        - 'src/test/java/io/morin/archicode/cli/PlateauFoldCommandTest.java'
        - 'src/test/java/io/morin/archicode/it/PlateauFoldIT.java'
        - 'src/main/resources/META-INF/native-image/io.morin.archicode/archicode/reflect-config.json'
      acceptance_criteria:
        - 'The unchanged-folder test snapshots hidden files too'
        - 'The IT runs against the jar'
      verification:
        - './mvnw -q test -Dtest=PlateauFoldCommandTest+PlateauFoldServiceTest+FoldTest exits 0'
        - 'grep -n "FoldCommand" src/main/resources/META-INF/native-image/io.morin.archicode/archicode/reflect-config.json prints a line'
        - './mvnw -q verify -DskipITs=false -Dit.test=PlateauFoldIT -Dtest=NoSuchTest -Dsurefire.failIfNoSpecifiedTests=false -Djacoco.skip=true exits 0, with JAVA_HOME set to a JDK 25 (no unit test runs there, so the JaCoCo floors are left to task-008)'
        - './mvnw -q test-compile pmd:check exits 0'
      escalation_triggers:
        - 'The folder changes'
      suggested_subagent_type: 'general-purpose'
      suggested_model: '(default)'
      suggested_effort: 'medium'
    - task_id: task-006
      agent_role: 'Documentation Agent'
      objective: 'Add the guide sentence and regenerate the golden file'
      context:
        prd_excerpts:
          - 'REQ-5'
        tdd_excerpts:
          - 'IMP-5: regenerate with archicode guide piped through sed 1s/.*/archicode guide @VERSION@/ in the same change; the budget is 30 KB'
      likely_files:
        - 'src/main/resources/guide/guide.md'
        - 'src/test/resources/guide/golden.md'
      acceptance_criteria:
        - 'GuideTest passes with the regenerated golden file'
      verification:
        - './mvnw -q test -Dtest=GuideTest exits 0'
        - 'wc -c src/test/resources/guide/golden.md prints fewer than 30000'
        - 'grep -n "plateau fold" src/test/resources/guide/golden.md prints a line'
      escalation_triggers:
        - 'Over the budget'
      suggested_subagent_type: 'general-purpose'
      suggested_model: '(default)'
      suggested_effort: 'low'
    - task_id: task-007
      agent_role: 'Documentation Agent'
      objective: 'Write the manual section, the release item and the CLAUDE.md paragraph from the sentences of the cases file'
      context:
        prd_excerpts:
          - 'REQ-4 and REQ-5'
        tdd_excerpts:
          - 'IMP-7 with F-6 (upgrade-0-21 item; plateau-limits is W-4) and F-7 (concrete report line)'
      likely_files:
        - 'src/doc/README.adoc'
        - 'CLAUDE.md'
        - 'src/test/javascript/viewpoint-kernel/fold-cases.json'
      acceptance_criteria:
        - 'The sentences quoted in the manual equal those of the cases file'
      verification:
        - 'grep -n "\[\[plateau-fold\]\]" src/doc/README.adoc prints a line'
        - 'grep -n "plateau fold" CLAUDE.md prints a line'
        - 'npm run format:check exits 0'
      escalation_triggers:
        - 'No open release block'
      suggested_subagent_type: 'general-purpose'
      suggested_model: 'haiku'
      suggested_effort: 'high'
    - task_id: task-008
      agent_role: 'QA Agent'
      objective: 'Run the gates and log each exit code'
      context:
        prd_excerpts:
          - 'REQ-5'
        tdd_excerpts:
          - 'Observability and Verification commands; JAVA_HOME must name a JDK 25 (the shell Java is 21)'
      likely_files:
        - 'target/jacoco-report'
        - 'scripts/byte-identity.sh'
      acceptance_criteria:
        - 'Every gate exits 0 or its failure is shown to pre-exist on the parent commit'
      verification:
        - 'JAVA_HOME set to a JDK 25, then ./mvnw verify exits 0 (unit tests, PMD and the JaCoCo floors)'
        - './mvnw verify -DskipITs=false exits 0'
        - './mvnw test-compile pmd:check exits 0'
        - 'scripts/byte-identity.sh exits 0 with no unexpected difference'
        - 'npm run format:check exits 0'
      escalation_triggers:
        - 'A floor fails'
      suggested_subagent_type: 'general-purpose'
      suggested_model: '(default)'
      suggested_effort: 'low'
    - task_id: task-009
      agent_role: 'QA Agent'
      objective: 'Show that the tests catch a write and a missing composition, restore the sources, and close the log'
      context:
        prd_excerpts:
          - 'REQ-1 and REQ-2'
        tdd_excerpts:
          - 'Sabotage record: make the command write one byte and show the unchanged-folder test fail; drop the composition and show the case of the replaces change fail'
      likely_files:
        - 'src/main/java/io/morin/archicode/cli/FoldCommand.java'
        - 'src/main/java/io/morin/archicode/workspace/PlateauFoldService.java'
        - 'docs/wav/wav-028-fold-and-browser-menu/run/run-0207-plateau-fold-dry-run/prg-0207-plateau-fold-dry-run.md'
      acceptance_criteria:
        - 'Both sabotaged trees fail the named tests; the restored tree passes and its sha256 list equals the one taken before'
      verification:
        - 'a sha256 list of every file under src/main/java and src/test/java, taken into the scratchpad before the sabotage (find ... -type f | sort | xargs sha256sum), is identical after the restore (git diff --stat is not enough: the files of this run are untracked, the run commits nothing)'
        - './mvnw -q test -Dtest=FoldTest+PlateauFoldServiceTest+PlateauFoldCommandTest exits 0 after the restore'
        - 'git status --short lists only the files named in the outputs of tasks 001 to 007 and the run documents'
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
        - 'file check'
      success_criteria:
        - 'The TDD carries the findings, the facts are logged and src is unchanged'
    - task_id: task-002
      methods:
        - 'unit tests'
        - 'format check'
      success_criteria:
        - 'FoldTest fails on the stub with its exception and Fold.java has no picocli or CDI import'
    - task_id: task-003
      methods:
        - 'unit tests'
        - 'static analysis'
      success_criteria:
        - 'FoldTest passes and PMD is clean'
    - task_id: task-004
      methods:
        - 'unit tests'
        - 'static analysis'
      success_criteria:
        - 'The cases pass through the service and PMD is clean'
    - task_id: task-005
      methods:
        - 'unit tests'
        - 'integration test'
        - 'static analysis'
      success_criteria:
        - 'The command test and the IT pass, the folder is unchanged byte for byte, the reflect entry exists'
    - task_id: task-006
      methods:
        - 'unit tests'
        - 'file check'
      success_criteria:
        - 'GuideTest passes and the golden file is under 30 KB'
    - task_id: task-007
      methods:
        - 'file check'
        - 'format check'
      success_criteria:
        - 'The anchors are present and the format check passes; ManualExamplesTest runs in task-008'
    - task_id: task-008
      methods:
        - 'build'
        - 'integration test'
        - 'static analysis'
        - 'regression check'
      success_criteria:
        - 'Every gate exits 0 and the byte-identity harness reports no unexpected difference'
    - task_id: task-009
      methods:
        - 'regression check'
        - 'unit tests'
      success_criteria:
        - 'The sabotaged trees fail, the restored tree passes, only the expected files changed'
```

## 11. Escalation Rules

```yaml
escalation_rules:
  rules:
    - condition: 'A new test is green on the stub or on the unsabotaged tree for the wrong reason'
      action: 'Strengthen the assertion until it fails for the reason it names before the next task starts'
    - condition: 'ASM-2 or ASM-3 is refuted, or no step holds the replaces after the folded patches (RISK-1)'
      action: 'Decide inline between the step of the folded plateau and the element of the plateau above, log the decision in the progress log and amend the TDD'
    - condition: 'A refusal sentence has to change after the cases file is written'
      action: 'Change the cases file, the manual and the golden file in the same change (RISK-5) and rerun task-008'
    - condition: 'The change would need create, the kernel, the schema or a file the existing commands write'
      action: 'Stop and treat it as a change of the design (CON-5), not a plan step'
    - condition: 'A JaCoCo floor or PMD fails'
      action: 'Add a test that asserts what the code returns, or fix the finding; never lower a floor and never add NOPMD'
    - condition: 'The packaged application cannot be built or run (no JDK 25) or the tag archicode-0.19.0 is missing for the harness'
      action: 'Log the gate as not run with the reason; the Native job and the tag run prove the rest in CI'
    - condition: 'Autonomy override of complete-run'
      action: 'No task of this plan is human_required, so the override is not used; if one is added it runs under the override and is logged'
```

## 12. Final Execution Manifest

```yaml
execution_manifest:
  status: 'done'
  recommendation: 'proceed'
  autonomy_level: 'high'
  total_tasks: 9
  autonomous_tasks: 9
  review_before_tasks: 0
  review_after_tasks: 0
  human_required_tasks: 0
  blocked_tasks: 0
  critical_path_tasks:
    - task-001
    - task-002
    - task-003
    - task-004
    - task-005
    - task-006
    - task-008
    - task-009
  parallel_groups:
    - parallel-group-001
  required_human_gates: []
  highest_risk_tasks:
    - task-002
    - task-003
    - task-004
    - task-005
  lowest_confidence_tasks:
    - task-004
    - task-002
    - task-003
  next_action: 'Start task-001: apply the review findings to the TDD and log the facts of the Brightcart'
  criteria:
    - 'The tests fail on the stub and pass on the implementation'
    - 'A dry-run and every refusal leave the folder identical byte for byte'
    - 'The gates exit 0 and the existing commands write the same bytes'
    - 'The guide, the manual and CLAUDE.md say what the run built and what the writer will add'
```
