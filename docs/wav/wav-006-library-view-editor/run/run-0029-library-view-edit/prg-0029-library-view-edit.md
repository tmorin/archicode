---
type: prg
status: completed
date: 2026-10-13
run: 0029
wave: 006
related:
  - docs/wav/wav-006-library-view-editor/run/run-0029-library-view-edit/run-0029-library-view-edit.md
---

# Progress Log: run 0029, Library view edit

## Log

- 2026-10-13: Run set up (directory and number given by the orchestrator; status file already at `proposed`). Profile `TDD+pln`: Stages 1-3 skipped, Stage 7 and the PRD checks of Stage 9 not applicable. Read the wave plan, the business case, the wave progress log, the documents of runs 0027 and 0028, the page code (`libraryDiagramRecipe`, `renderViewAttributesHtml`, `markEntryChanged`, `canonicalViewDefinition`, `rewriteSavedViewReferences`, `cancelChanges`, `patchYamlText` and commit 7a3c3be).
- 2026-10-13: Stage 4 TDD drafted (status designing); Stage 5 KDMLLC review dispatched (standard tier, read-only) and answered while the code was written; Stage 6: no open question left (the one owned by this run is answered by DEC-1); Stage 7 not applicable. Stage 8-9: pln written (status planned), tasks trace to TDD ids, `likely_files` exist, `blocking_gaps` empty.
- 2026-10-13: Stage 10: all tasks inline (one file, one design). 21 new node tests in `library-view-edit.test.js`; the tests of runs 0027/0028 whose subject changed (the transient look, the read-only facts) edited; the page harness extracted to `library-page.js` and the in-memory folder to `mem-folder.js`.
- 2026-10-13: Stage 11: node 549/549, `./mvnw test` (JDK 25) 114 tests 0 failures, `embed.sh --check` exit 0, base64 block untouched, manual built, the real page checked on a copy of the user's workspace (an edit and a save of `authentication_token_validation`, Cancel). Canonical impact: CI-arc-1 and CI-dom-1 not applicable, with their reason, in the TDD. No backlog sweep (this repository has no `docs/bkg/`). Run completed.

## Findings

- Wave open question (which attributes by a field, which by the diagram; where the pins of a Map view are edited): every attribute by a field of the panel; the drawing edits nothing (a click selects, as in run 0028); the Map's pinned, hidden and opened elements are lists with add (Enter) and remove in the panel. Why: the page's drawing is read-only on purpose, a list can reach elements the drawing does not draw (hidden, missing pins), and *Open on diagram* remains the way to choose pins by clicking. The toolbar's *Hide unlinked* and text buttons are the same edits as the panel's checkboxes. Camera moves (zoom, pan, centre, fit) are not edits.
- KDMLLC review of the TDD (15 findings, 1 S3, 7 S2, 7 S1): applied in code and design: F1 (a text committed by leaving it for another control is applied at once and redrawn 250 ms later, focus not pulled back; *Save all changes* lit in place), F3 ("(no element)" in the name, a neutral problem message), F5 (legacy views of workspace.yaml: a test), F6 (first pin that exists, in file order), F8 (one commit path for a pin, Enter), F9 (a refusal keeps the typed text and its notice follows the view), F11 (pick tests), F12-F15 (wording, duplicates). Kept as is: F4 (Save is not blocked for an undrawable view: it is the user's text, Cancel exists), F10 (the canonical rules are small; a shared helper was not worth a change of `canonicalViewProperties`).
- The real page showed what Node could not: `refreshSaveAllButton` replaces the Save buttons, which swallowed the click that made a field lose the focus; replaced by `syncSaveAllButtonsInPlace` for that path. A first edit typed in a field then a click on a still-disabled Save needs a second click (a disabled button takes no click; the edit is applied and Save is lit by then).
- Saved file of a real view manifest (copy of `view.authentication_token_validation.yaml` with two comment lines added by hand): only the line of the changed value differs, both comments and the missing final line break stay. See the pln's Results.
- Pre-existing fragility the larger suite exposed: `folders.test.js` "the card is drawn before the permissions are known…" waited a fixed 30 ms and failed in 3 of 8 full runs with this run's tests (0 of 8 on the base commit, 0 of 20 alone). It now waits for the card to be drawn; 0 of 6 full runs after.
- Wave plan text says "442 existing node tests" (454 at the start of the wave, 528 at the start of this run): wave text to fix.
- For W-4: not seen in a real browser: the look (no screenshot: the pane did not draw), light/dark, widths other than 822 px, a datalist choice by mouse, focus order by Tab. The form in a 270 px centre/panel was only measured.

## Lessons Learnt

- A redraw that replaces the controls loses the click that caused the blur; the Node harness (no focus, no events) cannot show it, only a real page did.
