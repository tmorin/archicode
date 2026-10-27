/**
 * Forgets everything the page remembers about the folder it showed — the pins, the facet, what is open on the map, a
 * pending draft, the status of the last save, the hash of the URL — so the next folder starts clean and the old ref=,
 * pin= and facet= are not applied to it. For a folder that is closed or replaced, never for a reload of the same one
 * (after a save the user keeps their place).
 */
function resetUiState() {
  saveStatus = { state: 'idle' };
  currentPerspective = DEFAULT_PERSPECTIVE;
  mapPinned = [];
  mapHidden = [];
  mapOpened = null;
  technologyMapState = { opened: null, pinned: [], hidden: [] };
  technologyMapParts = { applications: true, relationships: true };
  navActiveKey = null;
  treeExpandedApplications = true;
  treeExpandedEnvironments = true;
  treeQuietCache = null;
  elementTab = 'details';
  setDiagramShow(null);
  appDialog = null;
  closeStoryPlayer({ address: false, focus: false }); // a player belongs to the folder it plays
  keptElementForm = null;
  diagramKeyOpen = false; // the key under the diagram is folded again with a new folder
  storyBarEditing = false;
  storyBarNotice = null;
  removedStep = null;
  activeStory = null;
  selectedStoryId = null;
  selectedViewId = null;
  libraryTab = 'stories';
  storyNotice = null;
  diagramFacet = null;
  diagramMaximized = false;
  diagramHideUnlinked = false;
  diagramScale = 'auto';
  diagramCenter = { x: 0, y: 0 };
  diagramCache = null;
  diagramScene = null;
  diagramShownView = null;
  diagramLinkStop = null;
  diagramHost = 'main';
  parkedDiagramHost = newDiagramHostState();
  libraryPick = { view: null, selection: null };
  removedPick = null;
  viewEditNotice = null;
  diagramSeq++; // a layout still being computed for the old folder is dropped when it ends
  helpOpen = false;
  headerMenuOpen = false;
  pendingDeleteConfirmation = null;
  landingPendingDelete = null; // the question and the name field of the card of the browser workspaces (run 0192)
  landingNameDraft = null;
  rawYamlEditDraft = null;
  lastRenderedViewKey = null;
  scrollNavToSelection = false;
  try {
    history.replaceState(null, '', location.pathname + location.search);
  } catch (e) {
    /* no history to edit (file:// sandboxes) */
  }
}

/** "Try again" on the landing error card: re-read the already-picked folder (e.g. after fixing .archicode.yaml). */
async function retryFolder() {
  if (!AppState.folder || !AppState.folder.handle) return;
  const entry = rememberedFolderById(AppState.folder.id);
  landingBusy = openingMessage(AppState.folder.name, entry && AppState.folder.id ? entry.name : '');
  requestRedraw();
  await loadWorkspace(AppState.folder.handle);
}

/** Click handler for the top panel's close action (FR-3/FLOW-3). */
async function closeFolder() {
  if (hasUnsavedChanges() && !confirm('You have unsaved changes that will be lost. Close the folder anyway?')) {
    return;
  }
  // the folder stays remembered; only the next load does not reopen it (TDD-0020 DEC-5)
  const folder = AppState.folder;
  const wasBrowserWorkspace = !!(folder && folder.browserWorkspace);
  if (wasBrowserWorkspace) {
    // a browser workspace is kept: only the pointer that reopens it goes, and the remembered folders are not touched (run 0192, DEC-5)
    try {
      await clearBrowserLast();
    } catch (e) {
      console.error('ArchiCode: closeFolder failed to clear the pointer of the browser workspace', e);
    }
  } else if (folder && folder.handle && !isServedByArchiCode()) {
    try {
      if (folder.id) {
        // under the id it has now: another tab may have merged its records, or removed it (then nothing to clear)
        const id = await liveFolderId(folder.handle, folder.id);
        const entry = rememberedFolderById(folder.id);
        if (id) await clearLastFolder(id, entry && entry.others);
      } else {
        // a folder without id (stored by an earlier version, or not remembered when opened) is remembered first: its
        // last-folder record may be the only trace of it, so it is cleared only once the folder has a record of its own
        await clearLastFolder((await rememberFolder(folder.handle)).id);
      }
    } catch (e) {
      console.error('ArchiCode: closeFolder failed to update the remembered folders', e);
    }
  }
  AppState = createInitialAppState();
  resetUiState();
  landingNotice = null;
  requestRedraw();
  if (!wasBrowserWorkspace || isFileSystemAccessSupported()) await refreshRememberedFolders();
  if (wasBrowserWorkspace) await refreshBrowserWorkspaces();
  requestRedraw();
  await checkFolderPermissions();
}

/**
 * The workspace the browser reopens (DEC-5): the one `last` points at, when it is still there and can be read; `{ id, openedAt }`, or null.
 * Only reads the browser database. Never rejects.
 */
async function browserWorkspaceToReopen() {
  if (browserStoreState !== 'ready') return null;
  try {
    await refreshBrowserWorkspaces();
    const pointer = await readBrowserLast();
    const row = pointer ? browserWorkspaceById(pointer.id) : null;
    return row && !row.problem ? pointer : null;
  } catch (e) {
    console.error('ArchiCode: the last browser workspace could not be read', e);
    return null;
  }
}

/**
 * On every page load: try to silently reopen what was open (FLOW-1, FLOW-2). Of the two pointers, the browser workspace and the last
 * remembered folder, the one opened more recently wins (DEC-5); the other is only read, never written, and when the winner does not open
 * the other is not tried: the card says what happened. The store is probed before this (composition/bootstrap.js).
 */
async function tryAutoReopen() {
  const browserPointer = await browserWorkspaceToReopen();
  let last = null;
  if (isFileSystemAccessSupported()) {
    try {
      const remembered = await readRememberedFolders(); // migrates what an earlier version stored (TDD-0020 DEC-2)
      rememberedFolders = remembered.folders;
      last = remembered.last;
    } catch (e) {
      console.error('ArchiCode: failed to read the remembered folders', e);
      rememberedFolders = [];
    }
  }
  if (browserPointer && (!last || browserPointer.openedAt > last.openedAt)) {
    await openBrowserWorkspace(browserPointer.id);
    return;
  }
  if (!last) {
    landingBusy = null;
    AppState.permissionState = 'none';
    requestRedraw();
    await checkFolderPermissions(); // after the card is drawn: the list says what each folder will need
    return;
  }
  const handle = last.handle;
  // No user gesture needed for queryPermission (FR-2/Q-1). The answer is the last folder's state in the list too, and a
  // query that fails (a folder moved or deleted) says so there (TDD-0023 DEC-1).
  last.permission = await folderPermissionOf(handle);
  AppState.folder = { handle, name: handle.name, id: last.id || null };
  if (last.permission === 'granted') {
    AppState.permissionState = 'granted';
    landingBusy = openingMessage(handle.name, last.name);
    requestRedraw();
    await loadWorkspace(handle);
  } else {
    landingBusy = null;
    AppState.permissionState = 'needs-click';
    requestRedraw();
    await checkFolderPermissions();
  }
}
