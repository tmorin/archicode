---
title: Execution Plan — CI changes filter
status: done
date: 2026-11-01
related:
  - docs/wav/wav-030-pages-ci-and-toolbar/run/run-0211-ci-changes-filter/tdd-0211-ci-changes-filter.md
  - docs/wav/wav-030-pages-ci-and-toolbar/wav-030-pages-ci-and-toolbar.md
  - docs/wav/wav-030-pages-ci-and-toolbar/wbc-030-pages-ci-and-toolbar.md
  - .github/workflows/ci-build.yaml
  - https://github.com/tmorin/archicode/issues/192
type: pln
run: 0211
wave: 030
---

# Execution Plan: CI changes filter

Profile TDD+pln: there is no PRD, so REQ-1 to REQ-7 are the IDs the TDD labels (section "PRD Traceability"), taken from the first two criteria of gate P1 and the W-1 row of the wave manifest and from #192. The plan follows the TDD plus the Stage 5 review findings F-1 to F-10 (progress log, Findings), which the TDD has not absorbed: task-001 amends the TDD with them before any test is written. Where the TDD and a finding differ, the finding wins (the one that matters most: F-1, the `fetch-depth` expression of the TDD is always `1`, so the filter would fail open on every pull request and skip nothing, with a green run).

The order is test first, as the profile asks: task-002 writes `changes-map.test.js` red, task-003 writes `scripts/changes.mjs` and turns the map, decision, list, diff, summary and audit groups green, task-004 edits the workflow and turns the last two groups (workflow text and gate shell) green. The wave is sequential by the author's decision of 2026-11-01 (one run at a time), and inside this run the chain below is the genuine dependency order, so no task runs in parallel with another.

This run operates under the autonomy override of `complete-run` (read before Stage 10): no task stops for a human on its category alone. task-004 changes the job `Build`, which gates the publish and release jobs (a live capability), so it keeps the hard_judgment tier, an elevated verifier (its `risk` is high) and a review by the author at the pull request; it is not `human_required` and not `critical`, so the override changes no route. Nothing in this plan commits, pushes, merges or tags: those are human steps outside the plan, and the TDD says it does not authorise them.

## 1. Executive Summary

```yaml
summary:
  status: 'done'
  product_goal: 'A pull request that cannot reach the jar does not wait for the end-to-end suite (#192): a Changes job classifies the changed files with one map and each of the four jobs runs only when the map asks for it, while a push, a tag and a dispatch run everything and Build stays red unless every asked job succeeded.'
  technical_approach: 'Amend the TDD with the review findings, write the node test red (map, decision, list, diff, summary, audit of the readers, workflow text, gate shell), write scripts/changes.mjs (ordered rules, default all, fail open), edit ci-build.yaml (Changes job, needs and if on the four jobs, Build gate true/success or false/skipped), rewrite the CI paragraph of .github/CLAUDE.md, then run the gates and write in the run record which part is proved on the pull request and which only on main and on a tag.'
  total_tasks: 6
  parallel_groups: 0
  high_risk_tasks: 1
  human_review_gates: 1
  autonomy_level: 'medium'
  recommendation: 'proceed_with_review'
  criteria:
    - 'node scripts/changes.mjs --list exits 0 and prints one line per git ls-files path with its rule id and jobs, and the five cases of REQ-1 hold in changes-map.test.js (README.adoc runs java and page; page.html and ci-build.yaml run all four; CLAUDE.md runs none; a path with no rule runs all four; a push, a tag and a dispatch run all four) (REQ-1, REQ-3, REQ-5)'
    - 'The workflow has a job Changes, an if on each of Java, Page, Kernel and E2E that reads needs.Changes.outputs.<job> and still the dispatch test, and Build lists Changes in needs and passes only true/success or false/skipped per job (REQ-2, REQ-5)'
    - 'The fetch-depth expression of the Changes job is a quoted-string expression that evaluates to 0 on a pull request, and a test checks that exact text (F-1)'
    - 'changes-map.test.js audits the readers of the four jobs (include_str!, Java literals, tags.path, node and e2e path literals) against the map and fails on a sabotage copy that removes kernel from the viewpoint-kernel JSON rule (REQ-3)'
    - 'The job summary says which jobs were skipped and why (REQ-4)'
    - '.github/CLAUDE.md describes the Changes job, the gate rule, the map and its test, and how to see a decision, and the root CLAUDE.md is untouched (REQ-6)'
    - 'The run record says which part is proved on the pull request and which on the run of main and on a tag, and lists the deviations of DEC-3 from #192 (REQ-7)'
    - 'npm run test:unit, npm run format:check and npm run lint exit 0, and git diff --stat shows no change under src/main, pom.xml, package.json or the jobs Targets to Publish (CON-5, CON-6)'
```

## 2. PRD/TDD Consistency Assessment

```yaml
consistency_assessment:
  aligned_items:
    - 'Scope, REQ-1 to REQ-7, DEC-1 to DEC-10, CTR-1 to CTR-4 and IMP-1 to IMP-5 agree with the W-1 row and the P1 gate of the wave manifest; every task below traces to them'
    - 'No question is open in the TDD (Q-1 to Q-3 resolved by DEC-5, DEC-3 and DEC-7; ASM-1 checked against the runner image readme at Stage 6)'
    - 'The current state of ci-build.yaml quoted by the TDD (four jobs, Build needs and if, first step name and env, PUBLISHES, Release accepting skipped) matches the file read at planning time (Build step at line 293, PUBLISHES at line 291)'
    - 'No test pins the old step name (grep of the repository outside docs/wav finds it only in the workflow itself), so the renamed first step of Build breaks nothing'
  gaps:
    - id: gap-001
      type: contradiction
      description: 'F-1 (S3): fetch-depth: ${{ github.event_name == ''pull_request'' && 0 || 1 }} is always 1, because 0 is falsy in an Actions expression. On a pull request the checkout is shallow, git diff base...head lacks the merge-base, the script fails open to all four and the filter never skips anything, with a green run that looks right.'
      impact: 'high'
      recommendation: 'task-001 changes IMP-3 and DEC-7 to the string form ''0'' and ''1'' (a non-empty string is truthy), and task-002 adds to the workflow group a text check of that exact expression; task-004 writes it.'
    - id: gap-002
      type: contradiction
      description: 'F-2 (S2): the dry run on this branch prints none only while the branch holds nothing but docs/wav files; once the run is implemented the branch contains scripts/changes.mjs and .github/**, which R-06 maps to all four (RISK-2).'
      impact: 'medium'
      recommendation: 'task-001 words the dry run as against the commit before the implementation, node scripts/changes.mjs --event pull_request --base main --head 9e7cca2 (the diff main...9e7cca2 holds only docs/wav files, checked at planning time); task-006 runs exactly that.'
    - id: gap-003
      type: ambiguity
      description: 'F-3 (S2) and F-9 (S1): the audit says string literals after __dirname, REPO or ROOT, but the repository writes path.resolve(__dirname, ''../../../main/resources/...'') with .., path.join(REPO, ''docs/architecture'') with slashes and path.join(ROOT, ''src'', ''test'', ''resources'', ''x'') one literal per segment; the Java split form Path.of(''src'', ''main'', ...) is not a literal that starts with src/; a Java test that walks a folder is covered only by the every-tracked-file-under-it rule.'
      impact: 'medium'
      recommendation: 'task-001 states the resolution rule: __dirname is the folder of the file, REPO and ROOT the repository root, .. normalised, literals joined with a slash, resolution stops at the first non-literal and keeps the prefix as a folder, a path that leaves the repository is skipped; A2 also reads Path.of and Paths.get calls whose arguments are all literals, joined with a slash; a folder is satisfied only when every tracked file under it includes the job (this covers the walks of ShippedFilesTest). task-002 writes the audit that way.'
    - id: gap-004
      type: ambiguity
      description: 'F-4 (S2): the names of the environment variables of the gate are not fixed, and it is not said whether they are job-level or step-level, yet the test runs the extracted run block with those names.'
      impact: 'medium'
      recommendation: 'task-001 lists the nine names in CTR-4: CHANGES, and JAVA_WANTED, JAVA_RESULT, PAGE_WANTED, PAGE_RESULT, KERNEL_WANTED, KERNEL_RESULT, E2E_WANTED, E2E_RESULT; they are step-level env of the first step of Build (as the four are today); the test sets exactly these.'
    - id: gap-005
      type: ambiguity
      description: 'F-5 (S2): the claim that a manual-only pull request goes from about 9.5 to about 5 minutes counts the four jobs and Build only; Targets and Native (native image, timeout 45 minutes, on every pull request, not in the needs of Build) are unchanged and out of scope, so the time before the pull request is fully green may not change.'
      impact: 'medium'
      recommendation: 'task-001 words the figure as the time of Build, names Native as not filtered by this run, and adds a deferred item (filter Native, to decide after reading its duration); task-006 reads the duration of Native from the last run of main if gh is usable and records it, otherwise records not read.'
    - id: gap-006
      type: contradiction
      description: 'F-6 (S2): the count of deviations from #192 disagrees across the TDD (four paths plus R-09 in the rationale, four rows in RISK-6, four deviations in IMP-5, the table has five rows that differ), and R-09 is not the only row that runs less than #192 (R-17 and R-18 take E2E away from src/test/javascript/**).'
      impact: 'medium'
      recommendation: 'task-001 writes one list of deviations in DEC-3 (id, direction, one-line reason: R-03 more for page, R-09 less, R-13 more, R-17 more and narrows e2e, R-18 narrows e2e, R-20 more) and makes RISK-6 and IMP-5 point to it; task-006 copies that list into the run record.'
    - id: gap-007
      type: ambiguity
      description: 'F-8 (S1): --event has no default and it is not said whether the decision is also printed on stdout when GITHUB_OUTPUT is set.'
      impact: 'low'
      recommendation: 'Decided here: --event is required unless --list is given (missing: exit 2, one line on stderr), because a default of push would be wrong for a contributor and a default of pull_request needs a base; the decision is always printed on stdout, and GITHUB_OUTPUT and GITHUB_STEP_SUMMARY are written in addition when set. task-001 writes it into CTR-2 and IF-2.'
    - id: gap-008
      type: ambiguity
      description: 'F-10 (S1) and F-7 (S1): case 9 says every combination of four outputs and four results (up to 4 to the 8th runs of bash), and Q-1 to Q-3 restate DEC-5, DEC-3 and DEC-7.'
      impact: 'low'
      recommendation: 'task-001 words case 9 as one loop per job over its pair (the pair of a job is independent of the others) plus one all-pass and one mixed case, and replaces the Q section by No open question with the pointers on one line, keeping one of the two reviewer paragraphs under the diagrams.'
    - id: gap-009
      type: risk
      description: 'The wave pull request edits .github/** and scripts/changes.mjs, so R-06 runs all four on it: the skipping path, the push and tag behaviour and Build with skipped jobs under a required check are not proved by that pull request (RISK-2, REQ-7).'
      impact: 'medium'
      recommendation: 'Proved by the node test of the gate and by the dry run on the commit before the implementation; the first real skip, the run of main after the merge and the next release tag prove the rest. task-006 writes this in the run record; nothing in this plan authorises a merge or a tag.'
    - id: gap-010
      type: contradiction
      description: 'Stage 9 scan against the repository: Open Questions Q-2 of the TDD (and the Stage 6 note of the prg) say the three mvnw calls of the job E2E pass -Dmaven.test.skip, at lines 237, 337 and 352 of ci-build.yaml. Only line 237 is in E2E (job at lines 197 to 269); lines 337 and 352 are the -Dmaven.test.skip lines of the two mvnw deploy steps of Build (at lines 335 and 350). The conclusion behind R-09 holds (E2E builds its jar with ./mvnw package -Dmaven.test.skip, so a test class cannot reach it), the evidence is mis-cited.'
      impact: 'low'
      recommendation: 'task-001 words the No open question pointer for DEC-3 R-09 as: the one mvnw call of the job E2E, ./mvnw package with -Dmaven.test.skip, at line 237 of ci-build.yaml; no line number for Build is cited; harness.js line 139 stays as the evidence for R-13.'
    - id: gap-011
      type: ambiguity
      description: 'Stage 9 scan: the TDD says the dry run on the branch prints none for the four jobs, and IMP-1 says the script prints the decision and appends java=true|false lines to GITHUB_OUTPUT, but no section says what the decision looks like on stdout; the plan checks it as four lines that say false (task-003: four true on a push). The two words, none and false, name the same fact and one test must read one of them.'
      impact: 'low'
      recommendation: 'Decided here: the decision on stdout is the four name=value lines in the order java, page, kernel, e2e (java=false ...), the same lines GITHUB_OUTPUT receives; none is the word of the --list jobs column, not of the decision. task-001 writes it into CTR-2 and IF-2 and words the dry run as four lines that say false; task-002 reads exactly these lines.'
  blocking_gaps: []
```

## 3. Execution Graph

```yaml
execution_graph:
  nodes:
    - id: task-001
      status: 'done'
      title: 'Amend the TDD with the Stage 5 findings F-1 to F-10'
      depends_on: []
      produces:
        - 'tdd-0211-ci-changes-filter.md amended'
      agent_role: 'Architecture Agent'
      autonomy: 'autonomous'
      risk: 'low'
      confidence: 80
    - id: task-002
      status: 'done'
      title: 'Write src/test/javascript/changes-map.test.js, red'
      depends_on: [task-001]
      produces:
        - 'src/test/javascript/changes-map.test.js'
      agent_role: 'Test Generation Agent'
      autonomy: 'autonomous'
      risk: 'medium'
      confidence: 72
    - id: task-003
      status: 'done'
      title: 'Write scripts/changes.mjs and turn the map, decision, list, diff, outputs and audit groups green'
      depends_on: [task-002]
      produces:
        - 'scripts/changes.mjs'
      agent_role: 'Backend Implementation Agent'
      autonomy: 'autonomous'
      risk: 'medium'
      confidence: 75
    - id: task-004
      status: 'done'
      title: 'Edit ci-build.yaml: the Changes job, the needs and if of the four jobs, the Build gate'
      depends_on: [task-003]
      produces:
        - '.github/workflows/ci-build.yaml'
      agent_role: 'Infrastructure Agent'
      autonomy: 'review_after'
      risk: 'high'
      confidence: 70
    - id: task-005
      status: 'done'
      title: 'Rewrite the CI paragraph of .github/CLAUDE.md'
      depends_on: [task-004]
      produces:
        - '.github/CLAUDE.md'
      agent_role: 'Documentation Agent'
      autonomy: 'autonomous'
      risk: 'low'
      confidence: 85
    - id: task-006
      status: 'done'
      title: 'Run the gates and write the run record (proved where, deviations, dry run)'
      depends_on: [task-003, task-004, task-005]
      produces:
        - 'run-0211-ci-changes-filter.md with the verification and the proved-where statement'
        - 'prg-0211-ci-changes-filter.md Findings with the gate output'
      agent_role: 'QA Agent'
      autonomy: 'autonomous'
      risk: 'low'
      confidence: 82
  edges:
    - from: task-001
      to: task-002
      reason: 'the test is written against the amended TDD (fetch-depth text, nine variable names, resolution rule of the audit, --event required)'
    - from: task-002
      to: task-003
      reason: 'the script is written to turn the red test green; the test names the groups it expects'
    - from: task-003
      to: task-004
      reason: 'the Changes job runs scripts/changes.mjs, and task-004 runs the whole test file, whose map groups must already be green'
    - from: task-004
      to: task-005
      reason: 'the paragraph describes the workflow as it is written, including the names of the steps and the gate'
    - from: task-005
      to: task-006
      reason: 'the gates and the git status check cover every file the run changes'
```

## 4. Task Catalog

```yaml
task_catalog:
  tasks:
    - id: task-001
      title: 'Amend the TDD with the Stage 5 findings F-1 to F-10'
      source_requirements:
        prd:
          - 'REQ-2'
          - 'REQ-3'
          - 'REQ-7'
        tdd:
          - 'DEC-3'
          - 'DEC-6'
          - 'DEC-7'
          - 'CTR-2'
          - 'CTR-4'
          - 'IMP-3'
          - 'Non-Goals'
          - 'Observability and Verification'
          - 'Open Questions'
      outputs:
        - 'IMP-3 and DEC-7 write fetch-depth as ${{ github.event_name == ''pull_request'' && ''0'' || ''1'' }} (quoted strings) and case 8 of Observability and Verification checks that exact text'
        - 'The dry run of Observability and Verification names the commit before the implementation (--head 9e7cca2), not HEAD of the branch'
        - 'DEC-6 states the resolution rule of the audit (gap-003) and that A2 also reads Path.of and Paths.get with literal arguments and that a folder needs every tracked file under it'
        - 'CTR-4 lists the nine names (CHANGES, JAVA_WANTED, JAVA_RESULT, PAGE_WANTED, PAGE_RESULT, KERNEL_WANTED, KERNEL_RESULT, E2E_WANTED, E2E_RESULT) as step-level env of the first step of Build, and case 9 is one loop per job plus an all-pass and a mixed case'
        - 'Non-Goals says the figure is the time of Build and names Native as not filtered; Deferred Work has a new item for it'
        - 'DEC-3 has one list of deviations from #192 with its direction, RISK-6 and IMP-5 point to it'
        - 'CTR-2 and IF-2 say --event is required unless --list and that the decision is always printed on stdout'
        - 'Open Questions is No open question with the pointers on one line, and its pointer for R-09 cites the one mvnw call of the job E2E (line 237 of ci-build.yaml), not the lines 337 and 352 of the Build deploy steps (gap-010)'
        - 'CTR-2 and IF-2 say the decision on stdout is the four name=value lines java, page, kernel, e2e (the lines GITHUB_OUTPUT receives), and the dry run of Observability and Verification expects four lines that say false (gap-011)'
      verification:
        - 'grep -q "&& ''0'' || ''1''" on the TDD succeeds and grep -c "&& 0 || 1" on the TDD prints 0'
        - 'grep -c "E2E_RESULT" on the TDD prints at least 1 and grep -c "JAVA_WANTED" prints at least 1'
        - 'grep -q "9e7cca2" on the TDD succeeds'
        - 'grep -q "No open question" on the TDD succeeds and grep -c "^- `Q-[123]` (resolved" on the TDD prints 0'
        - 'grep -c "lines 237, 337 and 352" on the TDD prints 0 and grep -q "line 237" on the TDD succeeds'
        - 'grep -q "java=false" on the TDD succeeds'
        - 'git diff --stat -- src scripts .github pom.xml package.json prints nothing'
      risk: 'low'
      confidence: 80
      human_review: 'none'
      escalation_triggers:
        - 'A finding contradicts the repository when read (follow the repository, write the reading in the Findings of the prg)'
        - 'A fix needs a product decision (none is expected: F-5 is a wording choice, taken in gap-005)'
      delegation_tier: 'standard'
      results: 'tier standard, model sonnet, effort medium, profile low-cost, passed first time, inline (leaf), independently verified'
    - id: task-002
      title: 'Write src/test/javascript/changes-map.test.js, red'
      source_requirements:
        prd:
          - 'REQ-1'
          - 'REQ-2'
          - 'REQ-3'
          - 'REQ-4'
          - 'REQ-5'
        tdd:
          - 'DEC-2'
          - 'DEC-3'
          - 'DEC-4'
          - 'DEC-6'
          - 'DEC-7'
          - 'DEC-8'
          - 'DEC-10'
          - 'CTR-1'
          - 'CTR-2'
          - 'CTR-3'
          - 'CTR-4'
          - 'Observability and Verification'
      outputs:
        - 'A CommonJS test file in the style of editor-build/check-editor.test.js, Prettier-clean and ESLint-clean, that loads the script with import(pathToFileURL(SCRIPT)) so a missing script fails the test and not the load of the file'
        - 'Every top-level test title starts with its group in square brackets: [map] cases 1 and 2, [decide] case 3, [list] case 4, [diff] case 5 (temporary git repository, rename out of src/main/editor into docs/wav classifies both sides, three dots), [outputs] case 6 (GITHUB_OUTPUT and GITHUB_STEP_SUMMARY in temporary files, a pipe in a path escaped), [audit] case 7 (A1 to A4 on the repository, and the sabotage on an in-memory copy of RULES where src/test/javascript/viewpoint-kernel/*.json runs no kernel), [workflow] case 8 (text checks, including the exact fetch-depth expression and the dispatch test kept in each if), [gate] case 9 (the first run block of Build extracted by text and run with bash and exactly the nine names, one loop per job over its pair, an all-pass and a mixed case, an empty output and a failed Changes)'
        - 'The audit helpers (resolution of the literals, the four readers) live in the test, not in the script (DEC-10), and a path a reader cannot resolve is skipped'
        - 'No assertion depends on the number of tracked files or on the number of rules'
      verification:
        - 'node --check src/test/javascript/changes-map.test.js exits 0'
        - 'npx prettier --check src/test/javascript/changes-map.test.js exits 0'
        - 'npx eslint --max-warnings 0 src/test/javascript/changes-map.test.js exits 0'
        - 'node --test src/test/javascript/changes-map.test.js exits non-zero and its output names the missing scripts/changes.mjs (the red state: task-003 turns the groups map, decide, list, diff, outputs and audit green, task-004 the groups workflow and gate)'
        - 'grep -c "^test(.\[" src/test/javascript/changes-map.test.js counts at least 8 titles that start with a group in brackets'
        - 'git diff --stat -- scripts .github src/main prints nothing'
      risk: 'medium'
      confidence: 72
      human_review: 'none'
      escalation_triggers:
        - 'A reader of a job cannot be resolved by the rule of DEC-6 and its false findings on the repository as it is exceed a handful (drop the noisy side, record it as DEF-2 as DEC-6 allows, log it)'
        - 'The audit finds a path whose reader the table of DEC-3 gets wrong (that is a finding for task-003, not a reason to weaken the audit)'
      delegation_tier: 'standard'
      results: 'tier standard, model sonnet, effort medium, profile low-cost, passed first time, inline (leaf), independently verified'
    - id: task-003
      title: 'Write scripts/changes.mjs and turn the map, decision, list, diff, outputs and audit groups green'
      source_requirements:
        prd:
          - 'REQ-1'
          - 'REQ-3'
          - 'REQ-4'
          - 'REQ-5'
        tdd:
          - 'DEC-1'
          - 'DEC-2'
          - 'DEC-3'
          - 'DEC-4'
          - 'DEC-5'
          - 'DEC-7'
          - 'DEC-10'
          - 'CTR-1'
          - 'CTR-2'
          - 'CTR-3'
          - 'IMP-1'
          - 'IF-2'
          - 'IF-3'
          - 'FLOW-1'
          - 'FLOW-2'
      outputs:
        - 'An ES module that exports JOBS, RULES (ordered, each with id, patterns, jobs and reason; R-01 to R-22 of DEC-3 as amended, the last one the default that runs all four), classify(path) and decide({ event, files }), with a CLI that runs only when the file is the entry point'
        - 'The glob rule of DEC-4: ** any number of segments, * anything but a slash, a leading **/ also matches the root; first match wins; the jobs of a pull request are the union over its files'
        - 'The CLI: --event required unless --list, --base and --head required on a pull_request (exit 2, one line on stderr), the changed files from git diff --name-only --no-renames -z base...head, a failed or empty diff is all four with a ::warning:: line, the decision always on stdout, name=value lines appended to GITHUB_OUTPUT and the summary of CTR-3 appended to GITHUB_STEP_SUMMARY when set (names escaped for markdown), the paths that fell to the default listed up to 20'
        - '--list: one line per git ls-files path, path TAB rule id TAB jobs (comma-separated subset or none), in the order of git ls-files, a count per rule id on stderr, exit 0'
        - 'No dependency added: only node: built-ins; package.json untouched'
      verification:
        - 'node --test --test-name-pattern="\[(map|decide|list|diff|outputs|audit)\]" src/test/javascript/changes-map.test.js exits 0 (the groups workflow and gate stay red until task-004)'
        - 'node scripts/changes.mjs --list | wc -l equals git ls-files | wc -l'
        - 'node scripts/changes.mjs --list 2>&1 >/dev/null prints a count per rule id'
        - 'node scripts/changes.mjs --event push prints four true for the four jobs and exits 0; node scripts/changes.mjs --event pull_request exits 2'
        - 'npx prettier --check scripts/changes.mjs and npx eslint --max-warnings 0 scripts/changes.mjs exit 0'
        - 'git diff --stat -- .github src/main package.json prints nothing'
      risk: 'medium'
      confidence: 75
      human_review: 'none'
      escalation_triggers:
        - 'The audit fails on the repository as it is for a row of DEC-3 (the audit is the net: read the file, fix the row, log the reading in the Findings; never weaken the audit to pass)'
        - 'A rule of the table has to change beyond a one-row edit (log it against DEC-3 and the deviations list)'
      delegation_tier: 'standard'
      results: 'tier standard, model sonnet, effort medium, profile low-cost, passed first time, inline (leaf), independently verified'
    - id: task-004
      title: 'Edit ci-build.yaml: the Changes job, the needs and if of the four jobs, the Build gate'
      source_requirements:
        prd:
          - 'REQ-2'
          - 'REQ-5'
        tdd:
          - 'DEC-8'
          - 'DEC-9'
          - 'IMP-3'
          - 'CTR-1'
          - 'CTR-4'
          - 'FLOW-1'
          - 'FLOW-2'
          - 'CON-1'
          - 'CON-2'
          - 'CON-3'
          - 'CON-4'
          - 'CON-6'
          - 'CON-7'
      outputs:
        - 'A job Changes before Java with if not workflow_dispatch, permissions contents read only, the four outputs from the step map, checkout with the quoted-string fetch-depth expression, and a step that runs node scripts/changes.mjs with EVENT, BASE_SHA and HEAD_SHA passed through env, never interpolated into the run text'
        - 'Each of Java, Page, Kernel and E2E gets needs Changes and an if that keeps the dispatch test and adds needs.Changes.outputs.<job> == true'
        - 'Build gets Changes in needs, keeps its if (!cancelled() and not a dispatch), and a first step (renamed to say it checks that every part ran or was skipped by the filter) whose step-level env has exactly the nine names of CTR-4 and whose run block fails with one ::error:: line per job unless the pair is true/success or false/skipped and Changes is success'
        - 'The comments of the jobs header and of Build say what the filter is; the names of the jobs do not change'
      verification:
        - 'node --test src/test/javascript/changes-map.test.js exits 0 (all groups, including workflow and gate)'
        - 'node --test src/test/javascript/site.test.js exits 0 (it reads the strings target/site/index.html, target/site/docs/ and target/site/editor/index.html of the workflow, which stay)'
        - 'npx prettier .github/workflows/ci-build.yaml > /dev/null exits 0 (a YAML syntax error exits 2); if actionlint is on the path, actionlint .github/workflows/ci-build.yaml exits 0'
        - 'git diff -U0 -- .github/workflows/ci-build.yaml | grep -c "^-[^-].*\(target/site\|Targets:\|Native:\|Release:\|Smoke:\|Publish:\|PUBLISHES\)" prints 0 (no removed line is in the Pages publish step or in the jobs Targets to Publish)'
        - 'grep -c "needs: *Changes\|needs: \[Changes" .github/workflows/ci-build.yaml prints at least 5 (the four jobs, and the list of Build, in whichever form it is written)'
        - 'git diff --stat -- scripts src/main pom.xml package.json prints nothing for the files other than the ones of task-003'
      risk: 'high'
      confidence: 70
      human_review: 'after'
      escalation_triggers:
        - 'The gate text cannot be written so that its run block holds for every pair of the table of case 9 (stop, log the pair, do not loosen the gate)'
        - 'A change outside the Changes job, the needs and if of the four jobs and the first step of Build seems needed (CON-6: the Pages publish step is W-2 and Targets to Publish are out of scope)'
        - 'site.test.js or another test fails on the renamed step or the new job (read the test, adjust the workflow, never the test, unless it pins the old step name by mistake: log it)'
      delegation_tier: 'hard_judgment'
      results: 'tier hard_judgment, model sonnet, effort high, profile low-cost, passed first time, inline (leaf), independently verified'
    - id: task-005
      title: 'Rewrite the CI paragraph of .github/CLAUDE.md'
      source_requirements:
        prd:
          - 'REQ-6'
        tdd:
          - 'IMP-4'
          - 'DEC-8'
          - 'DEC-9'
          - 'CTR-4'
      outputs:
        - 'The paragraph "CI jobs (wave 023, run 0176, W-14)" names the job Changes and its four outputs, says only a pull request is filtered and what the map does not skip, gives the rule of Build (true/success or false/skipped, Changes success), says the map is scripts/changes.mjs and that changes-map.test.js audits it, says the wave-030 pull request itself runs everything because it edits .github/**, and gives the two commands (--list, and --event pull_request --base <ref> --head <ref>); the rest of the file keeps its wording'
      verification:
        - 'grep -q "scripts/changes.mjs" .github/CLAUDE.md and grep -q "changes-map.test.js" .github/CLAUDE.md and grep -q "true/success" .github/CLAUDE.md all succeed'
        - 'grep -q "node scripts/changes.mjs --list" .github/CLAUDE.md succeeds'
        - 'git diff --numstat -- .github/CLAUDE.md shows a small number of deletions (the one paragraph) and git diff --stat -- CLAUDE.md prints nothing (the root file only points here)'
      risk: 'low'
      confidence: 85
      human_review: 'none'
      escalation_triggers:
        - 'A test or script is found that pins the text of .github/CLAUDE.md'
      delegation_tier: 'standard'
      results: 'tier standard, model sonnet, effort medium, profile low-cost, passed first time, inline (leaf), independently verified'
    - id: task-006
      title: 'Run the gates and write the run record (proved where, deviations, dry run)'
      source_requirements:
        prd:
          - 'REQ-1'
          - 'REQ-4'
          - 'REQ-7'
        tdd:
          - 'IMP-5'
          - 'Observability and Verification'
          - 'Deployment and Rollout'
          - 'RISK-2'
          - 'RISK-6'
      outputs:
        - 'The dry run recorded: node scripts/changes.mjs --event pull_request --base main --head 9e7cca2 prints four lines that say false (java=false, page=false, kernel=false, e2e=false; that diff holds only docs/wav files), with its output pasted'
        - 'The run record says which part is proved on the pull request (map, audit, diff handling, gate shell, the workflow with every output true) and which only on the first pull request that skips, the run of main after the merge and the next release tag'
        - 'The run record lists the deviations of DEC-3 from #192 as the TDD now lists them, so the author can overturn one row'
        - 'The duration of Native read from the last run of main with gh run list or gh run view when gh is usable, otherwise the words not read with the reason'
        - 'The output of npm run test:unit, npm run format:check and npm run lint summarised in the Findings of the prg'
      verification:
        - 'node scripts/changes.mjs --event pull_request --base main --head 9e7cca2 exits 0 and its four lines say false'
        - 'npm run test:unit exits 0'
        - 'npm run format:check exits 0 and npm run lint exits 0'
        - 'git status --short lists only scripts/changes.mjs, src/test/javascript/changes-map.test.js, .github/workflows/ci-build.yaml, .github/CLAUDE.md and the run directory under docs/wav (and the untracked files already there at the start)'
        - 'git diff --stat -- src/main pom.xml package.json package-lock.json CLAUDE.md prints nothing'
      risk: 'low'
      confidence: 82
      human_review: 'none'
      escalation_triggers:
        - 'The dry run prints true for a job (the commit named is not the one before the implementation, or a rule is wrong: read it, do not edit the expectation)'
        - 'npm run test:unit fails in a test other than changes-map.test.js (find whether the run caused it; if not, log it as a finding and do not fix it here)'
      delegation_tier: 'standard'
      results: 'tier standard, model sonnet, effort medium, profile low-cost, passed first time, inline (leaf), independently verified'
```

## 5. Parallelization Plan

```yaml
parallelization_plan:
  groups: []
```

No task runs in parallel with another. The chain is the dependency order (graph edges), and the wave forbids two runs together by the author's decision of 2026-11-01. Two tasks share a file only along the chain: task-002 and task-004 both concern `changes-map.test.js` (task-004 does not edit it, it runs it), and `ci-build.yaml` is edited by task-004 only (W-2 edits it later, in its own run).

## 6. Human Review Gates

```yaml
human_review_gates:
  gates:
    - id: gate-001
      trigger: 'task-004 changes the job Build, which gates the snapshot, release and website publication, and adds a job in front of the four checks. A mistake costs a red main, or at worst a skipped check on a pull request; it cannot publish unchecked code because main and tags run everything (CON-2).'
      required_before: []
      required_after: ['task-004']
      reviewer_focus:
        - 'Does the gate pass only true/success and false/skipped, and does every other pair print an error line that names the job?'
        - 'Is the fetch-depth expression the quoted-string form, so that a pull request really clones the history?'
        - 'Is every row of the table of DEC-3 that narrows a job away from a path justified by what the readers read (R-09, R-17, R-18 in particular)?'
```

**Autonomy override in effect.** This run executes under the autonomy override of `complete-run`: `gate-001` is a review-after point by the default policy (integration change, live capability), and under the override the run does not stop for it. What stands in for the stop: the node test runs the shell of the gate under the whole table of pairs, the audit holds the map to what the tests read, task-004 has an elevated verifier because its risk is high, and the author reviews the diff at the pull request. The merge of the pull request, the watch of the run of `main` and the next tag are human steps outside this plan.

## 7. Risk Assessment

```yaml
risk_assessment:
  by_task:
    - id: task-001
      risk: 'low'
      rationale: 'Edits a draft document; the fixes are specified by the findings.'
    - id: task-002
      risk: 'medium'
      rationale: 'The audit reads the source of the tests with regular expressions and must resolve the literal forms the repository really uses; too loose a test fails on the repository, too tight a one hides a reader (RISK-5).'
    - id: task-003
      risk: 'medium'
      rationale: 'The table decides which jobs a pull request skips; a row that omits a job a file needs is a false skip (RISK-1). The default of all, the audit and the full run of main and tags bound the damage.'
    - id: task-004
      risk: 'high'
      rationale: 'Build gates the publish and release jobs (live capability) and the change cannot be proved in full by the pull request that carries it (RISK-2); a wrong gate is either red for nothing or green for a skipped check.'
    - id: task-005
      risk: 'low'
      rationale: 'One paragraph of a notes file for agents; no test reads it (ASM-4).'
    - id: task-006
      risk: 'low'
      rationale: 'Runs commands and writes the record; changes no product file.'
  by_area:
    - area: 'infra'
      risk: 'high'
      rationale: 'The workflow file; the proof of the skipping path, the push and the tag lies after the merge (REQ-7).'
    - area: 'api'
      risk: 'low'
      rationale: 'The command line of scripts/changes.mjs is new and read only by the workflow, the test and a contributor.'
    - area: 'docs'
      risk: 'low'
      rationale: 'The TDD, .github/CLAUDE.md and the run record.'
    - area: 'security'
      risk: 'low'
      rationale: 'Changes has contents read only and no secret; file names enter the shell only through env and are escaped in the summary (TDD Security and Privacy).'
```

## 8. Confidence Assessment

```yaml
confidence_assessment:
  by_task:
    - id: task-001
      score: 80
      rationale: 'Ten findings, each specified; the one with choices (F-3, F-8) is decided in the gaps above.'
    - id: task-002
      score: 72
      rationale: 'The largest file of the run and the audit regular expressions are new; the red state is checkable but the exact shape of the repository literals is only known by reading the tests.'
    - id: task-003
      score: 75
      rationale: 'Pure function plus a CLI, with a test that already names every case; the table may need a one-row edit when the audit meets the repository.'
    - id: task-004
      score: 70
      rationale: 'Workflow text, proved by a test of its text and of the shell of the gate but not by a real run; the fetch-depth expression is the known trap.'
    - id: task-005
      score: 85
      rationale: 'One paragraph, checked by grep.'
    - id: task-006
      score: 82
      rationale: 'Commands with known expected results; gh may not be usable for the duration of Native.'
```

## 9. Agent Assignment Plan

```yaml
agent_assignment_plan:
  assignments:
    - task_id: task-001
      agent_role: 'Architecture Agent'
      objective: 'Apply the findings F-1 to F-10 of the Stage 5 review to the TDD as the gaps of this plan state them (gap-001 to gap-008, gap-010 and gap-011), without editing anything but the TDD.'
      context:
        prd_excerpts:
          - 'No PRD (profile TDD+pln): REQ-1 to REQ-7 as labelled in the TDD, from the wave manifest and #192'
        tdd_excerpts:
          - 'IMP-3, DEC-3, DEC-6, DEC-7, CTR-2, CTR-4, Non-Goals, Observability and Verification, Open Questions'
      likely_files:
        - 'docs/wav/wav-030-pages-ci-and-toolbar/run/run-0211-ci-changes-filter/tdd-0211-ci-changes-filter.md'
        - 'docs/wav/wav-030-pages-ci-and-toolbar/run/run-0211-ci-changes-filter/prg-0211-ci-changes-filter.md'
      acceptance_criteria:
        - 'Each finding F-1 to F-10 is applied or the Findings of the prg says why not'
        - 'The TDD keeps its sections and ids; no new decision beyond the gaps of this plan'
      verification:
        - 'grep -q "&& ''0'' || ''1''" on the TDD succeeds and grep -c "&& 0 || 1" on the TDD prints 0'
        - 'grep -c "E2E_RESULT" on the TDD prints at least 1 and grep -c "JAVA_WANTED" prints at least 1'
        - 'grep -q "9e7cca2" on the TDD succeeds'
        - 'grep -q "No open question" on the TDD succeeds and grep -c "^- `Q-[123]` (resolved" on the TDD prints 0'
        - 'grep -c "lines 237, 337 and 352" on the TDD prints 0 and grep -q "line 237" on the TDD succeeds'
        - 'grep -q "java=false" on the TDD succeeds'
        - 'git diff --stat -- src scripts .github pom.xml package.json prints nothing'
      escalation_triggers:
        - 'A finding contradicts the repository when read'
      suggested_subagent_type: 'general-purpose'
      suggested_model: '(default)'
      suggested_effort: 'medium'
    - task_id: task-002
      agent_role: 'Test Generation Agent'
      objective: 'Write the node test of the map, the decision, the list, the diff, the outputs, the audit of the readers, the text of the workflow and the shell of the Build gate, red because scripts/changes.mjs does not exist yet.'
      context:
        prd_excerpts:
          - 'REQ-1 the five cases, REQ-2 the workflow, REQ-3 no false skip, REQ-4 the summary, REQ-5 push, tag and dispatch'
        tdd_excerpts:
          - 'DEC-6 audit with its resolution rule, DEC-8 the gate, DEC-10 how the test loads the script and extracts the run block, CTR-2 the list format, CTR-3 the summary, CTR-4 the nine names, Observability and Verification cases 1 to 9'
      likely_files:
        - 'src/test/javascript/changes-map.test.js'
        - 'src/test/javascript/editor-build/check-editor.test.js (style and how a script module is imported)'
        - 'src/test/javascript/editor-build/check-editor-moves.test.js (a temporary git repository)'
        - '.github/workflows/ci-build.yaml (read only)'
      acceptance_criteria:
        - 'Every top-level test title starts with its group in square brackets, so task-003 and task-004 can run a group by name'
        - 'The red run fails because the script is missing, not because of a syntax or lint error'
        - 'The test does not depend on the number of tracked files'
      verification:
        - 'node --check src/test/javascript/changes-map.test.js exits 0'
        - 'npx prettier --check src/test/javascript/changes-map.test.js exits 0'
        - 'npx eslint --max-warnings 0 src/test/javascript/changes-map.test.js exits 0'
        - 'node --test src/test/javascript/changes-map.test.js exits non-zero and its output names the missing scripts/changes.mjs (the red state: task-003 turns the groups map, decide, list, diff, outputs and audit green, task-004 the groups workflow and gate)'
        - 'grep -c "^test(.\[" src/test/javascript/changes-map.test.js counts at least 8 titles that start with a group in brackets'
        - 'git diff --stat -- scripts .github src/main prints nothing'
      escalation_triggers:
        - 'The audit is noisy on the repository as it is (drop the noisy side as DEF-2 and log it)'
      suggested_subagent_type: 'general-purpose'
      suggested_model: '(default)'
      suggested_effort: 'medium'
    - task_id: task-003
      agent_role: 'Backend Implementation Agent'
      objective: 'Write scripts/changes.mjs (the ordered rules R-01 to R-22 with their reasons, classify, decide and the CLI with --list) so that the groups map, decide, list, diff, outputs and audit of the test pass.'
      context:
        prd_excerpts:
          - 'REQ-1, REQ-3, REQ-4, REQ-5'
        tdd_excerpts:
          - 'DEC-2 fail open, DEC-3 the table, DEC-4 the glob rule, DEC-7 the diff command, CTR-1 to CTR-3, IF-2, IF-3'
      likely_files:
        - 'scripts/changes.mjs'
        - 'src/test/javascript/changes-map.test.js (read only: it is the specification)'
      acceptance_criteria:
        - 'The six groups named pass; the two groups of the workflow stay red until task-004'
        - 'Only node: built-ins; the CLI runs only as the entry point'
      verification:
        - 'node --test --test-name-pattern="\[(map|decide|list|diff|outputs|audit)\]" src/test/javascript/changes-map.test.js exits 0 (the groups workflow and gate stay red until task-004)'
        - 'node scripts/changes.mjs --list | wc -l equals git ls-files | wc -l'
        - 'node scripts/changes.mjs --list 2>&1 >/dev/null prints a count per rule id'
        - 'node scripts/changes.mjs --event push prints four true for the four jobs and exits 0; node scripts/changes.mjs --event pull_request exits 2'
        - 'npx prettier --check scripts/changes.mjs and npx eslint --max-warnings 0 scripts/changes.mjs exit 0'
        - 'git diff --stat -- .github src/main package.json prints nothing'
      escalation_triggers:
        - 'The audit fails on a row of the table (fix the row, never the audit)'
      suggested_subagent_type: 'general-purpose'
      suggested_model: '(default)'
      suggested_effort: 'medium'
    - task_id: task-004
      agent_role: 'Infrastructure Agent'
      objective: 'Edit .github/workflows/ci-build.yaml: add the job Changes, put needs Changes and the output test on the four jobs, and rewrite the first step of Build as the gate of CTR-4, touching nothing else.'
      context:
        prd_excerpts:
          - 'REQ-2 Changes, an if on each job, Build fails on failure and cancelled; REQ-5 a tag, a push and a dispatch run everything and Build stays the one name'
        tdd_excerpts:
          - 'IMP-3 the Changes job text (with the quoted fetch-depth), DEC-8 the gate, DEC-9 the ifs, CTR-4 the nine names, CON-1 to CON-7'
      likely_files:
        - '.github/workflows/ci-build.yaml'
        - 'src/test/javascript/changes-map.test.js (read only: it runs the gate shell and checks the text)'
        - 'src/test/javascript/site.test.js (read only)'
      acceptance_criteria:
        - 'All groups of the test pass, including workflow and gate'
        - 'No line is removed from the Pages publish step or from the jobs Targets to Publish'
        - 'The fetch-depth expression is the quoted-string form'
      verification:
        - 'node --test src/test/javascript/changes-map.test.js exits 0 (all groups, including workflow and gate)'
        - 'node --test src/test/javascript/site.test.js exits 0 (it reads the strings target/site/index.html, target/site/docs/ and target/site/editor/index.html of the workflow, which stay)'
        - 'npx prettier .github/workflows/ci-build.yaml > /dev/null exits 0 (a YAML syntax error exits 2); if actionlint is on the path, actionlint .github/workflows/ci-build.yaml exits 0'
        - 'git diff -U0 -- .github/workflows/ci-build.yaml | grep -c "^-[^-].*\(target/site\|Targets:\|Native:\|Release:\|Smoke:\|Publish:\|PUBLISHES\)" prints 0 (no removed line is in the Pages publish step or in the jobs Targets to Publish)'
        - 'grep -c "needs: *Changes\|needs: \[Changes" .github/workflows/ci-build.yaml prints at least 5 (the four jobs, and the list of Build, in whichever form it is written)'
        - 'git diff --stat -- scripts src/main pom.xml package.json prints nothing for the files other than the ones of task-003'
      escalation_triggers:
        - 'The gate cannot hold for every pair of case 9'
        - 'A change outside the allowed places seems needed'
      suggested_subagent_type: '(inline)'
      suggested_model: '(default)'
      suggested_effort: '(inline)'
    - task_id: task-005
      agent_role: 'Documentation Agent'
      objective: 'Rewrite the one paragraph "CI jobs (wave 023, run 0176, W-14)" of .github/CLAUDE.md so that it describes the Changes job, the rule of Build, the map and its test, and how to see a decision.'
      context:
        prd_excerpts:
          - 'REQ-6 .github/CLAUDE.md says it'
        tdd_excerpts:
          - 'IMP-4 the content of the paragraph, DEC-8, DEC-9, CTR-4'
      likely_files:
        - '.github/CLAUDE.md'
        - '.github/workflows/ci-build.yaml (read only: describe it as it is written)'
      acceptance_criteria:
        - 'The paragraph says what IMP-4 lists, in the voice of the rest of the file; the other paragraphs keep their wording'
      verification:
        - 'grep -q "scripts/changes.mjs" .github/CLAUDE.md and grep -q "changes-map.test.js" .github/CLAUDE.md and grep -q "true/success" .github/CLAUDE.md all succeed'
        - 'grep -q "node scripts/changes.mjs --list" .github/CLAUDE.md succeeds'
        - 'git diff --numstat -- .github/CLAUDE.md shows a small number of deletions (the one paragraph) and git diff --stat -- CLAUDE.md prints nothing (the root file only points here)'
      escalation_triggers:
        - 'A test pins the text of the file'
      suggested_subagent_type: 'general-purpose'
      suggested_model: '(default)'
      suggested_effort: 'low'
    - task_id: task-006
      agent_role: 'QA Agent'
      objective: 'Run the dry run on the commit before the implementation and the gates of the TDD, and write the run record: what is proved on the pull request, what only after the merge, the deviations of DEC-3, the duration of Native.'
      context:
        prd_excerpts:
          - 'REQ-7 the record says which part is proved where'
        tdd_excerpts:
          - 'Observability and Verification, Deployment and Rollout, IMP-5, RISK-2, RISK-6'
      likely_files:
        - 'docs/wav/wav-030-pages-ci-and-toolbar/run/run-0211-ci-changes-filter/run-0211-ci-changes-filter.md'
        - 'docs/wav/wav-030-pages-ci-and-toolbar/run/run-0211-ci-changes-filter/prg-0211-ci-changes-filter.md'
      acceptance_criteria:
        - 'Every gate command passes, or its failure is a finding in the prg'
        - 'The record has the three statements of the outputs, with the commands and their output'
      verification:
        - 'node scripts/changes.mjs --event pull_request --base main --head 9e7cca2 exits 0 and its four lines say false'
        - 'npm run test:unit exits 0'
        - 'npm run format:check exits 0 and npm run lint exits 0'
        - 'git status --short lists only scripts/changes.mjs, src/test/javascript/changes-map.test.js, .github/workflows/ci-build.yaml, .github/CLAUDE.md and the run directory under docs/wav (and the untracked files already there at the start)'
        - 'git diff --stat -- src/main pom.xml package.json package-lock.json CLAUDE.md prints nothing'
      escalation_triggers:
        - 'The dry run prints true for a job'
        - 'A test other than changes-map.test.js fails'
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
        - 'git diff --stat of the code folders'
      success_criteria:
        - 'The findings are applied (quoted fetch-depth, the nine names, the dry-run commit, the resolution rule, one list of deviations, No open question) and nothing outside the TDD changed'
    - task_id: task-002
      methods:
        - 'node --check, prettier --check, eslint on the test file'
        - 'node --test on the test file, expected red'
      success_criteria:
        - 'The file is clean and fails only because scripts/changes.mjs is missing; at least eight groups are named by their bracket title'
    - task_id: task-003
      methods:
        - 'node --test with the name pattern of the six groups'
        - 'node scripts/changes.mjs --list against git ls-files'
        - 'prettier --check and eslint on the script'
      success_criteria:
        - 'Six groups green, list count equals git ls-files, push gives four true, a pull request without base exits 2'
    - task_id: task-004
      methods:
        - 'node --test on changes-map.test.js (all groups) and site.test.js'
        - 'prettier parse of the workflow, actionlint if present'
        - 'git diff of the removed lines'
      success_criteria:
        - 'All green, no removed line in the Pages publish step or in the jobs after Build, the five needs present'
    - task_id: task-005
      methods:
        - 'grep checks on .github/CLAUDE.md'
        - 'git diff --numstat and --stat'
      success_criteria:
        - 'The four strings are present, one paragraph changed, the root CLAUDE.md untouched'
    - task_id: task-006
      methods:
        - 'dry run of the script on 9e7cca2'
        - 'npm run test:unit, format:check, lint'
        - 'git status and git diff --stat'
      success_criteria:
        - 'The dry run prints false four times, all three commands exit 0, only the expected files changed, and the run record has the proved-where statement, the deviations and the Native duration or the reason it was not read'
```

## 11. Escalation Rules

```yaml
escalation_rules:
  rules:
    - condition: 'The audit of task-002 or task-003 fails on the repository for a row of the table of DEC-3'
      action: 'Read the reader the audit names, fix the row (a one-row edit), log the reading and the new deviation in the Findings of the prg; never weaken the audit or the expected jobs to make it pass.'
    - condition: 'The gate shell cannot satisfy a pair of case 9, or a pair would pass that must fail'
      action: 'Stop task-004, log the pair, rewrite the shell; the gate fails closed (DEC-8), never loosen it.'
    - condition: 'A task needs a change under src/main, pom.xml, package.json, the Pages publish step or the jobs Targets to Publish'
      action: 'Stop: CON-5 and CON-6 forbid it; log the need as a finding for the author (W-2 owns the Pages publish step).'
    - condition: 'The dry run on 9e7cca2 prints true for a job'
      action: 'The commit is not the one before the implementation, or a rule is wrong; read the diff and the rule, do not edit the expectation.'
    - condition: 'gh is not usable for the duration of Native'
      action: 'Write not read with the reason in the run record; the figure is not a criterion.'
    - condition: 'A task fails its own verification'
      action: 'Re-dispatch once one rung up (Delegation Policy), working from the files as the first attempt left them; a second failure is handled inline and logged as a finding.'
    - condition: 'Autonomy override'
      action: 'No task is human_required and none is critical; the run does not stop for a category. The safety rules of the session (no commit, push, merge, tag or release, no secret, no destructive git) still apply, and the merge and the watch of main after it are the author''s.'
```

## 12. Final Execution Manifest

```yaml
execution_manifest:
  status: 'done'
  recommendation: 'proceed_with_review'
  autonomy_level: 'medium'
  total_tasks: 6
  autonomous_tasks: 5
  review_before_tasks: 0
  review_after_tasks: 1
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
  required_human_gates:
    - gate-001
  highest_risk_tasks:
    - task-004
    - task-003
    - task-002
  lowest_confidence_tasks:
    - task-004
    - task-002
    - task-003
  next_action: 'Start task-001: amend the TDD with the findings F-1 to F-10 as gap-001 to gap-008, gap-010 and gap-011 state them, then write the red test (task-002).'
  criteria:
    - 'All criteria of the summary are true'
    - 'The gates of task-006 pass'
```
