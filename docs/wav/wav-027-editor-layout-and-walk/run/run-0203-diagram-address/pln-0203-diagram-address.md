---
title: Execution Plan — the address carries what changes the diagram
status: done
date: 2026-10-29
related:
  - docs/wav/wav-027-editor-layout-and-walk/run/run-0203-diagram-address/tdd-0203-diagram-address.md
  - docs/wav/wav-027-editor-layout-and-walk/rfc/rfc-001-diagram-layout-address-and-walk.md
  - 'gh:tmorin/archicode#178'
type: pln
run: 0203
wave: 027
---

# Execution Plan: the address carries what changes the diagram

Profile TDD+pln: there is no PRD, so REQ-1 to REQ-8 are the IDs the TDD labels (section "PRD Traceability"), taken from RFC-001, the W-3 row of the wave plan and the P2 gate. The run operates under the autonomy override of complete-run: a task that would otherwise stop for a human is executed by an agent and the override is logged in the prg. No task below is `human_required`, so this plan has no human gate.

The TDD was reviewed at Stage 5 (findings in the prg) and Stage 6 resolved Q-1 (`hide=` stays in). The review is not folded into the TDD text. Where the TDD and a finding or the code disagree on a fact, the code and the finding win; section 2 lists the corrections each task applies, so an agent never builds on a wrong sentence of the TDD.

All commands run from the repository root. Maven needs `JAVA_HOME` at JDK 25. The generated implement workflow never commits: every check below is a command or a file check on the working tree.

## 1. Executive Summary

```yaml
summary:
  status: 'done'
  product_goal: 'A link copied from the address bar of a diagram surface (page of an element, both Maps, page of a saved view) draws for another reader the same boxes, links and places: the address gains layout=N, changes-only=1, compare=<choice> on layered workspaces, open=<refs> and hide=<refs> on the Maps, the comments and manual that said the opposite are corrected, and an audit test fails when a new input of the drawing is neither in the address nor an exception (#178, RFC-001 DEC-2).'
  technical_approach: 'Write the node round-trip, exception, remembered-memory and audit tests first and see them red, then extend currentRouteHash and applyDiagramParamsFromHash in composition/address-routing.js (layout, compare, changes-only first; open and hide for the Maps next), update the exact-hash assertions of the existing node and end-to-end tests in the same step, correct the comments, CLAUDE.md and the manual, write the Chromium and Firefox spec that opens a copied address in a new context and records the address lengths, show the new tests fail on purpose, and run every gate.'
  total_tasks: 6
  parallel_groups: 1
  high_risk_tasks: 0
  human_review_gates: 0
  autonomy_level: 'high'
  recommendation: 'proceed'
  criteria:
    - 'diagram-address.test.js (round trip, fixed point, defaults absent, exceptions, a reader with another memory) and diagram-address-audit.test.js fail before the code and pass after it, on the page of an element (overview, detailed, deep), the Map of the application layer, the Map of the technology layer and the page of a saved view'
    - 'the address a page writes is read back by a second page on the same files into the same boxes and links, and that page writes the same string (fixed point); an option at its default writes no parameter; the wording toggle, the key, zoom, pan and the selection of a box change no address'
    - 'compare= is written on the four surfaces of a layered workspace (empty for none) and never in a workspace without plateaus; changes-only=1 is written only with a comparison on; a reader whose address has a non-empty compare= takes Changes only from the address and its remembered flag is unchanged; an address with no compare=, or an empty one, leaves the flag and the comparison as they were'
    - 'open= and hide= round trip on both Maps, are reset when the address lacks them, keep the opened boxes of removed elements of the comparison, and drop a reference that names nothing; Back and Forward restore pins, hidden, open boxes, columns and Changes only'
    - 'a layout=N that is not a whole number from 1 to 20 is dropped and the address is written back without it; layout is read and reset only on the page of an element and on the Maps, never by a page with no diagram'
    - 'every address a page wrote before the run reads as before: no existing test changes except an exact layered hash that DEC-3 changes, each listed in the run document with its reason'
    - 'the diagram-address.spec.js passes in chromium and firefox on the layered Brightcart at plateau=marketplace: a copied address opened in a new context shows the same box ids and link count on the page of an element, a Map and a saved view, Back and Forward return the folds, and the longest address of the unfolded application Map is under 600 characters with ADDRESS_LENGTH lines recorded in the run document'
    - 'the audit shown to fail by adding a throw-away input to diagramCacheKey, the output recorded in the run document, then removed; two more deliberate breaks (the reader not resetting opened, the writer omitting compare) each caught by a named test'
    - 'npm run editor:build leaves standalone.html the assembly; npm run editor:check, test:unit, test:coverage, lint and format:check pass; ratchet.max in layers.json is not above 99 and node scripts/check-editor.mjs --list shows no upward pair absent from the baseline; no floor of editor-coverage-floor.json is lowered; no part has more than 3000 lines'
    - 'scripts/byte-identity.sh reports no new difference and scripts/byte-identity-exceptions.txt gains no line; src/main/java, src/main/rust, workspace.schema.json, manifest.schema.json and guide/golden.md are unchanged; ./mvnw verify passes'
    - 'the comment before compare in currentRouteHash, the comments of AppState.changesOnly and of rememberFlag use for changes-only, the doc comments of drawLayersNamedByAddress and openLayers, CLAUDE.md and the manual no longer say that Changes only or the comparison is not in the address; CLAUDE.md and the manual state the rule and its three exceptions'
```

## 2. PRD/TDD Consistency Assessment

```yaml
consistency_assessment:
  aligned_items:
    - 'REQ-1 to REQ-8 are each addressed by a TDD design decision (DEC-1 to DEC-7) and by at least one task below'
    - 'currentRouteHash, applyDiagramParamsFromHash, pushShowParams, syncHashFromState (composition/address-routing.js), drawLayersNamedByAddress and layerCompareChoice (application/plateau-choice.js), mapStateOf (presentation/map-state.js) and the set-changes-only handler (composition/events.js) exist as the TDD describes'
    - 'diagramColumns is in model/ui-state.js, reset in application/folder-session.js and in the cache key as cols:, as the TDD says (run 0202)'
    - 'The hidden list is already in the key [opened, pinned, hidden] of diagramCacheKey, so DEC-5 needs no new key part'
  gaps:
    - id: gap-001
      type: 'ambiguity'
      description: 'Stage 5 review S3: DEC-2 and DEC-3 write compare= (empty for none) on every layered diagram address, and the reader sets changesOnly to false whenever the address has compare=. A tab click or a followed link that carries an empty compare= would then switch off a Changes only flag the reader had, though no comparison is on and the flag means nothing.'
      impact: 'medium'
      recommendation: 'task-002 reads changes-only from the address only when compare= is present and not empty; an empty or absent compare= leaves AppState.changesOnly alone. The writer is as the TDD says (changes-only=1 only with compareTargetPlateau()). A test: flag on, no comparison, tab click Applications to Environments and back, flag still on.'
    - id: gap-002
      type: 'contradiction'
      description: 'Stage 5 review: VER-3 says the reader remembered comparison is unchanged after an address is applied. drawLayersNamedByAddress calls drawPlateau with fromAddress, and rememberLayerChoice/rememberComparison in plateau-choice.js may store the addressed comparison. CLAUDE.md has no sentence "a choice of whoever looks": the stale sentences are the comment in currentRouteHash, the comments of AppState.changesOnly (model/app-state.js) and of the rememberFlag use for changes-only (model/settings.js), the doc comments in plateau-choice.js, and the manual lines found by grep.'
      impact: 'medium'
      recommendation: 'task-001 reads drawPlateau before writing VER-3 and asserts what the code does for the comparison (say so in the test name); the flag assertion (no rememberFlag from an address) is exact. task-004 finds the stale lines by grep in the files named, not by the TDD wording.'
    - id: gap-003
      type: 'missing_technical_design'
      description: 'Stage 5 review: DEC-4 filters open= to references of the layer, which drops an opened box of an element only the compared plateau has (a removed element drawn as a ghost).'
      impact: 'medium'
      recommendation: 'task-003 keeps a reference that exists in AppState.index of the layer or in the index of the compared plateau (AppState.baseline) and drops the rest; a test opens a removed box, copies the address and finds it open.'
    - id: gap-004
      type: 'ambiguity'
      description: 'Stage 5 review: DEC-6 resets diagramColumns when the address has no layout. applyDiagramParamsFromHash returns early for a page with no diagram and its library branch returns before the shared part; a reset there would clear the toolbar value through a visit to Settings or Stories.'
      impact: 'medium'
      recommendation: 'The reset is in the element/Map part of the reader only; the library branch reads compare and changes-only and never touches diagramColumns, opened or hidden. A test visits Settings and Stories and comes back: the toolbar value is as the address of the diagram page says.'
    - id: gap-005
      type: 'missing_requirement'
      description: 'Stage 5 review: the list of end-to-end specs in IMP-7 is incomplete; any spec that asserts a layered address exactly or a url() ending changes with DEC-3.'
      impact: 'low'
      recommendation: 'task-002 finds them by grep -ln over src/test/e2e (hash, url(), compare=, plateau=) and updates only the assertions DEC-3 requires; the list goes in the run document.'
    - id: gap-006
      type: 'ambiguity'
      description: 'On the page of a saved view the TDD writes compare= and changes-only but not layout (the toolbar edits the file there), and the reader of the library branch returns after view= and story=.'
      impact: 'low'
      recommendation: 'task-002 extends the library branch to read compare= (already read by drawLayersNamedByAddress) and changes-only= under the same rule as gap-001, and writes both on the page of a selected view only (IF-5); no other library page writes them.'
    - id: gap-007
      type: 'risk'
      description: 'The audit (DEC-7) reads function sources in the sandbox, so a renamed variable fails it; line numbers in the TDD for the cache key are not given and must not be assumed.'
      impact: 'low'
      recommendation: 'task-001 names functions, not lines; the table in the test is the single place to add a line, and the failing sentence is the one of DEC-7.'
    - id: gap-008
      type: 'risk'
      description: 'RISK-2: DEC-3 changes the exact hash of every layered address; RISK-7: hide= goes beyond RFC-001 list and the author may overturn it.'
      impact: 'medium'
      recommendation: 'Update the exact-hash assertions in the same task as the writer and log each; hide= is isolated in task-003 so it can be removed alone.'
    - id: gap-009
      type: 'inaccuracy'
      description: 'Stage 9 repository check: the TDD (IMP-6) and the first draft of this plan put map-links-support.js in src/test/javascript/viewpoint-kernel/. It is src/test/javascript/map-links-support.js (it exports boxIdsOf and linkPairsOf and is required by tests of both folders); library-page.js, harness.js and the four existing exact-hash tests are in viewpoint-kernel/.'
      impact: 'low'
      recommendation: 'Corrected in task-001 likely_files and escalation trigger; the new test files stay in viewpoint-kernel/ beside the other address tests and require ../map-links-support.js.'
    - id: gap-010
      type: 'weak_verification'
      description: 'Stage 9 repository check: the first draft of the task-004 verification grep ("are a choice of whoever looks") matched none of the real stale lines (app-state.js: "; a choice of whoever looks, remembered per folder"; address-routing.js: "the other choices of the comparison ... are not in the address"; settings.js: "Two more choices of whoever looks"), so it would have passed on an unchanged tree. CLAUDE.md has no such sentence (gap-002); the stale manual lines are at about 1824, 2137 and 2203. Other lines that say "not in the address" or "a choice of whoever looks" (diagramKeyOpen, the plateau remembered per folder, the showing names, the Stories tab) are about state the rule keeps out or that is not a diagram input, and stay.'
      impact: 'medium'
      recommendation: 'Corrected: the verification of task-004 greps the exact stale phrases and names the lines that must stay. Also confirmed by reading plateau-choice.js: drawPlateau calls rememberLayerChoice even with fromAddress, so the addressed comparison is remembered while the Changes only flag is not (gap-002 stands; the task-001 escalation trigger covers it).'
  blocking_gaps: []
```

## 3. Execution Graph

```yaml
execution_graph:
  nodes:
    - id: task-001
      status: 'done'
      title: 'Record the baselines and write the address and audit tests, red'
      depends_on: []
      produces:
        - 'src/test/javascript/viewpoint-kernel/diagram-address.test.js'
        - 'src/test/javascript/viewpoint-kernel/diagram-address-audit.test.js'
        - 'the output of node scripts/check-editor.mjs --list and the ratchet count before the change, in the run document under Baseline'
        - 'the list of existing tests and e2e specs that assert a layered address exactly, found by grep, in the run document'
        - 'the failing output of the two new files in the run document'
      agent_role: 'Test Generation Agent'
      autonomy: 'autonomous'
      risk: 'low'
      confidence: 75
    - id: task-002
      status: 'done'
      title: 'Write and read layout, compare and changes-only on the four surfaces'
      depends_on: [task-001]
      produces:
        - 'src/main/editor/composition/address-routing.js'
        - 'src/main/editor/names.json'
        - 'src/main/resources/editor-webapp/standalone.html'
        - 'the existing node tests and e2e specs whose exact layered hash DEC-3 changes'
      agent_role: 'Frontend Implementation Agent'
      autonomy: 'autonomous'
      risk: 'medium'
      confidence: 70
    - id: task-003
      status: 'done'
      title: 'Write and read open and hide on the two Maps, and make the audit pass'
      depends_on: [task-002]
      produces:
        - 'src/main/editor/composition/address-routing.js'
        - 'src/main/editor/names.json'
        - 'src/main/resources/editor-webapp/standalone.html'
      agent_role: 'Frontend Implementation Agent'
      autonomy: 'autonomous'
      risk: 'medium'
      confidence: 70
    - id: task-004
      status: 'done'
      title: 'Correct the comments, CLAUDE.md and the manual and state the rule'
      depends_on: [task-003]
      produces:
        - 'src/main/editor/composition/address-routing.js'
        - 'src/main/editor/model/app-state.js'
        - 'src/main/editor/model/settings.js'
        - 'src/main/editor/application/plateau-choice.js'
        - 'src/main/resources/editor-webapp/standalone.html'
        - 'CLAUDE.md'
        - 'src/doc/README.adoc'
      agent_role: 'Documentation Agent'
      autonomy: 'autonomous'
      risk: 'low'
      confidence: 80
    - id: task-005
      status: 'done'
      title: 'Write the end-to-end spec and record the address lengths'
      depends_on: [task-003]
      produces:
        - 'src/test/e2e/diagram-address.spec.js'
        - 'the ADDRESS_LENGTH lines and the stated encoding, in the run document'
      agent_role: 'QA Agent'
      autonomy: 'autonomous'
      risk: 'medium'
      confidence: 65
    - id: task-006
      status: 'done'
      title: 'Show the tests fail on purpose, run every gate and record the evidence'
      depends_on: [task-004, task-005]
      produces:
        - 'the three deliberate breaks, each with its failing test, in the run document'
        - 'the output of every gate command in the run document'
      agent_role: 'QA Agent'
      autonomy: 'autonomous'
      risk: 'low'
      confidence: 75
  edges:
    - from: task-001
      to: task-002
      reason: 'the writer and reader are written against red tests'
    - from: task-002
      to: task-003
      reason: 'open and hide extend the same two functions of address-routing.js and use the helpers task-002 adds'
    - from: task-003
      to: task-004
      reason: 'the comments, CLAUDE.md and the manual describe the address as built'
    - from: task-003
      to: task-005
      reason: 'the spec drives every parameter on the packaged jar'
    - from: task-004
      to: task-006
      reason: 'the gates run on the finished work'
    - from: task-005
      to: task-006
      reason: 'the gates run on the finished work'
```

## 4. Task Catalog

```yaml
task_catalog:
  tasks:
    - id: task-001
      title: 'Record the baselines and write the address and audit tests, red'
      results: "tier standard, model sonnet, effort medium, profile low-cost, passed first time, inline (leaf), independently verified"
      source_requirements:
        prd:
          - 'REQ-1'
          - 'REQ-2'
          - 'REQ-3'
          - 'REQ-4'
          - 'REQ-5'
        tdd:
          - 'DEC-1 to DEC-7'
          - 'VER-1, VER-2, VER-3, VER-6'
          - 'Stage 5 review (gap-001 to gap-007)'
      outputs:
        - 'the output of node scripts/check-editor.mjs --list and the current ratchet count, pasted in the run document under Baseline'
        - 'the result of grep -ln "currentRouteHash\|location.hash\|compare=" src/test/javascript and of grep -ln "hash\|url()\|compare=\|plateau=" src/test/e2e, in the run document'
        - 'diagram-address.test.js: for layout, changes-only, compare (past, future, future:id, other:id and empty), open, hide, pin, rel, hl, facet, hide-unlinked, applications=0, relationships=0, labels, qualifiers, descriptions and wrap, on each surface where the option exists (element overview, detailed and deep, application Map, technology Map, page of a saved view), page A sets the state and takes currentRouteHash(), page B on the same files opens that hash, B draws the same box ids and link pairs (and compare states) as A, and B writes the same hash (fixed point); an option at its default writes no parameter; a workspace without plateaus writes no compare and no changes-only; the library pages other than a selected view write none'
        - 'the same file, exceptions: the wording toggle, the open or folded key, zoom, pan and the selection of a box change currentRouteHash() by nothing'
        - 'the same file, other memory (gap-001, gap-002): page B has a remembered Changes only and a remembered comparison that differ from A; after the address with a non-empty compare= is applied B draws A diagram and its remembered flag is unchanged; an address with no compare=, or an empty one, leaves the flag and the comparison as they were; Settings or Stories visited and back leaves the toolbar columns as the diagram address says (gap-004); an invalid layout (0, 21, 1.5, abc) is dropped and the address written back without it'
        - 'the same file, Maps: an opened box of a removed element of the comparison survives the round trip (gap-003); an unknown reference in open= or hide= is dropped; the reset when the address lacks open or hide; Back and Forward restore pins, hidden, open and columns'
        - 'diagram-address-audit.test.js: the table of the inputs of the drawing, each with its address parameter or its reason, and the failing sentence "add it to the address (currentRouteHash) or give the reason it is not there"; the identifiers come from the source text of diagramCacheKey, modelsKey, mainDiagramRecipe, libraryDiagramRecipe and buildKernelInput in the sandbox'
        - 'the failing output of both files, copied in the run document'
      verification:
        - 'node --test src/test/javascript/viewpoint-kernel/diagram-address.test.js exits non-zero before task-002 and the failures name the missing parameters'
        - 'node --test src/test/javascript/viewpoint-kernel/diagram-address-audit.test.js exits non-zero (or reports the unclassified inputs open and hide) before task-003'
        - 'node scripts/check-editor.mjs --list exits 0 and its output is in the run document'
        - 'npm run format:check passes on the two new files'
      risk: 'low'
      confidence: 75
      human_review: 'none'
      escalation_triggers:
        - 'a second page on the same files cannot be built with src/test/javascript/map-links-support.js (note: it lives in src/test/javascript, one folder above viewpoint-kernel, so the new tests require ../map-links-support.js) and src/test/javascript/viewpoint-kernel/library-page.js: record the missing export and build the second sandbox from the same loader'
        - 'drawPlateau remembers the addressed comparison (gap-002): write the assertion for what the code does and note the difference from VER-3 in the run document, do not change the design'
      delegation_tier: 'standard'
    - id: task-002
      title: 'Write and read layout, compare and changes-only on the four surfaces'
      results: "tier standard, model sonnet, effort medium, profile low-cost, passed first time, inline (leaf), independently verified"
      source_requirements:
        prd:
          - 'REQ-1'
          - 'REQ-2'
          - 'REQ-4'
          - 'REQ-5'
          - 'REQ-7'
        tdd:
          - 'DEC-1'
          - 'DEC-2'
          - 'DEC-3'
          - 'DEC-6'
          - 'IMP-1'
          - 'IMP-6'
          - 'CTR-1'
          - 'FLOW-1'
          - 'FLOW-2'
          - 'Stage 5 review (gap-001, gap-004, gap-005, gap-006)'
      outputs:
        - 'currentRouteHash writes layout=N when diagramColumns is not null (element and Maps), compare=<layerCompareChoice()> on the four surfaces whenever AppState.plateauTree.layered (empty for none, once when the removed-element rule also writes it), changes-only=1 when AppState.changesOnly and compareTargetPlateau(); the order of CTR-1'
        - 'applyDiagramParamsFromHash reads layout (null when absent or invalid, only in the element and Map part), reads changes-only only when compare= is present and not empty (gap-001), never calls rememberFlag, and its library branch reads changes-only for a selected view'
        - 'an invalid layout is dropped and the address is rewritten without it'
        - 'names.json updated with node scripts/check-editor.mjs --write-names; standalone.html rebuilt with npm run editor:build'
        - 'the exact-hash assertions in the node tests and in src/test/e2e that DEC-3 changes, updated, each listed with its reason in the run document; no other expectation changes'
      verification:
        - 'node --test src/test/javascript/viewpoint-kernel/diagram-address.test.js passes except the cases for open and hide'
        - 'npm run test:unit passes'
        - 'npm run editor:check exits 0 and node scripts/check-editor.mjs --list shows no upward pair absent from the baseline of task-001'
        - 'npm run lint and npm run format:check pass'
        - 'grep -n "modelsChanged\|rememberFlag" src/main/editor/composition/address-routing.js finds no call'
      risk: 'medium'
      confidence: 70
      human_review: 'none'
      escalation_triggers:
        - 'an existing test other than an exact layered hash fails: an address written before the run changed meaning, fix the code, not the test'
        - 'the reader needs a name that lives in a higher layer: move the helper down, never raise ratchet.max'
        - 'render() is needed to redraw: use requestRedraw(), render() is called in composition only but the reader must not add a second render'
      delegation_tier: 'standard'
    - id: task-003
      title: 'Write and read open and hide on the two Maps, and make the audit pass'
      results: "tier standard, model sonnet, effort medium, profile low-cost, passed first time, inline (leaf), independently verified"
      source_requirements:
        prd:
          - 'REQ-1'
          - 'REQ-2'
          - 'REQ-4'
          - 'REQ-6'
        tdd:
          - 'DEC-4'
          - 'DEC-5'
          - 'DEC-6'
          - 'DEC-7'
          - 'ASM-1'
          - 'ASM-5'
          - 'Stage 5 review (gap-003)'
      outputs:
        - 'currentRouteHash writes open=<refs> and hide=<refs> on both Maps (each encodeURIComponent, sorted, comma joined; open only when opened is non-empty, hide only when hidden is non-empty), after pin and before rel and hl as CTR-1 orders them'
        - 'applyDiagramParamsFromHash sets state.opened to a Set (null when absent) and state.hidden (empty when absent) before pin is read, so that expandParentsOf of each pin still opens its ancestors; a reference is kept when it exists in AppState.index of the layer or in the index of the compared plateau (gap-003)'
        - 'one small helper shared with pin for the list encoding, named in names.json'
        - 'Unfold all, Fold all, the fold buttons and Hide rewrite the address in place (replaceState, no history entry); a note in a comment that DEF-1 covers a long address'
        - 'standalone.html rebuilt'
      verification:
        - 'node --test src/test/javascript/viewpoint-kernel/diagram-address.test.js and diagram-address-audit.test.js pass in full'
        - 'the existing Map tests pass unchanged: node --test on the files found by grep -ln "mapStateOf\|toggle-fold\|expandParentsOf" src/test/javascript'
        - 'npm run test:unit, npm run editor:check, npm run lint and npm run format:check pass'
        - 'a Map of every shipped example and fixture with no open or hide has the boxes of technology-map/expected-boxes.json and map-links/expected-boxes.json (the existing tests, unchanged)'
      risk: 'medium'
      confidence: 70
      human_review: 'none'
      escalation_triggers:
        - 'the reset of opened on a bare address breaks a click on a tab (RISK-4): the tab handler writes currentRouteHash() of the page, add the perspective switch Applications to Environments and back to the test, do not drop the reset'
        - 'the author overturns hide= at review: remove task-003 hide parts only, the rest stands'
      delegation_tier: 'standard'
    - id: task-004
      title: 'Correct the comments, CLAUDE.md and the manual and state the rule'
      results: "tier standard, model sonnet, effort medium, profile low-cost, passed first time, inline (leaf), independently verified"
      source_requirements:
        prd:
          - 'REQ-5'
          - 'REQ-8'
        tdd:
          - 'IMP-2'
          - 'IMP-8'
          - 'Stage 5 review (gap-002)'
      outputs:
        - 'the comment before compare in currentRouteHash (composition/address-routing.js, the line that says the other choices of the comparison are not in the address), the comment of AppState.changesOnly (model/app-state.js, the line that says a choice of whoever looks), the comment before recalledFlag and rememberFlag that says changes-only is a choice of whoever looks (model/settings.js, the block above FLAG_STORAGE_PREFIX; the hide-wording half of that sentence stays true) and the doc comment of drawLayersNamedByAddress (application/plateau-choice.js, which says compare= is written with a removed element; say too that drawPlateau remembers the addressed comparison through rememberLayerChoice, a fact the code has, while the Changes only flag is not remembered from an address) say the new rule; standalone.html rebuilt'
        - 'CLAUDE.md: the editor paragraphs that say what the address carries are corrected (found by grep -n "address" CLAUDE.md and grep -n "changes-only\|Changes only" CLAUDE.md), and one paragraph for this run in the style of "The highlight in the editor": the table of parameters, the order, the absent-means rules, the three exceptions, the reader and the remembered flag'
        - 'src/doc/README.adoc: the passages found by grep -n "not in the address\|the other choices of the comparison\|comparison chosen on the band changes no address\|leaves the comparison as it is\|changes no address\|only next to the selection of a removed element" src/doc/README.adoc rewritten (the lines around 1824, 2137 and 2203 at least), and one short section What a link carries with the table and the three exceptions; the passage on the Back button between two comparisons rewritten (the comparison is an entry of the history, now visibly)'
        - 'no line of either document keeps the opposite statement'
      verification:
        - 'grep -n "other choices of the comparison\|changes no address\|only next to the selection of a removed element\|the page writes it with a removed element" CLAUDE.md src/doc/README.adoc src/main/editor finds none of the old sentences, and grep -n "choice of whoever looks" src/main/editor/model/app-state.js src/main/editor/model/settings.js finds no line that says changes-only is one (the lines about the plateau drawn, the showing names, the key and the tab are other state and stay)'
        - 'grep -n "changes-only=1\|open=\|hide=\|layout=" CLAUDE.md src/doc/README.adoc finds the new rule in both files'
        - 'npm run editor:build, npm run editor:check, npm run format:check pass'
        - 'JAVA_HOME at JDK 25: ./mvnw -q -DskipTests -Dpmd.skip=true generate-resources, or the manual build of the Maven profile that builds src/doc, finishes without an unresolved cross-reference'
      risk: 'low'
      confidence: 80
      human_review: 'none'
      escalation_triggers:
        - 'an anchor named in the TDD does not exist: use the anchor the grep finds and note it in the run document'
      delegation_tier: 'standard'
    - id: task-005
      title: 'Write the end-to-end spec and record the address lengths'
      results: "tier standard, model sonnet, effort medium, profile low-cost, passed first time, inline (leaf), independently verified"
      source_requirements:
        prd:
          - 'REQ-4'
          - 'REQ-6'
        tdd:
          - 'IMP-7'
          - 'VER-4'
          - 'VER-5'
          - 'ASM-4'
          - 'ASM-5'
          - 'RISK-5'
      outputs:
        - 'src/test/e2e/diagram-address.spec.js (chromium and firefox; not added to the WebKit testMatch): on a copy of the layered Brightcart at plateau=marketplace, set a comparison, Changes only, unfold two boxes, hide one and layout 4 on the application Map; read page.url(); open it in a new context; assert the same box ids and the same count of g.dg-link; repeat on the page of an element and on the page of a saved view (the view of run 0202 spec, The whole map, opened); Back and Forward return the folds'
        - 'the spec prints ADDRESS_LENGTH <surface> <n> for the longest address it writes (all the parents of the application layer opened, plus the pins); the numbers and the encoding statement (a list like pin, encodeURIComponent, sorted) are in the run document'
        - 'the e2e assertions of exact layered hashes in the other specs were updated by task-002; this task re-runs them'
      verification:
        - 'JAVA_HOME at JDK 25: ./mvnw package -Dmaven.test.skip -Dplugin.asciidoctor.skip=true -Dpmd.skip=true, then npx playwright test src/test/e2e/diagram-address.spec.js src/test/e2e/address.spec.js src/test/e2e/diagram-and-compare.spec.js src/test/e2e/diagram-columns.spec.js --project=chromium --project=firefox exits 0'
        - 'the unfolded application Map address of the Brightcart is under 600 characters in the ADDRESS_LENGTH line'
        - 'npm run lint and npm run format:check pass on the new spec'
      risk: 'medium'
      confidence: 65
      human_review: 'none'
      escalation_triggers:
        - 'ELK order makes box positions differ: assert ids and link counts only (RISK-5)'
        - 'the address is over 600 characters: record it as a finding and DEF-1, do not change the encoding'
        - 'a second engine needs a system library that is missing: record it and run the project that works, never skip a spec silently'
      delegation_tier: 'standard'
    - id: task-006
      title: 'Show the tests fail on purpose, run every gate and record the evidence'
      results: "tier standard, model sonnet, effort medium, profile low-cost, passed first time, inline (leaf), independently verified"
      source_requirements:
        prd:
          - 'REQ-4'
          - 'REQ-7'
          - 'REQ-8'
        tdd:
          - 'VER-6'
          - 'VER-7'
          - 'VER-8'
      outputs:
        - 'break 1: a throw-away input added to diagramCacheKey, the audit fails with the DEC-7 sentence; break 2: the reader no longer resets opened when the address lacks it, a named test of diagram-address.test.js fails; break 3: the writer omits compare=, the round-trip test fails; each failing output recorded in the run document, each break undone and the page rebuilt, compared with a copy saved before'
        - 'the output and exit code of every gate in the run document'
      verification:
        - 'npm run editor:build then git diff --stat shows standalone.html equal to the copy saved before the breaks'
        - 'npm run editor:check, npm run test:unit, npm run test:coverage, npm run lint, npm run format:check exit 0'
        - 'node scripts/check-editor.mjs --list shows no upward pair absent from the baseline; grep -n max src/main/editor/layers.json shows ratchet.max not above 99; scripts/editor-coverage-floor.json is unchanged (git diff --stat)'
        - 'scripts/byte-identity.sh exits 0 and git diff --stat scripts/byte-identity-exceptions.txt is empty'
        - 'JAVA_HOME at JDK 25: ./mvnw verify exits 0; git diff --stat src/main/java src/main/rust src/main/resources/guide src/test/resources/guide src/test/resources/schemas is empty'
        - 'wc -l on every file of src/main/editor shows none over 3000 lines'
      risk: 'low'
      confidence: 75
      human_review: 'none'
      escalation_triggers:
        - 'byte-identity reports a new difference: stop and name it in a finding'
        - 'a floor or the ratchet would have to be lowered or raised: stop, do not edit them'
        - 'a break is not caught by a test: add the missing test, then repeat the break'
      delegation_tier: 'standard'
```

## 5. Parallelization Plan

```yaml
parallelization_plan:
  groups:
    - id: parallel-group-001
      tasks:
        - task-004
        - task-005
      reason: 'the comments and documents (CLAUDE.md, README.adoc and four comment blocks) and the end-to-end spec (one new file under src/test/e2e and the run document) share no source file'
      conflict_risks:
        - 'task-004 rebuilds standalone.html after editing comments; task-005 builds the jar from it: build the jar after task-004 has saved its files, or run npm run editor:build before the Maven package so the page is the assembly'
        - 'both append to the run document: task-004 writes nothing there; task-005 writes the lengths under its own heading'
```

## 6. Human Review Gates

```yaml
human_review_gates:
  gates: []
```

No gate. The run operates under the autonomy override of complete-run (the status of the document and the prg log say so), and no task is flagged for a human. The one judgment a reviewer may overturn is DEC-5 (`hide=`, RISK-7): it is isolated in task-003 and costs one optional parameter. The measured rules are the audit and the 600-character length.

## 7. Risk Assessment

```yaml
risk_assessment:
  by_task:
    - id: task-001
      risk: 'low'
      rationale: 'New test files only; the traps are the second sandbox page on the same files and reading function sources for the audit.'
    - id: task-002
      risk: 'medium'
      rationale: 'The writer and the reader run at every render and on every hashchange; DEC-3 changes the exact hash of every layered address, which many tests pin, and a wrong reset loses a user choice.'
    - id: task-003
      risk: 'medium'
      rationale: 'Resetting opened and hidden when absent changes what a bare address means for a Map; ordering with pin and expandParentsOf must hold.'
    - id: task-004
      risk: 'low'
      rationale: 'Comments and prose, but the sentences describe a rule the manual stated the other way.'
    - id: task-005
      risk: 'medium'
      rationale: 'Two engines on a real layout, a JVM per test and a long address measure; ELK order is not asserted.'
    - id: task-006
      risk: 'low'
      rationale: 'Runs checks; the deliberate breaks are undone and compared with a saved copy.'
  by_area:
    - area: 'ui'
      risk: 'medium'
      rationale: 'Every diagram surface of a layered workspace writes a longer address; old addresses must read as before (TG-3).'
    - area: 'api'
      risk: 'low'
      rationale: 'The address is an editor contract; unknown parameters are ignored by older pages; no kernel, schema or command-line change.'
    - area: 'docs'
      risk: 'low'
      rationale: 'CLAUDE.md and the manual must move in the same change as the rule (REQ-5, REQ-8).'
    - area: 'infra'
      risk: 'low'
      rationale: 'No workflow or pom change; the generated page is committed with its sources.'
```

## 8. Confidence Assessment

```yaml
confidence_assessment:
  by_task:
    - id: task-001
      score: 75
      rationale: 'The functions are named and the repo has a support for two pages on the same files; the audit by source text is new.'
    - id: task-002
      score: 70
      rationale: 'Many exact-hash assertions to update and four surfaces; the review corrected the empty compare rule before coding.'
    - id: task-003
      score: 70
      rationale: 'The same two functions and a pattern to copy (pin); the removed-box and reset rules are tested first.'
    - id: task-004
      score: 80
      rationale: 'Prose with a grep that finds every stale line; the style is set by earlier paragraphs.'
    - id: task-005
      score: 65
      rationale: 'Real browsers, a JVM per test, and a new-context copy of an address; the length measure may need a finding.'
    - id: task-006
      score: 75
      rationale: 'Long gates with clear exit codes; the breaks are restored from a saved copy.'
```

## 9. Agent Assignment Plan

```yaml
agent_assignment_plan:
  assignments:
    - task_id: task-001
      agent_role: 'Test Generation Agent'
      objective: 'Record the ratchet and exact-hash baselines and write the round-trip, exception, other-memory and audit tests so that they fail now for the right reasons and state DEC-1 to DEC-7.'
      context:
        prd_excerpts:
          - 'REQ-4: for each option that changes what is drawn, on each surface, the address written and read back gives the same boxes and links'
          - 'REQ-3: the wording toggle, the key, zoom and pan are not in the address'
        tdd_excerpts:
          - 'VER-1, VER-2, VER-3, VER-6 and the table of the Proposed Design'
          - 'gap-001 to gap-004: empty compare leaves the flag, drawPlateau memory, removed boxes, no reset by a page with no diagram'
      likely_files:
        - 'src/test/javascript/viewpoint-kernel/diagram-address.test.js'
        - 'src/test/javascript/viewpoint-kernel/diagram-address-audit.test.js'
        - 'src/test/javascript/map-links-support.js'
        - 'src/test/javascript/viewpoint-kernel/library-page.js'
        - 'src/test/javascript/viewpoint-kernel/harness.js'
      acceptance_criteria:
        - 'both files fail on the current page and the failures name the missing parameters'
        - 'the baseline and the list of exact-hash tests are in the run document'
      verification:
        - 'node --test on each file, then npm run format:check'
      escalation_triggers:
        - 'no second page can be built on the same files'
      suggested_subagent_type: 'general-purpose'
      suggested_model: '(default)'
      suggested_effort: 'medium'
    - task_id: task-002
      agent_role: 'Frontend Implementation Agent'
      objective: 'Make currentRouteHash write and applyDiagramParamsFromHash read layout, compare and changes-only on the element page, both Maps and the page of a saved view, with the rules of gap-001, gap-004 and gap-006, and update the exact layered hashes.'
      context:
        prd_excerpts:
          - 'REQ-1 and REQ-2: layout, Changes only and the comparison in the address on every diagram surface'
          - 'REQ-5: Changes only enters the address'
        tdd_excerpts:
          - 'DEC-1, DEC-2, DEC-3, DEC-6, CTR-1 for the order and the absent-means rules'
          - 'gap-001: changes-only is read only with a non-empty compare=; gap-004: layout is reset only by the element and Map part'
      likely_files:
        - 'src/main/editor/composition/address-routing.js'
        - 'src/main/editor/application/plateau-choice.js'
        - 'src/main/editor/names.json'
        - 'src/test/javascript/viewpoint-kernel/plateaus-page-and-addresses.test.js'
        - 'src/test/javascript/viewpoint-kernel/remove-buttons-address-the-file.test.js'
        - 'src/test/e2e/address.spec.js'
      acceptance_criteria:
        - 'diagram-address.test.js passes except open and hide; npm run test:unit passes'
        - 'editor:check exits 0 with no new upward pair'
      verification:
        - 'npm run editor:build, npm run test:unit, npm run editor:check, npm run lint, npm run format:check'
      escalation_triggers:
        - 'an old address changes meaning'
      suggested_subagent_type: 'general-purpose'
      suggested_model: '(default)'
      suggested_effort: 'medium'
    - task_id: task-003
      agent_role: 'Frontend Implementation Agent'
      objective: 'Add open= and hide= to the two Maps, reset them when absent, keep opened boxes of removed elements, and make the audit pass.'
      context:
        prd_excerpts:
          - 'REQ-6: the fold state is a list like pin, measured on the layered Brightcart'
        tdd_excerpts:
          - 'DEC-4, DEC-5, DEC-6, ASM-5'
          - 'gap-003: keep a reference in the index of the layer or of the compared plateau'
      likely_files:
        - 'src/main/editor/composition/address-routing.js'
        - 'src/main/editor/presentation/map-state.js'
        - 'src/main/editor/names.json'
      acceptance_criteria:
        - 'both new node files pass in full'
        - 'the saved Maps of the shipped examples draw the boxes of the expected-boxes.json files'
      verification:
        - 'npm run editor:build, npm run test:unit, npm run editor:check, npm run lint, npm run format:check'
      escalation_triggers:
        - 'the tab click loses a fold'
      suggested_subagent_type: 'general-purpose'
      suggested_model: '(default)'
      suggested_effort: 'medium'
    - task_id: task-004
      agent_role: 'Documentation Agent'
      objective: 'Replace every sentence that says Changes only or the comparison is not in the address, in four code comments, CLAUDE.md and the manual, and state the rule, the table and the three exceptions.'
      context:
        prd_excerpts:
          - 'REQ-8: CLAUDE.md and the manual describe the address rule and its three exceptions'
        tdd_excerpts:
          - 'IMP-2, IMP-8, CTR-1'
          - 'gap-002: the stale sentences are in the comment of currentRouteHash, app-state.js, settings.js, plateau-choice.js and the manual, not in CLAUDE.md'
      likely_files:
        - 'src/main/editor/composition/address-routing.js'
        - 'src/main/editor/model/app-state.js'
        - 'src/main/editor/model/settings.js'
        - 'src/main/editor/application/plateau-choice.js'
        - 'CLAUDE.md'
        - 'src/doc/README.adoc'
      acceptance_criteria:
        - 'no stale sentence is left and the new rule is in CLAUDE.md and the manual'
      verification:
        - 'the greps of the task catalog, then npm run editor:build and npm run editor:check'
      escalation_triggers:
        - 'an anchor does not exist'
      suggested_subagent_type: 'general-purpose'
      suggested_model: '(default)'
      suggested_effort: 'medium'
    - task_id: task-005
      agent_role: 'QA Agent'
      objective: 'Write the Chromium and Firefox spec that opens a copied address in a new context on the layered Brightcart, and record the address lengths.'
      context:
        prd_excerpts:
          - 'REQ-4: an end-to-end spec opens the copied address in a new page and finds the same diagram'
          - 'REQ-6: the encoding of the fold state and the length on the layered Brightcart'
        tdd_excerpts:
          - 'VER-4 and VER-5; RISK-5: assert ids and link counts, not positions'
      likely_files:
        - 'src/test/e2e/diagram-address.spec.js'
        - 'src/test/e2e/fixtures.js'
        - 'src/test/e2e/harness.js'
        - 'src/test/e2e/diagram-columns.spec.js'
      acceptance_criteria:
        - 'the spec passes in both engines and the ADDRESS_LENGTH numbers are in the run document'
      verification:
        - 'JAVA_HOME at JDK 25: ./mvnw package -Dmaven.test.skip -Dplugin.asciidoctor.skip=true -Dpmd.skip=true then npx playwright test on the four specs of the task catalog'
      escalation_triggers:
        - 'the address is over 600 characters'
      suggested_subagent_type: 'general-purpose'
      suggested_model: '(default)'
      suggested_effort: 'high'
    - task_id: task-006
      agent_role: 'QA Agent'
      objective: 'Break the code three ways on purpose, see a test catch each, restore, then run every gate and record the evidence against the criteria of the Executive Summary.'
      context:
        prd_excerpts:
          - 'REQ-7: ratchet, floors, byte-identity and the schema goldens do not move'
        tdd_excerpts:
          - 'VER-6, VER-7, VER-8'
      likely_files:
        - 'src/main/editor/composition/address-routing.js'
        - 'src/main/editor/presentation/diagram-page.js'
        - 'docs/wav/wav-027-editor-layout-and-walk/run/run-0203-diagram-address/run-0203-diagram-address.md'
      acceptance_criteria:
        - 'every criterion of the Executive Summary is recorded true, or a finding names the one that is not'
      verification:
        - 'the commands of the task catalog, each with its exit code in the run document'
      escalation_triggers:
        - 'byte-identity reports a new difference'
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
        - 'node --test on the two new files, red'
        - 'format check'
      success_criteria:
        - 'the failures name the missing parameters and the unclassified inputs'
        - 'the ratchet baseline and the list of exact-hash tests are in the run document'
    - task_id: task-002
      methods:
        - 'node tests of the round trip for layout, compare and changes-only'
        - 'full node unit suite'
        - 'editor:build and editor:check'
      success_criteria:
        - 'the exact-hash updates are only those DEC-3 requires'
        - 'a bare compare= or an old address leaves the flag and the comparison'
        - 'no new upward pair'
    - task_id: task-003
      methods:
        - 'node tests of open and hide and of the audit'
        - 'existing Map tests and the expected-boxes contracts'
        - 'editor:check'
      success_criteria:
        - 'open and hide round trip, reset when absent, keep removed boxes, drop unknown references'
        - 'the audit passes with no unclassified input'
    - task_id: task-004
      methods:
        - 'grep for the old and the new sentences'
        - 'editor:build and editor:check'
      success_criteria:
        - 'no stale sentence in the comments, CLAUDE.md or the manual; the rule and its three exceptions are in both documents'
    - task_id: task-005
      methods:
        - 'Playwright in chromium and firefox on the packaged jar'
      success_criteria:
        - 'the same box ids and link count in a new context on three surfaces; Back and Forward return the folds'
        - 'the unfolded application Map address is under 600 characters'
    - task_id: task-006
      methods:
        - 'three deliberate breaks'
        - 'every gate command of the TDD verification section'
        - 'byte-identity and the Maven verify'
      success_criteria:
        - 'each break is caught by a named test and undone, the page equal to the saved copy'
        - 'ratchet.max not above 99, no floor lowered, no part over 3000 lines, src/main/java and the goldens unchanged'
```

## 11. Escalation Rules

```yaml
escalation_rules:
  rules:
    - condition: 'an address written before the run reads differently, or an existing test other than an exact layered hash must change'
      action: 'stop the task, fix the code, and name the case in a finding of the prg'
    - condition: 'the audit or a round trip cannot classify an input of the drawing'
      action: 'add it to the address in the same task if it changes the boxes or links drawn, else give the reason in the table; never silence the test'
    - condition: 'ratchet.max, a coverage floor or a golden file would have to move'
      action: 'stop and record a finding; do not edit them'
    - condition: 'byte-identity reports a new difference or src/main/java would change'
      action: 'stop; this run changes the editor only'
    - condition: 'the address on the unfolded Brightcart Map is over 600 characters'
      action: 'record it as a finding and DEF-1; do not change the encoding in this run'
    - condition: 'the author overturns hide= (RISK-7)'
      action: 'remove its writer, reader, test cases and audit line in a follow-up; nothing else depends on it'
    - condition: 'a task fails its own verification'
      action: 'the generated workflow retries once one effort step up with the failing output, then the main agent handles it inline and logs a finding'
```

## 12. Final Execution Manifest

```yaml
execution_manifest:
  status: 'done'
  recommendation: 'proceed'
  autonomy_level: 'high'
  total_tasks: 6
  autonomous_tasks: 6
  review_before_tasks: 0
  review_after_tasks: 0
  human_required_tasks: 0
  blocked_tasks: 0
  critical_path_tasks:
    - task-001
    - task-002
    - task-003
    - task-005
    - task-006
  parallel_groups:
    - parallel-group-001
  required_human_gates: []
  highest_risk_tasks:
    - task-002
    - task-003
    - task-005
  lowest_confidence_tasks:
    - task-005
    - task-002
    - task-003
  next_action: 'Run task-001: record the baselines and write diagram-address.test.js and diagram-address-audit.test.js, see them fail.'
  criteria:
    - 'the criteria of section 1'
```
