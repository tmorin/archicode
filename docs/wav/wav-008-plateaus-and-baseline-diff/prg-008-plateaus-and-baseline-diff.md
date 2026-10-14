---
type: prg
status: active
date: 2026-10-14
related:
  - docs/wav/wav-008-plateaus-and-baseline-diff/wav-008-plateaus-and-baseline-diff.md
wave: 008
---

# Progress Log: plateaus-and-baseline-diff

## Log

- 2026-10-14: wave drafted on branch `feat/plateaus-and-baseline-diff`, stacked on `fix/stereotype-order-and-nested-fills` (PR 21, open, CI green): it needs wave 007's stable order, outline and label wrapping.
- 2026-10-14: `complete-wave` started, on the author's instruction to finish the wave autonomously in this branch (no push). Wave `in-progress`. 8 runs, all `standard`, 0 `hard_judgment`; no batch runs concurrently, because every pair that shares a phase overlaps on `README.adoc`, `standalone.html` or the loaders (the plan's `serialize` verdicts), so one `run-management:run-executor` at a time at the default model. Batch 1: W-1 and W-2 (no dependency between them), serialized in that order. Dispatching W-1 as run 0034 (`docs/wav/wav-008-plateaus-and-baseline-diff/run/run-0034-duplicate-reference-error/`).

## Findings

## Lessons Learnt

