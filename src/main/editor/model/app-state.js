// =====================================================================
// AppState (TDD CTR-1) — the single in-memory source of truth.
// =====================================================================

/**
 * The version of the two models the comparison reads (run 0045): the plateau drawn (`AppState.index`) and the one it is compared with
 * (`AppState.baseline.index`). `comparisonState()` keeps the answer of the kernel's `compare` for as long as this number, and the two models
 * it was computed from, are what they were: it does not serialise the models to find out (issue #32).
 * The cache of the diagram and the cache of the quiet references of the tree read it too (issue #37, `modelsKey`): a missing bump shows a drawing that is out of date, there as here.
 *
 * THE RULE: any new way to change one of the two models calls `modelsChanged()` once the change is made and before anything is drawn from it.
 * That is every place that assigns `AppState.index` or `AppState.baseline` (a load, a reload, a change of plateau or of comparison on the band, a rebuild
 * after an edit), and every place that changes a record of either model without replacing it. A bump that was not needed costs one more `compare`;
 * a bump that is missing shows an answer that is out of date. `rebuildIndexAndRender` is the path of every edit of the plateau drawn:
 * an edit that ends there needs nothing more. The baseline is read-only: only a load changes it.
 */
let modelVersion = 0;

function modelsChanged() {
  modelVersion++;
}

/**
 * Redraw is requested, never called (RFC-002 rule 2; wave 024, run 0187). A part below the composition asks for the page to be drawn again with
 * `requestRedraw()`; the composition says what draws it with `onRedraw(handler)` once, when it loads. The request is carried out at once, in the
 * caller's turn (what a direct call did), so the order of what is drawn and written does not move. `modelsChanged()` is not a request: it bumps the
 * version the caches read and draws nothing.
 */
let redrawHandler = null;

function onRedraw(handler) {
  redrawHandler = handler;
}

function requestRedraw() {
  if (redrawHandler) redrawHandler();
}

function createInitialAppState() {
  modelsChanged(); // a new state holds new models (a folder closed, another one opened)
  return {
    folder: null, // { handle: FileSystemDirectoryHandle, name: string } | null
    permissionState: 'none', // 'granted' | 'needs-click' | 'none'
    workspace: null, // { application: {elements}, technology: {elements}, settings, styles, formatters, settingsDirty, settingsLastKnownDiskModified } | null
    manifestFiles: [], // Array<{ relPath, rawText, header, content, error, dirty, existedOnDisk, lastKnownDiskModified, savedRawText }>
    unreadManifestFiles: [], // relPaths of the files the CLI reads as manifests (.toml, .json) and the editor does not: only YAML is
    index: { application: new Map(), technology: new Map() },
    relationshipStats: { total: 0, dangling: 0 },
    duplicateReferences: [], // [{ layer, reference, sources, message }]: a reference declared twice is reported, never chosen (see buildIndex)
    layers: null, // wave 014 (run 0080): what the band says, { current, compare, blocked } (see createLayers); null until a workspace is open
    layerProblems: null, // the sentences of the first layer of the chain of the plateau drawn that the command line refuses, else null (see layerModelOf)
    layerUndrawable: false, // the plateau drawn has no graph (the kernel refused the patches of a layer): its index is empty
    plateauTree: null, // the tree of the layered plateaus the manifests write (see buildPlateauTree): { nodes, ids, problems, redeclared, warnings, layered }
    baseline: null, // the plateau compared with, read-only: { plateau, index, problem, undrawable }; null while nothing is compared (see syncLayers)
    changesOnly: false, // run 0040: draw only what changed, with its context (the kernel's `only_changes`); a choice of whoever looks, remembered per folder (see rememberFlag)
    hideWording: false, // run 0040: set the changes of wording only (description alone) aside: not marked, not listed, counted apart; remembered per folder
    selection: { kind: 'none', key: null, mode: 'view' },
    expanded: new Set(),
    fatalError: null,
    fatalErrorKind: null, // what kind of failure `fatalError` is, when the page needs to tell: 'unreadable' (the workspace file cannot be had: absent, not a file, refused) or 'renamed' (the folder holds the former name); see setFatalError (#146)
    // TDD-0010 DEC-6/DEC-9: relPaths pending a removeEntry at next save, and
    // (since the removed mf object itself leaves AppState.manifestFiles
    // immediately) the baseline lastKnownDiskModified a save's stale-check
    // still needs for each one.
    pendingFileRemovals: [],
    removedFileBaselines: new Map(),
    // UX review follow-up: element-level (not file-level) modified tracking
    // for the tree's "modified" badge — see dirtyReferences usage below.
    dirtyReferences: new Set()
  };
}

let AppState = createInitialAppState();

// Message shown on the landing card while a folder is being looked up or read
// ("Opening “x”…"); null otherwise. Kept outside AppState: it is transient UI.
let landingBusy = null;

// The remembered folders (TDD-0020 DEC-9): `[{ id, handle, name, openedAt, legacy?, problem? }]`, most recent first.
// Read from storage on load, after a close and when the list is asked for; open and Remove keep it up to date. Kept
// outside AppState, which a closed folder resets. Always empty in served mode.
let rememberedFolders = [];

// A line the landing card says once (a folder removed from the list, a permission refused); null otherwise.
let landingNotice = null;

// The control the next landing card focuses (after a Remove: the next folder of the list); null: its primary button;
// '': none (the card is drawn again under a focus that was not on it, which is left alone).
let landingFocusSelector = null;

/**
 * "Opening “x”…" for a folder: the name its workspace gave itself when it was last opened (stored with the folder,
 * TDD-0020 DEC-4), the name of the folder otherwise — before .archicode.yaml is read, nothing else is known.
 */
function openingMessage(folderName, name) {
  return 'Opening “' + (name || folderName) + '”…';
}

/** The remembered folder of this id (`null` / `''`: the legacy one), or undefined. */
function rememberedFolderById(id) {
  return rememberedFolders.find((f) => (f.id || '') === (id || ''));
}

/** What the list calls a remembered folder: its workspace's name, else the folder's. */
function rememberedFolderTitle(entry) {
  return entry.name || entry.handle.name;
}

/** The name the loaded workspace gives itself (`settings.name`), trimmed; '' when it has none. */
function workspaceName() {
  const settings = AppState.workspace && AppState.workspace.settings;
  return settings && typeof settings.name === 'string' ? settings.name.trim() : '';
}

/** What the page calls the loaded workspace: its name, or the name of its folder when it has none. */
function workspaceLabel() {
  return workspaceName() || (AppState.folder && AppState.folder.name) || '';
}
