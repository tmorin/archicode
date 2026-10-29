export const meta = { name: "run-0202-implement", description: "Generated from the run directory: pending tasks of the pln only; cost profile low-cost" }
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
 "run": "0202",
 "slug": "diagram-layout-columns",
 "wave": "027",
 "profile": "TDD+pln",
 "run_dir": "docs/wav/wav-027-editor-layout-and-walk/run/run-0202-diagram-layout-columns",
 "status_file": "docs/wav/wav-027-editor-layout-and-walk/run/run-0202-diagram-layout-columns/run-0202-diagram-layout-columns.md",
 "pln_file": "docs/wav/wav-027-editor-layout-and-walk/run/run-0202-diagram-layout-columns/pln-0202-diagram-layout-columns.md",
 "prg_file": "docs/wav/wav-027-editor-layout-and-walk/run/run-0202-diagram-layout-columns/prg-0202-diagram-layout-columns.md",
 "skill_file": "/home/tibo/git-perso/claude-agents/plugins/run-management/skills/complete-run/SKILL.md",
 "check_script": "/home/tibo/git-perso/claude-agents/plugins/run-management/skills/complete-run/scripts/check_run.py",
 "hard": false,
 "stand_in": false,
 "stand_in_command": "",
 "done": [
  "task-001",
  "task-002"
 ],
 "pending": [
  "task-003",
  "task-004",
  "task-005",
  "task-006",
  "task-007",
  "task-008"
 ],
 "levels": [
  [
   [
    {
     "id": "task-003",
     "title": "Carry the value through the recipes, the cache key, applySavedView, the saved view and the story step",
     "objective": "Make every diagram read the value in force and make the saved view, applySavedView and storyStepScene keep it, with no change for a workspace that sets none.",
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
      "diagram-columns-view.test.js and story-player-scene.test.js pass and npm run test:unit passes",
      "diagram-columns-elk.test.js passes in full, including `a saved Map with a layout reaches the layout engine bounded...`",
      "the cache key of a diagram with no value is the old string"
     ],
     "verification": [
      "npm run editor:build then npm run test:unit then npm run editor:check"
     ],
     "likely_files": [
      "src/main/editor/model/ui-state.js",
      "src/main/editor/application/folder-session.js",
      "src/main/editor/application/view-recipe.js",
      "src/main/editor/presentation/view-edit.js",
      "src/main/editor/presentation/diagram-page.js",
      "src/main/editor/presentation/story-scene.js"
     ],
     "tdd_excerpts": [
      "DEC-5 canonical form, setViewLayout, currentViewDefinition; DEC-6 cache key only when set; DEC-7 layoutProblem and the error panel in computeDiagramScene",
      "Review F-3 and F-5: diagramColumns in model/ui-state.js, reset in resetUiState, applySavedView sets it; F-8 viewKey unchanged; F-11 VIEW_PROPERTY_ORDER in presentation/view-edit.js as the first array literal"
     ],
     "prd_excerpts": [
      "REQ-4: view state, in diagramCacheKey, never modelsChanged",
      "REQ-8: the player draws the same boxes as the editor for the same view"
     ],
     "escalation_triggers": [
      "an existing test changes its expectation: fix the code"
     ],
     "depends_on": []
    }
   ]
  ],
  [
   [
    {
     "id": "task-004",
     "title": "Add the Columns list to the toolbar and the view form, and the Settings check",
     "objective": "Add the Columns select to the toolbar and to the form of a saved view, handle set-columns, and refuse an invalid layout in the Settings save for the three viewpoints it edits.",
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
      "the node tests of the toolbar list, the view form and the Settings refusal pass",
      "lint, format check and editor:check pass"
     ],
     "verification": [
      "npm run editor:build, npm run test:unit, npm run lint, npm run format:check, npm run editor:check"
     ],
     "likely_files": [
      "src/main/editor/presentation/diagram-page.js",
      "src/main/editor/presentation/stories-pages.js",
      "src/main/editor/composition/events.js",
      "src/main/editor/model/form-validation.js",
      "src/main/editor/presentation/help-and-settings.js",
      "src/main/editor/style.css"
     ],
     "tdd_excerpts": [
      "DEC-4 the list entries and the Default (n) entry; DEC-8 readSettingsDraft runs columnsProblem; IF-1, IF-2, FLOW-2, FLOW-3",
      "Review F-1 and F-7: do not add map to VIEWPOINT_IDS; no pushDiagramHistory in set-columns until the address work"
     ],
     "prd_excerpts": [
      "REQ-1: an author changes the value on the diagram on screen with a list",
      "REQ-6: a typo is a sentence at the field"
     ],
     "escalation_triggers": [
      "the theme audit test fails on the new class"
     ],
     "depends_on": [
      "task-003"
     ]
    },
    {
     "id": "task-005",
     "title": "Extend GuideViewPropertiesTest, add the layout row to the guide and regenerate the golden",
     "objective": "Make the guide and its Java test say and prove that the command line ignores layout, and regenerate the golden.",
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
      "GuideViewPropertiesTest and GuideTest pass; src/main/java is unchanged"
     ],
     "verification": [
      "JAVA_HOME at JDK 25: ./mvnw test -Dtest=GuideViewPropertiesTest,GuideTest"
     ],
     "likely_files": [
      "src/test/java/io/morin/archicode/cli/GuideViewPropertiesTest.java",
      "src/main/resources/guide/guide.md",
      "src/test/resources/guide/golden.md"
     ],
     "tdd_excerpts": [
      "IMP-7, CON-7, CTR-1",
      "Review F-2 and F-4: the overview, detailed and deep services merge settings.views.properties into generated views and draw nothing from layout; the proof is a drawn-file comparison, not a grep"
     ],
     "prd_excerpts": [
      "REQ-5: the command line ignores the key; the guide names layout among the ignored keys; golden.md is regenerated in the same change"
     ],
     "escalation_triggers": [
      "a drawn file differs from the bare one"
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
     "id": "task-006",
     "title": "Write the end-to-end spec, measure the real diagram and record the rows",
     "objective": "Write the Chromium and Firefox spec on the layered Brightcart, run it on the packaged jar, and record rows per container before and after columns 4 and the layout times.",
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
      "the spec passes in both engines and the table is in the run document"
     ],
     "verification": [
      "JAVA_HOME at JDK 25: ./mvnw package -Dmaven.test.skip -Dplugin.asciidoctor.skip=true -Dpmd.skip=true then npx playwright test src/test/e2e/diagram-columns.spec.js"
     ],
     "likely_files": [
      "src/test/e2e/diagram-columns.spec.js",
      "src/test/e2e/fixtures.js",
      "src/test/e2e/harness.js"
     ],
     "tdd_excerpts": [
      "VER-6 and VER-7; RISK-1 the bound is a tendency; RISK-2 time with and without the value"
     ],
     "prd_excerpts": [
      "REQ-9 and REQ-10: at most 5 boxes in a row at columns 4; the run records the rows before and after for the page of an element, a Map and a saved view"
     ],
     "escalation_triggers": [
      "a container shows 6 or more boxes in a row at columns 4"
     ],
     "depends_on": [
      "task-004"
     ]
    },
    {
     "id": "task-007",
     "title": "Document layout.columns in the manual and in CLAUDE.md",
     "objective": "Write layout.columns into the manual and into CLAUDE.md as built.",
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
      "both files describe the levels, the order, the range, the sentence, the Map workspace value check and the command line ignoring the key"
     ],
     "verification": [
      "grep for layout.columns in both files, then the manual builds"
     ],
     "likely_files": [
      "src/doc/README.adoc",
      "CLAUDE.md"
     ],
     "tdd_excerpts": [
      "IMP-8, CTR-1, DEC-3 manual wording that it aims at N and ELK may exceed it"
     ],
     "prd_excerpts": [
      "REQ-11: the manual and CLAUDE.md describe layout.columns; the guide names the key"
     ],
     "escalation_triggers": [
      "an anchor does not exist"
     ],
     "depends_on": [
      "task-004",
      "task-005"
     ]
    }
   ]
  ],
  [
   [
    {
     "id": "task-008",
     "title": "Show the tests fail on purpose, run every gate and record the evidence",
     "objective": "Break the code three ways on purpose, see a test catch each, restore, then run every gate and record the evidence against the Executive Summary criteria.",
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
      "every criterion of the Executive Summary is recorded true, or a finding names the one that is not"
     ],
     "verification": [
      "the commands of the task catalog, each with its exit code in the run document"
     ],
     "likely_files": [
      "src/main/editor/presentation/diagram-layout.js",
      "src/main/editor/model/diagram-columns.js",
      "src/main/editor/presentation/diagram-page.js",
      "docs/wav/wav-027-editor-layout-and-walk/run/run-0202-diagram-layout-columns/run-0202-diagram-layout-columns.md"
     ],
     "tdd_excerpts": [
      "VER-8 and the last bullet of Observability and Verification"
     ],
     "prd_excerpts": [
      "REQ-5, REQ-7, REQ-12: byte-identity, the Map contracts, ratchet and floors"
     ],
     "escalation_triggers": [
      "byte-identity reports a new difference"
     ],
     "depends_on": [
      "task-006",
      "task-007"
     ]
    }
   ]
  ]
 ],
 "blocked": [],
 "commit_tasks": true,
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
      `Compare \`git status --porcelain\` with the likely files and list changes outside them (other tasks' files and ${PLAN.run_dir} excepted) in outside_likely_files. ` +
      `Nobody commits in this workflow: a check that needs a commit or a clean working tree cannot hold whatever the implementer does, so set unmeetable true, passed false, and name the check in failing_output. A commit the task's objective asks for is not a criterion here: do not fail the task for its absence, check the rest and note in a check entry that the commit is left to the operator.`)

// only with PLAN.commit_tasks (--commit-tasks): the one place this workflow commits, by path, after a verifier found a check that needs the commit
const commitBrief = (t, files) => ROOT +
  `Commit the work of task ${t.id} of run ${PLAN.run} (${t.title}), by path, and nothing else. Files: ${files.map((f) => '\`' + f + '\`').join(', ')}. ` +
  `Run \`git add -- <those paths>\` (never \`git add -A\` or \`git add .\`) and \`git commit -m "chore(run-${PLAN.run}): ${t.id} ${t.title.replaceAll('"', "'")}"\`; no amend, no push, no hook bypass, no other git command that changes history or the index beyond those paths. ` +
  `If a path is not changed or the commit fails, commit nothing more and return committed false with the reason. Otherwise return committed true, the short hash in commit and the files.`

// ONE marker per lane (wave 2.21.0): the pln is re-read and re-edited once for every task of the lane that passed its independent check
// (done) or failed it for good (blocked), instead of once per task; each task still gets its own status and its own `results:` line
const laneMarkerBrief = (marks) => ROOT +
  `Record the outcome of ${marks.length} task(s) of run ${PLAN.run} in ${PLN} in one pass, changing nothing else in the file. For each task below, set the \`status:\` of its node in the execution_graph block (and in its task_catalog entry if it carries a status) to the status given, and add or replace one \`results:\` line on its task_catalog entry reading exactly the text given:\n` +
  marks.map((m) => `- ${m.id}: status '${m.status}', results: ${JSON.stringify(m.line)}`).join('\n') + `\nReturn the word done.${STAND_IN_NOTE}`

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
    const ver = await parallel(lane.map((t, i) => () => impl[i] && !impl[i].unmeetable && !didNotStart(impl[i])
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
        if (PLAN.commit_tasks && !PLAN.stand_in && impl[i] && impl[i].done && ver[i] && ver[i].unmeetable) {
          const files = impl[i].files_touched && impl[i].files_touched.length ? impl[i].files_touched : (t.likely_files || [])
          const c = files.length ? await ag(commitBrief(t, files), opt('bookkeeping', { label: `commit-${t.id}`, schema: COMMIT_SCHEMA })) : null
          if (c && c.committed) {
            const v2 = await ag(verifyBrief(t, 2), { label: `reverify-${t.id}`, schema: VERIFY_SCHEMA, model: t.verify.model, effort: t.verify.effort })
            second[i] = { again: impl[i], v2, effort: null, why: ver[i].failing_output || 'unmeetable check', committed: c.commit || 'yes' }
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
        commitWait.push({ task: t.id, title: t.title, files: (impl[i] && impl[i].files_touched && impl[i].files_touched.length ? impl[i].files_touched : t.likely_files) || [], check: esc.why })
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
      const marked = await ag(laneMarkerBrief(marks), opt('bookkeeping', { label: `mark-lane-${lane[0].id}` }))
      if (!marked) bad.push(`${marks.map((m) => m.id).join(', ')}: marker returned nothing`)
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
