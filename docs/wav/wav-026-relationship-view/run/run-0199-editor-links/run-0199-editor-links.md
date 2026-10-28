---
type: run
run: 0199
status: completed
profile: TDD+pln
wave: 026
---

# Run 0199: editor-links

Wave 026 (relationship-view), manifest id W-5, issue `gh:tmorin/archicode#143` (decision D11). The run builds the `links` property of a Map view of the application layer in the editor: an author ticks relationships in a list, or keeps the relationships of a clicked link, and the diagram draws only the boxes and links at their ends. The choice is kept in a saved view, a step recipe and the address, and a rename or a move rewrites it. `highlight` is kept and rewritten but not drawn (W-6).

The build is the commit `8c934ac` (tasks 001 to 010 of the plan), and the gate of task-011 ran on the same sources (see the progress log). The design is `tdd-0199-editor-links.md`, the steps are `pln-0199-editor-links.md`. No Java or Rust source under `src/main` changed, and no kernel contract moved.

## What was built

### The list on the page Applications (DEC-3)

- A section "Relationships" under the tree of the Map, in a `<details>` that remembers whether it was open (view state, not in the address). Its summary shows the count of ticked entries and a "Clear" button (`map-links-clear`).
- A hint line under the summary, then three controls above the rows: a text filter (case-insensitive substring of the source, the destination, the label, and the kind of either end), a select of the kinds that exist among the ends ("Any kind" first), and a "Ticked only" checkbox.
- One row per relationship of the model drawn (or of the union with a comparison on), sorted by source, destination and label. A row has a checkbox (`map-link-toggle`), "source → destination", the label, and the kind of each end in muted text.
- At most 200 rows are drawn. The rest are told as "200 of 254 shown: type to narrow" (the form is `N of M shown: type to narrow`, with no thousands separator; the TDD's "1,240" was an example).
- A ticked entry that names no relationship of the model drawn stays in the list, marked "not in this plateau", and can be unticked.
- A live region says the count: "1 relationship ticked" or "N relationships ticked".
- The filter, the kind and "Ticked only" redraw the rows in place, not the diagram, so the focus stays where it was. They are not entries of the history.
- A choice that is empty draws the whole map.

### Picking on the diagram (DEC-4)

- The panel of a selected link, on the Map of the application layer only, gets controls built from the relationships of the link (found again in the model).
- While nothing is ticked, the panel has "Draw only this link" (`map-link-only`): the choice becomes every relationship of the pair.
- While something is ticked, each relationship row of the panel has a checkbox (`map-link-toggle`), ticked when its entry is in the choice, so a drawn link can be taken out. There is no "Add this link" control: a drawn link under a non-empty choice stands only for ticked relationships, and a link that is not drawn is added from the list.
- A relationship that the model cannot find again has no control.

### The chip and the empty choice (DEC-5)

- While the choice is not empty, a chip "Relationships: n" with a × button (`map-links-clear`) sits beside the pin and hide chips. The page's "Clear all" also clears the ticked links.
- When the choice is not empty and none of its entries is in the model drawn, nothing is drawn and the diagram says why, with a Clear button (`map-links-clear`). The page does not fall back to the whole map (the command line skips the view in the same case).

### The address (DEC-8)

- One `rel=` parameter per ticked entry. Its value is `JSON.stringify([source, destination])`, or `[source, destination, label]` when the entry has a label, percent-encoded with `encodeURIComponent`.
- Read back when the address is opened: an entry that names no relationship of the model is dropped, a repeated one is kept once. With an empty choice there is no `rel=`. `link-from` and `link-to` (the selected link) are unchanged.

### Saved views and step recipes (DEC-7, DEC-6)

- Read: a saved view of the Map of the application layer with `links` sets the choice when it is applied. A step that names such a view, or carries its own recipe, is drawn with the same entries (the story scene reads the recipe).
- Write: "Keep as named view" writes `links` after `opened`, sorted by key and without repeats (`canonicalLinkEntries`). A view without `links` is written byte for byte as before. `links` is dropped with the other Map keys when the layer becomes technology or the viewpoint is no longer the map.
- Form: the form of a saved Map view of the application layer has a Links field with one pill per entry, "source → destination : label", a pill that names no relationship is marked like a pill whose element is gone, each pill has a remove button, and a select lists the relationships of the model not yet there (`setViewLink`).
- The diagram's cache key and the view key add the canonical entries only when the choice is not empty, so every key that existed is the same string.

### Rename and move (DEC-10)

- `rewriteRecipeReferences` and `rewriteSavedViewReferences` (`application/story-entries.js`) rewrite `source` and `destination` of `links` and `highlight` in saved views and in steps with their own recipe. The live choice (`mapLinks`) is rewritten by `rewriteUiReferences` (`persistence/save.js`), like `mapPinned`. `application/move.js` counts them on copies, so the preview's count is right.
- The sibling-plateau dialog lists the views and steps that would lose an entry (`recipeNamedReferences`).
- The label never changes with a rename. A delete leaves the views alone, as it does for `pinned` (DEF-3).

### Shared contract (DEC-8, REQ-3)

- `src/test/resources/map-links/expected-boxes.json` holds cases that the command line (`views generate -i` on a temporary copy, `MapLinksSharedTest`, Java) and the editor (`map-links-shared.test.js`, node) both draw, box by box and link by link.

## Sentences the editor says

The prefix `the view `v`: ` in the view sentences is the name of the view. The text after it is what the tests pin. Each quoted sentence is pinned by the node tests under `src/test/javascript`.

| Sentence (as the editor writes it) | Where it appears | Pinned by |
| --- | --- | --- |
| Nothing is drawn: none of the relationships ticked is in this plateau. | Page Applications, choice not empty and none of it in the model drawn | `map-links-diagram.test.js` (the "Nothing is drawn" test) |
| None of the relationships it shows is in the plateau “p”. | Page of a saved view, same case (`p` is the plateau) | `map-links-shared.test.js` (the `NONE` pattern) |
| links is read in the map of the application layer only | A view with `links` whose layer is technology | `map-links-saved-view.test.js`; `viewpoint-kernel/map-links-cases.json` |
| `links[0]` is a mapping with `source`, `destination` and optionally `label`, and … is not one | An entry of the wrong shape | `map-links-saved-view.test.js`; `map-links-model.test.js` |
| `links[1]` names a relationship from `a` to `b` with the label `x`, which does not exist | A workspace with no plateau and no facet, an entry that names no relationship | `map-links-saved-view.test.js`; `viewpoint-kernel/map-links-cases.json` |
| dangling reference: nowhere | An entry whose end is no element (no plateau, no facet) | `map-links-saved-view.test.js`; `map-links-diagram.test.js` |
| not in this plateau | Row of a ticked entry the plateau lacks | `map-links-list.test.js` |
| No relationship matches | The list, with no row to show | `map-links-list.test.js` |
| 200 of 254 shown: type to narrow | The list, past 200 rows | `map-links-list.test.js` |
| 1 ticked, 1 relationship ticked | The summary and the live region | `map-links-list.test.js` |
| Relationships: 2 | The chip over the diagram | `map-links-diagram.test.js` |
| Draw only this link | The panel of a link, nothing ticked | `map-links-diagram.test.js` |
| Clear, Any kind, Ticked only | The summary's button, the kind select, the switch | `map-links-list.test.js` |

The `links[i]` sentences are the command line's words without the prefix `error:`, as DEC-7 (f) says (case table in `viewpoint-kernel/map-links-cases.json`).

## Limits, and what is left

- **`highlight` is not drawn (W-6).** It is kept in a saved view, written verbatim after `links`, rewritten by a rename or a move, and read by nothing. A view with a `highlight` therefore never matches the screen (`viewMatchesScreen` is false), and "Keep as named view" with the screen equal to that view makes a second view without the `highlight` (pinned by `map-links-saved-view.test.js`). The editor's drawing of a highlight, the player and the shipped story of a flow are W-6 (DEF-6).
- **The load check of `links` in a layered workspace is declined (DEF-1).** Run 0197 named W-5 as its owner. This run declines it (DEC-10, Q-1): the check is a Java change outside the paths of this run, and it would turn a workspace that loads today into a load error. A typo in a layered workspace stays a warning, as the manual says. This decline is for the wave Findings, so that the author may open the follow-up issue once #143 closes. It is not a blocker.
- **An edit of a relationship in the form of an element does not rewrite the views (RISK-5, DEF-4).** The entry then names nothing, and the view's page says so. The command line refuses such a view.
- **A wildcard label, `qualifiers` or `tags` in an entry is not supported (DEF-2).** Two relationships with the same source, destination and label share one entry: the list shows both rows with the same key, and ticking one ticks both.
- **A plateau delete does not say what it does to a view's entries (DEF-3).**
- **The technology layer has no list and no `links` (DEF-5).** A view of the technology layer with `links` gets the sentence above.
- **No shipped example, fixture or story uses `links` (DEC-9).** The tests add their views to temporary copies.
- **Texts no test pins are described here, not quoted.** The hint line, the `aria-label` of the filter and of the kind select, the `aria-label` of the chip's × button, and the `title` of "Draw only this link" and of the Clear buttons are in the code, and no test checks their words.
- **Browsers.** `src/test/e2e/map-links.spec.js` runs in Chromium and Firefox. The WebKit project of `playwright.config.js` does not run it. The tag run and the real Safari are not proved by this run.

## Files outside the paths the TDD names

The commit `8c934ac` touched these files, which the TDD does not name: `src/main/editor/model/stories-model.js` (`stepProblem` passes the comparison of the step, `against`, to `viewProblem`, so a step's view is checked against the plateau it is compared with); `src/main/editor/presentation/element-form.js` (the delegated `input` listener hands the list's filter to `handleMapLinksControl`); and the test helper `src/test/javascript/map-links-support.js`. Every other file is one the TDD names, among them the manual `src/doc/README.adoc` and `CLAUDE.md` (REQ-8).

## Verification

- The gate of task-011 (the progress log, rerun after the commit `8c934ac`): `npm run test:coverage` exits 0 (3164 tests, 3163 pass, 1 skipped by design), with 93.05 % of the lines and 96.36 % of the functions; the other gate commands of the plan passed on the same sources.
- The sentences of the table above are checked with `grep -F` in `src/test/javascript`, each fragment as the tests spell it (the regular expressions of the tests escape the brackets and the dot, so the check uses the words without them). Every row matches at least once; the rows of the empty choice, the shape, the unknown end, the list and the chip are each matched by an assertion, not only by a case file. The check ran at task-012 and found no sentence that differs from the one the tests pin.

Stage 11 (2026-10-28), rerun on the tree after commit `8c934ac` (the only later changes are documents, one added assertion in `map-links-list.test.js` and one sentence of `CLAUDE.md`): `npm run editor:build` (77 parts, the page unchanged), `editor:check` (99 upward pairs, max 99, no file over 3,000 lines), `lint`, `format:check`, `test:coverage` (3164 tests, 3163 pass, 1 skipped by design, 93.05 % of the lines, 96.36 % of the functions, the floor holds), `test:timing`, `./mvnw test-compile pmd:check`, `./mvnw verify -DskipITs=false` (1587 unit tests, 2 skipped, 39 integration tests), `scripts/byte-identity.sh` (332 commands, 330 identical, 1 accepted, 0 unexpected) and `npm run test:e2e -- src/test/e2e/map-links.spec.js` (Chromium and Firefox, 2 passed) all exit 0. No yaml, yml, toml or json file under `src` starts a line with `links:` or `highlight:`. Not proved by this run: the tag run, the native runner, WebKit and the real Safari.

Review pass: dispatched. The Stage 5 review of the TDD and the Stage 9 consistency check were done by leaf agents other than the drafter, and tasks 001 to 012 were each verified by an agent other than the one that built them (see the prg).

## Canonical impact

None. No canonical register is declared in this repository (`docs/CLAUDE.md` does not exist and the wave names no `docs/bkg` or `docs/ana` register), as the Canonical Impact section of the TDD says.

Files outside likely_paths: src/test/java/io/morin/archicode/cli/MapLinksSharedTest.java (the command line side of the shared contract, REQ-3), src/test/resources/map-links/expected-boxes.json (the shared contract file)
