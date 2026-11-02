---
title: Execution Plan — Manual skeleton
status: done
date: 2026-11-01
related:
  - docs/wav/wav-030-pages-ci-and-toolbar/run/run-0213-manual-skeleton/tdd-0213-manual-skeleton.md
  - docs/wav/wav-030-pages-ci-and-toolbar/wav-030-pages-ci-and-toolbar.md
  - docs/wav/wav-030-pages-ci-and-toolbar/wbc-030-pages-ci-and-toolbar.md
  - src/doc/README.adoc
  - src/test/javascript/site.test.js
  - https://github.com/tmorin/archicode/issues/193
type: pln
run: 0213
wave: 030
---

# Execution Plan: Manual skeleton

Profile TDD+pln: there is no PRD, so REQ-1 to REQ-6 are the IDs the TDD labels (section "PRD Traceability"), taken from the W-3 row and the last three criteria of gate P1 of the wave manifest. The plan follows the TDD plus the Stage 5 review findings F1 to F8 (progress log, Findings), which the TDD has not absorbed: task-001 amends the TDD with them before any test is written. Where the TDD and a finding differ, the finding wins. The ones that change a number or a command: F1 (`:toclevels: 1`, not 2, because a book shows parts, chapters and sections at 2; the table of contents is checked on the top `sectlevel0` list), F2 (91 real anchors, not 94: `[[content.relationships]]` at line 194 and the two names at line 199 are TOML text, not anchors; no `[[id,text]]` or `[#id]` form exists), F3 (the warning count is the lines that match `asciidoctor: (WARNING|ERROR|INFO)` of the real build, listed), F4 (compare id-to-title pairs, twelve repeated titles), F5 (nine readers of the manual, add `PlateauComparisonTest`), F6 (add REQ-7, the decision of this run to delete the Pluggable passages; the Summary and DEC-5 both say four fixes), F7 (drop the book-doctype fallback), F8 (139 `//` lines; the descriptions of DEC-5 (b) are the first sentence of each `--help` description).

The order is test first, as the profile asks: task-002 measures the baseline and writes the anchors test and its fixture (red on the parts, the header and the drafts), task-003 moves the blocks with a script and writes the header and the part headings (turns the structure checks green), task-004 deletes the drafts, writes the mapping paragraph and applies the four fixes (turns the rest green), task-005 proves the move (line comparison, build, ids, all readers of the manual, mutation check), task-006 checks the render and writes the run record. The wave is sequential by the author's decision of 2026-11-01 (one run at a time), and all the tasks edit or read the same file, so no task runs in parallel with another.

Baseline of the diff checks: the working tree holds uncommitted work of runs 0211 and 0212 and the wave documents (the wave commits when needed). A check of the form `git diff --stat -- <paths>` that reads "unchanged" is therefore read against a baseline, not against HEAD: before its first edit a task saves `git diff -- <paths>` and `git status --short` to the scratchpad, and the check is that the same commands print the same output after the task, apart from the files the task is meant to write. The base file of every comparison is `git show ff3bacd:src/doc/README.adoc`, which equals `src/doc/README.adoc` at the start (ASM-1; `git diff ff3bacd -- src/doc/README.adoc` prints nothing).

This run operates under the autonomy override of `complete-run`: no task stops for a human on its category alone. No task of this plan is `critical` or `human_required`, so the override changes no route. Nothing in this plan commits, pushes, merges, tags or releases: those are human steps outside the plan. The shell default is JDK 21; every Maven command uses `JAVA_HOME=/home/tibo/.sdkman/candidates/java/25.0.4-tem`.

## 1. Executive Summary

```yaml
summary:
  status: 'pending'
  product_goal: 'The manual is sorted into six parts by kind of reading (Start here, Tutorials, How-to guides, Reference, Concepts, Upgrading) with every address kept, the draft lines gone and four stale passages fixed (#193 b).'
  technical_approach: 'Measure the baseline, pin the properties in a node test and a fixture of the 91 anchors (red), move whole blocks of the base file with a script into a book of six level-0 parts, delete the drafts and fix the four passages, prove the move by a line comparison, the HTML build and the nine readers of the manual, then check the render by eye and write the run record.'
  total_tasks: 6
  parallel_groups: 0
  high_risk_tasks: 0
  human_review_gates: 1
  autonomy_level: 'medium'
  recommendation: 'proceed_with_review'
  criteria:
    - 'grep -n ^= src/doc/README.adoc prints the title then Start here, Tutorials, How-to guides, Reference, Concepts, Upgrading in that order, and the anchors upgrade-0-17 to upgrade-0-22 sit after the Upgrading heading (REQ-1)'
    - 'Every anchor of git show ff3bacd:src/doc/README.adoc is still defined, no line starts with //, and ./mvnw test -Dtest=ManualExamplesTest exits 0 (REQ-2)'
    - 'The run record states the Asciidoctor lines (WARNING, ERROR, INFO) before and after, listed, and after is not greater (REQ-3)'
    - 'The header has :doctype: book and :toclevels: 1, and the top list of the table of contents of the built page has six entries (REQ-4, F1)'
    - 'The Commands intro lists the eight commands, Features promises no extension point, and grep -c Pluggable Viewpoint Service prints 0 (REQ-5, REQ-7)'
    - 'The line comparison shows no difference other than the ones the record lists, and the record lists each moved block and each changed paragraph with the old and the new text (REQ-6)'
    - 'node --test src/test/javascript/manual-skeleton.test.js, npm run test:unit, npm run format:check and npm run lint exit 0, and the nine readers of the manual pass unmodified'
    - 'git diff --stat shows only src/doc/README.adoc, the two new test files and the run documents, and git diff ff3bacd -- src/doc/examples is empty'
```

## 2. PRD/TDD Consistency Assessment

```yaml
consistency_assessment:
  aligned_items:
    - 'Scope, REQ-1 to REQ-6, DEC-1 to DEC-7, CTR-1, CTR-2 and IMP-1 to IMP-3 agree with the W-3 row and the P1 gate of the wave manifest; every task below traces to them'
    - 'Q-1 to Q-3 are settled in the TDD and Stage 6 found nothing left open'
    - 'The current state quoted by the TDD (3942 lines, the headings and line numbers of DEC-2, the 139 draft lines) was checked at Stage 5 against ff3bacd'
    - 'No CLAUDE.md, no command, no editor code and no workflow is touched; scripts/changes.mjs already sends src/doc/README.adoc to Java and Page, and a new test under src/test/javascript runs in Page'
  gaps:
    - id: gap-001
      type: contradiction
      description: 'F1 (S3): the TDD says :toclevels: 2 gives a two-level table of contents, but in a book it shows parts, chapters and sections. The check grep -c class=sectlevel1 is also wrong, the top list is sectlevel0.'
      impact: 'high'
      recommendation: 'Decided here: :toclevels: 1. task-001 replaces 2 by 1 in DEC-1, CTR-1, DEC-6 (5), REQ-4 and Observability 4; task-002 asserts :toclevels: 1; task-005 checks six li in the top sectlevel0 list and no sectlevel2 list.'
    - id: gap-002
      type: contradiction
      description: 'F2 (S2): the TDD counts 94 (and 93 plus one) explicit anchors; 91 are real, three hits are TOML names in a listing (line 194) and in backticks (line 199). The forms [[id,text]] and [#id] do not occur.'
      impact: 'medium'
      recommendation: 'task-001 says 91 in ASM-2, DEC-6 and CTR-2 and drops the two unused forms from DEC-6 (1); task-002 builds the fixture of 91 ids from outside listings and backticks, and the test reads the same regex.'
    - id: gap-003
      type: ambiguity
      description: 'F3 (S2): Observability counts lines that contain WARN, but an unresolved cross reference is an INFO line (possible invalid reference) and the JDK 25 Maven run prints its own WARNING lines (jansi, guava) that are not Asciidoctor.'
      impact: 'medium'
      recommendation: 'task-001 defines the count as the lines that match asciidoctor: (WARNING|ERROR|INFO) of the real build, listed; task-002 and task-005 use that definition and list the lines.'
    - id: gap-004
      type: ambiguity
      description: 'F4 (S2): a set of id values cannot show two numbered ids swapping; the base repeats twelve titles, not three.'
      impact: 'low'
      recommendation: 'task-001 extends ASM-3 to the twelve titles; task-005 compares the pairs id to heading text of both builds.'
    - id: gap-005
      type: ambiguity
      description: 'F5 (S2): nine files read the manual, not five, three of them under viewpoint-kernel; PlateauComparisonTest needs the diff quote byte-identical, move-editor.test.js slices by order between three anchors of the Editor chapter.'
      impact: 'medium'
      recommendation: 'task-001 lists the nine with real paths in CON-1 and CON-2 and adds PlateauComparisonTest to Observability 3; task-003 moves the Editor chapter and the plateau tutorial whole; task-005 runs all nine.'
    - id: gap-006
      type: ambiguity
      description: 'F6 (S2): DEC-5 (d) goes beyond REQ-5 (a)-(c) and the wave gives the Pluggable check to W-5; the Summary says three fixes and DEC-5 four.'
      impact: 'medium'
      recommendation: 'Decided here: keep (d), same false claim, cheaper once. task-001 adds REQ-7 (a decision of this run), notes in Scope and Deferred that W-5 only re-checks the grep, and makes the Summary and DEC-5 say four.'
    - id: gap-007
      type: ambiguity
      description: 'F7 (S1): the DEC-1 fallback (parts as level-1 sections in an article) is incoherent, and ASM-4 was verified at Stage 5 in a scratch build (book doctype, level-0 parts, an anchor above a chapter after a part: BUILD SUCCESS, no Asciidoctor line).'
      impact: 'low'
      recommendation: 'task-001 states ASM-4 as verified and deletes the fallback and the matching RISK-2 clause; the render check stays by eye.'
    - id: gap-008
      type: ambiguity
      description: 'F8 (S1): the draft counts say 138 and 139 for the same thing (both are 139), and DEC-5 (b) says the one-line descriptions are what --help prints, while diff and init wrap on three lines there.'
      impact: 'low'
      recommendation: 'task-001 says 139 in Current State, ASM-5 and DEC-3, and words DEC-5 (b) as the first sentence of the description in --help; task-004 copies those sentences.'
    - id: gap-009
      type: risk
      description: 'The shell JDK is 21 and the packaged jar needs 25; the Asciidoctor build and archicode --help need JDK 25.'
      impact: 'low'
      recommendation: 'Every task that runs Maven or the jar sets JAVA_HOME to the sdkman JDK 25; if target/quarkus-app is absent the task builds it with ./mvnw -q package -DskipTests, and records not run if the jar cannot run.'
    - id: gap-010
      type: risk
      description: 'The render of the book (parts as h1, chapters as h2, table of contents on the left, a click on #plateau-fold and #editor-layout) has no automated form (DEF-3).'
      impact: 'low'
      recommendation: 'task-006 opens the built page in the browser pane in light and dark, says in the record that this was by eye, and records not checked if the pane is unavailable, without claiming the check.'
  blocking_gaps: []
```

## 3. Execution Graph

```yaml
execution_graph:
  nodes:
    - id: task-001
      status: 'done'
      title: 'Amend the TDD with the Stage 5 findings F1 to F8'
      depends_on: []
      produces:
        - 'tdd-0213-manual-skeleton.md amended'
      agent_role: 'Architecture Agent'
      autonomy: 'autonomous'
      risk: 'low'
      confidence: 85
    - id: task-002
      status: 'done'
      title: 'Measure the baseline and write the anchors test and its fixture, red'
      depends_on: [task-001]
      produces:
        - 'src/test/javascript/manual-anchors.json'
        - 'src/test/javascript/manual-skeleton.test.js'
        - 'baseline files in the scratchpad'
      agent_role: 'Test Generation Agent'
      autonomy: 'autonomous'
      risk: 'low'
      confidence: 80
    - id: task-003
      status: 'done'
      title: 'Move the blocks into the six parts with a script and write the header'
      depends_on: [task-002]
      produces:
        - 'src/doc/README.adoc reordered'
        - 'the cutting script in the scratchpad'
      agent_role: 'Documentation Agent'
      autonomy: 'autonomous'
      risk: 'medium'
      confidence: 75
    - id: task-004
      status: 'done'
      title: 'Delete the drafts, write the mapping paragraph and fix the four passages'
      depends_on: [task-003]
      produces:
        - 'src/doc/README.adoc without // lines, with the mapping paragraph and the four fixes'
      agent_role: 'Documentation Agent'
      autonomy: 'autonomous'
      risk: 'medium'
      confidence: 72
    - id: task-005
      status: 'done'
      title: 'Prove the move: line comparison, build, ids, readers, mutation check'
      depends_on: [task-004]
      produces:
        - 'comparison output, build lines and id pairs in the scratchpad'
      agent_role: 'QA Agent'
      autonomy: 'autonomous'
      risk: 'low'
      confidence: 80
    - id: task-006
      status: 'done'
      title: 'Check the render by eye and write the run record'
      depends_on: [task-005]
      produces:
        - 'run-0213-manual-skeleton.md with the record'
      agent_role: 'QA Agent'
      autonomy: 'review_after'
      risk: 'low'
      confidence: 78
  edges:
    - from: task-001
      to: task-002
      reason: 'the test and the fixture follow the amended numbers (91 anchors, :toclevels: 1)'
    - from: task-002
      to: task-003
      reason: 'the move is written against a red test and a measured baseline'
    - from: task-003
      to: task-004
      reason: 'the prose edits run on the new file, inside the blocks where they landed'
    - from: task-004
      to: task-005
      reason: 'the proof reads the finished file'
    - from: task-005
      to: task-006
      reason: 'the record states the results of the proof'
```

## 4. Task Catalog

```yaml
task_catalog:
  tasks:
    - id: task-001
      title: 'Amend the TDD with the Stage 5 findings F1 to F8'
      source_requirements:
        prd:
          - 'REQ-1 to REQ-7'
        tdd:
          - 'DEC-1, DEC-5, DEC-6, DEC-7, ASM-2 to ASM-5, CON-1, CON-2, CTR-1, CTR-2, Observability, RISK-2'
      outputs:
        - 'tdd-0213-manual-skeleton.md with F1 to F8 applied as the findings table of the prg gives them (toclevels 1, 91 anchors, the warning count definition, id-to-title pairs, nine readers, REQ-7 and four fixes, no fallback, 139 and the first sentence of --help)'
      verification:
        - 'grep -c toclevels: 2 in the TDD prints 0 outside a quoted old value, and grep -c toclevels: 1 prints at least 3'
        - 'grep -c 94 explicit in the TDD prints 0 and grep -c 91 prints at least 3'
        - 'grep -c REQ-7 in the TDD prints at least 3'
        - 'grep -ci fallback in the TDD prints 0 in DEC-1 and RISK-2'
        - 'grep -c PlateauComparisonTest in the TDD prints at least 2'
      risk: 'low'
      confidence: 85
      human_review: 'none'
      escalation_triggers:
        - 'a finding contradicts another finding or a measured fact of the repository'
        - 'applying F6 would make the wave gate P2 criterion read differently'
      delegation_tier: 'standard'
      results: 'tier standard, model sonnet, effort medium, profile low-cost, passed first time, inline (leaf), independently verified'
    - id: task-002
      title: 'Measure the baseline and write the anchors test and its fixture, red'
      source_requirements:
        prd:
          - 'REQ-1'
          - 'REQ-2'
          - 'REQ-3'
        tdd:
          - 'DEC-6'
          - 'CTR-2'
          - 'ASM-2'
          - 'FLOW-1 step 1'
          - 'Observability 1'
      outputs:
        - 'Scratchpad baseline: the Asciidoctor lines of ./mvnw -o generate-resources before any edit (count and text), a copy of target/generated-docs/index.html, the base file git show ff3bacd:src/doc/README.adoc, git diff and git status baselines'
        - 'src/test/javascript/manual-anchors.json, the 91 ids of the base file sorted, extracted outside listings and backticks'
        - 'src/test/javascript/manual-skeleton.test.js with the seven assertions of DEC-6 (title says ids may be added never removed; toclevels 1), formatted by Prettier and clean under ESLint'
      verification:
        - 'node -e that reads manual-anchors.json prints length 91, sorted, no duplicate'
        - 'node --test src/test/javascript/manual-skeleton.test.js exits non-zero and the failing subtests are the parts, the upgrade anchors, the drafts, the header, the placement and the Pluggable check; the subtest that every fixture id is defined passes (task-003 and task-004 turn the others green)'
        - 'npm run format:check and npm run lint exit 0'
        - 'git diff ff3bacd -- src/doc/README.adoc prints nothing'
      risk: 'low'
      confidence: 80
      human_review: 'none'
      escalation_triggers:
        - 'the extraction of the ids does not give 91'
        - 'the unmodified build prints an Asciidoctor line (the baseline is then not 0 and is recorded as measured)'
      delegation_tier: 'standard'
      results: 'tier standard, model sonnet, effort medium, profile low-cost, passed first time, inline (leaf), independently verified'
    - id: task-003
      title: 'Move the blocks into the six parts with a script and write the header'
      source_requirements:
        prd:
          - 'REQ-1'
          - 'REQ-2'
          - 'REQ-4'
          - 'REQ-6'
        tdd:
          - 'DEC-1'
          - 'DEC-2'
          - 'DEC-4'
          - 'CTR-1'
          - 'CON-3'
          - 'FLOW-1 steps 2 and 3'
      outputs:
        - 'A script in the scratchpad that cuts the base file at its headings into the blocks of the DEC-2 table and writes the new file: header with :doctype: book and :toclevels: 1 (the key :TOC: left kept), six part headings with a blank line before and after, above the [[id]] line when the first chapter has one, blocks in the order of the table, levels lowered as the table says'
        - 'src/doc/README.adoc rewritten by that script, nothing else edited'
      verification:
        - 'grep -n ^= src/doc/README.adoc prints the title then the six parts in order, and no other line'
        - 'node --test src/test/javascript/manual-skeleton.test.js: the subtests on the parts, the upgrade anchors, the header and the placement pass; only the draft and Pluggable subtests still fail (task-004 turns them green)'
        - 'every id of manual-anchors.json is defined in the new file'
        - 'the Editor chapter and the plateau tutorial are byte-identical to the base blocks apart from heading levels (diff of the two slices)'
        - 'the new file has the same number of lines as the base plus the part headings and their blank lines, less nothing'
      risk: 'medium'
      confidence: 75
      human_review: 'none'
      escalation_triggers:
        - 'a block does not cut at a heading boundary of ff3bacd'
        - 'an anchor ends up above a part heading instead of its chapter'
        - 'a generated id would change (a repeated title changes order): add the explicit anchor above that heading and list it'
      delegation_tier: 'standard'
      results: 'tier standard, model sonnet, effort medium, profile low-cost, passed first time, inline (leaf), independently verified'
    - id: task-004
      title: 'Delete the drafts, write the mapping paragraph and fix the four passages'
      source_requirements:
        prd:
          - 'REQ-2'
          - 'REQ-5'
          - 'REQ-6'
          - 'REQ-7'
        tdd:
          - 'DEC-3'
          - 'DEC-4'
          - 'DEC-5'
          - 'ASM-5'
          - 'ASM-6'
      outputs:
        - 'src/doc/README.adoc without any line that starts with // (139 lines), the blank line left when two blank lines meet removed'
        - 'one mapping paragraph in the introduction of Domain, after its bullet list, each sentence checked against the Introduction and docs/architecture, the ArchiMate quotations not copied'
        - 'DEC-5 (a) the Introduction closing paragraph naming the six parts in order, no word journey; (b) the Commands intro as one sentence and a list of the eight commands, each line the first sentence of the description in archicode --help, with a link to the explicit id of its section where one exists; (c) the two Features entries and the Features closing paragraph; (d) the Pluggable bullets and their sentences in Views and Rendering'
        - 'every position word (above, below, previous, next, following) in a moved block read, and each wrong one fixed in the fewest words'
        - 'a list in the scratchpad of every changed paragraph with the old and the new text, for the record'
      verification:
        - 'grep -c ^// src/doc/README.adoc prints 0'
        - 'grep -c Pluggable Viewpoint Service src/doc/README.adoc prints 0, and grep -ciE pluggable|plug-gable|extension point|viewpoint provider prints no line that promises a plug-in'
        - 'node --test src/test/javascript/manual-skeleton.test.js exits 0'
        - 'every archicode command named in the new Commands intro appears in the output of archicode --help of target/quarkus-app/quarkus-run.jar run with JDK 25'
        - 'every id of manual-anchors.json is still defined, and no <<id>> cross reference points to a missing id (a script over the file that skips the PlantUML stereotypes <<changed>> and <<external>> and the YAML key <<, which are text in a listing or a literal, not cross references; at HEAD they are the only three hits that match no anchor, measured at Stage 9)'
      risk: 'medium'
      confidence: 72
      human_review: 'none'
      escalation_triggers:
        - 'a mapping sentence cannot be confirmed by the Introduction or docs/architecture: drop the clause and list it'
        - 'a deleted draft carried content that no other place says'
        - 'a position word cannot be fixed in a few words'
      delegation_tier: 'standard'
      results: 'tier standard, model sonnet, effort medium, profile low-cost, passed first time, inline (leaf), independently verified'
    - id: task-005
      title: 'Prove the move: line comparison, build, ids, readers, mutation check'
      source_requirements:
        prd:
          - 'REQ-2'
          - 'REQ-3'
          - 'REQ-4'
          - 'REQ-6'
        tdd:
          - 'DEC-7'
          - 'ASM-3'
          - 'CTR-2'
          - 'Observability 1 to 6'
      outputs:
        - 'The comparison script of DEC-7 (scratchpad, not committed) and its output: the multiset of lines is the same except the lines of DEC-3 and DEC-5, every heading present with its title and the level of the DEC-2 table'
        - 'The Asciidoctor lines (WARNING, ERROR, INFO) of the build after, listed, and the id-to-title pairs of both builds compared'
        - 'The result of the mutation check on a copy: one anchor deleted and one part heading deleted, the test fails each time'
      verification:
        - 'the comparison script exits 0 and prints the list of accounted differences only'
        - 'JAVA_HOME=/home/tibo/.sdkman/candidates/java/25.0.4-tem ./mvnw -o generate-resources exits 0 and the Asciidoctor lines after are not more than before'
        - 'the id-to-title pairs of the new index.html equal those of the baseline plus the six part ids (_start_here, _tutorials, _how_to_guides, _reference, _concepts, _upgrading), or each difference is listed'
        - 'the top ul of the table of contents has six li and the page has no sectlevel2 list'
        - 'node --test src/test/javascript/manual-skeleton.test.js, npm run test:unit, npm run format:check and npm run lint exit 0'
        - 'JAVA_HOME=/home/tibo/.sdkman/candidates/java/25.0.4-tem ./mvnw test -Dtest=ManualExamplesTest and ./mvnw test -Dtest=PlateauComparisonTest exit 0'
        - 'the nine readers (site.test.js, help.test.js, settings-help-anchors.test.js, distinct-dashes.test.js, example-identity.test.js, move-editor.test.js, replaces-editor.test.js, PlateauComparisonTest, ManualExamplesTest) pass and git diff shows none of them modified against the baseline'
        - 'the mutation check on a copy makes the test fail twice and the repository file is not modified by it'
        - 'git diff ff3bacd -- src/doc/examples prints nothing'
      risk: 'low'
      confidence: 80
      human_review: 'none'
      escalation_triggers:
        - 'a line is not accounted for: restore it from the base'
        - 'the Asciidoctor lines after exceed the baseline: find the line (a level jump or a part with no chapter) and fix it in task-003 or task-004 terms'
        - 'a generated id changed'
      delegation_tier: 'standard'
      results: 'tier standard, model sonnet, effort medium, profile low-cost, passed first time, inline (leaf), independently verified'
    - id: task-006
      title: 'Check the render by eye and write the run record'
      source_requirements:
        prd:
          - 'REQ-3'
          - 'REQ-4'
          - 'REQ-6'
        tdd:
          - 'IMP-3'
          - 'Observability 4'
          - 'Q-1'
          - 'DEC-7'
      outputs:
        - 'run-0213-manual-skeleton.md with: the Asciidoctor lines before and after, the move table (block, base lines, part, level change), the count of // lines deleted, each paragraph added, changed or deleted with its old and new text (DEC-3, DEC-4, DEC-5), the reading of grep -n ^= (title then six parts, Q-1), the position words fixed, the render check said to be by eye (or not checked), and the commands run'
        - 'the status of run-0213-manual-skeleton.md left to the main agent (this task does not set done)'
      verification:
        - 'grep -c Asciidoctor in run-0213-manual-skeleton.md prints at least 2 and the file holds the move table and the changed-paragraph list'
        - 'the page target/generated-docs/index.html opened in the browser pane in light and dark shows the contents on the left with six parts and their chapters, and a click on #plateau-fold and #editor-layout lands on the right text; the record says this was by eye, or says not checked if the pane is unavailable'
        - 'git diff --stat compared with the baseline shows only src/doc/README.adoc, the two new test files and the run documents'
        - 'npm run format:check exits 0'
      risk: 'low'
      confidence: 78
      human_review: 'after'
      escalation_triggers:
        - 'the browser pane is unavailable: record not checked and do not claim the check'
        - 'the render shows a part with no chapter or a lost table of contents'
      delegation_tier: 'standard'
      results: 'tier standard, model sonnet, effort medium, profile low-cost, passed first time, inline (leaf), independently verified'
```

## 5. Parallelization Plan

```yaml
parallelization_plan:
  groups: []
```

No group: the wave is sequential by decision, and every task reads or edits `src/doc/README.adoc` or a file derived from it. Shared-file conflict is the reason (one file, 3900 lines, one mover at a time).

## 6. Human Review Gates

```yaml
human_review_gates:
  gates:
    - id: gate-001
      trigger: 'The run record lists a moved block, a deleted draft or a changed paragraph that the author may read differently, notably the mapping paragraph of DEC-3 and the Pluggable deletions of DEC-5 (d), which go beyond the wave text'
      required_before: []
      required_after: [task-006]
      reviewer_focus:
        - 'the mapping paragraph in Domain (one new paragraph, a change of meaning)'
        - 'where Domain and Editor sit (Reference) and the thin Concepts and How-to guides parts until W-4 and W-5'
        - 'REQ-7: whether the deletion of the Pluggable passages stays in this run'
```

Under the autonomy override of `complete-run` the gate is reviewed at the pull request, not as a stop in the run. No task is `critical`, so no task is blocked by it.

## 7. Risk Assessment

```yaml
risk_assessment:
  by_task:
    - id: task-001
      risk: 'low'
      rationale: 'edits a run document against findings that are written out'
    - id: task-002
      risk: 'low'
      rationale: 'additive test and fixture; the baseline is read only'
    - id: task-003
      risk: 'medium'
      rationale: 'moves 3900 lines; a lost line or a misplaced anchor is the risk the comparison and the test control'
    - id: task-004
      risk: 'medium'
      rationale: 'the only new prose of the run and the only change of meaning; the record quotes it'
    - id: task-005
      risk: 'low'
      rationale: 'read-only checks and a mutation on a copy'
    - id: task-006
      risk: 'low'
      rationale: 'a record, and a render check that is by eye'
  by_area:
    - area: 'docs'
      risk: 'medium'
      rationale: 'a published manual whose addresses must all keep working (RISK-1), whose passages must read right after the move (RISK-3), and that W-4 to W-8 edit next (RISK-5)'
    - area: 'ui'
      risk: 'low'
      rationale: 'the book doctype changes the HTML (parts as h1); checked by build and by eye'
    - area: 'infra'
      risk: 'low'
      rationale: 'no pom, workflow or command change; the Pages step reads the same file name'
```

## 8. Confidence Assessment

```yaml
confidence_assessment:
  by_task:
    - id: task-001
      score: 85
      rationale: 'each finding names the file, the number and the fix'
    - id: task-002
      score: 80
      rationale: 'the extraction rule is stated (outside listings and backticks) and the count is checkable'
    - id: task-003
      score: 75
      rationale: 'the block map is exact in the TDD, but the cutting script is new and the heading boundaries of repeated titles need care'
    - id: task-004
      score: 72
      rationale: 'prose judgement on the mapping paragraph and the position words; every sentence can be checked against a source'
    - id: task-005
      score: 80
      rationale: 'automated checks with a stated expected value'
    - id: task-006
      score: 78
      rationale: 'the render check depends on the browser pane'
```

## 9. Agent Assignment Plan

```yaml
agent_assignment_plan:
  assignments:
    - task_id: task-001
      agent_role: 'Architecture Agent'
      objective: 'Apply F1 to F8 to the TDD, in the words of the findings table, and nowhere else'
      context:
        prd_excerpts:
          - 'no PRD; REQ-1 to REQ-6 are in the TDD, REQ-7 is added by F6'
        tdd_excerpts:
          - 'the findings table in the Findings section of prg-0213-manual-skeleton.md'
      likely_files:
        - 'docs/wav/wav-030-pages-ci-and-toolbar/run/run-0213-manual-skeleton/tdd-0213-manual-skeleton.md'
      acceptance_criteria:
        - 'the eight findings are applied and no other section changes'
      verification:
        - 'grep -c toclevels: 2 in the TDD prints 0 outside a quoted old value, and grep -c toclevels: 1 prints at least 3'
        - 'grep -c 94 explicit in the TDD prints 0 and grep -c 91 prints at least 3'
        - 'grep -c REQ-7 in the TDD prints at least 3'
        - 'grep -ci fallback in the TDD prints 0 in DEC-1 and RISK-2'
        - 'grep -c PlateauComparisonTest in the TDD prints at least 2'
      escalation_triggers:
        - 'a finding conflicts with a measured fact'
      suggested_subagent_type: 'general-purpose'
      suggested_model: '(default)'
      suggested_effort: 'medium'
    - task_id: task-002
      agent_role: 'Test Generation Agent'
      objective: 'Measure the baseline, write the fixture of 91 ids and the test of DEC-6, red on the new structure'
      context:
        prd_excerpts:
          - 'REQ-1: six parts in order; REQ-2: every anchor kept, no draft line'
        tdd_excerpts:
          - 'DEC-6 and CTR-2, as amended by F2'
          - 'Observability 1, as amended by F3'
      likely_files:
        - 'src/test/javascript/manual-skeleton.test.js'
        - 'src/test/javascript/manual-anchors.json'
        - 'src/test/javascript/site.test.js (a model for reading the manual as text)'
      acceptance_criteria:
        - 'the fixture holds 91 ids, the test has the seven assertions, and the parts, upgrade, drafts, header, placement and Pluggable subtests fail on the unmodified file'
      verification:
        - 'node -e that reads manual-anchors.json prints length 91, sorted, no duplicate'
        - 'node --test src/test/javascript/manual-skeleton.test.js exits non-zero and the failing subtests are the parts, the upgrade anchors, the drafts, the header, the placement and the Pluggable check; the subtest that every fixture id is defined passes (task-003 and task-004 turn the others green)'
        - 'npm run format:check and npm run lint exit 0'
        - 'git diff ff3bacd -- src/doc/README.adoc prints nothing'
      escalation_triggers:
        - 'the id count is not 91'
      suggested_subagent_type: 'general-purpose'
      suggested_model: '(default)'
      suggested_effort: 'medium'
    - task_id: task-003
      agent_role: 'Documentation Agent'
      objective: 'Write the script that cuts the base file into blocks and writes the new file with six parts, then run it'
      context:
        prd_excerpts:
          - 'REQ-1, REQ-4: six parts, two levels of contents'
        tdd_excerpts:
          - 'DEC-1 (as amended: toclevels 1), DEC-2 table, DEC-4, CON-3, FLOW-1'
      likely_files:
        - 'src/doc/README.adoc'
        - 'the scratchpad (the script)'
      acceptance_criteria:
        - 'the parts are in order, no anchor is above a part heading, every block is byte-identical but for its heading level'
      verification:
        - 'grep -n ^= src/doc/README.adoc prints the title then the six parts in order, and no other line'
        - 'node --test src/test/javascript/manual-skeleton.test.js: the subtests on the parts, the upgrade anchors, the header and the placement pass; only the draft and Pluggable subtests still fail (task-004 turns them green)'
        - 'every id of manual-anchors.json is defined in the new file'
        - 'the Editor chapter and the plateau tutorial are byte-identical to the base blocks apart from heading levels (diff of the two slices)'
        - 'the new file has the same number of lines as the base plus the part headings and their blank lines, less nothing'
      escalation_triggers:
        - 'a heading boundary is ambiguous'
        - 'a generated id changes'
      suggested_subagent_type: 'general-purpose'
      suggested_model: '(default)'
      suggested_effort: 'medium'
    - task_id: task-004
      agent_role: 'Documentation Agent'
      objective: 'Delete the drafts, write the mapping paragraph, apply the four fixes, read the position words, list each change'
      context:
        prd_excerpts:
          - 'REQ-5: Commands intro lists eight commands, Features stops promising extension points; REQ-7: the Pluggable passages go'
        tdd_excerpts:
          - 'DEC-3, DEC-4, DEC-5, ASM-5, ASM-6'
      likely_files:
        - 'src/doc/README.adoc'
        - 'docs/architecture (to confirm the mapping sentences)'
      acceptance_criteria:
        - 'no line starts with //, the Pluggable grep prints 0, the test passes, the list of changed paragraphs is complete'
      verification:
        - 'grep -c ^// src/doc/README.adoc prints 0'
        - 'grep -c Pluggable Viewpoint Service src/doc/README.adoc prints 0, and grep -ciE pluggable|plug-gable|extension point|viewpoint provider prints no line that promises a plug-in'
        - 'node --test src/test/javascript/manual-skeleton.test.js exits 0'
        - 'every archicode command named in the new Commands intro appears in the output of archicode --help of target/quarkus-app/quarkus-run.jar run with JDK 25'
        - 'every id of manual-anchors.json is still defined, and no <<id>> cross reference points to a missing id (a script over the file that skips the PlantUML stereotypes <<changed>> and <<external>> and the YAML key <<, which are text in a listing or a literal, not cross references; at HEAD they are the only three hits that match no anchor, measured at Stage 9)'
      escalation_triggers:
        - 'a sentence of the mapping cannot be confirmed'
      suggested_subagent_type: 'general-purpose'
      suggested_model: '(default)'
      suggested_effort: 'medium'
    - task_id: task-005
      agent_role: 'QA Agent'
      objective: 'Prove the move with the comparison script, the build, the id pairs, the nine readers and the mutation check'
      context:
        prd_excerpts:
          - 'REQ-3: warnings before and after; REQ-6: every difference listed'
        tdd_excerpts:
          - 'DEC-7, ASM-3 (twelve repeated titles), Observability 1 to 6'
      likely_files:
        - 'the scratchpad'
        - 'target/generated-docs/index.html'
      acceptance_criteria:
        - 'every verification line of task-005 holds'
      verification:
        - 'the comparison script exits 0 and prints the list of accounted differences only'
        - 'JAVA_HOME=/home/tibo/.sdkman/candidates/java/25.0.4-tem ./mvnw -o generate-resources exits 0 and the Asciidoctor lines after are not more than before'
        - 'the id-to-title pairs of the new index.html equal those of the baseline plus the six part ids (_start_here, _tutorials, _how_to_guides, _reference, _concepts, _upgrading), or each difference is listed'
        - 'the top ul of the table of contents has six li and the page has no sectlevel2 list'
        - 'node --test src/test/javascript/manual-skeleton.test.js, npm run test:unit, npm run format:check and npm run lint exit 0'
        - 'JAVA_HOME=/home/tibo/.sdkman/candidates/java/25.0.4-tem ./mvnw test -Dtest=ManualExamplesTest and ./mvnw test -Dtest=PlateauComparisonTest exit 0'
        - 'the nine readers (site.test.js, help.test.js, settings-help-anchors.test.js, distinct-dashes.test.js, example-identity.test.js, move-editor.test.js, replaces-editor.test.js, PlateauComparisonTest, ManualExamplesTest) pass and git diff shows none of them modified against the baseline'
        - 'the mutation check on a copy makes the test fail twice and the repository file is not modified by it'
        - 'git diff ff3bacd -- src/doc/examples prints nothing'
      escalation_triggers:
        - 'a line is not accounted for'
      suggested_subagent_type: 'general-purpose'
      suggested_model: '(default)'
      suggested_effort: 'medium'
    - task_id: task-006
      agent_role: 'QA Agent'
      objective: 'Open the built manual in light and dark, then write the run record'
      context:
        prd_excerpts:
          - 'REQ-3, REQ-4, REQ-6'
        tdd_excerpts:
          - 'IMP-3, Observability 4, Q-1'
      likely_files:
        - 'docs/wav/wav-030-pages-ci-and-toolbar/run/run-0213-manual-skeleton/run-0213-manual-skeleton.md'
      acceptance_criteria:
        - 'the record holds the table, the lists and the commands, and says what was by eye'
      verification:
        - 'grep -c Asciidoctor in run-0213-manual-skeleton.md prints at least 2 and the file holds the move table and the changed-paragraph list'
        - 'the page target/generated-docs/index.html opened in the browser pane in light and dark shows the contents on the left with six parts and their chapters, and a click on #plateau-fold and #editor-layout lands on the right text; the record says this was by eye, or says not checked if the pane is unavailable'
        - 'git diff --stat compared with the baseline shows only src/doc/README.adoc, the two new test files and the run documents'
        - 'npm run format:check exits 0'
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
        - 'grep checks on the TDD'
      success_criteria:
        - 'the eight findings are applied'
    - task_id: task-002
      methods:
        - 'node test'
        - 'prettier'
        - 'eslint'
      success_criteria:
        - 'the fixture has 91 ids and the structural subtests fail on the unmodified file'
    - task_id: task-003
      methods:
        - 'grep'
        - 'node test'
        - 'slice diff'
      success_criteria:
        - 'parts, anchors, header and placement subtests pass'
    - task_id: task-004
      methods:
        - 'grep'
        - 'node test'
        - 'archicode --help'
      success_criteria:
        - 'the test passes and the commands named are the commands of --help'
    - task_id: task-005
      methods:
        - 'line comparison script'
        - 'Maven build of the manual'
        - 'node and Java tests'
        - 'mutation check on a copy'
      success_criteria:
        - 'all differences accounted for, warnings not above baseline, nine readers pass'
    - task_id: task-006
      methods:
        - 'browser pane, by eye'
        - 'grep on the record'
      success_criteria:
        - 'the record is complete and the by-eye check is named as such'
```

## 11. Escalation Rules

```yaml
escalation_rules:
  rules:
    - condition: 'A finding of Stage 5 contradicts the TDD in a way the findings table does not settle'
      action: 'Record it in the Findings of the prg and follow the finding; do not stop the run'
    - condition: 'A line of the base file is not accounted for by the comparison'
      action: 'Restore it from the base file and run the comparison again; a second failure is logged as a finding'
    - condition: 'The Asciidoctor lines after are more than before'
      action: 'Find the line (a level jump, a part with no chapter, a broken reference) and fix it; if it cannot be fixed without a rename, stop and escalate'
    - condition: 'A generated id changes'
      action: 'Add the explicit anchor of the old id above that heading, list it in the record'
    - condition: 'The mapping paragraph needs a claim that no source confirms'
      action: 'Drop the clause and list it in the record'
    - condition: 'The jar or the browser pane cannot run'
      action: 'Record not run or not checked in the prg Findings and do not claim the check'
    - condition: 'A task would need a commit, a push, a tag or a change to a CLAUDE.md, a command or the pom'
      action: 'Do not do it; it is a human step outside the plan'
```

The run operates under the autonomy override of `complete-run`, so a `human_required` task would have been executed without a stop; there is none, and `gate-001` is reviewed at the pull request.

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
    - task-003
    - task-004
  lowest_confidence_tasks:
    - task-004
    - task-003
  next_action: 'Run task-001: apply F1 to F8 to the TDD'
  criteria:
    - 'The six parts, the 91 anchors, the absence of drafts, the book header and the four fixes are in src/doc/README.adoc and pinned by manual-skeleton.test.js'
    - 'The line comparison and the build show no unaccounted difference and no more Asciidoctor lines than before'
    - 'The nine readers of the manual pass unmodified'
    - 'The run record lists every moved block and changed paragraph and names the render check as by eye'
```
