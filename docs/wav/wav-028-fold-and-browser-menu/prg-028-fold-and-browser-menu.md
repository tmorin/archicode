---
type: prg
status: active
date: 2026-10-30
related:
  - docs/wav/wav-028-fold-and-browser-menu/wav-028-fold-and-browser-menu.md
wave: 028
---

# Progress Log: fold-and-browser-menu

## Log

- 2026-10-30: wave drafted from #182, #65 and #24. The author decided: D1 a design run for #24 goes in this wave; D2 the refusals of `plateau fold` are final, one `error:` sentence each, nothing written; D3 fold rewrites the files from the resolved model, in Java only, the rewritten files lose their comments (the dry-run says so), the fold logic is a pure Java class so that an `editor serve` endpoint can call it later; D4 two runs, the dry-run then the writer. The toolbar of RFC-002 is left out for now. The author also challenged the cost of the line-preserving YAML save: its core stays, its long tail is frozen (no new run for a rare layout).
- 2026-10-30: batch 1 (phase P1) = W-1+W-2; cost profile low-cost; overrides of declared tiers: gate P3: a member run is sensitive, the gate agent takes the elevated pair sonnet/high | run W-4 declared hard_judgment with a delegation_reason: verification agent raised to sonnet/high; executor kept at sonnet/high; autonomy override: none; tiers: W-1 standard (sonnet, effort high); W-2 standard (sonnet, effort high); concurrency per lane: 2; lanes run one after another, runs inside a lane in parallel, lanes split on declared likely_paths overlap; one leaf agent per run (run-management:run-executor); written before dispatch by the generated workflow.
- 2026-10-30: wave workflow stopped, state awaiting-commit: [{"run":"W-1","number":"0205","stage":"implement","tasks":[{"task":"task-004","title":"Run the gate commands","files":["src/main/editor/layers.json","target/quarkus-app/quarkus-run.jar"],"outside_likely_files":[],"check":"The `npm run test:unit` exit-0 criterion cannot be met without a commit. `check-editor-statements.test.js:276` compares the page with `HEAD`, and the intended `src/main/editor/style.css` change is uncommitted. The operator should commit the change and re-run `npm run test:unit` to confirm that test passes.","git_add":"git add -- src/main/editor/layers.json target/quarkus-app/quarkus-run.jar"}]}]

## Findings

- The editor's line-preserving save is about 3,200 lines of JavaScript (`yaml-patch-text`, `yaml-patch-lines`, `yaml-patch-flow`, `yaml-block-moves`, `save.js`) plus the YAML parser (1,570 lines) and five `save-*` test files; 33 of the repository's 638 commits name quotes, comments, brackets, anchors or block scalars. Size only: no audit of its security was made.
- `editor serve` exposes only `/api/fs/info`, `/api/fs/list` and `/api/fs/file`; a fold action in the editor needs a new endpoint, not in this wave.
- Java to WASM: TeaVM's WASM GC backend is its main WebAssembly target; GraalVM Web Image is experimental; no Quarkus extension compiles Java to WASM (Quarkus Chicory runs WASM). WASM GC may be above the editor's browser floor (ASM-7): to check in a spike, not in this wave.

## Lessons Learnt

- (none yet)
