---
title: Execution Plan — Saved marker on query views and declared stdout change in the harness
status: done
date: 2026-11-04
related:
  - docs/wav/wav-031-graph-answers-impact/run/run-0219-views-saved-marker-and-stdout-harness/tdd-0219-views-saved-marker-and-stdout-harness.md
  - docs/wav/wav-031-graph-answers-impact/wav-031-graph-answers-impact.md
  - docs/wav/wav-031-graph-answers-impact/wbc-031-graph-answers-impact.md
  - src/main/java/io/morin/archicode/cli/GetViewsQuery.java
  - scripts/byte-identity.sh
  - https://github.com/tmorin/archicode/issues/184
type: pln
run: 0219
wave: 031
---

# Execution Plan: Saved marker on query views and declared stdout change in the harness

Profile TDD+pln: there is no PRD, so REQ-1 to REQ-7 are the IDs the TDD labels (section "PRD Traceability"), taken from row W-1 and gate P1 of the wave manifest and from #184. The plan follows the TDD plus the Stage 5 review findings (progress log, Stage 5 line: eight findings, one S3, four S2, three S1), which the TDD has not absorbed: task-001 amends the TDD with them before any test is written. Where the TDD and a finding differ, the finding wins; the one that matters most is that the sed rule of DEC-3 must be anchored on exactly two spaces of indentation (an entry key of the YAML list), not on `[[:space:]-]*`, so a `saved:` key nested in the `properties` of a view is never removed.

Two chains run on disjoint files. The Java chain is test first: task-002 writes the new cases and moves `ArchitectureModelTest` red, task-003 writes the marker in `GetViewsQuery` and turns them green, task-004 moves the goldens and whole-output assertions that the full suite then shows. The harness chain, task-005, edits `scripts/byte-identity.sh` and adds `scripts/byte-identity-stdout-changes.txt`; it needs nothing from the Java chain until its real run in task-007. The manual and the notes of `src/test/CLAUDE.md` (task-006) follow both. The last task runs every gate and writes the run record.

This run operates under the autonomy override of `complete-run` (read before Stage 10): no task stops for a human on its category alone. No task is `human_required` or `critical`, so the override changes no route; the one output-changing task (task-003) is `review_after` and the author reviews it at the pull request. Nothing in this plan commits, pushes, merges or tags: those are human steps outside the plan; the TDD says one commit with the goldens and the declaration, which the main agent makes after the gates.

## 1. Executive Summary

```yaml
summary:
  status: 'pending'
  product_goal: 'Every entry of archicode query views says whether it is a saved view or one the tool derives (saved: true or false), and the byte-identity harness can accept a declared change of standard output, so wave 031 can change outputs on purpose (#184).'
  technical_approach: 'Amend the TDD with the Stage 5 findings, write the cases red, build the entries with the marker in GetViewsQuery from the two lists before -q (no field on View, two lists never merged through View equality, saved as the last sort tie-break), move the goldens the suite shows, add scripts/byte-identity-stdout-changes.txt and the stdout_accepted function with a self-check to the harness, write the manual (Query views bullet, upgrade block, harness notes), then run the gates including the full byte-identity run against archicode-0.19.0.'
  total_tasks: 7
  parallel_groups: 1
  high_risk_tasks: 0
  human_review_gates: 1
  autonomy_level: 'medium'
  recommendation: 'proceed_with_review'
  criteria:
    - 'query views on docs/architecture prints saved on every entry, true on exactly the 5 saved views, and -q $[?(@.saved==true)] prints only those 5; the same on src/doc/examples/domain_workspace and on a workspace made by archicode init; a test covers a saved view named like a derived id with both entries kept (REQ-1, REQ-2)'
    - 'scripts/byte-identity.sh exits 0, lists the query views pairs as accepted by a declared change of standard output, reports nothing as DIFFERENT, and its self-check says ok after showing an undeclared change reported and a declared one accepted (REQ-3, REQ-7)'
    - 'grep -c has("name") on ArchitectureModelTest prints 0 and ./mvnw test exits 0 (REQ-4)'
    - 'The manual says saved in Query views and has an upgrade block, and ./mvnw test -Dtest=ManualExamplesTest exits 0 (REQ-5)'
    - 'No field on View, the sort order of existing entries unchanged, goldens moved in the same working tree (REQ-6)'
    - 'mvnw test-compile pmd:check, npm run format:check, npm run lint and npm run test:unit exit 0, and npm run sample:build leaves git status --short unchanged (CON-3)'
```

## 2. PRD/TDD Consistency Assessment

```yaml
consistency_assessment:
  aligned_items:
    - 'Scope, REQ-1 to REQ-7, DEC-1 to DEC-7, CTR-1, CTR-2 and IMP-1 to IMP-7 agree with row W-1 and gate P1 of the wave manifest; every task below traces to them'
    - 'Q-1 of the TDD is resolved (keep archicode-0.19.0 as the harness base); no open question remains'
    - 'The current state quoted by the TDD (GetViewsQuery with VIEW_ORDER and one HashSet, ArchitectureModelTest line 91 with has("name"), the harness with exceptions and new-files lists, the manual block upgrade-0-23, version 0.25.0-SNAPSHOT) matches the files read at planning time'
  gaps:
    - id: gap-001
      type: contradiction
      description: 'Stage 5 (S3): the sed expression of DEC-3, /^[[:space:]-]*saved: (true|false)$/d, also deletes a saved: line nested at any depth (a key inside the properties of a view) and a list item line. The YAML writer puts the entry keys at two spaces under a list dash, so the rule must be anchored on exactly two spaces.'
      impact: 'high'
      recommendation: 'task-001 rewrites the first rule of DEC-3 and CTR-2 and RISK-2 with the anchored form /^  saved: (true|false)$/d, fixed against the YAML the command writes (task-005 checks it on a real output); the label regex is matched on the full label as the script prints it.'
    - id: gap-002
      type: ambiguity
      description: 'Stage 5 (S2): the label regex ": query views( --plateau .+)?$" is said to be matched on the label without the leading path, which the script does not build; the matching must be on the full label.'
      impact: 'medium'
      recommendation: 'task-001 states that the regex is matched on the full label (grep -E on the whole label) and writes the rule with a leading anchor-free pattern; task-005 follows that.'
    - id: gap-003
      type: ambiguity
      description: 'Stage 5 (S2): sortViews must keep its signature (a List<View> in, a List<View> out) for its callers; the tie-break on saved needs the entries, so the sort is done on entries and sortViews is not changed.'
      impact: 'medium'
      recommendation: 'task-001 words DEC-2 and IMP-1 that way; task-003 greps its callers before editing and keeps the signature.'
    - id: gap-004
      type: ambiguity
      description: 'Stage 5 (S2 and S1): IMP-5 does not name the tests that need no change, so a reader cannot tell a missed golden from an untouched one; the self-check cases of DEC-5 do not say which files they write under a temporary folder.'
      impact: 'low'
      recommendation: 'task-001 lists in IMP-5 the tests found by a grep of the repository for query views that read a field and not a whole output (they need no change), and task-004 starts from that list.'
    - id: gap-005
      type: risk
      description: 'The TDD says the wave names about 31 call sites that read a whole query views output; the number is not checked here and only the suite shows the real ones.'
      impact: 'medium'
      recommendation: 'task-004 is driven by failures of ./mvnw test and ./mvnw verify -DskipITs=false and fixes each; it does not guess. If the integration run cannot run here (no packaged jar), task-007 records it as not verified.'
    - id: gap-006
      type: risk
      description: 'The full byte-identity run builds archicode-0.19.0 with a JDK 25 offline and takes several minutes (RISK-4); the self-check only proves the comparison on hand-made pairs, not the sed expression on real YAML.'
      impact: 'medium'
      recommendation: 'task-005 runs the script with --only domain_workspace for a quick real check; task-007 runs the whole script once. If the offline base build fails for a reason the plan cannot change, task-007 records the exit and its output as not verified and does not report the REQ-3 criterion as met.'
    - id: gap-007
      type: ambiguity
      description: 'The version in the title of the upgrade block (upgrade-0-24 in the TDD) depends on the pom version at write time (0.25.0-SNAPSHOT today, so the next release is 0.25.0 and the anchor follows the convention of the previous blocks).'
      impact: 'low'
      recommendation: 'The convention is read on upgrade-0-23: the anchor and the title name the release the reader knows, and the text says the changes are in the next one. With the pom at 0.25.0-SNAPSHOT and 0.24.0 released, task-006 writes [[upgrade-0-24]] (What changes for a reader who knows 0.24.0, changes in the release 0.25.0), above upgrade-0-23, as the TDD DEC-6 says; it records the choice in its output.'
    - id: gap-008
      type: ambiguity
      description: 'Stage 9: the harness script cannot be sourced (its top level builds the two jars and runs every workspace), so the verification of task-005 that sources stdout_accepted could not run as written; and the real YAML proof of the rule needs a jar built after task-003, which task-005 does not have when it runs in parallel with task-002.'
      impact: 'medium'
      recommendation: 'task-005 extracts the function text into a scratch file for its hand-made cases, reads the two-space indentation from the YAML written today, and runs the script with --no-build for the self-check; task-007 proves the rule on the real YAML with the rebuilt jar.'
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
        - 'tdd-0219-views-saved-marker-and-stdout-harness.md amended'
      agent_role: 'Architecture Agent'
      autonomy: 'autonomous'
      risk: 'low'
      confidence: 82
    - id: task-002
      status: 'done'
      title: 'Write the cases of the marker and move ArchitectureModelTest, red'
      depends_on: [task-001]
      produces:
        - 'src/test/java/io/morin/archicode/cli/GetViewsQueryTest.java'
        - 'src/test/java/io/morin/archicode/doc/ArchitectureModelTest.java'
      agent_role: 'Test Generation Agent'
      autonomy: 'autonomous'
      risk: 'medium'
      confidence: 74
    - id: task-003
      status: 'done'
      title: 'Build the entries with saved in GetViewsQuery and turn the cases green'
      depends_on: [task-002]
      produces:
        - 'src/main/java/io/morin/archicode/cli/GetViewsQuery.java'
      agent_role: 'Backend Implementation Agent'
      autonomy: 'review_after'
      risk: 'medium'
      confidence: 78
    - id: task-004
      status: 'done'
      title: 'Move the goldens and whole-output assertions the suite shows'
      depends_on: [task-003]
      produces:
        - 'tests and goldens that read a whole query views output, moved'
      agent_role: 'Test Generation Agent'
      autonomy: 'autonomous'
      risk: 'medium'
      confidence: 70
    - id: task-005
      status: 'done'
      title: 'Teach the harness a declared change of standard output, with its self-check'
      depends_on: [task-001]
      produces:
        - 'scripts/byte-identity.sh'
        - 'scripts/byte-identity-stdout-changes.txt'
      agent_role: 'Infrastructure Agent'
      autonomy: 'autonomous'
      risk: 'medium'
      confidence: 72
    - id: task-006
      status: 'done'
      title: 'Write the manual (Query views, upgrade block) and the harness notes'
      depends_on: [task-003, task-005]
      produces:
        - 'src/doc/README.adoc'
        - 'src/test/CLAUDE.md'
      agent_role: 'Documentation Agent'
      autonomy: 'autonomous'
      risk: 'low'
      confidence: 84
    - id: task-007
      status: 'done'
      title: 'Run the gates, the full byte-identity run, and write the run record'
      depends_on: [task-004, task-005, task-006]
      produces:
        - 'run-0219-views-saved-marker-and-stdout-harness.md with the verification'
        - 'prg-0219-views-saved-marker-and-stdout-harness.md Findings with the gate output'
      agent_role: 'QA Agent'
      autonomy: 'autonomous'
      risk: 'low'
      confidence: 78
  edges:
    - from: task-001
      to: task-002
      reason: 'the cases are written against the amended TDD (entries sorted by view then saved, sortViews unchanged)'
    - from: task-002
      to: task-003
      reason: 'the command is written to turn the red cases green'
    - from: task-003
      to: task-004
      reason: 'the failing goldens only exist once the command prints the marker'
    - from: task-001
      to: task-005
      reason: 'the rule is written with the anchored sed expression and the full-label match of the amended TDD'
    - from: task-003
      to: task-006
      reason: 'the manual describes the command as it prints'
    - from: task-005
      to: task-006
      reason: 'the harness notes describe the file and function as written'
    - from: task-004
      to: task-007
      reason: 'the gates run on every changed file'
    - from: task-005
      to: task-007
      reason: 'the full byte-identity run needs the harness and the command together'
    - from: task-006
      to: task-007
      reason: 'ManualExamplesTest runs on the manual as written'
```

## 4. Task Catalog

```yaml
task_catalog:
  tasks:
    - id: task-001
      title: 'Amend the TDD with the Stage 5 findings'
      source_requirements:
        prd:
          - 'REQ-3'
          - 'REQ-6'
        tdd:
          - 'DEC-2'
          - 'DEC-3'
          - 'DEC-5'
          - 'CTR-2'
          - 'IMP-1'
          - 'IMP-5'
          - 'RISK-2'
          - 'Review'
      outputs:
        - 'DEC-3, CTR-2 and RISK-2 use the sed expression /^  saved: (true|false)$/d (two spaces, no dash, no deeper indentation) and say the label regex is matched on the full label (gap-001, gap-002)'
        - 'DEC-2 and IMP-1 say the sort is done on entries (view, saved) and sortViews keeps its signature (gap-003)'
        - 'IMP-5 lists the tests that read a field of query views and need no change (gap-004)'
        - 'The Review section says the findings are applied and the TDD status is review-ready'
      verification:
        - 'grep -c "\[\[:space:\]-\]\*saved" on the TDD prints 0'
        - 'grep -q "\^  saved" on the TDD succeeds'
        - 'grep -q "keeps its signature" on the TDD succeeds'
        - 'git diff --stat -- src scripts pom.xml package.json prints nothing'
      risk: 'low'
      confidence: 82
      human_review: 'none'
      escalation_triggers:
        - 'A finding contradicts the repository when read (follow the repository, write the reading in the Findings of the prg)'
      delegation_tier: 'standard'
      results: 'tier standard, model sonnet, effort medium, profile low-cost, passed first time, inline (leaf), independently verified'
    - id: task-002
      title: 'Write the cases of the marker and move ArchitectureModelTest, red'
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
          - 'IMP-2'
          - 'IMP-4'
          - 'ASM-4'
          - 'ASM-5'
      outputs:
        - 'New cases in GetViewsQueryTest (through CliHarness as SortedQueryOutputTest does): saved on every entry in JSON, YAML, TOML and a custom template; -q $[?(@.saved==true)] keeps only saved entries; docs/architecture has 5 saved; src/doc/examples/domain_workspace and a workspace made by the init command have the right counts; a saved view with the id, layer and viewpoint of a derived one (element shop, saved view shop of viewpoint overview, no name) gives two entries, one true and one false; a derived and a saved view without properties get saved as the last key'
        - 'ArchitectureModelTest.shouldListFourOrFiveSavedViews counts view.get("saved").asBoolean(), asserts exactly 5, and the comment about names goes, with no has("name") left in the file'
        - 'Synthetic scratch workspaces only (CON-6)'
      verification:
        - './mvnw -o test-compile exits 0 (JAVA_HOME from sdkman 25)'
        - './mvnw -o test -Dtest=GetViewsQueryTest,ArchitectureModelTest exits non-zero and the failures are the new marker assertions (the red state: task-003 turns them green)'
        - 'grep -c "has(\"name\")" src/test/java/io/morin/archicode/doc/ArchitectureModelTest.java prints 0'
        - 'git diff --stat -- src/main scripts docs/architecture prints nothing'
      risk: 'medium'
      confidence: 74
      human_review: 'none'
      escalation_triggers:
        - 'The init command cannot be run from a test without changing the harness of the tests (build the workspace by the same code path the command uses and note it)'
        - 'A case needs a change to production code to be written (stop and log it)'
      delegation_tier: 'standard'
      results: 'tier standard, model sonnet, effort medium, profile low-cost, passed first time, inline (leaf), independently verified'
    - id: task-003
      title: 'Build the entries with saved in GetViewsQuery and turn the cases green'
      source_requirements:
        prd:
          - 'REQ-1'
          - 'REQ-2'
          - 'REQ-6'
        tdd:
          - 'DEC-1'
          - 'DEC-2'
          - 'DEC-4'
          - 'CTR-1'
          - 'FLOW-1'
          - 'IF-1'
          - 'IMP-1'
      outputs:
        - 'GetViewsQuery maps workspace.getViews() to ObjectNode entries with saved true and the derived views of both layers to entries with saved false, the two lists mapped separately and concatenated (never through View equality), saved put last, sorted by VIEW_ORDER then saved (saved first), serialized to the JSON array that -q and every format read'
        - 'No field on View, sortViews keeps its signature, the error paths and the other options unchanged'
        - 'Lombok and field-injection conventions of the package kept, no NOPMD'
      verification:
        - './mvnw -o test -Dtest=GetViewsQueryTest,ArchitectureModelTest,SortedQueryOutputTest exits 0'
        - './mvnw -o test-compile pmd:check exits 0'
        - 'git diff --stat -- src/main shows only GetViewsQuery.java and nothing under scripts or pom.xml'
      risk: 'medium'
      confidence: 78
      human_review: 'after'
      escalation_triggers:
        - 'SortedQueryOutputTest or a sort-order assertion moves for an existing workspace (the tie-break must not move any existing order: stop and log it)'
        - 'The unfiltered order of docs/architecture changes'
      delegation_tier: 'standard'
      results: 'tier standard, model sonnet, effort medium, profile low-cost, passed first time, inline (leaf), independently verified'
    - id: task-004
      title: 'Move the goldens and whole-output assertions the suite shows'
      source_requirements:
        prd:
          - 'REQ-6'
        tdd:
          - 'IMP-5'
          - 'RISK-1'
      outputs:
        - 'Each test or golden that compares a whole query views output moved to include the saved key, found by running the suite and fixing failures (BrightcartStableOutputTest, ViewsAndQueriesIT, a golden under src/test/resources, site.test.js only if it fails)'
        - 'No assertion weakened: a moved expectation is the new exact output'
        - 'reflect-config.json names io.morin.archicode.cli.GetViewsQuery$Entry (the record task-003 added; NativeReflectionConfigTest fails without it)'
      verification:
        - './mvnw -o test exits 0'
        - './mvnw -o verify -DskipITs=false exits 0 (if the packaged-jar run cannot run here, record the reason; do not report it as passed)'
        - 'npm run test:unit exits 0'
        - 'git diff --stat -- src/main scripts docs/architecture prints nothing new beyond task-003, except the one entry for the record GetViewsQuery$Entry in src/main/resources/META-INF/native-image/io.morin.archicode/archicode/reflect-config.json'
      risk: 'medium'
      confidence: 70
      human_review: 'none'
      escalation_triggers:
        - 'A failing test is not about the marker (log it as a finding, do not edit it)'
        - 'More than a handful of unrelated suites fail on the starting repository (record that the base is already red and do not ask for it to pass)'
      delegation_tier: 'standard'
      results: 'tier standard, model sonnet, effort medium, profile low-cost, passed first time, inline (leaf), independently verified'
    - id: task-005
      title: 'Teach the harness a declared change of standard output, with its self-check'
      source_requirements:
        prd:
          - 'REQ-3'
          - 'REQ-7'
        tdd:
          - 'DEC-3'
          - 'DEC-5'
          - 'CTR-2'
          - 'IF-2'
          - 'FLOW-2'
          - 'IMP-3'
      outputs:
        - 'scripts/byte-identity-stdout-changes.txt: UTF-8, a comment naming the run above the rule, one rule LABEL_REGEX TAB SED_SCRIPT with the anchored expression of gap-001'
        - 'scripts/byte-identity.sh: --stdout-changes FILE option (default the new file), function stdout_accepted base_out new_out rules label (accepted only when some rule whose regex matches the full label gives, through sed -E on the new normalized output, the base normalized output byte for byte), a branch in compare that requires equal exit code, error output and written files, the report line ACCEPTED label (declared change of standard output), the usage header, the summary line counting it'
        - 'The self-check of DEC-5, four cases (declared pair accepted; same pair with an empty rules file reported; a pair that adds the line and changes another reported with the real rules; the same pair under a label no rule matches reported), failures setting SELF_FAIL with SELF-CHECK FAILED'
        - 'Bash 3.2 compatible, no GNU sed extension'
      verification:
        - 'bash -n scripts/byte-identity.sh exits 0'
        - 'grep -c "stdout_accepted" scripts/byte-identity.sh prints at least 2'
        - 'the script cannot be sourced (its top level builds jars and runs the workspaces), so the function text is extracted into a scratch file (sed -n "/^stdout_accepted()/,/^}/p" scripts/byte-identity.sh) and called on hand-made files in the scratch folder: it accepts the declared pair and reports the three others (the four self-check cases), shown in the task output'
        - 'scripts/byte-identity.sh --only domain_workspace --no-build exits 0 and prints self-check: ok (the base jar is cached in ~/.cache/archicode-byte-identity/archicode-0.19.0; target/quarkus-app is not rebuilt, so the new output has no marker yet and the real YAML proof of the rule is run by task-007 with a jar built after task-003); the indentation of an entry key is read now from the YAML the command writes (query views -w src/doc/examples/domain_workspace/.archicode.yaml: keys at two spaces under the dash)'
        - 'git diff --stat -- src pom.xml package.json prints nothing'
      risk: 'medium'
      confidence: 72
      human_review: 'none'
      escalation_triggers:
        - 'The real YAML puts the saved key at another indentation than two spaces (stop, fix the expression to the output, log it in the Findings)'
        - 'The offline base build of archicode-0.19.0 fails (log it; task-007 records it as not verified)'
        - 'The mechanism proves too heavy: apply DEC-7 (fall back to a --saved filter option alone) only after logging why and telling the main agent'
      delegation_tier: 'standard'
      results: 'tier standard, model sonnet, effort medium, profile low-cost, passed first time, inline (leaf), independently verified'
    - id: task-006
      title: 'Write the manual (Query views, upgrade block) and the harness notes'
      source_requirements:
        prd:
          - 'REQ-3'
          - 'REQ-5'
        tdd:
          - 'DEC-6'
          - 'IMP-6'
          - 'IMP-7'
          - 'CON-7'
      outputs:
        - 'src/doc/README.adoc: a bullet Saved or derived in === Query views (what saved is, that it is in every format and before -q, the example $[?(@.saved==true)]), and an upgrade block for the next release in the convention of upgrade-0-23 (query views prints one more key on every entry, a script that read a whole entry sees saved, every other command writes what the previous release wrote)'
        - 'src/test/CLAUDE.md: the byte-identity section describes the stdout-changes file, its rule format and the self-check, in present tense with no wave, run or issue id'
        - 'No other bullet of either file changed'
      verification:
        - './mvnw -o test -Dtest=ManualExamplesTest exits 0'
        - 'node --test src/test/javascript/manual-howto.test.js exits 0 (skip and say so if the file does not exist)'
        - 'grep -c "saved" on the Query views section of the manual is at least 1'
        - 'grep -Ec "wav-0|run-0|#184" src/test/CLAUDE.md does not increase compared with the starting file'
      risk: 'low'
      confidence: 84
      human_review: 'none'
      escalation_triggers:
        - 'An example block with -q fails on the manual workspace (fix the example, not the test)'
      delegation_tier: 'standard'
      results: 'tier standard, model sonnet, effort medium, profile low-cost, passed first time, inline (leaf), independently verified'
    - id: task-007
      title: 'Run the gates, the full byte-identity run, and write the run record'
      source_requirements:
        prd:
          - 'REQ-1'
          - 'REQ-2'
          - 'REQ-3'
          - 'REQ-4'
          - 'REQ-5'
          - 'REQ-7'
        tdd:
          - 'Observability and Verification'
          - 'Deployment and Rollout'
      outputs:
        - 'The output of each gate and of the three manual runs of REQ-1 and REQ-2 (5 saved on docs/architecture, the counts on domain_workspace and on an init workspace), copied into the run record'
        - 'The report of scripts/byte-identity.sh: the accepted pairs for query views, none DIFFERENT, the self-check line, or, if the base build fails, the exact failure marked not verified'
        - 'The run record lists what is not verified: the harness on macOS, the native image'
      verification:
        - './mvnw -o test exits 0 and ./mvnw -o test-compile pmd:check exits 0'
        - 'npm run format:check, npm run lint and npm run test:unit exit 0'
        - 'scripts/byte-identity.sh exits 0 (several minutes on a first run)'
        - 'npm run sample:build then git status --short shows no change under samples/ or docs/architecture'
        - 'grep -c "has(\"name\")" src/test/java/io/morin/archicode/doc/ArchitectureModelTest.java prints 0'
      risk: 'low'
      confidence: 78
      human_review: 'none'
      escalation_triggers:
        - 'A gate fails for a reason the earlier tasks introduced (hand back to that task as a finding; do not edit its files here)'
        - 'The byte-identity run reports a DIFFERENT outside query views (a real regression: stop and log it)'
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
      reason: 'task-002 (Java tests) and task-005 (harness script and rules file) touch disjoint paths and both depend only on task-001'
      conflict_risks:
        - 'Both read the TDD amended by task-001 and neither edits it'
        - 'The shared working tree: task-005 must not run the full Maven suite while task-002 leaves it red'
```

## 6. Human Review Gates

```yaml
human_review_gates:
  gates:
    - id: gate-001
      trigger: 'The output of query views changes on every shipped workspace (a documented, declared change)'
      required_before: []
      required_after: ['task-003']
      reviewer_focus:
        - 'saved is the last key and the order of existing entries is unchanged'
        - 'the sed rule recovers the base output and nothing more'
        - 'the upgrade block tells the change once'
```

## 7. Risk Assessment

```yaml
risk_assessment:
  by_task:
    - id: task-001
      risk: 'low'
      rationale: 'document edit only'
    - id: task-002
      risk: 'medium'
      rationale: 'tests that must be red for the right reason; the init workspace case may need a helper'
    - id: task-003
      risk: 'medium'
      rationale: 'changes the output of a public command on every workspace; sort order must not move'
    - id: task-004
      risk: 'medium'
      rationale: 'the number of affected goldens is known only by running the suite'
    - id: task-005
      risk: 'medium'
      rationale: 'a harness that accepts too much would hide regressions; the anchored expression and the self-check limit it'
    - id: task-006
      risk: 'low'
      rationale: 'documentation, checked by the manual example test'
    - id: task-007
      risk: 'low'
      rationale: 'verification only; the base build is slow and offline'
  by_area:
    - area: 'api'
      risk: 'medium'
      rationale: 'one more key on every entry of query views (told in the notes of the release)'
    - area: 'infra'
      risk: 'medium'
      rationale: 'the byte-identity harness gains a way to accept a changed output; W-2 reuses it'
    - area: 'docs'
      risk: 'low'
      rationale: 'manual and CLAUDE.md notes'
```

## 8. Confidence Assessment

```yaml
confidence_assessment:
  by_task:
    - id: task-001
      score: 82
      rationale: 'findings are listed in the prg and checkable by grep'
    - id: task-002
      score: 74
      rationale: 'the init workspace case and the red-for-the-right-reason check are the uncertain parts'
    - id: task-003
      score: 78
      rationale: 'a small change in one class with a precise contract'
    - id: task-004
      score: 70
      rationale: 'the set of affected tests is found only by running the suite'
    - id: task-005
      score: 72
      rationale: 'Bash 3.2 and the real YAML indentation are checked only on Linux'
    - id: task-006
      score: 84
      rationale: 'the manual example test guards the blocks'
    - id: task-007
      score: 78
      rationale: 'depends on the offline build of the base jar'
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
          - 'No PRD; REQ-3 and REQ-6 of the TDD'
        tdd_excerpts:
          - 'DEC-2, DEC-3, DEC-5, CTR-2, IMP-1, IMP-5, RISK-2, Review'
      likely_files:
        - 'docs/wav/wav-031-graph-answers-impact/run/run-0219-views-saved-marker-and-stdout-harness/tdd-0219-views-saved-marker-and-stdout-harness.md'
      acceptance_criteria:
        - 'the anchored sed expression, the full-label match, sortViews unchanged and the IMP-5 list are in the TDD'
      verification:
        - 'grep -c "\[\[:space:\]-\]\*saved" on the TDD prints 0'
        - 'grep -q "\^  saved" on the TDD succeeds'
        - 'grep -q "keeps its signature" on the TDD succeeds'
        - 'git diff --stat -- src scripts pom.xml package.json prints nothing'
      escalation_triggers:
        - 'a finding contradicts the repository'
      suggested_subagent_type: 'general-purpose'
      suggested_model: '(default)'
      suggested_effort: 'medium'
    - task_id: task-002
      agent_role: 'Test Generation Agent'
      objective: 'Write the marker cases red and move ArchitectureModelTest'
      context:
        prd_excerpts:
          - 'REQ-1, REQ-2, REQ-4 of the TDD'
        tdd_excerpts:
          - 'DEC-1, DEC-2, DEC-4, CTR-1, IMP-2, IMP-4'
      likely_files:
        - 'src/test/java/io/morin/archicode/cli/GetViewsQueryTest.java'
        - 'src/test/java/io/morin/archicode/doc/ArchitectureModelTest.java'
      acceptance_criteria:
        - 'cases fail only on the missing marker; no has("name") in ArchitectureModelTest'
      verification:
        - './mvnw -o test-compile exits 0 (JAVA_HOME from sdkman 25)'
        - './mvnw -o test -Dtest=GetViewsQueryTest,ArchitectureModelTest exits non-zero and the failures are the new marker assertions (the red state: task-003 turns them green)'
        - 'grep -c "has(\"name\")" src/test/java/io/morin/archicode/doc/ArchitectureModelTest.java prints 0'
        - 'git diff --stat -- src/main scripts docs/architecture prints nothing'
      escalation_triggers:
        - 'a case needs production code'
      suggested_subagent_type: 'general-purpose'
      suggested_model: '(default)'
      suggested_effort: 'medium'
    - task_id: task-003
      agent_role: 'Backend Implementation Agent'
      objective: 'Add the saved marker in GetViewsQuery'
      context:
        prd_excerpts:
          - 'REQ-1, REQ-2, REQ-6 of the TDD'
        tdd_excerpts:
          - 'DEC-1, DEC-2, DEC-4, FLOW-1, IF-1'
      likely_files:
        - 'src/main/java/io/morin/archicode/cli/GetViewsQuery.java'
      acceptance_criteria:
        - 'the cases of task-002 are green and existing order is unchanged'
      verification:
        - './mvnw -o test -Dtest=GetViewsQueryTest,ArchitectureModelTest,SortedQueryOutputTest exits 0'
        - './mvnw -o test-compile pmd:check exits 0'
        - 'git diff --stat -- src/main shows only GetViewsQuery.java and nothing under scripts or pom.xml'
      escalation_triggers:
        - 'an existing order moves'
      suggested_subagent_type: 'general-purpose'
      suggested_model: '(default)'
      suggested_effort: 'medium'
    - task_id: task-004
      agent_role: 'Test Generation Agent'
      objective: 'Move the goldens and whole-output assertions that fail because of the marker'
      context:
        prd_excerpts:
          - 'REQ-6 of the TDD'
        tdd_excerpts:
          - 'IMP-5, RISK-1'
      likely_files:
        - 'src/test/java/io/morin/archicode/brightcart/BrightcartStableOutputTest.java'
        - 'src/test/java/io/morin/archicode/it/ViewsAndQueriesIT.java'
        - 'src/test/resources'
        - 'src/main/resources/META-INF/native-image/io.morin.archicode/archicode/reflect-config.json'
      acceptance_criteria:
        - 'the unit suite and the integration suite pass with exact new expectations'
      verification:
        - './mvnw -o test exits 0'
        - './mvnw -o verify -DskipITs=false exits 0 (if the packaged-jar run cannot run here, record the reason; do not report it as passed)'
        - 'npm run test:unit exits 0'
        - 'git diff --stat -- src/main scripts docs/architecture prints nothing new beyond task-003, except the one entry for the record GetViewsQuery$Entry in src/main/resources/META-INF/native-image/io.morin.archicode/archicode/reflect-config.json'
      escalation_triggers:
        - 'a failure is not about the marker'
      suggested_subagent_type: 'general-purpose'
      suggested_model: '(default)'
      suggested_effort: 'high'
    - task_id: task-005
      agent_role: 'Infrastructure Agent'
      objective: 'Add the declared-change mechanism and its self-check to the harness'
      context:
        prd_excerpts:
          - 'REQ-3, REQ-7 of the TDD'
        tdd_excerpts:
          - 'DEC-3, DEC-5, CTR-2, IF-2, FLOW-2, IMP-3'
      likely_files:
        - 'scripts/byte-identity.sh'
        - 'scripts/byte-identity-stdout-changes.txt'
      acceptance_criteria:
        - 'the four self-check cases behave as DEC-5 says and the script parses under Bash 3.2 syntax'
      verification:
        - 'bash -n scripts/byte-identity.sh exits 0'
        - 'grep -c "stdout_accepted" scripts/byte-identity.sh prints at least 2'
        - 'the script cannot be sourced (its top level builds jars and runs the workspaces), so the function text is extracted into a scratch file (sed -n "/^stdout_accepted()/,/^}/p" scripts/byte-identity.sh) and called on hand-made files in the scratch folder: it accepts the declared pair and reports the three others (the four self-check cases), shown in the task output'
        - 'scripts/byte-identity.sh --only domain_workspace --no-build exits 0 and prints self-check: ok (the base jar is cached in ~/.cache/archicode-byte-identity/archicode-0.19.0; target/quarkus-app is not rebuilt, so the new output has no marker yet and the real YAML proof of the rule is run by task-007 with a jar built after task-003); the indentation of an entry key is read now from the YAML the command writes (query views -w src/doc/examples/domain_workspace/.archicode.yaml: keys at two spaces under the dash)'
        - 'git diff --stat -- src pom.xml package.json prints nothing'
      escalation_triggers:
        - 'the real YAML indentation differs from two spaces'
      suggested_subagent_type: 'general-purpose'
      suggested_model: '(default)'
      suggested_effort: 'medium'
    - task_id: task-006
      agent_role: 'Documentation Agent'
      objective: 'Write the Query views bullet, the upgrade block and the harness notes'
      context:
        prd_excerpts:
          - 'REQ-5 of the TDD'
        tdd_excerpts:
          - 'DEC-6, IMP-6, IMP-7, CON-7'
      likely_files:
        - 'src/doc/README.adoc'
        - 'src/test/CLAUDE.md'
      acceptance_criteria:
        - 'ManualExamplesTest passes and CLAUDE.md carries no wave, run or issue id'
      verification:
        - './mvnw -o test -Dtest=ManualExamplesTest exits 0'
        - 'node --test src/test/javascript/manual-howto.test.js exits 0 (skip and say so if the file does not exist)'
        - 'grep -c "saved" on the Query views section of the manual is at least 1'
        - 'grep -Ec "wav-0|run-0|#184" src/test/CLAUDE.md does not increase compared with the starting file'
      escalation_triggers:
        - 'an example block fails on the manual workspace'
      suggested_subagent_type: 'general-purpose'
      suggested_model: '(default)'
      suggested_effort: 'low'
    - task_id: task-007
      agent_role: 'QA Agent'
      objective: 'Run every gate and the full byte-identity run, write the run record'
      context:
        prd_excerpts:
          - 'REQ-1 to REQ-5 and REQ-7 of the TDD'
        tdd_excerpts:
          - 'Observability and Verification'
      likely_files:
        - 'docs/wav/wav-031-graph-answers-impact/run/run-0219-views-saved-marker-and-stdout-harness/run-0219-views-saved-marker-and-stdout-harness.md'
        - 'docs/wav/wav-031-graph-answers-impact/run/run-0219-views-saved-marker-and-stdout-harness/prg-0219-views-saved-marker-and-stdout-harness.md'
      acceptance_criteria:
        - 'each gate output is in the record; anything not run is marked not verified'
      verification:
        - './mvnw -o test exits 0 and ./mvnw -o test-compile pmd:check exits 0'
        - 'npm run format:check, npm run lint and npm run test:unit exit 0'
        - 'scripts/byte-identity.sh exits 0 (several minutes on a first run)'
        - 'npm run sample:build then git status --short shows no change under samples/ or docs/architecture'
        - 'grep -c "has(\"name\")" src/test/java/io/morin/archicode/doc/ArchitectureModelTest.java prints 0'
      escalation_triggers:
        - 'a DEVIATION outside query views in the byte-identity report'
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
        - 'unit tests (red)'
      success_criteria:
        - 'the new cases fail on the missing marker only'
    - task_id: task-003
      methods:
        - 'unit tests'
        - 'PMD'
      success_criteria:
        - 'the cases are green, existing sort order unchanged, PMD clean'
    - task_id: task-004
      methods:
        - 'unit tests'
        - 'integration tests'
        - 'node tests'
      success_criteria:
        - 'the whole suite passes'
    - task_id: task-005
      methods:
        - 'bash syntax check'
        - 'self-check cases'
        - 'regression check on a real workspace'
      success_criteria:
        - 'the declared pair is accepted and the three others are reported'
    - task_id: task-006
      methods:
        - 'ManualExamplesTest'
      success_criteria:
        - 'the manual examples run and the notes carry no ids'
    - task_id: task-007
      methods:
        - 'unit tests'
        - 'static analysis'
        - 'format and lint'
        - 'regression check against archicode-0.19.0'
      success_criteria:
        - 'every gate exits 0, byte-identity exits 0 with query views accepted as declared'
```

## 11. Escalation Rules

```yaml
escalation_rules:
  rules:
    - condition: 'The run operates under the autonomy override of complete-run: a task flagged review_after or a gate is executed without a stop and logged'
      action: 'Log it in the prg and name it in the pull request for the author'
    - condition: 'The harness mechanism proves too heavy (DEC-7)'
      action: 'Log why, fall back to a --saved filter option alone, tell the main agent and comment on #184'
    - condition: 'The offline base build of archicode-0.19.0 fails'
      action: 'Record the failure as not verified; do not report the REQ-3 criterion as met'
    - condition: 'An existing sort order or a field other than saved changes in the output'
      action: 'Stop, log it as a finding, fix the command before moving goldens'
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
    - task-007
  parallel_groups:
    - parallel-group-001
  required_human_gates:
    - gate-001
  highest_risk_tasks:
    - task-003
    - task-005
  lowest_confidence_tasks:
    - task-004
    - task-005
  next_action: 'Run task-001, then task-002 and task-005 together.'
  criteria:
    - 'Every criterion of the Executive Summary is true'
```
