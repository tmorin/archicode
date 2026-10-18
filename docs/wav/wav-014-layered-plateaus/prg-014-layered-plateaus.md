---
type: prg
status: active
date: 2026-10-18
related:
  - docs/wav/wav-014-layered-plateaus/wav-014-layered-plateaus.md
wave: 014
---

# Progress Log: layered-plateaus

## Log

- 2026-10-18: wave drafted from the author's decisions of the day (remove `settings.plateaus` now; plateau by `plateau:` header whatever the folder; `Kind: Plateau` with `name` and `override`; `REMOVE`, `SET`, `ADD`, `MERGE`; the whole Timeline in the editor; `--baseline` renamed `--against`; no migration), the study of 2026-10-17 and the Brightcart fixture. Widened the same day, at the author's request, with the carried-over fixes (phase P0, W-14 to W-17).
- 2026-10-18: the `/code-review` of wave 013 (diff `6575892..25471b3`) was run in a sub-agent (7 findings); the orchestrator checked them against the code and the tools (the unknown kind `null` and the order of the checks reproduced on a copy; the manual settles the `line-gap` one as documented behaviour), reported six through ReportFindings (four confirmed, two plausible) and filed them as #77. W-17 fixes #77.

## Findings

## Lessons Learnt
