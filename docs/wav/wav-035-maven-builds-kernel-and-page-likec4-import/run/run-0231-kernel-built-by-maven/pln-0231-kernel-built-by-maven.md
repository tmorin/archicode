---
title: Execution Plan — Kernel built by Maven
status: done
date: 2026-11-07
related:
  - docs/wav/wav-035-maven-builds-kernel-and-page-likec4-import/run/run-0231-kernel-built-by-maven/tdd-0231-kernel-built-by-maven.md
  - docs/wav/wav-035-maven-builds-kernel-and-page-likec4-import/wav-035-maven-builds-kernel-and-page-likec4-import.md
  - docs/wav/wav-035-maven-builds-kernel-and-page-likec4-import/wbc-035-maven-builds-kernel-and-page-likec4-import.md
  - 'gh:tmorin/archicode#207'
type: pln
run: 0231
wave: 035
---

# Execution Plan: Kernel built by Maven

Profile TDD+pln: there is no PRD, so REQ-1 to REQ-6 are the IDs the TDD labels (section "PRD Traceability"), assumed from the six gate criteria of phase P1 of wave 035, the manifest row W-1 and issue #207. The TDD is the design (DEC-1 to DEC-10, IMP-1 to IMP-13, CTR-1 to CTR-4, IF-1 to IF-4, FLOW-1 to FLOW-3). The plan commits nothing: the commit is a human step outside it. One task stages a deletion (`git rm` of the committed `.wasm`, recoverable from HEAD); no task commits, pushes or dispatches a workflow.

Autonomy: the wave runs with no autonomy override (its progress log says "autonomy override: none"), so no task is `human_required` and none has `risk: critical`; a task so flagged would stop the implement workflow with `awaiting-human`, which is why none was written. The wave declares W-1 `hard_judgment` (it changes the build of the released jar and of three native binaries, two of which are proved only by a tag run): the two tasks that carry that risk, task-003 (the pom) and task-005 (the workflow), are `hard_judgment` with `risk: high` and `review_after`, so their verifier runs at the elevated pair of the cost profile; the other five are `standard`. No task needs a stop: the reviews are the independent verification of each task and the author's reading of the pull request. A future reader should not look for a stop.

Starting repository, checked while drafting: the committed `src/main/resources/editor-webapp/assets/viewpoint_kernel.wasm` is byte-identical to `git show 7742b07:...` (the gate's baseline); `rustup` and `cargo` are on the machine (`/home/tibo/.cargo/bin`); JDK 25 is `$HOME/.sdkman/candidates/java/25.0.4-tem` (the shell Java is 21, so every Maven command is prefixed `JAVA_HOME=...`); `.gitignore` already ignores `target/`, so `target/kernel` and `src/main/rust/viewpoint-kernel/target` need no new line; the working tree holds only the wave documents (uncommitted) and no change to `pom.xml` or `ci-build.yaml`. The Maven suites, the node suite, `byte-identity.sh` and the e2e suite were not run while drafting; the whole suites run once at Stage 11, not in a task.

Resolutions of the Stage 5 review of the TDD (its four S2 findings and the S1 findings; the TDD text was not edited, so the tasks carry them and the plan holds either way):
- F1, the REQ-3 count: the TDD check `grep -c "^\[ERROR\].*rustup"` prints 2, because the `around Ant part` line holds the property names `rustup.found` and `kernel.missing-rustup`. The check of task-003 is `grep -c "^.ERROR.*rustup is not installed"`, which only the line that holds the sentence matches; if it still prints another number, the task records the measured output and keeps the intent (exactly one line carries the sentence, no `at org.` line).
- F2, DEC-8 and TG-5: `npm run editor:check` of the job `Page` still compares the committed `viewpoint_kernel.js` and the `?v=` hash of the page with the built kernel until the page leaves git. What DEC-8 removes is a committed hash of the `.wasm` and a test of its bytes. The sentences task-006 writes say that, and none says that nothing compares the bytes afterwards.
- F3, the jar copy of the `.wasm` is read by nothing at run time (Chicory emits bytecode, the server answers 404 for the path); it is kept for the wave's gate 2 and for CON-3. A leftover untracked copy under `src/main/resources` must never reach the jar by a newer mtime: task-003 adds an `<excludes>` of that one path to the first resource entry, so the only copy is the one of `target/kernel`.
- F4, DEC-7 rewrites the reason of R-20 only, but the reasons of R-07a, R-07 and R-20 all name `embed.sh --check` or R-07a0: task-004 rewrites the three, and the gate greps that neither string is left outside `docs/wav`.
- S1, the explicit step "Build the kernel" of `Page` duplicates the npm pre-scripts (`editor:check` builds the kernel itself): task-005 adds only the cache step before the first node step that builds it. Counted with the cache steps of the other four jobs, `grep -c "Cache the Rust toolchain"` prints 5. The job `Kernel` installs the same toolchain with no cache: it gets no cache step in this run (it is not a job that runs `./mvnw` and REQ-5 counts five), and its comment says so; DEF-3 of the TDD is the place for a cache if the times show it matters. `Native` has no inline cache step to copy (it uses `cache: maven` of the setup action): the new step is written like the one of `Java`. The comments of the jobs `Page`, `Kernel` and `E2E` that name the committed `.wasm` or the Maven-only cache are rewritten. IMP-4 says a contributor keeps an untracked copy, but git removes a tracked file on checkout: the sentence is not carried into any document. The garbled phrase `beyond nothing` of the TDD Scope means that `src/main/editor` is not touched.

Resolutions of the Stage 9 consistency check (the pln against the TDD and the repository):
- G1, a reader of the old advice that the TDD does not list: the test `the page names the kernel file that the CLI runs, by the hash of its bytes` of `src/test/javascript/viewpoint-kernel/conformance.test.js` (line 321 today) fails with the message `run src/main/rust/viewpoint-kernel/embed.sh`, which was the command that assembled the page and no longer is (DEC-1 removes the node call). CTR-2 says that no other caller of `embed.sh` exists, which that line contradicts. task-002 owns the fix: the message becomes `run npm run editor:build`; the assertion is not touched. The test reads the committed script and the page, not the `.wasm`, so it is not one of the five tests that read the kernel.
- G2, the word `committed` and the word `wasm` on one line: the check of task-006 (`! grep -nE -i "wasm.*committed|committed.*wasm"` over the kernel `CLAUDE.md` and `README.md`) and the gate (REQ-4: no line of the kernel `CLAUDE.md` says the `.wasm` is committed) would flag the sentence that F2 requires (the committed script and the `?v=` hash are compared with the built kernel) if one line held both words. task-006 words that sentence so that `committed` and `wasm` are on different lines (the kernel is named `the built kernel`, `the file in target/kernel` or `viewpoint_kernel.js`).
- G3, the wave plan names `~/.cargo` and `target` as the cache of a Rust build; DEC-6 caches the toolchain and the crates (`~/.rustup/toolchains`, `~/.rustup/update-hashes`, `~/.cargo/registry`, `~/.cargo/git`) and not `target` (11 s of cargo). The tasks follow the TDD; the gate asks only for `cargo` made available in each job (criterion 5) and the report of the times, which task-007 records. Not a blocker.
- Spot-checked against the repository and found as the TDD says: the step names `Build artifacts` (Java), `Build the packaged application` (E2E), `Check the editor page is the assembly of its parts` (Page), `Build the native image and run the integration tests against it` (Native), `Publish snapshot artifacts` (Build), `Assemble website`, and the comparison step of `Kernel` (line 239); `Native` and `Java` use `cache: maven` of the setup action and have no inline cache step; the rules `R-07a0`, `R-07a`, `R-07`, `R-20` of `scripts/changes.mjs`; the row of the `.wasm` and the row of `scripts/build-editor.mjs` in `changes-map.test.js`; the two `Maven needs no Rust` hits (`CLAUDE.md` line 25 and the kernel `CLAUDE.md` line 15); the component `kernel_wasm` of the model; `target/` in `.gitignore`; the five tests that read the `.wasm` (`compare`, `contains-changes-union`, `sibling-candidates`, `patches`, `change`); `harness.js` and `load-kernel.test.js` read `viewpoint_kernel.js`, not the `.wasm`. The files the tasks create (`embed-script.test.js`, `kernel-wasm.js`) do not exist yet, as planned.

Order of the work: task-001 (`embed.sh`, its toolchain comment and the test that pins its one-line failure) is the root: every other task calls the script. task-002 (the node side) and task-004 (the change map) then touch disjoint paths. task-003 (the pom and the removal of the committed file) waits for task-002, so that nothing reads the committed file when it goes and two builds of the kernel never run at once. task-005 (the workflow) needs the script and the npm names. task-006 writes the sentences and the model from what the tasks did. task-007 proves REQ-1 to REQ-5 on a clean `target` and records it. Between task-001 and task-002 nothing is red: the committed file is still in the tree until task-003. `editor:build` writes `standalone.html`, which Maven copies into the jar: do not run Maven while an `editor:build` runs.

## 1. Executive Summary

```yaml
summary:
  status: 'done'
  product_goal: 'No WebAssembly is committed: ./mvnw builds the viewpoint kernel from its Rust with the pinned toolchain into target/kernel, feeds it to Chicory and puts it in the jar at its old path, the node side reads the same file, CI gets Rust and a cache, and the bytes, the page and every command line output stay what they were'
  technical_approach: 'embed.sh takes --out, builds with --locked into target/kernel/cargo, copies only when the bytes differ and checks rustup first with builtins; maven-antrun-plugin 3.2.0 runs it at initialize and fails with one line naming rustup; the Chicory wasmFile and a resource entry read and carry target/kernel; build-editor.mjs, five node tests and the npm pre-scripts read target/kernel; the change map and ci-build.yaml follow; the model, the sample and six documents say what is true now'
  total_tasks: 7
  parallel_groups: 2
  high_risk_tasks: 2
  human_review_gates: 1
  autonomy_level: 'medium'
  recommendation: 'proceed_with_review'
  criteria:
    - 'git ls-files | grep -c viewpoint_kernel.wasm prints 0, and the .wasm in target/quarkus-app/app/archicode-<version>.jar after a clean build is byte-identical to git show 7742b07:src/main/resources/editor-webapp/assets/viewpoint_kernel.wasm, with the same SHA-256 on a second clean build'
    - 'with a PATH that holds java and the wrapper but neither cargo nor rustup, ./mvnw -o initialize exits non-zero with exactly one [ERROR] line that holds the sentence naming rustup and no at org. line; bash embed.sh with an empty PATH exits 1 with one error line (embed-script.test.js)'
    - 'no CLAUDE.md says Maven needs no Rust and the kernel CLAUDE.md does not say the .wasm is committed; embed.sh --check and R-07a0 are named nowhere outside docs/wav'
    - 'the step Check the committed WebAssembly is the one the Rust builds is gone and Cache the Rust toolchain is found five times, once in each of Java, E2E, Build, Native and Page'
    - 'the Stage 11 commands exit 0: test-compile pmd:check, verify -DskipITs=false, npm ci, test:unit, test:coverage, editor:check, format:check, lint, byte-identity.sh with its exceptions file unchanged, and editor:build leaves the page and the assets unchanged'
    - 'the prg of the run lists what is unproved until a tag run (the arm and macOS native targets, the website, the Rust cache on a cold runner) and the local figures of the clean build'
```

## 2. PRD/TDD Consistency Assessment

```yaml
consistency_assessment:
  aligned_items:
    - 'REQ-1 to REQ-6 each map to at least one DEC or IMP of the TDD and to a task below'
    - 'The six gate criteria of phase P1 are the verification of task-003 (REQ-1, REQ-2 partly, REQ-3), task-005 (REQ-5), task-006 (REQ-4) and task-007 (REQ-1 to REQ-5 on a clean target); REQ-6 is the Stage 11 list'
    - 'The split of the TDD (script, node side, pom and removal, change map, workflow, documents and model) is the split of task-001 to task-006'
    - 'The website step is not edited (DEC-9), and no .rs, Cargo or toolchain channel line changes (Non-Goals, CON-1, CON-2)'
  gaps:
    - id: gap-001
      type: 'missing_requirement'
      description: 'There is no PRD: REQ-1 to REQ-6 are assumed from the wave manifest and issue 207 (traceability incomplete in the TDD)'
      impact: 'low'
      recommendation: 'The tasks cite the REQ-n of the TDD; the six gate criteria of P1 are the acceptance criteria'
    - id: gap-002
      type: 'missing_technical_design'
      description: 'Stage 5 findings not applied to the TDD text: the REQ-3 grep prints 2, DEC-8 and TG-5 say nothing compares the bytes afterwards while editor:check still compares the committed script and the ?v= hash, the jar copy of the .wasm can be overwritten by a stale src copy, the reasons of R-07a, R-07 and R-20 still name embed.sh --check and R-07a0, the explicit Build the kernel step of Page duplicates the pre-scripts'
      impact: 'low'
      recommendation: 'The plan carries the resolutions listed in its preamble; task-003, task-004, task-005 and task-006 own them and the gate greps catch what is left'
    - id: gap-003
      type: 'risk'
      description: 'The arm and macOS native targets, the website and a cold Rust cache are proved only by a tag run or a rehearsal dispatch (RISK-1, ASM-2, ASM-3, Q-1)'
      impact: 'medium'
      recommendation: 'Q-1 is a tradeoff the author decides (default: no rehearsal, the tag run proves it); the runner images list rustup (ASM-2); task-007 writes the unproved list in the prg and no task starts a dispatch'
    - id: gap-004
      type: 'risk'
      description: 'Every ./mvnw and five npm scripts now need rustup on the PATH (CTR-4): a contributor who only works on Java needs Rust installed'
      impact: 'low'
      recommendation: 'The one-line message says how (https://rustup.rs); task-006 states the rule in the CLAUDE.md files'
    - id: gap-005
      type: 'ambiguity'
      description: 'The command that proves REQ-3 needs a PATH with only the tools the Maven wrapper uses, which the TDD does not list'
      impact: 'low'
      recommendation: 'task-003 builds the folder of symlinks from a list and adds a tool when the wrapper reports it missing, never cargo or rustup'
    - id: gap-006
      type: 'inconsistency'
      description: 'CTR-2 says no other caller of embed.sh exists, but conformance.test.js tells the reader to run embed.sh when the page does not name the hash of the script, which embed.sh no longer assembles (resolution G1); the wave plan names a cache of ~/.cargo and target where DEC-6 caches the toolchain and the crates (resolution G3)'
      impact: 'low'
      recommendation: 'task-002 changes the message of that assertion to npm run editor:build; the TDD text is not edited and the plan holds the resolution; G3 is not a blocker'
  blocking_gaps: []
```

## 3. Execution Graph

```yaml
execution_graph:
  nodes:
    - id: task-001
      status: 'done'
      title: 'embed.sh builds the kernel into a chosen file: --out, --locked, the rustup check first, copy only when the bytes differ, no --check and no node call; the toolchain comment; the test of its one-line failure'
      depends_on: []
      produces:
        - 'src/main/rust/viewpoint-kernel/embed.sh'
        - 'src/main/rust/viewpoint-kernel/rust-toolchain.toml (comment lines only)'
        - 'src/test/javascript/editor-build/embed-script.test.js'
      agent_role: 'Infrastructure Agent'
      autonomy: 'autonomous'
      risk: 'medium'
      confidence: 80
    - id: task-002
      status: 'done'
      title: 'The node side reads target/kernel: build-editor.mjs, the npm scripts, the kernel-wasm.js helper, the five node tests and the build-editor tests'
      depends_on: [task-001]
      produces:
        - 'scripts/build-editor.mjs'
        - 'package.json'
        - 'src/test/javascript/viewpoint-kernel/kernel-wasm.js'
        - 'src/test/javascript/viewpoint-kernel/compare.test.js'
        - 'src/test/javascript/viewpoint-kernel/contains-changes-union.test.js'
        - 'src/test/javascript/viewpoint-kernel/sibling-candidates.test.js'
        - 'src/test/javascript/viewpoint-kernel/patches.test.js'
        - 'src/test/javascript/viewpoint-kernel/change.test.js'
        - 'src/test/javascript/viewpoint-kernel/conformance.test.js (the advice of one assertion message only)'
        - 'src/test/javascript/editor-build/build-editor.test.js'
      agent_role: 'Frontend Implementation Agent'
      autonomy: 'autonomous'
      risk: 'medium'
      confidence: 75
    - id: task-003
      status: 'done'
      title: 'The pom: antrun runs embed.sh at initialize, Chicory and a resource read and carry target/kernel; the committed .wasm is removed from git'
      depends_on: [task-002]
      produces:
        - 'pom.xml'
        - 'src/main/resources/editor-webapp/assets/viewpoint_kernel.wasm (git rm)'
      agent_role: 'Infrastructure Agent'
      autonomy: 'review_after'
      risk: 'high'
      confidence: 70
    - id: task-004
      status: 'done'
      title: 'The change map follows: R-07a0 goes, R-20 becomes Java and Page, the reasons of R-07a, R-07 and R-20 are rewritten, the test rows follow'
      depends_on: [task-001]
      produces:
        - 'scripts/changes.mjs'
        - 'src/test/javascript/changes-map.test.js'
      agent_role: 'Infrastructure Agent'
      autonomy: 'autonomous'
      risk: 'medium'
      confidence: 85
    - id: task-005
      status: 'done'
      title: 'The workflow: a Rust toolchain cache in Java, E2E, Build, Native and Page; the Kernel job loses its comparison; the stale comments are rewritten'
      depends_on: [task-002]
      produces:
        - '.github/workflows/ci-build.yaml'
      agent_role: 'Infrastructure Agent'
      autonomy: 'review_after'
      risk: 'high'
      confidence: 70
    - id: task-006
      status: 'done'
      title: 'The sentences and the model: six documents say what is true now, the kernel_wasm element follows, the sample bundle is rebuilt'
      depends_on: [task-003, task-004, task-005]
      produces:
        - 'CLAUDE.md'
        - 'src/main/rust/viewpoint-kernel/CLAUDE.md'
        - 'src/main/rust/viewpoint-kernel/README.md'
        - 'src/main/editor/CLAUDE.md'
        - '.github/CLAUDE.md'
        - 'src/test/CLAUDE.md'
        - 'docs/architecture/manifests/archicode.yaml'
        - 'src/main/resources/editor-webapp/samples/archicode.yaml'
      agent_role: 'Documentation Agent'
      autonomy: 'autonomous'
      risk: 'low'
      confidence: 80
    - id: task-007
      status: 'done'
      title: 'Gate of the run: REQ-1 to REQ-5 on a clean target, the same SHA-256 twice, the page and the assets unchanged by a rebuild, and the record with the unproved list'
      depends_on: [task-006]
      produces:
        - 'docs/wav/wav-035-maven-builds-kernel-and-page-likec4-import/run/run-0231-kernel-built-by-maven/prg-0231-kernel-built-by-maven.md (a Gate results block: commands, exit codes, local figures, what is unproved)'
      agent_role: 'QA Agent'
      autonomy: 'review_after'
      risk: 'medium'
      confidence: 75
  edges:
    - from: task-001
      to: task-002
      reason: 'The npm scripts and the tests call embed.sh with its default output target/kernel/viewpoint_kernel.wasm'
    - from: task-001
      to: task-004
      reason: 'The rules and their reasons are written for the script as task-001 leaves it (no --check)'
    - from: task-002
      to: task-003
      reason: 'The committed file goes only when nothing reads it any more, and two builds of the kernel must not run at once'
    - from: task-002
      to: task-005
      reason: 'The workflow names the kernel:build script and relies on the pre-scripts that build the kernel'
    - from: task-003
      to: task-006
      reason: 'The documents and the model state the layout the pom builds (the model path and the Maven rule)'
    - from: task-004
      to: task-006
      reason: 'The .github/CLAUDE.md sentence on the rules states what task-004 wrote'
    - from: task-005
      to: task-006
      reason: 'The .github/CLAUDE.md sentence on the jobs states what task-005 wrote'
    - from: task-006
      to: task-007
      reason: 'The gate greps the documents and runs the Maven build over the final tree'
```

## 4. Task Catalog

```yaml
task_catalog:
  tasks:
    - id: task-001
      title: 'embed.sh builds the kernel into a chosen file: --out, --locked, the rustup check first, copy only when the bytes differ, no --check and no node call; the toolchain comment; the test of its one-line failure'
      source_requirements:
        prd:
          - 'none: there is no PRD (profile TDD+pln); the REQ-n of the TDD are listed with the TDD items'
        tdd:
          - 'REQ-2'
          - 'REQ-3'
          - 'TG-1'
          - 'TG-3'
          - 'ASM-1'
          - 'CON-1'
          - 'CON-2'
          - 'CON-7'
          - 'DEC-1'
          - 'DEC-5'
          - 'CTR-1'
          - 'CTR-2'
          - 'IMP-1'
          - 'IMP-2'
          - 'IMP-9'
          - 'RISK-6'
      outputs:
        - 'src/main/rust/viewpoint-kernel/embed.sh (usage embed.sh [--out FILE]; the first statement is the rustup check with command -v and builtins only, the one line error: rustup is not installed with the advice, exit 1; an unknown option is error: unknown option, exit 2; the build is cargo build --release --locked --target wasm32-unknown-unknown with the same RUSTFLAGS remaps and --target-dir the cargo folder beside FILE; FILE is written through a temporary file and a move, only when it is missing or cmp -s says the bytes differ; the --check mode, the committed path and the node call are gone; the header comment is rewritten; bash 3.2 compatible)'
        - 'src/main/rust/viewpoint-kernel/rust-toolchain.toml (the comment that says the .wasm is committed and CI rebuilds it to compare; comment lines only)'
        - 'src/test/javascript/editor-build/embed-script.test.js (new: bash embed.sh with PATH a fresh empty folder exits 1, prints nothing on stdout and one error line naming rustup on stderr; an unknown option exits 2 with its sentence, skipped when rustup is not on the PATH; the test never starts cargo)'
      verification:
        - 'bash -n src/main/rust/viewpoint-kernel/embed.sh'
        - 'node --test src/test/javascript/editor-build/embed-script.test.js'
        - 'bash -c ''set -e; d=$(mktemp -d); trap "rm -rf $d" EXIT; src/main/rust/viewpoint-kernel/embed.sh --out "$d/k/viewpoint_kernel.wasm"; git show 7742b07:src/main/resources/editor-webapp/assets/viewpoint_kernel.wasm | cmp - "$d/k/viewpoint_kernel.wasm"; m1=$(stat -c %Y "$d/k/viewpoint_kernel.wasm"); sleep 1; src/main/rust/viewpoint-kernel/embed.sh --out "$d/k/viewpoint_kernel.wasm"; test "$m1" = "$(stat -c %Y "$d/k/viewpoint_kernel.wasm")"'''
        - 'test -z "$(git diff -- src/main/rust/viewpoint-kernel/rust-toolchain.toml | grep -E "^[-+]" | grep -vE "^(\+\+\+|---)" | grep -vE "^[-+]#")"'
        - 'test -z "$(git status --short -- src/main/rust/viewpoint-kernel/src src/main/rust/viewpoint-kernel/Cargo.toml src/main/rust/viewpoint-kernel/Cargo.lock)"'
        - 'npx prettier --check src/test/javascript/editor-build/embed-script.test.js'
        - 'npx eslint --max-warnings 0 src/test/javascript/editor-build/embed-script.test.js'
      risk: 'medium'
      confidence: 80
      human_review: 'none'
      escalation_triggers:
        - 'the build into a scratch folder gives bytes that differ from the file of 7742b07 (ASM-1 is false, or a remap moved): stop and log it, never overwrite anything under src to make the comparison pass'
        - 'cargo cannot run here (no network for the toolchain of rust-toolchain.toml, or the pinned compiler is absent): record an environment gap for the cmp line, never a pass, and still run the other checks'
        - 'a line of a .rs file, Cargo.toml, Cargo.lock or the channel of rust-toolchain.toml would have to change: stop and log it (Non-Goals)'
        - 'the script needs a feature bash 3.2 lacks (an array operation, a mapfile, a case modifier): rewrite it, the macOS runner has bash 3.2 for /usr/bin/env bash only when the image says so'
      delegation_tier: 'standard'
      results: 'tier standard, model sonnet, effort medium, profile low-cost, passed first time, inline (leaf), independently verified'
    - id: task-002
      title: 'The node side reads target/kernel: build-editor.mjs, the npm scripts, the kernel-wasm.js helper, the five node tests and the build-editor tests'
      source_requirements:
        prd:
          - 'none: there is no PRD (profile TDD+pln); the REQ-n of the TDD are listed with the TDD items'
        tdd:
          - 'REQ-6'
          - 'TG-4'
          - 'CON-5'
          - 'DEC-4'
          - 'CTR-3'
          - 'IF-2'
          - 'IF-3'
          - 'FLOW-2'
          - 'IMP-5'
          - 'IMP-6'
          - 'IMP-7'
          - 'IMP-8'
          - 'RISK-3'
      outputs:
        - 'scripts/build-editor.mjs (KERNEL_DIR = target/kernel; an encoded entry is read from KERNEL_DIR/<from> and written to ASSETS_DIR/<name> as before; the missing-file sentence is error: the file `viewpoint_kernel.wasm` of `viewpoint_kernel.js` is missing: target/kernel/viewpoint_kernel.wasm (run `npm run kernel:build`) in the form the script already uses for its errors; the header comment that says a committed file of that folder is rewritten; no process is spawned)'
        - 'package.json (kernel:build is bash src/main/rust/viewpoint-kernel/embed.sh; editor:build, the build part of editor:check, prelint, pretest:unit and pretest:coverage run npm run kernel:build && before node scripts/build-editor.mjs; src/main/editor/assets.json does not change)'
        - 'src/test/javascript/viewpoint-kernel/kernel-wasm.js (new CommonJS helper, not a *.test.js: exports the path of target/kernel/viewpoint_kernel.wasm and a reader that throws the same one-line advice when the file is missing)'
        - 'src/test/javascript/viewpoint-kernel/compare.test.js, contains-changes-union.test.js, sibling-candidates.test.js, patches.test.js and change.test.js (read the file through the helper instead of their own path constant)'
        - 'src/test/javascript/editor-build/build-editor.test.js (makeEncodedTree puts kernel.wasm under target/kernel of the fixture tree; the missing-file expectation keeps its start and gains the advice)'
        - 'src/test/javascript/viewpoint-kernel/conformance.test.js (resolution G1: the message of the assertion that the page names the kernel script by its hash says run npm run editor:build and no longer run embed.sh, which no longer assembles the page; the assertion itself and the rest of the file are not touched)'
      verification:
        - 'node --test src/test/javascript/editor-build/build-editor.test.js'
        - 'npm run kernel:build'
        - 'test -f target/kernel/viewpoint_kernel.wasm'
        - 'node --test src/test/javascript/viewpoint-kernel/compare.test.js src/test/javascript/viewpoint-kernel/contains-changes-union.test.js src/test/javascript/viewpoint-kernel/sibling-candidates.test.js src/test/javascript/viewpoint-kernel/patches.test.js src/test/javascript/viewpoint-kernel/change.test.js'
        - 'npm run editor:build && test -z "$(git status --short -- src/main/resources/editor-webapp)"'
        - 'npm run editor:check'
        - 'grep -qF "\"kernel:build\": \"bash src/main/rust/viewpoint-kernel/embed.sh\"" package.json'
        - 'test "$(grep -c "npm run kernel:build &&" package.json)" -eq 5'
        - '! grep -rn "editor-webapp/assets/viewpoint_kernel.wasm" scripts/build-editor.mjs src/test/javascript/viewpoint-kernel src/test/javascript/editor-build'
        - '! grep -rn "embed[.]sh" src/test/javascript/viewpoint-kernel scripts/build-editor.mjs'
        - 'node --test src/test/javascript/viewpoint-kernel/conformance.test.js'
        - 'npx prettier --check scripts/build-editor.mjs "src/test/javascript/viewpoint-kernel/*.js" src/test/javascript/editor-build/build-editor.test.js'
        - 'npx eslint --max-warnings 0 scripts/build-editor.mjs "src/test/javascript/viewpoint-kernel/*.js" src/test/javascript/editor-build/build-editor.test.js'
      risk: 'medium'
      confidence: 75
      human_review: 'none'
      escalation_triggers:
        - 'npm run editor:build changes a byte of standalone.html, viewpoint_kernel.js or an asset (the kernel the script is made from is not the committed one, or the script text moved): stop and log it, never commit or keep the changed file'
        - 'a test that reads the .wasm cannot move to the helper without changing what it proves: stop and log it'
        - 'build-editor.mjs would need to spawn a process, or its --where, --map or --check-identical paths would need the kernel: stop and log it (DEC-4)'
        - 'another test or script outside the list reads the old path of the .wasm or tells the reader to run embed.sh to assemble the page (grep for the file name and for embed.sh over src/test, scripts and .github finds it): add it to this task if it is a node file, otherwise log it for the owning task'
      delegation_tier: 'standard'
      results: 'tier standard, model sonnet, effort medium, profile low-cost, passed first time, inline (leaf), independently verified'
    - id: task-003
      title: 'The pom: antrun runs embed.sh at initialize, Chicory and a resource read and carry target/kernel; the committed .wasm is removed from git'
      source_requirements:
        prd:
          - 'none: there is no PRD (profile TDD+pln); the REQ-n of the TDD are listed with the TDD items'
        tdd:
          - 'REQ-1'
          - 'REQ-2'
          - 'REQ-3'
          - 'TG-1'
          - 'TG-2'
          - 'TG-3'
          - 'ASM-4'
          - 'ASM-5'
          - 'CON-3'
          - 'CON-6'
          - 'DEC-2'
          - 'DEC-3'
          - 'CTR-1'
          - 'CTR-4'
          - 'IF-1'
          - 'IF-4'
          - 'FLOW-1'
          - 'IMP-3'
          - 'IMP-4'
          - 'RISK-5'
          - 'RISK-7'
      outputs:
        - 'pom.xml (maven-antrun-plugin 3.2.0, version pinned as the other plugins, execution id kernel, goal run, phase initialize, declared before the Chicory plugin: a property kernel.missing-rustup holding the sentence of DEC-2, a condition that sets rustup.found from available file rustup on ${env.PATH} (with the environment property loaded), fail unless rustup.found with that message, then exec bash failonerror with embed.sh and --out ${project.build.directory}/kernel/viewpoint_kernel.wasm; the Chicory wasmFile is that same path and its comment says where the .wasm comes from; build resources are two entries, src/main/resources with an exclude of editor-webapp/assets/viewpoint_kernel.wasm, and ${project.build.directory}/kernel with targetPath editor-webapp/assets and an include of viewpoint_kernel.wasm only; quarkus-maven-plugin, Failsafe, JaCoCo and the native profile are not touched)'
        - 'src/main/resources/editor-webapp/assets/viewpoint_kernel.wasm (git rm: the deletion is staged, nothing is committed)'
      verification:
        - 'git rm --quiet --cached --ignore-unmatch src/main/resources/editor-webapp/assets/viewpoint_kernel.wasm && rm -f src/main/resources/editor-webapp/assets/viewpoint_kernel.wasm'
        - 'test "$(git ls-files | grep -c viewpoint_kernel.wasm)" -eq 0'
        - 'grep -q "maven-antrun-plugin" pom.xml && grep -qF "${project.build.directory}/kernel/viewpoint_kernel.wasm" pom.xml && grep -qF "<exclude>editor-webapp/assets/viewpoint_kernel.wasm</exclude>" pom.xml'
        - '! grep -qF "src/main/resources/editor-webapp/assets/viewpoint_kernel.wasm</wasmFile>" pom.xml'
        - 'rm -f target/classes/editor-webapp/assets/viewpoint_kernel.wasm target/kernel/viewpoint_kernel.wasm'
        - 'JAVA_HOME=$HOME/.sdkman/candidates/java/25.0.4-tem ./mvnw --batch-mode -q package -Dmaven.test.skip -Dplugin.asciidoctor.skip=true'
        - 'bash -c ''set -e; unzip -p target/quarkus-app/app/archicode-*.jar editor-webapp/assets/viewpoint_kernel.wasm | cmp - <(git show 7742b07:src/main/resources/editor-webapp/assets/viewpoint_kernel.wasm); cmp target/classes/editor-webapp/assets/viewpoint_kernel.wasm target/kernel/viewpoint_kernel.wasm'''
        - 'bash -c ''d=$(mktemp -d); for t in java bash sh env uname dirname basename cat tr sed grep head mkdir rm ls wc cut; do p=$(command -v $t) && ln -s "$p" "$d/$t"; done; if JAVA_HOME=$HOME/.sdkman/candidates/java/25.0.4-tem PATH="$d" ./mvnw --batch-mode -o initialize > "$d/out.txt" 2>&1; then exit 1; fi; test "$(grep -c "^.ERROR.*rustup is not installed" "$d/out.txt")" -eq 1 && ! grep -q "^[[:space:]]*at org[.]" "$d/out.txt"'''
      risk: 'high'
      confidence: 70
      human_review: 'after'
      escalation_triggers:
        - 'the antrun failure prints a stack trace, or more than one line holds the sentence, or the line does not name rustup: record the measured output and fix the target (a property for the message, the fail task); stop and log it if no form gives one line (DEC-2)'
        - 'the PATH folder lacks a tool the wrapper needs: add that tool to the list, never cargo or rustup; if the wrapper needs the network, the first build with the network comes first (the plugin must be in ~/.m2)'
        - 'the Chicory plugin or the resource entries do not give the .wasm at editor-webapp/assets/ in the jar, or the jar copy differs from the file of 7742b07: stop and log it (ASM-5, CON-3)'
        - 'the pom holds lines of another run that an edit would drop: edit by anchor after a re-read, diff before and after, and stop if the edit needs more than the antrun execution, the wasmFile, its comment and the resources'
        - 'quarkus-maven-plugin, Failsafe, JaCoCo, the native profile or a PMD rule would have to change: stop and log it'
        - 'an editor:build is running (it writes standalone.html, which Maven copies): wait for it'
      delegation_tier: 'hard_judgment'
      results: 'tier hard_judgment, model sonnet, effort high, profile low-cost, passed first time, inline (leaf), independently verified'
    - id: task-004
      title: 'The change map follows: R-07a0 goes, R-20 becomes Java and Page, the reasons of R-07a, R-07 and R-20 are rewritten, the test rows follow'
      source_requirements:
        prd:
          - 'none: there is no PRD (profile TDD+pln); the REQ-n of the TDD are listed with the TDD items'
        tdd:
          - 'REQ-5'
          - 'TG-5'
          - 'DEC-7'
          - 'IMP-10'
      outputs:
        - 'scripts/changes.mjs (rule R-07a0 deleted; R-20 for scripts/** sends to Java and Page, its reason says build-editor.mjs is run by the node suite and the lint (Page) and that a tags.path of the model can name a script (Java); the reasons of R-07a and R-07 no longer name R-07a0 or embed.sh --check: R-07a says the assets are served beside the page and checked by node tests, R-07 says the Rust is built into the kernel of the jar and the page and tested by the Kernel job; R-07 keeps all four jobs, and embed.sh sits under src/main/rust so it keeps them too)'
        - 'src/test/javascript/changes-map.test.js (the row of the .wasm path is removed; the row of scripts/build-editor.mjs becomes java,page; a row for src/main/rust/viewpoint-kernel/embed.sh gives all four jobs)'
      verification:
        - 'node --test src/test/javascript/changes-map.test.js'
        - 'test "$(grep -c "R-07a0" scripts/changes.mjs)" -eq 0'
        - 'test "$(grep -c "embed.sh --check" scripts/changes.mjs)" -eq 0'
        - 'npx prettier --check scripts/changes.mjs src/test/javascript/changes-map.test.js'
        - 'npx eslint --max-warnings 0 scripts/changes.mjs src/test/javascript/changes-map.test.js'
      risk: 'medium'
      confidence: 85
      human_review: 'none'
      escalation_triggers:
        - 'the map test shows a path that falls to R-22 (all four jobs) by accident, or a rule that now sends a change to fewer jobs than the jobs that read the file: fix the rule, never the test'
        - 'the first-match order of the rules would have to change: stop and log it'
      delegation_tier: 'standard'
      results: 'tier standard, model sonnet, effort medium, profile low-cost, passed first time, inline (leaf), independently verified'
    - id: task-005
      title: 'The workflow: a Rust toolchain cache in Java, E2E, Build, Native and Page; the Kernel job loses its comparison; the stale comments are rewritten'
      source_requirements:
        prd:
          - 'none: there is no PRD (profile TDD+pln); the REQ-n of the TDD are listed with the TDD items'
        tdd:
          - 'REQ-5'
          - 'TG-5'
          - 'ASM-2'
          - 'ASM-3'
          - 'DEC-6'
          - 'DEC-9'
          - 'FLOW-3'
          - 'IMP-11'
          - 'RISK-1'
          - 'RISK-2'
          - 'Q-1'
      outputs:
        - '.github/workflows/ci-build.yaml (a step Cache the Rust toolchain, actions/cache@v6, paths ~/.rustup/toolchains, ~/.rustup/update-hashes, ~/.cargo/registry, ~/.cargo/git, key runner.os, runner.arch, -rust- and hashFiles of src/main/rust/viewpoint-kernel/rust-toolchain.toml and Cargo.lock, written inline like the existing Cache Maven packages steps, in Java before Build artifacts, in E2E before Build the packaged application, in Build with the if of PUBLISHES before the two deploy steps, in Native before Build the native image and run the integration tests against it, and in Page before the first node step that builds the kernel (Check the editor page is the assembly of its parts); no install step and no Build the kernel step; the step Check the committed WebAssembly is the one the Rust builds of the job Kernel is deleted; the comments of the jobs Page (Needs Node.js and rustup), Kernel (no comparison of a committed file, its toolchain comes from its first cargo command and is not cached here) and E2E (the cache note) and the other comments that name the committed .wasm are rewritten; the step Assemble website and the lines of other runs are not edited)'
      verification:
        - 'python3 -c "import yaml; yaml.safe_load(open(''.github/workflows/ci-build.yaml''))"'
        - 'test "$(grep -c "Cache the Rust toolchain" .github/workflows/ci-build.yaml)" -eq 5'
        - 'test "$(grep -c "Check the committed WebAssembly is the one the Rust builds" .github/workflows/ci-build.yaml)" -eq 0'
        - 'test "$(grep -c "embed.sh --check" .github/workflows/ci-build.yaml)" -eq 0'
        - 'python3 -c "import yaml; d=yaml.safe_load(open(''.github/workflows/ci-build.yaml'')); j=d[''jobs'']; n=lambda job: [s.get(''name'') for s in j[job][''steps'']]; assert all(''Cache the Rust toolchain'' in n(x) for x in [''Java'', ''E2E'', ''Build'', ''Native'', ''Page'']); assert n(''Java'').index(''Cache the Rust toolchain'') < n(''Java'').index(''Build artifacts''); assert n(''E2E'').index(''Cache the Rust toolchain'') < n(''E2E'').index(''Build the packaged application''); assert n(''Page'').index(''Cache the Rust toolchain'') < n(''Page'').index(''Check the editor page is the assembly of its parts''); assert n(''Native'').index(''Cache the Rust toolchain'') < n(''Native'').index(''Build the native image and run the integration tests against it''); assert n(''Build'').index(''Cache the Rust toolchain'') < n(''Build'').index(''Publish snapshot artifacts'')"'
        - 'test "$(git diff -U0 -- .github/workflows/ci-build.yaml | grep -c "Assemble website")" -eq 0'
      risk: 'high'
      confidence: 70
      human_review: 'after'
      escalation_triggers:
        - 'the cache step would need a shape the existing steps do not use (a composite action, a third-party action, an install step): stop and log it, DEC-6 rejected them for Native that checks out an older tag'
        - 'the step Assemble website would have to change, or the Kernel job needs a step that only a tag can prove: stop and log it (DEC-9)'
        - 'the file holds lines of another run that an edit would drop: edit by anchor after a re-read, diff before and after'
        - 'a step name that the Build job reads from the results of the other jobs (the Changes outputs, the needs list) would change: stop and log it'
      delegation_tier: 'hard_judgment'
      results: 'tier hard_judgment, model sonnet, effort high, profile low-cost, passed first time, inline (leaf), independently verified'
    - id: task-006
      title: 'The sentences and the model: six documents say what is true now, the kernel_wasm element follows, the sample bundle is rebuilt'
      source_requirements:
        prd:
          - 'none: there is no PRD (profile TDD+pln); the REQ-n of the TDD are listed with the TDD items'
        tdd:
          - 'REQ-4'
          - 'REQ-6'
          - 'TG-6'
          - 'DEC-8'
          - 'DEC-10'
          - 'IMP-12'
          - 'IMP-13'
      outputs:
        - 'CLAUDE.md (the sentence that says Maven needs no Rust and the .wasm is committed becomes the rule that ./mvnw and the npm scripts that read the kernel need rustup, that the file is built by embed.sh into target/kernel/viewpoint_kernel.wasm and put in the jar under its old path, and that the committed viewpoint_kernel.js and the ?v= hash of the page are still compared with it by editor:check; the Build and Test block says what npm ci and the first build need)'
        - 'src/main/rust/viewpoint-kernel/CLAUDE.md and README.md (the same rule; the embed.sh line says what the script now does: --out, --locked, rustup check, copy if different; the table and the Changing it section follow)'
        - 'src/main/editor/CLAUDE.md (encoded entries are read from target/kernel; the three embed.sh statements, the pre hooks that run kernel:build, the page that embed.sh assembled and --check, are rewritten)'
        - '.github/CLAUDE.md (the job Kernel has no comparison, R-07a0 is gone, the jobs that run ./mvnw or the kernel script and their Rust cache)'
        - 'src/test/CLAUDE.md (the node suite needs the kernel built: npm run kernel:build or any Maven build)'
        - 'docs/architecture/manifests/archicode.yaml (the component kernel_wasm keeps its id and its relationship; its description is The WebAssembly both tools run, built from the Rust by Maven (embed.sh). and its tags.path is src/main/rust/viewpoint-kernel/embed.sh)'
        - 'src/main/resources/editor-webapp/samples/archicode.yaml (npm run sample:build)'
      verification:
        - 'npm run sample:build'
        - 'npm run sample:check'
        - 'JAVA_HOME=$HOME/.sdkman/candidates/java/25.0.4-tem ./mvnw --batch-mode test -Dtest=ArchitectureImpactTest,ArchitectureDriftTest -Dsurefire.failIfNoSpecifiedTests=false'
        - 'test "$(grep -rn "Maven needs no Rust" --include=CLAUDE.md . --exclude-dir=node_modules --exclude-dir=target --exclude-dir=.git | wc -l)" -eq 0'
        - '! grep -nE -i "wasm.*committed|committed.*wasm" src/main/rust/viewpoint-kernel/CLAUDE.md src/main/rust/viewpoint-kernel/README.md'
        - '! grep -rnE "embed[.]sh --check|R-07a0" . --include=*.md --include=*.mjs --include=*.js --include=*.yaml --include=*.sh --include=*.adoc --include=*.json --include=*.toml --exclude-dir=wav --exclude-dir=node_modules --exclude-dir=target --exclude-dir=.git'
        - '! grep -n -i -E "embed[.]sh|is committed" src/doc/README.adoc'
        - 'grep -qF "src/main/rust/viewpoint-kernel/embed.sh" docs/architecture/manifests/archicode.yaml'
      risk: 'low'
      confidence: 80
      human_review: 'none'
      escalation_triggers:
        - 'ArchitectureDriftTest fails on a tags.path or an editor layer: fix the model, never the test; ArchitectureImpactTest Q01 expects the id of kernel_wasm, which does not change'
        - 'a sentence would state history (a wave, a run, an issue, a decision or a date) in a CLAUDE.md: rewrite it to what is true now'
        - 'a sentence would say that nothing compares the bytes of the kernel afterwards: it is false while editor:check compares the committed script and the page hash with the built kernel (resolution F2); the sentence that says what editor:check still compares is worded so that committed and wasm are not on one line of the kernel CLAUDE.md or README.md (resolution G2)'
        - 'the grep finds a reader of the old path or an old sentence in a file no task owns: stop and log it for the main agent'
      delegation_tier: 'standard'
      results: 'tier standard, model sonnet, effort medium, profile low-cost, passed first time, inline (leaf), independently verified'
    - id: task-007
      title: 'Gate of the run: REQ-1 to REQ-5 on a clean target, the same SHA-256 twice, the page and the assets unchanged by a rebuild, and the record with the unproved list'
      source_requirements:
        prd:
          - 'none: there is no PRD (profile TDD+pln); the REQ-n of the TDD are listed with the TDD items'
        tdd:
          - 'REQ-1'
          - 'REQ-2'
          - 'REQ-3'
          - 'REQ-4'
          - 'REQ-5'
          - 'DEC-8'
          - 'RISK-1'
          - 'RISK-2'
          - 'Q-1'
      outputs:
        - 'docs/wav/wav-035-maven-builds-kernel-and-page-likec4-import/run/run-0231-kernel-built-by-maven/prg-0231-kernel-built-by-maven.md (a block headed Gate results under Findings: each command, its exit code, the SHA-256 of the two clean builds, the local time of a clean build and of an up-to-date one, and the list of what is unproved until a tag run: the arm and macOS native targets, the website no longer publishing the .wasm (DEC-9), the Rust cache on a cold runner, the CI times per job)'
      verification:
        - 'test "$(git ls-files | grep -c viewpoint_kernel.wasm)" -eq 0'
        - 'bash -c ''set -e; export JAVA_HOME=$HOME/.sdkman/candidates/java/25.0.4-tem; d=$(mktemp -d); for i in 1 2; do rm -rf target; ./mvnw --batch-mode -q package -Dmaven.test.skip -Dplugin.asciidoctor.skip=true; unzip -p target/quarkus-app/app/archicode-*.jar editor-webapp/assets/viewpoint_kernel.wasm > "$d/jar-$i.wasm"; done; git show 7742b07:src/main/resources/editor-webapp/assets/viewpoint_kernel.wasm | cmp - "$d/jar-1.wasm"; cmp "$d/jar-1.wasm" "$d/jar-2.wasm"; sha256sum "$d/jar-1.wasm" "$d/jar-2.wasm"'''
        - 'test "$(grep -rn "Maven needs no Rust" --include=CLAUDE.md . --exclude-dir=node_modules --exclude-dir=target --exclude-dir=.git | wc -l)" -eq 0'
        - 'test "$(grep -c "Check the committed WebAssembly is the one the Rust builds" .github/workflows/ci-build.yaml)" -eq 0 && test "$(grep -c "embed.sh --check" .github/workflows/ci-build.yaml)" -eq 0 && test "$(grep -c "Cache the Rust toolchain" .github/workflows/ci-build.yaml)" -eq 5'
        - 'bash -c ''set -e; f=src/main/resources/editor-webapp; s=$(mktemp); sha256sum $f/standalone.html $f/assets/* > $s; npm run editor:build > /dev/null; sha256sum $f/standalone.html $f/assets/* | diff - $s'''
        - 'grep -q "Gate results" docs/wav/wav-035-maven-builds-kernel-and-page-likec4-import/run/run-0231-kernel-built-by-maven/prg-0231-kernel-built-by-maven.md'
      risk: 'medium'
      confidence: 75
      human_review: 'after'
      escalation_triggers:
        - 'the jar .wasm differs from the file of 7742b07, or the two clean builds give different SHA-256: stop and log it (ASM-1, CON-2); never overwrite a file to make it pass'
        - 'a command is red for a reason outside this run (no network for the toolchain or the crates, a base already red): record it with its reason, an environment gap is not a pass'
        - 'a rebuild of the page changes a byte of standalone.html or an asset: stop and log it'
        - 'REQ-3 was measured in task-003 and is not repeated here; if task-003 recorded a different count than 1, name it in the block'
      delegation_tier: 'standard'
      results: 'tier standard, model sonnet, effort medium, profile low-cost, passed first time, inline (leaf), independently verified'
```

## 5. Parallelization Plan

```yaml
parallelization_plan:
  groups:
    - id: parallel-group-001
      tasks:
        - task-002
        - task-004
      reason: 'Once embed.sh exists, the node side (build-editor.mjs, package.json, the helper and six test files) and the change map (scripts/changes.mjs and its test) touch disjoint paths'
      conflict_risks:
        - 'task-002 runs npm run kernel:build and editor:build, which write under target/kernel and src/main/resources/editor-webapp; task-004 runs only node --test on the map test and writes neither'
        - 'task-002 runs editor:build, which writes standalone.html: no Maven run may overlap it'
    - id: parallel-group-002
      tasks:
        - task-003
        - task-005
      reason: 'The pom with the removal of the committed file and the workflow touch disjoint paths once the node side reads target/kernel'
      conflict_risks:
        - 'task-003 runs Maven, which builds the kernel into target/kernel; task-005 runs only YAML and grep checks and builds nothing'
        - 'task-005 edits ci-build.yaml on top of lines another run may hold uncommitted: edit by anchors, diff before and after'
        - 'the wave runs its runs one after another (--max-parallel-runs 1); these groups are inside the one run'
```

## 6. Human Review Gates

```yaml
human_review_gates:
  gates:
    - id: gate-001
      trigger: 'The change adds a build dependency (rustup) to every ./mvnw and to five npm scripts, changes the build of the released jar and of three native binaries, and two of them (the arm and macOS targets) and the website are proved only by a tag run or a rehearsal dispatch'
      required_before: []
      required_after: ['task-003', 'task-005', 'task-007']
      reviewer_focus:
        - 'that the committed .wasm is gone, the jar holds the bytes of 7742b07 at the path it had, and the failure without rustup is one line that names it with no stack trace'
        - 'that no .rs, Cargo or toolchain channel line changed, the output of no command line changed (byte-identity.sh with its exceptions file unchanged), and the website step is untouched'
        - 'that the five cache steps are where the table of IMP-11 says, and that the list of what is unproved until a tag run is complete; the choice of a rehearsal dispatch before a tag (Q-1) is the author'
```

This run operates under no autonomy override (the progress log of the wave says "autonomy override: none"). The gate does not stop the run: no task is `human_required`, the three tasks it covers are `review_after`, and the review is the independent verification of each task (at the elevated pair for task-003 and task-005) together with the author's reading of the pull request.

## 7. Risk Assessment

```yaml
risk_assessment:
  by_task:
    - id: task-001
      risk: 'medium'
      rationale: 'One script is now the only place that knows how the kernel is built, and four callers rely on its bytes and its one-line failure; it must stay bash 3.2 compatible for the macOS runner.'
    - id: task-002
      risk: 'medium'
      rationale: 'Five scripts of npm and six test files change their source of the kernel; a stale or missing file shows only in a later command.'
    - id: task-003
      risk: 'high'
      rationale: 'It changes the build of the released jar and of the native binaries and deletes a tracked binary; the failure form of antrun and the order of the resources are measured, not assumed.'
    - id: task-004
      risk: 'medium'
      rationale: 'A first-match rule that silently drops a job from a change would hide a failure; the map test is the net.'
    - id: task-005
      risk: 'high'
      rationale: 'The workflow is proved by a pull request on one native target only; a wrong step or key fails a release build late.'
    - id: task-006
      risk: 'low'
      rationale: 'Prose and model upkeep with generated checks (drift, impact, sample).'
    - id: task-007
      risk: 'medium'
      rationale: 'Two clean builds from nothing, with the toolchain download on a first use; independent final check of the run.'
  by_area:
    - area: 'infra'
      risk: 'high'
      rationale: 'The jar, the three native binaries and the five CI jobs now depend on rustup; two targets and the website are proved only by a tag'
    - area: 'api'
      risk: 'low'
      rationale: 'No command, option or output of the program changes (CON-4); the server still answers 404 for the .wasm'
    - area: 'ui'
      risk: 'low'
      rationale: 'The page, its assets and the script are the committed bytes (CON-5); only the source of the kernel moves'
    - area: 'security'
      risk: 'low'
      rationale: 'The build downloads the toolchain and the crates of Cargo.lock (--locked) as the job Kernel already does; no secret, no new third-party action, no curl to sh'
    - area: 'docs'
      risk: 'low'
      rationale: 'The drift and impact tests, the sample check and the greps check the model and the sentences'
```

## 8. Confidence Assessment

```yaml
confidence_assessment:
  by_task:
    - id: task-001
      score: 80
      rationale: 'The script is small, the build was proved byte-identical on this machine, and the cmp and the mtime checks are commands.'
    - id: task-002
      score: 75
      rationale: 'The design is clear (DEC-4) and the node tests are the net; the unknown is any other reader of the old path.'
    - id: task-003
      score: 70
      rationale: 'The antrun failure form was spiked and the resource order is reasoned, but the PATH folder for the REQ-3 command and the exact count are found by running it.'
    - id: task-004
      score: 85
      rationale: 'Rules and test rows, with a test that lists every rule against a path.'
    - id: task-005
      score: 70
      rationale: 'A parse and an order check prove the file, but only the pull request and a tag run the jobs.'
    - id: task-006
      score: 80
      rationale: 'Documentation with generated checks and greps; the F2 wording is the care.'
    - id: task-007
      score: 75
      rationale: 'Two clean builds with the network and the toolchain; the figures depend on the machine.'
```

## 9. Agent Assignment Plan

```yaml
agent_assignment_plan:
  assignments:
    - task_id: task-001
      agent_role: 'Infrastructure Agent'
      objective: 'Rewrite src/main/rust/viewpoint-kernel/embed.sh as DEC-1, DEC-5 and CTR-2 say: usage embed.sh [--out FILE] (default target/kernel/viewpoint_kernel.wasm at the repository root); the first statement checks rustup with command -v and builtins only and prints one line error: rustup is not installed with the advice (https://rustup.rs) to stderr, exit 1, before dirname; an unknown option is error: unknown option and exit 2; keep the cd to the script folder (rust-toolchain.toml) and the RUSTFLAGS remaps; build with cargo build --release --locked --target wasm32-unknown-unknown into --target-dir the cargo folder beside FILE; write FILE through a temporary file and a move only when it is missing or cmp -s differs; drop the --check mode, the committed path and the node call; rewrite the header comment; keep bash 3.2 compatibility. Rewrite the comment of rust-toolchain.toml that says the .wasm is committed (comment lines only). Write embed-script.test.js first, red, then turn it green: bash embed.sh with PATH a fresh empty folder exits 1 with no stdout and one error line naming rustup; an unknown option exits 2 (skipped when rustup is not on the PATH).'
      context:
        prd_excerpts:
          - 'none: there is no PRD (profile TDD+pln); the REQ-n of the TDD are listed with the TDD items'
        tdd_excerpts:
          - 'DEC-1, DEC-5, CTR-1, CTR-2, IMP-1, IMP-2, IMP-9, ASM-1, CON-1, CON-2, CON-7 (the TDD file of this run)'
      likely_files:
        - 'src/main/rust/viewpoint-kernel/embed.sh'
        - 'src/main/rust/viewpoint-kernel/rust-toolchain.toml'
        - 'src/test/javascript/editor-build/embed-script.test.js'
      acceptance_criteria:
        - 'a build into a scratch folder is byte-identical to the file of 7742b07, and a second run does not touch the file (same mtime)'
        - 'with an empty PATH the script exits 1 with one error line naming rustup and nothing on stdout; an unknown option exits 2'
        - 'rust-toolchain.toml differs by comment lines only, and no .rs, Cargo.toml or Cargo.lock changed'
      verification:
        - 'bash -n src/main/rust/viewpoint-kernel/embed.sh'
        - 'node --test src/test/javascript/editor-build/embed-script.test.js'
        - 'bash -c ''set -e; d=$(mktemp -d); trap "rm -rf $d" EXIT; src/main/rust/viewpoint-kernel/embed.sh --out "$d/k/viewpoint_kernel.wasm"; git show 7742b07:src/main/resources/editor-webapp/assets/viewpoint_kernel.wasm | cmp - "$d/k/viewpoint_kernel.wasm"; m1=$(stat -c %Y "$d/k/viewpoint_kernel.wasm"); sleep 1; src/main/rust/viewpoint-kernel/embed.sh --out "$d/k/viewpoint_kernel.wasm"; test "$m1" = "$(stat -c %Y "$d/k/viewpoint_kernel.wasm")"'''
        - 'test -z "$(git diff -- src/main/rust/viewpoint-kernel/rust-toolchain.toml | grep -E "^[-+]" | grep -vE "^(\+\+\+|---)" | grep -vE "^[-+]#")"'
        - 'test -z "$(git status --short -- src/main/rust/viewpoint-kernel/src src/main/rust/viewpoint-kernel/Cargo.toml src/main/rust/viewpoint-kernel/Cargo.lock)"'
        - 'npx prettier --check src/test/javascript/editor-build/embed-script.test.js'
        - 'npx eslint --max-warnings 0 src/test/javascript/editor-build/embed-script.test.js'
      escalation_triggers:
        - 'the scratch build differs from the file of 7742b07: stop and log it'
        - 'cargo cannot run here: record an environment gap for the cmp line, never a pass'
      suggested_subagent_type: 'general-purpose'
      suggested_model: '(default)'
      suggested_effort: 'medium'
    - task_id: task-002
      agent_role: 'Frontend Implementation Agent'
      objective: 'Make the node side read target/kernel as DEC-4 and CTR-3 say: in scripts/build-editor.mjs add KERNEL_DIR = target/kernel and read an encoded entry from it (the output name and the text written stay as they are), with the missing-file sentence naming target/kernel/viewpoint_kernel.wasm and npm run kernel:build in the form the script uses for its errors; add kernel:build to package.json and put npm run kernel:build && before the node call of editor:build, the build part of editor:check, prelint, pretest:unit and pretest:coverage; add the CommonJS helper src/test/javascript/viewpoint-kernel/kernel-wasm.js (the path and a reader that throws the same one-line advice) and use it in the five tests that read the .wasm; move the fixture of build-editor.test.js under target/kernel of its tree and extend the missing-file expectation; in conformance.test.js change only the message of the assertion that the page names the kernel script by its hash from run src/main/rust/viewpoint-kernel/embed.sh to run npm run editor:build (resolution G1 of the preamble). Run npm run kernel:build, then editor:build, and confirm the page and the assets keep their bytes.'
      context:
        prd_excerpts:
          - 'none: there is no PRD (profile TDD+pln); the REQ-n of the TDD are listed with the TDD items'
        tdd_excerpts:
          - 'DEC-4, CTR-3, IF-2, IF-3, FLOW-2, IMP-5, IMP-6, IMP-7, IMP-8, RISK-3, CON-5, and resolution G1 of the preamble of this plan'
      likely_files:
        - 'scripts/build-editor.mjs'
        - 'package.json'
        - 'src/test/javascript/viewpoint-kernel/kernel-wasm.js'
        - 'src/test/javascript/viewpoint-kernel/compare.test.js'
        - 'src/test/javascript/viewpoint-kernel/contains-changes-union.test.js'
        - 'src/test/javascript/viewpoint-kernel/sibling-candidates.test.js'
        - 'src/test/javascript/viewpoint-kernel/patches.test.js'
        - 'src/test/javascript/viewpoint-kernel/change.test.js'
        - 'src/test/javascript/viewpoint-kernel/conformance.test.js'
        - 'src/test/javascript/editor-build/build-editor.test.js'
      acceptance_criteria:
        - 'npm run editor:build leaves every file under src/main/resources/editor-webapp as it was'
        - 'the five kernel tests and the build tests pass reading target/kernel, and a missing file gives the one-line sentence with the advice'
        - 'five npm scripts build the kernel first, kernel:build exists, no node file of the list names the old path of the .wasm, and no node test tells the reader to run embed.sh to assemble the page'
      verification:
        - 'node --test src/test/javascript/editor-build/build-editor.test.js'
        - 'npm run kernel:build'
        - 'test -f target/kernel/viewpoint_kernel.wasm'
        - 'node --test src/test/javascript/viewpoint-kernel/compare.test.js src/test/javascript/viewpoint-kernel/contains-changes-union.test.js src/test/javascript/viewpoint-kernel/sibling-candidates.test.js src/test/javascript/viewpoint-kernel/patches.test.js src/test/javascript/viewpoint-kernel/change.test.js'
        - 'npm run editor:build && test -z "$(git status --short -- src/main/resources/editor-webapp)"'
        - 'npm run editor:check'
        - 'grep -qF "\"kernel:build\": \"bash src/main/rust/viewpoint-kernel/embed.sh\"" package.json'
        - 'test "$(grep -c "npm run kernel:build &&" package.json)" -eq 5'
        - '! grep -rn "editor-webapp/assets/viewpoint_kernel.wasm" scripts/build-editor.mjs src/test/javascript/viewpoint-kernel src/test/javascript/editor-build'
        - '! grep -rn "embed[.]sh" src/test/javascript/viewpoint-kernel scripts/build-editor.mjs'
        - 'node --test src/test/javascript/viewpoint-kernel/conformance.test.js'
        - 'npx prettier --check scripts/build-editor.mjs "src/test/javascript/viewpoint-kernel/*.js" src/test/javascript/editor-build/build-editor.test.js'
        - 'npx eslint --max-warnings 0 scripts/build-editor.mjs "src/test/javascript/viewpoint-kernel/*.js" src/test/javascript/editor-build/build-editor.test.js'
      escalation_triggers:
        - 'editor:build changes a byte of a committed file: stop and log it, never keep the changed file'
        - 'build-editor.mjs would need to spawn a process: stop and log it'
      suggested_subagent_type: 'general-purpose'
      suggested_model: '(default)'
      suggested_effort: 'medium'
    - task_id: task-003
      agent_role: 'Infrastructure Agent'
      objective: 'Edit pom.xml by anchor after a re-read, as DEC-2 and DEC-3 say: add maven-antrun-plugin 3.2.0 (version pinned like the others) with execution id kernel, goal run, phase initialize, before the Chicory plugin, whose target loads the environment, sets the property kernel.missing-rustup to the sentence rustup is not installed: the viewpoint kernel is built from its Rust, install rustup from https://rustup.rs (Maven runs src/main/rust/viewpoint-kernel/embed.sh), sets rustup.found with an available check of rustup on ${env.PATH}, fails unless rustup.found with that message, then runs bash with embed.sh and --out ${project.build.directory}/kernel/viewpoint_kernel.wasm, failonerror; point the Chicory wasmFile at that same path and say in its comment where the .wasm comes from; declare two build resources, src/main/resources with an exclude of editor-webapp/assets/viewpoint_kernel.wasm (a leftover untracked copy must never reach the jar) and ${project.build.directory}/kernel with targetPath editor-webapp/assets and an include of viewpoint_kernel.wasm. Stage the removal of the committed file with git rm (no commit). Delete target/classes/editor-webapp/assets/viewpoint_kernel.wasm and target/kernel/viewpoint_kernel.wasm, run ./mvnw package without tests and the manual with JDK 25, check the .wasm in target/quarkus-app/app/archicode-*.jar is byte-identical to the file of 7742b07, then run the REQ-3 command in a PATH folder of symlinks (java, the wrapper tools, no cargo, no rustup) and record the measured count and whether any at org. line follows.'
      context:
        prd_excerpts:
          - 'none: there is no PRD (profile TDD+pln); the REQ-n of the TDD are listed with the TDD items'
        tdd_excerpts:
          - 'DEC-2, DEC-3, CTR-1, CTR-4, IF-1, IF-4, FLOW-1, IMP-3, IMP-4, ASM-4, ASM-5, CON-3, CON-6, RISK-5, RISK-7, and resolutions F1 and F3 of the preamble of this plan'
      likely_files:
        - 'pom.xml'
        - 'src/main/resources/editor-webapp/assets/viewpoint_kernel.wasm'
      acceptance_criteria:
        - 'git ls-files | grep -c viewpoint_kernel.wasm prints 0 and the working tree has no copy under src'
        - 'the jar holds the .wasm at editor-webapp/assets/ byte-identical to the file of 7742b07, and target/classes and target/kernel hold the same bytes'
        - 'without rustup on the PATH, ./mvnw -o initialize exits non-zero, one [ERROR] line holds the sentence naming rustup, and no at org. line follows'
        - 'quarkus-maven-plugin, Failsafe, JaCoCo and the native profile are untouched'
      verification:
        - 'git rm --quiet --cached --ignore-unmatch src/main/resources/editor-webapp/assets/viewpoint_kernel.wasm && rm -f src/main/resources/editor-webapp/assets/viewpoint_kernel.wasm'
        - 'test "$(git ls-files | grep -c viewpoint_kernel.wasm)" -eq 0'
        - 'grep -q "maven-antrun-plugin" pom.xml && grep -qF "${project.build.directory}/kernel/viewpoint_kernel.wasm" pom.xml && grep -qF "<exclude>editor-webapp/assets/viewpoint_kernel.wasm</exclude>" pom.xml'
        - '! grep -qF "src/main/resources/editor-webapp/assets/viewpoint_kernel.wasm</wasmFile>" pom.xml'
        - 'rm -f target/classes/editor-webapp/assets/viewpoint_kernel.wasm target/kernel/viewpoint_kernel.wasm'
        - 'JAVA_HOME=$HOME/.sdkman/candidates/java/25.0.4-tem ./mvnw --batch-mode -q package -Dmaven.test.skip -Dplugin.asciidoctor.skip=true'
        - 'bash -c ''set -e; unzip -p target/quarkus-app/app/archicode-*.jar editor-webapp/assets/viewpoint_kernel.wasm | cmp - <(git show 7742b07:src/main/resources/editor-webapp/assets/viewpoint_kernel.wasm); cmp target/classes/editor-webapp/assets/viewpoint_kernel.wasm target/kernel/viewpoint_kernel.wasm'''
        - 'bash -c ''d=$(mktemp -d); for t in java bash sh env uname dirname basename cat tr sed grep head mkdir rm ls wc cut; do p=$(command -v $t) && ln -s "$p" "$d/$t"; done; if JAVA_HOME=$HOME/.sdkman/candidates/java/25.0.4-tem PATH="$d" ./mvnw --batch-mode -o initialize > "$d/out.txt" 2>&1; then exit 1; fi; test "$(grep -c "^.ERROR.*rustup is not installed" "$d/out.txt")" -eq 1 && ! grep -q "^[[:space:]]*at org[.]" "$d/out.txt"'''
      escalation_triggers:
        - 'the antrun failure is not one line without a stack trace: record the measured output, try the property and fail forms, stop and log it if none works'
        - 'the jar copy differs from the file of 7742b07: stop and log it'
        - 'an edit would drop a line of another run in pom.xml, or a plugin outside the list would have to change: stop and log it'
      suggested_subagent_type: 'general-purpose'
      suggested_model: '(default)'
      suggested_effort: 'high'
    - task_id: task-004
      agent_role: 'Infrastructure Agent'
      objective: 'In scripts/changes.mjs delete rule R-07a0; make R-20 (scripts/**) send to Java and Page with a reason that says build-editor.mjs is run by the node suite and the lint (Page) and that a tags.path of the model can name a script (Java); rewrite the reasons of R-07a and R-07 so that neither names R-07a0 or embed.sh --check (R-07a: the assets are served beside the page and checked by node tests; R-07: the Rust is built into the kernel of the jar and the page and tested by the Kernel job, all four jobs). In src/test/javascript/changes-map.test.js remove the row of the .wasm path, make the row of scripts/build-editor.mjs java,page and add a row for src/main/rust/viewpoint-kernel/embed.sh with all four jobs.'
      context:
        prd_excerpts:
          - 'none: there is no PRD (profile TDD+pln); the REQ-n of the TDD are listed with the TDD items'
        tdd_excerpts:
          - 'DEC-7, IMP-10, REQ-5, TG-5, and resolution F4 of the preamble of this plan'
      likely_files:
        - 'scripts/changes.mjs'
        - 'src/test/javascript/changes-map.test.js'
      acceptance_criteria:
        - 'neither R-07a0 nor embed.sh --check is named in scripts/changes.mjs'
        - 'the map test passes with the three changed rows and no path falls to R-22 by accident'
      verification:
        - 'node --test src/test/javascript/changes-map.test.js'
        - 'test "$(grep -c "R-07a0" scripts/changes.mjs)" -eq 0'
        - 'test "$(grep -c "embed.sh --check" scripts/changes.mjs)" -eq 0'
        - 'npx prettier --check scripts/changes.mjs src/test/javascript/changes-map.test.js'
        - 'npx eslint --max-warnings 0 scripts/changes.mjs src/test/javascript/changes-map.test.js'
      escalation_triggers:
        - 'a rule would send a change to fewer jobs than the jobs that read the file: fix the rule, never the test'
        - 'the first-match order would have to change: stop and log it'
      suggested_subagent_type: 'general-purpose'
      suggested_model: '(default)'
      suggested_effort: 'medium'
    - task_id: task-005
      agent_role: 'Infrastructure Agent'
      objective: 'Edit .github/workflows/ci-build.yaml by anchors after a re-read, as DEC-6, IMP-11 and resolution S1 say: add one step Cache the Rust toolchain (actions/cache@v6; paths ~/.rustup/toolchains, ~/.rustup/update-hashes, ~/.cargo/registry, ~/.cargo/git; key runner.os, runner.arch, -rust- and hashFiles of rust-toolchain.toml and Cargo.lock of src/main/rust/viewpoint-kernel), written inline like the Cache Maven packages steps, to Java (before Build artifacts), E2E (before Build the packaged application), Build (with the if of PUBLISHES, before the two deploy steps), Native (before Build the native image and run the integration tests against it) and Page (before Check the editor page is the assembly of its parts); add no install step and no Build the kernel step; delete the step Check the committed WebAssembly is the one the Rust builds of the job Kernel; rewrite the comments of Page (Needs Node.js and rustup, the kernel is built into target/kernel by the scripts that read it), Kernel (no comparison of a committed file; the toolchain comes from its first cargo command and is not cached here) and E2E (the cache note) and any other comment that names the committed .wasm. Do not edit the step Assemble website.'
      context:
        prd_excerpts:
          - 'none: there is no PRD (profile TDD+pln); the REQ-n of the TDD are listed with the TDD items'
        tdd_excerpts:
          - 'DEC-6, DEC-9, FLOW-3, IMP-11 (the table of jobs), ASM-2, ASM-3, RISK-1, RISK-2, Q-1, and resolution S1 of the preamble of this plan'
      likely_files:
        - '.github/workflows/ci-build.yaml'
      acceptance_criteria:
        - 'Cache the Rust toolchain is found five times, once in each of the five jobs, before the step the table of IMP-11 names, and the file parses as YAML'
        - 'the step Check the committed WebAssembly is the one the Rust builds and the words embed.sh --check are gone, and the step Assemble website is not in the diff'
        - 'no comment of the file says the .wasm is committed or that a job needs only Node.js while it builds the kernel'
      verification:
        - 'python3 -c "import yaml; yaml.safe_load(open(''.github/workflows/ci-build.yaml''))"'
        - 'test "$(grep -c "Cache the Rust toolchain" .github/workflows/ci-build.yaml)" -eq 5'
        - 'test "$(grep -c "Check the committed WebAssembly is the one the Rust builds" .github/workflows/ci-build.yaml)" -eq 0'
        - 'test "$(grep -c "embed.sh --check" .github/workflows/ci-build.yaml)" -eq 0'
        - 'python3 -c "import yaml; d=yaml.safe_load(open(''.github/workflows/ci-build.yaml'')); j=d[''jobs'']; n=lambda job: [s.get(''name'') for s in j[job][''steps'']]; assert all(''Cache the Rust toolchain'' in n(x) for x in [''Java'', ''E2E'', ''Build'', ''Native'', ''Page'']); assert n(''Java'').index(''Cache the Rust toolchain'') < n(''Java'').index(''Build artifacts''); assert n(''E2E'').index(''Cache the Rust toolchain'') < n(''E2E'').index(''Build the packaged application''); assert n(''Page'').index(''Cache the Rust toolchain'') < n(''Page'').index(''Check the editor page is the assembly of its parts''); assert n(''Native'').index(''Cache the Rust toolchain'') < n(''Native'').index(''Build the native image and run the integration tests against it''); assert n(''Build'').index(''Cache the Rust toolchain'') < n(''Build'').index(''Publish snapshot artifacts'')"'
        - 'test "$(git diff -U0 -- .github/workflows/ci-build.yaml | grep -c "Assemble website")" -eq 0'
      escalation_triggers:
        - 'the cache step would need a composite action, a third-party action or an install step: stop and log it'
        - 'the step Assemble website would have to change: stop and log it (DEC-9)'
        - 'an edit would drop a line of another run: edit by anchor after a re-read, diff before and after'
      suggested_subagent_type: 'general-purpose'
      suggested_model: '(default)'
      suggested_effort: 'high'
    - task_id: task-006
      agent_role: 'Documentation Agent'
      objective: 'Make six documents say what is true now (no wave, run, issue, decision or date): CLAUDE.md and src/main/rust/viewpoint-kernel/CLAUDE.md replace the sentence that Maven needs no Rust and the .wasm is committed by the rule that ./mvnw and the npm scripts that read the kernel need rustup, that embed.sh builds the file into target/kernel/viewpoint_kernel.wasm (--out, --locked, rustup check, copy if different) and that the jar holds it under its old path, and say that editor:check still compares the committed viewpoint_kernel.js and the ?v= hash of the page with the built kernel (in the kernel CLAUDE.md and README.md word it so that the words committed and wasm never share a line, resolution G2: its grep and the gate flag such a line); README.md of the kernel says the same in its table and its Changing it section; src/main/editor/CLAUDE.md says encoded entries are read from target/kernel and rewrites its three embed.sh statements; .github/CLAUDE.md says the job Kernel has no comparison, R-07a0 is gone and which jobs build the kernel with their Rust cache; src/test/CLAUDE.md says the node suite needs the kernel built. In docs/architecture/manifests/archicode.yaml give the component kernel_wasm the description The WebAssembly both tools run, built from the Rust by Maven (embed.sh). and the tags.path src/main/rust/viewpoint-kernel/embed.sh (id and relationship unchanged); run npm run sample:build.'
      context:
        prd_excerpts:
          - 'none: there is no PRD (profile TDD+pln); the REQ-n of the TDD are listed with the TDD items'
        tdd_excerpts:
          - 'IMP-12, IMP-13, DEC-8, DEC-10, REQ-4, TG-6, and resolution F2 of the preamble of this plan'
      likely_files:
        - 'CLAUDE.md'
        - 'src/main/rust/viewpoint-kernel/CLAUDE.md'
        - 'src/main/rust/viewpoint-kernel/README.md'
        - 'src/main/editor/CLAUDE.md'
        - '.github/CLAUDE.md'
        - 'src/test/CLAUDE.md'
        - 'docs/architecture/manifests/archicode.yaml'
        - 'src/main/resources/editor-webapp/samples/archicode.yaml'
      acceptance_criteria:
        - 'no CLAUDE.md says Maven needs no Rust, and the kernel CLAUDE.md and README.md do not say the .wasm is committed'
        - 'embed.sh --check and R-07a0 are named nowhere outside docs/wav, and the manual says nothing about embed.sh or a committed kernel'
        - 'the drift and impact tests and the sample check pass, and no sentence says nothing compares the bytes afterwards'
      verification:
        - 'npm run sample:build'
        - 'npm run sample:check'
        - 'JAVA_HOME=$HOME/.sdkman/candidates/java/25.0.4-tem ./mvnw --batch-mode test -Dtest=ArchitectureImpactTest,ArchitectureDriftTest -Dsurefire.failIfNoSpecifiedTests=false'
        - 'test "$(grep -rn "Maven needs no Rust" --include=CLAUDE.md . --exclude-dir=node_modules --exclude-dir=target --exclude-dir=.git | wc -l)" -eq 0'
        - '! grep -nE -i "wasm.*committed|committed.*wasm" src/main/rust/viewpoint-kernel/CLAUDE.md src/main/rust/viewpoint-kernel/README.md'
        - '! grep -rnE "embed[.]sh --check|R-07a0" . --include=*.md --include=*.mjs --include=*.js --include=*.yaml --include=*.sh --include=*.adoc --include=*.json --include=*.toml --exclude-dir=wav --exclude-dir=node_modules --exclude-dir=target --exclude-dir=.git'
        - '! grep -n -i -E "embed[.]sh|is committed" src/doc/README.adoc'
        - 'grep -qF "src/main/rust/viewpoint-kernel/embed.sh" docs/architecture/manifests/archicode.yaml'
      escalation_triggers:
        - 'ArchitectureDriftTest fails: fix the model, never the test'
        - 'a sentence would carry history: rewrite it to what is true now'
        - 'the grep finds a reader or a sentence in a file no task owns: stop and log it'
      suggested_subagent_type: 'general-purpose'
      suggested_model: '(default)'
      suggested_effort: 'medium'
    - task_id: task-007
      agent_role: 'QA Agent'
      objective: 'Prove REQ-1 to REQ-5 on the final tree and record it: git ls-files holds no viewpoint_kernel.wasm; twice, remove target and run ./mvnw package without tests and the manual with JDK 25, extract the .wasm from the jar of target/quarkus-app/app, compare the first with the file of 7742b07 and the two with each other, and print their SHA-256; grep that no CLAUDE.md says Maven needs no Rust and that ci-build.yaml has no comparison step, no embed.sh --check and five cache steps; run editor:build and confirm the page and the assets keep their hashes. Append under Findings of the prg of the run a block headed Gate results with each command, its exit code, the two SHA-256, the local time of a clean build and of an up-to-date one, the count measured by task-003 for REQ-3, and the list of what is unproved until a tag run (the arm and macOS native targets, the website that no longer publishes the .wasm, the Rust cache on a cold runner, the CI times per job). Edit no file but that prg and start no dispatch.'
      context:
        prd_excerpts:
          - 'none: there is no PRD (profile TDD+pln); the REQ-n of the TDD are listed with the TDD items'
        tdd_excerpts:
          - 'REQ-1 to REQ-5, DEC-8, DEC-9, RISK-1, RISK-2, Q-1 (Observability and Verification of the TDD)'
      likely_files:
        - 'docs/wav/wav-035-maven-builds-kernel-and-page-likec4-import/run/run-0231-kernel-built-by-maven/prg-0231-kernel-built-by-maven.md'
      acceptance_criteria:
        - 'every command exits 0 or is named in the prg with its reason; the two SHA-256 are equal and the first build equals the file of 7742b07'
        - 'the unproved list is complete and says that the choice of a rehearsal dispatch is the author'
        - 'editor:build leaves the page and the assets unchanged'
      verification:
        - 'test "$(git ls-files | grep -c viewpoint_kernel.wasm)" -eq 0'
        - 'bash -c ''set -e; export JAVA_HOME=$HOME/.sdkman/candidates/java/25.0.4-tem; d=$(mktemp -d); for i in 1 2; do rm -rf target; ./mvnw --batch-mode -q package -Dmaven.test.skip -Dplugin.asciidoctor.skip=true; unzip -p target/quarkus-app/app/archicode-*.jar editor-webapp/assets/viewpoint_kernel.wasm > "$d/jar-$i.wasm"; done; git show 7742b07:src/main/resources/editor-webapp/assets/viewpoint_kernel.wasm | cmp - "$d/jar-1.wasm"; cmp "$d/jar-1.wasm" "$d/jar-2.wasm"; sha256sum "$d/jar-1.wasm" "$d/jar-2.wasm"'''
        - 'test "$(grep -rn "Maven needs no Rust" --include=CLAUDE.md . --exclude-dir=node_modules --exclude-dir=target --exclude-dir=.git | wc -l)" -eq 0'
        - 'test "$(grep -c "Check the committed WebAssembly is the one the Rust builds" .github/workflows/ci-build.yaml)" -eq 0 && test "$(grep -c "embed.sh --check" .github/workflows/ci-build.yaml)" -eq 0 && test "$(grep -c "Cache the Rust toolchain" .github/workflows/ci-build.yaml)" -eq 5'
        - 'bash -c ''set -e; f=src/main/resources/editor-webapp; s=$(mktemp); sha256sum $f/standalone.html $f/assets/* > $s; npm run editor:build > /dev/null; sha256sum $f/standalone.html $f/assets/* | diff - $s'''
        - 'grep -q "Gate results" docs/wav/wav-035-maven-builds-kernel-and-page-likec4-import/run/run-0231-kernel-built-by-maven/prg-0231-kernel-built-by-maven.md'
      escalation_triggers:
        - 'the jar .wasm differs from the file of 7742b07 or the two builds differ: stop and log it, never overwrite a file to make it pass'
        - 'a command is red for a reason outside this run: record it with its reason, an environment gap is not a pass'
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
        - 'unit test of the one-line failure'
        - 'bash syntax check'
        - 'cmp of a scratch build with the file of 7742b07'
        - 'mtime of a second run'
        - 'format check and lint of the test'
      success_criteria:
        - 'the build is byte-identical to the file of 7742b07 and an up-to-date run leaves the file alone'
        - 'an empty PATH gives exit 1 and one line naming rustup; the toolchain file changed by comments only'
    - task_id: task-002
      methods:
        - 'unit tests of the build script and of the five kernel tests'
        - 'editor:build and editor:check'
        - 'grep for the old path and the count of pre-scripts'
        - 'format check and lint'
      success_criteria:
        - 'the page and the assets keep their bytes after a rebuild'
        - 'every node reader of the kernel reads target/kernel and a missing file is one line with the advice'
    - task_id: task-003
      methods:
        - 'Maven package without tests with JDK 25'
        - 'cmp of the jar copy with the file of 7742b07'
        - 'a controlled PATH without cargo or rustup'
        - 'grep of the pom'
      success_criteria:
        - 'the jar holds the committed bytes of 7742b07 at the old path and git ls-files holds no .wasm'
        - 'the failure without rustup is one line that names it, with no stack trace'
    - task_id: task-004
      methods:
        - 'unit test of the map'
        - 'grep'
        - 'format check and lint'
      success_criteria:
        - 'no rule names R-07a0 or embed.sh --check and the map test passes'
    - task_id: task-005
      methods:
        - 'YAML parse'
        - 'step order check in Python'
        - 'grep'
        - 'diff check on the website step'
      success_criteria:
        - 'five cache steps in the five jobs before the steps that build, the comparison step gone, the website step untouched'
    - task_id: task-006
      methods:
        - 'sample build and check'
        - 'drift and impact tests'
        - 'grep for stale sentences'
      success_criteria:
        - 'the model and the sample tests are green'
        - 'no sentence says Maven needs no Rust or that the .wasm is committed, and none says nothing compares the bytes afterwards'
    - task_id: task-007
      methods:
        - 'two clean builds from nothing'
        - 'SHA-256 and cmp'
        - 'grep of the gate criteria'
        - 'rebuild of the page'
      success_criteria:
        - 'REQ-1 to REQ-5 hold on a clean target and the prg holds the results and the unproved list'
    - task_id: stage-11
      methods:
        - 'JAVA_HOME=$HOME/.sdkman/candidates/java/25.0.4-tem ./mvnw test-compile pmd:check'
        - 'JAVA_HOME=$HOME/.sdkman/candidates/java/25.0.4-tem ./mvnw verify -DskipITs=false'
        - 'npm ci, npm run test:unit, npm run test:coverage, npm run editor:check, npm run format:check, npm run lint'
        - 'scripts/byte-identity.sh with git diff --stat scripts/byte-identity-exceptions.txt empty'
        - 'npm run editor:build and git status --short unchanged but for the files of this run'
        - 'EditorHttpServerTest and EditorServeIT pass unchanged (part of verify with the integration tests)'
      success_criteria:
        - 'every command exits 0 or is named in the prg with its reason (REQ-6); an environment gap is not a pass'
        - 'what only a pull request or a tag proves (the workflow, the arm and macOS targets, the website) is listed as unproved'
```

## 11. Escalation Rules

```yaml
escalation_rules:
  rules:
    - condition: 'An assumption of the TDD is false in a way that changes a decision (ASM-1 the compiler output depends on the target directory, ASM-2 a runner lacks rustup, ASM-3 a restored toolchain is not used)'
      action: 'Stop the task, log it in the prg and let the main agent amend the TDD; never change a check to make it pass'
    - condition: 'The built kernel differs from the bytes of 7742b07, or two clean builds give different SHA-256'
      action: 'Stop and log: the kernel is unchanged in this run (Non-Goals); no .rs, Cargo or toolchain channel line may change to make the bytes match'
    - condition: 'The failure without rustup is not one [ERROR] line without a stack trace, or the REQ-3 count differs from 1'
      action: 'Record the measured output; adjust the antrun target; if no form gives one line, stop and log it (DEC-2); a count other than 1 that still means one line carries the sentence is recorded and kept'
    - condition: 'An edit would drop a line of another run in pom.xml or ci-build.yaml, or the step Assemble website would have to change'
      action: 'Edit by anchors and diff before and after; a change to the website step is stopped and logged (DEC-9)'
    - condition: 'byte-identity.sh needs a new exception or an existing command changes its output'
      action: 'Stop and log: this run must not change a command line output (CON-4)'
    - condition: 'A command fails for a reason outside this run (a base already red, no network for the toolchain or the crates, a browser not installed)'
      action: 'Record it in the task and do not fix it; a missing network or toolchain is an environment gap and not a pass'
    - condition: 'A sentence in a document would state history, or say that nothing compares the bytes of the kernel afterwards'
      action: 'Rewrite it to what is true now: editor:check compares the committed script and the page hash with the built kernel until the page leaves git'
    - condition: 'A task is flagged human_required or risk critical by a later edit'
      action: 'The wave has no autonomy override: the implement workflow stops with awaiting-human'
```

## 12. Final Execution Manifest

```yaml
execution_manifest:
  status: 'done'
  recommendation: 'proceed_with_review'
  autonomy_level: 'medium'
  total_tasks: 7
  autonomous_tasks: 4
  review_before_tasks: 0
  review_after_tasks: 3
  human_required_tasks: 0
  blocked_tasks: 0
  critical_path_tasks:
    - task-001
    - task-002
    - task-003
    - task-006
    - task-007
  parallel_groups:
    - parallel-group-001
    - parallel-group-002
  required_human_gates:
    - gate-001
  highest_risk_tasks:
    - task-003
    - task-005
    - task-001
  lowest_confidence_tasks:
    - task-003
    - task-005
    - task-007
  next_action: 'Stage 9: re-run the consistency scan of this plan against the TDD and the repository, then the implement workflow starts at task-001'
  criteria:
    - 'No WebAssembly is committed, the jar holds the bytes of 7742b07 at the path it had, and a second clean build gives the same SHA-256'
    - 'A missing rustup is one [ERROR] line that names it, from Maven, and one error line from embed.sh and the npm scripts'
    - 'The CLAUDE.md files, the model and the sample state what is true now, the comparison step of the Kernel job is gone and five jobs have the Rust cache'
    - 'The Stage 11 commands exit 0 with the byte-identity exceptions file unchanged, and the hand-off lists what is unproved until a tag run'
```
