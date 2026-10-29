---
type: run
run: 0202
status: completed
profile: TDD+pln
wave: 027
---

# Run 0202 diagram-layout-columns

Wave 027, manifest id W-2.

## Baseline (task-001, before any change to src/main/editor)

Ratchet: `node scripts/check-editor.mjs --layers` says `upward pairs: 99 (max 99)`, names 1543, load order holds. Output of `node scripts/check-editor.mjs --list` (exit 0):

```
upward pairs: 99
application to composition: 4
  drawLayersNamedByAddress names compareFromHash
  goToStoryStep names currentRouteHash
  openLayers names compareFromHash
  openSavedView names currentRouteHash
application to presentation: 45
  addCurrentViewToStory names openAppDialog
  applySavedView names expandParentsOf
  applySavedView names mapPartsOf
  applySavedView names mapStateOf
  applySavedView names setDiagramShow
  applySavedView names useDiagramHost
  applySavedView names viewLayerOf
  canonicalViewDefinition names viewLayerOf
  closeLibrarySelection names libraryPickFor
  confirmLayerWrite names keepElementForm
  currentViewDefinition names currentDiagramFacet
  currentViewDefinition names currentMapState
  currentViewDefinition names diagramShowOverrides
  currentViewDefinition names diagramTabShown
  currentViewDefinition names effectiveDiagramViewpoint
  currentViewDefinition names elementSelection
  currentViewDefinition names mapIsShown
  currentViewDefinition names mapLayer
  currentViewDefinition names mapPartsShown
  goToStoryStep names mapIsShown
  goToStoryStep names useDiagramHost
  guardedLayerWrite names keepElementForm
  guardedLayerWrite names openAppDialog
  keepStepAsNamedView names openTextDialog
  layerDigest names elementDuplicates
  layersBlockedReason names elementDuplicates
  nameCurrentView names openTextDialog
  namedByView names viewLayerOf
  newStory names openTextDialog
  openMoveDialog names flushPendingDraft
  openMoveDialog names openAppDialog
  openPlateauDeleteDialog names openAppDialog
  recipeNamedReferences names viewLayerOf
  renameSavedView names openTextDialog
  renderPlateauDeleteDialogHtml names duplicateMessageHtml
  resetUiState names closeStoryPlayer
  resetUiState names newDiagramHostState
  resetUiState names setDiagramShow
  rewriteRecipeReferences names viewLayerOf
  schedulePlateauCounts names timelineChangesHtml
  selectOnLibraryPage names libraryPickFor
  selectOnLibraryPage names takeOverDiagramFraming
  submitMoveDialog names openAppDialog
  viewLosesInPlateauAbove names viewLayerOf
  viewProblem names viewLayerOf
model to application: 8
  compareTargetPlateau names layerCompareOther
  comparisonInput names layerCompareIsFuture
  comparisonStateOf names layerCompareIsFuture
  declaredReferencesOf names manifestLayer
  declaredReferencesOf names walkContentNodes
  resolveLayerStep names topLevelKindsOf
  stepProblem names viewProblem
  validateElementIdRename names validateElementId
model to presentation: 7
  kernelTagsOf names setOwnKey
  layerOfReference names elementSelection
  loadViewpointKernel names adoptKernelStates
  parkedDiagramHost names newDiagramHostState
  readSettingsDraft names setInlineErrorText
  readSettingsDraft names setRowInlineErrorText
  renderOriginBlockHtml names renderFieldRowHtml
persistence to application: 15
  commitFileEdit names rebuildIndexAndRender
  forgetFolder names resetUiState
  loadWorkspace names layersOfSettingsCurrentProblem
  loadWorkspace names openLayers
  managedSettingsAsRead names canonicalJson
  openFolder names resetUiState
  openRememberedFolder names resetUiState
  reloadManifestFile names rebuildIndexAndRender
  rewriteInboundReferences names manifestLayer
  rewriteInboundReferences names manifestRootReference
  rewriteInboundReferences names rewriteSavedViewReferences
  rewriteInboundReferences names walkContentNodes
  rewriteInboundReferences names writeScopeHas
  rewriteInboundReferences names writingPlateau
  showRememberedFolders names resetUiState
persistence to composition: 1
  loadWorkspace names applySelectionFromHashRef
persistence to presentation: 9
  checkFolderPermissions names landingControlSelector
  checkFolderPermissions names landingScreenConfig
  forgetUiReferences names dropLinkSelection
  forgetUiReferences names mapStateOf
  loadWorkspace names openStoryPlayer
  loadWorkspace names storyPlayerAddress
  reloadManifestFile names dropLinkSelection
  rewriteUiReferences names dropLinkSelection
  rewriteUiReferences names mapStateOf
presentation to composition: 10
  closeStoryPlayer names currentRouteHash
  handleHashChange names currentRouteHash
  handleHashChange names syncPerspectiveFromHash
  openStoryPlayer names currentRouteHash
  reconcileLinkSelection names syncHashFromState
  resetDiagramView names diagramFramingChanged
  setDiagramScale names diagramFramingChanged
  showDiagramScene names syncHashFromState
  showPlayerStep names currentRouteHash
  takeOverDiagramFraming names diagramFramingChanged
application/browser-workspaces.js: used by other parts: askToDeleteBrowserWorkspace, browserFailureText, browserRowSelector, browserWorkspaceById, browserWorkspaceTitle, cancelBrowserNameDraft, cancelBrowserWorkspaceQuestion, confirmDeleteBrowserWorkspace, newBrowserWorkspace, openBrowserWorkspace, refreshBrowserWorkspaces, renameBrowserWorkspaceRow, setBrowserNameDraft, submitBrowserNameDraft
application/bundle-flows.js: used by other parts: askToResetSample, backToServedFolder, cancelWorkspaceMenuQuestion, chooseBundleFile, confirmResetSample, exportBrowserWorkspace, exportOpenBrowserWorkspace, onWorkspaceMenuChange, openSample, setWorkspaceMenuOpen
application/commit-pipeline.js: used by other parts: TOP_LEVEL_BLANK_ATTACH_ALLOWED, TOP_LEVEL_KIND_OPTIONS, adoptRemovedFile, allocateManifestRelPath, commitCreateChildElement, commitCreateTopLevelElement, commitDeleteElement, commitElementEdit, commitElementEditNow, commitSettingsEdit, computeDeleteImpact, computeDeletedReferenceSet, manifestLayer, manifestRootReference, rebuildIndexAndRender, validateElementId, walkContentNodes
application/folder-session.js: used by other parts: closeFolder, forgetOpenFolder, resetUiState, retryFolder, tryAutoReopen
application/layer-writes.js: used by other parts: canonicalJson, comparableSentence, confirmLayerWrite, copyJson, guardedLayerWrite, layerActionRefusal, oneLine, readOnlyPlateauMessage, requireWritablePlateau, sameJson, writeScopeHas, writingPlateau
application/move.js: used by other parts: applyMoveFilter, moveIsPossible, openMoveDialog, renderMoveDialogBodyHtml, submitMoveDialog, topLevelKindsOf
application/plateau-choice.js: used by other parts: cachedNodeCounts, compareWithPlateau, drawLayersNamedByAddress, drawPlateau, layerChangeIsAnEntry, layerChildrenOf, layerCompareChoice, layerCompareIsFuture, layerCompareOther, layerIsBelow, layersBlockedReason, layersOfSettingsCurrentProblem, normalizedLayerCompare, openLayers, rememberLayerChoice, schedulePlateauCounts, settleAfterLayerChange, syncLayers, toggleCompareWithFuture, toggleCompareWithPast
application/plateau-commands.js: used by other parts: commitPlateauCreate, commitPlateauDelete, commitPlateauEdit, openPlateauDeleteDialog, renderPlateauDeleteDialogHtml
application/plateau-patches.js: used by other parts: commitLayeredElementEdit, ensurePlateauManifest, insertKeyBefore, plateauFolderFor, prunePatchesNaming, touchManifest, writeRemovePatch
application/story-actions.js: used by other parts: addCurrentViewToStory, addCurrentViewToStoryChoice, addStoryStep, bringLibrarySelectionIntoSight, closeLibrarySelection, currentPlateauDrawing, deleteSavedView, deleteStory, entryIsModified, goToStoryStep, keepStepAsNamedView, legacyEntriesToMove, moveLegacyEntriesToManifests, moveStoryStep, nameCurrentView, newStory, openSavedView, removeStoryStep, renameSavedView, repairStoryStep, savedViewsSorted, selectOnLibraryPage, selectStory, setStepHighlight, setStepPlateau, stepDrawing, stepPlateausMatchScreen, storiesSorted, storyPlateauChoiceHtml, undoRemoveStoryStep
application/story-entries.js: used by other parts: createManifestEntry, createStory, removeEntry, renameSiblingImpact, renderRenameSiblingsDialogHtml, rewriteRecipeReferences, rewriteSavedViewReferences, storiesUsingView, viewForDefinition, writableSteps
application/view-recipe.js: used by other parts: applySavedView, canonicalViewDefinition, currentViewDefinition, describeViewDefinition, indexOfPlateau, viewLabel, viewMatchesScreen, viewProblem
composition/address-routing.js: used by other parts: applySelectionFromHashRef, compareFromHash, currentRouteHash, diagramFramingChanged, sampleFromHash, setPerspective, syncHashFromState, syncPerspectiveFromHash
composition/events.js: used by other parts: handleAppClick, handleAppDblClick, handleAppPointerDown
composition/render.js: used by other parts: render
core/escape-html.js: used by other parts: escapeHtml
core/manifest-kinds.js: used by other parts: ARCHICODE_KIND_MAP, ARCHICODE_KIND_PREFIX, stripArchicodeKindPrefix
core/read-schema.js: used by other parts: READ_SCHEMA, manifestKindName, parseManifestText, parseYamlAsModel, readIsMissing, readWrongShape, unrecognizedKindProblem, workspaceProblem
core/yaml-block-moves.js: used by other parts: cutBlockFromText, keepStrayCommentsOutOfBlockScalars, manifestTextFromBlock, moveBlockInText, pasteBlockInText, pathOfElementNode, reserializeManifestFile
core/yaml-parser.js: used by other parts: isYamlCommentAt, isYamlSeqItem, isYamlWs, parseYaml, parseYamlFlowNode, plainNumberOf, resolveYamlPlain, scanYamlKey, setYamlKey, stripYamlComment, unescapeYamlDoubleQuoted, yamlDeferMalformed, yamlKeepWords, yamlKeysOf, yamlModelNumbers, yamlPlainNumberSeen, yamlPlainReading
core/yaml-patch-flow.js: used by other parts: closeFlowLists, openFlowLists, patchYamlTextColumns, shiftYamlLine, yamlLastLineUnderKey
core/yaml-patch-lines.js: used by other parts: locateEmittedLines, patchYamlLines, readYamlScalarLine, yamlBlockLinesToFlow, yamlIndentOf, yamlWordIsToken
core/yaml-patch-text.js: used by other parts: openYamlDecorations, patchYamlText, yamlBlockHeader, yamlKeylessBlockHeader, yamlKeylessBlockIsLine
core/yaml-serializer.js: used by other parts: escapeYamlDoubleQuoted, isYamlComplexValue, serializeManifestFile, serializeYamlInline, serializeYamlKey, serializeYamlScalarToken, serializeYamlValue, yamlEmptyCollection, yamlStringNeedsQuoting
model/app-state.js: used by other parts: AppState, browserStorageAsked, browserStoragePersisted, browserStoreState, browserWorkspaces, bundleNotice, createInitialAppState, landingBusy, landingFocusSelector, landingNameDraft, landingNotice, landingPendingDelete, modelVersion, modelsChanged, onRedraw, openingMessage, rememberedFolderById, rememberedFolderTitle, rememberedFolders, requestRedraw, workspaceLabel, workspaceMenuOpen, workspaceMenuQuestion, workspaceName
model/comparison.js: used by other parts: buildKernelInput, comparisonHasElement, comparisonInputBetween, comparisonState, comparisonStateOf, drawnPlateau, editorDrawing, replacesChainBetween, toKernelFacet
model/element-index.js: used by other parts: childKindOptionsFor, childKindOptionsForLevel, indexElementRecursive, withoutNthPresent
model/form-validation.js: used by other parts: FACET_ACTION_OPERATORS, VIEWPOINT_IDS, normalizeOptionalText, parseDirectoryNameTemplate, readSettingsDraft, validateElementIdRename, validateFacetActionDraft, validateFacetName, validateNewListEntry, validateNewTagKey, validateNewUse, validateRelationshipDraft
model/index-builder.js: used by other parts: buildIndex, duplicateReferenceMessage, firstManifestsDir, getDirectoryHandleByRelativePath, normalizeRelDir, resolveRelationships, viewsFolderName
model/kernel-bridge.js: used by other parts: kernelStringOf, kernelStringsOf, kernelTagsOf, loadElk, loadViewpointKernel, loadedKernel, toKernelElements
model/layer-loader.js: used by other parts: LAYER_NAMES, bandOrderOf, bandTreeOf, clonePlain, compareBandSiblings, declaredAnywhereCached, declaredReferencesOf, ensureLayerCache, entryLayerOf, entryProblemsIn, entryProblemsOf, graphReferencesOf, horizonPeriod, layerCache, layerManifestsByPlateau, layerModelOf, layerPlateauModel, layerStateOf, resolveLayerStep, stepPlateauKeys
model/map-links.js: used by other parts: canonicalLinkEntries, drawnLinkEntries, isLinkEntry, linkEntriesOf, linkEntryExists, linkEntryKey, linkEntryOf, normalLinkLabel, rewriteLinkEntries
model/origin-and-cascade.js: used by other parts: cascadeOf, originNoteHtml, renderOriginBlockHtml
model/plateau-tree.js: used by other parts: BASELINE_PLATEAU, LAYER_PLATEAU_ID_PATTERN, buildPlateauTree, checkPlateauRedeclarations, compareUnits, headerPlateau, isPlateauFreeManifest, plateauChain, plateauNames, plateauOfManifest
model/record-lookup.js: used by other parts: expandAncestorsOf, findElementRecord, layerOfReference, layerOfReferenceIn, locateContentNode, nodeKey, nodeKeyLayer, nodeKeyReference, recordIn, recordKey, referenceIsInBothLayers, toggleExpandedKey
model/settings.js: used by other parts: compareCodePoints, compareTargetPlateau, facetNameProblems, facetNameReason, holdsComparisonFiles, isGeneratedViewsFolder, isRecursiveManifestsPath, manifestsFolderOf, manifestsPathProblems, manifestsPathSentence, parseSettings, plateauPathProblem, plateauTitle, recalledComparison, recalledFlag, recalledPlateauId, rememberComparison, rememberFlag, rememberPlateauId
model/stories-model.js: used by other parts: STORY_DIAGRAM_VIEWPOINTS, activeStory, capitalizeWord, entryOwners, findSavedView, findStory, legacyEntries, libraryTab, manifestEntries, markEntryChanged, markWorkspaceYamlChanged, savedViews, selectedStoryId, selectedViewId, stepPlateauProblem, stepProblem, stepView, stepViewForDrawing, storiesList, storyLabel, storyNotice, storySteps, stringList, takenEntryIds, uniqueIdFor, workspaceTopLevel
model/styles.js: used by other parts: cssColorOf, isPlainObject, parseCssColor, readableTextColor, stereotypeStyleOf, styleLookOf, styleWholeNumber, styledStereotypesOf
model/ui-state.js: used by other parts: DEFAULT_PERSPECTIVE, DIAGRAM_SHOW_DEFAULTS, DIAGRAM_SHOW_NAMES, KERNEL_CONTRACT_VERSION, LEAF_KINDS, MAP_PARTS, NO_PLATEAU, activeFileEditorView, activeJsonEditorViews, appDialog, candidateMessage, changesTabPick, currentPerspective, diagramCache, diagramCenter, diagramFacet, diagramHideUnlinked, diagramHost, diagramKeyOpen, diagramLinkStop, diagramMaximized, diagramScale, diagramScene, diagramSeq, diagramShownView, elementTab, elkPromise, filesFolded, filesFoldsOwner, filesSelectionSeen, headerMenuOpen, helpOpen, keptElementForm, kernelWarningsShown, lastRenderedViewKey, libraryPick, mapHidden, mapHighlight, mapLinks, mapLinksFilter, mapLinksKind, mapLinksListOpen, mapLinksTickedOnly, mapOpened, mapPinned, mapSelectionCheck, navActiveKey, panelSizeStorage, parkedDiagramHost, pendingDeleteConfirmation, pendingFocusSelector, rawYamlEditDraft, removedPick, removedStep, saveStatus, scrollNavToSelection, storyBarEditing, storyBarNotice, technologyMapParts, technologyMapState, treeExpandedApplications, treeExpandedEnvironments, treeQuietCache, viewEditNotice, viewpointKernelPromise
persistence/browser-store.js: used by other parts: BROWSER_FILE_PREFIX, BROWSER_NAME_MAX, BROWSER_WORKSPACE_PREFIX, askForPersistentStorage, browserBytesOf, browserDirectoryHandle, browserError, browserPathProblem, browserStep, browserWorkspaceNameProblem, clearBrowserLast, createBrowserWorkspace, deleteBrowserWorkspace, isBrowserFileRecord, listBrowserWorkspaces, markBrowserExport, probeBrowserStore, readBrowserLast, renameBrowserWorkspace, withBrowserWorkspace, writeBrowserLast
persistence/browser-transfer.js: used by other parts: readBrowserWorkspaceFiles, replaceBrowserWorkspaceFiles
persistence/bundle-io.js: used by other parts: BROWSER_SAMPLES, bundleFileName, bundleFilePicker, bundleImportName, bundleProblemsSentence, fetchSampleBundle, readBundleFile, startBundleDownload
persistence/bundle.js: used by other parts: BUNDLE_MAX_BYTES, bundleComparePaths, bundleSkippedSentence, bundleWorkspaceFiles, unbundleWorkspaceFiles
persistence/folder-access.js: used by other parts: checkFolderPermissions, folderPermissionOf, forgetFolder, isFileSystemAccessSupported, isFolderAccessAvailable, isServedByArchiCode, openFolder, openRememberedFolder, openServedFolder, readTextAndMark, refreshRememberedFolders, reopenFolder, serverToken, showRememberedFolders, stripServerTokenFromUrl, withByteOrderMark, workspaceIsServedFolder
persistence/remembered-folders.js: used by other parts: clearLastFolder, forgetRememberedFolder, liveFolderId, noteWorkspaceName, readRememberedFolders, rememberFolder, sortRememberedFolders
persistence/save.js: used by other parts: commitFileEdit, countUnsavedChanges, currentFileEditorText, fileHasUnsavedChanges, forgetUiReferences, hasUnsavedChanges, reloadManifestFile, removedFileBaseline, rewriteInboundReferences, rewriteReferenceValue, rewriteUiReferences, saveAllChanges, saveInFlight
persistence/workspace-loading.js: used by other parts: WORKSPACE_FILE_NAME, loadWorkspace, setFatalError
presentation/changes-panel.js: used by other parts: acceptCandidate, addReplacesLayerProblem, changeChipHtml, changeKey, changeSelectionIsShown, changesSelectionStamp, changesWalk, clearChangesFilter, comparisonStateOfElement, dismissCandidate, isTypingTarget, renderChangesPanelHtml, renderChangesPendingHtml, renderLinkChangeHtml, renderRelationshipChangeHtml, renderStateWordHintsHtml, renderWhatChangedHtml, replacesWith, restoreCandidates, setChangesFilter, walkChange
presentation/diagram-controls.js: used by other parts: CONTROL_ICON_PATHS, anyDiagramShown, controlIconHtml, currentDiagramFacet, diagramLinkText, diagramTabShown, diagramTextWidth, diagramTruncate, effectiveDiagramViewpoint, focusControl, leafSafeViewpoint, libraryDiagramShown, renderDiagramHeaderActionsHtml, renderElementTitleHtml, renderMaximizeButtonHtml, setHeaderMenuOpen, toggleDiagramMaximized
presentation/diagram-interaction.js: used by other parts: DIAGRAM_MIN_READABLE_SCALE, diagramAutoScale, diagramFitScale, diagramFocusTargetOf, diagramFrameCenter, diagramLinkKeyOf, diagramScaleStep, exportDiagramPng, exportDiagramSvg, handleAppWheel, handleDiagramFocus, handleDiagramKeydown, handleDiagramPointerOut, handleDiagramPointerOver, keepDiagramCanvasStill, linkSelectionFor, pushDiagramHistory, resetDiagramView, revealDiagramNode, selectLink, setDiagramScale, showDiagramScene, startDiagramPan, takeOverDiagramFraming
presentation/diagram-layout.js: used by other parts: DIAGRAM_DESCRIPTION_LINES, buildDiagramGhosts, buildDiagramScene, buildElkGraph, computeMapThroughFacet, diagramComparisonLegendHtml, diagramEmptyHtml, diagramHasNothingToDraw, diagramLegendHtml, diagramStatusText, facetRemovesElement, hideUnlinkedItems, markElementTabs, renderDiagramFallbackHtml, renderDiagramSvg, syncDiagramKey
presentation/diagram-page.js: used by other parts: computeDiagramScene, diagramSelection, handleActivateKeydown, handleNavKeydown, kindAbbreviation, libraryDiagramRecipe, libraryPickFor, mapElementIsOnMap, mapPartsOf, markMapScope, markTreeThroughFacet, mountDiagramIfNeeded, navRows, nothingDrawnScene, plainControlFocusOf, recipePartsOf, renderDiagramCanvasHtml, renderDiagramDownloadHtml, renderElementDiagramHtml, renderMapPerspectiveHtml, renderSettingsPerspectiveHtml, renderShowOnMapButtonHtml, viewDiagramRecipe
presentation/diagram-state.js: used by other parts: DIAGRAM_MAX_GHOSTS, DIAGRAM_SCALES, DIAGRAM_VIEWPOINTS, ELEMENT_TABS, diagramHostOf, diagramPanned, diagramResizeObserver, diagramShow, diagramShowOverrides, diagramShows, newDiagramHostState, pendingDiagramFocus, setDiagramShow, useDiagramHost
presentation/diagram-states.js: used by other parts: CHANGE_GLYPHS, CHANGE_STATES, CHANGE_WORDS, IDENTITY_STATES, RELATIONSHIP_STATES, STATE_WORDS, adoptKernelStates, baseSideIndex, comparisonCountsOf, diagramItemText, diagramTitleHtml, elementIsOnlyInTheOtherPlateau, stereotypeBadgeVarsOf, stereotypeBadgesHtml, stereotypeLookOf, stereotypesOfRecord, styleVarsText, targetSideIndex, tellRemovedItems
presentation/dialogs.js: used by other parts: NEW_STORY_CHOICE, actionSelectorOf, closeAppDialog, keepElementForm, openAppDialog, openTextDialog, renderAppDialogHtml, restoreElementForm, submitAppDialog
presentation/element-form.js: used by other parts: applyRelationshipDraft, autosizeAllTextareas, commitElementWithDraft, copyOwnKeys, handleAppInput, readRelationshipDraftFromRow, renderCenterPanelHtml, renderReferenceDatalistsHtml, replacesFlagOf, setInlineErrorText, setOwnKey, setRowInlineErrorText, validateNewReplaces
presentation/element-view.js: used by other parts: mountFileEditorIfNeeded, renderElementPropertiesHtml, renderElementViewHtml, renderFieldRowHtml, renderItemListHtml, renderNoneHtml, renderQualifierPillsHtml, renderReferenceLinkHtml, renderTagListHtml
presentation/help-and-settings.js: used by other parts: chooseCurrentPlateau, docUrl, refreshFacetDirectoryPreviews, renderElementHeaderHtml, renderFileViewHtml, renderHelpButtonHtml, renderSettingsViewHtml, setHelpOpen
presentation/inspection.js: used by other parts: inspectionPanelHtml, removedInspectionOf, renderInspectionHtml, renderResizeHandleHtml
presentation/landing.js: used by other parts: canKeepWorkspace, landingControlSelector, landingScreenConfig, landingTimeText, pageTitle, renderLandingHtml
presentation/left-panel.js: used by other parts: comparisonForTrees, duplicateMessageHtml, duplicatesOfFile, elementDuplicates, filePlateauFolderWarning, filesGroups, navTabIndex, navTabStopGiven, referencesWithChildren, renderElementsNavHtml, renderFilesNavHtml, renderLeftPanelWrapperHtml, renderNavHeaderHtml, renderNavToolsHtml, sortedForNav, treeChangeMarkHtml, treeChangeOf, treeComparison, treeGroupId
presentation/map-links.js: used by other parts: chooseOnlyMapLink, handleMapLinksControl, linkEntryOfParts, mapHighlightFromParams, mapHighlightParams, mapLinkControlsApply, mapLinkKeyFocus, mapLinkParams, mapLinksFromParams, renderMapHighlightChipHtml, renderMapLinkOnlyButtonHtml, renderMapLinkPanelCheckboxHtml, renderMapLinksChipHtml, renderMapLinksListHtml, toggleMapHighlight, toggleMapLink
presentation/map-state.js: used by other parts: MAP_UNFOLD_CONFIRM_BOXES, closeOnMap, currentMapOpened, currentMapState, defaultMapOpened, expandParentsOf, headerControlSelector, mapBoxesIfOpened, mapIsShown, mapLayer, mapPartsShown, mapStateOf, resolveNavActive
presentation/page-registry.js: used by other parts: PERSPECTIVES, PERSPECTIVE_GROUPS, TIMELINE_PAGES
presentation/pages-plateaus-files.js: used by other parts: filePlateauOf, renderFilesPerspectiveHtml, renderPlateausPerspectiveHtml, settlePlateausPanel, showPlateauChanges, timelineChangesHtml
presentation/plateau-band.js: used by other parts: bandIsShown, chooseOnBand, layerModelBroken, openPlateauDialog, plateauDeleteButtonHtml, plateauWritingHtml, renderMistakesDialogBodyHtml, renderPlateauBandHtml
presentation/right-panel.js: used by other parts: applicationIsDeployed, comparisonPanelOn, dropLinkSelection, elementSelection, inspectionLinkFor, markInspection, markLinkSelection, reconcileLinkSelection, refreshRightPanel, relationshipKeyOf, relationshipsOfLink, relationshipsOfPair, removeInspectionPanel, renderElementsPerspectiveHtml, renderLinkInspectionHtml, revealLinkAfterDrawing, revealSelectedLink, rightPanelPending, scrollChangesToSelection, selectChange, setRightTab, settleLinkSelection, syncRightPanelSticky, withChangesPanel
presentation/shell-state.js: used by other parts: PANEL_SIZE_STORAGE_PREFIX, savedPanelSizeStyle
presentation/shell.js: used by other parts: ACTIONS_LEAVING_THE_FORM, WRITE_ACTIONS, cancelChanges, confirmDiscardingDraft, renderShellHtml
presentation/stories-pages.js: used by other parts: libraryChangesState, libraryRightTab, renderLibraryPerspectiveHtml, renderStoryBarHtml, renderStoryButtonsHtml, viewLinkChoices
presentation/story-menu.js: used by other parts: renderStoryStepMenuHtml, storyStepTitle
presentation/story-player.js: used by other parts: closeStoryPlayer, handleHashChange, openStoryPlayer, storyPlayer, storyPlayerAddress
presentation/story-scene.js: used by other parts: announceStoryStep, stepPlateauAt, storyHomeNow, storyStepAnnouncement, storyStepScene
presentation/theme.js: used by other parts: codeMirrorThemeExtensions, mountJsonEditorsIfNeeded, renderAppearanceSectionHtml, setThemeChoice
presentation/top-panel.js: used by other parts: WORKSPACE_EXPORT_PENDING_SENTENCE, draftTyped, flushPendingDraft, refreshSaveAllButton, renderPageTabsHtml, renderTopPanelHtml, syncSaveAllButtonsInPlace, workspaceExportIsPending
presentation/view-edit.js: used by other parts: editSavedView, handleAppChange, libraryPageView, lightSaveForTypedViewText, linkEntryOfKey, setViewHideUnlinked, setViewHighlight, setViewLink, setViewListItem, setViewMapPart, setViewShow, shownTextsOf, updateStoryField, viewLayerOf
```

## Red run (task-001)

Three new test files and one new test in `story-player-scene.test.js` fail on the current page for the reasons below; `diagram-columns-reference.js` is their shared helper (the bodies of `buildElkGraph` and `diagramCacheKey` as they were at `cc58851`, run in the page next to the new ones). Tests that pass now are regression guards on the default path (no `layout`: the graph equals the reference) and on the Settings save of a valid value.

### diagram-columns.test.js

```
✖ the page names the range and the choices of the list: 1 to 20, and 1 to 6, 8 and 12 in the toolbar
✖ the order is toolbar, view, workspace, none, for overview
✖ the order is toolbar, view, workspace, none, for detailed
✖ the order is toolbar, view, workspace, none, for deep
✖ the order is toolbar, view, workspace, none, for map
✖ only the key of the viewpoint drawn is the workspace level: another viewpoint is not read
✖ the workspace key is the viewpoint after leafSafeViewpoint: a leaf under the Detailed tab reads the overview key
✖ a level that is not set is skipped: no view, no properties, no layout, null, no settings, no views
✖ a whole number from 1 to 20 is valid, written 3 or 3.0; the ends are in
✖ an invalid view value is the sentence of DEC-1 and columns null: "3", 0, 21, 1.5, true, [] and a negative
✖ an invalid workspace value says where it is written: the sentence of DEC-1, with the path of the key
✖ a layout that is not a mapping with the one key `columns` is refused, and the sentence says what was found
✖ the first level that is set decides, valid or not: an invalid view does not fall back to the workspace
✖ a valid level wins over an invalid one below it: the sentence of a level that is not reached is not told
✖ an invalid workspace value with nothing above it is told, and draws no guess
✖ columnsProblem checks one layout value: null for a valid one and for none, the sentence for the others
ℹ tests 16
ℹ pass 0
ℹ fail 16
```

### diagram-columns-elk.test.js

```
✔ the saved Maps of the contracts are there to be drawn: both layers, a dozen maps at least
✔ with no layout anywhere the graph handed to ELK is the reference graph, key for key, and `columns` is not an option
✖ with columns 4 the root and every node that has children carry the two keys, no leaf does, and nothing else of the graph moves
✖ the bound is the number as text, whatever the number: 1, 7 and 20
✖ a saved Map with a layout reaches the layout engine bounded: the view's columns, then the workspace's, and the page says so on the graph it builds
ℹ tests 5
ℹ pass 2
ℹ fail 3
```

### diagram-columns-view.test.js

```
✖ the canonical form keeps layout as { columns: N } after the lists, hide-unlinked and the Map parts, and before the four texts
✖ VIEW_PROPERTY_ORDER holds layout after hide-unlinked and the Map parts and before the four texts
✖ a value equal to what the workspace gives for the viewpoint is not remembered; another one is; an invalid one is left as written
✖ setViewLayout writes layout where the editor writes it, and takes it out for none or for the workspace value
✖ a view that says an invalid layout cannot be drawn, with the sentence of DEC-1
✖ applySavedView puts the toolbar where the view says: its layout, else null, so the value of the diagram before does not leak
✖ applySavedView refuses a view with an invalid layout and leaves the toolbar alone
✖ a view with a layout matches the screen once applied, and so does one without; Keep as named view writes the toolbar value only
✖ a story step puts the toolbar where its view says, and a step with an inline recipe where its own layout says
✖ the key of a diagram with no value is the key it was; with a value it says so and is another key
✖ the Map has the Columns list: Default (none) first, then 1 to 6, 8 and 12; Default (n) when the workspace says n
✖ the list always has the value in force: 7 from the workspace is an entry, selected when it is the choice
✖ choosing a value sets the toolbar, redraws, calls no modelsChanged(); the value of the lower levels is stored as null
✖ the toolbar choice reaches the layout engine and wins over the view and the workspace
✖ on the page of a saved view the list edits the view, as the four texts do
✖ the form of a saved view has the Columns field, with the layout of the view, and changing it edits the view
✖ an invalid layout is an entry "invalid" in the field, with the sentence under it
✔ a rename or a move of the element the view names follows the element and leaves layout as it was
✖ the scene of a step with an inline recipe is bounded by its own layout, with no toolbar; an invalid one is the sentence of step_NN
✖ the Settings save refuses an invalid layout of overview with the sentence, at the field, and keeps the others
✔ the Settings save accepts a valid layout of overview and writes it with the rest of the properties
✖ the Settings save refuses an invalid layout of detailed with the sentence, at the field, and keeps the others
✔ the Settings save accepts a valid layout of detailed and writes it with the rest of the properties
✖ the Settings save refuses an invalid layout of deep with the sentence, at the field, and keeps the others
✔ the Settings save accepts a valid layout of deep and writes it with the rest of the properties
ℹ tests 25
ℹ pass 4
ℹ fail 21
```

### story-player-scene.test.js (one new test)

```
✖ a step whose view has a layout is bounded the same in the player and in the editing walk, and a toolbar value is the editor's alone
ℹ pass 19
ℹ fail 1
```

### What the failures say

- `diagram-columns.test.js`: "the page has no resolveDiagramColumns (DEC-2)", "the page has no columnsProblem (DEC-2)", "DIAGRAM_COLUMNS_MAX is not defined (DEC-1)".
- `diagram-columns-elk.test.js`: "strategy on root" (`elk.layered.layering.strategy` absent from the root and the compound nodes) with `columns: 4`; the no-layout reference test passes (the default path is today's).
- `diagram-columns-view.test.js`: "the page has no setViewLayout", "layout is in VIEW_PROPERTY_ORDER", "the view says 3" (`applySavedView` does not set the toolbar level), no `set-columns` list in the toolbar nor `view-edit-columns` in the form, `diagramColumns is not defined`, no `cols:` in the cache key, no sentence for an invalid `layout` in `viewProblem`, `readSettingsDraft` accepts an invalid `layout`.
- `story-player-scene.test.js`: the new test fails on the missing bound in the graph of the editing walk and of the player.

Names fixed by the tests that task-002 to task-004 must follow: `resolveDiagramColumns`, `columnsProblem`, `DIAGRAM_COLUMNS_MAX`, `DIAGRAM_COLUMNS_CHOICES`, `setViewLayout`, `diagramColumns`, `recipe.columns`, `recipe.layoutProblem`, `<select data-action="set-columns">`, `<select id="view-edit-columns" data-view-field="layout:columns">` (entries `""` for Default, numbers, `"invalid"`).

## Rows per container before and after columns 4 (task-006, VER-6, VER-7)

Measured by `src/test/e2e/diagram-columns.spec.js` (helper `rowsOf`: the boxes of the SVG grouped by the smallest group box that encloses them, a row being the boxes whose top is within 6 px) on a copy of the layered Brightcart, plateau `marketplace`, packaged jar, Chromium and Firefox (the same figures in both). `b` boxes, `r` rows, `w` the most boxes in one row. "After" is `columns: 4` in `settings.views.properties.<viewpoint>.layout`, except for the saved view, which also has the figures for its own `layout.columns: 2`. A saved view of the project (`shared/view.wide_map.yaml`, a Map of the application layer opened on `shop` and `platform`) is written by the spec.

| Page | Container | Before (b / r / w) | After, columns 4 (b / r / w) |
| --- | --- | --- | --- |
| Map (Applications) | top level | 20 / 10 / 4 | 20 / 9 / 4 |
| Element `commerce`, Detailed | top level | 10 / 3 / 6 | 10 / 4 / 4 |
| Element `commerce`, Detailed | commerce | 7 / 4 / 2 | 7 / 4 / 2 |
| Element `commerce`, Deep | top level | 10 / 3 / 6 | 10 / 5 / 4 |
| Element `commerce`, Deep | commerce | 7 / 4 / 2 | 7 / 4 / 2 |
| Element `commerce`, Deep | the nine other containers (discovery, storefront; the rest hold one box) | 1 to 2 boxes, 1 row | unchanged |
| Saved view (wide map) | top level | 20 / 11 / 4 | 20 / 9 / 4 |
| Saved view (wide map) | platform | 2 / 2 / 1 | 2 / 2 / 1 |
| Saved view, `layout.columns: 2` in the view | top level | | 20 / 13 / 2 |
| Map, toolbar 2 | top level | | 20 / 13 / 2 |

Findings:

- No container shows 6 boxes or more in a row at columns 4: the widest row is 4 everywhere (the acceptance of REQ-9 holds, at most 5). The escalation trigger did not fire.
- RISK-1 evidence: on the real diagram the links already stack the boxes, so the Map's base is 4 wide with 20 boxes at the top level; the bound at 4 changes the number of rows (10 to 9) and not the widest row. The widest rows that the bound shortens are on the pages of an element: the top level of Detailed and Deep goes from 6 to 4 boxes in a row. A bound of 2 gives 2 in a row and 13 rows, as asked; the toolbar's 6 on the saved view gave 4 (links decide before the bound).
- RISK-2: layout time, the fastest of three loads to a standing drawing of the Map (page load included, so it is an upper bound of the layout): without the value 834 ms and with columns 4 834 ms in Chromium (ratio 1.00), 1480 ms and 1426 ms in Firefox (ratios 0.96 to 1.01 across runs; ratios 0.58 to 1.01 in the earlier runs, all at or under 1.0 within noise). No time above twice the base: no finding.
- On the page of a saved view the Columns list edits the view (it is the view's own value, as the form's field), so "Default" takes the view's value out and the workspace's 4 draws again; the toolbar over a saved view that is loaded on the Applications page is proved in Node (`diagram-columns-view.test.js`), not here.
- At 360 px the Columns list is inside the box of the toolbar in both engines.

## Deliberate breaks and gates (task-008, VER-8)

Each file was saved before the break (copy outside the repository), broken, `npm run editor:build` run, the tests run, then restored from the copy and rebuilt; `diff` against the copy printed nothing after each restore and the page `standalone.html` is the saved one.

| Break | File | Tests that failed (exit 1) | After restore |
| --- | --- | --- | --- |
| 1. the layering keys left off the compound nodes (`bound({` removed on the container node, line 367) | `presentation/diagram-layout.js` | `diagram-columns-elk.test.js`: "with columns 4 the root and every node that has children carry the two keys, no leaf does, and nothing else of the graph moves"; "a saved Map with a layout reaches the layout engine bounded: the view's columns, then the workspace's, and the page says so on the graph it builds" | `diagram-columns-elk.test.js` exit 0 |
| 2. two levels of the resolver swapped (`levels.slice().reverse()`: workspace before view) | `model/diagram-columns.js` | `diagram-columns.test.js`: "the first level that is set decides, valid or not: an invalid view does not fall back to the workspace"; "the order is toolbar, view, workspace, none, for deep" and "for detailed"; "a valid level wins over an invalid one below it..."; `diagram-columns-view.test.js`: "the scene of a step with an inline recipe is bounded by its own layout, with no toolbar; an invalid one is the sentence of step_NN" | `diagram-columns.test.js` exit 0 |
| 3. the value left out of `diagramCacheKey` (`.concat([viewKey])`) | `presentation/diagram-page.js` | `diagram-columns-view.test.js`: "the key of a diagram with no value is the key it was; with a value it says so and is another key" | `diagram-columns-view.test.js` exit 0 |

Gates (exit code each):

| Command | Exit | Tail |
| --- | --- | --- |
| `npm run editor:build` | 0 | 78 parts, 2710741 bytes; `standalone.html` unchanged from the saved copy |
| `npm run editor:check` | 0 | names 1555 equal; load order holds; `upward pairs: 99 (max 99)` |
| `node scripts/check-editor.mjs --list` | 0 | `upward pairs: 99`; compared with the baseline above, every upward pair line is identical; the only differences are the "used by other parts" lines (new names `workspaceColumnsOf`, `diagramColumns`, `columnsOptionsHtml`, `renderColumnsToolHtml` and the new part `model/diagram-columns.js`) |
| `npm run test:coverage` (the unit suite with the floor) | 0 | pass 3284, fail 0, skipped 1; total 93.09 % of the lines (25591 of 27488), 96.27 % of the functions; "the figure holds the floor"; `git diff --stat -- scripts/editor-coverage-floor.json` prints nothing |
| `npm run lint` | 0 | no finding |
| `npm run format:check` | 0 | all matched files use Prettier code style |
| `./mvnw verify` (JDK 25.0.4-tem) | 0 | Tests run 1588, failures 0, errors 0, skipped 2; jacoco check and PMD passed; BUILD SUCCESS |
| `scripts/byte-identity.sh` | 0 | workspaces 20; commands compared 332; identical 326; accepted by the exceptions 5; unexpected 0; self-check ok; `git diff --stat -- scripts/byte-identity-exceptions.txt` prints nothing |
| `npx playwright test src/test/e2e/diagram-columns.spec.js` | 0 | 12 passed (chromium and firefox) |

Line counts: `model/diagram-columns.js` 65, `presentation/diagram-layout.js` 1256, `presentation/diagram-page.js` 1304; the longest part of the editor is `core/yaml-parser.js` with 1570, none above 3000. `ratchet.max` in `layers.json` is 99.

Criteria of the Executive Summary:

1. Tests red before, green after, three breaks caught with named tests: true (task-001 red run above; the table of breaks).
2. No layout set: byte for byte as before (`diagram-columns-elk.test.js` against the reference copy, the cache-key test, the Map expected-boxes suites in `test:coverage`): true.
3. Resolver order toolbar, view, workspace, none for the four viewpoints and the invalid sentence with `columns` null: true (`diagram-columns.test.js`, passes; break 2 turns it red).
4. Player and editing walk build equal ELK graphs, a toolbar value ignored by the player: true (`story-player-scene.test.js` and `diagram-columns-view.test.js`, pass).
5. `GuideViewPropertiesTest`, `GuideTest` and the two schema goldens: true (`./mvnw verify` exit 0, no schema golden in `git status`).
6. Spec passes in chromium and firefox, at most 5 boxes in a row at columns 4, table of rows recorded: true (12 passed; table above).
7. Page is the assembly, editor:check, coverage, lint, format pass, ratchet 99, no new upward pair, no floor lowered, no part above 3000 lines: true.
8. Byte-identity no new difference, exceptions file unchanged: true.
9. `CLAUDE.md` and `src/doc/README.adoc` describe `layout.columns`: true by grep below.

## Verification

Stage 11, re-run from the files by the Stage 11 agent on 2026-10-29: `npm run editor:check` exit 0 (1555 names equal, load order holds, upward pairs 99, max 99); the node tests `diagram-columns*.test.js` and `story-player-scene.test.js` 66 pass, 0 fail; `npm run lint` exit 0; `npm run format:check` clean. The gates of the section "Deliberate breaks and gates" (coverage, `./mvnw verify`, byte-identity, the Playwright spec in chromium and firefox) were run by task-008 and are not re-run here. Every criterion of the pln manifest holds, and the manifest is `done`. Not checked at Stage 11: the tag run, the native runner, WebKit.

Review pass: dispatched, the Stage 5 KDMLLC review of the TDD was done by one fresh agent independent of the drafter (findings F-1 to F-13 in the prg, applied by the pln section 2).

Canonical impact: none for the architecture or domain documents, because the run adds a view-state option of the editor and a key the command line ignores, and the contracts it touches are described in CLAUDE.md and the manual.

Files outside likely_paths: src/main/editor/layers.json, src/main/editor/presentation/diagram-controls.js, src/test/java/io/morin/archicode/cli/GuideViewPropertiesTest.java, docs/wav/wav-027-editor-layout-and-walk/run/run-0202-diagram-layout-columns/workflows/002-implement.js
