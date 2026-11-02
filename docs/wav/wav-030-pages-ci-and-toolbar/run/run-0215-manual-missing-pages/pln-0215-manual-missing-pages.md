---
title: Execution Plan — Manual missing pages
status: done
date: 2026-11-01
related:
  - docs/wav/wav-030-pages-ci-and-toolbar/run/run-0215-manual-missing-pages/tdd-0215-manual-missing-pages.md
  - docs/wav/wav-030-pages-ci-and-toolbar/wav-030-pages-ci-and-toolbar.md
  - src/doc/README.adoc
  - src/site/llms.txt
  - src/test/javascript/manual-voice.test.js
  - src/test/javascript/site.test.js
  - https://github.com/tmorin/archicode/issues/193
type: pln
run: 0215
wave: 030
---

# Execution Plan: Manual missing pages

Profile TDD+pln: there is no PRD, so REQ-1 to REQ-7 are the IDs the TDD labels (section "PRD Traceability"), taken from the W-5 row, the second, third and fifth criteria of gate P2, and decision Q2 of the wave manifest. The plan follows the TDD plus the Stage 5 review findings F1 to F8 (progress log, Findings), which the TDD does not yet carry, and the Stage 6 settlement of Q-2 (the TDD already states it).

The order is test first. task-001 amends the TDD with the findings, task-002 saves a baseline and writes `manual-howto.test.js` red, task-003 writes the CI page, task-004 the agent page, task-005 settles Best Practices, the Features link, the two part ids, `llms.txt` and the exemption of the voice test, task-006 proves the result (commands on the jar, tests, build, mutation checks), task-007 reads the pages as a reader and writes the run record.

The wave is strictly sequential: tasks 003 to 005 edit `src/doc/README.adoc` and every other task reads a file derived from it, so there is no parallel group.

Baseline of the diff checks: the working tree holds uncommitted work of runs 0213 and 0214 and the wave documents. A check of the form `git diff --stat -- <paths>` that reads "unchanged" is read against a baseline taken by task-002 before its first edit (the output of `git diff --stat` and `git status --short` saved in the scratchpad), not against HEAD. The base copy of the manual is the file as it is when task-002 starts, saved in the scratchpad, plus `git show ff3bacd:src/doc/README.adoc` for the ids.

Q-1 of the TDD (dropping Viewpoint Utilization, a third topic beyond the two Q2 names) is decided by the drafter and open to the author at the plan review. It is not a blocker: it costs one bullet and one section if the author overturns it. gate-001 carries it.

This run operates under the autonomy override of `complete-run`: no task stops for a human on its category alone, so a future reader of this plan understands why a task flagged for review after was executed without a stop. No task of this plan is `critical` or `human_required`, so the override changes no route. Nothing in this plan commits, pushes, merges, tags or releases: those are human steps outside the plan. The JDK of the shell is 21; every task that runs Maven or the jar sets `JAVA_HOME=/home/tibo/.sdkman/candidates/java/25.0.4-tem`.

## 1. Executive Summary

```yaml
summary:
  status: 'pending'
  product_goal: 'Under How-to guides the manual has a page to check the architecture in a build (diff --fail-on, exit codes 1, 2, 3) and a page to let an agent work on a workspace (guide, init, query graph, query schemas manifest, docs/architecture); Best Practices promises only what it has; llms.txt names the Reference and Concepts parts (#193 b).'
  technical_approach: 'Amend the TDD with the review findings, write a node test of the ids, the strings, the commands and the options (red), write the two sections and then the Best Practices, Features, part id and llms.txt changes, remove the voice-test exemption, run every command line of the pages on the jar, prove with the node tests, the build and mutation checks on a copy, read the pages once as a reader and write the record.'
  total_tasks: 7
  parallel_groups: 0
  high_risk_tasks: 0
  human_review_gates: 1
  autonomy_level: 'medium'
  recommendation: 'proceed_with_review'
  criteria:
    - 'src/doc/README.adoc defines [[howto-ci]] and [[howto-agent]] as == sections of = How-to guides, in that order, before == Best Practices; the CI section names diff --fail-on, query graph and the exit codes 1, 2 and 3; the agent section names archicode guide, archicode init, query graph, query schemas manifest and docs/architecture (REQ-1, REQ-2)'
    - 'Every archicode command line of the two sections, including the arguments after ghcr.io/tmorin/archicode in the CI job, starts with a command of the Commands part and uses only options it documents, and each exit code the pages state was run on the jar and is listed in the record (REQ-7)'
    - 'grep -c "Pluggable Viewpoint Service" src/doc/README.adoc prints 0, Best Practices has no bullet for the dropped topics, the dropped topics are named in the record, and manual-voice.test.js has no exemption (REQ-4)'
    - 'src/site/llms.txt links docs/#reference, docs/#concepts, docs/#howto-ci and docs/#howto-agent, with [[reference]] and [[concepts]] defined at the start of a line before the two part headings, and node --test src/test/javascript/site.test.js passes (REQ-5)'
    - 'Every id of git show ff3bacd:src/doc/README.adoc is still defined, node --test of manual-howto, manual-skeleton, manual-voice and site passes, and each mutation check of the TDD fails the test it targets (REQ-6)'
    - 'npm run test:unit, npm run format:check and npm run lint exit 0, ManualExamplesTest and PlateauComparisonTest exit 0, the Asciidoctor lines after are not more than before, and git diff shows no file of src/doc/examples, src/main, src/site/index.html, src/site/sitemap.xml, manual-skeleton.test.js, manual-anchors.json or .github (REQ-3)'
```

## 2. PRD/TDD Consistency Assessment

```yaml
consistency_assessment:
  aligned_items:
    - 'Scope, REQ-1 to REQ-7, DEC-1 to DEC-6, CTR-1 to CTR-3 and IMP-1 to IMP-5 agree with the W-5 row, the second, third and fifth criteria of gate P2 and decision Q2; every task below traces to them'
    - 'Q-2 is settled (the release image is tagged by the Quarkus default, the number archicode --version prints) and Q-3 is settled (no validate command); Q-1 is decided by the drafter and carried by gate-001'
    - 'Stage 9 re-scan (2026-11-01): every TDD ID the task catalog cites exists in the TDD (TG-1 to TG-5, REQ-1 to REQ-7, DEC-1 to DEC-6, CTR-1 to CTR-3, IMP-1 to IMP-5, DEF-1 to DEF-4, ASM-3, Q-1 to Q-3, RISK-1 to RISK-5 and RISK-7); no task invents scope; the likely_files that exist today (README.adoc, llms.txt, manual-voice.test.js, site.test.js, manual-skeleton.test.js, manual-anchors.json, src/doc/examples, index.html, sitemap.xml, scripts/changes.mjs, PlateauComparisonIT, AgentWalkIT, DiffFailOnTest, ManualExamplesTest, PlateauComparisonTest) were found, and manual-howto.test.js is the one new file; commit ff3bacd resolves; no link to #_reference or #_concepts exists in src or README.md'
    - 'No command, message, exit code, example, editor code or workflow is touched; scripts/changes.mjs already sends src/doc/README.adoc to Java and Page, and a new test under src/test/javascript and src/site/llms.txt run in Page'
  gaps:
    - id: gap-001
      type: contradiction
      description: 'Stage 5 F1 (S2): the CI idea reads fail when the architecture changes, but the command compares two plateaus of the same checkout (--plateau to-be --against baseline), not a branch with main or an earlier commit; with the example it fails whenever the plan itself removes or moves something.'
      impact: 'medium'
      recommendation: 'task-001 words TG-1, DEC-2, the page shape and the exit-3 line as: the check guards a plateau against another plateau, a comparison with an earlier commit is not offered, exit 3 means the comparison holds a change of a listed state; the Summary and FLOW-2 stop saying when the architecture changed. task-003 writes the page that way.'
    - id: gap-002
      type: contradiction
      description: 'Stage 5 F2 (S2): DEC-6 and CTR-1 read lines of [source,shell] listings that start with archicode, while the CI job is a YAML listing with docker run ... ghcr.io/tmorin/archicode diff ...; ASM-3 says the commands of the job are those of the node test, which is false as written.'
      impact: 'high'
      recommendation: 'task-001 changes DEC-6 and CTR-1: every listing of the two sections is read whatever its language, a line that has ghcr.io/tmorin/archicode has the arguments after it read as an archicode command line, short options (-w, -f) are read, and the global -w before the command is accepted. task-002 writes the test that way.'
    - id: gap-003
      type: contradiction
      description: 'Stage 5 F3 (S2): CTR-2 says the generated ids _reference and _concepts keep working; an explicit [[id]] replaces the generated id, so docs/#_reference and docs/#_concepts stop existing, and Deployment says no address is removed.'
      impact: 'medium'
      recommendation: 'task-001 states that the explicit ids replace the generated ones, that no link of the repository uses them (the grep run with the TDD excluded), and words the compatibility line: no id of the 91 is removed, two generated part ids are replaced.'
    - id: gap-004
      type: ambiguity
      description: 'Stage 5 F4 (S2): Q-2 is read from ci-build.yaml and application.properties, not proved against the registry; the untagged name of the homepage is the main snapshot.'
      impact: 'low'
      recommendation: 'Settled by Stage 6. task-003 confirms the default tag in the Quarkus container-image documentation before it writes the sentence, and says in the page that the untagged name is the latest main build. The homepage is not touched (observation for the record).'
    - id: gap-005
      type: ambiguity
      description: 'Stage 5 F5 to F8 (S1): FLOW-2 and two Observability items repeat other sections; Current State says 3770 lines where the file has 3793; REQ-3 is a gate check, not a requirement; Q-1 is worded settled where the author may overturn it.'
      impact: 'low'
      recommendation: 'task-001 deletes FLOW-2 and merges Observability 4 into 2, drops the line count and keeps the heading lines, labels REQ-3 a gate check, and words Q-1 as decided by the drafter and open to the author at the plan review.'
    - id: gap-006
      type: risk
      description: 'The GitHub Actions job cannot be run by the repository (RISK-2) and the node test checks that a command exists, not that its output is as the prose says (RISK-3).'
      impact: 'medium'
      recommendation: 'The page says which lines belong to the runner and not to ArchiCode; the prose states only the exit code and the first words of one error line; task-006 runs every command line and records the code; PlateauComparisonIT and DiffFailOnTest hold the rest. Accepted.'
    - id: gap-007
      type: risk
      description: 'The render (two new entries under How-to guides, the part ids) has no automated form.'
      impact: 'low'
      recommendation: 'task-007 opens the built page in the browser pane and records by eye, or records not checked if the pane is unavailable, without claiming the check.'
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
        - 'tdd-0215-manual-missing-pages.md amended'
        - 'Findings section of prg-0215-manual-missing-pages.md with one row per fix'
      agent_role: 'Architecture Agent'
      autonomy: 'autonomous'
      risk: 'low'
      confidence: 85
    - id: task-002
      status: 'done'
      title: 'Save the baseline and write manual-howto.test.js, red'
      depends_on: [task-001]
      produces:
        - 'src/test/javascript/manual-howto.test.js'
        - 'baseline files in the scratchpad'
      agent_role: 'Test Generation Agent'
      autonomy: 'autonomous'
      risk: 'low'
      confidence: 80
    - id: task-003
      status: 'done'
      title: 'Write the CI page (howto-ci)'
      depends_on: [task-002]
      produces:
        - 'src/doc/README.adoc with [[howto-ci]] == Check the architecture in a build'
      agent_role: 'Documentation Agent'
      autonomy: 'autonomous'
      risk: 'medium'
      confidence: 75
    - id: task-004
      status: 'done'
      title: 'Write the agent page (howto-agent)'
      depends_on: [task-003]
      produces:
        - 'src/doc/README.adoc with [[howto-agent]] == Let an agent work on a workspace after the CI page'
      agent_role: 'Documentation Agent'
      autonomy: 'autonomous'
      risk: 'medium'
      confidence: 75
    - id: task-005
      status: 'done'
      title: 'Settle Best Practices, the Features link, the part ids, llms.txt and the voice-test exemption'
      depends_on: [task-004]
      produces:
        - 'src/doc/README.adoc with the short Best Practices introduction and list, the link in Features, [[reference]] and [[concepts]]'
        - 'src/site/llms.txt with the section Reference and concepts'
        - 'src/test/javascript/manual-voice.test.js without BEST_PRACTICES_CI_BULLET'
      agent_role: 'Documentation Agent'
      autonomy: 'autonomous'
      risk: 'medium'
      confidence: 80
    - id: task-006
      status: 'done'
      title: 'Prove the pages: commands on the jar, tests, build, mutation checks'
      depends_on: [task-005]
      produces:
        - 'Scratchpad proof: exit codes of every command line of the pages, test outputs, Asciidoctor lines, id-to-heading pairs, mutation results'
      agent_role: 'QA Agent'
      autonomy: 'autonomous'
      risk: 'low'
      confidence: 80
    - id: task-007
      status: 'done'
      title: 'Read the pages as a reader and write the run record'
      depends_on: [task-006]
      produces:
        - 'Reader pass notes and the record of the run in the prg and the run folder'
      agent_role: 'Documentation Agent'
      autonomy: 'review_after'
      risk: 'low'
      confidence: 80
  edges:
    - from: task-001
      to: task-002
      reason: 'the test follows the amended TDD (listing languages, the job arguments, the generated ids)'
    - from: task-002
      to: task-003
      reason: 'test first: the page is written against a red test'
    - from: task-003
      to: task-004
      reason: 'same file, one editor at a time; the agent page links to the CI page'
    - from: task-004
      to: task-005
      reason: 'Best Practices points to both pages and llms.txt links both ids'
    - from: task-005
      to: task-006
      reason: 'the proof reads the finished files'
    - from: task-006
      to: task-007
      reason: 'the record states what was proved'
```

## 4. Task Catalog

```yaml
task_catalog:
  tasks:
    - id: task-001
      title: 'Amend the TDD with the Stage 5 findings'
      source_requirements:
        prd:
          - 'REQ-1'
          - 'REQ-3'
          - 'REQ-4'
          - 'REQ-5'
        tdd:
          - 'TG-1, DEC-2, DEC-6, CTR-1, CTR-2, ASM-3, Current State, REQ-3, Q-1, FLOW-2, Observability 2 and 4, Deployment and Rollout'
      outputs:
        - 'tdd-0215-manual-missing-pages.md with F1 to F8 applied: TG-1, DEC-2, the page shape and the exit-3 line say the check guards a plateau against another plateau and offer no comparison with an earlier commit (F1); DEC-6 and CTR-1 read every listing whatever its language and read the arguments after ghcr.io/tmorin/archicode as a command line, with short options and the global -w (F2); CTR-2 and Deployment say the explicit ids replace _reference and _concepts and that two generated ids are replaced (F3); Q-2 stays settled with the homepage observation recorded (F4); FLOW-2 deleted and Observability 4 merged into 2 (F5); the line count dropped (F6); REQ-3 labelled a gate check (F7); Q-1 worded decided by the drafter, open to the author at the plan review (F8)'
        - 'the Findings section of prg-0215-manual-missing-pages.md with one row per fix (what was wrong, the evidence, the change) and any measured fact of Current State that differed on re-reading'
      verification:
        - 'grep -n "^- .FLOW-2." in the TDD prints nothing'
        - 'grep -n "ghcr.io/tmorin/archicode" in the TDD shows the job arguments read in DEC-6 and CTR-1'
        - 'grep -n "3770" in the TDD prints nothing'
        - 'grep -n "grep -rn .#_reference" in the TDD shows the command run with the TDD excluded, and running it prints nothing'
      risk: 'low'
      confidence: 85
      human_review: 'none'
      escalation_triggers:
        - 'a fact of Current State cannot be reproduced on the working copy: write the measured value and list the difference'
        - 'applying a finding would change a criterion of gate P2 beyond the Q-1 wording'
      delegation_tier: 'standard'
      results: 'tier standard, model sonnet, effort medium, profile low-cost, passed first time, inline (leaf), independently verified'
    - id: task-002
      title: 'Save the baseline and write manual-howto.test.js, red'
      source_requirements:
        prd:
          - 'REQ-1'
          - 'REQ-2'
          - 'REQ-4'
          - 'REQ-5'
          - 'REQ-7'
        tdd:
          - 'DEC-6'
          - 'CTR-1'
          - 'CTR-2'
          - 'CTR-3'
          - 'IMP-3'
          - 'TG-5'
          - 'FLOW-1 steps 1 and 2'
          - 'Observability 1'
      outputs:
        - 'Scratchpad baseline: a copy of src/doc/README.adoc as it is, git show ff3bacd:src/doc/README.adoc, the Asciidoctor lines (asciidoctor: WARNING, ERROR, INFO) of ./mvnw -o generate-resources, the id-to-heading pairs of target/generated-docs/index.html, the greps of Current State, git diff --stat and git status --short'
        - 'src/test/javascript/manual-howto.test.js reading the manual from MANUAL_HOWTO_PATH or the repository: the two ids defined as == sections of = How-to guides in order before == Best Practices; the strings of CTR-1 in each section; the digits 1, 2 and 3 in the CI section; every archicode line of every listing of the two sections (and the arguments after ghcr.io/tmorin/archicode) starts with a command that has a section in the Commands part and uses only options that appear in the Commands part outside the two sections; reference and concepts defined before = Reference and = Concepts; no Best Practices bullet for the dropped topics; llms.txt links the four ids; formatted by Prettier and clean under ESLint'
      verification:
        - 'node --test src/test/javascript/manual-skeleton.test.js src/test/javascript/manual-voice.test.js src/test/javascript/site.test.js exits 0 on the file as it is'
        - 'node --test src/test/javascript/manual-howto.test.js exits non-zero and the failing subtests are the ones for the two ids, the strings, the part ids, the dropped bullets and the llms.txt links (task-003 to task-005 turn them green)'
        - 'npm run format:check and npm run lint exit 0'
      risk: 'low'
      confidence: 80
      human_review: 'none'
      escalation_triggers:
        - 'the Commands part cannot be read as a list of commands and options by a regular expression: read the sections by their ids and list the cases the reader cannot handle'
        - 'a baseline test fails before any edit: stop, record which, and report it'
      delegation_tier: 'standard'
      results: 'tier standard, model sonnet, effort medium, profile low-cost, passed first time, inline (leaf), independently verified'
    - id: task-003
      title: 'Write the CI page (howto-ci)'
      source_requirements:
        prd:
          - 'REQ-1'
          - 'REQ-7'
        tdd:
          - 'DEC-1'
          - 'DEC-2'
          - 'TG-1'
          - 'CTR-1'
          - 'Proposed Design, Shape of the CI page'
          - 'Q-2'
          - 'Security and Privacy'
      outputs:
        - 'src/doc/README.adoc: [[howto-ci]] and == Check the architecture in a build as the first section of = How-to guides, about 70 lines, in this order: the goal (a build that fails when a plateau changes what another plateau fixes, no comparison with an earlier commit); the load check (archicode query graph, exit 1 on a dangling reference); the command archicode diff --plateau to-be --against baseline --fail-on removed,moved with the states in one line each and a pointer to <<diff>>, and why to list states and not any; a four-row table of the exit codes 0, 1, 2 and 3 with a pointer to <<errors-and-warnings>>; --format markdown and --no-wording for a pull request comment; one GitHub Actions job on ghcr.io/tmorin/archicode:<version> (the number archicode --version prints, the untagged name being the latest main build) that runs both commands and says which lines belong to the runner; the need for Java 25 or the image or the native file with a pointer to <<install>>'
      verification:
        - 'node --test src/test/javascript/manual-howto.test.js: the subtests for the howto-ci id, its order, its strings, the digits 1, 2 and 3 and its command lines pass (the other subtests stay red until task-004 and task-005)'
        - 'node --test src/test/javascript/manual-voice.test.js and src/test/javascript/manual-skeleton.test.js exit 0'
        - 'grep -c "^\[\[howto-ci\]\]" src/doc/README.adoc prints 1'
        - 'the default tag of the release image is confirmed in the Quarkus container-image documentation, or the page sentence says the tag is the project version as the workflow sets it and the record says the registry was not checked'
      risk: 'medium'
      confidence: 75
      human_review: 'none'
      escalation_triggers:
        - 'a command line of the page needs an option the Commands part does not document: change the line, not the Commands part'
        - 'the voice test fails on a gate or filler word: rewrite the sentence, no exemption'
      delegation_tier: 'standard'
      results: 'tier standard, model sonnet, effort medium, profile low-cost, passed first time, inline (leaf), independently verified'
    - id: task-004
      title: 'Write the agent page (howto-agent)'
      source_requirements:
        prd:
          - 'REQ-2'
          - 'REQ-7'
        tdd:
          - 'DEC-1'
          - 'DEC-3'
          - 'TG-2'
          - 'CTR-1'
          - 'Proposed Design, Shape of the agent page'
      outputs:
        - 'src/doc/README.adoc: [[howto-agent]] and == Let an agent work on a workspace right after the CI page, about 60 lines, in this order: the goal (an agent that has the program and nothing else); archicode guide read once with a pointer to <<guide>>; archicode init my-architecture with a pointer to <<init>>; the loop (write a manifest, query graph, views generate, one error line per problem, no validate command, a pointer to the exit codes); archicode query schemas manifest with a pointer to <<manifest-schema>>; docs/architecture read from a clone with archicode query graph -w docs/architecture/.archicode.yaml, the same model in the editor (sample=archicode) and how to follow the relationships and their qualifiers; query graph piped to jq and a pointer to <<howto-ci>>'
      verification:
        - 'node --test src/test/javascript/manual-howto.test.js: the subtests for the howto-agent id, its order, its strings and its command lines pass (the subtests of Best Practices, the part ids and llms.txt stay red until task-005)'
        - 'node --test src/test/javascript/manual-voice.test.js and src/test/javascript/manual-skeleton.test.js exit 0'
        - 'grep -c "^\[\[howto-agent\]\]" src/doc/README.adoc prints 1 and the line comes after [[howto-ci]]'
      risk: 'medium'
      confidence: 75
      human_review: 'none'
      escalation_triggers:
        - 'the page would copy content of the guide: keep the order of use and a pointer'
        - 'the voice test fails on a gate or filler word: rewrite the sentence, no exemption'
      delegation_tier: 'standard'
      results: 'tier standard, model sonnet, effort medium, profile low-cost, passed first time, inline (leaf), independently verified'
    - id: task-005
      title: 'Settle Best Practices, the Features link, the part ids, llms.txt and the voice-test exemption'
      source_requirements:
        prd:
          - 'REQ-4'
          - 'REQ-5'
          - 'REQ-6'
        tdd:
          - 'DEC-4'
          - 'DEC-5'
          - 'CTR-2'
          - 'CTR-3'
          - 'IMP-1'
          - 'IMP-2'
          - 'IMP-4'
          - 'TG-3'
          - 'TG-4'
          - 'Section map of Best Practices after the run'
      outputs:
        - 'src/doc/README.adoc: the Best Practices introduction is one sentence, the list keeps Design Guidelines and Source Code Organization, one sentence points to <<howto-ci>> and <<howto-agent>>; the .CI/CD Integration paragraph of Features links <<howto-ci>>; [[reference]] on the line before = Reference and [[concepts]] on the line before = Concepts; no id of the 91 is removed'
        - 'src/site/llms.txt: a section ## Reference and concepts between ## Start here and ## Optional with the four links https://tmorin.github.io/archicode/docs/#reference, #concepts, #howto-ci and #howto-agent, each with one line saying what a reader finds, and still one # heading'
        - 'src/test/javascript/manual-voice.test.js without the constant BEST_PRACTICES_CI_BULLET, its use and the comment lines above it'
      verification:
        - 'node --test src/test/javascript/manual-howto.test.js src/test/javascript/manual-skeleton.test.js src/test/javascript/manual-voice.test.js src/test/javascript/site.test.js exits 0'
        - 'grep -c "Pluggable Viewpoint Service" src/doc/README.adoc prints 0'
        - 'grep -rn "BEST_PRACTICES_CI_BULLET" src/test prints nothing'
        - 'grep -rn "#_reference\|#_concepts" src README.md prints nothing'
        - 'npm run format:check and npm run lint exit 0'
      risk: 'medium'
      confidence: 80
      human_review: 'none'
      escalation_triggers:
        - 'a new id collides with an id of the homepage: rename it and say so in the record'
        - 'site.test.js refuses a link of llms.txt: fix the link or the id, never the test'
      delegation_tier: 'standard'
      results: 'tier standard, model sonnet, effort medium, profile low-cost, passed first time, inline (leaf), independently verified'
    - id: task-006
      title: 'Prove the pages: commands on the jar, tests, build, mutation checks'
      source_requirements:
        prd:
          - 'REQ-3'
          - 'REQ-4'
          - 'REQ-6'
          - 'REQ-7'
        tdd:
          - 'Observability and Verification 1 to 7'
          - 'FLOW-1 steps 6 to 8'
          - 'RISK-1 to RISK-3'
      outputs:
        - 'Scratchpad script and its output: every archicode line of the two pages run on the jar (JDK 25) in a copy of domain_plateaus and in an init folder, with its exit code: diff --fail-on removed,moved exits 3, --fail-on weird exits 1, diff --bogus exits 2, query graph exits 0 and on a copy with a dangling reference exits 1 with an error line, guide, init and query schemas manifest exit 0, query graph -w docs/architecture/.archicode.yaml exits 0; the exit 0 of --fail-on is read in PlateauComparisonIT.diffFailOnExitsZeroWhenNoListedStateChanged'
        - 'The Asciidoctor lines and the id-to-heading pairs after, compared with the baseline: no more warnings, and only the two new sections and the two part ids differ'
        - 'Mutation checks on a copy through MANUAL_HOWTO_PATH: diff --fail-on deleted from the CI section, one option changed to one the Commands part lacks, [[howto-agent]] removed, a section moved after Best Practices, the CI/CD bullet put back (voice test), one llms.txt link pointed to docs/#nowhere (site.test.js); each fails the test it targets and nothing broken stays in the tree'
      verification:
        - 'npm run test:unit, npm run format:check and npm run lint exit 0'
        - './mvnw test -Dtest=ManualExamplesTest and ./mvnw test -Dtest=PlateauComparisonTest exit 0 with JAVA_HOME set to JDK 25'
        - 'git diff --stat against the baseline of task-002 shows only src/doc/README.adoc, src/site/llms.txt, src/test/javascript/manual-howto.test.js, src/test/javascript/manual-voice.test.js and the run folder'
        - 'git status --short -- src/doc/examples src/main src/site/index.html src/site/sitemap.xml src/test/javascript/manual-skeleton.test.js src/test/javascript/manual-anchors.json .github shows no line that the baseline did not have'
      risk: 'low'
      confidence: 80
      human_review: 'none'
      escalation_triggers:
        - 'a command of a page gives a code other than the one the page says: fix the page, rerun, and log it'
        - 'a mutation does not make its test fail: strengthen the test, not the mutation'
        - 'the Asciidoctor lines after exceed the baseline: find the line and fix it'
      delegation_tier: 'standard'
      results: 'tier standard, model sonnet, effort medium, profile low-cost, passed first time, inline (leaf), independently verified'
    - id: task-007
      title: 'Read the pages as a reader and write the run record'
      source_requirements:
        prd:
          - 'REQ-4'
          - 'REQ-1'
          - 'REQ-2'
        tdd:
          - 'Observability and Verification 6'
          - 'IMP-5'
          - 'Q-1'
          - 'DEF-1 to DEF-4'
      outputs:
        - 'The two pages read top to bottom in target/generated-docs/index.html with the table of contents looked at, in the browser pane, or the line not checked if the pane is unavailable'
        - 'The record of the run (in prg-0215-manual-missing-pages.md and the run folder): what changed, the topics dropped (Diagrams Styling, Label Formatting, Viewpoint Utilization), a note that a ticket follows if the author wants them, the exit codes of task-006, the observation on the untagged image of the homepage, Q-1 open for the author, and the deferred items DEF-1 to DEF-4 as GitHub issue candidates'
      verification:
        - 'grep -n "Diagrams Styling" in the record of the run prints at least one line'
        - 'grep -n "Viewpoint Utilization" in the record of the run prints at least one line'
        - 'grep -c "Pluggable Viewpoint Service" src/doc/README.adoc prints 0'
      risk: 'low'
      confidence: 80
      human_review: 'after'
      escalation_triggers:
        - 'the reader pass finds a missing fact or a sentence that says more than the tool does: fix the page, rerun task-006 checks that depend on it'
        - 'the browser pane is unavailable: record the render as not checked'
      delegation_tier: 'standard'
      results: 'tier standard, model sonnet, effort medium, profile low-cost, passed first time, inline (leaf), independently verified'
```

## 5. Parallelization Plan

```yaml
parallelization_plan:
  groups: []
```

No group: the wave is sequential by decision. Tasks 003 to 005 edit the same file, `src/doc/README.adoc`, and the others read a file derived from it or from the pages: shared-file conflict is the reason.

## 6. Human Review Gates

```yaml
human_review_gates:
  gates:
    - id: gate-001
      trigger: 'The run ends with Q-1 decided by the drafter: Viewpoint Utilization is dropped although Q2 of the wave names only two topics.'
      required_before: []
      required_after: ['task-007']
      reviewer_focus:
        - 'Accept the drop of Viewpoint Utilization, or ask for the topic to be written (one bullet and one section)'
        - 'Read the two pages once: is each plain and direct, and is any fact missing'
        - 'Read the CI example as a reader of another build service: are the two commands the portable part'
```

Under the autonomy override of `complete-run` this gate does not stop the run: it is logged in the prg and reported to the author when the run ends.

## 7. Risk Assessment

```yaml
risk_assessment:
  by_task:
    - id: task-001
      risk: 'low'
      rationale: 'Edits one draft document and its log; every change traces to a finding.'
    - id: task-002
      risk: 'low'
      rationale: 'Additive test; a read-only baseline.'
    - id: task-003
      risk: 'medium'
      rationale: 'A page that states exit codes and a job the repository cannot run (RISK-2, RISK-3).'
    - id: task-004
      risk: 'medium'
      rationale: 'A page that can drift from the guide (RISK-4).'
    - id: task-005
      risk: 'medium'
      rationale: 'Removes four bullets and two generated ids and edits a shared file that W-6 and W-7 to W-8 edit later (RISK-5, RISK-7).'
    - id: task-006
      risk: 'low'
      rationale: 'Runs commands on a copy and mutation checks on a copy.'
    - id: task-007
      risk: 'low'
      rationale: 'Reading and a record.'
  by_area:
    - area: 'docs'
      risk: 'medium'
      rationale: 'The manual is the source that the homepage, llms.txt and later runs lean on; the node tests are the guard.'
    - area: 'infra'
      risk: 'low'
      rationale: 'No workflow, pom or command changes; the Pages publish is not proved by a pull request.'
    - area: 'security'
      risk: 'low'
      rationale: 'The CI example holds no secret and no token, only reads files, and pins the image to a release tag.'
```

## 8. Confidence Assessment

```yaml
confidence_assessment:
  by_task:
    - id: task-001
      score: 85
      rationale: 'The findings are written with their fixes and evidence.'
    - id: task-002
      score: 80
      rationale: 'The test reads text with regular expressions; the Commands part is regular enough, the unknown is the listing forms.'
    - id: task-003
      score: 75
      rationale: 'Prose quality is a judgement; the commands and codes are run, the job is not.'
    - id: task-004
      score: 75
      rationale: 'Prose quality is a judgement; the pointers are to ids that exist.'
    - id: task-005
      score: 80
      rationale: 'Small edits, each pinned by a test.'
    - id: task-006
      score: 80
      rationale: 'Commands and tests with a known expected code each.'
    - id: task-007
      score: 80
      rationale: 'The render check depends on the browser pane.'
```

## 9. Agent Assignment Plan

```yaml
agent_assignment_plan:
  assignments:
    - task_id: task-001
      agent_role: 'Architecture Agent'
      objective: 'Apply the Stage 5 findings F1 to F8 to the TDD and re-read its measured facts on the working copy.'
      context:
        prd_excerpts:
          - 'REQ-1, REQ-3, REQ-4, REQ-5 of the TDD traceability'
        tdd_excerpts:
          - 'TG-1, DEC-2, DEC-6, CTR-1, CTR-2, Q-1, Observability 2 and 4'
      likely_files:
        - 'docs/wav/wav-030-pages-ci-and-toolbar/run/run-0215-manual-missing-pages/tdd-0215-manual-missing-pages.md'
        - 'docs/wav/wav-030-pages-ci-and-toolbar/run/run-0215-manual-missing-pages/prg-0215-manual-missing-pages.md'
      acceptance_criteria:
        - 'F1 to F8 are applied and each has a row in the Findings section'
        - 'Q-1 is worded decided by the drafter and open to the author'
      verification:
        - 'grep -n "^- .FLOW-2." in the TDD prints nothing'
        - 'grep -n "ghcr.io/tmorin/archicode" in the TDD shows the job arguments read in DEC-6 and CTR-1'
        - 'grep -n "3770" in the TDD prints nothing'
        - 'grep -n "grep -rn .#_reference" in the TDD shows the command run with the TDD excluded, and running it prints nothing'
      escalation_triggers:
        - 'a finding contradicts a measured fact'
      suggested_subagent_type: 'general-purpose'
      suggested_model: '(default)'
      suggested_effort: 'medium'
    - task_id: task-002
      agent_role: 'Test Generation Agent'
      objective: 'Save the baseline and write manual-howto.test.js, red on the base copy.'
      context:
        prd_excerpts:
          - 'REQ-1, REQ-2, REQ-4, REQ-5, REQ-7'
        tdd_excerpts:
          - 'DEC-6, CTR-1 to CTR-3, Observability 1'
      likely_files:
        - 'src/test/javascript/manual-howto.test.js'
        - 'src/test/javascript/manual-voice.test.js'
        - 'src/doc/README.adoc'
      acceptance_criteria:
        - 'The three neighbouring tests pass on the base copy'
        - 'The new test is red for the missing sections, strings, part ids, dropped bullets and links'
      verification:
        - 'node --test src/test/javascript/manual-skeleton.test.js src/test/javascript/manual-voice.test.js src/test/javascript/site.test.js exits 0 on the file as it is'
        - 'node --test src/test/javascript/manual-howto.test.js exits non-zero and the failing subtests are the ones for the two ids, the strings, the part ids, the dropped bullets and the llms.txt links (task-003 to task-005 turn them green)'
        - 'npm run format:check and npm run lint exit 0'
      escalation_triggers:
        - 'a baseline test fails before any edit'
      suggested_subagent_type: 'general-purpose'
      suggested_model: '(default)'
      suggested_effort: 'medium'
    - task_id: task-003
      agent_role: 'Documentation Agent'
      objective: 'Write the CI page as the first section of How-to guides.'
      context:
        prd_excerpts:
          - 'REQ-1, REQ-7'
        tdd_excerpts:
          - 'DEC-2, TG-1, CTR-1, Shape of the CI page, Q-2'
      likely_files:
        - 'src/doc/README.adoc'
      acceptance_criteria:
        - 'The page names diff --fail-on, query graph and the codes 1, 2 and 3 in a table'
        - 'The job pins ghcr.io/tmorin/archicode:<version> and says which lines belong to the runner'
      verification:
        - 'node --test src/test/javascript/manual-howto.test.js: the subtests for the howto-ci id, its order, its strings, the digits 1, 2 and 3 and its command lines pass (the other subtests stay red until task-004 and task-005)'
        - 'node --test src/test/javascript/manual-voice.test.js and src/test/javascript/manual-skeleton.test.js exit 0'
        - 'grep -c "^\[\[howto-ci\]\]" src/doc/README.adoc prints 1'
        - 'the default tag of the release image is confirmed in the Quarkus container-image documentation, or the page sentence says the tag is the project version as the workflow sets it and the record says the registry was not checked'
      escalation_triggers:
        - 'a command line needs an undocumented option'
      suggested_subagent_type: 'general-purpose'
      suggested_model: '(default)'
      suggested_effort: 'medium'
    - task_id: task-004
      agent_role: 'Documentation Agent'
      objective: 'Write the agent page right after the CI page.'
      context:
        prd_excerpts:
          - 'REQ-2, REQ-7'
        tdd_excerpts:
          - 'DEC-3, TG-2, CTR-1, Shape of the agent page'
      likely_files:
        - 'src/doc/README.adoc'
      acceptance_criteria:
        - 'The page names archicode guide, archicode init, query graph, query schemas manifest and docs/architecture'
        - 'The page gives the order of use and a pointer, not a copy of the guide'
      verification:
        - 'node --test src/test/javascript/manual-howto.test.js: the subtests for the howto-agent id, its order, its strings and its command lines pass (the subtests of Best Practices, the part ids and llms.txt stay red until task-005)'
        - 'node --test src/test/javascript/manual-voice.test.js and src/test/javascript/manual-skeleton.test.js exit 0'
        - 'grep -c "^\[\[howto-agent\]\]" src/doc/README.adoc prints 1 and the line comes after [[howto-ci]]'
      escalation_triggers:
        - 'the page would copy content of the guide'
      suggested_subagent_type: 'general-purpose'
      suggested_model: '(default)'
      suggested_effort: 'medium'
    - task_id: task-005
      agent_role: 'Documentation Agent'
      objective: 'Shorten Best Practices, link Features, add the part ids, add the llms.txt section and remove the voice-test exemption.'
      context:
        prd_excerpts:
          - 'REQ-4, REQ-5, REQ-6'
        tdd_excerpts:
          - 'DEC-4, DEC-5, CTR-2, CTR-3, Section map of Best Practices'
      likely_files:
        - 'src/doc/README.adoc'
        - 'src/site/llms.txt'
        - 'src/test/javascript/manual-voice.test.js'
      acceptance_criteria:
        - 'The four neighbouring node tests pass'
        - 'No bullet for the dropped topics and no id of the 91 removed'
      verification:
        - 'node --test src/test/javascript/manual-howto.test.js src/test/javascript/manual-skeleton.test.js src/test/javascript/manual-voice.test.js src/test/javascript/site.test.js exits 0'
        - 'grep -c "Pluggable Viewpoint Service" src/doc/README.adoc prints 0'
        - 'grep -rn "BEST_PRACTICES_CI_BULLET" src/test prints nothing'
        - 'grep -rn "#_reference\|#_concepts" src README.md prints nothing'
        - 'npm run format:check and npm run lint exit 0'
      escalation_triggers:
        - 'a new id collides with the homepage'
      suggested_subagent_type: 'general-purpose'
      suggested_model: '(default)'
      suggested_effort: 'medium'
    - task_id: task-006
      agent_role: 'QA Agent'
      objective: 'Run the command lines of the pages on the jar, the tests, the build and the mutation checks.'
      context:
        prd_excerpts:
          - 'REQ-3, REQ-4, REQ-6, REQ-7'
        tdd_excerpts:
          - 'Observability and Verification 1 to 7'
      likely_files:
        - 'src/doc/README.adoc'
        - 'src/site/llms.txt'
        - 'src/test/javascript/manual-howto.test.js'
      acceptance_criteria:
        - 'Each command line gives the code the page says'
        - 'Each mutation fails the test it targets and leaves nothing in the tree'
      verification:
        - 'npm run test:unit, npm run format:check and npm run lint exit 0'
        - './mvnw test -Dtest=ManualExamplesTest and ./mvnw test -Dtest=PlateauComparisonTest exit 0 with JAVA_HOME set to JDK 25'
        - 'git diff --stat against the baseline of task-002 shows only src/doc/README.adoc, src/site/llms.txt, src/test/javascript/manual-howto.test.js, src/test/javascript/manual-voice.test.js and the run folder'
        - 'git status --short -- src/doc/examples src/main src/site/index.html src/site/sitemap.xml src/test/javascript/manual-skeleton.test.js src/test/javascript/manual-anchors.json .github shows no line that the baseline did not have'
      escalation_triggers:
        - 'a command gives another code than the page says'
      suggested_subagent_type: 'general-purpose'
      suggested_model: '(default)'
      suggested_effort: 'medium'
    - task_id: task-007
      agent_role: 'Documentation Agent'
      objective: 'Read the two pages as a reader and write the record of the run.'
      context:
        prd_excerpts:
          - 'REQ-1, REQ-2, REQ-4'
        tdd_excerpts:
          - 'Observability 6, IMP-5, Q-1, Deferred Work'
      likely_files:
        - 'docs/wav/wav-030-pages-ci-and-toolbar/run/run-0215-manual-missing-pages/prg-0215-manual-missing-pages.md'
        - 'target/generated-docs/index.html'
      acceptance_criteria:
        - 'The record names the dropped topics and the exit codes'
        - 'The render is recorded as checked or as not checked'
      verification:
        - 'grep -n "Diagrams Styling" in the record of the run prints at least one line'
        - 'grep -n "Viewpoint Utilization" in the record of the run prints at least one line'
        - 'grep -c "Pluggable Viewpoint Service" src/doc/README.adoc prints 0'
      escalation_triggers:
        - 'the reader pass finds a missing fact'
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
        - 'grep on the TDD'
      success_criteria:
        - 'F1 to F8 are applied and logged'
    - task_id: task-002
      methods:
        - 'node --test'
        - 'format check'
        - 'lint'
      success_criteria:
        - 'The new test is red for the expected subtests and the three neighbouring tests are green'
    - task_id: task-003
      methods:
        - 'node --test'
      success_criteria:
        - 'The howto-ci subtests pass and the voice and skeleton tests stay green'
    - task_id: task-004
      methods:
        - 'node --test'
      success_criteria:
        - 'The howto-agent subtests pass and the voice and skeleton tests stay green'
    - task_id: task-005
      methods:
        - 'node --test'
        - 'grep'
        - 'format check'
        - 'lint'
      success_criteria:
        - 'The four node tests pass, the dropped bullets and the exemption are gone, llms.txt links the four ids'
    - task_id: task-006
      methods:
        - 'commands run on the jar'
        - 'npm run test:unit'
        - 'Maven tests'
        - 'Asciidoctor lines and id comparison'
        - 'mutation checks on a copy'
      success_criteria:
        - 'Every exit code matches the page, the tests pass, the warnings are not more, each mutation fails its test'
    - task_id: task-007
      methods:
        - 'grep on the record'
        - 'reader pass in the browser pane'
      success_criteria:
        - 'The record names the dropped topics and the render is recorded as checked or not checked'
```

## 11. Escalation Rules

```yaml
escalation_rules:
  rules:
    - condition: 'A command line of a page gives a code or a message other than the page says'
      action: 'Fix the page, never the command, rerun the proof and log it.'
    - condition: 'The voice test fails on a gate or filler word in the new text'
      action: 'Rewrite the sentence; no exemption is added.'
    - condition: 'A change would touch a line owned by W-6 (the command reference) or a file the TDD lists as not touched'
      action: 'Leave the line and list it in the record.'
    - condition: 'A new id collides with an id of the homepage, or site.test.js refuses a link'
      action: 'Rename the id or fix the link, never the test.'
    - condition: 'The author overturns Q-1 at the plan review'
      action: 'Write one bullet and one section for Viewpoint Utilization; no other part moves.'
    - condition: 'The Asciidoctor lines after exceed the baseline'
      action: 'Find the line (a level jump or a lost anchor) and fix it before going on.'
    - condition: 'The browser pane is unavailable'
      action: 'Record the render as not checked; do not claim it.'
    - condition: 'The run operates under the autonomy override of complete-run and a task is flagged review_after or human_review after'
      action: 'Execute without a stop, log the review in the prg, and report it when the run ends.'
```

## 12. Final Execution Manifest

```yaml
execution_manifest:
  status: 'done'
  recommendation: 'proceed_with_review'
  autonomy_level: 'medium'
  total_tasks: 7
  autonomous_tasks: 6
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
    - task-007
  parallel_groups: []
  required_human_gates:
    - gate-001
  highest_risk_tasks:
    - task-003
    - task-004
    - task-005
  lowest_confidence_tasks:
    - task-003
    - task-004
  next_action: 'Run task-001: amend the TDD with the Stage 5 findings, then task-002 writes manual-howto.test.js red.'
  criteria:
    - 'Two how-to sections under How-to guides, every command line of them true, the ids pinned by a node test'
    - 'Best Practices promises only what it has, llms.txt names the Reference and Concepts parts, the voice test has no exemption'
    - 'The node tests, unit tests, format, lint, ManualExamplesTest and PlateauComparisonTest pass and the Asciidoctor lines are not more than before'
```
