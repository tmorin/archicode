---
type: prg
status: completed
date: 2026-10-13
run: 0018
wave: 004
related:
  - docs/wav/wav-004-editor-workspace-experience/run/run-0018-inspection-panel-elements/run-0018-inspection-panel-elements.md
---

# Progress Log: run 0018, inspection panel — elements

## Log

- 2026-10-13: Run set up (profile `TDD+pln`: Stages 1-3 skipped). Read the wave plan and its progress log, the shell (`renderShellHtml`, resize handlers), the two perspectives, the Map's selection code, the header contract of run 0016 and the badges of run 0017.
- 2026-10-13: Stage 4 TDD drafted; the open question of the plan (which diagram tabs of Elements show the panel) answered in DEC-2: all three diagram tabs, not Details or the forms.
- 2026-10-13: Stage 5 KDMLLC review of the TDD (standard tier agent): 5 findings (1 S2, 4 S1), all C-DOC. Applied: DEC-4 and FLOW-1 (when the off-map note can show), IMP-1/IMP-2 wording, DEC-6 (the view key gains the layer). C-2 (Map header lookup layer-blind) was not a defect: `layerOfReference` uses the layer of the selection; a test pins that the two agree. Stages 7 and 9: the pln traces to real TDD ids, `likely_files` exist, `blocking_gaps` empty.
- 2026-10-13: Stage 10: all tasks inline (deviation recorded in the pln). Replica looked at in the built-in browser, light and dark; the tag list indent fixed.
- 2026-10-13: Stage 11: node 313/313, `./mvnw test` 107, `embed.sh --check` exit 0; run completed (see the Results of the pln).

## Findings

- See the Findings of the pln (the Map's by-hand removal in `showDiagramScene`; the view key and the layer).

## Lessons Learnt

- A comment that says "no panel on the right" is a claim about the code: grep for the claims a change falsifies.
