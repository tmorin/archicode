export const meta = { name: "wave-025-hosted-editor", description: "Generated from the wave manifest: remaining runs only; cost profile low-cost" }
// cost profile: low-cost
// overrides of declared tiers and profile ceilings (3):
//   - gate P2: a member run is sensitive, the gate agent takes the elevated pair sonnet/high
//   - run W-4 declared hard_judgment with a delegation_reason: verification agent raised to sonnet/high; executor kept at sonnet/high
//   - run W-5 declared hard_judgment with a delegation_reason: verification agent raised to sonnet/high; executor kept at sonnet/high
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
 "overrides": [
  "gate P2: a member run is sensitive, the gate agent takes the elevated pair sonnet/high",
  "run W-4 declared hard_judgment with a delegation_reason: verification agent raised to sonnet/high; executor kept at sonnet/high",
  "run W-5 declared hard_judgment with a delegation_reason: verification agent raised to sonnet/high; executor kept at sonnet/high"
 ],
 "wave": "025",
 "slug": "hosted-editor",
 "autonomy_override": "",
 "commit_tasks": true,
 "wave_file": "docs/wav/wav-025-hosted-editor/wav-025-hosted-editor.md",
 "prg_file": "docs/wav/wav-025-hosted-editor/prg-025-hosted-editor.md",
 "run_dir": "docs/wav/wav-025-hosted-editor/run",
 "check_script": "/home/tibo/git-perso/claude-agents/plugins/run-management/skills/complete-run/scripts/check_run.py",
 "run_workflows": true,
 "generator_script": "/home/tibo/git-perso/claude-agents/plugins/run-management/skills/complete-wave/scripts/complete_wave.py",
 "child_workflows": {
  "design": "run-management:run-design",
  "implement": "run-management:run-implement"
 },
 "safe_reasons": {},
 "stand_in": false,
 "stand_in_command": "",
 "steps": [
  {
   "kind": "batch",
   "n": 1,
   "phase": "P2",
   "lanes": [
    [
     {
      "id": "W-3",
      "number": "0191",
      "slug": "bundle-codec",
      "model": "sonnet",
      "effort": "high",
      "verify": {
       "model": "sonnet",
       "effort": "medium"
      },
      "sensitive": false,
      "dir": "docs/wav/wav-025-hosted-editor/run/run-0191-bundle-codec",
      "focus": "a whole workspace is one YAML text that comes back byte for byte (#162 proposal 1)",
      "likely_paths": [
       "src/main/editor/persistence/**",
       "src/main/editor/names.json",
       "src/main/editor/java-names.json",
       "src/main/editor/layers.json",
       "src/main/resources/editor-webapp/standalone.html",
       "src/test/javascript/**",
       "src/test/resources/**/bundle-cases.json"
      ],
      "delegation": "standard",
      "doc_profile": "TDD+pln",
      "delegation_reason": "",
      "status_on_disk": "in-progress"
     }
    ],
    [
     {
      "id": "W-4",
      "number": null,
      "slug": "browser-workspace",
      "model": "sonnet",
      "effort": "high",
      "verify": {
       "model": "sonnet",
       "effort": "high"
      },
      "sensitive": true,
      "dir": null,
      "focus": "a visitor in Chrome, Firefox or Safari works in a workspace kept in the browser, told plainly that it lives there (#162 proposal 2)",
      "likely_paths": [
       "src/main/editor/persistence/**",
       "src/main/editor/application/folder-session.js",
       "src/main/editor/presentation/**",
       "src/main/editor/style.css",
       "src/main/editor/names.json",
       "src/main/editor/java-names.json",
       "src/main/editor/layers.json",
       "src/main/resources/editor-webapp/standalone.html",
       "src/test/javascript/**",
       "src/test/e2e/**",
       "package.json",
       "CLAUDE.md"
      ],
      "delegation": "hard_judgment",
      "doc_profile": "TDD+pln",
      "delegation_reason": "deletes and overwrites user data (a browser workspace can be deleted, reset or replaced) and changes the published editor; a flaw loses a visitor's work",
      "status_on_disk": "none"
     }
    ]
   ]
  },
  {
   "kind": "batch",
   "n": 2,
   "phase": "P2",
   "lanes": [
    [
     {
      "id": "W-5",
      "number": null,
      "slug": "import-export-and-sample",
      "model": "sonnet",
      "effort": "high",
      "verify": {
       "model": "sonnet",
       "effort": "high"
      },
      "sensitive": true,
      "dir": null,
      "focus": "one click from the site to the editor on Brightcart, and one file out and back in (#162 proposals 3 and 4)",
      "likely_paths": [
       "src/main/editor/persistence/**",
       "src/main/editor/application/**",
       "src/main/editor/presentation/**",
       "src/main/editor/composition/**",
       "src/main/editor/names.json",
       "src/main/editor/java-names.json",
       "src/main/resources/editor-webapp/**",
       "src/main/java/io/morin/archicode/cli/EditorHttpServer.java",
       "src/test/java/io/morin/archicode/it/EditorServeIT.java",
       "scripts/**",
       ".github/workflows/ci-build.yaml",
       "src/site/index.html",
       "src/test/javascript/**",
       "CLAUDE.md"
      ],
      "delegation": "hard_judgment",
      "doc_profile": "TDD+pln",
      "delegation_reason": "changes the published pipeline and site (website assembly in ci-build.yaml, the jar and native resources, the presentation page) - live capability",
      "status_on_disk": "none"
     }
    ]
   ]
  },
  {
   "kind": "batch",
   "n": 3,
   "phase": "P2",
   "lanes": [
    [
     {
      "id": "W-6",
      "number": null,
      "slug": "hosted-editor-tests-and-docs",
      "model": "sonnet",
      "effort": "high",
      "verify": {
       "model": "sonnet",
       "effort": "medium"
      },
      "sensitive": false,
      "dir": null,
      "focus": "the flow of the issue's acceptance is a test in Firefox and Chromium, and the manual, CLAUDE.md and the presentation page tell it (#162 proposal 4)",
      "likely_paths": [
       "src/test/e2e/**",
       "playwright.config.js",
       ".github/workflows/ci-build.yaml",
       "package.json",
       "src/doc/**/*.adoc",
       "CLAUDE.md"
      ],
      "delegation": "standard",
      "doc_profile": "TDD+pln",
      "delegation_reason": "",
      "status_on_disk": "none"
     }
    ]
   ]
  },
  {
   "kind": "gate",
   "phase": "P2",
   "criteria": [
    "`./mvnw verify -DskipITs=false`, `npm run test:coverage`, `npm run test:e2e`, `npm run lint`, `npm run format:check` and `npm run editor:check` pass; no coverage floor in `scripts/editor-coverage-floor.json` is lowered; `ratchet.max` is not above 99",
    "a node test asserts `unbundle(bundle(folder))` equals the folder byte for byte for every shipped example and fixture folder that holds a `.archicode.yaml`, and a cases file covers the refused paths (`..`, absolute, hidden other than the root `.archicode.yaml`, a path twice, over the size limit), a BOM, CRLF and a `---` inside a file",
    "the check of `src/main/resources/editor-webapp/samples/brightcart.yaml` exits 0 on the tree and exits 1 on a copy of the tree with one byte of the file changed (run both, record the output in the run document of W-5); the unbundled sample is loaded by the editor in a node test and by `archicode views generate` in a Java test",
    "`EditorServeIT` asserts that the jar serves the sample, and a test asserts that opening the sample from `archicode editor serve` leaves the served folder unchanged",
    "an end-to-end spec in Chromium and Firefox (and WebKit if D1 is kept) opens the page without choosing a folder, opens the Brightcart sample, changes an element, reloads and finds the change, exports, deletes the browser workspace, imports the file and finds the same bytes; the spec is named in the run document of W-6",
    "the landing card shows no \"Firefox and Safari don't support it\" sentence when `showDirectoryPicker` is absent and the browser workspace is available (a node test on `landingScreenConfig` or its successor)",
    "`scripts/byte-identity.sh` shows no difference (the command line is unchanged)",
    "the CI run of the wave pull request, recorded in the wave prg by its run id, has `Java`, `Page`, `Kernel`, `E2E` and `Native` green"
   ],
   "runs": [
    "W-3",
    "W-4",
    "W-5",
    "W-6"
   ],
   "model": "sonnet",
   "effort": "high"
  }
 ],
 "blocked": []
}
// ---- engine (shared text: generated files and the shipped `wave` workflow use this same body) ----
// Every agent below is a leaf: it has neither the Workflow tool nor the Agent tool.
// Order per batch: dispatch entry in the wave prg -> create missing run directories
// -> one agent per run -> one independent verification agent per run -> result entry.
// A phase gate is verified after the last batch of its phase. Any unmet check stops the workflow.
// Model and effort of every agent come from PLAN (the cost profile `PLAN.cost_profile` applied to the need table by the
// generator, complete-wave/references/profiles.json); this engine names none of its own except the stand-in test agents.
const AG = PLAN.agents
const opt = (key, o) => ({ ...o, model: AG[key].model, effort: AG[key].effort })
const ROOT = `Working directory: ${PLAN.repo_root} (absolute path of the repository root). Every repository-relative path below is relative to it: cd there first, and never search the disk for a path that is named below.\n`
const STAND_IN_NOTE = PLAN.stand_in ? ' (STAND-IN TEST: do only what is asked, nothing else)' : ''
const RUN_SCHEMA = {
  type: 'object',
  properties: {
    run: { type: 'string' }, status: { type: 'string' }, status_file: { type: 'string' },
    check_run_exit: { type: 'integer' }, outside_likely_paths: { type: 'array', items: { type: 'string' } },
    wave_findings: { type: 'string' }, not_verified: { type: 'string' },
  },
  required: ['run', 'status', 'status_file'],
}
const VERIFY_SCHEMA = {
  type: 'object',
  properties: {
    run: { type: 'string' }, status: { type: 'string' }, check_run_exit: { type: 'integer' },
    check_run_named: { type: 'string' }, manifest_run_ok: { type: 'boolean' }, outside_likely_paths: { type: 'array', items: { type: 'string' } },
    outside_stated: { type: 'boolean' },
    note: { type: 'string' },
  },
  required: ['run', 'status'],
}
const CREATE_SCHEMA = {
  type: 'object',
  properties: { runs: { type: 'array', items: { type: 'object', properties: { id: { type: 'string' }, number: { type: 'string' }, dir: { type: 'string' } }, required: ['id', 'number', 'dir'] } } },
  required: ['runs'],
}
const GATE_SCHEMA = {
  type: 'object',
  properties: {
    criteria: { type: 'array', items: { type: 'object', properties: { text: { type: 'string' }, held: { type: 'boolean' }, evidence: { type: 'string' } }, required: ['text', 'held', 'evidence'] } },
    canonical_discharge: { type: 'object', properties: { held: { type: 'boolean' }, evidence: { type: 'string' } }, required: ['held', 'evidence'] },
  },
  required: ['criteria', 'canonical_discharge'],
}
const PREP_SCHEMA = {
  type: 'object',
  properties: { exit: { type: 'integer' }, plan: { type: 'object' }, digest: { type: 'string' }, message: { type: 'string' } },
  required: ['exit'],
}
// The plan of a child crosses a model hop (the bookkeeping agent returns it), so the script checks it against the digest
// the generator printed: sorted keys, no whitespace, FNV-1a over the UTF-16 code units. Same function as complete_wave.py's
// canonical_json() and digest_of(); a test plays both on the same plan.
const canon = (v) => Array.isArray(v) ? '[' + v.map(canon).join(',') + ']'
  : v !== null && typeof v === 'object' ? '{' + Object.keys(v).sort().map((k) => JSON.stringify(k) + ':' + canon(v[k])).join(',') + '}'
  : JSON.stringify(v)
const digestOf = (text) => {
  let h = 2166136261
  for (let i = 0; i < text.length; i++) { h ^= text.charCodeAt(i); h = Math.imul(h, 16777619) >>> 0 }
  return h.toString(16).padStart(8, '0')
}
const PRG = PLAN.prg_file
const WAVE = PLAN.wave_file
const results = []
const findings = []
const globRe = (g) => new RegExp('^' + g.replace(/[.+^${}()|\\]/g, '\\$&').replace(/\*\*/g, '\u0000').replace(/\*/g, '[^/]*').replace(/\u0000/g, '.*') + '$')
const inPaths = (file, paths) => paths.some((g) => globRe(g).test(file))

// every stop writes an escalation entry first (complete-wave, 'Record'), then returns the blocked state
const stop = async (reason, detail) => {
  await agent(entryPrompt('escalation', `workflow stopped, state blocked: ${reason} ` + JSON.stringify(detail)), opt('bookkeeping', { label: 'prg-escalation' }))
  return { state: 'blocked', reason, detail, results, findings }
}
function entryPrompt(what, text) {
  return (ROOT +
  `Append one dated line to the Log section of ${PRG} (use today's date from \`date +%F\`; add it after the last Log line, before "## Findings"). ` +
  `Write exactly this text after "- <date>: " and change nothing else in the file:\n\n${text}\n\n` +
  `Return the word done.${STAND_IN_NOTE}`)
}

const runBrief = (r) => ROOT +
  `Execute run ${r.number} of wave ${PLAN.wave} (${PLAN.slug}) end to end by invoking the run-management:complete-run skill.\n` +
  `Run: ${r.number}, slug ${r.slug}, directory ${r.dir} (it already exists; use it as given, never allocate a number).\n` +
  `Focus: ${r.focus}\nlikely_paths: ${r.likely_paths.join(', ')}\n` +
  `Read the wave plan ${WAVE}, your run's documents and the repository yourself; the files win over this brief.\n` +
  `FIRST read ${r.dir}/run-${r.number}-${r.slug}.md. If its status is completed, cancelled or superseded, change nothing and return it. Otherwise continue from the documents already there; never draft over finished work.\n` +
  `You are a leaf agent: you have no Agent tool and no Workflow tool, so every task of the run executes inline in you; a task's results line in the pln says "inline (leaf)". ` +
  `A hard_judgment task stays inline in you regardless.\n` +
  `You must NOT write these wave files: ${WAVE} and ${PRG}. Findings that belong to the wave go in your result (wave_findings).\n` +
  `Carry wave: ${PLAN.wave} into the frontmatter of every prd, tdd, pln and prg file you draft.\n` +
  `Non-negotiables of complete-run: every stage of your document profile runs, including the review passes and Stage 11; never report success you have not checked; ` +
  `run \`python3 "${PLAN.check_script}" --as-completed ${r.dir}\` before declaring completed and return its exit code in check_run_exit; ` +
  `name every file you touched outside likely_paths in outside_likely_paths. Stay within the repository and its safety rules (no commit, no destructive git, no secrets).\n` +
  `Return status as read from ${r.dir}/run-${r.number}-${r.slug}.md and status_file as that path.`

// run scope (PLAN.run_workflows): instead of one run-executor agent, a fresh leaf agent prints the plan of the run's design
// workflow, the wave script runs the shipped workflow with workflow() (one level), then the same for implement once a pln
// exists. The child is handed over BY NAME with the plan as args (PLAN.child_workflows), never by a file path: a scriptPath
// under the repository is refused from a session whose working directory is elsewhere (workflow() reads a path only
// from the working directory or an added directory, and takes no script content). Exit 3 of the generator means nothing to
// generate (all stages logged, no pln, all tasks done).
const prepBrief = (r, stage) => ROOT +
  `Run exactly this command from the repository root and report its result; do nothing else and edit nothing yourself:\n` +
  `python3 "${PLAN.generator_script}" run ${r.dir} --stage ${stage} --profile ${PLAN.cost_profile} --args${r.delegation === 'hard_judgment' ? ' --hard' : ''}${PLAN.commit_tasks ? ' --commit-tasks' : ''}${PLAN.autonomy_override ? " --autonomy-override '" + PLAN.autonomy_override.replaceAll("'", "'\\''") + "'" : ''}${PLAN.stand_in ? ' --stand-in' + (PLAN.stand_in_command ? ` --stand-in-command '${PLAN.stand_in_command}'` : '') : ''}\n` +
  `Exit 0: stdout has two lines. Line 1 is the plan as one line of JSON; return it, parsed, in plan, copied exactly (change nothing, drop nothing). Line 2 reads "digest " and 8 hex digits; return those 8 digits in digest. Return exit 0 with them. ` +
  `Exit 3: nothing to generate; return exit 3 and its message. Any other exit: return the exit code and its stderr in message.`
async function runViaWorkflows(r) {
  let state = ''
  for (const stage of ['design', 'implement']) {
    const p = await agent(prepBrief(r, stage), opt('bookkeeping', { label: `prepare-${stage}-${r.id}`, schema: PREP_SCHEMA }))
    if (!p || (p.exit !== 0 && p.exit !== 3)) { findings.push({ run: r.id, stage, prepare_failed: p ? { exit: p.exit, message: p.message } : null }); return null }
    if (p.exit === 3) continue
    const name = (PLAN.child_workflows || {})[stage]
    const got = p.plan && typeof p.plan === 'object' ? digestOf(canon(p.plan)) : null
    if (!name || got === null || got !== p.digest) { findings.push({ run: r.id, stage, prepare_failed: { reason: !name ? 'no child workflow name in the plan' : 'plan digest mismatch', expected: p.digest || null, got } }); return null }
    let res
    try { res = await workflow(name, p.plan) } catch (e) { findings.push({ run: r.id, stage, child_error: String((e && e.message) || e) }); return { failed: `${stage} workflow threw: ${String((e && e.message) || e)}` } }
    if (res && res.state === 'awaiting-commit') { findings.push({ run: r.id, stage, awaiting_commit: res }); return { awaiting: 'commit', run: r.number, stage, tasks: res.tasks } }
    if (res && res.state === 'awaiting-human') { findings.push({ run: r.id, stage, awaiting_human: res }); return { awaiting: true, run: r.number, stage, tasks: res.tasks } }
    if (!res || (res.state !== 'done' && res.state !== 'nothing-to-do')) {
      findings.push({ run: r.id, stage, child: res || null })
      return { failed: res ? `${stage} workflow returned ${res.state}: ${res.reason || ''} ${JSON.stringify(res.detail === undefined ? '' : res.detail)}`.trim() : `${stage} workflow returned nothing` }
    }
    state = `${stage}: ${res.state}`
  }
  return { run: r.number, status: state || 'nothing-to-do', status_file: `${r.dir}/run-${r.number}-${r.slug}.md` }
}

const standInBrief = (r) => ROOT +
  `STAND-IN TEST run ${r.number} of wave ${PLAN.wave}. Do only this: in the file ${r.dir}/run-${r.number}-${r.slug}.md ` +
  (PLAN.stand_in_command ? `first run the shell command \`${PLAN.stand_in_command.replaceAll('{n}', r.number)}\`, then ` : '') +
  `if its status line already reads completed change nothing, otherwise set the frontmatter line "status:" to "completed". ` +
  `Return run, the status now in the file, and status_file.`

const verifyBrief = (r) => ROOT + (
  PLAN.stand_in
    ? `STAND-IN TEST. Read ${r.dir}/run-${r.number}-${r.slug}.md and return run ${r.number} and the value of its frontmatter status line. Do not edit anything.`
    : `Independent verification of run ${r.number} (wave ${PLAN.wave}); you did not execute it and must not trust any report of it.\n` +
      `1. Read ${r.dir}/run-${r.number}-${r.slug}.md and return its frontmatter status.\n` +
      `2. Run \`python3 "${PLAN.check_script}" --as-completed ${r.dir}\` yourself; return its exit code in check_run_exit and, if it is not 0, the item it names in check_run_named.\n` +
      `3. If the run has a pln-${r.number}-*.md, add the pln's execution_manifest status to note.\n` +
      (r.created ? `4a. This run was just created by the workflow: confirm the directory exists and that the manifest ${WAVE} holds \`run: ${r.number}\` on this run's line; return manifest_run_ok.\n` : '') +
      `4. Read the run document's \`Files outside likely_paths:\` line (a list marker, emphasis or backticks may surround the key). Its value is \`none\` or the files the run says it changed outside its likely_paths (${r.likely_paths.join(', ')}), comma-separated. ` +
      `Return those files in outside_likely_paths (an empty list for \`none\`) and outside_stated true. If the document has no such line, or the key has no value, return an empty list and outside_stated false: not stated is not none. ` +
      `Do not run git status and do not infer the list from the tree; the line is the run's own statement and the orchestrator compares it with the tree.\n` +
      `Edit nothing.`)

const createBrief = (rs) => ROOT +
  `Create the missing run directories of wave ${PLAN.wave}, following manage-runs "Starting a new run" and complete-wave 'Create missing runs', one run at a time, in this order:\n` +
  rs.map((r) => `- ${r.id}: slug ${r.slug}, profile ${r.doc_profile}`).join('\n') + '\n' +
  `For each: number = highest NNNN across every docs/run/run-*/ and every docs/wav/*/run/run-*/ directory, plus 1; create ${PLAN.run_dir}/run-NNNN-<slug> with mkdir (never mkdir -p); ` +
  `write its status file run-NNNN-<slug>.md first (frontmatter type: run, run: NNNN, status: proposed, profile: <the profile listed for that run>, wave: ${PLAN.wave}; a heading and one line naming the wave and the manifest id); ` +
  `then write NNNN into the \`run:\` field of that run in the manifest of ${WAVE}. Write nothing else in that manifest. Return every created run (id, number, dir).${STAND_IN_NOTE}`

const gateBrief = (g) => ROOT +
  `Verify the gate of phase ${g.phase} of wave ${PLAN.wave} against real evidence, per complete-wave 'Verify the gate'. Plan: ${WAVE}. You did not execute the runs.\n` +
  `For each criterion run the command, read the file or inspect the artifact, and say in evidence what you actually did; a criterion you cannot check mechanically is verified by inspection and the evidence says so. ` +
  `held is true only if the criterion holds as written. Criteria, in order:\n` + g.criteria.map((c, i) => `${i + 1}. ${c}`).join('\n') + '\n' +
  `Then the canonical discharge of this phase's runs (${g.runs.join(', ')}): each either discharged its CI-arc-n/CI-dom-n items or answered "none" with a reason, in the TDD's Canonical Impact section or, for a single-document run, in its own body. ` +
  `Silence or a bare "none" is not held. Edit nothing.${STAND_IN_NOTE}` +
  (PLAN.stand_in ? ` For this stand-in test the runs carry no documents: report the canonical discharge as held true with the evidence "stand-in test, not assessed".` : '')

if (PLAN.steps.length === 0) {
  return PLAN.blocked.length
    ? await stop('nothing can run: unsatisfied dependencies', PLAN.blocked)
    : { state: 'nothing-to-do', note: 'every run of this scope is completed', results }
}

for (const step of PLAN.steps) {
  if (step.kind === 'verify') {
    // runs recorded completed whose verification entry is missing from the prg (a cut): verify only, never re-run
    const checked = await parallel(step.runs.map((r) => () => agent(verifyBrief(r), PLAN.stand_in
      ? { label: `verify-${r.id}`, schema: VERIFY_SCHEMA, model: 'haiku', effort: 'low' }
      : { label: `verify-${r.id}`, schema: VERIFY_SCHEMA, model: r.verify.model, effort: r.verify.effort })))
    const bad = []
    step.runs.forEach((r, i) => {
      const v = checked[i]
      results.push({ run: r.id, number: r.number, reported: 'completed (earlier session)', verified: v })
      if (!v) bad.push(`${r.id}: verification agent returned nothing`)
      else if (v.status !== 'completed') bad.push(`${r.id}: status on disk is ${v.status}`)
      else if (!PLAN.stand_in && v.check_run_exit !== 0) bad.push(`${r.id}: check_run exit ${v.check_run_exit} ${v.check_run_named || ''}`)
    })
    if (bad.length) return await stop('completed run not verified', bad)  // no result entry on failure: a regeneration retries it
    const logged = await agent(entryPrompt('result', `verification-only result for ${step.runs.map((r) => r.id).join('+')} (completed before a cut, no verification entry in this log): ` + JSON.stringify(step.runs.map((r, i) => ({ id: r.id, verified: checked[i] })))),
      opt('bookkeeping', { label: `prg-verify-${step.phase}` }))
    if (!logged) return await stop('verification entry not written to the prg', step.phase)
    continue
  }
  if (step.kind === 'gate') {
    const g = await agent(gateBrief(step), { label: `gate-${step.phase}`, schema: GATE_SCHEMA, model: step.model, effort: step.effort })
    if (!g) return await stop('gate agent returned nothing', step.phase)
    results.push({ gate: step.phase, result: g })
    const logged = await agent(entryPrompt('gate', `gate ${step.phase} verified by a fresh agent: ` + JSON.stringify(g)), opt('bookkeeping', { label: `prg-gate-${step.phase}` }))
    // criteria are compared by position and count, never by the text the agent returned (it may reword; it stays in the prg entry as display)
    const unmet = g.criteria.map((c, i) => c.held ? null : `criterion ${i + 1} not held: ${step.criteria[i] || c.text}`).filter(Boolean)
    if (g.criteria.length !== step.criteria.length) unmet.push(`gate agent returned ${g.criteria.length} criteria for ${step.criteria.length}`)
    if (!logged) unmet.push('gate entry not written to the prg')
    if (!g.canonical_discharge.held) unmet.push('canonical discharge')
    if (unmet.length) return await stop('gate unmet', { phase: step.phase, unmet })
    continue
  }
  const names = step.lanes.map((l) => l.map((r) => r.id).join('+')).join(' then ')
  const tiers = step.lanes.flat().map((r) => `${r.id} ${r.delegation} (${r.model}, effort ${r.effort})`).join('; ')
  const widths = step.lanes.map((l) => l.length).join(', ')
  const safe = Object.keys(PLAN.safe_reasons || {}).map((k) => `${k}: ${PLAN.safe_reasons[k]}`).join('; ')
  const entered = await agent(entryPrompt('dispatch', `batch ${step.n} (phase ${step.phase}) = ${names}; cost profile ${PLAN.cost_profile}; overrides of declared tiers: ${(PLAN.overrides || []).length ? PLAN.overrides.join(' | ') : 'none'}; autonomy override: ${PLAN.autonomy_override ? PLAN.autonomy_override : 'none'}; tiers: ${tiers}; concurrency per lane: ${widths}; lanes run one after another, runs inside a lane in parallel, lanes split on declared likely_paths overlap${safe ? '; concurrent-safe verdicts: ' + safe : ''}; one leaf agent per run (${PLAN.stand_in ? 'stand-in' : 'run-management:run-executor'}); written before dispatch by the generated workflow.`),
    opt('bookkeeping', { label: `prg-dispatch-${step.n}` }))
  if (!entered) return await stop('dispatch entry not written; nothing was dispatched', step.n)
  for (const lane of step.lanes) {
    const missing = lane.filter((r) => !r.number)
    if (missing.length) {
      const c = await agent(createBrief(missing), opt('create', { label: `create-${step.n}-${missing.map((r) => r.id).join('+')}`, schema: CREATE_SCHEMA }))
      if (!c) return await stop('run creation returned nothing', missing.map((r) => r.id))
      for (const m of c.runs) {
        const r = lane.find((x) => x.id === m.id)
        if (r) { r.number = m.number; r.dir = m.dir; r.created = true }
      }
      if (lane.some((r) => !r.number)) return await stop('run creation incomplete', lane.map((r) => r.id))
    }
    const ran = await parallel(lane.map((r) => () => PLAN.run_workflows
      ? runViaWorkflows(r)
      : PLAN.stand_in
      ? agent(standInBrief(r), { label: `run-${r.id}`, schema: RUN_SCHEMA, model: 'haiku', effort: 'low' })
      : agent(runBrief(r), { label: `run-${r.id}`, schema: RUN_SCHEMA, agentType: 'run-management:run-executor', model: r.model, effort: r.effort })))
    const checked = await parallel(lane.map((r, i) => () => agent(verifyBrief(r), PLAN.stand_in
      ? { label: `verify-${r.id}`, schema: VERIFY_SCHEMA, model: 'haiku', effort: 'low' }
      : { label: `verify-${r.id}`, schema: VERIFY_SCHEMA, model: r.verify.model, effort: r.verify.effort })))
    // a child implement workflow that stopped for a human gate: the wave stops with the same state, nothing is verified as done
    const waitingCommit = lane.map((r, i) => ran[i] && ran[i].awaiting === 'commit' ? { run: r.id, number: ran[i].run, stage: ran[i].stage, tasks: ran[i].tasks } : null).filter(Boolean)
    if (waitingCommit.length) {
      await agent(entryPrompt('awaiting', `wave workflow stopped, state awaiting-commit: ` + JSON.stringify(waitingCommit) + `. The tasks' work is on disk and a check needs a commit this workflow never makes. Commit the run's files by path, then regenerate: the tasks are still pending and the next generation resumes them.`),
        opt('bookkeeping', { label: `prg-awaiting-commit-${step.n}` }))
      return { state: 'awaiting-commit', waiting: waitingCommit, results, findings }
    }
    const waiting = lane.map((r, i) => ran[i] && ran[i].awaiting ? { run: r.id, number: ran[i].run, stage: ran[i].stage, tasks: ran[i].tasks } : null).filter(Boolean)
    if (waiting.length) {
      await agent(entryPrompt('awaiting', `wave workflow stopped, state awaiting-human: ` + JSON.stringify(waiting) + `. The run's own prg names the tasks and how to lift the gate (--autonomy-override with a reason, or provide the validation); regenerate after the decision.`),
        opt('bookkeeping', { label: `prg-awaiting-${step.n}` }))
      return { state: 'awaiting-human', waiting, results, findings }
    }
    const bad = []
    lane.forEach((r, i) => {
      const v = checked[i]
      results.push({ run: r.id, number: r.number, reported: ran[i] && ran[i].status, verified: v })
      if (!ran[i]) bad.push(`${r.id}: run agent returned nothing`)
      else if (ran[i].failed) bad.push(`${r.id}: ${ran[i].failed}`)
      else if (!v) bad.push(`${r.id}: verification agent returned nothing`)
      else if (v.status !== 'completed') bad.push(`${r.id}: status on disk is ${v.status}`)
      else if (!PLAN.stand_in && v.check_run_exit !== 0) bad.push(`${r.id}: check_run exit ${v.check_run_exit} ${v.check_run_named || ''}`)
      else if (r.created && !PLAN.stand_in && v.manifest_run_ok !== true) bad.push(`${r.id}: the manifest does not hold the created run number`)
    })
    // batch against itself (references/concurrency.md): runs of one lane ran concurrently; each run's files outside its
    // likely_paths come from the Files outside likely_paths line of its run document, read by its verification agent
    let collision = 'clean (a lane of one cannot collide)'
    if (lane.length > 1 && !PLAN.stand_in) {
      const hits = []
      lane.forEach((a, i) => lane.forEach((b, j) => {
        if (i >= j || !checked[i] || !checked[j]) return
        const fa = checked[i].outside_likely_paths || [], fb = checked[j].outside_likely_paths || []
        fa.forEach((f) => { if (inPaths(f, b.likely_paths) || fb.includes(f)) hits.push(`${a.id}+${b.id}: ${f}`) })
        fb.forEach((f) => { if (inPaths(f, a.likely_paths)) hits.push(`${a.id}+${b.id}: ${f}`) })
      }))
      const unstated = lane.filter((r, i) => checked[i] && checked[i].outside_stated === false).map((r) => r.id)
      const note = unstated.length ? `${unstated.join(', ')} did not state a "Files outside likely_paths:" line (not stated, not read as none)` : ''
      collision = hits.length ? 'COLLISION ' + hits.join('; ') + (note ? '; ' + note : '')
        : note ? `not checked for ${unstated.join(', ')}: ${note}; the others are clean against each other`
        : 'clean (the Files outside likely_paths line of each run checked against the others)'
      if (hits.length) findings.push({ batch: step.n, collision: hits })
    }
    await agent(entryPrompt('result', `batch ${step.n} result for ${lane.map((r) => r.id).join('+')}: ` + JSON.stringify(lane.map((r, i) => ({ id: r.id, reported: ran[i] && ran[i].status, verified: checked[i] }))) + `; batch against itself: ${collision}`),
      opt('bookkeeping', { label: `prg-result-${step.n}-${lane.map((r) => r.id).join('+')}` }))
    if (bad.length) return await stop('run not verified completed', bad)
  }
}
return PLAN.blocked.length
  ? await stop('remaining runs blocked', PLAN.blocked)
  : { state: 'done', ready_to_close: true, note: 'close-out (complete-wave, Close out) is done by the launching session', results, findings }
