function render() {
  const app = document.getElementById('app');
  if (AppState.selection.kind !== 'file') filesSelectionSeen = null; // opening the file again, from anywhere, unfolds its group again
  draftTyped = !!rawYamlEditDraft; // a redraw gives every form afresh; only a rejected YAML text is kept

  // Every branch below replaces #app's innerHTML wholesale, which already
  // discards whatever DOM node a mounted CodeMirror instance lived on — but
  // not its own internal listeners/timers until .destroy() runs. Doing it
  // once here, unconditionally, covers every early-return branch below in
  // one place rather than repeating it in each.
  if (activeFileEditorView) {
    activeFileEditorView.destroy();
    activeFileEditorView = null;
  }
  for (const view of Object.values(activeJsonEditorViews)) view.destroy();
  activeJsonEditorViews = {};

  useDiagramHost(diagramHostOf(currentPerspective)); // before anything is drawn: the tree of the Map reads the scene of the Map
  settleLinkSelection(); // a link is selected only while the diagram it was made on is on screen
  if (currentPerspective !== 'library' || (viewEditNotice && viewEditNotice.view !== selectedViewId))
    viewEditNotice = null;
  const landing = landingScreenConfig();
  if (landing) {
    document.title = 'ArchiCode Editor'; // no workspace is loaded yet, whatever folder is remembered
    // a long list keeps where it was scrolled to when the card is drawn again (a Remove, the permissions)
    const listBefore = app.querySelector ? app.querySelector('.landing-folder-list') : null;
    const listTop = listBefore && listBefore.scrollTop > 0 ? listBefore.scrollTop : 0;
    app.innerHTML = renderLandingHtml(landing);
    app.addEventListener('click', handleAppClick);
    const listAfter = listTop && app.querySelector ? app.querySelector('.landing-folder-list') : null;
    if (listAfter) listAfter.scrollTop = listTop;
    // after a Remove the focus stays in the list (the next folder); drawn again for the permissions, it stays where it
    // was ('' when that was not on the card); else the primary button of the card
    const keep = landingFocusSelector === '';
    const wanted = landingFocusSelector && app.querySelector ? app.querySelector(landingFocusSelector) : null;
    if (app.querySelector) landingFocusSelector = null; // consumed once the card could be searched (a host with no DOM keeps the request)
    const primary = wanted || (keep ? null : document.getElementById('landing-primary'));
    if (primary) primary.focus();
    return;
  }

  document.title = pageTitle();

  // innerHTML replacement resets every scroll position to 0 — so expanding a
  // tree node, adding a qualifier, etc. would throw the user back to the top
  // of whichever panel they were scrolled in. Side panels always keep theirs;
  // the center keeps its own only while it still shows the same view (a
  // different element/file/perspective should open at the top).
  const scrollBefore = {};
  for (const id of ['panel-left', 'panel-right', 'panel-bottom', 'panel-center']) {
    const el = document.getElementById(id);
    if (el) scrollBefore[id] = { top: el.scrollTop, left: el.scrollLeft };
  }
  const viewKey =
    currentPerspective +
    '|' +
    AppState.selection.kind +
    '|' +
    AppState.selection.key +
    '|' +
    AppState.selection.mode +
    '|' +
    (AppState.selection.layer || '') +
    '|' +
    (AppState.selection.focal || '') +
    (currentPerspective === 'library' && libraryTab === 'views' ? '|' + selectedViewId : ''); // another view opens at the top of its panel
  const sameView = viewKey === lastRenderedViewKey;
  lastRenderedViewKey = viewKey;

  // the tree of the map keeps the focus of the row the user was on, whatever redraws it
  const focusedScopeRow =
    document.activeElement && document.activeElement.closest
      ? document.activeElement.closest('.tree-node-row[role="treeitem"]')
      : null;
  const focusedScopeRef = focusedScopeRow ? focusedScopeRow.getAttribute('data-node') : null;
  if (focusedScopeRef) navActiveKey = focusedScopeRef;

  // the controls of the headers and of the diagram keep the focus too: the tabs, the facet, Edit… all redraw the page
  const focusedControl = focusedScopeRef ? null : headerControlSelector(document.activeElement);

  // a box of the diagram (or its fold button) keeps the focus too: Enter on one redraws the whole drawing
  const focusedBox = diagramFocusTargetOf(document.activeElement);
  if (focusedBox) pendingDiagramFocus = focusedBox;
  const focusedPlain =
    focusedScopeRef || focusedControl || focusedBox ? null : plainControlFocusOf(document.activeElement);

  app.innerHTML = renderShellHtml();
  if (focusedControl) {
    const control = app.querySelector(focusedControl);
    if (control && !control.disabled) focusControl(control);
  }
  if (focusedPlain) {
    const control = Array.from(app.querySelectorAll(focusedPlain.selector)).find((el) => {
      const holder = focusedPlain.parent ? el.closest(focusedPlain.parent) : el;
      return holder && holder.getAttribute(focusedPlain.attribute) === focusedPlain.value;
    });
    if (control) control.focus({ preventScroll: true });
  }
  if (focusedScopeRef) {
    const row = navRows().find((r) => r.getAttribute('data-node') === focusedScopeRef);
    if (row) row.focus({ preventScroll: true });
  }
  // the dialog takes the focus; else the control an action asked for (the one that moved, the field to type in)
  const dialogFocus = appDialog ? app.querySelector('[data-dialog-autofocus]') : null;
  if (dialogFocus) {
    dialogFocus.focus();
  } else if (pendingFocusSelector) {
    const wanted = app.querySelector(pendingFocusSelector);
    if (wanted && !wanted.disabled) focusControl(wanted);
  }
  pendingFocusSelector = null;
  app.addEventListener('click', handleAppClick);
  app.addEventListener('pointerdown', handleAppPointerDown);
  app.addEventListener('dblclick', handleAppDblClick);
  app.addEventListener('input', handleAppInput);
  app.addEventListener('change', handleAppChange);
  app.addEventListener('keydown', handleDiagramKeydown);
  app.addEventListener('keydown', handleNavKeydown);
  app.addEventListener('keydown', handleActivateKeydown);
  app.addEventListener('pointerover', handleDiagramPointerOver);
  app.addEventListener('pointerout', handleDiagramPointerOut);
  app.addEventListener('focusin', handleDiagramFocus);
  app.addEventListener('focusout', handleDiagramFocus);
  app.addEventListener('wheel', handleAppWheel, { passive: false });
  app.addEventListener('scroll', keepDiagramCanvasStill, true);
  restoreElementForm(); // the form of an element, typed in and not written, while a dialog waits for an answer (#123)
  autosizeAllTextareas();
  mountFileEditorIfNeeded();
  mountJsonEditorsIfNeeded();
  mountDiagramIfNeeded();
  settlePlateausPanel();
  markTreeThroughFacet();
  markElementTabs();
  for (const id of Object.keys(scrollBefore)) {
    if ((id === 'panel-center' || id === 'panel-right') && !sameView) continue; // another element or view opens at the top
    const el = document.getElementById(id);
    if (el) {
      el.scrollTop = scrollBefore[id].top;
      el.scrollLeft = scrollBefore[id].left;
    }
  }
  syncRightPanelSticky(); // the heights of the tabs and of the walk bar, before the row is scrolled to (wave 027, run 0201)
  if (scrollChangesToSelection) {
    scrollChangesToSelection = false;
    const selectedRow = document.querySelector('.change-row.selected');
    if (selectedRow && selectedRow.scrollIntoView) selectedRow.scrollIntoView({ block: 'nearest' });
  }
  // a selection that did not come from a click in the tree (a box of a diagram, a link, the URL) is brought into view in it
  if (scrollNavToSelection) {
    scrollNavToSelection = false;
    const activeRow = document.querySelector('.tree-node-row.active');
    if (activeRow && activeRow.scrollIntoView) activeRow.scrollIntoView({ block: 'nearest' });
  }
  syncHashFromState();
  schedulePlateauCounts(); // what each plateau of the page Plateaus says is computed after the drawing, one plateau per turn
}

onRedraw(() => render()); // the parts below ask with requestRedraw(); the composition says what draws (late-bound: `render` is looked up at each request)
