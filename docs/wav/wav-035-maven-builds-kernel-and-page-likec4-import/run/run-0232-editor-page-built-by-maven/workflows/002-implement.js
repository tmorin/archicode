export const meta = { name: "run-0232-implement", description: "Generated from the run directory: pending tasks of the pln only; cost profile low-cost" }
// engine-shape: 2
// cost profile: low-cost
// overrides of declared tiers and profile ceilings (4):
//   - settings from .claude/run-management.yaml: repos=main:when-needed
//   - stage-11 and final-check: the run holds a sensitive task, both take the elevated pair sonnet/high
//   - task-005 declared hard_judgment: verifier raised to sonnet/high (risk high); executor kept at sonnet/high; no human gate
//   - task-007 declared hard_judgment: verifier raised to sonnet/high (risk high); executor kept at sonnet/high; no human gate
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
   "effort": "high",
   "class": "K2"
  },
  "gate": {
   "model": "sonnet",
   "effort": "medium",
   "class": "K2"
  }
 },
 "overrides": [
  "settings from .claude/run-management.yaml: repos=main:when-needed",
  "stage-11 and final-check: the run holds a sensitive task, both take the elevated pair sonnet/high",
  "task-005 declared hard_judgment: verifier raised to sonnet/high (risk high); executor kept at sonnet/high; no human gate",
  "task-007 declared hard_judgment: verifier raised to sonnet/high (risk high); executor kept at sonnet/high; no human gate"
 ],
 "sensitivity": [
  {
   "task": "task-005",
   "declared_tier": "hard_judgment",
   "risk": "high",
   "human_review": "after",
   "autonomy": "review_after",
   "verifier": true,
   "gate": false,
   "reasons": [
    "risk high"
   ]
  },
  {
   "task": "task-007",
   "declared_tier": "hard_judgment",
   "risk": "high",
   "human_review": "after",
   "autonomy": "review_after",
   "verifier": true,
   "gate": false,
   "reasons": [
    "risk high"
   ]
  }
 ],
 "run_sensitive": true,
 "gated": [],
 "autonomy_override": "",
 "kind": "implement",
 "stage11": {
  "model": "sonnet",
  "effort": "high",
  "class": "K5"
 },
 "run": "0232",
 "slug": "editor-page-built-by-maven",
 "wave": "035",
 "wave_dir": "docs/wav/wav-035-maven-builds-kernel-and-page-likec4-import",
 "run_id": "W-2",
 "profile": "TDD+pln",
 "run_dir": "docs/wav/wav-035-maven-builds-kernel-and-page-likec4-import/run/run-0232-editor-page-built-by-maven",
 "status_file": "docs/wav/wav-035-maven-builds-kernel-and-page-likec4-import/run/run-0232-editor-page-built-by-maven/run-0232-editor-page-built-by-maven.md",
 "pln_file": "docs/wav/wav-035-maven-builds-kernel-and-page-likec4-import/run/run-0232-editor-page-built-by-maven/pln-0232-editor-page-built-by-maven.md",
 "prg_file": "docs/wav/wav-035-maven-builds-kernel-and-page-likec4-import/run/run-0232-editor-page-built-by-maven/prg-0232-editor-page-built-by-maven.md",
 "skill_file": "/home/tibo/git-perso/claude-agents/plugins/run-management/skills/complete-run/SKILL.md",
 "check_script": "/home/tibo/git-perso/claude-agents/plugins/run-management/skills/complete-run/scripts/check_run.py",
 "hard": true,
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
  "task-010"
 ],
 "levels": [
  [
   [
    {
     "id": "task-001",
     "title": "build-editor.mjs writes target/editor-webapp, assembles without assets for the structural modes, and --check means \"the sources assemble\"; its three test files",
     "objective": "Move the output of scripts/build-editor.mjs to target/editor-webapp as DEC-1 and DEC-4 say, and redefine its modes: PAGE_PATH and ASSETS_DIR under target/editor-webapp (both under --root); assemble(root, { strict }) with strict only in the write mode after the assets are written, the placeholder hash 00000000 for a missing asset otherwise; --check writes nothing and fails only when the sources do not assemble (drop the \"is generated\" sentences and staleAssets); --check-identical <rev> and the analysis modes work on a worktree where nothing is built, and --check-identical always compares the non-strict assembly of src/main/editor taken from the revision with git archive with the non-strict assembly of the tree (resolution F2: no branch that reads a page from the revision, so \"both paths are kept\" of DEC-5 is not carried out). Write the tests first, red (the new --check, the non-strict assembly of a tree with no build, the revision with no page, the byte comparison with the tag archicode-0.25.0), then turn them green. Run the build and compare the five files with commit 7742b07.",
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
      "the built standalone.html, codemirror.js, elk.js, viewpoint_kernel.js and THIRD-PARTY-NOTICES.txt under target/editor-webapp are byte-identical to the files of commit 7742b07",
      "the script writes nothing under src/main/resources/editor-webapp; --check and --check-identical HEAD exit 0 and need neither the kernel nor the built assets",
      "--check-identical <rev> works on a revision that holds no page (it reads src/main/editor of the revision) and an unknown revision is one error line",
      "the tests of the three files pass; the byte comparison with the tag archicode-0.25.0 is skipped with its reason when the tag is absent, never silently passed"
     ],
     "verification": [
      "node --test src/test/javascript/editor-build/build-editor.test.js src/test/javascript/editor-build/editor-assets.test.js src/test/javascript/editor-build/yaml-parts.test.js",
      "bash -c 'set -e; test -f target/kernel/viewpoint_kernel.wasm || npm run kernel:build; node scripts/build-editor.mjs'",
      "bash -c 'set -e; for f in standalone.html assets/codemirror.js assets/elk.js assets/viewpoint_kernel.js assets/THIRD-PARTY-NOTICES.txt; do git show 7742b07:src/main/resources/editor-webapp/$f | cmp - target/editor-webapp/$f; done'",
      "node scripts/build-editor.mjs --check",
      "node scripts/build-editor.mjs --check-identical HEAD",
      "test -z \"$(find src/main/resources/editor-webapp -type f -newer scripts/build-editor.mjs)\"",
      "! grep -nE \"is generated|staleAssets\" scripts/build-editor.mjs",
      "npx prettier --check scripts/build-editor.mjs src/test/javascript/editor-build/build-editor.test.js src/test/javascript/editor-build/editor-assets.test.js src/test/javascript/editor-build/yaml-parts.test.js",
      "npx eslint --max-warnings 0 scripts/build-editor.mjs src/test/javascript/editor-build/build-editor.test.js src/test/javascript/editor-build/editor-assets.test.js src/test/javascript/editor-build/yaml-parts.test.js"
     ],
     "likely_files": [
      "scripts/build-editor.mjs",
      "src/test/javascript/editor-build/build-editor.test.js",
      "src/test/javascript/editor-build/editor-assets.test.js",
      "src/test/javascript/editor-build/yaml-parts.test.js"
     ],
     "tdd_excerpts": [
      "REQ-1, REQ-3, REQ-7, TG-1, TG-2, TG-5, ASM-1, CON-1, CON-2, CON-8, DEC-1, DEC-4, DEC-5, CTR-1, CTR-2, IMP-3, RISK-6, resolutions F2 and F10 of the preamble of this plan (the TDD file of this run)"
     ],
     "prd_excerpts": [
      "none: there is no PRD (profile TDD+pln); the REQ-n of the TDD are listed with the TDD items"
     ],
     "escalation_triggers": [
      "the built page or a script differs from the file of 7742b07 (ASM-1 is false, or a part or a bundle moved): stop and log it, never touch src/main/editor to make the comparison pass",
      "node_modules or target/kernel is missing and the network is not reachable to restore them: record an environment gap for the cmp lines, never a pass, and run the other checks",
      "a mode that must stay source-only (--where, --map, --check-identical) cannot run without an asset on disk even non-strict: stop and log it (DEC-4)"
     ],
     "depends_on": []
    }
   ]
  ],
  [
   [
    {
     "id": "task-002",
     "title": "The samples and the node harness read the folder: build-sample.mjs, the helper editor-files.js with its test, harness.js, and the npm scripts that build the whole folder",
     "objective": "Make the samples and the node harness read target/editor-webapp as DEC-4d, DEC-6 and DEC-8 say. Write editor-files.test.js first (red), then add the helper editor-files.js (PAGE, ASSETS_DIR, SAMPLES_DIR, readPage(root) with the one-line advice). Point build-sample.mjs (sample paths, PAGE, --root) and harness.js (HTML, KERNEL) at the folder, drop the --check mode of build-sample.mjs and its test cases, and rewrite package.json: editor:build builds the kernel, the bundles, the page and the samples; the three pre hooks run editor:build; editor:check no longer builds the kernel (resolution F7); sample:check is removed. Run npm run editor:build and compare the samples: brightcart.yaml with commit 7742b07, archicode.yaml with the file of the working tree (run 0231 retagged two lines of the model; nothing else differs until task-008 changes the model).",
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
      "target/editor-webapp/samples/brightcart.yaml is byte-identical to the file of 7742b07 and archicode.yaml to the file of the working tree",
      "readPage on a root with no build throws exactly one line with the path and npm run editor:build; harness.js takes the page and the kernel script from the helper",
      "npm run editor:build builds the whole folder and twice in a row leaves git status unchanged; package.json has the four script changes of the objective and no other"
     ],
     "verification": [
      "node --test src/test/javascript/viewpoint-kernel/editor-files.test.js src/test/javascript/viewpoint-kernel/build-sample-script.test.js src/test/javascript/viewpoint-kernel/load-kernel.test.js",
      "npm run editor:build",
      "git show 7742b07:src/main/resources/editor-webapp/samples/brightcart.yaml | cmp - target/editor-webapp/samples/brightcart.yaml",
      "cmp src/main/resources/editor-webapp/samples/archicode.yaml target/editor-webapp/samples/archicode.yaml",
      "grep -qF \"\\\"editor:build\\\": \\\"npm run kernel:build && node scripts/build-editor.mjs && node scripts/build-sample.mjs\\\"\" package.json",
      "grep -qF \"\\\"editor:check\\\": \\\"node scripts/build-editor.mjs --check && node scripts/check-editor.mjs --layers\\\"\" package.json",
      "test \"$(grep -c \"\\\"npm run editor:build\\\"\" package.json)\" -eq 3",
      "! grep -n \"sample:check\" package.json",
      "bash -c 'set -e; npm run editor:build >/dev/null; a=$(git status --short | md5sum); npm run editor:build >/dev/null; test \"$a\" = \"$(git status --short | md5sum)\"'",
      "npx prettier --check scripts/build-sample.mjs src/test/javascript/viewpoint-kernel/editor-files.js src/test/javascript/viewpoint-kernel/editor-files.test.js src/test/javascript/viewpoint-kernel/harness.js src/test/javascript/viewpoint-kernel/build-sample-script.test.js",
      "npx eslint --max-warnings 0 scripts/build-sample.mjs src/test/javascript/viewpoint-kernel/editor-files.js src/test/javascript/viewpoint-kernel/editor-files.test.js src/test/javascript/viewpoint-kernel/harness.js src/test/javascript/viewpoint-kernel/build-sample-script.test.js"
     ],
     "likely_files": [
      "scripts/build-sample.mjs",
      "package.json",
      "src/test/javascript/viewpoint-kernel/editor-files.js",
      "src/test/javascript/viewpoint-kernel/editor-files.test.js",
      "src/test/javascript/viewpoint-kernel/harness.js",
      "src/test/javascript/viewpoint-kernel/build-sample-script.test.js"
     ],
     "tdd_excerpts": [
      "REQ-4, REQ-7, TG-4, TG-5, ASM-2, CON-8, DEC-4, DEC-6, DEC-8, CTR-2, IF-2, IF-4, FLOW-2, IMP-4, IMP-8, IMP-9, resolution F7 of the preamble of this plan (the TDD file of this run)"
     ],
     "prd_excerpts": [
      "none: there is no PRD (profile TDD+pln); the REQ-n of the TDD are listed with the TDD items"
     ],
     "escalation_triggers": [
      "build-sample.mjs fails on the page of task-001 (a part of the page differs in a way the harness feels): stop and log it, never edit src/main/editor",
      "the sample archicode.yaml differs from the working-tree file by more than the run 0231 retag: stop and log the lines, do not rewrite the model here (task-008 owns it)",
      "a script of package.json outside the list would have to change, or package-lock.json would change: stop and log it"
     ],
     "depends_on": [
      "task-001"
     ]
    },
    {
     "id": "task-003",
     "title": "The checks of the sources read the sources: check-editor.mjs, the move check, the coverage script, the lint extraction and their tests",
     "objective": "Make the checks that work on the sources read the sources, as DEC-5 and FLOW-4 say with resolution F2: check-editor.mjs --statements <rev> reads src/main/editor of <rev> (git archive), assembles it non-strict with the function of task-001 and takes the statements of that page; drop PAGE_PATH and the git show of a page; keep the usage and the output of every mode and of check-editor-moves.sh. Move HTML of editor-coverage.mjs and the default html of extract-editor-script.mjs to target/editor-webapp/standalone.html. Rewrite the four test files so that their fixture repositories hold src/main/editor and no committed page, and the pinned sentence for an unreadable revision follows the new one. The coverage floor (scripts/editor-coverage-floor.json) and ratchet.max are not touched.",
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
      "a refactor: move commit and a non-move commit are told apart on repositories whose commits hold no page, and the output of check-editor-moves.sh is unchanged",
      "node scripts/check-editor.mjs --layers exits 0; editor-coverage.mjs and extract-editor-script.mjs read target/editor-webapp/standalone.html, and the extraction writes target/eslint-editor/page.js",
      "no script of the list names src/main/resources/editor-webapp, and scripts/editor-coverage-floor.json and src/main/editor/layers.json are untouched"
     ],
     "verification": [
      "node --test src/test/javascript/editor-build/check-editor.test.js src/test/javascript/editor-build/check-editor-statements.test.js src/test/javascript/editor-build/check-editor-layers.test.js src/test/javascript/editor-build/check-editor-moves.test.js",
      "node scripts/check-editor.mjs --layers",
      "bash -c 'set -e; npm run editor:build >/dev/null; node scripts/extract-editor-script.mjs; test -s target/eslint-editor/page.js'",
      "! grep -n \"src/main/resources/editor-webapp\" scripts/check-editor.mjs scripts/check-editor-moves.sh scripts/editor-coverage.mjs scripts/extract-editor-script.mjs",
      "grep -q \"target/editor-webapp\" scripts/editor-coverage.mjs && grep -q \"target/editor-webapp\" scripts/extract-editor-script.mjs",
      "node --check scripts/editor-coverage.mjs",
      "bash -n scripts/check-editor-moves.sh",
      "npx prettier --check scripts/check-editor.mjs scripts/editor-coverage.mjs scripts/extract-editor-script.mjs src/test/javascript/editor-build/check-editor.test.js src/test/javascript/editor-build/check-editor-statements.test.js src/test/javascript/editor-build/check-editor-layers.test.js src/test/javascript/editor-build/check-editor-moves.test.js",
      "npx eslint --max-warnings 0 scripts/check-editor.mjs scripts/editor-coverage.mjs scripts/extract-editor-script.mjs src/test/javascript/editor-build/check-editor.test.js src/test/javascript/editor-build/check-editor-statements.test.js src/test/javascript/editor-build/check-editor-layers.test.js src/test/javascript/editor-build/check-editor-moves.test.js"
     ],
     "likely_files": [
      "scripts/check-editor.mjs",
      "scripts/check-editor-moves.sh",
      "scripts/editor-coverage.mjs",
      "scripts/extract-editor-script.mjs",
      "src/test/javascript/editor-build/check-editor.test.js",
      "src/test/javascript/editor-build/check-editor-statements.test.js",
      "src/test/javascript/editor-build/check-editor-layers.test.js",
      "src/test/javascript/editor-build/check-editor-moves.test.js"
     ],
     "tdd_excerpts": [
      "REQ-7, TG-5, CON-5, CON-8, DEC-4, DEC-5, CTR-2, IF-5, FLOW-4, IMP-5, IMP-6, resolutions F2 and F10 of the preamble of this plan (the TDD file of this run)"
     ],
     "prd_excerpts": [
      "none: there is no PRD (profile TDD+pln); the REQ-n of the TDD are listed with the TDD items"
     ],
     "escalation_triggers": [
      "the statements of a revision cannot be taken from its sources without a built asset (the extraction needs a real hash): stop and log it (DEC-4b)",
      "check-editor-moves.sh must change its usage or its output to work: stop and log it (IF-5)",
      "the coverage floor or ratchet.max would have to move: stop and log it (CON-5)"
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
     "title": "The node readers use the helper: the files of src/test/javascript that name editor-webapp read the folder through editor-files.js, and plateau-matrix-page.test.js reads the tag archicode-0.25.0",
     "objective": "Replace, in the node tests that name src/main/resources/editor-webapp (the list of the outputs), the path each builds for itself by the constants and readPage of src/test/javascript/viewpoint-kernel/editor-files.js, a mechanical change (a codemod run by a script of your own in the scratchpad is fine, then read the diff of every file with an unusual shape: conformance.test.js, site.test.js, remote-import.test.js, the sample and bundle tests). Keep the git show <tag>:src/main/resources/editor-webapp/standalone.html strings of the four tests of older tags, and make plateau-matrix-page.test.js read the tag archicode-0.25.0 (DEC-5; the page of that tag equals that of 7742b07) with a skip and a message when the tag is absent. Do not touch the files of task-001 to task-003 (the editor-build tests of the build and the checks), nor changes-map.test.js (task-007).",
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
      "the only files of src/test/javascript that still name main/resources/editor-webapp are the five tests that read git show <tag>: and the check-editor tests of task-003 (a fixed commit)",
      "the tests of the verification list pass on the freshly built folder, so a reader that built its own path is not left behind",
      "a test run with no build prints the one line of the helper, not a stack trace of readFileSync"
     ],
     "verification": [
      "npm run editor:build",
      "test -z \"$(grep -rl \"main/resources/editor-webapp\" src/test/javascript | grep -vE \"(story-player-scene|save-keeps-the-brackets|save-keeps-quotes-and-comments|delete-plateau-as-released|plateau-matrix-page|check-editor[a-z-]*)[.]test[.]js$\")\"",
      "node --test src/test/javascript/viewpoint-kernel/conformance.test.js src/test/javascript/viewpoint-kernel/plateau-matrix-page.test.js src/test/javascript/viewpoint-kernel/story-player-scene.test.js src/test/javascript/viewpoint-kernel/save-keeps-the-brackets.test.js src/test/javascript/viewpoint-kernel/save-keeps-quotes-and-comments.test.js src/test/javascript/viewpoint-kernel/delete-plateau-as-released.test.js",
      "node --test src/test/javascript/site.test.js src/test/javascript/editor-build/remote-import.test.js src/test/javascript/viewpoint-kernel/sample-brightcart.test.js src/test/javascript/viewpoint-kernel/sample-archicode.test.js src/test/javascript/viewpoint-kernel/sample-landing.test.js src/test/javascript/viewpoint-kernel/bundle-flows.test.js",
      "npx prettier --check \"src/test/javascript/viewpoint-kernel/*.js\" src/test/javascript/map-highlight-diagram.test.js src/test/javascript/site.test.js src/test/javascript/editor-build/remote-import.test.js",
      "npx eslint --max-warnings 0 \"src/test/javascript/viewpoint-kernel/*.js\" src/test/javascript/map-highlight-diagram.test.js src/test/javascript/site.test.js src/test/javascript/editor-build/remote-import.test.js"
     ],
     "likely_files": [
      "src/test/javascript/viewpoint-kernel/*.test.js",
      "src/test/javascript/map-highlight-diagram.test.js",
      "src/test/javascript/site.test.js",
      "src/test/javascript/editor-build/remote-import.test.js"
     ],
     "tdd_excerpts": [
      "REQ-4, REQ-7, TG-4, CON-2, DEC-5, DEC-6, IMP-9, RISK-4, RISK-6, resolution F10 of the preamble of this plan (the TDD file of this run)"
     ],
     "prd_excerpts": [
      "none: there is no PRD (profile TDD+pln); the REQ-n of the TDD are listed with the TDD items"
     ],
     "escalation_triggers": [
      "a test builds a tree of its own with the old layout (copies the committed page or assets) and cannot read the helper without changing what it proves: stop and log the file, do not weaken the test",
      "the tag archicode-0.25.0 is absent from the clone or its page differs from that of 7742b07: record an environment gap for plateau-matrix-page.test.js, never a pass",
      "more than ten files need a hand edit beyond the path: stop and log the list (RISK-6)"
     ],
     "depends_on": [
      "task-002",
      "task-003"
     ]
    }
   ]
  ],
  [
   [
    {
     "id": "task-005",
     "title": "The pom: a second antrun execution builds the page and the samples at generate-resources, the jar and the classes take target/editor-webapp, and .gitignore names the old folder",
     "objective": "Edit pom.xml by anchor after a re-read (the working tree holds the antrun block of run 0231, uncommitted) as DEC-1, DEC-2 and DEC-3 say, with resolution F9: add the execution page at generate-resources to the same maven-antrun-plugin 3.2.0 block, its target re-declaring <property environment=\"env\"/>, failing with one line that names Node.js when node or npm is not on ${env.PATH}, then running npm ci --no-audit --no-fund, node scripts/build-editor.mjs and node scripts/build-sample.mjs from ${project.basedir}, unconditionally (Ant exec has no unless, DEC-3). Widen the exclusion of the first resource to editor-webapp/** and add the resource target/editor-webapp with targetPath editor-webapp. Add /src/main/resources/editor-webapp/ to .gitignore. Do not git rm anything (task-008). Build the jar with JDK 25 and check the contents against the folder and against 7742b07; check the failure without node with a PATH of symlinks to the tools the Maven wrapper needs and no node (run only the execution: ./mvnw -o antrun:run@page; add a tool to the list when the wrapper reports it missing, never node or npm); report the time of a clean-folder build.",
     "tier": "hard_judgment",
     "model": "sonnet",
     "effort": "high",
     "agent_type": "general-purpose",
     "verify": {
      "model": "sonnet",
      "effort": "high"
     },
     "retry": {
      "model": "sonnet",
      "effort": "high"
     },
     "sensitivity": {
      "verifier": true,
      "gate": false,
      "reasons": [
       "risk high"
      ]
     },
     "gate": false,
     "risk": "high",
     "human_review": "after",
     "acceptance_criteria": [
      "the jar holds editor-webapp/standalone.html, assets/codemirror.js, assets/elk.js, assets/viewpoint_kernel.js, assets/THIRD-PARTY-NOTICES.txt, samples/brightcart.yaml and samples/archicode.yaml with the bytes of target/editor-webapp (not those of a stale file under src), and the .wasm of target/kernel",
      "the built page and scripts are byte-identical to the files of 7742b07 (REQ-3), and samples/brightcart.yaml too",
      "without node on the PATH the execution fails with exactly one [ERROR] line holding the sentence that names Node.js and no at org. line; the record says what the count printed if it is not 1 and keeps the intent",
      "the kernel execution, Chicory, Quarkus, Failsafe, JaCoCo and the native profile are untouched; .gitignore ignores the old folder"
     ],
     "verification": [
      "JAVA_HOME=$HOME/.sdkman/candidates/java/25.0.4-tem ./mvnw --batch-mode -q package -Dmaven.test.skip -Dplugin.asciidoctor.skip=true",
      "bash -c 'set -e; for f in standalone.html assets/codemirror.js assets/elk.js assets/viewpoint_kernel.js assets/THIRD-PARTY-NOTICES.txt samples/brightcart.yaml samples/archicode.yaml; do unzip -p target/quarkus-app/app/archicode-*.jar editor-webapp/$f | cmp - target/editor-webapp/$f; done; unzip -p target/quarkus-app/app/archicode-*.jar editor-webapp/assets/viewpoint_kernel.wasm | cmp - target/kernel/viewpoint_kernel.wasm'",
      "test \"$(unzip -l target/quarkus-app/app/archicode-*.jar | grep -cE \"editor-webapp/(standalone.html|assets/(codemirror|elk|viewpoint_kernel).js|samples/(brightcart|archicode).yaml)\")\" -eq 6",
      "bash -c 'set -e; for f in standalone.html assets/codemirror.js assets/elk.js assets/viewpoint_kernel.js assets/THIRD-PARTY-NOTICES.txt samples/brightcart.yaml; do git show 7742b07:src/main/resources/editor-webapp/$f | cmp - target/editor-webapp/$f; done'",
      "bash -c 'd=$(mktemp -d); for t in java bash sh env uname dirname basename cat tr sed grep head mkdir rm ls wc cut cmp mv cp mktemp date sleep awk; do p=$(command -v $t) && ln -s \"$p\" \"$d/$t\"; done; if JAVA_HOME=$HOME/.sdkman/candidates/java/25.0.4-tem PATH=\"$d\" ./mvnw --batch-mode -o antrun:run@page > \"$d/out.txt\" 2>&1; then exit 1; fi; test \"$(grep -c \"^.ERROR.*Node.js is not installed\" \"$d/out.txt\")\" -eq 1 && ! grep -q \"^[[:space:]]*at org[.]\" \"$d/out.txt\"'",
      "grep -q \"scripts/build-editor.mjs\" pom.xml && grep -q \"scripts/build-sample.mjs\" pom.xml && grep -qF \"<exclude>editor-webapp/**</exclude>\" pom.xml && grep -qF \"${project.build.directory}/editor-webapp\" pom.xml",
      "grep -qxF \"/src/main/resources/editor-webapp/\" .gitignore",
      "git check-ignore -q --no-index src/main/resources/editor-webapp/standalone.html",
      "test -z \"$(git diff -U0 -- pom.xml | grep -E \"^[-+]\" | grep -E \"chicory|quarkus-maven|failsafe|jacoco|<profile>\")\""
     ],
     "likely_files": [
      "pom.xml",
      ".gitignore"
     ],
     "tdd_excerpts": [
      "REQ-2, REQ-3, TG-1, TG-2, TG-3, ASM-1, ASM-3, ASM-4, CON-1, CON-3, CON-6, DEC-1, DEC-2, DEC-3, CTR-1, CTR-4, IF-1, FLOW-1, IMP-1, RISK-2, RISK-3, RISK-7, resolution F9 of the preamble of this plan (the TDD file of this run)"
     ],
     "prd_excerpts": [
      "none: there is no PRD (profile TDD+pln); the REQ-n of the TDD are listed with the TDD items"
     ],
     "escalation_triggers": [
      "the antrun failure without node is not one line without a stack trace: record the measured output, try the property and fail forms, stop and log it if none works (DEC-2)",
      "the jar copy of a file differs from target/editor-webapp, or the page differs from 7742b07: stop and log it, never copy a file by hand",
      "npm ci cannot run (no network and a cold cache): record an environment gap for every check that needs the build, never a pass",
      "an edit would drop a line of run 0231 in pom.xml, or a plugin outside the list would have to change: stop and log it (edit by anchors, diff before and after)"
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
     "title": "The Java and end-to-end readers use the folder: EditorFiles.java and the five Java test classes, the e2e harness, hosted.js and the offline spec",
     "objective": "Make the Java tests and the end-to-end suite read target/editor-webapp as DEC-6 says. Add the test helper EditorFiles.java (PAGE, ASSETS, SAMPLES as Path under target/editor-webapp, a failure message naming the path and npm run editor:build when a read finds nothing) and use it in the five Java classes that read a file; reword the assertion messages that say as committed. In src/test/e2e/harness.js point PAGE, SAMPLE and ASSETS at the folder and make ASSET_ROUTES throw the one line of advice when the folder is missing (a missing build must not become a 404 that the specs explain badly); hosted.js and editor-offline.spec.js follow. The Playwright specs are not run here (the end-to-end suite is a gate of the phase, never a task): list them, and run only the Java classes of the verification list.",
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
      "the five Java classes pass reading target/editor-webapp, and EditorServeIT compiles and compares the served assets with that folder",
      "no file of src/test/java or src/test/e2e names main/resources/editor-webapp; the Java helper passes PMD and the format check",
      "npx playwright test --list loads every spec with the new harness; with no build the harness throws one line instead of an empty route table"
     ],
     "verification": [
      "JAVA_HOME=$HOME/.sdkman/candidates/java/25.0.4-tem ./mvnw --batch-mode -q test -Dplugin.asciidoctor.skip=true -Dsurefire.failIfNoSpecifiedTests=false -Dtest=EditorHttpServerTest,GuideViewPropertiesTest,EditorReadSchemaTest,BrightcartSampleTest,NativeReflectionConfigTest",
      "JAVA_HOME=$HOME/.sdkman/candidates/java/25.0.4-tem ./mvnw --batch-mode -q test-compile pmd:check -Dplugin.asciidoctor.skip=true",
      "! grep -rn \"main/resources/editor-webapp\" src/test/java src/test/e2e",
      "grep -q \"target/editor-webapp\" src/test/e2e/harness.js && grep -q \"npm run editor:build\" src/test/e2e/harness.js",
      "npx playwright test --list --project=chromium",
      "npx prettier --check src/test/java/io/morin/archicode/EditorFiles.java src/test/java/io/morin/archicode/cli/EditorHttpServerTest.java src/test/java/io/morin/archicode/it/EditorServeIT.java src/test/java/io/morin/archicode/cli/GuideViewPropertiesTest.java src/test/java/io/morin/archicode/manifest/EditorReadSchemaTest.java src/test/java/io/morin/archicode/brightcart/BrightcartSampleTest.java src/test/e2e/harness.js src/test/e2e/hosted.js src/test/e2e/editor-offline.spec.js",
      "npx eslint --max-warnings 0 src/test/e2e"
     ],
     "likely_files": [
      "src/test/java/io/morin/archicode/EditorFiles.java",
      "src/test/java/io/morin/archicode/cli/EditorHttpServerTest.java",
      "src/test/java/io/morin/archicode/it/EditorServeIT.java",
      "src/test/java/io/morin/archicode/cli/GuideViewPropertiesTest.java",
      "src/test/java/io/morin/archicode/manifest/EditorReadSchemaTest.java",
      "src/test/java/io/morin/archicode/brightcart/BrightcartSampleTest.java",
      "src/test/e2e/harness.js",
      "src/test/e2e/hosted.js",
      "src/test/e2e/editor-offline.spec.js"
     ],
     "tdd_excerpts": [
      "REQ-4, REQ-7, TG-4, CON-2, CON-3, CON-6, DEC-6, IF-3, IF-4, IMP-10, IMP-11 (the TDD file of this run)"
     ],
     "prd_excerpts": [
      "none: there is no PRD (profile TDD+pln); the REQ-n of the TDD are listed with the TDD items"
     ],
     "escalation_triggers": [
      "a Java test reads the file through the classpath on purpose (the packaged jar) and must not move: leave it and log why",
      "a spec depends on the page being at the old path in a way the harness cannot hide: stop and log it (CON-2)",
      "PMD flags the helper in a way that needs a rule turned off: stop and log it, never add a NOPMD or a SuppressWarnings (CLAUDE.md)"
     ],
     "depends_on": [
      "task-005"
     ]
    },
    {
     "id": "task-007",
     "title": "CI: Node in every job that runs Maven, the website assembled from target/editor-webapp, the sample step gone from Page, and the job map",
     "objective": "Edit .github/workflows/ci-build.yaml by anchors after a re-read (the working tree holds run 0231 edits, uncommitted) and the job map, as DEC-7, CTR-3 and IMP-12 say with resolutions F3 and F4. The jobs of the file that run ./mvnw are Java (verify), E2E (package), Build (deploy twice, then the new process-resources step) and Native (verify -Dnative on three targets); list them in your result with the step that makes Node available in each. Add the \"Set up Node.js\" step (setup-node@v4, 22, npm cache) to Java, Build and Native before their first ./mvnw step, with no if on Build and no npm ci step (Maven runs it); add the process-resources step to Build before Assemble website with the same if; make Assemble website copy and cmp from target/editor-webapp/ and drop the six lines that name src/main/resources/editor-webapp; remove the sample step of Page and rename the editor step. In scripts/changes.mjs remove R-07a, widen R-05, R-16 and R-20 to Java, Page and E2E, and add the rule for harness.js and editor-files.js before R-18; update changes-map.test.js (write its changed rows first, red, then the rules). Do not start a workflow dispatch; the website step and the native targets other than ubuntu-24.04 are proved only by a tag run, which the prg lists as unproved.",
     "tier": "hard_judgment",
     "model": "sonnet",
     "effort": "high",
     "agent_type": "general-purpose",
     "verify": {
      "model": "sonnet",
      "effort": "high"
     },
     "retry": {
      "model": "sonnet",
      "effort": "high"
     },
     "sensitivity": {
      "verifier": true,
      "gate": false,
      "reasons": [
       "risk high"
      ]
     },
     "gate": false,
     "risk": "high",
     "human_review": "after",
     "acceptance_criteria": [
      "each of Java, E2E, Build and Native has a \"Set up Node.js\" step before its first ./mvnw step, Page has its own, and the step of Build has no if",
      "the range from Assemble website to Publish website names no src/main/resources/editor-webapp, copies from target/editor-webapp and still compares each file with cmp; the process-resources step has the same if as Assemble website and comes before it",
      "the sample step of Page is gone and the editor step is renamed; changes-map.test.js passes, R-07a is gone, and a path that falls to no rule still runs all four jobs"
     ],
     "verification": [
      "python3 -c \"import yaml; yaml.safe_load(open('.github/workflows/ci-build.yaml'))\"",
      "python3 -c \"import yaml; d=yaml.safe_load(open('.github/workflows/ci-build.yaml')); j=d['jobs']; n=lambda k: [s.get('name') for s in j[k]['steps']]; f=lambda k: [i for i,s in enumerate(j[k]['steps']) if './mvnw' in str(s.get('run',''))][0]; assert all('Set up Node.js' in n(k) and n(k).index('Set up Node.js') < f(k) for k in ['Java','E2E','Build','Native']); assert 'Set up Node.js' in n('Page'); assert 'if' not in [s for s in j['Build']['steps'] if s.get('name')=='Set up Node.js'][0]\"",
      "python3 -c \"import yaml; d=yaml.safe_load(open('.github/workflows/ci-build.yaml')); s=d['jobs']['Build']['steps']; a=[x for x in s if x.get('name')=='Assemble website'][0]; p=[x for x in s if 'process-resources' in str(x.get('run',''))][0]; assert p.get('if')==a.get('if') and s.index(p) < s.index(a)\"",
      "test \"$(sed -n \"/Assemble website/,/Publish website/p\" .github/workflows/ci-build.yaml | grep -c \"src/main/resources/editor-webapp\")\" -eq 0",
      "test \"$(sed -n \"/Assemble website/,/Publish website/p\" .github/workflows/ci-build.yaml | grep -c \"target/editor-webapp\")\" -ge 3",
      "test \"$(grep -c \"Check the samples are the bundles of their folders\" .github/workflows/ci-build.yaml)\" -eq 0",
      "test \"$(grep -c \"Check the editor page is the assembly of its parts\" .github/workflows/ci-build.yaml)\" -eq 0 && grep -q \"Check the editor sources assemble\" .github/workflows/ci-build.yaml",
      "! grep -n \"R-07a\" scripts/changes.mjs",
      "node --test src/test/javascript/changes-map.test.js",
      "node scripts/changes.mjs --list",
      "npx prettier --check scripts/changes.mjs src/test/javascript/changes-map.test.js",
      "npx eslint --max-warnings 0 scripts/changes.mjs src/test/javascript/changes-map.test.js"
     ],
     "likely_files": [
      ".github/workflows/ci-build.yaml",
      "scripts/changes.mjs",
      "src/test/javascript/changes-map.test.js"
     ],
     "tdd_excerpts": [
      "REQ-5, REQ-7, TG-6, ASM-4, ASM-5, DEC-7, CTR-3, FLOW-3, IMP-7, IMP-12, RISK-1, RISK-8, resolution F3 and F4 of the preamble of this plan (the TDD file of this run)"
     ],
     "prd_excerpts": [
      "none: there is no PRD (profile TDD+pln); the REQ-n of the TDD are listed with the TDD items"
     ],
     "escalation_triggers": [
      "the step Assemble website needs more than a change of the folder it reads (the stamp sed, the grep of the stamp or the publish step would have to change): stop and log it",
      "an edit would drop a line of another run in ci-build.yaml: edit by anchors, diff before and after",
      "changes-map.test.js audits a rule against a reader in a way this task cannot satisfy without widening a rule further: stop and log it (CTR-3)",
      "a job other than the four needs Node (the Kernel job runs the page build): stop and log it"
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
     "id": "task-008",
     "title": "The seven generated files leave git, .prettierignore loses the page, and the model of ArchiCode names the sources",
     "objective": "Do the removal of IMP-2 now that every reader and the pom read the folder (tasks 004 to 007): git rm -r -f the seven tracked files of src/main/resources/editor-webapp (the sample archicode.yaml has an uncommitted change from run 0231, hence -f; the build rewrites it), delete the folder from the working tree, edit .prettierignore, and apply DEC-10 to the model of ArchiCode (the two tags.path and the description), because ArchitectureDriftTest fails when a tags.path does not exist. Then prove nothing needs the old folder: rebuild twice with npm run editor:build and check that the folder never comes back, that git status is the same after each build, and that the five files and the brightcart sample still equal the bytes of 7742b07. Do not run npm run sample:build to write a sample into git (the sample is built, nothing is committed).",
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
      "git ls-files src/main/resources/editor-webapp prints nothing and git ls-files | grep -c viewpoint_kernel prints 0",
      "two builds in a row leave git status identical and never recreate src/main/resources/editor-webapp; the built bytes are still those of 7742b07",
      "ArchitectureDriftTest, ArchitectureImpactTest and the node architecture test pass; the questions Q03 and Q04 of impact-questions.json hold without a change"
     ],
     "verification": [
      "git rm -r -f -q --ignore-unmatch src/main/resources/editor-webapp && rm -rf src/main/resources/editor-webapp",
      "test -z \"$(git ls-files src/main/resources/editor-webapp)\" && test \"$(git ls-files | grep -c viewpoint_kernel)\" -eq 0",
      "bash -c 'set -e; npm run editor:build >/dev/null; test ! -e src/main/resources/editor-webapp; a=$(git status --short | md5sum); npm run editor:build >/dev/null; test \"$a\" = \"$(git status --short | md5sum)\"; test ! -e src/main/resources/editor-webapp'",
      "bash -c 'set -e; for f in standalone.html assets/codemirror.js assets/elk.js assets/viewpoint_kernel.js assets/THIRD-PARTY-NOTICES.txt samples/brightcart.yaml; do git show 7742b07:src/main/resources/editor-webapp/$f | cmp - target/editor-webapp/$f; done'",
      "! grep -n \"src/main/resources/editor-webapp\" .prettierignore",
      "grep -qF \"src/main/editor/page.html\" docs/architecture/manifests/archicode.yaml && ! grep -n \"src/main/resources/editor-webapp\" docs/architecture/manifests/archicode.yaml",
      "node --test src/test/javascript/architecture-model.test.js src/test/javascript/site.test.js src/test/javascript/editor-build/remote-import.test.js src/test/javascript/viewpoint-kernel/sample-archicode.test.js",
      "JAVA_HOME=$HOME/.sdkman/candidates/java/25.0.4-tem ./mvnw --batch-mode -q test -Dplugin.asciidoctor.skip=true -Dsurefire.failIfNoSpecifiedTests=false -Dtest=ArchitectureDriftTest,ArchitectureImpactTest"
     ],
     "likely_files": [
      "src/main/resources/editor-webapp",
      ".prettierignore",
      "docs/architecture/manifests/archicode.yaml",
      "src/test/javascript/architecture/impact-questions.json"
     ],
     "tdd_excerpts": [
      "REQ-1, REQ-7, TG-1, CON-4, DEC-1, DEC-10, CTR-1, IMP-2, IMP-13, RISK-3 (the TDD file of this run)"
     ],
     "prd_excerpts": [
      "none: there is no PRD (profile TDD+pln); the REQ-n of the TDD are listed with the TDD items"
     ],
     "escalation_triggers": [
      "a test or script still reads the old folder and fails now that it is gone: stop, log the file, send it back to the owning task, never restore the committed file",
      "ArchitectureImpactTest changes its answer because of the tags.path edit: stop and log it (no relationship may change, DEC-10)",
      "the folder comes back after a build: stop and log which script writes it"
     ],
     "depends_on": [
      "task-006",
      "task-007"
     ]
    }
   ]
  ],
  [
   [
    {
     "id": "task-009",
     "title": "The documents say what is built and where the page is: six CLAUDE.md and README files and the manual",
     "objective": "Rewrite the sentences of the eight documents of the outputs so that each states what is true now (the page, the bundles, the kernel script and the samples are made by the build into target/editor-webapp; ./mvnw and npm run editor:build make them; no file of them is in git) with no history of how it was and without the word committed on a line that also says standalone, assets, wasm, bundle, sample or page (resolution F1: write built, made by the build, not in git). Read each of the three CLAUDE.md the gate greps, and src/test/CLAUDE.md and .github/CLAUDE.md, which hold no line the grep finds but name the sample check and the folder (resolution F6); the rule of the root file to run npm run sample:build after a change under docs/architecture goes (the sample is built). Add the third way to the manual. Do not edit the TDD or the wave documents.",
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
      "the grep of the gate over CLAUDE.md, src/main/editor/CLAUDE.md and src/main/rust/viewpoint-kernel/CLAUDE.md prints nothing, and the same kind of grep over the other four documents prints nothing",
      "the manual says how to get the page without the editor server or the website, and manual-howto.test.js and CommandReferenceTest pass",
      "no document names sample:check, the rule R-07a or a step that task-007 removed or renamed; none states history (wave, run, issue, date)"
     ],
     "verification": [
      "test -z \"$(grep -n \"committed\" CLAUDE.md src/main/editor/CLAUDE.md src/main/rust/viewpoint-kernel/CLAUDE.md | grep -E \"standalone|assets|wasm|bundle|sample|page\")\"",
      "test -z \"$(grep -n -i \"committed\" src/test/CLAUDE.md .github/CLAUDE.md src/main/rust/viewpoint-kernel/README.md README.md | grep -iE \"standalone|editor-webapp|viewpoint_kernel|codemirror|elk[.]js|brightcart[.]yaml|archicode[.]yaml|the page|the samples|the bundles\")\"",
      "grep -n \"target/editor-webapp\" src/doc/README.adoc",
      "grep -c \"target/editor-webapp\" CLAUDE.md src/main/editor/CLAUDE.md src/test/CLAUDE.md .github/CLAUDE.md",
      "! grep -n \"after any change under .docs/architecture. run\" CLAUDE.md",
      "! git grep -n \"sample:check\" -- . \":!docs/wav\"",
      "! grep -n \"R-07a\" .github/CLAUDE.md src/test/CLAUDE.md",
      "node --test src/test/javascript/manual-howto.test.js",
      "JAVA_HOME=$HOME/.sdkman/candidates/java/25.0.4-tem ./mvnw --batch-mode -q test -Dplugin.asciidoctor.skip=true -Dsurefire.failIfNoSpecifiedTests=false -Dtest=CommandReferenceTest"
     ],
     "likely_files": [
      "CLAUDE.md",
      "src/main/editor/CLAUDE.md",
      "src/test/CLAUDE.md",
      ".github/CLAUDE.md",
      "src/main/rust/viewpoint-kernel/CLAUDE.md",
      "src/main/rust/viewpoint-kernel/README.md",
      "README.md",
      "src/doc/README.adoc"
     ],
     "tdd_excerpts": [
      "REQ-6, TG-7, DEC-8, DEC-9, IMP-14, resolutions F1 and F6 of the preamble of this plan (the TDD file of this run)"
     ],
     "prd_excerpts": [
      "none: there is no PRD (profile TDD+pln); the REQ-n of the TDD are listed with the TDD items"
     ],
     "escalation_triggers": [
      "a sentence cannot be made true without a fact the run did not establish (for example the time a CI job takes): leave it out, do not invent it",
      "the manual test pins a sentence the new paragraph would break: stop and log it"
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
     "title": "Proof on a clean build: Maven, the jar, the bytes, the failure without Node, the repository grep, and the list of what only a tag run proves",
     "objective": "Prove gates 1, 2, 3, 5 and 6 of phase P2 on the tree the tasks left, once, and write what was measured and what is not provable. Run the verification list in order: remove target and node_modules, build the jar with JDK 25 (Maven runs npm ci itself), check the six files of the jar, compare the built page, scripts, notice file and brightcart sample with commit 7742b07 and archicode.yaml with the same file (it differs by the two lines run 0231 retagged, counted as 2 removed and 2 added, and the lines of the model edit of task-008; list the differing lines in the Findings, resolution F8: no commit closes run 0231, so the baseline of the retag is the working tree), check the tracked files, the grep for the old folder, the failure without node (adding a tool to the PATH of symlinks when the wrapper names it missing, never node or npm), the repeat build, and the website range. Time the clean build and an up-to-date build. Write the Findings paragraph in the prg. This task does not run the Stage 11 suites, the Playwright specs or byte-identity.sh, and starts no workflow dispatch; it does not commit.",
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
      "the clean build exits 0, the jar holds the six files, and the built page, three scripts, notice file and brightcart sample are byte-identical to the files of commit 7742b07",
      "the failure without node is one [ERROR] line naming Node.js with no stack trace, and two builds leave git status unchanged",
      "the prg Findings give the figures, the differing lines of archicode.yaml with their cause, and a list of what only a tag run proves (Q-1) with the reason for each"
     ],
     "verification": [
      "rm -rf target node_modules",
      "JAVA_HOME=$HOME/.sdkman/candidates/java/25.0.4-tem ./mvnw --batch-mode package -Dmaven.test.skip -Dplugin.asciidoctor.skip=true",
      "test \"$(unzip -l target/quarkus-app/app/archicode-*.jar | grep -cE \"editor-webapp/(standalone.html|assets/(codemirror|elk|viewpoint_kernel).js|samples/(brightcart|archicode).yaml)\")\" -eq 6",
      "bash -c 'set -e; for f in standalone.html assets/codemirror.js assets/elk.js assets/viewpoint_kernel.js assets/THIRD-PARTY-NOTICES.txt samples/brightcart.yaml; do git show 7742b07:src/main/resources/editor-webapp/$f | cmp - target/editor-webapp/$f; done'",
      "bash -c 'git show 7742b07:src/main/resources/editor-webapp/samples/archicode.yaml | diff - target/editor-webapp/samples/archicode.yaml > target/archicode-sample.diff; test $? -le 1'",
      "test -z \"$(git ls-files src/main/resources/editor-webapp)\" && test \"$(git ls-files | grep -c viewpoint_kernel)\" -eq 0",
      "test \"$(git grep --untracked -l \"src/main/resources/editor-webapp\" -- . \":!docs/wav\" | grep -vcE \"^(.gitignore|src/test/javascript/viewpoint-kernel/(story-player-scene|save-keeps-the-brackets|save-keeps-quotes-and-comments|delete-plateau-as-released|plateau-matrix-page)[.]test[.]js|src/test/javascript/editor-build/check-editor[a-z-]*[.]test[.]js)$\")\" -eq 0",
      "bash -c 'd=$(mktemp -d); for t in java bash sh env uname dirname basename cat tr sed grep head mkdir rm ls wc cut cmp mv cp mktemp date sleep awk; do p=$(command -v $t) && ln -s \"$p\" \"$d/$t\"; done; if JAVA_HOME=$HOME/.sdkman/candidates/java/25.0.4-tem PATH=\"$d\" ./mvnw --batch-mode -o antrun:run@page > \"$d/out.txt\" 2>&1; then exit 1; fi; test \"$(grep -c \"^.ERROR.*Node.js is not installed\" \"$d/out.txt\")\" -eq 1 && ! grep -q \"^[[:space:]]*at org[.]\" \"$d/out.txt\"'",
      "bash -c 'set -e; npm run editor:build >/dev/null; a=$(git status --short | md5sum); npm run editor:build >/dev/null; test \"$a\" = \"$(git status --short | md5sum)\"'",
      "test \"$(sed -n \"/Assemble website/,/Publish website/p\" .github/workflows/ci-build.yaml | grep -c \"src/main/resources/editor-webapp\")\" -eq 0",
      "test -s docs/wav/wav-035-maven-builds-kernel-and-page-likec4-import/run/run-0232-editor-page-built-by-maven/prg-0232-editor-page-built-by-maven.md && grep -q \"unproved\" docs/wav/wav-035-maven-builds-kernel-and-page-likec4-import/run/run-0232-editor-page-built-by-maven/prg-0232-editor-page-built-by-maven.md"
     ],
     "likely_files": [
      "docs/wav/wav-035-maven-builds-kernel-and-page-likec4-import/run/run-0232-editor-page-built-by-maven/prg-0232-editor-page-built-by-maven.md"
     ],
     "tdd_excerpts": [
      "REQ-1, REQ-2, REQ-3, REQ-5, REQ-6, ASM-3, ASM-4, ASM-6, Q-1, RISK-1, RISK-8, resolutions F5 and F8 of the preamble of this plan (the TDD file of this run)"
     ],
     "prd_excerpts": [
      "none: there is no PRD (profile TDD+pln); the REQ-n of the TDD are listed with the TDD items"
     ],
     "escalation_triggers": [
      "the clean build fails for a reason inside the run (a reader, the pom, a script): stop, log the failing output and send it to the owning task; never repair the file here",
      "the built page differs from the file of 7742b07 and no change of src/main/editor explains it: stop and log it (REQ-3)",
      "npm ci cannot run (no network, cold cache): record an environment gap for every check that needs the build, never a pass"
     ],
     "depends_on": [
      "task-009"
     ]
    }
   ]
  ]
 ],
 "blocked": [],
 "commit_tasks": true,
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
 "generator_script": "/home/tibo/git-perso/claude-agents/plugins/run-management/skills/complete-wave/scripts/complete_wave.py",
 "run_completed": false
}
// ---- run implement engine (shared text: generated implement files and the shipped `run-implement` workflow) ----
// Every agent below is a leaf: it has neither the Workflow tool nor the Agent tool, so a task agent
// works its task inline and nothing here asks any agent to dispatch. Per lane of pending tasks:
// implementation agent (model and effort of the task's tier) -> independent verification agent ->
// (on failure, ONE escalation: a retry one rung up, then verified again) -> when a task's check is unmeetable without a commit and the run has a wave
// (--commit-tasks), ONE commit-lane of the whole lane after the retries, then only the flagged tasks are verified again -> a marker agent writes the
// done status and results line of the lane into the pln. Without that option a task or check that needs a commit or a clean tree
// is reported unmeetable and stops the workflow with state awaiting-commit (no retry, which could not help; the task stays pending). After the last task: Stage 11 and an independent
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
    failing_output: { type: 'string' }, unmeetable: { type: 'boolean' }, unmeetable_kind: { type: 'string', enum: ['commit', 'contradiction'] }, outside_likely_files: { type: 'array', items: { type: 'string' } },
    changed_files: { type: 'array', items: { type: 'object', properties: { path: { type: 'string' }, outside: { type: 'boolean' } }, required: ['path', 'outside'] } },
  },
  required: ['task', 'passed', 'checks'],
}
const FINAL_SCHEMA = {
  type: 'object',
  properties: { run_status: { type: 'string' }, pln_status: { type: 'string' }, check_run_exit: { type: 'integer' }, check_run_named: { type: 'string' }, unmet: { type: 'array', items: { type: 'string' } }, not_verified: { type: 'string' } },
  required: ['run_status', 'pln_status', 'check_run_exit'],
}
// the report of `commit-lane --json`: the exit code of the command and the keys it prints (the script reads git, no agent lists files)
const COMMIT_LANE_SCHEMA = {
  type: 'object',
  properties: { exit: { type: 'integer' }, committed: { type: 'boolean' }, nothing: { type: 'boolean' }, commit: { type: 'string' }, files: { type: 'array', items: { type: 'string' } }, reason: { type: 'string' }, detail: { type: 'string' }, message: { type: 'string' } },
  required: ['exit'],
}
// a lane is committed by the workflow only for a run of a wave (the command needs the wave folder and the run id) and only with --commit-tasks
const LANE_COMMIT = !!(PLAN.commit_tasks && !PLAN.stand_in && PLAN.wave_dir && PLAN.run_id)
const shq = (x) => `'${String(x).replaceAll("'", "'\\''")}'`
const safePath = (x) => typeof x === 'string' && x.length > 0 && !/[\n\r\0]/.test(x) && !x.startsWith('-')
const eff = (e) => (e ? e : 'the same effort')
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

// the tree identifier of Stage 11 (complete-run/SKILL.md owns the recipe and the line): the working tree as it stands, read through a temporary index so
// the real one is untouched, without the folder Stage 11 itself writes into afterwards (the wave's folder for a wave-owned run, else the run's own)
const TREE_FOLDER = PLAN.wave_dir || PLAN.run_dir
const TREE_CMD = `T=$(mktemp -d) && GIT_INDEX_FILE=$T/index git add -A -- . ':(exclude)${TREE_FOLDER}' && GIT_INDEX_FILE=$T/index git write-tree`
const SUITE_LINE = '- <date>: Full suite: command <command>; tree <40 hex>; outcome <pass|fail>; duration <n>s'

const taskBrief = (t, retryOf) => ROOT +
  `Implement task ${t.id} of run ${PLAN.run} (${PLAN.slug}${PLAN.wave ? ', wave ' + PLAN.wave : ''}): ${t.title}\n` +
  `Run directory ${PLAN.run_dir}; plan ${PLN}. Objective: ${t.objective}\n` +
  `Acceptance criteria:\n${list(t.acceptance_criteria)}\nVerification the task states:\n${list(t.verification)}\n` +
  `Likely files:\n${list(t.likely_files)}\nTDD excerpts:\n${list(t.tdd_excerpts)}\nPRD excerpts:\n${list(t.prd_excerpts)}\nEscalation triggers:\n${list(t.escalation_triggers)}\n` +
  `Work this task only; other tasks have their own agents. You are a leaf agent with no Agent tool and no Workflow tool. Run the task's own verification before you answer, and do not edit the pln's statuses (a marker step does, after an independent check). ` +
  `Run each verification once, after your last edit; fix and rerun only what failed; do not run the repository's full test suite unless the task lists it. ` +
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

// the listed repositories other than the root itself (PLAN.repos, set when the settings hold a repos map); empty keeps the verifier brief as it was
const NESTED = (PLAN.repos || []).map((e) => e.path).filter((p) => p && p !== '.')
const verifyBrief = (t, attempt, justCommitted) => ROOT + (
  PLAN.stand_in
    ? `STAND-IN TEST. Check that the file ${PLAN.run_dir}/evidence/standin-${t.id}.txt exists and holds "${t.id} done". Return task ${t.id}, passed (true if so), one check entry saying what you did. Edit nothing.`
    : `Independent verification of task ${t.id} of run ${PLAN.run} (attempt ${attempt}); you did not implement it and must not trust any report of it. Edit nothing.\n` +
      `Task: ${t.title}\nObjective: ${t.objective}\nAcceptance criteria:\n${list(t.acceptance_criteria)}\nVerification stated:\n${list(t.verification)}\nLikely files:\n${list(t.likely_files)}\n` +
      `Run every stated verification yourself and read the actual files against each acceptance criterion, not the implementer's words. Run each stated verification once and nothing broader (not the repository's full test suite unless the task lists it); you still run it yourself, the implementer's run does not count. One entry in checks per verification or criterion: what you ran or read (ran) and what happened (result). passed is true only if every one holds; otherwise put the failing output in failing_output. ` +
      `Compare \`git status --porcelain\` with the likely files and list changes outside them (other tasks' files, ${PLAN.run_dir} and the wave's own documents ${WAVE_DOCS} excepted) in outside_likely_files. ` +
      (NESTED.length ? `The repository holds nested repositories (${NESTED.join(', ')}): run \`git status --porcelain\` at the root and again inside each of them, and report every changed file of a nested repository with its repository path as prefix (${NESTED[0]}/src/x), in outside_likely_files and changed_files alike. ` : '') +
      `Also return changed_files: every path of that status that this task changed (its likely files, plus each outside_likely_files path with outside true), as repository-relative paths, leaving out anything git ignores and anything under target/. ` +
      `Nobody commits in this workflow: a check that needs a commit or a clean working tree cannot hold whatever the implementer does, so set unmeetable true, unmeetable_kind 'commit', passed false, and name the check in failing_output. If instead the checks cannot all hold because they contradict each other or a test that already exists (nothing a commit would change), set unmeetable true, unmeetable_kind 'contradiction', passed false, and name both sides in failing_output. A commit the task's objective asks for is not a criterion here: do not fail the task for its absence, check the rest and note in a check entry that the commit is left to the operator.` +
      (justCommitted ? `\nThis workflow has just committed this lane's files by path, so HEAD now holds them: a check that only needed that commit should hold now; judge it again from scratch.` : ''))

// only with PLAN.commit_tasks (--commit-tasks) and a run of a wave: the one place this workflow commits, once per lane, after the retries and
// only when a task is commit-unmeetable. A bookkeeping agent runs ONE script command and reports it; the script reads git for the file list,
// the paths below only narrow it (the run directory is always in scope) and no agent is given any other git command.
const laneCommand = (ids, paths, apply) => `python3 "${PLAN.generator_script}" commit-lane ${PLAN.wave_dir} --run ${PLAN.run_id} --label ${shq('tasks ' + ids.map((x) => String(x).replace(/[^A-Za-z0-9._-]/g, '')).join(', '))}` +
  (PLAN.commit_trailer ? ` --commit-trailer ${shq(PLAN.commit_trailer)}` : '') +
  paths.map((p) => ` --path ${shq(p)}`).join('') + (apply ? ' --apply --json' : ' --apply')
const commitLaneBrief = (ids, paths) => ROOT +
  `Commit the lane of tasks ${ids.join(', ')} of run ${PLAN.run} with one command; edit nothing yourself and run no other git command. Run exactly this from the repository root and report its result:\n` +
  laneCommand(ids, paths, true) + `\n` +
  `It prints a JSON object and exits 0 (committed, or nothing to commit) or 2 (refused, with a reason). Return the exit code of the command in exit, and from the JSON: committed, nothing, commit, files, reason, detail. If the exit code is not 0 and the JSON is missing, put its stderr in message.${STAND_IN_NOTE}`

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
  `Run the repository's full test suite ONCE, as Stage 11 says (step 1), and do not run it a second time in this stage: when the Verification Plan names a full-suite command, append one line to ${PRG} in the format ${SUITE_LINE}, its tree being the output of the recipe of Stage 11 (the git recipe over a temporary index, excluding ${TREE_FOLDER}) read after the suite ran; record outcome fail too. ` +
  `Run \`python3 "${PLAN.check_script}" --as-completed ${PLAN.run_dir}\` before you set completed. Return the statuses as read back from the files, the check's exit code and the item it names if not 0, and every unmet criterion. Append one Log line starting "- <date>: Stage 11" to ${PRG}. ` +
  `Stay inside the repository and its safety rules. Never report success you have not checked.`
const finalCheckBrief = () => ROOT + (
  PLAN.stand_in
    ? `STAND-IN TEST. Read ${PLAN.status_file} and ${PLN}; return run_status (frontmatter status), pln_status (execution_manifest status) and check_run_exit 0. Edit nothing.`
    : `Independent final check of run ${PLAN.run}; you did not do Stage 11. Edit nothing. Return run_status as read from ${PLAN.status_file}, pln_status as read from the execution_manifest block of ${PLN}, ` +
      `and run \`python3 "${PLAN.check_script}" --as-completed ${PLAN.run_dir}\` yourself: check_run_exit and, if not 0, check_run_named. List in unmet any task of the pln whose status is not done. ` +
      `Full test suite: when the Verification Plan names one, its green is needed. ${PRG} may hold the line Stage 11 recorded (${SUITE_LINE}). Compute the current tree with \`${TREE_CMD}\` (the folder ${TREE_FOLDER} is left out of the tree on purpose: a change to the documents in it never invalidates a green). ` +
      `Accept the recorded green for the same tree: cite its date, command and tree in place of a rerun. Rerun the suite yourself, once, when the tree differs from the recorded one, when the command is live (it calls a paid or remote service), networked, seeded (a random or clock seed) or known to be unstable, when the recorded outcome is not pass, or when no line is recorded; name a failing suite in unmet.`)

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
    // with a lane commit available an implementer that calls its task unmeetable (it cannot make a commit-dependent check hold) is verified all the same:
    // the independent verifier confirms the claim before anything is committed, and only the verifier's word flags the task for the lane commit below
    const verifiable = (x) => !!x && !didNotStart(x) && (!x.unmeetable || (LANE_COMMIT && !!(x.files_touched && x.files_touched.length)))
    const ver = await parallel(lane.map((t, i) => () => verifiable(impl[i])
      ? ag(verifyBrief(t, 1), PLAN.stand_in
          ? { label: `verify-${t.id}`, schema: VERIFY_SCHEMA, model: 'haiku', effort: 'low' }
          : { label: `verify-${t.id}`, schema: VERIFY_SCHEMA, model: t.verify.model, effort: t.verify.effort })
      : null))
    const failed = []
    lane.forEach((t, i) => {
      if (!impl[i] || !impl[i].done || !ver[i] || !ver[i].passed) failed.push(i)
    })
    // one escalation rung (the pair is t.retry), then verify again; a hard_judgment task is already at the top and is retried as is.
    // A task whose check is commit-unmeetable is only flagged here: the lane is committed once, after every retry of the lane is over.
    const second = {}
    const flagged = []
    for (const i of failed) {
      const t = lane[i]
      if (didNotStart(impl[i])) {
        second[i] = { again: null, v2: null, effort: null, why: impl[i].blocker || impl[i].summary || 'task not started', notStarted: true }
        continue
      }
      if ((impl[i] && impl[i].unmeetable) || (ver[i] && ver[i].unmeetable)) {
        const why = (ver[i] && ver[i].failing_output) || (impl[i] && (impl[i].blocker || impl[i].summary)) || 'unmeetable check'
        if (LANE_COMMIT && impl[i] && (impl[i].done || impl[i].unmeetable) && ver[i] && ver[i].unmeetable && ver[i].unmeetable_kind !== 'contradiction') {
          second[i] = { again: null, v2: null, effort: null, why, flagged: true, unmeetable: true }
          flagged.push(i)
          continue
        }
        const named = (impl[i] && impl[i].unmeetable && (impl[i].blocker || impl[i].summary)) || (ver[i] && ver[i].failing_output) || 'unmeetable precondition'
        second[i] = { again: null, v2: null, effort: null, why: named, unmeetable: true, contradiction: !!(ver[i] && ver[i].unmeetable_kind === 'contradiction' && !(impl[i] && impl[i].unmeetable)) }
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
    // the paths a task contributes to the lane commit: what its verifier saw changed (git status), else its likely files; a path that could
    // break out of the command line is dropped and named in the entry
    const droppedPaths = []
    const pathsOf = (t, v) => {
      const raw = v && v.changed_files && v.changed_files.length ? v.changed_files.map((c) => c.path) : (t.likely_files || [])
      return raw.filter((x) => { if (safePath(x)) return true; droppedPaths.push(String(x)); return false })
    }
    const taskPassed = (i) => { const e = second[i]; return e ? !!(e.again && e.again.done && e.v2 && e.v2.passed) : true }
    // ONE commit of the lane, only when a task is flagged: the included tasks are those that passed and the flagged ones (a task blocked after its retry
    // contributes nothing, its partial files stay uncommitted); then only the flagged tasks are verified again
    let cl = null
    if (flagged.length) {
      const included = lane.map((t, i) => i).filter((i) => taskPassed(i) || (second[i] && second[i].flagged))
      const ids = included.map((i) => lane[i].id)
      const paths = [...new Set(included.flatMap((i) => pathsOf(lane[i], second[i] ? (second[i].flagged ? ver[i] : second[i].v2) : ver[i])))]
      // nothing to commit by path, or a commit agent that answers nothing: the lane is not committed and the flagged tasks wait with that reason
      if (!paths.length) cl = { exit: 3, committed: false, reason: 'no path to commit: no changed file seen and no likely file' }
      else cl = await ag(commitLaneBrief(ids, paths), opt('bookkeeping', { label: `commit-lane-${lane[0].id}`, schema: COMMIT_LANE_SCHEMA }))
      if (!cl) cl = { exit: -1, committed: false, reason: 'the lane commit agent returned nothing' }
      const committedOk = !!cl && cl.exit === 0
      if (committedOk) {
        const hash = cl.commit || null
        const again = await parallel(flagged.map((i) => () => ag(verifyBrief(lane[i], 2, true), { label: `reverify-${lane[i].id}`, schema: VERIFY_SCHEMA, model: lane[i].verify.model, effort: lane[i].verify.effort })))
        flagged.forEach((i, k) => {
          const v2 = again[k]
          second[i] = { again: { ...impl[i], done: true }, v2, effort: null, why: second[i].why, lane: true, hash, commit_exit: 0 }
        })
      } else if (cl) {
        flagged.forEach((i) => { second[i].commit_exit = cl.exit; second[i].commit_reason = cl.reason || cl.message || 'refused' })
      }
    }
    const bad = []
    const commitWait = []
    const operatorWait = []
    const marks = []
    for (let i = 0; i < lane.length; i++) {
      const t = lane[i]
      const esc = second[i]
      const passed = taskPassed(i)
      if (esc && esc.lane && esc.v2 && esc.v2.unmeetable) { esc.unmeetable = true; esc.why = esc.v2.failing_output || esc.why; esc.contradiction = esc.v2.unmeetable_kind === 'contradiction' }
      const v = esc && !esc.flagged ? esc.v2 : ver[i]
      results.push({ task: t.id, tier: t.tier, model: t.model, effort: t.effort, first_pass: !esc, escalated_to: esc ? esc.effort : null, verified: v })
      if (esc && esc.notStarted) {
        // the agent did not start (nothing written): no retry, the task stays pending and the operator decides
        operatorWait.push({ task: t.id, title: t.title, reason: esc.why })
        continue
      }
      if (!passed && esc.unmeetable && !esc.contradiction) {
        // not a failure of the task: its work is on disk and only a commit is missing (the lane commit was refused, or the check is still
        // unmeetable after it); it stays pending, so the next generation resumes it
        const files = (impl[i] && impl[i].files_touched && impl[i].files_touched.length ? impl[i].files_touched : t.likely_files) || []
        const outside = ((v && v.outside_likely_files) || (ver[i] && ver[i].outside_likely_files) || []).filter((f) => !files.includes(f))
        // what the verifier saw changed by this task, outside-declared paths marked; the implementer's own list is only the fallback
        const changed = (v && v.changed_files) || (ver[i] && ver[i].changed_files) || []
        commitWait.push({ task: t.id, title: t.title, files, outside_likely_files: outside, changed_files: changed, check: esc.why, committed_by_workflow: esc.hash || null, commit_exit: esc.commit_exit === undefined ? null : esc.commit_exit, reason: esc.commit_reason || null, paths: pathsOf(t, v) })
        continue
      }
      if (!passed) {
        bad.push(esc.contradiction ? `${t.id}: its checks contradict each other or an existing test, a commit changes nothing (${esc.why})` : esc.unmeetable ? `${t.id}: unmeetable, no retry (${esc.why})` : esc.lane ? `${t.id}: failed its check after the lane commit (${esc.why})` : `${t.id}: failed twice (${esc.why})`)
        marks.push({ id: t.id, status: 'blocked', line: esc.contradiction ? `tier ${t.tier}, effort ${t.effort}, its checks contradict each other or an existing test (a commit changes nothing), no retry: ${esc.why}` : esc.unmeetable ? `tier ${t.tier}, effort ${t.effort}, unmeetable precondition or check, no escalated retry (nothing commits in this workflow): ${esc.why}` : esc.lane ? `tier ${t.tier}, effort ${t.effort}, failed its check after the lane commit (${esc.hash || 'nothing to commit'}); blocked by the implement workflow: ${esc.why}` : `tier ${t.tier}, effort ${t.effort}, failed first check and the escalated retry (${eff(esc.effort)}); blocked by the implement workflow` })
        continue
      }
      const line = `tier ${t.tier}, model ${t.model}, effort ${t.effort}, profile ${PLAN.cost_profile}, ${esc ? (esc.lane ? 'passed after the lane commit (' + (esc.hash || 'nothing to commit') + ')' : 'passed after escalation to effort ' + eff(esc.effort)) : 'passed first time'}, inline (leaf), independently verified`
      marks.push({ id: t.id, status: 'done', line })
      if (v && v.outside_likely_files && v.outside_likely_files.length) findings.push({ task: t.id, outside_likely_files: v.outside_likely_files })
    }
    // the marker runs before any stop, so a task that passed is never lost; commit_exit and mark_exit are two separate values
    let markExit = null
    if (marks.length) {
      const marked = await ag(laneMarkerBrief(marks), opt('bookkeeping', { label: `mark-lane-${lane[0].id}`, schema: MARK_SCHEMA }))
      if (!marked) bad.push(`${marks.map((m) => m.id).join(', ')}: marker returned nothing`)
      else if (marked.exit !== 0) { markExit = marked.exit; bad.push(`${marks.map((m) => m.id).join(', ')}: mark command failed (mark_exit ${marked.exit}) ${marked.message || ''}`.trim()) }
    }
    if (bad.length) return await stop('task not verified', markExit === null ? bad : [...bad, { commit_exit: cl ? cl.exit : null, mark_exit: markExit }])
    if (operatorWait.length) {
      await ag(entryPrompt(`implement workflow stopped, state awaiting-operator: ${operatorWait.map((x) => x.task).join(', ')} not started by their agent, nothing written, the tasks stay pending. Read the reasons, fix the cause, then regenerate. ` + JSON.stringify(operatorWait)), opt('bookkeeping', { label: 'prg-awaiting-operator' }))
      return { state: 'awaiting-operator', tasks: operatorWait, results, findings }
    }
    if (commitWait.length) {
      const ids = commitWait.map((x) => x.task)
      const paths = [...new Set(commitWait.flatMap((x) => x.paths))]
      const command = PLAN.wave_dir && PLAN.run_id ? laneCommand(ids, paths, false) : null
      const tasks = commitWait.map(({ paths: _p, ...x }) => ({ ...x, commit_command: command, dropped_paths: droppedPaths }))
      const how = !LANE_COMMIT ? 'this workflow commits nothing here' : cl && cl.exit !== 0 ? `the lane commit was refused (commit_exit ${cl.exit}, reason ${cl.reason || cl.message || 'none stated'})` : 'the lane was committed by the workflow and the check still failed'
      await ag(entryPrompt(`implement workflow stopped, state awaiting-commit: ${ids.join(', ')} have a check that is unmeetable as the workflow runs it (the judgment of the independent check, not proof that a commit is missing); ${how}. For each task, committed_by_workflow is the hash of the lane commit or null. ` +
        (command ? `Run: ${command} then regenerate; the tasks are still pending. ` : `Commit the task files by path yourself, then regenerate; the tasks are still pending. `) + JSON.stringify(tasks)), opt('bookkeeping', { label: 'prg-awaiting-commit' }))
      return { state: 'awaiting-commit', tasks, results, findings }
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
