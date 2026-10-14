---
type: prg
status: active
date: 2026-10-14
related:
  - docs/wav/wav-007-stable-stereotypes-and-nested-fills/wav-007-stable-stereotypes-and-nested-fills.md
wave: 007
---

# Progress Log: stable-stereotypes-and-nested-fills

## Log

- 2026-10-14: wave drafted on branch `fix/stereotype-order-and-nested-fills`. Before drafting, two consecutive generations of the current build on a copy of the user's target workspace (3,461 files) gave 0 differing files.
- 2026-10-14: `complete-wave` started. Wave `in-progress`. Batch 1 is W-1, W-2 and W-3 (no dependency between them), all `standard`; the three share `src/doc/README.adoc` and W-2 / W-3 share `standalone.html`, so the plan's `serialize` verdict applies: they are dispatched one after another, never concurrently (1 at a time), in the order W-1, W-2, W-3, each in its own `run-management:run-executor` subagent at the default model. Dispatching W-1 first as run 0031 (`docs/wav/wav-007-stable-stereotypes-and-nested-fills/run/run-0031-stable-stereotype-order/`).

## Findings

- A diff of the user's baseline and target (as-is 132 elements, to-be 165) gives 38 new, 5 removed, 25 changed elements and 79 new, 23 removed relationships: the case for tmorin/archicode#18, not part of this wave.

## Lessons Learnt

