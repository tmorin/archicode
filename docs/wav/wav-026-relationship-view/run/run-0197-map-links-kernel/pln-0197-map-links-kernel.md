---
title: Execution Plan — Map links in the kernel and the command line
status: draft
date: 2026-10-28
related:
  - docs/wav/wav-026-relationship-view/run/run-0197-map-links-kernel/tdd-0197-map-links-kernel.md
  - 'gh:tmorin/archicode#143'
  - docs/wav/wav-026-relationship-view/wav-026-relationship-view.md
type: pln
run: 0197
wave: 026
---

# Execution Plan: Map links in the kernel and the command line

Profile TDD+pln: there is no PRD, so the requirement IDs REQ-1 to REQ-7 are the ones the TDD labels (section "PRD Traceability"), taken from #143 decision D11 and the wave plan (W-3, gate P2). The run operates under the autonomy override of complete-run: a task that would otherwise stop for a human is executed by an agent and the override is logged in the prg. No task below is `human_required`. The workflow never commits: every check below is a command or a file check on the working tree, and the commit of the kernel sources together with the regenerated `.wasm` and page block is a human step outside this plan (lesson of gate P1: the sources and the page are committed together).

## 1. Executive Summary

```yaml
summary:
  status: 'pending'
  product_goal: 'A Map view of the application layer takes a links property, a list of {source, destination, label} entries; the command line draws only those relationships, their ends and what encloses them, an entry that names nothing is one error line (exit 1) in a one-plateau workspace and a warning or a skip in a workspace with plateaus, and every Map and view written before the wave is drawn byte for byte as before (REQ-1 to REQ-7).'
  technical_approach: 'Apply the Stage 5 findings to the TDD, write the Rust and Java tests red first, add the optional links key to the kernel map (contract number 5 unchanged), regenerate the wasm and the page block with embed.sh, forward the key from KernelViewpointFactory and ViewInPlateau, then say it in the guide, its golden file, the manual and CLAUDE.md and run the gate P2 checks including scripts/byte-identity.sh.'
  total_tasks: 10
  parallel_groups: 2
  high_risk_tasks: 1
  human_review_gates: 0
  autonomy_level: 'high'
  recommendation: 'proceed'
  criteria:
    - 'A Rust test and a Java test draw a Map with links and assert the boxes and links: the ends of the selected relationships and their ancestors, nothing else.'
    - 'A links entry that names no relationship is one error line with exit 1 in a workspace without plateau and facet, with the sentence written in the run document as built; in a workspace with plateaus it is the warning or the skip of DEC-5 with exit 0.'
    - 'cargo test, cargo fmt --check, cargo clippy -D warnings and the kernel coverage floor pass; embed.sh --check agrees with the committed wasm and page block.'
    - 'The Java checks pass: test-compile pmd:check, verify and verify -DskipITs=false; GuideTest, GuideViewPropertiesTest, TechnologyMapTest and ViewpointKernelTest are green.'
    - 'npm run test:unit and npm run editor:check pass with the new wasm; expected-boxes.json is unchanged.'
    - 'scripts/byte-identity.sh reports no unexpected difference: every Map and view written before the wave is byte for byte as before; the kernel contract number is still 5.'
    - 'guide.md and golden.md carry links; the manual and CLAUDE.md describe it; no shipped example or fixture carries links.'
```

## 2. PRD/TDD Consistency Assessment

```yaml
consistency_assessment:
  aligned_items:
    - 'REQ-1 to REQ-7 are each covered by a DEC and an IMP of the TDD, and each IMP is carried by one task below.'
    - 'The wave plan W-3 gate (Rust and Java tests of boxes and links, error or warning for a name that matches nothing, byte-identity clean, guide and golden file, manual and CLAUDE.md) equals the TDD scope.'
    - 'Open questions Q-1 and Q-2 of the TDD were closed in Stage 6; none stays open.'
  gaps:
    - id: gap-001
      type: 'ambiguity'
      description: 'The Stage 5 review findings F-1 to F-7 (error sentences with or without backticks round the view id, a second implementation of the match in Java, facet removal indistinguishable from a typo, the closed box and the children of an opened box in DEC-4, the place in the sentence links[n], a vacuous Java byte-identity test, the order of the checks) are logged in the prg but not applied to the TDD.'
      impact: 'medium'
      recommendation: 'task-001 applies them to the TDD before any test is written: errors without backticks round the id and warnings with them, one case table for Java and Rust, F-3 resolved as recorded in DEC-6 and DEF-1 (the no-match sentence names the entry; W-5 owns a richer answer), DEC-4 stating each drawing case, links[n] defined as the place after the adapter filter, the Java byte-identity test reduced to one test that the key is not sent, the order of the kernel checks written.'
    - id: gap-002
      type: 'risk'
      description: 'Between this run and W-5 the editor draws a saved view that has links as the whole map and drops the key on save (ASM-3, RISK-2).'
      impact: 'low'
      recommendation: 'No shipped file carries links (DEC-9) and task-009 checks it by grep; the limit is recorded in the prg and the wave Findings, not in the manual.'
    - id: gap-003
      type: 'risk'
      description: 'The Java adapter KernelViewpointFactory is already long and may trip a PMD rule when mapLinks is added (RISK-5).'
      impact: 'low'
      recommendation: 'task-006 extracts a small helper class if a rule fires; no suppression or NOPMD is allowed.'
    - id: gap-004
      type: 'ambiguity'
      description: 'Stage 9 C scan: task-005 (Java tests) reads the case table src/test/javascript/viewpoint-kernel/map-links-cases.json that task-002 writes, but the graph gave task-005 no dependency on task-002, and the parallel group of the two said it "finishes after task-002 if it needs it", which a graph cannot express; the F-4 drawing cases of DEC-4 had no case in the task-002 list.'
      impact: 'medium'
      recommendation: 'Resolved in Stage 9: task-005 depends on task-001 and task-002 (edge added), the first parallel group is now task-003 and task-005 (Rust implementation and Java red tests, disjoint files), and task-002 lists a case for each sentence of DEC-4 (both ends in one closed box, the children of an opened box that no link reaches, a pinned element no link reaches).'
    - id: gap-005
      type: 'ambiguity'
      description: 'Stage 9 C scan: the check of task-009 "grep -rln links: src/main/resources ..." would list src/main/resources/editor-webapp/standalone.html and the guide, which hold the word for other reasons, so it could never print nothing.'
      impact: 'low'
      recommendation: 'Resolved in Stage 9: the check is a grep of YAML, TOML and JSON manifests for a line that starts with links:, over src.'
  blocking_gaps: []
```

## 3. Execution Graph

```yaml
execution_graph:
  nodes:
    - id: task-001
      status: 'done'
      title: 'Apply the Stage 5 findings F-1 to F-7 to the TDD'
      depends_on: []
      produces:
        - 'tdd-0197-map-links-kernel.md amended (DEC-1, DEC-4, DEC-5, DEC-6, DEC-8, Open Questions, Review pass line)'
      agent_role: 'Architecture Agent'
      autonomy: 'autonomous'
      risk: 'medium'
      confidence: 80
    - id: task-002
      status: 'done'
      title: 'Write the Rust tests of the map links, red'
      depends_on: [task-001]
      produces:
        - 'src/main/rust/viewpoint-kernel/src/lib_tests.rs with the links cases, failing before task-003'
        - 'src/test/javascript/viewpoint-kernel/map-links-cases.json, the case table both languages read'
      agent_role: 'Test Generation Agent'
      autonomy: 'autonomous'
      risk: 'medium'
      confidence: 80
    - id: task-003
      status: 'done'
      title: 'Implement links in the kernel map'
      depends_on: [task-002]
      produces:
        - 'src/main/rust/viewpoint-kernel/src/lib.rs (Input.links, LinkRef, the selection in fn map, dangling_in_lists, the header documentation)'
        - 'src/main/rust/viewpoint-kernel/README.md'
      agent_role: 'Backend Implementation Agent'
      autonomy: 'autonomous'
      risk: 'high'
      confidence: 70
    - id: task-004
      status: 'done'
      title: 'Regenerate the wasm and the page block'
      depends_on: [task-003]
      produces:
        - 'src/main/wasm/viewpoint_kernel.wasm'
        - 'src/main/resources/editor-webapp/standalone.html (the viewpoint-kernel-wasm block only)'
      agent_role: 'Infrastructure Agent'
      autonomy: 'autonomous'
      risk: 'medium'
      confidence: 80
    - id: task-005
      status: 'done'
      title: 'Write the Java tests of the map links, red'
      depends_on: [task-001, task-002]
      produces:
        - 'src/test/java/io/morin/archicode/viewpoint/kernel/MapLinksTest.java'
        - 'additions to GenerateStoriesTest and to the test of ViewInPlateau'
      agent_role: 'Test Generation Agent'
      autonomy: 'autonomous'
      risk: 'medium'
      confidence: 75
    - id: task-006
      status: 'pending'
      title: 'Forward links in KernelViewpointFactory and ViewInPlateau'
      depends_on: [task-004, task-005]
      produces:
        - 'src/main/java/io/morin/archicode/viewpoint/kernel/KernelViewpointFactory.java (mapLinks)'
        - 'src/main/java/io/morin/archicode/cli/ViewInPlateau.java'
      agent_role: 'Backend Implementation Agent'
      autonomy: 'autonomous'
      risk: 'medium'
      confidence: 75
    - id: task-007
      status: 'pending'
      title: 'Say links in the guide and its golden file'
      depends_on: [task-006]
      produces:
        - 'src/main/resources/guide/guide.md'
        - 'src/test/resources/guide/golden.md'
        - 'src/test/java/io/morin/archicode/cli/GuideViewPropertiesTest.java with a links case'
      agent_role: 'Documentation Agent'
      autonomy: 'autonomous'
      risk: 'low'
      confidence: 85
    - id: task-008
      status: 'pending'
      title: 'Say links in the manual and in CLAUDE.md'
      depends_on: [task-006]
      produces:
        - 'src/doc/README.adoc ([[map-viewpoint]] and the properties row)'
        - 'CLAUDE.md, one paragraph in Architecture'
      agent_role: 'Documentation Agent'
      autonomy: 'autonomous'
      risk: 'low'
      confidence: 80
    - id: task-009
      status: 'pending'
      title: 'Run the gate P2 checks'
      depends_on: [task-007, task-008]
      produces:
        - 'a record of each command and its result in the prg'
      agent_role: 'QA Agent'
      autonomy: 'autonomous'
      risk: 'medium'
      confidence: 80
    - id: task-010
      status: 'pending'
      title: 'Record the sentences and exit codes as built in the run document'
      depends_on: [task-009]
      produces:
        - 'run-0197-map-links-kernel.md with the sentences of DEC-1 and DEC-5, the exit codes and the limit of ASM-3'
      agent_role: 'Documentation Agent'
      autonomy: 'autonomous'
      risk: 'low'
      confidence: 90
  edges:
    - from: task-001
      to: task-002
      reason: 'the tests follow the amended design'
    - from: task-002
      to: task-003
      reason: 'the Rust tests are red first (TDD)'
    - from: task-003
      to: task-004
      reason: 'embed.sh compiles the Rust that task-003 wrote'
    - from: task-004
      to: task-006
      reason: 'the adapter runs the new wasm'
    - from: task-002
      to: task-005
      reason: 'the Java tests read the case table that task-002 writes'
    - from: task-005
      to: task-006
      reason: 'the Java tests are red first (TDD)'
```

## 4. Task Catalog

```yaml
task_catalog:
  tasks:
    - id: task-001
      title: 'Apply the Stage 5 findings F-1 to F-7 to the TDD'
      source_requirements:
        prd:
          - 'REQ-2'
          - 'REQ-4'
        tdd:
          - 'DEC-1, DEC-4, DEC-5, DEC-6, DEC-8'
          - 'prg-0197 Stage 5 line, findings F-1 to F-7'
      outputs:
        - 'DEC-1 and DEC-5 write the error sentences without backticks round the view id (the prefix of create is the view, its id, a colon) and keep the backticks in the warnings.'
        - 'DEC-6 says the Java existence test and the Rust match read one case table (src/test/javascript/viewpoint-kernel/map-links-cases.json) and records F-3: the no-match error names the entry, a facet that removes the relationship gives the same error, W-5 owns any richer answer (DEF-1 says so).'
        - 'DEC-4 states in one sentence each: the box of a closed element that holds both ends is not drawn unless pinned or reached by another link, the children of an opened box that no selected link reaches are not drawn, and the pinned elements and their visible inside are added to the ends.'
        - 'DEC-5 defines links[n] as the place in the list after the adapter filter, which equals the manifest place because the filter acts in plateau and facet workspaces only.'
        - 'DEC-8 reduces the Java byte-identity test to one test that the key is not sent for an empty list; DEC-6 gives the order of the kernel checks (technology refusal, shape, ends, match) and says a repeated entry is harmless and an empty source is dangling reference with nothing after it.'
        - 'CTR-3, IF-1, FLOW-1 and Open Questions Q-2 repeat the same sentences as DEC-1 and DEC-5 (no backticks round the id in an error, backticks in a warning); the Review pass line of the TDD says the findings are applied.'
      verification:
        - 'grep -c "F-3" docs/wav/wav-026-relationship-view/run/run-0197-map-links-kernel/tdd-0197-map-links-kernel.md prints at least 1, or the text of the decision names the facet case under DEC-6'
        - 'grep -n "map-links-cases.json" docs/wav/wav-026-relationship-view/run/run-0197-map-links-kernel/tdd-0197-map-links-kernel.md finds the case table in DEC-6 and DEC-8'
        - 'grep -n "the view `v`: `links" the TDD finds no sentence of an error with backticks round the id'
      risk: 'medium'
      confidence: 80
      results: 'tier standard, model sonnet, effort medium, profile low-cost, passed first time, inline (leaf), independently verified'
      human_review: 'none'
      escalation_triggers:
        - 'a finding cannot be applied without changing a decision of DEC-1 to DEC-3'
      delegation_tier: 'standard'
    - id: task-002
      title: 'Write the Rust tests of the map links, red'
      source_requirements:
        prd:
          - 'REQ-1'
          - 'REQ-3'
          - 'REQ-4'
          - 'REQ-5'
        tdd:
          - 'DEC-2, DEC-3, DEC-4, DEC-6, DEC-8'
          - 'CTR-1, FLOW-1'
      outputs:
        - 'src/test/javascript/viewpoint-kernel/map-links-cases.json: the cases (one link; two links sharing an end; an end inside a closed box; an opened box; hidden; pinned; two relationships of one triple differing by qualifiers; no label versus label; unknown end; empty source; no match; both ends of an entry inside one closed box (the link is skipped, the entry is matched, the box is drawn only when pinned or reached by another link); the children of an opened box that no selected link reaches (not drawn); a pinned element that no selected link reaches (drawn, with what is open inside it); repeated entry (harmless); order of the checks (technology refusal, shape, ends, match); technology layer refused; links empty and null equal to absent; a union with a removed relationship named), each with the workspace, the entries and the expected boxes, links or error sentence.'
        - 'src/main/rust/viewpoint-kernel/src/lib_tests.rs: the Rust tests that read the cases and assert the boxes and links or the sentence the kernel says.'
      verification:
        - 'cargo test --manifest-path src/main/rust/viewpoint-kernel/Cargo.toml fails on the new links tests and passes on every other test (the red run is recorded in the prg).'
        - 'cargo fmt --check --manifest-path src/main/rust/viewpoint-kernel/Cargo.toml passes.'
      risk: 'medium'
      confidence: 80
      results: 'tier standard, model sonnet, effort medium, profile low-cost, passed first time, inline (leaf), independently verified'
      human_review: 'none'
      escalation_triggers:
        - 'the case table cannot be read from lib_tests.rs without a new dependency'
        - 'an existing kernel test fails before the kernel change'
      delegation_tier: 'standard'
    - id: task-003
      title: 'Implement links in the kernel map'
      source_requirements:
        prd:
          - 'REQ-1'
          - 'REQ-4'
          - 'REQ-5'
          - 'REQ-7'
        tdd:
          - 'DEC-1 to DEC-6'
          - 'CTR-1, IMP-1, CON-1, CON-2, RISK-1'
      outputs:
        - 'lib.rs: Input.links as an optional list of LinkRef with source, destination and an optional label and unknown keys refused; fn map checks the ends with require after pinned, opened and hidden, matches each entry against the relationships of its source with the label normalised as compare does, keeps the matched relationships through hidden and pinned, and lists as boxes the ends, the pinned elements with what is open inside them, and the ancestors of all of these; the None, null and empty paths are the code that exists; layer technology with links is an error; dangling_in_lists also lists the unknown ends.'
        - 'The header documentation of lib.rs and README.md say links is additive and the contract number is 5.'
      verification:
        - 'cargo test --manifest-path src/main/rust/viewpoint-kernel/Cargo.toml passes, including the tests of task-002 that were red.'
        - 'cargo clippy --all-targets --manifest-path src/main/rust/viewpoint-kernel/Cargo.toml -- -D warnings passes and cargo fmt --check passes.'
        - 'cd src/main/rust/viewpoint-kernel && cargo llvm-cov --ignore-filename-regex '_tests\.rs$' --fail-under-lines 90 passes.'
        - 'grep -n "CONTRACT\|contract" src/main/rust/viewpoint-kernel/src/lib.rs shows the number still 5.'
      risk: 'high'
      confidence: 70
      results: 'tier standard, model sonnet, effort medium, profile low-cost, passed first time, inline (leaf), independently verified'
      human_review: 'after'
      escalation_triggers:
        - 'a test of an existing map (any viewpoint) changes its expected value'
        - 'the None path of fn map needs a change beyond reading the new key'
        - 'the kernel coverage falls below 90 percent'
      delegation_tier: 'standard'
    - id: task-004
      title: 'Regenerate the wasm and the page block'
      source_requirements:
        prd:
          - 'REQ-5'
        tdd:
          - 'IMP-2, CON-3, ASM-4'
      outputs:
        - 'src/main/wasm/viewpoint_kernel.wasm and the block viewpoint-kernel-wasm of src/main/resources/editor-webapp/standalone.html, written by embed.sh and nothing else of the page.'
      verification:
        - 'src/main/rust/viewpoint-kernel/embed.sh --check exits 0.'
        - 'npm run editor:check exits 0.'
        - 'npm run test:unit exits 0 (the editor suite with the new wasm; the boxes of src/test/resources/technology-map/expected-boxes.json are unchanged).'
      risk: 'medium'
      confidence: 80
      results: 'tier standard, model sonnet, effort medium, profile low-cost, done by the orchestrator: the wasm and the page block were committed (3793c38) after the implementer finished; embed.sh --check exit 0, cargo test 299 pass, npm run test:unit 3080 pass 0 fail, editor:check, lint and format:check exit 0'
      human_review: 'none'
      escalation_triggers:
        - 'embed.sh changes any line of the page outside the viewpoint-kernel-wasm block'
        - 'a node test of a saved Map changes its boxes'
      delegation_tier: 'standard'
    - id: task-005
      title: 'Write the Java tests of the map links, red'
      source_requirements:
        prd:
          - 'REQ-1'
          - 'REQ-4'
          - 'REQ-5'
        tdd:
          - 'DEC-1, DEC-5, DEC-8'
          - 'IF-1, IF-2, IF-3, CTR-3'
      outputs:
        - 'MapLinksTest: a saved Map with links draws the boxes and links of the case table (the same cases as the Rust tests, existence test only), the shape sentence of DEC-1 and the no-match sentence of DEC-5 as one error line with exit 1, the unknown-end sentence, the technology-layer refusal, label normalisation through RelationshipLabelTest cases (ASM-2), the key not sent for an empty list, a comparison with a removed relationship drawn as removed.'
        - 'GenerateStoriesTest (or StoriesTest): a step with an inline map recipe and links reads them the same way, and the skip warning of ViewInPlateau.'
        - 'The test of ViewInPlateau: the warning that the view is drawn without the link a to b which the plateau p does not have, and the skip with none of its links is in the plateau p.'
      verification:
        - './mvnw test -Dtest=MapLinksTest,GenerateStoriesTest fails on the new tests before task-006 and the red run is recorded in the prg.'
        - 'npx prettier --check on the new and changed Java files passes.'
      risk: 'medium'
      confidence: 75
      results: 'tier standard, model sonnet, effort medium, profile low-cost, passed first time, inline (leaf), independently verified'
      human_review: 'none'
      escalation_triggers:
        - 'the JDK 25 of sdkman is not the one JAVA_HOME names'
        - 'a test needs a shipped file that carries links (DEC-9 forbids it)'
      delegation_tier: 'standard'
    - id: task-006
      title: 'Forward links in KernelViewpointFactory and ViewInPlateau'
      source_requirements:
        prd:
          - 'REQ-1'
          - 'REQ-2'
          - 'REQ-4'
          - 'REQ-5'
        tdd:
          - 'DEC-1, DEC-5, DEC-6'
          - 'IMP-3, IMP-4, FLOW-1, FLOW-2, CON-2, CON-6, RISK-5'
      outputs:
        - 'KernelViewpointFactory.mapLinks next to mapLists: reads links from the properties of a view and of a step, refuses a bad entry with the sentence of DEC-1, drops in a plateau or facet workspace the entry whose relationship the main index lacks, adds the key only when the list is non-empty.'
        - 'ViewInPlateau.canBeDrawn: the warning through Warnings and the skip of DEC-5.'
      verification:
        - './mvnw test -Dtest=MapLinksTest,GenerateStoriesTest,KernelViewpointFactoryTest,ViewpointKernelTest,TechnologyMapTest passes.'
        - './mvnw test-compile pmd:check exits 0 with no suppression and no NOPMD added.'
        - 'grep -rn "NOPMD\|SuppressWarnings(\"PMD" src/main/java/io/morin/archicode/viewpoint/kernel/KernelViewpointFactory.java src/main/java/io/morin/archicode/cli/ViewInPlateau.java prints nothing.'
      risk: 'medium'
      confidence: 75
      human_review: 'none'
      escalation_triggers:
        - 'an existing golden view file changes'
        - 'the Java coverage falls below a floor'
      delegation_tier: 'standard'
    - id: task-007
      title: 'Say links in the guide and its golden file'
      source_requirements:
        prd:
          - 'REQ-2'
          - 'REQ-6'
        tdd:
          - 'DEC-7, IMP-5, IMP-6'
      outputs:
        - 'guide.md: the row links in the table of the properties the command line reads, and the sentence that links empty or absent is the whole map; the Not in the schema paragraph still says the properties are not in the schema.'
        - 'golden.md regenerated with archicode guide piped through the sed of CLAUDE.md.'
        - 'GuideViewPropertiesTest: a links case where a relationship of the guide workspace changes the file, and links empty gives the same file as the bare map.'
      verification:
        - './mvnw test -Dtest=GuideTest,GuideViewPropertiesTest,GuideCorpusTest passes.'
        - 'grep -c "links" src/main/resources/guide/guide.md and src/test/resources/guide/golden.md both print at least 1.'
        - 'git diff --stat shows src/test/resources/schemas/manifest.schema.json unchanged.'
      risk: 'low'
      confidence: 85
      human_review: 'none'
      escalation_triggers:
        - 'the guide exceeds the 30 KB budget of GuideTest'
      delegation_tier: 'standard'
    - id: task-008
      title: 'Say links in the manual and in CLAUDE.md'
      source_requirements:
        prd:
          - 'REQ-6'
        tdd:
          - 'DEC-7, IMP-7, CON-5, RISK-4'
      outputs:
        - 'README.adoc: a links paragraph in [[map-viewpoint]] with an inline listing (no include of a shipped file), the same-triple rule, the sentence of an entry that names nothing, one sentence in the plateaus part that a typo is a warning there, and the properties row near line 3503.'
        - 'CLAUDE.md: one paragraph in Architecture on links (the kernel key, the matching rule, the refusals, the plateau rule, no shipped file until W-6).'
      verification:
        - 'grep -n "links" src/doc/README.adoc finds the new paragraph under map-viewpoint and the properties row.'
        - 'grep -n "include::.*links" src/doc/README.adoc prints nothing.'
        - 'grep -n "links" CLAUDE.md finds the new paragraph.'
      risk: 'low'
      confidence: 80
      human_review: 'none'
      escalation_triggers:
        - 'the paragraph needs a sentence that the built behaviour does not support'
      delegation_tier: 'standard'
    - id: task-009
      title: 'Run the gate P2 checks'
      source_requirements:
        prd:
          - 'REQ-5'
          - 'REQ-6'
        tdd:
          - 'Observability and Verification'
          - 'CON-4, CON-5, DEC-9'
      outputs:
        - 'The full result of each command listed in the verification, with the exit code, in the prg.'
      verification:
        - 'JAVA_HOME of JDK 25: ./mvnw clean install -DskipITs=true -q exits 0 (unit tests, PMD, the Java coverage floors, the manual build).'
        - './mvnw verify -DskipITs=false exits 0.'
        - 'npm run test:unit and npm run editor:check exit 0.'
        - 'src/main/rust/viewpoint-kernel/embed.sh --check exits 0.'
        - 'scripts/byte-identity.sh exits 0 with no difference that is not in scripts/byte-identity-exceptions.txt.'
        - 'grep -rlE "^[[:space:]]*links:" --include=*.yaml --include=*.yml --include=*.toml --include=*.json src prints nothing (no shipped example, fixture or resource has a links property; the word in the editor page, the Rust sources and the manual is not matched).'
      risk: 'medium'
      confidence: 80
      human_review: 'none'
      escalation_triggers:
        - 'a check fails twice for a cause outside this run'
        - 'byte-identity reports a changed file'
      delegation_tier: 'standard'
    - id: task-010
      title: 'Record the sentences and exit codes as built in the run document'
      source_requirements:
        prd:
          - 'REQ-4'
        tdd:
          - 'IMP-8, DEC-5, RISK-2'
      outputs:
        - 'run-0197-map-links-kernel.md: the sentences of DEC-1 and DEC-5 as built, copied from the tests, the exit code of each (1 for an error line, 0 for the plateau warning and the skip), the limit of ASM-3 for the editor until W-5, and the status set to done.'
      verification:
        - 'grep -n "exit" docs/wav/wav-026-relationship-view/run/run-0197-map-links-kernel/run-0197-map-links-kernel.md finds the exit codes.'
        - 'Each sentence quoted in the run document appears word for word in src/test/java/io/morin/archicode/viewpoint/kernel/MapLinksTest.java (grep -F).'
      risk: 'low'
      confidence: 90
      human_review: 'none'
      escalation_triggers:
        - 'a sentence in the run document differs from the one the tests pin'
      delegation_tier: 'cheap'
```

## 5. Parallelization Plan

```yaml
parallelization_plan:
  groups:
    - id: parallel-group-001
      tasks:
        - task-003
        - task-005
      reason: 'Both start from the red Rust tests and the case table of task-002: task-003 writes the Rust kernel and runs cargo, task-005 writes the Java tests and runs them red against the wasm as committed; they touch disjoint files and different tools.'
      conflict_risks:
        - 'Both read src/test/javascript/viewpoint-kernel/map-links-cases.json: task-002 owns the file and neither task edits it.'
        - 'Neither runs embed.sh, so the page and the wasm are not touched until task-004.'
    - id: parallel-group-002
      tasks:
        - task-007
        - task-008
      reason: 'The guide with its golden file and its test, and the manual with CLAUDE.md, are disjoint files; both only read the built behaviour.'
      conflict_risks:
        - 'The manual build (task-009) reads README.adoc and the guide test reads the guide: neither task edits the other files.'
```

## 6. Human Review Gates

```yaml
human_review_gates:
  gates: []
```

No gate is required. The run operates under the autonomy override of complete-run, so a reviewer would have been executed and logged; none is planned. Task-003 carries `human_review: after` (a shared function of the kernel changed): the review after it is the independent verification of the implement workflow at the elevated pair, not a stop. The commit of the sources with the regenerated wasm and page block, and any comment on #143, are left to the author, outside this plan.

## 7. Risk Assessment

```yaml
risk_assessment:
  by_task:
    - id: task-001
      risk: 'medium'
      rationale: 'F-3 is a real design choice recorded in the contract; a wrong choice would have to be changed in W-5.'
    - id: task-002
      risk: 'medium'
      rationale: 'The tests fix the observable contract of the kernel; a wrong case would pin a wrong behaviour.'
    - id: task-003
      risk: 'high'
      rationale: 'fn map is shared by both layers and every saved Map; a change moves existing output if the None path is touched (RISK-1).'
    - id: task-004
      risk: 'medium'
      rationale: 'The wasm and the page block are generated artefacts that the editor, the jar and the native image read.'
    - id: task-005
      risk: 'medium'
      rationale: 'Sentences and exit codes are pinned here; the Java existence test must not become a second match implementation.'
    - id: task-006
      risk: 'medium'
      rationale: 'The adapter is long and shared by views generate and stories generate; PMD may fire (RISK-5).'
    - id: task-007
      risk: 'low'
      rationale: 'Documentation and a golden file that the code regenerates.'
    - id: task-008
      risk: 'low'
      rationale: 'Documentation; the manual builds in verify.'
    - id: task-009
      risk: 'medium'
      rationale: 'Long checks; byte-identity is the guard of REQ-5.'
    - id: task-010
      risk: 'low'
      rationale: 'A record of what the tests pin.'
  by_area:
    - area: 'api'
      risk: 'medium'
      rationale: 'The kernel input gains a key; contract number 5 stays and the key is optional.'
    - area: 'data'
      risk: 'low'
      rationale: 'No manifest format, schema or stored data changes.'
    - area: 'ui'
      risk: 'low'
      rationale: 'The editor ignores links until W-5 (ASM-3); no source under src/main/editor changes.'
    - area: 'docs'
      risk: 'low'
      rationale: 'Guide, golden file, manual and CLAUDE.md say what the tests pin.'
```

## 8. Confidence Assessment

```yaml
confidence_assessment:
  by_task:
    - id: task-001
      score: 80
      rationale: 'Seven findings with the fix written in each; F-3 needs one decision, recorded here.'
    - id: task-002
      score: 80
      rationale: 'The cases are listed in DEC-8; reading a JSON table from the Rust tests is the one unknown.'
    - id: task-003
      score: 70
      rationale: 'The design is precise, but fn map is large and the drawing cases of DEC-4 are subtle.'
    - id: task-004
      score: 80
      rationale: 'embed.sh and its check are established tools.'
    - id: task-005
      score: 75
      rationale: 'The sentences are fixed by the amended TDD; the plateau fixtures need care.'
    - id: task-006
      score: 75
      rationale: 'mapLists is the model to copy; PMD on the grown class is the unknown.'
    - id: task-007
      score: 85
      rationale: 'Same steps as earlier waves; the golden file is regenerated by a command.'
    - id: task-008
      score: 80
      rationale: 'Manual voice and the listing are free text but checked by the manual build.'
    - id: task-009
      score: 80
      rationale: 'Commands are known; the duration is long.'
    - id: task-010
      score: 90
      rationale: 'Copy from the tests.'
```

## 9. Agent Assignment Plan

```yaml
agent_assignment_plan:
  assignments:
    - task_id: task-001
      agent_role: 'Architecture Agent'
      objective: 'Apply F-1 to F-7 of the Stage 5 review to the TDD and record the choice for F-3.'
      context:
        prd_excerpts:
          - 'REQ-2, REQ-4'
        tdd_excerpts:
          - 'DEC-1, DEC-4, DEC-5, DEC-6, DEC-8; the Stage 5 line of the prg'
      likely_files:
        - 'docs/wav/wav-026-relationship-view/run/run-0197-map-links-kernel/tdd-0197-map-links-kernel.md'
      acceptance_criteria:
        - 'Each of F-1 to F-7 is visible in the text of the TDD; no decision of DEC-1 to DEC-3 changes.'
      verification:
        - 'the greps of the task catalog'
      escalation_triggers:
        - 'a finding contradicts a decision'
      suggested_subagent_type: 'general-purpose'
      suggested_model: '(default)'
      suggested_effort: 'medium'
    - task_id: task-002
      agent_role: 'Test Generation Agent'
      objective: 'Write the case table and the Rust tests of the map links and run them red.'
      context:
        prd_excerpts:
          - 'REQ-1, REQ-3, REQ-4, REQ-5'
        tdd_excerpts:
          - 'DEC-2, DEC-3, DEC-4, DEC-6, DEC-8, CTR-1'
      likely_files:
        - 'src/main/rust/viewpoint-kernel/src/lib_tests.rs'
        - 'src/test/javascript/viewpoint-kernel/map-links-cases.json'
      acceptance_criteria:
        - 'The new tests fail for the right reason (the key is not read) and no other kernel test fails.'
      verification:
        - 'cargo test and cargo fmt --check as in the task catalog'
      escalation_triggers:
        - 'an existing kernel test fails before the change'
      suggested_subagent_type: 'general-purpose'
      suggested_model: '(default)'
      suggested_effort: 'medium'
    - task_id: task-003
      agent_role: 'Backend Implementation Agent'
      objective: 'Implement links in fn map so that the red tests pass and the None path is unchanged.'
      context:
        prd_excerpts:
          - 'REQ-1, REQ-4, REQ-5, REQ-7'
        tdd_excerpts:
          - 'DEC-1 to DEC-6, CTR-1, CON-1, CON-2'
      likely_files:
        - 'src/main/rust/viewpoint-kernel/src/lib.rs'
        - 'src/main/rust/viewpoint-kernel/README.md'
      acceptance_criteria:
        - 'All kernel tests pass, clippy and fmt pass, line coverage is at least 90 percent, the contract number is 5.'
      verification:
        - 'cargo test, clippy, fmt, llvm-cov as in the task catalog'
      escalation_triggers:
        - 'an existing map test changes its expected value'
      suggested_subagent_type: 'general-purpose'
      suggested_model: '(default)'
      suggested_effort: 'high'
    - task_id: task-004
      agent_role: 'Infrastructure Agent'
      objective: 'Run embed.sh and check that only the wasm and the viewpoint-kernel-wasm block of the page changed.'
      context:
        prd_excerpts:
          - 'REQ-5'
        tdd_excerpts:
          - 'IMP-2, CON-3'
      likely_files:
        - 'src/main/wasm/viewpoint_kernel.wasm'
        - 'src/main/resources/editor-webapp/standalone.html'
      acceptance_criteria:
        - 'embed.sh --check, editor:check and test:unit pass.'
      verification:
        - 'the commands of the task catalog'
      escalation_triggers:
        - 'the page changes outside its kernel block'
      suggested_subagent_type: 'general-purpose'
      suggested_model: '(default)'
      suggested_effort: 'medium'
    - task_id: task-005
      agent_role: 'Test Generation Agent'
      objective: 'Write the Java tests of the sentences, exit codes, plateau warning and skip, and stories, and run them red.'
      context:
        prd_excerpts:
          - 'REQ-1, REQ-4, REQ-5'
        tdd_excerpts:
          - 'DEC-1, DEC-5, DEC-8, IF-1 to IF-3'
      likely_files:
        - 'src/test/java/io/morin/archicode/viewpoint/kernel/MapLinksTest.java'
        - 'src/test/java/io/morin/archicode/cli/GenerateStoriesTest.java'
      acceptance_criteria:
        - 'The new tests fail before task-006 for the right reason; Prettier passes.'
      verification:
        - 'the commands of the task catalog'
      escalation_triggers:
        - 'a test needs a shipped file with links'
      suggested_subagent_type: 'general-purpose'
      suggested_model: '(default)'
      suggested_effort: 'medium'
    - task_id: task-006
      agent_role: 'Backend Implementation Agent'
      objective: 'Add mapLinks and the ViewInPlateau rule so that the Java tests pass.'
      context:
        prd_excerpts:
          - 'REQ-1, REQ-2, REQ-4, REQ-5'
        tdd_excerpts:
          - 'DEC-1, DEC-5, DEC-6, IMP-3, IMP-4, CON-2, CON-6'
      likely_files:
        - 'src/main/java/io/morin/archicode/viewpoint/kernel/KernelViewpointFactory.java'
        - 'src/main/java/io/morin/archicode/cli/ViewInPlateau.java'
      acceptance_criteria:
        - 'The tests pass, PMD passes with no suppression, no existing golden file changes.'
      verification:
        - 'the commands of the task catalog'
      escalation_triggers:
        - 'a golden view file changes'
      suggested_subagent_type: 'general-purpose'
      suggested_model: '(default)'
      suggested_effort: 'medium'
    - task_id: task-007
      agent_role: 'Documentation Agent'
      objective: 'Add the links row to the guide, regenerate the golden file and add the GuideViewPropertiesTest case.'
      context:
        prd_excerpts:
          - 'REQ-2, REQ-6'
        tdd_excerpts:
          - 'DEC-7, IMP-6'
      likely_files:
        - 'src/main/resources/guide/guide.md'
        - 'src/test/resources/guide/golden.md'
        - 'src/test/java/io/morin/archicode/cli/GuideViewPropertiesTest.java'
      acceptance_criteria:
        - 'GuideTest, GuideViewPropertiesTest and GuideCorpusTest pass; the schema file is unchanged.'
      verification:
        - 'the commands of the task catalog'
      escalation_triggers:
        - 'the 30 KB budget is exceeded'
      suggested_subagent_type: 'general-purpose'
      suggested_model: '(default)'
      suggested_effort: 'low'
    - task_id: task-008
      agent_role: 'Documentation Agent'
      objective: 'Write the links paragraph of the manual and the paragraph of CLAUDE.md from the built behaviour.'
      context:
        prd_excerpts:
          - 'REQ-6'
        tdd_excerpts:
          - 'DEC-7, IMP-7, CON-5'
      likely_files:
        - 'src/doc/README.adoc'
        - 'CLAUDE.md'
      acceptance_criteria:
        - 'The greps of the task catalog hold; no include of a file with links.'
      verification:
        - 'the commands of the task catalog'
      escalation_triggers:
        - 'a statement is not backed by a test'
      suggested_subagent_type: 'general-purpose'
      suggested_model: '(default)'
      suggested_effort: 'medium'
    - task_id: task-009
      agent_role: 'QA Agent'
      objective: 'Run every gate P2 check and record the results; fix nothing outside the run files without escalating.'
      context:
        prd_excerpts:
          - 'REQ-5, REQ-6'
        tdd_excerpts:
          - 'Observability and Verification, CON-4, DEC-9'
      likely_files:
        - 'docs/wav/wav-026-relationship-view/run/run-0197-map-links-kernel/prg-0197-map-links-kernel.md'
      acceptance_criteria:
        - 'Every command of the verification exits 0 and byte-identity shows no unexpected difference.'
      verification:
        - 'the commands of the task catalog'
      escalation_triggers:
        - 'byte-identity reports a changed file'
      suggested_subagent_type: 'general-purpose'
      suggested_model: '(default)'
      suggested_effort: 'medium'
    - task_id: task-010
      agent_role: 'Documentation Agent'
      objective: 'Copy the sentences and exit codes pinned by the tests into the run document.'
      context:
        prd_excerpts:
          - 'REQ-4'
        tdd_excerpts:
          - 'IMP-8, DEC-5'
      likely_files:
        - 'docs/wav/wav-026-relationship-view/run/run-0197-map-links-kernel/run-0197-map-links-kernel.md'
      acceptance_criteria:
        - 'Every quoted sentence is found word for word in MapLinksTest.'
      verification:
        - 'the commands of the task catalog'
      escalation_triggers:
        - 'a sentence differs from the one the tests pin'
      suggested_subagent_type: 'Explore'
      suggested_model: 'haiku'
      suggested_effort: 'low'
```

## 10. Verification Plan

```yaml
verification_plan:
  checks:
    - task_id: task-001
      methods:
        - 'grep checks on the amended TDD'
      success_criteria:
        - 'F-1 to F-7 are each visible in the text; no old sentence with backticks round the id remains in an error.'
    - task_id: task-002
      methods:
        - 'cargo test run red'
        - 'cargo fmt --check'
      success_criteria:
        - 'Only the new links tests fail.'
    - task_id: task-003
      methods:
        - 'cargo test'
        - 'cargo clippy -D warnings'
        - 'cargo llvm-cov --fail-under-lines 90'
      success_criteria:
        - 'All pass and the contract number is 5.'
    - task_id: task-004
      methods:
        - 'embed.sh --check'
        - 'npm run editor:check'
        - 'npm run test:unit'
      success_criteria:
        - 'All pass and expected-boxes.json is unchanged.'
    - task_id: task-005
      methods:
        - 'mvnw test run red'
        - 'prettier --check'
      success_criteria:
        - 'Only the new tests fail.'
    - task_id: task-006
      methods:
        - 'mvnw test on the kernel, map and stories tests'
        - 'mvnw test-compile pmd:check'
      success_criteria:
        - 'All pass with no suppression.'
    - task_id: task-007
      methods:
        - 'mvnw test on the guide tests'
        - 'grep'
      success_criteria:
        - 'The guide tests pass and the schema file is unchanged.'
    - task_id: task-008
      methods:
        - 'grep'
      success_criteria:
        - 'The paragraph, the row and the CLAUDE.md paragraph exist; no include of a file with links.'
    - task_id: task-009
      methods:
        - 'mvnw clean install'
        - 'mvnw verify -DskipITs=false'
        - 'npm run test:unit'
        - 'embed.sh --check'
        - 'scripts/byte-identity.sh'
      success_criteria:
        - 'Every command exits 0 and byte-identity has no unexpected difference.'
    - task_id: task-010
      methods:
        - 'grep -F of each quoted sentence in MapLinksTest'
      success_criteria:
        - 'Every sentence of the run document is pinned by a test.'
```

## 11. Escalation Rules

```yaml
escalation_rules:
  rules:
    - condition: 'the plan runs under the autonomy override of complete-run'
      action: 'a task that would otherwise stop for a human is executed by an agent and the override is logged in the prg; no task here is human_required'
    - condition: 'an existing Map, view or golden file changes its output'
      action: 'stop the task, restore the path that was touched in the kernel (the None path of fn map), and log it as a finding; REQ-5 is not negotiable'
    - condition: 'a Stage 5 finding cannot be applied without changing DEC-1, DEC-2 or DEC-3'
      action: 'keep the decision, log the finding as deferred in the prg and in the TDD Deferred Work'
    - condition: 'embed.sh changes the page outside its kernel block, or the toolchain (Rust, JDK 25, Node) is missing'
      action: 'record the exact command and output in the prg, mark the task blocked and do not edit the generated files by hand'
    - condition: 'PMD or a coverage floor fails on the new code'
      action: 'extract a helper or add the missing test; never add a suppression or lower a floor'
    - condition: 'a task fails its own verification'
      action: 're-dispatch once one effort step up with the failing output, then handle inline and log a finding'
    - condition: 'the work would need a file under src/main/editor or a shipped file with links'
      action: 'stop: both are out of scope (W-5, W-6) and are logged as a finding for the wave'
```

## 12. Final Execution Manifest

```yaml
execution_manifest:
  status: 'in_progress'
  recommendation: 'proceed'
  autonomy_level: 'high'
  total_tasks: 10
  autonomous_tasks: 10
  review_before_tasks: 0
  review_after_tasks: 0
  human_required_tasks: 0
  blocked_tasks: 0
  critical_path_tasks:
    - task-001
    - task-002
    - task-003
    - task-004
    - task-006
    - task-007
    - task-009
    - task-010
  parallel_groups:
    - parallel-group-001
    - parallel-group-002
  required_human_gates: []
  highest_risk_tasks:
    - task-003
  lowest_confidence_tasks:
    - task-003
    - task-005
    - task-006
  next_action: 'Start task-001: apply the Stage 5 findings to the TDD, then task-002, then task-003 and task-005 in parallel.'
  criteria:
    - 'Every criterion of the Executive Summary is true.'
    - 'The prg logs the red and the green run of the Rust and Java tests and the result of each gate P2 command.'
```
