export const meta = { name: "run-0227-implement", description: "Generated from the run directory: pending tasks of the pln only; cost profile low-cost" }
// cost profile: low-cost
// overrides of declared tiers and profile ceilings (2):
//   - stage-11 and final-check: the run holds a sensitive task, both take the elevated pair sonnet/high
//   - task-004 declared hard_judgment: verifier raised to sonnet/high (risk high); executor kept at sonnet/high; no human gate
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
  "stage-11 and final-check: the run holds a sensitive task, both take the elevated pair sonnet/high",
  "task-004 declared hard_judgment: verifier raised to sonnet/high (risk high); executor kept at sonnet/high; no human gate"
 ],
 "sensitivity": [
  {
   "task": "task-004",
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
 "run": "0227",
 "slug": "editor-assets-beside-the-page",
 "wave": "034",
 "profile": "TDD+pln",
 "run_dir": "docs/wav/wav-034-diagrams-assets-likec4-matrix-page/run/run-0227-editor-assets-beside-the-page",
 "status_file": "docs/wav/wav-034-diagrams-assets-likec4-matrix-page/run/run-0227-editor-assets-beside-the-page/run-0227-editor-assets-beside-the-page.md",
 "pln_file": "docs/wav/wav-034-diagrams-assets-likec4-matrix-page/run/run-0227-editor-assets-beside-the-page/pln-0227-editor-assets-beside-the-page.md",
 "prg_file": "docs/wav/wav-034-diagrams-assets-likec4-matrix-page/run/run-0227-editor-assets-beside-the-page/prg-0227-editor-assets-beside-the-page.md",
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
  "task-008"
 ],
 "levels": [
  [
   [
    {
     "id": "task-001",
     "title": "Pins, bundle entries and the build: esbuild API, assets.json, the @assets directive, the notice file, --check, the two committed bundles",
     "objective": "Add the seven pinned dev dependencies of DEC-2 (npm install --save-dev --save-exact, then npm ci), the two bundle entries of DEC-3 and assets.json, and extend scripts/build-editor.mjs as DEC-1, DEC-4, DEC-8 and CTR-5 say: a lazy import of esbuild with metafile: true (the notice file reads the packages the metafile lists), the bundles built in memory with the fixed target list and written only when their bytes differ, the notice file, the @assets directive that writes one <meta name=\"archicode-asset:NAME\" content=\"./assets/NAME?v=8hex\"> per asset from the SHA-256 of the committed file on disk (so --where, --map and --check-identical need no esbuild), --check that names the stale asset or notice file, and the error: lines of FLOW-1. Add the directive line to page.html, run npm run editor:build to write the assets, the notice file and the page, and add the node tests of the TDD (build-editor.test.js cases and editor-assets.test.js on the lock layout, ASM-2).",
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
      "package.json holds esbuild 0.28.2, codemirror 6.0.1, @codemirror/lang-yaml 6.1.1, @codemirror/lang-json 6.0.1, @codemirror/language 6.13.1, @lezer/highlight 1.2.5 and elkjs 0.9.3 as exact devDependencies, and npm ci exits 0",
      "the build calls esbuild with metafile: true and the notice file lists, sorted by name, each package of the metafile with its version, SPDX licence and LICENSE* text (EPL-2.0 for elkjs, MIT for the others)",
      "the written <meta> hash of each asset equals the first 8 hex of the SHA-256 of the file on disk, a second editor:build writes nothing, and editor:check fails with the error: line of CTR-5 on an edited asset and on an edited notice file",
      "a page with the directive and no assets.json, assets.json and no directive, and a copy of the script in a folder with no node_modules (error: esbuild is not installed: run npm ci) each give one error: line and exit 1; the unit trees without assets.json behave as before; --where and --map run with no esbuild",
      "editor-assets.test.js fails unless @codemirror/state and @codemirror/view each exist once in package-lock.json with no nested copy, and says what it read",
      "the sizes (raw and gzip) of the two bundles and the notice file are written in the prg of the run, with the result of building twice in two folders (ASM-1)",
      "no hit of import( followed by an http(s) string inside the committed assets folder; if one exists, stop and log it (the grep of the wave gate covers that folder)",
      "package.json scripts and the prelint, pretest:unit and pretest:coverage entries are unchanged"
     ],
     "verification": [
      "npm ci",
      "node --test src/test/javascript/editor-build/build-editor.test.js src/test/javascript/editor-build/editor-assets.test.js",
      "npm run editor:build && npm run editor:check",
      "bash -c 'set -e; f=src/main/resources/editor-webapp; s=$(mktemp); sha256sum $f/assets/* $f/standalone.html > \"$s\"; npm run editor:build > /dev/null; sha256sum $f/assets/* $f/standalone.html | diff - \"$s\"'",
      "test \"$(grep -c esbuild package.json)\" -ge 1 && test \"$(grep -c node_modules/esbuild package-lock.json)\" -ge 1",
      "test -f src/main/resources/editor-webapp/assets/codemirror.js && test -f src/main/resources/editor-webapp/assets/elk.js && test -f src/main/resources/editor-webapp/assets/THIRD-PARTY-NOTICES.txt",
      "! grep -rnE \"import\\(.https?:\" src/main/resources/editor-webapp/assets",
      "npm run format:check"
     ],
     "likely_files": [
      "package.json",
      "package-lock.json",
      "src/main/editor/assets.json",
      "src/main/editor/bundles/codemirror.mjs",
      "src/main/editor/bundles/elk.mjs",
      "scripts/build-editor.mjs",
      "src/main/editor/page.html",
      "src/main/resources/editor-webapp/assets/codemirror.js",
      "src/main/resources/editor-webapp/assets/elk.js",
      "src/main/resources/editor-webapp/assets/THIRD-PARTY-NOTICES.txt",
      "src/main/resources/editor-webapp/standalone.html",
      "src/test/javascript/editor-build/build-editor.test.js",
      "src/test/javascript/editor-build/editor-assets.test.js"
     ],
     "tdd_excerpts": [
      "R-1",
      "R-3",
      "R-4",
      "R-11",
      "R-12",
      "TG-2",
      "TG-3",
      "ASM-1",
      "ASM-2",
      "ASM-3",
      "CON-1",
      "CON-2",
      "CON-5",
      "CON-8",
      "DEC-1",
      "DEC-2",
      "DEC-3",
      "DEC-4",
      "DEC-8",
      "DEC-9",
      "CTR-1",
      "CTR-2",
      "CTR-5",
      "IF-1",
      "FLOW-1",
      "IMP-1",
      "IMP-2",
      "IMP-3",
      "IMP-5",
      "RISK-1",
      "RISK-2",
      "RISK-6",
      "RISK-7"
     ],
     "prd_excerpts": [
      "none: there is no PRD (profile TDD+pln); the R-n of the TDD are listed with the TDD items"
     ],
     "escalation_triggers": [
      "the two builds of ASM-1 differ: stop and log it, RISK-2 changes the design (a pinned toolchain image or a different check)",
      "elk.js does not export the ELK class as default once bundled, or ESM bundling of elk.bundled.js fails: stop and log it (ASM-3, RISK-7)",
      "npm install cannot resolve one pin: stop and log it, never move to another version silently"
     ],
     "depends_on": []
    }
   ]
  ],
  [
   [
    {
     "id": "task-002",
     "title": "Loaders: assetAddress, loadElk and the module script read the <meta>; the remote-import guard test; the shorter page comment",
     "objective": "Replace the six import() of https://esm.sh with the loaders of DEC-3 and DEC-4: a top-level assetAddress(name) in model/kernel-bridge.js (null for no document, no meta, empty content; otherwise new URL(content, document.baseURI).href), loadElk() importing elk.js with the 30 s retry and the warning unchanged, and codemirror-loader.mjs importing codemirror.js once and building window.CM (EditorView, basicSetup, yaml, json, darkHighlight with its inner try) with the colours unchanged and the codemirror-ready event; replace the long esm.sh comment of page.html with a short one about the assets; add assetAddress to names.json (node scripts/check-editor.mjs --write-names); write remote-import.test.js (DEC-9a, each shape proved on strings first) and asset-address.test.js (no meta, empty content, a valid one against document.baseURI, and loadElk() returning null with no address); run editor:build.",
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
      "neither src/main/editor nor standalone.html has an import( of an http(s) address, nor from followed by an http(s) string, nor a script tag with an http src (the grep of gate 1 prints nothing and remote-import.test.js passes)",
      "a missing, empty or unreadable <meta> gives a null address and the fallbacks of today (window.CM undefined and a console warning for CodeMirror, loadElk() null for ELK), never a thrown error or a blank page",
      "window.CM keeps its keys EditorView, basicSetup, yaml, json and darkHighlight, and the codemirror-ready event still fires after a successful import",
      "no upward pair is added: node scripts/check-editor.mjs --layers exits 0 and ratchet.max in layers.json is unchanged",
      "scripts/editor-coverage-floor.json is not edited and no floor goes down",
      "the 3519 tests that pass on the starting repository still pass"
     ],
     "verification": [
      "node --test src/test/javascript/editor-build/remote-import.test.js src/test/javascript/viewpoint-kernel/asset-address.test.js",
      "npm run editor:build && npm run editor:check",
      "! grep -rnE \"import\\(.https?:\" src/main/editor src/main/resources/editor-webapp --include=*.js --include=*.mjs --include=*.html",
      "npm run test:unit",
      "npm run format:check",
      "npm run lint"
     ],
     "likely_files": [
      "src/main/editor/model/kernel-bridge.js",
      "src/main/editor/codemirror-loader.mjs",
      "src/main/editor/page.html",
      "src/main/editor/names.json",
      "src/main/resources/editor-webapp/standalone.html",
      "src/test/javascript/editor-build/remote-import.test.js",
      "src/test/javascript/viewpoint-kernel/asset-address.test.js",
      "src/test/javascript/viewpoint-kernel/harness.js"
     ],
     "tdd_excerpts": [
      "R-2",
      "R-5",
      "R-9",
      "R-12",
      "TG-1",
      "TG-4",
      "CON-1",
      "CON-3",
      "CON-8",
      "DEC-3",
      "DEC-4",
      "DEC-9",
      "CTR-1",
      "CTR-2",
      "IF-2",
      "IF-3",
      "IF-5",
      "FLOW-2",
      "IMP-4",
      "IMP-9",
      "ASM-4"
     ],
     "prd_excerpts": [
      "none: there is no PRD (profile TDD+pln); the R-n of the TDD are listed with the TDD items"
     ],
     "escalation_triggers": [
      "a loader needs a new name outside names.json or a new upward pair: stop and log it (the editor layers are not changed by this run)",
      "the unit harness needs more than a null-tolerant querySelector: stop and log it, do not rewrite the harness",
      "an existing test of the loaders fails for a reason other than the address: fix the loader, never the old test"
     ],
     "depends_on": [
      "task-001"
     ]
    },
    {
     "id": "task-003",
     "title": "The editor server: the ASSETS table, one static handler for samples and assets, and the Java and integration tests",
     "objective": "Add the context /assets/ and the table ASSETS (record Asset(resource, contentType); codemirror.js and elk.js only, text/javascript; charset=utf-8) to EditorHttpServer as DEC-5 says, merging handleSample and the new handler into one private method over a lookup name to resource and type with the order Host check 403, unknown name 404, non-GET 405, no token header and no session cookie 403 (the token in the query is not accepted), resource missing 500, then 200 with Cache-Control no-store and nosniff; the request never builds a path. Add the route to the Javadoc. Write the EditorHttpServerTest cases of the Observability section (bytes equal to the committed files, type, nosniff, header and cookie, no proof or wrong or empty or query token 403, host not allowed 403, non-GET 405, the 404 names of CTR-3, unknown name before token 404) and the EditorServeIT cases (200 for both with the token read from the printed address, 403 without, 404 for another name). The .wasm entry and application/wasm are W-3 (DEC-7): do not add them.",
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
      "GET /assets/codemirror.js and /assets/elk.js with the token header or the session cookie answer 200 with text/javascript; charset=utf-8, Cache-Control no-store, X-Content-Type-Options nosniff and the bytes of the committed file; the ?v= query is ignored",
      "/assets, /assets/, /assets/elk.js/, /assets/ELK.js, /assets/../standalone.html and any name outside the table answer 404 even with the right token; a request with no proof, a wrong or empty token or only the token in the query answers 403; a Host that is not allowed answers 403; a non-GET answers 405",
      "the existing sample tests of EditorHttpServerTest pass unedited, and ASSETS has exactly two entries with no .wasm and no application/wasm",
      "no // NOPMD and no @SuppressWarnings(\"PMD...\") is added, the native reflect-config is not touched, and the Java coverage floors of the pom still hold"
     ],
     "verification": [
      "JAVA_HOME=$HOME/.sdkman/candidates/java/25.0.4-tem ./mvnw test -Dtest=EditorHttpServerTest",
      "JAVA_HOME=$HOME/.sdkman/candidates/java/25.0.4-tem ./mvnw verify -DskipITs=false -Dit.test=EditorServeIT -Dtest=NoSuchTest -Dsurefire.failIfNoSpecifiedTests=false",
      "JAVA_HOME=$HOME/.sdkman/candidates/java/25.0.4-tem ./mvnw test-compile pmd:check"
     ],
     "likely_files": [
      "src/main/java/io/morin/archicode/cli/EditorHttpServer.java",
      "src/test/java/io/morin/archicode/cli/EditorHttpServerTest.java",
      "src/test/java/io/morin/archicode/it/EditorServeIT.java"
     ],
     "tdd_excerpts": [
      "R-6",
      "R-12",
      "TG-3",
      "CON-2",
      "CON-7",
      "CON-9",
      "DEC-5",
      "DEC-7",
      "CTR-3",
      "IF-4",
      "FLOW-2",
      "IMP-6",
      "ASM-5",
      "RISK-4"
     ],
     "prd_excerpts": [
      "none: there is no PRD (profile TDD+pln); the R-n of the TDD are listed with the TDD items"
     ],
     "escalation_triggers": [
      "the served page or the samples route changes behaviour for an existing test: stop and log it, the samples are unchanged",
      "the 500 for a missing resource cannot be tested without a classpath trick: cover it with a unit test of the lookup, never with a suppression"
     ],
     "depends_on": [
      "task-001"
     ]
    },
    {
     "id": "task-004",
     "title": "CI: \"Assemble website\" copies and compares the assets folder, the R-07a rule of the change map, and the notes of .github/CLAUDE.md",
     "objective": "Edit by anchors, on top of the lines that run 0226 (W-1) left uncommitted in ci-build.yaml and .github/CLAUDE.md (the step \"Check the manual has its diagrams\" and the sentence about PlantUML must stay): in the step \"Assemble website\" add mkdir -p target/site/editor/assets, cp -r of src/main/resources/editor-webapp/assets/. into it, and a loop over the SOURCE folder that does test -f and cmp for each file of the folder (so a file added later is compared too), keeping set -euo pipefail. In scripts/changes.mjs add R-07a before R-07 for src/main/resources/editor-webapp/assets/** running java, page and e2e (not kernel; rationale: the Kernel job reads the .wasm and the page kernel block, which an asset does not touch), and rows in the EXAMPLES of changes-map.test.js for an asset path (java, page, e2e) and for src/main/editor/bundles/x.mjs (all four). Add to .github/CLAUDE.md what the step now copies and that W-3 revisits R-07a when the .wasm joins the folder. Do not touch pom.xml.",
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
      "the step \"Assemble website\" holds a copy of the assets folder into target/site/editor/assets, and a test -f and a cmp for every file of the source folder, in a loop over the source folder",
      "the lines of W-1 are intact: the step \"Check the manual has its diagrams\" with the text Failed to generate image is still in ci-build.yaml",
      "the run block of the step, extracted from the YAML, passes bash -n and every command of the editor part is run once in a scratch copy of the tree, outside the repository, with GITHUB_REF_NAME=archicode-0.0.0-rehearsal (the full rehearsal with a browser is task-006)",
      "changes-map.test.js passes with the new rows, R-07a precedes R-07, and R-16 and R-06 are unchanged",
      "the pull request cannot prove this step: the log of the task says so in one line"
     ],
     "verification": [
      "node --test src/test/javascript/changes-map.test.js",
      "python3 -c \"import yaml; yaml.safe_load(open('.github/workflows/ci-build.yaml'))\"",
      "test \"$(grep -c \"Failed to generate image\" .github/workflows/ci-build.yaml)\" -ge 1",
      "test \"$(grep -c \"editor/assets\" .github/workflows/ci-build.yaml)\" -ge 1",
      "npm run format:check"
     ],
     "likely_files": [
      ".github/workflows/ci-build.yaml",
      "scripts/changes.mjs",
      "src/test/javascript/changes-map.test.js",
      ".github/CLAUDE.md"
     ],
     "tdd_excerpts": [
      "R-7",
      "R-8",
      "R-12",
      "TG-5",
      "CON-6",
      "DEC-6",
      "CTR-4",
      "FLOW-3",
      "FLOW-4",
      "IMP-7",
      "RISK-3"
     ],
     "prd_excerpts": [
      "none: there is no PRD (profile TDD+pln); the R-n of the TDD are listed with the TDD items"
     ],
     "escalation_triggers": [
      "the cp or the cmp would fail on a file the folder legitimately holds (the notice file has no reader but must be copied): stop and log it",
      "an edit would drop a line of W-1 in ci-build.yaml or .github/CLAUDE.md: edit by anchors and diff before and after",
      "the step is changed beyond the editor assets (the stamp, the presentation page, the manual): stop and log it"
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
     "id": "task-005",
     "title": "End-to-end: the editor draws a diagram and edits YAML in CodeMirror with every host but 127.0.0.1 blocked",
     "objective": "Add HOSTED_ROUTES entries to harness.js for /editor/assets/NAME for each file of src/main/resources/editor-webapp/assets (read at request, with the right type), so the hosted-style page loads them at the website layout, and write editor-offline.spec.js as the Observability section describes: every URL whose host is not 127.0.0.1 is route-aborted and recorded; (a) on a served example, draw a view (g.dg-node exists only when ELK laid it out), open a file in the raw YAML view (#file-edit-codemirror-host holds a .cm-editor), type, save and read the file back from the disk of the copy; (b) on the hosted-style page open the sample, draw a diagram, mount CodeMirror; assert the list of blocked requests is empty. Package the application first. Show the spec is not vacuous: on a copy of target/quarkus-app (ARCHICODE_E2E_JAR) whose elk.js or codemirror.js is broken the spec fails; write the command and the failure in the prg.",
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
      "the spec runs on chromium and on firefox and exits 0 on each; webkit is not added to the testMatch of playwright.config.js, which is not edited",
      "the spec records every request to a host other than 127.0.0.1 and asserts the list is empty, so a build that still imports from a remote host fails it",
      "the fixture rule that fails a test on a console error is kept: a blocked request that was attempted would fail the test",
      "the spec fails on a copy of the packaged application whose elk.js is broken and on one whose codemirror.js is broken (non-vacuity, recorded in the prg of the run)",
      "the other hosted specs still pass with the new routes (hosted-acceptance.spec.js on chromium)"
     ],
     "verification": [
      "JAVA_HOME=$HOME/.sdkman/candidates/java/25.0.4-tem ./mvnw package -Dmaven.test.skip -Dplugin.asciidoctor.skip=true",
      "npx playwright test src/test/e2e/editor-offline.spec.js --project=chromium",
      "npx playwright test src/test/e2e/editor-offline.spec.js --project=firefox",
      "npx playwright test src/test/e2e/hosted-acceptance.spec.js --project=chromium",
      "npm run format:check",
      "npm run lint"
     ],
     "likely_files": [
      "src/test/e2e/editor-offline.spec.js",
      "src/test/e2e/harness.js"
     ],
     "tdd_excerpts": [
      "R-10",
      "R-12",
      "TG-1",
      "TG-4",
      "CON-3",
      "IF-2",
      "IF-3",
      "IF-4",
      "FLOW-2",
      "FLOW-3",
      "IMP-8",
      "ASM-3",
      "ASM-4",
      "ASM-5",
      "RISK-7"
     ],
     "prd_excerpts": [
      "none: there is no PRD (profile TDD+pln); the R-n of the TDD are listed with the TDD items"
     ],
     "escalation_triggers": [
      "ELK or CodeMirror does not load in a real browser although node and Java tests pass (ASM-3, RISK-7): stop and log it with the console output, do not weaken the spec",
      "a browser project is not installed (npx playwright install chromium firefox needed): record it and stop, it is an environment gap, not a pass",
      "the spec is flaky: drop the flow with its reason, never add a retry (src/test/CLAUDE.md)"
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
     "id": "task-006",
     "title": "Rehearse \"Assemble website\", repeat the file:// measurement on the real assets, and report sizes and load times after (R-13)",
     "objective": "Do the three measurements of the TDD in a scratch folder outside the repository and record them in the Findings of the prg of the run (R-13 has this task as its owner). (1) FLOW-4: copy src/site, src/main/resources/editor-webapp and a stub target/generated-docs/index.html, extract the run block of \"Assemble website\" from the YAML, run it with GITHUB_REF_NAME=archicode-0.0.0-rehearsal, serve target/site with a static server on 127.0.0.1, open /editor/ in Chromium with external hosts blocked, and check that a g.dg-node draws and .cm-editor mounts; say that the real step stays unproved until a tag. (2) Q-2 again: open a copy of the page with the assets folder beside it from file:// in Chromium, Firefox and WebKit and compare with the TDD (Firefox loads, Chromium and WebKit refuse); state any difference, because task-007 writes the manual sentence from it. (3) Sizes (raw and gzip) of codemirror.js, elk.js and standalone.html against 2,736,458 bytes for the page before, and the median of five loads per engine of the first g.dg-node and of window.CM with the method of Q-3 (hosted-style server, the Brightcart sample address, a new context per load), next to the before figures of the TDD. Nothing in the repository changes except the prg.",
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
      "the Findings of the prg hold a \"Rehearsal of Assemble website\" entry with the commands, the exit codes and the result of the browser check, and the sentence that the real step is unproved until a tag run",
      "the Findings hold a \"file:// on the real assets\" entry with one line per engine and a line saying whether it differs from Q-2 of the TDD",
      "the Findings hold the raw and gzip sizes of the three files and, per engine, the five values and the median of each of the two times, next to the before figures of the TDD",
      "git status --short shows no change outside the prg of the run and the files of earlier tasks"
     ],
     "verification": [
      "grep -c \"Rehearsal of Assemble website\" docs/wav/wav-034-diagrams-assets-likec4-matrix-page/run/run-0227-editor-assets-beside-the-page/prg-0227-editor-assets-beside-the-page.md",
      "grep -c \"file:// on the real assets\" docs/wav/wav-034-diagrams-assets-likec4-matrix-page/run/run-0227-editor-assets-beside-the-page/prg-0227-editor-assets-beside-the-page.md",
      "grep -ci \"median\" docs/wav/wav-034-diagrams-assets-likec4-matrix-page/run/run-0227-editor-assets-beside-the-page/prg-0227-editor-assets-beside-the-page.md"
     ],
     "likely_files": [
      "docs/wav/wav-034-diagrams-assets-likec4-matrix-page/run/run-0227-editor-assets-beside-the-page/prg-0227-editor-assets-beside-the-page.md"
     ],
     "tdd_excerpts": [
      "R-8",
      "R-13",
      "TG-5",
      "ASM-1",
      "ASM-4",
      "IF-5",
      "FLOW-4",
      "RISK-3",
      "RISK-5",
      "Q-2",
      "Q-3"
     ],
     "prd_excerpts": [
      "none: there is no PRD (profile TDD+pln); the R-n of the TDD are listed with the TDD items"
     ],
     "escalation_triggers": [
      "the rehearsal shows an asset missing from target/site: fix task-004 there, never patch the rehearsal",
      "the network is not available for a measurement: record the before figures only and say the after is not taken",
      "the file:// result differs from Q-2: report it; the manual sentence follows the measurement"
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
     "id": "task-007",
     "title": "The sentences and the model: manual, README.md, CLAUDE.md files, embed.sh comment, the editor_assets component and the sample bundle",
     "objective": "State what is true now, with no history (the CLAUDE.md rule). Manual (line near 1881, and where the page is called a single file): the editor loads CodeMirror and the layout from files served beside the page, with no network, and say from the result of task-006 what happens from a saved copy opened from file:// (Firefox loads the folder beside the page; Chromium and Safari show the textarea and the plain list). README.md (lines 87 and 123 to 126): the page is generated and a folder of assets sits beside it. CLAUDE.md and src/main/editor/CLAUDE.md: the page and the assets folder are generated by editor:build, which needs npm ci (no longer \"no npm install\"), the loader and the @assets and @wasm lists. src/test/CLAUDE.md: the spec editor-offline.spec.js, the hosted routes of the assets, the guard tests. embed.sh: its comment about no npm install. Model: add archicode.contracts.couplings.editor_assets (tags.path src/main/resources/editor-webapp/assets, src/main/editor/bundles) with archicode.commandline.commands.editor_serve --serves--> it and archicode.editor.page --reads--> it, and the five couplings become six in the container and in view.contracts.yaml; then npm run sample:build.",
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
      "no sentence of the manual, README.md or a CLAUDE.md says that the editor loads from a CDN or esm.sh, that the page is a single file with nothing beside it, or that editor:build needs no npm install; no CLAUDE.md names a wave, a run or a date",
      "the manual sentence on file:// matches the measurement of task-006",
      "the component editor_assets exists with its two edges, every tags.path exists, and the five couplings read six where the container and the saved view count them",
      "npm run sample:build leaves the bundle current: npm run sample:check exits 0 and a second npm run sample:build changes nothing",
      "the manual keeps its voice and anchors: the tests manual-skeleton, manual-voice, manual-howto and the anchors file pass"
     ],
     "verification": [
      "JAVA_HOME=$HOME/.sdkman/candidates/java/25.0.4-tem ./mvnw test -Dtest=ArchitectureDriftTest,ArchitectureImpactTest,ArchitectureModelTest",
      "npm run sample:build && npm run sample:check",
      "node --test src/test/javascript/manual-skeleton.test.js src/test/javascript/manual-voice.test.js src/test/javascript/manual-howto.test.js src/test/javascript/architecture-model.test.js",
      "! grep -rn \"esm.sh\" README.md CLAUDE.md src/doc/README.adoc src/main/editor/CLAUDE.md src/test/CLAUDE.md src/main/rust/viewpoint-kernel/embed.sh src/main/editor/page.html",
      "npm run format:check"
     ],
     "likely_files": [
      "src/doc/README.adoc",
      "README.md",
      "CLAUDE.md",
      "src/main/editor/CLAUDE.md",
      "src/test/CLAUDE.md",
      "src/main/rust/viewpoint-kernel/embed.sh",
      "docs/architecture/manifests/archicode.yaml",
      "docs/architecture/manifests/views/view.contracts.yaml",
      "src/test/javascript/architecture/impact-questions.json",
      "src/main/resources/editor-webapp/samples/archicode.yaml"
     ],
     "tdd_excerpts": [
      "R-11",
      "R-12",
      "CON-1",
      "CON-7",
      "IF-5",
      "IMP-10",
      "CI-arc-1",
      "RISK-5",
      "Q-2"
     ],
     "prd_excerpts": [
      "none: there is no PRD (profile TDD+pln); the R-n of the TDD are listed with the TDD items"
     ],
     "escalation_triggers": [
      "a modeled editor layer or a tags.path would no longer match layers.json: stop and log it, the model change is a coupling and not a layer",
      "the manual test of voice or anchors fails on a sentence this task did not write: record it and do not fix it",
      "a sentence outside the listed files says how the page is built or loaded: add it to the log and fix it only if it is the same fact"
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
     "title": "Gates of the run: the P2 criteria that belong to W-2, the whole suites, byte identity and a clean rebuild",
     "objective": "Run the gates of the wave that belong to this run from the repository root with Java 25 and record each command and exit code in the prg: the gate-1 grep over the whole scope of the wave, esbuild in package.json and the lock, npm ci, the assets folder holding codemirror.js and elk.js (the .wasm half of gates 3 and 5 is W-3, DEC-7), editor:check, the Java and integration tests, the 200/403/404 answers of editor serve on a free port, the e2e spec on both engines, the website step, test:unit, test:coverage, format:check, lint, byte-identity, ratchet.max and the unchanged tree after editor:build and sample:build. Say what is not proved: the real Assemble website step (a tag run), macOS and Windows determinism, the native image, Safari. Fix nothing that is red outside this run: record it.",
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
      "every command of the verification below exits 0, or the prg names it, its exit code and why it is outside this run",
      "scripts/byte-identity-exceptions.txt, scripts/byte-identity-new-files.txt and scripts/byte-identity-stdout-changes.txt are unchanged and byte-identity needs no new exception",
      "npm run editor:build and npm run sample:build leave git status --short as it was before they ran",
      "the prg lists as unproved: the real website step until a tag run, macOS and Windows, the native image, the real Safari, and the .wasm halves of gates 3 and 5 (W-3)"
     ],
     "verification": [
      "! grep -rnE \"import\\(.https?:\" src/main/editor src/main/resources/editor-webapp --include=*.js --include=*.mjs --include=*.html",
      "npm ci",
      "npm run editor:check",
      "JAVA_HOME=$HOME/.sdkman/candidates/java/25.0.4-tem ./mvnw verify -DskipITs=false",
      "JAVA_HOME=$HOME/.sdkman/candidates/java/25.0.4-tem ./mvnw test-compile pmd:check",
      "npx playwright test src/test/e2e/editor-offline.spec.js --project=chromium",
      "npx playwright test src/test/e2e/editor-offline.spec.js --project=firefox",
      "npm run test:unit",
      "npm run test:coverage",
      "npm run format:check",
      "npm run lint",
      "scripts/byte-identity.sh",
      "node -e \"process.exit(require('./src/main/editor/layers.json').ratchet.max <= 99 ? 0 : 1)\"",
      "git diff --stat -- scripts/byte-identity-exceptions.txt scripts/byte-identity-new-files.txt scripts/byte-identity-stdout-changes.txt src/main/rust src/main/wasm"
     ],
     "likely_files": [
      "docs/wav/wav-034-diagrams-assets-likec4-matrix-page/run/run-0227-editor-assets-beside-the-page/prg-0227-editor-assets-beside-the-page.md"
     ],
     "tdd_excerpts": [
      "R-1",
      "R-2",
      "R-3",
      "R-4",
      "R-6",
      "R-8",
      "R-10",
      "R-12",
      "R-13",
      "CON-4",
      "CON-7",
      "DEC-7",
      "RISK-1",
      "RISK-2",
      "RISK-3",
      "Observability and Verification"
     ],
     "prd_excerpts": [
      "none: there is no PRD (profile TDD+pln); the R-n of the TDD are listed with the TDD items"
     ],
     "escalation_triggers": [
      "byte-identity needs a new exception or an existing command changes its output: stop and log it (CON-4)",
      "a command fails for a reason outside this run (a base already red): record it, do not fix it",
      "the Java coverage floor or an editor coverage floor goes down: stop and log it, do not lower a floor"
     ],
     "depends_on": [
      "task-007"
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

const verifyBrief = (t, attempt, justCommitted) => ROOT + (
  PLAN.stand_in
    ? `STAND-IN TEST. Check that the file ${PLAN.run_dir}/evidence/standin-${t.id}.txt exists and holds "${t.id} done". Return task ${t.id}, passed (true if so), one check entry saying what you did. Edit nothing.`
    : `Independent verification of task ${t.id} of run ${PLAN.run} (attempt ${attempt}); you did not implement it and must not trust any report of it. Edit nothing.\n` +
      `Task: ${t.title}\nObjective: ${t.objective}\nAcceptance criteria:\n${list(t.acceptance_criteria)}\nVerification stated:\n${list(t.verification)}\nLikely files:\n${list(t.likely_files)}\n` +
      `Run every stated verification yourself and read the actual files against each acceptance criterion, not the implementer's words. One entry in checks per verification or criterion: what you ran or read (ran) and what happened (result). passed is true only if every one holds; otherwise put the failing output in failing_output. ` +
      `Compare \`git status --porcelain\` with the likely files and list changes outside them (other tasks' files, ${PLAN.run_dir} and the wave's own documents ${WAVE_DOCS} excepted) in outside_likely_files. ` +
      `Also return changed_files: every path of that status that this task changed (its likely files, plus each outside_likely_files path with outside true), as repository-relative paths, leaving out anything git ignores and anything under target/. ` +
      `Nobody commits in this workflow: a check that needs a commit or a clean working tree cannot hold whatever the implementer does, so set unmeetable true, unmeetable_kind 'commit', passed false, and name the check in failing_output. If instead the checks cannot all hold because they contradict each other or a test that already exists (nothing a commit would change), set unmeetable true, unmeetable_kind 'contradiction', passed false, and name both sides in failing_output. A commit the task's objective asks for is not a criterion here: do not fail the task for its absence, check the rest and note in a check entry that the commit is left to the operator.` +
      (justCommitted ? `\nThis workflow has just committed this task's files by path, so HEAD now holds them: a check that only needed that commit should hold now; judge it again from scratch.` : ''))

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
        if (PLAN.commit_tasks && !PLAN.stand_in && impl[i] && (impl[i].done || impl[i].unmeetable) && ver[i] && ver[i].unmeetable && ver[i].unmeetable_kind !== 'contradiction') {
          const files = impl[i].files_touched && impl[i].files_touched.length ? impl[i].files_touched : (t.likely_files || [])
          const c = files.length ? await ag(commitBrief(t, files), opt('bookkeeping', { label: `commit-${t.id}`, schema: COMMIT_SCHEMA })) : null
          if (c && c.committed) {
            const v2 = await ag(verifyBrief(t, 2, true), { label: `reverify-${t.id}`, schema: VERIFY_SCHEMA, model: t.verify.model, effort: t.verify.effort })
            second[i] = { again: { ...impl[i], done: true }, v2, effort: null, why: ver[i].failing_output || 'unmeetable check', committed: c.commit || 'yes' }
            continue
          }
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
      if (!passed && esc.unmeetable && !esc.contradiction) {
        // not a failure of the task: its work is on disk and only a commit (which this workflow never makes) is missing; it stays pending,
        // so the next generation resumes it once the operator has committed
        // the operator commits in one command: the task's files plus the changes the verifier saw outside them, which stay listed apart
        // (never committed by this workflow: an unknown file such as a build artefact is the operator's call)
        const files = (impl[i] && impl[i].files_touched && impl[i].files_touched.length ? impl[i].files_touched : t.likely_files) || []
        const outside = ((v && v.outside_likely_files) || (ver[i] && ver[i].outside_likely_files) || []).filter((f) => !files.includes(f))
        // the list to commit is what the verifier saw changed by this task, outside-declared paths marked; the implementer's own list is only the fallback
        const changed = (v && v.changed_files) || (ver[i] && ver[i].changed_files) || []
        const add = changed.length ? changed.map((c) => c.path) : files
        commitWait.push({ task: t.id, title: t.title, files, outside_likely_files: outside, changed_files: changed, check: esc.why, committed_by_workflow: esc.committed || null, git_add: add.length ? 'git add -- ' + add.join(' ') : null })
        continue
      }
      if (!passed) {
        bad.push(esc.contradiction ? `${t.id}: its checks contradict each other or an existing test, a commit changes nothing (${esc.why})` : esc.unmeetable ? `${t.id}: unmeetable, no retry (${esc.why})` : `${t.id}: failed twice (${esc.why})`)
        marks.push({ id: t.id, status: 'blocked', line: esc.contradiction ? `tier ${t.tier}, effort ${t.effort}, its checks contradict each other or an existing test (a commit changes nothing), no retry: ${esc.why}` : esc.unmeetable ? `tier ${t.tier}, effort ${t.effort}, unmeetable precondition or check, no escalated retry (nothing commits in this workflow): ${esc.why}` : `tier ${t.tier}, effort ${t.effort}, failed first check and the escalated retry (${esc.effort}); blocked by the implement workflow` })
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
      await ag(entryPrompt(`implement workflow stopped, state awaiting-commit: ${commitWait.map((x) => x.task).join(', ')} have a check that is unmeetable as the workflow runs it (the verifier's judgment, not proof that a commit is missing); for each, committed_by_workflow tells whether this workflow already committed its files by path and the check still failed. Commit the files by path if none was committed, then regenerate (the tasks are still pending, the next generation resumes them and reruns the check) ` + JSON.stringify(commitWait)), opt('bookkeeping', { label: 'prg-awaiting-commit' }))
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
