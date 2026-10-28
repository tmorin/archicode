---
title: Execution Plan — The hosted editor, tested and told
status: draft
date: 2026-10-28
related:
  - docs/wav/wav-025-hosted-editor/run/run-0194-hosted-editor-tests-and-docs/tdd-0194-hosted-editor-tests-and-docs.md
  - docs/wav/wav-025-hosted-editor/wav-025-hosted-editor.md
  - docs/wav/wav-025-hosted-editor/run/run-0193-import-export-and-sample/pln-0193-import-export-and-sample.md
  - 'gh:tmorin/archicode#162'
type: pln
run: 0194
wave: 025
---

# Execution Plan: The hosted editor, tested and told

Profile TDD+pln: there is no PRD, so the requirement IDs REQ-1 to REQ-9 are the labels of the TDD (section "PRD Traceability"), taken from #162 Acceptance, the W-6 row of the wave plan, the P2 gate and decision D1. The run operates under the autonomy override of complete-run: a task that would otherwise stop for a human is executed by an agent, and the override is logged in the prg. No task below is `human_required`, critical or `human_review: required`. The one task that decides what a failure means (task-005) is `risk: high`, `review_after`, `hard_judgment`, which raises its independent verifier and nothing else.

The run is a test-first run by nature: the new spec is the test, the harness, the config and the documents are what it needs. No product behaviour changes; a defect found in a part of `src/main/editor` is fixed only under the stop rule of DEC-4 (one part, no change of Chromium behaviour), otherwise it is filed as a GitHub issue and the test of that engine is skipped with its reason written next to it.

Standing rules for every task:

- `src/main/resources/editor-webapp/standalone.html` is generated: `npm run editor:build` runs after any change to `src/main/editor` and before a Playwright or `node --test` run by hand. Only task-005 may touch `src/main/editor`, and only under DEC-4 (2).
- The working tree holds uncommitted work of run 0193 (`CLAUDE.md`, `src/test/e2e/sample.spec.js`, the docs of the wave). No task reverts, stashes, checks out or reformats them; `CLAUDE.md` and `sample.spec.js` are edited with `Edit` on the lines the task owns (CON-6, ASM-5).
- Nobody commits in the implement workflow; no check needs a commit, a clean `git status` or a pushed branch. A temporary change made to prove a test fails is copied aside first (into the scratchpad directory) and restored from that copy, and the restoration is checked with `cmp` against the copy.
- No retry, no fixed sleep, no longer timeout to hide a failure; a skip in a project carries its reason in the same line (CON-7).
- Java runs with `JAVA_HOME=$HOME/.sdkman/candidates/java/25.0.4-tem` (the shell `java` is 21). The jar for the e2e suite is built with `./mvnw package -Dmaven.test.skip -Dplugin.asciidoctor.skip=true -Dpmd.skip=true`.
- The e2e suite is run by name and by project (`npx playwright test <spec> --project=<engine>`), never the whole suite until task-005.

## 1. Executive Summary

```yaml
summary:
  status: 'pending'
  product_goal: 'The acceptance of #162 is one end-to-end spec that runs in Chromium, Firefox and WebKit, the button of the presentation page is clicked in a test, and the manual, CLAUDE.md and the page tell what the editor now is and what is still not tested (wave 025 W-6).'
  technical_approach: 'Install WebKit and check it starts, add the site route and the shared helpers to the hosted test server, write hosted-acceptance.spec.js (visitor without a folder picker, visitor with a picker stub that must never be called, click on the site button and a second click), add the webkit project with four specs and the CI install, run all three projects and triage each failure by the DEC-4 order while proving the spec can fail, then rewrite editor-open and add editor-browser-workspace in the manual, edit the end-to-end paragraph of CLAUDE.md, and run the gates.'
  total_tasks: 8
  parallel_groups: 2
  high_risk_tasks: 1
  human_review_gates: 1
  autonomy_level: 'medium'
  recommendation: 'proceed_with_review'
  criteria:
    - 'src/test/e2e/hosted-acceptance.spec.js exists and passes in chromium and firefox; it passes in webkit or its only failures are skipped in the webkit project with a reason written in the same line and listed in the manual and in CLAUDE.md'
    - 'the spec opens the page with showDirectoryPicker removed and finds the unsupported-browser card absent (its title `This browser isn’t supported`) and the button Open the Brightcart sample present on the landing card, opens the sample, edits, reloads and finds the edit, exports, deletes the browser workspace, imports the download and finds a bundle equal to the download byte for byte'
    - 'a second test replaces showDirectoryPicker with a counting stub and ends with zero calls, and a page.on('request') listener shows over the whole flow no POST, PUT or PATCH and no request to another origin except GETs to the CDN hosts the page names'
    - 'a third test clicks the button Try the editor on a realistic project on the served presentation page, lands on Brightcart, edits, comes back, clicks again and finds one workspace row and the edit'
    - 'the spec fails when the sample route is removed from HOSTED_ROUTES, when the card Delete handler is made to do nothing and when the import name rule is changed; each red result and each restoration (cmp) is recorded in the run document'
    - 'playwright.config.js has a webkit project whose testMatch lists exactly open-and-pages, browser-workspace, sample and hosted-acceptance, npx playwright test --list --project=webkit shows exactly those files, and ci-build.yaml installs chromium firefox webkit with a cache key that names the three'
    - 'src/doc/README.adoc no longer contains "Firefox and Safari do not", has the anchor editor-browser-workspace after editor-folders, links the sample from editor-open and from the new section, and the generated manual contains the anchor'
    - 'CLAUDE.md says three projects, which specs run in WebKit and why, the new spec, and the reworded list of what the suite does not test (real Safari, stock Firefox, Windows and macOS, native runner, real GitHub Pages, the folder picker replaced by a stub in the acceptance)'
    - 'npm run lint, npm run format:check, npm run editor:check and npm run test:unit pass (or the only red case is the CON-11 one when src/main/editor was edited); scripts/byte-identity.sh shows no difference; what could not be run here (the pull request CI, the real Safari, GitHub Pages) is named in the run document and not claimed'
```

## 2. PRD/TDD Consistency Assessment

```yaml
consistency_assessment:
  aligned_items:
    - 'REQ-1 (one spec in three engines: sample, edit, reload, export, delete, import, same bytes) is addressed by TG-1, DEC-1 (a), FLOW-1 and tasks 002, 003, 005'
    - 'REQ-2 (no unsupported sentence without showDirectoryPicker) by DEC-1 (a) and task-003'
    - 'REQ-3 (the site button opens Brightcart in one click, a second click reopens the same workspace) by TG-3, DEC-3, FLOW-2, CTR-1 and tasks 002, 003'
    - 'REQ-4 (no folder picker call; no write request and no non-GET or off-CDN request, observed by a page.on(request) listener) by DEC-1 (b), the Security and Privacy section and task-003'
    - 'REQ-5 (a webkit project and CI installs it) by TG-2, DEC-2, CTR-2, IMP-3, IMP-4 and tasks 001, 004, 005'
    - 'REQ-6 and REQ-7 (editor-open true again, the new section, CLAUDE.md, WebKit is not Safari said, what each browser covers) by TG-4, TG-5, DEC-5, DEC-6, DEC-7 and tasks 006, 007'
    - 'REQ-8 (no retry, files read back from the store and the download) by CON-1, CON-2, DEC-4 and the standing rules; REQ-9 (gates, byte-identity, CI green) by tasks 005, 008, with the pull request run left to the main agent'
  gaps:
    - id: gap-001
      type: 'risk'
      description: 'WebKit is not installed on the developer machine (~/.cache/ms-playwright holds chromium and firefox only); the install is a download and may be refused or may lack system libraries (ASM-2, RISK-1).'
      impact: 'medium'
      recommendation: 'task-001 tries the install and a launch first. If it fails, the plan continues: the config and CI are written, WebKit is not run here, and the run document and CLAUDE.md say that the WebKit proof is the pull request E2E job, never claiming a result that was not seen.'
    - id: gap-002
      type: 'ambiguity'
      description: 'Resolved at the Stage 9 scan: the TDD (corrected in this stage after the Stage 5 review, F1) names the real wording, the card title `This browser isn’t supported` of landingScreenConfig in src/main/editor/presentation/landing.js, which appears only when the browser cannot keep a workspace (no IndexedDB), not when showDirectoryPicker is missing.'
      impact: 'low'
      recommendation: 'task-003 asserts that title absent and the button Open the Brightcart sample present, and re-reads landing.js before it writes the string.'
    - id: gap-003
      type: 'missing_requirement'
      description: 'The likely_paths of W-6 in the wave manifest do not list src/main/editor/**, standalone.html or src/site/index.html, which DEC-4 and DEC-7 may need.'
      impact: 'low'
      recommendation: 'Record it in the run document as a note for the owner of the wave; this run does not write the wave manifest or the wave progress log.'
    - id: gap-004
      type: 'ambiguity'
      description: 'Resolved at the Stage 9 scan: the Asciidoctor execution convert-to-html of pom.xml is bound to the phase generate-resources and plugin.asciidoctor.skip is false by default; the TDD now names the command.'
      impact: 'low'
      recommendation: 'task-006 runs JAVA_HOME=$HOME/.sdkman/candidates/java/25.0.4-tem ./mvnw generate-resources, greps target/generated-docs/index.html, and records the command.'
  blocking_gaps: []
```

## 3. Execution Graph

```yaml
execution_graph:
  nodes:
    - id: task-001
      status: 'done'
      title: 'Install WebKit, check it starts, build the jar and run the baseline of the existing hosted specs'
      depends_on: []
      produces:
        - 'webkit in ~/.cache/ms-playwright, or the reason it could not be had, in the run document'
        - 'target/quarkus-app/quarkus-run.jar'
      agent_role: 'QA Agent'
      autonomy: 'autonomous'
      risk: 'low'
      confidence: 78
    - id: task-002
      status: 'done'
      title: 'Add the site route and siteUrl to the hosted server and move the helpers of sample.spec.js'
      depends_on: [task-001]
      produces:
        - 'src/test/e2e/harness.js'
        - 'src/test/e2e/fixtures.js'
        - 'src/test/e2e/hosted.js'
        - 'src/test/e2e/sample.spec.js'
      agent_role: 'Test Generation Agent'
      autonomy: 'autonomous'
      risk: 'medium'
      confidence: 82
    - id: task-003
      status: 'done'
      title: 'Write hosted-acceptance.spec.js (visitor without a picker, visitor with a counting stub, the click on the site)'
      depends_on: [task-002]
      produces:
        - 'src/test/e2e/hosted-acceptance.spec.js'
      agent_role: 'Test Generation Agent'
      autonomy: 'autonomous'
      risk: 'medium'
      confidence: 72
    - id: task-004
      status: 'done'
      title: 'Add the webkit project to playwright.config.js and the install and cache key to ci-build.yaml'
      depends_on: [task-001]
      produces:
        - 'playwright.config.js'
        - '.github/workflows/ci-build.yaml'
      agent_role: 'Infrastructure Agent'
      autonomy: 'autonomous'
      risk: 'medium'
      confidence: 85
    - id: task-005
      status: 'done'
      title: 'Run the three projects, triage every failure by the DEC-4 order, prove the spec can fail, record the timings'
      depends_on: [task-003, task-004]
      produces:
        - 'the suite green in chromium and firefox and in webkit, or each webkit failure fixed, skipped with its reason, or filed'
        - 'the three red results and restorations, the timings and the findings in the run document'
      agent_role: 'QA Agent'
      autonomy: 'review_after'
      risk: 'high'
      confidence: 60
    - id: task-006
      status: 'done'
      title: 'Rewrite editor-open, add editor-browser-workspace to the manual and read the presentation page against it'
      depends_on: [task-005]
      produces:
        - 'src/doc/README.adoc'
        - 'src/site/index.html only if a sentence disagrees or the click test found a defect'
      agent_role: 'Documentation Agent'
      autonomy: 'autonomous'
      risk: 'low'
      confidence: 80
    - id: task-007
      status: 'done'
      title: 'Edit the end-to-end and CI paragraphs of CLAUDE.md'
      depends_on: [task-005]
      produces:
        - 'CLAUDE.md'
      agent_role: 'Documentation Agent'
      autonomy: 'autonomous'
      risk: 'low'
      confidence: 84
    - id: task-008
      status: 'done'
      title: 'Run the gates, check the project lists, record what was proved and what was not'
      depends_on: [task-006, task-007]
      produces:
        - 'the gate results and the notes for the owner of the wave in the run document'
      agent_role: 'QA Agent'
      autonomy: 'autonomous'
      risk: 'low'
      confidence: 80
  edges:
    - from: task-001
      to: task-002
      reason: 'the jar and the browsers must exist before a spec is run'
    - from: task-001
      to: task-004
      reason: 'the install result decides whether the webkit list can be checked here'
    - from: task-002
      to: task-003
      reason: 'the spec uses siteUrl and the moved helpers'
    - from: task-003
      to: task-005
      reason: 'the spec must exist to be run'
    - from: task-004
      to: task-005
      reason: 'the webkit project must exist to be run'
    - from: task-005
      to: task-006
      reason: 'the manual names the skips and the browsers actually covered'
    - from: task-005
      to: task-007
      reason: 'CLAUDE.md names the skips and the browsers actually covered'
    - from: task-006
      to: task-008
      reason: 'the gates run on the finished documents'
    - from: task-007
      to: task-008
      reason: 'the gates run on the finished documents'
```

## 4. Task Catalog

```yaml
task_catalog:
  tasks:
    - id: task-001
      title: 'Install WebKit, check it starts, build the jar and run the baseline of the existing hosted specs'
      source_requirements:
        prd:
          - 'REQ-5'
        tdd:
          - 'ASM-2'
          - 'ASM-4'
          - 'RISK-1'
      outputs:
        - 'webkit installed with npx playwright install --with-deps webkit, or the refusal and its reason logged'
        - 'the jar built'
        - 'a line in the run document: the Playwright version, the browsers present, and the result of sample and browser-workspace in chromium and firefox'
      verification:
        - 'ls $HOME/.cache/ms-playwright lists a webkit directory, or the run document names why the install failed'
        - 'node -e "require(''@playwright/test'').webkit.launch().then(b => b.close())" exits 0 when webkit is installed'
        - 'test -f target/quarkus-app/quarkus-run.jar after JAVA_HOME=$HOME/.sdkman/candidates/java/25.0.4-tem ./mvnw package -Dmaven.test.skip -Dplugin.asciidoctor.skip=true -Dpmd.skip=true'
        - 'npx playwright test sample browser-workspace --project=chromium --project=firefox exits 0'
      risk: 'low'
      confidence: 78
      human_review: 'none'
      escalation_triggers:
        - 'the webkit install is refused, needs sudo or a password, or the launch fails for a missing system library'
        - 'the baseline specs are red before any change of this run'
      delegation_tier: 'standard'
      results: 'tier standard, model sonnet, effort medium, profile low-cost, passed first time, inline (leaf), independently verified'
    - id: task-002
      title: 'Add the site route and siteUrl to the hosted server and move the helpers of sample.spec.js'
      source_requirements:
        prd:
          - 'REQ-3'
        tdd:
          - 'DEC-3'
          - 'IMP-1'
          - 'IMP-2'
          - 'CTR-1'
          - 'ASM-1'
          - 'CON-6'
      outputs:
        - 'harness.js: the route GET / serving src/site/index.html read at each request, and siteUrl in the value startHostedPage resolves'
        - 'fixtures.js: the head comment lists siteUrl'
        - 'hosted.js: the helpers editShopDescription, openWorkspaceMenu, storedSample and waitForEditor, moved from sample.spec.js with their global comments'
        - 'sample.spec.js: only the lines that import the helpers change; no assertion changes'
      verification:
        - 'npx playwright test sample --project=chromium --project=firefox exits 0 with the same number of tests as in task-001'
        - 'node -e "const h = require(''./src/test/e2e/harness.js''); h.startHostedPage().then(async s => { const r = await fetch(s.siteUrl); console.log(r.status, (await r.text()).includes(''Try the editor'')); await s.stop(); })" prints 200 true'
        - 'npx eslint --max-warnings 0 src/test/e2e and npx prettier --check "src/test/e2e/**/*.js" exit 0'
        - 'git diff src/test/e2e/sample.spec.js shows no changed expect line other than those already changed by run 0193'
      risk: 'medium'
      confidence: 82
      human_review: 'none'
      escalation_triggers:
        - 'moving a helper changes the order or the wait of a step of sample.spec.js'
        - 'src/site/index.html loads a script or a stylesheet from outside, which would log a console error (RISK-3)'
      delegation_tier: 'standard'
      results: 'tier standard, model sonnet, effort medium, profile low-cost, passed first time, inline (leaf), independently verified'
    - id: task-003
      title: 'Write hosted-acceptance.spec.js (visitor without a picker, visitor with a counting stub, the click on the site)'
      source_requirements:
        prd:
          - 'REQ-1'
          - 'REQ-2'
          - 'REQ-3'
          - 'REQ-4'
          - 'REQ-8'
        tdd:
          - 'DEC-1'
          - 'DEC-3'
          - 'FLOW-1'
          - 'FLOW-2'
          - 'CON-2'
          - 'CON-3'
          - 'RISK-3'
      outputs:
        - 'test (a): showDirectoryPicker deleted by page.addInitScript, the unsupported-browser card (title This browser isn’t supported) absent and the button Open the Brightcart sample present, the sample opened from the card, a description changed, reload, export read from the download, the browser workspace deleted from the card with its in-page question, the download imported with setInputFiles, the stored files of the imported workspace bundled and compared with the download text by string equality, one workspace named Brightcart'
        - 'test (b): showDirectoryPicker replaced by a stub that counts and throws, the flow of (a) up to the reload, zero calls, a page.on(request) listener showing no POST, PUT or PATCH and no request to another origin except GETs to the CDN hosts the page names'
        - 'test (c): the site page loaded, the button clicked, the editor on Applications with plateau=marketplace in the address and Compare with showing past, one sample row, an edit, the site page again, a second click, still one row and the edit stored'
        - 'a head comment naming the sentences of #162 Acceptance that each test plays and saying that choosing a folder with the real picker is not tested'
      verification:
        - 'npx playwright test hosted-acceptance --project=chromium --project=firefox exits 0 and lists three tests per project'
        - 'grep -c "toBe(0)" src/test/e2e/hosted-acceptance.spec.js is at least 1 and the file holds no waitForTimeout and no retries'
        - 'no assertion prints a byte array: comparisons are of strings, lengths or Buffer.compare'
        - 'npx eslint --max-warnings 0 src/test/e2e and npx prettier --check "src/test/e2e/**/*.js" exit 0'
      risk: 'medium'
      confidence: 72
      human_review: 'none'
      escalation_triggers:
        - 'a step needs a fixed sleep, a retry or a selector by CSS where the page gives a role name'
        - 'the second click on the site creates a second row or loses the edit, which is a defect of the page (DEC-4), not of the test'
        - 'a console error from a blocked external request fails the pageErrors fixture and a route stub to 204 does not remove it'
      delegation_tier: 'standard'
      results: 'tier standard, model sonnet, effort medium, profile low-cost, passed first time, inline (leaf), independently verified'
    - id: task-004
      title: 'Add the webkit project to playwright.config.js and the install and cache key to ci-build.yaml'
      source_requirements:
        prd:
          - 'REQ-5'
          - 'REQ-9'
        tdd:
          - 'DEC-2'
          - 'IMP-3'
          - 'IMP-4'
          - 'CTR-2'
          - 'RISK-4'
      outputs:
        - 'playwright.config.js: a project webkit with devices Desktop Safari and a testMatch that is the anchored regular expression /(sample|open-and-pages|browser-workspace|hosted-acceptance)\.spec\.js$/; the comment rewritten to say WebKit is a project and why only these four'
        - 'ci-build.yaml, job E2E: the install line chromium firefox webkit with --with-deps, the cache key ending in chromium-firefox-webkit, and the comments of the steps naming the three browsers'
      verification:
        - 'npx playwright test --list --project=webkit prints only tests of the four spec files, and the set of files equals the four by a command that extracts them (sed or grep of the list output) and compares'
        - 'grep -n "chromium firefox webkit" .github/workflows/ci-build.yaml shows the install line and grep -n "chromium-firefox-webkit" shows the key'
        - 'python3 -c "import yaml,sys; yaml.safe_load(open(''.github/workflows/ci-build.yaml''))" exits 0, or the same check with the yaml parser at hand'
        - 'npx prettier --check playwright.config.js and npx eslint --max-warnings 0 playwright.config.js exit 0'
      risk: 'medium'
      confidence: 85
      human_review: 'none'
      escalation_triggers:
        - 'a testMatch regular expression also matches a spec that must not run in webkit'
        - 'the workflow edit would change a job other than E2E'
      delegation_tier: 'standard'
      results: 'tier standard, model sonnet, effort medium, profile low-cost, passed after escalation to effort high, inline (leaf), independently verified'
    - id: task-005
      title: 'Run the three projects, triage every failure by the DEC-4 order, prove the spec can fail, record the timings'
      source_requirements:
        prd:
          - 'REQ-1'
          - 'REQ-5'
          - 'REQ-7'
          - 'REQ-8'
        tdd:
          - 'DEC-4'
          - 'Q-1'
          - 'RISK-1'
          - 'RISK-2'
          - 'CON-4'
          - 'CON-7'
          - 'IMP-7'
      outputs:
        - 'the full npm run test:e2e run (all projects) and its list: counts per project and the time per project'
        - 'for every failure, its class in the order of DEC-4 (spec defect fixed; page defect in one part fixed with a node test that fails before the fix, editor:build run, ratchet.max at most 99 and no part over 3000 lines; limit of Playwright WebKit skipped with test.skip(browserName === ''webkit'', reason); defect larger than one part or changing Chromium behaviour filed as a GitHub issue and skipped in that engine with the reason)'
        - 'three mutation checks, each with the red output and the cmp of the restoration: the sample route removed from HOSTED_ROUTES, the card Delete handler made to do nothing, the import name rule changed'
        - 'the list of skips with reasons, which task-006 and task-007 copy'
      verification:
        - 'JAVA_HOME=$HOME/.sdkman/candidates/java/25.0.4-tem npm run test:e2e exits 0, or every red or skipped case is listed with its class and its reason in the run document'
        - 'grep -rn "test.skip\|retries\|waitForTimeout" src/test/e2e playwright.config.js shows no retries other than 0, no fixed wait, and every skip with a reason string'
        - 'each of the three mutations turns npx playwright test hosted-acceptance --project=chromium red and cmp of the restored file against the copy made first exits 0'
        - 'if src/main/editor changed: npm run editor:build then node scripts/check-editor.mjs --layers exits 0, ratchet.max is at most 99, and the new node test passes with the fix and fails without it'
        - 'if webkit could not be installed in task-001: the run document says that the webkit project was not run here and names the pull request E2E job as its proof'
      risk: 'high'
      confidence: 60
      human_review: 'after'
      escalation_triggers:
        - 'a fix needs more than one part of src/main/editor or changes how Chromium behaves (Q-1)'
        - 'a failure appears only in one engine and seems to call for a wait, a retry or a longer timeout'
        - 'a mutation does not turn the spec red, which means the spec cannot fail on that point'
        - 'a coverage floor or the ratchet would have to move'
      delegation_tier: 'hard_judgment'
      results: 'tier hard_judgment, model sonnet, effort high, profile low-cost, passed first time, inline (leaf), independently verified'
    - id: task-006
      title: 'Rewrite editor-open, add editor-browser-workspace to the manual and read the presentation page against it'
      source_requirements:
        prd:
          - 'REQ-6'
          - 'REQ-7'
          - 'REQ-3'
        tdd:
          - 'DEC-5'
          - 'DEC-7'
          - 'IMP-5'
          - 'CON-5'
          - 'RISK-5'
      outputs:
        - 'editor-open: the second bullet says the page works in Chrome, Edge, Brave, Opera, Firefox and Safari, keeps a workspace in the browser when no folder is chosen, still lets a folder be picked where the browser allows it, and links to the new section and to the sample'
        - 'a section [[editor-browser-workspace]] after [[editor-folders]] telling where a browser workspace lives and that it can be lost, the card (New, Open, Rename, Delete), the sample and Reset to the sample and what it loses, the address sample=brightcart and the site link, Export as a file and Import a workspace file with the bundle format and the limits read from the sources (including the 10 MB and the file name brightcart-bundle.yaml), that nothing is uploaded, that the served-folder editor never writes the served folder from this menu, and one sentence on tested engines (Chromium, Firefox, Playwright WebKit, not the real Safari) with the skips of task-005'
        - 'src/site/index.html compared once with the new text; edited only if a control name or a claim disagrees'
      verification:
        - 'grep -c "Firefox and Safari do not" src/doc/README.adoc prints 0'
        - 'grep -n "\[\[editor-browser-workspace\]\]" src/doc/README.adoc finds one anchor placed after the line of [[editor-folders]], and grep finds a reference to it in editor-open'
        - 'every button name, number and file name quoted in the new section is found by grep in src/main/editor (the command and its hits are listed in the run document)'
        - 'JAVA_HOME=$HOME/.sdkman/candidates/java/25.0.4-tem ./mvnw generate-resources is run (the plugin is on by default) and grep -rl editor-browser-workspace target/generated-docs finds the generated manual, with no new Asciidoctor warning about a missing anchor'
        - 'ManualExamplesTest and ShippedFilesTest are not edited and their inputs (the examples) are not changed'
      risk: 'low'
      confidence: 80
      human_review: 'none'
      results: 'tier standard, model sonnet, effort medium, profile low-cost, passed first time, inline (leaf), independently verified'
      escalation_triggers:
        - 'a sentence of the manual cannot be confirmed in the sources of the editor'
        - 'the Asciidoctor build fails or warns on the new cross-references'
      delegation_tier: 'standard'
    - id: task-007
      title: 'Edit the end-to-end and CI paragraphs of CLAUDE.md'
      source_requirements:
        prd:
          - 'REQ-6'
          - 'REQ-7'
        tdd:
          - 'DEC-6'
          - 'IMP-6'
          - 'CON-6'
      outputs:
        - 'the paragraph End-to-end suite: three projects, the install line chromium firefox webkit, the sentence that WebKit is not a project replaced by the rule of DEC-2 (which four specs run in WebKit and why), the new spec in the list of flows, the reworded list of what the suite does not test (the folder picker replaced in the acceptance by a stub that proves it is not called, the real Safari, the stock Firefox, Windows and macOS, the native runner, the real GitHub Pages), and the skips of task-005 if any'
        - 'the CI paragraph: the E2E job installs three browsers and the cache key names them'
        - 'the paragraph of run 0193 is touched only to cross-reference the spec'
      verification:
        - 'grep -n "is not one" CLAUDE.md finds no sentence saying WebKit is not a project'
        - 'grep -c "hosted-acceptance" CLAUDE.md is at least 1 and grep -c "chromium firefox webkit" CLAUDE.md is at least 1'
        - 'git diff CLAUDE.md shows the run 0193 paragraph (Bundle I/O and the Brightcart sample) unchanged except for a cross-reference'
        - 'npm run format:check exits 0 (CLAUDE.md is not in its list, so the check only proves nothing else broke)'
      risk: 'low'
      confidence: 84
      human_review: 'none'
      results: 'tier cheap, model haiku, effort high, profile low-cost, passed first time, inline (leaf), independently verified'
      escalation_triggers:
        - 'an Edit cannot find its target text because run 0193 changed the paragraph'
      delegation_tier: 'cheap'
    - id: task-008
      title: 'Run the gates, check the project lists, record what was proved and what was not'
      source_requirements:
        prd:
          - 'REQ-9'
        tdd:
          - 'Observability and Verification'
          - 'IMP-3'
      outputs:
        - 'a section in the run document: the commands run and their results, the three-browser counts and times, the list of skips and findings, the notes for the owner of the wave (likely_paths of W-6), and what was not proved here (the pull request CI, the real Safari, GitHub Pages, the webkit run if it could not be installed)'
      verification:
        - 'npm run lint and npm run format:check and npm run editor:check exit 0'
        - 'npm run test:unit exits 0, or its only red case is check-editor-statements.test.js (CON-11 of the run 0193 TDD) and src/main/editor was edited; if src/main/editor was not edited it must be green'
        - 'npx playwright test --list --project=webkit names exactly the four specs of the TDD'
        - 'scripts/byte-identity.sh exits 0 with no difference outside scripts/byte-identity-exceptions.txt, or the run document names why it could not run'
        - 'git status --short shows changes only in the files named by the TDD Scope (and src/main/editor plus standalone.html and a node test if DEC-4 (2) happened)'
      risk: 'low'
      confidence: 80
      human_review: 'none'
      escalation_triggers:
        - 'a gate fails for a reason outside this run (a red test of an earlier run)'
        - 'byte-identity.sh shows a difference, which no change of this run should produce'
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
        - task-004
      reason: 'The harness and helpers (task-002) and the config and CI (task-004) both need only the result of task-001 and touch different files.'
      conflict_risks:
        - 'Both run Playwright commands that start servers and browsers; the suite is one worker by design, so the two agents must not run the e2e suite at the same moment on the same machine (target/e2e is shared). task-004 uses only --list.'
        - 'playwright.config.js testMatch names hosted-acceptance.spec.js before it exists, which --list tolerates.'
    - id: parallel-group-002
      tasks:
        - task-006
        - task-007
      reason: 'The manual and CLAUDE.md both read the findings of task-005 and write different files.'
      conflict_risks:
        - 'Both copy the list of skips and the tested-engines sentence: the wording must agree, so both quote the run document list and not each other.'
```

## 6. Human Review Gates

```yaml
human_review_gates:
  gates:
    - id: gate-001
      trigger: 'task-005 is done: the verdict on every failure of the new spec and of the webkit project is a judgment, and a skip, a fix of a part of the editor or a filed issue changes what the documents may claim.'
      required_before: []
      required_after: ['task-005']
      reviewer_focus:
        - 'every skip in the webkit project carries a written reason and none hides a defect of the page that the DEC-4 order says to fix'
        - 'a fix of a part of the editor (if any) is one part, has a node test that failed before it, keeps ratchet.max at most 99, and does not change Chromium behaviour'
        - 'the three mutation checks were red and the files were restored byte for byte'
        - 'the picker stub proves zero calls and the request listener shows no write method and no off-CDN request; the run document does not claim more than the test can observe (Security and Privacy)'
```

This run operates under the autonomy override of complete-run (per the explicit instruction of the run, the human tiers of the default autonomy policy do not stop it by category alone). The gate is therefore a review after the work, not a stop: task-005 is `review_after`, its independent verifier runs at the elevated pair of the profile, and the verified diff is what a human sees at the end of the wave. The wave own gate P2 comes after this run.

## 7. Risk Assessment

```yaml
risk_assessment:
  by_task:
    - id: task-001
      risk: 'low'
      rationale: 'A download and a baseline; the only exposure is an install that is refused, which the plan handles by continuing without a local webkit run.'
    - id: task-002
      risk: 'medium'
      rationale: 'Moving helpers out of a spec that carries uncommitted work of run 0193 can change a wait; the assertions of that spec are not edited and it is re-run.'
    - id: task-003
      risk: 'medium'
      rationale: 'The first flow that deletes a browser workspace and imports it back, and the first test of the presentation page; a console error from the site page would fail the pageErrors fixture (RISK-3).'
    - id: task-004
      risk: 'medium'
      rationale: 'A wrong testMatch runs the wrong specs in webkit; a wrong workflow edit breaks the E2E job, proved only by the pull request run.'
    - id: task-005
      risk: 'high'
      rationale: 'The first run of the page in WebKit may find several defects (RISK-2); each verdict decides between a fix, a skip and an issue, and the size of the run is open at the top, bounded by the stop rule of DEC-4.'
    - id: task-006
      risk: 'low'
      rationale: 'Prose only, but a sentence that the page does not honour is a false claim (RISK-5); each quoted name and number is grepped in the sources.'
    - id: task-007
      risk: 'low'
      rationale: 'One file edited with Edit; the risk is overwriting the uncommitted paragraph of run 0193 (RISK-6).'
    - id: task-008
      risk: 'low'
      rationale: 'Gates only; byte-identity should show nothing since no Java or command-line change is made.'
  by_area:
    - area: 'ui'
      risk: 'medium'
      rationale: 'A page defect found in WebKit is fixed only when it is one part and does not change Chromium.'
    - area: 'infra'
      risk: 'medium'
      rationale: 'CI installs a third browser (about 1.3 GB of cache, one more apt install); the Build job gate is unchanged.'
    - area: 'docs'
      risk: 'low'
      rationale: 'The manual is built by Asciidoctor and its examples are untouched.'
    - area: 'data'
      risk: 'low'
      rationale: 'The test deletes a browser workspace, but only in a throwaway browser context; no file of the user is read or written.'
    - area: 'security'
      risk: 'low'
      rationale: 'No new surface; the picker stub only counts calls.'
```

## 8. Confidence Assessment

```yaml
confidence_assessment:
  by_task:
    - id: task-001
      score: 78
      rationale: 'The install is standard but not validated here; the baseline passed at the end of run 0193 (46 tests).'
    - id: task-002
      score: 82
      rationale: 'A small additive change to a harness that already has the pattern, and a move of helpers with the spec as its own test.'
    - id: task-003
      score: 72
      rationale: 'The flow is new and runs in three engines; the delete and import steps have been tested only in separate specs so far.'
    - id: task-004
      score: 85
      rationale: 'Two small edits with a list command as check; CI cannot be run here.'
    - id: task-005
      score: 60
      rationale: 'Unknown: what WebKit finds. The triage order and the stop rule bound the outcome but not its size.'
    - id: task-006
      score: 80
      rationale: 'Clear text to write from the sources; the Asciidoctor command has to be found.'
    - id: task-007
      score: 84
      rationale: 'A bounded edit of known paragraphs.'
    - id: task-008
      score: 80
      rationale: 'Commands known from CLAUDE.md; a red case outside the run is possible.'
```

## 9. Agent Assignment Plan

```yaml
agent_assignment_plan:
  assignments:
    - task_id: task-001
      agent_role: 'QA Agent'
      objective: 'Have webkit installed and startable, build the jar, and prove the existing hosted specs are green in chromium and firefox before anything changes.'
      context:
        prd_excerpts:
          - 'REQ-5: a WebKit project exists in playwright.config.js and CI installs it.'
        tdd_excerpts:
          - 'ASM-2: npx playwright install webkit works on the developer machine; not validated before implementation.'
          - 'RISK-1: if the local install fails the plan records it and leaves the WebKit proof to the pull request E2E job.'
      likely_files:
        - 'package.json'
        - 'target/quarkus-app/quarkus-run.jar'
      acceptance_criteria:
        - 'webkit is installed and launches, or the reason is in the run document'
        - 'the jar exists'
        - 'sample and browser-workspace pass in chromium and firefox'
      verification:
        - 'node -e launch of webkit exits 0'
        - 'npx playwright test sample browser-workspace --project=chromium --project=firefox exits 0'
      escalation_triggers:
        - 'the install needs a password or sudo'
        - 'a baseline spec is red'
      suggested_subagent_type: 'general-purpose'
      suggested_model: '(default)'
      suggested_effort: 'medium'
    - task_id: task-002
      agent_role: 'Test Generation Agent'
      objective: 'Make the hosted test server serve the presentation page at / and return siteUrl, and share the helpers of sample.spec.js through hosted.js.'
      context:
        prd_excerpts:
          - 'REQ-3: the site button opens the editor on Brightcart in one click.'
        tdd_excerpts:
          - 'DEC-3: add the route GET / to HOSTED_ROUTES, read at each request; startHostedPage also returns siteUrl.'
          - 'IMP-1: the helpers move; sample.spec.js is edited only to import them.'
          - 'CON-6: edit the uncommitted files with Edit, never rewrite them.'
      likely_files:
        - 'src/test/e2e/harness.js'
        - 'src/test/e2e/fixtures.js'
        - 'src/test/e2e/hosted.js'
        - 'src/test/e2e/sample.spec.js'
        - 'src/site/index.html'
      acceptance_criteria:
        - 'GET / answers 200 with the presentation page'
        - 'sample.spec.js passes in chromium and firefox with the same number of tests'
        - 'eslint and prettier pass on src/test/e2e'
      verification:
        - 'npx playwright test sample --project=chromium --project=firefox exits 0'
        - 'the node one-liner on startHostedPage prints 200 true'
      escalation_triggers:
        - 'moving a helper changes a wait of sample.spec.js'
      suggested_subagent_type: 'general-purpose'
      suggested_model: '(default)'
      suggested_effort: 'medium'
    - task_id: task-003
      agent_role: 'Test Generation Agent'
      objective: 'Write the acceptance spec of #162 as three tests that read top to bottom as the issue sentences do.'
      context:
        prd_excerpts:
          - 'REQ-1, REQ-2, REQ-3, REQ-4 and REQ-8 as in the TDD traceability.'
        tdd_excerpts:
          - 'DEC-1 (a) and (b): the picker removed, the picker stubbed and counted, a page.on(request) listener, the flow up to export, delete, import, equal bytes.'
          - 'DEC-3 and FLOW-2: the click on the site, a second click, one row and the edit.'
          - 'CON-3: external requests go to their own hosts, not to the hosted server; a failed one must not log an error; route it to 204 if the site page makes one.'
      likely_files:
        - 'src/test/e2e/hosted-acceptance.spec.js'
        - 'src/test/e2e/hosted.js'
        - 'src/test/e2e/sample.spec.js'
      acceptance_criteria:
        - 'three tests per project pass in chromium and firefox'
        - 'the byte comparison is of strings or Buffer.compare and no assertion can print a byte array'
        - 'the head comment says what is not tested (the real folder picker)'
      verification:
        - 'npx playwright test hosted-acceptance --project=chromium --project=firefox exits 0'
        - 'grep finds no waitForTimeout and at least one toBe(0)'
      escalation_triggers:
        - 'the second click creates a second row'
        - 'a step needs a sleep or a retry'
      suggested_subagent_type: 'general-purpose'
      suggested_model: '(default)'
      suggested_effort: 'high'
    - task_id: task-004
      agent_role: 'Infrastructure Agent'
      objective: 'Make webkit a project of the suite with the four specs of DEC-2 and make the E2E job install it.'
      context:
        prd_excerpts:
          - 'REQ-5 and REQ-9.'
        tdd_excerpts:
          - 'DEC-2: testMatch of open-and-pages, browser-workspace, sample, hosted-acceptance; the install line chromium firefox webkit; the cache key names the three.'
          - 'IMP-3: a check lists the project tests with --list and compares.'
      likely_files:
        - 'playwright.config.js'
        - '.github/workflows/ci-build.yaml'
      acceptance_criteria:
        - 'the webkit list names exactly the four files'
        - 'only the job E2E changes in the workflow'
      verification:
        - 'npx playwright test --list --project=webkit and the extraction of file names'
        - 'grep of the install line and the cache key; the workflow parses as YAML'
      escalation_triggers:
        - 'a regular expression matches a fifth spec'
      suggested_subagent_type: 'general-purpose'
      suggested_model: '(default)'
      suggested_effort: 'medium'
    - task_id: task-005
      agent_role: 'QA Agent'
      objective: 'Run the whole suite in three engines, give every failure its class by the order of DEC-4, show the spec can fail, and record times and findings.'
      context:
        prd_excerpts:
          - 'REQ-1, REQ-5, REQ-7, REQ-8.'
        tdd_excerpts:
          - 'DEC-4: spec defect, one-part page defect with a refactor: change commit and a node test, Playwright WebKit limit skipped with a reason, larger defect filed as an issue.'
          - 'Observability and Verification: break the sample route, the Delete handler and the import name rule in turn and record each red result.'
          - 'CON-4: ratchet.max at most 99 and no part over 3000 lines.'
      likely_files:
        - 'src/test/e2e/hosted-acceptance.spec.js'
        - 'src/test/e2e/harness.js'
        - 'src/main/editor'
        - 'src/main/resources/editor-webapp/standalone.html'
        - 'src/test/javascript/viewpoint-kernel'
      acceptance_criteria:
        - 'npm run test:e2e is green or every red or skipped case is classified in the run document'
        - 'three mutations were red and three restorations are byte identical to the copies'
        - 'no retry, no fixed wait, every skip has a reason'
      verification:
        - 'npm run test:e2e with JAVA_HOME set'
        - 'the mutation runs and the cmp commands'
        - 'node scripts/check-editor.mjs --layers if the editor changed'
      escalation_triggers:
        - 'a fix needs more than one part or changes Chromium'
        - 'a mutation leaves the spec green'
      suggested_subagent_type: '(inline)'
      suggested_model: '(default)'
      suggested_effort: '(inline)'
    - task_id: task-006
      agent_role: 'Documentation Agent'
      objective: 'Make editor-open true again and add the section that tells the browser workspace, the sample, Export, Import and what is tested.'
      context:
        prd_excerpts:
          - 'REQ-6 and REQ-7: the manual is true, links the sample, says WebKit is not Safari.'
        tdd_excerpts:
          - 'DEC-5: the second bullet of editor-open and the section editor-browser-workspace after editor-folders, written from the sources of the editor, no upgrade block (Q-2).'
          - 'DEC-7: read the presentation page against the manual and edit it only on a disagreement.'
          - 'CON-5: a reference to a missing anchor fails or warns.'
      likely_files:
        - 'src/doc/README.adoc'
        - 'src/site/index.html'
        - 'src/main/editor'
      acceptance_criteria:
        - 'the false sentence is gone and the new anchor exists after editor-folders'
        - 'every quoted name, number and file name is found in the sources'
        - 'the generated manual contains the anchor'
      verification:
        - 'greps of the anchor and of the removed sentence'
        - './mvnw generate-resources and a grep of target/generated-docs'
      escalation_triggers:
        - 'a claim cannot be confirmed in the sources'
      suggested_subagent_type: 'general-purpose'
      suggested_model: '(default)'
      suggested_effort: 'medium'
    - task_id: task-007
      agent_role: 'Documentation Agent'
      objective: 'Update the end-to-end and CI paragraphs of CLAUDE.md to three projects and the new spec, and reword what the suite does not test.'
      context:
        prd_excerpts:
          - 'REQ-6 and REQ-7.'
        tdd_excerpts:
          - 'DEC-6: the list of edits to the paragraph; the run 0193 paragraph only cross-referenced.'
          - 'CON-6: Edit on the text as it stands.'
      likely_files:
        - 'CLAUDE.md'
      acceptance_criteria:
        - 'no sentence says WebKit is not a project'
        - 'the new spec, the install line and the reworded limits are present'
      verification:
        - 'greps for is not one, hosted-acceptance and chromium firefox webkit'
        - 'git diff CLAUDE.md shows the run 0193 paragraph unchanged but for a cross-reference'
      escalation_triggers:
        - 'an Edit target text has changed'
      suggested_subagent_type: 'general-purpose'
      suggested_model: 'haiku'
      suggested_effort: 'low'
    - task_id: task-008
      agent_role: 'QA Agent'
      objective: 'Run the gates and write down what was proved, what was skipped and what could not be proved here.'
      context:
        prd_excerpts:
          - 'REQ-9: the gates and the pull request run.'
        tdd_excerpts:
          - 'Observability and Verification: lint, format:check, editor:check, test:unit, the webkit list, byte-identity.'
      likely_files:
        - 'docs/wav/wav-025-hosted-editor/run/run-0194-hosted-editor-tests-and-docs/run-0194-hosted-editor-tests-and-docs.md'
      acceptance_criteria:
        - 'every gate result is in the run document'
        - 'the notes for the owner of the wave and the unproved items are written'
      verification:
        - 'the commands of the verification list'
      escalation_triggers:
        - 'a gate fails outside the files of this run'
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
        - 'webkit launch from node'
        - 'e2e baseline in chromium and firefox'
      success_criteria:
        - 'webkit launches or the refusal is recorded; the baseline is green'
    - task_id: task-002
      methods:
        - 'e2e run of sample'
        - 'node one-liner on the hosted server'
        - 'eslint and prettier'
      success_criteria:
        - 'the same tests pass; GET / answers 200 with the page; no lint finding'
    - task_id: task-003
      methods:
        - 'e2e run of the new spec in two engines'
        - 'grep for forbidden waits'
      success_criteria:
        - 'three tests pass per engine; no waitForTimeout; the picker was called zero times'
    - task_id: task-004
      methods:
        - 'playwright --list'
        - 'grep and YAML parse of the workflow'
      success_criteria:
        - 'the webkit project lists exactly four spec files; the workflow installs and caches three browsers'
    - task_id: task-005
      methods:
        - 'full e2e run'
        - 'three mutations with restoration check'
        - 'node tests and editor:check if the editor changed'
      success_criteria:
        - 'green, or every failure classified; the spec fails on each mutation; restorations are identical'
    - task_id: task-006
      methods:
        - 'grep against the sources'
        - 'Asciidoctor build'
      success_criteria:
        - 'the false sentence is gone, the anchor is in the generated manual, quoted names exist in the sources'
    - task_id: task-007
      methods:
        - 'grep and git diff'
      success_criteria:
        - 'the stale sentence is gone and the run 0193 paragraph is intact'
    - task_id: task-008
      methods:
        - 'lint, format:check, editor:check, test:unit, byte-identity.sh, playwright --list'
      success_criteria:
        - 'all pass, or the only red case is the named CON-11 one; no byte-identity difference'
```

## 11. Escalation Rules

```yaml
escalation_rules:
  rules:
    - condition: 'A test and the TDD disagree'
      action: 'Decide in the TDD, change the TDD and the test together, log the decision in the prg, continue.'
    - condition: 'The webkit install is refused, needs sudo or a password, or webkit does not start'
      action: 'Log the blocker; installing a browser is a download that needs the owner. Write the config and CI anyway, run what can run, and say in the run document and in CLAUDE.md that the WebKit proof is the pull request E2E job. Never claim a WebKit result that was not seen.'
    - condition: 'A failure appears only in one engine and seems to call for a wait, a retry or a longer timeout'
      action: 'Find the cause. A retry, a fixed sleep or a longer timeout is not a fix (one worker, no retry is the suite rule); classify the failure by the order of DEC-4.'
    - condition: 'A page defect needs more than one part of src/main/editor, or changes how Chromium behaves'
      action: 'Stop that fix (Q-1). File a GitHub issue on tmorin/archicode, skip the test in that engine with the reason in the same line, and list it in the manual and in CLAUDE.md.'
    - condition: 'A fix of a part of src/main/editor is made'
      action: 'Add a node test that fails before it, run npm run editor:build, keep ratchet.max at most 99 and every part under 3000 lines, and name the commit refactor: change in the run document.'
    - condition: 'check-editor-statements.test.js (the real page against HEAD) is red because src/main/editor is edited and not committed'
      action: 'Expected (CON-11 of the run 0193 TDD, not a constraint of this TDD): run the other node files by name, name the case in the run document, and check it only at the end of the run.'
    - condition: 'A mutation of the proof does not turn the spec red'
      action: 'The spec cannot fail at that point: strengthen the assertion, repeat the mutation, and log the weakness as a finding.'
    - condition: 'The site page makes a request that logs a console error'
      action: 'Route that request to an empty 204 in the test; if the error is the page own, it is a defect (DEC-4).'
    - condition: 'A coverage floor or ratchet.max would have to move'
      action: 'Add cases or move the dependency down; never lower a floor or raise the ratchet.'
    - condition: 'The uncommitted files of run 0193 (CLAUDE.md, sample.spec.js) would be touched beyond the lines a task owns'
      action: 'Do not revert, stash, checkout or reformat them; edit only the owned lines with Edit and log it.'
    - condition: 'A sentence of the manual cannot be confirmed in the sources of the editor'
      action: 'Remove or soften the sentence; the manual never states what the page does not do.'
    - condition: 'A task fails its verification'
      action: 'Re-dispatch once one effort step up with the failing output; a second failure is handled inline and logged as a finding.'
    - condition: 'Any task flagged human_required or review_before appears'
      action: 'None is planned. This run operates under the autonomy override of complete-run (the human tiers do not stop it by category alone); if one appears it is executed by an agent, the override is logged in the prg, and the verified diff is what a human reviews at the end.'
    - condition: 'The wave manifest needs a change (likely_paths of W-6)'
      action: 'Record it in the run document as a note for the wave owner; this run does not write the wave manifest or the wave progress log.'
```

## 12. Final Execution Manifest

```yaml
execution_manifest:
  status: 'done'
  recommendation: 'proceed_with_review'
  autonomy_level: 'medium'
  total_tasks: 8
  autonomous_tasks: 7
  review_before_tasks: 0
  review_after_tasks: 1
  human_required_tasks: 0
  blocked_tasks: 0
  critical_path_tasks:
    - task-001
    - task-002
    - task-003
    - task-005
    - task-006
    - task-008
  parallel_groups:
    - parallel-group-001
    - parallel-group-002
  required_human_gates:
    - gate-001
  highest_risk_tasks:
    - task-005
  lowest_confidence_tasks:
    - task-005
    - task-003
    - task-001
  next_action: 'Run task-001: install WebKit, check that it starts, build the jar, and run the baseline of sample and browser-workspace in chromium and firefox.'
  criteria:
    - 'hosted-acceptance.spec.js passes in chromium and firefox and in webkit, or each webkit failure is skipped with a written reason and listed in the manual and in CLAUDE.md'
    - 'the picker stub is called zero times and the request listener shows no write method and no off-CDN request; the delete-then-import-back gives equal bytes'
    - 'the site button is clicked on the served presentation page and a second click reopens the same workspace with its edit'
    - 'the spec turns red on each of the three mutations and each restoration is byte identical'
    - 'the webkit project lists exactly four specs and CI installs and caches three browsers'
    - 'the manual and CLAUDE.md are true: the false sentence is gone, the new anchor builds, the limits of the suite are reworded'
    - 'lint, format:check, editor:check, test:unit and byte-identity pass, or the only red case is named; what could not be proved here is written down'
```
