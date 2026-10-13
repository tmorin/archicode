---
type: prg
status: active
date: 2026-10-13
related:
  - docs/wav/wav-004-editor-workspace-experience/wav-004-editor-workspace-experience.md
wave: 004
---

# Progress Log: Editor Workspace Experience

## Log

- 2026-10-13: Wave drafted and proposed from a conversation with the user. Decisions taken there and recorded in the plan:
  `rendering-stereotypes` is a whitespace-separated list; the workspace name is `settings.name`, shown top-left; the
  theme is stored in `localStorage` and chosen in Settings; the last authorised folder still opens directly and the
  folder list shows when none is open; the inspection panel is on the right, elements first and links after; the
  "⋯" menu of the centre header holds Story, Download and Show on map / Open in Elements, Facet stays visible.
- 2026-10-13: Wave started (complete-wave). Branch feat/editor-workspace-experience cut from fix/editor-ui-state-per-layer (PR tmorin/archicode#13, still open, not merged by the orchestrator): the wave PR will be stacked on it. Baseline: node tests 193/193. Plan status set to in-progress. All overlapping pairs are serialize, so runs dispatch one at a time (largest concurrency 1).

## Findings

- `embed.sh` writes the wasm into `standalone.html` as well as into `src/main/wasm/`, so a Rust change touches the editor file.
- The shell already supports resizable right and bottom panels; no perspective uses them yet.
- On the Map a click on a box selects without changing perspective (`goto-element` does not call `setPerspective`).

## Lessons Learnt
