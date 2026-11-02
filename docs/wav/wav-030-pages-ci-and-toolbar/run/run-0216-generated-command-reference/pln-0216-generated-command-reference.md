---
title: Execution Plan — Generated command reference
status: draft
date: 2026-11-01
related:
  - docs/wav/wav-030-pages-ci-and-toolbar/run/run-0216-generated-command-reference/tdd-0216-generated-command-reference.md
  - docs/wav/wav-030-pages-ci-and-toolbar/wav-030-pages-ci-and-toolbar.md
  - src/doc/README.adoc
  - src/test/javascript/manual-howto.test.js
  - https://github.com/tmorin/archicode/issues/199
type: pln
run: 0216
wave: 030
---

# Execution Plan: Generated command reference

Profile TDD+pln: there is no PRD, so REQ-1 to REQ-6 are the IDs the TDD labels (section "PRD Traceability"), taken from the W-6 row, the fourth criterion of gate P2, decision Q3 and the Non-Goal "the commands do not change" of the wave manifest. The plan follows the TDD plus the Stage 5 review findings F-1 to F-5 (progress log of the run, Findings), which the TDD body does not yet hold: task-001 applies them first, and Q-1 is settled by Stage 6 (yes), so no question is open.

The order is test first. task-001 amends the TDD, task-002 saves a baseline of the `--help` outputs, the tree and the Asciidoctor warnings, task-003 writes `CommandReferenceTest` (red on a manual that has no block and one stale listing), task-004 adds the section and the markers, regenerates the block, repairs the sentence and the listing and turns the test green, task-005 adds the node assertion and the two notes for later authors, task-006 proves the work (mutation checks, suites, build, the program unchanged), task-007 writes the record and the follow-up issue of DEF-1.

The plan is strictly sequential: tasks 003 to 005 edit files that the next task reads, and task-004 and task-006 share `src/doc/README.adoc`, so there is no parallel group.

Baseline of the diff checks: the working tree holds uncommitted work of runs 0213 to 0215 and the wave documents. A check of the form `git diff --stat -- <paths>` that reads "unchanged" is read against the baseline taken by task-002 before its first edit (the output of `git diff --stat` and `git status --short`, saved in the scratchpad). No task commits.

JDK: every Maven command runs with `JAVA_HOME=/home/tibo/.sdkman/candidates/java/25.0.4-tem` (the shell `java` is 21).

This run operates under the autonomy override of `complete-run`: no task stops for a human on its category alone, so a future reader of this plan understands why a task flagged `after` was executed without a stop. No task of this plan is `critical` or `human_required`, so the override changes nothing here beyond the review of the generated block by the author (gate-001), which is logged in the prg when the run ends.

## 1. Executive Summary

```yaml
summary:
  status: 'done'
  product_goal: 'The Commands part of the manual holds the usage of the root command and of every command exactly as the program prints it, a test fails when the manual and the program disagree, and no hand-written command line or option of the Commands part names something the program does not have.'
  technical_approach: 'A new QuarkusTest, CommandReferenceTest, builds the block from a private CommandLine named archicode, compares it with the lines between two comment markers of src/doc/README.adoc (or writes it when ARCHICODE_MANUAL_REGENERATE=1), and checks the list of commands, the archicode lines of the listings and the options of the code spans against the same CommandSpec; the section, the markers, the repaired sentence and the corrected listing are written by hand once, the block by the test.'
  total_tasks: 7
  parallel_groups: 0
  high_risk_tasks: 0
  human_review_gates: 1
  autonomy_level: 'medium'
  recommendation: 'proceed_with_review'
  criteria:
    - 'src/doc/README.adoc defines [[command-reference]] as a === section of == Commands, before == Appendix, with exactly one BEGIN and one END marker line in that order, and the block between them holds one titled listing per command of the program, the root first, 17 in all, counted from the spec'
    - 'CommandReferenceTest passes on the repository manual, and each of the seven mutation checks of the TDD on a copy (ARCHICODE_MANUAL_PATH) fails with the message of the check it targets while the untouched copy passes (REQ-2, REQ-3)'
    - 'The listing that showed archicode views generate --properties now uses --properties-content, the sentence that counted the commands has no count, and every id of git show ff3bacd:src/doc/README.adoc is still defined (REQ-5, REQ-6)'
    - 'The words of each listing of the block equal the saved --help output of the jar for the same command, the only difference being archicode for <main class> and the indentation it shifts; the saved outputs equal a fresh run of the jar after the work (ASM-1, REQ-4)'
    - 'git diff --stat against the baseline shows only src/doc/README.adoc, CommandReferenceTest.java, manual-howto.test.js, src/test/CLAUDE.md, src/main/java/io/morin/archicode/CLAUDE.md and the run folder (REQ-4)'
    - './mvnw test, the four node manual tests, npm run test:unit, npm run format:check, npm run lint and ./mvnw test-compile pmd:check exit 0, and the Asciidoctor warnings after are not more than before'
```

## 2. PRD/TDD Consistency Assessment

```yaml
consistency_assessment:
  aligned_items:
    - 'Scope, REQ-1 to REQ-6, DEC-1 to DEC-6, CTR-1 to CTR-3 and IMP-1 to IMP-5 agree with the W-6 row, the fourth criterion of gate P2 and decision Q3; every task below traces to them'
    - 'Q-1 is settled by Stage 6 (the usage of a CommandLine equals --help of the jar, byte for byte, root name included), so ASM-1 and ASM-2 hold and the test renders with getUsageMessage(Ansi.OFF)'
    - 'No command, option, message or exit code changes; pom.xml, workflows, scripts, src/site, src/doc/examples and src/main are not touched; scripts/changes.mjs already sends src/doc/** and src/test/java/** to the Java job, which runs the new test'
  gaps:
    - id: gap-001
      type: contradiction
      description: 'Stage 5 F-1 (S2): CTR-2 (b) and Current State say the bullet equals the description of the command, but DiffCommand, init and guide have several description paragraphs and the bullet is the first.'
      impact: 'medium'
      recommendation: 'task-001 defines (b) as the first element of usageMessage().description(), whitespace normalised, compared with the bullet text up to its last occurrence of the text " (see", and corrects the Current State sentence.'
    - id: gap-002
      type: contradiction
      description: 'Stage 5 F-2 (S2): FLOW-1 step 5 inserts the section when the markers are absent, but CTR-1 makes the introduction hand-written and the branch list says absent markers fail.'
      impact: 'medium'
      recommendation: 'task-001 deletes the insertion; task-004 adds the section, its id and the two markers by hand once; the regenerate mode fails with the marker message exactly as the compare mode does.'
    - id: gap-003
      type: contradiction
      description: 'Stage 5 F-3 (S2): DEC-4, RISK-4 and the finally rename the root spec of the shared injected CommandLine, though tests already build a private one with the injected CommandLine.IFactory.'
      impact: 'medium'
      recommendation: 'task-001 changes DEC-4, DEC-6, FLOW-1 and Observability to a private CommandLine built with the injected factory and named with setCommandName, removes RISK-4 and the finally, and states that ASM-1 is proved on that instance.'
    - id: gap-004
      type: missing_requirement
      description: 'Stage 5 F-4 (S1): CTR-2 (d) covers the code spans of == Commands only, and documented(option) of manual-howto.test.js reads the whole Commands part, which the block will make always true.'
      impact: 'low'
      recommendation: 'task-001 says in Non-Goals and IMP-3 that the Java test owns the existence of an option, the node test owns the shape of the two how-to pages, and a code span outside == Commands is accepted as unchecked.'
    - id: gap-005
      type: ambiguity
      description: 'Stage 5 F-5 (S1): the Summary of the TDD said the review was pending and Q-1 sat open although one comparison settles it.'
      impact: 'low'
      recommendation: 'Settled: the Summary already says dispatched and Stage 6 settled Q-1; task-001 only checks that no sentence of the TDD still calls it open.'
    - id: gap-006
      type: risk
      description: 'The block compares names and descriptions, not the sentences of the per-command sections (RISK-2), and a picocli upgrade can reflow the usage (RISK-3).'
      impact: 'low'
      recommendation: 'Accepted as the TDD does: the intro of the block says it is the text the program prints, the width is asserted separately (ASM-2), DEF-2 carries the prose.'
    - id: gap-007
      type: risk
      description: 'DEF-1 asks for a GitHub issue on tmorin/archicode, a public side effect, and the TDD does not say who files it.'
      impact: 'low'
      recommendation: 'task-007 files it with gh issue create under the standing rule that deferred items of a wave are GitHub issues; if gh is unavailable or refused, the issue text is written in the record and the task logs that it was not filed.'
    - id: gap-008
      type: contradiction
      description: 'Stage 9 scan of the repository: CTR-2 (b) requires each bullet of the list at the top of == Commands to carry a defined <<id>>, but the bullet of query (line 2424) says "see Query views and Query graph below" with no link, and the two sections it names (=== Query views, === Query graph) have no explicit id. Check (b) would fail on query and no Stage 5 finding names it.'
      impact: 'medium'
      recommendation: 'task-001 amends CTR-2 (b): every <<id>> a bullet holds must be defined, a bullet with none is accepted, and the names compared are those of the first-level commands; task-004 leaves the bullet of query as it is (no id is added, CON-1 untouched).'
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
        - 'tdd-0216-generated-command-reference.md amended (CTR-2 b with the rule for a bullet that has no <<id>>, FLOW-1, DEC-4, DEC-6, RISK-4, Non-Goals, IMP-3, Observability)'
        - 'One row per fix in the Findings section of prg-0216-generated-command-reference.md'
      agent_role: 'Architecture Agent'
      autonomy: 'autonomous'
      risk: 'low'
      confidence: 85
    - id: task-002
      status: 'done'
      title: 'Save the baseline: help outputs, tree state, Asciidoctor warnings'
      depends_on: [task-001]
      produces:
        - 'Scratchpad: 17 saved --help outputs from the packaged jar, git status --short and git diff --stat, the Asciidoctor warning count and the ids of git show ff3bacd:src/doc/README.adoc'
      agent_role: 'QA Agent'
      autonomy: 'autonomous'
      risk: 'low'
      confidence: 85
    - id: task-003
      status: 'done'
      title: 'Write CommandReferenceTest, red'
      depends_on: [task-002]
      produces:
        - 'src/test/java/io/morin/archicode/doc/CommandReferenceTest.java'
      agent_role: 'Test Generation Agent'
      autonomy: 'autonomous'
      risk: 'medium'
      confidence: 70
    - id: task-004
      status: 'done'
      title: 'Add the section and markers, regenerate the block, repair the sentence and the listing'
      depends_on: [task-003]
      produces:
        - 'src/doc/README.adoc with [[command-reference]], the two markers, the generated block, the sentence without a count, the listing with --properties-content'
      agent_role: 'Documentation Agent'
      autonomy: 'autonomous'
      risk: 'medium'
      confidence: 75
    - id: task-005
      status: 'done'
      title: 'Pin the section in the node suite and write the notes for later authors'
      depends_on: [task-004]
      produces:
        - 'src/test/javascript/manual-howto.test.js with one assertion on the section and the markers'
        - 'src/test/CLAUDE.md and src/main/java/io/morin/archicode/CLAUDE.md with one short paragraph each'
      agent_role: 'Documentation Agent'
      autonomy: 'autonomous'
      risk: 'low'
      confidence: 85
    - id: task-006
      status: 'done'
      title: 'Prove the work: mutation checks, suites, build, the program unchanged'
      depends_on: [task-005]
      produces:
        - 'Scratchpad proof: Q-1 comparison, results of the seven mutation checks, test and build outputs, Asciidoctor counts, diff of the help outputs, git diff --stat against the baseline'
      agent_role: 'QA Agent'
      autonomy: 'autonomous'
      risk: 'low'
      confidence: 80
    - id: task-007
      status: 'done'
      title: 'Read the section as a reader, write the run record, file the issue of DEF-1'
      depends_on: [task-006]
      produces:
        - 'Run record: decision of Q3, mutation results, the main class finding, the fixed listing, the Asciidoctor counts'
        - 'A GitHub issue for DEF-1 (or its text in the record when it could not be filed)'
      agent_role: 'Documentation Agent'
      autonomy: 'review_after'
      risk: 'low'
      confidence: 80
  edges:
    - from: task-001
      to: task-002
      reason: 'The baseline and the test are written against the amended TDD, not the one the review found faulty'
    - from: task-002
      to: task-003
      reason: 'The test is run red against a baseline that is known and saved before the first edit'
    - from: task-003
      to: task-004
      reason: 'The block is written by the test, so the test exists before the section it fills'
    - from: task-004
      to: task-005
      reason: 'The node assertion pins markers that exist only after task-004, and the notes name the working regeneration command'
    - from: task-005
      to: task-006
      reason: 'The proof runs every suite on the finished files'
    - from: task-006
      to: task-007
      reason: 'The record states what the proof found'
```

## 4. Task Catalog

```yaml
task_catalog:
  tasks:
    - id: task-001
      title: 'Amend the TDD with the Stage 5 findings'
      source_requirements:
        prd:
          - 'REQ-2'
          - 'REQ-4'
        tdd:
          - 'CTR-2'
          - 'FLOW-1'
          - 'DEC-4'
          - 'DEC-6'
          - 'RISK-4'
          - 'Non-Goals'
          - 'IMP-3'
          - 'Q-1'
      outputs:
        - 'tdd-0216-generated-command-reference.md with F-1 to F-5 and gap-008 applied'
        - 'Findings of the prg marked applied, one line per finding'
      verification:
        - 'grep -c "finally" tdd-0216-generated-command-reference.md prints 0 and grep -c "RISK-4" prints 0 or only the line that says the risk was removed'
        - 'grep -n "insert the section" tdd-0216-generated-command-reference.md prints nothing (FLOW-1 step 5 no longer inserts the section, the text of the TDD says "before `== Appendix`" only for where the hand-written section stands)'
        - 'grep -n "first element" tdd-0216-generated-command-reference.md names the rule of CTR-2 (b)'
        - 'grep -n "accepted" tdd-0216-generated-command-reference.md shows that CTR-2 (b) accepts a bullet with no <<id>> (the bullet of query) and requires each <<id>> a bullet holds to be defined (gap-008)'
        - 'grep -n "setCommandName" tdd-0216-generated-command-reference.md shows the private command line in DEC-4'
        - 'grep -n "owns" tdd-0216-generated-command-reference.md shows the split between the Java test and the node test'
        - 'sed -n 1,20p of the TDD still shows run: 0216 and wave: 030 in the frontmatter'
      risk: 'low'
      confidence: 85
      human_review: 'none'
      escalation_triggers:
        - 'A fix contradicts another section of the TDD that the review did not name'
        - 'The private command line cannot be built with the injected factory (task-003 would find out; then DEC-4 is reopened in the record)'
      delegation_tier: 'standard'
      results: 'tier standard, model sonnet, effort medium, profile low-cost, passed first time, inline (leaf), independently verified'
    - id: task-002
      title: 'Save the baseline: help outputs, tree state, Asciidoctor warnings'
      source_requirements:
        prd:
          - 'REQ-4'
          - 'REQ-6'
        tdd:
          - 'Observability 1'
          - 'Observability 2'
          - 'Observability 5'
          - 'ASM-1'
          - 'CON-1'
      outputs:
        - 'Scratchpad directory baseline/ with help-<command>.txt for the 17 commands, status.txt, diffstat.txt, asciidoctor-before.txt (count of warning lines) and ids-ff3bacd.txt'
      verification:
        - 'ls baseline/help-*.txt | wc -l prints 17 and each file starts with Usage: <main class>'
        - 'baseline/status.txt and baseline/diffstat.txt are non-empty and list src/doc/README.adoc'
        - 'The jar target/quarkus-app/quarkus-run.jar is newer than every file under src/main/java, or the task rebuilt it with ./mvnw package -Dmaven.test.skip -Dplugin.asciidoctor.skip=true under JAVA_HOME of JDK 25'
        - 'baseline/ids-ff3bacd.txt has 91 lines'
      risk: 'low'
      confidence: 85
      human_review: 'none'
      escalation_triggers:
        - 'The jar cannot be built or run (the other tasks cannot compare with the program)'
        - 'The count of help outputs is not 17 (the command tree differs from the TDD, so the TDD is reread before task-003)'
      delegation_tier: 'cheap'
      results: 'tier cheap, model haiku, effort high, profile low-cost, passed first time, inline (leaf), independently verified'
    - id: task-003
      title: 'Write CommandReferenceTest, red'
      source_requirements:
        prd:
          - 'REQ-1'
          - 'REQ-2'
          - 'REQ-3'
          - 'REQ-5'
        tdd:
          - 'CTR-1'
          - 'CTR-2'
          - 'CTR-3'
          - 'FLOW-1'
          - 'DEC-2'
          - 'DEC-3'
          - 'DEC-4'
          - 'DEC-5'
          - 'DEC-6'
          - 'ASM-2'
          - 'ASM-3'
          - 'ASM-4'
          - 'IMP-2'
      outputs:
        - 'src/test/java/io/morin/archicode/doc/CommandReferenceTest.java: a QuarkusTest that builds its own CommandLine with the injected factory, names it archicode, walks it depth-first in declaration order, builds the block, compares or (with ARCHICODE_MANUAL_REGENERATE=1) writes it, and runs the checks (b), (c), (d) with NOT_OPTIONS and a reason for each entry'
        - 'The test reads ARCHICODE_MANUAL_PATH (default src/doc/README.adoc) and never writes without the regenerate variable'
        - 'The failure messages name the check, the first differing command and the regeneration command, and never print the whole block (IF-3)'
      verification:
        - 'JAVA_HOME=/home/tibo/.sdkman/candidates/java/25.0.4-tem ./mvnw test -Dtest=CommandReferenceTest compiles and runs; it fails, as intended, because the manual has no marker (the message names the marker) and, once the markers are added by hand on a scratchpad copy, on the listing --properties; task-004 turns it green'
        - 'JAVA_HOME=/home/tibo/.sdkman/candidates/java/25.0.4-tem ./mvnw test-compile pmd:check exits 0 with no NOPMD in the new file'
        - 'npm run format:check reports no file under src/test/java/io/morin/archicode/doc/CommandReferenceTest.java'
        - 'git diff --stat against the baseline shows the repository manual unchanged by this task'
        - 'grep -n "ARCHICODE_MANUAL_REGENERATE" CommandReferenceTest.java shows the one branch that writes the file'
      risk: 'medium'
      confidence: 70
      human_review: 'none'
      escalation_triggers:
        - 'The test cannot get a CommandLine with the application factory, or the usage of the private instance differs from the saved --help outputs by more than the name of the root'
        - 'A description or option text contains a line that AsciiDoc would read inside a ---- listing as a closing delimiter'
        - 'PMD refuses a construct the test needs and the only way out is a suppression'
      delegation_tier: 'standard'
      results: 'tier standard, model sonnet, effort medium, profile low-cost, passed first time, inline (leaf), independently verified'
    - id: task-004
      title: 'Add the section and markers, regenerate the block, repair the sentence and the listing'
      source_requirements:
        prd:
          - 'REQ-1'
          - 'REQ-2'
          - 'REQ-5'
          - 'REQ-6'
        tdd:
          - 'CTR-1'
          - 'CTR-2'
          - 'IF-1'
          - 'IF-2'
          - 'DEC-1'
          - 'DEC-3'
          - 'DEC-4'
          - 'ASM-5'
          - 'ASM-6'
          - 'CON-1'
          - 'CON-2'
          - 'CON-3'
          - 'IMP-1'
      outputs:
        - 'src/doc/README.adoc: a section [[command-reference]] === Every command and option before == Appendix, a two-sentence introduction in the voice of run 0214 that says the usage is the text the program prints with archicode for its name, links the per-command sections, and holds the BEGIN and END marker lines'
        - 'The block written by CommandReferenceTest with ARCHICODE_MANUAL_REGENERATE=1, never by hand'
        - 'The sentence that said eight commands has no count and links <<command-reference>>'
        - 'The listing at the former line 2606 uses --properties-content'
      verification:
        - 'grep -c "\[\[command-reference\]\]" src/doc/README.adoc prints 1, and grep -c "BEGIN generated by CommandReferenceTest" and grep -c "END generated by CommandReferenceTest" each print 1'
        - 'JAVA_HOME=/home/tibo/.sdkman/candidates/java/25.0.4-tem ./mvnw test -Dtest=CommandReferenceTest exits 0 without the regenerate variable'
        - 'The block holds 17 lines that start with a dot followed by archicode, counted by awk between the markers'
        - 'grep -n "views generate --properties=" src/doc/README.adoc prints nothing and grep -c "eight commands" prints 0'
        - 'comm of the sorted ids of the built file and baseline/ids-ff3bacd.txt shows no id of the old manual missing (grep over [[id]] and [#id] anchors)'
        - 'node --test src/test/javascript/manual-skeleton.test.js src/test/javascript/manual-voice.test.js src/test/javascript/site.test.js exits 0'
        - 'JAVA_HOME=/home/tibo/.sdkman/candidates/java/25.0.4-tem ./mvnw generate-resources exits 0 and the Asciidoctor warning lines are not more than baseline/asciidoctor-before.txt'
        - 'The words of each listing of the block equal baseline/help-<command>.txt with archicode for <main class>, ignoring the indentation of continuation lines (the Q-1 comparison of Observability 2)'
      risk: 'medium'
      confidence: 75
      human_review: 'none'
      escalation_triggers:
        - 'A regenerated listing differs from the saved help output in a word, a default or an option (a bug of the test, fixed in task-003 files and logged)'
        - 'manual-skeleton.test.js or manual-voice.test.js fails on the new section'
        - 'Asciidoctor warns on the markers or the block titles (ASM-6 is false and DEC-1 is reopened in the record)'
      delegation_tier: 'standard'
      results: 'tier standard, model sonnet, effort medium, profile low-cost, passed after escalation to effort high, inline (leaf), independently verified'
    - id: task-005
      title: 'Pin the section in the node suite and write the notes for later authors'
      source_requirements:
        prd:
          - 'REQ-1'
          - 'REQ-6'
        tdd:
          - 'IMP-3'
          - 'IMP-4'
          - 'DEC-6'
          - 'CON-1'
      outputs:
        - 'manual-howto.test.js: one assertion that [[command-reference]] is a === section of == Commands, that BEGIN and END each occur once in that order, and that the block has the root title; no assertion on the content of the block'
        - 'src/test/CLAUDE.md: a bullet that says a change to a command or an option text is a regeneration of the block, with the command'
        - 'src/main/java/io/morin/archicode/CLAUDE.md: a sentence next to the guide with the same command'
      verification:
        - 'node --test src/test/javascript/manual-howto.test.js exits 0'
        - 'Deleting the END marker on a scratchpad copy of the manual makes the new assertion fail (the node test reads the manual named by MANUAL_HOWTO_PATH, so the task runs it with MANUAL_HOWTO_PATH=<copy> and does not edit the test)'
        - 'npm run format:check and npm run lint exit 0'
        - 'grep -n "ARCHICODE_MANUAL_REGENERATE" src/test/CLAUDE.md src/main/java/io/morin/archicode/CLAUDE.md prints one hit in each file'
        - 'git diff --stat against the baseline shows manual-skeleton.test.js unchanged'
      risk: 'low'
      confidence: 85
      human_review: 'none'
      escalation_triggers:
        - 'The node test cannot read a mutated copy without a change of its helper (then the mutation is done by editing a temporary copy of the test, and logged)'
      delegation_tier: 'standard'
      results: 'tier standard, model sonnet, effort medium, profile low-cost, passed first time, inline (leaf), independently verified'
    - id: task-006
      title: 'Prove the work: mutation checks, suites, build, the program unchanged'
      source_requirements:
        prd:
          - 'REQ-2'
          - 'REQ-3'
          - 'REQ-4'
          - 'REQ-6'
        tdd:
          - 'Observability 2'
          - 'Observability 3'
          - 'Observability 4'
          - 'Observability 5'
          - 'Observability 6'
          - 'CON-5'
          - 'CON-7'
      outputs:
        - 'Scratchpad: one line per mutation check (a) to (g) with the failing message, plus the pass of the untouched copy'
        - 'Scratchpad: outputs of ./mvnw test, the four node manual tests, npm run test:unit, npm run format:check, npm run lint, ./mvnw test-compile pmd:check, and the Asciidoctor counts before and after'
        - 'Scratchpad: diff of the 17 saved help outputs against a fresh run of the jar, and git diff --stat against the baseline'
      verification:
        - 'Each mutation (a) to (g) of Observability 3, run with ARCHICODE_MANUAL_PATH=<copy> ./mvnw test -Dtest=CommandReferenceTest, fails with the message of its own check, and the untouched copy exits 0'
        - 'JAVA_HOME=/home/tibo/.sdkman/candidates/java/25.0.4-tem ./mvnw test exits 0'
        - 'node --test of manual-skeleton, manual-voice, manual-howto and site exits 0; npm run test:unit, npm run format:check and npm run lint exit 0; ./mvnw test-compile pmd:check exits 0'
        - 'diff of each baseline/help-<command>.txt with a fresh java -jar target/quarkus-app/quarkus-run.jar <command> --help prints nothing for all 17'
        - 'git diff --stat against baseline/diffstat.txt adds only the files named in the fifth criterion of the summary, and no file of src/main, pom.xml, .github, scripts, src/site or src/doc/examples'
        - 'The repository manual is byte-identical before and after the mutation checks (they run on copies; compare a checksum taken before)'
      risk: 'low'
      confidence: 80
      human_review: 'none'
      escalation_triggers:
        - 'A mutation does not fail the test, or fails with another check message (the check is vacuous or mislabeled: fix the test, rerun all seven)'
        - 'A suite fails for a reason that is not this run (a file of runs 0213 to 0215): list it and do not fix it here'
        - 'The help outputs differ after the work (the run changed the program; revert the change)'
      delegation_tier: 'standard'
      results: 'tier standard, model sonnet, effort medium, profile low-cost, passed first time, inline (leaf), independently verified'
    - id: task-007
      title: 'Read the section as a reader, write the run record, file the issue of DEF-1'
      source_requirements:
        prd:
          - 'REQ-1'
          - 'REQ-3'
          - 'REQ-4'
        tdd:
          - 'Observability 7'
          - 'DEF-1'
          - 'DEF-2'
          - 'DEF-3'
          - 'Deployment and Rollout'
      outputs:
        - 'Run record in the run folder: Q3 decided (DEC-1), the stale listing found and fixed, the main class finding, mutation results, Asciidoctor counts, the browser check or the statement that it was not checked'
        - 'A GitHub issue on tmorin/archicode for DEF-1 (Setting name = archicode on the @Command of ArchiCode.java changes every --help; byte-identity.sh runs no --help) or, if it cannot be filed, its text in the record with the line "not filed"'
      verification:
        - 'The record file exists in the run folder, names each of REQ-1 to REQ-6 with a result, and does not claim a check that was not run'
        - 'gh issue list --repo tmorin/archicode --search "main class" shows the new issue, or the record says not filed and why'
        - 'If the browser pane is available, the built manual (target/generated-docs/index.html at #command-reference) was opened, the first and last listing read, the intro link followed, and the table of contents counted at six parts; otherwise the record says not checked'
      risk: 'low'
      confidence: 80
      human_review: 'after'
      escalation_triggers:
        - 'gh is not authenticated or refuses to create the issue'
        - 'The built manual does not show the section, or the table of contents has a seventh part'
      delegation_tier: 'standard'
      results: 'tier standard, model sonnet, effort medium, profile low-cost, passed first time, inline (leaf), independently verified'
```

## 5. Parallelization Plan

```yaml
parallelization_plan:
  groups: []
```

No group: tasks 003 and 004 are one red then green pair on `CommandReferenceTest` and `src/doc/README.adoc`; task-005 reads the markers task-004 writes; task-006 and task-007 read everything. The conflict risks are the shared file `src/doc/README.adoc` (tasks 004 and the copies of 006) and the shared checkout built by Maven (a second Maven run in the same `target/` corrupts it).

## 6. Human Review Gates

```yaml
human_review_gates:
  gates:
    - id: gate-001
      trigger: 'The run ends with a generated block of about 330 lines in the manual, the root named archicode in a text where the program prints main class, and a GitHub issue filed for DEF-1.'
      required_before: []
      required_after: ['task-007']
      reviewer_focus:
        - 'Accept the choice of DEC-4 (the manual says archicode where the program says the main class) until DEF-1 is done, or ask for the name to be set in ArchiCode.java now (it changes every --help)'
        - 'Read the introduction of the section once: is it plain and direct, and does it say that the block is what the program prints'
        - 'Check that the issue of DEF-1 says what changes (usage only, no file, no exit code) and names byte-identity.sh'
```

## 7. Risk Assessment

```yaml
risk_assessment:
  by_task:
    - id: task-001
      risk: 'low'
      rationale: 'A document edit against five written findings; the verification greps for each.'
    - id: task-002
      risk: 'low'
      rationale: 'Read-only: it runs the jar and saves files in the scratchpad.'
    - id: task-003
      risk: 'medium'
      rationale: 'The one new piece of code, and the only place a file is written; RISK-3 and RISK-5 live here, and the regeneration branch must not write without the variable.'
    - id: task-004
      risk: 'medium'
      rationale: 'It edits the 3793-line manual that two node tests and the site test read; an id or a heading of the old manual must not move.'
    - id: task-005
      risk: 'low'
      rationale: 'One assertion and two short notes.'
    - id: task-006
      risk: 'low'
      rationale: 'Runs and mutations on copies; the only risk is mutating the real manual, guarded by a checksum.'
    - id: task-007
      risk: 'low'
      rationale: 'A record and one issue; the issue is public text, hence review after.'
  by_area:
    - area: 'docs'
      risk: 'medium'
      rationale: 'About 330 generated lines join the manual (RISK-1); the old ids and the voice tests are the guard.'
    - area: 'api'
      risk: 'low'
      rationale: 'No command, option, message or exit code changes (CON-6); the final diff of the help outputs proves it.'
    - area: 'infra'
      risk: 'low'
      rationale: 'No pom.xml, profile or workflow change, so the rule that a pom change is proved only on main does not apply.'
```

## 8. Confidence Assessment

```yaml
confidence_assessment:
  by_task:
    - id: task-001
      score: 85
      rationale: 'Each fix is stated in the findings with its wording.'
    - id: task-002
      score: 85
      rationale: 'Mechanical; the TDD says the drafting run already did the same on the same jar.'
    - id: task-003
      score: 70
      rationale: 'The behavior is specified, but the walk, the description rule for (b) and the line scans for (c) and (d) are new code with edge cases (the init and guide description arrays, the docker run line, the NOT_OPTIONS reasons).'
    - id: task-004
      score: 75
      rationale: 'Depends on Asciidoctor reading comments between listings (ASM-6, to be proved by the build) and on the voice test accepting the intro.'
    - id: task-005
      score: 85
      rationale: 'Small and checked by a mutation.'
    - id: task-006
      score: 80
      rationale: 'The commands are listed; a vacuous check would show as a mutation that passes.'
    - id: task-007
      score: 80
      rationale: 'The issue depends on gh being usable in this environment; the record covers that case.'
```

## 9. Agent Assignment Plan

```yaml
agent_assignment_plan:
  assignments:
    - task_id: task-001
      agent_role: 'Architecture Agent'
      objective: 'Apply the Stage 5 findings F-1 to F-5 to the TDD, without changing a decision the review did not question.'
      context:
        prd_excerpts:
          - 'REQ-2 and REQ-4 of the TDD traceability section (no PRD exists)'
        tdd_excerpts:
          - 'CTR-2 (b), FLOW-1 step 5, DEC-4, DEC-6, RISK-4, Non-Goals, IMP-3, Open Questions'
      likely_files:
        - 'docs/wav/wav-030-pages-ci-and-toolbar/run/run-0216-generated-command-reference/tdd-0216-generated-command-reference.md'
        - 'docs/wav/wav-030-pages-ci-and-toolbar/run/run-0216-generated-command-reference/prg-0216-generated-command-reference.md'
      acceptance_criteria:
        - 'Each finding is applied as its Fix line says and the TDD holds no sentence that the fix makes false'
      verification:
        - 'grep -c "finally" tdd-0216-generated-command-reference.md prints 0 and grep -c "RISK-4" prints 0 or only the line that says the risk was removed'
        - 'grep -n "insert the section" tdd-0216-generated-command-reference.md prints nothing (FLOW-1 step 5 no longer inserts the section, the text of the TDD says "before `== Appendix`" only for where the hand-written section stands)'
        - 'grep -n "first element" tdd-0216-generated-command-reference.md names the rule of CTR-2 (b)'
        - 'grep -n "accepted" tdd-0216-generated-command-reference.md shows that CTR-2 (b) accepts a bullet with no <<id>> (the bullet of query) and requires each <<id>> a bullet holds to be defined (gap-008)'
        - 'grep -n "setCommandName" tdd-0216-generated-command-reference.md shows the private command line in DEC-4'
        - 'grep -n "owns" tdd-0216-generated-command-reference.md shows the split between the Java test and the node test'
        - 'sed -n 1,20p of the TDD still shows run: 0216 and wave: 030 in the frontmatter'
      escalation_triggers:
        - 'A fix contradicts another section'
      suggested_subagent_type: 'general-purpose'
      suggested_model: '(default)'
      suggested_effort: 'low'
    - task_id: task-002
      agent_role: 'QA Agent'
      objective: 'Save the --help of the 17 commands from the packaged jar, the tree state, the Asciidoctor warning count and the 91 ids, in the scratchpad, before any edit.'
      context:
        prd_excerpts:
          - 'REQ-4, REQ-6'
        tdd_excerpts:
          - 'Observability 1, 2 and 5; Current State, command tree'
      likely_files:
        - 'target/quarkus-app/quarkus-run.jar'
        - 'src/main/java/io/morin/archicode/cli/ArchiCode.java'
      acceptance_criteria:
        - 'The baseline directory holds the files named in the task catalog and no repository file changed'
      verification:
        - 'ls baseline/help-*.txt | wc -l prints 17 and each file starts with Usage: <main class>'
        - 'baseline/status.txt and baseline/diffstat.txt are non-empty and list src/doc/README.adoc'
        - 'The jar target/quarkus-app/quarkus-run.jar is newer than every file under src/main/java, or the task rebuilt it with ./mvnw package -Dmaven.test.skip -Dplugin.asciidoctor.skip=true under JAVA_HOME of JDK 25'
        - 'baseline/ids-ff3bacd.txt has 91 lines'
      escalation_triggers:
        - 'The command tree is not 17 usage messages'
      suggested_subagent_type: 'Explore'
      suggested_model: 'haiku'
      suggested_effort: 'low'
    - task_id: task-003
      agent_role: 'Test Generation Agent'
      objective: 'Write CommandReferenceTest as the TDD specifies after the amendment, and run it red for the two reasons the manual still has (no marker, stale listing).'
      context:
        prd_excerpts:
          - 'REQ-1, REQ-2, REQ-3, REQ-5'
        tdd_excerpts:
          - 'CTR-1, CTR-2 (a) to (d), CTR-3, FLOW-1 and its diagram, DEC-2 to DEC-6, ASM-2 to ASM-4'
      likely_files:
        - 'src/test/java/io/morin/archicode/doc/CommandReferenceTest.java'
        - 'src/test/java/io/morin/archicode/doc/GuideCorpusTest.java'
        - 'src/test/java/io/morin/archicode/doc/ManualExamplesTest.java'
        - 'src/main/pmd/ruleset.xml'
      acceptance_criteria:
        - 'The test builds a private CommandLine, names it archicode, asserts the width of 80 and that no command is hidden, and walks the tree depth-first'
        - 'It writes the manual only when ARCHICODE_MANUAL_REGENERATE is 1, and the checks (b), (c), (d) run in both modes'
        - 'Every message names its check and the regeneration command, and none prints the whole block'
      verification:
        - 'JAVA_HOME=/home/tibo/.sdkman/candidates/java/25.0.4-tem ./mvnw test -Dtest=CommandReferenceTest compiles and runs; it fails, as intended, because the manual has no marker (the message names the marker) and, once the markers are added by hand on a scratchpad copy, on the listing --properties; task-004 turns it green'
        - 'JAVA_HOME=/home/tibo/.sdkman/candidates/java/25.0.4-tem ./mvnw test-compile pmd:check exits 0 with no NOPMD in the new file'
        - 'npm run format:check reports no file under src/test/java/io/morin/archicode/doc/CommandReferenceTest.java'
        - 'git diff --stat against the baseline shows the repository manual unchanged by this task'
        - 'grep -n "ARCHICODE_MANUAL_REGENERATE" CommandReferenceTest.java shows the one branch that writes the file'
      escalation_triggers:
        - 'The private command line differs from the saved help by more than the root name'
        - 'PMD can be satisfied only by a suppression'
      suggested_subagent_type: 'general-purpose'
      suggested_model: '(default)'
      suggested_effort: 'high'
    - task_id: task-004
      agent_role: 'Documentation Agent'
      objective: 'Add the section and the two markers by hand, regenerate the block with the test, repair the sentence and the listing, and prove the manual still builds and the old ids stay.'
      context:
        prd_excerpts:
          - 'REQ-1, REQ-2, REQ-5, REQ-6'
        tdd_excerpts:
          - 'CTR-1, IF-1, DEC-1, DEC-3, ASM-5, ASM-6, CON-1 to CON-3'
      likely_files:
        - 'src/doc/README.adoc'
        - 'src/test/java/io/morin/archicode/doc/CommandReferenceTest.java'
        - 'src/test/javascript/manual-voice.test.js'
      acceptance_criteria:
        - 'The introduction is two sentences in the voice of run 0214 and says the usage is the text the program prints, with archicode for its name'
        - 'The block is exactly what the test writes; a hand edit between the markers is a defect'
        - 'The checks of task-004 in the task catalog all hold'
      verification:
        - 'grep -c "\[\[command-reference\]\]" src/doc/README.adoc prints 1, and grep -c "BEGIN generated by CommandReferenceTest" and grep -c "END generated by CommandReferenceTest" each print 1'
        - 'JAVA_HOME=/home/tibo/.sdkman/candidates/java/25.0.4-tem ./mvnw test -Dtest=CommandReferenceTest exits 0 without the regenerate variable'
        - 'The block holds 17 lines that start with a dot followed by archicode, counted by awk between the markers'
        - 'grep -n "views generate --properties=" src/doc/README.adoc prints nothing and grep -c "eight commands" prints 0'
        - 'comm of the sorted ids of the built file and baseline/ids-ff3bacd.txt shows no id of the old manual missing (grep over [[id]] and [#id] anchors)'
        - 'node --test src/test/javascript/manual-skeleton.test.js src/test/javascript/manual-voice.test.js src/test/javascript/site.test.js exits 0'
        - 'JAVA_HOME=/home/tibo/.sdkman/candidates/java/25.0.4-tem ./mvnw generate-resources exits 0 and the Asciidoctor warning lines are not more than baseline/asciidoctor-before.txt'
        - 'The words of each listing of the block equal baseline/help-<command>.txt with archicode for <main class>, ignoring the indentation of continuation lines (the Q-1 comparison of Observability 2)'
      escalation_triggers:
        - 'A regenerated listing differs from the saved help in a word'
        - 'A node manual test or Asciidoctor rejects the section'
      suggested_subagent_type: 'general-purpose'
      suggested_model: '(default)'
      suggested_effort: 'medium'
    - task_id: task-005
      agent_role: 'Documentation Agent'
      objective: 'Add the one node assertion on the section and the markers, and the two notes that tell a later author how to regenerate the block.'
      context:
        prd_excerpts:
          - 'REQ-1, REQ-6'
        tdd_excerpts:
          - 'IMP-3, IMP-4, DEC-6, CON-1'
      likely_files:
        - 'src/test/javascript/manual-howto.test.js'
        - 'src/test/CLAUDE.md'
        - 'src/main/java/io/morin/archicode/CLAUDE.md'
      acceptance_criteria:
        - 'The assertion pins the shape and not the content, and fails when the END marker is deleted'
        - 'Each note is a few lines and gives the command ARCHICODE_MANUAL_REGENERATE=1 JAVA_HOME=<jdk 25> ./mvnw test -Dtest=CommandReferenceTest'
      verification:
        - 'node --test src/test/javascript/manual-howto.test.js exits 0'
        - 'Deleting the END marker on a scratchpad copy of the manual makes the new assertion fail (the node test reads the manual named by MANUAL_HOWTO_PATH, so the task runs it with MANUAL_HOWTO_PATH=<copy> and does not edit the test)'
        - 'npm run format:check and npm run lint exit 0'
        - 'grep -n "ARCHICODE_MANUAL_REGENERATE" src/test/CLAUDE.md src/main/java/io/morin/archicode/CLAUDE.md prints one hit in each file'
        - 'git diff --stat against the baseline shows manual-skeleton.test.js unchanged'
      escalation_triggers:
        - 'The node test cannot be pointed at a mutated copy'
      suggested_subagent_type: 'general-purpose'
      suggested_model: '(default)'
      suggested_effort: 'low'
    - task_id: task-006
      agent_role: 'QA Agent'
      objective: 'Run the seven mutation checks on copies of the manual, every suite and build named in the TDD, and the comparison of the program before and after, and save the outputs.'
      context:
        prd_excerpts:
          - 'REQ-2, REQ-3, REQ-4, REQ-6'
        tdd_excerpts:
          - 'Observability 2 to 6, CON-5, CON-7'
      likely_files:
        - 'src/doc/README.adoc'
        - 'src/test/java/io/morin/archicode/doc/CommandReferenceTest.java'
      acceptance_criteria:
        - 'The checks of task-006 in the task catalog all hold and the repository manual has the same checksum before and after the mutations'
      verification:
        - 'Each mutation (a) to (g) of Observability 3, run with ARCHICODE_MANUAL_PATH=<copy> ./mvnw test -Dtest=CommandReferenceTest, fails with the message of its own check, and the untouched copy exits 0'
        - 'JAVA_HOME=/home/tibo/.sdkman/candidates/java/25.0.4-tem ./mvnw test exits 0'
        - 'node --test of manual-skeleton, manual-voice, manual-howto and site exits 0; npm run test:unit, npm run format:check and npm run lint exit 0; ./mvnw test-compile pmd:check exits 0'
        - 'diff of each baseline/help-<command>.txt with a fresh java -jar target/quarkus-app/quarkus-run.jar <command> --help prints nothing for all 17'
        - 'git diff --stat against baseline/diffstat.txt adds only the files named in the fifth criterion of the summary, and no file of src/main, pom.xml, .github, scripts, src/site or src/doc/examples'
        - 'The repository manual is byte-identical before and after the mutation checks (they run on copies; compare a checksum taken before)'
      escalation_triggers:
        - 'A mutation passes or fails with another check message'
        - 'The help outputs differ after the work'
      suggested_subagent_type: 'general-purpose'
      suggested_model: '(default)'
      suggested_effort: 'medium'
    - task_id: task-007
      agent_role: 'Documentation Agent'
      objective: 'Read the section as a reader would, write the run record from the proof, and file the issue of DEF-1.'
      context:
        prd_excerpts:
          - 'REQ-1, REQ-3, REQ-4'
        tdd_excerpts:
          - 'Observability 7, DEF-1 to DEF-3, Deployment and Rollout'
      likely_files:
        - 'docs/wav/wav-030-pages-ci-and-toolbar/run/run-0216-generated-command-reference/'
        - 'target/generated-docs/index.html'
      acceptance_criteria:
        - 'The record states each requirement with a result and says plainly which check was not run'
        - 'The issue is filed or its text and the reason it was not filed are in the record'
      verification:
        - 'The record file exists in the run folder, names each of REQ-1 to REQ-6 with a result, and does not claim a check that was not run'
        - 'gh issue list --repo tmorin/archicode --search "main class" shows the new issue, or the record says not filed and why'
        - 'If the browser pane is available, the built manual (target/generated-docs/index.html at #command-reference) was opened, the first and last listing read, the intro link followed, and the table of contents counted at six parts; otherwise the record says not checked'
      escalation_triggers:
        - 'gh refuses the issue'
        - 'The section does not show in the built manual'
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
        - 'grep over the amended TDD'
      success_criteria:
        - 'F-1 to F-5 are visible in the text and the removed risk and the finally are gone'
    - task_id: task-002
      methods:
        - 'file counts and head of each saved file'
      success_criteria:
        - '17 help files, 91 ids, a saved status and diffstat'
    - task_id: task-003
      methods:
        - 'unit test run (red by design)'
        - 'PMD'
        - 'format check'
      success_criteria:
        - 'The test compiles, fails with the marker message, writes nothing without the variable, and PMD and Prettier accept it'
    - task_id: task-004
      methods:
        - 'unit test'
        - 'node tests'
        - 'Asciidoctor build'
        - 'comparison with the saved help outputs'
      success_criteria:
        - 'CommandReferenceTest is green, 17 listings, no old id lost, no new Asciidoctor warning, the words equal the program'
    - task_id: task-005
      methods:
        - 'node test'
        - 'mutation of the END marker'
        - 'lint and format'
      success_criteria:
        - 'The new assertion passes and fails when the marker is deleted'
    - task_id: task-006
      methods:
        - 'mutation checks (a) to (g)'
        - 'full unit and node suites'
        - 'diff of the help outputs'
        - 'git diff --stat against the baseline'
      success_criteria:
        - 'Every mutation fails with its own message, every suite exits 0, the program is unchanged, only the planned files changed'
    - task_id: task-007
      methods:
        - 'file check of the record'
        - 'gh issue list'
        - 'browser read of the built manual when the pane exists'
      success_criteria:
        - 'The record is honest about what was and was not checked and the issue exists or is explained'
```

## 11. Escalation Rules

```yaml
escalation_rules:
  rules:
    - condition: 'The test and the saved help output of a command disagree by more than the name of the root'
      action: 'Fix the test, never the saved output and never the program, rerun, and log it.'
    - condition: 'A change would touch src/main, pom.xml, a workflow, a script, src/site or src/doc/examples'
      action: 'Stop that change, record it as out of scope (CON-6) and, if it is DEF-1, leave it to the issue.'
    - condition: 'The voice test or the skeleton test fails on the new section'
      action: 'Rewrite the sentence or move the section; no exemption and no change to the fixture of 91 ids.'
    - condition: 'A mutation of task-006 does not fail the test'
      action: 'The check is vacuous: fix the test in CommandReferenceTest, then rerun all seven mutations.'
    - condition: 'A suite fails for a file that this run did not touch'
      action: 'List it in the record and leave it; do not fix another run work here.'
    - condition: 'The regeneration command writes anything other than the lines between the markers'
      action: 'Revert the manual from the scratchpad copy, fix the writer and rerun.'
    - condition: 'gh is unavailable or refuses the issue of DEF-1'
      action: 'Write the issue text in the record, say not filed, and do not retry with another tool.'
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
  lowest_confidence_tasks:
    - task-003
    - task-004
  next_action: 'Run task-001: amend the TDD with the Stage 5 findings, then task-002 saves the baseline and task-003 writes CommandReferenceTest red.'
  criteria:
    - 'A generated block of every command usage in the manual, compared by a test, with the section pinned by the node suite'
    - 'Every archicode line and option of the Commands part names something the program has, and the stale listing is fixed'
    - 'The unit tests, node tests, format, lint and PMD pass, the Asciidoctor warnings are not more than before, and the program is unchanged'
```
