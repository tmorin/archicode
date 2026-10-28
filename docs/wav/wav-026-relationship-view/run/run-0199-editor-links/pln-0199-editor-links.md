---
title: Execution Plan — Pick the relationships of a Map in the editor
status: done
date: 2026-10-28
related:
  - docs/wav/wav-026-relationship-view/run/run-0199-editor-links/tdd-0199-editor-links.md
  - 'gh:tmorin/archicode#143'
  - docs/wav/wav-026-relationship-view/wav-026-relationship-view.md
type: pln
run: 0199
wave: 026
---

# Execution Plan: Pick the relationships of a Map in the editor

Profile TDD+pln: there is no PRD, so REQ-1 to REQ-8 are the IDs the TDD labels (section "PRD Traceability"), taken from #143 decision D11 and the wave plan (W-5). The run operates under the autonomy override of complete-run: a task that would otherwise stop for a human is executed by an agent and the override is logged in the prg. No task below is `human_required`. The workflow never commits: the commit of the editor sources with the regenerated page is a human step outside this plan. The Stage 5 review findings F1 to F9 are logged in the prg and not yet applied to the TDD: task-001 applies them before any test is written.

## 1. Executive Summary

```yaml
summary:
  status: 'done'
  product_goal: 'The editor reads, draws, writes and follows the links property of a Map view of the application layer: an author ticks relationships in a list on the page Applications or keeps the relationships of a clicked link, the choice is kept in a saved view, a step recipe and the address, a rename or a move rewrites the entries in every view and step, and highlight is kept and rewritten but not drawn (REQ-1 to REQ-8).'
  technical_approach: 'Apply F1 to F9 to the TDD, write the node tests red first, add the pure model/map-links.js and register it, add the mapLinks view state and send links to the kernel input and the cache key, teach the saved view, the form, the story scene and the address, add the list, the chip and the panel buttons, make the rename and the move rewrite links and highlight, share an expected-boxes contract with a Java test, add one end-to-end spec, then say it in the manual and CLAUDE.md and run the gate checks. No Java, Rust or kernel change.'
  total_tasks: 12
  parallel_groups: 2
  high_risk_tasks: 1
  human_review_gates: 0
  autonomy_level: 'high'
  recommendation: 'proceed'
  criteria:
    - 'Node tests pin the entry model (key, label rule on map-links-cases.json, exists, rewrite), the list, the panel buttons and chip, the saved view in every place that carries pinned, the address, the rename and the four ways of a move, and the plateau cases; a view without links is drawn, saved and addressed byte for byte as before.'
    - 'The boxes and links the editor draws for a Map with links equal those of the command line on the shared contract file, checked by a node test and by MapLinksSharedTest.'
    - 'highlight is never dropped by an edit in place, a canonical rewrite or a rename, and is neither read nor drawn.'
    - 'npm run editor:build, editor:check (ratchet max 99 or lower, no file over 3,000 lines), lint, format:check, test:unit and test:coverage pass with no floor lowered.'
    - 'The end-to-end spec map-links.spec.js passes in Chromium and Firefox: two relationships ticked in the list, one link kept from the diagram, a named view saved, the file on disk holds links, a reload draws the same boxes, a rename rewrites the entry on disk.'
    - 'test-compile pmd:check, verify and verify -DskipITs=false pass; scripts/byte-identity.sh reports no unexpected difference; no shipped file carries links or highlight.'
    - 'The manual and CLAUDE.md no longer say the editor does not read links.'
```

## 2. PRD/TDD Consistency Assessment

```yaml
consistency_assessment:
  aligned_items:
    - 'REQ-1 to REQ-8 are each covered by a DEC and an IMP of the TDD, and each IMP is carried by a task below.'
    - 'The wave plan W-5 focus (list, click, boxes follow, saved view keeps the choice through a rename or a move) equals the TDD scope.'
    - 'Q-1 (load check in a layered workspace) is declined inline and recorded as DEF-1; Q-2 is resolved by ASM-1; no question stays open.'
    - 'Stage 9 scan against the TDD and the repository: every source_requirements ID (REQ-1 to REQ-8, DEC, IMP, FLOW, RISK, CON, TG, DEF) exists in the TDD; every existing likely_file exists at the path named (application/view-recipe.js, presentation/diagram-page.js, persistence/save.js, application/story-entries.js, composition/address-routing.js and the others) and each new file (model/map-links.js, presentation/map-links.js, src/test/resources/map-links, MapLinksSharedTest.java, map-links.spec.js) does not exist yet; the six corrections of Stage 9 (shared lists layers.json and names.json, where the recipe is, the red state of the shared test, the contract file origin, the map-link-add control, the greps of task-010) are applied below.'
  gaps:
    - id: gap-001
      type: 'ambiguity'
      description: 'The Stage 5 findings F1 to F9 are logged in the prg but not applied: the rename rewrite functions are in application/story-entries.js and not persistence/save.js (F1); the filter of links is in currentMapState and viewDiagramRecipe and buildKernelInput only copies (F2); DEF-1 hides that run 0197 named W-5 as owner (F3); the view state variables and their reset and restore are not listed (F4); one condition has three sentences (F5); the effect of highlight on viewMatchesScreen is not named (F6); small errors of path, size and encoding (F7); eight test files and a third control (F8); data-key escaping (F9).'
      impact: 'medium'
      recommendation: 'task-001 applies them to the TDD before any test is written, as the fixes written in the prg Findings section say.'
    - id: gap-002
      type: 'risk'
      description: 'Several tasks rebuild the generated page and touch diagram-page.js, events.js and save.js, which are large shared files (CON-4, RISK-3).'
      impact: 'medium'
      recommendation: 'The new code goes in the two new parts; check-editor.mjs (names, ratchet) runs after each task that edits src/main/editor; the parallel group rebuilds the page once at its end.'
    - id: gap-003
      type: 'risk'
      description: 'The load check of links in a layered workspace, which run 0197 gave to W-5, is declined (DEC-10): a typo in a layered workspace stays a warning in the command line.'
      impact: 'low'
      recommendation: 'Recorded in DEF-1 and in the wave Findings by task-012 so the author may open the follow-up issue; not a blocker.'
    - id: gap-004
      type: 'risk'
      description: 'A view with a highlight never matches the screen (DEC-7), so Keep as named view could create a second view (F6).'
      impact: 'low'
      recommendation: 'task-001 names the effect in the TDD; task-002 pins it in the saved-view test.'
  blocking_gaps: []
```

## 3. Execution Graph

```yaml
execution_graph:
  nodes:
    - id: task-001
      status: 'done'
      title: 'Apply the Stage 5 findings F1 to F9 to the TDD'
      depends_on: []
      produces:
        - 'tdd-0199-editor-links.md amended (paths of DEC-10, FLOW-4, IMP-7; DEC-5, DEC-6, DEC-7 (f); DEF-1; the list of view state variables; the Review pass line)'
      agent_role: 'Architecture Agent'
      autonomy: 'autonomous'
      risk: 'medium'
      confidence: 80
    - id: task-002
      status: 'done'
      title: 'Write the node tests and the shared contract file, red'
      depends_on: [task-001]
      produces:
        - 'src/test/javascript/map-links-model.test.js, map-links-list.test.js, map-links-diagram.test.js, map-links-saved-view.test.js, map-links-rename-move.test.js and map-links-shared.test.js (the address and plateau cases go in the saved-view and diagram files)'
        - 'src/test/resources/map-links/expected-boxes.json'
      agent_role: 'Test Generation Agent'
      autonomy: 'autonomous'
      risk: 'medium'
      confidence: 75
    - id: task-003
      status: 'done'
      title: 'Add the pure entry model model/map-links.js and register it'
      depends_on: [task-002]
      produces:
        - 'src/main/editor/model/map-links.js, layers.json (the line of model/map-links.js), names.json'
      agent_role: 'Frontend Implementation Agent'
      autonomy: 'autonomous'
      risk: 'medium'
      confidence: 80
    - id: task-004
      status: 'done'
      title: 'Add the mapLinks state and send links to the kernel input, the cache key and the recipe'
      depends_on: [task-003]
      produces:
        - 'src/main/editor/model/ui-state.js, presentation/map-state.js, application/folder-session.js, application/layer-writes.js'
        - 'src/main/editor/model/comparison.js, presentation/diagram-page.js (viewDiagramRecipe, diagramCacheKey, the view key, nothingDrawnScene), presentation/story-scene.js, names.json (node scripts/check-editor.mjs --write-names)'
      agent_role: 'Frontend Implementation Agent'
      autonomy: 'autonomous'
      risk: 'high'
      confidence: 70
    - id: task-005
      status: 'done'
      title: 'Read and write links in the saved view, its form and the story step'
      depends_on: [task-004]
      produces:
        - 'src/main/editor/application/view-recipe.js, presentation/view-edit.js, presentation/stories-pages.js'
      agent_role: 'Frontend Implementation Agent'
      autonomy: 'autonomous'
      risk: 'medium'
      confidence: 75
    - id: task-006
      status: 'done'
      title: 'Rewrite links and highlight on a rename and a move'
      depends_on: [task-004]
      produces:
        - 'src/main/editor/application/story-entries.js, persistence/save.js (rewriteUiReferences)'
      agent_role: 'Frontend Implementation Agent'
      autonomy: 'autonomous'
      risk: 'medium'
      confidence: 75
    - id: task-007
      status: 'done'
      title: 'Add the list, the chip, the panel buttons, the events and the address'
      depends_on: [task-004]
      produces:
        - 'src/main/editor/presentation/map-links.js (new), layers.json (the line of presentation/map-links.js), names.json (node scripts/check-editor.mjs --write-names), presentation/diagram-page.js, presentation/right-panel.js, style.css'
        - 'src/main/editor/composition/events.js, composition/address-routing.js'
      agent_role: 'Frontend Implementation Agent'
      autonomy: 'autonomous'
      risk: 'medium'
      confidence: 70
    - id: task-008
      status: 'done'
      title: 'Write MapLinksSharedTest, the command line side of the contract'
      depends_on: [task-006, task-007]
      produces:
        - 'src/test/java/io/morin/archicode/cli/MapLinksSharedTest.java'
      agent_role: 'Test Generation Agent'
      autonomy: 'autonomous'
      risk: 'medium'
      confidence: 75
    - id: task-009
      status: 'done'
      title: 'Write the end-to-end spec map-links.spec.js'
      depends_on: [task-005, task-006, task-007]
      produces:
        - 'src/test/e2e/map-links.spec.js'
      agent_role: 'Test Generation Agent'
      autonomy: 'autonomous'
      risk: 'medium'
      confidence: 70
    - id: task-010
      status: 'done'
      title: 'Say the editor links in the manual and in CLAUDE.md'
      depends_on: [task-005, task-006, task-007]
      produces:
        - 'src/doc/README.adoc (editor sections and map-links), CLAUDE.md'
      agent_role: 'Documentation Agent'
      autonomy: 'autonomous'
      risk: 'low'
      confidence: 80
    - id: task-011
      status: 'done'
      title: 'Run the gate checks'
      depends_on: [task-008, task-009, task-010]
      produces:
        - 'a record of each command and its result in the prg'
      agent_role: 'QA Agent'
      autonomy: 'autonomous'
      risk: 'medium'
      confidence: 80
    - id: task-012
      status: 'done'
      title: 'Record the built behaviour, the sentences and the limits in the run document'
      depends_on: [task-011]
      produces:
        - 'run-0199-editor-links.md with the controls, the address form, the highlight limit, the declined load check (DEF-1) and the status set to done'
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
      reason: 'the state and the kernel input call the entry model'
    - from: task-004
      to: task-005
      reason: 'the saved view reads the recipe and the state'
    - from: task-004
      to: task-006
      reason: 'rewriteUiReferences rewrites the live mapLinks'
    - from: task-004
      to: task-007
      reason: 'the list and the click set the state'
    - from: task-006
      to: task-008
      reason: 'the Java test reads files an editor-style rename wrote'
    - from: task-007
      to: task-008
      reason: 'the contract file is settled once the editor draws the choice'
    - from: task-005
      to: task-009
      reason: 'the spec keeps a named view'
    - from: task-006
      to: task-009
      reason: 'the spec renames an end'
    - from: task-007
      to: task-009
      reason: 'the spec ticks and clicks'
    - from: task-005
      to: task-010
      reason: 'the manual describes the built form of a view'
    - from: task-006
      to: task-010
      reason: 'the manual describes the rename as built'
    - from: task-007
      to: task-010
      reason: 'the manual describes the list and the click as built'
    - from: task-008
      to: task-011
      reason: 'the gate runs after the tests'
    - from: task-009
      to: task-011
      reason: 'the gate runs after the spec'
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
      title: 'Apply the Stage 5 findings F1 to F9 to the TDD'
      source_requirements:
        prd:
          - 'REQ-4'
          - 'REQ-5'
        tdd:
          - 'DEC-5, DEC-6, DEC-7, DEC-10, FLOW-4, IMP-7, DEF-1, CON-4, Observability and Verification'
          - 'prg-0199 Findings F1 to F9'
      outputs:
        - 'F1: DEC-10, FLOW-4, Scope and IMP-7 name application/story-entries.js for rewriteRecipeReferences, rewriteSavedViewReferences and recipeNamedReferences, and persistence/save.js for rewriteUiReferences only.'
        - 'F2 and F5: one place makes the filter (the recipe builders currentMapState and viewDiagramRecipe put the filtered entries in mapState.links, buildKernelInput copies them), and one table in DEC-7 (f) maps each condition to its sentence, to which DEC-5 and DEC-6 refer.'
        - 'F3: DEF-1 says run 0197 named W-5 as owner, this run declines with the reason, and the wave Findings record it.'
        - 'F4: one list of the new view state variables with their reset (resetUiState) and restore (snapshotWriteState and restoreWriteState), and how mapStateOf technology gives an empty links.'
        - 'F6: DEC-7 names what the author sees for a view that carries highlight (viewMatchesScreen, story-entries.js, story-actions.js).'
        - 'F7, F9: the file size and encoding corrections (composition/events.js is the largest file, encodeURIComponent in address-routing.js, no Java source under src/main), data-key escaped and a quote case in map-links-list.test.js.'
        - 'F8, decided here so that the tests and task-007 follow one text: IMP-9 and Observability and Verification list six node test files (map-links-model, map-links-list, map-links-diagram with the address and plateau cases, map-links-saved-view, map-links-rename-move, map-links-shared), and DEC-4, IMP-4 and FLOW-2 drop the map-link-add control (a link drawn under a non-empty choice stands only for ticked relationships, so no drawn link has none of its relationships ticked, and a link that is not drawn is added from the list); the actions are map-link-toggle, map-link-only and map-links-clear.'
        - 'The Review pass line says the findings are applied.'
      verification:
        - 'grep -n "story-entries.js" the TDD finds it in DEC-10, FLOW-4 and IMP-7.'
        - 'grep -n "restoreWriteState" the TDD finds it in DEC-1 or the list of variables.'
        - 'grep -n "run 0197" the TDD DEF-1 finds the reassignment.'
        - 'grep -c "map-link-add" the TDD prints 0; grep -c "map-links-rename-move.test.js" the TDD prints a count above 0 and grep -c "map-links-plateau.test.js" prints 0.'
      risk: 'medium'
      confidence: 80
      human_review: 'none'
      escalation_triggers:
        - 'a finding cannot be applied without changing a decision of DEC-1 to DEC-4'
      delegation_tier: 'standard'
      results: "tier standard, model sonnet, effort medium, profile low-cost, passed first time, inline (leaf), independently verified"
    - id: task-002
      title: 'Write the node tests and the shared contract file, red'
      source_requirements:
        prd:
          - 'REQ-1'
          - 'REQ-2'
          - 'REQ-3'
          - 'REQ-4'
          - 'REQ-5'
        tdd:
          - 'DEC-2, DEC-3, DEC-4, DEC-5, DEC-6, DEC-7, DEC-8, DEC-10'
          - 'Observability and Verification, RISK-2, RISK-4'
      outputs:
        - 'map-links-model.test.js: the key, the label rule on the cases of src/test/javascript/viewpoint-kernel/map-links-cases.json including exists, the shape sentences, rewrite, canonical order.'
        - 'map-links-list.test.js: rows, filter by source, destination, kind and text, the 200 row cap, ticked only, a missing entry kept, accessible names, a label with a quote.'
        - 'map-links-diagram.test.js: panel buttons, empty state, chip, a grouped link adds each relationship, the address round trip (rel=, entries unknown dropped, no rel when empty), the plateau cases (entry the plateau lacks, all lacking, comparison with a removed relationship, a facet).'
        - 'map-links-saved-view.test.js: read, write, order, Keep as named view, form pills, setViewLink, setViewLayer and setViewViewpoint dropping the keys, highlight kept through every edit in place, a view without links byte for byte as before, the line-preserving save.'
        - 'map-links-rename-move.test.js: a rename and each of the four ways of a move rewrite links and highlight in views and in steps with a recipe, the preview count, the sibling dialog, no change for another layer.'
        - 'map-links-shared.test.js and src/test/resources/map-links/expected-boxes.json: the editor boxes and links on the contract file. The file is written from the command line, the reference: the packaged jar (./mvnw package -Dmaven.test.skip -Dplugin.asciidoctor.skip=true with JAVA_HOME of JDK 25) runs views generate -i on temporary copies of a shipped example and of the layered Brightcart that carry the cases saved views, and the sorted boxes and links read from the written files are the expected values; the script that does it is not kept, the file is.'
      verification:
        - 'node --test on the six new files fails on the new behaviour and every existing test still passes (the red run is recorded in the prg); map-links-shared.test.js is red because the editor draws a saved view that has links as the whole map, which is the limit of ASM-3 of run 0197.'
        - 'The cases of expected-boxes.json name the references of the workspace they use; no shipped file is edited (DEC-9).'
        - 'npx prettier --check on the new files passes.'
      risk: 'medium'
      confidence: 75
      human_review: 'none'
      escalation_triggers:
        - 'an existing node test fails before the editor change'
        - 'a test needs a shipped file that carries links (DEC-9 forbids it)'
      delegation_tier: 'standard'
      results: "tier standard, model sonnet, effort medium, profile low-cost, passed first time, inline (leaf), independently verified"
    - id: task-003
      title: 'Add the pure entry model model/map-links.js and register it'
      source_requirements:
        prd:
          - 'REQ-1'
          - 'REQ-3'
          - 'REQ-4'
          - 'REQ-6'
        tdd:
          - 'DEC-2, IMP-1, TG-1, TG-5, CON-1, CON-3'
      outputs:
        - 'model/map-links.js: linkEntryOf, linkEntryKey, linkEntriesOf, canonicalLinkEntries, linkEntryExists, rewriteLinkEntries (takes rewriteReferenceValue as a parameter); uses core only.'
        - 'layers.json (before model/comparison.js) and names.json (node scripts/check-editor.mjs --write-names).'
      verification:
        - 'npm run editor:build and npm run editor:check exit 0; the ratchet is not above 99.'
        - 'node --test src/test/javascript/map-links-model.test.js passes.'
      risk: 'medium'
      confidence: 80
      human_review: 'none'
      escalation_triggers:
        - 'a new top-level name collides with an existing one'
        - 'the part needs a function of a higher layer'
      delegation_tier: 'standard'
      results: "tier standard, model sonnet, effort medium, profile low-cost, passed after escalation to effort high, inline (leaf), independently verified"
    - id: task-004
      title: 'Add the mapLinks state and send links to the kernel input, the cache key and the recipe'
      source_requirements:
        prd:
          - 'REQ-3'
          - 'REQ-5'
          - 'REQ-6'
        tdd:
          - 'DEC-1, DEC-5, DEC-6, IMP-2, IMP-5, TG-2, TG-4, CON-2'
      outputs:
        - 'mapLinks next to mapPinned, reset by resetUiState, snapshotted by snapshotWriteState and put back by restoreWriteState; mapStateOf application gains links and technology gives an empty one.'
        - 'The recipe builders put the filtered entries in mapState.links; buildKernelInput writes input.links only for a Map of the application layer when non-empty; diagramCacheKey and the view key add the entries only when there are some; the story scene reads the recipe.'
        - 'The empty state of the scene when a choice is not empty and none of its entries exists.'
      verification:
        - 'node --test on the cases of map-links-diagram.test.js that pin the state, the kernel input, the cache key and the empty state passes (the list, panel and address cases are task-007, the saved view cases of the shared test are task-005); npm run test:unit exits 0 with every existing key string unchanged for a view without links.'
        - 'npm run editor:check exits 0.'
      risk: 'high'
      confidence: 70
      human_review: 'after'
      escalation_triggers:
        - 'a key or a kernel input of a Map without links changes by one byte'
        - 'a new upward pair appears in node scripts/check-editor.mjs --list'
        - 'a redraw is requested from a part below composition other than through requestRedraw'
      delegation_tier: 'standard'
      results: "tier standard, model sonnet, effort medium, profile low-cost, passed after escalation to effort high, inline (leaf), independently verified"
    - id: task-005
      title: 'Read and write links in the saved view, its form and the story step'
      source_requirements:
        prd:
          - 'REQ-4'
          - 'REQ-5'
        tdd:
          - 'DEC-7, IMP-5, IMP-6, FLOW-3, ASM-3'
      outputs:
        - 'applySavedView sets mapLinks, canonicalViewProperties keeps links (sorted, deduped, label absent when none) after opened and highlight verbatim, currentViewDefinition, viewProblem, VIEW_PROPERTY_ORDER, setViewLink, the Links field with pills, setViewLayer and setViewViewpoint dropping the keys, viewMatchesScreen.'
        - 'The condition-to-sentence table of DEC-7 (f) for a view none of whose entries exists.'
      verification:
        - 'node --test src/test/javascript/map-links-saved-view.test.js and src/test/javascript/map-links-shared.test.js pass.'
        - 'npm run test:unit exits 0; a saved view without links writes byte for byte as before.'
      risk: 'medium'
      confidence: 75
      human_review: 'none'
      escalation_triggers:
        - 'highlight is dropped or reordered by an edit in place'
        - 'the line-preserving save loses a comment or a quote around links'
      delegation_tier: 'standard'
      results: "tier standard, model sonnet, effort medium, profile low-cost, passed first time, inline (leaf), independently verified"
    - id: task-006
      title: 'Rewrite links and highlight on a rename and a move'
      source_requirements:
        prd:
          - 'REQ-4'
        tdd:
          - 'DEC-10, IMP-7, FLOW-4, RISK-4'
      outputs:
        - 'rewriteRecipeReferences rewrites the source and destination of links and highlight of Map views of the layer in one pass with pinned and marks the entry changed; recipeNamedReferences lists the same ends; rewriteUiReferences rewrites the live mapLinks; move.js is unchanged and counts the same rewrite.'
      verification:
        - 'node --test src/test/javascript/map-links-rename-move.test.js passes.'
        - 'npm run test:unit exits 0 (the move and rename tests of pinned are unchanged).'
      risk: 'medium'
      confidence: 75
      human_review: 'none'
      escalation_triggers:
        - 'move.js needs an edit'
        - 'a view of the technology layer is changed by the rewrite'
      delegation_tier: 'standard'
      results: "tier standard, model sonnet, effort medium, profile low-cost, passed first time, inline (leaf), independently verified"
    - id: task-007
      title: 'Add the list, the chip, the panel buttons, the events and the address'
      source_requirements:
        prd:
          - 'REQ-1'
          - 'REQ-2'
          - 'REQ-5'
          - 'REQ-6'
        tdd:
          - 'DEC-3, DEC-4, DEC-5, DEC-8, IMP-3, IMP-4, FLOW-1, FLOW-2, RISK-1'
      outputs:
        - 'presentation/map-links.js: the Relationships list below the tree (filter, kind select, ticked only, 200 row cap, missing entries kept), the chip with Clear, the panel controls; hooks in diagram-page.js and right-panel.js; CSS at desktop and at 360 px.'
        - 'events.js actions map-link-toggle, map-link-only and map-links-clear (DEC-4 as amended by task-001 has no map-link-add) and the filter field redrawing the list only without losing focus; address-routing.js rel= parameters, read by syncPerspectiveFromHash and written by currentRouteHash, built with encodeURIComponent.'
      verification:
        - 'node --test on map-links-list.test.js, map-links-diagram.test.js passes; npm run test:unit exits 0.'
        - 'npm run editor:build, editor:check, lint and format:check exit 0; wc -l on every touched part is under 3,000.'
        - 'The list is looked at in the Browser pane at 360 px and the focus order is described in the prg.'
      risk: 'medium'
      confidence: 70
      human_review: 'none'
      escalation_triggers:
        - 'render() would be called outside composition'
        - 'the ratchet rises'
        - 'the filter field loses focus on a keystroke'
      delegation_tier: 'standard'
      results: "tier standard, model sonnet, effort medium, profile low-cost, passed first time, inline (leaf), independently verified"
    - id: task-008
      title: 'Write MapLinksSharedTest, the command line side of the contract'
      source_requirements:
        prd:
          - 'REQ-3'
          - 'REQ-4'
        tdd:
          - 'DEC-8, IMP-9, RISK-6, CON-6'
      outputs:
        - 'MapLinksSharedTest: the cases of expected-boxes.json run through views generate on a copy of the layered Brightcart in a temp folder, and the files after an editor-style rename read back through views generate -i; a failure names the case.'
      verification:
        - './mvnw test -Dtest=MapLinksSharedTest passes with JAVA_HOME of JDK 25.'
        - './mvnw test-compile pmd:check exits 0 with no suppression added; npx prettier --check on the file passes.'
        - 'git status shows no change under src/test/resources/brightcart.'
      risk: 'medium'
      confidence: 75
      human_review: 'none'
      escalation_triggers:
        - 'the editor and the command line disagree on a case: record which is right and escalate, do not edit the case to fit'
        - 'a test needs a Java source change under src/main'
      delegation_tier: 'standard'
      results: "tier standard, model sonnet, effort medium, profile low-cost, passed first time, inline (leaf), independently verified"
    - id: task-009
      title: 'Write the end-to-end spec map-links.spec.js'
      source_requirements:
        prd:
          - 'REQ-7'
        tdd:
          - 'Observability and Verification, FLOW-1, FLOW-2, FLOW-3, FLOW-4, CON-8'
      outputs:
        - 'src/test/e2e/map-links.spec.js: open a copy of a shipped example with application relationships, tick two in the list, click a link and keep its relationships, check the boxes and the address, keep a named view, save, read the file on disk, reload and find the same boxes, rename an end and find the entry rewritten on disk. It uses the serve fixture and the pageErrors fixture and stays out of WebKit.'
      verification:
        - 'JAVA_HOME of JDK 25: ./mvnw package -Dmaven.test.skip -Dplugin.asciidoctor.skip=true, then npx playwright test src/test/e2e/map-links.spec.js --project=chromium --project=firefox passes.'
        - 'npm run lint and npm run format:check pass on the spec.'
      risk: 'medium'
      confidence: 70
      human_review: 'none'
      escalation_triggers:
        - 'the spec needs a retry to pass'
        - 'Playwright browsers are not installed: record it, do not install system libraries'
      delegation_tier: 'standard'
      results: "tier standard, model sonnet, effort medium, profile low-cost, passed first time, inline (leaf), independently verified"
    - id: task-010
      title: 'Say the editor links in the manual and in CLAUDE.md'
      source_requirements:
        prd:
          - 'REQ-8'
        tdd:
          - 'IMP-10, DEC-9'
      outputs:
        - 'README.adoc: the list and the click in the Map section, the rewrite in [[editor-rename]], the list at 360 px in [[editor-small-screen]], [[map-links]] no longer saying the editor does not read links, and [[map-highlight]] no longer saying the editor drops the key when it saves a view (it keeps it and does not draw it until W-6); no include of a shipped file.'
        - 'CLAUDE.md: the paragraph of links and highlight says the editor now reads links, keeps and rewrites highlight and does not draw it, and the limits (the load check declined, W-6).'
      verification:
        - 'grep -nE "until W-5|does not send or read it|the editor does not read them yet|does not read, draw or keep" CLAUDE.md src/doc/README.adoc prints nothing.'
        - 'grep -n "include::.*links" src/doc/README.adoc prints nothing.'
        - 'git diff --stat shows src/main/resources/guide/guide.md and src/test/resources/guide/golden.md unchanged.'
      risk: 'low'
      confidence: 80
      human_review: 'none'
      escalation_triggers:
        - 'a sentence needs behaviour the built editor does not have'
      delegation_tier: 'standard'
      results: "tier standard, model sonnet, effort medium, profile low-cost, passed first time, inline (leaf), independently verified"
    - id: task-011
      title: 'Run the gate checks'
      source_requirements:
        prd:
          - 'REQ-3'
          - 'REQ-6'
          - 'REQ-7'
        tdd:
          - 'Observability and Verification, CON-1, CON-3, CON-4, CON-7, DEC-9'
      outputs:
        - 'The full result of each command listed in the verification, with the exit code, in the prg.'
      verification:
        - 'npm run editor:build then npm run editor:check, lint, format:check, test:unit, test:coverage and test:timing exit 0; node scripts/check-editor.mjs --list shows 99 pairs or fewer.'
        - 'JAVA_HOME of JDK 25: ./mvnw test-compile pmd:check, ./mvnw verify and ./mvnw verify -DskipITs=false exit 0.'
        - 'scripts/byte-identity.sh exits 0 with no difference outside scripts/byte-identity-exceptions.txt.'
        - 'npm run test:e2e -- src/test/e2e/map-links.spec.js passes in Chromium and Firefox.'
        - 'grep -rlE "^[[:space:]]*(links|highlight):" --include=*.yaml --include=*.yml --include=*.toml --include=*.json src prints no shipped workspace file.'
      risk: 'medium'
      confidence: 80
      human_review: 'none'
      escalation_triggers:
        - 'a check fails twice for a cause outside this run'
        - 'byte-identity reports a changed file'
        - 'a coverage floor would be lowered'
      delegation_tier: 'standard'
      results: "tier standard, model sonnet, effort medium, profile low-cost, passed first time, inline (leaf), independently verified"
    - id: task-012
      title: 'Record the built behaviour, the sentences and the limits in the run document'
      source_requirements:
        prd:
          - 'REQ-4'
          - 'REQ-8'
        tdd:
          - 'DEF-1 to DEF-6, DEC-7, DEC-10, RISK-5'
      outputs:
        - 'run-0199-editor-links.md: the controls and the address form as built, the sentences the editor says for a choice none of whose entries exists, the highlight limit until W-6, the declined load check for the wave Findings, the files that were outside the TDD scope if any, and the status set to done.'
      verification:
        - 'Each sentence quoted in the run document appears word for word in a node test (grep -F).'
      risk: 'low'
      confidence: 90
      human_review: 'none'
      escalation_triggers:
        - 'a sentence in the run document differs from the one the tests pin'
      delegation_tier: 'cheap'
      results: "tier cheap, model haiku, effort high, profile low-cost, passed after escalation to effort medium, inline (leaf), independently verified"
```

## 5. Parallelization Plan

```yaml
parallelization_plan:
  groups:
    - id: parallel-group-001
      tasks:
        - task-005
        - task-006
        - task-007
      reason: 'After the state and the kernel input of task-004, the saved view and its form, the rename and the move, and the list with the events and the address touch different parts of src/main/editor.'
      conflict_risks:
        - 'task-007 and task-004 both touch diagram-page.js: task-007 starts after task-004 and adds hooks only.'
        - 'task-005 and task-006 both read view-recipe.js and story-entries.js: task-005 edits view-recipe.js, view-edit.js and stories-pages.js, task-006 edits story-entries.js and save.js; neither edits the other files.'
        - 'Each runs npm run editor:build and writes the same standalone.html: the page is a pure function of the sources, so the last build wins and the gate task rebuilds once more.'
        - 'layers.json: task-003 adds model/map-links.js before the group, task-007 adds presentation/map-links.js; no other task adds a part. names.json is rewritten from the page by node scripts/check-editor.mjs --write-names, so each task that adds a top-level name runs it after its own build and the gate task runs it once more; a hand edit of names.json is not made.'
        - 'style.css belongs to task-007: task-005 reports a style it needs instead of editing the file.'
    - id: parallel-group-002
      tasks:
        - task-008
        - task-009
        - task-010
      reason: 'The Java contract test, the end-to-end spec and the documents are disjoint files that only read the built editor.'
      conflict_risks:
        - 'task-008 and task-009 both run Maven or build the jar: they use different target subfolders only if run one after the other, so they build the jar at most once and never run at the same moment.'
        - 'task-010 reads the built behaviour and edits no code.'
```

## 6. Human Review Gates

```yaml
human_review_gates:
  gates: []
```

No gate is required. The run operates under the autonomy override of complete-run, so a reviewer would have been executed and logged; none is planned. Task-004 carries `human_review: after` (the kernel input and the cache key are shared by every Map): the review after it is the independent verification of the implement workflow, not a stop. The commit of the sources with the regenerated page, and any comment on #143 or the follow-up issue for DEF-1, are left to the author, outside this plan.

## 7. Risk Assessment

```yaml
risk_assessment:
  by_task:
    - id: task-001
      risk: 'medium'
      rationale: 'The findings change what the tests pin; a wrong reading would be repeated in every later task.'
    - id: task-002
      risk: 'medium'
      rationale: 'The tests fix the observable contract of the editor; a wrong case would pin a wrong behaviour.'
    - id: task-003
      risk: 'medium'
      rationale: 'A new part in the load order can add a name collision or an upward pair (RISK-3).'
    - id: task-004
      risk: 'high'
      rationale: 'buildKernelInput, the cache key and the state snapshot are shared by every Map and every story step; a changed key string moves the cache for views that have no links (TG-4).'
    - id: task-005
      risk: 'medium'
      rationale: 'canonicalViewProperties and the edits in place are shared by all views; highlight must survive them.'
    - id: task-006
      risk: 'medium'
      rationale: 'The rewrite and the sibling-plateau dialog must stay in step (RISK-4); a rename writes files.'
    - id: task-007
      risk: 'medium'
      rationale: 'Typed fields redraw the list and must keep focus; diagram-page.js and events.js are large shared files.'
    - id: task-008
      risk: 'medium'
      rationale: 'The Java test edits a copy of a fixture and a change in the fixture would break it far from the cause (RISK-6).'
    - id: task-009
      risk: 'medium'
      rationale: 'An end-to-end spec starts a JVM and a browser and can be flaky; no retry is allowed.'
    - id: task-010
      risk: 'low'
      rationale: 'Documents only.'
    - id: task-011
      risk: 'medium'
      rationale: 'The full gates include a long Maven build and byte-identity; a failure outside the run may block it.'
    - id: task-012
      risk: 'low'
      rationale: 'A record of what the tests pin.'
  by_area:
    - area: 'ui'
      risk: 'medium'
      rationale: 'A new list, chip and panel controls on a page used for every Map, at desktop and phone width.'
    - area: 'data'
      risk: 'medium'
      rationale: 'The editor writes manifests of saved views and rewrites them on a rename and a move; the line-preserving save must keep comments and quotes.'
    - area: 'api'
      risk: 'low'
      rationale: 'No Java, Rust or kernel change; the kernel input key links already exists.'
    - area: 'docs'
      risk: 'low'
      rationale: 'The manual and CLAUDE.md say what the editor does after the run.'
```

## 8. Confidence Assessment

```yaml
confidence_assessment:
  by_task:
    - id: task-001
      score: 80
      rationale: 'Nine findings with the fix written in each.'
    - id: task-002
      score: 75
      rationale: 'The cases are listed in the TDD and the case table exists since run 0197; the contract file is new.'
    - id: task-003
      score: 80
      rationale: 'A pure function part with a precise specification.'
    - id: task-004
      score: 70
      rationale: 'The design is precise but touches several shared files and the exact place of the filter must follow F2.'
    - id: task-005
      score: 75
      rationale: 'Mirrors the way pinned is carried through the same functions.'
    - id: task-006
      score: 75
      rationale: 'Mirrors the rewrite of pinned; the sibling dialog must stay in step.'
    - id: task-007
      score: 70
      rationale: 'The most UI work; the focus behaviour of a typed filter needs care.'
    - id: task-008
      score: 75
      rationale: 'The pattern of MapLinksTest exists; the edit of a copy at run time is new.'
    - id: task-009
      score: 70
      rationale: 'End-to-end flows depend on the real page and a JVM.'
    - id: task-010
      score: 80
      rationale: 'The behaviour is read from the built code and the tests.'
    - id: task-011
      score: 80
      rationale: 'The commands are listed; a failure may be outside the run.'
    - id: task-012
      score: 90
      rationale: 'Copies sentences from the tests.'
```

## 9. Agent Assignment Plan

```yaml
agent_assignment_plan:
  assignments:
    - task_id: task-001
      agent_role: 'Architecture Agent'
      objective: 'Apply F1 to F9 of the Stage 5 review to the TDD.'
      context:
        prd_excerpts:
          - 'REQ-4, REQ-5'
        tdd_excerpts:
          - 'DEC-5, DEC-6, DEC-7, DEC-10, FLOW-4, IMP-7, DEF-1; the Findings of the prg'
      likely_files:
        - 'docs/wav/wav-026-relationship-view/run/run-0199-editor-links/tdd-0199-editor-links.md'
      acceptance_criteria:
        - 'Each of F1 to F9 is visible in the text of the TDD; no decision of DEC-1 to DEC-4 changes.'
      verification:
        - 'the greps of the task catalog'
      escalation_triggers:
        - 'a finding contradicts a decision'
      suggested_subagent_type: 'general-purpose'
      suggested_model: '(default)'
      suggested_effort: 'medium'
    - task_id: task-002
      agent_role: 'Test Generation Agent'
      objective: 'Write the six node test files and the shared contract file and run them red.'
      context:
        prd_excerpts:
          - 'REQ-1 to REQ-5'
        tdd_excerpts:
          - 'DEC-2 to DEC-8, DEC-10, Observability and Verification'
      likely_files:
        - 'src/test/javascript/map-links-*.test.js'
        - 'src/test/resources/map-links/expected-boxes.json'
      acceptance_criteria:
        - 'The new tests fail for the missing behaviour and no existing test fails.'
      verification:
        - 'node --test on the new files; npx prettier --check'
      escalation_triggers:
        - 'an existing node test fails before the editor change'
      suggested_subagent_type: 'general-purpose'
      suggested_model: '(default)'
      suggested_effort: 'medium'
    - task_id: task-003
      agent_role: 'Frontend Implementation Agent'
      objective: 'Write model/map-links.js and register it in layers.json and names.json.'
      context:
        prd_excerpts:
          - 'REQ-1, REQ-3, REQ-4, REQ-6'
        tdd_excerpts:
          - 'DEC-2, IMP-1, CON-1, CON-3'
      likely_files:
        - 'src/main/editor/model/map-links.js'
        - 'src/main/editor/layers.json'
        - 'src/main/editor/names.json'
      acceptance_criteria:
        - 'map-links-model.test.js passes and editor:check exits 0 with no new upward pair.'
      verification:
        - 'npm run editor:build; npm run editor:check; node --test'
      escalation_triggers:
        - 'a name collides or an upward pair appears'
      suggested_subagent_type: 'general-purpose'
      suggested_model: '(default)'
      suggested_effort: 'medium'
    - task_id: task-004
      agent_role: 'Frontend Implementation Agent'
      objective: 'Add the mapLinks state with its reset and restore, send links to the kernel input, the cache key and the recipe, and draw the empty state.'
      context:
        prd_excerpts:
          - 'REQ-3, REQ-5, REQ-6'
        tdd_excerpts:
          - 'DEC-1, DEC-5, DEC-6, IMP-2, IMP-5'
      likely_files:
        - 'src/main/editor/model/ui-state.js'
        - 'src/main/editor/presentation/map-state.js'
        - 'src/main/editor/model/comparison.js'
        - 'src/main/editor/presentation/diagram-page.js'
        - 'src/main/editor/presentation/story-scene.js'
      acceptance_criteria:
        - 'A Map with links is drawn with the ticked relationships only; a Map without links has the same input and key as before.'
      verification:
        - 'node --test on the diagram and shared tests; npm run test:unit; npm run editor:check'
      escalation_triggers:
        - 'a key or a kernel input of a Map without links changes'
      suggested_subagent_type: 'general-purpose'
      suggested_model: '(default)'
      suggested_effort: 'high'
    - task_id: task-005
      agent_role: 'Frontend Implementation Agent'
      objective: 'Carry links through the saved view, its form and the step recipe, keeping highlight verbatim.'
      context:
        prd_excerpts:
          - 'REQ-4, REQ-5'
        tdd_excerpts:
          - 'DEC-7, IMP-6, FLOW-3'
      likely_files:
        - 'src/main/editor/application/view-recipe.js'
        - 'src/main/editor/presentation/view-edit.js'
        - 'src/main/editor/presentation/stories-pages.js'
      acceptance_criteria:
        - 'map-links-saved-view.test.js passes; a view without links writes as before.'
      verification:
        - 'node --test; npm run test:unit'
      escalation_triggers:
        - 'highlight is lost by an edit in place'
      suggested_subagent_type: 'general-purpose'
      suggested_model: '(default)'
      suggested_effort: 'medium'
    - task_id: task-006
      agent_role: 'Frontend Implementation Agent'
      objective: 'Make a rename and a move rewrite links and highlight in views and step recipes, and the live mapLinks.'
      context:
        prd_excerpts:
          - 'REQ-4'
        tdd_excerpts:
          - 'DEC-10, IMP-7, FLOW-4'
      likely_files:
        - 'src/main/editor/application/story-entries.js'
        - 'src/main/editor/persistence/save.js'
      acceptance_criteria:
        - 'map-links-rename-move.test.js passes and the tests of pinned are unchanged.'
      verification:
        - 'node --test; npm run test:unit'
      escalation_triggers:
        - 'move.js needs an edit'
      suggested_subagent_type: 'general-purpose'
      suggested_model: '(default)'
      suggested_effort: 'medium'
    - task_id: task-007
      agent_role: 'Frontend Implementation Agent'
      objective: 'Build the Relationships list, the chip, the panel buttons, the events and the rel= address.'
      context:
        prd_excerpts:
          - 'REQ-1, REQ-2, REQ-5, REQ-6'
        tdd_excerpts:
          - 'DEC-3, DEC-4, DEC-5, DEC-8, IMP-3, IMP-4'
      likely_files:
        - 'src/main/editor/presentation/map-links.js'
        - 'src/main/editor/presentation/right-panel.js'
        - 'src/main/editor/layers.json'
        - 'src/main/editor/names.json'
        - 'src/main/editor/composition/events.js'
        - 'src/main/editor/composition/address-routing.js'
        - 'src/main/editor/style.css'
      acceptance_criteria:
        - 'The list, the click and the address tests pass; the page is usable at 360 px.'
      verification:
        - 'node --test; npm run editor:check; npm run lint; npm run format:check'
      escalation_triggers:
        - 'render() would be called outside composition'
      suggested_subagent_type: 'general-purpose'
      suggested_model: '(default)'
      suggested_effort: 'medium'
    - task_id: task-008
      agent_role: 'Test Generation Agent'
      objective: 'Write MapLinksSharedTest over the shared contract file and an editor-style rename read back by the command line.'
      context:
        prd_excerpts:
          - 'REQ-3, REQ-4'
        tdd_excerpts:
          - 'DEC-8, IMP-9, RISK-6'
      likely_files:
        - 'src/test/java/io/morin/archicode/cli/MapLinksSharedTest.java'
      acceptance_criteria:
        - 'The test passes on a temp copy and leaves the fixture untouched.'
      verification:
        - './mvnw test -Dtest=MapLinksSharedTest; ./mvnw test-compile pmd:check'
      escalation_triggers:
        - 'the two tools disagree on a case'
      suggested_subagent_type: 'general-purpose'
      suggested_model: '(default)'
      suggested_effort: 'medium'
    - task_id: task-009
      agent_role: 'Test Generation Agent'
      objective: 'Write map-links.spec.js for Chromium and Firefox.'
      context:
        prd_excerpts:
          - 'REQ-7'
        tdd_excerpts:
          - 'Observability and Verification, FLOW-1 to FLOW-4, CON-8'
      likely_files:
        - 'src/test/e2e/map-links.spec.js'
      acceptance_criteria:
        - 'The spec passes without retry and the file on disk holds links.'
      verification:
        - 'npx playwright test on the spec, two projects; npm run lint'
      escalation_triggers:
        - 'the spec needs a retry'
      suggested_subagent_type: 'general-purpose'
      suggested_model: '(default)'
      suggested_effort: 'medium'
    - task_id: task-010
      agent_role: 'Documentation Agent'
      objective: 'Update the manual editor sections and the CLAUDE.md paragraph of links and highlight.'
      context:
        prd_excerpts:
          - 'REQ-8'
        tdd_excerpts:
          - 'IMP-10, DEC-9'
      likely_files:
        - 'src/doc/README.adoc'
        - 'CLAUDE.md'
      acceptance_criteria:
        - 'No document says the editor does not read links; the guide is unchanged.'
      verification:
        - 'the greps of the task catalog'
      escalation_triggers:
        - 'a sentence needs behaviour the editor lacks'
      suggested_subagent_type: 'general-purpose'
      suggested_model: '(default)'
      suggested_effort: 'medium'
    - task_id: task-011
      agent_role: 'QA Agent'
      objective: 'Run every gate check and record the results.'
      context:
        prd_excerpts:
          - 'REQ-3, REQ-6, REQ-7'
        tdd_excerpts:
          - 'Observability and Verification, CON-1, CON-3, CON-4, CON-7'
      likely_files:
        - 'docs/wav/wav-026-relationship-view/run/run-0199-editor-links/prg-0199-editor-links.md'
      acceptance_criteria:
        - 'Every command exits 0 and the results are in the prg.'
      verification:
        - 'the commands of the task catalog'
      escalation_triggers:
        - 'a check fails twice for a cause outside this run'
      suggested_subagent_type: 'general-purpose'
      suggested_model: '(default)'
      suggested_effort: 'medium'
    - task_id: task-012
      agent_role: 'Documentation Agent'
      objective: 'Record the built behaviour and limits in the run document and set it to done.'
      context:
        prd_excerpts:
          - 'REQ-4, REQ-8'
        tdd_excerpts:
          - 'DEF-1 to DEF-6, DEC-7, DEC-10'
      likely_files:
        - 'docs/wav/wav-026-relationship-view/run/run-0199-editor-links/run-0199-editor-links.md'
      acceptance_criteria:
        - 'Each quoted sentence appears word for word in a test.'
      verification:
        - 'grep -F of each sentence in the node tests'
      escalation_triggers:
        - 'a sentence differs from the one the tests pin'
      suggested_subagent_type: 'general-purpose'
      suggested_model: '(default)'
      suggested_effort: 'low'
```

## 10. Escalation Rules

Escalate (record in the prg and stop the dependent tasks) when: a key, a kernel input, a saved view or an address of a Map without links changes; a golden or an expected-boxes.json of the existing maps changes; `scripts/byte-identity.sh` reports a change; `ratchet.max` would rise above 99 or a file passes 3,000 lines; a coverage floor would be lowered; the editor and the command line disagree on a shared case; an end-to-end test needs a retry; a check fails twice for a cause outside this run; a sentence in a document differs from the one a test pins. This run operates under the autonomy override of complete-run, so a `human_required` task would have been executed without a stop; there is none, and the review of task-004 is an independent agent verification. The load check of `links` in a layered workspace is out of scope (DEC-10, DEF-1); a task that finds it needed records it and does not build it.

## 11. Final Execution Manifest

```yaml
execution_manifest:
  status: 'done'
  recommendation: 'proceed'
  autonomy_level: 'high'
  total_tasks: 12
  autonomous_tasks: 12
  review_before_tasks: 0
  review_after_tasks: 0
  human_required_tasks: 0
  blocked_tasks: 0
  required_human_gates: []
  highest_risk_tasks:
    - task-004
  criteria:
    - 'Every criterion of the Executive Summary is true (re-checked at Stage 11 against the files and by running the commands; the run document records each result).'
    - 'The list, the panel buttons and the saved view were exercised in a real browser by map-links.spec.js in Chromium and Firefox.'
  next_action: 'None: all 12 tasks done; Stage 11 re-checked every criterion on 2026-10-28 (see the run document, Verification).'
```
