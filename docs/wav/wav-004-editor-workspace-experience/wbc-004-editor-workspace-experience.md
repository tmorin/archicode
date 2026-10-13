---
type: wbc
wave: 004
status: proposed
date: 2026-10-13
related:
  - docs/wav/wav-003-standalone-workspace-editor/wav-003-standalone-workspace-editor.md
  - docs/run/run-0011-editor-ui-state-per-layer/run-0011-editor-ui-state-per-layer.md
  - CLAUDE.md
---

# Wave 004 — Editor Workspace Experience — Business Case

## Context

The standalone editor (`src/main/resources/editor-webapp/standalone.html`, wave 003, then many incremental
commits up to 0.9.0) is now the main way to look at a workspace. Using it on a real workspace (the user's own, with
about 44 manifests, 57 tagged elements and 156 tagged relationships) surfaced a set of gaps that are individually
small but share one file, one test harness and one reader:

- the toolbars look unfinished (the right border of a hovered button in a button group disappears; the perspectives
  are pills; "Close folder" sits next to the folder name);
- the header of the centre panel is overloaded and does not adapt when the panel gets narrow (fixed height, no wrap,
  actions that scroll without a visible scrollbar), and a right-hand panel is about to take more width;
- the editor has no light/dark switch of its own, and a workspace cannot be given a name (the top bar shows the folder
  name);
- the CLI already styles elements from `styles.by-tags` and the tag `rendering-stereotypes`, but the editor ignores
  `styles` entirely, and the CLI mishandles a multi-word `rendering-stereotypes` value (`"external changed"` becomes a
  single stereotype that matches neither style);
- a click on a diagram box or link shows nothing about the item (only a plain-text native tooltip), while the data
  that matters in practice (tags such as `tcp-port` on relationships) is invisible on the diagram;
- only the last opened folder is remembered.

Nothing in the registers covers this: `docs/` has no `bkg` or `ana` register. The input is a conversation with the
user and the unchecked points of GitHub issue tmorin/archicode#8 (most of which this wave leaves alone, see Non-Goals
in the plan). Run 0011 (editor UI state per layer, PR tmorin/archicode#13) is the last piece of that issue's
limitations and is a prerequisite already done.

## Problems / Opportunities

- Reading a real workspace in the editor is harder than reading its generated PDF: states the author encoded
  (`new`, `changed`, `external`) are invisible, relationship data is invisible, and the stereotype bug means even the
  PDF may be wrong for four elements.
- Controls and chrome do not scale with the width of the window: the more the editor grows, the more the header
  breaks, and the next feature (a right-hand panel) makes it worse.
- Working across several workspaces means reopening a folder through the picker every time.
- A shared look-and-feel decision (theme) is currently imposed by the operating system only.

## Options & Recommendation

1. **One wave of nine runs, dependency-ordered, one PR (recommended).** Each run is the unit of autonomous execution
   and is evidenced on its own; the real dependencies are few (the styles need the theme and the kernel stereotypes;
   the inspection panel needs the responsive header and the styles; multiple folders need the workspace name), so
   the order can follow value.
2. **Several small waves by theme** (toolbar and header, styling, inspection, folders). Rejected: the dependencies
   cross the themes (styles ← theme and stereotypes; panel ← header and styles; folders ← name), the user asked for
   one backlog and one PR, and each wave costs three documents plus a gate.
3. **One large run.** Rejected: three of the items carry a real design fork that deserves its own TDD (responsive
   header, inspection panel, multiple folders), a failure would be expensive to bisect, and the run profiles in
   `manage-runs` say a single sequence of independent concerns is not one run.

## Vision

The editor draws a workspace the way its author meant it: the states they tagged are visible on boxes, in the tree
and in the legend; the selected element or link can be read in a panel without leaving the view; the toolbars and the
centre header hold together at any width; the interface can be light, dark or follow the system, per browser; a
workspace can carry its own name; several folders can be remembered and reopened; and the CLI and the editor agree on
what a stereotype is.
