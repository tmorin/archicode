---
title: Execution Plan — Bundle codec
status: draft
date: 2026-10-27
related:
  - docs/wav/wav-025-hosted-editor/run/run-0191-bundle-codec/tdd-0191-bundle-codec.md
  - docs/wav/wav-025-hosted-editor/wav-025-hosted-editor.md
  - 'gh:tmorin/archicode#162'
type: pln
run: 0191
wave: 025
---

# Execution Plan: Bundle codec

Profile TDD+pln: there is no PRD, so the requirement IDs REQ-1 to REQ-6 are the ones the TDD labels (section "PRD Traceability"), taken from #162 proposal 1, the wave plan and the P2 gate. The run operates under the autonomy override of complete-run: a task that would otherwise stop for a human is executed by an agent and the override is logged in the prg. No task below is `human_required`.

The Stage 5 review of the TDD (prg, Findings, 2026-10-27) found points the TDD text does not yet carry. This plan follows the review; where the TDD text differs, the decisions of gap-001 bind and task-001 writes them into the TDD.

## 1. Executive Summary

```yaml
summary:
  status: 'pending'
  product_goal: 'A whole workspace becomes one YAML text and one YAML text becomes the same files again, byte for byte (#162 proposal 1, wave 025 W-3), as two pure functions of the editor page, not called by anything yet.'
  technical_approach: 'Write the contract first as data (bundle-cases.json) and two node tests (cases, round trip over every shipped workspace), then the part persistence/bundle.js, its entries in layers.json and names.json, and the rebuilt page. Apply the Stage 5 findings to the TDD first.'
  total_tasks: 5
  parallel_groups: 1
  high_risk_tasks: 0
  human_review_gates: 0
  autonomy_level: 'high'
  recommendation: 'proceed'
  criteria:
    - 'src/main/editor/persistence/bundle.js exists, is listed in layers.json after persistence/save.js, and its top-level names are in names.json'
    - 'bundle-cases.test.js and bundle-roundtrip.test.js pass; the round trip covers every folder under src that holds a .archicode.yaml'
    - 'npm run test:unit, npm run lint, npm run format:check and npm run editor:check pass; ratchet.max in layers.json is not above 99; no part over 3000 lines'
    - 'npm run test:coverage passes with no floor lowered'
    - 'standalone.html is the output of npm run editor:build'
    - 'the missing-final-newline case and the round trip fail when the marker handling is broken on purpose (recorded in the run document)'
    - 'the TDD carries the Stage 5 decisions (gap-001) and the run document says scripts/byte-identity.sh was not run because the command line is untouched'
```

## 2. PRD/TDD Consistency Assessment

```yaml
consistency_assessment:
  aligned_items:
    - 'REQ-1 is addressed by TG-1, DEC-1 to DEC-4, FLOW-1 and FLOW-2 and by task-004'
    - 'REQ-2 by TG-2 and DEC-1; REQ-3 by TG-3, DEC-3 and IF-2; REQ-4 by TG-4, DEC-3, DEC-5 and FLOW-2'
    - 'REQ-5 by IMP-4, IMP-5 and CTR-2 (tasks 002 and 003); REQ-6 by TG-5, CON-1 to CON-4 and task-005'
    - 'layers.json holds persistence/save.js as the last persistence part, ratchet.max is 99, and no bundle name is in names.json (checked by the review)'
  gaps:
    - id: gap-001
      type: 'ambiguity'
      description: 'The TDD was not revised after the Stage 5 review. Its text leaves open or gets wrong: ASM-1 says the YAML test is lowercase (readManifestFolder uses the case-sensitive /\.(ya?ml)$/, so .YAML is not a manifest); DEC-3 lists "content that is not UTF-8" as an import problem; the 50-problem cap lives only in Reliability; the skipped sentence has no slot in CTR-2; bundlePathProblem has no return shape; path twice and the file-and-folder clash are checked on import only; IMP-5 has no walk rule; the cross-realm Uint8Array of the vm harness; DEC-5 leaves the length computation open; the sort order is not named; Windows-refused names are not discussed.'
      impact: 'medium'
      recommendation: 'Decisions the plan binds: (1) the YAML test is the same case-sensitive expression as readManifestFolder, no lowercasing; (2) UTF-8 is a bundle-side skip reason only, not an import problem; (3) the cap of 50 problems is dropped, all problems are reported (the 10 MiB limit bounds the list), one case less; (4) the bundle cases carry a sentence field for bundleSkippedSentence; (5) bundlePathProblem(path) returns a reason phrase or null, used as skipped.reason on export and inside the import sentence, the reason words are listed once; (6) path twice and the file-and-folder clash are checked on export too (the later path is skipped), so a written bundle is a read bundle; (7) the round trip walks each folder recursively, files only, relative paths with /, and the nested workspace file of a nested workspace shows up in skipped as hidden; (8) tests compare bytes with Buffer.compare or Array.from and the codec never uses instanceof Uint8Array on its input; (9) the size is TextEncoder().encode(text).length, encoded once; (10) the order is code point order, not the UTF-16 order of < , and the reader accepts separators in any order and returns files sorted; (11) paths with names Windows refuses are not refused by the codec (it writes no file; it carries the paths of a folder that exists or a bundle its author wrote), said in DEC-3; (12) an empty list gives an empty text that import refuses ("no file"), and a bundle without a root .archicode.yaml is accepted (W-4 and W-5 decide); (13) the BOM is written as ﻿ in the TDD; (14) a hit of the round trip on a shipped YAML with a separator-like line is fixed in that file, not in the assertion (RISK-5).'
    - id: gap-002
      type: 'missing_requirement'
      description: 'Two checks the TDD defers to the plan: the shipped paths lowercased (ASM-3: no two paths of one folder differ only by case) and a grep of names.json for a name collision before the part is written (IMP-1, RISK-3).'
      impact: 'low'
      recommendation: 'task-003 holds the lowercased-paths assertion as a test; task-004 runs the grep first.'
  blocking_gaps: []
```

## 3. Execution Graph

```yaml
execution_graph:
  nodes:
    - id: task-001
      status: 'done'
      title: 'Apply the Stage 5 decisions to the TDD'
      depends_on: []
      produces:
        - 'tdd-0191-bundle-codec.md revised'
      agent_role: 'Documentation Agent'
      autonomy: 'autonomous'
      risk: 'low'
      confidence: 90
    - id: task-002
      status: 'pending'
      title: 'Write bundle-cases.json and the cases test (red)'
      depends_on: [task-001]
      produces:
        - 'src/test/resources/editor-bundle/bundle-cases.json'
        - 'src/test/javascript/viewpoint-kernel/bundle-cases.test.js'
      agent_role: 'Test Generation Agent'
      autonomy: 'autonomous'
      risk: 'low'
      confidence: 78
    - id: task-003
      status: 'pending'
      title: 'Write the round-trip test over every shipped workspace (red)'
      depends_on: [task-001]
      produces:
        - 'src/test/javascript/viewpoint-kernel/bundle-roundtrip.test.js'
      agent_role: 'Test Generation Agent'
      autonomy: 'autonomous'
      risk: 'low'
      confidence: 80
    - id: task-004
      status: 'pending'
      title: 'Write persistence/bundle.js and register it'
      depends_on: [task-002, task-003]
      produces:
        - 'src/main/editor/persistence/bundle.js'
        - 'src/main/editor/layers.json'
        - 'src/main/editor/names.json'
        - 'src/main/resources/editor-webapp/standalone.html'
      agent_role: 'Frontend Implementation Agent'
      autonomy: 'autonomous'
      risk: 'medium'
      confidence: 80
    - id: task-005
      status: 'pending'
      title: 'Run every gate, show the tests fail on a broken marker, record in the run document'
      depends_on: [task-004]
      produces:
        - 'run-0191-bundle-codec.md with the verification record'
      agent_role: 'QA Agent'
      autonomy: 'autonomous'
      risk: 'low'
      confidence: 85
  edges:
    - from: task-001
      to: task-002
      reason: 'the cases follow the decisions of gap-001 (sentence field, no cap, export checks)'
    - from: task-001
      to: task-003
      reason: 'the round trip follows the walk rule and the byte comparison of gap-001'
    - from: task-002
      to: task-004
      reason: 'the contract is written before the code'
    - from: task-003
      to: task-004
      reason: 'the round trip is written before the code'
    - from: task-004
      to: task-005
      reason: 'the gates run on the finished part'
```

## 4. Task Catalog

```yaml
task_catalog:
  tasks:
    - id: task-001
      title: 'Apply the Stage 5 decisions to the TDD'
      source_requirements:
        prd: []
        tdd:
          - 'ASM-1, ASM-3, DEC-3, DEC-4, DEC-5, CTR-2, IF-2, IMP-4, IMP-5, Reliability, Non-Goals, RISK-5'
      outputs:
        - 'tdd-0191-bundle-codec.md edited so that every decision of gap-001 (1 to 14) is in its text, status stays draft'
      verification:
        - 'grep -c "compared in lowercase" in the TDD gives 0'
        - 'grep -c "and N more" in the TDD gives 0'
        - 'grep -c "Task 1 aligns" in the TDD gives 0'
        - 'grep -c "sentence" in the TDD shows CTR-2 names a sentence field (the count is at least 2)'
        - 'grep -c "Buffer.compare" in the TDD gives at least 1'
      risk: 'low'
      confidence: 90
      human_review: 'none'
      escalation_triggers:
        - 'a decision of gap-001 contradicts a passage of the TDD that this task cannot reconcile in a sentence'
      delegation_tier: 'standard'
      results: 'tier standard, model sonnet, effort medium, profile low-cost, passed first time, inline (leaf), independently verified'
    - id: task-002
      title: 'Write bundle-cases.json and the cases test (red)'
      source_requirements:
        prd: []
        tdd:
          - 'REQ-2, REQ-3, REQ-4, REQ-5, CTR-1, CTR-2, IF-1 to IF-4, DEC-1 to DEC-5, Observability and Verification'
      outputs:
        - 'src/test/resources/editor-bundle/bundle-cases.json with the sections bundle and unbundle of CTR-2 (a sentence field for the skipped sentence), covering: a plain file, CRLF, a BOM, a missing final newline, an empty file, a lone CR at the end, --- and --- # file not at a line start, a file with a real separator line (skipped), a non-YAML name, .YAML (skipped), bytes that are not UTF-8 (given as a list of numbers), a hidden file, every refused path form, a path twice, a file and a folder (on export and on import), a text over maxBytes, a lead-in comment and a bad lead-in, no file, a separator with an empty path, CRLF separators, a BOM of the bundle itself, output order in code point order with an astral character, a separator with the marker in any order of input'
        - 'src/test/javascript/viewpoint-kernel/bundle-cases.test.js reading the file with createApp, comparing bytes with Buffer.compare or Array.from, a reason and a sentence as written'
      verification:
        - 'node --test src/test/javascript/viewpoint-kernel/bundle-cases.test.js runs and fails because the name is missing from the page, app.bundleWorkspaceFiles is not a function (red), not because of a syntax error in the test or the JSON'
        - 'node -e "JSON.parse(require(''fs'').readFileSync(''src/test/resources/editor-bundle/bundle-cases.json'',''utf8''))" exits 0'
        - 'npx prettier --check src/test/javascript/viewpoint-kernel/bundle-cases.test.js exits 0'
      risk: 'low'
      confidence: 78
      human_review: 'none'
      escalation_triggers:
        - 'a case cannot be expressed in the CTR-2 shape'
        - 'the vm harness cannot load a part that is not yet in the page, so the red state cannot be shown'
      delegation_tier: 'standard'
    - id: task-003
      title: 'Write the round-trip test over every shipped workspace (red)'
      source_requirements:
        prd: []
        tdd:
          - 'REQ-1, REQ-5, TG-1, ASM-3, IMP-5, RISK-5, Observability and Verification'
      outputs:
        - 'src/test/javascript/viewpoint-kernel/bundle-roundtrip.test.js: finds every folder under src that holds a .archicode.yaml (the rule of scripts/byte-identity.sh), walks each recursively (files only, relative paths with /), bundles all its files, asserts unbundle gives back the same paths and bytes of the carried ones, bundling in reverse order gives the same text, skipped is exactly the non-YAML and the hidden files (the nested workspace file included), and no two paths of one folder are equal when lowercased'
      verification:
        - 'node --test src/test/javascript/viewpoint-kernel/bundle-roundtrip.test.js runs and fails because the name is missing from the page, app.bundleWorkspaceFiles is not a function (red)'
        - 'the test names how many folders it found and asserts that count is at least 20'
        - 'npx prettier --check src/test/javascript/viewpoint-kernel/bundle-roundtrip.test.js exits 0'
      risk: 'low'
      confidence: 80
      human_review: 'none'
      escalation_triggers:
        - 'the test takes more than a few seconds to walk the folders'
      delegation_tier: 'standard'
    - id: task-004
      title: 'Write persistence/bundle.js and register it'
      source_requirements:
        prd: []
        tdd:
          - 'REQ-1 to REQ-4, REQ-6, TG-1 to TG-5, DEC-1 to DEC-5, CTR-1, CTR-3, FLOW-1, FLOW-2, IMP-1 to IMP-3, CON-1 to CON-5'
      outputs:
        - 'src/main/editor/persistence/bundle.js: BUNDLE_SEPARATOR_PREFIX, BUNDLE_NO_FINAL_NEWLINE, BUNDLE_MAX_BYTES, bundleSeparatorAt, bundlePathProblem, bundleWorkspaceFiles, unbundleWorkspaceFiles, bundleSkippedSentence, no DOM, no AppState, no instanceof Uint8Array, one decode per file with TextDecoder fatal and ignoreBOM, size measured first'
        - 'src/main/editor/layers.json with the part listed as persistence after persistence/save.js; ratchet.max unchanged'
        - 'src/main/editor/names.json rewritten with node scripts/check-editor.mjs --write-names'
        - 'src/main/resources/editor-webapp/standalone.html rebuilt with npm run editor:build'
      verification:
        - 'grep for each new top-level name in src/main/editor/names.json before writing finds none (no collision)'
        - 'npx prettier --check src/main/editor/persistence/bundle.js exits 0'
        - 'npm run editor:build then npm run editor:check exit 0'
        - 'node --test src/test/javascript/viewpoint-kernel/bundle-cases.test.js src/test/javascript/viewpoint-kernel/bundle-roundtrip.test.js exits 0'
        - 'npm run lint exits 0'
      risk: 'medium'
      confidence: 80
      human_review: 'none'
      escalation_triggers:
        - 'a shipped file holds a line that looks like a separator: fix the file, never the assertion, and log it'
        - 'the ratchet count rises above 99 or a name of a higher layer is needed'
        - 'a case of task-002 contradicts the TDD after task-001: fix the decision in the TDD and the case together, log it'
      delegation_tier: 'standard'
    - id: task-005
      title: 'Run every gate, show the tests fail on a broken marker, record in the run document'
      source_requirements:
        prd: []
        tdd:
          - 'REQ-5, REQ-6, TG-5, Observability and Verification, Deployment and Rollout'
      outputs:
        - 'run-0191-bundle-codec.md: a Verification section with each command and its result, the mutation that was shown to fail and its restoration, the statement that scripts/byte-identity.sh was not run because the command line is untouched'
      verification:
        - 'npm run test:unit exits 0'
        - 'npm run lint exits 0'
        - 'npm run format:check exits 0'
        - 'npm run editor:check exits 0 and the ratchet in layers.json is not above 99'
        - 'npm run test:coverage exits 0 (no floor lowered; git diff scripts/editor-coverage-floor.json is empty)'
        - 'wc -l of every file under src/main/editor/persistence is under 3000'
        - 'with the marker handling broken on purpose (the added newline always dropped) and npm run editor:build run, the missing-final-newline case and the round trip fail; after the part is restored and the page rebuilt, npm run editor:check exits 0 and git diff of bundle.js against its saved copy is empty'
      risk: 'low'
      confidence: 85
      human_review: 'none'
      escalation_triggers:
        - 'a coverage floor would have to be lowered'
        - 'the mutation does not make a test fail'
      delegation_tier: 'standard'
```

## 5. Parallelization Plan

```yaml
parallelization_plan:
  groups:
    - id: parallel-group-001
      tasks:
        - task-002
        - task-003
      reason: 'Two test files with no shared file: the cases file and its test, the round-trip test. Both depend on task-001 only.'
      conflict_risks:
        - 'both call the same not-yet-existing functions of the page; neither edits layers.json, names.json or the page'
        - 'a shared helper for byte comparison must not be put in harness.js by both; each test keeps its own'
```

## 6. Human Review Gates

```yaml
human_review_gates:
  gates: []
```

No gate: every task is isolated, additive and dead code until W-4 and W-5 call it. The autonomy override of complete-run is not needed by this plan. The wave's own gate P2 comes after W-5, not here.

## 7. Risk Assessment

```yaml
risk_assessment:
  by_task:
    - id: task-001
      risk: 'low'
      rationale: 'A document edit, checked by greps.'
    - id: task-002
      risk: 'low'
      rationale: 'Test data and a test; no production code.'
    - id: task-003
      risk: 'low'
      rationale: 'A test that reads the repository; the risk is a slow walk.'
    - id: task-004
      risk: 'medium'
      rationale: 'The page is generated and shared by every editor test; a wrong layer or a name collision stops editor:check and the node suite. The part is pure and nothing calls it.'
    - id: task-005
      risk: 'low'
      rationale: 'Runs checks and edits only the run document.'
  by_area:
    - area: 'security'
      risk: 'low'
      rationale: 'The import is the one place a hostile text reaches the editor; the path rules and the size limit are cases of task-002, and the codec writes nothing.'
    - area: 'ui'
      risk: 'low'
      rationale: 'No button, dialog or draw; nothing user-visible until W-5.'
    - area: 'docs'
      risk: 'low'
      rationale: 'CLAUDE.md and the manual are left to W-5 and W-6 (IMP-6); editor:check guards the names list.'
```

## 8. Confidence Assessment

```yaml
confidence_assessment:
  by_task:
    - id: task-001
      score: 90
      rationale: 'The decisions are listed one by one in gap-001.'
    - id: task-002
      score: 78
      rationale: 'Many cases and escapes in JSON strings; the vm realm needs care with bytes. The red state depends on the harness tolerating a missing name.'
    - id: task-003
      score: 80
      rationale: 'The folder rule exists in scripts/byte-identity.sh; the walk and the nested workspace case are decided.'
    - id: task-004
      score: 80
      rationale: 'About 200 lines of a defined format; the edge cases (marker, CRLF, lone CR, clashes) are all in the cases.'
    - id: task-005
      score: 85
      rationale: 'Every check is a command; the coverage run takes minutes but is deterministic.'
```

## 9. Agent Assignment Plan

```yaml
agent_assignment_plan:
  assignments:
    - task_id: task-001
      agent_role: 'Documentation Agent'
      objective: 'Write the fourteen decisions of gap-001 into the TDD without changing its structure or its status.'
      context:
        prd_excerpts: []
        tdd_excerpts:
          - 'the sections named in the task, and the Findings of prg-0191-bundle-codec.md'
      likely_files:
        - 'docs/wav/wav-025-hosted-editor/run/run-0191-bundle-codec/tdd-0191-bundle-codec.md'
      acceptance_criteria:
        - 'each decision is in the text once, in the section that owns it'
      verification:
        - 'the greps of the task'
      escalation_triggers:
        - 'a contradiction that needs a new decision'
      suggested_subagent_type: 'general-purpose'
      suggested_model: '(default)'
      suggested_effort: 'medium'
    - task_id: task-002
      agent_role: 'Test Generation Agent'
      objective: 'Write the contract as data and a test that reads it, red until the part exists.'
      context:
        prd_excerpts: []
        tdd_excerpts:
          - 'CTR-1, CTR-2, DEC-1 to DEC-5 as revised by task-001'
      likely_files:
        - 'src/test/resources/editor-bundle/bundle-cases.json'
        - 'src/test/javascript/viewpoint-kernel/bundle-cases.test.js'
        - 'src/test/javascript/viewpoint-kernel/yaml.test.js (a model for reading a cases file)'
        - 'src/test/javascript/viewpoint-kernel/harness.js'
      acceptance_criteria:
        - 'every case family of the task output list is present'
        - 'the test fails for the right reason'
      verification:
        - 'the commands of the task'
      escalation_triggers:
        - 'the harness cannot expose a name that is not in the page'
      suggested_subagent_type: 'general-purpose'
      suggested_model: '(default)'
      suggested_effort: 'medium'
    - task_id: task-003
      agent_role: 'Test Generation Agent'
      objective: 'Write the round trip over every shipped workspace folder.'
      context:
        prd_excerpts: []
        tdd_excerpts:
          - 'IMP-5, ASM-3, RISK-5 as revised by task-001'
      likely_files:
        - 'src/test/javascript/viewpoint-kernel/bundle-roundtrip.test.js'
        - 'scripts/byte-identity.sh (the folder rule)'
      acceptance_criteria:
        - 'at least 20 folders are found and each is round-tripped'
        - 'the lowercased-paths assertion is present'
      verification:
        - 'the commands of the task'
      escalation_triggers:
        - 'the walk is slow'
      suggested_subagent_type: 'general-purpose'
      suggested_model: '(default)'
      suggested_effort: 'medium'
    - task_id: task-004
      agent_role: 'Frontend Implementation Agent'
      objective: 'Write the part so that the two tests pass, register it, rebuild the page.'
      context:
        prd_excerpts: []
        tdd_excerpts:
          - 'Proposed Design, DEC-1 to DEC-5, CTR-1, CTR-3, FLOW-1, FLOW-2 as revised'
      likely_files:
        - 'src/main/editor/persistence/bundle.js'
        - 'src/main/editor/layers.json'
        - 'src/main/editor/names.json'
        - 'src/main/resources/editor-webapp/standalone.html'
        - 'src/main/editor/persistence/workspace-loading.js (the YAML test to reuse as written)'
      acceptance_criteria:
        - 'both tests pass'
        - 'editor:check passes with ratchet.max at most 99'
        - 'the part is pure: no AppState, no DOM, no name of a layer above persistence'
      verification:
        - 'the commands of the task'
      escalation_triggers:
        - 'the ratchet rises'
        - 'a case and the TDD disagree'
      suggested_subagent_type: 'general-purpose'
      suggested_model: '(default)'
      suggested_effort: 'medium'
    - task_id: task-005
      agent_role: 'QA Agent'
      objective: 'Run the gates, break the marker handling on purpose and show the tests fail, restore, record all of it in the run document.'
      context:
        prd_excerpts: []
        tdd_excerpts:
          - 'Observability and Verification'
      likely_files:
        - 'docs/wav/wav-025-hosted-editor/run/run-0191-bundle-codec/run-0191-bundle-codec.md'
        - 'src/main/editor/persistence/bundle.js'
      acceptance_criteria:
        - 'every command of the task exits 0 and the record lists each'
        - 'the part is byte for byte as before the mutation'
      verification:
        - 'the commands of the task'
      escalation_triggers:
        - 'a floor would be lowered'
        - 'the mutation passes'
      suggested_subagent_type: 'general-purpose'
      suggested_model: '(default)'
      suggested_effort: 'low'
```

## 10. Verification Plan

```yaml
verification_plan:
  checks:
    - task_id: task-001
      methods:
        - 'grep checks on the TDD'
      success_criteria:
        - 'the removed phrases are gone and the added ones are present'
    - task_id: task-002
      methods:
        - 'JSON parse'
        - 'node --test, red for the missing name'
        - 'prettier check'
      success_criteria:
        - 'the failure message names a missing function, not a syntax error'
    - task_id: task-003
      methods:
        - 'node --test, red for the missing name'
        - 'prettier check'
      success_criteria:
        - 'at least 20 folders found; failure names the missing function'
    - task_id: task-004
      methods:
        - 'unit tests'
        - 'npm run editor:check'
        - 'npm run lint'
        - 'prettier check'
      success_criteria:
        - 'both bundle tests pass; the page is the assembly; the ratchet is at most 99; no lint finding'
    - task_id: task-005
      methods:
        - 'npm run test:unit'
        - 'npm run test:coverage'
        - 'npm run lint'
        - 'npm run format:check'
        - 'npm run editor:check'
        - 'mutation of the marker handling'
      success_criteria:
        - 'all exit 0; the mutation turns the missing-final-newline case and the round trip red; the restored part is identical'
```

## 11. Escalation Rules

```yaml
escalation_rules:
  rules:
    - condition: 'A case of the cases file and the TDD disagree'
      action: 'Decide in the TDD, change the TDD and the case together, log the decision in the prg, continue.'
    - condition: 'ratchet.max would have to rise, or the part needs a name of a layer above persistence'
      action: 'Stop the task, move the dependency down or pass it as a parameter; if impossible, log a blocker and stop.'
    - condition: 'A shipped file holds a line that looks like a bundle separator'
      action: 'Fix that file (it is a documentation example), never the assertion; log it.'
    - condition: 'A coverage floor would have to be lowered'
      action: 'Add cases to cover the part; never lower a floor.'
    - condition: 'A task fails its verification'
      action: 'Re-dispatch once one effort step up with the failing output; a second failure is handled inline and logged as a finding.'
    - condition: 'Any task flagged human_required or review_before appears'
      action: 'None is planned. This run operates under the autonomy override of complete-run; if one appears it is executed by an agent and the override is logged in the prg.'
```

## 12. Final Execution Manifest

```yaml
execution_manifest:
  status: 'in_progress'
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
    - task-002
    - task-004
    - task-005
  parallel_groups:
    - parallel-group-001
  required_human_gates: []
  highest_risk_tasks:
    - task-004
  lowest_confidence_tasks:
    - task-002
    - task-004
  next_action: 'Run task-001: apply the decisions of gap-001 to the TDD.'
  criteria:
    - 'both bundle tests pass and the page is the assembly of its parts'
    - 'lint, format, editor:check, unit tests and coverage pass with no floor lowered and ratchet.max at most 99'
    - 'the verification record is in the run document'
```
