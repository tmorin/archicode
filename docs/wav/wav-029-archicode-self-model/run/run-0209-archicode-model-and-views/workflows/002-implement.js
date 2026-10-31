export const meta = { name: "run-0209-implement", description: "Generated from the run directory: pending tasks of the pln only; cost profile low-cost" }
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
 "run": "0209",
 "slug": "archicode-model-and-views",
 "wave": "029",
 "profile": "TDD+pln",
 "run_dir": "docs/wav/wav-029-archicode-self-model/run/run-0209-archicode-model-and-views",
 "status_file": "docs/wav/wav-029-archicode-self-model/run/run-0209-archicode-model-and-views/run-0209-archicode-model-and-views.md",
 "pln_file": "docs/wav/wav-029-archicode-self-model/run/run-0209-archicode-model-and-views/pln-0209-archicode-model-and-views.md",
 "prg_file": "docs/wav/wav-029-archicode-self-model/run/run-0209-archicode-model-and-views/prg-0209-archicode-model-and-views.md",
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
  "task-008"
 ],
 "levels": [
  [
   [
    {
     "id": "task-001",
     "title": "Amend the TDD with the Stage 5 findings and check the code facts",
     "objective": "Apply the Stage 5 findings to the TDD after checking each against Nesting.java, DanglingReferences, check-editor.mjs --list, layers.json and harness.js.",
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
      "The three gaps gap-001 to gap-003 are closed in the TDD text"
     ],
     "verification": [
      "grep -n \"couplings\" tdd-0209-archicode-model-and-views.md finds the new container",
      "grep -c \"archicode.contracts.kernel_wasm\" the TDD returns a line that now sits under couplings",
      "the TDD no longer contains the phrase \"github.actions builds\""
     ],
     "likely_files": [
      "docs/wav/wav-029-archicode-self-model/run/run-0209-archicode-model-and-views/tdd-0209-archicode-model-and-views.md",
      "src/main/java/io/morin/archicode/resource/element/application/Nesting.java",
      "src/test/javascript/viewpoint-kernel/harness.js"
     ],
     "tdd_excerpts": [
      "Elements table and qualified relationships"
     ],
     "prd_excerpts": [
      "REQ-5 and REQ-6 of the PRD Traceability section"
     ],
     "escalation_triggers": [
      "a finding the code refutes"
     ],
     "depends_on": []
    }
   ]
  ],
  [
   [
    {
     "id": "task-002",
     "title": "Write the ignore line and the two tests red",
     "objective": "Write the ignore line and the two tests, red.",
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
      "Tests compile, are formatted, fail only because the folder is missing, write nothing into docs/architecture"
     ],
     "verification": [
      "grep -n \"views\" .gitignore shows the added line",
      "npx prettier --check src/test/javascript/architecture-model.test.js exits 0",
      "node --test src/test/javascript/architecture-model.test.js fails and the output names the missing docs/architecture folder or workspace file (red, turned green by task-006)",
      "./mvnw -q test-compile exits 0 (the Java test compiles; it fails for the same reason until task-006)"
     ],
     "likely_files": [
      ".gitignore",
      "src/test/java/io/morin/archicode/doc/ArchitectureModelTest.java",
      "src/test/javascript/architecture-model.test.js",
      "src/test/java/io/morin/archicode/doc/ShippedFilesTest.java",
      "src/test/javascript/viewpoint-kernel/shipped-files.test.js"
     ],
     "tdd_excerpts": [
      "FLOW-1, DEC-5, DEC-6"
     ],
     "prd_excerpts": [
      "REQ-2, REQ-3, REQ-7"
     ],
     "escalation_triggers": [
      "a helper is not reachable without changing src/main"
     ],
     "depends_on": [
      "task-001"
     ]
    },
    {
     "id": "task-003",
     "title": "Write the workspace file and the application layer",
     "objective": "Write the workspace file and the application-layer manifests of the amended TDD.",
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
      "query graph exits 0 with no warning; 35 to 45 elements; tags.path values exist"
     ],
     "verification": [
      "java -jar target/quarkus-app/quarkus-run.jar query graph -w docs/architecture/.archicode.yaml exits 0 with no warning line (build the jar first with ./mvnw package -Dmaven.test.skip -Dplugin.asciidoctor.skip=true -Dpmd.skip=true if absent)",
      "ls docs/architecture/manifests | grep -c \"views-\" prints 0",
      "every tags.path value that names one path exists: for each, test -e on the path"
     ],
     "likely_files": [
      "docs/architecture/.archicode.yaml",
      "docs/architecture/manifests/",
      "src/doc/examples/domain_plateaus (style reference)",
      "src/main/resources/init/manifests (the shape of the header and the content of person, system, container and relationship)"
     ],
     "tdd_excerpts": [
      "Elements, CTR-1, CTR-2, DEC-8"
     ],
     "prd_excerpts": [
      "REQ-1, REQ-5, REQ-6"
     ],
     "escalation_triggers": [
      "an unexplained load error"
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
     "id": "task-004",
     "title": "Write the technology layer and the deployment of the applications",
     "objective": "Write the two environments, their nodes and the applications lists.",
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
      "query graph still exits 0 with no warning"
     ],
     "verification": [
      "java -jar target/quarkus-app/quarkus-run.jar query graph -w docs/architecture/.archicode.yaml exits 0 with no warning line and no dangling application reference"
     ],
     "likely_files": [
      "docs/architecture/manifests/environment.workstation.yaml",
      "docs/architecture/manifests/environment.github.yaml"
     ],
     "tdd_excerpts": [
      "Technology layer paragraph, amended"
     ],
     "prd_excerpts": [
      "REQ-5"
     ],
     "escalation_triggers": [
      "a dangling application reference"
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
     "title": "Write the five saved views",
     "objective": "Write the five saved view manifests.",
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
      "query views lists five ids"
     ],
     "verification": [
      "java -jar target/quarkus-app/quarkus-run.jar query views -w docs/architecture/.archicode.yaml lists the five ids and exits 0",
      "ls docs/architecture/manifests/views | wc -l prints 5"
     ],
     "likely_files": [
      "docs/architecture/manifests/views/",
      "src/main/resources/init/manifests/view.shop_overview.yaml (a view manifest and its file name)",
      "src/test/resources/brightcart/layered/shared/view.cloud_map.yaml (a map view of the technology layer as a manifest)",
      "src/doc/examples/domain_technology_map/.archicode.yaml (map views written in the workspace file, for the properties)"
     ],
     "tdd_excerpts": [
      "Saved views (DEC-4)"
     ],
     "prd_excerpts": [
      "REQ-3"
     ],
     "escalation_triggers": [
      "a view error the guide does not explain"
     ],
     "depends_on": [
      "task-003",
      "task-004"
     ]
    }
   ]
  ],
  [
   [
    {
     "id": "task-006",
     "title": "Turn the tests green, draw each view by hand and settle Q-2",
     "objective": "Make both tests pass, draw each view in a scratch copy, settle Q-2, log frictions.",
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
      "Tests green; nothing generated left in docs/architecture; Q-2 answered in the prg"
     ],
     "verification": [
      "./mvnw test -Dtest=ArchitectureModelTest exits 0",
      "node --test src/test/javascript/architecture-model.test.js exits 0",
      "ls docs/architecture lists no entry whose name starts with views, find docs/architecture -name \"*.puml\" prints nothing, and git ls-files --cached --others --exclude-standard docs/architecture | grep -c \"views-\" prints 0 (git status --short alone shows the untracked folder as one line and proves nothing)",
      "grep -c \"Q-2\" the prg file prints at least 1"
     ],
     "likely_files": [
      "docs/architecture/",
      "docs/wav/wav-029-archicode-self-model/run/run-0209-archicode-model-and-views/prg-0209-archicode-model-and-views.md"
     ],
     "tdd_excerpts": [
      "FLOW-1, Q-2, RISK-2 to RISK-4"
     ],
     "prd_excerpts": [
      "REQ-1, REQ-2, REQ-3, REQ-7"
     ],
     "escalation_triggers": [
      "a change under src/main would be needed"
     ],
     "depends_on": [
      "task-002",
      "task-005"
     ]
    }
   ]
  ],
  [
   [
    {
     "id": "task-007",
     "title": "Run the gates and the sabotage checks",
     "objective": "Run the gates and the two sabotage checks on scratch copies.",
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
      "All gates exit 0; both sabotage checks make a test fail; src diff is the two tests"
     ],
     "verification": [
      "./mvnw test-compile pmd:check exits 0",
      "npm run format:check exits 0",
      "npm run lint exits 0",
      "npm run test:unit exits 0 (ShippedFilesTest and shipped-files.test.js unchanged and passing, ASM-2)",
      "./mvnw verify exits 0",
      "git status --short src lists the two new test files only, and git diff --stat -- src is empty",
      "the scratch copies are removed after the sabotage checks"
     ],
     "likely_files": [
      "pom.xml",
      "package.json"
     ],
     "tdd_excerpts": [
      "Observability and Verification"
     ],
     "prd_excerpts": [
      "REQ-2, REQ-4"
     ],
     "escalation_triggers": [
      "a sabotage check passes silently"
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
     "title": "Close the run record",
     "objective": "Fill Findings and Lessons Learnt of the prg.",
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
      "Every friction of the run is in the log"
     ],
     "verification": [
      "grep -n \"Lessons Learnt\" -A3 the prg file shows text other than Nothing yet"
     ],
     "likely_files": [
      "docs/wav/wav-029-archicode-self-model/run/run-0209-archicode-model-and-views/prg-0209-archicode-model-and-views.md"
     ],
     "tdd_excerpts": [
      "TG-5"
     ],
     "prd_excerpts": [
      "REQ-7"
     ],
     "escalation_triggers": [
      "a missing friction"
     ],
     "depends_on": [
      "task-007"
     ]
    }
   ]
  ]
 ],
 "blocked": [],
 "commit_tasks": false,
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
