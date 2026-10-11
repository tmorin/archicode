---
title: Execution Plan — Standalone Editor — Load & Browse
status: done
date: 2026-10-04
related:
  - docs/wav/wav-003-standalone-workspace-editor/run/run-0008-standalone-editor-load-and-browse/prd-0008-standalone-editor-load-and-browse.md
  - docs/wav/wav-003-standalone-workspace-editor/run/run-0008-standalone-editor-load-and-browse/tdd-0008-standalone-editor-load-and-browse.md
type: pln
run: 8
wave: 003
---

# Execution Plan: Standalone Editor — Load & Browse

**Autonomy override in effect**: this run executes under `complete-run`'s
explicit autonomy override — `human_required`/`review_before` gating is
not honored as a stop condition here; a task proceeds autonomously unless
it hits a genuinely unresolvable conflict, missing credential, or product
tradeoff with no defensible single answer. No task in this plan carries
`risk: critical` or `human_review: required`, so this override does not
need to be exercised for anything below.

## 1. Executive Summary

```yaml
summary:
  status: 'done'
  product_goal: 'Let a person open src/main/resources/editor-webapp/standalone.html directly via file:// in a Chromium-based browser, pick a workspace folder once, have it remembered (or forgotten) across reloads, and browse its full resolved element tree, files, and settings read-only, with relationship-click navigation and a placeholder diagram area.'
  technical_approach: 'One new self-contained HTML file: a hand-written YAML-subset parser, a File System Access + IndexedDB persistence layer, a client-side mirror of the Workspace/Settings/Manifest/Element/Relationship domain model with recursive element indexing and same-layer relationship resolution, and a vanilla-DOM three-panel read-only UI driven by a single in-memory AppState object.'
  total_tasks: 2
  parallel_groups: 0
  high_risk_tasks: 0
  human_review_gates: 0
  autonomy_level: 'high'
  recommendation: 'proceed'
  criteria:
    - 'opening standalone.html via file:// and picking .custom shows its name in the top panel, with the Elements tree (Applications/Environments), Files list, and Settings entry all populated in the left panel'
    - 'every relationship in .custom resolves; a deliberately-broken synthetic copy surfaces a dangling relationship as explicitly flagged, non-navigable'
    - 'clicking an Applications/Environments tree item shows its read-only element view (placeholder diagram, qualitative+quantitative info, clickable relationships that navigate and update tree selection)'
    - 'clicking Settings/a Files item shows the current settings / that file''s raw YAML read-only'
    - 'reloading reopens .custom automatically (silently if already granted, one click otherwise); using the close action and reloading shows the initial picker again'
```

## 2. PRD/TDD Consistency Assessment

```yaml
consistency_assessment:
  aligned_items:
    - 'TDD DEC-1..11 each trace to a named PRD FR/NFR/TC/US/AC (see TDD''s own PRD Traceability section, corrected during Stage 7 to map NFR/TC items individually rather than by range)'
    - 'TDD DEC-5''s header.kind-prefix-parsing + recursive nested-element indexing rule, added during the TDD''s own KDMLLC review, is required for PRD FR-6/FR-7 to hold against any real .custom manifest — now explicit in both documents'
    - 'TDD DEC-8''s tree-nesting rules (including the top-level group fix) fully cover PRD FR-8''s Applications/Environments branch requirement'
    - 'PRD Q-1/Q-2 and TC-4 are each resolved by a named TDD decision (DEC-4, ASM-2, DEC-11) rather than left as silent assumptions'
    - 'PRD FR-16 (parse-failure baseline error state) is covered by TDD DEC-10'
  gaps: []
  blocking_gaps: []
```

No blocking gaps carried into execution. The one real design gap found
during drafting (TDD DEC-5/ASM-3's missing `header.kind`-prefix rule) was
caught and fixed in the TDD's own KDMLLC review (Stage 5), before this
plan was drafted — see the run's `prg` Findings for detail.

## 3. Execution Graph

```yaml
execution_graph:
  nodes:
    - id: task-001
      status: 'done'
      title: 'Data engine: YAML parser, FS Access + IndexedDB persistence, domain-model mirror, element indexing & relationship resolution'
      depends_on: []
      produces:
        - 'src/main/resources/editor-webapp/standalone.html (initial version: folder pick/persist/close working end-to-end; workspace.yaml + every manifest parsed into AppState; element index built per-layer; relationships resolved/flagged; no panel UI yet beyond a minimal diagnostic render confirming the above against a real folder)'
      agent_role: 'Frontend Implementation Agent'
      autonomy: 'autonomous'
      risk: 'medium'
      confidence: 70
    - id: task-002
      status: 'done'
      title: 'Three-panel read-only UI wired to the data engine'
      depends_on: ['task-001']
      produces:
        - 'src/main/resources/editor-webapp/standalone.html (final version: top/left/center panels, tree/files/settings navigation, element view with placeholder diagram + qualitative/quantitative info + relationship navigation, parse-failure error states, CSS)'
      agent_role: 'Frontend Implementation Agent'
      autonomy: 'autonomous'
      risk: 'low'
      confidence: 75
  edges:
    - from: task-001
      to: task-002
      reason: 'The UI renders AppState and triggers the same parse/index/persistence functions task-001 builds; task-002 cannot be meaningfully written, let alone verified, before that engine exists. Both tasks edit the same single file serially, not in parallel (matches the wave''s own documented largest-concurrent-batch of 1).'
```

## 4. Task Catalog

```yaml
task_catalog:
  tasks:
    - id: task-001
      title: 'Data engine: YAML parser, FS Access + IndexedDB persistence, domain-model mirror, element indexing & relationship resolution'
      source_requirements:
        prd:
          - 'FR-1'
          - 'FR-2'
          - 'FR-3'
          - 'FR-4'
          - 'FR-5'
          - 'FR-6'
          - 'FR-7'
          - 'NFR-1'
          - 'NFR-3'
          - 'TC-1'
          - 'TC-2'
          - 'TC-3'
          - 'TC-4'
        tdd:
          - 'DEC-2'
          - 'DEC-3'
          - 'DEC-4'
          - 'DEC-5'
          - 'DEC-11'
          - 'CON-1'
          - 'CON-2'
          - 'CON-3'
          - 'CON-4'
          - 'CON-5'
          - 'ASM-1'
          - 'ASM-2'
          - 'ASM-3'
          - 'ASM-4'
          - 'CTR-1'
          - 'CTR-2'
          - 'FLOW-1'
          - 'FLOW-2'
          - 'FLOW-3'
          - 'FLOW-4'
      outputs:
        - 'A standalone.html that, opened via file://, lets a person pick .custom, persists the handle, reopens it on reload (silently if granted, one click otherwise), and parses it into an AppState with every element indexed and every relationship marked resolved/dangling — exposed via a temporary on-page diagnostic (e.g. a visible element/relationship count) so task-002 and Stage 11 can verify it before any panel UI exists'
      verification:
        - 'manual file:// open against .custom: pick folder, confirm diagnostic count matches a manual tally of .custom''s elements/relationships'
        - 'manual file:// open against a deliberately-broken synthetic copy of .custom (one destination edited to a non-existent id) confirming it is flagged dangling, not silently dropped or crashing'
        - 'manual reload test: reopens silently when permission still granted; close action + reload shows initial picker'
        - 'grep the shipped file for http://, https://, <link, <script src to confirm no external dependency (NFR-1)'
      risk: 'medium'
      confidence: 70
      human_review: 'none'
      escalation_triggers:
        - 'a real .custom manifest uses a YAML feature outside CON-5''s declared subset and cannot be parsed by the hand-written parser'
        - 'the browser''s actual requestPermission()/queryPermission() behavior diverges from the MDN-documented behavior DEC-4 relies on'
      delegation_tier: 'standard'
    - id: task-002
      title: 'Three-panel read-only UI wired to the data engine'
      source_requirements:
        prd:
          - 'FR-8'
          - 'FR-9'
          - 'FR-10'
          - 'FR-11'
          - 'FR-12'
          - 'FR-13'
          - 'FR-14'
          - 'FR-15'
          - 'FR-16'
          - 'NFR-2'
          - 'NFR-4'
          - 'US-1'
          - 'US-2'
          - 'US-3'
          - 'US-4'
          - 'US-5'
        tdd:
          - 'DEC-1'
          - 'DEC-6'
          - 'DEC-7'
          - 'DEC-8'
          - 'DEC-9'
          - 'DEC-10'
          - 'IF-1'
          - 'IF-2'
          - 'IF-3'
          - 'FLOW-5'
      outputs:
        - 'Completed standalone.html: top panel (folder name + DEC-11 path presentation + close/reopen actions), left panel (Settings entry, two-branch collapsible Elements tree per DEC-8''s nesting rules, Files list), center panel (settings view, raw-YAML file view, element view with placeholder diagram + qualitative/quantitative info + clickable relationship navigation per DEC-6), parse-failure error states per DEC-10'
      verification:
        - 'manual file:// walkthrough against .custom reproducing every AC-1 through AC-12 in the PRD'
        - 'manual walkthrough against the deliberately-broken synthetic fixture reproducing AC-6 (dangling relationship flagged, non-navigable)'
        - 'manual check that clicking a resolved relationship updates both the center panel and the left panel''s tree selection (expanding collapsed ancestors), per AC-8'
        - 'manual check of all four application nesting levels (solution/system/container/component, including each group-flavored variant) and the technology environment/node/node recursion, against .custom''s real elements'
      risk: 'low'
      confidence: 75
      human_review: 'none'
      escalation_triggers:
        - 'a real .custom element kind combination (e.g. a group nested at a level task-001''s index didn''t anticipate) has no rendering rule in DEC-8'
      delegation_tier: 'standard'
```

## 5. Parallelization Plan

```yaml
parallelization_plan:
  groups: []
```

No parallel groups: task-002 depends on task-001 and both edit the same
single file, matching the wave's own documented risk that this wave is
"fully serial" with a largest concurrent batch of 1. Each task is
dispatched on its own, one after the other.

## 6. Human Review Gates

```yaml
human_review_gates:
  gates: []
```

None. Per `complete-run`'s autonomy override and this plan's own Risk/
Confidence Assessment below (no task at `critical` risk or requiring
human review), no gate is defined. The one deliberate human touchpoint is
this run's final report (Stage 11), not a mid-flight gate.

## 7. Risk Assessment

```yaml
risk_assessment:
  by_task:
    - id: task-001
      risk: 'medium'
      rationale: 'The hand-written YAML-subset parser and the FS Access permission/IndexedDB persistence flow are the two genuinely novel pieces of browser-API plumbing in this run; a mis-parse or a permission-flow mistake would silently corrupt every downstream view. Mitigated by verifying directly against every real .custom file and a deliberately-broken synthetic fixture before task-002 begins.'
    - id: task-002
      risk: 'low'
      rationale: 'Read-only rendering and click-navigation over an already-correct AppState (task-001''s output) — no new browser-API surface, no data mutation. Main risk is an incomplete nesting-rule branch (e.g. a group variant), caught by the walkthrough''s explicit per-kind check.'
  by_area:
    - area: 'ui'
      risk: 'low'
      rationale: 'Static, read-only rendering; no forms, no persistence of UI state beyond the folder handle (FR-15/DEC-9).'
    - area: 'data'
      risk: 'medium'
      rationale: 'Client-side YAML parsing and relationship resolution must match the real Java domain model''s semantics closely enough to avoid misrepresenting a real workspace (e.g. a false dangling flag, or a missed nested element) — no server-side validation backstops this phase.'
    - area: 'infra'
      risk: 'low'
      rationale: 'No build step, no new dependency, no deployment surface — a single static resource added to the repository.'
```

## 8. Confidence Assessment

```yaml
confidence_assessment:
  by_task:
    - id: task-001
      score: 70
      rationale: 'The domain-model mirror and reference-resolution formulas were verified against the real Java source and every real .custom file during TDD drafting and its KDMLLC review, which materially reduces risk; residual uncertainty is in the hand-written YAML parser''s coverage of CON-5''s subset and the exact runtime behavior of queryPermission/requestPermission, neither of which can be fully confirmed without running it in a real Chromium browser.'
    - id: task-002
      score: 75
      rationale: 'Rendering rules are fully enumerated in TDD DEC-6/DEC-7/DEC-8 with no open branch; residual uncertainty is only in whether every real nesting combination in .custom is correctly exercised by the manual walkthrough.'
```

## 9. Agent Assignment Plan

```yaml
agent_assignment_plan:
  assignments:
    - task_id: task-001
      agent_role: 'Frontend Implementation Agent'
      objective: 'Write src/main/resources/editor-webapp/standalone.html from scratch: a single self-contained HTML file implementing (a) a hand-written YAML-subset parser (TDD DEC-2/CON-5: block mappings/sequences, quoted/plain scalars, #comments, yes/no/true/false/null coercion — no anchors, flow collections, multi-doc, or block scalars), (b) showDirectoryPicker() + IndexedDB handle persistence (TDD DEC-3/CTR-2: database archicode-standalone-editor, store handles, key ''workspace'', structured-clone put, never JSON.stringify), (c) the permission re-grant flow (TDD DEC-4/CON-3: queryPermission first with no gesture; requestPermission only from a click handler), (d) parsing workspace.yaml and every manifest under settings.manifests.paths (non-recursive directory listing, .yaml/.yml only) into an AppState object (TDD CTR-1), (e) the header.kind-prefix-to-{category,rootKind} mapping table and recursive content.elements indexing (TDD DEC-5/ASM-3/ASM-4), and (f) same-layer relationship resolution marking each relationship resolved/dangling (TDD FLOW-4). Add a temporary, clearly-marked diagnostic render (e.g. a count of parsed elements/relationships/dangling references) so this task''s own output is directly checkable before any panel UI exists — task-002 will replace it.'
      context:
        prd_excerpts:
          - 'FR-1 through FR-7 (folder pick/persist/close, workspace+manifest parsing, reference building, relationship resolution)'
          - 'TC-1 through TC-4 (no server schema to borrow; vendored-parser scope; IndexedDB structured-clone requirement; no absolute path exposure)'
        tdd_excerpts:
          - 'DEC-2 (YAML parser), DEC-3 (IndexedDB), DEC-4 (permission flow), DEC-5 (indexing/resolution), DEC-11 (path presentation data), CON-1 through CON-5, ASM-1 through ASM-4, CTR-1/CTR-2, FLOW-1 through FLOW-4'
      likely_files:
        - 'src/main/resources/editor-webapp/standalone.html'
      acceptance_criteria:
        - 'AC-1 (folder name shown), AC-11 (silent/one-click reopen on reload), AC-12 (close clears the stored handle)'
        - 'AC-5/AC-6 (every real .custom relationship resolves; a deliberately-broken copy''s edited destination is flagged dangling)'
      verification:
        - 'Open the file via file:// against the real .custom directory in this repository; confirm the diagnostic count is plausible against a manual tally'
        - 'Create a throwaway copy of .custom with one destination edited to a nonexistent id; confirm it is flagged dangling, not silently dropped or crashing the parse'
        - 'Reload the page; confirm it reopens without a fresh showDirectoryPicker() prompt; use the close action and reload again; confirm the initial picker state returns'
      escalation_triggers:
        - 'Any real .custom file fails to parse with the implemented YAML subset'
      suggested_subagent_type: 'general-purpose'
      suggested_model: '(default)'
    - task_id: task-002
      agent_role: 'Frontend Implementation Agent'
      objective: 'Extend the existing src/main/resources/editor-webapp/standalone.html (produced by task-001 — read it first) to add the full three-panel read-only UI: top panel (DEC-11''s name+path presentation, close action, reopen-state button), left panel (Settings entry; Elements tree as two independently-collapsible branches, Applications and Environments, nested per DEC-8''s exact per-kind rules including every group variant; Files list by relative path), and center panel driven by selection (settings view per DEC-7, raw YAML view per DEC-7, element view per DEC-6 with an inert placeholder diagram area, qualitative info with clickable relationship navigation per FLOW-5, and quantitative info). Implement DEC-10''s parse-failure error states and DEC-9''s in-memory-only selection. Remove task-001''s temporary diagnostic once the real UI supersedes it.'
      context:
        prd_excerpts:
          - 'FR-8 through FR-16, NFR-2, NFR-4, US-1 through US-5 and their AC-1 through AC-12'
        tdd_excerpts:
          - 'DEC-1 (shell/state architecture), DEC-6 (element view), DEC-7 (settings/file views), DEC-8 (tree nesting, including the top-level-group and header.kind-prefix fixes from the TDD''s own review), DEC-9 (navigation state), DEC-10 (parse-failure UI), IF-1 through IF-3, FLOW-5'
      likely_files:
        - 'src/main/resources/editor-webapp/standalone.html'
      acceptance_criteria:
        - 'AC-1 through AC-12 in full (see PRD section 5)'
      verification:
        - 'Full manual file:// walkthrough against .custom reproducing every AC and the wave''s own P1 gate criteria'
        - 'Walkthrough against the deliberately-broken synthetic fixture for AC-6'
        - 'Visual/structural check that every one of .custom''s real element kinds (person, system, container, component, solution-less here but group variants where present, environment, node) renders in the correct tree branch at the correct nesting depth'
      escalation_triggers:
        - 'A real .custom element''s kind/nesting combination has no DEC-8 rule to follow'
      suggested_subagent_type: 'general-purpose'
      suggested_model: '(default)'
```

## 10. Verification Plan

```yaml
verification_plan:
  checks:
    - task_id: task-001
      methods:
        - 'manual validation (file:// open against .custom and a deliberately-broken synthetic copy)'
        - 'static check (grep for external references)'
      success_criteria:
        - 'every .custom element and relationship is accounted for in the diagnostic count'
        - 'the synthetic dangling reference is flagged, not dropped or crashing'
        - 'no http(s):// or external <link>/<script src> in the file'
    - task_id: task-002
      methods:
        - 'manual validation (full file:// walkthrough against .custom reproducing every PRD AC and wave P1 gate criterion)'
        - 'manual validation against the deliberately-broken synthetic fixture (AC-6)'
      success_criteria:
        - 'all five wave P1 gate criteria hold'
        - 'all twelve PRD ACs hold'
  repository_wide:
    - './mvnw verify (confirm this run''s addition of a static resource does not affect the existing Java build/test suite — no Java source is touched, so this is a regression check, not a feature test)'
    - 'git diff review confirming only src/main/resources/editor-webapp/standalone.html is added, and no wav-002 file (index.html, EditorHttpServer, etc.) is touched'
```

## 11. Escalation Rules

```yaml
escalation_rules:
  rules:
    - condition: 'A real .custom manifest uses a YAML construct outside CON-5''s declared subset and the hand-written parser cannot represent it'
      action: 'Extend the parser to cover the specific construct actually encountered (not a general-purpose rewrite); log the addition in the run''s prg Findings; do not silently drop or mis-parse the file'
    - condition: 'Chromium''s actual requestPermission()/queryPermission() behavior at verification time diverges from the MDN-documented behavior DEC-4 assumes'
      action: 'Adjust DEC-4''s flow to match observed behavior, log the discrepancy in the prg, and note it as a finding for the wave'
    - condition: 'A genuine product/UX tradeoff with no defensible single answer surfaces during implementation (not a technical question)'
      action: 'Stop that specific task, log it as a blocker in the prg, continue with unaffected tasks, and surface it in the final report — per the autonomy override, this is the one category that still warrants a human'
```

## 12. Final Execution Manifest

```yaml
execution_manifest:
  status: 'done'
  recommendation: 'proceed'
  autonomy_level: 'high'
  total_tasks: 2
  autonomous_tasks: 2
  review_before_tasks: 0
  review_after_tasks: 0
  human_required_tasks: 0
  blocked_tasks: 0
  critical_path_tasks:
    - task-001
    - task-002
  parallel_groups: []
  required_human_gates: []
  highest_risk_tasks:
    - task-001
  lowest_confidence_tasks:
    - task-001
  next_action: 'None — both tasks done and independently verified (see prg Log); run ready to report to the human as completed.'
  criteria:
    - 'all five wave P1 gate criteria hold against a real file:// walkthrough of .custom — HELD: verified via real-browser execution of the shipped code against the actual .custom content (AC-1 through AC-10 confirmed interactively); AC-11/AC-12 (folder persistence/reopen/close across a real page reload) could not be driven interactively in this sandboxed environment (native OS picker dialog; see prg Log) and are verified by code review against MDN-documented API behavior only — flagged to the human as the one unverified-by-interaction item'
    - 'all twelve PRD ACs hold — AC-1 through AC-10 confirmed live; AC-11/AC-12 confirmed by code review only (see above)'
    - './mvnw verify still exits 0 (no Java regression) — HELD: 144/144 tests pass, BUILD SUCCESS, confirmed with JAVA_HOME set to the project''s pinned Java 25 (.sdkmanrc)'
```
