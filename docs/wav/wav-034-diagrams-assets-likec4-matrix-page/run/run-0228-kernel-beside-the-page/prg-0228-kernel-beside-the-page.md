---
type: prg
status: completed
run: 0228
wave: 034
---

# Progress Log: Run 0228

## Log

- 2026-11-07: Stage 4 drafted tdd-0228 (no PRD; R-1 to R-9 assumed from row W-3 and gates 3, 4, 5, 8 of P2): the .wasm moves to editor-webapp/assets (one copy, Chicory wasmFile follows), assets.json gets a `files` list, loader fetches with instantiateStreaming (arrayBuffer fallback), ASSETS gets application/wasm, embed.sh checks without Node or Python, changes.mjs rule R-07a0; Q-1 (GitHub Pages MIME, unprovable before a tag) left open, non-blocking; Q-2 (Rust-diff gate wording vs embed.sh and notes) resolved by reading. Run status set to designing.
- 2026-11-07: Stage 5 KDMLLC review of tdd-0228 done by the stage agent inline against the repository (Review pass: dispatched; the reviewer is a different agent from the drafter); verdict Acceptable, 1 S3 and 4 S2 findings returned to the main agent, not applied here: IMP-8 omits five node tests that parse the base64 block (patches, change, conformance, contains-changes-union, sibling-candidates) and three that read or copy `src/main/wasm` (patches, conformance, yaml-parts) plus `.prettierignore` line 9; R-8 says `git diff --stat -- src/main/rust` prints nothing, contradicting IMP-7 and Q-2; R-3 start size 2,736,458 vs 2,736,735 in Current State; "Unresolved: none" while Q-1 is open; R-07a reason text and `.github/CLAUDE.md` sentence need rewording. No blocker.
- 2026-11-07: Stage 6 resolved the TDD's open questions: Q-2 already resolved by reading (Stage 4); Q-1 resolved by observation (a GitHub Pages .wasm answers application/wasm, checked with curl; the site's own file is proved only by a tag run, fallback kept), tdd-0228 Open Questions and Traceability line updated. No blocker.
- 2026-11-07: Stage 8 drafted pln-0228 (8 tasks, block-style YAML, wave: 034): task-001 move and build, task-002 loader and node tests, task-003 server, task-004 embed.sh and change map and CI comments (002-004 in one parallel group), task-005 e2e, task-006 website rehearsal and sizes, task-007 sentences and model, task-008 gates (review_after); the Stage 5 findings not applied to the TDD (missing node tests, R-8 Rust pathspec, R-3 start size) are carried in the pln preamble; Review pass: not run at this stage; complete_wave.py run --stage implement exits 0; run status set to planned. No blocker.
- 2026-11-07: Stage 9 C scan of pln-0228 against the TDD and the repository, done by the stage agent inline (no PRD; Review pass: dispatched, a different agent from the drafter): every ID cited by the 8 tasks (R-1 to R-9, TG, ASM, CON, DEC-1 to DEC-7, CTR, IF, FLOW-1 to FLOW-3, IMP, RISK, Q-1, Q-2) is defined in the TDD, with no invented scope; every output path exists or is the move target (src/main/wasm/viewpoint_kernel.wasm, 813,383 bytes; page 2,736,735 bytes; ratchet.max 99; .prettierignore line 9; pom.xml wasmFile); every file that still names src/main/wasm, viewpoint-kernel-wasm or octet-stream (grep outside docs/wav) is owned by a task, including the 8 node tests and the Stage 5 omissions; the step Assemble website already copies and compares the whole assets folder; blocking_gaps is empty, so nothing is carried to Stage 10; the pln was not edited and complete_wave.py run --stage implement still exits 0. No blocker.
- 2026-11-07: implement workflow stopped, state blocked: task not verified ["task-002: failed twice (npm run test:unit: 3547 pass, 1 fail: \"the real page: --statements HEAD passes\" (check-editor-statements.test.js:276): \"the top-level declarations differ: 1 only in HEAD, 1 only in the assembly; first only in HEAD: `/** Decode the embedded WebAssembly module ...`; first only in the assembly: `/** Fetch the WebAssembly module that sits beside the page ...` (produced by model/kernel-bridge.js:5)\". The check compares the assembled page with HEAD, so it can only hold after the change is committed. Because of it, npm run test:coverage reported \"the tests failed (exit 1): the coverage of a failing run is not judged\", so the floors could not be judged. Separately: npm run lint fails with scripts/build-editor.mjs 196:14 no-shadow ('file' already declared on line 171), a file from run 0227 that this task did not change. npm run format:check fails on src/test/java/io/morin/archicode/it/EditorServeIT.java, also not this task's file.)"]
- 2026-11-07: Stage 11 verification re-run in the working tree: editor:check, test:unit, format:check, lint exit 0; page 1,652,681 bytes with no octet-stream; the file beside the page is byte-identical to bfd0581's kernel and src/main/wasm is gone; no Rust diff; embed.sh --check exit 0; Maven verify, PMD, byte-identity and the e2e suite taken from the task-008 record above (not re-run here). All 3 pln criteria hold; pln status done, run and prg completed; docs/bkg/parked and tooling/docs/check-backlog.py do not exist in this repository (sweep not applicable); CI-arc-1/CI-dom-1 not applicable (no registers); CLAUDE.md files touched hold no ids or dates. Unproved: the real website step and the GitHub Pages content type until a tag run, macOS, Windows, native image, real Safari, real network. The earlier blocked line above is superseded by the task-008 gates.

## Findings

### Rehearsal of the step "Assemble website" (task-006)

- Method: the `run:` block of the step "Assemble website" of `.github/workflows/ci-build.yaml` (lines 441 to 472) was run with bash in a scratch folder that holds only a copy of `src/site/*`, `src/main/resources/editor-webapp` and a stub `target/generated-docs/index.html`, with `GITHUB_REF_NAME=archicode-9.9.9`. It exited 0, every `test -f`, `cmp` and `grep -q` of the block passed, and nothing was written outside the scratch folder.
- `target/site/editor/assets/` holds `codemirror.js`, `elk.js`, `viewpoint_kernel.wasm` and `THIRD-PARTY-NOTICES.txt`; `cmp` of the three against `src/main/resources/editor-webapp/assets/` passes (identical).
- Page size (`standalone.html`, bytes / gzip -9), before = `bfd0581` (kernel embedded as base64), after = the working tree:

  | | bytes | gzip |
  |---|---|---|
  | before | 2,736,735 | 769,847 |
  | after | 1,652,681 | 436,583 |

  The page is 1,084,054 bytes lighter (333,264 gzip). The kernel is a separate file of 813,383 bytes, fetched on the first diagram.
- Load time from `goto` to the first `g.dg-node`, hosted-style page (the Brightcart sample address, Chromium headless, local static server, 6 fresh contexts each, ms): before `489 461 469 461 462 473` (median 469), after `475 461 476 466 464 464` (median 466). No measurable difference on loopback; the gain of the lighter page and the cost of the one more request show only on a real network, which is not measured.
- Not proved here: the real step run by GitHub Actions on a tag, and the content type of `viewpoint_kernel.wasm` served by GitHub Pages, are unproved until a tag run.

### Gates of the run (task-008)

Every command was run in the working tree (nothing committed), independently of the authors, on 2026-11-07.

| Command | Exit |
|---|---|
| `npm ci && npm run editor:check` | 0 (1581 top-level names equal names.json, load order holds, upward pairs 98 of max 99) |
| sha256 of `assets/*`, `standalone.html`, `samples/*` before and after `npm run editor:build` and `npm run sample:build`, then `diff` | 0 (files unchanged) |
| `test ! -e src/main/wasm && git show HEAD:src/main/wasm/viewpoint_kernel.wasm \| cmp - .../assets/viewpoint_kernel.wasm` | 1 as written: HEAD (`b1b875d`) already holds the move, so `HEAD:src/main/wasm/...` does not exist. The same comparison against `bfd0581` (the last commit before the move) exits 0: the file beside the page is byte-identical to the earlier committed kernel; `src/main/wasm` is absent |
| page size `<= 1736458` and no `application/octet-stream` in `standalone.html` | 0 (1,652,681 bytes, 0 occurrences) |
| `npm run test:unit` | 0 |
| `npm run test:coverage` | 0 |
| `npm run format:check` | 0 |
| `npm run lint` | 0 |
| `./mvnw verify -DskipITs=false` (JDK 25) | 0 (BUILD SUCCESS, 58 integration tests, 0 failures) |
| `./mvnw test-compile pmd:check` | 0 |
| `scripts/byte-identity.sh` | 0 (21 workspaces, 344 commands, 274 identical, 69 accepted by the existing exceptions, 0 unexpected; no new exception) |
| `git diff --stat -- "src/main/rust/**/*.rs" "src/main/rust/**/Cargo*" "src/main/rust/**/rust-toolchain.toml"` | 0, prints nothing (against the working tree and HEAD; `bfd0581..HEAD` touches only `README.md` and `embed.sh` under `src/main/rust`, outside the pathspec) |
| `npx playwright test src/test/e2e/editor-offline.spec.js --project=chromium --project=firefox` | 0 (4 passed) |
| `src/main/rust/viewpoint-kernel/embed.sh --check` | 0 (a Rust toolchain is present; the committed WebAssembly is the one the sources build, 813,383 bytes) |

The earlier task-002 failures (`--statements HEAD`, lint `no-shadow`, `format:check` on `EditorServeIT.java`) no longer occur: the move is in HEAD and the three commands exit 0 now.

Unproved:

- the step "Assemble website" as run by GitHub Actions (only rehearsed by hand, see above);
- the content type of `viewpoint_kernel.wasm` on GitHub Pages for the site's own file (proved only by a tag run; the `arrayBuffer` fallback stays);
- macOS and Windows (the suites ran on Linux only);
- the native image (`./mvnw verify -Dnative` was not run);
- the real Safari (only Chromium and Firefox headless);
- a real network (load times measured on loopback only).

## Lessons Learnt

- Nothing yet.
