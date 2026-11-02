---
title: Execution Plan — Manual concepts and voice
status: done
date: 2026-11-01
related:
  - docs/wav/wav-030-pages-ci-and-toolbar/run/run-0214-manual-concepts-and-voice/tdd-0214-manual-concepts-and-voice.md
  - docs/wav/wav-030-pages-ci-and-toolbar/wav-030-pages-ci-and-toolbar.md
  - docs/wav/wav-030-pages-ci-and-toolbar/wbc-030-pages-ci-and-toolbar.md
  - src/doc/README.adoc
  - src/test/javascript/manual-skeleton.test.js
  - https://github.com/tmorin/archicode/issues/193
type: pln
run: 0214
wave: 030
---

# Execution Plan: Manual concepts and voice

Profile TDD+pln: there is no PRD, so REQ-1 to REQ-6 are the IDs the TDD labels (section "PRD Traceability"), taken from the W-4 row and the first criterion of gate P2 of the wave manifest. The plan follows the TDD plus the Stage 5 review findings (progress log, Stage 5 line and Stage 6 line), which the TDD does not yet carry.

The order is test first. task-001 amends the TDD with the review findings, task-002 measures the baseline and writes `manual-voice.test.js` red on the base copy, task-003 builds the one `== Plateaus` page from the two old pieces by script (facts and listings copied), task-004 rewrites the prose of that page in the voice of D3, task-005 clears the filler words and paragraphs from the whole manual, task-006 proves the result (fact comparison, build, ids, readers, mutation check, gate commands), task-007 reads the page as a reader and writes the run record.

The wave is strictly sequential: every task edits `src/doc/README.adoc` or reads a file derived from it, so there is no parallel group.

Baseline of the diff checks: the working tree holds uncommitted work of runs 0211 to 0213 and the wave documents. A check of the form `git diff --stat -- <paths>` that reads "unchanged" is read against a baseline taken by task-002 before its first edit (the output of `git diff --stat` and `git status --short` saved in the scratchpad), not against HEAD. The base copy of the manual is the file as it is when task-002 starts (the result of run 0213), saved in the scratchpad, plus `git show ff3bacd:src/doc/README.adoc` for the ids.

Q-1 of the TDD stays open and is the blocker for the wave manifest: seven lines of the base copy (four distinct strings; the seven are `journey` in two quoted error listings at lines 442 and 3712, `order_journey` at 1852, `01-shop_overview-journey` at 2897, `seller_journey` at 3044 and 3047, and the facet `journey` in a code span at 3735, measured at Stage 9) keep a gate word and cannot go without a change to a command message or a fixture, which the wave excludes. The run proves 0 outside listings and code spans and asks that the first criterion of gate P2 read "outside listings and code spans" (or "prints 7"). The plan does not wait on it.

This run operates under the autonomy override of `complete-run`: no task stops for a human on its category alone. No task of this plan is `critical` or `human_required`, so the override changes no route. Nothing in this plan commits, pushes, merges, tags or releases: those are human steps outside the plan. The JDK of the shell is 21; every task that runs Maven or the jar sets `JAVA_HOME=/home/tibo/.sdkman/candidates/java/25.0.4-tem`.

## 1. Executive Summary

```yaml
summary:
  status: 'done'
  product_goal: 'The manual has one page about plateaus under Concepts (== Plateaus, every id kept, one word per thing), and the filler intros and filler words are gone from the whole manual (#193 b).'
  technical_approach: 'Measure the baseline and write a node test of the words, the heading and the order of ids (red), build the page from the two old pieces with a script that copies listings, tables and quotes, rewrite the prose by hand paragraph by paragraph, clear the filler lists across the file, prove no fact was lost by a set comparison and the build, and read the page once as a reader.'
  total_tasks: 7
  parallel_groups: 0
  high_risk_tasks: 0
  human_review_gates: 1
  autonomy_level: 'medium'
  recommendation: 'proceed_with_review'
  criteria:
    - 'grep -c "^=\+ Plateaus$" src/doc/README.adoc prints 1, the line is a level-1 section under = Concepts, and Limits of today is the next == of that part (REQ-1)'
    - 'Every id of git show ff3bacd:src/doc/README.adoc is still defined and no <<id>> points to a missing id; plateaus-overview is defined once, inline (REQ-2)'
    - 'The page does not call a plateau a state and uses the six words of the glossary; the title States of an architecture is gone (REQ-3, REQ-6)'
    - 'The words journey, prowess, delve and unlock are absent outside listings and code spans, and the seven remaining literal lines are listed with their reason (REQ-4, Q-1)'
    - 'node --test src/test/javascript/manual-voice.test.js passes and fails on a mutated copy for each of: a filler word, a second Plateaus heading, two swapped ids (REQ-5)'
    - 'The fact comparison lists no lost code span, link target, number or listing of the two old pieces except the two merged notes, and the Asciidoctor lines after are not more than before'
    - 'npm run test:unit, npm run format:check, npm run lint, ManualExamplesTest and PlateauComparisonTest exit 0, the nine readers of the manual are unmodified, and git diff ff3bacd -- src/doc/examples prints nothing'
```

## 2. PRD/TDD Consistency Assessment

```yaml
consistency_assessment:
  aligned_items:
    - 'Scope, REQ-1 to REQ-6, DEC-1 to DEC-7, CTR-1 to CTR-3 and IMP-1 to IMP-3 agree with the W-4 row and the first criterion of gate P2; every task below traces to them'
    - 'Q-2 and Q-3 are settled (the filler pass covers the whole file, the Best Practices bullets stay for W-5)'
    - 'No CLAUDE.md, no command, no editor code, no example and no workflow is touched; scripts/changes.mjs already sends src/doc/README.adoc to Java and Page and a new test under src/test/javascript runs in Page'
  gaps:
    - id: gap-001
      type: contradiction
      description: 'Stage 5 (S3): the four literals of ASM-6 are seven lines of the file, not four, and Best Practices carries six lines with gate words, not two. DEC-5 and Observability 4 quote the wrong counts.'
      impact: 'high'
      recommendation: 'task-001 re-measures with grep -niE on the base copy outside listings and code spans and corrects ASM-6, DEC-5 and Observability 4; the Best Practices rule becomes: every sentence that carries a gate word is rewritten, the six-item topic list stays as it is.'
    - id: gap-002
      type: contradiction
      description: 'Stage 5 (S2): README.md line 37 still quotes the old title "States of an architecture (plateaus)", which this run removes.'
      impact: 'medium'
      recommendation: 'task-001 adds IMP-4 (README.md, one sentence) to the TDD; task-004 changes that sentence to the title Plateaus. The manual is still the source and no test reads README.md; the task checks with grep that no file of src or the root quotes the old title.'
    - id: gap-003
      type: contradiction
      description: 'Stage 5 (S2): DEC-6 defines a plateau with the word "state" while REQ-6 forbids it.'
      impact: 'medium'
      recommendation: 'task-001 rewrites the definition as "one layer of the architecture over the plateau it overrides" in DEC-6 and CTR-3.'
    - id: gap-004
      type: ambiguity
      description: 'Stage 5 (S2) and Stage 6: Q-1 is a real tradeoff and is now labelled open, but its Summary, REQ-4 and Observability 4 wording still say settled in places.'
      impact: 'medium'
      recommendation: 'task-001 makes REQ-4, the Summary and Observability 4 say open, blocker for the wave manifest, criterion read as outside listings and code spans.'
    - id: gap-005
      type: ambiguity
      description: 'The progress log names four of the ten Stage 5 findings (the two S3 and two of the S2). The other six are not written in a findings table.'
      impact: 'medium'
      recommendation: 'task-001 applies the four named ones, then re-reads the TDD against the base copy for line numbers, counts and ids (ASM-1 to ASM-6), fixes any that differ and lists each fix in the prg Findings. It does not invent findings it cannot trace to the file.'
    - id: gap-006
      type: risk
      description: 'The voice is a judgement and a rewrite may lose a fact that is stated only in prose.'
      impact: 'medium'
      recommendation: 'task-006 runs the set comparison (code spans, link targets, numbers, listings) and task-007 reads the page; the pinned strings of ASM-5 are copied byte for byte and the nine readers run.'
    - id: gap-007
      type: risk
      description: 'The wide filler diff (about 120 lines outside the plateau page) could change a meaning or touch a line W-5 owns (Best Practices bullets).'
      impact: 'medium'
      recommendation: 'task-005 keeps a worklist by line and first words, rewrites only sentences that carry a listed word or are a welcome or a conclusion, leaves the Best Practices topic list byte for byte, and task-006 compares the whole file for lost spans and numbers.'
    - id: gap-008
      type: contradiction
      description: 'Stage 9 (C scan against the repository): the TDD (ASM-6, Q-1) names the literals as `journey` in the error text and `seller_journey`, but grep -niE on the base copy hits seven lines inside listings or code spans (442, 1852, 2897, 3044, 3047, 3712, 3735) with four distinct strings: `journey` (442, 3712, 3735), `order_journey` (1852), `01-shop_overview-journey` (2897) and `seller_journey` (3044, 3047). grep -c prints 7, so the alternative reading of the criterion as prints 4 would fail.'
      impact: 'medium'
      recommendation: 'task-001 corrects ASM-6, REQ-4 and Q-1 to the measured seven lines and four strings (ASM-6 lists two of the four strings and 442 and 3712 are the only quoted messages); the amended wording asked of the author is outside listings and code spans, or prints 7. No message or fixture changes.'
    - id: gap-009
      type: risk
      description: 'The render (table of contents with two entries under Concepts, the new page, the pointer in Domain) has no automated form.'
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
        - 'tdd-0214-manual-concepts-and-voice.md amended'
      agent_role: 'Architecture Agent'
      autonomy: 'autonomous'
      risk: 'low'
      confidence: 85
    - id: task-002
      status: 'done'
      title: 'Measure the baseline and write manual-voice.test.js, red'
      depends_on: [task-001]
      produces:
        - 'src/test/javascript/manual-voice.test.js'
        - 'baseline files in the scratchpad'
      agent_role: 'Test Generation Agent'
      autonomy: 'autonomous'
      risk: 'low'
      confidence: 80
    - id: task-003
      status: 'done'
      title: 'Build the Plateaus page from the two old pieces and leave the pointer in Domain'
      depends_on: [task-002]
      produces:
        - 'src/doc/README.adoc with one == Plateaus and == Limits of today in Concepts'
        - 'the cutting script in the scratchpad'
      agent_role: 'Documentation Agent'
      autonomy: 'autonomous'
      risk: 'medium'
      confidence: 75
    - id: task-004
      status: 'done'
      title: 'Rewrite the prose of the page in the voice of D3'
      depends_on: [task-003]
      produces:
        - 'src/doc/README.adoc with the page rewritten, the settings.plateaus note in Upgrading'
        - 'README.md with the new title'
        - 'the paragraph list for the record in the scratchpad'
      agent_role: 'Documentation Agent'
      autonomy: 'autonomous'
      risk: 'medium'
      confidence: 70
    - id: task-005
      status: 'done'
      title: 'Clear the filler words and welcome paragraphs from the whole manual'
      depends_on: [task-004]
      produces:
        - 'src/doc/README.adoc without list A and list B words outside listings and code spans'
        - 'the worklist by line and first words in the scratchpad'
      agent_role: 'Documentation Agent'
      autonomy: 'autonomous'
      risk: 'medium'
      confidence: 72
    - id: task-006
      status: 'done'
      title: 'Prove the result: facts, build, ids, readers, mutation check, gate commands'
      depends_on: [task-005]
      produces:
        - 'comparison output, build lines and id pairs in the scratchpad'
      agent_role: 'QA Agent'
      autonomy: 'autonomous'
      risk: 'low'
      confidence: 80
    - id: task-007
      status: 'done'
      title: 'Read the page as a reader and write the run record'
      depends_on: [task-006]
      produces:
        - 'run-0214-manual-concepts-and-voice.md with the record'
      agent_role: 'QA Agent'
      autonomy: 'review_after'
      risk: 'low'
      confidence: 75
  edges:
    - from: task-001
      to: task-002
      reason: 'the test and the baseline follow the corrected counts and the open Q-1'
    - from: task-002
      to: task-003
      reason: 'the page is built against a red test and a measured baseline'
    - from: task-003
      to: task-004
      reason: 'the prose is rewritten inside the sections where the script put it'
    - from: task-004
      to: task-005
      reason: 'the filler pass runs on the file after the page is final, so a gate word in the page is not fixed twice'
    - from: task-005
      to: task-006
      reason: 'the proof reads the finished file'
    - from: task-006
      to: task-007
      reason: 'the record states the results of the proof'
```

## 4. Task Catalog

```yaml
task_catalog:
  tasks:
    - id: task-001
      title: 'Amend the TDD with the Stage 5 findings'
      source_requirements:
        prd:
          - 'REQ-4'
          - 'REQ-6'
        tdd:
          - 'ASM-1 to ASM-6, DEC-5, DEC-6, CTR-3, Q-1, Observability 4, Repository Impact'
      outputs:
        - 'tdd-0214-manual-concepts-and-voice.md with: ASM-6 and DEC-5 counting the seven lines of the literals and the six Best Practices lines measured with grep on the base copy; IMP-4 for README.md (one sentence that names the title); DEC-6 and CTR-3 defining a plateau without the word state; ASM-6, REQ-4 and Q-1 naming the four strings and the seven lines measured at Stage 9 (gap-008); REQ-4, Summary and Observability 4 saying Q-1 is open, blocker for the wave manifest'
        - 'the Findings section of prg-0214-manual-concepts-and-voice.md with one row per fix (what was wrong, the evidence, the change), and any count of ASM-1 to ASM-6 that differed on re-reading'
      verification:
        - 'grep -c "IMP-4" in the TDD prints at least 2'
        - 'grep -n "Q-1" in the TDD shows no line that says settled for Q-1'
        - 'grep -n "state of the architecture" in the TDD prints no line inside DEC-6 or CTR-3 that defines a plateau'
        - 'grep -niE "journey|prowess|delve|unlock" on the base copy, outside listings and code spans by the same script task-002 will use, gives the counts the TDD now states'
      risk: 'low'
      confidence: 85
      human_review: 'none'
      escalation_triggers:
        - 'a count of the TDD cannot be reproduced on the base copy: write the measured count and list the difference'
        - 'applying a finding would change the first criterion of gate P2 beyond the Q-1 wording'
      delegation_tier: 'standard'
      results: 'tier standard, model sonnet, effort medium, profile low-cost, passed first time, inline (leaf), independently verified'
    - id: task-002
      title: 'Measure the baseline and write manual-voice.test.js, red'
      source_requirements:
        prd:
          - 'REQ-1'
          - 'REQ-4'
          - 'REQ-5'
          - 'REQ-6'
        tdd:
          - 'DEC-7'
          - 'DEC-5'
          - 'ASM-1'
          - 'ASM-2'
          - 'FLOW-1 steps 1 and 2'
          - 'Observability 1'
      outputs:
        - 'Scratchpad baseline: a copy of src/doc/README.adoc as it is, git show ff3bacd:src/doc/README.adoc, the Asciidoctor lines (asciidoctor: WARNING, ERROR, INFO) of ./mvnw -o generate-resources, the id-to-heading pairs of target/generated-docs/index.html, the counts of lists A, B and C and of the glossary variants, git diff --stat and git status --short'
        - 'src/test/javascript/manual-voice.test.js with the checks of DEC-7 (1) to (8) reading src/doc/README.adoc as text (or the path of an environment variable for the mutation check), formatted by Prettier and clean under ESLint'
      verification:
        - 'node --test src/test/javascript/manual-skeleton.test.js exits 0 on the file as it is (the 91 ids are defined)'
        - 'node --test src/test/javascript/manual-voice.test.js exits non-zero and the failing subtests are the filler words, the one Plateaus heading under Concepts, the pointer in Domain and the order of the ids (task-003 to task-005 turn them green)'
        - 'npm run format:check and npm run lint exit 0'
        - 'git diff --stat is the same as the baseline except the new test file'
      risk: 'low'
      confidence: 80
      human_review: 'none'
      escalation_triggers:
        - 'the unmodified build prints an Asciidoctor line: the baseline is then not 0 and is recorded as measured'
        - 'a subtest passes on the base copy that should fail: the check is vacuous, fix it'
      delegation_tier: 'standard'
      results: 'tier standard, model sonnet, effort medium, profile low-cost, passed first time, inline (leaf), independently verified'
    - id: task-003
      title: 'Build the Plateaus page from the two old pieces and leave the pointer in Domain'
      source_requirements:
        prd:
          - 'REQ-1'
          - 'REQ-2'
        tdd:
          - 'DEC-1'
          - 'DEC-2'
          - 'DEC-3'
          - 'CTR-1'
          - 'CTR-2'
          - 'CON-3'
          - 'FLOW-1 step 3'
      outputs:
        - 'A script in the scratchpad that cuts the two old pieces at their headings and writes the page in the order of the DEC-1 table: [[plateaus]] above == Plateaus, [[plateaus-overview,Plateaus]] inline in its first paragraph, the eight === sections, listings tables and quoted messages copied byte for byte, the old prose moved as it is (not yet rewritten)'
        - 'src/doc/README.adoc with == Limits of today as the second == of Concepts (id kept), the filler paragraph that ended Workspace and both old pieces removed from Domain, and one sentence there that links to <<plateaus,Plateaus>>'
      verification:
        - 'grep -c "^=\+ Plateaus$" src/doc/README.adoc prints 1 and the line is == under the part Concepts'
        - 'node --test src/test/javascript/manual-skeleton.test.js exits 0 (every id still defined)'
        - 'the ids of the page appear after [[plateaus]] in the order of DEC-7 (5) and before [[plateau-limits]]'
        - 'the lines of ASM-5 (REPLACES_WARNING plus table, the table rows | removed |, | moved |, | split |, | merged |, the block that starts comparing to-be (To be) with baseline (As is)) are present byte for byte'
        - 'node --test src/test/javascript/manual-voice.test.js: the heading, the pointer and the order subtests pass; only the filler words and the state wording subtests still fail (task-004 and task-005 turn them green)'
      risk: 'medium'
      confidence: 75
      human_review: 'none'
      escalation_triggers:
        - 'a block does not cut at a heading boundary of the base copy: cut at the headings and not at the line numbers (ASM-1)'
        - 'an anchor ends above the wrong block'
        - 'a generated id collides with an existing one: rename the new heading, not the old one'
      delegation_tier: 'standard'
      results: 'tier standard, model sonnet, effort medium, profile low-cost, passed first time, inline (leaf), independently verified'
    - id: task-004
      title: 'Rewrite the prose of the page in the voice of D3'
      source_requirements:
        prd:
          - 'REQ-2'
          - 'REQ-3'
          - 'REQ-5'
          - 'REQ-6'
        tdd:
          - 'DEC-3'
          - 'DEC-4'
          - 'DEC-6'
          - 'CTR-3'
          - 'IMP-4'
          - 'ASM-5'
      outputs:
        - 'src/doc/README.adoc: the prose of the page rewritten paragraph by paragraph from the base copy (one idea per sentence, second person for what the reader does, present tense, one word per thing by the glossary of DEC-6), listings, tables and quotes unchanged; the second breaking-change note merged into one with a link to plateaus-upgrade; the settings.plateaus NOTE moved to the start of plateaus-upgrade with its first paragraph changed to "quoted below"; the settings told once; the promise of the story in one place deleted; every pointer word (above, below, in the Domain section, in the next part) in a moved block or a link to it fixed'
        - 'README.md line 37 naming the title Plateaus'
        - 'a list in the scratchpad of every paragraph with its old and new first words, and of every code span, link target, number or listing that went, each with its reason'
      verification:
        - 'node --test src/test/javascript/manual-voice.test.js: the state wording and pointer words subtests pass'
        - 'node --test src/test/javascript/manual-skeleton.test.js exits 0 and the lines of ASM-5 are still byte for byte'
        - 'grep -rn "States of an architecture" README.md src prints nothing'
        - 'a script over the base copy and the file prints the code spans, link targets, numbers and listing blocks of the two old pieces that are not on the new page, and the list holds only the two merged notes or items the list gives a reason for'
      risk: 'medium'
      confidence: 70
      human_review: 'none'
      escalation_triggers:
        - 'a fact stated only in prose cannot be placed in one sentence: keep the original sentence and list it'
        - 'a reader test fails on a changed line: restore the line byte for byte'
      delegation_tier: 'standard'
      results: 'tier standard, model sonnet, effort medium, profile low-cost, passed first time, inline (leaf), independently verified'
    - id: task-005
      title: 'Clear the filler words and welcome paragraphs from the whole manual'
      source_requirements:
        prd:
          - 'REQ-4'
          - 'REQ-3'
        tdd:
          - 'DEC-5'
          - 'DEC-6'
          - 'Q-1'
          - 'ASM-6'
      outputs:
        - 'src/doc/README.adoc where each hit of list A (journey, prowess, delve, unlock) and of list B (empower, embark, elevate, seamless, realm, intricate, pivotal, let''s, tapestry, in essence, leverage) outside listings and code spans is rewritten in plain words or the sentence is deleted when it says nothing, and each paragraph of list C (welcomes and conclusions, the Introduction paragraph of run 0213, the closing blocks of the two tutorials, the opening and closing paragraphs of the Domain chapters) is cut to one or two sentences or deleted'
        - 'Best Practices: the welcome paragraph is one sentence that says what the part holds, the closing paragraph is deleted, every other sentence that carries a gate word is rewritten, the six-item topic list stays byte for byte; the two Commands sentences with unlocks are rewritten and nothing else of Commands'
        - 'the worklist by line and first words, and the glossary variants left in text the run does not touch, in the scratchpad'
      verification:
        - 'node --test src/test/javascript/manual-voice.test.js exits 0'
        - 'grep -niE "journey|prowess|delve|unlock" src/doc/README.adoc prints only the literal lines of Q-1 (seven on the base copy, re-measured by task-001), each inside a listing or a code span'
        - 'git diff -- src/doc/examples prints nothing against the baseline and git diff ff3bacd -- src/doc/examples is empty'
        - 'node --test src/test/javascript/manual-skeleton.test.js exits 0 and the Best Practices topic list is byte for byte the base list'
      risk: 'medium'
      confidence: 72
      human_review: 'none'
      escalation_triggers:
        - 'a hit is inside a listing or a quote of a message: leave it, list it as a literal'
        - 'a sentence with a gate word carries a fact: rewrite it, keep the fact'
        - 'a line W-5 owns (the Best Practices bullets) would change: leave it'
      delegation_tier: 'standard'
      results: 'tier standard, model sonnet, effort medium, profile low-cost, passed first time, inline (leaf), independently verified'
    - id: task-006
      title: 'Prove the result: facts, build, ids, readers, mutation check, gate commands'
      source_requirements:
        prd:
          - 'REQ-1'
          - 'REQ-2'
          - 'REQ-4'
          - 'REQ-5'
        tdd:
          - 'Observability 1 to 6 and 8'
          - 'DEC-4'
          - 'DEC-7'
          - 'ASM-3'
          - 'ASM-4'
      outputs:
        - 'The fact comparison of DEC-4 on the two old pieces and on the whole file (code spans, link targets, numbers, listings), the lost ones listed with their reason'
        - 'The Asciidoctor lines after, listed, and the id-to-heading pairs of both builds compared with the swaps of ASM-3 and the dropped generated ids listed'
        - 'The mutation check on a copy: a filler word put back, a second == Plateaus, two ids swapped, the voice test fails each time and the repository file is not modified'
        - 'The gate commands and their output'
      verification:
        - 'JAVA_HOME=/home/tibo/.sdkman/candidates/java/25.0.4-tem ./mvnw -o generate-resources exits 0 and the Asciidoctor lines after are not more than before'
        - 'every id of git show ff3bacd:src/doc/README.adoc is defined in src/doc/README.adoc and every <<id>> target exists (the PlantUML stereotypes and the YAML key << are not references)'
        - 'node --test src/test/javascript/manual-voice.test.js and src/test/javascript/manual-skeleton.test.js, npm run test:unit, npm run format:check and npm run lint exit 0'
        - 'JAVA_HOME=/home/tibo/.sdkman/candidates/java/25.0.4-tem ./mvnw test -Dtest=ManualExamplesTest and ./mvnw test -Dtest=PlateauComparisonTest exit 0'
        - 'git diff against the baseline shows none of the nine readers modified, and the changed files are only src/doc/README.adoc, README.md, the new test and the run documents'
        - 'the mutation check fails three times on the copy and src/doc/README.adoc is unchanged by it'
      risk: 'low'
      confidence: 80
      human_review: 'none'
      escalation_triggers:
        - 'a code span or number is lost without a reason: put it back in its sentence (task-004 terms)'
        - 'the Asciidoctor lines after exceed the baseline: find the line (a level jump or a lost anchor) and fix it'
        - 'a reader test fails: restore the changed line byte for byte'
      delegation_tier: 'standard'
      results: 'tier standard, model sonnet, effort medium, profile low-cost, passed first time, inline (leaf), independently verified'
    - id: task-007
      title: 'Read the page as a reader and write the run record'
      source_requirements:
        prd:
          - 'REQ-3'
          - 'REQ-4'
          - 'REQ-5'
        tdd:
          - 'IMP-3'
          - 'Observability 7'
          - 'FLOW-1 step 8'
          - 'Q-1'
      outputs:
        - 'The page and the rewritten intros read top to bottom as a reader who knows nothing of plateaus, what is not plain fixed, the build repeated'
        - 'run-0214-manual-concepts-and-voice.md with: the Asciidoctor lines before and after, the generated ids that change, the fact comparison result, the list of paragraphs touched by line and first words, the literal lines of Q-1 with the request that the gate criterion read outside listings and code spans, the glossary variants left, what was read by eye, and the commands run'
        - 'the status of run-0214-manual-concepts-and-voice.md left to the main agent (this task does not set done)'
      verification:
        - 'grep -c Asciidoctor in run-0214-manual-concepts-and-voice.md prints at least 2 and the file holds the changed-paragraph list and the literal lines of Q-1'
        - 'target/generated-docs/index.html opened in the browser pane shows two entries under Concepts (Plateaus, Limits of today) and the click on #plateaus, #plateaus-overview and #plateau-comparison lands on the page; the record says this was by eye, or says not checked if the pane is unavailable'
        - 'node --test src/test/javascript/manual-voice.test.js and npm run format:check exit 0 after the last edit'
      risk: 'low'
      confidence: 75
      human_review: 'after'
      escalation_triggers:
        - 'the browser pane is unavailable: record not checked and do not claim the check'
        - 'the read finds a sentence that lost a fact: restore it and rerun task-006 checks'
      delegation_tier: 'standard'
      results: 'tier standard, model sonnet, effort medium, profile low-cost, passed first time, inline (leaf), independently verified'
```

## 5. Parallelization Plan

```yaml
parallelization_plan:
  groups: []
```

No group: the wave is sequential by decision, and every task reads or edits `src/doc/README.adoc` or a file derived from it. Shared-file conflict is the reason (one file, about 3700 lines, one editor at a time).

## 6. Human Review Gates

```yaml
human_review_gates:
  gates:
    - id: gate-001
      trigger: 'The run ends with Q-1 open: seven literal lines keep a gate word, so a literal reading of the first criterion of gate P2 cannot pass.'
      required_before: []
      required_after: ['task-007']
      reviewer_focus:
        - 'Accept that the criterion reads outside listings and code spans (or prints 7), or ask for a separate change to the error message and the fixture'
        - 'Read the Plateaus page once: is it plain and direct, and is any fact missing'
        - 'Scan the list of paragraphs touched outside the page'
```

Under the autonomy override of `complete-run` this gate does not stop the run: it is logged in the prg and reported to the author when the run ends.

## 7. Risk Assessment

```yaml
risk_assessment:
  by_task:
    - id: task-001
      risk: 'low'
      rationale: 'Edits a design document against measured counts.'
    - id: task-002
      risk: 'low'
      rationale: 'Additive test and a measurement; nothing shipped changes.'
    - id: task-003
      risk: 'medium'
      rationale: 'Moves about 400 lines and ids that the site, the editor and four tests link to; mitigated by the script, the byte-for-byte lines and the fixture test.'
    - id: task-004
      risk: 'medium'
      rationale: 'Rewriting prose can lose a fact; mitigated by the set comparison and the pinned strings.'
    - id: task-005
      risk: 'medium'
      rationale: 'About 120 lines outside the page; each is a sentence with no fact in it, but the diff is wide and W-5 edits the neighbours.'
    - id: task-006
      risk: 'low'
      rationale: 'Read-only proof, writes only to the scratchpad.'
    - id: task-007
      risk: 'low'
      rationale: 'Reading and a run record.'
  by_area:
    - area: 'docs'
      risk: 'medium'
      rationale: 'One file of about 3700 lines read as text by nine tests and by links of the site and the editor.'
    - area: 'ui'
      risk: 'low'
      rationale: 'The editor and the site read explicit ids only, and every explicit id is kept.'
    - area: 'api'
      risk: 'low'
      rationale: 'No command, schema or message changes; quoted messages stay byte for byte.'
```

## 8. Confidence Assessment

```yaml
confidence_assessment:
  by_task:
    - id: task-001
      score: 85
      rationale: 'Four findings are named in the log; the rest is re-measured from the file.'
    - id: task-002
      score: 80
      rationale: 'Same shape as the skeleton test of run 0213.'
    - id: task-003
      score: 75
      rationale: 'A script move with a measured baseline; the new order is a table in the TDD.'
    - id: task-004
      score: 70
      rationale: 'The voice is a judgement and the test keeps only words, ids and order.'
    - id: task-005
      score: 72
      rationale: 'Finite word lists, but the paragraphs of list C are a judgement.'
    - id: task-006
      score: 80
      rationale: 'Commands with exit codes and a comparison script.'
    - id: task-007
      score: 75
      rationale: 'The render check depends on the browser pane.'
```

## 9. Agent Assignment Plan

```yaml
agent_assignment_plan:
  assignments:
    - task_id: task-001
      agent_role: 'Architecture Agent'
      objective: 'Apply the Stage 5 findings to the TDD and re-measure its counts on the base copy.'
      context:
        prd_excerpts:
          - 'REQ-4 and REQ-6 of the TDD traceability'
        tdd_excerpts:
          - 'ASM-6, DEC-5, DEC-6, CTR-3, Q-1, Observability 4'
      likely_files:
        - 'docs/wav/wav-030-pages-ci-and-toolbar/run/run-0214-manual-concepts-and-voice/tdd-0214-manual-concepts-and-voice.md'
        - 'docs/wav/wav-030-pages-ci-and-toolbar/run/run-0214-manual-concepts-and-voice/prg-0214-manual-concepts-and-voice.md'
      acceptance_criteria:
        - 'Counts in the TDD equal the measured counts'
        - 'Q-1 is open everywhere it is named'
        - 'IMP-4 exists'
      verification:
        - 'grep -c "IMP-4" in the TDD prints at least 2'
        - 'grep -n "Q-1" in the TDD shows no line that says settled for Q-1'
        - 'grep -n "state of the architecture" in the TDD prints no line inside DEC-6 or CTR-3 that defines a plateau'
        - 'grep -niE "journey|prowess|delve|unlock" on the base copy, outside listings and code spans by the same script task-002 will use, gives the counts the TDD now states'
      escalation_triggers:
        - 'a finding contradicts a measured fact'
      suggested_subagent_type: 'general-purpose'
      suggested_model: '(default)'
      suggested_effort: 'medium'
    - task_id: task-002
      agent_role: 'Test Generation Agent'
      objective: 'Save the baseline and write manual-voice.test.js, red on the base copy.'
      context:
        prd_excerpts:
          - 'REQ-1, REQ-4, REQ-5, REQ-6'
        tdd_excerpts:
          - 'DEC-7 checks (1) to (8) and Observability 1'
      likely_files:
        - 'src/test/javascript/manual-voice.test.js'
        - 'src/test/javascript/manual-skeleton.test.js'
      acceptance_criteria:
        - 'The test fails for the right reasons and is not vacuous'
        - 'Format and lint pass'
      verification:
        - 'node --test src/test/javascript/manual-skeleton.test.js exits 0 on the file as it is (the 91 ids are defined)'
        - 'node --test src/test/javascript/manual-voice.test.js exits non-zero and the failing subtests are the filler words, the one Plateaus heading under Concepts, the pointer in Domain and the order of the ids (task-003 to task-005 turn them green)'
        - 'npm run format:check and npm run lint exit 0'
        - 'git diff --stat is the same as the baseline except the new test file'
      escalation_triggers:
        - 'the baseline build prints Asciidoctor lines'
      suggested_subagent_type: 'general-purpose'
      suggested_model: '(default)'
      suggested_effort: 'medium'
    - task_id: task-003
      agent_role: 'Documentation Agent'
      objective: 'Assemble the one Plateaus page from the two old pieces by script and leave the pointer in Domain.'
      context:
        prd_excerpts:
          - 'REQ-1 and REQ-2'
        tdd_excerpts:
          - 'DEC-1 table, DEC-2, DEC-3, CON-3'
      likely_files:
        - 'src/doc/README.adoc'
      acceptance_criteria:
        - 'One == Plateaus under Concepts, ids in order, listings byte for byte'
      verification:
        - 'grep -c "^=\+ Plateaus$" src/doc/README.adoc prints 1 and the line is == under the part Concepts'
        - 'node --test src/test/javascript/manual-skeleton.test.js exits 0 (every id still defined)'
        - 'the ids of the page appear after [[plateaus]] in the order of DEC-7 (5) and before [[plateau-limits]]'
        - 'the lines of ASM-5 (REPLACES_WARNING plus table, the table rows | removed |, | moved |, | split |, | merged |, the block that starts comparing to-be (To be) with baseline (As is)) are present byte for byte'
        - 'node --test src/test/javascript/manual-voice.test.js: the heading, the pointer and the order subtests pass; only the filler words and the state wording subtests still fail (task-004 and task-005 turn them green)'
      escalation_triggers:
        - 'a block does not cut at a heading'
      suggested_subagent_type: 'general-purpose'
      suggested_model: '(default)'
      suggested_effort: 'medium'
    - task_id: task-004
      agent_role: 'Documentation Agent'
      objective: 'Rewrite the page prose in the voice of D3 without losing a fact.'
      context:
        prd_excerpts:
          - 'REQ-3, REQ-5, REQ-6'
        tdd_excerpts:
          - 'DEC-4, DEC-6, CTR-3, IMP-4'
      likely_files:
        - 'src/doc/README.adoc'
        - 'README.md'
      acceptance_criteria:
        - 'No plateau is called a state; the set comparison shows only listed losses'
      verification:
        - 'node --test src/test/javascript/manual-voice.test.js: the state wording and pointer words subtests pass'
        - 'node --test src/test/javascript/manual-skeleton.test.js exits 0 and the lines of ASM-5 are still byte for byte'
        - 'grep -rn "States of an architecture" README.md src prints nothing'
        - 'a script over the base copy and the file prints the code spans, link targets, numbers and listing blocks of the two old pieces that are not on the new page, and the list holds only the two merged notes or items the list gives a reason for'
      escalation_triggers:
        - 'a fact stated only in prose cannot be kept'
      suggested_subagent_type: 'general-purpose'
      suggested_model: '(default)'
      suggested_effort: 'high'
    - task_id: task-005
      agent_role: 'Documentation Agent'
      objective: 'Clear list A, list B and list C across the manual, leaving the Best Practices topic list and the examples untouched.'
      context:
        prd_excerpts:
          - 'REQ-4'
        tdd_excerpts:
          - 'DEC-5, Q-1, ASM-6'
      likely_files:
        - 'src/doc/README.adoc'
      acceptance_criteria:
        - 'The voice test passes and only the literal lines of Q-1 keep a gate word'
      verification:
        - 'node --test src/test/javascript/manual-voice.test.js exits 0'
        - 'grep -niE "journey|prowess|delve|unlock" src/doc/README.adoc prints only the literal lines of Q-1 (seven on the base copy, re-measured by task-001), each inside a listing or a code span'
        - 'git diff -- src/doc/examples prints nothing against the baseline and git diff ff3bacd -- src/doc/examples is empty'
        - 'node --test src/test/javascript/manual-skeleton.test.js exits 0 and the Best Practices topic list is byte for byte the base list'
      escalation_triggers:
        - 'a sentence with a gate word carries a fact'
      suggested_subagent_type: 'general-purpose'
      suggested_model: '(default)'
      suggested_effort: 'medium'
    - task_id: task-006
      agent_role: 'QA Agent'
      objective: 'Run the proofs of the Observability section and the mutation check on a copy.'
      context:
        prd_excerpts:
          - 'REQ-1, REQ-2, REQ-4, REQ-5'
        tdd_excerpts:
          - 'Observability 1 to 6 and 8, DEC-4, DEC-7'
      likely_files:
        - 'src/doc/README.adoc'
        - 'src/test/javascript/manual-voice.test.js'
      acceptance_criteria:
        - 'Every check of the task catalog holds'
      verification:
        - 'JAVA_HOME=/home/tibo/.sdkman/candidates/java/25.0.4-tem ./mvnw -o generate-resources exits 0 and the Asciidoctor lines after are not more than before'
        - 'every id of git show ff3bacd:src/doc/README.adoc is defined in src/doc/README.adoc and every <<id>> target exists (the PlantUML stereotypes and the YAML key << are not references)'
        - 'node --test src/test/javascript/manual-voice.test.js and src/test/javascript/manual-skeleton.test.js, npm run test:unit, npm run format:check and npm run lint exit 0'
        - 'JAVA_HOME=/home/tibo/.sdkman/candidates/java/25.0.4-tem ./mvnw test -Dtest=ManualExamplesTest and ./mvnw test -Dtest=PlateauComparisonTest exit 0'
        - 'git diff against the baseline shows none of the nine readers modified, and the changed files are only src/doc/README.adoc, README.md, the new test and the run documents'
        - 'the mutation check fails three times on the copy and src/doc/README.adoc is unchanged by it'
      escalation_triggers:
        - 'a lost span or number without a reason'
      suggested_subagent_type: 'general-purpose'
      suggested_model: '(default)'
      suggested_effort: 'low'
    - task_id: task-007
      agent_role: 'QA Agent'
      objective: 'Read the page as a newcomer, fix what is not plain, and write the run record.'
      context:
        prd_excerpts:
          - 'REQ-3, REQ-4, REQ-5'
        tdd_excerpts:
          - 'IMP-3, Observability 7, Q-1'
      likely_files:
        - 'src/doc/README.adoc'
        - 'docs/wav/wav-030-pages-ci-and-toolbar/run/run-0214-manual-concepts-and-voice/run-0214-manual-concepts-and-voice.md'
      acceptance_criteria:
        - 'The record holds the lines before and after, the touched paragraphs and the literal lines of Q-1'
      verification:
        - 'grep -c Asciidoctor in run-0214-manual-concepts-and-voice.md prints at least 2 and the file holds the changed-paragraph list and the literal lines of Q-1'
        - 'target/generated-docs/index.html opened in the browser pane shows two entries under Concepts (Plateaus, Limits of today) and the click on #plateaus, #plateaus-overview and #plateau-comparison lands on the page; the record says this was by eye, or says not checked if the pane is unavailable'
        - 'node --test src/test/javascript/manual-voice.test.js and npm run format:check exit 0 after the last edit'
      escalation_triggers:
        - 'the browser pane is unavailable'
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
        - 'grep -niE on the base copy'
      success_criteria:
        - 'The counts, IMP-4 and the open Q-1 are in the TDD'
    - task_id: task-002
      methods:
        - 'node --test'
        - 'format check'
        - 'lint'
      success_criteria:
        - 'The voice test is red for the filler words, the heading, the pointer and the order, and the skeleton test is green'
    - task_id: task-003
      methods:
        - 'node --test'
        - 'grep'
      success_criteria:
        - 'One Plateaus heading, ids in order, ASM-5 lines byte for byte'
    - task_id: task-004
      methods:
        - 'node --test'
        - 'set comparison script'
        - 'grep'
      success_criteria:
        - 'No lost fact except the listed merged notes, the old title gone from README.md and the manual'
    - task_id: task-005
      methods:
        - 'node --test'
        - 'grep -niE'
      success_criteria:
        - 'Only the literal lines of Q-1 keep a gate word, the voice test is green'
    - task_id: task-006
      methods:
        - 'maven build'
        - 'node --test'
        - 'npm run test:unit'
        - 'format check'
        - 'lint'
        - 'ManualExamplesTest and PlateauComparisonTest'
        - 'mutation check on a copy'
      success_criteria:
        - 'All exit 0, the Asciidoctor lines are not more than before, the mutation check fails three times'
    - task_id: task-007
      methods:
        - 'reading by a reader'
        - 'browser pane render by eye'
        - 'node --test'
      success_criteria:
        - 'The record is complete and the render check is said to be by eye or not checked'
```

## 11. Escalation Rules

```yaml
escalation_rules:
  rules:
    - condition: 'A reader of the manual as text fails on a changed line'
      action: 'Restore the line byte for byte; never edit a reader to make it pass.'
    - condition: 'A code span, link target, number or listing of the old pieces is missing from the new page with no reason'
      action: 'Put the fact back in its sentence and rerun the comparison.'
    - condition: 'A gate word sits in a listing or a quoted message'
      action: 'Leave it, list it as a literal under Q-1, and do not change a command message or a fixture.'
    - condition: 'A change would touch a line owned by W-5 (the Best Practices topic list) or W-6 (the command reference)'
      action: 'Leave the line and list it in the record.'
    - condition: 'Q-1 is read literally by the author'
      action: 'Do not change a message or a fixture in this run; log the blocker in the prg and report it.'
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
    - task-004
    - task-005
  next_action: 'Run task-001: amend the TDD with the Stage 5 findings, then task-002 writes the voice test red.'
  criteria:
    - 'One == Plateaus under Concepts, every id kept, the old title gone'
    - 'Gate words absent outside listings and code spans, the literal lines listed (Q-1 open)'
    - 'Voice test, skeleton test, unit tests, format, lint, ManualExamplesTest and PlateauComparisonTest pass and the Asciidoctor lines are not more than before'
```
