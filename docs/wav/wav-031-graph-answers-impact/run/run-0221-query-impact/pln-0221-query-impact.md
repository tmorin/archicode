---
title: Execution Plan — archicode query impact
status: done
date: 2026-11-05
related:
  - docs/wav/wav-031-graph-answers-impact/run/run-0221-query-impact/tdd-0221-query-impact.md
  - docs/wav/wav-031-graph-answers-impact/wav-031-graph-answers-impact.md
  - docs/wav/wav-031-graph-answers-impact/wbc-031-graph-answers-impact.md
  - src/main/java/io/morin/archicode/cli/GetGraphQuery.java
  - src/test/java/io/morin/archicode/doc/ArchitectureImpactTest.java
  - https://github.com/tmorin/archicode/issues/187
type: pln
run: 0221
wave: 031
---

# Execution Plan: archicode query impact

Profile TDD+pln: there is no PRD, so REQ-1 to REQ-11 are the IDs the TDD labels (section "PRD Traceability"), taken from the manifest of wave 031 (row W-3, the seven criteria of gate P2, the wave's Q1) and from #187. The plan follows the TDD plus the Stage 5 review findings of the progress log (prg-0221, Stage 5), which the TDD has not absorbed: task-001 amends the TDD with them before any code is written. Where the TDD and a finding differ, the finding wins, with the choices this plan makes in the gaps below (gap-001 to gap-008).

The order is the traversal first (task-002: `ImpactTest` before `Impact`, red then green inside the task, because a test that does not compile without its class is the red state), then the command and its test (task-003), the oracle that asks the command (task-004, the last code task: it is where `--through deployments` is used by Q08 and Q09, the author's answer to the wave's Q1), then the guide, the integration test, the manual, the pointers and the site, the model and its sample, and last the gates and the run record. The tasks are sequential on purpose: every task that runs `./mvnw` shares one `target/` directory, and the documents of tasks 007 to 009 are checked against the command as task-003 and task-004 leave it; no task is cut along a path that another task also writes.

All `./mvnw` commands run with JDK 25 (CON-1): `export JAVA_HOME=$(ls -d ~/.sdkman/candidates/java/25* | head -1)`, since the shell java is 21. The working tree already holds uncommitted work of the wave (run 0220: `GetGraphQuery.buildGraph` and the `deployments` list of `query graph`, `impact-questions.json` with Q08 and Q09, the golden of the guide); the plan builds on it and never reverts it.

This run operates under the autonomy override of `complete-run` (read before Stage 10): no task stops for a human on its category alone. No task here is `critical`, `human_required` or `required` for review, so the override changes no route; the one gate (the pull request of the wave) is a human step outside the plan. Nothing in this plan commits, pushes, merges, tags or files a GitHub issue: those are human steps, and the plan says so where a task could be read as asking for one.

## 1. Executive Summary

```yaml
summary:
  status: 'done'
  product_goal: 'The question what does a change to X touch is answered by the product, not by a walk each client writes (#187): archicode query impact prints one line of JSON with the elements reached, their distance and the first coupling that reached them, and the oracle, the guide, the manual, CLAUDE.md, the site and the model of ArchiCode say it.'
  technical_approach: 'Amend the TDD with the Stage 5 findings; write workspace/Impact (plain class, test first) as the walk of ArchitectureImpactTest.impact with via, --qualifier and --through; write cli/ImpactQuery (thin) over GetGraphQuery.buildGraph made static; make the oracle ask the command for Q01 to Q09 and keep the old walk as the second oracle; write the guide paragraph and its test, ImpactIT, the manual section, the pointers of CLAUDE.md and the site, the qualifier of the model and the sample; then run every gate and write what is proved where.'
  total_tasks: 10
  parallel_groups: 0
  high_risk_tasks: 0
  human_review_gates: 1
  autonomy_level: 'high'
  recommendation: 'proceed'
  criteria:
    - 'query --help lists impact; archicode guide names the command, --direction, --depth, --qualifier, --through, --plateau and the containment rule, and GuideTest passes with golden.md regenerated (REQ-1)'
    - 'ArchitectureImpactTest answers Q01 to Q09 through query impact, equal to expect and to the old walk, and Q01 to Q07 are unchanged against the commit ff3bacd (REQ-2, REQ-9)'
    - 'query impact nowhere on docs/architecture is one line starting error: on the error output and exit 1; --depth 0 and --depth -1 are refused the same way (REQ-3)'
    - 'reflect-config.json names the classes of the command and of its output, and ImpactIT runs query impact on the packaged jar (REQ-4)'
    - 'src/site/index.html (section agents) and src/site/llms.txt name archicode query impact (REQ-5)'
    - 'The root CLAUDE.md tells to run archicode query impact and its diff touches that one paragraph only (REQ-6)'
    - 'src/doc/README.adoc has the section Query impact, the how-to Work with an agent and a note of the release 0.24; mvnw verify -DskipITs=false, npm run test:unit, npm run format:check, npm run lint and mvnw test-compile pmd:check exit 0; npm run sample:build leaves git status --short unchanged (REQ-7, REQ-10)'
    - 'scripts/byte-identity.sh exits 0 with 0 DIFFERENT, no existing output moved (DEC-10)'
    - 'The run record says that the native image and the end-to-end suite are not verified by this run, and lists DEF-1 to DEF-4 as issues for the author to file (TDD Observability and Verification, Deferred Work); the editor is untouched (REQ-11)'
```

## 2. PRD/TDD Consistency Assessment

```yaml
consistency_assessment:
  aligned_items:
    - 'Scope, REQ-1 to REQ-11, DEC-1 to DEC-11, CTR-1 to CTR-3 and IMP-1 to IMP-11 agree with the W-3 row and the P2 gate of the wave manifest; every task below traces to them'
    - 'No question is open in the TDD (Q-1 to Q-4 resolved by DEC-7, CTR-1, DEC-5 and DEC-4; Stage 6 found nothing to research)'
    - 'The current state quoted by the TDD matches the repository read at planning time: QueryGroup holds three queries, GetGraphQuery.buildGraph is a public instance method (line 83) and collect a private one (line 121), GetGraphQueryTest calls it at line 179, ArchitectureImpactTest holds the walk (impact at line 145, three sabotage tests), impact-questions.json holds Q01 to Q09 and its first seven questions equal those of ff3bacd'
    - 'The files the TDD names exist or are to be created next to a sibling: FoldCommand is the thin-command example, AgentWalkIT and Shipped are in src/test/java/io/morin/archicode/it, guide.md, golden.md, GuideTest, ManualExamplesTest and CommandReferenceTest exist, docs/architecture/manifests/agent.yaml carries the qualifier query graph, src/site/llms.txt line 20 is Work with an agent'
  gaps:
    - id: gap-001
      type: ambiguity
      description: 'Stage 5 S2: NON_EMPTY inclusion does not keep a false primitive out, so deployment written only when true and direction written in lowercase are not ensured by the mapper; ASM-5 and RISK-4 cover only depth (null) and reached (empty).'
      impact: 'medium'
      recommendation: 'task-001 extends ASM-5, RISK-4 and CTR-1: the edge record is written with its deployment key only when true (a Boolean that is null when false, or an annotation that drops the default), depth and reached are always written, direction is written as in, out or both; task-003 pins all four in ImpactQueryTest.'
    - id: gap-002
      type: ambiguity
      description: 'Stage 5 S2: --qualifier with --through deployments alone is unspecified (ignored or refused); DEC-4 says --qualifier filters relationships only.'
      impact: 'medium'
      recommendation: 'Decided here: it is ignored, not refused (the option filters relationships, there are none to filter, and no command that succeeds today may start to fail, CON-2); task-001 writes it in DEC-4 and the manual, task-002 and task-003 pin it with a case.'
    - id: gap-003
      type: missing_technical_design
      description: 'Stage 5 S2: IMP-4 lists the classes for reflect-config.json but misses the enum and one record of the output; Stage 5 S1: Via and Edge are the same five fields.'
      impact: 'medium'
      recommendation: 'Decided here: one record Edge (source, destination, qualifiers, label, deployment) is both the input edge and the via of a Reached; Via is dropped. task-001 rewrites DEC-1, IMP-1, IMP-4 and CTR-1 so; IMP-4 lists ImpactQuery, Impact$Result, Impact$Reached, Impact$Edge and Impact$Direction with the six keys of their neighbours.'
    - id: gap-004
      type: ambiguity
      description: 'Stage 5 S2: the depth check is owned twice (DEC-1 says Impact throws for a depth of 0 or less, DEC-6 says ImpactQuery checks it before the workspace loads), with one sentence in two places.'
      impact: 'medium'
      recommendation: 'Decided here: one owner of the sentence, a static Impact.requireDepth(Integer) that throws ArchiCodeException with the sentence of DEC-6; ImpactQuery calls it before loading the workspace and walk calls it again for a caller that did not (a null depth passes). task-001 writes it into DEC-1 and DEC-6; ImpactTest pins the call from walk, ImpactQueryTest the order before the load.'
    - id: gap-005
      type: ambiguity
      description: 'Stage 5 S1: Picocli reads enums, so a converter for --direction and --through is needed only for lowercase values; the TDD says to add a converter if none is found to reuse.'
      impact: 'low'
      recommendation: 'task-001 words IMP-2 as: read CommandLineConfiguration and OutputFormatConverter first; if lowercase values are already accepted for enums use that, otherwise a converter in the pattern of OutputFormatConverter. task-003 decides by reading and writes the choice in the Javadoc of ImpactQuery.'
    - id: gap-006
      type: ambiguity
      description: 'Stage 5 S1 (five items): rule (4) of DEC-3 is implied by rule (3) because the starts are in visited; the failure branch of ASM-3 is unneeded because a set deduplicates; DEC-9 and DEC-10 restate Non-Goals; IMP-3 re-tests the output of query graph that GetGraphQueryTest and the harness already hold.'
      impact: 'low'
      recommendation: 'task-001 words rule (4) as a consequence of rule (3), deletes the failure branch of ASM-3, folds DEC-9 and DEC-10 into Non-Goals in one line each (the numbers DEC-9 and DEC-10 are kept as pointers so no reference breaks, or every reference is renumbered in the same edit), and removes the query graph re-test from IMP-3.'
    - id: gap-007
      type: ambiguity
      description: 'Stage 5 S1: DEF-1 to DEF-4 should be GitHub issues per the repository habit, not only a list in the TDD.'
      impact: 'low'
      recommendation: 'Filing an issue is an external write the plan does not authorise: task-001 keeps DEF-1 to DEF-4 in the TDD and says the author files them; task-010 writes the four texts, ready to paste, in the run record.'
    - id: gap-008
      type: risk
      description: 'The wave pull request cannot prove the native image (IMP-4: the Native job of CI under -Dnative does) or the end-to-end browser suite (the editor is untouched); the byte-identity harness builds its base from the tag archicode-0.19.0, which needs the tag and a build.'
      impact: 'medium'
      recommendation: 'task-010 runs the harness and, if the base cannot be built here (tag missing, no network), records that it was not run and why rather than reporting success; the run record lists what is proved where.'
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
        - 'tdd-0221-query-impact.md amended'
      agent_role: 'Architecture Agent'
      autonomy: 'autonomous'
      risk: 'low'
      confidence: 80
    - id: task-002
      status: 'done'
      title: 'Write ImpactTest, then workspace/Impact'
      depends_on: [task-001]
      produces:
        - 'src/test/java/io/morin/archicode/workspace/ImpactTest.java'
        - 'src/main/java/io/morin/archicode/workspace/Impact.java'
      agent_role: 'Backend Implementation Agent'
      autonomy: 'autonomous'
      risk: 'medium'
      confidence: 78
    - id: task-003
      status: 'done'
      title: 'Write cli/ImpactQuery, make buildGraph static, register the command and the classes'
      depends_on: [task-002]
      produces:
        - 'src/main/java/io/morin/archicode/cli/ImpactQuery.java'
        - 'src/main/java/io/morin/archicode/cli/QueryGroup.java'
        - 'src/main/java/io/morin/archicode/cli/GetGraphQuery.java'
        - 'src/main/resources/META-INF/native-image/io.morin.archicode/archicode/reflect-config.json'
        - 'src/test/java/io/morin/archicode/cli/ImpactQueryTest.java'
      agent_role: 'Backend Implementation Agent'
      autonomy: 'autonomous'
      risk: 'medium'
      confidence: 75
    - id: task-004
      status: 'done'
      title: 'Make the oracle ask the command for Q01 to Q09 and keep the old walk as the second oracle'
      depends_on: [task-003]
      produces:
        - 'src/test/java/io/morin/archicode/doc/ArchitectureGraph.java'
        - 'src/test/java/io/morin/archicode/doc/ArchitectureImpactTest.java'
      agent_role: 'Test Generation Agent'
      autonomy: 'autonomous'
      risk: 'medium'
      confidence: 75
    - id: task-005
      status: 'done'
      title: 'Write the guide paragraph, regenerate the golden, add the options case to GuideTest'
      depends_on: [task-004]
      produces:
        - 'src/main/resources/guide/guide.md'
        - 'src/test/resources/guide/golden.md'
        - 'src/test/java/io/morin/archicode/cli/GuideTest.java'
      agent_role: 'Documentation Agent'
      autonomy: 'autonomous'
      risk: 'low'
      confidence: 80
    - id: task-006
      status: 'done'
      title: 'Write ImpactIT on the packaged application'
      depends_on: [task-005]
      produces:
        - 'src/test/java/io/morin/archicode/it/ImpactIT.java'
      agent_role: 'Test Generation Agent'
      autonomy: 'autonomous'
      risk: 'low'
      confidence: 78
    - id: task-007
      status: 'done'
      title: 'Write the manual: Query impact, Work with an agent, the note of the release, the command reference'
      depends_on: [task-006]
      produces:
        - 'src/doc/README.adoc'
      agent_role: 'Documentation Agent'
      autonomy: 'autonomous'
      risk: 'low'
      confidence: 78
    - id: task-008
      status: 'done'
      title: 'Write the pointers: CLAUDE.md, the workspace rule, the site and llms.txt'
      depends_on: [task-007]
      produces:
        - 'CLAUDE.md'
        - 'src/main/java/io/morin/archicode/workspace/CLAUDE.md'
        - 'src/site/index.html'
        - 'src/site/llms.txt'
      agent_role: 'Documentation Agent'
      autonomy: 'autonomous'
      risk: 'low'
      confidence: 82
    - id: task-009
      status: 'done'
      title: 'Add the qualifier query impact to the model and rebuild the sample'
      depends_on: [task-008]
      produces:
        - 'docs/architecture/manifests/agent.yaml'
        - 'src/main/resources/editor-webapp/samples/archicode.yaml'
      agent_role: 'Documentation Agent'
      autonomy: 'autonomous'
      risk: 'low'
      confidence: 85
    - id: task-010
      status: 'done'
      title: 'Run the gates and write the run record'
      depends_on: [task-009]
      produces:
        - 'run-0221-query-impact.md with the verification, the proved-where statement and the four deferred items'
        - 'prg-0221-query-impact.md Findings with the gate output'
      agent_role: 'QA Agent'
      autonomy: 'autonomous'
      risk: 'low'
      confidence: 80
  edges:
    - from: task-001
      to: task-002
      reason: 'the test is written against the amended TDD (one Edge record, Impact.requireDepth, the two ignored-qualifier and deployment-key rules)'
    - from: task-002
      to: task-003
      reason: 'the command maps the graph to Impact inputs and the result to JSON; it needs the class'
    - from: task-003
      to: task-004
      reason: 'the oracle runs the command, and GetGraphQuery.buildGraph must already be static for the compile of the test tree'
    - from: task-004
      to: task-005
      reason: 'the guide is checked against the options the command has; serialized after the oracle because both run mvnw on one target directory'
    - from: task-005
      to: task-006
      reason: 'the integration test runs the packaged application, whose guide and command are final after task-005'
    - from: task-006
      to: task-007
      reason: 'the manual example is run by ManualExamplesTest on the command as built; serialized on the one target directory'
    - from: task-007
      to: task-008
      reason: 'the pointers name the sections the manual now has'
    - from: task-008
      to: task-009
      reason: 'the qualifier list of the root paragraph and the model say the same words; the sample is rebuilt from the model last'
    - from: task-009
      to: task-010
      reason: 'the gates and the git status check cover every file the run changes'
```

## 4. Task Catalog

```yaml
task_catalog:
  tasks:
    - id: task-001
      title: 'Amend the TDD with the Stage 5 findings'
      source_requirements:
        prd:
          - 'REQ-3'
          - 'REQ-4'
          - 'REQ-8'
        tdd:
          - 'DEC-1'
          - 'DEC-3'
          - 'DEC-4'
          - 'DEC-6'
          - 'ASM-3'
          - 'ASM-5'
          - 'IMP-2'
          - 'IMP-3'
          - 'IMP-4'
          - 'CTR-1'
          - 'RISK-4'
          - 'Deferred Work'
      outputs:
        - 'DEC-1, IMP-1, IMP-4 and CTR-1 say one record Edge (source, destination, qualifiers, label, deployment) is the input edge and the via of Reached, and there is no Via record'
        - 'ASM-5, RISK-4 and CTR-1 say depth and reached are always written, deployment only when true and direction as in, out or both, and that ImpactQueryTest pins all four'
        - 'DEC-4 says --qualifier with --through deployments alone is ignored and no error (gap-002)'
        - 'DEC-1 and DEC-6 name Impact.requireDepth(Integer) as the one owner of the depth sentence, called by ImpactQuery before the workspace loads and by walk'
        - 'IMP-2 says to read CommandLineConfiguration and OutputFormatConverter and reuse the lowercase enum handling before writing a converter'
        - 'IMP-4 lists ImpactQuery, Impact$Result, Impact$Reached, Impact$Edge and Impact$Direction'
        - 'Rule (4) of DEC-3 is worded as a consequence of rule (3); the failure branch of ASM-3 is gone; DEC-9 and DEC-10 are one line each inside Non-Goals; IMP-3 no longer re-tests the output of query graph'
        - 'Deferred Work says DEF-1 to DEF-4 are issues for the author to file and the plan does not file them'
      verification:
        - 'grep -c "Via record\|Impact\$Via" on the TDD prints 0 outside a sentence that says there is none, and grep -q "requireDepth" on the TDD succeeds'
        - 'grep -q "Impact\$Direction" on the TDD succeeds and grep -q "is ignored" on the TDD succeeds'
        - 'grep -c "^- `Q-[1-4]` (resolved" on the TDD still prints 4 and the sections and ids IMP-1 to IMP-11, CTR-1 to CTR-3 and REQ-1 to REQ-11 are all still present (grep -c on each prefix)'
        - 'git diff --stat -- src scripts .github pom.xml package.json docs/architecture prints nothing for the paths this task owns (the uncommitted work of the wave stays as it was)'
      risk: 'low'
      confidence: 80
      human_review: 'none'
      escalation_triggers:
        - 'A finding contradicts the repository when read (follow the repository, write the reading in the Findings of the prg)'
        - 'A fix needs a product decision (none is expected: gap-002 and gap-004 are decided in this plan)'
      delegation_tier: 'standard'
      results: 'tier standard, model sonnet, effort medium, profile low-cost, passed first time, inline (leaf), independently verified'
    - id: task-002
      title: 'Write ImpactTest, then workspace/Impact'
      source_requirements:
        prd:
          - 'REQ-3'
          - 'REQ-8'
          - 'REQ-9'
        tdd:
          - 'DEC-1'
          - 'DEC-3'
          - 'DEC-4'
          - 'DEC-6'
          - 'DEC-7'
          - 'ASM-1'
          - 'ASM-2'
          - 'CON-4'
          - 'CON-6'
          - 'IMP-1'
          - 'IMP-3'
      outputs:
        - 'ImpactTest (JUnit, plain, no Quarkus) written first and seen failing to compile or fail, with the cases of DEC-9: a chain, a cycle, a diamond (shortest distance), two edges to one reference in one hop (the first is via), an ancestor reached after its descendant, a descendant reached after its ancestor (dropped), the descendants of the start left out, each direction, depth 1, 2 and unbounded, --qualifier any-of and none, deployments out and in, --through without relationships, --qualifier ignored with deployments alone, a hosted application that is dangling (reached as written), an unknown start, a depth of 0 and below through requireDepth, a nested start, a start with no edge (empty reached)'
        - 'Impact: a final class, no Picocli, no CDI, no Workspace, no mapper, with a static walk(Set of references, List of Edge, Request) returning a Result, the records Edge, Request, Result and Reached, the enum Direction (IN, OUT, BOTH) and a static requireDepth; it is the walk of ArchitectureImpactTest.impact with the first edge recorded as via'
        - 'A Javadoc on the class that says the rules of DEC-3 (containment, distance, first path, edge order, cycle end)'
        - 'Prettier-clean (npm run format:check covers src/**/*.java) and PMD-clean'
      verification:
        - './mvnw -o test -Dtest=ImpactTest exits 0 with JDK 25 (CON-1); it was red before Impact existed'
        - 'grep -c "picocli\|jakarta\|import io.morin.archicode.workspace.Workspace\|ObjectMapper" src/main/java/io/morin/archicode/workspace/Impact.java prints 0'
        - 'npx prettier --check src/main/java/io/morin/archicode/workspace/Impact.java src/test/java/io/morin/archicode/workspace/ImpactTest.java exits 0'
        - './mvnw -o test -Dtest=FoldTest exits 0 (the neighbouring plain class of the package still compiles and passes)'
      risk: 'medium'
      confidence: 78
      human_review: 'none'
      escalation_triggers:
        - 'A rule of DEC-3 cannot be written the way ArchitectureImpactTest.impact behaves (read the old walk line by line: it is the specification, and the nine questions are the proof)'
        - 'PMD refuses a construct the traversal needs (change the code, never silence the rule, CON-6)'
      delegation_tier: 'standard'
      results: 'tier standard, model sonnet, effort medium, profile low-cost, passed first time, inline (leaf), independently verified'
    - id: task-003
      title: 'Write cli/ImpactQuery, make buildGraph static, register the command and the classes'
      source_requirements:
        prd:
          - 'REQ-1'
          - 'REQ-3'
          - 'REQ-4'
          - 'REQ-8'
          - 'REQ-9'
        tdd:
          - 'DEC-2'
          - 'DEC-4'
          - 'DEC-5'
          - 'DEC-6'
          - 'DEC-7'
          - 'ASM-4'
          - 'ASM-5'
          - 'CON-2'
          - 'CON-3'
          - 'CTR-1'
          - 'CTR-2'
          - 'IMP-2'
          - 'IMP-3'
          - 'IMP-4'
          - 'IF-1'
          - 'IF-2'
          - 'FLOW-1'
          - 'FLOW-2'
      outputs:
        - 'GetGraphQuery.buildGraph and collect are static (the TDD says public static and private static); the one call in GetGraphQueryTest goes through the class; the output of query graph does not change'
        - 'ImpactQuery: a thin Picocli Runnable in the pattern of FoldCommand and GetGraphQuery (PlateauOption mixin, parent QueryGroup for the workspace path, QueryOutputWriter and MapperFactory injected), the reference as parameter 0, the options --direction (default in), --depth, --qualifier (repeatable), --through (repeatable, default relationships), --plateau; it calls Impact.requireDepth before the workspace loads, GetGraphQuery.buildGraph, then Impact.walk, and prints one line of JSON of CTR-1'
        - 'QueryGroup lists the subcommand'
        - 'reflect-config.json names ImpactQuery, Impact$Result, Impact$Reached, Impact$Edge and Impact$Direction with the six keys their neighbours carry'
        - 'ImpactQueryTest (QuarkusTest, in the style of GetGraphQueryTest) pins: the options, the key order of the JSON, depth null and reached empty both written, deployment written only when true, direction lowercase, the unknown start (one line starting error:, exit 1, nothing on the standard output), --depth 0 and --depth -1 and --depth=-1 (ASM-4: pin the exit Picocli gives and write it in the Javadoc if Picocli refuses first), a wrong --direction (exit 2), the plateau option, --qualifier ignored with --through deployments alone, two runs giving the same bytes'
        - 'The Javadoc of ImpactQuery says how lowercase values of --direction and --through are accepted (gap-005)'
      verification:
        - './mvnw -o test -Dtest=ImpactQueryTest,GetGraphQueryTest,ImpactTest exits 0 with JDK 25 (CON-1)'
        - 'grep -c "static Graph buildGraph\|static void collect" src/main/java/io/morin/archicode/cli/GetGraphQuery.java prints 2 and grep -c "getGraphQuery.buildGraph" src/test/java/io/morin/archicode/cli/GetGraphQueryTest.java prints 0'
        - 'grep -c "ImpactQuery\|Impact\$Result\|Impact\$Reached\|Impact\$Edge\|Impact\$Direction" src/main/resources/META-INF/native-image/io.morin.archicode/archicode/reflect-config.json prints at least 5'
        - './mvnw -o test -Dtest=ArchitectureModelTest,ArchitectureDriftTest exits 0 (nothing under docs/architecture moved)'
        - 'npx prettier --check on the four Java files this task writes or edits exits 0'
      risk: 'medium'
      confidence: 75
      human_review: 'none'
      escalation_triggers:
        - 'Picocli reads --depth -1 as an option and the gate (one error line, exit 1) cannot hold (ASM-4): pin the real behaviour, write --depth=-1 in the manual and log the finding, as RISK-3 says'
        - 'A relationship destination or a reference is not unique across the two layers (ASM-3): stop and log it, since the plan does not guess'
        - 'Making buildGraph static changes a byte of the output of query graph (GetGraphQueryTest fails): revert that part and escalate'
      delegation_tier: 'standard'
      results: 'tier standard, model sonnet, effort medium, profile low-cost, passed first time, inline (leaf), independently verified'
    - id: task-004
      title: 'Make the oracle ask the command for Q01 to Q09 and keep the old walk as the second oracle'
      source_requirements:
        prd:
          - 'REQ-2'
          - 'REQ-9'
          - 'REQ-11'
        tdd:
          - 'DEC-4'
          - 'DEC-5'
          - 'CON-5'
          - 'CTR-3'
          - 'IMP-5'
          - 'IF-3'
          - 'FLOW-3'
          - 'RISK-1'
      outputs:
        - 'ArchitectureGraph gets a helper impact(...) next to load that runs query impact for a question and returns its parsed JSON; it fails the way load does on a non-zero exit or a non-empty error output'
        - 'ArchitectureImpactTest asks the command for each of Q01 to Q09: start, --direction, --depth when not null, one --qualifier per entry, --through per DEC-4 (none for a question with no through key; --through deployments alone when qualifiers are empty, both couplings and the qualifiers otherwise), compares the set of reached references with expect, then with the answer of the old walk on the graph of query graph; a question with several starts fails an assertion'
        - 'The three sabotage tests stay on the old walk; the Javadoc of the class says the command is the first oracle and the walk the second, removed later'
        - 'impact-questions.json is not changed by this task'
      verification:
        - './mvnw -o test -Dtest=ArchitectureImpactTest exits 0 with JDK 25 (CON-1): nine questions green by the command and by the walk'
        - 'node -e comparing the first seven objects of the questions in the working tree with those of git show ff3bacd:src/test/javascript/architecture/impact-questions.json (JSON.stringify of each) exits 0, and git diff --stat -- src/test/javascript/architecture/impact-questions.json shows no line added by this task'
        - 'npx prettier --check src/test/java/io/morin/archicode/doc/ArchitectureGraph.java src/test/java/io/morin/archicode/doc/ArchitectureImpactTest.java exits 0'
      risk: 'medium'
      confidence: 75
      human_review: 'none'
      escalation_triggers:
        - 'The command answers a question differently from expect or from the old walk (a port that moved a rule: fix Impact, never the expect list of Q01 to Q07, CON-5)'
        - 'A question needs a start that is not one reference (RISK-1: stop and log it)'
      delegation_tier: 'standard'
      results: 'tier standard, model sonnet, effort medium, profile low-cost, passed first time, inline (leaf), independently verified'
    - id: task-005
      title: 'Write the guide paragraph, regenerate the golden, add the options case to GuideTest'
      source_requirements:
        prd:
          - 'REQ-1'
        tdd:
          - 'DEC-8'
          - 'ASM-6'
          - 'RISK-6'
          - 'IMP-6'
          - 'TG-5'
      outputs:
        - 'guide.md gets a paragraph under 2 KB that names archicode query impact, --direction, --depth, --qualifier, --through, --plateau, the containment rule and the keys of the output; the sentence of line 19 is kept; the sh block that AgentWalkIT runs is changed only if the new command can run on the workspace that walk builds'
        - 'golden.md is regenerated the way GuideTest documents (read its Javadoc: the version is @VERSION@), never by hand'
        - 'GuideTest gets a case that reads the options of the command from the Picocli spec and fails when the guide does not name the command or one option'
      verification:
        - './mvnw -o test -Dtest=GuideTest,GuideCorpusTest exits 0 with JDK 25 (CON-1), the 30 KB budget holds'
        - 'grep -c "query impact" src/main/resources/guide/guide.md and src/test/resources/guide/golden.md are not 0 and each of --direction, --depth, --qualifier, --through, --plateau appears in both'
        - 'The new case fails when one option is removed from a copy of the guide (the test is read for that, or a throw-away edit run and reverted by the agent in the same task)'
        - 'npx prettier --check src/test/java/io/morin/archicode/cli/GuideTest.java exits 0'
      risk: 'low'
      confidence: 80
      human_review: 'none'
      escalation_triggers:
        - 'The golden cannot be regenerated by the documented way (read GuideTest again; do not edit the golden by hand)'
        - 'The paragraph passes 2 KB and the budget fails: shorten it, the manual holds the full rules'
      delegation_tier: 'standard'
      results: 'tier standard, model sonnet, effort medium, profile low-cost, passed first time, inline (leaf), independently verified'
    - id: task-006
      title: 'Write ImpactIT on the packaged application'
      source_requirements:
        prd:
          - 'REQ-3'
          - 'REQ-4'
        tdd:
          - 'IMP-7'
          - 'RISK-5'
          - 'CON-3'
      outputs:
        - 'ImpactIT in src/test/java/io/morin/archicode/it next to AgentWalkIT, QuarkusMainIntegrationTest in the pattern of its neighbours and Shipped for the workspace copy: an answer with a non-empty reached, --through deployments, an unknown reference (error: on the error output, exit 1) and --depth 0'
      verification:
        - './mvnw -o verify -DskipITs=false -Dit.test=ImpactIT -Dtest=ImpactTest,ImpactQueryTest,NativeReflectionConfigTest -Dsurefire.failIfNoSpecifiedTests=false -Djacoco.skip=true exits 0 with JDK 25 (CON-1; -Djacoco.skip=true because the 90 % coverage rule of verify cannot hold on a restricted test set) and the log names ImpactIT as run; the other unit tests are not part of this check (CommandReferenceTest fails until task-007 writes the manual listing of query impact)'
        - './mvnw -o test-compile pmd:check exits 0 with JDK 25; two LooseCoupling violations left by earlier tasks are fixed here by declaring the interface type: ArrayDeque at workspace/Impact.java:180 and TreeSet at doc/ArchitectureGraph.java:68 (no behaviour change; ImpactTest and ArchitectureImpactTest still pass)'
        - 'npx prettier --check src/test/java/io/morin/archicode/it/ImpactIT.java exits 0'
        - 'Not verified here: under -Dnative (the Native job of CI proves it)'
      risk: 'low'
      confidence: 78
      human_review: 'none'
      escalation_triggers:
        - 'The packaged jar cannot be built in this environment (log it; task-010 records that the integration test was not run)'
      delegation_tier: 'standard'
      results: 'tier standard, model sonnet, effort medium, profile low-cost, passed first time, inline (leaf), independently verified'
    - id: task-007
      title: 'Write the manual: Query impact, Work with an agent, the note of the release, the command reference'
      source_requirements:
        prd:
          - 'REQ-7'
          - 'REQ-10'
        tdd:
          - 'DEC-3'
          - 'DEC-4'
          - 'DEC-8'
          - 'CON-7'
          - 'RISK-7'
          - 'IMP-10'
      outputs:
        - 'README.adoc gets === Query impact with [[query-impact]] after Query graph: the --help block, the rules of DEC-3 and DEC-4 as bullets (the default direction is the direction of the arrow and in, containment, each element once at its shortest distance, via is the first edge, deployment true on a deployment via, --qualifier ignored with --through deployments alone), one call on the model of ArchiCode with its answer (an example ManualExamplesTest runs), and the errors'
        - 'The how-to Work with an agent replaces the jq line of Ask the tool before the code with archicode query impact PaymentGateway'
        - '[[upgrade-0-24]] gets a numbered change (New)'
        - 'The generated block between :command-reference-begin: and :command-reference-end: holds the --help of the command, written by CommandReferenceTest, not by hand'
      verification:
        - './mvnw -o test -Dtest=CommandReferenceTest,ManualExamplesTest exits 0 with JDK 25 (CON-1)'
        - 'grep -c "=== Query impact" src/doc/README.adoc prints 1 and grep -c "\[\[query-impact\]\]" prints 1 and grep -c "query impact" in the upgrade-0-24 section is not 0'
        - 'node --test src/test/javascript/manual-howto.test.js exits 0'
      risk: 'low'
      confidence: 78
      human_review: 'none'
      escalation_triggers:
        - 'The example call of the manual does not give the answer ManualExamplesTest finds: use the answer the command prints, never an invented one'
        - 'The command reference is not regenerated by CommandReferenceTest alone (read its Javadoc for how the generator is run)'
      delegation_tier: 'standard'
      results: 'tier standard, model sonnet, effort medium, profile low-cost, passed first time, inline (leaf), independently verified'
    - id: task-008
      title: 'Write the pointers: CLAUDE.md, the workspace rule, the site and llms.txt'
      source_requirements:
        prd:
          - 'REQ-5'
          - 'REQ-6'
        tdd:
          - 'DEC-11'
          - 'CON-8'
          - 'IMP-8'
          - 'IMP-9'
      outputs:
        - 'The paragraph The model of ArchiCode of the root CLAUDE.md tells to run archicode query impact <reference> (with --direction, --depth, --qualifier and the qualifiers the manifests use, query impact added to the list and query graph kept) in place of following the relationships by hand, and keeps the sentences on ArchitectureImpactTest, ArchitectureDriftTest and the sample; no other line of that file changes'
        - 'src/main/java/io/morin/archicode/workspace/CLAUDE.md gets one bullet: Impact is plain, the containment rule, ImpactTest and ArchitectureImpactTest pin it'
        - 'src/site/index.html (section agents) gets one sentence and one line of its code block, and src/site/llms.txt a mention in the line Work with an agent or a line next to it'
        - 'No wave, run or issue id and no date in any added line of a CLAUDE.md (CON-8)'
      verification:
        - 'git diff -U0 -- CLAUDE.md | grep -c "^@@" prints 1'
        - 'git diff -U0 -- CLAUDE.md src/main/java/io/morin/archicode/workspace/CLAUDE.md | grep "^+" | grep -ciE "wave|run [0-9]|run-|#[0-9]|20[0-9][0-9]-" prints 0'
        - 'grep -c "query impact" src/site/index.html src/site/llms.txt are not 0 in both'
        - 'node --test src/test/javascript/site.test.js exits 0'
      risk: 'low'
      confidence: 82
      human_review: 'none'
      escalation_triggers:
        - 'site.test.js pins a sentence of the section agents that the new text breaks (change the new text, not the test, unless the test pins the old tool line on purpose)'
      delegation_tier: 'standard'
      results: 'tier standard, model sonnet, effort medium, profile low-cost, passed first time, inline (leaf), independently verified'
    - id: task-009
      title: 'Add the qualifier query impact to the model and rebuild the sample'
      source_requirements:
        prd:
          - 'REQ-7'
          - 'REQ-10'
        tdd:
          - 'DEC-11'
          - 'CI-arc-1'
          - 'IMP-11'
      outputs:
        - 'agent.yaml: the one relationship of agent to archicode.commandline carries the qualifiers query graph and query impact'
        - 'src/main/resources/editor-webapp/samples/archicode.yaml rebuilt by npm run sample:build'
      verification:
        - './mvnw -o test -Dtest=ArchitectureModelTest,ArchitectureDriftTest,ArchitectureImpactTest exits 0 with JDK 25 (CON-1)'
        - 'grep -c "query impact" docs/architecture/manifests/agent.yaml prints 1'
        - 'npm run sample:build run a second time leaves git status --short as it was after the first run'
        - 'node --test on the test that checks the samples are the bundles of their folders (read package.json for its name) exits 0'
      risk: 'low'
      confidence: 85
      human_review: 'none'
      escalation_triggers:
        - 'npm run sample:build changes a file other than the bundle of the architecture sample (the Brightcart bundle moved: log it)'
      delegation_tier: 'cheap'
      results: 'tier cheap, model haiku, effort high, profile low-cost, passed first time, inline (leaf), independently verified'
    - id: task-010
      title: 'Run the gates and write the run record'
      source_requirements:
        prd:
          - 'REQ-1'
          - 'REQ-2'
          - 'REQ-3'
          - 'REQ-4'
          - 'REQ-5'
          - 'REQ-6'
          - 'REQ-7'
          - 'REQ-11'
        tdd:
          - 'Observability and Verification'
          - 'DEC-10'
          - 'Deferred Work'
      outputs:
        - 'The run record run-0221-query-impact.md gets a Verification section: each command of the Observability and Verification section of the TDD with its exit, the probes of the packaged application (query --help lists impact; guide names the command; the unknown start, --depth 0 and --depth -1 each print one error: line and exit 1; the Q01 call reaches the six references of Q01), what is proved by this run and what only by CI (the native image through the Native job, the end-to-end browser suite untouched), and the four deferred items DEF-1 to DEF-4 as texts ready to paste as issues, not filed'
        - 'prg-0221-query-impact.md Findings holds the output of any gate that did not pass first time and what was done'
      verification:
        - './mvnw verify -DskipITs=false exits 0 with JDK 25 (CON-1), then ./mvnw test-compile pmd:check exits 0'
        - 'npm run test:unit, npm run format:check and npm run lint each exit 0'
        - 'npm run sample:build leaves git status --short unchanged'
        - 'java -jar target/quarkus-app/quarkus-run.jar query impact nowhere -w docs/architecture/.archicode.yaml prints one line starting error: on the error output and exits 1; the same with --depth 0 and with --depth -1; query impact archicode.kernel.engine -w docs/architecture/.archicode.yaml --depth 1 --qualifier calls --qualifier "generated from" reaches the six references of Q01'
        - 'scripts/byte-identity.sh exits 0 with 0 DIFFERENT and the self-check ok; if the base cannot be built here, the run record says it was not run and why'
        - 'git diff --stat shows nothing under src/main/editor, scripts/byte-identity.sh and scripts/byte-identity-stdout-changes.txt that this run changed (the harness is untouched, DEC-10), and nothing under .github, pom.xml or package.json'
      risk: 'low'
      confidence: 80
      human_review: 'after'
      escalation_triggers:
        - 'A gate fails for a reason outside the files this run changed (a base that was already red: record it, do not fix it, and do not report success)'
        - 'The harness reports a DIFFERENT for an existing command (an existing output moved: find the cause in task-003, do not declare an exception for it)'
      delegation_tier: 'standard'
      results: 'tier standard, model sonnet, effort medium, profile low-cost, passed first time, inline (leaf), independently verified'
```

## 5. Parallelization Plan

```yaml
parallelization_plan:
  groups: []
  notes:
    - 'No group: the chain is serial. Every task that runs mvnw shares one target directory and one Maven build, and tasks 007 to 009 are checked against the command as tasks 003 and 004 leave it. The tasks share no likely_files, so nothing blocks a later wave from running tasks 005 and 006 together on separate checkouts.'
```

## 6. Human Review Gates

```yaml
human_review_gates:
  gates:
    - id: gate-001
      trigger: 'The wave pull request that holds this run (one pull request per wave, one commit per run); the plan authorises no commit, push, merge, tag or issue'
      required_before: []
      required_after: ['task-010']
      reviewer_focus:
        - 'The nine questions of the oracle answered by the command and equal to the old walk, Q01 to Q07 unchanged against ff3bacd'
        - 'The one error: line on an unknown start and on --depth 0 and --depth -1'
        - 'The guide, the manual section and the pointers say the containment rule and the options the command has'
        - 'The run record says that the native image and the end-to-end suite are proved by CI and not by this run'
```

## 7. Risk Assessment

```yaml
risk_assessment:
  by_task:
    - id: task-001
      risk: 'low'
      rationale: 'Edits one design document; no product file.'
    - id: task-002
      risk: 'medium'
      rationale: 'A port of a walk whose edge-order rule decides a set in a corner (RISK-2); the nine questions and ImpactTest pin it.'
    - id: task-003
      risk: 'medium'
      rationale: 'A new command, a static change of a method that query graph calls, a reflection list for the native image (RISK-3, RISK-4, RISK-5); no output of another command may move.'
    - id: task-004
      risk: 'medium'
      rationale: 'The oracle of the model changes its asker; two implementations must agree on nine questions (RISK-1).'
    - id: task-005
      risk: 'low'
      rationale: 'A short paragraph and a golden, held by GuideTest and its budget (RISK-6).'
    - id: task-006
      risk: 'low'
      rationale: 'An integration test; it changes no product file.'
    - id: task-007
      risk: 'low'
      rationale: 'Manual text, with one generated block and examples that a test runs.'
    - id: task-008
      risk: 'low'
      rationale: 'One paragraph of CLAUDE.md, one bullet, one sentence of the site; a diff check guards the one-paragraph promise.'
    - id: task-009
      risk: 'low'
      rationale: 'One qualifier in the model and a generated bundle.'
    - id: task-010
      risk: 'low'
      rationale: 'Runs commands and writes the record; changes no product file.'
  by_area:
    - area: 'api'
      risk: 'medium'
      rationale: 'A new command and a JSON shape that clients read; additive, no existing output changes (CON-2).'
    - area: 'infra'
      risk: 'low'
      rationale: 'reflect-config.json for the native image, proved by CI and not by this run (RISK-5).'
    - area: 'docs'
      risk: 'low'
      rationale: 'The guide, the manual, two CLAUDE.md files, the site and the model.'
    - area: 'security'
      risk: 'low'
      rationale: 'The command reads the workspace of the user and prints to the standard output; it writes no file (TDD Security and Privacy).'
```

## 8. Confidence Assessment

```yaml
confidence_assessment:
  by_task:
    - id: task-001
      score: 80
      rationale: 'Ten findings, each specified; the two with a choice (gap-002, gap-004) are decided in the gaps above.'
    - id: task-002
      score: 78
      rationale: 'The old walk is the specification and is in the repository; the corner case of edge order is pinned, not guessed.'
    - id: task-003
      score: 75
      rationale: 'Picocli reading --depth -1 is the one unknown (ASM-4) and the task says what to do either way; the static change is small.'
    - id: task-004
      score: 75
      rationale: 'The mapping of through to arguments is written in DEC-4; two walks agreeing is a strong signal and a disagreement is found at once.'
    - id: task-005
      score: 80
      rationale: 'A short paragraph; the golden is regenerated by the documented way.'
    - id: task-006
      score: 78
      rationale: 'A sibling test shows the pattern; building the jar may not work in every environment.'
    - id: task-007
      score: 78
      rationale: 'Text plus two generated or checked parts; the generator is the test and must be read.'
    - id: task-008
      score: 82
      rationale: 'Small edits checked by grep and by a diff count.'
    - id: task-009
      score: 85
      rationale: 'One qualifier and a script the repository already has.'
    - id: task-010
      score: 80
      rationale: 'Commands with known expected results; the byte-identity base may not be buildable here.'
```

## 9. Agent Assignment Plan

```yaml
agent_assignment_plan:
  assignments:
    - task_id: task-001
      agent_role: 'Architecture Agent'
      objective: 'Apply the Stage 5 findings to the TDD as gap-001 to gap-007 of this plan state them, without editing anything but the TDD.'
      context:
        prd_excerpts:
          - 'No PRD (profile TDD+pln): REQ-1 to REQ-11 as labelled in the TDD, from the manifest of wave 031 and #187'
        tdd_excerpts:
          - 'DEC-1, DEC-3, DEC-4, DEC-6, ASM-3, ASM-5, IMP-2, IMP-3, IMP-4, CTR-1, RISK-4, Deferred Work'
      likely_files:
        - 'docs/wav/wav-031-graph-answers-impact/run/run-0221-query-impact/tdd-0221-query-impact.md'
      acceptance_criteria:
        - 'Each finding is applied or the Findings of the prg says why not'
        - 'The TDD keeps its sections and ids; no decision beyond the gaps of this plan'
      verification:
        - 'grep -c "Via record\|Impact\$Via" on the TDD prints 0 outside a sentence that says there is none, and grep -q "requireDepth" on the TDD succeeds'
        - 'grep -q "Impact\$Direction" on the TDD succeeds and grep -q "is ignored" on the TDD succeeds'
        - 'grep -c "^- `Q-[1-4]` (resolved" on the TDD still prints 4 and the sections and ids IMP-1 to IMP-11, CTR-1 to CTR-3 and REQ-1 to REQ-11 are all still present (grep -c on each prefix)'
        - 'git diff --stat -- src scripts .github pom.xml package.json docs/architecture prints nothing for the paths this task owns (the uncommitted work of the wave stays as it was)'
      escalation_triggers:
        - 'A finding contradicts the repository when read'
      suggested_subagent_type: 'general-purpose'
      suggested_model: '(default)'
      suggested_effort: 'medium'
    - task_id: task-002
      agent_role: 'Backend Implementation Agent'
      objective: 'Write ImpactTest first, then workspace/Impact as the walk of ArchitectureImpactTest.impact with via, --qualifier and --through, a plain class over plain inputs.'
      context:
        prd_excerpts:
          - 'REQ-8 plain class, direction, depth, qualifier, containment, each element once at its shortest distance, sorted by distance then reference'
          - 'REQ-3 a depth of 0 or below is refused with one error: line'
        tdd_excerpts:
          - 'DEC-1, DEC-3, DEC-4, DEC-6, DEC-7 and the diagram of the walk'
      likely_files:
        - 'src/main/java/io/morin/archicode/workspace/Impact.java'
        - 'src/test/java/io/morin/archicode/workspace/ImpactTest.java'
        - 'src/test/java/io/morin/archicode/doc/ArchitectureImpactTest.java'
        - 'src/main/java/io/morin/archicode/workspace/Fold.java'
      acceptance_criteria:
        - 'ImpactTest was red before Impact existed and is green after'
        - 'Impact imports no Picocli, no CDI, no Workspace and no mapper'
      verification:
        - './mvnw -o test -Dtest=ImpactTest exits 0 with JDK 25 (CON-1); it was red before Impact existed'
        - 'grep -c "picocli\|jakarta\|import io.morin.archicode.workspace.Workspace\|ObjectMapper" src/main/java/io/morin/archicode/workspace/Impact.java prints 0'
        - 'npx prettier --check src/main/java/io/morin/archicode/workspace/Impact.java src/test/java/io/morin/archicode/workspace/ImpactTest.java exits 0'
        - './mvnw -o test -Dtest=FoldTest exits 0 (the neighbouring plain class of the package still compiles and passes)'
      escalation_triggers:
        - 'A rule of DEC-3 cannot be written the way the old walk behaves'
      suggested_subagent_type: 'general-purpose'
      suggested_model: '(default)'
      suggested_effort: 'medium'
    - task_id: task-003
      agent_role: 'Backend Implementation Agent'
      objective: 'Write the thin command ImpactQuery over GetGraphQuery.buildGraph made static, register it in QueryGroup and in reflect-config.json, and pin its options, its JSON and its refusals in ImpactQueryTest.'
      context:
        prd_excerpts:
          - 'REQ-8 one JSON line with start, direction, depth, reached; REQ-3 one error: line; REQ-4 the native image names the classes; REQ-9 --through deployments'
        tdd_excerpts:
          - 'DEC-2, DEC-4, DEC-5, DEC-6, CTR-1, CTR-2, IMP-2, IMP-3, IMP-4, ASM-4, ASM-5, FLOW-1, FLOW-2'
      likely_files:
        - 'src/main/java/io/morin/archicode/cli/ImpactQuery.java'
        - 'src/main/java/io/morin/archicode/cli/QueryGroup.java'
        - 'src/main/java/io/morin/archicode/cli/GetGraphQuery.java'
        - 'src/main/java/io/morin/archicode/cli/FoldCommand.java'
        - 'src/main/java/io/morin/archicode/cli/OutputFormatConverter.java'
        - 'src/main/java/io/morin/archicode/cli/CommandLineConfiguration.java'
        - 'src/main/resources/META-INF/native-image/io.morin.archicode/archicode/reflect-config.json'
        - 'src/test/java/io/morin/archicode/cli/ImpactQueryTest.java'
        - 'src/test/java/io/morin/archicode/cli/GetGraphQueryTest.java'
      acceptance_criteria:
        - 'No output of query graph changes'
        - 'The refusals are one error: line with exit 1 and nothing on the standard output'
      verification:
        - './mvnw -o test -Dtest=ImpactQueryTest,GetGraphQueryTest,ImpactTest exits 0 with JDK 25 (CON-1)'
        - 'grep -c "static Graph buildGraph\|static void collect" src/main/java/io/morin/archicode/cli/GetGraphQuery.java prints 2 and grep -c "getGraphQuery.buildGraph" src/test/java/io/morin/archicode/cli/GetGraphQueryTest.java prints 0'
        - 'grep -c "ImpactQuery\|Impact\$Result\|Impact\$Reached\|Impact\$Edge\|Impact\$Direction" src/main/resources/META-INF/native-image/io.morin.archicode/archicode/reflect-config.json prints at least 5'
        - './mvnw -o test -Dtest=ArchitectureModelTest,ArchitectureDriftTest exits 0 (nothing under docs/architecture moved)'
        - 'npx prettier --check on the four Java files this task writes or edits exits 0'
      escalation_triggers:
        - 'Picocli reads --depth -1 as an option and the gate cannot hold'
        - 'A reference is not unique across the two layers'
      suggested_subagent_type: 'general-purpose'
      suggested_model: '(default)'
      suggested_effort: 'medium'
    - task_id: task-004
      agent_role: 'Test Generation Agent'
      objective: 'Make ArchitectureImpactTest ask the command for Q01 to Q09, compare with expect and with the old walk, and keep the three sabotage tests on the walk.'
      context:
        prd_excerpts:
          - 'REQ-2 Q01 to Q07 answered through the command with their expect lists of ff3bacd; REQ-9 Q08 and Q09 use --through deployments'
        tdd_excerpts:
          - 'DEC-4, DEC-5, CON-5, CTR-3, IMP-5, IF-3, FLOW-3'
      likely_files:
        - 'src/test/java/io/morin/archicode/doc/ArchitectureGraph.java'
        - 'src/test/java/io/morin/archicode/doc/ArchitectureImpactTest.java'
        - 'src/test/javascript/architecture/impact-questions.json'
      acceptance_criteria:
        - 'Nine green questions by the command and by the walk'
        - 'impact-questions.json is not changed by this task'
      verification:
        - './mvnw -o test -Dtest=ArchitectureImpactTest exits 0 with JDK 25 (CON-1): nine questions green by the command and by the walk'
        - 'node -e comparing the first seven objects of the questions in the working tree with those of git show ff3bacd:src/test/javascript/architecture/impact-questions.json (JSON.stringify of each) exits 0, and git diff --stat -- src/test/javascript/architecture/impact-questions.json shows no line added by this task'
        - 'npx prettier --check src/test/java/io/morin/archicode/doc/ArchitectureGraph.java src/test/java/io/morin/archicode/doc/ArchitectureImpactTest.java exits 0'
      escalation_triggers:
        - 'The command and the walk disagree on a question'
      suggested_subagent_type: 'general-purpose'
      suggested_model: '(default)'
      suggested_effort: 'medium'
    - task_id: task-005
      agent_role: 'Documentation Agent'
      objective: 'Name query impact, its options and the containment rule in the guide, regenerate the golden the documented way and make GuideTest fail when an option is missing from the guide.'
      context:
        prd_excerpts:
          - 'REQ-1 the guide names the command, every option and the containment rule; GuideTest passes with the golden regenerated'
        tdd_excerpts:
          - 'DEC-8, ASM-6, RISK-6, IMP-6'
      likely_files:
        - 'src/main/resources/guide/guide.md'
        - 'src/test/resources/guide/golden.md'
        - 'src/test/java/io/morin/archicode/cli/GuideTest.java'
      acceptance_criteria:
        - 'The paragraph is under 2 KB and the 30 KB budget holds'
        - 'The golden is not edited by hand'
      verification:
        - './mvnw -o test -Dtest=GuideTest,GuideCorpusTest exits 0 with JDK 25 (CON-1), the 30 KB budget holds'
        - 'grep -c "query impact" src/main/resources/guide/guide.md and src/test/resources/guide/golden.md are not 0 and each of --direction, --depth, --qualifier, --through, --plateau appears in both'
        - 'The new case fails when one option is removed from a copy of the guide (the test is read for that, or a throw-away edit run and reverted by the agent in the same task)'
        - 'npx prettier --check src/test/java/io/morin/archicode/cli/GuideTest.java exits 0'
      escalation_triggers:
        - 'The golden cannot be regenerated by the documented way'
      suggested_subagent_type: 'general-purpose'
      suggested_model: '(default)'
      suggested_effort: 'medium'
    - task_id: task-006
      agent_role: 'Test Generation Agent'
      objective: 'Write ImpactIT next to AgentWalkIT: query impact on the packaged application, an answer, --through deployments, an unknown reference and --depth 0.'
      context:
        prd_excerpts:
          - 'REQ-4 an integration test runs query impact on the packaged jar'
        tdd_excerpts:
          - 'IMP-7, RISK-5, CON-3'
      likely_files:
        - 'src/test/java/io/morin/archicode/it/ImpactIT.java'
        - 'src/test/java/io/morin/archicode/it/AgentWalkIT.java'
        - 'src/test/java/io/morin/archicode/it/Shipped.java'
        - 'src/main/java/io/morin/archicode/workspace/Impact.java'
        - 'src/test/java/io/morin/archicode/doc/ArchitectureGraph.java'
      acceptance_criteria:
        - 'ImpactIT passes on the packaged jar'
        - 'PMD reports no violation on src/main/java and src/test/java'
      verification:
        - './mvnw -o verify -DskipITs=false -Dit.test=ImpactIT -Dtest=ImpactTest,ImpactQueryTest,NativeReflectionConfigTest -Dsurefire.failIfNoSpecifiedTests=false -Djacoco.skip=true exits 0 with JDK 25 (CON-1; -Djacoco.skip=true because the 90 % coverage rule of verify cannot hold on a restricted test set) and the log names ImpactIT as run; the other unit tests are not part of this check (CommandReferenceTest fails until task-007 writes the manual listing of query impact)'
        - './mvnw -o test-compile pmd:check exits 0 with JDK 25; two LooseCoupling violations left by earlier tasks are fixed here by declaring the interface type: ArrayDeque at workspace/Impact.java:180 and TreeSet at doc/ArchitectureGraph.java:68 (no behaviour change; ImpactTest and ArchitectureImpactTest still pass)'
        - 'npx prettier --check src/test/java/io/morin/archicode/it/ImpactIT.java exits 0'
        - 'Not verified here: under -Dnative (the Native job of CI proves it)'
      escalation_triggers:
        - 'The packaged jar cannot be built here'
      suggested_subagent_type: 'general-purpose'
      suggested_model: '(default)'
      suggested_effort: 'medium'
    - task_id: task-007
      agent_role: 'Documentation Agent'
      objective: 'Write the manual section Query impact, update the how-to Work with an agent and the note of the release 0.24, and let CommandReferenceTest regenerate the command reference.'
      context:
        prd_excerpts:
          - 'REQ-7 the manual has a section for query impact; REQ-10 the how-to and a note of the release'
        tdd_excerpts:
          - 'DEC-3, DEC-4, DEC-8, CON-7, RISK-7, IMP-10'
      likely_files:
        - 'src/doc/README.adoc'
        - 'src/test/java/io/morin/archicode/doc/CommandReferenceTest.java'
        - 'src/test/java/io/morin/archicode/doc/ManualExamplesTest.java'
        - 'src/test/javascript/manual-howto.test.js'
      acceptance_criteria:
        - 'The example call in the manual gives the answer the command prints'
        - 'The generated block is written by the test, not by hand'
      verification:
        - './mvnw -o test -Dtest=CommandReferenceTest,ManualExamplesTest exits 0 with JDK 25 (CON-1)'
        - 'grep -c "=== Query impact" src/doc/README.adoc prints 1 and grep -c "\[\[query-impact\]\]" prints 1 and grep -c "query impact" in the upgrade-0-24 section is not 0'
        - 'node --test src/test/javascript/manual-howto.test.js exits 0'
      escalation_triggers:
        - 'The command reference is not regenerated by CommandReferenceTest alone'
      suggested_subagent_type: 'general-purpose'
      suggested_model: '(default)'
      suggested_effort: 'medium'
    - task_id: task-008
      agent_role: 'Documentation Agent'
      objective: 'Tell an agent to run query impact in the root CLAUDE.md paragraph, the workspace CLAUDE.md, the section agents of the site and llms.txt, with the diff of the root CLAUDE.md limited to that paragraph.'
      context:
        prd_excerpts:
          - 'REQ-5 the site and llms.txt name the command; REQ-6 CLAUDE.md tells to run it and its diff touches that paragraph only'
        tdd_excerpts:
          - 'DEC-11, CON-8, IMP-8, IMP-9'
      likely_files:
        - 'CLAUDE.md'
        - 'src/main/java/io/morin/archicode/workspace/CLAUDE.md'
        - 'src/site/index.html'
        - 'src/site/llms.txt'
        - 'src/test/javascript/site.test.js'
      acceptance_criteria:
        - 'git diff -U0 -- CLAUDE.md has one hunk'
        - 'No wave, run or issue id and no date in the added lines of a CLAUDE.md'
      verification:
        - 'git diff -U0 -- CLAUDE.md | grep -c "^@@" prints 1'
        - 'git diff -U0 -- CLAUDE.md src/main/java/io/morin/archicode/workspace/CLAUDE.md | grep "^+" | grep -ciE "wave|run [0-9]|run-|#[0-9]|20[0-9][0-9]-" prints 0'
        - 'grep -c "query impact" src/site/index.html src/site/llms.txt are not 0 in both'
        - 'node --test src/test/javascript/site.test.js exits 0'
      escalation_triggers:
        - 'site.test.js pins a sentence the new text breaks'
      suggested_subagent_type: 'general-purpose'
      suggested_model: '(default)'
      suggested_effort: 'medium'
    - task_id: task-009
      agent_role: 'Documentation Agent'
      objective: 'Add the qualifier query impact to the relationship of agent to archicode.commandline and rebuild the sample bundle.'
      context:
        prd_excerpts:
          - 'REQ-10 docs/architecture kept true, npm run sample:build if it changes'
        tdd_excerpts:
          - 'DEC-11, CI-arc-1, IMP-11'
      likely_files:
        - 'docs/architecture/manifests/agent.yaml'
        - 'src/main/resources/editor-webapp/samples/archicode.yaml'
      acceptance_criteria:
        - 'A second npm run sample:build changes nothing'
      verification:
        - './mvnw -o test -Dtest=ArchitectureModelTest,ArchitectureDriftTest,ArchitectureImpactTest exits 0 with JDK 25 (CON-1)'
        - 'grep -c "query impact" docs/architecture/manifests/agent.yaml prints 1'
        - 'npm run sample:build run a second time leaves git status --short as it was after the first run'
        - 'node --test on the test that checks the samples are the bundles of their folders (read package.json for its name) exits 0'
      escalation_triggers:
        - 'npm run sample:build changes a file other than the bundle of the architecture sample'
      suggested_subagent_type: 'general-purpose'
      suggested_model: 'haiku'
      suggested_effort: 'low'
    - task_id: task-010
      agent_role: 'QA Agent'
      objective: 'Run every gate of the TDD, probe the packaged application, and write the run record: what is proved by this run, what only by CI, and the four deferred items as texts to paste.'
      context:
        prd_excerpts:
          - 'REQ-1 to REQ-7 as the gates of P2; REQ-11 the editor, the harness and the oracle questions are not changed by the wave'
        tdd_excerpts:
          - 'Observability and Verification, DEC-10, Deferred Work'
      likely_files:
        - 'docs/wav/wav-031-graph-answers-impact/run/run-0221-query-impact/run-0221-query-impact.md'
        - 'docs/wav/wav-031-graph-answers-impact/run/run-0221-query-impact/prg-0221-query-impact.md'
      acceptance_criteria:
        - 'Every gate command is run and its exit is in the run record; a gate not run is said not run, with the reason'
        - 'The record names the native image and the end-to-end suite as not verified by this run'
      verification:
        - './mvnw verify -DskipITs=false exits 0 with JDK 25 (CON-1), then ./mvnw test-compile pmd:check exits 0'
        - 'npm run test:unit, npm run format:check and npm run lint each exit 0'
        - 'npm run sample:build leaves git status --short unchanged'
        - 'java -jar target/quarkus-app/quarkus-run.jar query impact nowhere -w docs/architecture/.archicode.yaml prints one line starting error: on the error output and exits 1; the same with --depth 0 and with --depth -1; query impact archicode.kernel.engine -w docs/architecture/.archicode.yaml --depth 1 --qualifier calls --qualifier "generated from" reaches the six references of Q01'
        - 'scripts/byte-identity.sh exits 0 with 0 DIFFERENT and the self-check ok; if the base cannot be built here, the run record says it was not run and why'
        - 'git diff --stat shows nothing under src/main/editor, scripts/byte-identity.sh and scripts/byte-identity-stdout-changes.txt that this run changed (the harness is untouched, DEC-10), and nothing under .github, pom.xml or package.json'
      escalation_triggers:
        - 'A gate fails for a reason outside the files this run changed'
        - 'The harness reports a DIFFERENT for an existing command'
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
        - 'git diff --stat on the paths the task must not touch'
      success_criteria:
        - 'Every finding is in the TDD, its sections and ids are intact'
    - task_id: task-002
      methods:
        - 'unit tests (ImpactTest)'
        - 'format check'
        - 'grep of the imports of Impact'
      success_criteria:
        - 'ImpactTest green after being red; Impact is plain'
    - task_id: task-003
      methods:
        - 'unit tests (ImpactQueryTest, GetGraphQueryTest, ImpactTest)'
        - 'regression check (ArchitectureModelTest, ArchitectureDriftTest)'
        - 'grep of reflect-config.json'
      success_criteria:
        - 'The command answers, refuses with one line, and no output of query graph moved'
    - task_id: task-004
      methods:
        - 'contract test (ArchitectureImpactTest)'
        - 'node comparison of Q01 to Q07 with the commit ff3bacd'
      success_criteria:
        - 'Nine questions green by the command and by the walk; Q01 to Q07 unchanged'
    - task_id: task-005
      methods:
        - 'unit tests (GuideTest, GuideCorpusTest)'
      success_criteria:
        - 'The guide names the command and every option; the golden is the regenerated one; the budget holds'
    - task_id: task-006
      methods:
        - 'integration tests (ImpactIT on the packaged jar)'
      success_criteria:
        - 'ImpactIT passes; the native run is left to CI and said so'
    - task_id: task-007
      methods:
        - 'unit tests (CommandReferenceTest, ManualExamplesTest)'
        - 'node test (manual-howto.test.js)'
      success_criteria:
        - 'The manual section exists, its example runs, the command reference is the program text'
    - task_id: task-008
      methods:
        - 'node test (site.test.js)'
        - 'git diff hunk count on CLAUDE.md'
      success_criteria:
        - 'One paragraph changed in the root CLAUDE.md; the site names the command'
    - task_id: task-009
      methods:
        - 'unit tests (ArchitectureModelTest, ArchitectureDriftTest, ArchitectureImpactTest)'
        - 'second run of npm run sample:build'
      success_criteria:
        - 'The sample is the bundle of its folder'
    - task_id: task-010
      methods:
        - 'full verify with the integration tests'
        - 'static analysis (pmd:check)'
        - 'format check and lint'
        - 'probes of the packaged application'
        - 'regression check (byte-identity harness)'
      success_criteria:
        - 'Every gate exits 0 or the record says it was not run and why; no existing output moved'
```

## 11. Escalation Rules

```yaml
escalation_rules:
  rules:
    - condition: 'A finding or a rule of the TDD contradicts the repository as read'
      action: 'Follow the repository, write the reading in the Findings of the prg, and continue'
    - condition: 'The command answers a question of the oracle differently from the old walk or from expect'
      action: 'Fix Impact, never the expect list of Q01 to Q07 (CON-5); a disagreement that stays after one retry is a blocker logged in the prg'
    - condition: 'An output of an existing command changes (GetGraphQueryTest, the golden of another command, the harness)'
      action: 'Revert the part that caused it and escalate; no exception is declared in scripts/byte-identity-stdout-changes.txt for it'
    - condition: 'Picocli or Jackson behaves otherwise than ASM-4 or ASM-5 says'
      action: 'Pin the real behaviour in the test, write it in the manual, log a finding, and do not widen the design'
    - condition: 'A gate cannot be run in this environment (the packaged jar, the byte-identity base, the network)'
      action: 'Say so in the run record with the reason; never report it as passed'
    - condition: 'A step would commit, push, merge, tag, publish or file an issue'
      action: 'Do not do it: it is a human step outside the plan'
    - condition: 'Confidence of a task falls below 60 or a product decision is missing'
      action: 'Stop the task, log the blocker in the prg and return it to the main agent'
```

## 12. Final Execution Manifest

```yaml
execution_manifest:
  status: 'done'
  recommendation: 'proceed'
  autonomy_level: 'high'
  total_tasks: 10
  autonomous_tasks: 10
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
    - task-007
    - task-008
    - task-009
    - task-010
  parallel_groups: []
  required_human_gates:
    - gate-001
  highest_risk_tasks:
    - task-003
    - task-002
    - task-004
  lowest_confidence_tasks:
    - task-003
    - task-004
    - task-002
  next_action: 'Run task-001: amend the TDD with the Stage 5 findings as gap-001 to gap-007 state them, then task-002.'
  criteria:
    - 'Every criterion of the Executive Summary holds, checked by the commands of section 10'
    - 'The run record says what is proved by this run and what only by CI'
```
