---
title: Execution Plan — Java Toolchain Baseline
status: active
owner: run-0001
date: 2026-10-04
related:
  - docs/wav/wav-001-quarkus-java-upgrade/run/run-0001-java-toolchain-baseline/tdd-0001-java-toolchain-baseline.md
run: 0001
wave: 001
type: pln
---

# Execution Plan — Java Toolchain Baseline

This run executes under `complete-run`'s autonomy override: the
`write-execution-plan` default policy's stricter tiers (`review before`,
`human_required`) are not applied as stop points here. Every task below is
routine build-tooling version bumping with no production/auth/payment/data
surface — none qualifies as `hard_judgment` under the Delegation Policy's
safety rule, so nothing in this plan requires a human gate; `human_review_gates`
is empty by design, not by omission.

## 1. Executive Summary

```yaml
summary:
  status: 'done'
  product_goal: 'Build ArchiCode cleanly on JDK 25, with Lombok and the core Maven plugins at versions compatible with it, and no version drift across .sdkmanrc/CI/CLAUDE.md.'
  technical_approach: 'Bump pom.xml properties/plugin versions, .sdkmanrc, the CI JDK setup step (incl. actions/setup-java major version), and CLAUDE.md in parallel (four independent files), then verify with a real local ./mvnw verify run under JDK 25.'
  total_tasks: 5
  parallel_groups: 1
  high_risk_tasks: 0
  human_review_gates: 0
  autonomy_level: 'high'
  recommendation: 'proceed'
  criteria:
    - 'pom.xml sets maven.compiler.release=25 and the TDD DEC-2 plugin/library versions'
    - '.sdkmanrc, ci-build.yaml, and CLAUDE.md all name Java 25 with no drift'
    - './mvnw verify passes locally under JDK 25 with quarkus.platform.version unchanged at 3.21.1'
```

## 2. PRD/TDD Consistency Assessment

Not applicable — no PRD (`TDD+pln` profile). The TDD traces directly to the
wave manifest's W-1 row; no gaps between "requirements" and "design" exist
because there is no separate requirements document to diverge from it.

```yaml
consistency_assessment:
  aligned_items:
    - 'TDD scope matches the wave manifest W-1 row exactly (focus, likely_paths, exit evidence).'
  gaps: []
  blocking_gaps: []
```

## 3. Execution Graph

```yaml
execution_graph:
  nodes:
    - id: task-001
      status: done
      title: 'Bump pom.xml versions (compiler.release, Lombok, core Maven plugins)'
      depends_on: []
      produces: ['pom.xml']
      agent_role: 'Infrastructure Agent'
      autonomy: 'autonomous'
      risk: 'medium'
      confidence: 80
    - id: task-002
      status: done
      title: 'Fix .sdkmanrc to pin Java 25'
      depends_on: []
      produces: ['.sdkmanrc']
      agent_role: 'Infrastructure Agent'
      autonomy: 'autonomous'
      risk: 'low'
      confidence: 95
    - id: task-003
      status: done
      title: 'Update CI JDK setup step and actions/setup-java version'
      depends_on: []
      produces: ['.github/workflows/ci-build.yaml']
      agent_role: 'Infrastructure Agent'
      autonomy: 'autonomous'
      risk: 'low'
      confidence: 90
    - id: task-004
      status: done
      title: 'Resolve the JDK-mismatch gotcha in CLAUDE.md'
      depends_on: []
      produces: ['CLAUDE.md']
      agent_role: 'Documentation Agent'
      autonomy: 'autonomous'
      risk: 'low'
      confidence: 95
    - id: task-005
      status: done
      title: 'Local build verification under JDK 25'
      depends_on: ['task-001', 'task-002', 'task-003', 'task-004']
      produces: ['verification evidence (prg Findings, run report)']
      agent_role: 'QA Agent'
      autonomy: 'autonomous'
      risk: 'medium'
      confidence: 70
  edges:
    - from: task-001
      to: task-005
      reason: 'Verification exercises the pom.xml changes.'
    - from: task-002
      to: task-005
      reason: 'Verification should run under the JDK .sdkmanrc now pins.'
    - from: task-003
      to: task-005
      reason: 'CI file correctness is spot-checked (statically) alongside the local build.'
    - from: task-004
      to: task-005
      reason: 'Doc consistency is checked in the same verification pass.'
```

## 4. Task Catalog

```yaml
task_catalog:
  tasks:
    - id: task-001
      title: 'Bump pom.xml versions'
      source_requirements:
        prd: []
        tdd: ['TG-1', 'TG-2', 'TG-3', 'DEC-1', 'DEC-2', 'DEC-4', 'DEC-5', 'IMP-1']
      outputs:
        - 'maven.compiler.release=25'
        - 'compiler-plugin.version=3.15.0, with <proc>full</proc> (DEC-4)'
        - 'surefire-plugin.version=3.6.0, surefire/failsafe argLine=-XX:+EnableDynamicAgentLoading (DEC-5)'
        - 'lombok=1.18.48'
        - 'maven-release-plugin=3.3.1'
        - 'asciidoctor-maven-plugin=3.2.0, asciidoctorj-diagram=3.2.1'
        - 'test-tooling overrides (DEC-5): mockito-core/mockito-junit-jupiter=5.24.0, byte-buddy=1.17.7, org.jacoco:*=0.8.15 (incl. runtime classifier), org.ow2.asm:*=9.10.1 (dependencyManagement, declared ahead of the Quarkus BOM import, plus matching test-scope <dependencies> entries)'
        - 'quarkus.platform.version left at 3.21.1 (untouched)'
      verification:
        - 'grep for each updated version string in pom.xml'
        - 'quarkus.platform.version and every quarkus-* coordinate unchanged (diff check)'
        - './mvnw dependency:tree -Dincludes=org.mockito:*,net.bytebuddy:*,org.jacoco:*,org.ow2.asm:* confirms every override actually resolved (not just declared)'
      risk: 'medium'
      confidence: 80
      human_review: 'none'
      escalation_triggers:
        - 'any accidental edit to quarkus.platform.version or a quarkus-* dependency'
      delegation_tier: 'standard'
      status: 'done'
      results: 'All versions bumped and verified resolved via dependency:tree; quarkus.platform.version and every io.quarkus:* coordinate confirmed unchanged via git diff review. DEC-4/DEC-5 additions (proc=full, argLine, test-tooling overrides, asm dependencyManagement ordering) were added inline by the run-executor session itself once empirical verification (task-005) surfaced the need, not by a separately dispatched subagent.'
    - id: task-002
      title: 'Fix .sdkmanrc'
      source_requirements:
        prd: []
        tdd: ['TG-4', 'IMP-2']
      outputs:
        - 'java=25.0.4-tem'
      verification:
        - 'cat .sdkmanrc shows java=25.0.4-tem'
      risk: 'low'
      confidence: 95
      human_review: 'none'
      escalation_triggers: []
      delegation_tier: 'cheap'
      status: 'done'
      results: 'Dispatched to general-purpose/haiku; verified directly by reading the file back — reads exactly java=25.0.4-tem.'
    - id: task-003
      title: 'Update CI JDK setup step'
      source_requirements:
        prd: []
        tdd: ['TG-4', 'TG-5', 'DEC-3', 'IMP-3']
      outputs:
        - 'actions/setup-java@v6'
        - 'distribution: temurin'
        - "java-version: '25'"
        - 'step name updated to "Set up JDK 25"'
      verification:
        - 'YAML is well-formed (yamllint or python yaml.safe_load)'
        - 'diff review against TDD DEC-3'
      risk: 'low'
      confidence: 90
      human_review: 'none'
      escalation_triggers:
        - 'any other step in the workflow accidentally altered'
      delegation_tier: 'cheap'
      status: 'done'
      results: 'Dispatched to general-purpose/haiku; verified directly by reading the file back — step now reads actions/setup-java@v6, distribution temurin, java-version "25", name "Set up JDK 25"; YAML parses; no other step touched.'
    - id: task-004
      title: 'Resolve JDK-mismatch gotcha in CLAUDE.md'
      source_requirements:
        prd: []
        tdd: ['TG-4', 'IMP-4']
      outputs:
        - 'CLAUDE.md states Java 25 consistently, no mismatch language left'
      verification:
        - 'grep CLAUDE.md for "17" / stale version references'
      risk: 'low'
      confidence: 95
      human_review: 'none'
      escalation_triggers: []
      delegation_tier: 'cheap'
      status: 'done'
      results: 'Dispatched to general-purpose/haiku; verified directly by reading the file back — "## JDK version" section now states Java 25 consistently, no 17/21 mismatch language remains.'
    - id: task-005
      title: 'Local build verification under JDK 25'
      source_requirements:
        prd: []
        tdd: ['TG-5', 'ASM-2', 'RISK-1', 'DEC-4', 'DEC-5', 'Observability and Verification']
      outputs:
        - 'Actual ./mvnw verify result under JDK 25, Quarkus 3.21.1 unchanged'
      verification:
        - './mvnw verify (full lifecycle: compile, Lombok annotation processing, unit tests, Asciidoctor doc generation, Quarkus augmentation)'
        - 'java -version under the .sdkmanrc-pinned JDK reports 25'
      risk: 'medium'
      confidence: 70
      human_review: 'none'
      escalation_triggers:
        - 'build failure traceable to Quarkus 3.21.1 bytecode/annotation-processing incompatibility with release=25 (would need quarkus.platform.version to fix, which is out of this run''s authority — escalate as a wave-level finding, not silently worked around)'
      delegation_tier: 'standard'
      status: 'done'
      results: 'Ran inline (not delegated) by the run-executor session itself, per the plan''s own suggested_subagent_type of (inline). Found and fixed, in sequence: (1) javac silently skipped annotation processing under JDK 25 with no explicit -proc setting (DEC-4); (2) JaCoCo/ASM 0.8.12/9.7.1 could not parse Java 25 class files; (3) Mockito''s Byte Buddy inline mock maker could not self-attach without -XX:+EnableDynamicAgentLoading; (4) Byte Buddy itself was still too old (Quarkus BOM pin outranked mockito-core''s own transitive request); (5) Quarkus''s own ClassTransformingBuildStep (quarkus:build goal) hit the same too-old-ASM problem via its own bootstrap/app-model resolver, fixed via a dependencyManagement-level override declared ahead of the Quarkus BOM import, not a plugin-level one (DEC-5). None of these required touching quarkus.platform.version or any io.quarkus:* coordinate. Final result: BUILD SUCCESS, 83/83 tests, Quarkus augmentation completed, Asciidoctor docs generated. Isolated the JDK-version variable specifically by also running the original (pre-this-run) pom.xml under JDK 21 (baseline, passed) and the fully-bumped pom.xml under JDK 21 (passed, confirming the Lombok/plugin-version bumps alone were not the cause) before concluding JDK 25 itself was the trigger.'
```

Note: tasks 001-004 are independent, non-conflicting units (no two touch the
same file) dispatched per the Agent Assignment Plan below; task-005's
verification is run directly by this run's own session against the actual
repository state once 001-004 land — not delegated and not trusted from a
self-report — per the Delegation Policy's instruction to verify a
subagent's output firsthand.

## 5. Parallelization Plan

```yaml
parallelization_plan:
  groups:
    - id: parallel-group-001
      tasks: ['task-001', 'task-002', 'task-003', 'task-004']
      reason: 'Four independent files, no shared state between them.'
      conflict_risks:
        - 'None — pom.xml, .sdkmanrc, ci-build.yaml, and CLAUDE.md are disjoint.'
```

## 6. Human Review Gates

```yaml
human_review_gates:
  gates: []
```

No gate is warranted: every task is a version bump with a clear, mechanical
acceptance criterion, and the one genuine technical uncertainty (RISK-1 —
Quarkus 3.21.1 under JDK 25) is resolved by running the actual build, not by
human judgment call.

## 7. Risk Assessment

```yaml
risk_assessment:
  by_task:
    - id: task-001
      risk: 'medium'
      rationale: 'Correct version numbers matter, and quarkus.platform.version must stay untouched; mitigated by TDD DEC-2''s Maven-Central-verified version list and a diff check.'
    - id: task-005
      risk: 'medium'
      rationale: 'Quarkus 3.21.1 may not tolerate release=25 cleanly (TDD RISK-1); mitigated by actually running the build rather than assuming.'
  by_area:
    - area: 'infra'
      risk: 'medium'
      rationale: 'Build-toolchain change; CI is the real gate and cannot be exercised directly from this sandbox, only statically reviewed.'
```

## 8. Confidence Assessment

```yaml
confidence_assessment:
  by_task:
    - id: task-001
      score: 80
      rationale: 'Versions verified against live Maven Central metadata, not memory.'
    - id: task-002
      score: 95
      rationale: 'Single-line change.'
    - id: task-003
      score: 90
      rationale: 'Verified against actions/setup-java''s own current README example.'
    - id: task-004
      score: 95
      rationale: 'Mechanical doc edit once the drift is resolved.'
    - id: task-005
      score: 70
      rationale: 'The one real unknown (Quarkus 3.21.1 + JDK 25) can only be confirmed by actually running the build, not by research alone.'
```

## 9. Agent Assignment Plan

```yaml
agent_assignment_plan:
  assignments:
    - task_id: task-001
      agent_role: 'Infrastructure Agent'
      objective: 'Bump pom.xml version properties and inline plugin versions per TDD DEC-1/DEC-2, leaving quarkus.platform.version and all quarkus-* coordinates untouched.'
      context:
        prd_excerpts: []
        tdd_excerpts: ['DEC-1', 'DEC-2', 'IMP-1']
      likely_files: ['pom.xml']
      acceptance_criteria:
        - 'maven.compiler.release=25; compiler-plugin.version=3.15.0; surefire-plugin.version=3.6.0; lombok=1.18.48; maven-release-plugin=3.3.1; asciidoctor-maven-plugin=3.2.0; asciidoctorj-diagram=3.2.1'
        - 'quarkus.platform.version and quarkus-* dependencies unchanged'
      verification: ['grep version strings', 'diff review']
      escalation_triggers: ['accidental quarkus.platform.version edit']
      suggested_subagent_type: 'general-purpose'
      suggested_model: '(default)'
    - task_id: task-002
      agent_role: 'Infrastructure Agent'
      objective: 'Set .sdkmanrc to java=25.0.4-tem.'
      context:
        prd_excerpts: []
        tdd_excerpts: ['IMP-2']
      likely_files: ['.sdkmanrc']
      acceptance_criteria: ['.sdkmanrc reads java=25.0.4-tem']
      verification: ['cat .sdkmanrc']
      escalation_triggers: []
      suggested_subagent_type: 'general-purpose'
      suggested_model: 'haiku'
    - task_id: task-003
      agent_role: 'Infrastructure Agent'
      objective: 'Update the CI JDK setup step per TDD DEC-3: actions/setup-java@v6, distribution temurin, java-version 25, step name "Set up JDK 25".'
      context:
        prd_excerpts: []
        tdd_excerpts: ['DEC-3', 'IMP-3']
      likely_files: ['.github/workflows/ci-build.yaml']
      acceptance_criteria:
        - 'uses: actions/setup-java@v6'
        - 'distribution: temurin'
        - "java-version: '25'"
        - 'no other step altered'
      verification: ['yaml parse check', 'diff review']
      escalation_triggers: ['unrelated workflow step changed']
      suggested_subagent_type: 'general-purpose'
      suggested_model: 'haiku'
    - task_id: task-004
      agent_role: 'Documentation Agent'
      objective: 'Replace the stale JDK-mismatch gotcha in CLAUDE.md with a statement that .sdkmanrc, pom.xml, and CI now consistently name Java 25.'
      context:
        prd_excerpts: []
        tdd_excerpts: ['IMP-4']
      likely_files: ['CLAUDE.md']
      acceptance_criteria: ['no remaining reference to a 17/21 mismatch', 'states Java 25 as the single version']
      verification: ['grep for stale version strings']
      escalation_triggers: []
      suggested_subagent_type: 'general-purpose'
      suggested_model: 'haiku'
    - task_id: task-005
      agent_role: 'QA Agent'
      objective: 'Run the actual local build under JDK 25 and record the real outcome, including any Quarkus/JDK-25 incompatibility.'
      context:
        prd_excerpts: []
        tdd_excerpts: ['ASM-2', 'RISK-1', 'Observability and Verification']
      likely_files: []
      acceptance_criteria: ['./mvnw verify result is recorded accurately, pass or fail, with the actual failing step named if it fails']
      verification: ['./mvnw verify', 'java -version']
      escalation_triggers: ['build failure traceable to Quarkus 3.21.1 + release=25']
      suggested_subagent_type: '(inline)'
      suggested_model: '(default)'
```

## 10. Verification Plan

```yaml
verification_plan:
  checks:
    - task_id: task-001
      methods: ['static diff/grep review']
      success_criteria: ['every TDD DEC-2 version present; quarkus.platform.version unchanged']
    - task_id: task-005
      methods: ['./mvnw verify under JDK 25 (JAVA_HOME + .sdkmanrc both pointing at Temurin 25.0.4)']
      success_criteria: ['BUILD SUCCESS, including Lombok annotation processing, Quarkus augmentation/ArC, and Asciidoctor doc generation (target/generated-docs/index.html produced)']
    - task_id: task-003
      methods: ['python3 -c "import yaml; yaml.safe_load(open(...))" or equivalent']
      success_criteria: ['workflow YAML remains valid']
```

## 11. Escalation Rules

```yaml
escalation_rules:
  rules:
    - condition: 'A build failure under JDK 25 is traceable to Quarkus 3.21.1 itself (ArC/Gizmo/Jandex bytecode handling), not to any file this run owns.'
      action: 'Do not touch quarkus.platform.version to work around it (out of this run''s authority/scope). Record as a blocker in this run''s prg Findings and in the final report to the human, naming it as a cross-run dependency the wave should be aware of even though the wave''s own risk note assumed none existed.'
    - condition: 'A plugin/library version from TDD DEC-2 turns out to not actually exist on Maven Central at execution time (metadata drift between drafting and implementation).'
      action: 'Re-check Maven Central directly and use the then-current latest; note the discrepancy in prg Findings.'
```

## 12. Final Execution Manifest

```yaml
execution_manifest:
  status: 'done'
  recommendation: 'proceed'
  autonomy_level: 'high'
  total_tasks: 5
  autonomous_tasks: 5
  review_before_tasks: 0
  review_after_tasks: 0
  human_required_tasks: 0
  blocked_tasks: 0
  critical_path_tasks:
    - task-001
    - task-005
  parallel_groups:
    - parallel-group-001
  required_human_gates: []
  highest_risk_tasks:
    - task-001
    - task-005
  lowest_confidence_tasks:
    - task-005
  next_action: 'None - run complete. ./mvnw verify is green under JDK 25 with quarkus.platform.version unchanged at 3.21.1; see this run''s prg for the full Findings trail and DEC-4/DEC-5 in the TDD for the fixes beyond the original scope seed that made it green.'
  criteria:
    - 'pom.xml sets maven.compiler.release=25 and the TDD DEC-2 plugin/library versions, quarkus.platform.version unchanged -- MET'
    - '.sdkmanrc, ci-build.yaml, and CLAUDE.md all name Java 25 with no drift -- MET'
    - './mvnw verify passes locally under JDK 25 -- MET (BUILD SUCCESS, 83/83 tests, Quarkus augmentation + Asciidoctor doc generation completed)'
```
