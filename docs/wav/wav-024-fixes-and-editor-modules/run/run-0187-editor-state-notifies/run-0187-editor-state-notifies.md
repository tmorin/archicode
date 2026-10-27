---
type: run
run: 0187
status: completed
profile: TDD+pln
wave: 024
---

# Run 0187: editor-state-notifies

Run of wave 024, manifest id W-11. Done by hand in the main worktree, one `refactor: change` commit, by path; no workflow.

Review pass: inline, by the run's author, against the tools; no fresh-agent review was dispatched. The change was checked by the tools (`editor:check`, the node suite with the new test, the e2e suite), not by a fresh agent.

Files outside likely_paths: docs/wav/wav-024-fixes-and-editor-modules/ (this run's documents and the wave manifest), src/main/resources/editor-webapp/standalone.html (the generated page, rebuilt from the parts), jacoco-quarkus.exec (an untracked Maven coverage file, not committed, not removed)

## What was built

`requestRedraw()` and `onRedraw(handler)` in `model/app-state.js` (RFC-002 rule 2, amended). A part below the composition asks for the page to be drawn again with `requestRedraw()`; `composition/render.js` registers `onRedraw(() => render())` once at load, late-bound so that a test that replaces `render` still sees every redraw. The request is carried out at once in the caller's turn, so the order of what is drawn, written and put back does not move. `modelsChanged()` is unchanged: it bumps `modelVersion` and draws nothing. The 97 `render();` calls of the application, persistence and presentation parts became `requestRedraw();` (calls in `composition/` stay `render()`). The ratchet went from 161 pairs to 99 and `ratchet.max` from 162 to 99 (lowered by hand).

## Verification

- `npm run editor:check`: 1334 names equal `names.json` (three added: `onRedraw`, `redrawHandler`, `requestRedraw`), Java names, load order holds, `upward pairs: 99 (max 99)`. Before: 161 (max 162).
- New `redraw-requests.test.js` (5 tests): `modelsChanged()` bumps the version and does not redraw; `requestRedraw()` reaches the current `render` at each request; with no handler it does nothing; `rebuildIndexAndRender()` bumps the version then requests one redraw; no part below the composition calls `render(` in code.
- `npm run test:unit`: 2677 tests with the new five, all pass but the one skipped (timing). Three failures in the first full run were checked: two were the ratchet value in `check-editor-layers.test.js` (changed to 99), one is `--statements HEAD` which compares the working tree with HEAD and passes once the change is committed.
- `npm run test:coverage` holds the floor (total 92.67 %, pages 84.08 %). `npm run lint`, `npm run format:check` clean.
- `./mvnw -Dtest=EditorReadSchemaTest,GuideViewPropertiesTest,NativeReflectionConfigTest,ShippedFilesTest test` (JDK 25.0.4-tem): 20 tests, 0 failures. `npm run test:e2e` after `./mvnw package -Dmaven.test.skip -Dplugin.asciidoctor.skip=true -Dpmd.skip=true`: 38 passed.

## Pending

- The 99 pairs left are not render calls: application and persistence naming presentation helpers (state of the diagram, dialogs, `viewLayerOf`; 54 pairs), model naming application or presentation (15), persistence naming application (15) and the address functions of the composition (`currentRouteHash`, `compareFromHash`, `syncHashFromState`, `diagramFramingChanged`, `syncPerspectiveFromHash`, `applySelectionFromHashRef`; 15). They return values or read state, they are not notifications; each is a relocation of state or of a helper (later steps).
- The pull request run is not read; nothing was pushed. CLAUDE.md still says `ratchet.max` is 162 (W-9 rewrites the paragraph).
