---
type: run
run: 0130
status: completed
wave: 018
profile: single-document
---

# Run 0130: legend-folded-and-form-kept

Wave 018, W-3. Closes GitHub issues tmorin/archicode#132 (the key under the diagram) and #129 (a refused write drops the typed form), decision D3 of the wave plan: the proposal of #132 as written, in the same lot as #129.

## Scope

1. The key of a comparison under the diagram is a folded row with a *Key* button; the full text opens on demand, capped, with an inner scroll.
2. A refused write (`Not written: ...`) and an error thrown in `writeElementDraft` keep the id, the name and the description typed in the form of an element.

## Reading first

- #132: `diagramComparisonLegendHtml` builds `#diagram-legend` in `.diagram-status` (`flex: none`): its entries carry sample, link sample, glyph, word, a sentence on the line style and the count; the note on dangling references is always there.
- #129: `writeElementDraft` catches the error of `commitElementEdit`, sets `saveStatus` and calls `render()`. For a layered workspace `guardedLayerWrite` has already restored the write and called `rebuildIndexAndRender()` before it throws, so the DOM form is already redrawn from the model when the `catch` runs: the copy must be taken before the write, not in the `catch`.

## Decisions

- **Key: one markup, the state in a class.** The markup is the same folded or open (`diagramComparisonLegendHtml` is state-free, so `scene.legend` and the diagram cache need no change): `syncDiagramKey()` sets `dg-key-open` and `aria-expanded` when the scene is put on screen and when the button is clicked. The folded row hides `.dg-legend-how`, `.dg-legend-note` and the title by CSS, so the text of the open key is byte for byte what it was and the tests that read it (`replaces-editor`, `changes-panel`, `styles`, `header`) are unchanged. `plateau-compare.test.js` read the whole text of the key and gets the word *Key* of the button: two of its assertions strip the button before reading (the text of the open key is otherwise unchanged) and one asserts the button. Rejected: building two markups (a second source of the words to keep in step, and the cache would need the state), and `<details>` (it cannot be capped and put back by the redraw the way the page's own state is).
- **The title is hidden when folded.** "X compared with Y:" is on the band already; it is the `title` of the *Key* button and shows when open. It was 250 px of a 304 px row at 360 px.
- **Folded row: wrap on a wide screen, one row that scrolls under 700 px.** At 1440 px the five entries of the pair measured need 929 px of an 832 px zone: one scrolling row there hid a state behind a scrollbar, so the row wraps (two rows). Under 700 px (the 558 x 514 pane, 360 px) it is one row that scrolls along (`overflow-x: auto`), since one row for each state would be five. Rejected: dropping the link sample when folded (saves about 130 px, still not one row at 1440 px, and loses the line style of the links).
- **Cap.** `max-height: var(--dg-key-max, 30vh)`; `syncDiagramKey` sets `--dg-key-max` to 30 % of the height of the parent of `.diagram-status` (the diagram area) when the key is open. It is measured at the open and at each redraw, not on a window resize (the fallback is 30vh); rejected: a resize observer for a cap that is a bound, not a layout.
- **State.** `diagramKeyOpen`, a `let` beside `diagramLegendHtml`; reset in `resetUiState` (a new folder folds it). Not in the address, the workspace, `diagramCacheKey`; no `modelsChanged()`. `aria-controls` names the group itself (`diagram-key`), since the sentences are inside the entries.
- **#129.** `writeElementDraft` takes `keepElementForm()` at its start (after any dialog, so it reads the form as shown, with the values `restoreElementForm` put back behind the dialog) and, in the `catch`, sets `keptElementForm` before `render()`; with no dialog open `restoreElementForm` puts the values back and drops the copy. The success path keeps nothing. Only the `catch` of `writeElementDraft` changed: `confirmLayerWrite` has its own `catch` (a refused *yes* of a dialog) and is not part of the issue. Rejected: taking the copy in `guardedLayerWrite` (it covers only the layered path, and the error path has no `guardedLayerWrite`).

## Measures (built-in browser, `archicode editor serve` on a copy of the layered Brightcart, `marketplace` compared with its past; before = the jar of HEAD, after = the jar built from this tree)

Height in px of `.diagram-status` (status line 19, plus the 19 or 38 of the hint "Part of the diagram is out of view", which both sides show and the key does not touch, plus the legend):

| width | before | after, folded | after, open (cap) |
| --- | --- | --- | --- |
| 1440 x 900 | 160 | 111 (key: 2 rows, 50) | 160 (key 99) |
| pane, 572 x 514 | 237 | 94 (key: 1 row, 33 with its scrollbar) | 184 (key 123 = 30 % of 411) |
| 360 x 800 | 378 | 126 (key: 1 row, 23) | 295 (key 192 = 30 % of 640) |

At 360 px the zone is the status line, the hint, the row of line styles and the key: the key is one row, scrolled along (its content is 1021 px wide). The "at most two rows" of the issue holds for the key alone; the status zone as a whole also holds the line of the status and the line styles, as it always did (no comparison: about 35 px), and the hint when it is shown. Enter and Space on the focused button toggle it (tried with the keys in the pane); the button has the title "X compared with Y: show or hide how each line is drawn".

## Verification

- `./mvnw -o verify -DskipITs=false '-Dtest=!CustomRenderingTest' -Dsurefire.failIfNoSpecifiedTests=false`: 978 unit tests (2 skipped), 21 integration tests, build success; `CustomRenderingTest` excluded as in run 0129. `cargo test` 227 passed, `embed.sh --check` clean, `node --test` 2044 tests 0 failures, prettier clean.
- Node: `cancel-keeps-the-typed-form.test.js` gains three tests (a refused write, an error of the write, a success keeps nothing); the first two fail on the page of HEAD (checked by stashing the page) and pass now. `diagram-key-folded.test.js` (new, 5 tests): the markup, the rules of the page, the click, the state across redraws and out of the cache key and the address, the reset with the folder.
- Identity: the manifests the page writes for a plain edit of an element through `commitElementWithDraft` (the layered Brightcart, `mailer`, name and description, confirmed) are byte for byte the same with the page of HEAD and with this page; the key is outside the SVG of the diagram, which this run does not touch.

## Canonical impact

`CLAUDE.md`: the sentence on the unfixed #129 is the fix, #129 leaves the list of limits of the manual and the one of *rename*, and the editor compares paragraph says what the key under the diagram is. The manual (`src/doc/README.adoc`) is W-9's.

## Not verified

#129 was not driven in a real browser (node test with a small DOM, as run 0121's tests; #129 itself was "not seen in a real browser"). A real phone, the dark theme of the folded key, a window resize while the key is open (the cap is measured at the open and the redraw), the native image.
