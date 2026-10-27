---
title: Execution Plan — Browser workspace
status: draft
date: 2026-10-27
related:
  - docs/wav/wav-025-hosted-editor/run/run-0192-browser-workspace/tdd-0192-browser-workspace.md
  - docs/wav/wav-025-hosted-editor/wav-025-hosted-editor.md
  - 'gh:tmorin/archicode#162'
type: pln
run: 0192
wave: 025
---

# Execution Plan: Browser workspace

Profile TDD+pln: there is no PRD, so the requirement IDs REQ-1 to REQ-9 are the ones the TDD labels (section "PRD Traceability"), taken from #162 proposal 2, the W-4 row of the wave plan and the P2 gate. The run operates under the autonomy override of complete-run: a task that would otherwise stop for a human is executed by an agent, and the override is logged in the prg. No task below is `human_required`, critical or `human_review: required`, so the implement workflow has no gate to lift; the three tasks that carry the loss-of-work paths (the store, its tests and the flows: delete, overwrite, a deleted workspace written to, what reopens) are `risk: high`, `review_after`, `hard_judgment`, which raises their independent verifier and nothing else.

The Stage 5 review of the TDD (prg, Findings, 2026-10-27) made 18 findings (9 S2, 9 S1) that the TDD text does not yet carry; Stage 6 resolved the two open questions only. This plan follows the review: where the TDD text differs, the decisions of gap-001 bind, and task-001 writes them into the TDD before any test is written. The tests are written before the code (red first), as in run 0191.

Standing rules for every task: `src/main/resources/editor-webapp/standalone.html` is generated, so `npm run editor:build` runs after any change to `src/main/editor` and before any `node --test` or `npx playwright test` run by hand (the npm scripts `lint`, `test:unit` and `test:coverage` build it themselves); a node test never lets an assertion print a `Uint8Array` or a list of bytes (CON-8: compare strings, lengths, hashes, `Buffer.compare`); the page's bytes are of the vm realm, so no `deepStrictEqual` and no `instanceof` on them; no task commits (the implement workflow never does), so no check below needs a commit, a clean `git status` or a pushed branch.

## 1. Executive Summary

```yaml
summary:
  status: 'pending'
  product_goal: 'A visitor in Chrome, Firefox or Safari opens the hosted editor and works in a workspace the browser keeps for them, without choosing a folder: create, open, rename, delete, reopen after a reload, told plainly that the work lives in this browser (#162 proposal 2, wave 025 W-4).'
  technical_approach: 'Apply the Stage 5 decisions to the TDD, then write the tests first (harness option, store and equivalence tests, flows and landing tests, a hosted-page e2e spec), then a third directory handle backed by a second IndexedDB database (persistence/browser-store.js), the flows (application/browser-workspaces.js, folder-session, save hook, state), the card, bar, events and bootstrap, the Chromium-only pass with its guard test, the e2e run in Chromium and Firefox, and the gates with three mutation checks.'
  total_tasks: 11
  parallel_groups: 1
  high_risk_tasks: 3
  human_review_gates: 1
  autonomy_level: 'medium'
  recommendation: 'proceed_with_review'
  criteria:
    - 'src/main/editor/persistence/browser-store.js and src/main/editor/application/browser-workspaces.js exist, are listed in layers.json, and their top-level names are in names.json; ratchet.max in layers.json is not above 99 and no part is over 3000 lines'
    - 'the five new node test files (browser-store, browser-workspace-equivalence, browser-workspaces-flows, browser-landing, browser-apis) pass; folders.test.js, editor-at-360-px.test.js, editor-structure.test.js, faithful-saves.test.js and editor-odds-and-ends.test.js pass unchanged'
    - 'a node test asserts that with showDirectoryPicker absent and the store ready, landingScreenConfig returns first-launch whose text and note contain neither Firefox and Safari nor File System Access'
    - 'src/test/e2e/browser-workspace.spec.js passes in the chromium and firefox projects against the hosted-style page server: create, edit, save, reload, find the change, close, rename, delete with the question, reload'
    - 'the delete question names the workspace and its file count, focus is on Cancel, a workspace deleted in another tab is never written to, and a refused write leaves the old bytes (each proved by a node test and by a recorded mutation that turns it red)'
    - 'npm run test:unit, npm run test:coverage (no floor in scripts/editor-coverage-floor.json lowered), npm run lint, npm run format:check and npm run editor:check pass; standalone.html is the output of npm run editor:build'
    - 'the run document lists the Chromium-only pass table with the first release of each feature, the three mutation checks with their restoration, and the notes for the wave owner (likely_paths of W-4, ./mvnw verify and scripts/byte-identity.sh left to the wave gate)'
    - 'CLAUDE.md carries one paragraph on the browser workspace in the existing style'
```

## 2. PRD/TDD Consistency Assessment

```yaml
consistency_assessment:
  aligned_items:
    - 'REQ-1 (third handle over IndexedDB) is addressed by TG-1, TG-2, DEC-1 to DEC-3, CTR-1, CTR-2 and tasks 003 and 006'
    - 'REQ-2 (card: list, create, open, rename, delete) by TG-3, DEC-4, DEC-7, DEC-9, IF-1 to IF-4, FLOW-2, FLOW-4 and tasks 004, 007 and 008'
    - 'REQ-3 (persist() at the first save, the notice, the last export time) by TG-5, DEC-8, IMP-4, IMP-7 and tasks 007 and 008'
    - 'REQ-4 (no Firefox and Safari sentence where the store is available) by DEC-4, CTR-3 and the browser-landing test of tasks 004 and 008'
    - 'REQ-5 (Chromium-only pass) by TG-6, DEC-10, ASM-7 and task 009; REQ-6 (node tests and an e2e spec in two browsers) by TG-7, DEC-11 and tasks 003, 004, 005 and 010'
    - 'REQ-7 (making the loss of work hard) by DEC-3, DEC-6, DEC-7, RISK-3 and the mutation checks of task 011; REQ-8 (nothing else moves, ratchet, size, floors) by CON-2 to CON-4, RISK-4, RISK-8 and task 011; REQ-9 (what W-5 needs) by DEC-1, DEC-9, CTR-2 and createBrowserWorkspace'
    - 'layers.json lists persistence/workspace-loading.js, persistence/folder-access.js and application/folder-session.js in that order before persistence/save.js, ratchet.max is 99, and no browser-store name is in names.json (checked by the Stage 5 review)'
    - 'Q-1 and Q-2 are resolved in the TDD (Stage 6) and neither blocks a task'
  gaps:
    - id: gap-001
      type: 'ambiguity'
      description: 'The TDD was not revised after the Stage 5 review. Its text leaves open or gets wrong: the remembered plateau, compare choice and per-folder flags of model/settings.js are keyed folder.id or name:<name>, which a browser workspace (id null) would share by name; the inline name field of New workspace and Rename has no state; where the probe runs is said three ways and an unknown store state would flash the unsupported card; getFileHandle with create on an existing file is not said to leave it untouched; name uniqueness has no transaction; the disk side of the equivalence test is named makeDirHandle, which is read-only; the deny list contradicts the support floor; the transaction helper would reject with a generic error instead of the one that aborted it; the node sandbox has no navigator or File and cross-realm bytes; the once-per-session persist flag cannot be tested with a null answer; several sentences are written in four places.'
      impact: 'high'
      recommendation: 'Decisions the plan binds, task-001 writes them into the TDD: (1) model/settings.js joins Repository Impact (IMP-6 or a new IMP) and the three functions that read the remembered plateau, the compare choice and the per-folder flags key on one helper that returns bw:<id> for a folder with browserWorkspace set and keeps the old key otherwise; deleting a workspace does not need to clear them; a node test pins it. (2) CTR-4 and IMP-6 gain landingNameDraft, an object with for (new or a workspace id), text and problem, replacing landingRenaming; a redraw keeps the typed text and the refusal sentence; resetUiState clears it; the row config derives question and renaming from landingPendingDelete and landingNameDraft and CTR-3 drops browserRows[].question and renaming. (3) The probe runs in bootstrap, before tryAutoReopen, awaited; tryAutoReopen does not call it; FLOW-1 and its diagram say so; browserStoreState unknown is the busy card, never unsupported; isFolderAccessAvailable() does not change (server-mode.test.js pins it false without a picker) and the card uses a new canKeepWorkspace() (picker, store ready, or served); the synchronous branch for no picker is removed in favour of the awaited probe. (4) getFileHandle with create on an existing file returns it with its bytes and modified untouched; DEC-2 and CTR-1 say so and a test pins it. (5) Name uniqueness is checked inside the create and rename readwrite transaction (the workspace keys are read there) and the transaction aborts with the sentence; the store (persistence/browser-store.js, task-006) owns the whole name rule (trimmed, 1 to 80 characters, no control character, unique without case) and the sentences, as one function the flows call to show the problem under the field, and runs it again inside the transaction; a test interleaves two creates of one name on the fake, which serialises readwrite transactions, and one of them fails. (6) The disk side of the equivalence test is memFolder of mem-folder.js, which has createWritable, strings only, and does not truncate on getFileHandle with create; makeDirHandle is read-only and is not used; both handles are fed the same strings, a byte-order mark as the first character of the string. (7) DEC-10 derives the deny list from one rule, first released after the floor of ASM-7; it drops toSorted, toReversed, toSpliced, findLast, structuredClone and navigator.locks (all allowed at the floor) and keeps names the floor lacks (Set.prototype.union and its siblings, the Iterator helpers, Array.fromAsync, Promise.withResolvers, Object.groupBy, Map.groupBy and the others the check of MDN compat data confirms); release numbers are checked against MDN browser-compat-data when it can be reached, otherwise the list keeps only names known to be after the floor and the run document marks the rest C-UNCHECKED. (8) The transaction helper aborts with the error raised in its callback and rejects with that error (name and message kept), so NotFoundError of DEC-6 comes out of close() as itself; a test reads name and message. (9) askForPersistentStorage guards typeof navigator; the harness option withFile adds File and a navigator.storage stub (the sandbox already has Blob, TextEncoder and TextDecoder); tests compare bytes with Buffer.compare or hashes, never deepStrictEqual or instanceof on page bytes; the handle copies bytes on write as it does on read, because the fake copies shallowly. (10) CTR-4 gains browserStorageAsked (boolean, once per page session) beside browserStoragePersisted; the once-per-session test reads the stub call count. (11) The notice sentences live in DEC-8 only; IF-1, IF-3 and CTR-3 point to it. (12) openBrowserWorkspace also sets AppState.permissionState to granted, as the served and picked flows do; closeFolder of a browser workspace also calls refreshBrowserWorkspaces. (13) DEC-6 alternatives say the real reasons for not locking: a lock cannot be tested with the fake and cross-tab messaging is DEF-1; the sentence that navigator.locks is not in Safari 15 is removed. (14) The new hosted fixture is a parameter of pageErrors, as serve is (run 0181: order of teardown). (15) DEC-5 tradeoffs say that readRememberedFolders gives openedAt as Date.now() for a legacy or partly read last folder, so the folder wins in those two cases, which is acceptable. (16) The Summary says browser feature floors, not Chromium-only APIs, and DEC-10 says showDirectoryPicker is the one Chromium-only API found. (17) The Scope and the wave-plan likely_paths differ (the TDD also touches composition/bootstrap.js, composition/events.js, model/app-state.js, model/settings.js and application/browser-workspaces.js, and does not touch package.json); this is recorded in the run document as a note for the wave owner and the wave manifest is not edited by this run. (18) The Verification section lists the new tests of decisions 1, 4, 5, 8 and 10; it moves the cases that read the drawn card or a key handler (the delete question with its text, focus and Escape, the name field kept across a redraw, the escaping of a name, the In this browser notice and the Close workspace label, the row of a record that cannot be read, the error card with Back to the list) from browser-workspaces-flows.test.js to browser-landing.test.js, so that the flows file needs no card and can pass at the end of task-007; and it corrects the sentence that the new code lives in the areas other and pages of the coverage floor: the store, the flows and the save hook fall in the area workspace-and-files (from the marker of the loading to the marker of the three-panel UI in SECTIONS of scripts/editor-coverage.mjs) and the card in other, both held at 90, so the tests must cover them, and no new part may begin with a heading that matches a SECTIONS marker.'
    - id: gap-002
      type: 'risk'
      description: 'RISK-8: ratchet.max is 99 and the count is at its maximum, so any name of a lower part that the new parts use from a higher one, or the reverse, raises it; the TDD says the check runs after each part.'
      impact: 'medium'
      recommendation: 'tasks 006, 007, 008 and 009 each run npm run editor:build then npm run editor:check before they end; a pair that goes upward is moved down or passed as a parameter, never tolerated.'
    - id: gap-003
      type: 'risk'
      description: 'The e2e spec needs Chromium and Firefox from Playwright and a rebuilt page; the hosted-style page server needs no JVM, but the jar is still packaged by the wave gate and by CI.'
      impact: 'low'
      recommendation: 'task-010 runs npx playwright test browser-workspace.spec.js after npm run editor:build; if a browser is not installed it logs the blocker (installing a browser is a download that needs the owner), it does not work around it.'
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
        - 'tdd-0192-browser-workspace.md revised'
      agent_role: 'Documentation Agent'
      autonomy: 'autonomous'
      risk: 'low'
      confidence: 88
    - id: task-002
      status: 'done'
      title: 'Extend the node harness with withFile and a navigator.storage stub'
      depends_on: [task-001]
      produces:
        - 'src/test/javascript/viewpoint-kernel/harness.js'
      agent_role: 'Test Generation Agent'
      autonomy: 'autonomous'
      risk: 'low'
      confidence: 90
    - id: task-003
      status: 'done'
      title: 'Write the store tests and the equivalence test (red)'
      depends_on: [task-002]
      produces:
        - 'src/test/javascript/viewpoint-kernel/browser-store.test.js'
        - 'src/test/javascript/viewpoint-kernel/browser-workspace-equivalence.test.js'
      agent_role: 'Test Generation Agent'
      autonomy: 'review_after'
      risk: 'high'
      confidence: 75
    - id: task-004
      status: 'done'
      title: 'Write the flows test and the landing test (red)'
      depends_on: [task-002]
      produces:
        - 'src/test/javascript/viewpoint-kernel/browser-workspaces-flows.test.js'
        - 'src/test/javascript/viewpoint-kernel/browser-landing.test.js'
      agent_role: 'Test Generation Agent'
      autonomy: 'autonomous'
      risk: 'medium'
      confidence: 72
    - id: task-005
      status: 'done'
      title: 'Write the hosted-style page server, the fixtures and the e2e spec'
      depends_on: [task-001]
      produces:
        - 'src/test/e2e/harness.js'
        - 'src/test/e2e/fixtures.js'
        - 'src/test/e2e/browser-workspace.spec.js'
      agent_role: 'Test Generation Agent'
      autonomy: 'autonomous'
      risk: 'medium'
      confidence: 62
    - id: task-006
      status: 'done'
      title: 'Write persistence/browser-store.js and register it'
      depends_on: [task-003]
      produces:
        - 'src/main/editor/persistence/browser-store.js'
        - 'src/main/editor/layers.json'
        - 'src/main/editor/names.json'
        - 'src/main/resources/editor-webapp/standalone.html'
      agent_role: 'Frontend Implementation Agent'
      autonomy: 'review_after'
      risk: 'high'
      confidence: 75
    - id: task-007
      status: 'done'
      title: 'Write the state, the flows, the settings key and the save hook'
      depends_on: [task-004, task-006]
      produces:
        - 'src/main/editor/application/browser-workspaces.js'
        - 'src/main/editor/application/folder-session.js'
        - 'src/main/editor/model/app-state.js'
        - 'src/main/editor/model/settings.js'
        - 'src/main/editor/persistence/save.js'
        - 'src/main/editor/layers.json'
        - 'src/main/editor/names.json'
        - 'src/main/resources/editor-webapp/standalone.html'
      agent_role: 'Frontend Implementation Agent'
      autonomy: 'review_after'
      risk: 'high'
      confidence: 70
    - id: task-008
      status: 'done'
      title: 'Write the card, the bar, the help, the events, the bootstrap and the style'
      depends_on: [task-007]
      produces:
        - 'src/main/editor/presentation/landing.js'
        - 'src/main/editor/presentation/top-panel.js'
        - 'src/main/editor/presentation/help-and-settings.js'
        - 'src/main/editor/composition/events.js'
        - 'src/main/editor/composition/bootstrap.js'
        - 'src/main/editor/style.css'
        - 'src/main/resources/editor-webapp/standalone.html'
      agent_role: 'Frontend Implementation Agent'
      autonomy: 'autonomous'
      risk: 'medium'
      confidence: 70
    - id: task-009
      status: 'pending'
      title: 'Do the Chromium-only pass and write browser-apis.test.js'
      depends_on: [task-008]
      produces:
        - 'src/test/javascript/viewpoint-kernel/browser-apis.test.js'
        - 'run-0192-browser-workspace.md with the table of features'
      agent_role: 'QA Agent'
      autonomy: 'autonomous'
      risk: 'medium'
      confidence: 72
    - id: task-010
      status: 'pending'
      title: 'Run the e2e spec in Chromium and Firefox and fix what it finds'
      depends_on: [task-005, task-009]
      produces:
        - 'src/test/e2e/browser-workspace.spec.js passing in two browsers'
      agent_role: 'QA Agent'
      autonomy: 'autonomous'
      risk: 'medium'
      confidence: 65
    - id: task-011
      status: 'pending'
      title: 'Write the CLAUDE.md paragraph, run every gate, show the three mutations fail, record in the run document'
      depends_on: [task-010]
      produces:
        - 'CLAUDE.md'
        - 'run-0192-browser-workspace.md with the verification record'
      agent_role: 'QA Agent'
      autonomy: 'autonomous'
      risk: 'medium'
      confidence: 80
  edges:
    - from: task-001
      to: task-002
      reason: 'the harness option follows decision 9 of gap-001'
    - from: task-001
      to: task-005
      reason: 'the e2e fixtures follow decision 14 of gap-001'
    - from: task-002
      to: task-003
      reason: 'the store tests use withFile and the storage stub'
    - from: task-002
      to: task-004
      reason: 'the flows tests count persist calls through the stub'
    - from: task-003
      to: task-006
      reason: 'the contract is written as tests before the store'
    - from: task-004
      to: task-007
      reason: 'the flows are written against their tests'
    - from: task-006
      to: task-007
      reason: 'the flows call the store'
    - from: task-007
      to: task-008
      reason: 'the card, events and bootstrap call the flows and the state'
    - from: task-008
      to: task-009
      reason: 'the guard test scans the finished sources and the pass reads the finished card and styles'
    - from: task-005
      to: task-010
      reason: 'the spec exists before it is run'
    - from: task-009
      to: task-010
      reason: 'the page is final before the browsers run it'
    - from: task-010
      to: task-011
      reason: 'the gates and mutations run on the finished work'
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
          - 'Summary, Scope, DEC-2, DEC-4 to DEC-8, DEC-10, DEC-11, IMP-1 to IMP-8, CTR-1, CTR-3, CTR-4, FLOW-1, Observability and Verification, and the Findings of prg-0192-browser-workspace.md'
      outputs:
        - 'tdd-0192-browser-workspace.md edited so that every decision of gap-001 (1 to 18) is in its text once, in the section that owns it; status stays draft; the new IMP for model/settings.js is added'
      verification:
        - 'grep -c "landingNameDraft" in the TDD gives at least 2 and grep -c "landingRenaming" gives 0'
        - 'grep -c "canKeepWorkspace" in the TDD gives at least 2'
        - 'grep -c "model/settings.js" in the TDD gives at least 1 and grep -c "bw:" gives at least 1'
        - 'grep -c "browserStorageAsked" in the TDD gives at least 1 and grep -c "memFolder" gives at least 2'
        - 'grep -c "toSorted" in the TDD gives 0, grep -c "not in Safari 15" gives 0, grep -c "Chromium-only APIs of the page" gives 0'
        - 'grep -c "Buffer.compare" in the TDD gives at least 1'
      risk: 'low'
      confidence: 88
      human_review: 'none'
      escalation_triggers:
        - 'a decision of gap-001 contradicts a passage of the TDD that this task cannot reconcile in a sentence: decide in the TDD, log the decision in the prg'
      delegation_tier: 'standard'
      results: 'tier standard, model sonnet, effort medium, profile low-cost, passed first time, inline (leaf), independently verified'
    - id: task-002
      title: 'Extend the node harness with withFile and a navigator.storage stub'
      source_requirements:
        prd: []
        tdd:
          - 'DEC-11, CON-8, CON-9, Observability and Verification, decision 9 of gap-001'
      outputs:
        - 'harness.js: createApp accepts withFile true, which puts the host File (the sandbox has Blob already) and a navigator object with storage.persist and storage.persisted in the sandbox; persist is a function the test may pass, by default a function that counts its calls and resolves true; the count is reachable from the test; nothing else in the sandbox changes when the option is absent'
      verification:
        - 'node --test src/test/javascript/viewpoint-kernel/folders.test.js src/test/javascript/viewpoint-kernel/server-mode.test.js exits 0 (the harness is unchanged for them)'
        - 'npx prettier --check src/test/javascript/viewpoint-kernel/harness.js exits 0'
        - 'npm run lint exits 0'
      risk: 'low'
      confidence: 90
      human_review: 'none'
      escalation_triggers:
        - 'adding the option changes the behaviour of an existing test'
      delegation_tier: 'standard'
      results: 'tier standard, model sonnet, effort medium, profile low-cost, passed first time, inline (leaf), independently verified'
    - id: task-003
      title: 'Write the store tests and the equivalence test (red)'
      source_requirements:
        prd: []
        tdd:
          - 'REQ-1, REQ-6, REQ-7, REQ-9, TG-1, TG-2, ASM-2, ASM-5, DEC-1 to DEC-3, DEC-6, CTR-1, CTR-2, Observability and Verification (browser-store.test.js and browser-workspace-equivalence.test.js), decisions 4, 5, 6, 8 and 9 of gap-001'
      outputs:
        - 'src/test/javascript/viewpoint-kernel/browser-store.test.js: the handle contract of CTR-1 against fakeIndexedDB (a nested tree listed, a missing file and directory NotFoundError, an empty file created then read, a string / Blob / ArrayBuffer / write-object written in several parts, a BOM and CRLF read back by hash, modified strictly increasing across two writes in one tick, a rewrite replaces, getFileHandle create on an existing file leaves bytes and modified untouched, removeEntry of a file / a missing name / a directory, the last file removed makes its directory absent, two workspaces do not see each other, a failPut quota failure leaves the old bytes and rejects close() with the browser name and message, a write, a create and a read after the workspace was deleted refused with the DEC-6 sentence and the fake records compared before and after, createBrowserWorkspace atomic when the third put fails, two interleaved creates of one name with one failing, a rename to a taken name refused inside the transaction, deleteBrowserWorkspace removing the record, every file and the pointer and no other key, the records of the first database untouched through dump, the error raised inside a transaction callback coming out with its name and message, stored bytes not aliased to the array the caller passed, listBrowserWorkspaces returning the file count and the last change, markBrowserExport setting lastExportAt and leaving the files and the other records alone, the name rule of decision 5 (trimmed, 81 characters, a control character, a name taken without case) refused by createBrowserWorkspace and renameBrowserWorkspace with its sentence)'
        - 'src/test/javascript/viewpoint-kernel/browser-workspace-equivalence.test.js: for the Brightcart layered fixture and two shipped examples, the same files in a memFolder and in a browser workspace give the same file list, texts and bom flags through loadWorkspace, the same edit through saveAllChanges writes the same bytes in both (hash and changed lines), a file whose first character is a BOM keeps it'
      verification:
        - 'npm run editor:build then node --test src/test/javascript/viewpoint-kernel/browser-store.test.js src/test/javascript/viewpoint-kernel/browser-workspace-equivalence.test.js runs and fails because the name is missing from the page (a not-a-function error naming a browser store function), not because of a syntax error in the tests'
        - 'the tests contain no deepStrictEqual, no instanceof and no printed byte list on page bytes: grep -c "deepStrictEqual" on the two files gives 0 for any call whose argument is page bytes'
        - 'npx prettier --check on the two files exits 0 and npm run lint exits 0'
      risk: 'high'
      confidence: 75
      human_review: 'after'
      escalation_triggers:
        - 'a case cannot be expressed against the fake (a key range, an index, a cursor, two stores in a transaction): change the case, never the fake, and log it'
        - 'the vm harness cannot load a part that is not yet in the page, so the red state cannot be shown'
        - 'an assertion would print a byte array'
      delegation_tier: 'hard_judgment'
      results: 'tier hard_judgment, model sonnet, effort high, profile low-cost, passed first time, inline (leaf), independently verified'
    - id: task-004
      title: 'Write the flows test and the landing test (red)'
      source_requirements:
        prd: []
        tdd:
          - 'REQ-2, REQ-3, REQ-4, REQ-6, REQ-7, TG-3 to TG-5, DEC-4, DEC-5, DEC-7, DEC-8, DEC-9, IF-1 to IF-6, CTR-3, CTR-4, FLOW-1 to FLOW-4, Security and Privacy, decisions 1, 2, 3, 10 and 12 of gap-001'
      outputs:
        - 'src/test/javascript/viewpoint-kernel/browser-workspaces-flows.test.js, no card drawn and no key handler (the flow functions are called directly): create (default names Untitled workspace, Untitled workspace 2, a taken name compared trimmed and without case, empty, 81 characters, a control character, an img onerror name stored as text, the problem sentence kept in landingNameDraft), open (sets AppState.folder with browserWorkspace and permissionState granted), rename, the delete flow (askToDeleteBrowserWorkspace sets landingPendingDelete and the focus selector of Cancel, cancel changes nothing, confirm removes the record, its files and last and nothing else), a reload with a second createApp on the same fake database finds the saved change and not an unsaved one, DEC-5 for each combination of the two pointers including a pointer to a deleted workspace and a legacy folder, closeFolder of a browser workspace keeps its data, clears only last and reads the browser list again, persist is called once after the first successful save and never for a folder workspace or a failed save, a persist that never settles does not block, retryFolder, noteWorkspaceName and showRememberedFolders do nothing wrong when AppState.folder.id is null for a browser workspace, the remembered plateau and compare choice of two workspaces that share a name do not share a key, landingNameDraft keeps the typed text and the refusal sentence across requestRedraw and is cleared by resetUiState'
        - 'src/test/javascript/viewpoint-kernel/browser-landing.test.js, the cases that read the drawn card or go through the click and key handlers: with showDirectoryPicker absent and the store ready landingScreenConfig is first-launch, its text and note contain neither Firefox and Safari nor File System Access, its actions are New workspace in this browser only; with the picker both actions; the unsupported text only when neither is available and the reason for a failOpen store; an unknown store state is the busy card, never unsupported; isFolderAccessAvailable stays false without a picker; a picker-capable page whose store failed still offers folders; the served page (serverToken) is unchanged and has no browser list; the rows (name, file count, Kept in this browser, Last exported: never, Open, Rename and Delete each named with the workspace), the delete question (names the workspace and its file count, focus on Cancel, Escape and Cancel change nothing, Delete removes, the question names the row clicked when two names differ by case), the name field kept across a redraw, the row of a record that cannot be read with only Delete working, the error card of a browser workspace with Back to the list, the In this browser notice and the Close workspace label, the 360 px layout, and the escaping of a workspace name in text and in attributes'
      verification:
        - 'npm run editor:build then node --test on the two files runs and fails because a browser workspace function or state is missing from the page, not because of a syntax error; the flows file draws no card (it passes at the end of task-007, the landing file at the end of task-008)'
        - 'the tests assert strings, lengths and hashes only (no printed byte array)'
        - 'npx prettier --check on the two files exits 0 and npm run lint exits 0'
      risk: 'medium'
      confidence: 72
      human_review: 'none'
      escalation_triggers:
        - 'the harness cannot drive a click on a data-action of the landing card'
        - 'a case needs a decision the TDD does not take'
      delegation_tier: 'standard'
      results: 'tier standard, model sonnet, effort medium, profile low-cost, passed first time, inline (leaf), independently verified'
    - id: task-005
      title: 'Write the hosted-style page server, the fixtures and the e2e spec'
      source_requirements:
        prd: []
        tdd:
          - 'REQ-6, TG-4, TG-6, DEC-5, DEC-10, DEC-11, IMP-9, Observability and Verification (the e2e spec), Q-1, ASM-4, RISK-7, decision 14 of gap-001'
      outputs:
        - 'src/test/e2e/harness.js: startHostedPage() starts a Node http server on 127.0.0.1 and a free port that answers GET / with the committed standalone.html and 404 for the rest, returns its URL and a stop function'
        - 'src/test/e2e/fixtures.js: a hosted fixture that starts it and stops it when the test ends, and pageErrors lists hosted among its parameters as it lists serve'
        - 'src/test/e2e/browser-workspace.spec.js: the flow of the Verification section (first-launch card with New workspace in this browser, Open workspace folder in chromium and not in firefox, no Firefox and Safari sentence in firefox; create e2e-browser; the editor opens; a second workspace seeded from the CORNER_SHOP files through page.evaluate of createBrowserWorkspace; edit a name and a description; Save all changes; Saved.; reload; the workspace reopens with the change; the stored manifests/shop.yaml read back through the handle with two changed lines and the rest as written; Close workspace; the card lists both; rename; delete with Cancel first then Delete; reload shows the remaining one only), not depending on the answer of navigator.storage.persist and not trying to grant it'
      verification:
        - 'node --check src/test/e2e/harness.js src/test/e2e/fixtures.js src/test/e2e/browser-workspace.spec.js exits 0'
        - 'npx playwright test --list browser-workspace shows the spec in the chromium and firefox projects'
        - 'npx prettier --check on the three files exits 0 and npm run lint exits 0'
      risk: 'medium'
      confidence: 62
      human_review: 'none'
      escalation_triggers:
        - 'a selector depends on markup that task-008 has not fixed: use the data-action names of IMP-5 and the accessible names of IF-3'
      delegation_tier: 'standard'
      results: 'tier standard, model sonnet, effort medium, profile low-cost, passed first time, inline (leaf), independently verified'
    - id: task-006
      title: 'Write persistence/browser-store.js and register it'
      source_requirements:
        prd: []
        tdd:
          - 'REQ-1, REQ-3, REQ-7, REQ-9, TG-1, TG-2, DEC-1 to DEC-3, DEC-6, DEC-8 (askForPersistentStorage), DEC-9 (createBrowserWorkspace), DEC-12, IMP-1, CTR-1, CTR-2, CON-1 to CON-5, CON-9, decisions 4, 5, 8 and 9 of gap-001'
      outputs:
        - 'src/main/editor/persistence/browser-store.js: the database archicode-browser-workspaces version 1 with one store records; a transaction helper that rejects with the error that aborted it; browserDirectoryHandle and browserFileHandle with the members of ASM-5; probeBrowserStore, listBrowserWorkspaces, createBrowserWorkspace, renameBrowserWorkspace, deleteBrowserWorkspace, readBrowserLast, writeBrowserLast, clearBrowserLast, markBrowserExport, askForPersistentStorage (guarded by typeof navigator), and the name rule as one function with its sentences that createBrowserWorkspace and renameBrowserWorkspace run again inside their readwrite transaction (decision 5 of gap-001); no DOM, no render, no AppState flow; a write checks the workspace record in its own transaction and writes only whole files; bytes copied on write and on read'
        - 'src/main/editor/layers.json with the part listed as persistence after persistence/workspace-loading.js and before persistence/save.js; ratchet.max unchanged'
        - 'src/main/editor/names.json rewritten with node scripts/check-editor.mjs --write-names'
        - 'src/main/resources/editor-webapp/standalone.html rebuilt with npm run editor:build'
      verification:
        - 'grep for each new top-level name in src/main/editor/names.json before writing finds none (no collision)'
        - 'npx prettier --check src/main/editor/persistence/browser-store.js exits 0'
        - 'npm run editor:build then npm run editor:check exit 0 and ratchet.max in layers.json is at most 99'
        - 'node --test src/test/javascript/viewpoint-kernel/browser-store.test.js src/test/javascript/viewpoint-kernel/browser-workspace-equivalence.test.js exits 0'
        - 'node --test src/test/javascript/viewpoint-kernel/folders.test.js exits 0 (the first database is untouched)'
        - 'npm run lint exits 0 and wc -l of the new part is under 3000'
      risk: 'high'
      confidence: 75
      human_review: 'after'
      escalation_triggers:
        - 'the ratchet count rises above 99 or a name of a higher layer is needed'
        - 'a test of task-003 and the TDD disagree: decide in the TDD, change the TDD and the test together, log it'
        - 'a write could leave a partial file or write into a deleted workspace'
      delegation_tier: 'hard_judgment'
      results: 'tier hard_judgment, model sonnet, effort high, profile low-cost, passed first time, inline (leaf), independently verified'
    - id: task-007
      title: 'Write the state, the flows, the settings key and the save hook'
      source_requirements:
        prd: []
        tdd:
          - 'REQ-2, REQ-3, REQ-6, REQ-7, TG-3 to TG-5, DEC-5, DEC-7, DEC-8, DEC-9, DEC-12, IMP-2, IMP-6, IMP-7, the IMP for model/settings.js, CTR-4, FLOW-1 to FLOW-4, IF-4, IF-6, decisions 1, 2, 3, 10 and 12 of gap-001'
      outputs:
        - 'src/main/editor/application/browser-workspaces.js: newBrowserWorkspace, openBrowserWorkspace (record, last, AppState.folder with browserWorkspace and id null, permissionState granted, loadWorkspace), renameBrowserWorkspaceRow, askToDeleteBrowserWorkspace, confirmDeleteBrowserWorkspace, cancelBrowserWorkspaceQuestion, refreshBrowserWorkspaces; each sets landingBusy and landingNotice, redraws with requestRedraw and keeps focus with landingFocusSelector; a name rule shared by create and rename, checked inside the transaction'
        - 'src/main/editor/application/folder-session.js: tryAutoReopen chooses by DEC-5 and writes to one database only; closeFolder of a browser workspace clears the browser last, reads the browser list again and does not touch the remembered folders; resetUiState clears landingPendingDelete and landingNameDraft'
        - 'src/main/editor/model/app-state.js: browserWorkspaces, browserStoreState, browserStoragePersisted, browserStorageAsked, landingPendingDelete, landingNameDraft'
        - 'src/main/editor/model/settings.js: one key helper used by the three functions that read or write the remembered plateau, the compare choice and the per-folder flags'
        - 'src/main/editor/persistence/save.js: one call to askForPersistentStorage after a successful saveAllChanges of a browser workspace, once per page session, after the status is set'
        - 'layers.json (the application part right after application/folder-session.js), names.json (node scripts/check-editor.mjs --write-names) and the rebuilt page'
      verification:
        - 'npm run editor:build then npm run editor:check exit 0 and ratchet.max in layers.json is at most 99'
        - 'node --test src/test/javascript/viewpoint-kernel/browser-workspaces-flows.test.js exits 0'
        - 'node --test src/test/javascript/viewpoint-kernel/browser-store.test.js src/test/javascript/viewpoint-kernel/browser-workspace-equivalence.test.js src/test/javascript/viewpoint-kernel/folders.test.js src/test/javascript/viewpoint-kernel/faithful-saves.test.js exits 0'
        - 'git diff on src/main/editor/persistence/save.js shows one added call and no other changed line'
        - 'npm run lint exits 0 and npx prettier --check on every file this task writes exits 0'
      risk: 'high'
      confidence: 70
      human_review: 'after'
      escalation_triggers:
        - 'the folder path (openFolder, openRememberedFolder, forgetFolder, retryFolder) changes behaviour: the picker path and the served path must not change'
        - 'a flow writes to both databases'
        - 'the ratchet count rises above 99'
        - 'a deletion could run without the question or on the wrong row'
      delegation_tier: 'hard_judgment'
      results: 'tier hard_judgment, model sonnet, effort high, profile low-cost, passed first time, inline (leaf), independently verified'
    - id: task-008
      title: 'Write the card, the bar, the help, the events, the bootstrap and the style'
      source_requirements:
        prd: []
        tdd:
          - 'REQ-2, REQ-3, REQ-4, TG-3, TG-6, DEC-4, DEC-7, DEC-8, IMP-3, IMP-4, IMP-5, CTR-3, CTR-5, IF-1 to IF-6, FLOW-1, decisions 2, 3 and 11 of gap-001'
      outputs:
        - 'src/main/editor/presentation/landing.js: canKeepWorkspace, landingScreenConfig with the unsupported card only as DEC-4 says, the busy card for an unknown store state, browserRows derived from state, the inline name field with Create and Cancel (Enter creates, Escape cancels, a refused name is a sentence and keeps the text), the row with Open, Rename and Delete each named with the workspace, the delete question with focus on Cancel and Delete not the default of Enter, the error card with Back to the list; sentences exactly as DEC-8 words them'
        - 'src/main/editor/presentation/top-panel.js and help-and-settings.js: the In this browser notice and its title, Close workspace, the help note naming the browser'
        - 'src/main/editor/composition/events.js: the data-action values new-browser-workspace, open-browser-workspace, rename-browser-workspace, ask-delete-browser-workspace, delete-browser-workspace, cancel-browser-workspace-question'
        - 'src/main/editor/composition/bootstrap.js: the served branch first and unchanged; an awaited probeBrowserStore before tryAutoReopen; stop on the unsupported card only when no folder can be picked and no store is ready'
        - 'src/main/editor/style.css: the few rules for the new rows, reusing the landing-folder classes'
        - 'the rebuilt page, with names.json and layers.json checked'
      verification:
        - 'npm run editor:build then npm run editor:check exit 0 and ratchet.max in layers.json is at most 99'
        - 'node --test src/test/javascript/viewpoint-kernel/browser-landing.test.js src/test/javascript/viewpoint-kernel/browser-workspaces-flows.test.js exits 0'
        - 'node --test src/test/javascript/viewpoint-kernel/folders.test.js src/test/javascript/viewpoint-kernel/editor-at-360-px.test.js src/test/javascript/viewpoint-kernel/editor-structure.test.js src/test/javascript/viewpoint-kernel/editor-odds-and-ends.test.js exits 0'
        - 'npm run lint exits 0 and npx prettier --check on every .js file this task writes exits 0; style.css is not in the format scripts of package.json and fails prettier --check before this run, so it is not reformatted and not checked (the rules added follow the layout of the file)'
      risk: 'medium'
      confidence: 70
      human_review: 'none'
      escalation_triggers:
        - 'the 360 px test fails and the fix would change an existing layout rule'
        - 'an existing landing test needs editing: stop, the card keys of the old kinds must stay'
      delegation_tier: 'standard'
    - id: task-009
      title: 'Do the Chromium-only pass and write browser-apis.test.js'
      source_requirements:
        prd: []
        tdd:
          - 'REQ-5, TG-6, ASM-7, DEC-10, IMP-8, Observability and Verification (browser-apis.test.js), decision 7 and 16 of gap-001'
      outputs:
        - 'run-0192-browser-workspace.md: a Chromium-only pass section with a table of every feature in src/main/editor scripts, CSS and markup that is not in all of Chromium, Firefox and Safari, with the first release that has it and what the page does where it is missing, marking C-UNCHECKED any release number not confirmed against MDN browser-compat-data'
        - 'src/test/javascript/viewpoint-kernel/browser-apis.test.js: a script deny list and a stylesheet deny list derived from the rule first released after the floor of ASM-7, each entry with a one-line reason; showDirectoryPicker only in persistence/folder-access.js and behind typeof'
        - 'a fix in the editor sources for any use the pass finds that has no guard or fallback, with the page rebuilt'
      verification:
        - 'node --test src/test/javascript/viewpoint-kernel/browser-apis.test.js exits 0'
        - 'a scratch copy of one editor source with a denied name added makes the test fail (run once, record the output, restore, the source file unchanged)'
        - 'if a source was changed: npm run editor:build then npm run editor:check exit 0 and the ratchet is at most 99, and npm run test:unit exits 0'
        - 'npx prettier --check on the test exits 0 and npm run lint exits 0'
      risk: 'medium'
      confidence: 72
      human_review: 'none'
      escalation_triggers:
        - 'a feature blocks Firefox or Safari and the fix changes an existing behaviour of the page: log it as a finding and fix it in the smallest way'
        - 'MDN data cannot be reached: keep only names known to be after the floor, mark the rest C-UNCHECKED, continue'
      delegation_tier: 'standard'
    - id: task-010
      title: 'Run the e2e spec in Chromium and Firefox and fix what it finds'
      source_requirements:
        prd: []
        tdd:
          - 'REQ-6, TG-4, TG-7, DEC-11, IMP-9, ASM-4, RISK-7, Q-1, Observability and Verification (the e2e spec)'
      outputs:
        - 'src/test/e2e/browser-workspace.spec.js passing in the chromium and firefox projects with no console error; any fix it needs in the spec or the page (the page rebuilt)'
      verification:
        - 'npm run editor:build then npx playwright test browser-workspace.spec.js exits 0 with both projects listed as passed'
        - 'with JAVA_HOME naming JDK 25, ./mvnw package -Dmaven.test.skip -Dplugin.asciidoctor.skip=true then npm run test:e2e exits 0 for the whole suite, so the existing specs of the served page pass on the new page (REQ-8); if the JDK or the jar cannot be had, log the blocker and say that only the new spec ran'
        - 'npx prettier --check src/test/e2e/browser-workspace.spec.js exits 0 and npm run lint exits 0'
      risk: 'medium'
      confidence: 65
      human_review: 'none'
      escalation_triggers:
        - 'a browser is not installed: log the blocker (installing is a download that needs the owner), do not work around it'
        - 'a failure appears only in Firefox: find the cause, never add a retry or a wait to hide it'
        - 'the spec needs the answer of navigator.storage.persist'
      delegation_tier: 'standard'
    - id: task-011
      title: 'Write the CLAUDE.md paragraph, run every gate, show the three mutations fail, record in the run document'
      source_requirements:
        prd: []
        tdd:
          - 'REQ-5 to REQ-8, TG-7, IMP-11, Observability and Verification (mutation checks and commands), Deployment and Rollout'
      outputs:
        - 'CLAUDE.md: one paragraph in the existing style on the browser workspace (the database, the keys, the handle, the pointer rule, the delete rule, the support floor, browser-apis.test.js, the hosted-style e2e harness)'
        - 'run-0192-browser-workspace.md: a Verification section with each command and its result, the three mutations with their output and restoration, the statement that ./mvnw verify and scripts/byte-identity.sh are the wave gate and were not run because no Java file and no command-line behaviour changed, and the notes for the wave owner (likely_paths of W-4 differ from the files changed: composition/bootstrap.js, composition/events.js, model/app-state.js, model/settings.js, application/browser-workspaces.js added, package.json not touched)'
      verification:
        - 'npm run test:unit exits 0'
        - 'npm run test:coverage exits 0 and git diff scripts/editor-coverage-floor.json is empty (no floor lowered)'
        - 'npm run lint exits 0 and npm run format:check exits 0'
        - 'npm run editor:check exits 0 and ratchet.max in layers.json is not above 99'
        - 'wc -l of every file under src/main/editor/persistence, application, presentation and composition is under 3000'
        - 'with the workspace-record check of DEC-6 removed from browser-store.js and npm run editor:build run, the DEC-6 test fails; with the max(Date.now(), previous + 1) of modified dropped, the monotonic test fails; with close() writing before it checks, the quota test fails; after each, the part is restored and npm run editor:check exits 0 and a diff of browser-store.js against its saved copy is empty'
        - 'grep -c "browser workspace" CLAUDE.md gives at least 1 and npx prettier --check is not needed for CLAUDE.md'
      risk: 'medium'
      confidence: 80
      human_review: 'none'
      escalation_triggers:
        - 'a coverage floor would have to be lowered: add cases, never lower a floor'
        - 'a mutation does not make its test fail: the test is too weak, strengthen it and log it'
      delegation_tier: 'standard'
```

## 5. Parallelization Plan

```yaml
parallelization_plan:
  groups:
    - id: parallel-group-001
      tasks:
        - task-003
        - task-004
        - task-005
      reason: 'Three test-writing tasks with disjoint files: the store and equivalence tests, the flows and landing tests, the e2e harness, fixtures and spec. They depend on the harness option (task-002) or on the TDD (task-001) only and none edits layers.json, names.json, the page or src/main/editor.'
      conflict_risks:
        - 'tasks 003 and 004 both read harness.js, which task-002 finished; neither edits it, and a helper shared by both goes in its own file, not in harness.js'
        - 'tasks 003 and 004 call names that are not in the page yet; each stays red for the right reason'
        - 'the page and the name lists are shared by tasks 006 to 009, which therefore run one after another'
```

## 6. Human Review Gates

```yaml
human_review_gates:
  gates:
    - id: gate-001
      trigger: 'The three tasks that carry the loss-of-work paths are done: the store tests (003), the store (006) and the flows (007).'
      required_before: []
      required_after: ['task-003', 'task-006', 'task-007']
      reviewer_focus:
        - 'a failed or refused write leaves the old bytes (DEC-3) and a workspace that was deleted is never written to (DEC-6)'
        - 'the delete is confirmed by name with the file count, focus on Cancel, one transaction removes the record, its files and the pointer (DEC-7)'
        - 'no flow writes to both databases and the first database and the folder path are untouched (DEC-5, CON-4, RISK-4)'
        - 'what reopens on load follows the larger openedAt of the two pointers'
```

This run operates under the autonomy override of complete-run (per explicit user instruction, the human-review tiers of the default autonomy policy do not stop it by category alone). The gate above is therefore a review after the work, not a stop: the three tasks are `review_after`, their independent verifier runs at the elevated pair of the profile, and the verified diff is what a human sees at the end of the wave. The wave's own gate P2 comes after W-5 and W-6, not here.

## 7. Risk Assessment

```yaml
risk_assessment:
  by_task:
    - id: task-001
      risk: 'low'
      rationale: 'A document edit checked by greps.'
    - id: task-002
      risk: 'low'
      rationale: 'An option that is off unless asked; the existing tests are the guard.'
    - id: task-003
      risk: 'high'
      rationale: 'These tests are the only proof that a visitor''s work survives a refused write, a deleted workspace and a half-created one; a weak case lets a loss through.'
    - id: task-004
      risk: 'medium'
      rationale: 'Tests of flows and the card; a missing case weakens the delete question and the pointer rule, but the store tests hold the data safety.'
    - id: task-005
      risk: 'medium'
      rationale: 'A new e2e harness and a spec in two browsers; flakiness is the risk, with one worker and no retry.'
    - id: task-006
      risk: 'high'
      rationale: 'New persistence code that stores, overwrites and deletes a visitor''s files; the page is generated and shared by every editor test; the ratchet is at its maximum.'
    - id: task-007
      risk: 'high'
      rationale: 'The delete flow, the choice of what reopens, and edits to folder-session.js and save.js that the folder path shares.'
    - id: task-008
      risk: 'medium'
      rationale: 'The card and the bootstrap are on every start of the hosted editor; the served path is first and must not change.'
    - id: task-009
      risk: 'medium'
      rationale: 'A fix found by the pass touches existing code; the guard test is cheap.'
    - id: task-010
      risk: 'medium'
      rationale: 'Real browsers; the Firefox persist prompt and timing are the unknowns (Q-1 measured them).'
    - id: task-011
      risk: 'medium'
      rationale: 'It edits the store on purpose for the mutations; the restoration is checked by a diff.'
  by_area:
    - area: 'data'
      risk: 'high'
      rationale: 'The store holds work that exists nowhere else until W-5 adds Export; browser eviction and cleared site data cannot be prevented by the page (RISK-1).'
    - area: 'ui'
      risk: 'medium'
      rationale: 'The card replaces the unsupported card and gains a delete question; the 360 px layout and the accessible names must hold.'
    - area: 'security'
      risk: 'low'
      rationale: 'Nothing leaves the browser; workspace names are escaped in text and attributes (a test with an img onerror name); stored paths are keys, never file system paths.'
    - area: 'infra'
      risk: 'low'
      rationale: 'No Java, pom or workflow change; the jar embeds the generated page and the wave gate runs ./mvnw verify.'
    - area: 'docs'
      risk: 'low'
      rationale: 'One paragraph of CLAUDE.md; the manual and the support statement are W-6''s.'
```

## 8. Confidence Assessment

```yaml
confidence_assessment:
  by_task:
    - id: task-001
      score: 88
      rationale: 'The decisions are listed one by one in gap-001 with the passages they change.'
    - id: task-002
      score: 90
      rationale: 'The harness already has the pattern (serverToken gives File); the option is small.'
    - id: task-003
      score: 75
      rationale: 'Many cases against a fake that has no ranges or indexes; the cross-realm bytes and the memory lesson of run 0191 need care.'
    - id: task-004
      score: 72
      rationale: 'The harness must drive clicks on the card and a reload with a second app on the same fake; the card is not written yet.'
    - id: task-005
      score: 62
      rationale: 'A spec written before the card exists, in two browsers; selectors come from the TDD names and may need a round in task-010.'
    - id: task-006
      score: 75
      rationale: 'About 400 lines against a precise contract and a tests-first red state; the transaction semantics of the fake and of real browsers must agree.'
    - id: task-007
      score: 70
      rationale: 'Several files that the folder path shares; the ratchet leaves no room for an upward name.'
    - id: task-008
      score: 70
      rationale: 'Markup, events and a bootstrap change; the existing landing and 360 px tests are the safety net.'
    - id: task-009
      score: 72
      rationale: 'The pass is a reading task; the release numbers depend on reaching MDN data.'
    - id: task-010
      score: 65
      rationale: 'Real browsers can differ from the node suite; Firefox is the likely source of a surprise.'
    - id: task-011
      score: 80
      rationale: 'Every check is a command; the coverage run takes minutes but is deterministic.'
```

## 9. Agent Assignment Plan

```yaml
agent_assignment_plan:
  assignments:
    - task_id: task-001
      agent_role: 'Documentation Agent'
      objective: 'Write the eighteen decisions of gap-001 into the TDD without changing its structure or its status.'
      context:
        prd_excerpts: []
        tdd_excerpts:
          - 'the sections named in the task and the Findings of prg-0192-browser-workspace.md'
      likely_files:
        - 'docs/wav/wav-025-hosted-editor/run/run-0192-browser-workspace/tdd-0192-browser-workspace.md'
        - 'docs/wav/wav-025-hosted-editor/run/run-0192-browser-workspace/prg-0192-browser-workspace.md'
      acceptance_criteria:
        - 'each decision is in the text once, in the section that owns it'
        - 'the TDD status is still draft and Q-1 and Q-2 are still resolved'
      verification:
        - 'the greps of the task'
      escalation_triggers:
        - 'a contradiction that needs a new decision'
      suggested_subagent_type: 'general-purpose'
      suggested_model: '(default)'
      suggested_effort: 'medium'
    - task_id: task-002
      agent_role: 'Test Generation Agent'
      objective: 'Give the node harness the host File and a counting navigator.storage stub behind withFile.'
      context:
        prd_excerpts: []
        tdd_excerpts:
          - 'DEC-11, CON-8, CON-9, decision 9 of gap-001'
      likely_files:
        - 'src/test/javascript/viewpoint-kernel/harness.js'
        - 'src/test/javascript/viewpoint-kernel/mem-folder.js'
      acceptance_criteria:
        - 'withFile off changes nothing for any existing test'
        - 'the persist call count is readable by a test'
      verification:
        - 'the commands of the task'
      escalation_triggers:
        - 'an existing test changes behaviour'
      suggested_subagent_type: 'general-purpose'
      suggested_model: '(default)'
      suggested_effort: 'low'
    - task_id: task-003
      agent_role: 'Test Generation Agent'
      objective: 'Write the contract of the handle, the records and the safeguards as tests that fail until the store exists.'
      context:
        prd_excerpts: []
        tdd_excerpts:
          - 'CTR-1, CTR-2, DEC-1 to DEC-3, DEC-6, the verification entries for browser-store.test.js and browser-workspace-equivalence.test.js as revised by task-001'
      likely_files:
        - 'src/test/javascript/viewpoint-kernel/browser-store.test.js'
        - 'src/test/javascript/viewpoint-kernel/browser-workspace-equivalence.test.js'
        - 'src/test/javascript/viewpoint-kernel/harness.js (fakeIndexedDB options seed, dump, failOpen, failPut, holdCommit)'
        - 'src/test/javascript/viewpoint-kernel/mem-folder.js'
        - 'src/test/javascript/viewpoint-kernel/folders.test.js (a model for the fake)'
      acceptance_criteria:
        - 'every case family of the task output list is present'
        - 'the tests fail for the right reason: a missing function, not a syntax error'
        - 'no assertion can print a byte array'
      verification:
        - 'the commands of the task'
      escalation_triggers:
        - 'a case needs a fake feature the harness lacks'
        - 'the red state cannot be shown'
      suggested_subagent_type: 'general-purpose'
      suggested_model: '(default)'
      suggested_effort: 'high'
    - task_id: task-004
      agent_role: 'Test Generation Agent'
      objective: 'Write the tests of the flows and of the card that fail until the flows, the state and the card exist.'
      context:
        prd_excerpts: []
        tdd_excerpts:
          - 'IF-1 to IF-6, CTR-3, CTR-4, FLOW-1 to FLOW-4, DEC-4, DEC-5, DEC-7, DEC-8 as revised by task-001'
      likely_files:
        - 'src/test/javascript/viewpoint-kernel/browser-workspaces-flows.test.js'
        - 'src/test/javascript/viewpoint-kernel/browser-landing.test.js'
        - 'src/test/javascript/viewpoint-kernel/folders.test.js (a model for the landing and the reload)'
        - 'src/test/javascript/viewpoint-kernel/server-mode.test.js'
        - 'src/test/javascript/viewpoint-kernel/editor-at-360-px.test.js'
      acceptance_criteria:
        - 'every case family of the task output list is present'
        - 'the tests fail for the right reason: a missing function or state'
      verification:
        - 'the commands of the task'
      escalation_triggers:
        - 'the harness cannot drive the landing card'
      suggested_subagent_type: 'general-purpose'
      suggested_model: '(default)'
      suggested_effort: 'medium'
    - task_id: task-005
      agent_role: 'Test Generation Agent'
      objective: 'Write the page server with no JVM, the fixtures in the order of run 0181, and the spec of the Verification section.'
      context:
        prd_excerpts: []
        tdd_excerpts:
          - 'DEC-11, Observability and Verification (the e2e spec), Q-1, ASM-4'
      likely_files:
        - 'src/test/e2e/harness.js'
        - 'src/test/e2e/fixtures.js'
        - 'src/test/e2e/browser-workspace.spec.js'
        - 'src/test/e2e/workspace.js'
        - 'playwright.config.js'
      acceptance_criteria:
        - 'the spec is listed in the chromium and firefox projects'
        - 'hosted is a parameter of pageErrors'
      verification:
        - 'the commands of the task'
      escalation_triggers:
        - 'a selector needs markup that is not named in the TDD'
      suggested_subagent_type: 'general-purpose'
      suggested_model: '(default)'
      suggested_effort: 'medium'
    - task_id: task-006
      agent_role: 'Frontend Implementation Agent'
      objective: 'Write the store and the handle so that the tests of task-003 pass, register the part, rebuild the page.'
      context:
        prd_excerpts: []
        tdd_excerpts:
          - 'Proposed Design, DEC-1 to DEC-3, DEC-6, DEC-9, DEC-12, CTR-1, CTR-2 as revised'
      likely_files:
        - 'src/main/editor/persistence/browser-store.js'
        - 'src/main/editor/layers.json'
        - 'src/main/editor/names.json'
        - 'src/main/editor/persistence/remembered-folders.js (the transaction pattern withArchicodeStore)'
        - 'src/main/editor/persistence/workspace-loading.js (WORKSPACE_FILE_NAME, readTextAndMark)'
      acceptance_criteria:
        - 'the store and equivalence tests pass'
        - 'editor:check passes with ratchet.max at most 99'
        - 'the part is pure: no DOM, no render, no name of a layer above persistence'
        - 'the first database is not opened or changed'
      verification:
        - 'the commands of the task'
      escalation_triggers:
        - 'the ratchet rises'
        - 'a case and the TDD disagree'
      suggested_subagent_type: 'general-purpose'
      suggested_model: '(default)'
      suggested_effort: 'high'
    - task_id: task-007
      agent_role: 'Frontend Implementation Agent'
      objective: 'Write the state, the flows, the settings key helper, the pointer choice and the save hook so that the flows tests pass and the folder path is as it was.'
      context:
        prd_excerpts: []
        tdd_excerpts:
          - 'IMP-2, IMP-6, IMP-7, CTR-4, FLOW-1 to FLOW-4, DEC-5, DEC-7, DEC-8 as revised'
      likely_files:
        - 'src/main/editor/application/browser-workspaces.js'
        - 'src/main/editor/application/folder-session.js'
        - 'src/main/editor/model/app-state.js'
        - 'src/main/editor/model/settings.js'
        - 'src/main/editor/persistence/save.js'
        - 'src/main/editor/layers.json'
        - 'src/main/editor/names.json'
      acceptance_criteria:
        - 'the flows tests pass and the folder tests pass unchanged'
        - 'the save.js diff is one call'
        - 'editor:check passes with ratchet.max at most 99'
        - 'no flow writes to both databases'
      verification:
        - 'the commands of the task'
      escalation_triggers:
        - 'the folder path changes behaviour'
        - 'the ratchet rises'
      suggested_subagent_type: 'general-purpose'
      suggested_model: '(default)'
      suggested_effort: 'high'
    - task_id: task-008
      agent_role: 'Frontend Implementation Agent'
      objective: 'Draw the card, the notice, the delete question and the name field, wire the events and the bootstrap, and add the few style rules.'
      context:
        prd_excerpts: []
        tdd_excerpts:
          - 'IF-1 to IF-6, CTR-3, DEC-4, DEC-7, DEC-8, IMP-3, IMP-4, IMP-5, FLOW-1'
      likely_files:
        - 'src/main/editor/presentation/landing.js'
        - 'src/main/editor/presentation/top-panel.js'
        - 'src/main/editor/presentation/help-and-settings.js'
        - 'src/main/editor/composition/events.js'
        - 'src/main/editor/composition/bootstrap.js'
        - 'src/main/editor/style.css'
      acceptance_criteria:
        - 'the landing and flows tests pass'
        - 'the existing landing, 360 px, structure and odds-and-ends tests pass unchanged'
        - 'the served branch of the bootstrap is first and unchanged'
      verification:
        - 'the commands of the task'
      escalation_triggers:
        - 'an existing landing test needs editing'
      suggested_subagent_type: 'general-purpose'
      suggested_model: '(default)'
      suggested_effort: 'medium'
    - task_id: task-009
      agent_role: 'QA Agent'
      objective: 'List every feature of the page that is not in all three browsers with its first release and its fallback, guard the list with a test, and fix any use that has none.'
      context:
        prd_excerpts: []
        tdd_excerpts:
          - 'DEC-10, ASM-7, Observability and Verification (browser-apis.test.js) as revised'
      likely_files:
        - 'src/test/javascript/viewpoint-kernel/browser-apis.test.js'
        - 'src/main/editor/style.css'
        - 'src/main/editor/page.html'
        - 'docs/wav/wav-025-hosted-editor/run/run-0192-browser-workspace/run-0192-browser-workspace.md'
      acceptance_criteria:
        - 'the table is in the run document with a release number or C-UNCHECKED for each feature'
        - 'the test fails on a scratch copy with a denied name'
      verification:
        - 'the commands of the task'
      escalation_triggers:
        - 'a feature blocks Firefox or Safari and has no small fix'
      suggested_subagent_type: 'general-purpose'
      suggested_model: '(default)'
      suggested_effort: 'medium'
    - task_id: task-010
      agent_role: 'QA Agent'
      objective: 'Run the spec in the two browsers against the hosted-style server and make it pass without a retry or a wait that hides a flake.'
      context:
        prd_excerpts: []
        tdd_excerpts:
          - 'DEC-11, IMP-9, ASM-4, RISK-7, Q-1, Observability and Verification (the e2e spec)'
      likely_files:
        - 'src/test/e2e/browser-workspace.spec.js'
        - 'src/test/e2e/harness.js'
        - 'src/test/e2e/fixtures.js'
      acceptance_criteria:
        - 'both projects pass with no console error'
        - 'no retry and no fixed sleep is added'
      verification:
        - 'the commands of the task'
      escalation_triggers:
        - 'a browser is missing'
        - 'a failure only in Firefox'
      suggested_subagent_type: 'general-purpose'
      suggested_model: '(default)'
      suggested_effort: 'medium'
    - task_id: task-011
      agent_role: 'QA Agent'
      objective: 'Write the CLAUDE.md paragraph, run the gates, break the store three ways on purpose and show the tests fail, restore, record all of it.'
      context:
        prd_excerpts: []
        tdd_excerpts:
          - 'IMP-11, Observability and Verification, Deployment and Rollout'
      likely_files:
        - 'CLAUDE.md'
        - 'docs/wav/wav-025-hosted-editor/run/run-0192-browser-workspace/run-0192-browser-workspace.md'
        - 'src/main/editor/persistence/browser-store.js'
        - 'scripts/editor-coverage-floor.json'
      acceptance_criteria:
        - 'every command of the task exits 0 and the record lists each'
        - 'the store is byte for byte as before each mutation'
        - 'the run document carries the notes for the wave owner'
      verification:
        - 'the commands of the task'
      escalation_triggers:
        - 'a floor would be lowered'
        - 'a mutation passes'
      suggested_subagent_type: 'general-purpose'
      suggested_model: '(default)'
      suggested_effort: 'medium'
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
        - 'node --test on the existing folder and server tests'
        - 'prettier check'
        - 'lint'
      success_criteria:
        - 'existing tests pass with the option absent'
    - task_id: task-003
      methods:
        - 'node --test, red for the missing name'
        - 'grep for printed byte arrays'
        - 'prettier check'
        - 'lint'
      success_criteria:
        - 'the failure names a missing function, not a syntax error'
    - task_id: task-004
      methods:
        - 'node --test, red for the missing name or state'
        - 'prettier check'
        - 'lint'
      success_criteria:
        - 'the failure names a missing function or state, not a syntax error'
    - task_id: task-005
      methods:
        - 'node --check'
        - 'playwright test --list'
        - 'prettier check'
        - 'lint'
      success_criteria:
        - 'the spec is listed in both projects'
    - task_id: task-006
      methods:
        - 'unit tests'
        - 'npm run editor:check'
        - 'lint'
        - 'prettier check'
      success_criteria:
        - 'the store and equivalence tests pass; the first database tests pass; the page is the assembly; the ratchet is at most 99'
    - task_id: task-007
      methods:
        - 'unit tests'
        - 'npm run editor:check'
        - 'git diff of save.js'
        - 'lint'
      success_criteria:
        - 'the flows tests pass; the folder and faithful-save tests pass unchanged; the save.js diff is one call; the ratchet is at most 99'
    - task_id: task-008
      methods:
        - 'unit tests'
        - 'npm run editor:check'
        - 'lint'
        - 'prettier check on the .js files (style.css is not covered by the format scripts and is left as it is)'
      success_criteria:
        - 'the landing and flows tests pass; the existing landing, 360 px, structure and odds-and-ends tests pass unchanged'
    - task_id: task-009
      methods:
        - 'node --test'
        - 'a scratch mutation of a source copy'
        - 'npm run test:unit if a source changed'
      success_criteria:
        - 'the guard test passes and fails on a denied name; the table is in the run document'
    - task_id: task-010
      methods:
        - 'end-to-end tests in Chromium and Firefox'
        - 'lint'
      success_criteria:
        - 'both projects pass with no console error and no retry'
    - task_id: task-011
      methods:
        - 'npm run test:unit'
        - 'npm run test:coverage'
        - 'npm run lint'
        - 'npm run format:check'
        - 'npm run editor:check'
        - 'three mutations of the store'
      success_criteria:
        - 'all exit 0; each mutation turns its test red; the restored store is identical; no floor lowered'
```

## 11. Escalation Rules

```yaml
escalation_rules:
  rules:
    - condition: 'A test and the TDD disagree'
      action: 'Decide in the TDD, change the TDD and the test together, log the decision in the prg, continue.'
    - condition: 'ratchet.max would have to rise, or a part needs a name of a layer above its own'
      action: 'Stop the task, move the dependency down or pass it as a parameter; if impossible, log a blocker and stop.'
    - condition: 'A change would alter the folder-picker path or the served-folder path (openFolder, openRememberedFolder, forgetFolder, retryFolder, the served branch of the bootstrap)'
      action: 'Stop, find the smallest branch that leaves them as they were, log it; the wave says not to change them.'
    - condition: 'A write could leave a partial file, write into a deleted workspace, or a delete could run without the question or on another row'
      action: 'Treat as a defect of the task: add the failing test first, fix, and log it as a finding; never accept it as a tradeoff.'
    - condition: 'A coverage floor would have to be lowered'
      action: 'Add cases to cover the new code; never lower a floor.'
    - condition: 'A browser of the e2e suite is not installed, or MDN compat data cannot be reached'
      action: 'Log the blocker or mark the item C-UNCHECKED; installing a browser is a download that needs the owner; continue with what does not depend on it.'
    - condition: 'A failure appears only in Firefox, or the spec seems to need a wait or a retry'
      action: 'Find the cause; a retry or a fixed sleep is not a fix (one worker, no retry is the suite''s rule).'
    - condition: 'A task fails its verification'
      action: 'Re-dispatch once one effort step up with the failing output; a second failure is handled inline and logged as a finding.'
    - condition: 'Any task flagged human_required or review_before appears'
      action: 'None is planned. This run operates under the autonomy override of complete-run (the human tiers do not stop it by category alone); if one appears it is executed by an agent, the override is logged in the prg, and the verified diff is what a human reviews at the end.'
    - condition: 'The wave manifest needs a change (likely_paths of W-4)'
      action: 'Record it in the run document as a note for the wave owner; this run does not write the wave manifest or the wave progress log.'
```

## 12. Final Execution Manifest

```yaml
execution_manifest:
  status: 'in_progress'
  recommendation: 'proceed_with_review'
  autonomy_level: 'medium'
  total_tasks: 11
  autonomous_tasks: 8
  review_before_tasks: 0
  review_after_tasks: 3
  human_required_tasks: 0
  blocked_tasks: 0
  critical_path_tasks:
    - task-001
    - task-002
    - task-003
    - task-006
    - task-007
    - task-008
    - task-009
    - task-010
    - task-011
  parallel_groups:
    - parallel-group-001
  required_human_gates:
    - gate-001
  highest_risk_tasks:
    - task-003
    - task-006
    - task-007
  lowest_confidence_tasks:
    - task-005
    - task-010
    - task-007
  next_action: 'Run task-001: write the eighteen decisions of gap-001 into tdd-0192-browser-workspace.md, then task-002.'
  criteria:
    - 'src/main/editor/persistence/browser-store.js and src/main/editor/application/browser-workspaces.js exist, are in layers.json, and their names are in names.json; ratchet.max is at most 99; no part is over 3000 lines'
    - 'the five new node test files pass and the existing folder, 360 px, structure, faithful-saves and odds-and-ends tests pass unchanged'
    - 'a node test proves that no Firefox and Safari sentence appears where the browser workspace is available'
    - 'the e2e spec passes in chromium and firefox'
    - 'the delete question, the deleted-workspace guard and the failed-write guard are each proved by a test and by a mutation that turns it red'
    - 'npm run test:unit, test:coverage (no floor lowered), lint, format:check and editor:check pass and the page is the assembly of its parts'
    - 'the run document holds the Chromium-only table, the mutations and the notes for the wave owner; CLAUDE.md has its paragraph'
```
