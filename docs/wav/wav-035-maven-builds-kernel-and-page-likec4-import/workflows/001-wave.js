export const meta = { name: "wave-035-maven-builds-kernel-and-page-likec4-import", description: "Generated from the wave manifest: remaining runs only; cost profile low-cost" }
// engine-shape: 2
// cost profile: low-cost
// overrides of declared tiers and profile ceilings (5):
//   - gate P1: a member run is sensitive, the gate agent takes the elevated pair sonnet/high
//   - gate P2: a member run is sensitive, the gate agent takes the elevated pair sonnet/high
//   - run W-1 declared hard_judgment with a delegation_reason: verification agent raised to sonnet/high; executor kept at sonnet/high
//   - run W-2 declared hard_judgment with a delegation_reason: verification agent raised to sonnet/high; executor kept at sonnet/high
//   - settings from .claude/run-management.yaml: profile=low-cost, repos=main:when-needed
// autonomy override: none
// commit trailer: none
// repos: main . current when-needed run
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
  "gate P1: a member run is sensitive, the gate agent takes the elevated pair sonnet/high",
  "gate P2: a member run is sensitive, the gate agent takes the elevated pair sonnet/high",
  "run W-1 declared hard_judgment with a delegation_reason: verification agent raised to sonnet/high; executor kept at sonnet/high",
  "run W-2 declared hard_judgment with a delegation_reason: verification agent raised to sonnet/high; executor kept at sonnet/high",
  "settings from .claude/run-management.yaml: profile=low-cost, repos=main:when-needed"
 ],
 "wave": "035",
 "slug": "maven-builds-kernel-and-page-likec4-import",
 "autonomy_override": "",
 "commit_tasks": true,
 "commit_runs": false,
 "commit_trailer": "",
 "repos": [
  {
   "name": "main",
   "path": ".",
   "branch": "current",
   "commit": "when-needed",
   "squash": "run"
  }
 ],
 "wave_dir": "docs/wav/wav-035-maven-builds-kernel-and-page-likec4-import",
 "wave_file": "docs/wav/wav-035-maven-builds-kernel-and-page-likec4-import/wav-035-maven-builds-kernel-and-page-likec4-import.md",
 "prg_file": "docs/wav/wav-035-maven-builds-kernel-and-page-likec4-import/prg-035-maven-builds-kernel-and-page-likec4-import.md",
 "run_dir": "docs/wav/wav-035-maven-builds-kernel-and-page-likec4-import/run",
 "check_script": "/home/tibo/git-perso/claude-agents/plugins/run-management/skills/complete-run/scripts/check_run.py",
 "run_workflows": true,
 "generator_script": "/home/tibo/git-perso/claude-agents/plugins/run-management/skills/complete-wave/scripts/complete_wave.py",
 "child_workflows": {
  "design": "run-management:run-design",
  "implement": "run-management:run-implement"
 },
 "stand_in": false,
 "stand_in_command": "",
 "steps": [
  {
   "kind": "run",
   "n": 1,
   "phase": "P1",
   "run": {
    "id": "W-1",
    "number": null,
    "slug": "kernel-built-by-maven",
    "model": "sonnet",
    "effort": "high",
    "verify": {
     "model": "sonnet",
     "effort": "high"
    },
    "sensitive": true,
    "dir": null,
    "focus": "build the repository from a clean checkout with Rust installed and get the same kernel bytes, with no .wasm committed",
    "delegation": "hard_judgment",
    "doc_profile": "TDD+pln",
    "delegation_reason": "changes the build of the released jar and of the three native binaries (the other two targets are proved only by a tag run)",
    "status_on_disk": "none"
   }
  },
  {
   "kind": "gate",
   "phase": "P1",
   "criteria": [
    "`git ls-files | grep -c viewpoint_kernel.wasm` prints 0 (1 on the starting repository, commit 7742b07)",
    "with JAVA_HOME a JDK 25, `rm -rf target && ./mvnw package -Dmaven.test.skip -Dplugin.asciidoctor.skip=true` exits 0, and the file `editor-webapp/assets/viewpoint_kernel.wasm` inside the jar of `target/quarkus-app/lib/main` or `target/quarkus-app/app` (the run names which) is byte-identical to `git show 7742b07:src/main/resources/editor-webapp/assets/viewpoint_kernel.wasm`; a second clean build gives the same SHA-256",
    "with a PATH that holds `java` and the Maven wrapper but neither `cargo` nor `rustup`, `./mvnw -o validate` or the first phase that builds the kernel exits non-zero and prints one `[ERROR]` line that names `rustup`, with no stack trace of a plugin",
    "`grep -rn \"Maven needs no Rust\" --include=CLAUDE.md .` prints nothing (2 hits on the starting repository), and `grep -c \"committed\" src/main/rust/viewpoint-kernel/CLAUDE.md` prints no line that says the `.wasm` is committed",
    "the step \"Check the committed WebAssembly is the one the Rust builds\" of `.github/workflows/ci-build.yaml` is gone or reads the build (`grep -c` of that exact name prints 0 or the step no longer runs `embed.sh --check`; it is 1 on the starting repository), and the document of the run lists each job of that file that runs `./mvnw` with the step that makes `cargo` available in it, each of which the gate agent finds in the file",
    "`./mvnw test-compile pmd:check`, `./mvnw verify -DskipITs=false`, `npm run test:unit`, `npm run editor:check`, `npm run format:check` and `npm run lint` exit 0 with `npm ci` and the Maven build run first, `scripts/byte-identity.sh` exits 0 with `scripts/byte-identity-exceptions.txt` unchanged, and `npm run editor:build` leaves `git status --short` unchanged"
   ],
   "runs": [
    "W-1"
   ],
   "model": "sonnet",
   "effort": "high"
  },
  {
   "kind": "run",
   "n": 2,
   "phase": "P2",
   "run": {
    "id": "W-2",
    "number": null,
    "slug": "editor-page-built-by-maven",
    "model": "sonnet",
    "effort": "high",
    "verify": {
     "model": "sonnet",
     "effort": "high"
    },
    "sensitive": true,
    "dir": null,
    "focus": "open the editor from the folder a clean build writes, from a disk and offline, with no generated editor file committed",
    "delegation": "hard_judgment",
    "doc_profile": "TDD+pln",
    "delegation_reason": "changes the files the live hosted editor serves and what the jar holds (the website step is proved only by a tag run)",
    "status_on_disk": "none"
   }
  },
  {
   "kind": "gate",
   "phase": "P2",
   "criteria": [
    "`git ls-files src/main/resources/editor-webapp` prints nothing (8 files on the starting repository), and `git ls-files | grep -c viewpoint_kernel` prints 0",
    "with JAVA_HOME a JDK 25, `rm -rf target node_modules && ./mvnw package -Dmaven.test.skip -Dplugin.asciidoctor.skip=true` exits 0 (Maven runs `npm ci` itself) and the jar holds `editor-webapp/standalone.html`, `assets/codemirror.js`, `assets/elk.js`, `assets/viewpoint_kernel.js`, `samples/brightcart.yaml` and `samples/archicode.yaml`",
    "the built `codemirror.js`, `elk.js` and `viewpoint_kernel.js` are byte-identical to the files of the same names under `src/main/resources/editor-webapp/assets/` at commit 7742b07 (`git show 7742b07:<path>`), and the built `standalone.html` is too unless the document of the run names the change of `src/main/editor` that explains the difference",
    "the built folder opens from a disk and offline: `npx playwright test src/test/e2e/editor-offline.spec.js --project=chromium` and `--project=firefox` exit 0, including its third test (page opened from a disk, no `import(`, classic scripts), reading the page from the folder of the build, and `npm run test:unit` exits 0 (it includes `remote-import.test.js`)",
    "the step \"Assemble website\" of `.github/workflows/ci-build.yaml` copies the page, the assets and the samples from the folder of the build and compares them with `cmp`: `sed -n \"/Assemble website/,/Publish website/p\" .github/workflows/ci-build.yaml | grep -c \"src/main/resources/editor-webapp\"` prints 0 (at least 6 on the starting repository)",
    "no CLAUDE.md says that the page, the bundles, the kernel or the samples are committed: `grep -n \"committed\" CLAUDE.md src/main/editor/CLAUDE.md src/main/rust/viewpoint-kernel/CLAUDE.md | grep -E \"standalone|assets|wasm|bundle|sample|page\"` prints nothing (at least 4 lines on the starting repository), and the manual (`src/doc/README.adoc`) says how to get the page",
    "`npm run test:unit`, `npm run test:coverage`, `npm run format:check`, `npm run lint`, `./mvnw test-compile pmd:check` and `./mvnw verify -DskipITs=false` exit 0, `scripts/byte-identity.sh` exits 0 with `scripts/byte-identity-exceptions.txt` unchanged, `ratchet.max` in `src/main/editor/layers.json` is at most 99 (it is 99), and `git diff 7742b07 HEAD -- scripts/editor-coverage-floor.json` shows no number lower than before"
   ],
   "runs": [
    "W-2"
   ],
   "model": "sonnet",
   "effort": "high"
  },
  {
   "kind": "run",
   "n": 3,
   "phase": "P3",
   "run": {
    "id": "W-3",
    "number": null,
    "slug": "likec4-json-import",
    "model": "sonnet",
    "effort": "high",
    "verify": {
     "model": "sonnet",
     "effort": "medium"
    },
    "sensitive": false,
    "dir": null,
    "focus": "bring a LikeC4 model in with one command and see what was dropped",
    "delegation": "standard",
    "doc_profile": "TDD+pln",
    "delegation_reason": "",
    "status_on_disk": "none"
   }
  },
  {
   "kind": "gate",
   "phase": "P3",
   "criteria": [
    "the sample is the one of commit `331f1d5` and the wave has not touched it: `git diff 331f1d5 HEAD --stat -- src/test/resources/likec4` prints nothing, and `src/test/resources/likec4/PROVENANCE.md` names `github.com/likec4/likec4`, the version of the tool, the command run and a 40-hex commit SHA",
    "on the packaged application (`java -jar target/quarkus-app/quarkus-run.jar`), `import likec4 <the sample> --output <an empty folder>` exits 0 and prints one `warning:` line for each dropped part the sample holds, with `--map kind=kind` for each kind it names; `query graph` on the output prints as many elements as the sample's `elements` minus the number the report says were dropped",
    "a `.c4` input, a non-empty output folder, and the sample with a kind that has no target and no `--map` are each one `error:` line, exit 1, no stack trace (the last names the kinds to map); `--map kind=kind` for each named kind then exits 0",
    "a test of `src/test/java/io/morin/archicode/it` (`LikeC4ImportIT` or the name the run gives) runs the import on the packaged application, a test loads the output with the command line and another in the editor's node suite, and `grep -c LikeC4 src/main/resources/META-INF/native-image/io.morin.archicode/archicode/reflect-config.json` prints at least 1 (0 on the starting repository)",
    "`import structurizr` writes the same bytes and the same warnings as before: `StructurizrImportIT` and the Java tests of the Structurizr importer pass with their goldens unchanged (`git diff 7742b07 HEAD --stat -- src/test/resources/structurizr` prints nothing)",
    "`./mvnw test-compile pmd:check`, `./mvnw verify -DskipITs=false`, `npm run test:unit`, `npm run test:coverage`, `npm run format:check` and `npm run lint` exit 0, `scripts/byte-identity.sh` exits 0 with `scripts/byte-identity-exceptions.txt` unchanged, `CommandReferenceTest` lists `import likec4`, and `npm run sample:build` and the build of the page leave `git status --short` unchanged (the model of ArchiCode under `docs/architecture` names the new classes, and `ArchitectureDriftTest` passes)"
   ],
   "runs": [
    "W-3"
   ],
   "model": "sonnet",
   "effort": "medium"
  }
 ],
 "blocked": [],
 "notes": []
}
// ---- engine (shared text: generated files and the shipped `wave` workflow use this same body) ----
// Every agent below is a leaf: it has neither the Workflow tool nor the Agent tool.
// Order per run step: dispatch entry in the wave prg -> create the missing run directory
// -> start-run (commit: per-run) -> one agent for the run -> one independent verification agent -> commit-run (commit: per-run) -> result entry.
// Runs go one after another. A phase gate is verified after the last run of its phase. Any unmet check stops the workflow.
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
    check_run_exit: { type: 'integer' },
    wave_findings: { type: 'string' }, not_verified: { type: 'string' },
  },
  required: ['run', 'status', 'status_file'],
}
const VERIFY_SCHEMA = {
  type: 'object',
  properties: {
    run: { type: 'string' }, status: { type: 'string' }, check_run_exit: { type: 'integer' },
    check_run_named: { type: 'string' }, manifest_run_ok: { type: 'boolean' },
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
    criteria: { type: 'array', items: { type: 'object', properties: { index: { type: 'integer' }, text: { type: 'string' }, held: { type: 'boolean' }, evidence: { type: 'string' }, cause: { type: 'string', enum: ['environment', 'criterion'] }, baseline: { type: 'string' } }, required: ['index', 'text', 'held', 'evidence'] } },
    canonical_discharge: { type: 'object', properties: { held: { type: 'boolean' }, evidence: { type: 'string' } }, required: ['held', 'evidence'] },
  },
  required: ['criteria', 'canonical_discharge'],
}
const PATH_SCHEMA = {
  type: 'object',
  properties: { exit: { type: 'integer' }, path: { type: 'string' }, message: { type: 'string' } },
  required: ['exit'],
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
// numbered progress groups (2.22.0): every agent is created under a phase whose title starts with a zero-padded number, so a UI that sorts groups
// alphabetically shows them in execution order. `PH` is the default group; a call that runs in parallel with others passes its own.
const pad = (n, w = 2) => String(n).padStart(w, '0')
let PH = null
const ag = (prompt, o, ph) => { const p = ph === undefined ? PH : ph; return agent(prompt, p ? { ...o, phase: p } : o) }
const phaseTitle = (pid) => { const m = /(\d+)/.exec(String(pid)); return `${m ? pad(m[1]) : '00'} · phase ${pid}` }
const results = []
const findings = []

// every stop writes an escalation entry first (complete-wave, 'Record'), then returns the blocked state
const stop = async (reason, detail) => {
  await ag(entryPrompt('escalation', `workflow stopped, state blocked: ${reason} ` + JSON.stringify(detail)), opt('bookkeeping', { label: 'prg-escalation' }))
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
  `Focus: ${r.focus}\n` +
  `Read the wave plan ${WAVE}, your run's documents and the repository yourself; the files win over this brief.\n` +
  `FIRST read ${r.dir}/run-${r.number}-${r.slug}.md. If its status is completed, cancelled or superseded, change nothing and return it. Otherwise continue from the documents already there; never draft over finished work.\n` +
  `You are a leaf agent: you have no Agent tool and no Workflow tool, so every task of the run executes inline in you; a task's results line in the pln says "inline (leaf)". ` +
  `A hard_judgment task stays inline in you regardless.\n` +
  `You must NOT write these wave files: ${WAVE} and ${PRG}. Findings that belong to the wave go in your result (wave_findings).\n` +
  `Carry wave: ${PLAN.wave} into the frontmatter of every prd, tdd, pln and prg file you draft.\n` +
  `Non-negotiables of complete-run: every stage of your document profile runs, including the review passes and Stage 11; never report success you have not checked; ` +
  `run \`python3 "${PLAN.check_script}" --as-completed ${r.dir}\` before declaring completed and return its exit code in check_run_exit. Stay within the repository and its safety rules (no commit, no destructive git, no secrets).\n` +
  `Return status as read from ${r.dir}/run-${r.number}-${r.slug}.md and status_file as that path.`

// run scope (PLAN.run_workflows): instead of one run-executor agent, a fresh leaf agent runs the generator for the run's design
// workflow, the wave script runs the generated file with workflow({scriptPath}) (one level), then the same for implement once a pln
// exists. The agent returns only the PATH of the file the generator wrote: no plan crosses a model hop (a 15-task plan is ~40 KB and a
// copy by a haiku agent failed its digest three times in a row, wave 005). A scriptPath is refused from a session whose working
// directory is elsewhere (workflow() reads a path only from the working directory or an added directory, issue #34); then the child is
// handed over BY NAME (PLAN.child_workflows) with the plan as args, copied by the agent and checked against its digest, up to three
// tries. Exit 3 of the generator means nothing to generate (all stages logged, no pln, all tasks done).
// the commit trailer (PLAN.commit_trailer, resolved at generation) goes to every command below that commits and to each child generation, which carries it into its own commits
const shq = (x) => `'${String(x).replaceAll("'", "'\\''")}'`
const trailerFlag = () => PLAN.commit_trailer ? ` --commit-trailer ${shq(PLAN.commit_trailer)}` : ''
const runFlags = (r) => `--profile ${PLAN.cost_profile}${r.delegation === 'hard_judgment' ? ' --hard' : ''}${PLAN.commit_tasks ? ' --commit-tasks' : ''}${trailerFlag()}${PLAN.autonomy_override ? " --autonomy-override '" + PLAN.autonomy_override.replaceAll("'", "'\\''") + "'" : ''}${PLAN.stand_in ? ' --stand-in' + (PLAN.stand_in_command ? ` --stand-in-command '${PLAN.stand_in_command}'` : '') : ''}`
const pathBrief = (r, stage) => ROOT +
  `Run exactly this command from the repository root and report its result; do nothing else and edit nothing yourself:\n` +
  `python3 "${PLAN.generator_script}" run ${r.dir} --stage ${stage} ${runFlags(r)}\n` +
  `Exit 0: stdout is one line, the absolute path of the file it wrote; return exit 0 and that path in path, exactly as printed. ` +
  `Exit 3: nothing to generate; return exit 3 and its message. Any other exit: return the exit code and its stderr in message.`
const prepBrief = (r, stage) => ROOT +
  `Run exactly this command from the repository root and report its result; do nothing else and edit nothing yourself:\n` +
  `python3 "${PLAN.generator_script}" run ${r.dir} --stage ${stage} ${runFlags(r)} --args\n` +
  `Exit 0: stdout has two lines. Line 1 is the plan as one line of JSON; return it, parsed, in plan, copied exactly (change nothing, drop nothing). Line 2 reads "digest " and 8 hex digits; return those 8 digits in digest. Return exit 0 with them. ` +
  `Exit 3: nothing to generate; return exit 3 and its message. Any other exit: return the exit code and its stderr in message.`
// the plan by name, copied by an agent and checked against its digest; returns {plan} or {failed}
async function planByCopy(r, stage) {
  const name = (PLAN.child_workflows || {})[stage]
  let p = null, got = null, first = null
  for (let attempt = 1; attempt <= 3; attempt++) {
    p = await ag(prepBrief(r, stage), opt('bookkeeping', { label: `prepare-${stage}-${r.id}${attempt > 1 ? '-try' + attempt : ''}`, schema: PREP_SCHEMA }))
    if (!p || (p.exit !== 0 && p.exit !== 3) || p.exit === 3) break
    got = p.plan && typeof p.plan === 'object' ? digestOf(canon(p.plan)) : null
    if (!name || (got !== null && got === p.digest)) break
  }
  if (!p || (p.exit !== 0 && p.exit !== 3)) { findings.push({ run: r.id, stage, prepare_failed: p ? { exit: p.exit, message: p.message } : null }); return { failed: `${stage}: the plan could not be prepared (exit ${p ? p.exit : 'none'}) ${p && p.message ? p.message : ''}`.trim() } }
  if (p.exit === 3) return { nothing: true }
  if (!name || got === null || got !== p.digest) {
    findings.push({ run: r.id, stage, prepare_failed: { reason: !name ? 'no child workflow name in the plan' : 'plan digest mismatch after 3 tries', expected: p.digest || null, got } })
    return { failed: `${stage}: ${!name ? 'no child workflow name in the plan' : 'plan digest mismatch after 3 tries'}` }
  }
  return { name, plan: p.plan }
}
async function runViaWorkflows(r) {
  let state = ''
  for (const stage of ['design', 'implement']) {
    const q = await ag(pathBrief(r, stage), opt('bookkeeping', { label: `prepare-${stage}-${r.id}`, schema: PATH_SCHEMA }))
    if (!q || (q.exit !== 0 && q.exit !== 3)) { findings.push({ run: r.id, stage, prepare_failed: q ? { exit: q.exit, message: q.message } : null }); return { failed: `${stage}: the generator failed (exit ${q ? q.exit : 'none'}) ${q && q.message ? q.message : ''}`.trim() } }
    if (q.exit === 3) continue
    let res = null
    if (q.path) {
      try { res = await workflow({ scriptPath: q.path }) } catch (e) {
        const msg = String((e && e.message) || e)
        if (!/scriptPath/.test(msg)) { findings.push({ run: r.id, stage, child_error: msg }); return { failed: `${stage} workflow threw: ${msg}` } }
        res = null  // the path was refused: by name below
      }
    }
    if (res === null) {
      const c = await planByCopy(r, stage)
      if (c.nothing) continue
      if (c.failed) return { failed: c.failed }
      try { res = await workflow(c.name, c.plan) } catch (e) { findings.push({ run: r.id, stage, child_error: String((e && e.message) || e) }); return { failed: `${stage} workflow threw: ${String((e && e.message) || e)}` } }
    }
    if (res && (res.state === 'awaiting-commit' || res.state === 'awaiting-operator')) { findings.push({ run: r.id, stage, [res.state.replace('-', '_')]: res }); return { awaiting: res.state.slice(9), run: r.number, stage, tasks: res.tasks } }
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
      (r.created ? `4. This run was just created by the workflow: confirm the directory exists and that the manifest ${WAVE} holds \`run: ${r.number}\` on this run's line; return manifest_run_ok.\n` : '') +
      `Edit nothing.`)

const COMMIT_RUN_SCHEMA = {
  type: 'object',
  properties: { run: { type: 'string' }, committed: { type: 'boolean' }, nothing: { type: 'boolean' }, commit: { type: 'string' }, files: { type: 'array', items: { type: 'string' } },
    action: { type: 'string' }, before: { type: 'string' }, after: { type: 'string' }, wip_ref: { type: 'string' }, reason: { type: 'string' }, detail: { type: 'string' },
    left_out: { type: 'array', items: {} }, absorbed: { type: 'array', items: {} }, kept: { type: 'array', items: {} }, policy: { type: 'string' },
    repos: { type: 'array', items: { type: 'object', properties: { name: { type: 'string' }, path: { type: 'string' }, state: { type: 'string' }, commit: { type: 'string' }, wip_ref: { type: 'string' }, branch: { type: 'string' }, ref: { type: 'string' }, sha: { type: 'string' }, reason: { type: 'string' }, detail: { type: 'string' } } } },
    exit: { type: 'integer' }, message: { type: 'string' } },
  required: ['run', 'exit'],
}
const START_SCHEMA = {
  type: 'object',
  properties: { exit: { type: 'integer' }, ok: { type: 'boolean' }, reason: { type: 'string' }, detail: { type: 'string' }, already_recorded: { type: 'boolean' }, repos: { type: 'array', items: { type: 'object', properties: { name: { type: 'string' }, path: { type: 'string' }, state: { type: 'string' }, commit: { type: 'string' }, wip_ref: { type: 'string' }, branch: { type: 'string' }, ref: { type: 'string' }, sha: { type: 'string' }, reason: { type: 'string' }, detail: { type: 'string' } } } }, message: { type: 'string' } },
  required: ['exit', 'ok'],
}
// only with PLAN.commit_runs: records where the run begins (HEAD and branch) before any agent of the run writes outside the wave folder
const startRunBrief = (r) => ROOT +
  `Run this command from the repository root and return what it printed as JSON: \`python3 "${PLAN.generator_script}" start-run ${PLAN.wave_dir} --run ${r.id} --json\`. ` +
  `Return exit (the command's exit code), ok, reason, detail, already_recorded, repos exactly as printed; if the exit code is not 0 and nothing was printed as JSON put the command's error output in message. ` +
  `Do not run any other git command and do not edit anything.`
const commitRunCommand = (r) => `python3 "${PLAN.generator_script}" commit-run ${PLAN.wave_dir} --run ${r.id}${trailerFlag()} --apply`
// a run commit is a success when the command exited 0 and either made a commit (committed, squashed) or found nothing to commit
const commitRunOk = (c) => c.exit === 0 && (c.committed || c.nothing || c.action === 'squashed' || c.action === 'committed')
// the per-repository report of start-run, commit-lane and commit-run (a repos map in the settings): name, path, state and, when present, the commit, the wip ref and the reason of each repository, in map order
const reposLog = (repos) => (Array.isArray(repos) ? repos : []).map((x) => {
  const o = {}
  for (const k of ['name', 'path', 'state', 'branch', 'ref', 'sha', 'commit', 'wip_ref', 'reason', 'detail']) if (x && x[k] !== undefined && x[k] !== null && x[k] !== '') o[k] = x[k]
  return o
})
// ' Repositories: aimp-product committed, aimp-front refused, ...' when the report lists any, else nothing
const reposText = (repos) => {
  const l = reposLog(repos)
  return l.length ? ` Repositories: ${l.map((x) => `${x.name || x.path} ${x.state || 'unknown'}`).join(', ')}.` : ''
}
// what the prg keeps of a run commit report: the action, the policy, the hash, the wip ref and, when present, what was absorbed or left out
const commitRunLog = (c) => {
  const o = { id: c.id, exit: c.exit }
  for (const k of ['action', 'policy', 'commit', 'wip_ref', 'reason', 'detail', 'message']) if (c[k] !== undefined && c[k] !== null && c[k] !== '') o[k] = c[k]
  for (const k of ['absorbed', 'left_out']) if (Array.isArray(c[k]) && c[k].length) o[k] = c[k]
  const rl = reposLog(c.repos)
  if (rl.length) o.repos = rl
  return o
}
const commitRunStopText = (r, c) => `wave workflow stopped, state awaiting-commit: ` + JSON.stringify(commitRunLog(c)) +
  `. Reason ${c.reason || 'none given'}${c.detail ? ' (' + c.detail + ')' : c.message ? ' (' + c.message + ')' : ''}.${reposText(c.repos)} This run is completed and verified; the workflow did not change its files or its commits beyond what is listed. ` +
  `The commit can be retried with \`${commitRunCommand(r)}\`; a rerun of the workflow is safe and does not execute the run again.`
// only with PLAN.commit_runs (commit: per-run): the script decides the files and the refusals, this agent runs one command and reports it
const commitRunBrief = (r) => ROOT +
  `Run this command from the repository root and return what it printed as JSON: \`python3 "${PLAN.generator_script}" commit-run ${PLAN.wave_dir} --run ${r.id}${trailerFlag()} --apply --json\`. ` +
  `Return run ${r.id}, exit (the command's exit code), committed, nothing, commit, files, action, before, after, wip_ref, reason, detail, left_out, absorbed, kept, policy, repos exactly as printed; if the exit code is not 0 put the command's error output in message. ` +
  `Do not run any other git command and do not edit anything.`
const commitRunOf = async (r) => {
  const c = await ag(commitRunBrief(r), opt('bookkeeping', { label: `commit-run-${r.id}`, schema: COMMIT_RUN_SCHEMA }))
  return { id: r.id, ...(c || { exit: -1, message: 'the commit agent returned nothing' }) }
}

const createBrief = (r) => ROOT +
  `Create the missing run directory of wave ${PLAN.wave}, following manage-runs "Starting a new run" and complete-wave 'Create missing runs':\n` +
  `- ${r.id}: slug ${r.slug}, profile ${r.doc_profile}\n` +
  `Number = highest NNNN across every docs/run/run-*/ and every docs/wav/*/run/run-*/ directory, plus 1; create ${PLAN.run_dir}/run-NNNN-<slug> with mkdir (never mkdir -p); ` +
  `write its status file run-NNNN-<slug>.md first (frontmatter type: run, run: NNNN, status: proposed, profile: <the profile listed for that run>, wave: ${PLAN.wave}; a heading and one line naming the wave and the manifest id); ` +
  `then write NNNN into the \`run:\` field of that run in the manifest of ${WAVE}. Write nothing else in that manifest. Return the created run (id, number, dir) in runs.${STAND_IN_NOTE}`

// the tree identifier of Stage 11 (complete-run/SKILL.md owns the recipe): the working tree as it stands, read through a temporary index, without the wave's folder
const TREE_CMD = `T=$(mktemp -d) && GIT_INDEX_FILE=$T/index git add -A -- . ':(exclude)${PLAN.wave_dir}' && GIT_INDEX_FILE=$T/index git write-tree`

const gateBrief = (g) => ROOT +
  `Verify the gate of phase ${g.phase} of wave ${PLAN.wave} against real evidence, per complete-wave 'Verify the gate'. Plan: ${WAVE}. You did not execute the runs.\n` +
  `For each criterion run the command, read the file or inspect the artifact, and say in evidence what you actually did; a criterion you cannot check mechanically is verified by inspection and the evidence says so. ` +
  `held is true only if the criterion holds as written. Return exactly one entry per criterion in criteria, each carrying the number of its criterion in index (1 to ${g.criteria.length}); the canonical discharge goes only in canonical_discharge, never as a further entry. ` +
  `When a command fails, rerun an unchanged existing check of the same project as a baseline and say in evidence the result per project and the baseline; set cause to "environment" when the baseline fails the same way or the set of failing tests changes between reruns, "criterion" when the criterion itself does not hold, and baseline to the check you ran. ` +
  `A criterion that is a run of the repository's full test suite may be met by a green already recorded: each run of the phase (${g.runs.join(', ')}) may hold in its prg under ${PLAN.wave_dir}/run/ a line "- <date>: Full suite: command <command>; tree <40 hex>; outcome <pass|fail>; duration <n>s". Compute the current tree with \`${TREE_CMD}\` (the wave's folder is left out of the tree on purpose). ` +
  `Accept a recorded line whose command equals the criterion's command and whose tree equals the current one, with outcome pass: cite its date, command and tree in evidence in place of a rerun. Rerun the command yourself when the tree differs, when the command is live (it calls a paid or remote service), networked, seeded (a random or clock seed) or known to be unstable, when the recorded outcome is not pass, or when no line matches. End-to-end, byte-identity and live criteria are yours to run. ` +
  `Criteria, in order:\n` + g.criteria.map((c, i) => `${i + 1}. ${c}`).join('\n') + '\n' +
  `Then the canonical discharge of this phase's runs (${g.runs.join(', ')}): each either discharged its CI-arc-n/CI-dom-n items or answered "none" with a reason, in the TDD's Canonical Impact section or, for a single-document run, in its own body. ` +
  `Silence or a bare "none" is not held. Edit nothing.${STAND_IN_NOTE}` +
  (PLAN.stand_in ? ` For this stand-in test the runs carry no documents: report the canonical discharge as held true with the evidence "stand-in test, not assessed".` : '')

if (PLAN.steps.length === 0) {
  return PLAN.blocked.length
    ? await stop('nothing can run: unsatisfied dependencies', PLAN.blocked)
    : { state: 'nothing-to-do', note: 'every run of this scope is completed', results }
}

for (const step of PLAN.steps) {
  PH = phaseTitle(step.phase)
  if (step.kind === 'verify') {
    // runs recorded completed whose verification entry is missing from the prg (a cut): verify only, never re-run
    const checked = await parallel(step.runs.map((r) => () => ag(verifyBrief(r), PLAN.stand_in
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
    // commit: per-run: a run cut between its verification and its commit is committed here (nothing to commit is success), one after the other
    const commits = []
    if (PLAN.commit_runs) for (const r of step.runs) commits.push(await commitRunOf(r))
    const logged = await ag(entryPrompt('result', `verification-only result for ${step.runs.map((r) => r.id).join('+')} (completed before a cut, no verification entry in this log): ` + JSON.stringify(step.runs.map((r, i) => ({ id: r.id, verified: checked[i] }))) + (PLAN.commit_runs ? `; run commits: ${JSON.stringify(commits.map(commitRunLog))}` : '')),
      opt('bookkeeping', { label: `prg-verify-${step.phase}` }))
    if (!logged) return await stop('verification entry not written to the prg', step.phase)
    const refused = commits.findIndex((c) => !commitRunOk(c))
    if (refused >= 0) {
      findings.push({ phase: step.phase, run_commit: [commits[refused]] })
      await ag(entryPrompt('awaiting', commitRunStopText(step.runs[refused], commits[refused])), opt('bookkeeping', { label: `prg-awaiting-commit-${step.phase}` }))
      return { state: 'awaiting-commit', waiting: [commits[refused]], results, findings }
    }
    continue
  }
  if (step.kind === 'gate') {
    const g = await ag(gateBrief(step), { label: `gate-${step.phase}`, schema: GATE_SCHEMA, model: step.model, effort: step.effort })
    if (!g) return await stop('gate agent returned nothing', step.phase)
    results.push({ gate: step.phase, result: g })
    const logged = await ag(entryPrompt('gate', `gate ${step.phase} verified by a fresh agent: ` + JSON.stringify(g)), opt('bookkeeping', { label: `prg-gate-${step.phase}` }))
    // criteria are compared by position and count, never by the text the agent returned (it may reword; it stays in the prg entry as display)
    // matched by the index the agent gives each entry; an entry with no index, one above the count or a repeated one is ignored (it stays in the prg entry)
    const byIdx = {}
    for (const c of g.criteria) if (Number.isInteger(c.index) && c.index >= 1 && c.index <= step.criteria.length && !byIdx[c.index]) byIdx[c.index] = c
    const unmet = []
    step.criteria.forEach((text, i) => {
      const c = byIdx[i + 1]
      if (!c) unmet.push(`criterion ${i + 1} not returned by the gate agent: ${text}`)
      else if (!c.held) unmet.push(`criterion ${i + 1} not held (${c.cause || 'cause not given'}): ${text}. ${c.evidence}${c.baseline ? ' Baseline: ' + c.baseline : ''}`)
    })
    if (!logged) unmet.push('gate entry not written to the prg')
    if (!g.canonical_discharge.held) unmet.push('canonical discharge')
    if (unmet.length) return await stop('gate unmet', { phase: step.phase, unmet })
    continue
  }
  const r = step.run
  const entered = await ag(entryPrompt('dispatch', `step ${step.n} (phase ${step.phase}) = ${r.id}; cost profile ${PLAN.cost_profile}; overrides of declared tiers: ${(PLAN.overrides || []).length ? PLAN.overrides.join(' | ') : 'none'}; autonomy override: ${PLAN.autonomy_override ? PLAN.autonomy_override : 'none'}; tiers: ${r.id} ${r.delegation} (${r.model}, effort ${r.effort}); runs execute one after another in this worktree; one leaf agent per run (${PLAN.stand_in ? 'stand-in' : 'run-management:run-executor'}); written before dispatch by the generated workflow.`),
    opt('bookkeeping', { label: `prg-dispatch-${step.n}` }))
  if (!entered) return await stop('dispatch entry not written; nothing was dispatched', step.n)
  if (!r.number) {
    const c = await ag(createBrief(r), opt('create', { label: `create-${step.n}-${r.id}`, schema: CREATE_SCHEMA }))
    if (!c) return await stop('run creation returned nothing', [r.id])
    const m = (c.runs || []).find((x) => x.id === r.id)
    if (m) { r.number = m.number; r.dir = m.dir; r.created = true }
    if (!r.number) return await stop('run creation incomplete', [r.id])
  }
  // commit: per-run: the start point of the run is recorded before any agent of the run executes; a refusal stops the wave and the run is not executed
  if (PLAN.commit_runs) {
    const s = await ag(startRunBrief(r), opt('bookkeeping', { label: `start-run-${r.id}`, schema: START_SCHEMA }))
    if (!s || s.exit !== 0 || !s.ok) {
      const refusal = { id: r.id, exit: s ? s.exit : -1, reason: (s && s.reason) || (s ? '' : 'the start agent returned nothing'), detail: (s && (s.detail || s.message)) || '' }
      const startRepos = reposLog(s && s.repos)
      if (startRepos.length) refusal.repos = startRepos
      findings.push({ step: step.n, start_run: refusal })
      await ag(entryPrompt('awaiting', `wave workflow stopped, state awaiting-operator: start-run refused for ${r.id}: ` + JSON.stringify(refusal) +
        `. The run was not executed and nothing was written but this entry.${reposText(refusal.repos)}` +
        (refusal.reason === 'dirty-tree' ? ` The tree holds changes outside the wave folder (partial work of this run, or a change made after the workflow was generated): commit them by hand by path, then regenerate.` : ` Fix the cause named above, then regenerate.`)),
        opt('bookkeeping', { label: `prg-awaiting-operator-${step.n}` }))
      return { state: 'awaiting-operator', waiting: [refusal], results, findings }
    }
  }
  const ran = await (PLAN.run_workflows
    ? runViaWorkflows(r)
    : PLAN.stand_in
    ? ag(standInBrief(r), { label: `run-${r.id}`, schema: RUN_SCHEMA, model: 'haiku', effort: 'low' })
    : ag(runBrief(r), { label: `run-${r.id}`, schema: RUN_SCHEMA, agentType: 'run-management:run-executor', model: r.model, effort: r.effort }))
  // a run that stopped for a human, an operator or a commit: logged before any verification agent is dispatched, the wave stops with the same state
  const waitingOf = () => [{ run: r.id, number: ran.run, stage: ran.stage, tasks: ran.tasks }]
  if (ran && ran.awaiting === 'operator') {
    const waiting = waitingOf()
    await ag(entryPrompt('awaiting', `wave workflow stopped, state awaiting-operator: ` + JSON.stringify(waiting) + `. A task agent did not start its task and wrote nothing; the tasks are still pending. Read the reasons in the run's prg, fix the cause (often: launch right after a neutral message), then regenerate.`),
      opt('bookkeeping', { label: `prg-awaiting-operator-${step.n}` }))
    return { state: 'awaiting-operator', waiting, results, findings }
  }
  if (ran && ran.awaiting === 'commit') {
    const waiting = waitingOf()
    await ag(entryPrompt('awaiting', `wave workflow stopped, state awaiting-commit: ` + JSON.stringify(waiting) + `. The tasks' work is on disk and a check needs it committed: the lane commit was refused or not made (the reason is in each task's entry of the run's prg), and the workflow commits nothing else by itself. ` +
        `Commit the pending tasks' files by path with \`python3 "${PLAN.generator_script}" commit-lane ${PLAN.wave_dir} --run ${r.id} --label 'tasks …'${trailerFlag()} --apply\` (add one --path per file), then regenerate; the tasks are still pending and the next generation resumes them.`),
      opt('bookkeeping', { label: `prg-awaiting-commit-${step.n}` }))
    return { state: 'awaiting-commit', waiting, results, findings }
  }
  if (ran && ran.awaiting) {
    const waiting = waitingOf()
    await ag(entryPrompt('awaiting', `wave workflow stopped, state awaiting-human: ` + JSON.stringify(waiting) + `. The run's own prg names the tasks and how to lift the gate (--autonomy-override with a reason, or provide the validation); regenerate after the decision.`),
      opt('bookkeeping', { label: `prg-awaiting-${step.n}` }))
    return { state: 'awaiting-human', waiting, results, findings }
  }
  const v = await ag(verifyBrief(r), PLAN.stand_in
    ? { label: `verify-${r.id}`, schema: VERIFY_SCHEMA, model: 'haiku', effort: 'low' }
    : { label: `verify-${r.id}`, schema: VERIFY_SCHEMA, model: r.verify.model, effort: r.verify.effort })
  results.push({ run: r.id, number: r.number, reported: ran && ran.status, verified: v })
  let bad = null
  if (!ran) bad = `${r.id}: run agent returned nothing`
  else if (ran.failed) bad = `${r.id}: ${ran.failed}`
  else if (!v) bad = `${r.id}: verification agent returned nothing`
  else if (v.status !== 'completed') bad = `${r.id}: status on disk is ${v.status}`
  else if (!PLAN.stand_in && v.check_run_exit !== 0) bad = `${r.id}: check_run exit ${v.check_run_exit} ${v.check_run_named || ''}`
  else if (r.created && !PLAN.stand_in && v.manifest_run_ok !== true) bad = `${r.id}: the manifest does not hold the created run number`
  // commit: per-run: a run verified completed is committed by path before its result is logged
  let commitRun = null
  if (PLAN.commit_runs && !bad) {
    commitRun = await commitRunOf(r)
  }
  // a verified run is logged as `step N result for W-x: [...]`; a run whose verification failed is logged as `step N: W-x NOT verified (<why>): [...]`
  // with the word "result" replaced everywhere, so no reader that looks for "result" and "verif" takes it for a verification entry (wave 016, W-1)
  const entryJson = JSON.stringify([{ id: r.id, reported: ran && ran.status, verified: v }]) + (PLAN.commit_runs ? `; run commits: ${JSON.stringify(commitRun ? [commitRunLog(commitRun)] : [])}` : '')
  await ag(entryPrompt('result', bad
    ? `step ${step.n}: ${r.id} NOT verified (${bad}): ${entryJson}`.replace(/result/gi, 'outcome')
    : `step ${step.n} result for ${r.id}: ${entryJson}`),
    opt('bookkeeping', { label: `prg-result-${step.n}-${r.id}` }))
  if (bad) return await stop('run not verified completed', [bad])
  if (commitRun && !commitRunOk(commitRun)) {
    findings.push({ step: step.n, run_commit: [commitRun] })
    await ag(entryPrompt('awaiting', commitRunStopText(r, commitRun)),
      opt('bookkeeping', { label: `prg-awaiting-commit-${step.n}` }))
    return { state: 'awaiting-commit', waiting: [commitRun], results, findings }
  }
}
return PLAN.blocked.length
  ? await stop('remaining runs blocked', PLAN.blocked)
  : { state: 'done', ready_to_close: true, note: 'close-out (complete-wave, Close out) is done by the launching session', results, findings }
