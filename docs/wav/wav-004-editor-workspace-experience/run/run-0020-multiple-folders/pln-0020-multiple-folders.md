---
title: Editor — remembered folders, execution plan
type: pln
status: completed
date: 2026-10-13
run: 0020
wave: 004
related:
  - docs/wav/wav-004-editor-workspace-experience/run/run-0020-multiple-folders/tdd-0020-multiple-folders.md
---

# 1. Executive Summary

No PRD (profile `TDD+pln`): the requirements are R1-R11 of the TDD. This run operates under the `complete-run` autonomy
override: no stop on `human_required` by category (none of its tasks carries that tier). Tasks 001 and 002 are
`hard_judgment` (the migration of the stored record, the delete action): they stay inline in the executing session.

```yaml
summary:
  status: 'done'
  product_goal: 'Come back to any folder already opened, and forget the ones no longer wanted'
  technical_approach: 'Same IndexedDB (v1, store handles), one record per folder plus the last-folder record migrated in place; one transaction helper; the landing card lists the folders from an in-memory copy'
  total_tasks: 6
  parallel_groups: 0
  high_risk_tasks: 2
  human_review_gates: 0
  autonomy_level: 'high'
  recommendation: 'proceed'
  criteria:
    - 'AC-1 a version-1 record {handle} is migrated in place (folder record + workspace rewritten with id, version still 1); a failed migration (DataCloneError, asynchronous put error, partial read) writes nothing and the old record is still used, opened and removable'
    - 'AC-2 on load the last folder opens directly when granted, else the reopen card (wording unchanged) with the list'
    - 'AC-3 with no folder open the landing card lists every remembered folder, most recent first, name and folder name, each with Open and "Remove from the list" whose accessible names name the folder'
    - 'AC-4 Remove deletes only that folder record (and workspace when it pointed at it), no file on disk'
    - 'AC-5 Close folder keeps the folder and clears only its own last-folder record; a refused or failed permission keeps the entry and says why'
    - 'AC-6 the same folder picked twice is one entry; the name is stored on open, refreshed on each open and after a save'
    - 'AC-7 openingMessage takes the stored name; lastWorkspaceName is gone'
    - 'AC-8 served mode: no IndexedDB call, no list, no "Remembered folders"'
    - 'AC-9 node tests, ./mvnw verify and embed.sh --check pass; the kernel block is untouched'
    - 'AC-10 the card was seen on a replica in light and dark, and what that could not confirm is said'
    - 'AC-11 the manual describes the remembered folders'
```

# 2. PRD/TDD Consistency Assessment

```yaml
consistency_assessment:
  aligned_items:
    - 'R1 DEC-6/FLOW-1; R2 DEC-8; R3 DEC-7/DEC-8; R4 DEC-1/DEC-2; R5 DEC-3; R6 DEC-4; R7 DEC-5; R8 DEC-6; R9 DEC-10; R10 DEC-4; R11 Observability'
  gaps:
    - id: gap-001
      type: 'ambiguity'
      description: 'No PRD; the requirements come from the wave plan row W-9 and the dispatch brief (user decisions)'
      impact: 'low'
      recommendation: 'Traceability marked incomplete in the TDD; nothing to resolve'
  blocking_gaps: []
```

# 3. Execution Graph

```yaml
execution_graph:
  nodes:
    - { id: task-001, status: 'done', title: 'Storage layer: transaction helper, records, migration, remember / name / forget / clear', depends_on: [], produces: ['standalone.html JS'], agent_role: 'Frontend Implementation Agent', autonomy: 'autonomous', risk: 'critical', confidence: 80 }
    - { id: task-002, status: 'done', title: 'Flows: load, picker, open from the list, reopen, close, remove, show-folders, name hooks, openingMessage', depends_on: ['task-001'], produces: ['standalone.html JS'], agent_role: 'Frontend Implementation Agent', autonomy: 'autonomous', risk: 'high', confidence: 80 }
    - { id: task-003, status: 'done', title: 'Landing card: config, markup, CSS, focus', depends_on: ['task-002'], produces: ['standalone.html JS and CSS'], agent_role: 'Frontend Implementation Agent', autonomy: 'autonomous', risk: 'medium', confidence: 85 }
    - { id: task-004, status: 'done', title: 'Fake indexedDB in the harness; folders.test.js; the openingMessage test', depends_on: ['task-003'], produces: ['harness.js', 'folders.test.js', 'workspace-name.test.js'], agent_role: 'Test Generation Agent', autonomy: 'autonomous', risk: 'medium', confidence: 85 }
    - { id: task-005, status: 'done', title: 'Manual; replica in light and dark', depends_on: ['task-003'], produces: ['README.adoc', 'findings'], agent_role: 'Documentation Agent', autonomy: 'autonomous', risk: 'low', confidence: 85 }
    - { id: task-006, status: 'done', title: 'Verification and close-out', depends_on: ['task-004', 'task-005'], produces: ['results'], agent_role: 'QA Agent', autonomy: 'autonomous', risk: 'low', confidence: 85 }
  edges:
    - { from: task-001, to: task-002, reason: 'the flows call the storage layer' }
    - { from: task-002, to: task-003, reason: 'the card reads the in-memory list the flows keep' }
    - { from: task-003, to: task-004, reason: 'the tests assert the markup' }
    - { from: task-003, to: task-005, reason: 'the replica renders the markup' }
    - { from: task-004, to: task-006, reason: 'verify the whole' }
    - { from: task-005, to: task-006, reason: 'verify the whole' }
```

# 4. Task Catalog

```yaml
task_catalog:
  tasks:
    - id: task-001
      title: 'Storage layer'
      source_requirements: { prd: [], tdd: ['R4', 'R5', 'R6', 'DEC-1', 'DEC-2', 'DEC-3', 'DEC-4', 'DEC-7', 'CTR-1', 'A-2', 'A-3', 'CON-3'] }
      outputs: ['openArchicodeDb (onversionchange), withArchicodeStore, readArchicodeRecords, findSameFolder, migrateLastFolder, readRememberedFolders, rememberFolder, noteWorkspaceName, forgetRememberedFolder, clearLastFolder']
      likely_files: ['src/main/resources/editor-webapp/standalone.html']
      verification: ['folders.test.js migration, failure and helper tests', 'hand mutations of the migration, the abort, the guarded deletes']
      risk: 'critical'
      confidence: 80
      human_review: 'none'
      escalation_triggers: ['a path where a remembered folder can be lost that the TDD does not accept']
      delegation_tier: 'hard_judgment'
    - id: task-002
      title: 'Flows'
      source_requirements: { prd: [], tdd: ['R1', 'R7', 'R8', 'R9', 'R10', 'DEC-4', 'DEC-5', 'DEC-6', 'DEC-7', 'DEC-10', 'A-4'] }
      outputs: ['tryAutoReopen, openFolder, reopenFolder, openRememberedFolder, closeFolder, forgetFolder, showRememberedFolders, refreshRememberedFolders, retryFolder, loadWorkspace and save hooks, openingMessage, click actions']
      likely_files: ['src/main/resources/editor-webapp/standalone.html']
      verification: ['folders.test.js', 'requestPermission is the first await of the click (diff review)']
      risk: 'high'
      confidence: 80
      human_review: 'none'
      escalation_triggers: []
      delegation_tier: 'hard_judgment'
    - id: task-003
      title: 'Landing card'
      source_requirements: { prd: [], tdd: ['R2', 'R3', 'DEC-8', 'CTR-2', 'IF-1', 'IF-2', 'IF-3', 'IF-4'] }
      outputs: ['landingScreenConfig folders/notice, landingFolderRows, renderLandingFoldersHtml, .landing-folder* CSS, landing focus']
      likely_files: ['src/main/resources/editor-webapp/standalone.html']
      verification: ['folders.test.js markup assertions', 'replica']
      risk: 'medium'
      confidence: 85
      human_review: 'none'
      escalation_triggers: []
      delegation_tier: 'standard'
    - id: task-004
      title: 'Harness fake and tests'
      source_requirements: { prd: [], tdd: ['R11', 'IMP-3', 'IMP-4', 'Observability and Verification'] }
      outputs: ['fakeIndexedDB in harness.js (default per page), isSameEntry on directory handles, folders.test.js, the openingMessage test of workspace-name.test.js']
      likely_files: ['src/test/javascript/viewpoint-kernel/harness.js', 'src/test/javascript/viewpoint-kernel/folders.test.js', 'src/test/javascript/viewpoint-kernel/workspace-name.test.js']
      verification: ['node --test "src/test/javascript/**/*.test.js"']
      risk: 'medium'
      confidence: 85
      human_review: 'none'
      escalation_triggers: ['an existing test would have to be loosened rather than updated deliberately']
      delegation_tier: 'standard'
    - id: task-005
      title: 'Manual and replica'
      source_requirements: { prd: [], tdd: ['IMP-5', 'Observability and Verification'] }
      outputs: ['README.adoc [[editor-open]] (new [[editor-folders]] paragraph) and [[editor-workspace-name]]', 'replica findings']
      likely_files: ['src/doc/README.adoc']
      verification: ['the replica in light and dark']
      risk: 'low'
      confidence: 85
      human_review: 'none'
      escalation_triggers: []
      delegation_tier: 'standard'
    - id: task-006
      title: 'Verification and close-out'
      source_requirements: { prd: [], tdd: ['Observability and Verification'] }
      outputs: ['results', 'status files']
      likely_files: []
      verification: ['node suite', './mvnw verify', 'embed.sh --check', 'git diff --stat (no kernel block line)']
      risk: 'low'
      confidence: 85
      human_review: 'none'
      escalation_triggers: ['a suite is red']
      delegation_tier: 'standard'
```

# 5. Parallelization Plan

```yaml
parallelization_plan:
  groups: []
  notes: 'Tasks 001-003 edit one file and each depends on the previous; 004 asserts their markup. Serial.'
```

# 6. Human Review Gates

None. The `complete-run` autonomy override applies; no task is `human_required`. Tasks 001 and 002 are `hard_judgment`
(they migrate the stored record and delete records): inline in the executing session, as the Delegation Policy requires,
whatever the assignment plan says.

# 7. Risk Assessment

- Losing a remembered folder: covered by DEC-2 (rewrite in place, one transaction, explicit abort), the guarded deletes of
  DEC-5 / DEC-7, tests of every failure path, and hand mutations.
- A fake is not a browser (TDD RISK-3): the real migration is not verifiable here; said in the report.

# 8. Confidence Assessment

Overall 80. The least certain point is the behaviour of a real browser (handles cloned back, permission prompts after a
refusal, a moved directory), which only a real Chromium can show.

# 9. Agent Assignment Plan

Tasks 001 and 002: `hard_judgment`, inline (required). Tasks 003-006 are tiered `standard` but worked inline as well: one
file and one design, the tests assert the markup written in 003 (the same deviation as runs 0016-0019). The only dispatch
is the KDMLLC review of the TDD (standard tier).

# 10. Verification Plan

- `node --test "src/test/javascript/**/*.test.js"` (baseline 351 pass).
- `JAVA_HOME=/home/tibo/.sdkman/candidates/java/25.0.4-tem ./mvnw verify` (the P4 gate; unit baseline 107).
- `src/main/rust/viewpoint-kernel/embed.sh --check`.
- The replica of the landing card in the built-in browser, light and dark.

# 11. Escalation Rules

Stop only for a genuine blocker (conflicting requirements, missing access, a product tradeoff). The autonomy override of
`complete-run` applies.

# 12. Final Execution Manifest

```yaml
execution_manifest:
  status: 'done'
  criteria:
    - 'AC-1 … AC-11 above all hold'
```

## Results

- Deviation: tasks 001-004 were implemented before this pln was written (the storage layer was drafted with the TDD, to
  check the transaction reasoning against a running fake); the pln records them as they were done. Tasks 003-006 are
  tiered `standard` and were worked inline (see section 9); 001 and 002 are `hard_judgment` and inline as required. The
  only dispatch was the KDMLLC review of the TDD (standard tier): 13 findings (3 S2, 7 S1, 3 S0). F1 (transaction helper
  contract), F2 (fallback in a new transaction), F5 (absent record), F9 (id source) were already how the code was
  written and are now stated in the TDD; F3 (an older tab writing another folder during the migration) and F4 (a guarded
  legacy Remove) changed the code; F6-F8, F10-F13 were applied to the text.
- AC-1: folders.test.js 'a folder stored by the earlier version is migrated in place…', '…migrated onto its record…',
  'a migration that cannot clone the handle writes nothing…' (also: it opens on load, Close leaves its record, it opens
  from the list, Remove deletes it), '…whose write fails later…', 'a stored value that cannot be read back…', and 'a
  transaction writes all or nothing…' (the helper's contract). The database stays at version 1.
- AC-2: the migration test (opened directly) and 'Remove deletes only the record…' (the reopen card's title, text and
  buttons unchanged, with the list).
- AC-3: 'two folders opened one after the other are both listed…' (markup, order, names, accessible names, the note).
- AC-4: 'Remove deletes only the record of that folder…' (files on disk checked), 'after a Remove the focus goes…'.
- AC-5: 'Close folder keeps the folder remembered…', 'a refused permission keeps the folder…', 'Reopen refused on the
  reopen card keeps the folder…', 'a folder whose workspace.yaml cannot be read…'.
- AC-6: 'the same folder picked twice is one entry', 'the name of the workspace is stored with its folder…' (on open, on
  each open, after a save, emptied).
- AC-7: workspace-name.test.js '"Opening “x”…" says the name stored with the folder…' (updated deliberately: the contract
  changed); the stored name in the busy messages of folders.test.js.
- AC-8: 'served by archicode editor serve: … no IndexedDB call and no list anywhere'.
- AC-9: `node --test "src/test/javascript/**/*.test.js"` 372 pass (baseline 351; 21 new); `./mvnw verify` (JDK 25): 107
  unit tests, 0 failures, BUILD SUCCESS, Failsafe integration tests skipped (`skipITs=true` by default, per CLAUDE.md);
  `embed.sh --check` exit 0; the diff of `standalone.html` holds no line of the base64 block.
- Hand mutations (eleven, one at a time, the file restored after each): migration deleting the old record, no explicit
  abort on a throw (caught once the helper test waited past the commit), Close clearing another tab's pointer, Remove
  deleting every folder, no dedup, a refusal deleting the entry, served mode reading IndexedDB, openingMessage ignoring the
  name, Close forgetting the folder, the name not noted on open, a partial read migrating. Each made a test fail.
- AC-10: replica (the real stylesheet, the markup of `renderLandingHtml` for the first-launch card with three folders, a
  notice and a problem line, the reopen card, and fourteen folders) in the built-in browser: light and dark at desktop
  width, light and dark at 375 px. Readable in both themes, long names cut with an ellipsis, a long list scrolls inside
  the card and the page scrolls to the card's end, no horizontal scroll, focus outline visible inside the scrolled list.
  The 375 px view led to the row separators (TDD DEC-8). Viewport reset to desktop; the throwaway server was stopped by PID.
- AC-11: `src/doc/README.adoc`, new paragraph `[[editor-folders]]` in `[[editor-open]]`, and the "Opening" sentence of
  `[[editor-workspace-name]]`.

## Findings

- Not confirmed: a real IndexedDB with real `FileSystemDirectoryHandle`s (that a handle read back can be put again, that
  the migration runs on a profile the earlier version filled), a real permission prompt and what a browser answers after a
  refusal (TDD A-6), a moved or deleted directory (A-5), two real tabs at once; the manual's Asciidoctor build.
- The fake `indexedDB` of the harness is now the default of every page the tests create: the `indexedDB.open is not a
  function` noise of the earlier tests is gone, and any later test can seed or dump the remembered folders.
