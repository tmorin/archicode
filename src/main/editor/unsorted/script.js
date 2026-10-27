// =====================================================================
// IndexedDB: the remembered folders (run 0020, TDD-0020 DEC-1/DEC-2, CTR-1)
//
// The database of the first version of the editor, unchanged: 'archicode-standalone-editor', version 1, store 'handles'
// (no keyPath). Deliberately no version upgrade: an older tab, which never closes its connection, would block it, and an
// older copy of the page could no longer open the database. Two kinds of record:
//   'workspace'   -> { handle, id }  the last folder, opened on load. `id` names its folder record. Without `id` it was
//                                    written by an earlier version, which remembered one folder: it is migrated, by being
//                                    rewritten in place with its `id`, never deleted, so a failed migration loses nothing.
//   'folder:<id>' -> { kind: 'folder', id, handle, name, openedAt }  one per remembered folder; `name` is what its
//                                    workspace calls itself (settings.name, '' when none), `openedAt` orders the list.
// Two tabs that pick the same folder at the same moment can each add a record for it: the records of one folder are
// merged into one whenever the list is read and after each folder remembered (run 0023, TDD-0023 DEC-3..DEC-6), in one
// transaction that never writes the 'workspace' record and writes nothing at all if it fails.
// Never JSON.stringify a handle: it is structured-clone-native and `put` takes it as it is.
// =====================================================================

const ARCHICODE_DB_NAME = 'archicode-standalone-editor';
const ARCHICODE_DB_VERSION = 1;
const ARCHICODE_STORE_NAME = 'handles';
const ARCHICODE_LAST_FOLDER_KEY = 'workspace';
const ARCHICODE_FOLDER_KEY_PREFIX = 'folder:';

function openArchicodeDb() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(ARCHICODE_DB_NAME, ARCHICODE_DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(ARCHICODE_STORE_NAME)) {
        db.createObjectStore(ARCHICODE_STORE_NAME);
      }
    };
    req.onsuccess = () => {
      const db = req.result;
      db.onversionchange = () => db.close(); // a later version of the page that upgrades the database is never blocked by this one
      resolve(db);
    };
    req.onerror = () => reject(req.error);
  });
}

/**
 * Runs `work(store)` in one transaction and resolves with what it returned once the transaction has committed — not
 * when its requests succeeded: a transaction can still abort after them. A request error, a throw (`put` throws a
 * DataCloneError for a value it cannot clone) or an abort writes nothing and rejects. `work` only queues requests and
 * reads their results in their `onsuccess`, never after an `await`: the transaction would commit under it.
 */
async function withArchicodeStore(mode, work) {
  const db = await openArchicodeDb();
  try {
    return await new Promise((resolve, reject) => {
      const tx = db.transaction(ARCHICODE_STORE_NAME, mode);
      let result;
      tx.oncomplete = () => resolve(result);
      tx.onabort = () => reject(tx.error || new Error('the transaction was aborted'));
      try {
        result = work(tx.objectStore(ARCHICODE_STORE_NAME));
      } catch (e) {
        try { tx.abort(); } catch (ignored) { /* already finished */ }
        reject(e);
      }
    });
  } finally {
    db.close();
  }
}

function folderKey(id) {
  return ARCHICODE_FOLDER_KEY_PREFIX + id;
}

function isFolderRecord(value) {
  return !!value && value.kind === 'folder' && typeof value.id === 'string' && !!value.handle;
}

/** A remembered folder as the page holds it: `{ id, handle, name, openedAt }`, plus `legacy` and `problem` (DEC-9). */
function folderEntryOf(record) {
  return { id: record.id, handle: record.handle, name: typeof record.name === 'string' ? record.name : '', openedAt: Number(record.openedAt) || 0 };
}

function folderRecordOf(entry) {
  return { kind: 'folder', id: entry.id, handle: entry.handle, name: entry.name || '', openedAt: entry.openedAt };
}

function newFolderId() {
  return Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 10);
}

/** Most recent first. */
function sortRememberedFolders(folders) {
  return folders.slice().sort((a, b) => b.openedAt - a.openedAt);
}

/**
 * The stored records as they are: `{ folders, last, complete }`. One stored value that cannot be read back fails the
 * whole getAll; then the last-folder record alone is read (`complete: false`), which is still enough to reopen it.
 */
async function readArchicodeRecords() {
  try {
    return await withArchicodeStore('readonly', (store) => {
      const out = { folders: [], last: null, complete: true };
      store.get(ARCHICODE_LAST_FOLDER_KEY).onsuccess = (e) => { out.last = e.target.result || null; };
      store.getAll().onsuccess = (e) => { out.folders = (e.target.result || []).filter(isFolderRecord); };
      return out;
    });
  } catch (e) {
    console.error('ArchiCode: the remembered folders could not be read; trying the last folder alone', e);
    return withArchicodeStore('readonly', (store) => {
      const out = { folders: [], last: null, complete: false };
      store.get(ARCHICODE_LAST_FOLDER_KEY).onsuccess = (ev) => { out.last = ev.target.result || null; };
      return out;
    });
  }
}

/** Whether two handles are the same folder (`isSameEntry`). A handle that cannot be compared is another folder. */
async function isSameFolder(a, b) {
  if (!a || !b || typeof a.isSameEntry !== 'function') return false;
  try {
    return (await a.isSameEntry(b)) === true;
  } catch (e) {
    return false;
  }
}

/** The remembered folder that is the same folder as `handle` (`isSameEntry`, DEC-3), or null. */
async function findSameFolder(handle, folders) {
  for (const folder of folders) {
    if (await isSameFolder(folder.handle, handle)) return folder;
  }
  return null;
}

/**
 * The remembered folders grouped by folder (TDD-0023 DEC-4): a group of more than one holds records of one folder.
 * Only records whose handles have the same name are compared (two handles of one folder have its name), so a list of
 * distinct folders costs no `isSameEntry` call. Never in a transaction: `isSameEntry` is not IndexedDB.
 */
async function groupSameFolders(folders) {
  const groups = [];
  const byName = new Map();
  for (const folder of folders) {
    const name = folder.handle && typeof folder.handle.name === 'string' ? folder.handle.name : null;
    let group = null;
    for (const candidate of name === null ? [] : byName.get(name) || []) {
      if (await isSameFolder(candidate[0].handle, folder.handle)) { group = candidate; break; }
    }
    if (group) {
      group.push(folder);
    } else {
      group = [folder];
      groups.push(group);
      if (name !== null) byName.set(name, (byName.get(name) || []).concat([group]));
    }
  }
  return groups;
}

/**
 * The one entry the records of a folder become (TDD-0023 DEC-5): the record the last-folder pointer names if it is one
 * of them (so the pointer never has to change), else the most recently opened; the most recent `openedAt`; and the name
 * of the most recently opened record that has one, so a stored name is never lost to a record whose name was not noted.
 */
function mergedFolderOf(group, lastRecord) {
  const recent = group.slice().sort((a, b) => b.openedAt - a.openedAt || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
  const pointed = lastRecord && lastRecord.id ? group.find((f) => f.id === lastRecord.id) : null;
  const survivor = pointed || recent[0];
  const named = recent.find((f) => f.name);
  return { id: survivor.id, handle: survivor.handle, name: named ? named.name : '', openedAt: recent[0].openedAt };
}

/** Whether a stored record is still what the page read: same id, same name, same `openedAt`. */
function isUnchangedFolderRecord(record, entry) {
  if (!isFolderRecord(record) || record.id !== entry.id) return false;
  const now = folderEntryOf(record);
  return now.name === entry.name && now.openedAt === entry.openedAt;
}

/**
 * Merges the records of one folder into `merged` (TDD-0023 DEC-5), in one transaction: only if every record of the
 * group is still as it was read and the last-folder pointer names none of the records to delete; then the survivor's
 * record takes the merged name and `openedAt` and the others are deleted. The 'workspace' record is never written.
 * Rejects when nothing was written (something changed, or the transaction aborted): the records are then as they were.
 */
async function mergeSameFolder(group, merged) {
  const others = group.filter((f) => f.id !== merged.id);
  const out = await withArchicodeStore('readwrite', (store) => {
    const state = { unchanged: true, left: group.length, survivor: null, merged: false };
    store.get(ARCHICODE_LAST_FOLDER_KEY).onsuccess = (e) => {
      const last = e.target.result;
      if (last && last.id && others.some((f) => f.id === last.id)) state.unchanged = false;
    };
    for (const folder of group) {
      store.get(folderKey(folder.id)).onsuccess = (e) => {
        const record = e.target.result;
        if (!isUnchangedFolderRecord(record, folder)) state.unchanged = false;
        if (folder.id === merged.id) state.survivor = record;
        if (--state.left > 0 || !state.unchanged) return;
        // the last read of the group: everything is as it was read, so the merge is written, all of it or nothing
        const kept = folderEntryOf(state.survivor);
        if (kept.name !== merged.name || kept.openedAt !== merged.openedAt) {
          store.put(Object.assign({}, state.survivor, { name: merged.name, openedAt: merged.openedAt }), folderKey(merged.id));
        }
        for (const other of others) store.delete(folderKey(other.id));
        state.merged = true;
      };
    }
    return state;
  });
  if (!out.merged) throw new Error('the records of the folder changed while they were being merged');
}

/**
 * The remembered folders with one entry per folder (TDD-0023 DEC-5/DEC-6), and `merged`: the ids that are now another
 * one's (`Map<id, id of its folder's entry>`). Each group of records of one folder is merged in its own transaction; a
 * merge that fails, or finds the records changed, writes nothing and is logged: the folder is still one entry, which
 * carries the ids of the other records (`others`) so that Remove forgets them all, and the next read tries again.
 */
async function mergeDuplicateFolders(folders, lastRecord) {
  const out = [];
  const merged = new Map();
  for (const group of await groupSameFolders(folders)) {
    if (group.length === 1) {
      out.push(group[0]);
      continue;
    }
    const entry = mergedFolderOf(group, lastRecord);
    try {
      await mergeSameFolder(group, entry);
    } catch (e) {
      console.error('ArchiCode: the records of one remembered folder could not be merged; it is listed once all the same', e);
      entry.others = group.filter((f) => f.id !== entry.id).map((f) => f.id);
    }
    for (const f of group) if (f.id !== entry.id) merged.set(f.id, entry.id);
    out.push(entry);
  }
  return { folders: out, merged };
}

/**
 * The id under which a folder is stored now (TDD-0023 DEC-6): `id` while its record exists, else the id of the record
 * of the same folder (another tab merged the records), else null (removed from the list). The page acts on ids it read
 * earlier; this is what keeps it from acting on one that no longer exists.
 */
async function liveFolderId(handle, id) {
  const records = await readArchicodeRecords();
  if (id && records.folders.some((r) => r.id === id)) return id;
  if (!records.complete) return id || null; // nothing better to go on
  const same = await findSameFolder(handle, records.folders.map(folderEntryOf));
  return same ? same.id : null;
}

/**
 * Migrates a last-folder record that names no folder record (written by an earlier version, DEC-2): it becomes the
 * remembered folder that is the same, or a new one, and is rewritten in place with that `id` — both in one transaction,
 * and only if the record is still the one that was read. Another tab may have changed it meanwhile: another `id`, and
 * nothing is written; the same `id` but another folder (an older page picked one), and only the folder that was compared
 * is added, the newer record being left for the next load to migrate. Resolves with the entry; rejects when the
 * last-folder record was not migrated, the old record then being exactly as it was.
 */
async function migrateLastFolder(lastRecord, folders) {
  const same = await findSameFolder(lastRecord.handle, folders);
  const entry = same || { id: lastRecord.id || newFolderId(), handle: lastRecord.handle, name: '', openedAt: Date.now() };
  const out = await withArchicodeStore('readwrite', (store) => {
    const written = { migrated: false };
    store.get(ARCHICODE_LAST_FOLDER_KEY).onsuccess = (e) => {
      const current = e.target.result;
      if (!current || !current.handle || (current.id || null) !== (lastRecord.id || null)) return;
      if (!same) store.put(folderRecordOf(entry), folderKey(entry.id));
      if (current.handle.name !== lastRecord.handle.name) return;
      store.put({ handle: current.handle, id: entry.id }, ARCHICODE_LAST_FOLDER_KEY);
      written.migrated = true;
    };
    return written;
  });
  if (!out.migrated) throw new Error('the last folder changed while it was being migrated');
  return entry;
}

/**
 * The remembered folders, most recent first, and the last folder (the one to open on load), as entries (DEC-9). A
 * last-folder record of an earlier version is migrated first; if that fails it is used as it was stored, as a `legacy`
 * entry (id null) that opens and can be removed, and the next load tries again. Nothing in served mode (DEC-10).
 */
async function readRememberedFolders() {
  if (isServedByArchiCode()) return { folders: [], last: null };
  const records = await readArchicodeRecords();
  let folders = records.folders.map(folderEntryOf);
  const lastRecord = records.last && records.last.handle ? records.last : null;
  let merged = new Map();
  // one entry per folder, whatever two tabs wrote; merged first, so that a migration finds the folder once
  if (records.complete) ({ folders, merged } = await mergeDuplicateFolders(folders, lastRecord));
  if (!lastRecord) return { folders: sortRememberedFolders(folders), last: null, merged };
  if (!records.complete) {
    // the folders could not be read: the last one is all there is, and nothing is written from so partial a view
    const last = { id: lastRecord.id || null, handle: lastRecord.handle, name: '', openedAt: Date.now(), legacy: !lastRecord.id };
    return { folders: [last], last, merged };
  }
  // the pointer may name a record a failed merge left beside its folder's entry (`others`): it is that folder
  let last = folders.find((f) => f.id === lastRecord.id || (lastRecord.id && (f.others || []).includes(lastRecord.id))) || null;
  if (!last) {
    try {
      last = await migrateLastFolder(lastRecord, folders);
      if (!folders.includes(last)) folders.push(last);
    } catch (e) {
      console.error('ArchiCode: the remembered folder could not be migrated; it is used as it was stored', e);
      last = { id: null, handle: lastRecord.handle, name: '', openedAt: Date.now(), legacy: true };
      folders.push(last);
    }
  }
  return { folders: sortRememberedFolders(folders), last, merged };
}

/**
 * Remembers a folder just opened with its permission as the last one (DEC-3): the entry it already is (`known`, while
 * its record is still stored), else the remembered folder that is the same, else a new one. One transaction writes its
 * record (`openedAt` now, its name kept) and the last-folder record. Then the records are read again and the records of
 * one folder merged (TDD-0023 DEC-3): of two tabs that picked the same folder at the same moment, the one whose write
 * came last sees both. Resolves with the entry the folder is now, null in served mode; the in-memory list follows.
 */
async function rememberFolder(handle, known) {
  if (isServedByArchiCode()) return null;
  const records = await readArchicodeRecords();
  let entry = null;
  if (records.complete) {
    const folders = records.folders.map(folderEntryOf);
    // a known entry only while its record is there: another tab may have merged it away, and it must not come back
    entry = (known && known.id ? folders.find((f) => f.id === known.id) : null) || await findSameFolder(handle, folders);
  } else if (known && known.id) {
    entry = known; // the records cannot all be read: the id the page knows
  }
  const fresh = { id: entry ? entry.id : newFolderId(), handle, name: entry ? entry.name : '', openedAt: Date.now() };
  await withArchicodeStore('readwrite', (store) => {
    store.put(folderRecordOf(fresh), folderKey(fresh.id));
    store.put({ handle, id: fresh.id }, ARCHICODE_LAST_FOLDER_KEY);
  });
  let kept = fresh;
  let merged = new Map();
  try {
    const after = await readArchicodeRecords();
    if (after.complete) {
      const result = await mergeDuplicateFolders(after.folders.map(folderEntryOf), after.last);
      merged = result.merged;
      kept = result.folders.find((f) => f.id === (merged.get(fresh.id) || fresh.id)) || fresh;
    }
  } catch (e) {
    console.error('ArchiCode: the remembered folders could not be checked for a second record of this folder', e);
  }
  const replaced = (f) => f.id === kept.id || f.id === fresh.id || merged.has(f.id) || f === known || !!(f.legacy && known && known.legacy);
  rememberedFolders = sortRememberedFolders(rememberedFolders.filter((f) => !replaced(f)).concat([kept]));
  return kept;
}

/**
 * Stores the name the loaded workspace gives itself with its folder (DEC-4), when it changed: on each open, and after a
 * save that wrote .archicode.yaml. Best effort: a failure is logged, never shown.
 */
async function noteWorkspaceName() {
  const folder = AppState.folder;
  if (!folder || !folder.id || !AppState.workspace || isServedByArchiCode()) return;
  const name = workspaceName();
  const entry = rememberedFolders.find((f) => f.id === folder.id);
  if (entry && entry.name === name) return;
  try {
    let stored = await storeWorkspaceName(folder.id, name);
    if (!stored) {
      // its record is gone: merged into the record of the same folder by another tab (TDD-0023 DEC-6), or removed there
      const live = await liveFolderId(folder.handle, null);
      if (live) {
        folder.id = live;
        stored = await storeWorkspaceName(live, name);
      }
    }
    for (const f of rememberedFolders) if (stored && f.id === folder.id) f.name = name;
  } catch (e) {
    console.error('ArchiCode: the name of the workspace could not be stored with its folder', e);
  }
}

/** Writes `name` into the record of folder `id`, in one transaction. Resolves false when there is no such record. */
async function storeWorkspaceName(id, name) {
  const out = await withArchicodeStore('readwrite', (store) => {
    const found = { record: false };
    store.get(folderKey(id)).onsuccess = (e) => {
      const record = e.target.result;
      if (!isFolderRecord(record)) return;
      found.record = true;
      if (record.name !== name) store.put(Object.assign({}, record, { name }), folderKey(id));
    };
    return found;
  });
  return out.record;
}

/**
 * Remove from the list (DEC-7): deletes the records `ids` (the folder's, and those of the same folder a failed merge left,
 * TDD-0023 DEC-6), and the last-folder record when it points at one of them. A legacy entry (no id) is that last-folder
 * record: it goes only while it is still that folder (same name), and if another tab migrated it meanwhile its new
 * folder record goes with it. Nothing else: no file, no other folder.
 */
async function forgetRememberedFolder(entry, ids) {
  await withArchicodeStore('readwrite', (store) => {
    for (const id of ids) store.delete(folderKey(id));
    store.get(ARCHICODE_LAST_FOLDER_KEY).onsuccess = (e) => {
      const last = e.target.result;
      if (!last) return;
      if (entry.id) {
        if (ids.includes(last.id)) store.delete(ARCHICODE_LAST_FOLDER_KEY);
      } else if (last.handle && last.handle.name === entry.handle.name) {
        if (last.id) store.delete(folderKey(last.id));
        store.delete(ARCHICODE_LAST_FOLDER_KEY);
      }
    };
  });
}

/**
 * Close folder (DEC-5): the next load does not reopen this folder, which stays remembered. Only if it is still the last:
 * the pointer names its id, or one of the records of the same folder a failed merge left (`others`, TDD-0023 DEC-6).
 */
async function clearLastFolder(id, others) {
  const ids = [id].concat(others || []);
  await withArchicodeStore('readwrite', (store) => {
    store.get(ARCHICODE_LAST_FOLDER_KEY).onsuccess = (e) => {
      const last = e.target.result;
      if (last && last.id && ids.includes(last.id)) store.delete(ARCHICODE_LAST_FOLDER_KEY);
    };
  });
}

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

// =====================================================================
// Settings parsing with documented defaults. The keys are told in kebab-case (`global-enabled`); the camel-case spelling that earlier
// versions still read is refused by the reader of the file (`readObject`), with the sentence that says what to write.
// =====================================================================

function readKey(obj, key, fallback) {
  if (!obj || typeof obj !== 'object') return fallback;
  // a key with nothing after it is a key that is not there (the command line leaves the default alone: `views: {path: }` is `views`)
  if (Object.prototype.hasOwnProperty.call(obj, key) && obj[key] !== null) return obj[key];
  return fallback;
}

// =====================================================================
// Plateaus (run 0035, wave 014 run 0084): a plateau is a layer (see "The band of plateaus"); what is left of the earlier key is the sentence that
// tells a workspace file that has it what to write instead, and the small readers the settings share.
// =====================================================================

/** A scalar of the file as the command line reads it into a String (a number or a boolean is its text); '' for anything else. */
function plateauText(value) {
  return typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean' ? String(value) : '';
}

/** Why a path may not name the folder of a plateau or of manifests, or null when it may: empty, absolute, or going up with `..`. */
function plateauPathProblem(path) {
  if (typeof path !== 'string' || path.trim() === '') return 'is empty';
  if (path.startsWith('/') || path.startsWith('\\') || /^[A-Za-z]:/.test(path)) return 'is absolute';
  if (path.split(/[/\\]/).includes('..')) return 'contains `..`';
  return null;
}

// ---- Where the manifests are (run 0076, issue #73): the entries of `settings.manifests.paths`. The rules are the ones of the command line
// (`ManifestDiscovery.java`), and one list of cases, discovery-cases.json, is run by both: keep them alike. ----

/** Whether an entry of `manifests.paths` is read recursively: it ends in `/**` (`manifests/**`, or `./**` for the folder of .archicode.yaml). */
function isRecursiveManifestsPath(path) {
  return typeof path === 'string' && path.endsWith('/**');
}

/** The folder an entry names: the entry without its `/**`, if it has one. */
function manifestsFolderOf(path) {
  return isRecursiveManifestsPath(path) ? path.slice(0, -3) : path;
}

/** `**` means something at the end of an entry, after a `/`, and nowhere else: the end of the sentence that says so, or null. */
function manifestsPatternProblem(path) {
  if (typeof path !== 'string' || !manifestsFolderOf(path).includes('**')) return null;
  return 'uses `**` where ArchiCode does not read it: only a path that ends in `/**` is read recursively (`manifests/**`, or `./**` for the folder of .archicode.yaml), ' +
    'and `**` means nothing anywhere else. Write one path for each folder, or end the path with `/**`';
}

/** Why an entry of `settings.manifests.paths` is refused, in the words of the command line, or null: empty, absolute, `..`, or `**` where it is not read. */
function manifestsPathSentence(path) {
  const problem = plateauPathProblem(path);
  if (problem !== null) {
    return 'the path `' + path + '` of `settings.manifests.paths` ' + problem + ': a manifests folder must be below the folder of .archicode.yaml, written relative to it, without `..`. ' +
      'Move the folder below .archicode.yaml (or move .archicode.yaml up, to a folder that holds both) and change the path to match';
  }
  const pattern = manifestsPatternProblem(path);
  return pattern === null ? null : 'the path `' + path + '` of `settings.manifests.paths` ' + pattern;
}

/** Two paths compared by Unicode code point: the order of the manifests, which depends on neither the file system nor the locale (not `localeCompare`, not UTF-16 units). */
function compareCodePoints(a, b) {
  if (a === b) return 0;
  const x = Array.from(a);
  const y = Array.from(b);
  const n = Math.min(x.length, y.length);
  for (let i = 0; i < n; i++) {
    const d = x[i].codePointAt(0) - y[i].codePointAt(0);
    if (d !== 0) return d < 0 ? -1 : 1;
  }
  return x.length === y.length ? 0 : x.length < y.length ? -1 : 1;
}

/**
 * Whether a folder found below an entry that ends in `/**` is one of the generated views: the folder `views.path` names, or a sibling that begins with its
 * name and a dash (`views-to-be`, `views-to-be-vs-baseline`, `views-shop`). `folder` is its segments from the folder of .archicode.yaml.
 */
function isGeneratedViewsFolder(folder, viewsPath) {
  if (typeof viewsPath === 'number' || typeof viewsPath === 'boolean') viewsPath = String(viewsPath); // a scalar is read as the text it is, as the command line reads it
  if (typeof viewsPath !== 'string' || viewsPath.startsWith('/') || viewsPath.startsWith('\\')) return false;
  const views = viewsPath.split('/').filter((seg) => seg !== '' && seg !== '.');
  if (views.length === 0 || views.includes('..') || views.length !== folder.length) return false;
  for (let i = 0; i < views.length - 1; i++) if (views[i] !== folder[i]) return false;
  const name = views[views.length - 1];
  const found = folder[folder.length - 1];
  return found === name || found.startsWith(name + '-');
}

/** The files a comparison writes beside its views, always together (`ManifestDiscovery.COMPARISON_FILES`). */
const COMPARISON_FILES = ['gap.json', 'gap.md'];

/**
 * Whether a folder, given as the entries it lists (`[name, handle]`), is the folder of a comparison `views generate` wrote: it holds both files of the table of changes
 * (`ManifestDiscovery.holdsComparison`). Its `gap.json` is no manifest, and which `--output` the run was given is not known to the tool that reads the folder next; a lone
 * `gap.json` is read, since it may be an author's manifest.
 */
function holdsComparisonFiles(listed) {
  return COMPARISON_FILES.every((file) => listed.some(([name, handle]) => name === file && handle.kind === 'file'));
}

/** The entries of `settings.manifests.paths` the command line refuses before it reads any manifest (`ManifestDiscovery.pathProblems`), in its words, sorted as it sorts them. */
function manifestsPathProblems(settings) {
  const problems = [];
  for (const path of settings.manifests.paths.slice().sort()) {
    const sentence = manifestsPathSentence(path);
    if (sentence !== null) problems.push(sentence);
  }
  return problems;
}

/**
 * Why a facet name cannot be the name of a folder, or null when it can (wave 020, run 0146, issue #147): the name of a facet goes into the name of the folders the views are
 * written in, as it is written, so the command line refuses one that is not a folder name when it loads the workspace (`FacetNames.reasonOf`, the same words). Refused: an empty
 * name, `.`, `..`, a name that holds `/`, `\`, a NUL or another control character, and the names Windows refuses (`<>:"|?*` and a name that ends with a dot or a space). The first
 * reason found, reading from the left, is the one told.
 */
function facetNameReason(name) {
  if (name === '') return 'is empty';
  if (name === '.') return 'is `.`, the folder itself';
  if (name === '..') return 'is `..`, the folder above';
  for (let i = 0; i < name.length; i++) {
    const c = name.charAt(i);
    const code = name.charCodeAt(i);
    if (c === '/' || c === '\\') return 'holds `' + c + '`, which separates the folders of a path';
    if (code < 0x20 || (code >= 0x7f && code <= 0x9f)) return 'holds a control character (' + facetNameEscape(code) + ')';
    if ('<>:"|?*'.indexOf(c) >= 0) return 'holds `' + c + '`, which Windows does not allow in the name of a folder';
  }
  const last = name.charAt(name.length - 1);
  if (last === '.') return 'ends with a dot, which Windows does not allow in the name of a folder';
  if (last === ' ') return 'ends with a space, which Windows does not allow in the name of a folder';
  return null;
}

/** A control character as the sentence writes it, `\u0001`. */
function facetNameEscape(code) {
  return '\\u' + code.toString(16).toUpperCase().padStart(4, '0');
}

/** The sentence for a facet whose name cannot be the name of a folder (`FacetNames.problemOf`), or null. */
function facetNameProblem(name) {
  const reason = facetNameReason(name);
  if (reason === null) return null;
  const shown = Array.from(name).map((ch) => { const code = ch.charCodeAt(0); return ch.length === 1 && (code < 0x20 || (code >= 0x7f && code <= 0x9f)) ? facetNameEscape(code) : ch; }).join('');
  return 'the facet name `' + shown + '` cannot be the name of a folder: it ' + reason + ' (write a plain word, such as `journey`)';
}

/** The sentences for the facets of the settings that cannot be a folder, in the order of the file (`FacetNames.problems`). */
function facetNameProblems(settings) {
  const problems = [];
  for (const facet of settings.facets.customs) {
    const name = typeof facet.name === 'string' ? facet.name : facet.name === undefined || facet.name === null ? '' : String(facet.name);
    const sentence = facetNameProblem(name);
    if (sentence !== null) problems.push(sentence);
  }
  return problems;
}

/** What the page calls a plateau: its name, else its id. */
function plateauTitle(plateau) {
  return plateau.name.trim() !== '' ? plateau.name : plateau.id;
}

// The plateau drawn is remembered per folder, in this browser, like the sizes of the panels: not in the workspace (it is
// a choice of whoever looks, not a fact of the architecture), and the page works the same when the storage is refused.
const PLATEAU_STORAGE_PREFIX = 'archicode-standalone-editor:plateau:';

function plateauStorageKey() {
  const folder = AppState.folder;
  return folder ? PLATEAU_STORAGE_PREFIX + (folder.id || 'name:' + folder.name) : null;
}

// what was chosen in this page, for a browser that refuses its storage: the choice then lasts as long as the page
const chosenPlateaus = new Map();

function recalledPlateauId() {
  const key = plateauStorageKey();
  if (key === null) return null;
  return chosenPlateaus.has(key) ? chosenPlateaus.get(key) : panelSizeStorage.get(key);
}

function rememberPlateauId(id) {
  const key = plateauStorageKey();
  if (key === null) return;
  chosenPlateaus.set(key, id);
  panelSizeStorage.set(key, id);
}

// =====================================================================
// The comparison (run 0039, wave 014 run 0084): the plateau drawn can be compared with another one of the same workspace, on the band. The other one is another
// resolution of the manifests already read (`AppState.baseline`), kept apart from the plateau being edited, and never written. What the band chose is
// remembered per folder in this browser, with the plateau drawn and the two flags of whoever looks.
// =====================================================================

const COMPARE_STORAGE_PREFIX = 'archicode-standalone-editor:compare:';

// what was chosen in this page, for a browser that refuses its storage: the choice then lasts as long as the page
const chosenComparisons = new Map();

function compareStorageKey() {
  const folder = AppState.folder;
  return folder ? COMPARE_STORAGE_PREFIX + (folder.id || 'name:' + folder.name) : null;
}

/** The comparison remembered for this folder in this browser (see `layerCompareChoice`): '' (nothing compared), `past`, `future`, `future:<id>` or `other:<id>`; null when none was ever chosen. */
function recalledComparison() {
  const key = compareStorageKey();
  if (key === null) return null;
  return chosenComparisons.has(key) ? chosenComparisons.get(key) : panelSizeStorage.get(key);
}

function rememberComparison(choice) {
  const key = compareStorageKey();
  if (key === null) return;
  chosenComparisons.set(key, choice);
  panelSizeStorage.set(key, choice);
}

// Two more choices of whoever looks (run 0040), remembered per folder like the comparison: `changes-only` and `hide-wording`, '1' or '0'.
const FLAG_STORAGE_PREFIX = 'archicode-standalone-editor:flag:';
const chosenFlags = new Map(); // for a browser that refuses its storage: the choice then lasts as long as the page

function flagStorageKey(name) {
  const folder = AppState.folder;
  return folder ? FLAG_STORAGE_PREFIX + name + ':' + (folder.id || 'name:' + folder.name) : null;
}

/** A flag remembered for this folder in this browser; false when none was ever set. */
function recalledFlag(name) {
  const key = flagStorageKey(name);
  if (key === null) return false;
  return (chosenFlags.has(key) ? chosenFlags.get(key) : panelSizeStorage.get(key)) === '1';
}

function rememberFlag(name, value) {
  const key = flagStorageKey(name);
  if (key === null) return;
  chosenFlags.set(key, value ? '1' : '0');
  panelSizeStorage.set(key, value ? '1' : '0');
}

/** The plateau the one drawn is compared with (a plateau of the page), or null: nothing is compared, or the band still waits for the choice of the future. */
function compareTargetPlateau(layers) {
  return layerCompareOther(layers);
}

function parseSettings(rawSettings) {
  const raw = rawSettings && typeof rawSettings === 'object' ? rawSettings : {};
  const manifestsRaw = raw.manifests && typeof raw.manifests === 'object' ? raw.manifests : {};
  const relationshipsRaw = raw.relationships && typeof raw.relationships === 'object' ? raw.relationships : {};
  const viewsRaw = raw.views && typeof raw.views === 'object' ? raw.views : {};
  const facetsRaw = raw.facets && typeof raw.facets === 'object' ? raw.facets : {};

  const customsRaw = readKey(facetsRaw, 'customs', []);
  // the model of the page says `jsonPath` and `hideUnlinked`; the file says `json-path` and `hide-unlinked`.
  const customs = (Array.isArray(customsRaw) ? customsRaw : []).map((c) => {
    const custom = c && typeof c === 'object' ? c : {};
    const actions = (Array.isArray(custom.actions) ? custom.actions : []).map((a) => {
      const action = a && typeof a === 'object' ? a : {};
      const rest = Object.assign({}, action);
      delete rest['json-path'];
      return Object.assign(rest, { jsonPath: readKey(action, 'json-path', undefined) });
    });
    const rest = Object.assign({}, custom);
    delete rest['hide-unlinked'];
    return Object.assign(rest, { actions, hideUnlinked: readKey(custom, 'hide-unlinked', false) === true });
  });

  // `name` is optional; Jackson reads a number or a boolean into a String field, a blank name is no name
  const nameRaw = raw.name;
  const name = typeof nameRaw === 'string' ? nameRaw : (typeof nameRaw === 'number' || typeof nameRaw === 'boolean') ? String(nameRaw) : '';

  return {
    name: name.trim() === '' ? '' : name,
    manifests: {
      // a number or a boolean is read as the text it is, as the command line reads it
      // an item with no value is no item (`paths: [null]` is an empty list), as the command line reads it
      paths: Array.isArray(manifestsRaw.paths) ? manifestsRaw.paths.filter((p) => p !== null && p !== undefined).map((p) => (typeof p === 'number' || typeof p === 'boolean' ? String(p) : p)) : ['manifests']
    },
    current: plateauText(raw.current),
    relationships: {
      defaultSyntheticLabel: readKey(relationshipsRaw, 'default-synthetic-label', 'uses')
    },
    views: {
      path: readKey(viewsRaw, 'path', 'views'),
      labels: readKey(viewsRaw, 'labels', {}) || {},
      properties: readKey(viewsRaw, 'properties', {}) || {}
    },
    facets: {
      globalEnabled: readKey(facetsRaw, 'global-enabled', true),
      directoryNameTemplate: readKey(facetsRaw, 'directory-name-template', '%s-%s'),
      customs
    }
  };
}

