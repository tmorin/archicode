---
type: prg
status: active
date: 2026-10-29
related:
  - docs/wav/wav-027-editor-layout-and-walk/wav-027-editor-layout-and-walk.md
wave: 027
---

# Progress Log: editor-layout-and-walk

## Log

- 2026-10-29: wave drafted from #179, #178 and #155 (the three open "Editor" issues). The author answered the five decisions of the brief as recommended; they are RFC-001. Covers every diagram of the editor, not the comparison alone (the author's remark of the same day).
- 2026-10-29: ELK spike (`rfc/spike/`) run on `elkjs@0.9.3` before the plan: the layer bound works only when set on every compound node and is a tendency, not a cap, once links join containers.

## Findings

- `renderDiagramCanvasHtml` (`presentation/diagram-page.js`) draws the toolbar for all three surfaces (element, Map, saved view), so one control serves them; `host` mode (saved view) edits the view.
- The manual already states #155's L3 and L4 in `[[plateau-limits]]`; no manual change is needed for D5.
- The issue #155 still describes L2 as open; run 0162 fixed it.

## Lessons Learnt

- A design gate that needs the author ("agreement before any code") cannot be inside an autonomous wave; make the document the run and the code the next wave.
