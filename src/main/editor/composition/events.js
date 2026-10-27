/**
 * Single delegated click handler for the whole #app subtree — every
 * interactive element declares `data-action` (and the data it needs),
 * so one listener (added idempotently each render(), see below) covers
 * every panel without per-node addEventListener calls (DEC-1's
 * innerHTML-template approach).
 */
function handleAppClick(e) {
  if (diagramPanned) {
    diagramPanned = false;
    return;
  } // the mouse button went up after dragging the diagram
  if (e.target && e.target.classList && e.target.classList.contains('app-dialog-backdrop')) {
    closeAppDialog();
    return;
  } // a click beside the dialog
  const target = e.target.closest('[data-action]');
  const action = target ? target.getAttribute('data-action') : null;
  if (helpOpen && action !== 'toggle-help' && !(e.target.closest && e.target.closest('.help-menu'))) {
    setHelpOpen(false); // a click anywhere else closes the help — no redraw: the action of this click reads the fields as they are
  }
  if (headerMenuOpen && action !== 'toggle-header-menu') {
    // a click on an item of the "⋯" menu closes it and leaves the focus on the button (so a dialog the item opens gives it back there); a click elsewhere only closes it
    const inMenu = e.target.closest && e.target.closest('.header-overflow');
    if (!inMenu) setHeaderMenuOpen(false);
    else if (target) setHeaderMenuOpen(false, { focusButton: true });
  }
  if (!target) return;
  // what an action said (a line over the story bar, the step that can be put back) lasts until the next one
  if (action !== 'dialog-submit' && action !== 'story-player-open') storyBarNotice = null; // Play changes nothing of the editor behind it (wave 021, run 0153)
  if (removedStep && action !== 'story-undo' && action !== 'story-step-remove' && action !== 'story-player-open')
    removedStep = null;
  if (draftTyped && ACTIONS_LEAVING_THE_FORM.has(action) && !confirmDiscardingDraft()) return;
  // wave 014 (runs 0080 and 0082): a plateau that cannot be drawn is not written (see `layerActionRefusal`)
  if (WRITE_ACTIONS.has(action)) {
    const refusal = layerActionRefusal();
    if (refusal !== null) {
      saveStatus = { state: 'denied', message: refusal };
      render();
      return;
    }
  }
  switch (action) {
    case 'toggle-help':
      // e.detail is 0 for a click made with the keyboard (Enter, Space): then the focus goes along
      setHelpOpen(!helpOpen, helpOpen ? { focusButton: e.detail === 0 } : { focusMenu: e.detail === 0 });
      break;
    case 'toggle-header-menu':
      // e.detail is 0 for a click made with the keyboard (Enter, Space): then the focus goes along
      setHeaderMenuOpen(
        !headerMenuOpen,
        headerMenuOpen ? { focusButton: e.detail === 0 } : { focusMenu: e.detail === 0 }
      );
      break;
    case 'open-folder':
      openFolder();
      break;
    case 'reopen-folder':
      reopenFolder();
      break;
    case 'open-remembered-folder':
      openRememberedFolder(rememberedFolderById(target.getAttribute('data-folder-id')));
      break;
    case 'forget-folder':
      forgetFolder(rememberedFolderById(target.getAttribute('data-folder-id')));
      break;
    case 'show-folders':
      showRememberedFolders();
      break;
    case 'retry-folder':
      retryFolder();
      break;
    case 'close-folder':
      closeFolder();
      break;
    case 'set-perspective':
    case 'set-page': // the bar under the band (the pages below Timeline) and the top bar (a perspective) open a page the same way
      setPerspective(target.getAttribute('data-perspective'));
      break;
    case 'toggle-files-group': {
      // wave 015 (run 0098): a group of the Files page folds and unfolds
      const group = target.getAttribute('data-group');
      if (filesFolded.has(group)) filesFolded.delete(group);
      else filesFolded.add(group);
      render();
      break;
    }
    case 'files-fold-all':
      filesGroups(AppState.manifestFiles).forEach((group) => filesFolded.add(group.key));
      render();
      break;
    case 'files-unfold-all':
      filesFolded.clear();
      render();
      break;
    case 'timeline-draw': // wave 014 (run 0081): the Plateaus page
      drawPlateau(target.getAttribute('data-plateau'));
      break;
    case 'timeline-changes':
      showPlateauChanges(target.getAttribute('data-plateau'));
      break;
    case 'open-mistakes': // wave 015 (run 0097): the band's button; the lists of the band are `chooseOnBand`
      openAppDialog({ kind: 'mistakes' });
      break;
    case 'set-changes-only': {
      // run 0040: the diagrams draw the changes with their context, or everything
      const only = target.getAttribute('data-value') === '1';
      if (only === AppState.changesOnly) break;
      AppState.changesOnly = only;
      rememberFlag('changes-only', only);
      diagramCache = null;
      mapSelectionCheck = true; // a selection the redraw no longer draws is dropped, as for a fold or a pin
      render();
      break;
    }
    case 'toggle-hide-wording': // run 0040: the changes of wording only are set aside (not drawn as changed, not listed, counted apart)
      AppState.hideWording = !AppState.hideWording;
      rememberFlag('hide-wording', AppState.hideWording);
      diagramCache = null;
      mapSelectionCheck = true;
      render();
      break;
    case 'set-right-tab':
      setRightTab(target.getAttribute('data-tab'));
      break;
    case 'change-next': // wave 015, run 0103 (#27): the list is read one change at a time
    case 'change-previous':
      walkChange(action === 'change-next' ? 'next' : 'previous');
      break;
    case 'change-filters-clear':
      clearChangesFilter();
      break;
    case 'accept-candidate':
      acceptCandidate({
        layer: target.getAttribute('data-layer'),
        from: target.getAttribute('data-from'),
        to: target.getAttribute('data-to')
      });
      break;
    case 'dismiss-candidate':
      dismissCandidate({
        layer: target.getAttribute('data-layer'),
        from: target.getAttribute('data-from'),
        to: target.getAttribute('data-to')
      });
      break;
    case 'restore-candidates':
      restoreCandidates();
      break;
    case 'select-change':
      selectChange({
        thing: target.getAttribute('data-thing'),
        change: target.getAttribute('data-change'),
        layer: target.getAttribute('data-layer'),
        ref: target.getAttribute('data-ref'),
        to: target.getAttribute('data-to'),
        label: target.getAttribute('data-label') || ''
      });
      break;
    case 'select-file': {
      const relPath = target.getAttribute('data-relpath');
      // DEC-10/FLOW-4: keep the draft when re-selecting the very file it
      // belongs to; discard it for any other navigation.
      if (rawYamlEditDraft && rawYamlEditDraft.relPath !== relPath) rawYamlEditDraft = null;
      // TDD-0010 DEC-4: a file view is never the element a pending delete
      // confirmation belongs to — discard unconditionally.
      if (pendingDeleteConfirmation) pendingDeleteConfirmation = null;
      AppState.selection = { kind: 'file', key: relPath, mode: 'view' };
      render();
      break;
    }
    case 'select-element': {
      const reference = target.getAttribute('data-ref');
      if (rawYamlEditDraft) rawYamlEditDraft = null; // DEC-10/FLOW-4 — an element is never the draft's file
      if (pendingDeleteConfirmation) pendingDeleteConfirmation = null; // TDD-0010 DEC-4 — same discard-on-navigate philosophy
      const layer = target.getAttribute('data-layer'); // the tree row knows its layer (the reference can exist in both)
      AppState.selection = layer
        ? { kind: 'element', key: reference, layer, mode: 'view' }
        : { kind: 'element', key: reference, mode: 'view' };
      render();
      break;
    }
    case 'diagram-zoom': {
      const dir = target.getAttribute('data-dir');
      setDiagramScale(
        dir === 'in' ? diagramScaleStep(1) : dir === 'out' ? diagramScaleStep(-1) : dir === 'fit' ? 'fit' : 1
      );
      break;
    }
    case 'toggle-maximize':
      toggleDiagramMaximized();
      break;
    case 'diagram-recenter':
      resetDiagramView();
      break;
    case 'diagram-export':
      if (target.getAttribute('data-format') === 'png') exportDiagramPng();
      else exportDiagramSvg();
      break;
    case 'toggle-fold': {
      const id = target.getAttribute('data-id');
      const mode = target.getAttribute('data-mode');
      if (mapIsShown()) {
        if (mode === 'expand') currentMapOpened().add(id);
        else {
          closeOnMap(id);
          mapSelectionCheck = true;
        }
      }
      render();
      break;
    }
    case 'map-pin': {
      const ref = target.getAttribute('data-ref');
      pushDiagramHistory();
      const map = mapStateOf();
      map.pinned = map.pinned.includes(ref) ? map.pinned.filter((r) => r !== ref) : map.pinned.concat([ref]);
      map.hidden = map.hidden.filter((h) => !(ref === h || ref.startsWith(h + '.')));
      if (map.pinned.includes(ref)) expandParentsOf(ref);
      mapSelectionCheck = true;
      render();
      break;
    }
    case 'map-unpin':
      pushDiagramHistory();
      mapStateOf().pinned = mapStateOf().pinned.filter((r) => r !== target.getAttribute('data-ref'));
      render();
      break;
    case 'map-hide': {
      const ref = target.getAttribute('data-ref');
      const map = mapStateOf();
      map.hidden = map.hidden.includes(ref) ? map.hidden.filter((r) => r !== ref) : map.hidden.concat([ref]);
      mapSelectionCheck = true;
      render();
      break;
    }
    case 'show-on-map': {
      const ref = target.getAttribute('data-ref');
      const layer = target.getAttribute('data-layer') === 'technology' ? 'technology' : 'application'; // the layer of the element on the page: the Map of that layer
      const map = mapStateOf(layer);
      map.pinned = [ref];
      map.hidden = map.hidden.filter((h) => !(ref === h || ref.startsWith(h + '.')));
      expandParentsOf(ref, layer);
      setPerspective(layer === 'technology' ? 'environments' : 'map');
      break;
    }
    case 'open-as-diagram':
      // the element on its own: its overview, unless a diagram was the last thing it showed
      if (elementTab === 'details') elementTab = 'overview';
      setPerspective('elements');
      break;
    case 'name-view':
      nameCurrentView();
      break;
    case 'add-to-story':
      addCurrentViewToStory();
      break;
    case 'select-story':
      selectStory(target.getAttribute('data-story'));
      break;
    case 'story-new':
      newStory();
      break;
    case 'story-delete':
      deleteStory(target.getAttribute('data-story'));
      break;
    case 'story-play':
      goToStoryStep(target.getAttribute('data-story'), Number(target.getAttribute('data-step') || 0));
      break;
    case 'story-player-open': // wave 021, run 0153 (#153): Play opens the player over the editor and touches nothing of it
      openStoryPlayer(target.getAttribute('data-story'), 0, { opener: target });
      break;
    case 'story-restore':
      if (activeStory) goToStoryStep(activeStory.id, activeStory.step);
      break;
    case 'story-edit':
      if (activeStory) {
        selectedStoryId = activeStory.id;
        storyNotice = null;
        libraryTab = 'stories';
        setPerspective('library');
      }
      break;
    case 'story-exit':
      activeStory = null;
      storyBarEditing = false;
      render();
      break;
    case 'story-step-up':
    case 'story-step-down':
      moveStoryStep(
        target.getAttribute('data-story'),
        Number(target.getAttribute('data-step')),
        action === 'story-step-down' ? 1 : -1
      );
      break;
    case 'story-step-remove':
      removeStoryStep(target.getAttribute('data-story'), Number(target.getAttribute('data-step')));
      break;
    case 'story-add-step': {
      const choice = document.getElementById('story-add-view');
      if (choice) addStoryStep(target.getAttribute('data-story'), choice.value);
      break;
    }
    case 'saved-view-open':
      openSavedView(target.getAttribute('data-view'));
      break;
    case 'library-tab':
      libraryTab = target.getAttribute('data-tab') === 'views' ? 'views' : 'stories';
      storyNotice = null;
      location.hash = currentRouteHash();
      pendingFocusSelector = '[data-action="library-tab"][data-tab="' + libraryTab + '"]';
      render();
      break;
    case 'select-view':
      selectedViewId = target.getAttribute('data-view');
      storyNotice = null;
      render();
      break;
    case 'library-go-view':
      libraryTab = 'views';
      selectedViewId = target.getAttribute('data-view');
      storyNotice = null;
      setPerspective('library');
      break;
    case 'library-go-story':
      libraryTab = 'stories';
      selectedStoryId = target.getAttribute('data-story');
      storyNotice = null;
      setPerspective('library');
      break;
    case 'plateau-create':
      openPlateauDialog('create', target.getAttribute('data-plateau'));
      break;
    case 'plateau-edit':
      openPlateauDialog('edit', target.getAttribute('data-plateau'));
      break;
    case 'plateau-delete':
      openPlateauDeleteDialog(target.getAttribute('data-plateau'));
      break;
    case 'dialog-cancel':
      closeAppDialog();
      break;
    case 'dialog-submit':
      submitAppDialog();
      break;
    case 'story-bar-edit':
      storyBarEditing = !storyBarEditing;
      pendingFocusSelector = storyBarEditing ? '.story-bar-text' : '[data-action="story-bar-edit"]';
      render();
      break;
    case 'story-undo':
      undoRemoveStoryStep();
      break;
    case 'story-step-name':
      keepStepAsNamedView(target.getAttribute('data-story'), Number(target.getAttribute('data-step')));
      break;
    case 'legacy-move':
      moveLegacyEntriesToManifests();
      break;
    case 'saved-view-rename':
      renameSavedView(target.getAttribute('data-view'));
      break;
    case 'saved-view-delete':
      deleteSavedView(target.getAttribute('data-view'));
      break;
    case 'view-list-remove': {
      const list = target.getAttribute('data-list');
      const reference = target.getAttribute('data-ref');
      pendingFocusSelector = '#view-edit-add-' + list;
      editSavedView((view) => setViewListItem(view, list, reference, false));
      break;
    }
    case 'toggle-show': {
      const name = target.getAttribute('data-show');
      if (!DIAGRAM_SHOW_NAMES.includes(name)) break;
      if (currentPerspective === 'library') {
        // the page of a view: the button edits the view, as the box of its panel does
        const view = libraryPageView();
        const recipe = view ? libraryDiagramRecipe(view) : null;
        if (recipe) editSavedView((entry) => setViewShow(entry, name, !recipe.shows[name]));
        break;
      }
      pushDiagramHistory();
      diagramShow[name] = !diagramShows(mapIsShown())[name];
      // back to the default is "no choice": the URL and the saved views then say nothing
      if (diagramShow[name] === DIAGRAM_SHOW_DEFAULTS[mapIsShown() ? 'map' : 'elements'][name])
        diagramShow[name] = null;
      render();
      break;
    }
    case 'map-clear':
      pushDiagramHistory();
      mapStateOf().pinned = [];
      mapStateOf().hidden = [];
      render();
      break;
    case 'map-unhide':
      mapStateOf().hidden = mapStateOf().hidden.filter((r) => r !== target.getAttribute('data-ref'));
      render();
      break;
    case 'fold-all':
      if (mapIsShown()) {
        mapStateOf().opened = defaultMapOpened();
        mapSelectionCheck = true;
        render();
      }
      break;
    case 'unfold-all':
      if (mapIsShown()) {
        // one more level each time; a big map asks first
        const more = (diagramScene && diagramScene.expandable) || [];
        const boxes = mapBoxesIfOpened(more);
        if (
          boxes > MAP_UNFOLD_CONFIRM_BOXES &&
          typeof window.confirm === 'function' &&
          !window.confirm(
            'Unfolding one more level draws about ' +
              boxes +
              ' boxes, which can be slow and hard to read. Unfold anyway?'
          )
        )
          break;
        for (const id of more) currentMapOpened().add(id);
        render();
        break;
      }
      break;
    case 'fix-dangling': {
      // a relationship that points at nothing is repaired where it is declared: in its owner's edit form
      const owner = target.getAttribute('data-ref');
      const ownerLayer = target.getAttribute('data-layer');
      AppState.selection = ownerLayer
        ? { kind: 'element', key: owner, layer: ownerLayer, mode: 'edit' }
        : { kind: 'element', key: owner, mode: 'edit' };
      expandAncestorsOf(owner, ownerLayer || undefined);
      scrollNavToSelection = true;
      setPerspective('elements');
      break;
    }
    case 'toggle-diagram-key': {
      // issue #132: the key under a comparison, folded or open (view state; the key is changed in place, nothing is drawn again)
      diagramKeyOpen = !diagramKeyOpen;
      syncDiagramKey();
      break;
    }
    case 'toggle-map-part': {
      // issue #107: the Map of the technology layer draws its applications and its relationships, or not (view state, not model state)
      const part = target.getAttribute('data-part');
      if (!MAP_PARTS.includes(part)) break;
      if (currentPerspective === 'library') {
        // the page of a view: the button edits the view, as the box of its form does
        const view = libraryPageView();
        const recipe = view ? libraryDiagramRecipe(view) : null;
        if (recipe && recipe.parts) editSavedView((entry) => setViewMapPart(entry, part, !recipe.parts[part]));
        break;
      }
      if (!mapIsShown() || mapLayer() !== 'technology') break;
      pushDiagramHistory();
      technologyMapParts[part] = !technologyMapParts[part];
      mapSelectionCheck = true; // the boxes of the applications go with their toggle: a selection the redraw no longer draws is dropped
      render();
      break;
    }
    case 'toggle-hide-unlinked':
      if (currentPerspective === 'library') {
        // see 'toggle-show'
        const view = libraryPageView();
        const recipe = view ? libraryDiagramRecipe(view) : null;
        if (recipe) editSavedView((entry) => setViewHideUnlinked(entry, !recipe.hideUnlinked));
        break;
      }
      if (!mapIsShown() && !diagramTabShown()) break;
      pushDiagramHistory();
      diagramHideUnlinked = !diagramHideUnlinked;
      mapSelectionCheck = true;
      render();
      break;
    case 'clear-facet': {
      pushDiagramHistory();
      diagramFacet = null;
      mapSelectionCheck = true;
      render();
      break;
    }
    case 'set-element-tab': {
      const next = target.getAttribute('data-tab');
      if (Object.prototype.hasOwnProperty.call(ELEMENT_TABS, next) && next !== elementTab) {
        pushDiagramHistory();
        elementTab = next;
      }
      render();
      break;
    }
    case 'goto-element': {
      const destinationRef = target.getAttribute('data-ref');
      if (currentPerspective === 'library') {
        // a box of the page of a view (or an element named in its panel): selected here, the page and its address stay
        selectOnLibraryPage({
          kind: 'element',
          key: destinationRef,
          layer: target.getAttribute('data-layer') || 'application',
          mode: 'view'
        });
        break;
      }
      if (AppState.selection.key !== destinationRef) pushDiagramHistory();
      if (mapIsShown() && diagramScale === 'auto') {
        const canvas = document.getElementById('diagram-canvas');
        if (canvas) takeOverDiagramFraming(canvas); // what is on screen stays: selecting must not jump the view
      }
      if (rawYamlEditDraft) rawYamlEditDraft = null; // DEC-10/FLOW-4 — an element is never the draft's file
      if (pendingDeleteConfirmation) pendingDeleteConfirmation = null; // TDD-0010 DEC-4 — same discard-on-navigate philosophy
      const destinationLayer = target.getAttribute('data-layer');
      AppState.selection = destinationLayer
        ? { kind: 'element', key: destinationRef, layer: destinationLayer, mode: 'view' }
        : { kind: 'element', key: destinationRef, mode: 'view' };
      expandAncestorsOf(destinationRef, destinationLayer || undefined); // FR-14/FLOW-5
      scrollNavToSelection = true;
      render();
      break;
    }
    case 'select-link': {
      if (currentPerspective === 'library') {
        // the page of a view: the link is selected in its panel, the Map's selection is not touched
        const pageNth = target.getAttribute('data-nth');
        diagramLinkStop = diagramLinkKeyOf(target);
        selectOnLibraryPage(
          linkSelectionFor(
            target.getAttribute('data-from'),
            target.getAttribute('data-to'),
            target.getAttribute('data-layer'),
            pageNth === null ? null : parseInt(pageNth, 10),
            null
          )
        );
        break;
      }
      // a link is not a place: no history entry, no change of perspective, tab or box; the drafts go like for any other selection
      if (rawYamlEditDraft) rawYamlEditDraft = null;
      if (pendingDeleteConfirmation) pendingDeleteConfirmation = null;
      if (mapIsShown() && diagramScale === 'auto') {
        const canvas = document.getElementById('diagram-canvas');
        if (canvas) takeOverDiagramFraming(canvas); // what is on screen stays: selecting must not jump the view
      }
      const nth = target.getAttribute('data-nth');
      diagramLinkStop = diagramLinkKeyOf(target); // a click moves the stop of the links to its link, whether or not the browser focuses it
      selectLink(
        target.getAttribute('data-from'),
        target.getAttribute('data-to'),
        target.getAttribute('data-layer'),
        nth === null ? null : parseInt(nth, 10)
      );
      if (mapIsShown())
        revealLinkAfterDrawing = { nth: Number.isInteger(parseInt(nth, 10)) ? parseInt(nth, 10) : null }; // the panel narrows the Map: the link must not end up behind it
      render();
      break;
    }
    case 'select-removed': {
      const removedRef = target.getAttribute('data-ref');
      const removedLayer = target.getAttribute('data-layer') || 'application';
      if (currentPerspective === 'library') {
        selectOnLibraryPage({ kind: 'baseline-element', key: removedRef, layer: removedLayer, mode: 'view' });
        break;
      }
      if (mapIsShown() && diagramScale === 'auto') {
        const canvas = document.getElementById('diagram-canvas');
        if (canvas) takeOverDiagramFraming(canvas); // what is on screen stays: selecting must not jump the view
      }
      if (rawYamlEditDraft) rawYamlEditDraft = null;
      if (pendingDeleteConfirmation) pendingDeleteConfirmation = null;
      // on the Map nothing else is selected any more (the panel is about this box); in Elements the element of the diagram stays the subject
      if (mapIsShown()) AppState.selection = { kind: 'none', key: null, mode: 'view' };
      removedPick = { reference: removedRef, layer: removedLayer, selection: JSON.stringify(AppState.selection) };
      render();
      break;
    }
    case 'close-removed':
      if (currentPerspective === 'library') {
        closeLibrarySelection();
        break;
      }
      removedPick = null;
      render();
      break;
    case 'close-inspection': // nothing else deselects on the Map; in Elements a link goes back to its element
      removedPick = null;
      if (currentPerspective === 'library') {
        closeLibrarySelection();
        break;
      }
      if (AppState.selection.kind === 'link') dropLinkSelection();
      else AppState.selection = { kind: 'none', key: null, mode: 'view' };
      render();
      break;
    case 'library-open-element': {
      // the one way out of the page from its panel: the element is selected in Elements, as the Map's "Open in Elements" does for its selection
      const openedRef = target.getAttribute('data-ref');
      const openedLayer = target.getAttribute('data-layer');
      if (rawYamlEditDraft) rawYamlEditDraft = null;
      if (pendingDeleteConfirmation) pendingDeleteConfirmation = null;
      AppState.selection = openedLayer
        ? { kind: 'element', key: openedRef, layer: openedLayer, mode: 'view' }
        : { kind: 'element', key: openedRef, mode: 'view' };
      expandAncestorsOf(openedRef, openedLayer || undefined);
      scrollNavToSelection = true;
      setPerspective('elements');
      break;
    }
    case 'toggle-element-edit':
      if (AppState.selection.kind === 'element') {
        AppState.selection.mode = AppState.selection.mode === 'edit' ? 'view' : 'edit';
      }
      render();
      break;
    case 'toggle-branch': {
      const branch = target.getAttribute('data-branch');
      if (branch === 'applications') {
        treeExpandedApplications = !treeExpandedApplications;
      } else if (branch === 'environments') {
        treeExpandedEnvironments = !treeExpandedEnvironments;
      }
      render();
      break;
    }
    case 'nav-unfold-all':
    case 'nav-fold-all': {
      // the tree of one layer: its elements, and — in Elements, where each tree has its own header — the tree itself
      const unfold = action === 'nav-unfold-all';
      const treeLayer = target.getAttribute('data-layer');
      referencesWithChildren(treeLayer).forEach((reference) =>
        unfold
          ? AppState.expanded.add(nodeKey(reference, treeLayer))
          : AppState.expanded.delete(nodeKey(reference, treeLayer))
      );
      const branch = target.getAttribute('data-branch');
      if (branch === 'applications') treeExpandedApplications = unfold;
      else if (branch === 'environments') treeExpandedEnvironments = unfold;
      render();
      break;
    }
    case 'toggle-element':
      toggleExpandedKey(nodeKey(target.getAttribute('data-ref'), target.getAttribute('data-layer')));
      render();
      break;
    case 'add-qualifier': {
      const reference = target.getAttribute('data-ref');
      const input = document.getElementById('add-qualifier-input');
      const result = validateNewListEntry(input ? input.value : '');
      if (!result.valid) {
        setInlineErrorText('add-qualifier-error', result.error);
        break;
      }
      commitElementWithDraft(reference, (node) => {
        const qualifiers = Array.isArray(node.qualifiers) ? node.qualifiers.slice() : [];
        qualifiers.push(result.value);
        node.qualifiers = qualifiers;
      });
      break;
    }
    case 'remove-qualifier': {
      if (!confirm('Remove this qualifier?')) break;
      const reference = target.getAttribute('data-ref');
      const index = parseInt(target.getAttribute('data-index'), 10);
      commitElementWithDraft(reference, (node) => {
        node.qualifiers = withoutNthPresent(node.qualifiers, index); // the place among the pills drawn, not in the list: an item with no value is not drawn (#120)
      });
      break;
    }
    case 'add-application': {
      const reference = target.getAttribute('data-ref');
      const input = document.getElementById('add-application-input');
      const result = validateNewListEntry(input ? input.value : '');
      if (!result.valid) {
        setInlineErrorText('add-application-error', result.error);
        break;
      }
      commitElementWithDraft(reference, (node) => {
        const applications = Array.isArray(node.applications) ? node.applications.slice() : [];
        applications.push(result.value);
        node.applications = applications;
      });
      break;
    }
    case 'remove-application': {
      if (!confirm('Remove this application reference?')) break;
      const reference = target.getAttribute('data-ref');
      const index = parseInt(target.getAttribute('data-index'), 10);
      commitElementWithDraft(reference, (node) => {
        node.applications = withoutNthPresent(node.applications, index);
      });
      break;
    }
    case 'add-replaces': {
      // wave 009: the same writer as "Write replaces" (`replacesWith`), through the same edit as the other lists
      const reference = target.getAttribute('data-ref');
      const record = findElementRecord(reference);
      const input = document.getElementById('add-replaces-input');
      const result = record
        ? validateNewReplaces(record, input ? input.value : '')
        : { valid: false, error: 'Element not found.' };
      if (!result.valid) {
        setInlineErrorText('add-replaces-error', result.error);
        break;
      }
      const layerProblem = addReplacesLayerProblem(record, result.value); // #138: the check of "Write replaces" (#130), before anything is written
      if (layerProblem) {
        setInlineErrorText('add-replaces-error', layerProblem);
        break;
      }
      commitElementWithDraft(reference, (node) => {
        node.replaces = replacesWith(node.replaces, result.value);
      });
      break;
    }
    case 'remove-replaces': {
      if (!confirm('Remove this reference from replaces?')) break;
      const reference = target.getAttribute('data-ref');
      const index = parseInt(target.getAttribute('data-index'), 10);
      commitElementWithDraft(reference, (node) => {
        const replaces = Array.isArray(node.replaces) ? node.replaces.slice() : [];
        replaces.splice(index, 1);
        if (replaces.length > 0) node.replaces = replaces;
        else delete node.replaces;
      });
      break;
    }
    case 'add-use': {
      const reference = target.getAttribute('data-ref');
      const input = document.getElementById('add-use-input');
      const result = validateNewUse(reference, input ? input.value : '');
      if (!result.valid) {
        setInlineErrorText('add-use-error', result.error);
        break;
      }
      commitElementWithDraft(reference, (node) => {
        const uses = Array.isArray(node.uses) ? node.uses.slice() : [];
        uses.push(result.value);
        node.uses = uses;
      });
      break;
    }
    case 'remove-use': {
      if (!confirm('Remove this used environment or node?')) break;
      const reference = target.getAttribute('data-ref');
      const index = parseInt(target.getAttribute('data-index'), 10);
      commitElementWithDraft(reference, (node) => {
        const uses = withoutNthPresent(node.uses, index);
        if (uses.length > 0) node.uses = uses;
        else delete node.uses;
      });
      break;
    }
    case 'add-tag': {
      const reference = target.getAttribute('data-ref');
      const record = findElementRecord(reference);
      const keyInput = document.getElementById('add-tag-key-input');
      const valueInput = document.getElementById('add-tag-value-input');
      const result = validateNewTagKey(keyInput ? keyInput.value : '', record ? record.tags : {});
      if (!result.valid) {
        setInlineErrorText('add-tag-error', result.error);
        break;
      }
      const value = valueInput ? valueInput.value : '';
      commitElementWithDraft(reference, (node) => {
        const tags = node.tags && typeof node.tags === 'object' ? copyOwnKeys(node.tags) : {};
        setOwnKey(tags, result.key, value); // an own key even for `__proto__`: a plain assignment would drop it
        node.tags = tags;
      });
      break;
    }
    case 'remove-tag': {
      if (!confirm('Remove this tag?')) break;
      const reference = target.getAttribute('data-ref');
      const key = target.getAttribute('data-key');
      commitElementWithDraft(reference, (node) => {
        const tags = node.tags && typeof node.tags === 'object' ? copyOwnKeys(node.tags) : {};
        delete tags[key];
        node.tags = tags;
      });
      break;
    }
    case 'add-relationship': {
      const reference = target.getAttribute('data-ref');
      const row = target.closest('.relationship-edit-row');
      const draft = readRelationshipDraftFromRow(row);
      if (!draft.valid) {
        setRowInlineErrorText(row, draft.error);
        break;
      }
      commitElementWithDraft(reference, (node) => {
        const relationships = Array.isArray(node.relationships) ? node.relationships.slice() : [];
        relationships.push(applyRelationshipDraft({}, draft)); // no empty label / qualifiers / tags keys
        node.relationships = relationships;
      });
      break;
    }
    case 'remove-relationship': {
      if (!confirm('Remove this relationship?')) break;
      const reference = target.getAttribute('data-ref');
      const index = parseInt(target.getAttribute('data-index'), 10);
      commitElementWithDraft(reference, (node) => {
        const relationships = Array.isArray(node.relationships) ? node.relationships.slice() : [];
        relationships.splice(index, 1);
        node.relationships = relationships;
      });
      break;
    }
    case 'add-facet': {
      const input = document.getElementById('add-facet-name-input');
      const result = validateFacetName(input ? input.value : '', AppState.workspace.settings.facets.customs);
      setInlineErrorText('add-facet-error', result.valid ? '' : result.error);
      if (!result.valid) break;
      const draft = readSettingsDraft();
      if (!draft.valid) break;
      commitSettingsEdit((settings) => {
        draft.apply(settings);
        settings.facets.customs = settings.facets.customs.concat([{ name: result.name, actions: [] }]);
      });
      break;
    }
    case 'remove-facet': {
      if (!confirm('Remove this facet?')) break;
      const facetIndex = parseInt(target.getAttribute('data-facet-index'), 10);
      const draft = readSettingsDraft();
      if (!draft.valid) break;
      commitSettingsEdit((settings) => {
        draft.apply(settings);
        const customs = settings.facets.customs.slice();
        customs.splice(facetIndex, 1);
        settings.facets.customs = customs;
      });
      break;
    }
    case 'add-facet-action': {
      const facetIndex = parseInt(target.getAttribute('data-facet-index'), 10);
      const row = target.closest('.relationship-edit-row');
      const result = validateFacetActionDraft(row.querySelector('.facet-action-jsonpath-input').value);
      if (!result.valid) {
        setRowInlineErrorText(row, result.error);
        break;
      }
      const operator = row.querySelector('.facet-action-operator-input').value;
      const draft = readSettingsDraft();
      if (!draft.valid) break;
      commitSettingsEdit((settings) => {
        draft.apply(settings);
        const customs = settings.facets.customs.slice();
        const facet = customs[facetIndex];
        customs[facetIndex] = Object.assign({}, facet, {
          actions: facet.actions.concat([{ operator: operator, jsonPath: result.jsonPath }])
        });
        settings.facets.customs = customs;
      });
      break;
    }
    case 'remove-facet-action': {
      if (!confirm('Remove this action?')) break;
      const facetIndex = parseInt(target.getAttribute('data-facet-index'), 10);
      const actionIndex = parseInt(target.getAttribute('data-action-index'), 10);
      const draft = readSettingsDraft();
      if (!draft.valid) break;
      commitSettingsEdit((settings) => {
        draft.apply(settings);
        const customs = settings.facets.customs.slice();
        const facet = customs[facetIndex];
        const actions = facet.actions.slice();
        actions.splice(actionIndex, 1);
        customs[facetIndex] = Object.assign({}, facet, { actions: actions });
        settings.facets.customs = customs;
      });
      break;
    }
    case 'reload-file-edit': {
      const relPath = target.getAttribute('data-relpath');
      const mf = AppState.manifestFiles.find((f) => f.relPath === relPath);
      if (!mf || !mf.existedOnDisk) break;
      if (fileHasUnsavedChanges(relPath)) {
        const others = AppState.manifestFiles.filter((f) => f.dirty && f.relPath !== relPath).map((f) => f.relPath);
        const message =
          'Discard unsaved changes to ' +
          relPath +
          ' and reload it from disk?' +
          (others.length > 0 ? '\n\nOther modified files are NOT reverted:\n' + others.join('\n') : '');
        if (!confirm(message)) break;
      }
      reloadManifestFile(relPath);
      break;
    }
    case 'open-create-child-form': {
      // TDD-0010 DEC-1: category is determined the same way
      // readElementDraft does — whichever index Map holds it.
      const reference = target.getAttribute('data-ref');
      const category = layerOfReference(reference) || 'application'; // the layer of the element being edited (the selection)
      if (rawYamlEditDraft) rawYamlEditDraft = null;
      AppState.selection = { kind: 'create', createMode: 'child', category, parentReference: reference };
      render();
      break;
    }
    case 'open-create-top-level-form': {
      const category = target.getAttribute('data-category');
      if (rawYamlEditDraft) rawYamlEditDraft = null;
      AppState.selection = { kind: 'create', createMode: 'top-level', category, parentReference: null };
      render();
      break;
    }
    case 'cancel-create': {
      // TDD-0010 DEC-1: no AppState mutation beyond resetting selection —
      // a create form backed out of leaves nothing behind.
      const sel = AppState.selection;
      if (sel.kind === 'create' && sel.createMode === 'child') {
        AppState.selection = { kind: 'element', key: sel.parentReference, layer: sel.category, mode: 'edit' };
      } else {
        AppState.selection = { kind: 'none', key: null, mode: 'view' };
      }
      render();
      break;
    }
    case 'submit-create-child': {
      const sel = AppState.selection;
      const parentReference = sel.parentReference;
      const category = sel.category;
      const kindSelect = document.getElementById('create-kind-select');
      const idInput = document.getElementById('create-id-input');
      const nameInput = document.getElementById('create-name-input');
      const descriptionInput = document.getElementById('create-description-input');

      setInlineErrorText('create-id-error', '');
      setInlineErrorText('create-form-error', '');

      // commitCreateChildElement re-validates the kind (DEC-3, "never trust the DOM alone"), the id (a safe id,
      // not already used by the same layer) and rejects with the field to blame.
      const created = commitCreateChildElement({
        parentReference,
        layer: category,
        kind: kindSelect ? kindSelect.value : '',
        id: idInput ? idInput.value : '',
        name: normalizeOptionalText(nameInput ? nameInput.value : ''),
        description: normalizeOptionalText(descriptionInput ? descriptionInput.value : '')
      });
      if (!created.ok) {
        setInlineErrorText(created.field === 'id' ? 'create-id-error' : 'create-form-error', created.error);
        break;
      }
      if (created.pending) break; // wave 014 (run 0082): the author is asked first; the form stays until the answer

      // FR-3: one extra render after commitElementEdit's own rebuild
      // render, which still carried the stale (create-form) selection.
      AppState.selection = { kind: 'element', key: created.createdReference, layer: created.layer, mode: 'edit' };
      render();
      break;
    }
    case 'submit-create-top-level': {
      const sel = AppState.selection;
      const category = sel.category;
      const kindSelect = document.getElementById('create-kind-select');
      const idInput = document.getElementById('create-id-input');
      const nameInput = document.getElementById('create-name-input');
      const descriptionInput = document.getElementById('create-description-input');
      const attachUnderInput = document.getElementById('create-attach-under-input');

      setInlineErrorText('create-id-error', '');
      setInlineErrorText('create-attach-under-error', '');
      setInlineErrorText('create-form-error', '');

      const chosenKind = kindSelect ? kindSelect.value : '';
      const allowedTopLevelKinds = TOP_LEVEL_KIND_OPTIONS[category] || [];
      if (allowedTopLevelKinds.indexOf(chosenKind) === -1) {
        setInlineErrorText('create-form-error', 'Invalid kind for this category.');
        break;
      }

      const attachUnderRaw = attachUnderInput ? attachUnderInput.value.trim() : '';
      const attachUnder = attachUnderRaw === '' ? null : attachUnderRaw;
      const mapping = ARCHICODE_KIND_MAP[chosenKind];
      const rootKind = mapping ? mapping.rootKind : null;

      // FR-6(a): attach-under filled — must resolve, and the parent's own
      // kind must be able to contain the chosen kind.
      if (attachUnder) {
        const parentRecord = AppState.index[category] ? AppState.index[category].get(attachUnder) : null;
        if (!parentRecord) {
          setInlineErrorText('create-attach-under-error', 'No element "' + attachUnder + '" exists in this category.');
          break;
        }
        const attachOk = childKindOptionsForLevel(parentRecord.level).indexOf(rootKind) !== -1;
        if (!attachOk) {
          setInlineErrorText(
            'create-attach-under-error',
            'Element "' + attachUnder + '" cannot contain a "' + chosenKind + '".'
          );
          break;
        }
      } else {
        // FR-6(b): attach-under left blank — the chosen kind must be one
        // the real domain model allows as a genuinely unparented root.
        const blankAllowed = TOP_LEVEL_BLANK_ATTACH_ALLOWED[category] || [];
        if (blankAllowed.indexOf(chosenKind) === -1) {
          setInlineErrorText(
            'create-form-error',
            'A "' + chosenKind + '" must have "Attach under" filled in — it is never a top-level root.'
          );
          break;
        }
      }

      const idCheck = validateElementId(idInput ? idInput.value : '');
      if (!idCheck.valid) {
        setInlineErrorText('create-id-error', idCheck.error);
        break;
      }
      const id = idCheck.id;
      // FR-7: id-collision check against the resulting full reference.
      const newReference = attachUnder ? attachUnder + '.' + id : id;
      if (AppState.index[category] && AppState.index[category].has(newReference)) {
        setInlineErrorText('create-id-error', 'Another element already uses reference "' + newReference + '".');
        break;
      }

      const name = normalizeOptionalText(nameInput ? nameInput.value : '');
      const description = normalizeOptionalText(descriptionInput ? descriptionInput.value : '');

      let result;
      try {
        result = commitCreateTopLevelElement(
          {
            category,
            headerKind: chosenKind,
            attachUnderReference: attachUnder,
            id,
            name,
            description
          },
          {
            afterConfirm: () => {
              AppState.selection = { kind: 'element', key: newReference, layer: category, mode: 'edit' };
              render();
            }
          }
        );
      } catch (err) {
        // wave 014 (run 0082): a plateau that cannot take the element says why
        setInlineErrorText('create-form-error', err && err.message ? err.message : String(err));
        break;
      }
      if (result && result.pending) break; // the author is asked first; the form stays until the answer

      // FR-3: one extra render after commitCreateTopLevelElement's own
      // rebuild render, which still carried the stale (create-form) selection.
      AppState.selection = { kind: 'element', key: result.createdReference, layer: category, mode: 'edit' };
      render();
      break;
    }
    case 'request-delete-element': {
      // TDD-0010 DEC-4: compute the impact scan and render it inline,
      // overlaid on the already-rendering edition view — no AppState
      // mutation happens here.
      const reference = target.getAttribute('data-ref');
      const category = layerOfReference(reference) || 'application'; // the layer of the element being edited (the selection)
      const impact = computeDeleteImpact(reference, category);
      // wave 014 (run 0082): an element another plateau declares is not deleted from its manifest: the plateau drawn takes it out with a `REMOVE` patch
      const writing = writingPlateau();
      const record = AppState.index[category] ? AppState.index[category].get(reference) : null;
      const removal =
        writing !== null && writing !== BASELINE_PLATEAU && record && record.declaredIn !== writing
          ? { plateau: writing, declaredIn: record.declaredIn }
          : null;
      pendingDeleteConfirmation = {
        reference,
        category,
        affected: impact.affected,
        files: removal ? [] : impact.files,
        deletedReferences: impact.deletedReferences,
        removal
      };
      render();
      break;
    }
    case 'confirm-delete-element': {
      // TDD-0010 DEC-6: commitDeleteElement itself clears
      // pendingDeleteConfirmation and calls rebuildIndexAndRender.
      if (pendingDeleteConfirmation) {
        try {
          commitDeleteElement(
            pendingDeleteConfirmation.reference,
            pendingDeleteConfirmation.category,
            pendingDeleteConfirmation.affected
          );
        } catch (err) {
          const failed = pendingDeleteConfirmation.reference;
          pendingDeleteConfirmation = null;
          saveStatus = { state: 'error', failedFile: failed, message: err && err.message ? err.message : String(err) };
          render();
        }
      }
      break;
    }
    case 'cancel-delete-element':
      // TDD-0010 DEC-4, AC-11: no AppState mutation — only the transient
      // confirmation overlay is discarded.
      pendingDeleteConfirmation = null;
      render();
      break;
    case 'open-move-dialog':
      openMoveDialog();
      break;
    case 'move-confirm':
      submitMoveDialog();
      break;
    case 'cancel-changes':
      cancelChanges();
      break;
    case 'save-all-changes':
      // TDD-0010 DEC-7/ASM-2: saveAllChanges() is called directly and
      // synchronously from this click handler so its first await
      // (inside ensureWritePermission) is still reached within the
      // triggering user gesture.
      if (!flushPendingDraft()) break; // an invalid form shows its own errors and nothing is written
      saveAllChanges();
      break;
    default:
      break;
  }
}

/**
 * Drag-to-resize for the shell's panels (layout adapted from
 * archi-edtior.html) — delegated on #app the same way handleAppClick is,
 * rather than attached per-handle at mount time: render() replaces #app's
 * entire innerHTML on every click/edit, which would silently detach a
 * directly-attached listener the next time anything elsewhere is clicked.
 * A drag gesture itself never touches AppState (only the panel's own
 * inline style), so no render() ever fires mid-drag to invalidate the
 * `panel`/`handle` references captured below.
 */
function handleAppPointerDown(e) {
  if (e.target.closest && e.target.closest('#diagram-canvas')) {
    startDiagramPan(e);
    return;
  }
  const handle = e.target.closest('[data-resize]');
  if (!handle) return;
  const panel = document.getElementById(handle.dataset.resize);
  if (!panel) return;

  e.preventDefault();
  const horizontal = handle.dataset.axis === 'x';
  const sign = Number(handle.dataset.sign);
  const property = horizontal ? 'width' : 'height';
  const storageKey = PANEL_SIZE_STORAGE_PREFIX + handle.dataset.resize + ':' + property;

  const start = horizontal ? e.clientX : e.clientY;
  const rect = panel.getBoundingClientRect();
  const startSize = horizontal ? rect.width : rect.height;

  handle.setPointerCapture(e.pointerId);
  handle.dataset.active = '';
  document.body.classList.add('select-none');

  const onMove = (moveEvent) => {
    const delta = (horizontal ? moveEvent.clientX : moveEvent.clientY) - start;
    panel.style[property] = startSize + sign * delta + 'px';
  };
  const onUp = () => {
    handle.removeEventListener('pointermove', onMove);
    delete handle.dataset.active;
    document.body.classList.remove('select-none');

    // Store the rendered size, already bounded by the panel's min-/max-*
    // classes, so it reopens within range next time.
    const size = horizontal ? panel.getBoundingClientRect().width : panel.getBoundingClientRect().height;
    panelSizeStorage.set(storageKey, String(Math.round(size)));
  };

  handle.addEventListener('pointermove', onMove);
  handle.addEventListener('pointerup', onUp, { once: true });
  handle.addEventListener('pointercancel', onUp, { once: true });
}

/** Double-click a resize handle to forget its persisted size and fall back to the panel's default (its min-/max-/base-width classes). */
function handleAppDblClick(e) {
  const handle = e.target.closest('[data-resize]');
  if (!handle) return;
  const horizontal = handle.dataset.axis === 'x';
  const property = horizontal ? 'width' : 'height';
  panelSizeStorage.remove(PANEL_SIZE_STORAGE_PREFIX + handle.dataset.resize + ':' + property);
  render();
}
