// =====================================================================
// Folder pick / persist / reopen / close flows
// (TDD DEC-3/DEC-4, CON-3/CON-4, CTR-2; PRD FR-1/FR-2/FR-3; FLOW-1..3).
// =====================================================================

function isFileSystemAccessSupported() {
  return typeof window.showDirectoryPicker === 'function' && 'indexedDB' in window;
}

// ---- Served by `archicode editor serve`: the folder comes from the server, in any browser ----
//
// The server puts a token in a <meta name="archicode-server"> of the page it serves. When it is there the editor does
// not ask for a folder: it opens the one the server serves, through the small API of the server (/api/fs/…), by way
// of objects that answer the calls of the File System Access API the rest of the editor already makes. Opened from
// a file, or from GitHub Pages, there is no such tag, and the editor asks for a folder as it always did.

function serverToken() {
  const meta =
    typeof document !== 'undefined' && document.querySelector
      ? document.querySelector('meta[name="archicode-server"]')
      : null;
  return meta ? meta.getAttribute('content') : null;
}

/** Is this page served by `archicode editor serve`? */
function isServedByArchiCode() {
  return !!serverToken();
}

/**
 * The server asks for `?token=` on the first request only; the page carries the token in its <meta> from then on.
 * Take it out of the address bar (the hash stays) so it is not left in the history, a screenshot or a copied link.
 */
function stripServerTokenFromUrl() {
  if (typeof location === 'undefined' || typeof history === 'undefined' || !history.replaceState) return;
  const params = new URLSearchParams(location.search || '');
  if (!params.has('token')) return;
  params.delete('token');
  const rest = params.toString();
  try {
    history.replaceState(null, '', (location.pathname || '/') + (rest ? '?' + rest : '') + (location.hash || ''));
  } catch (e) {
    /* no history to edit */
  }
}

/** Whether the editor can get hold of a folder here: from the server that serves it, or by picking one. */
function isFolderAccessAvailable() {
  return isServedByArchiCode() || isFileSystemAccessSupported();
}

/**
 * The text of a file the folder gives, and whether the file starts with a UTF-8 byte-order mark (#119). A browser never hands the mark to the page (`File.text()` and the decoder
 * of a response both drop it), so the bytes tell: the first three of the file. The text is returned as the browser gives it, without the mark; a reader that does give it (no
 * `slice` to ask the bytes) has it taken off and noted, so that `rawText` of a file never starts with one and the write (`withByteOrderMark`) is the only place that puts it back.
 */
async function readTextAndMark(file) {
  let text = await file.text();
  let bom = false;
  if (file && typeof file.slice === 'function') {
    try {
      const head = new Uint8Array(await file.slice(0, 3).arrayBuffer());
      bom = head.length === 3 && head[0] === 0xef && head[1] === 0xbb && head[2] === 0xbf;
    } catch (e) {
      bom = false; // the bytes cannot be asked: the file is written as the page holds it
    }
  } else if (text.charCodeAt(0) === 0xfeff) {
    bom = true;
    text = text.slice(1);
  }
  return { text, bom };
}

/** The text to write for a file that started with a byte-order mark (`bom`): the mark first, once. */
function withByteOrderMark(bom, text) {
  return bom && text.charCodeAt(0) !== 0xfeff ? '\ufeff' + text : text;
}

async function serverFetch(method, route, params, body) {
  const query = params ? '?' + new URLSearchParams(params).toString() : '';
  return fetch('/api/fs/' + route + query, { method, headers: { 'X-ArchiCode-Token': serverToken() }, body });
}

async function serverFailure(response, what) {
  if (response.status === 404) {
    const e = new Error('NotFoundError: ' + what);
    e.name = 'NotFoundError';
    return e;
  }
  return new Error((await response.text()) || 'the server answered ' + response.status + ' for ' + what);
}

/** A directory of the served folder, as a File System Access directory handle (what the editor uses of it). */
function serverDirectoryHandle(path, name) {
  const child = (entry) => (path ? path + '/' : '') + entry;
  const list = async () => {
    const response = await serverFetch('GET', 'list', { path });
    if (!response.ok) throw await serverFailure(response, path || '/');
    return response.json();
  };
  const find = async (entry, kind) => {
    if (!(await list()).some((e) => e.name === entry && e.kind === kind)) {
      const e = new Error('NotFoundError: ' + child(entry));
      e.name = 'NotFoundError';
      throw e;
    }
  };
  return {
    kind: 'directory',
    name,
    async queryPermission() {
      return 'granted';
    },
    async requestPermission() {
      return 'granted';
    },
    async *entries() {
      for (const e of await list()) {
        const handle =
          e.kind === 'directory'
            ? serverDirectoryHandle(child(e.name), e.name)
            : serverFileHandle(child(e.name), e.name);
        if (e.link) handle.symbolicLink = true; // the server says which folders are links: a recursive read of the manifests does not follow them (run 0076)
        yield [e.name, handle];
      }
    },
    async getDirectoryHandle(entry, options) {
      if (!(options && options.create)) await find(entry, 'directory');
      return serverDirectoryHandle(child(entry), entry);
    },
    async getFileHandle(entry, options) {
      if (!(options && options.create)) await find(entry, 'file');
      return serverFileHandle(child(entry), entry);
    },
    async removeEntry(entry) {
      const response = await serverFetch('DELETE', 'file', { path: child(entry) });
      if (!response.ok) throw await serverFailure(response, child(entry));
    }
  };
}

/** A file of the served folder, as a File System Access file handle. */
function serverFileHandle(path, name) {
  return {
    kind: 'file',
    name,
    async queryPermission() {
      return 'granted';
    },
    async requestPermission() {
      return 'granted';
    },
    async getFile() {
      const response = await serverFetch('GET', 'file', { path });
      if (!response.ok) throw await serverFailure(response, path);
      // the editor tells that a file changed on disk since it read it by this time
      const modified = Number(
        response.headers && response.headers.get ? response.headers.get('X-ArchiCode-Modified') : NaN
      );
      // the bytes, not `response.text()`: that decoder drops a byte-order mark, and the page then could not put it back when it saves (#119); `File.text()` drops it the same way
      return new File(
        [await response.arrayBuffer()],
        name,
        Number.isFinite(modified) ? { type: 'text/plain', lastModified: modified } : { type: 'text/plain' }
      );
    },
    async createWritable() {
      const parts = [];
      return {
        async write(data) {
          parts.push(data && typeof data === 'object' && 'data' in data && !(data instanceof Blob) ? data.data : data);
        },
        async close() {
          const response = await serverFetch('PUT', 'file', { path }, new Blob(parts));
          if (!response.ok) throw await serverFailure(response, path);
        }
      };
    }
  };
}

/** Open the folder the server serves: no picker, no stored handle, no permission to ask for. */
async function openServedFolder() {
  try {
    const response = await serverFetch('GET', 'info');
    if (!response.ok) throw await serverFailure(response, 'the server');
    const info = await response.json();
    const handle = serverDirectoryHandle('', info.folder);
    landingBusy = openingMessage(info.folder);
    AppState.folder = { handle, name: info.folder };
    AppState.permissionState = 'granted';
    requestRedraw();
    await loadWorkspace(handle);
  } catch (e) {
    landingBusy = null;
    console.error('ArchiCode: opening the served folder failed', e);
    setFatalError(
      'The editor server could not be reached: ' +
        (e && e.message ? e.message : String(e)) +
        '. Reload the page, or restart `archicode editor serve`.'
    );
    requestRedraw();
  }
}

/** Click handler for the initial "pick a folder" button (FR-1). */
async function openFolder() {
  try {
    const handle = await window.showDirectoryPicker();
    // another folder than the one the page was holding: nothing of the old one (pins, facet, hash…) must reach it
    let sameFolder = !AppState.folder;
    if (AppState.folder && AppState.folder.handle && AppState.folder.handle.isSameEntry) {
      try {
        sameFolder = await AppState.folder.handle.isSameEntry(handle);
      } catch (e) {
        sameFolder = false;
      }
    }
    if (!sameFolder) {
      AppState = createInitialAppState();
      resetUiState();
    }
    landingNotice = null;
    // remembered as the last folder, or found among the remembered ones (the same folder picked again is one entry)
    let entry = null;
    try {
      entry = await rememberFolder(handle);
    } catch (e) {
      console.error('ArchiCode: the folder could not be remembered; it opens all the same', e);
    }
    landingBusy = openingMessage(handle.name, entry ? entry.name : '');
    AppState.folder = { handle, name: handle.name, id: entry ? entry.id : null };
    AppState.permissionState = 'granted';
    requestRedraw();
    await loadWorkspace(handle);
  } catch (e) {
    landingBusy = null;
    if (e && e.name === 'AbortError') {
      requestRedraw();
      return;
    } // user dismissed the picker
    console.error('ArchiCode: openFolder failed', e);
    setFatalError('Failed to open folder: ' + (e && e.message ? e.message : String(e)));
    requestRedraw();
  }
}

const FOLDER_REFUSED = 'The browser did not give access to this folder.';
const FOLDER_UNREACHABLE = 'This folder could not be reached: it may have been moved or deleted.';
const FOLDER_UNREADABLE = 'Its .archicode.yaml could not be read the last time it was opened.';

/** Click handler for the "Reopen <name>" button of the reopen card: the folder the page holds, as remembered (FR-2/DEC-4). */
async function reopenFolder() {
  if (!AppState.folder || !AppState.folder.handle) return;
  const entry = rememberedFolderById(AppState.folder.id) || {
    id: AppState.folder.id || null,
    handle: AppState.folder.handle,
    name: '',
    openedAt: 0,
    legacy: !AppState.folder.id
  };
  await openRememberedFolder(entry);
}

/**
 * Click handler for a remembered folder of the list, and for the reopen card (TDD-0020 DEC-6). requestPermission() must
 * only ever be called from inside a user gesture handler like this one (CON-3), so it is the first thing it does — never
 * automatically on load. A refused or failed permission keeps the folder remembered: the list says what happened.
 */
async function openRememberedFolder(entry) {
  if (!entry || !entry.handle) return;
  let permission;
  try {
    permission = await entry.handle.requestPermission({ mode: 'read' });
  } catch (e) {
    console.error('ArchiCode: requestPermission failed for a remembered folder', e);
    permission = e && e.name === 'NotFoundError' ? 'unreachable' : 'denied';
  }
  landingNotice = null;
  const sameFolder = !!AppState.folder && (AppState.folder.id || '') === (entry.id || '');
  if (permission !== 'granted') {
    // denied, dismissed or thrown: back to the list, which keeps the folder and says why it did not open
    entry.problem = permission === 'unreachable' ? FOLDER_UNREACHABLE : FOLDER_REFUSED;
    landingNotice = '“' + rememberedFolderTitle(entry) + '” did not open. ' + entry.problem;
    if (AppState.folder) {
      AppState = createInitialAppState();
      resetUiState();
    }
    if (!rememberedFolders.includes(entry))
      rememberedFolders = sortRememberedFolders(rememberedFolders.concat([entry]));
    landingFocusSelector = folderOpenSelector(entry);
    requestRedraw();
    return;
  }
  entry.problem = null;
  if (!sameFolder) {
    // another folder than the one the page was holding: nothing of the old one (pins, facet, hash…) must reach it
    AppState = createInitialAppState();
    resetUiState();
  }
  AppState.folder = { handle: entry.handle, name: entry.handle.name, id: entry.id || null };
  AppState.permissionState = 'granted';
  landingBusy = openingMessage(entry.handle.name, entry.name);
  requestRedraw();
  try {
    const kept = await rememberFolder(entry.handle, entry);
    if (kept) AppState.folder.id = kept.id;
  } catch (e) {
    console.error('ArchiCode: the folder could not be remembered as the last one', e);
  }
  await loadWorkspace(entry.handle);
}

/** The Open button of a remembered folder in the list, as a selector. */
function folderOpenSelector(entry) {
  return '[data-action="open-remembered-folder"][data-folder-id="' + (entry.id || '') + '"]';
}

/**
 * Reads the remembered folders again, keeping what the page found out about each (its problem line, DEC-9), also for a
 * folder whose records were merged meanwhile (under the id it is now, TDD-0023 DEC-6).
 */
async function refreshRememberedFolders() {
  const problems = new Map(rememberedFolders.filter((f) => f.problem).map((f) => [f.id || '', f.problem]));
  let remembered;
  try {
    remembered = await readRememberedFolders();
  } catch (e) {
    console.error('ArchiCode: the remembered folders could not be read', e);
    return;
  }
  rememberedFolders = remembered.folders;
  const merged = remembered.merged || new Map();
  for (const [id, problem] of problems) {
    const now = merged.get(id) || id;
    for (const f of rememberedFolders) if ((f.id || '') === now && !f.problem) f.problem = problem;
  }
}

/** The state of the permission to read a folder, asked without any prompt (TDD-0023 DEC-1, CTR-2). Never rejects. */
async function folderPermissionOf(handle) {
  if (!handle || typeof handle.queryPermission !== 'function') return 'unknown';
  try {
    const state = await handle.queryPermission({ mode: 'read' });
    return state === 'granted' || state === 'prompt' || state === 'denied' ? state : 'unknown';
  } catch (e) {
    return e && e.name === 'NotFoundError' ? 'unreachable' : 'unknown';
  }
}

/**
 * Says, next to each remembered folder, what a click on it will meet (TDD-0023 DEC-1): `queryPermission` needs no user
 * gesture and shows no prompt. Called once the card is drawn, so it never delays it: every folder not yet known is asked
 * at once, and the card is drawn again, once, if it still shows the list, with the focus where it was.
 */
async function checkFolderPermissions() {
  const pending = rememberedFolders.filter((f) => !f.permission);
  if (pending.length === 0) return;
  await Promise.all(
    pending.map(async (f) => {
      f.permission = await folderPermissionOf(f.handle);
    })
  );
  const landing = landingScreenConfig();
  if (!landing || !landing.folders || !pending.some((f) => rememberedFolders.includes(f))) return; // the list is gone
  if (landingFocusSelector === null) landingFocusSelector = landingControlSelector(document.activeElement) || '';
  requestRedraw();
}

/** "Remembered folders" on the error card: leaves the folder that did not open (storage untouched) for the list. */
async function showRememberedFolders() {
  const failed = AppState.folder ? rememberedFolderById(AppState.folder.id) : null;
  if (failed && AppState.fatalErrorKind) failed.problem = FOLDER_UNREADABLE;
  AppState = createInitialAppState();
  resetUiState();
  landingNotice = null;
  requestRedraw();
  await refreshRememberedFolders();
  requestRedraw();
  await checkFolderPermissions();
}

/** "Remove from the list" (TDD-0020 DEC-7): this browser forgets the folder; nothing is deleted on disk. */
async function forgetFolder(entry) {
  if (!entry) return;
  const title = rememberedFolderTitle(entry);
  try {
    // the records the folder has now: another tab may have merged it under another id, or removed it (TDD-0023 DEC-6)
    const ids = entry.id ? [await liveFolderId(entry.handle, entry.id)].concat(entry.others || []).filter(Boolean) : [];
    await forgetRememberedFolder(entry, Array.from(new Set(ids)));
  } catch (e) {
    console.error('ArchiCode: a remembered folder could not be removed from the list', e);
    landingNotice = '“' + title + '” could not be removed from the list: ' + (e && e.message ? e.message : String(e));
    landingFocusSelector = '[data-action="forget-folder"][data-folder-id="' + (entry.id || '') + '"]';
    requestRedraw();
    return;
  }
  const at = rememberedFolders.indexOf(entry);
  rememberedFolders = rememberedFolders.filter((f) => f !== entry);
  // the folder the reopen card was offering is gone: the card of a page that holds no folder, with the others
  if (AppState.folder && !AppState.workspace && (AppState.folder.id || '') === (entry.id || '')) {
    AppState = createInitialAppState();
    resetUiState();
  }
  landingNotice = '“' + title + '” is no longer in the list. Nothing was deleted on disk.';
  const next = rememberedFolders[at] || rememberedFolders[at - 1];
  landingFocusSelector = next ? folderOpenSelector(next) : null;
  requestRedraw();
}
