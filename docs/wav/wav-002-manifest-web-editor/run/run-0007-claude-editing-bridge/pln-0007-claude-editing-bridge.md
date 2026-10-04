---
title: Claude Editing Bridge — Execution Plan
status: active
owner: run-0007
date: 2026-10-04
related:
  - docs/wav/wav-002-manifest-web-editor/run/run-0007-claude-editing-bridge/prd-0007-claude-editing-bridge.md
  - docs/wav/wav-002-manifest-web-editor/run/run-0007-claude-editing-bridge/tdd-0007-claude-editing-bridge.md
  - docs/wav/wav-002-manifest-web-editor/wav-002-manifest-web-editor.md
type: pln
run: 0007
wave: 002
---

# Claude Editing Bridge — Execution Plan

## 1. Executive Summary

Ten tasks. Five of them are the safety core and stay **inline in the
orchestrating session** regardless of how mechanical a part of them looks,
because each is `risk: critical` or `high` on the containment/discard path and
`write-execution-plan`'s Delegation Policy makes that non-negotiable. Four are
genuinely isolated against a fixed contract and are dispatched. One is the
final verification pass, which runs the real `claude` binary and therefore
stays inline too.

```yaml
summary:
  status: 'done'
  product_goal: 'Let a human describe a manifest change in prose in the editor webapp, have Claude apply it to the real files, and review the result as a diff that must be explicitly accepted — with a discard that restores every captured file byte-for-byte and no ability to write outside the served workspace directory.'
  technical_approach: 'Four new classes plus one extracted class under src/main/java/io/morin/archicode/cli/, one new /api/claude/ route group on the existing EditorHttpServer, and a third tab in the existing single-page webapp. Containment is the subprocess own configuration (cwd = workspace dir, --restricted, an explicit tool list with no command-execution tool, acceptEdits + --permission-prompts none). Reversibility is an in-memory, immutable, bounded content capture of the whole workspace directory taken before the invocation; discard restores from that capture alone and never from the diff. No new Maven or frontend dependency.'
  total_tasks: 10
  parallel_groups: 2
  high_risk_tasks: 5
  human_review_gates: 3
  autonomy_level: 'medium'
  recommendation: 'proceed_with_review'
  criteria:
    - 'JAVA_HOME=~/.sdkman/candidates/java/25.0.4-tem ./mvnw -B verify is green, with EditorHttpServerTest.java and pom.xml unmodified (PRD NFR-4, NFR-5)'
    - 'every PRD AC- in the TDD Observability and Verification automated table is covered by a passing test'
    - 'AC-1 and AC-10 verified live against the real claude binary on a disposable workspace copy: a prompted change is applied and accept leaves it readable through GET /api/manifests/{path}'
    - 'AC-6 to AC-9 verified live by checksum: after discard, md5sum -c over a pre-invocation manifest reports every file OK and no stray file or directory remains'
    - 'AC-12 verified live: a plausibly-framed out-of-workspace prompt creates no file outside the workspace directory and the attempt appears in permissionDenials'
    - 'git status --porcelain in /home/tibo/git-perso/archicode shows no tracked file modified by any claude subprocess, checked after every live invocation'
    - 'gate-003 (wave-level review of the shipped guarantee) is left open for the orchestrator/human, not self-certified'
```

## 2. PRD/TDD Consistency Assessment

The C scan was run as `complete-run` Stage 7 before this plan was drafted and
its corrections are already applied to both documents (see `prg-0007`,
Stage 7 log entry). What remains recorded here is the residual state.

```yaml
consistency_assessment:
  aligned_items:
    - 'every PRD FR-1..FR-12 and NFR-1..NFR-6 maps to a TDD DEC-/IMP-/CTR- item via the TDD PRD Traceability table'
    - 'all seventeen PRD AC- items appear in the TDD Observability and Verification section, each marked automated or hand-run'
    - 'PRD NFR-1 writable-subset-of-captured requirement matches TDD DEC-2 (containment), DEC-3 (capture), DEC-15 (refuse symlinks) and RISK-10 (named residual)'
    - 'PRD FR-5 discard semantics match TDD DEC-3 as the single owner of the restore algorithm, with CTR-4 stating the guarantee only'
    - 'PRD FR-10 one-at-a-time matches TDD DEC-7 (compare-and-set) and is made observable by DEC-16 (executor)'
    - 'PRD TC-6 likely_paths deviation is discharged by TDD RISK-9, which names this run actual paths'
  gaps:
    - id: gap-001
      type: 'risk'
      description: 'TDD ASM-1/ASM-3 rest on a probe of the full hardened command (prg-0007 F-6) run once, by hand, against claude 2.1.280. DEC-14 deliberately keeps the real binary out of the automated suite, so a future CLI change would leave ./mvnw verify green while the capability breaks at runtime.'
      impact: 'medium'
      recommendation: 'Accepted as TDD RISK-3. Mitigated by defensive parsing (ASM-2) and by the capture/diff being independent of the CLI output, so the worst case is a clear failure with a discardable session. Do not add a money-spending test to CI to close it.'
    - id: gap-002
      type: 'risk'
      description: 'Hooks from managed settings or installed plugins survive --restricted and are a command-execution path the tool allow-list does not cover, so PRD NFR-1 containment is not total.'
      impact: 'medium'
      recommendation: 'Accepted and named as TDD RISK-10 per PRD NFR-1 own requirement to name residuals. No free fix exists: --bare removes hooks but breaks authentication (prg-0007 F-1).'
    - id: gap-003
      type: 'risk'
      description: 'A hand save through the unchanged PUT /api/manifests/{path} during the pending-review window becomes part of the reviewed change and is reverted by a discard. Closing it server-side would change an existing endpoint contract, which PRD NFR-5 forbids in this run.'
      impact: 'low'
      recommendation: 'Accepted as TDD RISK-8 with a client-side-only mitigation in T-7 (Save disabled while pending) and TDD DEF-7 recording the server-side fix for a run that is allowed to change that contract.'
    - id: gap-004
      type: 'risk'
      description: 'A pending change does not survive the server process (TDD DEC-6): if the server stops mid-review the files stay changed with no automatic way to discard.'
      impact: 'medium'
      recommendation: 'Accepted as TDD RISK-1. Mitigated by a shutdown WARN naming every affected path, by the pending banner stating it, and by the README. TDD DEF-1 records the persistent-capture design.'
  blocking_gaps: []
```

## 3. Execution Graph

```yaml
execution_graph:
  nodes:
    - id: task-001
      status: 'done'
      title: 'LineDiff: unified line diff with binary and size guards, plus its unit tests'
      depends_on: []
      produces:
        - 'src/main/java/io/morin/archicode/cli/LineDiff.java'
        - 'src/test/java/io/morin/archicode/cli/LineDiffTest.java'
      agent_role: 'Backend Implementation Agent'
      autonomy: 'autonomous'
      risk: 'low'
      confidence: 92
    - id: task-002
      status: 'done'
      title: 'WorkspaceLayout: extract workspace-dir and configured-manifests-dir resolution, delegate EditorHttpServer existing call sites'
      depends_on: []
      produces:
        - 'src/main/java/io/morin/archicode/cli/WorkspaceLayout.java'
        - 'modified src/main/java/io/morin/archicode/cli/EditorHttpServer.java'
      agent_role: 'Refactoring Agent'
      autonomy: 'review_after'
      risk: 'high'
      confidence: 88
    - id: task-003
      status: 'done'
      title: 'WorkspaceCapture: bounded immutable capture, diff, and the restore that IS the discard guarantee, plus its unit tests'
      depends_on: []
      produces:
        - 'src/main/java/io/morin/archicode/cli/WorkspaceCapture.java'
        - 'src/test/java/io/morin/archicode/cli/WorkspaceCaptureTest.java'
      agent_role: 'Backend Implementation Agent'
      autonomy: 'review_before'
      risk: 'critical'
      confidence: 85
    - id: task-004
      status: 'done'
      title: 'ClaudeCliInvoker: the hardened subprocess, its spool files, its environment scrubbing, its timeout and its availability probe'
      depends_on: []
      produces:
        - 'src/main/java/io/morin/archicode/cli/ClaudeCliInvoker.java'
      agent_role: 'Backend Implementation Agent'
      autonomy: 'review_before'
      risk: 'critical'
      confidence: 82
    - id: task-005
      status: 'done'
      title: 'ClaudeBridge: refusal ordering, single-session compare-and-set, unconditional session install, accept and discard'
      depends_on: [task-001, task-002, task-003, task-004]
      produces:
        - 'src/main/java/io/morin/archicode/cli/ClaudeBridge.java'
      agent_role: 'Backend Implementation Agent'
      autonomy: 'review_before'
      risk: 'critical'
      confidence: 83
    - id: task-006
      status: 'done'
      title: 'EditorHttpServer /api/claude/ routes and executor; ServeEditorCommand options and shutdown warning; the escaping-manifests-dir fixture'
      depends_on: [task-005]
      produces:
        - 'modified src/main/java/io/morin/archicode/cli/EditorHttpServer.java'
        - 'modified src/main/java/io/morin/archicode/cli/ServeEditorCommand.java'
        - 'src/test/workspaces/editor_outside_manifests/workspace.yaml'
      agent_role: 'Backend Implementation Agent'
      autonomy: 'review_before'
      risk: 'high'
      confidence: 86
    - id: task-007
      status: 'done'
      title: 'Webapp Assist tab: availability signal, prompt box, diff rendering, pending banner, accept and discard'
      depends_on: [task-006]
      produces:
        - 'modified src/main/resources/editor-webapp/index.html'
      agent_role: 'Frontend Implementation Agent'
      autonomy: 'autonomous'
      risk: 'medium'
      confidence: 87
    - id: task-008
      status: 'done'
      title: 'README: the capability, its claude-on-the-host precondition, --no-claude, and that a discard restores the whole workspace directory'
      depends_on: [task-006]
      produces:
        - 'modified README.md'
      agent_role: 'Documentation Agent'
      autonomy: 'autonomous'
      risk: 'low'
      confidence: 90
    - id: task-009
      status: 'done'
      title: 'ClaudeBridgeTest: real-HTTP tests over stand-in executables covering every automated row of the TDD verification table'
      depends_on: [task-006]
      produces:
        - 'src/test/java/io/morin/archicode/cli/ClaudeBridgeTest.java'
      agent_role: 'Test Generation Agent'
      autonomy: 'autonomous'
      risk: 'medium'
      confidence: 84
    - id: task-010
      status: 'done'
      title: 'Verification: full mvnw verify, then live accept, discard and containment checks against a disposable workspace copy with the real claude binary'
      depends_on: [task-007, task-008, task-009]
      produces:
        - 'recorded verification results in prg-0007 Findings'
        - 'updated execution_manifest.status'
      agent_role: 'QA Agent'
      autonomy: 'review_before'
      risk: 'critical'
      confidence: 80
  edges:
    - from: task-001
      to: task-005
      reason: 'ClaudeBridge renders each change entry diff with LineDiff'
    - from: task-002
      to: task-005
      reason: 'ClaudeBridge pre-flight containment check resolves the configured manifests dirs through WorkspaceLayout'
    - from: task-003
      to: task-005
      reason: 'ClaudeBridge captures, diffs and restores through WorkspaceCapture'
    - from: task-004
      to: task-005
      reason: 'ClaudeBridge runs the invocation and the availability probe through ClaudeCliInvoker'
    - from: task-005
      to: task-006
      reason: 'the routes delegate to ClaudeBridge public surface, so that surface must exist first'
    - from: task-006
      to: task-007
      reason: 'the webapp consumes the four /api/claude/ routes and CTR-1 pending object'
    - from: task-006
      to: task-008
      reason: 'the README documents the final CLI option names and defaults'
    - from: task-006
      to: task-009
      reason: 'the tests drive the real server over HTTP, so the routes and the settings overload must exist'
    - from: task-007
      to: task-010
      reason: 'the hand-run checks read the served page and exercise what it calls'
    - from: task-008
      to: task-010
      reason: 'verification confirms the documented precondition matches the shipped behaviour'
    - from: task-009
      to: task-010
      reason: 'mvnw verify must include the new tests'
```

## 4. Task Catalog

```yaml
task_catalog:
  tasks:
    - id: task-001
      title: 'LineDiff: unified line diff with binary and size guards, plus its unit tests'
      source_requirements:
        prd: ['FR-4', 'NFR-4', 'AC-3']
        tdd: ['DEC-9', 'IMP-3', 'CON-1']
      outputs:
        - 'LineDiff.unified(beforeName, afterName, before, after) returning unified-format text with three lines of context'
        - 'binary detection (a 0x00 byte on either side) and a 4000-line-per-side cap, both reported rather than diffed'
        - 'LineDiffTest covering: single-line modification, pure insertion, pure deletion, created (empty before), deleted (empty after), identical input, binary input, oversize input, and no-trailing-newline input'
      verification:
        - 'JAVA_HOME=~/.sdkman/candidates/java/25.0.4-tem ./mvnw -B test -Dtest=LineDiffTest'
      risk: 'low'
      confidence: 92
      human_review: 'none'
      escalation_triggers:
        - 'the DP LCS cannot be kept exact within the stated guards without a new dependency (CON-1 forbids one)'
      delegation_tier: 'standard'
    - id: task-002
      title: 'WorkspaceLayout: extract workspace-dir and configured-manifests-dir resolution, delegate EditorHttpServer existing call sites'
      source_requirements:
        prd: ['FR-8', 'NFR-5']
        tdd: ['DEC-8', 'IMP-5', 'IMP-1', 'CON-2']
      outputs:
        - 'WorkspaceLayout with workspaceDir(Path) and manifestsDirs(Path), semantics identical to the code it replaces including the deliberate absence of an existence check'
        - 'EditorHttpServer.resolveManifestsDirs and its three inline workspace-dir derivations replaced by delegation, with no behaviour change'
      verification:
        - './mvnw -B test -Dtest=EditorHttpServerTest — must pass with that file unmodified'
      risk: 'high'
      confidence: 88
      human_review: 'after'
      escalation_triggers:
        - 'the extraction cannot preserve isWithinConfiguredManifestsDir path-traversal semantics exactly'
        - 'any existing test in EditorHttpServerTest would need editing to stay green (forbidden by NFR-5)'
      delegation_tier: 'hard_judgment'
    - id: task-003
      title: 'WorkspaceCapture: bounded immutable capture, diff, and the restore that IS the discard guarantee, plus its unit tests'
      source_requirements:
        prd: ['FR-3', 'FR-5', 'NFR-1', 'NFR-3', 'AC-6', 'AC-7', 'AC-8', 'AC-9']
        tdd: ['DEC-3', 'DEC-5', 'DEC-15', 'IMP-2']
      outputs:
        - 'capture(root, maxFiles, maxBytes): Files.walk without FOLLOW_LINKS, NOFOLLOW_LINKS classification, byte content per relative path, the set of relative directory paths, bounds enforced during the walk, refusal on any symlink or other non-regular non-directory entry'
        - 'diff(root): ordered created/modified/deleted classification, unchanged files omitted'
        - 'restore(root): DEC-3 four ordered steps exactly — create missing captured dirs shallowest-first; per captured file create parent, resolve a type change, write only when bytes differ; delete non-captured regular files; delete non-captured dirs deepest-first'
        - 'WorkspaceCaptureTest: modified/created/deleted round trips by checksum; created subdirectory removed; captured empty directory restored; captured file whose parent was deleted; captured path replaced by a directory; restore run twice (idempotence); symlink-to-outside refused; bound exceeded refused; a no-op restore leaves mtimes untouched'
      verification:
        - './mvnw -B test -Dtest=WorkspaceCaptureTest'
        - 'manual read-through confirming the class has no reference to LineDiff or any diff type (NFR-3)'
      risk: 'critical'
      confidence: 85
      human_review: 'before'
      escalation_triggers:
        - 'byte-identical restore cannot be achieved for any case the tests cover — per the wave Risks section this is a reason to stop and escalate, not to ship a weaker guarantee'
        - 'the capture cannot be made immutable, which would break restore idempotence and CTR-4 retry-safety'
      delegation_tier: 'hard_judgment'
    - id: task-004
      title: 'ClaudeCliInvoker: the hardened subprocess, its spool files, its environment scrubbing, its timeout and its availability probe'
      source_requirements:
        prd: ['FR-2', 'FR-9', 'FR-11', 'NFR-1', 'NFR-2', 'NFR-6', 'AC-1', 'AC-12', 'AC-15']
        tdd: ['DEC-4', 'DEC-11', 'DEC-12', 'DEC-13', 'CTR-6', 'IMP-4', 'CON-4']
      outputs:
        - 'the exact DEC-4 command, built from settings only and never from client input; working directory = the workspace directory; no --add-dir anywhere'
        - 'prompt delivered on stdin from a spool file; stdout and stderr spooled to files; all three in a dedicated Files.createTempDirectory with rwx------/rw------- permissions, deleted in a finally, with a constructor-time assertion that the temp dir real path is not under the workspace root (CON-4 as a checked precondition)'
        - 'environment inherited minus the DEC-12 deny-list, applied to both the invocation and the availability probe; credential-bearing variables kept and never logged or returned'
        - 'bounded wait with destroyForcibly and a 5s grace, reporting outcome completed/failed/timeout'
        - 'defensive JSON parse of subtype, is_error, result, num_turns, total_cost_usd, duration_ms and permission_denials[] per CTR-6 mapping (tool_name, tool_input.file_path, tool_input.content truncated to 2000 chars); a missing or mistyped field yields null, never an exception'
        - 'availability probe: <executable> --version, 10s bound, own temp working directory, outcome cached per process'
      verification:
        - 'exercised indirectly by ClaudeBridgeTest (task-009) stand-ins'
        - 'read-through against IMP-4 four named invariants'
      risk: 'critical'
      confidence: 82
      human_review: 'before'
      escalation_triggers:
        - 'the DEC-4 flag set is rejected by the installed binary (it was probed as prg-0007 F-6, so this would mean a version change)'
        - 'spool files cannot be kept outside the workspace directory on this platform'
      delegation_tier: 'hard_judgment'
    - id: task-005
      title: 'ClaudeBridge: refusal ordering, single-session compare-and-set, unconditional session install, accept and discard'
      source_requirements:
        prd: ['FR-1', 'FR-3', 'FR-5', 'FR-6', 'FR-8', 'FR-9', 'FR-10', 'FR-11', 'NFR-2', 'NFR-3', 'AC-4', 'AC-10', 'AC-11', 'AC-14']
        tdd: ['DEC-7', 'DEC-10', 'DEC-11', 'FLOW-1', 'FLOW-2', 'CTR-1', 'CTR-2', 'CTR-3', 'CTR-4', 'IMP-6']
      outputs:
        - 'FLOW-1 refusal ordering exactly: blank prompt, compare-and-set reservation, availability, containment pre-flight (DEC-8 resolution rule), capture — every refusal above capture releases the reservation and touches no file'
        - 'once capture succeeds, a session is installed unconditionally in a finally: non-empty diff installs capture + rendered diffs; a throw in diff or rendering installs capture + empty changes + message; only a genuinely empty diff releases'
        - 'status/accept/discard per CTR-1/CTR-3/CTR-4, with a failed restore returning 500 and KEEPING the session pending'
        - 'Settings with enabled/executable/model/timeout/capture bounds and Settings.defaults()'
        - 'BridgeRefusal carrying an HTTP status and an operator-readable message'
      verification:
        - 'ClaudeBridgeTest (task-009) covering every automated row of the TDD verification table'
        - 'read-through against FLOW-1 for the finally rule specifically'
      risk: 'critical'
      confidence: 83
      human_review: 'before'
      escalation_triggers:
        - 'any reachable path leaves the reservation set without a sessionId having been returned — the one unrecoverable state this design exists to prevent'
        - 'the containment pre-flight cannot distinguish a configured-but-absent directory (in scope) from an escaping one (409) without throwing'
      delegation_tier: 'hard_judgment'
    - id: task-006
      title: 'EditorHttpServer /api/claude/ routes and executor; ServeEditorCommand options and shutdown warning; the escaping-manifests-dir fixture'
      source_requirements:
        prd: ['FR-1', 'FR-7', 'FR-9', 'NFR-2', 'NFR-5', 'AC-13', 'AC-14']
        tdd: ['DEC-1', 'DEC-6', 'DEC-16', 'CTR-5', 'IMP-1', 'IMP-9', 'IMP-10', 'CON-2']
      outputs:
        - 'one /api/claude/ context dispatching GET status, POST invoke, POST accept/{id}, POST discard/{id}; invoke reads the prompt as the raw text/plain body and reads no structured field (AC-13)'
        - 'server.setExecutor(fixed pool of 4) in start, shut down in stop after server.stop(0)'
        - 'start(host, port, workspaceFilePath) kept byte-identical in signature, delegating to a new 4-arg overload with Settings.defaults()'
        - 'ServeEditorCommand: --claude/--no-claude (negatable, default true), --claude-executable (default claude), --claude-model (default sonnet), --claude-timeout (default 300); shutdown hook WARNs with every affected path when a change is pending'
        - 'src/test/workspaces/editor_outside_manifests/workspace.yaml with settings.manifests.paths of ["../outside_manifests"]'
      verification:
        - './mvnw -B test -Dtest=EditorHttpServerTest — unmodified and green'
        - 'archicode editor serve --help shows the four new options with their defaults'
      risk: 'high'
      confidence: 86
      human_review: 'before'
      escalation_triggers:
        - 'the new context shadows or is shadowed by an existing one (ASM-4 would be wrong)'
        - 'accept/discard can be reached without an exact session-id match'
      delegation_tier: 'hard_judgment'
    - id: task-007
      title: 'Webapp Assist tab: availability signal, prompt box, diff rendering, pending banner, accept and discard'
      source_requirements:
        prd: ['FR-4', 'FR-5', 'FR-7', 'FR-9', 'FR-11', 'AC-3', 'AC-4', 'AC-5', 'AC-11', 'AC-16', 'AC-17']
        tdd: ['IMP-7', 'CTR-1', 'CTR-2', 'RISK-8']
      outputs:
        - 'a third tab button and section reusing the existing switchTab/qs helpers and .error-box/.success-indicator styles'
        - 'GET /api/claude/status on load: when unavailable, the prompt control is disabled and the reason is shown in its place (AC-17); when pending is non-null, the diff and the accept/discard controls render from it so a reload cannot orphan a change'
        - 'per-file collapsible diff blocks with +/- line colouring, changeType shown, binary/truncated stated rather than rendered'
        - 'a prominent pending banner stating that the files on disk are ALREADY changed, that Discard is what restores them, and that stopping the server leaves them changed (FR-7)'
        - 'outcome, agent summary, turns, cost, duration and permissionDenials all surfaced; failed/timeout rendered alongside the diff and the controls, not instead of them'
        - 'Save button and tree edit affordance disabled while a change is pending, with the banner saying why (RISK-8, client-side only)'
        - 'after accept or discard, the tree and graph reload'
      verification:
        - 'hand-run in task-010 against a live server; the page is also read back from GET / to confirm no external request and no CDN reference (CON-1)'
      risk: 'medium'
      confidence: 87
      human_review: 'none'
      escalation_triggers:
        - 'the CTR-1 pending object is insufficient to re-render a change under review after a reload'
      delegation_tier: 'standard'
    - id: task-008
      title: 'README: the capability, its claude-on-the-host precondition, --no-claude, and that a discard restores the whole workspace directory'
      source_requirements:
        prd: ['FR-12', 'TC-4']
        tdd: ['IMP-8', 'RISK-4', 'RISK-11', 'ASM-5']
      outputs:
        - 'an added paragraph in the existing "Serve the manifest editor" section covering all four points in IMP-8, without changing the existing docker run example or its loopback port-mapping guidance'
      verification:
        - 'read-back against IMP-8 four required statements'
      risk: 'low'
      confidence: 90
      human_review: 'none'
      escalation_triggers:
        - 'documenting the precondition honestly would require contradicting an existing README claim'
      delegation_tier: 'standard'
    - id: task-009
      title: 'ClaudeBridgeTest: real-HTTP tests over stand-in executables covering every automated row of the TDD verification table'
      source_requirements:
        prd: ['AC-2', 'AC-3', 'AC-4', 'AC-6', 'AC-7', 'AC-8', 'AC-9', 'AC-10', 'AC-11', 'AC-13', 'AC-14', 'AC-15', 'NFR-2', 'NFR-5']
        tdd: ['DEC-14', 'IMP-9', 'Observability and Verification automated table']
      outputs:
        - 'a @QuarkusTest following EditorHttpServerTest pattern (temp-dir fixture copy, ephemeral port, java.net.http.HttpClient), starting the server through the 4-arg start overload with settings.executable pointing at a generated stand-in script'
        - 'stand-ins for: a well-behaved single-file edit, a creation (including into a new subdirectory), a deletion, a no-op, a non-zero exit after a partial edit, a sleeper that outruns a short bound, non-JSON stdout, and a denial-reporting result'
        - 'one test per automated row of the TDD verification table, including the DEC-7 post-invocation-failure case and the DEC-16 concurrency case'
        - 'every discard assertion made against checksums the test itself captured before the stand-in ran, never against the bridge own diff (NFR-3)'
      verification:
        - './mvnw -B test -Dtest=ClaudeBridgeTest'
        - 'no test in this class invokes the real claude binary (DEC-14)'
      risk: 'medium'
      confidence: 84
      human_review: 'none'
      escalation_triggers:
        - 'a stand-in script cannot be made executable in the test environment, which would mean DEC-14 strategy is unworkable and the whole automated table is at risk'
      delegation_tier: 'standard'
    - id: task-010
      title: 'Verification: full mvnw verify, then live accept, discard and containment checks against a disposable workspace copy with the real claude binary'
      source_requirements:
        prd: ['AC-1', 'AC-5', 'AC-6', 'AC-7', 'AC-8', 'AC-9', 'AC-10', 'AC-12', 'AC-16', 'AC-17', 'NFR-4', 'NFR-5']
        tdd: ['Observability and Verification', 'DEC-14']
      outputs:
        - 'a green JAVA_HOME=... ./mvnw -B verify with EditorHttpServerTest.java and pom.xml unmodified'
        - 'live accept-path, discard-path and containment results recorded as prg-0007 Findings'
        - 'a git status --porcelain check in the repository after every live invocation'
        - 'pln execution_manifest.status set to done only if every criterion actually holds'
      verification:
        - 'JAVA_HOME=~/.sdkman/candidates/java/25.0.4-tem ./mvnw -B verify'
        - 'md5sum -c over a pre-invocation manifest of the disposable workspace after a discard — every line OK'
        - 'absence check for the out-of-workspace path the containment prompt asked for'
      risk: 'critical'
      confidence: 80
      human_review: 'before'
      escalation_triggers:
        - 'any live invocation would have to run with this repository as its working directory — never permitted'
        - 'the real claude binary cannot be invoked in this environment: do not fake success, stop and report it as a genuine finding'
        - 'the discard path does not restore byte-identically — escalate per the wave Risks section rather than ship'
      delegation_tier: 'hard_judgment'
```

## 5. Parallelization Plan

```yaml
parallelization_plan:
  groups:
    - id: parallel-group-001
      tasks:
        - task-001
        - task-002
        - task-003
        - task-004
      reason: 'Four independent leaf tasks with no edges between them. task-001 is the only dispatchable one (standard tier) and runs concurrently with the three inline hard_judgment tasks. task-003 and task-004 are new files; task-002 is the only one that edits an existing file.'
      conflict_risks:
        - 'task-002 edits EditorHttpServer.java, which task-006 also edits — but task-006 depends on task-005 which depends on task-002, so they are ordered, not concurrent'
        - 'task-001 and task-003 both add a test class under src/test/java/io/morin/archicode/cli/, but different files; no shared file'
    - id: parallel-group-002
      tasks:
        - task-007
        - task-008
        - task-009
      reason: 'All three depend only on task-006 and touch three disjoint files (index.html, README.md, a new test class). All three are standard tier, so all three are dispatched and can run genuinely concurrently.'
      conflict_risks:
        - 'none on files; task-009 and task-007 both consume the CTR-1/CTR-2 contract, so a contract defect would surface in both and must be fixed in task-005/task-006 rather than worked around in either'
        - 'CORRECTED DURING EXECUTION: this group shares the Maven build directory, which the original file-level analysis missed. task-007 runs `mvnw package` to verify its page against a live server and task-009 runs `mvnw test`; concurrent Maven invocations contend on target/ and produce confusing, flaky failures that look like defects in the code under test. task-009 was therefore held until task-007 finished using the build, so the group ran as {task-007, task-008} then {task-009}. A shared build directory is a conflict risk on a par with a shared file and belongs in this field by default.'
```

## 6. Human Review Gates

Three gates. Two are discharged inside this run under `complete-run`'s
autonomy override (see Escalation Rules); the third is deliberately **not**,
and is left for the orchestrator and the human.

```yaml
human_review_gates:
  gates:
    - id: gate-001
      trigger: 'before implementing the containment and reversibility core — the design would otherwise be verified only by the session that wrote it'
      required_before: ['task-003', 'task-004', 'task-005']
      required_after: []
      reviewer_focus:
        - 'does the writable set really sit inside the captured set, including symlinks, spool files and the availability probe'
        - 'is there any path on which a change is on disk but not discardable'
        - 'is every refusal genuinely side-effect-free before the capture'
        - 'is any claim about the claude CLI unverified'
    - id: gate-002
      trigger: 'before any invocation of the real claude binary during verification'
      required_before: ['task-010']
      required_after: []
      reviewer_focus:
        - 'the working directory is a disposable copy, never this repository and never .custom itself'
        - 'the test prompt is narrow enough that the expected diff can be stated in advance'
        - 'a pre-invocation checksum manifest exists so the discard assertion is a checksum comparison, not an inspection'
    - id: gate-003
      trigger: 'after task-010 — whether the shipped guarantee is strong enough to trust, which is the wave own P4 question and a product judgment this run must not self-certify'
      required_before: []
      required_after: ['task-010']
      reviewer_focus:
        - 'the accepted residuals: hooks surviving --restricted (RISK-10), a pending change not surviving a restart (RISK-1), a hand save being reverted by a discard (RISK-8), and a project-root workspace capturing .git (RISK-4, RISK-11)'
        - 'whether a local web page being able to run an autonomous agent at all is acceptable given there is no authentication'
        - 'whether --claude should default to enabled, as this plan has it, or to opt-in'
```

## 7. Risk Assessment

```yaml
risk_assessment:
  by_task:
    - id: task-001
      risk: 'low'
      rationale: 'Pure function, no I/O, no state, fully unit-testable. A bug misleads a reviewer but cannot lose data, because restore never reads the diff (NFR-3).'
    - id: task-002
      risk: 'high'
      rationale: 'Touches isWithinConfiguredManifestsDir, the existing path-traversal guard on the manifest write endpoint. A semantic slip here weakens a guard three prior runs already gated, in code this run has no product reason to change.'
    - id: task-003
      risk: 'critical'
      rationale: 'This class IS the discard guarantee. A wrong restore silently destroys the operator files — the exact outcome the wave Risks section says must not ship quietly.'
    - id: task-004
      risk: 'critical'
      rationale: 'Constructs the only subprocess in the repository and owns every containment flag. A missing --restricted, a stray --add-dir, or a spool file inside the workspace each breaks a different part of the safety story.'
    - id: task-005
      risk: 'critical'
      rationale: 'Owns the refusal ordering and the unconditional-session-install rule. The failure mode is not a wrong answer but an unrecoverable state: a change on disk that cannot be discarded.'
    - id: task-006
      risk: 'high'
      rationale: 'Exposes all of the above on an unauthenticated port. Accept/discard reachable without an exact session-id match, or a prompt body that can carry a path, would each defeat a PRD acceptance criterion.'
    - id: task-007
      risk: 'medium'
      rationale: 'The review surface is where a human decides. A diff rendered misleadingly, or a missing pending banner, leads to an uninformed accept — bad, but bounded by the server own guarantees.'
    - id: task-008
      risk: 'low'
      rationale: 'Documentation. Its failure mode is an operator surprised by the blast radius, which RISK-4/RISK-11 make a real cost but not a data-loss one.'
    - id: task-009
      risk: 'medium'
      rationale: 'Tests that assert the wrong thing are worse than no tests, because they certify. Specifically, a discard assertion made against the bridge own diff rather than an independent checksum would prove nothing (NFR-3).'
    - id: task-010
      risk: 'critical'
      rationale: 'Runs a real autonomous agent against real files. The operational risk is aiming it at the wrong directory; the reporting risk is rounding a partial result up to a pass.'
  by_area:
    - area: 'security'
      risk: 'critical'
      rationale: 'An unauthenticated local port gains the ability to run an autonomous coding agent. Containment is structural (DEC-2/DEC-4, verified by prg-0007 F-4) but has two named residuals: hooks from managed settings or plugins (RISK-10) and prompt injection via manifest content (RISK-6).'
    - area: 'data'
      risk: 'critical'
      rationale: 'The feature edits the operator real files in place and offers an undo. The undo correctness (task-003) is the single highest-consequence piece of this run.'
    - area: 'api'
      risk: 'medium'
      rationale: 'Four new endpoints, all additive at a new path prefix. No existing contract changes (NFR-5). The CTR-1 pending object is shared by two consumers and must be defined once.'
    - area: 'ui'
      risk: 'medium'
      rationale: 'Additive tab in an existing single-file page, reusing its helpers and styles. Its real responsibility is informing a human honestly (FR-7).'
    - area: 'infra'
      risk: 'medium'
      rationale: 'First subprocess execution in the repository, and a threading change to a server three prior runs gated (DEC-16). The native/GraalVM profile is not verified (RISK-5).'
    - area: 'docs'
      risk: 'low'
      rationale: 'One additive README paragraph.'
```

## 8. Confidence Assessment

```yaml
confidence_assessment:
  by_task:
    - id: task-001
      score: 92
      rationale: 'Fully specified algorithm with explicit guards; the only uncertainty is hunk-boundary bookkeeping, which the tests pin.'
    - id: task-002
      score: 88
      rationale: 'A mechanical extraction with an existing, unmodifiable test suite as the regression net. Held below 90 because DEC-8 resolution rule for the new containment check is new behaviour, not extracted behaviour.'
    - id: task-003
      score: 85
      rationale: 'DEC-3 specifies the four restore steps in order, and the branches are enumerated. Held at 85 because the type-change and empty-directory branches are the kind that pass a happy-path test and fail in practice; they have dedicated tests for that reason.'
    - id: task-004
      score: 82
      rationale: 'The flag set is empirically confirmed (prg-0007 F-6) and the spool-file approach avoids the classic ProcessBuilder deadlock. Lowest of the implementation tasks because it depends on an external binary this run does not control (RISK-3) and because POSIX permission handling and the not-under-workspace assertion are easy to write and easy to get subtly wrong.'
    - id: task-005
      score: 83
      rationale: 'FLOW-1 gives the ordering step by step and DEC-7 gives the finally rule explicitly. Held at 83 because the property that matters — no reachable path leaves a reservation without a session id — is a claim about every exception path, which no single test proves.'
    - id: task-006
      score: 86
      rationale: 'Suffix dispatch and Picocli options are routine; ASM-4 prefix matching is already exercised by run-0006. Held below 90 by the executor change (DEC-16), which touches previously-gated code and makes handlers concurrent for the first time.'
    - id: task-007
      score: 87
      rationale: 'The existing page gives helpers, styles and a tab mechanism to extend, and the contract is fixed. The uncertainty is presentational, not behavioural, and this repository has no browser-automation tooling to settle it mechanically.'
    - id: task-008
      score: 90
      rationale: 'Four enumerated statements to add to an existing section.'
    - id: task-009
      score: 84
      rationale: 'The pattern exists in EditorHttpServerTest and the rows to cover are enumerated. Held at 84 by the breadth — a dozen stand-in scripts and a genuine concurrency case — and by the discipline of asserting against independent checksums rather than the bridge own output.'
    - id: task-010
      score: 80
      rationale: 'Lowest score in the plan, deliberately. mvnw verify is deterministic, but the live checks depend on a real model behaving as a narrow prompt asks, on credentials being present, and on nested invocation working from inside this session — the last of which is explicitly flagged as a stop-and-report condition rather than something to work around.'
```

## 9. Agent Assignment Plan

```yaml
agent_assignment_plan:
  assignments:
    - task_id: task-001
      agent_role: 'Backend Implementation Agent'
      objective: 'Write LineDiff.java (a pure unified-diff utility) and LineDiffTest.java, to TDD DEC-9 exactly.'
      context:
        prd_excerpts:
          - 'FR-4: present the outcome as a per-file diff against the pre-invocation capture, distinguishing created, modified and deleted, and present "nothing changed" distinctly from "changed".'
          - 'NFR-4: no new Maven dependency, no package.json dependency, no CDN asset, no build step.'
        tdd_excerpts:
          - 'DEC-9: LCS by dynamic programming, edit script, hunks with three lines of context, standard --- / +++ / @@ rendering; binary refused on a 0x00 byte; truncated above 4000 lines a side; changeType still reported in both refusal cases.'
          - 'CON-5: Lombok conventions in this package — @Slf4j, @SneakyThrows, @Value/@Builder for DTOs.'
      likely_files:
        - 'src/main/java/io/morin/archicode/cli/LineDiff.java'
        - 'src/test/java/io/morin/archicode/cli/LineDiffTest.java'
      acceptance_criteria:
        - 'unified(beforeName, afterName, before, after) returns standard unified-diff text with three context lines'
        - 'identical inputs yield an empty result; a one-line change yields one hunk with one - and one + line'
        - 'binary and oversize inputs are reported, not diffed'
        - 'no new dependency in pom.xml'
      verification:
        - 'JAVA_HOME=~/.sdkman/candidates/java/25.0.4-tem ./mvnw -B test -Dtest=LineDiffTest'
      escalation_triggers:
        - 'an exact LCS cannot be implemented within the stated guards without a dependency'
      suggested_subagent_type: 'general-purpose'
      suggested_model: '(default)'
    - task_id: task-002
      agent_role: 'Refactoring Agent'
      objective: 'Extract WorkspaceLayout and delegate EditorHttpServer existing call sites with zero behaviour change.'
      context:
        prd_excerpts:
          - 'NFR-5: no existing endpoint contract and no existing test shall change.'
          - 'FR-8: refuse, before invoking anything, a request against a workspace whose configured manifest directories do not all resolve inside the workspace directory.'
        tdd_excerpts:
          - 'DEC-8: move resolveManifestsDirs and the thrice-inlined workspace-dir derivation into an @ApplicationScoped WorkspaceLayout; semantics unchanged including the deliberate absence of an existence check; the new containment check treats a configured-but-absent directory as in scope and resolves existing ones with toRealPath()/startsWith.'
      likely_files:
        - 'src/main/java/io/morin/archicode/cli/WorkspaceLayout.java'
        - 'src/main/java/io/morin/archicode/cli/EditorHttpServer.java'
      acceptance_criteria:
        - 'EditorHttpServerTest passes unmodified'
        - 'isWithinConfiguredManifestsDir still uses toRealPath() equality on the target parent'
      verification:
        - './mvnw -B test -Dtest=EditorHttpServerTest'
      escalation_triggers:
        - 'any existing test would need editing'
      suggested_subagent_type: '(inline)'
      suggested_model: '(default)'
    - task_id: task-003
      agent_role: 'Backend Implementation Agent'
      objective: 'Implement WorkspaceCapture — the class the discard guarantee is — and its unit tests, to TDD DEC-3 exactly.'
      context:
        prd_excerpts:
          - 'FR-5: discard shall restore every captured file to byte-identical content, recreate every captured file the invocation deleted, and delete every file the invocation created anywhere inside the captured directory.'
          - 'NFR-3: the restore shall be computed from the pre-invocation capture alone, not from the diff presented to the operator.'
          - 'AC-9: given a workspace directory containing no .git, a discard still restores byte-identically — no version-control facility is used.'
        tdd_excerpts:
          - 'DEC-3 is the sole owner of the algorithm: the four ordered restore steps, the immutability that makes restore idempotent, and the walk mechanics.'
          - 'DEC-15: refuse on any symlink or other non-regular, non-directory entry; bounds enforced during the walk.'
          - 'IMP-2: no reference to LineDiff or any diff type; bytes not strings.'
      likely_files:
        - 'src/main/java/io/morin/archicode/cli/WorkspaceCapture.java'
        - 'src/test/java/io/morin/archicode/cli/WorkspaceCaptureTest.java'
      acceptance_criteria:
        - 'every WorkspaceCaptureTest case in the task catalog passes'
        - 'restore is idempotent: running it twice leaves the same result'
        - 'the class compiles with no import of LineDiff'
      verification:
        - './mvnw -B test -Dtest=WorkspaceCaptureTest'
      escalation_triggers:
        - 'byte-identical restore cannot be achieved for a covered case — stop and escalate per the wave Risks section'
      suggested_subagent_type: '(inline)'
      suggested_model: '(default)'
    - task_id: task-004
      agent_role: 'Backend Implementation Agent'
      objective: 'Implement ClaudeCliInvoker: the hardened subprocess, its spool files, its environment scrubbing, its timeout, its defensive JSON parse and its availability probe.'
      context:
        prd_excerpts:
          - 'FR-2: invoke in a mode that produces no interactive prompt, applies edits without confirmation, and fails closed rather than blocking.'
          - 'NFR-1: containment removed by the invocation own configuration, with no command-execution tool available.'
          - 'NFR-6: no credential, token, API key or environment-variable value in any log line or result field.'
        tdd_excerpts:
          - 'DEC-4: the exact nine-flag command, prompt on stdin, spool files outside the workspace; the tool set cannot delete; hooks survive --restricted (RISK-10).'
          - 'DEC-11: availability probe in its own temp working directory with the deny-list applied, cached per process.'
          - 'DEC-12: the environment deny-list, with credential variables kept.'
          - 'DEC-13: bounded wait, destroyForcibly, 5s grace, outcome timeout.'
          - 'CTR-6: the consumed JSON fields and the denial mapping including tool_input.content truncated to 2000 characters.'
          - 'IMP-4: the four invariants a reviewer must check.'
      likely_files:
        - 'src/main/java/io/morin/archicode/cli/ClaudeCliInvoker.java'
      acceptance_criteria:
        - 'no --add-dir is constructible; the working directory is the workspace directory'
        - 'the spool directory real path is asserted not to be under the workspace root at construction'
        - 'a missing or mistyped JSON field yields null, never an exception'
      verification:
        - 'exercised by ClaudeBridgeTest stand-ins (task-009)'
      escalation_triggers:
        - 'spool files cannot be kept outside the workspace directory'
      suggested_subagent_type: '(inline)'
      suggested_model: '(default)'
    - task_id: task-005
      agent_role: 'Backend Implementation Agent'
      objective: 'Implement ClaudeBridge: the refusal ordering, the single-session compare-and-set, the unconditional session install, and accept/discard.'
      context:
        prd_excerpts:
          - 'FR-10: refuse a new change request while a previous change is pending, and say which pending change is blocking it.'
          - 'FR-6: present the result as a diff regardless of whether the resulting files are valid manifests; never auto-revert on validation grounds.'
          - 'AC-14: a workspace whose configured manifest directories resolve outside the workspace directory is rejected before any invocation, naming the offending directory.'
        tdd_excerpts:
          - 'FLOW-1 owns the ordering; DEC-7 owns why, including the finally rule that installs a session unconditionally once the capture has succeeded.'
          - 'DEC-10: diff unconditionally after the subprocess ends, whatever its exit status; 2xx means it ran, non-2xx means nothing ran and nothing is held.'
          - 'CTR-1/CTR-2/CTR-3/CTR-4 for the four response shapes, with CTR-1 owning the pending object.'
      likely_files:
        - 'src/main/java/io/morin/archicode/cli/ClaudeBridge.java'
      acceptance_criteria:
        - 'every refusal above capture releases the reservation and touches no file'
        - 'no reachable path leaves the reservation set without a sessionId returned'
        - 'a failed restore returns 500 and keeps the session pending'
      verification:
        - 'ClaudeBridgeTest (task-009), including the post-invocation-failure row'
      escalation_triggers:
        - 'an unrecoverable state remains reachable'
      suggested_subagent_type: '(inline)'
      suggested_model: '(default)'
    - task_id: task-006
      agent_role: 'Backend Implementation Agent'
      objective: 'Wire the four /api/claude/ routes, add the server executor, add the four CLI options and the shutdown warning, and add the escaping-manifests-dir fixture.'
      context:
        prd_excerpts:
          - 'AC-13: the change request carries no workspace, directory or path parameter of any kind.'
          - 'NFR-5: additive only; no existing contract or test changes.'
        tdd_excerpts:
          - 'DEC-1: one context, suffix dispatch, prompt as the raw text/plain body so there is no field in which a path could be smuggled.'
          - 'DEC-16: setExecutor with a fixed pool of four, shut down in stop; changes threading, not contracts.'
          - 'CTR-5: the four new options and their defaults.'
          - 'DEC-6: the shutdown WARN naming every affected path; no auto-discard.'
          - 'CON-2: start(String, int, Path) keeps its signature and delegates.'
      likely_files:
        - 'src/main/java/io/morin/archicode/cli/EditorHttpServer.java'
        - 'src/main/java/io/morin/archicode/cli/ServeEditorCommand.java'
        - 'src/test/workspaces/editor_outside_manifests/workspace.yaml'
      acceptance_criteria:
        - 'EditorHttpServerTest passes unmodified'
        - 'accept/discard require an exact session-id match'
        - 'editor serve --help lists the four new options with defaults'
      verification:
        - './mvnw -B test -Dtest=EditorHttpServerTest'
      escalation_triggers:
        - 'the new context interferes with an existing one'
      suggested_subagent_type: '(inline)'
      suggested_model: '(default)'
    - task_id: task-007
      agent_role: 'Frontend Implementation Agent'
      objective: 'Add the Assist tab to the existing single-page webapp: availability signal, prompt box, diff rendering, pending banner, accept and discard.'
      context:
        prd_excerpts:
          - 'FR-7: while a change is pending, state that the files on disk are already in the changed state and that discarding is what restores them.'
          - 'AC-17: when claude is unavailable, the change-request control is already shown as unavailable, with the reason, before any prompt is submitted.'
          - 'AC-4: a completed invocation that changed nothing says so plainly and offers no accept action.'
        tdd_excerpts:
          - 'IMP-7: reuse switchTab/qs and the existing .error-box/.success-indicator styles; disable Save and the tree edit affordance while a change is pending (RISK-8); no new external request, no CDN.'
          - 'CTR-1 owns the pending object; the webapp renders a change under review from pending alone, so a reload cannot orphan it.'
          - 'CTR-2: outcome failed/timeout renders alongside the diff and the controls, not instead of them.'
      likely_files:
        - 'src/main/resources/editor-webapp/index.html'
      acceptance_criteria:
        - 'the page still works with no change to the Graph and Editor tabs'
        - 'no script or stylesheet is loaded from any external origin'
        - 'the pending banner states all three facts in FR-7 and IMP-7'
      verification:
        - 'hand-run against a live server in task-010; page read back from GET / for the no-external-request check'
      escalation_triggers:
        - 'the pending object is insufficient to re-render after a reload'
      suggested_subagent_type: 'general-purpose'
      suggested_model: '(default)'
    - task_id: task-008
      agent_role: 'Documentation Agent'
      objective: 'Add one paragraph to README "Serve the manifest editor" covering the capability and its preconditions.'
      context:
        prd_excerpts:
          - 'FR-12: README shall describe the capability and state the precondition recorded in TC-4.'
        tdd_excerpts:
          - 'IMP-8: four required statements — the published image has no claude; --no-claude; the capture and blast radius are the workspace file own directory so a discard restores everything under it; and therefore point --workspace at a dedicated directory when using the bridge, since pointing it at a project root is what makes the capture bound fire.'
          - 'RISK-11: the existing documented invocation passes no --workspace, so ArchiCode resolves the default workspace.yaml against Docker -w "/workdir" — the mounted project root.'
      likely_files:
        - 'README.md'
      acceptance_criteria:
        - 'all four IMP-8 statements present'
        - 'the existing docker run example and its loopback guidance are unchanged'
      verification:
        - 'read-back against IMP-8'
      escalation_triggers:
        - 'an existing README claim would have to be contradicted'
      suggested_subagent_type: 'general-purpose'
      suggested_model: '(default)'
    - task_id: task-009
      agent_role: 'Test Generation Agent'
      objective: 'Write ClaudeBridgeTest: real-HTTP tests over generated stand-in executables covering every automated row of the TDD verification table.'
      context:
        prd_excerpts:
          - 'NFR-2 validation: configure a short bound and a stand-in that outruns it; assert the invocation is terminated, reported as failed, and the capture remains discardable.'
          - 'NFR-3: discard assertions must be made against the pre-invocation state, not against the diff.'
        tdd_excerpts:
          - 'DEC-14: stand-in executables, never the real binary; the listed scripts to cover.'
          - 'the Observability and Verification automated table — one test per row, including the DEC-7 post-invocation-failure row and the DEC-16 concurrency row.'
          - 'IMP-9: follow EditorHttpServerTest pattern and do not edit that file.'
      likely_files:
        - 'src/test/java/io/morin/archicode/cli/ClaudeBridgeTest.java'
      acceptance_criteria:
        - 'every automated row of the TDD verification table has a test'
        - 'no test invokes the real claude binary'
        - 'EditorHttpServerTest.java is not edited'
      verification:
        - './mvnw -B test -Dtest=ClaudeBridgeTest'
      escalation_triggers:
        - 'stand-in scripts cannot be made executable in the test environment'
      suggested_subagent_type: 'general-purpose'
      suggested_model: '(default)'
    - task_id: task-010
      agent_role: 'QA Agent'
      objective: 'Run the full verification plan, including the live checks with the real claude binary against a disposable workspace copy, and record exactly what was and was not confirmed.'
      context:
        prd_excerpts:
          - 'AC-12: the refusal must be recorded by the invocation own permission machinery rather than resting on the agent choice.'
          - 'AC-6: every file the capture covered is byte-identical to its pre-invocation content, verified by checksum.'
        tdd_excerpts:
          - 'Observability and Verification: the hand-run script, and the note that a prompt framed as a test gets a polite refusal that proves nothing (prg-0007 F-3 vs F-4).'
          - 'PRD Section 3 declared deviation: verify against a disposable copy of .custom, never .custom itself.'
      likely_files:
        - 'docs/wav/wav-002-manifest-web-editor/run/run-0007-claude-editing-bridge/prg-0007-claude-editing-bridge.md'
        - 'docs/wav/wav-002-manifest-web-editor/run/run-0007-claude-editing-bridge/pln-0007-claude-editing-bridge.md'
      acceptance_criteria:
        - 'every summary.criteria entry is individually checked and its real result recorded'
        - 'a red or partial result is reported as such, never rounded up'
      verification:
        - 'JAVA_HOME=~/.sdkman/candidates/java/25.0.4-tem ./mvnw -B verify'
        - 'md5sum -c after discard; absence check after the containment prompt; git status --porcelain after every live invocation'
      escalation_triggers:
        - 'the real binary cannot be invoked here — report it, do not simulate it'
      suggested_subagent_type: '(inline)'
      suggested_model: '(default)'
```

## 10. Verification Plan

```yaml
verification_plan:
  checks:
    - task_id: task-001
      methods: ['unit tests']
      success_criteria:
        - 'LineDiffTest green across all nine listed cases'
    - task_id: task-002
      methods: ['regression checks']
      success_criteria:
        - 'EditorHttpServerTest green with the file unmodified'
        - 'git diff shows only delegation changes in EditorHttpServer, no logic change'
    - task_id: task-003
      methods: ['unit tests', 'manual code read for NFR-3']
      success_criteria:
        - 'WorkspaceCaptureTest green, including idempotence, type change, empty directory, symlink refusal and bound refusal'
        - 'the class has no reference to LineDiff or any diff type'
    - task_id: task-004
      methods: ['integration tests via stand-ins', 'manual code read against IMP-4']
      success_criteria:
        - 'no --add-dir; working directory is the workspace directory'
        - 'spool directory asserted not under the workspace root'
        - 'the environment deny-list applied to invocation and probe alike'
    - task_id: task-005
      methods: ['integration tests', 'manual code read against FLOW-1']
      success_criteria:
        - 'every refusal above capture leaves the filesystem untouched and the reservation released'
        - 'the post-invocation-failure test returns a usable sessionId and a working discard'
    - task_id: task-006
      methods: ['integration tests', 'regression checks', 'CLI help inspection']
      success_criteria:
        - 'EditorHttpServerTest green unmodified'
        - 'accept/discard on a stale id return 404'
        - 'editor serve --help lists the four new options with their defaults'
    - task_id: task-007
      methods: ['manual validation', 'served-page inspection']
      success_criteria:
        - 'the Graph and Editor tabs still work'
        - 'no external origin referenced in the served HTML'
        - 'the pending banner carries all three required statements'
    - task_id: task-008
      methods: ['manual validation']
      success_criteria:
        - 'all four IMP-8 statements present; existing example unchanged'
    - task_id: task-009
      methods: ['integration tests']
      success_criteria:
        - 'ClaudeBridgeTest green; one test per automated row; no real-binary invocation'
    - task_id: task-010
      methods: ['full build and test', 'live manual validation', 'checksum comparison', 'repository cleanliness check']
      success_criteria:
        - './mvnw -B verify green with EditorHttpServerTest.java and pom.xml unmodified'
        - 'live: a prompted change is applied, shown as a diff, and accept leaves it readable through GET /api/manifests/{path}'
        - 'live: after discard, md5sum -c over the pre-invocation manifest reports every file OK and no stray file or directory remains'
        - 'live: a plausibly-framed out-of-workspace prompt creates nothing outside the workspace and the attempt appears in permissionDenials'
        - 'git status --porcelain in the repository unchanged by any claude subprocess'
```

## 11. Escalation Rules

```yaml
escalation_rules:
  rules:
    - condition: 'A task categorised review_before or human_required under the default autonomy policy is reached.'
      action: 'Proceed — this run operates under complete-run explicit autonomy override, which suspends stopping on category alone for both stricter tiers. gate-001 and gate-002 are therefore discharged inside the run: gate-001 by the KDMLLC review of the TDD, which was dispatched with an explicit brief to attack the containment and discard reasoning and returned five S3 findings now applied (prg-0007 F-8), plus this session being the hard_judgment tier for the core tasks; gate-002 by a mechanical precondition check before each live invocation. gate-003 is NOT discharged — it is the wave own product question and is left open for the orchestrator and the human. Record every such pass in prg-0007.'
    - condition: 'The discard path cannot be made byte-identical for any case the tests cover.'
      action: 'Stop. Do not ship a weaker guarantee. The wave Risks section names this exact situation as a reason to escalate to the wave human review gate, and PRD GOAL-3 does not admit a partial version. Report what failed and why.'
    - condition: 'A reachable path is found that leaves a change on disk with no way to discard it.'
      action: 'Stop and fix before continuing; if it cannot be fixed, escalate. This is the one unrecoverable state the design exists to prevent (DEC-7).'
    - condition: 'Any live claude invocation would have this repository, or .custom itself, as its working directory.'
      action: 'Refuse. This is a standing safety constraint on this run, not a preference, and it is not suspended by the autonomy override. Use a disposable copy.'
    - condition: 'The real claude binary cannot be invoked from this environment (permission prompts that cannot be answered non-interactively, missing credentials, recursive-invocation problems, anything else).'
      action: 'Do not fake, simulate or infer success. Stop the live portion, record exactly what happened as a finding in prg-0007, leave the affected summary.criteria unmet, set execution_manifest.status to blocked, and report it.'
    - condition: 'A claim this plan or the TDD makes about the claude CLI turns out to be wrong at implementation time.'
      action: 'Re-check against the real claude --help and a scratch-workspace probe, correct the TDD, and record the correction in prg-0007 Findings. Do not code around a documented claim that is false.'
    - condition: 'Closing a defect would require changing an existing endpoint contract or editing EditorHttpServerTest.java.'
      action: 'Do not. PRD NFR-5 freezes both. Record the defect as a risk with a client-side mitigation where one exists, and a DEF- item for a run that is allowed to change the contract — as already done for RISK-8/DEF-7.'
    - condition: 'A sensitive task (risk critical, or human_review required) appears to be delegable to a subagent or a cheaper model.'
      action: 'Keep it inline. The Delegation Policy safety rule is non-negotiable and overrides any efficiency consideration. task-002 through task-006 and task-010 are inline for this reason.'
    - condition: 'Confidence for any task falls below 70 during execution.'
      action: 'Stop that task, record why in prg-0007, and re-plan it rather than proceeding on a guess.'
```

## 12. Final Execution Manifest

```yaml
execution_manifest:
  status: 'done'
  recommendation: 'proceed_with_review'
  autonomy_level: 'medium'
  total_tasks: 10
  autonomous_tasks: 4
  review_before_tasks: 5
  review_after_tasks: 1
  human_required_tasks: 0
  blocked_tasks: 0
  critical_path_tasks:
    - task-003
    - task-004
    - task-005
    - task-006
    - task-009
    - task-010
  parallel_groups:
    - parallel-group-001
    - parallel-group-002
  required_human_gates:
    - gate-003
  highest_risk_tasks:
    - task-003
    - task-004
    - task-005
    - task-010
  lowest_confidence_tasks:
    - task-010
    - task-004
    - task-005
  next_action: 'All ten tasks are done and verified. The orchestrator commits the run and then takes gate-003, which this run deliberately left open: whether the shipped guarantee is strong enough to trust, given the accepted residuals (RISK-1, RISK-4, RISK-8, RISK-10, RISK-11) and the partially-verified AC-12 recorded in prg-0007 F-16.'
  criteria:
    - 'mvnw verify green with EditorHttpServerTest.java and pom.xml unmodified'
    - 'every automated row of the TDD verification table covered by a passing test'
    - 'live accept path verified: a prompted change is applied and readable through GET /api/manifests/{path} after accept'
    - 'live discard path verified by checksum: every captured file byte-identical, no stray file or directory'
    - 'live containment verified: no file outside the workspace directory, and the attempt visible in permissionDenials'
    - 'this repository tracked files unaffected by any claude subprocess'
    - 'gate-003 left open for the orchestrator and the human rather than self-certified'
```
