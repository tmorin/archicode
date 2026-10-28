---
type: wbc
wave: 026
status: planned
date: 2026-10-28
related:
  - docs/wav/wav-025-hosted-editor/wav-025-hosted-editor.md
  - docs/wav/wav-025-hosted-editor/run/run-0190-plateau-fold-analysis/run-0190-plateau-fold-analysis.md
---

# Wave 026 — Relationship view — Business Case

## Context

Wave 025 (closed 2026-10-28) put the editor in the browser: sample, browser workspace, bundle. The open issues, evaluated on 2026-10-28:

- **#143**, a view built on relationships. Decided by the author on 2026-10-23 (D11, comment on the issue) "for a wave after the story player (#153)", which wave 021 shipped: application layer only in v1; a `links` property of the existing `map` (no new `viewpoint` value); a highlight that is a property of the step and of the view; a relationship named by (layer, source, destination, label), the triple `compare` already keys on; the story player plays these views. Probable cut written by the author: kernel, command line and byte-identity of the existing views; highlight; the editor's list and clicks; story integration; manual.
- **#177**, a bug seen in the hosted editor after wave 025: the name field of a new browser workspace is drawn about 10rem tall (`.landing-browser-input { flex: 1 1 10rem }` in a column flex container). Small, visible on the first screen a visitor sees.
- **#65**, `plateau fold`: the analysis of wave 025 (run 0190) recommends "build later, and fix the manual's recipe now": the by-hand recipe misses the composition of the `replaces` of the plateau above and says one column of the cascade changes where two do. The repair is a documentation change with a check on the Brightcart fixture; the build waits for the author.

Not in this wave: #134 and #135 (importers: blocked on a public sample under a compatible licence, D12), #24 (no mock-up), #155 L3 and L4 (limits pinned on 2026-10-23), and the build of `plateau fold` (the author has not asked for it after reading the analysis). Nothing in `docs/bkg` or `docs/ana` covers this ground (neither register exists in this repository).

## Problems / Opportunities

- The Map pages are built on elements: to show a path through the architecture the author picks every box on it, and the links drawn are whatever those boxes happen to share. A story that lights up a sequence of calls (browser, API, payment service, bank) cannot be told without building each step by hand. #143 is the largest decided feature left, and it is the first thing that makes the story player (#153) tell a flow and not only a state.
- #177 spoils the first impression of the hosted editor that wave 025 just shipped.
- The manual's fold recipe is the only tool the author has for #65, and it is wrong in two places.

## Options & Recommendation

1. **#177, the recipe repair and #143 in four runs (recommended).** A short phase of fixes (two runs that touch nothing in common), then the feature cut at the places the author drew: kernel and command line, highlight, the editor's list and clicks, stories and manual. The kernel comes first because the editor draws with the same WebAssembly, and the existing views must stay byte for byte.
2. **#143 alone.** Leaves a visible bug on the page of the last wave and the known error in the manual for another wave.
3. **Build `plateau fold` (#65).** Rejected: the analysis says build later and the author has not asked; the cost is about one large run (a YAML writer that keeps comments) for a command nobody is waiting on.
4. **#143 as one large run.** Rejected: kernel contract, byte-identity, editor interaction and story integration have distinct evidence and fail in distinct ways; the author's own cut has them apart.

## Vision

An author writes `links` in a Map view (or ticks relationships in a list, or clicks them on the diagram), and the boxes drawn are the ends of those relationships with their ancestors, in the command line and in the editor alike. A story step can name that view and highlight the relationship it is about; the story player plays it, one link after the other. Every Map saved before the wave is drawn exactly as it was. The name field of a new browser workspace is one line high, and the manual's recipe for folding a plateau gives the same `plateau list` and `diff` before and after.
