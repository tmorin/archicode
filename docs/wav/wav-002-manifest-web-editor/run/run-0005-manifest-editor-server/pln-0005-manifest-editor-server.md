---
title: Execution Plan — Manifest Editor Server
status: done
date: 2026-10-04
related:
  - docs/wav/wav-002-manifest-web-editor/run/run-0005-manifest-editor-server/tdd-0005-manifest-editor-server.md
type: pln
run: 0005
wave: 002
---

# Execution Plan: Manifest Editor Server

## 1. Executive Summary

```yaml
summary:
  status: 'done'
  product_goal: 'Give ArchiCode a local, unauthenticated editor serve command that exposes the resolved graph, a query schemas passthrough, and manifest file read/write (with validation before persisting) over a small REST API — reusing W-1 (query graph) and query schemas in-process, writing nothing outside configured manifest directories.'
  technical_approach: 'Extract reusable methods from GetGraphQuery/GetSchemasQuery; add EditorGroup/ServeEditorCommand (flat in cli/) and EditorHttpServer (JDK com.sun.net.httpserver.HttpServer, no new dependency) with four routes; validate manifest writes via Manifest.class deserialization + ManifestConverter.convert(); guard manifest paths against traversal by exact parent-dir equality with settings.manifests.paths; document the loopback-mapped Docker invocation in README.md.'
  total_tasks: 7
  parallel_groups: 1
  high_risk_tasks: 0
  human_review_gates: 0
  autonomy_level: 'high'
  recommendation: 'proceed'
  criteria:
    - 'GET /api/graph returns the same JSON content query graph would print for the same workspace, and GET /api/manifests/{path} returns a manifest file''s raw content'
    - 'PUT /api/manifests/{path} with a schema-valid payload persists to the correct file and returns 2xx'
    - 'PUT /api/manifests/{path} with a schema-invalid payload returns 4xx and writes nothing'
    - './mvnw verify exits 0, including the unmodified GetGraphQueryTest/GetSchemasQueryTest'
```

## 2. PRD/TDD Consistency Assessment

No PRD exists for this run (infra-facing `TDD+pln` profile — see the TDD's
"PRD Traceability" section). This checks the TDD against its actual source
of requirements: wave 002's manifest entry `W-2` / Phase P2 table row, and
the dispatch brief that scoped this run.

```yaml
consistency_assessment:
  aligned_items:
    - 'TDD TG-1/DEC-1 match W-2 scope: new editor serve command, invoked the same way as views/query'
    - 'TDD TG-2/TG-3/CON-1/DEC-2 match W-2 focus: proxy W-1 (query graph) and query schemas in-process, no second resolution/generation path, no new runtime dependency'
    - 'TDD TG-4/TG-5/TG-6/DEC-4/DEC-5 match W-2 scope and exit evidence: raw manifest read; schema-valid write persists; schema-invalid write is rejected with nothing written'
    - 'TDD TG-7/DEC-7/CON-3 match the wave Non-Goals/Risks: 0.0.0.0 bind required for Docker -p, README example maps the host port to 127.0.0.1 by default'
    - 'TDD DEC-6 matches the dispatch brief: no UI/webapp, bare API is correct scope for this run'
  gaps: []
  blocking_gaps: []
```

No blocking gaps. The TDD's own KDMLLC review (dispatched at `standard`
tier; see prg Findings) found 5 wording/consistency findings against the
TDD's own internal consistency and factual claims about existing code — all
either fixed directly in the TDD or accepted as a deliberate, low-risk
tradeoff; none affects this plan's task breakdown or scope.

## 3. Execution Graph

```yaml
execution_graph:
  nodes:
    - id: task-001
      status: 'done'
      title: 'Extract buildGraph/generateSchema from GetGraphQuery/GetSchemasQuery'
      depends_on: []
      produces:
        - 'src/main/java/io/morin/archicode/cli/GetGraphQuery.java (buildGraph method added)'
        - 'src/main/java/io/morin/archicode/cli/GetSchemasQuery.java (generateSchema method added)'
      agent_role: 'Implementation Agent'
      autonomy: 'autonomous'
      risk: 'low'
      confidence: 90
    - id: task-002
      status: 'done'
      title: 'Add test fixture editor_manifests/ (workspace + manifests dir)'
      depends_on: []
      produces:
        - 'src/test/workspaces/editor_manifests/workspace.yaml'
        - 'src/test/workspaces/editor_manifests/manifests/per_a.yaml'
        - 'src/test/workspaces/editor_manifests/manifests/sol_a.yaml'
      agent_role: 'QA Agent'
      autonomy: 'autonomous'
      risk: 'low'
      confidence: 90
    - id: task-003
      status: 'done'
      title: 'Implement EditorGroup, ServeEditorCommand, EditorHttpServer; register in ArchiCode'
      depends_on: ['task-001']
      produces:
        - 'src/main/java/io/morin/archicode/cli/EditorGroup.java'
        - 'src/main/java/io/morin/archicode/cli/ServeEditorCommand.java'
        - 'src/main/java/io/morin/archicode/cli/EditorHttpServer.java'
        - 'src/main/java/io/morin/archicode/cli/ArchiCode.java (subcommand registration)'
      agent_role: 'Implementation Agent'
      autonomy: 'autonomous'
      risk: 'medium'
      confidence: 80
    - id: task-004
      status: 'done'
      title: 'Add EditorHttpServerTest covering the four P2 gate criteria'
      depends_on: ['task-002', 'task-003']
      produces:
        - 'src/test/java/io/morin/archicode/cli/EditorHttpServerTest.java'
      agent_role: 'QA Agent'
      autonomy: 'autonomous'
      risk: 'low'
      confidence: 85
    - id: task-005
      status: 'done'
      title: 'Document editor serve in README.md with the loopback-mapped invocation'
      depends_on: ['task-003']
      produces:
        - 'README.md (new "Serve the manifest editor" example)'
      agent_role: 'Documentation Agent'
      autonomy: 'autonomous'
      risk: 'low'
      confidence: 90
    - id: task-006
      status: 'done'
      title: 'Run the full verification suite and the exit-evidence-specific manual checks'
      depends_on: ['task-004', 'task-005']
      produces:
        - 'Verification evidence: unit test results, packaged-CLI HTTP checks against .custom'
      agent_role: 'QA Agent'
      autonomy: 'autonomous'
      risk: 'low'
      confidence: 90
    - id: task-007
      status: 'done'
      title: 'Format sources, finalize run documents and prg'
      depends_on: ['task-006']
      produces:
        - 'Prettier-formatted new/modified Java sources'
        - 'run-0005-manifest-editor-server.md at status completed'
        - 'pln execution_manifest.status done'
        - 'prg-0005 Log/Findings/Lessons updated'
      agent_role: 'Release Agent'
      autonomy: 'autonomous'
      risk: 'low'
      confidence: 95
  edges:
    - from: task-001
      to: task-003
      reason: 'EditorHttpServer calls GetGraphQuery.buildGraph and GetSchemasQuery.generateSchema, which must exist first.'
    - from: task-002
      to: task-004
      reason: 'The HTTP server test needs a real file-backed manifest fixture to exercise GET/PUT.'
    - from: task-003
      to: task-004
      reason: 'The test exercises the server implemented in task-003.'
    - from: task-003
      to: task-005
      reason: 'The README example documents the actual --port/--host options and command name task-003 defines.'
    - from: task-004
      to: task-006
      reason: 'Full verification needs the new test in place.'
    - from: task-005
      to: task-006
      reason: 'Verification checks the README example itself (DEC-7), so the doc must exist first.'
    - from: task-006
      to: task-007
      reason: 'The final report and status updates need every verification result in hand.'
```

## 4. Task Catalog

```yaml
task_catalog:
  tasks:
    - id: task-001
      title: 'Extract buildGraph/generateSchema from GetGraphQuery/GetSchemasQuery'
      source_requirements:
        prd: []
        tdd:
          - 'IMP-1'
          - 'IMP-2'
          - 'CON-1'
          - 'TG-8'
      outputs:
        - 'GetGraphQuery.buildGraph(Workspace): Graph — extract-method, same output as today'
        - 'GetSchemasQuery.generateSchema(SchemaType): JsonSchema — extract-method, same output as today'
      verification:
        - './mvnw -q -DskipTests compile succeeds'
        - 'existing GetGraphQueryTest/GetSchemasQueryTest pass unmodified (proves no behavior change)'
      risk: 'low'
      confidence: 90
      human_review: 'none'
      escalation_triggers:
        - 'either existing test needs modification to keep passing (would mean the refactor changed behavior)'
      delegation_tier: 'standard'
    - id: task-002
      title: 'Add test fixture editor_manifests/ (workspace + manifests dir)'
      source_requirements:
        prd: []
        tdd:
          - 'IMP-6'
          - 'ASM-4'
      outputs:
        - 'editor_manifests/workspace.yaml + manifests/per_a.yaml + manifests/sol_a.yaml, modeled on .custom/manifests/*.yaml'
      verification:
        - 'query graph -w src/test/workspaces/editor_manifests/workspace.yaml (run inline via GetGraphQueryTest-style harness) resolves per_a -> sol_a without error'
      risk: 'low'
      confidence: 90
      human_review: 'none'
      escalation_triggers:
        - 'none hit'
      delegation_tier: 'standard'
    - id: task-003
      title: 'Implement EditorGroup, ServeEditorCommand, EditorHttpServer; register in ArchiCode'
      source_requirements:
        prd: []
        tdd:
          - 'TG-1'
          - 'TG-2'
          - 'TG-3'
          - 'TG-4'
          - 'TG-5'
          - 'TG-6'
          - 'TG-7'
          - 'DEC-1'
          - 'DEC-2'
          - 'DEC-3'
          - 'DEC-4'
          - 'DEC-5'
          - 'DEC-6'
          - 'DEC-7'
          - 'IMP-3'
          - 'IMP-4'
          - 'IMP-5'
          - 'IMP-7'
      outputs:
        - 'EditorGroup.java / ServeEditorCommand.java (-p/--port default 8080, --host default 0.0.0.0)'
        - 'EditorHttpServer.java: GET /api/graph, GET /api/schemas/{type}, GET+PUT /api/manifests/{path}, GET / placeholder'
        - 'ArchiCode.java: EditorGroup added to subcommands'
      verification:
        - './mvnw -q -DskipTests compile succeeds'
      risk: 'medium'
      confidence: 80
      human_review: 'review_before (default policy: new unauthenticated network-facing surface with filesystem write + path-traversal guard counts as security-sensitive code) — executed autonomously under complete-run''s explicit autonomy override; see Section 6/11.'
      escalation_triggers:
        - 'the path-traversal guard (DEC-5) can be bypassed by any {path} value reaching outside settings.manifests.paths'
        - 'a write succeeds despite Manifest.class/ManifestConverter.convert() throwing (would violate TG-6)'
      delegation_tier: 'standard'
    - id: task-004
      title: 'Add EditorHttpServerTest covering the four P2 gate criteria'
      source_requirements:
        prd: []
        tdd:
          - 'IMP-8'
          - 'TG-2'
          - 'TG-3'
          - 'TG-4'
          - 'TG-5'
          - 'TG-6'
      outputs:
        - 'EditorHttpServerTest.java: starts the server on an ephemeral port against a temp copy of editor_manifests/, uses java.net.http.HttpClient for GET /api/graph, GET /api/schemas/{workspace,manifest}, GET/PUT /api/manifests/{path} (valid + invalid payload), asserts the invalid write leaves the file byte-identical'
      verification:
        - './mvnw -q test -Dtest=EditorHttpServerTest passes'
      risk: 'low'
      confidence: 85
      human_review: 'none'
      escalation_triggers:
        - 'the invalid-payload test does not actually leave the file unchanged (would mean DEC-4''s validate-before-write ordering is broken)'
      delegation_tier: 'standard'
    - id: task-005
      title: 'Document editor serve in README.md with the loopback-mapped invocation'
      source_requirements:
        prd: []
        tdd:
          - 'IMP-9'
          - 'DEC-7'
          - 'TG-7'
      outputs:
        - 'README.md: new example using -p 127.0.0.1:8080:8080, with a one-line rationale note'
      verification:
        - 'manual read-through: matches the existing four examples'' shape; port mapping is loopback, not bare -p 8080:8080'
      risk: 'low'
      confidence: 90
      human_review: 'none'
      escalation_triggers:
        - 'none hit'
      delegation_tier: 'standard'
    - id: task-006
      title: 'Run the full verification suite and the exit-evidence-specific manual checks'
      source_requirements:
        prd: []
        tdd:
          - 'Observability and Verification'
      outputs:
        - './mvnw test (full suite) result'
        - './mvnw verify result'
        - 'packaged-jar editor serve run against .custom/workspace.yaml: curl-based checks for all four TG-2/TG-4/TG-5/TG-6/TG-7 criteria'
      verification:
        - './mvnw verify exits 0'
        - 'curl GET /api/graph matches query graph -w .custom/workspace.yaml output'
        - 'curl GET /api/manifests/manifests/app.collaborator.yaml matches the file on disk'
        - 'curl PUT with a valid payload returns 2xx and the file is unchanged/updated as expected'
        - 'curl PUT with an invalid payload (missing content.id) returns 4xx and the file is byte-identical to before'
      risk: 'low'
      confidence: 90
      human_review: 'none'
      escalation_triggers:
        - 'any test failure, unexpected HTTP status, or a write observed despite an invalid payload'
      delegation_tier: 'standard'
    - id: task-007
      title: 'Format sources, finalize run documents and prg'
      source_requirements:
        prd: []
        tdd: []
      outputs:
        - 'Prettier-formatted sources'
        - 'run-0005-manifest-editor-server.md status updated'
        - 'pln execution_manifest.status updated'
        - 'prg-0005 Log/Findings/Lessons updated'
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
  groups:
    - group_id: 'group-1'
      tasks: ['task-001', 'task-002']
      rationale: 'task-001 (refactor two existing CLI classes) and task-002 (new, isolated test fixture files) touch disjoint files with no dependency between them.'
```

Every other task is sequential: `task-003` needs `task-001`'s extracted
methods; `task-004` needs both `task-002`'s fixture and `task-003`'s server;
`task-005` needs `task-003`'s actual option names; `task-006` needs
`task-004`/`task-005` in place; `task-007` needs `task-006`'s results. In
practice this run executes inline in one session (see Section 9's note), so
the parallel group is documented for correctness rather than exercised as a
concurrent dispatch.

## 6. Human Review Gates

```yaml
human_review_gates:
  gates: []
```

None actually enforced. Per the default autonomy policy, `task-003` (a new,
unauthenticated, network-facing surface with filesystem write access) falls
under "security-sensitive code" (`review_before`). This run operates under
`complete-run`'s explicit autonomy override: review-before/human-required
categories do not stop execution on category label alone — only a
genuinely unresolvable question does. There is no such question here: the
TDD's `DEC-4`/`DEC-5` already settled the validation and path-traversal
design with concrete, verifiable rules, and `task-004`/`task-006` verify
those rules mechanically (a failing traversal guard or a write-on-invalid-
payload is caught by an automated test/curl check, not left to review). The
override is therefore exercised here — unlike run-0004, where no gate
existed to override at all — and is noted in Section 11 as well.

## 7. Risk Assessment

```yaml
risk_assessment:
  by_task:
    - id: task-001
      risk: 'low'
      rationale: 'Pure extract-method on two existing, small, well-tested classes; existing tests are the regression guard.'
    - id: task-002
      risk: 'low'
      rationale: 'New, isolated fixture files modeled directly on .custom''s own real-world shape; no existing fixture touched.'
    - id: task-003
      risk: 'medium'
      rationale: 'New unauthenticated HTTP surface with filesystem write access (first writer of manifest files this repo has ever had) and a hand-rolled path-traversal guard (DEC-5) — gets its risk from blast radius if the guard is wrong, not from implementation difficulty. Mitigated by DEC-5''s exact-parent-dir-equality rule being simple enough to verify directly, and by task-004/task-006''s explicit traversal/validation tests.'
    - id: task-004
      risk: 'low'
      rationale: 'New, isolated test class; exercises task-003''s code without modifying it.'
    - id: task-005
      risk: 'low'
      rationale: 'Documentation-only change, additive section.'
    - id: task-006
      risk: 'low'
      rationale: 'Read-only verification (plus one temp-directory-scoped write check); no side effects on tracked files.'
    - id: task-007
      risk: 'low'
      rationale: 'Formatting and documentation bookkeeping only.'
  by_area:
    - area: 'cli'
      risk: 'low'
      rationale: 'One new, additive subcommand group; every existing subcommand''s behavior is unchanged (TG-8).'
    - area: 'security'
      risk: 'medium'
      rationale: 'First network-facing, write-capable surface in this codebase. No authentication by design (wave Non-Goals) — the only guards are DEC-5''s path-traversal check and DEC-7''s documented, loopback-mapped Docker invocation, both specified precisely enough to verify mechanically rather than by judgment call.'
```

## 8. Confidence Assessment

```yaml
confidence_assessment:
  by_task:
    - id: task-001
      score: 90
      rationale: 'Mechanical extract-method; design fully settled by the TDD.'
    - id: task-002
      score: 90
      rationale: 'Fixture shape mirrors .custom''s own real manifests exactly.'
    - id: task-003
      score: 80
      rationale: 'More moving parts than a typical standard-tier task (new HTTP server, four routes, a security guard) but every one of them was fully designed in the TDD (DEC-1 through DEC-7) before this task starts — the remaining uncertainty is mechanical translation, not open design.'
    - id: task-004
      score: 85
      rationale: 'Test shape is dictated directly by the wave''s own P2 gate criteria; java.net.http.HttpClient usage is standard JDK API.'
    - id: task-005
      score: 90
      rationale: 'Mirrors four existing README examples exactly, one new line of rationale.'
    - id: task-006
      score: 90
      rationale: 'All checks are deterministic pass/fail; actually run and confirmed, not inferred.'
    - id: task-007
      score: 95
      rationale: 'Bookkeeping with a clear template to follow (manage-runs conventions, run-0004 precedent).'
```

## 9. Agent Assignment Plan

```yaml
agent_assignment_plan:
  assignments:
    - task_id: task-001
      agent_role: 'Implementation Agent'
      objective: 'Extract GetGraphQuery.buildGraph(Workspace) and GetSchemasQuery.generateSchema(SchemaType) per TDD IMP-1/IMP-2, with no change to run()''s own output.'
      context:
        prd_excerpts: []
        tdd_excerpts: ['IMP-1', 'IMP-2', 'CON-1']
      likely_files:
        - 'src/main/java/io/morin/archicode/cli/GetGraphQuery.java'
        - 'src/main/java/io/morin/archicode/cli/GetSchemasQuery.java'
      acceptance_criteria:
        - 'existing GetGraphQueryTest/GetSchemasQueryTest pass unmodified'
      verification:
        - './mvnw -q test -Dtest=GetGraphQueryTest,GetSchemasQueryTest'
      escalation_triggers:
        - 'none hit'
      suggested_subagent_type: '(inline)'
      suggested_model: '(default)'
    - task_id: task-002
      agent_role: 'QA Agent'
      objective: 'Add editor_manifests/ fixture (workspace.yaml + two manifest files) per TDD IMP-6/ASM-4, modeled on .custom/manifests/*.yaml.'
      context:
        prd_excerpts: []
        tdd_excerpts: ['IMP-6', 'ASM-4']
      likely_files:
        - 'src/test/workspaces/editor_manifests/workspace.yaml'
        - 'src/test/workspaces/editor_manifests/manifests/per_a.yaml'
        - 'src/test/workspaces/editor_manifests/manifests/sol_a.yaml'
      acceptance_criteria:
        - 'the fixture resolves cleanly (per_a -> sol_a) through the existing graph-building path'
      verification:
        - 'exercised indirectly via task-004''s test'
      escalation_triggers:
        - 'none hit'
      suggested_subagent_type: '(inline)'
      suggested_model: '(default)'
    - task_id: task-003
      agent_role: 'Implementation Agent'
      objective: 'Implement EditorGroup/ServeEditorCommand/EditorHttpServer per TDD DEC-1 through DEC-7, register in ArchiCode.'
      context:
        prd_excerpts: []
        tdd_excerpts: ['DEC-1', 'DEC-2', 'DEC-3', 'DEC-4', 'DEC-5', 'DEC-6', 'DEC-7', 'IMP-3', 'IMP-4', 'IMP-5', 'IMP-7']
      likely_files:
        - 'src/main/java/io/morin/archicode/cli/EditorGroup.java'
        - 'src/main/java/io/morin/archicode/cli/ServeEditorCommand.java'
        - 'src/main/java/io/morin/archicode/cli/EditorHttpServer.java'
        - 'src/main/java/io/morin/archicode/cli/ArchiCode.java'
      acceptance_criteria:
        - 'four routes behave per CTR-1 through CTR-4'
        - 'DEC-5''s traversal guard rejects any path outside settings.manifests.paths'
      verification:
        - './mvnw -q -DskipTests compile'
      escalation_triggers:
        - 'the traversal guard can be bypassed'
        - 'a write succeeds despite invalid content'
      suggested_subagent_type: '(inline)'
      suggested_model: '(default)'
    - task_id: task-004
      agent_role: 'QA Agent'
      objective: 'Add EditorHttpServerTest exercising all four P2 gate criteria against an ephemeral-port server over a temp copy of editor_manifests/.'
      context:
        prd_excerpts: []
        tdd_excerpts: ['IMP-8']
      likely_files:
        - 'src/test/java/io/morin/archicode/cli/EditorHttpServerTest.java'
      acceptance_criteria:
        - 'valid write persists; invalid write is rejected and leaves the file byte-identical'
      verification:
        - './mvnw -q test -Dtest=EditorHttpServerTest'
      escalation_triggers:
        - 'the invalid-payload case does not leave the file unchanged'
      suggested_subagent_type: '(inline)'
      suggested_model: '(default)'
    - task_id: task-005
      agent_role: 'Documentation Agent'
      objective: 'Add a README.md example for editor serve per DEC-7, mapping the host port to 127.0.0.1 by default.'
      context:
        prd_excerpts: []
        tdd_excerpts: ['IMP-9', 'DEC-7']
      likely_files:
        - 'README.md'
      acceptance_criteria:
        - 'example uses -p 127.0.0.1:8080:8080, not bare -p 8080:8080'
      verification:
        - 'manual read-through against the TDD''s DEC-7'
      escalation_triggers:
        - 'none hit'
      suggested_subagent_type: '(inline)'
      suggested_model: '(default)'
    - task_id: task-006
      agent_role: 'QA Agent'
      objective: 'Run the full test suite, verify gate, and curl-based exit-evidence checks against .custom.'
      context:
        prd_excerpts: []
        tdd_excerpts: ['Observability and Verification']
      likely_files:
        - '.custom/workspace.yaml'
      acceptance_criteria:
        - 'all four P2 gate criteria hold against a locally running instance'
      verification:
        - 'command output and HTTP status codes inspected directly'
      escalation_triggers:
        - 'any mismatch'
      suggested_subagent_type: '(inline)'
      suggested_model: '(default)'
    - task_id: task-007
      agent_role: 'Release Agent'
      objective: 'Run Prettier over new/modified Java sources and finalize run-0005/pln/prg status.'
      context:
        prd_excerpts: []
        tdd_excerpts: []
      likely_files:
        - 'docs/wav/wav-002-manifest-web-editor/run/run-0005-manifest-editor-server/**'
      acceptance_criteria:
        - 'run status, pln status, and prg status all agree with reality'
      verification:
        - 'manual cross-read of the three files'
      escalation_triggers:
        - 'none'
      suggested_subagent_type: '(inline)'
      suggested_model: '(default)'
```

**Note on `(inline)` routing.** Every task is marked `(inline)` rather than
dispatched to a further `Agent` call, for the same reasons run-0004's pln
recorded: this run is itself one unit of delegation already dispatched by
`complete-wave` (`run-executor`, `standard` tier per wave 002's manifest);
every task's design is fully settled by the TDD's own completed `DEC-1`
through `DEC-7` work, leaving no remaining ambiguity for a further subagent
to resolve; and verification (`task-006`) needs the orchestrating session's
own real-time reading of HTTP status codes and file diffs, which the
Delegation Policy reserves for inline execution. The KDMLLC review of the
TDD itself (drafting-time, not an execution task) *was* dispatched to a
`standard`-tier subagent, per `complete-run`'s own Stage 5 — that dispatch
is already reflected in the prg, not repeated here as a pln task.

## 10. Verification Plan

```yaml
verification_plan:
  checks:
    - task_id: task-001
      methods:
        - './mvnw -q test -Dtest=GetGraphQueryTest,GetSchemasQueryTest'
      success_criteria:
        - 'both test classes pass unmodified'
    - task_id: task-002
      methods:
        - 'covered by task-004''s test, not independently'
      success_criteria:
        - 'n/a — see task-004'
    - task_id: task-003
      methods:
        - './mvnw -q -DskipTests compile'
      success_criteria:
        - 'compiles with no errors'
    - task_id: task-004
      methods:
        - './mvnw -q test -Dtest=EditorHttpServerTest'
      success_criteria:
        - 'all assertions pass, including the invalid-payload byte-identical check'
    - task_id: task-005
      methods:
        - 'manual read-through'
      success_criteria:
        - 'README example present, loopback-mapped, matches existing examples'' shape'
    - task_id: task-006
      methods:
        - './mvnw -q test (full suite)'
        - './mvnw -q verify'
        - 'packaged editor serve run against .custom/workspace.yaml + curl for all four gate criteria'
      success_criteria:
        - 'full suite and verify both exit 0'
        - 'GET /api/graph output matches query graph''s own output'
        - 'GET /api/manifests/... matches the file on disk'
        - 'valid PUT returns 2xx and persists'
        - 'invalid PUT returns 4xx and the file is unchanged (diffed before/after)'
    - task_id: task-007
      methods:
        - 'npx prettier --write "src/**/*.java"'
        - 'manual cross-read of run-0005-manifest-editor-server.md, this pln, and prg-0005'
      success_criteria:
        - 'prettier reports only the new/modified files reformatted; suite still green after'
        - 'all three documents agree on status'
```

## 11. Escalation Rules

```yaml
escalation_rules:
  rules:
    - condition: './mvnw verify fails for any reason'
      action: 'Investigate with the actual Maven/test error output; fix and re-run rather than guessing.'
    - condition: 'the path-traversal guard (DEC-5) can be bypassed (a {path} value outside settings.manifests.paths is readable or writable)'
      action: 'Treat as a genuine security defect in task-003''s implementation, not a test-fixture problem — fix EditorHttpServer''s guard logic before proceeding to task-006.'
    - condition: 'a PUT with an invalid payload is observed to write to disk'
      action: 'Stop and fix the validate-before-write ordering in EditorHttpServer immediately — this is exactly wave P2''s third gate criterion; do not mark task-006 verified until this is false.'
    - condition: 'the .custom-based manual run exits non-zero or GET /api/graph output does not match query graph''s own output'
      action: 'Inspect the specific discrepancy before changing code — could be a genuine .custom finding (as run-0004 noted for the CLI command) rather than a bug in this run''s HTTP layer.'
```

This run operates under `complete-run`'s autonomy override: `task-003`'s
`review_before` categorization (security-sensitive code, per the default
autonomy policy) does not stop execution — it is executed autonomously,
with the override's condition satisfied because `DEC-4`/`DEC-5` already
resolved the underlying design questions concretely enough for `task-004`/
`task-006` to verify them mechanically rather than by judgment call. No
other rule in this section was triggered during execution (updated at
close-out if that changes).

## 12. Final Execution Manifest

```yaml
execution_manifest:
  status: 'done'
  recommendation: 'proceed'
  autonomy_level: 'high'
  total_tasks: 7
  autonomous_tasks: 7
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
  parallel_groups:
    - 'group-1: task-001, task-002'
  required_human_gates: []
  highest_risk_tasks:
    - task-003
  lowest_confidence_tasks:
    - task-003
  next_action: 'None — run complete. All criteria below verified true.'
  criteria:
    - 'GET /api/graph returns the same JSON content query graph would print for the same workspace, and GET /api/manifests/{path} returns a manifest file''s raw content — TRUE (against .custom/: GET /api/graph byte-equal to `query graph -w .custom/workspace.yaml`''s own stdout, 54 elements/55 relationships; GET /api/manifests/manifests/app.collaborator.yaml byte-equal to the file on disk)'
    - 'PUT /api/manifests/{path} with a schema-valid payload persists to the correct file and returns 2xx — TRUE (re-submitting the fetched, valid content returned 200; EditorHttpServerTest''s shouldPersistASchemaValidManifestWrite also passes)'
    - 'PUT /api/manifests/{path} with a schema-invalid payload returns 4xx and writes nothing — TRUE (a payload missing content.id returned 400 with the Jackson ValueInstantiationException message; the target file was byte-identical before/after, both via the manual .custom check and EditorHttpServerTest''s shouldRejectASchemaInvalidManifestWriteAndWriteNothing)'
    - './mvnw verify exits 0, including the unmodified GetGraphQueryTest/GetSchemasQueryTest — TRUE (94/94 tests pass across the full suite — 85 pre-existing + 9 new EditorHttpServerTest cases; GetGraphQueryTest/GetSchemasQueryTest pass unmodified, confirming the extract-method refactor is behavior-preserving; ./mvnw verify exits 0, Failsafe ITs skipped by default per pom.xml''s skipITs=true, unchanged by this run)'
```

All seven tasks completed as planned, in dependency order, with no task
marked `blocked`. The one `review_before`-categorized task (`task-003`)
was executed under `complete-run`'s autonomy override, as Section 6/11
anticipated; no escalation rule in Section 11 was actually triggered. One
mid-implementation correction (a wrong FQN for the Jackson "legacy" schema
class, `com.fasterxml.jackson.module.jsonSchema.jakarta.JsonSchema` not
`...jsonSchema.JsonSchema`) was caught by the compiler before any test ran
and is not a blocker. `editor_manifests/` (renamed from an initial
`case_editor/` after discovering `src/test/workspaces/.gitignore`'s
`/case_*/` rule — meant for generated PlantUML output dirs like
`case_a_yaml/` — would otherwise have silently excluded this run's new,
deliberately-committed source fixture from version control) is the only
deviation from the TDD's/pln's originally-written path; both documents
were updated in place to the real, final name.
