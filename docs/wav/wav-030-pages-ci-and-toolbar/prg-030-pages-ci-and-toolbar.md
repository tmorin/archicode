---
type: prg
status: active
date: 2026-11-01
related:
  - docs/wav/wav-030-pages-ci-and-toolbar/wav-030-pages-ci-and-toolbar.md
wave: 030
---

# Progress Log: pages-ci-and-toolbar

## Log

- 2026-11-01: wave drafted from the issues the author named: #192, #193, #194, #195 and #199. The query commands (#184, #187, #189) were drafted first as wave 030 and moved to wave 031.
- 2026-11-01: the author decided runs are sequential only, never in parallel (concurrency 1, order W-1 to W-8).
- 2026-11-01: decisions of the author from the decision page: D1 one wave of 8 runs; D2 the graph draft stays as wave 031, after 030; D3 the toolbar builds P-1, P-2, P-7 and P-8 as proposed (Q1); D4 the *Best Practices* promises of label formatting and diagram styling are dropped and W-5 notes it (Q2). Q3 stays open for W-6.

## Findings

- The Pages publish step of `.github/workflows/ci-build.yaml` copies `src/site/index.html` only (`sed` into `target/site/index.html`): `robots.txt`, `sitemap.xml` and `llms.txt` need a copy line in that step.

## Lessons Learnt

- (none yet)
