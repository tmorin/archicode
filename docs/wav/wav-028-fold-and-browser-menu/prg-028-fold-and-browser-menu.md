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

## Findings

- The editor's line-preserving save is about 3,200 lines of JavaScript (`yaml-patch-text`, `yaml-patch-lines`, `yaml-patch-flow`, `yaml-block-moves`, `save.js`) plus the YAML parser (1,570 lines) and five `save-*` test files; 33 of the repository's 638 commits name quotes, comments, brackets, anchors or block scalars. Size only: no audit of its security was made.
- `editor serve` exposes only `/api/fs/info`, `/api/fs/list` and `/api/fs/file`; a fold action in the editor needs a new endpoint, not in this wave.
- Java to WASM: TeaVM's WASM GC backend is its main WebAssembly target; GraalVM Web Image is experimental; no Quarkus extension compiles Java to WASM (Quarkus Chicory runs WASM). WASM GC may be above the editor's browser floor (ASM-7): to check in a spike, not in this wave.

## Lessons Learnt

- (none yet)
