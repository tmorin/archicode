---
type: prg
status: active
date: 2026-10-18
related:
  - docs/wav/wav-015-editor-reshape-and-loose-ends/wav-015-editor-reshape-and-loose-ends.md
wave: 015
---

# Progress Log: editor-reshape-and-loose-ends

## Log

- 2026-10-18: wave 015 written (`write-wave`) after the close of wave 014, on the same branch (`feat/faithful-saves-and-stable-output`) and in the same pull request (63), as the author asked. It plans 18 runs in three phases, 17 on the `standard` tier and one (`W-14`, delete a plateau: data deletion) on `hard_judgment`; all are serialized (one run at a time, no `concurrent-safe` verdict). Sources: the open issues #24 to #27, #43, #44, #62, #79 to #81, #83 to #88, #90 to #93, #96 to #101 and #102 (the five findings of the `/code-review` of wave 014, filed for this wave). The decisions the plan takes for the author (T1 to T6) are in the plan.
- 2026-10-18: wave 015 starts. Batch 1 = the runs with no unmet dependency (W-1, W-2, W-3, W-6, W-7, W-8, W-11, W-15), all serialized by the plan (shared `standalone.html`, `cli/**`, the kernel and the wasm; no `concurrent-safe` verdict), so one run at a time in the order of the plan. Dispatching W-1 (run 0089, `review-findings-and-orders`), `standard` (`run-management:run-executor`), concurrency 1.
- 2026-10-18: W-1 (run 0089, `standard`, `run-management:run-executor`, profile `single-document`) returned `completed`, commit `c7eb179` (not pushed), `Fixes #83`, `#88`, `#102`. Verified from disk and by me: run status `completed`; the commit holds the 22 files it lists; `dropInheritedReplaces` is gone from `src/main`; I re-ran `ComparisonLoadTest`, `FacetOrderTest`, `ManifestDiscoveryTest`, `LayerLoaderTest`, `BrightcartOutputFolderTest` and `BrightcartLayeredDiffTest` (pass); the full gate is verified at the end of P0. Canonical impact: answered in the run document (section *Canonical impact*). Deviations the run recorded and I accept: (1) the inherited `replaces` is decided where the kernel's graph is built (`PlateauComparer.carries` given to `KernelGraph.of`) and not by the plan's sentence "an element the target does not declare itself carries no `replaces`", which would change pinned numbers (whether an entry is news depends on the plateau compared with); the checkable criterion holds (`dropInheritedReplaces` is gone, every pair keeps its numbers); (2) T4 reads "both `gap.json` and `gap.md`" and not "or" (a lone `gap.json` may be an author's manifest). Out-of-path files: `standalone.html` (the same rule in the editor), `discovery-cases.json`, `discovery.test.js`, `brightcart-kernel.test.js` (a comment), `CLAUDE.md`: no collision (serialized). For W-18: the manual (`README.adoc` near lines 165 and 1336) still says other commands read the `-o` folders and lists #88 as a limit; facet warnings now come in the order of the file (differs from `25471b3` on stderr only).
- 2026-10-18: dispatching W-2 (run 0090, `cli-fail-on-and-only-changes`), `standard`, concurrency 1 (next in the serialized order).
- 2026-10-18: W-2 (run 0090, `standard`, `run-management:run-executor`, profile `single-document`) returned `completed`, commit `6d476b6` (not pushed); no `Fixes` line (#25 and #26 are only half done, as planned). Verified from disk and by me: run status `completed`; the commit holds `FailOn.java`, `DiffCommand`, `GenerateViewsCommand`, `ErrorOutput`, `reflect-config.json`, `ci-build.yaml`, `CLAUDE.md` and the two new test classes; I re-ran `DiffFailOnTest`, `OnlyChangesTest` and `NativeReflectionConfigTest` (pass); the full gate is verified at the end of P0. Canonical impact: answered in the run document. Out-of-path file: `reflect-config.json` (the `FailOn` entry; `NativeReflectionConfigTest` requires it); no collision. For W-17: `domain_plateaus` has the six states (exit 3 and exit 1 are testable there), `plateau-comparison` shows exit 0. For W-18, the manual must say: the `--fail-on` words and `any` (the six row states, not `contains-changes`), repeatable option, exit codes 3/1/2, `--no-wording` rows do not count, what `--only-changes` trims and that it is an error without a comparison, and that `--baseline-ref` and the wrapped table are not built. For the re-aiming of #26: its clean-errors item was done earlier, `plateau add --adopt` is moot.
- 2026-10-18: dispatching W-3 (run 0091, `toml-manifests-and-group-kinds`), `standard`, concurrency 1.

## Findings

## Lessons Learnt
