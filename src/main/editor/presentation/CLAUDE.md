# Editor: the band, the Changes panel and the stories

What the editor shows about plateaus: the band, the Changes panel and the story player. The rules of the command line are in `src/main/java/io/morin/archicode/workspace/CLAUDE.md`.

## The band and drawing a plateau

- The editor compares the drawn plateau with another one (*Compare with* on the band: nothing, the past that follows the plateau drawn, or any plateau of the tree, shown as in *Plateau* with the plateau drawn greyed).
- There is no other selector and no *Compare to*.
- The band that chooses them is on the pages of Timeline only and is read-only
- Two lists, *Plateau* and *Compare with*, handled by `chooseOnBand`, both showing the tree of the plateaus
- Every plateau in the order of the tree, indented by its depth with em spaces, `BAND_INDENT`, not capped
- One em space per level for a chain of any length, and under 40rem on the page Plateaus half a rem per level (`.timeline-item` in the narrow block of `style.css`)
- With the plateau drawn disabled in *Compare with*, which has *Nothing* and *Past* (`past`, follows the plateau drawn) before the tree, so that a plateau of the tree is a comparison chosen with `compareWithPlateau` as `diff --plateau <drawn> --against <id>` reads it
- A list chooses, it does not toggle: the plateau already compared with is not pressed twice
- One plateau on top of the drawn one that the address or `toggleCompareWithFuture` follows is the selected entry of the tree
- And a `compare=future` with several is a disabled *Choose a future plateau* entry selected with nothing selected in the tree
- The addresses `compare=past`, `future`, `future:<id>`, `other:<id>` are as they were
- And one button that opens the mistakes of the plateaus drawn and compared with, `bandMistakes`
- The tree and the counts are on the page Plateaus
- And *New plateau* / *Edit plateau* are `plateauWritingHtml`, on the page Plateaus
- `bandIsShown`; `syncLayers`, `drawPlateau`, `toggleCompareWithPast`, `toggleCompareWithFuture`, `compareWithPlateau`
- An address typed while the editor is open, or reached by Back and Forward, draws the plateau and the comparison it names (`syncPerspectiveFromHash` → `drawLayersNamedByAddress` → `drawPlateau(id, { compare, fromAddress })`; an address with no `plateau=` is the root, an unknown plateau leaves the one drawn, `compare=` is read when the address has it).
- And a plateau chosen on the band or the page is an entry of the history (`layerChangeIsAnEntry`, `syncHashFromState` pushes instead of replacing).
- `[[editor-band]]` for the two lists, `[[editor-current-plateau]]`, `[[editor-rename]]`,

## The Changes panel

- The Changes panel with *Write replaces* and *Not related*.
- Changes only, a switch among the tools of the diagram.
- And draws a key under the diagram (`diagramComparisonLegendHtml` in `#diagram-legend`, `.diagram-status`).
- Folded by default, one row with a sample of the box and of the link, the glyph, the word and the count of each state and a *Key* button (`toggle-diagram-key`, `aria-expanded`, `aria-controls="diagram-key"`) that opens the sentence on how each line is drawn and the note about dangling references.
- The folded row wraps, and stays one row that scrolls along under 700 px.
- The open key is capped at 30 % of the diagram area (`--dg-key-max`, set by `syncDiagramKey`, which a `resize` of the window runs again) and scrolls inside.
- The choice is `diagramKeyOpen`, view state only: changed in place without a redraw, put back by `showDiagramScene`, not in the address, the workspace or `diagramCacheKey`, no `modelsChanged()`, folded again with a new folder (`resetUiState`).
- `diagram-key-folded.test.js`.
- *Write replaces* of the Changes panel is where the key is written
- *Everything / Changes only* is among the tools of the diagram
- The Changes list is one function, `renderChangesPanelHtml`, written by the pages Plateaus, Applications, Environments, Elements and Stories.
- On Stories it is the Changes tab beside View on the page of a view, and alone on the right for a story, offered only while a comparison is on, `libraryRightHtml`.
- It is read one change at a time.
- *Previous change*, *Next change*, in the order of the list, stopping at the ends: `walkChange`, `currentChangeOf`, `changesWalk`.
- The keys `j` and `k` are the same walk, `handleChangesKeydown`, one listener on the document, which leaves the key alone with a Ctrl, Alt, Meta or Shift, while the reader types (an input, a textarea, a select, a contenteditable, a CodeMirror editor, the target and the focused element both looked at), while a dialog, the help or the menu of the header is open or a rejected YAML text is waiting, and where no list is on screen, and which gives no control the focus unless it was on the panel.
- Under the buttons `renderCurrentChangeDetailHtml` shows the "What changed" block of the change the walk is at, the one `renderWhatChangedHtml` writes for the inspection, so that Plateaus and a story with no view drawn show what a change is and the Selected tab is not needed to read it.
- A click on a row is unchanged, from Plateaus and from a story it opens Elements.
- And narrowed by a state and a layer (`changesFilter`, "12 of 167 changes", the selection moving to the nearest change shown: `setChangesFilter`).
- All of it is view state, not an input of the comparison nor of any diagram cache (no `modelsChanged()`), and the filters are all again when the pair of plateaus compared changes (`src/test/javascript/viewpoint-kernel/reading-changes.test.js`, on the 360 changes of `replaces-large-pair`; `changes-shortcut.test.js`, on the Brightcart pairs).
- The walk row is a sticky block under the `Selected | Changes` tabs: `.changes-walkbar` (`[data-changes-walkbar]`, a following sibling of `.changes-reading` under `.changes-panel`, `position: sticky`, `top: calc(-1rem + var(--right-tabs-h))`) holds *Previous change*, *Next change*, the position and *Show all*.
- `syncRightPanelSticky` (`presentation/right-panel.js`) sets `--right-tabs-h` and `--right-walk-h` on `#panel-right` after each render and on a resize, `.right-panel` takes their sum as `scroll-padding-top`, and `render()` brings the selected row into view with `block: 'nearest'`, so a walk moves the list by the least.
- The block is measured at 360 x 640 against the 35 % rule of RFC-001 (option B, the rows in their own scroll box, is built only above it).
- Safari is not proved: `changes-walk.spec.js` runs in Chromium and Firefox only, and WebKit and the real Safari are DEF-1.
- The editor in `replacesChainBetween` from `layerModelOf`;
- And *Write replaces* still writes the one entry the author chooses, in the manifest that declares the element, but only one its layer can hold:
- `[[editor-keyboard]]` for `j` and `k`,

## Stories and the story player

- The editor plays them: `goToStoryStep` draws the plateau and the comparison of the step with `drawPlateau(..., { fromAddress: true })` before it looks at the view, and a step that names none is drawn as the reader had it when the story began (`storyHome`, moved by a plateau the reader draws in the middle of the story; *Leave story* changes nothing)
- `stepProblem` looks at the view in the plateau of the step (`viewProblem(view, plateau)`, `indexOfPlateau`) and says `The element “x” is not in the plateau “p”.`, the plateau that is none or cannot be drawn (`stepPlateauProblem`), and the comparison with itself
- The bar over the diagram (*Show on diagram*, per step, on the page Stories) keeps what shows one step (title, "Step n of N", the words, *Edit text*, *Edit story*, *Leave story*, *Back to this step*) and has no *Previous*, *Next* or menu: they are the player's.
- *Play* opens the player (`data-action="story-player-open"` on the page Stories, disabled for a story with no step
- `openStoryPlayer(storyId, index, { opener, address })`, which does nothing for a story or step that is none, a dialog open or a player already open)
- A modal that covers the window (`#story-player`, a container beside `#app` and `#story-announcer`, `position: fixed; inset: 0`, `.player-*` sheet, one column that never grows past the window: the bar wraps, the words scroll in their own box) and plays the story like slides, decoupled from the editor
- `storyPlayer` is view state of the page (`{ story, step, home, scenes, scene, seq, framing, keyOpen, notice, opener, entry }`)
- `home` is `storyHomeNow()` taken when *Play* was pressed and never moved
- Each step comes from `storyStepScene(story, i, { home, readonly: true })` (the toggles `changesOnly` and `hideWording` are options of the scene, off unless given: the scene never reads the editor's; `stepDrawnAt`, `togglesOf`)
- Kept by step in `storyPlayer.scenes`, the answer of a step the reader has left is dropped (`seq`)
- And nothing of the editor is read or written while it is open: no `modelsChanged()`, no `AppState`, selection, perspective or file, `#app` is `inert` (the focus trap, Tab round the player's own controls, is for its ends), a redraw of the editor leaves the container alone, and closing puts nothing back because nothing moved (the focus goes to the *Play* that opened it, `returnFocusAfterPlayer`; `resetUiState` closes it with the folder).
- The slide (`renderStoryPlayerHtml`): title (the dialog's label, `role="dialog" aria-modal="true"`), "Step n of N", the menu of the steps (`renderStoryStepMenuHtml(story, current, className, { home, label, title })`, a native `<select data-player-step-menu>`, one entry per step, "n. title" (`storyStepTitle`), a step `stepProblem` refuses, looked at in its own plateau, marked "— cannot be shown: <sentence>" and carrying the sentence as its title; handled by `handleStoryPlayerChange`)
- *Previous*, *Next*, *Full screen* (the Fullscreen API on the container, only where `document.fullscreenEnabled`; a refusal says so in `player.notice` and the modal stays; `fullscreenchange` redraws the button; closing leaves it) and *Close*
- The plateau and the comparison the step is drawn at, said and not chosen ("(from the editor)" for what the step leaves to the home, `playerPlateausHtml`)
- The diagram with the player's own zoom and pan (`framing`, `applyPlayerFraming`, `setPlayerScale`, `movePlayerBy`: the pure parts of the editor's framing over the player's state, opened at a readable size with no element in the middle, the hint "Part of the diagram is out of view" as the editor's; buttons, the wheel and a drag) with the markup stripped of what selects (`playerDiagramHtml`: no `data-action`, no `role="link"`, no tab stop: no selection, no inspection)
- Its status line and the key of a comparison with its own ids and button (`playerLegendHtml`, `toggle-key`)
- A step that cannot be drawn marked with its reason and the way on open
- The words; and the step announced through `#story-announcer` (`sayPlayerStep`, "— cannot be shown: …" for a problem; emptied on close).
- Keys (`handleStoryPlayerKeydown`, the document, capture): Left and Right, Home and End walk the steps, Escape closes (from the menu too, a list that owns the arrows), Tab goes round
- The rule of `handleChangesKeydown` (a typing target or a control that owns the arrows, a modifier, a dialog, the help or the header menu open: the key is left alone; `j` and `k` of the changes are off while it is open).
- The address is `play=<story>&step=n` after the editor's own keys (the bar's `story=` and `step=` leave the address while it is open, so that there is one `step=`; `currentRouteHash`, `storyPlayerAddress`, `hashWithoutPlayer`, `handleHashChange`)
- Opening is an entry of the history (`pushState`), choosing a step replaces it, Back closes it, Forward opens it again at its step, Escape and *Close* go Back when the history holds the entry (`player.entry`), else rewrite the address in place
- A link opens it at load once the folder is open (`loadWorkspace`, read before `render()`, which writes the address back without it; the home is the plateau of the link)
- And an address that names no story, a step that is none, a story with no step or a page without stories leaves it closed and is written back as it really is
- `story-player-modal.test.js` (with `story-player-page.js`, the container, the focus and `inert` in Node) plays every step of the four shipped stories from several homes in the modal, step by step, by keys and from the menu, and compares it, box by box and link by link, with the editing walk, and checks that the editor is what it was, byte for byte, after
- The Stories page and the bar are compared with the page of 0.18.0 in `story-player-scene.test.js` (Previous, Next and Play apart; the menu is the player's).
- The scene of a step is drawn on the side, not in the editor (the story player draws with it)
- `storyStepScene(storyId, index, { home, readonly, changesOnly, hideWording })` (async) gives `{ storyId, index, count, title, text, announcement, plateau, against, told, problem, comparison, diagram }`: the plateau and the comparison the step names (`stepDrawing` over a `home` that the caller fixes when *Play* is pressed, `storyHomeNow()`), their models from `layerModelOf` (`drawingOfPlateaus`, which has the shape of `editorDrawing()`), the comparison from `comparisonStateOf(drawing, memo)` (the kernel's `compare`, kept on `layerCache.comparisons`, while `comparisonState()` is the same function over the editor's drawing and `comparisonCache`) and the diagram from `computeDiagramScene(recipe, input, comparison, source, kernel, elk, viewKey, readonly)`, the function `mountDiagramIfNeeded` draws through as well, `source` being null for the editor's own model and `{ index, baselineIndex, comparison, changesOnly }` for a step (`buildKernelInput`, `diagramItemText`, `tellRemovedItems`, `buildDiagramGhosts` and `renderDiagramSvg` take it as an option, and `viewDiagramRecipe(view, index, host)` is the recipe of a view in a model)
- It writes no `AppState`, page, address or file, keeps no cache but `layerCache`, reads no selection, and never calls `modelsChanged()`
- A step that cannot be drawn has its `problem` (`stepProblem(step, plateau)`, looked at in the plateau of the step) and no diagram
- `story-player-scene.test.js` draws every step of the four shipped stories from several homes and compares it, box by box and link by link, with the editing walk, and the editing layout with the page of 0.18.0 (Previous, Next and Play apart)
- The step is announced through `#story-announcer`, a live region outside `#app` (`storyStepAnnouncement`, `announceStoryStep`; nothing in the editing layout calls it, the player does)
- The story editor writes the keys with two lists per step (`setStepPlateau`, through `markEntryChanged`: no model changes, so no `modelsChanged()`)
- And *Keep as named view* keeps them.
- *Add to story...* has a box in the story picker's dialog (`storyStepPlateaus`, `storyPlateauChoiceHtml`), offered only when the workspace has plateaus and CHECKED when a comparison is on screen: checked, the new step is written with `at` (the plateau drawn) and `against` (the plateau compared with, as the id it resolves to now: a following *Past* is written as that plateau, and the dialog says so)
- Unchecked, the step has no key.
- A comparison the page cannot name (the future still to choose, a plateau that is gone, the plateau drawn itself) leaves `against` out and says why.
- Plateaus that cannot be drawn offer no box, or a disabled one, so the keys written always pass `stepPlateauProblem` (`add-to-story-plateaus.test.js`, on the Brightcart story `order_journey`).
- `[[editor-stories]]` and `[[editor-story-player]]` for the story player, `[[editor-keyboard]]` for the player's keys and `[[editor-small-screen]]` for its measures;
