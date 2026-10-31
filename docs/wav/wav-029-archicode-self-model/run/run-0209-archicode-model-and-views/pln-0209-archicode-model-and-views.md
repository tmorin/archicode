---
title: Execution Plan — ArchiCode model and saved views
status: done
date: 2026-10-31
related:
  - docs/wav/wav-029-archicode-self-model/run/run-0209-archicode-model-and-views/tdd-0209-archicode-model-and-views.md
  - docs/wav/wav-029-archicode-self-model/wav-029-archicode-self-model.md
  - docs/wav/wav-029-archicode-self-model/wbc-029-archicode-self-model.md
type: pln
run: 0209
wave: 029
---

# Execution Plan: ArchiCode model and saved views

Profile TDD+pln: there is no PRD, so REQ-1 to REQ-7 are the IDs the TDD labels (section "PRD Traceability"), taken from the P1 gate and the W-1 row of the wave manifest. The plan follows the TDD plus the Stage 5 review findings (progress log, Stage 5 line), which the TDD has not absorbed: task-001 amends the TDD with them before any model file is written. Where the TDD and a finding differ, the finding wins, because each was checked against the Java nesting rules and `DanglingReferences`. The run operates under the autonomy override of complete-run: a task that would otherwise stop for a human is executed by an agent and the override is logged; this plan has no such task. The plan commits nothing: the commit is a human step outside it. Nothing under `src/` changes except the two new test files (CON-1). Build environment (checked at Stage 9): the shell's `java` may be older than 25, so every `./mvnw` and `java -jar` command below runs with `JAVA_HOME` pointing at a JDK 25 (`.sdkmanrc`); the jar the `query` commands run is `target/quarkus-app/quarkus-run.jar`.

## 1. Executive Summary

```yaml
summary:
  status: 'done'
  product_goal: 'A hand-written as-is ArchiCode workspace in docs/architecture (35 to 45 elements, 4 or 5 saved views, paths in tags) that the command line and the editor both load without error, proved by a Java test and a node test, with no generated view file in git.'
  technical_approach: 'Amend the TDD with the review findings, write the two tests red and the ignore line, write the application layer, the technology layer and the five views, turn the tests green, draw each view once by hand to answer Q-2 and log the frictions, then run the gates and two sabotage checks.'
  total_tasks: 8
  parallel_groups: 1
  high_risk_tasks: 0
  human_review_gates: 0
  autonomy_level: 'high'
  recommendation: 'proceed'
  criteria:
    - 'archicode query graph -w docs/architecture/.archicode.yaml exits 0 with no warning line (REQ-1)'
    - 'ArchitectureModelTest and architecture-model.test.js pass (REQ-2)'
    - 'archicode query views lists 4 or 5 saved views and git ls-files docs/architecture holds no file whose name contains views- (REQ-3)'
    - 'git status --short src lists exactly the two new test files (untracked) and git diff --stat -- src is empty (REQ-4)'
    - 'The model has 35 to 45 elements covering the CLI packages, the kernel entry points, editor serve, guide, init, the six editor layers and the contracts (REQ-5)'
    - 'The upward pairs are written as upward relationships, one per pair of layers, no count (REQ-6)'
    - 'Every friction met is in the progress log (TG-5)'
    - 'Maven verify, PMD, Prettier and ESLint pass'
```

## 2. PRD/TDD Consistency Assessment

```yaml
consistency_assessment:
  aligned_items:
    - 'Scope, REQ labels, decisions DEC-1 to DEC-8 and the open questions agree with the wave manifest P1 gate'
    - 'Q-1 is resolved (8 upward pairs of layers); Q-2 has a default and is settled by task-006'
  gaps:
    - id: gap-001
      type: contradiction
      description: 'The TDD makes archicode.contracts a system that holds components, but a system holds containers only (Nesting.holds, review S3).'
      impact: 'high'
      recommendation: 'task-001 gives the contracts system one container (couplings) that holds the five components, and adjusts the element count (40 with this fix, 42 with the two kernel components of gap-003, still inside 35 to 45) and the pinned list of the contracts view (references now under archicode.contracts.couplings).'
    - id: gap-002
      type: contradiction
      description: 'The TDD has the relationship github.actions builds the applications, but a relationship destination must be in the same layer (review S3).'
      impact: 'high'
      recommendation: 'task-001 states the build and hosting as the applications list of the nodes (actions, pages, releases, machine), not as relationships.'
    - id: gap-003
      type: missing_technical_design
      description: 'Review S2 findings not in the TDD: workspace calls apply_patches and apply_facet; the editor presentation and application layers call the kernel beyond model; the six CLI containers have no relationships among them; kernel entry points states and quiet are not modeled; READ_SCHEMA lives in editor core/read-schema.js, not behind persistence; the node test console-error check and the list of views have no mechanism.'
      impact: 'medium'
      recommendation: 'task-001 reads the code for each, amends the relationships (imports between the CLI containers, callers of the kernel, READ_SCHEMA owned by core), adds the two kernel components (states, quiet) and writes the mechanism of the two checks (see gap-004).'
    - id: gap-004
      type: ambiguity
      description: 'The TDD says the node test asserts no console error and lists the views, with no mechanism named.'
      impact: 'low'
      recommendation: 'task-001 names the mechanism, read from harness.js (Stage 9): the sandbox console of createApp forwards warn and error to the real console (harness.js, sandbox.console), read when createApp runs, so the node test replaces console.error and console.warn with node:test mock.method before createApp and asserts they were not called; problemsOf (shipped-files.test.js) and the thrown errors stay the other checks. The list of views is read from the state the page holds after loadWorkspace.'
    - id: gap-005
      type: ambiguity
      description: 'Q-2: whether a detailed view draws the kernel boxes is only answered by drawing the workspace.'
      impact: 'low'
      recommendation: 'Default of DEC-4 stands; task-006 draws each view and falls back to a map with pinned, logging the friction.'
  blocking_gaps: []
```

## 3. Execution Graph

```yaml
execution_graph:
  nodes:
    - id: task-001
      status: 'done'
      title: 'Amend the TDD with the Stage 5 findings and check the code facts'
      depends_on: []
      produces:
        - 'tdd-0209-archicode-model-and-views.md amended'
      agent_role: 'Architecture Agent'
      autonomy: 'autonomous'
      risk: 'low'
      confidence: 85
    - id: task-002
      status: 'done'
      title: 'Write the ignore line and the two tests red'
      depends_on: [task-001]
      produces:
        - '.gitignore'
        - 'src/test/java/io/morin/archicode/doc/ArchitectureModelTest.java'
        - 'src/test/javascript/architecture-model.test.js'
      agent_role: 'Test Generation Agent'
      autonomy: 'autonomous'
      risk: 'low'
      confidence: 80
    - id: task-003
      status: 'done'
      title: 'Write the workspace file and the application layer'
      depends_on: [task-001]
      produces:
        - 'docs/architecture/.archicode.yaml'
        - 'docs/architecture/manifests/*.yaml (people, archicode, commandline, kernel, editor, contracts)'
      agent_role: 'Documentation Agent'
      autonomy: 'autonomous'
      risk: 'medium'
      confidence: 70
    - id: task-004
      status: 'done'
      title: 'Write the technology layer and the deployment of the applications'
      depends_on: [task-003]
      produces:
        - 'docs/architecture/manifests/environment.workstation.yaml'
        - 'docs/architecture/manifests/environment.github.yaml'
      agent_role: 'Documentation Agent'
      autonomy: 'autonomous'
      risk: 'low'
      confidence: 80
    - id: task-005
      status: 'done'
      title: 'Write the five saved views'
      depends_on: [task-003, task-004]
      produces:
        - 'docs/architecture/manifests/views/view.<id>.yaml (5 files)'
      agent_role: 'Documentation Agent'
      autonomy: 'autonomous'
      risk: 'low'
      confidence: 75
    - id: task-006
      status: 'done'
      title: 'Turn the tests green, draw each view by hand and settle Q-2'
      depends_on: [task-002, task-005]
      produces:
        - 'both tests green'
        - 'views adjusted if a viewpoint omits the boxes'
        - 'progress log lines: Q-2 answer and frictions'
      agent_role: 'QA Agent'
      autonomy: 'autonomous'
      risk: 'medium'
      confidence: 65
    - id: task-007
      status: 'done'
      title: 'Run the gates and the sabotage checks'
      depends_on: [task-006]
      produces:
        - 'pmd, format, lint, unit and verify results'
        - 'two sabotage checks recorded in the progress log'
      agent_role: 'QA Agent'
      autonomy: 'autonomous'
      risk: 'low'
      confidence: 80
    - id: task-008
      status: 'done'
      title: 'Close the run record'
      depends_on: [task-007]
      produces:
        - 'prg lessons and findings'
        - 'run file status'
      agent_role: 'Documentation Agent'
      autonomy: 'autonomous'
      risk: 'low'
      confidence: 90
  edges:
    - from: task-001
      to: task-002
      reason: 'the tests assert the element set and the views the amended TDD fixes'
    - from: task-001
      to: task-003
      reason: 'the model follows the amended element table'
    - from: task-003
      to: task-004
      reason: 'the nodes list the applications by reference'
    - from: task-003
      to: task-005
      reason: 'a view names an existing element'
    - from: task-004
      to: task-005
      reason: 'the deployment view names the technology layer'
    - from: task-002
      to: task-006
      reason: 'the green run needs the tests'
    - from: task-005
      to: task-006
      reason: 'the green run needs the whole model'
    - from: task-006
      to: task-007
      reason: 'gates run on the final model'
    - from: task-007
      to: task-008
      reason: 'the record states the final results'
```

## 4. Task Catalog

```yaml
task_catalog:
  tasks:
    - id: task-001
      title: 'Amend the TDD with the Stage 5 findings and check the code facts'
      source_requirements:
        prd:
          - 'REQ-5'
          - 'REQ-6'
          - 'REQ-7'
        tdd:
          - 'Elements (DEC-1, DEC-2, DEC-3)'
          - 'Saved views (DEC-4)'
          - 'FLOW-1'
      outputs:
        - 'In the TDD: archicode.contracts holds one container couplings that holds the five components (element table and counts, still 35 to 45)'
        - 'In the TDD: build and hosting stated as the applications of the nodes, no relationship from a node to an application'
        - 'In the TDD: relationships among the six CLI containers from the imports, callers of the kernel from workspace and from the editor layers that call it, components for the kernel entry points states and quiet, READ_SCHEMA owned by editor core'
        - 'In the TDD: the mechanism of the console-error check and of the views list, read from harness.js and shipped-files.test.js (mock.method on console.error and console.warn before createApp, since the sandbox console forwards them)'
        - 'In the TDD: the by-hand check of CON-1 reads git status --short src (the two tests are untracked, git diff --stat -- src shows nothing), and the count of elements is 42 (35 to 45)'
      verification:
        - 'grep -n "couplings" tdd-0209-archicode-model-and-views.md finds the new container'
        - 'grep -c "archicode.contracts.kernel_wasm" the TDD returns a line that now sits under couplings'
        - 'the TDD no longer contains the phrase "github.actions builds"'
      risk: 'low'
      confidence: 85
      human_review: 'none'
      escalation_triggers:
        - 'the code contradicts a finding (state which one in the progress log and keep the code reading)'
      delegation_tier: 'standard'
      results: 'tier standard, model sonnet, effort medium, profile low-cost, passed first time, inline (leaf), independently verified'
    - id: task-002
      title: 'Write the ignore line and the two tests red'
      source_requirements:
        prd:
          - 'REQ-2'
          - 'REQ-3'
          - 'REQ-7'
        tdd:
          - 'IMP-2'
          - 'IMP-3'
          - 'IMP-4'
          - 'DEC-5'
          - 'DEC-6'
          - 'DEC-7'
      outputs:
        - '.gitignore with the line /docs/architecture/views*/'
        - 'ArchitectureModelTest in package io.morin.archicode.doc: loads the workspace with WorkspaceFactory, counts 35 to 45 elements, checks every relationship destination exists, runs query graph and query views through a local copy of the command-line harness (exit 0, empty error output, 4 or 5 view ids), and checks the folder holds only YAML files, no top-level entry whose name begins with views, and no path whose name contains views- (manifests/views/ is allowed: no dash)'
        - 'architecture-model.test.js: opens docs/architecture with createApp and makeDirHandle, loadWorkspace, checks problemsOf is empty, the views are listed, no console error (mechanism from task-001); read-only on the folder'
        - 'neither test writes into docs/architecture'
      verification:
        - 'grep -n "views" .gitignore shows the added line'
        - 'npx prettier --check src/test/javascript/architecture-model.test.js exits 0'
        - 'node --test src/test/javascript/architecture-model.test.js fails and the output names the missing docs/architecture folder or workspace file (red, turned green by task-006)'
        - './mvnw -q test-compile exits 0 (the Java test compiles; it fails for the same reason until task-006)'
      risk: 'low'
      confidence: 80
      human_review: 'none'
      escalation_triggers:
        - 'a helper the test needs is package-private in another package (copy it, as DEC-6 says, do not move code under src/main)'
      delegation_tier: 'standard'
      results: 'tier standard, model sonnet, effort medium, profile low-cost, passed first time, inline (leaf), independently verified'
    - id: task-003
      title: 'Write the workspace file and the application layer'
      source_requirements:
        prd:
          - 'REQ-1'
          - 'REQ-5'
          - 'REQ-6'
        tdd:
          - 'CTR-1'
          - 'CTR-2'
          - 'DEC-1'
          - 'DEC-2'
          - 'DEC-3'
          - 'DEC-8'
      outputs:
        - 'docs/architecture/.archicode.yaml with name ArchiCode and manifests.paths manifests/**'
        - 'Manifests of the people, the solution, the command line, the kernel, the editor and the contracts, one file per system, lower snake case ids without dots, a tags.path on every element that stands for code'
        - 'Qualified relationships as in the amended TDD, the upward relationship (qualifier upward) once per pair of layers that node scripts/check-editor.mjs --list prints, no count'
        - 'No manifest file name contains the text views-'
      verification:
        - 'java -jar target/quarkus-app/quarkus-run.jar query graph -w docs/architecture/.archicode.yaml exits 0 with no warning line (build the jar first with ./mvnw package -Dmaven.test.skip -Dplugin.asciidoctor.skip=true -Dpmd.skip=true if absent)'
        - 'ls docs/architecture/manifests | grep -c "views-" prints 0'
        - 'every tags.path value that names one path exists: for each, test -e on the path'
      risk: 'medium'
      confidence: 70
      human_review: 'none'
      escalation_triggers:
        - 'a nesting or dangling-reference error that the amended TDD does not explain (read the sentence, fix the model, log it as a friction)'
        - 'a key the tools refuse that the guide says is accepted (friction for W-2)'
      delegation_tier: 'standard'
      results: 'tier standard, model sonnet, effort medium, profile low-cost, passed first time, inline (leaf), independently verified'
    - id: task-004
      title: 'Write the technology layer and the deployment of the applications'
      source_requirements:
        prd:
          - 'REQ-5'
        tdd:
          - 'Elements (DEC-1, DEC-2, DEC-3)'
          - 'DEC-1'
      outputs:
        - 'Environments workstation (node machine) and github (nodes actions, pages, releases) as manifests of kind environment'
        - 'The applications list of each node names existing application-layer references (commandline and editor on machine; both built on actions; the editor on pages; the commandline on releases)'
      verification:
        - 'java -jar target/quarkus-app/quarkus-run.jar query graph -w docs/architecture/.archicode.yaml exits 0 with no warning line and no dangling application reference'
      risk: 'low'
      confidence: 80
      human_review: 'none'
      escalation_triggers:
        - 'a dangling application reference that is not a typo'
      delegation_tier: 'standard'
      results: 'tier standard, model sonnet, effort medium, profile low-cost, passed first time, inline (leaf), independently verified'
    - id: task-005
      title: 'Write the five saved views'
      source_requirements:
        prd:
          - 'REQ-3'
        tdd:
          - 'Saved views (DEC-4)'
          - 'IF-2'
      outputs:
        - 'view.archicode_overview.yaml (overview of archicode), view.editor_layers.yaml (detailed of archicode.editor), view.commandline_and_kernel.yaml (detailed of archicode.commandline), view.contracts.yaml (map, pinned on the contract components), view.deployment.yaml (map, layer technology, applications on) under manifests/views/'
        - 'every non-map view carries properties.element'
      verification:
        - 'java -jar target/quarkus-app/quarkus-run.jar query views -w docs/architecture/.archicode.yaml lists the five ids and exits 0'
        - 'ls docs/architecture/manifests/views | wc -l prints 5'
      risk: 'low'
      confidence: 75
      human_review: 'none'
      escalation_triggers:
        - 'a view that errors with a sentence the guide does not explain'
      delegation_tier: 'standard'
      results: 'tier standard, model sonnet, effort medium, profile low-cost, passed first time, inline (leaf), independently verified'
    - id: task-006
      title: 'Turn the tests green, draw each view by hand and settle Q-2'
      source_requirements:
        prd:
          - 'REQ-1'
          - 'REQ-2'
          - 'REQ-3'
          - 'REQ-7'
        tdd:
          - 'FLOW-1'
          - 'Q-2'
          - 'RISK-2'
          - 'RISK-3'
          - 'RISK-4'
      outputs:
        - 'Both tests pass'
        - 'Each of the five views drawn once with views generate -i into a scratch copy of the folder (never in docs/architecture), the result judged readable or adjusted (a map with pinned replaces a detailed view that omits the kernel boxes)'
        - 'Progress log line with the answer to Q-2 and one line per friction (what was tried, the sentence, the workaround), for W-2 to turn into issues'
      verification:
        - './mvnw test -Dtest=ArchitectureModelTest exits 0'
        - 'node --test src/test/javascript/architecture-model.test.js exits 0'
        - 'ls docs/architecture lists no entry whose name starts with views, find docs/architecture -name "*.puml" prints nothing, and git ls-files --cached --others --exclude-standard docs/architecture | grep -c "views-" prints 0 (git status --short alone shows the untracked folder as one line and proves nothing)'
        - 'grep -c "Q-2" the prg file prints at least 1'
      risk: 'medium'
      confidence: 65
      human_review: 'none'
      escalation_triggers:
        - 'a view cannot be made readable with either viewpoint (log it as a friction, keep the model, do not touch src/main)'
        - 'a test needs a change under src/main (stop; CON-1)'
      delegation_tier: 'standard'
      results: 'tier standard, model sonnet, effort medium, profile low-cost, passed first time, inline (leaf), independently verified'
    - id: task-007
      title: 'Run the gates and the sabotage checks'
      source_requirements:
        prd:
          - 'REQ-2'
          - 'REQ-4'
        tdd:
          - 'Observability and Verification'
          - 'CON-1'
          - 'CON-2'
          - 'CON-3'
          - 'ASM-2'
      outputs:
        - 'Gate results'
        - 'Sabotage 1: on a scratch copy of the folder rename one relationship destination; both tests, pointed at the copy, fail with the tool sentence'
        - 'Sabotage 2: on a scratch copy add a folder views-foo holding a file (a views folder as views generate would leave it); the Java test fails'
      verification:
        - './mvnw test-compile pmd:check exits 0'
        - 'npm run format:check exits 0'
        - 'npm run lint exits 0'
        - 'npm run test:unit exits 0 (ShippedFilesTest and shipped-files.test.js unchanged and passing, ASM-2)'
        - './mvnw verify exits 0'
        - 'git status --short src lists the two new test files only, and git diff --stat -- src is empty'
        - 'the scratch copies are removed after the sabotage checks'
      risk: 'low'
      confidence: 80
      human_review: 'none'
      escalation_triggers:
        - 'a sabotage check does not make the test fail (the test is too weak; strengthen it before closing)'
        - 'verify fails for a reason unrelated to the new files (log it, do not fix product code)'
      delegation_tier: 'standard'
      results: 'tier standard, model sonnet, effort medium, profile low-cost, passed first time, inline (leaf), independently verified'
    - id: task-008
      title: 'Close the run record'
      source_requirements:
        prd:
          - 'REQ-7'
        tdd:
          - 'TG-5'
          - 'IMP-5'
      outputs:
        - 'prg Findings and Lessons Learnt filled'
        - 'run file status moved by the main agent per complete-run'
      verification:
        - 'grep -n "Lessons Learnt" -A3 the prg file shows text other than Nothing yet'
      risk: 'low'
      confidence: 90
      human_review: 'none'
      escalation_triggers:
        - 'a friction is missing from the log'
      delegation_tier: 'cheap'
      results: 'tier cheap, model haiku, effort high, profile low-cost, passed first time, inline (leaf), independently verified'
```

## 5. Parallelization Plan

```yaml
parallelization_plan:
  groups:
    - id: parallel-group-001
      tasks:
        - task-002
        - task-003
      reason: 'The tests and the application layer both depend on task-001 only and write disjoint files.'
      conflict_risks:
        - 'task-002 reads the element set the TDD fixes; if task-003 changes a count the test range (35 to 45) still holds'
        - 'both may run the Maven build; run the jar build once, in task-003, before task-006'
```

## 6. Human Review Gates

```yaml
human_review_gates:
  gates: []
```

No gate: this run operates under the autonomy override of complete-run, and no task is `human_required`. The commit and the pull request are human steps outside the plan.

## 7. Risk Assessment

```yaml
risk_assessment:
  by_task:
    - id: task-001
      risk: 'low'
      rationale: 'A document amendment checked against the code.'
    - id: task-002
      risk: 'low'
      rationale: 'New test files only; the harness helpers exist.'
    - id: task-003
      risk: 'medium'
      rationale: 'About 30 hand-written elements; the nesting rules and dangling-reference sentences are strict but explicit.'
    - id: task-004
      risk: 'low'
      rationale: 'Six small elements.'
    - id: task-005
      risk: 'low'
      rationale: 'Five short manifests.'
    - id: task-006
      risk: 'medium'
      rationale: 'Q-2 and readability can only be judged by drawing; a view may need a different viewpoint.'
    - id: task-007
      risk: 'low'
      rationale: 'Commands with known verdicts.'
    - id: task-008
      risk: 'low'
      rationale: 'Record keeping.'
  by_area:
    - area: 'docs'
      risk: 'medium'
      rationale: 'The model can go stale (RISK-1); W-2 guards it, not this run.'
    - area: 'security'
      risk: 'low'
      rationale: 'No secret, no real workspace content, no path of the author machine.'
    - area: 'infra'
      risk: 'low'
      rationale: 'One .gitignore line; nothing ships in the jar, the image or the website.'
```

## 8. Confidence Assessment

```yaml
confidence_assessment:
  by_task:
    - id: task-001
      score: 85
      rationale: 'The findings are concrete and the code can be read.'
    - id: task-002
      score: 80
      rationale: 'Patterns exist in ShippedFilesTest and shipped-files.test.js; the console-error mechanism is the unknown.'
    - id: task-003
      score: 70
      rationale: 'Hand-writing against strict nesting rules, with the first error stopping the load.'
    - id: task-004
      score: 80
      rationale: 'Small and well specified.'
    - id: task-005
      score: 75
      rationale: 'The viewpoint properties are documented; the drawn result is not known.'
    - id: task-006
      score: 65
      rationale: 'Q-2 is open and readability is a judgment.'
    - id: task-007
      score: 80
      rationale: 'Known commands; the sabotage checks need a pointer to a scratch copy.'
    - id: task-008
      score: 90
      rationale: 'Mechanical.'
```

## 9. Agent Assignment Plan

```yaml
agent_assignment_plan:
  assignments:
    - task_id: task-001
      agent_role: 'Architecture Agent'
      objective: 'Apply the Stage 5 findings to the TDD after checking each against Nesting.java, DanglingReferences, check-editor.mjs --list, layers.json and harness.js.'
      context:
        prd_excerpts:
          - 'REQ-5 and REQ-6 of the PRD Traceability section'
        tdd_excerpts:
          - 'Elements table and qualified relationships'
      likely_files:
        - 'docs/wav/wav-029-archicode-self-model/run/run-0209-archicode-model-and-views/tdd-0209-archicode-model-and-views.md'
        - 'src/main/java/io/morin/archicode/resource/element/application/Nesting.java'
        - 'src/test/javascript/viewpoint-kernel/harness.js'
      acceptance_criteria:
        - 'The three gaps gap-001 to gap-003 are closed in the TDD text'
      verification:
        - 'grep -n "couplings" tdd-0209-archicode-model-and-views.md finds the new container'
        - 'grep -c "archicode.contracts.kernel_wasm" the TDD returns a line that now sits under couplings'
        - 'the TDD no longer contains the phrase "github.actions builds"'
      escalation_triggers:
        - 'a finding the code refutes'
      suggested_subagent_type: 'general-purpose'
      suggested_model: '(default)'
      suggested_effort: 'medium'
    - task_id: task-002
      agent_role: 'Test Generation Agent'
      objective: 'Write the ignore line and the two tests, red.'
      context:
        prd_excerpts:
          - 'REQ-2, REQ-3, REQ-7'
        tdd_excerpts:
          - 'FLOW-1, DEC-5, DEC-6'
      likely_files:
        - '.gitignore'
        - 'src/test/java/io/morin/archicode/doc/ArchitectureModelTest.java'
        - 'src/test/javascript/architecture-model.test.js'
        - 'src/test/java/io/morin/archicode/doc/ShippedFilesTest.java'
        - 'src/test/javascript/viewpoint-kernel/shipped-files.test.js'
      acceptance_criteria:
        - 'Tests compile, are formatted, fail only because the folder is missing, write nothing into docs/architecture'
      verification:
        - 'grep -n "views" .gitignore shows the added line'
        - 'npx prettier --check src/test/javascript/architecture-model.test.js exits 0'
        - 'node --test src/test/javascript/architecture-model.test.js fails and the output names the missing docs/architecture folder or workspace file (red, turned green by task-006)'
        - './mvnw -q test-compile exits 0 (the Java test compiles; it fails for the same reason until task-006)'
      escalation_triggers:
        - 'a helper is not reachable without changing src/main'
      suggested_subagent_type: 'general-purpose'
      suggested_model: '(default)'
      suggested_effort: 'medium'
    - task_id: task-003
      agent_role: 'Documentation Agent'
      objective: 'Write the workspace file and the application-layer manifests of the amended TDD.'
      context:
        prd_excerpts:
          - 'REQ-1, REQ-5, REQ-6'
        tdd_excerpts:
          - 'Elements, CTR-1, CTR-2, DEC-8'
      likely_files:
        - 'docs/architecture/.archicode.yaml'
        - 'docs/architecture/manifests/'
        - 'src/doc/examples/domain_plateaus (style reference)'
        - 'src/main/resources/init/manifests (the shape of the header and the content of person, system, container and relationship)'
      acceptance_criteria:
        - 'query graph exits 0 with no warning; 35 to 45 elements; tags.path values exist'
      verification:
        - 'java -jar target/quarkus-app/quarkus-run.jar query graph -w docs/architecture/.archicode.yaml exits 0 with no warning line (build the jar first with ./mvnw package -Dmaven.test.skip -Dplugin.asciidoctor.skip=true -Dpmd.skip=true if absent)'
        - 'ls docs/architecture/manifests | grep -c "views-" prints 0'
        - 'every tags.path value that names one path exists: for each, test -e on the path'
      escalation_triggers:
        - 'an unexplained load error'
      suggested_subagent_type: 'general-purpose'
      suggested_model: '(default)'
      suggested_effort: 'high'
    - task_id: task-004
      agent_role: 'Documentation Agent'
      objective: 'Write the two environments, their nodes and the applications lists.'
      context:
        prd_excerpts:
          - 'REQ-5'
        tdd_excerpts:
          - 'Technology layer paragraph, amended'
      likely_files:
        - 'docs/architecture/manifests/environment.workstation.yaml'
        - 'docs/architecture/manifests/environment.github.yaml'
      acceptance_criteria:
        - 'query graph still exits 0 with no warning'
      verification:
        - 'java -jar target/quarkus-app/quarkus-run.jar query graph -w docs/architecture/.archicode.yaml exits 0 with no warning line and no dangling application reference'
      escalation_triggers:
        - 'a dangling application reference'
      suggested_subagent_type: 'general-purpose'
      suggested_model: '(default)'
      suggested_effort: 'medium'
    - task_id: task-005
      agent_role: 'Documentation Agent'
      objective: 'Write the five saved view manifests.'
      context:
        prd_excerpts:
          - 'REQ-3'
        tdd_excerpts:
          - 'Saved views (DEC-4)'
      likely_files:
        - 'docs/architecture/manifests/views/'
        - 'src/main/resources/init/manifests/view.shop_overview.yaml (a view manifest and its file name)'
        - 'src/test/resources/brightcart/layered/shared/view.cloud_map.yaml (a map view of the technology layer as a manifest)'
        - 'src/doc/examples/domain_technology_map/.archicode.yaml (map views written in the workspace file, for the properties)'
      acceptance_criteria:
        - 'query views lists five ids'
      verification:
        - 'java -jar target/quarkus-app/quarkus-run.jar query views -w docs/architecture/.archicode.yaml lists the five ids and exits 0'
        - 'ls docs/architecture/manifests/views | wc -l prints 5'
      escalation_triggers:
        - 'a view error the guide does not explain'
      suggested_subagent_type: 'general-purpose'
      suggested_model: '(default)'
      suggested_effort: 'medium'
    - task_id: task-006
      agent_role: 'QA Agent'
      objective: 'Make both tests pass, draw each view in a scratch copy, settle Q-2, log frictions.'
      context:
        prd_excerpts:
          - 'REQ-1, REQ-2, REQ-3, REQ-7'
        tdd_excerpts:
          - 'FLOW-1, Q-2, RISK-2 to RISK-4'
      likely_files:
        - 'docs/architecture/'
        - 'docs/wav/wav-029-archicode-self-model/run/run-0209-archicode-model-and-views/prg-0209-archicode-model-and-views.md'
      acceptance_criteria:
        - 'Tests green; nothing generated left in docs/architecture; Q-2 answered in the prg'
      verification:
        - './mvnw test -Dtest=ArchitectureModelTest exits 0'
        - 'node --test src/test/javascript/architecture-model.test.js exits 0'
        - 'ls docs/architecture lists no entry whose name starts with views, find docs/architecture -name "*.puml" prints nothing, and git ls-files --cached --others --exclude-standard docs/architecture | grep -c "views-" prints 0 (git status --short alone shows the untracked folder as one line and proves nothing)'
        - 'grep -c "Q-2" the prg file prints at least 1'
      escalation_triggers:
        - 'a change under src/main would be needed'
      suggested_subagent_type: 'general-purpose'
      suggested_model: '(default)'
      suggested_effort: 'high'
    - task_id: task-007
      agent_role: 'QA Agent'
      objective: 'Run the gates and the two sabotage checks on scratch copies.'
      context:
        prd_excerpts:
          - 'REQ-2, REQ-4'
        tdd_excerpts:
          - 'Observability and Verification'
      likely_files:
        - 'pom.xml'
        - 'package.json'
      acceptance_criteria:
        - 'All gates exit 0; both sabotage checks make a test fail; src diff is the two tests'
      verification:
        - './mvnw test-compile pmd:check exits 0'
        - 'npm run format:check exits 0'
        - 'npm run lint exits 0'
        - 'npm run test:unit exits 0 (ShippedFilesTest and shipped-files.test.js unchanged and passing, ASM-2)'
        - './mvnw verify exits 0'
        - 'git status --short src lists the two new test files only, and git diff --stat -- src is empty'
        - 'the scratch copies are removed after the sabotage checks'
      escalation_triggers:
        - 'a sabotage check passes silently'
      suggested_subagent_type: 'general-purpose'
      suggested_model: '(default)'
      suggested_effort: 'medium'
    - task_id: task-008
      agent_role: 'Documentation Agent'
      objective: 'Fill Findings and Lessons Learnt of the prg.'
      context:
        prd_excerpts:
          - 'REQ-7'
        tdd_excerpts:
          - 'TG-5'
      likely_files:
        - 'docs/wav/wav-029-archicode-self-model/run/run-0209-archicode-model-and-views/prg-0209-archicode-model-and-views.md'
      acceptance_criteria:
        - 'Every friction of the run is in the log'
      verification:
        - 'grep -n "Lessons Learnt" -A3 the prg file shows text other than Nothing yet'
      escalation_triggers:
        - 'a missing friction'
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
        - 'grep on the amended TDD'
      success_criteria:
        - 'No sentence of the TDD contradicts the nesting rules or the dangling-reference rule'
    - task_id: task-002
      methods:
        - 'prettier check'
        - 'test compile'
        - 'node test run (red)'
      success_criteria:
        - 'The tests compile, are formatted and fail only for the missing folder'
    - task_id: task-003
      methods:
        - 'query graph on the jar'
        - 'test -e on tags.path values'
      success_criteria:
        - 'Exit 0, no warning, 35 to 45 elements'
    - task_id: task-004
      methods:
        - 'query graph on the jar'
      success_criteria:
        - 'Exit 0, no dangling application reference'
    - task_id: task-005
      methods:
        - 'query views on the jar'
      success_criteria:
        - 'Five ids listed, exit 0'
    - task_id: task-006
      methods:
        - 'unit tests (Java and node)'
        - 'views generate -i in a scratch copy'
      success_criteria:
        - 'Both tests green; each view drawn; no generated file in the folder'
    - task_id: task-007
      methods:
        - 'pmd'
        - 'format check'
        - 'lint'
        - 'node unit suite'
        - 'maven verify'
        - 'sabotage on scratch copies'
      success_criteria:
        - 'All exit 0; both sabotage checks fail the tests; src diff is two test files'
    - task_id: task-008
      methods:
        - 'grep on the prg'
      success_criteria:
        - 'Lessons filled'
```

## 11. Escalation Rules

```yaml
escalation_rules:
  rules:
    - condition: 'A change under src/main, src/main/editor or a golden file would be needed'
      action: 'Stop the task, log it as a friction for W-2, keep the model as it is (CON-1, wave non-goal).'
    - condition: 'The tools refuse a manifest with a sentence the amended TDD does not explain'
      action: 'Fix the model, log the sentence and the fix as a friction.'
    - condition: 'Q-2 shows no viewpoint can draw the cross-system relationships'
      action: 'Use a map with pinned, log the missing capability, do not touch the oracle.'
    - condition: 'A task fails its own verification'
      action: 'Re-dispatch once one effort step up per the Delegation Policy; a second failure is handled inline and logged as a finding.'
    - condition: 'Under the autonomy override a task would otherwise stop for a human'
      action: 'Execute it and log the override; this plan has none.'
```

## 12. Final Execution Manifest

```yaml
execution_manifest:
  status: 'done'
  recommendation: 'proceed'
  autonomy_level: 'high'
  total_tasks: 8
  autonomous_tasks: 8
  review_before_tasks: 0
  review_after_tasks: 0
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
  required_human_gates: []
  highest_risk_tasks:
    - task-003
    - task-006
  lowest_confidence_tasks:
    - task-006
    - task-003
  next_action: 'none: every criterion held at Stage 11; commit is a human step.'
  criteria:
    - 'query graph exits 0 on docs/architecture with no warning'
    - 'Both new tests pass'
    - 'Four or five saved views listed, no generated file in git'
    - 'Only the two test files change under src (git status --short src)'
    - 'Gates and both sabotage checks pass'
    - 'Frictions logged in the prg'
```
