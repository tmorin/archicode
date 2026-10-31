---
type: wbc
wave: 028
status: completed
date: 2026-10-30
related:
  - docs/wav/wav-025-hosted-editor/run/run-0190-plateau-fold-analysis/run-0190-plateau-fold-analysis.md
  - docs/wav/wav-027-editor-layout-and-walk/wav-027-editor-layout-and-walk.md
  - docs/wav/wav-027-editor-layout-and-walk/rfc/rfc-002-diagram-toolbar.md
---

# Wave 028 — Fold and browser menu — Business Case

## Context

Three open issues are in this wave: #182 (in a browser workspace the *Workspace* menu draws its items on top of each other and the top bar goes past the window), #65 (`plateau fold`, the command that folds a plateau into the one above it) and #24 (a reading of N plateaus at once, which has no layout yet).

The registers: `docs/bkg` and `docs/ana` do not exist in this repository; the backlog is GitHub. Run 0190 of wave 025 analysed #65 and recommended building it later, with the semantics settled (one plateau above: fold; several: refuse; siblings: untouched; steps naming it, `settings.current`, the root and a leaf: refuse). Wave 026 repaired the manual's by-hand recipe as that analysis asked. The author's answers of 2026-10-30 are the decisions D1 to D4 of the plan.

Not in the wave: the diagram toolbar of RFC-002 (the author's decisions stay recorded, the build waits), the importers #134 and #135, an editor action for fold, and any new work on the long tail of the line-preserving YAML save.

## Problems / Opportunities

- A visitor who opens the sample in a narrow window cannot read the *Workspace* menu or reach *Close workspace*.
- Folding a plateau is mechanical, but the manual makes the author edit several manifests by hand and check the result with `diff`. A command can do it and prove it.
- #24 cannot start: the issue itself asks for a mock-up before any work, and nobody has drawn one.

## Options & Recommendation

1. **Fold by rewriting the files from the resolved model, in Java only (recommended).** The command computes the state of the plateau it folds, as `diff` already does, and writes the manifests that change. No new engine: the editor's JavaScript writer, the Rust kernel and a Java-to-WASM build stay out. The cost is that the rewritten files lose their comments, quotes and layout, which the dry-run announces file by file; git is the safety net.
2. **Fold by editing the lines of the manifests (the recipe, automated).** Keeps comments, but needs a YAML text patcher in Java that matches the editor's, a second implementation of what took waves to get right. Rejected.
3. **A fold entry in the Rust/WASM kernel, or a Java-to-WASM module (TeaVM).** One implementation for the CLI and every editor mode, but a third engine, a changed contract and a browser floor to check (WASM GC). Rejected for now; the pure Java class keeps the door open.
4. **Put the toolbar of RFC-002 in this wave.** Rejected by the author for now.

Recommendation: option 1, in two runs (a dry-run that plans and refuses, then the writer), with #182 first because it is small and independent, and #24 as a design run with no code.

## Vision

A visitor in a narrow window reads the *Workspace* menu and reaches every button of the top bar. An author who has finished with a plateau runs `archicode plateau fold <id> --dry-run`, reads the plan, the refusals and the files that will lose their comments, runs it again without the option, and `plateau list`, `diff` and `views generate` give the same results for every plateau that stays. The author has a written layout for the N-plateaus reading that a later wave can build. The fold logic is a pure Java class that an `editor serve` endpoint can call later.
