---
title: Execution Plan — Resolved Graph Query Command
status: done
date: 2026-10-04
related:
  - docs/wav/wav-002-manifest-web-editor/run/run-0004-resolved-graph-query/tdd-0004-resolved-graph-query.md
type: pln
run: 0004
wave: 002
---

# Execution Plan: Resolved Graph Query Command

## 1. Executive Summary

```yaml
summary:
  status: 'done'
  product_goal: 'Give ArchiCode a CLI command that answers "what does this resolve to and what is dangling": a new query graph subcommand that prints the full resolved element/relationship graph as JSON, reusing the exact resolution call views generate/query views already use.'
  technical_approach: 'Add GetGraphQuery (registered in QueryGroup), walking both appIndex and techIndex and forcing ElementIndex.getElementByReference on every relationship destination; emit {elements, relationships} JSON tagged by layer; let ArchiCodeException propagate uncaught on a dangling destination, exactly like every existing command.'
  total_tasks: 4
  parallel_groups: 0
  high_risk_tasks: 0
  human_review_gates: 0
  autonomy_level: 'high'
  recommendation: 'proceed'
  criteria:
    - 'query graph against .custom/workspace.yaml exits 0 and prints valid JSON containing every element and relationship'
    - 'query graph against a workspace with one dangling relationship destination exits non-zero via an uncaught ArchiCodeException'
    - './mvnw verify exits 0'
```

## 2. PRD/TDD Consistency Assessment

No PRD exists for this run (infra-facing `TDD+pln` profile — see the TDD's
"PRD Traceability" section). This instead checks the TDD against its actual
source of requirements, wave 002's manifest entry `W-1` / Phase P1 table row.

```yaml
consistency_assessment:
  aligned_items:
    - 'TDD TG-1/TG-2 match W-1 scope: new query graph subcommand, built on the existing WorkspaceFactory/ElementIndex path, no new parsing/indexing code'
    - 'TDD TG-3/CON-1/DEC-3 match W-1 focus: force resolution of every relationship the same way views generate/query views already do, reusing ElementIndex.getElementByReference rather than a second check'
    - 'TDD TG-4/TG-6/DEC-4 match W-1 scope and exit evidence: print resolved elements + relationships as JSON; valid JSON against .custom'
    - 'TDD TG-5/TG-7/CON-2 match W-1 exit evidence: a dangling destination exits non-zero via the same kind of error views generate already produces (ArchiCodeException, uncaught)'
  gaps: []
  blocking_gaps: []
```

No gaps: this is a narrowly-scoped, single-command run and the TDD's own
KDMLLC review (see prg Log) found only two wording-level findings, both
already fixed in the TDD text, with no effect on scope or design.

## 3. Execution Graph

```yaml
execution_graph:
  nodes:
    - id: task-001
      status: 'done'
      title: 'Implement GetGraphQuery and register it in QueryGroup'
      depends_on: []
      produces:
        - 'src/main/java/io/morin/archicode/cli/GetGraphQuery.java'
        - 'src/main/java/io/morin/archicode/cli/QueryGroup.java (subcommand registration)'
      agent_role: 'Implementation Agent'
      autonomy: 'autonomous'
      risk: 'low'
      confidence: 90
    - id: task-002
      status: 'done'
      title: 'Add test fixtures and GetGraphQueryTest'
      depends_on: ['task-001']
      produces:
        - 'src/test/workspaces/case_graph_ok.yaml'
        - 'src/test/workspaces/case_graph_dangling.yaml'
        - 'src/test/java/io/morin/archicode/cli/GetGraphQueryTest.java'
      agent_role: 'QA Agent'
      autonomy: 'autonomous'
      risk: 'low'
      confidence: 90
    - id: task-003
      status: 'done'
      title: 'Run the full verification suite and the exit-evidence-specific manual checks'
      depends_on: ['task-002']
      produces:
        - 'Verification evidence: unit test results, packaged-CLI runs against .custom and the dangling fixture'
      agent_role: 'QA Agent'
      autonomy: 'autonomous'
      risk: 'low'
      confidence: 95
    - id: task-004
      status: 'done'
      title: 'Format sources, finalize run documents and prg'
      depends_on: ['task-003']
      produces:
        - 'Prettier-formatted GetGraphQuery.java/GetGraphQueryTest.java'
        - 'run-0004-resolved-graph-query.md at status completed'
        - 'pln execution_manifest.status done'
        - 'prg-0004 Log/Findings updated'
      agent_role: 'Release Agent'
      autonomy: 'autonomous'
      risk: 'low'
      confidence: 95
  edges:
    - from: task-001
      to: task-002
      reason: 'Tests exercise the command implemented in task-001.'
    - from: task-002
      to: task-003
      reason: 'Verification needs the tests and fixtures in place first.'
    - from: task-003
      to: task-004
      reason: 'The final report and status updates need every verification result in hand.'
```

## 4. Task Catalog

```yaml
task_catalog:
  tasks:
    - id: task-001
      title: 'Implement GetGraphQuery and register it in QueryGroup'
      source_requirements:
        prd: []
        tdd:
          - 'TG-1'
          - 'TG-2'
          - 'TG-3'
          - 'TG-4'
          - 'TG-5'
          - 'DEC-1'
          - 'DEC-2'
          - 'DEC-3'
          - 'DEC-4'
          - 'IMP-1'
          - 'IMP-2'
      outputs:
        - 'GetGraphQuery.java: Runnable command walking appIndex/techIndex, resolving every relationship via ElementIndex.getElementByReference, emitting {elements, relationships} JSON'
        - 'QueryGroup.java: GetGraphQuery.class added to subcommands'
      verification:
        - './mvnw -DskipTests compile succeeds'
      risk: 'low'
      confidence: 90
      human_review: 'none'
      escalation_triggers:
        - 'getElementByReference is bypassed anywhere in the new code (would silently create a second resolution path, violating CON-1)'
      delegation_tier: 'standard'
    - id: task-002
      title: 'Add test fixtures and GetGraphQueryTest'
      source_requirements:
        prd: []
        tdd:
          - 'TG-6'
          - 'TG-7'
          - 'IMP-3'
          - 'IMP-4'
      outputs:
        - 'case_graph_ok.yaml (application + technology, one valid relationship each)'
        - 'case_graph_dangling.yaml (one relationship with a destination that does not exist)'
        - 'GetGraphQueryTest.java: happy-path JSON-validity assertion + assertThrows(ArchiCodeException.class, ...)'
      verification:
        - './mvnw test -Dtest=GetGraphQueryTest passes'
      risk: 'low'
      confidence: 90
      human_review: 'none'
      escalation_triggers:
        - 'the dangling-destination test does not actually throw ArchiCodeException (would mean the exception is being caught/swallowed somewhere)'
      delegation_tier: 'standard'
    - id: task-003
      title: 'Run the full verification suite and the exit-evidence-specific manual checks'
      source_requirements:
        prd: []
        tdd:
          - 'Observability and Verification'
      outputs:
        - './mvnw test (full suite) result'
        - './mvnw verify result'
        - 'packaged-jar run against .custom/workspace.yaml: exit code + JSON validity'
        - 'packaged-jar run against case_graph_dangling.yaml: exit code + stack trace'
      verification:
        - './mvnw verify exits 0'
        - 'query graph -w .custom/workspace.yaml exits 0 and output parses as JSON'
        - 'query graph -w case_graph_dangling.yaml exits non-zero with ArchiCodeException in the trace'
      risk: 'low'
      confidence: 95
      human_review: 'none'
      escalation_triggers:
        - 'any test failure, non-zero exit on the .custom run, or zero/garbled exit on the dangling run'
      delegation_tier: 'standard'
    - id: task-004
      title: 'Format sources, finalize run documents and prg'
      source_requirements:
        prd: []
        tdd: []
      outputs:
        - 'Prettier-formatted sources'
        - 'run-0004-resolved-graph-query.md status updated'
        - 'pln execution_manifest.status updated'
        - 'prg-0004 Log/Findings updated'
      verification:
        - 'run status, pln status, and prg status agree with each other and with reality'
      risk: 'low'
      confidence: 95
      human_review: 'none'
      escalation_triggers:
        - 'any task above is blocked at the time this task runs'
      delegation_tier: 'standard'
```

## 5. Parallelization Plan

```yaml
parallelization_plan:
  groups: []
```

No parallel groups: a 4-task, strictly sequential chain (implement → test →
verify → finalize), each depending on the output of the one before it. No
safe-to-parallelize pair exists in a run this narrowly scoped.

## 6. Human Review Gates

```yaml
human_review_gates:
  gates: []
```

None defined. Nothing in this run touches auth, payments, data deletion,
production release, or any other category the default autonomy policy
marks `review_before`/`human_required`: it is a new, additive, read-only
CLI subcommand with no new runtime dependency and no behavior change to any
existing command. `complete-run`'s autonomy override is noted for
completeness but was never actually invoked, since no gate exists to
override.

## 7. Risk Assessment

```yaml
risk_assessment:
  by_task:
    - id: task-001
      risk: 'low'
      rationale: 'Additive, single new file plus a one-line registration; reuses existing, unmodified resolution/indexing/serialization code paths.'
    - id: task-002
      risk: 'low'
      rationale: 'New, isolated fixture files and one new test class; no existing fixture or test is touched.'
    - id: task-003
      risk: 'low'
      rationale: 'Read-only verification; no side effects beyond generated build artifacts.'
    - id: task-004
      risk: 'low'
      rationale: 'Formatting and documentation bookkeeping only.'
  by_area:
    - area: 'cli'
      risk: 'low'
      rationale: 'One new, additive subcommand; every existing subcommand is untouched.'
    - area: 'security'
      risk: 'low'
      rationale: 'Read-only, local, no network, no credential surface — same as every existing query command.'
```

## 8. Confidence Assessment

```yaml
confidence_assessment:
  by_task:
    - id: task-001
      score: 90
      rationale: 'Design was fully settled by the TDD before implementation; mechanical to apply.'
    - id: task-002
      score: 90
      rationale: 'Fixture shapes mirror existing case_a/case_b/case_c conventions exactly.'
    - id: task-003
      score: 95
      rationale: 'All checks are deterministic pass/fail; actually run and confirmed, not inferred.'
    - id: task-004
      score: 95
      rationale: 'Bookkeeping with a clear template to follow (manage-runs conventions, run-0002 precedent).'
```

## 9. Agent Assignment Plan

```yaml
agent_assignment_plan:
  assignments:
    - task_id: task-001
      agent_role: 'Implementation Agent'
      objective: 'Add GetGraphQuery.java per TDD DEC-1 (flat in cli/)/DEC-3 (resolution via getElementByReference)/DEC-4 (elements+relationships JSON shape) and register it in QueryGroup.'
      context:
        prd_excerpts: []
        tdd_excerpts:
          - 'DEC-1, DEC-2, DEC-3, DEC-4, IMP-1, IMP-2'
      likely_files:
        - 'src/main/java/io/morin/archicode/cli/GetGraphQuery.java'
        - 'src/main/java/io/morin/archicode/cli/QueryGroup.java'
      acceptance_criteria:
        - 'query graph subcommand exists and resolves via ElementIndex.getElementByReference only'
      verification:
        - 'compiles cleanly'
      escalation_triggers:
        - 'none hit'
      suggested_subagent_type: '(inline)'
      suggested_model: '(default)'
    - task_id: task-002
      agent_role: 'QA Agent'
      objective: 'Add the two fixture workspaces and GetGraphQueryTest covering the happy path and the dangling-destination failure.'
      context:
        prd_excerpts: []
        tdd_excerpts:
          - 'TG-6, TG-7, IMP-3, IMP-4'
      likely_files:
        - 'src/test/workspaces/case_graph_ok.yaml'
        - 'src/test/workspaces/case_graph_dangling.yaml'
        - 'src/test/java/io/morin/archicode/cli/GetGraphQueryTest.java'
      acceptance_criteria:
        - 'both tests pass; the dangling test asserts ArchiCodeException specifically'
      verification:
        - './mvnw test -Dtest=GetGraphQueryTest'
      escalation_triggers:
        - 'none hit'
      suggested_subagent_type: '(inline)'
      suggested_model: '(default)'
    - task_id: task-003
      agent_role: 'QA Agent'
      objective: 'Run the full test suite, the full verify gate, and the packaged-CLI manual checks against .custom and the dangling fixture named in the wave exit evidence.'
      context:
        prd_excerpts: []
        tdd_excerpts:
          - 'Observability and Verification'
      likely_files:
        - '.custom/workspace.yaml'
        - 'src/test/workspaces/case_graph_dangling.yaml'
      acceptance_criteria:
        - './mvnw verify exits 0'
        - 'packaged CLI run against .custom exits 0 with valid JSON'
        - 'packaged CLI run against the dangling fixture exits non-zero with ArchiCodeException in the trace'
      verification:
        - 'command output and exit codes inspected directly'
      escalation_triggers:
        - 'any mismatch between expected and actual exit code or output'
      suggested_subagent_type: '(inline)'
      suggested_model: '(default)'
    - task_id: task-004
      agent_role: 'Release Agent'
      objective: 'Run Prettier over the new Java sources and finalize run-0004/pln/prg status.'
      context:
        prd_excerpts: []
        tdd_excerpts: []
      likely_files:
        - 'docs/wav/wav-002-manifest-web-editor/run/run-0004-resolved-graph-query/**'
      acceptance_criteria:
        - 'run status, pln status, and prg status all agree with reality'
      verification:
        - 'manual cross-read of the three files'
      escalation_triggers:
        - 'none'
      suggested_subagent_type: '(inline)'
      suggested_model: '(default)'
```

**Note on `(inline)` routing.** Every task in this run is marked `(inline)`
rather than dispatched to a further `Agent` call, departing from the
Delegation Policy's default for the same reasons `run-0002` (wave 001)
recorded: this run is itself one unit of delegation dispatched by
`complete-wave` (`run-executor`, `standard` tier per wave 002's manifest);
the implementation is a single small file fully specified by the TDD's own
completed design work (`DEC-1`-`DEC-4`), with no remaining ambiguity for a
further subagent to resolve; and verification (task-003) is a sequence of
real commands whose output needs the orchestrating session's own immediate
interpretation (reading an exit code, reading a stack trace, validating
JSON), which is exactly the class of step the Policy reserves for inline
execution rather than a report-back round-trip.

## 10. Verification Plan

```yaml
verification_plan:
  checks:
    - task_id: task-001
      methods:
        - './mvnw -q -DskipTests compile'
      success_criteria:
        - 'compiles with no errors'
    - task_id: task-002
      methods:
        - './mvnw -q test -Dtest=GetGraphQueryTest'
      success_criteria:
        - '2/2 tests pass (Tests run: 2, Failures: 0, Errors: 0)'
    - task_id: task-003
      methods:
        - './mvnw -q test (full suite)'
        - './mvnw -q verify'
        - 'java -jar target/quarkus-app/quarkus-run.jar query graph -w .custom/workspace.yaml, piped through a JSON parser'
        - 'java -jar target/quarkus-app/quarkus-run.jar query graph -w src/test/workspaces/case_graph_dangling.yaml'
      success_criteria:
        - 'full suite: 85/85 tests pass, exit 0'
        - 'verify: exit 0'
        - '.custom run: exit 0; output parses as JSON; elements and relationships arrays both non-empty'
        - 'dangling run: exit 1; stderr contains "io.morin.archicode.ArchiCodeException: unable to find the element sol.sys_missing"'
    - task_id: task-004
      methods:
        - 'npx prettier --write "src/**/*.java"'
        - 'manual cross-read of run-0004-resolved-graph-query.md, this pln, and prg-0004'
      success_criteria:
        - 'prettier reports the two new files reformatted (not errored); re-run of the test suite after formatting still green'
        - 'all three documents agree on status'
```

## 11. Escalation Rules

```yaml
escalation_rules:
  rules:
    - condition: './mvnw verify fails for any reason'
      action: 'Investigate with the actual Maven/test error output; this is a small, additive change, so a failure is most likely either a fixture mistake or an unexpected serialization edge case — fix and re-run rather than guessing.'
    - condition: 'the .custom run exits non-zero or produces invalid JSON'
      action: 'Treat this as a genuine finding about the real example workspace (e.g. an actual dangling reference in .custom itself) rather than assuming the command is broken — inspect the specific element/relationship the error names before changing any code.'
    - condition: 'the dangling-fixture run exits 0 (i.e. does not fail)'
      action: 'This would mean resolution was not actually forced for that relationship — a real bug in task-001''s implementation, not a test-fixture problem. Fix the traversal logic, not the test.'
```

This run operates under `complete-run`'s autonomy override, noted here for
completeness; it was never actually exercised, since Section 6 defines no
gates to override and nothing in Section 11 triggered.

## 12. Final Execution Manifest

```yaml
execution_manifest:
  status: 'done'
  recommendation: 'proceed'
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
    - task-003
    - task-004
  parallel_groups: []
  required_human_gates: []
  highest_risk_tasks: []
  lowest_confidence_tasks:
    - task-001
    - task-002
  next_action: 'None — run complete. All criteria below verified true.'
  criteria:
    - 'query graph against .custom/workspace.yaml exits 0 and prints valid JSON containing every element and relationship — TRUE (exit 0; 54 elements, 55 relationships; parsed successfully with python3 -m json.tool equivalent)'
    - 'query graph against a workspace with one dangling relationship destination exits non-zero via an uncaught ArchiCodeException — TRUE (exit 1; stderr: "io.morin.archicode.ArchiCodeException: unable to find the element sol.sys_missing", thrown from ElementIndex.getElementByReference through GetGraphQuery.collect/run, uncaught)'
    - './mvnw verify exits 0 — TRUE (85/85 tests pass across the full suite, including the 2 new GetGraphQueryTest cases)'
```

All four tasks completed as planned, in order, with no deviation from the
Execution Graph and no task marked `blocked`. No human review gate existed
to override. `.custom/` (gitignored, absent from a fresh worktree checkout
per `ASM-2`) was copied in from the main repository checkout solely for
this manual verification step; this created no tracked file and is not
part of the commit the orchestrating session will make.
