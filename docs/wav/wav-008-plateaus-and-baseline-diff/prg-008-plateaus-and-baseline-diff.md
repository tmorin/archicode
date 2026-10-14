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
- 2026-10-14: W-1 (run 0034) returned; verified from disk, not from its report: the run status file says `completed` (`single-document`, no pln); `./mvnw -o verify` re-run by the orchestrator, exit 0; `node --test` 607 pass, 0 fail (re-run); `npx prettier --check` clean; the diff of `ManifestParser.java` read. Files touched: all inside W-1's `likely_paths`, plus `src/doc/README.adoc` as asked. Committed as the one commit of run 0034. Batch overlap check: W-1 ran alone (serialized before W-2).

## Findings
- Run 0034: a duplicate reference is now an error in the CLI (one `ArchiCodeException`, all duplicates sorted in one message naming both files; identical copies count too) and a visible error state in the editor (not blocking: the author must still be able to open the files to fix them; no diagram is drawn while an element is duplicated). Views and stories had the same defect and got the same check. Not caught: an inline element of `workspace.yaml` with the reference of a manifest, and a legacy view or story of `workspace.yaml` (the editor shadows it on purpose). The check runs once per `ManifestParser.parse` call and once per `buildIndex` call, so W-2 only needs to call it once per plateau. Verified byte-identical on 5,003 `.puml` (7 fixtures plus copies of the real as-is and to-be).

## Lessons Learnt

