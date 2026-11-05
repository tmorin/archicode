---
title: Execution Plan — Deployments in query graph, and the oracle that crosses them
status: done
date: 2026-11-04
related:
  - docs/wav/wav-031-graph-answers-impact/run/run-0220-graph-deployments/tdd-0220-graph-deployments.md
  - docs/wav/wav-031-graph-answers-impact/wav-031-graph-answers-impact.md
  - docs/wav/wav-031-graph-answers-impact/wbc-031-graph-answers-impact.md
  - src/main/java/io/morin/archicode/cli/GetGraphQuery.java
  - scripts/byte-identity-stdout-changes.txt
  - https://github.com/tmorin/archicode/issues/189
type: pln
run: 0220
wave: 031
---

# Execution Plan: Deployments in query graph, and the oracle that crosses them

Profile TDD+pln: there is no PRD, so REQ-1 to REQ-8 are the IDs the TDD labels (section "PRD Traceability"), taken from row W-2 and gate P1 of the wave manifest and from #189. The plan follows the TDD plus the Stage 5 review findings F1 to F9 (progress log, Stage 5 line: nine findings, three S2, five S1, one S0), which the TDD has not absorbed: task-001 amends the TDD with them before any test is written. Where the TDD and a finding differ, the finding wins. The ones that change work: F3 (the check for a missing `deployments` lives in the walk of the oracle only, not in `ArchitectureGraph.load`), F4 (`src/test/CLAUDE.md` is left out, the self-check sample for `query graph` is decided), F6 (the order of `deployments` is asserted in `GetGraphQueryTest` only, plus the existing determinism test) and F9 (a node nested in a node has a test, or the sentence of CTR-1 goes).

Three chains run on disjoint files. The command chain is test first: task-002 writes the cases of `GetGraphQueryTest`, red; task-004 writes `deployments` in `GetGraphQuery` and its native entries and turns them green. The oracle chain: task-003 writes `through`, Q08, Q09 and the nine-question gate in `ArchitectureImpactTest` and `impact-questions.json`; it is red until task-004 prints `deployments`, and task-004 turns it green. The harness chain, task-005, adds the second rule to `scripts/byte-identity-stdout-changes.txt` and the `query graph` sample to the self-check. The manual, the guide and its golden (task-006) follow the command and the harness. The last task runs every gate and writes the run record.

This run operates under the autonomy override of `complete-run` (read before Stage 10): no task stops for a human on its category alone. No task is `human_required` or `critical`, so the override changes no route; the one output-changing task (task-004) is `review_after` and the author reviews it at the pull request. Nothing in this plan commits, pushes, merges or tags: those are human steps outside the plan; the TDD says one commit with the harness rule and the goldens in it, which the main agent makes after the gates.

Environment for every Maven command: `export JAVA_HOME=$(ls -d ~/.sdkman/candidates/java/25* | head -1)` (CON-1; the shell's `java` is 21).

## 1. Executive Summary

```yaml
summary:
  status: 'pending'
  product_goal: 'archicode query graph prints a top-level deployments list (which node hosts which application) so a client and the impact oracle can answer deployment questions from one flat list, with no change of output for a workspace that has no deployment (#189).'
  technical_approach: 'Amend the TDD with the Stage 5 findings, write the GetGraphQueryTest cases red, add the through key, Q08 and Q09 and the nine-question gate to the oracle, build DeploymentEntry in GetGraphQuery.collect from Node.applications (absent when empty, last key, hosted application copied not resolved) with its two reflect-config entries, declare the change in scripts/byte-identity-stdout-changes.txt with a query graph sample in the self-check, write the manual, the upgrade note and the guide sentence with its golden, then run the gates including the full byte-identity run against archicode-0.19.0.'
  total_tasks: 7
  parallel_groups: 1
  high_risk_tasks: 0
  human_review_gates: 1
  autonomy_level: 'medium'
  recommendation: 'proceed_with_review'
  criteria:
    - 'query graph on docs/architecture/.archicode.yaml prints a top-level deployments that holds {"node":"github.actions","application":"archicode.commandline"} and {"node":"github.actions","application":"archicode.editor"}, as the last key; the output for a workspace made by archicode init has no deployments key (REQ-1)'
    - 'scripts/byte-identity.sh exits 0 with the change declared, reports nothing as DIFFERENT, and its self-check says ok with a query graph sample accepted and a changed elements refused (REQ-2)'
    - 'impact-questions.json holds 9 questions, Q08 and Q09 with exact expect lists and through deployments, Q01 to Q07 unchanged against ff3bacd, and ArchitectureImpactTest passes, including a sabotage case that fails the two questions when deployments is removed (REQ-3, REQ-7)'
    - 'The manual says deployments in Query graph and has the upgrade note, and ./mvnw test -Dtest=ManualExamplesTest exits 0 (REQ-4)'
    - './mvnw test exits 0 and ./mvnw test-compile pmd:check exits 0 (REQ-5)'
    - 'GetGraphQueryTest pins the shape, the order, the empty case and the last position of the key (REQ-6)'
    - 'No deployments among relationships, no change to Node.applications, no editor change, no question beyond Q08 and Q09 (REQ-8)'
    - 'npm run format:check, npm run lint and npm run test:unit exit 0, and npm run sample:build leaves git status --short unchanged (CON-6, CON-7)'
```

## 2. PRD/TDD Consistency Assessment

```yaml
consistency_assessment:
  aligned_items:
    - 'Scope, REQ-1 to REQ-8, DEC-1 to DEC-7, CTR-1 to CTR-3 and IMP-1 to IMP-6 agree with row W-2 and gate P1 of the wave manifest; every task below traces to them'
    - 'Q-1 and Q-2 of the TDD are resolved; no open question remains'
    - 'Stage 9 scan: every ID in source_requirements (REQ-1 to REQ-8, ASM, CON, DEC, CTR, IF, IMP, FLOW, RISK, Q-1, the Review and Observability sections) exists in the TDD; no task invents scope; every likely_files and produces path exists today or is created by the task; the sources of the sed rule, the self-check function stdout_accepted, the label form "<name>: query graph", the option --only and --no-build, the example domain_workspace, the commit ff3bacd and Q01 to Q07 of impact-questions.json were read in the repository'
    - 'The current state quoted by the TDD (GetGraphQuery.buildGraph and collect, Node.applications as a LinkedHashSet, Q01 to Q07 in impact-questions.json, the stdout-changes file with one rule for query views, [[upgrade-0-24]] as the latest block, guide.md line 19) matches the files read at the Stage 5 review'
  gaps:
    - id: gap-001
      type: contradiction
      description: 'Stage 5 F1 (S2): ASM-5, DEC-3, IF-1 and Q-1 say a dangling hosted application never fails query graph. With plateaus LayerLoader already fails on it at the load.'
      impact: 'medium'
      recommendation: 'task-001 scopes the claim to a workspace with no plateau and says the test of DEC-3 uses such a workspace; task-002 writes that case on a workspace without plateau.'
    - id: gap-002
      type: contradiction
      description: 'Stage 5 F2 (S2): REQ-6 says BrightcartStableOutputTest moves where it asserts, while ASM-3 and RISK-6 say no golden holds a graph.'
      impact: 'low'
      recommendation: 'task-001 rewords REQ-6 to the assertions that are added (none in BrightcartStableOutputTest after F6) and keeps ASM-3 and RISK-6; the full suite in task-004 proves no golden moves.'
    - id: gap-003
      type: ambiguity
      description: 'Stage 5 F3 (S2): IMP-4 gives ArchitectureGraph.load a check for deployments and FLOW-2 gives the walk the same check.'
      impact: 'medium'
      recommendation: 'task-001 keeps FLOW-2 only: the walk with through fails with the message that says deployments is missing; load is not changed beyond reading the optional key; Q08 and Q09 carry the assertion that the model has deployments.'
    - id: gap-004
      type: ambiguity
      description: 'Stage 5 F4 to F9 (S1, S0): IMP-3 hedges on a line of src/test/CLAUDE.md and on the self-check; DEC-4 argues from descriptions followed by more keys; the order of deployments is asserted in three places; the 0.24.0 intro sentence "every other command writes what 0.24.0 wrote for it" becomes false; ASM-2 is a fact with a fallback; a node nested in a node is not read.'
      impact: 'low'
      recommendation: 'task-001 applies each as the review states it (src/test/CLAUDE.md out, the query graph self-check sample decided, the escaped-quote argument, GetGraphQueryTest alone for the order, IMP-6 changes both sentences of the intro, ASM-2 a statement, CTR-1 nested sentence kept only with the test of task-002).'
    - id: gap-005
      type: risk
      description: 'The sed rule of DEC-4 depends on deployments being the last key of a one-line object; a later key added by another run would make the harness report a difference.'
      impact: 'medium'
      recommendation: 'task-002 pins the last position in GetGraphQueryTest; task-005 proves the rule on a real query graph output with the rebuilt jar in task-007.'
    - id: gap-006
      type: risk
      description: 'The full byte-identity run builds archicode-0.19.0 with a JDK 25 offline and takes several minutes; the base may already be cached in ~/.cache/archicode-byte-identity/archicode-0.19.0.'
      impact: 'medium'
      recommendation: 'task-005 runs the script with --only for a quick check without a rebuild; task-007 runs the whole script once. If the base build fails for a reason the plan cannot change, task-007 records the exit and its output as not verified and does not report the REQ-2 criterion as met.'
    - id: gap-007
      type: risk
      description: 'Q09 depth 2 with direction both must not reach archicode.commandline by containment or by a path outside deployments (RISK-5); the expected lists were verified by hand at Stage 5 but not run.'
      impact: 'medium'
      recommendation: 'task-003 writes Q08 and Q09 with the TDD lists and the first run (red for lack of deployments) is followed by task-004 turning them green; a mismatch is fixed in the walk or in the list only after reading environment.github.yaml and environment.workstation.yaml again.'
    - id: gap-008
      type: ambiguity
      description: 'The new cases of GetGraphQueryTest and the oracle read deployments by JSON key, so they compile before DeploymentEntry exists and are red at run time; if a case needs the Java type, it does not compile and the red state is a compile error.'
      impact: 'low'
      recommendation: 'task-002 and task-003 read the printed JSON tree (a JsonNode) and not the Java class, so the red state is an assertion failure; the one case that calls buildGraph reads graph.getDeployments() only in task-004.'
    - id: gap-009
      type: contradiction
      description: 'Stage 9 (repository scan): the last self-check of scripts/byte-identity.sh (the line that calls stdout_accepted with the label "shop: query graph") asserts that a change of standard output is refused under a label no rule matches. Once task-005 adds a rule for query graph, that label matches a rule and the assertion no longer says what its message says (it would still pass, by accident of the sample, because the sed script does nothing on a sample with no deployments key).'
      impact: 'medium'
      recommendation: 'task-005 changes the label of that one assertion and of its message to a command no rule matches ("shop: query stories"), and adds the query graph samples as new assertions beside it.'
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
        - 'tdd-0220-graph-deployments.md amended'
      agent_role: 'Architecture Agent'
      autonomy: 'autonomous'
      risk: 'low'
      confidence: 84
    - id: task-002
      status: 'done'
      title: 'Write the cases of GetGraphQueryTest for deployments, red'
      depends_on: [task-001]
      produces:
        - 'src/test/java/io/morin/archicode/cli/GetGraphQueryTest.java'
      agent_role: 'Test Generation Agent'
      autonomy: 'autonomous'
      risk: 'medium'
      confidence: 76
    - id: task-003
      status: 'done'
      title: 'Teach the oracle through, Q08 and Q09, red'
      depends_on: [task-001]
      produces:
        - 'src/test/java/io/morin/archicode/doc/ArchitectureImpactTest.java'
        - 'src/test/java/io/morin/archicode/doc/ArchitectureGraph.java'
        - 'src/test/javascript/architecture/impact-questions.json'
      agent_role: 'Test Generation Agent'
      autonomy: 'autonomous'
      risk: 'medium'
      confidence: 72
    - id: task-004
      status: 'done'
      title: 'Build deployments in GetGraphQuery and turn the cases green'
      depends_on: [task-002, task-003]
      produces:
        - 'src/main/java/io/morin/archicode/cli/GetGraphQuery.java'
        - 'src/main/resources/META-INF/native-image/io.morin.archicode/archicode/reflect-config.json'
      agent_role: 'Backend Implementation Agent'
      autonomy: 'review_after'
      risk: 'medium'
      confidence: 80
    - id: task-005
      status: 'done'
      title: 'Declare the change of query graph in the harness, with its self-check sample'
      depends_on: [task-001]
      produces:
        - 'scripts/byte-identity-stdout-changes.txt'
        - 'scripts/byte-identity.sh'
      agent_role: 'Infrastructure Agent'
      autonomy: 'autonomous'
      risk: 'medium'
      confidence: 74
    - id: task-006
      status: 'done'
      title: 'Write the manual, the upgrade note and the guide sentence'
      depends_on: [task-004, task-005]
      produces:
        - 'src/doc/README.adoc'
        - 'src/main/resources/guide/guide.md'
        - 'src/test/resources/guide/golden.md'
      agent_role: 'Documentation Agent'
      autonomy: 'autonomous'
      risk: 'low'
      confidence: 82
    - id: task-007
      status: 'done'
      title: 'Run the gates, the full byte-identity run, and write the run record'
      depends_on: [task-004, task-005, task-006]
      produces:
        - 'run-0220-graph-deployments.md with the verification'
        - 'prg-0220-graph-deployments.md Findings with the gate output'
      agent_role: 'QA Agent'
      autonomy: 'autonomous'
      risk: 'low'
      confidence: 78
  edges:
    - from: task-001
      to: task-002
      reason: 'the cases are written against the amended TDD (scope of the dangling case, order asserted once)'
    - from: task-001
      to: task-003
      reason: 'the oracle follows FLOW-2 as amended by F3 (the check lives in the walk)'
    - from: task-001
      to: task-005
      reason: 'the rule is written with the argument and the self-check sample the amended TDD decides'
    - from: task-002
      to: task-004
      reason: 'the command is written to turn the red cases green'
    - from: task-003
      to: task-004
      reason: 'the oracle questions need the printed deployments to pass'
    - from: task-004
      to: task-006
      reason: 'the manual and the guide describe the command as it prints'
    - from: task-005
      to: task-006
      reason: 'the upgrade note names the declared change of the harness as written'
    - from: task-004
      to: task-007
      reason: 'the gates run on every changed file'
    - from: task-005
      to: task-007
      reason: 'the full byte-identity run needs the harness and the command together'
    - from: task-006
      to: task-007
      reason: 'ManualExamplesTest and GuideTest run on the documents as written'
```

## 4. Task Catalog

```yaml
task_catalog:
  tasks:
    - id: task-001
      title: 'Amend the TDD with the Stage 5 findings'
      source_requirements:
        prd:
          - 'REQ-6'
          - 'REQ-7'
        tdd:
          - 'ASM-2'
          - 'ASM-5'
          - 'DEC-3'
          - 'DEC-4'
          - 'IF-1'
          - 'IMP-2'
          - 'IMP-3'
          - 'IMP-4'
          - 'IMP-6'
          - 'CTR-1'
          - 'Q-1'
          - 'Review'
      outputs:
        - 'F1: ASM-5, DEC-3, IF-1 and Q-1 scope the no-failure claim to a workspace with no plateau, and say the test of DEC-3 uses such a workspace'
        - 'F2: REQ-6 no longer says BrightcartStableOutputTest moves'
        - 'F3: IMP-4 has no check in ArchitectureGraph.load; FLOW-2 alone carries the missing-deployments message'
        - 'F4: IMP-3 states the query graph sample of the self-check as decided and drops src/test/CLAUDE.md'
        - 'F5: DEC-4 argues from the escaped quotes of a JSON string'
        - 'F6: the order of deployments is asserted in GetGraphQueryTest only (IMP-2), with the existing determinism test'
        - 'F7: IMP-6 changes the two sentences of the intro of [[upgrade-0-24]]'
        - 'F8: ASM-2 states that MapperFactory.jsonMapper has NON_EMPTY, with no fallback'
        - 'F9: CTR-1 keeps the nested-node sentence only with a test case in IMP-2'
        - 'The Review section says the findings are applied'
      verification:
        - 'grep -c "JsonInclude" on the TDD prints 0'
        - 'grep -c "src/test/CLAUDE.md" on the TDD prints 0 in IMP-3 (the file may still be named in the Review section)'
        - 'grep -q "no plateau" on the TDD succeeds'
        - 'git diff --stat -- src scripts pom.xml package.json prints nothing beyond the files already modified at the start of the run (record the starting list first)'
      risk: 'low'
      confidence: 84
      human_review: 'none'
      escalation_triggers:
        - 'A finding contradicts the repository when read (follow the repository, write the reading in the Findings of the prg)'
      delegation_tier: 'standard'
      results: 'tier standard, model sonnet, effort medium, profile low-cost, passed first time, inline (leaf), independently verified'
    - id: task-002
      title: 'Write the cases of GetGraphQueryTest for deployments, red'
      source_requirements:
        prd:
          - 'REQ-1'
          - 'REQ-6'
        tdd:
          - 'DEC-1'
          - 'DEC-2'
          - 'DEC-3'
          - 'DEC-4'
          - 'CTR-1'
          - 'IMP-2'
          - 'ASM-1'
          - 'ASM-2'
          - 'ASM-5'
      outputs:
        - 'Cases on a fixture with two technology nodes, one of them hosting applications in a non-alphabetical order, and a node nested in a node: the entries have exactly node and application, nodes by reference, applications as written, a nested node with its full reference'
        - 'A case on a workspace with no deployment: the key is absent and the printed text does not contain deployments'
        - 'A case that deployments is the last key of the printed line'
        - 'A case on a workspace with no plateau and a dangling hosted application: exit 0, the entry present'
        - 'The cases read the printed JSON by key, so the red state is an assertion failure and not a compile error'
      verification:
        - './mvnw -o test-compile exits 0'
        - './mvnw -o test -Dtest=GetGraphQueryTest exits non-zero and the failures are the new deployments assertions only (the red state: task-004 turns them green); the cases that existed before still pass'
        - 'git diff --stat -- src/main scripts docs/architecture prints nothing beyond the starting list'
      risk: 'medium'
      confidence: 76
      human_review: 'none'
      escalation_triggers:
        - 'A case needs production code to compile'
        - 'The fixture of a nested node cannot be written with the manifest schema (drop the nested sentence of CTR-1 as F9 allows and log it)'
      delegation_tier: 'standard'
      results: 'tier standard, model sonnet, effort medium, profile low-cost, passed first time, inline (leaf), independently verified'
    - id: task-003
      title: 'Teach the oracle through, Q08 and Q09, red'
      source_requirements:
        prd:
          - 'REQ-3'
          - 'REQ-7'
          - 'REQ-8'
        tdd:
          - 'DEC-5'
          - 'DEC-6'
          - 'CTR-2'
          - 'FLOW-2'
          - 'IMP-4'
          - 'IF-3'
          - 'RISK-5'
      outputs:
        - 'impact-questions.json: Q08 and Q09 appended with the fields and the expect lists of DEC-6; Q01 to Q07 untouched'
        - 'ArchitectureGraph reads the optional deployments list of the graph (an empty list when the key is absent); it adds no failure of its own (F3)'
        - 'ArchitectureImpactTest: Question gets through; the walk follows the entries of deployments only when through names it (node to application for out, application to node for in, containment and visited rules unchanged); check requires qualifiers or through to be non-empty; a question with through and a graph with no deployments fails with a message that says so'
        - 'shouldAskSixToEightQuestionsWithDistinctIds becomes shouldAskNineQuestionsWithDistinctIds and asserts 9'
        - 'A sabotage case removes deployments from a copy of the graph and shows Q08 and Q09 fail'
      verification:
        - './mvnw -o test-compile exits 0'
        - './mvnw -o test -Dtest=ArchitectureImpactTest exits non-zero and the only failures are Q08, Q09 and the sabotage-independent assertions that need deployments (red state: task-004 turns them green); Q01 to Q07 still pass'
        - 'git diff ff3bacd -- src/test/javascript/architecture/impact-questions.json shows no changed line inside Q01 to Q07'
        - 'git diff --stat -- src/main scripts docs/architecture prints nothing beyond the starting list'
      risk: 'medium'
      confidence: 72
      human_review: 'none'
      escalation_triggers:
        - 'The expected list of Q08 or Q09 disagrees with environment.github.yaml and environment.workstation.yaml when read again (fix the list, log the reading as a finding)'
        - 'Q01 to Q07 change an answer'
      delegation_tier: 'standard'
      results: 'tier standard, model sonnet, effort medium, profile low-cost, passed first time, inline (leaf), independently verified'
    - id: task-004
      title: 'Build deployments in GetGraphQuery and turn the cases green'
      source_requirements:
        prd:
          - 'REQ-1'
          - 'REQ-3'
          - 'REQ-5'
          - 'REQ-6'
        tdd:
          - 'DEC-1'
          - 'DEC-2'
          - 'DEC-3'
          - 'FLOW-1'
          - 'IF-1'
          - 'IMP-1'
          - 'IMP-5'
          - 'CON-4'
          - 'RISK-1'
          - 'RISK-3'
      outputs:
        - 'GetGraphQuery: Graph gets the last field deployments (List of DeploymentEntry, absent when empty); DeploymentEntry is a @Value @Builder with node and application; collect appends one entry per application of a Node, in the order of the TreeSet and of the LinkedHashSet, copied not resolved; the Javadoc says so'
        - 'reflect-config.json: GetGraphQuery$DeploymentEntry and its builder, with the six keys of the neighbours'
        - 'The mapper inclusion is read in MapperFactory.jsonMapper first (NON_EMPTY); no annotation is added unless the empty case fails'
        - 'The whole unit suite passes and no golden moved'
      verification:
        - './mvnw -o test -Dtest=GetGraphQueryTest,ArchitectureImpactTest,SortedQueryOutputTest,BrightcartStableOutputTest exits 0'
        - './mvnw -o test exits 0 (the existing tests that read a whole query graph output, if any, are fixed with exact new expectations)'
        - './mvnw -o test-compile pmd:check exits 0'
        - 'git diff --stat -- src/main shows only GetGraphQuery.java and reflect-config.json, and nothing under scripts or pom.xml'
        - 'java -jar target/quarkus-app/quarkus-run.jar query graph -w docs/architecture/.archicode.yaml after ./mvnw -o package -DskipTests -DskipITs prints a deployments that holds the two github.actions entries'
      risk: 'medium'
      confidence: 80
      human_review: 'after'
      escalation_triggers:
        - 'An existing field or order of elements or relationships changes'
        - 'A whole-output golden fails for a reason other than the added key'
        - 'The empty case prints the key (add the inclusion on the field, log it)'
      delegation_tier: 'standard'
      results: 'tier standard, model sonnet, effort medium, profile low-cost, passed first time, inline (leaf), independently verified'
    - id: task-005
      title: 'Declare the change of query graph in the harness, with its self-check sample'
      source_requirements:
        prd:
          - 'REQ-2'
        tdd:
          - 'DEC-4'
          - 'CTR-3'
          - 'IF-2'
          - 'IMP-3'
          - 'ASM-4'
          - 'RISK-2'
          - 'RISK-3'
          - 'CON-2'
      outputs:
        - 'scripts/byte-identity-stdout-changes.txt: a second rule with its comment, the label regex for query graph with or without --plateau and the sed script that removes the last key, anchored on the end of the line'
        - 'scripts/byte-identity.sh: the self-check gets a query graph sample (base without the key accepted against the new output with it, a new output with a changed elements refused); the existing assertion "accepted under a label no rule matches" gets a label no rule matches ("shop: query stories") instead of "shop: query graph", which the new rule matches (gap-009); the function stdout_accepted and the rest of the script are not changed'
      verification:
        - 'bash -n scripts/byte-identity.sh exits 0'
        - 'The function stdout_accepted cannot be sourced (the top level builds jars and runs the workspaces), so its text is extracted to a scratch file and called on hand-made query graph files in the scratch folder: the declared pair is accepted, a changed elements is refused, an undeclared command is refused, shown in the task output'
        - 'scripts/byte-identity.sh --only domain_workspace --no-build exits 0 and prints self-check: ok (the base is cached in ~/.cache/archicode-byte-identity/archicode-0.19.0; the real proof of the rule on the rebuilt jar is task-007)'
        - 'grep -c "shop: query graph" scripts/byte-identity.sh prints only the new query graph sample assertions (none of them is the "no rule matches" one)'
        - 'git diff --stat -- src pom.xml package.json prints nothing beyond the starting list'
      risk: 'medium'
      confidence: 74
      human_review: 'none'
      escalation_triggers:
        - 'The query graph output has more than one line (ASM-4 fails; stop and log it)'
        - 'The sed rule removes more than the key on a real output'
      delegation_tier: 'standard'
      results: 'tier standard, model sonnet, effort medium, profile low-cost, passed first time, inline (leaf), independently verified'
    - id: task-006
      title: 'Write the manual, the upgrade note and the guide sentence'
      source_requirements:
        prd:
          - 'REQ-4'
        tdd:
          - 'DEC-7'
          - 'IMP-6'
          - 'CTR-1'
          - 'CON-7'
      outputs:
        - 'src/doc/README.adoc: a bullet on deployments in Query graph (its entries, the order, the absence), the anchor [[query-graph]] as [[query-views]] was, a numbered change in [[upgrade-0-24]] and both sentences of its intro reworded (F7)'
        - 'src/main/resources/guide/guide.md line 19 gives the optional deployments key and its meaning; src/test/resources/guide/golden.md regenerated the way GuideTest documents (@VERSION@); the 30 KB budget respected'
        - 'The description of GetGraphQuery is left as it is (DEF-3)'
      verification:
        - './mvnw -o test -Dtest=ManualExamplesTest,GuideTest exits 0'
        - 'grep -c "deployments" on the Query graph section of src/doc/README.adoc is at least 1'
        - 'grep -c "deployments" src/main/resources/guide/guide.md is at least 1'
        - 'git diff --stat -- src/main/java scripts pom.xml prints nothing new beyond task-004'
      risk: 'low'
      confidence: 82
      human_review: 'none'
      escalation_triggers:
        - 'GuideTest exceeds its byte budget'
        - 'An example block fails on the manual workspace'
      delegation_tier: 'standard'
      results: 'tier standard, model sonnet, effort medium, profile low-cost, passed first time, inline (leaf), independently verified'
    - id: task-007
      title: 'Run the gates, the full byte-identity run, and write the run record'
      source_requirements:
        prd:
          - 'REQ-1'
          - 'REQ-2'
          - 'REQ-3'
          - 'REQ-4'
          - 'REQ-5'
          - 'REQ-6'
          - 'REQ-8'
        tdd:
          - 'Observability and Verification'
          - 'RISK-1'
          - 'RISK-2'
          - 'RISK-6'
      outputs:
        - 'The output of each gate in the Findings of the prg and the verification in the run document; anything not run is marked not verified (the native image, the harness on macOS)'
        - 'A check on a workspace made by archicode init: grep -c deployments prints 0'
      verification:
        - './mvnw -o test exits 0 and ./mvnw -o test-compile pmd:check exits 0'
        - './mvnw -o verify -DskipITs=false exits 0 (if the packaged-jar run cannot run here, record the reason; do not report it as passed)'
        - 'npm run test:unit, npm run format:check and npm run lint exit 0'
        - 'scripts/byte-identity.sh exits 0 with 0 DIFFERENT and self-check ok'
        - 'npm run sample:build then git status --short shows no change under samples/ or docs/architecture'
        - 'git diff ff3bacd -- src/test/javascript/architecture/impact-questions.json shows no changed line inside Q01 to Q07 and the file holds 9 questions'
      risk: 'low'
      confidence: 78
      human_review: 'none'
      escalation_triggers:
        - 'A gate fails for a reason an earlier task introduced (hand back to that task as a finding; do not edit its files here)'
        - 'The byte-identity run reports a DIFFERENT (a real regression: stop and log it)'
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
        - task-005
      reason: 'task-002 (GetGraphQueryTest), task-003 (oracle and its questions file) and task-005 (harness script and rules file) touch disjoint paths and all depend only on task-001'
      conflict_risks:
        - 'All three read the TDD amended by task-001 and none edits it'
        - 'The shared working tree: task-005 must not run the full Maven suite while task-002 and task-003 leave it red; its checks use --no-build and a scratch folder'
        - 'task-002 and task-003 both run Maven in one target/ directory: run them one after the other when they run in the same tree'
```

## 6. Human Review Gates

```yaml
human_review_gates:
  gates:
    - id: gate-001
      trigger: 'The output of query graph changes on every workspace that has a deployment (a documented, declared change)'
      required_before: []
      required_after: ['task-004']
      reviewer_focus:
        - 'deployments is the last key, absent when empty, and the order of elements and relationships is unchanged'
        - 'the sed rule recovers the base output and nothing more'
        - 'the hosted application is copied and not resolved, and no new error exists'
        - 'Q01 to Q07 are untouched and Q08 and Q09 carry exact lists'
```

## 7. Risk Assessment

```yaml
risk_assessment:
  by_task:
    - id: task-001
      risk: 'low'
      rationale: 'document edit only'
    - id: task-002
      risk: 'medium'
      rationale: 'tests that must be red for the right reason; the fixture of a node nested in a node may not exist yet'
    - id: task-003
      risk: 'medium'
      rationale: 'the walk gains a third kind of edge and the expected lists of Q08 and Q09 are exact; a containment slip changes an answer'
    - id: task-004
      risk: 'medium'
      rationale: 'changes the output of a public command on workspaces with a deployment; the key must stay last and absent when empty'
    - id: task-005
      risk: 'medium'
      rationale: 'a harness that accepts too much would hide regressions; the anchored expression and the self-check limit it'
    - id: task-006
      risk: 'low'
      rationale: 'documentation, checked by ManualExamplesTest and GuideTest'
    - id: task-007
      risk: 'low'
      rationale: 'verification only; the base build is slow and offline'
  by_area:
    - area: 'api'
      risk: 'medium'
      rationale: 'one more key on query graph where a deployment exists (told in the notes of the release)'
    - area: 'infra'
      risk: 'medium'
      rationale: 'the byte-identity harness gains its second declared rule; W-3 reuses the mechanism'
    - area: 'tests'
      risk: 'medium'
      rationale: 'the oracle changes shape for two questions and the file is shared with W-3'
    - area: 'docs'
      risk: 'low'
      rationale: 'manual, guide and its golden'
```

## 8. Confidence Assessment

```yaml
confidence_assessment:
  by_task:
    - id: task-001
      score: 84
      rationale: 'the findings are listed in the prg and checkable by grep'
    - id: task-002
      score: 76
      rationale: 'the red-for-the-right-reason check and the nested-node fixture are the uncertain parts'
    - id: task-003
      score: 72
      rationale: 'the walk and the expected lists are verified by hand, not yet by a run'
    - id: task-004
      score: 80
      rationale: 'a small change in one class with a precise contract and tests written first'
    - id: task-005
      score: 74
      rationale: 'the sed rule is proved on a real output only in task-007'
    - id: task-006
      score: 82
      rationale: 'the example and guide tests guard the documents'
    - id: task-007
      score: 78
      rationale: 'depends on the offline build of the base jar'
```

## 9. Agent Assignment Plan

```yaml
agent_assignment_plan:
  assignments:
    - task_id: task-001
      agent_role: 'Architecture Agent'
      objective: 'Apply the Stage 5 findings F1 to F9 to the TDD'
      context:
        prd_excerpts:
          - 'No PRD; REQ-6 and REQ-7 of the TDD'
        tdd_excerpts:
          - 'ASM-2, ASM-5, DEC-3, DEC-4, IF-1, IMP-2, IMP-3, IMP-4, IMP-6, CTR-1, Q-1, Review'
      likely_files:
        - 'docs/wav/wav-031-graph-answers-impact/run/run-0220-graph-deployments/tdd-0220-graph-deployments.md'
      acceptance_criteria:
        - 'each of F1 to F9 is applied as the Review states it and the Review says so'
      verification:
        - 'grep -c "JsonInclude" on the TDD prints 0'
        - 'grep -c "src/test/CLAUDE.md" on the TDD prints 0 in IMP-3 (the file may still be named in the Review section)'
        - 'grep -q "no plateau" on the TDD succeeds'
        - 'git diff --stat -- src scripts pom.xml package.json prints nothing beyond the files already modified at the start of the run (record the starting list first)'
      escalation_triggers:
        - 'a finding contradicts the repository'
      suggested_subagent_type: 'general-purpose'
      suggested_model: '(default)'
      suggested_effort: 'medium'
    - task_id: task-002
      agent_role: 'Test Generation Agent'
      objective: 'Write the deployments cases of GetGraphQueryTest red'
      context:
        prd_excerpts:
          - 'REQ-1 and REQ-6 of the TDD'
        tdd_excerpts:
          - 'DEC-1, DEC-2, DEC-3, DEC-4, CTR-1, IMP-2'
      likely_files:
        - 'src/test/java/io/morin/archicode/cli/GetGraphQueryTest.java'
      acceptance_criteria:
        - 'the cases fail only on the missing deployments key; earlier cases still pass'
      verification:
        - './mvnw -o test-compile exits 0'
        - './mvnw -o test -Dtest=GetGraphQueryTest exits non-zero and the failures are the new deployments assertions only (the red state: task-004 turns them green); the cases that existed before still pass'
        - 'git diff --stat -- src/main scripts docs/architecture prints nothing beyond the starting list'
      escalation_triggers:
        - 'a case needs production code to compile'
      suggested_subagent_type: 'general-purpose'
      suggested_model: '(default)'
      suggested_effort: 'medium'
    - task_id: task-003
      agent_role: 'Test Generation Agent'
      objective: 'Add through, Q08, Q09 and the nine-question gate to the oracle'
      context:
        prd_excerpts:
          - 'REQ-3, REQ-7 and REQ-8 of the TDD'
        tdd_excerpts:
          - 'DEC-5, DEC-6, CTR-2, FLOW-2, IMP-4, IF-3, RISK-5'
      likely_files:
        - 'src/test/java/io/morin/archicode/doc/ArchitectureImpactTest.java'
        - 'src/test/java/io/morin/archicode/doc/ArchitectureGraph.java'
        - 'src/test/javascript/architecture/impact-questions.json'
      acceptance_criteria:
        - 'Q08 and Q09 fail only for lack of deployments; Q01 to Q07 pass and are unchanged'
      verification:
        - './mvnw -o test-compile exits 0'
        - './mvnw -o test -Dtest=ArchitectureImpactTest exits non-zero and the only failures are Q08, Q09 and the sabotage-independent assertions that need deployments (red state: task-004 turns them green); Q01 to Q07 still pass'
        - 'git diff ff3bacd -- src/test/javascript/architecture/impact-questions.json shows no changed line inside Q01 to Q07'
        - 'git diff --stat -- src/main scripts docs/architecture prints nothing beyond the starting list'
      escalation_triggers:
        - 'an expected list disagrees with the environment manifests'
      suggested_subagent_type: 'general-purpose'
      suggested_model: '(default)'
      suggested_effort: 'high'
    - task_id: task-004
      agent_role: 'Backend Implementation Agent'
      objective: 'Add deployments to the output of query graph'
      context:
        prd_excerpts:
          - 'REQ-1, REQ-3, REQ-5 and REQ-6 of the TDD'
        tdd_excerpts:
          - 'DEC-1, DEC-2, DEC-3, FLOW-1, IF-1, IMP-1, IMP-5'
      likely_files:
        - 'src/main/java/io/morin/archicode/cli/GetGraphQuery.java'
        - 'src/main/resources/META-INF/native-image/io.morin.archicode/archicode/reflect-config.json'
      acceptance_criteria:
        - 'the cases of task-002 and task-003 are green and existing order is unchanged'
      verification:
        - './mvnw -o test -Dtest=GetGraphQueryTest,ArchitectureImpactTest,SortedQueryOutputTest,BrightcartStableOutputTest exits 0'
        - './mvnw -o test exits 0 (the existing tests that read a whole query graph output, if any, are fixed with exact new expectations)'
        - './mvnw -o test-compile pmd:check exits 0'
        - 'git diff --stat -- src/main shows only GetGraphQuery.java and reflect-config.json, and nothing under scripts or pom.xml'
        - 'java -jar target/quarkus-app/quarkus-run.jar query graph -w docs/architecture/.archicode.yaml after ./mvnw -o package -DskipTests -DskipITs prints a deployments that holds the two github.actions entries'
      escalation_triggers:
        - 'an existing order moves'
        - 'a golden fails for another reason than the added key'
      suggested_subagent_type: 'general-purpose'
      suggested_model: '(default)'
      suggested_effort: 'medium'
    - task_id: task-005
      agent_role: 'Infrastructure Agent'
      objective: 'Declare the query graph change in the harness and prove it with a self-check sample'
      context:
        prd_excerpts:
          - 'REQ-2 of the TDD'
        tdd_excerpts:
          - 'DEC-4, CTR-3, IF-2, IMP-3, ASM-4, RISK-2'
      likely_files:
        - 'scripts/byte-identity-stdout-changes.txt'
        - 'scripts/byte-identity.sh'
      acceptance_criteria:
        - 'the declared pair is accepted, a changed elements and an undeclared command are refused, the "no rule matches" assertion uses a label no rule matches, and the script parses'
      verification:
        - 'bash -n scripts/byte-identity.sh exits 0'
        - 'The function stdout_accepted cannot be sourced (the top level builds jars and runs the workspaces), so its text is extracted to a scratch file and called on hand-made query graph files in the scratch folder: the declared pair is accepted, a changed elements is refused, an undeclared command is refused, shown in the task output'
        - 'scripts/byte-identity.sh --only domain_workspace --no-build exits 0 and prints self-check: ok (the base is cached in ~/.cache/archicode-byte-identity/archicode-0.19.0; the real proof of the rule on the rebuilt jar is task-007)'
        - 'grep -c "shop: query graph" scripts/byte-identity.sh prints only the new query graph sample assertions (none of them is the "no rule matches" one)'
        - 'git diff --stat -- src pom.xml package.json prints nothing beyond the starting list'
      escalation_triggers:
        - 'the output of query graph is more than one line'
        - 'the existing "no rule matches" assertion at the end of the self-check keeps a label the new rule matches'
      suggested_subagent_type: 'general-purpose'
      suggested_model: '(default)'
      suggested_effort: 'medium'
    - task_id: task-006
      agent_role: 'Documentation Agent'
      objective: 'Write the manual bullet, the upgrade note and the guide sentence with its golden'
      context:
        prd_excerpts:
          - 'REQ-4 of the TDD'
        tdd_excerpts:
          - 'DEC-7, IMP-6, CTR-1, CON-7'
      likely_files:
        - 'src/doc/README.adoc'
        - 'src/main/resources/guide/guide.md'
        - 'src/test/resources/guide/golden.md'
      acceptance_criteria:
        - 'ManualExamplesTest and GuideTest pass and the guide stays inside its budget'
      verification:
        - './mvnw -o test -Dtest=ManualExamplesTest,GuideTest exits 0'
        - 'grep -c "deployments" on the Query graph section of src/doc/README.adoc is at least 1'
        - 'grep -c "deployments" src/main/resources/guide/guide.md is at least 1'
        - 'git diff --stat -- src/main/java scripts pom.xml prints nothing new beyond task-004'
      escalation_triggers:
        - 'GuideTest exceeds its byte budget'
      suggested_subagent_type: 'general-purpose'
      suggested_model: '(default)'
      suggested_effort: 'low'
    - task_id: task-007
      agent_role: 'QA Agent'
      objective: 'Run every gate and the full byte-identity run, write the run record'
      context:
        prd_excerpts:
          - 'REQ-1 to REQ-6 and REQ-8 of the TDD'
        tdd_excerpts:
          - 'Observability and Verification'
      likely_files:
        - 'docs/wav/wav-031-graph-answers-impact/run/run-0220-graph-deployments/run-0220-graph-deployments.md'
        - 'docs/wav/wav-031-graph-answers-impact/run/run-0220-graph-deployments/prg-0220-graph-deployments.md'
      acceptance_criteria:
        - 'each gate output is in the record; anything not run is marked not verified'
      verification:
        - './mvnw -o test exits 0 and ./mvnw -o test-compile pmd:check exits 0'
        - './mvnw -o verify -DskipITs=false exits 0 (if the packaged-jar run cannot run here, record the reason; do not report it as passed)'
        - 'npm run test:unit, npm run format:check and npm run lint exit 0'
        - 'scripts/byte-identity.sh exits 0 with 0 DIFFERENT and self-check ok'
        - 'npm run sample:build then git status --short shows no change under samples/ or docs/architecture'
        - 'git diff ff3bacd -- src/test/javascript/architecture/impact-questions.json shows no changed line inside Q01 to Q07 and the file holds 9 questions'
      escalation_triggers:
        - 'a DIFFERENT in the byte-identity report'
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
        - 'findings present in the TDD and no code file changed'
    - task_id: task-002
      methods:
        - 'unit tests (red)'
      success_criteria:
        - 'the new cases fail on the missing key only'
    - task_id: task-003
      methods:
        - 'unit tests (red)'
        - 'git diff of the questions file'
      success_criteria:
        - 'Q08 and Q09 fail on the missing deployments only, Q01 to Q07 unchanged and passing'
    - task_id: task-004
      methods:
        - 'unit tests'
        - 'PMD'
        - 'run on the model of ArchiCode'
      success_criteria:
        - 'the cases are green, existing order unchanged, PMD clean, the two github.actions entries printed'
    - task_id: task-005
      methods:
        - 'bash syntax check'
        - 'self-check cases'
        - 'regression check on a real workspace'
      success_criteria:
        - 'the declared pair is accepted and the others are reported'
    - task_id: task-006
      methods:
        - 'ManualExamplesTest'
        - 'GuideTest'
      success_criteria:
        - 'the manual examples run and the guide is inside its budget'
    - task_id: task-007
      methods:
        - 'unit tests'
        - 'integration tests'
        - 'static analysis'
        - 'format and lint'
        - 'regression check against archicode-0.19.0'
      success_criteria:
        - 'every gate exits 0, byte-identity exits 0 with the query graph pairs accepted as declared'
```

## 11. Escalation Rules

```yaml
escalation_rules:
  rules:
    - condition: 'The run operates under the autonomy override of complete-run: a task flagged review_after or a gate is executed without a stop and logged'
      action: 'Log it in the prg and name it in the pull request for the author'
    - condition: 'The offline base build of archicode-0.19.0 fails'
      action: 'Record the failure as not verified; do not report the REQ-2 criterion as met'
    - condition: 'An existing field or order of elements or relationships changes in the output'
      action: 'Stop, log it as a finding, fix the command before touching goldens'
    - condition: 'A whole-output golden is found that holds a query graph output'
      action: 'Move it with the exact new text, log it against ASM-3 as a finding'
    - condition: 'A task needs a product or architecture decision not in the TDD'
      action: 'Stop and hand it to the main agent'
    - condition: 'A task verification fails twice'
      action: 'Handle inline and log it as a finding'
```

## 12. Final Execution Manifest

```yaml
execution_manifest:
  status: 'done'
  recommendation: 'proceed_with_review'
  autonomy_level: 'medium'
  total_tasks: 7
  autonomous_tasks: 6
  review_before_tasks: 0
  review_after_tasks: 1
  human_required_tasks: 0
  blocked_tasks: 0
  critical_path_tasks:
    - task-001
    - task-003
    - task-004
    - task-006
    - task-007
  parallel_groups:
    - parallel-group-001
  required_human_gates:
    - gate-001
  highest_risk_tasks:
    - task-003
    - task-004
    - task-005
  lowest_confidence_tasks:
    - task-003
    - task-002
  next_action: 'Run task-001, then task-002, task-003 and task-005 (disjoint files), then task-004.'
  criteria:
    - 'Every criterion of the Executive Summary is true'
```
