---
type: prg
status: active
date: 2026-11-07
related:
  - docs/wav/wav-035-maven-builds-kernel-and-page-likec4-import/wav-035-maven-builds-kernel-and-page-likec4-import.md
wave: 035
---

# Progress Log: maven-builds-kernel-and-page-likec4-import

## Log

- 2026-11-07: drafted from the `ready` issues #207 (the road after wave 034: the kernel, then the page, built by Maven) and #134 (the LikeC4 importer, resumed from the design of run 0229). #24 left out: delivered as far as decided, no decision for the rest. To be launched with `--max-parallel-runs 1`.
- 2026-11-07: adjusted to `run-management` 3.3.0 (a cancelled run that no live run depends on no longer blocks the closing of the wave; a failed verification is no longer read as verified): the case of a missing LikeC4 sample is written into the Decision Prerequisites, the Risks and the Completion Criteria. Generate the workflow with that version.

## Findings

- #24 has the label `ready` and the title "(the file is done)", but its page was delivered by wave 034; what is left has no decision of the author.
- The comments of #207 still say wave 034 is "not merged yet"; it is on `main`.

## Lessons Learnt

- Nothing yet.
