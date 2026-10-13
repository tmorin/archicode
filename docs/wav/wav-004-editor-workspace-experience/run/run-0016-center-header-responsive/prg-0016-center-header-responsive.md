---
type: prg
status: completed
date: 2026-10-13
run: 0016
wave: 004
related:
  - docs/wav/wav-004-editor-workspace-experience/run/run-0016-center-header-responsive/run-0016-center-header-responsive.md
---

# Progress Log: run 0016, centre header responsive

## Log

- 2026-10-13: Run set up (profile `TDD+pln`: Stages 1-3 skipped). Studied the header (markup, CSS, tests that read it).
- 2026-10-13: The breakpoints could only be answered by measuring a real layout, so the CSS and markup were prototyped
  first (tasks 001-002) and measured in the built-in browser on a replica (static page from the harness markup plus the
  stylesheet, served by a throwaway local server, a 40-character name, widths 240-1500px). The TDD was written with the
  measured limits. The order TDD-after-prototype is a deviation from `complete-run`, recorded in the pln.
- 2026-10-13: Stage 5 KDMLLC review of the TDD dispatched (standard tier); its findings are applied below.
- 2026-10-13: Review findings applied (code: reset at workspace load, Escape ignores a stale state; TDD: FLOW-2, basis of the figures, DEC-6, TG-1, DEF-3). Tasks 005 (new tests, 29) and 006 (manual) dispatched, each verified by this session (mutation checks, suites). Run completed: see the Results of the pln.

## Findings

- A container query adds no specificity: the first prototype put the container block before the base `.element-header`
  rules and the two-row fallback silently did not apply (header stayed 48px). Moved after the base rules; the new test
  asserts the order.
- `.center-panel` as the container works: its width comes from the grid, not its content.
- The estimates of the plan (1150/950/700) would have left the longest header's name under 8rem; measured limits are
  85rem / 60rem / 46rem of content width.

## Lessons Learnt

- Measure responsive limits on a replica in a real browser before writing them down; the harness has no layout.
