---
type: run
run: 0203
status: completed
profile: TDD+pln
wave: 027
---

# Run 0203 diagram-address

Wave 027, manifest id W-3.

## Baseline (task-001, 2026-10-29, before any change to src/main/editor)

- `node scripts/check-editor.mjs --list` exits 0; ratchet: `upward pairs: 99` (`layers.json` `ratchet.max` 99). The 185-line listing begins `application to composition: 4` (`drawLayersNamedByAddress` names `compareFromHash`, `goToStoryStep` names `currentRouteHash`, `openLayers` names `compareFromHash`, ...) and is reproduced by the command; run 0203 must add no pair absent from it.
- Test files that name `currentRouteHash`, `location.hash` or `compare=` (`grep -ln`, src/test/javascript): map-highlight-saved-view, map-links-diagram, map-links-list, and in viewpoint-kernel/: band-compare-tree, changes-panel, changes-shortcut, comparison-cache, delete-plateau, diagram-link-tab-stops, diagram, editor-reads-layers, editor-structure, inspection-links, inspection-navigation, layered-folders.js, lean-read-only-band, library-view-diagram, library-view-edit, library-view-panels, model-ops, plateau-model, plateaus-page-and-addresses, reading-changes, sample-brightcart, sample-landing, server-mode, story-player-modal, story-player-page.js, story-player-scene, technology-map-parts, technology-map, ui-fixes.
- Of those, the ones that assert a whole layered address with `assert.equal` (the candidates DEC-3 may change; task-002 confirms by running the suite): plateaus-page-and-addresses.test.js (lines 151, 174, 222, 232, 250, 284), changes-panel.test.js (918, 950, 961, 1313), editor-structure.test.js (329), band-compare-tree.test.js (435, 440).
- End-to-end specs that name a hash, `url()`, `compare=` or `plateau=` (`grep -ln`, src/test/e2e): address.spec.js, changes-walk.spec.js, diagram-and-compare.spec.js, diagram-columns.spec.js, hosted-acceptance.spec.js, hosted.js, sample.spec.js, story-flow.spec.js.

## Tests written red (task-001)

`src/test/javascript/viewpoint-kernel/diagram-address.test.js` (102 tests: 40 pass, 62 fail) and `diagram-address-audit.test.js` (4 tests: 3 pass, 1 fails). Both run on the layered Brightcart at `plateau=marketplace` (a second page on the same files through `openWorkspace` of `src/test/javascript/map-links-support.js`), no new support was needed.

- Fail now, naming the missing parameter: `layout=3` (5 surfaces), `compare=past`/`future`/`future:marketplace`/`other:saas`/empty and `changes-only=1` (6 surfaces each, the saved view included), `open=` and `hide=` (both Maps), the layered default `compare=`, a workspace without plateaus still writing `layout`, a reader of another memory, the reset by an address that lacks `layout`, `open`, `hide`, the invalid `layout` values, an unknown reference in `open=`/`hide=`, an opened box of a removed element, Back and Forward, Settings or Stories and back.
- Pass now (guards): `pin`, `rel`, `hl`, `facet`, `hide-unlinked`, `applications=0`, `relationships=0`, `labels`, `qualifiers`, `descriptions`, `wrap`; the pages with no diagram write none of the parameters; an address with no or an empty `compare=` leaves the remembered flag; a tab click between the Maps keeps the flag; the Maps keep folds and columns through a visit to the other Map.
- Audit failure, now: `AppState.changesOnly`, `source.changesOnly` (changes-only=), `diagramColumns`, `recipe.columns` (layout=), `mapOpened`, `mapState.opened`, `recipe.mapState`, `technologyMapState` (open=), `mapHidden`, `mapState.hidden` (hide=) are on the table and `currentRouteHash` does not write the parameter. Two green self-tests show the audit finds an input on neither list (sentence of DEC-7) and a parameter the writer does not write.
- gap-002, read in the code before the test was written: `drawPlateau` calls `rememberLayerChoice()` even with `fromAddress`, so the addressed comparison is remembered (`recalledComparison()` becomes `past`) while Changes only is not (`recalledFlag('changes-only')` stays as the reader had it). The test asserts that (name says so); VER-3 as written in the TDD is true for the flag only.
- Oddity found: a removed container (`shop.app` at marketplace compared with its past) opened in `open=` draws as a ghost without its children, so the removed-box test checks the box is drawn, that `open=` carries it and that the state round-trips, not that children appear.

## End-to-end spec and address lengths (task-005)

`src/test/e2e/diagram-address.spec.js`, Chromium and Firefox (not in the WebKit `testMatch`): on a copy of the layered Brightcart at `plateau=marketplace` it sets, through the page's own controls, a comparison with the past, Changes only, *Unfold all*, one hidden box and 4 columns; it reads `page.url()`, opens `server.url` plus that hash in a NEW browser context and asserts the same box references (`data-ref` of `g.dg-node`, sorted) and the same count of `g.dg-link`, and that the address is written back unchanged. Positions are not compared (RISK-5). The same for the page of an element (Commerce services, Detailed: comparison, Changes only, 4 columns) and for the page of the saved view *The whole map, opened* (`compare=past` in the address, Changes only). On the Map, a folded address with `compare=` empty, the unfolded one and the folded one again are set by hash, and Back returns the unfolded diagram and Forward the folded one. A page shows the address without the server's token, so the new context uses `server.url` plus the copied hash.

Verification: `./mvnw package -Dmaven.test.skip -Dplugin.asciidoctor.skip=true -Dpmd.skip=true` (JDK 25.0.4), then `npx playwright test` on `diagram-address`, `address`, `diagram-and-compare` and `diagram-columns` with `--project=chromium --project=firefox`: 30 passed (the four specs, both engines; the new spec has 4 tests, 8 runs). `eslint --max-warnings 0` and `prettier --check` on the spec pass.

ADDRESS_LENGTH (the hash written by the page, after `http://127.0.0.1:<port>/`; the figure is the whole URL including that prefix of 21 characters, so the hash is 21 shorter), every parent of the layer unfolded by repeated *Unfold all*, one pin, comparison with the past, Changes only, 4 columns, `plateau=marketplace`:

- ADDRESS_LENGTH application 219 (10 parents in `open=`)
- ADDRESS_LENGTH technology 344 (16 parents in `open=`)

Both are under the 600 characters the task set, so no finding and no DEF-1. Encoding stated: `open=` and `hide=` are lists like `pin=`: references sorted, each `encodeURIComponent`ed, joined by commas, written only when the list is not empty (a count was not chosen: a count could not be read back). New parameters follow `facet`, `pin`, `hide`, `open`, then `layout`, `compare`, `changes-only`, `plateau`.

## Broken on purpose and gates (task-006, 2026-10-29)

Three breaks, each restored (the page rebuilt with `npm run editor:build` after each; `git diff` shows `diagram-page.js` untouched and `address-routing.js` as before the break):

1. A throw-away input in `diagramCacheKey` (`'throwaway:' + (recipe.throwAway || '')` after `viewpoint`): `node --test diagram-address-audit.test.js` exit 1, test "every input of the drawing is in the address or on the list of the exceptions, and the writer names the parameter that carries it" fails with `recipe.throwAway is read by the drawing and is on neither list: add it to the address (currentRouteHash) or give the reason it is not there`. Removed.
2. The reader not resetting `opened` (`state.opened = open.length ? new Set(open) : null` became `if (open.length) state.opened = new Set(open)`): `diagram-address.test.js` 101 pass, 1 fail, "an address that does not say layout, open, hide or pin resets them: a Map is what the address says". Restored.
3. The writer omitting compare (`if (false) params.push('compare=' ...)`): many failures, among them "application map: an option at its default writes no parameter, and a layered workspace says the comparison is none", "a reader with another memory draws the diagram of the address, and keeps their own remembered Changes only", "Back and Forward restore the pins, ...", and the round trips of `compare` and `changes-only` on the six surfaces. Restored.

After restoring: `diagram-address.test.js` and `diagram-address-audit.test.js` 106 pass, 0 fail.

Gates (exit codes):

- `npm run editor:build` 0 (78 parts); `npm run editor:check` 0 (page is the assembly, 99 upward pairs, max 99); `node scripts/check-editor.mjs --list` 0; `npm run format:check` 0; `npm run lint` 0.
- `npm run test:coverage` exit 1: ONE failing test of the suite, `editor-build/check-editor-statements.test.js` "the real page: --statements HEAD passes" (the top-level declarations and comments differ from `HEAD`: `createInitialAppState` in `model/app-state.js` has a comment of `changesOnly` rewritten by this run and nothing is committed yet). This check compares the page with the commit before it and passes once the run's change is committed; it cannot be met on an uncommitted tree. Every other test passed (the run's two new files included), and the figure was judged with `node scripts/editor-coverage.mjs --reuse` (exit 0, "the figure holds the floor"): total 93.11 % of the lines, 96.28 % of the functions, `editor-coverage-floor.json` unchanged.
- `scripts/byte-identity.sh` exit 0: 20 workspaces, 332 commands, 326 identical, 5 accepted by the existing exceptions, 0 unexpected, self-check ok; `byte-identity-exceptions.txt` unchanged.
- `./mvnw verify` (JDK 25.0.4) exit 0. `src/main/java`, `src/main/rust`, the schema goldens and `guide/golden.md` have no change in `git status`. No part above 1,600 lines.
- E2E (task-005): 30 passed in chromium and firefox; ADDRESS_LENGTH 219 (application) and 344 (technology), under 600.

## Verification

Stage 11 (2026-10-29), re-run on the working tree: `npm run editor:build` 0, `npm run editor:check` 0 (99 upward pairs, max 99), `npm run format:check` 0, `npm run lint` 0, `diagram-address.test.js` and `diagram-address-audit.test.js` 106 pass 0 fail, `npm run test:unit` 3389 pass and 1 fail, the known uncommitted-page test `the real page: --statements HEAD passes` (the comment corrections of task-004 are uncommitted, so the page differs from `HEAD` in comments; it passes once committed). The stale sentences are gone from CLAUDE.md, README.adoc and the editor sources (grep finds none) and the new rule (`changes-only=1`, `open=`, `hide=`, `layout=`) is in both documents. Task-006 results above (byte-identity 0, `./mvnw verify` 0, e2e 30 passed in chromium and firefox) were not re-run at Stage 11. `src/main/java`, `src/main/rust`, the schema goldens, `guide/golden.md`, `layers.json`, the coverage floor and `byte-identity-exceptions.txt` have no change. `tooling/docs/check-backlog.py` does not exist in this repository, so it was not run.

Review pass: inline, because the leaf agents of this run have no Agent tool to dispatch a reviewer; the Stage 5 KDMLLC review of the TDD and the Stage 9 consistency check were done by agents other than the drafter, and each task was verified independently by a later agent.

Files outside likely_paths: src/main/editor/application/plateau-choice.js, src/main/editor/model/app-state.js, src/main/editor/model/settings.js
