// =====================================================================
// The flows of a browser workspace (wave 025, run 0192, TDD-0192 IMP-2, FLOW-1 to FLOW-4, DEC-5, DEC-7, DEC-9, CTR-4, IF-2 to IF-4, IF-6): create, open,
// rename, ask to delete and delete, and read the list again. The workspaces are kept by persistence/browser-store.js in a database of their own; these
// functions only decide what the page does with them: they set the state of the card (landingBusy, landingNotice, landingNameDraft, landingPendingDelete,
// landingFocusSelector), ask for a redraw with requestRedraw() and never draw. A flow that loads a workspace resolves when the workspace is loaded.
// None of them touches the remembered folders (the first database): a flow writes to one database only.
// =====================================================================

/* exported newBrowserWorkspace, setBrowserNameDraft, submitBrowserNameDraft, cancelBrowserNameDraft, renameBrowserWorkspaceRow, openBrowserWorkspace,
   askToDeleteBrowserWorkspace, confirmDeleteBrowserWorkspace, cancelBrowserWorkspaceQuestion --
   the entry points of the card (composition/events.js, run 0192, task 008). */

const BROWSER_DEFAULT_NAME = 'Untitled workspace';

// The controls the card focuses after a flow, as selectors on the data-action and data-workspace-id the card draws (presentation/landing.js).
const BROWSER_NAME_FIELD_SELECTOR = 'input[data-browser-name]';
const BROWSER_NEW_SELECTOR = '[data-action="new-browser-workspace"]';
const BROWSER_CANCEL_QUESTION_SELECTOR = '[data-action="cancel-browser-workspace-question"]';

function browserRowSelector(action, id) {
  return '[data-action="' + action + '"][data-workspace-id="' + id + '"]';
}

/**
 * The root directory the page holds for a browser workspace. The store says a missing file and a deleted workspace with one name,
 * `NotFoundError` (DEC-6), and the save reads that name as "the file is not there"; on the root the page uses, a deleted workspace is
 * told as `WorkspaceGoneError` with the same sentence, so that the save stops on it and says it instead of finding a file missing.
 * Only the two calls every path starts with are wrapped: the rest of the handle is the store's own.
 */
function browserEditorRoot(id, name) {
  const root = browserDirectoryHandle(id, '', name);
  const loud =
    (call) =>
    async (...args) => {
      try {
        return await call.apply(root, args);
      } catch (e) {
        if (e && e.workspaceGone) {
          const gone = new Error(e.message);
          gone.name = 'WorkspaceGoneError';
          throw gone;
        }
        throw e;
      }
    };
  return Object.assign({}, root, {
    getDirectoryHandle: loud(root.getDirectoryHandle),
    getFileHandle: loud(root.getFileHandle)
  });
}

/** The row of the list for this workspace id, or undefined. */
function browserWorkspaceById(id) {
  return browserWorkspaces.find((w) => w.id === id);
}

/** How the card names a workspace in a sentence: its name, else what it is. */
function browserWorkspaceTitle(row) {
  return row && row.name ? row.name : 'This workspace';
}

/** The sentence of a store that failed, as the card says it after the action's own words. */
function browserFailureText(e) {
  return e && e.message ? e.message : String(e);
}

/**
 * Reads the list of the workspaces from the store again. A store that cannot be read leaves the list as it was: the flows say what they
 * could not do, and the card still shows what the page knew.
 */
async function refreshBrowserWorkspaces() {
  try {
    browserWorkspaces = await listBrowserWorkspaces();
  } catch (e) {
    console.error('ArchiCode: the browser workspaces could not be read', e);
  }
}

/** The first of 'Untitled workspace', 'Untitled workspace 2', … that no workspace of the list has (without regard to case). */
function defaultBrowserWorkspaceName() {
  const taken = new Set(browserWorkspaces.map((w) => String(w.name).trim().toLowerCase()));
  let name = BROWSER_DEFAULT_NAME;
  for (let n = 2; taken.has(name.toLowerCase()); n++) name = BROWSER_DEFAULT_NAME + ' ' + n;
  return name;
}

/** The text of the `.archicode.yaml` a new workspace holds (DEC-9): it opens, and Settings has a name to edit. */
function minimalBrowserWorkspaceYaml(name) {
  // JSON.stringify writes a YAML double-quoted scalar; the two line separators it leaves as they are would end a YAML line
  const quoted = JSON.stringify(name)
    .replace(/\u2028/g, '\\u2028')
    .replace(/\u2029/g, '\\u2029');
  return '# A workspace kept in this browser.\nsettings:\n  name: ' + quoted + '\n';
}

/** *New workspace in this browser*: opens the name field with the default name (IF-2). */
async function newBrowserWorkspace() {
  await refreshBrowserWorkspaces(); // the default name is free among the workspaces that are there now
  landingNotice = null;
  landingPendingDelete = null;
  landingNameDraft = { for: 'new', text: defaultBrowserWorkspaceName(), problem: null };
  landingFocusSelector = BROWSER_NAME_FIELD_SELECTOR;
  requestRedraw();
}

/** *Rename* on a row: the name of the row in the field of its row (IF-3). */
function renameBrowserWorkspaceRow(id) {
  const row = browserWorkspaceById(id);
  if (!row) return;
  landingNotice = null;
  landingPendingDelete = null;
  landingNameDraft = { for: id, text: row.name, problem: null };
  landingFocusSelector = BROWSER_NAME_FIELD_SELECTOR;
  requestRedraw();
}

/** The typing in the name field: the text is kept (a redraw gives it back) and the sentence of a refusal goes. No redraw: the field is the source. */
function setBrowserNameDraft(text) {
  if (!landingNameDraft) return;
  landingNameDraft.text = text;
  landingNameDraft.problem = null;
}

/** *Cancel* of the name field, Escape: the field goes, nothing is stored. */
function cancelBrowserNameDraft() {
  if (!landingNameDraft) return;
  const forRow = landingNameDraft.for;
  landingNameDraft = null;
  landingFocusSelector =
    forRow === 'new' ? BROWSER_NEW_SELECTOR : browserRowSelector('rename-browser-workspace', forRow);
  requestRedraw();
}

/** A refused name: the sentence goes under the field, the typed text stays (IF-2). */
function refuseBrowserName(sentence) {
  landingNameDraft.problem = sentence;
  landingFocusSelector = BROWSER_NAME_FIELD_SELECTOR;
  requestRedraw();
}

/** *Create* / *Rename* of the name field (Enter): creates the workspace and opens it, or renames the record (FLOW-2, FLOW-4). */
async function submitBrowserNameDraft() {
  const draft = landingNameDraft;
  if (!draft) return;
  const others = browserWorkspaces.filter((w) => w.id !== draft.for).map((w) => w.name);
  const problem = browserWorkspaceNameProblem(draft.text, others);
  if (problem !== null) {
    refuseBrowserName(problem);
    return;
  }
  if (draft.for === 'new') await createBrowserWorkspaceFromDraft(draft);
  else await renameBrowserWorkspaceFromDraft(draft);
}

async function createBrowserWorkspaceFromDraft(draft) {
  const name = draft.text.trim();
  let record;
  try {
    record = await createBrowserWorkspace({
      name,
      files: [{ path: WORKSPACE_FILE_NAME, bytes: new TextEncoder().encode(minimalBrowserWorkspaceYaml(name)) }],
      origin: 'blank'
    });
  } catch (e) {
    if (e && e.name === 'InvalidNameError') {
      // another tab took the name since the list was read: the store says so inside its transaction
      await refreshBrowserWorkspaces();
      if (landingNameDraft === draft) refuseBrowserName(browserFailureText(e));
      return;
    }
    console.error('ArchiCode: a browser workspace could not be created', e);
    landingNameDraft = null;
    landingNotice = 'The workspace could not be created: ' + browserFailureText(e);
    await refreshBrowserWorkspaces();
    landingFocusSelector = BROWSER_NEW_SELECTOR;
    requestRedraw();
    return;
  }
  landingNameDraft = null;
  await openBrowserWorkspace(record.id);
}

async function renameBrowserWorkspaceFromDraft(draft) {
  const id = draft.for;
  const row = browserWorkspaceById(id);
  try {
    await renameBrowserWorkspace(id, draft.text);
  } catch (e) {
    if (e && e.name === 'InvalidNameError') {
      await refreshBrowserWorkspaces();
      if (landingNameDraft === draft) refuseBrowserName(browserFailureText(e));
      return;
    }
    landingNameDraft = null;
    if (e && e.name === 'NotFoundError') {
      landingNotice = '“' + browserWorkspaceTitle(row) + '” is no longer in this browser.';
      landingFocusSelector = BROWSER_NEW_SELECTOR;
    } else {
      console.error('ArchiCode: a browser workspace could not be renamed', e);
      landingNotice = '“' + browserWorkspaceTitle(row) + '” could not be renamed: ' + browserFailureText(e);
      landingFocusSelector = browserRowSelector('rename-browser-workspace', id);
    }
    await refreshBrowserWorkspaces();
    requestRedraw();
    return;
  }
  landingNameDraft = null;
  landingNotice = null;
  landingFocusSelector = browserRowSelector('open-browser-workspace', id);
  await refreshBrowserWorkspaces();
  requestRedraw();
}

/**
 * Opens a workspace of the list: the record is read again (IF-4: a workspace deleted in another tab is a notice and a fresh list), the pointer
 * `last` is written, the page holds it as its folder (`browserWorkspace` is the id, `id` is null: no remembered folder) and the workspace is loaded.
 */
async function openBrowserWorkspace(id) {
  const known = browserWorkspaceById(id);
  await refreshBrowserWorkspaces();
  const row = browserWorkspaceById(id);
  if (!row || row.problem) {
    const title = browserWorkspaceTitle(row || known);
    landingNotice = row
      ? '“' + title + '” could not be read. Delete it from the list.'
      : '“' + title + '” is no longer in this browser.';
    landingFocusSelector = BROWSER_NEW_SELECTOR;
    requestRedraw();
    return;
  }
  try {
    await writeBrowserLast(id);
  } catch (e) {
    // it was deleted between the list and the pointer: the same notice, with the list read again
    console.error('ArchiCode: the browser workspace could not be opened', e);
    await refreshBrowserWorkspaces();
    landingNotice =
      e && e.name === 'NotFoundError'
        ? '“' + row.name + '” is no longer in this browser.'
        : '“' + row.name + '” could not be opened: ' + browserFailureText(e);
    landingFocusSelector = BROWSER_NEW_SELECTOR;
    requestRedraw();
    return;
  }
  // another workspace than the one the page was holding: nothing of the old one (pins, facet, hash…) must reach it
  if (AppState.folder && AppState.folder.browserWorkspace !== id) {
    AppState = createInitialAppState();
    resetUiState();
  }
  landingNotice = null;
  landingNameDraft = null;
  landingPendingDelete = null;
  const handle = browserEditorRoot(id, row.name);
  AppState.folder = { handle, name: row.name, id: null, browserWorkspace: id };
  AppState.permissionState = 'granted';
  landingBusy = openingMessage(row.name);
  requestRedraw();
  await loadWorkspace(handle);
}

/** *Delete* on a row: the row turns into the question (DEC-7); the focus goes to *Cancel*, so Enter deletes nothing. */
function askToDeleteBrowserWorkspace(id) {
  if (!browserWorkspaceById(id)) return;
  landingNotice = null;
  landingNameDraft = null;
  landingPendingDelete = id;
  landingFocusSelector = BROWSER_CANCEL_QUESTION_SELECTOR;
  requestRedraw();
}

/** *Cancel* of the question, Escape: the row is back and nothing changed. */
function cancelBrowserWorkspaceQuestion() {
  const id = landingPendingDelete;
  if (id === null) return;
  landingPendingDelete = null;
  landingFocusSelector = browserRowSelector('ask-delete-browser-workspace', id);
  requestRedraw();
}

/** *Delete “name”* of the question: one transaction removes the record, its files and the pointer (FLOW-4). The focus goes to the next row, else to *New workspace*. */
async function confirmDeleteBrowserWorkspace(id) {
  const known = browserWorkspaceById(id);
  const at = browserWorkspaces.indexOf(known);
  landingPendingDelete = null;
  await refreshBrowserWorkspaces();
  const row = browserWorkspaceById(id);
  const title = browserWorkspaceTitle(row || known);
  if (!row) {
    landingNotice = '“' + title + '” was already deleted.';
    landingFocusSelector = BROWSER_NEW_SELECTOR;
    requestRedraw();
    return;
  }
  try {
    await deleteBrowserWorkspace(id);
  } catch (e) {
    console.error('ArchiCode: a browser workspace could not be deleted', e);
    landingNotice = '“' + title + '” could not be deleted: ' + browserFailureText(e);
    landingFocusSelector = browserRowSelector('ask-delete-browser-workspace', id);
    requestRedraw();
    return;
  }
  landingNotice = null;
  await refreshBrowserWorkspaces();
  const next = browserWorkspaces[at] || browserWorkspaces[at - 1];
  landingFocusSelector = next ? browserRowSelector('open-browser-workspace', next.id) : BROWSER_NEW_SELECTOR;
  requestRedraw();
}
