---
title: Execution Plan — Standalone Editor — Create, Delete & Save
status: done
date: 2026-10-04
related:
  - docs/wav/wav-003-standalone-workspace-editor/run/run-0010-standalone-editor-create-delete-and-save/prd-0010-standalone-editor-create-delete-and-save.md
  - docs/wav/wav-003-standalone-workspace-editor/run/run-0010-standalone-editor-create-delete-and-save/tdd-0010-standalone-editor-create-delete-and-save.md
type: pln
run: 10
wave: 003
---

# Execution Plan: Standalone Editor — Create, Delete & Save

**Autonomy override in effect**: this run executes under `complete-run`'s
explicit autonomy override — `human_required`/`review_before` gating is
not honored as a stop condition here; a task proceeds autonomously unless
it hits a genuinely unresolvable conflict, missing credential, or product
tradeoff with no defensible single answer. No task below carries
`delegation_tier: hard_judgment` — the two real-disk-write tasks
(`task-004`, `task-005`) are deliberately scored `risk: high` rather than
`critical` (see Risk Assessment's own reasoning), per this run's explicit
instruction from the wave dispatcher not to reflexively downgrade real
risk just because the wave manifest's own `delegation: standard` line
sets a default tier.

## 1. Executive Summary

```yaml
summary:
  status: 'done'
  product_goal: 'Close out wave 003: let a person create a new element (as a same-file child, or as a brand-new, optionally cross-file-attached manifest), delete an element with every dangling relationship elsewhere cleaned up before anything is removed, and save every actual change back to the real granted directory via the File System Access API.'
  technical_approach: 'Create reuses W-3''s existing commitElementEdit for a same-file child; a new commitCreateTopLevelElement synthesizes a brand-new manifest file entry. Delete gets its own whole-model impact scan surfaced via a transient confirmation (mirroring W-3''s rawYamlEditDraft pattern) before a new commitDeleteElement removes the element and every scanned relationship together, re-deriving the removal condition against each owner''s live node rather than trusting disposable index-copy identity. Save is the first function in the whole wave to touch disk for real: it elevates the granted handle''s permission from read to readwrite (every existing grant is read-only), stale-checks every file it is about to touch via getFile().lastModified immediately before writing anything (refusing the whole attempt on any conflict), then writes/removes only what a new per-file dirty flag marks as actually changed.'
  total_tasks: 5
  parallel_groups: 0
  high_risk_tasks: 2
  human_review_gates: 0
  autonomy_level: 'high'
  recommendation: 'proceed'
  criteria:
    - 'creating a child element under an existing element, saving, and reloading the folder shows it in the left panel''s tree, sourced from the correct (existing) file'
    - 'creating a brand-new top-level element (standalone or cross-file-attached), saving, and reloading shows it in the tree, the new file''s relative path in the Files list, and its content in that file''s YAML view'
    - 'deleting platform.authx.backend in a temporary copy of .custom, saving, and reloading leaves no relationship anywhere pointing at it, and the reload completes without a parse error'
    - 'a deliberately staled dirty file blocks an entire save attempt (zero files written) rather than being silently overwritten or silently skipped'
    - 'the real, git-tracked .custom/ directory is confirmed byte-for-byte unchanged after every verification pass in this run'
```

## 2. PRD/TDD Consistency Assessment

```yaml
consistency_assessment:
  aligned_items:
    - 'Every PRD FR-1..FR-19/NFR-1..NFR-4/Q-1..Q-3/TC-1..TC-5 traces to a named TDD DEC/CON/CTR item (TDD''s own PRD Traceability table, confirmed consistent with the PRD''s own FR/AC renumbering from its Stage 2 review during this run''s Stage 7)'
    - 'PRD Q-1 (stale-file-on-save: detect-and-refuse) is resolved by TDD DEC-9''s stale-check-before-any-write ordering, not merely asserted'
    - 'PRD Q-3 (node.applications excluded from the delete scan) matches TDD DEC-4''s scan scope exactly — scanDanglingRelationshipsFor reads record.relationships only'
    - 'TDD DEC-5''s relPath fix (found in this run''s own Stage 5 TDD review — the first draft omitted the settings.manifests.paths[0] directory prefix) closes a real gap that would otherwise have silently broken PRD FR-5/AC-7 for every top-level create; fixed before this plan was drafted'
    - 'TDD DEC-3''s level-threading fix (also found in Stage 5) closes a second real gap (indexElementRecursive''s real signature could not have recovered a group-flavored manifest kind''s base level without it) that would have made PRD FR-6''s blank-attach-under gating unimplementable as first specified'
  gaps: []
  blocking_gaps: []
```

No blocking gaps carried into execution. Both real design gaps found while
drafting the TDD (DEC-5's missing manifests-path prefix, DEC-3's
level-computation signature gap) were caught and fixed in the TDD's own
KDMLLC review (Stage 5), before this plan was drafted — see the run's
`prg` Findings for detail.

## 3. Execution Graph

```yaml
execution_graph:
  nodes:
    - id: task-001
      status: 'done'
      title: 'Foundational data-model additions: per-record level, per-file dirty/existedOnDisk/lastKnownDiskModified tracking, new AppState fields'
      depends_on: []
      produces:
        - 'indexElementRecursive extended with a level parameter/field, threaded through its own recursion and buildIndex''s root call (DEC-3)'
        - 'childKindOptionsForLevel(level) + childKindOptionsFor(record) (DEC-3)'
        - 'AppState.manifestFiles[i].dirty/existedOnDisk/lastKnownDiskModified, AppState.workspace.settingsDirty/settingsLastKnownDiskModified, AppState.pendingFileRemovals, AppState.removedFileBaselines (DEC-8), all populated correctly by loadWorkspace at load time'
      agent_role: 'Frontend Implementation Agent'
      autonomy: 'autonomous'
      risk: 'medium'
      confidence: 60
    - id: task-002
      status: 'done'
      title: 'Create: entry points, shared form, new-manifest synthesis, commit functions'
      depends_on: ['task-001']
      produces:
        - 'AppState.selection.kind gains ''create'' (DEC-1); open-create-child-form/open-create-top-level-form/cancel-create/submit-create-child/submit-create-top-level data-actions'
        - 'renderCreateElementFormHtml (DEC-2)'
        - 'commitCreateTopLevelElement, with the corrected relPath join (DEC-5)'
        - 'FR-6''s attach-under/blank-kind-gating validation and FR-7''s id-collision validation, both wired before any commit'
      agent_role: 'Frontend Implementation Agent'
      autonomy: 'autonomous'
      risk: 'medium'
      confidence: 60
    - id: task-003
      status: 'done'
      title: 'Delete: impact scan, confirm/cancel UI, commit function'
      depends_on: ['task-001']
      produces:
        - 'computeDeletedReferenceSet/scanDanglingRelationshipsFor + request-delete-element/confirm-delete-element/cancel-delete-element data-actions, pendingDeleteConfirmation (DEC-4)'
        - 'commitDeleteElement, including the removedFileBaselines write found missing in Stage 5 review (DEC-6)'
      agent_role: 'Frontend Implementation Agent'
      autonomy: 'autonomous'
      risk: 'medium'
      confidence: 55
    - id: task-004
      status: 'done'
      title: 'Save: readwrite permission, stale-check, write/remove pipeline, workspace.yaml settings serializer, save UI'
      depends_on: ['task-002', 'task-003']
      produces:
        - 'ensureWritePermission (DEC-7)'
        - 'saveAllChanges + statManifestFile/writeManifestFile/removeManifestFile/statWorkspaceYaml/writeWorkspaceYaml helpers (DEC-9)'
        - 'serializeSettingsToRaw, the kebab-case inverse of parseSettings including the nested facets.customs[].json-path alias (DEC-10)'
        - 'save-all-changes top-panel button + saveStatus display, hasUnsavedChanges() (DEC-11)'
      agent_role: 'Frontend Implementation Agent'
      autonomy: 'autonomous'
      risk: 'high'
      confidence: 50
    - id: task-005
      status: 'done'
      title: 'Cross-surface integration pass + full verification against a temporary .custom copy'
      depends_on: ['task-002', 'task-003', 'task-004']
      produces:
        - 'Any fix needed where task-002/003/004''s changes collide at a shared touch point (handleAppClick switch, renderElementEditionFormHtml, the top panel)'
        - 'A standalone.html verified, end to end, against a temporary copy of .custom, to satisfy every PRD AC and the wave''s own Completion Criteria — with the real, git-tracked .custom/ confirmed untouched'
      agent_role: 'QA Agent'
      autonomy: 'autonomous'
      risk: 'high'
      confidence: 55
  edges:
    - from: task-001
      to: task-002
      reason: 'The create form''s kind selector and FR-6''s validation both call childKindOptionsFor/childKindOptionsForLevel (task-001); cannot be written against a function that does not exist yet.'
    - from: task-001
      to: task-003
      reason: 'commitDeleteElement sets mf.dirty and reads/writes AppState.pendingFileRemovals/removedFileBaselines (task-001''s new AppState fields).'
    - from: task-002
      to: task-004
      reason: 'saveAllChanges writes dirty files that only task-002''s create commit (and task-003''s delete commit) actually produce; task-004''s own verification needs real dirty state to exercise against.'
    - from: task-003
      to: task-004
      reason: 'saveAllChanges removes files via AppState.pendingFileRemovals, which only task-003''s commitDeleteElement populates.'
    - from: task-002
      to: task-005
      reason: 'Integration verification needs every surface implemented first.'
    - from: task-003
      to: task-005
      reason: 'Integration verification needs every surface implemented first.'
    - from: task-004
      to: task-005
      reason: 'Integration verification needs every surface implemented first.'
```

## 4. Task Catalog

```yaml
task_catalog:
  tasks:
    - id: task-001
      title: 'Foundational data-model additions: per-record level, per-file dirty/existedOnDisk/lastKnownDiskModified tracking, new AppState fields'
      source_requirements:
        prd:
          - 'FR-1'
          - 'FR-6'
          - 'FR-14'
          - 'TC-1'
        tdd:
          - 'DEC-3'
          - 'DEC-8'
          - 'CTR-1'
      outputs:
        - 'indexElementRecursive(node, kind, reference, sourceFile, category, index, settings, level) — level threaded through the recursion exactly as DEC-3 specifies (a group inherits its caller''s level; every other kind''s level is its own bare kind); buildIndex''s root call computes level once from its own un-generalized bareKind local before generalizing to rootKind'
        - 'childKindOptionsForLevel(level) and childKindOptionsFor(record) (DEC-3)'
        - 'AppState.manifestFiles[i] gains dirty (false), existedOnDisk (true), lastKnownDiskModified (captured via getFile().lastModified) — set correctly inside loadWorkspace''s existing per-file load loop'
        - 'AppState.workspace gains settingsDirty (false), settingsLastKnownDiskModified (captured for workspace.yaml at load time)'
        - 'AppState itself gains pendingFileRemovals ([]) and removedFileBaselines (new Map())'
      verification:
        - 'A Node.js vm harness (per this wave''s established Browser-pane limitation) that loads the real <script> body and drives loadWorkspace against a real .custom copy: confirm every manifestFile gets dirty=false/existedOnDisk=true/a non-null lastKnownDiskModified, and every ElementRecord (root and nested, across every real .custom file) gets the correct level — spot-check platform (solution/level=solution), platform.authx (system/level=system), platform.authx.frontend (container/level=container), a node under an environment (level=node)'
        - 'A synthetic fixture (since .custom has zero group/person usage — TDD RISK-1) constructing a system-group-flavored manifest with a nested group with a nested container, confirming childKindOptionsFor returns the right options at every depth and that a container-group manifest''s own nested group correctly reports level=container, not system'
      risk: 'medium'
      confidence: 60
      human_review: 'none'
      escalation_triggers:
        - 'a real .custom element''s level computes incorrectly against a manual reading of its own manifest file'
      delegation_tier: 'standard'
    - id: task-002
      title: 'Create: entry points, shared form, new-manifest synthesis, commit functions'
      source_requirements:
        prd:
          - 'FR-1'
          - 'FR-2'
          - 'FR-3'
          - 'FR-4'
          - 'FR-5'
          - 'FR-6'
          - 'FR-7'
          - 'AC-1'
          - 'AC-2'
          - 'AC-3'
          - 'AC-4'
          - 'AC-5'
          - 'AC-6'
          - 'AC-7'
          - 'AC-8'
        tdd:
          - 'DEC-1'
          - 'DEC-2'
          - 'DEC-3'
          - 'DEC-5'
          - 'CTR-1'
          - 'CTR-3'
          - 'IF-1'
          - 'IF-2'
          - 'IF-3'
      outputs:
        - 'AppState.selection.kind === ''create'' (shape per CTR-1); open-create-child-form button in the element edition view (only when childKindOptionsFor(record) is non-empty); open-create-top-level-form button on each left-panel branch header; renderCreateElementFormHtml(sel) rendering the kind select/id/name/description/attach-under(top-level only) form'
        - 'submit-create-child: FR-6/FR-7 validation, then commitElementEdit(parentReference, mutator-that-pushes-into-elements), then selection -> {kind:''element'', key: createdReference, mode:''edit''}'
        - 'submit-create-top-level: FR-6/FR-7 validation, then commitCreateTopLevelElement (DEC-5, with the corrected manifests-path-prefixed relPath), then selection -> {kind:''element'', key: createdReference, mode:''edit''}'
        - 'cancel-create resets selection with no AppState mutation'
      verification:
        - 'Node.js vm harness against a temporary .custom copy: create a child container under platform.authx, confirm it lands in app.platform.authx.yaml''s content.elements, the tree, and that file''s raw-YAML view (serializeManifestFile round-trips it)'
        - 'Create a brand-new standalone top-level system (no attach-under) and one attached under platform (cross-file), confirm each new manifestFiles entry''s relPath is manifests/app.<reference>.yaml (not missing the directory prefix — the exact bug Stage 5''s review caught), its dirty/existedOnDisk flags, and its tree placement'
        - 'Exercise FR-6/FR-7''s rejection paths directly (a container/component/node with attach-under left blank; an id colliding with an existing reference; attach-under naming a kind-incompatible or nonexistent parent) and confirm no AppState mutation occurs for any of them'
      risk: 'medium'
      confidence: 60
      human_review: 'none'
      escalation_triggers:
        - 'a real .custom element kind combination has no valid create path through the shared form'
      delegation_tier: 'standard'
    - id: task-003
      title: 'Delete: impact scan, confirm/cancel UI, commit function'
      source_requirements:
        prd:
          - 'FR-8'
          - 'FR-9'
          - 'FR-10'
          - 'FR-11'
          - 'FR-12'
          - 'AC-9'
          - 'AC-10'
          - 'AC-11'
          - 'AC-12'
        tdd:
          - 'DEC-4'
          - 'DEC-6'
          - 'CTR-2'
          - 'IF-1'
      outputs:
        - 'computeDeletedReferenceSet(reference, category), scanDanglingRelationshipsFor(deletedRefs, category) (DEC-4)'
        - 'request-delete-element/confirm-delete-element/cancel-delete-element data-actions; pendingDeleteConfirmation (module-level, CTR-2) rendered inline within the element edition view'
        - 'commitDeleteElement(reference, category, affected) (DEC-6): prune every owner''s relationships by re-deriving the condition against each owner''s live node; splice (nested) or remove-the-manifest-entry (root), including the AppState.removedFileBaselines.set(...) call Stage 5''s review found missing; regenerate rawText exactly once per still-existing touched file; reset selection if the deleted (sub)tree was active'
      verification:
        - 'Node.js vm harness against a temporary .custom copy: delete platform.authx.backend specifically (the wave''s own named fixture), confirm the scan finds exactly its four relationship entries (app.platform.authx.yaml''s frontend, app.platform.scp.yaml, app.platform.iam.yaml, app.platform.portal.yaml), that cancel leaves AppState byte-for-byte unchanged (AC-11), and that confirm removes all four and regenerates exactly those files'' raw YAML'
        - 'Delete a manifest-root element that another file attaches under via header.parent (e.g. platform itself), confirm those other files are untouched in AppState.manifestFiles and become unattached top-level roots on the next rebuild (AC-12, FR-11 falling out of buildIndex''s existing DEC-5b rule with no new code)'
        - 'Confirm node.applications entries naming a deleted element are left exactly as-is (FR-12 — deliberately not scanned/cleaned)'
      risk: 'medium'
      confidence: 55
      human_review: 'none'
      escalation_triggers:
        - 'the relationship-pruning step mutates a node other than the ones DEC-4''s scan actually named'
      delegation_tier: 'standard'
    - id: task-004
      title: 'Save: readwrite permission, stale-check, write/remove pipeline, workspace.yaml settings serializer, save UI'
      source_requirements:
        prd:
          - 'FR-13'
          - 'FR-14'
          - 'FR-15'
          - 'FR-16'
          - 'FR-17'
          - 'FR-18'
          - 'FR-19'
          - 'AC-13'
          - 'AC-14'
          - 'AC-15'
          - 'AC-16'
          - 'AC-17'
          - 'NFR-2'
          - 'NFR-3'
        tdd:
          - 'DEC-7'
          - 'DEC-8'
          - 'DEC-9'
          - 'DEC-10'
          - 'DEC-11'
          - 'CON-1'
          - 'CON-4'
      outputs:
        - 'ensureWritePermission() (DEC-7): queryPermission({mode:''readwrite''}) then requestPermission({mode:''readwrite''}) from inside the save button''s own click handler'
        - 'saveAllChanges(): permission check -> stale-check every dirty/removed/settings-changed target via a getFile().lastModified comparison, refusing the whole attempt on any conflict (zero writes) -> write dirty files -> remove pending removals -> write workspace.yaml if settingsDirty -> update each written/removed target''s own baseline (DEC-9), stopping and naming the specific failure on any non-conflict error without rolling back what already succeeded'
        - 'statManifestFile/writeManifestFile/removeManifestFile/statWorkspaceYaml/writeWorkspaceYaml helpers, the only functions in the whole file with a createWritable/removeEntry/getFileHandle(...,{create:true}) call'
        - 'serializeSettingsToRaw(settings) (DEC-10): kebab-case inverse of parseSettings, including facets.customs[].jsonPath -> json-path; writeWorkspaceYaml preserves styles/formatters verbatim'
        - 'save-all-changes button (visible only when hasUnsavedChanges()) + saveStatus display in the top panel (DEC-11)'
      verification:
        - 'Node.js vm harness with an fs-backed FileSystemDirectoryHandle/FileSystemFileHandle/writable-stream shim (implementing queryPermission/requestPermission mode tracking, createWritable/write/close, removeEntry, getFileHandle(create:true)) against a temporary copy of .custom (never the real tracked directory): create + delete some elements, save, then perform a completely fresh loadWorkspace against the same temp directory and confirm every created element is present (sourced from the right file), the deleted element and its pruned relationships are absent everywhere, and nothing fails to parse'
        - 'Deliberately rewrite one dirty file''s bytes on the temp-copy filesystem directly (simulating an external edit) between load and save; confirm the whole save attempt is refused, naming that file, and that zero files (including unrelated dirty ones) are written'
        - 'Simulate a readwrite-permission denial and confirm saveAllChanges writes nothing and reports it; simulate an error partway through the write phase (e.g. the second of three dirty files) and confirm the first file''s write stands, the failing file is named, and later files are left unattempted'
        - 'Edit settings.relationships.defaultSyntheticLabel, save, confirm workspace.yaml''s written text has default-synthetic-label (kebab-case) not defaultSyntheticLabel, and that styles/formatters round-trip unchanged; edit a facets.customs[].jsonPath value (if any exist in a constructed fixture) and confirm it writes back as json-path'
        - 'grep for createWritable/removeEntry(/getFileHandle(.*create:\s*true outside saveAllChanges and its direct helpers (CON-1) — none found elsewhere'
      risk: 'high'
      confidence: 50
      human_review: 'none'
      escalation_triggers:
        - 'the stale-check has any false negative (a real external change goes undetected) against the harness''s own fs-backed shim'
        - 'a partial-write scenario leaves AppState describing a state the actual filesystem does not match'
      delegation_tier: 'standard'
    - id: task-005
      title: 'Cross-surface integration pass + full verification against a temporary .custom copy'
      source_requirements:
        prd:
          - 'FR-1'
          - 'FR-2'
          - 'FR-3'
          - 'FR-4'
          - 'FR-5'
          - 'FR-6'
          - 'FR-7'
          - 'FR-8'
          - 'FR-9'
          - 'FR-10'
          - 'FR-11'
          - 'FR-12'
          - 'FR-13'
          - 'FR-14'
          - 'FR-15'
          - 'FR-16'
          - 'FR-17'
          - 'FR-18'
          - 'FR-19'
          - 'NFR-1'
          - 'NFR-4'
        tdd:
          - 'CON-2'
          - 'CON-3'
          - 'Risks and Tradeoffs'
      outputs:
        - 'Any fix needed where task-002/003/004''s changes collide at a shared touch point: CON-3''s data-action-name uniqueness across all new cases in the one handleAppClick switch; the element edition view hosting both DEC-1''s create-button and DEC-4''s inline delete-confirmation without one clobbering the other''s render'
        - 'A standalone.html verified end to end against a temporary .custom copy to satisfy every PRD AC (AC-1 through AC-17) and the wave''s own Completion Criteria (create into existing/new manifest; delete platform.authx.backend with zero dangling relationships after save+reload; every change persisted to the same folder on disk)'
        - 'Confirmation that the real, git-tracked .custom/ directory is byte-for-byte unchanged by any verification this run performed'
      verification:
        - 'grep handleAppClick''s switch for duplicate case labels (CON-3) — must find none among the real file''s now ~30 unique data-action values'
        - 'Full Node.js vm-harness walkthrough reproducing the wave''s own named Completion Criteria scenario end to end: create a child element into app.platform.authx.yaml, create a brand-new top-level element, delete platform.authx.backend, save, then a completely fresh loadWorkspace against the same temp-copy folder — confirm all three outcomes hold simultaneously, not just individually'
        - 'git status / git diff against the real .custom/ directory (not the temp copy) after every task in this run — confirmed empty throughout'
        - 'Timed interaction check (the same vm harness, timestamped) across several creates/deletes/one save at .custom''s real scale (NFR-4) confirming no multi-second stall'
      risk: 'high'
      confidence: 55
      human_review: 'none'
      escalation_triggers:
        - 'any PRD AC or wave Completion Criteria item cannot be reproduced against the temporary .custom copy as implemented — names the specific AC/criterion rather than a generic "something is off"'
      delegation_tier: 'standard'
```

## 5. Parallelization Plan

```yaml
parallelization_plan:
  groups: []
```

No parallel groups, for the same reason `run-0009`'s plan already gave at
this wave's own single-file scale, now also true across runs: every task
in this run (and every task in every prior run in this wave) edits the
same single `standalone.html`. `task-002` (create) and `task-003`
(delete) are formally independent once `task-001` lands — both could, in
principle, be dispatched concurrently — but both add new cases to the
same `handleAppClick` `switch` and both read/extend
`renderElementEditionFormHtml` (create's "Add child" button and delete's
inline confirmation panel both live inside that same function's output).
Dispatched sequentially instead (`task-001` → `task-002` → `task-003` →
`task-004` → `task-005`), in that order — create before delete since a
freshly-created element is a natural, low-stakes target to immediately
exercise delete against during `task-003`'s own verification, and both
before save since save's own verification needs real create/delete-
produced dirty state to write.

## 6. Human Review Gates

```yaml
human_review_gates:
  gates: []
```

None. Per `complete-run`'s autonomy override and the Risk Assessment
below, no task is scored `critical` or `human_review: required` — the two
real-disk-write tasks (`task-004`/`task-005`) are scored `risk: high`
specifically so that scoring is visible and not silently rounded down,
without manufacturing a `critical` label the mitigations below don't
actually support. The one deliberate human touchpoint is this run's final
report (Stage 11), not a mid-flight gate.

## 7. Risk Assessment

```yaml
risk_assessment:
  by_task:
    - id: task-001
      risk: 'medium'
      rationale: 'A pure data-model addition (level threading, dirty-flag fields) with no disk I/O and no destructive mutation — its main failure mode is an incorrect level computation for a kind combination .custom does not exercise today (mitigated by a constructed synthetic fixture, the same mitigation shape W-1 used for dangling detection).'
    - id: task-002
      risk: 'medium'
      rationale: 'Creates new content but never destroys anything — a bug here produces a wrong or rejected create, not data loss. The one subtle failure mode (the relPath-missing-directory-prefix bug Stage 5''s TDD review already caught and fixed) is exactly the class of mistake this task''s own verification re-checks directly against the corrected design.'
    - id: task-003
      risk: 'medium'
      rationale: 'Removes real content (an element and cross-file relationships) from the in-memory model, but not yet from disk — a bug here is still fully recoverable by simply not saving. The re-derive-against-the-live-node pruning approach (DEC-6) was specifically chosen over index-identity matching to avoid a known class of stale-reference bug; verified directly against the wave''s own named fixture (platform.authx.backend).'
    - id: task-004
      risk: 'high'
      rationale: 'The first task in the entire wave that writes to a real file the person granted access to, with no undo of its own. Scored high (not critical) because every mitigation this run''s TDD designed is concrete and independently checkable: permission elevation only ever happens from an explicit click, the stale-check runs before any write and blocks the whole attempt on any conflict, and verification exercises a deliberately-staled-file scenario directly rather than trusting the design''s own description of itself. Scored high rather than medium specifically because the dispatcher''s own instruction was not to round this down given real disk writes are new in this run.'
    - id: task-005
      risk: 'high'
      rationale: 'The run''s final verification is the only check standing in for the human review this autonomous run skips, and it is the task responsible for confirming the real, git-tracked .custom/ directory was never touched by any of this run''s own verification activity — a false "clean" report here would be the single worst outcome this run could produce. Scored high for the same reason task-004 is, not because the integration work itself is unusually complex.'
  by_area:
    - area: 'ui'
      risk: 'medium'
      rationale: 'Three new interactive surfaces (create form, delete confirmation, save button/status) added to the same single-file, no-framework, full-innerHTML-re-render architecture every prior run already uses — the main risk is a shared-handler collision (CON-3), not a framework-level concern.'
    - area: 'data'
      risk: 'medium'
      rationale: 'The create/delete commit functions are new but compose with W-3''s existing, already-verified buildIndex/resolveRelationships/rebuildIndexAndRender pipeline rather than reimplementing it.'
    - area: 'disk-io'
      risk: 'high'
      rationale: 'Entirely new to this wave (every prior run was read-only or in-memory-only) — the one area where a real mistake has a real-world consequence (a person''s actual file). Mitigated by the stale-check, the explicit-action-only save trigger, and this run''s own discipline of verifying against a temporary copy, never the real .custom/.'
    - area: 'infra'
      risk: 'low'
      rationale: 'No build step, no new dependency, no deployment surface — a modification to one existing static resource, same as every prior run in this wave.'
```

## 8. Confidence Assessment

```yaml
confidence_assessment:
  by_task:
    - id: task-001
      score: 60
      rationale: 'The level-threading mechanism is now fully specified (post-Stage-5-fix) down to the exact parameter-passing shape, but is genuinely new design (not a direct reuse of an existing pattern) and has zero real .custom fixture coverage for the group/person case it exists to handle.'
    - id: task-002
      score: 60
      rationale: 'Mechanically composes with existing, working functions (commitElementEdit is reused verbatim for the child path); the top-level path''s manifest-synthesis is new but now fully specified down to the exact relPath join, closing this run''s own Stage 5 finding.'
    - id: task-003
      score: 55
      rationale: 'The delete commit algorithm is fully specified and its trickiest subtlety (index-copy vs. live-node identity) is explicitly designed around, but multi-file mutation in one commit is new territory this wave has not exercised before (every W-3 commit touched exactly one file).'
    - id: task-004
      score: 50
      rationale: 'The lowest-confidence task in this run by design: real disk I/O, a permission model never exercised before in this codebase, and a multi-step pipeline (permission -> stale-check -> write -> remove -> settings-write) with several distinct failure modes each needing its own direct verification rather than being inferable from the design reading correctly on paper.'
    - id: task-005
      score: 55
      rationale: 'Depends entirely on what task-002/003/004 actually produce; scored as a reasonable expectation that sequential dispatch prevents most seam issues, not as a claim that the hardest-to-verify task (confirming zero real-filesystem side effects) is low-risk.'
```

## 9. Agent Assignment Plan

```yaml
agent_assignment_plan:
  assignments:
    - task_id: task-001
      agent_role: 'Frontend Implementation Agent'
      objective: 'Thread a level parameter through indexElementRecursive''s recursion (DEC-3) and add the new per-file/per-workspace dirty-tracking fields (DEC-8) to src/main/resources/editor-webapp/standalone.html, as pure data-model additions with no new data-action or render change yet.'
      context:
        prd_excerpts:
          - 'FR-1 (child-kind gating), FR-6 (attach-under gating), FR-14 (save writes only actual changes), TC-1''s resolution'
        tdd_excerpts:
          - 'DEC-3''s full level-threading algorithm (the Stage-5-corrected version, not the first draft), DEC-8''s exact field list and chokepoint-setting responsibilities, CTR-1'
      likely_files:
        - 'src/main/resources/editor-webapp/standalone.html'
      acceptance_criteria:
        - 'Every real .custom element''s level matches a manual reading of its own manifest file'
        - 'A constructed group/person synthetic fixture exercises childKindOptionsFor correctly at every depth'
      verification:
        - 'Node.js vm harness per Task Catalog'
      escalation_triggers:
        - 'a real .custom element''s level computes incorrectly'
      suggested_subagent_type: 'general-purpose'
      suggested_model: '(default)'
    - task_id: task-002
      agent_role: 'Frontend Implementation Agent'
      objective: 'Add the create entry points, shared create form, and both create commit paths (DEC-1/DEC-2/DEC-5) to standalone.html, building on task-001''s level helper.'
      context:
        prd_excerpts:
          - 'FR-1 through FR-7, AC-1 through AC-8'
        tdd_excerpts:
          - 'DEC-1, DEC-2, DEC-5 (including the Stage-5-corrected relPath join), CTR-3'
      likely_files:
        - 'src/main/resources/editor-webapp/standalone.html'
      acceptance_criteria:
        - 'AC-1 through AC-8 hold against a temporary .custom copy'
        - 'A new top-level element''s relPath includes the configured manifests directory prefix'
      verification:
        - 'Node.js vm harness per Task Catalog'
      escalation_triggers:
        - 'a real .custom element kind combination has no valid create path'
      suggested_subagent_type: 'general-purpose'
      suggested_model: '(default)'
    - task_id: task-003
      agent_role: 'Frontend Implementation Agent'
      objective: 'Add the delete impact scan, confirm/cancel UI, and commitDeleteElement (DEC-4/DEC-6) to standalone.html, building on task-001''s AppState fields.'
      context:
        prd_excerpts:
          - 'FR-8 through FR-12, AC-9 through AC-12'
        tdd_excerpts:
          - 'DEC-4''s full scan algorithm, DEC-6''s full commit algorithm including the Stage-5-added removedFileBaselines write, CTR-2'
      likely_files:
        - 'src/main/resources/editor-webapp/standalone.html'
      acceptance_criteria:
        - 'Deleting platform.authx.backend finds exactly its four known relationship entries and removes them together with the element'
        - 'Canceling leaves AppState byte-for-byte unchanged'
      verification:
        - 'Node.js vm harness per Task Catalog'
      escalation_triggers:
        - 'the relationship-pruning step mutates a node other than the ones the scan named'
      suggested_subagent_type: 'general-purpose'
      suggested_model: '(default)'
    - task_id: task-004
      agent_role: 'Frontend Implementation Agent'
      objective: 'Add ensureWritePermission/saveAllChanges and its write/remove/stat helpers (DEC-7/DEC-9), the workspace.yaml settings serializer (DEC-10), and the save UI (DEC-11) to standalone.html, building on task-001''s dirty tracking and task-002/003''s commit functions.'
      context:
        prd_excerpts:
          - 'FR-13 through FR-19, AC-13 through AC-17, NFR-2/NFR-3'
        tdd_excerpts:
          - 'DEC-7, DEC-9''s full pipeline (permission -> stale-check-all -> write-all, stop-on-first-failure), DEC-10 including the nested json-path alias, DEC-11, CON-1/CON-4'
      likely_files:
        - 'src/main/resources/editor-webapp/standalone.html'
      acceptance_criteria:
        - 'A save acquires readwrite permission before any write and refuses cleanly if denied'
        - 'A deliberately staled file blocks the entire save attempt with zero writes'
        - 'A non-conflict failure partway through leaves earlier writes standing and names the failing file'
        - 'workspace.yaml round-trips settings in kebab-case, including the nested customs alias, with styles/formatters preserved verbatim'
      verification:
        - 'Node.js vm harness with an fs-backed FileSystemDirectoryHandle/FileSystemFileHandle/writable-stream shim, against a temporary .custom copy, per Task Catalog'
      escalation_triggers:
        - 'a false negative in the stale-check against the harness''s own shim'
        - 'a partial-write scenario leaves AppState describing a state the filesystem does not match'
      suggested_subagent_type: 'general-purpose'
      suggested_model: '(default)'
    - task_id: task-005
      agent_role: 'QA Agent'
      objective: 'Resolve any shared-touch-point collision between task-002/003/004 and run the full verification pass (every PRD AC, the wave''s own Completion Criteria) against a temporary .custom copy, then confirm the real .custom/ is untouched.'
      context:
        prd_excerpts:
          - 'All of FR-1 through FR-19, NFR-1/NFR-4'
        tdd_excerpts:
          - 'CON-2/CON-3, Risks and Tradeoffs'
      likely_files:
        - 'src/main/resources/editor-webapp/standalone.html'
      acceptance_criteria:
        - 'No duplicate data-action name; every PRD AC holds against the temp copy; the wave''s named create/delete/save scenario holds end to end; the real .custom/ is confirmed byte-for-byte unchanged'
      verification:
        - 'grep checks + full Node.js vm-harness walkthrough per Task Catalog; git status/diff against the real .custom/'
      escalation_triggers:
        - 'any PRD AC or wave Completion Criteria item cannot be reproduced against the temp copy as implemented'
      suggested_subagent_type: 'general-purpose'
      suggested_model: '(default)'
```

## 10. Verification Plan

```yaml
verification_plan:
  checks:
    - task_id: task-001
      methods:
        - 'Node.js vm harness: load a temporary .custom copy, inspect every ElementRecord''s level and every manifestFile''s dirty/existedOnDisk/lastKnownDiskModified'
        - 'A constructed synthetic group/person fixture exercising childKindOptionsFor at every nesting depth'
      success_criteria:
        - 'Every real .custom element''s level matches a manual reading; every loaded file starts dirty=false/existedOnDisk=true with a real lastKnownDiskModified'
    - task_id: task-002
      methods:
        - 'Node.js vm harness: create a child element and two top-level elements (standalone + attached) against a temporary .custom copy'
      success_criteria:
        - 'AC-1 through AC-8 hold; a new top-level element''s relPath includes the manifests directory prefix; every rejection path touches nothing'
    - task_id: task-003
      methods:
        - 'Node.js vm harness: delete platform.authx.backend and a manifest-root with cross-file-attached children, against a temporary .custom copy'
      success_criteria:
        - 'AC-9 through AC-12 hold; cancel leaves AppState byte-for-byte unchanged; confirm removes exactly the scanned relationships and the element together'
    - task_id: task-004
      methods:
        - 'Node.js vm harness with an fs-backed write/permission shim, against a temporary .custom copy: full save, staled-file conflict, permission denial, partial-failure scenarios'
      success_criteria:
        - 'AC-13 through AC-17 hold; a conflict writes nothing; a partial failure leaves exactly the already-succeeded files written and names the failure; workspace.yaml round-trips correctly'
    - task_id: task-005
      methods:
        - 'grep for duplicate handleAppClick case labels and for createWritable/removeEntry(/getFileHandle(.*create outside saveAllChanges'
        - 'Full Node.js vm-harness walkthrough of the wave''s own named create/delete/save scenario, end to end, against a temporary .custom copy, followed by a completely fresh loadWorkspace against that same temp folder'
        - 'git status/git diff against the real .custom/ directory, confirmed empty'
      success_criteria:
        - 'No duplicate data-action name; no disk access outside saveAllChanges; the wave''s own Completion Criteria scenario holds end to end; the real .custom/ is unchanged'
```

No automated test harness exists for this browser-only, build-free file
(confirmed, same precedent every prior run in this wave already recorded:
no test under `src/test` references `standalone.html`). This run's
verification continues the Node `vm`-sandboxed-extraction-and-direct-
function-call approach every prior run used for the same reason (the
Claude Browser pane cannot drive this app's real `file://` + File System
Access API flow in this sandbox, confirmed independently across both
prior runs) — extended here with an `fs`-backed write/permission shim
(`createWritable`/`write`/`close`/`removeEntry`/`getFileHandle(...,
{create:true})`/`queryPermission`/`requestPermission` with `readwrite`
mode tracking) so the real write-path code can be exercised end to end,
against a temporary filesystem copy of `.custom` created fresh for this
run's own verification and never the real, git-tracked directory.

## 11. Escalation Rules

```yaml
escalation_rules:
  rules:
    - condition: 'A real .custom element''s level computes incorrectly against a manual reading of its own manifest file (task-001)'
      action: 'Fix the level-threading logic before proceeding to task-002/003, which both depend on it for kind-gating correctness.'
    - condition: 'A created top-level element''s relPath is missing the manifests directory prefix, or otherwise does not match loadWorkspace''s own join convention (task-002)'
      action: 'Block task-002 and fix immediately — this is the exact defect Stage 5''s TDD review already found and fixed at the design level; its recurrence at the implementation level would mean the fix was not actually carried through.'
    - condition: 'The relationship-pruning step in commitDeleteElement mutates a node other than the ones DEC-4''s scan named (task-003)'
      action: 'Treat as a correctness blocker, not a cosmetic issue — this is exactly the class of bug that would silently corrupt an unrelated element''s relationships. Block task-004 until fixed and re-verified.'
    - condition: 'The stale-check (task-004) has any false negative — a real external change goes undetected by the harness''s own fs-backed shim'
      action: 'Treat as an NFR-3/FR-16 violation — block task-005 and fix before any further verification; this is exactly the class of bug the autonomy override does not excuse shipping unverified, per this run''s own dispatcher instruction not to downgrade real disk-write risk.'
    - condition: 'Any verification activity in this run leaves a mutation behind in the real, git-tracked .custom/ directory (any task, but checked explicitly in task-005)'
      action: 'Stop immediately, revert the mutation via git, and record the incident plainly in the prg and the final report — this is the one failure mode serious enough to override "keep going on what does not depend on it."'
    - condition: 'Any PRD AC or wave Completion Criteria item cannot be reproduced against the temporary .custom copy once implemented (task-005)'
      action: 'Name the specific AC/criterion and the observed behavior in the prg; fix if the cause is clearly a this-run implementation gap; escalate as a blocker only if the cause traces back to a genuine PRD/TDD contradiction this plan did not anticipate (none expected, per Stage 7''s consistency check).'
    - condition: 'A genuine product/architecture tradeoff with no defensible single answer surfaces during implementation (none identified while drafting this plan)'
      action: 'Per complete-run''s autonomy override, this is the one category that still escalates to the human rather than being resolved inline or by a subagent — log it in the prg and surface it clearly in the final report.'
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
    - task-002
    - task-003
    - task-004
    - task-005
  parallel_groups: []
  required_human_gates: []
  highest_risk_tasks:
    - task-004
    - task-005
  lowest_confidence_tasks:
    - task-004
  next_action: 'Done — all five tasks completed and independently re-verified (both per-task and in Stage 11''s own repository-wide pass); proceed to the run''s final report.'
  criteria:
    - 'All five tasks reach status done with their own verification passing — TRUE (see each task''s Task Catalog entry and the run''s prg Log; every task was additionally independently re-verified by this run itself, not only by its own dispatched subagent)'
    - 'The wave''s own named create/delete/save scenario (create into existing/new manifest; delete platform.authx.backend leaving zero dangling relationships after save+reload) holds against a temporary .custom copy — TRUE, confirmed as one combined, continuous scenario in task-005 (not merely as separate per-task checks): a same-file child create, a standalone brand-new-manifest create, a cross-file-attached brand-new-manifest create, deleting platform.authx.backend (its exact 4 known relationships removed), one save, then a completely fresh loadWorkspace against the same temp folder — every outcome held simultaneously'
    - 'The real, git-tracked .custom/ directory is confirmed byte-for-byte unchanged by this run''s own verification activity — TRUE, re-checked independently by this run itself after every one of the five tasks (git status --porcelain -- .custom / git diff --stat -- .custom both empty every time), not only claimed by each dispatched subagent'
```
