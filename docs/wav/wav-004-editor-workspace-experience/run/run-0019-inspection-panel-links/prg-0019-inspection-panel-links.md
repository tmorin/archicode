---
type: prg
status: completed
date: 2026-10-13
run: 0019
wave: 004
related:
  - docs/wav/wav-004-editor-workspace-experience/run/run-0019-inspection-panel-links/run-0019-inspection-panel-links.md
---

# Progress Log: run 0019, inspection panel — links

## Log

- 2026-10-13: Run set up (profile `TDD+pln`: Stages 1-3 skipped). Read the wave plan and its progress log (W-7's findings), run 0018's TDD and pln, the panel code, `renderDiagramSvg`, `showDiagramScene`, the pointer / focus / keyboard handlers, and every read of `AppState.selection` (about twenty). The kernel's `relationships` per link was checked in `lib.rs` (label, qualifiers, tags, the declaring element). The real workspace was read (never written): its relationships carry `tcp-port`, `fhir-exchange` as string tags.
- 2026-10-13: Stage 4 TDD drafted. Decisions: the selection is the pair of boxes (DEC-1); Elements keeps its subject through a `focal` and `elementSelection()` (DEC-2); the lifetime is `settleLinkSelection` + `reconcileLinkSelection` (DEC-3); links are tab stops (DEC-6).

- 2026-10-13: Stage 5 KDMLLC review of the TDD (standard tier agent): 12 findings (5 S2, 7 S3). Applied: per-site audit (`markElementTabs` second read, `commitPendingEdits`, `renderMapPerspectiveHtml`), the accepted loss of the clicked link's identity, the R1 constraint paragraph (kind vs a module-level `selectedLink`), keyboard text, export, counts, `focalLayer` removed. Its S2 on ghost links: the fallback path stays (the kernel never sees a ghost) with `tags` added to the ghost link. The agent's lifetime analysis found no path where a link selection survives stale. Stages 7 and 9: no PRD; the pln traces to real TDD ids, `likely_files` exist, `blocking_gaps` empty.
- 2026-10-13: Stage 10: all tasks inline (deviation recorded in the pln; task-002 is `hard_judgment`, inline as required). 38 new node tests; seven hand mutations caught. Replica seen in the built-in browser, light and dark; the throwaway server was stopped by PID.
- 2026-10-13: Stage 11: node 351/351, `./mvnw test` 107, `embed.sh --check` exit 0; the base64 block untouched; run completed (see the Results of the pln).

## Findings

- See the Findings of the pln (`focal` and `elementSelection()` for Elements; `reconcileLinkSelection` is the Map's by-hand clear for links; tab stops).

## Lessons Learnt

- Grep every read of the selection before choosing its shape: 25 sites, one of them (`markElementTabs`) reads it twice around an `await`.
- A review that reads the working tree sees a half-edited file: ask it to read `git show HEAD:` for the referent, or wait.
