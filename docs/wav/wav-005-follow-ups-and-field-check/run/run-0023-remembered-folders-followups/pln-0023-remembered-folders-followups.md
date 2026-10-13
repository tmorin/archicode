---
title: Editor — permission state of each remembered folder and one record per folder, execution plan
type: pln
status: completed
date: 2026-10-13
run: 0023
wave: 005
related:
  - docs/wav/wav-005-follow-ups-and-field-check/run/run-0023-remembered-folders-followups/tdd-0023-remembered-folders-followups.md
---

# 1. Executive Summary

No PRD (profile `TDD+pln`): the requirements are R1-R9 of the TDD (tmorin/archicode#16 items 1 and 2, wave plan row
W-4). This run operates under the `complete-run` autonomy override: no stop on `human_required` by category. Tasks 002
and 003 are `hard_judgment` (they merge and delete stored records of remembered folders): they stay inline in the
executing session.

```yaml
summary:
  status: 'done'
  product_goal: 'The list of remembered folders says what a click will need, and never holds the same folder twice'
  technical_approach: 'queryPermission for every entry after the card is drawn, shown as a described text line; duplicates repaired (no lock) on every list read and after every remember, in one checked transaction per folder that never writes the last-folder pointer; ids held from before a merge resolved through isSameEntry; the fake indexedDB schedules transactions as a browser does'
  total_tasks: 7
  parallel_groups: 0
  high_risk_tasks: 2
  human_review_gates: 0
  autonomy_level: 'high'
  recommendation: 'proceed'
  criteria:
    - 'AC-1 each entry shows its permission state (granted, prompt, denied, unreachable, unknown) without any requestPermission call, on the first-launch and the reopen card, in text, as the Open button''s accessible description'
    - 'AC-2 the card is drawn before any query answers; the queries run in parallel; one redraw keeps the focus and the list''s scroll, and leaves the focus alone when it was not on the card'
    - 'AC-3 two pages picking the same folder at the same moment end with one record, the last-folder pointer naming it, the name kept'
    - 'AC-4 stored duplicates are merged on load: survivor = the pointer''s record else the most recent, the most recent non-empty name, the highest openedAt; the workspace record is never written by a merge; a folder of the same name is not merged'
    - 'AC-5 a merge that fails (async put error, DataCloneError) or finds the records or the pointer changed writes nothing (store exactly as before) and the folder is still one row, whose Remove forgets all its records and the pointer naming any of them'
    - 'AC-6 a tab holding an id merged away by another tab notes the name, opens, closes and removes through the folder''s live id; a pointer left on a merged-away record by an older tab is migrated onto the folder''s record'
    - 'AC-7 the fake runs two readwrite transactions one after the other (holdCommit test)'
    - 'AC-8 the database stays at version 1; node suite, ./mvnw test and embed.sh --check pass; the kernel block is untouched'
    - 'AC-9 the manual [[editor-folders]] describes the states and the merge; the list was checked on a replica in light and dark, and what that could not confirm is said'
```

# 2. PRD/TDD Consistency Assessment

```yaml
consistency_assessment:
  aligned_items:
    - 'R1 DEC-1/DEC-2; R2 DEC-1 (tryAutoReopen); R3 DEC-2; R4 DEC-1/DEC-4; R5 DEC-3..DEC-6; R6 DEC-5; R7 DEC-5/DEC-6; R8 DEC-3; R9 CON-1, DEC-7, IMP-6'
  gaps:
    - id: gap-001
      type: 'ambiguity'
      description: 'No PRD; the requirements come from tmorin/archicode#16, the wave plan row W-4 and the dispatch brief'
      impact: 'low'
      recommendation: 'Traceability marked incomplete in the TDD; nothing to resolve'
  blocking_gaps: []
```

# 3. Execution Graph

```yaml
execution_graph:
  nodes:
    - { id: task-001, status: 'done', title: 'Fake indexedDB: transaction scheduling per database, holdCommit', depends_on: [], produces: ['harness.js'], agent_role: 'Test Generation Agent', autonomy: 'autonomous', risk: 'medium', confidence: 85 }
    - { id: task-002, status: 'done', title: 'Storage: group, merge (checked, one transaction, pointer never written), liveFolderId, rememberFolder post-write merge, storeWorkspaceName, forget/clear with several ids', depends_on: ['task-001'], produces: ['standalone.html JS'], agent_role: 'Frontend Implementation Agent', autonomy: 'autonomous', risk: 'critical', confidence: 80 }
    - { id: task-003, status: 'done', title: 'Flows: tryAutoReopen, closeFolder, forgetFolder, refreshRememberedFolders, noteWorkspaceName on live ids', depends_on: ['task-002'], produces: ['standalone.html JS'], agent_role: 'Frontend Implementation Agent', autonomy: 'autonomous', risk: 'high', confidence: 80 }
    - { id: task-004, status: 'done', title: 'Permission states: folderPermissionOf, checkFolderPermissions, rows, markup, CSS, focus and scroll kept', depends_on: ['task-003'], produces: ['standalone.html JS and CSS'], agent_role: 'Frontend Implementation Agent', autonomy: 'autonomous', risk: 'medium', confidence: 85 }
    - { id: task-005, status: 'done', title: 'Tests in folders.test.js; hand mutations', depends_on: ['task-004'], produces: ['folders.test.js'], agent_role: 'Test Generation Agent', autonomy: 'autonomous', risk: 'medium', confidence: 85 }
    - { id: task-006, status: 'done', title: 'Manual [[editor-folders]]; replica in light and dark', depends_on: ['task-004'], produces: ['README.adoc', 'findings'], agent_role: 'Documentation Agent', autonomy: 'autonomous', risk: 'low', confidence: 85 }
    - { id: task-007, status: 'done', title: 'Verification and close-out', depends_on: ['task-005', 'task-006'], produces: ['results'], agent_role: 'QA Agent', autonomy: 'autonomous', risk: 'low', confidence: 85 }
  edges:
    - { from: task-001, to: task-002, reason: 'the merge check is only meaningful on a store that serialises readwrite transactions' }
    - { from: task-002, to: task-003, reason: 'the flows call the storage layer' }
    - { from: task-003, to: task-004, reason: 'the states are queried after the list reads of the flows' }
    - { from: task-004, to: task-005, reason: 'the tests assert the markup' }
    - { from: task-004, to: task-006, reason: 'the replica renders the markup' }
    - { from: task-005, to: task-007, reason: 'verify the whole' }
    - { from: task-006, to: task-007, reason: 'verify the whole' }
```

# 4. Task Catalog

```yaml
task_catalog:
  tasks:
    - id: task-001
      title: 'Fake indexedDB scheduling'
      source_requirements: { prd: [], tdd: ['R9', 'DEC-7', 'ASM-4', 'IMP-4'] }
      outputs: ['transactions start in creation order when no conflicting earlier one is unfinished (per database, across connections); holdCommit({ mode, keys })']
      likely_files: ['src/test/javascript/viewpoint-kernel/harness.js']
      verification: ['the 21 folder tests of run 0020 pass unchanged on it', 'folders.test.js "the fake runs two readwrite transactions one after the other"']
      risk: 'medium'
      confidence: 85
      human_review: 'none'
      escalation_triggers: ['an existing test fails on the faithful scheduling']
      delegation_tier: 'standard'
    - id: task-002
      title: 'Storage layer: merge and live ids'
      source_requirements: { prd: [], tdd: ['R5', 'R6', 'R7', 'DEC-3', 'DEC-4', 'DEC-5', 'DEC-6', 'CTR-1', 'IMP-1'] }
      outputs: ['isSameFolder, groupSameFolders, mergedFolderOf, mergeSameFolder, mergeDuplicateFolders, liveFolderId, storeWorkspaceName; readRememberedFolders, rememberFolder, noteWorkspaceName, forgetRememberedFolder(entry, ids), clearLastFolder(id, others)']
      likely_files: ['src/main/resources/editor-webapp/standalone.html']
      verification: ['folders.test.js merge, failure, race and stale-id tests', 'hand mutations of the survivor, name, openedAt, checks, grouping, post-write merge']
      risk: 'critical'
      confidence: 80
      human_review: 'none'
      escalation_triggers: ['a path where the pointer, a stored name or another folder''s record can be lost']
      delegation_tier: 'hard_judgment'
    - id: task-003
      title: 'Flows on live ids'
      source_requirements: { prd: [], tdd: ['R6', 'DEC-6', 'FLOW-2', 'FLOW-3', 'IMP-2'] }
      outputs: ['closeFolder via liveFolderId and others; forgetFolder via liveFolderId and others; refreshRememberedFolders follows merged; tryAutoReopen state']
      likely_files: ['src/main/resources/editor-webapp/standalone.html']
      verification: ['folders.test.js stale-id, removed-elsewhere and pointer-moved tests']
      risk: 'high'
      confidence: 80
      human_review: 'none'
      escalation_triggers: []
      delegation_tier: 'hard_judgment'
    - id: task-004
      title: 'Permission states on the card'
      source_requirements: { prd: [], tdd: ['R1', 'R2', 'R3', 'R4', 'DEC-1', 'DEC-2', 'CTR-2', 'IF-1', 'IF-2'] }
      outputs: ['folderPermissionOf, checkFolderPermissions, landingControlSelector, FOLDER_PERMISSION_TEXT/ICON, landingFolderRows.permission, state line with aria-describedby, .landing-folder-state CSS, render keeps focus and list scroll']
      likely_files: ['src/main/resources/editor-webapp/standalone.html']
      verification: ['folders.test.js state tests', 'replica']
      risk: 'medium'
      confidence: 85
      human_review: 'none'
      escalation_triggers: []
      delegation_tier: 'standard'
    - id: task-005
      title: 'Tests'
      source_requirements: { prd: [], tdd: ['Observability and Verification', 'IMP-5'] }
      outputs: ['13 new tests in folders.test.js; one existing assertion updated deliberately (the problem line gained an id, the button''s description)']
      likely_files: ['src/test/javascript/viewpoint-kernel/folders.test.js']
      verification: ['node --test "src/test/javascript/**/*.test.js"', 'hand mutations']
      risk: 'medium'
      confidence: 85
      human_review: 'none'
      escalation_triggers: ['an existing test would have to be loosened rather than updated deliberately']
      delegation_tier: 'standard'
    - id: task-006
      title: 'Manual and replica'
      source_requirements: { prd: [], tdd: ['R9', 'IMP-6', 'Observability and Verification'] }
      outputs: ['README.adoc [[editor-folders]]', 'replica findings']
      likely_files: ['src/doc/README.adoc']
      verification: ['the replica in light and dark, desktop and 375 px']
      risk: 'low'
      confidence: 85
      human_review: 'none'
      escalation_triggers: []
      delegation_tier: 'standard'
    - id: task-007
      title: 'Verification and close-out'
      source_requirements: { prd: [], tdd: ['Observability and Verification'] }
      outputs: ['results', 'status files']
      likely_files: []
      verification: ['node suite', './mvnw test (JDK 25)', 'embed.sh --check', 'git diff (no kernel block line)']
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
  notes: 'Tasks 002-004 edit one file and each depends on the previous; 005 asserts their markup; 006 could run beside 005 but is small. Serial.'
```

# 6. Human Review Gates

None. The `complete-run` autonomy override applies: the merge deletes stored records (a category the default policy
gates as "irreversible data deletion"), and it ran without a human stop because what it deletes is verifiable by tests
(only records of the same directory, never the pointer, nothing on a failure) and recoverable (picking the folder again
remembers it). Tasks 002 and 003 are `hard_judgment`: inline in the executing session, as the Delegation Policy requires.

# 7. Risk Assessment

- Losing a remembered folder, its name or the pointer through a merge: DEC-5's in-transaction check, the pointer never
  written, the survivor chosen by the pointer, tests of every failure path, nineteen hand mutations.
- Acting on an id merged away by another tab: DEC-6 (`liveFolderId`), tested for name, open, close and remove.
- The fake is not a browser (TDD RISK-3); `queryPermission` on a vanished folder is unverified (ASM-2).

# 8. Confidence Assessment

Overall 80. The least certain points are a real browser's answers (`queryPermission` for a moved directory, two real
tabs interleaving), which only a real Chromium can show.

# 9. Agent Assignment Plan

```yaml
agent_assignment_plan:
  - { task: task-001, suggested_subagent_type: 'general-purpose', suggested_model: null, actual: 'inline' }
  - { task: task-002, suggested_subagent_type: null, suggested_model: null, actual: 'inline (hard_judgment, required)' }
  - { task: task-003, suggested_subagent_type: null, suggested_model: null, actual: 'inline (hard_judgment, required)' }
  - { task: task-004, suggested_subagent_type: 'general-purpose', suggested_model: null, actual: 'inline' }
  - { task: task-005, suggested_subagent_type: 'general-purpose', suggested_model: null, actual: 'inline' }
  - { task: task-006, suggested_subagent_type: 'general-purpose', suggested_model: null, actual: 'inline' }
  - { task: task-007, suggested_subagent_type: 'general-purpose', suggested_model: null, actual: 'inline' }
```

Tasks 001 and 004-007 are tiered `standard` but were worked inline: one file and one design, the harness and the tests
are the evidence for the `hard_judgment` tasks, and the replica needs the markup just written (the same deviation as
runs 0016-0020). The only dispatch was the KDMLLC review of the TDD (standard tier).

# 10. Verification Plan

- `node --test "src/test/javascript/**/*.test.js"` (baseline 372 pass, checked before this run's changes).
- `JAVA_HOME=/home/tibo/.sdkman/candidates/java/25.0.4-tem ./mvnw test` (baseline 111).
- `src/main/rust/viewpoint-kernel/embed.sh --check`.
- Hand mutations of the new code, one at a time, the file restored from memory after each (no other agent edits it).
- The list on a replica in the built-in browser, light and dark, desktop and 375 px.

# 11. Escalation Rules

Stop only for a genuine blocker (conflicting requirements, missing access, a product tradeoff). The autonomy override of
`complete-run` applies.

# 12. Final Execution Manifest

```yaml
execution_manifest:
  status: 'done'
  criteria:
    - 'AC-1 … AC-9 above all hold'
```

## Results

- Deviation: the pln was written after tasks 001-006 were implemented (the storage layer was drafted while the review of
  the TDD ran, to check the transaction reasoning against the faithful fake); it records them as they were done.
- KDMLLC review of the TDD (standard tier, read HEAD as its referent): 13 findings (4 S2, 7 S1, 2 S0). F2 (tryAutoReopen
  mapping), F8 (`merged` covers `others`), F9, F10, F12 were already how the code was written and are now stated; F1
  (Remove and Close of a row with `others` clear a pointer naming any of them; the last folder found among `others`) and
  F3 (the list's scroll kept; the focus never given to the primary button by the permission redraw) changed the code and
  got tests; F4 (older tabs) got a TDD bullet and the dangling-pointer test; F5-F7, F11, F13 were applied to the text.
- AC-1: 'each remembered folder says what a click will meet, asked without any prompt' (requestPermission throws if
  called; five states; markup, `aria-describedby`, icon `aria-hidden`), 'the reopen card lists the states too…' (one
  query for the last folder), 'a refused permission keeps the folder…' (updated: the problem line replaces the state and
  is the description).
- AC-2: 'the card is drawn before the permissions are known, all asked at once, then drawn once more with the focus
  kept' (12 folders, all 12 queries made before any answers, no state line before, one more draw, focus and scroll
  kept, focus left alone when not on the card).
- AC-3: 'two tabs picking the same folder at the same moment end with one record…' (asserts the race happened: two
  distinct `folder:` keys written; then one record, pointer on it, name 'Shop', both tabs close and the pointer goes).
- AC-4: 'records of one folder stored twice are merged on load…', 'without a pointer, the most recently opened record is
  kept…'.
- AC-5: 'a merge that fails writes nothing…' (async put failure and DataCloneError: `dump` equal before and after),
  'a merge that finds the records changed…', 'a merge skipped because the pointer moved…'.
- AC-6: 'a tab holding the id of a record another tab merged away…', 'a folder removed from the list in another tab is
  not remembered again…', 'a pointer an older tab left on a record merged away…'.
- AC-7: 'the fake runs two readwrite transactions one after the other, as a browser does'.
- AC-8: `node --test "src/test/javascript/**/*.test.js"` 385 pass, 0 fail (372 + 13); `./mvnw test` (JDK 25) exit 0,
  111 tests, 0 failures, 0 errors; `embed.sh --check` exit 0 ("the committed WebAssembly is the one the sources build");
  the diff of `standalone.html` has no line of the base64 block; `ARCHICODE_DB_VERSION` still 1.
- Hand mutations (nineteen, one at a time, restored and the file's hash checked afterwards): merge ignoring the pointer,
  merge not re-checking the records, survivor ignoring the pointer, name of the most recent even if empty, openedAt of
  the survivor, no post-write merge, grouping by name only, Remove ignoring `others`, no permission check on the
  first-launch card, the redraw giving the focus to the primary button (first missed: the harness has no
  `#landing-primary`; the test now provides one, caught), a throw shown as denied, Close on the stale id, a known id
  trusted when its record is gone, queries in sequence, problem and state both shown, the name not followed to the live
  id, Close ignoring `others`, the scroll not kept, a failed merge listing both rows. All caught.
- AC-9: `src/doc/README.adoc` `[[editor-folders]]`. Replica (the real stylesheet, `renderLandingHtml` markup of the
  first-launch and the reopen card with the five states, a problem line and a not-yet-known entry) in the built-in
  browser, measured by script since screenshots timed out (the pane's window was not painting): light and dark at 822 px
  and 375 px, no horizontal scroll, no overlap of Open and Remove (Remove at the right on desktop, under its folder at
  375 px), the state line inside the Open button, state text contrast 5.74:1 (light) and 5.85:1 (dark) on the button,
  problem line 5.45:1 (dark). The first sentences wrapped on two lines in every row at desktop width: shortened (TDD
  DEC-2), then one line each at both widths. Viewport reset to desktop, the tab closed, the throwaway server stopped by PID.

## Findings

- Not confirmed: a real IndexedDB with real handles, what a real `queryPermission` answers for a moved or deleted
  directory (ASM-2), a real permission prompt, two real tabs racing, how the list looks to the eye (only measured: no
  screenshot could be taken), a screen reader reading the description; the manual's Asciidoctor build.
- The fake `indexedDB` now schedules transactions as a browser does; every later test of the remembered folders runs on
  it.
