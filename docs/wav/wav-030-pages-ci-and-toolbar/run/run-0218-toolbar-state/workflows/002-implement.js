export const meta = { name: "run-0218-implement", description: "Generated from the run directory: pending tasks of the pln only; cost profile low-cost" }
// cost profile: low-cost
// overrides of declared tiers and profile ceilings (0):
//   (none)
// autonomy override: none
const PLAN = {
 "cost_profile": "low-cost",
 "ceiling": {
  "models": [
   "haiku",
   "sonnet"
  ],
  "efforts": [
   "low",
   "medium",
   "high"
  ]
 },
 "repo_root": "/home/tibo/git-perso/archicode",
 "agents": {
  "bookkeeping": {
   "model": "haiku",
   "effort": "high",
   "class": "K0"
  },
  "create": {
   "model": "sonnet",
   "effort": "low",
   "class": "K1"
  },
  "run-agent": {
   "model": "sonnet",
   "effort": "high",
   "class": "K5"
  },
  "verify-task": {
   "model": "sonnet",
   "effort": "medium",
   "class": "K2"
  },
  "verify-run": {
   "model": "sonnet",
   "effort": "medium",
   "class": "K2"
  },
  "gate": {
   "model": "sonnet",
   "effort": "medium",
   "class": "K2"
  }
 },
 "overrides": [],
 "sensitivity": [],
 "run_sensitive": false,
 "gated": [],
 "autonomy_override": "",
 "kind": "implement",
 "stage11": {
  "model": "sonnet",
  "effort": "medium",
  "class": "K5"
 },
 "run": "0218",
 "slug": "toolbar-state",
 "wave": "030",
 "profile": "TDD+pln",
 "run_dir": "docs/wav/wav-030-pages-ci-and-toolbar/run/run-0218-toolbar-state",
 "status_file": "docs/wav/wav-030-pages-ci-and-toolbar/run/run-0218-toolbar-state/run-0218-toolbar-state.md",
 "pln_file": "docs/wav/wav-030-pages-ci-and-toolbar/run/run-0218-toolbar-state/pln-0218-toolbar-state.md",
 "prg_file": "docs/wav/wav-030-pages-ci-and-toolbar/run/run-0218-toolbar-state/prg-0218-toolbar-state.md",
 "skill_file": "/home/tibo/git-perso/claude-agents/plugins/run-management/skills/complete-run/SKILL.md",
 "check_script": "/home/tibo/git-perso/claude-agents/plugins/run-management/skills/complete-run/scripts/check_run.py",
 "hard": false,
 "stand_in": false,
 "stand_in_command": "",
 "done": [],
 "pending": [
  "task-001",
  "task-002",
  "task-003",
  "task-004",
  "task-005",
  "task-006",
  "task-007",
  "task-008",
  "task-009",
  "task-010",
  "task-011",
  "task-012",
  "task-013"
 ],
 "levels": [
  [
   [
    {
     "id": "task-001",
     "title": "Amend the TDD with the Stage 5 findings",
     "objective": "Apply the Stage 5 findings F-1 to F-10 to the TDD, none of which changes a decision the review did not question, and mark each in the Findings of the prg.",
     "tier": "standard",
     "model": "sonnet",
     "effort": "medium",
     "agent_type": "general-purpose",
     "verify": {
      "model": "sonnet",
      "effort": "medium"
     },
     "retry": {
      "model": "sonnet",
      "effort": "high"
     },
     "sensitivity": {
      "verifier": false,
      "gate": false,
      "reasons": []
     },
     "gate": false,
     "risk": "low",
     "human_review": "none",
     "acceptance_criteria": [
      "F-1: DEC-7 and IMP-4 say the confirmation of Unfold all on the page of a view takes the view's opened and hidden sets as a parameter (mapBoxesIfOpened reads the session today)",
      "F-2: the TDD says what Compare is under 40 rem (its one control, Changes only, stays a button inline and the group has no button) and RISK-1 counts the items right",
      "F-3: key in the table is the one fact, SAVED_GROUPS is asserted equal to the groups that have a keyed control, groupOrder.saved is gone from CTR-4",
      "F-4: one rule for clearing the origin and toolPanelOpen, the lazy comparison on read plus folder-session.js, the explicit clears removed or justified, applySavedView named as the other place currentPerspective is set",
      "F-5: setViewOpened is listed as new in IMP-4 and says whether it is built on setViewListItem",
      "F-6: applyToolbarKeys has a stated signature that takes the layer and says which keys applySavedView keeps outside it (pinned, hidden, links, highlight)",
      "F-7 to F-10 applied as the prg words them",
      "Stage 9 amendments: CTR-1 gives the group button a title that is not its label; DEC-8 says the eight checks of run 0217 are check a: to check h: and the old test check i (F1): stays, check b gets the table with keys and check h is rewritten to DEC-7 (the Facet on every surface), the new tests are named check i: to check o:, and the Current State says six surfaces and a story step, not seven; DEC-9 and IMP-1 move the whole prefix of diagram-page.js (renderDiagramCanvasHtml, the toolbar renderers, renderDiagramDownloadHtml, about 225 lines) because the page is a concatenation of the parts, and ASM-4 and the tradeoff say 225 lines, not 190"
     ],
     "verification": [
      "grep -n \"mapBoxesIfOpened\" tdd-0218-toolbar-state.md shows the parameter rule in DEC-7 or IMP-4",
      "grep -c \"groupOrder.saved\" tdd-0218-toolbar-state.md prints 0",
      "grep -n \"setViewOpened\" tdd-0218-toolbar-state.md shows it listed as new in IMP-4",
      "grep -n \"applyToolbarKeys(\" tdd-0218-toolbar-state.md shows a signature with the layer",
      "grep -n \"presentation/shell.js\" tdd-0218-toolbar-state.md shows the folder in IMP-4",
      "sed -n 1,10p of the TDD still shows run: 0218 and wave: 030 in the frontmatter",
      "grep -n \"tool-group-button\" tdd-0218-toolbar-state.md shows a title in CTR-1 that is not the button's label (check f of toolbar.test.js asks it)",
      "grep -n \"check i (F1)\" tdd-0218-toolbar-state.md shows DEC-8 naming the old test and the new checks as check i: to check o:",
      "grep -n \"prefix\" tdd-0218-toolbar-state.md shows DEC-9 and IMP-1 moving the whole prefix of diagram-page.js, canvas function included, with the new part listed immediately before diagram-page.js"
     ],
     "likely_files": [
      "docs/wav/wav-030-pages-ci-and-toolbar/run/run-0218-toolbar-state/tdd-0218-toolbar-state.md",
      "docs/wav/wav-030-pages-ci-and-toolbar/run/run-0218-toolbar-state/prg-0218-toolbar-state.md"
     ],
     "tdd_excerpts": [
      "DEC-3, DEC-4, DEC-5, DEC-6, DEC-7, DEC-8, CTR-3, CTR-4, IMP-4, RISK-1",
      "Findings F-1 to F-10 of prg-0218-toolbar-state.md"
     ],
     "prd_excerpts": [
      "REQ-1 of the TDD traceability section (no PRD exists)",
      "Requirements REQ-1, REQ-2, REQ-4, REQ-5"
     ],
     "escalation_triggers": [
      "A fix contradicts a section of the TDD that the review did not name"
     ],
     "depends_on": []
    }
   ]
  ],
  [
   [
    {
     "id": "task-002",
     "title": "Save the baseline: tree state, page copy, counts, editor size map",
     "objective": "Save the tree state, a copy of the generated page, the data-lit lines, the tests that read the group markup, the editor size map, the unit result and the address-spec diff in the scratchpad, before any edit of this run's code.",
     "tier": "cheap",
     "model": "haiku",
     "effort": "high",
     "agent_type": "general-purpose",
     "verify": {
      "model": "sonnet",
      "effort": "medium"
     },
     "retry": {
      "model": "sonnet",
      "effort": "medium"
     },
     "sensitivity": {
      "verifier": false,
      "gate": false,
      "reasons": []
     },
     "gate": false,
     "risk": "low",
     "human_review": "none",
     "acceptance_criteria": [
      "The eight files exist in the scratchpad and describe the tree as it is before task-003",
      "The page copy is the committed standalone.html, after npm run editor:build left git status --short unchanged"
     ],
     "verification": [
      "ls baseline-0218 lists the eight files and none is empty",
      "grep -c tool-group src/main/editor/presentation/diagram-page.js prints a number that is not 0 (ASM-1)",
      "data-lit.txt is the output of grep -rc data-lit src/main/editor (one count per file, so it is never empty) and every count is 0",
      "map.txt shows diagram-page.js with its line count, under 1,600",
      "cmp src/main/resources/editor-webapp/standalone.html baseline-0218/standalone-before.html exits 0",
      "address-specs-diff.txt is git diff ff3bacd on diagram-address.spec.js and address.spec.js and grep -c '^-[^-]' on it prints 0",
      "unit-before.txt ends with a line that shows npm run test:unit passing on the working copy, or names the failing files so a later failure is not charged to this run"
     ],
     "likely_files": [
      "src/main/editor",
      "src/test",
      "src/main/resources/editor-webapp/standalone.html"
     ],
     "tdd_excerpts": [
      "ASM-1 (run 0217 is in the working copy)",
      "ASM-4 (diagram-page.js 1,349 lines, cap 1,600)",
      "CON-2 (address specs)"
     ],
     "prd_excerpts": [
      "REQ-6 of the TDD traceability section (no PRD exists)",
      "Requirements REQ-6, REQ-7"
     ],
     "escalation_triggers": [
      "The unit suite is red before any edit of this run",
      "npm run editor:build changes git status --short",
      "ASM-1 does not hold (run 0217 is not in the working copy)"
     ],
     "depends_on": [
      "task-001"
     ]
    }
   ]
  ],
  [
   [
    {
     "id": "task-003",
     "title": "Move the toolbar renderers to presentation/diagram-toolbar.js",
     "objective": "Move the toolbar renderers out of diagram-page.js into a part of their own, so that the assembled page is byte for byte the page it was. The page is the concatenation of the parts, and the renderers sit between renderDiagramCanvasHtml and diagramFoldTargets, so the unit moved is the whole prefix of diagram-page.js, about 225 lines, and the new part is listed immediately before diagram-page.js.",
     "tier": "standard",
     "model": "sonnet",
     "effort": "medium",
     "agent_type": "general-purpose",
     "verify": {
      "model": "sonnet",
      "effort": "medium"
     },
     "retry": {
      "model": "sonnet",
      "effort": "high"
     },
     "sensitivity": {
      "verifier": false,
      "gate": false,
      "reasons": []
     },
     "gate": false,
     "risk": "low",
     "human_review": "none",
     "acceptance_criteria": [
      "The moved prefix is in diagram-toolbar.js verbatim, line for line, and absent from diagram-page.js, which now starts at the doc comment of diagramFoldTargets; no declaration is reordered and no line is added or edited",
      "The page is unchanged and the editor check passes"
     ],
     "verification": [
      "npm run editor:build exits 0 and cmp src/main/resources/editor-webapp/standalone.html baseline-0218/standalone-before.html exits 0 (the parts are assembled verbatim, so a pure move leaves the page byte for byte)",
      "npm run editor:check exits 0 (run node scripts/check-editor.mjs --write-names first only if it says a top-level name moved, and then the names file is the only other change)",
      "wc -l src/main/editor/presentation/diagram-page.js prints fewer lines than the 1,349 of the baseline map.txt, and cat diagram-toolbar.js diagram-page.js equals the baseline copy of diagram-page.js (cmp)",
      "grep -c 'diagram-toolbar.js' src/main/editor/layers.json prints 1 and its line comes before the one of diagram-page.js",
      "npm run test:unit exits 0"
     ],
     "likely_files": [
      "src/main/editor/presentation/diagram-page.js",
      "src/main/editor/presentation/diagram-toolbar.js",
      "src/main/editor/layers.json",
      "src/main/editor/names.json",
      "src/main/resources/editor-webapp/standalone.html"
     ],
     "tdd_excerpts": [
      "DEC-9: the move is its own change and leaves the page as it was",
      "CON-6: scripts/check-editor-moves.sh compares the page byte for byte"
     ],
     "prd_excerpts": [
      "REQ-7 of the TDD traceability section (no PRD exists)",
      "Requirements REQ-7"
     ],
     "escalation_triggers": [
      "The page differs from the baseline copy after a pure move (a name was changed or a declaration reordered): undo the change in the text, never accept a different page",
      "A moved function reads a top-level name that stays in diagram-page.js and the part order would break: stop and record it"
     ],
     "depends_on": [
      "task-002"
     ]
    }
   ]
  ],
  [
   [
    {
     "id": "task-004",
     "title": "Write the table, toolbar.test.js checks (i) to (o) and toolbar-origin.test.js, red",
     "objective": "Write, before the code, the table and the node tests that say what the dot, the count, Reset, the origin, the panel and the controls of the page of a saved view must do.",
     "tier": "standard",
     "model": "sonnet",
     "effort": "medium",
     "agent_type": "general-purpose",
     "verify": {
      "model": "sonnet",
      "effort": "medium"
     },
     "retry": {
      "model": "sonnet",
      "effort": "high"
     },
     "sensitivity": {
      "verifier": false,
      "gate": false,
      "reasons": []
     },
     "gate": false,
     "risk": "medium",
     "human_review": "none",
     "acceptance_criteria": [
      "The table is valid JSON and every control has key (a view property or null), and Compare and Frame controls have none",
      "Each of checks (i) to (o) is a test of its own, covering every surface of the table, and toolbar-origin.test.js imports the functions by the names DEC-3 gives them",
      "Checks a: to g: of run 0217 and the test check i (F1): stay and pass; check b: and check h: change as the objective says and are red on the three library surfaces until task-008"
     ],
     "verification": [
      "node --test src/test/javascript/viewpoint-kernel/toolbar.test.js runs after npm run editor:build; check a:, c:, d:, e:, f:, g: and check i (F1): pass; check b: and check h: fail only on the three library surfaces with a message that names Fold all, Unfold all or the Facet; checks i: to o: fail with assertion messages that name the missing dot, count, Reset, origin or control (red by design); there is no syntax error and no missing import",
      "node --test src/test/javascript/viewpoint-kernel/toolbar-origin.test.js fails because the functions do not exist yet, with a message that names them",
      "node -e \"JSON.parse(require('fs').readFileSync('src/test/javascript/viewpoint-kernel/toolbar-controls.json','utf8'))\" exits 0",
      "npx prettier --check on the three files exits 0",
      "task-005 turns toolbar-origin.test.js green, task-006 turns checks (i) and (j) green, task-007 checks (k), (l), (m) and (o), task-008 check (n); no earlier task asks for any of them to pass"
     ],
     "likely_files": [
      "src/test/javascript/viewpoint-kernel/toolbar-controls.json",
      "src/test/javascript/viewpoint-kernel/toolbar.test.js",
      "src/test/javascript/viewpoint-kernel/toolbar-origin.test.js"
     ],
     "tdd_excerpts": [
      "DEC-8 lists checks (i) to (o)",
      "CTR-4 gives the new shape of the table",
      "the openers of header.test.js, library-view-diagram.test.js and toolbar.test.js (run 0217) are reused"
     ],
     "prd_excerpts": [
      "REQ-1 of the TDD traceability section (no PRD exists)",
      "Requirements REQ-1, REQ-3, REQ-4, REQ-5, REQ-6"
     ],
     "escalation_triggers": [
      "A check cannot be written without a decision the TDD does not hold: record it and write the test for the stated behaviour only"
     ],
     "depends_on": [
      "task-003"
     ]
    }
   ]
  ],
  [
   [
    {
     "id": "task-005",
     "title": "Add the origin, applyToolbarKeys and diagramDiffersFromOrigin; rebuild applySavedView around them",
     "objective": "Add the one new piece of state, the origin, and make applySavedView and Reset go through one key setter, in a step that first leaves every existing behaviour unchanged.",
     "tier": "standard",
     "model": "sonnet",
     "effort": "medium",
     "agent_type": "general-purpose",
     "verify": {
      "model": "sonnet",
      "effort": "medium"
     },
     "retry": {
      "model": "sonnet",
      "effort": "high"
     },
     "sensitivity": {
      "verifier": false,
      "gate": false,
      "reasons": []
     },
     "gate": false,
     "risk": "medium",
     "human_review": "after",
     "acceptance_criteria": [
      "applySavedView sets the toolbar's keys through applyToolbarKeys, records diagramOrigin as the TDD says, and keeps sending pinned, hidden, links and highlight outside it",
      "The origin is written in one place and read in two, is cleared by the lazy comparison and by folder-session.js, and is never written to a manifest, the address or browser storage",
      "A facet the workspace does not define is dropped by applyToolbarKeys as applySavedView did"
     ],
     "verification": [
      "npm run editor:build exits 0",
      "node --test src/test/javascript/viewpoint-kernel/toolbar-origin.test.js exits 0",
      "node --test $(find src/test/javascript -name 'library-view-*.test.js' -o -name 'story-*.test.js') exits 0 (the existing view and story tests are the guard that applySavedView behaves as before)",
      "grep -rn 'localStorage\\|indexedDB' src/main/editor/application/view-recipe.js prints nothing that concerns the origin",
      "grep -rc 'data-lit' src/main/editor prints 0 for every file",
      "npm run editor:check exits 0"
     ],
     "likely_files": [
      "src/main/editor/application/view-recipe.js",
      "src/main/editor/model/ui-state.js",
      "src/main/editor/application/folder-session.js",
      "src/main/editor/composition/address-routing.js"
     ],
     "tdd_excerpts": [
      "DEC-3 and CTR-3: the snapshot, its fields, who writes and who reads it",
      "DEC-2: applyToolbarKeys sets Draw, Texts and Layout and never the scale, the centre, Changes only, the pins, hidden, links, highlight or the selection",
      "IMP-2 and RISK-2: applySavedView is shared by stories, Open on diagram and the Library"
     ],
     "prd_excerpts": [
      "REQ-1 of the TDD traceability section (no PRD exists)",
      "Requirements REQ-1, REQ-2"
     ],
     "escalation_triggers": [
      "An existing story or library test fails after the refactor: fix the refactor, never the test",
      "The origin would have to be stored to work: stop, it is session state only (RFC-002 DEC-5)"
     ],
     "depends_on": [
      "task-004"
     ]
    }
   ]
  ],
  [
   [
    {
     "id": "task-006",
     "title": "Build the group header, the dot, the group button with its count, Reset and the legend",
     "objective": "Draw the new markup of the toolbar: each group with a head, a dot on Draw, Texts and Layout, a group button with its count, Reset after Layout on the surfaces of a session diagram, and the legend after Reset.",
     "tier": "standard",
     "model": "sonnet",
     "effort": "medium",
     "agent_type": "general-purpose",
     "verify": {
      "model": "sonnet",
      "effort": "medium"
     },
     "retry": {
      "model": "sonnet",
      "effort": "high"
     },
     "sensitivity": {
      "verifier": false,
      "gate": false,
      "reasons": []
     },
     "gate": false,
     "risk": "medium",
     "human_review": "none",
     "acceptance_criteria": [
      "Every group has div.tool-group-head with the name, the dot where DEC-4 says, and the group button; Compare and Frame carry the title Not part of a view",
      "The count is the number of controls with aria-pressed true or data-on true in the group's own markup",
      "Reset is aria-disabled while diagramDiffersFromOrigin() is false, shows the dot while it differs, and names the view (name cut to 24 characters, escaped) or defaults",
      "Roles and names that the e2e spec of run 0217 finds by role are unchanged"
     ],
     "verification": [
      "npm run editor:build exits 0",
      "node --test --test-name-pattern 'check i:|check j:' src/test/javascript/viewpoint-kernel/toolbar.test.js exits 0 on every surface of the table",
      "node --test --test-name-pattern 'check a:|check c:|check d:|check e:|check f:|check g:|check i \\(F1\\)' src/test/javascript/viewpoint-kernel/toolbar.test.js exits 0 (the structure checks of run 0217 still pass, check f included: the group button and Reset have a title that is not their label; check b: passes except on the three library surfaces, which task-008 turns green; the old tests that assert the old markup are task-010's)",
      "grep -rc 'data-lit' src/main/editor prints 0 for every file",
      "node scripts/build-editor.mjs --map shows no part over 1,600 lines"
     ],
     "likely_files": [
      "src/main/editor/presentation/diagram-toolbar.js",
      "src/main/editor/presentation/diagram-controls.js",
      "src/main/editor/presentation/diagram-page.js"
     ],
     "tdd_excerpts": [
      "CTR-1 gives the markup of a group, CTR-2 the Reset button, DEC-5 the count read from the group's own markup",
      "Q-1: the legend is aria-hidden, after Reset, hidden under 40 rem by CSS",
      "DEC-1: Reset is absent when host is given"
     ],
     "prd_excerpts": [
      "REQ-1 of the TDD traceability section (no PRD exists)",
      "Requirements REQ-1, REQ-3, REQ-4"
     ],
     "escalation_triggers": [
      "A part would pass 1,600 lines: stop and record it",
      "The count cannot be read from the markup for a control: record which and keep the TDD's rule"
     ],
     "depends_on": [
      "task-005"
     ]
    }
   ]
  ],
  [
   [
    {
     "id": "task-007",
     "title": "Wire Reset, the group panel, Escape and the live Frame label",
     "objective": "Make Reset restore Draw, Texts and Layout through applyToolbarKeys with one history entry and the focus kept, and make the group button open, replace and close its panel with the keyboard.",
     "tier": "standard",
     "model": "sonnet",
     "effort": "medium",
     "agent_type": "general-purpose",
     "verify": {
      "model": "sonnet",
      "effort": "medium"
     },
     "retry": {
      "model": "sonnet",
      "effort": "high"
     },
     "sensitivity": {
      "verifier": false,
      "gate": false,
      "reasons": []
     },
     "gate": false,
     "risk": "medium",
     "human_review": "none",
     "acceptance_criteria": [
      "Pressing Reset after a change in each of Draw, Texts and Layout restores the origin's keys and the address of the first drawing, leaves Changes only, zoom, pins and selection as they were, and keeps the focus on #diagram-reset-button",
      "Pressing it while disabled, by click or Enter, does nothing",
      "Escape with a panel open closes it and focuses its group button, and with none open the Esc of Maximize is unchanged",
      "applyDiagramScale also writes the zoom in Frame's button"
     ],
     "verification": [
      "npm run editor:build exits 0",
      "node --test src/test/javascript/viewpoint-kernel/toolbar.test.js exits 0 for every check but check n: and checks b: and h: on the three library surfaces, which task-008 turns green",
      "node --test $(find src/test/javascript -name 'diagram-*.test.js' -o -name 'story-*.test.js') exits 0 or the failing files are the ones task-010 names (old markup) and none is caused by a handler",
      "git diff ff3bacd -- src/test/e2e/diagram-address.spec.js src/test/e2e/address.spec.js | grep -c '^-[^-]' prints 0",
      "grep -rc 'data-lit' src/main/editor prints 0 for every file"
     ],
     "likely_files": [
      "src/main/editor/composition/events.js",
      "src/main/editor/presentation/diagram-interaction.js",
      "src/main/editor/presentation/shell.js",
      "src/main/editor/model/ui-state.js",
      "src/main/editor/composition/address-routing.js"
     ],
     "tdd_excerpts": [
      "DEC-2: pushDiagramHistory, applyToolbarKeys(origin ? origin.properties : {}), mapSelectionCheck, render; a click on aria-disabled does nothing",
      "DEC-6 and FLOW-2: one session flag, Escape closes it first and focuses the button, another group replaces, a page change clears it, a click outside does not close it (Q-2)",
      "IMP-4: shell.js keeps a list of actions that need no scroll or focus work"
     ],
     "prd_excerpts": [
      "REQ-1 of the TDD traceability section (no PRD exists)",
      "Requirements REQ-1, REQ-4"
     ],
     "escalation_triggers": [
      "Reset would need a new address key: stop, it writes only the keys the toolbar already writes (CON-2)",
      "The focus is lost after a press: fix headerControlSelector use, never add a focus jump"
     ],
     "depends_on": [
      "task-006"
     ]
    }
   ]
  ],
  [
   [
    {
     "id": "task-008",
     "title": "Add Fold all, Unfold all and Facet to the page of a saved view",
     "objective": "Draw and wire Fold all, Unfold all (Map views) and Facet (every view) on the page of a saved view as edits of the view, by the rule that a control is absent only when it can never apply.",
     "tier": "standard",
     "model": "sonnet",
     "effort": "medium",
     "agent_type": "general-purpose",
     "verify": {
      "model": "sonnet",
      "effort": "medium"
     },
     "retry": {
      "model": "sonnet",
      "effort": "high"
     },
     "sensitivity": {
      "verifier": false,
      "gate": false,
      "reasons": []
     },
     "gate": false,
     "risk": "medium",
     "human_review": "none",
     "acceptance_criteria": [
      "On a saved Map view the toolbar has Fold all, Unfold all, Hide unlinked, the parts and Facet; on a saved element view it has Facet",
      "One press changes the view and marks the entry changed, and changes neither diagramFacet nor the Map's opened of the session",
      "A facet the workspace does not define is refused with the form's message",
      "toolbar-controls.json and the manual's later table say why each absent control is absent"
     ],
     "verification": [
      "npm run editor:build exits 0",
      "node --test src/test/javascript/viewpoint-kernel/toolbar.test.js exits 0 (all checks (a) to (o))",
      "node --test $(find src/test/javascript -name 'library-view-*.test.js') exits 0 or the failing files are the ones task-010 names (old markup)",
      "grep -rc 'data-lit' src/main/editor prints 0 for every file",
      "npm run editor:check exits 0"
     ],
     "likely_files": [
      "src/main/editor/presentation/diagram-toolbar.js",
      "src/main/editor/presentation/stories-pages.js",
      "src/main/editor/presentation/diagram-page.js",
      "src/main/editor/presentation/view-edit.js",
      "src/main/editor/presentation/element-form.js",
      "src/main/editor/composition/events.js"
     ],
     "tdd_excerpts": [
      "DEC-7: one editSavedView call per press; the session's diagramFacet and Map opened are untouched",
      "The confirmation above MAP_UNFOLD_CONFIRM_BOXES takes the view's opened and hidden sets, as task-001 amended it",
      "ASM-2: diagramScene.expandable lists the boxes Unfold all may open; with no scene it does nothing"
     ],
     "prd_excerpts": [
      "REQ-5 of the TDD traceability section (no PRD exists)",
      "Requirements REQ-5"
     ],
     "escalation_triggers": [
      "The scene is not available on the page of a view (ASM-2 fails): record it, make the control do nothing before the first drawing, and do not add a second source of expandable boxes"
     ],
     "depends_on": [
      "task-007"
     ]
    }
   ]
  ],
  [
   [
    {
     "id": "task-009",
     "title": "Write the styles: dot, head, group button and panel, muted Reset, legend",
     "objective": "Make the toolbar one or two rows of compact buttons under 40 rem with an overlaying panel, and the head, the dot and the legend readable above it, in light and dark.",
     "tier": "standard",
     "model": "sonnet",
     "effort": "medium",
     "agent_type": "general-purpose",
     "verify": {
      "model": "sonnet",
      "effort": "medium"
     },
     "retry": {
      "model": "sonnet",
      "effort": "high"
     },
     "sensitivity": {
      "verifier": false,
      "gate": false,
      "reasons": []
     },
     "gate": false,
     "risk": "medium",
     "human_review": "after",
     "acceptance_criteria": [
      "Only var(--accent), var(--muted) and the other theme tokens are used; no literal colour",
      "The panel does not move the canvas",
      "With the browser pane available the toolbar is measured at 1280 and at 360 by 740 in light and dark and the heights are recorded; without it the record says not checked"
     ],
     "verification": [
      "npm run editor:build exits 0",
      "node --test src/test/javascript/viewpoint-kernel/css-theme-audit.test.js exits 0",
      "node --test src/test/javascript/viewpoint-kernel/toolbar.test.js exits 0",
      "grep -n 'tool-group-button' src/main/editor/style.css shows the rule inside @media (max-width: 40rem)",
      "npx prettier --check src/main/editor/style.css exits 0"
     ],
     "likely_files": [
      "src/main/editor/style.css",
      "src/test/javascript/viewpoint-kernel/css-theme-audit.test.js"
     ],
     "tdd_excerpts": [
      "DEC-5: above 40 rem the button is hidden and the name shown, under it the name and the controls are hidden, the button shown, the controls shown as an overlaying panel when data-open is true",
      "DEC-6: at 360 by 740 the toolbar is at most 148 px high; padding shrinks before the bar is raised (RISK-1)",
      "The dot stays in the head under 40 rem (CTR-1)"
     ],
     "prd_excerpts": [
      "REQ-3 of the TDD traceability section (no PRD exists)",
      "Requirements REQ-3, REQ-4"
     ],
     "escalation_triggers": [
      "The 148 px bar is missed at 360 by 740 after the padding shrinks: record the measure as a finding and do not raise the bar",
      "The browser pane is unavailable: record the look as not checked"
     ],
     "depends_on": [
      "task-008"
     ]
    }
   ]
  ],
  [
   [
    {
     "id": "task-010",
     "title": "Repair the tests that assert the old markup and meet the coverage floor",
     "objective": "Bring every existing test that counts groups or slices the markup at the old group name back to green without weakening what it asserts, and meet the coverage floor with the new code covered by node tests.",
     "tier": "standard",
     "model": "sonnet",
     "effort": "medium",
     "agent_type": "general-purpose",
     "verify": {
      "model": "sonnet",
      "effort": "medium"
     },
     "retry": {
      "model": "sonnet",
      "effort": "high"
     },
     "sensitivity": {
      "verifier": false,
      "gate": false,
      "reasons": []
     },
     "gate": false,
     "risk": "medium",
     "human_review": "none",
     "acceptance_criteria": [
      "Each edited test keeps its assertion's meaning, with a comment that names the new markup when it changed; the list of edited files is in the Findings of the prg",
      "No file under src/main/editor changes in this task except if a missing cover requires a test seam, and then the record says which"
     ],
     "verification": [
      "npm run test:unit exits 0",
      "npm run test:coverage exits 0 (the floor is met)",
      "git diff scripts/editor-coverage-floor.json shows no lowered number",
      "npm run format:check exits 0 and npm run lint exits 0",
      "grep -rc 'data-lit' src/main/editor prints 0 for every file"
     ],
     "likely_files": [
      "src/test/javascript",
      "scripts/editor-coverage-floor.json"
     ],
     "tdd_excerpts": [
      "IMP-7: tests that count [role=group] or slice at tool-group-name are found with grep -n 'tool-group' src/test",
      "CON-8: the floor only goes up"
     ],
     "prd_excerpts": [
      "REQ-6 of the TDD traceability section (no PRD exists)",
      "Requirements REQ-6, REQ-7"
     ],
     "escalation_triggers": [
      "A repair would need an assertion to be loosened: stop and name the test in the record",
      "Coverage is under the floor and the uncovered code is in a handler: add a node test, never lower the floor"
     ],
     "depends_on": [
      "task-009"
     ]
    }
   ]
  ],
  [
   [
    {
     "id": "task-011",
     "title": "Extend the end-to-end spec: Reset, dot, count, panel, 360 px bar, Unfold all on a view",
     "objective": "Prove in a real browser what the node tests prove on the markup: Reset disabled then enabled and restoring, the dot by role on three groups, the written view's keys, the page of a Map view, and the 360 by 740 bar with its buttons, counts, panel and Escape.",
     "tier": "standard",
     "model": "sonnet",
     "effort": "medium",
     "agent_type": "general-purpose",
     "verify": {
      "model": "sonnet",
      "effort": "medium"
     },
     "retry": {
      "model": "sonnet",
      "effort": "high"
     },
     "sensitivity": {
      "verifier": false,
      "gate": false,
      "reasons": []
     },
     "gate": false,
     "risk": "medium",
     "human_review": "after",
     "acceptance_criteria": [
      "Each listed assertion is a test or a step of a test, on every surface that applies",
      "The spec at 360 by 740 asserts the document is 360 px wide, the toolbar at most 148 px high, each button's name includes its count, Escape closes a panel and focuses its button, and Frame shows the zoom after a zoom key",
      "The two address specs are untouched"
     ],
     "verification": [
      "JAVA_HOME=/home/tibo/.sdkman/candidates/java/25.0.4-tem ./mvnw package -Dmaven.test.skip -Dplugin.asciidoctor.skip=true exits 0 (the e2e suite runs the packaged jar; run it once before the spec)",
      "npx playwright test src/test/e2e/diagram-toolbar.spec.js exits 0 on every project that runs it, WebKit included; a project that cannot start is recorded as not run, never as passed",
      "git diff ff3bacd -- src/test/e2e/diagram-address.spec.js src/test/e2e/address.spec.js | grep -c '^-[^-]' prints 0",
      "npx prettier --check src/test/e2e/diagram-toolbar.spec.js exits 0 and npm run lint exits 0"
     ],
     "likely_files": [
      "src/test/e2e/diagram-toolbar.spec.js",
      "playwright.config.js",
      "src/test/CLAUDE.md"
     ],
     "tdd_excerpts": [
      "Observability and Verification 5 lists the assertions",
      "ASM-3: toBeDisabled() reads aria-disabled; ASM-5: node and browser read the same count",
      "CON-4: the toolbar spec is already in the WebKit testMatch; add tests, not a file"
     ],
     "prd_excerpts": [
      "REQ-1 of the TDD traceability section (no PRD exists)",
      "Requirements REQ-1, REQ-3, REQ-4, REQ-5, REQ-6"
     ],
     "escalation_triggers": [
      "The WebKit spec flakes or a browser is not installed: stabilise or reduce the spec, never retry; record a project not run",
      "Reset or the panel behaves in a browser as the node tests said it could not: record a finding, fix the code, add the node test"
     ],
     "depends_on": [
      "task-010"
     ]
    },
    {
     "id": "task-012",
     "title": "Write the manual and the note of the presentation layer",
     "objective": "Describe what the toolbar now does in the manual under the two anchors the gate names, and in the note of the layer, with the voice rules of the manual.",
     "tier": "standard",
     "model": "sonnet",
     "effort": "medium",
     "agent_type": "general-purpose",
     "verify": {
      "model": "sonnet",
      "effort": "medium"
     },
     "retry": {
      "model": "sonnet",
      "effort": "high"
     },
     "sensitivity": {
      "verifier": false,
      "gate": false,
      "reasons": []
     },
     "gate": false,
     "risk": "low",
     "human_review": "none",
     "acceptance_criteria": [
      "Every anchor of git show ff3bacd:src/doc/README.adoc is still defined",
      "The manual says what Reset restores and what it leaves, what the dot means, and the rule that a control is absent only when it can never apply",
      "No emoji and no real workspace content"
     ],
     "verification": [
      "node --test src/test/javascript/manual-skeleton.test.js src/test/javascript/manual-voice.test.js exits 0",
      "for each id in git show ff3bacd:src/doc/README.adoc matching [[id]], grep -c '[[id]]' src/doc/README.adoc prints 1 or more (compare with the anchors saved by the check of task-013 if needed)",
      "grep -n 'editor-toolbar' src/doc/README.adoc prints nothing",
      "npm run format:check exits 0",
      "No Maven command and no npm run editor:build is run by this task (it runs beside task-011)"
     ],
     "likely_files": [
      "src/doc/README.adoc",
      "src/main/editor/presentation/CLAUDE.md"
     ],
     "tdd_excerpts": [
      "IMP-9: no [[editor-toolbar]] section; the two existing anchors only",
      "IMP-8: a note of what the code does, history stays in the progress log",
      "manual-voice.test.js: the four filler words are absent"
     ],
     "prd_excerpts": [
      "REQ-8 of the TDD traceability section (no PRD exists)",
      "Requirements REQ-8, REQ-9"
     ],
     "escalation_triggers": [
      "A sentence of the manual needs a fact the TDD does not hold: leave it out and record it"
     ],
     "depends_on": [
      "task-010"
     ]
    }
   ]
  ],
  [
   [
    {
     "id": "task-013",
     "title": "Prove the whole run",
     "objective": "Run every check of the TDD's verification list in order on the final tree and record the results, naming what is not proved.",
     "tier": "standard",
     "model": "sonnet",
     "effort": "medium",
     "agent_type": "general-purpose",
     "verify": {
      "model": "sonnet",
      "effort": "medium"
     },
     "retry": {
      "model": "sonnet",
      "effort": "high"
     },
     "sensitivity": {
      "verifier": false,
      "gate": false,
      "reasons": []
     },
     "gate": false,
     "risk": "medium",
     "human_review": "after",
     "acceptance_criteria": [
      "Every item has a result line, and a check that could not run is recorded as not run",
      "npm run editor:build run twice leaves git status --short as it was after the first"
     ],
     "verification": [
      "npm run editor:build run twice leaves git status --short unchanged between the two, and npm run editor:check exits 0",
      "npm run test:unit, npm run test:coverage, npm run format:check and npm run lint exit 0 and grep -rc 'data-lit' src/main/editor prints 0 for every file",
      "npx playwright test exits 0 on every project (Chromium, Firefox, WebKit) after the jar of task-011 is current",
      "git diff ff3bacd -- src/test/e2e/diagram-address.spec.js src/test/e2e/address.spec.js | grep -c '^-[^-]' prints 0",
      "JAVA_HOME=/home/tibo/.sdkman/candidates/java/25.0.4-tem scripts/byte-identity.sh exits 0 with no new line in scripts/byte-identity-exceptions.txt",
      "JAVA_HOME=/home/tibo/.sdkman/candidates/java/25.0.4-tem ./mvnw test -Dtest=ManualExamplesTest+ArchitectureDriftTest exits 0, and node --test src/test/javascript/manual-skeleton.test.js src/test/javascript/manual-voice.test.js exits 0",
      "JAVA_HOME=/home/tibo/.sdkman/candidates/java/25.0.4-tem ./mvnw verify exits 0 (the CI command, run once at the end)",
      "npm run sample:check exits 0"
     ],
     "likely_files": [
      "docs/wav/wav-030-pages-ci-and-toolbar/run/run-0218-toolbar-state/prg-0218-toolbar-state.md"
     ],
     "tdd_excerpts": [
      "Observability and Verification items 1 to 9 and the list of what is not proved",
      "CON-7: byte identity against archicode-0.19.0 with JDK 25"
     ],
     "prd_excerpts": [
      "REQ-6 of the TDD traceability section (no PRD exists)",
      "Requirements REQ-6, REQ-7, REQ-8, REQ-9"
     ],
     "escalation_triggers": [
      "A check fails for a reason this run did not cause: list it and leave it",
      "A browser or the pane is not available: record not run, never passed"
     ],
     "depends_on": [
      "task-011",
      "task-012"
     ]
    }
   ]
  ]
 ],
 "blocked": [],
 "commit_tasks": true,
 "generator_script": "/home/tibo/git-perso/claude-agents/plugins/run-management/skills/complete-wave/scripts/complete_wave.py",
 "run_completed": false
}
// ---- run implement engine (shared text: generated implement files and the shipped `run-implement` workflow) ----
// Every agent below is a leaf: it has neither the Workflow tool nor the Agent tool, so a task agent
// works its task inline and nothing here asks any agent to dispatch. Per lane of pending tasks:
// implementation agent (model and effort of the task's tier) -> independent verification agent ->
// (on failure, ONE escalation: a retry one rung up, then verified again) -> a marker agent writes the
// task's done status and results line into the pln. A task or check that needs a commit or a clean tree (nobody commits here)
// is reported unmeetable and stops the workflow at once with state awaiting-commit (no retry, which could not help; the task stays pending). After the last task: Stage 11 and an independent
// final check. A second failure of a task stops the workflow with state blocked.
// Model and effort of every agent come from PLAN (the cost profile `PLAN.cost_profile` applied to the need table by the
// generator, complete-wave/references/profiles.json); this engine names none of its own except the stand-in test agents.
const AG = PLAN.agents
const opt = (key, o) => ({ ...o, model: AG[key].model, effort: AG[key].effort })
const ROOT = `Working directory: ${PLAN.repo_root} (absolute path of the repository root). Every repository-relative path below is relative to it: cd there first, and never search the disk for a path that is named below.\n`
const STAND_IN_NOTE = PLAN.stand_in ? ' (STAND-IN TEST: do only what is asked, nothing else)' : ''
const IMPL_SCHEMA = {
  type: 'object',
  properties: { task: { type: 'string' }, done: { type: 'boolean' }, summary: { type: 'string' }, files_touched: { type: 'array', items: { type: 'string' } }, blocker: { type: 'string' }, unmeetable: { type: 'boolean' }, not_started: { type: 'boolean' } },
  required: ['task', 'done', 'summary'],
}
const VERIFY_SCHEMA = {
  type: 'object',
  properties: {
    task: { type: 'string' }, passed: { type: 'boolean' },
    checks: { type: 'array', items: { type: 'object', properties: { check: { type: 'string' }, ran: { type: 'string' }, result: { type: 'string' } }, required: ['check', 'ran', 'result'] } },
    failing_output: { type: 'string' }, unmeetable: { type: 'boolean' }, outside_likely_files: { type: 'array', items: { type: 'string' } },
    changed_files: { type: 'array', items: { type: 'object', properties: { path: { type: 'string' }, outside: { type: 'boolean' } }, required: ['path', 'outside'] } },
  },
  required: ['task', 'passed', 'checks'],
}
const FINAL_SCHEMA = {
  type: 'object',
  properties: { run_status: { type: 'string' }, pln_status: { type: 'string' }, check_run_exit: { type: 'integer' }, check_run_named: { type: 'string' }, unmet: { type: 'array', items: { type: 'string' } }, not_verified: { type: 'string' } },
  required: ['run_status', 'pln_status', 'check_run_exit'],
}
const COMMIT_SCHEMA = {
  type: 'object',
  properties: { committed: { type: 'boolean' }, commit: { type: 'string' }, files: { type: 'array', items: { type: 'string' } }, reason: { type: 'string' } },
  required: ['committed'],
}
const PRG = PLAN.prg_file
const WAVE_DOCS = PLAN.run_dir.includes('/run/') ? PLAN.run_dir.replace(/\/run\/[^/]+\/?$/, '') + '/*.md' : '(none)'
const PLN = PLAN.pln_file
// numbered progress groups (2.22.0): every agent is created under a phase whose title starts with a zero-padded number, so a UI that sorts groups
// alphabetically shows them in execution order. `PH` is the default group; a call that runs in parallel with others passes its own.
const pad = (n, w = 2) => String(n).padStart(w, '0')
// one group per task, numbered in execution order (levels, then lanes): 01 · task-001 · title; the agents of a task (task-, verify-, retry-, reverify-,
// commit-, and the lane marker, which carries the first task of its lane) are found by the task id their label ends with
const ALLTASKS = (PLAN.levels || []).flatMap((lv) => lv.flatMap((ln) => ln))
const NW = Math.max(2, String(ALLTASKS.length + 2).length)
const TPH = {}
ALLTASKS.forEach((t, i) => { TPH[t.id] = `${pad(i + 1, NW)} · ${t.id} · ${String(t.title || '').slice(0, 48)}` })
let PH = `${pad(0, NW)} · setup`
const ag = (prompt, o, ph) => {
  const hit = ph === undefined && o && o.label ? Object.keys(TPH).find((id) => o.label.endsWith('-' + id)) : null
  const p = ph !== undefined ? ph : hit ? TPH[hit] : PH
  return agent(prompt, p ? { ...o, phase: p } : o)
}
const results = []
const findings = []
// executor, verifier and retry pair of every task, and the Stage 11 pair, are resolved by the generator (profiles.py):
// the Delegation Policy's escalation on failure (one rung up; at the top of its range the Policy says inline in the session,
// which a leaf cannot do, so the nearest honest rung is the profile's strongest tier at high) is computed there.

function entryPrompt(text) {
  return (ROOT +
  `Append one dated line to the Log section of ${PRG} (use today's date from \`date +%F\`; add it after the last Log line, before "## Findings"; if the file does not exist create it with the frontmatter type: prg, run: ${PLAN.run}, status: active${PLAN.wave ? ', wave: ' + PLAN.wave : ''} and the headings "# Progress Log", "## Log", "## Findings", "## Lessons Learnt"). ` +
  `Write exactly this text after "- <date>: " and change nothing else in the file:\n\n${text}\n\nReturn the word done.${STAND_IN_NOTE}`)
}
const stop = async (reason, detail) => {
  await ag(entryPrompt(`implement workflow stopped, state blocked: ${reason} ` + JSON.stringify(detail)), opt('bookkeeping', { label: 'prg-escalation' }))
  return { state: 'blocked', reason, detail, results, findings }
}
// an agent that did not start: it says so (not_started), or it reports done false having touched no file and without calling the task unmeetable.
// The harness relays the launching session's last chat message ahead of the brief and ranks it above it (archicode wave 025), so such an agent
// may refuse without setting the flag; a retry of the same brief would meet the same refusal, so it goes to the operator, not to the escalation.
const didNotStart = (x) => !!x && !x.unmeetable && (!!x.not_started || (x.done === false && !(x.files_touched && x.files_touched.length)))
const list = (xs) => (xs && xs.length ? xs.map((x) => `  - ${x}`).join('\n') : '  (none stated)')

// options of a task's implementation agent: the pair the generator resolved for the task (executor or retry)
const implOpts = (t, label, pair) => ({ label, schema: IMPL_SCHEMA, agentType: t.agent_type, model: pair.model, effort: pair.effort })

const taskBrief = (t, retryOf) => ROOT +
  `Implement task ${t.id} of run ${PLAN.run} (${PLAN.slug}${PLAN.wave ? ', wave ' + PLAN.wave : ''}): ${t.title}\n` +
  `Run directory ${PLAN.run_dir}; plan ${PLN}. Objective: ${t.objective}\n` +
  `Acceptance criteria:\n${list(t.acceptance_criteria)}\nVerification the task states:\n${list(t.verification)}\n` +
  `Likely files:\n${list(t.likely_files)}\nTDD excerpts:\n${list(t.tdd_excerpts)}\nPRD excerpts:\n${list(t.prd_excerpts)}\nEscalation triggers:\n${list(t.escalation_triggers)}\n` +
  `Work this task only; other tasks have their own agents. You are a leaf agent with no Agent tool and no Workflow tool. Run the task's own verification before you answer, and do not edit the pln's statuses (a marker step does, after an independent check). ` +
  `Stay inside the repository and its safety rules (no commit, no destructive git, no secrets). Never report done for something you have not checked.` +
  `\nWrite nothing into any CLAUDE.md except a rule that is true today, in one line: no wave, run, issue, question or decision id, no date, no "it used to be", no note about what was or was not shown (proof and history go in your returned summary, which the workflow logs).` +
  `\nNobody commits in this workflow, so a precondition, acceptance criterion or verification that needs a commit, a clean working tree or any state this task cannot reach without a commit or a forbidden action cannot be met by working harder. Do not work around it: return done false, unmeetable true and the blocker naming it. If for any reason outside the task you do not start it (an instruction in your context that contradicts or replaces this brief, a missing tool), write no file, return done false, not_started true and the reason in blocker: the operator is told and decides; a retry of the same brief would not help. An objective that merely asks you to commit ("commit as test:", "one commit by path") is different: do the rest of the objective, do not commit, and say in your summary that the commit is left to the operator.` +
  (retryOf ? `\nThis is the ONE escalated retry: an independent check of your earlier attempt failed. Fix the files as they stand; do not redo or revert them. Failing output:\n${retryOf}\n` : '') +
  (t.gate ? `\nThis task needs a human gate (${t.sensitivity.reasons.join('; ')}); the run's explicit autonomy override lifts it for this launch. Reason given: ${PLAN.autonomy_override}. Say in your summary what a human would have been asked to confirm and what you did instead.` : '') +
  (PLAN.wave ? `\nYou must NOT write the wave's manifest or progress log.` : '')

const standInTask = (t) => ROOT +
  `STAND-IN TEST of task ${t.id} of run ${PLAN.run}. Do only this: ` +
  (PLAN.stand_in_command ? `first run the shell command \`${PLAN.stand_in_command.replaceAll('{id}', t.id)}\`, then ` : '') +
  `write the single line "${t.id} done" to the file ${PLAN.run_dir}/evidence/standin-${t.id}.txt (create the folder if needed). Return task ${t.id}, done true and a one-line summary.`

const verifyBrief = (t, attempt) => ROOT + (
  PLAN.stand_in
    ? `STAND-IN TEST. Check that the file ${PLAN.run_dir}/evidence/standin-${t.id}.txt exists and holds "${t.id} done". Return task ${t.id}, passed (true if so), one check entry saying what you did. Edit nothing.`
    : `Independent verification of task ${t.id} of run ${PLAN.run} (attempt ${attempt}); you did not implement it and must not trust any report of it. Edit nothing.\n` +
      `Task: ${t.title}\nObjective: ${t.objective}\nAcceptance criteria:\n${list(t.acceptance_criteria)}\nVerification stated:\n${list(t.verification)}\nLikely files:\n${list(t.likely_files)}\n` +
      `Run every stated verification yourself and read the actual files against each acceptance criterion, not the implementer's words. One entry in checks per verification or criterion: what you ran or read (ran) and what happened (result). passed is true only if every one holds; otherwise put the failing output in failing_output. ` +
      `Compare \`git status --porcelain\` with the likely files and list changes outside them (other tasks' files, ${PLAN.run_dir} and the wave's own documents ${WAVE_DOCS} excepted) in outside_likely_files. ` +
      `Also return changed_files: every path of that status that this task changed (its likely files, plus each outside_likely_files path with outside true), as repository-relative paths, leaving out anything git ignores and anything under target/. ` +
      `Nobody commits in this workflow: a check that needs a commit or a clean working tree cannot hold whatever the implementer does, so set unmeetable true, passed false, and name the check in failing_output. A commit the task's objective asks for is not a criterion here: do not fail the task for its absence, check the rest and note in a check entry that the commit is left to the operator.`)

// only with PLAN.commit_tasks (--commit-tasks): the one place this workflow commits, by path, after a verifier found a check that needs the commit
const commitBrief = (t, files) => ROOT +
  `Commit the work of task ${t.id} of run ${PLAN.run} (${t.title}), by path, and nothing else. Files: ${files.map((f) => '\`' + f + '\`').join(', ')}. ` +
  `Run \`git add -- <those paths>\` (never \`git add -A\` or \`git add .\`) and \`git commit -m "chore(run-${PLAN.run}): ${t.id} ${t.title.replaceAll('"', "'")}"\`; no amend, no push, no hook bypass, no other git command that changes history or the index beyond those paths. ` +
  `If a path is not changed or the commit fails, commit nothing more and return committed false with the reason. Otherwise return committed true, the short hash in commit and the files.`

// ONE marker per lane (wave 2.21.0): the pln is re-read and re-edited once for every task of the lane that passed its independent check
// (done) or failed it for good (blocked), instead of once per task; each task still gets its own status and its own `results:` line
const laneMarkerBrief = (marks) => ROOT +
  `Record the outcome of ${marks.length} task(s) of run ${PLAN.run} in ${PLN} with one command; edit nothing yourself and do not read the file. Run exactly this from the repository root and report its result:\n` +
  `python3 "${PLAN.generator_script}" mark ${PLN} --marks-json - <<'MARKS_JSON'\n` + JSON.stringify(marks.map((m) => ({ id: m.id, status: m.status, line: m.line }))) + `\nMARKS_JSON\n` +
  `Return the exit code of the command in exit and, if it is not 0, its stderr in message.${STAND_IN_NOTE}`
const MARK_SCHEMA = { type: 'object', properties: { exit: { type: 'integer' }, message: { type: 'string' } }, required: ['exit'] }

const startBrief = () => ROOT +
  `Start the implementation of run ${PLAN.run}: in ${PLN} set the \`status\` of the execution_manifest block to 'in_progress' unless it already reads 'done', and in ${PLAN.status_file} set the frontmatter \`status:\` to 'in-progress' unless it already reads 'completed'. Change nothing else. Return the word done.${STAND_IN_NOTE}`

const finalBrief = () => ROOT +
  `Stage 11 of run ${PLAN.run} (${PLAN.slug}). Read the section "## Stage 11 — Verification" of ${PLAN.skill_file} and carry it out for this run: ${PLN} Verification Plan, every PRD acceptance criterion re-checked against the files, repository-wide checks, ` +
  `then the pln's execution_manifest status (done only if every criterion holds, otherwise blocked with the unmet criteria named), the run's status (completed or in-progress) and its prg, the backlog sweep, the canonical obligations. ` +
  `You are a leaf agent with no Agent tool; tasks were implemented and independently verified one by one by earlier agents (${PLAN.pending.length ? PLAN.pending.join(', ') : 'none this generation'}; already done: ${PLAN.done.join(', ') || 'none'}). ` +
  `Run \`python3 "${PLAN.check_script}" --as-completed ${PLAN.run_dir}\` before you set completed. Return the statuses as read back from the files, the check's exit code and the item it names if not 0, and every unmet criterion. Append one Log line starting "- <date>: Stage 11" to ${PRG}. ` +
  `Stay inside the repository and its safety rules. Never report success you have not checked.`
const finalCheckBrief = () => ROOT + (
  PLAN.stand_in
    ? `STAND-IN TEST. Read ${PLAN.status_file} and ${PLN}; return run_status (frontmatter status), pln_status (execution_manifest status) and check_run_exit 0. Edit nothing.`
    : `Independent final check of run ${PLAN.run}; you did not do Stage 11. Edit nothing. Return run_status as read from ${PLAN.status_file}, pln_status as read from the execution_manifest block of ${PLN}, ` +
      `and run \`python3 "${PLAN.check_script}" --as-completed ${PLAN.run_dir}\` yourself: check_run_exit and, if not 0, check_run_named. List in unmet any task of the pln whose status is not done.`)

if (PLAN.pending.length === 0 && PLAN.blocked.length === 0 && PLAN.run_completed) {
  return { state: 'nothing-to-do', note: 'every task is done and the run is completed', results }
}
if (PLAN.blocked.length) return await stop('tasks blocked before start', PLAN.blocked)

// overrides of declared tiers, the human gate and the autonomy override are written to the run's prg before anything
// runs, so the log says what the generated file says (the same list is in the file's header comment)
const GATED = PLAN.gated || []
const OVERRIDES = PLAN.overrides || []
const overrideText = () => `implement workflow generated with cost profile ${PLAN.cost_profile}. ` +
  `Overrides of declared tiers (${OVERRIDES.length}): ${OVERRIDES.length ? OVERRIDES.join(' | ') : 'none'}. ` +
  `Human gate required for: ${GATED.length ? GATED.join(', ') : 'no task'}. ` +
  `Autonomy override: ${PLAN.autonomy_override ? 'carried by the launch, reason: ' + PLAN.autonomy_override : 'none'}.`
const awaiting = async (lane) => {
  const tasks = lane.filter((t) => t.gate).map((t) => ({ task: t.id, title: t.title, reasons: t.sensitivity.reasons }))
  await ag(entryPrompt(`implement workflow stopped, state awaiting-human: ${tasks.map((x) => x.task).join(', ')} need a human gate and no agent was given the task(s) ` +
    JSON.stringify(tasks) + `. Provide the validation yourself, or regenerate with --autonomy-override "<reason>" to lift the gate explicitly; tasks already done are dropped on regeneration.`), opt('bookkeeping', { label: 'prg-awaiting-human' }))
  return { state: 'awaiting-human', tasks, results, findings }
}
if (OVERRIDES.length || GATED.length || PLAN.autonomy_override) {
  const logged = await ag(entryPrompt(overrideText()), opt('bookkeeping', { label: 'prg-overrides' }))
  if (!logged) return await stop('overrides entry returned nothing', PLAN.run)
}

let started = null
for (const level of PLAN.levels) {
  for (const lane of level) {
    if (lane.some((t) => t.gate) && !PLAN.autonomy_override) return await awaiting(lane)
    if (!started) {
      started = await ag(startBrief(), opt('bookkeeping', { label: 'start' }))
      if (!started) return await stop('start step returned nothing', PLAN.run)
    }
    const impl = await parallel(lane.map((t) => () => PLAN.stand_in
      ? ag(standInTask(t), { label: `task-${t.id}`, schema: IMPL_SCHEMA, model: 'haiku', effort: 'low' })
      : ag(taskBrief(t), implOpts(t, `task-${t.id}`, t))))
    // with --commit-tasks an implementer that calls its task unmeetable (it cannot make a commit-dependent check hold) is verified all the same:
    // the independent verifier confirms the claim before anything is committed, and only the verifier's word leads to the commit below
    const verifiable = (x) => !!x && !didNotStart(x) && (!x.unmeetable || (PLAN.commit_tasks && !PLAN.stand_in && !!(x.files_touched && x.files_touched.length)))
    const ver = await parallel(lane.map((t, i) => () => verifiable(impl[i])
      ? ag(verifyBrief(t, 1), PLAN.stand_in
          ? { label: `verify-${t.id}`, schema: VERIFY_SCHEMA, model: 'haiku', effort: 'low' }
          : { label: `verify-${t.id}`, schema: VERIFY_SCHEMA, model: t.verify.model, effort: t.verify.effort })
      : null))
    const failed = []
    lane.forEach((t, i) => {
      if (!impl[i] || !impl[i].done || !ver[i] || !ver[i].passed) failed.push(i)
    })
    // one escalation rung (the pair is t.retry), then verify again; a hard_judgment task is already at the top and is retried as is
    const second = {}
    for (const i of failed) {
      const t = lane[i]
      if (didNotStart(impl[i])) {
        second[i] = { again: null, v2: null, effort: null, why: impl[i].blocker || impl[i].summary || 'task not started', notStarted: true }
        continue
      }
      if ((impl[i] && impl[i].unmeetable) || (ver[i] && ver[i].unmeetable)) {
        if (PLAN.commit_tasks && !PLAN.stand_in && impl[i] && (impl[i].done || impl[i].unmeetable) && ver[i] && ver[i].unmeetable) {
          const files = impl[i].files_touched && impl[i].files_touched.length ? impl[i].files_touched : (t.likely_files || [])
          const c = files.length ? await ag(commitBrief(t, files), opt('bookkeeping', { label: `commit-${t.id}`, schema: COMMIT_SCHEMA })) : null
          if (c && c.committed) {
            const v2 = await ag(verifyBrief(t, 2), { label: `reverify-${t.id}`, schema: VERIFY_SCHEMA, model: t.verify.model, effort: t.verify.effort })
            second[i] = { again: { ...impl[i], done: true }, v2, effort: null, why: ver[i].failing_output || 'unmeetable check', committed: c.commit || 'yes' }
            continue
          }
        }
        const named = (impl[i] && impl[i].unmeetable && (impl[i].blocker || impl[i].summary)) || (ver[i] && ver[i].failing_output) || 'unmeetable precondition'
        second[i] = { again: null, v2: null, effort: null, why: named, unmeetable: true }
        continue
      }
      const why = !impl[i] ? 'implementation agent returned nothing' : !impl[i].done ? ('reported not done: ' + (impl[i].blocker || impl[i].summary)) : !ver[i] ? 'verification agent returned nothing' : (ver[i].failing_output || 'verification failed')
      const effort = t.retry.effort
      const again = PLAN.stand_in
        ? await ag(standInTask(t), { label: `retry-${t.id}`, schema: IMPL_SCHEMA, model: 'haiku', effort: 'low' })
        : await ag(taskBrief(t, why), implOpts(t, `retry-${t.id}`, t.retry))
      const v2 = again
        ? await ag(verifyBrief(t, 2), PLAN.stand_in
            ? { label: `reverify-${t.id}`, schema: VERIFY_SCHEMA, model: 'haiku', effort: 'low' }
            : { label: `reverify-${t.id}`, schema: VERIFY_SCHEMA, model: t.verify.model, effort: t.verify.effort })
        : null
      second[i] = { again, v2, effort, why }
    }
    const bad = []
    const commitWait = []
    const operatorWait = []
    const marks = []
    for (let i = 0; i < lane.length; i++) {
      const t = lane[i]
      const esc = second[i]
      const passed = esc ? !!(esc.again && esc.again.done && esc.v2 && esc.v2.passed) : true
      if (esc && esc.committed && esc.v2 && esc.v2.unmeetable) { esc.unmeetable = true; esc.why = esc.v2.failing_output || esc.why }
      const v = esc ? esc.v2 : ver[i]
      results.push({ task: t.id, tier: t.tier, model: t.model, effort: t.effort, first_pass: !esc, escalated_to: esc ? esc.effort : null, verified: v })
      if (esc && esc.notStarted) {
        // the agent did not start (nothing written): no retry, the task stays pending and the operator decides
        operatorWait.push({ task: t.id, title: t.title, reason: esc.why })
        continue
      }
      if (!passed && esc.unmeetable) {
        // not a failure of the task: its work is on disk and only a commit (which this workflow never makes) is missing; it stays pending,
        // so the next generation resumes it once the operator has committed
        // the operator commits in one command: the task's files plus the changes the verifier saw outside them, which stay listed apart
        // (never committed by this workflow: an unknown file such as a build artefact is the operator's call)
        const files = (impl[i] && impl[i].files_touched && impl[i].files_touched.length ? impl[i].files_touched : t.likely_files) || []
        const outside = ((v && v.outside_likely_files) || (ver[i] && ver[i].outside_likely_files) || []).filter((f) => !files.includes(f))
        // the list to commit is what the verifier saw changed by this task, outside-declared paths marked; the implementer's own list is only the fallback
        const changed = (v && v.changed_files) || (ver[i] && ver[i].changed_files) || []
        const add = changed.length ? changed.map((c) => c.path) : files
        commitWait.push({ task: t.id, title: t.title, files, outside_likely_files: outside, changed_files: changed, check: esc.why, git_add: add.length ? 'git add -- ' + add.join(' ') : null })
        continue
      }
      if (!passed) {
        bad.push(esc.unmeetable ? `${t.id}: unmeetable, no retry (${esc.why})` : `${t.id}: failed twice (${esc.why})`)
        marks.push({ id: t.id, status: 'blocked', line: esc.unmeetable ? `tier ${t.tier}, effort ${t.effort}, unmeetable precondition or check, no escalated retry (nothing commits in this workflow): ${esc.why}` : `tier ${t.tier}, effort ${t.effort}, failed first check and the escalated retry (${esc.effort}); blocked by the implement workflow` })
        continue
      }
      const line = `tier ${t.tier}, model ${t.model}, effort ${t.effort}, profile ${PLAN.cost_profile}, ${esc ? (esc.committed ? 'passed after the workflow committed the task (--commit-tasks, ' + esc.committed + ')' : 'passed after escalation to effort ' + esc.effort) : 'passed first time'}, inline (leaf), independently verified`
      marks.push({ id: t.id, status: 'done', line })
      if (v && v.outside_likely_files && v.outside_likely_files.length) findings.push({ task: t.id, outside_likely_files: v.outside_likely_files })
    }
    if (marks.length) {
      const marked = await ag(laneMarkerBrief(marks), opt('bookkeeping', { label: `mark-lane-${lane[0].id}`, schema: MARK_SCHEMA }))
      if (!marked) bad.push(`${marks.map((m) => m.id).join(', ')}: marker returned nothing`)
      else if (marked.exit !== 0) bad.push(`${marks.map((m) => m.id).join(', ')}: mark command failed (exit ${marked.exit}) ${marked.message || ''}`.trim())
    }
    if (bad.length) return await stop('task not verified', bad)
    if (operatorWait.length) {
      await ag(entryPrompt(`implement workflow stopped, state awaiting-operator: ${operatorWait.map((x) => x.task).join(', ')} not started by their agent, nothing written, the tasks stay pending. Read the reasons, fix the cause, then regenerate. ` + JSON.stringify(operatorWait)), opt('bookkeeping', { label: 'prg-awaiting-operator' }))
      return { state: 'awaiting-operator', tasks: operatorWait, results, findings }
    }
    if (commitWait.length) {
      await ag(entryPrompt(`implement workflow stopped, state awaiting-commit: ${commitWait.map((x) => x.task).join(', ')} wait for a commit this workflow does not make. Commit the files by path, then regenerate (the tasks are still pending, the next generation resumes them and reruns the check) ` + JSON.stringify(commitWait)), opt('bookkeeping', { label: 'prg-awaiting-commit' }))
      return { state: 'awaiting-commit', tasks: commitWait, results, findings }
    }
  }
}

PH = `${pad(ALLTASKS.length + 1, NW)} · stage 11`
const fin = await ag(PLAN.stand_in ? `STAND-IN TEST. Append the Log line "- <date>: Stage 11 stand-in" to ${PRG} (create it with a "## Log" heading if absent), set the frontmatter status of ${PLAN.status_file} to completed and the execution_manifest status of ${PLN} to 'done'. Return run_status, pln_status and check_run_exit 0 as read from the files.` : finalBrief(),
  PLAN.stand_in ? { label: 'stage-11', schema: FINAL_SCHEMA, model: 'haiku', effort: 'low' } : { label: 'stage-11', schema: FINAL_SCHEMA, model: PLAN.stage11.model, effort: PLAN.stage11.effort })
if (!fin) return await stop('stage 11 returned nothing', PLAN.run)
const chk = await ag(finalCheckBrief(), PLAN.stand_in ? { label: 'final-check', schema: FINAL_SCHEMA, model: 'haiku', effort: 'low' } : opt('verify-run', { label: 'final-check', schema: FINAL_SCHEMA }))
if (!chk) return await stop('final check returned nothing', PLAN.run)
results.push({ stage: 11, reported: fin, independent: chk })
if (!PLAN.stand_in && (chk.run_status !== 'completed' || chk.pln_status !== 'done' || chk.check_run_exit !== 0)) {
  return await stop('final check not clean', { run_status: chk.run_status, pln_status: chk.pln_status, check_run_exit: chk.check_run_exit, named: chk.check_run_named || '', unmet: chk.unmet || [] })
}
return { state: 'done', run: PLAN.run, tasks: PLAN.pending, results, findings }
