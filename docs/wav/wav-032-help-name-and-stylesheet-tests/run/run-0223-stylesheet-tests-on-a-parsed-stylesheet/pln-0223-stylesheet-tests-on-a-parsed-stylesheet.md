---
title: Execution Plan — Stylesheet tests on a parsed stylesheet
status: done
date: 2026-11-05
related:
  - docs/wav/wav-032-help-name-and-stylesheet-tests/run/run-0223-stylesheet-tests-on-a-parsed-stylesheet/tdd-0223-stylesheet-tests-on-a-parsed-stylesheet.md
  - docs/wav/wav-032-help-name-and-stylesheet-tests/wav-032-help-name-and-stylesheet-tests.md
  - docs/wav/wav-032-help-name-and-stylesheet-tests/wbc-032-help-name-and-stylesheet-tests.md
  - src/test/javascript/viewpoint-kernel/stylesheet-support.js
  - src/test/javascript/viewpoint-kernel/css-theme-audit.test.js
  - src/test/CLAUDE.md
  - https://github.com/tmorin/archicode/issues/203
type: pln
run: 0223
wave: 032
---

# Execution Plan: Stylesheet tests on a parsed stylesheet

Profile TDD+pln: there is no PRD, so REQ-1 to REQ-5 are the IDs the TDD labels (section "PRD Traceability"), taken from row W-2 and gate P1 (criteria 4 to 7) of the wave manifest and from #203. The plan follows the TDD plus the eight findings of its Stage 5 review (progress log, Stage 5 line) that the TDD has not absorbed: task-001 amends the TDD with them before any test is written. Where the TDD and a finding differ, the finding wins. The ones that change the work: the spec files of `src/test/e2e` are 16, not 20 (ASM-3); the new e2e tests run in the job `E2E` of CI, not `Page`, and under chromium and firefox (the webkit project runs only six listed specs); the reader has self-tests in a file of its own, `stylesheet.test.js`; the run adds a NEW e2e spec file and edits no existing one (CON-4 and REQ-3 read "new file only"); the reader is the closure of DEC-7 (`sheet.rule`, `sheet.decl`, `sheet.order`, `sheet.has`), `order` returns a boolean (IF-3), and `has` gets an interface line; the unit suite of the 13 files holds 382 tests; Prettier and ESLint also cover `src/test/e2e` (CON-2).

The graph has two entry tasks that touch disjoint files: task-001 amends the TDD, task-002 builds the inventory (every assertion of the 13 files: delete with a named spec, rewrite, or new spec) in the progress log. Task-003 builds the shared reader with its self-tests and converts the audit file (the move named by the wave). Then five tasks run on disjoint files: `styles.test.js` (task-004), then four groups of the other files (task-005 to task-008), each leaving the suite green because `stylesheet-support.js` still exists; and task-009 adds the new e2e spec file the inventory calls for (at most five tests, DEC-8; no file if the inventory marks none). Task-010 removes `stylesheet-support.js` and rewrites the sentence of `src/test/CLAUDE.md`; task-011 runs every gate, assembles the commit record and writes the run record.

The conversion tasks run in parallel, so none of them writes the shared run documents: each writes its own part of the commit record to `commit-record/task-NNN.md` in the run directory (one line per deleted test, CTR-2), and task-011 merges the parts into the run document and removes the directory.

This run operates under the autonomy override of `complete-run` (read before Stage 10): no task stops for a human on its category alone. No task is `human_required`, `critical` or `review_before`, so the override changes no route; the deletion of assertions is the risk of this run (RISK-1), and gate-001 puts a fresh reader on the commit record after task-011. Nothing in this plan commits, pushes, merges or tags: those are human steps outside the plan; the wave's rule is one commit per run, which the main agent makes after the gates, with the commit record as the body.

## 1. Executive Summary

```yaml
summary:
  status: 'done'
  product_goal: 'The tests that look at the stylesheet of the editor page read a parsed stylesheet through one shared reader, so they fail when the computed rule is wrong and not when the text layout moves; every assertion that only re-proved what a Playwright spec shows is deleted with that spec named (#203).'
  technical_approach: 'Amend the TDD with the Stage 5 findings, inventory the assertions of the 13 files, move the parser of css-theme-audit.test.js to a new stylesheet.js (closure over one sheet with rule, decl, order, has, memoised per HTML string) with its self-tests, convert the 13 files by delete, rewrite or new spec in that order, add at most five e2e tests in one new spec file, remove compactStyle and stylesheet-support.js last, then run every gate.'
  total_tasks: 11
  parallel_groups: 2
  high_risk_tasks: 0
  human_review_gates: 1
  autonomy_level: 'high'
  recommendation: 'proceed_with_review'
  criteria:
    - 'grep -rl compactStyle src/test prints nothing and src/test/javascript/viewpoint-kernel/stylesheet-support.js does not exist (REQ-1)'
    - 'stylesheet.js exports loadStylesheet with rule, decl, order and has, stylesheet.test.js passes, and the kept style assertions of the 13 files use it; no assertion of the 13 files has a pattern that holds a CSS rule or a media query, nor cuts the stylesheet by position (REQ-2)'
    - 'the commit record lists each deleted test with the spec (file and test title) that covers it, or rewritten, or new spec; git status shows in src/test/e2e at most one new file and no modified existing spec; nothing under src/main/editor changed (REQ-3)'
    - 'npm run test:unit, npm run test:coverage, npm run format:check and npm run lint exit 0; npm run editor:build and npm run sample:build leave git status --short unchanged (REQ-4)'
    - 'the work went in the order css-theme-audit, styles, the rest, with compactStyle removed last (REQ-5)'
```

## 2. PRD/TDD Consistency Assessment

```yaml
consistency_assessment:
  aligned_items:
    - 'Scope, REQ-1 to REQ-5, DEC-1 to DEC-8, CTR-1, CTR-2 and IMP-1 to IMP-5 agree with row W-2 and gate P1 criteria 4 to 7 of the wave manifest; every task below traces to them'
    - 'Q-1 (the reader is a closure, DEC-7) and Q-2 (at most five new e2e tests in one new spec file, DEC-8) are resolved; no open question remains'
    - 'The current state quoted by the TDD (13 files that import compactStyle from stylesheet-support.js, the parse of css-theme-audit.test.js with styleOf, rulesOf and declarationsOf, the line of src/test/CLAUDE.md that names compactStyle) matches the files read at planning time'
  gaps:
    - id: gap-001
      type: contradiction
      description: 'Stage 5 (S2): the TDD counts 20 e2e specs; src/test/e2e holds 16 spec files, and the new e2e tests run in the job E2E of CI (not Page) under chromium and firefox, with webkit for six listed specs only.'
      impact: 'medium'
      recommendation: 'task-001 corrects ASM-3, ASM-4 and Deployment; task-002 reads the real 16 specs.'
    - id: gap-002
      type: missing_technical_design
      description: 'Stage 5 (S2): DEC-1 promises self-tests of the reader, but no file for them is in Scope or IMP-1.'
      impact: 'medium'
      recommendation: 'task-001 adds stylesheet.test.js to Scope and IMP-1; task-003 writes it (nested @media, a string holding a semicolon, two rules of one selector, zero or several matches throwing, memoisation).'
    - id: gap-003
      type: contradiction
      description: 'Stage 5 (S2): the Out of scope line and CON-4 say no change to an existing e2e spec while the Scope allows added tests and REQ-3 says additions only; a test added to an existing spec file shows as M in git diff --name-status.'
      impact: 'medium'
      recommendation: 'task-001 states one rule: a NEW spec file only (DEC-8 already says one new file); task-009 creates it and edits no existing spec, helper or fixture.'
    - id: gap-004
      type: ambiguity
      description: 'Stage 5 (S1): the Proposed Design hedges rule(rules, ...) or a closure while DEC-7 chose the closure; order returns positions in the design and a boolean in IF-3; has has no interface line; IF-3 refers to an ASM that does not exist; the delete/rewrite/add order is stated four times; "about 340 tests" is 382.'
      impact: 'low'
      recommendation: 'task-001 makes the closure the only form, order a boolean (IF-3), adds IF-4 for has, drops the dangling reference, states the order once (DEC-3) and the count 382. Tasks follow the amended TDD.'
    - id: gap-005
      type: risk
      description: 'The number of assertions to delete, rewrite or back with a new test is not known before the inventory (TDD: about 95 assertions in 13 files, grep upper bounds per file). The conversion tasks depend on it.'
      impact: 'medium'
      recommendation: 'task-002 produces the inventory in the progress log and fixes the list of claims that need a new e2e test (at most five, DEC-8); tasks 004 to 008 and 009 read that list and do not decide new specs on their own. A claim beyond five is rewritten (a property of a rule) or deleted with the reason.'
    - id: gap-006
      type: risk
      description: 'The coverage floor (scripts/editor-coverage-floor.json) can drop if a deleted test exercised paths of the page script (CON-3, RISK-3). Tasks run in parallel, so a per-task coverage run would measure a mixed tree.'
      impact: 'medium'
      recommendation: 'Coverage is measured once, in task-011, against the floor. If it breaks, task-011 restores the lost lines with an assertion on the script (not by lowering the floor), logs it as a finding, and reruns.'
    - id: gap-007
      type: ambiguity
      description: 'ASM-4: whether the browsers of Playwright are installed here. Checked at Stage 9: node_modules/.bin/playwright, the browsers chromium, firefox and webkit under ~/.cache/ms-playwright, and target/quarkus-app/quarkus-run.jar all exist, so the new spec can be run locally; the jar may predate the checkout but the stylesheet is not changed by this run.'
      impact: 'low'
      recommendation: 'task-009 runs the new spec (npx playwright test on it, JAVA_HOME a JDK 25); if a run fails for an environment reason it checks the file with format and lint only and says so, and the new tests are proved by the job E2E of CI. task-011 does not report them as run in that case.'
    - id: gap-008
      type: missing_technical_design
      description: 'Stage 9 (C scan against the repository): src/test/CLAUDE.md lists, in the bullet "The flows the specs cover", what the 16 specs cover. A new spec file adds a flow that bullet would not name, and task-010 only rewrites the sentence on compactStyle.'
      impact: 'low'
      recommendation: 'task-010 depends on task-009 and, when stylesheet-claims.spec.js exists, adds one clause to that bullet naming what the file covers; the sentence states what is true now, with no wave or run id (CON-5).'
  blocking_gaps: []
```

## 3. Execution Graph

```yaml
execution_graph:
  nodes:
    - id: task-001
      status: 'done'
      title: 'Amend the TDD with the Stage 5 findings'
      depends_on: []
      produces:
        - 'tdd-0223-stylesheet-tests-on-a-parsed-stylesheet.md amended'
      agent_role: 'Architecture Agent'
      autonomy: 'autonomous'
      risk: 'low'
      confidence: 85
    - id: task-002
      status: 'done'
      title: 'Inventory the assertions of the 13 files and decide delete, rewrite or new spec'
      depends_on: []
      produces:
        - 'prg-0223-stylesheet-tests-on-a-parsed-stylesheet.md with the section Inventory'
      agent_role: 'QA Agent'
      autonomy: 'autonomous'
      risk: 'medium'
      confidence: 68
    - id: task-003
      status: 'done'
      title: 'Build the shared reader with its self-tests and convert css-theme-audit.test.js'
      depends_on: [task-001]
      produces:
        - 'src/test/javascript/viewpoint-kernel/stylesheet.js'
        - 'src/test/javascript/viewpoint-kernel/stylesheet.test.js'
        - 'src/test/javascript/viewpoint-kernel/css-theme-audit.test.js'
      agent_role: 'Test Generation Agent'
      autonomy: 'autonomous'
      risk: 'medium'
      confidence: 76
    - id: task-004
      status: 'done'
      title: 'Convert styles.test.js'
      depends_on: [task-002, task-003]
      produces:
        - 'src/test/javascript/viewpoint-kernel/styles.test.js'
        - 'commit-record/task-004.md'
      agent_role: 'Test Generation Agent'
      autonomy: 'autonomous'
      risk: 'medium'
      confidence: 68
    - id: task-005
      status: 'done'
      title: 'Convert changes-panel and inspection-links'
      depends_on: [task-002, task-003]
      produces:
        - 'changes-panel.test.js and inspection-links.test.js converted'
        - 'commit-record/task-005.md'
      agent_role: 'Test Generation Agent'
      autonomy: 'autonomous'
      risk: 'medium'
      confidence: 70
    - id: task-006
      status: 'done'
      title: 'Convert plateau-compare and inspection-navigation'
      depends_on: [task-002, task-003]
      produces:
        - 'plateau-compare.test.js and inspection-navigation.test.js converted'
        - 'commit-record/task-006.md'
      agent_role: 'Test Generation Agent'
      autonomy: 'autonomous'
      risk: 'medium'
      confidence: 70
    - id: task-007
      status: 'done'
      title: 'Convert ui-fixes, header and theme'
      depends_on: [task-002, task-003]
      produces:
        - 'ui-fixes.test.js, header.test.js and theme.test.js converted'
        - 'commit-record/task-007.md'
      agent_role: 'Test Generation Agent'
      autonomy: 'autonomous'
      risk: 'medium'
      confidence: 72
    - id: task-008
      status: 'done'
      title: 'Convert editor-structure, editor-odds-and-ends, story-player-modal and diagram-key-folded'
      depends_on: [task-002, task-003]
      produces:
        - 'editor-structure, editor-odds-and-ends, story-player-modal and diagram-key-folded converted'
        - 'commit-record/task-008.md'
      agent_role: 'Test Generation Agent'
      autonomy: 'autonomous'
      risk: 'medium'
      confidence: 70
    - id: task-009
      status: 'done'
      title: 'Add the new e2e spec file for the claims the inventory marks as new spec'
      depends_on: [task-002]
      produces:
        - 'src/test/e2e/stylesheet-claims.spec.js (only when the inventory marks at least one claim)'
        - 'commit-record/task-009.md'
      agent_role: 'Test Generation Agent'
      autonomy: 'autonomous'
      risk: 'medium'
      confidence: 66
    - id: task-010
      status: 'done'
      title: 'Remove stylesheet-support.js and rewrite the sentence of src/test/CLAUDE.md'
      depends_on: [task-003, task-004, task-005, task-006, task-007, task-008, task-009]
      produces:
        - 'stylesheet-support.js deleted'
        - 'src/test/CLAUDE.md'
      agent_role: 'Refactoring Agent'
      autonomy: 'autonomous'
      risk: 'low'
      confidence: 88
    - id: task-011
      status: 'done'
      title: 'Run the gates, assemble the commit record and write the run record'
      depends_on: [task-009, task-010]
      produces:
        - 'run-0223-stylesheet-tests-on-a-parsed-stylesheet.md with the verification and the commit record'
        - 'prg-0223-stylesheet-tests-on-a-parsed-stylesheet.md Findings with the gate output'
      agent_role: 'QA Agent'
      autonomy: 'autonomous'
      risk: 'low'
      confidence: 78
  edges:
    - from: task-001
      to: task-003
      reason: 'the reader is written to the amended TDD (closure, boolean order, has, self-tests file)'
    - from: task-002
      to: task-004
      reason: 'each conversion follows the inventory: which spec covers a deleted claim, which claims are rewritten'
    - from: task-003
      to: task-004
      reason: 'the conversions import stylesheet.js'
    - from: task-002
      to: task-009
      reason: 'the new e2e tests are the claims the inventory marks as new spec, at most five'
    - from: task-002
      to: task-005
      reason: 'each conversion follows the inventory (also task-006, task-007, task-008)'
    - from: task-003
      to: task-005
      reason: 'the conversions import stylesheet.js (also task-006, task-007, task-008)'
    - from: task-004
      to: task-010
      reason: 'the helper goes only when no file imports it (also task-005 to task-008 and task-003)'
    - from: task-009
      to: task-010
      reason: 'the flows bullet of src/test/CLAUDE.md names the new spec file when it exists'
    - from: task-009
      to: task-011
      reason: 'the gates run on the new spec file'
    - from: task-010
      to: task-011
      reason: 'the gates run on the final tree'
```

## 4. Task Catalog

```yaml
task_catalog:
  tasks:
    - id: task-001
      title: 'Amend the TDD with the Stage 5 findings'
      source_requirements:
        prd:
          - 'No PRD; REQ-2 and REQ-3 of the TDD'
        tdd:
          - 'Scope, Out of scope, ASM-3, ASM-4, CON-4, IF-3, DEC-3, FLOW-1, Reliability, Deployment'
      outputs:
        - 'the TDD with the eight findings absorbed: 16 spec files; job E2E (chromium and firefox, webkit for six specs); stylesheet.test.js in Scope and IMP-1; new spec file only; closure only, boolean order, IF-4 for has, no dangling ASM; the delete/rewrite/add order stated once; 382 tests; Prettier and ESLint cover src/test/e2e'
      verification:
        - 'grep -c "20 specs" on the TDD prints 0'
        - 'grep -q "stylesheet.test.js" on the TDD succeeds'
        - 'grep -q "IF-4" on the TDD succeeds'
        - 'grep -c "about 340" on the TDD prints 0'
        - 'git status --short -- src package.json pom.xml prints nothing'
      risk: 'low'
      confidence: 85
      human_review: 'none'
      escalation_triggers:
        - 'a finding contradicts the repository'
      delegation_tier: 'standard'
      results: 'tier standard, model sonnet, effort medium, profile low-cost, passed first time, inline (leaf), independently verified'
    - id: task-002
      title: 'Inventory the assertions of the 13 files and decide delete, rewrite or new spec'
      source_requirements:
        prd:
          - 'No PRD; REQ-2, REQ-3 of the TDD'
        tdd:
          - 'DEC-3, DEC-4, DEC-8, FLOW-1, RISK-1, RISK-4, ASM-2'
      outputs:
        - 'a section Inventory in the progress log: one table, one row per assertion that holds a CSS rule, a media query or a cut of the style (file, test title, what it claims, decision delete or rewrite or new spec, the spec file and test title that proves it for a delete, the reason for a deletion that has none)'
        - 'the list of claims marked new spec, at most five, with the behaviour each must show in a browser'
        - 'the list of tests that read a stylesheet comment or mix script and style in one assertion (ASM-2, RISK-4)'
      verification:
        - 'grep -q "^## Inventory" on the progress log succeeds'
        - 'for each of the 13 file names, grep -q on the progress log succeeds (a loop printing the missing names prints nothing)'
        - 'grep -c "new spec" on the Inventory rows with that decision is at most 5'
        - 'git status --short -- src prints nothing'
      risk: 'medium'
      confidence: 68
      human_review: 'none'
      escalation_triggers:
        - 'a deletion cannot name a spec that proves the claim, and the claim is not a property of a rule'
        - 'more than five claims need a browser to be proved'
      delegation_tier: 'standard'
      results: 'tier standard, model sonnet, effort medium, profile low-cost, passed first time, inline (leaf), independently verified'
    - id: task-003
      title: 'Build the shared reader with its self-tests and convert css-theme-audit.test.js'
      source_requirements:
        prd:
          - 'No PRD; REQ-1, REQ-2 of the TDD'
        tdd:
          - 'DEC-1, DEC-2, DEC-7, CTR-1, IF-1 to IF-4, IMP-1, IMP-2, RISK-2'
      outputs:
        - 'stylesheet.js: styleOf, rulesOf, declarationsOf moved unchanged from css-theme-audit.test.js, and loadStylesheet(html) returning a sheet with rule(selector, at), decl(selector, property, at), order(a, b) and has(selector, at); rules carry an index in source order; rule throws on zero or several matches and names the selector, the at and the rules whose selector contains the text; the parse is memoised by the HTML string'
        - 'stylesheet.test.js: self-tests on a small sheet (nested @media, a string with a semicolon, two rules of one selector, a missing selector throwing, order true and false, has, memoisation)'
        - 'css-theme-audit.test.js imports the reader instead of defining it, reads the page with fs.readFileSync without compactStyle, with no change of verdict'
      verification:
        - 'node --test src/test/javascript/viewpoint-kernel/stylesheet.test.js src/test/javascript/viewpoint-kernel/css-theme-audit.test.js exits 0 (css-theme-audit.test.js passes on the starting repository)'
        - 'grep -c compactStyle on css-theme-audit.test.js prints 0'
        - 'npx prettier --check on the three files exits 0'
        - 'npx eslint --max-warnings 0 on the three files exits 0'
      risk: 'medium'
      confidence: 76
      human_review: 'none'
      escalation_triggers:
        - 'a verdict of the audit changes after the move'
        - 'the parse misreads a construct of the real stylesheet'
      delegation_tier: 'standard'
      results: 'tier standard, model sonnet, effort medium, profile low-cost, passed first time, inline (leaf), independently verified'
    - id: task-004
      title: 'Convert styles.test.js'
      source_requirements:
        prd:
          - 'No PRD; REQ-2, REQ-3, REQ-5 of the TDD'
        tdd:
          - 'DEC-3, DEC-6, FLOW-1, CTR-2, IMP-2, RISK-4'
      outputs:
        - 'styles.test.js with each style assertion deleted, rewritten on the sheet (decl, order, has; no literal colour; both dark blocks asserted) or left to the new e2e spec, as the inventory decides; no compactStyle; assertions on markup or script keep the HTML string'
        - 'commit-record/task-004.md: one line per deleted test, the test title then the spec (file and title) that covers it, or rewritten, or new spec'
      verification:
        - 'node --test src/test/javascript/viewpoint-kernel/styles.test.js exits 0 (it passes on the starting repository)'
        - 'grep -c compactStyle on styles.test.js prints 0'
        - 'grep -nE "indexOf|slice|substring" on styles.test.js shows none applied to the style text (hits on markup or script are read by hand)'
        - 'npx prettier --check and npx eslint --max-warnings 0 on styles.test.js exit 0'
      risk: 'medium'
      confidence: 68
      human_review: 'none'
      escalation_triggers:
        - 'a deletion has no spec that proves the behaviour and is not in the inventory as a rewrite'
        - 'a test mixes script and style and cannot be split'
      delegation_tier: 'standard'
      results: 'tier standard, model sonnet, effort medium, profile low-cost, passed first time, inline (leaf), independently verified'
    - id: task-005
      title: 'Convert changes-panel and inspection-links'
      source_requirements:
        prd:
          - 'No PRD; REQ-2, REQ-3 of the TDD'
        tdd:
          - 'DEC-3, DEC-6, FLOW-1, CTR-2, IMP-3'
      outputs:
        - 'changes-panel.test.js and inspection-links.test.js converted as task-004'
        - 'commit-record/task-005.md in the same form'
      verification:
        - 'node --test on the two files exits 0 (both pass on the starting repository)'
        - 'grep -c compactStyle on the two files prints 0 for each'
        - 'npx prettier --check and npx eslint --max-warnings 0 on the two files exit 0'
      risk: 'medium'
      confidence: 70
      human_review: 'none'
      escalation_triggers:
        - 'a deletion has no proving spec and is not a rewrite in the inventory'
      delegation_tier: 'standard'
      results: 'tier standard, model sonnet, effort medium, profile low-cost, passed first time, inline (leaf), independently verified'
    - id: task-006
      title: 'Convert plateau-compare and inspection-navigation'
      source_requirements:
        prd:
          - 'No PRD; REQ-2, REQ-3 of the TDD'
        tdd:
          - 'DEC-3, DEC-6, FLOW-1, CTR-2, IMP-3'
      outputs:
        - 'plateau-compare.test.js and inspection-navigation.test.js converted as task-004'
        - 'commit-record/task-006.md in the same form'
      verification:
        - 'node --test on the two files exits 0 (both pass on the starting repository)'
        - 'grep -c compactStyle on the two files prints 0 for each'
        - 'npx prettier --check and npx eslint --max-warnings 0 on the two files exit 0'
      risk: 'medium'
      confidence: 70
      human_review: 'none'
      escalation_triggers:
        - 'a deletion has no proving spec and is not a rewrite in the inventory'
      delegation_tier: 'standard'
      results: 'tier standard, model sonnet, effort medium, profile low-cost, passed first time, inline (leaf), independently verified'
    - id: task-007
      title: 'Convert ui-fixes, header and theme'
      source_requirements:
        prd:
          - 'No PRD; REQ-2, REQ-3 of the TDD'
        tdd:
          - 'DEC-1, DEC-3, DEC-6, FLOW-1, CTR-2, IMP-1, IMP-3'
      outputs:
        - 'ui-fixes.test.js, header.test.js and theme.test.js converted as task-004; header.test.js drops its own simpler rulesOf and ruleOf and uses the shared reader'
        - 'commit-record/task-007.md in the same form'
      verification:
        - 'node --test on the three files exits 0 (all pass on the starting repository)'
        - 'grep -c compactStyle on the three files prints 0 for each'
        - 'grep -c "rulesOf" on header.test.js shows no local definition'
        - 'npx prettier --check and npx eslint --max-warnings 0 on the three files exit 0'
      risk: 'medium'
      confidence: 72
      human_review: 'none'
      escalation_triggers:
        - 'a deletion has no proving spec and is not a rewrite in the inventory'
      delegation_tier: 'standard'
      results: 'tier standard, model sonnet, effort medium, profile low-cost, passed first time, inline (leaf), independently verified'
    - id: task-008
      title: 'Convert editor-structure, editor-odds-and-ends, story-player-modal and diagram-key-folded'
      source_requirements:
        prd:
          - 'No PRD; REQ-2, REQ-3 of the TDD'
        tdd:
          - 'DEC-3, DEC-6, FLOW-1, CTR-2, IMP-3'
      outputs:
        - 'the four files converted as task-004'
        - 'commit-record/task-008.md in the same form'
      verification:
        - 'node --test on the four files exits 0 (all pass on the starting repository)'
        - 'grep -c compactStyle on the four files prints 0 for each'
        - 'npx prettier --check and npx eslint --max-warnings 0 on the four files exit 0'
      risk: 'medium'
      confidence: 70
      human_review: 'none'
      escalation_triggers:
        - 'a deletion has no proving spec and is not a rewrite in the inventory'
      delegation_tier: 'standard'
      results: 'tier standard, model sonnet, effort medium, profile low-cost, passed first time, inline (leaf), independently verified'
    - id: task-009
      title: 'Add the new e2e spec file for the claims the inventory marks as new spec'
      source_requirements:
        prd:
          - 'No PRD; REQ-3 of the TDD'
        tdd:
          - 'DEC-4, DEC-8, CON-4, IMP-4, Deployment'
      outputs:
        - 'src/test/e2e/stylesheet-claims.spec.js with one test per claim marked new spec in the inventory, at most five, using the fixtures and helpers of src/test/e2e as they are; no existing spec, helper or fixture edited; no file when the inventory marks none'
        - 'commit-record/task-009.md: one line per new test and the deleted unit assertion it replaces'
      verification:
        - 'git status --short -- src/test/e2e shows only the one new file, or nothing'
        - 'when the file exists, npx prettier --check and npx eslint --max-warnings 0 on it exit 0'
        - 'when the file exists and the Playwright browsers are installed, npx playwright test src/test/e2e/stylesheet-claims.spec.js exits 0; if they are not, the task says so and does not report the tests as run'
      risk: 'medium'
      confidence: 66
      human_review: 'none'
      escalation_triggers:
        - 'a claim needs a change to an existing spec or helper'
        - 'a new test is flaky across the two browsers'
      delegation_tier: 'standard'
      results: 'tier standard, model sonnet, effort medium, profile low-cost, passed first time, inline (leaf), independently verified'
    - id: task-010
      title: 'Remove stylesheet-support.js and rewrite the sentence of src/test/CLAUDE.md'
      source_requirements:
        prd:
          - 'No PRD; REQ-1 of the TDD'
        tdd:
          - 'DEC-5, IMP-5, CON-5'
      outputs:
        - 'src/test/javascript/viewpoint-kernel/stylesheet-support.js deleted'
        - 'the sentence of src/test/CLAUDE.md that names compactStyle says the stylesheet is read parsed through stylesheet.js and its sheet.rule, sheet.decl, sheet.order and sheet.has, with no wave or run id'
        - 'when src/test/e2e/stylesheet-claims.spec.js exists, one clause in the bullet "The flows the specs cover" of src/test/CLAUDE.md names what it covers (gap-008)'
      verification:
        - 'grep -rl compactStyle src/test prints nothing'
        - 'test ! -e src/test/javascript/viewpoint-kernel/stylesheet-support.js succeeds'
        - 'grep -c compactCss across src/test prints 0 for each file'
        - 'node --test on the 13 converted files and stylesheet.test.js exits 0'
        - 'when src/test/e2e/stylesheet-claims.spec.js exists, grep -q stylesheet-claims on src/test/CLAUDE.md succeeds'
      risk: 'low'
      confidence: 88
      human_review: 'none'
      escalation_triggers:
        - 'a file still imports the helper'
      delegation_tier: 'cheap'
      results: 'tier cheap, model haiku, effort high, profile low-cost, passed first time, inline (leaf), independently verified'
    - id: task-011
      title: 'Run the gates, assemble the commit record and write the run record'
      source_requirements:
        prd:
          - 'No PRD; REQ-1 to REQ-5 of the TDD'
        tdd:
          - 'Observability and Verification, CON-3, RISK-3, CTR-2, ASM-4'
      outputs:
        - 'the run document with a verification section (each gate with its output) and the commit record merged from commit-record/task-NNN.md, one line per deleted test, the loss of assertions counted, the covered lines before and after, and the commit-record directory removed'
        - 'the progress log Findings with the gate output and anything not verified (for example the new e2e tests when the browsers are absent)'
      verification:
        - 'npm run test:unit exits 0'
        - 'npm run test:coverage exits 0 against scripts/editor-coverage-floor.json'
        - 'npm run format:check exits 0'
        - 'npm run lint exits 0'
        - 'npm run editor:build then npm run sample:build, then git status --short -- src/main shows no change'
        - 'grep -rl compactStyle src/test prints nothing'
        - 'git status --short -- src/test/e2e shows at most one new file and no modified file'
        - 'test ! -d commit-record in the run directory succeeds'
      risk: 'low'
      confidence: 78
      human_review: 'after'
      escalation_triggers:
        - 'the coverage floor breaks'
        - 'a gate fails twice'
      delegation_tier: 'standard'
      results: 'tier standard, model sonnet, effort medium, profile low-cost, passed first time, inline (leaf), independently verified'
```

## 5. Parallelization Plan

```yaml
parallelization_plan:
  groups:
    - id: parallel-group-001
      tasks:
        - task-001
        - task-002
      reason: 'The TDD amendment and the inventory touch different files (the TDD, the progress log) and neither needs the other.'
      conflict_risks:
        - 'task-002 reads the TDD while task-001 edits it; the inventory rules (DEC-3, DEC-8) are not changed by the amendment'
    - id: parallel-group-002
      tasks:
        - task-004
        - task-005
        - task-006
        - task-007
        - task-008
        - task-009
      reason: 'Each task owns its own test files and its own commit-record part; all only read stylesheet.js and the inventory.'
      conflict_risks:
        - 'none on files; the conversion tasks write only commit-record/task-NNN.md and never the run document or the progress log'
        - 'npm run test:coverage and the full unit suite are not run inside the group (the tree is mixed); task-011 runs them'
        - 'a task that needs a change to stylesheet.js stops and reports it instead of editing it'
```

## 6. Human Review Gates

```yaml
human_review_gates:
  gates:
    - id: gate-001
      trigger: 'task-011 done: assertions have been deleted, and the wave asks that each deletion name the spec that covers it'
      required_before: []
      required_after: ['task-011']
      reviewer_focus:
        - 'read the commit record: for each deleted test, open the named spec and check that it proves the behaviour, not that it has a similar name (RISK-1)'
        - 'the loss of assertions and the covered lines before and after'
        - 'the new e2e tests and the claims left to a rewrite or deleted for lack of a proof'
```

The run operates under the autonomy override of `complete-run`: the gate is not a stop. It is executed by a fresh reader at the end of the run (the verification stage), logged in the progress log, and the findings are named in the pull request for the author.

## 7. Risk Assessment

```yaml
risk_assessment:
  by_task:
    - id: task-001
      risk: 'low'
      rationale: 'Documentation only; findings are already written.'
    - id: task-002
      risk: 'medium'
      rationale: 'Every later deletion rests on it; a spec that is named but does not prove the claim would pass unseen (RISK-1).'
    - id: task-003
      risk: 'medium'
      rationale: 'A hand parser shared by 13 files; a misread of a rule changes verdicts silently (RISK-2).'
    - id: task-004
      risk: 'medium'
      rationale: '1582 lines with script and style assertions mixed (RISK-4).'
    - id: task-005
      risk: 'medium'
      rationale: 'Deletions of assertions; about 120 candidate lines.'
    - id: task-006
      risk: 'medium'
      rationale: 'Deletions of assertions; about 110 candidate lines.'
    - id: task-007
      risk: 'medium'
      rationale: 'Deletions of assertions and the removal of the local reader of header.test.js.'
    - id: task-008
      risk: 'medium'
      rationale: 'Four files, deletions of assertions.'
    - id: task-009
      risk: 'medium'
      rationale: 'New browser tests can be flaky and add CI time (DEC-4).'
    - id: task-010
      risk: 'low'
      rationale: 'A deletion of an unused helper once the grep is empty.'
    - id: task-011
      risk: 'low'
      rationale: 'Runs checks and writes records; the coverage floor is the one failure it can hit (RISK-3).'
  by_area:
    - area: 'docs'
      risk: 'low'
      rationale: 'The TDD, the run record and one sentence of src/test/CLAUDE.md.'
    - area: 'ui'
      risk: 'medium'
      rationale: 'Test coverage of the editor stylesheet changes shape; no shipped code changes (nothing under src/main/editor).'
```

## 8. Confidence Assessment

```yaml
confidence_assessment:
  by_task:
    - id: task-001
      score: 85
      rationale: 'The eight findings are listed one by one in the progress log.'
    - id: task-002
      score: 68
      rationale: 'About 95 assertions to classify and 16 specs to read; the count and the decisions are only known once done.'
    - id: task-003
      score: 76
      rationale: 'The parse exists and is exercised by the audit; the lookups are small.'
    - id: task-004
      score: 68
      rationale: 'Largest file, mixed script and style assertions.'
    - id: task-005
      score: 70
      rationale: 'Same method as task-004 on two files.'
    - id: task-006
      score: 70
      rationale: 'Same method as task-004 on two files.'
    - id: task-007
      score: 72
      rationale: 'Smaller files; header.test.js already has a reader to replace.'
    - id: task-008
      score: 70
      rationale: 'Four files of uneven size.'
    - id: task-009
      score: 66
      rationale: 'Depends on the inventory, on the browsers being installed here, and on a stable test in two browsers.'
    - id: task-010
      score: 88
      rationale: 'Mechanical once the grep is empty.'
    - id: task-011
      score: 78
      rationale: 'Commands are known; the coverage floor is the open point.'
```

## 9. Agent Assignment Plan

```yaml
agent_assignment_plan:
  assignments:
    - task_id: task-001
      agent_role: 'Architecture Agent'
      objective: 'Apply the Stage 5 findings to the TDD'
      context:
        prd_excerpts:
          - 'No PRD; REQ-2 and REQ-3 of the TDD'
        tdd_excerpts:
          - 'ASM-3, ASM-4, CON-2, CON-4, IF-3, DEC-3, FLOW-1, Reliability, Deployment'
      likely_files:
        - 'docs/wav/wav-032-help-name-and-stylesheet-tests/run/run-0223-stylesheet-tests-on-a-parsed-stylesheet/tdd-0223-stylesheet-tests-on-a-parsed-stylesheet.md'
      acceptance_criteria:
        - 'the eight findings are in the TDD and no code file changed'
      verification:
        - 'grep -c "20 specs" on the TDD prints 0'
        - 'grep -q "stylesheet.test.js" on the TDD succeeds'
        - 'grep -q "IF-4" on the TDD succeeds'
        - 'grep -c "about 340" on the TDD prints 0'
        - 'git status --short -- src package.json pom.xml prints nothing'
      escalation_triggers:
        - 'a finding contradicts the repository'
      suggested_subagent_type: 'general-purpose'
      suggested_model: '(default)'
      suggested_effort: 'medium'
    - task_id: task-002
      agent_role: 'QA Agent'
      objective: 'Classify every style assertion of the 13 files and fix the list of new e2e tests'
      context:
        prd_excerpts:
          - 'REQ-2, REQ-3 of the TDD'
        tdd_excerpts:
          - 'DEC-3, DEC-4, DEC-8, FLOW-1, RISK-1, RISK-4'
      likely_files:
        - 'docs/wav/wav-032-help-name-and-stylesheet-tests/run/run-0223-stylesheet-tests-on-a-parsed-stylesheet/prg-0223-stylesheet-tests-on-a-parsed-stylesheet.md'
      acceptance_criteria:
        - 'one row per assertion with its decision and the proving spec read, not guessed by name'
        - 'at most five claims marked new spec'
      verification:
        - 'grep -q "^## Inventory" on the progress log succeeds'
        - 'for each of the 13 file names, grep -q on the progress log succeeds (a loop printing the missing names prints nothing)'
        - 'grep -c "new spec" on the Inventory rows with that decision is at most 5'
        - 'git status --short -- src prints nothing'
      escalation_triggers:
        - 'more than five claims need a browser'
      suggested_subagent_type: 'general-purpose'
      suggested_model: '(default)'
      suggested_effort: 'high'
    - task_id: task-003
      agent_role: 'Test Generation Agent'
      objective: 'Write the shared reader and its self-tests, and make the audit file use it'
      context:
        prd_excerpts:
          - 'REQ-1, REQ-2 of the TDD'
        tdd_excerpts:
          - 'DEC-1, DEC-2, DEC-7, CTR-1, IF-1 to IF-4, IMP-1'
      likely_files:
        - 'src/test/javascript/viewpoint-kernel/stylesheet.js'
        - 'src/test/javascript/viewpoint-kernel/stylesheet.test.js'
        - 'src/test/javascript/viewpoint-kernel/css-theme-audit.test.js'
      acceptance_criteria:
        - 'the parsing functions are moved unchanged and the audit verdicts do not move'
        - 'a lookup with zero or several matches throws with the selector, the at and near matches'
      verification:
        - 'node --test src/test/javascript/viewpoint-kernel/stylesheet.test.js src/test/javascript/viewpoint-kernel/css-theme-audit.test.js exits 0 (css-theme-audit.test.js passes on the starting repository)'
        - 'grep -c compactStyle on css-theme-audit.test.js prints 0'
        - 'npx prettier --check on the three files exits 0'
        - 'npx eslint --max-warnings 0 on the three files exits 0'
      escalation_triggers:
        - 'a verdict of the audit changes after the move'
      suggested_subagent_type: 'general-purpose'
      suggested_model: '(default)'
      suggested_effort: 'medium'
    - task_id: task-004
      agent_role: 'Test Generation Agent'
      objective: 'Convert styles.test.js to the shared reader following the inventory'
      context:
        prd_excerpts:
          - 'REQ-2, REQ-3, REQ-5 of the TDD'
        tdd_excerpts:
          - 'DEC-3, FLOW-1, CTR-2, RISK-4'
      likely_files:
        - 'src/test/javascript/viewpoint-kernel/styles.test.js'
        - 'docs/wav/wav-032-help-name-and-stylesheet-tests/run/run-0223-stylesheet-tests-on-a-parsed-stylesheet/commit-record/task-004.md'
      acceptance_criteria:
        - 'no compactStyle, no rule pattern, no cut of the style text in the file'
        - 'every deleted test is in the commit-record part with its covering spec'
      verification:
        - 'node --test src/test/javascript/viewpoint-kernel/styles.test.js exits 0 (it passes on the starting repository)'
        - 'grep -c compactStyle on styles.test.js prints 0'
        - 'grep -nE "indexOf|slice|substring" on styles.test.js shows none applied to the style text (hits on markup or script are read by hand)'
        - 'npx prettier --check and npx eslint --max-warnings 0 on styles.test.js exit 0'
      escalation_triggers:
        - 'a deletion has no proving spec'
      suggested_subagent_type: 'general-purpose'
      suggested_model: '(default)'
      suggested_effort: 'high'
    - task_id: task-005
      agent_role: 'Test Generation Agent'
      objective: 'Convert changes-panel and inspection-links'
      context:
        prd_excerpts:
          - 'REQ-2, REQ-3 of the TDD'
        tdd_excerpts:
          - 'DEC-3, FLOW-1, CTR-2, IMP-3'
      likely_files:
        - 'src/test/javascript/viewpoint-kernel/changes-panel.test.js'
        - 'src/test/javascript/viewpoint-kernel/inspection-links.test.js'
        - 'docs/wav/wav-032-help-name-and-stylesheet-tests/run/run-0223-stylesheet-tests-on-a-parsed-stylesheet/commit-record/task-005.md'
      acceptance_criteria:
        - 'same as task-004 for the two files'
      verification:
        - 'node --test on the two files exits 0 (both pass on the starting repository)'
        - 'grep -c compactStyle on the two files prints 0 for each'
        - 'npx prettier --check and npx eslint --max-warnings 0 on the two files exit 0'
      escalation_triggers:
        - 'a deletion has no proving spec'
      suggested_subagent_type: 'general-purpose'
      suggested_model: '(default)'
      suggested_effort: 'medium'
    - task_id: task-006
      agent_role: 'Test Generation Agent'
      objective: 'Convert plateau-compare and inspection-navigation'
      context:
        prd_excerpts:
          - 'REQ-2, REQ-3 of the TDD'
        tdd_excerpts:
          - 'DEC-3, FLOW-1, CTR-2, IMP-3'
      likely_files:
        - 'src/test/javascript/viewpoint-kernel/plateau-compare.test.js'
        - 'src/test/javascript/viewpoint-kernel/inspection-navigation.test.js'
        - 'docs/wav/wav-032-help-name-and-stylesheet-tests/run/run-0223-stylesheet-tests-on-a-parsed-stylesheet/commit-record/task-006.md'
      acceptance_criteria:
        - 'same as task-004 for the two files'
      verification:
        - 'node --test on the two files exits 0 (both pass on the starting repository)'
        - 'grep -c compactStyle on the two files prints 0 for each'
        - 'npx prettier --check and npx eslint --max-warnings 0 on the two files exit 0'
      escalation_triggers:
        - 'a deletion has no proving spec'
      suggested_subagent_type: 'general-purpose'
      suggested_model: '(default)'
      suggested_effort: 'medium'
    - task_id: task-007
      agent_role: 'Test Generation Agent'
      objective: 'Convert ui-fixes, header and theme'
      context:
        prd_excerpts:
          - 'REQ-2, REQ-3 of the TDD'
        tdd_excerpts:
          - 'DEC-1, DEC-3, FLOW-1, CTR-2, IMP-1, IMP-3'
      likely_files:
        - 'src/test/javascript/viewpoint-kernel/ui-fixes.test.js'
        - 'src/test/javascript/viewpoint-kernel/header.test.js'
        - 'src/test/javascript/viewpoint-kernel/theme.test.js'
        - 'docs/wav/wav-032-help-name-and-stylesheet-tests/run/run-0223-stylesheet-tests-on-a-parsed-stylesheet/commit-record/task-007.md'
      acceptance_criteria:
        - 'same as task-004 for the three files; header.test.js has no local rulesOf or ruleOf'
      verification:
        - 'node --test on the three files exits 0 (all pass on the starting repository)'
        - 'grep -c compactStyle on the three files prints 0 for each'
        - 'grep -c "rulesOf" on header.test.js shows no local definition'
        - 'npx prettier --check and npx eslint --max-warnings 0 on the three files exit 0'
      escalation_triggers:
        - 'a deletion has no proving spec'
      suggested_subagent_type: 'general-purpose'
      suggested_model: '(default)'
      suggested_effort: 'medium'
    - task_id: task-008
      agent_role: 'Test Generation Agent'
      objective: 'Convert editor-structure, editor-odds-and-ends, story-player-modal and diagram-key-folded'
      context:
        prd_excerpts:
          - 'REQ-2, REQ-3 of the TDD'
        tdd_excerpts:
          - 'DEC-3, FLOW-1, CTR-2, IMP-3'
      likely_files:
        - 'src/test/javascript/viewpoint-kernel/editor-structure.test.js'
        - 'src/test/javascript/viewpoint-kernel/editor-odds-and-ends.test.js'
        - 'src/test/javascript/viewpoint-kernel/story-player-modal.test.js'
        - 'src/test/javascript/viewpoint-kernel/diagram-key-folded.test.js'
        - 'docs/wav/wav-032-help-name-and-stylesheet-tests/run/run-0223-stylesheet-tests-on-a-parsed-stylesheet/commit-record/task-008.md'
      acceptance_criteria:
        - 'same as task-004 for the four files'
      verification:
        - 'node --test on the four files exits 0 (all pass on the starting repository)'
        - 'grep -c compactStyle on the four files prints 0 for each'
        - 'npx prettier --check and npx eslint --max-warnings 0 on the four files exit 0'
      escalation_triggers:
        - 'a deletion has no proving spec'
      suggested_subagent_type: 'general-purpose'
      suggested_model: '(default)'
      suggested_effort: 'medium'
    - task_id: task-009
      agent_role: 'Test Generation Agent'
      objective: 'Write the new e2e tests for the claims marked new spec in the inventory'
      context:
        prd_excerpts:
          - 'REQ-3 of the TDD'
        tdd_excerpts:
          - 'DEC-4, DEC-8, CON-4, IMP-4'
      likely_files:
        - 'src/test/e2e/stylesheet-claims.spec.js'
        - 'docs/wav/wav-032-help-name-and-stylesheet-tests/run/run-0223-stylesheet-tests-on-a-parsed-stylesheet/commit-record/task-009.md'
      acceptance_criteria:
        - 'at most five tests in one new file; no existing e2e file modified; no file when the inventory marks no claim'
      verification:
        - 'git status --short -- src/test/e2e shows only the one new file, or nothing'
        - 'when the file exists, npx prettier --check and npx eslint --max-warnings 0 on it exit 0'
        - 'when the file exists and the Playwright browsers are installed, npx playwright test src/test/e2e/stylesheet-claims.spec.js exits 0; if they are not, the task says so and does not report the tests as run'
      escalation_triggers:
        - 'a claim needs a change to an existing spec or helper'
      suggested_subagent_type: 'general-purpose'
      suggested_model: '(default)'
      suggested_effort: 'high'
    - task_id: task-010
      agent_role: 'Refactoring Agent'
      objective: 'Remove the old helper and update the sentence of src/test/CLAUDE.md'
      context:
        prd_excerpts:
          - 'REQ-1 of the TDD'
        tdd_excerpts:
          - 'DEC-5, IMP-5, CON-5'
      likely_files:
        - 'src/test/javascript/viewpoint-kernel/stylesheet-support.js'
        - 'src/test/CLAUDE.md'
      acceptance_criteria:
        - 'no reference to compactStyle or compactCss under src/test and the sentences state what is true now, with no wave or run id'
      verification:
        - 'grep -rl compactStyle src/test prints nothing'
        - 'test ! -e src/test/javascript/viewpoint-kernel/stylesheet-support.js succeeds'
        - 'grep -c compactCss across src/test prints 0 for each file'
        - 'node --test on the 13 converted files and stylesheet.test.js exits 0'
        - 'when src/test/e2e/stylesheet-claims.spec.js exists, grep -q stylesheet-claims on src/test/CLAUDE.md succeeds'
      escalation_triggers:
        - 'a file still imports the helper'
      suggested_subagent_type: 'general-purpose'
      suggested_model: '(default)'
      suggested_effort: 'low'
    - task_id: task-011
      agent_role: 'QA Agent'
      objective: 'Run every gate, assemble the commit record and write the run record'
      context:
        prd_excerpts:
          - 'REQ-1 to REQ-5 of the TDD'
        tdd_excerpts:
          - 'Observability and Verification, CON-3, RISK-3, CTR-2'
      likely_files:
        - 'docs/wav/wav-032-help-name-and-stylesheet-tests/run/run-0223-stylesheet-tests-on-a-parsed-stylesheet/run-0223-stylesheet-tests-on-a-parsed-stylesheet.md'
        - 'docs/wav/wav-032-help-name-and-stylesheet-tests/run/run-0223-stylesheet-tests-on-a-parsed-stylesheet/prg-0223-stylesheet-tests-on-a-parsed-stylesheet.md'
        - 'docs/wav/wav-032-help-name-and-stylesheet-tests/run/run-0223-stylesheet-tests-on-a-parsed-stylesheet/commit-record'
      acceptance_criteria:
        - 'every gate of the Executive Summary is true or recorded as not verified with its output'
      verification:
        - 'npm run test:unit exits 0'
        - 'npm run test:coverage exits 0 against scripts/editor-coverage-floor.json'
        - 'npm run format:check exits 0'
        - 'npm run lint exits 0'
        - 'npm run editor:build then npm run sample:build, then git status --short -- src/main shows no change'
        - 'grep -rl compactStyle src/test prints nothing'
        - 'git status --short -- src/test/e2e shows at most one new file and no modified file'
        - 'test ! -d commit-record in the run directory succeeds'
      escalation_triggers:
        - 'the coverage floor breaks'
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
        - 'findings present in the TDD and no code file changed'
    - task_id: task-002
      methods:
        - 'grep checks on the progress log'
      success_criteria:
        - 'the 13 files are in the inventory and at most five claims are marked new spec'
    - task_id: task-003
      methods:
        - 'unit tests'
        - 'format'
        - 'lint'
      success_criteria:
        - 'the reader self-tests and the audit pass, the audit verdicts are unchanged, format and lint clean'
    - task_id: task-004
      methods:
        - 'unit tests'
        - 'format'
        - 'lint'
        - 'grep checks'
      success_criteria:
        - 'the file passes with no compactStyle and no cut of the style text'
    - task_id: task-005
      methods:
        - 'unit tests'
        - 'format'
        - 'lint'
        - 'grep checks'
      success_criteria:
        - 'the two files pass with no compactStyle'
    - task_id: task-006
      methods:
        - 'unit tests'
        - 'format'
        - 'lint'
        - 'grep checks'
      success_criteria:
        - 'the two files pass with no compactStyle'
    - task_id: task-007
      methods:
        - 'unit tests'
        - 'format'
        - 'lint'
        - 'grep checks'
      success_criteria:
        - 'the three files pass with no compactStyle and no local reader in header.test.js'
    - task_id: task-008
      methods:
        - 'unit tests'
        - 'format'
        - 'lint'
        - 'grep checks'
      success_criteria:
        - 'the four files pass with no compactStyle'
    - task_id: task-009
      methods:
        - 'end-to-end tests when the browsers are installed'
        - 'format'
        - 'lint'
      success_criteria:
        - 'at most one new file, no modified spec, the tests pass or the absence of browsers is stated'
    - task_id: task-010
      methods:
        - 'grep checks'
        - 'unit tests'
      success_criteria:
        - 'no reference to the old helper and the 13 files pass'
    - task_id: task-011
      methods:
        - 'unit tests'
        - 'coverage floor'
        - 'format'
        - 'lint'
        - 'generated page unchanged'
      success_criteria:
        - 'every gate exits 0, the commit record is in the run document, the commit-record directory is gone'
```

## 11. Escalation Rules

```yaml
escalation_rules:
  rules:
    - condition: 'The run operates under the autonomy override of complete-run: gate-001 and the review after task-011 are executed without a stop and logged'
      action: 'Log it in the prg and name it in the pull request for the author'
    - condition: 'A deletion cannot name a spec that proves the behaviour and the claim is not a property of a rule'
      action: 'Mark it new spec if the budget of five allows it, otherwise delete it with the reason in the commit record and log it as a finding'
    - condition: 'More than five claims need a browser to be proved (DEC-8)'
      action: 'Rewrite those that are a property of a rule, delete the others with the reason, and record the count in the prg'
    - condition: 'A verdict of css-theme-audit.test.js changes after the move of the parser'
      action: 'Stop, log it as a finding, fix the reader before converting the other files'
    - condition: 'The coverage floor breaks (CON-3)'
      action: 'Restore the lost lines with an assertion on the script, never lower the floor; log it as a finding'
    - condition: 'The Playwright browsers are not installed here'
      action: 'State it; the new e2e tests are proved by the job E2E of CI; do not report them as run'
    - condition: 'A task needs a product or architecture decision not in the TDD'
      action: 'Stop and hand it to the main agent'
    - condition: 'A task verification fails twice'
      action: 'Handle inline and log it as a finding'
```

## 12. Final Execution Manifest

```yaml
execution_manifest:
  status: 'done'
  recommendation: 'proceed_with_review'
  autonomy_level: 'high'
  total_tasks: 11
  autonomous_tasks: 11
  review_before_tasks: 0
  review_after_tasks: 0
  human_required_tasks: 0
  blocked_tasks: 0
  critical_path_tasks:
    - task-002
    - task-004
    - task-010
    - task-011
  parallel_groups:
    - parallel-group-001
    - parallel-group-002
  required_human_gates:
    - gate-001
  highest_risk_tasks:
    - task-002
    - task-004
  lowest_confidence_tasks:
    - task-009
    - task-002
    - task-004
  next_action: 'Run task-001 and task-002 together, then task-003, then tasks 004 to 009 together, then task-010, then task-011.'
  criteria:
    - 'Every criterion of the Executive Summary is true'
```
