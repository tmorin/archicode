// =====================================================================
// The flows of Export, Import, Open sample, Reset and Back to the served folder (wave 025, run 0193, TDD-0193 DEC-4 to DEC-9, DEC-11, DEC-13, IMP-6,
// CTR-5, FLOW-1 to FLOW-5, RISK-4, RISK-7, RISK-10; gap-001 decisions 1 to 5): what the page does with the bundle file, the sample and the Workspace menu,
// over the browser store (persistence/browser-store.js, persistence/browser-transfer.js) and the edges of persistence/bundle-io.js. Like
// application/browser-workspaces.js, these functions decide and set view state (landingNotice, bundleNotice, landingBusy, workspaceMenuQuestion), ask for a
// redraw with requestRedraw() and never draw. They name no presentation or composition function and do not read the draft the visitor is typing: the menu item that
// offers Export from the bar makes that test (DEC-4), and the DOM of the menu is patched by whoever registers with onWorkspaceMenuChange (DEC-9).
// None of them writes to the served folder: opening, exporting and resetting the sample read the sample and the browser store only (DEC-8). Import only
// creates a workspace; Reset fetches the sample before it replaces anything (DEC-5, DEC-6).
// =====================================================================

/* exported exportBrowserWorkspace, exportOpenBrowserWorkspace, chooseBundleFile, importBundleFile, openSample, askToResetSample,
   cancelWorkspaceMenuQuestion, confirmResetSample, backToServedFolder, setWorkspaceMenuOpen, onWorkspaceMenuChange --
   the entry points of the card, the Workspace menu and the bootstrap (composition/events.js and composition/bootstrap.js, run 0193, task 010). */

const BUNDLE_NO_YAML_SENTENCE = 'Nothing to export: this workspace has no YAML file.';
const BUNDLE_NO_ROOT_SENTENCE = 'The file holds no ' + WORKSPACE_FILE_NAME + ', so it is not a workspace.';
const BUNDLE_RESET_QUESTION = 'reset-sample';

// The sample flows in progress, by sample id: a second call while one runs waits for it, so one page never creates the workspace twice (the name
// check of the store covers two tabs).
const bundleSamplePending = new Map();

// What redraws the Workspace menu without drawing the page (a redraw would lose what the visitor has typed): registered once by the part that draws it.
let workspaceMenuListener = null;

/** The id of the browser workspace the page has open, else null. */
function openBrowserWorkspaceId() {
  return AppState.folder && AppState.folder.browserWorkspace ? AppState.folder.browserWorkspace : null;
}

/** Says the result of an action where the visitor looks: the bar while a workspace is open, the card otherwise. */
function bundleSay(sentence) {
  if (AppState.folder && AppState.workspace) bundleNotice = sentence;
  else landingNotice = sentence;
}

/** The part that draws the Workspace menu registers here to patch it when its state changes (open, closed, a question asked or dropped). */
function onWorkspaceMenuChange(listener) {
  workspaceMenuListener = typeof listener === 'function' ? listener : null;
}

function workspaceMenuChanged(options) {
  if (workspaceMenuListener) workspaceMenuListener(options || {});
}

/** Opens or closes the menu (DEC-9); closing it drops its question, which is the safe direction. No redraw of the page. */
function setWorkspaceMenuOpen(open, options = {}) {
  workspaceMenuOpen = !!open;
  if (!workspaceMenuOpen) workspaceMenuQuestion = null;
  workspaceMenuChanged(options);
}

/** `base`, else `base 2`, `base 3`, … the first that no name of `taken` has (without regard to case), cut so that the name stays within the limit. */
function uniqueBrowserWorkspaceName(base, taken) {
  const used = new Set(taken.map((name) => String(name).trim().toLowerCase()));
  let name = base;
  for (let n = 2; used.has(name.toLowerCase()); n++) {
    const suffix = ' ' + n;
    name = base.slice(0, BROWSER_NAME_MAX - suffix.length).trim() + suffix;
  }
  return name;
}

/** The row of the workspace made from this sample, the most recently changed when there are several (the list is in that order), else undefined. */
function sampleRowOf(sampleId) {
  return browserWorkspaces.find((w) => w.sample === sampleId && !w.problem);
}

/**
 * Creates a workspace from a bundle's files under `baseName`, made unique against the list (DEC-5, DEC-6). A name another tab took since the list was
 * read is met once: the list is read again, and for a sample the workspace that is the sample is the answer (`{ existing }`); else the next free name
 * is tried. Resolves `{ record }`, `{ existing }` or `{ error }`; never rejects.
 */
async function createBundleWorkspace(baseName, files, origin, sampleId) {
  for (let attempt = 0; ; attempt++) {
    const name = uniqueBrowserWorkspaceName(
      baseName,
      browserWorkspaces.map((w) => w.name)
    );
    try {
      return { record: await createBrowserWorkspace({ name, files, origin, sample: sampleId || undefined }) };
    } catch (e) {
      if (!(e && e.name === 'InvalidNameError') || attempt > 0) return { error: e };
      await refreshBrowserWorkspaces();
      const existing = sampleId ? sampleRowOf(sampleId) : undefined;
      if (existing) return { existing };
    }
  }
}

// ---- Export (FLOW-1, DEC-4) ----

/**
 * *Export* of a browser workspace: the bundle of its stored files is downloaded and the time is recorded once the download has started. The sentence
 * says what happened. `options.first`: asked from the question of the delete (the control that keeps the focus is that one). The test of unsaved
 * changes is the menu item's, not made here.
 */
async function exportBrowserWorkspace(id, options = {}) {
  const known = browserWorkspaceById(id);
  landingNotice = null;
  bundleNotice = null;
  const control = browserRowSelector(options.first ? 'export-browser-workspace-first' : 'export-browser-workspace', id);
  const finish = (sentence) => {
    bundleSay(sentence);
    if (!(AppState.folder && AppState.workspace)) landingFocusSelector = control;
    requestRedraw();
  };
  await refreshBrowserWorkspaces();
  const row = browserWorkspaceById(id);
  const title = browserWorkspaceTitle(row || known);
  if (!row) {
    finish('“' + title + '” is no longer in this browser.');
    return;
  }
  if (row.problem) {
    finish('“' + title + '” could not be read. Delete it from the list.');
    return;
  }
  let files;
  try {
    files = await readBrowserWorkspaceFiles(id, row.name);
  } catch (e) {
    if (e && e.workspaceGone) {
      finish('“' + title + '” is no longer in this browser.');
    } else {
      console.error('ArchiCode: a browser workspace could not be read for the export', e);
      finish('The export failed: ' + browserFailureText(e));
    }
    return;
  }
  const bundle = bundleWorkspaceFiles(files);
  const skipped = bundleSkippedSentence(bundle.skipped);
  if (bundle.carried.length === 0) {
    finish(BUNDLE_NO_YAML_SENTENCE + (skipped ? ' ' + skipped : ''));
    return;
  }
  const fileName = bundleFileName(row.name);
  if (!startBundleDownload(fileName, bundle.text)) {
    finish('The download could not be started.');
    return;
  }
  let sentence =
    'Exported ' +
    bundle.carried.length +
    (bundle.carried.length === 1 ? ' file as ' : ' files as ') +
    fileName +
    '.' +
    (skipped ? ' ' + skipped : '');
  try {
    await markBrowserExport(id); // the time the download was started: the page cannot know when the visitor saves the file
  } catch (e) {
    console.error('ArchiCode: the export time could not be saved', e);
    sentence += ' The export time could not be saved.';
  }
  await refreshBrowserWorkspaces();
  finish(sentence);
}

/** *Export as a file* of the Workspace menu: the browser workspace that is open. The menu item has made the test of unsaved changes and of a typed draft. */
async function exportOpenBrowserWorkspace() {
  const id = openBrowserWorkspaceId();
  if (id) await exportBrowserWorkspace(id);
}

// ---- Import (FLOW-2, DEC-5) ----

/** *Import a workspace file*: asks the picker at once, in the turn of the click (ASM-4); the file chosen is imported, a cancelled picker does nothing. */
function chooseBundleFile() {
  bundleFilePicker((file) => importBundleFile(file));
}

/** A bundle file the visitor chose becomes a NEW browser workspace, or is refused whole with one sentence; an existing workspace is never written to. */
async function importBundleFile(file) {
  landingNotice = null;
  bundleNotice = null;
  const refuse = (sentence) => {
    bundleSay(sentence);
    requestRedraw();
  };
  const read = await readBundleFile(file);
  if (read.problem) {
    refuse(read.problem);
    return;
  }
  const unbundled = unbundleWorkspaceFiles(read.text);
  if (unbundled.problems.length > 0) {
    refuse(bundleProblemsSentence(unbundled.problems));
    return;
  }
  if (!unbundled.files.some((f) => f.path === WORKSPACE_FILE_NAME)) {
    refuse(BUNDLE_NO_ROOT_SENTENCE);
    return;
  }
  await refreshBrowserWorkspaces();
  const made = await createBundleWorkspace(
    bundleImportName(unbundled.files, file.name),
    unbundled.files,
    'import',
    null
  );
  if (made.error) {
    console.error('ArchiCode: a workspace file could not be imported', made.error);
    refuse('The workspace could not be created: ' + browserFailureText(made.error));
    return;
  }
  await openBrowserWorkspace(made.record.id);
}

// ---- Open the sample (FLOW-3, DEC-6) ----

/**
 * *Open the Brightcart sample* (the card, the menu of a served page, `sample=` at load): the workspace that is the sample is opened as it is, with the
 * changes in it, and nothing is fetched; when there is none the sample is fetched, unbundled and created. Two calls at once end with one workspace.
 */
async function openSample(id) {
  if (!Object.prototype.hasOwnProperty.call(BROWSER_SAMPLES, id)) {
    landingNotice = 'There is no sample “' + id + '”.';
    requestRedraw();
    return;
  }
  if (!bundleSamplePending.has(id)) {
    bundleSamplePending.set(
      id,
      openSampleOnce(id).finally(() => bundleSamplePending.delete(id))
    );
  }
  await bundleSamplePending.get(id);
}

async function openSampleOnce(id) {
  const sample = BROWSER_SAMPLES[id];
  landingNotice = null;
  bundleNotice = null;
  await refreshBrowserWorkspaces();
  const row = sampleRowOf(id);
  if (row) {
    await openBrowserWorkspace(row.id);
    return;
  }
  if (!AppState.workspace) {
    landingBusy = 'Loading the ' + sample.name + ' sample…';
    requestRedraw();
  }
  const fetched = await fetchSampleBundle(id); // never rejects: a failed fetch is its sentence, and nothing has been created
  if (fetched.problem) {
    landingBusy = null;
    bundleSay(fetched.problem);
    requestRedraw();
    return;
  }
  const made = await createBundleWorkspace(sample.name, fetched.files, 'sample', id);
  if (made.error) {
    console.error('ArchiCode: the sample could not be created', made.error);
    landingBusy = null;
    bundleSay('The ' + sample.name + ' sample could not be kept in this browser: ' + browserFailureText(made.error));
    requestRedraw();
    return;
  }
  await openBrowserWorkspace(made.existing ? made.existing.id : made.record.id);
}

// ---- Reset to the sample (FLOW-4, DEC-6) ----

/** *Reset to the sample…*: the menu turns into the question, for a workspace made from a sample; for any other it asks nothing. Writes nothing. */
function askToResetSample() {
  const row = browserWorkspaceById(openBrowserWorkspaceId());
  if (!row || !row.sample) return;
  bundleNotice = null;
  workspaceMenuQuestion = BUNDLE_RESET_QUESTION;
  workspaceMenuChanged({});
}

/** *Cancel* of the question (the menu's own close rules clear it too): the items are back and nothing changed. */
function cancelWorkspaceMenuQuestion() {
  if (workspaceMenuQuestion === null) return;
  workspaceMenuQuestion = null;
  workspaceMenuChanged({});
}

/**
 * `Reset “name”`: the sample is fetched and unbundled first, and only when that succeeds are the files replaced, in one transaction; the record keeps its
 * id, name, creation time, export time and origin. The page then starts again on the same workspace without what it held. A fetch that fails writes
 * nothing and keeps the question; a store that fails keeps the old files.
 */
async function confirmResetSample() {
  if (workspaceMenuQuestion !== BUNDLE_RESET_QUESTION) return;
  const id = openBrowserWorkspaceId();
  const row = browserWorkspaceById(id);
  if (!row || !row.sample) {
    workspaceMenuQuestion = null;
    workspaceMenuChanged({});
    return;
  }
  bundleNotice = null;
  const fetched = await fetchSampleBundle(row.sample);
  if (fetched.problem) {
    bundleNotice = fetched.problem; // the question stays: the visitor can try again, or cancel
    requestRedraw();
    return;
  }
  try {
    await replaceBrowserWorkspaceFiles(id, fetched.files, row.name);
  } catch (e) {
    console.error('ArchiCode: the sample workspace could not be reset', e);
    workspaceMenuQuestion = null;
    bundleNotice = e && e.workspaceGone ? browserFailureText(e) : 'The reset failed: ' + browserFailureText(e);
    await refreshBrowserWorkspaces();
    workspaceMenuChanged({});
    requestRedraw();
    return;
  }
  AppState = createInitialAppState();
  resetUiState(); // the menu and its question go with it
  await openBrowserWorkspace(id);
  if (openBrowserWorkspaceId() === id) {
    bundleNotice = '“' + row.name + '” was reset to the sample.';
    requestRedraw();
  }
}

// ---- Back to the served folder (FLOW-5, DEC-8) ----

/** The close slot of a browser workspace opened in a served page: the same confirm as *Close folder* for unsaved changes, then the served folder again. */
async function backToServedFolder() {
  if (
    hasUnsavedChanges() &&
    !confirm('You have unsaved changes that will be lost. Go back to the served folder anyway?')
  ) {
    return;
  }
  await forgetOpenFolder();
  requestRedraw();
  await openServedFolder();
}
