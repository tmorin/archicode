# Editor: reading and writing layers

How the editor reads plateaus and writes into them, and its rename, move and delete dialogs. The rules of the command line are in `src/main/java/io/morin/archicode/workspace/CLAUDE.md`.

## How the editor reads layers

- The editor reads layers: every open workspace has the state `AppState.layers`: the plateau drawn, the comparison
- And a plateau is drawn as its chain, resolved layer by layer with the kernel's `apply_patches` (`resolveLayerStep`, `layerModelOf`, kept in `layerCache` for one tree of plateaus and one text of the manifests; the sentences of the checks are `LayerLoader`'s)
- The model of a plateau is `AppState.index`, the plateau compared with is `AppState.baseline` (the plateau drawn is the base only with the future)
- Each record says where it comes from (`declaredIn`, `patched`)
- The editor's pages: the perspectives are Timeline (the pages Plateaus, Applications, Environments, Elements), Stories, Files and Settings.
- `PERSPECTIVES` gives each page its `group` and its `route`.
- `pageIdFromHash` names the page an address opens.
- `currentPerspective` is the page on screen (they are the same ids).
- The page that lists and edits the plateaus is `plateaus`, route `#/timeline/plateaus`.
- The button Timeline of the top bar opens Applications, `PERSPECTIVE_GROUPS`.
- The code still calls `map` the page Applications and `library` the page Stories, and the page Environments (`environments`) is a Map of the technology layer as Applications is the Map of the application layer: one code with the layer as its parameter.
- `mapIsShown`, `mapLayer()`, `mapStateOf(layer)`.
- The pins, hidden elements and open boxes of the application layer are still `mapPinned`, `mapHidden`, `mapOpened`, those of the technology layer `technologyMapState`.
- `buildKernelInput('map', '', { layer })`, which gives a technology Map the application layer too (`app_elements`) and says `applications: false` or `relationships: false` only when it leaves one out (see the next paragraph).
- A saved view of `viewpoint: map` and `layer: technology` is the page Environments, through `applySavedView`, `currentViewDefinition` and `viewProblem`.
- And the page Elements keeps its own tree of both layers.
- The routes are the ones the pages write (`PERSPECTIVES[...].route`: `#/timeline/plateaus`, `#/timeline/applications`, `#/timeline/environments`, `#/timeline/elements`, `#/stories` and `#/stories/views`, `#/files`, `#/settings`) and `pageIdFromHash` reads nothing else.
- `#/map`, `#/elements`, `#/library`, `#/diagram`, `#/applications`, `#/plateaus`, `#/environments` and `#/timeline` alone are no routes, like any unknown address they open the default page, Applications, and the page writes `#/timeline/applications` (`editor-structure.test.js`).
- The stories and views of a page are the same whatever plateau is drawn (`manifestEntries`, `entriesOf`, `savedViews`, `storiesList`; a new one is a manifest with no `plateau:` in the first folder of `manifests.paths`, `createManifestEntry`; `filePlateauOf` is null for them, so Files puts them in the group *No plateau*).
- Files lists every file, always, in a group per plateau (`filesGroups`, `filesGroupOf`: the plateau of a file is `filePlateauOf`; the files that belong to no plateau are the group `none`, last, and it is generic: it holds whatever `filePlateauOf` says is null).
- A group folds and unfolds (`filesFolded`, kept while the editor stays open on the same folder, never written in the workspace; opening a file unfolds its group, `unfoldGroupOfOpenFile`).
- A workspace with no plateau keeps the flat list.
- No scope is chosen.
- The page warns of a plateau that disagrees with a folder named like another plateau (`filePlateauFolderWarning`).
- The page Settings has the field *Current plateau* (`renderCurrentPlateauSettingsHtml`, `commitCurrentPlateau`, `chooseCurrentPlateau`): a list of the plateaus in the order of the band and *None*, shown when there are at least two plateaus (or the file already has a `current`) and disabled while the plateaus have mistakes.
- The editor tells the same sentences in the same order and draws the plateau all the same, so that it can be repaired.
- `resolveLayerStep` tells it in the page with `rootProblem` when `context.layered` (K43 to K49 of `layer-checks-cases.json`, N88 of `negative-cases.json`);
- The editor builds the same tree with the same sentences (`buildPlateauTree` in `standalone.html`, `READ_SCHEMA` for the kind).

## Writing into a plateau, and the save

- `header` for an element with a manifest of its own, only its `header.parent` changes (at the top level the line goes).
- `inline` for a nested element and a parent of the same file.
- `paste` for a nested element and a parent of another manifest of the plateau written, the block is cut out of one file and pasted in the other with its comments, quotes and flow lists (`cutBlockFromText`, `pasteBlockInText`, both files marked modified; the ordinary patch writes a file whose layout they cannot follow).
- `extract` for a nested element that goes to the top level or under a parent of a plateau whose files the plateau drawn does not write, it gets a manifest of its own (`manifestTextFromBlock`, `plateau:` and `parent` in its header, next to the file it leaves).
- Every move of a layered workspace goes through `guardedLayerWrite` and a refused one changes nothing.
- Every edit goes through the line-preserving save, which writes a collection the edit changes back in brackets on its line when the file had it in brackets
- `openFlowLists` marks the first line of each opened collection
- `bracketChangedFlows` reads the block under the mark after the edit
- And `bracketedLine` writes `key: [a, b]`, `key: {k: v}` or `- {k: v}` with the comment that followed the closing bracket, the quotes and words of its values and the padding of the file
- It fits when the line, comment included, is no wider than the widest line of the file, between 100 and 120 columns, or than it was (`bracketWidth`)
- A comment inside the brackets, an anchor, an alias or a tag in them, an empty `[]`/`{}` that the edit fills and a result that does not read as the block keep the block, `save-keeps-the-brackets.test.js`
- Which keeps the quotes and the comments of what it writes again
- A scalar that comes back on a line that is new, because its collection changed shape or an item was reordered, has the quotes it had, found by its key and its text in the lines that go (`movedYamlQuote`; the quotes of a key too), asked before the style of the line it replaces
- A comment follows its own line when the line is written again, by the same key and text or the same key of a collection, within three kept lines, and the comment of an item in brackets or of a bare dash goes to the first line of the item that replaces it
- A run of lines that goes or comes slides over lines that read the same to where it covers whole items (`slideAmbiguousRuns`: removing the first of two `- [a, b]  # row a` items removes the first, with its comment)
- A comment left above a line that goes is moved out of the block scalar it now follows
- A block scalar that is an item of a list (`- |`, also `- >-`) is followed like `key: |` `yamlBlockHeader` is the one header test the five functions share, with the column of the last dash as the column the text must go past
- `yamlKeylessBlockHeader`, `yamlKeylessBlockIsLine` find it for the line the emitter wrote, `- "one\ntwo\n"`, by the text read from both
- The identity of a dropped `- |` is its emitted line
- And a block scalar on the key that takes the dash line of an item map (the key before it removed or one added in front) stays a block scalar, header comment and text moved to the new column and placed after the lines that go with it (`addLines` of the step, in the pass that follows the quotes of the file only)
- Kept limits, pinned by `save-keeps-quotes-and-comments.test.js` and left out of its generator: a comment on an item that is a list is lost when the lists around it are nested again, a list of lists with items in brackets that is wrapped is written in brackets
- The generator is `save-generator.js`, seeded, 2000 cases, no wall-clock bound
- And which keeps a UTF-8 byte-order mark a browser never hands the mark to the page, `File.text()` and the decoder of a response drop it, so `readTextAndMark` reads the first three bytes of the file and the page holds `rawText` without the mark and a `bom` flag on the file (on `AppState.workspace` for `.archicode.yaml`)
- `serverFileHandle.getFile` builds its `File` from the bytes of the response, not from `response.text()`
- `writeManifestFile` and `writeWorkspaceYaml` put the mark back first, once, through `withByteOrderMark`
- A file the editor creates has none
- `patchYamlText`, `moveBlockInText`, `cutBlockFromText` and `pasteBlockInText` also keep a mark they are given
- And a comment after the last line of a block that moves (in the file, to another file, to the top level) goes with the block when it is indented deeper than the item (as the keys of the block), or at the column of the item when no sibling follows it, the blank lines before it with it
- One at the column of the item above a sibling is that sibling's introduction and one shallower is the next thing's, and both stay, with everything after them
- `lastLineOfBlockWithComments`; the other side, `deeperThanItemAfterSibling`: the block below does not take the comments of the block above when it moves
- The rule is indentation alone, a heuristic pinned by `save-keeps-bom-and-trailing-comment.test.js`
- And anything that changes a model must end in `rebuildIndexAndRender()` or call `modelsChanged()`
- The comparison cache, the diagram cache and the cache of the quiet references are keyed on that version counter (plus the small parts that vary: facet, viewpoint, options), not on the serialised models or the kernel input.
- And the plateau drawn is the one a write goes to (`writingPlateau()`, null for a workspace that writes no plateau, which saves exactly as before): `commitElementEdit` (a field the plateau declares goes to its manifest, a field it inherits to a patch of its `Kind: Plateau` manifest, `writePatchChange` and `patchFor`: `SET`, `ADD`, `MERGE`, `SET` with `where`, and `REMOVE` of the `field` for a text or a number that is cleared)
- A list or tags that are emptied are still a `SET` of the empty one
- One patch per target and field, found again by the next edit and changed in place from `SET` to `REMOVE` and back, new patches at the end of the list
- `field-removal-cases.json`, `FieldRemovalCasesTest`, `field-removal.test.js`
- `commitDeleteElement` (a `REMOVE` for an inherited element)
- `commitCreateTopLevelElement` (`plateau:` in the header) and `commitPlateauCreate`/`commitPlateauEdit` all run under `guardedLayerWrite`, which resolves every plateau again, keeps the write only if the plateau written gives back the edited value and no plateau is refused that was not, asks first (`layer-confirm` dialog) when other plateaus inherit what was written, and otherwise restores everything (`snapshotWriteState`)
- The element and plateau writers of a layered workspace go through it (the view and story writers do not: they belong to no plateau)
- (not *Write replaces*, which writes the key on the new element in the manifest that declares it, and not the text editor of Files)
- A rename, a delete and a move rewrite only the files of the plateau drawn and of those that stand on it (`writeScopeHas`).
- The one thing a plateau is not written for is a kernel that refuses its patches (`readOnlyPlateauMessage`).
- And a view is never rewritten because of the case of its layer, `setViewLayer` writes only a change.
- It writes `settings.current` through `commitSettingsEdit` into the raw `settings` of `.archicode.yaml` (a file with no `settings` block gets one with that line alone; *None* takes the line out and leaves `settings: {}` when it was the only one) and refuses a plateau that is none with the sentence of the load (`layersOfSettingsCurrentProblem`).
- It is not under `guardedLayerWrite` (no plateau is resolved from that key) and does not redraw the plateau on screen: the key is read when the folder is opened with no address and no plateau remembered by the browser (`openLayers`; `settings-current-plateau.test.js`).
- A comment on an item that is a list, a list of lists in brackets, when lists are nested again, stay open limits pinned by their tests;
- `[[editor-elements]]` (the paragraph on the save) and `[[plateau-limits]]` for the brackets a changed collection keeps and the cases that stay a block,
- `[[plateau-limits]]` and `[[editor-elements]]` for the layouts the save keeps now (`- |`, a block scalar behind a first key that changes) and the two it still loses (L3, L4) and the two shapes that still fall back (`- - |` on one line, a folded block read differently),
- `[[editor-elements]]` (the paragraph on the save) and `[[plateau-limits]]` for the quotes and comments the save keeps and the layouts it still loses;
- `[[editor-elements]]` (the paragraph on the save) for the byte-order mark and `[[editor-move]]` for the comment after the last line of a block,

## Rename, move and delete dialogs

- And moves an element under another parent or to the top level (*Move*).
- Children follow, references rewritten in every file, in one of four ways told by `moveRouteUnder` and `moveTopVerdict`.
- The top level is offered for the kinds the layer holds at its root, read from `READ_SCHEMA` (`topLevelKindsOf`: person, solution and system; environment), which is also what the creation form allows blank (`TOP_LEVEL_BLANK_ATTACH_ALLOWED`).
- A container, a component or a node is never a root in the editor.
- The dialog lists the places offered and, in a list under it, one sentence for each element of the layer that is not (`moveParentVerdict`: itself, inside it, its parent now, a kind that cannot hold it, an id already held, declared twice) and for the top level, and it says that *Move* writes no `replaces`
- There is no *Move and write replaces* any more (`planMoveReplaces`, `replacesAncestorProblem` and the second button are gone)
- And so is *Delete*
- `plateauDeletion` says, before anything goes, what `commitPlateauDelete` does under `guardedLayerWrite`: any plateau but the root
- Its `Kind: Plateau` manifest and the manifests whose header names it are queued in `pendingFileRemovals`
- A `settings.current` that names it is taken out of `.archicode.yaml`
- A view or a step that would name a plateau or an element that is gone refuses it
- The plateau it overrode is drawn when it was the one drawn
- A plateau that others override is deleted in the same one step
- The plateaus that override it go under its parent, their `override` rewritten line by line in their `Kind: Plateau` manifest (taken out when the parent is the root; a plateau over another than the root always has that manifest, so none is made)
- And what it declares and patches is lost to every plateau that stands on it
- `plateauDeletionAbove` resolves each of them again without it (`resolveLayerStep` over `layerStateOf`, kept in `layerCache`) and the dialog lists, for each, its new parent and the elements it loses, gets back (the deleted plateau removed them) and reads differently
- A plateau above that would no longer resolve (a patch that selects nothing, a relationship or a parent that is gone) refuses the delete with that sentence (`plan.breaks`: a mistake to repair, not a loss; nothing is pruned), and so does a step told `at` a plateau above, or compared `against` one when the plateau it is told at does not keep the element either (the comparison is drawn from the plateau the step is told at: `survivesWhereTold`), or a saved view drawn in one, that would lose the element it draws (`stepsLosingTheirView`, `viewLosesInPlateauAbove` ``... step n is compared with `q`, which would no longer have `x` ``, ``the view `v` (`file`) is drawn in `q`, ... which would no longer have `x` ``, one sentence per view naming every such plateau; the editor's alone: the command line does not look at the plateau of a step; nothing is offered instead of a refusal, and a delete that passes is written byte for byte as by `archicode-0.17.0`, `delete-plateau-as-released.test.js`)
- The dialog's yes is the yes to those plateaus (`guardedLayerWrite`'s `confirmedFor`: a change of any other plateau is still asked)
- The past of a plateau that overrode it follows it to the new parent
- A leaf is deleted byte for byte as before; `delete-plateau-in-the-middle.test.js`
- The views and stories they rewrite belong to no plateau, so a rename follows them everywhere: when a plateau beside the one drawn (or standing on such a plateau) still has the old reference in its resolved model (`layerModelOf`, declared or only inherited) and a view or a story step names it, saving the form of the element with a new id opens a dialog first (`commitElementWithDraft` → `renameSiblingImpact`, `renderRenameSiblingsDialogHtml`) that names those plateaus and the views and steps that could no longer be drawn there
- *Rename anyway* writes exactly what a rename wrote before
- *Cancel* writes nothing
- No sibling, no name at risk, a workspace with no plateau and a rename in baseline open no such dialog, `commitElementEdit` itself asks nothing.
- *Move* asks the same question (a move changes the reference too, and the views and steps follow it everywhere): `submitMoveDialog` calls `renameSiblingImpact(reference, plan.newReference, layer)` once the parent is chosen and valid, and opens the same dialog (`rename-siblings` with `moving: true`: the words say move, the buttons are *Back to Move* and *Move anyway*)
- The Move dialog waits behind it as `dialog.back` with its parent chosen and its search typed, and *Back to Move*, Escape and a click beside the dialog (`closeAppDialog`) give it back, writing nothing
- *Move anyway* is `commitMoveElement` as it was (and the dialog of the plateaus that inherit what is moved may follow, as for a rename)
- No sibling, no name at risk, a move in baseline and a workspace with no plateau open nothing new and write the same files byte for byte (`move-sibling-plateaus.test.js`).
- Both this dialog and `layer-confirm` leave the form as it was typed when it is cancelled (Cancel, Escape, a click beside the dialog; the redraw that opens the dialog, and the one `guardedLayerWrite` makes when it puts a tried write back, gave the fields afresh from the model)
- `openAppDialog` keeps the values of the fields of the form on screen (`keepElementForm`, `keptElementForm`; `guardedLayerWrite` takes them before it writes and hands them over as `typedForm`) and `render()` puts them back (`restoreElementForm`) while the dialog is open and once more when it is gone
- View state only, no `modelsChanged()`, dropped by a yes (the write is the draft read before the dialog), by another element or another mode, and with the folder (`cancel-keeps-the-typed-form.test.js`).
- A refused write (`Not written: ...`) and an error in `writeElementDraft` keep it too (`writeElementDraft` takes `keepElementForm()` before it writes, because `guardedLayerWrite` has already redrawn the form from the model when it restores a write it refuses, and hands the copy to `keptElementForm` in its `catch` before the redraw that shows the sentence; no dialog is open, so `render()` puts the values back and drops the copy; view state, no `modelsChanged()`; the success path keeps nothing; `confirmLayerWrite` does the same: it takes `keepElementForm()` before the write the yes runs again and hands the copy to `keptElementForm` in its `catch`, so a write the second dialog then fails on gives the typed fields back; `cancel-keeps-the-typed-form.test.js`).
- `replaces` is read against the plateau the manifest builds on, so when the comparison is several layers apart (`replacesChainBetween` is not null) and a layer in between removed `from`, the entry would name nothing in the layer it is written in; `replacesLayerProblem` says it in one sentence that names the element, the plateau it builds on and what to do (compare the plateau with the one below, or write the entry in the layer that still has it), `acceptLayeredCandidate` refuses with it and writes nothing, and the Changes panel shows the button off, with the sentence as its title and under the pair; a split or a merge is written one pair at a time and each `from` is checked, and a merge (the open pairs of one layer and one `to`, two `from` or more) is checked for all its pairs before the first is written and refused as a whole, every button of it off with the sentence (`candidateLayerProblem`, `replacesMergeProblem`; set aside with *Not related* a pair that is no part of it)
- A comparison one layer apart, siblings one layer above what they share, a workspace without plateaus and an undrawable plateau below are not looked at, so the files written are those of wave 017 byte for byte.
- The field *Add replaces* of the inspection is checked the same way when the plateau drawn is the more recent plateau of the comparison on screen (`addReplacesLayerProblem`: the sentence under the field, nothing written; no comparison, the future and the cases above are not looked at), `write-replaces-refuses.test.js`, `replaces-and-delete-checks.test.js`.
- `[[editor-plateau-delete]]` for the delete of a plateau that others override;
- `[[plateau-replaces]]` for the composed `replaces` (*Write replaces* several layers apart refuses an entry the layer cannot hold, see the paragraph of the layered plateaus),
- `[[editor-rename]]` for the dialogs that give the form back when cancelled and for the question *Move* asks,

## Other editor rules

- A facet the kernel refuses (the Jayway dialect, a path it cannot read) is the error of the view, with its one sentence, on the page of a saved view and of an element: `facetRemovesElement` takes the error and answers no for every sentence the kernel says of a facet it refuses, `a facet left ...` included (`saved-view-jayway-facet.test.js`).
- The `layer` of a view, of a step that carries its own recipe and of a view definition is read in any case, as the command line reads it (`View.Layer`: `layer: Technology` and `TECHNOLOGY` are the technology layer, anything else the application layer).
- `viewLayerOf` is the one place the page does it, over `entryLayerOf` which the plateau-free check uses too.
- N86 and `view-layer-any-case.test.js`.
- The page derives `childKindOptionsForLevel` and its check from `READ_SCHEMA`,
- `[[editor-small-screen]]` for the 360 px measures;
