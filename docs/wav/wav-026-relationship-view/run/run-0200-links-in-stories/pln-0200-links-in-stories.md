---
title: Execution Plan — Play a flow of relationships in the editor and the story player
status: done
date: 2026-10-28
related:
  - docs/wav/wav-026-relationship-view/run/run-0200-links-in-stories/tdd-0200-links-in-stories.md
  - 'gh:tmorin/archicode#143'
  - docs/wav/wav-026-relationship-view/wav-026-relationship-view.md
type: pln
run: 0200
wave: 026
---

# Execution Plan: Play a flow of relationships in the editor and the story player

Profile TDD+pln: there is no PRD, so REQ-1 to REQ-9 are the IDs the TDD labels (section "PRD Traceability"), taken from #143 decision D11, the wave plan (W-6) and the deferred items of runs 0198 and 0199. The run operates under the autonomy override of complete-run: a task that would otherwise stop for a human is executed by an agent and the override is logged in the prg. No task below is `human_required`, and there are no human review gates. The workflow never commits: the commit of the editor sources with the regenerated page, the fixture and the sample is a human step outside this plan. The Stage 5 review findings F1 to F9 are logged in the prg and not yet applied to the TDD: task-001 applies them before any test is written.

## 1. Executive Summary

```yaml
summary:
  status: 'done'
  product_goal: 'The editor and the story player draw the highlight the kernel marks (a heavy link with a mark and a bold caption, the others calmer), an author can write a highlight on the Applications page, in a saved view and in a story step, a step highlight replaces the view highlight as on the command line, a rename or a move rewrites it, a story of a flow is shipped in the Brightcart fixture and loaded by both tools, and the manual, the guide and CLAUDE.md tell how to write one (REQ-1 to REQ-9).'
  technical_approach: 'Apply F1 to F9 to the TDD and read the fixture to settle the story and the pinned counts, write the node tests red first, add the live mapHighlight state, the pure stepViewForDrawing and the kernel input, draw dg-hl and dg-calm in the SVG renderer, add the authoring controls and the address, teach rename and move the step key, add the announcement for the player, add the story order_flow to the fixture with the byte-identity list, extend the shared contract with a Java test, add one end-to-end spec, then say it in the manual, the guide and CLAUDE.md and run the gate checks. No Java source, Rust or kernel change.'
  total_tasks: 13
  parallel_groups: 2
  high_risk_tasks: 2
  human_review_gates: 0
  autonomy_level: 'high'
  recommendation: 'proceed'
  criteria:
    - 'Node tests pin stepViewForDrawing (no key, a list, an empty list switching the view off, an own-recipe step, the saved view untouched), the filter and the cache key, the classes marker and glyph on exactly the highlighted links, the calm links, a compared highlighted link keeping its state, selection and focus still winning, the panel box and chip, the saved view in every place, the address hl=, the rename and the four ways of a move on the step key, and the player scene; a view, a step and a Map without highlight are drawn, saved and addressed byte for byte as before.'
    - 'The boxes and links the editor draws for a Map with highlight equal those of the command line on the shared contract file, highlighted or not, checked by a node test and by MapLinksSharedTest.'
    - 'The player plays every step of order_flow with one dg-hl link and one more link than the step before, announces the highlight, and the editor is what it was byte for byte after it closes.'
    - 'The story order_flow is loaded by both tools in a test, every pinned count is updated, sample:check passes and scripts/byte-identity.sh accepts the new files and nothing else.'
    - 'npm run editor:build, editor:check (ratchet max 99 or lower, no file over 3,000 lines), lint, format:check, test:unit and test:coverage pass with no floor lowered.'
    - 'The end-to-end spec story-flow.spec.js passes in Chromium and Firefox.'
    - 'test-compile pmd:check, verify and verify -DskipITs=false pass, with GuideTest on the regenerated golden file.'
    - 'The manual, the guide and CLAUDE.md no longer say the editor does not draw the highlight, and the manual has the section story-of-a-flow.'
```

## 2. PRD/TDD Consistency Assessment

```yaml
consistency_assessment:
  aligned_items:
    - 'REQ-1 to REQ-9 are each covered by a DEC and an IMP of the TDD, and each IMP is carried by a task below.'
    - 'The wave plan W-6 focus (a reader plays a story whose steps light up a sequence of relationships, in the editor and in the player, and the manual tells how to write one) equals the TDD scope.'
    - 'Q-1 to Q-3 are resolved inline in the TDD; no question stays open.'
    - 'Stage 9 scan against the TDD (every source_requirements ID, REQ, DEC, IMP, TG, CON, RISK, DEF, ASM, Q and CTR, exists in the TDD; no task names scope the TDD lacks) and against the repository (every likely_files and produces path that is not a new file was opened: the editor parts, layers.json, the fixture generator, the harness, the Java test, the e2e helpers and the guide files exist; each new file does not exist yet). Four defects were found and fixed in this pln: the contrast audit is src/test/javascript/viewpoint-kernel/css-theme-audit.test.js and the sample test is viewpoint-kernel/sample-brightcart.test.js (the pln gave no folder), task-003 did not list presentation/map-links.js although IMP-1 puts the factored rel= codec there, task-005 also claimed the hl= address that task-003 owns (DEC-1, IMP-1), and the task-001 verification grepped for strings that cannot tell whether F5 was applied.'
  gaps:
    - id: gap-001
      type: 'ambiguity'
      description: 'The Stage 5 findings F1 to F9 are logged in the prg but not applied: a step highlight has two written forms (F1), the marker of a compared highlighted link is undecided (F2), the end-to-end harness cannot copy the Brightcart fixture (F3), three paths and a line count are wrong (F4), the new part is undecided (F5), the rename functions are coupled by a comment (F6), the live state on leaving a story is unsaid (F7), the relationships of ASM-4 are loosely named (F8), REQ-8 bundles two kinds of limit (F9).'
      impact: 'medium'
      recommendation: 'task-001 applies them to the TDD, as the fixes written in the prg Findings table say, before any test is written.'
    - id: gap-002
      type: 'risk'
      description: 'Adding a story to the Brightcart fixture moves counts pinned in many tests and in the sample bundle, and the byte-identity harness reports the new files against the 0.19.0 jar (RISK-2, ASM-5).'
      impact: 'medium'
      recommendation: 'task-001 searches every pinned count and lists them in the prg; task-008 owns the update and the harness list with its self-check.'
    - id: gap-003
      type: 'risk'
      description: 'Several tasks rebuild the generated page and touch diagram-layout.js, events.js and story-entries.js, which are large shared files (CON-1, CON-3).'
      impact: 'medium'
      recommendation: 'Each task runs npm run editor:build and the editor:check ratchet before it ends; the parallel group rebuilds the page once at its end.'
  blocking_gaps: []
```

## 3. Execution Graph

```yaml
execution_graph:
  nodes:
    - id: task-001
      status: 'done'
      title: 'Apply the Stage 5 findings F1 to F9 to the TDD and read the fixture'
      depends_on: []
      produces:
        - 'tdd-0200-links-in-stories.md amended (DEC-1, DEC-2, DEC-4, DEC-5, DEC-7, DEC-8, ASM-4, REQ-8 split into REQ-8a and REQ-8b, IMP-1, IMP-5, IMP-6, IMP-10, the component diagram, the Review pass line)'
        - 'a list in the prg of every test and file that pins a count of the fixture stories or files'
      agent_role: 'Architecture Agent'
      autonomy: 'autonomous'
      risk: 'medium'
      confidence: 80
    - id: task-002
      status: 'done'
      title: 'Write the node tests and extend the shared contract file, red'
      depends_on: [task-001]
      produces:
        - 'src/test/javascript/map-highlight-model.test.js, map-highlight-diagram.test.js, map-highlight-saved-view.test.js, map-highlight-rename-move.test.js'
        - 'src/test/javascript/viewpoint-kernel/story-player-highlight.test.js'
        - 'src/test/javascript/map-links-shared.test.js and src/test/resources/map-links/expected-boxes.json extended with highlighted cases'
      agent_role: 'Test Generation Agent'
      autonomy: 'autonomous'
      risk: 'medium'
      confidence: 75
    - id: task-003
      status: 'done'
      title: 'Add the mapHighlight state, stepViewForDrawing and the kernel input'
      depends_on: [task-002]
      produces:
        - 'src/main/editor/model/ui-state.js, application/folder-session.js, application/layer-writes.js, model/stories-model.js, model/comparison.js'
        - 'src/main/editor/application/view-recipe.js, application/story-actions.js, presentation/map-state.js, presentation/diagram-page.js, presentation/story-scene.js, presentation/map-links.js (the rel= codec factored over a parameter name), composition/address-routing.js, persistence/save.js, names.json'
      agent_role: 'Frontend Implementation Agent'
      autonomy: 'autonomous'
      risk: 'high'
      confidence: 70
    - id: task-004
      status: 'done'
      title: 'Draw the highlight: dg-hl, dg-calm, the marker and the glyph'
      depends_on: [task-003]
      produces:
        - 'src/main/editor/presentation/diagram-layout.js, style.css'
      agent_role: 'Frontend Implementation Agent'
      autonomy: 'autonomous'
      risk: 'high'
      confidence: 70
    - id: task-005
      status: 'done'
      title: 'Add the authoring controls'
      depends_on: [task-003]
      produces:
        - 'src/main/editor/presentation/map-links.js, presentation/view-edit.js, presentation/stories-pages.js, application/story-actions.js, composition/events.js, names.json'
      agent_role: 'Frontend Implementation Agent'
      autonomy: 'autonomous'
      risk: 'medium'
      confidence: 70
    - id: task-006
      status: 'done'
      title: 'Rewrite the step highlight on a rename and a move'
      depends_on: [task-003]
      produces:
        - 'src/main/editor/application/story-entries.js, application/move.js'
      agent_role: 'Frontend Implementation Agent'
      autonomy: 'autonomous'
      risk: 'medium'
      confidence: 75
    - id: task-007
      status: 'done'
      title: 'Announce the highlight and play it in the story player'
      depends_on: [task-003]
      produces:
        - 'src/main/editor/presentation/story-scene.js, presentation/story-player.js'
      agent_role: 'Frontend Implementation Agent'
      autonomy: 'autonomous'
      risk: 'medium'
      confidence: 75
    - id: task-008
      status: 'done'
      title: 'Ship the story order_flow, update the pinned counts and the byte-identity list'
      depends_on: [task-003]
      produces:
        - 'src/test/resources/brightcart/description.mjs, generate.mjs, layered/shared/story.order_flow.yaml, expected/entries.json and the expected files that list stories'
        - 'src/main/resources/editor-webapp/samples/brightcart.yaml (npm run sample:build)'
        - 'scripts/byte-identity.sh, scripts/byte-identity-new-files.txt'
        - 'the tests and READMEs that pin a count, as listed by task-001'
      agent_role: 'Test Generation Agent'
      autonomy: 'autonomous'
      risk: 'high'
      confidence: 65
    - id: task-009
      status: 'done'
      title: 'Extend MapLinksSharedTest, the command line side of the contract'
      depends_on: [task-004, task-008]
      produces:
        - 'src/test/java/io/morin/archicode/cli/MapLinksSharedTest.java'
      agent_role: 'Test Generation Agent'
      autonomy: 'autonomous'
      risk: 'medium'
      confidence: 75
    - id: task-010
      status: 'done'
      title: 'Write the end-to-end spec story-flow.spec.js'
      depends_on: [task-005, task-006, task-007, task-008]
      produces:
        - 'src/test/e2e/story-flow.spec.js'
      agent_role: 'Test Generation Agent'
      autonomy: 'autonomous'
      risk: 'medium'
      confidence: 65
    - id: task-011
      status: 'done'
      title: 'Say the highlight in the manual, the guide and CLAUDE.md'
      depends_on: [task-005, task-007, task-008]
      produces:
        - 'src/doc/README.adoc (map-highlight, editor-map-links, editor-story-player, editor-stories, small-screen, the new story-of-a-flow), src/main/resources/guide/guide.md, src/test/resources/guide/golden.md, CLAUDE.md'
      agent_role: 'Documentation Agent'
      autonomy: 'autonomous'
      risk: 'low'
      confidence: 80
    - id: task-012
      status: 'done'
      title: 'Run the gate checks'
      depends_on: [task-009, task-010, task-011]
      produces:
        - 'a record of each command and its result in the prg'
      agent_role: 'QA Agent'
      autonomy: 'autonomous'
      risk: 'medium'
      confidence: 80
    - id: task-013
      status: 'done'
      title: 'Record the built behaviour, the sentences and the limits in the run document'
      depends_on: [task-012]
      produces:
        - 'run-0200-links-in-stories.md with the controls, the drawing, the shipped story, the deferred items DEF-1 to DEF-6 and the status set to done'
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
      reason: 'the model tests are red first (TDD)'
    - from: task-003
      to: task-004
      reason: 'the drawing reads link.highlighted that the kernel input now produces'
    - from: task-003
      to: task-005
      reason: 'the controls set the live state and the step key'
    - from: task-003
      to: task-006
      reason: 'the rewrite follows the step key that stepViewForDrawing reads'
    - from: task-003
      to: task-007
      reason: 'the announcement reads stepViewForDrawing'
    - from: task-003
      to: task-008
      reason: 'the editor must load the shipped story'
    - from: task-004
      to: task-009
      reason: 'the contract file is settled once the editor draws the highlight'
    - from: task-008
      to: task-009
      reason: 'the Java test works on a copy of the fixture'
    - from: task-005
      to: task-010
      reason: 'the spec ticks and highlights'
    - from: task-006
      to: task-010
      reason: 'the spec saves a step and reloads'
    - from: task-007
      to: task-010
      reason: 'the spec plays the story'
    - from: task-008
      to: task-010
      reason: 'the spec plays the shipped story'
    - from: task-005
      to: task-011
      reason: 'the manual describes the controls as built'
    - from: task-007
      to: task-011
      reason: 'the manual describes the announcement as built'
    - from: task-008
      to: task-011
      reason: 'the manual shows the shipped story as the example'
    - from: task-009
      to: task-012
      reason: 'the gate runs after the tests'
    - from: task-010
      to: task-012
      reason: 'the gate runs after the spec'
    - from: task-011
      to: task-012
      reason: 'the gate builds the manual and the guide'
    - from: task-012
      to: task-013
      reason: 'the record copies what the checks confirmed'
```

## 4. Task Catalog

```yaml
task_catalog:
  tasks:
    - id: task-001
      title: 'Apply the Stage 5 findings F1 to F9 to the TDD and read the fixture'
      source_requirements:
        prd:
          - 'REQ-3'
          - 'REQ-6'
          - 'REQ-8'
        tdd:
          - 'DEC-1, DEC-2, DEC-4, DEC-5, DEC-7, DEC-8, ASM-4, IMP-1, IMP-5, IMP-6, IMP-10, RISK-2'
          - 'prg-0200 Findings F1 to F9'
      outputs:
        - 'F1: one write place per step, stated in DEC-1, DEC-5 and FLOW-1: Add to story writes the step key highlight (links stay in properties.links), Keep as named view writes properties.highlight, the story editor field edits the step key; the manual section shows that one form; a test is named for it.'
        - 'F2: DEC-4 states that a compared highlighted link keeps its dg-arrow-state marker and gains the dg-hl weight, that dg-arrow-hl is for a link with no state, and that the marker is added to the defs only when a link is highlighted.'
        - 'F3: IMP-10 and Verification say the end-to-end spec uses startHostedPage() on the sample for the player and a files workspace written by the spec (as map-links.spec.js does) for the panel, step and save flow.'
        - 'F4: currentMapState is in presentation/map-state.js, the player test is in src/test/javascript/viewpoint-kernel/ beside story-player-page.js, events.js is 1,341 lines.'
        - 'F5: the panel box, chip and step-field helpers go in presentation/map-links.js, no new part, layers.json unchanged and names.json gains the new top-level names; the component diagram is redrawn and the none edge deleted.'
        - 'F6: DEC-7 and IMP-6 keep only the shared helper that yields the entry lists of a recipe and of a step; the comment-based coupling is dropped; one test stays.'
        - 'F7: DEC-1 or DEC-2 says that leaving a story keeps the last step live mapHighlight as it keeps mapLinks today, and the case goes to map-highlight-saved-view.test.js.'
        - 'F8: ASM-4 and DEC-8 name the three relationships as the baseline has them (customer to shop.web, shop.web to shop.app, shop.app.payments to psp) and say the step recipes open shop and shop.app.'
        - 'F9: REQ-8 is split into REQ-8a, the structural limits (ratchet, 3,000 lines, floors), and REQ-8b, the regression guards (byte-identity, CI); REQ-9 keeps its number so that every REQ id of this pln stays valid (a bare REQ-8 in this pln means both); IMP-8 traces to REQ-8b and IMP-9 to REQ-8a.'
        - 'A list in the prg of every test, README and fixture file that pins a count of the stories or files of the Brightcart fixture or the sample (search the numbers 3 stories, 7 views, 61 files, the entries.json totals).'
        - 'The Review pass line says the findings are applied.'
      verification:
        - 'grep -n "currentMapState" the TDD finds presentation/map-state.js; grep -c "map-highlight\.js" the TDD prints 0 (the new part is dropped from IMP-5 and from the component diagram); grep -c "1,341" the TDD prints 1.'
        - 'grep -n "dg-arrow-hl" the TDD finds the compared-link rule; grep -n "shop.app.payments" the TDD finds it in ASM-4 and DEC-8.'
        - 'grep -n "REQ-8a" and grep -n "REQ-8b" the TDD find the split, and grep -n "Leave story" the TDD finds the rule of F7.'
        - 'test -f the prg and grep -n "pinned count" the prg finds the list.'
      risk: 'medium'
      confidence: 80
      human_review: 'none'
      escalation_triggers:
        - 'a finding cannot be applied without changing a decision of DEC-1 to DEC-4'
        - 'the fixture cannot hold a story of three steps with the relationships named'
      delegation_tier: 'standard'
      results: 'tier standard, model sonnet, effort medium, profile low-cost, passed first time, inline (leaf), independently verified'
    - id: task-002
      title: 'Write the node tests and extend the shared contract file, red'
      source_requirements:
        prd:
          - 'REQ-1'
          - 'REQ-2'
          - 'REQ-3'
          - 'REQ-4'
          - 'REQ-5'
          - 'REQ-7'
        tdd:
          - 'DEC-1 to DEC-7, DEC-9'
          - 'Observability and Verification, RISK-1, RISK-3, RISK-4, RISK-6'
      outputs:
        - 'map-highlight-model.test.js: stepViewForDrawing (no key, a list, an empty list switching off, an own-recipe step, the saved view untouched), the filter on the drawn model, the cache key and the view key unchanged without a highlight.'
        - 'map-highlight-diagram.test.js: dg-hl, marker and glyph on exactly the highlighted links, dg-calm on the others, a compared link keeping its state and its marker, the aria text, selection and focus winning, the label layout measuring the glyph, the SVG of every shipped Map byte for byte as before, the contrast tokens in both themes (the method of src/test/javascript/viewpoint-kernel/css-theme-audit.test.js, extended or called from the new test).'
        - 'map-highlight-saved-view.test.js: read, write, canonical order, Keep as named view, the form field, setViewHighlight, the hl= address round trip, leaving a story, a view with a highlight now matching the screen, a view without highlight byte for byte as before.'
        - 'map-highlight-rename-move.test.js: a rename and each of the four ways of a move rewrite the step key highlight and properties.highlight, for a step with view and a step with its own recipe, the preview count, the shared helper of F6, and a story editor field that edits the place Add to story wrote (F1).'
        - 'story-player-highlight.test.js: every step of a story of a flow played in the modal, one dg-hl link per step, the announcement, the editor byte for byte after close, compared with the editing walk.'
        - 'map-links-shared.test.js and expected-boxes.json extended with cases that carry highlight, the expected values read from the command line (the packaged jar with JAVA_HOME of JDK 25, views generate -i on temporary copies); the script is not kept, the file is.'
      verification:
        - 'node --test on the five new files and map-links-shared.test.js fails on the new behaviour and every existing test still passes (the red run is recorded in the prg).'
        - 'No shipped file is edited by this task.'
        - 'npx prettier --check on the new files passes.'
      risk: 'medium'
      confidence: 75
      human_review: 'none'
      escalation_triggers:
        - 'an existing node test fails before the editor change'
        - 'the expected values cannot be read from the command line'
      delegation_tier: 'standard'
      results: 'tier standard, model sonnet, effort medium, profile low-cost, passed first time, inline (leaf), independently verified'
    - id: task-003
      title: 'Add the mapHighlight state, stepViewForDrawing and the kernel input'
      source_requirements:
        prd:
          - 'REQ-1'
          - 'REQ-3'
          - 'REQ-4'
          - 'REQ-8'
        tdd:
          - 'DEC-1, DEC-2, DEC-3, DEC-6, IMP-1, IMP-2, IMP-3, CTR-1, CTR-2, CTR-3, TG-1, TG-2, TG-3, TG-5, CON-1, CON-2, CON-3'
      outputs:
        - 'mapHighlight next to mapLinks in model/ui-state.js, reset by resetUiState, snapshotted and restored by snapshotWriteState and restoreWriteState, in the cache key and the view key only when non-empty.'
        - 'stepViewForDrawing in model/stories-model.js, used by goToStoryStep, storyStepScene and stepProblem; applySavedView sets or clears mapHighlight, currentViewDefinition and canonicalViewProperties write and sort properties.highlight.'
        - 'currentMapState and viewDiagramRecipe put the filtered highlight entries in mapState.highlight; buildKernelInput copies it to input.highlight for a Map of the application layer when non-empty; viewLinksProblem is called for the key highlight with the sentences of DEC-6.'
        - 'The hl= address parameter written and read by composition/address-routing.js, over the rel= codec of presentation/map-links.js factored over a parameter name (CTR-3); persistence/save.js rewriteUiReferences rewrites the live entries.'
        - 'names.json (node scripts/check-editor.mjs --write-names).'
      verification:
        - 'npm run editor:build and npm run editor:check exit 0; node scripts/check-editor.mjs --list shows a ratchet not above 99.'
        - 'node --test src/test/javascript/map-highlight-model.test.js passes (the other new tests, saved-view, diagram, rename-move, shared and the player, stay red until tasks 004 to 007: they need the drawing and the controls).'
        - 'npm run test:unit shows no existing test newly failing (story-player-scene.test.js and the walk comparison stay green).'
      risk: 'high'
      confidence: 70
      human_review: 'none'
      escalation_triggers:
        - 'a new top-level name collides with an existing one'
        - 'a part needs a function of a higher layer, which would add an upward pair'
        - 'a step without highlight draws differently from before'
      delegation_tier: 'standard'
      results: 'tier standard, model sonnet, effort medium, profile low-cost, the implementer was right and the verification of the plan was inconsistent with the task split; closed by the orchestrator after commit f49197e: map-highlight-model.test.js 11 of 11, editor:check and the ratchet 99 of 99, npm run test:unit 3223 tests, 36 fail, all of them new red tests of tasks 004 to 007, no existing test newly failing'
    - id: task-004
      title: 'Draw the highlight: dg-hl, dg-calm, the marker and the glyph'
      source_requirements:
        prd:
          - 'REQ-1'
          - 'REQ-7'
          - 'REQ-8'
        tdd:
          - 'DEC-4, IMP-4, RISK-1, RISK-4, TG-2, TG-3'
      outputs:
        - 'renderDiagramSvg computes highlighting once, gives a highlighted link dg-hl on its edge and label, the marker of F2, the glyph prefix in the caption and the aria text, and gives the other links dg-calm only when a link is highlighted; diagramLabelLayout measures the same text.'
        - 'style.css: the heavy stroke, the bold caption, the calm links, the tokens for both themes, the hover dim and the selected link still winning.'
        - 'Nothing is emitted when no link is highlighted; no new global name that the ratchet counts as upward.'
      verification:
        - 'node --test src/test/javascript/map-highlight-diagram.test.js and src/test/javascript/viewpoint-kernel/css-theme-audit.test.js pass.'
        - 'npm run editor:build and npm run editor:check exit 0.'
        - 'npm run test:unit shows the SVG of every shipped Map byte for byte as before.'
      risk: 'high'
      confidence: 70
      human_review: 'none'
      escalation_triggers:
        - 'the SVG of a Map with no highlight changes by one byte'
        - 'the calm and the heavy links fail the contrast check in one theme'
      delegation_tier: 'standard'
      results: 'tier standard, model sonnet, effort medium, profile low-cost, passed after escalation to effort high, inline (leaf), independently verified'
    - id: task-005
      title: 'Add the authoring controls'
      source_requirements:
        prd:
          - 'REQ-4'
          - 'REQ-3'
        tdd:
          - 'DEC-5, IMP-5, TG-5, CON-1, CON-2'
      outputs:
        - 'presentation/map-links.js: the Highlight box of each relationship row in the panel of a selected link (map-link-highlight), the chip Highlight: n and its Clear (map-highlight-clear).'
        - 'presentation/view-edit.js: setViewHighlight and the highlight field of the view form; presentation/stories-pages.js and application/story-actions.js: the step field (setStepHighlight) that edits the step key, and Add to story writing the step key.'
        - 'composition/events.js hooks only for the new actions and the select handlers; names.json gains the new names.'
      verification:
        - 'node --test src/test/javascript/map-highlight-saved-view.test.js and map-links-list.test.js pass.'
        - 'npm run editor:build, npm run editor:check and npm run lint exit 0.'
        - 'wc -l on the touched parts shows no file over 3,000 lines.'
      risk: 'medium'
      confidence: 70
      human_review: 'none'
      escalation_triggers:
        - 'a control needs render() in a part below composition/'
        - 'the panel box changes the markup of a Map with no highlight'
      delegation_tier: 'standard'
      results: 'tier standard, model sonnet, effort medium, profile low-cost, passed after escalation to effort high, inline (leaf), independently verified'
    - id: task-006
      title: 'Rewrite the step highlight on a rename and a move'
      source_requirements:
        prd:
          - 'REQ-5'
        tdd:
          - 'DEC-7, IMP-6, RISK-3'
      outputs:
        - 'application/story-entries.js: one helper yields the entry lists of a recipe and of a step; rewriteSavedViewReferences and recipeNamedReferences use it, so the step key highlight is rewritten and counted for a step with view as for one with its own recipe.'
        - 'application/move.js: the preview counts follow.'
      verification:
        - 'node --test src/test/javascript/map-highlight-rename-move.test.js and map-links-rename-move.test.js pass.'
        - 'npm run editor:build and npm run editor:check exit 0.'
      risk: 'medium'
      confidence: 75
      human_review: 'none'
      escalation_triggers:
        - 'a rename writes a file of a plateau it did not write before'
      delegation_tier: 'standard'
      results: 'tier standard, model sonnet, effort medium, profile low-cost, passed first time, inline (leaf), independently verified'
    - id: task-007
      title: 'Announce the highlight and play it in the story player'
      source_requirements:
        prd:
          - 'REQ-2'
          - 'REQ-7'
        tdd:
          - 'DEC-9, IMP-2, TG-4, CON-5, Q-3'
      outputs:
        - 'storyStepAnnouncement appends the highlighted ends and caption of a step that highlights something that exists; storyStepScene draws through stepViewForDrawing; the player markup keeps the classes of DEC-4 and reads no state of the editor.'
      verification:
        - 'node --test src/test/javascript/viewpoint-kernel/story-player-highlight.test.js, story-player-modal.test.js and story-player-scene.test.js pass.'
        - 'npm run editor:build and npm run editor:check exit 0.'
      risk: 'medium'
      confidence: 75
      human_review: 'none'
      escalation_triggers:
        - 'the editor differs by one byte after the player closes'
      delegation_tier: 'standard'
      results: 'tier standard, model sonnet, effort medium, profile low-cost, passed first time, inline (leaf), independently verified'
    - id: task-008
      title: 'Ship the story order_flow, update the pinned counts and the byte-identity list'
      source_requirements:
        prd:
          - 'REQ-6'
          - 'REQ-8'
        tdd:
          - 'DEC-8, IMP-7, IMP-8, ASM-4, ASM-5, RISK-2, CON-4'
      outputs:
        - 'order_flow in description.mjs ENTRIES and generate.mjs, written to layered/shared/story.order_flow.yaml, told at baseline, steps with their own recipe (viewpoint map, layer application, opened shop and shop.app, links the relationships so far, highlight the newest, written as the step key); expected/entries.json and the expected files that list stories regenerated.'
        - 'npm run sample:build regenerates src/main/resources/editor-webapp/samples/brightcart.yaml; npm run sample:check passes.'
        - 'Every test and README that pins a count, as listed by task-001, updated; stories/empty-steps.json untouched because no step draws nothing.'
        - 'scripts/byte-identity-new-files.txt and the harness read it, with a self-check that shows the list has teeth (bash 3.2).'
      verification:
        - 'node --test on src/test/javascript/viewpoint-kernel/brightcart-views-and-stories.test.js, story-steps-not-empty.test.js, sample-brightcart.test.js, build-sample-script.test.js and shipped-files.test.js pass.'
        - 'npm run sample:check exits 0.'
        - 'JAVA_HOME of JDK 25 ./mvnw test -Dtest=BrightcartViewsAndStoriesTest,StoriesNotEmptyTest,BrightcartSampleTest,ManifestSchemaCorpusTest exits 0 (the new manifest must conform to the schema).'
        - 'scripts/byte-identity.sh reports no difference but the files of order_flow, accepted by the new list.'
      risk: 'high'
      confidence: 65
      human_review: 'none'
      escalation_triggers:
        - 'the 0.19.0 jar fails on the new story instead of ignoring the keys'
        - 'a count is pinned in a place task-001 did not list'
      delegation_tier: 'standard'
      results: 'tier standard, model sonnet, effort medium, profile low-cost, passed first time, inline (leaf), independently verified'
    - id: task-009
      title: 'Extend MapLinksSharedTest, the command line side of the contract'
      source_requirements:
        prd:
          - 'REQ-7'
        tdd:
          - 'DEC-9, IMP-10, Observability and Verification'
      outputs:
        - 'MapLinksSharedTest reads the extended expected-boxes.json and checks the heavy and the plain links of the .puml files that views generate -i writes on a temporary copy of the fixture; no src/main/java file changes.'
      verification:
        - 'JAVA_HOME of JDK 25 ./mvnw test -Dtest=MapLinksSharedTest exits 0.'
        - 'node --test src/test/javascript/map-links-shared.test.js passes (the editor side of the same file).'
      risk: 'medium'
      confidence: 75
      human_review: 'none'
      escalation_triggers:
        - 'the editor and the command line disagree on a link of the contract file'
      delegation_tier: 'standard'
      results: 'tier standard, model sonnet, effort medium, profile low-cost, passed first time, inline (leaf), independently verified'
    - id: task-010
      title: 'Write the end-to-end spec story-flow.spec.js'
      source_requirements:
        prd:
          - 'REQ-2'
          - 'REQ-4'
        tdd:
          - 'IMP-10, Observability and Verification, CON-6, DEF-6'
      outputs:
        - 'src/test/e2e/story-flow.spec.js: on startHostedPage() with the sample, play order_flow step by step (one dg-hl link per step, one more link than the last, Escape returns the focus to Play, nothing written); on a files workspace written by the spec, tick and highlight a relationship, add a step, save, reload and find the same highlight and the step key on disk.'
      verification:
        - 'npx playwright test src/test/e2e/story-flow.spec.js --project=chromium --project=firefox passes after ./mvnw package -Dmaven.test.skip -Dplugin.asciidoctor.skip=true with JAVA_HOME of JDK 25.'
        - 'npm run lint and npm run format:check pass on the spec.'
      risk: 'medium'
      confidence: 65
      human_review: 'none'
      escalation_triggers:
        - 'the spec is flaky in two runs; drop the flow with its reason, never retry'
      delegation_tier: 'standard'
      results: 'tier standard, model sonnet, effort medium, profile low-cost, passed first time, inline (leaf), independently verified'
    - id: task-011
      title: 'Say the highlight in the manual, the guide and CLAUDE.md'
      source_requirements:
        prd:
          - 'REQ-9'
          - 'REQ-6'
        tdd:
          - 'IMP-11, DEC-8, RISK-5'
      outputs:
        - 'src/doc/README.adoc: map-highlight loses the sentence that the editor does not draw it; editor-map-links, editor-story-player, editor-stories and the small-screen section gain the highlight; the new section story-of-a-flow shows order_flow with the one written form of F1 and says canonicalViewProperties now sorts highlight.'
        - 'src/main/resources/guide/guide.md: one convention paragraph (the relationships so far in links, the newest in highlight, one step each); src/test/resources/guide/golden.md regenerated with the sed command of CLAUDE.md.'
        - 'CLAUDE.md: the paragraphs of W-4 and W-5 lose their limits and the new behaviour is told where it belongs.'
      verification:
        - 'JAVA_HOME of JDK 25 ./mvnw test -Dtest=GuideTest,GuideViewPropertiesTest,ManualExamplesTest exits 0.'
        - 'grep -c "does not draw" in the sections map-highlight and editor-map-links of src/doc/README.adoc prints 0 for the highlight.'
        - 'grep -n "story-of-a-flow" src/doc/README.adoc finds the anchor.'
      risk: 'low'
      confidence: 80
      human_review: 'none'
      escalation_triggers:
        - 'the golden file differs by more than the new paragraph'
      delegation_tier: 'cheap'
      results: 'tier cheap, model haiku, effort high, profile low-cost, passed after escalation to effort medium, inline (leaf), independently verified'
    - id: task-012
      title: 'Run the gate checks'
      source_requirements:
        prd:
          - 'REQ-8'
          - 'REQ-1'
          - 'REQ-2'
          - 'REQ-7'
        tdd:
          - 'Observability and Verification, CON-1, CON-3, CON-4, CON-6'
      outputs:
        - 'A record in the prg of the result of each command of the verification.'
      verification:
        - 'npm run editor:build, npm run editor:check, npm run lint, npm run format:check, npm run sample:check exit 0; node scripts/check-editor.mjs --list shows a ratchet not above 99.'
        - 'npm run test:unit and npm run test:coverage exit 0 with no floor lowered; npm run test:timing exits 0.'
        - 'JAVA_HOME of JDK 25 ./mvnw test-compile pmd:check then ./mvnw verify -DskipITs=false exit 0.'
        - 'npm run test:e2e passes in Chromium and Firefox; scripts/byte-identity.sh shows no unexpected difference.'
      risk: 'medium'
      confidence: 80
      results: 'tier standard, model sonnet, effort medium, profile low-cost, done by the orchestrator after the commit 6dead76: lint, format:check, editor:check (ratchet 99 of 99) and sample:check exit 0, npm run test:unit 3223 tests, 3222 pass, 0 fail, 1 skipped by design; the heavy runs (verify, coverage, e2e, byte-identity) belong to the gate P3 agent'
      human_review: 'none'
      escalation_triggers:
        - 'a floor must be lowered to pass'
        - 'a check fails twice for a reason that is not in the files this run touched'
      delegation_tier: 'standard'
    - id: task-013
      title: 'Record the built behaviour, the sentences and the limits in the run document'
      source_requirements:
        prd:
          - 'REQ-9'
        tdd:
          - 'Deferred Work, Open Questions'
      outputs:
        - 'run-0200-links-in-stories.md with the controls, the drawing, the shipped story, the sentences, DEF-1 to DEF-6, what the run does not prove (the tag run, the native runner, WebKit, the real Safari) and the status set to done.'
      verification:
        - 'grep -n "^status: done" the run document finds it.'
        - 'grep -n "DEF-6" the run document finds the deferred list.'
      risk: 'low'
      confidence: 90
      human_review: 'none'
      escalation_triggers:
        - 'a gate result of task-012 is not green'
      delegation_tier: 'cheap'
      results: 'tier cheap, model haiku, effort high, profile low-cost, passed first time, inline (leaf), independently verified'
```

## 5. Parallelization Plan

```yaml
parallelization_plan:
  groups:
    - id: parallel-group-001
      tasks:
        - task-004
        - task-005
        - task-006
        - task-007
        - task-008
      reason: 'All depend on task-003 only and write different files: the SVG renderer and the stylesheet, the panel and the form and the events, story-entries.js, the scene and the player, and the fixture with the sample.'
      conflict_risks:
        - 'task-003 owns address-routing.js, the rel= codec and the hl= parameter; task-005 adds the controls to map-links.js, view-edit.js, stories-pages.js and story-actions.js after task-003 has ended, and no other task of the group edits those files.'
        - 'task-005 adds actions to composition/events.js, the largest file; no other task of the group edits it.'
        - 'names.json and the generated page are shared: each task regenerates the page with npm run editor:build and the group ends with one editor:check; names.json is written by node scripts/check-editor.mjs --write-names after the group, not by two tasks at once.'
        - 'task-008 changes the fixture that tests of task-005 to task-007 may load; those tasks use fixtures built in the test, not the shipped folder.'
    - id: parallel-group-002
      tasks:
        - task-009
        - task-010
        - task-011
      reason: 'Java test, end-to-end spec and documents write different files and read the page built by group 1.'
      conflict_risks:
        - 'task-010 needs the packaged jar built from the page of group 1; task-009 and task-011 run Maven tests and must not run ./mvnw clean while the jar is built.'
        - 'task-011 regenerates golden.md, which GuideTest in task-009 does not read.'
  sequential_note: 'task-001, task-002 and task-003 are a chain (design, red tests, the shared state the rest builds on), and task-012 and task-013 close the run.'
```

## 6. Human Review Gates

```yaml
human_review_gates:
  gates: []
  note: 'No gate. The run operates under the autonomy override of complete-run, so the commit of the page with the sources, the fixture and the sample, and the opening of the follow-up issue for DEF-1, are the author steps after the run, outside the plan.'
```

## 7. Risk Assessment

```yaml
risk_assessment:
  by_task:
    - id: task-001
      risk: 'medium'
      rationale: 'Nine findings across several decisions; a finding that reopens a decision would stop the chain.'
    - id: task-002
      risk: 'medium'
      rationale: 'The contract file is read from the command line by hand and must not encode a guess.'
    - id: task-003
      risk: 'high'
      rationale: 'The state, the cache key and the recipe are read by every page that draws a Map; a byte moved for a view without highlight breaks the regression guard (TG-3).'
    - id: task-004
      risk: 'high'
      rationale: 'renderDiagramSvg is shared by every diagram; the compared and highlighted case and the dark theme are easy to get wrong (RISK-1, RISK-4).'
    - id: task-005
      risk: 'medium'
      rationale: 'Three small UIs on one model, and events.js is the largest file.'
    - id: task-006
      risk: 'medium'
      rationale: 'Two functions rewrite the same entries and must agree (RISK-3).'
    - id: task-007
      risk: 'medium'
      rationale: 'The player must stay decoupled from the editor (CON-5).'
    - id: task-008
      risk: 'high'
      rationale: 'A story added to a shared fixture moves counts pinned in many tests and in the sample, and the harness compares against the 0.19.0 jar (RISK-2).'
    - id: task-009
      risk: 'medium'
      rationale: 'Two tools must agree link by link.'
    - id: task-010
      risk: 'medium'
      rationale: 'Browser specs start a server and a browser; flakiness is dropped, never retried.'
    - id: task-011
      risk: 'low'
      rationale: 'Text and a golden file regenerated by a documented command.'
    - id: task-012
      risk: 'medium'
      rationale: 'Long checks; a failure may come from an earlier task.'
    - id: task-013
      risk: 'low'
      rationale: 'A record of what the checks confirmed.'
  by_area:
    - area: 'ui'
      risk: 'high'
      rationale: 'The SVG of every Map goes through the same renderer.'
    - area: 'data'
      risk: 'medium'
      rationale: 'A shipped fixture and its generated sample change; no user data and no migration.'
    - area: 'api'
      risk: 'low'
      rationale: 'No kernel, Java or command-line contract change; the step key highlight already exists since run 0198.'
    - area: 'docs'
      risk: 'low'
      rationale: 'The manual, the guide and CLAUDE.md; the guide has a golden file.'
```

## 8. Confidence Assessment

```yaml
confidence_assessment:
  by_task:
    - id: task-001
      score: 80
      rationale: 'Each fix is written in the prg Findings table.'
    - id: task-002
      score: 75
      rationale: 'The patterns of run 0199 apply; the player test reuses story-player-page.js.'
    - id: task-003
      score: 70
      rationale: 'The state follows mapLinks, but the step override touches three callers.'
    - id: task-004
      score: 70
      rationale: 'The renderer is large and the compared case is new.'
    - id: task-005
      score: 70
      rationale: 'Follows the controls of run 0199.'
    - id: task-006
      score: 75
      rationale: 'The same rule extended to one more place.'
    - id: task-007
      score: 75
      rationale: 'The player plays the same scene function.'
    - id: task-008
      score: 65
      rationale: 'The pinned counts are searched, not known, and the harness is bash 3.2.'
    - id: task-009
      score: 75
      rationale: 'The Java test of run 0199 is the model.'
    - id: task-010
      score: 65
      rationale: 'The hosted sample and a files workspace are two harness paths.'
    - id: task-011
      score: 80
      rationale: 'Documents with a regeneration command.'
    - id: task-012
      score: 80
      rationale: 'Commands that exist.'
    - id: task-013
      score: 90
      rationale: 'A copy of the confirmed results.'
```

## 9. Agent Assignment Plan

```yaml
agent_assignment_plan:
  assignments:
    - task_id: task-001
      agent_role: 'Architecture Agent'
      objective: 'Apply F1 to F9 to the TDD and list the pinned counts of the fixture.'
      context:
        prd_excerpts:
          - 'REQ-3, REQ-6, REQ-8 (labelled in the TDD, no PRD).'
        tdd_excerpts:
          - 'DEC-1, DEC-4, DEC-5, DEC-7, DEC-8, ASM-4, IMP-5, IMP-6, IMP-10.'
      likely_files:
        - 'docs/wav/wav-026-relationship-view/run/run-0200-links-in-stories/tdd-0200-links-in-stories.md'
        - 'docs/wav/wav-026-relationship-view/run/run-0200-links-in-stories/prg-0200-links-in-stories.md'
        - 'src/test/resources/brightcart/description.mjs'
      acceptance_criteria:
        - 'Each finding F1 to F9 is applied as the prg Findings table says.'
        - 'The prg lists every pinned count.'
      verification:
        - 'The grep checks of the task.'
      escalation_triggers:
        - 'a finding changes a decision'
      suggested_subagent_type: 'general-purpose'
      suggested_model: '(default)'
      suggested_effort: 'medium'
    - task_id: task-002
      agent_role: 'Test Generation Agent'
      objective: 'Write the red node tests and extend the shared contract file from the command line.'
      context:
        prd_excerpts:
          - 'REQ-1 to REQ-5, REQ-7.'
        tdd_excerpts:
          - 'Observability and Verification, DEC-2, DEC-4, DEC-7, DEC-9.'
      likely_files:
        - 'src/test/javascript/map-highlight-model.test.js'
        - 'src/test/javascript/map-highlight-diagram.test.js'
        - 'src/test/javascript/map-highlight-saved-view.test.js'
        - 'src/test/javascript/map-highlight-rename-move.test.js'
        - 'src/test/javascript/viewpoint-kernel/story-player-highlight.test.js'
        - 'src/test/javascript/map-links-shared.test.js'
        - 'src/test/resources/map-links/expected-boxes.json'
      acceptance_criteria:
        - 'The new tests fail for the missing behaviour and the existing suite passes.'
      verification:
        - 'node --test on the new files; npx prettier --check.'
      escalation_triggers:
        - 'an existing test fails first'
      suggested_subagent_type: 'general-purpose'
      suggested_model: '(default)'
      suggested_effort: 'medium'
    - task_id: task-003
      agent_role: 'Frontend Implementation Agent'
      objective: 'Add the live state, the step override and the kernel input without moving a byte for a view with no highlight.'
      context:
        prd_excerpts:
          - 'REQ-1, REQ-3, REQ-4, REQ-8.'
        tdd_excerpts:
          - 'DEC-1, DEC-2, DEC-3, DEC-6, IMP-1 to IMP-3.'
      likely_files:
        - 'src/main/editor/model/ui-state.js'
        - 'src/main/editor/model/stories-model.js'
        - 'src/main/editor/model/comparison.js'
        - 'src/main/editor/application/view-recipe.js'
        - 'src/main/editor/application/layer-writes.js'
        - 'src/main/editor/application/story-actions.js'
        - 'src/main/editor/presentation/map-state.js'
        - 'src/main/editor/presentation/diagram-page.js'
        - 'src/main/editor/presentation/story-scene.js'
        - 'src/main/editor/composition/address-routing.js'
        - 'src/main/editor/names.json'
      acceptance_criteria:
        - 'The model and saved-view tests pass and the ratchet is not above 99.'
      verification:
        - 'npm run editor:build; npm run editor:check; node --test on the two files; npm run test:unit.'
      escalation_triggers:
        - 'a step without highlight draws differently'
      suggested_subagent_type: 'general-purpose'
      suggested_model: '(default)'
      suggested_effort: 'high'
    - task_id: task-004
      agent_role: 'Frontend Implementation Agent'
      objective: 'Draw the kernel flag in the SVG renderer and the stylesheet.'
      context:
        prd_excerpts:
          - 'REQ-1, REQ-7, REQ-8.'
        tdd_excerpts:
          - 'DEC-4 as amended by F2, IMP-4.'
      likely_files:
        - 'src/main/editor/presentation/diagram-layout.js'
        - 'src/main/editor/style.css'
      acceptance_criteria:
        - 'The diagram tests pass and the SVG of a Map with no highlight is unchanged.'
      verification:
        - 'node --test src/test/javascript/map-highlight-diagram.test.js src/test/javascript/viewpoint-kernel/css-theme-audit.test.js; npm run editor:check.'
      escalation_triggers:
        - 'a byte moves for a Map with no highlight'
      suggested_subagent_type: 'general-purpose'
      suggested_model: '(default)'
      suggested_effort: 'high'
    - task_id: task-005
      agent_role: 'Frontend Implementation Agent'
      objective: 'Add the panel box, the chip, the view field and the step field.'
      context:
        prd_excerpts:
          - 'REQ-3, REQ-4.'
        tdd_excerpts:
          - 'DEC-5 as amended by F1 and F5, IMP-5.'
      likely_files:
        - 'src/main/editor/presentation/map-links.js'
        - 'src/main/editor/presentation/view-edit.js'
        - 'src/main/editor/presentation/stories-pages.js'
        - 'src/main/editor/application/story-actions.js'
        - 'src/main/editor/composition/events.js'
      acceptance_criteria:
        - 'The controls set and clear the live state and write the one form of F1.'
      verification:
        - 'node --test map-highlight-saved-view.test.js map-links-list.test.js; npm run lint; npm run editor:check.'
      escalation_triggers:
        - 'a control needs render() below composition/'
      suggested_subagent_type: 'general-purpose'
      suggested_model: '(default)'
      suggested_effort: 'medium'
    - task_id: task-006
      agent_role: 'Frontend Implementation Agent'
      objective: 'Make rename and move follow the step highlight through one shared helper.'
      context:
        prd_excerpts:
          - 'REQ-5.'
        tdd_excerpts:
          - 'DEC-7 as amended by F6, IMP-6.'
      likely_files:
        - 'src/main/editor/application/story-entries.js'
        - 'src/main/editor/application/move.js'
      acceptance_criteria:
        - 'The rename and move tests pass for both kinds of step.'
      verification:
        - 'node --test map-highlight-rename-move.test.js map-links-rename-move.test.js.'
      escalation_triggers:
        - 'a file of another plateau is written'
      suggested_subagent_type: 'general-purpose'
      suggested_model: '(default)'
      suggested_effort: 'medium'
    - task_id: task-007
      agent_role: 'Frontend Implementation Agent'
      objective: 'Announce the highlight and keep the player decoupled.'
      context:
        prd_excerpts:
          - 'REQ-2, REQ-7.'
        tdd_excerpts:
          - 'DEC-9, TG-4, CON-5.'
      likely_files:
        - 'src/main/editor/presentation/story-scene.js'
        - 'src/main/editor/presentation/story-player.js'
      acceptance_criteria:
        - 'The player tests pass and the editor is unchanged after close.'
      verification:
        - 'node --test story-player-highlight.test.js story-player-modal.test.js story-player-scene.test.js.'
      escalation_triggers:
        - 'the editor differs after close'
      suggested_subagent_type: 'general-purpose'
      suggested_model: '(default)'
      suggested_effort: 'medium'
    - task_id: task-008
      agent_role: 'Test Generation Agent'
      objective: 'Add order_flow to the fixture, regenerate the sample, fix the pinned counts and the harness list.'
      context:
        prd_excerpts:
          - 'REQ-6, REQ-8.'
        tdd_excerpts:
          - 'DEC-8 as amended by F8, IMP-7, IMP-8, ASM-5.'
      likely_files:
        - 'src/test/resources/brightcart/description.mjs'
        - 'src/test/resources/brightcart/generate.mjs'
        - 'src/test/resources/brightcart/layered/shared/story.order_flow.yaml'
        - 'src/test/resources/brightcart/expected/entries.json'
        - 'src/main/resources/editor-webapp/samples/brightcart.yaml'
        - 'scripts/byte-identity.sh'
        - 'scripts/byte-identity-new-files.txt'
      acceptance_criteria:
        - 'Both tools load the story in a test, sample:check passes and the harness accepts only the new files.'
      verification:
        - 'The commands of the task verification.'
      escalation_triggers:
        - 'the base jar fails on the story'
      suggested_subagent_type: 'general-purpose'
      suggested_model: '(default)'
      suggested_effort: 'high'
    - task_id: task-009
      agent_role: 'Test Generation Agent'
      objective: 'Check the command line side of the contract file for highlighted links.'
      context:
        prd_excerpts:
          - 'REQ-7.'
        tdd_excerpts:
          - 'DEC-9, IMP-10.'
      likely_files:
        - 'src/test/java/io/morin/archicode/cli/MapLinksSharedTest.java'
        - 'src/test/resources/map-links/expected-boxes.json'
      acceptance_criteria:
        - 'The Java test and the node test pass on one file.'
      verification:
        - './mvnw test -Dtest=MapLinksSharedTest; node --test map-links-shared.test.js.'
      escalation_triggers:
        - 'the two tools disagree on a link'
      suggested_subagent_type: 'general-purpose'
      suggested_model: '(default)'
      suggested_effort: 'medium'
    - task_id: task-010
      agent_role: 'Test Generation Agent'
      objective: 'Write the end-to-end spec of the player and the authoring flow.'
      context:
        prd_excerpts:
          - 'REQ-2, REQ-4.'
        tdd_excerpts:
          - 'Observability and Verification with F3, CON-6.'
      likely_files:
        - 'src/test/e2e/story-flow.spec.js'
        - 'src/test/e2e/hosted.js'
        - 'src/test/e2e/workspace.js'
      acceptance_criteria:
        - 'The spec passes in Chromium and Firefox.'
      verification:
        - 'npx playwright test on the spec.'
      escalation_triggers:
        - 'a flow is flaky twice'
      suggested_subagent_type: 'general-purpose'
      suggested_model: '(default)'
      suggested_effort: 'high'
    - task_id: task-011
      agent_role: 'Documentation Agent'
      objective: 'Tell the highlight in the manual, the guide and CLAUDE.md.'
      context:
        prd_excerpts:
          - 'REQ-9.'
        tdd_excerpts:
          - 'IMP-11.'
      likely_files:
        - 'src/doc/README.adoc'
        - 'src/main/resources/guide/guide.md'
        - 'src/test/resources/guide/golden.md'
        - 'CLAUDE.md'
      acceptance_criteria:
        - 'The guide tests and the manual examples pass.'
      verification:
        - './mvnw test -Dtest=GuideTest,GuideViewPropertiesTest,ManualExamplesTest.'
      escalation_triggers:
        - 'the golden file changes beyond the paragraph'
      suggested_subagent_type: 'general-purpose'
      suggested_model: 'haiku'
      suggested_effort: 'low'
    - task_id: task-012
      agent_role: 'QA Agent'
      objective: 'Run every gate check and log the results.'
      context:
        prd_excerpts:
          - 'REQ-8.'
        tdd_excerpts:
          - 'Observability and Verification.'
      likely_files:
        - 'docs/wav/wav-026-relationship-view/run/run-0200-links-in-stories/prg-0200-links-in-stories.md'
      acceptance_criteria:
        - 'Every command exits 0, no floor lowered.'
      verification:
        - 'The commands of the task verification.'
      escalation_triggers:
        - 'a floor must be lowered'
      suggested_subagent_type: 'general-purpose'
      suggested_model: '(default)'
      suggested_effort: 'medium'
    - task_id: task-013
      agent_role: 'Documentation Agent'
      objective: 'Record what was built and what is deferred, and set the run to done.'
      context:
        prd_excerpts:
          - 'REQ-9.'
        tdd_excerpts:
          - 'Deferred Work.'
      likely_files:
        - 'docs/wav/wav-026-relationship-view/run/run-0200-links-in-stories/run-0200-links-in-stories.md'
      acceptance_criteria:
        - 'The run document carries the record and the status done.'
      verification:
        - 'The greps of the task.'
      escalation_triggers:
        - 'a gate result is not green'
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
        - 'grep checks on the TDD'
      success_criteria:
        - 'The nine fixes are present and the count list is in the prg.'
    - task_id: task-002
      methods:
        - 'node --test on the new files'
        - 'prettier check'
      success_criteria:
        - 'The new tests are red for the missing behaviour; the old ones are green.'
    - task_id: task-003
      methods:
        - 'unit tests'
        - 'npm run editor:check'
      success_criteria:
        - 'The model and saved-view tests pass; the ratchet is not above 99; no regression.'
    - task_id: task-004
      methods:
        - 'unit tests'
        - 'contrast audit'
      success_criteria:
        - 'The diagram tests pass and the SVG with no highlight is unchanged.'
    - task_id: task-005
      methods:
        - 'unit tests'
        - 'lint'
      success_criteria:
        - 'The controls write the one form and clear the state.'
    - task_id: task-006
      methods:
        - 'unit tests'
      success_criteria:
        - 'Both kinds of step are rewritten and counted.'
    - task_id: task-007
      methods:
        - 'unit tests'
      success_criteria:
        - 'Every step plays, is announced, and the editor is unchanged after close.'
    - task_id: task-008
      methods:
        - 'unit tests'
        - 'Java tests'
        - 'sample check'
        - 'regression check (byte-identity)'
      success_criteria:
        - 'Both tools load order_flow; only its files differ from the 0.19.0 jar.'
    - task_id: task-009
      methods:
        - 'contract test'
      success_criteria:
        - 'The two tools agree link by link on the contract file.'
    - task_id: task-010
      methods:
        - 'end-to-end tests'
      success_criteria:
        - 'The spec passes in Chromium and Firefox.'
    - task_id: task-011
      methods:
        - 'Java tests on the guide and the manual'
      success_criteria:
        - 'GuideTest, GuideViewPropertiesTest and ManualExamplesTest pass.'
    - task_id: task-012
      methods:
        - 'static analysis (PMD, ESLint, Prettier)'
        - 'full unit, coverage, integration and end-to-end runs'
        - 'regression check (byte-identity)'
      success_criteria:
        - 'Every command exits 0 and no floor is lowered.'
    - task_id: task-013
      methods:
        - 'file checks'
      success_criteria:
        - 'The run document says done and lists the deferred items.'
```

## 11. Escalation Rules

```yaml
escalation_rules:
  rules:
    - condition: 'A task fails its own verification'
      action: 'Re-dispatch it once one rung up with the failing output, working from the files as they stand; a second failure is handled inline and logged as a finding in the prg.'
    - condition: 'A Map, a view, a step or an address without highlight changes by one byte'
      action: 'Stop the task, find the new key or class that is emitted without a highlight, and remove it; never update a golden file or an expected SVG to hide it.'
    - condition: 'The ratchet would rise above 99, a file would pass 3,000 lines, or a coverage floor would have to go down'
      action: 'Move the code to the layer that owns it or add the test; lowering a floor is a decision for the author and is logged as a blocker.'
    - condition: 'The 0.19.0 jar fails on the shipped story instead of ignoring the keys, or the harness shows a difference outside the new list'
      action: 'Log it as a blocker, keep the story out of the shipped fixture and build it in a temporary folder instead, and tell the author.'
    - condition: 'A step needs a human decision (the autonomy override is in force)'
      action: 'The task is executed by an agent under the override of complete-run and the override is logged in the prg; this plan has no human_required task.'
    - condition: 'The editor and the command line disagree on a highlighted link of the contract file'
      action: 'The command line is the reference; fix the editor, or log the difference as pinned with its reason.'
```

## 12. Final Execution Manifest

```yaml
execution_manifest:
  status: 'done'
  recommendation: 'proceed'
  autonomy_level: 'high'
  total_tasks: 13
  autonomous_tasks: 13
  review_before_tasks: 0
  review_after_tasks: 0
  human_required_tasks: 0
  blocked_tasks: 0
  critical_path_tasks:
    - task-001
    - task-002
    - task-003
    - task-004
    - task-009
    - task-012
    - task-013
  parallel_groups:
    - parallel-group-001
    - parallel-group-002
  required_human_gates: []
  highest_risk_tasks:
    - task-003
    - task-004
    - task-008
  lowest_confidence_tasks:
    - task-008
    - task-010
    - task-003
  next_action: 'none: every task is done and Stage 11 confirmed the criteria (2026-10-29).'
  criteria:
    - 'Every criterion of the Executive Summary holds and the gate checks of task-012 are recorded green in the prg.'
```
