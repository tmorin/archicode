export const meta = { name: "wave-034-diagrams-assets-likec4-matrix-page", description: "Generated from the wave manifest: remaining runs only; cost profile low-cost" }
// cost profile: low-cost
// overrides of declared tiers and profile ceilings (3):
//   - gate P2: a member run is sensitive, the gate agent takes the elevated pair sonnet/high
//   - run W-2 declared hard_judgment with a delegation_reason: verification agent raised to sonnet/high; executor kept at sonnet/high
//   - settings from .claude/run-management.yaml: profile=low-cost, commit=when-needed
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
  "run W-2 declared hard_judgment with a delegation_reason: verification agent raised to sonnet/high; executor kept at sonnet/high",
  "settings from .claude/run-management.yaml: profile=low-cost, commit=when-needed"
 ],
 "wave": "034",
 "slug": "diagrams-assets-likec4-matrix-page",
 "autonomy_override": "",
 "commit_tasks": true,
 "commit_runs": false,
 "wave_dir": "docs/wav/wav-034-diagrams-assets-likec4-matrix-page",
 "wave_file": "docs/wav/wav-034-diagrams-assets-likec4-matrix-page/wav-034-diagrams-assets-likec4-matrix-page.md",
 "prg_file": "docs/wav/wav-034-diagrams-assets-likec4-matrix-page/prg-034-diagrams-assets-likec4-matrix-page.md",
 "run_dir": "docs/wav/wav-034-diagrams-assets-likec4-matrix-page/run",
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
   "phase": "P1",
   "lanes": [
    [
     {
      "id": "W-1",
      "number": null,
      "slug": "manual-plantuml-diagrams",
      "model": "sonnet",
      "effort": "high",
      "verify": {
       "model": "sonnet",
       "effort": "medium"
      },
      "sensitive": false,
      "dir": null,
      "focus": "read the manual on the website with its 18 diagrams drawn, and have the build say when one is not",
      "likely_paths": [
       "pom.xml",
       ".github/workflows/ci-build.yaml",
       ".github/CLAUDE.md"
      ],
      "delegation": "standard",
      "doc_profile": "single-document",
      "delegation_reason": "",
      "status_on_disk": "none"
     }
    ]
   ]
  },
  {
   "kind": "gate",
   "phase": "P1",
   "criteria": [
    "with JAVA_HOME a JDK 25, `rm -rf target/generated-docs && ./mvnw -o generate-resources -Dmaven.test.skip` exits 0, `grep -c \"Could not load PlantUML\" target/generated-docs/index.html` prints 0 (18 on the starting repository) and `ls target/generated-docs/*.png | wc -l` prints at least 18 (0 on the starting repository)",
    "`grep -c asciidoctorj-diagram-plantuml pom.xml` prints at least 1 (0 on the starting repository)",
    "a step of the job `Java` in .github/workflows/ci-build.yaml holds the text `Failed to generate image` (it does not on the starting repository); the command of that step, run in a scratch folder on a copy of target/generated-docs/index.html where one block is replaced by that text, exits non-zero, and on the real page it exits 0",
    "`./mvnw test-compile pmd:check` and `npm run format:check` exit 0"
   ],
   "runs": [
    "W-1"
   ],
   "model": "sonnet",
   "effort": "medium"
  },
  {
   "kind": "batch",
   "n": 2,
   "phase": "P2",
   "lanes": [
    [
     {
      "id": "W-2",
      "number": null,
      "slug": "editor-assets-beside-the-page",
      "model": "sonnet",
      "effort": "high",
      "verify": {
       "model": "sonnet",
       "effort": "high"
      },
      "sensitive": true,
      "dir": null,
      "focus": "open the editor with the network blocked and still draw a diagram and edit YAML in CodeMirror",
      "likely_paths": [
       "package.json",
       "package-lock.json",
       "scripts/build-editor.mjs",
       "scripts/check-editor.mjs",
       "scripts/changes.mjs",
       "src/main/editor/**",
       "src/main/resources/editor-webapp/**",
       "src/main/java/io/morin/archicode/cli/EditorHttpServer.java",
       "src/test/java/io/morin/archicode/cli/EditorHttpServerTest.java",
       "src/test/java/io/morin/archicode/it/EditorServeIT.java",
       "src/test/javascript/**",
       "src/test/e2e/**",
       ".github/workflows/ci-build.yaml",
       ".github/CLAUDE.md",
       "src/doc/README.adoc",
       "src/test/CLAUDE.md"
      ],
      "delegation": "hard_judgment",
      "doc_profile": "TDD+pln",
      "delegation_reason": "changes the files the live hosted editor serves (the website step is proved only by a tag run)",
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
      "id": "W-3",
      "number": null,
      "slug": "kernel-beside-the-page",
      "model": "sonnet",
      "effort": "high",
      "verify": {
       "model": "sonnet",
       "effort": "medium"
      },
      "sensitive": false,
      "dir": null,
      "focus": "load a page 1.1 MB smaller, with the kernel fetched as a WebAssembly file",
      "likely_paths": [
       "src/main/editor/model/kernel-bridge.js",
       "src/main/editor/names.json",
       "src/main/editor/CLAUDE.md",
       "scripts/build-editor.mjs",
       "src/main/rust/viewpoint-kernel/embed.sh",
       "src/main/rust/viewpoint-kernel/CLAUDE.md",
       "src/main/resources/editor-webapp/**",
       "pom.xml",
       "src/test/javascript/**",
       "src/test/e2e/**",
       ".github/workflows/ci-build.yaml",
       "src/doc/README.adoc"
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
    "`grep -rnE \"import\\(.https?:\" src/main/editor src/main/resources/editor-webapp --include=*.js --include=*.mjs --include=*.html` prints nothing (6 hits in src/main/editor and 6 in standalone.html on the starting repository)",
    "`grep -c esbuild package.json` prints at least 1 and `grep -c \"node_modules/esbuild\" package-lock.json` prints at least 1 (0 and 0 on the starting repository); `npm ci` exits 0",
    "the folder src/main/resources/editor-webapp/assets holds codemirror.js, elk.js and viewpoint_kernel.wasm (the folder does not exist on the starting repository), and `npm run editor:check` exits 0, which includes a rebuild of the bundles compared to the committed ones",
    "standalone.html is at least 1,000,000 bytes smaller than the 2,736,458 bytes of the starting repository, and `grep -c \"application/octet-stream\" src/main/resources/editor-webapp/standalone.html` prints 0 (1 on the starting repository)",
    "with the application built, `editor serve` started on a free port (src/test/CLAUDE.md for the way), a request with the token for /assets/viewpoint_kernel.wasm answers 200 with the type application/wasm, one for /assets/codemirror.js answers 200 with a JavaScript type, a request without the token or the cookie answers 403 and a name that is not in the table answers 404; EditorHttpServerTest and EditorServeIT pass",
    "an end-to-end spec named in the document of the run W-2 starts the editor with every host but 127.0.0.1 blocked, draws a diagram and edits YAML in CodeMirror, and `npx playwright test <that spec> --project=chromium` and `--project=firefox` exit 0",
    "the step \"Assemble website\" of .github/workflows/ci-build.yaml copies the folder assets to the editor folder of the site and compares each file with `cmp` (no mention of `editor/assets` on the starting repository)",
    "`npm run test:unit`, `npm run test:coverage`, `npm run format:check`, `npm run lint` and `./mvnw verify -DskipITs=false` exit 0, `scripts/byte-identity.sh` exits 0 with scripts/byte-identity-exceptions.txt unchanged, `ratchet.max` in src/main/editor/layers.json is at most 99, and `npm run editor:build` and `npm run sample:build` leave `git status --short` unchanged"
   ],
   "runs": [
    "W-2",
    "W-3"
   ],
   "model": "sonnet",
   "effort": "high"
  },
  {
   "kind": "batch",
   "n": 4,
   "phase": "P3",
   "lanes": [
    [
     {
      "id": "W-4",
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
      "focus": "bring a LikeC4 model into ArchiCode with one command and read what was left out",
      "likely_paths": [
       "src/main/java/io/morin/archicode/cli/ArchiCode.java",
       "src/main/java/io/morin/archicode/cli/Import*.java",
       "src/main/java/io/morin/archicode/importer/**",
       "src/main/resources/META-INF/native-image/io.morin.archicode/archicode/reflect-config.json",
       "src/test/java/io/morin/archicode/it/**",
       "src/test/java/io/morin/archicode/importer/**",
       "src/test/resources/likec4/**",
       "src/test/javascript/**",
       "src/test/resources/guide/golden.md",
       "src/doc/README.adoc",
       "src/main/java/io/morin/archicode/CLAUDE.md",
       "docs/architecture/**",
       "src/main/resources/editor-webapp/samples/**"
      ],
      "delegation": "standard",
      "doc_profile": "TDD+pln",
      "delegation_reason": "",
      "status_on_disk": "none"
     }
    ],
    [
     {
      "id": "W-5",
      "number": null,
      "slug": "plateau-matrix-page",
      "model": "sonnet",
      "effort": "high",
      "verify": {
       "model": "sonnet",
       "effort": "medium"
      },
      "sensitive": false,
      "dir": null,
      "focus": "read in the editor where each element of a path of plateaus came from and went",
      "likely_paths": [
       "src/main/editor/**",
       "src/main/resources/editor-webapp/standalone.html",
       "src/test/javascript/**",
       "src/test/e2e/**",
       "scripts/editor-coverage-floor.json",
       "src/doc/README.adoc",
       "docs/architecture/**",
       "src/main/resources/editor-webapp/samples/**"
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
   "phase": "P3",
   "criteria": [
    "the folder src/test/resources/likec4 holds a JSON file, the MIT licence text and a provenance text that holds `github.com/likec4/likec4`, the version of the tool, the command run and a 40-hex commit SHA (the folder does not exist on the starting repository)",
    "with the application built, `import likec4 <that file> --output <an empty scratch folder>` exits 0 and prints a warning line for each dropped part present in the sample; `query graph -w <that folder>/.archicode.yaml` exits 0 and its number of elements plus the number of elements the report says were dropped equals `jq \".elements|length\"` of the sample",
    "the same command given a `.c4` file, given a non-empty folder, and given a sample with a kind that has no target and no `--map`, each exits 1 with one line starting `error:` (the last one lists the kinds to map) and no stack trace, and the same sample with `--map kind=kind` for each listed kind exits 0",
    "a test of src/test/java/io/morin/archicode/it runs the import on the packaged application, a test of the editor named in the document of the run W-4 loads the imported output, and `grep -c LikeC4 src/main/resources/META-INF/native-image/io.morin.archicode/archicode/reflect-config.json` prints at least 1 (0 on the starting repository)",
    "a node test reads src/test/resources/brightcart/matrix-cases.json and checks that the cells of the Reading view of the page Plateaus for the path baseline, inhouse, marketplace of the layered Brightcart are the cells of the file, Span included (11 moved, 2 split, 1 merged); an end-to-end spec named in the document of the run W-5 passes with `--project=chromium` and `--project=firefox`; the path is in the address and a reload keeps it",
    "`git diff --stat -- src/main/rust src/main/wasm src/test/resources/brightcart/matrix-cases.json src/test/resources/brightcart/expected` prints nothing for the whole wave, `ratchet.max` in src/main/editor/layers.json is at most 99, and no number of scripts/editor-coverage-floor.json is lower than on the starting repository",
    "`./mvnw test-compile pmd:check`, `./mvnw verify -DskipITs=false`, `scripts/byte-identity.sh` (exceptions file unchanged), `npm run test:unit`, `npm run test:coverage`, `npm run format:check` and `npm run lint` exit 0, `npm run editor:build` and `npm run sample:build` leave `git status --short` unchanged, and `./mvnw test -Dtest=CommandReferenceTest` exits 0 with the command `import likec4` in the generated listing of the manual"
   ],
   "runs": [
    "W-4",
    "W-5"
   ],
   "model": "sonnet",
   "effort": "medium"
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
const globRe = (g) => new RegExp('^' + g.replace(/[.+^${}()|\\]/g, '\\$&').replace(/\*\*/g, '\u0000').replace(/\*/g, '[^/]*').replace(/\u0000/g, '.*') + '$')
const inPaths = (file, paths) => paths.some((g) => globRe(g).test(file))

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

// run scope (PLAN.run_workflows): instead of one run-executor agent, a fresh leaf agent runs the generator for the run's design
// workflow, the wave script runs the generated file with workflow({scriptPath}) (one level), then the same for implement once a pln
// exists. The agent returns only the PATH of the file the generator wrote: no plan crosses a model hop (a 15-task plan is ~40 KB and a
// copy by a haiku agent failed its digest three times in a row, wave 005). A scriptPath is refused from a session whose working
// directory is elsewhere (workflow() reads a path only from the working directory or an added directory, issue #34); then the child is
// handed over BY NAME (PLAN.child_workflows) with the plan as args, copied by the agent and checked against its digest, up to three
// tries. Exit 3 of the generator means nothing to generate (all stages logged, no pln, all tasks done).
const runFlags = (r) => `--profile ${PLAN.cost_profile}${r.delegation === 'hard_judgment' ? ' --hard' : ''}${PLAN.commit_tasks ? ' --commit-tasks' : ''}${PLAN.autonomy_override ? " --autonomy-override '" + PLAN.autonomy_override.replaceAll("'", "'\\''") + "'" : ''}${PLAN.stand_in ? ' --stand-in' + (PLAN.stand_in_command ? ` --stand-in-command '${PLAN.stand_in_command}'` : '') : ''}`
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
      (r.created ? `4a. This run was just created by the workflow: confirm the directory exists and that the manifest ${WAVE} holds \`run: ${r.number}\` on this run's line; return manifest_run_ok.\n` : '') +
      `4. Read the run document's \`Files outside likely_paths:\` line (a list marker, emphasis or backticks may surround the key). Its value is \`none\` or the files the run says it changed outside its likely_paths (${r.likely_paths.join(', ')}), comma-separated. ` +
      `Return those files in outside_likely_paths (an empty list for \`none\`) and outside_stated true. If the document has no such line, or the key has no value, return an empty list and outside_stated false: not stated is not none. ` +
      `Do not run git status and do not infer the list from the tree; the line is the run's own statement and the orchestrator compares it with the tree.\n` +
      `Edit nothing.`)

const COMMIT_RUN_SCHEMA = {
  type: 'object',
  properties: { run: { type: 'string' }, committed: { type: 'boolean' }, nothing: { type: 'boolean' }, commit: { type: 'string' }, files: { type: 'array', items: { type: 'string' } },
    manual: { type: 'array', items: { type: 'object', properties: { file: { type: 'string' }, also_claimed_by: { type: 'string' } }, required: ['file', 'also_claimed_by'] } }, exit: { type: 'integer' }, message: { type: 'string' } },
  required: ['run', 'exit'],
}
// only with PLAN.commit_runs (commit: per-run): the script decides the files and the refusals, this agent runs one command and reports it
const commitRunBrief = (r) => ROOT +
  `Run this command from the repository root and return what it printed as JSON: \`python3 "${PLAN.generator_script}" commit-run ${PLAN.wave_dir} --run ${r.id} --apply --json\`. ` +
  `Return run ${r.id}, exit (the command's exit code), committed, nothing, commit, files and manual exactly as printed; if the exit code is not 0 put the command's error output in message. ` +
  `Do not run any other git command and do not edit anything.`

const createBrief = (rs) => ROOT +
  `Create the missing run directories of wave ${PLAN.wave}, following manage-runs "Starting a new run" and complete-wave 'Create missing runs', one run at a time, in this order:\n` +
  rs.map((r) => `- ${r.id}: slug ${r.slug}, profile ${r.doc_profile}`).join('\n') + '\n' +
  `For each: number = highest NNNN across every docs/run/run-*/ and every docs/wav/*/run/run-*/ directory, plus 1; create ${PLAN.run_dir}/run-NNNN-<slug> with mkdir (never mkdir -p); ` +
  `write its status file run-NNNN-<slug>.md first (frontmatter type: run, run: NNNN, status: proposed, profile: <the profile listed for that run>, wave: ${PLAN.wave}; a heading and one line naming the wave and the manifest id); ` +
  `then write NNNN into the \`run:\` field of that run in the manifest of ${WAVE}. Write nothing else in that manifest. Return every created run (id, number, dir).${STAND_IN_NOTE}`

const gateBrief = (g) => ROOT +
  `Verify the gate of phase ${g.phase} of wave ${PLAN.wave} against real evidence, per complete-wave 'Verify the gate'. Plan: ${WAVE}. You did not execute the runs.\n` +
  `For each criterion run the command, read the file or inspect the artifact, and say in evidence what you actually did; a criterion you cannot check mechanically is verified by inspection and the evidence says so. ` +
  `held is true only if the criterion holds as written. Return exactly one entry per criterion in criteria, each carrying the number of its criterion in index (1 to ${g.criteria.length}); the canonical discharge goes only in canonical_discharge, never as a further entry. ` +
  `When a command fails, rerun an unchanged existing check of the same project as a baseline and say in evidence the result per project and the baseline; set cause to "environment" when the baseline fails the same way or the set of failing tests changes between reruns, "criterion" when the criterion itself does not hold, and baseline to the check you ran. ` +
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
    const logged = await ag(entryPrompt('result', `verification-only result for ${step.runs.map((r) => r.id).join('+')} (completed before a cut, no verification entry in this log): ` + JSON.stringify(step.runs.map((r, i) => ({ id: r.id, verified: checked[i] })))),
      opt('bookkeeping', { label: `prg-verify-${step.phase}` }))
    if (!logged) return await stop('verification entry not written to the prg', step.phase)
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
  const names = step.lanes.map((l) => l.map((r) => r.id).join('+')).join(' then ')
  const tiers = step.lanes.flat().map((r) => `${r.id} ${r.delegation} (${r.model}, effort ${r.effort})`).join('; ')
  const widths = step.lanes.map((l) => l.length).join(', ')
  const safe = Object.keys(PLAN.safe_reasons || {}).map((k) => `${k}: ${PLAN.safe_reasons[k]}`).join('; ')
  const entered = await ag(entryPrompt('dispatch', `batch ${step.n} (phase ${step.phase}) = ${names}; cost profile ${PLAN.cost_profile}; overrides of declared tiers: ${(PLAN.overrides || []).length ? PLAN.overrides.join(' | ') : 'none'}; autonomy override: ${PLAN.autonomy_override ? PLAN.autonomy_override : 'none'}; tiers: ${tiers}; concurrency per lane: ${widths}; lanes run one after another, runs inside a lane in parallel, lanes split on declared likely_paths overlap${safe ? '; concurrent-safe verdicts: ' + safe : ''}; one leaf agent per run (${PLAN.stand_in ? 'stand-in' : 'run-management:run-executor'}); written before dispatch by the generated workflow.`),
    opt('bookkeeping', { label: `prg-dispatch-${step.n}` }))
  if (!entered) return await stop('dispatch entry not written; nothing was dispatched', step.n)
  for (const lane of step.lanes) {
    const missing = lane.filter((r) => !r.number)
    if (missing.length) {
      const c = await ag(createBrief(missing), opt('create', { label: `create-${step.n}-${missing.map((r) => r.id).join('+')}`, schema: CREATE_SCHEMA }))
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
      ? ag(standInBrief(r), { label: `run-${r.id}`, schema: RUN_SCHEMA, model: 'haiku', effort: 'low' })
      : ag(runBrief(r), { label: `run-${r.id}`, schema: RUN_SCHEMA, agentType: 'run-management:run-executor', model: r.model, effort: r.effort })))
    const checked = await parallel(lane.map((r, i) => () => ag(verifyBrief(r), PLAN.stand_in
      ? { label: `verify-${r.id}`, schema: VERIFY_SCHEMA, model: 'haiku', effort: 'low' }
      : { label: `verify-${r.id}`, schema: VERIFY_SCHEMA, model: r.verify.model, effort: r.verify.effort })))
    // a child implement workflow that stopped for a human gate: the wave stops with the same state, nothing is verified as done
    const waitingOperator = lane.map((r, i) => ran[i] && ran[i].awaiting === 'operator' ? { run: r.id, number: ran[i].run, stage: ran[i].stage, tasks: ran[i].tasks } : null).filter(Boolean)
    if (waitingOperator.length) {
      await ag(entryPrompt('awaiting', `wave workflow stopped, state awaiting-operator: ` + JSON.stringify(waitingOperator) + `. A task agent did not start its task and wrote nothing; the tasks are still pending. Read the reasons in the run's prg, fix the cause (often: launch right after a neutral message), then regenerate.`),
        opt('bookkeeping', { label: `prg-awaiting-operator-${step.n}` }))
      return { state: 'awaiting-operator', waiting: waitingOperator, results, findings }
    }
    const waitingCommit = lane.map((r, i) => ran[i] && ran[i].awaiting === 'commit' ? { run: r.id, number: ran[i].run, stage: ran[i].stage, tasks: ran[i].tasks } : null).filter(Boolean)
    if (waitingCommit.length) {
      await ag(entryPrompt('awaiting', `wave workflow stopped, state awaiting-commit: ` + JSON.stringify(waitingCommit) + `. The tasks' work is on disk and a check needs a commit this workflow never makes. Commit the run's files by path, then regenerate: the tasks are still pending and the next generation resumes them.`),
        opt('bookkeeping', { label: `prg-awaiting-commit-${step.n}` }))
      return { state: 'awaiting-commit', waiting: waitingCommit, results, findings }
    }
    const waiting = lane.map((r, i) => ran[i] && ran[i].awaiting ? { run: r.id, number: ran[i].run, stage: ran[i].stage, tasks: ran[i].tasks } : null).filter(Boolean)
    if (waiting.length) {
      await ag(entryPrompt('awaiting', `wave workflow stopped, state awaiting-human: ` + JSON.stringify(waiting) + `. The run's own prg names the tasks and how to lift the gate (--autonomy-override with a reason, or provide the validation); regenerate after the decision.`),
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
    // commit: per-run: a run verified completed is committed by path, one after the other (one git index), before its result is logged
    const commitRuns = []
    if (PLAN.commit_runs) {
      for (let i = 0; i < lane.length; i++) {
        if (bad.some((b) => b.startsWith(lane[i].id + ':'))) continue
        const c = await ag(commitRunBrief(lane[i]), opt('bookkeeping', { label: `commit-run-${lane[i].id}`, schema: COMMIT_RUN_SCHEMA }))
        commitRuns.push({ id: lane[i].id, ...(c || { exit: -1, message: 'the commit agent returned nothing' }) })
      }
    }
    await ag(entryPrompt('result', `batch ${step.n} result for ${lane.map((r) => r.id).join('+')}: ` + JSON.stringify(lane.map((r, i) => ({ id: r.id, reported: ran[i] && ran[i].status, verified: checked[i] }))) + `; batch against itself: ${collision}` + (PLAN.commit_runs ? `; run commits: ${JSON.stringify(commitRuns)}` : '')),
      opt('bookkeeping', { label: `prg-result-${step.n}-${lane.map((r) => r.id).join('+')}` }))
    if (bad.length) return await stop('run not verified completed', bad)
    const uncommitted = commitRuns.filter((c) => c.exit !== 0 || (c.manual && c.manual.length) || (!c.committed && !c.nothing))
    if (uncommitted.length) {
      findings.push({ batch: step.n, run_commit: uncommitted })
      await ag(entryPrompt('awaiting', `wave workflow stopped, state awaiting-commit: ` + JSON.stringify(uncommitted) + `. These runs are completed and verified, but their files could not be committed by path (a file shared with an uncommitted run, or a git error). Commit them by hand (python3 "${PLAN.generator_script}" commit-run ${PLAN.wave_dir} prints the commands; git add -p splits a shared file), then regenerate: the runs are not executed again.`),
        opt('bookkeeping', { label: `prg-awaiting-commit-${step.n}` }))
      return { state: 'awaiting-commit', waiting: uncommitted, results, findings }
    }
  }
}
return PLAN.blocked.length
  ? await stop('remaining runs blocked', PLAN.blocked)
  : { state: 'done', ready_to_close: true, note: 'close-out (complete-wave, Close out) is done by the launching session', results, findings }
