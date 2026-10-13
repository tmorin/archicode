---
type: run
run: 0020
status: completed
wave: 004
---

# Run 0020: Multiple folders

Wave 004 (`editor-workspace-experience`), run W-9. Document profile: `TDD+pln`; documents in this directory:
`tdd-0020-multiple-folders.md`, `pln-0020-multiple-folders.md`, `prg-0020-multiple-folders.md`.

The standalone editor remembers every folder it opened, with the name of its workspace, in the same IndexedDB (version
1, the single record of the earlier version migrated in place). On load the last folder still opens directly when its
permission holds; with no folder open the landing card lists them all, each to open (a click) or to remove from the list
(nothing on disk). "Close folder" keeps the folder remembered; a refused permission keeps it too. Nothing of this in
`archicode editor serve`. Canonical impact: none (CI-arc-1 and CI-dom-1, with their reason, in the TDD).
