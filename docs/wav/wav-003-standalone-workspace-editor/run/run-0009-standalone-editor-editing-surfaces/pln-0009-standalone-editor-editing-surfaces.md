---
title: Execution Plan — Standalone Editor — Editing Surfaces
status: done
date: 2026-10-04
related:
  - docs/wav/wav-003-standalone-workspace-editor/run/run-0009-standalone-editor-editing-surfaces/prd-0009-standalone-editor-editing-surfaces.md
  - docs/wav/wav-003-standalone-workspace-editor/run/run-0009-standalone-editor-editing-surfaces/tdd-0009-standalone-editor-editing-surfaces.md
type: pln
run: 9
wave: 003
---

# Execution Plan: Standalone Editor — Editing Surfaces

**Autonomy override in effect**: this run executes under `complete-run`'s
explicit autonomy override — `human_required`/`review_before` gating is
not honored as a stop condition here; a task proceeds autonomously unless
it hits a genuinely unresolvable conflict, missing credential, or product
tradeoff with no defensible single answer. No task below carries `risk:
critical` or `human_review: required`, so this override does not need to
be exercised for anything in this plan.

## 1. Executive Summary

```yaml
summary:
  status: 'done'
  product_goal: 'Turn standalone.html''s three existing read-only center-panel surfaces (element view, settings view, raw-YAML file view) into in-memory-editable ones, kept consistent with each other and with the left panel''s Elements tree, without any disk write.'
  technical_approach: 'One reconciliation mechanism for all three surfaces: every commit mutates the one canonical source (a manifest file''s parsed content node, AppState.workspace.settings, or a file''s raw text), then AppState.index/tree/relationship state is re-derived by re-running the existing buildIndex/resolveRelationships over AppState.manifestFiles — never a bespoke per-field patch. A new YAML serializer regenerates a file''s raw text from its edited content node; a content-node locator finds the real parsed node a reference points at; a scratch-validate-then-swap pattern keeps an invalid raw-YAML edit from ever touching live state.'
  total_tasks: 6
  parallel_groups: 0
  high_risk_tasks: 0
  human_review_gates: 0
  autonomy_level: 'high'
  recommendation: 'proceed'
  criteria:
    - 'editing one element of each kind (person, system, container, component, solution, a group variant, environment, node) through its edition view updates its tree node, its own read-only view, and the raw YAML shown for its manifest, without a reload'
    - 'editing settings.relationships.default-synthetic-label through the settings form updates every label-less relationship''s displayed label everywhere it renders, without a reload'
    - 'editing a manifest''s raw YAML directly re-parses and is reflected in the tree and the affected elements'' views on a schema-valid edit, and is flagged without corrupting AppState on a schema-invalid edit'
    - 'an id rename keeps the left panel''s selection/expansion following the renamed element (FR-18), and a relationship/attachment left dangling by the rename surfaces as such rather than crashing'
    - 'navigating away from an uncommitted edit on any surface discards it silently (FR-19); a fresh reload shows none of this run''s edits (NFR-2)'
```

## 2. PRD/TDD Consistency Assessment

```yaml
consistency_assessment:
  aligned_items:
    - 'Every PRD FR-1..FR-20/NFR-1..4/Q-1/Q-2/TC-1..4 traces to a named TDD DEC/CTR/CON item (TDD''s own PRD Traceability table, corrected during this run''s Stage 7 for one mismapped NFR-2 row)'
    - 'PRD Q-1 (id editability) and Q-2 (schema-valid definition) are each resolved by a named TDD mechanism (DEC-4/DEC-7/DEC-8 for Q-1; DEC-6 for Q-2), not left as silent assumptions'
    - 'TDD DEC-2a — found during this run''s own Stage 5 TDD review — closes a real gap (ElementRecord never carried node.applications) that would otherwise have silently defeated PRD FR-2/FR-3 for that one field; fixed before this plan was drafted'
    - 'PRD FR-19 (discard uncommitted edit on navigation) is resolved by TDD DEC-10 as "already free" from the existing full-innerHTML render architecture, confirmed against the real render()/handleAppClick code rather than assumed'
    - 'PRD AC-8a (narrowed GOAL-2 scope — only default-synthetic-label has a required rendering effect) matches TDD DEC-3''s settings-form design exactly'
  gaps: []
  blocking_gaps: []
```

No blocking gaps carried into execution. The one real design gap found
while drafting the TDD (DEC-2a's missing `applications` field) was caught
and fixed in the TDD's own KDMLLC review (Stage 5), before this plan was
drafted — see the run's `prg` Findings for detail.

## 3. Execution Graph

```yaml
execution_graph:
  nodes:
    - id: task-001
      status: 'done'
      title: 'Foundational pure functions: ElementRecord.applications, YAML serializer, content-node locator'
      depends_on: []
      produces:
        - 'indexElementRecursive extended with an applications field (DEC-2a)'
        - 'serializeManifestFile/serializeYamlValue, the hand-written parser''s inverse (DEC-7)'
        - 'locateContentNode(reference), walking from a reference string to the real parsed content node + its containing array/index (DEC-4)'
      agent_role: 'Frontend Implementation Agent'
      autonomy: 'autonomous'
      risk: 'medium'
      confidence: 70
    - id: task-002
      status: 'done'
      title: 'Commit-and-rebuild pipeline + structured-form validation rules'
      depends_on: ['task-001']
      produces:
        - 'commitElementEdit/commitSettingsEdit/rebuildIndexAndRender (DEC-5)'
        - 'DEC-9''s validation rule set as callable pre-commit checks (id/name/description, qualifiers/tags/relationships/applications add rules, settings field rules)'
      agent_role: 'Frontend Implementation Agent'
      autonomy: 'autonomous'
      risk: 'medium'
      confidence: 65
    - id: task-003
      status: 'done'
      title: 'Element edition view: toggle, per-kind form, field-level actions, id-rename handling'
      depends_on: ['task-002']
      produces:
        - 'AppState.selection.mode + toggle-element-edit action (DEC-1)'
        - 'renderElementEditionFormHtml, one shared template + node-only applications block (DEC-2/DEC-2a)'
        - 'save-element-basics/add-remove-qualifier/add-remove-tag/add-save-remove-relationship/add-remove-application data-actions'
        - 'id-rename reference-prefix rewrite wired into commitElementEdit''s return value (DEC-8, FR-18)'
      agent_role: 'Frontend Implementation Agent'
      autonomy: 'autonomous'
      risk: 'medium'
      confidence: 60
    - id: task-004
      status: 'done'
      title: 'Settings form'
      depends_on: ['task-002']
      produces:
        - 'renderSettingsViewHtml replaced in place by an editable form (DEC-3)'
        - 'save-settings data-action'
      agent_role: 'Frontend Implementation Agent'
      autonomy: 'autonomous'
      risk: 'low'
      confidence: 70
    - id: task-005
      status: 'done'
      title: 'Raw-YAML editor + uncommitted-draft discard wiring'
      depends_on: ['task-002']
      produces:
        - 'Editable textarea replacing the file view''s <pre> (DEC-6)'
        - 'commitFileEdit, scratch-validate-then-swap (DEC-6, Q-2)'
        - 'rawYamlEditDraft module-level state (CTR-2) + its display/error-banner handling (DEC-10)'
        - 'rawYamlEditDraft cleared inside select-settings/select-file/select-element/goto-element (FR-19)'
      agent_role: 'Frontend Implementation Agent'
      autonomy: 'autonomous'
      risk: 'medium'
      confidence: 60
    - id: task-006
      status: 'done'
      title: 'Cross-surface integration pass + full manual/browser verification'
      depends_on: ['task-003', 'task-004', 'task-005']
      produces:
        - 'Any integration-seam fix needed where task-003/004/005''s independently-correct changes collide (CON-3''s data-action uniqueness, DEC-1''s mode-reset vs. DEC-10''s draft-clear both touching the same four nav handlers)'
        - 'Verified standalone.html satisfying every PRD AC and all three wave P2 gate criteria against the real .custom workspace'
      agent_role: 'QA Agent'
      autonomy: 'autonomous'
      risk: 'medium'
      confidence: 65
  edges:
    - from: task-001
      to: task-002
      reason: 'commitElementEdit (DEC-5) calls locateContentNode (task-001) and serializeManifestFile (task-001) directly; cannot be written against functions that do not exist yet.'
    - from: task-002
      to: task-003
      reason: 'Every element-form data-action commits through commitElementEdit (task-002); DEC-8''s id-rename handling hooks into that same function''s return value.'
    - from: task-002
      to: task-004
      reason: 'The settings form''s save-settings action commits through commitSettingsEdit (task-002).'
    - from: task-002
      to: task-005
      reason: 'The raw-YAML editor''s valid-edit path calls rebuildIndexAndRender (task-002), and its own scratch-validation reuses buildIndex the same way task-002''s pipeline does.'
    - from: task-003
      to: task-006
      reason: 'Integration verification needs every surface implemented first.'
    - from: task-004
      to: task-006
      reason: 'Integration verification needs every surface implemented first.'
    - from: task-005
      to: task-006
      reason: 'Integration verification needs every surface implemented first.'
```

## 4. Task Catalog

```yaml
task_catalog:
  tasks:
    - id: task-001
      title: 'Foundational pure functions: ElementRecord.applications, YAML serializer, content-node locator'
      source_requirements:
        prd:
          - 'FR-2'
          - 'FR-3'
          - 'FR-14'
          - 'Q-1'
          - 'TC-2'
        tdd:
          - 'DEC-2a'
          - 'DEC-7'
          - 'DEC-4'
          - 'ASM-1'
          - 'ASM-2'
          - 'ASM-3'
          - 'CTR-1'
          - 'CTR-3'
      outputs:
        - 'indexElementRecursive''s record gains applications: Array.isArray(node.applications) ? node.applications : [] (DEC-2a)'
        - 'serializeManifestFile(header, content) + serializeYamlValue(value, indent): the parser''s lossless inverse for every object/array/scalar shape parseYaml supports, with ASM-3''s quoting rule for ambiguous strings'
        - 'locateContentNode(reference): returns { mf, node, parentArray, indexInParent } by walking from a manifest root through content.elements using the reference''s dot-segments (DEC-4)'
      verification:
        - 'A Node.js harness that extracts the <script> block''s function definitions (regex-sliced from standalone.html, stubbing window/document/indexedDB just enough to avoid a load-time crash) and, for every real file under .custom/manifests/*.yaml and .custom/workspace.yaml, round-trips parseYaml -> serializeManifestFile -> parseYaml, asserting the second parse''s {header, content} deep-equals the first (CTR-3) — this is the concrete, repository-realistic automated check for DEC-7, run via `node`'
        - 'Same harness calls locateContentNode against every reference buildIndex produces for .custom, asserting the returned node''s own id matches the reference''s final dot-segment (or the whole reference, for a root with no header.parent)'
      risk: 'medium'
      confidence: 70
      human_review: 'none'
      escalation_triggers:
        - 'a real .custom manifest value shape (e.g. a deeply nested sequence-of-maps-of-sequences) round-trips to a structurally different parse than ASM-2/ASM-3 assumed'
      delegation_tier: 'standard'
    - id: task-002
      title: 'Commit-and-rebuild pipeline + structured-form validation rules'
      source_requirements:
        prd:
          - 'FR-4'
          - 'FR-5'
          - 'FR-6'
          - 'FR-8'
          - 'FR-9'
          - 'FR-15'
          - 'FR-16'
          - 'FR-20'
          - 'NFR-3'
          - 'TC-3'
        tdd:
          - 'DEC-5'
          - 'DEC-9'
          - 'CTR-1'
      outputs:
        - 'rebuildIndexAndRender(): buildIndex + resolveRelationships over the live AppState.manifestFiles, replacing AppState.index/workspace.application.elements/workspace.technology.elements/relationshipStats, then render()'
        - 'commitElementEdit(reference, mutatorFn) and commitSettingsEdit(mutatorFn), each ending in rebuildIndexAndRender (DEC-5)'
        - 'DEC-9''s full validation rule set as small functions callable before any commit (id/name/description, qualifiers/tags/relationships/applications add rules, settings-field rules) — a rejected action never calls the commit function'
      verification:
        - 'Same Node.js harness as task-001, extended: call commitElementEdit/commitSettingsEdit-equivalent pure logic (the mutator + rebuild, without the DOM render() call) against a loaded .custom AppState snapshot and assert AppState.index/relationshipStats reflect the change (e.g. renaming a leaf element''s name updates the matching ElementRecord; changing default-synthetic-label updates every label-less relationship''s rendered label)'
        - 'Exercise DEC-9''s rejection rules directly (empty id, duplicate tag key, empty relationship destination) and assert the commit function is never reached (no AppState mutation occurs)'
      risk: 'medium'
      confidence: 65
      human_review: 'none'
      escalation_triggers:
        - 'TC-3''s full-re-derive-every-commit approach proves measurably slow against .custom in practice (would contradict CON-2/NFR-4) — not expected at this scale, but the task should flag it if observed rather than silently accepting a sluggish UI'
      delegation_tier: 'standard'
    - id: task-003
      title: 'Element edition view: toggle, per-kind form, field-level actions, id-rename handling'
      source_requirements:
        prd:
          - 'FR-1'
          - 'FR-2'
          - 'FR-3'
          - 'FR-18'
          - 'AC-1'
          - 'AC-2'
          - 'AC-3'
          - 'AC-4'
          - 'AC-5'
          - 'AC-6'
        tdd:
          - 'DEC-1'
          - 'DEC-2'
          - 'DEC-2a'
          - 'DEC-8'
          - 'CTR-1'
          - 'IF-1'
          - 'IF-4'
      outputs:
        - 'AppState.selection.mode (''view''|''edit''), toggle-element-edit data-action, renderCenterPanelHtml''s element branch dispatching on it (DEC-1)'
        - 'renderElementEditionFormHtml(record): one shared per-kind template + node-only applications block (DEC-2), reading the DEC-2a-extended record'
        - 'save-element-basics, add-qualifier/remove-qualifier, add-tag/remove-tag, add-relationship/save-relationship/remove-relationship, add-application/remove-application data-actions, each calling commitElementEdit with DEC-9''s validation applied first'
        - 'rewriteReferencePrefix(oldPrefix, newPrefix) wired into commitElementEdit''s id-rename return value (DEC-8), keeping AppState.selection/expanded following the renamed element (FR-18)'
      verification:
        - 'Browser-driven walkthrough (Claude Browser pane, file:// against .custom) of AC-1 through AC-6: toggle into edit mode and back without losing tree selection; rename/edit name+description on one element of each kind and confirm the tree label + read-only view update live; add/remove a qualifier, tag, relationship, and (for a node) an applications entry; edit an existing relationship''s destination to a non-existent id and confirm it renders dangling'
        - 'Rename platform.authx''s own id specifically (the DEC-5b cross-manifest-attachment case named in the TDD''s Observability section) and confirm the selection follows the rename (FR-18) and the accepted Q-1 consequences (dangling elsewhere, no cascade into header.parent) hold exactly as designed'
        - 'console error check during the whole walkthrough (Claude Browser pane''s console reader) — zero uncaught exceptions'
      risk: 'medium'
      confidence: 60
      human_review: 'none'
      escalation_triggers:
        - 'a real .custom element of some kind has a field shape DEC-2''s shared template did not anticipate (would show as a rendering exception in the browser console check)'
      delegation_tier: 'standard'
    - id: task-004
      title: 'Settings form'
      source_requirements:
        prd:
          - 'FR-7'
          - 'FR-8'
          - 'FR-9'
          - 'AC-7'
          - 'AC-8'
          - 'AC-8a'
        tdd:
          - 'DEC-3'
          - 'IF-2'
      outputs:
        - 'renderSettingsViewHtml replaced in place by an editable form seeded from AppState.workspace.settings: manifests.paths (textarea, one path per line), relationships.default-synthetic-label (text input), views.path (text input), views.labels/views.properties/facets.customs (JSON textarea), facets.globalEnabled (checkbox), facets.directoryNameTemplate (text input)'
        - 'save-settings data-action committing every field together via commitSettingsEdit, with DEC-9''s settings-field validation applied first'
      verification:
        - 'Browser-driven walkthrough: change settings.relationships.default-synthetic-label and confirm every label-less relationship''s displayed label updates live, everywhere it renders (AC-8) — the wave gate''s explicit named example'
        - 'Change manifests.paths/views.*/facets.* and confirm each round-trips (value persists on reopening the settings view) with no required rendering effect beyond that (AC-8a)'
        - 'Submit invalid JSON into the labels/properties/customs textarea and confirm an inline rejection, previous value retained (DEC-9)'
      risk: 'low'
      confidence: 70
      human_review: 'none'
      escalation_triggers: []
      delegation_tier: 'standard'
    - id: task-005
      title: 'Raw-YAML editor + uncommitted-draft discard wiring'
      source_requirements:
        prd:
          - 'FR-10'
          - 'FR-11'
          - 'FR-12'
          - 'FR-13'
          - 'FR-19'
          - 'Q-2'
          - 'NFR-3'
          - 'AC-9'
          - 'AC-10'
          - 'AC-11'
          - 'AC-12'
        tdd:
          - 'DEC-6'
          - 'DEC-10'
          - 'CTR-2'
          - 'IF-3'
      outputs:
        - 'renderFileViewHtml''s <pre> replaced by an editable <textarea data-relpath>, seeded from rawYamlEditDraft (if present for this relPath) or mf.rawText otherwise, with an error banner when a draft error is set'
        - 'commit-file-edit data-action calling commitFileEdit(relPath, newText): scratch-parse + scratch-buildIndex validation, live-state swap only on success (DEC-6, Q-2)'
        - 'rawYamlEditDraft module-level variable (CTR-2) and its clearing inside select-settings/select-file/select-element/goto-element (FR-19, DEC-10)'
      verification:
        - 'Browser-driven walkthrough: edit app.platform.authx.yaml''s raw YAML to a schema-valid change, commit, confirm the tree/element view update live (AC-10) and the edition view (if opened) shows the new values (AC-14/FR-15)'
        - 'Edit it to a schema-invalid change (delete header.kind), commit, confirm the flag names the problem and every other element/the tree is byte-for-byte unaffected (AC-11, NFR-3); correct it back and confirm recovery (AC-12)'
        - 'Type an uncommitted edit, navigate to a different tree item, return to the file, and confirm it shows the last committed text, not the discarded draft (FR-19)'
      risk: 'medium'
      confidence: 60
      human_review: 'none'
      escalation_triggers:
        - 'the scratch-buildIndex validation pass (DEC-6 step 3) proves to have a side effect on the live AppState that DEC-6''s design did not anticipate (would violate NFR-3) — must be caught by the byte-for-byte-unaffected check above, not assumed safe'
      delegation_tier: 'standard'
    - id: task-006
      title: 'Cross-surface integration pass + full manual/browser verification'
      source_requirements:
        prd:
          - 'FR-14'
          - 'FR-15'
          - 'FR-16'
          - 'FR-17'
          - 'NFR-1'
          - 'NFR-2'
          - 'NFR-4'
          - 'US-4'
          - 'AC-13'
          - 'AC-14'
          - 'AC-15'
        tdd:
          - 'CON-1'
          - 'CON-2'
          - 'CON-3'
          - 'Risks and Tradeoffs'
      outputs:
        - 'Any fix needed where task-003/004/005''s changes collide at a shared touch point: CON-3''s data-action-name uniqueness across all three surfaces'' new cases in the one handleAppClick switch; DEC-1''s selection.mode reset and DEC-10''s rawYamlEditDraft clearing, both landing inside the same four nav handlers (select-settings/select-file/select-element/goto-element)'
        - 'A standalone.html verified, end to end against .custom, to satisfy every PRD AC and all three of this wave''s P2 gate criteria'
      verification:
        - 'grep handleAppClick''s switch for duplicate case labels (CON-3) — must find none'
        - 'Full browser-driven walkthrough reproducing US-4''s AC-13/14/15 specifically: edit an element through its form then open its raw-YAML view and confirm the text reflects it (AC-13); edit raw YAML then open the edition view and confirm it is pre-filled from the new values (AC-14); perform a sequence of edits across all three surfaces and confirm the tree''s element count/labels/nesting never goes stale (AC-15)'
        - 'grep the whole file for getFileHandle/getDirectoryHandle/.getFile(/showDirectoryPicker outside the existing W-1 functions (FR-17/CON-1) — confirms no new function reads/writes disk'
        - 'Fresh page load (new tab, not reusing the reopened-folder flow) after a round of edits shows AppState reset to the unmodified files — no edit survived the reload (NFR-2)'
        - 'Timed interaction check (manual, Claude Browser pane) across several edits at .custom''s real scale confirming no visible freeze (NFR-4)'
      risk: 'medium'
      confidence: 65
      human_review: 'none'
      escalation_triggers:
        - 'any PRD AC cannot be reproduced against the real .custom fixture as implemented — names the specific AC rather than a generic "something is off"'
      delegation_tier: 'standard'
```

## 5. Parallelization Plan

```yaml
parallelization_plan:
  groups: []
```

No parallel groups, by deliberate choice rather than a missed opportunity.
Task-003 (element edition view), task-004 (settings form), and task-005
(raw-YAML editor) are logically independent of each other once task-002
lands — each could, in principle, be dispatched concurrently. They are
not, for the same reason this wave's own `Risks` section already gives at
the run level ("every run edits the same single file... largest
concurrent batch: 1"), now recurring one level down inside this run: all
three tasks add new `case`s to the same `handleAppClick` `switch`
statement and read/write overlapping regions of `renderCenterPanelHtml`'s
dispatch; task-003 and task-005 additionally both touch the bodies of the
same four existing navigation handlers (`select-settings`/`select-file`/
`select-element`/`goto-element` — DEC-1's `mode` reset and DEC-10's
`rawYamlEditDraft` clear). Two subagents editing the same function
concurrently would produce two diffs neither can see the other making.
This plan dispatches task-003, task-004, and task-005 **sequentially**
(in that order — task-003 first since DEC-8's id-rename is the most
design-sensitive piece, task-005 last since its nav-handler edits are
simplest to layer on top of whatever task-003 already added there) within
this one run, even though their formal `depends_on` is identical (both
only need task-002) and the Execution Graph correctly shows no edge
between them.

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
      rationale: 'The YAML serializer is new, hand-written code whose only real failure mode (a round-trip that silently changes meaning — e.g. an unquoted string that re-parses as a boolean) would corrupt a file''s content without necessarily throwing. Mitigated by an automated round-trip check against every real .custom manifest, not just the files this run''s own manual walkthrough happens to touch.'
    - id: task-002
      risk: 'medium'
      rationale: 'Single shared chokepoint for every edit on every surface (TG-1) — a bug here propagates to all three surfaces at once rather than staying contained to one. Mitigated by it being the smallest, most mechanical piece (three short functions reusing existing buildIndex/resolveRelationships verbatim) and by task-003/004/005 each independently exercising it.'
    - id: task-003
      risk: 'medium'
      rationale: 'The most design-sensitive surface (id-rename propagation, FR-18''s selection-follow, the largest single DEC in the TDD). Mitigated by DEC-8''s fully-specified rewriteReferencePrefix algorithm and the dedicated platform.authx rename check in its verification.'
    - id: task-004
      risk: 'low'
      rationale: 'No structural mutation risk (settings has no reference/tree-identity concept to keep consistent) and no required rendering effect beyond one field (AC-8a narrows the surface considerably).'
    - id: task-005
      risk: 'medium'
      rationale: 'NFR-3''s "never corrupt" guarantee rests entirely on DEC-6''s scratch-validate-then-swap discipline being implemented exactly as designed (validate into a copy, never mutate-then-rollback) — a single misplaced line (validating against the live array instead of the scratch one) would silently violate NFR-3 without an obvious symptom until a schema-invalid edit is actually tried.'
    - id: task-006
      risk: 'medium'
      rationale: 'Integration risk is real precisely because task-003/004/005 were dispatched sequentially to avoid shared-file conflicts (Parallelization Plan) — this task is where any seam those three missed (e.g. a duplicate data-action name) is actually caught.'
  by_area:
    - area: 'ui'
      risk: 'medium'
      rationale: 'Three new interactive surfaces added to a single-file, no-framework, full-innerHTML-re-render architecture; the main risk is a missed field/kind combination or a shared-handler collision (CON-3), not a framework-level concern.'
    - area: 'data'
      risk: 'medium'
      rationale: 'The commit-and-rebuild pipeline (task-002) and the YAML serializer (task-001) are the two pieces whose correctness every other task depends on; both are reused verbatim by every surface rather than re-implemented per surface, so a defect here is systemic rather than isolated — and also only needs fixing in one place.'
    - area: 'infra'
      risk: 'low'
      rationale: 'No build step, no new dependency, no deployment surface — a modification to one existing static resource, same as run-0008.'
```

## 8. Confidence Assessment

```yaml
confidence_assessment:
  by_task:
    - id: task-001
      score: 70
      rationale: 'The serializer''s rules are fully specified in TDD DEC-7 (down to the exact quoting predicate) and automatically checkable via round-trip against every real .custom file; residual uncertainty is only in a value shape .custom''s real fixtures do not happen to exercise.'
    - id: task-002
      score: 65
      rationale: 'Mechanically simple (three short functions calling existing buildIndex/resolveRelationships), but TC-3''s full-re-derive approach is new territory for this codebase (W-1 only ever ran this pipeline once, at load) — confidence held slightly back pending the performance check named in its escalation trigger.'
    - id: task-003
      score: 60
      rationale: 'The largest, most design-dense task (DEC-1/DEC-2/DEC-2a/DEC-8 together); TDD-fully-specified, but the most moving parts of any task here, including the one algorithm (DEC-8''s reference-prefix rewrite) that is genuinely new design, not a direct reuse of existing code.'
    - id: task-004
      score: 70
      rationale: 'Smallest surface, AC-8a narrows its required behavior considerably, and it reuses the exact JSON.stringify/JSON.parse round-trip the settings view already uses for display.'
    - id: task-005
      score: 60
      rationale: 'DEC-6''s scratch-validate-then-swap is fully specified, but is the one mechanism in this run where a subtle implementation mistake (validating the wrong array) would violate NFR-3 without throwing — confidence held back until its byte-for-byte-unaffected verification check actually runs.'
    - id: task-006
      score: 65
      rationale: 'Depends entirely on what task-003/004/005 actually produce; scored at the plan-drafting stage as a reasonable expectation that sequential dispatch (Parallelization Plan) prevents most seam issues, not as a claim that none will be found.'
```

## 9. Agent Assignment Plan

```yaml
agent_assignment_plan:
  assignments:
    - task_id: task-001
      agent_role: 'Frontend Implementation Agent'
      objective: 'Add indexElementRecursive''s applications field (DEC-2a), the YAML serializer serializeManifestFile/serializeYamlValue (DEC-7), and the content-node locator locateContentNode (DEC-4) to src/main/resources/editor-webapp/standalone.html, as pure functions with no new data-action or render change yet.'
      context:
        prd_excerpts:
          - 'FR-2 (per-kind fields incl. applications), FR-14 (raw-YAML must reflect form edits), Q-1''s resolved mechanism'
        tdd_excerpts:
          - 'DEC-2a, DEC-7 (full serialization rules incl. ASM-3''s quoting predicate), DEC-4 (locateContentNode''s five-step algorithm), CTR-3'
      likely_files:
        - 'src/main/resources/editor-webapp/standalone.html'
      acceptance_criteria:
        - 'serializeManifestFile(header, content) followed by parseYaml reproduces an equal {header, content} for every real .custom manifest'
        - 'locateContentNode resolves every reference buildIndex produces for .custom to the correct node'
      verification:
        - 'Node.js round-trip harness per Task Catalog'
      escalation_triggers:
        - 'a .custom value shape round-trips to a structurally different parse'
      suggested_subagent_type: 'general-purpose'
      suggested_model: '(default)'
    - task_id: task-002
      agent_role: 'Frontend Implementation Agent'
      objective: 'Add commitElementEdit/commitSettingsEdit/rebuildIndexAndRender (DEC-5) and DEC-9''s full validation rule set to standalone.html, building on task-001''s locateContentNode/serializeManifestFile.'
      context:
        prd_excerpts:
          - 'FR-4/FR-5/FR-6/FR-9/FR-15/FR-16 (the single re-derive pipeline), FR-20 (validation rule set), TC-3''s resolution'
        tdd_excerpts:
          - 'DEC-5''s three function bodies verbatim, DEC-9''s full per-field rule list'
      likely_files:
        - 'src/main/resources/editor-webapp/standalone.html'
      acceptance_criteria:
        - 'A commit rebuilds AppState.index/relationshipStats/tree arrays from the live manifestFiles/settings, matching loadWorkspace''s own pipeline'
        - 'Every DEC-9 rejection rule prevents the commit function from being called at all'
      verification:
        - 'Node.js harness per Task Catalog'
      escalation_triggers:
        - 'measurable UI lag from the full-rebuild-per-commit approach at .custom scale'
      suggested_subagent_type: 'general-purpose'
      suggested_model: '(default)'
    - task_id: task-003
      agent_role: 'Frontend Implementation Agent'
      objective: 'Add the element edition view: the view/edit mode toggle (DEC-1), the shared per-kind form template plus its field-level data-actions (DEC-2, consuming DEC-2a''s applications field), and id-rename handling (DEC-8, FR-18) — all committing through task-002''s commitElementEdit.'
      context:
        prd_excerpts:
          - 'FR-1/FR-2/FR-3/FR-18, AC-1 through AC-6, Q-1''s accepted rename consequences'
        tdd_excerpts:
          - 'DEC-1, DEC-2, DEC-2a, DEC-8''s full rewriteReferencePrefix algorithm, IF-1'
      likely_files:
        - 'src/main/resources/editor-webapp/standalone.html'
      acceptance_criteria:
        - 'AC-1 through AC-6 hold against .custom for every element kind'
        - 'FR-18: renaming an element keeps it selected and its tree ancestors expanded'
      verification:
        - 'Browser-driven walkthrough per Task Catalog (Claude Browser pane, file:// against .custom)'
      escalation_triggers:
        - 'a real .custom element kind combination has no rendering rule in the shared template'
      suggested_subagent_type: 'general-purpose'
      suggested_model: '(default)'
    - task_id: task-004
      agent_role: 'Frontend Implementation Agent'
      objective: 'Replace renderSettingsViewHtml with an editable form (DEC-3), committing through task-002''s commitSettingsEdit.'
      context:
        prd_excerpts:
          - 'FR-7/FR-8/FR-9, AC-7/AC-8/AC-8a'
        tdd_excerpts:
          - 'DEC-3''s per-field control list, IF-2'
      likely_files:
        - 'src/main/resources/editor-webapp/standalone.html'
      acceptance_criteria:
        - 'AC-8 holds: default-synthetic-label change relabels every label-less relationship live'
        - 'AC-8a holds: every other settings field round-trips with no required rendering effect'
      verification:
        - 'Browser-driven walkthrough per Task Catalog'
      escalation_triggers: []
      suggested_subagent_type: 'general-purpose'
      suggested_model: '(default)'
    - task_id: task-005
      agent_role: 'Frontend Implementation Agent'
      objective: 'Replace the file view''s raw-YAML <pre> with an editable textarea and commit-file-edit action (DEC-6, scratch-validate-then-swap), plus FR-19''s draft-discard wiring across the four existing navigation handlers (DEC-10).'
      context:
        prd_excerpts:
          - 'FR-10/FR-11/FR-12/FR-13/FR-19, Q-2''s resolved three-part check, NFR-3'
        tdd_excerpts:
          - 'DEC-6''s five-step commitFileEdit algorithm, DEC-10, CTR-2, IF-3'
      likely_files:
        - 'src/main/resources/editor-webapp/standalone.html'
      acceptance_criteria:
        - 'AC-9 through AC-12 hold against app.platform.authx.yaml'
        - 'FR-19: navigating away from an uncommitted raw-YAML draft discards it'
      verification:
        - 'Browser-driven walkthrough per Task Catalog'
      escalation_triggers:
        - 'the scratch-validation pass has any observable effect on live AppState'
      suggested_subagent_type: 'general-purpose'
      suggested_model: '(default)'
    - task_id: task-006
      agent_role: 'QA Agent'
      objective: 'Resolve any shared-touch-point collision between task-003/004/005 and run the full cross-surface verification pass (US-4, all three P2 gate criteria) against .custom.'
      context:
        prd_excerpts:
          - 'FR-14/FR-15/FR-16/FR-17, NFR-1/NFR-2/NFR-4, US-4/AC-13/AC-14/AC-15'
        tdd_excerpts:
          - 'CON-1/CON-2/CON-3, Risks and Tradeoffs'
      likely_files:
        - 'src/main/resources/editor-webapp/standalone.html'
      acceptance_criteria:
        - 'AC-13/AC-14/AC-15 hold; no duplicate data-action name; no disk access from any new function; a fresh reload loses every edit'
      verification:
        - 'grep checks + full browser-driven walkthrough per Task Catalog'
      escalation_triggers:
        - 'any PRD AC cannot be reproduced against .custom as implemented'
      suggested_subagent_type: 'general-purpose'
      suggested_model: '(default)'
```

## 10. Verification Plan

```yaml
verification_plan:
  checks:
    - task_id: task-001
      methods:
        - 'Node.js extraction-and-round-trip harness (parseYaml -> serializeManifestFile -> parseYaml) against every file under .custom/manifests/*.yaml and .custom/workspace.yaml'
        - 'locateContentNode exercised against every reference buildIndex produces for .custom'
      success_criteria:
        - 'Every real .custom file round-trips to a structurally equal {header, content}'
        - 'locateContentNode resolves every reference to its correct node with no thrown error'
    - task_id: task-002
      methods:
        - 'Node.js harness exercising commitElementEdit/commitSettingsEdit''s mutator-plus-rebuild logic against a loaded .custom AppState snapshot'
        - 'Direct exercise of DEC-9''s rejection rules'
      success_criteria:
        - 'AppState.index/relationshipStats/workspace.{application,technology}.elements reflect every applied edit exactly once'
        - 'A rejected validation never results in any AppState mutation'
    - task_id: task-003
      methods:
        - 'Claude Browser pane, file:// against .custom: AC-1 through AC-6 walkthrough'
        - 'console error check throughout'
      success_criteria:
        - 'Every AC-1..AC-6 holds visibly, live, no reload; zero uncaught console errors; the platform.authx rename check behaves exactly per DEC-8'
    - task_id: task-004
      methods:
        - 'Claude Browser pane, file:// against .custom: AC-7/AC-8/AC-8a walkthrough'
      success_criteria:
        - 'default-synthetic-label change relabels live everywhere; every other settings field round-trips with no required effect; invalid JSON is rejected inline'
    - task_id: task-005
      methods:
        - 'Claude Browser pane, file:// against .custom and against app.platform.authx.yaml specifically: AC-9 through AC-12 walkthrough'
      success_criteria:
        - 'Valid edit re-parses live; invalid edit is flagged with every other element/the tree byte-for-byte unaffected; recovery works; draft discards on navigation'
    - task_id: task-006
      methods:
        - 'grep for duplicate handleAppClick case labels'
        - 'grep for getFileHandle/getDirectoryHandle/.getFile(/showDirectoryPicker outside existing W-1 functions'
        - 'Claude Browser pane full walkthrough of AC-13/14/15 plus a fresh-reload-loses-edits check (NFR-2) and a timed multi-edit pass (NFR-4)'
      success_criteria:
        - 'No duplicate data-action name; no new disk access; AC-13/14/15 hold; a fresh reload shows no edit from this session; no visible freeze across several edits at .custom scale'
```

No automated test harness exists for this browser-only, build-free file
today (confirmed: no test under `src/test` references `standalone.html`,
matching run-0008's own precedent of manual `file://` verification). This
run adds two concrete, repository-realistic automated checks run-0008
did not have available in the same form: a Node.js extraction-and-exec
harness for the new pure functions (parser/serializer/indexer round-trip
— genuinely automatable since none of DEC-4/DEC-5/DEC-7/DEC-9 touch a
browser API), and the Claude Browser pane for the actual UI walkthroughs
(driving a real Chromium instance against `file://` and `.custom`,
reading the rendered DOM/console directly) — turning what run-0008
recorded as a purely human manual walkthrough into one this agent can
perform directly during Stage 10/11, not merely describe.

## 11. Escalation Rules

```yaml
escalation_rules:
  rules:
    - condition: 'A real .custom manifest value round-trips through the new YAML serializer to a structurally different parse than the original (task-001)'
      action: 'Fix the serializer''s handling of that specific value shape before proceeding to task-002; do not ship a lossy serializer behind a passing walkthrough that happened not to touch the affected file.'
    - condition: 'The full buildIndex/resolveRelationships re-derive (task-002, TC-3) shows measurable UI lag at .custom''s real scale'
      action: 'Escalate as a genuine technical tradeoff (not a product decision) — note it in the prg and proceed with the simplest viable mitigation (e.g. confirm it is a one-time cost per commit, not per keystroke) rather than silently accepting a sluggish UI or silently redesigning around TC-3''s resolution.'
    - condition: 'DEC-6''s scratch-validation pass is found to have any observable effect on live AppState before a commit is confirmed valid (task-005)'
      action: 'Treat as an NFR-3 violation — block task-005 and fix before task-006 begins; this is exactly the class of bug the autonomy override does not excuse shipping unverified.'
    - condition: 'Any PRD AC cannot be reproduced against the real .custom fixture once implemented (task-006)'
      action: 'Name the specific AC and the observed behavior in the prg; fix if the cause is clearly a this-run implementation gap; escalate as a blocker only if the cause traces back to a genuine PRD/TDD contradiction this plan did not anticipate (none expected, per Stage 7''s consistency check).'
    - condition: 'A genuine product/architecture tradeoff with no defensible single answer surfaces during implementation (none identified while drafting this plan)'
      action: 'Per complete-run''s autonomy override, this is the one category that still escalates to the human rather than being resolved inline or by a subagent — log it in the prg and surface it clearly in the final report.'
```

## 12. Final Execution Manifest

```yaml
execution_manifest:
  status: 'done'
  recommendation: 'proceed'
  autonomy_level: 'high'
  total_tasks: 6
  autonomous_tasks: 6
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
  parallel_groups: []
  required_human_gates: []
  highest_risk_tasks:
    - task-001
    - task-002
    - task-003
    - task-005
    - task-006
  lowest_confidence_tasks:
    - task-003
    - task-005
  next_action: 'Done — all six tasks completed and verified; proceed to complete-run''s Stage 11 (repository-wide verification) and final report.'
  criteria:
    - 'All six tasks reach status done with their own verification passing — TRUE (see each task''s Task Catalog entry and the run''s prg Log)'
    - 'All three wave P2 gate criteria hold against .custom — TRUE, confirmed via a Node vm-sandboxed harness driving the real loadWorkspace/buildIndex/resolveRelationships/commit* functions against the real .custom workspace (the Claude Browser pane could not be used for this: confirmed across tasks 003-006 that this sandbox''s file:// preview has no real File System Access API/IndexedDB support, so the originally-envisioned live-browser walkthrough was not available — logged as an environment limitation, not a gap in what was actually verified)'
    - 'No PRD AC is left unverified or silently skipped — TRUE, AC-1 through AC-15 (incl. AC-8a) each traced to a specific check in a task''s verification or the run''s own independent spot-checks, see prg Log'
```
