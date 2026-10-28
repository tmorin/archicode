---
title: Execution Plan — Highlight of a relationship in a Map view and a story step
status: draft
date: 2026-10-28
related:
  - docs/wav/wav-026-relationship-view/run/run-0198-link-highlight/tdd-0198-link-highlight.md
  - 'gh:tmorin/archicode#143'
  - docs/wav/wav-026-relationship-view/wav-026-relationship-view.md
type: pln
run: 0198
wave: 026
---

# Execution Plan: Highlight of a relationship in a Map view and a story step

Profile TDD+pln: there is no PRD, so REQ-1 to REQ-7 are the IDs the TDD labels (section "PRD Traceability"), taken from #143 decision D11 and the wave plan (W-4). The run operates under the autonomy override of complete-run: a task that would otherwise stop for a human is executed by an agent and the override is logged in the prg. No task below is `human_required`. The workflow never commits: the commit of the kernel sources with the regenerated `.wasm` and page block, and of `read-schema.js` with the rebuilt page, is a human step outside this plan.

## 1. Executive Summary

```yaml
summary:
  status: 'in_progress'
  product_goal: 'A Map view of the application layer takes a highlight property, and a story step a highlight key, both lists of {source, destination, label} entries; the kernel marks the links that stand for them, PlantUML draws a marked link heavier with a glyph and a bold label and the other links calmer, and every view and step written before the wave is drawn byte for byte as before (REQ-1 to REQ-7).'
  technical_approach: 'Apply the Stage 5 findings F-1 to F-4 to the TDD, write the Rust and Java tests red first, add the optional highlight input and highlighted output keys to the kernel map (contract number 5 unchanged), regenerate the wasm and the page block with embed.sh, generalise MapLinks and forward the key from KernelViewpointFactory, Story.Step, GenerateStoriesCommand and ViewInPlateau, add HighlightMarks to the PlantUML renderer, teach READ_SCHEMA the step key, then say it in the guide, its golden file, the manual and CLAUDE.md and run the gate checks including scripts/byte-identity.sh.'
  total_tasks: 12
  parallel_groups: 3
  high_risk_tasks: 1
  human_review_gates: 0
  autonomy_level: 'high'
  recommendation: 'proceed'
  criteria:
    - 'A Rust test and a Java test mark the links of a Map with highlight: plain, grouped, in a comparison, with only_changes, an entry not drawn, and the absent key giving the same JSON as before.'
    - 'An entry that names nothing is one error line with exit 1 in a workspace without plateau and facet, and a warning (the view drawn without the highlight) in a workspace with plateaus; the sentences are the ones of DEC-6 and are quoted in the run document as built.'
    - 'HighlightMarksTest pins the PlantUML of every combination of DEC-5 (highlighted or not, with or without a state, secondary) and a view without a highlighted link is byte for byte its golden file.'
    - 'cargo test, cargo fmt --check, cargo clippy -D warnings and the kernel coverage floor pass; embed.sh --check agrees with the committed wasm and page block; the kernel contract number is still 5.'
    - 'The Java checks pass: test-compile pmd:check, verify and verify -DskipITs=false; GuideTest, GuideViewPropertiesTest, ManifestSchemaTest and EditorReadSchemaTest are green.'
    - 'npm run editor:build, editor:check and test:unit pass; scripts/byte-identity.sh reports no unexpected difference; no shipped file carries highlight.'
    - 'One PlantUML file rendered from a workspace of the guide shows the heavier link and the calmer rest (ASM-5).'
```

## 2. PRD/TDD Consistency Assessment

```yaml
consistency_assessment:
  aligned_items:
    - 'REQ-1 to REQ-7 are each covered by a DEC and an IMP of the TDD, and each IMP is carried by a task below.'
    - 'The wave plan W-4 scope (kernel marking, PlantUML look, step key, guide, manual, byte-identity) equals the TDD scope.'
    - 'Open question Q-1 was resolved in Stage 6 (the whole link is highlighted); no question stays open.'
  gaps:
    - id: gap-001
      type: 'ambiguity'
      description: 'The Stage 5 review findings F-1 to F-4 are logged in the prg but not applied to the TDD: DEC-7 and IMP-8 name the wrong path of the case table, nothing says what highlight does on a view or step whose viewpoint is not a map, DEC-5 does not say what the bold label covers when a link has qualifiers or where the view-is-highlighting test is computed, DEC-3 does not say that the marking runs after merge_links and outside its key.'
      impact: 'medium'
      recommendation: 'task-001 applies them before any test is written: the case table is src/test/javascript/viewpoint-kernel/map-links-cases.json (or a new map-highlight-cases.json beside it), highlight is read for map only and forwarded like links, the bold label covers the label text and not the qualifiers, the highlighting test is a one-pass any() over the links in LinkRenderer, and the marking is set after merge_links and kept out of its key.'
    - id: gap-002
      type: 'risk'
      description: 'Between this run and W-5 the editor draws a saved view that has highlight without any highlight and drops the key on save (ASM-3 of run 0197, CON-5).'
      impact: 'low'
      recommendation: 'No shipped file carries highlight (DEC-9) and task-011 checks it by grep; the limit is recorded in the run document, not in the manual.'
    - id: gap-003
      type: 'risk'
      description: 'The editor conformance tests may compare a whole link object and fail on the new highlighted key (RISK-3, ASM-3).'
      impact: 'low'
      recommendation: 'task-004 runs npm run test:unit; if one fails it is updated in this run and the update is logged.'
    - id: gap-004
      type: 'risk'
      description: 'OutLink derives Ord or PartialEq and the new field could reorder or split merged links (RISK-1, IMP-1).'
      impact: 'medium'
      recommendation: 'task-002 writes a grouped-link test; task-003 puts the field last and sets it after merge_links.'
    - id: gap-005
      type: 'scope'
      description: 'The wave plan lists the likely paths of W-4 without src/main/editor/**, while DEC-8 edits src/main/editor/core/read-schema.js (the page standalone.html is generated from it, and EditorReadSchemaTest fails otherwise). The TDD names this in the tradeoffs of DEC-8 and in RISK-5.'
      impact: 'low'
      recommendation: 'task-008 is limited to one entry of read-schema.js and the rebuilt page; the escalation triggers (names.json, ratchet) stop it from growing; the deviation is recorded in the run document by task-012.'
  blocking_gaps: []
```

## 3. Execution Graph

```yaml
execution_graph:
  nodes:
    - id: task-001
      status: 'done'
      title: 'Apply the Stage 5 findings F-1 to F-4 to the TDD'
      depends_on: []
      produces:
        - 'tdd-0198-link-highlight.md amended (DEC-3, DEC-5, DEC-7, IMP-1, IMP-8, Review pass line)'
      agent_role: 'Architecture Agent'
      autonomy: 'autonomous'
      risk: 'medium'
      confidence: 80
    - id: task-002
      status: 'done'
      title: 'Write the Rust tests of the highlight, red'
      depends_on: [task-001]
      produces:
        - 'the highlight cases in src/test/javascript/viewpoint-kernel/map-links-cases.json or map-highlight-cases.json'
        - 'src/main/rust/viewpoint-kernel/src/lib_tests.rs with the highlight cases, failing before task-003'
      agent_role: 'Test Generation Agent'
      autonomy: 'autonomous'
      risk: 'medium'
      confidence: 80
    - id: task-003
      status: 'done'
      title: 'Implement highlight and highlighted in the kernel map'
      depends_on: [task-002]
      produces:
        - 'src/main/rust/viewpoint-kernel/src/lib.rs (Input.highlight, map_highlight, OutLink.highlighted, the marking in fn map, the header documentation)'
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
      title: 'Write the Java tests of the highlight, red'
      depends_on: [task-001, task-002]
      produces:
        - 'tests for the adapter, the step key, ViewInPlateau (in src/test/java/io/morin/archicode/cli/MapLinksTest.java, where run 0197 tests it; there is no ViewInPlateauTest) and the new HighlightMarksTest, failing before tasks 006 and 007'
      agent_role: 'Test Generation Agent'
      autonomy: 'autonomous'
      risk: 'medium'
      confidence: 75
    - id: task-006
      status: 'done'
      title: 'Forward highlight through MapLinks, KernelViewpointFactory, Link, Story.Step and ViewInPlateau'
      depends_on: [task-004, task-005]
      produces:
        - 'src/main/java/io/morin/archicode/viewpoint/kernel/MapLinks.java, KernelViewpointFactory.java, src/main/java/io/morin/archicode/viewpoint/Link.java, resource/story/Story.java, cli/GenerateStoriesCommand.java, cli/ViewInPlateau.java'
        - 'reflect-config.json only if a reflected class is added'
      agent_role: 'Backend Implementation Agent'
      autonomy: 'autonomous'
      risk: 'medium'
      confidence: 75
    - id: task-007
      status: 'done'
      title: 'Draw the highlight in PlantUML (HighlightMarks, LinkRenderer)'
      depends_on: [task-006]
      produces:
        - 'src/main/java/io/morin/archicode/rendering/plantuml/HighlightMarks.java'
        - 'src/main/java/io/morin/archicode/rendering/plantuml/LinkRenderer.java'
      agent_role: 'Backend Implementation Agent'
      autonomy: 'autonomous'
      risk: 'medium'
      confidence: 75
    - id: task-008
      status: 'done'
      title: 'Teach the editor read schema the step key and regenerate the manifest schema golden'
      depends_on: [task-006]
      produces:
        - 'src/main/editor/core/read-schema.js and the rebuilt src/main/resources/editor-webapp/standalone.html'
        - 'src/test/resources/schemas/manifest.schema.json'
      agent_role: 'Backend Implementation Agent'
      autonomy: 'autonomous'
      risk: 'medium'
      confidence: 80
    - id: task-009
      status: 'todo'
      title: 'Say highlight in the guide and its golden file'
      depends_on: [task-007, task-008]
      produces:
        - 'src/main/resources/guide/guide.md'
        - 'src/test/resources/guide/golden.md'
        - 'src/test/java/io/morin/archicode/cli/GuideViewPropertiesTest.java with a highlight case'
      agent_role: 'Documentation Agent'
      autonomy: 'autonomous'
      risk: 'low'
      confidence: 85
    - id: task-010
      status: 'todo'
      title: 'Say highlight in the manual and in CLAUDE.md'
      depends_on: [task-007, task-008]
      produces:
        - 'src/doc/README.adoc ([[map-viewpoint]], [[stories-generate]] and the properties row)'
        - 'CLAUDE.md, one paragraph in Architecture'
      agent_role: 'Documentation Agent'
      autonomy: 'autonomous'
      risk: 'low'
      confidence: 80
    - id: task-011
      status: 'todo'
      title: 'Run the gate checks and render one file'
      depends_on: [task-009, task-010]
      produces:
        - 'a record of each command and its result in the prg'
      agent_role: 'QA Agent'
      autonomy: 'autonomous'
      risk: 'medium'
      confidence: 80
    - id: task-012
      status: 'todo'
      title: 'Record the sentences, the look and the limits as built in the run document'
      depends_on: [task-011]
      produces:
        - 'run-0198-link-highlight.md with the sentences of DEC-1 and DEC-6, the PlantUML of DEC-5, the exit codes and the limit of the editor until W-5'
      agent_role: 'Documentation Agent'
      autonomy: 'autonomous'
      risk: 'low'
      confidence: 90
  edges:
    - from: task-001
      to: task-002
      reason: 'the tests follow the amended design'
    - from: task-001
      to: task-005
      reason: 'the Java tests follow the amended design'
    - from: task-002
      to: task-003
      reason: 'the Rust tests are red first (TDD)'
    - from: task-002
      to: task-005
      reason: 'the Java tests read the case table that task-002 writes'
    - from: task-003
      to: task-004
      reason: 'embed.sh compiles the Rust that task-003 wrote'
    - from: task-004
      to: task-006
      reason: 'the adapter runs the new wasm'
    - from: task-005
      to: task-006
      reason: 'the Java tests are red first (TDD)'
    - from: task-006
      to: task-007
      reason: 'the renderer reads Link.highlighted that task-006 adds'
    - from: task-006
      to: task-008
      reason: 'the step key must be in Story.Step before the schema and READ_SCHEMA are compared'
    - from: task-007
      to: task-009
      reason: 'the guide and its test describe the drawing'
    - from: task-008
      to: task-009
      reason: 'the guide is checked against the schema golden'
    - from: task-007
      to: task-010
      reason: 'the manual describes the drawing as built'
    - from: task-008
      to: task-010
      reason: 'the manual describes the step key as built'
    - from: task-009
      to: task-011
      reason: 'the gate runs after the documents'
    - from: task-010
      to: task-011
      reason: 'the gate builds the manual'
    - from: task-011
      to: task-012
      reason: 'the record copies what the checks confirmed'
```

## 4. Task Catalog

```yaml
task_catalog:
  tasks:
    - id: task-001
      title: 'Apply the Stage 5 findings F-1 to F-4 to the TDD'
      results: 'tier standard, model sonnet, effort medium, profile low-cost, passed first time, inline (leaf), independently verified'
      source_requirements:
        prd:
          - 'REQ-1'
          - 'REQ-2'
        tdd:
          - 'DEC-3, DEC-5, DEC-7, IMP-1, IMP-8'
          - 'prg-0198 Stage 5 line, findings F-1 to F-4'
      outputs:
        - 'DEC-7 and IMP-8 name src/test/javascript/viewpoint-kernel/map-links-cases.json (created by run 0197) as the case table, and say whether the highlight cases are added to it or to a map-highlight-cases.json beside it.'
        - 'DEC-2 or DEC-6 says highlight is read for viewpoint map only, as KernelViewpointFactory forwards links for map only, and that a step or view of another viewpoint with highlight ignores it.'
        - 'DEC-5 says the bold covers the label text only (qualifiers and the state glyph are outside it) and that "the view is highlighting" is computed once per view in LinkRenderer as any highlighted link.'
        - 'DEC-3 and IMP-1 say the marking runs after merge_links, outside its key, and that OutLink.highlighted is the last field.'
        - 'The Review pass line of the TDD says the findings are applied.'
      verification:
        - 'grep -n "map-links-cases.json" the TDD finds the case table in DEC-7 and IMP-8, and finds no path under src/test/resources/viewpoint-kernel.'
        - 'grep -n "merge_links" the TDD finds it in DEC-3.'
      risk: 'medium'
      confidence: 80
      human_review: 'none'
      escalation_triggers:
        - 'a finding cannot be applied without changing a decision of DEC-1 to DEC-4'
      delegation_tier: 'standard'
    - id: task-002
      title: 'Write the Rust tests of the highlight, red'
      results: 'tier standard, model sonnet, effort medium, profile low-cost, passed first time, inline (leaf), independently verified'
      source_requirements:
        prd:
          - 'REQ-1'
          - 'REQ-3'
          - 'REQ-4'
          - 'REQ-5'
        tdd:
          - 'DEC-3, DEC-4, DEC-6, DEC-7'
          - 'CTR-1, CTR-2, RISK-1'
      outputs:
        - 'Cases in the shared table: one relationship highlighted; a grouped link where one of several relationships is highlighted; the same triple with two labels; an entry not drawn (hidden, both ends on one closed box) that marks nothing and is no error; highlight without links; highlight with links; only_changes dropping a highlighted link; a comparison with a removed relationship highlighted; an unknown end (dangling reference); no match (error); the technology layer refused; empty and null equal to absent; the check order (links before highlight).'
        - 'lib_tests.rs: Rust tests that read the cases and assert the highlighted flag of each link, the sentence of each error, and that an input without highlight serialises with no highlighted key.'
      verification:
        - 'cargo test --manifest-path src/main/rust/viewpoint-kernel/Cargo.toml fails on the new highlight tests and passes on every other test (the red run is recorded in the prg).'
        - 'cargo fmt --check --manifest-path src/main/rust/viewpoint-kernel/Cargo.toml passes.'
      risk: 'medium'
      confidence: 80
      human_review: 'none'
      escalation_triggers:
        - 'an existing kernel test fails before the kernel change'
      delegation_tier: 'standard'
    - id: task-003
      title: 'Implement highlight and highlighted in the kernel map'
      results: 'tier standard, model sonnet, effort medium, profile low-cost, passed first time, inline (leaf), independently verified'
      source_requirements:
        prd:
          - 'REQ-1'
          - 'REQ-3'
          - 'REQ-4'
          - 'REQ-5'
        tdd:
          - 'DEC-3, DEC-4, DEC-6'
          - 'CTR-1, CTR-2, IMP-1, CON-1, CON-2, RISK-1'
      outputs:
        - 'lib.rs: Input.highlight as an optional JSON list read by map_highlight (the same LinkRef and normal label as links); OutLink.highlighted with skip_serializing_if, set once in map after merge_links; the technology layer refuses the key; the check order is links then highlight; dangling_in_lists also lists the unknown ends of highlight.'
        - 'The header documentation of lib.rs and README.md say highlight and highlighted are additive and the contract number is 5.'
      verification:
        - 'cargo test --manifest-path src/main/rust/viewpoint-kernel/Cargo.toml passes, including the tests of task-002 that were red.'
        - 'cargo clippy --all-targets --manifest-path src/main/rust/viewpoint-kernel/Cargo.toml -- -D warnings passes and cargo fmt --check passes.'
        - 'cd src/main/rust/viewpoint-kernel && cargo llvm-cov --ignore-filename-regex ''_tests\.rs$'' --fail-under-lines 90 passes.'
        - 'grep -n "CONTRACT\|contract" src/main/rust/viewpoint-kernel/src/lib.rs shows the number still 5.'
      risk: 'high'
      confidence: 70
      human_review: 'after'
      escalation_triggers:
        - 'a test of an existing map (any viewpoint) changes its expected value'
        - 'the derived order of OutLink changes the order of existing links'
        - 'the kernel coverage falls below 90 percent'
      delegation_tier: 'standard'
    - id: task-004
      title: 'Regenerate the wasm and the page block'
      source_requirements:
        prd:
          - 'REQ-3'
          - 'REQ-5'
        tdd:
          - 'IMP-2, CON-3, ASM-3'
      outputs:
        - 'src/main/wasm/viewpoint_kernel.wasm and the block viewpoint-kernel-wasm of src/main/resources/editor-webapp/standalone.html, written by embed.sh and nothing else of the page.'
      verification:
        - 'src/main/rust/viewpoint-kernel/embed.sh --check exits 0.'
        - 'npm run editor:check exits 0.'
        - 'npm run test:unit exits 0 (a conformance test that compares a whole link is updated and the update logged; expected-boxes.json is unchanged).'
      risk: 'medium'
      confidence: 80
      results: 'tier standard, model sonnet, effort medium, profile low-cost, done by the orchestrator: the wasm and the page block were committed (d6877db) after the implementer finished; embed.sh --check exit 0, cargo test 325 pass, npm run test:unit 3080 pass 0 fail, editor:check, lint and format:check exit 0'
      human_review: 'none'
      escalation_triggers:
        - 'embed.sh changes any line of the page outside the viewpoint-kernel-wasm block'
        - 'a node test of a saved Map changes its boxes'
      delegation_tier: 'standard'
    - id: task-005
      title: 'Write the Java tests of the highlight, red'
      results: 'tier standard, model sonnet, effort medium, profile low-cost, passed first time, inline (leaf), independently verified'
      source_requirements:
        prd:
          - 'REQ-1'
          - 'REQ-2'
          - 'REQ-4'
          - 'REQ-5'
          - 'REQ-6'
        tdd:
          - 'DEC-1, DEC-2, DEC-5, DEC-6, DEC-7'
          - 'IF-1, IF-2, FLOW-1, FLOW-2'
      outputs:
        - 'A Java test of the adapter (cases added to src/test/java/io/morin/archicode/cli/MapLinksTest.java, which already reads map-links-cases.json): a saved Map with highlight reads the cases of the shared table, the shape sentence of DEC-1 and the no-match sentence of DEC-6 as one error line with exit 1, the unknown-end sentence, the key not sent for an empty list, a comparison drawn with the highlight.'
        - 'HighlightMarksTest in src/test/java/io/morin/archicode/rendering/plantuml/: every combination of DEC-5 as a golden string (highlighted or not, none or new or changed or removed state, secondary, with and without a label), and a view with no highlighted link equal to the output before the run.'
        - 'GenerateStoriesTest: a step with view and highlight (the saved view untouched), a step with its own recipe, highlight: [] switching off the view highlight.'
        - 'MapLinksTest (the class that already tests ViewInPlateau.linksCanBeDrawn): the warning that the view is drawn without the highlight a -> b which the plateau p does not have, and a view whose links all lack is still skipped.'
      verification:
        - './mvnw test -Dtest=MapLinksTest,HighlightMarksTest,GenerateStoriesTest fails on the new tests before tasks 006 and 007 and the red run is recorded in the prg.'
        - 'npx prettier --check on the new and changed Java files passes.'
      risk: 'medium'
      confidence: 75
      human_review: 'none'
      escalation_triggers:
        - 'the JDK 25 of sdkman is not the one JAVA_HOME names'
        - 'a test needs a shipped file that carries highlight (DEC-9 forbids it)'
      delegation_tier: 'standard'
    - id: task-006
      title: 'Forward highlight through MapLinks, KernelViewpointFactory, Link, Story.Step and ViewInPlateau'
      results: 'tier standard, model sonnet, effort medium, profile low-cost, passed after escalation to effort high, inline (leaf), independently verified'
      source_requirements:
        prd:
          - 'REQ-1'
          - 'REQ-3'
          - 'REQ-4'
          - 'REQ-5'
          - 'REQ-6'
        tdd:
          - 'DEC-1, DEC-2, DEC-6, DEC-7'
          - 'IMP-3, IMP-4, IMP-6, FLOW-1, FLOW-2, CON-2, CON-6'
      outputs:
        - 'MapLinks takes the key (links or highlight) in entries, wellFormed, exists and existsInUnion; its Javadoc says so.'
        - 'KernelViewpointFactory.mapHighlight next to mapLinks: reads highlight from the properties of a view, refuses a bad entry with the sentence of DEC-1, drops in a plateau or facet workspace the entry the index lacks, adds the key only when the list is non-empty, reads highlighted into Link.'
        - 'Link.highlighted as a defaulted boolean, left out of the comparator.'
        - 'Story.Step#highlight (a JsonNode list, nulls set like properties) and GenerateStoriesCommand.viewOf giving the drawn view the properties.highlight of the step when the step has the key, on a copy of a saved view and never on the saved view.'
        - 'ViewInPlateau: the warning through Warnings for an entry the plateau lacks and a view that is drawn without the highlight.'
      verification:
        - './mvnw test -Dtest=MapLinksTest,GenerateStoriesTest,KernelViewpointFactoryTest,ViewpointKernelTest,TechnologyMapTest passes (MapLinksTest and TechnologyMapTest are in io.morin.archicode.cli).'
        - './mvnw test-compile pmd:check exits 0 with no suppression and no NOPMD added.'
        - 'grep -rn "NOPMD\|SuppressWarnings(\"PMD" on the changed main files prints nothing.'
      risk: 'medium'
      confidence: 75
      human_review: 'none'
      escalation_triggers:
        - 'an existing golden view file changes'
        - 'a PMD rule fires on the grown KernelViewpointFactory and needs a helper class (add it to reflect-config.json only if reflected)'
        - 'the Java coverage falls below a floor'
      delegation_tier: 'standard'
    - id: task-007
      title: 'Draw the highlight in PlantUML (HighlightMarks, LinkRenderer)'
      results: 'tier standard, model sonnet, effort medium, profile low-cost, passed after escalation to effort high, inline (leaf), independently verified'
      source_requirements:
        prd:
          - 'REQ-2'
          - 'REQ-5'
        tdd:
          - 'DEC-5'
          - 'IMP-5, CTR-5, RISK-2, ASM-5'
      outputs:
        - 'HighlightMarks, a utility class like ChangeMarks, with the arrows, the glyph, the bold label and the calm label of DEC-5; LinkRenderer calls it and finds once per view whether any link is highlighted.'
      verification:
        - './mvnw test -Dtest=HighlightMarksTest,LinkRendererTest passes and every golden .puml of the repository is unchanged (./mvnw test exits 0).'
        - './mvnw test-compile pmd:check exits 0.'
      risk: 'medium'
      confidence: 75
      human_review: 'none'
      escalation_triggers:
        - 'an existing .puml golden file changes'
        - 'PlantUML does not render the arrow or the Creole of DEC-5 (ASM-5)'
      delegation_tier: 'standard'
    - id: task-008
      title: 'Teach the editor read schema the step key and regenerate the manifest schema golden'
      source_requirements:
        prd:
          - 'REQ-1'
          - 'REQ-6'
        tdd:
          - 'DEC-8, DEC-9'
          - 'IMP-7, CTR-4, CON-8'
      outputs:
        - 'src/main/editor/core/read-schema.js: highlight in the fields of a step, the same shape as properties; then npm run editor:build.'
        - 'src/test/resources/schemas/manifest.schema.json regenerated with archicode query schemas manifest; the workspace schema golden file is unchanged.'
      verification:
        - './mvnw test -Dtest=EditorReadSchemaTest,ManifestSchemaTest passes.'
        - 'npm run editor:check and npm run test:unit exit 0; the ratchet max in layers.json is unchanged.'
        - 'git diff --stat shows src/test/resources/schemas/workspace.schema.json unchanged.'
      risk: 'medium'
      confidence: 80
      results: 'tier standard, model sonnet, effort medium, profile low-cost, done by the orchestrator: read-schema.js, the page and the manifest schema golden committed (8099eda) after the implementer finished; EditorReadSchemaTest, ManifestSchemaTest, GuideTest pass, test:unit 3080 pass 0 fail, editor:check exit 0'
      human_review: 'none'
      escalation_triggers:
        - 'a top-level name is added to the page (names.json would change)'
        - 'the ratchet rises'
      delegation_tier: 'standard'
    - id: task-009
      title: 'Say highlight in the guide and its golden file'
      source_requirements:
        prd:
          - 'REQ-7'
        tdd:
          - 'IMP-9, CTR-3, CTR-4'
      outputs:
        - 'guide.md: the row highlight in the table of the properties the command line reads, the sentence that a story step may carry highlight which replaces the view highlight, that an entry which is not drawn changes nothing, and that highlight [] switches it off.'
        - 'golden.md regenerated with archicode guide piped through the sed of CLAUDE.md.'
        - 'GuideViewPropertiesTest: a highlight case where a link of the guide workspace changes the file, and highlight empty gives the same file as the bare map.'
      verification:
        - './mvnw test -Dtest=GuideTest,GuideViewPropertiesTest,GuideCorpusTest passes.'
        - 'grep -c "highlight" src/main/resources/guide/guide.md and src/test/resources/guide/golden.md both print at least 1.'
      risk: 'low'
      confidence: 85
      human_review: 'none'
      escalation_triggers:
        - 'the guide exceeds the 30 KB budget of GuideTest'
      delegation_tier: 'standard'
    - id: task-010
      title: 'Say highlight in the manual and in CLAUDE.md'
      source_requirements:
        prd:
          - 'REQ-7'
        tdd:
          - 'IMP-9, DEC-9'
      outputs:
        - 'README.adoc: a highlight paragraph in [[map-viewpoint]] with an inline listing (no include of a shipped file), the look of DEC-5 in words, the step key in [[stories-generate]], and the properties row.'
        - 'CLAUDE.md: one paragraph in Architecture on highlight (the kernel keys, the look, the step key, the plateau rule, the editor limit, no shipped file until W-6).'
      verification:
        - 'grep -n "highlight" src/doc/README.adoc finds the paragraph under map-viewpoint, the step key and the properties row.'
        - 'grep -n "include::.*highlight" src/doc/README.adoc prints nothing.'
        - 'grep -n "highlight" CLAUDE.md finds the new paragraph.'
      risk: 'low'
      confidence: 80
      human_review: 'none'
      escalation_triggers:
        - 'the paragraph needs a sentence that the built behaviour does not support'
      delegation_tier: 'standard'
    - id: task-011
      title: 'Run the gate checks and render one file'
      source_requirements:
        prd:
          - 'REQ-2'
          - 'REQ-5'
          - 'REQ-6'
        tdd:
          - 'Observability and Verification'
          - 'CON-4, CON-5, DEC-9, ASM-5'
      outputs:
        - 'The full result of each command listed in the verification, with the exit code, in the prg.'
        - 'One .puml rendered from a workspace made of the guide blocks with a highlight, looked at and described in the prg.'
      verification:
        - 'JAVA_HOME of JDK 25: ./mvnw clean install -DskipITs=true -q exits 0 (unit tests, PMD, the Java coverage floors, the manual build).'
        - './mvnw verify -DskipITs=false exits 0.'
        - 'npm run editor:check, npm run test:unit and npm run test:timing exit 0.'
        - 'src/main/rust/viewpoint-kernel/embed.sh --check exits 0.'
        - 'scripts/byte-identity.sh exits 0 with no difference that is not in scripts/byte-identity-exceptions.txt.'
        - 'grep -rlE "^[[:space:]]*highlight:" --include=*.yaml --include=*.yml --include=*.toml --include=*.json src prints nothing.'
      risk: 'medium'
      confidence: 80
      human_review: 'none'
      escalation_triggers:
        - 'a check fails twice for a cause outside this run'
        - 'byte-identity reports a changed file'
      delegation_tier: 'standard'
    - id: task-012
      title: 'Record the sentences, the look and the limits as built in the run document'
      source_requirements:
        prd:
          - 'REQ-4'
          - 'REQ-7'
        tdd:
          - 'IMP-8, DEC-5, DEC-6, RISK-2'
      outputs:
        - 'run-0198-link-highlight.md: the sentences of DEC-1 and DEC-6 as built, copied from the tests, the exit code of each (1 for an error line, 0 for the plateau warning), the arrows and labels of DEC-5 as pinned by HighlightMarksTest, the limit of the editor until W-5 and W-6, the edit of read-schema.js that the wave plan paths do not list (gap-005), and the status set to done.'
      verification:
        - 'grep -n "exit" the run document finds the exit codes.'
        - 'Each sentence quoted in the run document appears word for word in the Java tests (grep -F).'
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
        - 'Both read the case table: task-002 owns it and neither task edits it.'
        - 'Neither runs embed.sh, so the page and the wasm are not touched until task-004.'
    - id: parallel-group-002
      tasks:
        - task-007
        - task-008
      reason: 'The PlantUML renderer and the editor read schema with the manifest schema golden are disjoint files, both after the Java forwarding of task-006.'
      conflict_risks:
        - 'task-008 rebuilds the page; task-007 touches no editor file.'
        - 'Both run Maven tests: they run different test classes and neither edits the other files.'
    - id: parallel-group-003
      tasks:
        - task-009
        - task-010
      reason: 'The guide with its golden file and its test, and the manual with CLAUDE.md, are disjoint files; both only read the built behaviour.'
      conflict_risks:
        - 'The manual build (task-011) reads README.adoc and the guide test reads the guide: neither task edits the other files.'
```

## 6. Human Review Gates

```yaml
human_review_gates:
  gates: []
```

No gate is required. The run operates under the autonomy override of complete-run, so a reviewer would have been executed and logged; none is planned. Task-003 carries `human_review: after` (a shared function of the kernel changes): the review after it is the independent verification of the implement workflow, not a stop. The commit of the sources with the regenerated wasm and page, and any comment on #143, are left to the author, outside this plan.

## 7. Risk Assessment

```yaml
risk_assessment:
  by_task:
    - id: task-001
      risk: 'medium'
      rationale: 'The findings change what the tests pin; a wrong reading would be repeated in every later task.'
    - id: task-002
      risk: 'medium'
      rationale: 'The tests fix the observable contract of the kernel marking; a wrong case would pin a wrong behaviour.'
    - id: task-003
      risk: 'high'
      rationale: 'fn map and OutLink are shared by every saved Map; a derived order or the merge key could move existing output (RISK-1).'
    - id: task-004
      risk: 'medium'
      rationale: 'The wasm and the page block are generated artefacts that the editor, the jar and the native image read; a conformance test may compare a whole link (RISK-3).'
    - id: task-005
      risk: 'medium'
      rationale: 'Sentences, exit codes and the PlantUML strings are pinned here.'
    - id: task-006
      risk: 'medium'
      rationale: 'The adapter and the step are shared by views generate and stories generate; PMD may fire on the grown class.'
    - id: task-007
      risk: 'medium'
      rationale: 'The renderer is shared by every view; a composed state plus highlight label can come out in the wrong order (RISK-2).'
    - id: task-008
      risk: 'medium'
      rationale: 'The editor page is edited by a task of a backend wave; the ratchet and names.json must not move (RISK-5).'
    - id: task-009
      risk: 'low'
      rationale: 'Documentation and a golden file that the code regenerates.'
    - id: task-010
      risk: 'low'
      rationale: 'Documentation; the manual builds in verify.'
    - id: task-011
      risk: 'medium'
      rationale: 'Long checks; byte-identity is the guard of REQ-5.'
    - id: task-012
      risk: 'low'
      rationale: 'A record of what the tests pin.'
  by_area:
    - area: 'api'
      risk: 'medium'
      rationale: 'The kernel input and output gain an optional key; contract number 5 stays.'
    - area: 'data'
      risk: 'low'
      rationale: 'The manifest schema gains one optional key on a step; no stored data changes.'
    - area: 'ui'
      risk: 'low'
      rationale: 'The editor learns one key of a table and draws nothing new (W-5, W-6).'
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
      rationale: 'Four findings with the fix written in each.'
    - id: task-002
      score: 80
      rationale: 'The cases are listed in the TDD; the reader of the shared table exists since run 0197.'
    - id: task-003
      score: 70
      rationale: 'The design is precise, but the marking must stay outside the merge key of the grouped links.'
    - id: task-004
      score: 80
      rationale: 'embed.sh and its check are established tools, used in run 0197.'
    - id: task-005
      score: 75
      rationale: 'The sentences follow run 0197; the DEC-5 strings are new.'
    - id: task-006
      score: 75
      rationale: 'mapLinks is the model to copy; PMD on the grown class is the unknown.'
    - id: task-007
      score: 75
      rationale: 'PlantUML syntax is pinned by ChangeMarks; the Creole composition is validated by one render (ASM-5).'
    - id: task-008
      score: 80
      rationale: 'One table entry and two regenerated files; the tests say if it is wrong.'
    - id: task-009
      score: 85
      rationale: 'Same steps as run 0197.'
    - id: task-010
      score: 80
      rationale: 'Manual voice is free text but checked by the manual build.'
    - id: task-011
      score: 80
      rationale: 'Commands are known; the duration is long.'
    - id: task-012
      score: 90
      rationale: 'Copy from the tests.'
```

## 9. Agent Assignment Plan

```yaml
agent_assignment_plan:
  assignments:
    - task_id: task-001
      agent_role: 'Architecture Agent'
      objective: 'Apply F-1 to F-4 of the Stage 5 review to the TDD.'
      context:
        prd_excerpts:
          - 'REQ-1, REQ-2'
        tdd_excerpts:
          - 'DEC-3, DEC-5, DEC-7, IMP-1, IMP-8; the Stage 5 line of the prg'
      likely_files:
        - 'docs/wav/wav-026-relationship-view/run/run-0198-link-highlight/tdd-0198-link-highlight.md'
      acceptance_criteria:
        - 'Each of F-1 to F-4 is visible in the text of the TDD; no decision of DEC-1 to DEC-4 changes.'
      verification:
        - 'the greps of the task catalog'
      escalation_triggers:
        - 'a finding contradicts a decision'
      suggested_subagent_type: 'general-purpose'
      suggested_model: '(default)'
      suggested_effort: 'medium'
    - task_id: task-002
      agent_role: 'Test Generation Agent'
      objective: 'Write the highlight cases and the Rust tests and run them red.'
      context:
        prd_excerpts:
          - 'REQ-1, REQ-3, REQ-4, REQ-5'
        tdd_excerpts:
          - 'DEC-3, DEC-4, DEC-6, DEC-7, CTR-1, CTR-2'
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
      objective: 'Implement highlight and highlighted in fn map so that the red tests pass and every existing output is unchanged.'
      context:
        prd_excerpts:
          - 'REQ-1, REQ-3, REQ-4, REQ-5'
        tdd_excerpts:
          - 'DEC-3, DEC-4, DEC-6, CTR-1, CTR-2, CON-1, CON-2'
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
          - 'REQ-3, REQ-5'
        tdd_excerpts:
          - 'IMP-2, CON-3, ASM-3'
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
      objective: 'Write the Java tests of the adapter, the step, ViewInPlateau and HighlightMarks and run them red.'
      context:
        prd_excerpts:
          - 'REQ-1, REQ-2, REQ-4, REQ-5, REQ-6'
        tdd_excerpts:
          - 'DEC-1, DEC-2, DEC-5, DEC-6, IF-1, IF-2'
      likely_files:
        - 'src/test/java/io/morin/archicode/cli/MapLinksTest.java'
        - 'src/test/java/io/morin/archicode/rendering/plantuml/HighlightMarksTest.java (new)'
        - 'src/test/java/io/morin/archicode/cli/GenerateStoriesTest.java'
      acceptance_criteria:
        - 'The new tests fail before tasks 006 and 007 for the right reason; Prettier passes.'
      verification:
        - 'the commands of the task catalog'
      escalation_triggers:
        - 'a test needs a shipped file with highlight'
      suggested_subagent_type: 'general-purpose'
      suggested_model: '(default)'
      suggested_effort: 'medium'
    - task_id: task-006
      agent_role: 'Backend Implementation Agent'
      objective: 'Forward highlight through the adapter, Link, the step and ViewInPlateau so that the adapter tests pass.'
      context:
        prd_excerpts:
          - 'REQ-1, REQ-3, REQ-4, REQ-5, REQ-6'
        tdd_excerpts:
          - 'DEC-1, DEC-2, DEC-6, DEC-7, IMP-3, IMP-4, CON-2, CON-6'
      likely_files:
        - 'src/main/java/io/morin/archicode/viewpoint/kernel/MapLinks.java'
        - 'src/main/java/io/morin/archicode/viewpoint/kernel/KernelViewpointFactory.java'
        - 'src/main/java/io/morin/archicode/viewpoint/Link.java'
        - 'src/main/java/io/morin/archicode/resource/story/Story.java'
        - 'src/main/java/io/morin/archicode/cli/GenerateStoriesCommand.java'
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
      agent_role: 'Backend Implementation Agent'
      objective: 'Add HighlightMarks and call it from LinkRenderer so that HighlightMarksTest passes.'
      context:
        prd_excerpts:
          - 'REQ-2, REQ-5'
        tdd_excerpts:
          - 'DEC-5, IMP-5, CTR-5, RISK-2'
      likely_files:
        - 'src/main/java/io/morin/archicode/rendering/plantuml/HighlightMarks.java'
        - 'src/main/java/io/morin/archicode/rendering/plantuml/LinkRenderer.java'
      acceptance_criteria:
        - 'HighlightMarksTest passes and every existing .puml golden file is unchanged.'
      verification:
        - 'the commands of the task catalog'
      escalation_triggers:
        - 'an existing .puml golden file changes'
      suggested_subagent_type: 'general-purpose'
      suggested_model: '(default)'
      suggested_effort: 'medium'
    - task_id: task-008
      agent_role: 'Backend Implementation Agent'
      objective: 'Add the step key to READ_SCHEMA, rebuild the page and regenerate the manifest schema golden file.'
      context:
        prd_excerpts:
          - 'REQ-1, REQ-6'
        tdd_excerpts:
          - 'DEC-8, DEC-9, IMP-7, CTR-4'
      likely_files:
        - 'src/main/editor/core/read-schema.js'
        - 'src/main/resources/editor-webapp/standalone.html'
        - 'src/test/resources/schemas/manifest.schema.json'
      acceptance_criteria:
        - 'EditorReadSchemaTest, ManifestSchemaTest, editor:check and test:unit pass; the ratchet does not rise.'
      verification:
        - 'the commands of the task catalog'
      escalation_triggers:
        - 'names.json would change'
      suggested_subagent_type: 'general-purpose'
      suggested_model: '(default)'
      suggested_effort: 'medium'
    - task_id: task-009
      agent_role: 'Documentation Agent'
      objective: 'Add highlight to the guide, regenerate the golden file and extend GuideViewPropertiesTest.'
      context:
        prd_excerpts:
          - 'REQ-7'
        tdd_excerpts:
          - 'IMP-9, CTR-3, CTR-4'
      likely_files:
        - 'src/main/resources/guide/guide.md'
        - 'src/test/resources/guide/golden.md'
        - 'src/test/java/io/morin/archicode/cli/GuideViewPropertiesTest.java'
      acceptance_criteria:
        - 'GuideTest, GuideViewPropertiesTest and GuideCorpusTest pass within the 30 KB budget.'
      verification:
        - 'the commands of the task catalog'
      escalation_triggers:
        - 'the guide exceeds its budget'
      suggested_subagent_type: 'general-purpose'
      suggested_model: '(default)'
      suggested_effort: 'low'
    - task_id: task-010
      agent_role: 'Documentation Agent'
      objective: 'Write the highlight paragraphs of the manual and of CLAUDE.md as built.'
      context:
        prd_excerpts:
          - 'REQ-7'
        tdd_excerpts:
          - 'IMP-9, DEC-9'
      likely_files:
        - 'src/doc/README.adoc'
        - 'CLAUDE.md'
      acceptance_criteria:
        - 'The greps of the task catalog find the paragraphs and the manual builds.'
      verification:
        - 'the commands of the task catalog'
      escalation_triggers:
        - 'a sentence is not supported by the built behaviour'
      suggested_subagent_type: 'general-purpose'
      suggested_model: '(default)'
      suggested_effort: 'low'
    - task_id: task-011
      agent_role: 'QA Agent'
      objective: 'Run every gate check, render one file, and record the results in the prg.'
      context:
        prd_excerpts:
          - 'REQ-2, REQ-5, REQ-6'
        tdd_excerpts:
          - 'Observability and Verification, CON-4, CON-5, DEC-9, ASM-5'
      likely_files:
        - 'docs/wav/wav-026-relationship-view/run/run-0198-link-highlight/prg-0198-link-highlight.md'
      acceptance_criteria:
        - 'Every command exits 0 and byte-identity reports no unexpected difference.'
      verification:
        - 'the commands of the task catalog'
      escalation_triggers:
        - 'byte-identity reports a changed file'
      suggested_subagent_type: 'general-purpose'
      suggested_model: '(default)'
      suggested_effort: 'medium'
    - task_id: task-012
      agent_role: 'Documentation Agent'
      objective: 'Copy the sentences, the look and the limits as built into the run document.'
      context:
        prd_excerpts:
          - 'REQ-4, REQ-7'
        tdd_excerpts:
          - 'IMP-8, DEC-5, DEC-6'
      likely_files:
        - 'docs/wav/wav-026-relationship-view/run/run-0198-link-highlight/run-0198-link-highlight.md'
      acceptance_criteria:
        - 'Each quoted sentence appears word for word in a test.'
      verification:
        - 'grep -F of each sentence in the Java tests'
      escalation_triggers:
        - 'a sentence differs from the one the tests pin'
      suggested_subagent_type: 'general-purpose'
      suggested_model: '(default)'
      suggested_effort: 'low'
```

## 10. Escalation Rules

Escalate (record in the prg and stop the dependent tasks) when: an existing map test, golden `.puml` file or golden view changes; `scripts/byte-identity.sh` reports a change; the kernel contract number would have to move; a check fails twice for a cause outside this run; a sentence in a document differs from the one a test pins. This run operates under the autonomy override of complete-run, so a `human_required` task would have been executed without a stop; there is none, and the reviews of task-003 and of the gate are independent agent verifications.
