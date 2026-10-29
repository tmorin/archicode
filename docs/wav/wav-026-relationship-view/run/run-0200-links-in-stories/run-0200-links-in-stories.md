---
type: run
run: 0200
status: completed
profile: TDD+pln
wave: 026
---

# Run 0200: links-in-stories

Wave 026 (relationship-view), manifest id W-6, issue `gh:tmorin/archicode#143` (decision D11). The run makes the editor and the story player draw the highlight that the kernel marks (`highlight`, run 0198), lets an author write it on the Applications page, in a saved view and in a story step, makes a step's own `highlight` replace the view's as the command line does, rewrites it on a rename or a move, and ships a story of a flow in the layered Brightcart fixture that both tools load.

The build is the commits `f49197e` (tasks 001 to 003: the live state, the kernel input, the step's own key) and `6dead76` (tasks 004 to 012: the drawing, the controls, the rename and the move, the player, the shipped story, the shared contract, the end-to-end spec, the documents and the gates). The commits `2581ddf`, `2831d75` and the docs commits after them change documents only. The design is `tdd-0200-links-in-stories.md`, the steps are `pln-0200-links-in-stories.md`. No Java, Rust or kernel source changed (no `src/main/java` or `src/main/rust` file), so no kernel contract moved and the coverage figure of the Java side did not move. The one declared deviation from the TDD is the Stage 5 findings F1 to F9, applied to the TDD by task-001 before any test was written; the list is in the progress log.

## What was built

### The live highlight and the address (DEC-1, DEC-3)

- `mapHighlight`, a list of `{source, destination, label}`, sits beside `mapLinks` in `model/ui-state.js`. It is reset with the folder, snapshotted and restored by `snapshotWriteState` / `restoreWriteState`, and part of the diagram's cache key and view key only when it is not empty. It is view state: no `modelsChanged()`, not in `AppState`.
- In the address it is one `hl=` parameter per entry, with the codec of `rel=` (`presentation/map-links.js`). An entry that names no relationship of the model is dropped when the address is read; an address without `hl` is read as before.
- `applySavedView` sets the live highlight from `properties.highlight` of the view (or from the step's key, see below) and clears it for a view with none. *Keep as named view* writes it as `properties.highlight`, sorted and without duplicates after `links` (`canonicalViewProperties`).
- The kernel input gets `highlight` for a Map of the application layer when it is not empty after the filter (`model/comparison.js`, `buildKernelInput`). An entry that the plateau drawn lacks is dropped from the input and never makes "nothing is drawn" (unlike `links`): the command line draws without it and warns on its own error output.
- Leaving a story (*Leave story*, *Back to this step*) keeps the last step's live `mapHighlight` and `mapLinks`, as run 0199 keeps `mapLinks`, and restores only the plateau and the comparison (F7).

### The step's own highlight replaces the view's (DEC-2)

- `stepViewForDrawing(step)` in `model/stories-model.js` returns the step's view unchanged when the step has no `highlight` key, and otherwise a shallow copy whose `properties.highlight` is the step's list. An empty list switches the view's highlight off. The saved view itself is never touched.
- `goToStoryStep` (the editing walk), `storyStepScene` (the player) and `stepProblem` all read it, so the three agree. It is the editor's twin of `GenerateStoriesCommand.viewOf`: the step's key wins.

### The drawing (DEC-4)

- `renderDiagramSvg` (`presentation/diagram-layout.js`) computes once per diagram whether any link is highlighted. A highlighted link gets the class `dg-hl` on its edge and its label, the marker `dg-arrow-hl` (a link with no compared state; a compared one keeps its `dg-arrow-<state>` marker and gains the `dg-hl` weight), a `▶ ` prefix in its caption (the label layout measures it), and `, highlighted` in its `aria-label` and its `<title>`.
- When a diagram has a highlighted link, the other links get `dg-calm` on the edge, the label and the arrowhead (lighter, thinner, the caption stays). The marker `dg-arrow-hl` is added to `<defs>` only then.
- A diagram with no highlighted link has no new class, no new marker and no new attribute: its SVG is the SVG of before.
- The tokens `--hl` and `--hl-text` are defined for the light and the dark theme in `style.css` (`.dg-edge.dg-hl`, `.dg-label.dg-hl`, `.dg-edge.dg-calm`, `.dg-arrowhead.dg-hl`, `.dg-arrowhead.dg-calm`, `.dg-label.dg-calm`). Colour is never alone: the weight, the glyph and the bold caption carry the mark.
- A grouped link that stands for several relationships is drawn highlighted whole when the kernel flags it (Q-1 of run 0198, kept).

### Writing a highlight (DEC-5)

- **The Applications page.** The panel of a selected link has a "Highlight" checkbox on each relationship row (`map-link-highlight`), and the chip row has "Highlight: n" with a Clear button (`map-highlight-clear`) while the highlight is not empty.
- **A saved view.** The form of a saved Map view of the application layer has a Highlight field with pills and a select of the relationships not yet there (`setViewHighlight`, `presentation/view-edit.js`). Removing the last pill deletes the key.
- **A story step.** The step block of the story editor has the same field for the step's own key (`setStepHighlight`, `application/story-actions.js`, through `markEntryChanged`), with the note under it (see the sentences below).
- **One write place per kind of entry (F1).** *Add to story...* writes the live highlight as the step's own key `highlight`, and the links as `properties.links` of the step's recipe. *Keep as named view* writes the highlight as `properties.highlight` of the view. The step field edits the step's key, the place *Add to story...* wrote. A step therefore never holds the highlight in two places written by the editor.
- The field and the control are offered for a Map of the application layer only.

### Rename and move (DEC-7)

- `rewriteSavedViewReferences` and `recipeNamedReferences` (`application/story-entries.js`) share one helper that yields the entry lists of a recipe and of a step (`links` and `highlight` of `properties`, and the step's own `highlight`). The rewrite of `source` and `destination` covers the step key, for a step with `view:` and for one with its own recipe. The live state is rewritten by `rewriteUiReferences` (`persistence/save.js`). `application/move.js` counts them on copies, so the preview is right. The label never changes; a delete leaves them alone, as for `links` (DEF-3 of run 0199).
- The sibling-plateau dialog lists the views and steps that would lose an entry.

### The shipped story of a flow (DEC-8)

- `order_flow` is in the layered Brightcart fixture, `src/test/resources/brightcart/layered/shared/story.order_flow.yaml`, generated by `generate.mjs` from `description.mjs`, and in the sample `src/main/resources/editor-webapp/samples/brightcart.yaml` (`npm run sample:build`). It has three steps, all told at `baseline`. Each step is a Map of the application layer with its own recipe, opens `shop` and `shop.app`, and carries `properties.links` with one relationship more than the step before, the newest one being the step's own `highlight` key:
  1. `customer` to `shop.web`, "browses and buys with";
  2. `shop.web` to `shop.app`, "calls";
  3. `shop.app.payments` to `psp`, "authorises payments with" (the link is drawn because `shop.app` is open).
- The fixture now has 62 files in the sample bundle (it had 61) and four stories (it had three); the tests that pin those counts were updated (`sample-brightcart.test.js` asserts 62 files; the other pins are listed in the progress log).
- The manual shows the form in `[[story-of-a-flow]]` (`src/doc/README.adoc`); the guide has one convention paragraph in `src/main/resources/guide/guide.md`, and `src/test/resources/guide/golden.md` is regenerated; `CLAUDE.md` has one paragraph for this run.
- `scripts/byte-identity-new-files.txt` (new) lists the files that `stories generate` writes for `order_flow` and that differ from the 0.19.0 jar by design, because that jar ignores `links` and `highlight` (`(^|/)views[^/]*-stories/order_flow/`). `scripts/byte-identity.sh` accepts a difference in a listed file only when the file exists in both copies; any other difference is reported as before, and the self-check proves the list has teeth.

### The player and the announcement (DEC-9)

- The player needs no drawing code of its own: `storyStepScene` draws through the same functions, so the player's diagram carries the classes of the editor's drawing. The player still writes no state (`story-player-highlight.test.js` checks that the editor's state is what it was when the player closes).
- `storyStepAnnouncement` (`presentation/story-scene.js`) appends `. Highlighted: <source> to <destination>, <label>.` to a step's announcement when the step highlights a relationship that exists (entries joined with a semicolon; the label only when there is one). A step with no highlight is announced word for word as before.
- The shared contract `src/test/resources/map-links/expected-boxes.json` has cases with `highlight` and a `highlighted` flag on each expected link. `MapLinksSharedTest` (Java) checks the `.puml` of `views generate -i` and `stories generate`; `map-links-shared.test.js` (node) checks the editor's SVG on the same cases.

### The end-to-end spec (DEC-8, IMP-10)

- `src/test/e2e/story-flow.spec.js` has two tests, run in Chromium and Firefox (the WebKit project's anchored list is not changed). The player test opens the sample with `startHostedPage()`, plays `order_flow` step by step, and checks one `dg-hl` link per step and one more link than the step before, and that Escape returns the focus to *Play*. The authoring test writes its own `files` workspace (as `map-links.spec.js` does), ticks and highlights a relationship on the Applications page, adds a step, saves, reloads, finds the same highlight and reads the file back from the copy's disk.

## Sentences the editor says

The sentences of this run. Each is pinned by the node test named in the last column unless the last column says otherwise.

| Sentence (as the editor writes it) | Where it appears | Pinned by |
| --- | --- | --- |
| links is read in the map of the application layer only (and the same for `highlight`: `highlight is read in the map of the application layer only`) | A saved view with `highlight` whose layer is technology | `map-highlight-model.test.js`, `map-links-saved-view.test.js` |
| `links[1]` names a relationship from `a` to `b` with the label `x`, which does not exist | A saved view, a workspace with no plateau and no facet | `map-links-saved-view.test.js` (the `links` form only, see Limits) |
| `. Highlighted: <source> to <destination>, <label>.` | The announcement of a step (the live region of the player) | `story-player-highlight.test.js` |
| This key replaces the highlight of the view; an empty list switches it off. | The note under the Highlight field of a story step | `map-highlight-saved-view.test.js`, `map-highlight-model.test.js` |
| Highlight: n, with the button "Clear the highlighted relationships" | The chip over the diagram on the Applications page | `map-highlight-saved-view.test.js` |
| `▶` (the glyph) and `, highlighted` (the `aria-label` and `<title>` of a link) | The diagram of a Map with a highlighted link | `map-highlight-diagram.test.js` |

The `highlight` form of the unknown-relationship sentence is the same code path as the `links` one (`application/view-recipe.js`, one function with the key as its name). No test pins the words with `highlight[n]`; that is a limit, listed below.

## Gate checks (task-012, on the committed sources)

The gates ran on the sources of `6dead76`. The only later commits change documents (`2581ddf`, `2831d75`), so the record holds for the committed tree. Fixes made during the gate are in `6dead76`: a formatting fix in `src/test/resources/brightcart/description.mjs`, the rename's expected file list in `editor-writes-layers.test.js` (the rename now also rewrites `shared/story.order_flow.yaml`), the `LiteralsFirstInComparisons` finding of PMD in `MapLinksSharedTest`, and the story list of `GenerateStoriesTest` (now `fork_tour, order_flow, order_journey, seller_journey`).

| Command | Result |
| ------- | ------ |
| `npm run editor:build` | exit 0 (77 parts) |
| `npm run editor:check` | exit 0 (99 upward pairs, max 99); re-run at the writing of this record, exit 0 |
| `node --test src/test/javascript/editor-build/check-editor-statements.test.js` | 19 of 19 pass, the test "the real page: --statements HEAD passes" included; re-run at the writing of this record |
| `npm run lint` | exit 0 |
| `npm run format:check` | exit 0 after the one `prettier --write` above |
| `npm run sample:check` | exit 0 |
| `npm run test:coverage` | the suite passes; 93.06 % of the lines, 96.24 % of the functions; the floors hold, none lowered |
| `npm run test:timing` | exit 0 |
| `./mvnw test-compile pmd:check` | exit 0 after the one fix above |
| `./mvnw verify -DskipITs=false` | BUILD SUCCESS: 1587 unit tests (2 skipped), 39 integration tests, the coverage checks met |
| `npx playwright test` (Chromium and Firefox) | 62 passed, `story-flow.spec.js` included |
| `scripts/byte-identity.sh` | exit 0: 332 commands compared, 326 identical, 5 accepted by the exceptions, 0 unexpected, self-check ok |

`npm run editor:check` and the statements test passed again when this record was written, on the committed tree.

## Verification

Stage 11 (2026-10-29), by a leaf agent (JDK 25.0.4), every command rerun on the committed tree (HEAD `2831d75`; the only changes in the working tree are the run documents) and read back:

- `npm run editor:build` (the page is unchanged by it), `npm run editor:check` (99 upward pairs, max 99), `npm run lint`, `npm run format:check`, `npm run sample:check`, `npm run test:timing`: exit 0.
- `npm run test:coverage`: exit 0, 3223 tests, 3222 pass, 1 skipped by design, 0 fail (`check-editor-statements.test.js` included, now that the run is committed); 93.06 % of the lines, 96.24 % of the functions, the floors hold, none lowered.
- `./mvnw verify -DskipITs=false`: BUILD SUCCESS, the 39 integration tests pass, PMD (bound to `verify`) and the coverage checks met.
- `npx playwright test --project=chromium --project=firefox`: 62 passed, `story-flow.spec.js` included (the one failing line is the `test.fail` of `teardown.spec.js`, which is expected to fail).
- `scripts/byte-identity.sh`: exit 0, 332 commands, 326 identical, 5 accepted by the exceptions, 0 unexpected, self-check ok; the differences are the files of `order_flow` and nothing else.
- The eight criteria of the plan's Executive Summary were each re-read against the files (`stepViewForDrawing` in `model/stories-model.js` and its three callers, `dg-hl` / `dg-calm` and the markers in `presentation/diagram-layout.js`, `story.order_flow.yaml`, `scripts/byte-identity-new-files.txt`, `story-flow.spec.js`, `[[story-of-a-flow]]` in `src/doc/README.adoc`, the guide paragraph and `CLAUDE.md`) and each is backed by a test that passed above. No file of `src/main/java` or `src/main/rust` changed, and the diff of the build commits holds no debug leftover (`console.log`, `debugger`, `.only`, `TODO`).
- Not confirmed: the tag run, the native runner, WebKit and the real Safari, the by-hand checks of the TDD (360 px, dark theme, focus order, a screen reader), and the words of the `highlight[n]` sentence (see Limits).

Review pass: dispatched. The Stage 5 review of the TDD and the Stage 9 consistency check were done by leaf agents other than the drafter, and tasks 001 to 013 were each verified by an agent other than the one that built them (see the prg).

Files outside likely_paths: docs/fixtures/brightcart-spec.md (the fixture's count of stories and files), scripts/byte-identity.sh and scripts/byte-identity-new-files.txt (the harness accepts the new files of `order_flow`), src/main/resources/editor-webapp/samples/brightcart.yaml (the sample, generated by `npm run sample:build` from the fixture), src/test/java/io/morin/archicode/cli/MapLinksSharedTest.java and src/test/java/io/morin/archicode/cli/GenerateStoriesTest.java (the command line side of the shared contract, and the story list it pins)

## Deferred work

These are the deferred items of the TDD (its "Deferred Work" section), carried here as the run's record.

- **DEF-1**: the load check of `links` and `highlight` in a layered workspace, in both tools (DEF-1 of run 0199). The author may open the follow-up issue after #143 closes. A typo in a layered workspace stays a warning.
- **DEF-2**: a wildcard label, `qualifiers` or `tags` in an entry (DEF-2 of runs 0197 and 0199).
- **DEF-3**: a legend row for the highlight in the key under the diagram, and a finer mark for one relationship of a grouped link. The caption and the `aria` text carry the mark until then.
- **DEF-4**: a story builder that appends steps from a list of relationships. The authoring of a flow is by hand in the story editor.
- **DEF-5**: a relationship list, `links` and `highlight`, in the technology layer.
- **DEF-6**: WebKit for the new spec (`story-flow.spec.js` is not in the WebKit project), and the real Safari.

## Limits, and what this run does not prove

- **The tag run is not proved.** The website's base path and the copy of `brightcart.yaml` to `/editor/samples/` are proved only by the tag run.
- **The native runner is not proved** by this run; the Native job runs the `*IT` classes on it.
- **WebKit and the real Safari are not proved** (DEF-6). Playwright's WebKit is a build of the engine, not Safari.
- **The `highlight[n]` sentence is not pinned by its own test.** The code path is the `links` one; `map-links-saved-view.test.js` pins the `links[n]` words only. A test for the `highlight[n]` words is the first follow-up on this point.
- **The by-hand checks of the TDD are not recorded.** The TDD asks for the player at 360 px and in the dark theme, the focus order, and a screen reader reading the announcement. The progress log does not record them. The contrast of `--hl` is checked by `theme.test.js` and `css-theme-audit.test.js`; a screen reader was not run.
- **A highlight that the plateau drawn lacks marks nothing, and says nothing on the page.** The entry is dropped (DEC-3); the command line warns on its own error output. A highlight that names an existing relationship the map does not draw is the same case (run 0198 DEC-4).
- **`canonicalViewProperties` sorts `highlight` on a re-save.** A `highlight` written unsorted by hand is rewritten sorted when the page saves that view (CTR-1, RISK-5). The manual says so.
- **A saved view with `highlight` in the technology layer is refused** with its sentence (DEF-5); the technology Map has no highlight.
- **The sequence of steps is written by hand** in the story editor (DEF-4).
- **The sentences of the field note and of the chip are English as the page writes them** and are not translated.

## Files

- The sources of `src/main/editor` (the parts named by the TDD: `model/ui-state.js`, `model/comparison.js`, `model/stories-model.js`, `model/map-links.js`, `application/story-actions.js`, `application/story-entries.js`, `application/view-recipe.js`, `presentation/diagram-layout.js`, `presentation/map-links.js`, `presentation/view-edit.js`, `presentation/stories-pages.js`, `presentation/story-scene.js`, `composition/events.js`, `composition/address-routing.js`, `style.css`), the page `src/main/resources/editor-webapp/standalone.html` (generated by `npm run editor:build`), and the sample `src/main/resources/editor-webapp/samples/brightcart.yaml`.
- The fixture: `src/test/resources/brightcart/description.mjs`, `generate.mjs`, `layered/shared/story.order_flow.yaml`, `expected/entries.json`, `expected/renditions.json`, and the README files that count the fixture.
- The shared contract `src/test/resources/map-links/expected-boxes.json`; the harness list `scripts/byte-identity-new-files.txt`; the tests named above, and `src/test/e2e/story-flow.spec.js`.
- The documents: `src/doc/README.adoc` (`[[story-of-a-flow]]`, `[[map-highlight]]`, `[[editor-map-links]]`, `[[editor-stories]]`, `[[editor-story-player]]`), `src/main/resources/guide/guide.md` and `src/test/resources/guide/golden.md`, `CLAUDE.md`.

The full list of the commit `6dead76` is `git show --stat 6dead76` (36 files).

## Canonical impact

None. No canonical register is declared in this repository (`docs/CLAUDE.md` does not exist), as the TDD's Canonical Impact section says.
