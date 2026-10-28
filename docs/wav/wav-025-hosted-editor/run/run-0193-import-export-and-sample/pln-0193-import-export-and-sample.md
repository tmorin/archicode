---
title: Execution Plan — Import, export and the sample
status: draft
date: 2026-10-28
related:
  - docs/wav/wav-025-hosted-editor/run/run-0193-import-export-and-sample/tdd-0193-import-export-and-sample.md
  - docs/wav/wav-025-hosted-editor/wav-025-hosted-editor.md
  - docs/wav/wav-025-hosted-editor/run/run-0192-browser-workspace/pln-0192-browser-workspace.md
  - 'gh:tmorin/archicode#162'
type: pln
run: 0193
wave: 025
---

# Execution Plan: Import, export and the sample

Profile TDD+pln: there is no PRD, so the requirement IDs REQ-1 to REQ-12 are the ones the TDD labels (section "PRD Traceability"), taken from #162 proposals 3 and 4, the W-5 row of the wave plan and the P2 gate. The run operates under the autonomy override of complete-run: a task that would otherwise stop for a human is executed by an agent, and the override is logged in the prg. No task below is `human_required`, critical or `human_review: required`, so the implement workflow has no gate to lift. The five tasks that carry a loss of work or a published surface (the route of the jar, the pipeline, the tests and the code of the store transfer, the flows with Reset and Import) are `risk: high`, `review_after`, `hard_judgment`, which raises their independent verifier and nothing else.

The Stage 5 review of the TDD (prg, Findings, 2026-10-28) made 9 findings (6 at S2, 3 at S1) that the TDD text does not yet carry; Stage 6 resolved Q-4 only (F-5). This plan follows the review: where the TDD text differs, the decisions of gap-001 bind, and task-001 writes them into the TDD before any test is written. The tests are written before the code (red first), as in runs 0191 and 0192.

Standing rules for every task:

- `src/main/resources/editor-webapp/standalone.html` is generated, so `npm run editor:build` runs after any change to `src/main/editor` and before any `node --test` or `npx playwright test` run by hand (the npm scripts `lint`, `test:unit` and `test:coverage` build it themselves).
- A node test never lets an assertion print a `Uint8Array` or a list of bytes (CON-8: compare strings, lengths, hashes and `Buffer.compare`); the page bytes are of the vm realm, so no `deepStrictEqual` and no `instanceof` on them.
- Nobody commits in the implement workflow, and no check below needs a commit, a clean `git status` or a pushed branch. One test of the unit suite does compare the page with `HEAD` (`src/test/javascript/editor-build/check-editor-statements.test.js`, case "the real page: --statements HEAD passes", CON-11): it is red while the sources of the editor are edited and not committed. It is an expected state, not a failure of a task and not an unmeetable check: a task that edits `src/main/editor` runs its checks as `node --test <the listed files>` (never the whole glob) and the final gate names that one case when it is the only red one (task-013).
- The working tree already holds uncommitted work of run 0192 (`CLAUDE.md`, `src/test/e2e/browser-workspace.spec.js`, `src/test/javascript/viewpoint-kernel/browser-apis.test.js`, and the docs of the wave). No task reverts, stashes, checks out or reformats those files; the edit to `CLAUDE.md` in task-013 is made with `Edit` on the text as it is, never by rewriting the file.
- Java runs with `JAVA_HOME` set to `$HOME/.sdkman/candidates/java/25.0.4-tem` (the shell `java` is 21).

## 1. Executive Summary

```yaml
summary:
  status: 'pending'
  product_goal: 'A visitor clicks one button on the presentation page and lands in the editor on Brightcart with their changes kept, and can take a browser workspace out as one YAML file and bring it back with the same bytes (#162 proposals 3 and 4, wave 025 W-5).'
  technical_approach: 'Apply the Stage 5 decisions to the TDD, then a generated and committed bundle of the Brightcart fixture with a --check, a one-entry route in EditorHttpServer and the lines of the website assembly, tests first for the store transfer, the bundle edges, the flows, the served mode, the card and a hosted-style e2e spec at /editor/, then persistence/browser-transfer.js and persistence/bundle-io.js, application/bundle-flows.js and the state, the card, the Workspace menu, the events, the bootstrap and the sample= address, the site button, the e2e run in Chromium and Firefox, and the gates with five mutation checks.'
  total_tasks: 13
  parallel_groups: 2
  high_risk_tasks: 5
  human_review_gates: 1
  autonomy_level: 'medium'
  recommendation: 'proceed_with_review'
  criteria:
    - 'scripts/build-sample.mjs exists, npm run sample:check exits 0 on the tree and exits 1 on a copy of the tree with one byte of src/main/resources/editor-webapp/samples/brightcart.yaml changed, both outputs are recorded in the run document, and the committed sample unbundles to the 61 files of src/test/resources/brightcart/layered byte for byte'
    - 'the unbundled sample is loaded by the editor in a node test (four plateaus, seven views, three stories, no fatal error) and by archicode views generate in a Java test (BrightcartSampleTest)'
    - 'EditorHttpServer serves GET /samples/brightcart.yaml with the token header or the session cookie and refuses it without, EditorServeIT asserts the bytes on the jar, and editor-webapp/** is still the only native resource include that covers it'
    - 'ci-build.yaml has the step that runs npm run sample:check in the job Page and the lines in Assemble website that copy the sample; the extracted run block was rehearsed locally and its output is in the run document; the criterion stays marked as proved only by the tag run'
    - 'persistence/browser-transfer.js, persistence/bundle-io.js and application/bundle-flows.js exist, are in layers.json in the places the TDD names, their top-level names are in names.json, ratchet.max is not above 99 and no part of src/main/editor is over 3000 lines'
    - 'the seven new node test files (sample-brightcart, build-sample-script, browser-transfer, bundle-io, bundle-flows, sample-served-mode, sample-landing) pass; the existing browser-*.test.js, bundle-*.test.js, server-mode.test.js, folders.test.js, editor-at-360-px.test.js and css-theme-audit.test.js pass unedited'
    - 'a node test proves that opening the sample, saving an edit, exporting, resetting and Back to the served folder in a served page send no PUT, no DELETE and no GET of a file to /api/fs/ while the browser workspace is open, and the e2e spec proves the served folder is byte for byte the same after'
    - 'export then delete then import gives back every file byte for byte for the sample and for a workspace with a BOM, CRLF and a --- inside a file; Import never writes to an existing workspace; Reset fetches and unbundles before it replaces and names the workspace and the loss'
    - 'src/test/e2e/sample.spec.js passes in the chromium and firefox projects against the hosted-style page at /editor/ and the served page: open the link of the site, edit, reload, open again with one Brightcart, export, reset, open the sample from editor serve, Back to the served folder'
    - 'src/site/index.html has the button Try the editor on a realistic project with the address of DEC-10 in the hero and the closing block, the hint and step 2 are true, and site.test.js and sample-brightcart.test.js read the same href'
    - 'npm run test:coverage (no floor in scripts/editor-coverage-floor.json lowered), npm run lint, npm run format:check and npm run editor:check pass, ./mvnw test-compile pmd:check passes, and ./mvnw verify -DskipITs=false passes or its only failures are named with their cause'
    - 'the five mutation checks of the TDD each turn their test red and the restoration is checked by an empty diff; the run document records them, the notes for the wave owner (likely_paths of W-5), and what the run could not prove (the tag run, the native runner, WebKit)'
    - 'CLAUDE.md carries one paragraph on the bundle I/O, the sample, the menu and the served-mode rule in the existing style'
```

## 2. PRD/TDD Consistency Assessment

```yaml
consistency_assessment:
  aligned_items:
    - 'REQ-1 (Export of a browser workspace as one YAML text, the time recorded and shown) is addressed by TG-3, DEC-4, DEC-11, DEC-12, CTR-2, FLOW-1 and tasks 005, 006, 008, 009, 010'
    - 'REQ-2 (Import of a bundle file as a new browser workspace, every refusal told, 10 MB limit) by TG-3, DEC-5, FLOW-2 and tasks 005, 006, 008, 009'
    - 'REQ-3 (the sample generated, committed, checked in CI; exit 0 and 1 recorded) by TG-1, DEC-1, CTR-6 and tasks 002, 004; REQ-4 (the unbundled sample loaded by the editor in node and by views generate in Java) by DEC-1, IMP-2, IMP-11 and tasks 002, 003'
    - 'REQ-5 (the jar serves it, the site assembly copies it, native resources, EditorServeIT) by TG-2, DEC-2, DEC-3, CTR-3, IMP-2, IMP-3 and tasks 003, 004; REQ-6 (Open sample and Reset into a browser workspace also from editor serve, the served folder unchanged) by TG-5, DEC-8, IF-5, FLOW-3 to FLOW-5 and tasks 006, 007, 009, 010, 012'
    - 'REQ-7 (sample= read before anything is drawn, no duplicate, one sentence when the fetch fails) by TG-4, TG-6, DEC-6, DEC-7, CTR-4, FLOW-3 and tasks 006, 009, 010; REQ-8 (the button on the site and its landing page) by TG-6, DEC-10, IMP-10 and tasks 002, 011'
    - 'REQ-9 (Download a copy of the sample) is answered as not offered by Q-1; REQ-10 (no overwrite or delete without saying which workspace and what is lost) by DEC-4 to DEC-6, DEC-9, DEC-11, RISK-1 and the mutation checks of task-013; REQ-11 (command line unchanged, ratchet, part size, floors) by CON-2, CON-3, RISK-7, RISK-11 and task-013; REQ-12 (nothing leaves the browser) by Security and Privacy and the request log test of task-006'
    - 'the module structure of the TDD agrees with the repository: persistence/bundle.js, persistence/browser-store.js and application/browser-workspaces.js exist (W-3, W-4), the store functions markBrowserExport, withBrowserWorkspace and the origin contract exist, the harness has withFile and the e2e harness has startHostedPage, the fixture folder has 61 files, EditorHttpServer has two contexts, and the step Assemble website runs on a tag only'
    - 'Q-1 to Q-4 are resolved in the TDD (Stages 4 and 6) and none blocks a task'
  gaps:
    - id: gap-001
      type: 'ambiguity'
      description: 'The TDD was not revised after the Stage 5 review. Its text leaves open or gets wrong: the menu opens the sample from the served folder with no guard on unsaved changes of the served folder while Back to the served folder has one (F-1); a name taken by a workspace the visitor made or imported, not by another tab creating the sample, leaves the re-list with no sample row (F-2); DEC-4 and ASM-7 test draftTyped, a let of presentation/top-panel.js, from an application part, which would be an upward pair (F-3); isServedByArchiCode() is said to be read in five places and is read in eleven (F-4); a reset in one tab while another tab has the workspace open with unsaved edits is not covered (F-6); the Scope restates the Repository Impact and the flows restate decisions (F-7); DEC-6 is one bullet of three jobs, TG-3 says every file where the bundle can skip some, and the error of parseYaml on the root file is not said (F-8); startHostedPage serves the page at / while the site serves it at /editor/, so the relative fetch is not proved by the e2e spec (F-9); and the step Assemble website is in the job Build, not Page.'
      impact: 'high'
      recommendation: 'Decisions the plan binds, task-001 writes them into the TDD, each once in the section that owns it: (1) F-1: in a served page, choosing Open the Brightcart sample from the menu while hasUnsavedChanges() or a typed draft is pending asks the same confirm as Back to the served folder (hasUnsavedChanges() && !confirm(...) before openSample); the card never asks it (nothing is open there); DEC-8 and FLOW-3 say it and sample-served-mode.test.js gets a case with the confirm refused (nothing opened, the served folder still shown) and one accepted. (2) F-2: after InvalidNameError the flow re-lists, opens the row with sample === id if there is one, else retries once with the next free name (as FLOW-2), else shows the store sentence; DEC-6 and FLOW-3 say it and bundle-flows.test.js has the case (a workspace named Brightcart made by the visitor, then the sample: it is created as Brightcart 2). (3) F-3: the test of countUnsavedChanges() > 0 || draftTyped lives in the menu item disabled state and click handler in presentation or composition (top-panel.js and events.js), which call exportOpenBrowserWorkspace() only when clear; no part of bundle-flows.js reads draftTyped; CON-2, RISK-7, DEC-4 and ASM-7 say it. (4) F-4: DEC-8 carries a table of the eleven reads, site by site, keep or replace, each replaced site with the node test that pins it; the replaced sites are top-panel.js (the close slot) and help-and-settings.js (the where sentence); kept, with the reason in a word: folder-access.js:49 (isFolderAccessAvailable), folder-session.js:87 (the branch that runs after wasBrowserWorkspace is handled, so replacing it is dead code), bootstrap.js:7 (the served branch of load, first), landing.js:69, :118 and :280 (a served page shows no list), remembered-folders.js:315, :358 and :398 (a served page has no remembered folders, and a browser workspace has id null); closeFolder is dropped from DEC-8 and IMP-6; backToServedFolder reuses the clearing steps of closeFolder through one shared function, it does not copy them; RISK-10 says eleven. (5) F-6: RISK-4 gains one sentence, a reset in one tab while another has the same workspace open with unsaved edits is met by W-4 save stale check on modified, which shows the conflict; bundle-flows.test.js gets one test of the stale save after a reset. (6) F-7: Scope becomes one sentence that points at Repository Impact; the FLOW steps keep trigger and branches and cite DEC-4, DEC-5 and DEC-6 for the steps. (7) F-8: DEC-6 is split into Open and Reset sub-bullets, the race handling goes with Open; TG-3 says every file the bundle carries; DEC-5 says an error of parseYaml on the root .archicode.yaml falls back to the file name. (8) F-9: startHostedPage() serves the page at /editor/ and the sample at /editor/samples/brightcart.yaml (hosted.url carries the base; browser-workspace.spec.js uses only hosted.url), so the e2e spec proves the base path and RISK-2 keeps only the Pages configuration; DEC-3, IMP-12 and ASM-5 say it. (9) The text that says the step Assemble website is in the job Page says the job Build. (10) The Verification section lists the new cases of decisions 1, 2, 5 and 8, and the row of the P2 gate that says the unbundled sample is loaded by the editor in a node test and by views generate in a Java test. The same section puts the address cases (sample= read before the first render, an unknown id, the store unavailable, a served page ignores it) and the refusal of Export while changes or a draft are pending in sample-landing.test.js and not in bundle-flows.test.js, because the flows part names no presentation or composition function (already written into the TDD at Stage 9, task-001 checks it is there).'
    - id: gap-002
      type: 'risk'
      description: 'RISK-7: ratchet.max is 99 and the count is at its maximum, so any name of a higher layer used by a new part, or any part placed too early in layers.json, raises it; the application part must not name openAppDialog, draftTyped or any presentation function.'
      impact: 'medium'
      recommendation: 'tasks 008, 009 and 010 each run npm run editor:build then npm run editor:check before they end; a pair that goes upward is moved down or passed as a parameter, never tolerated and never paid for by raising ratchet.max.'
    - id: gap-003
      type: 'risk'
      description: 'The step Assemble website runs on a tag only (CON-12) and the Native job runs the glob of native resources (CON-13); nothing on a pull request or locally proves either, and Mandrel is not available locally.'
      impact: 'medium'
      recommendation: 'task-004 rehearses the extracted run block locally and records the output and the listing; task-003 shows that editor-webapp/** is the include that covers samples/ and that no property changed; the run document and the final report say the criteria are proved by the tag run and the Native job, not by this run.'
    - id: gap-004
      type: 'risk'
      description: 'The e2e spec needs Chromium and Firefox from Playwright, a rebuilt page, and, for its served-page part, a jar that holds the new route and the new page (JDK 25 and a Maven package).'
      impact: 'low'
      recommendation: 'task-012 runs ./mvnw package -Dmaven.test.skip -Dplugin.asciidoctor.skip=true -Dpmd.skip=true with JAVA_HOME on JDK 25 before npm run test:e2e; if a browser is not installed it logs the blocker (installing a browser is a download that needs the owner) and does not work around it.'
    - id: gap-005
      type: 'ambiguity'
      description: 'The wave likely_paths for W-5 miss src/main/editor/layers.json, src/main/editor/model/**, src/main/editor/style.css, src/test/e2e/**, src/test/java/io/morin/archicode/brightcart/**, src/test/java/io/morin/archicode/cli/** and package.json, all touched by the design.'
      impact: 'low'
      recommendation: 'Recorded in the run document by task-013 as a note for the wave owner; this run does not write the wave manifest or the wave progress log.'
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
        - 'tdd-0193-import-export-and-sample.md revised'
      agent_role: 'Documentation Agent'
      autonomy: 'autonomous'
      risk: 'low'
      confidence: 86
    - id: task-002
      status: 'done'
      title: 'Write the sample script, its tests, the npm scripts and the committed sample'
      depends_on: [task-001]
      produces:
        - 'scripts/build-sample.mjs'
        - 'package.json'
        - 'src/main/resources/editor-webapp/samples/brightcart.yaml'
        - 'src/test/javascript/viewpoint-kernel/build-sample-script.test.js'
        - 'src/test/javascript/viewpoint-kernel/sample-brightcart.test.js'
      agent_role: 'Backend Implementation Agent'
      autonomy: 'autonomous'
      risk: 'medium'
      confidence: 80
    - id: task-003
      status: 'done'
      title: 'Write the tests and the route of the sample in EditorHttpServer'
      depends_on: [task-002]
      produces:
        - 'src/main/java/io/morin/archicode/cli/EditorHttpServer.java'
        - 'src/test/java/io/morin/archicode/cli/EditorHttpServerTest.java'
        - 'src/test/java/io/morin/archicode/it/EditorServeIT.java'
        - 'src/test/java/io/morin/archicode/brightcart/BrightcartSampleTest.java'
      agent_role: 'Backend Implementation Agent'
      autonomy: 'review_after'
      risk: 'high'
      confidence: 74
    - id: task-004
      status: 'done'
      title: 'Wire the check and the assembly into ci-build.yaml and rehearse the assembly'
      depends_on: [task-002]
      produces:
        - '.github/workflows/ci-build.yaml'
        - 'run-0193-import-export-and-sample.md (rehearsal evidence)'
      agent_role: 'Infrastructure Agent'
      autonomy: 'review_after'
      risk: 'high'
      confidence: 72
    - id: task-005
      status: 'done'
      title: 'Write the store transfer tests and the bundle edge tests (red)'
      depends_on: [task-001]
      produces:
        - 'src/test/javascript/viewpoint-kernel/browser-transfer.test.js'
        - 'src/test/javascript/viewpoint-kernel/bundle-io.test.js'
      agent_role: 'Test Generation Agent'
      autonomy: 'review_after'
      risk: 'high'
      confidence: 74
    - id: task-006
      status: 'done'
      title: 'Write the flows, served-mode and landing tests (red)'
      depends_on: [task-001]
      produces:
        - 'src/test/javascript/viewpoint-kernel/bundle-flows.test.js'
        - 'src/test/javascript/viewpoint-kernel/sample-served-mode.test.js'
        - 'src/test/javascript/viewpoint-kernel/sample-landing.test.js'
      agent_role: 'Test Generation Agent'
      autonomy: 'autonomous'
      risk: 'medium'
      confidence: 70
    - id: task-007
      status: 'done'
      title: 'Serve the hosted-style page at /editor/ with the sample and write the e2e spec'
      depends_on: [task-001, task-002]
      produces:
        - 'src/test/e2e/harness.js'
        - 'src/test/e2e/sample.spec.js'
      agent_role: 'Test Generation Agent'
      autonomy: 'autonomous'
      risk: 'medium'
      confidence: 62
    - id: task-008
      status: 'done'
      title: 'Write persistence/browser-transfer.js and persistence/bundle-io.js and register them'
      depends_on: [task-005]
      produces:
        - 'src/main/editor/persistence/browser-transfer.js'
        - 'src/main/editor/persistence/bundle-io.js'
        - 'src/main/editor/persistence/browser-store.js'
        - 'src/main/editor/layers.json'
        - 'src/main/editor/names.json'
        - 'src/main/resources/editor-webapp/standalone.html'
      agent_role: 'Frontend Implementation Agent'
      autonomy: 'review_after'
      risk: 'high'
      confidence: 76
    - id: task-009
      status: 'done'
      title: 'Write application/bundle-flows.js, the state and workspaceIsServedFolder'
      depends_on: [task-006, task-008]
      produces:
        - 'src/main/editor/application/bundle-flows.js'
        - 'src/main/editor/application/folder-session.js'
        - 'src/main/editor/model/app-state.js'
        - 'src/main/editor/persistence/folder-access.js'
        - 'src/main/editor/layers.json'
        - 'src/main/editor/names.json'
        - 'src/main/resources/editor-webapp/standalone.html'
      agent_role: 'Frontend Implementation Agent'
      autonomy: 'review_after'
      risk: 'high'
      confidence: 68
    - id: task-010
      status: 'done'
      title: 'Write the card, the Workspace menu, the events, the bootstrap and the sample address'
      depends_on: [task-009]
      produces:
        - 'src/main/editor/presentation/landing.js'
        - 'src/main/editor/presentation/top-panel.js'
        - 'src/main/editor/presentation/help-and-settings.js'
        - 'src/main/editor/style.css'
        - 'src/main/editor/composition/events.js'
        - 'src/main/editor/composition/bootstrap.js'
        - 'src/main/editor/composition/address-routing.js'
        - 'src/main/resources/editor-webapp/standalone.html'
      agent_role: 'Frontend Implementation Agent'
      autonomy: 'autonomous'
      risk: 'medium'
      confidence: 66
    - id: task-011
      status: 'done'
      title: 'Add the button and the true sentences to the presentation page and pin the link'
      depends_on: [task-008]
      produces:
        - 'src/site/index.html'
        - 'src/test/javascript/site.test.js'
        - 'src/test/javascript/viewpoint-kernel/sample-brightcart.test.js'
      agent_role: 'Frontend Implementation Agent'
      autonomy: 'autonomous'
      risk: 'medium'
      confidence: 84
    - id: task-012
      status: 'done'
      title: 'Run the e2e spec in Chromium and Firefox and fix what it finds'
      depends_on: [task-003, task-007, task-010, task-011]
      produces:
        - 'src/test/e2e/sample.spec.js passing in both projects'
        - 'fixes to the spec or the page it needs'
      agent_role: 'QA Agent'
      autonomy: 'autonomous'
      risk: 'medium'
      confidence: 62
    - id: task-013
      status: 'done'
      title: 'Write the CLAUDE.md paragraph, run every gate, show the five mutations fail, record in the run document'
      depends_on: [task-004, task-012]
      produces:
        - 'CLAUDE.md'
        - 'run-0193-import-export-and-sample.md (verification, mutations, notes for the wave owner)'
      agent_role: 'QA Agent'
      autonomy: 'autonomous'
      risk: 'medium'
      confidence: 72
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
          - 'Scope, TG-3, ASM-5, ASM-7, CON-2, DEC-3, DEC-4, DEC-5, DEC-6, DEC-8, IMP-6, IMP-12, FLOW-3, RISK-2, RISK-4, RISK-7, RISK-10, Observability and Verification, and the Findings of prg-0193-import-export-and-sample.md'
      outputs:
        - 'tdd-0193-import-export-and-sample.md edited so that every decision of gap-001 (1 to 10) is in its text once, in the section that owns it; status stays draft; Q-1 to Q-4 stay resolved; the table of the eleven reads of isServedByArchiCode() is in DEC-8 after rereading each site in src/main/editor'
      verification:
        - 'grep -c "five places" in the TDD gives 0 and grep -c "eleven" gives at least 2'
        - 'grep -c "bootstrap.js:7" in the TDD gives at least 1 and grep -c "folder-session.js:87" gives at least 1'
        - 'grep -c "no part of bundle-flows.js reads draftTyped" in the TDD gives at least 1'
        - 'grep -c "next free name" in the TDD gives at least 2 and grep -c "InvalidNameError" gives at least 1'
        - 'grep -c "stale" in the TDD gives at least 1 and grep -c "falls back to the file name" gives at least 1'
        - 'grep -c "/editor/samples/brightcart.yaml" in the TDD gives at least 2'
        - 'grep -c "every file the bundle carries" in the TDD gives at least 1 and grep -c "every file of the workspace byte" gives 0'
        - 'grep -n "Assemble website" in the TDD shows the job Build wherever the job of that step is named, and no line says the job Page for it'
        - 'the TDD entry of bundle-flows.test.js has no address case and no draftTyped case, and the entry of sample-landing.test.js has both (the address and the refusal of Export while changes or a draft are pending); grep -c "DEC-14" in the TDD gives 0'
      risk: 'low'
      confidence: 86
      human_review: 'none'
      escalation_triggers:
        - 'a decision of gap-001 contradicts a passage of the TDD that this task cannot reconcile in a sentence: decide in the TDD and log the decision in the prg'
        - 'rereading a site of isServedByArchiCode() shows a different keep or replace than gap-001 says: the code wins, write what the code needs and log it'
      delegation_tier: 'standard'
      results: 'tier standard, model sonnet, effort medium, profile low-cost, passed after escalation to effort high, inline (leaf), independently verified'
    - id: task-002
      title: 'Write the sample script, its tests, the npm scripts and the committed sample'
      source_requirements:
        prd: []
        tdd:
          - 'REQ-3, REQ-4, REQ-11, TG-1, ASM-1, ASM-2, CON-7, DEC-1, DEC-10 (the address), IMP-1, IMP-11 (sample-brightcart.test.js, build-sample-script.test.js), CTR-2, CTR-6, Q-2, RISK-8'
      outputs:
        - 'src/test/javascript/viewpoint-kernel/build-sample-script.test.js and sample-brightcart.test.js written first and shown red because scripts/build-sample.mjs does not exist'
        - 'scripts/build-sample.mjs with --check and --root <dir>, built on createApp of src/test/javascript/viewpoint-kernel/harness.js given the page text as options.html, failing when skipped is not empty or carried is not the list of files read, writing only when the bytes differ'
        - 'package.json: sample:build and sample:check'
        - 'src/main/resources/editor-webapp/samples/brightcart.yaml written by npm run sample:build'
        - 'run-0193-import-export-and-sample.md: a section with the output of npm run sample:check on the tree (exit 0) and on a copy with one byte of the sample changed (exit 1, the line named)'
      verification:
        - 'npm run sample:build exits 0 and a second run leaves the file byte for byte the same (cmp against a copy in the scratchpad); npm run sample:check exits 0'
        - 'node --test src/test/javascript/viewpoint-kernel/build-sample-script.test.js src/test/javascript/viewpoint-kernel/sample-brightcart.test.js exits 0'
        - 'on a copy of the fixture, the sample and the page with one byte of the sample changed, node scripts/build-sample.mjs --check --root <copy> exits 1 and its error output names a line and says run npm run sample:build'
        - 'with a .md file added to the copy of the fixture, node scripts/build-sample.mjs --root <copy> exits 1 and says the file is skipped by the bundle'
        - 'the unbundled sample equals the 61 files of src/test/resources/brightcart/layered by hash (the test), carried is 61 and skipped is 0'
        - 'the test that draws the address editor/#/timeline/applications?plateau=marketplace&compare=past&sample=brightcart (as a hash) ends with plateau marketplace, a comparison with inhouse, a non-empty comparisonState().changes and a diagram that is not diagramHasNothingToDraw'
        - 'no assertion prints a byte array (grep -c "deepStrictEqual" on the two tests gives 0 for page bytes); npx prettier --check on scripts/build-sample.mjs and the two tests exits 0; npm run lint exits 0'
      risk: 'medium'
      confidence: 80
      human_review: 'none'
      escalation_triggers:
        - 'the harness cannot load the page with options.html pointing at a copy: stop and log, do not fork the loader'
        - 'bundleWorkspaceFiles skips a file of the fixture: the TDD says the script fails; log which file and why before deciding'
        - 'the address does not draw marketplace compared with inhouse: Q-2 was measured, log the difference and choose the nearest address that does, in the TDD DEC-10 and the test together'
      delegation_tier: 'standard'
      results: 'tier standard, model sonnet, effort medium, profile low-cost, passed first time, inline (leaf), independently verified'
    - id: task-003
      title: 'Write the tests and the route of the sample in EditorHttpServer'
      source_requirements:
        prd: []
        tdd:
          - 'REQ-4, REQ-5, REQ-6, TG-2, CON-13, DEC-2, IMP-2, CTR-3, IF-5, Security and Privacy, Observability and Verification (Java)'
      outputs:
        - 'EditorHttpServerTest, EditorServeIT and BrightcartSampleTest written first and shown failing for the missing route or the missing class'
        - 'EditorHttpServer: a context /samples/ with a one-entry table SAMPLES, GET only, 200 text/yaml charset utf-8 with Cache-Control no-store and X-Content-Type-Options nosniff, 404 for any other path under /samples/, 405 for another method, the Host check of the page, the X-ArchiCode-Token header or the archicode-session cookie accepted and never the query, 403 otherwise; the class Javadoc lists the route'
        - 'BrightcartSampleTest splits the committed sample on the separator lines with an independent splitter of about ten lines, compares every file with the fixture folder byte for byte, writes them to a temporary folder and runs plateau list, views generate --plateau marketplace and diff --plateau marketplace --against inhouse with the same output as on the fixture'
        - 'EditorServeIT asserts, inside the one process it starts, the sample with the token header (200, equal to the committed file) and without it (403)'
      verification:
        - 'with JAVA_HOME on JDK 25: ./mvnw test -Dtest=EditorHttpServerTest,BrightcartSampleTest -Djacoco.skip=true exits 0 and the report lists the new cases (the sample with the header, with the cookie, without a proof 403, a Host not allowed 403, POST 405, /samples/other.yaml, /samples/ and /samples/../application.properties 404)'
        - 'with JAVA_HOME on JDK 25: ./mvnw verify -DskipITs=false -Dit.test=EditorServeIT -Dtest=EditorHttpServerTest -Dsurefire.failIfNoSpecifiedTests=false -Djacoco.skip=true exits 0 (or the nearest command that runs these two classes and the packaging; the command used is written in the run document)'
        - './mvnw test-compile pmd:check exits 0'
        - 'git diff src/main/resources/application.properties is empty and grep -n "editor-webapp/\*\*" src/main/resources/application.properties shows the include that already covers samples/'
        - 'the existing cases of EditorHttpServerTest (the page, the API, the refusals) pass unedited'
        - 'npx prettier --check on the four Java files exits 0'
      risk: 'high'
      confidence: 74
      human_review: 'after'
      escalation_triggers:
        - 'the route would need to serve a path built from the request: stop, the table of one entry is the design'
        - 'a PMD rule fires that needs the ruleset changed: fix the code, never turn the rule off'
        - 'the jar cannot be built or the IT cannot start (JDK or port): log the blocker and run what does not depend on it'
        - 'Mandrel is needed to show the native include works: it is not available locally, the Native job proves it, say so'
      delegation_tier: 'hard_judgment'
      results: 'tier hard_judgment, model sonnet, effort high, profile low-cost, passed first time, inline (leaf), independently verified'
    - id: task-004
      title: 'Wire the check and the assembly into ci-build.yaml and rehearse the assembly'
      source_requirements:
        prd: []
        tdd:
          - 'REQ-3, REQ-5, TG-2, DEC-1, DEC-3, IMP-3, CTR-6, CON-12, RISK-2, Deployment and Rollout'
      outputs:
        - 'ci-build.yaml: a step Check the Brightcart sample is the bundle of its fixture in the job Page that runs npm run sample:check, after the step Check the editor page is the assembly of its parts and before the format check'
        - 'ci-build.yaml: in Assemble website, after the line that writes target/site/editor/index.html, mkdir -p target/site/editor/samples, cp -r src/main/resources/editor-webapp/samples/. target/site/editor/samples/, test -f target/site/editor/samples/brightcart.yaml and a cmp of that file with its source'
        - 'run-0193-import-export-and-sample.md: a rehearsal section with the run block extracted from the workflow, run in a scratch copy with a stand-in target/generated-docs/index.html and GITHUB_REF_NAME=archicode-0.0.0-rehearsal, its output and the listing of target/site/editor/ in the scratch copy; it says the real proof is the tag run'
      verification:
        - 'python3 -c "import yaml,sys; yaml.safe_load(open(sys.argv[1]))" .github/workflows/ci-build.yaml exits 0 (if PyYAML is missing, node with the js-yaml of node_modules or ruby -ryaml is used and the command written in the run document)'
        - 'grep -n "npm run sample:check" .github/workflows/ci-build.yaml shows one line inside the job Page, and grep -n "target/site/editor/samples" .github/workflows/ci-build.yaml shows the three lines and the cmp inside Assemble website'
        - 'the extracted run block, executed with bash -euo pipefail in the scratch copy, exits 0 and cmp target/site/editor/samples/brightcart.yaml src/main/resources/editor-webapp/samples/brightcart.yaml exits 0 in that copy'
        - 'with the cp line removed from the scratch copy of the block, the same block exits non-zero at the test -f line (run once, output recorded)'
        - 'git diff --stat .github/workflows/ci-build.yaml shows only the added lines (no existing step reordered or reworded)'
      risk: 'high'
      confidence: 72
      human_review: 'after'
      escalation_triggers:
        - 'the existing lines of Assemble website would have to change for the new ones to work: stop, the change is additive only'
        - 'a step of the workflow that is not Page or Assemble website would be touched'
        - 'the rehearsal passes but a difference between the runner layout of a tag and the scratch copy is suspected: say so in the run document, the criterion stays open until the tag run'
      delegation_tier: 'hard_judgment'
      results: 'tier hard_judgment, model sonnet, effort high, profile low-cost, passed first time, inline (leaf), independently verified'
    - id: task-005
      title: 'Write the store transfer tests and the bundle edge tests (red)'
      source_requirements:
        prd: []
        tdd:
          - 'REQ-1, REQ-2, REQ-6, REQ-7, REQ-10, REQ-12, TG-3, TG-4, ASM-1, ASM-3, ASM-4, CON-4, CON-8, CON-9, DEC-4, DEC-5, DEC-6, DEC-12, DEC-13, CTR-1, CTR-2, IMP-4, IMP-5, Observability and Verification (browser-transfer.test.js and bundle-io.test.js)'
      outputs:
        - 'src/test/javascript/viewpoint-kernel/browser-transfer.test.js: readBrowserWorkspaceFiles of a nested tree, an empty workspace, bytes with a BOM and CRLF by hash, the copy (a later change to the returned array does not reach the store), a deleted workspace with the W-4 DEC-6 sentence; replaceBrowserWorkspaceFiles removes the files not in the new set, keeps id, name, createdAt, lastExportAt and origin, is all-or-nothing under failPut (old files read back), refuses a bad path before the transaction, leaves another workspace untouched; createBrowserWorkspace with sample, and list rows with and without the property'
        - 'src/test/javascript/viewpoint-kernel/bundle-io.test.js: bundleFileName (accents, spaces, only symbols, 60 characters), readBundleFile (over the limit by size without reading, invalid UTF-8, a BOM, a good file), fetchSampleBundle against a fake fetch (200, 404, a rejected promise, an empty body, a body that does not unbundle, no .archicode.yaml; the request is samples/brightcart.yaml with cache no-cache and the token header only when served), bundleProblemsSentence with one, three and seven problems, bundleImportName (settings.name valid, invalid, a parseYaml error, the file name, Imported workspace)'
      verification:
        - 'npm run editor:build then node --test on the two files runs and fails because a function of the page is missing (a not-a-function or not-defined error naming readBrowserWorkspaceFiles, replaceBrowserWorkspaceFiles, bundleFileName, fetchSampleBundle or a sibling), not because of a syntax error in the tests'
        - 'the tests contain no deepStrictEqual or instanceof on page bytes and no assertion that prints a byte list (grep on the two files)'
        - 'each case of the TDD list for the two files is present (the task lists the case titles in the run document or in the test names)'
        - 'npx prettier --check on the two files exits 0 and npm run lint exits 0'
      risk: 'high'
      confidence: 74
      human_review: 'after'
      escalation_triggers:
        - 'a case cannot be expressed against the fake (a key range, an index, a cursor, two stores in a transaction): change the case, never the fake, and log it'
        - 'the vm harness cannot load a part that is not yet in the page, so the red state cannot be shown'
        - 'an assertion would print a byte array'
      delegation_tier: 'hard_judgment'
      results: 'tier hard_judgment, model sonnet, effort high, profile low-cost, passed first time, inline (leaf), independently verified'
    - id: task-006
      title: 'Write the flows, served-mode and landing tests (red)'
      source_requirements:
        prd: []
        tdd:
          - 'REQ-1, REQ-2, REQ-6, REQ-7, REQ-10, REQ-11, REQ-12, TG-4, TG-5, DEC-4 to DEC-9, DEC-11, CON-2, CON-8, IF-1 to IF-4, FLOW-1 to FLOW-5, RISK-4, RISK-10, Observability and Verification (bundle-flows, sample-served-mode and sample-landing), decisions 1 to 5 and 8 of gap-001'
      outputs:
        - 'src/test/javascript/viewpoint-kernel/bundle-flows.test.js with the four edge functions replaced on the sandbox: export (bytes equal the bundle of the stored files, the name, lastExportAt, the skipped sentence, an empty workspace, the workspace gone), import (a new workspace, never an existing one overwritten, ` 2` for a same name, settings.name or the file name, every refusal of the codec and the missing root file, the size and UTF-8 refusals, nothing created on a refusal), export then delete then import byte for byte for the sample and for a workspace with a BOM, CRLF and a --- inside a file, open sample (origin and sample on the record, reopened with no fetch, two parallel calls end with one workspace, a failing fetch leaves the list as it was, a workspace named Brightcart made by the visitor gives Brightcart 2), reset (the named question, Cancel and Escape change nothing, a failing fetch writes nothing, a failing transaction keeps the old files, the unsaved count in the sentence, the same record afterwards, the stale save of another tab after a reset), and the checks that the application part reads neither draftTyped nor a presentation name (the address cases are in sample-landing.test.js: they need composition names that task-010 writes, and task-009 must find bundle-flows.test.js green)'
        - 'src/test/javascript/viewpoint-kernel/sample-served-mode.test.js: a served sandbox (serverToken) with a fake fetch that logs every request: opening the sample, an edit saved in the browser workspace, an export, a reset and Back to the served folder send no PUT, no DELETE and no GET of a file to /api/fs/ while the browser workspace is open; the confirm of unsaved changes before opening the sample from the served folder (refused: nothing opened; accepted: opened); each replaced site of the table of DEC-8 follows workspaceIsServedFolder(); server-mode.test.js is not edited'
        - 'src/test/javascript/viewpoint-kernel/sample-landing.test.js: the actions and the primary rule for a first visit and for a visitor with a workspace, the unsupported card only when neither folders nor the store are available, the row Export and its accessible name, the delete question with Last exported, Export first and the focus on Cancel, the Workspace menu by mode, Escape and outside click, the address (sample=brightcart read before the first render and absent from the address the page writes, an unknown id, the store unavailable, a served page ignores it), the disabled Export with the sentence when changes or a draft are pending, the escaping of a name and of a settings.name with an img onerror, the 360 px layout'
      verification:
        - 'npm run editor:build then node --test on the three files runs and fails because a function of the page is missing (bundle flow names, workspaceIsServedFolder, sampleFromHash), not because of a syntax error'
        - 'the tests contain no deepStrictEqual or instanceof on page bytes and no printed byte list (grep on the three files)'
        - 'editor-at-360-px.test.js, css-theme-audit.test.js, server-mode.test.js and the existing browser-landing.test.js and browser-workspaces-flows.test.js are not in the diff (git status lists only the three new files for this task)'
        - 'npx prettier --check on the three files exits 0 and npm run lint exits 0'
      risk: 'medium'
      confidence: 70
      human_review: 'none'
      escalation_triggers:
        - 'a case needs a DOM the harness does not have: move it to the e2e spec and log it'
        - 'an existing landing test has to change: stop, the card keys of W-4 must stay'
        - 'the flows need a presentation name to be tested: move the check into the sample-landing test'
      delegation_tier: 'standard'
      results: 'tier standard, model sonnet, effort medium, profile low-cost, passed first time, inline (leaf), independently verified'
    - id: task-007
      title: 'Serve the hosted-style page at /editor/ with the sample and write the e2e spec'
      source_requirements:
        prd: []
        tdd:
          - 'REQ-6, REQ-7, REQ-8, TG-6, TG-7, ASM-3, ASM-4, ASM-5, CON-10, DEC-3, DEC-10, IMP-12, RISK-9, Observability and Verification (sample.spec.js), decision 8 of gap-001'
      outputs:
        - 'src/test/e2e/harness.js: startHostedPage() answers GET /editor/ with the committed page, GET /editor/samples/brightcart.yaml with the committed sample, and 404 for any other path (so the site layout is what the spec runs on); hosted.url is http://127.0.0.1:<port>/editor/; no other spec is edited'
        - 'src/test/e2e/sample.spec.js in chromium and firefox: open the address of DEC-10 under hosted.url with no folder chosen and find Brightcart on Applications with marketplace and the comparison on screen, no console error and no sample in the address afterwards; edit a description and save; reload and find it; open the same link again and find one Brightcart with the change; Workspace menu, Export as a file gives a download named brightcart-bundle.yaml whose first line is --- # file: .archicode.yaml and whose text equals the bundle of the files read from the store; Reset with Cancel changes nothing and with the yes restores the sample text; against startServer(domain_workspace) the page opens the served folder, Workspace then Open the Brightcart sample opens Brightcart, a change saved there leaves the served folder byte for byte as it was (hash of the tree before and after), and Back to the served folder shows it again'
      verification:
        - 'npx playwright test browser-workspace.spec.js exits 0 in chromium and firefox against the moved base path (the existing spec reads only hosted.url), after npm run editor:build'
        - 'npx playwright test sample.spec.js --list lists the cases in both projects, and a run of the hosted-page cases fails for the missing feature (no Open the Brightcart sample button), not for a harness or syntax error'
        - 'the other specs of src/test/e2e are not in the diff (git status lists harness.js and sample.spec.js for this task)'
        - 'npx prettier --check src/test/e2e/harness.js src/test/e2e/sample.spec.js exits 0 and npm run lint exits 0'
      risk: 'medium'
      confidence: 62
      human_review: 'none'
      escalation_triggers:
        - 'a browser is not installed: log the blocker, installing is a download that needs the owner, do not work around it'
        - 'moving the base path breaks the existing browser-workspace spec in a way the harness cannot absorb: stop and log, the TDD decision 8 may need to keep both paths'
        - 'the download event cannot be observed in Firefox: find the cause, never a fixed sleep'
      delegation_tier: 'standard'
      results: 'tier standard, model sonnet, effort medium, profile low-cost, passed first time, inline (leaf), independently verified'
    - id: task-008
      title: 'Write persistence/browser-transfer.js and persistence/bundle-io.js and register them'
      source_requirements:
        prd: []
        tdd:
          - 'REQ-1, REQ-2, REQ-6, REQ-7, REQ-10, REQ-12, TG-3, TG-4, CON-1, CON-2, CON-4, CON-9, DEC-4 (slug and file name), DEC-5 (read and name), DEC-6 (catalog), DEC-12, DEC-13, IMP-4, IMP-5, IMP-9, CTR-1, RISK-7'
      outputs:
        - 'src/main/editor/persistence/browser-transfer.js: readBrowserWorkspaceFiles and replaceBrowserWorkspaceFiles through withBrowserWorkspace, one transaction each, paths checked before the transaction, bytes copied, no AppState and no DOM'
        - 'src/main/editor/persistence/bundle-io.js: BROWSER_SAMPLES, fetchSampleBundle, bundleFilePicker, readBundleFile, startBundleDownload, bundleFileName, bundleProblemsSentence, bundleImportName; the only fetch, Blob and file input of a bundle; fatal true on the decoder; a rejected fetch turned into a sentence, never thrown at the flow'
        - 'src/main/editor/persistence/browser-store.js: createBrowserWorkspace accepts options.sample (stored only when origin is sample) and listBrowserWorkspaces returns sample (a string or null); nothing renamed'
        - 'layers.json: browser-transfer.js after browser-store.js, bundle-io.js after bundle.js; names.json regenerated with node scripts/check-editor.mjs --write-names; standalone.html rebuilt'
      verification:
        - 'npm run editor:build then node --test src/test/javascript/viewpoint-kernel/browser-transfer.test.js src/test/javascript/viewpoint-kernel/bundle-io.test.js exits 0'
        - 'node --test on the existing browser-store.test.js, browser-workspace-equivalence.test.js, bundle-cases.test.js, bundle-roundtrip.test.js and folders.test.js exits 0 (unedited)'
        - 'npm run editor:check exits 0 and ratchet.max in layers.json is not above 99'
        - 'git diff src/main/editor/persistence/browser-store.js shows only the sample option and the sample field of the row (no other line moved)'
        - 'wc -l of every file under src/main/editor/persistence is under 3000'
        - 'grep -c "render()" on browser-transfer.js and bundle-io.js gives 0 and neither file names AppState'
        - 'npx prettier --check on the changed parts exits 0 and npm run lint exits 0'
      risk: 'high'
      confidence: 76
      human_review: 'after'
      escalation_triggers:
        - 'a name of a higher layer would be used by a new part: pass it as a parameter, never raise ratchet.max'
        - 'the fake does not support a call the transfer needs (a range, an index, a cursor): change the call, never the fake'
        - 'a replace could leave a partial workspace: treat as a defect, add the failing test first, fix, log it as a finding'
      delegation_tier: 'hard_judgment'
      results: 'tier hard_judgment, model sonnet, effort high, profile low-cost, passed first time, inline (leaf), independently verified'
    - id: task-009
      title: 'Write application/bundle-flows.js, the state and workspaceIsServedFolder'
      source_requirements:
        prd: []
        tdd:
          - 'REQ-1, REQ-2, REQ-6, REQ-7, REQ-10, TG-3 to TG-5, CON-2, CON-5, DEC-4 to DEC-9, IMP-6, CTR-5, FLOW-1 to FLOW-5, RISK-1, RISK-4, RISK-7, RISK-10, decisions 1 to 5 of gap-001'
      outputs:
        - 'src/main/editor/application/bundle-flows.js: exportBrowserWorkspace, exportOpenBrowserWorkspace, chooseBundleFile, importBundleFile, openSample, askToResetSample, cancelWorkspaceMenuQuestion, confirmResetSample, backToServedFolder, setWorkspaceMenuOpen; Import only creates; Reset fetches and unbundles before replaceBrowserWorkspaceFiles and names the workspace and the loss; the name race re-lists, opens the sample row or retries once; no use of draftTyped, openAppDialog or any presentation name; no modelsChanged()'
        - 'src/main/editor/model/app-state.js: workspaceMenuOpen, workspaceMenuQuestion, bundleNotice; folder-session.js: resetUiState clears them, and the clearing steps of closeFolder are one shared function that backToServedFolder reuses; persistence/folder-access.js: workspaceIsServedFolder() beside isServedByArchiCode()'
        - 'layers.json: bundle-flows.js after browser-workspaces.js; names.json regenerated; standalone.html rebuilt'
      verification:
        - 'npm run editor:build then node --test src/test/javascript/viewpoint-kernel/bundle-flows.test.js exits 0'
        - 'node --test on sample-served-mode.test.js and sample-landing.test.js: the cases that need the card or the menu of task-010 may still fail, and every failure names a presentation or composition name (the task lists them in the run document); no case of the flows or the served-mode request log fails'
        - 'node --test on the existing browser-workspaces-flows.test.js, browser-landing.test.js, browser-store.test.js, server-mode.test.js and folders.test.js exits 0 (unedited)'
        - 'npm run editor:check exits 0, ratchet.max in layers.json is not above 99 and grep -c "draftTyped" src/main/editor/application/bundle-flows.js gives 0'
        - 'wc -l of every file under src/main/editor/application and model is under 3000'
        - 'npx prettier --check on the changed parts exits 0 and npm run lint exits 0'
      risk: 'high'
      confidence: 68
      human_review: 'after'
      escalation_triggers:
        - 'a flow needs a presentation name: move the question into state of model/app-state.js or pass the function as a parameter, never raise ratchet.max'
        - 'a flow writes to the served folder, to an existing workspace on import, or replaces before the fetch succeeded: treat as a defect, add the failing test first, fix, log it as a finding'
        - 'retryFolder, noteWorkspaceName or showRememberedFolders misbehave with a sample workspace open in a served page: add the test the TDD names and fix the smallest branch'
      delegation_tier: 'hard_judgment'
      results: 'tier hard_judgment, model sonnet, effort high, profile low-cost, passed first time, inline (leaf), independently verified'
    - id: task-010
      title: 'Write the card, the Workspace menu, the events, the bootstrap and the sample address'
      source_requirements:
        prd: []
        tdd:
          - 'REQ-1, REQ-6, REQ-7, REQ-11, TG-4, TG-6, CON-5, CON-6, DEC-4 (the draft check), DEC-7, DEC-8, DEC-9, DEC-11, IMP-7, IMP-8, IF-1 to IF-5, CTR-4, RISK-11, decisions 1, 3 and 4 of gap-001'
      outputs:
        - 'presentation/landing.js: the actions in the order of DEC-11 and the primary rule, Export on each browser row (data-action export-browser-workspace, accessible name with the workspace), the sample row text, the delete question with Last exported and Export first (focus still on Cancel); presentation/top-panel.js: the Workspace button and popup patterned on the help menu, the disabled Export with its sentence when changes or a draft are pending, the status span for bundleNotice, the notice title, the close slot Back to the served folder by workspaceIsServedFolder(); presentation/help-and-settings.js: the where sentence by workspaceIsServedFolder(); style.css: the .workspace-menu rules on the tokens of .help-menu'
        - 'composition/events.js: the data-action values of IMP-8, Escape and outside click for the menu, the confirm before opening the sample from the served folder; composition/bootstrap.js: sampleFromHash() read right after syncPerspectiveFromHash() and before the first render, passed to startPage, which opens the sample after the probe in place of tryAutoReopen, and the non-blocking probe in a served page; composition/address-routing.js: sampleFromHash()'
        - 'names.json regenerated; standalone.html rebuilt'
      verification:
        - 'npm run editor:build then node --test src/test/javascript/viewpoint-kernel/sample-landing.test.js src/test/javascript/viewpoint-kernel/sample-served-mode.test.js src/test/javascript/viewpoint-kernel/bundle-flows.test.js exits 0'
        - 'node --test on the existing browser-landing.test.js, browser-workspaces-flows.test.js, editor-at-360-px.test.js, css-theme-audit.test.js, server-mode.test.js, folders.test.js, editor-structure.test.js and faithful-saves.test.js exits 0 (unedited)'
        - 'npm run editor:check exits 0 and ratchet.max in layers.json is not above 99'
        - 'a test shows the order: with a hash that carries sample=brightcart, the read happens before the first render and the key is not in the address the page writes afterwards'
        - 'wc -l of every file under src/main/editor/presentation and composition is under 3000'
        - 'npx prettier --check on the changed sources exits 0 and npm run lint exits 0'
      risk: 'medium'
      confidence: 66
      human_review: 'none'
      escalation_triggers:
        - 'the 360 px test fails and the fix would change an existing layout rule'
        - 'an existing landing or server-mode test needs editing: stop, the served branch of the bootstrap stays first'
        - 'a redraw would lose what the visitor typed in the menu: open and close without a redraw, as setHelpOpen does'
      delegation_tier: 'standard'
      results: 'tier standard, model sonnet, effort medium, profile low-cost, passed first time, inline (leaf), independently verified'
    - id: task-011
      title: 'Add the button and the true sentences to the presentation page and pin the link'
      source_requirements:
        prd: []
        tdd:
          - 'REQ-8, TG-6, DEC-10, IMP-10, CTR-4, Q-2'
      outputs:
        - 'src/site/index.html: a secondary button Try the editor on a realistic project with href editor/#/timeline/applications?plateau=marketplace&compare=past&sample=brightcart next to Open the editor in the hero call to action and in the closing block; the four existing links keep editor/; the hint line and step 2 rewritten as the TDD words them; the stamp meta tag stays once'
        - 'src/test/javascript/site.test.js: the href starts with editor/#, carries sample= with an id read from BROWSER_SAMPLES in the page source, and the hint no longer promises Chromium only'
        - 'src/test/javascript/viewpoint-kernel/sample-brightcart.test.js: one case that reads the href from src/site/index.html and asserts it is the address the drawing case uses'
      verification:
        - 'node --test src/test/javascript/site.test.js src/test/javascript/viewpoint-kernel/sample-brightcart.test.js exits 0'
        - 'grep -c "archicode-version" src/site/index.html still gives 1 (the stamp meta tag stays once; the existing site test passes)'
        - 'grep -c "Chrome, Edge, Brave or Opera); your files are not uploaded" src/site/index.html gives 0'
        - 'npx prettier --check is not needed for src/site/index.html if .prettierignore lists it; otherwise it exits 0; npm run lint exits 0'
      risk: 'medium'
      confidence: 84
      human_review: 'none'
      escalation_triggers:
        - 'the inline script of the page that redirects old manual anchors would catch the new link: it only reads the hash of the root page, log it if it does'
      delegation_tier: 'standard'
      results: 'tier standard, model sonnet, effort medium, profile low-cost, passed first time, inline (leaf), independently verified'
    - id: task-012
      title: 'Run the e2e spec in Chromium and Firefox and fix what it finds'
      source_requirements:
        prd: []
        tdd:
          - 'REQ-5 to REQ-8, TG-6, TG-7, ASM-3, ASM-4, ASM-5, RISK-2, RISK-3, RISK-9, Observability and Verification (the e2e spec)'
      outputs:
        - 'src/test/e2e/sample.spec.js passing in the chromium and firefox projects with no console error; any fix it needs in the spec or the page (the page rebuilt)'
        - 'target/quarkus-app rebuilt so that the served-page part of the spec runs on the new route and page'
      verification:
        - 'npm run editor:build; with JAVA_HOME on JDK 25: ./mvnw package -Dmaven.test.skip -Dplugin.asciidoctor.skip=true -Dpmd.skip=true exits 0'
        - 'npx playwright test sample.spec.js browser-workspace.spec.js exits 0 with both projects listed as passed'
        - 'npm run test:e2e exits 0 for the whole suite, so the existing specs of the served page pass on the new page (REQ-11)'
        - 'npx prettier --check src/test/e2e/sample.spec.js src/test/e2e/harness.js exits 0 and npm run lint exits 0'
        - 'if the jar or a browser cannot be had, the blocker is in the run document and the summary says only the cases that ran'
      risk: 'medium'
      confidence: 62
      human_review: 'none'
      escalation_triggers:
        - 'a browser is not installed: log the blocker, installing is a download that needs the owner, do not work around it'
        - 'a failure appears only in Firefox: find the cause, never add a retry or a fixed wait to hide it'
        - 'the download cannot start in a browser: the TDD says the export then reports could not start the download and records no time, test that instead of weakening the spec'
      delegation_tier: 'standard'
      results: 'tier standard, model sonnet, effort medium, profile low-cost, passed first time, inline (leaf), independently verified'
    - id: task-013
      title: 'Write the CLAUDE.md paragraph, run every gate, show the five mutations fail, record in the run document'
      source_requirements:
        prd: []
        tdd:
          - 'REQ-3, REQ-5 to REQ-11, TG-7, IMP-13, Observability and Verification (mutation checks and commands), Deployment and Rollout, RISK-1, RISK-8'
      outputs:
        - 'CLAUDE.md: one paragraph in the existing style on the bundle I/O, the sample (script, check, route, assembly), the Workspace menu, the origin and sample of a record, the served-mode rule and the new Page step, added with Edit to the file as it is'
        - 'run-0193-import-export-and-sample.md: a Verification section with each command and its result, the five mutations with their output and restoration, the statement that scripts/byte-identity.sh is the wave gate and was not run because no command-line behaviour changed, what the run could not prove (the tag run, the Native job, WebKit, the real Safari), and the notes for the wave owner (the likely_paths of W-5 miss the files of gap-005)'
      verification:
        - 'npm run test:coverage exits 0, or its only red case is "the real page: --statements HEAD passes" of check-editor-statements.test.js (CON-11), named in the run document with the output of node scripts/check-editor.mjs --statements HEAD, and git diff scripts/editor-coverage-floor.json is empty (no floor lowered)'
        - 'npm run lint exits 0, npm run format:check exits 0, npm run editor:check exits 0 and ratchet.max in layers.json is not above 99'
        - 'npm run sample:check exits 0 and wc -l of every file under src/main/editor/persistence, application, presentation and composition is under 3000'
        - 'with JAVA_HOME on JDK 25: ./mvnw test-compile pmd:check exits 0 and ./mvnw verify -DskipITs=false exits 0 (run in the background and polled), or each failure is named with its cause and shown unrelated to this run'
        - 'mutation 1: with one byte of samples/brightcart.yaml changed, npm run sample:check exits 1 and sample-brightcart.test.js fails; mutation 2: with the token check of the /samples/ route dropped, the 403 case of EditorHttpServerTest fails; mutation 3: with replaceBrowserWorkspaceFiles run before the fetch of the reset, the failing-fetch case of bundle-flows.test.js fails; mutation 4: with Export allowed while changes are unsaved, the refusal case fails; mutation 5: with the sample found by the name Brightcart instead of by sample, the renamed-workspace case fails; after each, the file is restored from the copy made before and a diff against the copy is empty and editor:check exits 0'
        - 'grep -c "bundle" CLAUDE.md shows the new paragraph and git diff CLAUDE.md shows only added lines of this run in addition to the uncommitted lines of run 0192'
      risk: 'medium'
      confidence: 72
      human_review: 'none'
      escalation_triggers:
        - 'a coverage floor would have to be lowered: add cases, never lower a floor'
        - 'a mutation does not make its test fail: the test is too weak, strengthen it and log it'
        - 'a restoration diff is not empty: restore from the copy and log it'
        - './mvnw verify fails in a test unrelated to this run: record it, do not fix it here'
      delegation_tier: 'standard'
      results: 'tier standard, model sonnet, effort medium, profile low-cost, passed first time, inline (leaf), independently verified'
```

## 5. Parallelization Plan

```yaml
parallelization_plan:
  groups:
    - id: parallel-group-001
      tasks:
        - task-002
        - task-005
        - task-006
      reason: 'Three tasks that depend only on the revised TDD and touch disjoint files: the sample script and its tests (scripts, package.json, the sample, two test files), the store and bundle edge tests, and the flows, served-mode and landing tests. None edits layers.json, names.json, the page or src/main/editor.'
      conflict_risks:
        - 'task-005 and task-006 both read harness.js and the browser-*.test.js files; neither edits them, and a helper shared by both goes in its own file'
        - 'task-005 and task-006 call names that are not in the page yet; each stays red for the right reason'
        - 'task-002 runs the harness and the page script in Node; a rebuilt page is not touched by any of the three'
    - id: parallel-group-002
      tasks:
        - task-003
        - task-004
        - task-007
      reason: 'The Java route and its tests, the workflow lines and the e2e harness and spec depend on the committed sample (task-002) and on nothing in src/main/editor; their files are disjoint (EditorHttpServer and Java tests, ci-build.yaml, src/test/e2e).'
      conflict_risks:
        - 'task-003 and task-004 both append to the run document: each writes its own section and none rewrites the file'
        - 'task-007 reads the committed page and sample; a page rebuilt by a later task is what task-012 runs against'
        - 'the page and the name lists are shared by tasks 008, 009 and 010, which therefore run one after another'
```

## 6. Human Review Gates

```yaml
human_review_gates:
  gates:
    - id: gate-001
      trigger: 'The tasks that carry a published surface or a loss-of-work path are done: the route (003), the pipeline (004), the transfer tests and code (005, 008) and the flows (009).'
      required_before: []
      required_after: ['task-003', 'task-004', 'task-005', 'task-008', 'task-009']
      reviewer_focus:
        - 'the route serves a table of one entry, needs the token header or the cookie and the Host check, and cannot be made to name another resource (DEC-2)'
        - 'the lines added to Assemble website are additive, the step in Page runs sample:check, and the criterion is marked as proved only by the tag run (DEC-3, CON-12)'
        - 'Import only creates, Reset fetches and unbundles before it replaces in one transaction and names the workspace and the loss, Export refuses while changes or a draft are pending (DEC-4 to DEC-6, REQ-10)'
        - 'no flow writes to /api/fs/ while a browser workspace is open in a served page (DEC-8, TG-5)'
        - 'no application part names a presentation function and ratchet.max is not above 99'
```

This run operates under the autonomy override of complete-run (per explicit user instruction, the human-review tiers of the default autonomy policy do not stop it by category alone). The gate above is therefore a review after the work, not a stop: the five tasks are `review_after`, their independent verifier runs at the elevated pair of the profile, and the verified diff is what a human sees at the end of the wave. The wave own gate P2 comes after W-5 and W-6, not here.

## 7. Risk Assessment

```yaml
risk_assessment:
  by_task:
    - id: task-001
      risk: 'low'
      rationale: 'A document edit checked by greps.'
    - id: task-002
      risk: 'medium'
      rationale: 'A new script that loads the whole page script in Node and writes a committed file; a stale or wrong sample is caught by the check and the tests.'
    - id: task-003
      risk: 'high'
      rationale: 'A new route on the local server and a change to the packaged application; a mistake could serve another resource or skip the token check (REQ-10 style defect for the server).'
    - id: task-004
      risk: 'high'
      rationale: 'The published pipeline: a mistake is found on a tag run, when the site is assembled; the change is additive and rehearsed locally.'
    - id: task-005
      risk: 'high'
      rationale: 'The tests that pin the atomic replace and the all-or-nothing transfer; a weak test lets Reset lose a workspace.'
    - id: task-006
      risk: 'medium'
      rationale: 'The flows tests pin the order fetch then replace, the guards on unsaved changes and the served-mode request log; they are red until the code exists.'
    - id: task-007
      risk: 'medium'
      rationale: 'Real browsers, a download and a file input; moving the base path of the hosted harness touches the spec of run 0192.'
    - id: task-008
      risk: 'high'
      rationale: 'The code that reads and replaces the stored files of a workspace in one transaction; an error here loses the visitor work.'
    - id: task-009
      risk: 'high'
      rationale: 'Reset, Import, Export and the served-mode rule; the ratchet is at its maximum and the application part must name no presentation function.'
    - id: task-010
      risk: 'medium'
      rationale: 'The card, the menu and the bootstrap run on every start of the hosted editor; the served branch of the bootstrap stays first.'
    - id: task-011
      risk: 'medium'
      rationale: 'A public page changes; the link and the sentences are pinned by two tests.'
    - id: task-012
      risk: 'medium'
      rationale: 'Real browsers and a JVM; Firefox timing is the unknown.'
    - id: task-013
      risk: 'medium'
      rationale: 'It edits the sample, the route and two parts on purpose for the mutations; the restoration is checked by a diff.'
  by_area:
    - area: 'data'
      risk: 'high'
      rationale: 'Reset replaces and Import creates workspaces that exist nowhere else; the store transaction, the fetch-first order, the naming and the stale-save case are the mitigation (RISK-1, RISK-4).'
    - area: 'infra'
      risk: 'high'
      rationale: 'The pipeline assembles the published site on a tag and the Native job proves the resource glob; neither runs on a pull request (CON-12, CON-13).'
    - area: 'security'
      risk: 'medium'
      rationale: 'One new route with the Host check and the token or cookie; imported paths pass bundlePathProblem; names are escaped in text and attributes (a test with an img onerror name); nothing leaves the browser.'
    - area: 'ui'
      risk: 'medium'
      rationale: 'The card gains four actions and the bar a menu; the 360 px layout and the accessible names must hold.'
    - area: 'api'
      risk: 'low'
      rationale: 'The route is additive and the address key is read once and never written.'
    - area: 'docs'
      risk: 'low'
      rationale: 'One paragraph of CLAUDE.md; the manual and the support statement are W-6.'
```

## 8. Confidence Assessment

```yaml
confidence_assessment:
  by_task:
    - id: task-001
      score: 86
      rationale: 'The decisions are listed one by one in gap-001 with the passages they change; the table of the eleven reads needs a reread of the code.'
    - id: task-002
      score: 80
      rationale: 'The pattern is build-editor.mjs --check; the harness already loads the page; Q-2 measured the address.'
    - id: task-003
      score: 74
      rationale: 'The server code is small, but the Java tests and the IT run need JDK 25 and a packaged jar.'
    - id: task-004
      score: 72
      rationale: 'The lines are three plus a cmp and a step; the rehearsal runs the same shell text, but the tag run is the real proof.'
    - id: task-005
      score: 74
      rationale: 'Two files of cases against a fake IndexedDB with known limits; the red state needs missing names.'
    - id: task-006
      score: 70
      rationale: 'Three files, one of which fakes the network and the server token; cases that need a DOM may have to move to the e2e spec.'
    - id: task-007
      score: 62
      rationale: 'Downloads, a file input and two browsers; the served-page part needs the new jar.'
    - id: task-008
      score: 76
      rationale: 'Two small parts over a store that already exists; the fake serialises readwrite transactions as the real one does.'
    - id: task-009
      score: 68
      rationale: 'The biggest new part; the ratchet and the served-mode table are the traps.'
    - id: task-010
      score: 66
      rationale: 'Many small edits across five files with the served branch to keep first; the 360 px layout test guards the bar.'
    - id: task-011
      score: 84
      rationale: 'A button, two sentences and two test cases.'
    - id: task-012
      score: 62
      rationale: 'Real browsers and a JVM; unknown timing in Firefox.'
    - id: task-013
      score: 72
      rationale: 'Many commands and five mutations; ./mvnw verify is long.'
```

## 9. Agent Assignment Plan

```yaml
agent_assignment_plan:
  assignments:
    - task_id: task-001
      agent_role: 'Documentation Agent'
      objective: 'Write the ten decisions of gap-001 into the TDD without changing its structure or its status.'
      context:
        prd_excerpts: []
        tdd_excerpts:
          - 'the sections named in the task and the Findings of prg-0193-import-export-and-sample.md'
      likely_files:
        - 'docs/wav/wav-025-hosted-editor/run/run-0193-import-export-and-sample/tdd-0193-import-export-and-sample.md'
        - 'docs/wav/wav-025-hosted-editor/run/run-0193-import-export-and-sample/prg-0193-import-export-and-sample.md'
      acceptance_criteria:
        - 'each decision is in the text once, in the section that owns it'
        - 'the TDD status is still draft and Q-1 to Q-4 are still resolved'
        - 'the table of the eleven reads names each site, keep or replace, and the test of each replaced site'
      verification:
        - 'the greps of the task'
      escalation_triggers:
        - 'a contradiction that needs a new decision'
      suggested_subagent_type: 'general-purpose'
      suggested_model: '(default)'
      suggested_effort: 'medium'
    - task_id: task-002
      agent_role: 'Backend Implementation Agent'
      objective: 'Write the tests of the sample script first, then scripts/build-sample.mjs, the npm scripts and the committed sample, and record the two check outputs in the run document.'
      context:
        prd_excerpts: []
        tdd_excerpts:
          - 'DEC-1, DEC-10, IMP-1, CTR-6, ASM-1, ASM-2, Q-2'
      likely_files:
        - 'scripts/build-sample.mjs'
        - 'package.json'
        - 'src/main/resources/editor-webapp/samples/brightcart.yaml'
        - 'src/test/javascript/viewpoint-kernel/build-sample-script.test.js'
        - 'src/test/javascript/viewpoint-kernel/sample-brightcart.test.js'
        - 'src/test/javascript/viewpoint-kernel/harness.js'
        - 'scripts/build-editor.mjs'
        - 'docs/wav/wav-025-hosted-editor/run/run-0193-import-export-and-sample/run-0193-import-export-and-sample.md'
      acceptance_criteria:
        - 'the sample is a pure function of the fixture folder and of the page codec'
        - 'check writes nothing and exits 0 or 1 with one line'
        - 'the unbundled sample equals the fixture files by hash'
      verification:
        - 'the commands of the task'
      escalation_triggers:
        - 'the harness cannot load a copy of the page'
        - 'a file of the fixture is skipped by the bundle'
      suggested_subagent_type: 'general-purpose'
      suggested_model: '(default)'
      suggested_effort: 'medium'
    - task_id: task-003
      agent_role: 'Backend Implementation Agent'
      objective: 'Write the Java tests that fail for the missing route, then add the one-entry route to EditorHttpServer, and show the sample loads and draws through the command line.'
      context:
        prd_excerpts: []
        tdd_excerpts:
          - 'DEC-2, CTR-3, IMP-2, Security and Privacy, Observability and Verification (Java)'
      likely_files:
        - 'src/main/java/io/morin/archicode/cli/EditorHttpServer.java'
        - 'src/test/java/io/morin/archicode/cli/EditorHttpServerTest.java'
        - 'src/test/java/io/morin/archicode/it/EditorServeIT.java'
        - 'src/test/java/io/morin/archicode/brightcart/BrightcartSampleTest.java'
        - 'src/test/java/io/morin/archicode/brightcart/Brightcart.java'
        - 'src/main/resources/application.properties'
        - 'docs/wav/wav-025-hosted-editor/run/run-0193-import-export-and-sample/run-0193-import-export-and-sample.md'
      acceptance_criteria:
        - 'the route answers only the table of one entry, with the Host check and the token header or the cookie'
        - 'the IT asserts the bytes on the jar'
        - 'no property of the native resources changed'
      verification:
        - 'the commands of the task'
      escalation_triggers:
        - 'a path built from the request'
        - 'a PMD rule to turn off'
      suggested_subagent_type: '(inline)'
      suggested_model: '(default)'
      suggested_effort: 'high'
    - task_id: task-004
      agent_role: 'Infrastructure Agent'
      objective: 'Add the sample check step to Page and the copy lines to Assemble website, then rehearse the extracted block and record the output.'
      context:
        prd_excerpts: []
        tdd_excerpts:
          - 'DEC-1, DEC-3, IMP-3, CON-12, RISK-2'
      likely_files:
        - '.github/workflows/ci-build.yaml'
        - 'docs/wav/wav-025-hosted-editor/run/run-0193-import-export-and-sample/run-0193-import-export-and-sample.md'
      acceptance_criteria:
        - 'the change is additive'
        - 'the rehearsal passes and fails when the cp line is removed'
        - 'the document says the proof on the real site is the tag run'
      verification:
        - 'the commands of the task'
      escalation_triggers:
        - 'an existing line would have to change'
      suggested_subagent_type: '(inline)'
      suggested_model: '(default)'
      suggested_effort: 'high'
    - task_id: task-005
      agent_role: 'Test Generation Agent'
      objective: 'Write the contract of the transfer functions and the bundle edges as tests that fail until the parts exist.'
      context:
        prd_excerpts: []
        tdd_excerpts:
          - 'DEC-4, DEC-5, DEC-6, DEC-12, DEC-13, CTR-1, CTR-2, CON-8, CON-9, the verification entries for browser-transfer.test.js and bundle-io.test.js as revised by task-001'
      likely_files:
        - 'src/test/javascript/viewpoint-kernel/browser-transfer.test.js'
        - 'src/test/javascript/viewpoint-kernel/bundle-io.test.js'
        - 'src/test/javascript/viewpoint-kernel/harness.js'
        - 'src/test/javascript/viewpoint-kernel/browser-store.test.js'
        - 'src/test/javascript/viewpoint-kernel/bundle-cases.test.js'
      acceptance_criteria:
        - 'every case of the TDD list is present'
        - 'the failure is a missing function of the page'
        - 'no assertion prints bytes'
      verification:
        - 'the commands of the task'
      escalation_triggers:
        - 'a case the fake cannot express'
        - 'an assertion that would print bytes'
      suggested_subagent_type: '(inline)'
      suggested_model: '(default)'
      suggested_effort: 'high'
    - task_id: task-006
      agent_role: 'Test Generation Agent'
      objective: 'Write the flows, the served-mode request log and the landing and menu tests as tests that fail until the flows and the card exist.'
      context:
        prd_excerpts: []
        tdd_excerpts:
          - 'DEC-4 to DEC-9, DEC-11, FLOW-1 to FLOW-5, RISK-4, RISK-10, decisions 1 to 5 and 8 of gap-001, the verification entries as revised by task-001'
      likely_files:
        - 'src/test/javascript/viewpoint-kernel/bundle-flows.test.js'
        - 'src/test/javascript/viewpoint-kernel/sample-served-mode.test.js'
        - 'src/test/javascript/viewpoint-kernel/sample-landing.test.js'
        - 'src/test/javascript/viewpoint-kernel/harness.js'
        - 'src/test/javascript/viewpoint-kernel/server-mode.test.js'
        - 'src/test/javascript/viewpoint-kernel/browser-landing.test.js'
        - 'src/test/javascript/viewpoint-kernel/browser-workspaces-flows.test.js'
      acceptance_criteria:
        - 'the cases of the TDD list are present, the card cases only in sample-landing.test.js'
        - 'the failure is a missing name'
        - 'no existing test file is edited'
      verification:
        - 'the commands of the task'
      escalation_triggers:
        - 'a case that needs a DOM'
        - 'an existing landing test that must change'
      suggested_subagent_type: 'general-purpose'
      suggested_model: '(default)'
      suggested_effort: 'high'
    - task_id: task-007
      agent_role: 'Test Generation Agent'
      objective: 'Make the hosted-style harness serve the site layout and write the spec of the link, the download, the file input, the reset and the served folder.'
      context:
        prd_excerpts: []
        tdd_excerpts:
          - 'DEC-3, DEC-10, IMP-12, RISK-9, Observability and Verification (sample.spec.js), decision 8 of gap-001'
      likely_files:
        - 'src/test/e2e/harness.js'
        - 'src/test/e2e/sample.spec.js'
        - 'src/test/e2e/fixtures.js'
        - 'src/test/e2e/workspace.js'
        - 'src/test/e2e/browser-workspace.spec.js'
      acceptance_criteria:
        - 'the existing browser-workspace spec passes unedited against /editor/'
        - 'the new spec is listed in two projects and fails for the missing feature'
      verification:
        - 'the commands of the task'
      escalation_triggers:
        - 'a browser is not installed'
        - 'a fixed wait would be needed'
      suggested_subagent_type: 'general-purpose'
      suggested_model: '(default)'
      suggested_effort: 'high'
    - task_id: task-008
      agent_role: 'Frontend Implementation Agent'
      objective: 'Write the two persistence parts and the optional sample property of the store, register them, and make the red tests of task-005 pass.'
      context:
        prd_excerpts: []
        tdd_excerpts:
          - 'DEC-4, DEC-5, DEC-6, DEC-12, DEC-13, CTR-1, IMP-4, IMP-5, IMP-9, CON-1, CON-2'
      likely_files:
        - 'src/main/editor/persistence/browser-transfer.js'
        - 'src/main/editor/persistence/bundle-io.js'
        - 'src/main/editor/persistence/browser-store.js'
        - 'src/main/editor/persistence/bundle.js'
        - 'src/main/editor/layers.json'
        - 'src/main/editor/names.json'
        - 'src/main/resources/editor-webapp/standalone.html'
      acceptance_criteria:
        - 'task-005 tests pass and the existing store tests pass unedited'
        - 'editor:check passes and ratchet.max is at most 99'
        - 'the only fetch, Blob and file input of a bundle are in bundle-io.js'
      verification:
        - 'the commands of the task'
      escalation_triggers:
        - 'an upward name'
        - 'a replace that could leave a partial workspace'
      suggested_subagent_type: '(inline)'
      suggested_model: '(default)'
      suggested_effort: 'high'
    - task_id: task-009
      agent_role: 'Frontend Implementation Agent'
      objective: 'Write the flows part and the state, split workspaceIsServedFolder from isServedByArchiCode where the table says, and make the flows tests of task-006 pass.'
      context:
        prd_excerpts: []
        tdd_excerpts:
          - 'DEC-4 to DEC-9, IMP-6, CTR-5, FLOW-1 to FLOW-5, RISK-4, RISK-7, RISK-10, decisions 1 to 5 of gap-001'
      likely_files:
        - 'src/main/editor/application/bundle-flows.js'
        - 'src/main/editor/application/browser-workspaces.js'
        - 'src/main/editor/application/folder-session.js'
        - 'src/main/editor/model/app-state.js'
        - 'src/main/editor/persistence/folder-access.js'
        - 'src/main/editor/layers.json'
        - 'src/main/editor/names.json'
        - 'src/main/resources/editor-webapp/standalone.html'
      acceptance_criteria:
        - 'bundle-flows.test.js passes and the served-mode request log is clean'
        - 'no application part names draftTyped, openAppDialog or a presentation function'
        - 'editor:check passes and ratchet.max is at most 99'
      verification:
        - 'the commands of the task'
      escalation_triggers:
        - 'a presentation name needed by a flow'
        - 'a write to the served folder or a replace before the fetch'
      suggested_subagent_type: '(inline)'
      suggested_model: '(default)'
      suggested_effort: 'high'
    - task_id: task-010
      agent_role: 'Frontend Implementation Agent'
      objective: 'Write the card, the Workspace menu, the events, the bootstrap read of sample= and the style, and make the landing and served-mode tests pass.'
      context:
        prd_excerpts: []
        tdd_excerpts:
          - 'DEC-7, DEC-8, DEC-9, DEC-11, IMP-7, IMP-8, IF-1 to IF-5, CTR-4'
      likely_files:
        - 'src/main/editor/presentation/landing.js'
        - 'src/main/editor/presentation/top-panel.js'
        - 'src/main/editor/presentation/help-and-settings.js'
        - 'src/main/editor/style.css'
        - 'src/main/editor/composition/events.js'
        - 'src/main/editor/composition/bootstrap.js'
        - 'src/main/editor/composition/address-routing.js'
        - 'src/main/editor/names.json'
        - 'src/main/resources/editor-webapp/standalone.html'
      acceptance_criteria:
        - 'the three new landing and flows files pass and the existing card, 360 px, theme and server-mode tests pass unedited'
        - 'the served branch of the bootstrap is still first'
        - 'editor:check passes'
      verification:
        - 'the commands of the task'
      escalation_triggers:
        - 'the 360 px test fails'
        - 'an existing test needs editing'
      suggested_subagent_type: 'general-purpose'
      suggested_model: '(default)'
      suggested_effort: 'high'
    - task_id: task-011
      agent_role: 'Frontend Implementation Agent'
      objective: 'Add the button and the two true sentences to the presentation page and pin the href in two tests.'
      context:
        prd_excerpts: []
        tdd_excerpts:
          - 'DEC-10, IMP-10, CTR-4'
      likely_files:
        - 'src/site/index.html'
        - 'src/test/javascript/site.test.js'
        - 'src/test/javascript/viewpoint-kernel/sample-brightcart.test.js'
      acceptance_criteria:
        - 'the href is the address of DEC-10 and both tests read it'
        - 'the stamp is still present once'
      verification:
        - 'the commands of the task'
      escalation_triggers:
        - 'the inline script of the page catches the link'
      suggested_subagent_type: 'general-purpose'
      suggested_model: '(default)'
      suggested_effort: 'medium'
    - task_id: task-012
      agent_role: 'QA Agent'
      objective: 'Build the page and the jar, run the new spec and the whole e2e suite in Chromium and Firefox, and fix what only a real browser shows.'
      context:
        prd_excerpts: []
        tdd_excerpts:
          - 'ASM-3, ASM-4, ASM-5, RISK-3, RISK-9, Observability and Verification (the e2e spec)'
      likely_files:
        - 'src/test/e2e/sample.spec.js'
        - 'src/test/e2e/harness.js'
        - 'src/test/e2e/fixtures.js'
        - 'src/main/editor/composition/events.js'
        - 'src/main/editor/application/bundle-flows.js'
        - 'src/main/resources/editor-webapp/standalone.html'
      acceptance_criteria:
        - 'sample.spec.js and browser-workspace.spec.js pass in both projects'
        - 'npm run test:e2e passes for the whole suite'
      verification:
        - 'the commands of the task'
      escalation_triggers:
        - 'a browser is not installed'
        - 'a failure only in Firefox'
      suggested_subagent_type: 'general-purpose'
      suggested_model: '(default)'
      suggested_effort: 'high'
    - task_id: task-013
      agent_role: 'QA Agent'
      objective: 'Write the CLAUDE.md paragraph, run every gate, show the five mutations fail and restore, and write the verification and the notes in the run document.'
      context:
        prd_excerpts: []
        tdd_excerpts:
          - 'IMP-13, Observability and Verification (mutation checks and commands), Deployment and Rollout, RISK-1, RISK-8'
      likely_files:
        - 'CLAUDE.md'
        - 'docs/wav/wav-025-hosted-editor/run/run-0193-import-export-and-sample/run-0193-import-export-and-sample.md'
        - 'src/main/resources/editor-webapp/samples/brightcart.yaml'
        - 'src/main/java/io/morin/archicode/cli/EditorHttpServer.java'
        - 'src/main/editor/application/bundle-flows.js'
        - 'src/main/editor/persistence/browser-transfer.js'
        - 'scripts/editor-coverage-floor.json'
      acceptance_criteria:
        - 'every gate command is run and its result recorded'
        - 'each mutation turns its test red and is restored with an empty diff'
        - 'the paragraph is in the existing style and the uncommitted lines of run 0192 are untouched'
      verification:
        - 'the commands of the task'
      escalation_triggers:
        - 'a floor would have to be lowered'
        - 'a mutation does not fail its test'
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
        - 'npm run sample:build twice and cmp'
        - 'npm run sample:check on the tree and on a copy with one byte changed'
        - 'node --test on the two new files'
        - 'prettier check and lint'
      success_criteria:
        - 'exit 0 on the tree, exit 1 on the copy with a line named, the sample equals the fixture by hash, the address draws marketplace compared with inhouse'
    - task_id: task-003
      methods:
        - './mvnw test on the two classes'
        - './mvnw verify -DskipITs=false for EditorServeIT'
        - './mvnw test-compile pmd:check'
        - 'git diff of application.properties'
      success_criteria:
        - 'the route cases pass, the IT sees the bytes on the jar, PMD is clean and no property changed'
    - task_id: task-004
      methods:
        - 'YAML parse of the workflow'
        - 'grep of the added lines'
        - 'extracted run block executed in a scratch copy, once with and once without the cp line'
        - 'git diff --stat'
      success_criteria:
        - 'the workflow parses, the block passes and fails where expected, the diff is additive'
    - task_id: task-005
      methods:
        - 'node --test, red for the missing names'
        - 'grep for deepStrictEqual and printed byte arrays'
        - 'prettier check and lint'
      success_criteria:
        - 'the failure names a missing function of the page, not a syntax error'
    - task_id: task-006
      methods:
        - 'node --test, red for the missing names'
        - 'grep for deepStrictEqual and printed byte arrays'
        - 'git status of the existing test files'
        - 'prettier check and lint'
      success_criteria:
        - 'the failure names a missing name, no existing test file is edited'
    - task_id: task-007
      methods:
        - 'npx playwright test of the existing browser-workspace spec'
        - 'npx playwright test sample.spec.js --list'
        - 'prettier check and lint'
      success_criteria:
        - 'the existing spec passes on /editor/ and the new one is listed in two projects and fails for the missing feature'
    - task_id: task-008
      methods:
        - 'npm run editor:build then node --test on the two edge test files and the existing store tests'
        - 'npm run editor:check'
        - 'git diff of browser-store.js'
        - 'prettier check and lint'
      success_criteria:
        - 'task-005 tests pass, existing tests pass unedited, the ratchet is at most 99, the store diff is the option and the field'
    - task_id: task-009
      methods:
        - 'node --test on the flows file and the existing flows, store, server-mode and folders tests'
        - 'npm run editor:check'
        - 'grep of draftTyped in the application part'
        - 'prettier check and lint'
      success_criteria:
        - 'the flows tests pass, the remaining reds name only presentation or composition names, the ratchet is at most 99'
    - task_id: task-010
      methods:
        - 'node --test on the three new files and the existing card, 360 px, theme, server-mode, folders, structure and faithful-saves tests'
        - 'npm run editor:check'
        - 'prettier check and lint'
      success_criteria:
        - 'all pass unedited, the read of sample= precedes the first render, the ratchet is at most 99'
    - task_id: task-011
      methods:
        - 'node --test on site.test.js and sample-brightcart.test.js'
        - 'grep of the old hint sentence'
      success_criteria:
        - 'both tests read the same href, the stamp is once, the old sentence is gone'
    - task_id: task-012
      methods:
        - 'npm run editor:build and ./mvnw package'
        - 'npx playwright test of the two spec files'
        - 'npm run test:e2e'
      success_criteria:
        - 'both specs pass in chromium and firefox and the whole suite passes'
    - task_id: task-013
      methods:
        - 'npm run test:coverage, lint, format:check, editor:check, sample:check'
        - './mvnw test-compile pmd:check and ./mvnw verify -DskipITs=false'
        - 'five mutation runs with a restoration diff each'
        - 'wc -l of the editor parts'
      success_criteria:
        - 'every gate passes (the one case of check-editor-statements named when it is the only red), no floor lowered, each mutation turns its test red, each restoration diff is empty'
```

## 11. Escalation Rules

```yaml
escalation_rules:
  rules:
    - condition: 'A test and the TDD disagree'
      action: 'Decide in the TDD, change the TDD and the test together, log the decision in the prg, continue.'
    - condition: 'ratchet.max would have to rise, or a part needs a name of a layer above its own'
      action: 'Stop the task, move the dependency down or pass it as a parameter; if impossible, log a blocker and stop.'
    - condition: 'An application part would name draftTyped, openAppDialog or another presentation function'
      action: 'Move the check into the menu item and click handler of presentation or composition, or into state of model/app-state.js; never into bundle-flows.js.'
    - condition: 'A change would alter the folder-picker path or the served-folder path (openFolder, openRememberedFolder, forgetFolder, retryFolder, the served branch of the bootstrap)'
      action: 'Stop, find the smallest branch that leaves them as they were, log it; the wave says not to change them.'
    - condition: 'A flow could write to the served folder, overwrite or delete an existing workspace on Import, replace before the sample fetch succeeded, or run Reset or Delete without naming the workspace and the loss'
      action: 'Treat as a defect of the task: add the failing test first, fix, and log it as a finding; never accept it as a tradeoff.'
    - condition: 'The route would serve a path built from the request, or skip the Host check or the token or cookie'
      action: 'Stop and redo it as a table of one entry with the same checks as the page; log it.'
    - condition: 'A coverage floor would have to be lowered'
      action: 'Add cases to cover the new code; never lower a floor.'
    - condition: 'check-editor-statements.test.js (the real page against HEAD) is red because the sources of the editor are edited and not committed'
      action: 'Expected (CON-11), not a failure and not an unmeetable check: run the other files by name, name the case in the run document, and check it with node scripts/check-editor.mjs --statements HEAD only at the end of the run.'
    - condition: 'A browser of the e2e suite is not installed, JDK 25 or the jar cannot be had'
      action: 'Log the blocker; installing a browser is a download that needs the owner; continue with what does not depend on it and say in the summary which cases ran.'
    - condition: 'A failure appears only in Firefox, or the spec seems to need a wait or a retry'
      action: 'Find the cause; a retry or a fixed sleep is not a fix (one worker, no retry is the suite rule).'
    - condition: 'The rehearsal of the website assembly passes'
      action: 'Do not mark the criterion as met: the proof on the real site is the tag run, and the Native job proves the resource glob.'
    - condition: 'A task fails its verification'
      action: 'Re-dispatch once one effort step up with the failing output; a second failure is handled inline and logged as a finding.'
    - condition: 'Any task flagged human_required or review_before appears'
      action: 'None is planned. This run operates under the autonomy override of complete-run (the human tiers do not stop it by category alone); if one appears it is executed by an agent, the override is logged in the prg, and the verified diff is what a human reviews at the end.'
    - condition: 'The wave manifest needs a change (likely_paths of W-5)'
      action: 'Record it in the run document as a note for the wave owner; this run does not write the wave manifest or the wave progress log.'
    - condition: 'The uncommitted files of run 0192 would be touched by a task other than by a plain Edit of the lines it owns'
      action: 'Do not revert, stash, checkout or reformat them; edit only the lines the task owns and log it.'
```

## 12. Final Execution Manifest

```yaml
execution_manifest:
  status: 'done'
  recommendation: 'proceed_with_review'
  autonomy_level: 'medium'
  total_tasks: 13
  autonomous_tasks: 8
  review_before_tasks: 0
  review_after_tasks: 5
  human_required_tasks: 0
  blocked_tasks: 0
  critical_path_tasks:
    - task-001
    - task-005
    - task-008
    - task-009
    - task-010
    - task-012
    - task-013
  parallel_groups:
    - parallel-group-001
    - parallel-group-002
  required_human_gates:
    - gate-001
  highest_risk_tasks:
    - task-003
    - task-004
    - task-008
    - task-009
  lowest_confidence_tasks:
    - task-007
    - task-012
    - task-010
    - task-009
  next_action: 'None: Stage 11 verified every criterion; the tag run, the Native job and WebKit are the open proofs (see the run document).'
  criteria:
    - 'npm run sample:check exits 0 on the tree and 1 on a copy with one byte of the sample changed, both recorded, and the unbundled sample equals the fixture and is loaded by the editor (node) and by views generate (Java)'
    - 'EditorHttpServer serves the sample with the token or the cookie, EditorServeIT asserts it on the jar, native resources unchanged'
    - 'ci-build.yaml runs sample:check in Page and copies the sample in Assemble website; the rehearsal is recorded; the real proof is the tag run'
    - 'the three new parts are in layers.json and names.json, ratchet.max is at most 99, no part is over 3000 lines'
    - 'the seven new node test files pass and the existing card, 360 px, theme, store, bundle and server-mode tests pass unedited'
    - 'a served page opening, saving, exporting and resetting the sample sends no write or file read to /api/fs/, and the e2e spec shows the served folder unchanged'
    - 'export then delete then import is byte for byte; Import never writes to an existing workspace; Reset fetches first and names the workspace and the loss'
    - 'the e2e spec passes in chromium and firefox and the whole suite passes'
    - 'the site button and the sentences are in src/site/index.html and pinned by two tests'
    - 'test:coverage (no floor lowered), lint, format:check, editor:check, pmd and ./mvnw verify -DskipITs=false pass or their failures are named'
    - 'the five mutation checks turn their tests red with an empty restoration diff; the run document holds them and the notes for the wave owner; CLAUDE.md has its paragraph'
```
